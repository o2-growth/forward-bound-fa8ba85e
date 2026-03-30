import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { eachDayOfInterval, eachMonthOfInterval, addDays, differenceInDays } from "date-fns";

export type ExpansaoIndicator = 'leads' | 'mql' | 'rm' | 'rr' | 'proposta' | 'venda';
export type ChartGrouping = 'daily' | 'weekly' | 'monthly';

interface ExpansaoMovement {
  id: string;
  titulo: string;
  fase: string;           // Phase name from movement
  faseAtual: string;      // Current phase of the card
  dataEntrada: Date;      // When entered this phase
  dataSaida: Date | null; // When left this phase
  valorMRR: number | null;
  valorPontual: number | null;
  valorSetup: number | null;
  taxaFranquia: number | null; // Taxa de franquia (R$ 140.000 para Franquia)
  investimentoDisponivel: string | null;
  produto: string;
}

// Faixas de investimento que qualificam como MQL para Franquia (>= R$ 140k)
const FRANQUIA_MQL_QUALIFYING_TIERS = [
  'Menos de 140 mil reais',
  'Menos de 250 mil reais',
  'Menos de 360 mil reais',
  'Menos de 400 mil reais',
  'Menos de 500 mil reais',
  'Mais de 500 mil reais',
];

function isFranquiaMqlQualified(investimento: string | null): boolean {
  if (!investimento) return false;
  return FRANQUIA_MQL_QUALIFYING_TIERS.includes(investimento);
}

interface ExpansaoMetasResult {
  movements: ExpansaoMovement[];
}

// Map Pipefy phase names to indicator keys
const PHASE_TO_INDICATOR: Record<string, ExpansaoIndicator> = {
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

export function useExpansaoMetas(startDate?: Date, endDate?: Date) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['expansao-metas-movements', startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async (): Promise<ExpansaoMetasResult> => {
      // Use movements table for accurate phase tracking
      const { data: responseData, error: fetchError } = await supabase.functions.invoke('query-external-db', {
        body: { table: 'pipefy_cards_movements_expansao', action: 'preview', limit: 5000 }
      });

      if (fetchError) {
        console.error('Error fetching expansao movements:', fetchError);
        throw fetchError;
      }

      if (!responseData?.data) {
        console.warn('No data returned from external db for expansao movements');
        return { movements: [] };
      }

      // Parse movements - each row is a phase transition
      // Filter only "Franquia" products for this hook
      const movements: ExpansaoMovement[] = [];
      
      for (const row of responseData.data) {
        const produto = row['Produtos'] || '';
        
        // Filter only "Franquia" products for this hook
        if (produto !== 'Franquia') continue;
        
        const movement: ExpansaoMovement = {
          id: String(row.ID),
          titulo: row['Título'] || '',
          fase: row['Fase'] || '',  // This is the phase name from movement
          faseAtual: row['Fase Atual'] || '', // Current phase of the card
          dataEntrada: parseDate(row['Entrada']) || new Date(),
          dataSaida: parseDate(row['Saída']),
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
      console.log(`[useExpansaoMetas] Loaded ${movements.length} Franquia movements from pipefy_cards_movements_expansao`);
      console.log(`[useExpansaoMetas] Unique phases:`, uniquePhases);
      console.log(`[useExpansaoMetas] Unique fases atuais:`, uniqueFasesAtuais);
      
      return { movements };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  // Build investimento map per card
  const cardInvestimento = new Map<string, string | null>();
  if (data?.movements) {
    for (const m of data.movements) {
      if (m.investimentoDisponivel && !cardInvestimento.has(m.id)) {
        cardInvestimento.set(m.id, m.investimentoDisponivel);
      }
    }
  }

  // Get total qty for a specific indicator and date range
  // Count UNIQUE CARDS that entered a phase during the period
  const getQtyForPeriod = (indicator: ExpansaoIndicator, start?: Date, end?: Date): number => {
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
          // MQL: cards em fase "Lead" ou "MQL" com investimento qualificado (>= R$ 140k)
          if (movement.fase === 'Lead' || movement.fase === 'MQL') {
            const inv = cardInvestimento.get(movement.id) || null;
            if (isFranquiaMqlQualified(inv)) {
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
    
    console.log(`[useExpansaoMetas] getQtyForPeriod ${indicator}: ${uniqueCards.size} unique cards`);
    return uniqueCards.size;
  };

  // Get total monetary value for a specific indicator and date range
  // Sums: Valor Pontual + Valor Setup + Valor MRR (1x) for each UNIQUE card
  const getValueForPeriod = (indicator: ExpansaoIndicator, start?: Date, end?: Date): number => {
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
            if (isFranquiaMqlQualified(inv)) {
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
          
          if (taxaFranquia > 0) {
            cardValues.set(movement.id, taxaFranquia);
          } else {
            const pontual = movement.valorPontual || 0;
            const setup = movement.valorSetup || 0;
            const mrr = movement.valorMRR || 0;
            const sum = pontual + setup + mrr;
            cardValues.set(movement.id, sum > 0 ? sum : 140000); // fallback R$ 140k
          }
        }
      }
    }
    
    const totalValue = Array.from(cardValues.values()).reduce((sum, val) => sum + val, 0);
    console.log(`[useExpansaoMetas] getValueForPeriod ${indicator}: ${totalValue}`);
    return totalValue;
  };

  // Get total meta for a specific indicator and date range
  const getMetaForPeriod = (indicator: ExpansaoIndicator, start?: Date, end?: Date): number => {
    if (!start || !end) return 0;
    
    const daysInPeriod = differenceInDays(end, start) + 1;
    const periodFraction = daysInPeriod / 365;
    
    // Annual metas based on planning (updated to match real targets)
    const annualMetas: Record<ExpansaoIndicator, number> = {
      leads: 432,     // 36/month
      mql: 432,       // Igual a leads (sem critério separado de MQL para Franquia)
      rm: 144,        // 12/month
      rr: 72,         // 6/month
      proposta: 48,   // 4/month
      venda: 12,      // 1/month (12 franquias/year target)
    };
    
    return Math.round(annualMetas[indicator] * periodFraction);
  };

  // Get grouped data for charts (returns array of values per period)
  const getGroupedData = (indicator: ExpansaoIndicator, start: Date, end: Date, grouping: ChartGrouping): { qty: number[]; meta: number[] } => {
    if (!data?.movements || data.movements.length === 0) return { qty: [], meta: [] };

    const qtyArray: number[] = [];
    const metaArray: number[] = [];
    
    const daysInYear = 365;
    const annualMetas: Record<ExpansaoIndicator, number> = {
      leads: 432,
      mql: 432,
      rm: 144,
      rr: 72,
      proposta: 48,
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
              if (isFranquiaMqlQualified(inv)) {
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
