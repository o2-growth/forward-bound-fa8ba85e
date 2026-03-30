import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CampaignData, AdSetData } from '@/components/planning/marketing-indicators/types';

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
}

interface MetaCampaign {
  id: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED';
  objective?: string;
  daily_budget?: string;
  lifetime_budget?: string;
  insights?: MetaInsights | null;
  adSets?: MetaAdSet[];
  thumbnailUrl?: string;
  previewUrl?: string;
}

interface MetaApiResponse {
  success: boolean;
  campaigns: MetaCampaign[];
  dateRange: { startDate: string; endDate: string };
  totalCampaigns: number;
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
  
  // Look for lead-related actions
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
  
  return {
    id: adSet.id,
    name: adSet.name,
    status: parseMetaStatus(adSet.status),
    dailyBudget: parseFloat(adSet.daily_budget || '0') / 100, // Meta returns in cents
    spend,
    impressions: parseInt(adSet.insights?.impressions || '0', 10),
    clicks: parseInt(adSet.insights?.clicks || '0', 10),
    leads,
    cpl: leads > 0 ? spend / leads : 0,
    previewUrl: adSet.previewUrl,
  };
}

function getConversionsFromActions(actions?: Array<{ action_type: string; value: string }>): number {
  if (!actions) return 0;
  const convAction = actions.find(a =>
    a.action_type === 'offsite_conversion' ||
    a.action_type === 'lead' ||
    a.action_type === 'onsite_conversion.lead_grouped' ||
    a.action_type === 'offsite_conversion.fb_pixel_lead'
  );
  return convAction ? parseInt(convAction.value, 10) || 0 : 0;
}

function transformCampaign(campaign: MetaCampaign): CampaignData {
  const spend = parseFloat(campaign.insights?.spend || '0');
  const leads = getLeadsFromActions(campaign.insights?.actions);
  const conversions = getConversionsFromActions(campaign.insights?.actions);
  const adSets = campaign.adSets?.map(transformAdSet) || [];
  const reach = parseInt(campaign.insights?.reach || '0', 10);
  const frequency = parseFloat(campaign.insights?.frequency || '0');
  const ctr = parseFloat(campaign.insights?.ctr || '0');
  
  return {
    id: campaign.id,
    name: campaign.name,
    channel: 'Meta Ads',
    status: parseMetaStatus(campaign.status),
    investment: spend,
    leads,
    mqls: 0,
    roas: 0,
    startDate: new Date().toISOString(),
    objective: campaign.objective,
    impressions: parseInt(campaign.insights?.impressions || '0', 10),
    clicks: parseInt(campaign.insights?.clicks || '0', 10),
    cpl: leads > 0 ? spend / leads : 0,
    ctr,
    reach,
    frequency,
    cpa: conversions > 0 ? spend / conversions : 0,
    conversions,
    adSets,
    thumbnailUrl: campaign.thumbnailUrl,
    previewUrl: campaign.previewUrl,
  };
}

export function useMetaCampaigns(startDate: Date, endDate: Date, enabled = true) {
  return useQuery({
    queryKey: ['meta-campaigns', startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]],
    queryFn: async (): Promise<CampaignData[]> => {
      console.log('Fetching Meta campaigns:', { startDate, endDate });
      
      const { data, error } = await supabase.functions.invoke<MetaApiResponse>('fetch-meta-campaigns', {
        body: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        },
      });
      
      if (error) {
        console.error('Error invoking fetch-meta-campaigns:', error);
        throw error;
      }
      
      if (!data?.success) {
        console.error('Meta API returned error:', data?.error);
        throw new Error(data?.error || 'Erro ao buscar campanhas do Meta');
      }
      
      console.log(`Received ${data.campaigns.length} campaigns from Meta`);
      
      return data.campaigns.map(transformCampaign);
    },
    enabled,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
  });
}

/**
 * Lightweight hook to resolve ALL campaign IDs → names (including archived/deleted).
 * Uses 24h cache. No metrics/enrichment — just id and name.
 */
export function useMetaCampaignNames(enabled = true) {
  return useQuery({
    queryKey: ['meta-campaign-names'],
    queryFn: async (): Promise<Map<string, string>> => {
      console.log('Resolving Meta campaign names (all statuses)');
      
      const { data, error } = await supabase.functions.invoke<{ success: boolean; campaignNames: Record<string, string>; error?: string }>('fetch-meta-campaigns', {
        body: { action: 'resolve-names' },
      });
      
      if (error) {
        console.error('Error resolving campaign names:', error);
        throw error;
      }
      
      if (!data?.success) {
        throw new Error(data?.error || 'Erro ao resolver nomes de campanhas');
      }
      
      const map = new Map(Object.entries(data.campaignNames));
      console.log(`Resolved ${map.size} campaign names`);
      return map;
    },
    enabled,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    retry: 1,
  });
}
