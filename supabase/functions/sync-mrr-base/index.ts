import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BASE_URL = 'https://api.oxy.finance';
const CNPJ_FORMATTED = '23.813.779/0001-60';
const GROUP_CAAS = 'bed1718d-e54f-4341-abe0-22ae7f04a26a';
const GROUP_SAAS = '6c3f10e6-2d2d-48d5-81ef-18bb6389b159';

// Categorias EXCLUÍDAS do MRR (case+accent insensitive)
const EXCLUDED_LABELS = new Set(['setup', 'servicos especializados']);

const MONTH_KEYS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function monthIndexFromPeriod(period: string): number {
  // period format: "2026-04"
  const m = parseInt(period.split('-')[1], 10);
  return m - 1;
}

async function fetchGroup(apiKey: string, groupId: string, startDate: string, endDate: string) {
  const params = new URLSearchParams({ startDate, endDate });
  params.append('groupIds[]', groupId);
  params.append('cnpjs[]', CNPJ_FORMATTED);
  const url = `${BASE_URL}/v2/dre/dre-table-categories?${params}`;
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey } });
  if (!res.ok) throw new Error(`Oxy ${groupId} returned ${res.status}: ${await res.text()}`);
  return await res.json();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    // JWT auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseService = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const apiKey = Deno.env.get('OXY_FINANCE_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'OXY_FINANCE_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate user is admin
    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseService);
    const { data: roleData } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Admin role required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body = await req.json().catch(() => ({}));
    const year: number = body.year || new Date().getFullYear();

    // Default: months Jan to (current month - 1) of the year. For past years, all 12.
    const now = new Date();
    let lastMonthIdx: number;
    if (year < now.getFullYear()) {
      lastMonthIdx = 11; // Dec
    } else if (year === now.getFullYear()) {
      lastMonthIdx = now.getMonth() - 1; // last closed month
      if (lastMonthIdx < 0) lastMonthIdx = -1;
    } else {
      lastMonthIdx = -1;
    }

    if (lastMonthIdx < 0) {
      return new Response(JSON.stringify({ synced: [], skippedOverride: [], message: 'No closed months to sync' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const monthsToSync: number[] = body.months 
      ? (body.months as string[]).map(m => MONTH_KEYS.indexOf(m)).filter(i => i >= 0 && i <= lastMonthIdx)
      : Array.from({ length: lastMonthIdx + 1 }, (_, i) => i);

    const startDate = `${year}-01-01`;
    const lastDay = new Date(year, lastMonthIdx + 1, 0).getDate();
    const endDate = `${year}-${String(lastMonthIdx + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    console.log(`Syncing MRR Base from ${startDate} to ${endDate}`);

    // Fetch CaaS and SaaS in parallel
    const [caasData, saasData] = await Promise.all([
      fetchGroup(apiKey, GROUP_CAAS, startDate, endDate),
      fetchGroup(apiKey, GROUP_SAAS, startDate, endDate),
    ]);

    // Sum per month, excluding Setup and Serviços Especializados
    const mrrPerMonth: Record<number, number> = {};
    for (let i = 0; i <= lastMonthIdx; i++) mrrPerMonth[i] = 0;

    const accumulate = (payload: any) => {
      const cats = payload?.categories || [];
      for (const cat of cats) {
        const labelNorm = normalize(cat.label || '');
        if (EXCLUDED_LABELS.has(labelNorm)) continue;
        for (const dp of (cat.data || [])) {
          if (dp.period === 'TOTAL') continue;
          const idx = monthIndexFromPeriod(dp.period);
          if (idx < 0 || !(idx in mrrPerMonth)) continue;
          mrrPerMonth[idx] += Number(dp.value || 0);
        }
      }
    };

    accumulate(caasData);
    accumulate(saasData);

    // Read existing rows to respect overrides
    const { data: existing } = await adminClient
      .from('mrr_base_monthly')
      .select('*')
      .eq('year', year);

    const existingMap = new Map<string, any>();
    (existing || []).forEach(r => existingMap.set(r.month, r));

    const synced: { month: string; value: number }[] = [];
    const skippedOverride: { month: string; value: number }[] = [];

    for (const idx of monthsToSync) {
      const monthKey = MONTH_KEYS[idx];
      const value = Math.round(mrrPerMonth[idx] * 100) / 100;
      const row = existingMap.get(monthKey);

      if (row?.is_total_override) {
        skippedOverride.push({ month: monthKey, value: Number(row.value) });
        continue;
      }

      if (row) {
        await adminClient.from('mrr_base_monthly').update({
          value,
          is_total_override: false,
          updated_at: new Date().toISOString(),
        }).eq('id', row.id);
      } else {
        await adminClient.from('mrr_base_monthly').insert({
          month: monthKey,
          year,
          value,
          is_total_override: false,
        });
      }
      synced.push({ month: monthKey, value });
    }

    // Audit log
    await adminClient.from('admin_audit_logs').insert({
      user_id: user.id,
      user_email: user.email || '',
      action_type: 'sync_mrr_base',
      description: `Sincronização MRR Base ${year} via Oxy Finance (${synced.length} meses)`,
      metadata: { year, synced, skippedOverride },
    });

    return new Response(JSON.stringify({ year, synced, skippedOverride }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in sync-mrr-base:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
