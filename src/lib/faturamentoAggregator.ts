/**
 * Fonte única de cálculo do "Faturamento Realizado" (indicador `faturamento` /
 * "Fat Incremento") — usado tanto na aba **Indicadores Comercial** quanto na
 * **Visão CEO → Comercial → Pace**.
 *
 * Regras (mesmas do case 'faturamento' em IndicatorsTab.tsx):
 *  - Modelo Atual  → getModeloAtualValue('venda') (Oxy Finance realizada, fallback Pipefy)
 *  - O2 TAX        → soma dos `valor` de o2TaxAnalytics.getCardsForIndicator('venda') (Pipefy)
 *  - Oxy Hacker    → getOxyHackerValue('venda') (Oxy Finance)
 *  - Franquia      → getExpansaoValue('venda')  (Oxy Finance)
 *  - Monetização   → soma de `.total` de getFilteredMonetizacaoItems('venda') — só
 *                    quando `includeMonetizacao` (Consolidado + origem inclui 'monetizacao')
 *
 * Quando `filters` é passado com Closer/SDR/Origem ativos, cada BU passa por
 * `filteredVendasForBU`, que exige `matchers` (cardMatchesCloser/Sdr/Origem)
 * e mapas BU→closers/sdrs. Se `filters` for undefined ou vazio, usa o caminho
 * otimizado (Oxy Finance para as BUs que suportam).
 */

export type BuType = 'modelo_atual' | 'o2_tax' | 'oxy_hacker' | 'franquia';

export interface FaturamentoAggregatorInput {
  selectedBUs: BuType[];
  startDate: Date;
  endDate: Date;

  // analytics
  modeloAtualAnalytics: { getCardsForIndicator: (i: 'venda') => any[] };
  o2TaxAnalytics: { getCardsForIndicator: (i: 'venda') => any[] };
  oxyHackerAnalytics: { getCardsForIndicator: (i: 'venda') => any[] };
  franquiaAnalytics: { getCardsForIndicator: (i: 'venda') => any[] };

  // Oxy Finance realized helpers (aceitam venda + período)
  getModeloAtualValue: (indicator: 'venda', start: Date, end: Date) => number;
  getOxyHackerValue: (indicator: any, start: Date, end: Date) => number;
  getExpansaoValue: (indicator: any, start: Date, end: Date) => number;

  // Monetização (transversal)
  monetizacaoVendaItems: Array<{ total?: number }>;
  includeMonetizacao: boolean;

  // Filtros (opcionais). Se omitido → caminho otimizado (Oxy Finance).
  filters?: {
    closerFilterActive: boolean;
    sdrFilterActive: boolean;
    origemFilterActive: boolean;
    /** Retorna true se o card passa nos filtros de Closer/SDR/Origem. */
    cardMatches: (card: any) => boolean;
    /** BUs → closers / sdrs (para curto-circuito quando filtro não intersecta) */
    buClosers: Record<BuType, readonly string[]>;
    buSdrs: Record<BuType, readonly string[]>;
    selectedClosers: string[];
    selectedSdrs: string[];
  };
}

export function computeFaturamentoRealizado(input: FaturamentoAggregatorInput): number {
  const {
    selectedBUs, startDate, endDate,
    modeloAtualAnalytics, o2TaxAnalytics, oxyHackerAnalytics, franquiaAnalytics,
    getModeloAtualValue, getOxyHackerValue, getExpansaoValue,
    monetizacaoVendaItems, includeMonetizacao,
    filters,
  } = input;

  const includesModeloAtual = selectedBUs.includes('modelo_atual');
  const includesO2Tax = selectedBUs.includes('o2_tax');
  const includesOxyHacker = selectedBUs.includes('oxy_hacker');
  const includesFranquia = selectedBUs.includes('franquia');

  const filtersActive =
    !!filters &&
    (filters.closerFilterActive || filters.sdrFilterActive || filters.origemFilterActive);

  const filteredVendasForBU = (bu: BuType, vendas: any[]): any[] | null => {
    if (!filtersActive || !filters) return null;
    if (filters.sdrFilterActive) {
      const sdrsForBU = filters.selectedSdrs.filter(s => filters.buSdrs[bu]?.includes(s));
      if (sdrsForBU.length === 0) return [];
    }
    if (filters.closerFilterActive) {
      const closersForBU = filters.selectedClosers.filter(c => filters.buClosers[bu]?.includes(c));
      if (closersForBU.length === 0) return [];
    }
    return vendas.filter(filters.cardMatches);
  };

  let total = 0;

  if (includesModeloAtual) {
    const filtered = filteredVendasForBU('modelo_atual', modeloAtualAnalytics.getCardsForIndicator('venda'));
    if (filtered === null) total += getModeloAtualValue('venda', startDate, endDate);
    else total += filtered.reduce((acc, c) => acc + (c.valor || 0), 0);
  }

  if (includesO2Tax) {
    const vendas = o2TaxAnalytics.getCardsForIndicator('venda');
    const filtered = filteredVendasForBU('o2_tax', vendas);
    const list = filtered ?? vendas;
    total += list.reduce((acc, c) => acc + (c.valor || 0), 0);
  }

  if (includesOxyHacker) {
    const filtered = filteredVendasForBU('oxy_hacker', oxyHackerAnalytics.getCardsForIndicator('venda'));
    if (filtered === null) total += getOxyHackerValue('venda', startDate, endDate);
    else total += filtered.reduce((acc, c) => acc + (c.valor || 0), 0);
  }

  if (includesFranquia) {
    const filtered = filteredVendasForBU('franquia', franquiaAnalytics.getCardsForIndicator('venda'));
    if (filtered === null) total += getExpansaoValue('venda', startDate, endDate);
    else total += filtered.reduce((acc, c) => acc + (c.valor || 0), 0);
  }

  if (includeMonetizacao) {
    total += monetizacaoVendaItems.reduce((s, it) => s + (it.total || 0), 0);
  }

  return total;
}
