import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type TeamSplit = Record<string, number>; // ex: { "Comercial": 35, "Tech": 30, "Ops": 35 }

export interface PersonnelDreMappingRow {
  id: string;
  dre_label: string;
  dre_label_original: string;
  group_id: string | null;
  group_label: string | null;
  pessoa_id: string | null;
  pessoa_nome: string | null;
  pessoa_time: string | null;
  tipo: string;
  is_ignored: boolean;
  team_split: TeamSplit;
  created_at: string;
  updated_at: string;
}

export interface UpsertMappingInput {
  dre_label_original: string;
  group_id?: string | null;
  group_label?: string | null;
  tipo?: string;
  is_ignored?: boolean;
  team_split?: TeamSplit;
  // legacy (não usado mais na UI nova, mantido para compat)
  pessoa_id?: string | null;
  pessoa_nome?: string | null;
  pessoa_time?: string | null;
}

export function normalizeLabel(s: string): string {
  return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

export function splitSum(split: TeamSplit | null | undefined): number {
  if (!split) return 0;
  let s = 0;
  for (const v of Object.values(split)) s += Number(v) || 0;
  return s;
}

export function usePersonnelDreMapping() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["personnel-dre-mapping"],
    queryFn: async (): Promise<PersonnelDreMappingRow[]> => {
      const { data, error } = await (supabase as any)
        .from("personnel_dre_mapping")
        .select("*");
      if (error) throw error;
      return ((data || []) as any[]).map((r) => ({
        ...r,
        team_split: (r.team_split && typeof r.team_split === "object") ? r.team_split : {},
      })) as PersonnelDreMappingRow[];
    },
    staleTime: 60 * 1000,
  });

  const byLabel = new Map<string, PersonnelDreMappingRow>();
  for (const r of query.data || []) byLabel.set(r.dre_label, r);

  const getMappingFor = useCallback(
    (label: string) => byLabel.get(normalizeLabel(label)) || null,
    [query.data]
  );

  const upsert = useMutation({
    mutationFn: async (input: UpsertMappingInput) => {
      const dre_label = normalizeLabel(input.dre_label_original);
      const payload: any = {
        dre_label,
        dre_label_original: input.dre_label_original,
        group_id: input.group_id ?? null,
        group_label: input.group_label ?? null,
        pessoa_id: input.pessoa_id ?? null,
        pessoa_nome: input.pessoa_nome ?? null,
        pessoa_time: input.pessoa_time ?? null,
        tipo: input.tipo ?? "outro",
        is_ignored: input.is_ignored ?? false,
        team_split: input.team_split ?? {},
      };
      const { data, error } = await (supabase as any)
        .from("personnel_dre_mapping")
        .upsert(payload, { onConflict: "dre_label" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["personnel-dre-mapping"] }),
  });

  const remove = useMutation({
    mutationFn: async (label: string) => {
      const dre_label = normalizeLabel(label);
      const { error } = await (supabase as any)
        .from("personnel_dre_mapping")
        .delete()
        .eq("dre_label", dre_label);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["personnel-dre-mapping"] }),
  });

  return {
    mappings: query.data || [],
    isLoading: query.isLoading,
    error: query.error as Error | null,
    getMappingFor,
    upsert: upsert.mutateAsync,
    remove: remove.mutateAsync,
    isSaving: upsert.isPending || remove.isPending,
  };
}
