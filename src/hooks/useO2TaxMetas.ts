import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { eachDayOfInterval, eachMonthOfInterval, addDays, differenceInDays } from "date-fns";
import { isO2TaxMqlQualified } from "@/hooks/useO2TaxAnalytics";

export type O2TaxIndicator = 'leads' | 'mql' | 'rm' | 'rr' | 'proposta' | 'venda';
export type ChartGrouping = 'daily' | 'weekly' | 'monthly';

interface O2TaxMovement {
  id: string;
  titulo: string;
  fase: string;           // Phase name from movement
  faseAtual: string;      // Current phase of the card
  dataEntrada: Date;      // When entered this phase
  dataSaida: Date | null; // When left this phase
  dataCriacao: Date | null; // Creation date for MQL logic
  faixaFaturamento: string | null; // Revenue tier for MQL qualification
  valorMRR: number | null;
  valorPontual: number | null;
  valorSetup: number | null;
}

interface O2TaxMetasResult {
  movements: O2TaxMovement[];
  mqlByCreation: O2TaxMovement[];
}

// Map Pipefy phase names to indicator keys
// O2 TAX uses "1° Reunião Realizada - Apresentação" for RR
// Leads = cards that entered via "Start form" or "MQL"
const PHASE_TO_INDICATOR: Record<string, O2TaxIndicator> = {
  'Start form': 'leads',
  'MQL': 'mql',
  'Reunião agendada / Qualificado': 'rm',
  '1° Reunião Realizada - Apresentação': 'rr',
  'Proposta enviada / Follow Up': 'proposta',
  'Contrato assinado': 'venda',
};

// Parse date string to JS Date
function parseDate(dateValue: string | null): Date | null {
  if (!dateValue) return null;
  const date = new Date(dateValue);
  return isNaN(date.getTime()) ? null : date;
}

export function useO2TaxMetas(startDate?: Date, endDate?: Date) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['o2tax-movements-all'],
    queryFn: async (): Promise<O2TaxMetasResult> => {
      // Use movements table for accurate phase tracking
      const { data: responseData, error: fetchError } = await supabase.functions.invoke('query-external-db', {
        body: { table: 'pipefy_cards_movements', action: 'preview', limit: 5000 }
      });

      if (fetchError) {
        console.error('Error fetching O2 TAX movements:', fetchError);
        throw fetchError;
      }

      if (!responseData?.data) {
        console.warn('No data returned from external db for O2 TAX movements');
        return { movements: [], mqlByCreation: [] };
      }

      // Parse movements - each row is a phase transition
      const movements: O2TaxMovement[] = [];
      
      for (const row of responseData.data) {
        const movement: O2TaxMovement = {
          id: String(row.ID),
          titulo: row['Título'] || '',
          fase: row['Fase'] || '',
          faseAtual: row['Fase Atual'] || '',
          dataEntrada: parseDate(row['Entrada']) || new Date(),
          dataSaida: parseDate(row['Saída']),
          dataCriacao: parseDate(row['Data Criação']),
          faixaFaturamento: row['Faixa de faturamento mensal'] || null,
          valorMRR: row['Valor MRR'] ? parseFloat(row['Valor MRR']) : null,
          valorPontual: row['Valor Pontual'] ? parseFloat(row['Valor Pontual']) : null,
          valorSetup: row['Valor Setup'] ? parseFloat(row['Valor Setup']) : null,
        };
        
        movements.push(movement);
      }

      // Fetch MQL by creation date
      let mqlByCreation: O2TaxMovement[] = [];
      const { data: mqlCreationData, error: mqlCreationError } = await supabase.functions.invoke('query-external-db', {
        body: { table: 'pipefy_cards_movements', action: 'query_period_by_creation', limit: 5000 }
      });
      if (!mqlCreationError && mqlCreationData?.data) {
        mqlByCreation = mqlCreationData.data.map((row: any) => ({
          id: String(row.ID),
          titulo: row['Título'] || '',
          fase: row['Fase'] || '',
          faseAtual: row['Fase Atual'] || '',
          dataEntrada: parseDate(row['Entrada']) || new Date(),
          dataSaida: parseDate(row['Saída']),
          dataCriacao: parseDate(row['Data Criação']),
          faixaFaturamento: row['Faixa de faturamento mensal'] || null,
          valorMRR: row['Valor MRR'] ? parseFloat(row['Valor MRR']) : null,
          valorPontual: row['Valor Pontual'] ? parseFloat(row['Valor Pontual']) : null,
          valorSetup: row['Valor Setup'] ? parseFloat(row['Valor Setup']) : null,
        }));
        console.log(`[useO2TaxMetas] MQL by creation: ${mqlByCreation.length} movements`);
      }

      // Log unique phases for debugging
      const uniquePhases = [...new Set(movements.map(m => m.fase))];
      console.log(`[useO2TaxMetas] Loaded ${movements.length} movements from pipefy_cards_movements`);
      console.log(`[useO2TaxMetas] Unique phases:`, uniquePhases);
      
      return { movements, mqlByCreation };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  // Get total qty for a specific indicator and date range
  // MQL uses CREATION DATE + revenue >= R$ 500k
  const getQtyForPeriod = (indicator: O2TaxIndicator, start?: Date, end?: Date): number => {
    if (!data?.movements || data.movements.length === 0) return 0;
    
    const startTime = start ? new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime() : 0;
    const endTime = end ? new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999).getTime() : Date.now();
    
    // MQL: count by creation date + revenue qualification
    if (indicator === 'mql') {
      const uniqueCards = new Set<string>();
      for (const movement of (data.mqlByCreation || [])) {
        if (!movement.dataCriacao) continue;
        const creationTime = movement.dataCriacao.getTime();
        if (creationTime >= startTime && creationTime <= endTime && isO2TaxMqlQualified(movement.faixaFaturamento)) {
          uniqueCards.add(movement.id);
        }
      }
      console.log(`[useO2TaxMetas] getQtyForPeriod mql: ${uniqueCards.size} unique cards (creation + faixa >= 500k)`);
      return uniqueCards.size;
    }
    
    const uniqueCards = new Set<string>();
    
    for (const movement of data.movements) {
      const entryTime = movement.dataEntrada.getTime();
      if (entryTime >= startTime && entryTime <= endTime) {
        const movementIndicator = PHASE_TO_INDICATOR[movement.fase];
        
        if (indicator === 'leads') {
          if (movement.fase === 'Start form' || movement.fase === 'MQL') {
            uniqueCards.add(movement.id);
          }
        } else if (indicator === 'venda') {
          if (movement.fase === 'Contrato assinado') {
            uniqueCards.add(movement.id);
          }
        } else if (indicator === 'proposta') {
          if (movementIndicator === 'proposta') {
            uniqueCards.add(movement.id);
          }
        } else {
          if (movementIndicator === indicator) {
            uniqueCards.add(movement.id);
          }
        }
      }
    }
    
    console.log(`[useO2TaxMetas] getQtyForPeriod ${indicator}: ${uniqueCards.size} unique cards`);
    return uniqueCards.size;
  };

  // Get total monetary value for a specific indicator and date range
  // Sums: Valor Pontual + Valor Setup + Valor MRR (1x) for each UNIQUE card
  const getValueForPeriod = (indicator: O2TaxIndicator, start?: Date, end?: Date): number => {
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
          // For "venda", count unique cards that ENTERED "Contrato assinado" phase
          if (movement.fase === 'Contrato assinado') {
            shouldCount = true;
          }
        } else if (indicator === 'proposta') {
          // For "proposta", count ONLY cards that explicitly passed through proposta phases
          if (movementIndicator === 'proposta') {
            shouldCount = true;
          }
        } else {
          // For other indicators
          if (movementIndicator === indicator) {
            shouldCount = true;
          }
        }
        
        if (shouldCount && !cardValues.has(movement.id)) {
          // Sum: Valor Pontual + Valor Setup + Valor MRR (1x)
          const pontual = movement.valorPontual || 0;
          const setup = movement.valorSetup || 0;
          const mrr = movement.valorMRR || 0;
          cardValues.set(movement.id, pontual + setup + mrr);
        }
      }
    }
    
    const totalValue = Array.from(cardValues.values()).reduce((sum, val) => sum + val, 0);
    console.log(`[useO2TaxMetas] getValueForPeriod ${indicator}: ${totalValue}`);
    return totalValue;
  };

  // Get MRR value for cards that entered "Contrato assinado" in period
  const getMrrForPeriod = (start?: Date, end?: Date): number => {
    if (!data?.movements || data.movements.length === 0) return 0;
    
    const startTime = start ? new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime() : 0;
    const endTime = end ? new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999).getTime() : Date.now();
    
    const cardValues = new Map<string, number>();
    for (const movement of data.movements) {
      const entryTime = movement.dataEntrada.getTime();
      if (entryTime >= startTime && entryTime <= endTime) {
        if (movement.fase === 'Contrato assinado' && !cardValues.has(movement.id)) {
          cardValues.set(movement.id, movement.valorMRR || 0);
        }
      }
    }
    
    return Array.from(cardValues.values()).reduce((sum, val) => sum + val, 0);
  };

  // Get Setup value for cards that entered "Contrato assinado" in period
  const getSetupForPeriod = (start?: Date, end?: Date): number => {
    if (!data?.movements || data.movements.length === 0) return 0;
    
    const startTime = start ? new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime() : 0;
    const endTime = end ? new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999).getTime() : Date.now();
    
    const cardValues = new Map<string, number>();
    for (const movement of data.movements) {
      const entryTime = movement.dataEntrada.getTime();
      if (entryTime >= startTime && entryTime <= endTime) {
        if (movement.fase === 'Contrato assinado' && !cardValues.has(movement.id)) {
          cardValues.set(movement.id, movement.valorSetup || 0);
        }
      }
    }
    
    return Array.from(cardValues.values()).reduce((sum, val) => sum + val, 0);
  };

  // Get Pontual value for cards that entered "Contrato assinado" in period
  const getPontualForPeriod = (start?: Date, end?: Date): number => {
    if (!data?.movements || data.movements.length === 0) return 0;
    
    const startTime = start ? new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime() : 0;
    const endTime = end ? new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999).getTime() : Date.now();
    
    const cardValues = new Map<string, number>();
    for (const movement of data.movements) {
      const entryTime = movement.dataEntrada.getTime();
      if (entryTime >= startTime && entryTime <= endTime) {
        if (movement.fase === 'Contrato assinado' && !cardValues.has(movement.id)) {
          cardValues.set(movement.id, movement.valorPontual || 0);
        }
      }
    }
    
    return Array.from(cardValues.values()).reduce((sum, val) => sum + val, 0);
  };

  // Get total meta for a specific indicator and date range
  const getMetaForPeriod = (indicator: O2TaxIndicator, start?: Date, end?: Date): number => {
    if (!start || !end) return 0;
    
    const daysInPeriod = differenceInDays(end, start) + 1;
    const periodFraction = daysInPeriod / 365;
    
    // Annual metas based on planning (updated to match real targets)
    const annualMetas: Record<O2TaxIndicator, number> = {
      leads: 600,     // 50/month (estimated)
      mql: 504,       // 42/month
      rm: 180,        // 15/month
      rr: 96,         // 8/month
      proposta: 72,   // 6/month
      venda: 12,      // 1/month
    };
    
    return Math.round(annualMetas[indicator] * periodFraction);
  };

  // Get grouped data for charts (returns array of values per period)
  const getGroupedData = (indicator: O2TaxIndicator, start: Date, end: Date, grouping: ChartGrouping): { qty: number[]; meta: number[] } => {
    if (!data?.movements || data.movements.length === 0) return { qty: [], meta: [] };

    const qtyArray: number[] = [];
    const metaArray: number[] = [];
    
    const daysInYear = 365;
    const annualMetas: Record<O2TaxIndicator, number> = {
      leads: 600,
      mql: 504,
      rm: 180,
      rr: 96,
      proposta: 72,
      venda: 12,
    };
    const dailyMeta = annualMetas[indicator] / daysInYear;

    // Helper function to count unique cards in a period
    const countUniqueCardsInPeriod = (periodStart: number, periodEnd: number): number => {
      // MQL: use creation date + revenue qualification
      if (indicator === 'mql') {
        const uniqueCards = new Set<string>();
        for (const movement of (data.mqlByCreation || [])) {
          if (!movement.dataCriacao) continue;
          const creationTime = movement.dataCriacao.getTime();
          if (creationTime >= periodStart && creationTime <= periodEnd && isO2TaxMqlQualified(movement.faixaFaturamento)) {
            uniqueCards.add(movement.id);
          }
        }
        return uniqueCards.size;
      }

      const uniqueCards = new Set<string>();
      
      for (const movement of data.movements) {
        const entryTime = movement.dataEntrada.getTime();
        if (entryTime >= periodStart && entryTime <= periodEnd) {
          const movementIndicator = PHASE_TO_INDICATOR[movement.fase];
          
          if (indicator === 'leads') {
            if (movement.fase === 'Start form' || movement.fase === 'MQL') {
              uniqueCards.add(movement.id);
            }
          } else if (indicator === 'venda') {
            if (movement.fase === 'Contrato assinado') {
              uniqueCards.add(movement.id);
            }
          } else if (indicator === 'proposta') {
            if (movementIndicator === 'proposta') {
              uniqueCards.add(movement.id);
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
    getMrrForPeriod,
    getSetupForPeriod,
    getPontualForPeriod,
  };
}
