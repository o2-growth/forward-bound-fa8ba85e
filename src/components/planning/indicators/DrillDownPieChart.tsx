import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

export interface PieChartDataItem {
  label: string;
  value: number;
  color?: string;
}

interface DrillDownPieChartProps {
  title: string;
  data: PieChartDataItem[];
  formatValue?: (value: number) => string;
}

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export function DrillDownPieChart({ 
  title, 
  data, 
  formatValue = String 
}: DrillDownPieChartProps) {
  if (!data || data.length === 0) return null;
  
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const chartData = data.map((item, index) => ({
    name: item.label,
    value: item.value,
    color: item.color || COLORS[index % COLORS.length],
    pct: total > 0 ? Math.round((item.value / total) * 100) : 0,
  }));

  return (
    <div className="space-y-3 flex-1 min-w-[200px]">
      <h4 className="text-sm font-medium text-foreground">{title}</h4>
      <div className="h-[160px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={35}
              outerRadius={55}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                color: "hsl(var(--popover-foreground))"
              }}
              formatter={(value: number) => formatValue(value)}
            />
            <Legend 
              verticalAlign="middle" 
              align="right"
              layout="vertical"
              iconType="circle"
              iconSize={8}
              formatter={(value, entry: any) => (
                <span className="text-xs text-foreground">
                  {value} ({entry.payload.pct}%)
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
