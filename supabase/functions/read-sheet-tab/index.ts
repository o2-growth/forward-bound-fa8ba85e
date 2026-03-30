import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SheetCol {
  label: string;
  type?: string;
}

interface SheetTable {
  cols: SheetCol[];
  rows: any[][];
}

// Parse Google Sheets JSON response (Google Visualization API)
function parseGoogleSheetsResponse(text: string): SheetTable {
  const parseTable = (data: any): SheetTable => {
    const table = data?.table;
    const cols: SheetCol[] = (table?.cols || []).map((c: any, idx: number) => ({
      label: (c?.label && String(c.label).trim()) || `col_${idx}`,
      type: c?.type,
    }));

    const rows = (table?.rows || []).map((row: any) =>
      row.c?.map((cell: any) => (cell === null ? null : cell.v)) || []
    );

    return { cols, rows };
  };

  // Google Sheets returns JSONP-like response, need to extract JSON
  const jsonMatch = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);?$/);
  if (!jsonMatch) {
    try {
      return parseTable(JSON.parse(text));
    } catch {
      throw new Error('Formato de resposta inválido do Google Sheets');
    }
  }

  return parseTable(JSON.parse(jsonMatch[1]));
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('=== Reading Google Sheet Tab ===');

  try {
    const body = (await req.json().catch(() => ({}))) as any;
    const sheetName = body?.sheetName || 'MQLs Meta';
    const maxRows = body?.maxRows || 50;
    const startDate = body?.startDate; // format: "2026-01-01"
    const endDate = body?.endDate;     // format: "2026-01-21"
    const dateColumn = body?.dateColumn || 'D'; // Column letter for date filtering

    console.log(`Requested sheet: "${sheetName}", maxRows: ${maxRows}, startDate: ${startDate}, endDate: ${endDate}`);

    // Get Sheet ID from environment
    const sheetId = Deno.env.get('GOOGLE_SHEET_ID');
    if (!sheetId) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'GOOGLE_SHEET_ID não configurado',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Build query parameter for date filtering
    let queryParam = '';
    if (startDate && endDate) {
      // Use Google Visualization API SQL-like query to filter by date range
      const query = `SELECT * WHERE ${dateColumn} >= date '${startDate}' AND ${dateColumn} <= date '${endDate}'`;
      queryParam = `&tq=${encodeURIComponent(query)}`;
      console.log(`Date filter query: ${query}`);
    }

    // Fetch data from Google Sheets - specify sheet name
    // URL encode the sheet name for special characters
    const encodedSheetName = encodeURIComponent(sheetName);
    const sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodedSheetName}${queryParam}`;
    console.log(`Fetching from: ${sheetUrl}`);

    const response = await fetch(sheetUrl);

    if (!response.ok) {
      throw new Error(
        `Falha ao acessar planilha: ${response.status} ${response.statusText}. Verifique se a planilha está compartilhada.`
      );
    }

    const text = await response.text();
    console.log(`Response length: ${text.length} chars`);

    // Parse the response
    const table = parseGoogleSheetsResponse(text);
    const columnLabels = table.cols.map((c) => c.label);
    const rows = table.rows.slice(0, maxRows);

    console.log(`Found ${table.rows.length} total rows, returning ${rows.length}`);
    console.log(`Columns: ${columnLabels.join(', ')}`);

    // Format rows as objects for easier reading
    const formattedRows = rows.map((row, idx) => {
      const obj: Record<string, any> = { _rowIndex: idx + 1 };
      columnLabels.forEach((label, colIdx) => {
        obj[label || `col_${colIdx}`] = row[colIdx] ?? null;
      });
      return obj;
    });

    return new Response(
      JSON.stringify({
        success: true,
        sheetName,
        totalRows: table.rows.length,
        returnedRows: rows.length,
        columns: columnLabels,
        columnCount: columnLabels.length,
        data: formattedRows,
        rawSample: rows.slice(0, 5), // First 5 raw rows for debugging
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Read error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
