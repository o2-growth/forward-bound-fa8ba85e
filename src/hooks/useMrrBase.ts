import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface MrrBaseRow {
  id: string;
  month: string;
  year: number;
  value: number;
  is_total_override: boolean;
}

export function useMrrBase() {
  const { data, isLoading } = useQuery({
    queryKey: ["mrr-base-monthly"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mrr_base_monthly")
        .select("*")
        .order("year")
        .order("month");

      if (error) throw error;
      return (data as unknown as MrrBaseRow[]);
    },
  });

  const getMrrBaseForMonth = (month: string, year: number): number => {
    if (!data) return 0;
    const row = data.find(r => r.month === month && r.year === year);
    return row ? Number(row.value) : 0;
  };

  const isTotalOverride = (month: string, year: number): boolean => {
    if (!data) return false;
    const row = data.find(r => r.month === month && r.year === year);
    return row ? Boolean(row.is_total_override) : false;
  };

  return {
    mrrBaseData: data || [],
    getMrrBaseForMonth,
    isTotalOverride,
    isLoading,
  };
}
