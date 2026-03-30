import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useModeloAtualMetas } from "@/hooks/useModeloAtualMetas";
import { useExpansaoMetas } from "@/hooks/useExpansaoMetas";
import { useO2TaxMetas } from "@/hooks/useO2TaxMetas";
import { useOxyHackerMetas } from "@/hooks/useOxyHackerMetas";
// useLeadsMetas removed - now using useModeloAtualMetas for leads
import { useModeloAtualAnalytics } from "@/hooks/useModeloAtualAnalytics";
import { useO2TaxAnalytics } from "@/hooks/useO2TaxAnalytics";
import { useExpansaoAnalytics } from "@/hooks/useExpansaoAnalytics";
import { BUType, IndicatorType } from "@/hooks/useFunnelRealized";
import { DetailSheet, DetailItem, columnFormatters } from "./indicators/DetailSheet";
import { KpiItem } from "./indicators/KpiCard";
import { ChartConfig } from "./indicators/DrillDownCharts";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

const formatCompactCurrency = (value: number): string => {
  if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(0)}k`;
  return `R$ ${Math.round(value)}`;
};

interface ClickableFunnelChartProps {
  startDate: Date;
  endDate: Date;
  selectedBU: BUType | 'all';
  selectedBUs?: BUType[];
  selectedClosers?: string[];
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

export function ClickableFunnelChart({ startDate, endDate, selectedBU, selectedBUs, selectedClosers }: ClickableFunnelChartProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetTitle, setSheetTitle] = useState('');
  const [sheetDescription, setSheetDescription] = useState('');
  const [sheetItems, setSheetItems] = useState<DetailItem[]>([]);
  const [sheetColumns, setSheetColumns] = useState<{ key: keyof DetailItem; label: string; format?: (value: any) => React.ReactNode }[]>([]);
  const [sheetKpis, setSheetKpis] = useState<KpiItem[]>([]);
  const [sheetCharts, setSheetCharts] = useState<ChartConfig[]>([]);

  const { getQtyForPeriod: getModeloAtualQty, getValueForPeriod: getModeloAtualValue } = useModeloAtualMetas(startDate, endDate);
  const { getQtyForPeriod: getExpansaoQty, getValueForPeriod: getExpansaoValue } = useExpansaoMetas(startDate, endDate);
  const { getQtyForPeriod: getO2TaxQty, getValueForPeriod: getO2TaxValue } = useO2TaxMetas(startDate, endDate);
  const { getQtyForPeriod: getOxyHackerQty, getValueForPeriod: getOxyHackerValue } = useOxyHackerMetas(startDate, endDate);
  
  
  // Analytics hooks for drill-down
  const modeloAtualAnalytics = useModeloAtualAnalytics(startDate, endDate);
  const o2TaxAnalytics = useO2TaxAnalytics(startDate, endDate);
  const franquiaAnalytics = useExpansaoAnalytics(startDate, endDate, 'Franquia');
  const oxyHackerAnalytics = useExpansaoAnalytics(startDate, endDate, 'Oxy Hacker');
  
  // Derive which BUs are included from selectedBUs array (or fallback to selectedBU)
  const selectedBUsArray = selectedBUs || (selectedBU === 'all' 
    ? ['modelo_atual', 'o2_tax', 'oxy_hacker', 'franquia'] as BUType[]
    : [selectedBU]);
  
  const includesModeloAtual = selectedBUsArray.includes('modelo_atual');
  const includesO2Tax = selectedBUsArray.includes('o2_tax');
  const includesOxyHacker = selectedBUsArray.includes('oxy_hacker');
  const includesFranquia = selectedBUsArray.includes('franquia');
  
  // Check if single BU selected for drill-down routing
  const hasSingleBU = selectedBUsArray.length === 1;
  const useExpansaoData = hasSingleBU && selectedBUsArray[0] === 'franquia';
  const useO2TaxData = hasSingleBU && selectedBUsArray[0] === 'o2_tax';
  const useOxyHackerData = hasSingleBU && selectedBUsArray[0] === 'oxy_hacker';
  const useConsolidado = selectedBUsArray.length > 1;
  
  // Get leads data from the same database source as charts (Modelo Atual)
  const leadsQty = getModeloAtualQty('leads', startDate, endDate);
  const o2TaxLeadsQty = getO2TaxQty('leads', startDate, endDate);
  const oxyHackerLeadsQty = getOxyHackerQty('leads', startDate, endDate);
  const franquiaLeadsQty = getExpansaoQty('leads', startDate, endDate);
  
  // Helper to get qty for Modelo Atual - ALWAYS uses analytics for "first entry" logic
  const getFilteredModeloAtualQty = (indicator: IndicatorType): number => {
    const cards = modeloAtualAnalytics.getCardsForIndicator(indicator);
    
    // Apply closer filter if active
    if (selectedClosers?.length && selectedClosers.length > 0) {
      const filteredCards = cards.filter(c => {
        const closerValue = (c.closer || '').trim();
        return closerValue && selectedClosers.includes(closerValue);
      });
      return filteredCards.length;
    }
    
    return cards.length;
  };

  // Helper to get filtered value for Modelo Atual when closers filter is active
  const getFilteredModeloAtualValue = (indicator: 'proposta' | 'venda'): number => {
    if (selectedClosers?.length && selectedClosers.length > 0) {
      const cards = modeloAtualAnalytics.getCardsForIndicator(indicator);
      const filteredCards = cards.filter(c => {
        const closerValue = (c.closer || '').trim();
        return closerValue && selectedClosers.includes(closerValue);
      });
      return filteredCards.reduce((sum, card) => sum + card.valor, 0);
    }
    return getModeloAtualValue(indicator, startDate, endDate);
  };

  // Get totals based on selected BUs array - using analytics hooks for "first entry" consistency
  const getO2TaxAnalyticsQty = (indicator: IndicatorType): number => {
    if (indicator === 'leads') {
      return o2TaxAnalytics.getDetailItemsForIndicator('leads').length;
    }
    if (indicator === 'mql') {
      return o2TaxAnalytics.getMqlsByRevenue.flatMap(r => r.cards).length;
    }
    return o2TaxAnalytics.getDetailItemsForIndicator(indicator).length;
  };
  
  const getOxyHackerAnalyticsQty = (indicator: IndicatorType): number => {
    return oxyHackerAnalytics.getDetailItemsForIndicator(indicator).length;
  };
  
  const getFranquiaAnalyticsQty = (indicator: IndicatorType): number => {
    return franquiaAnalytics.getDetailItemsForIndicator(indicator).length;
  };
  
  const totals = {
    leads: (includesModeloAtual ? getFilteredModeloAtualQty('leads') : 0) + 
           (includesO2Tax ? getO2TaxAnalyticsQty('leads') : 0) + 
           (includesOxyHacker ? getOxyHackerAnalyticsQty('leads') : 0) + 
           (includesFranquia ? getFranquiaAnalyticsQty('leads') : 0),
    mql: (includesModeloAtual ? getFilteredModeloAtualQty('mql') : 0) + 
         (includesO2Tax ? getO2TaxAnalyticsQty('mql') : 0) + 
         (includesOxyHacker ? getOxyHackerAnalyticsQty('mql') : 0) + 
         (includesFranquia ? getFranquiaAnalyticsQty('mql') : 0),
    rm: (includesModeloAtual ? getFilteredModeloAtualQty('rm') : 0) + 
        (includesO2Tax ? getO2TaxAnalyticsQty('rm') : 0) + 
        (includesOxyHacker ? getOxyHackerAnalyticsQty('rm') : 0) + 
        (includesFranquia ? getFranquiaAnalyticsQty('rm') : 0),
    rr: (includesModeloAtual ? getFilteredModeloAtualQty('rr') : 0) + 
        (includesO2Tax ? getO2TaxAnalyticsQty('rr') : 0) + 
        (includesOxyHacker ? getOxyHackerAnalyticsQty('rr') : 0) + 
        (includesFranquia ? getFranquiaAnalyticsQty('rr') : 0),
    proposta: (includesModeloAtual ? getFilteredModeloAtualQty('proposta') : 0) + 
              (includesO2Tax ? getO2TaxAnalyticsQty('proposta') : 0) + 
              (includesOxyHacker ? getOxyHackerAnalyticsQty('proposta') : 0) + 
              (includesFranquia ? getFranquiaAnalyticsQty('proposta') : 0),
    venda: (includesModeloAtual ? getFilteredModeloAtualQty('venda') : 0) + 
           (includesO2Tax ? getO2TaxAnalyticsQty('venda') : 0) + 
           (includesOxyHacker ? getOxyHackerAnalyticsQty('venda') : 0) + 
           (includesFranquia ? getFranquiaAnalyticsQty('venda') : 0),
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

  // Calculate monetary values based on selected BUs array
  const propostaValue = 
    (includesModeloAtual ? getFilteredModeloAtualValue('proposta') : 0) +
    (includesO2Tax ? getO2TaxValue('proposta', startDate, endDate) : 0) +
    (includesOxyHacker ? getOxyHackerValue('proposta', startDate, endDate) : 0) +
    (includesFranquia ? getExpansaoValue('proposta', startDate, endDate) : 0);

  const vendaValue = 
    (includesModeloAtual ? getFilteredModeloAtualValue('venda') : 0) +
    (includesO2Tax ? getO2TaxValue('venda', startDate, endDate) : 0) +
    (includesOxyHacker ? getOxyHackerValue('venda', startDate, endDate) : 0) +
    (includesFranquia ? getExpansaoValue('venda', startDate, endDate) : 0);

  // Width percentages for funnel visualization (6 stages now)
  const widthPercentages = [100, 85, 70, 55, 45, 35];

  // Colors for each stage
  const stageColors = [
    'from-orange-400 to-orange-500',
    'from-emerald-400 to-cyan-500',
    'from-cyan-500 to-blue-500',
    'from-blue-500 to-blue-600',
    'from-blue-600 to-slate-500',
    'from-slate-500 to-slate-600',
  ];

  // Get columns for indicator type
  const getColumnsForIndicator = (indicator: IndicatorType) => {
    // For venda (sales), include SDR and Data Assinatura columns
    if (indicator === 'venda') {
      return [
        { key: 'product' as keyof DetailItem, label: 'Produto', format: columnFormatters.product },
        { key: 'name' as keyof DetailItem, label: 'Título' },
        { key: 'company' as keyof DetailItem, label: 'Empresa/Contato' },
        { key: 'dataAssinatura' as keyof DetailItem, label: 'Data Assinatura', format: columnFormatters.date },
        { key: 'mrr' as keyof DetailItem, label: 'MRR', format: columnFormatters.currency },
        { key: 'setup' as keyof DetailItem, label: 'Setup', format: columnFormatters.currency },
        { key: 'pontual' as keyof DetailItem, label: 'Pontual', format: columnFormatters.currency },
        { key: 'value' as keyof DetailItem, label: 'Total', format: columnFormatters.currency },
        { key: 'sdr' as keyof DetailItem, label: 'SDR' },
        { key: 'responsible' as keyof DetailItem, label: 'Closer' },
      ];
    }
    
    return [
      { key: 'product' as keyof DetailItem, label: 'Produto', format: columnFormatters.product },
      { key: 'name' as keyof DetailItem, label: 'Título' },
      { key: 'company' as keyof DetailItem, label: 'Empresa/Contato' },
      { key: 'date' as keyof DetailItem, label: 'Data', format: columnFormatters.date },
      { key: 'mrr' as keyof DetailItem, label: 'MRR', format: columnFormatters.currency },
      { key: 'setup' as keyof DetailItem, label: 'Setup', format: columnFormatters.currency },
      { key: 'pontual' as keyof DetailItem, label: 'Pontual', format: columnFormatters.currency },
      { key: 'value' as keyof DetailItem, label: 'Total', format: columnFormatters.currency },
      { key: 'responsible' as keyof DetailItem, label: 'Responsável' },
    ];
  };

  // Get detail items for an indicator based on selected BU
  const getItemsForIndicator = (indicator: IndicatorType): DetailItem[] => {
    // For Franquia
    if (useExpansaoData) {
      return franquiaAnalytics.getDetailItemsForIndicator(indicator);
    }

    // For Oxy Hacker
    if (useOxyHackerData) {
      return oxyHackerAnalytics.getDetailItemsForIndicator(indicator);
    }

    // For O2 TAX - use analytics hook directly (now supports all indicators with date filtering)
    if (useO2TaxData) {
      return o2TaxAnalytics.getDetailItemsForIndicator(indicator);
    }

    // For Modelo Atual or Consolidado (use Modelo Atual data)
    if (selectedBU === 'modelo_atual' || useConsolidado) {
      // Get cards and filter by closer field specifically
      let items: DetailItem[];
      if (selectedClosers?.length && selectedClosers.length > 0) {
        const cards = modeloAtualAnalytics.getCardsForIndicator(indicator);
        const filteredCards = cards.filter(c => {
          const closerValue = (c.closer || '').trim();
          return closerValue && selectedClosers.includes(closerValue);
        });
        items = filteredCards.map(modeloAtualAnalytics.toDetailItem);
      } else {
        items = modeloAtualAnalytics.getDetailItemsForIndicator(indicator);
      }
      
      // For consolidado, also add items from all BUs
      if (useConsolidado) {
        // For leads, only Modelo Atual and O2 TAX have data
        if (indicator === 'leads') {
          const o2TaxLeadsItems = o2TaxAnalytics.getDetailItemsForIndicator('leads');
          return [...items, ...o2TaxLeadsItems];
        }
        const o2TaxPhaseMap: Record<string, string> = {
          'mql': 'MQL',
          'rm': 'RM',
          'rr': 'RR',
          'proposta': 'Proposta',
          'venda': 'Ganho',
        };
        
        // O2 TAX items
        let o2TaxItems: DetailItem[] = [];
        if (indicator === 'venda') {
          o2TaxItems = o2TaxAnalytics.getDealsWon.cards.map(o2TaxAnalytics.toDetailItem);
        } else {
          const phaseData = o2TaxAnalytics.getCardsByPhase.find(p => p.phase === o2TaxPhaseMap[indicator]);
          o2TaxItems = phaseData?.cards.map(o2TaxAnalytics.toDetailItem) ?? [];
        }
        
        // Franquia items
        const franquiaItems = franquiaAnalytics.getDetailItemsForIndicator(indicator);
        
        // Oxy Hacker items
        const oxyHackerItems = oxyHackerAnalytics.getDetailItemsForIndicator(indicator);
        
        return [...items, ...o2TaxItems, ...franquiaItems, ...oxyHackerItems];
      }
      
      return items;
    }

    return [];
  };

  // Helper to build proposta mini-dashboard
  const buildPropostaMiniDashboard = () => {
    const items = getItemsForIndicator('proposta');
    const now = new Date();
    
    const itemsWithAging = items.map(item => {
      const entryDate = item.date ? new Date(item.date) : now;
      const diasEmProposta = Math.floor((now.getTime() - entryDate.getTime()) / 86400000);
      return { ...item, diasEmProposta };
    });
    
    // For Oxy Hacker / Franquia, use pontual (Taxa de franquia) instead of value
    const isExpansaoBU = useExpansaoData || useOxyHackerData;
    const getItemValue = (item: DetailItem) => isExpansaoBU ? (item.pontual || 0) : (item.value || 0);
    
    const pipeline = items.reduce((sum, i) => sum + getItemValue(i), 0);
    const ticketMedio = items.length > 0 ? pipeline / items.length : 0;
    const propostasAntigas = itemsWithAging.filter(i => (i.diasEmProposta || 0) > 14);
    const valorEmRisco = propostasAntigas.reduce((sum, i) => sum + getItemValue(i), 0);
    
    // KPIs - for expansion BUs, show "Valor Pontual" instead of "Pipeline"
    const kpis: KpiItem[] = [
      { icon: '📊', value: items.length, label: 'Propostas', highlight: 'neutral' },
      { icon: '💰', value: formatCompactCurrency(pipeline), label: isExpansaoBU ? 'Valor Pontual' : 'Pipeline', highlight: 'neutral' },
      { icon: '🎯', value: formatCompactCurrency(ticketMedio), label: 'Ticket Médio', highlight: 'neutral' },
      { icon: '⚠️', value: propostasAntigas.length, label: 'Envelhecidas', highlight: propostasAntigas.length > 0 ? 'warning' : 'success' },
      { icon: '🔴', value: formatCompactCurrency(valorEmRisco), label: 'em Risco', highlight: valorEmRisco > 0 ? 'danger' : 'success' },
    ];
    
    // Charts - Pipeline por Closer (use pontual for expansion BUs)
    const closerTotals = new Map<string, number>();
    itemsWithAging.forEach(i => {
      const closer = i.responsible || i.closer || 'Sem Closer';
      closerTotals.set(closer, (closerTotals.get(closer) || 0) + getItemValue(i));
    });
    const pipelineByCloserData = Array.from(closerTotals.entries())
      .map(([label, value]) => ({ label: label.split(' ')[0], value }))
      .sort((a, b) => b.value - a.value);
    
    // Charts - Aging das Propostas
    const agingDistribution = [
      { label: '0-7 dias', value: itemsWithAging.filter(i => (i.diasEmProposta || 0) <= 7).length, highlight: 'success' as const },
      { label: '8-14 dias', value: itemsWithAging.filter(i => (i.diasEmProposta || 0) > 7 && (i.diasEmProposta || 0) <= 14).length, highlight: 'neutral' as const },
      { label: '15-30 dias', value: itemsWithAging.filter(i => (i.diasEmProposta || 0) > 14 && (i.diasEmProposta || 0) <= 30).length, highlight: 'warning' as const },
      { label: '30+ dias', value: itemsWithAging.filter(i => (i.diasEmProposta || 0) > 30).length, highlight: 'danger' as const },
    ];
    
    const charts: ChartConfig[] = [
      { type: 'bar', title: 'Pipeline por Closer', data: pipelineByCloserData, formatValue: formatCompactCurrency },
      { type: 'distribution', title: 'Aging das Propostas', data: agingDistribution },
    ];
    
    setSheetKpis(kpis);
    setSheetCharts(charts);
    setSheetTitle('Propostas - Onde o Pipeline Está Travando?');
    setSheetDescription(
      `${items.length} propostas | Pipeline: ${formatCompactCurrency(pipeline)} | Ticket médio: ${formatCompactCurrency(ticketMedio)}` +
      (propostasAntigas.length > 0 
        ? ` | ⚠️ ${propostasAntigas.length} com mais de 14 dias (${formatCompactCurrency(valorEmRisco)} em risco)` 
        : ' | ✅ Nenhuma envelhecida')
    );
    // Columns - for expansion BUs, remove MRR and rename "Valor Total" to "Valor Pontual"
    const propostaColumns = isExpansaoBU
      ? [
          { key: 'product' as keyof DetailItem, label: 'Produto', format: columnFormatters.product },
          { key: 'company' as keyof DetailItem, label: 'Empresa' },
          { key: 'pontual' as keyof DetailItem, label: 'Valor Pontual', format: columnFormatters.currency },
          { key: 'responsible' as keyof DetailItem, label: 'Closer' },
          { key: 'diasEmProposta' as keyof DetailItem, label: 'Dias em Proposta', format: columnFormatters.agingWithAlert },
          { key: 'date' as keyof DetailItem, label: 'Data Envio', format: columnFormatters.date },
        ]
      : [
          { key: 'product' as keyof DetailItem, label: 'Produto', format: columnFormatters.product },
          { key: 'company' as keyof DetailItem, label: 'Empresa' },
          { key: 'value' as keyof DetailItem, label: 'Valor Total', format: columnFormatters.currency },
          { key: 'mrr' as keyof DetailItem, label: 'MRR', format: columnFormatters.currency },
          { key: 'responsible' as keyof DetailItem, label: 'Closer' },
          { key: 'diasEmProposta' as keyof DetailItem, label: 'Dias em Proposta', format: columnFormatters.agingWithAlert },
          { key: 'date' as keyof DetailItem, label: 'Data Envio', format: columnFormatters.date },
        ];
    setSheetColumns(propostaColumns);
    setSheetItems(itemsWithAging.sort((a, b) => (b.diasEmProposta || 0) - (a.diasEmProposta || 0)));
    setSheetOpen(true);
  };

  // Helper to build venda mini-dashboard with TCV
  const buildVendaMiniDashboard = () => {
    const items = getItemsForIndicator('venda');
    
    // Calcular métricas totais
    const totalMRR = items.reduce((sum, i) => sum + (i.mrr || 0), 0);
    const totalSetup = items.reduce((sum, i) => sum + (i.setup || 0), 0);
    const totalPontual = items.reduce((sum, i) => sum + (i.pontual || 0), 0);
    
    // TCV = (MRR × 12) + Setup + Pontual
    const tcv = (totalMRR * 12) + totalSetup + totalPontual;
    const ticketMedioTCV = items.length > 0 ? tcv / items.length : 0;
    
    // KPIs
    const kpis: KpiItem[] = [
      { icon: '📋', value: items.length, label: 'Vendas', highlight: 'neutral' },
      { icon: '💵', value: formatCompactCurrency(totalSetup), label: 'Setup', highlight: 'neutral' },
      { icon: '🔁', value: formatCompactCurrency(totalMRR), label: 'MRR', highlight: 'neutral' },
      { icon: '⚡', value: formatCompactCurrency(totalPontual), label: 'Pontual', highlight: 'neutral' },
      { icon: '📊', value: formatCompactCurrency(tcv), label: 'TCV', highlight: 'success' },
    ];
    
    // Charts - TCV por Closer
    const closerTotals = new Map<string, number>();
    items.forEach(i => {
      const closer = i.responsible || i.closer || 'Sem Closer';
      const itemTCV = ((i.mrr || 0) * 12) + (i.setup || 0) + (i.pontual || 0);
      closerTotals.set(closer, (closerTotals.get(closer) || 0) + itemTCV);
    });
    const tcvByCloserData = Array.from(closerTotals.entries())
      .map(([label, value]) => ({ label: label.split(' ')[0], value }))
      .sort((a, b) => b.value - a.value);
    
    // Charts - TCV por Produto
    const productTotals = new Map<string, number>();
    items.forEach(i => {
      const product = i.product || 'Outros';
      const itemTCV = ((i.mrr || 0) * 12) + (i.setup || 0) + (i.pontual || 0);
      productTotals.set(product, (productTotals.get(product) || 0) + itemTCV);
    });
    const tcvByProductData = Array.from(productTotals.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
    
    // TCV por Closer + Tier de Faturamento
    const closerTierTotals = new Map<string, number>();
    items.forEach(i => {
      const closer = (i.responsible || i.closer || 'Sem Closer').split(' ')[0];
      const tier = i.revenueRange || 'Não informado';
      if (tier === 'Não informado') return;
      const key = `${closer} - ${tier}`;
      const itemTCV = ((i.mrr || 0) * 12) + (i.setup || 0) + (i.pontual || 0);
      closerTierTotals.set(key, (closerTierTotals.get(key) || 0) + itemTCV);
    });
    const closerTierData = Array.from(closerTierTotals.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
    
    // TCV por SDR + Tier de Faturamento
    const sdrTierTotals = new Map<string, number>();
    items.forEach(i => {
      const sdr = (i.sdr || 'Sem SDR').split(' ')[0];
      const tier = i.revenueRange || 'Não informado';
      if (tier === 'Não informado') return;
      const key = `${sdr} - ${tier}`;
      const itemTCV = ((i.mrr || 0) * 12) + (i.setup || 0) + (i.pontual || 0);
      sdrTierTotals.set(key, (sdrTierTotals.get(key) || 0) + itemTCV);
    });
    const sdrTierData = Array.from(sdrTierTotals.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
    
    const charts: ChartConfig[] = [
      { type: 'bar', title: 'TCV por Closer', data: tcvByCloserData, formatValue: formatCompactCurrency },
      { type: 'pie', title: 'TCV por Produto', data: tcvByProductData, formatValue: formatCompactCurrency },
      ...(closerTierData.length > 0 ? [{ 
        type: 'bar' as const, 
        title: 'TCV por Tier - Closer', 
        data: closerTierData, 
        formatValue: formatCompactCurrency 
      }] : []),
      ...(sdrTierData.length > 0 ? [{ 
        type: 'bar' as const, 
        title: 'TCV por Tier - SDR', 
        data: sdrTierData, 
        formatValue: formatCompactCurrency 
      }] : []),
    ];
    
    // Adicionar TCV calculado a cada item para exibição na tabela
    const itemsWithTCV = items.map(item => ({
      ...item,
      value: ((item.mrr || 0) * 12) + (item.setup || 0) + (item.pontual || 0),
    }));
    
    setSheetKpis(kpis);
    setSheetCharts(charts);
    setSheetTitle('Contratos Assinados - Análise de Valor');
    setSheetDescription(
      `${items.length} contratos | TCV: ${formatCompactCurrency(tcv)} | ` +
      `MRR: ${formatCompactCurrency(totalMRR)} | Setup: ${formatCompactCurrency(totalSetup)} | ` +
      `Pontual: ${formatCompactCurrency(totalPontual)} | Ticket médio TCV: ${formatCompactCurrency(ticketMedioTCV)}`
    );
    
    setSheetColumns([
      { key: 'product', label: 'Produto', format: columnFormatters.product },
      { key: 'company', label: 'Empresa' },
      { key: 'dataAssinatura', label: 'Data Assinatura', format: columnFormatters.date },
      { key: 'mrr', label: 'MRR', format: columnFormatters.currency },
      { key: 'setup', label: 'Setup', format: columnFormatters.currency },
      { key: 'pontual', label: 'Pontual', format: columnFormatters.currency },
      { key: 'value', label: 'TCV', format: columnFormatters.currency },
      { key: 'sdr', label: 'SDR' },
      { key: 'responsible', label: 'Closer' },
    ]);
    setSheetItems(itemsWithTCV.sort((a, b) => (b.value || 0) - (a.value || 0)));
    setSheetOpen(true);
  };

  // Handle stage click
  const handleStageClick = (stage: FunnelStage) => {
    if (stage.value === 0) {
      return;
    }
    
    // Se for proposta, usar mini-dashboard
    if (stage.indicator === 'proposta') {
      buildPropostaMiniDashboard();
      return;
    }
    
    // Se for venda, usar mini-dashboard com TCV
    if (stage.indicator === 'venda') {
      buildVendaMiniDashboard();
      return;
    }
    
    const items = getItemsForIndicator(stage.indicator);
    const columns = getColumnsForIndicator(stage.indicator);
    
    setSheetKpis([]);
    setSheetCharts([]);
    setSheetTitle(`${stage.name}`);
    setSheetDescription(`${formatNumber(stage.value)} registros no período selecionado`);
    setSheetItems(items);
    setSheetColumns(columns);
    setSheetOpen(true);
  };

  // Handle monetary value click
  const handleMonetaryClick = (type: 'proposta' | 'venda', value: number) => {
    // Se for proposta, usar mini-dashboard
    if (type === 'proposta') {
      buildPropostaMiniDashboard();
      return;
    }
    
    // Se for venda, usar mini-dashboard com TCV
    if (type === 'venda') {
      buildVendaMiniDashboard();
      return;
    }
  };

  return (
    <>
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-foreground">Funil do Período</CardTitle>
          <div className="grid grid-cols-2 gap-4 mt-3">
            <div 
              className="bg-muted/50 rounded-lg p-3 text-center cursor-pointer hover:bg-muted/70 transition-colors group relative"
              onClick={() => handleMonetaryClick('proposta', propostaValue)}
            >
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <ExternalLink className="h-3 w-3 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground mb-1">Proposta Enviada</p>
              <p className="text-lg font-bold text-foreground">{formatCurrency(propostaValue)}</p>
            </div>
            <div 
              className="bg-muted/50 rounded-lg p-3 text-center cursor-pointer hover:bg-muted/70 transition-colors group relative"
              onClick={() => handleMonetaryClick('venda', vendaValue)}
            >
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <ExternalLink className="h-3 w-3 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground mb-1">Contratos Assinados</p>
              <p className="text-lg font-bold text-foreground">{formatCurrency(vendaValue)}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex flex-col gap-1">
            {stages.map((stage, index) => (
              <div key={stage.indicator} className="relative flex items-center justify-center">
                <div
                  className={cn(
                    `relative h-14 bg-gradient-to-r ${stageColors[index]} rounded-sm transition-all duration-300 flex items-center justify-center px-3 min-w-[180px] cursor-pointer hover:opacity-90 group`,
                    index === stages.length - 1 && 'ring-2 ring-pink-500 ring-offset-2 ring-offset-background'
                  )}
                  style={{ width: `${widthPercentages[index]}%` }}
                  onClick={() => handleStageClick(stage)}
                >
                  <div className="absolute top-1 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ExternalLink className="h-3 w-3 text-white/70" />
                  </div>
                  <div className="flex items-center gap-2 text-white text-sm font-medium whitespace-nowrap overflow-hidden">
                    <span className="bg-white/20 rounded-full w-5 h-5 flex-shrink-0 flex items-center justify-center text-xs">
                      {stage.number}
                    </span>
                    <span className="hidden sm:inline truncate">{stage.name}</span>
                    <span className="font-bold flex-shrink-0">{formatNumber(stage.value)}</span>
                    {index > 0 && stage.value > 0 && (
                      <span className="text-xs text-white/70 flex-shrink-0">
                        ({stage.conversionPercent.toFixed(0)}%)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

        </CardContent>
      </Card>

      <DetailSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title={sheetTitle}
        description={sheetDescription}
        items={sheetItems}
        columns={sheetColumns}
        kpis={sheetKpis}
        charts={sheetCharts}
      />
    </>
  );
}
