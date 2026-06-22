import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DetailSheet, DetailItem, columnFormatters } from "./DetailSheet";
import type { useModeloAtualAnalytics } from "@/hooks/useModeloAtualAnalytics";
import type { useExpansaoAnalytics } from "@/hooks/useExpansaoAnalytics";
import type { useOutboundAnalytics } from "@/hooks/useOutboundAnalytics";
import type { BUType } from "@/hooks/useFunnelRealized";

type ModeloAnalytics = ReturnType<typeof useModeloAtualAnalytics>;
type ExpansaoAnalyticsT = ReturnType<typeof useExpansaoAnalytics>;
type OutboundAnalyticsT = ReturnType<typeof useOutboundAnalytics>;

type Temperatura = "Quente" | "Morno" | "Frio";

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

interface Props {
  modeloAtualAnalytics: ModeloAnalytics;
  franquiaAnalytics: ExpansaoAnalyticsT;
  oxyHackerAnalytics: ExpansaoAnalyticsT;
  outboundAnalytics: OutboundAnalyticsT;
  selectedBUs: BUType[];
  startDate: Date;
  endDate: Date;
}

export function TemperaturaSection({
  modeloAtualAnalytics,
  franquiaAnalytics,
  oxyHackerAnalytics,
  outboundAnalytics,
  selectedBUs,
  startDate,
  endDate,
}: Props) {
  const [openTemp, setOpenTemp] = useState<Temperatura | null>(null);

  const { buckets, totalTagged, totalSemTag, activeLabels } = useMemo(() => {
    const startTime = startDate.getTime();
    const endTime = new Date(
      endDate.getFullYear(),
      endDate.getMonth(),
      endDate.getDate(),
      23,
      59,
      59,
      999,
    ).getTime();

    type Source = {
      buLabel: string;
      enabled: boolean;
      cards: Array<{ id: string; dataEntrada: Date; temperatura?: Temperatura }>;
      toDetail: (card: any) => DetailItem;
    };

    const includesModelo = selectedBUs.includes("modelo_atual");
    const sources: Source[] = [
      {
        buLabel: "Modelo Atual",
        enabled: includesModelo,
        cards: modeloAtualAnalytics.allCards as any,
        toDetail: modeloAtualAnalytics.toDetailItem,
      },
      {
        buLabel: "Outbound",
        // Outbound alimenta o funil de Modelo Atual → segue o mesmo filtro
        enabled: includesModelo,
        cards: (outboundAnalytics.allCards || []) as any,
        toDetail: outboundAnalytics.toDetailItem,
      },
      {
        buLabel: "Franquia",
        enabled: selectedBUs.includes("franquia"),
        cards: franquiaAnalytics.cards as any,
        toDetail: franquiaAnalytics.toDetailItem,
      },
      {
        buLabel: "Oxy Hacker",
        enabled: selectedBUs.includes("oxy_hacker"),
        cards: oxyHackerAnalytics.cards as any,
        toDetail: oxyHackerAnalytics.toDetailItem,
      },
    ];

    const buckets: Record<Temperatura, DetailItem[]> = {
      Quente: [],
      Morno: [],
      Frio: [],
    };
    let semTag = 0;
    const activeLabels: string[] = [];

    for (const src of sources) {
      if (!src.enabled) continue;
      activeLabels.push(src.buLabel);

      // dedup por id mantendo o card mais recente dentro do período
      const byId = new Map<string, any>();
      for (const c of src.cards) {
        if (!c?.dataEntrada) continue;
        const t = c.dataEntrada.getTime();
        if (t < startTime || t > endTime) continue;
        const ex = byId.get(c.id);
        if (!ex || c.dataEntrada > ex.dataEntrada) byId.set(c.id, c);
      }

      for (const card of byId.values()) {
        if (card.temperatura) {
          const item = src.toDetail(card);
          buckets[card.temperatura as Temperatura].push({
            ...item,
            bu: src.buLabel,
          });
        } else {
          semTag++;
        }
      }
    }

    const tagged =
      buckets.Quente.length + buckets.Morno.length + buckets.Frio.length;
    return { buckets, totalTagged: tagged, totalSemTag: semTag, activeLabels };
  }, [
    modeloAtualAnalytics,
    franquiaAnalytics,
    oxyHackerAnalytics,
    outboundAnalytics,
    selectedBUs,
    startDate,
    endDate,
  ]);

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
          Cards com tag de prioridade (Labels do Pipefy) no período selecionado.
          Escopo atual: <span className="font-medium">{scopeLabel}</span>. Clique
          em cada chip para abrir a lista.
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
        title={
          openTemp ? `${CONFIG[openTemp].icon} Leads ${openTemp}` : ""
        }
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
