import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { eachDayOfInterval, eachMonthOfInterval, addDays, differenceInDays } from "date-fns";

export type CloserIndicator = 'rm' | 'rr' | 'proposta' | 'venda';
export type ChartGrouping = 'daily' | 'weekly' | 'monthly';

interface CloserRow {
  date: Date;
  fase: string;
  qty: number;
  meta: number;
}

interface ClosersMetasResult {
  rows: CloserRow[];
}

// Map sheet phase names to indicator keys
const PHASE_TO_INDICATOR: Record<string, CloserIndicator> = {
  'Reunião agendada / Qualificado': 'rm',
  'Reunião Realizada': 'rr',
  'Proposta enviada / Follow Up': 'proposta',
  'Ganho': 'venda',
};

// Parse Google Sheets date format "Date(year,month,day)" to JS Date
function parseGoogleDate(dateValue: any): Date | null {
  if (!dateValue) return null;
  
  if (typeof dateValue === 'string') {
    const match = dateValue.match(/Date\((\d+),(\d+),(\d+)\)/);
    if (match) {
      return new Date(parseInt(match[1]), parseInt(match[2]), parseInt(match[3]));
    }
    // Try ISO format
    const date = new Date(dateValue);
    if (!isNaN(date.getTime())) return date;
  }
  
  return null;
}

export function useClosersMetas(startDate?: Date, endDate?: Date) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['closers-metas', startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async (): Promise<ClosersMetasResult> => {
      const { data: responseData, error: fetchError } = await supabase.functions.invoke('read-sheet-tab', {
        body: { sheetName: 'vendas closers', maxRows: 5000 }
      });

      if (fetchError) {
        console.error('Error fetching closers metas:', fetchError);
        throw fetchError;
      }

      if (!responseData?.success || !responseData?.data) {
        console.warn('No data returned from sheet');
        return { rows: [] };
      }

      // Parse the data
      const rows: CloserRow[] = [];
      for (const row of responseData.data) {
        const date = parseGoogleDate(row.Data);
        if (!date) continue;
        
        const fase = row.Fase as string;
        if (!fase || !PHASE_TO_INDICATOR[fase]) continue;
        
        rows.push({
          date,
          fase,
          qty: typeof row.Qtd === 'number' ? row.Qtd : 0,
          meta: typeof row.Meta === 'number' ? row.Meta : 0,
        });
      }

      return { rows };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  // Get total qty for a specific indicator and date range
  const getQtyForPeriod = (indicator: CloserIndicator, start?: Date, end?: Date): number => {
    if (!data?.rows || data.rows.length === 0) return 0;
    
    const startTime = start ? new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime() : 0;
    const endTime = end ? new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999).getTime() : Date.now();
    
    let total = 0;
    for (const row of data.rows) {
      const rowTime = row.date.getTime();
      if (rowTime >= startTime && rowTime <= endTime) {
        const rowIndicator = PHASE_TO_INDICATOR[row.fase];
        if (rowIndicator === indicator) {
          total += row.qty;
        }
      }
    }
    
    console.log(`[useClosersMetas] getQtyForPeriod ${indicator}: ${total}`);
    return Math.round(total);
  };

  // Get total meta for a specific indicator and date range
  const getMetaForPeriod = (indicator: CloserIndicator, start?: Date, end?: Date): number => {
    if (!data?.rows || data.rows.length === 0) return 0;
    
    const startTime = start ? new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime() : 0;
    const endTime = end ? new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999).getTime() : Date.now();
    
    let total = 0;
    for (const row of data.rows) {
      const rowTime = row.date.getTime();
      if (rowTime >= startTime && rowTime <= endTime) {
        const rowIndicator = PHASE_TO_INDICATOR[row.fase];
        if (rowIndicator === indicator) {
          total += row.meta;
        }
      }
    }
    
    console.log(`[useClosersMetas] getMetaForPeriod ${indicator}: ${total}`);
    return Math.round(total);
  };

  // Get grouped data for charts (returns array of values per period)
  const getGroupedData = (indicator: CloserIndicator, start: Date, end: Date, grouping: ChartGrouping): { qty: number[]; meta: number[] } => {
    if (!data?.rows || data.rows.length === 0) return { qty: [], meta: [] };

    const qtyArray: number[] = [];
    const metaArray: number[] = [];

    if (grouping === 'daily') {
      const days = eachDayOfInterval({ start, end });
      for (const day of days) {
        const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
        const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999).getTime();
        
        let dayQty = 0;
        let dayMeta = 0;
        for (const row of data.rows) {
          const rowTime = row.date.getTime();
          if (rowTime >= dayStart && rowTime <= dayEnd) {
            const rowIndicator = PHASE_TO_INDICATOR[row.fase];
            if (rowIndicator === indicator) {
              dayQty += row.qty;
              dayMeta += row.meta;
            }
          }
        }
        qtyArray.push(Math.round(dayQty));
        metaArray.push(Math.round(dayMeta));
      }
    } else if (grouping === 'weekly') {
      const totalDays = differenceInDays(end, start) + 1;
      const numWeeks = Math.ceil(totalDays / 7);
      
      for (let i = 0; i < numWeeks; i++) {
        const weekStart = addDays(start, i * 7);
        const weekEnd = i === numWeeks - 1 ? end : addDays(weekStart, 6);
        
        const weekStartTime = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate()).getTime();
        const weekEndTime = new Date(weekEnd.getFullYear(), weekEnd.getMonth(), weekEnd.getDate(), 23, 59, 59, 999).getTime();
        
        let weekQty = 0;
        let weekMeta = 0;
        for (const row of data.rows) {
          const rowTime = row.date.getTime();
          if (rowTime >= weekStartTime && rowTime <= weekEndTime) {
            const rowIndicator = PHASE_TO_INDICATOR[row.fase];
            if (rowIndicator === indicator) {
              weekQty += row.qty;
              weekMeta += row.meta;
            }
          }
        }
        qtyArray.push(Math.round(weekQty));
        metaArray.push(Math.round(weekMeta));
      }
    } else {
      // Monthly
      const months = eachMonthOfInterval({ start, end });
      for (const monthDate of months) {
        const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1).getTime();
        const lastDay = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
        const monthEnd = new Date(lastDay.getFullYear(), lastDay.getMonth(), lastDay.getDate(), 23, 59, 59, 999).getTime();
        
        let monthQty = 0;
        let monthMeta = 0;
        for (const row of data.rows) {
          const rowTime = row.date.getTime();
          if (rowTime >= monthStart && rowTime <= monthEnd) {
            const rowIndicator = PHASE_TO_INDICATOR[row.fase];
            if (rowIndicator === indicator) {
              monthQty += row.qty;
              monthMeta += row.meta;
            }
          }
        }
        qtyArray.push(Math.round(monthQty));
        metaArray.push(Math.round(monthMeta));
      }
    }

    return { qty: qtyArray, meta: metaArray };
  };

  return {
    rows: data?.rows ?? [],
    isLoading,
    error,
    getQtyForPeriod,
    getMetaForPeriod,
    getGroupedData,
  };
}
