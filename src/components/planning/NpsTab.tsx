import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
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
import { ChevronDown, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';

function parseEntradaDate(entrada: string | null | undefined): Date | null {
  if (!entrada) return null;
  try {
    // Try DD/MM/YYYY format
    const parts = entrada.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (parts) return new Date(+parts[3], +parts[2] - 1, +parts[1]);
    // Try ISO format
    return parseISO(entrada);
  } catch {
    return null;
  }
}

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
        // "Entrada" = current active survey round = Q1
        if (faseAtual === 'entrada' && qNumber === '1') {
          matchingIds.add(id);
        }
      });
      filtered = filtered.filter(c => matchingIds.has(c.ID));
    } else if (dateRange?.from && dateRange?.to) {
      // Custom date range filter
      const start = startOfDay(dateRange.from);
      const end = endOfDay(dateRange.to);
      filtered = filtered.filter(c => {
        const d = parseEntradaDate(c['Entrada']);
        if (!d) return false;
        return isWithinInterval(d, { start, end });
      });
    } else if (selectedYear !== 'all') {
      const y = parseInt(selectedYear);
      if (!isNaN(y)) {
        filtered = filtered.filter(c => {
          const d = parseEntradaDate(c['Entrada']);
          if (!d) return false;
          return d.getFullYear() === y;
        });
      }
    }

    // When a filter is active, don't use totalEligible (it's the CURRENT count, not historical)
    const hasActiveFilter = isQuarterFilter || (dateRange?.from && dateRange?.to) || selectedProdutos.length > 0 || selectedCfos.length > 0 || selectedYear !== 'all';
    const totalEligible = hasActiveFilter ? undefined : npsData.raw.totalEligible;
    const cfoEligibleMap = hasActiveFilter ? undefined : npsData.raw.cfoEligibleMap;
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
            <ChurnDossierSection data={opsData?.churnDossier || []} />
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
            <OperationsSection />
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
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
