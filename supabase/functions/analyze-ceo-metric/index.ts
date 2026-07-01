const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Você é o Chief of Staff do CEO de uma holding B2B (BUs: Modelo Atual/CFOaaS, O2 TAX, Expansão/Franquia, Oxy Hacker, Outbound, Monetização).
Sua análise deve ter mindset de gestão de negócios: causa-raiz, risco, alavanca e próxima ação.

Regras de resposta:
- SEMPRE em PT-BR.
- 3 a 5 bullets curtos (máx 2 linhas cada), começando com um verbo forte.
- NÃO repita os números crus — interprete tendência, gap vs meta, concentração, risco.
- Aponte 1 ponto de atenção e 1 próxima ação concreta quando fizer sentido.
- Sem introdução, sem conclusão, sem "espero ter ajudado". Direto ao ponto.
- Nunca invente números ou nomes que não estejam no contexto.`;

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return json({ error: "Body inválido" }, 400);

    const section: string = String(body.section ?? "").slice(0, 60);
    const title: string = String(body.title ?? "").slice(0, 120);
    const context = body.context;

    if (!section || !title || context == null) {
      return json({ error: "section, title e context são obrigatórios" }, 400);
    }

    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) return json({ error: "LOVABLE_API_KEY não configurada" }, 500);

    const contextStr = JSON.stringify(context, null, 2).slice(0, 12000);

    const userPrompt = `Seção do dashboard CEO: **${section}**
Bloco analisado: **${title}**

Contexto (números já calculados):
\`\`\`json
${contextStr}
\`\`\`

Gere a análise seguindo as regras.`;

    const gatewayResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": lovableKey,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 700,
      }),
    });

    if (!gatewayResp.ok) {
      const errText = await gatewayResp.text();
      console.error("analyze-ceo-metric gateway error:", gatewayResp.status, errText);
      if (gatewayResp.status === 429) return json({ error: "Limite de requisições atingido. Tente em instantes." }, 429);
      if (gatewayResp.status === 402) return json({ error: "Créditos da workspace esgotados." }, 402);
      return json({ error: `IA falhou: ${errText.slice(0, 400)}` }, 502);
    }

    const data = await gatewayResp.json();
    const text: string = (data?.choices?.[0]?.message?.content ?? "").toString().trim();
    if (!text) return json({ error: "IA não retornou texto" }, 502);

    return json({ text, model: "google/gemini-3-flash-preview" }, 200);
  } catch (e) {
    console.error("analyze-ceo-metric error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return json({ error: msg }, 500);
  }
});
