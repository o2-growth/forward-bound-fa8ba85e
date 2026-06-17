import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useHrData, type PessoaRow } from "@/hooks/useHrData";

interface CashflowEntry {
  period: string;
  value: number;
}
interface CashflowItem {
  label: string;
  type: string;
  data: CashflowEntry[];
}

interface UseParams {
  startDate: Date;
  endDate: Date;
}

// Stop-words que poluem o match (sufixos jurídicos / palavras genéricas)
const STOPWORDS = new Set([
  "ltda", "me", "epp", "eireli", "sa", "s/a", "s.a", "consultoria", "consultora",
  "servicos", "servico", "comercio", "industria", "ind", "com", "e", "de", "da",
  "do", "das", "dos", "em", "the", "and", "&",
]);

function normalize(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(s: string): string[] {
  return normalize(s)
    .split(" ")
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
}

function periodInRange(period: string, start: Date, end: Date): boolean {
  // period vem como "2026-05" ou "Total" (ignorar Total)
  const m = period.match(/^(\d{4})-(\d{2})$/);
  if (!m) return false;
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  const date = new Date(y, mo - 1, 15);
  return date >= start && date <= end;
}

async function fetchCashflowDetails(startDate: string, endDate: string): Promise<CashflowItem[]> {
  // Tenta CNPJ_FORMATTED primeiro; se vier vazio, fallback pra clean.
  const tryFetch = async (variant?: "clean") => {
    const { data, error } = await supabase.functions.invoke("fetch-oxy-finance", {
      body: { action: "cashflow_details", startDate, endDate, movimentType: "D", cnpjVariant: variant },
    });
    if (error) throw error;
    return (data?.data || []) as CashflowItem[];
  };
  let items = await tryFetch();
  if (!items.length) {
    items = await tryFetch("clean");
  }
  return items;
}

export interface PersonnelMatch {
  pessoaId: string;
  pessoaNome: string;
  pessoaTime: string;
  pessoaCargo: string;
  fornecedorLabel: string;
  valor: number;
}

export interface PersonnelUnmatched {
  fornecedorLabel: string;
  valor: number;
}

export interface PersonnelCostByPersonResult {
  isLoading: boolean;
  error: Error | null;
  lancamentosComMatch: PersonnelMatch[];
  lancamentosSemMatch: PersonnelUnmatched[];
  custoTotalComMatch: number;
  custoTotalSemMatch: number;
  custoTotalGeral: number;
  custoPorPessoa: { pessoaId: string; pessoaNome: string; pessoaTime: string; pessoaCargo: string; valor: number }[];
  custoPorTime: { time: string; valor: number; pessoas: number }[];
}

export function usePersonnelCostByPerson({ startDate, endDate }: UseParams): PersonnelCostByPersonResult {
  const startStr = format(startDate, "yyyy-MM-dd");
  const endStr = format(endDate, "yyyy-MM-dd");
  const hr = useHrData({ startDate, endDate });

  const cashflowQuery = useQuery({
    queryKey: ["oxy-cashflow-details-D", startStr, endStr],
    queryFn: () => fetchCashflowDetails(startStr, endStr),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  return useMemo<PersonnelCostByPersonResult>(() => {
    const items = cashflowQuery.data || [];
    const pessoas: PessoaRow[] = hr.rawPessoas || [];

    // Indexa pessoas por tokens significativos do nome/título
    type PersonIndex = { pessoa: PessoaRow; tokens: string[]; normFull: string };
    const personIndex: PersonIndex[] = [];
    for (const p of pessoas) {
      const candidates = [p.Nome, p["Título"]].filter(Boolean) as string[];
      const seen = new Set<string>();
      for (const c of candidates) {
        const norm = normalize(c);
        if (!norm || seen.has(norm)) continue;
        seen.add(norm);
        personIndex.push({ pessoa: p, tokens: tokens(c), normFull: norm });
      }
    }

    const matched: PersonnelMatch[] = [];
    const unmatched: PersonnelUnmatched[] = [];

    for (const item of items) {
      const valor = (item.data || [])
        .filter((d) => periodInRange(d.period, startDate, endDate))
        .reduce((s, d) => s + Math.abs(Number(d.value || 0)), 0);
      if (valor <= 0) continue;

      const labelNorm = normalize(item.label);
      const labelTokens = new Set(tokens(item.label));

      // 1) Match exato no nome completo normalizado
      let hit = personIndex.find((pi) => pi.normFull && labelNorm.includes(pi.normFull));

      // 2) Match por tokens: todos os tokens significativos da pessoa presentes no label, min 2
      if (!hit) {
        hit = personIndex.find((pi) => {
          if (pi.tokens.length < 2) return false;
          return pi.tokens.every((t) => labelTokens.has(t));
        });
      }

      if (hit) {
        matched.push({
          pessoaId: hit.pessoa.ID,
          pessoaNome: hit.pessoa.Nome || hit.pessoa["Título"] || "—",
          pessoaTime: hit.pessoa.Time || "Não informado",
          pessoaCargo: hit.pessoa.Cargo || "—",
          fornecedorLabel: item.label,
          valor,
        });
      } else {
        unmatched.push({ fornecedorLabel: item.label, valor });
      }
    }

    matched.sort((a, b) => b.valor - a.valor);
    unmatched.sort((a, b) => b.valor - a.valor);

    const custoTotalComMatch = matched.reduce((s, m) => s + m.valor, 0);
    const custoTotalSemMatch = unmatched.reduce((s, m) => s + m.valor, 0);

    // Agregação por pessoa
    const byPersonMap = new Map<string, { pessoaId: string; pessoaNome: string; pessoaTime: string; pessoaCargo: string; valor: number }>();
    for (const m of matched) {
      const cur = byPersonMap.get(m.pessoaId);
      if (cur) cur.valor += m.valor;
      else byPersonMap.set(m.pessoaId, { pessoaId: m.pessoaId, pessoaNome: m.pessoaNome, pessoaTime: m.pessoaTime, pessoaCargo: m.pessoaCargo, valor: m.valor });
    }
    const custoPorPessoa = Array.from(byPersonMap.values()).sort((a, b) => b.valor - a.valor);

    // Agregação por time
    const byTimeMap = new Map<string, { time: string; valor: number; pessoas: Set<string> }>();
    for (const p of custoPorPessoa) {
      const cur = byTimeMap.get(p.pessoaTime);
      if (cur) { cur.valor += p.valor; cur.pessoas.add(p.pessoaId); }
      else byTimeMap.set(p.pessoaTime, { time: p.pessoaTime, valor: p.valor, pessoas: new Set([p.pessoaId]) });
    }
    const custoPorTime = Array.from(byTimeMap.values())
      .map((t) => ({ time: t.time, valor: t.valor, pessoas: t.pessoas.size }))
      .sort((a, b) => b.valor - a.valor);

    return {
      isLoading: cashflowQuery.isLoading || hr.isLoading,
      error: (cashflowQuery.error as Error) || hr.error || null,
      lancamentosComMatch: matched,
      lancamentosSemMatch: unmatched,
      custoTotalComMatch,
      custoTotalSemMatch,
      custoTotalGeral: custoTotalComMatch + custoTotalSemMatch,
      custoPorPessoa,
      custoPorTime,
    };
  }, [cashflowQuery.data, cashflowQuery.isLoading, cashflowQuery.error, hr.rawPessoas, hr.isLoading, hr.error, startDate, endDate]);
}
