import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

/**
 * Custo de pessoal por BU — direto da Oxy DRE.
 * Sem rateio inventado: usa o sufixo de BU embutido no nome da categoria
 * (ex: "Equipe CaaS", "Benefícios - SaaS", "Estagiários TAX").
 * Categorias dentro de "Despesas com Pessoal" (não-BU) → bucket "Corporativo".
 */

interface CategoryEntry { period: string; value: number; }
interface DreCategory {
  label: string;
  type: string;
  data: CategoryEntry[];
  ids: string[];
}
interface DreGroup {
  label: string;
  type: string;
  code: string;
  ids: string[];
  data: CategoryEntry[];
}

// Categorias consideradas "pessoal" (regex no label normalizado)
const PERSONNEL_RE = /equipe|beneficio|estagiari|alimentac|deslocament|viage|pro[\s-]?labore|salari|fgts|inss|rescis|feria|13|cursos|treinament|seguro de vida|distribuic[aã]o de lucros|terceiros|menor aprendiz/i;

// BUs que aparecem na DRE Oxy
export const BU_KEYS = ["CaaS", "SaaS", "TAX", "Expansão", "CS", "Education"] as const;
export type BuKey = typeof BU_KEYS[number] | "Corporativo";

function normalize(s: string): string {
  return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function detectBuFromLabel(label: string): BuKey | null {
  const n = normalize(label);
  // ordem importa: Expansão antes de CS para não confundir, etc.
  if (/\bcaas\b/.test(n)) return "CaaS";
  if (/\bsaas\b/.test(n)) return "SaaS";
  if (/\btax\b/.test(n)) return "TAX";
  if (/expansao/.test(n)) return "Expansão";
  if (/\bcs\b|customer success/.test(n)) return "CS";
  if (/education/.test(n)) return "Education";
  return null;
}

function periodInRange(period: string, start: Date, end: Date): boolean {
  const m = period.match(/^(\d{4})-(\d{2})$/);
  if (!m) return false;
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  const date = new Date(y, mo - 1, 15);
  return date >= start && date <= end;
}

interface UseParams { startDate: Date; endDate: Date; }

export interface CategoriaPessoal {
  label: string;
  valor: number;
  groupLabel: string;
  serie: { period: string; value: number }[];
}


export interface BuCusto {
  bu: BuKey;
  total: number;
  categorias: CategoriaPessoal[];
}

export interface CustoTurnover {
  total: number;
  serie: { period: string; value: number }[];
  categorias: CategoriaPessoal[];
}

async function fetchDreGroups(start: string, end: string): Promise<DreGroup[]> {
  const { data, error } = await supabase.functions.invoke("fetch-oxy-finance", {
    body: { action: "dre", startDate: start, endDate: end },
  });
  if (error) throw error;
  return (data?.groups || []) as DreGroup[];
}

async function fetchDreCategories(start: string, end: string, groupIds: string[]): Promise<DreCategory[]> {
  if (groupIds.length === 0) return [];
  const { data, error } = await supabase.functions.invoke("fetch-oxy-finance", {
    body: { action: "dre_categories", startDate: start, endDate: end, groupIds },
  });
  if (error) throw error;
  return (data?.categories || []) as DreCategory[];
}

export function usePersonnelCostByBu({ startDate, endDate }: UseParams) {
  const start = format(startDate, "yyyy-MM-01");
  const end = format(endDate, "yyyy-MM-dd");

  // 1. Buscar grupos do DRE (descobrir os IDs de Custos Variáveis + Despesas com Pessoal)
  const groupsQ = useQuery({
    queryKey: ["oxy-dre-groups", start, end],
    queryFn: () => fetchDreGroups(start, end),
    staleTime: 5 * 60 * 1000,
  });

  // 2. Identificar grupos relevantes
  const relevantGroups = useMemo(() => {
    const groups = groupsQ.data || [];
    const result: Array<{ id: string; label: string; isCorporate: boolean; bu: BuKey | null }> = [];
    for (const g of groups) {
      if (g.type !== "group") continue;
      const n = normalize(g.label);
      // Custos por BU: "Custos CaaS", "Custos SaaS", etc.
      if (g.code === "CV" && /^custos\s+/i.test(g.label)) {
        const bu = detectBuFromLabel(g.label);
        if (bu && g.ids[0]) result.push({ id: g.ids[0], label: g.label, isCorporate: false, bu });
      }
      // Pessoal corporativo
      if (/despesas?\s+com\s+pessoal/.test(n) && g.ids[0]) {
        result.push({ id: g.ids[0], label: g.label, isCorporate: true, bu: null });
      }
    }
    return result;
  }, [groupsQ.data]);

  // 3. Buscar categorias detalhadas de cada grupo relevante
  const groupIds = relevantGroups.map((g) => g.id);
  const catsQ = useQuery({
    queryKey: ["oxy-dre-cats-by-bu", start, end, groupIds.join(",")],
    queryFn: () => fetchDreCategories(start, end, groupIds),
    enabled: groupIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // 4. Classificar categorias por BU + somar
  const result = useMemo(() => {
    const cats = catsQ.data || [];
    const buckets = new Map<BuKey, BuCusto>();
    const ensure = (bu: BuKey): BuCusto => {
      let b = buckets.get(bu);
      if (!b) {
        b = { bu, total: 0, categorias: [] };
        buckets.set(bu, b);
      }
      return b;
    };

    // Acumulador de turnover (Rescisão) — agrega série mensal entre categorias
    const turnoverSerieMap = new Map<string, number>();
    const turnoverCats: CategoriaPessoal[] = [];
    let turnoverTotal = 0;

    for (const cat of cats) {
      if (cat.type !== "category") continue;
      if (!PERSONNEL_RE.test(cat.label)) continue;

      // Série mensal (sem TOTAL) dentro do range
      const serie = (cat.data || [])
        .filter((d) => d.period !== "TOTAL" && periodInRange(d.period, startDate, endDate))
        .map((d) => ({ period: d.period, value: d.value || 0 }))
        .sort((a, b) => a.period.localeCompare(b.period));

      const valor = serie.reduce((s, d) => s + d.value, 0);
      if (valor === 0) continue;

      const bu = detectBuFromLabel(cat.label) || "Corporativo";
      const bucket = ensure(bu);
      bucket.total += valor;
      bucket.categorias.push({ label: cat.label, valor, groupLabel: "", serie });

      // Custo de turnover = categorias de "Rescisão"
      if (/rescis/i.test(cat.label)) {
        turnoverTotal += valor;
        turnoverCats.push({ label: cat.label, valor, groupLabel: bu, serie });
        for (const s of serie) {
          turnoverSerieMap.set(s.period, (turnoverSerieMap.get(s.period) || 0) + s.value);
        }
      }
    }

    // Ordenar categorias dentro de cada BU
    for (const b of buckets.values()) {
      b.categorias.sort((a, b) => b.valor - a.valor);
    }
    turnoverCats.sort((a, b) => b.valor - a.valor);

    const turnoverSerie = Array.from(turnoverSerieMap.entries())
      .map(([period, value]) => ({ period, value }))
      .sort((a, b) => a.period.localeCompare(b.period));

    const porBu: BuCusto[] = BU_KEYS.map((bu) => buckets.get(bu)).filter((b): b is BuCusto => !!b);
    const corporativo: BuCusto = buckets.get("Corporativo") || { bu: "Corporativo", total: 0, categorias: [] };
    const total = [...porBu, corporativo].reduce((s, b) => s + b.total, 0);

    const custoTurnover: CustoTurnover = {
      total: turnoverTotal,
      serie: turnoverSerie,
      categorias: turnoverCats,
    };

    return { porBu, corporativo, total, custoTurnover };
  }, [catsQ.data, startDate, endDate]);

  return {
    ...result,
    isLoading: groupsQ.isLoading || catsQ.isLoading,
    error: (groupsQ.error || catsQ.error) as Error | null,
  };
}
