import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

/**
 * Central de Reuniões — embutida via iframe apontando pro HTML estático
 * em public/central-reunioes/index.html. Injeta as credenciais Supabase
 * da sessão atual no window do iframe ANTES do onLoad, pra que o app
 * estático consiga autenticar chamadas ao mesmo projeto Supabase.
 */
export default function CentralReunioes() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const injectAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const win = iframe.contentWindow as (Window & Record<string, unknown>) | null;
      if (!win || !session) return;

      win.__SUPABASE_URL__ = import.meta.env.VITE_SUPABASE_URL;
      win.__SUPABASE_ANON_KEY__ = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      win.__SUPABASE_TOKEN__ = session.access_token;

      setReady(true);
    };

    // Injeta antes do load (script inline do HTML estático pode ler
    // essas vars assim que o documento inicia) e de novo após o load
    // como garantia, caso o navegador já tenha disparado onLoad antes
    // do listener ser anexado.
    injectAuth();
    iframe.addEventListener("load", injectAuth);
    return () => iframe.removeEventListener("load", injectAuth);
  }, []);

  return (
    <div className="w-full">
      <div className="mb-4">
        <h2 className="font-display text-xl font-semibold">Central de Reuniões</h2>
        <p className="text-sm text-muted-foreground">
          Agendamento e gestão de reuniões integrada.
        </p>
      </div>

      <div className="relative w-full overflow-hidden rounded-lg border">
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
        <iframe
          ref={iframeRef}
          src="/central-reunioes/index.html"
          title="Central de Reuniões"
          style={{ width: "100%", height: "calc(100vh - 220px)", border: 0 }}
        />
      </div>
    </div>
  );
}
