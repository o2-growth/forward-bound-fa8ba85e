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

async function getCachedData(supabase: any, cacheKey: string) {
  try {
    const { data, error } = await supabase
      .from('meta_ads_cache')
      .select('data, expires_at')
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .single();
    if (error || !data) return null;
    return data.data;
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
  if (!resp.ok) throw new Error(`Google Ads API error: ${resp.status} - ${text.substring(0, 300)}`);
  const results = JSON.parse(text);
  const rows: any[] = [];
  for (const batch of results) { if (batch.results) rows.push(...batch.results); }
  return rows;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const customerId = Deno.env.get("GOOGLE_ADS_CUSTOMER_ID")!;
    const { campaignId, adGroupId, startDate, endDate } = await req.json();
    if (!campaignId && !adGroupId) throw new Error("campaignId ou adGroupId é obrigatório");

    const supabase = getSupabaseClient();
    const filterKey = campaignId ? `campaign:${campaignId}` : `adgroup:${adGroupId}`;
    const cacheKey = `google:keywords:${filterKey}:${startDate}:${endDate}`;

    const cached = await getCachedData(supabase, cacheKey);
    if (cached) {
      return new Response(JSON.stringify({ success: true, keywords: cached, fromCache: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const whereClause = campaignId
      ? `campaign.id = ${campaignId}`
      : `ad_group.id = ${adGroupId}`;

    const accessToken = await getAccessToken();
    const query = `
      SELECT ad_group_criterion.keyword.text,
             ad_group_criterion.keyword.match_type,
             ad_group_criterion.status,
             ad_group.name,
             campaign.name,
             metrics.cost_micros, metrics.impressions, metrics.clicks,
             metrics.conversions, metrics.ctr
      FROM keyword_view
      WHERE ${whereClause}
        AND segments.date BETWEEN '${startDate}' AND '${endDate}'
    `;

    const rows = await queryGoogleAds(accessToken, customerId, query);

    // Aggregate by keyword text + match type
    const kwMap = new Map<string, any>();
    for (const row of rows) {
      const text = row.adGroupCriterion?.keyword?.text || 'unknown';
      const matchType = row.adGroupCriterion?.keyword?.matchType || 'UNSPECIFIED';
      const key = `${text}::${matchType}`;

      if (!kwMap.has(key)) {
        kwMap.set(key, {
          text,
          matchType,
          status: row.adGroupCriterion?.status || 'UNKNOWN',
          adGroupName: row.adGroup?.name || '',
          campaignName: row.campaign?.name || '',
          costMicros: 0, impressions: 0, clicks: 0, conversions: 0,
        });
      }
      const kw = kwMap.get(key)!;
      kw.costMicros += parseInt(row.metrics?.costMicros || '0', 10);
      kw.impressions += parseInt(row.metrics?.impressions || '0', 10);
      kw.clicks += parseInt(row.metrics?.clicks || '0', 10);
      kw.conversions += parseFloat(row.metrics?.conversions || '0');
    }

    const keywords = Array.from(kwMap.values()).map((kw) => {
      const spend = kw.costMicros / 1_000_000;
      return {
        text: kw.text,
        matchType: kw.matchType,
        status: kw.status,
        adGroupName: kw.adGroupName,
        campaignName: kw.campaignName,
        spend,
        impressions: kw.impressions,
        clicks: kw.clicks,
        conversions: kw.conversions,
        ctr: kw.impressions > 0 ? (kw.clicks / kw.impressions) * 100 : 0,
        cpl: kw.conversions > 0 ? spend / kw.conversions : 0,
      };
    });

    await setCachedData(supabase, cacheKey, keywords);

    return new Response(JSON.stringify({ success: true, keywords, fromCache: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error:", msg);
    return new Response(JSON.stringify({ success: false, error: msg, keywords: [] }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
