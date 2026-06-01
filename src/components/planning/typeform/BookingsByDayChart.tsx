import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Cell,
} from "recharts";
import type { DiagPipeline } from "./useTypeformData";

interface Props {
  data?: DiagPipeline[];
  loading?: boolean;
  onBarClick?: (row: DiagPipeline) => void;
  title?: string;
  totalLabel?: (total: number) => string;
  emptyMessage?: string;
}

export function BookingsByDayChart({
  data,
  loading,
  onBarClick,
  title = "Reuniões agendadas por dia",
  totalLabel = (t) => `${t} reuniões no total`,
  emptyMessage = "Sem reuniões registradas",
}: Props) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const enriched = (data ?? [])
    .slice()
    .sort((a, b) => a.booking_date.localeCompare(b.booking_date))
    .map((d) => {
      const dt = new Date(d.booking_date);
      const isPast = dt < today;
      return {
        ...d,
        label: dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        isPast,
      };
    });

  const todayLabel = today.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  const hasToday = enriched.some((d) => d.label === todayLabel);

  const total = enriched.reduce((acc, d) => acc + (d.reunioes ?? 0), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span>{title}</span>
          <span className="text-xs font-normal text-muted-foreground">
            {totalLabel(total)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-72 w-full" />
        ) : enriched.length === 0 ? (
          <div className="h-72 flex items-center justify-center text-muted-foreground text-sm">
            {emptyMessage}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={enriched} margin={{ left: 8, right: 16, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  color: "hsl(var(--popover-foreground))",
                }}
                labelStyle={{ color: "hsl(var(--popover-foreground))", fontWeight: 600 }}
                itemStyle={{ color: "hsl(var(--popover-foreground))" }}
                formatter={(v: any) => [v, "Reuniões"]}
                labelFormatter={(l) => `Dia ${l}`}
              />

              {hasToday && (
                <ReferenceLine
                  x={todayLabel}
                  stroke="hsl(var(--destructive))"
                  strokeDasharray="3 3"
                  label={{ value: "Hoje", fill: "hsl(var(--destructive))", fontSize: 11 }}
                />
              )}
              <Bar
                dataKey="reunioes"
                radius={[4, 4, 0, 0]}
                cursor={onBarClick ? "pointer" : undefined}
                onClick={(d: any) => onBarClick?.(d?.payload as DiagPipeline)}
              >
                {enriched.map((d, i) => (
                  <Cell
                    key={i}
                    fill={d.isPast ? "hsl(var(--muted-foreground))" : "hsl(var(--primary))"}
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
