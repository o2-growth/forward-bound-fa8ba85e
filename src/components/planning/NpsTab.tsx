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

import { useNpsData, processNpsData, NpsCard } from '@/hooks/useNpsData';
import { useOperationsData } from '@/hooks/useOperationsData';
import { parsePipefyDate } from '@/hooks/dateUtils';
import { QuarterlyComparison } from './nps/QuarterlyComparison';
import { OkrProximity } from './nps/OkrProximity';
import { ChevronDown, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { isWithinInterval, startOfDay, endOfDay } from 'date-fns';

export function NpsTab() {
  const [npsOpen, setNpsOpen] = useState(true);
  const [churnOpen, setChurnOpen] = useState(false);
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

                <NpsKpiCards data={displayData.kpis} cfoPerformance={displayData.cfoPerformance} />
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

                <QuarterlyComparison visible={selectedPeriod === 'q1'} />
                <OkrProximity
                  npsScore={displayData.metrics.nps.score}
                  csatScore={displayData.metrics.csat.score}
                  visible={selectedPeriod === 'q1'}
                />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
