// Verify Modelo Atual Jun/2026 counts vs accelerometer logic.
// Applies the SAME filters as useModeloAtualAnalytics:
//   - MQL: creation date in period + faixa ∈ qualifying tiers + not test + not excluded-by-loss
//   - RM/RR/Proposta: card visited the phase during period + not test + not excluded-by-loss
//     (dedup: 1 count per card per phase per month; RM extra dedup by title|month)
//   - Venda: card entered "Ganho" or "Contrato assinado" (or has Data de assinatura in period);
//     dedup id|month preferring Ganho over Contrato assinado
// Paginated to avoid CPU limits. Client re-invokes with returned cursor+state.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const PIPE_ID = "304018800";
const PIPEFY_URL = "https://api.pipefy.com/graphql";

const MQL_FATURAMENTO = new Set([
  "Entre R$ 200 mil e R$ 350 mil",
  "Entre R$ 350 mil e R$ 500 mil",
  "Entre R$ 500 mil e R$ 1 milhão",
  "Entre R$ 1 milhão e R$ 5 milhões",
  "Acima de R$ 5 milhões",
]);

const TEST_CARD_IDS = new Set([
  "1320546949", "1320177174", "1308003007", "1320175421", "1342531906",
]);

function norm(s: string) {
  return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, " ");
}
const EXCLUDED_LOSS = new Set([
  "Duplicado",
  "Pessoa física, fora do ICP",
  "Não é uma demanda real",
  "Buscando parceria",
  "Quer soluções para cliente",
  "Não é MQL, mas entrou como MQL",
  "Email/Telefone Inválido",
].map(norm));

const PHASE_BUCKET: Record<string, "rm" | "rr" | "proposta" | "ganho" | "contrato"> = {
  [norm("Reunião agendada / Qualificado")]: "rm",
  [norm("Reunião Realizada")]: "rr",
  [norm("1° Reunião Realizada - Apresentação")]: "rr",
  [norm("Proposta enviada / Follow Up")]: "proposta",
  [norm("Ganho")]: "ganho",
  [norm("Contrato assinado")]: "contrato",
};

const MONTH_START = "2026-06-01";
const MONTH_END = "2026-06-30";
function inJun(iso: string | null | undefined) {
  if (!iso) return false;
  const d = String(iso).slice(0, 10);
  return d >= MONTH_START && d <= MONTH_END;
}
function monthKey(iso: string) { return String(iso).slice(0, 7); }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const apiKey = (Deno.env.get("PIPEFY_API_KEY") || "").trim().replace(/^Bearer\s+/i, "");
  if (!apiKey) return new Response(JSON.stringify({ error: "PIPEFY_API_KEY missing" }), { status: 500, headers: corsHeaders });

  const body = await req.json().catch(() => ({}));
  let cursor: string | null = body.cursor ?? null;
  const state = body.state ?? {
    counts: { mql: 0, rm: 0, rr: 0, proposta: 0, venda: 0 },
    // per-bucket set of dedup keys already counted
    seen: { mql: [], rm: [], rr: [], proposta: [], venda: [] },
    // RM extra dedup key set (title|month)
    rmTitles: [],
    totalCards: 0, pages: 0,
  };
  const seenSets: Record<string, Set<string>> = {
    mql: new Set(state.seen.mql),
    rm: new Set(state.seen.rm),
    rr: new Set(state.seen.rr),
    proposta: new Set(state.seen.proposta),
    venda: new Set(state.seen.venda),
  };
  const rmTitleSet = new Set<string>(state.rmTitles);

  const startedAt = Date.now();
  const MAX_PAGES_PER_CALL = Number(body.maxPages || 20);
  let pagesThisCall = 0;
  let hasNext = true;

  try {
    while (hasNext && pagesThisCall < MAX_PAGES_PER_CALL) {
      const query = `query {
        allCards(pipeId: ${PIPE_ID}, first: 50${cursor ? `, after: "${cursor}"` : ""}) {
          pageInfo { hasNextPage endCursor }
          edges { node {
            id
            title
            created_at
            current_phase { name }
            fields { field { label } value }
            phases_history { firstTimeIn lastTimeIn phase { name } }
          } }
        }
      }`;
      const r = await fetch(PIPEFY_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      if (!r.ok) {
        const t = await r.text();
        return new Response(JSON.stringify({ error: `HTTP ${r.status}`, body: t.slice(0, 500) }), { status: 500, headers: corsHeaders });
      }
      const j = await r.json();
      if (j.errors) return new Response(JSON.stringify({ error: "GraphQL", details: j.errors }), { status: 500, headers: corsHeaders });
      const edges = j.data?.allCards?.edges || [];
      state.pages++;
      pagesThisCall++;
      state.totalCards += edges.length;

      for (const e of edges) {
        const c = e.node;
        if (TEST_CARD_IDS.has(c.id)) continue;

        const fieldsByLabel: Record<string, string> = {};
        for (const f of c.fields || []) fieldsByLabel[f.field?.label || ""] = f.value || "";
        const faixa = fieldsByLabel["Faixa de faturamento mensal"] || "";
        const motivo = fieldsByLabel["Motivo da perda"] || "";
        const dataAssinatura = fieldsByLabel["Data de assinatura do contrato"] || "";

        // Exclusion: motivo da perda em EXCLUDED_LOSS bloqueia o card em TODAS as fases
        if (motivo && EXCLUDED_LOSS.has(norm(motivo))) continue;

        // MQL: created_at in Jun + faixa qualificada
        if (inJun(c.created_at) && MQL_FATURAMENTO.has(faixa)) {
          if (!seenSets.mql.has(c.id)) { seenSets.mql.add(c.id); state.counts.mql++; }
        }

        // Coleta visitas às fases relevantes durante Jun
        const visitsInMonth: Record<string, Set<string>> = { rm: new Set(), rr: new Set(), proposta: new Set(), ganho: new Set(), contrato: new Set() };
        for (const ph of c.phases_history || []) {
          const bucket = PHASE_BUCKET[norm(ph.phase?.name || "")];
          if (!bucket) continue;
          // Considera "visitou no mês" se firstTimeIn ou lastTimeIn cai em Jun
          if (inJun(ph.firstTimeIn)) visitsInMonth[bucket].add(monthKey(ph.firstTimeIn));
          if (ph.lastTimeIn && inJun(ph.lastTimeIn)) visitsInMonth[bucket].add(monthKey(ph.lastTimeIn));
        }

        // RM: dedup id|month + title|month
        for (const mk of visitsInMonth.rm) {
          const key = `${c.id}|${mk}`;
          if (seenSets.rm.has(key)) continue;
          const tKey = `${norm(c.title || "")}|${mk}`;
          if (tKey && rmTitleSet.has(tKey)) { seenSets.rm.add(key); continue; }
          rmTitleSet.add(tKey);
          seenSets.rm.add(key); state.counts.rm++;
        }
        // RR
        for (const mk of visitsInMonth.rr) {
          const key = `${c.id}|${mk}`;
          if (!seenSets.rr.has(key)) { seenSets.rr.add(key); state.counts.rr++; }
        }
        // Proposta
        for (const mk of visitsInMonth.proposta) {
          const key = `${c.id}|${mk}`;
          if (!seenSets.proposta.has(key)) { seenSets.proposta.add(key); state.counts.proposta++; }
        }

        // Venda: preferir Data de assinatura para mês; senão firstTimeIn de Ganho/Contrato assinado
        // Prefere Ganho sobre Contrato assinado (dedup id|mês).
        const vendaMonths = new Set<string>();
        if (dataAssinatura && inJun(dataAssinatura)) vendaMonths.add(monthKey(dataAssinatura));
        for (const mk of visitsInMonth.ganho) vendaMonths.add(mk);
        for (const mk of visitsInMonth.contrato) vendaMonths.add(mk);
        for (const mk of vendaMonths) {
          const key = `${c.id}|${mk}`;
          if (!seenSets.venda.has(key)) { seenSets.venda.add(key); state.counts.venda++; }
        }
      }
      hasNext = j.data.allCards.pageInfo.hasNextPage;
      cursor = j.data.allCards.pageInfo.endCursor;
    }

    state.seen = {
      mql: [...seenSets.mql], rm: [...seenSets.rm], rr: [...seenSets.rr],
      proposta: [...seenSets.proposta], venda: [...seenSets.venda],
    };
    state.rmTitles = [...rmTitleSet];

    return new Response(JSON.stringify({
      done: !hasNext,
      cursor,
      elapsed_ms: Date.now() - startedAt,
      pagesThisCall,
      totalPages: state.pages,
      totalCards: state.totalCards,
      counts: state.counts,
      state,
    }, null, 2), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message) }), { status: 500, headers: corsHeaders });
  }
});
