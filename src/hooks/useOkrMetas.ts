import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OkrMeta {
  id: string;
  kr_key: string;
  label: string;
  target_value: number;
  unit: string; // 'meses' | '%' | 'pontos' | custom
  direction: 'gte' | 'lte';
  period: string;
  year: number;
  quarter: number | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type OkrMetaUpsert = Omit<OkrMeta, 'id' | 'created_at' | 'updated_at'> & { id?: string };

export function useOkrMetas(period?: string) {
  return useQuery({
    queryKey: ['okr-metas', period ?? 'all'],
    queryFn: async () => {
      let q = supabase.from('okr_metas').select('*').order('display_order', { ascending: true });
      if (period) q = q.eq('period', period);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as OkrMeta[];
    },
  });
}

export function useUpsertOkrMeta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: OkrMetaUpsert) => {
      const payload = { ...input, updated_at: new Date().toISOString() };
      const { error } = await supabase
        .from('okr_metas')
        .upsert(payload, { onConflict: 'kr_key,period' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['okr-metas'] }),
  });
}

export function useDeleteOkrMeta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('okr_metas').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['okr-metas'] }),
  });
}
