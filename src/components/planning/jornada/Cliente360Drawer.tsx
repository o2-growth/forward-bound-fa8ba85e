import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, RefreshCw, AlertCircle, Sparkles } from "lucide-react";
import { useCliente360 } from "@/hooks/useCliente360";
import { useQueryClient } from "@tanstack/react-query";
import type { JornadaCliente } from "./types";

interface Cliente360DrawerProps {
  cliente: JornadaCliente | null;
  open: boolean;
  onClose: () => void;
}

const healthColor = (level: 'green' | 'yellow' | 'red') =>
  level === 'green' ? 'bg-green-500' : level === 'yellow' ? 'bg-yellow-500' : 'bg-red-500';

function renderAnalysis(text: string) {
  // Render markdown-ish: **bold**, line breaks, bullets
  const lines = text.split(/\r?\n/);
  return lines.map((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={i} className="h-2" />;
    // Bold-only heading lines like **Situação atual**
    const headingMatch = trimmed.match(/^\*\*(.+)\*\*$/);
    if (headingMatch) {
      return <h4 key={i} className="text-sm font-semibold mt-3 mb-1 text-foreground">{headingMatch[1]}</h4>;
    }
    // Inline bold replacement
    const parts = trimmed.split(/(\*\*[^*]+\*\*)/g).map((p, idx) => {
      const m = p.match(/^\*\*(.+)\*\*$/);
      return m ? <strong key={idx}>{m[1]}</strong> : <span key={idx}>{p}</span>;
    });
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      return <li key={i} className="ml-4 text-sm text-muted-foreground list-disc">{parts.map((p, idx) => p.props?.children?.toString().replace(/^[-*]\s/, '') ?? p)}</li>;
    }
    return <p key={i} className="text-sm text-muted-foreground leading-relaxed">{parts}</p>;
  });
}

export function Cliente360Drawer({ cliente, open, onClose }: Cliente360DrawerProps) {
  const queryClient = useQueryClient();
  const { data, isLoading, error, isFetching } = useCliente360(cliente?.id ?? null, open);

  const handleRegenerate = () => {
    if (!cliente?.id) return;
    queryClient.invalidateQueries({ queryKey: ["cliente-360", cliente.id] });
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:w-[640px] sm:max-w-[90vw] overflow-hidden flex flex-col p-0">
        {cliente && (
          <>
            <SheetHeader className="p-6 pb-4 border-b">
              <SheetTitle className="flex items-center gap-2">
                <span className={`inline-block w-3 h-3 rounded-full ${healthColor(cliente.healthLevel)}`} />
                {cliente.titulo}
              </SheetTitle>
              <SheetDescription className="flex flex-wrap gap-2 text-xs">
                <Badge variant="outline">{cliente.faseAtual}</Badge>
                <span>CFO: {cliente.cfo}</span>
                <span>•</span>
                <span>Health: {cliente.healthScore}/100</span>
                <span>•</span>
                <span>Lifetime: {cliente.lifetimeMonths ?? "—"} meses</span>
                {cliente.tratativaAtiva && (
                  <Badge variant="destructive" className="text-[10px]">Tratativa {cliente.tratativaDias}d</Badge>
                )}
              </SheetDescription>
            </SheetHeader>

            <ScrollArea className="flex-1 p-6 w-full min-w-0">
              <div className="space-y-4 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Análise IA — diagnóstico de processo
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRegenerate}
                    disabled={isLoading || isFetching}
                  >
                    <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isFetching ? "animate-spin" : ""}`} />
                    Regenerar
                  </Button>
                </div>

                {isLoading && (
                  <div className="rounded-lg border p-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Buscando dados do banco e gerando diagnóstico…
                    </div>
                    <div className="space-y-2 mt-3">
                      <div className="h-3 bg-muted rounded animate-pulse w-3/4" />
                      <div className="h-3 bg-muted rounded animate-pulse w-full" />
                      <div className="h-3 bg-muted rounded animate-pulse w-5/6" />
                    </div>
                  </div>
                )}

                {error && (
                  <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                    <div className="flex items-start gap-2 text-sm">
                      <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                      <div className="space-y-1">
                        <p className="font-medium text-destructive">Erro ao gerar análise</p>
                        <p className="text-xs text-muted-foreground break-words">
                          {error instanceof Error ? error.message : String(error)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {data?.analysis && (
                  <div className="rounded-lg border bg-card p-4 space-y-1 break-words">
                    {renderAnalysis(data.analysis)}
                  </div>
                )}

                {data?.cliente360 && (
                  <details className="rounded-lg border p-3 bg-muted/30 min-w-0 overflow-hidden">
                    <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                      Ver JSON cru (debug)
                    </summary>
                    <pre className="text-[10px] mt-3 overflow-x-auto max-h-96 max-w-full whitespace-pre bg-background p-3 rounded">
                      {JSON.stringify(data.cliente360, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </ScrollArea>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
