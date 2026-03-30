import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GOOGLE_ADS_API_VERSION = "v22";
const CACHE_TTL_MINUTES = 60;

function getSupabaseClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

async function getCachedData(supabase: any, cacheKey: string) {
  try {
    const { data, error } = await supabase
      .from('meta_ads_cache')
      .select('data')
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
  } catch (err) { console.error("Cache save error:", err); }
}

async function getAccessToken(): Promise<string> {
  const clientId = Deno.env.get("GOOGLE_ADS_CLIENT_ID")!;
  const clientSecret = Deno.env.get("GOOGLE_ADS_CLIENT_SECRET")!;
  const refreshToken = Deno.env.get("GOOGLE_ADS_REFRESH_TOKEN")!;

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const body = await resp.json();
  if (!resp.ok || !body.access_token) {
    console.error("OAuth2 error:", body);
    throw new Error(body.error_description || "Falha na autenticação OAuth2");
  }
  return body.access_token;
}

async function queryGoogleAds(accessToken: string, customerId: string, query: string) {
  const developerToken = Deno.env.get("GOOGLE_ADS_DEVELOPER_TOKEN")!;
  const url = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${customerId}/googleAds:searchStream`;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "developer-token": developerToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });

  const text = await resp.text();
  if (!resp.ok) {
    console.error("Google Ads API error (full):", text);
    throw new Error(`Google Ads API error: ${resp.status} - ${text.substring(0, 500)}`);
  }

  const results = JSON.parse(text);
  // searchStream returns an array of batches
  const rows: any[] = [];
  for (const batch of results) {
    if (batch.results) rows.push(...batch.results);
  }
  return rows;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawCustomerId = Deno.env.get("GOOGLE_ADS_CUSTOMER_ID");
    if (!rawCustomerId) throw new Error("GOOGLE_ADS_CUSTOMER_ID não configurado");
    const customerId = rawCustomerId.replace(/-/g, '');

    const { startDate, endDate } = await req.json();
    console.log("Fetching Google Ads campaigns:", { customerId, startDate, endDate });

    const supabase = getSupabaseClient();
    const cacheKey = `google:campaigns:${customerId}:${startDate}:${endDate}`;
    const cached = await getCachedData(supabase, cacheKey);
    if (cached) {
      console.log(`Cache HIT for ${cacheKey}`);
      return new Response(JSON.stringify({ success: true, campaigns: cached, fromCache: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = await getAccessToken();

    const query = `
      SELECT campaign.id, campaign.name, campaign.status,
             metrics.cost_micros, metrics.impressions, metrics.clicks,
             metrics.conversions, metrics.ctr, metrics.average_cpc
      FROM campaign
      WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
        AND campaign.status IN ('ENABLED', 'PAUSED')
    `;

    const rows = await queryGoogleAds(accessToken, customerId, query);
    console.log(`Google Ads returned ${rows.length} campaign rows`);

    // Aggregate by campaign (rows are per-segment/date)
    const campaignMap = new Map<string, any>();
    for (const row of rows) {
      const id = row.campaign.resourceName.split('/').pop();
      if (!campaignMap.has(id)) {
        campaignMap.set(id, {
          id,
          name: row.campaign.name,
          status: row.campaign.status,
          costMicros: 0,
          impressions: 0,
          clicks: 0,
          conversions: 0,
        });
      }
      const c = campaignMap.get(id)!;
      c.costMicros += parseInt(row.metrics.costMicros || '0', 10);
      c.impressions += parseInt(row.metrics.impressions || '0', 10);
      c.clicks += parseInt(row.metrics.clicks || '0', 10);
      c.conversions += parseFloat(row.metrics.conversions || '0');
    }

    const campaigns = Array.from(campaignMap.values()).map((c) => {
      const spend = c.costMicros / 1_000_000;
      return {
        id: c.id,
        name: c.name,
        status: c.status,
        spend,
        impressions: c.impressions,
        clicks: c.clicks,
        conversions: c.conversions,
        ctr: c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0,
        cpl: c.conversions > 0 ? spend / c.conversions : 0,
        previewUrl: `https://ads.google.com/aw/campaigns?campaignId=${c.id}`,
      };
    });

    await setCachedData(supabase, cacheKey, campaigns);
    console.log(`Cached ${campaigns.length} Google Ads campaigns`);

    return new Response(JSON.stringify({ success: true, campaigns, fromCache: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error:", msg);
    return new Response(JSON.stringify({ success: false, error: msg, campaigns: [] }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
