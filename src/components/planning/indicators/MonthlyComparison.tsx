import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
} from "recharts";
import { format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DetailItem } from "./DetailSheet";
import { IndicatorType } from "@/hooks/useFunnelRealized";

interface IndicatorConfig {
  key: IndicatorType;
  label: string;
}

interface MonthlyComparisonProps {
  startDate: Date;
  endDate: Date;
  itemsByIndicator: Record<string, DetailItem[]>;
  indicatorConfigs: IndicatorConfig[];
}

interface MonthBucket {
  key: string;
  label: string;
  fullLabel: string;
  year: number;
  month: number;
  isCurrentMonth: boolean;
}

const INDICATOR_COLORS: Record<string, string> = {
  mql: "#3b82f6",
  rm: "#22c55e",
  rr: "#f59e0b",
  proposta: "#a855f7",
  venda: "#ef4444",
};

const INDICATOR_SHORT_LABELS: Record<string, string> = {
  mql: "MQL",
  rm: "RM",
  rr: "RR",
  proposta: "Prop",
  venda: "Venda",
};

function getMonthsInRange(startDate: Date, endDate: Date, minMonths: number = 3): MonthBucket[] {
  const months: MonthBucket[] = [];
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // Ensure we show at least minMonths by extending start backwards if needed
  let effectiveStart = new Date(startDate);
  const rangeStartY = startDate.getFullYear();
  const rangeStartM = startDate.getMonth();
  const rangeEndY = endDate.getFullYear();
  const rangeEndM = endDate.getMonth();
  const rangeMonths = (rangeEndY - rangeStartY) * 12 + (rangeEndM - rangeStartM) + 1;

  if (rangeMonths < minMonths) {
    // Go back enough months to have at least minMonths
    effectiveStart = subMonths(new Date(endDate.getFullYear(), endDate.getMonth(), 1), minMonths - 1);
  }

  let y = effectiveStart.getFullYear();
  let m = effectiveStart.getMonth();
  const endY = endDate.getFullYear();
  const endM = endDate.getMonth();

  while (y < endY || (y === endY && m <= endM)) {
    const d = new Date(y, m, 1);
    const shortLabel = format(d, "MMM", { locale: ptBR });
    const fullLabel = format(d, "MMMM yyyy", { locale: ptBR });
    months.push({
      key: `${y}-${String(m + 1).padStart(2, "0")}`,
      label: shortLabel.charAt(0).toUpperCase() + shortLabel.slice(1),
      fullLabel: fullLabel.charAt(0).toUpperCase() + fullLabel.slice(1),
      year: y,
      month: m,
      isCurrentMonth: y === currentYear && m === currentMonth,
    });
    m++;
    if (m > 11) { m = 0; y++; }
  }
  return months;
}

function countItemsInMonth(items: DetailItem[], year: number, month: number): number {
  return items.filter(item => {
    if (!item.date) return false;
    const d = new Date(item.date);
    return d.getFullYear() === year && d.getMonth() === month;
  }).length;
}

function formatChange(
  current: number,
  previous: number,
): { text: string; absText: string; color: string; trend: "up" | "down" | "neutral" } {
  if (previous === 0 && current === 0)
    return { text: "--", absText: "", color: "text-muted-foreground", trend: "neutral" };
  if (previous === 0)
    return { text: `+${current}`, absText: `0 -> ${current}`, color: "text-green-600 dark:text-green-400", trend: "up" };
  const pct = ((current - previous) / previous) * 100;
  const arrow = `${previous} -> ${current}`;
  if (pct > 0)
    return { text: `+${pct.toFixed(1)}%`, absText: arrow, color: "text-green-600 dark:text-green-400", trend: "up" };
  if (pct < 0)
    return { text: `${pct.toFixed(1)}%`, absText: arrow, color: "text-red-600 dark:text-red-400", trend: "down" };
  return { text: "0%", absText: arrow, color: "text-muted-foreground", trend: "neutral" };
}

export function MonthlyComparison({
  startDate,
  endDate,
  itemsByIndicator,
  indicatorConfigs,
}: MonthlyComparisonProps) {
  const months = useMemo(() => getMonthsInRange(startDate, endDate, 3), [startDate, endDate]);

  const allItemsByIndicator = itemsByIndicator;

  const monthlyData = useMemo(() => {
    return months.map(month => {
      const row: Record<string, number> = {};
      for (const config of indicatorConfigs) {
        row[config.key] = countItemsInMonth(
          allItemsByIndicator[config.key] || [],
          month.year,
          month.month,
        );
      }
      return row;
    });
  }, [months, indicatorConfigs, allItemsByIndicator]);

  const chartData = useMemo(() => {
    return months.map((month, i) => {
      const entry: Record<string, string | number> = { name: month.label };
      for (const config of indicatorConfigs) {
        entry[config.key] = monthlyData[i][config.key];
      }
      return entry;
    });
  }, [months, monthlyData, indicatorConfigs]);

  if (months.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Month cards grid */}
      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: `repeat(${Math.min(months.length, 6)}, minmax(0, 1fr))`,
        }}
      >
        {months.map((month, monthIdx) => (
          <div key={month.key} className="border rounded-lg p-3 space-y-2 bg-muted/30">
            <div className="text-xs font-semibold text-muted-foreground border-b pb-1.5 mb-1 flex items-center gap-1.5">
              {month.label}
              {month.isCurrentMonth && (
                <Badge variant="outline" className="text-[10px] px-1 py-0 leading-tight">
                  Atual
                </Badge>
              )}
            </div>
            {indicatorConfigs.map(config => {
              const count = monthlyData[monthIdx][config.key];
              const prevCount = monthIdx > 0
                ? monthlyData[monthIdx - 1][config.key]
                : null;
              const shortLabel = INDICATOR_SHORT_LABELS[config.key] || config.label;
              const color = INDICATOR_COLORS[config.key] || "#6b7280";

              let changeInfo: {
                text: string;
                absText: string;
                color: string;
                trend: "up" | "down" | "neutral";
              };
              if (prevCount === null) {
                changeInfo = {
                  text: "--",
                  absText: "",
                  color: "text-muted-foreground",
                  trend: "neutral",
                };
              } else {
                changeInfo = formatChange(count, prevCount);
              }

              return (
                <div key={config.key} className="space-y-0.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-xs text-muted-foreground">
                        {shortLabel}:
                      </span>
                      <span className="font-semibold text-sm">{count}</span>
                    </div>
                    <div
                      className={`flex items-center gap-0.5 text-xs font-medium ${changeInfo.color}`}
                    >
                      {changeInfo.trend === "up" && (
                        <TrendingUp className="h-3 w-3" />
                      )}
                      {changeInfo.trend === "down" && (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {changeInfo.trend === "neutral" && (
                        <Minus className="h-3 w-3" />
                      )}
                      <span>{changeInfo.text}</span>
                    </div>
                  </div>
                  {changeInfo.absText && (
                    <div className={`text-[10px] text-right ${changeInfo.color} opacity-80`}>
                      {changeInfo.absText}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Grouped bar chart */}
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barCategoryGap="20%" barGap={2}>
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-muted"
            />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <RechartsTooltip
              contentStyle={{ fontSize: 12 }}
              formatter={(value: number, name: string) => {
                const config = indicatorConfigs.find(
                  c => c.key === name,
                );
                return [value, config?.label || name];
              }}
              labelFormatter={(label: string) => {
                const idx = months.findIndex(m => m.label === label);
                if (idx < 0) return label;
                return months[idx].fullLabel;
              }}
            />
            <Legend
              formatter={(value: string) => {
                const config = indicatorConfigs.find(
                  c => c.key === value,
                );
                return config?.label || value;
              }}
              wrapperStyle={{ fontSize: 11 }}
            />
            {indicatorConfigs.map(config => (
              <Bar
                key={config.key}
                dataKey={config.key}
                fill={INDICATOR_COLORS[config.key] || "#6b7280"}
                radius={[2, 2, 0, 0]}
                maxBarSize={32}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
