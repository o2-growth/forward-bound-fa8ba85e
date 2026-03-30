import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, ChevronDown, ChevronUp, Database } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Line, ComposedChart } from "recharts";

interface RevenuePaceChartProps {
  realized: number;
  meta: number;
  mrrBase: number;
  paceExpected: number;
  isLoading: boolean;
  chartData: { label: string; realizado: number; meta: number }[];
}

const formatCompactCurrency = (value: number): string => {
  if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(0)}k`;
  return `R$ ${Math.round(value)}`;
};

export function RevenuePaceChart({ realized, meta, mrrBase, isLoading, chartData }: RevenuePaceChartProps) {
  const [isOpen, setIsOpen] = useState(true);

  const totalRealized = mrrBase + realized;
  const totalMeta = mrrBase + meta;

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-72 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <Card className="bg-card border-border">
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-2 cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <CardTitle className="text-base font-semibold text-foreground">Faturamento</CardTitle>
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Acumulado</span>
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className="flex items-center gap-6 text-sm">
                <span className="text-muted-foreground">Faturamento: <span className="text-foreground font-medium">{formatCompactCurrency(totalRealized)}</span></span>
                <span className="text-muted-foreground">Meta: <span className="text-foreground font-medium">{formatCompactCurrency(totalMeta)}</span></span>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-2">
              <Badge variant="outline" className="text-xs gap-1 font-normal">
                <Database className="h-3 w-3" />
                DRE (Oxy Finance)
              </Badge>
              <div className="flex items-center gap-2"><div className="w-3 h-0.5 bg-chart-1 rounded" /><span className="text-xs text-muted-foreground">Meta Acumulada</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-0.5 bg-chart-2 rounded" /><span className="text-xs text-muted-foreground">Realizado Acumulado</span></div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenuePaceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} interval="preserveStartEnd" angle={-45} textAnchor="end" height={50} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} tickFormatter={(value) => formatCompactCurrency(value)} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--popover-foreground))"
                    }}
                    formatter={(value: number, name: string) => [
                      formatCompactCurrency(value),
                      name === 'Realizado Acumulado' ? 'Realizado Acumulado' : 'Meta Acumulada'
                    ]}
                  />
                  <Area type="natural" dataKey="realizado" stroke="hsl(var(--chart-2))" strokeWidth={2.5} fill="url(#revenuePaceGradient)" name="Realizado Acumulado" dot={{ r: 2, fill: "hsl(var(--chart-2))" }} />
                  <Line type="natural" dataKey="meta" stroke="hsl(var(--chart-1))" strokeWidth={2.5} dot={false} strokeDasharray="6 3" name="Meta Acumulada" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
