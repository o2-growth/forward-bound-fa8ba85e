import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, Cell } from "recharts";
import { ChevronDown, ChevronUp, TrendingUp, AlertTriangle, History } from "lucide-react";
import { DetailItem, DetailSheet, columnFormatters } from "./DetailSheet";
import { IndicatorType } from "@/hooks/useFunnelRealized";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

// Tier normalization map - maps database values to 8 standardized display labels
const TIER_NORMALIZATION: Record<string, string> = {
  // Tier 1: Ainda não fatura
  'Ainda não faturamos': 'Ainda não fatura',
  
  // Tier 2: Menos de R$ 100k
  'Menos de R$ 100 mil': '< R$ 100k',
  
  // Tier 3: R$ 100k - 200k (não qualifica como MQL)
  'Entre R$ 100 mil e R$ 200 mil': 'R$ 100k - 200k',
  
  // Tier 4: R$ 200k - 350k
  'Entre R$ 200 mil e R$ 350 mil': 'R$ 200k - 350k',
  
  // Tier 5: R$ 350k - 500k
  'Entre R$ 350 mil e R$ 500 mil': 'R$ 350k - 500k',
  
  // Tier 6: R$ 500k - 1M
  'Entre R$ 500 mil e R$ 1 milhão': 'R$ 500k - 1M',
  
  // Tier 7: R$ 1M - 5M
  'Entre R$ 1 milhão e R$ 5 milhões': 'R$ 1M - 5M',
  
  // Tier 8: Acima de R$ 5M
  'Acima de R$ 5 milhões': '> R$ 5M',
};

// Ordered tiers for display (8 distinct categories)
const TIER_ORDER = [
  'Ainda não fatura',
  '< R$ 100k',
  'R$ 100k - 200k',
  'R$ 200k - 350k',
  'R$ 350k - 500k',
  'R$ 500k - 1M',
  'R$ 1M - 5M',
  '> R$ 5M',
];

// Tier colors for charts (7 distinct colors)
const TIER_COLORS: Record<string, string> = {
  'Ainda não fatura': 'hsl(var(--chart-5))',
  '< R$ 100k': 'hsl(var(--chart-4))',
  'R$ 100k - 200k': 'hsl(30, 70%, 50%)',
  'R$ 200k - 350k': 'hsl(var(--chart-3))',
  'R$ 350k - 500k': 'hsl(210, 70%, 50%)',
  'R$ 500k - 1M': 'hsl(var(--chart-2))',
  'R$ 1M - 5M': 'hsl(270, 70%, 50%)',
  '> R$ 5M': 'hsl(var(--chart-1))',
};

// Conversion stage labels
const STAGE_LABELS = [
  { key: 'mqlToRm', label: 'Lead/MQL → RM', from: 'mql', to: 'rm' },
  { key: 'rmToRr', label: 'RM→RR', from: 'rm', to: 'rr' },
  { key: 'rrToProposta', label: 'RR→Prop', from: 'rr', to: 'proposta' },
  { key: 'propostaToVenda', label: 'Prop→Venda', from: 'proposta', to: 'venda' },
] as const;

interface TierConversionData {
  tier: string;
  leadToMql: number;
  mqlToRm: number;
  rmToRr: number;
  rrToProposta: number;
  propostaToVenda: number;
  leads: number;
  mqls: number;
  rms: number;
  rrs: number;
  propostas: number;
  vendas: number;
}

interface FunnelConversionByTierWidgetProps {
  getItemsForIndicator: (indicator: IndicatorType) => DetailItem[];
  getItemsWithFullHistory?: (indicator: IndicatorType) => DetailItem[];
}

// Normalize tier string to standard format
const normalizeTier = (revenueRange?: string): string => {
  if (!revenueRange) return 'Não informado';
  
  // Try direct match first
  const normalized = TIER_NORMALIZATION[revenueRange];
  if (normalized) return normalized;
  
  // Try case-insensitive match
  const lowerRange = revenueRange.toLowerCase().trim();
  for (const [key, value] of Object.entries(TIER_NORMALIZATION)) {
    if (key.toLowerCase() === lowerRange) return value;
  }
  
  return 'Não informado';
};

// Group items by normalized tier
const groupByTier = (items: DetailItem[]): Map<string, DetailItem[]> => {
  const groups = new Map<string, DetailItem[]>();
  
  items.forEach(item => {
    const tier = normalizeTier(item.revenueRange);
    if (!groups.has(tier)) groups.set(tier, []);
    groups.get(tier)!.push(item);
  });
  
  return groups;
};

// Calculate conversion percentage
const calcConversion = (from: number, to: number): number => {
  if (from === 0) return 0;
  return Math.round((to / from) * 100);
};

// Get color class based on conversion rate
const getConversionColorClass = (rate: number): string => {
  if (rate >= 70) return 'text-chart-2 font-medium';
  if (rate >= 40) return 'text-amber-600 dark:text-amber-400';
  return 'text-destructive font-medium';
};

// Get background color class for cell highlighting
const getConversionBgClass = (rate: number): string => {
  if (rate >= 70) return 'bg-green-50 dark:bg-green-950/30';
  if (rate >= 40) return 'bg-amber-50 dark:bg-amber-950/30';
  return 'bg-red-50 dark:bg-red-950/30';
};

export function FunnelConversionByTierWidget({ getItemsForIndicator, getItemsWithFullHistory }: FunnelConversionByTierWidgetProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [drillDownOpen, setDrillDownOpen] = useState(false);
  const [drillDownTitle, setDrillDownTitle] = useState('');
  const [drillDownItems, setDrillDownItems] = useState<DetailItem[]>([]);
  const [cohortMode, setCohortMode] = useState(false);
  
  // Determine which getter to use based on cohort mode
  const effectiveGetItems = cohortMode && getItemsWithFullHistory 
    ? getItemsWithFullHistory 
    : getItemsForIndicator;
  
  // Fetch items for each stage using the effective getter
  const leads = useMemo(() => effectiveGetItems('leads'), [effectiveGetItems]);
  const mqls = useMemo(() => effectiveGetItems('mql'), [effectiveGetItems]);
  const rms = useMemo(() => effectiveGetItems('rm'), [effectiveGetItems]);
  const rrs = useMemo(() => effectiveGetItems('rr'), [effectiveGetItems]);
  const propostas = useMemo(() => effectiveGetItems('proposta'), [effectiveGetItems]);
  const vendas = useMemo(() => effectiveGetItems('venda'), [effectiveGetItems]);
  
  // Calculate conversion data by tier
  const conversionData = useMemo((): TierConversionData[] => {
    const leadsByTier = groupByTier(leads);
    const mqlsByTier = groupByTier(mqls);
    const rmsByTier = groupByTier(rms);
    const rrsByTier = groupByTier(rrs);
    const propostasByTier = groupByTier(propostas);
    const vendasByTier = groupByTier(vendas);
    
    return TIER_ORDER.map(tier => {
      const leadsCount = leadsByTier.get(tier)?.length || 0;
      const mqlsCount = mqlsByTier.get(tier)?.length || 0;
      const rmsCount = rmsByTier.get(tier)?.length || 0;
      const rrsCount = rrsByTier.get(tier)?.length || 0;
      const propostasCount = propostasByTier.get(tier)?.length || 0;
      const vendasCount = vendasByTier.get(tier)?.length || 0;
      
      return {
        tier,
        leads: leadsCount,
        mqls: mqlsCount,
        rms: rmsCount,
        rrs: rrsCount,
        propostas: propostasCount,
        vendas: vendasCount,
        leadToMql: calcConversion(leadsCount, mqlsCount),
        mqlToRm: calcConversion(mqlsCount, rmsCount),
        rmToRr: calcConversion(rmsCount, rrsCount),
        rrToProposta: calcConversion(rrsCount, propostasCount),
        propostaToVenda: calcConversion(propostasCount, vendasCount),
      };
    });
  }, [leads, mqls, rms, rrs, propostas, vendas]);
  
  // Data for grouped bar chart
  const chartData = useMemo(() => {
    return STAGE_LABELS.map(stage => {
      const data: Record<string, any> = { stage: stage.label };
      TIER_ORDER.forEach(tier => {
        const tierData = conversionData.find(d => d.tier === tier);
        data[tier] = tierData ? tierData[stage.key as keyof TierConversionData] : 0;
      });
      return data;
    });
  }, [conversionData]);
  
  // Handle cell click for drill-down
  const handleCellClick = (tier: string, stage: typeof STAGE_LABELS[number]) => {
    const leadsByTier = groupByTier(leads);
    const mqlsByTier = groupByTier(mqls);
    const rmsByTier = groupByTier(rms);
    const rrsByTier = groupByTier(rrs);
    const propostasByTier = groupByTier(propostas);
    const vendasByTier = groupByTier(vendas);
    
    const tierMaps: Record<string, Map<string, DetailItem[]>> = {
      leads: leadsByTier,
      mql: mqlsByTier,
      rm: rmsByTier,
      rr: rrsByTier,
      proposta: propostasByTier,
      venda: vendasByTier,
    };
    
    // Get items from the "to" stage for the selected tier
    const items = tierMaps[stage.to]?.get(tier) || [];
    
    setDrillDownTitle(`${stage.label} - ${tier}`);
    setDrillDownItems(items);
    setDrillDownOpen(true);
  };
  
  // Check if we have any data
  const hasData = conversionData.some(d => d.leads > 0 || d.mqls > 0);
  
  // Calculate totals for summary
  const totals = useMemo(() => ({
    leads: conversionData.reduce((sum, d) => sum + d.leads, 0),
    mqls: conversionData.reduce((sum, d) => sum + d.mqls, 0),
    vendas: conversionData.reduce((sum, d) => sum + d.vendas, 0),
  }), [conversionData]);
  
  // Find best performing tier (highest MQL→Venda conversion)
  const bestTier = useMemo(() => {
    let best = { tier: '', rate: 0 };
    conversionData.forEach(d => {
      if (d.mqls > 0) {
        const overallConversion = (d.vendas / d.mqls) * 100;
        if (overallConversion > best.rate) {
          best = { tier: d.tier, rate: overallConversion };
        }
      }
    });
    return best;
  }, [conversionData]);
  
  // Find biggest bottleneck
  const bottleneck = useMemo(() => {
    let worst = { tier: '', stage: '', rate: 100 };
    conversionData.forEach(d => {
      STAGE_LABELS.forEach(stage => {
        const fromKey = stage.from as keyof TierConversionData;
        const toKey = stage.to as keyof TierConversionData;
        const fromVal = d[fromKey] as number;
        const toVal = d[toKey] as number;
        if (fromVal > 3) { // Only consider if we have enough data
          const rate = calcConversion(fromVal, toVal);
          if (rate < worst.rate) {
            worst = { tier: d.tier, stage: stage.label, rate };
          }
        }
      });
    });
    return worst;
  }, [conversionData]);
  
  return (
    <TooltipProvider>
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
        <Card className="bg-card border-border">
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-2 cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base font-semibold text-foreground">
                    Conversão de Funil por Tier de Faturamento
                  </CardTitle>
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm">
                  {/* Cohort Mode Toggle */}
                  {getItemsWithFullHistory && (
                    <div 
                      className="flex items-center gap-2 border border-border rounded-md px-2 py-1 bg-muted/30"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-2">
                            <History className="h-3.5 w-3.5 text-muted-foreground" />
                            <Label htmlFor="cohort-mode" className="text-xs text-muted-foreground cursor-pointer">
                              Coorte
                            </Label>
                            <Switch
                              id="cohort-mode"
                              checked={cohortMode}
                              onCheckedChange={setCohortMode}
                              className="scale-75"
                            />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-xs">
                          <p className="font-medium">Modo Coorte</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Ativado: Considera histórico completo dos cards que tiveram atividade no período (ex: card que fechou em Janeiro inclui seu histórico de Dezembro).
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Desativado: Conta apenas movimentações dentro do período selecionado.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  )}
                  {bestTier.tier && (
                    <span className="text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-chart-2" />
                      Melhor: <span className="text-foreground font-medium">{bestTier.tier}</span>
                      <span className="text-chart-2">({bestTier.rate.toFixed(0)}%)</span>
                    </span>
                  )}
                  {bottleneck.tier && bottleneck.rate < 50 && (
                    <span className="text-muted-foreground flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 text-amber-500" />
                      Gargalo: <span className="text-foreground font-medium">{bottleneck.stage}</span>
                      <span className="text-amber-500">({bottleneck.rate}%)</span>
                    </span>
                  )}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent className="pt-0 space-y-6">
              {!hasData ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum dado disponível para o período selecionado
                </div>
              ) : (
                <>
                  {/* Conversion Table */}
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[120px]">Tier de Faturamento</TableHead>
                          {STAGE_LABELS.map(stage => (
                            <TableHead key={stage.key} className="text-center min-w-[90px]">
                              {stage.label}
                            </TableHead>
                          ))}
                          <TableHead className="text-center min-w-[80px]">Volume</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {conversionData.map(row => (
                          <TableRow key={row.tier}>
                            <TableCell className="font-medium">{row.tier}</TableCell>
                            {STAGE_LABELS.map(stage => {
                              const rate = row[stage.key as keyof TierConversionData] as number;
                              const fromKey = stage.from as keyof TierConversionData;
                              const toKey = stage.to as keyof TierConversionData;
                              const fromVal = row[fromKey] as number;
                              const toVal = row[toKey] as number;
                              
                              return (
                                <TableCell 
                                  key={stage.key} 
                                  className={`text-center cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all ${getConversionBgClass(rate)}`}
                                  onClick={() => handleCellClick(row.tier, stage)}
                                >
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className={getConversionColorClass(rate)}>
                                        {rate}%
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{toVal} de {fromVal} converteram</p>
                                      <p className="text-xs text-muted-foreground">Clique para ver detalhes</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TableCell>
                              );
                            })}
                            <TableCell className="text-center text-muted-foreground">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span>{row.leads} leads</span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="space-y-1">
                                    <p>Leads: {row.leads}</p>
                                    <p>MQLs: {row.mqls}</p>
                                    <p>RMs: {row.rms}</p>
                                    <p>RRs: {row.rrs}</p>
                                    <p>Propostas: {row.propostas}</p>
                                    <p>Vendas: {row.vendas}</p>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  
                  
                  {/* Grouped Bar Chart */}
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis 
                          dataKey="stage" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} 
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                          domain={[0, 100]}
                          tickFormatter={(v) => `${v}%`}
                        />
                        <RechartsTooltip 
                          contentStyle={{ 
                            backgroundColor: "hsl(var(--popover))", 
                            border: "1px solid hsl(var(--border))", 
                            borderRadius: "8px", 
                            color: "hsl(var(--popover-foreground))" 
                          }}
                          formatter={(value: number, name: string) => [`${value}%`, name]}
                        />
                        <Legend 
                          wrapperStyle={{ paddingTop: '10px' }}
                          formatter={(value) => <span className="text-sm">{value}</span>}
                        />
                        {TIER_ORDER.map((tier, index) => (
                          <Bar 
                            key={tier} 
                            dataKey={tier} 
                            fill={TIER_COLORS[tier]} 
                            radius={[4, 4, 0, 0]}
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
      
      {/* Drill-down Detail Sheet */}
      <DetailSheet
        open={drillDownOpen}
        onOpenChange={setDrillDownOpen}
        title={drillDownTitle}
        description={`${drillDownItems.length} registros encontrados`}
        items={drillDownItems}
        columns={[
          { key: 'name', label: 'Nome' },
          { key: 'company', label: 'Empresa' },
          { key: 'revenueRange', label: 'Faturamento', format: columnFormatters.revenueRange },
          { key: 'phase', label: 'Fase', format: columnFormatters.phase },
          { key: 'date', label: 'Data', format: columnFormatters.date },
          { key: 'closer', label: 'Closer' },
          { key: 'responsible', label: 'SDR' },
        ]}
      />
    </TooltipProvider>
  );
}
