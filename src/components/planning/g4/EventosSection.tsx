import { useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { fmtInt } from "@/components/planning/ceo/ceoShared";
import { FrenteMetricsRow } from "./FrenteMetricsRow";
import { FrenteDreCard, type G4Dre, type CustoDetalhe } from "./FrenteDreCard";
import { FunnelDeluxe, type DeluxeChip, type DeluxeCompareRow } from "./FunnelDeluxe";
import { useG4FunnelStages } from "@/hooks/useG4FunnelStages";
import type { ModeloAtualCard } from "@/hooks/useModeloAtualAnalytics";
import { G4_EVENTOS, isCardEvento, matchEventoFromCard } from "@/lib/g4Events";
import { computeCounts, mergeStages } from "@/lib/g4Funnel";

export interface EventoRow {
  label: string;
  date: string;
  custo: number;
  leadsGerados: number;
}

export interface EventosSectionProps {
  leads?: number;
  pipe?: number;
  faturamento?: number;
  leadTimeMedio?: number;
  dre?: G4Dre;
  custosDetalhe?: CustoDetalhe[];
  eventosRows?: EventoRow[];
  cards?: ModeloAtualCard[];
}

const ZERO_DRE: G4Dre = {
  receitaBruta: 0,
  imposto: 0,
  comissaoG4: 0,
  custosOperacionais: 0,
  lucroLiquido: 0,
};

export function EventosSection({
  leads = 0,
  pipe = 0,
  faturamento = 0,
  leadTimeMedio,
  dre = ZERO_DRE,
  custosDetalhe,
  cards = [],
}: EventosSectionProps) {
  const [selected, setSelected] = useState<string>("all");

  const eventoCards = useMemo(
    () => cards.filter((c) => isCardEvento(c)),
    [cards],
  );

  const selectedEvento = G4_EVENTOS.find((e) => e.slug === selected);
  const { data: dbStages = [] } = useG4FunnelStages(
    "eventos",
    selectedEvento?.slug ?? null,
  );

  const scopedCards = useMemo(() => {
    if (!selectedEvento) return eventoCards;
    return eventoCards.filter((c) => {
      const m = matchEventoFromCard(c, G4_EVENTOS);
      return m?.slug === selectedEvento.slug;
    });
  }, [eventoCards, selectedEvento]);

  const counts = useMemo(() => computeCounts(scopedCards), [scopedCards]);
  const stages = useMemo(
    () => mergeStages("eventos", counts, dbStages),
    [counts, dbStages],
  );

  const compare = useMemo<DeluxeCompareRow[]>(
    () =>
      G4_EVENTOS.map((e) => {
        const c = computeCounts(
          eventoCards.filter((card) => {
            const m = matchEventoFromCard(card, G4_EVENTOS);
            return m?.slug === e.slug;
          }),
        );
        return {
          id: e.slug,
          label: e.label,
          inscritos: c.inscritos,
          entraram: c.entraram,
          mao: c.mao,
          venda: c.venda,
        };
      }),
    [eventoCards],
  );

  const chips: DeluxeChip[] = [
    { id: "all", label: `Agregado · ${G4_EVENTOS.length} eventos` },
    ...G4_EVENTOS.map((e) => ({ id: e.slug, label: e.label })),
  ];

  const contextLabel = selectedEvento
    ? selectedEvento.label
    : "Agregado · todos os eventos";
  const contextSub = selectedEvento
    ? new Date(selectedEvento.date).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "Consolidado";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CalendarDays className="h-5 w-5 text-muted-foreground" />
        <h3 className="font-semibold text-lg">G4 Eventos</h3>
        <Badge variant="secondary">{fmtInt(leads)} leads</Badge>
      </div>

      <FrenteMetricsRow
        leads={leads}
        pipe={pipe}
        faturamento={faturamento}
        leadTimeMedio={leadTimeMedio}
      />

      <FunnelDeluxe
        title="Funil de Conversão · Eventos"
        subtitle="Da presença no evento ao fechamento — todas as etapas consolidadas por evento."
        chips={chips}
        selectedChip={selected}
        onChipChange={setSelected}
        kpis={{
          inscritos: counts.inscritos,
          entraram: counts.entraram,
          mao: counts.mao,
          venda: counts.venda,
          inscritosSub: selectedEvento ? "1 evento" : `${G4_EVENTOS.length} eventos`,
        }}
        stages={stages}
        contextLabel={contextLabel}
        contextSub={contextSub}
        compare={compare}
      />

      <FrenteDreCard title="P&L — Eventos" dre={dre} custosDetalhe={custosDetalhe} />
    </div>
  );
}
