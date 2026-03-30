import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type BuType = 'modelo_atual' | 'o2_tax' | 'oxy_hacker' | 'franquia';
export type MonthType = 'Jan' | 'Fev' | 'Mar' | 'Abr' | 'Mai' | 'Jun' | 'Jul' | 'Ago' | 'Set' | 'Out' | 'Nov' | 'Dez';
export type MetricType = 'faturamento' | 'mrr' | 'setup' | 'pontual';

export interface MonetaryMeta {
  id: string;
  bu: string;
  month: string;
  year: number;
  faturamento: number;
  mrr: number;
  setup: number;
  pontual: number;
  vendas: number;
  ticket_medio: number;
  created_at: string;
  updated_at: string;
}

export interface MonetaryMetaUpdate {
  bu: string;
  month: string;
  year?: number;
  faturamento?: number;
  mrr?: number;
  setup?: number;
  pontual?: number;
  vendas?: number;
  ticket_medio?: number;
}

export const BUS: BuType[] = ['modelo_atual', 'o2_tax', 'oxy_hacker', 'franquia'];
export const MONTHS: MonthType[] = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
export const METRICS: MetricType[] = ['faturamento', 'mrr', 'setup', 'pontual'];

export const BU_LABELS: Record<BuType, string> = {
  modelo_atual: 'Modelo Atual',
  o2_tax: 'O2 TAX',
  oxy_hacker: 'Oxy Hacker',
  franquia: 'Franquia',
};

// BUs that only have "pontual" revenue (no MRR or Setup)
export const PONTUAL_ONLY_BUS: BuType[] = ['oxy_hacker', 'franquia'];

export const isPontualOnlyBU = (bu: BuType): boolean => {
  return PONTUAL_ONLY_BUS.includes(bu);
};

export const METRIC_LABELS: Record<MetricType, string> = {
  faturamento: 'Incremento',
  mrr: 'MRR',
  setup: 'Setup',
  pontual: 'Pontual',
};

export function useMonetaryMetas(year = 2026) {
  const queryClient = useQueryClient();

  // Fetch all metas for a year
  const { data: metas = [], isLoading, error } = useQuery({
    queryKey: ['monetary-metas', year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('monetary_metas')
        .select('*')
        .eq('year', year)
        .order('bu')
        .order('month');
      
      if (error) throw error;
      return (data || []) as MonetaryMeta[];
    },
  });

  // Get meta value for a specific BU/month/metric
  const getMeta = (bu: string, month: string, metric: MetricType): number => {
    const meta = metas.find(m => m.bu === bu && m.month === month);
    return meta ? Number(meta[metric]) || 0 : 0;
  };

  // Check if a BU has any metas defined
  const hasMetasForBU = (bu: string): boolean => {
    return metas.some(m => m.bu === bu && (m.faturamento > 0 || m.mrr > 0 || m.setup > 0 || m.pontual > 0));
  };

  // Get all metas for a BU
  const getMetasForBU = (bu: string): MonetaryMeta[] => {
    return metas.filter(m => m.bu === bu);
  };

  // Bulk upsert metas
  const bulkUpdateMetas = useMutation({
    mutationFn: async (updates: MonetaryMetaUpdate[]) => {
      // Use upsert with ON CONFLICT
      const upsertData = updates.map(u => ({
        bu: u.bu,
        month: u.month,
        year: u.year || year,
        faturamento: u.faturamento ?? 0,
        mrr: u.mrr ?? 0,
        setup: u.setup ?? 0,
        pontual: u.pontual ?? 0,
        vendas: u.vendas ?? 0,
        ticket_medio: u.ticket_medio ?? 0,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('monetary_metas')
        .upsert(upsertData, { 
          onConflict: 'bu,month,year',
          ignoreDuplicates: false 
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monetary-metas', year] });
    },
  });

  // Calculate percentages from faturamento
  const calculateFromPercentages = (faturamentoValues: Record<string, number>) => {
    return MONTHS.reduce((acc, month) => {
      const fat = faturamentoValues[month] || 0;
      acc[month] = {
        faturamento: fat,
        mrr: Math.round(fat * 0.25),
        setup: Math.round(fat * 0.6),
        pontual: Math.round(fat * 0.15),
      };
      return acc;
    }, {} as Record<string, { faturamento: number; mrr: number; setup: number; pontual: number }>);
  };

  return {
    metas,
    isLoading,
    error,
    getMeta,
    hasMetasForBU,
    getMetasForBU,
    bulkUpdateMetas,
    calculateFromPercentages,
    BUS,
    MONTHS,
    METRICS,
    BU_LABELS,
    METRIC_LABELS,
  };
}
