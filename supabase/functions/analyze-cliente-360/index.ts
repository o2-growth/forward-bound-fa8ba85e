import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import pg from "npm:pg@8.13.1";
const { Client } = pg;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Você é analista sênior de Customer Success da O2 Inc. Recebe um JSON com a fotografia 360º de um cliente (saída de get_cliente_360). Seu leitor é Head de CS / Head de Operação — quer veredito rápido, sem ruído.

Produza PT-BR, no máximo 200 palavras, EXATAMENTE neste formato:

**Status:** 🟢 Saudável | 🟡 Atenção | 🔴 Crítico — <frase única de veredito, máx 20 palavras>

**Situação atual**
- Fase + tempo na fase + produto + CFO responsável
- Setup: status (+ data de conclusão se houver)
- NPS: nota mais recente + tendência se houver histórico
- Rotinas: cadência + última interação
- Tratativas em aberto: quantidade

**Sinais de risco**
Bullets prefixados com [P0]/[P1]/[P2]. Se nada qualificar, escrever EXATAMENTE: "Sem sinais relevantes."

**Movimentos sugeridos**
Máx 3 bullets. Cada um começa com verbo no infinitivo (Agendar, Revisar, Escalar, Confirmar, Documentar). Inclua dono sugerido quando óbvio. Se Status = 🟢 e nenhum risco P0/P1, escrever EXATAMENTE: "Manter cadência atual. Sem ações requeridas."

CRITÉRIOS DE STATUS (objetivos, sem interpretação):
- 🔴 Crítico: NPS ≤6 recente | tratativa P0 aberta | churn em curso | setup atrasado >90d | rotinas vermelhas reiteradas (≥2 em 90d)
- 🟡 Atenção: NPS 7-8 com queda vs anterior | 1 tratativa aberta | rotina amarela | setup atrasado 30-90d | >45d sem interação
- 🟢 Saudável: NPS ≥9 | sem tratativa aberta | rotinas verdes | setup ok

O QUE NÃO É RISCO (proibido tratar como risco):
- Eventos pontuais já resolvidos (1 reunião perdida com follow-up registrado, 1 remarcação por agenda)
- Histórico de mudanças de equipe quando a equipe atual está estável
- Feedback positivo com ressalva quando a nota é ≥9
- Qualquer ruído operacional sem padrão repetitivo (≥2 ocorrências em 90 dias)

CALIBRAÇÃO DE TOM:
- 🟢 → factual e seco. NÃO dramatizar. Bloco de risco normalmente vazio.
- 🟡 → apontar risco com data/evidência. 1-2 movimentos.
- 🔴 → urgência + dono + prazo sugerido.

REGRAS GERAIS:
- Use SOMENTE dados do JSON. Nunca invente CNPJ, valores, datas, nomes.
- Cite IDs/datas/nomes do JSON em cada afirmação relevante.
- Proibido verbos vagos: "reforçar comunicação", "investigar", "alinhar expectativas", "garantir engajamento".
- Foque em PROCESSO (fase, tratativa, NPS, reuniões, setup, churn). Ignore dados administrativos.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let pgClient: any = null;
  try {
    const body = await req.json();
    const { clienteId } = body;
    if (!clienteId) {
      return new Response(JSON.stringify({ error: "clienteId is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization header required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Fetch get_cliente_360 from external DB
    pgClient = new Client({
      host: Deno.env.get("EXTERNAL_PG_HOST"),
      port: parseInt(Deno.env.get("EXTERNAL_PG_PORT") || "5432"),
      database: Deno.env.get("EXTERNAL_PG_DATABASE"),
      user: Deno.env.get("EXTERNAL_PG_USER"),
      password: Deno.env.get("EXTERNAL_PG_PASSWORD"),
    });
    await pgClient.connect();

    // Resolve clienteId: frontend may send either a pipefy_db_clientes ID or a pipefy_central_projetos ID.
    // get_cliente_360 expects the db_clientes ID.
    let resolvedId: string = String(clienteId);
    let resolutionRoute = "direct";

    const directCheck = await pgClient.query(
      'SELECT 1 FROM pipefy_db_clientes WHERE "ID" = $1::bigint LIMIT 1',
      [resolvedId],
    );
    if (directCheck.rowCount === 0) {
      const projetoLookup = await pgClient.query(
        'SELECT infos_do_cliente_database FROM pipefy_central_projetos WHERE "ID" = $1::bigint AND infos_do_cliente_database IS NOT NULL LIMIT 1',
        [resolvedId],
      );
      if (projetoLookup.rowCount && projetoLookup.rows[0].infos_do_cliente_database) {
        resolvedId = String(projetoLookup.rows[0].infos_do_cliente_database);
        resolutionRoute = "via_central_projetos";
      } else {
        const connLookup = await pgClient.query(
          "SELECT connected_card_id FROM pipefy_card_connections WHERE card_id::text = $1 AND LOWER(connected_pipe_name) LIKE '%clientes%' LIMIT 1",
          [resolvedId],
        );
        if (connLookup.rowCount && connLookup.rows[0].connected_card_id) {
          resolvedId = String(connLookup.rows[0].connected_card_id);
          resolutionRoute = "via_card_connections";
        } else {
          await pgClient.end();
          pgClient = null;
          return new Response(
            JSON.stringify({ error: "Cliente não vinculado a um registro em DB Clientes" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }
    }

    console.log(`[analyze-cliente-360] input=${clienteId} resolved=${resolvedId} route=${resolutionRoute}`);

    const rpcResult = await pgClient.query("SELECT get_cliente_360($1::bigint) AS result", [resolvedId]);
    await pgClient.end();
    pgClient = null;

    const cliente360 = rpcResult.rows[0]?.result ?? null;
    if (!cliente360) {
      return new Response(JSON.stringify({ error: "Cliente não encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Call Gemini
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY não configurada" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userMessage = `JSON do cliente:\n\`\`\`json\n${JSON.stringify(cliente360, null, 2)}\n\`\`\`\n\nProduza o diagnóstico seguindo as regras.`;
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
    const geminiResp = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: userMessage }] }],
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    });

    if (!geminiResp.ok) {
      const errText = await geminiResp.text();
      console.error("Gemini error:", errText);
      return new Response(JSON.stringify({ error: `Gemini falhou: ${errText.slice(0, 500)}` }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const geminiData = await geminiResp.json();
    const candidate = geminiData?.candidates?.[0];
    const analysis = candidate?.content?.parts
      ?.map((part: { text?: string }) => part.text ?? "")
      .join("\n")
      .trim() ?? "";

    if (candidate?.finishReason && candidate.finishReason !== "STOP") {
      console.warn("Gemini finishReason:", candidate.finishReason, geminiData?.promptFeedback ?? null);
    }

    if (!analysis) {
      return new Response(JSON.stringify({ error: "Gemini não retornou texto para a análise" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ clienteId, analysis, cliente360 }, (_, v) => typeof v === "bigint" ? v.toString() : v),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    if (pgClient) { try { await pgClient.end(); } catch (_e) {} }
    console.error("Error in analyze-cliente-360:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
