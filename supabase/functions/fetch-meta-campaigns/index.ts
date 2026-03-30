import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const META_API_VERSION = "v21.0";
const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;
const CACHE_TTL_MINUTES = 60;
const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 300;

interface MetaCampaign {
  id: string;
  name: string;
  status: string;
  objective?: string;
  daily_budget?: string;
  lifetime_budget?: string;
}

interface BatchResponse {
  code: number;
  body: string;
}

// Initialize Supabase client with service role for cache operations
function getSupabaseClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

// Check cache for existing data
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
  } catch {
    return null;
  }
}

// Save data to cache
async function setCachedData(supabase: any, cacheKey: string, data: any) {
  const expiresAt = new Date(Date.now() + CACHE_TTL_MINUTES * 60 * 1000);
  
  try {
    await supabase
      .from('meta_ads_cache')
      .upsert({
        cache_key: cacheKey,
        data,
        fetched_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      }, { onConflict: 'cache_key' });
  } catch (err) {
    console.error("Error saving to cache:", err);
  }
}

// Process campaigns in batches with delay to avoid rate limiting
async function enrichCampaignsWithBatchAPI(
  campaigns: MetaCampaign[],
  startDate: string,
  endDate: string,
  accessToken: string,
  formattedAccountId: string
): Promise<any[]> {
  const timeRange = JSON.stringify({ since: startDate, until: endDate });
  const insightsFields = "spend,impressions,clicks,actions,cpc,cpm,reach,frequency,ctr";
  const enrichedCampaigns: any[] = [];

  // Process in batches
  for (let i = 0; i < campaigns.length; i += BATCH_SIZE) {
    const batch = campaigns.slice(i, i + BATCH_SIZE);
    
    // Build batch request for this group
    const batchRequests = batch.flatMap((campaign: MetaCampaign) => [
      {
        method: "GET",
        relative_url: `${campaign.id}/insights?fields=${insightsFields}&time_range=${encodeURIComponent(timeRange)}`,
      },
      {
        method: "GET",
        relative_url: `${campaign.id}/ads?fields=creative{thumbnail_url,image_url}&limit=1`,
      },
    ]);

    // Execute batch request
    const batchUrl = `${META_BASE_URL}?access_token=${accessToken}`;
    const batchResponse = await fetch(batchUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ batch: batchRequests }),
    });

    const batchResults: BatchResponse[] = await batchResponse.json();

    // Process batch results
    batch.forEach((campaign: MetaCampaign, index: number) => {
      const insightsIndex = index * 2;
      const adsIndex = index * 2 + 1;

      let insights = null;
      let thumbnailUrl = null;

      // Parse insights response
      if (batchResults[insightsIndex]?.code === 200) {
        try {
          const insightsBody = JSON.parse(batchResults[insightsIndex].body);
          insights = insightsBody.data?.[0] || null;
        } catch {
          console.error(`Error parsing insights for campaign ${campaign.id}`);
        }
      }

      // Parse thumbnail response
      if (batchResults[adsIndex]?.code === 200) {
        try {
          const adsBody = JSON.parse(batchResults[adsIndex].body);
          const firstAd = adsBody.data?.[0];
          thumbnailUrl = firstAd?.creative?.thumbnail_url || firstAd?.creative?.image_url || null;
        } catch {
          console.error(`Error parsing thumbnail for campaign ${campaign.id}`);
        }
      }

      enrichedCampaigns.push({
        ...campaign,
        insights,
        adSets: [], // Ad sets fetched on-demand via fetch-campaign-adsets
        thumbnailUrl,
        previewUrl: `https://www.facebook.com/adsmanager/manage/campaigns?act=${formattedAccountId.replace('act_', '')}&selected_campaign_ids=${campaign.id}`,
      });
    });

    // Add delay between batches to avoid rate limiting
    if (i + BATCH_SIZE < campaigns.length) {
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  return enrichedCampaigns;
}

// Fetch ALL campaign IDs and names (no status filter) with pagination
async function fetchAllCampaignNames(
  formattedAccountId: string,
  accessToken: string
): Promise<Record<string, string>> {
  const names: Record<string, string> = {};
  let url = `${META_BASE_URL}/${formattedAccountId}/campaigns?fields=id,name&limit=100&access_token=${accessToken}`;

  while (url) {
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.error("Meta API error (resolve-names):", data.error);
      throw new Error(data.error.message || "Erro ao buscar nomes de campanhas");
    }

    for (const campaign of (data.data || [])) {
      names[campaign.id] = campaign.name;
    }

    // Follow pagination cursor
    url = data.paging?.next || "";
  }

  return names;
}

const NAMES_CACHE_TTL_MINUTES = 60 * 24; // 24 hours

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const accessToken = Deno.env.get("META_ACCESS_TOKEN");
    const adAccountId = Deno.env.get("META_AD_ACCOUNT_ID");
    
    if (!accessToken || !adAccountId) {
      console.error("Missing credentials:", { 
        hasToken: !!accessToken, 
        hasAccountId: !!adAccountId 
      });
      throw new Error("META_ACCESS_TOKEN ou META_AD_ACCOUNT_ID não configurados");
    }

    const body = await req.json();
    const { startDate, endDate, action } = body;

    // Ensure ad account ID has proper format
    const formattedAccountId = adAccountId.startsWith('act_') 
      ? adAccountId 
      : `act_${adAccountId}`;

    // Initialize Supabase client
    const supabase = getSupabaseClient();

    // ── ACTION: resolve-names (lightweight, no enrichment) ──
    if (action === "resolve-names") {
      const cacheKey = `campaign-names:${formattedAccountId}`;
      const cachedNames = await getCachedData(supabase, cacheKey);

      if (cachedNames) {
        console.log(`Campaign names cache HIT (${Object.keys(cachedNames).length} entries)`);
        return new Response(JSON.stringify({ success: true, campaignNames: cachedNames }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log("Campaign names cache MISS, fetching all from Meta API");
      const campaignNames = await fetchAllCampaignNames(formattedAccountId, accessToken);

      // Cache with 24h TTL
      const expiresAt = new Date(Date.now() + NAMES_CACHE_TTL_MINUTES * 60 * 1000);
      try {
        await supabase.from('meta_ads_cache').upsert({
          cache_key: cacheKey,
          data: campaignNames,
          fetched_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
        }, { onConflict: 'cache_key' });
      } catch (err) {
        console.error("Error caching campaign names:", err);
      }

      console.log(`Resolved ${Object.keys(campaignNames).length} campaign names`);
      return new Response(JSON.stringify({ success: true, campaignNames }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── DEFAULT ACTION: fetch campaigns with enrichment (ACTIVE+PAUSED) ──
    console.log("Fetching Meta campaigns:", { startDate, endDate, adAccountId });

    // Check cache first
    const cacheKey = `campaigns:${formattedAccountId}:${startDate}:${endDate}`;
    const cachedData = await getCachedData(supabase, cacheKey);

    if (cachedData) {
      console.log(`Cache HIT for ${cacheKey}`);
      return new Response(JSON.stringify({ 
        success: true, 
        campaigns: cachedData,
        dateRange: { startDate, endDate },
        totalCampaigns: cachedData.length,
        fromCache: true,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Cache MISS for ${cacheKey}, fetching from Meta API`);

    // Fetch campaigns with filtering for active/paused
    const campaignFields = [
      "id", "name", "status", "objective", "daily_budget", "lifetime_budget"
    ].join(",");
    
    const filterJson = JSON.stringify([{
      field: "effective_status",
      operator: "IN",
      value: ["ACTIVE", "PAUSED"]
    }]);
    
    const campaignsUrl = `${META_BASE_URL}/${formattedAccountId}/campaigns?fields=${campaignFields}&filtering=${encodeURIComponent(filterJson)}&access_token=${accessToken}`;
    
    console.log("Fetching campaigns from Meta API");
    
    const campaignsResponse = await fetch(campaignsUrl);
    const campaignsData = await campaignsResponse.json();
    
    if (campaignsData.error) {
      console.error("Meta API error:", campaignsData.error);
      throw new Error(campaignsData.error.message || "Erro na API do Meta");
    }

    console.log(`Found ${campaignsData.data?.length || 0} campaigns`);

    // Enrich campaigns with insights using batch API
    const enrichedCampaigns = await enrichCampaignsWithBatchAPI(
      campaignsData.data || [],
      startDate,
      endDate,
      accessToken,
      formattedAccountId
    );

    // Save to cache
    await setCachedData(supabase, cacheKey, enrichedCampaigns);

    console.log(`Successfully fetched and cached ${enrichedCampaigns.length} campaigns`);

    return new Response(JSON.stringify({ 
      success: true, 
      campaigns: enrichedCampaigns,
      dateRange: { startDate, endDate },
      totalCampaigns: enrichedCampaigns.length,
      fromCache: false,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error fetching Meta campaigns:", errorMessage);
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage,
      campaigns: [],
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
