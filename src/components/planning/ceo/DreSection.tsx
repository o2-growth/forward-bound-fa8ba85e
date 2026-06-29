import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, FileSpreadsheet } from "lucide-react";
import { useOxyFinance } from "@/hooks/useOxyFinance";
import { fmt, fmtFull, MONTHS_PT, AiNote, AguardandoFonte } from "./ceoShared";

interface Props { dateRange: { from: Date; to: Date }; }

const BU_LABELS: { key: "modelo_atual" | "o2_tax" | "oxy_hacker" | "franquia"; label: string }[] = [
  { key: "modelo_atual", label: "Modelo Atual (CaaS)" },
  { key: "o2_tax", label: "O2 Tax" },
  { key: "oxy_hacker", label: "Oxy Hacker" },
  { key: "franquia", label: "Franquia" },
];

export function DreSection({ dateRange }: Props) {
  const oxy = useOxyFinance();

  const data = useMemo(() => {
    const monthsUpTo = MONTHS_PT.slice(0, dateRange.to.getMonth() + 1);
    const rows = BU_LABELS.map((bu) => {
      const byMonth = oxy.dreByBU?.[bu.key] ?? {};
      const cells = monthsUpTo.map((m) => byMonth[m] || 0);
      const total = cells.reduce((s, v) => s + v, 0);
      return { label: bu.label, cells, total };
    });
    const totalCells = monthsUpTo.map((_, i) => rows.reduce((s, r) => s + r.cells[i], 0));
    const grandTotal = totalCells.reduce((s, v) => s + v, 0);
    return { monthsUpTo, rows, totalCells, grandTotal };
  }, [oxy.dreByBU, dateRange.to]);

  if (oxy.isLoading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><FileSpreadsheet className="h-4 w-4 text-muted-foreground" />Receita por BU — mês a mês (acumulado do ano)</CardTitle>
          <p className="text-xs text-muted-foreground">Receita bruta realizada por BU (Oxy Finance), com total do ano.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>BU</TableHead>
                  {data.monthsUpTo.map((m) => <TableHead key={m} className="text-right">{m}</TableHead>)}
                  <TableHead className="text-right font-semibold">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.rows.map((r) => (
                  <TableRow key={r.label}>
                    <TableCell className="font-medium whitespace-nowrap">{r.label}</TableCell>
                    {r.cells.map((v, i) => <TableCell key={i} className="text-right tabular-nums">{v > 0 ? fmt(v, "") : "—"}</TableCell>)}
                    <TableCell className="text-right tabular-nums font-semibold">{fmtFull(r.total)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-t-2 bg-muted/30 font-semibold">
                  <TableCell>Total</TableCell>
                  {data.totalCells.map((v, i) => <TableCell key={i} className="text-right tabular-nums">{v > 0 ? fmt(v, "") : "—"}</TableCell>)}
                  <TableCell className="text-right tabular-nums">{fmtFull(data.grandTotal)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <AiNote />
        </CardContent>
      </Card>

      <AguardandoFonte
        titulo="DRE completo (P&L) — margem, EBITDA, resultado"
        descricao="Hoje o Oxy Finance expõe receita por BU, mas não as linhas completas do DRE. Para o que o CEO pediu, é preciso expor a estrutura de P&L."
        itens={[
          "DRE dos últimos 3 meses, mês a mês, com análise vertical (% sobre receita) e coluna de total",
          "DRE previsto x realizado MTD + projeção até o fim do mês",
          "Principais desvios do DRE",
          "Metas: Margem de contribuição ≥ 65% · EBITDA ≥ 35% · Resultado Líquido ≥ 20% · Resultado final ≥ 10%",
        ]}
      />
    </div>
  );
}
