import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { MarketingChannel, CHANNEL_COLORS, ChannelId } from "./types";

interface InvestmentByChannelChartProps {
  channels: MarketingChannel[];
}

export function InvestmentByChannelChart({ channels }: InvestmentByChannelChartProps) {
  const chartData = channels.map(channel => ({
    name: channel.name,
    investment: channel.investment,
    id: channel.id,
  }));

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `R$ ${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(0)}k`;
    }
    return `R$ ${value.toFixed(0)}`;
  };

  const totalInvestment = channels.reduce((sum, c) => sum + c.investment, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">Investimento por Canal</CardTitle>
          <span className="text-sm text-muted-foreground">
            Total: {formatCurrency(totalInvestment)}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {channels.length === 0 || totalInvestment === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            Sem dados de investimento
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
              <XAxis 
                type="number" 
                tickFormatter={formatCurrency}
                tick={{ fontSize: 11 }}
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={80}
                tick={{ fontSize: 11 }}
              />
              <Tooltip 
                formatter={(value: number) => [formatCurrency(value), 'Investimento']}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="investment" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={CHANNEL_COLORS[entry.id as ChannelId] || 'hsl(var(--chart-1))'} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
