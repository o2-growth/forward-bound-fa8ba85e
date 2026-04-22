import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Wallet, CalendarDays } from "lucide-react";
import { differenceInDays } from "date-fns";

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(1)}k`;
  return `R$ ${value.toFixed(0)}`;
}

function formatCurrencyFull(value: number): string {
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

interface InvestmentForecastProps {
  currentSpend: number;
  budgetGoal: number;
  dateRange: { from: Date; to: Date };
}

export function InvestmentForecast({ currentSpend, budgetGoal, dateRange }: InvestmentForecastProps) {
  const forecast = useMemo(() => {
    const today = new Date();
    const periodStart = dateRange.from;
    const periodEnd = dateRange.to;

    const totalDays = differenceInDays(periodEnd, periodStart) + 1;
    // Clamp "today" to the period range
    const effectiveToday = today < periodStart ? periodStart : today > periodEnd ? periodEnd : today;
    const daysElapsed = differenceInDays(effectiveToday, periodStart) + 1;
    const daysRemaining = Math.max(0, differenceInDays(periodEnd, effectiveToday));

    const dailyAverage = daysElapsed > 0 ? currentSpend / daysElapsed : 0;
    const projectedSpend = currentSpend + dailyAverage * daysRemaining;
    const budgetAvailable = budgetGoal - currentSpend;
    const isOverBudget = projectedSpend > budgetGoal;
    const spendPercentage = budgetGoal > 0 ? (currentSpend / budgetGoal) * 100 : 0;
    const projectedPercentage = budgetGoal > 0 ? (projectedSpend / budgetGoal) * 100 : 0;

    return {
      totalDays,
      daysElapsed,
      daysRemaining,
      dailyAverage,
      projectedSpend,
      budgetAvailable,
      isOverBudget,
      spendPercentage,
      projectedPercentage,
    };
  }, [currentSpend, budgetGoal, dateRange]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Wallet className="h-5 w-5 text-muted-foreground" />
            Previsão de Investimento
          </CardTitle>
          <Badge
            variant={forecast.isOverBudget ? "destructive" : "default"}
            className="text-xs"
          >
            {forecast.isOverBudget ? (
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Acima do orçamento
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <TrendingDown className="h-3 w-3" />
                Dentro do orçamento
              </span>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main metrics grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Gasto Atual</p>
            <p className="text-lg font-bold">{formatCurrency(currentSpend)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Média Diária</p>
            <p className="text-lg font-bold">{formatCurrency(forecast.dailyAverage)}<span className="text-xs font-normal text-muted-foreground">/dia</span></p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Projeção Fim do Período</p>
            <p className={`text-lg font-bold ${forecast.isOverBudget ? "text-destructive" : "text-emerald-500"}`}>
              {formatCurrency(forecast.projectedSpend)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Meta de Orçamento</p>
            <p className="text-lg font-bold">{formatCurrency(budgetGoal)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Orçamento Disponível</p>
            <p className={`text-lg font-bold ${forecast.budgetAvailable >= 0 ? "text-emerald-500" : "text-destructive"}`}>
              {formatCurrency(Math.abs(forecast.budgetAvailable))}
              {forecast.budgetAvailable < 0 && (
                <span className="text-xs font-normal ml-1">excedido</span>
              )}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Gasto vs Orçamento</span>
            <span>{forecast.spendPercentage.toFixed(1)}%</span>
          </div>
          <div className="relative h-3 bg-muted rounded-full overflow-hidden">
            {/* Actual spend bar */}
            <div
              className={`absolute h-full rounded-full transition-all ${
                forecast.spendPercentage > 100
                  ? "bg-destructive"
                  : forecast.spendPercentage > 80
                  ? "bg-amber-500"
                  : "bg-emerald-500"
              }`}
              style={{ width: `${Math.min(forecast.spendPercentage, 100)}%` }}
            />
            {/* Projected spend marker */}
            {forecast.projectedPercentage <= 150 && (
              <div
                className={`absolute top-0 h-full w-0.5 ${forecast.isOverBudget ? "bg-destructive" : "bg-emerald-700"}`}
                style={{ left: `${Math.min(forecast.projectedPercentage, 100)}%` }}
                title={`Projeção: ${formatCurrencyFull(forecast.projectedSpend)}`}
              />
            )}
          </div>
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              Baseado no ritmo de {forecast.daysElapsed} {forecast.daysElapsed === 1 ? "dia" : "dias"}
              {forecast.daysRemaining > 0 && ` — ${forecast.daysRemaining} ${forecast.daysRemaining === 1 ? "dia" : "dias"} restantes`}
            </p>
            {forecast.projectedPercentage <= 150 && (
              <p className="text-[11px] text-muted-foreground">
                Projeção: {forecast.projectedPercentage.toFixed(0)}% da meta
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
