import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { DetailItem } from '@/components/planning/indicators/DetailSheet';
import { MONETIZACAO_ORIGEM_SENTINEL } from '@/lib/leadSource';
import { isJunkCard } from '@/hooks/useModeloAtualMetas';

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
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;

  let s = String(v).trim();
  if (!s) return 0;

  s = s.replace(/\s+/g, '').replace(/[^\d,.-]/g, '');
  if (!s || s === '-' || s === ',' || s === '.') return 0;

  const dotCount = (s.match(/\./g) ?? []).length;
  const hasComma = s.includes(',');

  if (hasComma) {
    // Formato BR: 5.200,00 → 5200.00
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (dotCount > 1) {
    // 1.234.567 → 1234567
    s = s.replace(/\./g, '');
  } else if (dotCount === 1) {
    const [before, after] = s.split('.');
    // 2.300 normalmente é milhar no Pipefy/textos brasileiros; 2300.00 permanece decimal.
    if (before.length <= 3 && after?.length === 3) s = `${before}${after}`;
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

const normalizeValorFieldKey = (field: string) => field.replace(/_\d+$/, '');

// Detecta dinamicamente as colunas valor_* presentes e normaliza duplicatas do Pipefy
// (ex.: valor_cfoaas e valor_cfoaas_1 representam o mesmo tipo de valor).
const collectValorFields = (rows: any[]): string[] => {
  const set = new Set<string>();
  for (const r of rows) {
    if (!r || typeof r !== 'object') continue;
    for (const k of Object.keys(r)) {
      if (!k.startsWith('valor_')) continue;
      if (k === 'valor_mrr' || k === 'valor_total') continue; // agregados calculados
      set.add(normalizeValorFieldKey(k));
    }
  }
  return Array.from(set);
};

const TEXT_VALUE_FIELDS = [
  'forma_de_pagamento',
  'condi_es_de_pagamento',
  'detalhes_sobre_a_proposta',
  'escopo_aprovado_pelo_cliente',
  'descri_o_da_oportunidade',
  'observa_es_da_triagem',
];

const extractTextualValues = (rows: any[]) => {
  let mrr = 0;
  let setup = 0;
  let pontual = 0;

  for (const row of rows) {
    for (const field of TEXT_VALUE_FIELDS) {
      const text = String(row?.[field] ?? '');
      if (!text) continue;

      const amountRegex = /R\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?|\d+(?:[,.]\d{2})?)/gi;
      let match: RegExpExecArray | null;
      while ((match = amountRegex.exec(text)) !== null) {
        const amount = toNumber(match[1]);
        if (amount <= 0) continue;

        const context = text.slice(Math.max(0, match.index - 90), match.index).toLowerCase();
        if (/\d+\s*x\s*de\s*$|parcela[s]?\s+de\s*$/.test(context)) continue;
        if (/setup|implanta[cç][aã]o|onboarding/.test(context)) {
          setup = Math.max(setup, amount);
        } else if (/mrr|fee\s*mensal|mensalidade|valor\s*mensal|recorrente|coordenador\s*financeiro|cfo|bpo|assessoria/.test(context)) {
          mrr = Math.max(mrr, amount);
        } else {
          pontual = Math.max(pontual, amount);
        }
      }
    }
  }

  return { mrr, setup, pontual, total: mrr + setup + pontual };
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
  dataCriacao: string; // ISO — criação do card
  dataAssinatura: string; // ISO — data de assinatura/faturamento (quando ganho)
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
  bu?: string;
  tipoOrigem?: string;
  tipoMovimentacao?: string;
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
    queryKey: ['monetizacao-analytics-v4', startIso, endIso],
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
  const valorFields = collectValorFields([...historyRows, ...periodRows, ...openRows]);
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

  // Agrupa movimentos do período por ID (para saber fases percorridas no mês)
  const periodById = new Map<string, any[]>();
  for (const row of periodRows) {
    const id = String(row['ID'] ?? '');
    if (!id) continue;
    if (!periodById.has(id)) periodById.set(id, []);
    periodById.get(id)!.push(row);
  }

  // Pipeline aberto (estado atual) por ID — 1 linha por card (DISTINCT ON no edge)
  const openById = new Map<string, any>();
  for (const row of openRows) {
    const id = String(row['ID'] ?? '');
    if (!id) continue;
    openById.set(id, row);
  }

  const normFase = (s: string) => (s || '').toString().trim();
  const isConcluido = (s: string) => /^conclu[ií]do$/i.test(normFase(s));

  // IDs que fecharam DENTRO do período (têm Fase = Concluído em alguma linha do período,
  // ou cuja Fase Atual mais recente no período é Concluído)
  const closedInPeriodIds = new Set<string>();
  for (const [id, rows] of periodById.entries()) {
    const anyClosed = rows.some(
      (r) => isConcluido(r['Fase']) || isConcluido(r['Fase Atual']),
    );
    if (anyClosed) closedInPeriodIds.add(id);
  }

  // Universo final: pipeline aberto (todos) + cards fechados no período
  const allIds = new Set<string>([...openById.keys(), ...closedInPeriodIds]);

  const cards: MonetizacaoCard[] = Array.from(allIds).map((id) => {
    const periodRowsOfCard = periodById.get(id) ?? [];
    const openRow = openById.get(id);
    const isClosedInPeriod = closedInPeriodIds.has(id);

    // Linha descritiva "latest":
    // - Se o card fechou no período → usa a linha mais recente do período (fase = Concluído)
    // - Senão → usa a linha do pipeline aberto (estado atual)
    let latest: any;
    if (isClosedInPeriod) {
      const sorted = [...periodRowsOfCard].sort((a, b) => {
        const ta = a['Entrada'] ? new Date(a['Entrada']).getTime() : 0;
        const tb = b['Entrada'] ? new Date(b['Entrada']).getTime() : 0;
        return tb - ta;
      });
      latest = sorted[0] ?? openRow ?? {};
    } else {
      latest = openRow ?? periodRowsOfCard[0] ?? {};
    }

    // Fases percorridas no período (para classificação Proposta/Venda por evento)
    const fasesNoPeriodo = Array.from(
      new Set(periodRowsOfCard.map((r) => normFase(r['Fase'])).filter(Boolean)),
    );

    // Hidrata valores: histórico + período + linha aberta
    const hist = historyById.get(id) ?? [...periodRowsOfCard, ...(openRow ? [openRow] : [])];
    const valores: Record<string, number> = {};
    let somaValorFieldsExEduca = 0;
    for (const f of valorFields) {
      let best = 0;
      for (const r of hist) {
        for (const [key, rawValue] of Object.entries(r ?? {})) {
          if (!key.startsWith('valor_')) continue;
          if (normalizeValorFieldKey(key) !== f) continue;
          const v = toNumber(rawValue);
          if (v > best) best = v;
        }
      }
      valores[f] = best;
      if (!isEducacaoField(f)) somaValorFieldsExEduca += best;
    }
    let moedaMax = 0;
    for (const r of hist) {
      const v = toNumber(r['moeda']);
      if (v > moedaMax) moedaMax = v;
    }
    valores['moeda'] = moedaMax;

    let valorTotal = somaValorFieldsExEduca > 0 ? somaValorFieldsExEduca : moedaMax;

    let mrr = 0, setup = 0, pontual = 0;
    for (const f of valorFields) {
      const v = valores[f] || 0;
      if (v <= 0) continue;
      if (isEducacaoField(f)) continue;
      if (isMrrField(f)) mrr += v;
      else if (isSetupField(f)) setup += v;
      else if (isPontualField(f)) pontual += v;
      else pontual += v;
    }
    if (mrr === 0 && setup === 0 && pontual === 0 && moedaMax > 0) {
      pontual = moedaMax;
    }

    // Alguns cards abertos recém-incluídos ainda não têm valor_* preenchido, mas trazem
    // o valor em texto de pagamento/proposta. Usa somente como fallback para não alterar
    // cards com valor estruturado.
    if (valorTotal === 0) {
      const textual = extractTextualValues(hist);
      if (textual.total > 0) {
        mrr = textual.mrr;
        setup = textual.setup;
        pontual = textual.pontual;
        valorTotal = textual.total;
        valores.valor_texto_extraido = textual.total;
      }
    }

    const tipoRaw = (latest['tipo_de_movimenta_o'] || '').toString().trim();
    const faseAtualRaw = (latest['Fase Atual'] || latest['Fase'] || '').toString().trim();
    // Se fechou no período, força fase "Concluído" para agregar corretamente no mini-funil.
    const faseAtual = isClosedInPeriod ? 'Concluído' : faseAtualRaw;
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
      dataCriacao: (latest['Data Criação'] || '').toString(),
      dataAssinatura: isClosedInPeriod
        ? (latest['data_de_faturamento_1'] || latest['data_de_faturamento'] || latest['Entrada'] || '').toString()
        : '',
      responsavel: (latest['respons_vel'] || '').toString(),
      motivoPerda,
      statusProposta,
      valorTotal,
      valores,
      mrr,
      setup,
      pontual,
      ganho: isClosedInPeriod,
      perdido: !!motivoPerda,
      fasesNoPeriodo,
      // Sinais redundantes para o classificador de origem (leadSource.ts)
      // caso o card seja iterado sem passar pelo toDetailItem.
      bu: 'Monetização',
      tipoOrigem: MONETIZACAO_ORIGEM_SENTINEL,
      tipoMovimentacao: TIPO_LABEL_MAP[tipoRaw] || tipoRaw || '',
    } as MonetizacaoCard;
  }).filter((c) => !isJunkCard({ id: c.id, titulo: c.titulo, empresa: c.cliente }));

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

  // valorPipeline = cards em fases abertas (não concluídos no período)
  // valorGanho = cards concluídos no período
  const openCards = cards.filter((c) => !c.ganho);
  const valorPipeline = openCards.reduce((s, c) => s + c.valorTotal, 0);
  const valorGanho = cards.filter((c) => c.ganho).reduce((s, c) => s + c.valorTotal, 0);
  const ticketMedio = cards.length > 0 ? (valorPipeline + valorGanho) / cards.length : 0;

  // Closer virtual: como estes cards vêm do pipe de Monetização e não possuem
  // um Closer atribuído no mesmo padrão dos demais BUs, agrupamos todos sob
  // "Monetização Geral" para que apareçam no filtro/ranking do Pace Comercial
  // (evita o gap entre Consolidado e Modelo Atual).
  const MONETIZACAO_CLOSER_VIRTUAL = 'Monetização Geral';
  const toDetailItem = (card: MonetizacaoCard): DetailItem => {
    const value = card.mrr + card.setup + card.pontual;
    return {
      id: card.id,
      name: card.titulo || card.id,
      company: card.titulo || card.cliente || card.id,
      phase: card.faseAtual,
      date: card.entrada,
      dataCriacao: card.dataCriacao || undefined,
      dataAssinatura: card.dataAssinatura || undefined,
      value,
      total: value,
      mrr: card.mrr,
      setup: card.setup,
      pontual: card.pontual,
      responsible: card.responsavel || MONETIZACAO_CLOSER_VIRTUAL,
      closer: MONETIZACAO_CLOSER_VIRTUAL,
      reason: card.motivoPerda || undefined,
      product: card.tipo,
      bu: 'Monetização',
      tipoOrigem: MONETIZACAO_ORIGEM_SENTINEL,
    };
  };

  // Classificação Proposta/Venda por evento do mês (fasesNoPeriodo), não pela Fase Atual.
  // Regra: Downsell e Troca de produto = churn/queda de receita de cliente da base →
  // NÃO contam como venda (nova receita). Apenas Upsell e Cross-sell entram em venda.
  const VENDA_TIPOS_PERMITIDOS = new Set(['Upsell', 'Cross-sell']);
  const getDetailItemsForIndicator = (
    indicator: MonetizacaoIndicatorType,
  ): DetailItem[] => {
    if (indicator !== 'proposta' && indicator !== 'venda') return [];
    const target = indicator === 'venda' ? VENDA_PHASES : PROPOSTA_PHASES;
    return cards
      .filter((c) => c.fasesNoPeriodo.some((f) => target.has(f)))
      .filter((c) => indicator !== 'venda' || VENDA_TIPOS_PERMITIDOS.has(c.tipo))
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
