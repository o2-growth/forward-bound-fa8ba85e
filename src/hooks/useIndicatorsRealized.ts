import { useMemo } from "react";
import { startOfMonth, endOfMonth } from "date-fns";
import { useQueries } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useO2TaxMetas } from "./useO2TaxMetas";
import { useOxyHackerMetas } from "./useOxyHackerMetas";
import { useExpansaoMetas } from "./useExpansaoMetas";
import { isMqlQualified, buildExcludedMqlCardIds } from "./useModeloAtualMetas";
import { fixPossibleDateInversion } from "./dateUtils";
import { months, BUKey } from "@/components/planning/salesData";

// Month name to month index (0-based)
const MONTH_INDEX: Record<string, number> = {
  'Jan': 0, 'Fev': 1, 'Mar': 2, 'Abr': 3,
  'Mai': 4, 'Jun': 5, 'Jul': 6, 'Ago': 7,
  'Set': 8, 'Out': 9, 'Nov': 10, 'Dez': 11,
};

export interface FunnelRealized {
  vendas: number;
  propostas: number;
  rrs: number;
  rms: number;
  mqls: number;
  leads: number;
  valor: number;
}

export interface FunnelRealizedByBU {
  [bu: string]: {
    [month: string]: FunnelRealized;
  };
}

export interface SalesRealizedByBU {
  [bu: string]: {
    [month: string]: number;
  };
}

// Phase mapping for Modelo Atual (same as useModeloAtualMetas)
const MA_PHASE_TO_INDICATOR: Record<string, string> = {
  'Novos Leads': 'leads',
  'MQLs': 'mql',
  'Tentativas de contato': 'mql',
  'Material ISCA': 'mql',
  'Start form': 'mql',
  'Reunião agendada / Qualificado': 'rm',
  'Reunião Realizada': 'rr',
  '1° Reunião Realizada - Apresentação': 'rr',
  'Proposta enviada / Follow Up': 'proposta',
  'Contrato assinado': 'venda',
};

function parseDate(dateValue: string | null): Date | null {
  if (!dateValue) return null;
  const date = new Date(dateValue);
  return isNaN(date.getTime()) ? null : date;
}

function parseDateOnly(dateValue: string | null): Date | null {
  if (!dateValue) return null;
  const match = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return parseDate(dateValue);
  const [, y, m, d] = match;
  return new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0);
}

function parseNumericValue(value: any): number {
  if (typeof value === 'number') return value;
  if (value === null || value === undefined) return 0;
  if (typeof value === 'string') {
    let cleaned = value.replace(/[R$\s]/g, '').trim();
    if (cleaned === '') return 0;
    const hasComma = cleaned.includes(',');
    const hasDot = cleaned.includes('.');
    if (hasComma && hasDot) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else if (hasComma && !hasDot) {
      cleaned = cleaned.replace(',', '.');
    }
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

interface MAMonthResult {
  month: string;
  vendas: number;
  propostas: number;
  rrs: number;
  rms: number;
  mqls: number;
  leads: number;
  valor: number;
}

/**
 * Fetches Modelo Atual data for a single month using the exact same queries
 * as useModeloAtualMetas, ensuring data parity with the Indicadores tab.
 */
async function fetchModeloAtualMonth(year: number, monthIndex: number, monthName: string): Promise<MAMonthResult> {
  const mStart = startOfMonth(new Date(year, monthIndex, 1));
  const mEnd = endOfMonth(new Date(year, monthIndex, 1));
  const startISO = mStart.toISOString().split('T')[0] + 'T00:00:00.000Z';
  const endISO = mEnd.toISOString().split('T')[0] + 'T23:59:59.999Z';

  // Same 3 queries as useModeloAtualMetas
  const [periodResponse, creationResponse, signatureResponse] = await Promise.all([
    supabase.functions.invoke('query-external-db', {
      body: { table: 'pipefy_moviment_cfos', action: 'query_period', startDate: startISO, endDate: endISO, limit: 10000 }
    }),
    supabase.functions.invoke('query-external-db', {
      body: { table: 'pipefy_moviment_cfos', action: 'query_period_by_creation', startDate: startISO, endDate: endISO, limit: 10000 }
    }),
    supabase.functions.invoke('query-external-db', {
      body: { table: 'pipefy_moviment_cfos', action: 'query_period_by_signature', startDate: startISO, endDate: endISO, limit: 10000 }
    }),
  ]);

  if (periodResponse.error) throw periodResponse.error;

  const periodRows = periodResponse.data?.data || [];
  const creationRows = creationResponse?.data?.data || [];
  const signatureRows = signatureResponse?.data?.data || [];

  // Parse period movements (same logic as useModeloAtualMetas)
  interface Movement {
    id: string; fase: string; faseAtual: string; motivoPerda?: string;
    dataEntrada: Date; dataCriacao: Date | null; dataAssinatura: Date | null;
    faixaFaturamento?: string; valor: number;
  }

  const movements: Movement[] = [];
  for (const row of periodRows) {
    const id = String(row['ID'] || row['id'] || '');
    const fase = row['Fase'] || row['fase'] || '';
    if (!fase || !MA_PHASE_TO_INDICATOR[fase]) continue;

    let dataEntrada = parseDate(row['Entrada'] || row['entrada']) || new Date();
    const dataAssinatura = parseDateOnly(row['Data de assinatura do contrato']);
    if (fase === 'Contrato assinado' && dataAssinatura) dataEntrada = fixPossibleDateInversion(dataAssinatura, dataEntrada);

    const valorMRR = parseNumericValue(row['Valor MRR'] || 0);
    const valorPontual = parseNumericValue(row['Valor Pontual'] || 0);
    const valorEducacao = parseNumericValue(row['Valor Educação'] || row['Valor Educacao'] || 0);
    const valorSetup = parseNumericValue(row['Valor Setup'] || 0);

    movements.push({
      id, fase,
      faseAtual: row['Fase Atual'] || row['fase_atual'] || fase,
      motivoPerda: row['Motivo da perda'] || row['motivo_perda'] || undefined,
      dataEntrada, dataCriacao: parseDate(row['Data Criação']), dataAssinatura,
      faixaFaturamento: (row['Faixa de faturamento mensal'] || row['Faixa'] || '') || undefined,
      valor: valorMRR + valorPontual + valorEducacao + valorSetup,
    });
  }

  // Merge signature movements (dedup by id+fase)
  const existingKeys = new Set(movements.map(m => `${m.id}|${m.fase}`));
  for (const row of signatureRows) {
    const id = String(row['ID'] || row['id'] || '');
    const fase = row['Fase'] || row['fase'] || '';
    if (!id || !fase || !MA_PHASE_TO_INDICATOR[fase]) continue;
    const key = `${id}|${fase}`;
    if (existingKeys.has(key)) continue;

    const dataAssinatura = parseDateOnly(row['Data de assinatura do contrato']);
    let dataEntrada = parseDate(row['Entrada'] || row['entrada']) || new Date();
    if (fase === 'Contrato assinado' && dataAssinatura) dataEntrada = fixPossibleDateInversion(dataAssinatura, dataEntrada);

    const valorMRR = parseNumericValue(row['Valor MRR'] || 0);
    const valorPontual = parseNumericValue(row['Valor Pontual'] || 0);
    const valorEducacao = parseNumericValue(row['Valor Educação'] || row['Valor Educacao'] || 0);
    const valorSetup = parseNumericValue(row['Valor Setup'] || 0);

    movements.push({
      id, fase,
      faseAtual: row['Fase Atual'] || row['fase_atual'] || fase,
      motivoPerda: row['Motivo da perda'] || row['motivo_perda'] || undefined,
      dataEntrada, dataCriacao: parseDate(row['Data Criação']), dataAssinatura,
      faixaFaturamento: (row['Faixa de faturamento mensal'] || row['Faixa'] || '') || undefined,
      valor: valorMRR + valorPontual + valorEducacao + valorSetup,
    });
    existingKeys.add(key);
  }

  // Parse MQL-by-creation
  interface MqlCreation { id: string; dataCriacao: Date | null; faseAtual: string; motivoPerda?: string; faixaFaturamento?: string; }
  const mqlByCreation: MqlCreation[] = [];
  for (const row of creationRows) {
    const id = String(row['ID'] || row['id'] || '');
    if (!id) continue;
    mqlByCreation.push({
      id,
      dataCriacao: parseDate(row['Data Criação']),
      faseAtual: row['Fase Atual'] || row['fase_atual'] || '',
      motivoPerda: row['Motivo da perda'] || row['motivo_perda'] || undefined,
      faixaFaturamento: (row['Faixa de faturamento mensal'] || row['Faixa'] || '') || undefined,
    });
  }

  // Count funnel metrics (same logic as useModeloAtualMetas.getQtyForPeriod)
  const startTime = new Date(year, monthIndex, 1).getTime();
  const endTime = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999).getTime();

  // Card-level MQL exclusion: any row with excluded reason excludes the whole card
  const excludedMqlIds = buildExcludedMqlCardIds(mqlByCreation);

  const countIndicator = (indicator: string): number => {
    if (indicator === 'mql') {
      const seenIds = new Set<string>();
      for (const m of mqlByCreation) {
        if (!m.dataCriacao) continue;
        const t = m.dataCriacao.getTime();
        if (t >= startTime && t <= endTime && isMqlQualified(m.faixaFaturamento)) {
          seenIds.add(m.id);
        }
      }
      return seenIds.size;
    }

    const seenIds = new Set<string>();
    for (const m of movements) {
      const t = m.dataEntrada.getTime();
      if (t >= startTime && t <= endTime) {
        const mi = MA_PHASE_TO_INDICATOR[m.fase];
        if (indicator === 'leads') {
          if (mi === 'leads' || mi === 'mql') seenIds.add(m.id);
        } else if (mi === indicator) {
          seenIds.add(m.id);
        }
      }
    }
    return seenIds.size;
  };

  // Value for venda (same logic as useModeloAtualMetas.getValueForPeriod)
  const cardValues = new Map<string, number>();
  for (const m of movements) {
    const t = m.dataEntrada.getTime();
    if (t >= startTime && t <= endTime && MA_PHASE_TO_INDICATOR[m.fase] === 'venda') {
      const existing = cardValues.get(m.id);
      if (!existing || m.valor > existing) {
        cardValues.set(m.id, m.valor > 0 ? m.valor : 17000);
      }
    }
  }
  const valor = Array.from(cardValues.values()).reduce((sum, v) => sum + v, 0);

  return {
    month: monthName,
    vendas: countIndicator('venda'),
    propostas: countIndicator('proposta'),
    rrs: countIndicator('rr'),
    rms: countIndicator('rm'),
    mqls: countIndicator('mql'),
    leads: countIndicator('leads'),
    valor,
  };
}

/**
 * Hook que calcula o realizado das vendas e funil completo.
 * Modelo Atual usa queries mensais individuais (paridade com Indicadores).
 * O2 Tax, Oxy Hacker, Franquia usam hooks existentes.
 */
export function useIndicatorsRealized(year: number = 2026) {
  // Monthly queries for Modelo Atual (12 queries, same as Indicadores tab)
  const maMonthlyQueries = useQueries({
    queries: months.map((monthName) => {
      const monthIndex = MONTH_INDEX[monthName];
      return {
        queryKey: ['indicators-realized-ma', year, monthName],
        queryFn: () => fetchModeloAtualMonth(year, monthIndex, monthName),
        staleTime: 5 * 60 * 1000,
        retry: 1,
      };
    }),
  });

  // Other BUs use their existing hooks (no date-range issue)
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);
  const o2Tax = useO2TaxMetas(yearStart, yearEnd);
  const oxyHacker = useOxyHackerMetas(yearStart, yearEnd);
  const franquia = useExpansaoMetas(yearStart, yearEnd);

  const maLoading = maMonthlyQueries.some(q => q.isLoading);
  const maError = maMonthlyQueries.find(q => q.error)?.error || null;
  const isLoading = maLoading || o2Tax.isLoading || oxyHacker.isLoading || franquia.isLoading;
  const error = maError || o2Tax.error || oxyHacker.error || franquia.error;

  // Full funnel realized by BU and month
  const realizedFunnelByBU = useMemo<FunnelRealizedByBU>(() => {
    const result: FunnelRealizedByBU = {
      modelo_atual: {},
      o2_tax: {},
      oxy_hacker: {},
      franquia: {},
    };

    // Modelo Atual: from monthly queries
    for (const query of maMonthlyQueries) {
      if (query.data) {
        const d = query.data;
        result.modelo_atual[d.month] = {
          vendas: d.vendas, propostas: d.propostas, rrs: d.rrs,
          rms: d.rms, mqls: d.mqls, leads: d.leads, valor: d.valor,
        };
      }
    }

    // O2 Tax, Oxy Hacker, Franquia: from hooks with monthly getQtyForPeriod
    const otherBUs = {
      o2_tax: o2Tax,
      oxy_hacker: oxyHacker,
      franquia: franquia,
    };

    months.forEach((month) => {
      const monthIndex = MONTH_INDEX[month];
      const mStart = startOfMonth(new Date(year, monthIndex, 1));
      const mEnd = endOfMonth(new Date(year, monthIndex, 1));

      for (const [buKey, hook] of Object.entries(otherBUs)) {
        const vendas = hook.getQtyForPeriod('venda', mStart, mEnd);
        const propostas = hook.getQtyForPeriod('proposta', mStart, mEnd);
        const rrs = hook.getQtyForPeriod('rr', mStart, mEnd);
        const rms = hook.getQtyForPeriod('rm', mStart, mEnd);
        const mqls = hook.getQtyForPeriod('mql', mStart, mEnd);
        const leads = hook.getQtyForPeriod('leads', mStart, mEnd);
        const valor = hook.getValueForPeriod('venda', mStart, mEnd);

        result[buKey][month] = { vendas, propostas, rrs, rms, mqls, leads, valor };
      }
    });

    return result;
  }, [year, maMonthlyQueries, o2Tax, oxyHacker, franquia]);

  // Backward-compatible realizedByBU (valor only)
  const realizedByBU = useMemo<SalesRealizedByBU>(() => {
    const result: SalesRealizedByBU = {};
    for (const [bu, monthData] of Object.entries(realizedFunnelByBU)) {
      result[bu] = {};
      for (const [month, funnel] of Object.entries(monthData)) {
        result[bu][month] = funnel.valor;
      }
    }
    return result;
  }, [realizedFunnelByBU]);

  const calculateBURealized = (buKey: BUKey): number => {
    return months.reduce((sum, month) => sum + (realizedByBU[buKey]?.[month] || 0), 0);
  };

  const totalRealized = useMemo(() => {
    return Object.keys(realizedByBU).reduce(
      (sum, bu) => sum + calculateBURealized(bu as BUKey),
      0
    );
  }, [realizedByBU]);

  return {
    realizedByBU,
    realizedFunnelByBU,
    calculateBURealized,
    totalRealized,
    isLoading,
    error,
  };
}
