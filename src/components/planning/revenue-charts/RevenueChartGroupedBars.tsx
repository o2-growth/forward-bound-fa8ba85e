// Unified Revenue Chart: KPI Cards + Grouped Bars
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend, ReferenceLine, AreaChart, Area } from "recharts";
import { DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { BUType } from "@/hooks/useFunnelRealized";
import { Progress } from "@/components/ui/progress";

interface RevenueChartGroupedBarsProps {
  startDate: Date;
  endDate: Date;
  selectedBUs: BUType[];
  chartData: {
    label: string;
    modelo_atual: number;
    o2_tax: number;
    oxy_hacker: number;
    franquia: number;
    total?: number;
    meta: number;
  }[];
  totals: {
    modelo_atual: number;
    o2_tax: number;
    oxy_hacker: number;
    franquia: number;
    total: number;
    meta: number;
  };
  metasPorBU?: {
    modelo_atual: number;
    o2_tax: number;
    oxy_hacker: number;
    franquia: number;
  };
}

const BU_COLORS: Record<string, string> = {
  modelo_atual: '#3b82f6',
  o2_tax: '#f59e0b',
  oxy_hacker: '#8b5cf6',
  franquia: '#22c55e',
};

const BU_LABELS: Record<string, string> = {
  modelo_atual: 'Modelo Atual',
  o2_tax: 'O2 TAX',
  oxy_hacker: 'Oxy Hacker',
  franquia: 'Franquia',
};

const formatCompactCurrency = (value: number): string => {
  if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(0)}k`;
  return `R$ ${Math.round(value)}`;
};

interface BUKpiCardProps {
  bu: BUType;
  realized: number;
  meta: number;
  sparklineData: number[];
  color: string;
}

function BUKpiCard({ bu, realized, meta, sparklineData, color }: BUKpiCardProps) {
  const percentage = meta > 0 ? (realized / meta) * 100 : 0;
  const isAboveMeta = percentage >= 100;
  const trend = sparklineData.length >= 2 
    ? sparklineData[sparklineData.length - 1] - sparklineData[sparklineData.length - 2]
    : 0;

  const sparkData = sparklineData.map((value, index) => ({ value, index }));

  return (
    <Card className="bg-card border-border flex-1 min-w-[140px]">
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-muted-foreground">{BU_LABELS[bu]}</span>
          <div 
            className="w-2 h-2 rounded-full" 
            style={{ backgroundColor: color }}
          />
        </div>
        <div className="text-lg font-bold text-foreground">
          {formatCompactCurrency(realized)}
        </div>
        
        {/* Mini sparkline */}
        <div className="h-8 my-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`spark-${bu}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.4}/>
                  <stop offset="95%" stopColor={color} stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke={color} 
                strokeWidth={1.5}
                fill={`url(#spark-${bu})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Progress bar */}
        <div className="mt-2">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className={isAboveMeta ? "text-green-500" : "text-destructive"}>
              {Math.round(percentage)}% meta
            </span>
            {trend !== 0 && (
              <span className={trend > 0 ? "text-green-500" : "text-destructive"}>
                {trend > 0 ? <TrendingUp className="h-3 w-3 inline" /> : <TrendingDown className="h-3 w-3 inline" />}
              </span>
            )}
          </div>
          <Progress 
            value={Math.min(percentage, 100)} 
            className="h-1.5"
          />
        </div>
      </CardContent>
    </Card>
  );
}

export function RevenueChartGroupedBars({ 
  startDate, 
  endDate, 
  selectedBUs,
  chartData,
  totals,
  metasPorBU
}: RevenueChartGroupedBarsProps) {
  const useModeloAtual = selectedBUs.includes('modelo_atual');
  const useO2Tax = selectedBUs.includes('o2_tax');
  const useOxyHacker = selectedBUs.includes('oxy_hacker');
  const useFranquia = selectedBUs.includes('franquia');

  // Calculate individual BU metas (proportional if not provided)
  const buMetas = useMemo(() => {
    if (metasPorBU) return metasPorBU;
    
    // Fallback: distribute total meta proportionally by realized
    const totalRealized = totals.total || 1;
    return {
      modelo_atual: (totals.modelo_atual / totalRealized) * totals.meta,
      o2_tax: (totals.o2_tax / totalRealized) * totals.meta,
      oxy_hacker: (totals.oxy_hacker / totalRealized) * totals.meta,
      franquia: (totals.franquia / totalRealized) * totals.meta,
    };
  }, [metasPorBU, totals]);

  // Extract sparkline data for each BU
  const sparklineData = useMemo(() => ({
    modelo_atual: chartData.map(d => d.modelo_atual),
    o2_tax: chartData.map(d => d.o2_tax),
    oxy_hacker: chartData.map(d => d.oxy_hacker),
    franquia: chartData.map(d => d.franquia),
    total: chartData.map(d => d.total || (d.modelo_atual + d.o2_tax + d.oxy_hacker + d.franquia)),
  }), [chartData]);

  // Total percentage
  const totalPercentage = totals.meta > 0 ? (totals.total / totals.meta) * 100 : 0;
  const isTotalAboveMeta = totalPercentage >= 100;

  // Calculate average meta for reference line
  const avgMeta = chartData.length > 0 
    ? chartData.reduce((sum, d) => sum + d.meta, 0) / chartData.length 
    : 0;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          <CardTitle className="text-base font-semibold">
            Faturamento por Período
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-2 space-y-4">
        {/* KPI Cards Row */}
        <div className="flex gap-3 flex-wrap">
          {selectedBUs.map(bu => (
            <BUKpiCard
              key={bu}
              bu={bu}
              realized={totals[bu as keyof typeof totals] as number}
              meta={buMetas[bu]}
              sparklineData={sparklineData[bu]}
              color={BU_COLORS[bu]}
            />
          ))}
          
          {/* Total Card */}
          <Card className="bg-primary/5 border-primary/20 flex-1 min-w-[140px]">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-primary">TOTAL</span>
              </div>
              <div className="text-xl font-bold text-foreground">
                {formatCompactCurrency(totals.total)}
              </div>
              
              {/* Mini sparkline for total */}
              <div className="h-8 my-1">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sparklineData.total.map((v, i) => ({ value: v, index: i }))} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="spark-total" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05}/>
                      </linearGradient>
                    </defs>
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={1.5}
                      fill="url(#spark-total)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-2">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className={isTotalAboveMeta ? "text-green-500" : "text-destructive"}>
                    {Math.round(totalPercentage)}% meta
                  </span>
                  <span className="text-muted-foreground">
                    Meta: {formatCompactCurrency(totals.meta)}
                  </span>
                </div>
                <Progress 
                  value={Math.min(totalPercentage, 100)} 
                  className="h-1.5"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Grouped Bar Chart */}
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis 
                dataKey="label" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                tickFormatter={(value) => formatCompactCurrency(value)}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "hsl(var(--popover))", 
                  border: "1px solid hsl(var(--border))", 
                  borderRadius: "8px",
                  color: "hsl(var(--popover-foreground))"
                }}
                formatter={(value: number, name: string) => [formatCompactCurrency(value), BU_LABELS[name] || name]}
              />
              
              {/* Bars side by side (not stacked) */}
              {useModeloAtual && (
                <Bar dataKey="modelo_atual" fill={BU_COLORS.modelo_atual} name="modelo_atual" radius={[4, 4, 0, 0]} />
              )}
              {useO2Tax && (
                <Bar dataKey="o2_tax" fill={BU_COLORS.o2_tax} name="o2_tax" radius={[4, 4, 0, 0]} />
              )}
              {useOxyHacker && (
                <Bar dataKey="oxy_hacker" fill={BU_COLORS.oxy_hacker} name="oxy_hacker" radius={[4, 4, 0, 0]} />
              )}
              {useFranquia && (
                <Bar dataKey="franquia" fill={BU_COLORS.franquia} name="franquia" radius={[4, 4, 0, 0]} />
              )}
              
              {/* Reference line for average meta */}
              <ReferenceLine 
                y={avgMeta} 
                stroke="#22c55e" 
                strokeDasharray="5 5" 
                strokeWidth={2}
                label={{ value: 'Meta média', fill: '#22c55e', fontSize: 10, position: 'right' }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
          {selectedBUs.map(bu => (
            <div key={bu} className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: BU_COLORS[bu] }} />
              <span>{BU_LABELS[bu]}</span>
            </div>
          ))}
          <div className="flex items-center gap-1">
            <div className="w-4 h-0 border-t-2 border-dashed border-green-500" />
            <span>Meta</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
