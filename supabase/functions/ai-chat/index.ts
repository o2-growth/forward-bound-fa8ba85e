import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_HISTORY = 20; // system + até 19 mais recentes

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Authorization header required" }, 401);
    }

    const body = await req.json();
    const conversation_id: string | undefined = body?.conversation_id;
    const user_message: string | undefined = body?.user_message;
    if (!conversation_id || typeof conversation_id !== "string") {
      return json({ error: "conversation_id is required" }, 400);
    }
    if (!user_message || typeof user_message !== "string" || !user_message.trim()) {
      return json({ error: "user_message is required" }, 400);
    }
    if (user_message.length > 8000) {
      return json({ error: "user_message muito longa (max 8000 chars)" }, 400);
    }

    // Cliente Supabase com JWT do usuário => RLS valida ownership.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Invalid token" }, 401);

    // Valida ownership da conversa (RLS já bloquearia, mas devolvemos 404 explícito)
    const { data: conv, error: convErr } = await supabase
      .from("ai_conversations")
      .select("id, user_id, context_type")
      .eq("id", conversation_id)
      .maybeSingle();
    if (convErr) return json({ error: convErr.message }, 500);
    if (!conv) return json({ error: "Conversa não encontrada" }, 404);

    // Carrega histórico (system + últimas N)
    const { data: allMsgs, error: msgErr } = await supabase
      .from("ai_messages")
      .select("role, content, created_at")
      .eq("conversation_id", conversation_id)
      .order("created_at", { ascending: true });
    if (msgErr) return json({ error: msgErr.message }, 500);

    const systemMsg = (allMsgs ?? []).find((m) => m.role === "system");
    const nonSystem = (allMsgs ?? []).filter((m) => m.role !== "system");
    const window = nonSystem.slice(-(MAX_HISTORY - 1));

    // Insere mensagem user
    const { error: insUserErr } = await supabase.from("ai_messages").insert({
      conversation_id,
      role: "user",
      content: user_message,
    });
    if (insUserErr) return json({ error: insUserErr.message }, 500);

    // Monta payload para Lovable AI Gateway (formato OpenAI-compatible)
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) return json({ error: "LOVABLE_API_KEY não configurada" }, 500);

    const openaiMessages: Array<{ role: string; content: string }> = [];
    if (systemMsg?.content) {
      openaiMessages.push({ role: "system", content: systemMsg.content });
    }
    for (const m of window) {
      openaiMessages.push({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      });
    }
    openaiMessages.push({ role: "user", content: user_message });

    const modelId = "google/gemini-2.5-flash";
    const gatewayResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": lovableKey,
      },
      body: JSON.stringify({
        model: modelId,
        messages: openaiMessages,
        temperature: 0.3,
        max_tokens: 2048,
      }),
    });

    if (!gatewayResp.ok) {
      const errText = await gatewayResp.text();
      console.error("Lovable AI Gateway error:", gatewayResp.status, errText);
      if (gatewayResp.status === 429) return json({ error: "Limite de requisições atingido. Tente em instantes." }, 429);
      if (gatewayResp.status === 402) return json({ error: "Créditos da workspace esgotados. Adicione em Settings → Workspace → Usage." }, 402);
      return json({ error: `IA falhou: ${errText.slice(0, 500)}` }, 502);
    }

    const gatewayData = await gatewayResp.json();
    const choice = gatewayData?.choices?.[0];
    const assistantText: string = (choice?.message?.content ?? "").toString().trim();
    if (!assistantText) {
      return json({ error: "IA não retornou texto" }, 502);
    }

    // Insere resposta assistant
    const usageMeta = gatewayData?.usage ?? null;
    const { data: inserted, error: insAssErr } = await supabase
      .from("ai_messages")
      .insert({
        conversation_id,
        role: "assistant",
        content: assistantText,
        metadata: {
          model: modelId,
          usage: usageMeta,
          finish_reason: choice?.finish_reason ?? null,
        },
      })
      .select("id, role, content, metadata, created_at")
      .single();
    if (insAssErr) return json({ error: insAssErr.message }, 500);

    return json({ assistant_message: inserted, conversation_id }, 200);
  } catch (error) {
    console.error("ai-chat error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return json({ error: msg }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
