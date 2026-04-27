import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, addDays, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DetailItem } from "./DetailSheet";
import { IndicatorType } from "@/hooks/useFunnelRealized";

interface IndicatorConfig {
  key: IndicatorType;
  label: string;
  shortLabel?: string;
}

interface WeeklyComparisonProps {
  startDate: Date;
  endDate: Date;
  getItemsForIndicator: (key: IndicatorType) => DetailItem[];
  indicatorConfigs: IndicatorConfig[];
}

interface WeekRange {
  label: string;
  shortLabel: string;
  start: Date;
  end: Date;
}

const INDICATOR_COLORS: Record<string, string> = {
  mql: "#3b82f6",      // blue
  rm: "#22c55e",       // green
  rr: "#f59e0b",       // amber
  proposta: "#a855f7", // purple
  venda: "#ef4444",    // red
};

const INDICATOR_SHORT_LABELS: Record<string, string> = {
  mql: "MQL",
  rm: "RM",
  rr: "RR",
  proposta: "Prop",
  venda: "Venda",
};

function getWeeksInRange(startDate: Date, endDate: Date): WeekRange[] {
  const weeks: WeekRange[] = [];
  let current = new Date(startDate);
  let weekNum = 1;

  while (current <= endDate) {
    const weekEnd = new Date(Math.min(addDays(current, 6).getTime(), endDate.getTime()));
    const startDay = current.getDate();
    const endDay = weekEnd.getDate();
    weeks.push({
      label: `S${weekNum} (${startDay}-${endDay})`,
      shortLabel: `S${weekNum}`,
      start: new Date(current),
      end: new Date(weekEnd.getFullYear(), weekEnd.getMonth(), weekEnd.getDate(), 23, 59, 59, 999),
    });
    current = addDays(weekEnd, 1);
    current = new Date(current.getFullYear(), current.getMonth(), current.getDate(), 0, 0, 0, 0);
    weekNum++;
  }

  return weeks;
}

function countItemsInWeek(items: DetailItem[], weekStart: Date, weekEnd: Date): number {
  const startTime = weekStart.getTime();
  const endTime = weekEnd.getTime();
  return items.filter(item => {
    if (!item.date) return false;
    const d = new Date(item.date).getTime();
    return d >= startTime && d <= endTime;
  }).length;
}

function formatPctChange(current: number, previous: number): { text: string; color: string; trend: "up" | "down" | "neutral" } {
  if (previous === 0 && current === 0) return { text: "—", color: "text-muted-foreground", trend: "neutral" };
  if (previous === 0) return { text: `+${current * 100}%`, color: "text-green-600 dark:text-green-400", trend: "up" };
  const pct = ((current - previous) / previous) * 100;
  if (pct > 0) return { text: `+${pct.toFixed(1)}%`, color: "text-green-600 dark:text-green-400", trend: "up" };
  if (pct < 0) return { text: `${pct.toFixed(1)}%`, color: "text-red-600 dark:text-red-400", trend: "down" };
  return { text: "0%", color: "text-muted-foreground", trend: "neutral" };
}

export function WeeklyComparison({ startDate, endDate, getItemsForIndicator, indicatorConfigs }: WeeklyComparisonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const totalDays = differenceInDays(endDate, startDate) + 1;

  // Only render when date range is <= 62 days (roughly 2 months)
  if (totalDays > 62) return null;

  const weeks = useMemo(() => getWeeksInRange(startDate, endDate), [startDate, endDate]);

  // Pre-fetch all items for each indicator once
  const allItemsByIndicator = useMemo(() => {
    const map: Record<string, DetailItem[]> = {};
    for (const config of indicatorConfigs) {
      map[config.key] = getItemsForIndicator(config.key);
    }
    return map;
  }, [indicatorConfigs, getItemsForIndicator]);

  // Build weekly data matrix: weekIndex -> indicatorKey -> count
  const weeklyData = useMemo(() => {
    return weeks.map(week => {
      const row: Record<string, number> = {};
      for (const config of indicatorConfigs) {
        row[config.key] = countItemsInWeek(allItemsByIndicator[config.key] || [], week.start, week.end);
      }
      return row;
    });
  }, [weeks, indicatorConfigs, allItemsByIndicator]);

  // Build chart data
  const chartData = useMemo(() => {
    return weeks.map((week, i) => {
      const entry: Record<string, string | number> = { name: week.shortLabel };
      for (const config of indicatorConfigs) {
        entry[config.key] = weeklyData[i][config.key];
      }
      return entry;
    });
  }, [weeks, weeklyData, indicatorConfigs]);

  const monthLabel = format(startDate, "MMMM yyyy", { locale: ptBR });
  const capitalizedMonth = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Comparativo Semanal — {capitalizedMonth}</span>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-6">
            {/* Week cards grid */}
            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(weeks.length, 5)}, minmax(0, 1fr))` }}>
              {weeks.map((week, weekIdx) => (
                <div key={week.label} className="border rounded-lg p-3 space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground border-b pb-1.5 mb-1">
                    {week.label}
                  </div>
                  {indicatorConfigs.map(config => {
                    const count = weeklyData[weekIdx][config.key];
                    const prevCount = weekIdx > 0 ? weeklyData[weekIdx - 1][config.key] : null;
                    const shortLabel = INDICATOR_SHORT_LABELS[config.key] || config.label;
                    const color = INDICATOR_COLORS[config.key] || "#6b7280";

                    let changeInfo: { text: string; color: string; trend: "up" | "down" | "neutral" };
                    if (prevCount === null) {
                      changeInfo = { text: "—", color: "text-muted-foreground", trend: "neutral" };
                    } else {
                      changeInfo = formatPctChange(count, prevCount);
                    }

                    return (
                      <div key={config.key} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          <span className="text-xs text-muted-foreground">{shortLabel}:</span>
                          <span className="font-semibold text-sm">{count}</span>
                        </div>
                        <div className={`flex items-center gap-0.5 text-xs font-medium ${changeInfo.color}`}>
                          {changeInfo.trend === "up" && <TrendingUp className="h-3 w-3" />}
                          {changeInfo.trend === "down" && <TrendingDown className="h-3 w-3" />}
                          {changeInfo.trend === "neutral" && <Minus className="h-3 w-3" />}
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
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ fontSize: 12 }}
                    formatter={(value: number, name: string) => {
                      const config = indicatorConfigs.find(c => c.key === name);
                      const label = config?.label || name;
                      return [value, label];
                    }}
                    labelFormatter={(label: string) => {
                      const weekIdx = weeks.findIndex(w => w.shortLabel === label);
                      if (weekIdx < 0) return label;
                      const week = weeks[weekIdx];
                      return `${week.label} (${format(week.start, "dd/MM")} - ${format(week.end, "dd/MM")})`;
                    }}
                  />
                  <Legend
                    formatter={(value: string) => {
                      const config = indicatorConfigs.find(c => c.key === value);
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
