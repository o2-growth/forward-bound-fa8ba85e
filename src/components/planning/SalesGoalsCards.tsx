import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Target, Building2, DollarSign, Expand } from "lucide-react";
import { DashboardBUConfig, DashboardBUKey, formatCurrency, formatCompact, months } from "./salesData";

interface SalesGoalsCardsProps {
  buConfigs: DashboardBUConfig[];
  projectedData: Record<DashboardBUKey, Record<string, number>>;
  realizedByBU: Record<DashboardBUKey, Record<string, number>>;
  calculateBUTotal: (bu: DashboardBUKey) => number;
  calculateBURealized: (bu: DashboardBUKey) => number;
  selectedBU: DashboardBUKey | 'all';
  isLoading: boolean;
}

const buIcons: Record<DashboardBUKey, React.ReactNode> = {
  modelo_atual: <Building2 className="h-5 w-5" />,
  o2_tax: <DollarSign className="h-5 w-5" />,
  expansao_o2: <Expand className="h-5 w-5" />,
};

export function SalesGoalsCards({
  buConfigs,
  projectedData,
  realizedByBU,
  calculateBUTotal,
  calculateBURealized,
  selectedBU,
  isLoading,
}: SalesGoalsCardsProps) {
  const filteredBUs = selectedBU === 'all' ? buConfigs : buConfigs.filter(bu => bu.key === selectedBU);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredBUs.map((bu) => {
        const projected = calculateBUTotal(bu.key);
        const realized = calculateBURealized(bu.key);
        const rate = projected > 0 ? (realized / projected) * 100 : 0;
        const gap = projected - realized;
        const isPositive = rate >= 80;
        const isWarning = rate >= 50 && rate < 80;

        return (
          <Card 
            key={bu.key} 
            className={`glass-card transition-all hover:scale-[1.02] ${
              isPositive 
                ? 'border-success/30' 
                : isWarning 
                  ? 'border-warning/30' 
                  : 'border-destructive/30'
            }`}
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between">
                <div className={`flex items-center gap-2 ${bu.colorClass}`}>
                  {buIcons[bu.key]}
                  <span className="font-display text-base">{bu.label}</span>
                </div>
                <Badge 
                  variant="outline" 
                  className={`${
                    isPositive 
                      ? 'bg-success/10 text-success border-success/30' 
                      : isWarning 
                        ? 'bg-warning/10 text-warning border-warning/30' 
                        : 'bg-destructive/10 text-destructive border-destructive/30'
                  }`}
                >
                  {rate.toFixed(1)}%
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : (
                <>
                  {/* Progress bar */}
                  <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${
                        isPositive 
                          ? 'bg-success' 
                          : isWarning 
                            ? 'bg-warning' 
                            : 'bg-destructive'
                      }`}
                      style={{ width: `${Math.min(rate, 100)}%` }}
                    />
                  </div>

                  {/* Values */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Previsto</p>
                      <p className="font-display font-bold">{formatCompact(projected)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Realizado</p>
                      <p className="font-display font-bold">{formatCompact(realized)}</p>
                    </div>
                  </div>

                  {/* Gap */}
                  <div className="pt-2 border-t border-border/50">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Gap</span>
                      <span className={`flex items-center gap-1 text-sm font-medium ${
                        gap <= 0 ? 'text-success' : 'text-muted-foreground'
                      }`}>
                        {gap <= 0 ? (
                          <TrendingUp className="h-4 w-4" />
                        ) : (
                          <Target className="h-4 w-4" />
                        )}
                        {formatCompact(Math.abs(gap))}
                        {gap <= 0 && ' acima'}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Consolidated Card when showing all */}
      {selectedBU === 'all' && (
        <Card className="glass-card col-span-full lg:col-span-3 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Target className="h-5 w-5" />
              <span className="font-display">Consolidado Total</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {buConfigs.map((bu) => {
                  const projected = calculateBUTotal(bu.key);
                  const realized = calculateBURealized(bu.key);
                  const rate = projected > 0 ? (realized / projected) * 100 : 0;

                  return (
                    <div 
                      key={bu.key}
                      className="p-4 rounded-lg bg-background/50 border border-border/50"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: bu.color }}
                        />
                        <span className="text-sm font-medium">{bu.label}</span>
                      </div>
                      <p className="font-display text-lg font-bold">{formatCompact(realized)}</p>
                      <p className="text-xs text-muted-foreground">
                        {rate.toFixed(1)}% da meta
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
