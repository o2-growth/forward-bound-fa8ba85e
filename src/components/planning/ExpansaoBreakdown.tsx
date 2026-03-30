import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Rocket, Users, TrendingUp, Target, CheckCircle2, XCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatCompact, months } from "./salesData";

interface ExpansaoBreakdownProps {
  projectedOxyHacker: Record<string, number>;
  projectedFranquia: Record<string, number>;
  realizedOxyHacker: Record<string, number>;
  realizedFranquia: Record<string, number>;
  isLoading: boolean;
}

// Get quarter for a month
const getQuarter = (monthIndex: number): number => Math.floor(monthIndex / 3) + 1;

// Variation Badge component
function VariationBadge({ projected, realized }: { projected: number; realized: number }) {
  if (projected === 0 && realized === 0) return <span className="text-muted-foreground">-</span>;
  const variation = projected > 0 ? ((realized - projected) / projected) * 100 : 0;
  const isPositive = variation >= 0;
  return (
    <Badge 
      variant="outline" 
      className={`text-xs ${
        isPositive 
          ? 'bg-success/10 text-success border-success/30' 
          : 'bg-destructive/10 text-destructive border-destructive/30'
      }`}
    >
      {isPositive ? '+' : ''}{variation.toFixed(1)}%
    </Badge>
  );
}

// Status Icon component
function StatusIcon({ rate }: { rate: number }) {
  if (rate >= 80) return <CheckCircle2 className="h-4 w-4 text-success" />;
  if (rate >= 50) return <CheckCircle2 className="h-4 w-4 text-warning" />;
  return <XCircle className="h-4 w-4 text-destructive" />;
}

export function ExpansaoBreakdown({
  projectedOxyHacker,
  projectedFranquia,
  realizedOxyHacker,
  realizedFranquia,
  isLoading,
}: ExpansaoBreakdownProps) {
  const oxyHackerProjectedTotal = Object.values(projectedOxyHacker).reduce((a, b) => a + b, 0);
  const oxyHackerRealizedTotal = Object.values(realizedOxyHacker).reduce((a, b) => a + b, 0);
  const oxyHackerRate = oxyHackerProjectedTotal > 0 ? (oxyHackerRealizedTotal / oxyHackerProjectedTotal) * 100 : 0;
  const oxyHackerGap = oxyHackerProjectedTotal - oxyHackerRealizedTotal;

  const franquiaProjectedTotal = Object.values(projectedFranquia).reduce((a, b) => a + b, 0);
  const franquiaRealizedTotal = Object.values(realizedFranquia).reduce((a, b) => a + b, 0);
  const franquiaRate = franquiaProjectedTotal > 0 ? (franquiaRealizedTotal / franquiaProjectedTotal) * 100 : 0;
  const franquiaGap = franquiaProjectedTotal - franquiaRealizedTotal;

  const products = [
    {
      key: 'oxy_hacker',
      label: 'Oxy Hacker',
      icon: <Rocket className="h-5 w-5" />,
      color: 'hsl(var(--accent))',
      colorClass: 'text-accent',
      projected: oxyHackerProjectedTotal,
      realized: oxyHackerRealizedTotal,
      rate: oxyHackerRate,
      gap: oxyHackerGap,
      projectedByMonth: projectedOxyHacker,
      realizedByMonth: realizedOxyHacker,
    },
    {
      key: 'franquia',
      label: 'Franquias',
      icon: <Users className="h-5 w-5" />,
      color: 'hsl(var(--secondary))',
      colorClass: 'text-secondary-foreground',
      projected: franquiaProjectedTotal,
      realized: franquiaRealizedTotal,
      rate: franquiaRate,
      gap: franquiaGap,
      projectedByMonth: projectedFranquia,
      realizedByMonth: realizedFranquia,
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {[1, 2].map((i) => (
          <Card key={i} className="glass-card animate-pulse">
            <CardHeader>
              <div className="h-6 bg-muted rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-24 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Calculate quarterly totals for a product
  const calculateQuarterlyTotals = (projectedByMonth: Record<string, number>, realizedByMonth: Record<string, number>) => {
    const quarters: { [key: number]: { projected: number; realized: number } } = {
      1: { projected: 0, realized: 0 },
      2: { projected: 0, realized: 0 },
      3: { projected: 0, realized: 0 },
      4: { projected: 0, realized: 0 },
    };
    
    months.forEach((month, index) => {
      const q = getQuarter(index);
      quarters[q].projected += projectedByMonth[month] || 0;
      quarters[q].realized += realizedByMonth[month] || 0;
    });
    
    return quarters;
  };

  return (
    <div className="space-y-6 mb-6">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Target className="h-4 w-4" />
        <span className="text-sm font-medium">Detalhamento por Produto - Expansão O2</span>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {products.map((product) => {
          const isPositive = product.rate >= 80;
          const isWarning = product.rate >= 50 && product.rate < 80;

          return (
            <Card 
              key={product.key}
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
                  <div className={`flex items-center gap-2 ${product.colorClass}`}>
                    {product.icon}
                    <span className="font-display text-base">{product.label}</span>
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
                    {product.rate.toFixed(1)}%
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
                    style={{ width: `${Math.min(product.rate, 100)}%` }}
                  />
                </div>

                {/* Values */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Previsto</p>
                    <p className="font-display font-bold">{formatCompact(product.projected)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Realizado</p>
                    <p className="font-display font-bold">{formatCompact(product.realized)}</p>
                  </div>
                </div>

                {/* Gap */}
                <div className="pt-2 border-t border-border/50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Gap</span>
                    <span className={`flex items-center gap-1 text-sm font-medium ${
                      product.gap <= 0 ? 'text-success' : 'text-muted-foreground'
                    }`}>
                      {product.gap <= 0 ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <Target className="h-4 w-4" />
                      )}
                      {formatCompact(Math.abs(product.gap))}
                      {product.gap <= 0 && ' acima'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detailed Tables */}
      {products.map((product) => {
        const quarterlyTotals = calculateQuarterlyTotals(product.projectedByMonth, product.realizedByMonth);
        const isPositive = product.rate >= 80;
        const isWarning = product.rate >= 50 && product.rate < 80;
        
        return (
          <Card key={`table-${product.key}`} className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {product.icon}
                <span className="font-display text-lg">{product.label} - Detalhamento Mensal</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Mês</TableHead>
                      <TableHead className="text-right font-semibold">Previsto</TableHead>
                      <TableHead className="text-right font-semibold">Realizado</TableHead>
                      <TableHead className="text-center font-semibold">Variação</TableHead>
                      <TableHead className="text-center font-semibold">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {months.map((month, index) => {
                      const projected = product.projectedByMonth[month] || 0;
                      const realized = product.realizedByMonth[month] || 0;
                      const monthRate = projected > 0 ? (realized / projected) * 100 : 0;
                      const quarter = getQuarter(index);
                      const isQuarterEnd = (index + 1) % 3 === 0;
                      
                      return (
                        <>
                          <TableRow key={month} className="hover:bg-muted/30">
                            <TableCell className="font-medium capitalize">{month}</TableCell>
                            <TableCell className="text-right">{formatCurrency(projected)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(realized)}</TableCell>
                            <TableCell className="text-center">
                              <VariationBadge projected={projected} realized={realized} />
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex justify-center">
                                <StatusIcon rate={monthRate} />
                              </div>
                            </TableCell>
                          </TableRow>
                          {isQuarterEnd && (
                            <TableRow key={`q${quarter}`} className="bg-muted/30 font-semibold border-t-2">
                              <TableCell className="text-primary">Q{quarter} Total</TableCell>
                              <TableCell className="text-right text-primary">
                                {formatCurrency(quarterlyTotals[quarter].projected)}
                              </TableCell>
                              <TableCell className="text-right text-primary">
                                {formatCurrency(quarterlyTotals[quarter].realized)}
                              </TableCell>
                              <TableCell className="text-center">
                                <VariationBadge 
                                  projected={quarterlyTotals[quarter].projected} 
                                  realized={quarterlyTotals[quarter].realized} 
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex justify-center">
                                  <StatusIcon 
                                    rate={quarterlyTotals[quarter].projected > 0 
                                      ? (quarterlyTotals[quarter].realized / quarterlyTotals[quarter].projected) * 100 
                                      : 0
                                    } 
                                  />
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      );
                    })}
                    {/* Annual Total Row */}
                    <TableRow className={`font-bold border-t-4 ${
                      isPositive 
                        ? 'bg-success/10' 
                        : isWarning 
                          ? 'bg-warning/10' 
                          : 'bg-destructive/10'
                    }`}>
                      <TableCell className="text-lg">Total Anual</TableCell>
                      <TableCell className="text-right text-lg">{formatCurrency(product.projected)}</TableCell>
                      <TableCell className="text-right text-lg">{formatCurrency(product.realized)}</TableCell>
                      <TableCell className="text-center">
                        <VariationBadge projected={product.projected} realized={product.realized} />
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          <StatusIcon rate={product.rate} />
                        </div>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}