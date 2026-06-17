import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useOxyFinance } from "@/hooks/useOxyFinance";
import { usePersonnelDreGroupsConfig } from "@/hooks/usePersonnelDreGroupsConfig";
import { usePersonnelDreMapping, normalizeLabel, type PersonnelDreMappingRow } from "@/hooks/usePersonnelDreMapping";

interface CategoryEntry { period: string; value: number; }
interface DreCategory {
  label: string;
  type: string;
  data: CategoryEntry[];
  ids: string[];
}

const PERSONNEL_GROUP_PATTERNS = [
  /despesas?\s+com\s+pessoal/,
  /\bpessoal\b/,
  /\brh\b/,
  /folha\s+de\s+pagamento/,
];

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
  groupId?: string;
  groupLabel?: string;
  mapping: PersonnelDreMappingRow | null;
  status: "mapeada" | "ignorada" | "pendente";
}

export interface DreGroupOption {
  id: string;
  label: string;
  code: string;
}

export interface PersonnelCostFromDREResult {
  isLoading: boolean;
  error: Error | null;
  gruposPessoal: PersonnelGroupInfo[];
  allDreGroups: DreGroupOption[];
  autoDetectedGroupIds: string[];
  selectedGroupIds: string[];
  saveSelectedGroups: (ids: string[]) => Promise<void>;
  isSavingGroups: boolean;
  categorias: PersonnelCategoryRow[];
  pendentes: PersonnelCategoryRow[];
  mapeadas: PersonnelCategoryRow[];
  ignoradas: PersonnelCategoryRow[];
  custoTotalPeriodo: number;
  custoMapeado: number;
  custoPendente: number;
  custoRescisaoPeriodo: number;
  /** Composição: cada categoria DRE com valor e share % do total */
  composicao: { label: string; valor: number; pct: number }[];
  /** Custo agregado por Time aplicando team_split das categorias mapeadas */
  custoPorTime: { time: string; valor: number }[];
}

interface UseParams {
  startDate: Date;
  endDate: Date;
}

export function usePersonnelCostFromDRE({ startDate, endDate }: UseParams): PersonnelCostFromDREResult {
  const year = startDate.getFullYear();
  const oxy = useOxyFinance(year);
  const mappingHook = usePersonnelDreMapping();
  const groupsConfig = usePersonnelDreGroupsConfig();

  // Todos os grupos DRE disponíveis (para UI de seleção manual)
  const allDreGroups = useMemo<DreGroupOption[]>(() => {
    const groups: any[] = oxy.dreRaw?.groups || [];
    const out: DreGroupOption[] = [];
    const seen = new Set<string>();
    for (const g of groups) {
      const label = g?.label || "";
      const ids: string[] = Array.isArray(g?.ids) ? g.ids : [];
      for (const id of ids) {
        if (id && !seen.has(id)) {
          seen.add(id);
          out.push({ id, label, code: g?.code || "" });
        }
      }
    }
    return out.sort((a, b) => a.label.localeCompare(b.label));
  }, [oxy.dreRaw]);

  // Auto-detect via regex (fallback inicial)
  const autoDetectedGroupIds = useMemo<string[]>(() => {
    const groups: any[] = oxy.dreRaw?.groups || [];
    const ids: string[] = [];
    for (const g of groups) {
      const norm = normalize(g?.label || "");
      if (!PERSONNEL_GROUP_PATTERNS.some((re) => re.test(norm))) continue;
      for (const id of (g?.ids || [])) if (id) ids.push(String(id));
    }
    return ids;
  }, [oxy.dreRaw]);

  // Grupos efetivamente usados: config persistida ou fallback regex
  const effectiveGroupIds = groupsConfig.selectedGroupIds.length > 0
    ? groupsConfig.selectedGroupIds
    : autoDetectedGroupIds;

  const gruposPessoal = useMemo<PersonnelGroupInfo[]>(() => {
    const set = new Set(effectiveGroupIds);
    return allDreGroups.filter(g => set.has(g.id));
  }, [allDreGroups, effectiveGroupIds.join(",")]);

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
    const groupById = new Map(gruposPessoal.map(g => [g.id, g]));

    for (const c of cats) {
      const valor = (c.data || [])
        .filter((d) => periodInRange(d.period, startDate, endDate))
        .reduce((s, d) => s + Math.abs(Number(d.value || 0)), 0);
      if (valor <= 0) continue;
      const mapping = mappingHook.getMappingFor(c.label);
      const status: PersonnelCategoryRow["status"] = !mapping
        ? "pendente"
        : mapping.is_ignored
        ? "ignorada"
        : "mapeada";
      const firstGroupId = (c.ids || []).find(id => groupById.has(id));
      const grp = firstGroupId ? groupById.get(firstGroupId) : undefined;
      rows.push({
        label: c.label,
        valor,
        ids: c.ids || [],
        groupId: firstGroupId,
        groupLabel: grp?.label,
        mapping,
        status,
      });
      total += valor;
      if (RESCISAO_PATTERN.test(normalize(c.label))) rescisao += valor;
    }
    rows.sort((a, b) => b.valor - a.valor);

    const pendentes = rows.filter(r => r.status === "pendente");
    const mapeadas = rows.filter(r => r.status === "mapeada");
    const ignoradas = rows.filter(r => r.status === "ignorada");

    // Agregação por pessoa / time
    const porPessoaMap = new Map<string, { pessoa_id: string; pessoa_nome: string; pessoa_time: string | null; valor: number }>();
    const porTimeMap = new Map<string, number>();
    for (const r of mapeadas) {
      const m = r.mapping!;
      if (m.pessoa_id) {
        const cur = porPessoaMap.get(m.pessoa_id);
        if (cur) cur.valor += r.valor;
        else porPessoaMap.set(m.pessoa_id, {
          pessoa_id: m.pessoa_id,
          pessoa_nome: m.pessoa_nome || "—",
          pessoa_time: m.pessoa_time,
          valor: r.valor,
        });
      }
      const t = (m.pessoa_time || "Não informado").trim() || "Não informado";
      porTimeMap.set(t, (porTimeMap.get(t) || 0) + r.valor);
    }

    return {
      isLoading: oxy.isLoading || categoriesQuery.isLoading || mappingHook.isLoading || groupsConfig.isLoading,
      error: (oxy.error as Error) || (categoriesQuery.error as Error) || mappingHook.error,
      gruposPessoal,
      allDreGroups,
      autoDetectedGroupIds,
      selectedGroupIds: groupsConfig.selectedGroupIds,
      saveSelectedGroups: groupsConfig.save,
      isSavingGroups: groupsConfig.isSaving,
      categorias: rows,
      pendentes,
      mapeadas,
      ignoradas,
      custoTotalPeriodo: total,
      custoMapeado: mapeadas.reduce((s, r) => s + r.valor, 0),
      custoPendente: pendentes.reduce((s, r) => s + r.valor, 0),
      custoRescisaoPeriodo: rescisao,
      custoPorPessoa: Array.from(porPessoaMap.values()).sort((a, b) => b.valor - a.valor),
      custoPorTime: Array.from(porTimeMap.entries())
        .map(([time, valor]) => ({ time, valor }))
        .sort((a, b) => b.valor - a.valor),
    };
  }, [categoriesQuery.data, categoriesQuery.isLoading, categoriesQuery.error, oxy.isLoading, oxy.error, gruposPessoal, allDreGroups, autoDetectedGroupIds, groupsConfig.selectedGroupIds, groupsConfig.isLoading, groupsConfig.isSaving, groupsConfig.save, startDate, endDate, mappingHook.mappings, mappingHook.isLoading, mappingHook.error]);
}
