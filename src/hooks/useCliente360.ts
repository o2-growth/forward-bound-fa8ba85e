import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Cliente360Response {
  clienteId: string;
  analysis: string;
  cliente360: Record<string, any>;
}

export function useCliente360(clienteId: string | null, enabled = true) {
  return useQuery({
    queryKey: ["cliente-360", clienteId],
    enabled: enabled && !!clienteId,
    staleTime: 60 * 60 * 1000, // 1h
    retry: 1,
    queryFn: async (): Promise<Cliente360Response> => {
      const { data, error } = await supabase.functions.invoke("analyze-cliente-360", {
        body: { clienteId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as Cliente360Response;
    },
  });
}
