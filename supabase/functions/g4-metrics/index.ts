// Edge function: g4-metrics
// Read-only connection to external Postgres via G4_PG_URL secret.
// Returns { kpis, funil, diagnosticoPorLive, leads, generatedAt }.

import postgres from "https://deno.land/x/postgresjs@v3.4.4/mod.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const MAIO_LIVE = "Live G4 - 20-21/05/2026";

const CACHE_ID = "g4-metrics-v1";
const CACHE_TTL_MS = 10 * 60 * 1000;

// Evita recálculos concorrentes dentro da mesma instância
let inFlight: Promise<Record<string, unknown>> | null = null;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const reqUrl = new URL(req.url);
  const forceRefresh = reqUrl.searchParams.get("refresh") === "1";
  const debug = reqUrl.searchParams.get("debug") === "1";

  try {
    const cached = forceRefresh ? null : await readCache();

    if (cached) {
      const age = Date.now() - new Date(cached.generated_at).getTime();
      if (age < CACHE_TTL_MS) {
        return json(shapePayload(cached.payload, debug));
      }
      // Cache velho: devolve na hora e recalcula em background.
      backgroundRefresh();
      return json(shapePayload(cached.payload, debug));
    }

    const fresh = await refresh();
    return json(shapePayload(fresh, debug));
  } catch (err) {
    console.error("g4-metrics error", err);
    return json({ error: (err as Error).message ?? "unknown error" }, 500);
  }
});

function supabaseAdmin() {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return { url, key };
}

async function readCache(): Promise<
  { payload: Record<string, unknown>; generated_at: string } | null
> {
  try {
    const { url, key } = supabaseAdmin();
    const res = await fetch(
      `${url}/rest/v1/g4_metrics_cache?id=eq.${CACHE_ID}&select=payload,generated_at`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } },
    );
    if (!res.ok) return null;
    const rows = await res.json();
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  } catch (e) {
    console.warn("g4-metrics readCache falhou", e);
    return null;
  }
}

async function writeCache(payload: Record<string, unknown>) {
  try {
    const { url, key } = supabaseAdmin();
    await fetch(`${url}/rest/v1/g4_metrics_cache?on_conflict=id`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({
        id: CACHE_ID,
        payload,
        generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    });
  } catch (e) {
    console.warn("g4-metrics writeCache falhou", e);
  }
}

function refresh(): Promise<Record<string, unknown>> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const payload = await computeMetrics();
    await writeCache(payload);
    return payload;
  })().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

function backgroundRefresh() {
  const p = refresh().catch((e) =>
    console.error("g4-metrics background refresh falhou", e)
  );
  try {
    // deno-lint-ignore no-explicit-any
    (globalThis as any).EdgeRuntime?.waitUntil?.(p);
  } catch (_) { /* ignore */ }
}

/** Remove campos de auditoria pesados do payload quando não pedido debug. */
function shapePayload(payload: Record<string, unknown>, debug: boolean) {
  if (debug) return payload;
  const leads = payload.leads as Array<Record<string, unknown>> | undefined;
  if (!Array.isArray(leads)) return payload;
  return {
    ...payload,
    leads: leads.map((l) => {
      if (
        l.camposUsados === undefined &&
        l.camposDescartados === undefined &&
        l.camposNaoClassificados === undefined
      ) return l;
      const {
        camposUsados: _a,
        camposDescartados: _b,
        camposNaoClassificados: _c,
        ...rest
      } = l;
      return rest;
    }),
  };
}

async function computeMetrics(): Promise<Record<string, unknown>> {
  const url = Deno.env.get("G4_PG_URL");
  if (!url) throw new Error("G4_PG_URL not configured");

  const sql = postgres(url, {
    ssl: false,
    max: 3,
    idle_timeout: 5,
    connect_timeout: 10,
    prepare: false,
  });



  try {
    const [funilRows, diagRows, kpiRows, fatRows, leadRows] = await Promise.all(
      [
        sql /* funil por live */`
          WITH won_by_live AS (
            SELECT unnest(COALESCE(l.lives_assistiu, l.lives)) AS live,
                   l.email
            FROM g4_leads_360 l
            WHERE l.is_ganho = TRUE
              AND l.venda_atribuivel_live = TRUE
              AND l.email IS NOT NULL
          )
          SELECT i.live,
            COUNT(DISTINCT i.email) AS inscritos,
            COUNT(DISTINCT i.email) FILTER (WHERE i.presente) AS presentes,
            COUNT(DISTINCT lm.email) AS levantaram_mao,
            COUNT(DISTINCT w.email) FILTER (WHERE w.live = i.live) AS vendas
          FROM g4_inscritos i
          LEFT JOIN g4_levantadas_mao lm ON lm.email=i.email AND lm.live=i.live
          LEFT JOIN won_by_live w ON w.live = i.live AND w.email = i.email
          WHERE i.email NOT ILIKE '%teste%' AND i.email NOT ILIKE '%test@%'
            AND i.email NOT ILIKE '%@test.%' AND i.email NOT ILIKE '%exemplo.com%'
            AND i.email NOT ILIKE '%@o2inc.com.br'
            AND i.email NOT ILIKE '%nao_atender%' AND i.email NOT ILIKE '%naoatender%'
            AND i.email NOT ILIKE '%no-reply%' AND i.email NOT ILIKE '%noreply%'
            AND i.email NOT IN (
              'dudarovani@gmail.com','jv241004@gmail.com','voce@empresa.com',
              'demo@exemplo.com','teste_nao_atender@gmail.com'
            )
            AND i.live <> 'Raio-X de Margens - G4'
          GROUP BY i.live ORDER BY i.live
        `,

        sql /* diagnóstico por live */`
          SELECT live, COUNT(DISTINCT email) AS diagnosticos
          FROM g4_diagnostico
          WHERE email NOT ILIKE '%teste%' AND email NOT ILIKE '%test@%'
            AND email NOT ILIKE '%@test.%' AND email NOT ILIKE '%exemplo.com%'
            AND email NOT ILIKE '%@o2inc.com.br'
            AND email NOT ILIKE '%nao_atender%' AND email NOT ILIKE '%naoatender%'
            AND email NOT ILIKE '%no-reply%' AND email NOT ILIKE '%noreply%'
            AND email NOT IN (
              'dudarovani@gmail.com','jv241004@gmail.com','voce@empresa.com',
              'demo@exemplo.com','teste_nao_atender@gmail.com'
            )
            AND (live IS NULL OR live <> 'Raio-X de Margens - G4')
          GROUP BY live ORDER BY live
        `,
        sql /* KPIs topo */`
          SELECT
            (SELECT COUNT(DISTINCT email) FROM g4_inscritos
              WHERE email NOT ILIKE '%teste%' AND email NOT ILIKE '%test@%'
                AND email NOT ILIKE '%@test.%' AND email NOT ILIKE '%exemplo.com%'
                AND email NOT ILIKE '%@o2inc.com.br'
                AND email NOT ILIKE '%nao_atender%' AND email NOT ILIKE '%naoatender%'
                AND email NOT ILIKE '%no-reply%' AND email NOT ILIKE '%noreply%'
                AND email NOT IN (
                  'dudarovani@gmail.com','jv241004@gmail.com','voce@empresa.com',
                  'demo@exemplo.com','teste_nao_atender@gmail.com'
                )
                AND live <> 'Raio-X de Margens - G4') AS total_leads,

            (SELECT COUNT(*) FROM g4_levantadas_mao
              WHERE email NOT ILIKE '%teste%' AND email NOT ILIKE '%exemplo.com%'
                AND email NOT ILIKE '%@o2inc.com.br'
                AND email NOT ILIKE '%nao_atender%' AND email NOT ILIKE '%naoatender%'
                AND email NOT IN (
                  'dudarovani@gmail.com','jv241004@gmail.com','voce@empresa.com',
                  'demo@exemplo.com','teste_nao_atender@gmail.com'
                )) AS levantaram_mao,

            (SELECT COUNT(DISTINCT email) FROM g4_diagnostico
              WHERE email NOT ILIKE '%teste%' AND email NOT ILIKE '%exemplo.com%'
                AND email NOT ILIKE '%@o2inc.com.br'
                AND email NOT ILIKE '%nao_atender%' AND email NOT ILIKE '%naoatender%'
                AND email NOT IN (
                  'dudarovani@gmail.com','jv241004@gmail.com','voce@empresa.com',
                  'demo@exemplo.com','teste_nao_atender@gmail.com'
                )) AS diagnosticos
        `,
        sql /* faturamento */`
          SELECT COALESCE(SUM(v),0)::float8 AS faturamento FROM (
            SELECT DISTINCT ON (c."ID")
              (COALESCE(c."Valor MRR",0)+COALESCE(c."Valor Setup",0)+COALESCE(c."Valor Pontual",0)) AS v
            FROM pipefy_moviment_cfos c
            JOIN g4_inscritos i ON i.email = lower(c."E-mail")
            WHERE c."Fase Atual" = 'Ganho'
              AND lower(c."E-mail") NOT ILIKE '%teste%'
              AND lower(c."E-mail") NOT ILIKE '%exemplo.com%'
              AND lower(c."E-mail") NOT ILIKE '%@o2inc.com.br'
              AND lower(c."E-mail") NOT ILIKE '%nao_atender%'
              AND lower(c."E-mail") NOT ILIKE '%naoatender%'
              AND lower(c."E-mail") NOT IN (
                'dudarovani@gmail.com','jv241004@gmail.com','voce@empresa.com',
                'demo@exemplo.com','teste_nao_atender@gmail.com'
              )
              AND (c."Nome" IS NULL OR (
                c."Nome" NOT ILIKE '%teste%' AND c."Nome" NOT ILIKE '%nao atender%'
                AND c."Nome" NOT ILIKE '%não atender%'
              ))
              AND (c."Empresa" IS NULL OR (
                c."Empresa" NOT ILIKE '%teste%' AND c."Empresa" NOT ILIKE '%TESTE ERP%'
              ))
              AND (c."Título" IS NULL OR (
                c."Título" NOT ILIKE '%teste%' AND c."Título" NOT ILIKE '%TESTE ERP%'
                AND c."Título" NOT ILIKE '%nao atender%' AND c."Título" NOT ILIKE '%não atender%'
              ))
          ) t
        `,
        sql /* leads 360 enriquecido com Pipefy + faixa via diagnóstico */`
          WITH pipe_by_card AS (
            SELECT DISTINCT ON ("ID"::text)
              "ID"::text AS card_id_txt,
              lower("E-mail") AS email,
              "Faixa de faturamento mensal" AS faixa,
              COALESCE("Valor MRR", 0)::float8 AS valor_mrr,
              COALESCE("Valor Setup", 0)::float8 AS valor_setup,
              COALESCE("Valor Pontual", 0)::float8 AS valor_pontual,
              "SDR responsável" AS sdr,
              "Entrada" AS data_entrada_pipe,
              "Labels" AS labels_raw,
              "Motivo da perda" AS motivo_perda,
              "Origem do lead" AS origem_lead,
              "Tipo Origem Lead" AS tipo_origem_lead
            FROM pipefy_moviment_cfos
            WHERE "ID" IS NOT NULL
            ORDER BY "ID"::text, "Entrada" DESC NULLS LAST
          ),
          pipe_by_email AS (
            SELECT DISTINCT ON (lower("E-mail"))
              lower("E-mail") AS email,
              "ID"::text AS card_id_txt,
              "Faixa de faturamento mensal" AS faixa,
              COALESCE("Valor MRR", 0)::float8 AS valor_mrr,
              COALESCE("Valor Setup", 0)::float8 AS valor_setup,
              COALESCE("Valor Pontual", 0)::float8 AS valor_pontual,
              "SDR responsável" AS sdr,
              "Entrada" AS data_entrada_pipe,
              "Labels" AS labels_raw,
              "Motivo da perda" AS motivo_perda,
              "Origem do lead" AS origem_lead,
              "Tipo Origem Lead" AS tipo_origem_lead
            FROM pipefy_moviment_cfos
            WHERE "E-mail" IS NOT NULL AND "E-mail" <> ''
            ORDER BY lower("E-mail"), "Entrada" DESC NULLS LAST
          ),
          diag AS (
            SELECT DISTINCT ON (lower(email))
              lower(email) AS email,
              NULLIF(payload->>'revenue_monthly','')::numeric AS revenue_monthly
            FROM g4_diagnostico
            WHERE email IS NOT NULL AND email <> ''
              AND payload->>'revenue_monthly' IS NOT NULL
            ORDER BY lower(email), ts DESC NULLS LAST
          ),
          diag_faixa AS (
            SELECT email,
              CASE
                WHEN revenue_monthly >= 5000000 THEN 'Acima de R$ 5 milhões'
                WHEN revenue_monthly >= 1000000 THEN 'Entre R$ 1 milhão e R$ 5 milhões'
                WHEN revenue_monthly >= 500000  THEN 'Entre R$ 500 mil e R$ 1 milhão'
                WHEN revenue_monthly >= 350000  THEN 'Entre R$ 350 mil e R$ 500 mil'
                WHEN revenue_monthly >= 200000  THEN 'Entre R$ 200 mil e R$ 350 mil'
                WHEN revenue_monthly >= 100000  THEN 'Entre R$ 100 mil e R$ 200 mil'
                WHEN revenue_monthly >= 50000   THEN 'Entre R$ 50 mil e R$ 100 mil'
                WHEN revenue_monthly > 0        THEN 'Até R$ 50 mil'
                ELSE NULL
              END AS faixa
            FROM diag
          )
          SELECT l.nome, l.empresa, l.email,
                 array_remove(l.lives, 'Raio-X de Margens - G4') AS lives,
                 l.presente_alguma_live, l.levantou_mao,
                 CASE WHEN l.live_da_mao = 'Raio-X de Margens - G4' THEN NULL ELSE l.live_da_mao END AS live_da_mao,
                 l.fez_diagnostico, l.no_pipe, l.fase_atual, l.closer,
                 l.card_id::text AS card_id,
                 l.is_ganho,
                 l.data_ganho,
                 l.venda_atribuivel_live,
                 l.primeira_live_data,
                 l.n_lives,
                 l.lives_assistiu,
                 l.lives_mao,
                 l.lives_diagnostico,
                 COALESCE(
                   l.pipefy_url,
                   'https://app.pipefy.com/open-cards/' || COALESCE(l.card_id::text, pbc.card_id_txt, pbe.card_id_txt)
                 ) AS pipefy_url,
                 COALESCE(pbc.faixa, pbe.faixa, d.faixa) AS faixa,
                 -- Preferir valores materializados em g4_leads_360; fallback para Pipefy
                 COALESCE(l.valor_mrr, pbc.valor_mrr, pbe.valor_mrr) AS valor_mrr,
                 COALESCE(l.valor_setup, pbc.valor_setup, pbe.valor_setup) AS valor_setup,
                 COALESCE(pbc.valor_pontual, pbe.valor_pontual) AS valor_pontual,
                 COALESCE(pbc.sdr, pbe.sdr) AS sdr,
                 COALESCE(pbc.data_entrada_pipe, pbe.data_entrada_pipe) AS data_entrada_pipe,
                 COALESCE(pbc.labels_raw, pbe.labels_raw) AS labels_raw,
                 COALESCE(pbc.motivo_perda, pbe.motivo_perda) AS motivo_perda,
                 COALESCE(pbc.origem_lead, pbe.origem_lead) AS origem_lead,
                 COALESCE(pbc.tipo_origem_lead, pbe.tipo_origem_lead) AS tipo_origem_lead
          FROM g4_leads_360 l
          LEFT JOIN pipe_by_card  pbc ON pbc.card_id_txt = l.card_id::text
          LEFT JOIN pipe_by_email pbe ON pbe.email = l.email
          LEFT JOIN diag_faixa    d   ON d.email = l.email
          WHERE (l.email IS NULL OR (
              l.email NOT ILIKE '%teste%' AND l.email NOT ILIKE '%test@%'
              AND l.email NOT ILIKE '%@test.%' AND l.email NOT ILIKE '%exemplo.com%'
              AND l.email NOT ILIKE '%@o2inc.com.br'
              AND l.email NOT ILIKE '%nao_atender%' AND l.email NOT ILIKE '%naoatender%'
              AND l.email NOT ILIKE '%no-reply%' AND l.email NOT ILIKE '%noreply%'
              AND l.email NOT IN (
                'dudarovani@gmail.com','jv241004@gmail.com','voce@empresa.com',
                'demo@exemplo.com','teste_nao_atender@gmail.com'
              )
            ))
            AND (l.nome IS NULL OR (
              l.nome NOT ILIKE '%teste%' AND l.nome NOT ILIKE '%nao atender%'
              AND l.nome NOT ILIKE '%não atender%' AND l.nome NOT ILIKE '%TESTE ERP%'
            ))
            AND (l.empresa IS NULL OR (
              l.empresa NOT ILIKE '%teste%' AND l.empresa NOT ILIKE '%TESTE ERP%'
            ))

          UNION ALL

          -- Whitelist Finders Fee: e-mails de venda G4 que não estão em g4_leads_360.
          -- Puxamos direto do Pipefy para que apareçam no drill-down de vendas.
          SELECT
            COALESCE(pf."Nome", pf."Título") AS nome,
            pf."Empresa" AS empresa,
            lower(pf."E-mail") AS email,
            ARRAY['G4 - Finders Fee (fora das lives)']::text[] AS lives,
            FALSE AS presente_alguma_live,
            FALSE AS levantou_mao,
            NULL::text AS live_da_mao,
            FALSE AS fez_diagnostico,
            TRUE  AS no_pipe,
            pf."Fase Atual" AS fase_atual,
            pf."Closer responsável" AS closer,
            pf."ID"::text AS card_id,
            (pf."Fase Atual" = 'Ganho') AS is_ganho,
            NULL::date AS data_ganho,
            TRUE AS venda_atribuivel_live,
            NULL::date AS primeira_live_data,
            0::int AS n_lives,
            NULL::text[] AS lives_assistiu,
            NULL::text[] AS lives_mao,
            NULL::text[] AS lives_diagnostico,
            'https://app.pipefy.com/open-cards/' || pf."ID" AS pipefy_url,
            pf."Faixa de faturamento mensal" AS faixa,
            COALESCE(pf."Valor MRR", 0)::float8 AS valor_mrr,
            COALESCE(pf."Valor Setup", 0)::float8 AS valor_setup,
            COALESCE(pf."Valor Pontual", 0)::float8 AS valor_pontual,
            pf."SDR responsável" AS sdr,
            pf."Entrada" AS data_entrada_pipe,
            pf."Labels" AS labels_raw,
            pf."Motivo da perda" AS motivo_perda,
            pf."Origem do lead" AS origem_lead,
            pf."Tipo Origem Lead" AS tipo_origem_lead
          FROM (
            SELECT DISTINCT ON (lower("E-mail")) *
            FROM pipefy_moviment_cfos
            WHERE lower("E-mail") IN (
              'vanderson@martinelli.ind.br',
              'sidney@petromarcomercial.com.br',
              'tamara@importadorapatagonia.com.br',
              'administrativo@lotuslogistica.com',
              'adm@lotuslogistica.com',
              'andre.silva@invenzi.com'
            )
            ORDER BY lower("E-mail"),
                     CASE WHEN "Fase Atual" = 'Ganho' THEN 0 ELSE 1 END,
                     "Entrada" DESC NULLS LAST
          ) pf
          WHERE NOT EXISTS (
            SELECT 1 FROM g4_leads_360 gl WHERE gl.email = lower(pf."E-mail")
          )
        `,

      ],
    );


    const funil = (funilRows as Array<Record<string, unknown>>).map((r) => {
      const live = String(r.live);
      const isMaio = live === MAIO_LIVE;
      const isTraction = /traction/i.test(live);
      const inscritosRaw = Number(r.inscritos ?? 0);
      if (isTraction) {
        // Eventos de traction: não temos inscritos nem presença.
        // Os leads capturados contam apenas como "levantaram a mão".
        return {
          live,
          inscritos: 0,
          presentes: 0,
          levantaramMao: inscritosRaw,
          vendas: Number(r.vendas ?? 0),
        };
      }
      return {
        live,
        inscritos: inscritosRaw,
        // Maio não capturou presença — devolvemos null para a UI mostrar "—"
        presentes: isMaio ? null : Number(r.presentes ?? 0),
        levantaramMao: Number(r.levantaram_mao ?? 0),
        vendas: Number(r.vendas ?? 0),
      };
    });


    const diagnosticoPorLive = (diagRows as Array<Record<string, unknown>>).map(
      (r) => ({
        live: String(r.live),
        diagnosticos: Number(r.diagnosticos ?? 0),
      }),
    );

    const kpiRow = (kpiRows as Array<Record<string, unknown>>)[0] ?? {};
    const fatRow = (fatRows as Array<Record<string, unknown>>)[0] ?? {};
    const kpis = {
      totalLeads: Number(kpiRow.total_leads ?? 0),
      levantaramMao: Number(kpiRow.levantaram_mao ?? 0),
      diagnosticos: Number(kpiRow.diagnosticos ?? 0),
      faturamento: Number(fatRow.faturamento ?? 0),
    };

    const nowMs = Date.now();
    const parseTemperatura = (raw: unknown): "Quente" | "Morno" | "Frio" | null => {
      if (raw == null) return null;
      let str = String(raw).trim();
      if (!str || str === "[]") return null;
      if (str.startsWith("[")) {
        try {
          const arr = JSON.parse(str);
          if (Array.isArray(arr) && arr.length > 0) str = String(arr[0]).trim();
        } catch { /* keep raw */ }
      }
      const norm = str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (norm.startsWith("quente")) return "Quente";
      if (norm.startsWith("morn")) return "Morno";
      if (norm.startsWith("fri")) return "Frio";
      return null;
    };
    const leads = (leadRows as Array<Record<string, unknown>>).map((r) => {
      const valorMRR = r.valor_mrr != null ? Number(r.valor_mrr) : null;
      const valorSetup = r.valor_setup != null ? Number(r.valor_setup) : null;
      const valorPontual = r.valor_pontual != null ? Number(r.valor_pontual) : null;
      const tcv =
        valorMRR != null || valorSetup != null || valorPontual != null
          ? (valorMRR ?? 0) * 12 + (valorSetup ?? 0) + (valorPontual ?? 0)
          : null;
      const dataEntradaPipe = r.data_entrada_pipe
        ? new Date(r.data_entrada_pipe as string).toISOString()
        : null;
      const diasNoPipe = dataEntradaPipe
        ? Math.max(0, Math.floor((nowMs - new Date(dataEntradaPipe).getTime()) / 86400000))
        : null;
      return {
        nome: r.nome as string | null,
        empresa: r.empresa as string | null,
        email: r.email as string | null,
        lives: (r.lives as string[] | null) ?? [],
        presenteAlgumaLive: Boolean(r.presente_alguma_live),
        levantouMao: Boolean(r.levantou_mao),
        liveDaMao: r.live_da_mao as string | null,
        fezDiagnostico: Boolean(r.fez_diagnostico),
        noPipe: Boolean(r.no_pipe),
        faseAtual: r.fase_atual as string | null,
        closer: r.closer as string | null,
        pipefyUrl: r.pipefy_url as string | null,
        faixa: (r.faixa as string | null) ?? null,
        valorMRR,
        valorSetup,
        valorPontual,
        tcv,
        sdr: (r.sdr as string | null) ?? null,
        dataEntradaPipe,
        diasNoPipe,
        temperatura: parseTemperatura(r.labels_raw),
        motivoPerda: (r.motivo_perda as string | null) ?? null,
        origemLead: (r.origem_lead as string | null) ?? null,
        tipoOrigemLead: (r.tipo_origem_lead as string | null) ?? null,
        cardId: r.card_id != null ? String(r.card_id) : null,
        isGanho: r.is_ganho == null ? null : Boolean(r.is_ganho),
        dataGanho: r.data_ganho ? new Date(r.data_ganho as string).toISOString() : null,
        vendaAtribuivelLive: r.venda_atribuivel_live == null ? null : Boolean(r.venda_atribuivel_live),
        primeiraLiveData: r.primeira_live_data ? new Date(r.primeira_live_data as string).toISOString() : null,
        nLives: r.n_lives != null ? Number(r.n_lives) : null,
        livesAssistiu: (r.lives_assistiu as string[] | null) ?? null,
        livesMao: (r.lives_mao as string[] | null) ?? null,
        livesDiagnostico: (r.lives_diagnostico as string[] | null) ?? null,
      };
    });

    // ===== Ganhos: valores vindos direto da API do Pipefy =====
    // O banco espelho não traz todos os campos de MRR (ex.: card 1409285792 com
    // "Valor MRR" nulo). Para os cards em Ganho buscamos o card no Pipefy e
    // somamos TODOS os campos monetários por label.
    const ganhoLeads = leads.filter(
      (l) =>
        l.cardId &&
        (l.isGanho === true || normalize(l.faseAtual) === "ganho"),
    );
    const ganhoIds = [...new Set(ganhoLeads.map((l) => l.cardId as string))];
    let faturamentoDelta = 0;
    if (ganhoIds.length > 0) {
      const pipefyValues = await fetchPipefyCardValues(ganhoIds);
      for (const lead of ganhoLeads) {
        const v = pipefyValues.get(lead.cardId as string);
        if (!v) {
          (lead as Record<string, unknown>).valoresFonte = "espelho";
          continue;
        }
        const antes =
          (lead.valorMRR ?? 0) + (lead.valorSetup ?? 0) + (lead.valorPontual ?? 0);
        lead.valorMRR = v.mrr;
        lead.valorSetup = v.setup;
        lead.valorPontual = v.pontual;
        lead.tcv = v.mrr * 12 + v.setup + v.pontual;
        (lead as Record<string, unknown>).valoresFonte = "pipefy";
        (lead as Record<string, unknown>).camposUsados = v.campos;
        (lead as Record<string, unknown>).camposDescartados = v.camposDescartados;
        (lead as Record<string, unknown>).camposNaoClassificados = v.camposNaoClassificados;

        faturamentoDelta += v.mrr + v.setup + v.pontual - antes;
      }
    }
    kpis.faturamento = Math.max(0, kpis.faturamento + faturamentoDelta);

    return {
      kpis,
      funil,
      diagnosticoPorLive,
      leads,
      generatedAt: new Date().toISOString(),
    };
  } finally {
    try {
      await sql.end({ timeout: 5 });
    } catch (_) { /* ignore */ }
  }
}


function normalize(v: unknown): string {
  return String(v ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function parseMoney(raw: unknown): number {
  if (raw == null) return 0;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : 0;
  let s = String(raw).trim();
  if (!s || s === "[]") return 0;
  if (s.startsWith("[")) {
    try {
      const arr = JSON.parse(s);
      if (Array.isArray(arr) && arr.length > 0) s = String(arr[0]);
      else return 0;
    } catch { /* keep raw */ }
  }
  s = s.replace(/[^0-9,.-]/g, "");
  if (!s) return 0;
  // 1.234,56 -> 1234.56 | 1234.56 -> 1234.56
  if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(/,/g, "");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

type CampoUsado = { label: string; cat: "mrr" | "setup" | "pontual"; valor: number };
type CardValues = {
  mrr: number;
  setup: number;
  pontual: number;
  campos: CampoUsado[];
  camposDescartados: CampoUsado[];
  camposNaoClassificados: { label: string; valor: number }[];
};

const MRR_LABEL_RE = /(mrr|cfoaas|cfo aas|oxy|turnaround|valuation|taxa de franquia)/;
const SETUP_LABEL_RE = /setup|implanta/;
const PONTUAL_LABEL_RE = /pontual/;
const IGNORE_LABEL_RE = /(educacao|parcela|quantidade|desconto|isentado|previsto|data|%)/;
// Rótulos monetários candidatos (para auditar o que ficou de fora)
const MONEY_HINT_RE = /(valor|preco|fee|honorario|receita|ticket)/;


// Canonicaliza o rótulo para deduplicar campos espelhados no Pipefy
// (ex.: "Valor - Setup *" e "Valor Setup" são o MESMO valor, não devem somar).
function canonicalLabelKey(label: string): string {
  return label
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t && !["valor", "valores", "de", "do", "da", "dos", "das", "total", "mensal", "r"].includes(t))
    .sort()
    .join("_");
}


// Busca os cards no Pipefy e soma todos os campos monetários por label.
async function fetchPipefyCardValues(
  ids: string[],
): Promise<Map<string, CardValues>> {
  const out = new Map<string, CardValues>();
  const apiKey = (Deno.env.get("PIPEFY_API_KEY") || "").trim().replace(/^Bearer\s+/i, "");
  if (!apiKey) {
    console.warn("g4-metrics: PIPEFY_API_KEY ausente — mantendo valores do espelho");
    return out;
  }

  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += 25) chunks.push(ids.slice(i, i + 25));

  await Promise.all(
    chunks.map(async (chunk) => {
      const query = `query { ${
        chunk
          .map(
            (id, i) =>
              `c${i}: card(id: ${JSON.stringify(id)}) { id fields { name value field { label } } }`,
          )
          .join(" ")
      } }`;
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 20000);
        const res = await fetch("https://api.pipefy.com/graphql", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query }),
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (!res.ok) {
          console.error("g4-metrics pipefy HTTP", res.status, await res.text());
          return;
        }
        const body = await res.json();
        if (body.errors?.length) {
          console.error("g4-metrics pipefy errors", JSON.stringify(body.errors).slice(0, 500));
        }
        const data = body.data ?? {};
        for (const key of Object.keys(data)) {
          const card = data[key];
          if (!card?.id) continue;
          const vals: CardValues = {
            mrr: 0,
            setup: 0,
            pontual: 0,
            campos: [],
            camposDescartados: [],
            camposNaoClassificados: [],
          };
          // Deduplica por rótulo canônico: campos espelhados ("Valor Setup" vs
          // "Valor - Setup *") contam uma única vez (mantém o maior valor).
          const seen = new Map<string, CampoUsado>();
          for (const f of card.fields ?? []) {
            const label = normalize(f.field?.label ?? f.name);
            if (!label || IGNORE_LABEL_RE.test(label)) continue;
            const amount = parseMoney(f.value);
            if (!amount) continue;
            let cat: CampoUsado["cat"] | null = null;
            if (PONTUAL_LABEL_RE.test(label)) cat = "pontual";
            else if (SETUP_LABEL_RE.test(label)) cat = "setup";
            else if (MRR_LABEL_RE.test(label)) cat = "mrr";
            if (!cat) {
              if (MONEY_HINT_RE.test(label)) {
                vals.camposNaoClassificados.push({ label, valor: amount });
              }
              continue;
            }
            const key = `${cat}:${canonicalLabelKey(label)}`;
            const prev = seen.get(key);
            if (!prev) {
              seen.set(key, { label, cat, valor: amount });
            } else if (amount > prev.valor) {
              vals.camposDescartados.push(prev);
              seen.set(key, { label, cat, valor: amount });
            } else {
              vals.camposDescartados.push({ label, cat, valor: amount });
            }
          }
          for (const campo of seen.values()) {
            vals[campo.cat] += campo.valor;
            vals.campos.push(campo);
          }
          if (vals.camposNaoClassificados.length > 0) {
            console.warn(
              "g4-metrics: campos monetários não classificados",
              card.id,
              JSON.stringify(vals.camposNaoClassificados),
            );
          }
          out.set(String(card.id), vals);



        }
      } catch (err) {
        console.error("g4-metrics pipefy fetch falhou", err);
      }
    }),
  );

  return out;
}





function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
