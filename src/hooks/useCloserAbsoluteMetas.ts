import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CloserAbsoluteMeta {
  id: string;
  closer: string;
  month: string;
  year: number;
  rm_meta: number;
  rr_meta: number;
  prop_meta: number;
  venda_meta: number;
}

export const CLOSER_ABS_MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'] as const;
export const CLOSERS_ABS = ['Pedro Albite', 'Daniel Trindade', 'Lucas Ilha', 'Thiago', 'Amanda Serafim', 'Bruna'] as const;

export function useCloserAbsoluteMetas(year: number = 2026) {
  const queryClient = useQueryClient();

  const { data: metas, isLoading, error } = useQuery({
    queryKey: ['closer-absolute-metas', year],
    queryFn: async (): Promise<CloserAbsoluteMeta[]> => {
      const { data, error } = await supabase
        .from('closer_absolute_metas' as any)
        .select('*')
        .eq('year', year);
      if (error) {
        console.error('Error fetching closer absolute metas:', error);
        throw error;
      }
      return (data || []) as unknown as CloserAbsoluteMeta[];
    },
    staleTime: 5 * 60 * 1000,
  });

  /** Retorna metas mensais (uma entrada por mês) de um closer (match por primeiro nome normalizado). */
  const getMonthlyMap = (closer: string): {
    rm: Record<string, number>;
    rr: Record<string, number>;
    prop: Record<string, number>;
    venda: Record<string, number>;
  } => {
    const rm: Record<string, number> = {};
    const rr: Record<string, number> = {};
    const prop: Record<string, number> = {};
    const venda: Record<string, number> = {};
    if (!metas) return { rm, rr, prop, venda };
    const target = firstNameKey(closer);
    if (!target) return { rm, rr, prop, venda };
    for (const m of metas) {
      if (firstNameKey(m.closer) !== target) continue;
      const key = `${m.month}-${m.year}`;
      rm[key] = (rm[key] || 0) + (m.rm_meta || 0);
      rr[key] = (rr[key] || 0) + (m.rr_meta || 0);
      prop[key] = (prop[key] || 0) + (m.prop_meta || 0);
      venda[key] = (venda[key] || 0) + (m.venda_meta || 0);
    }
    return { rm, rr, prop, venda };
  };

  const bulkUpdateMetas = useMutation({
    mutationFn: async (updates: Array<{
      closer: string; month: string; rm_meta: number; rr_meta: number; prop_meta: number; venda_meta: number;
    }>) => {
      for (const u of updates) {
        const { error } = await supabase
          .from('closer_absolute_metas' as any)
          .upsert({
            closer: u.closer,
            month: u.month,
            year,
            rm_meta: u.rm_meta,
            rr_meta: u.rr_meta,
            prop_meta: u.prop_meta,
            venda_meta: u.venda_meta,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'closer,month,year' });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['closer-absolute-metas', year] });
    },
  });

  return {
    metas: metas || [],
    isLoading,
    error,
    getMonthlyMap,
    bulkUpdateMetas,
    CLOSERS: CLOSERS_ABS,
    MONTHS: CLOSER_ABS_MONTHS,
  };
}
