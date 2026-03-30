import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MONTHS, type BuType, type MonthType } from "@/hooks/useMonetaryMetas";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const BU_LABELS: Record<BuType, string> = {
  modelo_atual: 'CaaS (Modelo Atual)',
  o2_tax: 'Tax (O2 Tax)',
  oxy_hacker: 'SaaS (Oxy Hacker)',
  franquia: 'Expansão (Franquia)',
};

const BUS: BuType[] = ['modelo_atual', 'o2_tax', 'oxy_hacker', 'franquia'];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
}

interface MetaVsRealizedProps {
  dreByBU: Record<BuType, Record<MonthType, number>>;
  metasByBU: Record<BuType, number>; // total meta anual por BU
  isLoading: boolean;
}

export function MetaVsRealized({ dreByBU, metasByBU, isLoading }: MetaVsRealizedProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {BUS.map(bu => (
          <Card key={bu}><CardContent className="pt-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Meta vs Realizado Contábil</h3>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {BUS.map(bu => {
          const realized = MONTHS.reduce((sum, m) => sum + (dreByBU[bu]?.[m] || 0), 0);
          const meta = metasByBU[bu] || 0;
          const gap = meta > 0 ? realized - meta : 0;
          const pct = meta > 0 ? (realized / meta) * 100 : 0;
          const isPositive = gap >= 0;
          const hasData = realized > 0;

          return (
            <Card key={bu} className="relative overflow-hidden">
              <div className={`absolute top-0 left-0 right-0 h-1 ${isPositive ? 'bg-chart-2' : 'bg-destructive'}`} />
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{BU_LABELS[bu]}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-muted-foreground">Meta</span>
                  <span className="text-sm font-medium tabular-nums">{formatCurrency(meta)}</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-muted-foreground">Realizado</span>
                  <span className="text-sm font-bold tabular-nums">{hasData ? formatCurrency(realized) : '—'}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div className="flex items-center gap-1">
                    {!hasData ? (
                      <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : isPositive ? (
                      <TrendingUp className="h-3.5 w-3.5 text-chart-2" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5 text-destructive" />
                    )}
                    <span className={`text-xs font-medium ${!hasData ? 'text-muted-foreground' : isPositive ? 'text-chart-2' : 'text-destructive'}`}>
                      {hasData ? `${pct.toFixed(1)}%` : 'Sem dados'}
                    </span>
                  </div>
                  {hasData && (
                    <span className={`text-xs tabular-nums ${isPositive ? 'text-chart-2' : 'text-destructive'}`}>
                      {isPositive ? '+' : ''}{formatCurrency(gap)}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
