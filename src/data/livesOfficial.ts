/**
 * livesOfficial.ts — Números oficiais das lives já realizadas.
 *
 * Fonte de verdade dos KPIs (Inscritos / Entraram / Levantaram a mão / Vendas)
 * para lives cujo pós-evento já foi consolidado. Lives sem entrada aqui são
 * calculadas dinamicamente a partir dos cards do Pipefy.
 *
 * Editar aqui quando novos números forem consolidados.
 */
export interface LiveOfficialCounts {
  inscritos: number;
  entraram: number;
  mao: number;
  venda: number;
}

export const LIVES_OFICIAIS: Record<string, LiveOfficialCounts> = {
  "2026-05-20": { inscritos: 339, entraram: 52, mao: 3, venda: 1 },
  "2026-05-21": { inscritos: 196, entraram: 48, mao: 3, venda: 1 },
  "2026-06-17": { inscritos: 329, entraram: 243, mao: 9, venda: 0 },
  "2026-06-18": { inscritos: 351, entraram: 168, mao: 5, venda: 0 },
  "2026-07-02": { inscritos: 0, entraram: 8, mao: 8, venda: 0 },
};

export function getLiveOverride(dateIso: string): LiveOfficialCounts | null {
  return LIVES_OFICIAIS[dateIso] ?? null;
}
