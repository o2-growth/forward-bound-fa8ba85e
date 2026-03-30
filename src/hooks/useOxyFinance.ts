import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";
import type { BuType, MonthType } from "./useMonetaryMetas";
import { MONTHS } from "./useMonetaryMetas";

// Mapeamento de grupos DRE para BUs internas (apenas mapeamentos diretos 1:1)
// "Expansão" contém oxy_hacker + franquia combinados — tratado separadamente
const DRE_GROUP_TO_BU: Record<string, BuType> = {
  'CaaS': 'modelo_atual',
  'caas': 'modelo_atual',
  'SaaS': 'modelo_atual',
  'saas': 'modelo_atual',
  'Tax': 'o2_tax',
  'tax': 'o2_tax',
};

// Grupos que representam "Expansão" (contém oxy_hacker + franquia juntos)
const EXPANSAO_GROUPS = ['Expansão', 'expansao', 'Expansao', 'expansão'];

const MONTH_INDEX_TO_NAME: Record<number, MonthType> = {
  0: 'Jan', 1: 'Fev', 2: 'Mar', 3: 'Abr',
  4: 'Mai', 5: 'Jun', 6: 'Jul', 7: 'Ago',
  8: 'Set', 9: 'Out', 10: 'Nov', 11: 'Dez',
};

const MONTH_NAME_TO_INDEX: Record<string, number> = {
  'janeiro': 0, 'fevereiro': 1, 'março': 2, 'marco': 2, 'abril': 3,
  'maio': 4, 'junho': 5, 'julho': 6, 'agosto': 7,
  'setembro': 8, 'outubro': 9, 'novembro': 10, 'dezembro': 11,
  'jan': 0, 'fev': 1, 'mar': 2, 'abr': 3,
  'mai': 4, 'jun': 5, 'jul': 6, 'ago': 7,
  'set': 8, 'out': 9, 'nov': 10, 'dez': 11,
};

export interface CashflowChartPoint {
  month: string;
  inflows: number;
  outflows: number;
  balance: number;
}

export interface DailyRevenueRow {
  date: string;
  total_inflows: number;
  customer_count: number;
  caas: number;
  saas: number;
  expansao: number;
  tax: number;
  source: string;
}

export interface OxyFinanceResult {
  dreByBU: Record<BuType, Record<MonthType, number>>;
  /** Receita bruta do grupo "Expansão" (oxy_hacker + franquia combinados) por mês */
  expansaoByMonth: Record<MonthType, number>;
  dreRaw: any;
  cashflowChart: CashflowChartPoint[];
  cashflowByMonth: Record<MonthType, number>;
  dailyRevenue: DailyRevenueRow[];
  cashflowRaw: any;
  isLoading: boolean;
  error: Error | null;
}

function parseMonthFromDate(dateStr: string): MonthType | null {
  if (!dateStr) return null;
  const match = dateStr.match(/(\d{4})-(\d{2})/);
  if (match) {
    const monthIdx = parseInt(match[2], 10) - 1;
    return MONTH_INDEX_TO_NAME[monthIdx] || null;
  }
  // Try Portuguese month names
  const lower = dateStr.toLowerCase();
  for (const [name, idx] of Object.entries(MONTH_NAME_TO_INDEX)) {
    if (lower.includes(name)) return MONTH_INDEX_TO_NAME[idx] || null;
  }
  return null;
}

function matchBU(groupName: string): BuType | null {
  if (!groupName) return null;
  if (DRE_GROUP_TO_BU[groupName]) return DRE_GROUP_TO_BU[groupName];
  const lower = groupName.toLowerCase();
  for (const [key, bu] of Object.entries(DRE_GROUP_TO_BU)) {
    if (lower.includes(key.toLowerCase())) return bu;
  }
  return null;
}

function isExpansaoGroup(groupName: string): boolean {
  if (!groupName) return false;
  const lower = groupName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return EXPANSAO_GROUPS.some(g => g.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') === lower);
}

function initDreByBU(): Record<BuType, Record<MonthType, number>> {
  const result: Record<string, Record<string, number>> = {};
  for (const bu of ['modelo_atual', 'o2_tax', 'oxy_hacker', 'franquia']) {
    result[bu] = {};
    for (const m of MONTHS) result[bu][m] = 0;
  }
  return result as Record<BuType, Record<MonthType, number>>;
}

/**
 * Hook para buscar dados financeiros da API Oxy Finance via Edge Function.
 * Retorna DRE por BU/mês e dados de fluxo de caixa.
 */
export function useOxyFinance(year: number = 2026): OxyFinanceResult {
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  // DRE query
  const { data: dreData, isLoading: dreLoading, error: dreError } = useQuery({
    queryKey: ['oxy-finance-dre', year],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('fetch-oxy-finance', {
        body: { action: 'dre', startDate, endDate },
      });
      if (error) throw error;
      return data;
    },
    staleTime: 10 * 60 * 1000,
    retry: 2,
  });

  // Cashflow chart query (kept for the CashflowChart component)
  const { data: cashflowData, isLoading: cfLoading, error: cfError } = useQuery({
    queryKey: ['oxy-finance-cashflow-chart', year],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('fetch-oxy-finance', {
        body: { action: 'cashflow_chart', startDate, endDate },
      });
      if (error) throw error;
      return data;
    },
    staleTime: 10 * 60 * 1000,
    retry: 2,
  });

  // Daily revenue from database (primary source for cashflowByMonth)
  const { data: dailyRevenueData, isLoading: drLoading, error: drError } = useQuery({
    queryKey: ['daily-revenue', year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_revenue')
        .select('date, total_inflows, customer_count, caas, saas, expansao, tax, source')
        .eq('year', year)
        .eq('source', 'dre')
        .order('date', { ascending: true });
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  // Parse DRE into dreByBU + expansaoByMonth
  const { parsedDreByBU, expansaoByMonth } = useMemo(() => {
    const result = initDreByBU();
    const expansao: Record<string, number> = {};
    for (const m of MONTHS) expansao[m] = 0;

    if (!dreData) return { parsedDreByBU: result, expansaoByMonth: expansao as Record<MonthType, number> };

    try {
      // Primary: parse groups format { groups: [{ label, code, data: [{ period, value }] }] }
      if (dreData?.groups && Array.isArray(dreData.groups)) {
        for (const group of dreData.groups) {
          // Filter only Receita Bruta (code "RB")
          if (group.code !== 'RB') continue;

          const label = group.label || '';
          const entries = Array.isArray(group.data) ? group.data : [];

          if (isExpansaoGroup(label)) {
            // Expansão: store separately (contains oxy_hacker + franquia combined)
            for (const entry of entries) {
              const monthName = parseMonthFromDate(entry.period || entry.date || '');
              if (monthName) {
                expansao[monthName] += Number(entry.value || 0);
              }
            }
          } else {
            const bu = matchBU(label);
            if (!bu) continue;
            for (const entry of entries) {
              const monthName = parseMonthFromDate(entry.period || entry.date || '');
              if (monthName) {
                result[bu][monthName] += Number(entry.value || 0);
              }
            }
          }
        }
        return { parsedDreByBU: result, expansaoByMonth: expansao as Record<MonthType, number> };
      }

      // Fallback: flat rows format
      const rows = Array.isArray(dreData) ? dreData : dreData?.data || dreData?.rows || [];
      if (Array.isArray(rows)) {
        for (const row of rows) {
          if (row.code && row.code !== 'RB') continue;
          const groupLabel = row.grupo || row.group || row.name || row.categoria || '';

          if (isExpansaoGroup(groupLabel)) {
            if (row.value && row.date) {
              const monthName = parseMonthFromDate(row.date);
              if (monthName) expansao[monthName] += Number(row.value || 0);
            }
            continue;
          }

          const bu = matchBU(groupLabel);
          if (!bu) continue;
          if (row.value && row.date) {
            const monthName = parseMonthFromDate(row.date);
            if (monthName) result[bu][monthName] += Number(row.value || 0);
          }
        }
      }
    } catch (e) {
      console.error('[useOxyFinance] Error parsing DRE data:', e);
    }

    return { parsedDreByBU: result, expansaoByMonth: expansao as Record<MonthType, number> };
  }, [dreData]);

  // Parse cashflow chart data (for CashflowChart component)
  const cashflowChart = useMemo<CashflowChartPoint[]>(() => {
    if (!cashflowData) return [];
    try {
      const items = Array.isArray(cashflowData) ? cashflowData : cashflowData?.items || [];
      return items.map((item: any) => {
        const monthName = parseMonthFromDate(item.month || item.date || '') || '';
        const vals: any[] = item.values || [];
        const getVal = (label: string) => {
          const found = vals.find((v: any) => v.label === label);
          return found ? Number(found.value || 0) : 0;
        };
        return {
          month: monthName,
          inflows: getVal('Entradas'),
          outflows: Math.abs(getVal('Saídas')),
          balance: getVal('Saldo'),
        };
      });
    } catch (e) {
      console.error('[useOxyFinance] Error parsing cashflow data:', e);
      return [];
    }
  }, [cashflowData]);

  // Daily revenue array
  const dailyRevenue = useMemo<DailyRevenueRow[]>(() => {
    if (!dailyRevenueData) return [];
    return dailyRevenueData.map((row: any) => ({
      date: row.date,
      total_inflows: Number(row.total_inflows || 0),
      customer_count: Number(row.customer_count || 0),
      caas: Number(row.caas || 0),
      saas: Number(row.saas || 0),
      expansao: Number(row.expansao || 0),
      tax: Number(row.tax || 0),
      source: row.source || 'cashflow',
    }));
  }, [dailyRevenueData]);

  // Derive cashflowByMonth: prioritize daily_revenue table, fallback to cashflow_chart API
  const cashflowByMonth = useMemo<Record<MonthType, number>>(() => {
    const result: Record<string, number> = {};
    for (const m of MONTHS) result[m] = 0;

    // Primary: sum daily_revenue by month
    if (dailyRevenue.length > 0) {
      for (const row of dailyRevenue) {
        const monthName = parseMonthFromDate(row.date);
        if (monthName && MONTHS.includes(monthName)) {
          result[monthName] += row.total_inflows;
        }
      }
      return result as Record<MonthType, number>;
    }

    // Fallback: use cashflow chart data
    for (const point of cashflowChart) {
      const month = point.month as MonthType;
      if (MONTHS.includes(month)) {
        result[month] += point.inflows;
      }
    }
    return result as Record<MonthType, number>;
  }, [dailyRevenue, cashflowChart]);

  return {
    dreByBU: parsedDreByBU,
    expansaoByMonth,
    dreRaw: dreData,
    cashflowChart,
    cashflowByMonth,
    dailyRevenue,
    cashflowRaw: cashflowData,
    isLoading: dreLoading || cfLoading || drLoading,
    error: (dreError || cfError || drError) as Error | null,
  };
}
