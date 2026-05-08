import { useMemo } from 'react';
import { useMonetaryMetas, BuType, MonthType, MetricType } from './useMonetaryMetas';
import { useMediaMetas, FunnelDataItem } from '@/contexts/MediaMetasContext';
import { useFunnelMetas } from './useFunnelMetas';
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
  const { isMonthLocked, getLockedSnapshot, funnelMetas } = useFunnelMetas(2026);

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
    // 🔒 LOCK-AWARE: Para Modelo Atual, se o mês está locked em funnel_metas,
    // usar snapshot congelado (faturamento_vender = Meta Original − MRR Base do momento do lock)
    // em vez de recalcular via funnelData ao vivo. Isso protege as metas dos acelerômetros
    // de mudanças retroativas quando o usuário edita MRR Base ou Plan Growth.
    if (bu === 'modelo_atual' && isMonthLocked('modelo_atual', month)) {
      const snapshot = getLockedSnapshot('modelo_atual', month);
      if (snapshot && snapshot.faturamento_vender > 0) {
        const fatIncremento = snapshot.faturamento_vender;
        switch (metric) {
          case 'faturamento': return { value: fatIncremento, source: 'database' };
          case 'mrr':         return { value: Math.round(fatIncremento * 0.25), source: 'database' };
          case 'setup':       return { value: Math.round(fatIncremento * 0.60), source: 'database' };
          case 'pontual':     return { value: Math.round(fatIncremento * 0.15), source: 'database' };
        }
      }
    }

    // 🎯 MODELO ATUAL (não-lockado): Incremento ≡ "A Vender" puro, não MRR Base + A Vender.
    // Fonte de verdade: funnel_metas.faturamento_vender (persistido) OU funnelData.faturamento
    // (live no Plan Growth, ainda não salvo). NUNCA monetary_metas.faturamento, que armazena
    // Faturamento Total (MRR Base + A Vender). Alinhado com mem://logic/indicators/incremento-definition-v4.
    if (bu === 'modelo_atual') {
      const fm = funnelMetas.find(m => m.bu === 'modelo_atual' && m.month === month);
      const fatVender = Number(fm?.faturamento_vender || 0);
      const planGrowthFat = getPlanGrowthMeta('modelo_atual', month, 'faturamento');
      const incremento = fatVender > 0 ? fatVender : planGrowthFat;
      if (incremento > 0) {
        const source = fatVender > 0 ? 'database' : 'plan_growth';
        switch (metric) {
          case 'faturamento': return { value: incremento, source };
          case 'mrr':         return { value: Math.round(incremento * 0.25), source };
          case 'setup':       return { value: Math.round(incremento * 0.60), source };
          case 'pontual':     return { value: Math.round(incremento * 0.15), source };
        }
      }
    }


    // 1. Tentar banco de dados (monetary_metas) para TODAS as BUs, inclusive modelo_atual não-locked.
    // monetary_metas é a fonte única de verdade compartilhada com useEffectiveMetas e Plan Growth,
    // refletindo o valor salvo pelo usuário. Elimina a divergência com o reverse funnel projetado.
    const dbValue = getMeta(bu, month, metric as MetricType);
    if (dbValue > 0) {
      return { value: dbValue, source: 'database' };
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

        // Aplicar rateio de % por closer (closer_metas) para TODAS as BUs quando filtro estiver ativo
        if (closerFilter && closerFilter.length > 0 && getFilteredMeta) {
          const ticket = BU_TICKETS[bu] || 1;
          const vendas = faturamento / ticket;
          const filteredVendas = getFilteredMeta(vendas, bu, monthName, closerFilter);
          faturamento = filteredVendas * ticket;
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
