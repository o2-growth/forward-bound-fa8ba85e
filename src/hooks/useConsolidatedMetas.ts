import { useMemo } from 'react';
import { useMonetaryMetas, BuType, MonthType, MetricType } from './useMonetaryMetas';
import { useMediaMetas, FunnelDataItem } from '@/contexts/MediaMetasContext';
import { eachMonthOfInterval, differenceInDays, startOfMonth, endOfMonth, getMonth } from 'date-fns';

export type ConsolidatedMetricType = 'faturamento' | 'mrr' | 'setup' | 'pontual';

export interface ConsolidatedMetaResult {
  value: number;
  source: 'database' | 'plan_growth' | 'calculated';
}

// Tickets médios por BU
const BU_TICKETS: Record<BuType, number> = {
  modelo_atual: 17000,
  o2_tax: 15000,
  oxy_hacker: 54000,
  franquia: 140000,
};

// BUs que só têm receita pontual (sem MRR/Setup)
const PONTUAL_ONLY_BUS: BuType[] = ['oxy_hacker', 'franquia'];

const MONTH_NAMES: MonthType[] = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

/**
 * Hook consolidado que mescla metas do banco (monetary_metas) com dados do Plan Growth (funnelData).
 * 
 * Hierarquia de prioridade:
 * 1. Banco de dados (monetary_metas) - se valor > 0
 * 2. Plan Growth (funnelData) - fallback se banco vazio
 * 3. Cálculo padrão (25/60/15) - último recurso
 */
export function useConsolidatedMetas() {
  const { metas, getMeta, isLoading: isLoadingDb } = useMonetaryMetas();
  const { funnelData, isLoaded: isPlanGrowthLoaded } = useMediaMetas();

  // Verifica se há overrides no banco para uma BU específica
  const hasDbOverridesForBU = useMemo(() => {
    return (bu: BuType): boolean => {
      return metas.some(m => 
        m.bu === bu && 
        (Number(m.faturamento) > 0 || Number(m.mrr) > 0 || Number(m.setup) > 0 || Number(m.pontual) > 0)
      );
    };
  }, [metas]);

  // Map BU to funnelData key
  const buToFunnelKey = useMemo(() => ({
    modelo_atual: 'modeloAtual' as const,
    o2_tax: 'o2Tax' as const,
    oxy_hacker: 'oxyHacker' as const,
    franquia: 'franquia' as const,
  }), []);

  /**
   * Obtém meta do Plan Growth para uma BU/mês/métrica
   */
  const getPlanGrowthMeta = (
    bu: BuType,
    month: MonthType,
    metric: ConsolidatedMetricType
  ): number => {
    if (!funnelData) return 0;

    const funnelKey = buToFunnelKey[bu];
    const buData = funnelData[funnelKey];
    const monthData = buData?.find((d: FunnelDataItem) => d.month === month);
    if (!monthData) return 0;

    const faturamento = monthData.faturamento ?? ((monthData.vendas || 0) * BU_TICKETS[bu]);
    const isPontualOnly = PONTUAL_ONLY_BUS.includes(bu);

    switch (metric) {
      case 'faturamento': 
        return faturamento;
      case 'mrr': 
        return isPontualOnly ? 0 : Math.round(faturamento * 0.25);
      case 'setup': 
        return isPontualOnly ? 0 : Math.round(faturamento * 0.60);
      case 'pontual': 
        return isPontualOnly ? faturamento : Math.round(faturamento * 0.15);
      default: 
        return 0;
    }
  };

  /**
   * Obtém meta consolidada para uma BU/mês/métrica específica.
   * Prioridade: Banco > Plan Growth > Default
   */
  const getConsolidatedMeta = (
    bu: BuType,
    month: MonthType,
    metric: ConsolidatedMetricType
  ): ConsolidatedMetaResult => {
    // Para modelo_atual, todas as métricas monetárias devem usar Plan Growth
    // O DB armazena valores baseados no faturamento TOTAL, mas os acelerômetros
    // precisam do INCREMENTO (A Vender = Total - MRR Base)
    const skipDb = bu === 'modelo_atual';

    // 1. Tentar banco de dados primeiro (exceto modelo_atual)
    if (!skipDb) {
      const dbValue = getMeta(bu, month, metric as MetricType);
      if (dbValue > 0) {
        return { value: dbValue, source: 'database' };
      }
    }

    // 2. Fallback para Plan Growth
    const planGrowthValue = getPlanGrowthMeta(bu, month, metric);
    if (planGrowthValue > 0) {
      return { value: planGrowthValue, source: 'plan_growth' };
    }

    // 3. Sem dados disponíveis
    return { value: 0, source: 'calculated' };
  };

  /**
   * Obtém meta agregada para um período (pro-rata por dias)
   */
  const getMetaForPeriod = (
    bus: BuType[],
    startDate: Date,
    endDate: Date,
    metric: ConsolidatedMetricType
  ): number => {
    const monthsInPeriod = eachMonthOfInterval({ start: startDate, end: endDate });
    let total = 0;

    for (const monthDate of monthsInPeriod) {
      const monthName = MONTH_NAMES[getMonth(monthDate)];
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);

      // Calcular sobreposição do período com o mês
      const overlapStart = startDate > monthStart ? startDate : monthStart;
      const overlapEnd = endDate < monthEnd ? endDate : monthEnd;

      if (overlapStart > overlapEnd) continue;

      const overlapDays = differenceInDays(overlapEnd, overlapStart) + 1;
      const daysInMonth = differenceInDays(monthEnd, monthStart) + 1;
      const fraction = daysInMonth > 0 ? overlapDays / daysInMonth : 0;

      // Somar meta de cada BU selecionada
      bus.forEach(bu => {
        const { value } = getConsolidatedMeta(bu, monthName, metric);
        total += value * fraction;
      });
    }

    return Math.round(total);
  };

  /**
   * Obtém meta de faturamento com suporte a filtro de closers (para Modelo Atual)
   */
  const getFilteredFaturamentoMeta = (
    bus: BuType[],
    startDate: Date,
    endDate: Date,
    closerFilter?: string[],
    getFilteredMeta?: (value: number, bu: string, month: string, closers: string[]) => number
  ): number => {
    const monthsInPeriod = eachMonthOfInterval({ start: startDate, end: endDate });
    let total = 0;

    for (const monthDate of monthsInPeriod) {
      const monthName = MONTH_NAMES[getMonth(monthDate)];
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);

      const overlapStart = startDate > monthStart ? startDate : monthStart;
      const overlapEnd = endDate < monthEnd ? endDate : monthEnd;
      if (overlapStart > overlapEnd) continue;

      const overlapDays = differenceInDays(overlapEnd, overlapStart) + 1;
      const daysInMonth = differenceInDays(monthEnd, monthStart) + 1;
      const fraction = daysInMonth > 0 ? overlapDays / daysInMonth : 0;

      bus.forEach(bu => {
        let faturamento = getConsolidatedMeta(bu, monthName, 'faturamento').value;

        if (bu === 'modelo_atual' && closerFilter && closerFilter.length > 0 && getFilteredMeta) {
          const vendas = faturamento / BU_TICKETS[bu];
          const filteredVendas = getFilteredMeta(vendas, bu, monthName, closerFilter);
          faturamento = filteredVendas * BU_TICKETS[bu];
        }

        total += faturamento * fraction;
      });
    }

    return Math.round(total);
  };

  /**
   * Obtém metas monetárias para um indicador específico
   */
  const getMetaMonetaryForPeriod = (
    indicatorKey: ConsolidatedMetricType | 'sla',
    bus: BuType[],
    startDate: Date,
    endDate: Date,
    closerFilter?: string[],
    getFilteredMeta?: (value: number, bu: string, month: string, closers: string[]) => number
  ): number => {
    if (indicatorKey === 'sla') return 30;

    // Com filtro de closer ativo, ajustar TODAS as métricas monetárias
    if (closerFilter && closerFilter.length > 0 && getFilteredMeta) {
      const filteredFaturamento = getFilteredFaturamentoMeta(bus, startDate, endDate, closerFilter, getFilteredMeta);
      
      switch (indicatorKey) {
        case 'faturamento': return filteredFaturamento;
        case 'mrr': return Math.round(filteredFaturamento * 0.25);
        case 'setup': return Math.round(filteredFaturamento * 0.60);
        case 'pontual': return Math.round(filteredFaturamento * 0.15);
      }
    }

    return getMetaForPeriod(bus, startDate, endDate, indicatorKey);
  };

  /**
   * Verifica se há overrides no banco para alguma BU
   */
  const hasAnyDbOverrides = useMemo(() => {
    return metas.some(m => 
      Number(m.faturamento) > 0 || Number(m.mrr) > 0 || Number(m.setup) > 0 || Number(m.pontual) > 0
    );
  }, [metas]);

  /**
   * Obtém a fonte dos dados para uma BU específica
   */
  const getDataSourceForBU = (bu: BuType): 'database' | 'plan_growth' | 'none' => {
    if (hasDbOverridesForBU(bu)) return 'database';
    if (funnelData && funnelData[buToFunnelKey[bu]]?.length > 0) return 'plan_growth';
    return 'none';
  };

  return {
    // Core functions
    getConsolidatedMeta,
    getMetaForPeriod,
    getMetaMonetaryForPeriod,
    getPlanGrowthMeta,
    getFilteredFaturamentoMeta,
    
    // State
    isLoading: isLoadingDb,
    isPlanGrowthLoaded,
    hasAnyDbOverrides,
    hasDbOverridesForBU,
    getDataSourceForBU,
    
    // Constants
    BU_TICKETS,
    MONTH_NAMES,
  };
}
