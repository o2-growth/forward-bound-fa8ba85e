import { useQuery } from "@tanstack/react-query";
import { fixPossibleDateInversion } from "./dateUtils";
import { supabase } from "@/integrations/supabase/client";
import { eachDayOfInterval, eachMonthOfInterval, addDays, differenceInDays } from "date-fns";

export type OxyHackerIndicator = 'leads' | 'mql' | 'rm' | 'rr' | 'proposta' | 'venda';
export type ChartGrouping = 'daily' | 'weekly' | 'monthly';

interface OxyHackerMovement {
  id: string;
  titulo: string;
  fase: string;           // Phase name from movement
  faseAtual: string;      // Current phase of the card
  dataEntrada: Date;      // When entered this phase (or signature date for sales)
  dataSaida: Date | null; // When left this phase
  dataAssinatura: Date | null; // Data de assinatura do contrato
  valorMRR: number | null;
  valorPontual: number | null;
  valorSetup: number | null;
  taxaFranquia: number | null; // Taxa de franquia (R$ 54.000 para Oxy Hacker)
  investimentoDisponivel: string | null;
  produto: string;
}

// MQL Expansão Oxy Hacker: investimento disponível >= R$ 15k
// Todas as faixas do Pipefy já são >= 15k, então qualquer investimento preenchido qualifica
function isOxyHackerMqlQualified(investimento: string | null): boolean {
  return !!investimento && investimento.trim().length > 0;
}

interface OxyHackerMetasResult {
  movements: OxyHackerMovement[];
}

// Map Pipefy phase names to indicator keys
const PHASE_TO_INDICATOR: Record<string, OxyHackerIndicator> = {
  'Start form': 'leads',
  'Lead': 'leads',
  'MQL': 'mql',
  'Reunião agendada / Qualificado': 'rm',
  'Reunião Realizada': 'rr',
  'Proposta enviada / Follow Up': 'proposta',
  'Contrato assinado': 'venda',
};

// Parse date string to JS Date
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

export function useOxyHackerMetas(startDate?: Date, endDate?: Date) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['oxy-hacker-metas-movements', startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async (): Promise<OxyHackerMetasResult> => {
      // Query by entry date AND by signature date in parallel
      // This captures sales signed in the period but entered later in Pipefy
      const [entryResponse, signatureResponse] = await Promise.all([
        supabase.functions.invoke('query-external-db', {
          body: { 
            table: 'pipefy_cards_movements_expansao', 
            action: 'query_period',
            startDate: startDate?.toISOString().split('T')[0] + 'T00:00:00',
            endDate: endDate?.toISOString().split('T')[0] + 'T23:59:59',
            limit: 10000 
          }
        }),
        supabase.functions.invoke('query-external-db', {
          body: { 
            table: 'pipefy_cards_movements_expansao', 
            action: 'query_period_by_signature',
            startDate: startDate?.toISOString().split('T')[0] + 'T00:00:00',
            endDate: endDate?.toISOString().split('T')[0] + 'T23:59:59',
            limit: 10000 
          }
        }),
      ]);

      if (entryResponse.error) {
        console.error('Error fetching oxy hacker movements by entry:', entryResponse.error);
        throw entryResponse.error;
      }

      // Merge results with deduplication by id + fase
      const allRows: any[] = [...(entryResponse.data?.data || [])];
      const seen = new Set<string>();
      for (const row of allRows) {
        seen.add(`${row.ID}_${row['Fase']}`);
      }
      
      // Add signature-period rows that weren't already in entry-period results
      if (signatureResponse.data?.data) {
        for (const row of signatureResponse.data.data) {
          const key = `${row.ID}_${row['Fase']}`;
          if (!seen.has(key)) {
            seen.add(key);
            allRows.push(row);
          }
        }
      }

      if (allRows.length === 0) {
        console.warn('No data returned from external db for oxy hacker movements');
        return { movements: [] };
      }

      // Parse movements - each row is a phase transition
      // Filter only "Oxy Hacker" products for this hook
      const movements: OxyHackerMovement[] = [];
      
      for (const row of allRows) {
        const produto = row['Produtos'] || '';
        
        // Filter only "Oxy Hacker" products for this hook
        if (produto !== 'Oxy Hacker') continue;
        
        const fase = row['Fase'] || '';
        const dataAssinatura = parseDateOnly(row['Data de assinatura do contrato']);
        
        // Para vendas (Contrato assinado), priorizar data de assinatura sobre data de entrada
        let dataEntrada = parseDate(row['Entrada']) || new Date();
        if (fase === 'Contrato assinado' && dataAssinatura) {
          dataEntrada = fixPossibleDateInversion(dataAssinatura, dataEntrada);
        }
        
        const movement: OxyHackerMovement = {
          id: String(row.ID),
          titulo: row['Título'] || '',
          fase,
          faseAtual: row['Fase Atual'] || '',
          dataEntrada,
          dataSaida: parseDate(row['Saída']),
          dataAssinatura,
          valorMRR: row['Valor MRR'] ? parseFloat(row['Valor MRR']) : null,
          valorPontual: row['Valor Pontual'] ? parseFloat(row['Valor Pontual']) : null,
          valorSetup: row['Valor Setup'] ? parseFloat(row['Valor Setup']) : null,
          taxaFranquia: row['Taxa de franquia'] ? parseFloat(row['Taxa de franquia']) : null,
          investimentoDisponivel: row['Investimento disponível'] || null,
          produto,
        };
        
        movements.push(movement);
      }

      // Log unique phases for debugging
      const uniquePhases = [...new Set(movements.map(m => m.fase))];
      const uniqueFasesAtuais = [...new Set(movements.map(m => m.faseAtual))];
      console.log(`[useOxyHackerMetas] Loaded ${movements.length} Oxy Hacker movements from pipefy_cards_movements_expansao`);
      console.log(`[useOxyHackerMetas] Unique phases:`, uniquePhases);
      console.log(`[useOxyHackerMetas] Unique fases atuais:`, uniqueFasesAtuais);
      
      return { movements };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  // Get total qty for a specific indicator and date range
  // Count UNIQUE CARDS that entered a phase during the period
  // Build investimento map per card (field is the same across all movements of a card)
  const cardInvestimento = new Map<string, string | null>();
  if (data?.movements) {
    for (const m of data.movements) {
      if (m.investimentoDisponivel && !cardInvestimento.has(m.id)) {
        cardInvestimento.set(m.id, m.investimentoDisponivel);
      }
    }
  }

  const getQtyForPeriod = (indicator: OxyHackerIndicator, start?: Date, end?: Date): number => {
    if (!data?.movements || data.movements.length === 0) return 0;

    const startTime = start ? new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime() : 0;
    const endTime = end ? new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999).getTime() : Date.now();

    const uniqueCards = new Set<string>();

    for (const movement of data.movements) {
      const entryTime = movement.dataEntrada.getTime();
      if (entryTime >= startTime && entryTime <= endTime) {
        const movementIndicator = PHASE_TO_INDICATOR[movement.fase];

        if (indicator === 'venda') {
          if (movement.fase === 'Contrato assinado') {
            uniqueCards.add(movement.id);
          }
        } else if (indicator === 'proposta') {
          if (movementIndicator === 'proposta') {
            uniqueCards.add(movement.id);
          }
        } else if (indicator === 'mql') {
          // MQL: cards que passaram por "Lead" ou "MQL" E tem investimento qualificado (>= R$ 54k)
          if (movement.fase === 'Lead' || movement.fase === 'MQL') {
            const inv = cardInvestimento.get(movement.id) || null;
            if (isOxyHackerMqlQualified(inv)) {
              uniqueCards.add(movement.id);
            }
          }
        } else {
          if (movementIndicator === indicator) {
            uniqueCards.add(movement.id);
          }
        }
      }
    }
    
    console.log(`[useOxyHackerMetas] getQtyForPeriod ${indicator}: ${uniqueCards.size} unique cards`);
    return uniqueCards.size;
  };

  // Get total monetary value for a specific indicator and date range
  // Sums: Valor Pontual + Valor Setup + Valor MRR (1x) for each UNIQUE card
  const getValueForPeriod = (indicator: OxyHackerIndicator, start?: Date, end?: Date): number => {
    if (!data?.movements || data.movements.length === 0) return 0;
    
    const startTime = start ? new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime() : 0;
    const endTime = end ? new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999).getTime() : Date.now();
    
    // Use Map to track unique cards and their values
    const cardValues = new Map<string, number>();
    
    for (const movement of data.movements) {
      const entryTime = movement.dataEntrada.getTime();
      if (entryTime >= startTime && entryTime <= endTime) {
        const movementIndicator = PHASE_TO_INDICATOR[movement.fase];
        let shouldCount = false;
        
        if (indicator === 'venda') {
          if (movement.fase === 'Contrato assinado') {
            shouldCount = true;
          }
        } else if (indicator === 'proposta') {
          if (movementIndicator === 'proposta') {
            shouldCount = true;
          }
        } else if (indicator === 'mql') {
          if (movement.fase === 'Lead' || movement.fase === 'MQL') {
            const inv = cardInvestimento.get(movement.id) || null;
            if (isOxyHackerMqlQualified(inv)) {
              shouldCount = true;
            }
          }
        } else {
          if (movementIndicator === indicator) {
            shouldCount = true;
          }
        }

        if (shouldCount && !cardValues.has(movement.id)) {
          const taxaFranquia = movement.taxaFranquia || 0;
          const defaultTicket = 54000;
          
          if (taxaFranquia > 0) {
            cardValues.set(movement.id, taxaFranquia);
          } else {
            // Tentar campos antigos, senão usar ticket padrão
            const pontual = movement.valorPontual || 0;
            const setup = movement.valorSetup || 0;
            const mrr = movement.valorMRR || 0;
            const sumValues = pontual + setup + mrr;
            cardValues.set(movement.id, sumValues > 0 ? sumValues : defaultTicket);
          }
        }
      }
    }
    
    const totalValue = Array.from(cardValues.values()).reduce((sum, val) => sum + val, 0);
    console.log(`[useOxyHackerMetas] getValueForPeriod ${indicator}: ${totalValue}`);
    return totalValue;
  };

  // Get total meta for a specific indicator and date range
  const getMetaForPeriod = (indicator: OxyHackerIndicator, start?: Date, end?: Date): number => {
    if (!start || !end) return 0;
    
    const daysInPeriod = differenceInDays(end, start) + 1;
    const periodFraction = daysInPeriod / 365;
    
    // Annual metas based on planning (updated to match real targets)
    const annualMetas: Record<OxyHackerIndicator, number> = {
      leads: 360,     // 30/month
      mql: 360,       // Igual a leads (sem critério separado de MQL para Oxy Hacker)
      rm: 120,        // 10/month
      rr: 60,         // 5/month
      proposta: 36,   // 3/month
      venda: 12,      // 1/month (12 oxy hackers/year target)
    };
    
    return Math.round(annualMetas[indicator] * periodFraction);
  };

  // Get grouped data for charts (returns array of values per period)
  const getGroupedData = (indicator: OxyHackerIndicator, start: Date, end: Date, grouping: ChartGrouping): { qty: number[]; meta: number[] } => {
    if (!data?.movements || data.movements.length === 0) return { qty: [], meta: [] };

    const qtyArray: number[] = [];
    const metaArray: number[] = [];
    
    const daysInYear = 365;
    const annualMetas: Record<OxyHackerIndicator, number> = {
      leads: 360,
      mql: 360,
      rm: 120,
      rr: 60,
      proposta: 36,
      venda: 12,
    };
    const dailyMeta = annualMetas[indicator] / daysInYear;

    // Helper function to count unique cards in a period
    const countUniqueCardsInPeriod = (periodStart: number, periodEnd: number): number => {
      const uniqueCards = new Set<string>();
      
      for (const movement of data.movements) {
        const entryTime = movement.dataEntrada.getTime();
        if (entryTime >= periodStart && entryTime <= periodEnd) {
          const movementIndicator = PHASE_TO_INDICATOR[movement.fase];
          
          if (indicator === 'venda') {
            if (movement.fase === 'Contrato assinado') {
              uniqueCards.add(movement.id);
            }
          } else if (indicator === 'proposta') {
            if (movementIndicator === 'proposta') {
              uniqueCards.add(movement.id);
            }
          } else if (indicator === 'mql') {
            if (movement.fase === 'Lead' || movement.fase === 'MQL') {
              const inv = cardInvestimento.get(movement.id) || null;
              if (isOxyHackerMqlQualified(inv)) {
                uniqueCards.add(movement.id);
              }
            }
          } else {
            if (movementIndicator === indicator) {
              uniqueCards.add(movement.id);
            }
          }
        }
      }
      
      return uniqueCards.size;
    };

    if (grouping === 'daily') {
      const days = eachDayOfInterval({ start, end });
      for (const day of days) {
        const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
        const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999).getTime();
        
        qtyArray.push(countUniqueCardsInPeriod(dayStart, dayEnd));
        metaArray.push(Math.round(dailyMeta));
      }
    } else if (grouping === 'weekly') {
      const totalDays = differenceInDays(end, start) + 1;
      const numWeeks = Math.ceil(totalDays / 7);
      
      for (let i = 0; i < numWeeks; i++) {
        const weekStart = addDays(start, i * 7);
        const weekEnd = i === numWeeks - 1 ? end : addDays(weekStart, 6);
        
        const weekStartTime = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate()).getTime();
        const weekEndTime = new Date(weekEnd.getFullYear(), weekEnd.getMonth(), weekEnd.getDate(), 23, 59, 59, 999).getTime();
        
        const daysInWeek = differenceInDays(weekEnd, weekStart) + 1;
        qtyArray.push(countUniqueCardsInPeriod(weekStartTime, weekEndTime));
        metaArray.push(Math.round(dailyMeta * daysInWeek));
      }
    } else {
      // Monthly
      const months = eachMonthOfInterval({ start, end });
      for (const monthDate of months) {
        const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1).getTime();
        const lastDay = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
        const monthEnd = new Date(lastDay.getFullYear(), lastDay.getMonth(), lastDay.getDate(), 23, 59, 59, 999).getTime();
        
        const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
        qtyArray.push(countUniqueCardsInPeriod(monthStart, monthEnd));
        metaArray.push(Math.round(dailyMeta * daysInMonth));
      }
    }

    return { qty: qtyArray, meta: metaArray };
  };

  return {
    movements: data?.movements ?? [],
    isLoading,
    error,
    refetch,
    getQtyForPeriod,
    getValueForPeriod,
    getMetaForPeriod,
    getGroupedData,
  };
}
