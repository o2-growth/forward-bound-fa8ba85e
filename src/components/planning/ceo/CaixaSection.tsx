import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Banknote, TrendingDown } from "lucide-react";
import { useOxyFinance } from "@/hooks/useOxyFinance";
import { useOxyExpenses } from "@/hooks/useOxyExpenses";
import { fmt, fmtFull, MetricCard, AiNote, type MetricSource } from "./ceoShared";

interface Props { dateRange: { from: Date; to: Date }; }

const SRC_CASH: MetricSource = {
  origem: "useOxyFinance — fluxo de caixa (daily_revenue + cashflow Oxy)",
  periodo: "Mês a mês do ano corrente",
  calculo: "Entradas − saídas = saldo do mês; acumulado soma os meses anteriores.",
};

const SRC_EXP: MetricSource = {
  origem: "Oxy Finance — Saídas detalhadas (cashflow_details, movimentType=D)",
  periodo: "Filtra pelo período selecionado",
  calculo: "Soma das saídas por categoria/fornecedor no período.",
};

export function CaixaSection({ dateRange }: Props) {
  const oxy = useOxyFinance();
  const expenses = useOxyExpenses({ startDate: dateRange.from, endDate: dateRange.to });

  const data = useMemo(() => {
    const chart = (oxy.cashflowChart ?? []).filter((p) => p.month);
    let acc = 0;
    const rows = chart.map((p) => {
      acc += (p.inflows || 0) - (p.outflows || 0);
      return { month: p.month, inflows: p.inflows || 0, outflows: p.outflows || 0, balance: p.balance || 0, acumulado: acc };
    });
    const totalIn = rows.reduce((s, r) => s + r.inflows, 0);
    const totalOut = rows.reduce((s, r) => s + r.outflows, 0);
    return { rows, totalIn, totalOut, saldo: totalIn - totalOut };
  }, [oxy.cashflowChart]);

  const topSaidas = useMemo(() => expenses.items.slice(0, 20), [expenses.items]);

  if (oxy.isLoading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><Banknote className="h-4 w-4 text-muted-foreground" />Fluxo de caixa acumulado do ano — mês a mês</CardTitle>
          <p className="text-xs text-muted-foreground">Entradas, saídas, saldo do mês e acumulado do ano.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <MetricCard label="Entradas (ano)" value={fmt(data.totalIn)} tone="success" source={SRC_CASH} />
            <MetricCard label="Saídas (ano)" value={fmt(data.totalOut)} tone="danger" source={SRC_CASH} />
            <MetricCard label="Saldo (ano)" value={fmt(data.saldo)} large source={SRC_CASH} />
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mês</TableHead>
                  <TableHead className="text-right">Entradas</TableHead>
                  <TableHead className="text-right">Saídas</TableHead>
                  <TableHead className="text-right">Saldo do mês</TableHead>
                  <TableHead className="text-right font-semibold">Acumulado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.rows.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground">Sem dados de fluxo de caixa.</TableCell></TableRow>
                ) : data.rows.map((r) => (
                  <TableRow key={r.month}>
                    <TableCell className="font-medium">{r.month}</TableCell>
                    <TableCell className="text-right tabular-nums text-green-600 dark:text-green-400">{fmt(r.inflows, "")}</TableCell>
                    <TableCell className="text-right tabular-nums text-destructive">{fmt(r.outflows, "")}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmt(r.inflows - r.outflows, "")}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">{fmtFull(r.acumulado)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ── Principais saídas (Oxy Finance) ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><TrendingDown className="h-4 w-4 text-muted-foreground" />Principais saídas do período</CardTitle>
          <p className="text-xs text-muted-foreground">Top fornecedores / categorias por valor pago, direto do Oxy Finance.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {expenses.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando saídas…
            </div>
          ) : topSaidas.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Sem saídas registradas no período.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <MetricCard label="Total de saídas (período)" value={fmt(expenses.total)} tone="danger" large source={SRC_EXP} />
                <MetricCard label="Itens diferentes" value={String(expenses.items.length)} source={SRC_EXP} />
                <MetricCard label="Top 1 representa" value={expenses.total > 0 ? `${((topSaidas[0].total / expenses.total) * 100).toFixed(1)}%` : "—"} sublabel={topSaidas[0]?.label} source={SRC_EXP} />
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Categoria / Fornecedor</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">% do total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topSaidas.map((c) => (
                      <TableRow key={c.label}>
                        <TableCell className="font-medium">{c.label}</TableCell>
                        <TableCell className="text-right tabular-nums">{fmtFull(c.total)}</TableCell>
                        <TableCell className="text-right tabular-nums text-xs text-muted-foreground">
                          {expenses.total > 0 ? `${((c.total / expenses.total) * 100).toFixed(1)}%` : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                    {expenses.items.length > topSaidas.length && (
                      <TableRow>
                        <TableCell className="text-xs italic text-muted-foreground">+ {expenses.items.length - topSaidas.length} outros…</TableCell>
                        <TableCell className="text-right tabular-nums text-xs text-muted-foreground">
                          {fmtFull(expenses.items.slice(topSaidas.length).reduce((s, i) => s + i.total, 0))}
                        </TableCell>
                        <TableCell />
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <AiNote />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
