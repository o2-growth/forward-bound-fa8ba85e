import { useState, useMemo } from "react";
import { startOfMonth, endOfMonth, eachMonthOfInterval, getMonth } from "date-fns";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MultiSelect } from "@/components/ui/multi-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { DateRangePickerGA } from "./DateRangePickerGA";
import { useMarketingIndicators } from "@/hooks/useMarketingIndicators";
import { useMetaCampaigns, useMetaCampaignNames } from "@/hooks/useMetaCampaigns";
import { useGoogleCampaigns } from "@/hooks/useGoogleCampaigns";
import { useModeloAtualMetas, isTestCard } from "@/hooks/useModeloAtualMetas";
import { useO2TaxMetas } from "@/hooks/useO2TaxMetas";
import { useModeloAtualAnalytics } from "@/hooks/useModeloAtualAnalytics";
import { useExpansaoAnalytics } from "@/hooks/useExpansaoAnalytics";
import { useMarketingAttribution, detectChannel } from "@/hooks/useMarketingAttribution";
import { useO2TaxAnalytics } from "@/hooks/useO2TaxAnalytics";
import { useOutboundAnalytics } from "@/hooks/useOutboundAnalytics";
import { useInvestmentByMonth } from "@/hooks/useInvestmentByMonth";
import { useExpansaoMetas } from "@/hooks/useExpansaoMetas";
import { useOxyHackerMetas } from "@/hooks/useOxyHackerMetas";
import { useMediaMetas } from "@/contexts/MediaMetasContext";
import { useConsolidatedMetas, type ConsolidatedMetricType } from "@/hooks/useConsolidatedMetas";
import { useCostStageMetas } from "@/hooks/useCostStageMetas";
import type { BuType } from "@/hooks/useMonetaryMetas";
import { PerformanceGauges } from "./marketing-indicators/PerformanceGauges";
import { InvestmentByChannelChart } from "./marketing-indicators/InvestmentByChannelChart";
import { AcquisitionFunnelChart } from "./marketing-indicators/AcquisitionFunnelChart";
import { ConversionsByChannelChart } from "./marketing-indicators/ConversionsByChannelChart";
import { CampaignsTable } from "./marketing-indicators/CampaignsTable";
import { ChannelMetricsCards } from "./marketing-indicators/ChannelMetricsCards";
import { RevenueMetricsCards } from "./marketing-indicators/RevenueMetricsCards";
import { CostPerStageGauges } from "./marketing-indicators/CostPerStageGauges";
import { ChannelAttributionCards } from "./marketing-indicators/ChannelAttributionCards";
import { DrillDownBarChart } from "./indicators/DrillDownBarChart";
import { DetailSheet, columnFormatters } from "./indicators/DetailSheet";
import { BestAdsSection } from "./marketing-indicators/BestAdsSection";
import { InvestmentForecast } from "./marketing-indicators/InvestmentForecast";
import { CHANNEL_LABELS, ChannelId, CostPerStage, AttributionCard } from "./marketing-indicators/types";
import { CacTotalCard } from "./marketing-indicators/CacTotalCard";
import { InvestmentCacMqlHero } from "./marketing-indicators/InvestmentCacMqlHero";
import { ConsolidatedIndicators26Section } from "./marketing-indicators/ConsolidatedIndicators26Section";
import { useMarketingSheetData } from "@/hooks/useMarketingSheetData";
import { useTimeEFerramentasFromDre } from "@/hooks/useTimeEFerramentasFromDre";
import { OnlineOfflineSection } from "./marketing-indicators/OnlineOfflineSection";
import { ConversionCurveSection } from "./marketing-indicators/ConversionCurveSection";
import { CohortTable } from "./marketing-indicators/CohortTable";
import { PerformanceByChannelSection } from "./marketing-indicators/performance/PerformanceByChannelSection";
import { CreativeAdPerformanceSection } from "./marketing-indicators/performance/CreativeAdPerformanceSection";
import { SourceFunnelSection } from "./marketing-indicators/performance/SourceFunnelSection";
import { OverallResultsSection } from "./marketing-indicators/performance/OverallResultsSection";



const CHANNEL_OPTIONS = Object.entries(CHANNEL_LABELS)
  .filter(([key]) => ['meta_ads', 'google_ads', 'eventos'].includes(key))
  .map(([value, label]) => ({ value, label }));

// BU prefix mapping: first character of campaign name
const BU_PREFIX_MAP: Record<string, string> = {
  '1': 'Modelo Atual',
  '2': 'O2 TAX',
  '3': 'Oxy Hacker',
  '4': 'Franquia',
};

const BU_FILTER_OPTIONS = [
  { value: 'all', label: 'Todas as BUs' },
  { value: '1', label: 'Modelo Atual (1_)' },
  { value: '2', label: 'O2 TAX (2_)' },
  { value: '3', label: 'Oxy Hacker (3_)' },
  { value: '4', label: 'Franquia (4_)' },
];

export function MarketingIndicatorsTab() {
  // Date state - default to current month
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  // Filter state
  const selectedBUs = ['Modelo Atual', 'O2 TAX', 'Oxy Hacker', 'Franquia'];
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [selectedBU, setSelectedBU] = useState<string>('all');

  // Drill-down state for cost gauges
  const [costDrillDown, setCostDrillDown] = useState<{
    isOpen: boolean;
    costKey: keyof CostPerStage | null;
  }>({ isOpen: false, costKey: null });

  // Drill-down state for channel attribution cards
  const [channelDrillDown, setChannelDrillDown] = useState<{
    isOpen: boolean;
    channel: ChannelId | null;
  }>({ isOpen: false, channel: null });

  // Fetch marketing data from Google Sheets
  const { data, goals, costGoals, costByChannel, isLoading, error, refetch } = useMarketingIndicators({
    startDate: dateRange.from,
    endDate: dateRange.to,
    selectedBUs,
    selectedChannels,
  });

  // Use consolidated metas (same source as Indicators tab)
  const { getMetaForPeriod } = useConsolidatedMetas();
  const { funnelData } = useMediaMetas();
  const { getCostGoalsForPeriod } = useCostStageMetas();
  const allBUs: BuType[] = ['modelo_atual', 'o2_tax', 'oxy_hacker', 'franquia'];

  const consolidatedRevenueGoals = useMemo(() => {
    const mrr = getMetaForPeriod(allBUs, dateRange.from, dateRange.to, 'mrr');
    const setup = getMetaForPeriod(allBUs, dateRange.from, dateRange.to, 'setup');
    const pontual = getMetaForPeriod(allBUs, dateRange.from, dateRange.to, 'pontual');
    const gmv = mrr + setup + pontual;
    return { mrr, setup, pontual, educacao: 0, gmv };
  }, [getMetaForPeriod, dateRange, allBUs]);

  const consolidatedFunnelGoals = useMemo(() => {
    if (!funnelData) return { leads: 0, mqls: 0, rms: 0, rrs: 0, propostas: 0, vendas: 0, investment: 0 };
    const allBUData = [funnelData.modeloAtual, funnelData.o2Tax, funnelData.oxyHacker, funnelData.franquia];
    const monthsInRange = eachMonthOfInterval({ start: dateRange.from, end: dateRange.to });
    const monthStrings = monthsInRange.map(d => ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][getMonth(d)]);
    let leads = 0, mqls = 0, rms = 0, rrs = 0, propostas = 0, vendas = 0, investment = 0;
    for (const buData of allBUData) {
      for (const item of buData) {
        if (monthStrings.includes(item.month)) {
          leads += item.leads || 0;
          mqls += item.mqls || 0;
          rms += item.rms || 0;
          rrs += item.rrs || 0;
          propostas += item.propostas || 0;
          vendas += item.vendas || 0;
          investment += item.investimento || 0;
        }
      }
    }
    return { leads, mqls, rms, rrs, propostas, vendas, investment };
  }, [funnelData, dateRange]);

  // Build final goals merging DB data over hardcoded defaults
  const finalRevenueGoals = useMemo(() => {
    const hasDbData = consolidatedRevenueGoals.gmv > 0;
    return hasDbData ? consolidatedRevenueGoals : goals.revenue;
  }, [consolidatedRevenueGoals, goals.revenue]);

  const finalCostGoals = useMemo(() => {
    // Priority 1: DB cost stage metas
    const dbCostGoals = getCostGoalsForPeriod(dateRange.from, dateRange.to);
    if (dbCostGoals) return dbCostGoals;

    // Priority 2: Calculate from investment / volume
    const f = consolidatedFunnelGoals;
    const inv = f.investment;
    if (inv <= 0) return costGoals;
    return {
      cpl: f.leads > 0 ? inv / f.leads : costGoals.cpl,
      cpmql: f.mqls > 0 ? inv / f.mqls : costGoals.cpmql,
      cprm: f.rms > 0 ? inv / f.rms : costGoals.cprm,
      cprr: f.rrs > 0 ? inv / f.rrs : costGoals.cprr,
      cpp: f.propostas > 0 ? inv / f.propostas : costGoals.cpp,
      cpv: f.vendas > 0 ? inv / f.vendas : costGoals.cpv,
    };
  }, [getCostGoalsForPeriod, dateRange, consolidatedFunnelGoals, costGoals]);

  const finalInvestmentGoal = useMemo(() => {
    return consolidatedFunnelGoals.investment > 0 ? consolidatedFunnelGoals.investment : goals.investment;
  }, [consolidatedFunnelGoals, goals.investment]);

  // Fetch Meta Ads campaigns data
  const { 
    data: metaCampaigns, 
    isLoading: isLoadingMeta, 
    error: metaError,
    refetch: refetchMeta 
  } = useMetaCampaigns(dateRange.from, dateRange.to);

  // Fetch Google Ads campaigns data
  const {
    data: googleCampaigns,
    isLoading: isLoadingGoogle,
    error: googleError,
    refetch: refetchGoogle
  } = useGoogleCampaigns(dateRange.from, dateRange.to);

  // Combine campaigns from both sources, filtered by BU
  const allCampaigns = useMemo(() => {
    const meta = metaCampaigns || [];
    const google = googleCampaigns || [];
    let combined = [...meta, ...google];
    if (selectedBU !== 'all') {
      combined = combined.filter(c => {
        const name = (c.name || '').trim();
        return name.startsWith(selectedBU + '_') || name.startsWith(selectedBU + ' ');
      });
    }
    return combined;
  }, [metaCampaigns, googleCampaigns, selectedBU]);

  const isLoadingAds = isLoadingMeta || isLoadingGoogle;
  const adsError = metaError || googleError;

  // Fetch Modelo Atual revenue data from Pipefy
  const { 
    getMrrForPeriod, 
    getSetupForPeriod, 
    getPontualForPeriod,
    getEducacaoForPeriod,
    isLoading: isLoadingModeloAtual 
  } = useModeloAtualMetas(dateRange.from, dateRange.to);

  // Fetch O2 TAX revenue data from Pipefy
  const { 
    getMrrForPeriod: getO2TaxMrr, 
    getSetupForPeriod: getO2TaxSetup, 
    getPontualForPeriod: getO2TaxPontual,
    isLoading: isLoadingO2Tax 
  } = useO2TaxMetas(dateRange.from, dateRange.to);

  // Fetch Expansão (Franquia) revenue data from Pipefy
  const { getValueForPeriod: getFranquiaValue } = useExpansaoMetas(dateRange.from, dateRange.to);

  // Fetch Oxy Hacker revenue data from Pipefy
  const { getValueForPeriod: getOxyHackerValue } = useOxyHackerMetas(dateRange.from, dateRange.to);

  // Calculate real revenue combining data from selected BUs
  const realRevenue = useMemo(() => {
    const includesModeloAtual = selectedBUs.includes('Modelo Atual');
    const includesO2Tax = selectedBUs.includes('O2 TAX');
    const includesOxyHacker = selectedBUs.includes('Oxy Hacker');
    const includesFranquia = selectedBUs.includes('Franquia');
    
    if (!includesModeloAtual && !includesO2Tax && !includesOxyHacker && !includesFranquia) {
      return data.revenue;
    }
    
    let mrr = 0, setup = 0, pontual = 0, educacao = 0;
    
    if (includesModeloAtual) {
      mrr += getMrrForPeriod(dateRange.from, dateRange.to);
      setup += getSetupForPeriod(dateRange.from, dateRange.to);
      pontual += getPontualForPeriod(dateRange.from, dateRange.to);
      educacao += getEducacaoForPeriod(dateRange.from, dateRange.to);
    }
    
    if (includesO2Tax) {
      mrr += getO2TaxMrr(dateRange.from, dateRange.to);
      setup += getO2TaxSetup(dateRange.from, dateRange.to);
      pontual += getO2TaxPontual(dateRange.from, dateRange.to);
    }
    
    if (includesFranquia) {
      pontual += getFranquiaValue('venda', dateRange.from, dateRange.to);
    }
    
    if (includesOxyHacker) {
      pontual += getOxyHackerValue('venda', dateRange.from, dateRange.to);
    }
    
    return { mrr, setup, pontual, educacao, gmv: mrr + setup + pontual + educacao };
  }, [dateRange, selectedBUs, getMrrForPeriod, getSetupForPeriod, getPontualForPeriod, getEducacaoForPeriod, getO2TaxMrr, getO2TaxSetup, getO2TaxPontual, getFranquiaValue, getOxyHackerValue, data.revenue]);

  // Fetch real card data from Pipefy for attribution
  const { allCards: modeloAtualAllCards, isLoading: isLoadingMACards, getCardsForIndicator: maGetCards } = useModeloAtualAnalytics(dateRange.from, dateRange.to);
  const { getCardsForIndicator: o2GetCards, allCards: o2TaxAllCards } = useO2TaxAnalytics(dateRange.from, dateRange.to);
  const { cards: franquiaCards, getCardsForIndicator: franquiaGetCards } = useExpansaoAnalytics(dateRange.from, dateRange.to, 'Franquia');
  const { cards: oxyHackerCards, getCardsForIndicator: oxyGetCards } = useExpansaoAnalytics(dateRange.from, dateRange.to, 'Oxy Hacker');
  const { allCards: outboundAllCards, getCardsForIndicator: outboundGetCards } = useOutboundAnalytics(dateRange.from, dateRange.to);

  // Investment per month (Meta + Google) for the visible range — for cohorts
  const { byMonth: investmentByMonth, totalInvestment: investmentTotalForRange } = useInvestmentByMonth(dateRange.from, dateRange.to);

  // Build attribution cards from all BUs
  const allAttributionCards = useMemo((): AttributionCard[] => {
    const result: AttributionCard[] = [];
    const stripPrefix = (id: string) => String(id).replace(/^(outbound_|oxy_|o2tax_)/, '');

    for (const c of modeloAtualAllCards) {
      if (isTestCard(stripPrefix(String(c.id)))) continue;
      result.push({
        id: c.id, titulo: c.titulo, empresa: c.empresa, campanha: c.campanha, conjuntoGrupo: c.conjuntoGrupo,
        fonte: c.fonte, fbclid: c.fbclid, gclid: c.gclid, tipoOrigem: c.tipoOrigem,
        origemLead: c.origemLead, palavraChaveAnuncio: c.palavraChaveAnuncio,
        fase: c.fase, dataEntrada: c.dataEntrada, dataCriacao: c.dataCriacao, dataAssinatura: c.dataAssinatura,
        produto: c.produto, valor: c.valor,
        valorMRR: c.valorMRR, valorSetup: c.valorSetup, valorPontual: c.valorPontual,
        valorEducacao: c.valorEducacao, bu: 'Modelo Atual',
        sdr: (c as any).sdr || (c as any).responsavel || undefined,
        closer: (c as any).closer || undefined,
      });
    }

    for (const c of franquiaCards) {
      if (isTestCard(stripPrefix(String(c.id)))) continue;
      result.push({
        id: c.id, titulo: c.titulo, campanha: c.campanha, conjuntoGrupo: c.conjuntoGrupo,
        fonte: c.fonte, fbclid: c.fbclid, gclid: c.gclid, tipoOrigem: c.tipoOrigem,
        origemLead: c.origemLead, palavraChaveAnuncio: c.palavraChaveAnuncio,
        fase: c.fase, dataEntrada: c.dataEntrada, dataCriacao: c.dataCriacao, dataAssinatura: (c as any).dataAssinatura ?? null,
        produto: c.produto, valor: c.valor,
        valorMRR: c.valorMRR, valorSetup: c.valorSetup, valorPontual: c.valorPontual,
        bu: 'Franquia',
        sdr: (c as any).sdr || (c as any).responsavel || undefined,
        closer: (c as any).closer || undefined,
      });
    }

    for (const c of oxyHackerCards) {
      if (isTestCard(stripPrefix(String(c.id)))) continue;
      result.push({
        id: `oxy_${c.id}`, titulo: c.titulo, campanha: c.campanha, conjuntoGrupo: c.conjuntoGrupo,
        fonte: c.fonte, fbclid: c.fbclid, gclid: c.gclid, tipoOrigem: c.tipoOrigem,
        origemLead: c.origemLead, palavraChaveAnuncio: c.palavraChaveAnuncio,
        fase: c.fase, dataEntrada: c.dataEntrada, dataCriacao: c.dataCriacao, dataAssinatura: (c as any).dataAssinatura ?? null,
        produto: c.produto, valor: c.valor,
        valorMRR: c.valorMRR, valorSetup: c.valorSetup, valorPontual: c.valorPontual,
        bu: 'Oxy Hacker',
        sdr: (c as any).sdr || (c as any).responsavel || undefined,
        closer: (c as any).closer || undefined,
      });
    }

    for (const c of outboundAllCards) {
      if (isTestCard(stripPrefix(String(c.id)))) continue;
      result.push({
        id: `outbound_${c.id}`, titulo: c.titulo, empresa: c.empresa,
        fonte: c.fonte, tipoOrigem: c.tipoOrigem, origemLead: c.origemLead,
        fase: c.fase, dataEntrada: c.dataEntrada, dataCriacao: c.dataCriacao, dataAssinatura: c.dataAssinatura,
        produto: c.produto, valor: c.valor,
        valorMRR: c.valorMRR, valorSetup: c.valorSetup, valorPontual: c.valorPontual,
        valorEducacao: c.valorEducacao, bu: 'Outbound',
        sdr: (c as any).sdr || (c as any).responsavel || undefined,
        closer: (c as any).closer || undefined,
      });
    }

    // O2 TAX cards (no marketing fields — will appear as orgânico / sem campanha)
    for (const c of o2TaxAllCards) {
      if (isTestCard(stripPrefix(String(c.id)))) continue;
      result.push({
        id: `o2tax_${c.id}`, titulo: c.titulo,
        fase: c.fase, dataEntrada: c.dataEntrada, dataCriacao: c.dataCriacao, dataAssinatura: (c as any).dataAssinatura ?? null,
        produto: c.produto, valor: c.valor,
        valorMRR: c.valorMRR, valorSetup: c.valorSetup, valorPontual: c.valorPontual,
        bu: 'O2 TAX',
        sdr: (c as any).responsavel || (c as any).sdr || undefined,
        closer: (c as any).closer || undefined,
      });
    }


    return result;
  }, [modeloAtualAllCards, franquiaCards, oxyHackerCards, o2TaxAllCards, outboundAllCards]);


  // Resolve archived/deleted campaign names for attribution
  const { data: campaignNamesMap } = useMetaCampaignNames();

  const { campaignFunnels, channelSummaries, adSetFunnels, adCreativeFunnels } = useMarketingAttribution(allAttributionCards, allCampaigns, campaignNamesMap);

  // Aggregate Google Ads API totals for enrichment (filtered by BU)
  const googleAdsApiTotals = useMemo(() => {
    let campaigns = googleCampaigns || [];
    if (selectedBU !== 'all') {
      campaigns = campaigns.filter(c => (c.name || '').trim().startsWith(selectedBU + '_') || (c.name || '').trim().startsWith(selectedBU + ' '));
    }
    const totalSpend = campaigns.reduce((sum, c) => sum + (c.investment || 0), 0);
    const totalLeads = campaigns.reduce((sum, c) => sum + (c.leads || 0), 0);
    const totalClicks = campaigns.reduce((sum, c) => sum + (c.clicks || 0), 0);
    const totalImpressions = campaigns.reduce((sum, c) => sum + (c.impressions || 0), 0);
    return {
      investment: totalSpend,
      leads: totalLeads,
      clicks: totalClicks,
      impressions: totalImpressions,
      cpl: totalLeads > 0 ? totalSpend / totalLeads : 0,
    };
  }, [googleCampaigns, selectedBU]);

  // Aggregate Meta Ads API totals for enrichment (filtered by BU)
  const metaAdsApiTotals = useMemo(() => {
    let campaigns = metaCampaigns || [];
    if (selectedBU !== 'all') {
      campaigns = campaigns.filter(c => (c.name || '').trim().startsWith(selectedBU + '_') || (c.name || '').trim().startsWith(selectedBU + ' '));
    }
    const totalSpend = campaigns.reduce((sum, c) => sum + (c.investment || 0), 0);
    const totalLeads = campaigns.reduce((sum, c) => sum + (c.leads || 0), 0);
    const totalClicks = campaigns.reduce((sum, c) => sum + (c.clicks || 0), 0);
    const totalImpressions = campaigns.reduce((sum, c) => sum + (c.impressions || 0), 0);
    return {
      investment: totalSpend,
      leads: totalLeads,
      clicks: totalClicks,
      impressions: totalImpressions,
      cpl: totalLeads > 0 ? totalSpend / totalLeads : 0,
    };
  }, [metaCampaigns, selectedBU]);

  // Enrich channels with Google Ads API data (fallback) and Eventos from Pipefy
  const enrichedChannels = useMemo(() => {
    const channels = data.channels.map(ch => {
      // If Google Ads channel from sheet has zero investment, use API data
      if (ch.id === 'google_ads' && googleAdsApiTotals.investment > 0) {
        return {
          ...ch,
          investment: googleAdsApiTotals.investment,
          leads: googleAdsApiTotals.leads || ch.leads,
          clicks: googleAdsApiTotals.clicks,
          impressions: googleAdsApiTotals.impressions,
          cpl: googleAdsApiTotals.cpl,
        };
      }
      // If Meta Ads channel from sheet has lower investment than API, use API data
      if (ch.id === 'meta_ads' && metaAdsApiTotals.investment > 0) {
        return {
          ...ch,
          investment: metaAdsApiTotals.investment,
          leads: metaAdsApiTotals.leads || ch.leads,
          clicks: metaAdsApiTotals.clicks,
          impressions: metaAdsApiTotals.impressions,
          cpl: metaAdsApiTotals.cpl,
        };
      }
      return ch;
    });

    // Add Eventos channel from Pipefy attribution
    const eventosSummary = channelSummaries.find(s => s.channel === 'eventos');
    if (eventosSummary && (eventosSummary.leads > 0 || eventosSummary.mqls > 0 || eventosSummary.vendas > 0 || eventosSummary.receita > 0)) {
      channels.push({
        id: 'eventos',
        name: 'Eventos',
        investment: 25000,
        leads: eventosSummary.leads,
        mqls: eventosSummary.mqls,
        rms: 0,
        rrs: 0,
        cpl: eventosSummary.leads > 0 ? 25000 / eventosSummary.leads : 0,
        cpmql: eventosSummary.mqls > 0 ? 25000 / eventosSummary.mqls : 0,
        conversionRate: eventosSummary.leads > 0
          ? Math.round((eventosSummary.mqls / eventosSummary.leads) * 100)
          : 0,
        propostas: 0,
        vendas: 0,
        cprm: 0,
        cprr: 0,
        cpp: 0,
        cpv: 0,
      });
    }

    // Add Orgânico / Direto channel from Pipefy attribution
    const organicoSummary = channelSummaries.find(s => s.channel === 'organico');
    if (organicoSummary && (organicoSummary.leads > 0 || organicoSummary.mqls > 0 || organicoSummary.vendas > 0)) {
      channels.push({
        id: 'organico',
        name: 'Orgânico / Direto',
        investment: 0,
        leads: organicoSummary.leads,
        mqls: organicoSummary.mqls,
        rms: 0,
        rrs: 0,
        cpl: 0,
        cpmql: 0,
        conversionRate: organicoSummary.leads > 0
          ? Math.round((organicoSummary.mqls / organicoSummary.leads) * 100)
          : 0,
        propostas: 0,
        vendas: organicoSummary.vendas,
        cprm: 0,
        cprr: 0,
        cpp: 0,
        cpv: 0,
      });
    }

    return channels;
  }, [data.channels, channelSummaries, googleAdsApiTotals, metaAdsApiTotals]);

  // Count real volumes using the same First Entry logic as the Indicators tab
  const pipefyVolumes = useMemo(() => {
    const indicators = ['leads', 'mql', 'rm', 'rr', 'proposta', 'venda'] as const;
    const counts = { leads: 0, mqls: 0, rms: 0, rrs: 0, propostas: 0, vendas: 0 };
    const countKeys: Record<string, keyof typeof counts> = {
      leads: 'leads', mql: 'mqls', rm: 'rms', rr: 'rrs', proposta: 'propostas', venda: 'vendas',
    };

    for (const ind of indicators) {
      const key = countKeys[ind];
      counts[key] += maGetCards(ind).length;
      counts[key] += o2GetCards(ind).length;
      counts[key] += franquiaGetCards(ind).length;
      counts[key] += oxyGetCards(ind).length;
    }

    console.log('[MarketingIndicatorsTab] indicatorsVolumes (First Entry):', counts);
    return counts;
  }, [maGetCards, o2GetCards, franquiaGetCards, oxyGetCards]);

  // ===== New sections data (Cohort / Curva / Online-Offline / CAC) =====
  const leadsAttributionCards = useMemo<AttributionCard[]>(() => {
    const out: AttributionCard[] = [];
    const seen = new Set<string>();
    const stripPrefix = (id: string) => String(id).replace(/^(outbound_|oxy_|o2tax_)/, '');
    const push = (c: any, bu: string, idPrefix = '') => {
      const id = idPrefix + c.id;
      if (seen.has(id)) return;
      if (isTestCard(stripPrefix(String(c.id)))) return;
      seen.add(id);
      out.push({
        id, titulo: c.titulo, empresa: c.empresa,
        campanha: c.campanha, conjuntoGrupo: c.conjuntoGrupo,
        fonte: c.fonte, origemLead: c.origemLead, tipoOrigem: c.tipoOrigem,
        fbclid: c.fbclid, gclid: c.gclid, palavraChaveAnuncio: c.palavraChaveAnuncio,
        fase: c.fase, dataEntrada: c.dataEntrada,
        dataAssinatura: c.dataAssinatura ?? null,
        produto: c.produto, valor: c.valor || 0,
        valorMRR: c.valorMRR || 0, valorSetup: c.valorSetup || 0,
        valorPontual: c.valorPontual || 0, valorEducacao: c.valorEducacao || 0,
        bu,
      });
    };
    for (const c of maGetCards('leads')) push(c, 'Modelo Atual');
    for (const c of o2GetCards('leads')) push(c, 'O2 TAX', 'o2tax_');
    for (const c of franquiaGetCards('leads')) push(c, 'Franquia');
    for (const c of oxyGetCards('leads')) push(c, 'Oxy Hacker', 'oxy_');
    for (const c of outboundGetCards('leads')) push(c, 'Outbound', 'outbound_');
    return out;
  }, [maGetCards, o2GetCards, franquiaGetCards, oxyGetCards, outboundGetCards]);

  // Sales = cards classified as 'venda' por cada hook de BU. Cada hook já aplica
  // escopo/filtro do período. Aqui só normalizamos as datas para uso nas seções
  // Marketing: entrada do lead = Data Criação quando existir; assinatura = campo
  // de assinatura quando existir, senão a entrada na fase de venda.
  const salesInPeriod = useMemo<AttributionCard[]>(() => {
    const normalize = (s?: string | null) =>
      (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const stripPrefix = (id: string) => String(id).replace(/^(outbound_|oxy_|o2tax_)/, '');
    const isValidDate = (d: unknown): d is Date => d instanceof Date && !Number.isNaN(d.getTime());

    const sources: Array<{ cards: any[]; bu: string; prefix: string; priority: number }> = [
      { cards: maGetCards('venda'),       bu: 'Modelo Atual', prefix: '',          priority: 1 },
      { cards: o2GetCards('venda'),       bu: 'O2 TAX',       prefix: 'o2tax_',    priority: 2 },
      { cards: franquiaGetCards('venda'), bu: 'Franquia',     prefix: '',          priority: 3 },
      { cards: oxyGetCards('venda'),      bu: 'Oxy Hacker',   prefix: 'oxy_',      priority: 4 },
      { cards: outboundGetCards('venda'), bu: 'Outbound',     prefix: 'outbound_', priority: 5 },
    ];

    const byKey = new Map<string, { card: AttributionCard; priority: number }>();
    for (const { cards, bu, prefix, priority } of sources) {
      for (const c of cards) {
        const baseId = stripPrefix(String(c.id));
        if (isTestCard(baseId)) continue;
        const empresaKey = normalize((c as any).empresa || c.titulo);
        const key = `${baseId}|${empresaKey}`;
        const existing = byKey.get(key);
        if (existing && existing.priority <= priority) continue;
        const phaseEntryDate = isValidDate(c.dataEntrada) ? c.dataEntrada : new Date();
        const createdDate = isValidDate(c.dataCriacao) ? c.dataCriacao : phaseEntryDate;
        const signedDate = isValidDate(c.dataAssinatura) ? c.dataAssinatura : phaseEntryDate;
        byKey.set(key, {
          priority,
          card: {
            id: prefix + c.id,
            titulo: c.titulo,
            empresa: (c as any).empresa,
            campanha: c.campanha,
            conjuntoGrupo: c.conjuntoGrupo,
            fonte: c.fonte,
            fbclid: c.fbclid,
            gclid: c.gclid,
            tipoOrigem: c.tipoOrigem,
            origemLead: c.origemLead,
            palavraChaveAnuncio: c.palavraChaveAnuncio,
            fase: c.fase,
            dataEntrada: createdDate,
            dataCriacao: createdDate,
            dataAssinatura: signedDate,
            produto: c.produto,
            valor: c.valor || 0,
            valorMRR: c.valorMRR || 0,
            valorSetup: c.valorSetup || 0,
            valorPontual: c.valorPontual || 0,
            valorEducacao: c.valorEducacao || 0,
            bu,
          },
        });
      }
    }

    // Fallback: algumas fontes chegam em `allAttributionCards` como movimentações
    // assinadas/ganhas, mas ainda não entram em getCardsForIndicator('venda') por
    // variação de fase/data. Garante que Curva/CAC não zerem quando a origem tem venda.
    for (const c of allAttributionCards) {
      const phase = normalize(c.fase);
      if (phase !== 'contrato assinado' && phase !== 'ganho') continue;
      const phaseEntryDate = isValidDate(c.dataEntrada) ? c.dataEntrada : new Date();
      const rawSignedDate = isValidDate(c.dataAssinatura) ? c.dataAssinatura : null;
      const effectiveDate = rawSignedDate || phaseEntryDate;
      if (effectiveDate.getTime() < dateRange.from.getTime() || effectiveDate.getTime() > dateRange.to.getTime()) continue;

      const baseId = stripPrefix(String(c.id));
      if (isTestCard(baseId)) continue;
      const empresaKey = normalize(c.empresa || c.titulo);
      const key = `${baseId}|${empresaKey}`;
      const existing = byKey.get(key);
      if (existing && existing.priority <= 99) continue;
      const createdDate = isValidDate(c.dataCriacao) ? c.dataCriacao : phaseEntryDate;
      byKey.set(key, {
        priority: 99,
        card: {
          ...c,
          dataEntrada: createdDate,
          dataCriacao: createdDate,
          dataAssinatura: effectiveDate,
        },
      });
    }

    const all = Array.from(byKey.values()).map(v => v.card);

    if (typeof window !== 'undefined') {
      console.log('[MarketingIndicatorsTab] salesInPeriod (entrada em Contrato assinado/Ganho no período):', {
        bruto_por_bu: sources.map(s => ({ bu: s.bu, count: s.cards.length })),
        apos_dedup_e_test_cards: all.length,
        com_data_assinatura: all.filter(c => c.dataAssinatura).length,
        com_data_criacao: all.filter(c => c.dataCriacao).length,
      });
    }

    return all;
  }, [maGetCards, o2GetCards, franquiaGetCards, oxyGetCards, outboundGetCards, allAttributionCards, dateRange]);




  // Recalculate totals including enriched Google Ads data
  const enrichedTotals = useMemo(() => {
    const googleChannel = enrichedChannels.find(c => c.id === 'google_ads');
    const sheetGoogleChannel = data.channels.find(c => c.id === 'google_ads');
    const metaChannel = enrichedChannels.find(c => c.id === 'meta_ads');
    const sheetMetaChannel = data.channels.find(c => c.id === 'meta_ads');
    
    // Calculate deltas for both Google and Meta
    const googleDeltaInvestment = (googleChannel?.investment || 0) - (sheetGoogleChannel?.investment || 0);
    const metaDeltaInvestment = (metaChannel?.investment || 0) - (sheetMetaChannel?.investment || 0);
    
    const totalInvestment = data.totalInvestment + googleDeltaInvestment + metaDeltaInvestment;
    const totalLeads = pipefyVolumes.leads;
    
    // Recalculate cost per stage using API investment / Pipefy volumes
    const costPerStage: CostPerStage = {
      cpl: pipefyVolumes.leads > 0 ? totalInvestment / pipefyVolumes.leads : 0,
      cpmql: pipefyVolumes.mqls > 0 ? totalInvestment / pipefyVolumes.mqls : 0,
      cprm: pipefyVolumes.rms > 0 ? totalInvestment / pipefyVolumes.rms : 0,
      cprr: pipefyVolumes.rrs > 0 ? totalInvestment / pipefyVolumes.rrs : 0,
      cpp: pipefyVolumes.propostas > 0 ? totalInvestment / pipefyVolumes.propostas : 0,
      cpv: pipefyVolumes.vendas > 0 ? totalInvestment / pipefyVolumes.vendas : 0,
    };
    
    return { totalInvestment, totalLeads, costPerStage };
  }, [enrichedChannels, data, pipefyVolumes]);

  // Calculate real performance metrics from APIs + Pipefy (no spreadsheet dependency)
  const realPerformanceMetrics = useMemo(() => {
    const investment = enrichedTotals.totalInvestment;
    const gmv = realRevenue.gmv;
    const vendas = pipefyVolumes.vendas;

    // Filter "Contrato assinado" cards to get average MRR
    const vendasCards = allAttributionCards.filter(c => c.fase === 'Contrato assinado');
    const totalMrrVendas = vendasCards.reduce((sum, c) => sum + (c.valorMRR || 0), 0);
    const avgMrr = vendasCards.length > 0 ? totalMrrVendas / vendasCards.length : 0;

    const roas = investment > 0 ? gmv / investment : 0;
    const cac = vendas > 0 ? investment / vendas : 0;
    const ltv = avgMrr * 12;
    const roiLtv = investment > 0 ? (ltv * vendas) / investment : 0;

    return { roas, cac, ltv, roiLtv };
  }, [enrichedTotals.totalInvestment, realRevenue.gmv, pipefyVolumes.vendas, allAttributionCards]);

  const handleDateRangeChange = (start: Date, end: Date) => {
    setDateRange({ from: start, to: end });
  };

  // ===== Dados do bloco hero "Investimento • CPMQL • CAC" =====
  // Espelho consolidado da planilha "Indicadores 26" (CAC autoritativo, LTV/CAC, Time e ferramentas).
  const { data: sheetData } = useMarketingSheetData({
    startDate: dateRange.from,
    endDate: dateRange.to,
  });

  // Time e Ferramentas — autoritativo via DRE Oxy detalhado (toda a Oxy, não só squad CFO).
  const tfDre = useTimeEFerramentasFromDre({
    startDate: dateRange.from,
    endDate: dateRange.to,
  });

  // Breakdown de spend real por canal (Meta / Google) a partir dos canais enriquecidos.
  const investmentMeta = enrichedChannels.find(c => c.id === 'meta_ads')?.investment ?? 0;
  const investmentGoogle = enrichedChannels.find(c => c.id === 'google_ads')?.investment ?? 0;

  // CAC (definição da planilha) = (Mídia + Time e ferramentas) ÷ Vendas.
  // OPEX agora vem do DRE Oxy detalhado; fallback para planilha enquanto DRE carrega.
  const cacMidia = investmentTotalForRange;
  const vendasPeriodo = salesInPeriod.length;
  const cacOpex = tfDre.total > 0
    ? tfDre.total
    : (sheetData?.timeFerramentas ?? 0);
  const cacReal = vendasPeriodo > 0
    ? (cacMidia + cacOpex) / vendasPeriodo
    : (sheetData?.cac ?? 0);

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">Indicadores de Marketing</h2>
        
        <div className="flex flex-wrap items-center gap-3">
          <DateRangePickerGA
            startDate={dateRange.from}
            endDate={dateRange.to}
            onDateChange={handleDateRangeChange}
          />
          {/* BU Filter */}
          <Select value={selectedBU} onValueChange={setSelectedBU}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="BU" />
            </SelectTrigger>
            <SelectContent>
              {BU_FILTER_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Channel Filter */}
          <MultiSelect
            options={CHANNEL_OPTIONS}
            selected={selectedChannels}
            onSelectionChange={setSelectedChannels}
            placeholder="Todos os Canais"
            className="min-w-[160px]"
          />

          {/* Refresh button */}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => { refetch(); refetchMeta(); refetchGoogle(); }} 
            disabled={isLoading || isLoadingAds}
          >
            <RefreshCw className={cn("h-4 w-4", (isLoading || isLoadingAds) && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-center">
          <p className="text-destructive font-medium">Erro ao carregar dados de marketing</p>
          <p className="text-sm text-muted-foreground mt-1">
            Não foi possível conectar à planilha. Verifique a conexão e tente novamente.
          </p>
          <Button variant="outline" size="sm" className="mt-3" onClick={refetch}>
            Tentar novamente
          </Button>
        </div>
      )}

      {/* ===== Bloco hero: Investimento • CPMQL • CAC ===== */}
      <InvestmentCacMqlHero
        investmentReal={investmentTotalForRange}
        investmentPlanned={finalInvestmentGoal}
        investmentMeta={investmentMeta}
        investmentGoogle={investmentGoogle}
        cpmqlReal={enrichedTotals.costPerStage.cpmql}
        cpmqlGoal={finalCostGoals.cpmql}
        mqls={pipefyVolumes.mqls}
        cacReal={cacReal}
        cacMidia={cacMidia}
        cacOpex={cacOpex}
        vendas={vendasPeriodo}
        ltvCac={sheetData?.ltvCac}
      />

      {/* ===== Visão Total — Indicadores 26 ===== */}
      <ConsolidatedIndicators26Section />

      {/* ===== CPV (mídia ÷ vendas) — antigo "CAC Total", renomeado ===== */}
      <CacTotalCard
        investment={investmentTotalForRange}
        sales={salesInPeriod.length}
      />

      {/* ===== NEW: Performance por Canal (Power BI-style) ===== */}
      <PerformanceByChannelSection
        dateRange={dateRange}
        salesCards={salesInPeriod}
      />

      {/* ===== NEW: Performance de Campanhas — Criativos ===== */}
      <CreativeAdPerformanceSection
        dateRange={dateRange}
        salesCards={salesInPeriod}
        campaignFunnels={campaignFunnels}
        allCampaigns={allCampaigns}
       />

      {/* ===== NEW: Funil Comparativo por Fonte ===== */}
      <SourceFunnelSection
        dateRange={dateRange}
        allCampaigns={allCampaigns}
        allAttributionCards={allAttributionCards}
        salesCards={salesInPeriod}
      />

      {/* ===== NEW: Resultados Gerais (V4-style dashboard) ===== */}
      <OverallResultsSection
        dateRange={dateRange}
        allAttributionCards={allAttributionCards}
        salesCards={salesInPeriod}
      />




      {/* ===== NEW: Online vs Offline ===== */}
      <OnlineOfflineSection
        leadsCards={leadsAttributionCards}
        salesCards={salesInPeriod}
        totalInvestment={investmentTotalForRange}
      />

      {/* ===== NEW: Curva de Conversão ===== */}
      <ConversionCurveSection salesCards={salesInPeriod} />

      {/* ===== NEW: Cohort de Entrada ===== */}
      <CohortTable
        cards={salesInPeriod}
        cohortType="entrada"
        investmentByMonth={investmentByMonth}
        title="Cohort de Entrada"
        description="Vendas agrupadas pelo mês de criação do lead no funil. Investimento = Meta + Google do mês da safra."
      />

      {/* ===== NEW: Cohort de Assinatura ===== */}
      <CohortTable
        cards={salesInPeriod}
        cohortType="assinatura"
        investmentByMonth={investmentByMonth}
        title="Cohort de Assinatura"
        description="Vendas agrupadas pelo mês de assinatura do contrato. Investimento = soma dos meses de entrada dos leads dessa safra."
      />




      {/* Channel Metrics Cards (from spreadsheet) */}
      <ChannelMetricsCards
        channels={enrichedChannels}
        totalInvestment={enrichedTotals.totalInvestment}
        totalLeads={enrichedTotals.totalLeads}
      />

      {/* Attribution Cards (real data from Pipefy) */}
      <ChannelAttributionCards 
        summaries={channelSummaries} 
        onChannelClick={(channel) => setChannelDrillDown({ isOpen: true, channel })}
      />

      {/* Channel Attribution Drill-Down */}
      {channelDrillDown.channel && (
        <DetailSheet
          open={channelDrillDown.isOpen}
          onOpenChange={(open) => setChannelDrillDown({ isOpen: open, channel: open ? channelDrillDown.channel : null })}
          title={`Vendas — ${CHANNEL_LABELS[channelDrillDown.channel]}`}
          description={`Vendas fechadas atribuídas ao canal ${CHANNEL_LABELS[channelDrillDown.channel]}`}
          items={allAttributionCards
            .filter(card => {
              const resolved = detectChannel(card);
              // Apply same reclassification logic as the hook
              if (resolved === 'organico' && card.campanha) {
                const matched = allCampaigns?.find(c => c.id === card.campanha?.trim() || c.name === card.campanha);
                if (matched) {
                  const ch = (matched.channel || '').toLowerCase();
                  if (ch.includes('meta') || ch.includes('facebook')) return channelDrillDown.channel === 'meta_ads';
                  if (ch.includes('google')) return channelDrillDown.channel === 'google_ads';
                }
              }
              return resolved === channelDrillDown.channel;
            })
            .filter(card => card.fase === 'Contrato assinado')
            .map(card => ({
              id: card.id,
              name: card.titulo,
              phase: card.fase,
              value: (card.valorMRR || 0) + (card.valorSetup || 0) + (card.valorPontual || 0),
              date: card.dataEntrada instanceof Date ? card.dataEntrada.toISOString() : String(card.dataEntrada),
              product: card.bu,
            }))}
          columns={[
            { key: 'name', label: 'Nome' },
            { key: 'phase', label: 'Fase', format: columnFormatters.phase },
            { key: 'product', label: 'BU', format: columnFormatters.product },
            { key: 'value', label: 'Valor', format: columnFormatters.currency },
            { key: 'date', label: 'Data Entrada', format: columnFormatters.date },
          ]}
        />
      )}


      {/* Revenue Metrics Cards - Integrated with Modelo Atual data */}
      <RevenueMetricsCards
        revenue={realRevenue}
        goals={finalRevenueGoals}
      />

      {/* Cost Per Stage Gauges */}
      <CostPerStageGauges 
        costPerStage={enrichedTotals.costPerStage} 
        goals={finalCostGoals}
        onCostClick={(costKey) => setCostDrillDown({ isOpen: true, costKey })}
      />

      {/* Cost Drill-Down Modal */}
      <Dialog 
        open={costDrillDown.isOpen} 
        onOpenChange={(open) => setCostDrillDown({ isOpen: open, costKey: open ? costDrillDown.costKey : null })}
      >
        <DialogContent className="max-w-[90vw] max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>
              {costDrillDown.costKey?.toUpperCase()} - Custo por {
                costDrillDown.costKey === 'cpl' ? 'Lead' :
                costDrillDown.costKey === 'cpmql' ? 'MQL' :
                costDrillDown.costKey === 'cprm' ? 'Reunião Marcada' :
                costDrillDown.costKey === 'cprr' ? 'Reunião Realizada' :
                costDrillDown.costKey === 'cpp' ? 'Proposta' :
                costDrillDown.costKey === 'cpv' ? 'Venda' : ''
              }
            </DialogTitle>
          </DialogHeader>
          
          {costDrillDown.costKey && (
            <div className="flex-1 overflow-y-auto pr-2 space-y-6">
              {/* KPI Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-muted/50 p-4 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">Custo Geral</p>
                  <p className="text-xl font-bold">
                    R$ {enrichedTotals.costPerStage[costDrillDown.costKey].toLocaleString('pt-BR')}
                  </p>
                </div>
                <div className="bg-muted/50 p-4 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">Meta</p>
                  <p className="text-xl font-bold">
                    R$ {finalCostGoals[costDrillDown.costKey].toLocaleString('pt-BR')}
                  </p>
                </div>
                <div className="bg-muted/50 p-4 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">Investimento Total</p>
                  <p className="text-xl font-bold">
                    R$ {(enrichedTotals.totalInvestment / 1000).toFixed(0)}k
                  </p>
                </div>
                <div className="bg-muted/50 p-4 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">vs Meta</p>
                  <p className={cn(
                    "text-xl font-bold",
                    data.costPerStage[costDrillDown.costKey] <= finalCostGoals[costDrillDown.costKey] 
                      ? "text-chart-2" 
                      : "text-destructive"
                  )}>
                    {((enrichedTotals.costPerStage[costDrillDown.costKey] / finalCostGoals[costDrillDown.costKey]) * 100).toFixed(0)}%
                  </p>
                </div>
              </div>

              {/* Chart: Cost by Channel */}
              <DrillDownBarChart
                title={`${costDrillDown.costKey.toUpperCase()} por Canal`}
                data={costByChannel.map(c => ({
                  label: c.channelName,
                  value: c[costDrillDown.costKey as keyof typeof c] as number,
                  highlight: (c[costDrillDown.costKey as keyof typeof c] as number) <= finalCostGoals[costDrillDown.costKey] 
                    ? 'success' as const 
                    : 'danger' as const,
                }))}
                formatValue={(v) => `R$ ${v.toLocaleString('pt-BR')}`}
              />

              {/* Table: Channel Details */}
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-medium">Canal</th>
                      <th className="text-right p-3 font-medium">Investimento</th>
                      <th className="text-right p-3 font-medium">Volume</th>
                      <th className="text-right p-3 font-medium">{costDrillDown.costKey.toUpperCase()}</th>
                      <th className="text-right p-3 font-medium">% Invest</th>
                    </tr>
                  </thead>
                  <tbody>
                    {costByChannel.map((channel) => {
                      const volumeKey = 
                        costDrillDown.costKey === 'cpl' ? 'leads' :
                        costDrillDown.costKey === 'cpmql' ? 'mqls' :
                        costDrillDown.costKey === 'cprm' ? 'rms' :
                        costDrillDown.costKey === 'cprr' ? 'rrs' :
                        costDrillDown.costKey === 'cpp' ? 'propostas' : 'vendas';
                      const costValue = channel[costDrillDown.costKey as keyof typeof channel] as number;
                      const isGood = costValue <= finalCostGoals[costDrillDown.costKey];
                      
                      return (
                        <tr key={channel.channelId} className="border-t">
                          <td className="p-3">{channel.channelName}</td>
                          <td className="text-right p-3">R$ {(channel.investment / 1000).toFixed(0)}k</td>
                          <td className="text-right p-3">{channel[volumeKey as keyof typeof channel]}</td>
                          <td className={cn(
                            "text-right p-3 font-medium",
                            isGood ? "text-chart-2" : "text-destructive"
                          )}>
                            R$ {costValue.toLocaleString('pt-BR')}
                          </td>
                          <td className="text-right p-3">
                            {((channel.investment / enrichedTotals.totalInvestment) * 100).toFixed(1)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Performance Gauges */}
      <PerformanceGauges
        roas={realPerformanceMetrics.roas}
        roasGoal={goals.roas}
        roiLtv={realPerformanceMetrics.roiLtv}
        roiLtvGoal={goals.roiLtv}
        cac={realPerformanceMetrics.cac}
        cacGoal={goals.cac}
        ltv={realPerformanceMetrics.ltv}
        ltvGoal={goals.ltv}
        investment={enrichedTotals.totalInvestment}
        investmentGoal={finalInvestmentGoal}
        metaAdsSpend={metaAdsApiTotals.investment}
        googleAdsSpend={googleAdsApiTotals.investment}
      />

      {/* Investment Forecast */}
      <InvestmentForecast
        currentSpend={enrichedTotals.totalInvestment}
        budgetGoal={finalInvestmentGoal}
        dateRange={dateRange}
      />

      {/* Investment & Funnel Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InvestmentByChannelChart channels={enrichedChannels} />
        <AcquisitionFunnelChart
          leads={pipefyVolumes.leads}
          mqls={pipefyVolumes.mqls}
          rms={pipefyVolumes.rms}
          rrs={pipefyVolumes.rrs}
        />
      </div>

      {/* Conversions by Channel Table */}
      <ConversionsByChannelChart cards={allAttributionCards} />

      {/* Best Ads / Campaigns Ranking */}
      <BestAdsSection
        campaignFunnels={campaignFunnels}
        adSetFunnels={adSetFunnels}
      />

      {/* Campaigns Table - Meta + Google Ads Integration */}
      <CampaignsTable 
        campaigns={allCampaigns} 
        campaignFunnels={campaignFunnels}
        adSetFunnels={adSetFunnels}
        adCreativeFunnels={adCreativeFunnels}
        isLoading={isLoadingAds}
        error={adsError || undefined}
        startDate={dateRange.from}
        endDate={dateRange.to}
      />
    </div>
  );
}
