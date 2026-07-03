import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { DetailItem } from '@/components/planning/indicators/DetailSheet';
import { MONETIZACAO_ORIGEM_SENTINEL } from '@/lib/leadSource';

export type MonetizacaoIndicatorType = 'mql' | 'rm' | 'rr' | 'proposta' | 'venda';

// Fases do pipe Monetização que contam como "Proposta enviada" no acelerômetro comercial
const PROPOSTA_PHASES = new Set([
  'Proposta em Elaboração',
  'Proposta enviada / Follow Up',
]);

// Fases do pipe Monetização que contam como "Venda" no acelerômetro comercial
// Regra: ganho/venda APENAS quando o card chega em Concluído.
const VENDA_PHASES = new Set([
  'Concluído',
]);

function mapFaseToIndicator(fase: string): MonetizacaoIndicatorType | null {
  if (VENDA_PHASES.has(fase)) return 'venda';
  if (PROPOSTA_PHASES.has(fase)) return 'proposta';
  return null;
}



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

// Mapeia o campo bruto "tipo_de_movimenta_o" para os labels exibidos no dash.
// Mantemos o original também para o caso de chegar um valor novo.
const TIPO_LABEL_MAP: Record<string, string> = {
  'Upsell': 'Upsell',
  'Novo produto': 'Cross-sell',
  'Troca de produto': 'Troca de produto',
  'Downsell': 'Downsell',
};

const VALOR_FIELDS = [
  'valor_cfoaas',
  'valor_setup',
  'valor_oxy',
  'valor_diagn_stico',
  'valor_turnaround',
  'valor_valuation',
  'valor_assessoria_mrr',
  'valor_bpo',
  'valor_coordenador_financeiro',
  'valor_educa_o',
] as const;

const toNumber = (v: unknown): number => {
  if (v == null || v === '') return 0;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
};

export interface MonetizacaoCard {
  id: string;
  titulo: string;
  cliente: string;
  produto: string;
  tipoRaw: string;
  tipo: string; // label normalizado para exibição
  faseAtual: string;
  entrada: string; // ISO
  responsavel: string;
  motivoPerda: string;
  statusProposta: string;
  valorTotal: number;
  valores: Record<string, number>;
  ganho: boolean;
  perdido: boolean;
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
    queryKey: ['monetizacao-analytics', startIso, endIso],
    queryFn: async () => {
      const { data: resp, error: err } = await supabase.functions.invoke(
        'query-external-db',
        {
          body: {
            table: 'pipefy_moviment_contrato',
            action: 'query_period',
            startDate: startIso,
            endDate: endIso,
            limit: 5000,
            offset: 0,
          },
        },
      );
      if (err) throw err;
      return (resp?.data ?? []) as any[];
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const rows = data ?? [];

  // Dedup por ID — mantém o movimento mais recente por Entrada
  const byId = new Map<string, any>();
  for (const row of rows) {
    const id = String(row['ID'] ?? '');
    if (!id) continue;
    const prev = byId.get(id);
    const entradaCurr = row['Entrada'] ? new Date(row['Entrada']).getTime() : 0;
    const entradaPrev = prev?.['Entrada'] ? new Date(prev['Entrada']).getTime() : -1;
    if (!prev || entradaCurr > entradaPrev) byId.set(id, row);
  }

  const cards: MonetizacaoCard[] = Array.from(byId.values()).map((row) => {
    const valores: Record<string, number> = {};
    let somaValorFields = 0;
    for (const f of VALOR_FIELDS) {
      const v = toNumber(row[f]);
      valores[f] = v;
      somaValorFields += v;
    }
    const moeda = toNumber(row['moeda']);
    valores['moeda'] = moeda;
    // Fallback: cards vindos só com o agregado `moeda` (sem discriminação em valor_*)
    const valorTotal = somaValorFields > 0 ? somaValorFields : moeda;
    const tipoRaw = (row['tipo_de_movimenta_o'] || '').toString().trim();
    const faseAtual = (row['Fase Atual'] || row['Fase'] || '').toString().trim();
    const motivoPerda = (row['motivo_da_perda'] || '').toString().trim();
    const statusProposta = (row['status_da_proposta'] || '').toString().trim();
    return {
      id: String(row['ID'] ?? ''),
      titulo: (row['Título'] || '').toString(),
      cliente: (row['cliente'] || '').toString(),
      produto: (row['produto'] || '').toString(),
      tipoRaw,
      tipo: TIPO_LABEL_MAP[tipoRaw] || tipoRaw || '—',
      faseAtual,
      entrada: row['Entrada'] || '',
      responsavel: (row['respons_vel'] || '').toString(),
      motivoPerda,
      statusProposta,
      valorTotal,
      valores,
      ganho: faseAtual === 'Concluído',
      perdido: !!motivoPerda,
    };
  });

  // Agregação por fase (ordem canônica)
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

  // Agregação por tipo
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
    const mrr =
      (card.valores['valor_cfoaas'] || 0) +
      (card.valores['valor_oxy'] || 0) +
      (card.valores['valor_assessoria_mrr'] || 0) +
      (card.valores['valor_bpo'] || 0) +
      (card.valores['valor_coordenador_financeiro'] || 0);
    const setup = card.valores['valor_setup'] || 0;
    const pontual =
      (card.valores['valor_diagn_stico'] || 0) +
      (card.valores['valor_turnaround'] || 0) +
      (card.valores['valor_valuation'] || 0);
    const value = mrr + setup + pontual;
    return {
      id: card.id,
      name: card.titulo || card.id,
      phase: card.faseAtual,
      date: card.entrada,
      value,
      total: value,
      mrr,
      setup,
      pontual,
      responsible: card.responsavel,
      reason: card.motivoPerda || undefined,
      product: card.tipo,
      bu: 'Monetização',
      tipoOrigem: MONETIZACAO_ORIGEM_SENTINEL,
    };
  };

  // Mapeia cards para itens de drill-down do acelerômetro comercial
  // (Proposta / Venda). MQL / RM / RR não existem nesse pipe.
  const getDetailItemsForIndicator = (
    indicator: MonetizacaoIndicatorType,
  ): DetailItem[] => {
    if (indicator !== 'proposta' && indicator !== 'venda') return [];
    return cards
      .filter((c) => mapFaseToIndicator(c.faseAtual) === indicator)
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
