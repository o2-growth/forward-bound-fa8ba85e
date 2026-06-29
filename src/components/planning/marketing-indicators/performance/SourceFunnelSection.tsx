import { useMemo, useState } from "react";
import { Wallet, Target, Receipt, Eye, MousePointerClick, UserPlus, Users, Calendar, FileText, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AttributionCard, CampaignData } from "../types";
import { detectChannel } from "@/hooks/useMarketingAttribution";

type SourceKey = "all" | "meta_ads" | "google_ads" | "organico" | "eventos";

interface Props {
  dateRange: { from: Date; to: Date };
  allCampaigns: CampaignData[];
  allAttributionCards: AttributionCard[]; // all cards (any stage)
  salesCards: AttributionCard[];          // dedup'd sales (Contrato/Ganho)
  /**
   * Totais autoritativos (mesmos números do Indicador Comercial). Quando
   * presentes, sobrescrevem leads/mqls/rms/rrs/propostas no caso `all`,
   * garantindo paridade total entre as duas telas. Vendas continuam vindo
   * de `salesCards` para preservar a regra de dedup mensal.
   */
  pipefyTotals?: { leads: number; mqls: number; rms: number; rrs: number; propostas: number; vendas: number };
}

const SOURCE_OPTIONS: { value: SourceKey; label: string; color: string }[] = [
  { value: "all",        label: "Todas as fontes", color: "hsl(var(--primary))" },
  { value: "meta_ads",   label: "Meta Ads",         color: "hsl(217 91% 60%)" },
  { value: "google_ads", label: "Google Ads",       color: "hsl(142 71% 45%)" },
  { value: "organico",   label: "Orgânico / Direto", color: "hsl(38 92% 50%)" },
  { value: "eventos",    label: "Eventos",          color: "hsl(280 70% 60%)" },
];

const PHASE_FUNNEL_MAP: Record<string, string> = {
  "Novos Leads": "leads",
  "Start form": "leads",
  "MQLs": "mqls",
  "MQL": "mqls",
  "Tentativas de contato": "mqls",
  "Material ISCA": "mqls",
  "Reunião agendada / Qualificado": "rms",
  "Reunião Realizada": "rrs",
  "1° Reunião Realizada - Apresentação": "rrs",
  "1° Reunião Realizada": "rrs",
  "Proposta enviada / Follow Up": "propostas",
  "Enviar para assinatura": "propostas",
  "Contrato assinado": "vendas",
  "Ganho": "vendas",
};

const STAGE_ORDER = ["leads", "mqls", "rms", "rrs", "propostas", "vendas"] as const;

const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const formatBRLk = (n: number) => {
  if (Math.abs(n) >= 1_000_000) return "R$ " + (n / 1_000_000).toFixed(1) + "M";
  if (Math.abs(n) >= 1000) return "R$ " + (n / 1000).toFixed(1) + "k";
  return formatBRL(n);
};
const formatNum = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
const formatPct = (n: number) => (n * 100).toFixed(2) + "%";

export function SourceFunnelSection({
  dateRange, allCampaigns, allAttributionCards, salesCards, pipefyTotals,
}: Props) {
  const [source, setSource] = useState<SourceKey>("all");

  const { investment, impressions, clicks } = useMemo(() => {
    let inv = 0, imp = 0, clk = 0;
    for (const c of allCampaigns) {
      const isMeta = c.channel === "Meta Ads" || /meta|facebook|instagram/i.test(c.channel || "");
      const isGoogle = c.channel === "Google Ads" || /google/i.test(c.channel || "");
      if (source === "meta_ads" && !isMeta) continue;
      if (source === "google_ads" && !isGoogle) continue;
      if ((source === "organico" || source === "eventos") && (isMeta || isGoogle)) continue;
      inv += c.investment || 0;
      imp += c.impressions || 0;
      clk += c.clicks || 0;
    }
    return { investment: inv, impressions: imp, clicks: clk };
  }, [allCampaigns, source]);

  const funnelCounts = useMemo(() => {
    const counts: Record<string, Set<string>> = {
      leads: new Set(), mqls: new Set(), rms: new Set(),
      rrs: new Set(), propostas: new Set(), vendas: new Set(),
    };
    const FUNNEL_ORDER = ["leads", "mqls", "rms", "rrs", "propostas", "vendas"];

    for (const c of allAttributionCards) {
      const ch = detectChannel(c);
      if (source === "meta_ads"   && ch !== "meta_ads")   continue;
      if (source === "google_ads" && ch !== "google_ads") continue;
      if (source === "organico"   && ch !== "organico")   continue;
      if (source === "eventos"    && ch !== "eventos")    continue;

      const stage = PHASE_FUNNEL_MAP[c.fase];
      if (!stage) continue;
      const idx = FUNNEL_ORDER.indexOf(stage);
      for (let i = 0; i <= idx; i++) {
        counts[FUNNEL_ORDER[i]].add(String(c.id));
      }
    }

    // Override vendas with dedup'd salesCards (Contrato/Ganho)
    const vendasSet = new Set<string>();
    for (const c of salesCards) {
      const ch = detectChannel(c);
      if (source === "meta_ads"   && ch !== "meta_ads")   continue;
      if (source === "google_ads" && ch !== "google_ads") continue;
      if (source === "organico"   && ch !== "organico")   continue;
      if (source === "eventos"    && ch !== "eventos")    continue;
      vendasSet.add(String(c.id));
    }
    counts.vendas = vendasSet;

    return {
      leads: counts.leads.size,
      mqls: counts.mqls.size,
      rms: counts.rms.size,
      rrs: counts.rrs.size,
      propostas: counts.propostas.size,
      vendas: counts.vendas.size,
    };
  }, [allAttributionCards, salesCards, source]);

  const vendas = funnelCounts.vendas;
  const cpv = vendas > 0 ? investment / vendas : 0;

  // Build funnel rows (top→bottom)
  const rows = useMemo(() => {
    const r: { key: string; label: string; value: number; icon: any }[] = [];
    if (source === "all" || source === "meta_ads" || source === "google_ads") {
      r.push({ key: "impressoes", label: "Impressões", value: impressions, icon: Eye });
      r.push({ key: "cliques",    label: "Cliques",    value: clicks,      icon: MousePointerClick });
    }
    r.push({ key: "leads",     label: "Leads",     value: funnelCounts.leads,     icon: UserPlus });
    r.push({ key: "mqls",      label: "MQLs",      value: funnelCounts.mqls,      icon: Users });
    r.push({ key: "rms",       label: "Reuniões agendadas", value: funnelCounts.rms,  icon: Calendar });
    r.push({ key: "rrs",       label: "Reuniões realizadas", value: funnelCounts.rrs, icon: Calendar });
    r.push({ key: "propostas", label: "Propostas", value: funnelCounts.propostas, icon: FileText });
    r.push({ key: "vendas",    label: "Vendas",    value: funnelCounts.vendas,    icon: Trophy });
    return r;
  }, [source, impressions, clicks, funnelCounts]);

  const maxValue = Math.max(...rows.map(r => r.value), 1);
  const sourceColor = SOURCE_OPTIONS.find(s => s.value === source)?.color || "hsl(var(--primary))";

  return (
    <Card className="border-border/40 bg-card/40 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <CardTitle className="text-xl">Funil Comparativo por Fonte</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Etapas do funil, taxas de conversão entre estágios e custo por etapa para a fonte selecionada.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Fonte:</span>
            <Select value={source} onValueChange={(v) => setSource(v as SourceKey)}>
              <SelectTrigger className="h-9 w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SOURCE_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Top KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Card className="p-3 border-border/50">
            <div className="flex items-center gap-2 mb-1 text-muted-foreground text-xs">
              <Calendar className="h-4 w-4" /> Data
            </div>
            <div className="text-base font-semibold">
              {dateRange.from.toLocaleDateString("pt-BR")} → {dateRange.to.toLocaleDateString("pt-BR")}
            </div>
          </Card>
          <Card className="p-3 border-border/50">
            <div className="flex items-center gap-2 mb-1 text-muted-foreground text-xs">
              <Wallet className="h-4 w-4" /> Investimento
            </div>
            <div className="text-2xl font-bold tabular-nums">{formatBRL(investment)}</div>
          </Card>
          <Card className="p-3 border-border/50">
            <div className="flex items-center gap-2 mb-1 text-muted-foreground text-xs">
              <Target className="h-4 w-4" /> Vendas
            </div>
            <div className="text-2xl font-bold tabular-nums">{formatNum(vendas)}</div>
          </Card>
          <Card className="p-3 border-border/50">
            <div className="flex items-center gap-2 mb-1 text-muted-foreground text-xs">
              <Receipt className="h-4 w-4" /> CPV
            </div>
            <div className="text-2xl font-bold tabular-nums">{formatBRL(cpv)}</div>
          </Card>
        </div>

        {/* Funnel grid: [label] [bar] [conv%] [custo] */}
        <div className="rounded-lg border border-border/50 bg-card/30 p-4">
          <div className="grid grid-cols-12 gap-3 mb-3 text-xs font-medium text-muted-foreground">
            <div className="col-span-3">Etapa</div>
            <div className="col-span-5">Quantidade</div>
            <div className="col-span-2 text-center">Conv. %</div>
            <div className="col-span-2 text-right">Custo / etapa</div>
          </div>

          <div className="space-y-2">
            {rows.map((row, idx) => {
              const widthPct = (row.value / maxValue) * 100;
              const prev = idx > 0 ? rows[idx - 1].value : null;
              const conv = prev && prev > 0 ? row.value / prev : null;
              const cost = row.value > 0 ? investment / row.value : 0;
              const Icon = row.icon;

              return (
                <div key={row.key} className="grid grid-cols-12 gap-3 items-center">
                  {/* Label */}
                  <div className="col-span-3 flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{row.label}</span>
                  </div>

                  {/* Bar with value inside */}
                  <div className="col-span-5">
                    <div className="relative h-10 bg-muted/40 rounded-md overflow-hidden">
                      <div
                        className="h-full rounded-md flex items-center justify-end pr-3 transition-all duration-500"
                        style={{
                          width: `${Math.max(widthPct, 6)}%`,
                          background: `linear-gradient(90deg, ${sourceColor}cc, ${sourceColor})`,
                        }}
                      >
                        <span className="text-sm font-bold text-white tabular-nums drop-shadow">
                          {formatNum(row.value)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Conversion to next */}
                  <div className="col-span-2 text-center">
                    {conv !== null ? (
                      <Badge
                        variant="outline"
                        className={cn(
                          "font-mono text-xs",
                          conv >= 0.5 ? "border-emerald-500/40 text-emerald-500" :
                          conv >= 0.1 ? "border-border" :
                          "border-amber-500/40 text-amber-500"
                        )}
                      >
                        {formatPct(conv)}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>

                  {/* Cost per stage */}
                  <div className="col-span-2 text-right">
                    {investment > 0 && row.value > 0 ? (
                      <span className="text-sm font-medium tabular-nums">{formatBRLk(cost)}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-[10px] text-muted-foreground italic mt-4">
            Conv. % = etapa atual ÷ etapa anterior. Custo / etapa = Investimento ÷ Quantidade da etapa (CPM, CPC, CPL, CPMQL, CPRM, CPRR, CPP, CPV).
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
