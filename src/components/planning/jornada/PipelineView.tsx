import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, DollarSign, UserCheck, AlertTriangle, Rocket, Receipt, ExternalLink } from "lucide-react";
import type { PipelineFase, JornadaCliente } from "./types";

const formatBRL = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);

const formatCompact = (value: number) => {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}k`;
  return formatBRL(value);
};

interface PipelineViewProps {
  pipeline: PipelineFase[];
  clientes: JornadaCliente[];
}

export function PipelineView({ pipeline, clientes }: PipelineViewProps) {
  const [selectedFase, setSelectedFase] = useState<PipelineFase | null>(null);

  const kpis = useMemo(() => {
    const totalAtivos = clientes.length;
    const clientesMrr = clientes.filter(c => c.mrr > 0).length;
    const clientesPontual = clientes.filter(c => c.mrr === 0 && c.pontual > 0).length;
    const mrrTotal = clientes.reduce((s, c) => s + c.mrr, 0);
    const onboarding = clientes.filter(c => c.faseAtual === "Onboarding").length;
    const emOperacao = clientes.filter(c => c.faseAtual === "Em Operação Recorrente").length;
    const emTratativa = clientes.filter(c => c.tratativaAtiva).length;
    return { totalAtivos, clientesMrr, clientesPontual, mrrTotal, onboarding, emOperacao, emTratativa };
  }, [clientes]);

  const maxCount = useMemo(() => Math.max(...pipeline.map(f => f.count), 1), [pipeline]);

  const kpiCards = [
    { label: "Total Ativos", value: String(kpis.totalAtivos), icon: Users, color: "text-blue-600" },
    { label: "Clientes MRR", value: String(kpis.clientesMrr), icon: DollarSign, color: "text-green-600" },
    { label: "Clientes Pontual", value: String(kpis.clientesPontual), icon: Receipt, color: "text-purple-600" },
    { label: "MRR Total", value: formatCompact(kpis.mrrTotal), icon: DollarSign, color: "text-green-500" },
    { label: "Onboarding", value: String(kpis.onboarding), icon: Rocket, color: "text-blue-500" },
    { label: "Em Operação", value: String(kpis.emOperacao), icon: UserCheck, color: "text-green-500" },
    { label: "Em Tratativa", value: String(kpis.emTratativa), icon: AlertTriangle, color: "text-amber-500" },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="flex flex-col items-center justify-center p-4 rounded-lg border bg-muted/50">
              <Icon className={`h-5 w-5 mb-1 ${kpi.color}`} />
              <span className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</span>
              <span className="text-xs text-muted-foreground text-center">{kpi.label}</span>
            </div>
          );
        })}
      </div>

      {/* MRR vs Pontual breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border p-4 space-y-3">
          <h4 className="text-sm font-semibold text-muted-foreground">MRR por Fase</h4>
          {pipeline.map(fase => {
            const faseMrr = fase.clientes.reduce((s, c) => s + c.mrr, 0);
            const maxMrr = Math.max(...pipeline.map(f => f.clientes.reduce((s, c) => s + c.mrr, 0)), 1);
            const pct = Math.max((faseMrr / maxMrr) * 100, 4);
            return (
              <div key={`mrr-${fase.fase}`} className="flex items-center gap-2">
                <span className="text-xs w-28 truncate text-muted-foreground">{fase.label}</span>
                <div className="flex-1 h-5 bg-muted/30 rounded overflow-hidden">
                  <div className="h-full rounded bg-green-500/80" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs font-medium w-20 text-right">{formatCompact(faseMrr)}</span>
              </div>
            );
          })}
        </div>
        <div className="rounded-lg border p-4 space-y-3">
          <h4 className="text-sm font-semibold text-muted-foreground">Pontual (Setup) por Fase</h4>
          {pipeline.map(fase => {
            const fasePontual = fase.clientes.reduce((s, c) => s + c.pontual, 0);
            const maxPontual = Math.max(...pipeline.map(f => f.clientes.reduce((s, c) => s + c.pontual, 0)), 1);
            const pct = Math.max((fasePontual / maxPontual) * 100, 4);
            return (
              <div key={`pont-${fase.fase}`} className="flex items-center gap-2">
                <span className="text-xs w-28 truncate text-muted-foreground">{fase.label}</span>
                <div className="flex-1 h-5 bg-muted/30 rounded overflow-hidden">
                  <div className="h-full rounded bg-purple-500/80" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs font-medium w-20 text-right">{formatCompact(fasePontual)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pipeline Bars */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Pipeline por Fase</h3>
        {pipeline.map((fase) => {
          const widthPct = Math.max((fase.count / maxCount) * 100, 8);
          const fasePontual = fase.clientes.reduce((s, c) => s + c.pontual, 0);
          return (
            <button
              key={fase.fase}
              onClick={() => setSelectedFase(fase)}
              className="w-full text-left group"
            >
              <div className="flex items-center gap-3 mb-1">
                <span className="text-sm font-medium w-40 truncate">{fase.label}</span>
                <span className="text-xs text-muted-foreground">
                  {fase.count} clientes · MRR {formatCompact(fase.mrr)} · Pontual {formatCompact(fasePontual)}
                </span>
              </div>
              <div className="w-full bg-muted rounded-md h-8 overflow-hidden">
                <div
                  className="h-full rounded-md flex items-center px-3 transition-all group-hover:opacity-80"
                  style={{ width: `${widthPct}%`, backgroundColor: fase.cor }}
                >
                  <span className="text-xs font-semibold text-white drop-shadow-sm">
                    {fase.count}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Drill-down Dialog */}
      <Dialog open={!!selectedFase} onOpenChange={(open) => !open && setSelectedFase(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedFase?.label} — {selectedFase?.count} clientes</DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>CFO</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead className="text-right">MRR</TableHead>
                <TableHead className="text-right">Pontual</TableHead>
                <TableHead className="text-right">Health</TableHead>
                <TableHead className="text-right">Dias</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selectedFase?.clientes
                .sort((a, b) => b.mrr - a.mrr)
                .map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      <span className="inline-flex items-center gap-1">
                        {c.titulo}
                        <a href={`https://app.pipefy.com/open-cards/${c.id}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                          <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-primary inline-block" />
                        </a>
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{c.cfo}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">{c.produto}</TableCell>
                    <TableCell className="text-right">{formatBRL(c.mrr)}</TableCell>
                    <TableCell className="text-right text-purple-600">{c.pontual > 0 ? formatBRL(c.pontual) : "—"}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={c.healthLevel === "green" ? "default" : c.healthLevel === "yellow" ? "secondary" : "destructive"}>
                        {c.healthScore}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{c.diasNaFaseAtual}d</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </div>
  );
}
