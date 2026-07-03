import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DetailSheet, columnFormatters } from "./DetailSheet";
import {
  aggregateByTemperatura,
  type Temperatura,
  type AggregateInput,
} from "./temperaturaAggregator";

const CONFIG: Record<Temperatura, { icon: string; chipClass: string }> = {
  Quente: {
    icon: "🔥",
    chipClass:
      "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 hover:bg-red-200",
  },
  Morno: {
    icon: "🌤",
    chipClass:
      "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 hover:bg-amber-200",
  },
  Frio: {
    icon: "❄",
    chipClass:
      "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 hover:bg-blue-200",
  },
};

export function TemperaturaSection(props: AggregateInput) {
  const [openTemp, setOpenTemp] = useState<Temperatura | null>(null);

  const { buckets, totalTagged, totalSemTag, activeLabels } = useMemo(
    () => aggregateByTemperatura({ ...props, includeAllOpenIgnoringPeriod: true }),
    [
      props.modeloAtualAnalytics,
      props.franquiaAnalytics,
      props.oxyHackerAnalytics,
      props.outboundAnalytics,
      props.monetizacaoAnalytics,
      props.selectedBUs,
      props.startDate,
      props.endDate,
    ],
  );

  if (totalTagged === 0) return null;

  const order: Temperatura[] = ["Quente", "Morno", "Frio"];
  const scopeLabel = activeLabels.join(" + ");

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          🌡 Temperatura dos Leads
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Todos os cards abertos no pipeline com tag de prioridade (Labels do Pipefy),
          independente do período selecionado. Inclui Upsell, Cross-sell e Troca de
          produto do funil de Monetização (sempre 🔥 Quente). Escopo atual:{" "}
          <span className="font-medium">{scopeLabel}</span>. Clique em cada chip
          para abrir a lista.
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-3">
          {order.map((temp) => {
            const items = buckets[temp];
            const cfg = CONFIG[temp];
            return (
              <button
                key={temp}
                type="button"
                disabled={items.length === 0}
                onClick={() => setOpenTemp(temp)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed ${cfg.chipClass}`}
              >
                <span>{cfg.icon}</span>
                <span>{temp}</span>
                <Badge variant="secondary" className="ml-1">
                  {items.length}
                </Badge>
              </button>
            );
          })}
          <div className="ml-auto text-xs text-muted-foreground">
            Total taggeado: <span className="font-medium text-foreground">{totalTagged}</span>{" "}
            · Sem tag:{" "}
            <span className="font-medium text-foreground">{totalSemTag}</span>
          </div>
        </div>
      </CardContent>

      <DetailSheet
        open={openTemp !== null}
        onOpenChange={(o) => !o && setOpenTemp(null)}
        title={openTemp ? `${CONFIG[openTemp].icon} Leads ${openTemp}` : ""}
        description={
          openTemp
            ? `Cards marcados como ${openTemp} no Pipefy (campo Labels / Prioridade Lead) com movimentação no período selecionado. Escopo: ${scopeLabel}.`
            : undefined
        }
        items={openTemp ? buckets[openTemp] : []}
        columns={[
          { key: "name", label: "Empresa" },
          { key: "bu", label: "BU" },
          { key: "phase", label: "Fase Atual", format: columnFormatters.phase },
          { key: "closer", label: "Closer" },
          { key: "sdr", label: "SDR" },
          { key: "mrr", label: "MRR", format: columnFormatters.currency },
          { key: "setup", label: "Setup", format: columnFormatters.currency },
          { key: "pontual", label: "Pontual", format: columnFormatters.currency },
          { key: "total", label: "Total", format: columnFormatters.currency },
          {
            key: "revenueRange",
            label: "Faixa",
            format: columnFormatters.revenueRange,
          },
          { key: "date", label: "Entrada", format: columnFormatters.date },
        ]}
      />
    </Card>
  );
}
