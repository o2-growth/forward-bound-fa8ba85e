import { useMemo } from "react";
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
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <MetricCard label="Clientes ativos" value={fmtInt(kpis?.totalAtivos)} large source={SRC_BASE} />
            <MetricCard label="Clientes inativos (churn)" value={fmtInt(kpis?.churn)} tone="danger" source={SRC_BASE} />
            <MetricCard
              label="Churn Rate"
              value={kpis?.churnRate != null ? `${kpis.churnRate.toFixed(1)}%` : "—"}
              sublabel="Histórico total — ignora filtro de data"
              tone="danger"
              source={SRC_BASE}
            />
          </div>
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
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <MetricCard label="Total inadimplente" value={fmt(receivables.total)} tone="danger" large source={SRC_INAD} />
                <MetricCard label="Clientes em atraso" value={fmtInt(clientesInad)} tone="danger" source={SRC_INAD} />
                <MetricCard
                  label="Ticket médio de dívida"
                  value={fmt(clientesInad > 0 ? receivables.total / clientesInad : null)}
                  source={SRC_INAD}
                />
              </div>

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
                        <TableRow key={c.label}>
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
    </div>
  );
}
