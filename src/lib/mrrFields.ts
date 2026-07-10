// Soma todos os campos numéricos da row cujo nome contém "mrr"
// (case-insensitive), ignorando agregados conhecidos para não duplicar.
// Ex.: 'Valor MRR', 'MRR Adicional', 'valor_mrr_extra' → todos entram.

const AGGREGATE_KEYS = new Set(['valor_total']);

const parseNum = (v: any): number => {
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const s = String(v).replace(/[R$\s]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
};

export function sumMrrFields(row: Record<string, any> | null | undefined): number {
  if (!row) return 0;
  let total = 0;
  for (const key of Object.keys(row)) {
    if (AGGREGATE_KEYS.has(key)) continue;
    if (/mrr/i.test(key)) total += parseNum(row[key]);
  }
  return total;
}
