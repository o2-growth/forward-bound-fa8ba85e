import { useEffect, useMemo, useState } from "react";
import {
  Users, FileText, Wallet, Target, TrendingUp, MapPin, Building2,
  Calendar as CalIcon, ChevronRight, X, Info, ArrowUpRight, ArrowDownRight,
  Settings, UserCircle2, UserCheck,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import { AttributionCard } from "../../marketing-indicators/types";
import { detectChannel } from "@/hooks/useMarketingAttribution";

interface Props {
  dateRange: { from: Date; to: Date };
  allAttributionCards: AttributionCard[];
  salesCards: AttributionCard[];
}

// ─── helpers ─────────────────────────────────────────────────────────────────
const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const brlK = (n: number) => {
  if (Math.abs(n) >= 1_000_000) return "R$ " + (n / 1_000_000).toFixed(2) + "M";
  if (Math.abs(n) >= 1000) return "R$ " + (n / 1000).toFixed(1) + "k";
  return brl(n);
};
const num = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
const pct = (n: number) => (n * 100).toFixed(1) + "%";

const CHANNEL_LABEL: Record<string, string> = {
  meta_ads: "Meta Ads",
  google_ads: "Google Ads",
  eventos: "Eventos",
  organico: "Orgânico / Direto",
  outros: "Outros",
};

type GroupKey = "origem" | "produto" | "bu" | "sdr" | "closer";
type Granularity = "day" | "week" | "month";
type MetricKey =
  | "qtd_vendas" | "valor_vendas" | "tm_venda"
  | "qtd_propostas" | "valor_propostas" | "tm_proposta";

const METRIC_LABEL: Record<MetricKey, string> = {
  qtd_vendas: "Qtd Vendas",
  valor_vendas: "Valor Vendas",
  tm_venda: "Ticket Médio (Venda)",
  qtd_propostas: "Qtd Propostas",
  valor_propostas: "Valor Propostas",
  tm_proposta: "Ticket Médio (Proposta)",
};

const PROPOSTA_PHASES = new Set([
  "Proposta enviada / Follow Up",
  "Enviar para assinatura",
]);

function cardValue(c: AttributionCard) {
  return (c.valorMRR || 0) + (c.valorSetup || 0) + (c.valorPontual || 0);
}

function inRange(d: Date | null | undefined, from: Date, to: Date) {
  if (!d) return false;
  const t = d.getTime();
  return t >= from.getTime() && t <= to.getTime();
}

// ─── component ───────────────────────────────────────────────────────────────
export function OverallResultsSection({ dateRange, allAttributionCards, salesCards }: Props) {
  // Cross-filter state
  const [cf, setCf] = useState<{ origem?: string; produto?: string; bu?: string; sdr?: string; closer?: string }>({});
  const [granularity, setGranularity] = useState<Granularity>("month");
  const [activeMetric, setActiveMetric] = useState<MetricKey>("valor_vendas");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 15;

  // Meta editável (persistida em localStorage por mês corrente do período)
  const metaKey = `overall_meta_${dateRange.from.getFullYear()}_${dateRange.from.getMonth() + 1}`;
  const [metaQtdInput, setMetaQtdInput] = useState<string>("");
  const [metaValorInput, setMetaValorInput] = useState<string>("");
  const [metaQtd, setMetaQtd] = useState<number>(0);
  const [metaValor, setMetaValor] = useState<number>(0);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(metaKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        setMetaQtd(Number(parsed.qtd) || 0);
        setMetaValor(Number(parsed.valor) || 0);
        setMetaQtdInput(String(parsed.qtd ?? ""));
        setMetaValorInput(String(parsed.valor ?? ""));
      } else {
        setMetaQtd(0); setMetaValor(0); setMetaQtdInput(""); setMetaValorInput("");
      }
    } catch { /* ignore */ }
  }, [metaKey]);

  const saveMeta = () => {
    const qtd = Number(metaQtdInput) || 0;
    const valor = Number(metaValorInput) || 0;
    localStorage.setItem(metaKey, JSON.stringify({ qtd, valor }));
    setMetaQtd(qtd); setMetaValor(valor);
    setSettingsOpen(false);
  };

  const passesCf = (c: AttributionCard) => {
    if (cf.origem && detectChannel(c) !== cf.origem) return false;
    if (cf.produto && (c.produto || "—") !== cf.produto) return false;
    if (cf.bu && c.bu !== cf.bu) return false;
    if (cf.sdr && (c.sdr || "—") !== cf.sdr) return false;
    if (cf.closer && (c.closer || "—") !== cf.closer) return false;
    return true;
  };

  // Period anterior (mesmo tamanho)
  const prevRange = useMemo(() => {
    const ms = dateRange.to.getTime() - dateRange.from.getTime();
    return { from: new Date(dateRange.from.getTime() - ms - 1), to: new Date(dateRange.from.getTime() - 1) };
  }, [dateRange]);

  // Universos
  const allSalesInPeriod = useMemo(() => salesCards.filter(passesCf), [salesCards, cf]);
  const allSalesPrev = useMemo(
    () => salesCards.filter(c => passesCf(c) && inRange(c.dataAssinatura, prevRange.from, prevRange.to)),
    [salesCards, cf, prevRange]
  );

  const propostasInPeriod = useMemo(() => {
    return allAttributionCards.filter(c =>
      passesCf(c) && PROPOSTA_PHASES.has(c.fase) && inRange(c.dataEntrada, dateRange.from, dateRange.to)
    );
  }, [allAttributionCards, cf, dateRange]);

  const propostasPrev = useMemo(() => {
    return allAttributionCards.filter(c =>
      passesCf(c) && PROPOSTA_PHASES.has(c.fase) && inRange(c.dataEntrada, prevRange.from, prevRange.to)
    );
  }, [allAttributionCards, cf, prevRange]);

  // KPIs
  const kpis = useMemo(() => {
    const qtdV = allSalesInPeriod.length;
    const valorV = allSalesInPeriod.reduce((s, c) => s + cardValue(c), 0);
    const tmV = qtdV > 0 ? valorV / qtdV : 0;
    const qtdP = propostasInPeriod.length;
    const valorP = propostasInPeriod.reduce((s, c) => s + cardValue(c), 0);
    const tmP = qtdP > 0 ? valorP / qtdP : 0;

    const qtdVprev = allSalesPrev.length;
    const valorVprev = allSalesPrev.reduce((s, c) => s + cardValue(c), 0);
    const tmVprev = qtdVprev > 0 ? valorVprev / qtdVprev : 0;
    const qtdPprev = propostasPrev.length;
    const valorPprev = propostasPrev.reduce((s, c) => s + cardValue(c), 0);
    const tmPprev = qtdPprev > 0 ? valorPprev / qtdPprev : 0;

    return { qtdV, valorV, tmV, qtdP, valorP, tmP, qtdVprev, valorVprev, tmVprev, qtdPprev, valorPprev, tmPprev };
  }, [allSalesInPeriod, propostasInPeriod, allSalesPrev, propostasPrev]);

  // Meta: usa valor salvo no localStorage; fallback estimado por TM se vazio
  const metaQtdEffective = metaQtd > 0 ? metaQtd : (kpis.tmV > 0 ? Math.round((kpis.valorV / kpis.tmV) * 1.2) : 100);
  const metaValorEffective = metaValor > 0 ? metaValor : (metaQtdEffective * (kpis.tmV || 0));
  const metaPctRealizado = metaQtdEffective > 0 ? kpis.qtdV / metaQtdEffective : 0;
  const metaPctPrev = metaQtdEffective > 0 ? kpis.qtdVprev / metaQtdEffective : 0;
  const metaValorPct = metaValorEffective > 0 ? kpis.valorV / metaValorEffective : 0;

  // Breakdowns
  const breakdown = (key: GroupKey) => {
    const map = new Map<string, { qtd: number; valor: number }>();
    for (const c of allSalesInPeriod) {
      const k =
        key === "origem" ? CHANNEL_LABEL[detectChannel(c)] || "Outros" :
        key === "produto" ? (c.produto || "—") :
        key === "sdr" ? (c.sdr || "—") :
        key === "closer" ? (c.closer || "—") :
        (c.bu || "—");
      const cur = map.get(k) || { qtd: 0, valor: 0 };
      cur.qtd += 1;
      cur.valor += cardValue(c);
      map.set(k, cur);
    }
    return Array.from(map.entries())
      .map(([name, v]) => ({ name, qtd: v.qtd, valor: v.valor }))
      .sort((a, b) => b.qtd - a.qtd);
  };

  const byOrigem = useMemo(() => breakdown("origem"), [allSalesInPeriod]);
  const byProduto = useMemo(() => breakdown("produto"), [allSalesInPeriod]);
  const byBu = useMemo(() => breakdown("bu"), [allSalesInPeriod]);
  const bySdr = useMemo(() => breakdown("sdr"), [allSalesInPeriod]);
  const byCloser = useMemo(() => breakdown("closer"), [allSalesInPeriod]);

  // Série temporal
  const timeseries = useMemo(() => {
    const fmt = (d: Date) => {
      if (granularity === "day") {
        return d.toISOString().slice(0, 10);
      }
      if (granularity === "week") {
        const onejan = new Date(d.getFullYear(), 0, 1);
        const week = Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7);
        return `${d.getFullYear()}-S${String(week).padStart(2, "0")}`;
      }
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    };

    const map = new Map<string, { qtd_vendas: number; valor_vendas: number; qtd_propostas: number; valor_propostas: number }>();
    const ensure = (k: string) => {
      if (!map.has(k)) map.set(k, { qtd_vendas: 0, valor_vendas: 0, qtd_propostas: 0, valor_propostas: 0 });
      return map.get(k)!;
    };
    for (const c of allSalesInPeriod) {
      if (!c.dataAssinatura) continue;
      const r = ensure(fmt(c.dataAssinatura));
      r.qtd_vendas += 1;
      r.valor_vendas += cardValue(c);
    }
    for (const c of propostasInPeriod) {
      const r = ensure(fmt(c.dataEntrada));
      r.qtd_propostas += 1;
      r.valor_propostas += cardValue(c);
    }

    const rows = Array.from(map.entries())
      .map(([periodo, v]) => ({
        periodo,
        ...v,
        tm_venda: v.qtd_vendas > 0 ? v.valor_vendas / v.qtd_vendas : 0,
        tm_proposta: v.qtd_propostas > 0 ? v.valor_propostas / v.qtd_propostas : 0,
      }))
      .sort((a, b) => a.periodo.localeCompare(b.periodo));
    return rows;
  }, [allSalesInPeriod, propostasInPeriod, granularity]);

  // Tabela
  const filteredSales = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = q
      ? allSalesInPeriod.filter(c =>
          (c.titulo || "").toLowerCase().includes(q) ||
          (c.empresa || "").toLowerCase().includes(q)
        )
      : allSalesInPeriod;
    return [...base].sort((a, b) =>
      (b.dataAssinatura?.getTime() || 0) - (a.dataAssinatura?.getTime() || 0)
    );
  }, [allSalesInPeriod, search]);

  const totalPages = Math.max(1, Math.ceil(filteredSales.length / pageSize));
  const pageRows = filteredSales.slice(page * pageSize, (page + 1) * pageSize);

  const deltaIcon = (cur: number, prev: number) => {
    if (prev === 0) return null;
    const d = (cur - prev) / prev;
    const up = d >= 0;
    return (
      <span className={cn("inline-flex items-center gap-0.5 text-[11px]", up ? "text-emerald-500" : "text-rose-500")}>
        {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
        {pct(Math.abs(d))}
      </span>
    );
  };

  const hasAnyFilter = !!cf.origem || !!cf.produto || !!cf.bu;

  return (
    <TooltipProvider>
      <Card className="border-border/40 bg-card/40 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                Resultados Gerais
                <Badge variant="outline" className="text-[10px] font-normal">
                  {dateRange.from.toLocaleDateString("pt-BR")} → {dateRange.to.toLocaleDateString("pt-BR")}
                </Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Dashboard interativo de vendas, propostas e breakdown por origem, produto e BU. Clique nas listas para filtrar.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {hasAnyFilter && (
                <Button variant="outline" size="sm" onClick={() => setCf({})} className="gap-1">
                  <X className="h-3 w-3" /> Limpar filtros
                </Button>
              )}
              <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1">
                    <Settings className="h-3 w-3" /> Metas
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Metas — {dateRange.from.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 py-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Meta de Qtd de Vendas</Label>
                      <Input type="number" value={metaQtdInput} onChange={(e) => setMetaQtdInput(e.target.value)} placeholder="ex: 50" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Meta de Valor de Vendas (R$)</Label>
                      <Input type="number" value={metaValorInput} onChange={(e) => setMetaValorInput(e.target.value)} placeholder="ex: 500000" />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Salvo localmente neste navegador. Deixe vazio para usar estimativa automática (Valor ÷ Ticket Médio).
                    </p>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setSettingsOpen(false)}>Cancelar</Button>
                    <Button onClick={saveMeta}>Salvar</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          {hasAnyFilter && (
            <div className="flex flex-wrap gap-2 mt-3">
              {cf.origem && (
                <Badge variant="secondary" className="gap-1">
                  Origem: {CHANNEL_LABEL[cf.origem]}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setCf(p => ({ ...p, origem: undefined }))} />
                </Badge>
              )}
              {cf.produto && (
                <Badge variant="secondary" className="gap-1">
                  Produto: {cf.produto}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setCf(p => ({ ...p, produto: undefined }))} />
                </Badge>
              )}
              {cf.bu && (
                <Badge variant="secondary" className="gap-1">
                  BU: {cf.bu}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setCf(p => ({ ...p, bu: undefined }))} />
                </Badge>
              )}
              {cf.sdr && (
                <Badge variant="secondary" className="gap-1">
                  SDR: {cf.sdr}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setCf(p => ({ ...p, sdr: undefined }))} />
                </Badge>
              )}
              {cf.closer && (
                <Badge variant="secondary" className="gap-1">
                  Closer: {cf.closer}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setCf(p => ({ ...p, closer: undefined }))} />
                </Badge>
              )}
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-5">
          {/* ─── KPI strip ─────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <KpiCard icon={Users}      label="Qtd Vendas"            value={num(kpis.qtdV)}       delta={deltaIcon(kpis.qtdV, kpis.qtdVprev)} subtitle={`Anterior: ${num(kpis.qtdVprev)}`} />
            <KpiCard icon={FileText}   label="Qtd Propostas"         value={num(kpis.qtdP)}       delta={deltaIcon(kpis.qtdP, kpis.qtdPprev)} subtitle={`Anterior: ${num(kpis.qtdPprev)}`} />
            <KpiCard icon={Wallet}     label="Valor Vendas"          value={brlK(kpis.valorV)}    delta={deltaIcon(kpis.valorV, kpis.valorVprev)} subtitle={`Anterior: ${brlK(kpis.valorVprev)}`} />
            <KpiCard icon={Target}     label="Ticket Médio (Venda)"  value={brlK(kpis.tmV)}       delta={deltaIcon(kpis.tmV, kpis.tmVprev)} subtitle={`TM Proposta: ${brlK(kpis.tmP)}`} />
            <KpiCard icon={TrendingUp} label="% Realizado Meta"      value={pct(metaPctRealizado)} delta={deltaIcon(metaPctRealizado, metaPctPrev)} subtitle={metaQtd > 0 ? `Meta: ${num(metaQtdEffective)} vendas · ${brlK(metaValorEffective)} (${pct(metaValorPct)})` : `Meta estimada: ${num(metaQtdEffective)} vendas (clique em Metas)`} highlight={metaPctRealizado >= 0.8 ? "good" : metaPctRealizado >= 0.4 ? "warn" : "bad"} />
          </div>

          {/* ─── Linha 2: Métricas tiles + por Origem + Evolução ──────────── */}
          <div className="grid grid-cols-12 gap-4">
            {/* Métricas tiles */}
            <Card className="col-span-12 lg:col-span-3 p-3 border-border/50">
              <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Métricas</div>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(METRIC_LABEL) as MetricKey[]).map(k => (
                  <button
                    key={k}
                    onClick={() => setActiveMetric(k)}
                    className={cn(
                      "rounded-md p-2 text-left text-xs font-medium transition-all border",
                      activeMetric === k
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-muted/30 hover:bg-muted/60 border-border/40 text-foreground"
                    )}
                  >
                    {METRIC_LABEL[k]}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 italic">
                Clique em uma métrica para visualizar no gráfico ao lado.
              </p>
            </Card>

            {/* por Origem */}
            <Card className="col-span-12 lg:col-span-4 p-3 border-border/50">
              <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide flex items-center justify-between">
                <span>por Origem</span>
                <span className="text-[10px] normal-case font-normal">Clique para filtrar</span>
              </div>
              <BarList
                items={byOrigem}
                onClick={(name) => {
                  const ch = Object.entries(CHANNEL_LABEL).find(([, v]) => v === name)?.[0];
                  if (ch) setCf(p => ({ ...p, origem: ch }));
                }}
              />
            </Card>

            {/* Evolução */}
            <Card className="col-span-12 lg:col-span-5 p-3 border-border/50">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Evolução — {METRIC_LABEL[activeMetric]}
                </div>
                <Select value={granularity} onValueChange={(v) => setGranularity(v as Granularity)}>
                  <SelectTrigger className="h-7 w-[110px] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Dia</SelectItem>
                    <SelectItem value="week">Semana</SelectItem>
                    <SelectItem value="month">Mês</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeseries} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="ovrFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis dataKey="periodo" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) =>
                      activeMetric.startsWith("valor") || activeMetric.startsWith("tm") ? brlK(v) : num(v)
                    } />
                    <RTooltip
                      contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", fontSize: 12 }}
                      formatter={(v: number) =>
                        activeMetric.startsWith("valor") || activeMetric.startsWith("tm") ? brl(v) : num(v)
                      }
                    />
                    <Area type="monotone" dataKey={activeMetric} stroke="hsl(var(--primary))" fill="url(#ovrFill)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* ─── Linha 3: por Produto + por BU + por SDR + por Closer ─── */}
          <div className="grid grid-cols-12 gap-4">
            <Card className="col-span-12 lg:col-span-3 p-3 border-border/50">
              <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">por Produto</div>
              <BarList items={byProduto} onClick={(name) => setCf(p => ({ ...p, produto: name }))} />
            </Card>

            <Card className="col-span-12 lg:col-span-3 p-3 border-border/50">
              <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide flex items-center gap-1">
                <Building2 className="h-3 w-3" /> por BU
              </div>
              <BarList items={byBu} onClick={(name) => setCf(p => ({ ...p, bu: name }))} />
            </Card>

            <Card className="col-span-12 lg:col-span-3 p-3 border-border/50">
              <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide flex items-center gap-1">
                <UserCircle2 className="h-3 w-3" /> por SDR
              </div>
              <BarList items={bySdr} onClick={(name) => setCf(p => ({ ...p, sdr: name }))} />
            </Card>

            <Card className="col-span-12 lg:col-span-3 p-3 border-border/50">
              <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide flex items-center gap-1">
                <UserCheck className="h-3 w-3" /> por Closer
              </div>
              <BarList items={byCloser} onClick={(name) => setCf(p => ({ ...p, closer: name }))} />
            </Card>
          </div>

          {/* ─── Linha 4: Totalizadores + nota Cidade/Estado ─── */}
          <div className="grid grid-cols-12 gap-4">
            <Card className="col-span-12 lg:col-span-6 p-3 border-border/50 bg-muted/10 border-dashed">
              <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide flex items-center gap-1">
                <MapPin className="h-3 w-3" /> por Estado / Cidade
              </div>
              <div className="flex items-start gap-3 px-2">
                <Info className="h-6 w-6 text-muted-foreground/50 mt-1 shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Dados geográficos virão do <b>Meta Insights breakdown=region</b> (Meta Ads)
                  e do <b>geo_target_region</b> (Google Ads), com atribuição por campanha.
                  Para leads CRM/orgânicos é necessário adicionar campo de UF/Cidade no formulário de captura.
                </p>
              </div>
            </Card>

            <Card className="col-span-12 lg:col-span-6 p-3 border-border/50">
              <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Totalizadores</div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                <Row label="Vendas no período"        value={num(kpis.qtdV)} />
                <Row label="Receita total"            value={brlK(kpis.valorV)} bold />
                <Row label="Propostas no período"     value={num(kpis.qtdP)} />
                <Row label="Pipeline de propostas"    value={brlK(kpis.valorP)} />
                <Row label="Taxa Proposta → Venda"    value={kpis.qtdP > 0 ? pct(kpis.qtdV / kpis.qtdP) : "—"} />
                <Row label="BUs ativas"               value={String(byBu.length)} />
                <Row label="Origens detectadas"       value={String(byOrigem.length)} />
                <Row label="SDRs / Closers"           value={`${bySdr.length} / ${byCloser.length}`} />
              </div>
            </Card>
          </div>

          {/* legacy totalizadores card removido — agora consolidado acima */}
          <div className="hidden">
            <Card><div /></Card>

            <Card className="col-span-12 lg:col-span-3 p-3 border-border/50">
              <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Totalizadores</div>
              <div className="space-y-2 text-sm">
                <Row label="Vendas no período"        value={num(kpis.qtdV)} />
                <Row label="Receita total"            value={brlK(kpis.valorV)} bold />
                <Row label="Propostas no período"     value={num(kpis.qtdP)} />
                <Row label="Pipeline de propostas"    value={brlK(kpis.valorP)} />
                <Row label="Taxa Proposta → Venda"    value={kpis.qtdP > 0 ? pct(kpis.qtdV / kpis.qtdP) : "—"} />
                <Row label="BUs ativas"               value={String(byBu.length)} />
                <Row label="Origens detectadas"       value={String(byOrigem.length)} />
              </div>
            </Card>
          </div>

          {/* ─── Tabela detalhada de vendas ───────────────────── */}
          <Card className="border-border/50">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Vendas detalhadas — {num(filteredSales.length)} registros</CardTitle>
                <p className="text-[11px] text-muted-foreground mt-0.5">Ordenadas por data de assinatura (mais recentes primeiro)</p>
              </div>
              <Input
                placeholder="Buscar cliente..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                className="h-8 w-[220px] text-xs"
              />
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[400px] overflow-auto [&>div]:overflow-visible">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="text-xs">Data Assinatura</TableHead>
                      <TableHead className="text-xs">Cliente</TableHead>
                      <TableHead className="text-xs">Produto</TableHead>
                      <TableHead className="text-xs">BU</TableHead>
                      <TableHead className="text-xs">Origem</TableHead>
                      <TableHead className="text-xs">SDR</TableHead>
                      <TableHead className="text-xs">Closer</TableHead>
                      <TableHead className="text-xs text-right">MRR</TableHead>
                      <TableHead className="text-xs text-right">Setup</TableHead>
                      <TableHead className="text-xs text-right">Pontual</TableHead>
                      <TableHead className="text-xs text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageRows.map((c) => (
                      <TableRow key={c.id} className="text-xs">
                        <TableCell>{c.dataAssinatura?.toLocaleDateString("pt-BR") || "—"}</TableCell>
                        <TableCell className="font-medium max-w-[220px] truncate">{c.empresa || c.titulo}</TableCell>
                        <TableCell>{c.produto || "—"}</TableCell>
                        <TableCell>{c.bu}</TableCell>
                        <TableCell>{CHANNEL_LABEL[detectChannel(c)]}</TableCell>
                        <TableCell className="max-w-[120px] truncate">{c.sdr || "—"}</TableCell>
                        <TableCell className="max-w-[120px] truncate">{c.closer || "—"}</TableCell>
                        <TableCell className="text-right tabular-nums">{brlK(c.valorMRR || 0)}</TableCell>
                        <TableCell className="text-right tabular-nums">{brlK(c.valorSetup || 0)}</TableCell>
                        <TableCell className="text-right tabular-nums">{brlK(c.valorPontual || 0)}</TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">{brlK(cardValue(c))}</TableCell>
                      </TableRow>
                    ))}
                    {pageRows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center text-muted-foreground py-8 text-xs">
                          Nenhuma venda encontrada
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="flex items-center justify-between px-4 py-2 border-t text-xs">
                <span className="text-muted-foreground">
                  Página {page + 1} de {totalPages}
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                    Anterior
                  </Button>
                  <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                    Próxima
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

// ─── subcomponents ───────────────────────────────────────────────────────────
function KpiCard({
  icon: Icon, label, value, delta, subtitle, highlight,
}: { icon: any; label: string; value: string; delta?: React.ReactNode; subtitle?: string; highlight?: "good" | "warn" | "bad" }) {
  return (
    <Card className={cn(
      "p-3 border-border/50 transition-colors",
      highlight === "good" && "border-emerald-500/30 bg-emerald-500/5",
      highlight === "warn" && "border-amber-500/30 bg-amber-500/5",
      highlight === "bad" && "border-rose-500/30 bg-rose-500/5",
    )}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
          <Icon className="h-3.5 w-3.5" />
          <span>{label}</span>
        </div>
        {delta}
      </div>
      <div className="text-2xl font-bold tabular-nums leading-tight">{value}</div>
      {subtitle && <div className="text-[10px] text-muted-foreground mt-1">{subtitle}</div>}
    </Card>
  );
}

function BarList({
  items, onClick,
}: { items: { name: string; qtd: number; valor: number }[]; onClick?: (name: string) => void }) {
  const max = Math.max(...items.map(i => i.qtd), 1);
  if (items.length === 0) {
    return <div className="text-xs text-muted-foreground py-6 text-center">Sem dados no período</div>;
  }
  return (
    <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
      {items.map((it) => {
        const w = (it.qtd / max) * 100;
        return (
          <button
            key={it.name}
            onClick={() => onClick?.(it.name)}
            className="w-full group text-left"
          >
            <div className="flex items-center justify-between text-[11px] mb-0.5">
              <span className="truncate max-w-[120px] group-hover:text-primary transition-colors">{it.name}</span>
              <span className="tabular-nums font-medium">{it.qtd}</span>
            </div>
            <div className="h-2 bg-muted/40 rounded-sm overflow-hidden">
              <div
                className="h-full bg-primary/70 group-hover:bg-primary transition-all"
                style={{ width: `${Math.max(w, 4)}%` }}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("tabular-nums", bold && "font-bold text-base")}>{value}</span>
    </div>
  );
}
