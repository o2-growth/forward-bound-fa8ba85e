import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdSetData } from '@/components/planning/marketing-indicators/types';

interface GoogleAdGroup {
  id: string;
  name: string;
  status: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpl: number;
  previewUrl?: string;
}

interface GoogleAdGroupsResponse {
  success: boolean;
  adGroups: GoogleAdGroup[];
  error?: string;
}

function parseStatus(status: string): 'active' | 'paused' | 'ended' {
  switch (status) {
    case 'ENABLED': return 'active';
    case 'PAUSED': return 'paused';
    default: return 'ended';
  }
}

function transformAdGroup(g: GoogleAdGroup): AdSetData {
  return {
    id: g.id,
    name: g.name,
    status: parseStatus(g.status),
    dailyBudget: 0,
    spend: g.spend,
    impressions: g.impressions,
    clicks: g.clicks,
    leads: Math.round(g.conversions),
    cpl: g.cpl,
    ctr: g.ctr,
    cpa: g.conversions > 0 ? g.spend / g.conversions : 0,
    previewUrl: g.previewUrl,
  };
}

export function useGoogleAdGroups(
  campaignId: string | null,
  startDate: Date,
  endDate: Date,
  enabled = true
) {
  return useQuery({
    queryKey: ['google-adgroups', campaignId, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]],
    queryFn: async (): Promise<AdSetData[]> => {
      if (!campaignId) return [];

      const { data, error } = await supabase.functions.invoke<GoogleAdGroupsResponse>('fetch-google-adgroups', {
        body: {
          campaignId,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro ao buscar grupos de anúncio');

      return data.adGroups.map(transformAdGroup);
    },
    enabled: enabled && !!campaignId,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
}
