import { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Filter, X, Info } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { CustomerSuccessFilterProvider, useCustomerSuccessFilters } from '@/contexts/CustomerSuccessFilterContext';
import { useJornadaData } from '@/hooks/useJornadaData';
import { useNpsData, processNpsData, NpsCard } from '@/hooks/useNpsData';
import { useOperationsData } from '@/hooks/useOperationsData';
import { parsePipefyDate } from '@/hooks/dateUtils';
import { PipelineView } from './jornada/PipelineView';
import { ClientesView } from './jornada/ClientesView';
import { CfoView } from './jornada/CfoView';
import { ReunioesView } from './jornada/ReunioesView';
import { AlertasView } from './jornada/AlertasView';
import { NpsKpiCards } from './nps/NpsKpiCards';
import { NpsGauges } from './nps/NpsGauges';
import { NpsScoreCards } from './nps/NpsScoreCards';
import { NpsDistributions } from './nps/NpsDistributions';
import { CfoPerformanceTable } from './nps/CfoPerformanceTable';
import { QualitativeFeedback } from './nps/QualitativeFeedback';
import { NpsFilters } from './nps/NpsFilters';
import { ChurnDossierSection } from './nps/ChurnDossierSection';
import { QuarterlyComparison } from './nps/QuarterlyComparison';
import { OkrProximity } from './nps/OkrProximity';
import { VisaoGeralCS } from './cs/VisaoGeralCS';
import type { JornadaCliente, JornadaCfo, PipelineFase } from './jornada/types';
import { DateRange } from 'react-day-picker';
import { isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { AlertCircle } from 'lucide-react';

function CustomerSuccessTabInner() {
  const { filters, setFilters, clearFilters } = useCustomerSuccessFilters();
  const [activeTab, setActiveTab] = useState('visao-geral');

  // Data hooks
  const { clientes, cfos, alertas, pipeline, reunioes, allCfos, allProdutos, lastSync, isLoading: jornadaLoading, error: jornadaError } = useJornadaData();
  const { data: npsData, isLoading: npsLoading, error: npsError } = useNpsData();
  const { data: opsData } = useOperationsData();

  // NPS filter state (kept local since NPS has its own complex filter logic)
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // Extract NPS filter options
  const { nfProdutos, nfCfos } = useMemo(() => {
    if (!npsData?.raw) return { nfProdutos: [], nfCfos: [] };
    const { produtoMap, cfoMap, npsRows } = npsData.raw;
    const allCfosSet = new Set(Object.values(cfoMap));
    npsRows.forEach(c => {
      const cfo = c['CFO Responsavel'] || c['Responsavel Tratativa'];
      if (cfo) allCfosSet.add(cfo);
    });
    return {
      nfProdutos: [...new Set(Object.values(produtoMap).flat())].filter(Boolean).sort(),
      nfCfos: [...allCfosSet].filter(Boolean).sort(),
    };
  }, [npsData?.raw]);

  // Filtered NPS data
  const filteredNpsData = useMemo(() => {
    if (!npsData?.raw) return null;
    const { npsRows, cfoMap, titleMap, produtoMap, npsPipeId } = npsData.raw;
    let filtered: NpsCard[] = npsRows;

    if (filters.produtos.length > 0) {
      const matchingIds = new Set(
        Object.entries(produtoMap)
          .filter(([, products]) => products.some(p => filters.produtos.includes(p)))
          .map(([id]) => id)
      );
      filtered = filtered.filter(c => matchingIds.has(c.ID));
    }

    if (filters.cfos.length > 0) {
      filtered = filtered.filter(c => {
        const cfo = cfoMap[c.ID] || c['CFO Responsavel'] || c['Responsavel Tratativa'];
        return cfo ? filters.cfos.includes(cfo) : false;
      });
    }

    const isQuarterFilter = selectedPeriod && ['q1','q2','q3','q4'].includes(selectedPeriod);
    if (isQuarterFilter) {
      const qNumber = selectedPeriod.replace('q', '');
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
        if (faseAtual.startsWith(`q${qNumber}`)) matchingIds.add(id);
        if (faseAtual === 'entrada' && qNumber === '1') {
          const entradaDate = parsePipefyDate(card['Entrada']);
          if (entradaDate && entradaDate >= new Date('2026-01-01')) matchingIds.add(id);
        }
      });
      filtered = filtered.filter(c => matchingIds.has(c.ID));
    } else if (dateRange?.from && dateRange?.to) {
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

    const QUARTER_SURVEY_COUNTS: Record<string, number> = { q1: 91 };
    const QUARTER_CFO_SURVEY_COUNTS: Record<string, Record<string, number>> = {
      q1: {
        'Oliveira': 11, 'Douglas Schossler': 11, 'Eduardo Milani Pedrolo': 21,
        'Everton Bisinella': 9, 'Gustavo Cochlar': 10, "Eduardo D'Agostini": 14,
        'Mariana Luz da Silva': 15,
      },
    };
    const QUARTER_EXCLUDE_CLIENTS: Record<string, string[]> = { q1: ['hlv stones', 'datweb'] };

    if (isQuarterFilter && QUARTER_EXCLUDE_CLIENTS[selectedPeriod]) {
      const excludeList = QUARTER_EXCLUDE_CLIENTS[selectedPeriod];
      filtered = filtered.filter(c => {
        const title = (c['Título'] || '').trim().toLowerCase();
        return !excludeList.some(ex => title.includes(ex));
      });
    }

    const hasActiveFilter = isQuarterFilter || (dateRange?.from && dateRange?.to) || filters.produtos.length > 0 || filters.cfos.length > 0 || selectedYear !== 'all';
    const quarterSurveyCount = isQuarterFilter ? QUARTER_SURVEY_COUNTS[selectedPeriod] : undefined;
    const totalEligible = quarterSurveyCount ?? (hasActiveFilter ? undefined : npsData.raw.totalEligible);
    const cfoEligibleMap = isQuarterFilter
      ? QUARTER_CFO_SURVEY_COUNTS[selectedPeriod]
      : (hasActiveFilter ? undefined : npsData.raw.cfoEligibleMap);
    return processNpsData(filtered, cfoMap, titleMap, npsPipeId, totalEligible, cfoEligibleMap);
  }, [npsData?.raw, filters.produtos, filters.cfos, dateRange, selectedYear, selectedPeriod]);

  const handlePeriodChange = (period: string, range?: DateRange) => {
    setSelectedPeriod(period);
    setDateRange(range);
  };

  const handleClearFilters = () => {
    clearFilters();
    setSelectedPeriod('all');
    setSelectedYear('all');
    setDateRange(undefined);
  };

  const displayNpsData = filteredNpsData ?? npsData;

  // Jornada filtering (reuse existing logic)
  const INACTIVE = ['Churn', 'Atividades finalizadas', 'Desistência', 'Arquivado'];

  const activeOnly = useMemo(() => {
    return clientes.filter(c => !INACTIVE.includes(c.faseAtual));
  }, [clientes]);

  const filteredClientes = useMemo(() => {
    const hasCfoFilter = filters.cfos.length > 0;
    const hasProdFilter = filters.produtos.length > 0;
    if (!hasCfoFilter && !hasProdFilter) return activeOnly;
    return activeOnly.filter(c => {
      if (hasCfoFilter && !filters.cfos.includes(c.cfo)) return false;
      if (hasProdFilter && !filters.produtos.includes(c.produto)) return false;
      return true;
    });
  }, [activeOnly, filters.cfos, filters.produtos]);

  const filteredCfos = useMemo((): JornadaCfo[] => {
    if (filters.cfos.length === 0 && filters.produtos.length === 0) return cfos;
    const cfoNames = [...new Set(filteredClientes.map(c => c.cfo).filter(Boolean))];
    return cfos.filter(cfo => cfoNames.includes(cfo.nome));
  }, [cfos, filteredClientes, filters.cfos, filters.produtos]);

  const filteredPipeline = useMemo((): PipelineFase[] => {
    if (filters.cfos.length === 0 && filters.produtos.length === 0) return pipeline;
    return pipeline.map(fase => {
      const cls = fase.clientes.filter(c => filteredClientes.some(fc => fc.id === c.id));
      return { ...fase, count: cls.length, mrr: cls.reduce((s, c) => s + c.mrr, 0), clientes: cls };
    }).filter(f => f.count > 0);
  }, [pipeline, filteredClientes, filters.cfos, filters.produtos]);

  const filteredAlertas = useMemo(() => {
    if (filters.cfos.length === 0 && filters.produtos.length === 0) return alertas;
    const ids = new Set(filteredClientes.map(c => c.id));
    return alertas.filter(a => ids.has(a.clienteId));
  }, [alertas, filteredClientes, filters.cfos, filters.produtos]);

  const filteredReunioes = useMemo(() => {
    if (filters.cfos.length === 0) return reunioes;
    return reunioes.filter(r => filters.cfos.includes(r.cfo));
  }, [reunioes, filters.cfos]);

  // Compute MRR base from active clients
  const mrrBase = useMemo(() => {
    return filteredClientes.reduce((s, c) => s + c.mrr, 0);
  }, [filteredClientes]);

  const isLoading = jornadaLoading || npsLoading;
  const error = jornadaError || npsError;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Carregando dados de Customer Success...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 text-destructive">
        Erro ao carregar dados: {(error as Error).message}
      </div>
    );
  }

  const hasFilters = filters.cfos.length > 0 || filters.produtos.length > 0;

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Shared Filter Bar */}
        <div className="flex items-center gap-3 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs">
              <p>Customer Success — visão unificada de clientes, NPS, churn, reuniões e alertas.</p>
            </TooltipContent>
          </Tooltip>

          <Select
            value={filters.cfos.length === 1 ? filters.cfos[0] : filters.cfos.length > 1 ? '__multi__' : 'all'}
            onValueChange={(v) => {
              if (v === 'all') setFilters({ cfos: [] });
              else setFilters({ cfos: [v] });
            }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="CFO" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os CFOs</SelectItem>
              {allCfos.map(cfo => (
                <SelectItem key={cfo} value={cfo}>{cfo}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.produtos.length === 1 ? filters.produtos[0] : filters.produtos.length > 1 ? '__multi__' : 'all'}
            onValueChange={(v) => {
              if (v === 'all') setFilters({ produtos: [] });
              else setFilters({ produtos: [v] });
            }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Produto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os produtos</SelectItem>
              {allProdutos.map(prod => (
                <SelectItem key={prod} value={prod}>{prod}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasFilters && (
            <>
              <div className="flex gap-1 flex-wrap">
                {filters.cfos.map(c => (
                  <Badge key={c} variant="default" className="gap-1 text-xs">
                    {c}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setFilters({ cfos: filters.cfos.filter(x => x !== c) })} />
                  </Badge>
                ))}
                {filters.produtos.map(p => (
                  <Badge key={p} variant="secondary" className="gap-1 text-xs">
                    {p}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setFilters({ produtos: filters.produtos.filter(x => x !== p) })} />
                  </Badge>
                ))}
              </div>
              <Button variant="ghost" size="sm" className="text-xs" onClick={handleClearFilters}>
                Limpar
              </Button>
            </>
          )}

          {lastSync && (
            <span className="text-xs text-muted-foreground ml-auto">
              Atualizado: {new Date(lastSync).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às {new Date(lastSync).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>

        {/* Sub-tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-4xl grid-cols-7">
            <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
            <TabsTrigger value="clientes">Clientes</TabsTrigger>
            <TabsTrigger value="cfos">CFOs</TabsTrigger>
            <TabsTrigger value="reunioes">Reuniões</TabsTrigger>
            <TabsTrigger value="nps">NPS</TabsTrigger>
            <TabsTrigger value="churn">Churn</TabsTrigger>
            <TabsTrigger value="alertas">
              Alertas
              {filteredAlertas.length > 0 && (
                <Badge variant="destructive" className="ml-1 text-[10px] px-1.5 py-0">
                  {filteredAlertas.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="visao-geral" className="mt-4">
            <VisaoGeralCS
              clientes={clientes}
              cfos={filteredCfos}
              alertas={filteredAlertas}
              npsScore={displayNpsData?.metrics?.nps?.score ?? null}
              mrrBase={mrrBase}
              onNavigateToAlertas={() => setActiveTab('alertas')}
            />
          </TabsContent>

          <TabsContent value="clientes" className="mt-4">
            <ClientesView clientes={filteredClientes} />
          </TabsContent>

          <TabsContent value="cfos" className="mt-4">
            <CfoView cfos={filteredCfos} clientes={filteredClientes} />
          </TabsContent>

          <TabsContent value="reunioes" className="mt-4">
            <ReunioesView reunioes={filteredReunioes} allCfos={allCfos} clientes={filteredClientes} />
          </TabsContent>

          <TabsContent value="nps" className="mt-4">
            <div className="space-y-8">
              {/* NPS-specific filters */}
              {(displayNpsData || npsLoading) && (
                <NpsFilters
                  produtos={nfProdutos}
                  cfos={nfCfos}
                  selectedProdutos={filters.produtos}
                  selectedCfos={filters.cfos}
                  selectedPeriod={selectedPeriod}
                  selectedYear={selectedYear}
                  dateRange={dateRange}
                  onProdutosChange={(v) => setFilters({ produtos: v })}
                  onCfosChange={(v) => setFilters({ cfos: v })}
                  onPeriodChange={handlePeriodChange}
                  onYearChange={setSelectedYear}
                  onClear={handleClearFilters}
                />
              )}

              {npsLoading && (
                <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Carregando dados NPS...</span>
                </div>
              )}
              {npsError && (
                <div className="flex items-center justify-center py-12 gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  <span>Erro ao carregar dados NPS: {(npsError as Error).message}</span>
                </div>
              )}
              {displayNpsData && (
                <>
                  <NpsKpiCards data={displayNpsData.kpis} cfoPerformance={displayNpsData.cfoPerformance} />
                  <NpsGauges data={displayNpsData.metrics} />
                  <NpsScoreCards
                    metrics={displayNpsData.metrics}
                    npsDistribution={displayNpsData.npsDistribution}
                    csatDistribution={displayNpsData.csatDistribution}
                    seanEllisDistribution={displayNpsData.seanEllisDistribution}
                  />
                  <NpsDistributions
                    npsDistribution={displayNpsData.npsDistribution}
                    csatDistribution={displayNpsData.csatDistribution}
                    seanEllisDistribution={displayNpsData.seanEllisDistribution}
                    seExcluded={displayNpsData.seExcluded}
                  />
                  <CfoPerformanceTable data={displayNpsData.cfoPerformance} npsPipeId={displayNpsData.npsPipeId} />
                  <QualitativeFeedback data={displayNpsData.feedback} npsPipeId={displayNpsData.npsPipeId} />
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="churn" className="mt-4">
            <div className="space-y-8">
              <ChurnDossierSection
                data={opsData?.churnDossier || []}
                selectedProdutos={filters.produtos}
                globalCfos={filters.cfos}
                globalDateRange={
                  selectedPeriod === 'q1' ? { from: new Date('2026-01-01'), to: new Date('2026-03-31') } :
                  selectedPeriod === 'q2' ? { from: new Date('2026-04-01'), to: new Date('2026-06-30') } :
                  selectedPeriod === 'q3' ? { from: new Date('2026-07-01'), to: new Date('2026-09-30') } :
                  selectedPeriod === 'q4' ? { from: new Date('2025-10-01'), to: new Date('2025-12-31') } :
                  dateRange?.from && dateRange?.to ? { from: dateRange.from, to: dateRange.to } :
                  undefined
                }
              />
              <QuarterlyComparison visible={selectedPeriod === 'q1'} />
              {displayNpsData && (
                <OkrProximity
                  npsScore={displayNpsData.metrics.nps.score}
                  csatScore={displayNpsData.metrics.csat.score}
                  visible={selectedPeriod === 'q1'}
                />
              )}
            </div>
          </TabsContent>

          <TabsContent value="alertas" className="mt-4">
            <AlertasView alertas={filteredAlertas} />
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}

export function CustomerSuccessTab() {
  return (
    <CustomerSuccessFilterProvider>
      <CustomerSuccessTabInner />
    </CustomerSuccessFilterProvider>
  );
}
