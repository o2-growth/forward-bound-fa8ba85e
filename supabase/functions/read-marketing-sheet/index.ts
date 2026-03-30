import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Marketing sheet configuration
const MARKETING_SHEET_ID = '1O27qvdplGeRGmnueUJOwk1FPN83hiUUf3-SZbR9x4ig';

// Tab configurations by year
const TAB_CONFIGS: Record<number, { name: string; gid: string }> = {
  2025: { name: 'Indicadores 25', gid: '2102339529' },
  2026: { name: 'Indicadores 26', gid: '1310877066' },
};

// Column mapping for 2026 (simple: B-M = months 1-12)
const MONTH_COLUMNS_2026: Record<number, number> = {
  0: 1, 1: 2, 2: 3, 3: 4, 4: 5, 5: 6,
  6: 7, 7: 8, 8: 9, 9: 10, 10: 11, 11: 12,
};

// Column mapping for 2025 (with quarterly totals at E, I, M, Q)
const MONTH_COLUMNS_2025: Record<number, number> = {
  0: 1,   // Jan = B
  1: 2,   // Feb = C
  2: 3,   // Mar = D
  // E = Q1 total (skip)
  3: 5,   // Apr = F
  4: 6,   // May = G
  5: 7,   // Jun = H
  // I = Q2 total (skip)
  6: 9,   // Jul = J
  7: 10,  // Aug = K
  8: 11,  // Sep = L
  // M = Q3 total (skip)
  9: 13,  // Oct = N
  10: 14, // Nov = O
  11: 15, // Dec = P
  // Q = Q4 total, R = Annual total (skip)
};

// Metric name mappings (normalized → original variations)
const METRIC_MAPPINGS: Record<string, string[]> = {
  'midiaGoogle': ['Mídia Google Ads', 'Mídia - Google Ads', 'Google Ads - Mídia', 'Mídia Google', 'Google Ads Mídia'],
  'leadsGoogle': ['Leads - Google Ads', 'Google Ads - Leads', 'Leads Google Ads', 'Leads Google'],
  'cplGoogle': ['CPL - Google Ads', 'Google Ads - CPL', 'CPL Google Ads', 'CPL Google'],
  'midiaMeta': ['Mídia Meta Ads', 'Mídia - Meta Ads', 'Meta Ads - Mídia', 'Mídia Meta', 'Meta Ads Mídia'],
  'leadsMeta': ['Leads - Meta Ads', 'Meta Ads - Leads', 'Leads Meta Ads', 'Leads Meta', 'Leads - Meta', 'Lead Meta Ads', 'Leads -  Meta Ads'],
  'cplMeta': ['CPL - Meta Ads', 'Meta Ads - CPL', 'CPL Meta Ads', 'CPL Meta'],
  'midiaTotal': ['Mídia total', 'Mídia Total', 'Total Mídia', 'Mídia Totais', 'Total Mídia Ads'],
  'leadsTotais': ['Leads totais', 'Leads Totais', 'Total Leads', 'Total de Leads'],
  'cplTotal': ['CPL total', 'CPL Total', 'Total CPL', 'CPL Totais'],
  'mqlPorFaturamento': ['MQL por Faturamento', 'MQL - Faturamento', 'MQLs', 'MQL Faturamento', 'MQLs por Faturamento'],
  'cpmqlPorFaturamento': ['CPMQL por Faturamento', 'CPMQL', 'CPMql', 'CPMQL Faturamento', 'CP MQL'],
  'reuniaoMarcada': ['Reunião marcada', 'Reunião Marcada', 'RM', 'Reuniões Marcadas', 'Reuniao Marcada'],
  'cprm': ['CPRM', 'CPRm', 'Custo por RM', 'CP RM', 'Custo RM'],
  'reuniaoRealizada': ['Reunião realizada', 'Reunião Realizada', 'RR', 'Reuniões Realizadas', 'Reuniao Realizada'],
  'cprr': ['CPRR', 'CPRr', 'Custo por RR', 'CP RR', 'Custo RR'],
  'propostaEnviada': ['Proposta enviada', 'Proposta Enviada', 'Propostas', 'Propostas Enviadas', 'Proposta'],
  'cpp': ['CPP', 'Custo por Proposta', 'CP Proposta', 'Custo Proposta', 'CP P'],
  'vendas': ['Vendas', 'Venda', 'Total Vendas', 'Vendas Totais'],
  'cpv': ['CPV', 'Custo por Venda', 'CP Venda', 'Custo Venda'],
  'mrr': ['MRR', 'Mrr', 'Monthly Recurring Revenue', 'Receita Recorrente'],
  'setup': ['Setup', 'SETUP', 'Valor Setup', 'Taxa Setup'],
  'pontual': ['Pontual', 'PONTUAL', 'Receita Pontual', 'Valor Pontual'],
  'educacao': ['Educação', 'EDUCAÇÃO', 'Educacao', 'Educ', 'Receita Educação', 'Education'],
  'gmv': ['GMV', 'Gmv', 'Receita Total', 'Receita Bruta', 'Gross Merchandise Value', 'Total GMV', 'Total Receita', 'GMV (Gross Merchandise Value)'],
  'cac': ['CAC', 'Cac', 'Custo Aquisição Cliente', 'Customer Acquisition Cost'],
  'ltv': ['LTV', 'Ltv', 'Lifetime Value', 'Valor Vitalício'],
  'tcv': ['TCV', 'Tcv', 'Total Contract Value', 'Valor Total Contrato', 'Ticket Total', 'TCV (Total Contract Value)'],
  'roas': ['ROAS', 'Roas', 'Return on Ad Spend'],
  'roasLtv': ['ROAS LTV', 'ROAS Ltv', 'Roas LTV', 'ROAS x LTV'],
  'roiLtv': ['ROI LTV', 'ROI Ltv', 'Roi LTV', 'ROI x LTV'],
  'ltvCac': ['LTV/CAC', 'LTV / CAC', 'Ltv/Cac', 'LTV:CAC', 'LTV CAC'],
};

// Metrics that are ratios/averages (not summable)
const RATIO_METRICS = new Set([
  'cplGoogle', 'cplMeta', 'cplTotal', 'cpmqlPorFaturamento', 
  'cprm', 'cprr', 'cpp', 'cpv', 'cac', 'ltv', 'tcv', 
  'roas', 'roasLtv', 'roiLtv', 'ltvCac'
]);

// Metrics that are summable (absolute values)
const SUMMABLE_METRICS = new Set([
  'midiaGoogle', 'leadsGoogle', 'midiaMeta', 'leadsMeta',
  'midiaTotal', 'leadsTotais', 'mqlPorFaturamento', 'reuniaoMarcada',
  'reuniaoRealizada', 'propostaEnviada', 'vendas',
  'mrr', 'setup', 'pontual', 'educacao', 'gmv'
]);

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function findMetricKey(rowLabel: string): string | null {
  const normalizedLabel = normalizeText(rowLabel);
  
  for (const [key, variations] of Object.entries(METRIC_MAPPINGS)) {
    for (const variation of variations) {
      if (normalizeText(variation) === normalizedLabel) {
        return key;
      }
    }
  }
  return null;
}

function parseNumericValue(value: unknown): number {
  if (value === null || value === undefined || value === '') {
    return 0;
  }
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    // Remove currency symbols, dots as thousands separators, and convert comma to dot
    const cleaned = value
      .replace(/R\$\s*/g, '')
      .replace(/\./g, '')
      .replace(',', '.')
      .replace(/[^\d.-]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

interface YearMonths {
  year: number;
  months: number[]; // 0-11
}

function getYearMonthsForPeriod(startDate: string, endDate: string): YearMonths[] {
  const start = new Date(startDate);
  let end = new Date(endDate);
  const result: YearMonths[] = [];
  
  // Se a data final é o primeiro dia do mês, 
  // considerar o mês anterior como o último mês do período
  // Isso evita incluir um mês inteiro quando só o dia 1 está no range
  if (end.getDate() === 1) {
    end = new Date(end);
    end.setDate(0); // Vai para o último dia do mês anterior
  }
  
  const startYear = start.getFullYear();
  const endYear = end.getFullYear();
  const startMonth = start.getMonth();
  const endMonth = end.getMonth();
  
  for (let year = startYear; year <= endYear; year++) {
    // Only support 2025 and 2026
    if (year !== 2025 && year !== 2026) continue;
    
    const fromMonth = year === startYear ? startMonth : 0;
    const toMonth = year === endYear ? endMonth : 11;
    
    const months: number[] = [];
    for (let month = fromMonth; month <= toMonth; month++) {
      months.push(month);
    }
    
    if (months.length > 0) {
      result.push({ year, months });
    }
  }
  
  return result;
}

function getColumnIndices(year: number, months: number[]): number[] {
  const columnMap = year === 2025 ? MONTH_COLUMNS_2025 : MONTH_COLUMNS_2026;
  return months.map(month => columnMap[month]).filter(col => col !== undefined);
}

async function fetchSheetData(tabName: string): Promise<{ rows: any[] }> {
  const sheetUrl = `https://docs.google.com/spreadsheets/d/${MARKETING_SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(tabName)}`;
  
  console.log(`Fetching from: ${tabName}`);
  
  const response = await fetch(sheetUrl);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch sheet ${tabName}: ${response.status} ${response.statusText}`);
  }
  
  const text = await response.text();
  
  // Google Visualization API returns JSONP, extract JSON
  const jsonMatch = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);?$/);
  if (!jsonMatch) {
    throw new Error(`Invalid response format from ${tabName}`);
  }
  
  const jsonData = JSON.parse(jsonMatch[1]);
  
  if (!jsonData.table || !jsonData.table.rows) {
    throw new Error(`No data found in ${tabName}`);
  }
  
  return { rows: jsonData.table.rows };
}

function parseMetricsFromRows(rows: any[], columnIndices: number[]): Record<string, number> {
  const metrics: Record<string, number> = {};
  
  for (const row of rows) {
    if (!row.c || !row.c[0]) continue;
    
    const label = row.c[0].v;
    if (typeof label !== 'string') continue;
    
    const metricKey = findMetricKey(label);
    if (!metricKey) continue;
    
    // Sum values for selected months
    let sum = 0;
    for (const colIndex of columnIndices) {
      if (row.c[colIndex] && row.c[colIndex].v !== null) {
        sum += parseNumericValue(row.c[colIndex].v);
      }
    }
    
    metrics[metricKey] = sum;
  }
  
  return metrics;
}

function mergeMetrics(
  data2025: Record<string, number> | null, 
  data2026: Record<string, number> | null
): Record<string, number> {
  // If only one year has data, return that
  if (!data2025 || Object.keys(data2025).length === 0) {
    return data2026 || {};
  }
  if (!data2026 || Object.keys(data2026).length === 0) {
    return data2025;
  }
  
  const merged: Record<string, number> = {};
  const allKeys = new Set([...Object.keys(data2025), ...Object.keys(data2026)]);
  
  for (const key of allKeys) {
    const val2025 = data2025[key] || 0;
    const val2026 = data2026[key] || 0;
    
    if (SUMMABLE_METRICS.has(key)) {
      // Sum absolute values
      merged[key] = val2025 + val2026;
    } else if (RATIO_METRICS.has(key)) {
      // For ratios, we'll recalculate after based on totals
      // For now, just sum (will be recalculated below)
      merged[key] = val2025 + val2026;
    } else {
      // Unknown metric, sum as fallback
      merged[key] = val2025 + val2026;
    }
  }
  
  // Recalculate ratio metrics based on merged totals
  const midiaTotal = merged.midiaTotal || 0;
  const leadsTotais = merged.leadsTotais || 0;
  const mqls = merged.mqlPorFaturamento || 0;
  const rms = merged.reuniaoMarcada || 0;
  const rrs = merged.reuniaoRealizada || 0;
  const propostas = merged.propostaEnviada || 0;
  const vendas = merged.vendas || 0;
  
  // Recalculate CPL metrics
  if (leadsTotais > 0) {
    merged.cplTotal = midiaTotal / leadsTotais;
  }
  
  const midiaGoogle = merged.midiaGoogle || 0;
  const leadsGoogle = merged.leadsGoogle || 0;
  if (leadsGoogle > 0) {
    merged.cplGoogle = midiaGoogle / leadsGoogle;
  }
  
  const midiaMeta = merged.midiaMeta || 0;
  const leadsMeta = merged.leadsMeta || 0;
  if (leadsMeta > 0) {
    merged.cplMeta = midiaMeta / leadsMeta;
  }
  
  // Recalculate funnel CPX metrics
  if (mqls > 0) {
    merged.cpmqlPorFaturamento = midiaTotal / mqls;
  }
  if (rms > 0) {
    merged.cprm = midiaTotal / rms;
  }
  if (rrs > 0) {
    merged.cprr = midiaTotal / rrs;
  }
  if (propostas > 0) {
    merged.cpp = midiaTotal / propostas;
  }
  if (vendas > 0) {
    merged.cpv = midiaTotal / vendas;
    merged.cac = midiaTotal / vendas;
  }
  
  // ROAS = GMV / Mídia
  const gmv = merged.gmv || 0;
  if (midiaTotal > 0) {
    merged.roas = gmv / midiaTotal;
  }
  
  // LTV/CAC ratio
  const ltv = merged.ltv || 0;
  const cac = merged.cac || 0;
  if (cac > 0) {
    merged.ltvCac = ltv / cac;
  }
  
  return merged;
}

// Fetch Meta API data for a period (fallback when sheet has no data)
async function fetchMetaDataForPeriod(
  startDate: string, 
  endDate: string,
  metaAccessToken: string,
  metaAdAccountId: string
): Promise<{ spend: number; leads: number; impressions: number; clicks: number }> {
  
  const formattedAccountId = metaAdAccountId.startsWith('act_') 
    ? metaAdAccountId 
    : `act_${metaAdAccountId}`;
    
  // Format dates for Meta API (YYYY-MM-DD)
  const since = startDate.split('T')[0];
  const until = endDate.split('T')[0];
  const timeRange = JSON.stringify({ since, until });
  const fields = "spend,impressions,clicks,actions";
  
  const url = `https://graph.facebook.com/v21.0/${formattedAccountId}/insights?fields=${fields}&time_range=${encodeURIComponent(timeRange)}&access_token=${metaAccessToken}`;
  
  console.log('Fetching Meta API fallback for period:', { since, until });
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error) {
      console.error("Meta API error:", data.error);
      return { spend: 0, leads: 0, impressions: 0, clicks: 0 };
    }
    
    const insights = data.data?.[0] || {};
    const spend = parseFloat(insights.spend || '0');
    const impressions = parseInt(insights.impressions || '0', 10);
    const clicks = parseInt(insights.clicks || '0', 10);
    
    // Extract leads from actions
    let leads = 0;
    if (insights.actions) {
      const leadAction = insights.actions.find((a: any) => 
        a.action_type === 'lead' || 
        a.action_type === 'onsite_conversion.lead_grouped' ||
        a.action_type === 'offsite_conversion.fb_pixel_lead'
      );
      leads = leadAction ? parseInt(leadAction.value, 10) : 0;
    }
    
    console.log('Meta API fallback result:', { spend, leads, impressions, clicks });
    
    return { spend, leads, impressions, clicks };
  } catch (error) {
    console.error("Meta API fetch error:", error);
    return { spend: 0, leads: 0, impressions: 0, clicks: 0 };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { startDate, endDate } = await req.json();
    
    console.log('Fetching marketing sheet data:', { startDate, endDate });
    
    // Determine which years/months to fetch
    const yearMonthsList = startDate && endDate 
      ? getYearMonthsForPeriod(startDate, endDate)
      : [{ year: 2026, months: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] }]; // Default to full 2026
    
    console.log('Year/months to fetch:', yearMonthsList);
    
    let data2025: Record<string, number> | null = null;
    let data2026: Record<string, number> | null = null;
    let totalMonthsIncluded = 0;
    
    // Fetch data for each year
    for (const { year, months } of yearMonthsList) {
      const tabConfig = TAB_CONFIGS[year];
      if (!tabConfig) {
        console.log(`No tab config for year ${year}, skipping`);
        continue;
      }
      
      try {
        const { rows } = await fetchSheetData(tabConfig.name);
        const columnIndices = getColumnIndices(year, months);
        
        console.log(`Year ${year}: fetching columns ${columnIndices.join(', ')} for months ${months.join(', ')}`);
        
        const metrics = parseMetricsFromRows(rows, columnIndices);
        
        console.log(`Year ${year}: parsed ${Object.keys(metrics).length} metrics`);
        
        if (year === 2025) {
          data2025 = metrics;
        } else if (year === 2026) {
          data2026 = metrics;
        }
        
        totalMonthsIncluded += months.length;
      } catch (err) {
        console.error(`Error fetching year ${year}:`, err);
        // Continue with other years
      }
    }
    
    // Merge data from both years if needed
    let metrics = mergeMetrics(data2025, data2026);
    
    // Check if sheet returned data (indicator: midiaTotal > 0)
    const hasSheetData = (metrics.midiaTotal || 0) > 0;
    let dataSource = 'sheet';
    
    if (!hasSheetData && startDate && endDate) {
      // Fetch fallback from Meta API
      const metaToken = Deno.env.get("META_ACCESS_TOKEN");
      const metaAccount = Deno.env.get("META_AD_ACCOUNT_ID");
      
      if (metaToken && metaAccount) {
        console.log("Sheet has no data, fetching from Meta API as fallback");
        
        const metaData = await fetchMetaDataForPeriod(startDate, endDate, metaToken, metaAccount);
        
        // Fill only Meta Ads (not Google)
        metrics.midiaMeta = metaData.spend;
        metrics.midiaTotal = metaData.spend; // Only Meta, Google = 0
        metrics.leadsMeta = metaData.leads;
        metrics.leadsTotais = metaData.leads;
        
        // Recalculate CPL
        if (metaData.leads > 0) {
          metrics.cplMeta = metaData.spend / metaData.leads;
          metrics.cplTotal = metaData.spend / metaData.leads;
        }
        
        // The rest stays 0 (no source available)
        // MQL, RM, RR, Propostas, Vendas, MRR, Setup, etc = 0
        dataSource = 'meta_api';
      } else {
        console.log("No Meta API credentials available for fallback");
        dataSource = 'none';
      }
    }
    
    console.log('Final metrics:', Object.keys(metrics).length, 'metrics, source:', dataSource);
    
    // Return structured data
    const result = {
      // Channel data
      midiaGoogle: metrics.midiaGoogle || 0,
      leadsGoogle: metrics.leadsGoogle || 0,
      cplGoogle: metrics.cplGoogle || 0,
      midiaMeta: metrics.midiaMeta || 0,
      leadsMeta: metrics.leadsMeta || 0,
      cplMeta: metrics.cplMeta || 0,
      
      // Totals
      midiaTotal: metrics.midiaTotal || 0,
      leadsTotais: metrics.leadsTotais || 0,
      cplTotal: metrics.cplTotal || 0,
      
      // Funnel
      mqlPorFaturamento: metrics.mqlPorFaturamento || 0,
      cpmqlPorFaturamento: metrics.cpmqlPorFaturamento || 0,
      reuniaoMarcada: metrics.reuniaoMarcada || 0,
      cprm: metrics.cprm || 0,
      reuniaoRealizada: metrics.reuniaoRealizada || 0,
      cprr: metrics.cprr || 0,
      propostaEnviada: metrics.propostaEnviada || 0,
      cpp: metrics.cpp || 0,
      vendas: metrics.vendas || 0,
      cpv: metrics.cpv || 0,
      
      // Revenue
      mrr: metrics.mrr || 0,
      setup: metrics.setup || 0,
      pontual: metrics.pontual || 0,
      educacao: metrics.educacao || 0,
      gmv: metrics.gmv || 0,
      
      // Performance
      cac: metrics.cac || 0,
      ltv: metrics.ltv || 0,
      tcv: metrics.tcv || 0,
      roas: metrics.roas || 0,
      roasLtv: metrics.roasLtv || 0,
      roiLtv: metrics.roiLtv || 0,
      ltvCac: metrics.ltvCac || 0,
      
      // Meta
      period: { startDate, endDate },
      monthsIncluded: totalMonthsIncluded,
      yearsIncluded: yearMonthsList.map(ym => ym.year),
      dataSource, // 'sheet', 'meta_api', or 'none'
    };
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching marketing sheet:', errorMessage);
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: String(error)
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});