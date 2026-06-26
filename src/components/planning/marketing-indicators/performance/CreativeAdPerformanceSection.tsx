import { useMemo, useState } from "react";
import {
  AreaChart, Area, ScatterChart, Scatter, XAxis, YAxis, ZAxis,
  Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval,
  startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  format, isWithinInterval,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Image as ImageIcon, MousePointerClick, TrendingUp, Wallet, Target, Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { AttributionCard, CampaignData, CampaignFunnel } from "../types";

type Granularity = "day" | "week" | "month";
type MetricKey = "vendas" | "investimento" | "ctr" | "cpv" | "cliques" | "impressoes";

interface Props {
  dateRange: { from: Date; to: Date };
  salesCards: AttributionCard[];
  campaignFunnels: CampaignFunnel[];
  allCampaigns: CampaignData[];
}

const METRIC_OPTIONS: { key: MetricKey; label: string }[] = [
  { key: "vendas",       label: "Vendas" },
  { key: "investimento", label: "Investimento" },
  { key: "ctr",          label: "CTR" },
  { key: "cpv",          label: "CPV" },
  { key: "cliques",      label: "Cliques" },
  { key: "impressoes",   label: "Impressões" },
];

const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const formatBRLk = (n: number) => {
  if (Math.abs(n) >= 1_000_000) return "R$ " + (n / 1_000_000).toFixed(1) + "M";
  if (Math.abs(n) >= 1000) return "R$ " + (n / 1000).toFixed(1) + "k";
  return formatBRL(n);
};
const formatNum = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
const formatPct = (n: number) => n.toFixed(2) + "%";

const ACCENT = "hsl(0 84% 60%)";          // tomato red
const ACCENT_SOFT = "hsl(0 84% 60% / 0.18)";

export function CreativeAdPerformanceSection({
  dateRange, salesCards, campaignFunnels, allCampaigns,
}: Props) {
  const [granularity, setGranularity] = useState<Granularity>("day");
  const [metric, setMetric] = useState<MetricKey>("vendas");

  // ===== KPI totals (period) — from API campaigns
  const kpis = useMemo(() => {
    let invest = 0, impressions = 0, clicks = 0, reach = 0;
    for (const c of allCampaigns) {
      invest += c.investment || 0;
      impressions += c.impressions || 0;
      clicks += c.clicks || 0;
      reach += c.reach || 0;
    }
    const vendas = salesCards.length;
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const cpv = vendas > 0 ? invest / vendas : 0;
    return { invest, impressions, clicks, reach, vendas, ctr, cpv };
  }, [allCampaigns, salesCards]);

  // ===== Buckets =====
  const buckets = useMemo(() => {
    const from = startOfDay(dateRange.from);
    const to = endOfDay(dateRange.to);
    if (granularity === "day") {
      return eachDayOfInterval({ start: from, end: to }).map(d => ({
        key: format(d, "yyyy-MM-dd"),
        label: format(d, "dd 'de' MMM", { locale: ptBR }),
        start: startOfDay(d), end: endOfDay(d),
      }));
    }
    if (granularity === "week") {
      return eachWeekOfInterval({ start: from, end: to }, { locale: ptBR }).map(d => ({
        key: format(d, "yyyy-'W'II"),
        label: format(startOfWeek(d, { locale: ptBR }), "dd/MM", { locale: ptBR }),
        start: startOfWeek(d, { locale: ptBR }),
        end: endOfWeek(d, { locale: ptBR }),
      }));
    }
    return eachMonthOfInterval({ start: from, end: to }).map(d => ({
      key: format(d, "yyyy-MM"),
      label: format(d, "MMM/yy", { locale: ptBR }),
      start: startOfMonth(d), end: endOfMonth(d),
    }));
  }, [dateRange, granularity]);

  // ===== Sales per bucket (counts) =====
  const seriesData = useMemo(() => {
    const salesByBucket = new Map<string, number>();
    buckets.forEach(b => salesByBucket.set(b.key, 0));
    for (const c of salesCards) {
      const date = c.dataAssinatura ?? c.dataEntrada;
      if (!date) continue;
      const b = buckets.find(x => isWithinInterval(date, { start: x.start, end: x.end }));
      if (b) salesByBucket.set(b.key, (salesByBucket.get(b.key) || 0) + 1);
    }

    // For non-vendas metrics, distribute period totals uniformly across buckets
    // (granular daily breakdown not available from current APIs).
    const n = buckets.length || 1;
    const perBucketInvest = kpis.invest / n;
    const perBucketClicks = kpis.clicks / n;
    const perBucketImpr = kpis.impressions / n;

    return buckets.map(b => {
      const vendas = salesByBucket.get(b.key) || 0;
      let value = 0;
      switch (metric) {
        case "vendas":       value = vendas; break;
        case "investimento": value = perBucketInvest; break;
        case "cliques":      value = perBucketClicks; break;
        case "impressoes":   value = perBucketImpr; break;
        case "ctr":          value = perBucketImpr > 0 ? (perBucketClicks / perBucketImpr) * 100 : 0; break;
        case "cpv":          value = vendas > 0 ? perBucketInvest / vendas : 0; break;
      }
      return { label: b.label, value };
    });
  }, [buckets, salesCards, metric, kpis]);

  // ===== Per-campaign join (funnels + API) =====
  const campaignRows = useMemo(() => {
    const apiById = new Map<string, CampaignData>();
    const apiByNameNorm = new Map<string, CampaignData>();
    const normalize = (s: string) =>
      (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    for (const c of allCampaigns) {
      apiById.set(c.id, c);
      apiByNameNorm.set(normalize(c.name), c);
    }

    const rows = campaignFunnels
      .filter(f => f.channel === "meta_ads" || f.channel === "google_ads")
      .map(f => {
        const api =
          (f.campaignId && apiById.get(f.campaignId)) ||
          apiByNameNorm.get(normalize(f.campaignName));
        const investimento = f.investimento || api?.investment || 0;
        const impressions = api?.impressions || 0;
        const clicks = api?.clicks || 0;
        const ctr = impressions > 0 ? (clicks / impressions) * 100 : (api?.ctr || 0);
        const vendas = f.vendas || 0;
        const cpv = vendas > 0 ? investimento / vendas : 0;
        return {
          id: f.campaignId || f.campaignName,
          name: f.campaignName,
          channel: f.channel,
          thumbnailUrl: api?.thumbnailUrl,
          investimento, impressions, clicks, ctr, vendas, cpv,
        };
      })
      .filter(r => r.vendas > 0 || r.investimento > 0);
    rows.sort((a, b) => b.vendas - a.vendas || b.investimento - a.investimento);
    return rows;
  }, [campaignFunnels, allCampaigns]);

  // ===== Scatter data (only points with both CTR and CPV) =====
  const scatterData = useMemo(() => {
    return campaignRows
      .filter(r => r.ctr > 0 && r.cpv > 0)
      .map(r => ({ x: r.ctr, y: r.cpv, name: r.name }));
  }, [campaignRows]);

  const isMoneyMetric = metric === "investimento" || metric === "cpv";
  const isPctMetric = metric === "ctr";
  const yFormatter = (v: number) => {
    if (isPctMetric) return formatPct(v);
    if (isMoneyMetric) return formatBRLk(v);
    return formatNum(v);
  };
  const valueFormatter = (v: number) => {
    if (isPctMetric) return formatPct(v);
    if (isMoneyMetric) return formatBRL(v);
    return formatNum(v);
  };

  return (
    <Card className="border-border/40 bg-card/40 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl">Performance de Campanhas — Criativos</CardTitle>
        <p className="text-sm text-muted-foreground">
          Melhores campanhas por venda, correlação CPV × CTR e investimento detalhado por anúncio.
        </p>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* ===== KPI strip ===== */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { icon: Wallet, label: "Investimento", value: formatBRL(kpis.invest) },
            { icon: TrendingUp, label: "CTR", value: formatPct(kpis.ctr) },
            { icon: Target, label: "Vendas", value: formatNum(kpis.vendas) },
            { icon: Wallet, label: "CPV", value: formatBRL(kpis.cpv) },
            { icon: Users, label: "Alcance", value: formatNum(kpis.reach) },
          ].map((k, i) => (
            <Card key={i} className="p-3 border-border/50">
              <div className="flex items-center gap-2 mb-1">
                <k.icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{k.label}</span>
              </div>
              <div className="text-2xl font-bold tabular-nums">{k.value}</div>
            </Card>
          ))}
        </div>

        {/* ===== Grid: left (chart + scatter) | right (table) ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* LEFT COLUMN */}
          <div className="space-y-4">
            {/* Time-series card */}
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle className="text-base">{METRIC_OPTIONS.find(o => o.key === metric)?.label} por Data</CardTitle>
                  <div className="flex items-center gap-2">
                    <Select value={metric} onValueChange={(v) => setMetric(v as MetricKey)}>
                      <SelectTrigger className="h-8 w-[140px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {METRIC_OPTIONS.map(o => (
                          <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={granularity} onValueChange={(v) => setGranularity(v as Granularity)}>
                      <SelectTrigger className="h-8 w-[110px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="day">Dia</SelectItem>
                        <SelectItem value="week">Semana</SelectItem>
                        <SelectItem value="month">Mês</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={230}>
                  <AreaChart data={seriesData} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="creativeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={ACCENT} stopOpacity={0.5} />
                        <stop offset="100%" stopColor={ACCENT} stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={yFormatter} width={55} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 6, fontSize: 12,
                      }}
                      formatter={(v: number) => [valueFormatter(v), METRIC_OPTIONS.find(o => o.key === metric)?.label]}
                    />
                    <Area type="monotone" dataKey="value" stroke={ACCENT} strokeWidth={2} fill="url(#creativeGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
                {metric !== "vendas" && (
                  <p className="text-[10px] text-muted-foreground mt-2 italic">
                    * Métricas de mídia distribuídas uniformemente entre os buckets do período (granularidade diária não disponível na API).
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Scatter card */}
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Correlação CPV × CTR por campanha</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Quadrante ideal: alto CTR (eixo X) + baixo CPV (eixo Y).
                </p>
              </CardHeader>
              <CardContent>
                {scatterData.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Sem dados suficientes para correlação (precisa de CTR e CPV &gt; 0).
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <ScatterChart margin={{ top: 8, right: 8, left: -10, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis
                        type="number"
                        dataKey="x"
                        name="CTR"
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        tickFormatter={(v: number) => v.toFixed(1) + "%"}
                        label={{ value: "CTR", position: "insideBottom", offset: -2, fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      />
                      <YAxis
                        type="number"
                        dataKey="y"
                        name="CPV"
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        tickFormatter={formatBRLk}
                        width={60}
                        label={{ value: "CPV", angle: -90, position: "insideLeft", offset: 12, fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      />
                      <ZAxis range={[40, 120]} />
                      <Tooltip
                        cursor={{ strokeDasharray: "3 3" }}
                        contentStyle={{
                          background: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 6, fontSize: 12,
                        }}
                        formatter={(value: number, name: string) => {
                          if (name === "CTR") return [formatPct(value), "CTR"];
                          if (name === "CPV") return [formatBRL(value), "CPV"];
                          return [value, name];
                        }}
                        labelFormatter={() => ""}
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0].payload as { x: number; y: number; name: string };
                          return (
                            <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
                              <div className="font-medium mb-1 max-w-[220px] truncate">{d.name}</div>
                              <div>CTR: <span className="tabular-nums">{formatPct(d.x)}</span></div>
                              <div>CPV: <span className="tabular-nums">{formatBRL(d.y)}</span></div>
                            </div>
                          );
                        }}
                      />
                      <Scatter data={scatterData} fill={ACCENT} fillOpacity={0.7} />
                    </ScatterChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN — Ranking table */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Melhores anúncios por venda</CardTitle>
              <p className="text-xs text-muted-foreground">Ordenado por número de vendas atribuídas no período.</p>
            </CardHeader>
            <CardContent className="px-0">
              {campaignRows.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma campanha com vendas ou investimento no período.
                </p>
              ) : (
                <div className="overflow-auto max-h-[520px]">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow>
                        <TableHead className="w-14">Img</TableHead>
                        <TableHead>Anúncio / Campanha</TableHead>
                        <TableHead className="text-right">Invest.</TableHead>
                        <TableHead className="text-right">CTR</TableHead>
                        <TableHead className="text-right">Vendas</TableHead>
                        <TableHead className="text-right">CPV</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {campaignRows.slice(0, 50).map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>
                            {r.thumbnailUrl ? (
                              <img
                                src={r.thumbnailUrl}
                                alt={r.name}
                                className="h-9 w-9 rounded object-cover border border-border/50"
                                loading="lazy"
                              />
                            ) : (
                              <div className="h-9 w-9 rounded bg-muted flex items-center justify-center">
                                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-sm truncate max-w-[260px]" title={r.name}>{r.name}</span>
                              <span className="text-[10px] text-muted-foreground uppercase">
                                {r.channel === "meta_ads" ? "Meta Ads" : "Google Ads"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{r.investimento > 0 ? formatBRLk(r.investimento) : "—"}</TableCell>
                          <TableCell className={cn("text-right tabular-nums", r.ctr > 0.5 && "text-emerald-500 font-medium")}>
                            {r.ctr > 0 ? formatPct(r.ctr) : "—"}
                          </TableCell>
                          <TableCell className="text-right tabular-nums font-semibold">{r.vendas}</TableCell>
                          <TableCell className="text-right tabular-nums">{r.cpv > 0 ? formatBRLk(r.cpv) : "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}
