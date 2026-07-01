// Temp verification: Modelo Atual Jun/2026 counts direct from Pipefy API.
// Paginated: caller passes { cursor, state } and we return partial + new cursor.
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
function norm(s: string) { return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim(); }
const PHASE_BUCKET: Record<string, string> = {
  [norm("MQLs")]: "mql_phase",
  [norm("Reunião agendada / Qualificado")]: "rm",
  [norm("Reunião Realizada")]: "rr",
  [norm("Enviar proposta")]: "proposta",
  [norm("Proposta enviada / Follow Up")]: "proposta",
  [norm("Ganho")]: "venda",
  [norm("Contrato assinado")]: "venda",
};
const MONTH_START = "2026-06-01";
const MONTH_END = "2026-06-30";
function inJun(iso: string | null | undefined) {
  if (!iso) return false;
  const d = iso.slice(0, 10);
  return d >= MONTH_START && d <= MONTH_END;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const apiKey = (Deno.env.get("PIPEFY_API_KEY") || "").trim().replace(/^Bearer\s+/i, "");
  if (!apiKey) return new Response(JSON.stringify({ error: "PIPEFY_API_KEY missing" }), { status: 500, headers: corsHeaders });

  const body = await req.json().catch(() => ({}));
  let cursor: string | null = body.cursor ?? null;
  const state = body.state ?? {
    counts: { mql: 0, rm: 0, rr: 0, proposta: 0, venda: 0 },
    seen: { rm: [], rr: [], proposta: [], venda: [], mql: [] },
    totalCards: 0, pages: 0,
  };
  const seenSets: any = {
    rm: new Set(state.seen.rm),
    rr: new Set(state.seen.rr),
    proposta: new Set(state.seen.proposta),
    venda: new Set(state.seen.venda),
    mql: new Set(state.seen.mql),
  };
  const startedAt = Date.now();
  const MAX_PAGES_PER_CALL = Number(body.maxPages || 25);
  let pagesThisCall = 0;
  let hasNext = true;

  try {
    while (hasNext && pagesThisCall < MAX_PAGES_PER_CALL) {
      const query = `query {
        allCards(pipeId: ${PIPE_ID}, first: 50${cursor ? `, after: "${cursor}"` : ""}) {
          pageInfo { hasNextPage endCursor }
          edges { node {
            id
            created_at
            fields { field { label } value }
            phases_history { firstTimeIn phase { name } }
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
        if (inJun(c.created_at)) {
          const fat = ((c.fields || []).find((f: any) => f.field?.label === "Faixa de faturamento mensal"))?.value || "";
          if (MQL_FATURAMENTO.has(fat) && !seenSets.mql.has(c.id)) { seenSets.mql.add(c.id); state.counts.mql++; }
        }
        const buckets = new Set<string>();
        for (const ph of c.phases_history || []) {
          if (!ph?.firstTimeIn || !inJun(ph.firstTimeIn)) continue;
          const b = PHASE_BUCKET[norm(ph.phase?.name || "")];
          if (b) buckets.add(b);
        }
        for (const b of buckets) {
          if (!seenSets[b].has(c.id)) { seenSets[b].add(c.id); (state.counts as any)[b]++; }
        }
      }
      hasNext = j.data.allCards.pageInfo.hasNextPage;
      cursor = j.data.allCards.pageInfo.endCursor;
    }

    state.seen = {
      rm: [...seenSets.rm], rr: [...seenSets.rr], proposta: [...seenSets.proposta],
      venda: [...seenSets.venda], mql: [...seenSets.mql],
    };
    return new Response(JSON.stringify({
      done: !hasNext,
      cursor,
      elapsed_ms: Date.now() - startedAt,
      pagesThisCall,
      totalPages: state.pages,
      totalCards: state.totalCards,
      counts: state.counts,
      state, // pass back to next call
    }, null, 2), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message) }), { status: 500, headers: corsHeaders });
  }
});
