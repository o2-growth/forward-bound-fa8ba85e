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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = Deno.env.get("G4_PG_URL");
  if (!url) {
    return json({ error: "G4_PG_URL not configured" }, 500);
  }

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
      };
    });

    return json({
      kpis,
      funil,
      diagnosticoPorLive,
      leads,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("g4-metrics error", err);
    return json({ error: (err as Error).message ?? "unknown error" }, 500);
  } finally {
    try {
      await sql.end({ timeout: 5 });
    } catch (_) { /* ignore */ }
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
