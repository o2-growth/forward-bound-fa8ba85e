import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const META_API_VERSION = "v21.0";
const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;
const CACHE_TTL_MINUTES = 60;

interface MetaAdSet {
  id: string;
  name: string;
  status: string;
  daily_budget?: string;
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

// Check cache for existing data (optionally include stale data)
async function getCachedData(supabase: any, cacheKey: string, includeStale = false) {
  try {
    let query = supabase
      .from('meta_ads_cache')
      .select('data, expires_at')
      .eq('cache_key', cacheKey);
    
    if (!includeStale) {
      query = query.gt('expires_at', new Date().toISOString());
    }
    
    const { data, error } = await query.single();
    
    if (error || !data) return null;
    return { 
      data: data.data, 
      isStale: new Date(data.expires_at) < new Date() 
    };
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

// Fetch ad sets using Meta Batch API to reduce API calls
async function fetchAdSetsWithBatchAPI(
  campaignId: string, 
  startDate: string, 
  endDate: string, 
  accessToken: string,
  formattedAccountId: string
): Promise<any[]> {
  // First, fetch the list of ad sets for this campaign (1 API call)
  const adSetsUrl = `${META_BASE_URL}/${campaignId}/adsets?fields=id,name,status,daily_budget&access_token=${accessToken}`;
  const adSetsResponse = await fetch(adSetsUrl);
  const adSetsData = await adSetsResponse.json();
  
  if (adSetsData.error) {
    console.error("Meta API error fetching ad sets:", adSetsData.error);
    throw new Error(adSetsData.error.message || "Erro ao buscar ad sets");
  }

  const adSets = adSetsData.data || [];
  console.log(`Found ${adSets.length} ad sets for campaign ${campaignId}`);

  if (adSets.length === 0) {
    return [];
  }

  // Build batch request for insights and thumbnails
  const timeRange = JSON.stringify({ since: startDate, until: endDate });
  const insightsFields = "spend,impressions,clicks,actions,cpc,cpm,reach,frequency,ctr";
  
  const batchRequests = adSets.flatMap((adSet: MetaAdSet) => [
    {
      method: "GET",
      relative_url: `${adSet.id}/insights?fields=${insightsFields}&time_range=${encodeURIComponent(timeRange)}`,
    },
    {
      method: "GET",
      relative_url: `${adSet.id}/ads?fields=creative{thumbnail_url,image_url}&limit=1`,
    },
  ]);

  // Execute batch request (1 API call for all insights + thumbnails)
  const batchUrl = `${META_BASE_URL}?access_token=${accessToken}`;
  const batchResponse = await fetch(batchUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ batch: batchRequests }),
  });

  const batchResults: BatchResponse[] = await batchResponse.json();
  console.log(`Batch API returned ${batchResults.length} responses`);

  // Process batch results
  const enrichedAdSets = adSets.map((adSet: MetaAdSet, index: number) => {
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
        console.error(`Error parsing insights for ad set ${adSet.id}`);
      }
    }

    // Parse thumbnail response
    if (batchResults[adsIndex]?.code === 200) {
      try {
        const adsBody = JSON.parse(batchResults[adsIndex].body);
        const firstAd = adsBody.data?.[0];
        thumbnailUrl = firstAd?.creative?.thumbnail_url || firstAd?.creative?.image_url || null;
      } catch {
        console.error(`Error parsing thumbnail for ad set ${adSet.id}`);
      }
    }

    return {
      ...adSet,
      insights,
      thumbnailUrl,
      previewUrl: `https://www.facebook.com/adsmanager/manage/adsets?act=${formattedAccountId.replace('act_', '')}&selected_adset_ids=${adSet.id}`,
    };
  });

  return enrichedAdSets;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const accessToken = Deno.env.get("META_ACCESS_TOKEN");
    const adAccountId = Deno.env.get("META_AD_ACCOUNT_ID");
    
    if (!accessToken || !adAccountId) {
      throw new Error("META_ACCESS_TOKEN ou META_AD_ACCOUNT_ID não configurados");
    }

    const body = await req.json();
    const { campaignId, startDate, endDate } = body;

    if (!campaignId) {
      throw new Error("campaignId é obrigatório");
    }

    console.log("Fetching ad sets for campaign:", { campaignId, startDate, endDate });

    const formattedAccountId = adAccountId.startsWith('act_') 
      ? adAccountId 
      : `act_${adAccountId}`;

    // Initialize Supabase client
    const supabase = getSupabaseClient();

    // Check cache first
    const cacheKey = `adsets:${campaignId}:${startDate}:${endDate}`;
    const cachedResult = await getCachedData(supabase, cacheKey, true);

    if (cachedResult && !cachedResult.isStale) {
      console.log(`Cache HIT for ${cacheKey}`);
      return new Response(JSON.stringify({ 
        success: true, 
        adSets: cachedResult.data,
        campaignId,
        fromCache: true,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Cache ${cachedResult?.isStale ? 'STALE' : 'MISS'} for ${cacheKey}, fetching from Meta API`);

    // Try to fetch fresh data
    try {
      const adSetsWithInsights = await fetchAdSetsWithBatchAPI(
        campaignId, 
        startDate, 
        endDate, 
        accessToken, 
        formattedAccountId
      );

      // Save to cache
      await setCachedData(supabase, cacheKey, adSetsWithInsights);

      console.log(`Successfully fetched and cached ${adSetsWithInsights.length} ad sets`);

      return new Response(JSON.stringify({ 
        success: true, 
        adSets: adSetsWithInsights,
        campaignId,
        fromCache: false,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (fetchError) {
      const errorMsg = fetchError instanceof Error ? fetchError.message : 'Unknown error';
      
      // If rate limited and we have stale cache, return it
      if (errorMsg.includes('request limit') || errorMsg.includes('rate limit')) {
        if (cachedResult?.data) {
          console.log(`Rate limited, returning stale cache for ${cacheKey}`);
          return new Response(JSON.stringify({ 
            success: true, 
            adSets: cachedResult.data,
            campaignId,
            fromCache: true,
            stale: true,
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
      
      throw fetchError;
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error fetching ad sets:", errorMessage);
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage,
      adSets: [],
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
