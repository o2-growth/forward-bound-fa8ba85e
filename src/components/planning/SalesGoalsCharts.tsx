import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { DashboardBUConfig, DashboardBUKey, formatCurrency, formatCompact, months, getQuarter } from "./salesData";

interface SalesGoalsChartsProps {
  buConfigs: DashboardBUConfig[];
  projectedData: Record<DashboardBUKey, Record<string, number>>;
  realizedByBU: Record<DashboardBUKey, Record<string, number>>;
  selectedBU: DashboardBUKey | 'all';
  calculateBUTotal: (bu: DashboardBUKey) => number;
  calculateBURealized: (bu: DashboardBUKey) => number;
}

export function SalesGoalsCharts({
  buConfigs,
  projectedData,
  realizedByBU,
  selectedBU,
  calculateBUTotal,
  calculateBURealized,
}: SalesGoalsChartsProps) {
  const chartConfig = buConfigs.reduce((acc, bu) => {
    acc[bu.key] = { label: bu.label, color: bu.color };
    acc[`${bu.key}_realized`] = { label: `${bu.label} Realizado`, color: bu.color };
    return acc;
  }, {} as Record<string, { label: string; color: string }>);

  // Prepare data for monthly comparison chart
  const monthlyComparisonData = months.map((month) => {
    const data: Record<string, any> = { month };
    
    if (selectedBU === 'all') {
      buConfigs.forEach((bu) => {
        data[`${bu.key}_projected`] = Math.round(projectedData[bu.key]?.[month] || 0);
        data[`${bu.key}_realized`] = Math.round(realizedByBU[bu.key]?.[month] || 0);
      });
    } else {
      data.projected = Math.round(projectedData[selectedBU]?.[month] || 0);
      data.realized = Math.round(realizedByBU[selectedBU]?.[month] || 0);
    }
    
    return data;
  });

  // Prepare data for BU comparison bar chart
  const buComparisonData = buConfigs.map((bu) => ({
    name: bu.label,
    projected: calculateBUTotal(bu.key),
    realized: calculateBURealized(bu.key),
    color: bu.color,
  }));

  // Prepare data for pie chart - realized distribution
  const pieDataRealized = buConfigs.map((bu) => ({
    name: bu.label,
    value: calculateBURealized(bu.key),
    color: bu.color,
  }));

  // Prepare quarterly data
  const quarterlyData = ['Q1', 'Q2', 'Q3', 'Q4'].map((quarter) => {
    const quarterMonths = months.filter((m) => getQuarter(m) === quarter);
    const data: Record<string, any> = { quarter };
    
    if (selectedBU === 'all') {
      let totalProjected = 0;
      let totalRealized = 0;
      
      buConfigs.forEach((bu) => {
        const projected = quarterMonths.reduce(
          (sum, month) => sum + (projectedData[bu.key]?.[month] || 0),
          0
        );
        const realized = quarterMonths.reduce(
          (sum, month) => sum + (realizedByBU[bu.key]?.[month] || 0),
          0
        );
        totalProjected += projected;
        totalRealized += realized;
      });
      
      data.projected = totalProjected;
      data.realized = totalRealized;
    } else {
      data.projected = quarterMonths.reduce(
        (sum, month) => sum + (projectedData[selectedBU]?.[month] || 0),
        0
      );
      data.realized = quarterMonths.reduce(
        (sum, month) => sum + (realizedByBU[selectedBU]?.[month] || 0),
        0
      );
    }
    
    return data;
  });

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 1.4;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="hsl(var(--foreground))" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {name} ({(percent * 100).toFixed(1)}%)
      </text>
    );
  };

  return (
    <div className="space-y-6">
      {/* Monthly Comparison Line Chart */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-display">Evolução Mensal - Previsto vs Realizado</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyComparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" tick={{ fill: 'hsl(var(--foreground))' }} />
                <YAxis 
                  tickFormatter={(value) => formatCompact(value)} 
                  className="text-xs" 
                  tick={{ fill: 'hsl(var(--foreground))' }}
                  width={80}
                />
                <ChartTooltip 
                  content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} 
                />
                <Legend />
                {selectedBU === 'all' ? (
                  buConfigs.map((bu) => (
                    <Line
                      key={bu.key}
                      type="monotone"
                      dataKey={`${bu.key}_realized`}
                      stroke={bu.color}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      name={bu.label}
                    />
                  ))
                ) : (
                  <>
                    <Line
                      type="monotone"
                      dataKey="projected"
                      stroke="hsl(var(--muted-foreground))"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ r: 3 }}
                      name="Previsto"
                    />
                    <Line
                      type="monotone"
                      dataKey="realized"
                      stroke={buConfigs.find(b => b.key === selectedBU)?.color || 'hsl(var(--primary))'}
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      name="Realizado"
                    />
                  </>
                )}
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* BU Comparison Bar Chart */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="font-display">Comparativo por BU</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={buComparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" tick={{ fill: 'hsl(var(--foreground))' }} />
                  <YAxis 
                    tickFormatter={(value) => formatCompact(value)} 
                    className="text-xs" 
                    tick={{ fill: 'hsl(var(--foreground))' }}
                    width={80}
                  />
                  <ChartTooltip 
                    content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} 
                  />
                  <Legend />
                  <Bar 
                    dataKey="projected" 
                    fill="hsl(var(--muted))" 
                    name="Previsto"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar 
                    dataKey="realized" 
                    fill="hsl(var(--primary))" 
                    name="Realizado"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Quarterly Progress Chart */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="font-display">Progresso Trimestral</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={quarterlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="quarter" className="text-xs" tick={{ fill: 'hsl(var(--foreground))' }} />
                  <YAxis 
                    tickFormatter={(value) => formatCompact(value)} 
                    className="text-xs" 
                    tick={{ fill: 'hsl(var(--foreground))' }}
                    width={80}
                  />
                  <ChartTooltip 
                    content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} 
                  />
                  <Legend />
                  <Bar 
                    dataKey="projected" 
                    fill="hsl(var(--muted))" 
                    name="Meta"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar 
                    dataKey="realized" 
                    fill="hsl(var(--success))" 
                    name="Realizado"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Distribution Pie Chart */}
      {selectedBU === 'all' && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="font-display">Distribuição do Realizado por BU</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieDataRealized}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={renderCustomizedLabel}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieDataRealized.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip 
                    content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
