import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";
import { differenceInDays } from "date-fns";

export interface PessoaRow {
  ID: string;
  "Título": string | null;
  Nome: string | null;
  Cargo: string | null;
  Time: string | null;
  Fase: string | null; // Pipefy phase (Ativo, Concluído, etc.)
  "Situação": string | null; // Ativo / Inativo
  "Data de contratação": string | null;
  "Data de nascimento": string | null;
  CPF: string | null;
  CNPJ: string | null;
  "E-mail O2": string | null;
  created_at: string;
  updated_at: string;
}

export interface HeadcountByGroup {
  group: string;
  count: number;
}

export interface HrPeriodMetrics {
  /** Headcount atual (Situação = Ativo, snapshot) */
  headcountTotal: number;
  /** Headcount agrupado por Time */
  headcountByTime: HeadcountByGroup[];
  /** Headcount agrupado por Cargo */
  headcountByCargo: HeadcountByGroup[];
  /** Tempo médio de casa dos ativos (em dias) */
  tempoMedioDeCasaDias: number;
  /** Pessoas admitidas dentro do período (Data de contratação no range) */
  admissoesNoPeriodo: number;
  /** Pessoas desligadas dentro do período (Situação=Inativo, aprox. via updated_at) */
  desligadosNoPeriodo: number;
  /** Turnover % = desligados / headcount médio */
  turnoverGeral: number;
  /** Turnover por Time */
  turnoverByTime: { group: string; desligados: number; headcount: number; pct: number }[];
}

interface UseHrDataParams {
  startDate: Date;
  endDate: Date;
}

async function fetchPessoas(): Promise<PessoaRow[]> {
  const { data, error } = await supabase.functions.invoke("query-external-db", {
    body: { table: "pipefy_db_pessoas", action: "pessoas_all" },
  });
  if (error) throw error;
  return (data?.rows || []) as PessoaRow[];
}

function isAtivo(p: PessoaRow): boolean {
  const sit = (p["Situação"] || "").trim().toLowerCase();
  if (sit) return sit === "ativo";
  // Fallback to Fase
  const fase = (p.Fase || "").trim().toLowerCase();
  return fase === "ativo";
}

function isInativo(p: PessoaRow): boolean {
  const sit = (p["Situação"] || "").trim().toLowerCase();
  return sit === "inativo" || sit === "desligado";
}

function groupCount(items: PessoaRow[], key: "Time" | "Cargo"): HeadcountByGroup[] {
  const map = new Map<string, number>();
  for (const p of items) {
    const g = (p[key] || "Não informado").trim() || "Não informado";
    map.set(g, (map.get(g) || 0) + 1);
  }
  return Array.from(map.entries())
    .map(([group, count]) => ({ group, count }))
    .sort((a, b) => b.count - a.count);
}

export function useHrData({ startDate, endDate }: UseHrDataParams) {
  const query = useQuery({
    queryKey: ["hr-pessoas-all"],
    queryFn: fetchPessoas,
    staleTime: 5 * 60 * 1000,
  });

  const metrics = useMemo<HrPeriodMetrics>(() => {
    const rows = query.data || [];
    const ativos = rows.filter(isAtivo);
    const inativos = rows.filter(isInativo);

    // Admissões no período
    const admissoes = rows.filter((p) => {
      const d = p["Data de contratação"];
      if (!d) return false;
      const dt = new Date(d);
      return dt >= startDate && dt <= endDate;
    });

    // Desligados no período — aproximação: Inativo cujo updated_at caiu no período
    const desligadosArr = inativos.filter((p) => {
      const d = p.updated_at;
      if (!d) return false;
      const dt = new Date(d);
      return dt >= startDate && dt <= endDate;
    });

    // Tempo médio de casa (ativos)
    const today = new Date();
    const tempos = ativos
      .map((p) => (p["Data de contratação"] ? differenceInDays(today, new Date(p["Data de contratação"]!)) : null))
      .filter((v): v is number => v !== null && v >= 0);
    const tempoMedio = tempos.length > 0 ? tempos.reduce((a, b) => a + b, 0) / tempos.length : 0;

    // Headcount médio do período: aproximação = (ativos atual + ativos atual + desligados no período) / 2
    const headcountFim = ativos.length;
    const headcountInicio = ativos.length + desligadosArr.length - admissoes.length;
    const headcountMedio = (headcountFim + headcountInicio) / 2 || ativos.length;
    const turnover = headcountMedio > 0 ? (desligadosArr.length / headcountMedio) * 100 : 0;

    // Turnover por Time
    const desligByTime = new Map<string, number>();
    for (const p of desligadosArr) {
      const g = (p.Time || "Não informado").trim() || "Não informado";
      desligByTime.set(g, (desligByTime.get(g) || 0) + 1);
    }
    const headByTime = new Map<string, number>();
    for (const p of ativos) {
      const g = (p.Time || "Não informado").trim() || "Não informado";
      headByTime.set(g, (headByTime.get(g) || 0) + 1);
    }
    const allTimes = new Set<string>([...desligByTime.keys(), ...headByTime.keys()]);
    const turnoverByTime = Array.from(allTimes)
      .map((group) => {
        const desligados = desligByTime.get(group) || 0;
        const headcount = headByTime.get(group) || 0;
        const denom = (headcount + desligados) / 2 || headcount;
        return { group, desligados, headcount, pct: denom > 0 ? (desligados / denom) * 100 : 0 };
      })
      .sort((a, b) => b.pct - a.pct);

    return {
      headcountTotal: ativos.length,
      headcountByTime: groupCount(ativos, "Time"),
      headcountByCargo: groupCount(ativos, "Cargo"),
      tempoMedioDeCasaDias: tempoMedio,
      admissoesNoPeriodo: admissoes.length,
      desligadosNoPeriodo: desligadosArr.length,
      turnoverGeral: turnover,
      turnoverByTime,
    };
  }, [query.data, startDate, endDate]);

  return {
    ...metrics,
    rawPessoas: query.data || [],
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}
