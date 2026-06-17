import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users, Clock, LogIn, LogOut, TrendingDown, DollarSign, Percent, Wallet, AlertTriangle, Info } from "lucide-react";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DateRangePickerGA } from "./DateRangePickerGA";
import { useHrData } from "@/hooks/useHrData";
import { useOxyFinance } from "@/hooks/useOxyFinance";
import { usePersonnelCostFromDRE } from "@/hooks/usePersonnelCostFromDRE";
import { cn } from "@/lib/utils";

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
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "positive" | "warning" | "negative";
  isLoading?: boolean;
}

function Kpi({ title, value, subtitle, icon: Icon, tone = "default", isLoading }: KpiProps) {
  const toneClass =
    tone === "positive" ? "text-chart-2" :
    tone === "warning" ? "text-amber-500" :
    tone === "negative" ? "text-destructive" :
    "text-foreground";
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        ) : (
          <div className={cn("text-2xl font-bold", toneClass)}>{value}</div>
        )}
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

export function PessoasTab() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const hr = useHrData({ startDate: dateRange.from, endDate: dateRange.to });
  const oxy = useOxyFinance();
  const pc = usePersonnelCostFromDRE({ startDate: dateRange.from, endDate: dateRange.to });

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

      {/* 3.1 Headcount & movimentação */}
      <div>
        <h3 className="text-lg font-semibold mb-3">3.1 Headcount e movimentação</h3>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Kpi
            title="Headcount atual"
            value={formatNumber(hr.headcountTotal)}
            subtitle="Pessoas com Situação = Ativo"
            icon={Users}
            isLoading={hr.isLoading}
          />
          <Kpi
            title="Tempo médio de casa"
            value={formatYearsMonths(hr.tempoMedioDeCasaDias)}
            subtitle={`${Math.round(hr.tempoMedioDeCasaDias)} dias em média`}
            icon={Clock}
            isLoading={hr.isLoading}
          />
          <Kpi
            title="Admissões no período"
            value={formatNumber(hr.admissoesNoPeriodo)}
            subtitle={`${format(dateRange.from, "dd/MM", { locale: ptBR })} – ${format(dateRange.to, "dd/MM", { locale: ptBR })}`}
            icon={LogIn}
            tone="positive"
            isLoading={hr.isLoading}
          />
          <Kpi
            title="Desligados no período"
            value={formatNumber(hr.desligadosNoPeriodo)}
            subtitle="Situação = Inativo (aprox. via updated_at)"
            icon={LogOut}
            tone={hr.desligadosNoPeriodo > 0 ? "negative" : "default"}
            isLoading={hr.isLoading}
          />
          <Kpi
            title="Turnover geral"
            value={formatPct(hr.turnoverGeral)}
            subtitle="Desligados ÷ Headcount médio"
            icon={TrendingDown}
            tone={hr.turnoverGeral > 5 ? "negative" : hr.turnoverGeral > 2 ? "warning" : "positive"}
            isLoading={hr.isLoading}
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
        </div>
      </div>

      {/* 3.2 Custo de pessoal */}
      <div>
        <h3 className="text-lg font-semibold mb-3">3.2 Custo de pessoal</h3>

        {(() => {
          const headcountMedio = (hr.headcountTotal + Math.max(hr.headcountTotal - hr.admissoesNoPeriodo + hr.desligadosNoPeriodo, 0)) / 2;
          const custoComMatch = pc.custoTotalComMatch;
          const custoSobreReceita = receitaPeriodo > 0 ? (custoComMatch / receitaPeriodo) * 100 : 0;
          const custoPerCapita = headcountMedio > 0 ? custoComMatch / headcountMedio : 0;
          const pctSemMatch = pc.custoTotalGeral > 0 ? (pc.custoTotalSemMatch / pc.custoTotalGeral) * 100 : 0;
          const topPessoa = pc.custoPorPessoa.slice(0, 20);
          const maxValorPessoa = topPessoa[0]?.valor || 1;

          return (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Kpi
                  title="Custo de pessoal (com match)"
                  value={formatCurrencyCompact(custoComMatch)}
                  subtitle={`${pc.custoPorPessoa.length} pessoas vinculadas`}
                  icon={DollarSign}
                  isLoading={pc.isLoading}
                />
                <Kpi
                  title="Custo / Receita"
                  value={custoComMatch > 0 && receitaPeriodo > 0 ? formatPct(custoSobreReceita) : "—"}
                  subtitle={`Receita do período: ${formatCurrencyCompact(receitaPeriodo)}`}
                  icon={Percent}
                  tone={custoSobreReceita > 60 ? "negative" : custoSobreReceita > 40 ? "warning" : "positive"}
                  isLoading={pc.isLoading || oxy.isLoading}
                />
                <Kpi
                  title="Custo per capita"
                  value={custoPerCapita > 0 ? formatCurrencyCompact(custoPerCapita) : "—"}
                  subtitle={`Headcount médio: ${formatNumber(headcountMedio)}`}
                  icon={Wallet}
                  isLoading={pc.isLoading || hr.isLoading}
                />
                <Kpi
                  title="Lançamentos sem match"
                  value={formatCurrencyCompact(pc.custoTotalSemMatch)}
                  subtitle={`${pc.lancamentosSemMatch.length} fornecedores · ${formatPct(pctSemMatch)} do total`}
                  icon={AlertTriangle}
                  tone={pctSemMatch > 10 ? "warning" : "default"}
                  isLoading={pc.isLoading}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                {/* Custo por pessoa */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Top 20 — Custo por pessoa</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {pc.isLoading ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : topPessoa.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhum lançamento vinculado a funcionário no período.</p>
                    ) : (
                      <div className="space-y-2 max-h-96 overflow-auto">
                        {topPessoa.map((p) => {
                          const pct = (p.valor / maxValorPessoa) * 100;
                          const pctTotal = custoComMatch > 0 ? (p.valor / custoComMatch) * 100 : 0;
                          return (
                            <div key={p.pessoaId}>
                              <div className="flex justify-between text-sm mb-1">
                                <div className="truncate pr-2">
                                  <span className="text-foreground font-medium">{p.pessoaNome}</span>
                                  <span className="ml-2 text-xs text-muted-foreground">{p.pessoaTime} · {p.pessoaCargo}</span>
                                </div>
                                <div className="text-right tabular-nums whitespace-nowrap">
                                  <span className="font-medium">{formatCurrencyCompact(p.valor)}</span>
                                  <span className="ml-2 text-xs text-muted-foreground">{formatPct(pctTotal)}</span>
                                </div>
                              </div>
                              <div className="h-1.5 bg-muted rounded overflow-hidden">
                                <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Custo por time */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Custo por Time</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {pc.isLoading ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : pc.custoPorTime.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Sem dados.</p>
                    ) : (
                      <div className="space-y-2">
                        {pc.custoPorTime.map((t) => {
                          const pct = custoComMatch > 0 ? (t.valor / custoComMatch) * 100 : 0;
                          return (
                            <div key={t.time}>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-foreground">{t.time} <span className="text-xs text-muted-foreground">({t.pessoas})</span></span>
                                <span className="font-medium tabular-nums">{formatCurrencyCompact(t.valor)} · {formatPct(pct)}</span>
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
              </div>

              {/* Lançamentos sem match */}
              {pc.lancamentosSemMatch.length > 0 && (
                <Card className="mt-4 border-amber-500/40 bg-amber-500/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Info className="h-4 w-4 text-amber-500" />
                      Lançamentos sem match ({pc.lancamentosSemMatch.length}) · {formatCurrencyCompact(pc.custoTotalSemMatch)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground mb-2">
                      Fornecedores que não casaram com nenhum funcionário do Pipefy DB Pessoas pelo nome.
                      Pode ser despesa não-pessoal (fornecedor real) ou divergência de grafia / cadastro faltando.
                    </p>
                    <div className="space-y-1 text-sm max-h-64 overflow-auto">
                      {pc.lancamentosSemMatch.slice(0, 50).map((g, i) => (
                        <div key={`${g.fornecedorLabel}-${i}`} className="flex justify-between items-center border-b border-border pb-1">
                          <span className="truncate pr-2 text-foreground">{g.fornecedorLabel}</span>
                          <span className="font-medium tabular-nums text-xs">{formatCurrencyCompact(g.valor)}</span>
                        </div>
                      ))}
                      {pc.lancamentosSemMatch.length > 50 && (
                        <p className="text-xs text-muted-foreground pt-2">… +{pc.lancamentosSemMatch.length - 50} fornecedores</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          );
        })()}
      </div>
    </div>
  );
}
