import type { DiagLeadFull } from "./useTypeformData";

export const normalize = (s: any): string =>
  String(s ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export const eqNorm = (a: any, b: any) => normalize(a) === normalize(b);

export type TemporalWindow = "hoje" | "ultimos_7d" | "ultimos_30d" | "mais_antigo";

export function inWindow(dateStr: string | null | undefined, win: TemporalWindow): boolean {
  if (!dateStr) return win === "mais_antigo";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = (startToday.getTime() - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / 86400000;
  if (win === "hoje") return diffDays === 0;
  if (win === "ultimos_7d") return diffDays >= 0 && diffDays < 7;
  if (win === "ultimos_30d") return diffDays >= 0 && diffDays < 30;
  if (win === "mais_antigo") return diffDays >= 30;
  return false;
}

export interface BreakdownRow {
  label: string;
  value: string;
}
export interface BreakdownBlock {
  title: string;
  rows: BreakdownRow[];
}

export function buildBreakdown(
  leads: DiagLeadFull[],
  key: keyof DiagLeadFull,
  title: string,
  topN = 5
): BreakdownBlock {
  const map = new Map<string, { total: number; mqls: number; agend: number }>();
  for (const l of leads) {
    const raw = (l[key] ?? "—") as any;
    const k = String(raw || "—");
    const cur = map.get(k) ?? { total: 0, mqls: 0, agend: 0 };
    cur.total += 1;
    if (l.is_mql) cur.mqls += 1;
    if (l.agendado) cur.agend += 1;
    map.set(k, cur);
  }
  const rows = Array.from(map.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, topN)
    .map(([k, v]) => ({
      label: k,
      value: `${v.total} (${v.mqls} MQL · ${v.agend} ag)`,
    }));
  return { title, rows };
}

export function exportLeadsCsv(leads: DiagLeadFull[], scopeName: string) {
  if (!leads.length) return;
  const cols = Array.from(
    leads.reduce<Set<string>>((acc, l) => {
      Object.keys(l).forEach((k) => acc.add(k));
      return acc;
    }, new Set())
  );
  const esc = (v: any) => {
    if (v == null) return "";
    const s = String(v).replace(/"/g, '""');
    return /[;"\n\r]/.test(s) ? `"${s}"` : s;
  };
  const lines = [cols.join(";"), ...leads.map((l) => cols.map((c) => esc(l[c])).join(";"))];
  const csv = "\ufeff" + lines.join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const safe = normalize(scopeName).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "geral";
  a.href = url;
  a.download = `typeform-leads-${safe}-${today}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
