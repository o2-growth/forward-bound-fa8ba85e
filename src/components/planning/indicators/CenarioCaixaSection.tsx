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

type Cenario = "Realista" | "Otimista";

interface CenarioData {
  items: DetailItem[]; // items com mrr/setup/pontual/total já em valor de CAIXA
  total: number;
  byBu: Record<string, { total: number; count: number }>;
  count: number;
}

function buildCenario(sourceItems: DetailItem[]): CenarioData {
  const byBu: Record<string, { total: number; count: number }> = {};
  let total = 0;
  const items: DetailItem[] = sourceItems.map((it) => {
    const cash = computeCashFromCard(it);
    total += cash.total;
    const bu = (it.bu as string) || "—";
    if (!byBu[bu]) byBu[bu] = { total: 0, count: 0 };
    byBu[bu].total += cash.total;
    byBu[bu].count += 1;
    return {
      ...it,
      mrr: cash.mrr,
      setup: cash.setup,
      pontual: cash.pontual,
      total: cash.total,
    };
  });
  return { items, total, byBu, count: sourceItems.length };
}

const BU_BAR_COLOR: Record<string, string> = {
  "Modelo Atual": "bg-primary",
  Outbound: "bg-blue-500",
  Franquia: "bg-green-500",
  "Oxy Hacker": "bg-purple-500",
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
        <div className="text-2xl font-bold">{formatCurrency(data.total)}</div>

        <div className="flex flex-col gap-1.5">
          {buEntries.length === 0 && (
            <p className="text-xs text-muted-foreground italic">
              Sem cards neste cenário.
            </p>
          )}
          {buEntries.map(([bu, info]) => {
            const pct = data.total > 0 ? (info.total / data.total) * 100 : 0;
            return (
              <div key={bu} className="flex flex-col gap-0.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">
                    {bu}{" "}
                    <span className="opacity-60">({info.count})</span>
                  </span>
                  <span className="font-medium">{formatCurrency(info.total)}</span>
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

  const activeData = openCenario === "Otimista" ? otimista : openCenario === "Realista" ? realista : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          💰 Cenário de Caixa
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="text-muted-foreground hover:text-foreground">
                  <Info className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs">
                <p className="font-semibold mb-1">Regras de % por BU (sobre cada card):</p>
                <ul className="space-y-0.5">
                  <li>• Modelo Atual / Outbound: 0% MRR · 75% Setup · 50% Pontual</li>
                  <li>• Franquia / Oxy Hacker: 70% do Pontual</li>
                </ul>
                <p className="mt-2">
                  <span className="font-semibold">Realista:</span> 100% dos Quentes ·{" "}
                  <span className="font-semibold">Otimista:</span> 100% dos Quentes + Mornos.
                </p>
                <p className="mt-1 opacity-70">MRR considerado como valor mensal (1×).</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Projeção de entrada de caixa a partir dos cards taggeados na Temperatura.
          Escopo atual: <span className="font-medium">{scopeLabel}</span>.
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
          { key: "phase", label: "Fase Atual", format: columnFormatters.phase },
          { key: "closer", label: "Closer" },
          { key: "mrr", label: "MRR (caixa)", format: columnFormatters.currency },
          { key: "setup", label: "Setup (caixa)", format: columnFormatters.currency },
          { key: "pontual", label: "Pontual (caixa)", format: columnFormatters.currency },
          { key: "total", label: "Total Caixa", format: columnFormatters.currency },
          { key: "date", label: "Entrada", format: columnFormatters.date },
        ]}
      />
    </Card>
  );
}
