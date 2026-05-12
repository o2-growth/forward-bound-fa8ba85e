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
  faturamento_meta?: number;
  faturamento_vender?: number;
  mrr_base_planejamento?: number;
  investimento?: number;
  is_locked?: boolean;
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

  // Check if a specific BU/month is locked (used to freeze accelerator metas
  // for closed months so they don't change when MRR Base or Plan Growth is edited)
  const isMonthLocked = (bu: string, month: string): boolean => {
    return funnelMetas.some(m => m.bu === bu && m.month === month && m.is_locked === true);
  };

  // Returns the locked snapshot (faturamento_meta + mrr_base_planejamento) for a BU/month,
  // or null if not locked or not found.
  const getLockedSnapshot = (bu: string, month: string): { faturamento_meta: number; mrr_base_planejamento: number; faturamento_vender: number } | null => {
    const meta = funnelMetas.find(m => m.bu === bu && m.month === month && m.is_locked === true);
    if (!meta) return null;
    return {
      faturamento_meta: Number(meta.faturamento_meta || 0),
      mrr_base_planejamento: Number(meta.mrr_base_planejamento || 0),
      faturamento_vender: Number(meta.faturamento_vender || 0),
    };
  };

  // Lock months: upserts a snapshot with is_locked=true (includes monetary fields)
  const lockMonths = useMutation({
    mutationFn: async (
      items: Array<{
        bu: string;
        month: string;
        year?: number;
        leads: number;
        mqls: number;
        rms: number;
        rrs: number;
        propostas: number;
        vendas: number;
        faturamento_meta?: number;
        faturamento_vender?: number;
        mrr_base_planejamento?: number;
        investimento?: number;
      }>
    ) => {
      if (items.length === 0) return;
      const upsertData = items.map(item => ({
        bu: item.bu,
        month: item.month,
        year: item.year || year,
        leads: Math.round(item.leads || 0),
        mqls: Math.round(item.mqls || 0),
        rms: Math.round(item.rms || 0),
        rrs: Math.round(item.rrs || 0),
        propostas: Math.round(item.propostas || 0),
        vendas: Math.round(item.vendas || 0),
        faturamento_meta: item.faturamento_meta ?? 0,
        faturamento_vender: item.faturamento_vender ?? 0,
        mrr_base_planejamento: item.mrr_base_planejamento ?? 0,
        investimento: item.investimento ?? 0,
        is_locked: true,
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

  // Bulk upsert funnel metas
  // Defense-in-depth: filters out months that are is_locked=true so callers
  // cannot accidentally overwrite frozen accelerator metas.
  const bulkUpsert = useMutation({
    mutationFn: async (items: FunnelMetaUpsert[]) => {
      const lockedSet = new Set(
        funnelMetas
          .filter(m => m.is_locked === true)
          .map(m => `${m.bu}__${m.month}__${m.year}`)
      );
      const filtered = items.filter(
        i => !lockedSet.has(`${i.bu}__${i.month}__${i.year ?? year}`)
      );
      if (filtered.length === 0) return;
      const upsertData = filtered.map(item => ({
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
    isMonthLocked,
    getLockedSnapshot,
    bulkUpsert,
    lockMonths,
  };
}
