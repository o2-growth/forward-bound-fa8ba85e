import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

export interface DrillDownItem {
  label: string;
  type: "supplier" | "customer" | string;
  total: number;
  serie: { period: string; value: number }[];
}

interface RawEntry {
  label: string;
  type: string;
  data: { period: string; value: number }[];
}

interface UseParams {
  category: string | null;
  startDate: Date;
  endDate: Date;
  enabled?: boolean;
}

/**
 * Drill-down de uma categoria da DRE Oxy → fornecedores (despesa) ou clientes (receita).
 * Soma dos itens = valor da categoria no DRE (regime de competência).
 */
export function useDreDrillDown({ category, startDate, endDate, enabled = true }: UseParams) {
  const start = format(startDate, "yyyy-MM-01");
  const end = format(endDate, "yyyy-MM-dd");

  const q = useQuery({
    queryKey: ["oxy-dre-drill-down", category, start, end],
    enabled: enabled && !!category,
    staleTime: 10 * 60 * 1000,
    retry: 1,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("fetch-oxy-finance", {
        body: { action: "dre_drill_down", category, startDate: start, endDate: end },
      });
      if (error) throw error;
      const raw = (data?.data || []) as RawEntry[];
      const items: DrillDownItem[] = raw.map((r) => {
        const serie = (r.data || [])
          .filter((d) => d.period !== "Total" && d.period !== "TOTAL")
          .map((d) => ({ period: d.period, value: Number(d.value) || 0 }))
          .sort((a, b) => a.period.localeCompare(b.period));
        const total = serie.reduce((s, d) => s + d.value, 0);
        return { label: r.label, type: r.type, total, serie };
      });
      items.sort((a, b) => b.total - a.total);
      const total = items.reduce((s, i) => s + i.total, 0);
      return { items, total };
    },
  });

  return {
    items: q.data?.items || [],
    total: q.data?.total || 0,
    isLoading: q.isLoading,
    error: q.error as Error | null,
  };
}
