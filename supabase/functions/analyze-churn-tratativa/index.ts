import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import pg from "npm:pg@8.13.1";
const { Client } = pg;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Você é analista sênior de Customer Success / Retenção da O2 Inc. Recebe um JSON com o post-mortem de um cliente que sofreu CHURN: card de Central de Projetos + histórico completo da tratativa (todas as fases percorridas em pipefy_moviment_tratativas) + últimas respostas de NPS quando disponíveis.

Seu leitor é Head de CS / Head de Operação. Ele quer entender, em <300 palavras: o que aconteceu, se dava para evitar, qual o impacto e o que mudar para o próximo cliente NÃO cair pelo mesmo motivo. PT-BR. Mantenha EXATAMENTE este formato (títulos em **bold** com os emojis indicados):

**Status:** 🟢 Evitável | 🟡 Parcialmente evitável | 🔴 Inevitável — <frase única de veredito, máx 22 palavras>

**📌 O que aconteceu**
Linha do tempo curta da tratativa, no formato bullet:
- <Data entrada> → entrou em "<Fase>" (ficou <X> dias). <Observação curta apenas se houver responsável/motivo registrado>.
Listar SOMENTE as fases efetivamente percorridas, em ordem cronológica. Citar a data da fase atual / saída como evidência.

**🎯 Causa raiz**
- **Motivo declarado:** <campo "Motivo Principal do Churn" ou "Motivo Churn" da tratativa, se houver>.
- **Motivos detalhados:** <campo "Motivos cancelamento", "Motivo da perda" ou "Problemas com a Oxy", se preenchido>.
- **Comentários do CFO/CS na tratativa:** cite TRECHOS LITERAIS (entre aspas, máx 25 palavras cada) dos campos textuais quando preenchidos: "Descricao da Situacao", "Detalhes da Tratativa", "Plano de Acao definido", "Feedback Final", "Observacoes finalizacao", "Negociacao paralela rescisao". Mostre que leu o que o time escreveu — não parafraseie. Se um cliente teve "Plano de Acao definido" mas churnou mesmo assim, cite o plano e aponte que ele falhou.
- **Sinais nos dados:** 1-3 bullets factuais conectando os campos do JSON (ex.: NPS caindo de 9→6 em 90d, satisfação na tratativa = "Insatisfeito", >X dias parado em "Plano de Ação", problema operacional explícito). Cada sinal deve citar evidência (campo + valor + data).

**💸 Impacto**
- MRR perdido: <valor>; Setup: <valor>; LT realizado: <X meses> (entre <data assinatura> e <data encerramento>).
- Satisfação final na tratativa: <valor do campo "Satisfacao do Cliente">, se houver.
- Tempo total da tratativa: <X dias> (da primeira entrada até a fase final).

**🛡️ Lições para retenção**
- 1 a 3 bullets, no formato: \`<Verbo no infinitivo> <ação preventiva concreta> — dono: <CS|CFO|Operação|Head CS|Produto>; quando aplicar: <gatilho mensurável que indica risco semelhante>\`.
- Verbos permitidos: Acionar, Escalar, Revisar, Documentar, Validar, Reunir, Renegociar, Antecipar, Monitorar, Encerrar.
- O gatilho precisa ser observável em outros clientes (ex.: "NPS ≤7 por 2 ciclos", ">15d em Plano de Ação", "Satisfação 'Insatisfeito' em qualquer tratativa", "Atraso recorrente Oxy em 2 meses").

CRITÉRIOS DE STATUS (objetivos):
- 🟢 Evitável: causa raiz operacional/relacional sob controle da O2 (atendimento, atrasos Oxy, falta de cadência, NPS caindo sem ação registrada). Tinha sinal antecipado nos dados.
- 🟡 Parcialmente evitável: causa mista — fator externo (mudança de gestão, troca de ERP, redução de operação no cliente) + sinal de oportunidade que poderia ter sido trabalhado.
- 🔴 Inevitável: fator 100% externo sem sinal acionável (encerramento da empresa, fusão/aquisição, mudança estratégica do cliente totalmente externa, decisão tomada antes de qualquer interação).

REGRAS GERAIS (não negociáveis):
- Use SOMENTE dados do JSON. NUNCA invente datas, nomes, valores, motivos.
- Toda afirmação numérica/factual deve ser rastreável a um campo do JSON. Cite o campo como evidência quando útil.
- Se um campo está vazio, escreva "n/d" no item específico, não invente.
- Proibido verbos vagos: "reforçar comunicação", "alinhar expectativas", "promover engajamento".
- Foque em PROCESSO (tratativa, NPS, fases, datas). Ignore dados administrativos (CNPJ, endereço, razão social).
- Não repita a mesma informação em blocos diferentes.

REGRAS DE CÁLCULO (anti-alucinação):
- "LT realizado" e "tempo total da tratativa" só podem ser calculados a partir de datas presentes no JSON. Se faltar data, escrever "n/d".
- Diferença entre datas em meses = floor(dias/30); em dias = diferença real. Nunca arredondar pra cima de forma agressiva.
- "MRR perdido" = campo MRR do card de churn (Valor CFOaaS + Valor OXY já vem somado pelo backend); não recalcular.

REGRAS DE FORMATAÇÃO:
- Cada bullet começa com "- ".
- Bold APENAS nos títulos das seções e em rótulos curtos dentro de bullets ("**Motivo declarado:**").
- Sem bloco de código, sem tabelas markdown.`;

interface TratativaRow {
  ID: string | number;
  "Título": string | null;
  "Fase": string | null;
  "Fase Atual": string | null;
  "Entrada": string | null;
  "Saída": string | null;
  "Duração (s)": number | null;
  "CFO Responsavel": string | null;
  "Motivo": string | null;
  "Decisao Final": string | null;
  "Motivo Churn": string | null;
  "Satisfacao do Cliente": string | null;
  "Responsavel pela Tratativa": string | null;
  "Destino": string | null;
  "Descricao da Situacao": string | null;
  "Problemas com a Oxy cliente": string | null;
  "Problemas com a Oxy": string | null;
  "Detalhes da Tratativa": string | null;
  "Plano de Acao definido": string | null;
  "Solucao Implementada com Sucesso": string | null;
  "Negociacao paralela rescisao": string | null;
  "Feedback Final": string | null;
  "Observacoes finalizacao": string | null;
  "Motivo da perda": string | null;
  "Termo de Rescisao Enviado": string | null;
  "Data de Solicitacao": string | null;
  "Data de Inicio da Tratativa": string | null;
  "Data prevista finalizacao tratativa": string | null;
  "Data finalizacao plano de acao": string | null;
  "Finalizacao contrato ultimo dia": string | null;
}

function compactObj<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) continue;
    if (typeof v === "string" && v.trim() === "") continue;
    out[k] = v;
  }
  return out as Partial<T>;
}

function lastNonEmpty(rows: TratativaRow[], field: keyof TratativaRow): string | null {
  for (let i = rows.length - 1; i >= 0; i--) {
    const v = rows[i]?.[field];
    if (typeof v === "string" && v.trim() !== "") return v;
  }
  return null;
}

interface ProjectRow {
  ID: string | number;
  "Título": string | null;
  "Fase Atual": string | null;
  "CFO Responsavel": string | null;
  "Valor CFOaaS": string | null;
  "Valor OXY": string | null;
  "Valor Setup": string | null;
  "Valor Diagnostico": string | null;
  "Produtos": string | null;
  "Mes do Churn": string | null;
  "Motivo Principal do Churn": string | null;
  "Motivos cancelamento": string | null;
  "Data de assinatura do contrato": string | null;
  "Data encerramento": string | null;
  "LT (meses)": string | null;
  "Problemas com a Oxy": string | null;
}

interface NpsRow {
  ID: string | number;
  "Título": string | null;
  "Entrada": string | null;
  "Fase Atual": string | null;
  "Nota NPS": string | number | null;
  "Motivo da Nota": string | null;
  "Sentimento Oxy": string | null;
  "CFO Responsavel": string | null;
}

function normalize(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function diffDays(from: string | null, to: string | null): number | null {
  if (!from) return null;
  const a = new Date(from);
  const b = to ? new Date(to) : new Date();
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return null;
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let pgClient: any = null;
  try {
    const body = await req.json();
    const { clienteId, titulo } = body as { clienteId?: string; titulo?: string };

    if (!clienteId && !titulo) {
      return new Response(JSON.stringify({ error: "clienteId ou titulo é obrigatório" }), {
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

    pgClient = new Client({
      host: Deno.env.get("EXTERNAL_PG_HOST"),
      port: parseInt(Deno.env.get("EXTERNAL_PG_PORT") || "5432"),
      database: Deno.env.get("EXTERNAL_PG_DATABASE"),
      user: Deno.env.get("EXTERNAL_PG_USER"),
      password: Deno.env.get("EXTERNAL_PG_PASSWORD"),
    });
    await pgClient.connect();

    // 1) Fetch the project (churn) card
    let projeto: ProjectRow | null = null;
    if (clienteId) {
      const r = await pgClient.query(
        'SELECT * FROM pipefy_central_projetos WHERE "ID" = $1::bigint LIMIT 1',
        [String(clienteId)],
      );
      projeto = r.rows[0] ?? null;
    }
    if (!projeto && titulo) {
      const r = await pgClient.query(
        'SELECT * FROM pipefy_central_projetos WHERE "Título" = $1 ORDER BY "Entrada" DESC LIMIT 1',
        [titulo],
      );
      projeto = r.rows[0] ?? null;
    }

    const resolvedTitulo = projeto?.["Título"] ?? titulo ?? null;
    const tituloNorm = normalize(resolvedTitulo);

    // 2) Fetch full tratativa history by normalized title
    let tratativaRows: TratativaRow[] = [];
    if (tituloNorm) {
      // Use case-insensitive accent-stripped match via SQL: lower(unaccent(...)) is not always available;
      // fallback to ILIKE on trimmed title — Pipefy títulos are stable per company.
      const r = await pgClient.query(
        `SELECT * FROM pipefy_moviment_tratativas
         WHERE LOWER(TRIM("Título")) = $1
         ORDER BY "Entrada" ASC`,
        [normalize(resolvedTitulo)],
      );
      tratativaRows = r.rows as TratativaRow[];

      // Fallback: if exact match returns 0, try ILIKE
      if (tratativaRows.length === 0 && resolvedTitulo) {
        const r2 = await pgClient.query(
          `SELECT * FROM pipefy_moviment_tratativas
           WHERE "Título" ILIKE $1
           ORDER BY "Entrada" ASC`,
          [`%${resolvedTitulo.trim()}%`],
        );
        tratativaRows = r2.rows as TratativaRow[];
      }
    }

    // 3) Fetch last NPS responses for the same client (best-effort, never derruba o post-mortem)
    let npsRows: NpsRow[] = [];
    if (resolvedTitulo) {
      try {
        const r = await pgClient.query(
          `SELECT "ID", "Título", "Entrada", "Fase Atual", "Nota NPS", "Motivo da Nota", "Sentimento Oxy", "CFO Responsavel"
           FROM pipefy_moviment_nps
           WHERE "Título" ILIKE $1
           ORDER BY "Entrada" DESC
           LIMIT 8`,
          [`%${resolvedTitulo.trim()}%`],
        );
        npsRows = r.rows as NpsRow[];
      } catch (npsErr) {
        console.error("NPS fetch failed (continuando sem NPS):", npsErr);
      }
    }

    await pgClient.end();
    pgClient = null;

    if (!projeto && tratativaRows.length === 0) {
      return new Response(JSON.stringify({ error: "Cliente não encontrado em Central de Projetos nem em Tratativas" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4) Build consolidated JSON for the model
    const mrrCfo = parseFloat(projeto?.["Valor CFOaaS"] ?? "0") || 0;
    const mrrOxy = parseFloat(projeto?.["Valor OXY"] ?? "0") || 0;
    const setup = parseFloat(projeto?.["Valor Setup"] ?? "0") || 0;
    const diagnostico = parseFloat(projeto?.["Valor Diagnostico"] ?? "0") || 0;

    const dossie = {
      cliente: resolvedTitulo,
      central_projetos: projeto ? {
        id: String(projeto.ID),
        fase_atual: projeto["Fase Atual"],
        cfo_responsavel: projeto["CFO Responsavel"],
        produtos: projeto["Produtos"],
        mes_do_churn: projeto["Mes do Churn"],
        motivo_principal_do_churn: projeto["Motivo Principal do Churn"],
        motivos_cancelamento: projeto["Motivos cancelamento"],
        problemas_com_a_oxy: projeto["Problemas com a Oxy"],
        data_assinatura_contrato: projeto["Data de assinatura do contrato"],
        data_encerramento: projeto["Data encerramento"],
        lt_meses: projeto["LT (meses)"],
        valores: {
          mrr_total: mrrCfo + mrrOxy,
          valor_cfoaas: mrrCfo,
          valor_oxy: mrrOxy,
          valor_setup: setup,
          valor_diagnostico: diagnostico,
        },
      } : null,
      tratativa_historico: tratativaRows.map(t => compactObj({
        id: String(t.ID),
        fase: t["Fase"],
        fase_atual: t["Fase Atual"],
        destino: t["Destino"],
        entrada: t["Entrada"],
        saida: t["Saída"],
        dias_na_fase: diffDays(t["Entrada"], t["Saída"]),
        cfo_responsavel: t["CFO Responsavel"],
        responsavel_tratativa: t["Responsavel pela Tratativa"],
        motivo: t["Motivo"],
        motivo_da_perda: t["Motivo da perda"],
        decisao_final: t["Decisao Final"],
        motivo_churn: t["Motivo Churn"],
        satisfacao_cliente: t["Satisfacao do Cliente"],
        // Campos de texto livre (comentários/observações da tratativa)
        descricao_situacao: t["Descricao da Situacao"],
        detalhes_tratativa: t["Detalhes da Tratativa"],
        plano_de_acao: t["Plano de Acao definido"],
        solucao_implementada: t["Solucao Implementada com Sucesso"],
        feedback_final: t["Feedback Final"],
        observacoes_finalizacao: t["Observacoes finalizacao"],
        negociacao_paralela_rescisao: t["Negociacao paralela rescisao"],
        problemas_com_oxy_cliente: t["Problemas com a Oxy cliente"],
        problemas_com_oxy: t["Problemas com a Oxy"],
        termo_rescisao_enviado: t["Termo de Rescisao Enviado"],
        data_solicitacao: t["Data de Solicitacao"],
        data_inicio_tratativa: t["Data de Inicio da Tratativa"],
        data_prevista_finalizacao: t["Data prevista finalizacao tratativa"],
        data_finalizacao_plano_acao: t["Data finalizacao plano de acao"],
        data_finalizacao_contrato: t["Finalizacao contrato ultimo dia"],
      })),
      tratativa_resumo: tratativaRows.length > 0 ? {
        total_fases_percorridas: tratativaRows.length,
        primeira_entrada: tratativaRows[0]?.["Entrada"] ?? null,
        ultima_movimentacao: tratativaRows[tratativaRows.length - 1]?.["Saída"] ?? tratativaRows[tratativaRows.length - 1]?.["Entrada"] ?? null,
        fase_final: tratativaRows[tratativaRows.length - 1]?.["Fase"] ?? null,
        decisao_final: tratativaRows.find(t => t["Decisao Final"])?.["Decisao Final"] ?? null,
        motivo_churn_final: tratativaRows.find(t => t["Motivo Churn"])?.["Motivo Churn"] ?? null,
        satisfacao_final: tratativaRows.find(t => t["Satisfacao do Cliente"])?.["Satisfacao do Cliente"] ?? null,
        // Comentários consolidados — última entrada não-vazia de cada campo qualitativo
        ultimo_feedback_final: lastNonEmpty(tratativaRows, "Feedback Final"),
        ultimo_plano_de_acao: lastNonEmpty(tratativaRows, "Plano de Acao definido"),
        ultima_descricao_situacao: lastNonEmpty(tratativaRows, "Descricao da Situacao"),
        ultimas_observacoes_finalizacao: lastNonEmpty(tratativaRows, "Observacoes finalizacao"),
        ultimos_detalhes_tratativa: lastNonEmpty(tratativaRows, "Detalhes da Tratativa"),
        ultimos_problemas_com_oxy: lastNonEmpty(tratativaRows, "Problemas com a Oxy"),
      } : null,
      nps_recente: npsRows.map(n => ({
        id: String(n.ID),
        data: n["Entrada"],
        fase: n["Fase Atual"],
        nota: n["Nota NPS"],
        motivo_nota: n["Motivo da Nota"],
        sentimento_oxy: n["Sentimento Oxy"],
        cfo_responsavel: n["CFO Responsavel"],
      })),
    };

    // 5) Call Gemini
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY não configurada" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userMessage = `JSON do post-mortem de churn:\n\`\`\`json\n${JSON.stringify(dossie, null, 2)}\n\`\`\`\n\nProduza o post-mortem seguindo as regras.`;
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

    if (!analysis) {
      return new Response(JSON.stringify({ error: "Gemini não retornou texto para a análise" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ clienteId, titulo: resolvedTitulo, analysis, dossie }, (_, v) => typeof v === "bigint" ? v.toString() : v),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    if (pgClient) { try { await pgClient.end(); } catch (_e) { /* ignore */ } }
    console.error("Error in analyze-churn-tratativa:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
