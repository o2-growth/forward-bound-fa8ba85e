import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, FileSpreadsheet } from "lucide-react";
import { useOxyFinance } from "@/hooks/useOxyFinance";
import { fmt, fmtFull, fmtPct, MONTHS_PT, AiNote } from "./ceoShared";

interface Props { dateRange: { from: Date; to: Date }; }

// Estrutura canônica do P&L (na ordem apresentada) — labels vêm do Oxy DRE.
// Cada linha ou é um code de detalhe (RB, DC, CV, DX, RF, DF, RNO, DNO, PROV, AD, INV)
// ou um subtotal (RECEITA BRUTA, RECEITA LÍQUIDA, LUCRO BRUTO, EBITDA, RESULTADO LÍQUIDO, RESULTADO FINAL).
const PL_ORDER: { code: string; label?: string; kind: "subtotal" | "detail" | "detail-negative" }[] = [
  { code: "RECEITA BRUTA", kind: "subtotal" },
  { code: "DC", label: "(−) Deduções de Vendas", kind: "detail-negative" },
  { code: "RECEITA LÍQUIDA", kind: "subtotal" },
  { code: "CUSTOS VARIÁVEIS", label: "(−) Custos Variáveis", kind: "subtotal" },
  { code: "LUCRO BRUTO", kind: "subtotal" },
  { code: "DESPESAS FIXAS", label: "(−) Despesas Fixas", kind: "subtotal" },
  { code: "EBITDA", kind: "subtotal" },
  { code: "RF", label: "(+) Receitas Financeiras", kind: "detail" },
  { code: "DF", label: "(−) Despesas Financeiras", kind: "detail-negative" },
  { code: "RNO", label: "(+) Outras Receitas", kind: "detail" },
  { code: "DNO", label: "(−) Despesas Não Operacionais", kind: "detail-negative" },
  { code: "PROV", label: "(−) Provisão IRPJ/CSLL", kind: "detail-negative" },
  { code: "RESULTADO LÍQUIDO", kind: "subtotal" },
  { code: "AD", label: "(−) Amortização da Dívida", kind: "detail-negative" },
  { code: "INV", label: "(−) Investimentos", kind: "detail-negative" },
  { code: "RESULTADO FINAL", kind: "subtotal" },
];

export function DreSection({ dateRange }: Props) {
  const oxy = useOxyFinance();

  const data = useMemo(() => {
    const monthsUpTo = MONTHS_PT.slice(0, dateRange.to.getMonth() + 1);
    // agrupa linhas do DRE por code (soma quando há múltiplas ex: vários "CV")
    const byCode = new Map<string, Record<string, number>>();
    for (const line of oxy.dreLines || []) {
      const cur = byCode.get(line.code) || {};
      for (const m of monthsUpTo) cur[m] = (cur[m] || 0) + (line.byMonth[m as any] || 0);
      byCode.set(line.code, cur);
    }
    const rbTotal = MONTHS_PT.reduce((s, m) => s + ((byCode.get("RECEITA BRUTA")?.[m]) || 0), 0);
    const rows = PL_ORDER.map((row) => {
      const bm = byCode.get(row.code) || {};
      const cells = monthsUpTo.map((m) => bm[m] || 0);
      const total = cells.reduce((s, v) => s + v, 0);
      const av = rbTotal !== 0 ? (total / rbTotal) * 100 : null;
      const label = row.label ?? row.code;
      return { ...row, label, cells, total, av };
    });
    return { monthsUpTo, rows, rbTotal };
  }, [oxy.dreLines, dateRange.to]);

  if (oxy.isLoading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const hasData = (oxy.dreLines || []).length > 0;

  return (
    <div className="space-y-6">
      {/* ── Receita por BU (compat com versão anterior) ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><FileSpreadsheet className="h-4 w-4 text-muted-foreground" />Receita por BU — mês a mês (acumulado do ano)</CardTitle>
          <p className="text-xs text-muted-foreground">Receita bruta realizada por BU (Oxy Finance).</p>
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
                {([
                  { key: "modelo_atual", label: "Modelo Atual (CaaS)" },
                  { key: "o2_tax", label: "O2 Tax" },
                  { key: "oxy_hacker", label: "Oxy Hacker" },
                  { key: "franquia", label: "Franquia" },
                ] as const).map((bu) => {
                  const byMonth = oxy.dreByBU?.[bu.key] ?? ({} as Record<string, number>);
                  const cells = data.monthsUpTo.map((m) => byMonth[m] || 0);
                  const total = cells.reduce((s, v) => s + v, 0);
                  return (
                    <TableRow key={bu.key}>
                      <TableCell className="font-medium whitespace-nowrap">{bu.label}</TableCell>
                      {cells.map((v, i) => <TableCell key={i} className="text-right tabular-nums">{v > 0 ? fmt(v, "") : "—"}</TableCell>)}
                      <TableCell className="text-right tabular-nums font-semibold">{fmtFull(total)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ── P&L completo (nova) ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><FileSpreadsheet className="h-4 w-4 text-muted-foreground" />DRE completo (P&L) — mês a mês com análise vertical</CardTitle>
          <p className="text-xs text-muted-foreground">
            Estrutura completa do DRE realizada (Oxy Finance): Receita → Deduções → Custos Variáveis → Lucro Bruto → Despesas Fixas → <strong>EBITDA</strong> → Resultado Líquido → Resultado Final. Coluna AV% = análise vertical sobre Receita Bruta.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasData ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Sem dados do DRE Oxy no período.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[240px]">Linha</TableHead>
                    {data.monthsUpTo.map((m) => <TableHead key={m} className="text-right">{m}</TableHead>)}
                    <TableHead className="text-right font-semibold">Total</TableHead>
                    <TableHead className="text-right font-semibold w-[70px]">AV%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.rows.map((r) => {
                    const isSubtotal = r.kind === "subtotal";
                    const isNegative = r.kind === "detail-negative";
                    return (
                      <TableRow
                        key={r.code}
                        className={
                          isSubtotal
                            ? "border-t bg-muted/40 font-semibold"
                            : isNegative
                              ? "text-destructive/90"
                              : ""
                        }
                      >
                        <TableCell className={isSubtotal ? "font-semibold" : "pl-6 text-sm text-muted-foreground"}>{r.label}</TableCell>
                        {r.cells.map((v, i) => (
                          <TableCell key={i} className="text-right tabular-nums">
                            {v !== 0 ? fmt(v, "") : "—"}
                          </TableCell>
                        ))}
                        <TableCell className="text-right tabular-nums font-semibold">{r.total !== 0 ? fmtFull(r.total) : "—"}</TableCell>
                        <TableCell className="text-right tabular-nums text-xs text-muted-foreground">{r.av != null ? fmtPct(r.av) : "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          <AiNote />
        </CardContent>
      </Card>
    </div>
  );
}
