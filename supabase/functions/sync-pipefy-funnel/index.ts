import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Pipefy GraphQL endpoint
const PIPEFY_API_URL = 'https://api.pipefy.com/graphql';

// Pipe configuration with real IDs
const PIPE_CONFIG = {
  MODELO_ATUAL: { pipeId: '304018800', buKey: 'modelo_atual' },
  O2_TAX: { pipeId: '306726031', buKey: 'o2_tax' },
  EXPANSAO: { pipeId: '306732461', buKey: null }, // BU determined by Produto field
};

// Map phase names to indicator keys
const PHASE_TO_INDICATOR: Record<string, string> = {
  // RM phases
  'Reunião agendada': 'rm',
  'Qualificado': 'rm',
  // RR phase
  'Reunião Realizada': 'rr',
  // Proposta phases
  'Proposta enviada': 'proposta',
  'Follow Up': 'proposta',
  // Venda phase (only "Ganho" counts as sale)
  'Ganho': 'venda',
};

// Field names in Pipefy
const FIELD_NAMES = {
  FATURAMENTO: 'Faixa de faturamento mensal',
  PRODUTO: 'Produto',
  DATA_ASSINATURA: 'Data de assinatura do contrato',
};

// Revenue values that qualify as MQL (above R$200k)
const MQL_FATURAMENTO_VALUES = [
  'Entre R$ 200 mil e R$ 350 mil',
  'Entre R$ 350 mil e R$ 500 mil',
  'Entre R$ 500 mil e R$ 1 milhão',
  'Entre R$ 1 milhão e R$ 5 milhões',
  'Acima de R$ 5 milhões',
];

// Map product field to BU key (for Expansão pipe)
const PRODUCT_TO_BU: Record<string, string> = {
  'Oxy Hacker': 'oxy_hacker',
  'Franquia': 'franquia',
};

// Month mapping
const MONTH_MAP: Record<number, string> = {
  1: 'Jan', 2: 'Fev', 3: 'Mar', 4: 'Abr',
  5: 'Mai', 6: 'Jun', 7: 'Jul', 8: 'Ago',
  9: 'Set', 10: 'Out', 11: 'Nov', 12: 'Dez',
};

// Input validation schema
const requestBodySchema = z.object({
  year: z.number().int().min(2020).max(2100).optional(),
}).optional();

interface PipefyFieldValue {
  field: {
    id: string;
    label: string;
  };
  value: string | null;
  datetime_value: string | null;
}

interface PipefyCard {
  id: string;
  title: string;
  created_at: string;
  current_phase: {
    id: string;
    name: string;
  };
  fields: PipefyFieldValue[];
}

interface PipefyPhase {
  id: string;
  name: string;
  cards_count: number;
}

interface PipefyPipeResponse {
  data: {
    pipe: {
      id: string;
      name: string;
      phases: PipefyPhase[];
    };
  };
  errors?: Array<{ message: string }>;
}

interface PipefyCardsResponse {
  data: {
    allCards: {
      edges: Array<{
        node: PipefyCard;
      }>;
      pageInfo: {
        hasNextPage: boolean;
        endCursor: string | null;
      };
    };
  };
  errors?: Array<{ message: string }>;
}

interface DailyRecord {
  bu: string;
  indicator: string;
  date: string;
  value: number;
}

interface ProcessedCard {
  bu: string | null;
  createdDate: string;
  indicators: string[];
  saleDate?: string;
}

// Normalize API key: trim whitespace and remove "Bearer " prefix if present
function normalizeApiKey(key: string): string {
  let normalized = key.trim();
  if (normalized.toLowerCase().startsWith('bearer ')) {
    normalized = normalized.substring(7).trim();
  }
  return normalized;
}

// Test Pipefy API connection with a simple query
async function testPipefyConnection(apiKey: string): Promise<{ success: boolean; error?: string }> {
  const query = `query { me { id name } }`;
  
  try {
    const response = await fetch(PIPEFY_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Pipefy auth test failed - Status: ${response.status}, Body: ${errorBody}`);
      return { success: false, error: `HTTP ${response.status}: ${errorBody}` };
    }

    const result = await response.json();
    if (result.errors?.length) {
      console.error('Pipefy auth test errors:', result.errors);
      return { success: false, error: result.errors.map((e: { message: string }) => e.message).join(', ') };
    }

    console.log(`Pipefy connection OK - User: ${result.data?.me?.name || 'Unknown'}`);
    return { success: true };
  } catch (error) {
    console.error('Pipefy auth test exception:', error);
    return { success: false, error: String(error) };
  }
}

// Fetch all cards from a pipe with pagination
async function fetchAllCards(pipeId: string, apiKey: string): Promise<{ cards: PipefyCard[]; error?: string }> {
  const allCards: PipefyCard[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;

  while (hasNextPage) {
    // Use larger batch size (100) to reduce API calls
    const query = `
      query {
        allCards(
          pipeId: ${pipeId}, 
          first: 100
          ${cursor ? `, after: "${cursor}"` : ''}
        ) {
          edges {
            node {
              id
              title
              created_at
              current_phase {
                id
                name
              }
              fields {
                field {
                  id
                  label
                }
                value
                datetime_value
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;

    try {
      const response = await fetch(PIPEFY_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Pipefy API HTTP error: ${response.status} - Body: ${errorBody}`);
        return { cards: allCards, error: `HTTP ${response.status}: Authentication failed` };
      }

      const result: PipefyCardsResponse = await response.json();

      if (result.errors?.length) {
        console.error('Pipefy API errors:', result.errors);
        return { cards: allCards, error: result.errors.map(e => e.message).join(', ') };
      }

      const edges = result.data?.allCards?.edges || [];
      edges.forEach(edge => allCards.push(edge.node));

      hasNextPage = result.data?.allCards?.pageInfo?.hasNextPage || false;
      cursor = result.data?.allCards?.pageInfo?.endCursor || null;

      console.log(`Fetched ${edges.length} cards, total: ${allCards.length}, hasNextPage: ${hasNextPage}`);
    } catch (error) {
      console.error('Error fetching cards:', error);
      return { cards: allCards, error: String(error) };
    }
  }

  return { cards: allCards };
}

// Get field value by label
function getFieldValue(card: PipefyCard, fieldLabel: string): string | null {
  const field = card.fields.find(f => f.field.label === fieldLabel);
  return field?.value || field?.datetime_value || null;
}

// Process a single card and determine its indicators
function processCard(card: PipefyCard, pipeKey: string): ProcessedCard | null {
  const createdDate = card.created_at.split('T')[0];
  const indicators: string[] = [];
  let bu: string | null = null;

  // Determine BU based on pipe
  if (pipeKey === 'EXPANSAO') {
    const produto = getFieldValue(card, FIELD_NAMES.PRODUTO);
    if (produto && PRODUCT_TO_BU[produto]) {
      bu = PRODUCT_TO_BU[produto];
    } else {
      console.log(`Card ${card.id}: Produto field not recognized: "${produto}"`);
      return null; // Skip cards without valid product
    }
  } else if (pipeKey === 'MODELO_ATUAL') {
    bu = PIPE_CONFIG.MODELO_ATUAL.buKey;
  } else if (pipeKey === 'O2_TAX') {
    bu = PIPE_CONFIG.O2_TAX.buKey;
  }

  if (!bu) return null;

  // Every card is a LEAD
  indicators.push('leads');

  // Check MQL qualification (faturamento field)
  const faturamento = getFieldValue(card, FIELD_NAMES.FATURAMENTO);
  if (faturamento && MQL_FATURAMENTO_VALUES.includes(faturamento)) {
    indicators.push('mql');
  }

  // Check phase-based indicators
  const phaseName = card.current_phase?.name;
  if (phaseName && PHASE_TO_INDICATOR[phaseName]) {
    const indicator = PHASE_TO_INDICATOR[phaseName];
    
    // Special validation for "venda": requires Data de assinatura do contrato
    if (indicator === 'venda') {
      const dataAssinatura = getFieldValue(card, FIELD_NAMES.DATA_ASSINATURA);
      if (dataAssinatura) {
        indicators.push('venda');
        // Return with the sale date for proper attribution
        return {
          bu,
          createdDate,
          indicators,
          saleDate: dataAssinatura.split('T')[0],
        };
      }
      // If no data assinatura, don't count as venda
    } else {
      indicators.push(indicator);
    }
  }

  return { bu, createdDate, indicators };
}

// Aggregate records by bu, indicator, date
function aggregateRecords(records: DailyRecord[]): DailyRecord[] {
  const aggregated = new Map<string, DailyRecord>();

  records.forEach(record => {
    const key = `${record.bu}|${record.indicator}|${record.date}`;
    const existing = aggregated.get(key);
    if (existing) {
      existing.value += record.value;
    } else {
      aggregated.set(key, { ...record });
    }
  });

  return Array.from(aggregated.values());
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ========== AUTHENTICATION CHECK ==========
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user's JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Authentication failed:', authError?.message || 'Invalid token');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`User authenticated: ${user.id}`);

    // Check if user has admin role
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (roleError || !roleData) {
      console.error('Admin role check failed:', roleError?.message || 'User is not an admin');
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Admin role verified, proceeding with sync...');
    // ========== END AUTHENTICATION CHECK ==========

    const rawPipefyApiKey = Deno.env.get('PIPEFY_API_KEY');
    if (!rawPipefyApiKey) {
      console.error('PIPEFY_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'PIPEFY_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize the API key
    const pipefyApiKey = normalizeApiKey(rawPipefyApiKey);
    console.log(`API key length after normalization: ${pipefyApiKey.length} chars`);

    // Test connection before processing
    const connectionTest = await testPipefyConnection(pipefyApiKey);
    if (!connectionTest.success) {
      console.error('Pipefy connection test failed:', connectionTest.error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Falha de autenticação com Pipefy', 
          details: connectionTest.error 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse and validate request body
    let year = new Date().getFullYear();
    try {
      const body = await req.json();
      const validated = requestBodySchema.parse(body);
      if (validated?.year) year = validated.year;
    } catch {
      // No body or invalid JSON, use current year
    }

    console.log(`Syncing Pipefy funnel data for year ${year}...`);

    const allRecords: DailyRecord[] = [];
    const pipeResults: Record<string, { cards: number; success: boolean; error?: string }> = {};
    let hasAuthError = false;

    console.log(`Starting parallel fetch for all pipes (year: ${year})...`);
    const startTime = Date.now();

    // Process all pipes in parallel for faster execution
    const pipeEntries = Object.entries(PIPE_CONFIG);
    const pipePromises = pipeEntries.map(async ([pipeKey, config]) => {
      console.log(`\n===== Processing pipe: ${pipeKey} (ID: ${config.pipeId}) =====`);

      try {
        const { cards, error: fetchError } = await fetchAllCards(config.pipeId, pipefyApiKey);
        
        if (fetchError) {
          console.error(`Pipe ${pipeKey} fetch error: ${fetchError}`);
          return { pipeKey, result: { cards: 0, success: false, error: fetchError }, records: [] as DailyRecord[] };
        }
        
        console.log(`Fetched ${cards.length} cards from ${pipeKey} for year ${year}`);

        let processedCount = 0;
        let skippedCount = 0;
        const pipeRecords: DailyRecord[] = [];

        cards.forEach(card => {
          // Filter out cards beyond the target year (since we only filter gte, not lte)
          const createdYear = new Date(card.created_at).getFullYear();
          if (createdYear !== year) {
            return;
          }

          const processed = processCard(card, pipeKey);
          if (!processed) {
            skippedCount++;
            return;
          }

          processedCount++;

          // Create records for each indicator
          processed.indicators.forEach(indicator => {
            // For "venda", use the sale date; for others, use created date
            const recordDate = indicator === 'venda' && processed.saleDate 
              ? processed.saleDate 
              : processed.createdDate;

            pipeRecords.push({
              bu: processed.bu!,
              indicator,
              date: recordDate,
              value: 1,
            });
          });
        });

        console.log(`Pipe ${pipeKey}: processed ${processedCount}, skipped ${skippedCount}`);
        return { pipeKey, result: { cards: processedCount, success: true }, records: pipeRecords };

      } catch (error) {
        console.error(`Error processing pipe ${pipeKey}:`, error);
        return { pipeKey, result: { cards: 0, success: false, error: String(error) }, records: [] as DailyRecord[] };
      }
    });

    // Wait for all pipes to complete
    const pipeResultsArray = await Promise.all(pipePromises);
    
    // Collect results
    pipeResultsArray.forEach(({ pipeKey, result, records }) => {
      pipeResults[pipeKey] = result;
      allRecords.push(...records);
      if (result.error?.includes('401') || result.error?.includes('Authentication')) {
        hasAuthError = true;
      }
    });

    const fetchTime = Date.now() - startTime;
    console.log(`\nParallel fetch completed in ${fetchTime}ms`);

    // Aggregate records
    const aggregatedRecords = aggregateRecords(allRecords);
    console.log(`\nTotal raw records: ${allRecords.length}, aggregated: ${aggregatedRecords.length}`);

    // Prepare records for upsert
    const dbRecords = aggregatedRecords.map(record => ({
      bu: record.bu,
      date: record.date,
      indicator: record.indicator,
      month: MONTH_MAP[parseInt(record.date.split('-')[1])],
      year,
      value: record.value,
      updated_at: new Date().toISOString(),
    }));

    // Delete existing records for this year before inserting
    console.log(`Deleting existing records for year ${year}...`);
    const { error: deleteError } = await supabase
      .from('funnel_realized')
      .delete()
      .eq('year', year);

    if (deleteError) {
      console.error('Delete error:', deleteError);
    }

    // Batch insert
    const batchSize = 100;
    let insertedCount = 0;

    for (let i = 0; i < dbRecords.length; i += batchSize) {
      const batch = dbRecords.slice(i, i + batchSize);

      const { error: insertError } = await supabase
        .from('funnel_realized')
        .insert(batch);

      if (insertError) {
        console.error('Insert error:', insertError);
      } else {
        insertedCount += batch.length;
      }
    }

    console.log(`\nSync completed: inserted ${insertedCount} records`);

    // Summary by BU
    const buSummary: Record<string, Record<string, number>> = {};
    aggregatedRecords.forEach(r => {
      if (!buSummary[r.bu]) buSummary[r.bu] = {};
      if (!buSummary[r.bu][r.indicator]) buSummary[r.bu][r.indicator] = 0;
      buSummary[r.bu][r.indicator] += r.value;
    });

    console.log('Summary by BU:', JSON.stringify(buSummary, null, 2));

    const overallSuccess = !hasAuthError && Object.values(pipeResults).some(p => p.success);
    
    return new Response(
      JSON.stringify({
        success: overallSuccess,
        message: overallSuccess 
          ? `Sincronizados ${insertedCount} registros do Pipefy` 
          : 'Falha na sincronização - verifique a chave de API',
        year,
        insertedCount,
        pipeResults,
        summary: buSummary,
      }),
      { 
        status: overallSuccess ? 200 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Sync error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
