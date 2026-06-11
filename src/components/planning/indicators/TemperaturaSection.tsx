import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DetailSheet, DetailItem, columnFormatters } from "./DetailSheet";
import type { useModeloAtualAnalytics } from "@/hooks/useModeloAtualAnalytics";

type Analytics = ReturnType<typeof useModeloAtualAnalytics>;

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
  analytics: Analytics;
  startDate: Date;
  endDate: Date;
}

export function TemperaturaSection({ analytics, startDate, endDate }: Props) {
  const [openTemp, setOpenTemp] = useState<Temperatura | null>(null);

  const { buckets, totalTagged, totalSemTag } = useMemo(() => {
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

    // allCards = movimentos do período (unfiltered por fase). Dedup por id mantendo
    // a entrada mais recente, para refletir o estado atual do card.
    const byId = new Map<string, (typeof analytics.allCards)[number]>();
    for (const c of analytics.allCards) {
      const t = c.dataEntrada.getTime();
      if (t < startTime || t > endTime) continue;
      const ex = byId.get(c.id);
      if (!ex || c.dataEntrada > ex.dataEntrada) byId.set(c.id, c);
    }

    const buckets: Record<Temperatura, DetailItem[]> = {
      Quente: [],
      Morno: [],
      Frio: [],
    };
    let semTag = 0;
    for (const card of byId.values()) {
      if (card.temperatura) {
        buckets[card.temperatura].push(analytics.toDetailItem(card));
      } else {
        semTag++;
      }
    }
    const tagged =
      buckets.Quente.length + buckets.Morno.length + buckets.Frio.length;
    return { buckets, totalTagged: tagged, totalSemTag: semTag };
  }, [analytics, startDate, endDate]);

  if (totalTagged === 0) return null;

  const order: Temperatura[] = ["Quente", "Morno", "Frio"];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          🌡 Temperatura dos Leads · Modelo Atual
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Cards do Modelo Atual com tag de prioridade (Labels do Pipefy) no período
          selecionado. Clique em cada chip para abrir a lista.
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
          openTemp
            ? `${CONFIG[openTemp].icon} Leads ${openTemp} · Modelo Atual`
            : ""
        }
        description={
          openTemp
            ? `Cards do Modelo Atual marcados como ${openTemp} no Pipefy (campo Labels / Prioridade Lead) com movimentação no período selecionado.`
            : undefined
        }
        items={openTemp ? buckets[openTemp] : []}
        columns={[
          { key: "name", label: "Empresa" },
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
