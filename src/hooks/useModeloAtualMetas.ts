import { useQuery } from "@tanstack/react-query";
import { fixPossibleDateInversion } from "./dateUtils";
import { supabase } from "@/integrations/supabase/client";
import { eachDayOfInterval, eachMonthOfInterval, addDays, differenceInDays } from "date-fns";

export type ModeloAtualIndicator = 'leads' | 'mql' | 'rm' | 'rr' | 'proposta' | 'venda';
export type ChartGrouping = 'daily' | 'weekly' | 'monthly';

interface ModeloAtualMovement {
  id: string;
  titulo: string;
  fase: string;
  faseAtual: string;
  motivoPerda?: string;
  dataEntrada: Date;
  dataCriacao: Date | null;
  dataAssinatura: Date | null;
  valorMRR: number;
  valorPontual: number;
  valorEducacao: number;
  valorSetup: number;
  valor: number;
  faixaFaturamento?: string;
}

// Faixas de faturamento que qualificam como MQL (>= R$ 200k)
export const MQL_QUALIFYING_TIERS = [
  'Entre R$ 200 mil e R$ 350 mil',
  'Entre R$ 350 mil e R$ 500 mil',
  'Entre R$ 500 mil e R$ 1 milhão',
  'Entre R$ 1 milhão e R$ 5 milhões',
  'Acima de R$ 5 milhões',
];

// Verifica se o card qualifica como MQL baseado no faturamento
export function isMqlQualified(faixaFaturamento?: string): boolean {
  if (!faixaFaturamento) return false;
  return MQL_QUALIFYING_TIERS.includes(faixaFaturamento);
}

// Motivos de perda que excluem o card da contagem de MQL
export const MQL_EXCLUDED_LOSS_REASONS = [
  'Duplicado',
  'Pessoa física, fora do ICP',
  'Não é uma demanda real',
  'Buscando parceria',
  'Quer soluções para cliente',
  'Não é MQL, mas entrou como MQL',
  'Email/Telefone Inválido',
];
// Normalize string: trim, lowercase, remove accents, collapse whitespace
export function normalizeStr(s: string): string {
  return s.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');
}

// Títulos de cards de teste (normalizados) que devem ser excluídos da contagem
const TEST_CARD_IDS = new Set([
  '1320546949', // TESTE
  '1320177174', // 123
  '1308003007', // Empresa Teste
  '1320175421', // teste duda
]);

export function isTestCard(id?: string): boolean {
  if (!id) return false;
  return TEST_CARD_IDS.has(id);
}

const NORMALIZED_EXCLUDED_REASONS = MQL_EXCLUDED_LOSS_REASONS.map(normalizeStr);

// Verifica se o card deve ser excluído da contagem de MQL por motivo de perda
export function isMqlExcludedByLoss(faseAtual?: string, motivoPerda?: string): boolean {
  if (!motivoPerda) return false;
  const normalizado = normalizeStr(motivoPerda);
  return NORMALIZED_EXCLUDED_REASONS.includes(normalizado);
}

// Build a Set of card IDs that should be excluded from MQL counting.
// A card is excluded if ANY of its rows has an excluded loss reason.
export function buildExcludedMqlCardIds(rows: Array<{ id: string; motivoPerda?: string }>): Set<string> {
  const excluded = new Set<string>();
  for (const row of rows) {
    if (row.motivoPerda && isMqlExcludedByLoss(undefined, row.motivoPerda)) {
      excluded.add(row.id);
    }
  }
  return excluded;
}

interface ModeloAtualMetasResult {
  movements: ModeloAtualMovement[];
  mqlByCreation: ModeloAtualMovement[];
}

// Map phase names to indicator keys (based on pipefy_moviment_cfos table)
const PHASE_TO_INDICATOR: Record<string, ModeloAtualIndicator> = {
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

export function useModeloAtualMetas(startDate?: Date, endDate?: Date) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['modelo-atual-metas', startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async (): Promise<ModeloAtualMetasResult> => {
      // Use server-side filtering when dates are provided
      const hasDateFilter = startDate && endDate;
      const action = hasDateFilter ? 'query_period' : 'preview';
      
      // Build UTC-pure date strings to avoid timezone offset issues
      const startDateStr = startDate ? startDate.toISOString().split('T')[0] : '';
      const endDateStr = endDate ? endDate.toISOString().split('T')[0] : '';
      const startISO = startDateStr ? startDateStr + 'T00:00:00.000Z' : undefined;
      const endISO = endDateStr ? endDateStr + 'T23:59:59.999Z' : undefined;

      console.log(`[useModeloAtualMetas] Fetching data from pipefy_moviment_cfos (action: ${action}, start: ${startISO}, end: ${endISO})`);
      
      // Fetch period movements, cards created in period (for MQL), and cards signed in period
      const requests: Promise<any>[] = [
        supabase.functions.invoke('query-external-db', {
          body: { 
            table: 'pipefy_moviment_cfos', 
            action,
            startDate: startISO,
            endDate: endISO,
            limit: 10000 
          }
        }),
      ];
      
      // Also fetch by creation date for MQL and by signature date for sales
      if (hasDateFilter) {
        requests.push(
          supabase.functions.invoke('query-external-db', {
            body: { 
              table: 'pipefy_moviment_cfos', 
              action: 'query_period_by_creation',
              startDate: startISO,
              endDate: endISO,
              limit: 10000 
            }
          }),
          supabase.functions.invoke('query-external-db', {
            body: { 
              table: 'pipefy_moviment_cfos', 
              action: 'query_period_by_signature',
              startDate: startISO,
              endDate: endISO,
              limit: 10000 
            }
          })
        );
      }
      
      const responses = await Promise.all(requests);
      const [periodResponse, creationResponse, signatureResponse] = responses;

      if (periodResponse.error) {
        console.error('[useModeloAtualMetas] Error fetching data:', periodResponse.error);
        throw periodResponse.error;
      }

      if (!periodResponse.data?.data) {
        console.warn('[useModeloAtualMetas] No data returned');
        return { movements: [], mqlByCreation: [] };
      }

      console.log(`[useModeloAtualMetas] Raw data rows: ${periodResponse.data.data.length}`);

      const movements: ModeloAtualMovement[] = [];
      for (const row of periodResponse.data.data) {
        const id = String(row['ID'] || row['id'] || '');
        const fase = row['Fase'] || row['fase'] || '';
        let dataEntrada = parseDate(row['Entrada'] || row['entrada']) || new Date();
        
        // Skip if no valid phase mapping
        if (!fase || !PHASE_TO_INDICATOR[fase]) continue;

        const faixaFaturamento = row['Faixa de faturamento mensal'] || row['Faixa'] || row['faixa'] || '';
        const rawMRR = row['Valor MRR'] || row['valor_mrr'] || 0;
        const rawPontual = row['Valor Pontual'] || row['valor_pontual'] || 0;
        const rawEducacao = row['Valor Educação'] || row['Valor Educacao'] || row['valor_educacao'] || 0;
        const rawSetup = row['Valor Setup'] || row['valor_setup'] || 0;

        const valorMRR = parseNumericValue(rawMRR);
        const valorPontual = parseNumericValue(rawPontual);
        const valorEducacao = parseNumericValue(rawEducacao);
        const valorSetup = parseNumericValue(rawSetup);
        const titulo = row['Título'] || row['titulo'] || row['Nome'] || '';
        const dataCriacao = parseDate(row['Data Criação']);
        const dataAssinatura = parseDateOnly(row['Data de assinatura do contrato']);

        // For 'Contrato assinado' phase: prioritize signature date over entry date
        // Apply date inversion fix before using signature date
        if (fase === 'Contrato assinado' && dataAssinatura) {
          dataEntrada = fixPossibleDateInversion(dataAssinatura, dataEntrada);
        }

        movements.push({
          id,
          titulo,
          fase,
          faseAtual: row['Fase Atual'] || row['fase_atual'] || fase,
          motivoPerda: row['Motivo da perda'] || row['motivo_perda'] || undefined,
          dataEntrada,
          dataCriacao,
          dataAssinatura,
          valorMRR,
          valorPontual,
          valorEducacao,
          valorSetup,
          valor: valorMRR + valorPontual + valorEducacao + valorSetup,
          faixaFaturamento: faixaFaturamento || undefined,
        });
      }

      // Parse MQL-by-creation movements (skip phase filter)
      const mqlByCreation: ModeloAtualMovement[] = [];
      if (creationResponse?.data?.data) {
        for (const row of creationResponse.data.data) {
          const id = String(row['ID'] || row['id'] || '');
          if (!id) continue;
          const dataCriacao = parseDate(row['Data Criação']);
          const faixaFaturamento = row['Faixa de faturamento mensal'] || row['Faixa'] || row['faixa'] || '';
          
          mqlByCreation.push({
            id,
            titulo: row['Título'] || row['titulo'] || row['Nome'] || '',
            fase: row['Fase'] || row['fase'] || '',
            faseAtual: row['Fase Atual'] || row['fase_atual'] || '',
            motivoPerda: row['Motivo da perda'] || row['motivo_perda'] || undefined,
            dataEntrada: parseDate(row['Entrada'] || row['entrada']) || new Date(),
            dataCriacao,
            dataAssinatura: parseDateOnly(row['Data de assinatura do contrato']),
            valorMRR: parseNumericValue(row['Valor MRR'] || 0),
            valorPontual: parseNumericValue(row['Valor Pontual'] || 0),
            valorEducacao: parseNumericValue(row['Valor Educação'] || 0),
            valorSetup: parseNumericValue(row['Valor Setup'] || 0),
            valor: 0,
            faixaFaturamento: faixaFaturamento || undefined,
          });
        }
        console.log(`[useModeloAtualMetas] MQL by creation cards: ${mqlByCreation.length}`);
      }

      // Merge signature-based movements (deduplicate by id + fase)
      if (signatureResponse?.data?.data) {
        const existingKeys = new Set(movements.map(m => `${m.id}|${m.fase}`));
        for (const row of signatureResponse.data.data) {
          const id = String(row['ID'] || row['id'] || '');
          const fase = row['Fase'] || row['fase'] || '';
          if (!id || !fase || !PHASE_TO_INDICATOR[fase]) continue;
          const key = `${id}|${fase}`;
          if (existingKeys.has(key)) continue;
          
          const dataAssinatura = parseDateOnly(row['Data de assinatura do contrato']);
          let dataEntrada = parseDate(row['Entrada'] || row['entrada']) || new Date();
          if (fase === 'Contrato assinado' && dataAssinatura) {
            dataEntrada = fixPossibleDateInversion(dataAssinatura, dataEntrada);
          }
          const valorMRR = parseNumericValue(row['Valor MRR'] || 0);
          const valorPontual = parseNumericValue(row['Valor Pontual'] || 0);
          const valorEducacao = parseNumericValue(row['Valor Educação'] || row['Valor Educacao'] || 0);
          const valorSetup = parseNumericValue(row['Valor Setup'] || 0);
          
          movements.push({
            id,
            titulo: row['Título'] || row['titulo'] || row['Nome'] || '',
            fase,
            faseAtual: row['Fase Atual'] || row['fase_atual'] || fase,
            motivoPerda: row['Motivo da perda'] || row['motivo_perda'] || undefined,
            dataEntrada,
            dataCriacao: parseDate(row['Data Criação']),
            dataAssinatura,
            valorMRR,
            valorPontual,
            valorEducacao,
            valorSetup,
            valor: valorMRR + valorPontual + valorEducacao + valorSetup,
            faixaFaturamento: (row['Faixa de faturamento mensal'] || row['Faixa'] || row['faixa'] || '') || undefined,
          });
          existingKeys.add(key);
        }
        console.log(`[useModeloAtualMetas] After signature merge: ${movements.length} movements`);
      }

      console.log(`[useModeloAtualMetas] Parsed ${movements.length} valid movements`);
      const uniquePhases = [...new Set(movements.map(m => m.fase))];
      console.log(`[useModeloAtualMetas] Unique phases:`, uniquePhases);

      return { movements, mqlByCreation };
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const movements = data?.movements ?? [];
  const mqlByCreation = data?.mqlByCreation ?? [];

  // Pre-compute excluded MQL card IDs (card-level: any row with excluded reason excludes the whole card)
  const excludedMqlIds = buildExcludedMqlCardIds(mqlByCreation);

  // Get total qty for a specific indicator and date range
  const getQtyForPeriod = (indicator: ModeloAtualIndicator, start?: Date, end?: Date): number => {
    const startTime = start ? new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime() : 0;
    const endTime = end ? new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999).getTime() : Date.now();

    // MQL: Use creation date logic (aligned with Pipefy) - card-level exclusion
    if (indicator === 'mql') {
      const seenIds = new Set<string>();
      for (const movement of mqlByCreation) {
        if (!movement.dataCriacao) continue;
        const creationTime = movement.dataCriacao.getTime();
        if (creationTime >= startTime && creationTime <= endTime && isMqlQualified(movement.faixaFaturamento) && !isTestCard(movement.id) && !excludedMqlIds.has(movement.id) && !seenIds.has(movement.id)) {
          seenIds.add(movement.id);
        }
      }
      console.log(`[useModeloAtualMetas] getQtyForPeriod mql (by creation): ${seenIds.size}`);
      return seenIds.size;
    }

    if (movements.length === 0) return 0;

    // Count unique cards that entered the indicator phase in the period
    const seenIds = new Set<string>();
    for (const movement of movements) {
      const moveTime = movement.dataEntrada.getTime();
      if (moveTime >= startTime && moveTime <= endTime) {
        const moveIndicator = PHASE_TO_INDICATOR[movement.fase];
        
        if (indicator === 'leads') {
          if ((moveIndicator === 'leads' || moveIndicator === 'mql') && !seenIds.has(movement.id)) {
            seenIds.add(movement.id);
          }
        } else if (moveIndicator === indicator && !seenIds.has(movement.id)) {
          seenIds.add(movement.id);
        }
      }
    }

    const total = seenIds.size;
    console.log(`[useModeloAtualMetas] getQtyForPeriod ${indicator}: ${total}`);
    return total;
  };

  // Get total value for a specific indicator and date range
  const getValueForPeriod = (indicator: ModeloAtualIndicator, start?: Date, end?: Date): number => {
    if (movements.length === 0) return 0;

    const startTime = start ? new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime() : 0;
    const endTime = end ? new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999).getTime() : Date.now();

    // Sum values for unique cards in the indicator phase within the period
    const cardValues = new Map<string, { valor: number; titulo: string; mrr: number; pontual: number; educacao: number; setup: number }>();
    for (const movement of movements) {
      const moveTime = movement.dataEntrada.getTime();
      if (moveTime >= startTime && moveTime <= endTime) {
        const moveIndicator = PHASE_TO_INDICATOR[movement.fase];
        if (moveIndicator === indicator) {
          // Keep the latest value for each card
          const existing = cardValues.get(movement.id);
          if (!existing || movement.valor > existing.valor) {
            cardValues.set(movement.id, {
              valor: movement.valor,
              titulo: movement.titulo,
              mrr: movement.valorMRR,
              pontual: movement.valorPontual,
              educacao: movement.valorEducacao,
              setup: movement.valorSetup,
            });
          }
        }
      }
    }

    let total = 0;
    const details: string[] = [];
    cardValues.forEach((data, cardId) => {
      const valorFinal = data.valor > 0 ? data.valor : 17000;
      total += valorFinal;
      details.push(`  - Card ${cardId} (${data.titulo}): MRR=${data.mrr}, Pontual=${data.pontual}, Educação=${data.educacao}, Setup=${data.setup} → Total: R$ ${valorFinal.toLocaleString('pt-BR')}`);
    });

    console.log(`[useModeloAtualMetas] getValueForPeriod ${indicator}:`);
    console.log(`  Cards encontrados: ${cardValues.size}`);
    details.forEach(d => console.log(d));
    console.log(`  TOTAL: R$ ${total.toLocaleString('pt-BR')}`);
    
    return total;
  };

  // Helper: count unique cards for a time window
  const countForWindow = (indicator: ModeloAtualIndicator, windowStart: number, windowEnd: number): number => {
    // MQL: Use creation date logic - card-level exclusion
    if (indicator === 'mql') {
      const seenIds = new Set<string>();
      for (const m of mqlByCreation) {
        if (!m.dataCriacao) continue;
        const t = m.dataCriacao.getTime();
        if (t >= windowStart && t <= windowEnd && isMqlQualified(m.faixaFaturamento) && !seenIds.has(m.id)) {
          seenIds.add(m.id);
        }
      }
      return seenIds.size;
    }
    
    const seenIds = new Set<string>();
    for (const movement of movements) {
      const moveTime = movement.dataEntrada.getTime();
      if (moveTime >= windowStart && moveTime <= windowEnd) {
        const moveIndicator = PHASE_TO_INDICATOR[movement.fase];
        if (indicator === 'leads') {
          if ((moveIndicator === 'leads' || moveIndicator === 'mql') && !seenIds.has(movement.id)) {
            seenIds.add(movement.id);
          }
        } else if (moveIndicator === indicator && !seenIds.has(movement.id)) {
          seenIds.add(movement.id);
        }
      }
    }
    return seenIds.size;
  };

  // Get grouped data for charts
  const getGroupedData = (indicator: ModeloAtualIndicator, start: Date, end: Date, grouping: ChartGrouping): { qty: number[]; meta: number[] } => {
    if (indicator !== 'mql' && movements.length === 0) return { qty: [], meta: [] };
    if (indicator === 'mql' && mqlByCreation.length === 0 && movements.length === 0) return { qty: [], meta: [] };

    const qtyArray: number[] = [];
    const metaArray: number[] = [];

    if (grouping === 'daily') {
      const days = eachDayOfInterval({ start, end });
      for (const day of days) {
        const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
        const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999).getTime();
        qtyArray.push(countForWindow(indicator, dayStart, dayEnd));
        metaArray.push(0);
      }
    } else if (grouping === 'weekly') {
      const totalDays = differenceInDays(end, start) + 1;
      const numWeeks = Math.ceil(totalDays / 7);
      for (let i = 0; i < numWeeks; i++) {
        const weekStart = addDays(start, i * 7);
        const weekEnd = i === numWeeks - 1 ? end : addDays(weekStart, 6);
        const weekStartTime = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate()).getTime();
        const weekEndTime = new Date(weekEnd.getFullYear(), weekEnd.getMonth(), weekEnd.getDate(), 23, 59, 59, 999).getTime();
        qtyArray.push(countForWindow(indicator, weekStartTime, weekEndTime));
        metaArray.push(0);
      }
    } else {
      const months = eachMonthOfInterval({ start, end });
      for (const monthDate of months) {
        const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1).getTime();
        const lastDay = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
        const monthEnd = new Date(lastDay.getFullYear(), lastDay.getMonth(), lastDay.getDate(), 23, 59, 59, 999).getTime();
        qtyArray.push(countForWindow(indicator, monthStart, monthEnd));
        metaArray.push(0);
      }
    }

    return { qty: qtyArray, meta: metaArray };
  };

  // Get MRR value for a specific period (sum of valorMRR from 'Ganho' phase cards)
  const getMrrForPeriod = (start?: Date, end?: Date): number => {
    if (movements.length === 0) return 0;

    const startTime = start ? new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime() : 0;
    const endTime = end ? new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999).getTime() : Date.now();

    const cardValues = new Map<string, number>();
    for (const movement of movements) {
      const moveTime = movement.dataEntrada.getTime();
      if (moveTime >= startTime && moveTime <= endTime) {
        const moveIndicator = PHASE_TO_INDICATOR[movement.fase];
        if (moveIndicator === 'venda') {
          const existing = cardValues.get(movement.id);
          if (!existing || movement.valorMRR > existing) {
            cardValues.set(movement.id, movement.valorMRR);
          }
        }
      }
    }

    let total = 0;
    cardValues.forEach((value) => {
      total += value;
    });
    return total;
  };

  // Get Setup value for a specific period (sum of valorSetup from 'Ganho' phase cards)
  const getSetupForPeriod = (start?: Date, end?: Date): number => {
    if (movements.length === 0) return 0;

    const startTime = start ? new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime() : 0;
    const endTime = end ? new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999).getTime() : Date.now();

    const cardValues = new Map<string, number>();
    for (const movement of movements) {
      const moveTime = movement.dataEntrada.getTime();
      if (moveTime >= startTime && moveTime <= endTime) {
        const moveIndicator = PHASE_TO_INDICATOR[movement.fase];
        if (moveIndicator === 'venda') {
          const existing = cardValues.get(movement.id);
          if (!existing || movement.valorSetup > existing) {
            cardValues.set(movement.id, movement.valorSetup);
          }
        }
      }
    }

    let total = 0;
    cardValues.forEach((value) => {
      total += value;
    });
    return total;
  };

  // Get Pontual value for a specific period (sum of valorPontual from 'Ganho' phase cards)
  const getPontualForPeriod = (start?: Date, end?: Date): number => {
    if (movements.length === 0) return 0;

    const startTime = start ? new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime() : 0;
    const endTime = end ? new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999).getTime() : Date.now();

    const cardValues = new Map<string, number>();
    for (const movement of movements) {
      const moveTime = movement.dataEntrada.getTime();
      if (moveTime >= startTime && moveTime <= endTime) {
        const moveIndicator = PHASE_TO_INDICATOR[movement.fase];
        if (moveIndicator === 'venda') {
          const existing = cardValues.get(movement.id);
          if (!existing || movement.valorPontual > existing) {
            cardValues.set(movement.id, movement.valorPontual);
          }
        }
      }
    }

    let total = 0;
    cardValues.forEach((value) => {
      total += value;
    });
    return total;
  };

  // Get Educação value for a specific period (sum of valorEducacao from 'Contrato assinado' phase cards)
  const getEducacaoForPeriod = (start?: Date, end?: Date): number => {
    if (movements.length === 0) return 0;

    const startTime = start ? new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime() : 0;
    const endTime = end ? new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999).getTime() : Date.now();

    const cardValues = new Map<string, number>();
    for (const movement of movements) {
      const moveTime = movement.dataEntrada.getTime();
      if (moveTime >= startTime && moveTime <= endTime) {
        const moveIndicator = PHASE_TO_INDICATOR[movement.fase];
        if (moveIndicator === 'venda') {
          const existing = cardValues.get(movement.id);
          if (!existing || movement.valorEducacao > existing) {
            cardValues.set(movement.id, movement.valorEducacao);
          }
        }
      }
    }

    let total = 0;
    cardValues.forEach((value) => {
      total += value;
    });
    return total;
  };

  return {
    movements,
    isLoading,
    error,
    refetch,
    getQtyForPeriod,
    getValueForPeriod,
    getGroupedData,
    getMrrForPeriod,
    getSetupForPeriod,
    getPontualForPeriod,
    getEducacaoForPeriod,
  };
}

