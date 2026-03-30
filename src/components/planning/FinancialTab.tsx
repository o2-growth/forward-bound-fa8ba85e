import { useOxyFinance } from "@/hooks/useOxyFinance";
import { useEffectiveMetas } from "@/hooks/useEffectiveMetas";
import { useMonetaryMetas, MONTHS, isPontualOnlyBU, type BuType } from "@/hooks/useMonetaryMetas";
import { DreTable } from "./financial/DreTable";
import { CashflowChart } from "./financial/CashflowChart";
import { MetaVsRealized } from "./financial/MetaVsRealized";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function FinancialTab() {
  const { cashflowChart, isLoading: oxyLoading, error } = useOxyFinance(2026);
  const { realizedDRE, isLoading: effectiveLoading } = useEffectiveMetas(2026);
  const { metas, isLoading: metasLoading } = useMonetaryMetas(2026);
  const isLoading = oxyLoading || effectiveLoading || metasLoading;

  // Calculate annual meta totals per BU
  const metasByBU: Record<BuType, number> = {
    modelo_atual: 0,
    o2_tax: 0,
    oxy_hacker: 0,
    franquia: 0,
  };

  for (const meta of metas) {
    const bu = meta.bu as BuType;
    if (!metasByBU.hasOwnProperty(bu)) continue;
    const isPontual = isPontualOnlyBU(bu);
    metasByBU[bu] += isPontual ? (Number(meta.pontual) || 0) : (Number(meta.faturamento) || 0);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Financeiro</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Dados contábeis via DRE e fluxo de caixa — fonte Oxy Finance
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Erro ao carregar dados financeiros: {error.message}
          </AlertDescription>
        </Alert>
      )}

      <MetaVsRealized dreByBU={realizedDRE} metasByBU={metasByBU} isLoading={isLoading} />
      <DreTable dreByBU={realizedDRE} isLoading={isLoading} />
      <CashflowChart data={cashflowChart} isLoading={isLoading} />
    </div>
  );
}
