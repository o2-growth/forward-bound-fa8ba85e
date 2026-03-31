import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FunnelMeta {
  id: string;
  bu: string;
  month: string;
  year: number;
  leads: number;
  mqls: number;
  rms: number;
  rrs: number;
  propostas: number;
  vendas: number;
  created_at: string;
  updated_at: string;
}

export interface FunnelMetaUpsert {
  bu: string;
  month: string;
  year?: number;
  leads: number;
  mqls: number;
  rms: number;
  rrs: number;
  propostas: number;
  vendas: number;
}

export function useFunnelMetas(year = 2026) {
  const queryClient = useQueryClient();

  const { data: funnelMetas = [], isLoading } = useQuery({
    queryKey: ['funnel-metas', year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('funnel_metas')
        .select('*')
        .eq('year', year)
        .order('bu')
        .order('month');
      
      if (error) throw error;
      return (data || []) as FunnelMeta[];
    },
  });

  // Get funnel metas for a specific BU
  const getFunnelForBU = (bu: string): FunnelMeta[] => {
    return funnelMetas.filter(m => m.bu === bu);
  };

  // Check if a BU has funnel metas
  const hasFunnelForBU = (bu: string): boolean => {
    return funnelMetas.some(m => m.bu === bu && (m.mqls > 0 || m.vendas > 0));
  };

  // Bulk upsert funnel metas
  const bulkUpsert = useMutation({
    mutationFn: async (items: FunnelMetaUpsert[]) => {
      const upsertData = items.map(item => ({
        bu: item.bu,
        month: item.month,
        year: item.year || year,
        leads: item.leads,
        mqls: item.mqls,
        rms: item.rms,
        rrs: item.rrs,
        propostas: item.propostas,
        vendas: item.vendas,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('funnel_metas')
        .upsert(upsertData, {
          onConflict: 'bu,month,year',
          ignoreDuplicates: false,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funnel-metas', year] });
    },
  });

  return {
    funnelMetas,
    isLoading,
    getFunnelForBU,
    hasFunnelForBU,
    bulkUpsert,
  };
}
