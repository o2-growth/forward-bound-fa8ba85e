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
import { useFunnelMetas } from "@/hooks/useFunnelMetas";
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
  
  // Get funnelData from MediaMetasContext for dynamic metas (Plan Growth ao vivo - fallback)
  const { funnelData } = useMediaMetas();
  // Get DB funnel_metas (fonte estável - prioritária)
  const { funnelMetas: dbFunnelMetas } = useFunnelMetas(2026);

  // Helper function to calculate MQL meta for a given period (pro-rated for partial months).
  // Regra de fonte da verdade:
  //   - mês LOCKED em funnel_metas → DB (snapshot oficial congelado)
  //   - mês aberto → Plan Growth ao vivo (funnelItems), pois o DB pode estar stale.
  const calcularMetaDoPeriodo = (bu: string, funnelItems: FunnelDataItem[] | undefined): number => {
    const monthsInPeriod = eachMonthOfInterval({ start: startDate, end: endDate });
    let total = 0;
    
    for (const monthDate of monthsInPeriod) {
      const monthName = monthNames[getMonth(monthDate)];

      // 🎯 DB só vence se o mês estiver locked
      const dbRow = dbFunnelMetas.find(m => m.bu === bu && m.month === monthName);
      const isLocked = dbRow?.is_locked === true;
      const item = funnelItems?.find(f => f.month === monthName);

      let baseValue: number | null = null;
      if (isLocked && typeof dbRow?.mqls === 'number') {
        baseValue = dbRow.mqls;
      } else if (item) {
        baseValue = item.mqls;
      }
      if (baseValue === null) continue;

      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      
      const overlapStart = startDate > monthStart ? startDate : monthStart;
      const overlapEnd = endDate < monthEnd ? endDate : monthEnd;
      
      if (overlapStart > overlapEnd) continue;
      
      const overlapDays = differenceInDays(overlapEnd, overlapStart) + 1;
      const daysInMonth = differenceInDays(monthEnd, monthStart) + 1;
      const fraction = daysInMonth > 0 ? overlapDays / daysInMonth : 0;
      
      total += baseValue * fraction;
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

  // Get total meta from funnelData (Plan Growth) based on selected BUs
  const periodMeta = 
    (includesModeloAtual ? calcularMetaDoPeriodo('modelo_atual', funnelData?.modeloAtual) : 0) +
    (includesO2Tax ? calcularMetaDoPeriodo('o2_tax', funnelData?.o2Tax) : 0) +
    (includesOxyHacker ? calcularMetaDoPeriodo('oxy_hacker', funnelData?.oxyHacker) : 0) +
    (includesFranquia ? calcularMetaDoPeriodo('franquia', funnelData?.franquia) : 0);

  // ─── Unified source: aggregate MQL items from analytics hooks for selected BUs ───
  // (mesma fonte do header Realizado — respeita regras de MQL por faturamento, dedup,
  // exclusão de test cards, First Entry e filtro de closer)
  const collectMqlItems = (): DetailItem[] => {
    const items: DetailItem[] = [];
    if (includesModeloAtual) {
      let modeloItems = modeloAtualAnalytics.getDetailItemsForIndicator('mql');
      if (selectedClosers?.length) {
        modeloItems = modeloItems.filter((it: any) => {
          const closer = (it.closer || '').trim();
          return closer && selectedClosers.includes(closer);
        });
      }
      items.push(...modeloItems);
    }
    if (includesO2Tax) {
      const o2Items = o2TaxAnalytics.getMqlsByRevenue
        .flatMap(r => r.cards)
        .map(o2TaxAnalytics.toDetailItem);
      items.push(...o2Items);
    }
    if (includesFranquia) items.push(...franquiaAnalytics.getDetailItemsForIndicator('mql'));
    if (includesOxyHacker) items.push(...oxyHackerAnalytics.getDetailItemsForIndicator('mql'));
    return items;
  };

  const allMqlItems = collectMqlItems();

  // Total realized derived from the SAME source that feeds the bars — garante paridade
  const totalRealized = allMqlItems.length;

  // Build chart data with proper date labels, bucketing items by grouping
  const buildChartData = () => {
    if (grouping === 'daily') {
      const days = eachDayOfInterval({ start: startDate, end: endDate });
      const buckets = days.map(() => 0);
      for (const it of allMqlItems) {
        if (!it.date) continue;
        const d = new Date(it.date);
        const idx = days.findIndex(day => isSameDay(day, d));
        if (idx >= 0) buckets[idx] += 1;
      }
      return days.map((day, i) => ({
        label: format(day, "d 'de' MMM", { locale: ptBR }),
        mqls: buckets[i],
        meta: 0,
      }));
    } else if (grouping === 'weekly') {
      const totalDays = differenceInDays(endDate, startDate) + 1;
      const numWeeks = Math.ceil(totalDays / 7);
      const buckets = Array.from({ length: numWeeks }, () => 0);
      for (const it of allMqlItems) {
        if (!it.date) continue;
        const d = new Date(it.date);
        const diff = differenceInDays(d, startDate);
        if (diff < 0) continue;
        const idx = Math.floor(diff / 7);
        if (idx >= 0 && idx < numWeeks) buckets[idx] += 1;
      }
      return Array.from({ length: numWeeks }, (_, i) => {
        const weekStart = addDays(startDate, i * 7);
        return {
          label: format(weekStart, "d 'de' MMM", { locale: ptBR }),
          mqls: buckets[i],
          meta: 0,
        };
      });
    } else {
      const months = eachMonthOfInterval({ start: startDate, end: endDate });
      const buckets = months.map(() => 0);
      for (const it of allMqlItems) {
        if (!it.date) continue;
        const d = new Date(it.date);
        const idx = months.findIndex(m => isSameMonth(m, d));
        if (idx >= 0) buckets[idx] += 1;
      }
      return months.map((monthDate, i) => ({
        label: format(monthDate, "MMM", { locale: ptBR }),
        mqls: buckets[i],
        meta: 0,
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
