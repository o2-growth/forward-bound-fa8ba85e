import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdData } from '@/components/planning/marketing-indicators/types';

interface MetaInsights {
  spend?: string;
  impressions?: string;
  clicks?: string;
  actions?: Array<{ action_type: string; value: string }>;
  reach?: string;
  frequency?: string;
  ctr?: string;
}

interface MetaAd {
  id: string;
  name: string;
  status: string;
  insights?: MetaInsights | null;
  thumbnailUrl?: string;
  previewUrl?: string;
}

interface MetaAdsResponse {
  success: boolean;
  ads: MetaAd[];
  adSetId: string;
  error?: string;
}

function parseMetaStatus(status: string): 'active' | 'paused' | 'ended' {
  switch (status.toUpperCase()) {
    case 'ACTIVE': return 'active';
    case 'PAUSED': return 'paused';
    default: return 'ended';
  }
}

function getLeadsFromActions(actions?: Array<{ action_type: string; value: string }>): number {
  if (!actions) return 0;
  const leadAction = actions.find(a =>
    a.action_type === 'lead' ||
    a.action_type === 'onsite_conversion.lead_grouped' ||
    a.action_type === 'offsite_conversion.fb_pixel_lead'
  );
  return leadAction ? parseInt(leadAction.value, 10) || 0 : 0;
}

function transformAd(ad: MetaAd): AdData {
  const spend = parseFloat(ad.insights?.spend || '0');
  const leads = getLeadsFromActions(ad.insights?.actions);
  
  return {
    id: ad.id,
    name: ad.name,
    status: parseMetaStatus(ad.status),
    spend,
    impressions: parseInt(ad.insights?.impressions || '0', 10),
    clicks: parseInt(ad.insights?.clicks || '0', 10),
    leads,
    cpl: leads > 0 ? spend / leads : 0,
    ctr: parseFloat(ad.insights?.ctr || '0'),
    reach: parseInt(ad.insights?.reach || '0', 10),
    frequency: parseFloat(ad.insights?.frequency || '0'),
    cpa: leads > 0 ? spend / leads : 0,
    thumbnailUrl: ad.thumbnailUrl,
    previewUrl: ad.previewUrl,
  };
}

export function useAdSetAds(
  adSetId: string | null,
  startDate: Date,
  endDate: Date,
  enabled = true
) {
  return useQuery({
    queryKey: ['adset-ads', adSetId, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]],
    queryFn: async (): Promise<AdData[]> => {
      if (!adSetId) return [];
      
      const { data, error } = await supabase.functions.invoke<MetaAdsResponse>('fetch-adset-ads', {
        body: {
          adSetId,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        },
      });
      
      if (error) throw error;
      
      if (!data?.success) {
        const errorMsg = data?.error || 'Erro ao buscar anúncios';
        if (errorMsg.includes('request limit') || errorMsg.includes('rate limit')) {
          throw new Error('RATE_LIMIT');
        }
        throw new Error(errorMsg);
      }
      
      return data.ads.map(transformAd);
    },
    enabled: enabled && !!adSetId,
    staleTime: 10 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message === 'RATE_LIMIT') {
        return failureCount < 3;
      }
      return failureCount < 1;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
