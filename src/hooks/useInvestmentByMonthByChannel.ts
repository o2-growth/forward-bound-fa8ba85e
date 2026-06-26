import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { startOfMonth, endOfMonth, eachMonthOfInterval, format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

const MAX_MONTHS = 24;

interface MonthBreakdown {
  meta: number;
  google: number;
  metaImpressions: number;
  metaClicks: number;
  googleImpressions: number;
  googleClicks: number;
}

async function fetchMonthBreakdown(yyyyMM: string): Promise<MonthBreakdown> {
  const [year, month] = yyyyMM.split('-').map(Number);
  const from = startOfMonth(new Date(year, month - 1, 1));
  const to = endOfMonth(from);
  const startDate = from.toISOString().split('T')[0];
  const endDate = to.toISOString().split('T')[0];

  const [metaResp, googleResp] = await Promise.allSettled([
    supabase.functions.invoke<any>('fetch-meta-campaigns', { body: { startDate, endDate } }),
    supabase.functions.invoke<any>('fetch-google-campaigns', { body: { startDate, endDate } }),
  ]);

  const out: MonthBreakdown = {
    meta: 0, google: 0,
    metaImpressions: 0, metaClicks: 0,
    googleImpressions: 0, googleClicks: 0,
  };

  if (metaResp.status === 'fulfilled' && metaResp.value.data?.success) {
    for (const c of metaResp.value.data.campaigns || []) {
      out.meta += parseFloat(c.insights?.spend || '0') || 0;
      out.metaImpressions += parseInt(c.insights?.impressions || '0', 10) || 0;
      out.metaClicks += parseInt(c.insights?.clicks || '0', 10) || 0;
    }
  }

  if (googleResp.status === 'fulfilled' && googleResp.value.data?.success) {
    for (const c of googleResp.value.data.campaigns || []) {
      out.google += Number(c.investment ?? c.spend) || 0;
      out.googleImpressions += Number(c.impressions) || 0;
      out.googleClicks += Number(c.clicks) || 0;
    }
  }

  return out;
}

export function useInvestmentByMonthByChannel(startDate: Date, endDate: Date) {
  const months = useMemo(() => {
    const list = eachMonthOfInterval({ start: startOfMonth(startDate), end: endOfMonth(endDate) })
      .map(d => format(d, 'yyyy-MM'));
    return list.slice(0, MAX_MONTHS);
  }, [startDate, endDate]);

  const queries = useQueries({
    queries: months.map(yyyyMM => ({
      queryKey: ['investment-month-by-channel', yyyyMM],
      queryFn: () => fetchMonthBreakdown(yyyyMM),
      staleTime: 60 * 60 * 1000,
      retry: 1,
    })),
  });

  return useMemo(() => {
    const byMonth = new Map<string, MonthBreakdown>();
    let isLoading = false;
    const totals: MonthBreakdown = {
      meta: 0, google: 0,
      metaImpressions: 0, metaClicks: 0,
      googleImpressions: 0, googleClicks: 0,
    };
    months.forEach((m, i) => {
      const q = queries[i];
      if (q.isLoading) isLoading = true;
      const v = q.data || { meta: 0, google: 0, metaImpressions: 0, metaClicks: 0, googleImpressions: 0, googleClicks: 0 };
      byMonth.set(m, v);
      totals.meta += v.meta;
      totals.google += v.google;
      totals.metaImpressions += v.metaImpressions;
      totals.metaClicks += v.metaClicks;
      totals.googleImpressions += v.googleImpressions;
      totals.googleClicks += v.googleClicks;
    });
    return { byMonth, totals, isLoading, months };
  }, [months, queries]);
}
