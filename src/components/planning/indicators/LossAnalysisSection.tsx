import { useMemo } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { TrendingDown, ChevronDown } from "lucide-react";
import { LossFunnelWidget } from "./LossFunnelWidget";
import { LossReasonsBar } from "./LossReasonsBar";

type BUType = 'modelo_atual' | 'o2_tax' | 'oxy_hacker' | 'franquia';

interface AnalyticsSource {
  getLostDeals: {
    count: number;
    totalValue: number;
    cards: Array<{
      id: string;
      titulo: string;
      fase: string;
      faseAtual: string;
      valor: number;
      motivoPerda: string | null;
      closer: string | null;
      sdr?: string | null;
      responsavel?: string | null;
      produto?: string;
      dataEntrada: Date;
    }>;
  };
  getRawMqlCount: number;
  isLoading: boolean;
  cards: Array<{
    id: string;
    fase: string;
    dataEntrada: Date;
  }>;
}

interface LossAnalysisSectionProps {
  selectedBUs: BUType[];
  modeloAtualAnalytics: AnalyticsSource;
  o2TaxAnalytics: AnalyticsSource;
  oxyHackerAnalytics: AnalyticsSource;
  franquiaAnalytics: AnalyticsSource;
}

export function LossAnalysisSection({
  selectedBUs,
  modeloAtualAnalytics,
  o2TaxAnalytics,
  oxyHackerAnalytics,
  franquiaAnalytics,
}: LossAnalysisSectionProps) {
  const isLoading = (selectedBUs.includes('modelo_atual') && modeloAtualAnalytics.isLoading) ||
    (selectedBUs.includes('o2_tax') && o2TaxAnalytics.isLoading) ||
    (selectedBUs.includes('oxy_hacker') && oxyHackerAnalytics.isLoading) ||
    (selectedBUs.includes('franquia') && franquiaAnalytics.isLoading);

  const totalMqls = useMemo(() => {
    const buMap: Record<BUType, AnalyticsSource> = {
      modelo_atual: modeloAtualAnalytics,
      o2_tax: o2TaxAnalytics,
      oxy_hacker: oxyHackerAnalytics,
      franquia: franquiaAnalytics,
    };
    let total = 0;
    for (const bu of selectedBUs) {
      const source = buMap[bu];
      if (source && !source.isLoading) total += source.getRawMqlCount;
    }
    return total;
  }, [selectedBUs, modeloAtualAnalytics, o2TaxAnalytics, oxyHackerAnalytics, franquiaAnalytics]);

  const lostCards = useMemo(() => {
    const buMap: Record<BUType, AnalyticsSource> = {
      modelo_atual: modeloAtualAnalytics,
      o2_tax: o2TaxAnalytics,
      oxy_hacker: oxyHackerAnalytics,
      franquia: franquiaAnalytics,
    };

    const allLost: Array<{
      id: string;
      titulo: string;
      fase: string;
      faseAtual: string;
      valor: number;
      motivoPerda: string | null;
      closer: string | null;
      sdr: string | null;
      produto: string;
      dataEntrada: Date;
      lastPhaseBeforeLoss: string;
    }> = [];

    const seenIds = new Set<string>();

    for (const bu of selectedBUs) {
      const source = buMap[bu];
      if (!source || source.isLoading) continue;

      // Build phase history map for this BU to find last phase before loss
      const cardPhases = new Map<string, Array<{ fase: string; dataEntrada: Date }>>();
      for (const card of source.cards) {
        if (!cardPhases.has(card.id)) cardPhases.set(card.id, []);
        cardPhases.get(card.id)!.push({ fase: card.fase, dataEntrada: card.dataEntrada });
      }

      for (const card of source.getLostDeals.cards) {
        if (seenIds.has(card.id)) continue;
        seenIds.add(card.id);

        // Find last phase before Perdido/Arquivado
        const phases = cardPhases.get(card.id) || [];
        const sorted = [...phases].sort((a, b) => a.dataEntrada.getTime() - b.dataEntrada.getTime());
        let lastNonLoss = card.fase;
        for (const p of sorted) {
          if (p.fase !== 'Perdido') {
            lastNonLoss = p.fase;
          }
        }

        allLost.push({
          id: card.id,
          titulo: card.titulo,
          fase: card.fase,
          faseAtual: card.faseAtual,
          valor: card.valor,
          motivoPerda: card.motivoPerda,
          closer: card.closer,
          sdr: (card as any).sdr || (card as any).responsavel || null,
          produto: card.produto,
          dataEntrada: card.dataEntrada,
          lastPhaseBeforeLoss: lastNonLoss,
        });
      }

    }

    return allLost;
  }, [selectedBUs, modeloAtualAnalytics, o2TaxAnalytics, oxyHackerAnalytics, franquiaAnalytics]);

  if (!isLoading && lostCards.length === 0) return null;

  const totalValue = lostCards.reduce((sum, c) => sum + c.valor, 0);
  const valueLabel = totalValue >= 1000000
    ? `R$ ${(totalValue / 1000000).toFixed(1)}M`
    : totalValue >= 1000
    ? `R$ ${Math.round(totalValue / 1000)}k`
    : `R$ ${totalValue}`;

  return (
    <Collapsible>
      <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-3 px-3 rounded-lg border border-red-500/20 hover:border-red-500/40 bg-red-500/5 transition-colors group">
        <TrendingDown className="h-4 w-4 text-red-400" />
        <span className="text-sm font-semibold">Análise de Perdas</span>
        <span className="text-xs text-red-400 font-medium">{lostCards.length} deals perdidos</span>
        <span className="text-xs text-muted-foreground">• {valueLabel}</span>
        <ChevronDown className="h-4 w-4 ml-auto text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-4">
          <LossFunnelWidget
            lostCards={lostCards}
            totalMqls={totalMqls}
            isLoading={isLoading}
          />
          <LossReasonsBar
            lostCards={lostCards}
            isLoading={isLoading}
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
