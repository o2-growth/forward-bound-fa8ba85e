import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function usePersonnelDreGroupsConfig() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["personnel-dre-groups-config"],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await (supabase as any)
        .from("personnel_dre_groups_config")
        .select("group_ids")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      const ids = data?.group_ids;
      return Array.isArray(ids) ? ids.map(String) : [];
    },
    staleTime: 60 * 1000,
  });

  const save = useMutation({
    mutationFn: async (groupIds: string[]) => {
      const { error } = await (supabase as any)
        .from("personnel_dre_groups_config")
        .upsert({ id: 1, group_ids: groupIds, updated_at: new Date().toISOString() }, { onConflict: "id" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["personnel-dre-groups-config"] }),
  });

  return {
    selectedGroupIds: query.data || [],
    isLoading: query.isLoading,
    save: save.mutateAsync,
    isSaving: save.isPending,
  };
}
