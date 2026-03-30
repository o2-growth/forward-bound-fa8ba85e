import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CloserMeta {
  id: string;
  bu: string;
  month: string;
  closer: string;
  percentage: number;
  year: number;
}

const BUS = ['modelo_atual', 'o2_tax', 'oxy_hacker', 'franquia'] as const;
const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'] as const;
const CLOSERS = ['Pedro Albite', 'Daniel Trindade', 'Lucas Ilha'] as const;

export type BuType = typeof BUS[number];
export type MonthType = typeof MONTHS[number];
export type CloserType = typeof CLOSERS[number];

// Mapeamento de closers por BU - define quais closers atuam em cada unidade de negócio
export const BU_CLOSERS: Record<BuType, readonly CloserType[]> = {
  modelo_atual: ['Pedro Albite', 'Daniel Trindade'],
  o2_tax: ['Lucas Ilha'],
  oxy_hacker: ['Pedro Albite', 'Daniel Trindade'],
  franquia: ['Pedro Albite', 'Daniel Trindade'],
} as const;

// Helper function to get closers for a specific BU
export const getClosersForBU = (bu: BuType): readonly CloserType[] => {
  return BU_CLOSERS[bu] || [];
};

// Helper function to check if a closer operates in a specific BU
export const closerOperatesInBU = (closer: CloserType, bu: BuType): boolean => {
  return BU_CLOSERS[bu]?.includes(closer) || false;
};

export function useCloserMetas(year: number = 2026) {
  const queryClient = useQueryClient();

  const { data: metas, isLoading, error } = useQuery({
    queryKey: ['closer-metas', year],
    queryFn: async (): Promise<CloserMeta[]> => {
      const { data, error } = await supabase
        .from('closer_metas')
        .select('*')
        .eq('year', year);

      if (error) {
        console.error('Error fetching closer metas:', error);
        throw error;
      }

      return (data || []) as CloserMeta[];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Get percentage for a specific BU/month/closer
  const getPercentage = (bu: string, month: string, closer: string): number => {
    // Se BU tem apenas 1 closer, default é 100%
    const closersForBU = BU_CLOSERS[bu as BuType] || [];
    const defaultPercentage = closersForBU.length === 1 ? 100 : 50;
    
    if (!metas) return defaultPercentage;
    
    const meta = metas.find(m => 
      m.bu === bu && m.month === month && m.closer === closer
    );
    
    return meta?.percentage ?? defaultPercentage;
  };

  // Get filtered meta value based on selected closers
  const getFilteredMeta = (
    baseMeta: number,
    bu: string,
    month: string,
    selectedClosers: string[]
  ): number => {
    if (selectedClosers.length === 0) return baseMeta;
    
    const totalPercentage = selectedClosers.reduce((sum, closer) => {
      return sum + getPercentage(bu, month, closer);
    }, 0);
    
    return baseMeta * (totalPercentage / 100);
  };

  // Mutation for updating a single closer meta
  const updateMeta = useMutation({
    mutationFn: async ({ 
      bu, 
      month, 
      closer, 
      percentage 
    }: { 
      bu: string; 
      month: string; 
      closer: string; 
      percentage: number;
    }) => {
      const { error } = await supabase
        .from('closer_metas')
        .update({ percentage, updated_at: new Date().toISOString() })
        .eq('bu', bu)
        .eq('month', month)
        .eq('closer', closer)
        .eq('year', year);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['closer-metas', year] });
    },
  });

  // Mutation for bulk updating metas
  const bulkUpdateMetas = useMutation({
    mutationFn: async (updates: { bu: string; month: string; closer: string; percentage: number }[]) => {
      // Upsert each update
      for (const update of updates) {
        const { error } = await supabase
          .from('closer_metas')
          .upsert({
            bu: update.bu,
            month: update.month,
            closer: update.closer,
            percentage: update.percentage,
            year,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'bu,month,closer,year'
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['closer-metas', year] });
    },
  });

  // Reset all metas for a BU to 50/50
  const resetBuToDefault = useMutation({
    mutationFn: async (bu: string) => {
      const updates = MONTHS.flatMap(month => 
        CLOSERS.map(closer => ({
          bu,
          month,
          closer,
          percentage: 50,
        }))
      );

      for (const update of updates) {
        const { error } = await supabase
          .from('closer_metas')
          .update({ percentage: 50, updated_at: new Date().toISOString() })
          .eq('bu', update.bu)
          .eq('month', update.month)
          .eq('closer', update.closer)
          .eq('year', year);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['closer-metas', year] });
    },
  });

  return {
    metas: metas || [],
    isLoading,
    error,
    getPercentage,
    getFilteredMeta,
    updateMeta,
    bulkUpdateMetas,
    resetBuToDefault,
    BUS,
    MONTHS,
    CLOSERS,
  };
}
