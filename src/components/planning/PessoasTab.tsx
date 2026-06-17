import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users, Clock, LogIn, LogOut, TrendingDown, DollarSign, Percent, Wallet, AlertTriangle } from "lucide-react";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DateRangePickerGA } from "./DateRangePickerGA";
import { useHrData } from "@/hooks/useHrData";
import { useOxyFinance } from "@/hooks/useOxyFinance";
import { usePersonnelCostFromDRE } from "@/hooks/usePersonnelCostFromDRE";
import { DreMappingPanel } from "./DreMappingPanel";
import { DreGroupsSelector } from "./DreGroupsSelector";
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
          const custoTotal = pc.custoTotalPeriodo;
          const custoSobreReceita = receitaPeriodo > 0 ? (custoTotal / receitaPeriodo) * 100 : 0;
          const custoPerCapita = headcountMedio > 0 ? custoTotal / headcountMedio : 0;
          

          return (
            <>
              {/* Seletor de grupos DRE */}
              <div className="mb-3">
                <DreGroupsSelector
                  allGroups={pc.allDreGroups}
                  selectedIds={pc.selectedGroupIds}
                  autoDetectedIds={pc.autoDetectedGroupIds}
                  onSave={pc.saveSelectedGroups}
                  isSaving={pc.isSavingGroups}
                  forceOpen={pc.gruposPessoal.length === 0 && pc.allDreGroups.length > 0}
                />
              </div>

              {/* Banner: nenhum grupo detectado */}
              {pc.gruposPessoal.length === 0 && pc.allDreGroups.length > 0 && (
                <div className="mb-3 rounded border border-amber-500/40 bg-amber-500/5 p-3 text-sm text-amber-700 dark:text-amber-400">
                  <strong>Nenhum grupo de Pessoal detectado automaticamente.</strong> Abra o painel acima e marque manualmente quais grupos da DRE representam custo de pessoal.
                </div>
              )}



              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Kpi
                  title="Custo de pessoal total"
                  value={formatCurrencyCompact(custoTotal)}
                  subtitle={`${formatCurrencyCompact(pc.custoMapeado)} mapeado · ${formatCurrencyCompact(pc.custoPendente)} pendente`}
                  icon={DollarSign}
                  isLoading={pc.isLoading}
                />
                <Kpi
                  title="Custo / Receita"
                  value={custoTotal > 0 && receitaPeriodo > 0 ? formatPct(custoSobreReceita) : "—"}
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
                  title="Custo de turnover"
                  value={formatCurrencyCompact(pc.custoRescisaoPeriodo)}
                  subtitle="Categoria Rescisões (DRE)"
                  icon={AlertTriangle}
                  tone={pc.custoRescisaoPeriodo > 0 ? "warning" : "default"}
                  isLoading={pc.isLoading}
                />
              </div>

              {/* Mapeamento DRE → Pessoa */}
              <div className="mt-4">
                <DreMappingPanel
                  categorias={pc.categorias}
                  pendentes={pc.pendentes}
                  mapeadas={pc.mapeadas}
                  ignoradas={pc.ignoradas}
                  pessoas={hr.rawPessoas}
                  hasGroupsConfigured={pc.gruposPessoal.length > 0}
                />
              </div>

              {/* Composição por categoria + Custo por Time */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Composição por categoria DRE</CardTitle>
                    <p className="text-xs text-muted-foreground">Do que é feito o custo de pessoal no período (fonte: Oxy DRE)</p>
                  </CardHeader>
                  <CardContent>
                    {pc.composicao.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Sem categorias no período.</p>
                    ) : (
                      <div className="space-y-2">
                        {pc.composicao.slice(0, 10).map((c) => {
                          const max = pc.composicao[0]?.valor || 1;
                          const width = (c.valor / max) * 100;
                          return (
                            <div key={c.label}>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-foreground truncate pr-2">{c.label}</span>
                                <span className="font-medium tabular-nums">
                                  {formatCurrencyCompact(c.valor)} <span className="text-muted-foreground text-xs">({c.pct.toFixed(1)}%)</span>
                                </span>
                              </div>
                              <div className="h-2 bg-muted rounded overflow-hidden">
                                <div className="h-full bg-primary" style={{ width: `${width}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Custo por Time</CardTitle>
                    <p className="text-xs text-muted-foreground">Aplicando o rateio % das categorias mapeadas</p>
                  </CardHeader>
                  <CardContent>
                    {pc.custoPorTime.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Distribua categorias entre Times no painel abaixo para visualizar.</p>
                    ) : (
                      <div className="space-y-2">
                        {pc.custoPorTime.map((t) => {
                          const max = pc.custoPorTime[0]?.valor || 1;
                          const pct = (t.valor / max) * 100;
                          return (
                            <div key={t.time}>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-foreground truncate pr-2">{t.time}</span>
                                <span className="font-medium tabular-nums">{formatCurrencyCompact(t.valor)}</span>
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

              {/* Custo médio por pessoa (por Time) */}
              <Card className="mt-4">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Custo médio por pessoa (por Time)</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Estimativa: custo do Time ÷ headcount ativo. A Oxy não expõe fornecedor por lançamento, então este valor é uma média — não o salário real individual.
                  </p>
                </CardHeader>
                <CardContent>
                  {pc.custoPorTime.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Mapeie categorias primeiro.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border text-[11px] text-muted-foreground text-left">
                            <th className="py-2 pr-3 font-medium">Time</th>
                            <th className="py-2 px-3 font-medium text-right">Headcount ativo</th>
                            <th className="py-2 px-3 font-medium text-right">Custo total</th>
                            <th className="py-2 pl-3 font-medium text-right">Custo médio / pessoa</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pc.custoPorTime.map((t) => {
                            const headcountTime = hr.headcountByTime.find((h) => h.group === t.time)?.count || 0;
                            const medio = headcountTime > 0 ? t.valor / headcountTime : 0;
                            return (
                              <tr key={t.time} className="border-b border-border/50">
                                <td className="py-2 pr-3 text-foreground">{t.time}</td>
                                <td className="py-2 px-3 text-right tabular-nums text-muted-foreground">{headcountTime || "—"}</td>
                                <td className="py-2 px-3 text-right tabular-nums text-foreground">{formatCurrencyCompact(t.valor)}</td>
                                <td className="py-2 pl-3 text-right tabular-nums font-medium text-foreground">
                                  {headcountTime > 0 ? formatCurrencyCompact(medio) : "—"}
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
            </>
          );
        })()}
      </div>
    </div>
  );
}
