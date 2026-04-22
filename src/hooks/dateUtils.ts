/**
 * Parses dates from Pipefy, which may come in DD/MM/YYYY format or ISO format.
 * JavaScript's `new Date("01/04/2025")` treats this as MM/DD/YYYY (Jan 4th),
 * but in Pipefy it means April 1st. This function handles both formats.
 */
export function parsePipefyDate(val: string | null | undefined): Date | null {
  if (!val) return null;
  const s = String(val).trim();
  if (!s) return null;
  // Try DD/MM/YYYY format (standard Pipefy format)
  const parts = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (parts) {
    const d = new Date(+parts[3], +parts[2] - 1, +parts[1], 12, 0, 0);
    return isNaN(d.getTime()) ? null : d;
  }
  // Try ISO format (YYYY-MM-DD or full ISO string)
  const iso = new Date(s);
  return isNaN(iso.getTime()) ? null : iso;
}

/**
 * Parses date-only fields from Pipefy that were stored by o2-pipefy-sync with
 * an inversion bug: the sync interpreted DD/MM/YYYY as MM/DD/YYYY before
 * saving to the database in ISO format.
 *
 * These dates arrive as ISO strings like "2026-05-03T00:00:00.000Z" where
 * day and month are swapped. We detect date-only fields by the T00:00:00 suffix.
 *
 * - When the stored day ≤ 12: the inversion is ambiguous, so we swap day↔month
 *   to restore the original DD/MM meaning.
 * - When the stored day > 12: the sync couldn't misinterpret (invalid month),
 *   so the date is already correct.
 * - When there's a real timestamp (not midnight): it's a datetime field that
 *   the sync handled correctly (e.g. Entrada), so no swap needed.
 */
export function parsePipefyDateOnly(val: string | null | undefined): Date | null {
  if (!val) return null;
  const s = String(val).trim();
  if (!s) return null;

  // DD/MM/YYYY string → parse directly
  const slashParts = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashParts) {
    const d = new Date(+slashParts[3], +slashParts[2] - 1, +slashParts[1], 12, 0, 0);
    return isNaN(d.getTime()) ? null : d;
  }

  // ISO format — check if date-only (midnight) with swapped day/month
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})T00:00:00/);
  if (isoMatch) {
    const year = +isoMatch[1];
    const storedMonth = +isoMatch[2]; // what sync stored as month (actually the original day)
    const storedDay = +isoMatch[3];   // what sync stored as day (actually the original month)

    // If storedDay ≤ 12, the sync swapped DD↔MM → swap back
    if (storedDay <= 12) {
      const corrected = new Date(year, storedDay - 1, storedMonth, 12, 0, 0);
      return isNaN(corrected.getTime()) ? null : corrected;
    }
    // storedDay > 12 → sync couldn't misinterpret, date is correct
    const d = new Date(year, storedMonth - 1, storedDay, 12, 0, 0);
    return isNaN(d.getTime()) ? null : d;
  }

  // Other ISO formats (with real timestamp) → parse normally, no swap
  const iso = new Date(s);
  return isNaN(iso.getTime()) ? null : iso;
}

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
