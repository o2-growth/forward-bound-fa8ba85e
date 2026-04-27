import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
} from "recharts";
import { format } from "date-fns";
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
  getItemsForIndicator: (key: IndicatorType) => DetailItem[];
  indicatorConfigs: IndicatorConfig[];
}

interface MonthBucket {
  key: string;        // "2026-01"
  label: string;      // "Jan"
  fullLabel: string;  // "Janeiro 2026"
  year: number;
  month: number;      // 0-based
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

function getMonthsInRange(startDate: Date, endDate: Date): MonthBucket[] {
  const months: MonthBucket[] = [];
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  let y = startDate.getFullYear();
  let m = startDate.getMonth();
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

function formatPctChange(
  current: number,
  previous: number,
): { text: string; color: string; trend: "up" | "down" | "neutral" } {
  if (previous === 0 && current === 0)
    return { text: "\u2014", color: "text-muted-foreground", trend: "neutral" };
  if (previous === 0)
    return { text: `+${current}`, color: "text-green-600 dark:text-green-400", trend: "up" };
  const pct = ((current - previous) / previous) * 100;
  if (pct > 0)
    return { text: `+${pct.toFixed(1)}%`, color: "text-green-600 dark:text-green-400", trend: "up" };
  if (pct < 0)
    return { text: `${pct.toFixed(1)}%`, color: "text-red-600 dark:text-red-400", trend: "down" };
  return { text: "0%", color: "text-muted-foreground", trend: "neutral" };
}

export function MonthlyComparison({
  startDate,
  endDate,
  getItemsForIndicator,
  indicatorConfigs,
}: MonthlyComparisonProps) {
  const [isOpen, setIsOpen] = useState(true);

  const months = useMemo(() => getMonthsInRange(startDate, endDate), [startDate, endDate]);

  // Pre-fetch all items per indicator once
  const allItemsByIndicator = useMemo(() => {
    const map: Record<string, DetailItem[]> = {};
    for (const config of indicatorConfigs) {
      map[config.key] = getItemsForIndicator(config.key);
    }
    return map;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indicatorConfigs, startDate, endDate]);

  // monthIndex -> indicatorKey -> count
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

  // Chart data
  const chartData = useMemo(() => {
    return months.map((month, i) => {
      const entry: Record<string, string | number> = { name: month.label };
      for (const config of indicatorConfigs) {
        entry[config.key] = monthlyData[i][config.key];
      }
      return entry;
    });
  }, [months, monthlyData, indicatorConfigs]);

  // Need at least 1 month
  if (months.length === 0) return null;

  const yearLabel = months[0].year === months[months.length - 1].year
    ? String(months[0].year)
    : `${months[0].year}/${months[months.length - 1].year}`;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Comparativo Mensal &mdash; {yearLabel}</span>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-6">
            {/* Month cards grid */}
            <div
              className="grid gap-3"
              style={{
                gridTemplateColumns: `repeat(${Math.min(months.length, 6)}, minmax(0, 1fr))`,
              }}
            >
              {months.map((month, monthIdx) => (
                <div key={month.key} className="border rounded-lg p-3 space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground border-b pb-1.5 mb-1 flex items-center gap-1.5">
                    {month.label}
                    {month.isCurrentMonth && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0 leading-tight">
                        Em andamento
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
                      color: string;
                      trend: "up" | "down" | "neutral";
                    };
                    if (prevCount === null) {
                      changeInfo = {
                        text: "\u2014",
                        color: "text-muted-foreground",
                        trend: "neutral",
                      };
                    } else {
                      changeInfo = formatPctChange(count, prevCount);
                    }

                    return (
                      <div
                        key={config.key}
                        className="flex items-center justify-between text-sm"
                      >
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
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
