import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdData } from '@/components/planning/marketing-indicators/types';

interface GoogleAd {
  id: string;
  name: string;
  status: string;
  type?: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpl: number;
}

interface GoogleAdsResponse {
  success: boolean;
  ads: GoogleAd[];
  error?: string;
}

function parseStatus(status: string): 'active' | 'paused' | 'ended' {
  switch (status) {
    case 'ENABLED': return 'active';
    case 'PAUSED': return 'paused';
    default: return 'ended';
  }
}

function transformAd(a: GoogleAd): AdData {
  return {
    id: a.id,
    name: a.name,
    status: parseStatus(a.status),
    spend: a.spend,
    impressions: a.impressions,
    clicks: a.clicks,
    leads: Math.round(a.conversions),
    cpl: a.cpl,
    ctr: a.ctr,
    reach: 0,
    frequency: 0,
    cpa: a.conversions > 0 ? a.spend / a.conversions : 0,
  };
}

export function useGoogleAds(
  adGroupId: string | null,
  startDate: Date,
  endDate: Date,
  enabled = true
) {
  return useQuery({
    queryKey: ['google-ads', adGroupId, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]],
    queryFn: async (): Promise<AdData[]> => {
      if (!adGroupId) return [];

      const { data, error } = await supabase.functions.invoke<GoogleAdsResponse>('fetch-google-ads', {
        body: {
          adGroupId,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro ao buscar anúncios');

      return data.ads.map(transformAd);
    },
    enabled: enabled && !!adGroupId,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
}
