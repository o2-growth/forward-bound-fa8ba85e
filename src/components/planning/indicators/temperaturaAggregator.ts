import type { DetailItem } from "./DetailSheet";
import type { useModeloAtualAnalytics } from "@/hooks/useModeloAtualAnalytics";
import type { useExpansaoAnalytics } from "@/hooks/useExpansaoAnalytics";
import type { useOutboundAnalytics } from "@/hooks/useOutboundAnalytics";
import type { useMonetizacaoAnalytics } from "@/hooks/useMonetizacaoAnalytics";
import type { BUType } from "@/hooks/useFunnelRealized";

export type Temperatura = "Quente" | "Morno" | "Frio";
export type BuLabel =
  | "Modelo Atual"
  | "Outbound"
  | "Franquia"
  | "Oxy Hacker"
  | "Monetização";

const MONETIZACAO_QUENTE_TIPOS = new Set([
  "Upsell",
  "Cross-sell",
  "Troca de produto",
]);

const normalize = (s: unknown): string =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

const LOST_PHASES = new Set([
  "perdido",
  "perda",
  "lost",
  "descartado",
  "desistencia",
  "desistiu",
  "desistencias",
  "arquivado",
  "arquivados",
  "cancelado",
  "cancelamento",
  "desqualificado",
  "nao qualificado",
  "no show",
  "sem interesse",
]);
const isLostPhase = (fase: unknown): boolean => {
  const n = normalize(fase);
  if (!n) return false;
  if (LOST_PHASES.has(n)) return true;
  // Cobre variações do tipo "Perdido - Sem interesse", "Perda - ICP fora"
  return n.startsWith("perdido") || n.startsWith("perda");
};

const WON_PHASES = new Set(["ganho", "contrato assinado", "concluido"]);
const isWonPhase = (fase: unknown): boolean => WON_PHASES.has(normalize(fase));

const STANDBY_PHASES = new Set(["contato futuro"]);
const isStandbyPhase = (fase: unknown): boolean =>
  STANDBY_PHASES.has(normalize(fase));

// Checa se qualquer linha do card indica perda (fase atual, fase, faseDestino,
// flag `perdido` ou motivoPerda preenchido).
function anyRowIsLost(rows: any[]): boolean {
  for (const r of rows) {
    if (!r) continue;
    if (r.perdido === true) return true;
    if (r.motivoPerda && String(r.motivoPerda).trim()) return true;
    if (isLostPhase(r.faseAtual)) return true;
    if (isLostPhase(r.fase)) return true;
    if (isLostPhase(r.faseDestino)) return true;
  }
  return false;
}


type ModeloAnalytics = ReturnType<typeof useModeloAtualAnalytics>;
type ExpansaoAnalyticsT = ReturnType<typeof useExpansaoAnalytics>;
type OutboundAnalyticsT = ReturnType<typeof useOutboundAnalytics>;
type MonetizacaoAnalyticsT = ReturnType<typeof useMonetizacaoAnalytics>;

export interface AggregateInput {
  modeloAtualAnalytics: ModeloAnalytics;
  franquiaAnalytics: ExpansaoAnalyticsT;
  oxyHackerAnalytics: ExpansaoAnalyticsT;
  outboundAnalytics: OutboundAnalyticsT;
  monetizacaoAnalytics?: MonetizacaoAnalyticsT;
  selectedBUs: BUType[];
  startDate: Date;
  endDate: Date;
  /**
   * Quando true, ignora o filtro de período para cards em aberto.
   * Usado no Cenário de Caixa para mostrar todo o pipeline vivo.
   */
  includeAllOpenIgnoringPeriod?: boolean;
  /**
   * Predicado opcional aplicado a cada card antes de entrar em Quente/Morno/Frio.
   * Usado para propagar filtros de Closer / SDR / Origem da aba Indicadores.
   */
  cardFilter?: (card: any, buLabel: BuLabel) => boolean;
}

export interface AggregateResult {
  buckets: Record<Temperatura, DetailItem[]>;
  totalTagged: number;
  totalSemTag: number;
  activeLabels: string[];
}

export function aggregateByTemperatura({
  modeloAtualAnalytics,
  franquiaAnalytics,
  oxyHackerAnalytics,
  outboundAnalytics,
  monetizacaoAnalytics,
  selectedBUs,
  startDate,
  endDate,
  includeAllOpenIgnoringPeriod = false,
}: AggregateInput): AggregateResult {
  const startTime = startDate.getTime();
  const endTime = new Date(
    endDate.getFullYear(),
    endDate.getMonth(),
    endDate.getDate(),
    23,
    59,
    59,
    999,
  ).getTime();

  type Source = {
    buLabel: BuLabel;
    enabled: boolean;
    cards: Array<{ id: string; dataEntrada: Date; temperatura?: Temperatura }>;
    toDetail: (card: any) => DetailItem;
  };

  const includesModelo = selectedBUs.includes("modelo_atual");
  const sources: Source[] = [
    {
      buLabel: "Modelo Atual",
      enabled: includesModelo,
      cards: (includeAllOpenIgnoringPeriod
        ? ((modeloAtualAnalytics as any).allOpenCards || modeloAtualAnalytics.allCards)
        : modeloAtualAnalytics.allCards) as any,
      toDetail: modeloAtualAnalytics.toDetailItem,
    },
    {
      buLabel: "Outbound",
      enabled: includesModelo,
      cards: (outboundAnalytics.allCards || []) as any,
      toDetail: outboundAnalytics.toDetailItem,
    },
    {
      buLabel: "Franquia",
      enabled: selectedBUs.includes("franquia"),
      cards: (includeAllOpenIgnoringPeriod
        ? ((franquiaAnalytics as any).allOpenCards || franquiaAnalytics.cards)
        : franquiaAnalytics.cards) as any,
      toDetail: franquiaAnalytics.toDetailItem,
    },
    {
      buLabel: "Oxy Hacker",
      enabled: selectedBUs.includes("oxy_hacker"),
      cards: (includeAllOpenIgnoringPeriod
        ? ((oxyHackerAnalytics as any).allOpenCards || oxyHackerAnalytics.cards)
        : oxyHackerAnalytics.cards) as any,
      toDetail: oxyHackerAnalytics.toDetailItem,
    },
  ];

  const buckets: Record<Temperatura, DetailItem[]> = {
    Quente: [],
    Morno: [],
    Frio: [],
  };
  let semTag = 0;
  const activeLabels: string[] = [];

  for (const src of sources) {
    if (!src.enabled) continue;
    activeLabels.push(src.buLabel);

    // Agrupa todas as linhas por id para inspecionar o histórico do card
    // (uma linha marcada como Perdido em qualquer momento invalida o card).
    const rowsById = new Map<string, any[]>();
    const latestById = new Map<string, any>();
    for (const c of src.cards) {
      if (!c?.dataEntrada) continue;
      if (!includeAllOpenIgnoringPeriod) {
        const t = c.dataEntrada.getTime();
        if (t < startTime || t > endTime) continue;
      }
      if (!rowsById.has(c.id)) rowsById.set(c.id, []);
      rowsById.get(c.id)!.push(c);
      const ex = latestById.get(c.id);
      if (!ex || c.dataEntrada > ex.dataEntrada) latestById.set(c.id, c);
    }

    for (const [id, card] of latestById.entries()) {
      const rows = rowsById.get(id) ?? [card];
      // Exclui cards fechados como Ganho / Contrato assinado
      if (isWonPhase((card as any).faseAtual)) continue;
      // Exclui cards perdidos (fase atual, histórico, flag ou motivoPerda)
      if (anyRowIsLost(rows)) continue;
      // Exclui cards em standby (Contato futuro) — não são pipeline vivo
      if (isStandbyPhase((card as any).faseAtual)) continue;
      if (card.temperatura) {
        const item = src.toDetail(card);
        buckets[card.temperatura as Temperatura].push({
          ...item,
          bu: src.buLabel,
        });
      } else {
        semTag++;
      }
    }
  }


  // Monetização: Upsell, Cross-sell, Troca de produto entram como Quente
  if (monetizacaoAnalytics && monetizacaoAnalytics.cards.length > 0) {
    const existingQuenteIds = new Set(
      buckets.Quente.map((it) => String(it.id)),
    );
    let added = 0;
    for (const card of monetizacaoAnalytics.cards) {
      if (!MONETIZACAO_QUENTE_TIPOS.has(card.tipo)) continue;
      // Exclui cards perdidos ou já ganhos (Concluído)
      if (card.perdido || card.ganho || isLostPhase(card.faseAtual) || isWonPhase(card.faseAtual) || isStandbyPhase(card.faseAtual)) continue;
      const entradaTime = card.entrada
        ? new Date(card.entrada).getTime()
        : NaN;
      if (!includeAllOpenIgnoringPeriod) {
        if (!Number.isFinite(entradaTime)) continue;
        if (entradaTime < startTime || entradaTime > endTime) continue;
      }
      const id = String(card.id);
      if (existingQuenteIds.has(id)) continue;
      existingQuenteIds.add(id);
      const item = monetizacaoAnalytics.toDetailItem(card);
      buckets.Quente.push({ ...item, bu: "Monetização" });
      added++;
    }
    if (added > 0) activeLabels.push("Monetização");
  }

  const tagged =
    buckets.Quente.length + buckets.Morno.length + buckets.Frio.length;
  return { buckets, totalTagged: tagged, totalSemTag: semTag, activeLabels };
}

// % de entrada de caixa por BU
export const CASH_RULES: Record<BuLabel, { mrr: number; setup: number; pontual: number }> = {
  "Modelo Atual": { mrr: 0, setup: 0.75, pontual: 0.5 },
  Outbound: { mrr: 0, setup: 0.75, pontual: 0.5 },
  Franquia: { mrr: 0, setup: 0, pontual: 0.7 },
  "Oxy Hacker": { mrr: 0, setup: 0, pontual: 0.7 },
  "Monetização": { mrr: 0, setup: 0, pontual: 0 },
};

export interface CashBreakdown {
  mrr: number;
  setup: number;
  pontual: number;
  total: number;
}

export function computeCashFromCard(item: DetailItem): CashBreakdown {
  const rule = CASH_RULES[(item.bu as BuLabel) || "Modelo Atual"] ||
    CASH_RULES["Modelo Atual"];
  const mrr = (item.mrr || 0) * rule.mrr;
  const setup = (item.setup || 0) * rule.setup;
  const pontual = (item.pontual || 0) * rule.pontual;
  return { mrr, setup, pontual, total: mrr + setup + pontual };
}
