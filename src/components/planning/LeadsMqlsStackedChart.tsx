import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, LabelList } from "recharts";
import { BUType } from "@/hooks/useFunnelRealized";
import { useModeloAtualMetas, ChartGrouping } from "@/hooks/useModeloAtualMetas";
import { useModeloAtualAnalytics } from "@/hooks/useModeloAtualAnalytics";
import { useExpansaoMetas } from "@/hooks/useExpansaoMetas";
import { useExpansaoAnalytics } from "@/hooks/useExpansaoAnalytics";
import { useO2TaxMetas } from "@/hooks/useO2TaxMetas";
import { useO2TaxAnalytics } from "@/hooks/useO2TaxAnalytics";
import { useOxyHackerMetas } from "@/hooks/useOxyHackerMetas";
import { useMediaMetas, FunnelDataItem } from "@/contexts/MediaMetasContext";
import { DetailSheet, DetailItem, columnFormatters } from "./indicators/DetailSheet";
import { ExternalLink } from "lucide-react";
import { format, eachDayOfInterval, differenceInDays, addDays, eachMonthOfInterval, getMonth, startOfMonth, endOfMonth, isSameDay, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LeadsMqlsStackedChartProps {
  startDate: Date;
  endDate: Date;
  selectedBU: BUType | 'all';
  selectedBUs?: BUType[];
  selectedClosers?: string[];
  metaMqls?: number;
}

const formatNumber = (value: number) => new Intl.NumberFormat("pt-BR").format(Math.round(value));

// Month name mapping for funnelData lookup
const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export function LeadsMqlsStackedChart({ startDate, endDate, selectedBU, selectedBUs, selectedClosers }: LeadsMqlsStackedChartProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetItems, setSheetItems] = useState<DetailItem[]>([]);
  const [sheetDescription, setSheetDescription] = useState("");
  
  const { getGroupedData: getModeloAtualGroupedData, getQtyForPeriod: getModeloAtualQty } = useModeloAtualMetas(startDate, endDate);
  const { getGroupedData: getExpansaoGroupedData, getQtyForPeriod: getExpansaoQty } = useExpansaoMetas(startDate, endDate);
  const { getGroupedData: getO2TaxGroupedData, getQtyForPeriod: getO2TaxQty } = useO2TaxMetas(startDate, endDate);
  const { getGroupedData: getOxyHackerGroupedData, getQtyForPeriod: getOxyHackerQty } = useOxyHackerMetas(startDate, endDate);
  
  // Analytics hooks for drill-down (all BUs)
  const modeloAtualAnalytics = useModeloAtualAnalytics(startDate, endDate);
  const o2TaxAnalytics = useO2TaxAnalytics(startDate, endDate);
  const franquiaAnalytics = useExpansaoAnalytics(startDate, endDate, 'Franquia');
  const oxyHackerAnalytics = useExpansaoAnalytics(startDate, endDate, 'Oxy Hacker');
  
  // Get funnelData from MediaMetasContext for dynamic metas
  const { funnelData } = useMediaMetas();
  
  // Helper function to calculate meta from funnelData for a given period (pro-rated for partial months)
  const calcularMetaDoPeriodo = (funnelItems: FunnelDataItem[] | undefined): number => {
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
      
      total += item.mqls * fraction;
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
  const useExpansaoData = hasSingleBU && selectedBUsArray[0] === 'franquia';
  const useO2TaxData = hasSingleBU && selectedBUsArray[0] === 'o2_tax';
  const useOxyHackerData = hasSingleBU && selectedBUsArray[0] === 'oxy_hacker';
  
  // Drill-down is available for all BUs
  const isClickable = true;
  
  // Determine grouping based on period length
  const daysInPeriod = differenceInDays(endDate, startDate) + 1;
  const grouping: ChartGrouping = daysInPeriod <= 31 ? 'daily' : daysInPeriod <= 90 ? 'weekly' : 'monthly';

  // Get grouped data based on selected BU
  const sheetData = useExpansaoData 
    ? getExpansaoGroupedData('mql', startDate, endDate, grouping)
    : useO2TaxData
    ? getO2TaxGroupedData('mql', startDate, endDate, grouping)
    : useOxyHackerData
    ? getOxyHackerGroupedData('mql', startDate, endDate, grouping)
    : getModeloAtualGroupedData('mql', startDate, endDate, grouping);
  
  // Get total meta from funnelData (Plan Growth) based on selected BUs
  const periodMeta = 
    (includesModeloAtual ? calcularMetaDoPeriodo(funnelData?.modeloAtual) : 0) +
    (includesO2Tax ? calcularMetaDoPeriodo(funnelData?.o2Tax) : 0) +
    (includesOxyHacker ? calcularMetaDoPeriodo(funnelData?.oxyHacker) : 0) +
    (includesFranquia ? calcularMetaDoPeriodo(funnelData?.franquia) : 0);
    
  // Calculate total realized based on selected BUs using first-entry logic
  const getTotalRealized = (): number => {
    let total = 0;
    
    // For Modelo Atual, apply closer filter if active
    if (includesModeloAtual) {
      const cards = modeloAtualAnalytics.getCardsForIndicator('mql');
      if (selectedClosers?.length && selectedClosers.length > 0) {
        const filteredCards = cards.filter(c => {
          const closerValue = (c.closer || '').trim();
          return closerValue && selectedClosers.includes(closerValue);
        });
        total += filteredCards.length;
      } else {
        total += cards.length;
      }
    }
    
    if (includesO2Tax) total += o2TaxAnalytics.getMqlsByRevenue.flatMap(r => r.cards).length;
    if (includesOxyHacker) total += oxyHackerAnalytics.getDetailItemsForIndicator('mql').length;
    if (includesFranquia) total += franquiaAnalytics.getDetailItemsForIndicator('mql').length;
    
    return total;
  };
  
  const totalRealized = getTotalRealized();

  // Build chart data with proper date labels
  const buildChartData = () => {
    if (grouping === 'daily') {
      return eachDayOfInterval({ start: startDate, end: endDate }).map((day, index) => ({
        label: format(day, "d 'de' MMM", { locale: ptBR }),
        mqls: sheetData.qty[index] || 0,
        meta: sheetData.meta[index] || 0,
      }));
    } else if (grouping === 'weekly') {
      const totalDays = differenceInDays(endDate, startDate) + 1;
      const numWeeks = Math.ceil(totalDays / 7);
      return Array.from({ length: numWeeks }, (_, i) => {
        const weekStart = addDays(startDate, i * 7);
        return {
          label: format(weekStart, "d 'de' MMM", { locale: ptBR }),
          mqls: sheetData.qty[i] || 0,
          meta: sheetData.meta[i] || 0,
        };
      });
    } else {
      // Monthly - use actual months from the interval
      const months = eachMonthOfInterval({ start: startDate, end: endDate });
      return months.map((monthDate, index) => ({
        label: format(monthDate, "MMM", { locale: ptBR }),
        mqls: sheetData.qty[index] || 0,
        meta: sheetData.meta[index] || 0,
      }));
    }
  };

  const chartData = buildChartData();

  // Handle click on specific bar - filter by day/week/month
  const handleBarClick = (data: any, index: number) => {
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
      if (useO2TaxData) {
        const mqlCards = o2TaxAnalytics.getMqlsByRevenue;
        allItems = mqlCards.flatMap(r => r.cards).map(o2TaxAnalytics.toDetailItem);
      } else if (useExpansaoData) {
        allItems = franquiaAnalytics.getDetailItemsForIndicator('mql');
      } else if (useOxyHackerData) {
        allItems = oxyHackerAnalytics.getDetailItemsForIndicator('mql');
      } else {
        allItems = modeloAtualAnalytics.getDetailItemsForIndicator('mql');
      }
    } else {
      // Multi-BU: aggregate only selected BUs
      if (includesModeloAtual) {
        allItems = [...allItems, ...modeloAtualAnalytics.getDetailItemsForIndicator('mql')];
      }
      if (includesO2Tax) {
        const o2Items = o2TaxAnalytics.getMqlsByRevenue.flatMap(r => r.cards).map(o2TaxAnalytics.toDetailItem);
        allItems = [...allItems, ...o2Items];
      }
      if (includesFranquia) {
        allItems = [...allItems, ...franquiaAnalytics.getDetailItemsForIndicator('mql')];
      }
      if (includesOxyHacker) {
        allItems = [...allItems, ...oxyHackerAnalytics.getDetailItemsForIndicator('mql')];
      }
    }
    
    // Filter by clicked period
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
    setSheetDescription(`${filteredItems.length} MQLs em ${periodLabel}`);
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

  return (
    <>
      <Card className="bg-card border-2 border-chart-2 relative group">
        {isClickable && (
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-foreground">Qtd MQLs</CardTitle>
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
              <div className="w-3 h-3 rounded-sm bg-chart-2" />
              <span className="text-xs text-muted-foreground">MQLs Realizados</span>
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
                  dataKey="mqls" 
                  fill="hsl(var(--chart-2))" 
                  name="MQLs" 
                  radius={[4, 4, 0, 0]}
                  onClick={handleBarClick}
                  cursor={isClickable ? "pointer" : "default"}
                >
                  <LabelList dataKey="mqls" position="top" fill="hsl(var(--muted-foreground))" fontSize={10} formatter={(v: number) => v > 0 ? v : ''} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      
      <DetailSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title="MQLs"
        description={sheetDescription || `${formatNumber(totalRealized)} MQLs no período selecionado`}
        items={sheetItems}
        columns={[
          { key: 'name', label: 'Título' },
          { key: 'company', label: 'Empresa' },
          { key: 'phase', label: 'Fase', format: columnFormatters.phase },
          { key: 'date', label: 'Data', format: columnFormatters.date },
          { key: 'revenueRange', label: 'Faixa Faturamento' },
        ]}
      />
    </>
  );
}
