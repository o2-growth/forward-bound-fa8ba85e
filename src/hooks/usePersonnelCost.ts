import { useMemo } from "react";
import { useOxyFinance } from "@/hooks/useOxyFinance";

export type PersonnelBucket =
  | "folha"
  | "encargos"
  | "beneficios"
  | "prolabore"
  | "rescisao"
  | "outros_pessoal";

const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"] as const;
type MonthName = typeof MONTHS[number];

const MONTH_INDEX: Record<MonthName, number> = {
  Jan: 0, Fev: 1, Mar: 2, Abr: 3, Mai: 4, Jun: 5,
  Jul: 6, Ago: 7, Set: 8, Out: 9, Nov: 10, Dez: 11,
};

function normalize(s: string): string {
  return (s || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function parseMonthFromPeriod(period: string): MonthName | null {
  if (!period) return null;
  const m = period.match(/(\d{4})-(\d{2})/);
  if (m) {
    const idx = parseInt(m[2], 10) - 1;
    return MONTHS[idx] || null;
  }
  const lower = normalize(period);
  const map: Record<string, MonthName> = {
    janeiro: "Jan", fevereiro: "Fev", marco: "Mar", abril: "Abr",
    maio: "Mai", junho: "Jun", julho: "Jul", agosto: "Ago",
    setembro: "Set", outubro: "Out", novembro: "Nov", dezembro: "Dez",
    jan: "Jan", fev: "Fev", mar: "Mar", abr: "Abr",
    mai: "Mai", jun: "Jun", jul: "Jul", ago: "Ago",
    set: "Set", out: "Out", nov: "Nov", dez: "Dez",
  };
  for (const [k, v] of Object.entries(map)) {
    if (lower.includes(k)) return v;
  }
  return null;
}

function classifyBucket(label: string, code: string): PersonnelBucket | null {
  const l = normalize(label);
  const c = normalize(code);

  // Bucket-specific patterns (label tem prioridade — code só ajuda a achar grupo de pessoal genérico)
  if (/\bpro[\s-]?labore\b|\bprolabore\b/.test(l)) return "prolabore";
  if (/\brescis|\bdemiss|\baviso previo/.test(l)) return "rescisao";
  if (/\bencargo|\binss\b|\bfgts\b|\biss pessoal/.test(l)) return "encargos";
  if (/\bbenefici|\bvale |\bvale-|\bvr\b|\bva\b|plano de saude|convenio/.test(l)) return "beneficios";
  if (/\bfolha|salario|salarios|ordenado/.test(l)) return "folha";

  // Generic pessoal — vai pro "outros_pessoal"
  if (l.includes("pessoa") || l.includes("colaborador") || l.includes("equipe")) return "outros_pessoal";
  if (c.startsWith("dp") || c.startsWith("cp") || c.includes("pesso")) return "outros_pessoal";

  return null;
}

interface UsePersonnelCostParams {
  startDate: Date;
  endDate: Date;
  year?: number;
}

export interface PersonnelCostResult {
  custoTotalPeriodo: number;
  custoRescisaoPeriodo: number;
  custoPorBucket: Record<PersonnelBucket, number>;
  custoPorMes: Record<MonthName, number>;
  gruposNaoClassificados: Array<{ label: string; code: string; total: number }>;
  gruposClassificados: Array<{ label: string; code: string; bucket: PersonnelBucket; total: number }>;
  isLoading: boolean;
  error: Error | null;
}

export function usePersonnelCost({ startDate, endDate, year }: UsePersonnelCostParams): PersonnelCostResult {
  const targetYear = year ?? startDate.getFullYear();
  const oxy = useOxyFinance(targetYear);

  return useMemo<PersonnelCostResult>(() => {
    const empty: Record<PersonnelBucket, number> = {
      folha: 0, encargos: 0, beneficios: 0, prolabore: 0, rescisao: 0, outros_pessoal: 0,
    };
    const porMes: Record<MonthName, number> = {} as any;
    for (const m of MONTHS) porMes[m] = 0;

    const groups: any[] = oxy.dreRaw?.groups || [];
    const naoClassificados: Array<{ label: string; code: string; total: number }> = [];
    const classificados: Array<{ label: string; code: string; bucket: PersonnelBucket; total: number }> = [];

    const fromIdx = startDate.getMonth();
    const toIdx = endDate.getMonth();
    const sameYear = startDate.getFullYear() === endDate.getFullYear();

    for (const g of groups) {
      const code = g?.code || "";
      const label = g?.label || "";
      // Pular receitas
      if (code === "RB") continue;

      const bucket = classifyBucket(label, code);
      const entries: any[] = Array.isArray(g?.data) ? g.data : [];

      // Total do grupo no ano (pra debug; não filtra período)
      let groupTotalPeriod = 0;
      for (const e of entries) {
        const period = e?.period || e?.date || "";
        const mname = parseMonthFromPeriod(period);
        if (!mname) continue;
        const mIdx = MONTH_INDEX[mname];
        const inRange = sameYear && mIdx >= fromIdx && mIdx <= toIdx;
        if (!inRange) continue;
        const val = Math.abs(Number(e?.value || 0));
        if (bucket) {
          empty[bucket] += val;
          porMes[mname] += val;
          groupTotalPeriod += val;
        } else {
          // candidato a "não classificado" só se label parece despesa (heurística leve: não vazio e tem code)
          groupTotalPeriod += val;
        }
      }

      if (bucket) {
        if (groupTotalPeriod > 0) {
          classificados.push({ label, code, bucket, total: groupTotalPeriod });
        }
      } else if (groupTotalPeriod > 0 && label) {
        naoClassificados.push({ label, code, total: groupTotalPeriod });
      }
    }

    const total = Object.values(empty).reduce((s, v) => s + v, 0);

    return {
      custoTotalPeriodo: total,
      custoRescisaoPeriodo: empty.rescisao,
      custoPorBucket: empty,
      custoPorMes: porMes,
      gruposNaoClassificados: naoClassificados.sort((a, b) => b.total - a.total),
      gruposClassificados: classificados.sort((a, b) => b.total - a.total),
      isLoading: oxy.isLoading,
      error: oxy.error,
    };
  }, [oxy.dreRaw, oxy.isLoading, oxy.error, startDate, endDate]);
}
