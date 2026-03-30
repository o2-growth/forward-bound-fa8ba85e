import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface GoogleKeyword {
  text: string;
  matchType: string;
  status: string;
  adGroupName: string;
  campaignName: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpl: number;
}

interface GoogleKeywordsResponse {
  success: boolean;
  keywords: GoogleKeyword[];
  error?: string;
}

export function useGoogleKeywords(
  params: { campaignId?: string | null; adGroupId?: string | null },
  startDate: Date,
  endDate: Date,
  enabled = true
) {
  const id = params.campaignId || params.adGroupId;
  const type = params.campaignId ? 'campaign' : 'adgroup';

  return useQuery({
    queryKey: ['google-keywords', type, id, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]],
    queryFn: async (): Promise<GoogleKeyword[]> => {
      if (!id) return [];

      const body: Record<string, string> = {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      };
      if (params.campaignId) body.campaignId = params.campaignId;
      if (params.adGroupId) body.adGroupId = params.adGroupId;

      const { data, error } = await supabase.functions.invoke<GoogleKeywordsResponse>('fetch-google-keywords', { body });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro ao buscar palavras-chave');

      return data.keywords;
    },
    enabled: enabled && !!id,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
}
