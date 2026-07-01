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

// SaaS group ID in Oxy Finance DRE — contains categories Oxy / Oxy + Gênio / Oxy + Gênio + Especialista / Setup / Parceiros
const SAAS_GROUP_ID = '6c3f10e6-2d2d-48d5-81ef-18bb6389b159';

const OXY_PRODUCT_LABELS = ['oxy', 'oxy + genio', 'oxy + genio + especialista'];

function normalizeLabel(s: string): string {
  return (s || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export interface DreLine {
  /** Código do grupo no DRE Oxy (ex: RB, CV, DX, EBITDA, RESULTADO LÍQUIDO). */
  code: string;
  /** Label exibido pelo Oxy (ex: "CaaS", "EBITDA"). */
  label: string;
  /** Valor por mês do ano corrente. */
  byMonth: Record<MonthType, number>;
}

export interface OxyFinanceResult {
  dreByBU: Record<BuType, Record<MonthType, number>>;
  /** Receita bruta do grupo "Expansão" (oxy_hacker + franquia combinados) por mês */
  expansaoByMonth: Record<MonthType, number>;
  /** Soma das categorias SaaS: Oxy + Oxy+Gênio + Oxy+Gênio+Especialista, por mês */
  oxyProductsByMonth: Record<MonthType, number>;
  /** Receita bruta do grupo "CaaS" por mês (separado do SaaS) */
  caasByMonth: Record<MonthType, number>;
  /** Receita bruta do grupo "SaaS" por mês (separado do CaaS) */
  saasByMonth: Record<MonthType, number>;
  /** Todas as linhas do DRE Oxy (RB, DC, CV, DX, subtotais como EBITDA/RESULTADO), por mês. */
  dreLines: DreLine[];
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

  // SaaS categories — para extrair produtos OXY (Pedrolo)
  const { data: saasCategoriesData } = useQuery({
    queryKey: ['oxy-finance-saas-categories', year],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('fetch-oxy-finance', {
        body: { action: 'dre_categories', groupIds: [SAAS_GROUP_ID], startDate, endDate },
      });
      if (error) throw error;
      return data;
    },
    staleTime: 10 * 60 * 1000,
    retry: 2,
  });

  const oxyProductsByMonth = useMemo<Record<MonthType, number>>(() => {
    const result: Record<string, number> = {};
    for (const m of MONTHS) result[m] = 0;
    const categories = saasCategoriesData?.categories;
    if (!Array.isArray(categories)) return result as Record<MonthType, number>;
    for (const cat of categories) {
      const label = normalizeLabel(cat?.label || '');
      if (!OXY_PRODUCT_LABELS.includes(label)) continue;
      const entries = Array.isArray(cat.data) ? cat.data : [];
      for (const entry of entries) {
        const monthName = parseMonthFromDate(entry.period || entry.date || '');
        if (monthName) result[monthName] += Number(entry.value || 0);
      }
    }
    return result as Record<MonthType, number>;
  }, [saasCategoriesData]);

  // Parse DRE into dreByBU + expansaoByMonth + caasByMonth + saasByMonth
  const { parsedDreByBU, expansaoByMonth, caasByMonth, saasByMonth, dreLines } = useMemo(() => {
    const result = initDreByBU();
    const expansao: Record<string, number> = {};
    const caas: Record<string, number> = {};
    const saas: Record<string, number> = {};
    for (const m of MONTHS) { expansao[m] = 0; caas[m] = 0; saas[m] = 0; }

    const emptyReturn = {
      parsedDreByBU: result,
      expansaoByMonth: expansao as Record<MonthType, number>,
      caasByMonth: caas as Record<MonthType, number>,
      saasByMonth: saas as Record<MonthType, number>,
      dreLines: [] as DreLine[],
    };

    if (!dreData) return emptyReturn;

    const normalize = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

    const lines: DreLine[] = [];

    try {
      // Primary: parse groups format { groups: [{ label, code, data: [{ period, value }] }] }
      if (dreData?.groups && Array.isArray(dreData.groups)) {
        for (const group of dreData.groups) {
          const code = group.code || '';
          const label = group.label || '';
          const labelNorm = normalize(label);
          const entries = Array.isArray(group.data) ? group.data : [];

          // ── Preserva TODAS as linhas do DRE (RB, DC, CV, DX, RF, DF, subtotais…)
          //    para permitir montar o P&L completo (Margem, EBITDA, Resultado).
          const byMonth: Record<string, number> = {};
          for (const m of MONTHS) byMonth[m] = 0;
          for (const entry of entries) {
            const monthName = parseMonthFromDate(entry.period || entry.date || '');
            if (monthName) byMonth[monthName] += Number(entry.value || 0);
          }
          lines.push({ code, label, byMonth: byMonth as Record<MonthType, number> });

          // ── Compat: preenche estruturas legadas por BU (só linhas RB)
          if (code !== 'RB') continue;

          if (isExpansaoGroup(label)) {
            for (const entry of entries) {
              const monthName = parseMonthFromDate(entry.period || entry.date || '');
              if (monthName) expansao[monthName] += Number(entry.value || 0);
            }
          } else {
            const isOxyHacker = labelNorm.includes('oxy hacker') || labelNorm.includes('oxy-hacker') || labelNorm === 'oxyhacker';
            const isFranquia = labelNorm.includes('franquia');
            const bu: BuType | null = isOxyHacker ? 'oxy_hacker' : isFranquia ? 'franquia' : matchBU(label);
            if (!bu) continue;
            for (const entry of entries) {
              const monthName = parseMonthFromDate(entry.period || entry.date || '');
              if (!monthName) continue;
              const value = Number(entry.value || 0);
              result[bu][monthName] += value;
              if (labelNorm === 'caas') caas[monthName] += value;
              else if (labelNorm === 'saas') saas[monthName] += value;
            }
          }
        }
        return {
          parsedDreByBU: result,
          expansaoByMonth: expansao as Record<MonthType, number>,
          caasByMonth: caas as Record<MonthType, number>,
          saasByMonth: saas as Record<MonthType, number>,
          dreLines: lines,
        };
      }

      // Fallback: flat rows format
      const rows = Array.isArray(dreData) ? dreData : dreData?.data || dreData?.rows || [];
      if (Array.isArray(rows)) {
        for (const row of rows) {
          if (row.code && row.code !== 'RB') continue;
          const groupLabel = row.grupo || row.group || row.name || row.categoria || '';
          const labelNorm = normalize(groupLabel);

          if (isExpansaoGroup(groupLabel)) {
            if (row.value && row.date) {
              const monthName = parseMonthFromDate(row.date);
              if (monthName) expansao[monthName] += Number(row.value || 0);
            }
            continue;
          }

          const isOxyHackerRow = labelNorm.includes('oxy hacker') || labelNorm.includes('oxy-hacker') || labelNorm === 'oxyhacker';
          const isFranquiaRow = labelNorm.includes('franquia');
          const bu: BuType | null = isOxyHackerRow ? 'oxy_hacker' : isFranquiaRow ? 'franquia' : matchBU(groupLabel);
          if (!bu) continue;
          if (row.value && row.date) {
            const monthName = parseMonthFromDate(row.date);
            if (!monthName) continue;
            const value = Number(row.value || 0);
            result[bu][monthName] += value;
            if (labelNorm === 'caas') caas[monthName] += value;
            else if (labelNorm === 'saas') saas[monthName] += value;
          }
        }
      }
    } catch (e) {
      console.error('[useOxyFinance] Error parsing DRE data:', e);
    }

    return {
      parsedDreByBU: result,
      expansaoByMonth: expansao as Record<MonthType, number>,
      caasByMonth: caas as Record<MonthType, number>,
      saasByMonth: saas as Record<MonthType, number>,
      dreLines: lines,
    };
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
    oxyProductsByMonth,
    caasByMonth,
    saasByMonth,
    dreRaw: dreData,
    cashflowChart,
    cashflowByMonth,
    dailyRevenue,
    cashflowRaw: cashflowData,
    isLoading: dreLoading || cfLoading || drLoading,
    error: (dreError || cfError || drError) as Error | null,
  };
}
