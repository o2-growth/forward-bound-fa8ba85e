import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { startOfMonth, endOfMonth, eachMonthOfInterval, format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

const MAX_MONTHS = 24;

interface MetaCampaignInsights {
  spend?: string;
}
interface MetaCampaign {
  insights?: MetaCampaignInsights | null;
}
interface MetaApiResponse {
  success: boolean;
  campaigns: MetaCampaign[];
  error?: string;
}

interface GoogleCampaignRow {
  spend: number;
}
interface GoogleApiResponse {
  success: boolean;
  campaigns: GoogleCampaignRow[];
  error?: string;
}

async function fetchMonthInvestment(yyyyMM: string): Promise<number> {
  const [year, month] = yyyyMM.split('-').map(Number);
  const from = startOfMonth(new Date(year, month - 1, 1));
  const to = endOfMonth(from);
  const startDate = from.toISOString().split('T')[0];
  const endDate = to.toISOString().split('T')[0];

  const [metaResp, googleResp] = await Promise.allSettled([
    supabase.functions.invoke<MetaApiResponse>('fetch-meta-campaigns', {
      body: { startDate, endDate },
    }),
    supabase.functions.invoke<GoogleApiResponse>('fetch-google-campaigns', {
      body: { startDate, endDate },
    }),
  ]);

  let metaSpend = 0;
  if (metaResp.status === 'fulfilled' && metaResp.value.data?.success) {
    for (const c of metaResp.value.data.campaigns || []) {
      metaSpend += parseFloat(c.insights?.spend || '0') || 0;
    }
  }

  let googleSpend = 0;
  if (googleResp.status === 'fulfilled' && googleResp.value.data?.success) {
    for (const c of googleResp.value.data.campaigns || []) {
      googleSpend += Number(c.spend) || 0;
    }
  }

  return metaSpend + googleSpend;
}

/**
 * Returns Map<'yyyy-MM', number> with Meta+Google spend per month in the range.
 * Cap at 24 months. Reuses edge function 60min cache.
 */
export function useInvestmentByMonth(startDate: Date, endDate: Date) {
  const months = useMemo(() => {
    const list = eachMonthOfInterval({ start: startOfMonth(startDate), end: endOfMonth(endDate) })
      .map(d => format(d, 'yyyy-MM'));
    return list.slice(0, MAX_MONTHS);
  }, [startDate, endDate]);

  const queries = useQueries({
    queries: months.map(yyyyMM => ({
      queryKey: ['investment-month', yyyyMM],
      queryFn: () => fetchMonthInvestment(yyyyMM),
      staleTime: 60 * 60 * 1000, // 60min
      retry: 1,
    })),
  });

  return useMemo(() => {
    const byMonth = new Map<string, number>();
    let isLoading = false;
    let totalInvestment = 0;
    months.forEach((m, i) => {
      const q = queries[i];
      if (q.isLoading) isLoading = true;
      const value = q.data || 0;
      byMonth.set(m, value);
      totalInvestment += value;
    });
    return { byMonth, totalInvestment, isLoading, months };
  }, [months, queries]);
}
