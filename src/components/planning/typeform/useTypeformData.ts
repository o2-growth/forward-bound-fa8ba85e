import { useQuery } from "@tanstack/react-query";
import { fetchTypeformView } from "@/integrations/typeform/client";

const STALE = 5 * 60 * 1000;

export interface DiagKpis {
  total_leads: number;
  total_mqls: number;
  completos: number;
  agendados: number;
  mql_completos: number;
  mql_agendados: number;
  taxa_completo_pct: number;
  taxa_agenda_pct: number;
  mql_taxa_completo_pct: number;
  mql_taxa_agenda_pct: number;
  mql_completo_to_agenda_pct: number;
}

export interface DiagBySdr {
  sdr_nome: string;
  mqls: number;
  completos: number;
  agendados: number;
  conv_pct: number;
}

export interface DiagByFaturamento {
  faturamento: string;
  is_mql: boolean;
  total: number;
  completos: number;
  agendados: number;
  taxa_completo_pct: number;
  taxa_agenda_pct: number;
}

export interface DiagBySetor {
  setor: string;
  mqls: number;
  agendados: number;
  conv_pct: number;
}

export interface DiagPipeline {
  booking_date: string;
  reunioes: number;
}

export interface DiagVelocidade {
  total_bookings: number;
  mediana_min: number;
  sub_10min: number;
  sub_1h: number;
}

export const useDiagKpis = () =>
  useQuery({
    queryKey: ["typeform", "v_o2_diag_kpis"],
    queryFn: () => fetchTypeformView<DiagKpis>("v_o2_diag_kpis"),
    staleTime: STALE,
  });

export const useDiagBySdr = () =>
  useQuery({
    queryKey: ["typeform", "v_o2_diag_by_sdr"],
    queryFn: () => fetchTypeformView<DiagBySdr>("v_o2_diag_by_sdr"),
    staleTime: STALE,
  });

export const useDiagByFaturamento = () =>
  useQuery({
    queryKey: ["typeform", "v_o2_diag_by_faturamento"],
    queryFn: () => fetchTypeformView<DiagByFaturamento>("v_o2_diag_by_faturamento"),
    staleTime: STALE,
  });

export const useDiagBySetor = () =>
  useQuery({
    queryKey: ["typeform", "v_o2_diag_by_setor"],
    queryFn: () => fetchTypeformView<DiagBySetor>("v_o2_diag_by_setor"),
    staleTime: STALE,
  });

export const useDiagPipeline = () =>
  useQuery({
    queryKey: ["typeform", "v_o2_diag_pipeline"],
    queryFn: () =>
      fetchTypeformView<DiagPipeline>(
        "v_o2_diag_pipeline",
        "?order=booking_date.asc"
      ),
    staleTime: STALE,
  });

export const useDiagVelocidade = () =>
  useQuery({
    queryKey: ["typeform", "v_o2_diag_velocidade"],
    queryFn: () => fetchTypeformView<DiagVelocidade>("v_o2_diag_velocidade"),
    staleTime: STALE,
  });
