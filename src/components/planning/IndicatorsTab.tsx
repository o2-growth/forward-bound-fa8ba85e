import { useState, useMemo, useEffect, lazy, Suspense, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Line, ComposedChart, RadialBarChart, RadialBar, PolarAngleAxis } from "recharts";
import { RefreshCw, Loader2, BarChart3, TrendingUp, ExternalLink, ChevronDown, ChevronUp, AlertTriangle, Search } from "lucide-react";
import { useFunnelRealized, IndicatorType, BUType } from "@/hooks/useFunnelRealized";
import { useModeloAtualMetas, ChartGrouping, ModeloAtualIndicator } from "@/hooks/useModeloAtualMetas";
import { useExpansaoMetas, ExpansaoIndicator } from "@/hooks/useExpansaoMetas";
import { useO2TaxMetas, O2TaxIndicator } from "@/hooks/useO2TaxMetas";
import { useOxyHackerMetas, OxyHackerIndicator } from "@/hooks/useOxyHackerMetas";
import { useMediaMetas } from "@/contexts/MediaMetasContext";
import { useConsolidatedMetas, ConsolidatedMetricType } from "@/hooks/useConsolidatedMetas";
import { useMrrBase } from "@/hooks/useMrrBase";
import { useModeloAtualAnalytics } from "@/hooks/useModeloAtualAnalytics";
import { useOutboundAnalytics } from "@/hooks/useOutboundAnalytics";
import { useOxyFinance } from "@/hooks/useOxyFinance";
import { useO2TaxAnalytics } from "@/hooks/useO2TaxAnalytics";
import { useExpansaoAnalytics } from "@/hooks/useExpansaoAnalytics";
import { useCloserMetas, BU_CLOSERS, BuType, CloserType } from "@/hooks/useCloserMetas";
import { useSdrMetas } from "@/hooks/useSdrMetas";
import { useFunnelMetas } from "@/hooks/useFunnelMetas";
// Componentes pesados (abaixo do fold) → lazy load com Suspense
const LossAnalysisSection = lazy(() => import("./indicators/LossAnalysisSection").then(m => ({ default: m.LossAnalysisSection })));
import { format, startOfYear, endOfYear, endOfDay, differenceInDays, eachMonthOfInterval, addDays, eachDayOfInterval, getMonth, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { DateRangePickerGA } from "./DateRangePickerGA";
import { FunnelDataItem } from "@/contexts/MediaMetasContext";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { LeadsMqlsStackedChart } from "./LeadsMqlsStackedChart";
import { MeetingsScheduledChart } from "./MeetingsScheduledChart";
import { ClickableFunnelChart } from "./ClickableFunnelChart";
const RevenueChartComparison = lazy(() => import("./RevenueChartComparison").then(m => ({ default: m.RevenueChartComparison })));
const FunnelConversionByTierWidget = lazy(() => import("./indicators/FunnelConversionByTierWidget").then(m => ({ default: m.FunnelConversionByTierWidget })));
import { DetailSheet, DetailItem, columnFormatters, FilterCriteriaGroup } from "./indicators/DetailSheet";
import { KpiItem } from "./indicators/KpiCard";
import { ChartConfig } from "./indicators/DrillDownCharts";
import { TIER_ORDER, normalizeTier } from "@/lib/revenueTiers";
import { MultiSelect, MultiSelectOption } from "@/components/ui/multi-select";
import { classifyLeadSource, LeadSource, LEAD_SOURCE_LABELS } from "@/lib/leadSource";
const RevenuePaceChart = lazy(() => import("./indicators/RevenuePaceChart").then(m => ({ default: m.RevenuePaceChart })));
import { TcvHeroBanner } from "./indicators/TcvHeroBanner";
import { WeeklyComparison, SdrBreakdown, SdrBreakdownWeekly, getWeeksInRange } from "./indicators/WeeklyComparison";
import { PersonRanking } from "./indicators/PersonRanking";
import { TemperaturaSection } from "./indicators/TemperaturaSection";
import { CenarioCaixaSection } from "./indicators/CenarioCaixaSection";
import { MonetizacaoSection } from "./indicators/MonetizacaoSection";
import { useMonetizacaoAnalytics } from "@/hooks/useMonetizacaoAnalytics";
import { CommercialPaceDashboard } from "./indicators/CommercialPaceDashboard";

import { CardInvestigator } from "./indicators/CardInvestigator";

type ViewMode = 'daily' | 'accumulated';

interface IndicatorConfig {
  key: IndicatorType;
  label: string;
  shortLabel: string;
  annualMeta: number;
  useSheetMeta?: boolean; // Flag to use meta from Google Sheets (MQLs)
  useClosersMeta?: boolean; // Flag to use meta from closers sheet (RM, RR, Proposta, Venda)
}

const indicatorConfigs: IndicatorConfig[] = [
  { key: 'mql', label: 'MQLs', shortLabel: 'MQLs', annualMeta: 2400, useSheetMeta: true },
  { key: 'rm', label: 'Reuniões Agendadas', shortLabel: 'Agendadas', annualMeta: 1200, useClosersMeta: true },
  { key: 'rr', label: 'Reuniões Realizadas', shortLabel: 'Realizadas', annualMeta: 960, useClosersMeta: true },
  { key: 'proposta', label: 'Propostas Enviadas', shortLabel: 'Propostas', annualMeta: 480, useClosersMeta: true },
  { key: 'venda', label: 'Vendas', shortLabel: 'Vendas', annualMeta: 240, useClosersMeta: true },
];

// Monetary indicator configuration
type MonetaryIndicatorKey = 'sla' | 'faturamento' | 'mrr' | 'setup' | 'pontual';

interface MonetaryIndicatorConfig {
  key: MonetaryIndicatorKey;
  label: string;
  shortLabel: string;
  format: 'currency' | 'multiplier' | 'duration';
}

const monetaryIndicatorConfigs: MonetaryIndicatorConfig[] = [
  { key: 'sla', label: 'SLA', shortLabel: 'SLA', format: 'duration' },
  { key: 'faturamento', label: 'Fat Incremento', shortLabel: 'Fat Inc.', format: 'currency' },
  { key: 'mrr', label: 'MRR', shortLabel: 'MRR', format: 'currency' },
  { key: 'setup', label: 'Setup', shortLabel: 'Setup', format: 'currency' },
  { key: 'pontual', label: 'Pontual', shortLabel: 'Pont.', format: 'currency' },
];

const buOptions: MultiSelectOption[] = [
  { value: 'modelo_atual', label: 'Modelo Atual' },
  { value: 'o2_tax', label: 'O2 TAX' },
  { value: 'oxy_hacker', label: 'Oxy Hacker' },
  { value: 'franquia', label: 'Franquia' },
];

// SDR mapping by BU (fonte única — mem://team-structure/sdr-bu-assignment)
// Bruna atua tanto como SDR quanto como Closer no time de Franquia.
const BU_SDRS: Record<BuType, string[]> = {
  modelo_atual: ['Amanda', 'Matheus', 'Carlos', 'Erica', 'Ana'],
  o2_tax: ['Carlos'],
  oxy_hacker: ['Amanda', 'Carlos'],
  franquia: ['Amanda', 'Carlos', 'Bruna', 'Kethlin'],
};

// SDR options for MultiSelect
const sdrOptions: MultiSelectOption[] = [
  { value: 'Carlos', label: 'Carlos' },
  { value: 'Erica', label: 'Erica' },
  { value: 'Amanda', label: 'Amanda' },
  { value: 'Matheus', label: 'Matheus' },
  { value: 'Ana', label: 'Ana' },
  { value: 'Bruna', label: 'Bruna (Franquia)' },
  { value: 'Kethlin', label: 'Kethlin (Franquia)' },
];

// Sentinel values to filter cards with empty SDR / Closer
const NO_SDR_VALUE = '__no_sdr__';
const NO_CLOSER_VALUE = '__no_closer__';

const formatNumber = (value: number) => new Intl.NumberFormat("pt-BR").format(Math.round(value));

// Format compact currency (R$ 1.2M, R$ 510k)
const formatCompactCurrency = (value: number): string => {
  if (value >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(0)}k`;
  }
  return `R$ ${Math.round(value)}`;
};

// Builds the "Detalhamento por Produto Contratado" table reused across
// monetary accelerators (Venda / Faturamento / MRR / Setup / Pontual).
type ProdutoBreakdownMetric = 'value' | 'mrr' | 'setup' | 'pontual';
function buildProdutoBreakdown(
  items: DetailItem[],
  metric: ProdutoBreakdownMetric,
): ReactNode {
  type Agg = { produto: string; count: number; mrr: number; setup: number; pontual: number; value: number };
  const produtoMap = new Map<string, Agg>();
  items.forEach(i => {
    const produto = (i.product as string) || 'Não informado';
    const agg = produtoMap.get(produto) || { produto, count: 0, mrr: 0, setup: 0, pontual: 0, value: 0 };
    agg.count += 1;
    agg.mrr += i.mrr || 0;
    agg.setup += i.setup || 0;
    agg.pontual += i.pontual || 0;
    agg.value += i.value || 0;
    produtoMap.set(produto, agg);
  });
  const rows = Array.from(produtoMap.values()).sort((a, b) => (b[metric] || 0) - (a[metric] || 0));
  if (rows.length === 0) return null;

  const totals = rows.reduce(
    (t, r) => ({
      count: t.count + r.count,
      mrr: t.mrr + r.mrr,
      setup: t.setup + r.setup,
      pontual: t.pontual + r.pontual,
      value: t.value + r.value,
    }),
    { count: 0, mrr: 0, setup: 0, pontual: 0, value: 0 },
  );

  const highlightClass = (col: ProdutoBreakdownMetric) =>
    col === metric ? 'font-semibold text-chart-2' : '';

  const valueLabel = metric === 'value' ? 'Total' : metric === 'mrr' ? 'MRR' : metric === 'setup' ? 'Setup' : 'Pontual';

  return (
    <div className="mt-4 border rounded-lg overflow-hidden">
      <div className="px-4 py-2 bg-muted/50 border-b">
        <h4 className="text-sm font-semibold text-foreground">Detalhamento por Produto Contratado</h4>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/30">
            <tr className="text-left text-xs text-muted-foreground">
              <th className="px-3 py-2 font-medium">Produto</th>
              <th className="px-3 py-2 font-medium text-right">Contratos</th>
              <th className="px-3 py-2 font-medium text-right">MRR</th>
              <th className="px-3 py-2 font-medium text-right">Setup</th>
              <th className="px-3 py-2 font-medium text-right">Pontual</th>
              <th className="px-3 py-2 font-medium text-right">Total</th>
              <th className="px-3 py-2 font-medium text-right">{`Ticket Médio (${valueLabel})`}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.produto} className="border-t border-border">
                <td className="px-3 py-2">{columnFormatters.product(row.produto)}</td>
                <td className="px-3 py-2 text-right font-medium">{row.count}</td>
                <td className={`px-3 py-2 text-right ${highlightClass('mrr')}`}>{formatCompactCurrency(row.mrr)}</td>
                <td className={`px-3 py-2 text-right ${highlightClass('setup')}`}>{formatCompactCurrency(row.setup)}</td>
                <td className={`px-3 py-2 text-right ${highlightClass('pontual')}`}>{formatCompactCurrency(row.pontual)}</td>
                <td className={`px-3 py-2 text-right ${highlightClass('value')}`}>{formatCompactCurrency(row.value)}</td>
                <td className="px-3 py-2 text-right">{formatCompactCurrency(row.count > 0 ? (row[metric] || 0) / row.count : 0)}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-border bg-muted/30 font-semibold">
              <td className="px-3 py-2">Total</td>
              <td className="px-3 py-2 text-right">{totals.count}</td>
              <td className={`px-3 py-2 text-right ${highlightClass('mrr')}`}>{formatCompactCurrency(totals.mrr)}</td>
              <td className={`px-3 py-2 text-right ${highlightClass('setup')}`}>{formatCompactCurrency(totals.setup)}</td>
              <td className={`px-3 py-2 text-right ${highlightClass('pontual')}`}>{formatCompactCurrency(totals.pontual)}</td>
              <td className={`px-3 py-2 text-right ${highlightClass('value')}`}>{formatCompactCurrency(totals.value)}</td>
              <td className="px-3 py-2 text-right">{formatCompactCurrency(totals.count > 0 ? (totals[metric] || 0) / totals.count : 0)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Format ROI multiplier (4.2x)
const formatMultiplier = (value: number): string => {
  return `${value.toFixed(1)}x`;
};

// Format duration in hours/minutes (for SLA indicator)
const formatDuration = (minutes: number): string => {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  return `${Math.round(minutes)}m`;
};

// Helper to find top performer from items
const findTopPerformer = (items: DetailItem[], key: 'responsible' | 'closer' | 'sdr'): { name: string; count: number } => {
  const counts = new Map<string, number>();
  items.forEach(item => {
    const value = item[key] || item.responsible || '';
    if (value) counts.set(value, (counts.get(value) || 0) + 1);
  });
  let topName = '-';
  let topCount = 0;
  counts.forEach((count, name) => {
    if (count > topCount) { topName = name; topCount = count; }
  });
  return { name: topName, count: topCount };
};

// Helper to find top performer by revenue
const findTopPerformerByRevenue = (items: DetailItem[]): { name: string; total: number }[] => {
  const totals = new Map<string, number>();
  items.forEach(item => {
    const name = item.responsible || item.closer || '';
    if (name) totals.set(name, (totals.get(name) || 0) + (item.value || 0));
  });
  return Array.from(totals.entries())
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 3);
};

interface RadialProgressCardProps {
  title: string;
  realized: number;
  meta: number;
  onClick?: () => void;
  isClickable?: boolean;
  isLoading?: boolean;
  badge?: string;
}

const RadialProgressCard = ({ title, realized, meta, onClick, isClickable = false, isLoading = false, badge }: RadialProgressCardProps) => {
  const percentage = meta > 0 ? (realized / meta) * 100 : 0;
  
  // Nova lógica: Verde >= 100%, Amarelo 80-99%, Vermelho < 80%
  const getColor = () => {
    if (percentage >= 100) return "hsl(var(--chart-2))"; // Verde
    if (percentage >= 80) return "hsl(45, 93%, 47%)";    // Amarelo
    return "hsl(var(--destructive))";                    // Vermelho
  };
  
  const getTextColorClass = () => {
    if (percentage >= 100) return "text-chart-2";
    if (percentage >= 80) return "text-amber-500";
    return "text-destructive";
  };
  
  const chartData = [{ value: Math.min(percentage, 100), fill: getColor() }];

  return (
    <Card 
      className={cn(
        "bg-card border-border relative group transition-all duration-200",
        isClickable && "cursor-pointer hover:border-primary/50 hover:shadow-md"
      )}
      onClick={onClick}
    >
      {isClickable && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <ExternalLink className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground text-center">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center pt-0">
        {isLoading ? (
          <div className="relative w-32 h-32 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="relative w-32 h-32">
            <RadialBarChart width={128} height={128} innerRadius="70%" outerRadius="100%" data={chartData} startAngle={90} endAngle={-270}>
              <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
              <RadialBar background={{ fill: "hsl(var(--muted))" }} dataKey="value" cornerRadius={10} />
            </RadialBarChart>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-foreground">{formatNumber(realized)}</span>
              <span className={`text-sm font-medium ${getTextColorClass()}`}>{Math.round(percentage)}%</span>
            </div>
          </div>
        )}
        <p className="text-sm text-muted-foreground mt-2">Meta: {formatNumber(meta)}</p>
        {badge && (
          <p className="text-xs text-amber-500 flex items-center gap-1 mt-1">
            <AlertTriangle className="h-3 w-3" />
            {badge}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

interface MonetaryRadialCardProps {
  title: string;
  realized: number;
  meta: number;
  format: 'currency' | 'multiplier' | 'duration';
  onClick?: () => void;
  isClickable?: boolean;
  isLoading?: boolean;
}

const MonetaryRadialCard = ({ title, realized, meta, format, onClick, isClickable = false, isLoading: isLoadingProp = false }: MonetaryRadialCardProps) => {
  // For SLA (duration format), lower is better - invert the color logic
  const isInverted = format === 'duration';
  const percentage = meta > 0 ? (realized / meta) * 100 : 0;
  
  // Tolerância para valores monetários: considera "atingido" se faltar menos de R$ 500
  // ou menos de 0.5% da meta (o que for menor)
  const isCurrencyFormat = format === 'currency';
  const tolerance = isCurrencyFormat ? Math.min(500, meta * 0.005) : 0;
  const isWithinTolerance = isCurrencyFormat && (meta - realized) <= tolerance && (meta - realized) >= 0;
  
  // SLA mantém lógica binária (verde/vermelho)
  // Outros indicadores usam 3 faixas com tolerância
  const getColor = () => {
    if (isInverted) {
      // SLA: menor é melhor
      return percentage <= 100 ? "hsl(var(--chart-2))" : "hsl(var(--destructive))";
    }
    // Outros indicadores monetários - considera verde se >= 100% OU dentro da tolerância
    if (percentage >= 100 || isWithinTolerance) return "hsl(var(--chart-2))"; // Verde
    if (percentage >= 80) return "hsl(45, 93%, 47%)";    // Amarelo
    return "hsl(var(--destructive))";                    // Vermelho
  };
  
  const getTextColorClass = () => {
    if (isInverted) {
      return percentage <= 100 ? "text-chart-2" : "text-destructive";
    }
    if (percentage >= 100 || isWithinTolerance) return "text-chart-2";
    if (percentage >= 80) return "text-amber-500";
    return "text-destructive";
  };
  
  const chartData = [{ value: Math.min(percentage, 100), fill: getColor() }];

  const formatValue = format === 'currency' 
    ? formatCompactCurrency 
    : format === 'duration' 
      ? formatDuration 
      : formatMultiplier;

  return (
    <Card 
      className={cn(
        "bg-card border-border relative group transition-all duration-200",
        isClickable && "cursor-pointer hover:border-primary/50 hover:shadow-md"
      )}
      onClick={onClick}
    >
      {isClickable && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <ExternalLink className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground text-center">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center pt-0">
        {isLoadingProp ? (
          <div className="relative w-32 h-32 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="relative w-32 h-32">
            <RadialBarChart width={128} height={128} innerRadius="70%" outerRadius="100%" data={chartData} startAngle={90} endAngle={-270}>
              <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
              <RadialBar background={{ fill: "hsl(var(--muted))" }} dataKey="value" cornerRadius={10} />
            </RadialBarChart>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-foreground">{formatValue(realized)}</span>
              <span className={`text-sm font-medium ${getTextColorClass()}`}>{Math.round(percentage)}%</span>
            </div>
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-2">Meta: {formatValue(meta)}</p>
      </CardContent>
    </Card>
  );
};

const IndicatorChartSection = ({ title, realizedLabel, realizedTotal, metaTotal, chartData, gradientId, isAccumulated }: {
  title: string; realizedLabel: string; realizedTotal: number; metaTotal: number;
  chartData: { label: string; realizado: number; meta: number }[]; gradientId: string; isAccumulated?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(true);
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <Card className="bg-card border-border">
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-2 cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-semibold text-foreground">{title}</CardTitle>
                {isAccumulated && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Acumulado</span>
                )}
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className="flex items-center gap-6 text-sm">
                <span className="text-muted-foreground">{realizedLabel}: <span className="text-foreground font-medium">{formatNumber(realizedTotal)}</span></span>
                <span className="text-muted-foreground">Meta: <span className="text-foreground font-medium">{formatNumber(metaTotal)}</span></span>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-2"><div className="w-3 h-0.5 bg-chart-1 rounded" /><span className="text-xs text-muted-foreground">{isAccumulated ? 'Meta Acumulada' : 'Meta'}</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-0.5 bg-chart-2 rounded" /><span className="text-xs text-muted-foreground">{isAccumulated ? 'Realizado Acumulado' : 'Realizado'}</span></div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--popover-foreground))" }} />
                  <Area type="monotone" dataKey="realizado" stroke="hsl(var(--chart-2))" strokeWidth={2} fill={`url(#${gradientId})`} name={isAccumulated ? "Realizado Acumulado" : "Realizado"} />
                  <Line type="monotone" dataKey="meta" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} name={isAccumulated ? "Meta Acumulada" : "Meta"} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

export function IndicatorsTab() {
  const currentYear = new Date().getFullYear();
  // Multi-selection state for BUs (all selected by default = "Consolidado")
  const [selectedBUs, setSelectedBUs] = useState<BUType[]>(['modelo_atual', 'o2_tax', 'oxy_hacker', 'franquia']);
  // Multi-selection state for Closers (empty = all closers)
  const [selectedClosers, setSelectedClosers] = useState<string[]>([]);
  // Multi-selection state for SDRs (empty = all SDRs)
  const [selectedSDRs, setSelectedSDRs] = useState<string[]>([]);
  // Multi-selection state for lead origin (empty = all origens)
  const [selectedOrigens, setSelectedOrigens] = useState<LeadSource[]>([]);
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [cardInvestigatorOpen, setCardInvestigatorOpen] = useState(false);
  const [commercialPaceOpen, setCommercialPaceOpen] = useState(false);

  // Handle date change from DateRangePickerGA
  const handleDateRangeChange = (start: Date, end: Date) => {
    setStartDate(start);
    setEndDate(end);
  };
  
  // Detail sheet state for radial cards drill-down
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [detailSheetTitle, setDetailSheetTitle] = useState('');
  const [detailSheetDescription, setDetailSheetDescription] = useState('');
  const [detailSheetItems, setDetailSheetItems] = useState<DetailItem[]>([]);
  const [detailSheetColumns, setDetailSheetColumns] = useState<{ key: keyof DetailItem; label: string; format?: (value: any) => React.ReactNode }[]>([]);
  const [detailSheetKpis, setDetailSheetKpis] = useState<KpiItem[]>([]);
  const [detailSheetCharts, setDetailSheetCharts] = useState<ChartConfig[]>([]);
  const [detailSheetFilterCriteria, setDetailSheetFilterCriteria] = useState<FilterCriteriaGroup[]>([]);
  const [detailSheetExtraContent, setDetailSheetExtraContent] = useState<React.ReactNode>(null);
  

  const handleSync = () => {
    // Use the year from the start date for sync
    syncWithPipefy(startDate.getFullYear());
  };

  const { data: funnelRawData, getTotal, syncWithPipefy, isSyncing, isLoading } = useFunnelRealized(startDate, endDate);

  const lastUpdated = useMemo(() => {
    if (!funnelRawData || funnelRawData.length === 0) return null;
    const maxDate = funnelRawData.reduce((max, r) => {
      const d = r.updated_at;
      return d > max ? d : max;
    }, funnelRawData[0].updated_at);
    return new Date(maxDate);
  }, [funnelRawData]);
  const { getQtyForPeriod: getModeloAtualQty, getValueForPeriod: getModeloAtualValue, getMrrForPeriod, getSetupForPeriod, getPontualForPeriod, getGroupedData: getModeloAtualGroupedData, isLoading: isLoadingModeloAtual } = useModeloAtualMetas(startDate, endDate);
  const { getQtyForPeriod: getExpansaoQty, getValueForPeriod: getExpansaoValue, getGroupedData: getExpansaoGroupedData, getDetailItemsForIndicator: getExpansaoDetailItems, isLoading: isLoadingExpansao, refetch: refetchExpansao } = useExpansaoMetas(startDate, endDate);
  const { getQtyForPeriod: getO2TaxQty, getValueForPeriod: getO2TaxValue, getMrrForPeriod: getO2TaxMrr, getSetupForPeriod: getO2TaxSetup, getPontualForPeriod: getO2TaxPontual, getGroupedData: getO2TaxGroupedData, isLoading: isLoadingO2Tax } = useO2TaxMetas(startDate, endDate);
  const { getQtyForPeriod: getOxyHackerQty, getValueForPeriod: getOxyHackerValue, getGroupedData: getOxyHackerGroupedData, getDetailItemsForIndicator: getOxyHackerDetailItems, isLoading: isLoadingOxyHacker } = useOxyHackerMetas(startDate, endDate);
  
  // Analytics hooks for drill-down
  const modeloAtualAnalyticsRaw = useModeloAtualAnalytics(startDate, endDate);
  const outboundAnalytics = useOutboundAnalytics(startDate, endDate);
  const o2TaxAnalytics = useO2TaxAnalytics(startDate, endDate);
  const franquiaAnalytics = useExpansaoAnalytics(startDate, endDate, 'Franquia');
  const oxyHackerAnalytics = useExpansaoAnalytics(startDate, endDate, 'Oxy Hacker');
  const monetizacaoAnalytics = useMonetizacaoAnalytics(startDate, endDate);

  // Combina Modelo Atual + Outbound: cards do pipe `pipefy_moviment_outbound`
  // são tratados como extensão do Modelo Atual (mesma BU, origem = Outbound).
  // Todos os call-sites que antes usavam modeloAtualAnalytics passam a usar
  // este objeto combinado — gauges, funilzinho, comparativo semanal, rank, etc.
  // Quando o filtro Origem = "Outbound", o classifier reconhece os cards pelo
  // tipoOrigem="Prospecção Ativa" + SDR=Matheus injetados em parseOutboundRow.
  const modeloAtualAnalytics = useMemo(() => ({
    ...modeloAtualAnalyticsRaw,
    cards: [...modeloAtualAnalyticsRaw.cards, ...outboundAnalytics.cards],
    isLoading: modeloAtualAnalyticsRaw.isLoading || outboundAnalytics.isLoading,
    getCardsForIndicator: (ind: IndicatorType) => [
      ...modeloAtualAnalyticsRaw.getCardsForIndicator(ind),
      ...outboundAnalytics.getCardsForIndicator(ind),
    ],
    getDetailItemsForIndicator: (ind: IndicatorType) => [
      ...modeloAtualAnalyticsRaw.getDetailItemsForIndicator(ind),
      ...outboundAnalytics.getDetailItemsForIndicator(ind),
    ],
    // getDetailItemsWithFullHistory permanece do hook original (outbound não tem fullHistory).
  }), [modeloAtualAnalyticsRaw, outboundAnalytics]);
  
  // Get funnelData from MediaMetasContext for dynamic metas
  const { funnelData, metasPorBU } = useMediaMetas();
  
  // Get consolidated metas (database overrides + Plan Growth fallback)
  const { getMetaMonetaryForPeriod, getConsolidatedMeta } = useConsolidatedMetas();
  const { getMrrBaseForMonth, isTotalOverride, isLoading: isLoadingMrrBase } = useMrrBase();
  const { cashflowByMonth, dailyRevenue, isLoading: isLoadingDre } = useOxyFinance(currentYear);

  // Build a lookup map: date string -> { caas, saas, expansao, tax, total_inflows }
  const dailyRevenueMap = useMemo(() => {
    const map: Record<string, { caas: number; saas: number; expansao: number; tax: number; total_inflows: number }> = {};
    for (const row of dailyRevenue) {
      map[row.date] = {
        caas: row.caas,
        saas: row.saas,
        expansao: row.expansao,
        tax: row.tax,
        total_inflows: row.total_inflows,
      };
    }
    return map;
  }, [dailyRevenue]);
  const hasDailyRevenueData = dailyRevenue.length > 0;

  // Helper to sum daily revenue for a date filtering by selected BUs
  const getDailyRevenueForBUs = (dateKey: string): number => {
    const row = dailyRevenueMap[dateKey];
    if (!row) return 0;
    let total = 0;
    if (selectedBUs.includes('modelo_atual')) total += row.caas + row.saas;
    if (selectedBUs.includes('o2_tax')) total += row.tax;
    return total;
  };
  
  // Get closer metas for filtering goals by closer percentage
  const { getFilteredMeta } = useCloserMetas(currentYear);
  const { metas: sdrMetasList } = useSdrMetas(currentYear);
  const { funnelMetas: dbFunnelMetas } = useFunnelMetas(currentYear);

  // Look up the funnel meta value (mqls/rms/rrs/propostas/vendas/leads) for a BU+month
  // from funnel_metas DB. Returns null when the row doesn't exist.
  // Regra de negócio: DB é fonte da verdade quando há linha persistida (locked OU sincronizada
  // via Plan Growth → Sync). Caller usa funnelData (Plan Growth ao vivo) só como fallback
  // quando a linha ainda não existe no DB.
  const getDbFunnelValue = (
    bu: string | undefined,
    monthName: string,
    indicatorKey: IndicatorType
  ): number | null => {
    if (!bu) return null;
    const row = dbFunnelMetas.find(m => m.bu === bu && m.month === monthName);
    if (!row) return null;
    switch (indicatorKey) {
      case 'leads': return row.leads ?? null;
      case 'mql': return row.mqls ?? null;
      case 'rm': return row.rms ?? null;
      case 'rr': return row.rrs ?? null;
      case 'proposta': return row.propostas ?? null;
      case 'venda': return row.vendas ?? null;
      default: return null;
    }
  };
  /**
   * Soma metas RM/RR de sdr_metas para uma BU/SDRs em um período (com fração proporcional ao mês).
   * Retorna { value, hasData } — quando hasData=false, o caller deve usar fallback (funnel).
   */
  const getSdrMetaForPeriod = (
    indicatorKey: 'rm' | 'rr',
    bu: string,
    start: Date,
    end: Date,
    sdrFilter?: string[]
  ): { value: number; hasData: boolean } => {
    if (!sdrMetasList || sdrMetasList.length === 0) return { value: 0, hasData: false };
    const monthsInPeriod = eachMonthOfInterval({ start, end });
    let total = 0;
    let hasData = false;

    for (const monthDate of monthsInPeriod) {
      const monthName = monthNames[getMonth(monthDate)];
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      const overlapStart = start > monthStart ? start : monthStart;
      const overlapEnd = end < monthEnd ? end : monthEnd;
      if (overlapStart > overlapEnd) continue;
      const overlapDays = differenceInDays(overlapEnd, overlapStart) + 1;
      const daysInMonth = differenceInDays(monthEnd, monthStart) + 1;
      const fraction = daysInMonth > 0 ? overlapDays / daysInMonth : 0;

      const records = sdrMetasList.filter(m =>
        m.bu === bu &&
        m.month === monthName &&
        (!sdrFilter || sdrFilter.length === 0 || sdrFilter.includes(m.sdr))
      );
      for (const r of records) {
        const v = indicatorKey === 'rm' ? (r.rm_meta || 0) : (r.rr_meta || 0);
        if (v > 0) hasData = true;
        total += v * fraction;
      }
    }

    return { value: total, hasData };
  };

  /** Versão para uso por mês (retorna apenas o valor inteiro do mês, sem fração) */
  const getSdrMetaForMonth = (
    indicatorKey: 'rm' | 'rr',
    bu: string,
    monthName: string,
    sdrFilter?: string[]
  ): { value: number; hasData: boolean } => {
    if (!sdrMetasList || sdrMetasList.length === 0) return { value: 0, hasData: false };
    const records = sdrMetasList.filter(m =>
      m.bu === bu &&
      m.month === monthName &&
      (!sdrFilter || sdrFilter.length === 0 || sdrFilter.includes(m.sdr))
    );
    let total = 0;
    let hasData = false;
    for (const r of records) {
      const v = indicatorKey === 'rm' ? (r.rm_meta || 0) : (r.rr_meta || 0);
      if (v > 0) hasData = true;
      total += v;
    }
    return { value: total, hasData };
  };

  // Derive helper flags from multi-selection
  const isConsolidado = selectedBUs.length === 4;
  const hasSingleBU = selectedBUs.length === 1;
  const selectedBU: BUType | 'all' = hasSingleBU ? selectedBUs[0] : 'all';

  // Calculate available closers based on selected BUs
  const availableClosers: MultiSelectOption[] = useMemo(() => {
    const closersSet = new Set<string>();
    
    selectedBUs.forEach(bu => {
      const buClosers = BU_CLOSERS[bu as BuType] || [];
      buClosers.forEach(closer => closersSet.add(closer));
    });
    
    const allClosers = [
      { value: 'Pedro Albite', label: 'Pedro' },
      { value: 'Daniel Trindade', label: 'Daniel' },
      { value: 'Lucas Ilha', label: 'Lucas' },
      { value: 'Thiago', label: 'Thiago' },
      { value: 'Amanda Serafim', label: 'Amanda Serafim' },
      { value: 'Bruna', label: 'Bruna' },
    ];
    
    const filtered = allClosers.filter(c => closersSet.has(c.value));
    return [...filtered, { value: NO_CLOSER_VALUE, label: 'Sem Closer' }];
  }, [selectedBUs]);

  // Calculate available SDRs based on selected BUs
  const availableSDRs: MultiSelectOption[] = useMemo(() => {
    const sdrsSet = new Set<string>();
    
    selectedBUs.forEach(bu => {
      const buSdrs = BU_SDRS[bu as BuType] || [];
      buSdrs.forEach(sdr => sdrsSet.add(sdr));
    });
    
    const filtered = sdrOptions.filter(s => sdrsSet.has(s.value));
    return [...filtered, { value: NO_SDR_VALUE, label: 'Sem SDR' }];
  }, [selectedBUs]);

  // Clear selected closers that are not valid for the current BU selection
  useEffect(() => {
    const validClosers = selectedClosers.filter(closer => {
      if (closer === NO_CLOSER_VALUE) return true; // sentinela é sempre válido
      return selectedBUs.some(bu => BU_CLOSERS[bu as BuType]?.includes(closer as CloserType));
    });
    
    if (validClosers.length !== selectedClosers.length) {
      setSelectedClosers(validClosers);
    }
  }, [selectedBUs, selectedClosers]);

  // Clear selected SDRs that are not valid for the current BU selection
  useEffect(() => {
    const validSDRs = selectedSDRs.filter(sdr => {
      if (sdr === NO_SDR_VALUE) return true; // sentinela é sempre válido
      return selectedBUs.some(bu => BU_SDRS[bu as BuType]?.includes(sdr));
    });
    
    if (validSDRs.length !== selectedSDRs.length) {
      setSelectedSDRs(validSDRs);
    }
  }, [selectedBUs, selectedSDRs]);

  // Treat "all closers selected" the same as "no filter" to avoid edge cases
  // (e.g., when O2 TAX has only Lucas, selecting him makes selectedClosers.length === availableClosers.length)
  const effectiveSelectedClosers = useMemo(() => {
    if (selectedClosers.length === 0) return [];
    if (selectedClosers.length === availableClosers.length) return []; // All selected = no filter
    return selectedClosers;
  }, [selectedClosers, availableClosers]);

  // Treat "all SDRs selected" the same as "no filter" to avoid edge cases
  const effectiveSelectedSDRs = useMemo(() => {
    if (selectedSDRs.length === 0) return [];
    if (selectedSDRs.length === availableSDRs.length) return []; // All selected = no filter
    return selectedSDRs;
  }, [selectedSDRs, availableSDRs]);

  // Returns the SDRs (from the active filter) that operate in a given BU.
  // Returns undefined if no SDR filter is active (no override), or [] if filter is on but
  // no selected SDR operates in this BU (caller should treat as "exclude this BU").
  const sdrFilterForBU = (bu: BuType): string[] | undefined => {
    if (effectiveSelectedSDRs.filter(s => s !== NO_SDR_VALUE).length === 0) return undefined;
    // Ignora sentinela "Sem SDR" para filtragem de metas por nome
    const named = effectiveSelectedSDRs.filter(s => s !== NO_SDR_VALUE);
    if (named.length === 0) return undefined;
    return named.filter(s => BU_SDRS[bu]?.includes(s));
  };

  // Token-based normalization: lowercase, strip diacritics, remove punctuation,
  // collapse whitespace/newlines, then split into tokens.
  // Tolerates "Amanda Serafim" (filter) vs "Amanda Teixeira Serafim" (card).
  const tokenize = (value: string): string[] => {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')      // remove diacritics
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')         // remove punctuation
      .replace(/\s+/g, ' ')                  // collapse whitespace/newlines
      .trim()
      .split(' ')
      .filter(Boolean);
  };

  // Filter function - card matches if it contains ALL tokens of any selected closer,
  // OR if "Sem Closer" is selected and the card has no closer value
  const matchesCloserFilter = (closerValue?: string | null): boolean => {
    if (effectiveSelectedClosers.length === 0) return true; // No filter = show all
    const wantsEmpty = effectiveSelectedClosers.includes(NO_CLOSER_VALUE);
    const isEmpty = !closerValue || !String(closerValue).trim();
    if (wantsEmpty && isEmpty) return true;
    if (isEmpty) return false;
    const cardTokens = tokenize(closerValue!);
    if (cardTokens.length === 0) return wantsEmpty; // tokens vazios = "sem closer"
    return effectiveSelectedClosers.some(selected => {
      if (selected === NO_CLOSER_VALUE) return false;
      const selectedTokens = tokenize(selected);
      if (selectedTokens.length === 0) return false;
      // Card matches if it contains every token of the selected name (any order)
      return selectedTokens.every(t => cardTokens.includes(t));
    });
  };

  // Filter function - card matches if it contains ALL tokens of any selected SDR,
  // OR if "Sem SDR" is selected and the card has no SDR value
  const matchesSdrFilter = (responsavel?: string | null): boolean => {
    if (effectiveSelectedSDRs.length === 0) return true; // No filter = show all
    const wantsEmpty = effectiveSelectedSDRs.includes(NO_SDR_VALUE);
    const isEmpty = !responsavel || !String(responsavel).trim();
    if (wantsEmpty && isEmpty) return true;
    if (isEmpty) return false;
    const cardTokens = tokenize(responsavel!);
    if (cardTokens.length === 0) return wantsEmpty;
    return effectiveSelectedSDRs.some(sdr => {
      if (sdr === NO_SDR_VALUE) return false;
      const sdrTokens = tokenize(sdr);
      if (sdrTokens.length === 0) return false;
      return sdrTokens.every(t => cardTokens.includes(t));
    });
  };

  // Lead-source (origem) filter — returns true if no filter, or card classifies into selected set
  const matchesOrigemFilter = (card: any): boolean => {
    if (selectedOrigens.length === 0) return true;
    if (!card) return false;
    const source = classifyLeadSource({
      tipoOrigem: card.tipoOrigem,
      origemLead: card.origemLead,
      fonte: card.fonte,
      campanha: card.campanha,
      sdr: card.responsavel || card.sdr,
    });
    return selectedOrigens.includes(source);
  };

  // Month name mapping for funnelData lookup
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  
  // Helper function to calculate meta from funnelData for a given period (pro-rated for partial months)
  // Optionally applies closer percentage filter per month for a specific BU
  const calcularMetaDoPeriodo = (
    funnelItems: FunnelDataItem[] | undefined,
    indicatorKey: IndicatorType,
    start: Date,
    end: Date,
    bu?: string,
    closerFilter?: string[],
    sdrFilter?: string[]
  ): number => {
    // Override RM/RR by sdr_metas when an SDR filter is active and we have data for this BU
    if (bu && (indicatorKey === 'rm' || indicatorKey === 'rr') && sdrFilter && sdrFilter.length > 0) {
      const { value, hasData } = getSdrMetaForPeriod(indicatorKey, bu, start, end, sdrFilter);
      if (hasData) return Math.round(value);
    }

    const getItemValue = (item: FunnelDataItem): number => {
      switch (indicatorKey) {
        case 'mql': return item.mqls;
        case 'rm': return item.rms;
        case 'rr': return item.rrs;
        case 'proposta': return item.propostas;
        case 'venda': return item.vendas;
        default: return 0;
      }
    };

    const monthsInPeriod = eachMonthOfInterval({ start, end });
    let total = 0;

    for (const monthDate of monthsInPeriod) {
      const monthName = monthNames[getMonth(monthDate)];

      // 🎯 Fonte da verdade:
      //   - linha existe em funnel_metas (locked OU sincronizada via Plan Growth) → DB
      //   - sem linha no DB → Plan Growth ao vivo (funnelItems) como fallback
      const dbVal = getDbFunnelValue(bu, monthName, indicatorKey);
      const item = funnelItems?.find(f => f.month === monthName);
      if (dbVal === null && !item) continue;

      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);

      const overlapStart = start > monthStart ? start : monthStart;
      const overlapEnd = end < monthEnd ? end : monthEnd;

      if (overlapStart > overlapEnd) continue;

      const overlapDays = differenceInDays(overlapEnd, overlapStart) + 1;
      const daysInMonth = differenceInDays(monthEnd, monthStart) + 1;
      const fraction = daysInMonth > 0 ? overlapDays / daysInMonth : 0;

      const baseValue = dbVal !== null ? dbVal : getItemValue(item!);
      let monthMeta = baseValue * fraction;

      if (bu && closerFilter && closerFilter.length > 0) {
        monthMeta = getFilteredMeta(monthMeta, bu, monthName, closerFilter);
      }

      total += monthMeta;
    }

    return Math.round(total);
  };
  
  const getMonthlyMetasFromFunnel = (
    funnelItems: FunnelDataItem[] | undefined,
    indicatorKey: IndicatorType,
    start: Date,
    end: Date,
    bu?: string,
    closerFilter?: string[],
    sdrFilter?: string[]
  ): number[] => {
    const monthsInPeriod = eachMonthOfInterval({ start, end });

    // Override per-month using sdr_metas if SDR filter active and data present
    const useSdrOverride = !!(bu && (indicatorKey === 'rm' || indicatorKey === 'rr') && sdrFilter && sdrFilter.length > 0);

    return monthsInPeriod.map(monthDate => {
      const monthName = monthNames[getMonth(monthDate)];

      if (useSdrOverride) {
        const { value, hasData } = getSdrMetaForMonth(indicatorKey as 'rm' | 'rr', bu!, monthName, sdrFilter);
        if (hasData) return Math.round(value);
      }

      // 🎯 Fonte da verdade: DB quando há linha persistida (locked ou sync), Plan Growth ao vivo como fallback.
      const dbVal = getDbFunnelValue(bu, monthName, indicatorKey);
      let value = 0;
      if (dbVal !== null) {
        value = dbVal;
      } else {
        const item = funnelItems?.find(f => f.month === monthName);
        if (!item) return 0;
        switch (indicatorKey) {
          case 'mql': value = item.mqls; break;
          case 'rm': value = item.rms; break;
          case 'rr': value = item.rrs; break;
          case 'proposta': value = item.propostas; break;
          case 'venda': value = item.vendas; break;
          default: value = 0;
        }
      }

      if (bu && closerFilter && closerFilter.length > 0) {
        value = getFilteredMeta(value, bu, monthName, closerFilter);
      }

      return Math.round(value);
    });
  };

  // Check which BUs are selected (for multi-selection logic)
  const includesModeloAtual = selectedBUs.includes('modelo_atual');
  const includesO2Tax = selectedBUs.includes('o2_tax');
  const includesOxyHacker = selectedBUs.includes('oxy_hacker');
  const includesFranquia = selectedBUs.includes('franquia');

  const daysInPeriod = differenceInDays(endDate, startDate) + 1;
  const periodFraction = daysInPeriod / 365;
  
  // Determine grouping based on period length
  const grouping: ChartGrouping = daysInPeriod <= 31 ? 'daily' : daysInPeriod <= 90 ? 'weekly' : 'monthly';

  // Generate chart labels based on grouping
  const getChartLabels = (): string[] => {
    if (grouping === 'daily') {
      let lastMonth = -1;
      return eachDayOfInterval({ start: startDate, end: endDate }).map(day => {
        const m = day.getMonth();
        if (m !== lastMonth) {
          lastMonth = m;
          return format(day, "d/MM");
        }
        return format(day, "d");
      });
    } else if (grouping === 'weekly') {
      let lastMonth = -1;
      const numWeeks = Math.ceil(daysInPeriod / 7);
      return Array.from({ length: numWeeks }, (_, i) => {
        const weekStart = addDays(startDate, i * 7);
        const m = weekStart.getMonth();
        if (m !== lastMonth) {
          lastMonth = m;
          return format(weekStart, "d/MM");
        }
        return format(weekStart, "d");
      });
    } else {
      return eachMonthOfInterval({ start: startDate, end: endDate }).map(monthDate => 
        format(monthDate, "MMM", { locale: ptBR })
      );
    }
  };

  const chartLabels = getChartLabels();

  // Get meta for indicator - sums metas from selected BUs using funnelData
  // Applies closer percentage filter for Modelo Atual when closers are selected
  const getMetaForIndicator = (indicator: IndicatorConfig) => {
    let total = 0;

    const buBlocks: { bu: BuType; items?: FunnelDataItem[] }[] = [
      { bu: 'modelo_atual', items: funnelData?.modeloAtual },
      { bu: 'o2_tax', items: funnelData?.o2Tax },
      { bu: 'oxy_hacker', items: funnelData?.oxyHacker },
      { bu: 'franquia', items: funnelData?.franquia },
    ];

    for (const { bu, items } of buBlocks) {
      if (!selectedBUs.includes(bu)) continue;

      // Closer filter for this BU
      const closersForBU = effectiveSelectedClosers.filter(c => BU_CLOSERS[bu]?.includes(c as CloserType));
      if (effectiveSelectedClosers.length > 0 && closersForBU.length === 0) continue;

      // SDR filter for this BU
      const sdrsForBU = sdrFilterForBU(bu);
      if (sdrsForBU !== undefined && sdrsForBU.length === 0) continue;

      
      total += calcularMetaDoPeriodo(
        items,
        indicator.key,
        startDate,
        endDate,
        bu,
        closersForBU.length > 0 ? closersForBU : undefined,
        sdrsForBU,
      );
    }

    // Se há filtro de pessoa ativo, respeitar o total (mesmo 0). Sem filtro, fallback ao annualMeta prorateado.
    const hasPersonFilter = effectiveSelectedClosers.length > 0 || effectiveSelectedSDRs.length > 0;
    if (hasPersonFilter) return Math.round(total);
    return total > 0 ? total : Math.round(indicator.annualMeta * periodFraction);
  };

  // Get realized value for indicator - sums realized from selected BUs
  // Applies closer AND SDR filters when the selected closer/SDR operates in that BU
  const getRealizedForIndicator = (indicator: IndicatorConfig) => {
    let total = 0;
    
    if (includesModeloAtual) {
      // Check if any selected closer/SDR operates in Modelo Atual
      const closersForBU = effectiveSelectedClosers.filter(c => 
        BU_CLOSERS.modelo_atual.includes(c as CloserType)
      );
      const sdrsForBU = effectiveSelectedSDRs.filter(s => 
        BU_SDRS.modelo_atual.includes(s)
      );
      
      // Include BU if: no closer filter OR at least one selected closer operates here
      // AND: no SDR filter OR at least one selected SDR operates here
      const includeByCloser = closersForBU.length > 0 || effectiveSelectedClosers.filter(c => c !== NO_CLOSER_VALUE).length === 0;
      const includeBySdr = sdrsForBU.length > 0 || effectiveSelectedSDRs.filter(s => s !== NO_SDR_VALUE).length === 0;
      
      if (includeByCloser && includeBySdr) {
        // If either filter is active, use card-level filtering
        if (effectiveSelectedClosers.length > 0 || effectiveSelectedSDRs.length > 0 || selectedOrigens.length > 0) {
          const cards = modeloAtualAnalytics.getCardsForIndicator(indicator.key);
          const filteredCards = cards.filter(card => {
            const matchCloser = effectiveSelectedClosers.length === 0 || matchesCloserFilter(card.closer);
            const matchSdr = effectiveSelectedSDRs.length === 0 || matchesSdrFilter(card.responsavel || card.sdr);
            return matchCloser && matchSdr && matchesOrigemFilter(card);
          });
          total += filteredCards.length;
        } else {
          // No filters - use analytics hook with first-entry logic for consistency
          total += modeloAtualAnalytics.getCardsForIndicator(indicator.key).length;
        }
      }
    }

    if (includesO2Tax) {
      // Check if any selected closer/SDR operates in O2 TAX
      const closersForBU = effectiveSelectedClosers.filter(c => 
        BU_CLOSERS.o2_tax.includes(c as CloserType)
      );
      const sdrsForBU = effectiveSelectedSDRs.filter(s => 
        BU_SDRS.o2_tax.includes(s)
      );
      
      const includeByCloser = closersForBU.length > 0 || effectiveSelectedClosers.filter(c => c !== NO_CLOSER_VALUE).length === 0;
      const includeBySdr = sdrsForBU.length > 0 || effectiveSelectedSDRs.filter(s => s !== NO_SDR_VALUE).length === 0;
      
      if (includeByCloser && includeBySdr) {
        if (effectiveSelectedClosers.length > 0 || effectiveSelectedSDRs.length > 0 || selectedOrigens.length > 0) {
          const cards = o2TaxAnalytics.getDetailItemsForIndicator(indicator.key);
          const filteredCards = cards.filter(card => {
            const matchCloser = effectiveSelectedClosers.length === 0 || matchesCloserFilter(card.closer || card.responsible);
            const matchSdr = effectiveSelectedSDRs.length === 0 || matchesSdrFilter(card.sdr || card.responsible);
            return matchCloser && matchSdr && matchesOrigemFilter(card);
          });
          total += filteredCards.length;
        } else {
          // No filters - use analytics hook with first-entry logic for consistency
          total += o2TaxAnalytics.getDetailItemsForIndicator(indicator.key).length;
        }
      }
    }

    if (includesOxyHacker) {
      // Check if any selected closer/SDR operates in Oxy Hacker
      const closersForBU = effectiveSelectedClosers.filter(c => 
        BU_CLOSERS.oxy_hacker.includes(c as CloserType)
      );
      const sdrsForBU = effectiveSelectedSDRs.filter(s => 
        BU_SDRS.oxy_hacker.includes(s)
      );
      
      const includeByCloser = closersForBU.length > 0 || effectiveSelectedClosers.filter(c => c !== NO_CLOSER_VALUE).length === 0;
      const includeBySdr = sdrsForBU.length > 0 || effectiveSelectedSDRs.filter(s => s !== NO_SDR_VALUE).length === 0;
      
      if (includeByCloser && includeBySdr) {
        if (effectiveSelectedClosers.length > 0 || effectiveSelectedSDRs.length > 0 || selectedOrigens.length > 0) {
          const cards = oxyHackerAnalytics.getDetailItemsForIndicator(indicator.key);
          const filteredCards = cards.filter(card => {
            const matchCloser = effectiveSelectedClosers.length === 0 || matchesCloserFilter(card.closer || card.responsible);
            const matchSdr = effectiveSelectedSDRs.length === 0 || matchesSdrFilter(card.sdr || card.responsible);
            return matchCloser && matchSdr && matchesOrigemFilter(card);
          });
          total += filteredCards.length;
        } else {
          // No filters - use metas hook (full dataset) for consistency with monetary gauges
          total += getOxyHackerQty(indicator.key as OxyHackerIndicator, startDate, endDate);
        }
      }
    }

    if (includesFranquia) {
      // Check if any selected closer/SDR operates in Franquia
      const closersForBU = effectiveSelectedClosers.filter(c => 
        BU_CLOSERS.franquia.includes(c as CloserType)
      );
      const sdrsForBU = effectiveSelectedSDRs.filter(s => 
        BU_SDRS.franquia.includes(s)
      );
      
      const includeByCloser = closersForBU.length > 0 || effectiveSelectedClosers.filter(c => c !== NO_CLOSER_VALUE).length === 0;
      const includeBySdr = sdrsForBU.length > 0 || effectiveSelectedSDRs.filter(s => s !== NO_SDR_VALUE).length === 0;
      
      if (includeByCloser && includeBySdr) {
        if (effectiveSelectedClosers.length > 0 || effectiveSelectedSDRs.length > 0 || selectedOrigens.length > 0) {
          const cards = franquiaAnalytics.getDetailItemsForIndicator(indicator.key);
          const filteredCards = cards.filter(card => {
            const matchCloser = effectiveSelectedClosers.length === 0 || matchesCloserFilter(card.closer || card.responsible);
            const matchSdr = effectiveSelectedSDRs.length === 0 || matchesSdrFilter(card.sdr || card.responsible);
            return matchCloser && matchSdr && matchesOrigemFilter(card);
          });
          total += filteredCards.length;
        } else {
          // No filters - use metas hook (full dataset) for consistency with monetary gauges
          total += getExpansaoQty(indicator.key as ExpansaoIndicator, startDate, endDate);
        }
      }
    }

    // MONETIZAÇÃO (origem transversal — não depende de BU, Closer ou SDR)
    // Conta apenas Proposta e Venda; pipe não gera MQL/RM/RR.
    if (
      (indicator.key === 'proposta' || indicator.key === 'venda') &&
      (selectedOrigens.length === 0 || selectedOrigens.includes('monetizacao'))
    ) {
      total += monetizacaoAnalytics.getDetailItemsForIndicator(indicator.key).length;
    }

    return total;
  };


  const buildChartData = (indicator: IndicatorConfig) => {
    // Helper: agrupa cards (com filtro de closer/SDR aplicado) na mesma granularidade
    // do gráfico. Usado quando há filtro de closer/SDR ativo — caso contrário, o
    // gráfico cai no caminho original (getXxxGroupedData) que é mais barato.
    const hasPeopleFilter = effectiveSelectedClosers.length > 0 || effectiveSelectedSDRs.length > 0 || selectedOrigens.length > 0;
    const buildQtyArrayFromFilteredCards = (
      cards: Array<{ dataEntrada: Date; closer?: string | null; responsavel?: string | null; sdr?: string | null; responsible?: string | null }>,
      personRole: 'closer' | 'sdr' | 'both' = 'both'
    ): number[] => {
      const filtered = cards.filter((card: any) => {
        const cardCloser = card.closer ?? null;
        const cardSdr = card.sdr ?? card.responsavel ?? card.responsible ?? null;
        const matchCloser = effectiveSelectedClosers.length === 0 || (personRole !== 'sdr' && matchesCloserFilter(cardCloser));
        const matchSdr = effectiveSelectedSDRs.length === 0 || (personRole !== 'closer' && matchesSdrFilter(cardSdr));
        return matchCloser && matchSdr && matchesOrigemFilter(card);
      });
      const countInRange = (startTs: number, endTs: number) =>
        filtered.filter((c: any) => {
          const t = c.dataEntrada instanceof Date ? c.dataEntrada.getTime() : new Date(c.dataEntrada).getTime();
          return t >= startTs && t <= endTs;
        }).length;
      const out: number[] = [];
      if (grouping === 'daily') {
        const days = eachDayOfInterval({ start: startDate, end: endDate });
        for (const day of days) {
          const s = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
          const e = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999).getTime();
          out.push(countInRange(s, e));
        }
      } else if (grouping === 'weekly') {
        const numWeeks = chartLabels.length;
        for (let i = 0; i < numWeeks; i++) {
          const ws = addDays(startDate, i * 7);
          const we = i === numWeeks - 1 ? endDate : addDays(ws, 6);
          const s = new Date(ws.getFullYear(), ws.getMonth(), ws.getDate()).getTime();
          const e = new Date(we.getFullYear(), we.getMonth(), we.getDate(), 23, 59, 59, 999).getTime();
          out.push(countInRange(s, e));
        }
      } else {
        const months = eachMonthOfInterval({ start: startDate, end: endDate });
        for (const m of months) {
          const ms = new Date(m.getFullYear(), m.getMonth(), 1).getTime();
          const last = new Date(m.getFullYear(), m.getMonth() + 1, 0);
          const me = new Date(last.getFullYear(), last.getMonth(), last.getDate(), 23, 59, 59, 999).getTime();
          out.push(countInRange(ms, me));
        }
      }
      return out;
    };

    const getProratedMetaSeries = (totalMetaPeriodo: number): number[] => {
      if (totalMetaPeriodo <= 0) return [];
      const metaPorDia = totalMetaPeriodo / daysInPeriod;

      if (grouping === 'daily') {
        // Keep decimals to avoid rounding errors when accumulating
        return chartLabels.map(() => metaPorDia);
      }

      if (grouping === 'weekly') {
        const numWeeks = chartLabels.length;
        const lastWeekDays = daysInPeriod - (numWeeks - 1) * 7;
        return chartLabels.map((_, index) => {
          const days = index === numWeeks - 1 ? lastWeekDays : 7;
          // Keep decimals to avoid rounding errors when accumulating
          return metaPorDia * days;
        });
      }

      // monthly handled elsewhere
      return [];
    };

    // For single BU selection - Franquia
    if (hasSingleBU && includesFranquia) {
      const expansaoData = getExpansaoGroupedData(indicator.key as ExpansaoIndicator, startDate, endDate, grouping);
      const closerFilterFr = selectedClosers.length > 0 ? selectedClosers : undefined;
      const funnelMetasMensais = getMonthlyMetasFromFunnel(funnelData?.franquia, indicator.key, startDate, endDate, 'franquia', closerFilterFr, sdrFilterForBU('franquia'));
      const metaPeriodo = calcularMetaDoPeriodo(funnelData?.franquia, indicator.key, startDate, endDate, 'franquia', closerFilterFr, sdrFilterForBU('franquia'));
      const metasProrateadas = grouping !== 'monthly' ? getProratedMetaSeries(metaPeriodo) : [];
      // Bug fix: quando há filtro de closer/SDR, refazer a série filtrando cards
      const qtyFiltered = hasPeopleFilter
        ? buildQtyArrayFromFilteredCards(franquiaAnalytics.getCardsForIndicator(indicator.key as IndicatorType))
        : null;

      return chartLabels.map((label, index) => ({
        label,
        realizado: qtyFiltered ? (qtyFiltered[index] || 0) : (expansaoData.qty[index] || 0),
        meta:
          grouping === 'monthly'
            ? (funnelMetasMensais[index] ?? 0)
            : (metasProrateadas[index] ?? 0),
      }));
    }

    // For single BU selection - O2 TAX (use analytics hook with first-entry for consistency with gauges)
    if (hasSingleBU && includesO2Tax) {
      const funnelMetasMensais = getMonthlyMetasFromFunnel(funnelData?.o2Tax, indicator.key, startDate, endDate, 'o2_tax', undefined, sdrFilterForBU('o2_tax'));
      const metaPeriodo = calcularMetaDoPeriodo(funnelData?.o2Tax, indicator.key, startDate, endDate, 'o2_tax', undefined, sdrFilterForBU('o2_tax'));
      const metasProrateadas = grouping !== 'monthly' ? getProratedMetaSeries(metaPeriodo) : [];

      // Build realized data from o2TaxAnalytics (first-entry logic) grouped by period
      const analyticsCardsAll = o2TaxAnalytics.getCardsForIndicator(indicator.key as IndicatorType);
      // Bug fix: aplicar filtro de closer/SDR também na série do gráfico
      const analyticsCards = hasPeopleFilter
        ? analyticsCardsAll.filter((card: any) => {
            const matchCloser = effectiveSelectedClosers.length === 0 || matchesCloserFilter(card.closer || card.responsavel);
            const matchSdr = effectiveSelectedSDRs.length === 0 || matchesSdrFilter(card.sdr || card.responsavel);
            return matchCloser && matchSdr && matchesOrigemFilter(card);
          })
        : analyticsCardsAll;

      const getQtyForPeriodRange = (periodStart: number, periodEnd: number): number => {
        return analyticsCards.filter(card => {
          const entryTime = card.dataEntrada.getTime();
          return entryTime >= periodStart && entryTime <= periodEnd;
        }).length;
      };

      const qtyArray: number[] = [];
      if (grouping === 'daily') {
        const days = eachDayOfInterval({ start: startDate, end: endDate });
        for (const day of days) {
          const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
          const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999).getTime();
          qtyArray.push(getQtyForPeriodRange(dayStart, dayEnd));
        }
      } else if (grouping === 'weekly') {
        const numWeeks = chartLabels.length;
        for (let i = 0; i < numWeeks; i++) {
          const weekStart = addDays(startDate, i * 7);
          const weekEnd = i === numWeeks - 1 ? endDate : addDays(weekStart, 6);
          const weekStartTime = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate()).getTime();
          const weekEndTime = new Date(weekEnd.getFullYear(), weekEnd.getMonth(), weekEnd.getDate(), 23, 59, 59, 999).getTime();
          qtyArray.push(getQtyForPeriodRange(weekStartTime, weekEndTime));
        }
      } else {
        const months = eachMonthOfInterval({ start: startDate, end: endDate });
        for (const monthDate of months) {
          const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1).getTime();
          const lastDay = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
          const monthEnd = new Date(lastDay.getFullYear(), lastDay.getMonth(), lastDay.getDate(), 23, 59, 59, 999).getTime();
          qtyArray.push(getQtyForPeriodRange(monthStart, monthEnd));
        }
      }

      return chartLabels.map((label, index) => ({
        label,
        realizado: qtyArray[index] || 0,
        meta:
          grouping === 'monthly'
            ? (funnelMetasMensais[index] ?? 0)
            : (metasProrateadas[index] ?? 0),
      }));
    }

    // For single BU selection - Oxy Hacker
    if (hasSingleBU && includesOxyHacker) {
      const oxyHackerData = getOxyHackerGroupedData(indicator.key as OxyHackerIndicator, startDate, endDate, grouping);
      const closerFilterOh = selectedClosers.length > 0 ? selectedClosers : undefined;
      const funnelMetasMensais = getMonthlyMetasFromFunnel(funnelData?.oxyHacker, indicator.key, startDate, endDate, 'oxy_hacker', closerFilterOh, sdrFilterForBU('oxy_hacker'));
      const metaPeriodo = calcularMetaDoPeriodo(funnelData?.oxyHacker, indicator.key, startDate, endDate, 'oxy_hacker', closerFilterOh, sdrFilterForBU('oxy_hacker'));
      const metasProrateadas = grouping !== 'monthly' ? getProratedMetaSeries(metaPeriodo) : [];
      const qtyFiltered = hasPeopleFilter
        ? buildQtyArrayFromFilteredCards(oxyHackerAnalytics.getCardsForIndicator(indicator.key as IndicatorType))
        : null;

      return chartLabels.map((label, index) => ({
        label,
        realizado: qtyFiltered ? (qtyFiltered[index] || 0) : (oxyHackerData.qty[index] || 0),
        meta:
          grouping === 'monthly'
            ? (funnelMetasMensais[index] ?? 0)
            : (metasProrateadas[index] ?? 0),
      }));
    }

    // For single BU selection - Modelo Atual (with closer filter support)
    if (hasSingleBU && includesModeloAtual) {
      const modeloAtualData = getModeloAtualGroupedData(indicator.key as ModeloAtualIndicator, startDate, endDate, grouping);

      // Apply closer filter to metas if closers are selected
      const closerFilter = selectedClosers.length > 0 ? selectedClosers : undefined;
      const funnelMetasMensais = getMonthlyMetasFromFunnel(funnelData?.modeloAtual, indicator.key, startDate, endDate, 'modelo_atual', closerFilter, sdrFilterForBU('modelo_atual'));
      const metaPeriodo = calcularMetaDoPeriodo(funnelData?.modeloAtual, indicator.key, startDate, endDate, 'modelo_atual', closerFilter, sdrFilterForBU('modelo_atual'));
      const metasProrateadas = grouping !== 'monthly' ? getProratedMetaSeries(metaPeriodo) : [];
      // Bug fix: quando há filtro de closer/SDR, refazer série filtrando cards
      const qtyFiltered = hasPeopleFilter
        ? buildQtyArrayFromFilteredCards(modeloAtualAnalytics.getCardsForIndicator(indicator.key as IndicatorType))
        : null;

      return chartLabels.map((label, index) => ({
        label,
        realizado: qtyFiltered ? (qtyFiltered[index] || 0) : (modeloAtualData.qty[index] || 0),
        meta: grouping === 'monthly'
          ? (funnelMetasMensais[index] ?? 0)
          : (metasProrateadas[index] ?? 0),
      }));
    }

    // For multi-BU selection (or Consolidado), sum metas from selected BUs
    if (selectedBUs.length > 1 || !hasSingleBU) {
      // Get data for each selected BU
      const modeloAtualData = includesModeloAtual ? getModeloAtualGroupedData(indicator.key as ModeloAtualIndicator, startDate, endDate, grouping) : { qty: [], meta: [] };
      const o2taxData = includesO2Tax ? getO2TaxGroupedData(indicator.key as O2TaxIndicator, startDate, endDate, grouping) : { qty: [], meta: [] };
      const oxyHackerData = includesOxyHacker ? getOxyHackerGroupedData(indicator.key as OxyHackerIndicator, startDate, endDate, grouping) : { qty: [], meta: [] };
      const expansaoData = includesFranquia ? getExpansaoGroupedData(indicator.key as ExpansaoIndicator, startDate, endDate, grouping) : { qty: [], meta: [] };
      
      // Apply closer filter to Modelo Atual metas only (closers only apply to Modelo Atual)
      const closerFilter = selectedClosers.length > 0 ? selectedClosers : undefined;
      
      // Get monthly metas for each selected BU (with closer filter for Modelo Atual)
      const metasModeloAtual = includesModeloAtual ? getMonthlyMetasFromFunnel(funnelData?.modeloAtual, indicator.key, startDate, endDate, 'modelo_atual', closerFilter, sdrFilterForBU('modelo_atual')) : [];
      const metasO2Tax = includesO2Tax ? getMonthlyMetasFromFunnel(funnelData?.o2Tax, indicator.key, startDate, endDate, 'o2_tax', undefined, sdrFilterForBU('o2_tax')) : [];
      const metasOxyHacker = includesOxyHacker ? getMonthlyMetasFromFunnel(funnelData?.oxyHacker, indicator.key, startDate, endDate, 'oxy_hacker', undefined, sdrFilterForBU('oxy_hacker')) : [];
      const metasFranquia = includesFranquia ? getMonthlyMetasFromFunnel(funnelData?.franquia, indicator.key, startDate, endDate, 'franquia', undefined, sdrFilterForBU('franquia')) : [];
      
      // Get period metas for prorating (with closer filter for Modelo Atual)
      const metaPeriodoModeloAtual = includesModeloAtual ? calcularMetaDoPeriodo(funnelData?.modeloAtual, indicator.key, startDate, endDate, 'modelo_atual', closerFilter, sdrFilterForBU('modelo_atual')) : 0;
      const metaPeriodoO2Tax = includesO2Tax ? calcularMetaDoPeriodo(funnelData?.o2Tax, indicator.key, startDate, endDate, 'o2_tax', undefined, sdrFilterForBU('o2_tax')) : 0;
      const metaPeriodoOxyHacker = includesOxyHacker ? calcularMetaDoPeriodo(funnelData?.oxyHacker, indicator.key, startDate, endDate, 'oxy_hacker', undefined, sdrFilterForBU('oxy_hacker')) : 0;
      const metaPeriodoFranquia = includesFranquia ? calcularMetaDoPeriodo(funnelData?.franquia, indicator.key, startDate, endDate, 'franquia', undefined, sdrFilterForBU('franquia')) : 0;
      const totalMetaPeriodo = metaPeriodoModeloAtual + metaPeriodoO2Tax + metaPeriodoOxyHacker + metaPeriodoFranquia;
      
      const metasProrateadas = grouping !== 'monthly' ? getProratedMetaSeries(totalMetaPeriodo) : [];

      // Bug fix: quando há filtro de closer/SDR, refazer a série por BU usando cards filtrados
      const maQty = hasPeopleFilter && includesModeloAtual
        ? buildQtyArrayFromFilteredCards(modeloAtualAnalytics.getCardsForIndicator(indicator.key as IndicatorType))
        : null;
      const oxyQty = hasPeopleFilter && includesOxyHacker
        ? buildQtyArrayFromFilteredCards(oxyHackerAnalytics.getCardsForIndicator(indicator.key as IndicatorType))
        : null;
      const o2tQty = hasPeopleFilter && includesO2Tax
        ? buildQtyArrayFromFilteredCards((o2TaxAnalytics.getCardsForIndicator(indicator.key as IndicatorType)) as any)
        : null;
      const frQty = hasPeopleFilter && includesFranquia
        ? buildQtyArrayFromFilteredCards(franquiaAnalytics.getCardsForIndicator(indicator.key as IndicatorType))
        : null;

      return chartLabels.map((label, index) => {
        // Sum realized from selected BUs (filtered series wins when active)
        const realizadoModeloAtual = includesModeloAtual ? (maQty ? (maQty[index] || 0) : (modeloAtualData.qty[index] || 0)) : 0;
        const realizadoO2Tax = includesO2Tax ? (o2tQty ? (o2tQty[index] || 0) : (o2taxData.qty[index] || 0)) : 0;
        const realizadoOxyHacker = includesOxyHacker ? (oxyQty ? (oxyQty[index] || 0) : (oxyHackerData.qty[index] || 0)) : 0;
        const realizadoFranquia = includesFranquia ? (frQty ? (frQty[index] || 0) : (expansaoData.qty[index] || 0)) : 0;

        // Sum metas from selected BUs
        const metaTotal = grouping === 'monthly'
          ? (metasModeloAtual[index] ?? 0) + (metasO2Tax[index] ?? 0) + (metasOxyHacker[index] ?? 0) + (metasFranquia[index] ?? 0)
          : (metasProrateadas[index] ?? 0);

        return {
          label,
          realizado: realizadoModeloAtual + realizadoO2Tax + realizadoOxyHacker + realizadoFranquia,
          meta: metaTotal,
        };
      });
    }
    
    // Fallback: use external db data for Modelo Atual
    const fallbackData = getModeloAtualGroupedData(indicator.key as ModeloAtualIndicator, startDate, endDate, grouping);
    const metaDiaria = indicator.annualMeta / 365;
    
    const getMetaPerPoint = (index: number): number => {
      if (grouping === 'daily') {
        return metaDiaria;
      } else if (grouping === 'weekly') {
        const numWeeks = chartLabels.length;
        const fullWeekDays = 7;
        const lastWeekDays = daysInPeriod - (numWeeks - 1) * 7;
        return metaDiaria * (index === numWeeks - 1 ? lastWeekDays : fullWeekDays);
      } else {
        const months = eachMonthOfInterval({ start: startDate, end: endDate });
        if (index >= months.length) return 0;
        const monthStart = months[index];
        const monthEnd = index < months.length - 1 ? addDays(months[index + 1], -1) : endDate;
        const daysInMonth = differenceInDays(monthEnd, monthStart) + 1;
        return metaDiaria * daysInMonth;
      }
    };
    
    return chartLabels.map((label, index) => ({ 
      label, 
      realizado: fallbackData.qty[index] || 0, 
      meta: Math.round(getMetaPerPoint(index)) 
    }));
  };

  // Function to convert chart data to accumulated (running sum) view
  const toAccumulatedData = (data: { label: string; realizado: number; meta: number }[]) => {
    let accumulatedRealized = 0;
    let accumulatedMeta = 0;
    return data.map((item) => {
      accumulatedRealized += item.realizado;
      accumulatedMeta += item.meta;
      return {
        label: item.label,
        realizado: Math.round(accumulatedRealized),
        meta: Math.round(accumulatedMeta),
      };
    });
  };

  // Get chart data with optional accumulation based on viewMode
  const getChartDataForIndicator = (indicator: IndicatorConfig) => {
    const baseData = buildChartData(indicator);
    return viewMode === 'accumulated' ? toAccumulatedData(baseData) : baseData;
  };

  // Get detail items for an indicator based on selected BUs and closer/SDR filters
  // Uses the SAME BU exclusion logic as getRealizedForIndicator:
  // If a closer/SDR is selected and doesn't operate in a BU, skip that BU entirely
  const getItemsForIndicator = (indicatorKey: IndicatorType): DetailItem[] => {
    let items: DetailItem[] = [];
    
    // Modelo Atual: Include if no closer/SDR filter OR at least one selected closer/SDR operates here
    if (includesModeloAtual) {
      const closersForBU = effectiveSelectedClosers.filter(c => 
        BU_CLOSERS.modelo_atual.includes(c as CloserType)
      );
      const sdrsForBU = effectiveSelectedSDRs.filter(s => 
        BU_SDRS.modelo_atual.includes(s)
      );
      
      const includeByCloser = closersForBU.length > 0 || effectiveSelectedClosers.filter(c => c !== NO_CLOSER_VALUE).length === 0;
      const includeBySdr = sdrsForBU.length > 0 || effectiveSelectedSDRs.filter(s => s !== NO_SDR_VALUE).length === 0;
      
      if (includeByCloser && includeBySdr) {
        const buItems = modeloAtualAnalytics.getDetailItemsForIndicator(indicatorKey);
        const filteredItems = buItems.filter(item => {
          const matchCloser = effectiveSelectedClosers.length === 0 || matchesCloserFilter(item.closer);
          const matchSdr = effectiveSelectedSDRs.length === 0 || matchesSdrFilter(item.sdr || item.responsible);
          return matchCloser && matchSdr && matchesOrigemFilter(item);
        });
        items = [...items, ...filteredItems];
      }
    }

    // O2 TAX: Include if no closer/SDR filter OR at least one selected closer/SDR operates here
    if (includesO2Tax) {
      const closersForBU = effectiveSelectedClosers.filter(c => 
        BU_CLOSERS.o2_tax.includes(c as CloserType)
      );
      const sdrsForBU = effectiveSelectedSDRs.filter(s => 
        BU_SDRS.o2_tax.includes(s)
      );
      
      const includeByCloser = closersForBU.length > 0 || effectiveSelectedClosers.filter(c => c !== NO_CLOSER_VALUE).length === 0;
      const includeBySdr = sdrsForBU.length > 0 || effectiveSelectedSDRs.filter(s => s !== NO_SDR_VALUE).length === 0;
      
      if (includeByCloser && includeBySdr) {
        const buItems = o2TaxAnalytics.getDetailItemsForIndicator(indicatorKey);
        const filteredItems = buItems.filter(item => {
          const matchCloser = effectiveSelectedClosers.length === 0 || matchesCloserFilter(item.closer || item.responsible);
          const matchSdr = effectiveSelectedSDRs.length === 0 || matchesSdrFilter(item.sdr || item.responsible);
          return matchCloser && matchSdr && matchesOrigemFilter(item);
        });
        items = [...items, ...filteredItems];
      }
    }

    // Franquia: Include if no closer/SDR filter OR at least one selected closer/SDR operates here
    if (includesFranquia) {
      const closersForBU = effectiveSelectedClosers.filter(c => 
        BU_CLOSERS.franquia.includes(c as CloserType)
      );
      const sdrsForBU = effectiveSelectedSDRs.filter(s => 
        BU_SDRS.franquia.includes(s)
      );
      
      const includeByCloser = closersForBU.length > 0 || effectiveSelectedClosers.filter(c => c !== NO_CLOSER_VALUE).length === 0;
      const includeBySdr = sdrsForBU.length > 0 || effectiveSelectedSDRs.filter(s => s !== NO_SDR_VALUE).length === 0;
      
      if (includeByCloser && includeBySdr) {
        const hasPeopleOrOrigemFilter = effectiveSelectedClosers.length > 0 || effectiveSelectedSDRs.length > 0 || selectedOrigens.length > 0;
        if (hasPeopleOrOrigemFilter) {
          // Filters active → fall back to analytics hook (carries closer/sdr/origem fields)
          const buItems = franquiaAnalytics.getDetailItemsForIndicator(indicatorKey);
          const filteredItems = buItems.filter(item => {
            const matchCloser = effectiveSelectedClosers.length === 0 || matchesCloserFilter(item.closer || item.responsible);
            const matchSdr = effectiveSelectedSDRs.length === 0 || matchesSdrFilter(item.sdr || item.responsible);
            return matchCloser && matchSdr && matchesOrigemFilter(item);
          });
          items = [...items, ...filteredItems];
        } else {
          // No filters → use metas hook (same source as gauges)
          const franquiaItems = getExpansaoDetailItems(indicatorKey as ExpansaoIndicator, startDate, endDate);
          items = [...items, ...franquiaItems];
        }
      }
    }

    // Oxy Hacker: Include if no closer/SDR filter OR at least one selected closer/SDR operates here
    if (includesOxyHacker) {
      const closersForBU = effectiveSelectedClosers.filter(c => 
        BU_CLOSERS.oxy_hacker.includes(c as CloserType)
      );
      const sdrsForBU = effectiveSelectedSDRs.filter(s => 
        BU_SDRS.oxy_hacker.includes(s)
      );
      
      const includeByCloser = closersForBU.length > 0 || effectiveSelectedClosers.filter(c => c !== NO_CLOSER_VALUE).length === 0;
      const includeBySdr = sdrsForBU.length > 0 || effectiveSelectedSDRs.filter(s => s !== NO_SDR_VALUE).length === 0;
      
      if (includeByCloser && includeBySdr) {
        const hasPeopleOrOrigemFilter = effectiveSelectedClosers.length > 0 || effectiveSelectedSDRs.length > 0 || selectedOrigens.length > 0;
        if (hasPeopleOrOrigemFilter) {
          const buItems = oxyHackerAnalytics.getDetailItemsForIndicator(indicatorKey);
          const filteredItems = buItems.filter(item => {
            const matchCloser = effectiveSelectedClosers.length === 0 || matchesCloserFilter(item.closer || item.responsible);
            const matchSdr = effectiveSelectedSDRs.length === 0 || matchesSdrFilter(item.sdr || item.responsible);
            return matchCloser && matchSdr && matchesOrigemFilter(item);
          });
          items = [...items, ...filteredItems];
        } else {
          items = [...items, ...getOxyHackerDetailItems(indicatorKey as OxyHackerIndicator, startDate, endDate)];
        }
      }
    }
    // MONETIZAÇÃO (transversal): só Proposta e Venda
    if (
      (indicatorKey === 'proposta' || indicatorKey === 'venda') &&
      (selectedOrigens.length === 0 || selectedOrigens.includes('monetizacao'))
    ) {
      items = [...items, ...monetizacaoAnalytics.getDetailItemsForIndicator(indicatorKey)];
    }

    return items;
  };


  // Pre-compute items for each indicator for Weekly/Monthly comparison panels.
  // This avoids stale-closure issues when passing getItemsForIndicator as a callback.
  const itemsByIndicator = useMemo(() => {
    const map: Record<string, DetailItem[]> = {};
    for (const config of indicatorConfigs) {
      map[config.key] = getItemsForIndicator(config.key);
    }
    return map;
  }, [
    // Re-compute when any analytics data changes (loading -> loaded)
    modeloAtualAnalytics.isLoading, modeloAtualAnalytics.cards,
    o2TaxAnalytics.isLoading,
    franquiaAnalytics.isLoading,
    oxyHackerAnalytics.isLoading,
    // Re-compute when BU/closer/SDR filters change
    includesModeloAtual, includesO2Tax, includesFranquia, includesOxyHacker,
    effectiveSelectedClosers, effectiveSelectedSDRs, selectedOrigens,
    // Re-compute when date range changes
    startDate, endDate,
  ]);

  // COHORT MODE: Get items for indicator using full card history
  // (for accurate tier conversion analysis across month boundaries)
  const getItemsWithFullHistory = (indicatorKey: IndicatorType): DetailItem[] => {
    let items: DetailItem[] = [];
    
    // Modelo Atual
    if (includesModeloAtual) {
      const closersForBU = effectiveSelectedClosers.filter(c => 
        BU_CLOSERS.modelo_atual.includes(c as CloserType)
      );
      const sdrsForBU = effectiveSelectedSDRs.filter(s => 
        BU_SDRS.modelo_atual.includes(s)
      );
      
      const includeByCloser = closersForBU.length > 0 || effectiveSelectedClosers.filter(c => c !== NO_CLOSER_VALUE).length === 0;
      const includeBySdr = sdrsForBU.length > 0 || effectiveSelectedSDRs.filter(s => s !== NO_SDR_VALUE).length === 0;
      
      if (includeByCloser && includeBySdr) {
        const buItems = modeloAtualAnalytics.getDetailItemsWithFullHistory(indicatorKey);
        const filteredItems = buItems.filter(item => {
          const matchCloser = effectiveSelectedClosers.length === 0 || matchesCloserFilter(item.closer);
          const matchSdr = effectiveSelectedSDRs.length === 0 || matchesSdrFilter(item.sdr || item.responsible);
          return matchCloser && matchSdr && matchesOrigemFilter(item);
        });
        items = [...items, ...filteredItems];
      }
    }
    
    // O2 TAX
    if (includesO2Tax) {
      const closersForBU = effectiveSelectedClosers.filter(c => 
        BU_CLOSERS.o2_tax.includes(c as CloserType)
      );
      const sdrsForBU = effectiveSelectedSDRs.filter(s => 
        BU_SDRS.o2_tax.includes(s)
      );
      
      const includeByCloser = closersForBU.length > 0 || effectiveSelectedClosers.filter(c => c !== NO_CLOSER_VALUE).length === 0;
      const includeBySdr = sdrsForBU.length > 0 || effectiveSelectedSDRs.filter(s => s !== NO_SDR_VALUE).length === 0;
      
      if (includeByCloser && includeBySdr) {
        const buItems = o2TaxAnalytics.getDetailItemsWithFullHistory(indicatorKey);
        const filteredItems = buItems.filter(item => {
          const matchCloser = effectiveSelectedClosers.length === 0 || matchesCloserFilter(item.closer || item.responsible);
          const matchSdr = effectiveSelectedSDRs.length === 0 || matchesSdrFilter(item.sdr || item.responsible);
          return matchCloser && matchSdr && matchesOrigemFilter(item);
        });
        items = [...items, ...filteredItems];
      }
    }
    
    // Franquia
    if (includesFranquia) {
      const closersForBU = effectiveSelectedClosers.filter(c => 
        BU_CLOSERS.franquia.includes(c as CloserType)
      );
      const sdrsForBU = effectiveSelectedSDRs.filter(s => 
        BU_SDRS.franquia.includes(s)
      );
      
      const includeByCloser = closersForBU.length > 0 || effectiveSelectedClosers.filter(c => c !== NO_CLOSER_VALUE).length === 0;
      const includeBySdr = sdrsForBU.length > 0 || effectiveSelectedSDRs.filter(s => s !== NO_SDR_VALUE).length === 0;
      
      if (includeByCloser && includeBySdr) {
        const buItems = franquiaAnalytics.getDetailItemsWithFullHistory(indicatorKey);
        const filteredItems = buItems.filter(item => {
          const matchCloser = effectiveSelectedClosers.length === 0 || matchesCloserFilter(item.closer || item.responsible);
          const matchSdr = effectiveSelectedSDRs.length === 0 || matchesSdrFilter(item.sdr || item.responsible);
          return matchCloser && matchSdr && matchesOrigemFilter(item);
        });
        items = [...items, ...filteredItems];
      }
    }
    
    // Oxy Hacker
    if (includesOxyHacker) {
      const closersForBU = effectiveSelectedClosers.filter(c => 
        BU_CLOSERS.oxy_hacker.includes(c as CloserType)
      );
      const sdrsForBU = effectiveSelectedSDRs.filter(s => 
        BU_SDRS.oxy_hacker.includes(s)
      );
      
      const includeByCloser = closersForBU.length > 0 || effectiveSelectedClosers.filter(c => c !== NO_CLOSER_VALUE).length === 0;
      const includeBySdr = sdrsForBU.length > 0 || effectiveSelectedSDRs.filter(s => s !== NO_SDR_VALUE).length === 0;
      
      if (includeByCloser && includeBySdr) {
        const buItems = oxyHackerAnalytics.getDetailItemsWithFullHistory(indicatorKey);
        const filteredItems = buItems.filter(item => {
          const matchCloser = effectiveSelectedClosers.length === 0 || matchesCloserFilter(item.closer || item.responsible);
          const matchSdr = effectiveSelectedSDRs.length === 0 || matchesSdrFilter(item.sdr || item.responsible);
          return matchCloser && matchSdr && matchesOrigemFilter(item);
        });
        items = [...items, ...filteredItems];
      }
    }
    
    return items;
  };

  // === STRATEGIC DRILL-DOWN HANDLERS ===
  
  // Build active filters description
  const buildActiveFilters = (): string[] => {
    const filters: string[] = [];
    const buLabels = selectedBUs.map(bu => buOptions.find(o => o.value === bu)?.label || bu).join(', ');
    filters.push(`BUs selecionadas: ${buLabels}`);
    if (effectiveSelectedClosers.length > 0) filters.push(`Closers: ${effectiveSelectedClosers.join(', ')}`);
    if (effectiveSelectedSDRs.length > 0) filters.push(`SDRs: ${effectiveSelectedSDRs.join(', ')}`);
    filters.push(`Período: ${format(startDate, 'dd/MM/yyyy')} a ${format(endDate, 'dd/MM/yyyy')}`);
    return filters;
  };

  // Handle radial card click with strategic narratives
  const handleRadialCardClick = (indicator: IndicatorConfig) => {
    const items = getItemsForIndicator(indicator.key);
    const now = new Date();
    setDetailSheetExtraContent(null);
    
    switch (indicator.key) {
      case 'mql': {
        // MQL: "De Onde Vêm Nossos Melhores Leads?"
        // KPIs para MQL
        const kpis: KpiItem[] = [
          { icon: '📊', value: items.length, label: 'Total MQLs', highlight: 'neutral' },
        ];
        
        // Charts para MQL - Distribuição por Faixa de Faturamento
        const revenueRangeCounts = new Map<string, number>();
        items.forEach(i => {
          const range = i.revenueRange || 'Não informado';
          revenueRangeCounts.set(range, (revenueRangeCounts.get(range) || 0) + 1);
        });
        const revenueRangeData = Array.from(revenueRangeCounts.entries())
          .map(([label, value]) => {
            const isHigh = label.toLowerCase().includes('50') || label.toLowerCase().includes('100') || label.toLowerCase().includes('acima');
            return { label, value, highlight: isHigh ? 'success' as const : 'neutral' as const };
          })
          .sort((a, b) => b.value - a.value);
        
        const TIER_ORDER = ['Ainda não fatura', '< R$ 100k', 'R$ 100k - 200k', 'R$ 200k - 350k', 'R$ 350k - 500k', 'R$ 500k - 1M', 'R$ 1M - 5M', '> R$ 5M'];
        
        const charts: ChartConfig[] = [
          { type: 'bar', title: 'Por Faixa de Faturamento', data: revenueRangeData, sortable: true, sortOrder: TIER_ORDER },
        ];
        
        setDetailSheetTitle('MQL - De Onde Vêm Nossos Melhores Leads?');
        setDetailSheetDescription(
          `${items.length} MQLs captados no período`
        );
        setDetailSheetKpis(kpis);
        setDetailSheetCharts(charts);
        setDetailSheetColumns([
          { key: 'product', label: 'Produto', format: columnFormatters.product },
          { key: 'company', label: 'Empresa' },
          { key: 'revenueRange', label: 'Faixa Faturamento', format: columnFormatters.revenueRange },
          { key: 'date', label: 'Data', format: columnFormatters.date },
        ]);
        setDetailSheetItems(items);
        // Filter criteria for MQL
        const mqlCriteria: FilterCriteriaGroup[] = [];
        if (selectedBUs.includes('modelo_atual')) {
          mqlCriteria.push({
            title: '▸ Modelo Atual',
            items: [
              'Faturamento da empresa ≥ R$ 200 mil (faixas aceitas: R$200-350k, R$350-500k, R$500k-1M, R$1-5M, acima de R$5M)',
              'Data de criação do lead dentro do período selecionado',
              'Exclui cards de teste',
              'Exclui leads com motivo de perda: Duplicado, Pessoa física/fora do ICP, Não é demanda real, Buscando parceria, Quer soluções para cliente, Não é MQL mas entrou como MQL, Email/Telefone Inválido',
            ],
          });
        }
        if (selectedBUs.includes('o2_tax')) {
          mqlCriteria.push({
            title: '▸ O2 TAX',
            items: [
              'Faturamento da empresa ≥ R$ 500 mil',
              'Data de criação do lead dentro do período selecionado',
              'Mesma lógica de exclusão por motivo de perda do Modelo Atual',
            ],
          });
        }
        if (selectedBUs.includes('oxy_hacker')) {
          mqlCriteria.push({
            title: '▸ Oxy Hacker',
            items: [
              'MQL = Leads filtrados pelo investimento disponível informado no Pipefy',
              'Faixas de investimento aceitas: Menos de R$ 54k, Menos de R$ 100k, Menos de R$ 140k, Menos de R$ 250k, Menos de R$ 360k, Menos de R$ 400k, Menos de R$ 500k, Mais de R$ 500k',
              'Ou seja: qualquer lead com investimento informado é considerado MQL',
              'Funil cumulativo: cards em fases avançadas sem histórico de Lead também são contados',
              'Data de criação do lead dentro do período selecionado',
            ],
          });
        }
        if (selectedBUs.includes('franquia')) {
          mqlCriteria.push({
            title: '▸ Franquia',
            items: [
              'MQL = Leads filtrados pelo investimento disponível informado no Pipefy',
              'Faixas de investimento aceitas: Menos de R$ 140k, Menos de R$ 250k, Menos de R$ 360k, Menos de R$ 400k, Menos de R$ 500k, Mais de R$ 500k',
              'Ou seja: qualquer lead com investimento informado é considerado MQL',
              'Funil cumulativo: cards em fases avançadas sem histórico de Lead também são contados',
              'Data de criação do lead dentro do período selecionado',
            ],
          });
        }
        mqlCriteria.push({ title: '▸ Filtros ativos', items: buildActiveFilters() });
        setDetailSheetFilterCriteria(mqlCriteria);
        setDetailSheetOpen(true);
        return;
      }
      
      case 'rm': {
        // RM: "Estamos Convertendo MQLs em Reuniões?"
        const mqlCount = getRealizedForIndicator(indicatorConfigs.find(c => c.key === 'mql')!);
        const taxaMqlRm = mqlCount > 0 ? Math.round((items.length / mqlCount) * 100) : 0;
        
        const itemsWithCalcs = items.map(item => {
          const diasComoMQL = item.duration ? Math.floor(item.duration / 86400) : 0;
          return { ...item, diasComoMQL };
        });
        
        const avgDias = itemsWithCalcs.length > 0 
          ? Math.round(itemsWithCalcs.reduce((sum, i) => sum + (i.diasComoMQL || 0), 0) / itemsWithCalcs.length)
          : 0;
        const topSdr = findTopPerformer(items, 'sdr');
        
        // KPIs para RM
        const kpis: KpiItem[] = [
          { icon: '📅', value: items.length, label: 'Reuniões', highlight: 'neutral' },
          { icon: '🎯', value: `${taxaMqlRm}%`, label: 'Taxa MQL→RM', highlight: taxaMqlRm >= 50 ? 'success' : taxaMqlRm >= 30 ? 'neutral' : 'warning' },
          { icon: '⏱️', value: `${avgDias}d`, label: 'Tempo Médio', highlight: avgDias <= 7 ? 'success' : avgDias <= 14 ? 'neutral' : 'warning' },
          { icon: '🏆', value: topSdr.name.split(' ')[0], label: `Top (${topSdr.count})`, highlight: 'neutral' },
        ];
        
        // Charts para RM
        // 1. Ranking de SDRs por quantidade
        const sdrCounts = new Map<string, number>();
        items.forEach(i => {
          const sdr = i.sdr || 'Sem SDR';
          sdrCounts.set(sdr, (sdrCounts.get(sdr) || 0) + 1);
        });
        const sdrRankingData = Array.from(sdrCounts.entries())
          .map(([label, value]) => ({ label: label.split(' ')[0], value }))
          .sort((a, b) => b.value - a.value);

        // 2. Tempo como MQL antes de agendar
        const tempoDistribution = [
          { label: '1-7 dias', value: itemsWithCalcs.filter(i => (i.diasComoMQL || 0) <= 7).length, highlight: 'success' as const },
          { label: '8-14 dias', value: itemsWithCalcs.filter(i => (i.diasComoMQL || 0) > 7 && (i.diasComoMQL || 0) <= 14).length, highlight: 'neutral' as const },
          { label: '15-30 dias', value: itemsWithCalcs.filter(i => (i.diasComoMQL || 0) > 14 && (i.diasComoMQL || 0) <= 30).length, highlight: 'warning' as const },
          { label: '30+ dias', value: itemsWithCalcs.filter(i => (i.diasComoMQL || 0) > 30).length, highlight: 'danger' as const },
        ];

        // 3. Reuniões por Tier de Faturamento
        const rmTierCounts = new Map<string, number>();
        items.forEach(i => {
          const tier = normalizeTier(i.revenueRange);
          rmTierCounts.set(tier, (rmTierCounts.get(tier) || 0) + 1);
        });
        const rmByTier = TIER_ORDER
          .map(label => ({ label, value: rmTierCounts.get(label) || 0 }))
          .filter(d => d.value > 0);
        Array.from(rmTierCounts.entries())
          .filter(([label]) => !TIER_ORDER.includes(label))
          .forEach(([label, value]) => rmByTier.push({ label, value }));

        const charts: ChartConfig[] = [
          { type: 'bar', title: 'Ranking por SDR', data: sdrRankingData },
          { type: 'distribution', title: 'Tempo como MQL', data: tempoDistribution },
          { type: 'bar', title: 'Reuniões por Tier de Faturamento', data: rmByTier },
        ];
        
        setDetailSheetTitle('RM - Estamos Convertendo MQLs em Reuniões?');
        setDetailSheetDescription(
          `${items.length} reuniões agendadas | Taxa MQL→RM: ${taxaMqlRm}% | Tempo médio: ${avgDias}d | Top: ${topSdr.name} (${topSdr.count})`
        );
        setDetailSheetKpis(kpis);
        setDetailSheetCharts(charts);
        setDetailSheetExtraContent(buildProdutoBreakdown(itemsWithCalcs, 'value'));
        setDetailSheetColumns([
          { key: 'product', label: 'Produto', format: columnFormatters.product },
          { key: 'company', label: 'Empresa' },
          { key: 'sdr', label: 'SDR' },
          { key: 'diasComoMQL', label: 'Dias como MQL', format: columnFormatters.diasAteAgendar },
          { key: 'revenueRange', label: 'Faixa Faturamento', format: columnFormatters.revenueRange },
          { key: 'date', label: 'Data', format: columnFormatters.date },
        ]);
        setDetailSheetItems(itemsWithCalcs);
        setDetailSheetFilterCriteria([
          { title: '▸ Reunião Agendada (RM)', items: [
            'Card entrou na fase "Reunião agendada" ou "Qualificado" dentro do período selecionado',
            'Conta a primeira vez que o card aparece nesta fase (evita duplicação)',
            'A data considerada é a data da primeira movimentação para esta fase',
            'Para Modelo Atual e O2 TAX: fase "Reunião agendada / Qualificado" no Pipefy',
            'Para Oxy Hacker e Franquia: fase equivalente no pipe de Expansão',
          ]},
          { title: '▸ Filtros ativos', items: buildActiveFilters() },
        ]);
        setDetailSheetOpen(true);
        return;
      }
      
      case 'rr': {
        // RR: "Quem Apareceu nas Reuniões?"
        const rmCount = getRealizedForIndicator(indicatorConfigs.find(c => c.key === 'rm')!);
        const taxaShow = rmCount > 0 ? Math.round((items.length / rmCount) * 100) : 0;
        const noShows = rmCount - items.length;
        const potencial = items.reduce((sum, i) => sum + (i.value || 0), 0);
        const topCloser = findTopPerformer(items, 'closer');
        
        // KPIs para RR
        const kpis: KpiItem[] = [
          { icon: '✅', value: items.length, label: 'Realizadas', highlight: 'neutral' },
          { icon: '📊', value: `${taxaShow}%`, label: 'Taxa Show', highlight: taxaShow >= 80 ? 'success' : taxaShow >= 60 ? 'neutral' : 'warning' },
          { icon: '❌', value: noShows > 0 ? noShows : '-', label: 'No-Shows', highlight: noShows > 5 ? 'danger' : noShows > 0 ? 'warning' : 'success' },
          { icon: '💰', value: formatCompactCurrency(potencial), label: 'Potencial', highlight: 'neutral' },
          { icon: '🏆', value: topCloser.name.split(' ')[0], label: `Top`, highlight: 'neutral' },
        ];
        
        // Charts para RR
        // 1. Ranking de Closers por taxa de show
        const closerStats = new Map<string, { realized: number }>();
        items.forEach(i => {
          const closer = i.responsible || i.closer || 'Sem Closer';
          const stats = closerStats.get(closer) || { realized: 0 };
          stats.realized += 1;
          closerStats.set(closer, stats);
        });
        const closerRankingData = Array.from(closerStats.entries())
          .map(([label, stats]) => ({ label: label.split(' ')[0], value: stats.realized }))
          .sort((a, b) => b.value - a.value);
        
        // 2. Potencial por faixa de faturamento
        const revenueRangeCounts = new Map<string, number>();
        items.forEach(i => {
          const range = i.revenueRange || 'Não informado';
          revenueRangeCounts.set(range, (revenueRangeCounts.get(range) || 0) + 1);
        });
        const revenueRangeData = Array.from(revenueRangeCounts.entries())
          .map(([label, value]) => ({ label, value }))
          .sort((a, b) => b.value - a.value);
        
        const charts: ChartConfig[] = [
          { type: 'bar', title: 'Ranking por Closer', data: closerRankingData },
          { type: 'bar', title: 'Por Faixa Faturamento', data: revenueRangeData },
        ];
        
        setDetailSheetTitle('RR - Quem Apareceu nas Reuniões?');
        setDetailSheetDescription(
          `${items.length} realizadas | Taxa Show: ${taxaShow}% (${items.length} de ${rmCount}) | ${noShows > 0 ? `${noShows} no-shows | ` : ''}Potencial: ${formatCompactCurrency(potencial)} | Top: ${topCloser.name}`
        );
        setDetailSheetKpis(kpis);
        setDetailSheetCharts(charts);
        setDetailSheetExtraContent(buildProdutoBreakdown(items, 'value'));
        setDetailSheetColumns([
          { key: 'product', label: 'Produto', format: columnFormatters.product },
          { key: 'company', label: 'Empresa' },
          { key: 'responsible', label: 'Closer' },
          { key: 'revenueRange', label: 'Faixa Faturamento', format: columnFormatters.revenueRange },
          { key: 'duration', label: 'Tempo até Reunir', format: columnFormatters.duration },
          { key: 'date', label: 'Data', format: columnFormatters.date },
        ]);
        setDetailSheetItems(items);
        setDetailSheetFilterCriteria([
          { title: '▸ Reunião Realizada (RR)', items: [
            'Card entrou na fase "Reunião Realizada" ou "1ª Reunião Realizada - Apresentação" dentro do período',
            'Conta a primeira vez que o card aparece nesta fase (evita duplicação)',
            'A data considerada é a data da primeira movimentação para esta fase',
            'Para Modelo Atual e O2 TAX: fase "Reunião Realizada" no Pipefy',
            'Para Oxy Hacker e Franquia: fase equivalente no pipe de Expansão',
          ]},
          { title: '▸ Filtros ativos', items: buildActiveFilters() },
        ]);
        setDetailSheetOpen(true);
        return;
      }
      
      case 'proposta': {
        // Proposta: "Onde o Pipeline Está Travando?"
        const isExpansaoBU = selectedBUs.length === 1 && 
          (selectedBUs[0] === 'franquia' || selectedBUs[0] === 'oxy_hacker');
        const getItemValue = (item: DetailItem) => 
          isExpansaoBU ? (item.pontual || 0) : (item.value || 0);

        const itemsWithAging = items.map(item => {
          const entryDate = item.date ? new Date(item.date) : now;
          const diasEmProposta = Math.floor((now.getTime() - entryDate.getTime()) / 86400000);
          return { ...item, diasEmProposta };
        });
        
        const pipeline = items.reduce((sum, i) => sum + getItemValue(i), 0);
        const ticketMedio = items.length > 0 ? pipeline / items.length : 0;
        const propostasAntigas = itemsWithAging.filter(i => (i.diasEmProposta || 0) > 14);
        const valorEmRisco = propostasAntigas.reduce((sum, i) => sum + getItemValue(i), 0);
        
        // KPIs para Proposta
        const pipelineLabel = isExpansaoBU ? 'Valor Pontual' : 'Pipeline';
        const kpis: KpiItem[] = [
          { icon: '📊', value: items.length, label: 'Propostas', highlight: 'neutral' },
          { icon: '💰', value: formatCompactCurrency(pipeline), label: pipelineLabel, highlight: 'neutral' },
          { icon: '🎯', value: formatCompactCurrency(ticketMedio), label: 'Ticket Médio', highlight: 'neutral' },
          { icon: '⚠️', value: propostasAntigas.length, label: 'Envelhecidas', highlight: propostasAntigas.length > 0 ? 'warning' : 'success' },
          { icon: '🔴', value: formatCompactCurrency(valorEmRisco), label: 'em Risco', highlight: valorEmRisco > 0 ? 'danger' : 'success' },
        ];
        
        // Charts para Proposta
        // 1. Pipeline por Closer
        const closerTotals = new Map<string, number>();
        itemsWithAging.forEach(i => {
          const closer = i.responsible || i.closer || 'Sem Closer';
          closerTotals.set(closer, (closerTotals.get(closer) || 0) + getItemValue(i));
        });
        const pipelineByCloserData = Array.from(closerTotals.entries())
          .map(([label, value]) => ({ label: label.split(' ')[0], value }))
          .sort((a, b) => b.value - a.value);
        
        // 2. Aging das Propostas
        const agingDistribution = [
          { label: '0-7 dias', value: itemsWithAging.filter(i => (i.diasEmProposta || 0) <= 7).length, highlight: 'success' as const },
          { label: '8-14 dias', value: itemsWithAging.filter(i => (i.diasEmProposta || 0) > 7 && (i.diasEmProposta || 0) <= 14).length, highlight: 'neutral' as const },
          { label: '15-30 dias', value: itemsWithAging.filter(i => (i.diasEmProposta || 0) > 14 && (i.diasEmProposta || 0) <= 30).length, highlight: 'warning' as const },
          { label: '30+ dias', value: itemsWithAging.filter(i => (i.diasEmProposta || 0) > 30).length, highlight: 'danger' as const },
        ];

        // 3. Propostas por Tier de Faturamento
        const tierCounts = new Map<string, number>();
        itemsWithAging.forEach(i => {
          const tier = normalizeTier(i.revenueRange);
          tierCounts.set(tier, (tierCounts.get(tier) || 0) + 1);
        });
        const propostasByTier = TIER_ORDER
          .map(label => ({ label, value: tierCounts.get(label) || 0 }))
          .filter(d => d.value > 0);
        Array.from(tierCounts.entries())
          .filter(([label]) => !TIER_ORDER.includes(label))
          .forEach(([label, value]) => propostasByTier.push({ label, value }));

        const charts: ChartConfig[] = [
          { type: 'bar', title: 'Pipeline por Closer', data: pipelineByCloserData, formatValue: formatCompactCurrency },
          { type: 'distribution', title: 'Aging das Propostas', data: agingDistribution },
          { type: 'bar', title: 'Propostas por Tier de Faturamento', data: propostasByTier },
        ];
        
        const descricao = `${items.length} propostas | ${pipelineLabel}: ${formatCompactCurrency(pipeline)} | Ticket médio: ${formatCompactCurrency(ticketMedio)}` +
          (propostasAntigas.length > 0 
            ? ` | ⚠️ ${propostasAntigas.length} com mais de 14 dias (${formatCompactCurrency(valorEmRisco)} em risco)` 
            : ' | ✅ Nenhuma envelhecida');
        
        setDetailSheetTitle('Propostas - Onde o Pipeline Está Travando?');
        setDetailSheetDescription(descricao);
        setDetailSheetKpis(kpis);
        setDetailSheetCharts(charts);
        setDetailSheetExtraContent(buildProdutoBreakdown(itemsWithAging, isExpansaoBU ? 'pontual' : 'value'));
        setDetailSheetColumns(isExpansaoBU ? [
          { key: 'product', label: 'Produto', format: columnFormatters.product },
          { key: 'company', label: 'Empresa' },
          { key: 'phase', label: 'Fase Atual', format: columnFormatters.phase },
          { key: 'pontual', label: 'Valor Pontual', format: columnFormatters.currency },
          { key: 'responsible', label: 'Closer' },
          { key: 'diasEmProposta', label: 'Dias em Proposta', format: columnFormatters.agingWithAlert },
          { key: 'date', label: 'Data Envio', format: columnFormatters.date },
        ] : [
          { key: 'product', label: 'Produto', format: columnFormatters.product },
          { key: 'company', label: 'Empresa' },
          { key: 'phase', label: 'Fase Atual', format: columnFormatters.phase },
          { key: 'value', label: 'Valor Total', format: columnFormatters.currency },
          { key: 'mrr', label: 'MRR', format: columnFormatters.currency },
          { key: 'responsible', label: 'Closer' },
          { key: 'diasEmProposta', label: 'Dias em Proposta', format: columnFormatters.agingWithAlert },
          { key: 'date', label: 'Data Envio', format: columnFormatters.date },
        ]);

        // Sort by aging descending (oldest first = action needed)
        setDetailSheetItems(itemsWithAging.sort((a, b) => (b.diasEmProposta || 0) - (a.diasEmProposta || 0)));
        setDetailSheetFilterCriteria([
          { title: '▸ Proposta Enviada', items: [
            'Card está na fase "Proposta Enviada" ou "Negociação" no período selecionado',
            'Inclui propostas ativas (ainda não ganhas nem perdidas)',
            'O "aging" mostra quantos dias o card está nesta fase',
            'Propostas com mais de 14 dias são marcadas como "envelhecidas" (⚠️ em risco)',
          ]},
          { title: '▸ Filtros ativos', items: buildActiveFilters() },
        ]);
        setDetailSheetOpen(true);
        return;
      }
      
      case 'venda': {
        // Venda: "O Que Fechamos e Como?" - com TCV (Total Contract Value)
        const totalMrr = items.reduce((sum, i) => sum + (i.mrr || 0), 0);
        const totalSetup = items.reduce((sum, i) => sum + (i.setup || 0), 0);
        const totalPontual = items.reduce((sum, i) => sum + (i.pontual || 0), 0);
        const totalFaturamento = items.reduce((sum, i) => sum + (i.value || 0), 0);
        
        // TCV = (MRR × 12) + Setup + Pontual
        const tcv = (totalMrr * 12) + totalSetup + totalPontual;
        const ticketMedioTCV = items.length > 0 ? tcv / items.length : 0;
        
        const pctMrr = totalFaturamento > 0 ? Math.round((totalMrr / totalFaturamento) * 100) : 0;
        const pctSetup = totalFaturamento > 0 ? Math.round((totalSetup / totalFaturamento) * 100) : 0;
        const pctPontual = totalFaturamento > 0 ? Math.round((totalPontual / totalFaturamento) * 100) : 0;
        
        // Calculate TCV for each item and cycle
        const itemsWithTCV = items.map(item => {
          const cicloVenda = (() => {
            if (!item.dataAssinatura || !item.dataCriacao) return 0;
            const ms = new Date(item.dataAssinatura).getTime() - new Date(item.dataCriacao).getTime();
            return ms > 0 ? Math.floor(ms / 86_400_000) : 0;
          })();
          const itemTCV = ((item.mrr || 0) * 12) + (item.setup || 0) + (item.pontual || 0);
          return { ...item, cicloVenda, value: itemTCV };
        });

        // Ciclo Médio (apenas contratos com ciclo > 0)
        const ciclosValidos = itemsWithTCV.map(i => i.cicloVenda).filter(c => c > 0);
        const cicloMedio = ciclosValidos.length > 0
          ? Math.round(ciclosValidos.reduce((s, c) => s + c, 0) / ciclosValidos.length)
          : 0;

        const produtoExtraContent = buildProdutoBreakdown(itemsWithTCV, 'value');

        const podium = findTopPerformerByRevenue(items);
        const podiumStr = podium.map((p, i) => {
          const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';
          return `${medal}${p.name.split(' ')[0]}`;
        }).join(' ');
        
        // KPIs para Venda com TCV
        const kpis: KpiItem[] = [
          { icon: '📝', value: items.length, label: 'Contratos', highlight: 'neutral' },
          { icon: '💵', value: formatCompactCurrency(totalSetup), label: 'Setup', highlight: 'neutral' },
          { icon: '🔁', value: formatCompactCurrency(totalMrr), label: 'MRR', highlight: 'neutral' },
          { icon: '⚡', value: formatCompactCurrency(totalPontual), label: 'Pontual', highlight: 'neutral' },
          { icon: '📊', value: formatCompactCurrency(tcv), label: 'TCV', highlight: 'success' },
          { icon: '⏱️', value: cicloMedio > 0 ? `${cicloMedio}d` : '-', label: 'Ciclo Médio', highlight: 'neutral' },
        ];
        
        // Charts para Venda
        // 1. Composição MRR/Setup/Pontual (Pie)
        const compositionData = [
          { label: 'MRR', value: totalMrr },
          { label: 'Setup', value: totalSetup },
          { label: 'Pontual', value: totalPontual },
        ].filter(d => d.value > 0);
        
        // 4. Conversão MQL→Venda por Tier de Faturamento
        const mqlItems = getItemsForIndicator('mql');
        
        // Agrupar MQLs por faixa de faturamento
        const mqlsByTier = new Map<string, number>();
        mqlItems.forEach(i => {
          const tier = i.revenueRange || 'Não informado';
          mqlsByTier.set(tier, (mqlsByTier.get(tier) || 0) + 1);
        });
        
        // Agrupar Vendas por faixa de faturamento
        const vendasByTier = new Map<string, number>();
        items.forEach(i => {
          const tier = i.revenueRange || 'Não informado';
          vendasByTier.set(tier, (vendasByTier.get(tier) || 0) + 1);
        });
        
        // Calcular taxa de conversão por tier
        const allTiers = new Set([...mqlsByTier.keys(), ...vendasByTier.keys()]);
        const conversionByTierData = Array.from(allTiers)
          .filter(tier => tier !== 'Não informado')
          .map(tier => {
            const mqls = mqlsByTier.get(tier) || 0;
            const vendas = vendasByTier.get(tier) || 0;
            const conversionRate = mqls > 0 ? (vendas / mqls) * 100 : 0;
            
            // Ordenar por faturamento (do menor para o maior)
            const tierOrder = 
              tier.includes('Até') ? 1 :
              tier.includes('50k - 200k') || tier.includes('50k-200k') ? 2 :
              tier.includes('200k - 1M') || tier.includes('200k-1M') ? 3 :
              tier.includes('Acima') || tier.includes('1M') || tier.includes('5M') ? 4 : 5;
            
            return {
              label: tier,
              value: conversionRate,
              highlight: conversionRate >= 10 ? 'success' as const : 
                         conversionRate >= 5 ? 'neutral' as const : 
                         'warning' as const,
              order: tierOrder,
            };
          })
          .sort((a, b) => a.order - b.order);
        
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
          { type: 'pie', title: 'Composição do Faturamento', data: compositionData, formatValue: formatCompactCurrency },
          ...(conversionByTierData.length > 0 ? [{ 
            type: 'bar' as const, 
            title: 'Conversão MQL→Venda por Tier', 
            data: conversionByTierData, 
            formatValue: (v: number) => `${v.toFixed(1)}%` 
          }] : []),
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
        
        setDetailSheetTitle('Vendas - Análise de Valor (TCV)');
        setDetailSheetDescription(
          `${items.length} contratos | TCV: ${formatCompactCurrency(tcv)} | MRR: ${formatCompactCurrency(totalMrr)} | Setup: ${formatCompactCurrency(totalSetup)} | Pontual: ${formatCompactCurrency(totalPontual)} | Ticket médio TCV: ${formatCompactCurrency(ticketMedioTCV)}`
        );
        setDetailSheetKpis(kpis);
        setDetailSheetCharts(charts);
        setDetailSheetExtraContent(produtoExtraContent);
        setDetailSheetColumns([
          { key: 'product', label: 'Produto', format: columnFormatters.product },
          { key: 'company', label: 'Empresa' },
          { key: 'dataAssinatura', label: 'Data Assinatura', format: columnFormatters.date },
          { key: 'mrr', label: 'MRR', format: columnFormatters.currency },
          { key: 'setup', label: 'Setup', format: columnFormatters.currency },
          { key: 'pontual', label: 'Pontual', format: columnFormatters.currency },
          { key: 'value', label: 'TCV', format: columnFormatters.currency },
          { key: 'sdr', label: 'SDR' },
          { key: 'responsible', label: 'Closer' },
          { key: 'cicloVenda', label: 'Ciclo', format: columnFormatters.cicloVenda },
        ]);
        // Sort by TCV descending
        setDetailSheetItems(itemsWithTCV.sort((a, b) => (b.value || 0) - (a.value || 0)));
        setDetailSheetFilterCriteria([
          { title: '▸ Venda Fechada', items: [
            'Card chegou na fase "Ganho" / "Contrato Assinado" dentro do período selecionado',
            'A data considerada é a data de assinatura do contrato (quando disponível)',
            'TCV = (MRR × 12) + Setup + Pontual',
            'Inclui todas as BUs selecionadas com seus respectivos valores',
          ]},
          { title: '▸ Filtros ativos', items: buildActiveFilters() },
        ]);
        setDetailSheetOpen(true);
        return;
      }
      
      default: {
        // Fallback for other indicators
        const columns = getColumnsForIndicator(indicator.key);
        setDetailSheetTitle(indicator.label);
        setDetailSheetDescription(`${formatNumber(items.length)} registros no período`);
        setDetailSheetKpis([]);
        setDetailSheetCharts([]);
        setDetailSheetItems(items);
        setDetailSheetColumns(columns);
        setDetailSheetFilterCriteria([]);
        setDetailSheetOpen(true);
      }
    }
  };

  // Get columns for indicator type (legacy, used as fallback)
  const getColumnsForIndicator = (indicatorKey: IndicatorType): { key: keyof DetailItem; label: string; format?: (value: any) => React.ReactNode }[] => {
    const baseColumns: { key: keyof DetailItem; label: string; format?: (value: any) => React.ReactNode }[] = [
      { key: 'product', label: 'Produto', format: columnFormatters.product },
      { key: 'company', label: 'Empresa/Contato' },
      { key: 'date', label: 'Data', format: columnFormatters.date },
      { key: 'duration', label: 'Tempo na Fase', format: columnFormatters.duration },
    ];

    if (indicatorKey === 'proposta' || indicatorKey === 'venda') {
      return [
        ...baseColumns,
        { key: 'mrr' as keyof DetailItem, label: 'MRR', format: columnFormatters.currency },
        { key: 'setup' as keyof DetailItem, label: 'Setup', format: columnFormatters.currency },
        { key: 'pontual' as keyof DetailItem, label: 'Pontual', format: columnFormatters.currency },
        { key: 'value' as keyof DetailItem, label: 'Total', format: columnFormatters.currency },
        { key: 'responsible' as keyof DetailItem, label: 'Responsável' },
      ];
    }

    return [
      ...baseColumns,
      { key: 'revenueRange' as keyof DetailItem, label: 'Faixa Faturamento' },
      { key: 'responsible' as keyof DetailItem, label: 'Responsável' },
    ];
  };

  // === Monetary Indicators Logic ===
  
  // Get investimento from funnelData for ROI calculation
  const getInvestimentoPeriodo = (): number => {
    if (!funnelData) return 0;
    
    let total = 0;
    const monthsInPeriod = eachMonthOfInterval({ start: startDate, end: endDate });
    
    for (const monthDate of monthsInPeriod) {
      const monthName = monthNames[getMonth(monthDate)];
      
      if (includesModeloAtual && funnelData.modeloAtual) {
        const item = funnelData.modeloAtual.find(f => f.month === monthName);
        if (item) total += item.investimento || 0;
      }
      if (includesO2Tax && funnelData.o2Tax) {
        const item = funnelData.o2Tax.find(f => f.month === monthName);
        if (item) total += item.investimento || 0;
      }
      if (includesOxyHacker && funnelData.oxyHacker) {
        const item = funnelData.oxyHacker.find(f => f.month === monthName);
        if (item) total += item.investimento || 0;
      }
      if (includesFranquia && funnelData.franquia) {
        const item = funnelData.franquia.find(f => f.month === monthName);
        if (item) total += item.investimento || 0;
      }
    }
    
    return total;
  };

  // Get faturamento meta from funnelData (calcular de vendas * ticket médio ou valor fixo)
  const getFaturamentoMetaPeriodo = (): number => {
    if (!funnelData) return 0;
    
    // Calculate meta based on sales target * average ticket per BU
    // Modelo Atual: avg ticket ~R$ 17.000
    // O2 TAX: avg ticket ~R$ 15.000
    // Franquia: avg ticket ~R$ 140.000
    // Oxy Hacker: avg ticket ~R$ 54.000
    
    let total = 0;
    const monthsInPeriod = eachMonthOfInterval({ start: startDate, end: endDate });
    
    for (const monthDate of monthsInPeriod) {
      const monthName = monthNames[getMonth(monthDate)];
      
      if (includesModeloAtual && funnelData.modeloAtual) {
        const item = funnelData.modeloAtual.find(f => f.month === monthName);
        if (item) total += (item.vendas || 0) * 17000;
      }
      if (includesO2Tax && funnelData.o2Tax) {
        const item = funnelData.o2Tax.find(f => f.month === monthName);
        if (item) total += (item.vendas || 0) * 15000;
      }
      if (includesOxyHacker && funnelData.oxyHacker) {
        const item = funnelData.oxyHacker.find(f => f.month === monthName);
        if (item) total += (item.vendas || 0) * 54000;
      }
      if (includesFranquia && funnelData.franquia) {
        const item = funnelData.franquia.find(f => f.month === monthName);
        if (item) total += (item.vendas || 0) * 140000;
      }
    }
    
    return total;
  };

  // Get realized monetary value for monetary indicators (respecting BU and Closer filters)
  const getRealizedMonetaryForIndicator = (indicator: MonetaryIndicatorConfig): number => {
    const closerFilterActive = effectiveSelectedClosers.length > 0;
    const sdrFilterActive = effectiveSelectedSDRs.length > 0;
    const filtersActive = closerFilterActive || sdrFilterActive;

    // Helper: aplica filtros de Closer e SDR aos cards de venda de uma BU.
    // Retorna null quando não há filtros (caller usa o caminho padrão otimizado).
    const filteredVendasForBU = (bu: BuType, vendas: any[]): any[] | null => {
      if (!filtersActive) return null;
      // Se SDR está ativo mas nenhuma SDR selecionada opera nessa BU, exclui a BU
      if (sdrFilterActive) {
        const sdrsForBU = effectiveSelectedSDRs.filter(s => BU_SDRS[bu]?.includes(s as any));
        if (sdrsForBU.length === 0) return [];
      }
      // Se Closer está ativo mas nenhum closer selecionado opera nessa BU, exclui a BU
      if (closerFilterActive) {
        const closersForBU = effectiveSelectedClosers.filter(c => BU_CLOSERS[bu]?.includes(c as any));
        if (closersForBU.length === 0) return [];
      }
      return vendas.filter(card => {
        const matchCloser = !closerFilterActive || matchesCloserFilter((card.closer || '').trim());
        const matchSdr = !sdrFilterActive || matchesSdrFilter((card.sdr || card.responsavel || '').trim());
        return matchCloser && matchSdr && matchesOrigemFilter(card);
      });
    };

    switch (indicator.key) {
      case 'faturamento': {
        let total = 0;

        if (includesModeloAtual) {
          const filtered = filteredVendasForBU('modelo_atual', modeloAtualAnalytics.getCardsForIndicator('venda'));
          if (filtered === null) {
            total += getModeloAtualValue('venda', startDate, endDate);
          } else {
            total += filtered.reduce((acc, card) => acc + (card.valor || 0), 0);
          }
        }

        if (includesO2Tax) {
          const filtered = filteredVendasForBU('o2_tax', o2TaxAnalytics.getCardsForIndicator('venda'));
          if (filtered === null) {
            total += o2TaxAnalytics.getCardsForIndicator('venda').reduce((acc, card) => acc + (card.valor || 0), 0);
          } else {
            total += filtered.reduce((acc, card) => acc + (card.valor || 0), 0);
          }
        }

        if (includesOxyHacker) {
          const filtered = filteredVendasForBU('oxy_hacker', oxyHackerAnalytics.getCardsForIndicator('venda'));
          if (filtered === null) {
            total += getOxyHackerValue('venda' as OxyHackerIndicator, startDate, endDate);
          } else {
            total += filtered.reduce((acc, card) => acc + (card.valor || 0), 0);
          }
        }

        if (includesFranquia) {
          const filtered = filteredVendasForBU('franquia', franquiaAnalytics.getCardsForIndicator('venda'));
          if (filtered === null) {
            total += getExpansaoValue('venda' as ExpansaoIndicator, startDate, endDate);
          } else {
            total += filtered.reduce((acc, card) => acc + (card.valor || 0), 0);
          }
        }

        return total;
      }

      case 'sla': {
        // SLA: Average time from card creation to first contact attempt
        let totalMinutes = 0;
        let totalCount = 0;
        if (includesModeloAtual) {
          const maCards = modeloAtualAnalytics.cards.filter(card =>
            card.fase.toLowerCase() === 'tentativas de contato' && card.dataCriacao
          );
          totalMinutes += maCards.reduce((s, c) => s + (c.dataEntrada.getTime() - c.dataCriacao!.getTime()) / 1000 / 60, 0);
          totalCount += maCards.length;
        }
        if (includesO2Tax) {
          const o2Cards = o2TaxAnalytics.cards.filter(card =>
            card.fase.toLowerCase() === 'tentativas de contato' && card.dataCriacao
          );
          totalMinutes += o2Cards.reduce((s, c) => s + (c.dataEntrada.getTime() - c.dataCriacao!.getTime()) / 1000 / 60, 0);
          totalCount += o2Cards.length;
        }
        return totalCount > 0 ? totalMinutes / totalCount : 0;
      }

      case 'mrr': {
        let total = 0;
        if (includesModeloAtual) {
          const filtered = filteredVendasForBU('modelo_atual', modeloAtualAnalytics.getCardsForIndicator('venda'));
          if (filtered === null) {
            total += getMrrForPeriod(startDate, endDate);
          } else {
            total += filtered.reduce((acc, card) => acc + (card.valorMRR || 0), 0);
          }
        }
        if (includesO2Tax) {
          const filtered = filteredVendasForBU('o2_tax', o2TaxAnalytics.getCardsForIndicator('venda'));
          const cards = filtered ?? o2TaxAnalytics.getCardsForIndicator('venda');
          total += cards.reduce((acc, card) => acc + (card.valorMRR || 0), 0);
        }
        return total;
      }

      case 'setup': {
        let total = 0;
        if (includesModeloAtual) {
          const filtered = filteredVendasForBU('modelo_atual', modeloAtualAnalytics.getCardsForIndicator('venda'));
          if (filtered === null) {
            total += getSetupForPeriod(startDate, endDate);
          } else {
            total += filtered.reduce((acc, card) => acc + (card.valorSetup || 0), 0);
          }
        }
        if (includesO2Tax) {
          const filtered = filteredVendasForBU('o2_tax', o2TaxAnalytics.getCardsForIndicator('venda'));
          const cards = filtered ?? o2TaxAnalytics.getCardsForIndicator('venda');
          total += cards.reduce((acc, card) => acc + (card.valorSetup || 0), 0);
        }
        return total;
      }

      case 'pontual': {
        let total = 0;
        if (includesModeloAtual) {
          const filtered = filteredVendasForBU('modelo_atual', modeloAtualAnalytics.getCardsForIndicator('venda'));
          if (filtered === null) {
            total += getPontualForPeriod(startDate, endDate);
          } else {
            total += filtered.reduce((acc, card) => acc + (card.valorPontual || 0), 0);
          }
        }
        if (includesO2Tax) {
          const filtered = filteredVendasForBU('o2_tax', o2TaxAnalytics.getCardsForIndicator('venda'));
          const cards = filtered ?? o2TaxAnalytics.getCardsForIndicator('venda');
          total += cards.reduce((acc, card) => acc + (card.valorPontual || 0), 0);
        }
        // Oxy Hacker: toda receita é pontual
        if (includesOxyHacker) {
          const filtered = filteredVendasForBU('oxy_hacker', oxyHackerAnalytics.getCardsForIndicator('venda'));
          if (filtered === null) {
            total += getOxyHackerValue('venda', startDate, endDate);
          } else {
            total += filtered.reduce((acc, card) => acc + (card.valor || 0), 0);
          }
        }
        // Franquia: toda receita é pontual
        if (includesFranquia) {
          const filtered = filteredVendasForBU('franquia', franquiaAnalytics.getCardsForIndicator('venda'));
          if (filtered === null) {
            total += getExpansaoValue('venda', startDate, endDate);
          } else {
            total += filtered.reduce((acc, card) => acc + (card.valor || 0), 0);
          }
        }
        return total;
      }

      default:
        return 0;
    }
  };

  // Get meta for monetary indicators using consolidated metas (database > Plan Growth)
  const getMetaMonetaryForIndicator = (indicator: MonetaryIndicatorConfig): number => {
    const closerFilter = effectiveSelectedClosers.length > 0 ? effectiveSelectedClosers : undefined;

    // Build SDR ratio callback when SDR filter is active
    let sdrRatio: ((bu: BuType, month: string) => number) | undefined;
    if (effectiveSelectedSDRs.length > 0) {
      sdrRatio = (bu: BuType, month: string) => {
        const sdrsInBU = (BU_SDRS[bu] || []) as readonly string[];
        if (sdrsInBU.length === 0) return 0;
        const selectedInBU = effectiveSelectedSDRs.filter(s => sdrsInBU.includes(s));
        if (selectedInBU.length === 0) return 0;

        // Sum RM+RR meta for the BU/month — selected SDRs vs all SDRs of the BU
        let selectedSum = 0;
        let totalSum = 0;
        for (const m of sdrMetasList) {
          if (m.bu !== bu || m.month !== month) continue;
          if (!sdrsInBU.includes(m.sdr)) continue;
          const v = (m.rm_meta || 0) + (m.rr_meta || 0);
          totalSum += v;
          if (selectedInBU.includes(m.sdr)) selectedSum += v;
        }

        // Fallback: distribuição igualitária quando não há sdr_metas para o mês
        if (totalSum === 0) return selectedInBU.length / sdrsInBU.length;
        return selectedSum / totalSum;
      };
    }

    // Use hook consolidado que mescla banco + Plan Growth
    return getMetaMonetaryForPeriod(
      indicator.key as ConsolidatedMetricType | 'sla',
      selectedBUs as BuType[],
      startDate,
      endDate,
      closerFilter,
      getFilteredMeta,
      sdrRatio as any
    );
  };


  // Handle monetary card click with strategic narratives
  const handleMonetaryCardClick = (indicator: MonetaryIndicatorConfig) => {
    const items = getItemsForIndicator('venda');
    const totalFaturamento = items.reduce((sum, i) => sum + (i.value || 0), 0);
    const totalMrr = items.reduce((sum, i) => sum + (i.mrr || 0), 0);
    const totalSetup = items.reduce((sum, i) => sum + (i.setup || 0), 0);
    const totalPontual = items.reduce((sum, i) => sum + (i.pontual || 0), 0);
    setDetailSheetExtraContent(null);
    
    
    // SLA drill-down: "Estamos Respondendo Rápido?"
    if (indicator.key === 'sla') {
      // Combine SLA cards from all selected BUs
      let tentativasCards: DetailItem[] = [];
      
      if (includesModeloAtual) {
        const maCards = modeloAtualAnalytics.cards.filter(card => 
          card.fase.toLowerCase() === 'tentativas de contato' && card.dataCriacao
        ).map(card => {
          const slaMinutes = (card.dataEntrada.getTime() - card.dataCriacao!.getTime()) / 1000 / 60;
          return {
            id: card.id,
            name: card.titulo || card.empresa || 'Sem título',
            company: card.empresa || card.contato || undefined,
            phase: 'Tentativas de contato',
            date: card.dataEntrada.toISOString(),
            value: 0,
            sla: slaMinutes,
            slaStatus: (slaMinutes <= 30 ? 'ok' : slaMinutes <= 60 ? 'warning' : 'danger') as 'ok' | 'warning' | 'danger',
            responsible: card.responsavel || undefined,
            product: 'CaaS',
          } as DetailItem;
        });
        tentativasCards = tentativasCards.concat(maCards);
      }
      
      if (includesO2Tax) {
        const o2Cards = o2TaxAnalytics.cards.filter(card =>
          card.fase.toLowerCase() === 'tentativas de contato' && card.dataCriacao
        ).map(card => {
          const slaMinutes = (card.dataEntrada.getTime() - card.dataCriacao!.getTime()) / 1000 / 60;
          return {
            id: card.id,
            name: card.titulo,
            company: card.contato || card.titulo,
            phase: 'Tentativas de Contato',
            date: card.dataEntrada.toISOString(),
            value: 0,
            sla: slaMinutes,
            slaStatus: (slaMinutes <= 30 ? 'ok' : slaMinutes <= 60 ? 'warning' : 'danger') as 'ok' | 'warning' | 'danger',
            responsible: card.responsavel || undefined,
            product: 'O2 TAX',
          } as DetailItem;
        });
        tentativasCards = tentativasCards.concat(o2Cards);
      }
      
      // Calculate SLA metrics over combined set
      const avgSla = tentativasCards.length > 0
        ? tentativasCards.reduce((s, c) => s + (c.sla || 0), 0) / tentativasCards.length
        : 0;
      const withinTarget = tentativasCards.filter(c => (c.sla || 0) <= 30).length;
      const withinTargetPct = tentativasCards.length > 0 ? Math.round((withinTarget / tentativasCards.length) * 100) : 0;
      const slaValues = tentativasCards.map(c => c.sla || 0).sort((a, b) => a - b);
      const medianSla = slaValues.length > 0 ? slaValues[Math.floor(slaValues.length / 2)] : 0;
      const outliers = tentativasCards.filter(c => (c.sla || 0) > 120).length;
      
      // KPIs para SLA
      const kpis: KpiItem[] = [
        { icon: '📊', value: tentativasCards.length, label: 'Leads', highlight: 'neutral' },
        { icon: '⏱️', value: formatDuration(avgSla), label: 'SLA Médio', highlight: avgSla <= 30 ? 'success' : avgSla <= 60 ? 'warning' : 'danger' },
        { icon: '🎯', value: `${withinTargetPct}%`, label: '% Meta', highlight: withinTargetPct >= 80 ? 'success' : withinTargetPct >= 50 ? 'warning' : 'danger' },
        { icon: '📈', value: formatDuration(medianSla), label: 'Mediana', highlight: 'neutral' },
        { icon: '⚠️', value: outliers > 0 ? outliers : '-', label: 'Outliers', highlight: outliers > 5 ? 'danger' : outliers > 0 ? 'warning' : 'success' },
      ];
      
      // Charts para SLA
      // 1. SLA por SDR
      const sdrSlaMap = new Map<string, { total: number; count: number }>();
      tentativasCards.forEach(c => {
        const sdr = c.responsible || 'Sem SDR';
        const stats = sdrSlaMap.get(sdr) || { total: 0, count: 0 };
        stats.total += c.sla || 0;
        stats.count += 1;
        sdrSlaMap.set(sdr, stats);
      });
      const sdrSlaData = Array.from(sdrSlaMap.entries())
        .map(([label, stats]) => {
          const avgMinutes = stats.count > 0 ? Math.round(stats.total / stats.count) : 0;
          return {
            label: label.split(' ')[0],
            value: avgMinutes,
            highlight: avgMinutes <= 30 ? 'success' as const : avgMinutes <= 60 ? 'warning' as const : 'danger' as const
          };
        })
        .sort((a, b) => b.value - a.value);
      
      // 2. Distribuição de SLA
      const slaDistribution = [
        { label: '< 30m', value: tentativasCards.filter(c => (c.sla || 0) <= 30).length, highlight: 'success' as const },
        { label: '30m-1h', value: tentativasCards.filter(c => (c.sla || 0) > 30 && (c.sla || 0) <= 60).length, highlight: 'warning' as const },
        { label: '1h-2h', value: tentativasCards.filter(c => (c.sla || 0) > 60 && (c.sla || 0) <= 120).length, highlight: 'warning' as const },
        { label: '> 2h', value: tentativasCards.filter(c => (c.sla || 0) > 120).length, highlight: 'danger' as const },
      ];
      
      const charts: ChartConfig[] = [
        { type: 'bar', title: 'SLA Médio por SDR (min)', data: sdrSlaData },
        { type: 'distribution', title: 'Distribuição de SLA', data: slaDistribution },
      ];
      
      setDetailSheetTitle('SLA - Estamos Respondendo Rápido?');
      setDetailSheetDescription(
        `${tentativasCards.length} leads | SLA médio: ${formatDuration(avgSla)} | Dentro da meta (<30m): ${withinTargetPct}% | Mediana: ${formatDuration(medianSla)}` +
        (outliers > 0 ? ` | ⚠️ ${outliers} leads com SLA > 2h` : '')
      );
      setDetailSheetKpis(kpis);
      setDetailSheetCharts(charts);
      setDetailSheetColumns([
        { key: 'product', label: 'Produto', format: columnFormatters.product },
        { key: 'company', label: 'Empresa' },
        { key: 'sla', label: 'Tempo SLA', format: columnFormatters.slaWithStatus },
        { key: 'responsible', label: 'SDR' },
        { key: 'date', label: 'Data', format: columnFormatters.date },
      ]);
      // Sort by SLA descending (worst first = coaching)
      setDetailSheetItems(tentativasCards.sort((a, b) => (b.sla || 0) - (a.sla || 0)));
      setDetailSheetFilterCriteria([]);
      setDetailSheetOpen(true);
      return;
    }
    
    // Faturamento: "De Onde Veio o Dinheiro?"
    if (indicator.key === 'faturamento') {
      const meta = getMetaMonetaryForIndicator(indicator);
      // Use the same value as the accelerator for consistency
      const realizedFromCard = getRealizedMonetaryForIndicator({ key: 'faturamento', label: 'Fat Incremento', shortLabel: 'Fat Inc.', format: 'currency' });
      const pctMeta = meta > 0 ? Math.round((realizedFromCard / meta) * 100) : 0;
      const pctMrr = realizedFromCard > 0 ? Math.round((totalMrr / realizedFromCard) * 100) : 0;
      const pctSetup = realizedFromCard > 0 ? Math.round((totalSetup / realizedFromCard) * 100) : 0;
      const pctPontual = realizedFromCard > 0 ? Math.round((totalPontual / realizedFromCard) * 100) : 0;
      
      const itemsWithPct = items.map(item => ({
        ...item,
        percentualTotal: totalFaturamento > 0 ? ((item.value || 0) / totalFaturamento) * 100 : 0
      }));
      
      const topCliente = items.length > 0 
        ? items.reduce((top, i) => (i.value || 0) > (top.value || 0) ? i : top, items[0])
        : null;
      
      // KPIs para Faturamento
      const kpis: KpiItem[] = [
        { icon: '💰', value: formatCompactCurrency(totalFaturamento), label: 'Total', highlight: 'neutral' },
        { icon: '🔄', value: `${pctMrr}%`, label: 'MRR', highlight: pctMrr >= 50 ? 'success' : 'neutral' },
        { icon: '🔧', value: `${pctSetup}%`, label: 'Setup', highlight: 'neutral' },
        { icon: '💎', value: `${pctPontual}%`, label: 'Pontual', highlight: pctPontual > 30 ? 'warning' : 'neutral' },
        { icon: '🎯', value: `${pctMeta}%`, label: 'vs Meta', highlight: pctMeta >= 100 ? 'success' : pctMeta >= 70 ? 'neutral' : 'warning' },
      ];
      
      // Charts para Faturamento
      // 1. Faturamento por Closer
      const closerTotals = new Map<string, number>();
      items.forEach(i => {
        const closer = i.responsible || i.closer || 'Sem Closer';
        closerTotals.set(closer, (closerTotals.get(closer) || 0) + (i.value || 0));
      });
      const closerRankingData = Array.from(closerTotals.entries())
        .map(([label, value]) => ({ label: label.split(' ')[0], value }))
        .sort((a, b) => b.value - a.value);
      
      // 2. Composição MRR/Setup/Pontual (Pie)
      const compositionData = [
        { label: 'MRR', value: totalMrr },
        { label: 'Setup', value: totalSetup },
        { label: 'Pontual', value: totalPontual },
      ].filter(d => d.value > 0);
      
      const charts: ChartConfig[] = [
        { type: 'bar', title: 'Faturamento por Closer', data: closerRankingData, formatValue: formatCompactCurrency },
        { type: 'pie', title: 'Composição', data: compositionData, formatValue: formatCompactCurrency },
      ];
      
      setDetailSheetTitle('Faturamento - De Onde Veio o Dinheiro?');
      setDetailSheetDescription(
        `Total: ${formatCompactCurrency(totalFaturamento)} | Composição: MRR ${formatCompactCurrency(totalMrr)} (${pctMrr}%) + Setup ${formatCompactCurrency(totalSetup)} (${pctSetup}%) + Pontual ${formatCompactCurrency(totalPontual)} (${pctPontual}%) | vs Meta: ${pctMeta}%` +
        (topCliente ? ` | Top: ${topCliente.company || topCliente.name} (${formatCompactCurrency(topCliente.value || 0)})` : '')
      );
      setDetailSheetKpis(kpis);
      setDetailSheetCharts(charts);
      setDetailSheetExtraContent(buildProdutoBreakdown(itemsWithPct, 'value'));
      setDetailSheetColumns([
        { key: 'product', label: 'Produto', format: columnFormatters.product },
        { key: 'company', label: 'Empresa' },
        { key: 'mrr', label: 'MRR', format: columnFormatters.currency },
        { key: 'setup', label: 'Setup', format: columnFormatters.currency },
        { key: 'pontual', label: 'Pontual', format: columnFormatters.currency },
        { key: 'value', label: 'Total', format: columnFormatters.currency },
        { key: 'percentualTotal', label: '% do Fat.', format: columnFormatters.percentualTotal },
        { key: 'responsible', label: 'Closer' },
      ]);
      setDetailSheetItems(itemsWithPct.sort((a, b) => (b.value || 0) - (a.value || 0)));
      setDetailSheetFilterCriteria([]);
      setDetailSheetOpen(true);
      return;
    }
    
    // MRR: "Quanto de Base Recorrente Construímos?"
    if (indicator.key === 'mrr') {
      const mrrItems = items.filter(i => (i.mrr || 0) > 0);
      const arrProjetado = totalMrr * 12;
      const avgMrr = mrrItems.length > 0 ? totalMrr / mrrItems.length : 0;
      const topCliente = mrrItems.length > 0 
        ? mrrItems.reduce((top, i) => (i.mrr || 0) > (top.mrr || 0) ? i : top, mrrItems[0])
        : null;
      
      const itemsWithPct = mrrItems.map(item => ({
        ...item,
        percentualTotal: totalMrr > 0 ? ((item.mrr || 0) / totalMrr) * 100 : 0
      }));
      
      // KPIs para MRR
      const kpis: KpiItem[] = [
        { icon: '📝', value: mrrItems.length, label: 'Contratos', highlight: 'neutral' },
        { icon: '🔄', value: formatCompactCurrency(totalMrr), label: 'Total/mês', highlight: 'neutral' },
        { icon: '📈', value: formatCompactCurrency(arrProjetado), label: 'ARR', highlight: 'neutral' },
        { icon: '📊', value: formatCompactCurrency(avgMrr), label: 'Média', highlight: 'neutral' },
        { icon: '👑', value: topCliente ? (topCliente.company || topCliente.name).substring(0, 10) : '-', label: 'Maior', highlight: 'neutral' },
      ];
      
      // Charts para MRR
      // 1. Ranking por Closer
      const closerTotals = new Map<string, number>();
      mrrItems.forEach(i => {
        const closer = i.responsible || i.closer || 'Sem Closer';
        closerTotals.set(closer, (closerTotals.get(closer) || 0) + (i.mrr || 0));
      });
      const closerRankingData = Array.from(closerTotals.entries())
        .map(([label, value]) => ({ label: label.split(' ')[0], value }))
        .sort((a, b) => b.value - a.value);
      
      // 2. Top 3 clientes vs resto (concentração)
      const sortedByMrr = [...mrrItems].sort((a, b) => (b.mrr || 0) - (a.mrr || 0));
      const top3Mrr = sortedByMrr.slice(0, 3).reduce((sum, i) => sum + (i.mrr || 0), 0);
      const restoMrr = totalMrr - top3Mrr;
      const concentrationData = [
        { label: 'Top 3', value: top3Mrr },
        { label: 'Outros', value: restoMrr },
      ].filter(d => d.value > 0);
      
      const charts: ChartConfig[] = [
        { type: 'bar', title: 'MRR por Closer', data: closerRankingData, formatValue: formatCompactCurrency },
        { type: 'pie', title: 'Concentração de Receita', data: concentrationData, formatValue: formatCompactCurrency },
      ];
      
      setDetailSheetTitle('MRR - Quanto de Base Recorrente Construímos?');
      setDetailSheetDescription(
        `${mrrItems.length} contratos com MRR | Total: ${formatCompactCurrency(totalMrr)}/mês | ARR projetado: ${formatCompactCurrency(arrProjetado)} | Média: ${formatCompactCurrency(avgMrr)}` +
        (topCliente ? ` | Maior: ${topCliente.company || topCliente.name} (${formatCompactCurrency(topCliente.mrr || 0)}/mês)` : '')
      );
      setDetailSheetKpis(kpis);
      setDetailSheetCharts(charts);
      setDetailSheetExtraContent(buildProdutoBreakdown(itemsWithPct, 'mrr'));
      setDetailSheetColumns([
        { key: 'product', label: 'Produto', format: columnFormatters.product },
        { key: 'company', label: 'Empresa' },
        { key: 'mrr', label: 'MRR', format: columnFormatters.currency },
        { key: 'percentualTotal', label: '% do MRR', format: columnFormatters.percentualTotal },
        { key: 'value', label: 'Total Contrato', format: columnFormatters.currency },
        { key: 'responsible', label: 'Closer' },
        { key: 'date', label: 'Data', format: columnFormatters.date },
      ]);
      setDetailSheetItems(itemsWithPct.sort((a, b) => (b.mrr || 0) - (a.mrr || 0)));
      setDetailSheetFilterCriteria([]);
      setDetailSheetOpen(true);
      return;
    }
    
    // Setup: "Quantas Implantações Vendemos?"
    if (indicator.key === 'setup') {
      const setupItems = items.filter(i => (i.setup || 0) > 0);
      const avgSetup = setupItems.length > 0 ? totalSetup / setupItems.length : 0;
      const pctFaturamento = totalFaturamento > 0 ? Math.round((totalSetup / totalFaturamento) * 100) : 0;
      const topCliente = setupItems.length > 0 
        ? setupItems.reduce((top, i) => (i.setup || 0) > (top.setup || 0) ? i : top, setupItems[0])
        : null;
      
      const itemsWithPct = setupItems.map(item => ({
        ...item,
        percentualTotal: totalSetup > 0 ? ((item.setup || 0) / totalSetup) * 100 : 0
      }));
      
      // KPIs para Setup
      const kpis: KpiItem[] = [
        { icon: '🔧', value: setupItems.length, label: 'Projetos', highlight: 'neutral' },
        { icon: '💰', value: formatCompactCurrency(totalSetup), label: 'Total', highlight: 'neutral' },
        { icon: '📊', value: formatCompactCurrency(avgSetup), label: 'Média', highlight: 'neutral' },
        { icon: '📈', value: `${pctFaturamento}%`, label: '% Fat.', highlight: 'neutral' },
        { icon: '👑', value: topCliente ? (topCliente.company || topCliente.name).substring(0, 10) : '-', label: 'Maior', highlight: 'neutral' },
      ];
      
      // Charts para Setup
      // 1. Ranking por Closer
      const closerTotals = new Map<string, number>();
      setupItems.forEach(i => {
        const closer = i.responsible || i.closer || 'Sem Closer';
        closerTotals.set(closer, (closerTotals.get(closer) || 0) + (i.setup || 0));
      });
      const closerRankingData = Array.from(closerTotals.entries())
        .map(([label, value]) => ({ label: label.split(' ')[0], value }))
        .sort((a, b) => b.value - a.value);
      
      const charts: ChartConfig[] = [
        { type: 'bar', title: 'Setup por Closer', data: closerRankingData, formatValue: formatCompactCurrency },
      ];
      
      setDetailSheetTitle('Setup - Quantas Implantações Vendemos?');
      setDetailSheetDescription(
        `${setupItems.length} projetos com setup | Total: ${formatCompactCurrency(totalSetup)} | Média: ${formatCompactCurrency(avgSetup)} | Setup = ${pctFaturamento}% do faturamento` +
        (topCliente ? ` | Maior: ${topCliente.company || topCliente.name} (${formatCompactCurrency(topCliente.setup || 0)})` : '')
      );
      setDetailSheetKpis(kpis);
      setDetailSheetCharts(charts);
      setDetailSheetExtraContent(buildProdutoBreakdown(itemsWithPct, 'setup'));
      setDetailSheetColumns([
        { key: 'product', label: 'Produto', format: columnFormatters.product },
        { key: 'company', label: 'Empresa' },
        { key: 'setup', label: 'Setup', format: columnFormatters.currency },
        { key: 'mrr', label: 'MRR Associado', format: columnFormatters.currency },
        { key: 'value', label: 'Total Contrato', format: columnFormatters.currency },
        { key: 'responsible', label: 'Closer' },
        { key: 'date', label: 'Data', format: columnFormatters.date },
      ]);
      setDetailSheetItems(itemsWithPct.sort((a, b) => (b.setup || 0) - (a.setup || 0)));
      setDetailSheetFilterCriteria([]);
      setDetailSheetOpen(true);
      return;
    }
    
    // Pontual: "Receitas Extraordinárias"
    if (indicator.key === 'pontual') {
      const pontualItems = items.filter(i => (i.pontual || 0) > 0);
      const avgPontual = pontualItems.length > 0 ? totalPontual / pontualItems.length : 0;
      const pctFaturamento = totalFaturamento > 0 ? Math.round((totalPontual / totalFaturamento) * 100) : 0;
      const topCliente = pontualItems.length > 0 
        ? pontualItems.reduce((top, i) => (i.pontual || 0) > (top.pontual || 0) ? i : top, pontualItems[0])
        : null;
      
      const itemsWithPct = pontualItems.map(item => ({
        ...item,
        percentualTotal: totalPontual > 0 ? ((item.pontual || 0) / totalPontual) * 100 : 0
      }));
      
      // KPIs para Pontual
      const kpis: KpiItem[] = [
        { icon: '💎', value: pontualItems.length, label: 'Ocorrências', highlight: 'neutral' },
        { icon: '💰', value: formatCompactCurrency(totalPontual), label: 'Total', highlight: 'neutral' },
        { icon: '📊', value: formatCompactCurrency(avgPontual), label: 'Média', highlight: 'neutral' },
        { icon: '📈', value: `${pctFaturamento}%`, label: '% Fat.', highlight: pctFaturamento > 30 ? 'warning' : 'neutral' },
        { icon: '👑', value: topCliente ? (topCliente.company || topCliente.name).substring(0, 10) : '-', label: 'Maior', highlight: 'neutral' },
      ];
      
      // Charts para Pontual
      const closerTotals = new Map<string, number>();
      pontualItems.forEach(i => {
        const closer = i.responsible || i.closer || 'Sem Closer';
        closerTotals.set(closer, (closerTotals.get(closer) || 0) + (i.pontual || 0));
      });
      const closerRankingData = Array.from(closerTotals.entries())
        .map(([label, value]) => ({ label: label.split(' ')[0], value }))
        .sort((a, b) => b.value - a.value);
      
      const charts: ChartConfig[] = [
        { type: 'bar', title: 'Pontual por Closer', data: closerRankingData, formatValue: formatCompactCurrency },
      ];
      
      setDetailSheetTitle('Pontual - Receitas Extraordinárias');
      setDetailSheetDescription(
        `${pontualItems.length} ocorrências | Total: ${formatCompactCurrency(totalPontual)} | Média: ${formatCompactCurrency(avgPontual)} | Pontual = ${pctFaturamento}% do faturamento` +
        (pctFaturamento > 30 ? ' ⚠️ Alta dependência' : '') +
        (topCliente ? ` | Maior: ${topCliente.company || topCliente.name} (${formatCompactCurrency(topCliente.pontual || 0)})` : '')
      );
      setDetailSheetKpis(kpis);
      setDetailSheetCharts(charts);
      setDetailSheetExtraContent(buildProdutoBreakdown(itemsWithPct, 'pontual'));
      setDetailSheetColumns([
        { key: 'product', label: 'Produto', format: columnFormatters.product },
        { key: 'company', label: 'Empresa' },
        { key: 'pontual', label: 'Pontual', format: columnFormatters.currency },
        { key: 'mrr', label: 'MRR Associado', format: columnFormatters.currency },
        { key: 'value', label: 'Total Contrato', format: columnFormatters.currency },
        { key: 'responsible', label: 'Closer' },
        { key: 'date', label: 'Data', format: columnFormatters.date },
      ]);
      setDetailSheetItems(itemsWithPct.sort((a, b) => (b.pontual || 0) - (a.pontual || 0)));
      setDetailSheetFilterCriteria([]);
      setDetailSheetOpen(true);
      return;
    }
  };

  const hotOpportunityItems = (() => {
    if (!includesModeloAtual) return [];
    const terminalPhases = new Set(['ganho', 'contrato assinado', 'perdido', 'arquivado']);
    const latestById = new Map<string, (typeof modeloAtualAnalyticsRaw.allCards)[number]>();
    for (const card of modeloAtualAnalyticsRaw.allCards) {
      const current = latestById.get(card.id);
      if (!current || card.dataEntrada > current.dataEntrada) latestById.set(card.id, card);
    }
    return Array.from(latestById.values())
      .filter(card => {
        const currentPhase = (card.faseAtual || card.fase || '').trim().toLowerCase();
        const matchCloser = effectiveSelectedClosers.length === 0 || matchesCloserFilter(card.closer);
        const matchSdr = effectiveSelectedSDRs.length === 0 || matchesSdrFilter(card.sdr || card.responsavel);
        return card.temperatura === 'Quente' && !terminalPhases.has(currentPhase) && matchCloser && matchSdr && matchesOrigemFilter(card);
      })
      .map(card => ({
        ...modeloAtualAnalyticsRaw.toDetailItem(card),
        value: card.valorMRR + card.valorSetup + card.valorPontual,
      }));
  })();

  if (commercialPaceOpen) {
    const metaFor = (key: IndicatorType) => {
      const config = indicatorConfigs.find(item => item.key === key);
      return config ? getMetaForIndicator(config) : 0;
    };
    return (
      <CommercialPaceDashboard
        startDate={startDate}
        endDate={endDate}
        selectedBUs={selectedBUs}
        selectedClosers={selectedClosers}
        selectedSDRs={selectedSDRs}
        selectedOrigens={selectedOrigens}
        itemsByIndicator={itemsByIndicator}
        hotOpportunityItems={hotOpportunityItems}
        revenueMeta={getMetaMonetaryForIndicator({ key: 'faturamento', label: 'Fat Incremento', shortLabel: 'Fat Inc.', format: 'currency' })}
        funnelMetas={{ mql: metaFor('mql'), rm: metaFor('rm'), rr: metaFor('rr'), proposta: metaFor('proposta'), venda: metaFor('venda') }}
        isLoading={isLoading || modeloAtualAnalytics.isLoading || o2TaxAnalytics.isLoading || isLoadingExpansao || isLoadingO2Tax}
        onBack={() => setCommercialPaceOpen(false)}
        onDateChange={(s, e) => { setStartDate(s); setEndDate(e); }}
        onBUsChange={(bus) => setSelectedBUs(bus as BUType[])}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-foreground">Visão Meta Pace</h2>
          <div className="flex flex-wrap items-center gap-3">
            <MultiSelect
              options={buOptions}
              selected={selectedBUs}
              onSelectionChange={(v) => setSelectedBUs(v as BUType[])}
              placeholder="Selecionar BUs"
              allLabel="Consolidado"
              className="w-44"
            />

            {availableClosers.length > 0 && (
              <MultiSelect
                options={availableClosers}
                selected={selectedClosers}
                onSelectionChange={setSelectedClosers}
                placeholder="Todos Closers"
                allLabel="Todos Closers"
                className="w-44"
              />
            )}

            {availableSDRs.length > 0 && (
              <MultiSelect
                options={availableSDRs}
                selected={selectedSDRs}
                onSelectionChange={setSelectedSDRs}
                placeholder="Todos SDRs"
                allLabel="Todos SDRs"
                className="w-40"
              />
            )}

            <MultiSelect
              options={[
                { value: 'inbound', label: LEAD_SOURCE_LABELS.inbound },
                { value: 'outbound', label: LEAD_SOURCE_LABELS.outbound },
                { value: 'evento', label: LEAD_SOURCE_LABELS.evento },
                { value: 'indicacao', label: LEAD_SOURCE_LABELS.indicacao },
                { value: 'monetizacao', label: LEAD_SOURCE_LABELS.monetizacao },
                { value: 'sem_origem', label: LEAD_SOURCE_LABELS.sem_origem },
              ]}

              selected={selectedOrigens}
              onSelectionChange={(v) => setSelectedOrigens(v as LeadSource[])}
              placeholder="Todas Origens"
              allLabel="Todas Origens"
              className="w-44"
            />

            <DateRangePickerGA
              startDate={startDate}
              endDate={endDate}
              onDateChange={handleDateRangeChange}
            />

            <Button onClick={handleSync} disabled={isSyncing} variant="outline" className="gap-2" title="Sincronizar dados">
              {isSyncing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="hidden sm:inline">Sincronizando...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  <span className="hidden sm:inline">Atualizar</span>
                </>
              )}
            </Button>
            <Button onClick={() => setCommercialPaceOpen(true)} className="gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Pace Comercial</span>
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Período: {daysInPeriod} dias | Agrupamento: {grouping === 'daily' ? 'Diário' : grouping === 'weekly' ? 'Semanal' : 'Mensal'}
        </p>
      </div>

      {/* TCV Hero Banner */}
      <TcvHeroBanner vendaItems={getItemsForIndicator('venda')} />

      {/* Cards - Quantity Indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {indicatorConfigs.map((indicator) => (
          <RadialProgressCard 
            key={indicator.key} 
            title={indicator.label} 
            realized={getRealizedForIndicator(indicator)} 
            meta={getMetaForIndicator(indicator)} 
            isClickable={true}
            isLoading={o2TaxAnalytics.isLoading || modeloAtualAnalytics.isLoading}
            onClick={() => handleRadialCardClick(indicator)}
          />
        ))}
      </div>

      {/* Cards - Monetary Indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {monetaryIndicatorConfigs.map((indicator) => (
          <MonetaryRadialCard 
            key={indicator.key} 
            title={indicator.label} 
            realized={getRealizedMonetaryForIndicator(indicator)} 
            meta={getMetaMonetaryForIndicator(indicator)}
            format={indicator.format}
            isClickable={true}
            isLoading={o2TaxAnalytics.isLoading || modeloAtualAnalytics.isLoading}
            onClick={() => handleMonetaryCardClick(indicator)}
          />
        ))}
      </div>

      {/* Temperatura dos Leads (respeita filtro de BU) */}
      <TemperaturaSection
        modeloAtualAnalytics={modeloAtualAnalyticsRaw}
        franquiaAnalytics={franquiaAnalytics}
        oxyHackerAnalytics={oxyHackerAnalytics}
        outboundAnalytics={outboundAnalytics}
        monetizacaoAnalytics={monetizacaoAnalytics}
        selectedBUs={selectedBUs}
        startDate={startDate}
        endDate={endDate}
      />

      {/* Cenário de Caixa (Otimista / Realista) */}
      <CenarioCaixaSection
        modeloAtualAnalytics={modeloAtualAnalyticsRaw}
        franquiaAnalytics={franquiaAnalytics}
        oxyHackerAnalytics={oxyHackerAnalytics}
        outboundAnalytics={outboundAnalytics}
        monetizacaoAnalytics={monetizacaoAnalytics}
        selectedBUs={selectedBUs}
        startDate={startDate}
        endDate={endDate}
      />




      {/* Funil de Monetização (pipe pipefy_moviment_contrato) */}
      <MonetizacaoSection startDate={startDate} endDate={endDate} />






      {/* Weekly Comparison Panel */}
      <WeeklyComparison
        startDate={startDate}
        endDate={endDate}
        itemsByIndicator={itemsByIndicator}
        indicatorConfigs={indicatorConfigs}
      />

      {/* Comparativo por Closer (card dedicado, respeita Data + BU + filtros de SDR/Closer) */}
      <Card>
        <CardHeader>
          <CardTitle>Comparativo por Closer</CardTitle>
          <p className="text-xs text-muted-foreground">
            RM, RR, Proposta e Venda por closer no período e BUs selecionados. Respeita os filtros ativos de data, BU, SDR e Closer.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <SdrBreakdown
            role="closer"
            itemsByIndicator={itemsByIndicator}
            startDate={startDate}
            endDate={endDate}
            indicatorConfigs={indicatorConfigs}
          />
          <SdrBreakdownWeekly
            role="closer"
            weeks={getWeeksInRange(startDate, endDate)}
            itemsByIndicator={itemsByIndicator}
            indicatorConfigs={indicatorConfigs}
          />
        </CardContent>
      </Card>

      {/* Rank de SDRs (vs metas absolutas, com rateio por dias úteis) */}
      <Card>
        <CardHeader>
          <CardTitle>Rank SDRs (vs Meta)</CardTitle>
          <p className="text-xs text-muted-foreground">
            Posição por % de atingimento médio (RM/RR). Meta de Proposta e Venda ainda não cadastrada para SDRs.
            Metas mensais rateadas pelos dias úteis do intervalo. Respeita filtros de data, BU, SDR e Closer.
          </p>
        </CardHeader>
        <CardContent>
          <PersonRanking
            role="sdr"
            itemsByIndicator={itemsByIndicator}
            startDate={startDate}
            endDate={endDate}
            selectedBUs={selectedBUs}
          />
        </CardContent>
      </Card>

      {/* Rank de Closers (vs metas absolutas, com rateio por dias úteis) */}
      <Card>
        <CardHeader>
          <CardTitle>Rank Closers (vs Meta)</CardTitle>
          <p className="text-xs text-muted-foreground">
            Posição por % de atingimento médio dos 4 indicadores. Metas mensais (admin) rateadas pelos dias úteis do intervalo.
          </p>
        </CardHeader>
        <CardContent>
          <PersonRanking
            role="closer"
            itemsByIndicator={itemsByIndicator}
            startDate={startDate}
            endDate={endDate}
            selectedBUs={selectedBUs}
          />
        </CardContent>
      </Card>

      {/* Contratos por Faixa de Faturamento foi movido para dentro do RevenuePaceChart */}

      {/* Loss Analysis Section — lazy */}
      <Suspense fallback={<Card className="bg-card border-border"><CardContent className="h-48 flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></CardContent></Card>}>
      <LossAnalysisSection
        selectedBUs={selectedBUs}
        modeloAtualAnalytics={modeloAtualAnalytics}
        o2TaxAnalytics={o2TaxAnalytics}
        oxyHackerAnalytics={oxyHackerAnalytics}
        franquiaAnalytics={franquiaAnalytics}
      />
      </Suspense>

      {/* Revenue Pace Chart */}
      {(() => {
        const today = new Date();
        const daysElapsed = Math.min(
          differenceInDays(today, startDate) + 1,
          daysInPeriod
        );

        // === Realizado: agora vem dos cards de venda do Pipefy (mesma fonte do
        // acelerômetro "Fat Incremento"), respeitando filtros BU/Closer/SDR/Origem. ===
        const vendaItemsForPace = getItemsForIndicator('venda');

        // Helper: meta de Faturamento alinhada com o acelerômetro "Fat Incremento"
        // — respeita filtros de BU, Closer e SDR via hook consolidado.
        const closerFilterForMeta = effectiveSelectedClosers.length > 0 ? effectiveSelectedClosers : undefined;
        let sdrRatioForMeta: ((bu: BuType, month: string) => number) | undefined;
        if (effectiveSelectedSDRs.length > 0) {
          sdrRatioForMeta = (bu: BuType, month: string) => {
            const sdrsInBU = (BU_SDRS[bu] || []) as readonly string[];
            if (sdrsInBU.length === 0) return 0;
            const selectedInBU = effectiveSelectedSDRs.filter(s => sdrsInBU.includes(s));
            if (selectedInBU.length === 0) return 0;
            let selectedSum = 0;
            let totalSum = 0;
            for (const m of sdrMetasList) {
              if (m.bu !== bu || m.month !== month) continue;
              if (!sdrsInBU.includes(m.sdr)) continue;
              const v = (m.rm_meta || 0) + (m.rr_meta || 0);
              totalSum += v;
              if (selectedInBU.includes(m.sdr)) selectedSum += v;
            }
            if (totalSum === 0) return selectedInBU.length / sdrsInBU.length;
            return selectedSum / totalSum;
          };
        }
        const metaForRange = (from: Date, to: Date): number =>
          getMetaMonetaryForPeriod(
            'faturamento',
            selectedBUs as BuType[],
            from,
            to,
            closerFilterForMeta,
            getFilteredMeta,
            sdrRatioForMeta as any
          );

        // Sum vendaItems whose date falls in [from, to]
        const realizedForRange = (from: Date, to: Date): number => {
          const fromMs = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
          const toMs = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999).getTime();
          let sum = 0;
          for (const it of vendaItemsForPace) {
            if (!it.date) continue;
            const d = new Date(it.date as any);
            const t = d.getTime();
            if (t >= fromMs && t <= toMs) sum += (it.value || 0);
          }
          return sum;
        };

        // Header totals
        const totalRealized = realizedForRange(startDate, endDate);
        const totalMeta = metaForRange(startDate, endDate);

        const paceFraction = daysInPeriod > 0 ? daysElapsed / daysInPeriod : 0;
        const paceExpected = totalMeta * paceFraction;

        // === Build chart data per period ===
        const paceChartLabels = getChartLabels();
        let cumulativeRealized = 0;
        let cumulativeMeta = 0;

        const paceChartData = paceChartLabels.map((label, index) => {
          let periodStart: Date;
          let periodEnd: Date;

          if (grouping === 'daily') {
            const days = eachDayOfInterval({ start: startDate, end: endDate });
            periodStart = days[index] || startDate;
            periodEnd = periodStart;
          } else if (grouping === 'weekly') {
            periodStart = addDays(startDate, index * 7);
            periodEnd = index === paceChartLabels.length - 1 ? endDate : addDays(periodStart, 6);
          } else {
            const months = eachMonthOfInterval({ start: startDate, end: endDate });
            periodStart = months[index] || startDate;
            periodEnd = index === months.length - 1 ? endDate : endOfMonth(periodStart);
          }

          // Realizado: cards de venda Pipefy no intervalo do período
          const periodRealized = realizedForRange(periodStart, periodEnd);

          // Meta alinhada com o acelerômetro "Fat Incremento" (respeita BU/Closer/SDR)
          const periodMeta = metaForRange(periodStart, periodEnd);

          cumulativeRealized += periodRealized;
          cumulativeMeta += periodMeta;

          return {
            label,
            realizado: cumulativeRealized,
            meta: cumulativeMeta,
          };
        });


        // === Contratos por Faixa de Faturamento (embutido no acelerômetro) ===
        const TIER_NORM: Record<string, string> = {
          'Ainda não faturamos': 'Ainda não fatura',
          'Menos de R$ 100 mil': '< R$ 100k',
          'Entre R$ 100 mil e R$ 200 mil': 'R$ 100k - 200k',
          'Entre R$ 200 mil e R$ 350 mil': 'R$ 200k - 350k',
          'Entre R$ 350 mil e R$ 500 mil': 'R$ 350k - 500k',
          'Entre R$ 500 mil e R$ 1 milhão': 'R$ 500k - 1M',
          'Entre R$ 1 milhão e R$ 5 milhões': 'R$ 1M - 5M',
          'Acima de R$ 5 milhões': '> R$ 5M',
        };
        const TIER_COLORS: Record<string, string> = {
          'Ainda não fatura': 'bg-gray-500',
          '< R$ 100k': 'bg-red-500',
          'R$ 100k - 200k': 'bg-orange-500',
          'R$ 200k - 350k': 'bg-amber-500',
          'R$ 350k - 500k': 'bg-yellow-500',
          'R$ 500k - 1M': 'bg-lime-500',
          'R$ 1M - 5M': 'bg-green-500',
          '> R$ 5M': 'bg-emerald-600',
        };
        const TIER_ORDER_LIST = ['Ainda não fatura','< R$ 100k','R$ 100k - 200k','R$ 200k - 350k','R$ 350k - 500k','R$ 500k - 1M','R$ 1M - 5M','> R$ 5M'];

        const vendaItems = getItemsForIndicator('venda');
        const tierMap = new Map<string, { count: number; valor: number }>();
        vendaItems.forEach(item => {
          const raw = item.revenueRange || 'Não informado';
          const tier = TIER_NORM[raw] || raw;
          const existing = tierMap.get(tier) || { count: 0, valor: 0 };
          existing.count += 1;
          existing.valor += (item.value || 0);
          tierMap.set(tier, existing);
        });

        const tierBreakdown = TIER_ORDER_LIST
          .map(tier => ({ tier, ...(tierMap.get(tier) || { count: 0, valor: 0 }), colorClass: TIER_COLORS[tier] || 'bg-gray-400' }))
          .filter(t => t.count > 0);
        const naoInfo = tierMap.get('Não informado');
        if (naoInfo && naoInfo.count > 0) {
          tierBreakdown.push({ tier: 'Não informado', ...naoInfo, colorClass: 'bg-gray-400' });
        }
        const totalContratos = vendaItems.length;
        const totalContratosValor = vendaItems.reduce((s, i) => s + (i.value || 0), 0);

        return (
          <Suspense fallback={<Card className="bg-card border-border"><CardContent className="h-96 flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></CardContent></Card>}>
          <RevenuePaceChart
            realized={totalRealized}
            meta={totalMeta}
            mrrBase={0}
            paceExpected={paceExpected}
            isLoading={o2TaxAnalytics.isLoading || modeloAtualAnalytics.isLoading || isLoadingMrrBase || isLoadingDre}
            chartData={paceChartData}
            tierBreakdown={tierBreakdown}
            totalContratos={totalContratos}
            totalContratosValor={totalContratosValor}
          />
          </Suspense>
        );
      })()}

      {/* New Charts - MQLs, Leads and Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-4">
          <LeadsMqlsStackedChart startDate={startDate} endDate={endDate} selectedBU={selectedBU} selectedBUs={selectedBUs} selectedClosers={selectedClosers} />
          <MeetingsScheduledChart startDate={startDate} endDate={endDate} selectedBU={selectedBU} selectedBUs={selectedBUs} selectedClosers={selectedClosers} />
        </div>
        <ClickableFunnelChart startDate={startDate} endDate={endDate} selectedBU={selectedBU} selectedBUs={selectedBUs} selectedClosers={effectiveSelectedClosers} selectedSDRs={effectiveSelectedSDRs} selectedOrigens={selectedOrigens} />
      </div>

      {/* Charts Section with View Mode Toggle */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Gráficos de Indicadores</h3>
          <ToggleGroup 
            type="single" 
            value={viewMode} 
            onValueChange={(v) => v && setViewMode(v as ViewMode)}
            className="bg-muted rounded-lg p-1"
          >
            <ToggleGroupItem 
              value="daily" 
              aria-label="Meta Diária"
              className="data-[state=on]:bg-background data-[state=on]:shadow-sm gap-2 px-3"
            >
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Meta Diária</span>
            </ToggleGroupItem>
            <ToggleGroupItem 
              value="accumulated" 
              aria-label="Meta Acumulada"
              className="data-[state=on]:bg-background data-[state=on]:shadow-sm gap-2 px-3"
            >
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Meta Acumulada</span>
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        
        {indicatorConfigs.map((indicator) => (
          <IndicatorChartSection 
            key={indicator.key} 
            title={indicator.label} 
            realizedLabel={indicator.shortLabel}
            realizedTotal={getRealizedForIndicator(indicator)} 
            metaTotal={getMetaForIndicator(indicator)}
            chartData={getChartDataForIndicator(indicator)} 
            gradientId={`gradient-${indicator.key}`}
            isAccumulated={viewMode === 'accumulated'}
          />
        ))}
      </div>

      {/* Revenue Charts - Barras Agrupadas + Dashboard — lazy */}
      <Suspense fallback={<Card className="bg-card border-border"><CardContent className="h-72 flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></CardContent></Card>}>
      <RevenueChartComparison
        startDate={startDate}
        endDate={endDate}
        selectedBUs={selectedBUs}
        selectedClosers={selectedClosers}
      />
      </Suspense>

      {/* Funnel Conversion by Revenue Tier Analysis — lazy */}
      <Suspense fallback={<Card className="bg-card border-border"><CardContent className="h-72 flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></CardContent></Card>}>
      <FunnelConversionByTierWidget
        getItemsForIndicator={getItemsForIndicator}
        getItemsWithFullHistory={getItemsWithFullHistory}
      />
      </Suspense>

      {(isLoading || isLoadingExpansao || isLoadingO2Tax) && (
        <div className="fixed inset-0 bg-background/50 flex items-center justify-center z-50">
          <div className="flex items-center gap-2 bg-card p-4 rounded-lg shadow-lg"><Loader2 className="h-5 w-5 animate-spin" /><span>Carregando dados...</span></div>
        </div>
      )}

      {/* Card Investigator - diagnostic tool */}
      <div className="flex justify-end mt-4">
        <span
          className="text-[10px] text-muted-foreground/30 hover:text-muted-foreground cursor-pointer transition-colors select-none"
          onClick={() => setCardInvestigatorOpen(true)}
        >
          auditoria
        </span>
      </div>
      <CardInvestigator open={cardInvestigatorOpen} onOpenChange={setCardInvestigatorOpen} />

      {/* Detail Sheet for Radial Cards */}
      <DetailSheet
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
        title={detailSheetTitle}
        description={detailSheetDescription}
        items={detailSheetItems}
        columns={detailSheetColumns}
        kpis={detailSheetKpis}
        charts={detailSheetCharts}
        filterCriteria={detailSheetFilterCriteria}
        extraContent={detailSheetExtraContent}
      />
    </div>
  );
}
