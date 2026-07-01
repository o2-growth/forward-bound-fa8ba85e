import { useMemo, useState } from "react";
import { Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { fmtInt } from "@/components/planning/ceo/ceoShared";
import { FrenteMetricsRow } from "./FrenteMetricsRow";
import { FrenteDreCard, type G4Dre, type CustoDetalhe } from "./FrenteDreCard";
import { FunnelDeluxe, type DeluxeChip, type DeluxeCompareRow } from "./FunnelDeluxe";
import { useG4FunnelStages } from "@/hooks/useG4FunnelStages";
import type { ModeloAtualCard } from "@/hooks/useModeloAtualAnalytics";
import { G4_LIVES, isCardLive } from "@/lib/g4Events";
import { cardsForLive, computeCounts, mergeStages } from "@/lib/g4Funnel";

export interface LiveRow {
  label: string;
  date: string;
  saveCost: number;
  pedroCost: number;
  totalCost: number;
  leadsGerados: number;
}

export interface LivesSectionProps {
  leads: number;
  pipe: number;
  faturamento: number;
  leadTimeMedio?: number;
  dre: G4Dre;
  custosDetalhe?: CustoDetalhe[];
  livesRows: LiveRow[];
  /** Cards Modelo Atual (todos os movimentos) — para atribuição por live */
  cards: ModeloAtualCard[];
}

function liveSlug(dateIso: string): string {
  return `live-${dateIso}`;
}

export function LivesSection({
  leads,
  pipe,
  faturamento,
  leadTimeMedio,
  dre,
  custosDetalhe,
  livesRows = [],
  cards = [],
}: LivesSectionProps) {
  const [selected, setSelected] = useState<string>("all");

  // Cards classificados como Lives (todos os movimentos)
  const liveCards = useMemo(
    () => cards.filter((c) => isCardLive(c)),
    [cards],
  );

  // Slug do item selecionado (ou null p/ agregado)
  const selectedLive = G4_LIVES.find((l) => liveSlug(l.date) === selected);
  const dbSlug = selectedLive ? liveSlug(selectedLive.date) : null;

  // Estágios manuais do banco (fallback [])
  const { data: dbStages = [] } = useG4FunnelStages("lives", dbSlug);

  // Filtra cards por live selecionada
  const scopedCards = useMemo(() => {
    if (!selectedLive) return liveCards;
    return cardsForLive(liveCards, selectedLive.date, selectedLive.captureWindowDays);
  }, [liveCards, selectedLive]);

  const counts = useMemo(() => computeCounts(scopedCards), [scopedCards]);
  const stages = useMemo(
    () => mergeStages("lives", counts, dbStages),
    [counts, dbStages],
  );

  // Comparativo entre lives
  const compare = useMemo<DeluxeCompareRow[]>(
    () =>
      G4_LIVES.map((l) => {
        const c = computeCounts(cardsForLive(liveCards, l.date, l.captureWindowDays));
        return {
          id: liveSlug(l.date),
          label: l.label,
          inscritos: c.inscritos,
          entraram: c.entraram,
          mao: c.mao,
          venda: c.venda,
        };
      }),
    [liveCards],
  );

  const chips: DeluxeChip[] = [
    { id: "all", label: `Agregado · ${G4_LIVES.length} lives` },
    ...G4_LIVES.map((l) => ({ id: liveSlug(l.date), label: l.label })),
  ];

  const contextLabel = selectedLive ? selectedLive.label : "Agregado · todas as lives";
  const contextSub = selectedLive
    ? new Date(selectedLive.date).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "Consolidado";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Video className="h-5 w-5 text-muted-foreground" />
        <h3 className="font-semibold text-lg">G4 Lives</h3>
        <Badge variant="secondary">{fmtInt(leads)} leads</Badge>
      </div>

      <FrenteMetricsRow
        leads={leads}
        pipe={pipe}
        faturamento={faturamento}
        leadTimeMedio={leadTimeMedio}
      />

      <FunnelDeluxe
        title="Funil de Conversão"
        subtitle="Da inscrição ao fechamento — todas as etapas das lives consolidadas em um só lugar."
        chips={chips}
        selectedChip={selected}
        onChipChange={setSelected}
        kpis={{
          inscritos: counts.inscritos,
          entraram: counts.entraram,
          mao: counts.mao,
          venda: counts.venda,
          inscritosSub: selectedLive ? "1 live" : `${G4_LIVES.length} lives`,
        }}
        stages={stages}
        contextLabel={contextLabel}
        contextSub={contextSub}
        compare={compare}
      />

      <FrenteDreCard title="P&L — Lives" dre={dre} custosDetalhe={custosDetalhe} />
    </div>
  );
}
