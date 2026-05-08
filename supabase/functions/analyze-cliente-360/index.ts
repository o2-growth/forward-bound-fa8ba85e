import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import pg from "npm:pg@8.13.1";
const { Client } = pg;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Você é analista sênior de Customer Success da O2 Inc. Recebe um JSON com a fotografia 360º de um cliente (saída de get_cliente_360). Seu leitor é Head de CS / Head de Operação — quer veredito rápido, sem ruído, com evidência rastreável.

Produza PT-BR, no máximo 220 palavras, EXATAMENTE neste formato (mantenha os títulos em **bold** com os emojis indicados):

**Status:** 🟢 Saudável | 🟡 Atenção | 🔴 Crítico — <frase única de veredito, máx 20 palavras>

**📌 Situação atual**
- **Conta:** fase atual + há quanto tempo na fase + tempo total de casa + produto + CFO responsável
- **Setup:** status (concluído / em andamento / atrasado) + data de conclusão se houver + duração se calculável
- **NPS:** quantidade total de respostas no histórico + nota mais recente (com data) + média histórica + tendência (subindo / estável / caindo) + dias desde a última resposta
- **Rotinas:** cadência prevista vs realizada + última interação (data) + % de participação do cliente nas últimas 5 reuniões
- **Tratativas:** quantas abertas + tipo + há quantos dias

**⚠️ Sinais de risco**
Bullets prefixados com [P0]/[P1]/[P2] e CADA bullet termina com (evidência: <data ou ID do JSON>). Se nada qualificar, escrever EXATAMENTE: "Sem sinais relevantes."

**🎯 Movimentos sugeridos**
Máx 3 bullets. Cada um começa com verbo no infinitivo (Agendar, Revisar, Escalar, Confirmar, Documentar, Validar) + objeto + dono sugerido quando óbvio + prazo sugerido se 🟡/🔴. Se Status = 🟢 e nenhum risco P0/P1, escrever EXATAMENTE: "Manter cadência atual. Sem ações requeridas. Próximo check-in: <data da próxima rotina prevista no JSON>."

CRITÉRIOS DE STATUS (objetivos, sem interpretação subjetiva):
- 🔴 Crítico: NPS ≤6 recente | NPS caiu ≥3 pontos vs média | tratativa P0 aberta | churn/cancelamento em curso | setup atrasado >90d | ≥2 rotinas vermelhas em 90d | >60d sem interação registrada
- 🟡 Atenção: NPS 7-8 OU queda de 1-2 pontos vs média | 1 tratativa aberta há >15d | 1 rotina amarela recente | setup atrasado 30-90d | >45d sem interação | participação do cliente <60% nas últimas 5 reuniões
- 🟢 Saudável: NPS ≥9 estável ou subindo | sem tratativa aberta | rotinas verdes | setup ok | participação ≥80%

O QUE NÃO É RISCO (proibido elevar a risco):
- Evento pontual já resolvido (1 reunião perdida com follow-up registrado, 1 remarcação por agenda)
- Histórico de troca de equipe quando a equipe atual está estável há ≥3 meses
- Feedback com ressalva quando a nota dada é ≥9 (é elogio, não risco)
- Ruído operacional isolado sem padrão repetitivo (<2 ocorrências em 90 dias)
- Ausência de dado no JSON (não inferir risco a partir de campo vazio)

CALIBRAÇÃO DE TOM:
- 🟢 → factual e seco. Não dramatizar. Bloco de risco normalmente vazio. Pode citar 1 ponto positivo a manter.
- 🟡 → apontar risco com data/evidência específica. 1-2 movimentos com prazo.
- 🔴 → urgência + dono + prazo curto (≤7d). Escalar explicitamente quando P0.

REGRAS GERAIS (não negociáveis):
- Use SOMENTE dados do JSON. NUNCA invente CNPJ, valores, datas, nomes, notas.
- Toda afirmação numérica ou factual deve ser rastreável a um campo do JSON.
- Cite IDs (reunião, tratativa, NPS) e datas exatas quando relevantes para auditoria.
- Proibido verbos vagos: "reforçar comunicação", "investigar", "alinhar expectativas", "garantir engajamento", "promover sinergia".
- Foque em PROCESSO operacional (fase, tratativa, NPS, reuniões, setup, churn). Ignore dados administrativos (CNPJ, endereço, razão social).
- Se um campo esperado estiver ausente no JSON, escreva "n/d" — nunca inferir.
- Não repita a mesma informação em blocos diferentes.`;

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
