import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Copy, ArrowUp, ArrowDown, Cake, Trophy, Sparkles } from "lucide-react";
import { ComposedChart, Bar, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart } from "recharts";
import { format, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  build12mHistory,
  tenureDistribution,
  seniorityDistribution,
  SENIORITY_ORDER,
  anniversariesInMonth,
  topTenure,
  bottomTenure,
  pessoasOfTime,
  pessoasOfArea,
  formatTenureShort,
} from "./helpers";
import type { PessoaRow } from "@/hooks/useHrData";
import { toast } from "@/hooks/use-toast";

const fmtCurrency = (v: number) => {
  if (!v) return "R$ 0";
  if (Math.abs(v) >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return `R$ ${v.toFixed(0)}`;
};
const fmtNumber = (n: number) => new Intl.NumberFormat("pt-BR").format(Math.round(n));
const fmtPct = (n: number) => `${n.toFixed(1)}%`;

// ─────────── Banner de alertas ───────────

interface AlertsBannerProps {
  turnoverGeral: number;
  custoSobreReceita: number;
  tempoMedioDias: number;
  topTurnoverArea: { group: string; desligados: number; pct: number }[];
  desligadosNoPeriodo: number;
  tenureBuckets: { bucket: string; count: number }[];
  headcountTotal: number;
}

export function AlertsBanner({
  turnoverGeral,
  custoSobreReceita,
  tempoMedioDias,
  topTurnoverArea,
  desligadosNoPeriodo,
  tenureBuckets,
  headcountTotal,
}: AlertsBannerProps) {
  const alerts: Array<{ tone: "red" | "amber" | "green"; msg: string }> = [];

  if (turnoverGeral > 5) alerts.push({ tone: "red", msg: `Turnover geral ${fmtPct(turnoverGeral)} acima de 5% — atenção à retenção` });
  if (custoSobreReceita > 60) alerts.push({ tone: "red", msg: `Custo/Receita ${fmtPct(custoSobreReceita)} acima de 60%` });
  for (const t of topTurnoverArea) {
    if (t.desligados >= 2) alerts.push({ tone: "amber", msg: `${t.desligados} desligamentos em ${t.group}` });
  }
  if (tempoMedioDias > 0 && tempoMedioDias < 365) {
    alerts.push({ tone: "amber", msg: `Tempo médio de casa ${formatTenureShort(tempoMedioDias)} — base recente` });
  }
  const calouros = tenureBuckets.find((b) => b.bucket === "<6m")?.count || 0;
  if (headcountTotal > 0 && calouros / headcountTotal > 0.3) {
    alerts.push({ tone: "amber", msg: `${calouros} pessoas (${((calouros / headcountTotal) * 100).toFixed(0)}%) com menos de 6 meses` });
  }
  if (desligadosNoPeriodo === 0) alerts.push({ tone: "green", msg: "Nenhum desligamento no período — saúde ok" });

  if (alerts.length === 0) return null;

  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Alertas e insights</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {alerts.map((a, i) => {
            const cls =
              a.tone === "red" ? "bg-destructive/10 text-destructive border-destructive/30" :
              a.tone === "amber" ? "bg-amber-500/10 text-amber-600 border-amber-500/30" :
              "bg-chart-2/10 text-chart-2 border-chart-2/30";
            const Icon = a.tone === "green" ? CheckCircle2 : AlertTriangle;
            return (
              <div key={i} className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded border ${cls}`}>
                <Icon className="h-3 w-3" />
                {a.msg}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────── 12m: Headcount + Movimentação ───────────

export function TwelveMonthMovementChart({ rows }: { rows: PessoaRow[] }) {
  const data = useMemo(() => build12mHistory(rows, 12), [rows]);
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Evolução de Headcount — últimos 12 meses</CardTitle>
        <p className="text-xs text-muted-foreground">Linha = headcount no fim do mês · Barras = admissões (verde) e desligamentos (vermelho)</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }}
              formatter={(v: number, name: string) => [fmtNumber(v), name]}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar yAxisId="right" dataKey="admissoes" name="Admissões" fill="hsl(var(--chart-2))" />
            <Bar yAxisId="right" dataKey="desligados" name="Desligamentos" fill="hsl(var(--destructive))" />
            <Line yAxisId="left" type="monotone" dataKey="headcount" name="Headcount" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ─────────── 12m: Custo por BU (stacked area) ───────────

interface CostStackedProps {
  porBu: Array<{ bu: string; categorias: { serie: { period: string; value: number }[] }[] }>;
  corporativo: { categorias: { serie: { period: string; value: number }[] }[] };
  receitaPorMes: Record<string, number>; // "yyyy-MM" -> receita
}

export function TwelveMonthCostByBu({ porBu, corporativo, receitaPorMes }: CostStackedProps) {
  const data = useMemo(() => {
    const allPeriods = new Set<string>();
    const allBuckets: Array<{ key: string; serie: Record<string, number> }> = [];
    for (const b of porBu) {
      const serie: Record<string, number> = {};
      for (const cat of b.categorias) for (const s of cat.serie) {
        serie[s.period] = (serie[s.period] || 0) + s.value;
        allPeriods.add(s.period);
      }
      allBuckets.push({ key: b.bu, serie });
    }
    const corp: Record<string, number> = {};
    for (const cat of corporativo.categorias) for (const s of cat.serie) {
      corp[s.period] = (corp[s.period] || 0) + s.value;
      allPeriods.add(s.period);
    }
    allBuckets.push({ key: "Corporativo", serie: corp });

    const periods = Array.from(allPeriods).sort();
    return periods.map((p) => {
      const row: any = { period: p, label: p.replace(/^\d{4}-/, "") + "/" + p.slice(2, 4) };
      for (const b of allBuckets) row[b.key] = b.serie[p] || 0;
      row.Receita = receitaPorMes[p] || 0;
      return row;
    });
  }, [porBu, corporativo, receitaPorMes]);

  const buColors: Record<string, string> = {
    CaaS: "hsl(var(--chart-1))",
    SaaS: "hsl(var(--chart-2))",
    TAX: "hsl(var(--chart-3))",
    "Expansão": "hsl(var(--chart-4))",
    CS: "hsl(var(--chart-5))",
    Education: "hsl(var(--primary))",
    Corporativo: "hsl(var(--muted-foreground))",
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Custo de pessoal por BU — 12 meses</CardTitle>
        <p className="text-xs text-muted-foreground">Áreas empilhadas = custo · Linha tracejada = receita do mês</p>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem dados.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtCurrency} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }}
                formatter={(v: number, name: string) => [fmtCurrency(v), name]}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {Object.keys(buColors).map((bu) =>
                porBu.some((b) => b.bu === bu) || bu === "Corporativo" ? (
                  <Area key={bu} type="monotone" dataKey={bu} stackId="1" stroke={buColors[bu]} fill={buColors[bu]} fillOpacity={0.6} />
                ) : null
              )}
              <Line type="monotone" dataKey="Receita" stroke="hsl(var(--foreground))" strokeDasharray="5 5" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

// ─────────── Tenure buckets + seniority + aniversários ───────────

export function CompositionCards({ rows, monthDate }: { rows: PessoaRow[]; monthDate: Date }) {
  const tenure = useMemo(() => tenureDistribution(rows), [rows]);
  const seniority = useMemo(() => seniorityDistribution(rows), [rows]);
  const aniversarios = useMemo(() => anniversariesInMonth(rows, monthDate), [rows, monthDate]);
  const total = tenure.reduce((s, t) => s + t.count, 0);
  const seniorityTotal = seniority.reduce((s, x) => s + x.count, 0);
  const calourosPct = total > 0 ? ((tenure.find((t) => t.bucket === "<6m")?.count || 0) / total) * 100 : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Tempo de casa</CardTitle>
          <p className="text-xs text-muted-foreground">Distribuição dos {total} ativos</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {tenure.map((t) => {
              const pct = total > 0 ? (t.count / total) * 100 : 0;
              return (
                <div key={t.bucket}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-foreground">{t.bucket}</span>
                    <span className="font-medium tabular-nums">{t.count} <span className="text-muted-foreground text-xs">({pct.toFixed(0)}%)</span></span>
                  </div>
                  <div className="h-2 bg-muted rounded overflow-hidden">
                    <div className={`h-full ${t.bucket === "<6m" ? "bg-amber-500" : "bg-primary"}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          {calourosPct > 30 && (
            <div className="mt-3 text-xs text-amber-600 flex items-center gap-1.5">
              <AlertTriangle className="h-3 w-3" /> {calourosPct.toFixed(0)}% com menos de 6 meses — risco de turnover precoce.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Pirâmide de senioridade</CardTitle>
          <p className="text-xs text-muted-foreground">Inferida do campo Cargo</p>
        </CardHeader>
        <CardContent>
          {seniority.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem dados</p>
          ) : (
            <div className="space-y-2">
              {SENIORITY_ORDER.filter((s) => seniority.some((x) => x.level === s)).map((level) => {
                const item = seniority.find((x) => x.level === level)!;
                const pct = seniorityTotal > 0 ? (item.count / seniorityTotal) * 100 : 0;
                return (
                  <div key={level} className="flex items-center gap-2">
                    <span className="text-xs w-20 text-muted-foreground">{level}</span>
                    <div className="flex-1 h-3 bg-muted rounded overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-medium tabular-nums w-16 text-right">{item.count} ({pct.toFixed(0)}%)</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Cake className="h-4 w-4 text-primary" /> Aniversários de casa</CardTitle>
          <p className="text-xs text-muted-foreground">Em {format(monthDate, "MMMM/yyyy", { locale: ptBR })}</p>
        </CardHeader>
        <CardContent>
          {aniversarios.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ninguém faz aniversário de casa este mês.</p>
          ) : (
            <div className="space-y-1.5">
              {aniversarios.map((a, i) => (
                <div key={i} className="flex justify-between items-center text-sm border-b border-border/30 pb-1.5 last:border-0">
                  <div className="min-w-0">
                    <div className="text-foreground truncate">{a.nome}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{a.cargo}</div>
                  </div>
                  <Badge variant="secondary" className="ml-2 shrink-0">{a.anos} ano{a.anos > 1 ? "s" : ""}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────── Eficiência por BU ───────────

interface EfficiencyRow {
  bu: string;
  headcount: number;
  receita: number;
  custo: number;
}

export function EfficiencyByBu({ rows }: { rows: EfficiencyRow[] }) {
  const enriched = useMemo(() => rows.map((r) => {
    const receitaPP = r.headcount > 0 ? r.receita / r.headcount : 0;
    const custoPP = r.headcount > 0 ? r.custo / r.headcount : 0;
    const margemPP = receitaPP - custoPP;
    const custoRec = r.receita > 0 ? (r.custo / r.receita) * 100 : 0;
    return { ...r, receitaPP, custoPP, margemPP, custoRec };
  }).sort((a, b) => b.margemPP - a.margemPP), [rows]);

  const maxReceitaPP = Math.max(...enriched.map((r) => r.receitaPP), 1);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Eficiência por BU</CardTitle>
          <p className="text-xs text-muted-foreground">Receita e custo pessoal ÷ headcount do Time</p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-[10px] text-muted-foreground text-left uppercase tracking-wide">
                  <th className="py-2 pr-2">BU</th>
                  <th className="py-2 px-1 text-right">HC</th>
                  <th className="py-2 px-1 text-right">Receita</th>
                  <th className="py-2 px-1 text-right">Custo</th>
                  <th className="py-2 px-1 text-right">Rec/Pess.</th>
                  <th className="py-2 px-1 text-right">Custo/Pess.</th>
                  <th className="py-2 px-1 text-right">Margem/Pess.</th>
                  <th className="py-2 pl-1 text-right">Custo/Rec</th>
                </tr>
              </thead>
              <tbody>
                {enriched.map((r) => {
                  const margemTone = r.margemPP < 0 ? "text-destructive" : r.margemPP > (enriched[0]?.margemPP || 0) * 0.5 ? "text-chart-2" : "text-foreground";
                  const custoRecTone = r.custoRec > 60 ? "text-destructive" : r.custoRec > 40 ? "text-amber-500" : "text-chart-2";
                  return (
                    <tr key={r.bu} className="border-b border-border/40">
                      <td className="py-2 pr-2 text-foreground font-medium">{r.bu}</td>
                      <td className="py-2 px-1 text-right tabular-nums">{r.headcount || "—"}</td>
                      <td className="py-2 px-1 text-right tabular-nums">{fmtCurrency(r.receita)}</td>
                      <td className="py-2 px-1 text-right tabular-nums">{fmtCurrency(r.custo)}</td>
                      <td className="py-2 px-1 text-right tabular-nums">{r.headcount > 0 ? fmtCurrency(r.receitaPP) : "—"}</td>
                      <td className="py-2 px-1 text-right tabular-nums">{r.headcount > 0 ? fmtCurrency(r.custoPP) : "—"}</td>
                      <td className={`py-2 px-1 text-right tabular-nums font-medium ${margemTone}`}>{r.headcount > 0 ? fmtCurrency(r.margemPP) : "—"}</td>
                      <td className={`py-2 pl-1 text-right tabular-nums font-medium ${custoRecTone}`}>{r.receita > 0 ? fmtPct(r.custoRec) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Receita por pessoa</CardTitle>
          <p className="text-xs text-muted-foreground">Quanto cada pessoa da BU "produz" de receita no período</p>
        </CardHeader>
        <CardContent>
          {enriched.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem dados</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={enriched} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={fmtCurrency} />
                <YAxis type="category" dataKey="bu" tick={{ fontSize: 11 }} width={80} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }}
                  formatter={(v: number) => fmtCurrency(v)}
                />
                <Bar dataKey="receitaPP" name="Receita/pessoa" fill="hsl(var(--chart-2))" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────── Top tenure / mais recentes ───────────

export function TenureExtremes({ rows }: { rows: PessoaRow[] }) {
  const tops = useMemo(() => topTenure(rows, 5), [rows]);
  const news = useMemo(() => bottomTenure(rows, 5), [rows]);

  const Row = ({ p }: { p: { nome: string; cargo: string; dias: number; data: Date } }) => (
    <div className="flex justify-between items-center text-sm border-b border-border/30 pb-1.5 last:border-0">
      <div className="min-w-0">
        <div className="text-foreground truncate">{p.nome}</div>
        <div className="text-[11px] text-muted-foreground truncate">{p.cargo} · desde {format(p.data, "MMM/yy", { locale: ptBR })}</div>
      </div>
      <span className="text-xs font-medium tabular-nums ml-2 shrink-0">{formatTenureShort(p.dias)}</span>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Trophy className="h-4 w-4 text-amber-500" /> Maior tempo de casa</CardTitle>
        </CardHeader>
        <CardContent>
          {tops.length === 0 ? <p className="text-sm text-muted-foreground">Sem dados</p> :
            <div className="space-y-1.5">{tops.map((p, i) => <Row key={i} p={p} />)}</div>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Mais recentes (onboarding)</CardTitle>
        </CardHeader>
        <CardContent>
          {news.length === 0 ? <p className="text-sm text-muted-foreground">Sem dados</p> :
            <div className="space-y-1.5">{news.map((p, i) => <Row key={i} p={p} />)}</div>}
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────── Drill-down: lista de pessoas em Time/Área ───────────

interface DrillState { open: boolean; type: "time" | "area"; key: string; }

export function usePeopleDrill() {
  const [state, setState] = useState<DrillState>({ open: false, type: "time", key: "" });
  return {
    open: (type: "time" | "area", key: string) => setState({ open: true, type, key }),
    close: () => setState((s) => ({ ...s, open: false })),
    state,
  };
}

interface DrillSheetProps {
  state: DrillState;
  onClose: () => void;
  rows: PessoaRow[];
  timeToBu: (t: string) => string;
}

export function PeopleDrillSheet({ state, onClose, rows, timeToBu }: DrillSheetProps) {
  const list = useMemo(() => {
    if (!state.open) return [];
    return state.type === "time" ? pessoasOfTime(rows, state.key) : pessoasOfArea(rows, state.key, timeToBu);
  }, [state, rows, timeToBu]);

  const copyEmails = async () => {
    const emails = list.map((p) => p.email).filter(Boolean).join("; ");
    if (!emails) {
      toast({ title: "Sem e-mails", description: "Ninguém da lista tem E-mail O2 cadastrado." });
      return;
    }
    await navigator.clipboard.writeText(emails);
    toast({ title: "E-mails copiados", description: `${list.filter((p) => p.email).length} endereços para o clipboard.` });
  };

  return (
    <Sheet open={state.open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{state.type === "time" ? "Time" : "Área"}: {state.key}</SheetTitle>
          <SheetDescription>{list.length} pessoa(s) ativa(s)</SheetDescription>
        </SheetHeader>
        <div className="mt-4 flex items-center justify-end">
          <Button size="sm" variant="outline" onClick={copyEmails}><Copy className="h-3 w-3 mr-1" /> Copiar e-mails</Button>
        </div>
        <div className="mt-3">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-[10px] uppercase text-muted-foreground text-left">
                <th className="py-2 pr-2">Nome</th>
                <th className="py-2 px-1">Cargo</th>
                <th className="py-2 px-1">Time</th>
                <th className="py-2 px-1 text-right">Casa</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id} className="border-b border-border/30">
                  <td className="py-2 pr-2 text-foreground">
                    <div className="font-medium">{p.nome}</div>
                    {p.email && <div className="text-[10px] text-muted-foreground">{p.email}</div>}
                  </td>
                  <td className="py-2 px-1 text-muted-foreground">{p.cargo}</td>
                  <td className="py-2 px-1 text-muted-foreground">{p.time}</td>
                  <td className="py-2 px-1 text-right tabular-nums">{formatTenureShort(p.dias)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length === 0 && <p className="text-sm text-muted-foreground mt-4 text-center">Sem pessoas.</p>}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─────────── KPI delta chip ───────────

export function DeltaChip({ current, previous, invert = false, formatter = fmtNumber }: { current: number; previous: number; invert?: boolean; formatter?: (n: number) => string }) {
  if (!previous || previous === 0) return null;
  const delta = current - previous;
  const pct = (delta / Math.abs(previous)) * 100;
  if (Math.abs(pct) < 0.1) return null;
  const positive = invert ? delta < 0 : delta > 0;
  const cls = positive ? "text-chart-2" : "text-destructive";
  const Icon = delta > 0 ? ArrowUp : ArrowDown;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${cls}`}>
      <Icon className="h-2.5 w-2.5" /> {Math.abs(pct).toFixed(1)}%
    </span>
  );
}
