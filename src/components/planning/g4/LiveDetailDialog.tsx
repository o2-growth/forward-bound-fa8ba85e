import { useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

const fmtBRL = (v: number | null | undefined) =>
  v == null
    ? "—"
    : new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(v);

const fmtDate = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      })
    : "—";

function buildPipefyUrl(l: G4RealLead): string | null {
  if (l.pipefyUrl) return l.pipefyUrl;
  if (l.email) {
    return `https://app.pipefy.com/search?query=${encodeURIComponent(l.email)}`;
  }
  return null;
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
      <DialogContent className="max-w-[95vw] lg:max-w-6xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            {STAGE_LABEL[stage]}
            <Badge variant="secondary">{live}</Badge>
            <Badge variant="outline">{filtered.length}</Badge>
            <div className="ml-auto">
              <Button
                size="sm"
                variant={onlyMql ? "default" : "outline"}
                onClick={() => setOnlyMql((v) => !v)}
              >
                Só MQL (≥ R$ 200k)
              </Button>
            </div>
          </DialogTitle>
          <DialogDescription>
            {stage === "presentes"
              ? "Presença é agregada por lead (em alguma live) — quando a fonte cadastrar presença por live específica, esta lista fica exata."
              : "Detalhamento a partir do banco unificado das lives (g4_leads_360) + Pipefy."}
          </DialogDescription>
        </DialogHeader>

        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhum lead encontrado nesta etapa.
          </p>
        ) : (
          <ScrollArea className="max-h-[65vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome / e-mail</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Faixa</TableHead>
                  <TableHead className="text-right">MRR</TableHead>
                  <TableHead className="text-right">Setup</TableHead>
                  <TableHead className="text-right">Pontual</TableHead>
                  <TableHead className="text-right">TCV</TableHead>
                  <TableHead>Fase atual</TableHead>
                  <TableHead>SDR</TableHead>
                  <TableHead>Closer</TableHead>
                  <TableHead className="text-right">Dias</TableHead>
                  <TableHead className="text-center">Mão</TableHead>
                  <TableHead className="text-center">Diag.</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((l, i) => (
                  <TableRow key={`${l.email ?? "no-email"}-${i}`}>
                    <TableCell className="font-medium">
                      {l.nome || "—"}
                      <div className="text-[11px] text-muted-foreground">
                        {l.email || "—"}
                      </div>
                    </TableCell>
                    <TableCell>{l.empresa || "—"}</TableCell>
                    <TableCell>
                      {l.faixa ? (
                        <Badge variant="outline" className="font-normal whitespace-nowrap">
                          {l.faixa}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-xs">
                      {fmtBRL(l.valorMRR)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-xs">
                      {fmtBRL(l.valorSetup)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-xs">
                      {fmtBRL(l.valorPontual)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-xs font-medium">
                      {fmtBRL(l.tcv)}
                    </TableCell>
                    <TableCell>
                      {l.faseAtual ? (
                        <Badge variant="outline" className="font-normal">
                          {l.faseAtual}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{l.sdr || "—"}</TableCell>
                    <TableCell className="text-xs">{l.closer || "—"}</TableCell>
                    <TableCell className="text-right tabular-nums text-xs">
                      {l.diasNoPipe != null ? (
                        <TooltipProvider delayDuration={150}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>{l.diasNoPipe}d</span>
                            </TooltipTrigger>
                            <TooltipContent>
                              Entrou em {fmtDate(l.dataEntradaPipe)}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {l.levantouMao ? (
                        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/15">
                          Sim
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {l.fezDiagnostico ? (
                        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/15">
                          Sim
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const url = buildPipefyUrl(l);
                        return url ? (
                          <Button variant="outline" size="sm" asChild>
                            <a
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="gap-1.5"
                              title="Abrir no Pipefy"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              Pipefy
                            </a>
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        );
                      })()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
