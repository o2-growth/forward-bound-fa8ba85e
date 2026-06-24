import { useQueries, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { usePersonnelCostByBu } from "./usePersonnelCostByBu";
import { useHrData, type PessoaRow } from "./useHrData";

/**
 * Custo real por squad de CFO — vincula lançamentos do DRE Oxy (drill-down por categoria CaaS)
 * a colaboradores via CNPJ (raiz de 8 dígitos) ou nome normalizado.
 * Agrupa por squad usando a tabela `cfo_squad_assignment`.
 */

export interface SquadAssignmentRow {
  id: string;
  cfo_squad_nome: string;
  pessoa_nome: string;
  role: "cfo" | "analyst";
  pessoa_id: string | null;
}

export interface SquadMemberCost {
  pessoaNome: string;
  pessoaId: string | null;
  cnpj: string | null;
  role: "cfo" | "analyst";
  fee: number;
  benef: number;
  total: number;
  suppliers: { label: string; valor: number; category: string }[];
}

export interface SquadCost {
  cfoNome: string;
  fee: number;
  benef: number;
  total: number;
  membros: SquadMemberCost[];
}

export interface UnmatchedSupplier {
  label: string;
  valor: number;
  category: string;
  idDetectado: string | null;
  tipoIdDetectado: "cpf" | "cnpj" | null;
  /** Sugestão automática (fuzzy/name) para o admin revisar */
  sugestaoPessoaNome?: string | null;
  sugestaoScore?: number;
}

export type MatchConfidence = "cpf" | "cnpj" | "alias" | "name-exact" | "name-fuzzy";

const STOP_TOKENS = new Set([
  "de", "da", "do", "dos", "das", "e", "jr", "junior", "neto", "filho", "sa", "ltda", "me", "eireli",
]);

function tokensFromName(s: string): Set<string> {
  return new Set(
    normalize(s)
      .split(" ")
      .filter((t) => t.length >= 3 && !STOP_TOKENS.has(t))
  );
}

function scoreOverlap(a: Set<string>, b: Set<string>): number {
  let n = 0;
  for (const t of a) if (b.has(t)) n++;
  return n;
}

interface UseParams {
  startDate: Date;
  endDate: Date;
}

const BENEF_RE = /benefic|alimentac|deslocament|viage|seguro de vida|plano de saude|vale|cursos|treinament/i;

function normalize(s: string | null | undefined): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ltda|me\b|eireli|consultoria|assessoria|financeira|servicos?/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function onlyDigits(value: string | null | undefined): string {
  return (value || "").replace(/\D/g, "");
}

function cnpjRoot(value: string | null | undefined): string | null {
  const digits = onlyDigits(value);
  if (digits.length < 8) return null;
  return digits.slice(0, 8);
}

function cpfFull(value: string | null | undefined): string | null {
  const digits = onlyDigits(value);
  if (digits.length < 11) return null;
  return digits.slice(0, 11);
}

interface DrillItem {
  label: string;
  total: number;
}

async function fetchAssignments(): Promise<SquadAssignmentRow[]> {
  const { data, error } = await supabase
    .from("cfo_squad_assignment")
    .select("id, cfo_squad_nome, pessoa_nome, role, pessoa_id");
  if (error) throw error;
  return (data || []) as SquadAssignmentRow[];
}

export interface SupplierAliasRow {
  id: string;
  label_normalizado: string;
  label_original: string;
  pessoa_id: string | null;
  pessoa_nome: string;
}

async function fetchSupplierAliases(): Promise<SupplierAliasRow[]> {
  const { data, error } = await (supabase as any)
    .from("dre_supplier_alias")
    .select("id, label_normalizado, label_original, pessoa_id, pessoa_nome");
  if (error) throw error;
  return (data || []) as SupplierAliasRow[];
}

async function fetchDrillDown(category: string, start: string, end: string): Promise<DrillItem[]> {
  const { data, error } = await supabase.functions.invoke("fetch-oxy-finance", {
    body: { action: "dre_drill_down", category, startDate: start, endDate: end },
  });
  if (error) throw error;
  const raw = (data?.data || []) as Array<{ label: string; data: { period: string; value: number }[] }>;
  return raw.map((r) => {
    const total = (r.data || [])
      .filter((d) => d.period !== "Total" && d.period !== "TOTAL")
      .reduce((s, d) => s + (Number(d.value) || 0), 0);
    return { label: r.label, total };
  });
}

export function useSquadCostFromDre({ startDate, endDate }: UseParams) {
  const start = format(startDate, "yyyy-MM-01");
  const end = format(endDate, "yyyy-MM-dd");

  const pc = usePersonnelCostByBu({ startDate, endDate });
  const hr = useHrData({ startDate, endDate });

  // Lista de categorias CaaS de pessoal (vem do hook que já classifica por BU)
  const caasCategories = useMemo(() => {
    const caas = pc.porBu.find((b) => b.bu === "CaaS");
    if (!caas) return [] as string[];
    return caas.categorias.map((c) => c.label);
  }, [pc.porBu]);

  // Drill-down em paralelo de cada categoria CaaS
  const drillQueries = useQueries({
    queries: caasCategories.map((cat) => ({
      queryKey: ["squad-cost-drill", cat, start, end],
      queryFn: () => fetchDrillDown(cat, start, end),
      staleTime: 10 * 60 * 1000,
      retry: 1,
    })),
  });

  const assignmentsQ = useQuery({
    queryKey: ["cfo-squad-assignments"],
    queryFn: fetchAssignments,
    staleTime: 5 * 60 * 1000,
  });

  const aliasesQ = useQuery({
    queryKey: ["dre-supplier-aliases"],
    queryFn: fetchSupplierAliases,
    staleTime: 5 * 60 * 1000,
  });

  const isLoading =
    pc.isLoading ||
    hr.isLoading ||
    assignmentsQ.isLoading ||
    aliasesQ.isLoading ||
    drillQueries.some((q) => q.isLoading);

  const error =
    pc.error ||
    assignmentsQ.error ||
    aliasesQ.error ||
    drillQueries.find((q) => q.error)?.error ||
    null;

  const result = useMemo(() => {
    const assignments = assignmentsQ.data || [];
    const pessoas = hr.rawPessoas || [];
    const aliases = aliasesQ.data || [];

    // Index pessoas por raiz de CNPJ (8 dig), CPF (11 dig), ID Pipefy e nome normalizado
    const byCnpj = new Map<string, PessoaRow>();
    const byCpf = new Map<string, PessoaRow>();
    const byPessoaId = new Map<string, PessoaRow>();
    const byPessoaNome = new Map<string, PessoaRow>();
    for (const p of pessoas) {
      const root = cnpjRoot(p.CNPJ);
      if (root) byCnpj.set(root, p);
      const cpf = cpfFull(p.CPF);
      if (cpf) byCpf.set(cpf, p);
      if (p.ID) byPessoaId.set(p.ID, p);
      const nomeKey = normalize(p.Nome || p["Título"]);
      if (nomeKey) byPessoaNome.set(nomeKey, p);
    }

    // Index alias por label normalizado → pessoa
    const aliasByLabel = new Map<string, PessoaRow>();
    for (const a of aliases) {
      const pessoa =
        (a.pessoa_id && byPessoaId.get(a.pessoa_id)) ||
        byPessoaNome.get(normalize(a.pessoa_nome)) ||
        null;
      if (pessoa) aliasByLabel.set(a.label_normalizado, pessoa);
    }

    // Index assignment por nome normalizado de pessoa
    const assignByPessoaNome = new Map<string, SquadAssignmentRow>();
    for (const a of assignments) {
      assignByPessoaNome.set(normalize(a.pessoa_nome), a);
    }

    // Acumulador por pessoa
    const byPessoa = new Map<
      string,
      {
        pessoaNome: string;
        pessoaId: string | null;
        cnpj: string | null;
        fee: number;
        benef: number;
        suppliers: { label: string; valor: number; category: string }[];
      }
    >();

    const unmatched: UnmatchedSupplier[] = [];

    // Pré-computa tokens de nomes — restrito a pessoas que estão em cfo_squad_assignment
    // (evita falso-positivo com colaboradores de outras áreas que aparecem no DRE).
    const assignedNomeKeys = new Set(assignments.map((a) => normalize(a.pessoa_nome)));
    const pessoasInSquad: Array<{ pessoa: PessoaRow; tokens: Set<string>; nomeNorm: string }> = [];
    for (const p of pessoas) {
      const nomeNorm = normalize(p.Nome || p["Título"]);
      if (!nomeNorm) continue;
      if (!assignedNomeKeys.has(nomeNorm)) continue;
      pessoasInSquad.push({ pessoa: p, tokens: tokensFromName(p.Nome || p["Título"] || ""), nomeNorm });
    }

    const diag = { cpf: 0, cnpj: 0, alias: 0, "name-exact": 0, "name-fuzzy": 0, unmatched: 0 };

    drillQueries.forEach((q, idx) => {
      const cat = caasCategories[idx];
      if (!cat) return;
      const items = (q.data || []) as DrillItem[];
      const isBenef = BENEF_RE.test(cat);
      for (const it of items) {
        if (!it.total) continue;
        const labelDigits = onlyDigits(it.label);
        const labelNorm = normalize(it.label);
        let pessoa: PessoaRow | null = null;
        let idDetectado: string | null = null;
        let tipoIdDetectado: "cpf" | "cnpj" | null = null;
        let conf: MatchConfidence | null = null;
        // 1. CPF (11 digits) — covers estagiários/CLT
        if (labelDigits.length >= 11) {
          const cpf = labelDigits.slice(0, 11);
          const hit = byCpf.get(cpf);
          if (hit) {
            pessoa = hit;
            idDetectado = cpf;
            tipoIdDetectado = "cpf";
            conf = "cpf";
          }
        }
        // 2. CNPJ root (8 digits)
        if (!pessoa && labelDigits.length >= 8) {
          const root = labelDigits.slice(0, 8);
          const hit = byCnpj.get(root);
          if (hit) {
            pessoa = hit;
            idDetectado = root;
            tipoIdDetectado = "cnpj";
            conf = "cnpj";
          } else if (!idDetectado) {
            idDetectado = root;
            tipoIdDetectado = "cnpj";
          }
        }
        // 3. Alias manual por label normalizado
        if (!pessoa && labelNorm) {
          const hit = aliasByLabel.get(labelNorm);
          if (hit) {
            pessoa = hit;
            conf = "alias";
          }
        }
        // 4. Nome exato normalizado (somente pessoas em squads)
        if (!pessoa && labelNorm) {
          for (const entry of pessoasInSquad) {
            if (entry.nomeNorm === labelNorm) {
              pessoa = entry.pessoa;
              conf = "name-exact";
              break;
            }
          }
        }
        // 5. Nome fuzzy por tokens (>=2 tokens em comum, vencedor único)
        let bestSuggestion: { pessoa: PessoaRow; score: number } | null = null;
        if (!pessoa && labelNorm) {
          const labelTokens = tokensFromName(it.label);
          if (labelTokens.size > 0) {
            let bestScore = 0;
            let bestCount = 0;
            let best: PessoaRow | null = null;
            for (const entry of pessoasInSquad) {
              const s = scoreOverlap(labelTokens, entry.tokens);
              if (s > bestScore) {
                bestScore = s;
                best = entry.pessoa;
                bestCount = 1;
              } else if (s === bestScore && s > 0) {
                bestCount++;
              }
            }
            if (best && bestScore >= 2 && bestCount === 1) {
              pessoa = best;
              conf = "name-fuzzy";
            } else if (best && bestScore >= 1) {
              bestSuggestion = { pessoa: best, score: bestScore };
            }
          }
        }
        if (!pessoa) {
          diag.unmatched++;
          unmatched.push({
            label: it.label,
            valor: it.total,
            category: cat,
            idDetectado,
            tipoIdDetectado,
            sugestaoPessoaNome: bestSuggestion?.pessoa.Nome || bestSuggestion?.pessoa["Título"] || null,
            sugestaoScore: bestSuggestion?.score || 0,
          });
          continue;
        }
        if (conf) diag[conf]++;
        const key = normalize(pessoa.Nome || pessoa["Título"]);
        let acc = byPessoa.get(key);
        if (!acc) {
          acc = {
            pessoaNome: pessoa.Nome || pessoa["Título"] || it.label,
            pessoaId: pessoa.ID || null,
            cnpj: pessoa.CNPJ,
            fee: 0,
            benef: 0,
            suppliers: [],
          };
          byPessoa.set(key, acc);
        }
        if (isBenef) acc.benef += it.total;
        else acc.fee += it.total;
        acc.suppliers.push({ label: it.label, valor: it.total, category: cat });
      }
    });

    if (typeof console !== "undefined" && (diag.cpf + diag.cnpj + diag.alias + diag["name-exact"] + diag["name-fuzzy"] + diag.unmatched) > 0) {
      // eslint-disable-next-line no-console
      console.debug("[useSquadCostFromDre] match diag", diag);
    }


    // Agrupa por squad
    const squadMap = new Map<string, SquadCost>();
    const peopleWithoutSquad: SquadMemberCost[] = [];
    for (const [key, acc] of byPessoa.entries()) {
      const a = assignByPessoaNome.get(key);
      const member: SquadMemberCost = {
        pessoaNome: acc.pessoaNome,
        pessoaId: acc.pessoaId,
        cnpj: acc.cnpj,
        role: a?.role || "analyst",
        fee: acc.fee,
        benef: acc.benef,
        total: acc.fee + acc.benef,
        suppliers: acc.suppliers,
      };
      if (!a) {
        peopleWithoutSquad.push(member);
        continue;
      }
      let sq = squadMap.get(a.cfo_squad_nome);
      if (!sq) {
        sq = { cfoNome: a.cfo_squad_nome, fee: 0, benef: 0, total: 0, membros: [] };
        squadMap.set(a.cfo_squad_nome, sq);
      }
      sq.fee += member.fee;
      sq.benef += member.benef;
      sq.total += member.total;
      sq.membros.push(member);
    }

    const porSquad = Array.from(squadMap.values()).sort((a, b) => b.total - a.total);
    for (const sq of porSquad) {
      sq.membros.sort((a, b) => {
        if (a.role !== b.role) return a.role === "cfo" ? -1 : 1;
        return b.total - a.total;
      });
    }

    const totalSquads = porSquad.reduce((s, sq) => s + sq.total, 0);
    const totalUnmatched = unmatched.reduce((s, u) => s + u.valor, 0);
    const totalSemSquad = peopleWithoutSquad.reduce((s, m) => s + m.total, 0);

    // Lookup global por nome normalizado — permite mesclar com fallback hardcoded
    // a nível de membro (CFO + analistas) sem depender do nome do squad.
    const matchedByPessoaNome: Record<string, { fee: number; benef: number; total: number }> = {};
    for (const [key, acc] of byPessoa.entries()) {
      matchedByPessoaNome[key] = { fee: acc.fee, benef: acc.benef, total: acc.fee + acc.benef };
    }

    return {
      porSquad,
      unmatched,
      peopleWithoutSquad,
      matchedByPessoaNome,
      totalSquads,
      totalUnmatched,
      totalSemSquad,
      totalCaasDre: totalSquads + totalUnmatched + totalSemSquad,
    };
  }, [assignmentsQ.data, hr.rawPessoas, aliasesQ.data, drillQueries.map((q) => q.dataUpdatedAt).join(","), caasCategories]);

  const getSquad = (cfoNome: string): SquadCost | null => {
    return result.porSquad.find((s) => normalize(s.cfoNome) === normalize(cfoNome)) || null;
  };

  return {
    ...result,
    getSquad,
    getSquadCusto: (cfoNome: string): number => getSquad(cfoNome)?.total || 0,
    getSquadFee: (cfoNome: string): number => getSquad(cfoNome)?.fee || 0,
    getSquadBeneficios: (cfoNome: string): number => getSquad(cfoNome)?.benef || 0,
    isLoading,
    error: error as Error | null,
  };
}
