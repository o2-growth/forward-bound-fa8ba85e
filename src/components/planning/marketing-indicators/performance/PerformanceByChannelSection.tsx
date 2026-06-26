import { useMemo, useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, Line, ComposedChart, LabelList,
} from "recharts";
import {
  eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval,
  startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  format, isWithinInterval, getDaysInMonth, differenceInCalendarDays,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Facebook, Search, Sparkles, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AttributionCard } from "../types";
import { detectChannel } from "@/hooks/useMarketingAttribution";
import { useInvestmentByMonthByChannel } from "@/hooks/useInvestmentByMonthByChannel";

type Granularity = "day" | "week" | "month";
type MetricKey =
  | "investimento" | "impressoes" | "cliques" | "vendas"
  | "cpv" | "cpc" | "faturamento" | "roas" | "roi";
type ValueMode = "qty" | "money";
type ChannelKey = "meta" | "google" | "outros";

interface Props {
  dateRange: { from: Date; to: Date };
  salesCards: AttributionCard[]; // attributed sales with dataAssinatura
}

const CHANNEL_META = {
  meta:    { label: "Meta Ads",   color: "hsl(217 91% 60%)",  Icon: Facebook },
  google:  { label: "Google Ads", color: "hsl(142 71% 45%)",  Icon: Search },
  outros:  { label: "Outros",     color: "hsl(38 92% 50%)",   Icon: Sparkles },
} as const;

const METRIC_TABS: { key: MetricKey; label: string }[] = [
  { key: "investimento", label: "Investimento" },
  { key: "impressoes",   label: "Impressões" },
  { key: "cliques",      label: "Cliques" },
  { key: "vendas",       label: "Vendas" },
  { key: "cpv",          label: "CPV" },
  { key: "cpc",          label: "CPC" },
  { key: "faturamento",  label: "Faturamento" },
  { key: "roas",         label: "ROAS" },
  { key: "roi",          label: "ROI" },
];

const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const formatNum = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
const formatBRLk = (n: number) => {
  if (Math.abs(n) >= 1000) return "R$ " + (n / 1000).toFixed(1) + "k";
  return formatBRL(n);
};
const formatPct = (n: number) => (n * 100).toFixed(0) + "%";

function getChannelOfCard(c: AttributionCard): ChannelKey {
  const ch = detectChannel(c);
  if (ch === "meta_ads") return "meta";
  if (ch === "google_ads") return "google";
  return "outros";
}

function salesRevenue(c: AttributionCard): number {
  return (c.valorMRR || 0) + (c.valorSetup || 0) + (c.valorPontual || 0);
}

export function PerformanceByChannelSection({ dateRange, salesCards }: Props) {
  const [granularity, setGranularity] = useState<Granularity>("day");
  const [metric, setMetric] = useState<MetricKey>("investimento");
  const [valueMode, setValueMode] = useState<ValueMode>("qty");

  const { byMonth: investByMonth, totals: investTotals, isLoading: isLoadingInvest } =
    useInvestmentByMonthByChannel(dateRange.from, dateRange.to);

  // ===== Build time buckets =====
  const buckets = useMemo(() => {
    const from = startOfDay(dateRange.from);
    const to = endOfDay(dateRange.to);
    if (granularity === "day") {
      return eachDayOfInterval({ start: from, end: to }).map(d => ({
        key: format(d, "yyyy-MM-dd"),
        label: format(d, "dd 'de' MMM", { locale: ptBR }),
        start: startOfDay(d),
        end: endOfDay(d),
      }));
    }
    if (granularity === "week") {
      return eachWeekOfInterval({ start: from, end: to }, { locale: ptBR }).map(d => {
        const ws = startOfWeek(d, { locale: ptBR });
        const we = endOfWeek(d, { locale: ptBR });
        return {
          key: format(ws, "yyyy-'W'II"),
          label: format(ws, "dd/MM", { locale: ptBR }),
          start: ws,
          end: we,
        };
      });
    }
    return eachMonthOfInterval({ start: from, end: to }).map(d => ({
      key: format(d, "yyyy-MM"),
      label: format(d, "MMM/yy", { locale: ptBR }),
      start: startOfMonth(d),
      end: endOfMonth(d),
    }));
  }, [dateRange, granularity]);

  // ===== Aggregate sales per bucket per channel =====
  const salesAgg = useMemo(() => {
    // Map<bucketKey, {meta, google, outros}>
    const init = () => ({ meta: 0, google: 0, outros: 0 } as Record<ChannelKey, number>);
    const qtyByBucket = new Map<string, Record<ChannelKey, number>>();
    const moneyByBucket = new Map<string, Record<ChannelKey, number>>();
    buckets.forEach(b => { qtyByBucket.set(b.key, init()); moneyByBucket.set(b.key, init()); });

    const totalQty: Record<ChannelKey, number> = { meta: 0, google: 0, outros: 0 };
    const totalMoney: Record<ChannelKey, number> = { meta: 0, google: 0, outros: 0 };

    for (const c of salesCards) {
      const date = c.dataAssinatura ?? c.dataEntrada;
      if (!date) continue;
      const bucket = buckets.find(b => isWithinInterval(date, { start: b.start, end: b.end }));
      if (!bucket) continue;
      const ch = getChannelOfCard(c);
      const rev = salesRevenue(c);
      qtyByBucket.get(bucket.key)![ch] += 1;
      moneyByBucket.get(bucket.key)![ch] += rev;
      totalQty[ch] += 1;
      totalMoney[ch] += rev;
    }

    return { qtyByBucket, moneyByBucket, totalQty, totalMoney };
  }, [buckets, salesCards]);

  // ===== Distribute monthly investment / impressions / clicks across buckets =====
  const investAgg = useMemo(() => {
    const init = () => ({ meta: 0, google: 0, outros: 0 } as Record<ChannelKey, number>);
    const investByBucket = new Map<string, Record<ChannelKey, number>>();
    const imprByBucket = new Map<string, Record<ChannelKey, number>>();
    const clicksByBucket = new Map<string, Record<ChannelKey, number>>();
    buckets.forEach(b => {
      investByBucket.set(b.key, init());
      imprByBucket.set(b.key, init());
      clicksByBucket.set(b.key, init());
    });

    // For each month with data, distribute uniformly across days within selected range
    for (const [yyyyMM, v] of investByMonth.entries()) {
      const [y, m] = yyyyMM.split("-").map(Number);
      const monthStart = startOfMonth(new Date(y, m - 1, 1));
      const monthEnd = endOfMonth(monthStart);
      const daysInMonth = getDaysInMonth(monthStart);
      // For each day in month within the range, allocate 1/daysInMonth share
      const rangeStart = startOfDay(dateRange.from);
      const rangeEnd = endOfDay(dateRange.to);
      const dayFrom = monthStart > rangeStart ? monthStart : rangeStart;
      const dayTo = monthEnd < rangeEnd ? monthEnd : rangeEnd;
      if (dayFrom > dayTo) continue;
      const days = eachDayOfInterval({ start: dayFrom, end: dayTo });
      for (const day of days) {
        const bucket = buckets.find(b => isWithinInterval(day, { start: b.start, end: b.end }));
        if (!bucket) continue;
        const bI = investByBucket.get(bucket.key)!;
        const bP = imprByBucket.get(bucket.key)!;
        const bC = clicksByBucket.get(bucket.key)!;
        bI.meta   += v.meta   / daysInMonth;
        bI.google += v.google / daysInMonth;
        bP.meta   += v.metaImpressions   / daysInMonth;
        bP.google += v.googleImpressions / daysInMonth;
        bC.meta   += v.metaClicks   / daysInMonth;
        bC.google += v.googleClicks / daysInMonth;
      }
    }

    const totalInvest = { meta: investTotals.meta, google: investTotals.google, outros: 0 };
    const totalImpr   = { meta: investTotals.metaImpressions, google: investTotals.googleImpressions, outros: 0 };
    const totalClicks = { meta: investTotals.metaClicks, google: investTotals.googleClicks, outros: 0 };

    return { investByBucket, imprByBucket, clicksByBucket, totalInvest, totalImpr, totalClicks };
  }, [buckets, investByMonth, investTotals, dateRange]);

  // ===== Compute chart series per channel for selected metric =====
  const chartData = useMemo(() => {
    return buckets.map(b => {
      const i = investAgg.investByBucket.get(b.key)!;
      const p = investAgg.imprByBucket.get(b.key)!;
      const c = investAgg.clicksByBucket.get(b.key)!;
      const sQty = salesAgg.qtyByBucket.get(b.key)!;
      const sMoney = salesAgg.moneyByBucket.get(b.key)!;

      const compute = (ch: ChannelKey): number => {
        switch (metric) {
          case "investimento": return i[ch];
          case "impressoes":   return p[ch];
          case "cliques":      return c[ch];
          case "vendas":       return valueMode === "money" ? sMoney[ch] : sQty[ch];
          case "faturamento":  return sMoney[ch];
          case "cpv": {
            const v = sQty[ch];
            return v > 0 ? i[ch] / v : 0;
          }
          case "cpc": {
            const cl = c[ch];
            return cl > 0 ? i[ch] / cl : 0;
          }
          case "roas": {
            const inv = i[ch];
            return inv > 0 ? sMoney[ch] / inv : 0;
          }
          case "roi": {
            const inv = i[ch];
            return inv > 0 ? (sMoney[ch] - inv) / inv : 0;
          }
        }
      };

      return {
        label: b.label,
        meta:   compute("meta"),
        google: compute("google"),
        outros: compute("outros"),
      };
    });
  }, [buckets, investAgg, salesAgg, metric, valueMode]);

  // ===== Per-channel period totals (header strip + summary table) =====
  const channelTotals = useMemo(() => {
    const result = (["meta", "google", "outros"] as ChannelKey[]).map(ch => {
      const inv = investAgg.totalInvest[ch];
      const impr = investAgg.totalImpr[ch];
      const clk  = investAgg.totalClicks[ch];
      const vQty = salesAgg.totalQty[ch];
      const vMoney = salesAgg.totalMoney[ch];
      return {
        ch,
        investimento: inv,
        impressoes: impr,
        cliques: clk,
        vendasQty: vQty,
        vendasMoney: vMoney,
        cpv: vQty > 0 ? inv / vQty : 0,
        cpc: clk > 0 ? inv / clk : 0,
        faturamento: vMoney,
        roas: inv > 0 ? vMoney / inv : 0,
        roi: inv > 0 ? (vMoney - inv) / inv : 0,
      };
    });
    const total = result.reduce((acc, r) => ({
      investimento: acc.investimento + r.investimento,
      impressoes: acc.impressoes + r.impressoes,
      cliques: acc.cliques + r.cliques,
      vendasQty: acc.vendasQty + r.vendasQty,
      vendasMoney: acc.vendasMoney + r.vendasMoney,
    }), { investimento: 0, impressoes: 0, cliques: 0, vendasQty: 0, vendasMoney: 0 });
    return { result, total };
  }, [investAgg, salesAgg]);

  const isMoneyMetric = ["investimento", "vendas", "cpv", "cpc", "faturamento"].includes(metric)
    && !(metric === "vendas" && valueMode === "qty");

  const isPctMetric = metric === "roi";
  const isRatioMetric = metric === "roas";

  const yFormatter = (v: number) => {
    if (isPctMetric) return formatPct(v);
    if (isRatioMetric) return v.toFixed(1) + "x";
    if (isMoneyMetric) return formatBRLk(v);
    return formatNum(v);
  };

  const valueFormatter = (v: number) => {
    if (isPctMetric) return formatPct(v);
    if (isRatioMetric) return v.toFixed(2) + "x";
    if (isMoneyMetric) return formatBRL(v);
    return formatNum(v);
  };

  return (
    <Card className="border-border/40 bg-card/40 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <CardTitle className="text-xl">Performance por Canal</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Investimento, vendas e tendência por origem — Meta, Google e Outros (Outbound, Eventos, Orgânico).
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Exibir por:</Label>
              <Select value={granularity} onValueChange={(v) => setGranularity(v as Granularity)}>
                <SelectTrigger className="h-8 w-[110px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Dia</SelectItem>
                  <SelectItem value="week">Semana</SelectItem>
                  <SelectItem value="month">Mês</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(metric === "vendas") && (
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">R$</Label>
                <Switch
                  checked={valueMode === "qty"}
                  onCheckedChange={(c) => setValueMode(c ? "qty" : "money")}
                />
                <Label className="text-xs text-muted-foreground">Qtd</Label>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* ===== KPI strip ===== */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {(["meta", "google"] as ChannelKey[]).map(ch => {
            const meta = CHANNEL_META[ch];
            const t = channelTotals.result.find(r => r.ch === ch)!;
            return (
              <Card key={`inv-${ch}`} className="p-3 border-border/50">
                <div className="flex items-center gap-2 mb-1">
                  <meta.Icon className="h-4 w-4" style={{ color: meta.color }} />
                  <span className="text-xs text-muted-foreground">{meta.label}</span>
                </div>
                <div className="text-2xl font-bold tabular-nums">{formatBRL(t.investimento)}</div>
                <div className="text-xs text-muted-foreground">Investimento</div>
              </Card>
            );
          })}
          <Card className="p-3 border-primary/50 bg-primary/5">
            <div className="flex items-center gap-2 mb-1">
              <ArrowUpRight className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-primary">Total</span>
            </div>
            <div className="text-2xl font-bold tabular-nums">{formatBRL(channelTotals.total.investimento)}</div>
            <div className="text-xs text-muted-foreground">Investimento</div>
          </Card>
          {(["meta", "google", "outros"] as ChannelKey[]).map(ch => {
            const meta = CHANNEL_META[ch];
            const t = channelTotals.result.find(r => r.ch === ch)!;
            const display = valueMode === "money" ? formatBRL(t.vendasMoney) : formatNum(t.vendasQty);
            return (
              <Card key={`sales-${ch}`} className={cn("p-3 border-border/50", ch === "outros" && "border-primary/30 bg-primary/[0.03]")}>
                <div className="flex items-center gap-2 mb-1">
                  <meta.Icon className="h-4 w-4" style={{ color: meta.color }} />
                  <span className="text-xs text-muted-foreground">{meta.label}</span>
                </div>
                <div className="text-2xl font-bold tabular-nums">{display}</div>
                <div className="text-xs text-muted-foreground">Vendas {valueMode === "money" ? "(R$)" : "(Qtd)"}</div>
              </Card>
            );
          })}
        </div>

        {/* ===== Metric tabs ===== */}
        <Tabs value={metric} onValueChange={(v) => setMetric(v as MetricKey)}>
          <TabsList className="flex flex-wrap h-auto">
            {METRIC_TABS.map(t => (
              <TabsTrigger key={t.key} value={t.key} className="text-xs">{t.label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {isLoadingInvest && (
          <div className="text-xs text-muted-foreground">Carregando investimento por canal…</div>
        )}

        {/* ===== Three area charts ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {(["meta", "google", "outros"] as ChannelKey[]).map(ch => {
            const meta = CHANNEL_META[ch];
            const t = channelTotals.result.find(r => r.ch === ch)!;
            const headerValue =
              metric === "vendas" ? (valueMode === "money" ? formatBRL(t.vendasMoney) : formatNum(t.vendasQty)) :
              metric === "investimento" ? formatBRL(t.investimento) :
              metric === "impressoes" ? formatNum(t.impressoes) :
              metric === "cliques" ? formatNum(t.cliques) :
              metric === "cpv" ? formatBRL(t.cpv) :
              metric === "cpc" ? formatBRL(t.cpc) :
              metric === "faturamento" ? formatBRL(t.faturamento) :
              metric === "roas" ? t.roas.toFixed(2) + "x" :
              formatPct(t.roi);

            return (
              <Card key={`chart-${ch}`} className="border-border/50">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <meta.Icon className="h-4 w-4" style={{ color: meta.color }} />
                      <span className="text-sm font-medium">{meta.label}</span>
                    </div>
                    <span className="text-lg font-bold tabular-nums">{headerValue}</span>
                  </div>
                </CardHeader>
                <CardContent className="pb-3">
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id={`grad-${ch}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={meta.color} stopOpacity={0.5} />
                          <stop offset="100%" stopColor={meta.color} stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        tickFormatter={yFormatter}
                        width={55}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 6,
                          fontSize: 12,
                        }}
                        formatter={(v: number) => [valueFormatter(v), meta.label]}
                      />
                      <Area
                        type="monotone"
                        dataKey={ch}
                        stroke={meta.color}
                        strokeWidth={2}
                        fill={`url(#grad-${ch})`}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* ===== Bottom: summary table + stacked sales chart ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Resumo por canal</CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Canal</TableHead>
                      <TableHead className="text-right">Invest.</TableHead>
                      <TableHead className="text-right">Impr.</TableHead>
                      <TableHead className="text-right">Cliques</TableHead>
                      <TableHead className="text-right">Vendas</TableHead>
                      <TableHead className="text-right">CPV</TableHead>
                      <TableHead className="text-right">Fat.</TableHead>
                      <TableHead className="text-right">ROAS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {channelTotals.result.map(r => {
                      const meta = CHANNEL_META[r.ch];
                      return (
                        <TableRow key={r.ch}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full" style={{ background: meta.color }} />
                              <span className="font-medium">{meta.label}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{r.investimento > 0 ? formatBRLk(r.investimento) : "—"}</TableCell>
                          <TableCell className="text-right tabular-nums">{r.impressoes > 0 ? formatNum(r.impressoes) : "—"}</TableCell>
                          <TableCell className="text-right tabular-nums">{r.cliques > 0 ? formatNum(r.cliques) : "—"}</TableCell>
                          <TableCell className="text-right tabular-nums">{r.vendasQty}</TableCell>
                          <TableCell className="text-right tabular-nums">{r.cpv > 0 ? formatBRLk(r.cpv) : "—"}</TableCell>
                          <TableCell className="text-right tabular-nums">{r.faturamento > 0 ? formatBRLk(r.faturamento) : "—"}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {r.roas > 0 ? <Badge variant="secondary">{r.roas.toFixed(1)}x</Badge> : "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow className="border-t-2 font-semibold">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right tabular-nums">{formatBRLk(channelTotals.total.investimento)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatNum(channelTotals.total.impressoes)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatNum(channelTotals.total.cliques)}</TableCell>
                      <TableCell className="text-right tabular-nums">{channelTotals.total.vendasQty}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {channelTotals.total.vendasQty > 0
                          ? formatBRLk(channelTotals.total.investimento / channelTotals.total.vendasQty)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatBRLk(channelTotals.total.vendasMoney)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {channelTotals.total.investimento > 0
                          ? (channelTotals.total.vendasMoney / channelTotals.total.investimento).toFixed(1) + "x"
                          : "—"}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Vendas por Data e Fonte</CardTitle>
              <p className="text-xs text-muted-foreground">
                {valueMode === "money" ? "Faturamento (R$) empilhado por canal" : "Quantidade de vendas empilhada por canal"}
              </p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={buckets.map(b => {
                    const q = salesAgg.qtyByBucket.get(b.key)!;
                    const m = salesAgg.moneyByBucket.get(b.key)!;
                    const src = valueMode === "money" ? m : q;
                    return { label: b.label, meta: src.meta, google: src.google, outros: src.outros };
                  })}
                  margin={{ top: 16, right: 8, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={valueMode === "money" ? formatBRLk : formatNum}
                    width={55}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                    formatter={(v: number, name: string) => [
                      valueMode === "money" ? formatBRL(v) : formatNum(v),
                      CHANNEL_META[name as ChannelKey]?.label || name,
                    ]}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 12 }}
                    formatter={(value) => CHANNEL_META[value as ChannelKey]?.label || value}
                  />
                  <Bar dataKey="meta"   stackId="s" fill={CHANNEL_META.meta.color}   radius={[0, 0, 0, 0]} />
                  <Bar dataKey="google" stackId="s" fill={CHANNEL_META.google.color} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="outros" stackId="s" fill={CHANNEL_META.outros.color} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}
