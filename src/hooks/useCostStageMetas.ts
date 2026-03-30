import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const COST_STAGE_KEYS = ['cpl', 'cpmql', 'cprm', 'cprr', 'cpp', 'cpv'] as const;
export type CostStageKey = typeof COST_STAGE_KEYS[number];

export const COST_STAGE_LABELS: Record<CostStageKey, string> = {
  cpl: 'CPL',
  cpmql: 'CPMQL',
  cprm: 'CPRM',
  cprr: 'CPRR',
  cpp: 'CPP',
  cpv: 'CPV',
};

export interface CostStageMeta {
  id: string;
  month: string;
  year: number;
  cpl: number;
  cpmql: number;
  cprm: number;
  cprr: number;
  cpp: number;
  cpv: number;
}

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'] as const;

export function useCostStageMetas(year = 2026) {
  const queryClient = useQueryClient();

  const { data: metas = [], isLoading } = useQuery({
    queryKey: ['cost-stage-metas', year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cost_stage_metas')
        .select('*')
        .eq('year', year);
      if (error) throw error;
      return (data ?? []) as CostStageMeta[];
    },
  });

  const upsertMetas = useMutation({
    mutationFn: async (rows: Omit<CostStageMeta, 'id'>[]) => {
      const { error } = await supabase
        .from('cost_stage_metas')
        .upsert(
          rows.map(r => ({ ...r, updated_at: new Date().toISOString() })),
          { onConflict: 'month,year' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-stage-metas', year] });
    },
  });

  /** Get the average cost goal for a date range (averages across matching months) */
  function getCostGoalsForPeriod(from: Date, to: Date) {
    const startMonth = from.getMonth(); // 0-based
    const endMonth = to.getMonth();
    const startYear = from.getFullYear();
    const endYear = to.getFullYear();

    // Collect matching months
    const matchingMetas: CostStageMeta[] = [];
    for (let y = startYear; y <= endYear; y++) {
      const mStart = y === startYear ? startMonth : 0;
      const mEnd = y === endYear ? endMonth : 11;
      for (let m = mStart; m <= mEnd; m++) {
        const monthKey = MONTHS[m];
        const found = metas.find(meta => meta.month === monthKey && meta.year === y);
        if (found) matchingMetas.push(found);
      }
    }

    if (matchingMetas.length === 0) return null;

    // Average across months
    const result: Record<CostStageKey, number> = { cpl: 0, cpmql: 0, cprm: 0, cprr: 0, cpp: 0, cpv: 0 };
    for (const key of COST_STAGE_KEYS) {
      const sum = matchingMetas.reduce((acc, m) => acc + Number(m[key]), 0);
      result[key] = sum / matchingMetas.length;
    }

    // Return null if all zeros
    const hasValues = COST_STAGE_KEYS.some(k => result[k] > 0);
    return hasValues ? result : null;
  }

  return { metas, isLoading, upsertMetas, getCostGoalsForPeriod, MONTHS };
}
