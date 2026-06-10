// Read-only query layer for the Slack history Postgres.
// Exposes 3 whitelisted actions: find_channel, recent_messages, search_messages.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  buildSlackPgClient,
  extractClientSlugCandidates,
  fetchRecentMessages,
  findChannelByCandidates,
  findChannelByName,
  listChannels,
  normalizeSlug,
  searchMessages,
} from "../_shared/slack.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let pgClient: any = null;
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Authorization header required" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Invalid token" }, 401);

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "");
    if (!["find_channel", "recent_messages", "search_messages", "list_channels"].includes(action)) {
      return json({ error: "action inválida" }, 400);
    }

    pgClient = buildSlackPgClient();
    await pgClient.connect();

    if (action === "find_channel") {
      const cliente = String(body?.cliente ?? "").trim();
      if (!cliente) return json({ error: "cliente é obrigatório" }, 400);
      const slug = normalizeSlug(cliente);
      const exact = await findChannelByName(pgClient, `interno-${slug}`);
      const channel = exact ?? (await findChannelByCandidates(pgClient, [slug]));
      return json({ channel }, 200);
    }

    if (action === "recent_messages") {
      const channelId = String(body?.channel_id ?? "");
      if (!channelId) return json({ error: "channel_id é obrigatório" }, 400);
      const days = Number(body?.days ?? 60);
      const rootLimit = Number(body?.limit ?? 30);
      const messages = await fetchRecentMessages(pgClient, channelId, {
        days,
        rootLimit,
        maxRows: 200,
      });
      return json({ messages }, 200);
    }

    if (action === "search_messages") {
      const query = String(body?.query ?? "").trim();
      if (!query || query.length < 2) return json({ error: "query (≥2 chars)" }, 400);
      const channelId = body?.channel_id ? String(body.channel_id) : undefined;
      const limit = Number(body?.limit ?? 50);
      const messages = await searchMessages(pgClient, { channelId, query, limit });
      return json({ messages }, 200);
    }

    return json({ error: "unreachable" }, 500);
  } catch (err) {
    console.error("query-slack-db error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return json({ error: msg }, 500);
  } finally {
    if (pgClient) {
      try { await pgClient.end(); } catch (_e) { /* ignore */ }
    }
  }
});
