import { useAIChat, type UseAIChatResult } from "./useAIChat";
import { supabase } from "@/integrations/supabase/client";

export interface ChurnTratativaChatHook extends UseAIChatResult {
  analysis: string | null;
  dossie: Record<string, any> | null;
}

export function useChurnTratativaAnalysis(
  clienteId: string | null,
  titulo: string | null,
  enabled = true,
): ChurnTratativaChatHook {
  // context_key: usa id real quando disponível; senão fallback sintético por título.
  const contextKey = clienteId
    ? clienteId
    : titulo
      ? `synthetic:${titulo.trim().toLowerCase()}`
      : null;

  const chat = useAIChat({
    contextType: "churn_tratativa",
    contextKey,
    title: titulo ? `Churn — ${titulo}` : null,
    enabled: enabled && (!!clienteId || !!titulo),
    createInitial: async () => {
      const { data, error } = await supabase.functions.invoke("analyze-churn-tratativa", {
        body: { clienteId, titulo },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return {
        analysis: data.analysis as string,
        metadata: { dossie: data.dossie ?? null, source: "analyze-churn-tratativa" },
      };
    },
  });

  const firstAssistant = chat.messages.find((m) => m.role === "assistant");
  return {
    ...chat,
    analysis: firstAssistant?.content ?? null,
    dossie: (firstAssistant?.metadata as any)?.dossie ?? null,
  };
}
