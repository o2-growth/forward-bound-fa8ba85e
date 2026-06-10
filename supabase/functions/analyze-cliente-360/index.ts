import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import pg from "npm:pg@8.13.1";
import {
  buildSlackPgClient,
  extractClientSlugCandidates,
  fetchRecentMessages,
  findChannelByCandidates,
  findChannelById,
} from "../_shared/slack.ts";
const { Client } = pg;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Você é analista sênior de Customer Success da O2 Inc. Recebe um JSON com a fotografia 360º de um cliente (saída de get_cliente_360). Seu leitor é Head de CS / Head de Operação — quer veredito rápido, sem ruído, com evidência rastreável.

Produza PT-BR, no máximo 220 palavras, EXATAMENTE neste formato (mantenha os títulos em **bold** com os emojis indicados):

**Status:** 🟢 Saudável | 🟡 Atenção | 🔴 Crítico — <frase única de veredito, máx 20 palavras>

**📌 Situação atual**
- **Conta:** fase atual + há quanto tempo na fase + tempo total de casa + produto + CFO responsável + MRR ativo (se houver) + valor de Setup (se houver)
- **Setup:** status (concluído / em andamento / atrasado) + data de conclusão se houver + duração se calculável
- **NPS:** quantidade total de respostas no histórico + nota mais recente (com data) + média histórica + tendência (subindo / estável / caindo) + dias desde a última resposta
- **Rotinas:** cadência prevista vs realizada + última interação (data) + % de participação do cliente nas últimas 5 reuniões
- **Tratativas:** quantas abertas + tipo + há quantos dias

**⚠️ Sinais de risco**
Bullets no formato OBRIGATÓRIO: \`[P0|P1|P2] <sinal observado> → pode causar <impacto provável no negócio/operação>. (evidência: <data ou ID do JSON>)\`
- O impacto deve ser concreto (ex.: risco de churn, atraso de onboarding, perda de receita recorrente, escalonamento operacional, insatisfação recorrente, quebra de SLA, retrabalho, exposição reputacional). Proibido omitir o "→ pode causar ...".
- Se nada qualificar, escrever EXATAMENTE: "Sem sinais relevantes."

**🎯 Movimentos sugeridos**
- REGRA DURA: se houver QUALQUER risco listado em "Sinais de risco" (P0, P1 ou P2), este bloco NUNCA pode ficar vazio. Cada risco listado precisa de pelo menos uma ação correspondente.
- Máx 3 bullets, no formato: \`<Verbo no infinitivo> <ação concreta> — dono: <CS|CFO|Operação|Head CS|Comercial>; prazo: <24h|3d|7d|15d>; trata risco <P0|P1|P2>\`.
- Verbos permitidos: Agendar, Revisar, Escalar, Confirmar, Documentar, Validar, Reunir, Acionar, Renegociar, Encerrar.
- Priorização de prazos: P0 → escalonamento ≤24h; P1 → ação em 3 a 7 dias; P2 → ação preventiva ou monitoramento explícito em até 15 dias.
- Se Status = 🟢 e NENHUM risco (nem P2) foi listado, escrever EXATAMENTE: "Manter cadência atual. Sem ações requeridas." (acrescentar " Próximo check-in: <data>" SOMENTE se houver data de próxima rotina no JSON; caso contrário, omitir).

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
- Não repita a mesma informação em blocos diferentes.

REGRAS DE CÁLCULO DE DATAS / DURAÇÕES (anti-alucinação):
- "Tempo de casa" e "tempo na fase" devem ser calculados SOMENTE a partir de campos de data presentes no JSON (criação do card, entrada em fase, data de assinatura). Sempre cite a data-base usada como evidência ao final do item.
- Se não houver data-base confiável no JSON, escreva "n/d" — proibido estimar "anos" ou "meses" sem o campo correspondente.
- Conferir a aritmética: diferença entre duas datas deve bater com o número de dias/meses citado. Nunca arredondar para cima de forma agressiva (4 meses ≠ 1 ano).

REGRAS DE FORMATAÇÃO DE CAMPOS VAZIOS:
- Se TODOS os subcampos de um item da Situação Atual estiverem ausentes, escrever apenas: "**Setup:** n/d (sem dados no JSON)" — uma única vez, sem concatenar múltiplos "n/d + n/d + n/d".
- NPS sem nenhuma resposta registrada: escrever apenas "**NPS:** sem respostas registradas" e omitir média / tendência / dias.
- Em qualquer item, omitir subcampos individualmente vazios em vez de listar "n/d" repetidamente. Só usar "n/d" quando o item inteiro não tem dados.

REGRAS DE VALIDAÇÃO MATEMÁTICA:
- Percentual de participação = (realizadas / previstas) × 100, calculado sobre os mesmos números citados no bullet. Proibido apresentar percentual que contradiga os números mostrados.
- Se previstas = realizadas, escrever "100%" — sem exceções.
- Se previstas = 0, escrever "sem reuniões previstas no período" e não apresentar percentual.
- Revise mentalmente a aritmética antes de imprimir cada percentual ou duração.`;

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

    // 1b. Anexa contexto Slack. Prioriza override manual (cliente_slack_channels);
    // se não houver override, cai para heurística baseada no nome do cliente.
    let slackPg: any = null;
    try {
      const { data: overrideRow } = await supabase
        .from("cliente_slack_channels")
        .select("channel_id, channel_name")
        .eq("cliente_id", String(clienteId))
        .maybeSingle();

      slackPg = buildSlackPgClient();
      await slackPg.connect();

      let channel: any = null;
      let source: "override" | "heuristic" = "heuristic";
      let candidates: string[] = [];

      if (overrideRow?.channel_id) {
        channel = await findChannelById(slackPg, overrideRow.channel_id);
        source = "override";
        if (!channel) {
          // Override aponta para canal que sumiu — usa nome salvo como fallback informativo.
          channel = { id: overrideRow.channel_id, name: overrideRow.channel_name, member_count: null };
        }
      } else {
        candidates = extractClientSlugCandidates(cliente360);
        if (candidates.length) {
          channel = await findChannelByCandidates(slackPg, candidates);
        }
      }

      if (channel) {
        const messages = await fetchRecentMessages(slackPg, channel.id, {
          days: 60,
          rootLimit: 30,
          maxRows: 200,
        });
        (cliente360 as any).slack = {
          source,
          channel: {
            id: channel.id,
            name: channel.name,
            member_count: channel.member_count ?? null,
          },
          window: { days: 60, messages_count: messages.length },
          messages,
        };
      } else if (candidates.length) {
        (cliente360 as any).slack = { source, channel: null, reason: "no_channel_match", candidates };
      } else {
        (cliente360 as any).slack = { source, channel: null, reason: "no_client_name_in_dossier" };
      }
    } catch (slackErr) {
      console.error("[analyze-cliente-360] slack context error:", slackErr);
      (cliente360 as any).slack = { source: "heuristic", channel: null, reason: "slack_query_failed" };
    } finally {
      if (slackPg) { try { await slackPg.end(); } catch (_e) {} }
    }

    // 2. Call Lovable AI Gateway (OpenAI-compatible)
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userMessage = `JSON do cliente:\n\`\`\`json\n${JSON.stringify(cliente360, null, 2)}\n\`\`\`\n\nProduza o diagnóstico seguindo as regras.`;
    const gatewayResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": lovableKey },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        temperature: 0.2,
        max_tokens: 2048,
      }),
    });

    if (!gatewayResp.ok) {
      const errText = await gatewayResp.text();
      console.error("Lovable AI Gateway error:", gatewayResp.status, errText);
      const status = gatewayResp.status === 429 ? 429 : gatewayResp.status === 402 ? 402 : 502;
      const msg = status === 429
        ? "Limite de requisições atingido. Tente em instantes."
        : status === 402
          ? "Créditos da workspace esgotados. Adicione em Settings → Workspace → Usage."
          : `IA falhou: ${errText.slice(0, 500)}`;
      return new Response(JSON.stringify({ error: msg }), {
        status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const gatewayData = await gatewayResp.json();
    const choice = gatewayData?.choices?.[0];
    const analysis = (choice?.message?.content ?? "").toString().trim();

    if (choice?.finish_reason && choice.finish_reason !== "stop") {
      console.warn("Gateway finish_reason:", choice.finish_reason);
    }

    if (!analysis) {
      return new Response(JSON.stringify({ error: "IA não retornou texto para a análise" }), {
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
