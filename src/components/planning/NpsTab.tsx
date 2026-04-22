import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NpsKpiCards } from './nps/NpsKpiCards';
import { NpsGauges } from './nps/NpsGauges';
import { NpsScoreCards } from './nps/NpsScoreCards';
import { NpsDistributions } from './nps/NpsDistributions';
import { CfoPerformanceTable } from './nps/CfoPerformanceTable';
import { QualitativeFeedback } from './nps/QualitativeFeedback';
import { ChurnDossierSection } from './nps/ChurnDossierSection';
import { NpsFilters } from './nps/NpsFilters';

import { OperationsSection } from './nps/OperationsSection';
import { useNpsData, processNpsData, NpsCard } from '@/hooks/useNpsData';
import { useOperationsData } from '@/hooks/useOperationsData';
import { parsePipefyDate } from '@/hooks/dateUtils';
import { ChevronDown, ChevronRight, Loader2, AlertCircle, TrendingDown, TrendingUp, Users, DollarSign, Clock, BarChart3 } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ComposedChart, Cell, LabelList,
} from 'recharts';

export function NpsTab() {
  const [npsOpen, setNpsOpen] = useState(false);
  const [churnOpen, setChurnOpen] = useState(true);
  const [opsOpen, setOpsOpen] = useState(false);
  const { data: npsData, isLoading, error } = useNpsData();
  const { data: opsData } = useOperationsData();

  // Filter state
  const [selectedProdutos, setSelectedProdutos] = useState<string[]>([]);
  const [selectedCfos, setSelectedCfos] = useState<string[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // Extract unique produtos and cfos from raw data
  const { produtos, cfos } = useMemo(() => {
    if (!npsData?.raw) return { produtos: [], cfos: [] };
    const { produtoMap, cfoMap, npsRows } = npsData.raw;

    const allCfos = new Set(Object.values(cfoMap));
    npsRows.forEach(c => {
      const cfo = c['CFO Responsavel'] || c['Responsavel Tratativa'];
      if (cfo) allCfos.add(cfo);
    });

    return {
      produtos: [...new Set(Object.values(produtoMap).flat())].filter(Boolean).sort(),
      cfos: [...allCfos].filter(Boolean).sort(),
    };
  }, [npsData?.raw]);

  // Filtered and processed NPS data
  const filteredNpsData = useMemo(() => {
    if (!npsData?.raw) return null;
    const { npsRows, cfoMap, titleMap, produtoMap, npsPipeId } = npsData.raw;

    let filtered: NpsCard[] = npsRows;

    // Filter by produto
    if (selectedProdutos.length > 0) {
      const matchingIds = new Set(
        Object.entries(produtoMap)
          .filter(([, products]) => products.some(p => selectedProdutos.includes(p)))
          .map(([id]) => id)
      );
      filtered = filtered.filter(c => matchingIds.has(c.ID));
    }

    // Filter by CFO
    if (selectedCfos.length > 0) {
      filtered = filtered.filter(c => {
        const cfo = cfoMap[c.ID] || c['CFO Responsavel'] || c['Responsavel Tratativa'];
        return cfo ? selectedCfos.includes(cfo) : false;
      });
    }

    // Filter by quarter (Q1-Q4) using Fase Atual, NOT date range
    // Q1 = "Entrada" phase, Q4 = "Q4/2025" phase, etc.
    const isQuarterFilter = selectedPeriod && ['q1','q2','q3','q4'].includes(selectedPeriod);
    if (isQuarterFilter) {
      const qNumber = selectedPeriod.replace('q', '');
      // Get latest row per card to check Fase Atual
      const latestPerCard = new Map<string, NpsCard>();
      filtered.forEach(r => {
        const existing = latestPerCard.get(r.ID);
        if (!existing || r['Entrada'] > existing['Entrada']) {
          latestPerCard.set(r.ID, r);
        }
      });
      const matchingIds = new Set<string>();
      latestPerCard.forEach((card, id) => {
        const faseAtual = (card['Fase Atual'] || '').toLowerCase();
        // Match Q-phase: "q4/2025", "q1/2026", etc.
        if (faseAtual.startsWith(`q${qNumber}`)) {
          matchingIds.add(id);
        }
        // "Entrada" = current active survey round = Q1, but exclude cards from previous quarters
        // by checking the Entrada date (Q1/2026 = Jan-Mar 2026)
        if (faseAtual === 'entrada' && qNumber === '1') {
          const entradaDate = parsePipefyDate(card['Entrada']);
          if (entradaDate && entradaDate >= new Date('2026-01-01')) {
            matchingIds.add(id);
          }
        }
      });
      filtered = filtered.filter(c => matchingIds.has(c.ID));
    } else if (dateRange?.from && dateRange?.to) {
      // Custom date range filter
      const start = startOfDay(dateRange.from);
      const end = endOfDay(dateRange.to);
      filtered = filtered.filter(c => {
        const d = parsePipefyDate(c['Entrada']);
        if (!d) return false;
        return isWithinInterval(d, { start, end });
      });
    } else if (selectedYear !== 'all') {
      const y = parseInt(selectedYear);
      if (!isNaN(y)) {
        filtered = filtered.filter(c => {
          const d = parsePipefyDate(c['Entrada']);
          if (!d) return false;
          return d.getFullYear() === y;
        });
      }
    }

    // Historical survey counts per quarter (from actual survey lists — aba Status3)
    const QUARTER_SURVEY_COUNTS: Record<string, number> = {
      q1: 91,  // Q1/2026 — 34 respondidas + 57 pendentes (source: Status3 sheet)
    };
    // Per-CFO survey counts for Q1 (uses CFO names as they appear in central_projetos)
    const QUARTER_CFO_SURVEY_COUNTS: Record<string, Record<string, number>> = {
      q1: {
        'Oliveira': 11,
        'Douglas Schossler': 11,
        'Eduardo Milani Pedrolo': 21,
        'Everton Bisinella': 9,
        'Gustavo Cochlar': 10,
        "Eduardo D'Agostini": 14,
        'Mariana Luz da Silva': 15,
      },
    };
    // Clients NOT in Q1 survey list but present in Pipefy NPS with "Entrada" phase
    const QUARTER_EXCLUDE_CLIENTS: Record<string, string[]> = {
      q1: ['hlv stones', 'datweb'],
    };

    // Exclude non-survey clients from Q1
    if (isQuarterFilter && QUARTER_EXCLUDE_CLIENTS[selectedPeriod]) {
      const excludeList = QUARTER_EXCLUDE_CLIENTS[selectedPeriod];
      filtered = filtered.filter(c => {
        const title = (c['Título'] || '').trim().toLowerCase();
        return !excludeList.some(ex => title.includes(ex));
      });
    }

    // When a filter is active, don't use totalEligible (it's the CURRENT count, not historical)
    const hasActiveFilter = isQuarterFilter || (dateRange?.from && dateRange?.to) || selectedProdutos.length > 0 || selectedCfos.length > 0 || selectedYear !== 'all';
    const quarterSurveyCount = isQuarterFilter ? QUARTER_SURVEY_COUNTS[selectedPeriod] : undefined;
    const totalEligible = quarterSurveyCount ?? (hasActiveFilter ? undefined : npsData.raw.totalEligible);
    const cfoEligibleMap = isQuarterFilter
      ? QUARTER_CFO_SURVEY_COUNTS[selectedPeriod]
      : (hasActiveFilter ? undefined : npsData.raw.cfoEligibleMap);
    return processNpsData(filtered, cfoMap, titleMap, npsPipeId, totalEligible, cfoEligibleMap);
  }, [npsData?.raw, selectedProdutos, selectedCfos, dateRange, selectedYear, selectedPeriod]);

  const handlePeriodChange = (period: string, range?: DateRange) => {
    setSelectedPeriod(period);
    setDateRange(range);
  };

  const handleClearFilters = () => {
    setSelectedProdutos([]);
    setSelectedCfos([]);
    setSelectedPeriod('all');
    setSelectedYear('all');
    setDateRange(undefined);
  };

  // Use filtered data when filters are active, otherwise use original
  const hasDateFilter = Boolean(dateRange?.from && dateRange?.to);
  const hasFilters = selectedProdutos.length > 0 || selectedCfos.length > 0 || hasDateFilter || selectedYear !== 'all' || (selectedPeriod !== 'all');
  // Always use filteredNpsData when available — it already returns full data when no filters match
  const displayData = filteredNpsData ?? npsData;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="secondary">2025</Badge>
          <Badge variant="outline">Customer Success</Badge>
        </div>
        <h1 className="text-3xl font-bold text-foreground">Customer Success — Operação & NPS</h1>
        <p className="text-muted-foreground mt-1">Visão completa de operação e satisfação — O2 Inc.</p>
      </div>

      {/* Filters - always visible */}
      {(displayData || isLoading) && (
        <NpsFilters
          produtos={produtos}
          cfos={cfos}
          selectedProdutos={selectedProdutos}
          selectedCfos={selectedCfos}
          selectedPeriod={selectedPeriod}
          selectedYear={selectedYear}
          dateRange={dateRange}
          onProdutosChange={setSelectedProdutos}
          onCfosChange={setSelectedCfos}
          onPeriodChange={handlePeriodChange}
          onYearChange={setSelectedYear}
          onClear={handleClearFilters}
        />
      )}

      {/* Dossiê de Churn - No topo, aberto por padrão */}
      <div className="space-y-4">
        <button
          onClick={() => setChurnOpen(!churnOpen)}
          className="flex items-center gap-2 text-xl font-semibold text-foreground hover:text-primary transition-colors w-full text-left"
        >
          {churnOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
          📉 Dossiê de Churn
          <Badge variant="outline" className="ml-2 text-xs font-normal">
            {churnOpen ? 'Clique para fechar' : 'Clique para abrir'}
          </Badge>
        </button>

        {churnOpen && (
          <div className="animate-in fade-in-0 slide-in-from-top-2 duration-300">
            <ChurnDossierSection
              data={opsData?.churnDossier || []}
              selectedProdutos={selectedProdutos}
              globalCfos={selectedCfos}
              globalDateRange={
                selectedPeriod === 'q1' ? { from: new Date('2026-01-01'), to: new Date('2026-03-31') } :
                selectedPeriod === 'q2' ? { from: new Date('2026-04-01'), to: new Date('2026-06-30') } :
                selectedPeriod === 'q3' ? { from: new Date('2026-07-01'), to: new Date('2026-09-30') } :
                selectedPeriod === 'q4' ? { from: new Date('2025-10-01'), to: new Date('2025-12-31') } :
                dateRange?.from && dateRange?.to ? { from: dateRange.from, to: dateRange.to } :
                undefined
              }
            />
          </div>
        )}
      </div>

      {/* Operação Section - Collapsible */}
      <div className="space-y-4">
        <button
          onClick={() => setOpsOpen(!opsOpen)}
          className="flex items-center gap-2 text-xl font-semibold text-foreground hover:text-primary transition-colors w-full text-left"
        >
          {opsOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
          📊 Operação
          <Badge variant="outline" className="ml-2 text-xs font-normal">
            {opsOpen ? 'Clique para fechar' : 'Clique para abrir'}
          </Badge>
        </button>

        {opsOpen && (
          <div className="animate-in fade-in-0 slide-in-from-top-2 duration-300">
            <OperationsSection
              selectedProdutos={selectedProdutos}
              selectedCfos={selectedCfos}
              dateRange={dateRange}
            />
          </div>
        )}
      </div>

      {/* NPS Section - Collapsible */}
      <div className="space-y-4">
        <button
          onClick={() => setNpsOpen(!npsOpen)}
          className="flex items-center gap-2 text-xl font-semibold text-foreground hover:text-primary transition-colors w-full text-left"
        >
          {npsOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
          📋 Resultados NPS
          <Badge variant="outline" className="ml-2 text-xs font-normal">
            {npsOpen ? 'Clique para fechar' : 'Clique para abrir'}
          </Badge>
        </button>

        {npsOpen && (
          <div className="space-y-8 animate-in fade-in-0 slide-in-from-top-2 duration-300">
            {isLoading && (
              <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Carregando dados NPS...</span>
              </div>
            )}
            {error && (
              <div className="flex items-center justify-center py-12 gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <span>Erro ao carregar dados NPS: {(error as Error).message}</span>
              </div>
            )}
            {hasFilters && !displayData && !isLoading && (
              <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
                <AlertCircle className="h-5 w-5" />
                <span>Nenhum card encontrado para os filtros selecionados.</span>
              </div>
            )}
            {displayData && (
              <>

                <NpsKpiCards data={displayData.kpis} />
                <NpsGauges data={displayData.metrics} />
                <NpsScoreCards
                  metrics={displayData.metrics}
                  npsDistribution={displayData.npsDistribution}
                  csatDistribution={displayData.csatDistribution}
                  seanEllisDistribution={displayData.seanEllisDistribution}
                />
                <NpsDistributions
                  npsDistribution={displayData.npsDistribution}
                  csatDistribution={displayData.csatDistribution}
                  seanEllisDistribution={displayData.seanEllisDistribution}
                  seExcluded={displayData.seExcluded}
                />
                <CfoPerformanceTable data={displayData.cfoPerformance} npsPipeId={displayData.npsPipeId} />
                <QualitativeFeedback data={displayData.feedback} npsPipeId={displayData.npsPipeId} />

                {/* Q4/2025 vs Q1/2026 Comparison — only when Q1 selected */}
                {selectedPeriod === 'q1' && (() => {
                  const revenueChurnMonthly = [
                    { month: 'Jan/26', value: 18737, pct: 2.67 },
                    { month: 'Fev/26', value: 35457, pct: 4.39 },
                    { month: 'Mar/26', value: 85078, pct: 10.22 },
                  ];
                  const logoChurnMonthly = [
                    { month: 'Jan/26', value: 3, pct: 2.52 },
                    { month: 'Fev/26', value: 7, pct: 5.47 },
                    { month: 'Mar/26', value: 15, pct: 11.36 },
                  ];
                  const q4RevenueChurnAvg = 57534; // 172603 / 3
                  const q4LogoChurnAvg = 7.3; // 22 / 3

                  // Quarter totals for side-by-side comparison
                  const revenueQuarterTotals = [
                    { quarter: 'Q4/2025', value: 172603, pct: 9.3 },
                    { quarter: 'Q1/2026', value: 139273, pct: 5.95 },
                  ];
                  const logoQuarterTotals = [
                    { quarter: 'Q4/2025', value: 22, pct: 19.2 },
                    { quarter: 'Q1/2026', value: 25, pct: 19.79 },
                  ];
                  const quarterColors = ['#94a3b8', '#ef4444']; // gray for Q4, red for Q1
                  const logoQuarterColors = ['#94a3b8', '#f97316']; // gray for Q4, orange for Q1

                  const formatBRL = (v: number) =>
                    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 });

                  const revenueTooltipFormatter = (value: number) => formatBRL(value);
                  const logoTooltipFormatter = (value: number) => `${value} clientes`;

                  type MetricRow = { icon: React.ReactNode; label: string; q4: string; q1: string; badge: string; good: boolean };
                  const metrics: MetricRow[] = [
                    { icon: <DollarSign className="h-4 w-4" />, label: 'MRR Base Médio', q4: 'R$ 616.341', q1: 'R$ 780.582', badge: '+26,6%', good: true },
                    { icon: <TrendingDown className="h-4 w-4" />, label: 'Revenue Churn', q4: 'R$ 172.603 (9,3%)', q1: 'R$ 139.273 (5,95%)', badge: '-3,35pp', good: true },
                    { icon: <Users className="h-4 w-4" />, label: 'Logo Churn', q4: '22 clientes (19,2%)', q1: '25 clientes (19,79%)', badge: '+0,59pp', good: false },
                    { icon: <Clock className="h-4 w-4" />, label: 'LT Médio', q4: '5,76 meses', q1: '5,2 meses', badge: '-0,56m', good: false },
                    { icon: <BarChart3 className="h-4 w-4" />, label: 'Clientes Ativos', q4: '114,7', q1: '126,3', badge: '+11,6', good: true },
                  ];

                  const renderRevenueLabel = (props: { x?: number; y?: number; width?: number; index?: number }) => {
                    const { x = 0, y = 0, width = 0, index = 0 } = props;
                    const item = revenueQuarterTotals[index];
                    if (!item) return null;
                    return (
                      <text x={x + width / 2} y={y - 8} textAnchor="middle" fontSize={11} fontWeight={600} fill="#64748b">
                        {item.pct}%
                      </text>
                    );
                  };

                  const renderLogoLabel = (props: { x?: number; y?: number; width?: number; index?: number }) => {
                    const { x = 0, y = 0, width = 0, index = 0 } = props;
                    const item = logoQuarterTotals[index];
                    if (!item) return null;
                    return (
                      <text x={x + width / 2} y={y - 8} textAnchor="middle" fontSize={11} fontWeight={600} fill="#64748b">
                        {item.pct}%
                      </text>
                    );
                  };

                  return (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold">Comparativo Trimestral — Q4/2025 vs Q1/2026</h3>

                    {/* Summary cards - compact grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card className="border-muted">
                        <CardHeader className="pb-1 pt-4 px-4">
                          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Q4/2025</CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-4 pt-2">
                          <div className="space-y-2">
                            {metrics.map((m, i) => (
                              <div key={i} className="flex items-center gap-2 text-sm">
                                <span className="text-muted-foreground shrink-0">{m.icon}</span>
                                <span className="text-muted-foreground min-w-[110px]">{m.label}</span>
                                <span className="font-medium ml-auto text-right">{m.q4}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-primary/30">
                        <CardHeader className="pb-1 pt-4 px-4">
                          <CardTitle className="text-sm font-semibold text-primary uppercase tracking-wide">Q1/2026</CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-4 pt-2">
                          <div className="space-y-2">
                            {metrics.map((m, i) => (
                              <div key={i} className="flex items-center gap-2 text-sm">
                                <span className="text-muted-foreground shrink-0">{m.icon}</span>
                                <span className="text-muted-foreground min-w-[110px]">{m.label}</span>
                                <span className="font-medium ml-auto">{m.q1}</span>
                                <Badge className={`text-[10px] px-1.5 py-0 ${m.good
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                }`}>{m.badge}</Badge>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Row 1: Quarter-total comparison charts (Q4 vs Q1 side by side bars) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Revenue Churn — Q4 vs Q1 totals */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-semibold">Revenue Churn — Q4 vs Q1 (Total)</CardTitle>
                          <p className="text-xs text-muted-foreground">Valores consolidados por trimestre</p>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={revenueQuarterTotals} margin={{ top: 24, right: 10, left: 10, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                              <XAxis dataKey="quarter" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                              <YAxis
                                tick={{ fontSize: 11 }}
                                className="fill-muted-foreground"
                                tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                              />
                              <Tooltip
                                formatter={revenueTooltipFormatter}
                                labelStyle={{ fontWeight: 600 }}
                                contentStyle={{ borderRadius: 8, fontSize: 13 }}
                              />
                              <Bar dataKey="value" name="Revenue Churn" radius={[4, 4, 0, 0]} maxBarSize={64}>
                                {revenueQuarterTotals.map((_entry, idx) => (
                                  <Cell key={idx} fill={quarterColors[idx]} />
                                ))}
                                <LabelList content={renderRevenueLabel} />
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>

                      {/* Logo Churn — Q4 vs Q1 totals */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-semibold">Logo Churn — Q4 vs Q1 (Total)</CardTitle>
                          <p className="text-xs text-muted-foreground">Quantidade de clientes por trimestre</p>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={logoQuarterTotals} margin={{ top: 24, right: 10, left: 10, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                              <XAxis dataKey="quarter" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                              <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                              <Tooltip
                                formatter={logoTooltipFormatter}
                                labelStyle={{ fontWeight: 600 }}
                                contentStyle={{ borderRadius: 8, fontSize: 13 }}
                              />
                              <Bar dataKey="value" name="Logo Churn" radius={[4, 4, 0, 0]} maxBarSize={64}>
                                {logoQuarterTotals.map((_entry, idx) => (
                                  <Cell key={idx} fill={logoQuarterColors[idx]} />
                                ))}
                                <LabelList content={renderLogoLabel} />
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Row 2: Monthly Q1 breakdown charts with Q4 reference lines */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Revenue Churn monthly chart */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-semibold">Revenue Churn Mensal (Q1/2026)</CardTitle>
                          <p className="text-xs text-muted-foreground">Linha tracejada = média mensal Q4/2025 (R$ 57.534)</p>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={240}>
                            <ComposedChart data={revenueChurnMonthly} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                              <XAxis dataKey="month" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                              <YAxis
                                tick={{ fontSize: 11 }}
                                className="fill-muted-foreground"
                                tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                              />
                              <Tooltip
                                formatter={revenueTooltipFormatter}
                                labelStyle={{ fontWeight: 600 }}
                                contentStyle={{ borderRadius: 8, fontSize: 13 }}
                              />
                              <ReferenceLine
                                y={q4RevenueChurnAvg}
                                stroke="#94a3b8"
                                strokeDasharray="6 4"
                                strokeWidth={2}
                                label={{ value: 'Média Q4', position: 'right', fontSize: 11, fill: '#94a3b8' }}
                              />
                              <Bar dataKey="value" name="Revenue Churn" radius={[4, 4, 0, 0]} maxBarSize={48} fill="#ef4444" />
                            </ComposedChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>

                      {/* Logo Churn monthly chart */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-semibold">Logo Churn Mensal (Q1/2026)</CardTitle>
                          <p className="text-xs text-muted-foreground">Linha tracejada = média mensal Q4/2025 (7,3 clientes)</p>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={240}>
                            <ComposedChart data={logoChurnMonthly} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                              <XAxis dataKey="month" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                              <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                              <Tooltip
                                formatter={logoTooltipFormatter}
                                labelStyle={{ fontWeight: 600 }}
                                contentStyle={{ borderRadius: 8, fontSize: 13 }}
                              />
                              <ReferenceLine
                                y={q4LogoChurnAvg}
                                stroke="#94a3b8"
                                strokeDasharray="6 4"
                                strokeWidth={2}
                                label={{ value: 'Média Q4', position: 'right', fontSize: 11, fill: '#94a3b8' }}
                              />
                              <Bar dataKey="value" name="Logo Churn" radius={[4, 4, 0, 0]} maxBarSize={48} fill="#f97316" />
                            </ComposedChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Revenue Churn % trend — gauge-like comparison */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold">Revenue Churn % — Tendência Trimestral</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-center gap-8 py-4">
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Q4/2025</p>
                            <p className="text-3xl font-bold text-red-500">9,3%</p>
                          </div>
                          <div className="flex flex-col items-center gap-1">
                            <TrendingDown className="h-6 w-6 text-green-500" />
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-sm font-semibold px-3">
                              -3,35pp
                            </Badge>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Q1/2026</p>
                            <p className="text-3xl font-bold text-amber-500">5,95%</p>
                          </div>
                        </div>
                        {/* Progress-like bar showing improvement */}
                        <div className="max-w-md mx-auto mt-2">
                          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                            <span>Meta: 5%</span>
                            <span>Q4: 9,3%</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-3 relative">
                            {/* Q4 marker */}
                            <div
                              className="absolute top-0 h-3 rounded-full bg-red-400/40"
                              style={{ width: '93%' }}
                            />
                            {/* Q1 current */}
                            <div
                              className="absolute top-0 h-3 rounded-full bg-amber-500"
                              style={{ width: '59.5%' }}
                            />
                            {/* Meta line */}
                            <div
                              className="absolute top-0 h-3 border-r-2 border-green-600 border-dashed"
                              style={{ left: '50%' }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground text-center mt-1">Falta 0,95pp para atingir a meta de 5%</p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Insights */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Insights — Q4/25 vs Q1/26</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4 text-sm">
                        <div>
                          <p><span className="font-semibold">1. Receita perdida caiu, mas qtde de clientes subiu:</span> Q4 perdeu R$172k em 22 clientes; Q1 perdeu R$139k em 25 clientes. Tickets menores no Q1 — sinal de churn pulverizado, mais difícil de prever e prevenir.</p>
                        </div>
                        <div>
                          <p><span className="font-semibold">2. Mudança de motivo dominante:</span> em Q4, &quot;Financeiro&quot; (caixa do cliente) foi o principal motivo (~50%). Em Q1, ele perde força — entram fortes &quot;Atendimento O2&quot;, &quot;Problema na Oxy&quot; e &quot;Comercial&quot;. Esses motivos são <strong>internos</strong> e <strong>acionáveis</strong>.</p>
                        </div>
                        <div>
                          <p><span className="font-semibold">3. Março/26 é o pior mês dos 6:</span> 15 churns e 10,22% de Revenue Churn. Saltou de 7 (Fev) para 15 churns — 114% de aumento. Eduardo Pedrolo concentrou 6 cancelamentos.</p>
                        </div>
                        <div>
                          <p><span className="font-semibold">4. Janeiro/26 foi o melhor mês:</span> apenas 3 churns recorrentes (2,52%) e Revenue Churn de 2,67%. Mostra que a meta é viável quando há controle — o desafio é manter consistência.</p>
                        </div>
                        <div>
                          <p><span className="font-semibold">5. MRR cresceu 26,7% trimestre vs trimestre</span> (R$616k → R$781k médio), mas o Logo Churn % se manteve quase igual (~19%). A operação cresceu sem corrigir a porta dos fundos.</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  );
                })()}

                {/* OKRs Q1 - Visível quando Q1 selecionado */}
                {selectedPeriod === 'q1' && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <span>⊙</span> Proximidade das Metas (KRs) — Q1/2026 (Consolidado)
                    </h3>
                    <p className="text-sm text-muted-foreground">Responsável: Andréa Franzen</p>
                    <div className="space-y-2">
                      {(() => {
                        const npsScore = displayData.metrics.nps.score;
                        const csatScore = displayData.metrics.csat.score;
                        // Valores CONSOLIDADOS do Q1 (trimestre inteiro, não último mês)
                        const ltMedio = 5.2;      // Consolidado (c): média ponderada
                        const logoChurn = 19.79;  // Consolidado (b): 25 clientes / 126.3 média
                        const revenueChurn = 5.95; // Consolidado (a): R$139.272,50 / R$2.341.745,87

                        const krs = [
                          { label: 'Manter LT acima de 8 meses', value: `${ltMedio} meses`, meta: 'Meta: 8 meses', pct: (ltMedio / 8) * 100, hit: ltMedio >= 8, showBar: true },
                          { label: 'Manter Logo Churn abaixo de 5%', value: `${logoChurn}%`, meta: 'Meta: 5%', pct: 100 - ((logoChurn - 5) / 5) * 100, hit: logoChurn <= 5, showBar: false },
                          { label: 'Manter Revenue Churn abaixo de 5%', value: `${revenueChurn}%`, meta: 'Meta: 5%', pct: 100 - ((revenueChurn - 5) / 5) * 100, hit: revenueChurn <= 5, showBar: false },
                          { label: 'Manter NPS (90-100) acima de 40', value: String(npsScore), meta: 'Meta: 40', pct: (npsScore / 40) * 100, hit: npsScore >= 40, showBar: false },
                          { label: 'Manter CSAT acima de 80%', value: `${csatScore}%`, meta: 'Meta: 80%', pct: (csatScore / 80) * 100, hit: csatScore >= 80, showBar: false },
                        ];

                        return krs.map((kr, i) => (
                          <div key={i} className="flex items-center justify-between border rounded-lg p-4">
                            <div className="flex items-center gap-3 flex-1">
                              <span className={`text-lg ${kr.hit ? 'text-green-500' : 'text-red-500'}`}>
                                {kr.hit ? '✅' : '⊗'}
                              </span>
                              <div className="flex-1">
                                <span className="font-medium">{kr.label}</span>
                                {kr.showBar && (
                                  <div className="w-full bg-muted rounded-full h-2.5 mt-2 max-w-md">
                                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, kr.pct))}%` }} />
                                  </div>
                                )}
                              </div>
                            </div>
                            <span className={`text-sm font-medium whitespace-nowrap ${kr.hit ? 'text-green-600' : 'text-red-500'}`}>
                              {kr.value} / {kr.meta}
                            </span>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
