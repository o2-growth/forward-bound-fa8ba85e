import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import type { DiagBySdr } from "./useTypeformData";

interface Props {
  data?: DiagBySdr[];
  loading?: boolean;
  onBarClick?: (row: DiagBySdr) => void;
}

export function SdrBarChart({ data, loading, onBarClick }: Props) {
  const sorted = (data ?? [])
    .slice()
    .sort((a, b) => (b.agendados ?? 0) - (a.agendados ?? 0))
    .slice(0, 12);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">SDRs com mais agendamento</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-72 w-full" />
        ) : sorted.length === 0 ? (
          <div className="h-72 flex items-center justify-center text-muted-foreground text-sm">
            Sem dados
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={sorted} layout="vertical" margin={{ left: 24, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis
                type="category"
                dataKey="sdr_nome"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                width={140}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  color: "hsl(var(--popover-foreground))",
                }}
              />
              <Bar
                dataKey="agendados"
                fill="hsl(var(--primary))"
                radius={[0, 4, 4, 0]}
                cursor={onBarClick ? "pointer" : undefined}
                onClick={(d: any) => onBarClick?.(d?.payload as DiagBySdr)}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
