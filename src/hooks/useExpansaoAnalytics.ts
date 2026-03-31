import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DetailItem } from "@/components/planning/indicators/DetailSheet";
import { IndicatorType } from "@/hooks/useFunnelRealized";
import { fixPossibleDateInversion } from "./dateUtils";

export interface ExpansaoCard {
  id: string;
  titulo: string;
  fase: string;
  faseAtual: string;
  dataEntrada: Date;
  dataSaida: Date | null;
  dataCriacao: Date | null;
  valor: number;
  taxaFranquia: number;
  valorMRR: number;
  valorPontual: number;
  valorSetup: number;
  produto: string;
  responsavel: string | null;
  sdr: string | null;
  closer: string | null;
  motivoPerda: string | null;
  duracao: number;
  // Marketing attribution fields
  campanha?: string;
  conjuntoGrupo?: string;
  palavraChaveAnuncio?: string;
  fonte?: string;
  origemLead?: string;
  tipoOrigem?: string;
  paginaOrigem?: string;
  posicionamento?: string;
  fbclid?: string;
  gclid?: string;
  investimentoDisponivel?: string;
}

// Faixas de investimento que qualificam como MQL por produto
const FRANQUIA_MQL_TIERS = [
  'Menos de 140 mil reais', 'Menos de 250 mil reais', 'Menos de 360 mil reais',
  'Menos de 400 mil reais', 'Menos de 500 mil reais', 'Mais de 500 mil reais',
];
const OXY_HACKER_MQL_TIERS = [
  'Menos de  54 mil reais', 'Menos de 100 mil reais', 'Menos de 140 mil reais',
  'Menos de 250 mil reais', 'Menos de 360 mil reais', 'Menos de 400 mil reais',
  'Menos de 500 mil reais', 'Mais de 500 mil reais',
];

function isExpansaoMqlQualified(investimento: string | undefined, produto: string): boolean {
  if (!investimento) return false;
  const tiers = produto === 'Franquia' ? FRANQUIA_MQL_TIERS : OXY_HACKER_MQL_TIERS;
  return tiers.includes(investimento);
}

// Map Pipefy phase names to indicator keys
const PHASE_TO_INDICATOR: Record<string, IndicatorType> = {
  'Start form': 'leads',
  'Lead': 'leads',
  'MQL': 'mql',
  'Tentativas de contato': 'leads',
  'Reunião agendada / Qualificado': 'rm',
  'Reunião Realizada': 'rr',
  'Proposta enviada / Follow Up': 'proposta',
  'Contrato assinado': 'venda',
  'Ganho': 'venda',
};

// Map indicator to phase display name
const INDICATOR_TO_DISPLAY: Record<IndicatorType, string> = {
  'leads': 'Leads',
  'mql': 'MQL',
  'rm': 'RM',
  'rr': 'RR',
  'proposta': 'Proposta',
  'venda': 'Ganho',
};

// Map phase to display name
const PHASE_DISPLAY_MAP: Record<string, string> = {
  'Start form': 'Lead',
  'MQL': 'MQL',
  'Reunião agendada / Qualificado': 'RM',
  'Reunião Realizada': 'RR',
  'Proposta enviada / Follow Up': 'Proposta',
  'Enviar para assinatura': 'Assinatura',
  'Contrato assinado': 'Contrato Assinado',
  'Ganho': 'Ganho',
  'Perdido': 'Perdido',
  'Arquivado': 'Arquivado',
};

function parseDate(dateValue: string | null): Date | null {
  if (!dateValue) return null;
  const date = new Date(dateValue);
  return isNaN(date.getTime()) ? null : date;
}

// Parse date-only (YYYY-MM-DD) to avoid timezone shift
function parseDateOnly(dateValue: string | null): Date | null {
  if (!dateValue) return null;
  const match = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return parseDate(dateValue);
  const [, y, m, d] = match;
  return new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0);
}

function parseRawCard(row: any, defaultTicket: number): ExpansaoCard {
  const id = String(row.ID);
  let dataEntrada = parseDate(row['Entrada']) || new Date();
  const dataSaida = parseDate(row['Saída']);
  const fase = row['Fase'] || '';
  const dataAssinatura = parseDateOnly(row['Data de assinatura do contrato']);
  if (fase === 'Contrato assinado' && dataAssinatura) {
    dataEntrada = fixPossibleDateInversion(dataAssinatura, dataEntrada);
  }
  
  // Calculate duration dynamically
  let duracao = 0;
  if (dataSaida) {
    duracao = Math.floor((dataSaida.getTime() - dataEntrada.getTime()) / 1000);
  } else {
    duracao = Math.floor((Date.now() - dataEntrada.getTime()) / 1000);
  }
  
  const taxaFranquia = row['Taxa de franquia'] ? parseFloat(row['Taxa de franquia']) : 0;
  const valorMRR = row['Valor MRR'] ? parseFloat(row['Valor MRR']) : 0;
  const valorPontual = row['Valor Pontual'] ? parseFloat(row['Valor Pontual']) : 0;
  const valorSetup = row['Valor Setup'] ? parseFloat(row['Valor Setup']) : 0;
  
  // Calculate value: prioritize taxaFranquia, then sum of other values, then defaultTicket
  let valor = taxaFranquia;
  if (valor <= 0) {
    const sumValues = valorPontual + valorSetup + valorMRR;
    valor = sumValues > 0 ? sumValues : defaultTicket;
  }
  
  return {
    id,
    titulo: row['Título'] || '',
    fase: row['Fase'] || '',
    faseAtual: row['Fase Atual'] || '',
    dataEntrada,
    dataSaida,
    dataCriacao: parseDate(row['Data Criação']),
    valor,
    taxaFranquia,
    valorMRR,
    valorPontual,
    valorSetup,
    produto: row['Produtos'] || '',
    responsavel: row['Closer responsável'] || row['SDR responsável'] || null,
    sdr: row['SDR responsável'] || null,
    closer: row['Closer responsável'] || null,
    motivoPerda: row['Motivo da perda'] || null,
    duracao,
    // Marketing attribution
    campanha: row['Campanha'] || undefined,
    conjuntoGrupo: row['Conjunto/grupo'] || undefined,
    palavraChaveAnuncio: row['Palavra-chave/anúncio'] || undefined,
    fonte: row['Fonte'] || undefined,
    origemLead: row['Origem do lead'] || undefined,
    tipoOrigem: row['Tipo de Origem do lead'] || undefined,
    paginaOrigem: row['Página de origem'] || undefined,
    posicionamento: row['Posicionamento'] || undefined,
    fbclid: row['fbclid'] || undefined,
    gclid: row['gclid'] || undefined,
    investimentoDisponivel: row['Investimento disponível'] || undefined,
  };
}

export function useExpansaoAnalytics(startDate: Date, endDate: Date, produto: 'Franquia' | 'Oxy Hacker' = 'Franquia') {
  const startDateStr = useMemo(() => startDate.toISOString().split('T')[0], [startDate.getTime()]);
  const endDateStr = useMemo(() => endDate.toISOString().split('T')[0], [endDate.getTime()]);
  
  const startTime = useMemo(() => 
    new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime(), 
    [startDate.getTime()]
  );
  const endTime = useMemo(() => 
    new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999).getTime(), 
    [endDate.getTime()]
  );

  const defaultTicket = produto === 'Franquia' ? 0 : 54000;

  const { data, isLoading, error } = useQuery({
    queryKey: ['expansao-movements-analytics', produto, startDateStr, endDateStr],
    queryFn: async () => {
      // Step 1: Fetch movements in the selected period
      // Parallel queries: by entry date AND by signature date
      const [periodRes, signatureRes] = await Promise.all([
        supabase.functions.invoke('query-external-db', {
          body: { 
            table: 'pipefy_cards_movements_expansao', 
            action: 'query_period',
            startDate: `${startDateStr}T00:00:00`,
            endDate: `${endDateStr}T23:59:59`,
            limit: 10000 
          }
        }),
        supabase.functions.invoke('query-external-db', {
          body: { 
            table: 'pipefy_cards_movements_expansao', 
            action: 'query_period_by_signature',
            startDate: `${startDateStr}T00:00:00`,
            endDate: `${endDateStr}T23:59:59`,
            limit: 10000 
          }
        }),
      ]);

      if (periodRes.error) {
        console.error(`Error fetching ${produto} analytics:`, periodRes.error);
        throw periodRes.error;
      }

      // Merge and deduplicate by ID + Fase
      const allRows = [
        ...(periodRes.data?.data || []),
        ...(signatureRes.data?.data || []),
      ];
      const seen = new Set<string>();
      const cards: ExpansaoCard[] = [];
      for (const row of allRows) {
        const rowProduto = row['Produtos'] || '';
        if (rowProduto !== produto) continue;
        const key = `${row['ID']}_${row['Fase']}_${row['Entrada']}`;
        if (seen.has(key)) continue;
        seen.add(key);
        cards.push(parseRawCard(row, defaultTicket));
      }

      console.log(`[${produto} Analytics] Period query returned ${cards.length} movements`);

      // Step 2: Get unique card IDs from period
      const uniqueCardIds = [...new Set(cards.map(c => c.id))];
      
      // Step 3: Fetch full history for these cards
      let fullHistory: ExpansaoCard[] = [];
      if (uniqueCardIds.length > 0) {
        const { data: historyData, error: historyError } = await supabase.functions.invoke('query-external-db', {
          body: { 
            table: 'pipefy_cards_movements_expansao', 
            action: 'query_card_history',
            cardIds: uniqueCardIds
          }
        });
        
        if (!historyError && historyData?.data) {
          // Filter history by product too
          for (const row of historyData.data) {
            const rowProduto = row['Produtos'] || '';
            if (rowProduto !== produto) continue;
            fullHistory.push(parseRawCard(row, defaultTicket));
          }
          console.log(`[${produto} Analytics] Full history: ${fullHistory.length} movements for ${uniqueCardIds.length} cards`);
        }
      }

      return { cards, fullHistory };
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const cards = data?.cards ?? [];
  const fullHistory = data?.fullHistory ?? [];

  // Build a map of FIRST entry per card+indicator+calendar_month (monthly dedup)
  // Key: `cardId__indicator__YYYY-MM` → earliest ExpansaoCard in that month
  const monthlyFirstEntries = useMemo(() => {
    const entries = new Map<string, ExpansaoCard>();
    const historyToUse = fullHistory.length > 0 ? fullHistory : cards;
    
    for (const card of historyToUse) {
      const indicator = PHASE_TO_INDICATOR[card.fase];
      if (!indicator) continue;
      
      const monthKey = `${card.dataEntrada.getFullYear()}-${String(card.dataEntrada.getMonth() + 1).padStart(2, '0')}`;
      const dedupKey = `${card.id}__${indicator}__${monthKey}`;
      
      const existing = entries.get(dedupKey);
      // Keep the EARLIEST entry for this card+indicator within this calendar month
      if (!existing || card.dataEntrada < existing.dataEntrada) {
        entries.set(dedupKey, card);
      }
    }
    
    console.log(`[${produto} Analytics] Built monthly dedup map with ${entries.size} entries`);
    return entries;
  }, [cards, fullHistory, produto]);

  // Get cards for a specific indicator (EVERY ENTRY logic)
  // Counts every movement whose phase matches the indicator and dataEntrada is in the period
  // Build investimento map per card
  const cardInvestimentoMap = useMemo(() => {
    const map = new Map<string, string | undefined>();
    const allMovements = [...cards, ...(fullHistory.length > 0 ? fullHistory : [])];
    for (const card of allMovements) {
      if (card.investimentoDisponivel && !map.has(card.id)) {
        map.set(card.id, card.investimentoDisponivel);
      }
    }
    return map;
  }, [cards, fullHistory]);

  const getCardsForIndicator = useMemo(() => {
    return (indicator: IndicatorType): ExpansaoCard[] => {
      const allMovements = [...cards, ...(fullHistory.length > 0 ? fullHistory : [])];
      const seenKeys = new Set<string>();
      const result: ExpansaoCard[] = [];

      if (indicator === 'leads') {
        // Leads: cards com fase 'leads' (Start form, Lead, Tentativas de contato)
        // Funil cumulativo - inclui cards que avancaram alem de leads
        const indicatorsToCheck: IndicatorType[] = ['leads', 'mql', 'rm', 'rr', 'proposta', 'venda'];
        const seenCardIds = new Set<string>();

        for (const card of allMovements) {
          const cardIndicator = PHASE_TO_INDICATOR[card.fase];
          if (!cardIndicator || !indicatorsToCheck.includes(cardIndicator)) continue;

          const entryTime = card.dataEntrada.getTime();
          if (entryTime >= startTime && entryTime <= endTime) {
            // Para leads: dedup por card ID (cada card conta 1x)
            if (!seenCardIds.has(card.id)) {
              seenCardIds.add(card.id);
              result.push(card);
            }
          }
        }
      } else if (indicator === 'mql') {
        // MQL: cards com fase Lead/MQL que tem investimento qualificado
        // Dedup por card ID (cada card conta 1x)
        const seenCardIds = new Set<string>();

        for (const card of allMovements) {
          if (card.fase !== 'Lead' && card.fase !== 'MQL') continue;

          const entryTime = card.dataEntrada.getTime();
          if (entryTime >= startTime && entryTime <= endTime) {
            if (!seenCardIds.has(card.id)) {
              const inv = cardInvestimentoMap.get(card.id);
              if (isExpansaoMqlQualified(inv, produto)) {
                seenCardIds.add(card.id);
                result.push(card);
              }
            }
          }
        }
      } else {
        // rm, rr, proposta, venda: monthly dedup — first entry per card+indicator+month
        const seenCardIds = new Set<string>();
        for (const [dedupKey, entry] of monthlyFirstEntries) {
          const parts = dedupKey.split('__');
          const entryIndicator = parts[1] as IndicatorType;
          if (entryIndicator !== indicator) continue;

          const entryTime = entry.dataEntrada.getTime();
          if (entryTime >= startTime && entryTime <= endTime) {
            const cardId = parts[0];
            if (!seenCardIds.has(cardId)) {
              seenCardIds.add(cardId);
              result.push(entry);
            }
          }
        }
      }

      return result;
    };
  }, [cards, fullHistory, cardInvestimentoMap, monthlyFirstEntries, startTime, endTime, produto]);

  // Helper function to convert ExpansaoCard to DetailItem
  const toDetailItem = (card: ExpansaoCard): DetailItem => ({
    id: card.id,
    name: card.titulo,
    company: card.titulo,
    phase: PHASE_DISPLAY_MAP[card.faseAtual] || card.faseAtual,
    date: card.dataEntrada.toISOString(),
    value: card.valor,
    reason: card.motivoPerda || undefined,
    responsible: card.responsavel || undefined,
    sdr: card.sdr || undefined,
    closer: card.closer || undefined,
    duration: card.duracao,
    product: card.produto, // Franquia or Oxy Hacker
    mrr: card.valorMRR,
    setup: card.valorSetup,
    pontual: card.taxaFranquia > 0 
      ? card.taxaFranquia 
      : card.valorPontual > 0 
        ? card.valorPontual 
        : (card.produto === 'Franquia' ? 140000 : 54000),
  });

  // Get detail items for an indicator (uses same FIRST ENTRY logic)
  const getDetailItemsForIndicator = useMemo(() => {
    return (indicator: IndicatorType): DetailItem[] => {
      const indicatorCards = getCardsForIndicator(indicator);
      return indicatorCards.map(toDetailItem);
    };
  }, [getCardsForIndicator]);

  // Get deals won in period
  const getDealsWon = useMemo(() => {
    const wonCards = getCardsForIndicator('venda');
    const totalValue = wonCards.reduce((sum, card) => sum + card.valor, 0);
    
    return {
      count: wonCards.length,
      totalValue,
      cards: wonCards,
    };
  }, [getCardsForIndicator]);

  // COHORT MODE: Get cards with full history for tier conversion analysis
  // Step 1: Identify all card IDs that had ANY movement in the selected period
  // Step 2: For those cards, include ALL their movements regardless of date
  const getCardsWithFullHistory = useMemo(() => {
    // Find all card IDs with movement in period
    const activeCardIds = new Set<string>();
    for (const card of cards) {
      const entryTime = card.dataEntrada.getTime();
      if (entryTime >= startTime && entryTime <= endTime) {
        activeCardIds.add(card.id);
      }
    }
    
    // Return all movements for active cards (regardless of date)
    const cardHistories = new Map<string, ExpansaoCard[]>();
    const historyToUse = fullHistory.length > 0 ? fullHistory : cards;
    for (const card of historyToUse) {
      if (activeCardIds.has(card.id)) {
        if (!cardHistories.has(card.id)) {
          cardHistories.set(card.id, []);
        }
        cardHistories.get(card.id)!.push(card);
      }
    }
    
    console.log(`[${produto} Analytics] Cohort mode: ${activeCardIds.size} unique cards with full history`);
    return cardHistories;
  }, [cards, fullHistory, startTime, endTime, produto]);

  // Get detail items for indicator using FULL history (for cohort mode tier conversion)
  const getDetailItemsWithFullHistory = useMemo(() => {
    return (indicator: IndicatorType): DetailItem[] => {
      const result: DetailItem[] = [];
      const seenIds = new Set<string>();
      
      const cardHistories = getCardsWithFullHistory;
      
      for (const [cardId, cardMovements] of cardHistories.entries()) {
        if (seenIds.has(cardId)) continue;
        
        // Find movement matching the indicator
        const matchingMovement = cardMovements.find(m => {
          const movementIndicator = PHASE_TO_INDICATOR[m.fase];
          
          if (indicator === 'venda') {
            return m.fase === 'Contrato assinado';
          } else if (indicator === 'proposta') {
            return movementIndicator === 'proposta';
          }
          if (movementIndicator === indicator) return true;
          if (indicator === 'mql') return true;
          return false;
        });
        
        if (matchingMovement) {
          seenIds.add(cardId);
          result.push(toDetailItem(matchingMovement));
        }
      }
      
      console.log(`[${produto} Analytics] getDetailItemsWithFullHistory(${indicator}): ${result.length} unique cards`);
      return result;
    };
  }, [getCardsWithFullHistory, produto]);

  // Raw MQL count: cards with Lead/MQL phase in period + qualifying investment (no exclusions)
  const getRawMqlCount = useMemo(() => {
    const allMovements = [...cards, ...(fullHistory.length > 0 ? fullHistory : [])];
    const mqlIds = new Set<string>();
    for (const card of allMovements) {
      if (card.fase !== 'Lead' && card.fase !== 'MQL') continue;
      const entryTime = card.dataEntrada.getTime();
      if (entryTime >= startTime && entryTime <= endTime) {
        const inv = cardInvestimentoMap.get(card.id);
        if (isExpansaoMqlQualified(inv, produto)) {
          mqlIds.add(card.id);
        }
      }
    }
    return mqlIds.size;
  }, [cards, fullHistory, cardInvestimentoMap, startTime, endTime, produto]);

  // Get lost deals: faseAtual=Perdido AND created during the period
  const getLostDeals = useMemo(() => {
    const lostCards: ExpansaoCard[] = [];
    const seenIds = new Set<string>();

    for (const card of cards) {
      if (seenIds.has(card.id)) continue;
      if (card.faseAtual !== 'Perdido') continue;
      if (!card.dataCriacao) continue;
      const creationTime = card.dataCriacao.getTime();
      if (creationTime >= startTime && creationTime <= endTime) {
        lostCards.push(card);
        seenIds.add(card.id);
      }
    }

    const totalValue = lostCards.reduce((sum, card) => sum + card.valor, 0);

    return {
      count: lostCards.length,
      totalValue,
      trend: 0,
      cards: lostCards,
    };
  }, [cards, startTime, endTime]);

  // Get loss reasons grouped
  const getLossReasons = useMemo(() => {
    const reasonMap = new Map<string, ExpansaoCard[]>();

    for (const card of getLostDeals.cards) {
      const reason = card.motivoPerda || 'Não informado';
      if (!reasonMap.has(reason)) reasonMap.set(reason, []);
      reasonMap.get(reason)!.push(card);
    }

    const CHART_COLORS = [
      "hsl(var(--chart-1))",
      "hsl(var(--chart-2))",
      "hsl(var(--chart-3))",
      "hsl(var(--chart-4))",
      "hsl(var(--chart-5))",
    ];

    const total = getLostDeals.cards.length;

    return Array.from(reasonMap.entries())
      .map(([reason, cards], index) => ({
        reason,
        count: cards.length,
        percentage: total > 0 ? Math.round((cards.length / total) * 100) : 0,
        cards,
        color: CHART_COLORS[index % CHART_COLORS.length],
      }))
      .sort((a, b) => b.count - a.count);
  }, [getLostDeals]);

  return {
    isLoading,
    error,
    cards,
    getCardsForIndicator,
    toDetailItem,
    getDetailItemsForIndicator,
    getDetailItemsWithFullHistory,
    getDealsWon,
    getRawMqlCount,
    getLostDeals,
    getLossReasons,
  };
}
