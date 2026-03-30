// Revenue Chart section with Grouped Bars + Dashboard
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { differenceInDays, eachDayOfInterval, eachMonthOfInterval, addDays, format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BUType } from "@/hooks/useFunnelRealized";
import { useModeloAtualMetas, ChartGrouping } from "@/hooks/useModeloAtualMetas";
import { useO2TaxMetas } from "@/hooks/useO2TaxMetas";
import { useExpansaoMetas } from "@/hooks/useExpansaoMetas";
import { useOxyHackerMetas } from "@/hooks/useOxyHackerMetas";
import { useMediaMetas } from "@/contexts/MediaMetasContext";
import { RevenueChartGroupedBars } from "./revenue-charts";

interface RevenueChartComparisonProps {
  startDate: Date;
  endDate: Date;
  selectedBUs: BUType[];
  selectedClosers?: string[];
}

// Default ticket values by BU
const DEFAULT_TICKETS = {
  o2_tax: 15000,
  oxy_hacker: 54000,
  franquia: 140000,
};

export function RevenueChartComparison({ 
  startDate, 
  endDate, 
  selectedBUs,
  selectedClosers = []
}: RevenueChartComparisonProps) {
  // Hooks for data retrieval
  const { movements: maMovements } = useModeloAtualMetas(startDate, endDate);
  const o2TaxMetas = useO2TaxMetas(startDate, endDate);
  const franquiaMetas = useExpansaoMetas(startDate, endDate);
  const oxyHackerMetas = useOxyHackerMetas(startDate, endDate);
  const { metasPorBU } = useMediaMetas();

  // Check which BUs are selected
  const useModeloAtual = selectedBUs.includes('modelo_atual');
  const useO2Tax = selectedBUs.includes('o2_tax');
  const useOxyHacker = selectedBUs.includes('oxy_hacker');
  const useFranquia = selectedBUs.includes('franquia');

  // Determine chart grouping based on period length
  const grouping: ChartGrouping = useMemo(() => {
    const days = differenceInDays(endDate, startDate) + 1;
    if (days <= 31) return 'daily';
    if (days <= 90) return 'weekly';
    return 'monthly';
  }, [startDate, endDate]);

  // Calculate pro-rated meta for a period
  const calcularMetaDoPeriodo = (start: Date, end: Date): number => {
    if (!metasPorBU) return 0;
    
    let total = 0;
    
    const busToCheck = [
      { key: 'modelo_atual', active: useModeloAtual },
      { key: 'o2_tax', active: useO2Tax },
      { key: 'oxy_hacker', active: useOxyHacker },
      { key: 'franquia', active: useFranquia },
    ];
    
    for (const bu of busToCheck) {
      if (!bu.active) continue;
      
      const metas = metasPorBU[bu.key as keyof typeof metasPorBU];
      if (!metas || Object.keys(metas).length === 0) continue;
      
      const monthsInPeriod = eachMonthOfInterval({ start, end });
      
      for (const monthDate of monthsInPeriod) {
        const monthNameRaw = format(monthDate, 'MMM', { locale: ptBR });
        const monthName = monthNameRaw.charAt(0).toUpperCase() + monthNameRaw.slice(1);
        const monthMeta = metas[monthName] || 0;
        
        const monthStartDate = startOfMonth(monthDate);
        const monthEndDate = endOfMonth(monthDate);
        const overlapStart = start > monthStartDate ? start : monthStartDate;
        const overlapEnd = end < monthEndDate ? end : monthEndDate;
        const overlapDays = differenceInDays(overlapEnd, overlapStart) + 1;
        const daysInMonth = differenceInDays(monthEndDate, monthStartDate) + 1;
        
        total += monthMeta * (overlapDays / daysInMonth);
      }
    }
    
    return total;
  };

  // Helper to get value for O2 Tax
  const getO2TaxCardValue = (movement: any): number => {
    const mrr = movement.valorMRR || 0;
    const setup = movement.valorSetup || 0;
    const pontual = movement.valorPontual || 0;
    const sum = mrr + setup + pontual;
    return sum === 0 ? DEFAULT_TICKETS.o2_tax : sum;
  };

  // Helper to get value for Expansão
  const getExpansaoCardValue = (movement: any, buType: 'oxy_hacker' | 'franquia'): number => {
    const taxaFranquia = movement.taxaFranquia || 0;
    if (taxaFranquia > 0) return taxaFranquia;
    
    const mrr = movement.valorMRR || 0;
    const setup = movement.valorSetup || 0;
    const pontual = movement.valorPontual || 0;
    const sum = mrr + setup + pontual;
    return sum === 0 ? DEFAULT_TICKETS[buType] : sum;
  };

  // Generate chart data
  const chartData = useMemo(() => {
    // Usar APENAS 'Contrato assinado' como fase de venda (conforme definição universal)
    const isWonPhase = (fase: string) => fase === 'Contrato assinado';
    
    const maSalesCards = maMovements.filter(m => isWonPhase(m.fase));
    const o2SalesMovements = o2TaxMetas.movements.filter(m => isWonPhase(m.fase));
    const franquiaSalesMovements = franquiaMetas.movements.filter(m => isWonPhase(m.fase));
    const oxyHackerSalesMovements = oxyHackerMetas.movements.filter(m => isWonPhase(m.fase));

    const processPeriodByBU = (periodStart: Date, periodEnd: Date) => {
      const periodStartTime = new Date(periodStart.getFullYear(), periodStart.getMonth(), periodStart.getDate()).getTime();
      const periodEndTime = new Date(periodEnd.getFullYear(), periodEnd.getMonth(), periodEnd.getDate(), 23, 59, 59, 999).getTime();

      const result = {
        modelo_atual: 0,
        o2_tax: 0,
        oxy_hacker: 0,
        franquia: 0,
      };

      if (useModeloAtual) {
        const seen = new Set<string>();
        for (const card of maSalesCards) {
          const moveTime = card.dataEntrada.getTime();
          if (moveTime >= periodStartTime && moveTime <= periodEndTime && !seen.has(card.id)) {
            seen.add(card.id);
            result.modelo_atual += card.valorMRR + card.valorSetup + card.valorPontual;
          }
        }
      }

      if (useO2Tax) {
        const seen = new Set<string>();
        for (const mov of o2SalesMovements) {
          const moveTime = mov.dataEntrada.getTime();
          if (moveTime >= periodStartTime && moveTime <= periodEndTime && !seen.has(mov.id)) {
            seen.add(mov.id);
            result.o2_tax += getO2TaxCardValue(mov);
          }
        }
      }

      if (useFranquia) {
        const seen = new Set<string>();
        for (const mov of franquiaSalesMovements) {
          const moveTime = mov.dataEntrada.getTime();
          if (moveTime >= periodStartTime && moveTime <= periodEndTime && !seen.has(mov.id)) {
            seen.add(mov.id);
            result.franquia += getExpansaoCardValue(mov, 'franquia');
          }
        }
      }

      if (useOxyHacker) {
        const seen = new Set<string>();
        for (const mov of oxyHackerSalesMovements) {
          const moveTime = mov.dataEntrada.getTime();
          if (moveTime >= periodStartTime && moveTime <= periodEndTime && !seen.has(mov.id)) {
            seen.add(mov.id);
            result.oxy_hacker += getExpansaoCardValue(mov, 'oxy_hacker');
          }
        }
      }

      return result;
    };

    const generatePeriods = () => {
      const periods: { label: string; start: Date; end: Date }[] = [];
      
      if (grouping === 'daily') {
        const days = eachDayOfInterval({ start: startDate, end: endDate });
        for (const day of days) {
          periods.push({
            label: format(day, 'd', { locale: ptBR }),
            start: day,
            end: day,
          });
        }
      } else if (grouping === 'weekly') {
        const totalDays = differenceInDays(endDate, startDate) + 1;
        const numWeeks = Math.ceil(totalDays / 7);

        for (let i = 0; i < numWeeks; i++) {
          const weekStart = addDays(startDate, i * 7);
          const weekEnd = i === numWeeks - 1 ? endDate : addDays(weekStart, 6);
          periods.push({
            label: `S${i + 1}`,
            start: weekStart,
            end: weekEnd,
          });
        }
      } else {
        const months = eachMonthOfInterval({ start: startDate, end: endDate });
        for (const monthDate of months) {
          const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
          const lastDay = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
          periods.push({
            label: format(monthDate, 'MMM', { locale: ptBR }),
            start: monthStart,
            end: lastDay,
          });
        }
      }
      
      return periods;
    };

    const periods = generatePeriods();

    return periods.map(period => {
      const buData = processPeriodByBU(period.start, period.end);
      const total = buData.modelo_atual + buData.o2_tax + buData.oxy_hacker + buData.franquia;
      return {
        label: period.label,
        ...buData,
        total,
        meta: calcularMetaDoPeriodo(period.start, period.end),
        startDate: period.start,
        endDate: period.end,
      };
    });
  }, [
    maMovements, o2TaxMetas.movements, franquiaMetas.movements, oxyHackerMetas.movements,
    useModeloAtual, useO2Tax, useOxyHacker, useFranquia,
    grouping, startDate, endDate, metasPorBU
  ]);

  // Calculate totals
  const totals = useMemo(() => ({
    modelo_atual: chartData.reduce((sum, d) => sum + d.modelo_atual, 0),
    o2_tax: chartData.reduce((sum, d) => sum + d.o2_tax, 0),
    oxy_hacker: chartData.reduce((sum, d) => sum + d.oxy_hacker, 0),
    franquia: chartData.reduce((sum, d) => sum + d.franquia, 0),
    total: chartData.reduce((sum, d) => sum + d.total, 0),
    meta: chartData.reduce((sum, d) => sum + d.meta, 0),
  }), [chartData]);

  // Metas por BU para o dashboard
  const buMetas = useMemo(() => {
    if (!metasPorBU) return undefined;
    
    const calcBUMeta = (buKey: string) => {
      const metas = metasPorBU[buKey as keyof typeof metasPorBU];
      if (!metas) return 0;
      
      const monthsInPeriod = eachMonthOfInterval({ start: startDate, end: endDate });
      let total = 0;
      
      for (const monthDate of monthsInPeriod) {
        const monthNameRaw = format(monthDate, 'MMM', { locale: ptBR });
        const monthName = monthNameRaw.charAt(0).toUpperCase() + monthNameRaw.slice(1);
        const monthMeta = metas[monthName] || 0;
        
        const monthStartDate = startOfMonth(monthDate);
        const monthEndDate = endOfMonth(monthDate);
        const overlapStart = startDate > monthStartDate ? startDate : monthStartDate;
        const overlapEnd = endDate < monthEndDate ? endDate : monthEndDate;
        const overlapDays = differenceInDays(overlapEnd, overlapStart) + 1;
        const daysInMonth = differenceInDays(monthEndDate, monthStartDate) + 1;
        
        total += monthMeta * (overlapDays / daysInMonth);
      }
      
      return total;
    };

    return {
      modelo_atual: calcBUMeta('modelo_atual'),
      o2_tax: calcBUMeta('o2_tax'),
      oxy_hacker: calcBUMeta('oxy_hacker'),
      franquia: calcBUMeta('franquia'),
    };
  }, [metasPorBU, startDate, endDate]);

  if (selectedBUs.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-8 text-center text-muted-foreground">
          Selecione pelo menos uma BU para visualizar os gráficos
        </CardContent>
      </Card>
    );
  }

  return (
    <RevenueChartGroupedBars
      startDate={startDate}
      endDate={endDate}
      selectedBUs={selectedBUs}
      chartData={chartData}
      totals={totals}
      metasPorBU={buMetas}
    />
  );
}
