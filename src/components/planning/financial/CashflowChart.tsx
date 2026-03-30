import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart, Legend } from "recharts";
import type { CashflowChartPoint } from "@/hooks/useOxyFinance";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
}

interface CashflowChartProps {
  data: CashflowChartPoint[];
  isLoading: boolean;
}

export function CashflowChart({ data, isLoading }: CashflowChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Fluxo de Caixa</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-80 w-full" /></CardContent>
      </Card>
    );
  }

  if (!data.length) {
    return (
      <Card>
        <CardHeader><CardTitle>Fluxo de Caixa</CardTitle></CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm text-center py-8">
            Sem dados de fluxo de caixa disponíveis.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Fluxo de Caixa</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="month" className="text-xs" />
            <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} className="text-xs" />
            <Tooltip
              formatter={(value: number, name: string) => [
                formatCurrency(value),
                name === 'inflows' ? 'Entradas' : name === 'outflows' ? 'Saídas' : 'Saldo',
              ]}
              contentStyle={{ borderRadius: '8px' }}
            />
            <Legend
              formatter={(value) =>
                value === 'inflows' ? 'Entradas' : value === 'outflows' ? 'Saídas' : 'Saldo'
              }
            />
            <Bar dataKey="inflows" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="outflows" fill="hsl(var(--chart-5))" radius={[4, 4, 0, 0]} />
            <Line type="monotone" dataKey="balance" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
