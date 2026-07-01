import { useCallback, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useCeoAiAnalysis(section: string, title: string, buildContext: () => unknown) {
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const cacheRef = useRef<Map<string, string>>(new Map());

  const generate = useCallback(async () => {
    setLoading(true);
    try {
      const context = buildContext();
      const key = JSON.stringify(context).slice(0, 4000);
      const cached = cacheRef.current.get(key);
      if (cached) {
        setText(cached);
        setLoading(false);
        return;
      }
      const { data, error } = await supabase.functions.invoke("analyze-ceo-metric", {
        body: { section, title, context },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const t = String(data?.text ?? "").trim();
      if (!t) throw new Error("IA não retornou texto");
      cacheRef.current.set(key, t);
      setText(t);
    } catch (e: any) {
      console.error("useCeoAiAnalysis error:", e);
      toast.error(e?.message ?? "Falha ao gerar análise IA");
    } finally {
      setLoading(false);
    }
  }, [section, title, buildContext]);

  return { text, loading, generate };
}
