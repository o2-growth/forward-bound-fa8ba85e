import { differenceInDays, differenceInMonths, format, startOfMonth, endOfMonth, subMonths, addMonths, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { PessoaRow } from "@/hooks/useHrData";

export type Tenure = "<6m" | "6–12m" | "1–2a" | "2–3a" | "3–5a" | ">5a";
export const TENURE_ORDER: Tenure[] = ["<6m", "6–12m", "1–2a", "2–3a", "3–5a", ">5a"];

export function tenureBucket(days: number): Tenure {
  const months = days / 30;
  if (months < 6) return "<6m";
  if (months < 12) return "6–12m";
  if (months < 24) return "1–2a";
  if (months < 36) return "2–3a";
  if (months < 60) return "3–5a";
  return ">5a";
}

export type Seniority = "Estagiário" | "Júnior" | "Pleno" | "Sênior" | "Liderança" | "C-Level" | "N/I";
export const SENIORITY_ORDER: Seniority[] = ["C-Level", "Liderança", "Sênior", "Pleno", "Júnior", "Estagiário", "N/I"];

export function seniorityLevel(cargo: string | null | undefined): Seniority {
  const c = (cargo || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (!c) return "N/I";
  if (/c-?level|\bcfo\b|\bcto\b|\bceo\b|\bcmo\b|\bcoo\b|\bcpo\b|\bcro\b|presidente|founder|s[oó]cio/.test(c)) return "C-Level";
  if (/head|diretor|gerente|coordena|lead|tech lead|manager|superintendente/.test(c)) return "Liderança";
  if (/senior|s[eê]nior|\bsr\b/.test(c)) return "Sênior";
  if (/pleno|\bpl\b/.test(c)) return "Pleno";
  if (/junior|j[uú]nior|\bjr\b/.test(c)) return "Júnior";
  if (/estagi|trainee|aprendiz|menor aprendiz/.test(c)) return "Estagiário";
  return "N/I";
}

export function isAtivoRow(p: PessoaRow): boolean {
  const sit = (p["Situação"] || "").trim().toLowerCase();
  if (sit) return sit === "ativo";
  const fase = (p.Fase || "").trim().toLowerCase();
  return fase === "ativo";
}

export function isInativoRow(p: PessoaRow): boolean {
  const sit = (p["Situação"] || "").trim().toLowerCase();
  return sit === "inativo" || sit === "desligado";
}

/** Reconstrói headcount mensal nos últimos N meses a partir das datas de contratação e updated_at dos inativos. */
export function build12mHistory(rows: PessoaRow[], months = 12) {
  const today = new Date();
  const ativosAtuais = rows.filter(isAtivoRow);
  const inativos = rows.filter(isInativoRow);
  const series: Array<{ month: string; monthLabel: string; headcount: number; admissoes: number; desligados: number; turnoverPct: number }> = [];

  for (let i = months - 1; i >= 0; i--) {
    const monthStart = startOfMonth(subMonths(today, i));
    const monthEnd = endOfMonth(monthStart);

    // Admitidos no mês
    const admissoes = rows.filter((p) => {
      const d = p["Data de contratação"];
      if (!d) return false;
      const dt = new Date(d);
      return dt >= monthStart && dt <= monthEnd;
    }).length;

    // Desligados no mês (aprox. via updated_at)
    const desligados = inativos.filter((p) => {
      const d = p.updated_at;
      if (!d) return false;
      const dt = new Date(d);
      return dt >= monthStart && dt <= monthEnd;
    }).length;

    // Headcount no fim do mês = ativos hoje contratados até monthEnd + inativos cujo desligamento foi depois de monthEnd mas contratação antes de monthEnd
    const ativosFimMes = ativosAtuais.filter((p) => {
      const d = p["Data de contratação"];
      if (!d) return false;
      return new Date(d) <= monthEnd;
    }).length;
    const inativosAindaAtivosNesseMes = inativos.filter((p) => {
      const contr = p["Data de contratação"];
      const upd = p.updated_at;
      if (!contr || !upd) return false;
      return new Date(contr) <= monthEnd && new Date(upd) > monthEnd;
    }).length;
    const headcount = ativosFimMes + inativosAindaAtivosNesseMes;

    const denom = (headcount + desligados) / 2 || headcount;
    const turnoverPct = denom > 0 ? (desligados / denom) * 100 : 0;

    series.push({
      month: format(monthStart, "yyyy-MM"),
      monthLabel: format(monthStart, "MMM/yy", { locale: ptBR }),
      headcount,
      admissoes,
      desligados,
      turnoverPct,
    });
  }
  return series;
}

export function tenureDistribution(rows: PessoaRow[]) {
  const ativos = rows.filter(isAtivoRow);
  const today = new Date();
  const counts = new Map<Tenure, number>(TENURE_ORDER.map((t) => [t, 0]));
  for (const p of ativos) {
    if (!p["Data de contratação"]) continue;
    const days = differenceInDays(today, new Date(p["Data de contratação"]));
    if (days < 0) continue;
    const b = tenureBucket(days);
    counts.set(b, (counts.get(b) || 0) + 1);
  }
  return TENURE_ORDER.map((t) => ({ bucket: t, count: counts.get(t) || 0 }));
}

export function seniorityDistribution(rows: PessoaRow[]) {
  const ativos = rows.filter(isAtivoRow);
  const counts = new Map<Seniority, number>(SENIORITY_ORDER.map((s) => [s, 0]));
  for (const p of ativos) {
    const s = seniorityLevel(p.Cargo);
    counts.set(s, (counts.get(s) || 0) + 1);
  }
  return SENIORITY_ORDER.map((s) => ({ level: s, count: counts.get(s) || 0 })).filter((x) => x.count > 0);
}

/** Aniversariantes de casa no mês (1, 2, 3, 5, 10, 15+ anos). */
export function anniversariesInMonth(rows: PessoaRow[], monthDate: Date) {
  const ativos = rows.filter(isAtivoRow);
  const result: Array<{ nome: string; cargo: string; anos: number; data: Date }> = [];
  for (const p of ativos) {
    const d = p["Data de contratação"];
    if (!d) continue;
    const dt = new Date(d);
    if (dt.getMonth() !== monthDate.getMonth()) continue;
    const anos = monthDate.getFullYear() - dt.getFullYear();
    if (anos <= 0) continue;
    // destaca redondos
    const redondo = anos === 1 || anos === 2 || anos === 3 || anos === 5 || anos === 10 || anos >= 15;
    if (!redondo && anos < 4) continue;
    result.push({
      nome: p.Nome || p["Título"] || "—",
      cargo: p.Cargo || "—",
      anos,
      data: dt,
    });
  }
  return result.sort((a, b) => b.anos - a.anos).slice(0, 10);
}

export function topTenure(rows: PessoaRow[], n = 5) {
  const today = new Date();
  return rows
    .filter(isAtivoRow)
    .filter((p) => !!p["Data de contratação"])
    .map((p) => ({
      nome: p.Nome || p["Título"] || "—",
      cargo: p.Cargo || "—",
      time: p.Time || "—",
      dias: differenceInDays(today, new Date(p["Data de contratação"]!)),
      data: new Date(p["Data de contratação"]!),
    }))
    .filter((p) => p.dias >= 0)
    .sort((a, b) => b.dias - a.dias)
    .slice(0, n);
}

export function bottomTenure(rows: PessoaRow[], n = 5) {
  return [...topTenure(rows, 9999)].sort((a, b) => a.dias - b.dias).slice(0, n);
}

export function previousRange(from: Date, to: Date): { from: Date; to: Date } {
  const span = to.getTime() - from.getTime();
  const prevTo = new Date(from.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - span);
  return { from: prevFrom, to: prevTo };
}

export function pessoasOfTime(rows: PessoaRow[], time: string) {
  const today = new Date();
  return rows
    .filter(isAtivoRow)
    .filter((p) => (p.Time || "").trim() === time)
    .map((p) => ({
      id: String(p.ID),
      nome: p.Nome || p["Título"] || "—",
      cargo: p.Cargo || "—",
      time: p.Time || "—",
      email: p["E-mail O2"] || "",
      dias: p["Data de contratação"] ? differenceInDays(today, new Date(p["Data de contratação"])) : 0,
      dataContratacao: p["Data de contratação"],
      situacao: p["Situação"] || "—",
    }))
    .sort((a, b) => b.dias - a.dias);
}

export function pessoasOfArea(rows: PessoaRow[], area: string, timeToBu: (t: string) => string) {
  const today = new Date();
  return rows
    .filter(isAtivoRow)
    .filter((p) => timeToBu(p.Time || "") === area)
    .map((p) => ({
      id: String(p.ID),
      nome: p.Nome || p["Título"] || "—",
      cargo: p.Cargo || "—",
      time: p.Time || "—",
      email: p["E-mail O2"] || "",
      dias: p["Data de contratação"] ? differenceInDays(today, new Date(p["Data de contratação"])) : 0,
      dataContratacao: p["Data de contratação"],
      situacao: p["Situação"] || "—",
    }))
    .sort((a, b) => b.dias - a.dias);
}

export function formatTenureShort(days: number): string {
  if (!days || days <= 0) return "—";
  const y = Math.floor(days / 365);
  const m = Math.floor((days % 365) / 30);
  if (y === 0) return `${m}m`;
  return m === 0 ? `${y}a` : `${y}a ${m}m`;
}

// ─────────── Distribuição etária ───────────

export type AgeBucket = "<25" | "25–30" | "30–35" | "35–40" | "40–50" | ">50" | "N/I";
export const AGE_BUCKET_ORDER: AgeBucket[] = ["<25", "25–30", "30–35", "35–40", "40–50", ">50", "N/I"];

export function calcIdade(dataNascimento: string | null | undefined): number | null {
  if (!dataNascimento) return null;
  const dt = new Date(dataNascimento);
  if (isNaN(dt.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dt.getFullYear();
  const m = today.getMonth() - dt.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dt.getDate())) age--;
  return age >= 0 && age < 120 ? age : null;
}

export function ageBucket(age: number | null): AgeBucket {
  if (age === null) return "N/I";
  if (age < 25) return "<25";
  if (age < 30) return "25–30";
  if (age < 35) return "30–35";
  if (age < 40) return "35–40";
  if (age < 50) return "40–50";
  return ">50";
}

export interface AgeStats {
  total: number;
  comDado: number;
  semDado: number;
  media: number;
  mediana: number;
  min: number;
  max: number;
  distribuicao: { bucket: AgeBucket; count: number; pct: number }[];
}

export function ageStats(rows: PessoaRow[]): AgeStats {
  const ativos = rows.filter(isAtivoRow);
  const idades = ativos
    .map((p) => calcIdade(p["Data de nascimento"]))
    .filter((v): v is number => v !== null);
  const comDado = idades.length;
  const semDado = ativos.length - comDado;
  const sorted = [...idades].sort((a, b) => a - b);
  const media = comDado ? idades.reduce((a, b) => a + b, 0) / comDado : 0;
  const mediana = comDado
    ? sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)]
    : 0;
  const counts = new Map<AgeBucket, number>();
  AGE_BUCKET_ORDER.forEach((b) => counts.set(b, 0));
  for (const p of ativos) {
    const b = ageBucket(calcIdade(p["Data de nascimento"]));
    counts.set(b, (counts.get(b) || 0) + 1);
  }
  const total = ativos.length || 1;
  const distribuicao = AGE_BUCKET_ORDER.map((b) => ({
    bucket: b,
    count: counts.get(b) || 0,
    pct: ((counts.get(b) || 0) / total) * 100,
  })).filter((d) => d.count > 0);
  return {
    total: ativos.length,
    comDado,
    semDado,
    media,
    mediana,
    min: comDado ? sorted[0] : 0,
    max: comDado ? sorted[sorted.length - 1] : 0,
    distribuicao,
  };
}

export interface AgeByBuRow {
  bu: string;
  total: number;
  buckets: Record<AgeBucket, number>;
}

export function ageByBu(rows: PessoaRow[], timeToBu: (t: string) => string): AgeByBuRow[] {
  const ativos = rows.filter(isAtivoRow);
  const map = new Map<string, AgeByBuRow>();
  for (const p of ativos) {
    const bu = timeToBu(p.Time || "");
    if (!map.has(bu)) {
      const empty = Object.fromEntries(AGE_BUCKET_ORDER.map((b) => [b, 0])) as Record<AgeBucket, number>;
      map.set(bu, { bu, total: 0, buckets: empty });
    }
    const row = map.get(bu)!;
    const b = ageBucket(calcIdade(p["Data de nascimento"]));
    row.buckets[b]++;
    row.total++;
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

// ─────────── Saneamento ───────────

export interface SaneamentoStats {
  semContratacao: PessoaRow[];
  inativosSemDesligamento: PessoaRow[];
  semNascimento: PessoaRow[];
}

export function saneamentoStats(rows: PessoaRow[]): SaneamentoStats {
  return {
    semContratacao: rows.filter((p) => isAtivoRow(p) && !p["Data de contratação"]),
    // Sem campo dedicado de "Data de desligamento" — proxy via updated_at; flag todos inativos
    inativosSemDesligamento: rows.filter(isInativoRow),
    semNascimento: rows.filter((p) => isAtivoRow(p) && !p["Data de nascimento"]),
  };
}

