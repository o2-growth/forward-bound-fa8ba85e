/**
 * useG4Analytics.ts — Hook principal da aba G4.
 *
 * Consome useModeloAtualAnalytics (fonte de cards do Pipefy) e filtra /
 * classifica cada card nas frentes: lives | eventos | seller.
 *
 * Retorna:
 *   analytics: G4Analytics  — KPIs + métricas por frente
 *   refetch:   () => void   — invalida o cache e re-busca os dados
 */

import { useMemo, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useModeloAtualAnalytics,
  type ModeloAtualCard,
} from "./useModeloAtualAnalytics";
import {
  G4_LIVES,
  G4_EVENTOS,
  IMPOSTO_PCT,
  COMISSAO_G4_PCT,
  classifyG4Card,
  hasG4Signal,
  matchEventoFromCard,
  type G4Frente,
  type G4LiveConfig,
  type G4EventoConfig,
} from "@/lib/g4Events";

// ── Tipos de saída exportados ─────────────────────────────────────────────

export type { G4Frente };

export interface G4FunnelStep {
  phase: "leads" | "mql" | "rm" | "rr" | "proposta" | "venda";
  label: string;
  count: number;
  convRate: number; // % em relação à etapa anterior (0–100)
}

export interface G4Pipe {
  aberto: number; // valor em cards ativos (não-ganhos, não-perdidos)
  ganho: number; // valor já fechado (receita bruta)
  total: number; // aberto + ganho
}

/** Mesma estrutura de G4Dre em FrenteDreCard.tsx (compatibilidade estrutural) */
export interface G4Dre {
  receitaBruta: number;
  imposto: number; // valor absoluto = IMPOSTO_PCT × receitaBruta
  comissaoG4: number; // valor absoluto = COMISSAO_G4_PCT × receitaBruta
  custosOperacionais: number;
  lucroLiquido: number; // receitaBruta − imposto − comissaoG4 − custosOperacionais
}

/** Linha de custo detalhado para expansão no FrenteDreCard */
export interface G4CustoDetalhe {
  label: string;
  valor: number;
}

/** Linha de detalhe por live (tabela em LivesSection) */
export interface G4LiveRow {
  label: string; // "Live 20/05"
  date: string; // "YYYY-MM-DD"
  saveCost: number;
  pedroCost: number;
  totalCost: number; // saveCost + pedroCost
  leadsGerados: number; // leads capturados na janela desta live
}

/** Linha de detalhe por evento (tabela em EventosSection) */
export interface G4EventoRow {
  label: string; // "G4 TOOLS CONNECT 06/05"
  date: string; // "YYYY-MM-DD"
  custo: number; // 0 = TODO
  leadsGerados: number;
}

export interface G4FrenteMetrics {
  frente: G4Frente;
  label: string;
  /** Cards únicos classificados nesta frente (um por card ID) */
  cards: ModeloAtualCard[];
  funnel: G4FunnelStep[];
  leadTimeMediaDias: number;
  /** Distribuição atual por faseAtual */
  esteira: Record<string, number>;
  pipe: G4Pipe;
  dre: G4Dre;
  custosDetalhe: G4CustoDetalhe[];
  /** Detalhamento por live — preenchido apenas na frente "lives" */
  livesRows: G4LiveRow[];
  /** Detalhamento por evento — preenchido apenas na frente "eventos" */
  eventosRows: G4EventoRow[];
}

export interface G4Analytics {
  loading: boolean;
  error: Error | null;
  totalLeads: number;
  totalPipe: number; // soma de pipe.aberto das 3 frentes
  totalFaturado: number; // soma de dre.receitaBruta das 3 frentes
  lives: G4FrenteMetrics;
  eventos: G4FrenteMetrics;
  seller: G4FrenteMetrics;
  /** Cards com sinal G4 mas sem frente atribuída — para diagnóstico. */
  unclassifiedCount: number;
  unclassifiedCards: ModeloAtualCard[];
}

// ── Mapeamento de fases Pipefy → etapa do funil G4 ───────────────────────
const PHASE_TO_FUNNEL: Record<string, G4FunnelStep["phase"]> = {
  "Novos Leads": "leads",
  MQLs: "mql",
  "Tentativas de contato": "mql",
  "Material ISCA": "mql",
  "Start form": "mql",
  "Reunião agendada / Qualificado": "rm",
  "Reunião Realizada": "rr",
  "1° Reunião Realizada - Apresentação": "rr",
  "Proposta enviada / Follow Up": "proposta",
  "Contrato assinado": "venda",
  Ganho: "venda",
};

const FUNNEL_PHASE_ORDER: G4FunnelStep["phase"][] = [
  "leads",
  "mql",
  "rm",
  "rr",
  "proposta",
  "venda",
];

const FUNNEL_PHASE_LABELS: Record<G4FunnelStep["phase"], string> = {
  leads: "Leads",
  mql: "MQL",
  rm: "RM",
  rr: "RR",
  proposta: "Proposta",
  venda: "Venda",
};

const VENDA_FASES = new Set(["Ganho", "Contrato assinado"]);
const PERDIDO_FASES = new Set(["Perdido"]);

// ── Helpers puros (fora do hook para não recriar a cada render) ───────────

function emptyFunnel(): G4FunnelStep[] {
  return FUNNEL_PHASE_ORDER.map((phase) => ({
    phase,
    label: FUNNEL_PHASE_LABELS[phase],
    count: 0,
    convRate: 0,
  }));
}

function emptyFrente(frente: G4Frente, label: string): G4FrenteMetrics {
  return {
    frente,
    label,
    cards: [],
    funnel: emptyFunnel(),
    leadTimeMediaDias: 0,
    esteira: {},
    pipe: { aberto: 0, ganho: 0, total: 0 },
    dre: {
      receitaBruta: 0,
      imposto: 0,
      comissaoG4: 0,
      custosOperacionais: 0,
      lucroLiquido: 0,
    },
    custosDetalhe: [],
    livesRows: [],
    eventosRows: [],
  };
}

/** Constrói o funil a partir dos movimentos (allMovements) de um conjunto de cards */
function buildFunnel(cardIds: Set<string>, allMovements: ModeloAtualCard[]): G4FunnelStep[] {
  // Conta card IDs únicos que têm pelo menos 1 movimento em cada etapa do funil
  const phaseCardIds: Record<string, Set<string>> = {};
  for (const phase of FUNNEL_PHASE_ORDER) phaseCardIds[phase] = new Set();

  for (const m of allMovements) {
    if (!cardIds.has(m.id)) continue;
    const funnelPhase = PHASE_TO_FUNNEL[m.fase];
    if (funnelPhase) phaseCardIds[funnelPhase].add(m.id);
  }

  return FUNNEL_PHASE_ORDER.map((phase, i) => {
    const count = phaseCardIds[phase].size;
    const prevCount =
      i > 0 ? phaseCardIds[FUNNEL_PHASE_ORDER[i - 1]].size : count;
    const convRate =
      i === 0
        ? 100
        : prevCount > 0
        ? Math.round((count / prevCount) * 1000) / 10
        : 0;
    return { phase, label: FUNNEL_PHASE_LABELS[phase], count, convRate };
  });
}

/** Lead time médio em dias (desde a primeira entrada no pipeline) */
function buildLeadTimeMedio(
  cardIds: Set<string>,
  firstMovementByCard: Map<string, ModeloAtualCard>
): number {
  const now = Date.now();
  const days: number[] = [];
  for (const id of cardIds) {
    const first = firstMovementByCard.get(id);
    if (first) days.push((now - first.dataEntrada.getTime()) / 86_400_000);
  }
  if (days.length === 0) return 0;
  return Math.round(days.reduce((s, d) => s + d, 0) / days.length);
}

/** Distribuição das fases atuais dos cards */
function buildEsteira(repCards: ModeloAtualCard[]): Record<string, number> {
  const esteira: Record<string, number> = {};
  for (const c of repCards) {
    const fase = c.faseAtual || c.fase;
    if (fase) esteira[fase] = (esteira[fase] || 0) + 1;
  }
  return esteira;
}

/** Pipe a partir do estado atual (faseAtual) dos cards representativos */
function buildPipe(repCards: ModeloAtualCard[]): G4Pipe {
  let aberto = 0;
  let ganho = 0;
  for (const c of repCards) {
    const faseAtual = c.faseAtual || c.fase;
    if (VENDA_FASES.has(faseAtual)) {
      ganho += c.valor;
    } else if (!PERDIDO_FASES.has(faseAtual)) {
      aberto += c.valor;
    }
  }
  return { aberto, ganho, total: aberto + ganho };
}

/** DRE simplificado da frente */
function buildDre(
  repCards: ModeloAtualCard[],
  custosOperacionais: number
): G4Dre {
  const receitaBruta = repCards
    .filter((c) => VENDA_FASES.has(c.faseAtual || c.fase))
    .reduce((s, c) => s + c.valor, 0);

  const imposto = receitaBruta * IMPOSTO_PCT;
  const comissaoG4 = receitaBruta * COMISSAO_G4_PCT;
  const lucroLiquido =
    receitaBruta - imposto - comissaoG4 - custosOperacionais;

  return { receitaBruta, imposto, comissaoG4, custosOperacionais, lucroLiquido };
}

/** Custos e detalhe para a frente Lives (soma de saves + pedro por live no período) */
function buildLivesCustos(
  from: Date,
  to: Date,
  lives: G4LiveConfig[]
): { total: number; detalhe: G4CustoDetalhe[] } {
  const detalhe: G4CustoDetalhe[] = [];
  let total = 0;
  for (const live of lives) {
    const d = new Date(live.date);
    if (d >= from && d <= to) {
      const cost = live.saveCost + live.pedroCost;
      detalhe.push({ label: live.label, valor: cost });
      total += cost;
    }
  }
  return { total, detalhe };
}

/** Custos e detalhe para a frente Eventos */
function buildEventosCustos(
  from: Date,
  to: Date,
  eventos: G4EventoConfig[]
): { total: number; detalhe: G4CustoDetalhe[] } {
  const detalhe: G4CustoDetalhe[] = [];
  let total = 0;
  for (const evento of eventos) {
    const d = new Date(evento.date);
    if (d >= from && d <= to && evento.cost > 0) {
      detalhe.push({ label: evento.label, valor: evento.cost });
      total += evento.cost;
    }
  }
  return { total, detalhe };
}

/** Linhas por live (para tabela em LivesSection) */
function buildLivesRows(
  uniqueLiveCards: ModeloAtualCard[],
  from: Date,
  to: Date,
  lives: G4LiveConfig[]
): G4LiveRow[] {
  return lives
    .filter((live) => {
      const d = new Date(live.date);
      return d >= from && d <= to;
    })
    .map((live) => {
      const liveMs = new Date(live.date).getTime();
      const windowMs = live.captureWindowDays * 86_400_000;
      const leadsGerados = uniqueLiveCards.filter((c) => {
        const t = c.dataEntrada ? c.dataEntrada.getTime() : null;
        if (t === null) return false;
        return t >= liveMs && t <= liveMs + windowMs;
      }).length;
      return {
        label: live.label,
        date: live.date,
        saveCost: live.saveCost,
        pedroCost: live.pedroCost,
        totalCost: live.saveCost + live.pedroCost,
        leadsGerados,
      };
    });
}

/** Linhas por evento (para tabela em EventosSection) */
function buildEventosRows(
  uniqueEventoCards: ModeloAtualCard[],
  from: Date,
  to: Date,
  eventos: G4EventoConfig[]
): G4EventoRow[] {
  return eventos
    .filter((evento) => {
      const d = new Date(evento.date);
      return d >= from && d <= to;
    })
    .map((evento) => {
      const leadsGerados = uniqueEventoCards.filter((c) => {
        const match = matchEventoFromCard(c, eventos);
        return (
          match !== null &&
          match.date === evento.date &&
          match.label === evento.label
        );
      }).length;
      return {
        label: evento.label,
        date: evento.date,
        custo: evento.cost,
        leadsGerados,
      };
    });
}

// ── Hook principal ────────────────────────────────────────────────────────

export function useG4Analytics(dateRange: { from: Date; to: Date }): {
  analytics: G4Analytics;
  refetch: () => void;
} {
  const queryClient = useQueryClient();

  const { allCards, isLoading, error } = useModeloAtualAnalytics(
    dateRange.from,
    dateRange.to
  );

  // Invalida o cache do hook base para forçar nova busca
  const refetch = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["modelo-atual-analytics"] });
  }, [queryClient]);

  const analytics: G4Analytics = useMemo(() => {
    // Estado de loading ou sem dados
    if (isLoading || !allCards || allCards.length === 0) {
      return {
        loading: isLoading,
        error: error as Error | null,
        totalLeads: 0,
        totalPipe: 0,
        totalFaturado: 0,
        lives: emptyFrente("lives", "G4 Lives"),
        eventos: emptyFrente("eventos", "G4 Eventos"),
        seller: emptyFrente("seller", "G4 Seller"),
        unclassifiedCount: 0,
        unclassifiedCards: [],
      };
    }

    // ── Passo 1: Deduplica cards por ID ─────────────────────────────────
    // Mantém o movimento mais recente como representante do card
    // (faseAtual reflete o estado atual e é consistente entre movimentos)
    const cardRepMap = new Map<string, ModeloAtualCard>();
    const firstMovementByCard = new Map<string, ModeloAtualCard>();

    for (const card of allCards) {
      // Representante: mais recente
      const existing = cardRepMap.get(card.id);
      if (!existing || card.dataEntrada > existing.dataEntrada) {
        cardRepMap.set(card.id, card);
      }
      // Primeiro movimento: mais antigo (para lead time)
      const existingFirst = firstMovementByCard.get(card.id);
      if (!existingFirst || card.dataEntrada < existingFirst.dataEntrada) {
        firstMovementByCard.set(card.id, card);
      }
    }

    // ── Passo 2: Classifica cada card único na sua frente G4 ────────────
    const cardFrente = new Map<string, G4Frente>();
    for (const [cardId, repCard] of cardRepMap) {
      const frente = classifyG4Card(repCard, G4_LIVES, G4_EVENTOS);
      if (frente) cardFrente.set(cardId, frente);
    }

    // ── Passo 3: Agrupa representantes por frente ────────────────────────
    const repByFrente: Record<G4Frente, ModeloAtualCard[]> = {
      lives: [],
      eventos: [],
      seller: [],
    };
    for (const [cardId, frente] of cardFrente) {
      repByFrente[frente].push(cardRepMap.get(cardId)!);
    }

    const cardIdsByFrente: Record<G4Frente, Set<string>> = {
      lives: new Set(repByFrente.lives.map((c) => c.id)),
      eventos: new Set(repByFrente.eventos.map((c) => c.id)),
      seller: new Set(repByFrente.seller.map((c) => c.id)),
    };

    // ── Passo 4: Custos por frente ───────────────────────────────────────
    const { from, to } = dateRange;
    const livesCustos = buildLivesCustos(from, to, G4_LIVES);
    const eventosCustos = buildEventosCustos(from, to, G4_EVENTOS);

    // ── Passo 5: Monta métricas de cada frente ───────────────────────────
    const buildMetrics = (
      frente: G4Frente,
      label: string,
      custos: { total: number; detalhe: G4CustoDetalhe[] }
    ): G4FrenteMetrics => {
      const repCards = repByFrente[frente];
      const cardIds = cardIdsByFrente[frente];

      const funnel = buildFunnel(cardIds, allCards);
      const leadTimeMediaDias = buildLeadTimeMedio(cardIds, firstMovementByCard);
      const esteira = buildEsteira(repCards);
      const pipe = buildPipe(repCards);
      const dre = buildDre(repCards, custos.total);

      const livesRows =
        frente === "lives"
          ? buildLivesRows(repCards, from, to, G4_LIVES)
          : [];

      const eventosRows =
        frente === "eventos"
          ? buildEventosRows(repCards, from, to, G4_EVENTOS)
          : [];

      return {
        frente,
        label,
        cards: repCards,
        funnel,
        leadTimeMediaDias,
        esteira,
        pipe,
        dre,
        custosDetalhe: custos.detalhe,
        livesRows,
        eventosRows,
      };
    };

    const livesMetrics = buildMetrics("lives", "G4 Lives", livesCustos);
    const eventosMetrics = buildMetrics(
      "eventos",
      "G4 Eventos",
      eventosCustos
    );
    const sellerMetrics = buildMetrics("seller", "G4 Seller", {
      total: 0,
      detalhe: [],
    });

    // ── Passo 6: KPIs agregados ──────────────────────────────────────────
    const totalLeads =
      livesMetrics.cards.length +
      eventosMetrics.cards.length +
      sellerMetrics.cards.length;

    const totalPipe =
      livesMetrics.pipe.aberto +
      eventosMetrics.pipe.aberto +
      sellerMetrics.pipe.aberto;

    const totalFaturado =
      livesMetrics.dre.receitaBruta +
      eventosMetrics.dre.receitaBruta +
      sellerMetrics.dre.receitaBruta;

    return {
      loading: false,
      error: null,
      totalLeads,
      totalPipe,
      totalFaturado,
      lives: livesMetrics,
      eventos: eventosMetrics,
      seller: sellerMetrics,
    };
  }, [allCards, isLoading, error, dateRange.from, dateRange.to]); // eslint-disable-line react-hooks/exhaustive-deps

  return { analytics, refetch };
}
