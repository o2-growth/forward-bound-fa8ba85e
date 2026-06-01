// Insights Comerciais - rule engine
// Pure functions. Input: aggregated data per BU. Output: typed insights.

import type { DetailItem } from "@/components/planning/indicators/DetailSheet";

export type InsightSeverity = "critical" | "warning" | "ok";
export type InsightCategory = "vendedor" | "bu" | "funil" | "perdas" | "sla" | "produto";

export interface Insight {
  id: string;
  severity: InsightSeverity;
  category: InsightCategory;
  title: string;
  description: string;
  bu?: string;
  person?: string;
  metric?: { label: string; value: string | number; target?: string | number };
  evidence?: DetailItem[]; // cards relacionados (para drill-down futuro)
}

export interface BuInsightInput {
  bu: string;
  // Resultados realizados no período
  vendas: DetailItem[];
  propostas: DetailItem[];
  rrs: DetailItem[];
  rms: DetailItem[];
  mqls: DetailItem[];
  perdas: DetailItem[];
  // Faturamento realizado (R$) e meta do período
  faturamentoRealizado: number;
  faturamentoMeta: number;
  // SLA médio (minutos) — opcional
  slaMedioMin?: number;
  slaMetaMin?: number; // default 30
}

const fmtBRL = (v: number) =>
  v >= 1_000_000 ? `R$ ${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `R$ ${(v / 1_000).toFixed(0)}k` : `R$ ${Math.round(v)}`;

const firstName = (s: string) => (s || "").trim().split(/\s+/)[0].toLowerCase();

/** R6: BU abaixo de 50% da meta de faturamento. */
function ruleBuMeta(input: BuInsightInput): Insight | null {
  const { bu, faturamentoMeta, faturamentoRealizado } = input;
  if (!faturamentoMeta || faturamentoMeta <= 0) return null;
  const pct = faturamentoRealizado / faturamentoMeta;
  if (pct < 0.5) {
    return {
      id: `bu-meta-${bu}`,
      severity: "critical",
      category: "bu",
      bu,
      title: `${bu} a ${(pct * 100).toFixed(0)}% da meta`,
      description: `Realizado ${fmtBRL(faturamentoRealizado)} de ${fmtBRL(faturamentoMeta)} no período. Ritmo crítico.`,
      metric: { label: "Atingimento", value: `${(pct * 100).toFixed(0)}%`, target: "100%" },
    };
  }
  if (pct < 0.8) {
    return {
      id: `bu-meta-${bu}`,
      severity: "warning",
      category: "bu",
      bu,
      title: `${bu} a ${(pct * 100).toFixed(0)}% da meta`,
      description: `Realizado ${fmtBRL(faturamentoRealizado)} de ${fmtBRL(faturamentoMeta)}. Atenção ao ritmo.`,
      metric: { label: "Atingimento", value: `${(pct * 100).toFixed(0)}%`, target: "100%" },
    };
  }
  if (pct >= 1) {
    return {
      id: `bu-meta-${bu}`,
      severity: "ok",
      category: "bu",
      bu,
      title: `${bu} bateu a meta (${(pct * 100).toFixed(0)}%)`,
      description: `Realizado ${fmtBRL(faturamentoRealizado)} de ${fmtBRL(faturamentoMeta)}.`,
      metric: { label: "Atingimento", value: `${(pct * 100).toFixed(0)}%`, target: "100%" },
    };
  }
  return null;
}

/** R1: Closer sem nenhuma venda no período (com >= 3 reuniões). */
function ruleVendedorZerado(input: BuInsightInput): Insight[] {
  const { bu, vendas, rrs, rms } = input;
  const out: Insight[] = [];
  const closers = new Map<string, { name: string; vendas: number; reunioes: number }>();
  const bump = (items: DetailItem[], field: "vendas" | "reunioes") => {
    for (const it of items) {
      const raw = (it.closer || it.responsible || "").trim();
      if (!raw) continue;
      const key = firstName(raw);
      const ex = closers.get(key) || { name: raw, vendas: 0, reunioes: 0 };
      ex[field] += 1;
      if (raw.length > ex.name.length) ex.name = raw;
      closers.set(key, ex);
    }
  };
  bump(vendas, "vendas");
  bump(rrs, "reunioes");
  bump(rms, "reunioes");

  for (const [key, c] of closers) {
    if (c.vendas === 0 && c.reunioes >= 3) {
      out.push({
        id: `vend-zero-${bu}-${key}`,
        severity: "critical",
        category: "vendedor",
        bu,
        person: c.name,
        title: `${c.name} sem vendas em ${bu}`,
        description: `Realizou ${c.reunioes} reuniões no período e fechou 0. Investigar conversão.`,
        metric: { label: "Vendas", value: 0, target: "≥ 1" },
      });
    }
  }
  return out;
}

/** R9: Concentração alta em um único motivo de perda (>= 30%). */
function ruleConcentracaoMotivoPerda(input: BuInsightInput): Insight | null {
  const { bu, perdas } = input;
  if (perdas.length < 5) return null;
  const reasons = new Map<string, number>();
  for (const p of perdas) {
    const r = (p.reason || "Não informado").trim();
    reasons.set(r, (reasons.get(r) || 0) + 1);
  }
  const sorted = [...reasons.entries()].sort((a, b) => b[1] - a[1]);
  const [topReason, topCount] = sorted[0];
  const pct = topCount / perdas.length;
  if (pct >= 0.3) {
    return {
      id: `perda-motivo-${bu}`,
      severity: pct >= 0.5 ? "critical" : "warning",
      category: "perdas",
      bu,
      title: `${bu}: ${(pct * 100).toFixed(0)}% das perdas por "${topReason}"`,
      description: `${topCount} de ${perdas.length} perdas concentradas em um único motivo. Possível causa estrutural.`,
      metric: { label: "Concentração", value: `${(pct * 100).toFixed(0)}%`, target: "< 30%" },
    };
  }
  return null;
}

/** R12: SLA médio acima da meta. */
function ruleSla(input: BuInsightInput): Insight | null {
  const { bu, slaMedioMin } = input;
  const target = input.slaMetaMin ?? 30;
  if (slaMedioMin == null) return null;
  if (slaMedioMin > target * 2) {
    return {
      id: `sla-${bu}`,
      severity: "critical",
      category: "sla",
      bu,
      title: `${bu}: SLA médio ${Math.round(slaMedioMin)}min`,
      description: `Acima de ${target * 2}min (meta ${target}min). Resposta lenta prejudica conversão.`,
      metric: { label: "SLA", value: `${Math.round(slaMedioMin)}min`, target: `≤ ${target}min` },
    };
  }
  if (slaMedioMin > target) {
    return {
      id: `sla-${bu}`,
      severity: "warning",
      category: "sla",
      bu,
      title: `${bu}: SLA médio ${Math.round(slaMedioMin)}min`,
      description: `Acima da meta de ${target}min.`,
      metric: { label: "SLA", value: `${Math.round(slaMedioMin)}min`, target: `≤ ${target}min` },
    };
  }
  return null;
}

/** R5: Funil afunilando demais — taxa MQL→RM abaixo de 10%. */
function ruleConversaoFunil(input: BuInsightInput): Insight | null {
  const { bu, mqls, rms } = input;
  if (mqls.length < 10) return null;
  const taxa = rms.length / mqls.length;
  if (taxa < 0.1) {
    return {
      id: `funil-mqlrm-${bu}`,
      severity: "critical",
      category: "funil",
      bu,
      title: `${bu}: conversão MQL→RM em ${(taxa * 100).toFixed(0)}%`,
      description: `${rms.length} reuniões marcadas em ${mqls.length} MQLs. Time de SDR sub-performando ou MQLs ruins.`,
      metric: { label: "MQL→RM", value: `${(taxa * 100).toFixed(0)}%`, target: "≥ 20%" },
    };
  }
  return null;
}

export function runInsightsForBu(input: BuInsightInput): Insight[] {
  const out: Insight[] = [];
  const buMeta = ruleBuMeta(input);
  if (buMeta) out.push(buMeta);
  out.push(...ruleVendedorZerado(input));
  const motivo = ruleConcentracaoMotivoPerda(input);
  if (motivo) out.push(motivo);
  const sla = ruleSla(input);
  if (sla) out.push(sla);
  const funil = ruleConversaoFunil(input);
  if (funil) out.push(funil);
  return out;
}

export function runInsights(inputs: BuInsightInput[]): Insight[] {
  const all = inputs.flatMap(runInsightsForBu);
  // Ordena: critical > warning > ok
  const rank: Record<InsightSeverity, number> = { critical: 0, warning: 1, ok: 2 };
  return all.sort((a, b) => rank[a.severity] - rank[b.severity]);
}
