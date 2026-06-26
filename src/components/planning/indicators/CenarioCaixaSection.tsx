import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info, Eye } from "lucide-react";
import { DetailSheet, type DetailItem, columnFormatters } from "./DetailSheet";
import {
  aggregateByTemperatura,
  computeCashFromCard,
  CASH_RULES,
  type AggregateInput,
  type BuLabel,
} from "./temperaturaAggregator";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(v);

const formatPct = (v: number) =>
  `${(v * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

// Resumo da regra por BU (texto curto entre parênteses)
const BU_RULE_SHORT: Record<string, string> = {
  "Modelo Atual": "75% Setup + 50% Pontual",
  Outbound: "75% Setup + 50% Pontual",
  Franquia: "70% do Pontual",
  "Oxy Hacker": "70% do Pontual",
  "Monetização": "sem entrada de caixa",
};

type Cenario = "Realista" | "Otimista";

interface CenarioData {
  items: DetailItem[]; // items com mrr/setup/pontual/total já em valor de CAIXA
  total: number;
  grossTotal: number; // soma bruta antes das % (MRR+Setup+Pontual)
  byBu: Record<
    string,
    { total: number; gross: number; count: number; pontualGross: number; setupGross: number; mrrGross: number }
  >;
  count: number;
}

function buildCenario(sourceItems: DetailItem[]): CenarioData {
  const byBu: CenarioData["byBu"] = {};
  let total = 0;
  let grossTotal = 0;
  const items: DetailItem[] = sourceItems.map((it) => {
    const cash = computeCashFromCard(it);
    const grossItem = (it.mrr || 0) + (it.setup || 0) + (it.pontual || 0);
    total += cash.total;
    grossTotal += grossItem;
    const bu = (it.bu as string) || "—";
    if (!byBu[bu])
      byBu[bu] = {
        total: 0,
        gross: 0,
        count: 0,
        pontualGross: 0,
        setupGross: 0,
        mrrGross: 0,
      };
    byBu[bu].total += cash.total;
    byBu[bu].gross += grossItem;
    byBu[bu].count += 1;
    byBu[bu].pontualGross += it.pontual || 0;
    byBu[bu].setupGross += it.setup || 0;
    byBu[bu].mrrGross += it.mrr || 0;
    return {
      ...it,
      mrr: cash.mrr,
      setup: cash.setup,
      pontual: cash.pontual,
      total: cash.total,
      regra: BU_RULE_SHORT[bu] || "—",
    } as DetailItem;
  });
  return { items, total, grossTotal, byBu, count: sourceItems.length };
}

const BU_BAR_COLOR: Record<string, string> = {
  "Modelo Atual": "bg-primary",
  Outbound: "bg-blue-500",
  Franquia: "bg-green-500",
  "Oxy Hacker": "bg-purple-500",
  "Monetização": "bg-orange-500",
};

export function CenarioCaixaSection(props: AggregateInput) {
  const [openCenario, setOpenCenario] = useState<Cenario | null>(null);

  const { buckets, activeLabels } = useMemo(
    () => aggregateByTemperatura(props),
    [
      props.modeloAtualAnalytics,
      props.franquiaAnalytics,
      props.oxyHackerAnalytics,
      props.outboundAnalytics,
      props.selectedBUs,
      props.startDate,
      props.endDate,
    ],
  );

  const realista = useMemo(() => buildCenario(buckets.Quente), [buckets]);
  const otimista = useMemo(
    () => buildCenario([...buckets.Quente, ...buckets.Morno]),
    [buckets],
  );

  if (realista.count === 0 && otimista.count === 0) return null;

  const scopeLabel = activeLabels.join(" + ");

  const renderCenarioCard = (label: Cenario, data: CenarioData, emoji: string) => {
    const buEntries = Object.entries(data.byBu).sort(
      (a, b) => b[1].total - a[1].total,
    );
    const efetiva = data.grossTotal > 0 ? data.total / data.grossTotal : 0;
    return (
      <div className="flex flex-col rounded-lg border p-4 gap-3">
        <div className="flex items-baseline justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{emoji}</span>
            <span className="text-sm font-semibold">{label}</span>
          </div>
          <Badge variant="secondary" className="text-[10px]">
            {data.count} {data.count === 1 ? "card" : "cards"}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-2xl font-bold">{formatCurrency(data.total)}</div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm text-xs">
                <p className="font-semibold mb-1">Como esse valor foi calculado</p>
                <ul className="space-y-0.5">
                  <li>
                    Soma bruta dos cards (MRR+Setup+Pontual):{" "}
                    <span className="font-medium">
                      {formatCurrency(data.grossTotal)}
                    </span>
                  </li>
                  <li>
                    Caixa projetado após aplicar % por BU:{" "}
                    <span className="font-medium">
                      {formatCurrency(data.total)}
                    </span>
                  </li>
                  <li>
                    % efetiva sobre o bruto:{" "}
                    <span className="font-medium">{formatPct(efetiva)}</span>
                  </li>
                </ul>
                <p className="mt-2 font-semibold">Por BU:</p>
                <ul className="space-y-0.5">
                  {buEntries.map(([bu, info]) => {
                    const pct = info.gross > 0 ? info.total / info.gross : 0;
                    return (
                      <li key={bu}>
                        {bu}: {formatCurrency(info.total)} ÷{" "}
                        {formatCurrency(info.gross)} ={" "}
                        <span className="font-medium">{formatPct(pct)}</span>{" "}
                        <span className="opacity-70">
                          ({BU_RULE_SHORT[bu] || "—"})
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <p className="text-[11px] text-muted-foreground -mt-1 leading-snug">
          ≈ {formatPct(efetiva)} do bruto ({formatCurrency(data.grossTotal)}).
          Regras: 70% do Pontual (Franquia / Oxy Hacker) · 0% MRR + 75% Setup +
          50% Pontual (Modelo Atual / Outbound).
        </p>

        <div className="flex flex-col gap-1.5">
          {buEntries.length === 0 && (
            <p className="text-xs text-muted-foreground italic">
              Sem cards neste cenário.
            </p>
          )}
          {buEntries.map(([bu, info]) => {
            const pct = data.total > 0 ? (info.total / data.total) * 100 : 0;
            const ruleShort = BU_RULE_SHORT[bu];
            return (
              <div key={bu} className="flex flex-col gap-0.5">
                <div className="flex justify-between text-[11px] gap-2">
                  <span className="text-muted-foreground truncate">
                    {bu}{" "}
                    <span className="opacity-60">({info.count})</span>
                    {ruleShort && (
                      <span className="opacity-60 ml-1">— {ruleShort}</span>
                    )}
                  </span>
                  <span className="font-medium whitespace-nowrap">
                    {formatCurrency(info.total)}
                    <span className="opacity-60 font-normal ml-1">
                      / {formatCurrency(info.gross)}
                    </span>
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full ${BU_BAR_COLOR[bu] || "bg-slate-400"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <Button
          variant="outline"
          size="sm"
          disabled={data.count === 0}
          onClick={() => setOpenCenario(label)}
          className="mt-2 gap-1"
        >
          <Eye className="h-3.5 w-3.5" />
          Ver detalhes
        </Button>
      </div>
    );
  };

  const activeData =
    openCenario === "Otimista"
      ? otimista
      : openCenario === "Realista"
        ? realista
        : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          💰 Cenário de Caixa
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Info className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs">
                <p className="font-semibold mb-1">
                  Cada card é multiplicado pelas % da sua BU:
                </p>
                <ul className="space-y-0.5">
                  <li>
                    • Modelo Atual / Outbound: 0% MRR · 75% Setup · 50% Pontual
                  </li>
                  <li>
                    • Franquia / Oxy Hacker: 70% do Pontual (MRR e Setup
                    ignorados)
                  </li>
                </ul>
                <p className="mt-2">
                  <span className="font-semibold">Realista:</span> soma de 100%
                  dos cards Quentes ·{" "}
                  <span className="font-semibold">Otimista:</span> Quentes +
                  Mornos.
                </p>
                <p className="mt-1 opacity-70">
                  MRR considerado como valor mensal (1×). A % é aplicada sobre o
                  valor de cada card individualmente.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Projeção de entrada de caixa a partir dos cards taggeados na
          Temperatura. Escopo atual:{" "}
          <span className="font-medium">{scopeLabel}</span>.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderCenarioCard("Realista", realista, "🎯")}
          {renderCenarioCard("Otimista", otimista, "🚀")}
        </div>
      </CardContent>

      <DetailSheet
        open={openCenario !== null}
        onOpenChange={(o) => !o && setOpenCenario(null)}
        title={openCenario ? `💰 Cenário ${openCenario} — Entrada de Caixa` : ""}
        description={
          openCenario
            ? `Cards considerados no cenário ${openCenario} com valores já ajustados pelas % por BU. Escopo: ${scopeLabel}.`
            : undefined
        }
        items={activeData?.items || []}
        columns={[
          { key: "name", label: "Empresa" },
          { key: "bu", label: "BU" },
          {
            key: "regra",
            label: "% aplicada",
            format: (_v: any, row: any) =>
              BU_RULE_SHORT[(row?.bu as string) || ""] || "—",
          },
          { key: "phase", label: "Fase Atual", format: columnFormatters.phase },
          { key: "closer", label: "Closer" },
          { key: "mrr", label: "MRR (caixa)", format: columnFormatters.currency },
          {
            key: "setup",
            label: "Setup (caixa)",
            format: columnFormatters.currency,
          },
          {
            key: "pontual",
            label: "Pontual (caixa)",
            format: columnFormatters.currency,
          },
          {
            key: "total",
            label: "Total Caixa",
            format: columnFormatters.currency,
          },
          { key: "date", label: "Entrada", format: columnFormatters.date },
        ]}
      />
    </Card>
  );
}
