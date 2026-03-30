import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import pg from "npm:pg@8.13.1";
const { Client } = pg;

interface CountRow {
  total: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const body = await req.json();
    const { table, action = 'preview', limit = 100, offset = 0 } = body;
    
    // Verify user is authenticated (any authenticated user can read expansão data)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`User ${user.email} - Action: ${action}, Table: ${table}, Limit: ${limit}`);

    // Get external database credentials
    const host = Deno.env.get('EXTERNAL_PG_HOST');
    const port = Deno.env.get('EXTERNAL_PG_PORT');
    const database = Deno.env.get('EXTERNAL_PG_DATABASE');
    const dbUser = Deno.env.get('EXTERNAL_PG_USER');
    const password = Deno.env.get('EXTERNAL_PG_PASSWORD');

    if (!host || !port || !database || !dbUser || !password) {
      console.error('Missing external database credentials');
      return new Response(
        JSON.stringify({ error: 'External database credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Connecting to external database: ${host}:${port}/${database}`);

    // Connect to external PostgreSQL database
    const client = new Client({
      host: host,
      port: parseInt(port),
      database: database,
      user: dbUser,
      password: password,
      ssl: false,
    });

    await client.connect();
    console.log('Connected to external database successfully');

    let result: Record<string, unknown>;

    const validTables = ['pipefy_cards', 'pipefy_cards_expansao', 'pipefy_cards_movements', 'pipefy_cards_movements_expansao', 'pipefy_moviment_cfos', 'pipefy_central_projetos', 'pipefy_moviment_tratativas', 'pipefy_db_clientes', 'pipefy_db_pessoas', 'pipefy_moviment_nps', 'pipefy_moviment_setup', 'pipefy_moviment_rotinas', 'pipefy_card_connections'];

    const validateTable = async (tbl: string) => {
      if (!validTables.includes(tbl)) {
        await client.end();
        return new Response(
          JSON.stringify({ error: 'Invalid table name' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return null;
    };

    if (action === 'schema') {
      const schemaQuery = `
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
      `;
      const schemaResult = await client.query(schemaQuery, [table]);
      result = {
        action: 'schema',
        table,
        columns: schemaResult.rows,
      };
      console.log(`Schema for ${table}:`, result.columns);
    } else if (action === 'preview') {
      const invalid = await validateTable(table);
      if (invalid) return invalid;

      const dataQuery = `SELECT * FROM ${table} LIMIT $1`;
      const dataResult = await client.query(dataQuery, [limit]);
      
      const countQuery = `SELECT COUNT(*) as total FROM ${table}`;
      const countResult = await client.query(countQuery);
      
      result = {
        action: 'preview',
        table,
        totalRows: countResult.rows[0]?.total,
        previewRows: dataResult.rows.length,
        data: dataResult.rows,
      };
      console.log(`Preview for ${table}: ${result.previewRows} rows of ${result.totalRows} total`);
    } else if (action === 'count') {
      const invalid = await validateTable(table);
      if (invalid) return invalid;

      const countQuery = `SELECT COUNT(*) as total FROM ${table}`;
      const countResult = await client.query(countQuery);
      
      result = {
        action: 'count',
        table,
        totalRows: countResult.rows[0]?.total,
      };
      console.log(`Count for ${table}: ${result.totalRows}`);
    } else if (action === 'query_period') {
      const { startDate, endDate } = body;
      const invalid = await validateTable(table);
      if (invalid) return invalid;

      console.log(`Querying ${table} for period: ${startDate} to ${endDate}`);

      const dataQuery = `
        SELECT * FROM ${table} 
        WHERE "Entrada" >= $1::timestamp 
        AND "Entrada" <= $2::timestamp 
        ORDER BY "Entrada" DESC 
        LIMIT $3 OFFSET $4
      `;
      const dataResult = await client.query(dataQuery, [startDate, endDate, limit, offset]);
      
      const countQuery = `
        SELECT COUNT(*) as total FROM ${table} 
        WHERE "Entrada" >= $1::timestamp 
        AND "Entrada" <= $2::timestamp
      `;
      const countResult = await client.query(countQuery, [startDate, endDate]);
      
      result = {
        action: 'query_period',
        table,
        startDate,
        endDate,
        totalRows: countResult.rows[0]?.total,
        previewRows: dataResult.rows.length,
        data: dataResult.rows,
      };
      console.log(`Period query for ${table}: ${result.previewRows} rows of ${result.totalRows} total in period`);
    } else if (action === 'search') {
      const { searchTerm, searchColumn = 'Título' } = body;
      const invalid = await validateTable(table);
      if (invalid) return invalid;

      const allowedColumns = ['Título', 'ID', 'Empresa', 'Nome', 'Fase', 'Fase Atual', 'Campanha', 'Conjunto/grupo', 'Fonte', 'Origem do lead'];
      if (!allowedColumns.includes(searchColumn)) {
        await client.end();
        return new Response(
          JSON.stringify({ error: `Invalid search column. Allowed: ${allowedColumns.join(', ')}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Searching ${table} for term: ${searchTerm} in column: ${searchColumn}`);

      let searchQuery: string;
      let searchPattern: string;
      
      if (searchColumn === 'ID') {
        searchQuery = `
          SELECT * FROM ${table} 
          WHERE "ID" = $1
          ORDER BY "Entrada" DESC 
          LIMIT $2
        `;
        searchPattern = searchTerm;
      } else {
        searchQuery = `
          SELECT * FROM ${table} 
          WHERE "${searchColumn}" ILIKE $1
          ORDER BY "Entrada" DESC 
          LIMIT $2
        `;
        searchPattern = `%${searchTerm}%`;
      }
      
      const dataResult = await client.query(searchQuery, [searchPattern, limit]);
      
      result = {
        action: 'search',
        table,
        searchTerm,
        searchColumn,
        totalRows: dataResult.rows.length,
        data: dataResult.rows,
      };
      console.log(`Search for "${searchTerm}" in column "${searchColumn}" of ${table}: ${result.totalRows} rows found`);
    } else if (action === 'stats') {
      const invalid = await validateTable(table);
      if (invalid) return invalid;

      const statsQuery = `
        SELECT 
          COUNT(*) as total_rows,
          MIN("Entrada") as min_entrada,
          MAX("Entrada") as max_entrada,
          COUNT(CASE WHEN "Entrada" >= '2026-01-01' THEN 1 END) as count_2026
        FROM ${table}
      `;
      const statsResult = await client.query(statsQuery);
      
      result = {
        action: 'stats',
        table,
        stats: statsResult.rows[0],
      };
      console.log(`Stats for ${table}:`, result.stats);
    } else if (action === 'query_card_history') {
      const { cardIds } = body;
      
      if (!Array.isArray(cardIds) || cardIds.length === 0) {
        await client.end();
        return new Response(
          JSON.stringify({ error: 'cardIds array required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const invalid = await validateTable(table);
      if (invalid) return invalid;
      
      const limitedIds = cardIds.slice(0, 500);
      
      console.log(`Querying full history for ${limitedIds.length} card IDs in ${table}`);
      
      const placeholders = limitedIds.map((_: string, i: number) => `$${i + 1}`).join(', ');
      const dataQuery = `
        SELECT * FROM ${table} 
        WHERE "ID" IN (${placeholders})
        ORDER BY "Entrada" ASC
      `;
      
      const dataResult = await client.query(dataQuery, limitedIds);
      
      result = {
        action: 'query_card_history',
        table,
        cardIds: limitedIds,
        totalRows: dataResult.rows.length,
        data: dataResult.rows,
      };
      console.log(`Card history query: ${result.totalRows} total movements for ${limitedIds.length} cards`);
    } else if (action === 'query_period_by_signature') {
      const { startDate, endDate } = body;
      const invalid = await validateTable(table);
      if (invalid) return invalid;

      console.log(`Querying ${table} by signature date for period: ${startDate} to ${endDate}`);

      const dataQuery = `
        SELECT * FROM ${table} 
        WHERE "Data de assinatura do contrato" >= $1::timestamp 
        AND "Data de assinatura do contrato" <= $2::timestamp 
        ORDER BY "Data de assinatura do contrato" DESC 
        LIMIT $3 OFFSET $4
      `;
      const dataResult = await client.query(dataQuery, [startDate, endDate, limit, offset]);
      
      const countQuery = `
        SELECT COUNT(*) as total FROM ${table} 
        WHERE "Data de assinatura do contrato" >= $1::timestamp 
        AND "Data de assinatura do contrato" <= $2::timestamp
      `;
      const countResult = await client.query(countQuery, [startDate, endDate]);
      
      result = {
        action: 'query_period_by_signature',
        table,
        startDate,
        endDate,
        totalRows: countResult.rows[0]?.total,
        previewRows: dataResult.rows.length,
        data: dataResult.rows,
      };
      console.log(`Signature date query for ${table}: ${result.previewRows} rows of ${result.totalRows} total in period`);
    } else if (action === 'query_period_by_creation') {
      const { startDate, endDate } = body;
      const invalid = await validateTable(table);
      if (invalid) return invalid;

      console.log(`Querying ${table} by creation date for period: ${startDate} to ${endDate}`);

      const dataQuery = `
        SELECT * FROM ${table} 
        WHERE "Data Criação" >= $1::timestamp 
        AND "Data Criação" <= $2::timestamp 
        ORDER BY "Data Criação" DESC 
        LIMIT $3 OFFSET $4
      `;
      const dataResult = await client.query(dataQuery, [startDate, endDate, limit, offset]);
      
      const countQuery = `
        SELECT COUNT(*) as total FROM ${table} 
        WHERE "Data Criação" >= $1::timestamp 
        AND "Data Criação" <= $2::timestamp
      `;
      const countResult = await client.query(countQuery, [startDate, endDate]);
      
      result = {
        action: 'query_period_by_creation',
        table,
        startDate,
        endDate,
        totalRows: countResult.rows[0]?.total,
        previewRows: dataResult.rows.length,
        data: dataResult.rows,
      };
      console.log(`Creation date query for ${table}: ${result.previewRows} rows of ${result.totalRows} total in period`);
    } else if (action === 'mql_diagnosis') {
      const { startDate, endDate, pipefyTitles } = body;
      const invalid = await validateTable(table);
      if (invalid) return invalid;

      const testIds = ['1320546949', '1320177174', '1308003007', '1320175421'];
      const excludedLosses = ['Duplicado', 'Pessoa física, fora do ICP', 'Não é uma demanda real',
        'Buscando parceria', 'Quer soluções para cliente', 'Não é MQL, mas entrou como MQL', 'Email/Telefone Inválido'];
      const qualifyingFaixas = ['Entre R$ 200 mil e R$ 350 mil', 'Entre R$ 350 mil e R$ 500 mil',
        'Entre R$ 500 mil e R$ 1 milhão', 'Entre R$ 1 milhão e R$ 5 milhões', 'Acima de R$ 5 milhões'];

      // Normalize: trim, lowercase, remove accents, collapse whitespace (same as system)
      const normalize = (s: string) => s.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');
      const normalizedExcludedLosses = excludedLosses.map(normalize);

      const dataQuery = `
        SELECT "ID",
               MAX("Título") as titulo,
               array_agg(DISTINCT "Faixa de faturamento mensal") FILTER (WHERE "Faixa de faturamento mensal" IS NOT NULL) as faixas,
               array_agg(DISTINCT "Motivo da perda") FILTER (WHERE "Motivo da perda" IS NOT NULL) as motivos_perda,
               MAX("Fase Atual") as fase_atual
        FROM ${table}
        WHERE "Data Criação" >= $1::timestamp AND "Data Criação" <= $2::timestamp
        GROUP BY "ID"
      `;
      const dataResult = await client.query(dataQuery, [startDate, endDate]);

      const allCards = dataResult.rows as Array<{ID: string; titulo: string; faixas: string[] | null; motivos_perda: string[] | null; fase_atual: string}>;
      
      const qualified = allCards.filter(c => (c.faixas || []).some(f => qualifyingFaixas.includes(f)));
      const testExcluded = qualified.filter(c => testIds.includes(c.ID));
      // Use normalized comparison for loss reasons (same as system)
      const isExcludedByLoss = (motivos: string[] | null) => (motivos || []).some(m => normalizedExcludedLosses.includes(normalize(m)));
      const lossExcluded = qualified.filter(c => !testIds.includes(c.ID) && isExcludedByLoss(c.motivos_perda));
      const netMqls = qualified.filter(c => !testIds.includes(c.ID) && !isExcludedByLoss(c.motivos_perda));

      // Compare with Pipefy titles if provided - use normalized comparison
      let comparison = null;
      if (pipefyTitles && Array.isArray(pipefyTitles)) {
        const pipefySet = new Set(pipefyTitles.map((t: string) => normalize(t)));
        const systemSet = new Set(netMqls.map(c => normalize(c.titulo || '')));
        
        const onlySystem = netMqls.filter(c => !pipefySet.has(normalize(c.titulo || '')));
        const onlyPipefy = pipefyTitles.filter((t: string) => !systemSet.has(normalize(t)));
        
        comparison = {
          onlyInSystem: onlySystem.map(c => ({ id: c.ID, titulo: (c.titulo || '').trim(), faixas: c.faixas, motivos: c.motivos_perda, fase: c.fase_atual })),
          onlyInPipefy: onlyPipefy,
        };
      }

      result = {
        action: 'mql_diagnosis',
        totalUniqueCards: allCards.length,
        qualifiedCount: qualified.length,
        testExcluded: testExcluded.map(c => ({ id: c.ID, titulo: c.titulo })),
        lossExcluded: lossExcluded.map(c => ({ id: c.ID, titulo: c.titulo, motivos: c.motivos_perda })),
        netMqlCount: netMqls.length,
        comparison,
      };
      console.log(`MQL diagnosis: ${allCards.length} total, ${qualified.length} qualified, ${testExcluded.length} test, ${lossExcluded.length} loss-excluded, ${netMqls.length} net`);
    } else if (action === 'proposta_diagnosis') {
      const { startDate, endDate, produto, fases } = body;
      const invalid = await validateTable(table);
      if (invalid) return invalid;

      const targetFases = fases || ['Proposta enviada / Follow Up', 'Enviar proposta', 'Enviar para assinatura'];
      const targetProduto = produto || 'Franquia';

      console.log(`Proposta diagnosis: ${table}, produto=${targetProduto}, fases=${targetFases.join(',')}, period=${startDate} to ${endDate}`);

      const fasePlaceholders = targetFases.map((_: string, i: number) => `$${i + 3}`).join(', ');
      const dataQuery = `
        SELECT "ID", "Título", "Fase", "Fase Atual", "Entrada", "Saída", "Produtos",
               "Taxa de franquia", "Valor MRR", "Valor Pontual", "Valor Setup",
               "Closer responsável", "Motivo da perda"
        FROM ${table}
        WHERE "Produtos" = $1
          AND "Fase" IN (${fasePlaceholders})
          AND "Entrada" >= $${targetFases.length + 3}::timestamp
          AND "Entrada" <= $${targetFases.length + 4}::timestamp
        ORDER BY "Entrada" ASC
      `;
      const params = [targetProduto, ...targetFases, startDate, endDate];
      // Remove unused param slot - fix: produto is $1, fases start at $3 but we need $2 gap
      // Actually let's simplify:
      const simpleQuery = `
        SELECT "ID", "Título", "Fase", "Fase Atual", "Entrada", "Saída", "Produtos",
               "Taxa de franquia", "Valor MRR", "Valor Pontual", "Valor Setup",
               "Closer responsável", "Motivo da perda"
        FROM ${table}
        WHERE "Produtos" = $1
          AND "Entrada" >= $2::timestamp
          AND "Entrada" <= $3::timestamp
        ORDER BY "Entrada" ASC
      `;
      const rawResult = await client.query(simpleQuery, [targetProduto, startDate, endDate]);
      
      // Filter by fases in code (cleaner than dynamic placeholders)
      const faseSet = new Set(targetFases);
      const filtered = rawResult.rows.filter((r: Record<string, unknown>) => faseSet.has(r['Fase'] as string));

      // Deduplicate: key = ID|Fase|Month (same as system)
      const seen = new Set<string>();
      const deduplicated = filtered.filter((r: Record<string, unknown>) => {
        const entrada = new Date(r['Entrada'] as string);
        const monthKey = `${entrada.getFullYear()}-${String(entrada.getMonth() + 1).padStart(2, '0')}`;
        const key = `${r['ID']}|${r['Fase']}|${monthKey}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // Group by unique card ID to show summary
      const cardMap = new Map<string, Record<string, unknown>[]>();
      for (const row of deduplicated) {
        const id = row['ID'] as string;
        if (!cardMap.has(id)) cardMap.set(id, []);
        cardMap.get(id)!.push(row);
      }

      const cards = Array.from(cardMap.entries()).map(([id, rows]) => ({
        id,
        titulo: rows[0]['Título'],
        faseAtual: rows[0]['Fase Atual'],
        closer: rows[0]['Closer responsável'],
        motivoPerda: rows[0]['Motivo da perda'],
        taxaFranquia: rows[0]['Taxa de franquia'],
        valorMRR: rows[0]['Valor MRR'],
        valorPontual: rows[0]['Valor Pontual'],
        valorSetup: rows[0]['Valor Setup'],
        movements: rows.map(r => ({
          fase: r['Fase'],
          entrada: r['Entrada'],
          saida: r['Saída'],
        })),
      }));

      result = {
        action: 'proposta_diagnosis',
        produto: targetProduto,
        fases: targetFases,
        startDate,
        endDate,
        totalMovements: filtered.length,
        uniqueMovementsAfterDedup: deduplicated.length,
        uniqueCards: cards.length,
        cards,
      };
      console.log(`Proposta diagnosis: ${filtered.length} movements, ${deduplicated.length} after dedup, ${cards.length} unique cards`);
    } else {
      await client.end();
      return new Response(
        JSON.stringify({ error: 'Invalid action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await client.end();
    console.log('Disconnected from external database');

    // Handle BigInt serialization
    const jsonString = JSON.stringify(result, (_, value) =>
      typeof value === 'bigint' ? value.toString() : value
    );

    return new Response(
      jsonString,
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in query-external-db:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
