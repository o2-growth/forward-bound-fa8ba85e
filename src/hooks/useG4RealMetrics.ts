import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type G4RealLead = {
  nome: string | null;
  empresa: string | null;
  email: string | null;
  lives: string[];
  presenteAlgumaLive: boolean;
  levantouMao: boolean;
  liveDaMao: string | null;
  fezDiagnostico: boolean;
  noPipe: boolean;
  faseAtual: string | null;
  closer: string | null;
  pipefyUrl: string | null;
  faixa: string | null;
  valorMRR: number | null;
  valorSetup: number | null;
  valorPontual: number | null;
  tcv: number | null;
  sdr: string | null;
  dataEntradaPipe: string | null;
  diasNoPipe: number | null;
  temperatura: "Quente" | "Morno" | "Frio" | null;
  motivoPerda: string | null;
  origemLead?: string | null;
  tipoOrigemLead?: string | null;
};

export type G4RealFunilRow = {
  live: string;
  inscritos: number;
  presentes: number | null;
  levantaramMao: number;
  vendas: number;
};

export type G4RealMetrics = {
  kpis: {
    totalLeads: number;
    levantaramMao: number;
    diagnosticos: number;
    faturamento: number;
  };
  funil: G4RealFunilRow[];
  diagnosticoPorLive: { live: string; diagnosticos: number }[];
  leads: G4RealLead[];
  generatedAt: string;
};

export function useG4RealMetrics() {
  return useQuery<G4RealMetrics>({
    queryKey: ["g4-real-metrics"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<G4RealMetrics>(
        "g4-metrics",
        { method: "GET" },
      );
      if (error) throw error;
      if (!data) throw new Error("Sem dados da função g4-metrics");
      if ((data as unknown as { error?: string }).error) {
        throw new Error((data as unknown as { error: string }).error);
      }
      return data;
    },
  });
}
