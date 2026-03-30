import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DetailItem } from "@/components/planning/indicators/DetailSheet";
import { IndicatorType } from "@/hooks/useFunnelRealized";
import { isMqlQualified, isMqlExcludedByLoss, buildExcludedMqlCardIds, isTestCard } from "@/hooks/useModeloAtualMetas";
import { fixPossibleDateInversion } from "./dateUtils";

export interface ModeloAtualCard {
  id: string;
  titulo: string;
  empresa?: string;
  contato?: string;
  fase: string;
  faseDestino: string;
  dataEntrada: Date;
  dataSaida: Date | null; // "Saída" from database
  dataCriacao: Date | null; // "Data Criação" - card creation timestamp for SLA calculation
  dataAssinatura: Date | null; // "Data de assinatura do contrato" - for display in sales
  valor: number;
  valorMRR: number;
  valorPontual: number;
  valorEducacao: number;
  valorSetup: number;
  responsavel?: string;
  sdr?: string; // SDR responsável - specifically for display
  closer?: string; // Specifically the "Closer responsável" field for filtering
  faixa?: string;
  duracao: number; // Duration calculated dynamically from Entrada/Saída
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
  motivoPerda?: string;
  faseAtual?: string;
}

// Map destination phases to indicators (based on pipefy_moviment_cfos table)
const PHASE_TO_INDICATOR: Record<string, IndicatorType> = {
  // Leads - Total de leads (primeira etapa)
  'Novos Leads': 'leads',
  
  // MQL - Leads qualificados (inclui fases iniciais do funil)
  'MQLs': 'mql',
  'Tentativas de contato': 'mql',
  'Material ISCA': 'mql',
  'Start form': 'mql',
  
  // RM - Reunião Marcada
  'Reunião agendada / Qualificado': 'rm',
  
  // RR - Reunião Realizada
  'Reunião Realizada': 'rr',
  '1° Reunião Realizada - Apresentação': 'rr',
  
  // Proposta
  'Proposta enviada / Follow Up': 'proposta',
  
  // Venda
  'Contrato assinado': 'venda',
};

// Parse date from PostgreSQL format
function parseDate(dateValue: string | null): Date | null {
  if (!dateValue) return null;
  const date = new Date(dateValue);
  if (isNaN(date.getTime())) return null;
  return date;
}

// Parse date-only (YYYY-MM-DD) to avoid timezone shift
function parseDateOnly(dateValue: string | null): Date | null {
  if (!dateValue) return null;
  const match = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return parseDate(dateValue);
  const [, y, m, d] = match;
  return new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0);
}

// Parse numeric value - handles both BR (8.570,65) and US/DB (8570.65) formats
function parseNumericValue(value: any): number {
  if (typeof value === 'number') return value;
  if (value === null || value === undefined) return 0;
  
  if (typeof value === 'string') {
    // Remove R$ e espaços
    let cleaned = value.replace(/[R$\s]/g, '').trim();
    
    if (cleaned === '') return 0;
    
    // Detectar formato baseado na presença de vírgula e ponto:
    // - Formato BR: "8.570,65" (ponto = milhar, vírgula = decimal)
    // - Formato US/DB: "8570.65" (ponto = decimal)
    const hasComma = cleaned.includes(',');
    const hasDot = cleaned.includes('.');
    
    if (hasComma && hasDot) {
      // Formato brasileiro completo: "8.570,65"
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else if (hasComma && !hasDot) {
      // Só vírgula: "8570,65" → trocar por ponto
      cleaned = cleaned.replace(',', '.');
    }
    // Se só tem ponto ou nenhum: já está em formato americano (banco)
    
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

// Helper to parse a row from the database into a ModeloAtualCard
function parseCardRow(row: Record<string, any>, skipPhaseFilter = false): ModeloAtualCard | null {
  const id = String(row['ID'] || row['id'] || '');
  const fase = row['Fase'] || row['fase'] || '';
  let dataEntrada = parseDate(row['Entrada'] || row['entrada']) || new Date();
  
  // Skip if no id, no phase, or phase not in mapping (unless skipPhaseFilter is true)
  if (!id || !fase) return null;
  if (!skipPhaseFilter && !PHASE_TO_INDICATOR[fase]) return null;

  // Parse additional dates
  let correctedAssinatura = parseDateOnly(row['Data de assinatura do contrato']);
  
  // For "Contrato assinado" phase: override dataEntrada with dataAssinatura
  // Also fix dataAssinatura so effectiveDate logic for 'venda' uses the corrected date
  if (fase === 'Contrato assinado' && correctedAssinatura) {
    const fixed = fixPossibleDateInversion(correctedAssinatura, dataEntrada);
    dataEntrada = fixed;
    correctedAssinatura = fixed;
  }
  const valorMRR = parseNumericValue(row['Valor MRR'] || row['valor_mrr'] || 0);
  const valorPontual = parseNumericValue(row['Valor Pontual'] || row['valor_pontual'] || 0);
  const valorEducacao = parseNumericValue(row['Valor Educação'] || row['Valor Educacao'] || row['valor_educacao'] || 0);
  const valorSetup = parseNumericValue(row['Valor Setup'] || row['valor_setup'] || 0);
  const valor = valorMRR + valorPontual + valorEducacao + valorSetup;
  
  // Parse exit date and calculate duration dynamically
  const dataSaida = parseDate(row['Saída']);
  const dataCriacao = parseDate(row['Data Criação']); // For SLA calculation
  let duracao = 0;
  if (dataSaida) {
    duracao = Math.floor((dataSaida.getTime() - dataEntrada.getTime()) / 1000);
  } else {
    duracao = Math.floor((Date.now() - dataEntrada.getTime()) / 1000);
  }
  
  // Extract SDR for display
  const sdr = String(row['SDR responsável'] || '').trim();
  
  return {
    id,
    titulo: row['Título'] || row['titulo'] || row['Nome'] || '',
    empresa: row['Empresa'] || row['empresa'] || row['Organização'] || '',
    contato: row['Contato'] || row['contato'] || row['Nome - Interlocução O2'] || '',
    fase,
    faseDestino: fase,
    dataEntrada,
    dataSaida,
    dataCriacao,
    dataAssinatura: correctedAssinatura,
    valorMRR,
    valorPontual,
    valorEducacao,
    valorSetup,
    valor,
    sdr: sdr || undefined,
    closer: String(row['Closer responsável'] ?? '').trim(),
    responsavel: String(row['SDR responsável'] || row['Responsável'] || row['responsavel'] || '').trim(),
    faixa: row['Faixa de faturamento mensal'] || row['Faixa'] || row['faixa'] || '',
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
    motivoPerda: row['Motivo da perda'] || row['motivo_perda'] || undefined,
    faseAtual: row['Fase Atual'] || row['fase_atual'] || undefined,
  };
}

// Parse multiple rows into cards
function parseCards(rows: Record<string, any>[], skipPhaseFilter = false): ModeloAtualCard[] {
  const cards: ModeloAtualCard[] = [];
  for (const row of rows) {
    const card = parseCardRow(row, skipPhaseFilter);
    if (card) cards.push(card);
  }
  return cards;
}

export function useModeloAtualAnalytics(startDate: Date, endDate: Date) {
  // Memoize date strings to prevent queryKey instability (fixes "Should have a queue" error)
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

  const { data, isLoading, error } = useQuery({
    queryKey: ['modelo-atual-analytics', startDateStr, endDateStr],
    queryFn: async () => {
      console.log(`[useModeloAtualAnalytics] Fetching data from pipefy_moviment_cfos with server-side date filter`);
      
      const startDateUtc = `${startDateStr}T00:00:00.000Z`;
      const endDateUtc = `${endDateStr}T23:59:59.999Z`;
      
      console.log(`[useModeloAtualAnalytics] Query period: ${startDateUtc} to ${endDateUtc}`);
      
      // Paginated fetch helper - fetches in batches of PAGE_SIZE to avoid edge function CPU/memory limits
      const PAGE_SIZE = 5000;
      const fetchAllPages = async (action: string) => {
        const allRows: any[] = [];
        let offset = 0;
        while (true) {
          const { data: resp, error: err } = await supabase.functions.invoke('query-external-db', {
            body: { 
              table: 'pipefy_moviment_cfos', 
              action,
              startDate: startDateUtc,
              endDate: endDateUtc,
              limit: PAGE_SIZE,
              offset
            }
          });
          if (err) throw err;
          const rows = resp?.data || [];
          allRows.push(...rows);
          console.log(`[useModeloAtualAnalytics] ${action} page offset=${offset}: ${rows.length} rows`);
          if (rows.length < PAGE_SIZE) break;
          offset += PAGE_SIZE;
        }
        return allRows;
      };

      // Fetch all three queries with pagination (signature is small, but use same pattern for safety)
      const [periodRows, creationRows, signatureRows] = await Promise.all([
        fetchAllPages('query_period'),
        fetchAllPages('query_period_by_creation'),
        fetchAllPages('query_period_by_signature'),
      ]);

      // Wrap in the format expected by the rest of the code
      const periodResponse = { data: { data: periodRows }, error: null };
      const creationResponse = { data: { data: creationRows }, error: null };
      const signatureResponse = { data: { data: signatureRows }, error: null };

      if (periodResponse.error) {
        console.error('[useModeloAtualAnalytics] Error fetching period data:', periodResponse.error);
        throw periodResponse.error;
      }

      if (!periodResponse.data?.data) {
        console.warn('[useModeloAtualAnalytics] No data returned');
        return { cards: [], fullHistory: [], mqlByCreation: [] };
      }

      console.log(`[useModeloAtualAnalytics] Raw period data rows: ${periodResponse.data.data.length}`);
      const cards = parseCards(periodResponse.data.data);
      const allCardsUnfiltered = parseCards(periodResponse.data.data, true); // skipPhaseFilter for marketing attribution
      console.log(`[useModeloAtualAnalytics] Parsed ${cards.length} card movements`);
      
      // Parse MQL-by-creation cards (skip phase filter - these can be in any phase including "Perdido")
      let mqlByCreation: ModeloAtualCard[] = [];
      if (creationResponse.data?.data) {
        mqlByCreation = parseCards(creationResponse.data.data, true); // skipPhaseFilter=true
        console.log(`[useModeloAtualAnalytics] Cards created in period: ${mqlByCreation.length}`);
      } else if (creationResponse.error) {
        console.error('[useModeloAtualAnalytics] Error fetching creation data:', creationResponse.error);
      }
      
      // Parse signature-date cards (captures sales signed in period but moved later in Pipefy)
      let signatureCards: ModeloAtualCard[] = [];
      let signatureCardsUnfiltered: ModeloAtualCard[] = [];
      if (signatureResponse.data?.data) {
        signatureCards = parseCards(signatureResponse.data.data);
        signatureCardsUnfiltered = parseCards(signatureResponse.data.data, true);
        console.log(`[useModeloAtualAnalytics] Cards signed in period: ${signatureCards.length}`);
      } else if (signatureResponse.error) {
        console.error('[useModeloAtualAnalytics] Error fetching signature data:', signatureResponse.error);
      }
      
      // Merge signature cards into main cards (deduplicate by id+fase)
      const existingKeys = new Set(cards.map(c => `${c.id}|${c.fase}`));
      for (const sc of signatureCards) {
        if (!existingKeys.has(`${sc.id}|${sc.fase}`)) {
          cards.push(sc);
          existingKeys.add(`${sc.id}|${sc.fase}`);
        }
      }
      
      // Merge signature cards into allCardsUnfiltered (deduplicate by id+fase)
      const existingUnfilteredKeys = new Set(allCardsUnfiltered.map(c => `${c.id}|${c.fase}`));
      for (const sc of signatureCardsUnfiltered) {
        if (!existingUnfilteredKeys.has(`${sc.id}|${sc.fase}`)) {
          allCardsUnfiltered.push(sc);
          existingUnfilteredKeys.add(`${sc.id}|${sc.fase}`);
        }
      }

      const uniquePhases = [...new Set(cards.map(c => c.fase))];
      console.log(`[useModeloAtualAnalytics] Unique phases:`, uniquePhases);
      
      // Step 2: Get unique card IDs from period (union of all queries)
      const allCardIds = new Set([...cards.map(c => c.id), ...mqlByCreation.map(c => c.id)]);
      const uniqueCardIds = [...allCardIds];
      console.log(`[useModeloAtualAnalytics] Unique card IDs (union): ${uniqueCardIds.length}`);
      
      // Step 3: Fetch full history for these cards (to find absolute first entry per phase)
      let fullHistory: ModeloAtualCard[] = [];
      if (uniqueCardIds.length > 0) {
        console.log(`[useModeloAtualAnalytics] Fetching full history for ${uniqueCardIds.length} cards...`);
        const { data: historyData, error: historyError } = await supabase.functions.invoke('query-external-db', {
          body: { 
            table: 'pipefy_moviment_cfos', 
            action: 'query_card_history',
            cardIds: uniqueCardIds
          }
        });
        
        if (historyError) {
          console.error('[useModeloAtualAnalytics] Error fetching full history:', historyError);
        } else if (historyData?.data) {
          fullHistory = parseCards(historyData.data);
          console.log(`[useModeloAtualAnalytics] Full history loaded: ${fullHistory.length} movements`);
        }
      }

      return { cards, allCardsUnfiltered, fullHistory, mqlByCreation };
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const cards = data?.cards ?? [];
  const allCards = data?.allCardsUnfiltered ?? [];
  const fullHistory = data?.fullHistory ?? [];
  const mqlByCreation = data?.mqlByCreation ?? [];

  // Pre-compute excluded MQL card IDs at card level (any row with excluded reason excludes the whole card)
  const excludedMqlIds = useMemo(() => buildExcludedMqlCardIds(mqlByCreation), [mqlByCreation]);

  // Build a map of FIRST entry for EACH indicator per card (using full history)
  // This ensures we count each indicator only once, in the month of first entry
  const firstEntryByCardAndIndicator = useMemo(() => {
    const firstEntries = new Map<string, Map<IndicatorType, ModeloAtualCard>>();
    
    // Use fullHistory if available, otherwise fall back to cards (period-only)
    const historyToUse = [...fullHistory, ...cards];
    
    for (const card of historyToUse) {
      const indicator = PHASE_TO_INDICATOR[card.fase];
      if (!indicator) continue;
      
      // Special validation for MQL (requires revenue >= 200k) - card-level exclusion
      if (indicator === 'mql' && !isMqlQualified(card.faixa)) continue;
      
      if (!firstEntries.has(card.id)) {
        firstEntries.set(card.id, new Map());
      }
      
      const cardMap = firstEntries.get(card.id)!;
      const existing = cardMap.get(indicator);
      
      // Keep the EARLIEST entry for this indicator
      // For venda: use dataAssinatura as effective date when available
      const effectiveDate = indicator === 'venda' 
        ? (card.dataAssinatura || card.dataEntrada) 
        : card.dataEntrada;
      const existingDate = existing 
        ? (indicator === 'venda' ? (existing.dataAssinatura || existing.dataEntrada) : existing.dataEntrada)
        : null;
      if (!existingDate || effectiveDate < existingDate) {
        cardMap.set(indicator, card);
      }
    }
    
    console.log(`[useModeloAtualAnalytics] Built firstEntryByCardAndIndicator map for ${firstEntries.size} cards`);
    return firstEntries;
  }, [fullHistory, cards, excludedMqlIds]);

  // Get cards for a specific indicator - EVERY ENTRY LOGIC
  // MQL uses CREATION DATE logic (aligned with Pipefy): card created in period + faturamento >= 200k
  // All other indicators: count EVERY movement whose phase matches and dataEntrada is in period
  const getCardsForIndicator = useMemo(() => {
    return (indicator: IndicatorType): ModeloAtualCard[] => {
      if (indicator === 'mql') {
        // MQL: Use creation date logic (aligned with Pipefy) - card-level exclusion
        // Card created in the period + faturamento >= R$ 200k + not excluded at card level
        const uniqueCards = new Map<string, ModeloAtualCard>();
        for (const card of mqlByCreation) {
          if (!card.dataCriacao) continue;
          const creationTime = card.dataCriacao.getTime();
          if (creationTime >= startTime && creationTime <= endTime && isMqlQualified(card.faixa) && !isTestCard(card.id) && !excludedMqlIds.has(card.id)) {
            // Deduplicate by card ID - keep first occurrence
            if (!uniqueCards.has(card.id)) {
              uniqueCards.set(card.id, card);
            }
          }
        }
        console.log(`[useModeloAtualAnalytics] getCardsForIndicator mql (by creation): ${uniqueCards.size} cards`);
        return Array.from(uniqueCards.values());
      }
      
      // For all other indicators: EVERY ENTRY in the period
      const indicatorsToCheck: IndicatorType[] = indicator === 'leads' 
        ? ['leads', 'mql']
        : [indicator];
      
      // Combine cards + fullHistory, dedup by id+fase+entrada to avoid double-counting same movement
      const allMovements = [...cards, ...fullHistory];
      const seenKeys = new Set<string>();
      const result: ModeloAtualCard[] = [];
      
      for (const card of allMovements) {
        const cardIndicator = PHASE_TO_INDICATOR[card.fase];
        if (!cardIndicator || !indicatorsToCheck.includes(cardIndicator)) continue;
        
        // For venda: use dataAssinatura as effective date when available
        const effectiveTime = (cardIndicator === 'venda' && card.dataAssinatura)
          ? card.dataAssinatura.getTime()
          : card.dataEntrada.getTime();
        
        if (effectiveTime >= startTime && effectiveTime <= endTime) {
          // Dedup same movement (same card, same phase, same entry date) but allow same card in different entries
          const month = `${card.dataEntrada.getFullYear()}-${card.dataEntrada.getMonth()}`;
          const key = `${card.id}|${card.fase}|${month}`;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            result.push(card);
          }
        }
      }
      
      console.log(`[useModeloAtualAnalytics] getCardsForIndicator ${indicator}: ${result.length} entries (every entry)`);
      return result;
    };
  }, [cards, fullHistory, mqlByCreation, excludedMqlIds, startTime, endTime]);

  // Get cards for leads - now uses actual data from database
  const getLeadsCards = useMemo(() => {
    return getCardsForIndicator('leads');
  }, [getCardsForIndicator]);

  // Helper function to convert ModeloAtualCard to DetailItem
  const toDetailItem = (card: ModeloAtualCard): DetailItem => ({
    id: card.id,
    name: card.titulo || card.empresa || 'Sem título',
    company: card.empresa || card.contato || undefined,
    phase: card.faseDestino,
    date: (card.dataAssinatura && PHASE_TO_INDICATOR[card.fase] === 'venda' 
      ? card.dataAssinatura 
      : card.dataEntrada).toISOString(),
    value: card.valor,
    revenueRange: card.faixa || undefined,
    responsible: card.closer || card.responsavel || undefined, // Prioritize closer for display
    duration: card.duracao,
    product: 'CaaS',
    mrr: card.valorMRR,
    setup: card.valorSetup,
    pontual: card.valorPontual,
    closer: card.closer,
    sdr: card.sdr,
    dataAssinatura: card.dataAssinatura?.toISOString() || undefined,
  });

  // Get detail items for a specific indicator
  const getDetailItemsForIndicator = (indicator: IndicatorType): DetailItem[] => {
    // All indicators including leads now have card data from database
    
    const indicatorCards = getCardsForIndicator(indicator);
    return indicatorCards.map(toDetailItem);
  };

  // Calculate average SLA in minutes for cards entering "Tentativas de contato" phase
  // SLA = Entry to "Tentativas de contato" - Card Creation Date
  const getAverageSlaMinutes = useMemo(() => {
    // Filter from period cards (not full history) for SLA calculation
    const tentativasCards = cards.filter(card => 
      card.fase === 'Tentativas de contato' && card.dataCriacao
    );
    
    if (tentativasCards.length === 0) return 0;
    
    const totalMinutes = tentativasCards.reduce((sum, card) => {
      const diffMs = card.dataEntrada.getTime() - card.dataCriacao!.getTime();
      return sum + (diffMs / 1000 / 60); // Convert to minutes
    }, 0);
    
    return totalMinutes / tentativasCards.length;
  }, [cards]);

  // COHORT MODE: Get cards with full history for tier conversion analysis
  // Step 1: Identify all card IDs that had ANY movement in the selected period
  // Step 2: For those cards, include ALL their movements regardless of date
  const getCardsWithFullHistory = useMemo(() => {
    // Use fullHistory if available for cohort mode
    const historyToUse = fullHistory.length > 0 ? fullHistory : cards;
    
    // Find all card IDs with movement in period
    const activeCardIds = new Set<string>();
    for (const card of cards) {
      const entryTime = card.dataEntrada.getTime();
      if (entryTime >= startTime && entryTime <= endTime) {
        activeCardIds.add(card.id);
      }
    }
    
    // Return all movements for active cards (regardless of date)
    const cardHistories = new Map<string, ModeloAtualCard[]>();
    for (const card of historyToUse) {
      if (activeCardIds.has(card.id)) {
        if (!cardHistories.has(card.id)) {
          cardHistories.set(card.id, []);
        }
        cardHistories.get(card.id)!.push(card);
      }
    }
    
    console.log(`[Modelo Atual Analytics] Cohort mode: ${activeCardIds.size} unique cards with full history`);
    return cardHistories;
  }, [cards, fullHistory, startTime, endTime]);

  // Get detail items for indicator using FULL history (for cohort mode tier conversion)
  const getDetailItemsWithFullHistory = (indicator: IndicatorType): DetailItem[] => {
    const result: DetailItem[] = [];
    const seenIds = new Set<string>();
    
    const cardHistories = getCardsWithFullHistory;
    
    for (const [cardId, movements] of cardHistories.entries()) {
      if (seenIds.has(cardId)) continue;
      
      // Find movement matching the indicator
      const matchingMovement = movements.find(m => {
        const cardIndicator = PHASE_TO_INDICATOR[m.faseDestino];
        
        // LEADS = Union of 'Novos Leads' (leads) + 'MQLs' (mql)
        if (indicator === 'leads') {
          return cardIndicator === 'leads' || cardIndicator === 'mql';
        }
        // MQL = card entered MQLs phase AND has revenue >= R$ 200k
        if (indicator === 'mql') {
          return cardIndicator === 'mql' && isMqlQualified(m.faixa) && !isMqlExcludedByLoss(m.faseAtual, m.motivoPerda);
        }
        return cardIndicator === indicator;
      });
      
      if (matchingMovement) {
        seenIds.add(cardId);
        result.push(toDetailItem(matchingMovement));
      }
    }
    
    console.log(`[Modelo Atual Analytics] getDetailItemsWithFullHistory(${indicator}): ${result.length} unique cards`);
    return result;
  };

  // Count of MQL cards that have excluded loss reasons (for badge display)
  const getExcludedMqlCount = useMemo(() => {
    // Get all MQL cards (including excluded ones) and count how many are in excludedMqlIds
    const allMqlIds = new Set<string>();
    for (const card of mqlByCreation) {
      if (!card.dataCriacao) continue;
      const creationTime = card.dataCriacao.getTime();
      if (creationTime >= startTime && creationTime <= endTime && isMqlQualified(card.faixa) && !isTestCard(card.id)) {
        allMqlIds.add(card.id);
      }
    }
    let count = 0;
    for (const id of allMqlIds) {
      if (excludedMqlIds.has(id)) count++;
    }
    return count;
  }, [mqlByCreation, excludedMqlIds, startTime, endTime]);

  // Raw MQL count: all cards with qualifying faixa, created in period (no exclusions)
  const getRawMqlCount = useMemo(() => {
    const allMqlIds = new Set<string>();
    for (const card of mqlByCreation) {
      if (!card.dataCriacao) continue;
      const creationTime = card.dataCriacao.getTime();
      if (creationTime >= startTime && creationTime <= endTime && isMqlQualified(card.faixa)) {
        allMqlIds.add(card.id);
      }
    }
    return allMqlIds.size;
  }, [mqlByCreation, startTime, endTime]);

  // Get lost deals in period
  const getLostDeals = useMemo(() => {
    // Cards with faseAtual=Perdido/Arquivado AND created (dataCriacao) during the period
    const lostCards: ModeloAtualCard[] = [];
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

  // Get loss reasons grouped (uses same first-entry logic as getLostDeals)
  const getLossReasons = useMemo(() => {
    const reasonMap = new Map<string, ModeloAtualCard[]>();

    for (const card of getLostDeals.cards) {
      const reason = card.motivoPerda || 'Não informado';
      if (!reasonMap.has(reason)) {
        reasonMap.set(reason, []);
      }
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
    allCards,
    getCardsForIndicator,
    getLeadsCards,
    toDetailItem,
    getDetailItemsForIndicator,
    getDetailItemsWithFullHistory,
    getAverageSlaMinutes,
    getExcludedMqlCount,
    getRawMqlCount,
    getLostDeals,
    getLossReasons,
  };
}
