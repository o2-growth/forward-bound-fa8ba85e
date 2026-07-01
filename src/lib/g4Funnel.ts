/**
 * g4Funnel.ts — helpers puros para o funil "deluxe" das frentes G4.
 * Constrói stages a partir dos cards + estágios manuais do banco.
 */
import type { ModeloAtualCard } from "@/hooks/useModeloAtualAnalytics";
import type { G4Stage } from "@/hooks/useG4FunnelStages";
import type { DeluxeStage } from "@/components/planning/g4/FunnelDeluxe";

const MAO_PHASES = new Set([
  "Reunião agendada / Qualificado",
  "Reunião Realizada",
  "1° Reunião Realizada - Apresentação",
  "Proposta enviada / Follow Up",
]);
const VENDA_PHASES = new Set(["Ganho", "Contrato assinado"]);
const ENTRARAM_PHASES = new Set([
  "MQLs",
  "Tentativas de contato",
  "Material ISCA",
  "Start form",
  ...MAO_PHASES,
  ...VENDA_PHASES,
]);

export interface ComputedCounts {
  inscritos: number;
  entraram: number;
  mao: number;
  venda: number;
}

export function computeCounts(cards: ModeloAtualCard[]): ComputedCounts {
  const uniq = new Map<string, ModeloAtualCard>();
  for (const c of cards) {
    const cur = uniq.get(c.id);
    if (!cur || c.dataEntrada > cur.dataEntrada) uniq.set(c.id, c);
  }
  const arr = Array.from(uniq.values());
  let entraram = 0;
  let mao = 0;
  let venda = 0;
  for (const c of arr) {
    const fase = c.faseAtual || c.fase;
    if (ENTRARAM_PHASES.has(fase)) entraram++;
    if (MAO_PHASES.has(fase) || VENDA_PHASES.has(fase)) mao++;
    if (VENDA_PHASES.has(fase)) venda++;
  }
  return { inscritos: arr.length, entraram, mao, venda };
}

/**
 * Mescla contagens computadas com stages manuais do banco.
 * Prioridade: valor manual do DB > valor computado.
 * Ordem canônica por frente é aplicada.
 */
export function mergeStages(
  frente: "lives" | "eventos" | "seller",
  counts: ComputedCounts,
  dbStages: G4Stage[],
): DeluxeStage[] {
  const canonicalOrder: Record<typeof frente, string[]> = {
    lives: ["inscritos", "diagnostico", "entraram", "pico", "pitch", "mao", "venda"],
    eventos: ["inscritos", "entraram", "mao", "venda"],
    seller: ["inscritos", "mao", "venda"],
  };
  const labels: Record<string, string> = {
    inscritos: "Inscritos",
    diagnostico: "Diagnóstico preenchido",
    entraram: "Entraram na live",
    pico: "Pico de presentes",
    pitch: "Presentes no pitch",
    mao: "Levantaram a mão",
    venda: "Vendas fechadas",
  };
  const computedMap: Record<string, number> = {
    inscritos: counts.inscritos,
    entraram: counts.entraram,
    mao: counts.mao,
    venda: counts.venda,
  };
  const dbMap = new Map<string, G4Stage>();
  for (const s of dbStages) dbMap.set(s.stage_key, s);

  const keys = canonicalOrder[frente];
  const out: DeluxeStage[] = [];
  for (const key of keys) {
    const dbVal = dbMap.get(key);
    const value = dbVal ? Number(dbVal.value) || 0 : (computedMap[key] ?? 0);
    // Suprime etapas intermediárias sem dado (só quando não vieram do DB e não são as básicas)
    const isBasic = key === "inscritos" || key === "mao" || key === "venda";
    if (!dbVal && !isBasic && value === 0) continue;
    out.push({
      key,
      label: dbVal?.stage_label ?? labels[key] ?? key,
      value,
    });
  }
  // Anexa stages do DB fora da ordem canônica (custom keys)
  for (const s of dbStages) {
    if (!keys.includes(s.stage_key)) {
      out.push({
        key: s.stage_key,
        label: s.stage_label,
        value: Number(s.value) || 0,
      });
    }
  }
  return out;
}

/** Filtra cards atribuídos a uma live (janela de captura). */
export function cardsForLive(
  cards: ModeloAtualCard[],
  liveDateIso: string,
  captureWindowDays: number,
): ModeloAtualCard[] {
  const t0 = new Date(liveDateIso).getTime();
  const t1 = t0 + captureWindowDays * 86_400_000;
  return cards.filter((c) => {
    const t = c.dataEntrada ? c.dataEntrada.getTime() : null;
    return t !== null && t >= t0 && t <= t1;
  });
}
