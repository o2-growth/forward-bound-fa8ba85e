import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { eachMonthOfInterval, startOfMonth } from "date-fns";

export interface EventInvestmentRow {
  id: string;
  year: number;
  month: number; // 1..12
  valor: number;
  descricao: string | null;
  updated_at: string;
}

/**
 * Investimento em Eventos, mensal, editável no Admin (tabela `event_investments`).
 * Substitui o valor fixo de R$ 25.000 que estava hardcoded na aba Marketing.
 */
export function useEventInvestments() {
  return useQuery({
    queryKey: ["event_investments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_investments")
        .select("id, year, month, valor, descricao, updated_at")
        .order("year", { ascending: true })
        .order("month", { ascending: true });
      if (error) throw error;
      return (data ?? []) as EventInvestmentRow[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Soma o investimento em Eventos dentro do intervalo [from, to] (inclusive por mês).
 * Retorna 0 quando não há dados — chamador decide fallback.
 */
export function sumEventInvestmentInRange(
  rows: EventInvestmentRow[] | undefined,
  from: Date,
  to: Date,
): number {
  if (!rows || rows.length === 0) return 0;
  const months = eachMonthOfInterval({ start: startOfMonth(from), end: startOfMonth(to) });
  const keys = new Set(months.map((d) => `${d.getFullYear()}-${d.getMonth() + 1}`));
  let sum = 0;
  for (const r of rows) {
    if (keys.has(`${r.year}-${r.month}`)) sum += Number(r.valor) || 0;
  }
  return sum;
}
