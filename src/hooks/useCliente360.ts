import { useAIChat, type UseAIChatResult } from "./useAIChat";
import { supabase } from "@/integrations/supabase/client";

export interface Cliente360ChatHook extends UseAIChatResult {
  /** Conveniência: primeiro assistant text (compat com UI antiga). */
  analysis: string | null;
  /** Conveniência: dossiê salvo nos metadados da primeira msg assistant. */
  cliente360: Record<string, any> | null;
}

export function useCliente360(clienteId: string | null, enabled = true): Cliente360ChatHook {
  const chat = useAIChat({
    contextType: "cliente_360",
    contextKey: clienteId,
    title: clienteId ? `Cliente 360 — ${clienteId}` : null,
    enabled,
    createInitial: async () => {
      const { data, error } = await supabase.functions.invoke("analyze-cliente-360", {
        body: { clienteId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return {
        analysis: data.analysis as string,
        metadata: { cliente360: data.cliente360 ?? null, source: "analyze-cliente-360" },
      };
    },
  });

  const firstAssistant = chat.messages.find((m) => m.role === "assistant");
  return {
    ...chat,
    analysis: firstAssistant?.content ?? null,
    cliente360: (firstAssistant?.metadata as any)?.cliente360 ?? null,
  };
}
