// marketingBuFilter.ts — Filtro de BU (Modelo Atual / O2 TAX / Oxy / Franquia)
// para a aba Marketing. Antes o `selectedBU` só afetava a tabela de campanhas;
// agora esse helper permite propagar o filtro para funis, hero, gauges e
// resultados gerais.

import type { AttributionCard } from "@/components/planning/marketing-indicators/types";

const BU_PREFIX_TO_LABEL: Record<string, string> = {
  "1": "Modelo Atual",
  "2": "O2 TAX",
  "3": "Oxy Hacker",
  "4": "Franquia",
};

export function buLabelFromPrefix(prefix: string): string | null {
  return BU_PREFIX_TO_LABEL[prefix] ?? null;
}

/**
 * Filtra cards de atribuição pelo BU selecionado no topo da aba Marketing.
 * `selectedBU === 'all'` devolve o array intacto.
 */
export function filterCardsByBU<T extends Pick<AttributionCard, "bu">>(
  cards: T[],
  selectedBU: string,
): T[] {
  if (!selectedBU || selectedBU === "all") return cards;
  const label = BU_PREFIX_TO_LABEL[selectedBU];
  if (!label) return cards;
  return cards.filter((c) => c.bu === label);
}
