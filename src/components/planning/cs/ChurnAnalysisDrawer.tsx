import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, RefreshCw, AlertCircle, Sparkles } from "lucide-react";
import { useChurnTratativaAnalysis } from "@/hooks/useChurnTratativaAnalysis";
import { useQueryClient } from "@tanstack/react-query";
import type { ChurnDossierCard } from "@/hooks/useOperationsData";

interface Props {
  churn: ChurnDossierCard | null;
  open: boolean;
  onClose: () => void;
}

function formatCurrency(value: number) {
  if (!value) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);
}

function renderAnalysis(text: string) {
  const lines = text.split(/\r?\n/);
  return lines.map((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={i} className="h-2" />;
    const headingMatch = trimmed.match(/^\*\*(.+)\*\*$/);
    if (headingMatch) {
      return <h4 key={i} className="text-sm font-semibold mt-3 mb-1 text-foreground">{headingMatch[1]}</h4>;
    }
    const parts = trimmed.split(/(\*\*[^*]+\*\*)/g).map((p, idx) => {
      const m = p.match(/^\*\*(.+)\*\*$/);
      return m ? <strong key={idx}>{m[1]}</strong> : <span key={idx}>{p}</span>;
    });
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      const cleaned = trimmed.replace(/^[-*]\s/, "");
      const innerParts = cleaned.split(/(\*\*[^*]+\*\*)/g).map((p, idx) => {
        const m = p.match(/^\*\*(.+)\*\*$/);
        return m ? <strong key={idx}>{m[1]}</strong> : <span key={idx}>{p}</span>;
      });
      return <li key={i} className="ml-4 text-sm text-muted-foreground list-disc">{innerParts}</li>;
    }
    return <p key={i} className="text-sm text-muted-foreground leading-relaxed">{parts}</p>;
  });
}

export function ChurnAnalysisDrawer({ churn, open, onClose }: Props) {
  const queryClient = useQueryClient();
  const isSynthetic = churn?.id?.startsWith("synthetic-") ?? false;
  const realId = !isSynthetic ? churn?.id ?? null : null;
  const titulo = churn?.cliente ?? null;
  const { data, isLoading, error, isFetching } = useChurnTratativaAnalysis(realId, titulo, open);

  const handleRegenerate = () => {
    queryClient.invalidateQueries({ queryKey: ["churn-tratativa", realId, titulo] });
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:w-[640px] sm:max-w-[90vw] overflow-hidden flex flex-col p-0">
        {churn && (
          <>
            <SheetHeader className="p-6 pb-4 border-b">
              <SheetTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                {churn.cliente}
              </SheetTitle>
              <SheetDescription className="flex flex-wrap gap-2 text-xs">
                <Badge variant="outline">{churn.faseAtual || "Churn"}</Badge>
                <span>Mês: {churn.mesChurn || "—"}</span>
                <span>•</span>
                <span>MRR: {formatCurrency(churn.mrr)}</span>
                <span>•</span>
                <span>LT: {churn.ltMeses ? `${churn.ltMeses}m` : "—"}</span>
                {churn.motivoPrincipal && (
                  <Badge variant="destructive" className="text-[10px]">{churn.motivoPrincipal}</Badge>
                )}
              </SheetDescription>
            </SheetHeader>

            <ScrollArea className="flex-1 p-6 w-full min-w-0">
              <div className="space-y-4 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Post-mortem IA — análise da tratativa
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRegenerate}
                    disabled={isLoading || isFetching || isSynthetic}
                  >
                    <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isFetching ? "animate-spin" : ""}`} />
                    Regenerar
                  </Button>
                </div>

                {isSynthetic && (
                  <div className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm">
                    Este registro é um placeholder fixo (lista oficial Abr/2026) e não tem histórico de tratativa no banco. Para gerar o post-mortem, abra o card real no Pipefy.
                  </div>
                )}

                {!isSynthetic && isLoading && (
                  <div className="rounded-lg border p-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Buscando tratativa, NPS e gerando post-mortem…
                    </div>
                    <div className="space-y-2 mt-3">
                      <div className="h-3 bg-muted rounded animate-pulse w-3/4" />
                      <div className="h-3 bg-muted rounded animate-pulse w-full" />
                      <div className="h-3 bg-muted rounded animate-pulse w-5/6" />
                    </div>
                  </div>
                )}

                {!isSynthetic && error && (
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

                {data?.dossie && (
                  <details open className="rounded-lg border p-3 bg-muted/30 min-w-0 overflow-hidden">
                    <summary className="cursor-pointer text-xs font-medium text-muted-foreground flex items-center justify-between gap-2">
                      <span>
                        JSON do dossiê •{" "}
                        {(data.dossie as any)?.tratativa_historico?.length ?? 0} fases tratativa •{" "}
                        {(data.dossie as any)?.nps_recente?.length ?? 0} NPS •{" "}
                        Central de Projetos: {(data.dossie as any)?.central_projetos ? "sim" : "não"}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          navigator.clipboard.writeText(JSON.stringify(data.dossie, null, 2));
                        }}
                        className="text-[10px] px-2 py-0.5 rounded border bg-background hover:bg-muted"
                      >
                        Copiar JSON
                      </button>
                    </summary>
                    <pre className="text-[10px] mt-3 overflow-x-auto max-h-96 max-w-full whitespace-pre bg-background p-3 rounded">
                      {JSON.stringify(data.dossie, null, 2)}
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
