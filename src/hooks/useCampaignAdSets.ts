import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdSetData } from '@/components/planning/marketing-indicators/types';

interface MetaInsights {
  spend?: string;
  impressions?: string;
  clicks?: string;
  actions?: Array<{ action_type: string; value: string }>;
  cpc?: string;
  cpm?: string;
  reach?: string;
  frequency?: string;
  ctr?: string;
}

interface MetaAdSet {
  id: string;
  name: string;
  status: string;
  daily_budget?: string;
  insights?: MetaInsights | null;
  previewUrl?: string;
  thumbnailUrl?: string;
}

interface MetaAdSetsResponse {
  success: boolean;
  adSets: MetaAdSet[];
  campaignId: string;
  error?: string;
}

function parseMetaStatus(status: string): 'active' | 'paused' | 'ended' {
  switch (status.toUpperCase()) {
    case 'ACTIVE':
      return 'active';
    case 'PAUSED':
      return 'paused';
    default:
      return 'ended';
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

function transformAdSet(adSet: MetaAdSet): AdSetData {
  const spend = parseFloat(adSet.insights?.spend || '0');
  const leads = getLeadsFromActions(adSet.insights?.actions);
  const reach = parseInt(adSet.insights?.reach || '0', 10);
  const frequency = parseFloat(adSet.insights?.frequency || '0');
  const ctr = parseFloat(adSet.insights?.ctr || '0');
  
  return {
    id: adSet.id,
    name: adSet.name,
    status: parseMetaStatus(adSet.status),
    dailyBudget: parseFloat(adSet.daily_budget || '0') / 100,
    spend,
    impressions: parseInt(adSet.insights?.impressions || '0', 10),
    clicks: parseInt(adSet.insights?.clicks || '0', 10),
    leads,
    cpl: leads > 0 ? spend / leads : 0,
    ctr,
    reach,
    frequency,
    cpa: leads > 0 ? spend / leads : 0,
    previewUrl: adSet.previewUrl,
    thumbnailUrl: adSet.thumbnailUrl,
  };
}

export function useCampaignAdSets(
  campaignId: string | null, 
  startDate: Date, 
  endDate: Date, 
  enabled = true
) {
  return useQuery({
    queryKey: ['campaign-adsets', campaignId, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]],
    queryFn: async (): Promise<AdSetData[]> => {
      if (!campaignId) return [];
      
      console.log('Fetching ad sets for campaign:', campaignId);
      
      const { data, error } = await supabase.functions.invoke<MetaAdSetsResponse>('fetch-campaign-adsets', {
        body: {
          campaignId,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        },
      });
      
      if (error) {
        console.error('Error invoking fetch-campaign-adsets:', error);
        throw error;
      }
      
      if (!data?.success) {
        const errorMsg = data?.error || 'Erro ao buscar ad sets';
        console.error('API returned error:', errorMsg);
        
        // Check if it's a rate limit error
        if (errorMsg.includes('request limit') || errorMsg.includes('rate limit')) {
          throw new Error('RATE_LIMIT');
        }
        
        throw new Error(errorMsg);
      }
      
      console.log(`Received ${data.adSets.length} ad sets for campaign ${campaignId}`);
      
      return data.adSets.map(transformAdSet);
    },
    enabled: enabled && !!campaignId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      // Retry rate limit errors with exponential backoff
      if (error instanceof Error && error.message === 'RATE_LIMIT') {
        return failureCount < 3;
      }
      return failureCount < 1;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
