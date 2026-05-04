import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface BUIndicatorsRow {
  id: string;
  bu: string;
  month: string;
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
const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'] as const;

/** Returns true if the given month (Jan-Dez) is in the past or is the current month */
export function isMonthLocked(month: string): boolean {
  const now = new Date();
  const currentMonthIdx = now.getMonth(); // 0-based
  const monthIdx = MONTHS.indexOf(month as typeof MONTHS[number]);
  if (monthIdx === -1) return false;
  return monthIdx <= currentMonthIdx; // current month and past months are locked
}

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
    mutationFn: async (configs: { bu: string; month: string; indicators: BUIndicatorsInput }[]) => {
      // Filter out locked months
      const allowed = configs.filter(c => !isMonthLocked(c.month));
      if (allowed.length === 0) {
        throw new Error('Nenhum mês futuro selecionado para salvar');
      }
      for (const { bu, month, indicators } of allowed) {
        const { error } = await supabase
          .from('bu_indicators_config')
          .upsert({
            bu,
            month,
            ticket_medio: indicators.ticketMedio,
            cpmql: indicators.cpmql,
            cpv: indicators.cpv,
            mql_to_rm: indicators.mqlToRm,
            rm_to_rr: indicators.rmToRr,
            rr_to_prop: indicators.rrToProp,
            prop_to_venda: indicators.propToVenda,
          }, { onConflict: 'bu,month' });
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

  /** Get indicators for a specific BU and month */
  const getIndicators = (bu: string, month: string): BUIndicatorsInput | null => {
    if (!data) return null;
    const row = data.find(r => r.bu === bu && r.month === month);
    if (!row) return null;
    return {
      ticketMedio: Number(row.ticket_medio),
      cpmql: Number(row.cpmql),
      cpv: Number(row.cpv),
      mqlToRm: Number(row.mql_to_rm),
      rmToRr: Number(row.rm_to_rr),
      rrToProp: Number(row.rr_to_prop),
      propToVenda: Number(row.prop_to_venda),
    };
  };

  /** Get indicators map for all months of a BU */
  const getIndicatorsForBU = (bu: string): Record<string, BUIndicatorsInput> => {
    const map: Record<string, BUIndicatorsInput> = {};
    if (!data) return map;
    data.filter(r => r.bu === bu).forEach(row => {
      map[row.month] = {
        ticketMedio: Number(row.ticket_medio),
        cpmql: Number(row.cpmql),
        cpv: Number(row.cpv),
        mqlToRm: Number(row.mql_to_rm),
        rmToRr: Number(row.rm_to_rr),
        rrToProp: Number(row.rr_to_prop),
        propToVenda: Number(row.prop_to_venda),
      };
    });
    return map;
  };

  /** Legacy: get a single indicators map (uses first available month or Jan as default) */
  const getIndicatorsMap = (): Record<string, BUIndicatorsInput> | null => {
    if (!data || data.length === 0) return null;
    const map: Record<string, BUIndicatorsInput> = {};
    // For backward compat: return the current month's config, or Jan if not found
    const now = new Date();
    const currentMonth = MONTHS[now.getMonth()];
    for (const bu of BU_KEYS) {
      const row = data.find(r => r.bu === bu && r.month === currentMonth)
        || data.find(r => r.bu === bu);
      if (row) {
        map[bu] = {
          ticketMedio: Number(row.ticket_medio),
          cpmql: Number(row.cpmql),
          cpv: Number(row.cpv),
          mqlToRm: Number(row.mql_to_rm),
          rmToRr: Number(row.rm_to_rr),
          rrToProp: Number(row.rr_to_prop),
          propToVenda: Number(row.prop_to_venda),
        };
      }
    }
    return Object.keys(map).length > 0 ? map : null;
  };

  return {
    data,
    isLoading,
    getIndicators,
    getIndicatorsForBU,
    getIndicatorsMap,
    saveIndicators: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    months: MONTHS,
    isMonthLocked,
  };
}
