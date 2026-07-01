import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

export interface ExpenseSupplier {
  label: string;
  total: number;
  byMonth: { period: string; value: number }[];
}

interface UseParams {
  startDate: Date;
  endDate: Date;
  enabled?: boolean;
}

/**
 * Saídas (despesas) detalhadas por fornecedor/categoria via Oxy Finance.
 * cashflow_details com movimentType=D.
 */
export function useOxyExpenses({ startDate, endDate, enabled = true }: UseParams) {
  const start = format(startDate, "yyyy-MM-01");
  const end = format(endDate, "yyyy-MM-dd");

  const q = useQuery({
    queryKey: ["oxy-expenses", start, end],
    enabled,
    staleTime: 10 * 60 * 1000,
    retry: 1,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("fetch-oxy-finance", {
        body: {
          action: "cashflow_details",
          startDate: start,
          endDate: end,
          movimentType: "D",
        },
      });
      if (error) throw error;
      const raw = (data?.data || []) as Array<{
        label: string;
        type: string;
        data: Array<{ period: string; value: number }>;
      }>;
      const items: ExpenseSupplier[] = raw.map((r) => {
        const byMonth = (r.data || [])
          .filter((d) => d.period !== "Total" && d.period !== "TOTAL")
          .map((d) => ({ period: d.period, value: Math.abs(Number(d.value) || 0) }));
        const total = byMonth.reduce((s, d) => s + d.value, 0);
        return { label: r.label, total, byMonth };
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
