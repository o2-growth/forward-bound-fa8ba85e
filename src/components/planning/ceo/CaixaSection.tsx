import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Banknote } from "lucide-react";
import { useOxyFinance } from "@/hooks/useOxyFinance";
import { fmt, fmtFull, MetricCard, AiNote, AguardandoFonte, type MetricSource } from "./ceoShared";

interface Props { dateRange: { from: Date; to: Date }; }

const SRC: MetricSource = {
  origem: "useOxyFinance — fluxo de caixa (daily_revenue + cashflow Oxy)",
  periodo: "Mês a mês do ano corrente",
  calculo: "Entradas − saídas = saldo do mês; acumulado soma os meses anteriores.",
};

export function CaixaSection({ dateRange }: Props) {
  const oxy = useOxyFinance();

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
            <MetricCard label="Entradas (ano)" value={fmt(data.totalIn)} tone="success" source={SRC} />
            <MetricCard label="Saídas (ano)" value={fmt(data.totalOut)} tone="danger" source={SRC} />
            <MetricCard label="Saldo (ano)" value={fmt(data.saldo)} large source={SRC} />
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
          <AiNote />
        </CardContent>
      </Card>

      <AguardandoFonte
        titulo="Projeções e detalhamento de caixa"
        descricao="O fluxo realizado existe, mas faltam as projeções e o detalhamento de saídas que o CEO pediu."
        itens={[
          "FCX projetado 30 / 60 / 90 dias",
          "FCX acumulado detalhado (maior → menor) com análise vertical %",
          "Previsto x realizado (Oxy — fluxo de caixa detalhado)",
          "Principais saídas por data, categoria, subcategoria e fornecedor",
        ]}
      />
    </div>
  );
}
