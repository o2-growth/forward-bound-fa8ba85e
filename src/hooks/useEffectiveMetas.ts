import { useMemo } from "react";
import { useMonetaryMetas, BuType, MONTHS, isPontualOnlyBU } from "./useMonetaryMetas";
import { useIndicatorsRealized } from "./useIndicatorsRealized";
import { useOxyFinance } from "./useOxyFinance";

const MONTH_INDEX: Record<string, number> = {
  Jan: 0, Fev: 1, Mar: 2, Abr: 3,
  Mai: 4, Jun: 5, Jul: 6, Ago: 7,
  Set: 8, Out: 9, Nov: 10, Dez: 11,
};

export interface RolloverLogEntry {
  bu: string;
  month: string;
  originalMeta: number;
  rolledOver: number;
  effectiveMeta: number;
  source: string;
}

export interface EffectiveMetasResult {
  /** Meta efetiva (original + gap acumulado) por BU e mês */
  effectiveMetas: Record<string, Record<string, number>>;
  /** Meta original do banco por BU e mês */
  originalMetas: Record<string, Record<string, number>>;
  /** Gap acumulado por BU e mês (positivo = faltou atingir) */
  gapByMonth: Record<string, Record<string, number>>;
  /** Log de rollover para auditoria */
  rolloverLog: RolloverLogEntry[];
  /** Realizado DRE contábil por BU e mês (Oxy Finance) */
  realizedDRE: Record<string, Record<string, number>>;
  /** Realizado Pipefy (venda nova) por BU e mês */
  realizedPipefy: Record<string, Record<string, number>>;
  /** Verifica se um mês está "fechado" (passado + tem dados) */
  isMonthClosed: (month: string) => boolean;
  isLoading: boolean;
}

/**
 * Verifica se um mês está fechado:
 * - Data atual > último dia do mês
 */
function checkMonthClosed(month: string, year: number): boolean {
  const monthIdx = MONTH_INDEX[month];
  if (monthIdx === undefined) return false;
  const lastDay = new Date(year, monthIdx + 1, 0, 23, 59, 59);
  return new Date() > lastDay;
}

/**
 * Hook que calcula metas efetivas com rollover automático.
 * 
 * Quando uma BU não bate a meta de um mês fechado, o déficit é
 * automaticamente somado à meta do mês seguinte. O gap se acumula.
 * 
 * A meta original (do banco) permanece inalterada — o rollover é
 * puramente calculado em runtime.
 */
export function useEffectiveMetas(year: number = 2026): EffectiveMetasResult {
  const { metas, isLoading: metasLoading } = useMonetaryMetas(year);
  const { realizedByBU, isLoading: realizedLoading } = useIndicatorsRealized(year);
  const { dreByBU: rawDreByBU, expansaoByMonth, isLoading: dreLoading } = useOxyFinance(year);

  const isLoading = metasLoading || realizedLoading || dreLoading;

  const isMonthClosed = (month: string) => checkMonthClosed(month, year);

  const result = useMemo(() => {
    // Split Expansão proportionally between oxy_hacker and franquia based on metas
    const dreByBU = { ...rawDreByBU };
    // Deep copy oxy_hacker and franquia to avoid mutating
    dreByBU.oxy_hacker = { ...rawDreByBU.oxy_hacker };
    dreByBU.franquia = { ...rawDreByBU.franquia };

    const buMetas_oh = metas.filter(m => m.bu === 'oxy_hacker');
    const buMetas_fr = metas.filter(m => m.bu === 'franquia');

    for (const month of MONTHS) {
      const expValue = expansaoByMonth[month] || 0;
      if (expValue <= 0) continue;

      const ohMeta = buMetas_oh.find(m => m.month === month);
      const frMeta = buMetas_fr.find(m => m.month === month);
      const ohTarget = Number(ohMeta?.pontual || 0);
      const frTarget = Number(frMeta?.pontual || 0);
      const totalTarget = ohTarget + frTarget;

      if (totalTarget <= 0) {
        // No metas: assign all to oxy_hacker
        dreByBU.oxy_hacker[month] += expValue;
      } else {
        dreByBU.oxy_hacker[month] += expValue * (ohTarget / totalTarget);
        dreByBU.franquia[month] += expValue * (frTarget / totalTarget);
      }
    }

    const bus: BuType[] = ['modelo_atual', 'o2_tax', 'oxy_hacker', 'franquia'];
    const effectiveMetas: Record<string, Record<string, number>> = {};
    const originalMetas: Record<string, Record<string, number>> = {};
    const gapByMonth: Record<string, Record<string, number>> = {};
    const rolloverLog: RolloverLogEntry[] = [];

    for (const bu of bus) {
      effectiveMetas[bu] = {};
      originalMetas[bu] = {};
      gapByMonth[bu] = {};

      // Build original metas from DB
      const buMetas = metas.filter(m => m.bu === bu);
      const isPontual = isPontualOnlyBU(bu);

      MONTHS.forEach(month => {
        const meta = buMetas.find(m => m.month === month);
        const value = meta
          ? (isPontual ? (Number(meta.pontual) || 0) : (Number(meta.faturamento) || 0))
          : 0;
        originalMetas[bu][month] = value;
      });

      // Calculate rollover
      let accumulatedGap = 0;

      MONTHS.forEach((month, idx) => {
        const original = originalMetas[bu][month];
        const effective = original + accumulatedGap;
        effectiveMetas[bu][month] = effective;

        // Prioritize DRE accounting data over Pipefy new-sales data
        const dreValue = dreByBU[bu]?.[month] || 0;
        const pipefyValue = realizedByBU[bu]?.[month] || 0;
        const realized = dreValue > 0 ? dreValue : pipefyValue;
        const closed = checkMonthClosed(month, year);

        if (closed && realized > 0) {
          // Month is closed: calculate gap
          const gap = Math.max(0, effective - realized);
          gapByMonth[bu][month] = gap;

          if (gap > 0) {
            const prevMonth = idx > 0 ? MONTHS[idx - 1] : null;
            const source = accumulatedGap > 0 && prevMonth
              ? `Gap acumulado até ${month}`
              : `${month} gap`;

            rolloverLog.push({
              bu,
              month: idx < MONTHS.length - 1 ? MONTHS[idx + 1] : month,
              originalMeta: idx < MONTHS.length - 1 ? originalMetas[bu][MONTHS[idx + 1]] : original,
              rolledOver: gap,
              effectiveMeta: idx < MONTHS.length - 1
                ? originalMetas[bu][MONTHS[idx + 1]] + gap
                : effective,
              source,
            });
          }

          accumulatedGap = gap;
        } else {
          // Month is open or no realized data
          gapByMonth[bu][month] = 0;
          // accumulatedGap carries forward unchanged
        }
      });
    }

    return { effectiveMetas, originalMetas, gapByMonth, rolloverLog, dreByBU };
  }, [metas, realizedByBU, rawDreByBU, expansaoByMonth, year]);

  return {
    ...result,
    realizedDRE: result.dreByBU,
    realizedPipefy: realizedByBU,
    isMonthClosed,
    isLoading,
  };
}
