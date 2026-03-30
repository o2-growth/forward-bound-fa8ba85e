/**
 * Detects and fixes possible day/month inversion in dates.
 * 
 * Some source systems (e.g. Pipefy) store dates as DD/MM/YYYY but the database
 * interprets them as MM/DD/YYYY. When the day <= 12, this creates a valid but
 * incorrect date (e.g. 09/03 becomes September 3 instead of March 9).
 * 
 * This function tries swapping day and month; if the swapped version is closer
 * to the reference date (entrada), it's used instead.
 */
export function fixPossibleDateInversion(assinatura: Date, entrada: Date): Date {
  const day = assinatura.getDate();
  const month = assinatura.getMonth(); // 0-based

  // Inversion only produces a valid date if day <= 12
  if (day > 12) return assinatura;

  // Swap: use current day as month (0-based → day-1), current month+1 as day
  const swapped = new Date(assinatura.getFullYear(), day - 1, month + 1, 12, 0, 0);
  if (isNaN(swapped.getTime())) return assinatura;

  const diffOriginal = Math.abs(assinatura.getTime() - entrada.getTime());
  const diffSwapped = Math.abs(swapped.getTime() - entrada.getTime());

  return diffSwapped < diffOriginal ? swapped : assinatura;
}
