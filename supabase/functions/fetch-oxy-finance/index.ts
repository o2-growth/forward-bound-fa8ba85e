import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const BASE_URL = 'https://api.oxy.finance';
const CNPJ_CLEAN = '23813779000160';
const CNPJ_FORMATTED = '23.813.779/0001-60';

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

    const body = await req.json();
    const { action, startDate, endDate, movimentType, isLate } = body;
    console.log(`Action: ${action}, startDate: ${startDate}, endDate: ${endDate}`);

    const authHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    };

    let url: string;
    let fetchOptions: RequestInit;

    switch (action) {
      case 'dre': {
        const params = new URLSearchParams({
          startDate,
          endDate,
          'cnpjs[]': CNPJ_CLEAN,
        });
        url = `${BASE_URL}/v2/dre/dre-table?${params}`;
        fetchOptions = { method: 'GET', headers: authHeaders };
        break;
      }
      case 'cashflow_details': {
        // Try with CNPJ_FORMATTED first; if empty payload for "D", caller can retry with cnpjVariant param.
        const cnpjVariant = body.cnpjVariant === 'clean' ? CNPJ_CLEAN : CNPJ_FORMATTED;
        const params = new URLSearchParams({
          startDate,
          endDate,
          'cnpjs[]': cnpjVariant,
          movimentType: movimentType || 'R',
        });
        if (typeof isLate === 'boolean') {
          params.set('isLate', String(isLate));
        }
        url = `${BASE_URL}/widgets/cash-flow/v2/card/details?${params}`;
        fetchOptions = { method: 'GET', headers: authHeaders };
        break;
      }
      case 'cashflow_chart': {
        const params = new URLSearchParams({
          startDate,
          endDate,
          'cnpjs[]': CNPJ_FORMATTED,
        });
        url = `${BASE_URL}/widgets/cash-flow/charts/fluxo-caixa?${params}`;
        fetchOptions = { method: 'GET', headers: authHeaders };
        break;
      }
      case 'dre_categories': {
        const groupIds = body.groupIds || ['bed1718d-e54f-4341-abe0-22ae7f04a26a'];
        const params = new URLSearchParams({ startDate, endDate });
        for (const gid of groupIds) {
          params.append('groupIds[]', gid);
        }
        params.append('cnpjs[]', CNPJ_FORMATTED);
        url = `${BASE_URL}/v2/dre/dre-table-categories?${params}`;
        fetchOptions = { method: 'GET', headers: authHeaders };
        break;
      }
      case 'probe': {
        // Generic diagnostic probe — does NOT mutate any existing behavior.
        // body: { path: "/v2/foo", queryParams?: Record<string,string|string[]>, method?: "GET"|"POST", reqBody?: any }
        const probePath: string = body.path;
        if (!probePath || typeof probePath !== 'string') {
          return new Response(JSON.stringify({ error: 'probe requires "path"' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        const params = new URLSearchParams();
        const qp = body.queryParams || {};
        for (const [k, v] of Object.entries(qp)) {
          if (Array.isArray(v)) for (const item of v) params.append(k, String(item));
          else if (v !== undefined && v !== null) params.append(k, String(v));
        }
        const qs = params.toString();
        url = `${BASE_URL}${probePath}${qs ? `?${qs}` : ''}`;
        const method = (body.method || 'GET').toUpperCase();
        fetchOptions = {
          method,
          headers: authHeaders,
          ...(method !== 'GET' && body.reqBody !== undefined
            ? { body: JSON.stringify(body.reqBody) }
            : {}),
        };
        break;
      }
      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    console.log(`Fetching: ${url}`);

    const response = await fetch(url, fetchOptions);
    const responseText = await response.text();
    
    console.log(`Response status: ${response.status}`);
    console.log(`Response body (first 3000 chars): ${responseText.substring(0, 3000)}`);
    
    try {
      const jsonData = JSON.parse(responseText);
      console.log(`Response keys: ${JSON.stringify(Object.keys(jsonData))}`);
      if (Array.isArray(jsonData)) {
        console.log(`Array length: ${jsonData.length}`);
        if (jsonData.length > 0) {
          console.log(`First item keys: ${JSON.stringify(Object.keys(jsonData[0]))}`);
          console.log(`First item: ${JSON.stringify(jsonData[0]).substring(0, 1500)}`);
        }
      } else if (typeof jsonData === 'object') {
        for (const key of Object.keys(jsonData)) {
          const val = jsonData[key];
          if (Array.isArray(val)) {
            console.log(`Key "${key}": array of ${val.length} items`);
            if (val.length > 0) {
              console.log(`  First item keys: ${JSON.stringify(Object.keys(val[0]))}`);
              console.log(`  First item: ${JSON.stringify(val[0]).substring(0, 1000)}`);
            }
          } else {
            console.log(`Key "${key}": ${JSON.stringify(val).substring(0, 500)}`);
          }
        }
      }
    } catch {
      console.log('Response is not JSON');
    }

    return new Response(responseText, {
      status: response.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
