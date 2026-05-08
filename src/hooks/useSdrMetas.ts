import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SdrMeta {
  id: string;
  bu: string;
  month: string;
  sdr: string;
  rm_meta: number;
  rr_meta: number;
  year: number;
}

const BUS = ['modelo_atual', 'o2_tax', 'oxy_hacker', 'franquia'] as const;
const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'] as const;
const SDRS = ['Amanda', 'Carlos', 'Matheus'] as const;

export type SdrBuType = typeof BUS[number];
export type SdrMonthType = typeof MONTHS[number];
export type SdrType = typeof SDRS[number];

// Atribuição de SDRs por BU (mem://team-structure/sdr-bu-assignment)
export const BU_SDRS: Record<SdrBuType, readonly SdrType[]> = {
  modelo_atual: ['Amanda', 'Matheus'],
  o2_tax: ['Carlos'],
  oxy_hacker: ['Amanda'],
  franquia: ['Amanda'],
} as const;

export const getSdrsForBU = (bu: SdrBuType): readonly SdrType[] => {
  return BU_SDRS[bu] || [];
};

export const sdrOperatesInBU = (sdr: SdrType, bu: SdrBuType): boolean => {
  return BU_SDRS[bu]?.includes(sdr) || false;
};

export function useSdrMetas(year: number = 2026) {
  const queryClient = useQueryClient();

  const { data: metas, isLoading, error } = useQuery({
    queryKey: ['sdr-metas', year],
    queryFn: async (): Promise<SdrMeta[]> => {
      const { data, error } = await supabase
        .from('sdr_metas')
        .select('*')
        .eq('year', year);

      if (error) {
        console.error('Error fetching sdr metas:', error);
        throw error;
      }

      return (data || []) as SdrMeta[];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Pega a meta (rm/rr) de um SDR/BU/mês
  const getMeta = (bu: string, month: string, sdr: string): { rm: number; rr: number } => {
    if (!metas) return { rm: 0, rr: 0 };
    const m = metas.find(x => x.bu === bu && x.month === month && x.sdr === sdr);
    return { rm: m?.rm_meta ?? 0, rr: m?.rr_meta ?? 0 };
  };

  /**
   * Soma de metas RM e RR para o recorte de BUs/meses/SDRs.
   * Se sdrs vazio, soma todos os SDRs válidos das BUs informadas.
   * Retorna { rm, rr, hasData } — hasData indica se algum registro casou.
   */
  const getSdrMetaTotals = (params: {
    bus: string[];
    months: string[];
    sdrs?: string[];
  }): { rm: number; rr: number; hasData: boolean } => {
    if (!metas || metas.length === 0) return { rm: 0, rr: 0, hasData: false };
    const { bus, months, sdrs } = params;
    const busSet = new Set(bus);
    const monthsSet = new Set(months);
    const sdrsSet = sdrs && sdrs.length > 0 ? new Set(sdrs) : null;

    let rm = 0;
    let rr = 0;
    let hasData = false;

    for (const m of metas) {
      if (!busSet.has(m.bu)) continue;
      if (!monthsSet.has(m.month)) continue;
      if (sdrsSet && !sdrsSet.has(m.sdr)) continue;
      // Garante que o SDR é válido para a BU
      if (!BU_SDRS[m.bu as SdrBuType]?.includes(m.sdr as SdrType)) continue;
      rm += m.rm_meta || 0;
      rr += m.rr_meta || 0;
      if ((m.rm_meta || 0) > 0 || (m.rr_meta || 0) > 0) hasData = true;
    }

    return { rm, rr, hasData };
  };

  // Mutation: bulk upsert
  const bulkUpdateMetas = useMutation({
    mutationFn: async (updates: { bu: string; month: string; sdr: string; rm_meta: number; rr_meta: number }[]) => {
      for (const update of updates) {
        const { error } = await supabase
          .from('sdr_metas')
          .upsert({
            bu: update.bu,
            month: update.month,
            sdr: update.sdr,
            rm_meta: update.rm_meta,
            rr_meta: update.rr_meta,
            year,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'bu,month,year,sdr'
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sdr-metas', year] });
    },
  });

  // Reset BU para zerar todas as metas
  const resetBuToDefault = useMutation({
    mutationFn: async (bu: string) => {
      const sdrsForBu = BU_SDRS[bu as SdrBuType] || [];
      for (const month of MONTHS) {
        for (const sdr of sdrsForBu) {
          const { error } = await supabase
            .from('sdr_metas')
            .upsert({
              bu,
              month,
              sdr,
              rm_meta: 0,
              rr_meta: 0,
              year,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'bu,month,year,sdr' });
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sdr-metas', year] });
    },
  });

  return {
    metas: metas || [],
    isLoading,
    error,
    getMeta,
    getSdrMetaTotals,
    bulkUpdateMetas,
    resetBuToDefault,
    BUS,
    MONTHS,
    SDRS,
  };
}
