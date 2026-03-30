import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronDown, ChevronUp, ChevronRight, Loader2, AlertCircle, ExternalLink, Image, ArrowUpDown } from "lucide-react";
import { CHANNEL_LABELS, ChannelId } from "./types";
import { CampaignData, AdSetData, AdData, CampaignFunnel } from "./types";
import { useCampaignAdSets } from "@/hooks/useCampaignAdSets";
import { useAdSetAds } from "@/hooks/useAdSetAds";
import { useGoogleAdGroups } from "@/hooks/useGoogleAdGroups";
import { useGoogleKeywords, GoogleKeyword } from "@/hooks/useGoogleKeywords";
import { cn } from "@/lib/utils";

interface CampaignsTableProps {
  campaigns: CampaignData[];
  campaignFunnels?: CampaignFunnel[];
  adSetFunnels?: Map<string, CampaignFunnel>;
  adCreativeFunnels?: Map<string, CampaignFunnel>;
  isLoading?: boolean;
  error?: Error | null;
  startDate: Date;
  endDate: Date;
}

interface PreviewModalData {
  name: string;
  thumbnailUrl: string;
  previewUrl?: string;
  spend?: number;
  impressions?: number;
  clicks?: number;
  leads?: number;
  cpl?: number;
  ctr?: number;
}

// ─── Formatters ────────────────────────────────────────────────

const formatCurrency = (value: number) => {
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(1)}k`;
  return `R$ ${value.toFixed(0)}`;
};

const formatNumber = (value: number) => {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return value.toFixed(0);
};

const formatPercent = (value: number) => {
  if (!value || value === 0) return '-';
  return `${value.toFixed(2)}%`;
};

const getStatusBadge = (status: 'active' | 'paused' | 'ended') => {
  switch (status) {
    case 'active':
      return <Badge variant="default" className="bg-emerald-500">Ativo</Badge>;
    case 'paused':
      return <Badge variant="secondary" className="bg-amber-500 text-white">Pausado</Badge>;
    case 'ended':
      return <Badge variant="outline">Encerrado</Badge>;
    default:
      return null;
  }
};

const getSourceBadge = (channel: string) => {
  if (channel === 'Google Ads') {
    return <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-500 text-blue-600">Google</Badge>;
  }
  return <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-indigo-500 text-indigo-600">Meta</Badge>;
};

// Helper to detect if campaign is from Google Ads
function isGoogleCampaign(campaign: CampaignData): boolean {
  return campaign.channel === 'Google Ads' || campaign.id.startsWith('google_');
}

function getGoogleRawId(campaign: CampaignData): string {
  return (campaign as any)._googleId || campaign.id.replace('google_', '');
}

// ─── Thumbnail component ──────────────────────────────────────

function Thumbnail({ 
  url, name, size = 'md', onClick 
}: { 
  url?: string; name: string; size?: 'sm' | 'md'; onClick?: () => void 
}) {
  const sizeClass = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10';
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className={`${sizeClass} object-cover rounded cursor-pointer hover:opacity-80 transition-opacity`}
        onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      />
    );
  }
  return (
    <div className={`${sizeClass} bg-muted rounded flex items-center justify-center`}>
      <Image className={`${iconSize} text-muted-foreground`} />
    </div>
  );
}

// ─── Normalize helper for adSet lookup ────────────────────────
function normalizeName(name: string): string {
  return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim();
}

function lookupAdSetFunnel(
  adSetFunnels: Map<string, CampaignFunnel> | undefined,
  campaignName: string,
  adSetName: string,
  channel: string,
  campaignId?: string,
  adSetId?: string,
): CampaignFunnel | undefined {
  if (!adSetFunnels || adSetFunnels.size === 0) return undefined;
  const normCamp = normalizeName(campaignName);
  const normAdSet = normalizeName(adSetName);
  const channelId = channel === 'Google Ads' ? 'google_ads' : 'meta_ads';
  
  // Try with campaign ID first (CRM often stores numeric Meta/Google IDs)
  if (campaignId) {
    const normId = normalizeName(campaignId);
    const idKey = `${normId}::${normAdSet}::${channelId}`;
    if (adSetFunnels.has(idKey)) return adSetFunnels.get(idKey);
    // Also try raw ID without google_ prefix
    const rawId = campaignId.replace('google_', '');
    if (rawId !== campaignId) {
      const rawIdKey = `${normalizeName(rawId)}::${normAdSet}::${channelId}`;
      if (adSetFunnels.has(rawIdKey)) return adSetFunnels.get(rawIdKey);
    }
  }
  
  // Exact key match by name
  const exactKey = `${normCamp}::${normAdSet}::${channelId}`;
  if (adSetFunnels.has(exactKey)) return adSetFunnels.get(exactKey);
  
  // Partial match: scan for adSet name containing or contained by
  for (const [key, funnel] of adSetFunnels) {
    const parts = key.split('::');
    if (parts.length < 3) continue;
    const funnelAdSet = parts[1];
    const funnelChannel = parts[2];
    if (funnelChannel !== channelId) continue;
    // Check campaign match (exact or partial, including ID)
    const funnelCamp = parts[0];
    const campMatch = funnelCamp === normCamp || funnelCamp.includes(normCamp) || normCamp.includes(funnelCamp)
      || (campaignId && (funnelCamp === normalizeName(campaignId) || funnelCamp === normalizeName(campaignId.replace('google_', ''))));
    if (!campMatch) continue;
    // Check adSet match (partial name OR numeric ID match)
    if (funnelAdSet.includes(normAdSet) || normAdSet.includes(funnelAdSet)) {
      return funnel;
    }
  }
  
  // Bug Fix 2: CRM stores numeric ad set IDs as conjunto, API provides names.
  // If we have the API ad set's ID, scan funnel keys where the conjunto part matches it.
  if (adSetId && campaignId) {
    const normAdSetId = normalizeName(adSetId);
    for (const [key, funnel] of adSetFunnels) {
      const parts = key.split('::');
      if (parts.length < 3) continue;
      const funnelAdSetVal = parts[1];
      const funnelChannel = parts[2];
      if (funnelChannel !== channelId) continue;
      const funnelCamp = parts[0];
      const campMatch = funnelCamp === normalizeName(campaignId) || funnelCamp === normalizeName(campaignId.replace('google_', ''))
        || funnelCamp === normCamp || funnelCamp.includes(normCamp) || normCamp.includes(funnelCamp);
      if (!campMatch) continue;
      // Match: the CRM conjunto (numeric ID) equals the API ad set's id
      if (funnelAdSetVal === normAdSetId) {
        return funnel;
      }
    }
  }
  return undefined;
}

// ─── Lookup helper for ad-level CRM match ─────────────────────
function lookupAdCreativeFunnel(
  adCreativeFunnels: Map<string, CampaignFunnel>,
  campaignName: string,
  adSetName: string,
  adId: string,
  channel: string,
  campaignId?: string,
): CampaignFunnel | undefined {
  if (!adCreativeFunnels || adCreativeFunnels.size === 0) return undefined;
  const channelId = channel === 'Google Ads' ? 'google_ads' : 'meta_ads';
  const normAdSet = normalizeName(adSetName);
  const normAdId = normalizeName(adId);
  
  // Try with campaign ID (CRM stores numeric IDs for Meta campaigns)
  if (campaignId) {
    const normId = normalizeName(campaignId);
    const idKey = `${normId}::${normAdSet}::${normAdId}::${channelId}`;
    if (adCreativeFunnels.has(idKey)) return adCreativeFunnels.get(idKey);
    const rawId = campaignId.replace('google_', '');
    if (rawId !== campaignId) {
      const rawKey = `${normalizeName(rawId)}::${normAdSet}::${normAdId}::${channelId}`;
      if (adCreativeFunnels.has(rawKey)) return adCreativeFunnels.get(rawKey);
    }
  }
  
  // Try with campaign name
  const normCamp = normalizeName(campaignName);
  const nameKey = `${normCamp}::${normAdSet}::${normAdId}::${channelId}`;
  if (adCreativeFunnels.has(nameKey)) return adCreativeFunnels.get(nameKey);

  // Partial scan for fuzzy matches
  for (const [key, funnel] of adCreativeFunnels) {
    const parts = key.split('::');
    if (parts.length < 4) continue;
    const [fCamp, fAdSet, fAd, fChannel] = parts;
    if (fChannel !== channelId) continue;
    // Ad ID must match exactly
    if (fAd !== normAdId) continue;
    // Campaign match (exact or partial, including by ID)
    const campMatch = fCamp === normCamp || fCamp.includes(normCamp) || normCamp.includes(fCamp)
      || (campaignId && (fCamp === normalizeName(campaignId) || fCamp === normalizeName(campaignId.replace('google_', ''))));
    if (!campMatch) continue;
    // AdSet match (partial)
    if (fAdSet.includes(normAdSet) || normAdSet.includes(fAdSet)) {
      return funnel;
    }
  }
  return undefined;
}

// CRM cells helper for sub-rows: MQL | CPMQL | RM | RR | PE | Venda | ROAS
function CrmCells({ funnel, spend, size = 'sm' }: { funnel?: CampaignFunnel; spend?: number; size?: 'sm' | 'md' }) {
  const textClass = size === 'sm' ? 'text-xs' : 'text-sm';
  const dash = <TableCell className={`text-right ${textClass} text-muted-foreground`}>-</TableCell>;
  if (!funnel) {
    return (
      <>
        {dash}{dash}{dash}{dash}{dash}{dash}{dash}
      </>
    );
  }
  const inv = spend || funnel.investimento || 0;
  const cpmql = funnel.mqls > 0 ? inv / funnel.mqls : 0;
  const roas = inv > 0 ? funnel.receita / inv : 0;
  return (
    <>
      <TableCell className={`text-right ${textClass}`}>{funnel.mqls}</TableCell>
      <TableCell className={`text-right ${textClass}`}>{cpmql > 0 ? formatCurrency(cpmql) : '-'}</TableCell>
      <TableCell className={`text-right ${textClass}`}>{funnel.rms}</TableCell>
      <TableCell className={`text-right ${textClass}`}>{funnel.rrs}</TableCell>
      <TableCell className={`text-right ${textClass}`}>{funnel.propostas}</TableCell>
      <TableCell className={`text-right ${textClass}`}>{funnel.vendas}</TableCell>
      <TableCell className={cn(`text-right ${textClass} font-semibold`, roas >= 1 ? "text-chart-2" : roas > 0 ? "text-destructive" : "text-muted-foreground")}>
        {inv > 0 ? `${roas.toFixed(1)}x` : '-'}
      </TableCell>
    </>
  );
}

// ─── Google Keyword Row (level 3) ─────────────────────────────

const MATCH_TYPE_LABEL: Record<string, string> = {
  BROAD: 'BROAD',
  PHRASE: 'PHRASE',
  EXACT: 'EXACT',
  UNKNOWN: '?',
};

function GoogleKeywordRow({ keyword }: { keyword: GoogleKeyword }) {
  const matchLabel = MATCH_TYPE_LABEL[keyword.matchType] || keyword.matchType;
  return (
    <TableRow className="bg-muted/15">
      <TableCell className="p-2"></TableCell>
      <TableCell className="w-14 p-2"></TableCell>
      <TableCell className="pl-10 font-normal text-xs text-muted-foreground">
        <span>│  ├─ <Badge variant="outline" className="text-[9px] px-1 py-0 mr-1">{matchLabel}</Badge>{keyword.text}</span>
      </TableCell>
      <TableCell className="text-right text-xs">{formatCurrency(keyword.spend)}</TableCell>
      <TableCell className="text-right text-xs">{formatNumber(keyword.conversions)}</TableCell>
      <TableCell className="text-right text-xs">{keyword.cpl > 0 ? formatCurrency(keyword.cpl) : '-'}</TableCell>
      <CrmCells funnel={undefined} size="sm" />
    </TableRow>
  );
}

// ─── Google AdGroup Row (level 2) ─────────────────────────────

function GoogleAdGroupRow({ 
  adGroup, startDate, endDate, adSetFunnel 
}: { 
  adGroup: AdSetData; startDate: Date; endDate: Date; adSetFunnel?: CampaignFunnel 
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const { data: keywords, isLoading, error } = useGoogleKeywords(
    { adGroupId: isExpanded ? adGroup.id : null },
    startDate, endDate, isExpanded
  );

  return (
    <>
      <TableRow className="bg-muted/30 cursor-pointer hover:bg-muted/40" onClick={() => setIsExpanded(!isExpanded)}>
        <TableCell className="p-2">
          {isLoading ? (
            <Loader2 className="h-3 w-3 animate-spin ml-2" />
          ) : (
            <ChevronRight className={`h-3 w-3 ml-2 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          )}
        </TableCell>
        <TableCell className="w-14 p-2"></TableCell>
        <TableCell className="pl-6 font-normal text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>├─ {adGroup.name}</span>
            {adGroup.previewUrl && (
              <a href={adGroup.previewUrl} target="_blank" rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()} className="text-primary hover:text-primary/80" title="Abrir no Google Ads">
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </TableCell>
        <TableCell className="text-right text-sm">{formatCurrency(adGroup.spend)}</TableCell>
        <TableCell className="text-right text-sm">{formatNumber(adGroup.leads)}</TableCell>
        <TableCell className="text-right text-sm">{adGroup.cpl > 0 ? formatCurrency(adGroup.cpl) : '-'}</TableCell>
        <CrmCells funnel={adSetFunnel} spend={adGroup.spend} size="sm" />
      </TableRow>

      {isExpanded && isLoading && (
        <TableRow className="bg-muted/15">
          <TableCell colSpan={13} className="text-center py-3 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
            Carregando palavras-chave...
          </TableCell>
        </TableRow>
      )}

      {isExpanded && error && (
        <TableRow className="bg-muted/15">
          <TableCell colSpan={13} className="text-center py-3 text-sm text-destructive">
            Erro ao carregar palavras-chave: {(error as Error).message}
          </TableCell>
        </TableRow>
      )}

      {isExpanded && !isLoading && keywords && keywords.length === 0 && !error && (
        <TableRow className="bg-muted/15">
          <TableCell colSpan={13} className="text-center py-3 text-muted-foreground text-xs">
            Nenhuma palavra-chave encontrada
          </TableCell>
        </TableRow>
      )}

      {isExpanded && keywords?.filter(k => k.spend > 0).map((kw, idx) => (
        <GoogleKeywordRow key={`${kw.text}-${kw.matchType}-${idx}`} keyword={kw} />
      ))}
    </>
  );
}

// ─── Meta Ad Row (level 3) ────────────────────────────────────

function AdRow({ ad, onPreview, adFunnel }: { ad: AdData; onPreview: (data: PreviewModalData) => void; adFunnel?: CampaignFunnel }) {
  return (
    <TableRow className="bg-muted/15">
      <TableCell className="p-2"></TableCell>
      <TableCell className="w-14 p-2">
        <Thumbnail
          url={ad.thumbnailUrl}
          name={ad.name}
          size="sm"
          onClick={() => ad.thumbnailUrl && onPreview({
            name: ad.name, thumbnailUrl: ad.thumbnailUrl, previewUrl: ad.previewUrl,
            spend: ad.spend, impressions: ad.impressions, clicks: ad.clicks, leads: ad.leads, cpl: ad.cpl, ctr: ad.ctr,
          })}
        />
      </TableCell>
      <TableCell className="pl-10 font-normal text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>│  ├─ {ad.name}</span>
          {ad.previewUrl && (
            <a href={ad.previewUrl} target="_blank" rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()} className="text-primary hover:text-primary/80" title="Abrir no Ads Manager">
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </TableCell>
      <TableCell className="text-right text-xs">{formatCurrency(ad.spend)}</TableCell>
      <TableCell className="text-right text-xs">{formatNumber(ad.leads)}</TableCell>
      <TableCell className="text-right text-xs">{ad.cpl > 0 ? formatCurrency(ad.cpl) : '-'}</TableCell>
      <CrmCells funnel={adFunnel} spend={ad.spend} size="sm" />
    </TableRow>
  );
}

// ─── Meta AdSet Row (level 2) ─────────────────────────────────

function AdSetRow({ 
  adSet, startDate, endDate, onPreview, adSetFunnel, adCreativeFunnels, campaignName, campaignId, channelName
}: { 
  adSet: AdSetData; startDate: Date; endDate: Date; onPreview: (data: PreviewModalData) => void; adSetFunnel?: CampaignFunnel;
  adCreativeFunnels?: Map<string, CampaignFunnel>; campaignName: string; campaignId?: string; channelName: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const { data: ads, isLoading, error } = useAdSetAds(
    isExpanded ? adSet.id : null, startDate, endDate, isExpanded
  );

  return (
    <>
      <TableRow className="bg-muted/30 cursor-pointer hover:bg-muted/40" onClick={() => setIsExpanded(!isExpanded)}>
        <TableCell className="p-2">
          {isLoading ? (
            <Loader2 className="h-3 w-3 animate-spin ml-2" />
          ) : (
            <ChevronRight className={`h-3 w-3 ml-2 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          )}
        </TableCell>
        <TableCell className="w-14 p-2"></TableCell>
        <TableCell className="pl-6 font-normal text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>├─ {adSet.name}</span>
            {adSet.previewUrl && (
              <a href={adSet.previewUrl} target="_blank" rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()} className="text-primary hover:text-primary/80" title="Abrir no Ads Manager">
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </TableCell>
        <TableCell className="text-right text-sm">{formatCurrency(adSet.spend)}</TableCell>
        <TableCell className="text-right text-sm">{formatNumber(adSet.leads)}</TableCell>
        <TableCell className="text-right text-sm">{adSet.cpl > 0 ? formatCurrency(adSet.cpl) : '-'}</TableCell>
        <CrmCells funnel={adSetFunnel} spend={adSet.spend} size="sm" />
      </TableRow>

      {isExpanded && isLoading && (
        <TableRow className="bg-muted/15">
          <TableCell colSpan={13} className="text-center py-3 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
            Carregando anúncios...
          </TableCell>
        </TableRow>
      )}

      {isExpanded && error && (
        <TableRow className="bg-muted/15">
          <TableCell colSpan={13} className="text-center py-3 text-sm text-destructive">
            {(error as Error).message === 'RATE_LIMIT'
              ? '⏳ Limite de requisições atingido. Aguarde e tente novamente.'
              : `Erro ao carregar anúncios: ${(error as Error).message}`}
          </TableCell>
        </TableRow>
      )}

      {isExpanded && !isLoading && ads && ads.length === 0 && !error && (
        <TableRow className="bg-muted/15">
          <TableCell colSpan={13} className="text-center py-3 text-muted-foreground text-xs">
            Nenhum anúncio encontrado
          </TableCell>
        </TableRow>
      )}

      {isExpanded && ads?.filter(a => a.spend > 0).map((ad) => {
        // Try direct CRM match first via adCreativeFunnels
        let adFunnel: CampaignFunnel | undefined;
        if (adCreativeFunnels && adCreativeFunnels.size > 0) {
          adFunnel = lookupAdCreativeFunnel(adCreativeFunnels, campaignName, adSet.name, ad.id, channelName, campaignId);
        }
        
        // Fallback: distribute ad set CRM data proportionally by spend
        if (!adFunnel && adSetFunnel && ads) {
          const filteredAds = ads.filter(a => a.spend > 0);
          const totalAdsSpend = filteredAds.reduce((s, a) => s + a.spend, 0);
          if (totalAdsSpend > 0) {
            const ratio = ad.spend / totalAdsSpend;
            adFunnel = {
              ...adSetFunnel,
              campaignName: `${adSetFunnel.campaignName} (${ad.name})`,
              leads: Math.round(adSetFunnel.leads * ratio),
              mqls: Math.round(adSetFunnel.mqls * ratio),
              rms: Math.round(adSetFunnel.rms * ratio),
              rrs: Math.round(adSetFunnel.rrs * ratio),
              propostas: Math.round(adSetFunnel.propostas * ratio),
              vendas: Math.round(adSetFunnel.vendas * ratio),
              receita: adSetFunnel.receita * ratio,
              tcv: adSetFunnel.tcv * ratio,
              investimento: ad.spend,
            };
          }
        }
        return <AdRow key={ad.id} ad={ad} onPreview={onPreview} adFunnel={adFunnel} />;
      })}
    </>
  );
}

// ─── Campaign Row (level 1) - supports both Meta and Google ───

function CampaignRow({
  campaign, isExpanded, onToggle, startDate, endDate, onPreview, funnel, adSetFunnels, adCreativeFunnels,
}: {
  campaign: CampaignData; isExpanded: boolean; onToggle: () => void;
  startDate: Date; endDate: Date; onPreview: (data: PreviewModalData) => void;
  funnel?: CampaignFunnel; adSetFunnels?: Map<string, CampaignFunnel>; adCreativeFunnels?: Map<string, CampaignFunnel>;
}) {
  const isGoogle = isGoogleCampaign(campaign);
  const googleRawId = isGoogle ? getGoogleRawId(campaign) : null;

  // Meta drill-down
  const { data: metaAdSets, isLoading: metaLoading, error: metaError } = useCampaignAdSets(
    isExpanded && !isGoogle ? campaign.id : null, startDate, endDate, isExpanded && !isGoogle
  );

  // Google drill-down
  const { data: googleAdGroups, isLoading: googleLoading, error: googleError } = useGoogleAdGroups(
    isExpanded && isGoogle ? googleRawId : null, startDate, endDate, isExpanded && isGoogle
  );

  const adSets = isGoogle ? googleAdGroups : metaAdSets;
  const isLoading = isGoogle ? googleLoading : metaLoading;
  const drillError = isGoogle ? googleError : metaError;
  const hasChildren = adSets && adSets.length > 0;

  // Proportional CRM fallback: distribute parent funnel across ad sets by spend
  const proportionalFunnels = useMemo(() => {
    if (!adSets || adSets.length === 0 || !funnel || (funnel.vendas === 0 && funnel.mqls === 0)) return null;
    // Check if any ad set already has a direct CRM match
    const anyMatch = adSets.some(a => lookupAdSetFunnel(adSetFunnels, campaign.name, a.name, campaign.channel, campaign.id, a.id));
    if (anyMatch) return null; // use direct matches instead
    
    const filteredAdSets = adSets.filter(a => a.spend > 0);
    const totalSpend = filteredAdSets.reduce((s, a) => s + a.spend, 0);
    if (totalSpend === 0) return null;
    
    const map = new Map<string, CampaignFunnel>();
    for (const a of filteredAdSets) {
      const ratio = a.spend / totalSpend;
      map.set(a.id, {
        ...funnel,
        campaignName: `${funnel.campaignName} (${a.name})`,
        leads: Math.round(funnel.leads * ratio),
        mqls: Math.round(funnel.mqls * ratio),
        rms: Math.round(funnel.rms * ratio),
        rrs: Math.round(funnel.rrs * ratio),
        propostas: Math.round(funnel.propostas * ratio),
        vendas: Math.round(funnel.vendas * ratio),
        receita: funnel.receita * ratio,
        tcv: funnel.tcv * ratio,
        investimento: a.spend,
      });
    }
    return map;
  }, [adSets, funnel, adSetFunnels, campaign.name, campaign.channel]);

  // Resolve funnel for a sub-row: direct match first, then proportional fallback
  const getSubRowFunnel = (item: AdSetData): CampaignFunnel | undefined => {
    const direct = lookupAdSetFunnel(adSetFunnels, campaign.name, item.name, campaign.channel, campaign.id, item.id);
    if (direct) return direct;
    return proportionalFunnels?.get(item.id);
  };

  return (
    <>
      <TableRow className="cursor-pointer hover:bg-muted/50" onClick={onToggle}>
        <TableCell className="p-2">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          )}
        </TableCell>
        <TableCell className="w-14 p-2"></TableCell>
        <TableCell className="font-medium">
          <div className="flex items-center gap-2">
            {getSourceBadge(campaign.channel)}
            <span>{campaign.name}</span>
            {campaign.previewUrl && (
              <a href={campaign.previewUrl} target="_blank" rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()} className="text-primary hover:text-primary/80"
                title={isGoogle ? "Abrir no Google Ads" : "Abrir no Meta Ads Manager"}>
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </TableCell>
        <TableCell className="text-right">{formatCurrency(campaign.investment)}</TableCell>
        <TableCell className="text-right">{formatNumber(campaign.leads)}</TableCell>
        <TableCell className="text-right">
          {campaign.cpl && campaign.cpl > 0 ? formatCurrency(campaign.cpl) : '-'}
        </TableCell>
        <CrmCells funnel={funnel} spend={campaign.investment} size="md" />
      </TableRow>

      {isExpanded && isLoading && (
        <TableRow className="bg-muted/30">
          <TableCell colSpan={13} className="text-center py-4 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
            {isGoogle ? 'Carregando grupos de anúncio...' : 'Carregando conjuntos de anúncios...'}
          </TableCell>
        </TableRow>
      )}

      {isExpanded && !isLoading && !hasChildren && !drillError && (
        <TableRow className="bg-muted/30">
          <TableCell colSpan={13} className="text-center py-4 text-muted-foreground text-sm">
            {isGoogle ? 'Nenhum grupo de anúncio encontrado' : 'Nenhum conjunto de anúncio encontrado'}
          </TableCell>
        </TableRow>
      )}

      {isExpanded && drillError && (
        <TableRow className="bg-muted/30">
          <TableCell colSpan={13} className="text-center py-4 text-sm text-destructive">
            {(drillError as Error).message === 'RATE_LIMIT'
              ? '⏳ Limite de requisições atingido. Aguarde alguns segundos e tente novamente.'
              : `Erro ao carregar: ${(drillError as Error).message}`}
          </TableCell>
        </TableRow>
      )}

      {isExpanded && hasChildren && adSets!.filter(a => a.spend > 0).map((item) => (
        isGoogle ? (
          <GoogleAdGroupRow key={item.id} adGroup={item} startDate={startDate} endDate={endDate} adSetFunnel={getSubRowFunnel(item)} />
        ) : (
          <AdSetRow key={item.id} adSet={item} startDate={startDate} endDate={endDate} onPreview={onPreview} adSetFunnel={getSubRowFunnel(item)} adCreativeFunnels={adCreativeFunnels} campaignName={campaign.name} campaignId={campaign.id} channelName={campaign.channel} />
        )
      ))}
    </>
  );
}

// ─── Preview Modal ────────────────────────────────────────────

function CreativePreviewModal({ 
  data, open, onClose 
}: { 
  data: PreviewModalData | null; open: boolean; onClose: () => void 
}) {
  if (!data) return null;
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-sm font-medium truncate">{data.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <img src={data.thumbnailUrl} alt={data.name} className="w-full rounded-lg object-contain max-h-[400px]" />
          <div className="grid grid-cols-3 gap-3 text-sm">
            {data.spend !== undefined && (
              <div><span className="text-muted-foreground">Gasto:</span> <span className="font-medium">{formatCurrency(data.spend)}</span></div>
            )}
            {data.impressions !== undefined && (
              <div><span className="text-muted-foreground">Impressões:</span> <span className="font-medium">{formatNumber(data.impressions)}</span></div>
            )}
            {data.clicks !== undefined && (
              <div><span className="text-muted-foreground">Cliques:</span> <span className="font-medium">{formatNumber(data.clicks)}</span></div>
            )}
            {data.leads !== undefined && (
              <div><span className="text-muted-foreground">Leads:</span> <span className="font-medium">{formatNumber(data.leads)}</span></div>
            )}
            {data.cpl !== undefined && data.cpl > 0 && (
              <div><span className="text-muted-foreground">CPL:</span> <span className="font-medium">{formatCurrency(data.cpl)}</span></div>
            )}
            {data.ctr !== undefined && data.ctr > 0 && (
              <div><span className="text-muted-foreground">CTR:</span> <span className="font-medium">{formatPercent(data.ctr)}</span></div>
            )}
          </div>
          {data.previewUrl && (
            <a href={data.previewUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80">
              <ExternalLink className="h-3 w-3" /> Abrir no Ads Manager
            </a>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────

export function CampaignsTable({ campaigns, campaignFunnels, adSetFunnels, adCreativeFunnels, isLoading, error, startDate, endDate }: CampaignsTableProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());
  const [previewData, setPreviewData] = useState<PreviewModalData | null>(null);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(false);

  const toggleCampaign = (campaignId: string) => {
    setExpandedCampaigns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(campaignId)) newSet.delete(campaignId);
      else newSet.add(campaignId);
      return newSet;
    });
  };

  const handleSort = (key: string) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  // Build lookup: campaign ID -> funnel, plus normalized name fallback
  const funnelMap = useMemo(() => {
    const map = new Map<string, CampaignFunnel>();
    if (campaignFunnels) {
      for (const f of campaignFunnels) {
        if (f.campaignId) map.set(f.campaignId, f);
        const normName = f.campaignName
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[_-]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        if (!map.has(normName)) map.set(normName, f);
      }
    }
    return map;
  }, [campaignFunnels]);

  // Helper to find funnel for a campaign, with Google _googleId fallback
  const getFunnel = (campaign: CampaignData): CampaignFunnel | undefined => {
    const byId = funnelMap.get(campaign.id);
    if (byId) return byId;
    const googleId = (campaign as any)._googleId;
    if (googleId) {
      const byRawId = funnelMap.get(googleId);
      if (byRawId) return byRawId;
    }
    const normName = campaign.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim();
    const exactMatch = funnelMap.get(normName);
    if (exactMatch) return exactMatch;
    if (campaignFunnels) {
      for (const f of campaignFunnels) {
        const normFunnel = f.campaignName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim();
        if (normFunnel.includes(normName) || normName.includes(normFunnel)) {
          return f;
        }
      }
    }
    return undefined;
  };

  // Compute matched funnel keys + orphan funnels
  const { matchedFunnelKeys, unmatchedFunnels } = useMemo(() => {
    const activeCampaigns = campaigns.filter(c => c.investment > 0);
    const matched = new Set<string>();
    
    for (const c of activeCampaigns) {
      const f = getFunnel(c);
      if (f) {
        if (f.campaignId) matched.add(f.campaignId);
        const normName = f.campaignName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim();
        matched.add(normName);
      }
    }
    
    const unmatched = (campaignFunnels || []).filter(f => {
      if (f.campaignId && matched.has(f.campaignId)) return false;
      const normName = f.campaignName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim();
      if (matched.has(normName)) return false;
      return f.leads > 0 || f.vendas > 0;
    });
    
    return { matchedFunnelKeys: matched, unmatchedFunnels: unmatched };
  }, [campaigns, campaignFunnels, funnelMap]);

  // Build unified sortable rows
  type UnifiedRow = { type: 'api'; campaign: CampaignData; funnel?: CampaignFunnel } | { type: 'crm'; funnel: CampaignFunnel; idx: number };
  
  const sortedRows = useMemo<UnifiedRow[]>(() => {
    const apiRows: UnifiedRow[] = campaigns.filter(c => c.investment > 0).map(c => ({ type: 'api' as const, campaign: c, funnel: getFunnel(c) }));
    const crmRows: UnifiedRow[] = unmatchedFunnels.map((f, i) => ({ type: 'crm' as const, funnel: f, idx: i }));
    const all = [...apiRows, ...crmRows];
    
    if (!sortKey) return all;
    
    const getValue = (row: UnifiedRow): number => {
      const camp = row.type === 'api' ? row.campaign : null;
      const funnel = row.type === 'api' ? row.funnel : row.funnel;
      const spend = camp?.investment || 0;
      
      switch (sortKey) {
        case 'spend': return spend;
        case 'leads': return camp?.leads || 0;
        case 'cpl': return camp?.cpl || 0;
        case 'mqls': return funnel?.mqls || 0;
        case 'cpmql': return (funnel?.mqls && spend > 0) ? spend / funnel.mqls : 0;
        case 'rms': return funnel?.rms || 0;
        case 'rrs': return funnel?.rrs || 0;
        case 'propostas': return funnel?.propostas || 0;
        case 'vendas': return funnel?.vendas || 0;
        case 'roas': return (funnel && spend > 0) ? funnel.receita / spend : (funnel?.receita || 0);
        default: return 0;
      }
    };
    
    return all.sort((a, b) => {
      const av = getValue(a);
      const bv = getValue(b);
      return sortAsc ? av - bv : bv - av;
    });
  }, [campaigns, unmatchedFunnels, sortKey, sortAsc, funnelMap]);

  const hasData = campaigns.length > 0 || unmatchedFunnels.length > 0;

  const getChannelBadge = (channel: ChannelId) => {
    const colors: Record<ChannelId, string> = {
      meta_ads: 'border-indigo-500 text-indigo-600',
      google_ads: 'border-blue-500 text-blue-600',
      eventos: 'border-amber-500 text-amber-600',
      organico: 'border-emerald-500 text-emerald-600',
      outros: 'border-muted-foreground text-muted-foreground',
    };
    return <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${colors[channel]}`}>{CHANNEL_LABELS[channel]}</Badge>;
  };

  return (
    <>
      <CreativePreviewModal data={previewData} open={!!previewData} onClose={() => setPreviewData(null)} />
      
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card>
          <CardHeader className="pb-2">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full flex items-center justify-between p-0 h-auto hover:bg-transparent">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base font-medium">Campanhas e Anúncios</CardTitle>
                  {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  {hasData && <Badge variant="outline" className="text-xs">{campaigns.length + unmatchedFunnels.length} campanhas</Badge>}
                </div>
                {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </Button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              {isLoading ? (
                <div className="h-[120px] flex items-center justify-center text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  Carregando campanhas...
                </div>
              ) : error ? (
                <div className="h-[120px] flex flex-col items-center justify-center text-muted-foreground gap-2">
                  <AlertCircle className="h-6 w-6 text-destructive" />
                  <span className="text-sm">Erro ao carregar campanhas</span>
                  <span className="text-xs text-destructive">{error.message}</span>
                </div>
              ) : !hasData ? (
                <div className="h-[120px] flex items-center justify-center text-muted-foreground">
                  Nenhuma campanha ativa encontrada
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8"></TableHead>
                        <TableHead className="w-14">Preview</TableHead>
                        <TableHead>Nome</TableHead>
                        {[
                          { label: 'Gasto', key: 'spend' },
                          { label: 'Leads', key: 'leads' },
                          { label: 'CPL', key: 'cpl' },
                        ].map(col => (
                          <TableHead key={col.key} className="text-right cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort(col.key)}>
                            <span className="flex items-center justify-end gap-1">
                              {col.label}
                              <ArrowUpDown className={cn("h-3 w-3", sortKey === col.key ? "text-foreground" : "text-muted-foreground")} />
                            </span>
                          </TableHead>
                        ))}
                        {[
                          { label: 'MQL', key: 'mqls' },
                          { label: 'CPMQL', key: 'cpmql' },
                          { label: 'RM', key: 'rms' },
                          { label: 'RR', key: 'rrs' },
                          { label: 'PE', key: 'propostas' },
                          { label: 'Venda', key: 'vendas' },
                          { label: 'ROAS', key: 'roas' },
                        ].map((col, i) => (
                          <TableHead key={col.key} className={cn("text-right cursor-pointer select-none whitespace-nowrap", i === 0 && "border-l")} onClick={() => handleSort(col.key)}>
                            <span className="flex items-center justify-end gap-1">
                              {col.label}
                              <ArrowUpDown className={cn("h-3 w-3", sortKey === col.key ? "text-foreground" : "text-muted-foreground")} />
                            </span>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedRows.map((row, rowIdx) => {
                        if (row.type === 'api') {
                          return (
                            <CampaignRow
                              key={row.campaign.id}
                              campaign={row.campaign}
                              isExpanded={expandedCampaigns.has(row.campaign.id)}
                              onToggle={() => toggleCampaign(row.campaign.id)}
                              startDate={startDate}
                              endDate={endDate}
                              onPreview={setPreviewData}
                              funnel={row.funnel}
                              adSetFunnels={adSetFunnels}
                              adCreativeFunnels={adCreativeFunnels}
                            />
                          );
                        }
                        const funnel = row.funnel;
                        // If CRM-only row has a campaignId, render as expandable CampaignRow
                        if (funnel.campaignId && (funnel.channel === 'meta_ads' || funnel.channel === 'google_ads')) {
                          const channelLabel = funnel.channel === 'meta_ads' ? 'Meta Ads' : 'Google Ads';
                          const stubCampaign: CampaignData = {
                            id: funnel.campaignId,
                            name: funnel.campaignName,
                            channel: channelLabel,
                            status: 'ended',
                            investment: 0,
                            leads: 0,
                            mqls: 0,
                            roas: 0,
                            startDate: startDate.toISOString().split('T')[0],
                          };
                          return (
                            <CampaignRow
                              key={`crm-${funnel.campaignId}-${row.idx}`}
                              campaign={stubCampaign}
                              isExpanded={expandedCampaigns.has(funnel.campaignId)}
                              onToggle={() => toggleCampaign(funnel.campaignId!)}
                              startDate={startDate}
                              endDate={endDate}
                              onPreview={setPreviewData}
                              funnel={funnel}
                              adSetFunnels={adSetFunnels}
                              adCreativeFunnels={adCreativeFunnels}
                            />
                          );
                        }
                        return (
                          <TableRow key={`crm-${funnel.campaignName}-${row.idx}`} className="hover:bg-muted/50">
                            <TableCell className="p-2"></TableCell>
                            <TableCell className="w-14 p-2">
                              <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                                <Image className="h-4 w-4 text-muted-foreground" />
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {getChannelBadge(funnel.channel)}
                                <span>{funnel.campaignName}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">-</TableCell>
                            <TableCell className="text-right text-muted-foreground">-</TableCell>
                            <TableCell className="text-right text-muted-foreground">-</TableCell>
                            <CrmCells funnel={funnel} spend={0} size="md" />
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>

                  <div className="mt-4 pt-4 border-t flex justify-between text-sm">
                    <span className="text-muted-foreground">Total: {campaigns.filter(c => c.investment > 0).length + unmatchedFunnels.length} campanhas</span>
                    <div className="flex gap-6">
                      <span>
                        <span className="text-muted-foreground">Gasto: </span>
                        <span className="font-medium">{formatCurrency(campaigns.filter(c => c.investment > 0).reduce((sum, c) => sum + c.investment, 0))}</span>
                      </span>
                      <span>
                        <span className="text-muted-foreground">Leads: </span>
                        <span className="font-medium">{formatNumber(campaigns.filter(c => c.investment > 0).reduce((sum, c) => sum + c.leads, 0))}</span>
                      </span>
                      {campaignFunnels && campaignFunnels.length > 0 && (
                        <>
                          <span>
                            <span className="text-muted-foreground">Vendas: </span>
                            <span className="font-medium">{campaignFunnels.reduce((s, f) => s + f.vendas, 0)}</span>
                          </span>
                          <span>
                            <span className="text-muted-foreground">ROAS: </span>
                            <span className="font-medium">
                              {(() => {
                                const totalInv = campaigns.filter(c => c.investment > 0).reduce((s, c) => s + c.investment, 0);
                                const totalRec = campaignFunnels.reduce((s, f) => s + f.receita, 0);
                                return totalInv > 0 ? `${(totalRec / totalInv).toFixed(1)}x` : '-';
                              })()}
                            </span>
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </>
  );
}
