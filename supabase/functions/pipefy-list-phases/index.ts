// Quick phase list dump
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const apiKey = (Deno.env.get("PIPEFY_API_KEY") || "").trim().replace(/^Bearer\s+/i, "");
  const q = `query { pipe(id: 304018800) { name phases { id name cards_count } } }`;
  const r = await fetch("https://api.pipefy.com/graphql", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: q }),
  });
  return new Response(await r.text(), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
