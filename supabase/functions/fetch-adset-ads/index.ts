import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const META_API_VERSION = "v21.0";
const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;
const CACHE_TTL_MINUTES = 60;

interface MetaAd {
  id: string;
  name: string;
  status: string;
  creative?: {
    thumbnail_url?: string;
    image_url?: string;
  };
}

interface BatchResponse {
  code: number;
  body: string;
}

function getSupabaseClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

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

async function fetchAdsForAdSet(
  adSetId: string,
  startDate: string,
  endDate: string,
  accessToken: string,
  formattedAccountId: string
): Promise<any[]> {
  // Fetch ads for this ad set
  const adsUrl = `${META_BASE_URL}/${adSetId}/ads?fields=id,name,status,creative{thumbnail_url,image_url}&access_token=${accessToken}`;
  const adsResponse = await fetch(adsUrl);
  const adsData = await adsResponse.json();
  
  if (adsData.error) {
    console.error("Meta API error fetching ads:", adsData.error);
    throw new Error(adsData.error.message || "Erro ao buscar anúncios");
  }

  const ads: MetaAd[] = adsData.data || [];
  console.log(`Found ${ads.length} ads for ad set ${adSetId}`);

  if (ads.length === 0) return [];

  // Batch request for insights
  const timeRange = JSON.stringify({ since: startDate, until: endDate });
  const insightsFields = "spend,impressions,clicks,actions,cpc,cpm,reach,frequency,ctr";

  const batchRequests = ads.map((ad: MetaAd) => ({
    method: "GET",
    relative_url: `${ad.id}/insights?fields=${insightsFields}&time_range=${encodeURIComponent(timeRange)}`,
  }));

  const batchUrl = `${META_BASE_URL}?access_token=${accessToken}`;
  const batchResponse = await fetch(batchUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ batch: batchRequests }),
  });

  const batchResults: BatchResponse[] = await batchResponse.json();

  return ads.map((ad: MetaAd, index: number) => {
    let insights = null;

    if (batchResults[index]?.code === 200) {
      try {
        const body = JSON.parse(batchResults[index].body);
        insights = body.data?.[0] || null;
      } catch {
        console.error(`Error parsing insights for ad ${ad.id}`);
      }
    }

    const thumbnailUrl = ad.creative?.thumbnail_url || ad.creative?.image_url || null;

    return {
      id: ad.id,
      name: ad.name,
      status: ad.status,
      insights,
      thumbnailUrl,
      previewUrl: `https://www.facebook.com/adsmanager/manage/ads?act=${formattedAccountId.replace('act_', '')}&selected_ad_ids=${ad.id}`,
    };
  });
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
    const { adSetId, startDate, endDate } = body;

    if (!adSetId) {
      throw new Error("adSetId é obrigatório");
    }

    console.log("Fetching ads for ad set:", { adSetId, startDate, endDate });

    const formattedAccountId = adAccountId.startsWith('act_') 
      ? adAccountId 
      : `act_${adAccountId}`;

    const supabase = getSupabaseClient();

    const cacheKey = `ads:${adSetId}:${startDate}:${endDate}`;
    const cachedResult = await getCachedData(supabase, cacheKey);

    if (cachedResult && !cachedResult.isStale) {
      console.log(`Cache HIT for ${cacheKey}`);
      return new Response(JSON.stringify({ 
        success: true, 
        ads: cachedResult.data,
        adSetId,
        fromCache: true,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    try {
      const enrichedAds = await fetchAdsForAdSet(
        adSetId, startDate, endDate, accessToken, formattedAccountId
      );

      await setCachedData(supabase, cacheKey, enrichedAds);

      return new Response(JSON.stringify({ 
        success: true, 
        ads: enrichedAds,
        adSetId,
        fromCache: false,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (fetchError) {
      const errorMsg = fetchError instanceof Error ? fetchError.message : 'Unknown error';
      
      if (errorMsg.includes('request limit') || errorMsg.includes('rate limit')) {
        const staleResult = await getCachedData(supabase, cacheKey, true);
        if (staleResult?.data) {
          console.log(`Rate limited, returning stale cache for ${cacheKey}`);
          return new Response(JSON.stringify({ 
            success: true, 
            ads: staleResult.data,
            adSetId,
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
    console.error("Error fetching ads:", errorMessage);
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage,
      ads: [],
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
