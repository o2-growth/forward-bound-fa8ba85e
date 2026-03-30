import { useMemo } from 'react';
import { 
  MarketingMetrics, 
  MarketingGoals, 
  MarketingChannel, 
  CampaignData,
  InstagramMetrics,
  RevenueMetrics,
  CostPerStage,
  CostPerStageGoals,
  CostPerChannelStage,
  RevenueGoals
} from '@/components/planning/marketing-indicators/types';
import { useMarketingSheetData } from './useMarketingSheetData';

interface UseMarketingIndicatorsParams {
  startDate: Date;
  endDate: Date;
  selectedBUs: string[];
  selectedChannels: string[];
}

interface UseMarketingIndicatorsResult {
  data: MarketingMetrics;
  goals: MarketingGoals;
  costGoals: CostPerStageGoals;
  costByChannel: CostPerChannelStage[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

// Empty data when sheet data is unavailable
function getEmptyData(): MarketingMetrics {
  return {
    roas: 0,
    roasLtv: 0,
    roiLtv: 0,
    cac: 0,
    ltv: 0,
    totalInvestment: 0,
    totalLeads: 0,
    totalMqls: 0,
    totalRms: 0,
    totalRrs: 0,
    totalPropostas: 0,
    totalVendas: 0,
    channels: [],
    campaigns: [],
    instagram: { instagramO2: 0, instagramPedro: 0, instagramTotal: 0 },
    revenue: { mrr: 0, setup: 0, pontual: 0, educacao: 0, gmv: 0 },
    costPerStage: { cpl: 0, cpmql: 0, cprm: 0, cprr: 0, cpp: 0, cpv: 0 },
  };
}

/**
 * Hook for Marketing Indicators data.
 * Fetches real data from Google Sheets via Edge Function.
 * Falls back to mock data if loading or error.
 */
export function useMarketingIndicators({
  startDate,
  endDate,
  selectedBUs,
  selectedChannels,
}: UseMarketingIndicatorsParams): UseMarketingIndicatorsResult {
  
  // Fetch real data from Google Sheets
  const { 
    data: sheetData, 
    isLoading: sheetLoading, 
    error: sheetError,
    refetch: sheetRefetch 
  } = useMarketingSheetData({ startDate, endDate });
  
  // Transform sheet data into MarketingMetrics
  const data = useMemo<MarketingMetrics>(() => {
    // Return empty data if no sheet data available
    if (!sheetData || sheetError) {
      console.log('No sheet data available:', { sheetError });
      return getEmptyData();
    }
    
    console.log('Using real sheet data:', sheetData);
    
    // Calculate channel-level metrics
    // Note: The sheet provides totals, but we need to calculate per-channel metrics
    // For now, we'll use the individual channel data from the sheet
    const totalInvestment = sheetData.midiaTotal || (sheetData.midiaMeta + sheetData.midiaGoogle);
    const totalLeads = sheetData.leadsTotais || (sheetData.leadsMeta + sheetData.leadsGoogle);
    
    // Calculate channel proportions for metrics not available per-channel
    const metaRatio = totalInvestment > 0 ? sheetData.midiaMeta / totalInvestment : 0.5;
    const googleRatio = 1 - metaRatio;
    
    const channels: MarketingChannel[] = [
      {
        id: 'meta_ads',
        name: 'Meta Ads',
        investment: sheetData.midiaMeta,
        leads: sheetData.leadsMeta,
        mqls: Math.round(sheetData.mqlPorFaturamento * metaRatio),
        rms: Math.round(sheetData.reuniaoMarcada * metaRatio),
        rrs: Math.round(sheetData.reuniaoRealizada * metaRatio),
        cpl: sheetData.cplMeta || (sheetData.leadsMeta > 0 ? sheetData.midiaMeta / sheetData.leadsMeta : 0),
        cpmql: sheetData.cpmqlPorFaturamento || 0,
        conversionRate: sheetData.leadsMeta > 0 
          ? Math.round((sheetData.mqlPorFaturamento * metaRatio / sheetData.leadsMeta) * 100) 
          : 0,
        propostas: Math.round(sheetData.propostaEnviada * metaRatio),
        vendas: Math.round(sheetData.vendas * metaRatio),
        cprm: sheetData.cprm || 0,
        cprr: sheetData.cprr || 0,
        cpp: sheetData.cpp || 0,
        cpv: sheetData.cpv || 0,
      },
      {
        id: 'google_ads',
        name: 'Google Ads',
        investment: sheetData.midiaGoogle,
        leads: sheetData.leadsGoogle,
        mqls: Math.round(sheetData.mqlPorFaturamento * googleRatio),
        rms: Math.round(sheetData.reuniaoMarcada * googleRatio),
        rrs: Math.round(sheetData.reuniaoRealizada * googleRatio),
        cpl: sheetData.cplGoogle || (sheetData.leadsGoogle > 0 ? sheetData.midiaGoogle / sheetData.leadsGoogle : 0),
        cpmql: sheetData.cpmqlPorFaturamento || 0,
        conversionRate: sheetData.leadsGoogle > 0 
          ? Math.round((sheetData.mqlPorFaturamento * googleRatio / sheetData.leadsGoogle) * 100) 
          : 0,
        propostas: Math.round(sheetData.propostaEnviada * googleRatio),
        vendas: Math.round(sheetData.vendas * googleRatio),
        cprm: sheetData.cprm || 0,
        cprr: sheetData.cprr || 0,
        cpp: sheetData.cpp || 0,
        cpv: sheetData.cpv || 0,
      },
    ];

    // Empty campaigns for now (could be extended to read from another tab)
    const campaigns: CampaignData[] = [];

    // Instagram data (not available in this sheet, use placeholder)
    const instagram: InstagramMetrics = {
      instagramO2: 0,
      instagramPedro: 0,
      instagramTotal: 0,
    };

    const revenue: RevenueMetrics = {
      mrr: sheetData.mrr,
      setup: sheetData.setup,
      pontual: sheetData.pontual,
      educacao: sheetData.educacao,
      gmv: sheetData.gmv,
    };

    const costPerStage: CostPerStage = {
      cpl: sheetData.cplTotal || (totalLeads > 0 ? totalInvestment / totalLeads : 0),
      cpmql: sheetData.cpmqlPorFaturamento || (sheetData.mqlPorFaturamento > 0 ? totalInvestment / sheetData.mqlPorFaturamento : 0),
      cprm: sheetData.cprm || (sheetData.reuniaoMarcada > 0 ? totalInvestment / sheetData.reuniaoMarcada : 0),
      cprr: sheetData.cprr || (sheetData.reuniaoRealizada > 0 ? totalInvestment / sheetData.reuniaoRealizada : 0),
      cpp: sheetData.cpp || (sheetData.propostaEnviada > 0 ? totalInvestment / sheetData.propostaEnviada : 0),
      cpv: sheetData.cpv || (sheetData.vendas > 0 ? totalInvestment / sheetData.vendas : 0),
    };

    const filteredChannels = selectedChannels.length > 0 
      ? channels.filter(c => selectedChannels.includes(c.id))
      : channels;

    return {
      roas: sheetData.roas || 0,
      roasLtv: sheetData.roasLtv || 0,
      roiLtv: sheetData.roiLtv || 0,
      cac: sheetData.cac || 0,
      ltv: sheetData.ltv || 0,
      totalInvestment,
      totalLeads,
      totalMqls: sheetData.mqlPorFaturamento || 0,
      totalRms: sheetData.reuniaoMarcada || 0,
      totalRrs: sheetData.reuniaoRealizada || 0,
      totalPropostas: sheetData.propostaEnviada || 0,
      totalVendas: sheetData.vendas || 0,
      channels: filteredChannels,
      campaigns,
      instagram,
      revenue,
      costPerStage,
    };
  }, [sheetData, sheetError, selectedChannels]);

  // Goals for comparison
  const goals = useMemo<MarketingGoals>(() => {
    const revenueGoals: RevenueGoals = {
      mrr: 150000,
      setup: 50000,
      pontual: 30000,
      educacao: 25000,
      gmv: 250000,
    };

    return {
      roas: 3.5,
      roiLtv: 5.0,
      cac: 8000,
      ltv: 40000,
      investment: 200000,
      leads: 1200,
      mqls: 840,
      rms: 500,
      rrs: 400,
      revenue: revenueGoals,
    };
  }, []);

  // Cost per stage goals (benchmarks)
  const costGoals = useMemo<CostPerStageGoals>(() => ({
    cpl: 200,
    cpmql: 280,
    cprm: 450,
    cprr: 550,
    cpp: 650,
    cpv: 9500,
  }), []);

  // Cost breakdown by channel
  const costByChannel = useMemo<CostPerChannelStage[]>(() => {
    return data.channels.map(channel => ({
      channelId: channel.id,
      channelName: channel.name,
      investment: channel.investment,
      leads: channel.leads,
      mqls: channel.mqls,
      rms: channel.rms,
      rrs: channel.rrs,
      propostas: channel.propostas || 0,
      vendas: channel.vendas || 0,
      cpl: channel.cpl,
      cpmql: channel.cpmql,
      cprm: channel.cprm || 0,
      cprr: channel.cprr || 0,
      cpp: channel.cpp || 0,
      cpv: channel.cpv || 0,
    }));
  }, [data.channels]);

  const refetch = () => {
    console.log('Marketing indicators refetch triggered');
    sheetRefetch();
  };

  return {
    data,
    goals,
    costGoals,
    costByChannel,
    isLoading: sheetLoading,
    error: sheetError || null,
    refetch,
  };
}
