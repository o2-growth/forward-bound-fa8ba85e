import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CampaignData } from '@/components/planning/marketing-indicators/types';

interface GoogleCampaign {
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

interface GoogleCampaignsResponse {
  success: boolean;
  campaigns: GoogleCampaign[];
  error?: string;
}

function parseGoogleStatus(status: string): 'active' | 'paused' | 'ended' {
  switch (status) {
    case 'ENABLED': return 'active';
    case 'PAUSED': return 'paused';
    default: return 'ended';
  }
}

function transformCampaign(c: GoogleCampaign): CampaignData {
  return {
    id: `google_${c.id}`,
    name: c.name,
    channel: 'Google Ads',
    status: parseGoogleStatus(c.status),
    investment: c.spend,
    leads: Math.round(c.conversions),
    mqls: 0,
    roas: 0,
    startDate: new Date().toISOString(),
    impressions: c.impressions,
    clicks: c.clicks,
    cpl: c.cpl,
    ctr: c.ctr,
    cpa: c.conversions > 0 ? c.spend / c.conversions : 0,
    conversions: Math.round(c.conversions),
    previewUrl: c.previewUrl,
    // Store raw Google ID for drill-down
    _googleId: c.id,
  } as CampaignData & { _googleId: string };
}

export function useGoogleCampaigns(startDate: Date, endDate: Date, enabled = true) {
  return useQuery({
    queryKey: ['google-campaigns', startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]],
    queryFn: async (): Promise<CampaignData[]> => {
      console.log('Fetching Google Ads campaigns:', { startDate, endDate });

      const { data, error } = await supabase.functions.invoke<GoogleCampaignsResponse>('fetch-google-campaigns', {
        body: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        },
      });

      if (error) {
        console.error('Error invoking fetch-google-campaigns:', error);
        throw error;
      }

      if (!data?.success) {
        console.error('Google Ads API error:', data?.error);
        throw new Error(data?.error || 'Erro ao buscar campanhas do Google Ads');
      }

      console.log(`Received ${data.campaigns.length} campaigns from Google Ads`);
      return data.campaigns.map(transformCampaign);
    },
    enabled,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
}
