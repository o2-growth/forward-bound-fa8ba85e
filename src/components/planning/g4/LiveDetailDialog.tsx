import { useMemo, useState } from "react";
import { ExternalLink, Hand, ClipboardCheck, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { G4RealLead } from "@/hooks/useG4RealMetrics";
import { isMqlQualified } from "@/hooks/useModeloAtualMetas";
import { buildPipefyUrl } from "./pipefy";

export type G4Stage =
  | "inscritos"
  | "presentes"
  | "mao"
  | "vendas"
  | "diagnosticos";

const STAGE_LABEL: Record<G4Stage, string> = {
  inscritos: "Inscritos",
  presentes: "Presentes",
  mao: "Levantaram a mão",
  vendas: "Vendas",
  diagnosticos: "Diagnósticos",
};

const fmtBRL = (v: number | null | undefined) => {
  if (v == null || v === 0) return null;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v);
};

const fmtDate = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      })
    : "—";

function phaseBadge(fase: string | null) {
  if (!fase) return <span className="text-xs text-muted-foreground">—</span>;
  const f = fase.toLowerCase();
  if (f === "ganho")
    return (
      <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/15 font-normal">
        {fase}
      </Badge>
    );
  if (f.includes("perdido") || f.includes("perda"))
    return (
      <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/20 hover:bg-rose-500/15 font-normal">
        {fase}
      </Badge>
    );
  return (
    <Badge variant="outline" className="font-normal whitespace-nowrap">
      {fase}
    </Badge>
  );
}

function MoneyCell({ v }: { v: number | null | undefined }) {
  const s = fmtBRL(v);
  return (
    <td className="px-2 py-2 text-right tabular-nums text-xs">
      {s ?? <span className="text-muted-foreground/60">—</span>}
    </td>
  );
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  live: string;
  stage: G4Stage;
  leads: G4RealLead[];
}

export function LiveDetailDialog({
  open,
  onOpenChange,
  live,
  stage,
  leads,
}: Props) {
  const [onlyMql, setOnlyMql] = useState(false);

  const filtered = useMemo(
    () => (onlyMql ? leads.filter((l) => isMqlQualified(l.faixa ?? undefined)) : leads),
    [leads, onlyMql],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] lg:max-w-6xl gap-4">
        <DialogHeader className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <DialogTitle className="text-base">
                {STAGE_LABEL[stage]}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {stage === "presentes"
                  ? "Presença é agregada por lead (em alguma live). Quando a fonte cadastrar presença por live específica, esta lista fica exata."
                  : "Detalhamento a partir do banco unificado das lives (g4_leads_360) + Pipefy."}
              </DialogDescription>
            </div>
            <Button
              size="sm"
              variant={onlyMql ? "default" : "outline"}
              onClick={() => setOnlyMql((v) => !v)}
            >
              Só MQL (≥ R$ 200k)
            </Button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="text-[11px]">{live}</Badge>
            <Badge variant="outline" className="text-[11px]">
              {filtered.length} lead{filtered.length === 1 ? "" : "s"}
            </Badge>
          </div>
        </DialogHeader>

        {filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Nenhum lead encontrado nesta etapa.
          </p>
        ) : (
          <ScrollArea className="max-h-[65vh] rounded-md border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-muted/60 backdrop-blur">
                <tr className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2 text-left font-semibold">Lead</th>
                  <th className="px-2 py-2 text-left font-semibold">Empresa</th>
                  <th className="px-2 py-2 text-left font-semibold">Faixa</th>
                  <th className="px-2 py-2 text-right font-semibold">MRR</th>
                  <th className="px-2 py-2 text-right font-semibold">Setup</th>
                  <th className="px-2 py-2 text-right font-semibold">Pontual</th>
                  <th className="px-2 py-2 text-right font-semibold">TCV</th>
                  <th className="px-2 py-2 text-left font-semibold">Fase</th>
                  <th className="px-2 py-2 text-left font-semibold">SDR</th>
                  <th className="px-2 py-2 text-left font-semibold">Closer</th>
                  <th className="px-2 py-2 text-right font-semibold">Dias</th>
                  <th className="px-2 py-2 text-center font-semibold">Sinais</th>
                  <th className="px-2 py-2 text-right font-semibold w-[110px]">Ação</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l, i) => {
                  const url = buildPipefyUrl(l);
                  return (
                    <tr
                      key={`${l.email ?? "no-email"}-${i}`}
                      className="border-t border-border/40 even:bg-muted/10 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-3 py-2.5 font-medium">
                        {l.nome || "—"}
                        <div className="text-[11px] text-muted-foreground font-normal">
                          {l.email || "—"}
                        </div>
                      </td>
                      <td className="px-2 py-2.5 text-xs">{l.empresa || "—"}</td>
                      <td className="px-2 py-2.5">
                        {l.faixa ? (
                          <Badge variant="outline" className="font-normal whitespace-nowrap text-[10px]">
                            {l.faixa}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground/60">—</span>
                        )}
                      </td>
                      <MoneyCell v={l.valorMRR} />
                      <MoneyCell v={l.valorSetup} />
                      <MoneyCell v={l.valorPontual} />
                      <td className="px-2 py-2.5 text-right tabular-nums text-xs font-medium">
                        {fmtBRL(l.tcv) ?? <span className="text-muted-foreground/60">—</span>}
                      </td>
                      <td className="px-2 py-2.5">{phaseBadge(l.faseAtual)}</td>
                      <td className="px-2 py-2.5 text-xs">{l.sdr || "—"}</td>
                      <td className="px-2 py-2.5 text-xs">{l.closer || "—"}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums text-xs">
                        {l.diasNoPipe != null ? (
                          <TooltipProvider delayDuration={150}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help">{l.diasNoPipe}d</span>
                              </TooltipTrigger>
                              <TooltipContent>
                                Entrou em {fmtDate(l.dataEntradaPipe)}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <span className="text-muted-foreground/60">—</span>
                        )}
                      </td>
                      <td className="px-2 py-2.5">
                        <div className="flex items-center justify-center gap-1.5">
                          <TooltipProvider delayDuration={150}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className={l.levantouMao ? "text-emerald-500" : "text-muted-foreground/30"}>
                                  <Hand className="h-3.5 w-3.5" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                {l.levantouMao ? "Levantou a mão" : "Não levantou a mão"}
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className={l.fezDiagnostico ? "text-emerald-500" : "text-muted-foreground/30"}>
                                  <ClipboardCheck className="h-3.5 w-3.5" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                {l.fezDiagnostico ? "Fez diagnóstico" : "Sem diagnóstico"}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </td>
                      <td className="px-2 py-2.5 text-right">
                        {url ? (
                          <Button size="sm" variant="default" asChild className="h-7 gap-1.5">
                            <a href={url} target="_blank" rel="noreferrer" title="Abrir no Pipefy">
                              Pipefy
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground/60">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}

// keep re-export for any external consumers
export { buildPipefyUrl };
// unused import guard
void Check;
