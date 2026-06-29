// marketingFunnelAggregator.ts — Fonte única de regras de funil/receita para
// a aba Indicadores · Marketing. Mantém paridade com o Indicador Comercial:
// mesma PHASE_FUNNEL_MAP, mesma cumulatividade, mesma regra de venda
// (Ganho > Contrato assinado, dedup por card+mês) e mesma fórmula de
// receita padrão (MRR + Setup + Pontual, sem Educação) e TCV.

import type { AttributionCard } from "@/components/planning/marketing-indicators/types";

export type FunnelStage =
  | "leads"
  | "mqls"
  | "rms"
  | "rrs"
  | "propostas"
  | "vendas";

export const FUNNEL_ORDER: FunnelStage[] = [
  "leads",
  "mqls",
  "rms",
  "rrs",
  "propostas",
  "vendas",
];

// PHASE_FUNNEL_MAP — mesma do useMarketingAttribution + 'Ganho' como venda.
export const PHASE_FUNNEL_MAP: Record<string, FunnelStage> = {
  "Novos Leads": "leads",
  "Start form": "leads",
  "MQLs": "mqls",
  "MQL": "mqls",
  "Tentativas de contato": "mqls",
  "Material ISCA": "mqls",
  "Reunião agendada / Qualificado": "rms",
  "Reunião Realizada": "rrs",
  "1° Reunião Realizada - Apresentação": "rrs",
  "1° Reunião Realizada": "rrs",
  "Proposta enviada / Follow Up": "propostas",
  "Enviar para assinatura": "propostas",
  "Contrato assinado": "vendas",
  "Ganho": "vendas",
};

const normalize = (s?: string | null): string =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

export function isSaleFase(fase?: string): boolean {
  const n = normalize(fase);
  return n === "contrato assinado" || n === "ganho";
}

export function getCumulativeStages(stage: FunnelStage): FunnelStage[] {
  const idx = FUNNEL_ORDER.indexOf(stage);
  return FUNNEL_ORDER.slice(0, idx + 1);
}

/**
 * Receita padrão de um card vendido (MRR + Setup + Pontual). Sem Educação,
 * em linha com a regra "Standard monetary totals" do Indicador Comercial.
 */
export function cardRevenue(c: AttributionCard): number {
  return (c.valorMRR || 0) + (c.valorSetup || 0) + (c.valorPontual || 0);
}

/**
 * TCV = (MRR × 12) + Setup + Pontual.
 */
export function cardTcv(c: AttributionCard): number {
  return (c.valorMRR || 0) * 12 + (c.valorSetup || 0) + (c.valorPontual || 0);
}

/**
 * Dedup mensal por card preferindo 'Ganho' a 'Contrato assinado'. Recebe
 * cards que já passam a fase de venda; devolve no máximo 1 ocorrência por
 * (cardId, ano-mês). Quando a mesma chave existe nos dois estados, mantém
 * o 'Ganho'. Útil para qualquer agregação onde só queremos contar a venda
 * uma vez.
 */
export function dedupSalesByMonthPreferGanho(
  cards: AttributionCard[],
): AttributionCard[] {
  const byKey = new Map<string, AttributionCard>();
  for (const c of cards) {
    if (!isSaleFase(c.fase)) continue;
    const date = c.dataAssinatura ?? c.dataEntrada;
    if (!date) continue;
    const ym = `${date.getFullYear()}-${date.getMonth() + 1}`;
    const key = `${c.id}|${ym}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, c);
      continue;
    }
    const existingIsGanho = normalize(existing.fase) === "ganho";
    const incomingIsGanho = normalize(c.fase) === "ganho";
    if (incomingIsGanho && !existingIsGanho) byKey.set(key, c);
  }
  return Array.from(byKey.values());
}

export interface FunnelCounts {
  leads: number;
  mqls: number;
  rms: number;
  rrs: number;
  propostas: number;
  vendas: number;
  mrr: number;
  setup: number;
  pontual: number;
  receita: number;
  tcv: number;
}

const emptyCounts = (): FunnelCounts => ({
  leads: 0,
  mqls: 0,
  rms: 0,
  rrs: 0,
  propostas: 0,
  vendas: 0,
  mrr: 0,
  setup: 0,
  pontual: 0,
  receita: 0,
  tcv: 0,
});

/**
 * Agrega o funil aplicando cumulatividade + dedup por card. Recebe os cards
 * já filtrados pelo período. `dedupedSales` opcional substitui a contagem e
 * a receita de 'vendas' por uma lista pré-deduplicada (use isto quando o
 * caller já tem o set autoritativo do período — caso do Indicador Comercial).
 */
export function aggregateFunnel(
  cards: AttributionCard[],
  dedupedSales?: AttributionCard[],
): FunnelCounts {
  const stageSets: Record<FunnelStage, Set<string>> = {
    leads: new Set(),
    mqls: new Set(),
    rms: new Set(),
    rrs: new Set(),
    propostas: new Set(),
    vendas: new Set(),
  };

  for (const card of cards) {
    const stage = PHASE_FUNNEL_MAP[card.fase];
    if (!stage) continue;
    for (const s of getCumulativeStages(stage)) {
      stageSets[s].add(String(card.id));
    }
  }

  const out = emptyCounts();
  out.leads = stageSets.leads.size;
  out.mqls = stageSets.mqls.size;
  out.rms = stageSets.rms.size;
  out.rrs = stageSets.rrs.size;
  out.propostas = stageSets.propostas.size;

  if (dedupedSales) {
    out.vendas = dedupedSales.length;
    for (const c of dedupedSales) {
      out.mrr += c.valorMRR || 0;
      out.setup += c.valorSetup || 0;
      out.pontual += c.valorPontual || 0;
      out.receita += cardRevenue(c);
      out.tcv += cardTcv(c);
    }
  } else {
    out.vendas = stageSets.vendas.size;
    const seen = new Set<string>();
    for (const c of cards) {
      const stage = PHASE_FUNNEL_MAP[c.fase];
      if (stage !== "vendas") continue;
      const id = String(c.id);
      if (seen.has(id)) continue;
      seen.add(id);
      out.mrr += c.valorMRR || 0;
      out.setup += c.valorSetup || 0;
      out.pontual += c.valorPontual || 0;
      out.receita += cardRevenue(c);
      out.tcv += cardTcv(c);
    }
  }

  return out;
}

/**
 * Agrupa cards por uma chave arbitrária (canal, origem, BU, campanha) e
 * devolve `FunnelCounts` por grupo. `dedupedSales` opcional é usado para
 * sobrescrever vendas/receita por grupo na mesma chave.
 */
export function aggregateBy<K extends string>(
  cards: AttributionCard[],
  keyFn: (c: AttributionCard) => K,
  dedupedSales?: AttributionCard[],
): Map<K, FunnelCounts> {
  const groups = new Map<K, AttributionCard[]>();
  for (const c of cards) {
    const k = keyFn(c);
    let arr = groups.get(k);
    if (!arr) {
      arr = [];
      groups.set(k, arr);
    }
    arr.push(c);
  }

  let salesByKey: Map<K, AttributionCard[]> | undefined;
  if (dedupedSales) {
    salesByKey = new Map();
    for (const c of dedupedSales) {
      const k = keyFn(c);
      let arr = salesByKey.get(k);
      if (!arr) {
        arr = [];
        salesByKey.set(k, arr);
      }
      arr.push(c);
    }
  }

  const out = new Map<K, FunnelCounts>();
  for (const [k, list] of groups) {
    out.set(k, aggregateFunnel(list, salesByKey?.get(k)));
  }
  return out;
}
