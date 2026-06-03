import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PipeActiveCount {
  key: 'bpo' | 'assessoria_financeira' | 'coordenador_financeiro';
  label: string;
  table: string;
  total: number;
  byPhase: Array<{ fase: string; count: number }>;
}

const PIPES: Array<Pick<PipeActiveCount, 'key' | 'label' | 'table'>> = [
  { key: 'assessoria_financeira', label: 'Assessoria Financeira', table: 'pipefy_moviment_assessoria_financeira' },
  { key: 'bpo', label: 'BPO', table: 'pipefy_moviment_bpo' },
  { key: 'coordenador_financeiro', label: 'Coordenador Financeiro', table: 'pipefy_moviment_coordenador_financeiro' },
];

async function fetchOne(table: string) {
  const { data, error } = await supabase.functions.invoke('query-external-db', {
    body: { action: 'count_active_in_pipe', table },
  });
  if (error) throw error;
  return data as { total: number; byPhase: Array<{ fase: string; count: number | string }> };
}

export function usePipeActiveCounts() {
  return useQuery<PipeActiveCount[]>({
    queryKey: ['pipe-active-counts'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const results = await Promise.all(
        PIPES.map(async (p) => {
          try {
            const r = await fetchOne(p.table);
            return {
              ...p,
              total: Number(r.total) || 0,
              byPhase: (r.byPhase || []).map((b) => ({ fase: b.fase, count: Number(b.count) || 0 })),
            };
          } catch (e) {
            console.error(`Failed loading ${p.table}`, e);
            return { ...p, total: 0, byPhase: [] };
          }
        }),
      );
      return results;
    },
  });
}
