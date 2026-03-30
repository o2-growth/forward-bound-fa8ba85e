import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, differenceInDays, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, isWithinInterval, parseISO, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export type IndicatorType = 'leads' | 'mql' | 'rm' | 'rr' | 'proposta' | 'venda';
export type BUType = 'modelo_atual' | 'o2_tax' | 'oxy_hacker' | 'franquia';
export type ChartGrouping = 'daily' | 'weekly' | 'monthly';

export interface FunnelRealizedRecord {
  id: string;
  bu: string;
  month: string;
  year: number;
  indicator: string;
  value: number;
  date: string | null;
  created_at: string;
  updated_at: string;
}

export function useFunnelRealized(startDate?: Date, endDate?: Date) {
  const queryClient = useQueryClient();

  const { data: rawData, isLoading, error, refetch } = useQuery({
    queryKey: ['funnel-realized', startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      let query = supabase.from('funnel_realized').select('*');
      
      if (startDate) {
        query = query.gte('date', format(startDate, 'yyyy-MM-dd'));
      }
      if (endDate) {
        query = query.lte('date', format(endDate, 'yyyy-MM-dd'));
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as FunnelRealizedRecord[];
    },
  });

  const getChartGrouping = (): ChartGrouping => {
    if (!startDate || !endDate) return 'monthly';
    const diffDays = differenceInDays(endDate, startDate);
    if (diffDays <= 31) return 'daily';
    if (diffDays <= 90) return 'weekly';
    return 'monthly';
  };

  const getChartLabels = (): string[] => {
    if (!startDate || !endDate) return [];
    const grouping = getChartGrouping();
    
    if (grouping === 'daily') {
      return eachDayOfInterval({ start: startDate, end: endDate }).map(d => format(d, 'dd/MM', { locale: ptBR }));
    } else if (grouping === 'weekly') {
      // Calculate actual number of weeks in the selected period
      const totalDays = differenceInDays(endDate, startDate) + 1;
      const numWeeks = Math.ceil(totalDays / 7);
      return Array.from({ length: numWeeks }, (_, i) => `S${i + 1}`);
    } else {
      return eachMonthOfInterval({ start: startDate, end: endDate }).map(d => format(d, 'MMM', { locale: ptBR }));
    }
  };

  const getGroupedData = (indicator: IndicatorType, filterBU?: BUType | 'all'): number[] => {
    if (!rawData || !startDate || !endDate) return [];
    
    const grouping = getChartGrouping();
    const filteredData = rawData.filter(r => {
      if (r.indicator !== indicator) return false;
      if (filterBU && filterBU !== 'all' && r.bu !== filterBU) return false;
      return true;
    });

    if (grouping === 'daily') {
      return eachDayOfInterval({ start: startDate, end: endDate }).map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        return filteredData.filter(r => r.date === dayStr).reduce((sum, r) => sum + r.value, 0);
      });
    } else if (grouping === 'weekly') {
      // Group data into weeks starting from the actual startDate
      const totalDays = differenceInDays(endDate, startDate) + 1;
      const numWeeks = Math.ceil(totalDays / 7);
      
      return Array.from({ length: numWeeks }, (_, i) => {
        const weekStart = addDays(startDate, i * 7);
        const weekEnd = i < numWeeks - 1 ? addDays(weekStart, 6) : endDate;
        
        return filteredData.filter(r => {
          if (!r.date) return false;
          const recordDate = parseISO(r.date);
          return isWithinInterval(recordDate, { start: weekStart, end: weekEnd });
        }).reduce((sum, r) => sum + r.value, 0);
      });
    } else {
      const months = eachMonthOfInterval({ start: startDate, end: endDate });
      return months.map((monthStart, i) => {
        const nextMonth = i < months.length - 1 ? months[i + 1] : addDays(endDate, 1);
        return filteredData.filter(r => {
          if (!r.date) return false;
          const recordDate = parseISO(r.date);
          return isWithinInterval(recordDate, { start: monthStart, end: addDays(nextMonth, -1) });
        }).reduce((sum, r) => sum + r.value, 0);
      });
    }
  };

  const getTotal = (indicator: IndicatorType, filterBU?: BUType | 'all'): number => {
    if (!rawData) return 0;
    return rawData
      .filter(r => r.indicator === indicator && (filterBU === 'all' || !filterBU || r.bu === filterBU))
      .reduce((sum, r) => sum + r.value, 0);
  };

  const getAllTotals = (filterBU?: BUType | 'all'): Record<IndicatorType, number> => {
    const indicators: IndicatorType[] = ['leads', 'mql', 'rm', 'rr', 'proposta', 'venda'];
    return indicators.reduce((acc, ind) => ({
      ...acc,
      [ind]: getTotal(ind, filterBU)
    }), {} as Record<IndicatorType, number>);
  };

  const syncMutation = useMutation({
    mutationFn: async (year?: number) => {
      // Use sync-from-sheets (faster, 2-5s) instead of sync-pipefy-funnel (slow, 3-5min)
      const { data, error } = await supabase.functions.invoke('sync-from-sheets', {
        body: { year: year || new Date().getFullYear() }
      });
      
      if (error) throw error;
      
      // Check if the response indicates failure
      if (data && !data.success) {
        throw new Error(data.message || 'Falha na sincronização');
      }
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['funnel-realized'] });
      const count = data?.insertedCount || 0;
      if (count > 0) {
        toast.success(`Sincronizados ${count} registros em ${data.timeMs || 0}ms!`);
      } else {
        toast.warning('Sincronização concluída, mas nenhum registro encontrado para o período.');
      }
    },
    onError: (error: Error) => {
      console.error('Sync error:', error);
      if (error.message.includes('GOOGLE_SHEET_ID')) {
        toast.error('Configure o GOOGLE_SHEET_ID nas configurações do projeto.');
      } else {
        toast.error(error.message || 'Erro ao sincronizar dados');
      }
    },
  });

  return {
    data: rawData,
    isLoading,
    error,
    refetch,
    getTotal,
    getAllTotals,
    getChartGrouping,
    getChartLabels,
    getGroupedData,
    syncWithPipefy: syncMutation.mutate,
    isSyncing: syncMutation.isPending,
  };
}
