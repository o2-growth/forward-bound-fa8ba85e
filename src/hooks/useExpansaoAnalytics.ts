import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DetailItem } from "@/components/planning/indicators/DetailSheet";
import { IndicatorType } from "@/hooks/useFunnelRealized";
import { fixPossibleDateInversion, shouldForceAssinaturaDate, getForcedSaleDate, getForcedPontualValue } from "./dateUtils";
import { isTestCard } from "./useModeloAtualMetas";
import { parseTemperatura } from "./useModeloAtualAnalytics";

// Cards forçados como "Quente" por BU/produto (Quentes junho 2026).
// Match por título normalizado: lowercase + NFD (sem acento) + trim.
function normalizeTitleForQuente(s: string): string {
  return (s || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}
const FORCED_QUENTE_FRANQUIA = new Set<string>(['eberson', 'ranieri']);
const FORCED_QUENTE_OXY_HACKER = new Set<string>(['thiago', 'marcia', 'patrick']);

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
  temperatura?: 'Quente' | 'Morno' | 'Frio'; // Tag de prioridade do lead (Labels / Prioridade Lead)
}

// MQL Expansão (Franquia e Oxy Hacker): investimento disponível >= R$ 15k
// Todas as faixas do Pipefy já são >= 15k, então qualquer investimento preenchido qualifica
function isExpansaoMqlQualified(investimento: string | undefined, _produto: string): boolean {
  return !!investimento && investimento.trim().length > 0;
}

// Overrides de classificação/valor para cards específicos do Pipefy
// que estão com dados incorretos na origem e ainda não foram corrigidos lá.
// Preferir match por ID. Match por título é fallback temporário.
type CardOverride = Partial<{ produto: string; taxaFranquia: number }>;

const CARD_OVERRIDES_BY_ID: Record<string, CardOverride> = {
  // "1234567890": { produto: "Oxy Hacker", taxaFranquia: 32000 },
};

const CARD_OVERRIDES_BY_TITLE: Record<string, CardOverride> = {
  "ashia andrade": { produto: "Oxy Hacker", taxaFranquia: 32000 },
};

function normalizeTitle(s: string): string {
  return (s || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function getCardOverride(id: string, titulo: string): CardOverride | null {
  if (CARD_OVERRIDES_BY_ID[id]) return CARD_OVERRIDES_BY_ID[id];
  const key = normalizeTitle(titulo);
  if (CARD_OVERRIDES_BY_TITLE[key]) {
    console.warn(`[ExpansaoAnalytics] Override por título aplicado em "${titulo}" (id=${id}). Migrar para CARD_OVERRIDES_BY_ID.`);
    return CARD_OVERRIDES_BY_TITLE[key];
  }
  return null;
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
  const tituloRaw = row['Título'] || '';
  const dataAssinatura = parseDateOnly(row['Data de assinatura do contrato']);
  // Cards na lista forçada: usar data fixa (Abril/2026), independente de fase/data
  if (shouldForceAssinaturaDate(tituloRaw, 'expansao')) {
    dataEntrada = getForcedSaleDate();
  } else if (fase === 'Contrato assinado' && dataAssinatura) {
    dataEntrada = fixPossibleDateInversion(dataAssinatura, dataEntrada);
  }
  
  // Calculate duration dynamically
  let duracao = 0;
  if (dataSaida) {
    duracao = Math.floor((dataSaida.getTime() - dataEntrada.getTime()) / 1000);
  } else {
    duracao = Math.floor((Date.now() - dataEntrada.getTime()) / 1000);
  }
  
  let taxaFranquia = row['Taxa de franquia'] ? parseFloat(row['Taxa de franquia']) : 0;
  let valorMRR = row['Valor MRR'] ? parseFloat(row['Valor MRR']) : 0;
  let valorPontual = row['Valor Pontual'] ? parseFloat(row['Valor Pontual']) : 0;
  let valorSetup = row['Valor Setup'] ? parseFloat(row['Valor Setup']) : 0;
  let produto = row['Produtos'] || '';
  const titulo = row['Título'] || '';

  // Apply manual overrides for cards with incorrect data in Pipefy
  const override = getCardOverride(id, titulo);
  if (override) {
    if (override.produto !== undefined) produto = override.produto;
    if (override.taxaFranquia !== undefined) taxaFranquia = override.taxaFranquia;
  }

  // Override de Valor Pontual fixo (Alexandre Correa, Jean Morbis)
  const forcedPontual = getForcedPontualValue(titulo);
  if (forcedPontual !== null) {
    valorPontual = forcedPontual;
    valorMRR = 0;
    valorSetup = 0;
    taxaFranquia = 0;
  }

  // Calculate value: prioritize taxaFranquia, then sum of other values, then defaultTicket
  // Note: defaultTicket depends on produto (Franquia=0, Oxy Hacker=54000), so recompute based on overridden produto
  const effectiveDefaultTicket = produto === 'Oxy Hacker' ? 54000 : (produto === 'Franquia' ? 0 : defaultTicket);
  let valor = taxaFranquia;
  if (valor <= 0) {
    const sumValues = valorPontual + valorSetup + valorMRR;
    valor = sumValues > 0 ? sumValues : effectiveDefaultTicket;
  }
  
  return {
    id,
    titulo,
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
    produto,
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
    temperatura: (() => {
      const normTitle = normalizeTitleForQuente(titulo);
      const prod = String(produto || '').toLowerCase();
      if (prod.includes('franquia') && FORCED_QUENTE_FRANQUIA.has(normTitle)) return 'Quente';
      if (prod.includes('oxy hacker') && FORCED_QUENTE_OXY_HACKER.has(normTitle)) return 'Quente';
      return parseTemperatura(row);
    })(),
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

  // Perf: query SHARED entre as duas instâncias do hook (Franquia + Oxy Hacker).
  // Antes cada produto disparava 3 chamadas à mesma tabela, mesmo período,
  // filtrando por produto APENAS no client → 100% duplicação.
  // Agora: queryKey sem produto → React Query dedupe → 1 fetch só pros 2 consumidores.
  // Os rows raw são retornados; cada instância filtra por produto via useMemo abaixo.
  const { data, isLoading, error } = useQuery({
    queryKey: ['expansao-raw-rows', startDateStr, endDateStr],
    queryFn: async () => {
      // 3 endpoints da mesma tabela. Period+Signature em paralelo;
      // history depende dos IDs vindos das duas primeiras (sequencial).
      const baseBody = {
        table: 'pipefy_cards_movements_expansao',
        startDate: `${startDateStr}T00:00:00`,
        endDate: `${endDateStr}T23:59:59`,
        limit: 10000,
      };

      const [periodRes, signatureRes] = await Promise.all([
        supabase.functions.invoke('query-external-db', { body: { ...baseBody, action: 'query_period' } }),
        supabase.functions.invoke('query-external-db', { body: { ...baseBody, action: 'query_period_by_signature' } }),
        supabase.functions.invoke('query-external-db', {
          body: {
            table: 'pipefy_cards_movements_expansao',
            action: 'query_open_pipeline',
          },
        }),
      ]);

      if (periodRes.error) {
        console.error('Error fetching Expansao raw rows:', periodRes.error);
        throw periodRes.error;
      }

      const allRows: Record<string, any>[] = [
        ...(periodRes.data?.data || []),
        ...(signatureRes.data?.data || []),
      ];

      // Coleta IDs únicos (TODOS os produtos — filter por produto é feito no useMemo abaixo)
      const uniqueCardIds = [...new Set(allRows.map(r => String(r['ID'] || '')).filter(Boolean))];

      let historyRows: Record<string, any>[] = [];
      if (uniqueCardIds.length > 0) {
        const { data: historyData, error: historyError } = await supabase.functions.invoke('query-external-db', {
          body: {
            table: 'pipefy_cards_movements_expansao',
            action: 'query_card_history',
            cardIds: uniqueCardIds,
          },
        });
        if (!historyError && historyData?.data) {
          historyRows = historyData.data;
        }
      }

      console.log(`[Expansao Raw] period=${(periodRes.data?.data || []).length} sig=${(signatureRes.data?.data || []).length} hist=${historyRows.length} ids=${uniqueCardIds.length}`);
      return { allRows, historyRows };
    },
    staleTime: 30 * 60 * 1000,
    retry: 1,
  });

  // Filtra por produto via useMemo — cada instância (Franquia / Oxy Hacker) deriva
  // do mesmo cache compartilhado. Aplicação do defaultTicket fica aqui pois varia por produto.
  const cards = useMemo<ExpansaoCard[]>(() => {
    const rows = data?.allRows || [];
    const seen = new Set<string>();
    const out: ExpansaoCard[] = [];
    for (const row of rows) {
      if (isTestCard(String(row['ID'] || ''))) continue;
      const key = `${row['ID']}_${row['Fase']}_${row['Entrada']}`;
      if (seen.has(key)) continue;
      const parsed = parseRawCard(row, defaultTicket);
      if (parsed.produto !== produto) continue;
      seen.add(key);
      out.push(parsed);
    }
    console.log(`[${produto} Analytics] Filtered ${out.length}/${rows.length} cards (shared cache)`);
    return out;
  }, [data?.allRows, produto, defaultTicket]);

  const fullHistory = useMemo<ExpansaoCard[]>(() => {
    const rows = data?.historyRows || [];
    const out: ExpansaoCard[] = [];
    for (const row of rows) {
      if (isTestCard(String(row['ID'] || ''))) continue;
      const parsed = parseRawCard(row, defaultTicket);
      if (parsed.produto !== produto) continue;
      out.push(parsed);
    }
    return out;
  }, [data?.historyRows, produto, defaultTicket]);

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

  // ============================================================
  // FIX: Atribuição retroativa de SDR/Closer via fullHistory
  // ------------------------------------------------------------
  // Em Expansão (Franquia/Oxy Hacker) o campo `SDR responsável` só é
  // preenchido no Pipefy quando o card avança para "Tentativas de contato".
  // Resultado: movimentos das fases Lead/MQL ficam com sdr=null mesmo
  // quando o card já "pertence" a um SDR no mundo real (atribuído depois).
  //
  // Solução: mapa cardId -> último SDR/Closer não-vazio em QUALQUER
  // movimento do card. Quando enriquecemos um card cujos campos
  // SDR/Closer estão vazios, preenchemos com o valor do mapa.
  // Faz o filtro de SDR no ClickableFunnelChart resgatar cards de
  // fase inicial. Escopo: só Expansão (este hook).
  // ============================================================
  const { effectiveSdrByCard, effectiveCloserByCard } = useMemo(() => {
    const sdrMap = new Map<string, string>();
    const closerMap = new Map<string, string>();
    const allMovements = [...cards, ...(fullHistory.length > 0 ? fullHistory : [])];
    const sorted = allMovements
      .slice()
      .sort((a, b) => a.dataEntrada.getTime() - b.dataEntrada.getTime());
    for (const mov of sorted) {
      if (mov.sdr && mov.sdr.trim()) sdrMap.set(mov.id, mov.sdr.trim());
      if (mov.closer && mov.closer.trim()) closerMap.set(mov.id, mov.closer.trim());
    }
    return { effectiveSdrByCard: sdrMap, effectiveCloserByCard: closerMap };
  }, [cards, fullHistory]);

  const enrichCardWithEffectiveOwners = useMemo(() => {
    return (card: ExpansaoCard): ExpansaoCard => {
      const hasSdr = !!(card.sdr && card.sdr.trim());
      const hasCloser = !!(card.closer && card.closer.trim());
      if (hasSdr && hasCloser) return card;
      const effSdr = effectiveSdrByCard.get(card.id) || null;
      const effCloser = effectiveCloserByCard.get(card.id) || null;
      const newSdr = hasSdr ? card.sdr : effSdr;
      const newCloser = hasCloser ? card.closer : effCloser;
      // `responsavel` mantém a regra do parser: Closer || SDR
      const newResponsavel = card.responsavel || newCloser || newSdr;
      if (newSdr === card.sdr && newCloser === card.closer && newResponsavel === card.responsavel) {
        return card;
      }
      return { ...card, sdr: newSdr, closer: newCloser, responsavel: newResponsavel };
    };
  }, [effectiveSdrByCard, effectiveCloserByCard]);

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

      // Enriquece com SDR/Closer efetivos do histórico (fix Expansão Lead/MQL)
      return result.map(enrichCardWithEffectiveOwners);
    };
  }, [cards, fullHistory, cardInvestimentoMap, monthlyFirstEntries, startTime, endTime, produto, enrichCardWithEffectiveOwners]);

  // Helper function to convert ExpansaoCard to DetailItem
  const toDetailItem = (rawCard: ExpansaoCard): DetailItem => {
    const card = enrichCardWithEffectiveOwners(rawCard);
    return ({
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
    revenueRange: cardInvestimentoMap.get(card.id) || card.investimentoDisponivel || undefined,
    dataCriacao: card.dataCriacao?.toISOString() || undefined,
    tipoOrigem: card.tipoOrigem,
    origemLead: card.origemLead,
    fonte: card.fonte,
    campanha: card.campanha,
  });
  };

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
            return m.fase === 'Contrato assinado' || m.fase === 'Ganho' || shouldForceAssinaturaDate(m.titulo, 'expansao');
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
    // IMPORTANT: parser filters out 'Perdido' phase, so the row carrying
    // "Motivo da perda" is missing in `cards`. Look across all sources.
    const allSources: ExpansaoCard[] = [...cards, ...fullHistory];

    const motivoByCardId = new Map<string, string>();
    for (const c of allSources) {
      if (c.fase === 'Perdido' && c.motivoPerda) {
        motivoByCardId.set(c.id, c.motivoPerda);
      }
    }
    for (const c of allSources) {
      if (!motivoByCardId.has(c.id) && c.motivoPerda) {
        motivoByCardId.set(c.id, c.motivoPerda);
      }
    }

    const bestByCard = new Map<string, ExpansaoCard>();
    for (const card of allSources) {
      if (card.faseAtual !== 'Perdido') continue;
      if (!card.dataCriacao) continue;
      const creationTime = card.dataCriacao.getTime();
      if (creationTime < startTime || creationTime > endTime) continue;

      const existing = bestByCard.get(card.id);
      if (!existing) {
        bestByCard.set(card.id, card);
        continue;
      }
      const currentIsLossEntry = card.fase === 'Perdido';
      const existingIsLossEntry = existing.fase === 'Perdido';
      if (currentIsLossEntry && !existingIsLossEntry) {
        bestByCard.set(card.id, card);
      } else if (currentIsLossEntry && existingIsLossEntry && !existing.motivoPerda && card.motivoPerda) {
        bestByCard.set(card.id, card);
      }
    }

    const lostCards: ExpansaoCard[] = Array.from(bestByCard.values()).map(card => {
      if (card.motivoPerda) return card;
      const filled = motivoByCardId.get(card.id);
      return filled ? { ...card, motivoPerda: filled } : card;
    });

    const totalValue = lostCards.reduce((sum, card) => sum + card.valor, 0);

    return {
      count: lostCards.length,
      totalValue,
      trend: 0,
      cards: lostCards,
    };
  }, [cards, fullHistory, startTime, endTime]);

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
