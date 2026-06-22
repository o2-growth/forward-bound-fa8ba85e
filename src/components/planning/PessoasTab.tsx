import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users, Clock, LogIn, LogOut, TrendingDown, DollarSign, Percent, Wallet, Building2, ChevronDown, ChevronRight, Info, ExternalLink } from "lucide-react";
import { startOfMonth, endOfMonth, format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DateRangePickerGA } from "./DateRangePickerGA";
import { useHrData } from "@/hooks/useHrData";
import { useOxyFinance } from "@/hooks/useOxyFinance";
import { usePersonnelCostByBu, type BuKey } from "@/hooks/usePersonnelCostByBu";
import { useDreDrillDown } from "@/hooks/useDreDrillDown";
import { cn } from "@/lib/utils";
import {
  AlertsBanner,
  TwelveMonthMovementChart,
  TwelveMonthCostByBu,
  CompositionCards,
  EfficiencyByBu,
  TenureExtremes,
  PeopleDrillSheet,
  usePeopleDrill,
  DeltaChip,
} from "./pessoas/PessoasExtras";
import { tenureDistribution, previousRange, personToBu, headcountByBu, turnoverByBu, allActiveWithBu, admissoesIn, desligadosIn, pessoasOfBu, type PessoaBu, PESSOA_BU_ORDER } from "./pessoas/helpers";
import { AgeDistribution } from "./pessoas/AgeDistribution";
import { FaseDoisRoadmap } from "./pessoas/FaseDoisRoadmap";
import { SaneamentoCard } from "./pessoas/SaneamentoCard";
import { CustoReceitaCharts } from "./pessoas/CustoReceitaCharts";

// Compat: alguns componentes ainda recebem só o nome do Time.
// Roteia via personToBu sem cargo (heurística por substring de Time).
function timeToBu(time: string): BuKey | "Outros" {
  const bu = personToBu(time, "");
  // PessoaBu → BuKey: mapeia "Corporativo" para "Outros" pra manter as APIs antigas
  if (bu === "Corporativo") return "Outros";
  return bu as BuKey;
}

const formatNumber = (n: number) => new Intl.NumberFormat("pt-BR").format(Math.round(n));
const formatPct = (n: number) => `${n.toFixed(1)}%`;
const formatYearsMonths = (days: number) => {
  if (!days || days <= 0) return "—";
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  if (years === 0) return `${months}m`;
  return `${years}a ${months}m`;
};
const formatCurrencyCompact = (v: number) => {
  if (!v) return "R$ 0";
  if (Math.abs(v) >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return `R$ ${v.toFixed(0)}`;
};

interface KpiProps {
  title: string;
  value: string;
  subtitle?: React.ReactNode;
  delta?: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "positive" | "warning" | "negative";
  isLoading?: boolean;
  onClick?: () => void;
}

function Kpi({ title, value, subtitle, delta, icon: Icon, tone = "default", isLoading, onClick }: KpiProps) {
  const toneClass =
    tone === "positive" ? "text-chart-2" :
    tone === "warning" ? "text-amber-500" :
    tone === "negative" ? "text-destructive" :
    "text-foreground";
  const interactive = !!onClick;
  return (
    <Card
      onClick={onClick}
      className={cn(interactive && "cursor-pointer hover:bg-muted/30 hover:border-primary/40 transition-colors")}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={interactive ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick?.(); } } : undefined}
    >
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        ) : (
          <div className="flex items-baseline gap-2">
            <div className={cn("text-2xl font-bold", toneClass)}>{value}</div>
            {delta}
          </div>
        )}
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}


interface CategoryDrillDownPanelProps {
  category: string;
  serie: { period: string; value: number }[];
  startDate: Date;
  endDate: Date;
  pessoasBu: Array<{ ID: string | number; Nome?: string; ["Título"]?: string; Cargo?: string; Time?: string }>;
  buLabel: string;
}

function CategoryDrillDownPanel({ category, serie, startDate, endDate, pessoasBu, buLabel }: CategoryDrillDownPanelProps) {
  const dd = useDreDrillDown({ category, startDate, endDate });
  const maxMes = Math.max(...serie.map((s) => s.value), 1);
  const maxItem = Math.max(...dd.items.map((i) => i.total), 1);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 p-3 border-t border-border/30">
      {/* Painel A: evolução mensal da categoria */}
      <div>
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Evolução mensal (Oxy)</p>
        {serie.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sem dados mensais.</p>
        ) : (
          <div className="space-y-1">
            {serie.map((s) => (
              <div key={s.period}>
                <div className="flex justify-between text-[11px] mb-0.5">
                  <span className="text-muted-foreground">{s.period}</span>
                  <span className="tabular-nums text-foreground">{formatCurrencyCompact(s.value)}</span>
                </div>
                <div className="h-1.5 bg-muted rounded overflow-hidden">
                  <div className="h-full bg-primary/80" style={{ width: `${(s.value / maxMes) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pessoas Pipefy — referência cruzada (sem valor monetário) */}
        <div className="mt-4">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">
            Pessoas no Pipefy do time {buLabel} ({pessoasBu.length})
          </p>
          {pessoasBu.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhuma pessoa mapeada.</p>
          ) : (
            <div className="max-h-32 overflow-y-auto">
              <table className="w-full text-[11px]">
                <tbody>
                  {pessoasBu.slice(0, 30).map((p) => (
                    <tr key={p.ID} className="border-b border-border/20 last:border-0">
                      <td className="py-1 text-foreground truncate max-w-[140px]">{p.Nome || p["Título"]}</td>
                      <td className="py-1 text-muted-foreground truncate">{p.Cargo || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {pessoasBu.length > 30 && (
                <p className="text-[10px] text-muted-foreground mt-1">+ {pessoasBu.length - 30} pessoas</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Painel B: Lançamentos reais por fornecedor/cliente (Oxy drill-down) */}
      <div>
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">
          Lançamentos reais (Oxy) {dd.items.length > 0 && `— ${dd.items.length} ${dd.items[0]?.type === "customer" ? "clientes" : "fornecedores"}`}
        </p>
        {dd.isLoading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Carregando lançamentos…
          </div>
        ) : dd.error ? (
          <p className="text-xs text-destructive">
            {dd.error.message || "Falha ao carregar lançamentos."}
          </p>
        ) : dd.items.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sem lançamentos no período.</p>
        ) : (
          <>
            <div className="text-[11px] text-muted-foreground mb-2">
              Soma: <span className="tabular-nums text-foreground font-medium">{formatCurrencyCompact(dd.total)}</span>
            </div>
            <div className="max-h-72 overflow-y-auto space-y-1.5">
              {dd.items.map((it) => {
                const pct = dd.total > 0 ? (it.total / dd.total) * 100 : 0;
                return (
                  <div key={it.label} className="text-[11px]">
                    <div className="flex justify-between mb-0.5">
                      <span className="text-foreground truncate pr-2" title={it.label}>{it.label}</span>
                      <span className="tabular-nums whitespace-nowrap">
                        {formatCurrencyCompact(it.total)}{" "}
                        <span className="text-muted-foreground">({pct.toFixed(1)}%)</span>
                      </span>
                    </div>
                    <div className="h-1.5 bg-muted rounded overflow-hidden">
                      <div className="h-full bg-chart-2/80" style={{ width: `${(it.total / maxItem) * 100}%` }} />
                    </div>
                    {it.serie.length > 1 && (
                      <div className="flex gap-1 mt-1 text-[10px] text-muted-foreground">
                        {it.serie.map((s) => (
                          <span key={s.period} className="tabular-nums">
                            {s.period}: {formatCurrencyCompact(s.value)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}


export function PessoasTab() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const hr = useHrData({ startDate: dateRange.from, endDate: dateRange.to });
  const oxy = useOxyFinance();
  const pc = usePersonnelCostByBu({ startDate: dateRange.from, endDate: dateRange.to });
  // Série fixa de 12 meses, independente do filtro — alimenta o gráfico 12m
  const range12m = useMemo(() => {
    const to = endOfMonth(dateRange.to);
    const from = startOfMonth(subMonths(to, 11));
    return { from, to };
  }, [dateRange.to]);
  const pc12m = usePersonnelCostByBu({ startDate: range12m.from, endDate: range12m.to });
  const [openBu, setOpenBu] = useState<string | null>(null);
  const [openCat, setOpenCat] = useState<string | null>(null);
  const [showCustoReceitaCharts, setShowCustoReceitaCharts] = useState(false);
  const drill = usePeopleDrill();

  // Período anterior (mesmo tamanho) — para Δ% nos KPIs
  const prevRange = useMemo(() => previousRange(dateRange.from, dateRange.to), [dateRange]);
  const hrPrev = useHrData({ startDate: prevRange.from, endDate: prevRange.to });
  const pcPrev = usePersonnelCostByBu({ startDate: prevRange.from, endDate: prevRange.to });

  // Receita mensal por "yyyy-MM" — para o stacked area 12m
  const receitaPorMes = useMemo(() => {
    const map: Record<string, number> = {};
    if (!oxy.dreByBU) return map;
    const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"] as const;
    const today = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = subMonths(today, i);
      const m = months[d.getMonth()];
      const key = format(d, "yyyy-MM");
      let total = 0;
      for (const bu of ["modelo_atual", "o2_tax", "oxy_hacker", "franquia"] as const) {
        total += (oxy.dreByBU as any)?.[bu]?.[m] || 0;
      }
      map[key] = total;
    }
    return map;
  }, [oxy.dreByBU]);


  // Receita do período (Oxy Finance) — soma dos meses cobertos no range
  const receitaPeriodo = useMemo(() => {
    if (!oxy.dreByBU) return 0;
    const fromIdx = dateRange.from.getMonth();
    const toIdx = dateRange.to.getMonth();
    const sameYear = dateRange.from.getFullYear() === dateRange.to.getFullYear();
    if (!sameYear) return 0;
    const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"] as const;
    let total = 0;
    for (let i = fromIdx; i <= toIdx; i++) {
      const m = months[i];
      for (const bu of ["modelo_atual", "o2_tax", "oxy_hacker", "franquia"] as const) {
        total += (oxy.dreByBU as any)?.[bu]?.[m] || 0;
      }
    }
    return total;
  }, [oxy.dreByBU, dateRange]);

  const top5Time = hr.headcountByTime.slice(0, 5);
  const top5Cargo = hr.headcountByCargo.slice(0, 8);
  const topTurnover = hr.turnoverByTime.filter(t => t.desligados > 0).slice(0, 5);

  // Headcount por BU usando personToBu (Time + Cargo)
  const headcountByArea = useMemo(
    () => headcountByBu(hr.rawPessoas).map((h) => ({ group: h.bu as string, count: h.count })),
    [hr.rawPessoas]
  );

  // Turnover por BU usando personToBu (Time + Cargo)
  const turnoverByArea = useMemo(
    () => turnoverByBu(hr.rawPessoas, dateRange.from, dateRange.to).map((t) => ({
      group: t.bu as string,
      desligados: t.desligados,
      headcount: t.headcount,
      pct: t.pct,
    })),
    [hr.rawPessoas, dateRange]
  );
  const topTurnoverArea = turnoverByArea.filter(t => t.desligados > 0);


  return (
    <div className="space-y-6">
      {/* Header + filtro */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-xl">Pessoas — Performance</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Fase 1: Headcount, movimentação e custo de pessoal · Fonte: Pipefy (DB Pessoas) + Oxy Finance
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Período:</span>
              <DateRangePickerGA
                startDate={dateRange.from}
                endDate={dateRange.to}
                onDateChange={(start, end) => setDateRange({ from: start, to: end })}
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Alertas e insights automáticos */}
      <AlertsBanner
        turnoverGeral={hr.turnoverGeral}
        custoSobreReceita={receitaPeriodo > 0 ? (pc.total / receitaPeriodo) * 100 : 0}
        tempoMedioDias={hr.tempoMedioDeCasaDias}
        topTurnoverArea={turnoverByArea}
        desligadosNoPeriodo={hr.desligadosNoPeriodo}
        tenureBuckets={tenureDistribution(hr.rawPessoas).map(t => ({ bucket: t.bucket, count: t.count }))}
        headcountTotal={hr.headcountTotal}
      />


      {/* 3.1 Headcount & movimentação */}
      <div>
        <h3 className="text-lg font-semibold mb-3">3.1 Headcount e movimentação</h3>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Kpi
            title="Headcount atual"
            value={formatNumber(hr.headcountTotal)}
            subtitle="Pessoas com Situação = Ativo · clique p/ ver lista"
            icon={Users}
            isLoading={hr.isLoading}
            onClick={() => drill.open({
              kind: "people",
              title: "Headcount atual",
              subtitle: `${hr.headcountTotal} pessoa(s) ativa(s)`,
              people: allActiveWithBu(hr.rawPessoas),
            })}
          />
          <Kpi
            title="Tempo médio de casa"
            value={formatYearsMonths(hr.tempoMedioDeCasaDias)}
            subtitle={`${Math.round(hr.tempoMedioDeCasaDias)} dias em média · clique p/ ranking`}
            icon={Clock}
            isLoading={hr.isLoading}
            onClick={() => drill.open({
              kind: "people",
              title: "Tempo de casa — ranking",
              subtitle: "Pessoas ativas ordenadas por tempo na empresa (desc)",
              people: allActiveWithBu(hr.rawPessoas),
            })}
          />
          <Kpi
            title="Admissões no período"
            value={formatNumber(hr.admissoesNoPeriodo)}
            subtitle={`${format(dateRange.from, "dd/MM", { locale: ptBR })} – ${format(dateRange.to, "dd/MM", { locale: ptBR })} · clique p/ ver`}
            icon={LogIn}
            tone="positive"
            isLoading={hr.isLoading}
            delta={<DeltaChip current={hr.admissoesNoPeriodo} previous={hrPrev.admissoesNoPeriodo} />}
            onClick={() => drill.open({
              kind: "people",
              title: "Admissões no período",
              subtitle: `${hr.admissoesNoPeriodo} pessoa(s) admitida(s) entre ${format(dateRange.from, "dd/MM/yy")} e ${format(dateRange.to, "dd/MM/yy")}`,
              people: admissoesIn(hr.rawPessoas, dateRange.from, dateRange.to).map((p) => ({
                ...p,
                extra: p.dataContratacao ? `Admitido em ${format(new Date(p.dataContratacao), "dd/MM/yyyy")}` : undefined,
              })),
            })}
          />
          <Kpi
            title="Desligados no período"
            value={formatNumber(hr.desligadosNoPeriodo)}
            subtitle="Situação = Inativo (proxy updated_at) · clique p/ ver"
            icon={LogOut}
            tone={hr.desligadosNoPeriodo > 0 ? "negative" : "default"}
            isLoading={hr.isLoading}
            delta={<DeltaChip current={hr.desligadosNoPeriodo} previous={hrPrev.desligadosNoPeriodo} invert />}
            onClick={() => drill.open({
              kind: "people",
              title: "Desligados no período",
              subtitle: `${hr.desligadosNoPeriodo} desligado(s) entre ${format(dateRange.from, "dd/MM/yy")} e ${format(dateRange.to, "dd/MM/yy")}`,
              people: desligadosIn(hr.rawPessoas, dateRange.from, dateRange.to).map((p) => ({
                ...p,
                extra: p.updatedAt ? `Última atualização ${format(new Date(p.updatedAt), "dd/MM/yyyy")}` : undefined,
              })),
            })}
          />
          <Kpi
            title="Turnover geral"
            value={formatPct(hr.turnoverGeral)}
            subtitle="Desligados ÷ Headcount médio · clique p/ ver por BU"
            icon={TrendingDown}
            tone={hr.turnoverGeral > 5 ? "negative" : hr.turnoverGeral > 2 ? "warning" : "positive"}
            isLoading={hr.isLoading}
            delta={<DeltaChip current={hr.turnoverGeral} previous={hrPrev.turnoverGeral} invert formatter={(n) => `${n.toFixed(1)}%`} />}
            onClick={() => {
              const tByBu = turnoverByBu(hr.rawPessoas, dateRange.from, dateRange.to);
              drill.open({
                kind: "metrics",
                title: "Turnover por BU",
                subtitle: `Período: ${format(dateRange.from, "dd/MM/yy")} – ${format(dateRange.to, "dd/MM/yy")}`,
                rows: tByBu.map((t) => ({
                  label: t.bu,
                  value: formatPct(t.pct),
                  hint: `${t.desligados} desligado(s) · headcount ${t.headcount}`,
                  pct: Math.min(100, t.pct * 5),
                  tone: t.pct > 10 ? "negative" : t.pct > 5 ? "warning" : t.pct > 0 ? "default" : "positive",
                })),
                footer: "Denominador = (headcount + desligados) ÷ 2 por BU. Mapeamento Time+Cargo via personToBu (Hipótese A).",
              });
            }}
          />
        </div>


        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
          {/* Headcount por Time */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Headcount por Time</CardTitle>
            </CardHeader>
            <CardContent>
              {hr.isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : top5Time.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem dados</p>
              ) : (
                <div className="space-y-2">
                  {top5Time.map(({ group, count }) => {
                    const pct = hr.headcountTotal > 0 ? (count / hr.headcountTotal) * 100 : 0;
                    return (
                      <div key={group}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-foreground">{group}</span>
                          <span className="font-medium">{count}</span>
                        </div>
                        <div className="h-2 bg-muted rounded overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Headcount por Cargo */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Top Cargos</CardTitle>
            </CardHeader>
            <CardContent>
              {hr.isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : top5Cargo.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem dados</p>
              ) : (
                <div className="space-y-2 text-sm">
                  {top5Cargo.map(({ group, count }) => (
                    <div key={group} className="flex justify-between border-b border-border pb-1">
                      <span className="text-foreground truncate pr-2">{group}</span>
                      <span className="font-medium tabular-nums">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Turnover por Time */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Turnover por Time</CardTitle>
            </CardHeader>
            <CardContent>
              {hr.isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : topTurnover.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum desligamento no período</p>
              ) : (
                <div className="space-y-2 text-sm">
                  {topTurnover.map(t => (
                    <div key={t.group} className="flex justify-between items-center border-b border-border pb-1">
                      <span className="text-foreground truncate pr-2">{t.group}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{t.desligados}/{t.headcount}</span>
                        <span className={cn(
                          "font-medium tabular-nums",
                          t.pct > 10 ? "text-destructive" : t.pct > 5 ? "text-amber-500" : "text-chart-2"
                        )}>{formatPct(t.pct)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Headcount por Área (derivado de Time → BU) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Headcount por Área</CardTitle>
              <p className="text-xs text-muted-foreground">Área inferida do Time (Pipefy não expõe Área).</p>
            </CardHeader>
            <CardContent>
              {hr.isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : headcountByArea.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem dados</p>
              ) : (
                <div className="space-y-2">
                  {headcountByArea.map(({ group, count }) => {
                    const pct = hr.headcountTotal > 0 ? (count / hr.headcountTotal) * 100 : 0;
                    return (
                      <div key={group}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-foreground">{group}</span>
                          <span className="font-medium">{count} <span className="text-muted-foreground text-xs">({pct.toFixed(0)}%)</span></span>
                        </div>
                        <div className="h-2 bg-muted rounded overflow-hidden">
                          <div className="h-full bg-chart-2" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Turnover por Área */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Turnover por Área</CardTitle>
              <p className="text-xs text-muted-foreground">Área inferida do Time.</p>
            </CardHeader>
            <CardContent>
              {hr.isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : topTurnoverArea.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum desligamento no período</p>
              ) : (
                <div className="space-y-2 text-sm">
                  {topTurnoverArea.map(t => (
                    <div key={t.group} className="flex justify-between items-center border-b border-border pb-1">
                      <span className="text-foreground truncate pr-2">{t.group}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{t.desligados}/{t.headcount}</span>
                        <span className={cn(
                          "font-medium tabular-nums",
                          t.pct > 10 ? "text-destructive" : t.pct > 5 ? "text-amber-500" : "text-chart-2"
                        )}>{formatPct(t.pct)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>


      {/* 3.2 Custo de pessoal */}
      <div>
        <h3 className="text-lg font-semibold mb-3">3.2 Custo de pessoal</h3>

        {(() => {
          const headcountMedio = (hr.headcountTotal + Math.max(hr.headcountTotal - hr.admissoesNoPeriodo + hr.desligadosNoPeriodo, 0)) / 2;
          const custoTotal = pc.total;
          const custoSobreReceita = receitaPeriodo > 0 ? (custoTotal / receitaPeriodo) * 100 : 0;
          const custoPerCapita = headcountMedio > 0 ? custoTotal / headcountMedio : 0;
          

          return (
            <>
              {/* Banner: origem dos números */}
              <div className="mb-3 rounded border border-blue-500/40 bg-blue-500/5 p-3 text-xs text-blue-700 dark:text-blue-400 flex items-start gap-2">
                <Info className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <strong>Origem dos números:</strong> custo por BU vem direto das categorias da Oxy DRE (ex: "Equipe CaaS", "Benefícios - SaaS").
                  CS é considerado parte de <strong>CaaS</strong>, e categorias corporativas (Pró-labore, Terceiros, RH/Fin/C-level) também são roladas em <strong>CaaS</strong>. Zero rateio inventado.
                </div>
              </div>

              {/* KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <Kpi
                  title="Custo de pessoal total"
                  value={formatCurrencyCompact(custoTotal)}
                  subtitle={`${pc.porBu.length} BU${pc.porBu.length === 1 ? "" : "s"} · clique p/ breakdown`}
                  icon={DollarSign}
                  isLoading={pc.isLoading}
                  delta={<DeltaChip current={custoTotal} previous={pcPrev.total} invert />}
                  onClick={() => {
                    const buRows = [...pc.porBu, ...(pc.corporativo.total > 0 ? [pc.corporativo] : [])];
                    drill.open({
                      kind: "metrics",
                      title: "Custo de pessoal — por BU",
                      subtitle: `Total ${formatCurrencyCompact(custoTotal)} · fonte: Oxy DRE`,
                      rows: buRows.map((b) => ({
                        label: b.bu,
                        value: formatCurrencyCompact(b.total),
                        hint: `${b.categorias.length} categoria(s)`,
                        secondary: custoTotal > 0 ? `${((b.total / custoTotal) * 100).toFixed(1)}% do total` : undefined,
                        pct: custoTotal > 0 ? (b.total / custoTotal) * 100 : 0,
                      })),
                      footer: "Categorias detalhadas no card 'Custo de pessoal por BU' abaixo.",
                    });
                  }}
                />
                <Kpi
                  title={`Custo / Receita ${showCustoReceitaCharts ? "▾" : "▸"}`}
                  value={custoTotal > 0 && receitaPeriodo > 0 ? formatPct(custoSobreReceita) : "—"}
                  subtitle={`Receita do período: ${formatCurrencyCompact(receitaPeriodo)} · clique p/ ${showCustoReceitaCharts ? "fechar" : "ver gráficos"}`}
                  icon={Percent}
                  tone={custoSobreReceita > 60 ? "negative" : custoSobreReceita > 40 ? "warning" : "positive"}
                  isLoading={pc.isLoading || oxy.isLoading}
                  onClick={() => setShowCustoReceitaCharts((v) => !v)}
                />

                <Kpi
                  title="Custo per capita"
                  value={custoPerCapita > 0 ? formatCurrencyCompact(custoPerCapita) : "—"}
                  subtitle={`Headcount médio: ${formatNumber(headcountMedio)} · clique p/ ver por BU`}
                  icon={Wallet}
                  isLoading={pc.isLoading || hr.isLoading}
                  delta={<DeltaChip current={custoPerCapita} previous={pcPrev.total / Math.max(hrPrev.headcountTotal, 1)} invert />}
                  onClick={() => {
                    const buRows = [...pc.porBu, ...(pc.corporativo.total > 0 ? [pc.corporativo] : [])];
                    const hcMap = new Map(headcountByBu(hr.rawPessoas).map((h) => [h.bu as string, h.count]));
                    drill.open({
                      kind: "metrics",
                      title: "Custo per capita por BU",
                      subtitle: `Média geral: ${formatCurrencyCompact(custoPerCapita)}`,
                      rows: buRows.map((b) => {
                        const hc = hcMap.get(b.bu) || 0;
                        const perCap = hc > 0 ? b.total / hc : 0;
                        return {
                          label: b.bu,
                          value: perCap > 0 ? formatCurrencyCompact(perCap) : "—",
                          hint: `${hc} pessoa(s) · custo ${formatCurrencyCompact(b.total)}`,
                          pct: custoPerCapita > 0 ? (perCap / (custoPerCapita * 2)) * 100 : 0,
                        };
                      }).sort((a, b) => {
                        const va = parseFloat(a.value.replace(/[^\d.,]/g, "").replace(",", ".")) || 0;
                        const vb = parseFloat(b.value.replace(/[^\d.,]/g, "").replace(",", ".")) || 0;
                        return vb - va;
                      }),
                      footer: "Headcount por BU calculado via personToBu (Time + Cargo).",
                    });
                  }}
                />

                <Kpi
                  title="Custo de turnover"
                  value={formatCurrencyCompact(pc.custoTurnover.total)}
                  subtitle={
                    pc.custoTurnover.total > 0
                      ? `${hr.desligadosNoPeriodo} desligado(s) · ${custoTotal > 0 ? ((pc.custoTurnover.total / custoTotal) * 100).toFixed(1) : "0"}% do custo`
                      : "Sem rescisões no período"
                  }
                  icon={LogOut}
                  tone={
                    pc.custoTurnover.total === 0 ? "default" :
                    custoTotal > 0 && (pc.custoTurnover.total / custoTotal) > 0.05 ? "negative" : "warning"
                  }
                  isLoading={pc.isLoading}
                  delta={<DeltaChip current={pc.custoTurnover.total} previous={pcPrev.custoTurnover.total} invert />}
                />
                {pc.corporativo.total > 0 && (
                  <Kpi
                    title="Corporativo (não-BU)"
                    value={formatCurrencyCompact(pc.corporativo.total)}
                    subtitle="Pró-labore, terceiros, RH/Fin/C-level"
                    icon={Building2}
                    isLoading={pc.isLoading}
                  />
                )}
              </div>

              {showCustoReceitaCharts && (
                <CustoReceitaCharts
                  porBu={pc12m.porBu}
                  corporativo={pc12m.corporativo}
                  receitaPorMes={receitaPorMes}
                  oxyDreByBU={oxy.dreByBU}
                />
              )}




              {/* Card 1: Custo de pessoal por BU (com drill-down) */}
              <Card className="mt-4">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Custo de pessoal por BU</CardTitle>
                  <p className="text-xs text-muted-foreground">Click numa BU para ver as categorias reais da Oxy</p>
                </CardHeader>
                <CardContent>
                  {pc.isLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : pc.porBu.length === 0 && pc.corporativo.total === 0 ? (
                    <p className="text-sm text-muted-foreground">Sem dados de pessoal no período.</p>
                  ) : (
                    <div className="space-y-2">
                      {[...pc.porBu, ...(pc.corporativo.total > 0 ? [pc.corporativo] : [])].map((b) => {
                        const max = Math.max(...[...pc.porBu, ...(pc.corporativo.total > 0 ? [pc.corporativo] : [])].map((x) => x.total), 1);
                        const width = (b.total / max) * 100;
                        const isOpen = openBu === b.bu;
                        return (
                          <div key={b.bu} className="border border-border/40 rounded">
                            <button
                              type="button"
                              className="w-full p-2 hover:bg-muted/40 transition-colors"
                              onClick={() => setOpenBu(isOpen ? null : b.bu)}
                            >
                              <div className="flex justify-between text-sm mb-1 items-center">
                                <span className="flex items-center gap-1 text-foreground">
                                  {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                  {b.bu}
                                  <span className="text-xs text-muted-foreground">({b.categorias.length} categorias)</span>
                                </span>
                                <span className="font-medium tabular-nums">
                                  {formatCurrencyCompact(b.total)}
                                  {custoTotal > 0 && (
                                    <span className="text-muted-foreground text-xs ml-1">
                                      ({((b.total / custoTotal) * 100).toFixed(1)}%)
                                    </span>
                                  )}
                                </span>
                              </div>
                              <div className="h-2 bg-muted rounded overflow-hidden">
                                <div
                                  className={cn(
                                    "h-full",
                                    b.bu === "Corporativo" ? "bg-muted-foreground/60" : "bg-primary"
                                  )}
                                  style={{ width: `${width}%` }}
                                />
                              </div>
                            </button>
                            {isOpen && b.categorias.length > 0 && (
                              <div className="px-3 pb-3 pt-1 border-t border-border/40 bg-muted/20 space-y-1">
                                {b.categorias.map((c) => {
                                  const catKey = `${b.bu}::${c.label}`;
                                  const catOpen = openCat === catKey;
                                  // Pessoas do Pipefy nesse BU
                                  const pessoasBu = b.bu === "Corporativo"
                                    ? hr.rawPessoas.filter((p) => {
                                        const sit = (p["Situação"] || "").toLowerCase();
                                        if (sit && sit !== "ativo") return false;
                                        return timeToBu(p.Time || "") === "Outros";
                                      })
                                    : hr.rawPessoas.filter((p) => {
                                        const sit = (p["Situação"] || "").toLowerCase();
                                        if (sit && sit !== "ativo") return false;
                                        return timeToBu(p.Time || "") === b.bu;
                                      });
                                  return (
                                    <div key={c.label} className="border border-border/30 rounded bg-background/50">
                                      <button
                                        type="button"
                                        className="w-full flex justify-between items-center px-2 py-1.5 text-xs hover:bg-muted/40"
                                        onClick={(e) => { e.stopPropagation(); setOpenCat(catOpen ? null : catKey); }}
                                      >
                                        <span className="flex items-center gap-1 text-muted-foreground">
                                          {catOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                          {c.label}
                                        </span>
                                        <span className="tabular-nums text-foreground">{formatCurrencyCompact(c.valor)}</span>
                                      </button>
                                      {catOpen && (
                                        <CategoryDrillDownPanel
                                          category={c.label}
                                          serie={c.serie}
                                          startDate={dateRange.from}
                                          endDate={dateRange.to}
                                          pessoasBu={pessoasBu}
                                          buLabel={b.bu}
                                        />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Card 2 + 3: Custo médio por pessoa + Composição corporativa */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Custo médio por pessoa (por BU)</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Custo da BU (Oxy) ÷ headcount do Time (Pipefy). Times mapeados por substring do nome.
                    </p>
                  </CardHeader>
                  <CardContent>
                    {pc.isLoading || hr.isLoading ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border text-[11px] text-muted-foreground text-left">
                              <th className="py-2 pr-3 font-medium">BU</th>
                              <th className="py-2 px-3 font-medium text-right">Headcount</th>
                              <th className="py-2 px-3 font-medium text-right">Custo</th>
                              <th className="py-2 pl-3 font-medium text-right">/ pessoa</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[...pc.porBu, ...(pc.corporativo.total > 0 ? [pc.corporativo] : [])].map((b) => {
                              // Headcount = soma dos Times cujo nome casa com a BU
                              const hc = hr.headcountByTime
                                .filter((h) => {
                                  const bu = timeToBu(h.group);
                                  if (b.bu === "Corporativo") return bu === "Outros";
                                  return bu === b.bu;
                                })
                                .reduce((s, h) => s + h.count, 0);
                              const medio = hc > 0 ? b.total / hc : 0;
                              return (
                                <tr key={b.bu} className="border-b border-border/50">
                                  <td className="py-2 pr-3 text-foreground">{b.bu}</td>
                                  <td className="py-2 px-3 text-right tabular-nums text-muted-foreground">{hc || "—"}</td>
                                  <td className="py-2 px-3 text-right tabular-nums text-foreground">{formatCurrencyCompact(b.total)}</td>
                                  <td className="py-2 pl-3 text-right tabular-nums font-medium text-foreground">
                                    {hc > 0 ? formatCurrencyCompact(medio) : "—"}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {pc.corporativo.categorias.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Composição Corporativo</CardTitle>
                    <p className="text-xs text-muted-foreground">Categorias dentro de "Despesas com Pessoal" (não-BU)</p>
                  </CardHeader>
                  <CardContent>
                      <div className="space-y-2">
                        {pc.corporativo.categorias.map((c) => {
                          const max = pc.corporativo.categorias[0]?.valor || 1;
                          const width = (c.valor / max) * 100;
                          const pct = pc.corporativo.total > 0 ? (c.valor / pc.corporativo.total) * 100 : 0;
                          return (
                            <div key={c.label}>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-foreground truncate pr-2">{c.label}</span>
                                <span className="font-medium tabular-nums">
                                  {formatCurrencyCompact(c.valor)}{" "}
                                  <span className="text-muted-foreground text-xs">({pct.toFixed(1)}%)</span>
                                </span>
                              </div>
                              <div className="h-2 bg-muted rounded overflow-hidden">
                                <div className="h-full bg-muted-foreground/60" style={{ width: `${width}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                  </CardContent>
                </Card>
                )}
              </div>
            </>
          );
        })()}
      </div>

      {/* ─── Bloco 1: Evolução 12 meses ─── */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Evolução 12 meses</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TwelveMonthMovementChart rows={hr.rawPessoas} />
          <TwelveMonthCostByBu porBu={pc12m.porBu} corporativo={pc12m.corporativo} receitaPorMes={receitaPorMes} />
        </div>
      </div>

      {/* ─── Bloco 2: Composição do time ─── */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Composição do time</h3>
        <CompositionCards rows={hr.rawPessoas} monthDate={dateRange.from} />
      </div>

      {/* ─── Bloco 3: Eficiência por BU ─── */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Eficiência por BU</h3>
        <EfficiencyByBu
          rows={[...pc.porBu, ...(pc.corporativo.total > 0 ? [pc.corporativo] : [])].map((b) => {
            const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"] as const;
            const sumMonths = (src: Record<string, number> | undefined): number => {
              if (!src || dateRange.from.getFullYear() !== dateRange.to.getFullYear()) return 0;
              let total = 0;
              for (let i = dateRange.from.getMonth(); i <= dateRange.to.getMonth(); i++) {
                total += src[months[i]] || 0;
              }
              return total;
            };
            let receita = 0;
            if (b.bu === "CaaS") receita = sumMonths(oxy.caasByMonth);
            else if (b.bu === "SaaS") receita = sumMonths(oxy.saasByMonth);
            else if (b.bu === "TAX") receita = sumMonths(oxy.dreByBU?.o2_tax);
            else if (b.bu === "Expansão") {
              receita = sumMonths(oxy.dreByBU?.oxy_hacker) + sumMonths(oxy.dreByBU?.franquia);
            }
            const hc = hr.headcountByTime
              .filter((h) => {
                const bu = timeToBu(h.group);
                if (b.bu === "Corporativo") return bu === "Outros";
                return bu === b.bu;
              })
              .reduce((s, h) => s + h.count, 0);
            return { bu: b.bu, headcount: hc, receita, custo: b.total };
          })}
        />
      </div>

      {/* ─── Bloco: Distribuição etária ─── */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Perfil demográfico</h3>
        <AgeDistribution rows={hr.rawPessoas} />
      </div>

      {/* ─── Bloco 4: Top tenure / mais recentes + drill-down ─── */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Reconhecimento e onboarding</h3>
        <TenureExtremes rows={hr.rawPessoas} />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Explorar pessoas por Time / BU</h3>
        <Card>
          <CardContent className="p-4 flex flex-wrap gap-2">
            {headcountByArea.map((a) => (
              <button
                key={`area-${a.group}`}
                onClick={() => drill.open({
                  kind: "people",
                  title: `BU: ${a.group}`,
                  subtitle: `${a.count} pessoa(s) ativa(s)`,
                  people: pessoasOfBu(hr.rawPessoas, a.group as PessoaBu),
                })}
                className="text-xs px-2.5 py-1 rounded border border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary inline-flex items-center gap-1"
              >
                {a.group} · {a.count} <ExternalLink className="h-3 w-3" />
              </button>
            ))}
            {hr.headcountByTime.map((t) => (
              <button
                key={`time-${t.group}`}
                onClick={() => drill.open({
                  kind: "people",
                  title: `Time: ${t.group}`,
                  subtitle: `${t.count} pessoa(s) ativa(s)`,
                  people: allActiveWithBu(hr.rawPessoas).filter((p) => p.time === t.group),
                })}
                className="text-xs px-2.5 py-1 rounded border border-border hover:bg-muted inline-flex items-center gap-1"
              >
                {t.group} · {t.count} <ExternalLink className="h-3 w-3" />
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* ─── Fase 2: Roadmap + Saneamento ─── */}
      <div>
        <h3 className="text-lg font-semibold mb-1">Fase 2 — o que falta para fechar o painel</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Indicadores planejados que ainda dependem de dados ou processos. Use o saneamento para destravar o turnover voluntário/involuntário.
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <FaseDoisRoadmap
              desligadosNoPeriodo={hr.desligadosNoPeriodo}
              headcountAtual={hr.headcountTotal}
              custoPessoalTotal={pc.total}
            />
          </div>
          <SaneamentoCard rows={hr.rawPessoas} />
        </div>
      </div>

      <PeopleDrillSheet state={drill.state} onClose={drill.close} />
    </div>
  );
}
