import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { DetailItem } from '@/components/planning/indicators/DetailSheet';
import { MONETIZACAO_ORIGEM_SENTINEL } from '@/lib/leadSource';

export type MonetizacaoIndicatorType = 'mql' | 'rm' | 'rr' | 'proposta' | 'venda';

// Fases que contam como "Proposta enviada" no acelerômetro comercial (a partir do evento do mês, não Fase Atual)
const PROPOSTA_PHASES = new Set([
  'Proposta em Elaboração',
  'Proposta enviada / Follow Up',
]);

// Fases que contam como "Venda" (evento do mês)
const VENDA_PHASES = new Set([
  'Concluído',
]);

export const MONETIZACAO_FASES_ORDER = [
  'Start form',
  'Oportunidade Levantada',
  'Proposta em Elaboração',
  'Proposta enviada / Follow Up',
  'Aprovado pelo Cliente',
  'Jurídico',
  'Faturamento',
  'Concluído',
] as const;

export type MonetizacaoFase = typeof MONETIZACAO_FASES_ORDER[number];

const TIPO_LABEL_MAP: Record<string, string> = {
  'Upsell': 'Upsell',
  'Novo produto': 'Cross-sell',
  'Troca de produto': 'Troca de produto',
  'Downsell': 'Downsell',
};

// Classificação por substring — aceita variantes com/sem underscore (acentos removidos)
const isMrrField = (f: string) =>
  /cfoaas|_oxy|assessoria_?mrr|_bpo|coordenador_?financeiro/i.test(f);
const isSetupField = (f: string) => /setup/i.test(f);
const isPontualField = (f: string) => /diagn|turnaround|valuation/i.test(f);
const isEducacaoField = (f: string) => /educa/i.test(f);

const toNumber = (v: unknown): number => {
  if (v == null || v === '') return 0;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
};

// Detecta dinamicamente todas as colunas valor_* presentes nas linhas (evita hardcode
// de sufixos com/sem underscore de acento — valor_diagnostico vs valor_diagn_stico etc.)
const collectValorFields = (rows: any[]): string[] => {
  const set = new Set<string>();
  for (const r of rows) {
    if (!r || typeof r !== 'object') continue;
    for (const k of Object.keys(r)) {
      if (!k.startsWith('valor_')) continue;
      if (k === 'valor_mrr' || k === 'valor_total') continue; // agregados calculados
      set.add(k);
    }
  }
  return Array.from(set);
};


export interface MonetizacaoCard {
  id: string;
  titulo: string;
  cliente: string;
  produto: string;
  tipoRaw: string;
  tipo: string;
  faseAtual: string;
  entrada: string; // ISO — última movimentação dentro do período
  responsavel: string;
  motivoPerda: string;
  statusProposta: string;
  valorTotal: number;
  valores: Record<string, number>; // valores hidratados (max não nulo em todo histórico)
  mrr: number;
  setup: number;
  pontual: number;
  ganho: boolean;
  perdido: boolean;
  /** Fases que o card passou dentro do período */
  fasesNoPeriodo: string[];
}

interface MonetizacaoAnalytics {
  cards: MonetizacaoCard[];
  byFase: { fase: string; count: number; valor: number }[];
  byTipo: { tipo: string; count: number; valor: number }[];
  totals: {
    count: number;
    valorPipeline: number;
    valorGanho: number;
    ticketMedio: number;
  };
  toDetailItem: (card: MonetizacaoCard) => DetailItem;
  getDetailItemsForIndicator: (indicator: MonetizacaoIndicatorType) => DetailItem[];
  isLoading: boolean;
  error: unknown;
}

export function useMonetizacaoAnalytics(
  startDate: Date,
  endDate: Date,
): MonetizacaoAnalytics {
  const startIso = startDate.toISOString();
  const endIso = endDate.toISOString();

  const { data, isLoading, error } = useQuery({
    queryKey: ['monetizacao-analytics-v3', startIso, endIso],
    queryFn: async () => {
      // Etapa 1a: movimentos no período (para detectar Concluído no período)
      const periodPromise = supabase.functions.invoke('query-external-db', {
        body: {
          table: 'pipefy_moviment_contrato',
          action: 'query_period',
          startDate: startIso,
          endDate: endIso,
          limit: 5000,
          offset: 0,
        },
      });

      // Etapa 1b: pipeline aberto (fases != Concluído, sem motivo de perda) — sem filtro de período
      const openPromise = supabase.functions.invoke('query-external-db', {
        body: {
          table: 'pipefy_moviment_contrato',
          action: 'query_open_pipeline',
        },
      });

      const [{ data: periodResp, error: err1 }, { data: openResp, error: err2 }] =
        await Promise.all([periodPromise, openPromise]);
      if (err1) throw err1;
      if (err2) throw err2;

      const periodRows = (periodResp?.data ?? []) as any[];
      const openRows = (openResp?.data ?? []) as any[];

      // Etapa 2: hidrata valores buscando TODO o histórico da união de IDs
      const ids = Array.from(
        new Set(
          [...periodRows, ...openRows]
            .map((r) => String(r['ID'] ?? ''))
            .filter(Boolean),
        ),
      );
      if (ids.length === 0) return { periodRows, openRows, historyRows: [] as any[] };

      const { data: histResp, error: err3 } = await supabase.functions.invoke(
        'query-external-db',
        {
          body: {
            table: 'pipefy_moviment_contrato',
            action: 'query_card_history',
            cardIds: ids,
          },
        },
      );
      if (err3) throw err3;
      const historyRows = (histResp?.data ?? []) as any[];
      return { periodRows, openRows, historyRows };
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const periodRows = data?.periodRows ?? [];
  const openRows: any[] = data?.openRows ?? [];
  const historyRows = data?.historyRows ?? [];

  // Descobre dinamicamente quais colunas valor_* existem (com/sem underscore de acento)
  const valorFields = collectValorFields([...historyRows, ...periodRows]);
  if (valorFields.length > 0) {
    console.info('[Monetização] valor_* fields detectados:', valorFields);
  }

  // Agrupa histórico por ID para hidratar valores (pega o maior valor não-nulo em qualquer linha)
  const historyById = new Map<string, any[]>();
  for (const row of historyRows) {
    const id = String(row['ID'] ?? '');
    if (!id) continue;
    if (!historyById.has(id)) historyById.set(id, []);
    historyById.get(id)!.push(row);
  }

  // Agrupa movimentos do período por ID (para saber fases percorridas no mês e escolher linha "mais recente")
  const periodById = new Map<string, any[]>();
  for (const row of periodRows) {
    const id = String(row['ID'] ?? '');
    if (!id) continue;
    if (!periodById.has(id)) periodById.set(id, []);
    periodById.get(id)!.push(row);
  }

  const cards: MonetizacaoCard[] = Array.from(periodById.entries()).map(([id, periodRowsOfCard]) => {
    // Linha mais recente do período para dados descritivos (fase atual, responsável, tipo, etc.)
    const sorted = [...periodRowsOfCard].sort((a, b) => {
      const ta = a['Entrada'] ? new Date(a['Entrada']).getTime() : 0;
      const tb = b['Entrada'] ? new Date(b['Entrada']).getTime() : 0;
      return tb - ta;
    });
    const latest = sorted[0];

    // Fases que passaram no período (para classificação Proposta/Venda por evento)
    const fasesNoPeriodo = Array.from(
      new Set(periodRowsOfCard.map((r) => (r['Fase'] || '').toString().trim()).filter(Boolean)),
    );

    // Hidrata valores: usa TODO o histórico do card + as próprias linhas do período
    const hist = historyById.get(id) ?? periodRowsOfCard;
    const valores: Record<string, number> = {};
    let somaValorFieldsExEduca = 0; // Educação fica fora da soma padrão
    for (const f of valorFields) {
      let best = 0;
      for (const r of hist) {
        const v = toNumber(r[f]);
        if (v > best) best = v;
      }
      valores[f] = best;
      if (!isEducacaoField(f)) somaValorFieldsExEduca += best;
    }
    // Idem para `moeda` (agregado)
    let moedaMax = 0;
    for (const r of hist) {
      const v = toNumber(r['moeda']);
      if (v > moedaMax) moedaMax = v;
    }
    valores['moeda'] = moedaMax;

    // Valor total hidratado: prefere soma dos discriminativos (sem Educação), fallback para moeda
    const valorTotal = somaValorFieldsExEduca > 0 ? somaValorFieldsExEduca : moedaMax;

    // Classificação MRR / Setup / Pontual por matcher de substring
    let mrr = 0, setup = 0, pontual = 0;
    for (const f of valorFields) {
      const v = valores[f] || 0;
      if (v <= 0) continue;
      if (isEducacaoField(f)) continue; // excluída dos totais padrão
      if (isMrrField(f)) mrr += v;
      else if (isSetupField(f)) setup += v;
      else if (isPontualField(f)) pontual += v;
      else pontual += v; // desconhecido → Pontual por segurança
    }
    if (mrr === 0 && setup === 0 && pontual === 0 && moedaMax > 0) {
      pontual = moedaMax;
    }


    const tipoRaw = (latest['tipo_de_movimenta_o'] || '').toString().trim();
    const faseAtual = (latest['Fase Atual'] || latest['Fase'] || '').toString().trim();
    const motivoPerda = (latest['motivo_da_perda'] || '').toString().trim();
    const statusProposta = (latest['status_da_proposta'] || '').toString().trim();

    return {
      id,
      titulo: (latest['Título'] || '').toString(),
      cliente: (latest['cliente'] || '').toString(),
      produto: (latest['produto'] || '').toString(),
      tipoRaw,
      tipo: TIPO_LABEL_MAP[tipoRaw] || tipoRaw || '—',
      faseAtual,
      entrada: latest['Entrada'] || '',
      responsavel: (latest['respons_vel'] || '').toString(),
      motivoPerda,
      statusProposta,
      valorTotal,
      valores,
      mrr,
      setup,
      pontual,
      ganho: fasesNoPeriodo.some((f) => VENDA_PHASES.has(f)) || faseAtual === 'Concluído',
      perdido: !!motivoPerda,
      fasesNoPeriodo,
    };
  });

  // Agregação por fase (ordem canônica) — usa faseAtual
  const faseAgg = new Map<string, { count: number; valor: number }>();
  for (const f of MONETIZACAO_FASES_ORDER) faseAgg.set(f, { count: 0, valor: 0 });
  for (const c of cards) {
    const key = (MONETIZACAO_FASES_ORDER as readonly string[]).includes(c.faseAtual)
      ? c.faseAtual
      : c.faseAtual || '—';
    if (!faseAgg.has(key)) faseAgg.set(key, { count: 0, valor: 0 });
    const agg = faseAgg.get(key)!;
    agg.count += 1;
    agg.valor += c.valorTotal;
  }
  const byFase = Array.from(faseAgg.entries()).map(([fase, v]) => ({
    fase,
    count: v.count,
    valor: v.valor,
  }));

  const tipoAgg = new Map<string, { count: number; valor: number }>();
  for (const c of cards) {
    if (!tipoAgg.has(c.tipo)) tipoAgg.set(c.tipo, { count: 0, valor: 0 });
    const agg = tipoAgg.get(c.tipo)!;
    agg.count += 1;
    agg.valor += c.valorTotal;
  }
  const byTipo = Array.from(tipoAgg.entries())
    .map(([tipo, v]) => ({ tipo, count: v.count, valor: v.valor }))
    .sort((a, b) => b.valor - a.valor);

  const valorPipeline = cards.reduce((s, c) => s + c.valorTotal, 0);
  const valorGanho = cards.filter((c) => c.ganho).reduce((s, c) => s + c.valorTotal, 0);
  const ticketMedio = cards.length > 0 ? valorPipeline / cards.length : 0;

  const toDetailItem = (card: MonetizacaoCard): DetailItem => {
    const value = card.mrr + card.setup + card.pontual;
    return {
      id: card.id,
      name: card.titulo || card.id,
      phase: card.faseAtual,
      date: card.entrada,
      value,
      total: value,
      mrr: card.mrr,
      setup: card.setup,
      pontual: card.pontual,
      responsible: card.responsavel,
      reason: card.motivoPerda || undefined,
      product: card.tipo,
      bu: 'Monetização',
      tipoOrigem: MONETIZACAO_ORIGEM_SENTINEL,
    };
  };

  // Classificação Proposta/Venda por evento do mês (fasesNoPeriodo), não pela Fase Atual.
  const getDetailItemsForIndicator = (
    indicator: MonetizacaoIndicatorType,
  ): DetailItem[] => {
    if (indicator !== 'proposta' && indicator !== 'venda') return [];
    const target = indicator === 'venda' ? VENDA_PHASES : PROPOSTA_PHASES;
    return cards
      .filter((c) => c.fasesNoPeriodo.some((f) => target.has(f)))
      .map(toDetailItem);
  };

  return {
    cards,
    byFase,
    byTipo,
    totals: {
      count: cards.length,
      valorPipeline,
      valorGanho,
      ticketMedio,
    },
    toDetailItem,
    getDetailItemsForIndicator,
    isLoading,
    error,
  };
}
