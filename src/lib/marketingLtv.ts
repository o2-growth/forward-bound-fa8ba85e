// marketingLtv.ts — Fonte única para o cálculo de LTV na aba Marketing.
//
// Fórmula canônica: LTV = MRR médio das vendas × meses de retenção esperados.
// Antes existia `avgMrr * 12` inline em MarketingIndicatorsTab; agora tudo
// passa por aqui para garantir que qualquer futura mudança (ex.: passar a
// usar retenção real via cohort) reflita em todos os pontos de exibição.

import type { AttributionCard } from "@/components/planning/marketing-indicators/types";
import { isSaleFase } from "@/lib/marketingFunnelAggregator";

/**
 * Meses médios de retenção assumidos hoje. Valor conservador que preserva a
 * fórmula histórica (avgMRR × 12). Ajustar aqui atualiza LTV em todo o app.
 */
export const RETENTION_MONTHS = 12;

export interface LtvResult {
  avgMrr: number;
  retention: number;
  ltv: number;
  vendas: number;
}

/** Média de MRR das vendas (aceita fase "Contrato assinado" e "Ganho"). */
export function computeAvgMrr(cards: AttributionCard[]): number {
  const sales = cards.filter((c) => isSaleFase(c.fase));
  if (sales.length === 0) return 0;
  const total = sales.reduce((s, c) => s + (c.valorMRR || 0), 0);
  return total / sales.length;
}

/**
 * Calcula LTV consistente: MRR médio × retenção. Aceita a lista completa de
 * cards (ele filtra internamente por fase de venda) OU já vendas dedupadas.
 */
export function computeLTV(
  cards: AttributionCard[],
  retentionMonths: number = RETENTION_MONTHS,
): LtvResult {
  const avgMrr = computeAvgMrr(cards);
  return {
    avgMrr,
    retention: retentionMonths,
    ltv: avgMrr * retentionMonths,
    vendas: cards.filter((c) => isSaleFase(c.fase)).length,
  };
}
