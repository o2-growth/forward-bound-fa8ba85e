import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ChurnTratativaAnalysisResponse {
  clienteId: string;
  titulo: string;
  analysis: string;
  dossie: Record<string, any>;
}

export function useChurnTratativaAnalysis(
  clienteId: string | null,
  titulo: string | null,
  enabled = true,
) {
  return useQuery({
    queryKey: ["churn-tratativa", clienteId, titulo],
    enabled: enabled && (!!clienteId || !!titulo),
    staleTime: 60 * 60 * 1000, // 1h
    retry: 1,
    queryFn: async (): Promise<ChurnTratativaAnalysisResponse> => {
      const { data, error } = await supabase.functions.invoke("analyze-churn-tratativa", {
        body: { clienteId, titulo },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as ChurnTratativaAnalysisResponse;
    },
  });
}
