import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

export interface ReceivableCustomer {
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
 * Contas a receber em atraso (inadimplência) direto do Oxy Finance.
 * cashflow_details com movimentType=R + isLate=true.
 */
export function useOxyReceivables({ startDate, endDate, enabled = true }: UseParams) {
  const start = format(startDate, "yyyy-MM-01");
  const end = format(endDate, "yyyy-MM-dd");

  const q = useQuery({
    queryKey: ["oxy-receivables-late", start, end],
    enabled,
    staleTime: 10 * 60 * 1000,
    retry: 1,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("fetch-oxy-finance", {
        body: {
          action: "cashflow_details",
          startDate: start,
          endDate: end,
          movimentType: "R",
          isLate: true,
        },
      });
      if (error) throw error;
      const raw = (data?.data || []) as Array<{
        label: string;
        type: string;
        data: Array<{ period: string; value: number }>;
      }>;
      const items: ReceivableCustomer[] = raw.map((r) => {
        const byMonth = (r.data || [])
          .filter((d) => d.period !== "Total" && d.period !== "TOTAL")
          .map((d) => ({ period: d.period, value: Number(d.value) || 0 }));
        const total = byMonth.reduce((s, d) => s + d.value, 0);
        return { label: r.label, total, byMonth };
      });
      items.sort((a, b) => b.total - a.total);
      const total = items.reduce((s, i) => s + i.total, 0);
      const byMonthAgg: Record<string, number> = {};
      for (const it of items) {
        for (const m of it.byMonth) {
          byMonthAgg[m.period] = (byMonthAgg[m.period] || 0) + m.value;
        }
      }
      return { items, total, byMonthAgg };
    },
  });

  return {
    items: q.data?.items || [],
    total: q.data?.total || 0,
    byMonthAgg: q.data?.byMonthAgg || {},
    isLoading: q.isLoading,
    error: q.error as Error | null,
  };
}
