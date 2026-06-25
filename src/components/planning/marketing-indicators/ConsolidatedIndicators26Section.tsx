import { useMemo, useState } from "react";
import { ChevronDown, Download, Search, Table2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useIndicators26Raw, type Indicator26Row } from "@/hooks/useIndicators26Raw";
import { useIndicators26Live } from "@/hooks/useIndicators26Live";
import { IndicatorTrendDialog } from "./IndicatorTrendDialog";

// Chaves de meses puros (sem Q* nem totais) para o gráfico de tendência
const MONTH_TREND_KEYS: { key: string; label: string }[] = [
  { key: "jul25", label: "Jul/25" },
  { key: "ago25", label: "Ago/25" },
  { key: "set25", label: "Set/25" },
  { key: "out25", label: "Out/25" },
  { key: "nov25", label: "Nov/25" },
  { key: "dez25", label: "Dez/25" },
  { key: "jan", label: "Jan/26" },
  { key: "fev", label: "Fev/26" },
  { key: "mar", label: "Mar/26" },
  { key: "abr", label: "Abr/26" },
  { key: "mai", label: "Mai/26" },
  { key: "jun", label: "Jun/26" },
  { key: "jul", label: "Jul/26" },
  { key: "ago", label: "Ago/26" },
  { key: "set", label: "Set/26" },
  { key: "out", label: "Out/26" },
  { key: "nov", label: "Nov/26" },
  { key: "dez", label: "Dez/26" },
];

// Colunas que vêm da PLANILHA (histórico 2025 — fonte da verdade para 2025)
const SHEET_COL_KEYS = new Set([
  "jul25", "ago25", "set25", "q325",
  "out25", "nov25", "dez25", "q425",
]);

const MONTHS_2026: Array<{ key: string; label: string; idx: number }> = [
  { key: "jan", label: "Jan", idx: 0 },
  { key: "fev", label: "Fev", idx: 1 },
  { key: "mar", label: "Mar", idx: 2 },
  { key: "abr", label: "Abr", idx: 3 },
  { key: "mai", label: "Mai", idx: 4 },
  { key: "jun", label: "Jun", idx: 5 },
  { key: "jul", label: "Jul", idx: 6 },
  { key: "ago", label: "Ago", idx: 7 },
  { key: "set", label: "Set", idx: 8 },
  { key: "out", label: "Out", idx: 9 },
  { key: "nov", label: "Nov", idx: 10 },
  { key: "dez", label: "Dez", idx: 11 },
];

/**
 * Constrói as colunas dinamicamente: meses de 2026 até o mês atual (com Qs
 * inseridos quando o trimestre fecha), depois o bloco fixo de 2025 e TOTAL 2026.
 */
function buildCols(today: Date = new Date()): { key: string; label: string; strong?: boolean }[] {
  const isCurrentYear = today.getFullYear() === 2026;
  const lastMonth = today.getFullYear() > 2026 ? 11 : (isCurrentYear ? today.getMonth() : -1);
  const cols: { key: string; label: string; strong?: boolean }[] = [];
  const quarters: Array<{ afterIdx: number; key: string; label: string }> = [
    { afterIdx: 2, key: "q1", label: "Q1" },
    { afterIdx: 5, key: "q2", label: "Q2" },
    { afterIdx: 8, key: "q3", label: "Q3" },
    { afterIdx: 11, key: "q4", label: "Q4" },
  ];
  for (const m of MONTHS_2026) {
    if (m.idx > lastMonth) break;
    cols.push({ key: m.key, label: m.label });
    const q = quarters.find((q) => q.afterIdx === m.idx);
    if (q && m.idx <= lastMonth) cols.push({ key: q.key, label: q.label, strong: true });
  }
  // Bloco fixo de 2025 (planilha)
  cols.push(
    { key: "jul25", label: "Jul/25" },
    { key: "ago25", label: "Ago/25" },
    { key: "set25", label: "Set/25" },
    { key: "q325", label: "Q3/25", strong: true },
    { key: "out25", label: "Out/25" },
    { key: "nov25", label: "Nov/25" },
    { key: "dez25", label: "Dez/25" },
    { key: "q425", label: "Q4/25", strong: true },
    { key: "total2026", label: "TOTAL 2026", strong: true },
  );
  return cols;
}


type Fmt = "brl" | "int" | "pct" | "x" | "mes";

interface RowCfg {
  label: string;
  fmt: Fmt;
  /** benchmark para conditional formatting (linhas de eficiência) */
  bench?: number;
}

interface Group {
  title: string;
  rows: RowCfg[];
}

// Ordem e formato espelhando a aba "Indicadores 26" da planilha.
const GROUPS: Group[] = [
  {
    title: "Aquisição / Mídia",
    rows: [
      { label: "Mídia Google Ads", fmt: "brl" },
      { label: "Leads - Google Ads", fmt: "int" },
      { label: "CPL - Google Ads", fmt: "brl" },
      { label: "Mídia Meta Ads", fmt: "brl" },
      { label: "Leads - Meta Ads", fmt: "int" },
      { label: "CPL - Meta Ads", fmt: "brl" },
      { label: "Mídia total", fmt: "brl" },
      { label: "Leads totais", fmt: "int" },
      { label: "CPL total", fmt: "brl" },
      { label: "Leads no pipe", fmt: "int" },
      { label: "CPL no pipe", fmt: "brl" },
    ],
  },
  {
    title: "Funil MQL → Venda",
    rows: [
      { label: "MQL por Faturamento", fmt: "int" },
      { label: "CPMQL por Faturamento", fmt: "brl" },
      { label: "MQL/Leads (por Faturamento)", fmt: "pct" },
      { label: "SQL", fmt: "int" },
      { label: "CPSQL", fmt: "brl" },
      { label: "SQL/MQL", fmt: "pct" },
      { label: "SQL/Leads", fmt: "pct" },
      { label: "Tentativas de chamada", fmt: "int" },
      { label: "Chamadas atendidas", fmt: "int" },
      { label: "Conversas efetuadas", fmt: "int" },
      { label: "Taxa Tentativas/Atendidas", fmt: "pct" },
      { label: "Taxa MQL/RM (%)", fmt: "pct" },
      { label: "Reunião marcada", fmt: "int" },
      { label: "Conversas/marcadas", fmt: "pct" },
      { label: "CPRM", fmt: "brl" },
      { label: "Taxa RM/RR (%)", fmt: "pct" },
      { label: "No show", fmt: "int" },
      { label: "Reunião realizada", fmt: "int" },
      { label: "CPRR", fmt: "brl" },
      { label: "Proposta enviada", fmt: "int" },
      { label: "Taxa RR/Proposta (%)", fmt: "pct" },
      { label: "Vendas/MQL", fmt: "pct" },
      { label: "Vendas", fmt: "int" },
      { label: "CPV", fmt: "brl" },
      { label: "Taxa Proposta/Venda (%)", fmt: "pct" },
      { label: "Conversão MQL/Venda (%)", fmt: "pct" },
    ],
  },
  {
    title: "CAC & Unit Economics",
    rows: [
      { label: "CAC", fmt: "brl" },
      { label: "MRR", fmt: "brl" },
      { label: "Setup", fmt: "brl" },
      { label: "Pontual", fmt: "brl" },
      { label: "Educação", fmt: "brl" },
      { label: "GMV (Gross Merchandise Value)", fmt: "brl" },
      { label: "Run Rate", fmt: "brl" },
      { label: "ARR", fmt: "brl" },
      { label: "ARPU", fmt: "brl" },
      { label: "ARPU (MRR)", fmt: "brl" },
      { label: "ARPU (Setup)", fmt: "brl" },
      { label: "LT", fmt: "int" },
      { label: "LTV", fmt: "brl" },
      { label: "TCV (Total Contract Value)", fmt: "brl" },
      { label: "LTV/TCV", fmt: "pct" },
      { label: "Ads/GMV", fmt: "pct" },
      { label: "Margem Bruta", fmt: "pct" },
      { label: "LTV Final", fmt: "brl" },
    ],
  },
  {
    title: "Base & Retenção",
    rows: [
      { label: "Clientes ativos", fmt: "int" },
      { label: "MRR base", fmt: "brl" },
      { label: "Receita bruta", fmt: "brl" },
      { label: "Risco de churn", fmt: "int" },
      { label: "Pedido de churn", fmt: "int" },
      { label: "Logo Churn", fmt: "int" },
      { label: "% Logo Churn", fmt: "pct" },
      { label: "Revenue Churn", fmt: "brl" },
      { label: "% Revenue Churn", fmt: "pct" },
      { label: "Net Customer Growth", fmt: "int" },
      { label: "% Net Customer Growth", fmt: "pct" },
      { label: "Net Revenue Retention", fmt: "brl" },
      { label: "% Net Revenue Retention", fmt: "pct" },
    ],
  },
  {
    title: "Eficiência & Retorno",
    rows: [
      { label: "Time e ferramentas", fmt: "brl" },
      { label: "Despesas totais", fmt: "brl" },
      { label: "Headcount", fmt: "int" },
      { label: "Revenue per Employee", fmt: "brl" },
      { label: "ROAS", fmt: "x", bench: 1 },
      { label: "ROAS LTV", fmt: "x", bench: 1 },
      { label: "LTV/CAC", fmt: "x", bench: 3 },
      { label: "CAC Payback", fmt: "mes" },
      { label: "CAC Payback (MRR)", fmt: "mes" },
      { label: "ROI", fmt: "x", bench: 1 },
      { label: "ROI LTV", fmt: "x", bench: 1 },
      { label: "ROI LTV Final", fmt: "x", bench: 1 },
    ],
  },
];

// COLS é gerado dinamicamente via buildCols() dentro do componente.


const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

function fmtValue(v: number | null | undefined, fmt: Fmt): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  switch (fmt) {
    case "brl":
      return v.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 0,
      });
    case "int":
      return v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
    case "pct":
      return `${(v * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
    case "x":
      return `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}x`;
    case "mes":
      return `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} m`;
  }
}

export function ConsolidatedIndicators26Section() {
  const { rows: sheetRows, lastUpdate, isFallback, isLoading } = useIndicators26Raw();
  const { rows: liveRows, lastUpdate: liveUpdate, isLoading: liveLoading } = useIndicators26Live();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [trendRow, setTrendRow] = useState<{ label: string; fmt: Fmt; bench?: number } | null>(null);

  // Colunas dinâmicas: 2026 até mês atual + Qs fechados + bloco fixo 2025 + TOTAL 2026.
  const COLS = useMemo(() => buildCols(new Date()), []);
  const LIVE_COL_KEYS = useMemo(() => {
    const s = new Set<string>();
    for (const c of COLS) if (!SHEET_COL_KEYS.has(c.key)) s.add(c.key);
    return s;
  }, [COLS]);

  // Index ao vivo por label normalizado
  const liveMap = useMemo(() => {
    const m = new Map<string, Record<string, number | null>>();
    for (const r of liveRows) m.set(normalize(r.label), r.values as Record<string, number | null>);
    return m;
  }, [liveRows]);

  // Merge: 2026 (LIVE_COL_KEYS) vem do live; 2025 (jul25..q425) vem da planilha
  const rowMap = useMemo(() => {
    const m = new Map<string, Indicator26Row>();
    const allLabels = new Set<string>();
    for (const r of sheetRows) allLabels.add(normalize(r.label));
    for (const r of liveRows) allLabels.add(normalize(r.label));

    const sheetMap = new Map<string, Indicator26Row>();
    for (const r of sheetRows) sheetMap.set(normalize(r.label), r);

    for (const labelKey of allLabels) {
      const sheetRow = sheetMap.get(labelKey);
      const liveVals = liveMap.get(labelKey);
      const label = sheetRow?.label || liveRows.find((r) => normalize(r.label) === labelKey)?.label || "";
      const merged: Record<string, number | null> = {};
      for (const c of COLS) {
        if (LIVE_COL_KEYS.has(c.key)) {
          merged[c.key] = liveVals?.[c.key] ?? null;
        } else {
          merged[c.key] = sheetRow?.values?.[c.key] ?? null;
        }
      }
      m.set(labelKey, { label, values: merged });
    }
    return m;
  }, [sheetRows, liveRows, liveMap, COLS, LIVE_COL_KEYS]);


  const q = normalize(query);

  const handleExportCsv = () => {
    const header = ["Indicador", ...COLS.map((c) => c.label)].join(";");
    const lines: string[] = [header];
    for (const g of GROUPS) {
      for (const cfg of g.rows) {
        const row = rowMap.get(normalize(cfg.label));
        const cells = COLS.map((c) => {
          const v = row?.values?.[c.key];
          return v === null || v === undefined ? "" : String(v).replace(".", ",");
        });
        lines.push([cfg.label, ...cells].join(";"));
      }
    }
    const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "indicadores-26.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CollapsibleTrigger className="flex items-center gap-2 text-left group">
              <Table2 className="h-5 w-5 text-primary" />
              <div>
                <h3 className="text-lg font-semibold">Visão Total — Indicadores 26</h3>
                <p className="text-xs text-muted-foreground">
                  2026 ao vivo (Pipefy + Meta/Google Ads + Oxy Finance) · 2025 da planilha
                  {lastUpdate ? ` · planilha atualizada em ${lastUpdate}` : ""}
                </p>
              </div>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform",
                  open && "rotate-180",
                )}
              />
            </CollapsibleTrigger>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-emerald-600 border-emerald-500/40">
                2026 · Ao vivo{liveLoading ? " (carregando…)" : ""}
              </Badge>
              {isFallback && (
                <Badge variant="outline" className="text-amber-600 border-amber-500/40">
                  2025 · Snapshot (planilha indisponível)
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar indicador..."
                  className="pl-8"
                />
              </div>
              <Button variant="outline" size="sm" className="gap-2" onClick={handleExportCsv}>
                <Download className="h-4 w-4" />
                Exportar CSV
              </Button>
            </div>

            {isLoading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Carregando…</p>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="sticky left-0 z-10 bg-muted/30 px-3 py-2 text-left font-semibold min-w-[200px]">
                        Indicador
                      </th>
                      {COLS.map((c) => (
                        <th
                          key={c.key}
                          className={cn(
                            "px-3 py-2 text-right font-medium whitespace-nowrap",
                            c.strong && "bg-muted/60 font-semibold",
                          )}
                        >
                          {c.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {GROUPS.map((g) => {
                      const visibleRows = g.rows.filter(
                        (cfg) => !q || normalize(cfg.label).includes(q),
                      );
                      if (visibleRows.length === 0) return null;
                      return (
                        <GroupBlock key={g.title} title={g.title} rows={visibleRows} rowMap={rowMap} cols={COLS} onRowClick={(cfg) => setTrendRow({ label: cfg.label, fmt: cfg.fmt, bench: cfg.bench })} />
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>

      {trendRow && (
        <IndicatorTrendDialog
          open={!!trendRow}
          onOpenChange={(v) => !v && setTrendRow(null)}
          label={trendRow.label}
          fmt={trendRow.fmt}
          bench={trendRow.bench}
          series={MONTH_TREND_KEYS.map((m) => ({
            key: m.key,
            label: m.label,
            value: rowMap.get(normalize(trendRow.label))?.values?.[m.key] ?? null,
          }))}
        />
      )}
    </Card>
  );
}


function GroupBlock({
  title,
  rows,
  rowMap,
  cols,
  onRowClick,
}: {
  title: string;
  rows: RowCfg[];
  rowMap: Map<string, Indicator26Row>;
  cols: { key: string; label: string; strong?: boolean }[];
  onRowClick?: (cfg: RowCfg) => void;
}) {
  return (
    <>
      <tr>
        <td
          colSpan={cols.length + 1}
          className="sticky left-0 bg-primary/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-primary"
        >
          {title}
        </td>
      </tr>
      {rows.map((cfg) => {
        const row = rowMap.get(normalize(cfg.label));
        return (
          <tr
            key={cfg.label}
            onClick={() => onRowClick?.(cfg)}
            className="border-b last:border-0 hover:bg-primary/5 cursor-pointer transition-colors"
            title="Clique para ver evolução mês a mês"
          >
            <td className="sticky left-0 z-10 bg-background px-3 py-1.5 text-left font-medium whitespace-nowrap group-hover:bg-primary/5">
              {cfg.label}
            </td>

            {cols.map((c) => {
              const v = row?.values?.[c.key] ?? null;
              const good =
                cfg.bench !== undefined && v !== null ? v >= cfg.bench : undefined;
              return (
                <td
                  key={c.key}
                  className={cn(
                    "px-3 py-1.5 text-right tabular-nums whitespace-nowrap",
                    c.strong && "bg-muted/40 font-medium",
                    good === true && "text-emerald-600",
                    good === false && "text-destructive",
                  )}
                >
                  {fmtValue(v, cfg.fmt)}
                </td>
              );
            })}
          </tr>
        );
      })}
    </>
  );
}

