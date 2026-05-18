// Utilitário de rateio de metas mensais por dias úteis (seg–sex) dentro do intervalo filtrado.

const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'] as const;
export type MonthPt = typeof MONTHS_PT[number];

function isBusinessDay(d: Date): boolean {
  const day = d.getDay();
  return day >= 1 && day <= 5;
}

function countBusinessDaysBetween(start: Date, end: Date): number {
  if (end < start) return 0;
  let count = 0;
  const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  while (cur <= last) {
    if (isBusinessDay(cur)) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

/**
 * Para cada mês que intersecta o intervalo, retorna { month, year, factor }
 * onde factor = dias úteis filtrados no mês / dias úteis totais do mês (0..1).
 */
export interface MonthFactor {
  month: MonthPt;
  year: number;
  factor: number;
}

export function getMonthFactors(startDate: Date, endDate: Date): MonthFactor[] {
  const out: MonthFactor[] = [];
  if (endDate < startDate) return out;

  let cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const lastMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

  while (cursor <= lastMonth) {
    const y = cursor.getFullYear();
    const m = cursor.getMonth();
    const monthStart = new Date(y, m, 1);
    const monthEnd = new Date(y, m + 1, 0);
    const totalBd = countBusinessDaysBetween(monthStart, monthEnd);

    const overlapStart = startDate > monthStart ? startDate : monthStart;
    const overlapEnd = endDate < monthEnd ? endDate : monthEnd;
    const filteredBd = countBusinessDaysBetween(overlapStart, overlapEnd);

    const factor = totalBd > 0 ? filteredBd / totalBd : 0;
    out.push({ month: MONTHS_PT[m], year: y, factor });

    cursor = new Date(y, m + 1, 1);
  }

  return out;
}

/** Rateia uma meta mensal absoluta pelo intervalo (soma sobre meses). */
export function prorateMonthlyMeta(monthlyByMonth: Record<string, number>, factors: MonthFactor[]): number {
  let total = 0;
  for (const { month, year, factor } of factors) {
    const key = `${month}-${year}`;
    const v = monthlyByMonth[key] ?? 0;
    total += v * factor;
  }
  return total;
}
