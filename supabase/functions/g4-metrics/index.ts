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
          SELECT i.live,
            COUNT(DISTINCT i.email) AS inscritos,
            COUNT(DISTINCT i.email) FILTER (WHERE i.presente) AS presentes,
            COUNT(DISTINCT lm.email) AS levantaram_mao,
            COUNT(DISTINCT p.email) FILTER (WHERE p.fase_atual='Ganho') AS vendas
          FROM g4_inscritos i
          LEFT JOIN g4_levantadas_mao lm ON lm.email=i.email AND lm.live=i.live
          LEFT JOIN (
            SELECT DISTINCT ON (lower("E-mail")) lower("E-mail") AS email, "Fase Atual" AS fase_atual
            FROM pipefy_moviment_cfos WHERE "E-mail" IS NOT NULL AND "E-mail" <> ''
            ORDER BY lower("E-mail"), "Entrada" DESC NULLS LAST
          ) p ON p.email=i.email
          WHERE i.email NOT ILIKE '%teste%' AND i.email NOT ILIKE '%exemplo.com%'
            AND i.email NOT ILIKE '%@o2inc.com.br'
            AND i.email NOT IN ('dudarovani@gmail.com','jv241004@gmail.com','voce@empresa.com','demo@exemplo.com')
          GROUP BY i.live ORDER BY i.live
        `,
        sql /* diagnóstico por live */`
          SELECT live, COUNT(DISTINCT email) AS diagnosticos
          FROM g4_diagnostico
          WHERE email NOT ILIKE '%teste%' AND email NOT ILIKE '%exemplo.com%'
            AND email NOT ILIKE '%@o2inc.com.br'
            AND email NOT IN ('dudarovani@gmail.com','jv241004@gmail.com','voce@empresa.com','demo@exemplo.com')
          GROUP BY live ORDER BY live
        `,
        sql /* KPIs topo */`
          SELECT
            (SELECT COUNT(DISTINCT email) FROM g4_inscritos
              WHERE email NOT ILIKE '%teste%' AND email NOT ILIKE '%@o2inc.com.br') AS total_leads,
            (SELECT COUNT(*) FROM g4_levantadas_mao) AS levantaram_mao,
            (SELECT COUNT(DISTINCT email) FROM g4_diagnostico) AS diagnosticos
        `,
        sql /* faturamento */`
          SELECT COALESCE(SUM(v),0)::float8 AS faturamento FROM (
            SELECT DISTINCT ON (c."ID")
              (COALESCE(c."Valor MRR",0)+COALESCE(c."Valor Setup",0)+COALESCE(c."Valor Pontual",0)) AS v
            FROM pipefy_moviment_cfos c
            JOIN g4_inscritos i ON i.email = lower(c."E-mail")
            WHERE c."Fase Atual" = 'Ganho'
          ) t
        `,
        sql /* leads 360 */`
          SELECT nome, empresa, email, lives, presente_alguma_live, levantou_mao,
                 live_da_mao, fez_diagnostico, no_pipe, fase_atual, closer, pipefy_url
          FROM g4_leads_360
          WHERE email NOT ILIKE '%teste%' AND email NOT ILIKE '%@o2inc.com.br'
          ORDER BY levantou_mao DESC, fez_diagnostico DESC, no_pipe DESC
        `,
      ],
    );

    const funil = (funilRows as Array<Record<string, unknown>>).map((r) => {
      const live = String(r.live);
      const isMaio = live === MAIO_LIVE;
      return {
        live,
        inscritos: Number(r.inscritos ?? 0),
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

    const leads = (leadRows as Array<Record<string, unknown>>).map((r) => ({
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
    }));

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
