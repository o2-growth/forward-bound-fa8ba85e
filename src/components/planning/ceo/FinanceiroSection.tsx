import { useMemo, useState } from "react";
import { CeoMetricDialog, type CeoMetricDialogPayload } from "./CeoMetricDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Wallet, AlertTriangle } from "lucide-react";
import { useOperationsData } from "@/hooks/useOperationsData";
import { useOxyReceivables } from "@/hooks/useOxyReceivables";
import { fmt, fmtFull, fmtInt, MetricCard, AiNote, AiNoteAuto, type MetricSource } from "./ceoShared";

interface Props { dateRange: { from: Date; to: Date }; }

const SRC_BASE: MetricSource = {
  origem: "useOperationsData — Pipefy Central de Projetos",
  periodo: "Snapshot atual (histórico total — não filtra por data)",
  calculo: "Churn Rate = clientes encerrados ÷ (ativos + encerrados).",
};

const SRC_INAD: MetricSource = {
  origem: "Oxy Finance — Contas a receber (cashflow_details, movimentType=R, isLate=true)",
  periodo: "Filtra pelo período selecionado (mês de vencimento)",
  calculo: "Total de recebíveis vencidos e não pagos por cliente no período.",
};

export function FinanceiroSection({ dateRange }: Props) {
  const ops = useOperationsData();
  const receivables = useOxyReceivables({ startDate: dateRange.from, endDate: dateRange.to });
  const kpis = ops.data?.kpis;
  const [drill, setDrill] = useState<CeoMetricDialogPayload | null>(null);
  const periodLabel = `${dateRange.from.toLocaleDateString("pt-BR")} – ${dateRange.to.toLocaleDateString("pt-BR")}`;

  const topInad = useMemo(() => receivables.items.slice(0, 15), [receivables.items]);
  const clientesInad = receivables.items.length;

  if (ops.isLoading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><Wallet className="h-4 w-4 text-muted-foreground" />Base de clientes</CardTitle>
          <p className="text-xs text-muted-foreground">Clientes ativos vs inativos.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {(() => {
            const baseBreakdown: CeoMetricDialogPayload = {
              title: "Base de clientes",
              subtitle: "Snapshot atual — Central de Projetos",
              breakdown: { title: "Composição", rows: [
                { label: "Clientes ativos", value: fmtInt(kpis?.totalAtivos), tone: "success" },
                { label: "Clientes inativos (churn)", value: fmtInt(kpis?.churn), tone: "danger" },
                { label: "Churn Rate", value: kpis?.churnRate != null ? `${kpis.churnRate.toFixed(1)}%` : "—", tone: "danger" },
              ] },
              notes: [SRC_BASE.origem, `Cálculo: ${SRC_BASE.calculo ?? ""}`],
            };
            const openBase = (title: string, value: string) => setDrill({ ...baseBreakdown, title, value });
            return (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <MetricCard label="Clientes ativos" value={fmtInt(kpis?.totalAtivos)} large source={SRC_BASE} onClick={() => openBase("Clientes ativos", fmtInt(kpis?.totalAtivos))} />
                <MetricCard label="Clientes inativos (churn)" value={fmtInt(kpis?.churn)} tone="danger" source={SRC_BASE} onClick={() => openBase("Clientes inativos (churn)", fmtInt(kpis?.churn))} />
                <MetricCard
                  label="Churn Rate"
                  value={kpis?.churnRate != null ? `${kpis.churnRate.toFixed(1)}%` : "—"}
                  sublabel="Histórico total — ignora filtro de data"
                  tone="danger"
                  source={SRC_BASE}
                  onClick={() => openBase("Churn Rate", kpis?.churnRate != null ? `${kpis.churnRate.toFixed(1)}%` : "—")}
                />
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* ── Inadimplência (Oxy Finance) ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="h-4 w-4 text-muted-foreground" />Inadimplência — recebíveis vencidos</CardTitle>
          <p className="text-xs text-muted-foreground">Contas a receber em atraso, direto do Oxy Finance.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {receivables.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando recebíveis…
            </div>
          ) : (
            <>
              {(() => {
                const inadPayload: CeoMetricDialogPayload = {
                  title: "Inadimplência",
                  subtitle: periodLabel,
                  breakdown: { title: "Resumo", rows: [
                    { label: "Total inadimplente", value: fmtFull(receivables.total), tone: "danger" },
                    { label: "Clientes em atraso", value: fmtInt(clientesInad), tone: "danger" },
                    { label: "Ticket médio de dívida", value: fmt(clientesInad > 0 ? receivables.total / clientesInad : null) },
                  ] },
                  table: { title: "Top clientes em atraso", columns: [
                    { key: "label", label: "Cliente" },
                    { key: "total", label: "Total em atraso", align: "right", format: (r: any) => fmtFull(r.total) },
                    { key: "pct", label: "% do total", align: "right", format: (r: any) => receivables.total > 0 ? `${((r.total / receivables.total) * 100).toFixed(1)}%` : "—" },
                  ], rows: receivables.items as any },
                  notes: [SRC_INAD.origem, `Cálculo: ${SRC_INAD.calculo ?? ""}`],
                };
                const openInad = (title: string, value: string) => setDrill({ ...inadPayload, title, value });
                return (
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                    <MetricCard label="Total inadimplente" value={fmt(receivables.total)} tone="danger" large source={SRC_INAD} onClick={() => openInad("Total inadimplente", fmt(receivables.total))} />
                    <MetricCard label="Clientes em atraso" value={fmtInt(clientesInad)} tone="danger" source={SRC_INAD} onClick={() => openInad("Clientes em atraso", fmtInt(clientesInad))} />
                    <MetricCard
                      label="Ticket médio de dívida"
                      value={fmt(clientesInad > 0 ? receivables.total / clientesInad : null)}
                      source={SRC_INAD}
                      onClick={() => openInad("Ticket médio de dívida", fmt(clientesInad > 0 ? receivables.total / clientesInad : null))}
                    />
                  </div>
                );
              })()}

              {topInad.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Nenhum recebível vencido no período. ✅</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead className="text-right">Total em atraso</TableHead>
                        <TableHead className="text-right">% do total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topInad.map((c) => (
                        <TableRow key={c.label} className="cursor-pointer hover:bg-accent/40" onClick={() => setDrill({
                          title: `Cliente inadimplente: ${c.label}`,
                          value: fmtFull(c.total),
                          subtitle: periodLabel,
                          breakdown: { title: "Detalhes", rows: [
                            { label: "Total em atraso", value: fmtFull(c.total), tone: "danger" },
                            { label: "% do total inadimplente", value: receivables.total > 0 ? `${((c.total / receivables.total) * 100).toFixed(1)}%` : "—" },
                          ] },
                          notes: [SRC_INAD.origem],
                        })}>
                          <TableCell className="font-medium">{c.label}</TableCell>
                          <TableCell className="text-right tabular-nums">{fmtFull(c.total)}</TableCell>
                          <TableCell className="text-right tabular-nums text-xs text-muted-foreground">
                            {receivables.total > 0 ? `${((c.total / receivables.total) * 100).toFixed(1)}%` : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                      {receivables.items.length > topInad.length && (
                        <TableRow>
                          <TableCell className="text-xs italic text-muted-foreground">+ {receivables.items.length - topInad.length} outros clientes…</TableCell>
                          <TableCell className="text-right tabular-nums text-xs text-muted-foreground">
                            {fmtFull(receivables.items.slice(topInad.length).reduce((s, i) => s + i.total, 0))}
                          </TableCell>
                          <TableCell />
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
              <AiNoteAuto section="Financeiro" title="Base ativa e inadimplência" buildContext={() => ({ clientesAtivos: kpis?.totalAtivos, churn: kpis?.churn, churnRate: kpis?.churnRate, inadimplenciaTotal: receivables.total, clientesInadimplentes: clientesInad, top10Inadimplentes: topInad.slice(0,10).map((c: any) => ({ label: c.label, total: c.total })) })} />
            </>
          )}
        </CardContent>
      </Card>
      <CeoMetricDialog payload={drill} open={!!drill} onOpenChange={(o) => !o && setDrill(null)} />
    </div>
  );
}
