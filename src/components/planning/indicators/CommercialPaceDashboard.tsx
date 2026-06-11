import { useMemo, useState } from "react";
import { format, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, ArrowUpRight, Flame, Target, Trophy, WalletCards } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DetailItem } from "./DetailSheet";
import { firstNameKey, useCloserAbsoluteMetas } from "@/hooks/useCloserAbsoluteMetas";
import { getMonthFactors, prorateMonthlyMeta } from "@/lib/businessDayProrate";

type FunnelKey = "rm" | "rr" | "proposta" | "venda";

interface CommercialPaceDashboardProps {
  startDate: Date;
  endDate: Date;
  selectedBUs: string[];
  selectedClosers: string[];
  selectedSDRs: string[];
  selectedOrigens: string[];
  itemsByIndicator: Record<string, DetailItem[]>;
  hotOpportunityItems: DetailItem[];
  revenueMeta: number;
  funnelMetas: Record<FunnelKey, number>;
  isLoading: boolean;
  onBack: () => void;
}

const currency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);

const compactCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 }).format(value);

const percent = (value: number) => `${Math.round(value)}%`;

const tooltipStyle = {
  backgroundColor: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "var(--radius)",
  color: "hsl(var(--popover-foreground))",
};

function conversion(current: number, previous: number) {
  return previous > 0 ? (current / previous) * 100 : 0;
}

function personName(item: DetailItem) {
  return (item.closer || item.responsible || "Sem closer").trim() || "Sem closer";
}

export function CommercialPaceDashboard({
  startDate,
  endDate,
  selectedBUs,
  selectedClosers,
  selectedSDRs,
  selectedOrigens,
  itemsByIndicator,
  hotOpportunityItems,
  revenueMeta,
  funnelMetas,
  isLoading,
  onBack,
}: CommercialPaceDashboardProps) {
  const [seriesMode, setSeriesMode] = useState<"daily" | "accumulated">("accumulated");
  const { getMonthlyMap } = useCloserAbsoluteMetas(startDate.getFullYear());

  const vendas = itemsByIndicator.venda || [];
  const faturamento = vendas.reduce((sum, item) => sum + (item.value || 0), 0);
  const ticketMedio = vendas.length > 0 ? faturamento / vendas.length : 0;
  const hotTotal = hotOpportunityItems.reduce((sum, item) => sum + (item.value || 0), 0);
  const attainment = revenueMeta > 0 ? (faturamento / revenueMeta) * 100 : 0;

  const today = new Date();
  const periodStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const periodEnd = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999);
  const elapsedEnd = today < periodStart ? periodStart : today > periodEnd ? periodEnd : today;
  const totalDays = Math.max(1, Math.floor((periodEnd.getTime() - periodStart.getTime()) / 86_400_000) + 1);
  const elapsedDays = Math.max(0, Math.floor((elapsedEnd.getTime() - periodStart.getTime()) / 86_400_000) + 1);
  const paceExpected = revenueMeta * (elapsedDays / totalDays);
  const projection = elapsedDays > 0 ? faturamento / elapsedDays * totalDays : 0;
  const paceDelta = paceExpected > 0 ? ((faturamento - paceExpected) / paceExpected) * 100 : 0;

  const conversionCards = [
    { label: "RM → RR", current: (itemsByIndicator.rr || []).length, previous: (itemsByIndicator.rm || []).length },
    { label: "RR → Proposta", current: (itemsByIndicator.proposta || []).length, previous: (itemsByIndicator.rr || []).length },
    { label: "Proposta → Venda", current: vendas.length, previous: (itemsByIndicator.proposta || []).length },
  ];

  const hotByCloser = useMemo(() => {
    const grouped = new Map<string, { name: string; count: number; value: number }>();
    for (const item of hotOpportunityItems) {
      const name = personName(item);
      const key = firstNameKey(name) || name.toLowerCase();
      const current = grouped.get(key) || { name, count: 0, value: 0 };
      current.count += 1;
      current.value += item.value || 0;
      if (name.length > current.name.length) current.name = name;
      grouped.set(key, current);
    }
    return Array.from(grouped.values()).sort((a, b) => b.value - a.value);
  }, [hotOpportunityItems]);

  const ranking = useMemo(() => {
    const factors = getMonthFactors(startDate, endDate);
    const grouped = new Map<string, { name: string; sales: number; revenue: number }>();
    for (const item of vendas) {
      const name = personName(item);
      const key = firstNameKey(name) || name.toLowerCase();
      const current = grouped.get(key) || { name, sales: 0, revenue: 0 };
      current.sales += 1;
      current.revenue += item.value || 0;
      if (name.length > current.name.length) current.name = name;
      grouped.set(key, current);
    }
    return Array.from(grouped.values())
      .map(row => {
        const monthly = getMonthlyMap(row.name);
        const meta = prorateMonthlyMeta(monthly.faturamento, factors);
        return { ...row, meta, percentage: meta > 0 ? row.revenue / meta * 100 : null };
      })
      .sort((a, b) => b.revenue - a.revenue);
  }, [vendas, startDate, endDate, getMonthlyMap]);

  const dailySeries = useMemo(() => {
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const keys: FunnelKey[] = ["rm", "rr", "proposta", "venda"];
    const running: Record<FunnelKey, number> = { rm: 0, rr: 0, proposta: 0, venda: 0 };
    return days.map(day => {
      const key = format(day, "yyyy-MM-dd");
      const row: Record<string, string | number> = { label: format(day, "dd/MM") };
      for (const indicator of keys) {
        const count = (itemsByIndicator[indicator] || []).filter(item => item.date?.slice(0, 10) === key).length;
        running[indicator] += count;
        row[indicator] = seriesMode === "accumulated" ? running[indicator] : count;
      }
      return row;
    });
  }, [itemsByIndicator, startDate, endDate, seriesMode]);

  const filters = [
    selectedBUs.length === 4 ? "Todas as BUs" : `${selectedBUs.length} BU(s)`,
    selectedClosers.length ? `${selectedClosers.length} closer(s)` : "Todos os closers",
    selectedSDRs.length ? `${selectedSDRs.length} SDR(s)` : "Todos os SDRs",
    selectedOrigens.length ? `${selectedOrigens.length} origem(ns)` : "Todas as origens",
  ];

  return (
    <section className="space-y-6" aria-busy={isLoading}>
      <header className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <Button variant="ghost" size="sm" className="-ml-3 gap-2" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" /> Voltar aos indicadores
          </Button>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">Performance de vendas</p>
            <h2 className="text-3xl font-bold text-foreground">Pace Comercial</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {format(startDate, "dd 'de' MMM", { locale: ptBR })} — {format(endDate, "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
        </div>
        <div className="flex max-w-2xl flex-wrap gap-2" aria-label="Filtros herdados">
          {filters.map(filter => <Badge key={filter} variant="secondary">{filter}</Badge>)}
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-primary/30 bg-primary/5 xl:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm text-muted-foreground"><WalletCards className="h-4 w-4 text-primary" /> Faturamento realizado</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div><p className="text-3xl font-bold tabular-nums">{currency(faturamento)}</p><p className="text-sm text-muted-foreground">de {currency(revenueMeta)} na meta</p></div>
              <Badge variant={paceDelta >= 0 ? "default" : "destructive"}>{paceDelta >= 0 ? "+" : ""}{percent(paceDelta)} vs pace</Badge>
            </div>
            <Progress value={Math.min(attainment, 100)} className="mt-5 h-2" />
            <div className="mt-3 flex justify-between text-xs text-muted-foreground"><span>{percent(attainment)} atingido</span><span>Pace esperado: {currency(paceExpected)}</span></div>
          </CardContent>
        </Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Vendas</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold tabular-nums">{vendas.length}</p><p className="mt-2 text-xs text-muted-foreground">Meta: {Math.round(funnelMetas.venda)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Ticket médio</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold tabular-nums">{compactCurrency(ticketMedio)}</p><p className="mt-2 text-xs text-muted-foreground">Projeção: {currency(projection)}</p></CardContent></Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader><CardTitle className="flex items-center gap-2"><Flame className="h-5 w-5 text-warning" /> Oportunidades quentes</CardTitle><p className="text-sm text-muted-foreground">Cards ativos do Modelo Atual marcados como Quente, dentro dos filtros selecionados.</p></CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <div><p className="text-xs text-muted-foreground">Pipeline quente</p><p className="text-2xl font-bold">{currency(hotTotal)}</p></div>
              <div><p className="text-xs text-muted-foreground">Oportunidades</p><p className="text-2xl font-bold">{hotOpportunityItems.length}</p></div>
              <div><p className="text-xs text-muted-foreground">Realizado + quentes</p><p className="text-2xl font-bold text-primary">{currency(faturamento + hotTotal)}</p></div>
            </div>
            {hotByCloser.length ? <div className="space-y-3">{hotByCloser.map(row => <div key={row.name} className="flex items-center justify-between border-t border-border pt-3"><div><p className="font-medium">{row.name}</p><p className="text-xs text-muted-foreground">{row.count} oportunidade(s)</p></div><p className="font-semibold tabular-nums">{currency(row.value)}</p></div>)}</div> : <p className="rounded-lg bg-muted/50 p-5 text-center text-sm text-muted-foreground">Sem oportunidades quentes nos filtros selecionados.</p>}
          </CardContent>
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader><CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-primary" /> Conversão do funil</CardTitle></CardHeader>
          <CardContent className="space-y-5">{conversionCards.map(item => { const value = conversion(item.current, item.previous); return <div key={item.label}><div className="mb-2 flex items-end justify-between"><div><p className="font-medium">{item.label}</p><p className="text-xs text-muted-foreground">{item.current} de {item.previous}</p></div><p className="text-xl font-bold">{percent(value)}</p></div><Progress value={Math.min(value, 100)} className="h-2" /></div>; })}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-primary" /> Ranking de closers</CardTitle><p className="text-sm text-muted-foreground">Ordenado por faturamento realizado; metas individuais são rateadas pelos dias úteis do período.</p></CardHeader>
        <CardContent>
          {ranking.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-muted-foreground"><th className="pb-3 font-medium">#</th><th className="pb-3 font-medium">Closer</th><th className="pb-3 text-right font-medium">Vendas</th><th className="pb-3 text-right font-medium">Faturamento</th><th className="pb-3 text-right font-medium">Meta</th><th className="pb-3 text-right font-medium">Atingimento</th></tr></thead><tbody>{ranking.map((row, index) => <tr key={row.name} className="border-b last:border-0"><td className="py-4"><Badge variant={index === 0 ? "default" : "outline"}>{index + 1}º</Badge></td><td className="py-4 font-medium">{row.name}</td><td className="py-4 text-right tabular-nums">{row.sales}</td><td className="py-4 text-right font-semibold tabular-nums">{currency(row.revenue)}</td><td className="py-4 text-right text-muted-foreground">{row.meta > 0 ? currency(row.meta) : "Sem meta"}</td><td className="py-4 text-right">{row.percentage === null ? "—" : percent(row.percentage)}</td></tr>)}</tbody></table></div> : <p className="py-8 text-center text-sm text-muted-foreground">Sem vendas atribuídas a closers no período.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4"><div><CardTitle>Evolução diária do funil</CardTitle><p className="mt-1 text-sm text-muted-foreground">RM, RR, propostas e vendas nos filtros selecionados.</p></div><ToggleGroup type="single" value={seriesMode} onValueChange={value => value && setSeriesMode(value as "daily" | "accumulated")}><ToggleGroupItem value="daily" aria-label="Exibir valores diários">Diária</ToggleGroupItem><ToggleGroupItem value="accumulated" aria-label="Exibir valores acumulados">Acumulada</ToggleGroupItem></ToggleGroup></CardHeader>
        <CardContent><div className="h-80 w-full"><ResponsiveContainer width="100%" height="100%">{seriesMode === "accumulated" ? <AreaChart data={dailySeries}><defs><linearGradient id="paceCommercialGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.35}/><stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))"/><XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}/><YAxis allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}/><Tooltip contentStyle={tooltipStyle}/><Legend/><Area type="monotone" dataKey="rm" name="RM" stroke="hsl(var(--chart-1))" fill="url(#paceCommercialGradient)"/><Area type="monotone" dataKey="rr" name="RR" stroke="hsl(var(--chart-2))" fill="transparent"/><Area type="monotone" dataKey="proposta" name="Proposta" stroke="hsl(var(--chart-3))" fill="transparent"/><Area type="monotone" dataKey="venda" name="Venda" stroke="hsl(var(--chart-4))" fill="transparent"/></AreaChart> : <BarChart data={dailySeries}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))"/><XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}/><YAxis allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}/><Tooltip contentStyle={tooltipStyle}/><Legend/><Bar dataKey="rm" name="RM" fill="hsl(var(--chart-1))"/><Bar dataKey="rr" name="RR" fill="hsl(var(--chart-2))"/><Bar dataKey="proposta" name="Proposta" fill="hsl(var(--chart-3))"/><Bar dataKey="venda" name="Venda" fill="hsl(var(--chart-4))"/></BarChart>}</ResponsiveContainer></div></CardContent>
      </Card>

      <div className="flex justify-end"><Button variant="outline" onClick={onBack} className="gap-2">Voltar aos indicadores <ArrowUpRight className="h-4 w-4" /></Button></div>
    </section>
  );
}