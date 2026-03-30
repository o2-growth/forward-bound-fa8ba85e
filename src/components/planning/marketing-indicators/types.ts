export interface MarketingChannel {
  id: string;
  name: string;
  investment: number;
  leads: number;
  mqls: number;
  rms: number;      // Reuniões Marcadas
  rrs: number;      // Reuniões Realizadas
  cpl: number;      // Cost per Lead
  cpmql: number;    // Cost per MQL
  conversionRate: number; // MQL/Leads
  propostas?: number;
  vendas?: number;
  cprm?: number;    // Cost per RM
  cprr?: number;    // Cost per RR
  cpp?: number;     // Cost per Proposta
  cpv?: number;     // Cost per Venda
}

export interface AdData {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'ended';
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
  cpl: number;
  ctr: number;
  reach: number;
  frequency: number;
  cpa: number;
  thumbnailUrl?: string;
  previewUrl?: string;
}

export interface AdSetData {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'ended';
  dailyBudget: number;
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
  cpl: number;
  ctr?: number;
  reach?: number;
  frequency?: number;
  cpa?: number;
  previewUrl?: string;
  thumbnailUrl?: string;
  ads?: AdData[];
}

export interface CampaignData {
  id: string;
  name: string;
  channel: string;
  status: 'active' | 'paused' | 'ended';
  investment: number;
  leads: number;
  mqls: number;
  roas: number;
  startDate: string;
  endDate?: string;
  objective?: string;
  impressions?: number;
  clicks?: number;
  cpl?: number;
  ctr?: number;
  reach?: number;
  frequency?: number;
  cpa?: number;
  conversions?: number;
  adSets?: AdSetData[];
  thumbnailUrl?: string;
  previewUrl?: string;
}

export interface InstagramMetrics {
  instagramO2: number;
  instagramPedro: number;
  instagramTotal: number;
}

export interface RevenueMetrics {
  mrr: number;
  setup: number;
  pontual: number;
  educacao: number;
  gmv: number;
}

export interface RevenueGoals {
  mrr: number;
  setup: number;
  pontual: number;
  educacao: number;
  gmv: number;
}

export interface CostPerStage {
  cpl: number;
  cpmql: number;
  cprm: number;
  cprr: number;
  cpp: number;
  cpv: number;
}

export interface CostPerStageGoals {
  cpl: number;
  cpmql: number;
  cprm: number;
  cprr: number;
  cpp: number;
  cpv: number;
}

export interface CostPerChannelStage {
  channelId: string;
  channelName: string;
  investment: number;
  leads: number;
  mqls: number;
  rms: number;
  rrs: number;
  propostas: number;
  vendas: number;
  cpl: number;
  cpmql: number;
  cprm: number;
  cprr: number;
  cpp: number;
  cpv: number;
}

export interface MarketingMetrics {
  // Performance metrics
  roas: number;
  roasLtv: number;
  roiLtv: number;
  cac: number;
  ltv: number;
  
  // Investment
  totalInvestment: number;
  
  // Acquisition funnel
  totalLeads: number;
  totalMqls: number;
  totalRms: number;
  totalRrs: number;
  totalPropostas: number;
  totalVendas: number;
  
  // By channel
  channels: MarketingChannel[];
  
  // Campaigns
  campaigns: CampaignData[];
  
  // Instagram breakdown
  instagram: InstagramMetrics;
  
  // Revenue metrics
  revenue: RevenueMetrics;
  
  // Cost per stage
  costPerStage: CostPerStage;
}

export interface MarketingGoals {
  roas: number;
  roiLtv: number;
  cac: number;
  ltv: number;
  investment: number;
  leads: number;
  mqls: number;
  rms: number;
  rrs: number;
  revenue: RevenueGoals;
}

export type ChannelId = 'meta_ads' | 'google_ads' | 'eventos' | 'organico' | 'outros';

export const CHANNEL_LABELS: Record<ChannelId, string> = {
  meta_ads: 'Meta Ads',
  google_ads: 'Google Ads',
  eventos: 'Eventos',
  organico: 'Orgânico / Direto',
  outros: 'Outros',
};

export const CHANNEL_COLORS: Record<ChannelId, string> = {
  meta_ads: 'hsl(var(--chart-1))',
  google_ads: 'hsl(var(--chart-2))',
  eventos: 'hsl(var(--chart-3))',
  organico: 'hsl(var(--chart-4))',
  outros: 'hsl(var(--chart-5))',
};

// Attribution types
export interface AttributionCard {
  id: string;
  titulo: string;
  campanha?: string;
  conjuntoGrupo?: string;
  fonte?: string;
  fbclid?: string;
  gclid?: string;
  tipoOrigem?: string;
  origemLead?: string;
  palavraChaveAnuncio?: string;
  fase: string;
  dataEntrada: Date;
  valor: number;
  valorMRR: number;
  valorSetup: number;
  valorPontual: number;
  valorEducacao?: number;
  bu: string;
}

export interface CampaignFunnel {
  campaignName: string;
  campaignId?: string;
  channel: ChannelId;
  leads: number;
  mqls: number;
  rms: number;
  rrs: number;
  propostas: number;
  vendas: number;
  receita: number;
  investimento: number;
  roi: number;
  tcv: number;
}

export interface ChannelSummary {
  channel: ChannelId;
  leads: number;
  mqls: number;
  vendas: number;
  receita: number;
  investimento: number;
  roi: number;
}
