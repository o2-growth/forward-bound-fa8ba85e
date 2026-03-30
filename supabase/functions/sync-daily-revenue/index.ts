import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const BASE_URL = 'https://api.oxy.finance';
const CNPJ_CLEAN = '23813779000160';
const CNPJ_FORMATTED = '23.813.779/0001-60';

// Mapping DRE group labels to BU columns
function mapGroupToBU(label: string): 'caas' | 'saas' | 'expansao' | 'tax' | null {
  const lower = label.toLowerCase();
  if (lower === 'caas') return 'caas';
  if (lower === 'saas') return 'saas';
  if (lower === 'tax') return 'tax';
  const normalized = lower.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (normalized === 'expansao') return 'expansao';
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('OXY_FINANCE_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'OXY_FINANCE_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { startDate, endDate, source, forceRefreshDays = 7 } = body;

    if (!startDate || !endDate) {
      return new Response(JSON.stringify({ error: 'startDate and endDate are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const syncSource = source || 'cashflow';
    console.log(`Syncing daily revenue (source=${syncSource}) from ${startDate} to ${endDate}, forceRefreshDays=${forceRefreshDays}`);

    const authHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    };

    // Generate all dates in range
    const dates: string[] = [];
    const start = new Date(startDate + 'T00:00:00Z');
    const end = new Date(endDate + 'T00:00:00Z');
    const current = new Date(start);
    while (current <= end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setUTCDate(current.getUTCDate() + 1);
    }

    // Calculate the freshness cutoff date
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const cutoffDate = new Date(today);
    cutoffDate.setUTCDate(cutoffDate.getUTCDate() - forceRefreshDays);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    // Split dates into "fresh" (must re-fetch) and "old" (can use cache)
    const freshDates = dates.filter(d => d >= cutoffStr);
    const oldDates = dates.filter(d => d < cutoffStr);

    // Delete fresh dates from DB so they get re-fetched
    if (freshDates.length > 0) {
      const { error: delError } = await supabase
        .from('daily_revenue')
        .delete()
        .eq('source', syncSource)
        .gte('date', freshDates[0])
        .lte('date', freshDates[freshDates.length - 1]);

      if (delError) {
        console.error('Error deleting fresh dates:', delError);
      } else {
        console.log(`Deleted ${freshDates.length} fresh dates (>= ${cutoffStr}) for re-fetch`);
      }
    }

    // Cache check: only for old dates
    const existingOldDates = new Set<string>();
    if (oldDates.length > 0) {
      const { data: existingRows } = await supabase
        .from('daily_revenue')
        .select('date')
        .eq('source', syncSource)
        .gte('date', oldDates[0])
        .lte('date', oldDates[oldDates.length - 1]);

      for (const r of (existingRows || [])) {
        existingOldDates.add(r.date);
      }
    }

    // Dates to fetch = old dates not in cache + all fresh dates
    const oldMissing = oldDates.filter(d => !existingOldDates.has(d));
    const missingDates = [...oldMissing, ...freshDates];

    console.log(`Total days: ${dates.length}, old cached: ${existingOldDates.size}, old missing: ${oldMissing.length}, fresh (forced): ${freshDates.length}, to fetch: ${missingDates.length}`);

    if (missingDates.length === 0) {
      return new Response(JSON.stringify({
        synced: 0,
        cached: existingOldDates.size,
        errors: 0,
        message: 'All days already in cache',
        dateRange: { startDate, endDate },
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const results: any[] = [];
    let errors = 0;

    if (syncSource === 'dre') {
      // DRE mode: fetch /v2/dre/dre-table per day, extract RB by BU
      for (let i = 0; i < missingDates.length; i += 5) {
        const batch = missingDates.slice(i, i + 5);
        const batchResults = await Promise.all(
          batch.map(async (day) => {
            try {
              const params = new URLSearchParams({
                startDate: day,
                endDate: day,
                'cnpjs[]': CNPJ_CLEAN,
              });
              const url = `${BASE_URL}/v2/dre/dre-table?${params}`;
              const response = await fetch(url, { method: 'GET', headers: authHeaders });
              const text = await response.text();

              if (!response.ok) {
                console.error(`Error fetching DRE ${day}: ${response.status} ${text.substring(0, 200)}`);
                errors++;
                return null;
              }

              const data = JSON.parse(text);
              const groups = data?.groups || [];

              let caas = 0, saas = 0, expansao = 0, tax = 0;

              for (const group of groups) {
                if (group.code !== 'RB') continue;
                const bu = mapGroupToBU(group.label || '');
                if (!bu) continue;

              // Use only the first entry (the second is a duplicate "Total")
                const entries = Array.isArray(group.data) ? group.data : [];
                const value = entries.length > 0 ? Number(entries[0].value || 0) : 0;

                if (bu === 'caas') caas = value;
                else if (bu === 'saas') saas = value;
                else if (bu === 'expansao') expansao = value;
                else if (bu === 'tax') tax = value;
              }

              const totalInflows = caas + saas + expansao + tax;

              return {
                date: day,
                total_inflows: totalInflows,
                customer_count: 0,
                caas, saas, expansao, tax,
                source: 'dre',
                year: parseInt(day.split('-')[0], 10),
                synced_at: new Date().toISOString(),
              };
            } catch (e) {
              console.error(`Exception fetching DRE ${day}:`, e);
              errors++;
              return null;
            }
          })
        );

        for (const r of batchResults) {
          if (r) results.push(r);
        }

        if (i + 5 < missingDates.length) {
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      }
    } else {
      // Cashflow mode (original behavior)
      for (let i = 0; i < missingDates.length; i += 5) {
        const batch = missingDates.slice(i, i + 5);
        const batchResults = await Promise.all(
          batch.map(async (day) => {
            try {
              const params = new URLSearchParams({
                startDate: day,
                endDate: day,
                'cnpjs[]': CNPJ_FORMATTED,
                movimentType: 'R',
                isLate: 'false',
              });
              const url = `${BASE_URL}/widgets/cash-flow/v2/card/details?${params}`;
              const response = await fetch(url, { method: 'GET', headers: authHeaders });
              const text = await response.text();

              if (!response.ok) {
                console.error(`Error fetching cashflow ${day}: ${response.status} ${text.substring(0, 200)}`);
                errors++;
                return null;
              }

              const data = JSON.parse(text);
              const customers = Array.isArray(data) ? data : data?.data || [];
              let totalInflows = 0;
              let customerCount = 0;

              if (Array.isArray(customers)) {
                for (const customer of customers) {
                  const entries = customer.data || [];
                  const totalEntry = entries.find((e: any) => e.period === 'Total');
                  const value = Number(totalEntry?.value || 0);
                  if (value > 0) {
                    totalInflows += value;
                    customerCount++;
                  }
                }
              }

              return {
                date: day,
                total_inflows: totalInflows,
                customer_count: customerCount,
                caas: 0, saas: 0, expansao: 0, tax: 0,
                source: 'cashflow',
                year: parseInt(day.split('-')[0], 10),
                synced_at: new Date().toISOString(),
              };
            } catch (e) {
              console.error(`Exception fetching cashflow ${day}:`, e);
              errors++;
              return null;
            }
          })
        );

        for (const r of batchResults) {
          if (r) results.push(r);
        }

        if (i + 5 < missingDates.length) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }
    }

    console.log(`Fetched ${results.length} days, ${errors} errors. Upserting...`);

    // Upsert all results
    if (results.length > 0) {
      const { error: upsertError } = await supabase
        .from('daily_revenue')
        .upsert(results, { onConflict: 'date,source' });

      if (upsertError) {
        console.error('Upsert error:', upsertError);
        return new Response(JSON.stringify({ error: upsertError.message }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    const summary = {
      synced: results.length,
      cached: existingOldDates.size,
      freshRefreshed: freshDates.length,
      errors,
      totalInflows: results.reduce((s, r) => s + r.total_inflows, 0),
      dateRange: { startDate, endDate },
      source: syncSource,
    };

    console.log('Sync complete:', JSON.stringify(summary));

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
