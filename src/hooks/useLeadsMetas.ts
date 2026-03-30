import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays, eachDayOfInterval, eachMonthOfInterval, addDays, getMonth, startOfMonth, endOfMonth, startOfDay } from "date-fns";

export interface LeadsMetaRow {
  date: Date;
  qty: number;
  meta: number;
}

export interface LeadsMetasResult {
  leads: LeadsMetaRow[];
}

export type LeadsChartGrouping = 'daily' | 'weekly' | 'monthly';

// Parse Google Sheets date format: Date(year,month,day)
function parseGoogleDate(dateValue: any): Date | null {
  if (!dateValue) return null;
  
  if (typeof dateValue === 'string') {
    const match = dateValue.match(/Date\((\d+),(\d+),(\d+)\)/);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10);
      const day = parseInt(match[3], 10);
      return new Date(year, month, day);
    }
    // Try parsing as ISO string
    const parsed = new Date(dateValue);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  
  return null;
}

export function useLeadsMetas(startDate?: Date, endDate?: Date) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['sheet-metas', 'leads', startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      const { data: result, error } = await supabase.functions.invoke('read-sheet-tab', {
        body: {
          sheetName: 'Leads Meta',
          maxRows: 1000,
        }
      });

      if (error) {
        console.error('Error fetching Leads Meta sheet:', error);
        throw error;
      }

      if (!result?.success || !result?.data) {
        console.warn('No data returned from Leads Meta sheet');
        return { leads: [] };
      }

      const leads: LeadsMetaRow[] = [];
      const columns = result.columns || [];
      
      // Find column indices
      const dateIdx = columns.findIndex((c: string) => c?.toLowerCase()?.includes('data'));
      const qtyIdx = columns.findIndex((c: string) => c?.toLowerCase()?.includes('qtd'));
      const metaIdx = columns.findIndex((c: string) => c?.toLowerCase()?.includes('meta'));

      for (const row of result.data) {
        const dateValue = row[dateIdx];
        const parsedDate = parseGoogleDate(dateValue);
        
        if (parsedDate) {
          const qty = typeof row[qtyIdx] === 'number' ? Math.round(row[qtyIdx]) : 0;
          const meta = typeof row[metaIdx] === 'number' ? Math.round(row[metaIdx]) : 0;
          
          leads.push({
            date: parsedDate,
            qty,
            meta,
          });
        }
      }

      return { leads };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  const leads = data?.leads || [];

  // Get total meta for the given period
  const getLeadsMetaForPeriod = (start?: Date, end?: Date): number => {
    if (!start || !end || leads.length === 0) return 0;
    
    const startDay = startOfDay(start);
    const endDay = startOfDay(end);
    
    const filtered = leads.filter(row => {
      const rowDate = startOfDay(row.date);
      return rowDate >= startDay && rowDate <= endDay;
    });
    
    if (filtered.length === 0) {
      // Fallback: estimate based on average daily meta
      const totalMeta = leads.reduce((sum, row) => sum + row.meta, 0);
      const avgDailyMeta = leads.length > 0 ? totalMeta / leads.length : 0;
      const days = differenceInDays(end, start) + 1;
      return Math.round(avgDailyMeta * days);
    }
    
    return filtered.reduce((sum, row) => sum + row.meta, 0);
  };

  // Get total qty for the given period
  const getLeadsQtyForPeriod = (start?: Date, end?: Date): number => {
    if (!start || !end || leads.length === 0) return 0;
    
    const startDay = startOfDay(start);
    const endDay = startOfDay(end);
    
    const filtered = leads.filter(row => {
      const rowDate = startOfDay(row.date);
      return rowDate >= startDay && rowDate <= endDay;
    });
    
    return filtered.reduce((sum, row) => sum + row.qty, 0);
  };

  // Get grouped data for charts
  const getLeadsGroupedData = (start: Date, end: Date, grouping: LeadsChartGrouping): { qty: number[]; meta: number[] } => {
    if (grouping === 'daily') {
      const days = eachDayOfInterval({ start, end });
      return {
        qty: days.map(day => {
          const dayStart = startOfDay(day);
          const match = leads.find(row => startOfDay(row.date).getTime() === dayStart.getTime());
          return match?.qty || 0;
        }),
        meta: days.map(day => {
          const dayStart = startOfDay(day);
          const match = leads.find(row => startOfDay(row.date).getTime() === dayStart.getTime());
          return match?.meta || 0;
        }),
      };
    }

    if (grouping === 'weekly') {
      const totalDays = differenceInDays(end, start) + 1;
      const numWeeks = Math.ceil(totalDays / 7);
      const qtyArray: number[] = [];
      const metaArray: number[] = [];

      for (let i = 0; i < numWeeks; i++) {
        const weekStart = addDays(start, i * 7);
        const weekEnd = i === numWeeks - 1 ? end : addDays(weekStart, 6);
        
        const weekStartDay = startOfDay(weekStart);
        const weekEndDay = startOfDay(weekEnd);
        
        const weekRows = leads.filter(row => {
          const rowDate = startOfDay(row.date);
          return rowDate >= weekStartDay && rowDate <= weekEndDay;
        });
        
        qtyArray.push(weekRows.reduce((sum, row) => sum + row.qty, 0));
        metaArray.push(weekRows.reduce((sum, row) => sum + row.meta, 0));
      }

      return { qty: qtyArray, meta: metaArray };
    }

    // Monthly
    const months = eachMonthOfInterval({ start, end });
    const qtyArray: number[] = [];
    const metaArray: number[] = [];

    for (const monthDate of months) {
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      
      const monthRows = leads.filter(row => {
        const rowDate = startOfDay(row.date);
        return rowDate >= monthStart && rowDate <= monthEnd;
      });
      
      qtyArray.push(monthRows.reduce((sum, row) => sum + row.qty, 0));
      metaArray.push(monthRows.reduce((sum, row) => sum + row.meta, 0));
    }

    return { qty: qtyArray, meta: metaArray };
  };

  return {
    leads,
    isLoading,
    error,
    refetch,
    getLeadsMetaForPeriod,
    getLeadsQtyForPeriod,
    getLeadsGroupedData,
  };
}
