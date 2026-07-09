import { useMemo, useState } from "react";
import { CeoMetricDialog, type CeoMetricDialogPayload } from "./CeoMetricDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Banknote, TrendingDown } from "lucide-react";
import { useOxyFinance } from "@/hooks/useOxyFinance";
import { useOxyExpenses } from "@/hooks/useOxyExpenses";
import { fmt, fmtFull, MetricCard, AiNote, AiNoteAuto, MONTHS_PT, type MetricSource } from "./ceoShared";

interface Props { dateRange: { from: Date; to: Date }; }

const SRC_CASH: MetricSource = {
  origem: "useOxyFinance — fluxo de caixa (daily_revenue + cashflow Oxy)",
  periodo: "Filtra pelo período selecionado; acumulado começa em zero no início do intervalo.",
  calculo: "Entradas − saídas = saldo do mês; acumulado soma os meses anteriores dentro do período.",
};

const SRC_EXP: MetricSource = {
  origem: "Oxy Finance — DRE (linhas de custo/despesa: CV, DX, DF, DNO, AD, INV, PROV)",
  periodo: "Filtra pelo período selecionado (meses do ano corrente)",
  calculo:
    "Soma por rubrica contábil do DRE Oxy no intervalo. Mesma fonte do P&L exibido na aba DRE — consistência automática.",
};

export function CaixaSection({ dateRange }: Props) {
  const oxy = useOxyFinance();
  const expenses = useOxyExpenses({ startDate: dateRange.from, endDate: dateRange.to });
  const OXY_YEAR = 2026;
  const [drill, setDrill] = useState<CeoMetricDialogPayload | null>(null);
  const periodLabel = `${dateRange.from.toLocaleDateString("pt-BR")} – ${dateRange.to.toLocaleDateString("pt-BR")}`;

  const data = useMemo(() => {
    // Achado #3 auditoria CEO — iterar por Date e ignorar meses fora do ano Oxy.
    const monthsInRange = new Set<string>();
    let outOfYear = 0;
    const start = new Date(dateRange.from.getFullYear(), dateRange.from.getMonth(), 1);
    const end = new Date(dateRange.to.getFullYear(), dateRange.to.getMonth(), 1);
    for (let d = start; d <= end; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
      if (d.getFullYear() === OXY_YEAR) monthsInRange.add(MONTHS_PT[d.getMonth()]);
      else outOfYear++;
    }
    const chart = (oxy.cashflowChart ?? []).filter((p) => p.month && monthsInRange.has(p.month));
    let acc = 0;
    const rows = chart.map((p) => {
      acc += (p.inflows || 0) - (p.outflows || 0);
      return { month: p.month, inflows: p.inflows || 0, outflows: p.outflows || 0, balance: p.balance || 0, acumulado: acc };
    });
    const totalIn = rows.reduce((s, r) => s + r.inflows, 0);
    const totalOut = rows.reduce((s, r) => s + r.outflows, 0);
    return { rows, totalIn, totalOut, saldo: totalIn - totalOut, outOfYear };
  }, [oxy.cashflowChart, dateRange.from, dateRange.to]);


  const topSaidas = useMemo(() => expenses.items.slice(0, 20), [expenses.items]);

  if (oxy.isLoading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><Banknote className="h-4 w-4 text-muted-foreground" />Fluxo de caixa — mês a mês (período selecionado)</CardTitle>
          <p className="text-xs text-muted-foreground">Entradas, saídas, saldo do mês e acumulado dentro do intervalo escolhido.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <MetricCard label="Entradas (período)" value={fmt(data.totalIn)} tone="success" source={SRC_CASH} />
            <MetricCard label="Saídas (período)" value={fmt(data.totalOut)} tone="danger" source={SRC_CASH} />
            <MetricCard label="Saldo (período)" value={fmt(data.saldo)} large source={SRC_CASH} />
          </div>
          {data.outOfYear > 0 && (
            <p className="text-xs text-amber-600">⚠ {data.outOfYear} {data.outOfYear === 1 ? "mês foi ignorado" : "meses foram ignorados"} por estar(em) fora do ano carregado pelo Oxy Finance (2026).</p>
          )}
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
          <p className="text-xs text-muted-foreground">Rubricas contábeis de custo/despesa do DRE Oxy (mesma fonte do P&L).</p>
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
              <AiNoteAuto section="Caixa" title="Fluxo de caixa e saídas" buildContext={() => ({ meses: data.rows, totalEntradas: data.totalIn, totalSaidas: data.totalOut, top10Saidas: topSaidas.slice(0,10).map((c: any) => ({ label: c.label, total: c.total })) })} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
