import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useOxyFinance } from "@/hooks/useOxyFinance";

interface CategoryEntry { period: string; value: number; }
interface DreCategory {
  label: string;
  type: string;
  data: CategoryEntry[];
  ids: string[];
}

// Padrões pra identificar o grupo "Despesas com Pessoal" no DRE
const PERSONNEL_GROUP_PATTERNS = [
  /despesas?\s+com\s+pessoal/,
  /\bpessoal\b/,
  /\brh\b/,
  /folha\s+de\s+pagamento/,
];

// Categoria considerada "Rescisão" pro card de turnover
const RESCISAO_PATTERN = /rescis/;

function normalize(s: string): string {
  return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function periodInRange(period: string, start: Date, end: Date): boolean {
  const m = period.match(/^(\d{4})-(\d{2})$/);
  if (!m) return false;
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  const date = new Date(y, mo - 1, 15);
  return date >= start && date <= end;
}

export interface PersonnelGroupInfo {
  id: string;
  label: string;
  code: string;
}

export interface PersonnelCategoryRow {
  label: string;
  valor: number;
  ids: string[];
}

export interface PersonnelCostFromDREResult {
  isLoading: boolean;
  error: Error | null;
  /** Grupos DRE identificados como "Pessoal" */
  gruposPessoal: PersonnelGroupInfo[];
  /** Categorias dentro dos grupos, com valor no período */
  categorias: PersonnelCategoryRow[];
  custoTotalPeriodo: number;
  custoRescisaoPeriodo: number;
}

interface UseParams {
  startDate: Date;
  endDate: Date;
}

export function usePersonnelCostFromDRE({ startDate, endDate }: UseParams): PersonnelCostFromDREResult {
  const year = startDate.getFullYear();
  const oxy = useOxyFinance(year);

  // 1) Detectar grupos de pessoal a partir do DRE bruto
  const gruposPessoal = useMemo<PersonnelGroupInfo[]>(() => {
    const groups: any[] = oxy.dreRaw?.groups || [];
    const found: PersonnelGroupInfo[] = [];
    for (const g of groups) {
      const label = g?.label || "";
      const norm = normalize(label);
      const matches = PERSONNEL_GROUP_PATTERNS.some((re) => re.test(norm));
      if (!matches) continue;
      const ids: string[] = Array.isArray(g?.ids) ? g.ids : [];
      for (const id of ids) {
        if (id) found.push({ id, label, code: g?.code || "" });
      }
    }
    return found;
  }, [oxy.dreRaw]);

  // 2) Buscar categorias pros grupos de pessoal
  const groupIdsKey = gruposPessoal.map((g) => g.id).sort().join(",");
  const startStr = format(startDate, "yyyy-MM-dd");
  const endStr = format(endDate, "yyyy-MM-dd");

  const categoriesQuery = useQuery({
    queryKey: ["oxy-personnel-categories", groupIdsKey, startStr, endStr],
    enabled: gruposPessoal.length > 0,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("fetch-oxy-finance", {
        body: {
          action: "dre_categories",
          groupIds: gruposPessoal.map((g) => g.id),
          startDate: startStr,
          endDate: endStr,
        },
      });
      if (error) throw error;
      return (data?.categories || []) as DreCategory[];
    },
  });

  return useMemo<PersonnelCostFromDREResult>(() => {
    const cats = categoriesQuery.data || [];
    const rows: PersonnelCategoryRow[] = [];
    let total = 0;
    let rescisao = 0;
    for (const c of cats) {
      const valor = (c.data || [])
        .filter((d) => periodInRange(d.period, startDate, endDate))
        .reduce((s, d) => s + Math.abs(Number(d.value || 0)), 0);
      if (valor <= 0) continue;
      rows.push({ label: c.label, valor, ids: c.ids || [] });
      total += valor;
      if (RESCISAO_PATTERN.test(normalize(c.label))) rescisao += valor;
    }
    rows.sort((a, b) => b.valor - a.valor);
    return {
      isLoading: oxy.isLoading || categoriesQuery.isLoading,
      error: (oxy.error as Error) || (categoriesQuery.error as Error) || null,
      gruposPessoal,
      categorias: rows,
      custoTotalPeriodo: total,
      custoRescisaoPeriodo: rescisao,
    };
  }, [categoriesQuery.data, categoriesQuery.isLoading, categoriesQuery.error, oxy.isLoading, oxy.error, gruposPessoal, startDate, endDate]);
}
