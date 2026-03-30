import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUp, ArrowDown, Minus, CheckCircle2, XCircle } from "lucide-react";
import { DashboardBUConfig, DashboardBUKey, formatCurrency, formatCompact, months, getQuarter } from "./salesData";

interface SalesGoalsTableProps {
  buConfigs: DashboardBUConfig[];
  projectedData: Record<DashboardBUKey, Record<string, number>>;
  realizedByBU: Record<DashboardBUKey, Record<string, number>>;
  selectedBU: DashboardBUKey | 'all';
  isLoading: boolean;
}

function VariationBadge({ projected, realized }: { projected: number; realized: number }) {
  if (projected === 0) return <span className="text-muted-foreground text-xs">-</span>;
  
  const variation = ((realized - projected) / projected) * 100;
  const isPositive = variation >= 0;
  const isNeutral = Math.abs(variation) < 1;

  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${
      isNeutral ? "text-muted-foreground" : isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
    }`}>
      {isNeutral ? <Minus className="h-3 w-3" /> : 
        isPositive ? <ArrowUp className="h-3 w-3" /> : 
        <ArrowDown className="h-3 w-3" />}
      {isPositive && "+"}{variation.toFixed(1)}%
    </span>
  );
}

function StatusIcon({ rate }: { rate: number }) {
  if (rate >= 90) {
    return <CheckCircle2 className="h-4 w-4 text-success" />;
  }
  if (rate >= 70) {
    return <CheckCircle2 className="h-4 w-4 text-warning" />;
  }
  return <XCircle className="h-4 w-4 text-destructive" />;
}

export function SalesGoalsTable({
  buConfigs,
  projectedData,
  realizedByBU,
  selectedBU,
  isLoading,
}: SalesGoalsTableProps) {
  const filteredBUs = selectedBU === 'all' ? buConfigs : buConfigs.filter(bu => bu.key === selectedBU);

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {filteredBUs.map((bu) => {
        const quarterTotals = {
          Q1: { projected: 0, realized: 0 },
          Q2: { projected: 0, realized: 0 },
          Q3: { projected: 0, realized: 0 },
          Q4: { projected: 0, realized: 0 },
        };

        months.forEach((month) => {
          const q = getQuarter(month);
          quarterTotals[q].projected += projectedData[bu.key]?.[month] || 0;
          quarterTotals[q].realized += realizedByBU[bu.key]?.[month] || 0;
        });

        const yearTotal = {
          projected: Object.values(quarterTotals).reduce((sum, q) => sum + q.projected, 0),
          realized: Object.values(quarterTotals).reduce((sum, q) => sum + q.realized, 0),
        };

        return (
          <Card key={bu.key} className="glass-card">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: bu.color }}
                />
                {bu.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Mês</TableHead>
                      <TableHead className="text-right">Previsto</TableHead>
                      <TableHead className="text-right">Realizado</TableHead>
                      <TableHead className="text-right w-24">Variação</TableHead>
                      <TableHead className="text-center w-16">Status</TableHead>
                      <TableHead className="text-right">Trimestre</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {months.map((month, index) => {
                      const projected = projectedData[bu.key]?.[month] || 0;
                      const realized = realizedByBU[bu.key]?.[month] || 0;
                      const rate = projected > 0 ? (realized / projected) * 100 : 0;
                      const quarter = getQuarter(month);
                      const isQuarterEnd = [2, 5, 8, 11].includes(index);

                      return (
                        <TableRow 
                          key={month} 
                          className={isQuarterEnd ? "border-b-2 border-border" : ""}
                        >
                          <TableCell className="font-medium">
                            <Badge variant="outline" className="w-12 justify-center">{month}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-display">
                            {formatCurrency(Math.round(projected))}
                          </TableCell>
                          <TableCell className="text-right font-display font-semibold">
                            {formatCurrency(Math.round(realized))}
                          </TableCell>
                          <TableCell className="text-right">
                            <VariationBadge projected={projected} realized={realized} />
                          </TableCell>
                          <TableCell className="text-center">
                            <StatusIcon rate={rate} />
                          </TableCell>
                          <TableCell className="text-right">
                            {isQuarterEnd && (
                              <div className="flex flex-col items-end gap-1">
                                <Badge className={bu.bgClass}>
                                  {quarter}: {formatCompact(quarterTotals[quarter].realized)}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  Meta: {formatCompact(quarterTotals[quarter].projected)}
                                </span>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right font-display">
                        {formatCurrency(Math.round(yearTotal.projected))}
                      </TableCell>
                      <TableCell className="text-right font-display text-lg">
                        {formatCurrency(Math.round(yearTotal.realized))}
                      </TableCell>
                      <TableCell className="text-right">
                        <VariationBadge projected={yearTotal.projected} realized={yearTotal.realized} />
                      </TableCell>
                      <TableCell className="text-center">
                        <StatusIcon rate={yearTotal.projected > 0 ? (yearTotal.realized / yearTotal.projected) * 100 : 0} />
                      </TableCell>
                      <TableCell></TableCell>
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
