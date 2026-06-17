import pg from "npm:pg@8.13.1";
const { Client } = pg;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const needles: string[] = body.needles ?? [
      "paiefilho", "paiêfilho", "pae filho", "google", "leonardo",
      "g4 pic pay", "g4 picpay", "picpay", "g4",
    ];
    const monthStart: string = body.monthStart ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
    const monthEnd: string = body.monthEnd ?? new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10);

    const client = new Client({
      host: Deno.env.get("EXTERNAL_PG_HOST"),
      port: parseInt(Deno.env.get("EXTERNAL_PG_PORT")!),
      database: Deno.env.get("EXTERNAL_PG_DATABASE"),
      user: Deno.env.get("EXTERNAL_PG_USER"),
      password: Deno.env.get("EXTERNAL_PG_PASSWORD"),
      ssl: false,
    });
    await client.connect();

    // 1) Find card IDs that match any needle AND were CREATED in the month (MQL-by-creation rule)
    const ilikeClauses = needles.map((_, i) => `LOWER("Título") LIKE $${i + 3}`).join(" OR ");
    const params: any[] = [monthStart, monthEnd, ...needles.map(n => `%${n.toLowerCase()}%`)];
    const matchSql = `
      SELECT DISTINCT "ID" AS id, "Título" AS titulo,
             MIN("Data Criação") AS data_criacao,
             MAX("Fase atual") AS fase_atual,
             MAX("Faixa de faturamento mensal") AS faixa,
             MAX("Motivo de Perda") AS motivo_perda
      FROM pipefy_moviment_cfos
      WHERE "Data Criação" >= $1 AND "Data Criação" <= ($2::date + INTERVAL '1 day')
        AND (${ilikeClauses})
      GROUP BY "ID", "Título"
      ORDER BY data_criacao;
    `;
    const matches = await client.query(matchSql, params);
    const ids = matches.rows.map((r: any) => String(r.id));

    // 2) Full phase history for those IDs (all time)
    let history: any[] = [];
    if (ids.length > 0) {
      const histSql = `
        SELECT "ID" AS id, "Título" AS titulo,
               "Fase Origem" AS fase_origem, "Fase" AS fase, "Fase atual" AS fase_atual,
               "Entrada" AS entrada, "Motivo de Perda" AS motivo_perda
        FROM pipefy_moviment_cfos
        WHERE "ID" = ANY($1::text[])
        ORDER BY "ID", "Entrada";
      `;
      const histRes = await client.query(histSql, [ids]);
      history = histRes.rows;
    }

    await client.end();
    return new Response(JSON.stringify({ monthStart, monthEnd, matches: matches.rows, history }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
