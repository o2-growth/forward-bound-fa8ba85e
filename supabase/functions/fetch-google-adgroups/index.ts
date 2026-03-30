import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GOOGLE_ADS_API_VERSION = "v22";
const CACHE_TTL_MINUTES = 60;

function getSupabaseClient() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

async function getCachedData(supabase: any, cacheKey: string, includeStale = false) {
  try {
    let query = supabase.from('meta_ads_cache').select('data, expires_at').eq('cache_key', cacheKey);
    if (!includeStale) query = query.gt('expires_at', new Date().toISOString());
    const { data, error } = await query.single();
    if (error || !data) return null;
    return { data: data.data, isStale: new Date(data.expires_at) < new Date() };
  } catch { return null; }
}

async function setCachedData(supabase: any, cacheKey: string, data: any) {
  const expiresAt = new Date(Date.now() + CACHE_TTL_MINUTES * 60 * 1000);
  try {
    await supabase.from('meta_ads_cache').upsert({
      cache_key: cacheKey, data,
      fetched_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
    }, { onConflict: 'cache_key' });
  } catch (err) { console.error("Cache error:", err); }
}

async function getAccessToken(): Promise<string> {
  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("GOOGLE_ADS_CLIENT_ID")!,
      client_secret: Deno.env.get("GOOGLE_ADS_CLIENT_SECRET")!,
      refresh_token: Deno.env.get("GOOGLE_ADS_REFRESH_TOKEN")!,
      grant_type: "refresh_token",
    }),
  });
  const body = await resp.json();
  if (!body.access_token) throw new Error(body.error_description || "OAuth2 failed");
  return body.access_token;
}

async function queryGoogleAds(accessToken: string, customerId: string, query: string) {
  const url = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${customerId}/googleAds:searchStream`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "developer-token": Deno.env.get("GOOGLE_ADS_DEVELOPER_TOKEN")!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });
  const text = await resp.text();
  if (!resp.ok) throw new Error(`Google Ads API error: ${resp.status}`);
  const results = JSON.parse(text);
  const rows: any[] = [];
  for (const batch of results) { if (batch.results) rows.push(...batch.results); }
  return rows;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const customerId = Deno.env.get("GOOGLE_ADS_CUSTOMER_ID")!;
    const { campaignId, startDate, endDate } = await req.json();
    if (!campaignId) throw new Error("campaignId é obrigatório");

    const supabase = getSupabaseClient();
    const cacheKey = `google:adgroups:${campaignId}:${startDate}:${endDate}`;
    const cached = await getCachedData(supabase, cacheKey);
    if (cached && !cached.isStale) {
      return new Response(JSON.stringify({ success: true, adGroups: cached.data, campaignId, fromCache: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = await getAccessToken();
    const query = `
      SELECT ad_group.id, ad_group.name, ad_group.status,
             metrics.cost_micros, metrics.impressions, metrics.clicks,
             metrics.conversions, metrics.ctr
      FROM ad_group
      WHERE campaign.id = ${campaignId}
        AND segments.date BETWEEN '${startDate}' AND '${endDate}'
    `;

    const rows = await queryGoogleAds(accessToken, customerId, query);

    const groupMap = new Map<string, any>();
    for (const row of rows) {
      const id = row.adGroup.resourceName.split('/').pop();
      if (!groupMap.has(id)) {
        groupMap.set(id, { id, name: row.adGroup.name, status: row.adGroup.status, costMicros: 0, impressions: 0, clicks: 0, conversions: 0 });
      }
      const g = groupMap.get(id)!;
      g.costMicros += parseInt(row.metrics.costMicros || '0', 10);
      g.impressions += parseInt(row.metrics.impressions || '0', 10);
      g.clicks += parseInt(row.metrics.clicks || '0', 10);
      g.conversions += parseFloat(row.metrics.conversions || '0');
    }

    const adGroups = Array.from(groupMap.values()).map((g) => {
      const spend = g.costMicros / 1_000_000;
      return {
        id: g.id, name: g.name, status: g.status, spend,
        impressions: g.impressions, clicks: g.clicks, conversions: g.conversions,
        ctr: g.impressions > 0 ? (g.clicks / g.impressions) * 100 : 0,
        cpl: g.conversions > 0 ? spend / g.conversions : 0,
        previewUrl: `https://ads.google.com/aw/adgroups?campaignId=${campaignId}`,
      };
    });

    await setCachedData(supabase, cacheKey, adGroups);

    return new Response(JSON.stringify({ success: true, adGroups, campaignId, fromCache: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error:", msg);
    return new Response(JSON.stringify({ success: false, error: msg, adGroups: [] }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
