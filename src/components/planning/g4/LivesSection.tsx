import { useMemo, useState } from "react";
import { Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { fmtInt } from "@/components/planning/ceo/ceoShared";
import { FrenteMetricsRow } from "./FrenteMetricsRow";
import { FrenteDreCard, type G4Dre, type CustoDetalhe } from "./FrenteDreCard";
import { FunnelDeluxe, type DeluxeChip, type DeluxeCompareRow } from "./FunnelDeluxe";
import { LiveLeadsDialog } from "./LiveLeadsDialog";
import { useG4FunnelStages } from "@/hooks/useG4FunnelStages";
import type { ModeloAtualCard } from "@/hooks/useModeloAtualAnalytics";
import { G4_LIVES, isCardLive, matchLiveFromCard } from "@/lib/g4Events";
import { cardsForLive, cardsByStage, computeCounts, mergeStages, type ComputedCounts } from "@/lib/g4Funnel";
import { getLiveOverride } from "@/data/livesOfficial";


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

function sumCounts(a: ComputedCounts, b: ComputedCounts): ComputedCounts {
  return {
    inscritos: a.inscritos + b.inscritos,
    entraram: a.entraram + b.entraram,
    mao: a.mao + b.mao,
    venda: a.venda + b.venda,
  };
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
  const [dialogStage, setDialogStage] = useState<string | null>(null);

  // Fases usadas para listar cards por etapa (espelham g4Funnel.ts)
  const MAO_PHASES = new Set([
    "Reunião agendada / Qualificado",
    "Reunião Realizada",
    "1° Reunião Realizada - Apresentação",
    "Proposta enviada / Follow Up",
    "Ganho",
    "Contrato assinado",
  ]);
  const VENDA_PHASES = new Set(["Ganho", "Contrato assinado"]);


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

  // Contagens por live (override oficial > cálculo a partir dos cards)
  const perLiveCounts = useMemo(() => {
    const map = new Map<string, ComputedCounts>();
    for (const l of G4_LIVES) {
      const override = getLiveOverride(l.date);
      map.set(
        l.date,
        override ??
          computeCounts(cardsForLive(liveCards, l.date, l.captureWindowDays)),
      );
    }
    return map;
  }, [liveCards]);

  // Contagens do escopo atual (agregado = soma; live específica = override ou cálculo)
  const counts = useMemo<ComputedCounts>(() => {
    if (selectedLive) {
      return (
        perLiveCounts.get(selectedLive.date) ?? {
          inscritos: 0,
          entraram: 0,
          mao: 0,
          venda: 0,
        }
      );
    }
    let agg: ComputedCounts = { inscritos: 0, entraram: 0, mao: 0, venda: 0 };
    for (const c of perLiveCounts.values()) agg = sumCounts(agg, c);
    return agg;
  }, [perLiveCounts, selectedLive]);

  const stages = useMemo(
    () => mergeStages("lives", counts, dbStages),
    [counts, dbStages],
  );

  // Comparativo entre lives
  const compare = useMemo<DeluxeCompareRow[]>(
    () =>
      G4_LIVES.map((l) => {
        const c = perLiveCounts.get(l.date) ?? {
          inscritos: 0,
          entraram: 0,
          mao: 0,
          venda: 0,
        };
        return {
          id: liveSlug(l.date),
          label: l.label,
          inscritos: c.inscritos,
          entraram: c.entraram,
          mao: c.mao,
          venda: c.venda,
        };
      }),
    [perLiveCounts],
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
        onStageClick={setDialogStage}
      />

      <FrenteDreCard title="P&L — Lives" dre={dre} custosDetalhe={custosDetalhe} />

      <LiveLeadsDialog
        open={dialogStage !== null}
        onOpenChange={(o) => !o && setDialogStage(null)}
        stageKey={dialogStage ?? ""}
        stageLabel={
          dialogStage === "mao"
            ? "Levantaram a mão"
            : dialogStage === "venda"
              ? "Vendas fechadas"
              : dialogStage === "entraram"
                ? "Entraram na live"
                : dialogStage === "inscritos"
                  ? "Inscritos"
                  : (stages.find((s) => s.key === dialogStage)?.label ?? "")
        }
        contextLabel={contextLabel}
        totalOfficial={
          dialogStage === "mao"
            ? counts.mao
            : dialogStage === "venda"
              ? counts.venda
              : dialogStage === "entraram"
                ? counts.entraram
                : dialogStage === "inscritos"
                  ? counts.inscritos
                  : 0
        }
        cards={(() => {
          if (!dialogStage) return [];
          // Escopo: TODOS os cards (não só liveCards) — matchLiveFromCard
          // agora aceita atribuição por menção à data da live no texto.
          const scope = selectedLive
            ? cards.filter((c) => {
                const m = matchLiveFromCard(c, G4_LIVES);
                return m?.date === selectedLive.date;
              })
            : cards.filter((c) => matchLiveFromCard(c, G4_LIVES) !== null);
          return cardsByStage(scope, dialogStage);
        })()}
      />
    </div>
  );
}

