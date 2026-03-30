import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { useClosersMetas } from "@/hooks/useClosersMetas";
import { useExpansaoMetas } from "@/hooks/useExpansaoMetas";
import { useO2TaxMetas } from "@/hooks/useO2TaxMetas";
import { useOxyHackerMetas } from "@/hooks/useOxyHackerMetas";
import { useModeloAtualValues } from "@/hooks/useModeloAtualValues";
import { useModeloAtualMetas } from "@/hooks/useModeloAtualMetas";
import { BUType, IndicatorType } from "@/hooks/useFunnelRealized";

interface PeriodFunnelChartProps {
  startDate: Date;
  endDate: Date;
  selectedBU: BUType | 'all';
}

const formatNumber = (value: number) => new Intl.NumberFormat("pt-BR").format(Math.round(value));
const formatCurrency = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 }).format(value);

interface FunnelStage {
  number: number;
  name: string;
  indicator: IndicatorType;
  value: number;
  conversionPercent: number;
}

export function PeriodFunnelChart({ startDate, endDate, selectedBU }: PeriodFunnelChartProps) {
  
  const { getQtyForPeriod: getClosersQty } = useClosersMetas(startDate, endDate);
  const { getQtyForPeriod: getExpansaoQty, getValueForPeriod: getExpansaoValue } = useExpansaoMetas(startDate, endDate);
  const { getQtyForPeriod: getO2TaxQty, getValueForPeriod: getO2TaxValue } = useO2TaxMetas(startDate, endDate);
  const { getQtyForPeriod: getOxyHackerQty, getValueForPeriod: getOxyHackerValue } = useOxyHackerMetas(startDate, endDate);
  const { getValueForPeriod: getModeloAtualValue } = useModeloAtualValues(startDate, endDate);
  const { getQtyForPeriod: getModeloAtualQty } = useModeloAtualMetas(startDate, endDate);
  
  // Check if we should use external database data
  const useExpansaoData = selectedBU === 'franquia';
  const useO2TaxData = selectedBU === 'o2_tax';
  const useOxyHackerData = selectedBU === 'oxy_hacker';
  const useConsolidado = selectedBU === 'all';
  
  // Get leads data using the same logic as LeadsStackedChart (Leads = Novos Leads + MQLs)
  const leadsQty = getModeloAtualQty('leads', startDate, endDate);
  const o2TaxLeadsQty = getO2TaxQty('leads', startDate, endDate);
  
  // Get totals based on selected BU
  const totals = useConsolidado ? {
    // Consolidado: sum all BUs (Modelo Atual + O2 TAX + Oxy Hacker + Franquia)
    leads: leadsQty + o2TaxLeadsQty, // Include O2 TAX leads
    mql: getModeloAtualQty('mql', startDate, endDate) + getO2TaxQty('mql', startDate, endDate) + getOxyHackerQty('mql', startDate, endDate) + getExpansaoQty('mql', startDate, endDate),
    rm: getClosersQty('rm', startDate, endDate) + getO2TaxQty('rm', startDate, endDate) + getOxyHackerQty('rm', startDate, endDate) + getExpansaoQty('rm', startDate, endDate),
    rr: getClosersQty('rr', startDate, endDate) + getO2TaxQty('rr', startDate, endDate) + getOxyHackerQty('rr', startDate, endDate) + getExpansaoQty('rr', startDate, endDate),
    proposta: getClosersQty('proposta', startDate, endDate) + getO2TaxQty('proposta', startDate, endDate) + getOxyHackerQty('proposta', startDate, endDate) + getExpansaoQty('proposta', startDate, endDate),
    venda: getClosersQty('venda', startDate, endDate) + getO2TaxQty('venda', startDate, endDate) + getOxyHackerQty('venda', startDate, endDate) + getExpansaoQty('venda', startDate, endDate),
  } : useExpansaoData ? {
    leads: 0, // No leads data for Franquia yet
    mql: getExpansaoQty('mql', startDate, endDate),
    rm: getExpansaoQty('rm', startDate, endDate),
    rr: getExpansaoQty('rr', startDate, endDate),
    proposta: getExpansaoQty('proposta', startDate, endDate),
    venda: getExpansaoQty('venda', startDate, endDate),
  } : useO2TaxData ? {
    leads: o2TaxLeadsQty, // Use O2 TAX leads data
    mql: getO2TaxQty('mql', startDate, endDate),
    rm: getO2TaxQty('rm', startDate, endDate),
    rr: getO2TaxQty('rr', startDate, endDate),
    proposta: getO2TaxQty('proposta', startDate, endDate),
    venda: getO2TaxQty('venda', startDate, endDate),
  } : useOxyHackerData ? {
    leads: 0, // No leads data for Oxy Hacker yet
    mql: getOxyHackerQty('mql', startDate, endDate),
    rm: getOxyHackerQty('rm', startDate, endDate),
    rr: getOxyHackerQty('rr', startDate, endDate),
    proposta: getOxyHackerQty('proposta', startDate, endDate),
    venda: getOxyHackerQty('venda', startDate, endDate),
  } : {
    // Modelo Atual only - use useModeloAtualMetas for all indicators (same data source as charts)
    leads: leadsQty,
    mql: getModeloAtualQty('mql', startDate, endDate),
    rm: getModeloAtualQty('rm', startDate, endDate),
    rr: getModeloAtualQty('rr', startDate, endDate),
    proposta: getModeloAtualQty('proposta', startDate, endDate),
    venda: getModeloAtualQty('venda', startDate, endDate),
  };

  // Calculate conversions
  const stages: FunnelStage[] = [
    { number: 1, name: 'Leads', indicator: 'leads' as IndicatorType, value: totals.leads, conversionPercent: 100 },
    { number: 2, name: 'MQL', indicator: 'mql', value: totals.mql, conversionPercent: totals.leads > 0 ? (totals.mql / totals.leads) * 100 : 100 },
    { number: 3, name: 'Reuniões Agendadas', indicator: 'rm', value: totals.rm, conversionPercent: totals.mql > 0 ? (totals.rm / totals.mql) * 100 : 0 },
    { number: 4, name: 'Reunião realizada', indicator: 'rr', value: totals.rr, conversionPercent: totals.rm > 0 ? (totals.rr / totals.rm) * 100 : 0 },
    { number: 5, name: 'Proposta Enviada', indicator: 'proposta', value: totals.proposta, conversionPercent: totals.rr > 0 ? (totals.proposta / totals.rr) * 100 : 0 },
    { number: 6, name: 'Contrato Assinado', indicator: 'venda', value: totals.venda, conversionPercent: totals.proposta > 0 ? (totals.venda / totals.proposta) * 100 : 0 },
  ];

  // Calculate monetary values using real values from each BU's data source
  // For Consolidado, sum values from all BUs
  const propostaValue = useConsolidado
    ? getModeloAtualValue('proposta', startDate, endDate) + getO2TaxValue('proposta', startDate, endDate) + getOxyHackerValue('proposta', startDate, endDate) + getExpansaoValue('proposta', startDate, endDate)
    : useExpansaoData 
      ? getExpansaoValue('proposta', startDate, endDate)
      : useO2TaxData 
        ? getO2TaxValue('proposta', startDate, endDate)
        : useOxyHackerData 
          ? getOxyHackerValue('proposta', startDate, endDate)
          : getModeloAtualValue('proposta', startDate, endDate);

  const vendaValue = useConsolidado
    ? getModeloAtualValue('venda', startDate, endDate) + getO2TaxValue('venda', startDate, endDate) + getOxyHackerValue('venda', startDate, endDate) + getExpansaoValue('venda', startDate, endDate)
    : useExpansaoData 
      ? getExpansaoValue('venda', startDate, endDate)
      : useO2TaxData 
        ? getO2TaxValue('venda', startDate, endDate)
        : useOxyHackerData 
          ? getOxyHackerValue('venda', startDate, endDate)
          : getModeloAtualValue('venda', startDate, endDate);

  // Width percentages for funnel visualization (6 stages now)
  const widthPercentages = [100, 85, 70, 55, 45, 35];

  // Colors for each stage
  const stageColors = [
    'from-orange-400 to-orange-500',   // Leads - LARANJA
    'from-emerald-400 to-cyan-500',    // MQL
    'from-cyan-500 to-blue-500',       // RM
    'from-blue-500 to-blue-600',       // RR
    'from-blue-600 to-slate-500',      // Proposta
    'from-slate-500 to-slate-600',     // Venda
  ];

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-foreground">Funil do Período</CardTitle>
        <div className="grid grid-cols-2 gap-4 mt-3">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Proposta Enviada</p>
            <p className="text-lg font-bold text-foreground">{formatCurrency(propostaValue)}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Contratos Assinados</p>
            <p className="text-lg font-bold text-foreground">{formatCurrency(vendaValue)}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="flex flex-col gap-1">
          {stages.map((stage, index) => (
            <div key={stage.indicator} className="relative flex items-center justify-center">
              {/* Funnel stage container */}
              <div
                className={`relative h-14 bg-gradient-to-r ${stageColors[index]} rounded-sm transition-all duration-300 flex items-center justify-center px-3 min-w-[180px] ${
                  index === stages.length - 1 ? 'ring-2 ring-pink-500 ring-offset-2 ring-offset-background' : ''
                }`}
                style={{ width: `${widthPercentages[index]}%` }}
              >
                {/* Stage content */}
                <div className="flex items-center gap-2 text-white text-sm font-medium whitespace-nowrap overflow-hidden">
                  <span className="bg-white/20 rounded-full w-5 h-5 flex-shrink-0 flex items-center justify-center text-xs">
                    {stage.number}
                  </span>
                  <span className="hidden sm:inline truncate">{stage.name}</span>
                  <span className="font-bold flex-shrink-0">{formatNumber(stage.value)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

      </CardContent>
    </Card>
  );
}