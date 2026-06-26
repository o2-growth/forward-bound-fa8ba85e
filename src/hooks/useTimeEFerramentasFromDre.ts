import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

/**
 * Custo total da Oxy para a linha "Time e ferramentas" da aba Marketing.
 * Fonte: DRE Oxy detalhado (mesmo endpoint usado para custo de pessoal por BU e custo do squad CFO).
 *
 * Classificação por regex aplicada ao label da categoria:
 * - FERRAMENTAS: "Softwares e Ferramentas - <área>" + "Assessoria de informática".
 * - TIME: Equipe / Benefícios / Estagiários / Pró-labore / FGTS / INSS / Rescisões / Cursos
 *         / Salários / Distribuição de Lucros / Comissão de Parceiros / Comissionamentos
 *         / Serviços de Terceiros (Marketing/Comercial/Pessoal) / Alimentação-Deslocamento-Viagens
 *         / Endomarketing / Assessoria Marketing / Menor Aprendiz / Seguro de Vida / Férias / 13º.
 *
 * Não inclui: Assessoria Contábil/Financeira/Jurídica/RH, Eventos Internos, aluguel, energia, internet,
 * materiais, impostos retidos — esses entram apenas em "Despesas totais".
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

const FERRAMENTAS_RE = /software.*ferrament|ferrament.*software|assessoria de informatica/i;

// Regex de TIME: pessoal de qualquer BU + corporativo + comissões comerciais + serviços de terceiros de Mkt/Comercial
const TIME_RE =
  /equipe|beneficio|estagiari|alimentac|deslocament|viage|pro[\s-]?labore|salari|fgts|inss|rescis|feria|13|cursos|treinament|seguro de vida|distribuic[aã]o de lucros|menor aprendiz|endomarketing|assessoria marketing|comiss[aã]o de parceiros|comissionamento|premiac|servic.*terceiros/i;

// Grupos relevantes — pegamos categorias de Custos Variáveis por BU + Despesas com Pessoal + Marketing + Comercial + Administrativas
const RELEVANT_GROUP_RE = /^custos\s+|despesas?\s+com\s+pessoal|despesas?\s+de\s+marketing|despesas?\s+comerciais|despesas?\s+administrativas/i;

export interface TfCategoria {
  label: string;
  valor: number;
  bucket: "time" | "ferramentas";
  serie: { period: string; value: number }[];
}

export interface MonthBreakdown {
  period: string; // yyyy-MM
  time: number;
  ferramentas: number;
  total: number;
}

interface UseParams {
  startDate: Date;
  endDate: Date;
  enabled?: boolean;
}

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

export function useTimeEFerramentasFromDre({ startDate, endDate, enabled = true }: UseParams) {
  const start = format(startDate, "yyyy-MM-01");
  const end = format(endDate, "yyyy-MM-dd");

  const groupsQ = useQuery({
    queryKey: ["oxy-dre-groups-tf", start, end],
    queryFn: () => fetchDreGroups(start, end),
    staleTime: 5 * 60 * 1000,
    enabled,
  });

  const relevantGroupIds = useMemo(() => {
    const groups = groupsQ.data || [];
    const ids: string[] = [];
    for (const g of groups) {
      if (g.type !== "group") continue;
      if (RELEVANT_GROUP_RE.test(g.label) && g.ids[0]) ids.push(g.ids[0]);
    }
    return ids;
  }, [groupsQ.data]);

  const catsQ = useQuery({
    queryKey: ["oxy-dre-cats-tf", start, end, relevantGroupIds.join(",")],
    queryFn: () => fetchDreCategories(start, end, relevantGroupIds),
    enabled: enabled && relevantGroupIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const result = useMemo(() => {
    const cats = catsQ.data || [];
    let time = 0;
    let ferramentas = 0;
    const categorias: TfCategoria[] = [];
    const byMonth = new Map<string, { time: number; ferramentas: number }>();

    for (const cat of cats) {
      if (cat.type !== "category") continue;
      const label = cat.label || "";
      const isFerr = FERRAMENTAS_RE.test(label);
      const isTime = !isFerr && TIME_RE.test(label);
      if (!isFerr && !isTime) continue;

      const serie = (cat.data || [])
        .filter((d) => d.period !== "TOTAL" && periodInRange(d.period, startDate, endDate))
        .map((d) => ({ period: d.period, value: Number(d.value) || 0 }))
        .sort((a, b) => a.period.localeCompare(b.period));

      const valor = serie.reduce((s, d) => s + d.value, 0);
      if (valor === 0) continue;

      if (isFerr) ferramentas += valor;
      else time += valor;

      categorias.push({ label, valor, bucket: isFerr ? "ferramentas" : "time", serie });

      for (const s of serie) {
        const cur = byMonth.get(s.period) || { time: 0, ferramentas: 0 };
        if (isFerr) cur.ferramentas += s.value;
        else cur.time += s.value;
        byMonth.set(s.period, cur);
      }
    }

    categorias.sort((a, b) => b.valor - a.valor);

    const serieByMonth: MonthBreakdown[] = Array.from(byMonth.entries())
      .map(([period, v]) => ({ period, time: v.time, ferramentas: v.ferramentas, total: v.time + v.ferramentas }))
      .sort((a, b) => a.period.localeCompare(b.period));

    const byMonthMap: Record<string, MonthBreakdown> = {};
    for (const m of serieByMonth) byMonthMap[m.period] = m;

    return {
      time,
      ferramentas,
      total: time + ferramentas,
      categoriasTime: categorias.filter((c) => c.bucket === "time"),
      categoriasFerramentas: categorias.filter((c) => c.bucket === "ferramentas"),
      serieByMonth,
      byMonthMap,
    };
  }, [catsQ.data, startDate, endDate]);

  return {
    ...result,
    isLoading: groupsQ.isLoading || catsQ.isLoading,
    error: (groupsQ.error || catsQ.error) as Error | null,
  };
}
