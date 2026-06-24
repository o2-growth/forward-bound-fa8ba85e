import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { eachDayOfInterval, eachMonthOfInterval, addDays, differenceInDays } from "date-fns";
import { fixPossibleDateInversion, shouldForceAssinaturaDate, getForcedSaleDate, getForcedPontualValue } from "./dateUtils";

export type ExpansaoIndicator = 'leads' | 'mql' | 'rm' | 'rr' | 'proposta' | 'venda';
export type ChartGrouping = 'daily' | 'weekly' | 'monthly';

interface ExpansaoMovement {
  id: string;
  titulo: string;
  fase: string;           // Phase name from movement
  faseAtual: string;      // Current phase of the card
  dataEntrada: Date;      // When entered this phase
  dataSaida: Date | null; // When left this phase
  valorMRR: number | null;
  valorPontual: number | null;
  valorSetup: number | null;
  taxaFranquia: number | null; // Taxa de franquia (R$ 140.000 para Franquia)
  investimentoDisponivel: string | null;
  produto: string;
}

// MQL Expansão Franquia: investimento disponível >= R$ 15k
// Todas as faixas do Pipefy já são >= 15k, então qualquer investimento preenchido qualifica
function isFranquiaMqlQualified(investimento: string | null): boolean {
  return !!investimento && investimento.trim().length > 0;
}

interface ExpansaoMetasResult {
  movements: ExpansaoMovement[];
}

// Map Pipefy phase names to indicator keys
const PHASE_TO_INDICATOR: Record<string, ExpansaoIndicator> = {
  'Start form': 'leads',
  'Lead': 'leads',
  'MQL': 'mql',
  'Reunião agendada / Qualificado': 'rm',
  'Reunião Realizada': 'rr',
  'Proposta enviada / Follow Up': 'proposta',
  'Contrato assinado': 'venda',
};

// Parse date string to JS Date
function parseDate(dateValue: string | null): Date | null {
  if (!dateValue) return null;
  const date = new Date(dateValue);
  return isNaN(date.getTime()) ? null : date;
}

// Parse YYYY-MM-DD without timezone shift
function parseDateOnly(dateValue: string | null): Date | null {
  if (!dateValue) return null;
  const match = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0);
  return isNaN(d.getTime()) ? null : d;
}

export function useExpansaoMetas(startDate?: Date, endDate?: Date) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['expansao-metas-movements', startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async (): Promise<ExpansaoMetasResult> => {
      // Use movements table for accurate phase tracking
      const { data: responseData, error: fetchError } = await supabase.functions.invoke('query-external-db', {
        body: { table: 'pipefy_cards_movements_expansao', action: 'preview', limit: 5000 }
      });

      if (fetchError) {
        console.error('Error fetching expansao movements:', fetchError);
        throw fetchError;
      }

      if (!responseData?.data) {
        console.warn('No data returned from external db for expansao movements');
        return { movements: [] };
      }

      // Parse movements - each row is a phase transition
      // Filter only "Franquia" products for this hook
      const movements: ExpansaoMovement[] = [];
      
      for (const row of responseData.data) {
        const produto = row['Produtos'] || '';
        
        // Filter only "Franquia" products for this hook
        if (produto !== 'Franquia') continue;
        
        let dataEntrada = parseDate(row['Entrada']) || new Date();
        const titulo = row['Título'] || '';
        const fase = row['Fase'] || '';

        // Cards na lista forçada: usar data fixa (Abril/2026), independente da fase/data
        if (shouldForceAssinaturaDate(titulo, 'expansao')) {
          dataEntrada = getForcedSaleDate();
        } else if (fase === 'Contrato assinado') {
          // Para "Contrato assinado", priorizar data de assinatura
          const dataAssinatura = parseDateOnly(row['Data de assinatura do contrato']);
          if (dataAssinatura) {
            dataEntrada = fixPossibleDateInversion(dataAssinatura, dataEntrada);
          }
        }


        // Lê com fallback de variações de nome de campo (Pipefy às vezes tem
        // colunas com acentuação/capitalização diferente)
        const readNum = (...keys: string[]): number | null => {
          for (const k of keys) {
            const v = row[k];
            if (v !== null && v !== undefined && v !== '') {
              const s = String(v).replace(/[R$\s]/g, '');
              // BR format ("1.040.000,50"): strip dots (thousand sep), comma → dot.
              // US/plain ("104000.0", "1040000"): keep dot as decimal.
              const normalized = s.includes(',')
                ? s.replace(/\./g, '').replace(',', '.')
                : s;
              const n = parseFloat(normalized);
              if (!isNaN(n) && n > 0) return n;
            }
          }
          return null;
        };

        const movement: ExpansaoMovement = {
          id: String(row.ID),
          titulo: row['Título'] || '',
          fase: row['Fase'] || '',
          faseAtual: row['Fase Atual'] || '',
          dataEntrada,
          dataSaida: parseDate(row['Saída']),
          valorMRR: readNum('Valor MRR', 'Valor mensal', 'MRR'),
          valorPontual: readNum('Valor Pontual', 'Valor pontual'),
          valorSetup: readNum('Valor Setup', 'Valor setup'),
          taxaFranquia: readNum(
            'Taxa de franquia',
            'Taxa de Franquia',
            'Valor da Franquia',
            'Valor Franquia',
            'Valor da franquia',
            'Valor Total',
            'Valor Contrato',
            'Valor do Contrato',
          ),
          investimentoDisponivel: row['Investimento disponível'] || row['Investimento Disponivel'] || null,
          produto,
        };

        // Override de Valor Pontual fixo (Alexandre Correa, Jean Morbis)
        const forcedPontual = getForcedPontualValue(movement.titulo);
        if (forcedPontual !== null) {
          movement.valorPontual = forcedPontual;
          movement.valorMRR = 0;
          movement.valorSetup = 0;
          movement.taxaFranquia = 0;
        }

        movements.push(movement);
      }

      // Log unique phases for debugging
      const uniquePhases = [...new Set(movements.map(m => m.fase))];
      const uniqueFasesAtuais = [...new Set(movements.map(m => m.faseAtual))];
      console.log(`[useExpansaoMetas] Loaded ${movements.length} Franquia movements from pipefy_cards_movements_expansao`);
      console.log(`[useExpansaoMetas] Unique phases:`, uniquePhases);
      console.log(`[useExpansaoMetas] Unique fases atuais:`, uniqueFasesAtuais);
      
      return { movements };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  // Build investimento map per card
  const cardInvestimento = new Map<string, string | null>();
  if (data?.movements) {
    for (const m of data.movements) {
      if (m.investimentoDisponivel && !cardInvestimento.has(m.id)) {
        cardInvestimento.set(m.id, m.investimentoDisponivel);
      }
    }
  }

  // Get total qty for a specific indicator and date range
  // Count UNIQUE CARDS that entered a phase during the period
  const getQtyForPeriod = (indicator: ExpansaoIndicator, start?: Date, end?: Date): number => {
    if (!data?.movements || data.movements.length === 0) return 0;

    const startTime = start ? new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime() : 0;
    const endTime = end ? new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999).getTime() : Date.now();

    const uniqueCards = new Set<string>();

    for (const movement of data.movements) {
      const entryTime = movement.dataEntrada.getTime();
      if (entryTime >= startTime && entryTime <= endTime) {
        const movementIndicator = PHASE_TO_INDICATOR[movement.fase];

        if (indicator === 'venda') {
          if (movement.fase === 'Contrato assinado' || shouldForceAssinaturaDate(movement.titulo, 'expansao')) {
            uniqueCards.add(movement.id);
          }
        } else if (indicator === 'proposta') {
          if (movementIndicator === 'proposta') {
            uniqueCards.add(movement.id);
          }
        } else if (indicator === 'mql') {
          // MQL: cards em fase "Lead" ou "MQL" com investimento qualificado (>= R$ 140k)
          if (movement.fase === 'Lead' || movement.fase === 'MQL') {
            const inv = cardInvestimento.get(movement.id) || null;
            if (isFranquiaMqlQualified(inv)) {
              uniqueCards.add(movement.id);
            }
          }
        } else {
          if (movementIndicator === indicator) {
            uniqueCards.add(movement.id);
          }
        }
      }
    }
    
    console.log(`[useExpansaoMetas] getQtyForPeriod ${indicator}: ${uniqueCards.size} unique cards`);
    return uniqueCards.size;
  };

  // Get total monetary value for a specific indicator and date range
  // Sums: Valor Pontual + Valor Setup + Valor MRR (1x) for each UNIQUE card
  const getValueForPeriod = (indicator: ExpansaoIndicator, start?: Date, end?: Date): number => {
    if (!data?.movements || data.movements.length === 0) return 0;
    
    const startTime = start ? new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime() : 0;
    const endTime = end ? new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999).getTime() : Date.now();
    
    // Use Map to track unique cards and their values
    const cardValues = new Map<string, number>();
    
    for (const movement of data.movements) {
      const entryTime = movement.dataEntrada.getTime();
      if (entryTime >= startTime && entryTime <= endTime) {
        const movementIndicator = PHASE_TO_INDICATOR[movement.fase];
        let shouldCount = false;
        
        if (indicator === 'venda') {
          if (movement.fase === 'Contrato assinado' || shouldForceAssinaturaDate(movement.titulo, 'expansao')) {
            shouldCount = true;
          }
        } else if (indicator === 'proposta') {
          if (movementIndicator === 'proposta') {
            shouldCount = true;
          }
        } else if (indicator === 'mql') {
          if (movement.fase === 'Lead' || movement.fase === 'MQL') {
            const inv = cardInvestimento.get(movement.id) || null;
            if (isFranquiaMqlQualified(inv)) {
              shouldCount = true;
            }
          }
        } else {
          if (movementIndicator === indicator) {
            shouldCount = true;
          }
        }

        if (shouldCount && !cardValues.has(movement.id)) {
          const taxaFranquia = movement.taxaFranquia || 0;
          const pontual = movement.valorPontual || 0;
          const setup = movement.valorSetup || 0;
          const mrr = movement.valorMRR || 0;
          // Usa Taxa de franquia se preenchida; senão soma pontual+setup+MRR
          // SEM fallback hardcoded — valor real do banco
          const value = taxaFranquia > 0 ? taxaFranquia : (pontual + setup + mrr);

          if (indicator === 'venda') {
            console.log(`[useExpansaoMetas] VENDA "${movement.titulo}" (id ${movement.id}): taxaFranquia=${taxaFranquia}, pontual=${pontual}, setup=${setup}, mrr=${mrr} → valor=${value}`);
          }

          cardValues.set(movement.id, value);
        }
      }
    }
    
    const totalValue = Array.from(cardValues.values()).reduce((sum, val) => sum + val, 0);
    console.log(`[useExpansaoMetas] getValueForPeriod ${indicator}: ${totalValue}`);
    return totalValue;
  };

  // Get total meta for a specific indicator and date range
  const getMetaForPeriod = (indicator: ExpansaoIndicator, start?: Date, end?: Date): number => {
    if (!start || !end) return 0;
    
    const daysInPeriod = differenceInDays(end, start) + 1;
    const periodFraction = daysInPeriod / 365;
    
    // Annual metas based on planning (updated to match real targets)
    const annualMetas: Record<ExpansaoIndicator, number> = {
      leads: 432,     // 36/month
      mql: 432,       // Igual a leads (sem critério separado de MQL para Franquia)
      rm: 144,        // 12/month
      rr: 72,         // 6/month
      proposta: 48,   // 4/month
      venda: 12,      // 1/month (12 franquias/year target)
    };
    
    return Math.round(annualMetas[indicator] * periodFraction);
  };

  // Get grouped data for charts (returns array of values per period)
  const getGroupedData = (indicator: ExpansaoIndicator, start: Date, end: Date, grouping: ChartGrouping): { qty: number[]; meta: number[] } => {
    if (!data?.movements || data.movements.length === 0) return { qty: [], meta: [] };

    const qtyArray: number[] = [];
    const metaArray: number[] = [];
    
    const daysInYear = 365;
    const annualMetas: Record<ExpansaoIndicator, number> = {
      leads: 432,
      mql: 432,
      rm: 144,
      rr: 72,
      proposta: 48,
      venda: 12,
    };
    const dailyMeta = annualMetas[indicator] / daysInYear;

    // Helper function to count unique cards in a period
    const countUniqueCardsInPeriod = (periodStart: number, periodEnd: number): number => {
      const uniqueCards = new Set<string>();
      
      for (const movement of data.movements) {
        const entryTime = movement.dataEntrada.getTime();
        if (entryTime >= periodStart && entryTime <= periodEnd) {
          const movementIndicator = PHASE_TO_INDICATOR[movement.fase];
          
          if (indicator === 'venda') {
            if (movement.fase === 'Contrato assinado' || shouldForceAssinaturaDate(movement.titulo, 'expansao')) {
              uniqueCards.add(movement.id);
            }
          } else if (indicator === 'proposta') {
            if (movementIndicator === 'proposta') {
              uniqueCards.add(movement.id);
            }
          } else if (indicator === 'mql') {
            if (movement.fase === 'Lead' || movement.fase === 'MQL') {
              const inv = cardInvestimento.get(movement.id) || null;
              if (isFranquiaMqlQualified(inv)) {
                uniqueCards.add(movement.id);
              }
            }
          } else {
            if (movementIndicator === indicator) {
              uniqueCards.add(movement.id);
            }
          }
        }
      }

      return uniqueCards.size;
    };

    if (grouping === 'daily') {
      const days = eachDayOfInterval({ start, end });
      for (const day of days) {
        const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
        const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999).getTime();
        
        qtyArray.push(countUniqueCardsInPeriod(dayStart, dayEnd));
        metaArray.push(Math.round(dailyMeta));
      }
    } else if (grouping === 'weekly') {
      const totalDays = differenceInDays(end, start) + 1;
      const numWeeks = Math.ceil(totalDays / 7);
      
      for (let i = 0; i < numWeeks; i++) {
        const weekStart = addDays(start, i * 7);
        const weekEnd = i === numWeeks - 1 ? end : addDays(weekStart, 6);
        
        const weekStartTime = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate()).getTime();
        const weekEndTime = new Date(weekEnd.getFullYear(), weekEnd.getMonth(), weekEnd.getDate(), 23, 59, 59, 999).getTime();
        
        const daysInWeek = differenceInDays(weekEnd, weekStart) + 1;
        qtyArray.push(countUniqueCardsInPeriod(weekStartTime, weekEndTime));
        metaArray.push(Math.round(dailyMeta * daysInWeek));
      }
    } else {
      // Monthly
      const months = eachMonthOfInterval({ start, end });
      for (const monthDate of months) {
        const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1).getTime();
        const lastDay = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
        const monthEnd = new Date(lastDay.getFullYear(), lastDay.getMonth(), lastDay.getDate(), 23, 59, 59, 999).getTime();
        
        const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
        qtyArray.push(countUniqueCardsInPeriod(monthStart, monthEnd));
        metaArray.push(Math.round(dailyMeta * daysInMonth));
      }
    }

    return { qty: qtyArray, meta: metaArray };
  };

  // Build DetailItem-shaped objects for drill-down sheet (Franquia).
  // Uses the same dedup/qualification rules as getQtyForPeriod.
  const getDetailItemsForIndicator = (indicator: ExpansaoIndicator, start?: Date, end?: Date) => {
    if (!data?.movements || data.movements.length === 0) return [] as any[];

    const startTime = start ? new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime() : 0;
    const endTime = end ? new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999).getTime() : Date.now();

    const TICKET_PADRAO = 140000;
    const byCard = new Map<string, any>();

    for (const movement of data.movements) {
      const entryTime = movement.dataEntrada.getTime();
      if (entryTime < startTime || entryTime > endTime) continue;

      const movementIndicator = PHASE_TO_INDICATOR[movement.fase];
      let matches = false;

      if (indicator === 'venda') {
        matches = movement.fase === 'Contrato assinado' || shouldForceAssinaturaDate(movement.titulo, 'expansao');
      } else if (indicator === 'proposta') {
        matches = movementIndicator === 'proposta';
      } else if (indicator === 'mql') {
        if (movement.fase === 'Lead' || movement.fase === 'MQL') {
          const inv = cardInvestimento.get(movement.id) || null;
          matches = isFranquiaMqlQualified(inv);
        }
      } else {
        matches = movementIndicator === indicator;
      }

      if (!matches || byCard.has(movement.id)) continue;

      const taxaFranquia = movement.taxaFranquia || 0;
      const pontualReal = movement.valorPontual || 0;
      const setup = movement.valorSetup || 0;
      const mrr = movement.valorMRR || 0;
      const pontual = taxaFranquia > 0 ? taxaFranquia : (pontualReal > 0 ? pontualReal : (indicator === 'venda' ? TICKET_PADRAO : 0));
      const total = taxaFranquia > 0 ? taxaFranquia : (pontualReal + setup + mrr);

      const itemValue = total > 0 ? total : pontual;
      byCard.set(movement.id, {
        id: movement.id,
        name: movement.titulo,
        company: movement.titulo,
        phase: movement.fase,
        date: movement.dataEntrada.toISOString(),
        value: itemValue,
        product: 'Franquia',
        bu: 'Franquia',
        mrr,
        setup,
        pontual,
        total,
        responsible: '',
        closer: '',
        sdr: '',
        dataAssinatura: movement.dataEntrada.toISOString(),
      });
    }

    return Array.from(byCard.values());
  };

  return {
    movements: data?.movements ?? [],
    isLoading,
    error,
    refetch,
    getQtyForPeriod,
    getValueForPeriod,
    getMetaForPeriod,
    getGroupedData,
    getDetailItemsForIndicator,
  };
}

