import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ModeloAtualIndicator = 'proposta' | 'venda';

interface HistoricoRow {
  cardId: string;
  entrada: Date;
  destino: string;
  valorMRR: number;
  valorPontual: number;
  valorEducacao: number;
  valorSetup: number;
}

interface ModeloAtualValuesResult {
  rows: HistoricoRow[];
}

// Map destination phases to indicators
const PROPOSTA_PHASES = ['Enviar proposta', 'Proposta enviada / Follow Up'];
const VENDA_PHASES = ['Ganho'];

// Parse Google Sheets date format "Date(year,month,day)" to JS Date
function parseGoogleDate(dateValue: any): Date | null {
  if (!dateValue) return null;
  
  if (typeof dateValue === 'string') {
    const match = dateValue.match(/Date\((\d+),(\d+),(\d+)\)/);
    if (match) {
      return new Date(parseInt(match[1]), parseInt(match[2]), parseInt(match[3]));
    }
    // Try ISO format
    const date = new Date(dateValue);
    if (!isNaN(date.getTime())) return date;
  }
  
  return null;
}

// Parse numeric value, handling various formats
function parseNumericValue(value: any): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    // Remove currency formatting and parse
    const cleaned = value.replace(/[R$\s.]/g, '').replace(',', '.');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

export function useModeloAtualValues(startDate?: Date, endDate?: Date) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['modelo-atual-values', startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async (): Promise<ModeloAtualValuesResult> => {
      // Format dates for Google Sheets query (YYYY-MM-DD)
      const startDateStr = startDate ? startDate.toISOString().split('T')[0] : undefined;
      const endDateStr = endDate ? endDate.toISOString().split('T')[0] : undefined;
      
      console.log(`[useModeloAtualValues] Fetching HISTÓRICO DE FASES for period: ${startDateStr} to ${endDateStr}`);
      
      const { data: responseData, error: fetchError } = await supabase.functions.invoke('read-sheet-tab', {
        body: { 
          sheetName: 'HISTÓRICO DE FASES', 
          maxRows: 50000,
          startDate: startDateStr,
          endDate: endDateStr,
          dateColumn: 'D', // Column D = "Entrada"
        }
      });

      if (fetchError) {
        console.error('Error fetching histórico de fases:', fetchError);
        throw fetchError;
      }

      if (!responseData?.success || !responseData?.data) {
        console.warn('No data returned from HISTÓRICO DE FASES sheet');
        return { rows: [] };
      }

      // Log columns for debugging
      console.log('[useModeloAtualValues] Columns:', responseData.columns);

      // Parse the data
      const rows: HistoricoRow[] = [];
      for (const row of responseData.data) {
        // Try different column name variations
        const cardId = row['ID do Card'] || row['ID Card'] || row['Card ID'] || row['id_card'] || '';
        const entrada = parseGoogleDate(row['Entrada'] || row['Data Entrada'] || row['Data']);
        const destino = row['Destino'] || row['Fase Destino'] || row['Para'] || '';
        
        if (!cardId || !entrada || !destino) continue;
        
        rows.push({
          cardId: String(cardId),
          entrada,
          destino,
          valorMRR: parseNumericValue(row['Valor MRR']),
          valorPontual: parseNumericValue(row['Valor Pontual']),
          valorEducacao: parseNumericValue(row['Valor Educação'] || row['Valor Educacao']),
          valorSetup: parseNumericValue(row['Valor Setup']),
        });
      }

      console.log(`[useModeloAtualValues] Parsed ${rows.length} rows from HISTÓRICO DE FASES`);
      
      // Log unique destinations for debugging
      const uniqueDestinos = [...new Set(rows.map(r => r.destino))];
      console.log('[useModeloAtualValues] Unique destinations:', uniqueDestinos);

      return { rows };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  // Get total monetary value for a specific indicator and date range
  const getValueForPeriod = (indicator: ModeloAtualIndicator, start?: Date, end?: Date): number => {
    if (!data?.rows || data.rows.length === 0) return 0;
    
    const startTime = start ? new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime() : 0;
    const endTime = end ? new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999).getTime() : Date.now();
    
    // Determine which phases to filter
    const targetPhases = indicator === 'proposta' ? PROPOSTA_PHASES : VENDA_PHASES;
    
    // Use Map to get the last value for each unique card
    const cardValues = new Map<string, number>();
    
    for (const row of data.rows) {
      const rowTime = row.entrada.getTime();
      if (rowTime >= startTime && rowTime <= endTime) {
        // Check if destination matches any target phase
        const matchesPhase = targetPhases.some(phase => 
          row.destino.toLowerCase().includes(phase.toLowerCase()) ||
          phase.toLowerCase().includes(row.destino.toLowerCase())
        );
        
        if (matchesPhase) {
          // Calculate total value for this row
          const rowValue = row.valorMRR + row.valorPontual + row.valorEducacao + row.valorSetup;
          
          // Store/update the value for this card (last occurrence wins)
          cardValues.set(row.cardId, rowValue);
        }
      }
    }
    
    // Sum all unique card values
    let total = 0;
    for (const value of cardValues.values()) {
      total += value;
    }
    
    console.log(`[useModeloAtualValues] getValueForPeriod ${indicator}: ${total} (${cardValues.size} unique cards)`);
    return Math.round(total);
  };

  return {
    rows: data?.rows ?? [],
    isLoading,
    error,
    getValueForPeriod,
  };
}
