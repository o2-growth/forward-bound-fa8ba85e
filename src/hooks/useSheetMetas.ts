import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { eachDayOfInterval, eachMonthOfInterval, addDays, differenceInDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";

interface SheetMetaRow {
  date: Date;
  qty: number;
  meta: number;
}

interface SheetMetasResult {
  mqls: SheetMetaRow[];
}

export type ChartGrouping = 'daily' | 'weekly' | 'monthly';

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

export function useSheetMetas(startDate?: Date, endDate?: Date) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['sheet-metas', 'mqls', startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async (): Promise<SheetMetasResult> => {
      const { data: responseData, error: fetchError } = await supabase.functions.invoke('read-sheet-tab', {
        body: { sheetName: 'MQLs Meta', maxRows: 1000 }
      });

      if (fetchError) {
        console.error('Error fetching sheet metas:', fetchError);
        throw fetchError;
      }

      if (!responseData?.success || !responseData?.data) {
        console.warn('No data returned from sheet');
        return { mqls: [] };
      }

      // Parse the data
      const mqls: SheetMetaRow[] = [];
      for (const row of responseData.data) {
        const date = parseGoogleDate(row.Data);
        if (!date) continue;
        
        mqls.push({
          date,
          qty: typeof row.Qtd === 'number' ? row.Qtd : 0,
          meta: typeof row.Meta === 'number' ? row.Meta : 0,
        });
      }

      return { mqls };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  // Calculate total meta for a date range
  const getMqlsMetaForPeriod = (start?: Date, end?: Date): number => {
    if (!data?.mqls || data.mqls.length === 0) return 0;
    
    // Normalize dates to start of day for proper comparison
    const startTime = start ? new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime() : 0;
    const endTime = end ? new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999).getTime() : Date.now();
    
    // Sum up daily metas within the period
    let totalMeta = 0;
    let matchedDays = 0;
    for (const row of data.mqls) {
      const rowTime = row.date.getTime();
      if (rowTime >= startTime && rowTime <= endTime) {
        totalMeta += row.meta;
        matchedDays++;
      }
    }
    
    console.log(`[useSheetMetas] Period ${start?.toISOString()} to ${end?.toISOString()}: matched ${matchedDays} days, totalMeta = ${totalMeta}`);
    
    // If no data in range, calculate proportionally from available data
    if (totalMeta === 0 && data.mqls.length > 0) {
      // Use average daily meta from available data
      const avgDailyMeta = data.mqls.reduce((sum, r) => sum + r.meta, 0) / data.mqls.length;
      const daysInPeriod = Math.ceil((endTime - startTime) / (1000 * 60 * 60 * 24)) + 1;
      totalMeta = avgDailyMeta * daysInPeriod;
      console.log(`[useSheetMetas] No data in range, using fallback: avgDaily=${avgDailyMeta}, days=${daysInPeriod}, total=${totalMeta}`);
    }
    
    return Math.round(totalMeta);
  };

  // Calculate total qty (realized MQLs) for a date range
  const getMqlsQtyForPeriod = (start?: Date, end?: Date): number => {
    if (!data?.mqls || data.mqls.length === 0) return 0;
    
    // Normalize dates to start of day for proper comparison
    const startTime = start ? new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime() : 0;
    const endTime = end ? new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999).getTime() : Date.now();
    
    // Sum up daily qty within the period
    let totalQty = 0;
    for (const row of data.mqls) {
      const rowTime = row.date.getTime();
      if (rowTime >= startTime && rowTime <= endTime) {
        totalQty += row.qty;
      }
    }
    
    console.log(`[useSheetMetas] getMqlsQtyForPeriod ${start?.toISOString()} to ${end?.toISOString()}: totalQty = ${totalQty}`);
    
    return Math.round(totalQty);
  };

  // Get grouped data for charts (returns array of values per period)
  const getMqlsGroupedData = (start: Date, end: Date, grouping: ChartGrouping): { qty: number[]; meta: number[] } => {
    if (!data?.mqls || data.mqls.length === 0) return { qty: [], meta: [] };

    const qtyArray: number[] = [];
    const metaArray: number[] = [];

    if (grouping === 'daily') {
      const days = eachDayOfInterval({ start, end });
      for (const day of days) {
        const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
        const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999).getTime();
        
        let dayQty = 0;
        let dayMeta = 0;
        for (const row of data.mqls) {
          const rowTime = row.date.getTime();
          if (rowTime >= dayStart && rowTime <= dayEnd) {
            dayQty += row.qty;
            dayMeta += row.meta;
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
        for (const row of data.mqls) {
          const rowTime = row.date.getTime();
          if (rowTime >= weekStartTime && rowTime <= weekEndTime) {
            weekQty += row.qty;
            weekMeta += row.meta;
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
        for (const row of data.mqls) {
          const rowTime = row.date.getTime();
          if (rowTime >= monthStart && rowTime <= monthEnd) {
            monthQty += row.qty;
            monthMeta += row.meta;
          }
        }
        qtyArray.push(Math.round(monthQty));
        metaArray.push(Math.round(monthMeta));
      }
    }

    return { qty: qtyArray, meta: metaArray };
  };

  return {
    mqls: data?.mqls ?? [],
    isLoading,
    error,
    getMqlsMetaForPeriod,
    getMqlsQtyForPeriod,
    getMqlsGroupedData,
  };
}
