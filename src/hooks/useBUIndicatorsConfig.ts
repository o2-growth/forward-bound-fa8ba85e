import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface BUIndicatorsRow {
  id: string;
  bu: string;
  ticket_medio: number;
  cpmql: number;
  cpv: number;
  mql_to_rm: number;
  rm_to_rr: number;
  rr_to_prop: number;
  prop_to_venda: number;
}

export interface BUIndicatorsInput {
  ticketMedio: number;
  cpmql: number;
  cpv: number;
  mqlToRm: number;
  rmToRr: number;
  rrToProp: number;
  propToVenda: number;
}

const BU_KEYS = ['modelo_atual', 'o2_tax', 'oxy_hacker', 'franquia'] as const;

export function useBUIndicatorsConfig() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['bu-indicators-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bu_indicators_config')
        .select('*');
      if (error) throw error;
      return data as BUIndicatorsRow[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const saveMutation = useMutation({
    mutationFn: async (configs: { bu: string; indicators: BUIndicatorsInput }[]) => {
      for (const { bu, indicators } of configs) {
        const { error } = await supabase
          .from('bu_indicators_config')
          .upsert({
            bu,
            ticket_medio: indicators.ticketMedio,
            cpmql: indicators.cpmql,
            cpv: indicators.cpv,
            mql_to_rm: indicators.mqlToRm,
            rm_to_rr: indicators.rmToRr,
            rr_to_prop: indicators.rrToProp,
            prop_to_venda: indicators.propToVenda,
          }, { onConflict: 'bu' });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bu-indicators-config'] });
      toast.success('Configurações salvas com sucesso!');
    },
    onError: (err: any) => {
      toast.error(`Erro ao salvar: ${err.message}`);
    },
  });

  // Convert DB rows to the format used by MediaInvestmentTab
  const getIndicatorsMap = (): Record<string, BUIndicatorsInput> | null => {
    if (!data || data.length === 0) return null;
    const map: Record<string, BUIndicatorsInput> = {};
    for (const row of data) {
      map[row.bu] = {
        ticketMedio: Number(row.ticket_medio),
        cpmql: Number(row.cpmql),
        cpv: Number(row.cpv),
        mqlToRm: Number(row.mql_to_rm),
        rmToRr: Number(row.rm_to_rr),
        rrToProp: Number(row.rr_to_prop),
        propToVenda: Number(row.prop_to_venda),
      };
    }
    return map;
  };

  return {
    data,
    isLoading,
    getIndicatorsMap,
    saveIndicators: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
  };
}
