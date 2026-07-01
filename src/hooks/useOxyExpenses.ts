import { useMemo } from "react";
import { useOxyFinance } from "@/hooks/useOxyFinance";
import type { MonthType } from "@/hooks/useMonetaryMetas";

export interface ExpenseSupplier {
  label: string;
  total: number;
  byMonth: { period: string; value: number }[];
}

interface UseParams {
  startDate: Date;
  endDate: Date;
  enabled?: boolean;
}

// Linhas de custo/despesa do DRE Oxy que compõem "saídas".
// (Não incluímos subtotais como CUSTOS VARIÁVEIS/DESPESAS FIXAS/EBITDA para não duplicar.)
const EXPENSE_CODES = new Set(["CV", "DX", "DF", "DNO", "AD", "INV", "PROV"]);

const MONTH_ORDER: MonthType[] = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

/**
 * "Saídas" derivadas do DRE Oxy já carregado (useOxyFinance).
 * Fonte única com o P&L — garante consistência entre a aba DRE e Caixa.
 * A API `cashflow_details?movimentType=D` não devolve dados; por isso usamos as
 * linhas do DRE (CV, DX, DF, DNO, AD, INV, PROV) como rubricas de saída.
 */
export function useOxyExpenses({ startDate, endDate, enabled = true }: UseParams) {
  const oxy = useOxyFinance();

  const result = useMemo(() => {
    if (!enabled || !oxy.dreLines?.length) {
      return { items: [] as ExpenseSupplier[], total: 0 };
    }

    const startIdx = startDate.getMonth();
    const endIdx = endDate.getMonth();
    const monthsInRange = MONTH_ORDER.slice(
      Math.min(startIdx, endIdx),
      Math.max(startIdx, endIdx) + 1,
    );

    // Agrega por label (várias linhas podem compartilhar code, ex: várias "CV").
    const byLabel = new Map<string, ExpenseSupplier>();
    for (const line of oxy.dreLines) {
      if (!EXPENSE_CODES.has(line.code)) continue;
      const cur =
        byLabel.get(line.label) ?? { label: line.label, total: 0, byMonth: [] };
      for (const m of monthsInRange) {
        const v = Math.abs(Number(line.byMonth?.[m] || 0));
        if (v === 0) continue;
        cur.total += v;
        const existing = cur.byMonth.find((x) => x.period === m);
        if (existing) existing.value += v;
        else cur.byMonth.push({ period: m, value: v });
      }
      byLabel.set(line.label, cur);
    }

    const items = Array.from(byLabel.values())
      .filter((i) => i.total > 0)
      .sort((a, b) => b.total - a.total);
    const total = items.reduce((s, i) => s + i.total, 0);
    return { items, total };
  }, [enabled, oxy.dreLines, startDate, endDate]);

  return {
    items: result.items,
    total: result.total,
    isLoading: oxy.isLoading,
    error: oxy.error,
  };
}
