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
    const { adGroupId, startDate, endDate } = await req.json();
    if (!adGroupId) throw new Error("adGroupId é obrigatório");

    const supabase = getSupabaseClient();
    const cacheKey = `google:ads:${adGroupId}:${startDate}:${endDate}`;
    const cached = await getCachedData(supabase, cacheKey);
    if (cached && !cached.isStale) {
      return new Response(JSON.stringify({ success: true, ads: cached.data, adGroupId, fromCache: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = await getAccessToken();
    const query = `
      SELECT ad_group_ad.ad.id, ad_group_ad.ad.name, ad_group_ad.ad.type,
             ad_group_ad.status, ad_group_ad.ad.final_urls,
             metrics.cost_micros, metrics.impressions, metrics.clicks,
             metrics.conversions, metrics.ctr
      FROM ad_group_ad
      WHERE ad_group.id = ${adGroupId}
        AND segments.date BETWEEN '${startDate}' AND '${endDate}'
    `;

    const rows = await queryGoogleAds(accessToken, customerId, query);

    const adMap = new Map<string, any>();
    for (const row of rows) {
      const id = row.adGroupAd.ad.id;
      if (!adMap.has(id)) {
        const adName = row.adGroupAd.ad.name || 
          (row.adGroupAd.ad.finalUrls?.length ? row.adGroupAd.ad.finalUrls[0] : `Ad ${id}`);
        adMap.set(id, {
          id, name: adName, status: row.adGroupAd.status,
          type: row.adGroupAd.ad.type,
          costMicros: 0, impressions: 0, clicks: 0, conversions: 0,
        });
      }
      const a = adMap.get(id)!;
      a.costMicros += parseInt(row.metrics.costMicros || '0', 10);
      a.impressions += parseInt(row.metrics.impressions || '0', 10);
      a.clicks += parseInt(row.metrics.clicks || '0', 10);
      a.conversions += parseFloat(row.metrics.conversions || '0');
    }

    const ads = Array.from(adMap.values()).map((a) => {
      const spend = a.costMicros / 1_000_000;
      return {
        id: a.id, name: a.name, status: a.status, type: a.type, spend,
        impressions: a.impressions, clicks: a.clicks, conversions: a.conversions,
        ctr: a.impressions > 0 ? (a.clicks / a.impressions) * 100 : 0,
        cpl: a.conversions > 0 ? spend / a.conversions : 0,
      };
    });

    await setCachedData(supabase, cacheKey, ads);

    return new Response(JSON.stringify({ success: true, ads, adGroupId, fromCache: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error:", msg);
    return new Response(JSON.stringify({ success: false, error: msg, ads: [] }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
