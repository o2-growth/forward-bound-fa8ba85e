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
    // Respeita o filtro de período: usa apenas os meses entre from..to (mesmo ano).
    const fromMonth = dateRange.from.getMonth();
    const toMonth = dateRange.to.getMonth();
    const monthsInRange = MONTHS_PT.slice(fromMonth, toMonth + 1);
    // agrupa linhas do DRE por code (soma quando há múltiplas ex: vários "CV")
    const byCode = new Map<string, Record<string, number>>();
    for (const line of oxy.dreLines || []) {
      const cur = byCode.get(line.code) || {};
      for (const m of monthsInRange) cur[m] = (cur[m] || 0) + (line.byMonth[m as any] || 0);
      byCode.set(line.code, cur);
    }
    // AV% mantém como base a Receita Bruta do MESMO período filtrado
    const rbTotal = monthsInRange.reduce((s, m) => s + ((byCode.get("RECEITA BRUTA")?.[m]) || 0), 0);
    const rows = PL_ORDER.map((row) => {
      const bm = byCode.get(row.code) || {};
      const cells = monthsInRange.map((m) => bm[m] || 0);
      const total = cells.reduce((s, v) => s + v, 0);
      const av = rbTotal !== 0 ? (total / rbTotal) * 100 : null;
      const label = row.label ?? row.code;
      return { ...row, label, cells, total, av };
    });
    return { monthsUpTo: monthsInRange, rows, rbTotal, byCode };
  }, [oxy.dreLines, dateRange.from, dateRange.to]);

  // ─── Receita por BU (100% Oxy Finance) ──────────────────────────────────────
  const receitaPorBu = useMemo(() => {
    const months = data.monthsUpTo;
    const rbByMonth = months.map((m) => data.byCode.get("RECEITA BRUTA")?.[m] || 0);
    const rbTotal = rbByMonth.reduce((s, v) => s + v, 0);

    const buLines: {
      key: string;
      label: string;
      kind: "detail" | "subtotal" | "residual";
      cells: number[];
      total: number;
    }[] = [
      { key: "caas", label: "CaaS (Modelo Atual)", kind: "detail",
        cells: months.map((m) => oxy.caasByMonth?.[m as any] || 0), total: 0 },
      { key: "saas", label: "SaaS (Modelo Atual)", kind: "detail",
        cells: months.map((m) => oxy.saasByMonth?.[m as any] || 0), total: 0 },
      { key: "o2_tax", label: "O2 TAX", kind: "detail",
        cells: months.map((m) => oxy.dreByBU?.o2_tax?.[m as any] || 0), total: 0 },
      { key: "oxy_hacker", label: "Oxy Hacker", kind: "detail",
        cells: months.map((m) => oxy.dreByBU?.oxy_hacker?.[m as any] || 0), total: 0 },
      { key: "franquia", label: "Franquia", kind: "detail",
        cells: months.map((m) => oxy.dreByBU?.franquia?.[m as any] || 0), total: 0 },
      { key: "expansao", label: "Expansão (Oxy Hacker + Franquia)", kind: "subtotal",
        cells: months.map((m) => oxy.expansaoByMonth?.[m as any] || 0), total: 0 },
    ];
    for (const r of buLines) r.total = r.cells.reduce((s, v) => s + v, 0);

    // Total classificado = CaaS + SaaS + O2 TAX + Expansão (evita dupla contagem com Oxy Hacker/Franquia)
    const classifiedByMonth = months.map((_, i) =>
      (buLines[0].cells[i] || 0) + (buLines[1].cells[i] || 0) +
      (buLines[2].cells[i] || 0) + (buLines[5].cells[i] || 0)
    );
    const classifiedTotal = classifiedByMonth.reduce((s, v) => s + v, 0);

    // Resíduo (RB Oxy − classificado) → linha "Outros / não classificado"
    const outrosCells = rbByMonth.map((v, i) => v - (classifiedByMonth[i] || 0));
    const outrosTotal = outrosCells.reduce((s, v) => s + v, 0);
    const hasOutros = Math.abs(outrosTotal) > 0.5;

    const totalCells = rbByMonth;
    const totalTotal = rbTotal;

    // Diff pct entre "Total classificado + Outros" e RB — deve ser ~0
    const diffPct = rbTotal !== 0 ? Math.abs((classifiedTotal + outrosTotal - rbTotal) / rbTotal) * 100 : 0;

    return { months, buLines, outrosCells, outrosTotal, hasOutros, totalCells, totalTotal, diffPct };
  }, [data.monthsUpTo, data.byCode, oxy.caasByMonth, oxy.saasByMonth, oxy.dreByBU, oxy.expansaoByMonth]);


  if (oxy.isLoading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const hasData = (oxy.dreLines || []).length > 0;

  return (
    <div className="space-y-6">
      {/* ── Receita por BU (100% Oxy Finance) ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><FileSpreadsheet className="h-4 w-4 text-muted-foreground" />Receita por BU — mês a mês (período selecionado)</CardTitle>
          <p className="text-xs text-muted-foreground">Receita bruta realizada por BU, direto da API Oxy Finance (mesma fonte do DRE completo abaixo). O total bate com a linha "RECEITA BRUTA" do P&L.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>BU</TableHead>
                  {receitaPorBu.months.map((m) => <TableHead key={m} className="text-right">{m}</TableHead>)}
                  <TableHead className="text-right font-semibold">Total</TableHead>
                  <TableHead className="text-right font-semibold w-[70px]">AV%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receitaPorBu.buLines.map((bu) => {
                  const isSubtotal = bu.kind === "subtotal";
                  const av = receitaPorBu.totalTotal !== 0 ? (bu.total / receitaPorBu.totalTotal) * 100 : null;
                  return (
                    <TableRow key={bu.key} className={isSubtotal ? "bg-muted/30" : ""}>
                      <TableCell className={isSubtotal ? "font-semibold whitespace-nowrap" : "font-medium whitespace-nowrap"}>{bu.label}</TableCell>
                      {bu.cells.map((v, i) => <TableCell key={i} className="text-right tabular-nums">{v !== 0 ? fmt(v, "") : "—"}</TableCell>)}
                      <TableCell className="text-right tabular-nums font-semibold">{bu.total !== 0 ? fmtFull(bu.total) : "—"}</TableCell>
                      <TableCell className="text-right tabular-nums text-xs text-muted-foreground">{av != null ? fmtPct(av) : "—"}</TableCell>
                    </TableRow>
                  );
                })}
                {receitaPorBu.hasOutros && (
                  <TableRow className="text-muted-foreground italic">
                    <TableCell className="whitespace-nowrap">Outros / não classificado</TableCell>
                    {receitaPorBu.outrosCells.map((v, i) => <TableCell key={i} className="text-right tabular-nums">{v !== 0 ? fmt(v, "") : "—"}</TableCell>)}
                    <TableCell className="text-right tabular-nums">{fmtFull(receitaPorBu.outrosTotal)}</TableCell>
                    <TableCell className="text-right tabular-nums text-xs">{receitaPorBu.totalTotal !== 0 ? fmtPct((receitaPorBu.outrosTotal / receitaPorBu.totalTotal) * 100) : "—"}</TableCell>
                  </TableRow>
                )}
                <TableRow className="border-t bg-muted/50 font-semibold">
                  <TableCell className="whitespace-nowrap">Total período (RB Oxy)</TableCell>
                  {receitaPorBu.totalCells.map((v, i) => <TableCell key={i} className="text-right tabular-nums">{v !== 0 ? fmt(v, "") : "—"}</TableCell>)}
                  <TableCell className="text-right tabular-nums">{fmtFull(receitaPorBu.totalTotal)}</TableCell>
                  <TableCell className="text-right tabular-nums text-xs">100%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          {receitaPorBu.diffPct > 0.5 && (
            <p className="text-xs text-amber-600">⚠ Diferença de {fmtPct(receitaPorBu.diffPct)} entre a soma das BUs classificadas e a Receita Bruta Oxy — parte da receita não tem BU mapeada na Oxy (ver linha "Outros / não classificado").</p>
          )}
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
