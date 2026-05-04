import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MrrBaseRow {
  id: string;
  month: string;
  year: number;
  value: number;
  is_total_override: boolean;
  updated_at?: string;
}

export function useMrrBase() {
  const queryClient = useQueryClient();

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

  const getMrrBaseRow = (month: string, year: number): MrrBaseRow | undefined => {
    if (!data) return undefined;
    return data.find(r => r.month === month && r.year === year);
  };

  const syncFromOxyMutation = useMutation({
    mutationFn: async (year: number) => {
      const { data: result, error } = await supabase.functions.invoke('sync-mrr-base', {
        body: { year },
      });
      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      return result as { year: number; synced: { month: string; value: number }[]; skippedOverride: { month: string; value: number }[] };
    },
    onSuccess: (result) => {
      const syncedCount = result.synced?.length || 0;
      const skippedCount = result.skippedOverride?.length || 0;
      toast.success(
        `MRR Base sincronizado: ${syncedCount} ${syncedCount === 1 ? 'mês atualizado' : 'meses atualizados'}` +
        (skippedCount > 0 ? `, ${skippedCount} mantido${skippedCount > 1 ? 's' : ''} (override manual)` : '')
      );
      queryClient.invalidateQueries({ queryKey: ['mrr-base-monthly'] });
    },
    onError: (err: Error) => {
      toast.error(`Falha ao sincronizar com Oxy: ${err.message}`);
    },
  });

  return {
    mrrBaseData: data || [],
    getMrrBaseForMonth,
    isTotalOverride,
    getMrrBaseRow,
    isLoading,
    syncFromOxy: syncFromOxyMutation.mutate,
    isSyncing: syncFromOxyMutation.isPending,
  };
}
