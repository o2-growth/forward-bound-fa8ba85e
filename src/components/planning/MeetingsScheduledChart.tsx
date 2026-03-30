import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, LabelList } from "recharts";
import { BUType } from "@/hooks/useFunnelRealized";
import { useModeloAtualMetas, ChartGrouping } from "@/hooks/useModeloAtualMetas";
import { useModeloAtualAnalytics } from "@/hooks/useModeloAtualAnalytics";
import { useO2TaxMetas } from "@/hooks/useO2TaxMetas";
import { useO2TaxAnalytics } from "@/hooks/useO2TaxAnalytics";
import { useOxyHackerMetas } from "@/hooks/useOxyHackerMetas";
import { useExpansaoMetas } from "@/hooks/useExpansaoMetas";
import { useExpansaoAnalytics } from "@/hooks/useExpansaoAnalytics";
import { useMediaMetas, FunnelDataItem } from "@/contexts/MediaMetasContext";
import { DetailSheet, DetailItem, columnFormatters } from "./indicators/DetailSheet";
import { ExternalLink } from "lucide-react";
import { format, eachDayOfInterval, differenceInDays, addDays, eachMonthOfInterval, getMonth, startOfMonth, endOfMonth, isSameDay, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MeetingsScheduledChartProps {
  startDate: Date;
  endDate: Date;
  selectedBU: BUType | 'all';
  selectedBUs?: BUType[];
  selectedClosers?: string[];
}

const formatNumber = (value: number) => new Intl.NumberFormat("pt-BR").format(Math.round(value));

// Month name mapping for funnelData lookup
const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export function MeetingsScheduledChart({ startDate, endDate, selectedBU, selectedBUs, selectedClosers }: MeetingsScheduledChartProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetItems, setSheetItems] = useState<DetailItem[]>([]);
  const [sheetDescription, setSheetDescription] = useState("");
  
  // Use database data for Modelo Atual meetings (rm = reunião marcada)
  const { getGroupedData: getModeloAtualGroupedData, getQtyForPeriod: getModeloAtualQty } = useModeloAtualMetas(startDate, endDate);
  
  // O2 TAX meetings data
  const { getGroupedData: getO2TaxGroupedData, getQtyForPeriod: getO2TaxQty } = useO2TaxMetas(startDate, endDate);
  
  // Oxy Hacker meetings data
  const { getGroupedData: getOxyHackerGroupedData, getQtyForPeriod: getOxyHackerQty } = useOxyHackerMetas(startDate, endDate);
  
  // Franquia meetings data
  const { getGroupedData: getFranquiaGroupedData, getQtyForPeriod: getFranquiaQty } = useExpansaoMetas(startDate, endDate);
  
  // Analytics hooks for drill-down details
  const modeloAtualAnalytics = useModeloAtualAnalytics(startDate, endDate);
  const o2TaxAnalytics = useO2TaxAnalytics(startDate, endDate);
  const oxyHackerAnalytics = useExpansaoAnalytics(startDate, endDate, 'Oxy Hacker');
  const franquiaAnalytics = useExpansaoAnalytics(startDate, endDate, 'Franquia');
  
  // Get funnelData from MediaMetasContext for dynamic metas
  const { funnelData } = useMediaMetas();
  
  // Helper function to calculate meta from funnelData for a given period (pro-rated for partial months)
  // Uses 'rms' field from funnelData (reuniões marcadas)
  const calcularMetaRM = (funnelItems: FunnelDataItem[] | undefined): number => {
    if (!funnelItems || funnelItems.length === 0) return 0;
    
    const monthsInPeriod = eachMonthOfInterval({ start: startDate, end: endDate });
    let total = 0;
    
    for (const monthDate of monthsInPeriod) {
      const monthName = monthNames[getMonth(monthDate)];
      const item = funnelItems.find(f => f.month === monthName);
      if (!item) continue;
      
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      
      const overlapStart = startDate > monthStart ? startDate : monthStart;
      const overlapEnd = endDate < monthEnd ? endDate : monthEnd;
      
      if (overlapStart > overlapEnd) continue;
      
      const overlapDays = differenceInDays(overlapEnd, overlapStart) + 1;
      const daysInMonth = differenceInDays(monthEnd, monthStart) + 1;
      const fraction = daysInMonth > 0 ? overlapDays / daysInMonth : 0;
      
      // Use rms field from funnelData (reuniões marcadas)
      total += (item.rms || 0) * fraction;
    }
    
    return Math.round(total);
  };
  
  // Derive which BUs are included from selectedBUs array (or fallback to selectedBU)
  const selectedBUsArray = selectedBUs || (selectedBU === 'all' 
    ? ['modelo_atual', 'o2_tax', 'oxy_hacker', 'franquia'] as BUType[]
    : [selectedBU]);
  
  const includesModeloAtual = selectedBUsArray.includes('modelo_atual');
  const includesO2Tax = selectedBUsArray.includes('o2_tax');
  const includesOxyHacker = selectedBUsArray.includes('oxy_hacker');
  const includesFranquia = selectedBUsArray.includes('franquia');
  
  // Check if single BU selected
  const hasSingleBU = selectedBUsArray.length === 1;
  const useModeloAtual = hasSingleBU && selectedBUsArray[0] === 'modelo_atual';
  const useConsolidado = selectedBUsArray.length > 1;
  const useO2Tax = hasSingleBU && selectedBUsArray[0] === 'o2_tax';
  const useOxyHacker = hasSingleBU && selectedBUsArray[0] === 'oxy_hacker';
  const useFranquia = hasSingleBU && selectedBUsArray[0] === 'franquia';
  
  // Determine grouping based on period length
  const daysInPeriod = differenceInDays(endDate, startDate) + 1;
  const grouping: ChartGrouping = daysInPeriod <= 31 ? 'daily' : daysInPeriod <= 90 ? 'weekly' : 'monthly';

  // Get grouped data based on selected BUs - for chart bars, use 'rm' indicator
  const getChartData = () => {
    if (hasSingleBU) {
      if (useModeloAtual) return getModeloAtualGroupedData('rm', startDate, endDate, grouping);
      if (useO2Tax) return getO2TaxGroupedData('rm', startDate, endDate, grouping);
      if (useOxyHacker) return getOxyHackerGroupedData('rm', startDate, endDate, grouping);
      if (useFranquia) return getFranquiaGroupedData('rm', startDate, endDate, grouping);
    }
    
    // Multi-BU: sum grouped data from selected BUs
    const numPeriods = grouping === 'daily' 
      ? daysInPeriod 
      : grouping === 'weekly' 
      ? Math.ceil(daysInPeriod / 7) 
      : eachMonthOfInterval({ start: startDate, end: endDate }).length;
    
    const qty = Array(numPeriods).fill(0);
    const meta = Array(numPeriods).fill(0);
    
    if (includesModeloAtual) {
      const data = getModeloAtualGroupedData('rm', startDate, endDate, grouping);
      data.qty.forEach((v, i) => { qty[i] += v; });
      data.meta.forEach((v, i) => { meta[i] += v; });
    }
    if (includesO2Tax) {
      const data = getO2TaxGroupedData('rm', startDate, endDate, grouping);
      data.qty.forEach((v, i) => { qty[i] += v; });
      data.meta.forEach((v, i) => { meta[i] += v; });
    }
    if (includesOxyHacker) {
      const data = getOxyHackerGroupedData('rm', startDate, endDate, grouping);
      data.qty.forEach((v, i) => { qty[i] += v; });
      data.meta.forEach((v, i) => { meta[i] += v; });
    }
    if (includesFranquia) {
      const data = getFranquiaGroupedData('rm', startDate, endDate, grouping);
      data.qty.forEach((v, i) => { qty[i] += v; });
      data.meta.forEach((v, i) => { meta[i] += v; });
    }
    
    return { qty, meta };
  };
  
  const meetingsData = getChartData();
  
  // Get total meta from funnelData based on selected BUs
  // Annual metas for RM: O2 TAX 180, Oxy Hacker 120, Franquia 144
  const periodMeta = 
    (includesModeloAtual ? calcularMetaRM(funnelData?.modeloAtual) : 0) +
    (includesO2Tax ? Math.round((180 / 365) * daysInPeriod) : 0) +
    (includesOxyHacker ? Math.round((120 / 365) * daysInPeriod) : 0) +
    (includesFranquia ? Math.round((144 / 365) * daysInPeriod) : 0);
    
  // Get total realized based on selected BUs
  const getTotalRealized = (): number => {
    let total = 0;
    
    // For Modelo Atual, apply closer filter if active
    if (includesModeloAtual) {
      if (selectedClosers?.length && selectedClosers.length > 0) {
        const cards = modeloAtualAnalytics.getCardsForIndicator('rm');
        const filteredCards = cards.filter(c => {
          const closerValue = (c.closer || '').trim();
          return closerValue && selectedClosers.includes(closerValue);
        });
        total += filteredCards.length;
      } else {
        total += getModeloAtualQty('rm', startDate, endDate);
      }
    }
    
    if (includesO2Tax) total += getO2TaxQty('rm', startDate, endDate);
    if (includesOxyHacker) total += getOxyHackerQty('rm', startDate, endDate);
    if (includesFranquia) total += getFranquiaQty('rm', startDate, endDate);
    
    return total;
  };
  
  const totalRealized = getTotalRealized();

  // Build chart data with proper date labels
  const buildChartData = () => {
    if (grouping === 'daily') {
      return eachDayOfInterval({ start: startDate, end: endDate }).map((day, index) => ({
        label: format(day, "d 'de' MMM", { locale: ptBR }),
        meetings: meetingsData.qty[index] || 0,
        meta: meetingsData.meta[index] || 0,
      }));
    } else if (grouping === 'weekly') {
      const totalDays = differenceInDays(endDate, startDate) + 1;
      const numWeeks = Math.ceil(totalDays / 7);
      return Array.from({ length: numWeeks }, (_, i) => {
        const weekStart = addDays(startDate, i * 7);
        return {
          label: format(weekStart, "d 'de' MMM", { locale: ptBR }),
          meetings: meetingsData.qty[i] || 0,
          meta: meetingsData.meta[i] || 0,
        };
      });
    } else {
      // Monthly - use actual months from the interval
      const months = eachMonthOfInterval({ start: startDate, end: endDate });
      return months.map((monthDate, index) => ({
        label: format(monthDate, "MMM", { locale: ptBR }),
        meetings: meetingsData.qty[index] || 0,
        meta: meetingsData.meta[index] || 0,
      }));
    }
  };

  const chartData = buildChartData();

  // Handle click on specific bar - filter by day/week/month
  const handleBarClick = (data: any, index: number) => {
    if (!isClickable) return;
    
    // Calculate the exact date/period based on grouping and index
    let clickedDate: Date;
    let periodLabel: string;
    let periodEnd: Date;
    
    if (grouping === 'daily') {
      const days = eachDayOfInterval({ start: startDate, end: endDate });
      clickedDate = days[index];
      periodEnd = clickedDate;
      periodLabel = format(clickedDate, "d 'de' MMMM", { locale: ptBR });
    } else if (grouping === 'weekly') {
      clickedDate = addDays(startDate, index * 7);
      periodEnd = addDays(clickedDate, 6);
      if (periodEnd > endDate) periodEnd = endDate;
      periodLabel = `Semana de ${format(clickedDate, "d 'de' MMM", { locale: ptBR })}`;
    } else {
      const months = eachMonthOfInterval({ start: startDate, end: endDate });
      clickedDate = months[index];
      periodEnd = endOfMonth(clickedDate);
      periodLabel = format(clickedDate, "MMMM", { locale: ptBR });
    }
    
    // Get items based on selected BUs
    let allItems: DetailItem[] = [];
    
    if (hasSingleBU) {
      if (useModeloAtual) {
        allItems = modeloAtualAnalytics.getDetailItemsForIndicator('rm');
      } else if (useO2Tax) {
        allItems = o2TaxAnalytics.getDetailItemsForIndicator('rm');
      } else if (useOxyHacker) {
        allItems = oxyHackerAnalytics.getDetailItemsForIndicator('rm');
      } else if (useFranquia) {
        allItems = franquiaAnalytics.getDetailItemsForIndicator('rm');
      }
    } else {
      // Multi-BU: aggregate only selected BUs
      if (includesModeloAtual) {
        allItems = [...allItems, ...modeloAtualAnalytics.getDetailItemsForIndicator('rm')];
      }
      if (includesO2Tax) {
        allItems = [...allItems, ...o2TaxAnalytics.getDetailItemsForIndicator('rm')];
      }
      if (includesOxyHacker) {
        allItems = [...allItems, ...oxyHackerAnalytics.getDetailItemsForIndicator('rm')];
      }
      if (includesFranquia) {
        allItems = [...allItems, ...franquiaAnalytics.getDetailItemsForIndicator('rm')];
      }
    }
    
    // Filter by the clicked period
    const filteredItems = allItems.filter(item => {
      if (!item.date) return false;
      const itemDate = new Date(item.date);
      
      if (grouping === 'daily') {
        return isSameDay(itemDate, clickedDate);
      } else if (grouping === 'weekly') {
        return itemDate >= clickedDate && itemDate <= periodEnd;
      } else {
        return isSameMonth(itemDate, clickedDate);
      }
    });
    
    setSheetItems(filteredItems);
    setSheetDescription(`${filteredItems.length} reuniões em ${periodLabel}`);
    setSheetOpen(true);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-foreground mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatNumber(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const isClickable = selectedBUsArray.length > 0;

  return (
    <>
      <Card 
        className="bg-card border-2 border-blue-500 relative group"
      >
        {isClickable && (
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-foreground">Qtd Reuniões Marcadas</CardTitle>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted-foreground">
              Realizado: <span className="font-medium text-foreground">{formatNumber(totalRealized)}</span>
            </span>
            <span className="text-muted-foreground">
              Meta: <span className="font-medium text-foreground">{formatNumber(periodMeta)}</span>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-6 mt-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-blue-500" />
            <span className="text-xs text-muted-foreground">Reuniões Marcadas</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis 
                dataKey="label" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                interval={grouping === 'daily' && chartData.length > 10 ? Math.floor(chartData.length / 7) : 0}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} 
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="meetings" 
                fill="#3b82f6" 
                name="Reuniões" 
                radius={[4, 4, 0, 0]}
                onClick={handleBarClick}
                cursor={isClickable ? "pointer" : "default"}
              >
                <LabelList dataKey="meetings" position="top" fill="hsl(var(--muted-foreground))" fontSize={10} formatter={(v: number) => v > 0 ? v : ''} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
    
    <DetailSheet
      open={sheetOpen}
      onOpenChange={setSheetOpen}
      title="Reuniões Marcadas"
      description={sheetDescription || `${formatNumber(totalRealized)} reuniões no período selecionado`}
      items={sheetItems}
      columns={[
        { key: 'product', label: 'Produto', format: columnFormatters.product },
        { key: 'company', label: 'Empresa/Contato' },
        { key: 'date', label: 'Data', format: columnFormatters.date },
        { key: 'duration', label: 'Tempo na Fase', format: columnFormatters.duration },
        { key: 'revenueRange', label: 'Faixa Faturamento' },
        { key: 'responsible', label: 'Responsável' },
      ]}
    />
    </>
  );
}
