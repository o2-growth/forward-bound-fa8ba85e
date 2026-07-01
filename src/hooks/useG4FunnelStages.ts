/**
 * useG4FunnelStages.ts — leitura dos estágios manuais do funil G4
 * (Diagnóstico Preenchido / Entraram na Live / Pico de Presentes / Presentes no Pitch etc.)
 *
 * Contrato da tabela (a ser criada pelo usuário):
 *   g4_funnel_stages(
 *     frente text, item_slug text NULL, stage_order int,
 *     stage_key text, stage_label text, value numeric,
 *     color_token text NULL
 *   )
 *
 * Enquanto a tabela não existir, retorna [] silenciosamente.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface G4Stage {
  stage_key: string;
  stage_label: string;
  value: number;
  stage_order: number;
  color_token?: string | null;
}

export function useG4FunnelStages(
  frente: "lives" | "eventos" | "seller",
  itemSlug: string | null,
) {
  return useQuery({
    queryKey: ["g4-funnel-stages", frente, itemSlug ?? "__agg__"],
    queryFn: async (): Promise<G4Stage[]> => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let q = (supabase as any)
          .from("g4_funnel_stages")
          .select("stage_key, stage_label, value, stage_order, color_token")
          .eq("frente", frente)
          .order("stage_order", { ascending: true });
        q = itemSlug ? q.eq("item_slug", itemSlug) : q.is("item_slug", null);
        const { data, error } = await q;
        if (error) return [];
        return (data ?? []) as G4Stage[];
      } catch {
        return [];
      }
    },
    staleTime: 60_000,
    retry: false,
  });
}
