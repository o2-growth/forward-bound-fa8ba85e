import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MarketingSheetData {
  // Channel data
  midiaGoogle: number;
  leadsGoogle: number;
  cplGoogle: number;
  midiaMeta: number;
  leadsMeta: number;
  cplMeta: number;
  
  // Totals
  midiaTotal: number;
  leadsTotais: number;
  cplTotal: number;
  
  // Funnel
  mqlPorFaturamento: number;
  cpmqlPorFaturamento: number;
  reuniaoMarcada: number;
  cprm: number;
  reuniaoRealizada: number;
  cprr: number;
  propostaEnviada: number;
  cpp: number;
  vendas: number;
  cpv: number;
  
  // Revenue
  mrr: number;
  setup: number;
  pontual: number;
  educacao: number;
  gmv: number;
  
  // Performance
  cac: number;
  ltv: number;
  tcv: number;
  roas: number;
  roasLtv: number;
  roiLtv: number;
  ltvCac: number;
  
  // Meta
  period: {
    startDate: string;
    endDate: string;
  };
  monthsIncluded: number;
}

interface UseMarketingSheetDataParams {
  startDate: Date;
  endDate: Date;
  enabled?: boolean;
}

interface UseMarketingSheetDataResult {
  data: MarketingSheetData | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook to fetch marketing data from Google Sheets via Edge Function.
 * Uses TanStack Query for caching and state management.
 */
export function useMarketingSheetData({
  startDate,
  endDate,
  enabled = true,
}: UseMarketingSheetDataParams): UseMarketingSheetDataResult {
  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];
  
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['marketing-sheet', startDateStr, endDateStr],
    queryFn: async (): Promise<MarketingSheetData> => {
      console.log('Fetching marketing sheet data:', { startDateStr, endDateStr });
      
      const { data, error } = await supabase.functions.invoke('read-marketing-sheet', {
        body: { 
          startDate: startDateStr, 
          endDate: endDateStr 
        },
      });
      
      if (error) {
        console.error('Error invoking read-marketing-sheet:', error);
        throw new Error(error.message || 'Failed to fetch marketing data');
      }
      
      if (data?.error) {
        console.error('Edge function returned error:', data.error);
        throw new Error(data.error);
      }
      
      console.log('Marketing sheet data received:', data);
      return data as MarketingSheetData;
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
  
  return {
    data: data ?? null,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
