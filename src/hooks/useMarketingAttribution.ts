import { useMemo } from "react";
import { AttributionCard, CampaignFunnel, ChannelId, ChannelSummary, CampaignData } from "@/components/planning/marketing-indicators/types";

// Phase to funnel stage mapping (same logic as analytics hooks)
type FunnelStage = 'leads' | 'mqls' | 'rms' | 'rrs' | 'propostas' | 'vendas';

const PHASE_FUNNEL_MAP: Record<string, FunnelStage> = {
  'Novos Leads': 'leads',
  'Start form': 'leads',
  'MQLs': 'mqls',
  'MQL': 'mqls',
  'Tentativas de contato': 'mqls',
  'Material ISCA': 'mqls',
  'Reunião agendada / Qualificado': 'rms',
  'Reunião Realizada': 'rrs',
  '1° Reunião Realizada - Apresentação': 'rrs',
  '1° Reunião Realizada': 'rrs',
  'Proposta enviada / Follow Up': 'propostas',
  'Enviar para assinatura': 'propostas',
  'Contrato assinado': 'vendas',
};

// Cumulative funnel order: a card at stage X also counts for all earlier stages
const FUNNEL_ORDER: FunnelStage[] = ['leads', 'mqls', 'rms', 'rrs', 'propostas', 'vendas'];

function getCumulativeStages(stage: FunnelStage): FunnelStage[] {
  const idx = FUNNEL_ORDER.indexOf(stage);
  return FUNNEL_ORDER.slice(0, idx + 1);
}

function isMetaCampaignId(value: string): boolean {
  return /^\d{10,}$/.test(value.trim());
}

export function detectChannel(card: AttributionCard): ChannelId {
  const fonte = (card.fonte || '').toLowerCase().trim();
  const tipo = (card.tipoOrigem || '').toLowerCase();
  const origem = (card.origemLead || '').toLowerCase();

  // Eventos tem prioridade - detectar ANTES de Meta/Google
  if (fonte.includes('evento') || tipo.includes('evento') || origem.includes('evento')
    || fonte.includes('g4') || tipo.includes('g4') || origem.includes('g4')) return 'eventos';

  // Meta Ads — extract first segment before comma for composite UTM strings
  const rawCampanha = (card.campanha || '').split(',')[0].trim();
  if (rawCampanha && isMetaCampaignId(rawCampanha)) return 'meta_ads';
  if (card.fbclid) return 'meta_ads';
  if (fonte === 'ig' || fonte === 'fb' || fonte.includes('facebook') || fonte.includes('instagram') || fonte.includes('meta')) return 'meta_ads';

  // Google Ads
  if (card.gclid) return 'google_ads';
  if (fonte === 'googleads' || fonte.includes('google')) return 'google_ads';

  return 'organico';
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Values that are CRM garbage — not real campaign identifiers
const GARBAGE_CAMPAIGN_VALUES = new Set(['1', '{{campaign.id}}', 'inbound', '{{ad.id}}', '{{adset.id}}', 'null', 'undefined', '0', '{{campaign.name}}']);

function isGarbageValue(val: string): boolean {
  const lower = val.toLowerCase().trim();
  if (GARBAGE_CAMPAIGN_VALUES.has(lower)) return true;
  if (/^\{\{.*\}\}$/.test(lower)) return true; // any {{template}} placeholder
  if (lower.length < 2) return true;
  return false;
}

function sanitizeCampaignField(value?: string): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (isGarbageValue(trimmed)) return undefined;
  return trimmed;
}

interface ParsedUTM {
  campaign?: string;
  utmContent?: string;
  utmTerm?: string;
}

function parseCompositeUTM(raw?: string): ParsedUTM {
  if (!raw) return {};
  const trimmed = raw.trim();

  // If it contains utm_content or utm_term, parse as composite
  if (trimmed.includes('utm_content=') || trimmed.includes('utm_term=')) {
    const parts = trimmed.split(',');
    let campaign: string | undefined;
    let utmContent: string | undefined;
    let utmTerm: string | undefined;

    for (const part of parts) {
      const p = part.trim();
      if (p.startsWith('utm_content=')) {
        const val = p.replace('utm_content=', '').trim();
        utmContent = isGarbageValue(val) ? undefined : val;
      } else if (p.startsWith('utm_term=')) {
        const val = p.replace('utm_term=', '').trim();
        utmTerm = isGarbageValue(val) ? undefined : val;
      } else if (!campaign) {
        campaign = isGarbageValue(p) ? undefined : p;
      }
    }
    return { campaign, utmContent, utmTerm };
  }

  // Not composite — treat entire value as campaign
  const sanitized = sanitizeCampaignField(trimmed);
  return { campaign: sanitized };
}

export function useMarketingAttribution(
  allCards: AttributionCard[],
  allApiCampaigns: CampaignData[] | null | undefined,
  campaignNamesMap?: Map<string, string> | null,
) {
  // Pre-process: per-card best stage + metadata
  const cardInfos = useMemo(() => {
    const cardBestStage = new Map<string, { campaign: string; conjunto: string; anuncio: string; channel: ChannelId; stages: Set<string>; card: AttributionCard }>();
    
    for (const card of allCards) {
      const stage = PHASE_FUNNEL_MAP[card.fase] || 'leads';
      const cumulativeStages = getCumulativeStages(stage);
      
      // Parse composite UTM from campanha field
      const parsed = parseCompositeUTM(card.campanha);
      const campaign = parsed.campaign || '(Sem campanha)';
      const conjunto = sanitizeCampaignField(card.conjuntoGrupo) || parsed.utmContent || '(Sem conjunto)';
      const anuncio = sanitizeCampaignField(card.palavraChaveAnuncio) || parsed.utmTerm || '(Sem anúncio)';
      const key = `${card.id}`;
      
      if (!cardBestStage.has(key)) {
        cardBestStage.set(key, {
          campaign,
          conjunto,
          anuncio,
          channel: detectChannel(card),
          stages: new Set(cumulativeStages),
          card,
        });
      } else {
        for (const s of cumulativeStages) {
          cardBestStage.get(key)!.stages.add(s);
        }
      }
    }
    return cardBestStage;
  }, [allCards]);

  // API campaigns lookup
  const apiLookup = useMemo(() => {
    const campaignById = new Map<string, CampaignData>();
    const campaignByName = new Map<string, CampaignData>();
    if (allApiCampaigns) {
      for (const mc of allApiCampaigns) {
        campaignById.set(mc.id, mc);
        if (mc.id.startsWith('google_')) {
          campaignById.set(mc.id.replace('google_', ''), mc);
        }
        campaignByName.set(normalizeName(mc.name), mc);
      }
    }
    return { campaignById, campaignByName };
  }, [allApiCampaigns]);

  // Resolve API campaign helper
  const resolveApiCampaign = (name: string) => {
    const { campaignById, campaignByName } = apiLookup;
    let apiCampaign: CampaignData | undefined;
    let campaignId: string | undefined;
    
    if (isMetaCampaignId(name)) {
      apiCampaign = campaignById.get(name.trim());
      campaignId = name.trim();
    }
    if (!apiCampaign) {
      apiCampaign = campaignById.get(name);
      if (apiCampaign) campaignId = apiCampaign.id;
    }
    if (!apiCampaign) {
      apiCampaign = campaignByName.get(normalizeName(name));
      if (apiCampaign) campaignId = apiCampaign.id;
    }
    if (!apiCampaign && allApiCampaigns) {
      const normCard = normalizeName(name);
      if (normCard && normCard !== '(sem campanha)') {
        for (const mc of allApiCampaigns) {
          const normApi = normalizeName(mc.name);
          if (normApi.includes(normCard) || normCard.includes(normApi)) {
            apiCampaign = mc;
            campaignId = mc.id;
            break;
          }
        }
      }
    }
    // Fallback: resolve name from the lightweight names map (archived/deleted campaigns)
    if (!apiCampaign && campaignNamesMap && isMetaCampaignId(name)) {
      const resolvedName = campaignNamesMap.get(name.trim());
      if (resolvedName) {
        // Create a stub CampaignData with the resolved name
        apiCampaign = {
          id: name.trim(),
          name: resolvedName,
          channel: 'Meta Ads',
          status: 'ended',
          investment: 0,
          leads: 0,
          mqls: 0,
          roas: 0,
          startDate: '',
        };
        campaignId = name.trim();
      }
    }
    return { apiCampaign, campaignId };
  };

  // Build funnel by campaign
  const campaignFunnels = useMemo(() => {
    if (!allCards.length) return [];
    
    const campaignMap = new Map<string, {
      channel: ChannelId;
      leads: Set<string>; mqls: Set<string>; rms: Set<string>;
      rrs: Set<string>; propostas: Set<string>; vendas: Set<string>;
      receita: number; tcv: number;
    }>();
    
    for (const [cardId, info] of cardInfos) {
      const key = `${info.campaign}::${info.channel}`;
      if (!campaignMap.has(key)) {
        campaignMap.set(key, {
          channel: info.channel,
          leads: new Set(), mqls: new Set(), rms: new Set(),
          rrs: new Set(), propostas: new Set(), vendas: new Set(),
          receita: 0, tcv: 0,
        });
      }
      const entry = campaignMap.get(key)!;
      for (const stage of info.stages) {
        (entry[stage as keyof typeof entry] as Set<string>).add(cardId);
      }
      if (info.stages.has('vendas')) {
        entry.receita += (info.card.valorMRR || 0) + (info.card.valorSetup || 0) + (info.card.valorPontual || 0) + (info.card.valorEducacao || 0);
        entry.tcv += ((info.card.valorMRR || 0) * 12) + (info.card.valorSetup || 0) + (info.card.valorPontual || 0);
      }
    }
    
    const funnels: CampaignFunnel[] = [];
    for (const [compositeKey, data] of campaignMap) {
      const name = compositeKey.split('::')[0];
      const { apiCampaign, campaignId } = resolveApiCampaign(name);
      
      let resolvedChannel = data.channel;
      if (apiCampaign && data.channel === 'organico') {
        const apiChannel = (apiCampaign.channel || '').toLowerCase();
        if (apiChannel.includes('meta') || apiChannel.includes('facebook')) resolvedChannel = 'meta_ads';
        else if (apiChannel.includes('google')) resolvedChannel = 'google_ads';
      }
      
      const investimento = resolvedChannel === 'organico' ? 0 : (apiCampaign?.investment || 0);
      const receita = data.receita;
      
      funnels.push({
        campaignName: apiCampaign?.name || name,
        campaignId,
        channel: resolvedChannel,
        leads: data.leads.size, mqls: data.mqls.size, rms: data.rms.size,
        rrs: data.rrs.size, propostas: data.propostas.size, vendas: data.vendas.size,
        receita, investimento,
        roi: investimento > 0 ? receita / investimento : 0,
        tcv: data.tcv,
      });
    }
    
    funnels.sort((a, b) => b.leads - a.leads);
    return funnels;
  }, [allCards, cardInfos, apiLookup, allApiCampaigns, campaignNamesMap]);

  // Build funnel by adSet/adGroup (campaign::conjunto::channel)
  const adSetFunnels = useMemo(() => {
    if (!allCards.length) return new Map<string, CampaignFunnel>();
    
    const adSetMap = new Map<string, {
      campaign: string; conjunto: string; channel: ChannelId;
      leads: Set<string>; mqls: Set<string>; rms: Set<string>;
      rrs: Set<string>; propostas: Set<string>; vendas: Set<string>;
      receita: number; tcv: number;
    }>();
    
    for (const [cardId, info] of cardInfos) {
      const key = `${normalizeName(info.campaign)}::${normalizeName(info.conjunto)}::${info.channel}`;
      if (!adSetMap.has(key)) {
        adSetMap.set(key, {
          campaign: info.campaign, conjunto: info.conjunto, channel: info.channel,
          leads: new Set(), mqls: new Set(), rms: new Set(),
          rrs: new Set(), propostas: new Set(), vendas: new Set(),
          receita: 0, tcv: 0,
        });
      }
      const entry = adSetMap.get(key)!;
      for (const stage of info.stages) {
        (entry[stage as keyof typeof entry] as Set<string>).add(cardId);
      }
      if (info.stages.has('vendas')) {
        entry.receita += (info.card.valorMRR || 0) + (info.card.valorSetup || 0) + (info.card.valorPontual || 0) + (info.card.valorEducacao || 0);
        entry.tcv += ((info.card.valorMRR || 0) * 12) + (info.card.valorSetup || 0) + (info.card.valorPontual || 0);
      }
    }
    
    // Convert to CampaignFunnel map keyed by normalized "campaign::conjunto"
    const result = new Map<string, CampaignFunnel>();
    for (const [key, data] of adSetMap) {
      const receita = data.receita;
      result.set(key, {
        campaignName: data.conjunto,
        channel: data.channel,
        leads: data.leads.size, mqls: data.mqls.size, rms: data.rms.size,
        rrs: data.rrs.size, propostas: data.propostas.size, vendas: data.vendas.size,
        receita, investimento: 0, roi: 0, tcv: data.tcv,
      });
    }
    return result;
  }, [allCards, cardInfos]);

  // Build funnel by individual ad/creative (campaign::conjunto::anuncio::channel)
  const adCreativeFunnels = useMemo(() => {
    if (!allCards.length) return new Map<string, CampaignFunnel>();
    
    const adMap = new Map<string, {
      campaign: string; conjunto: string; anuncio: string; channel: ChannelId;
      leads: Set<string>; mqls: Set<string>; rms: Set<string>;
      rrs: Set<string>; propostas: Set<string>; vendas: Set<string>;
      receita: number; tcv: number;
    }>();
    
    for (const [cardId, info] of cardInfos) {
      // Skip cards without a specific ad identifier
      if (info.anuncio === '(Sem anúncio)') continue;
      
      const key = `${normalizeName(info.campaign)}::${normalizeName(info.conjunto)}::${normalizeName(info.anuncio)}::${info.channel}`;
      if (!adMap.has(key)) {
        adMap.set(key, {
          campaign: info.campaign, conjunto: info.conjunto, anuncio: info.anuncio, channel: info.channel,
          leads: new Set(), mqls: new Set(), rms: new Set(),
          rrs: new Set(), propostas: new Set(), vendas: new Set(),
          receita: 0, tcv: 0,
        });
      }
      const entry = adMap.get(key)!;
      for (const stage of info.stages) {
        (entry[stage as keyof typeof entry] as Set<string>).add(cardId);
      }
      if (info.stages.has('vendas')) {
        entry.receita += (info.card.valorMRR || 0) + (info.card.valorSetup || 0) + (info.card.valorPontual || 0) + (info.card.valorEducacao || 0);
        entry.tcv += ((info.card.valorMRR || 0) * 12) + (info.card.valorSetup || 0) + (info.card.valorPontual || 0);
      }
    }
    
    const result = new Map<string, CampaignFunnel>();
    for (const [key, data] of adMap) {
      const receita = data.receita;
      result.set(key, {
        campaignName: data.anuncio,
        channel: data.channel,
        leads: data.leads.size, mqls: data.mqls.size, rms: data.rms.size,
        rrs: data.rrs.size, propostas: data.propostas.size, vendas: data.vendas.size,
        receita, investimento: 0, roi: 0, tcv: data.tcv,
      });
    }
    return result;
  }, [allCards, cardInfos]);

  // Channel summaries
  const channelSummaries = useMemo(() => {
    const channelMap = new Map<ChannelId, ChannelSummary>();
    
    for (const f of campaignFunnels) {
      if (!channelMap.has(f.channel)) {
        channelMap.set(f.channel, {
          channel: f.channel,
          leads: 0, mqls: 0, vendas: 0, receita: 0, investimento: 0, roi: 0,
        });
      }
      const s = channelMap.get(f.channel)!;
      s.leads += f.leads;
      s.mqls += f.mqls;
      s.vendas += f.vendas;
      s.receita += f.receita;
      s.investimento += f.investimento;
    }
    
    for (const s of channelMap.values()) {
      s.roi = s.investimento > 0 ? s.receita / s.investimento : 0;
    }
    
    return Array.from(channelMap.values()).sort((a, b) => b.leads - a.leads);
  }, [campaignFunnels]);

  return { campaignFunnels, channelSummaries, adSetFunnels, adCreativeFunnels };
}
