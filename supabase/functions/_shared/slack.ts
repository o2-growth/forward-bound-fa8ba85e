// Shared helpers to query the external Slack PostgreSQL (read-only).
// Tables: slack_channels, slack_messages, slack_thread_replies.
import pg from "npm:pg@8.13.1";
const { Client } = pg;

export interface SlackChannel {
  id: string;
  name: string;
  member_count: number | null;
  topic?: string | null;
}

export interface SlackMessage {
  when: string;
  username: string | null;
  text: string | null;
  thread_ts: string | null;
  channel_name?: string;
  is_reply?: boolean;
}

export function buildSlackPgClient() {
  return new Client({
    host: Deno.env.get("SLACK_PG_HOST"),
    port: parseInt(Deno.env.get("SLACK_PG_PORT") || "5432"),
    database: Deno.env.get("SLACK_PG_DATABASE"),
    user: Deno.env.get("SLACK_PG_USER"),
    password: Deno.env.get("SLACK_PG_PASSWORD"),
  });
}

export function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Tries to extract candidate client names from the cliente360 JSON.
 * Returns a deduplicated list of normalized slugs to attempt matching.
 */
export function extractClientSlugCandidates(cliente360: any): string[] {
  const out: string[] = [];
  if (!cliente360 || typeof cliente360 !== "object") return out;

  const pickStrings = (obj: any, depth = 0) => {
    if (!obj || typeof obj !== "object" || depth > 2) return;
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === "string" && v.trim()) {
        const key = k.toLowerCase();
        if (
          key === "nome" ||
          key === "titulo" ||
          key === "title" ||
          key === "cliente" ||
          key === "nome_cliente" ||
          key === "razao_social" ||
          key === "razao" ||
          key === "fantasia" ||
          key === "nome_fantasia" ||
          key === "slack_channel"
        ) {
          out.push(v.trim());
        }
      } else if (v && typeof v === "object") {
        pickStrings(v, depth + 1);
      }
    }
  };
  pickStrings(cliente360);

  const slugs = out
    .map(normalizeSlug)
    .filter(Boolean);
  return Array.from(new Set(slugs));
}

/**
 * Finds the Slack channel for a list of normalized slug candidates.
 * Strategy: exact match on 'interno-<slug>', then ILIKE on '%slug%'.
 */
export async function findChannelByCandidates(
  pgClient: any,
  slugs: string[],
): Promise<SlackChannel | null> {
  if (!slugs.length) return null;

  // Exact match first
  const exactNames = slugs.map((s) => `interno-${s}`);
  const exact = await pgClient.query(
    `SELECT id, name, member_count, topic
       FROM slack_channels
      WHERE name = ANY($1::text[])
      ORDER BY member_count DESC NULLS LAST
      LIMIT 1`,
    [exactNames],
  );
  if (exact.rowCount > 0) return exact.rows[0] as SlackChannel;

  // Fuzzy ILIKE per candidate (longest first to prefer specificity)
  const ordered = [...slugs].sort((a, b) => b.length - a.length);
  for (const slug of ordered) {
    if (slug.length < 3) continue;
    const fuzzy = await pgClient.query(
      `SELECT id, name, member_count, topic
         FROM slack_channels
        WHERE name ILIKE $1 AND name LIKE 'interno-%'
        ORDER BY member_count DESC NULLS LAST
        LIMIT 1`,
      [`%${slug}%`],
    );
    if (fuzzy.rowCount > 0) return fuzzy.rows[0] as SlackChannel;
  }
  return null;
}

export async function findChannelByName(
  pgClient: any,
  name: string,
): Promise<SlackChannel | null> {
  const res = await pgClient.query(
    `SELECT id, name, member_count, topic FROM slack_channels WHERE name = $1 LIMIT 1`,
    [name],
  );
  return (res.rows[0] as SlackChannel) ?? null;
}

export async function findChannelById(
  pgClient: any,
  id: string,
): Promise<SlackChannel | null> {
  const res = await pgClient.query(
    `SELECT id, name, member_count, topic FROM slack_channels WHERE id = $1 LIMIT 1`,
    [id],
  );
  return (res.rows[0] as SlackChannel) ?? null;
}

export async function listChannels(
  pgClient: any,
  opts: { query?: string; limit?: number } = {},
): Promise<SlackChannel[]> {
  const limit = Math.max(1, Math.min(opts.limit ?? 50, 200));
  const q = (opts.query ?? "").trim();
  if (q) {
    const res = await pgClient.query(
      `SELECT id, name, member_count, topic FROM slack_channels
        WHERE name ILIKE $1
        ORDER BY (name LIKE 'interno-%') DESC, member_count DESC NULLS LAST, name ASC
        LIMIT $2`,
      [`%${q}%`, limit],
    );
    return res.rows as SlackChannel[];
  }
  const res = await pgClient.query(
    `SELECT id, name, member_count, topic FROM slack_channels
      WHERE name LIKE 'interno-%'
      ORDER BY member_count DESC NULLS LAST, name ASC
      LIMIT $1`,
    [limit],
  );
  return res.rows as SlackChannel[];
}

/**
 * Fetches recent root messages (and a sample of replies) for a channel.
 */
export async function fetchRecentMessages(
  pgClient: any,
  channelId: string,
  opts: { days?: number; rootLimit?: number; maxRows?: number } = {},
): Promise<SlackMessage[]> {
  const days = Math.max(1, Math.min(opts.days ?? 60, 365));
  const rootLimit = Math.max(1, Math.min(opts.rootLimit ?? 30, 200));
  const maxRows = Math.max(1, Math.min(opts.maxRows ?? 200, 500));

  const sinceTs = Math.floor(Date.now() / 1000 - days * 86400);

  const rootsRes = await pgClient.query(
    `SELECT ts, thread_ts, username, text, COALESCE(reply_count,0) AS reply_count
       FROM slack_messages
      WHERE channel_id = $1
        AND ts::numeric >= $2
        AND (subtype IS NULL OR subtype = '')
      ORDER BY ts::numeric DESC
      LIMIT $3`,
    [channelId, sinceTs, rootLimit],
  );

  const out: SlackMessage[] = [];
  for (const r of rootsRes.rows) {
    out.push({
      when: new Date(Number(r.ts) * 1000).toISOString(),
      username: r.username,
      text: r.text,
      thread_ts: r.thread_ts ?? null,
      is_reply: false,
    });
  }

  // Fetch replies for threads with reply_count > 0, until maxRows
  const threadTss = rootsRes.rows
    .filter((r: any) => Number(r.reply_count) > 0)
    .map((r: any) => r.ts);

  if (threadTss.length && out.length < maxRows) {
    const remaining = maxRows - out.length;
    const repliesRes = await pgClient.query(
      `SELECT ts, thread_ts, username, text
         FROM slack_thread_replies
        WHERE channel_id = $1
          AND thread_ts = ANY($2::text[])
        ORDER BY ts::numeric ASC
        LIMIT $3`,
      [channelId, threadTss, remaining],
    );
    for (const r of repliesRes.rows) {
      out.push({
        when: new Date(Number(r.ts) * 1000).toISOString(),
        username: r.username,
        text: r.text,
        thread_ts: r.thread_ts,
        is_reply: true,
      });
    }
  }

  // Sort chronologically ascending for nicer reading
  out.sort((a, b) => a.when.localeCompare(b.when));
  return out;
}

/**
 * Searches for a term across a channel's root messages and replies.
 */
export async function searchMessages(
  pgClient: any,
  opts: { channelId?: string; query: string; limit?: number },
): Promise<SlackMessage[]> {
  const limit = Math.max(1, Math.min(opts.limit ?? 50, 200));
  const q = `%${opts.query}%`;
  const params: any[] = [q];
  let whereChan = "";
  if (opts.channelId) {
    params.push(opts.channelId);
    whereChan = `AND m.channel_id = $${params.length}`;
  }
  params.push(limit);
  const limitIdx = params.length;

  const sql = `
    SELECT * FROM (
      SELECT m.ts, m.thread_ts, m.username, m.text, m.channel_name, FALSE AS is_reply
        FROM slack_messages m
       WHERE m.text ILIKE $1 ${whereChan}
      UNION ALL
      SELECT r.ts, r.thread_ts, r.username, r.text, c.name AS channel_name, TRUE AS is_reply
        FROM slack_thread_replies r
        JOIN slack_channels c ON c.id = r.channel_id
       WHERE r.text ILIKE $1
         ${opts.channelId ? `AND r.channel_id = $2` : ""}
    ) u
    ORDER BY ts::numeric DESC
    LIMIT $${limitIdx}
  `;

  const res = await pgClient.query(sql, params);
  return res.rows.map((r: any) => ({
    when: new Date(Number(r.ts) * 1000).toISOString(),
    username: r.username,
    text: r.text,
    thread_ts: r.thread_ts ?? null,
    channel_name: r.channel_name,
    is_reply: !!r.is_reply,
  }));
}
