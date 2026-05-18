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
  itemsByIndicator: Record<string, DetailItem[]>;
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

export function getWeeksInRange(startDate: Date, endDate: Date): WeekRange[] {
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
  if (previous === 0) return { text: `+${current}`, color: "text-green-600 dark:text-green-400", trend: "up" };
  const pct = ((current - previous) / previous) * 100;
  if (pct > 0) return { text: `+${pct.toFixed(1)}%`, color: "text-green-600 dark:text-green-400", trend: "up" };
  if (pct < 0) return { text: `${pct.toFixed(1)}%`, color: "text-red-600 dark:text-red-400", trend: "down" };
  return { text: "0%", color: "text-muted-foreground", trend: "neutral" };
}

// ============ SDR Breakdown ============
const SDR_INDICATORS: { key: IndicatorType; label: string }[] = [
  { key: "rm", label: "RM" },
  { key: "rr", label: "RR" },
  { key: "proposta", label: "Prop" },
  { key: "venda", label: "Venda" },
];

function getSdrName(item: DetailItem): { display: string; group: string } {
  const raw = (item.sdr || item.responsible || "").trim();
  if (!raw) return { display: "Sem SDR", group: "__none__" };
  return { display: raw, group: raw.toLowerCase() };
}

function getCloserName(item: DetailItem): { display: string; group: string } {
  const raw = (item.closer || "").trim();
  if (!raw) return { display: "Sem Closer", group: "__none__" };
  return { display: raw, group: raw.toLowerCase() };
}

type PersonRole = 'sdr' | 'closer';
function getPersonName(item: DetailItem, role: PersonRole) {
  return role === 'sdr' ? getSdrName(item) : getCloserName(item);
}

interface SdrBreakdownProps {
  itemsByIndicator: Record<string, DetailItem[]>;
  startDate: Date;
  endDate: Date;
  indicatorConfigs: IndicatorConfig[];
  role?: PersonRole; // default 'sdr'
}

function aggregateSdrCounts(
  itemsByIndicator: Record<string, DetailItem[]>,
  columns: { key: IndicatorType; label: string }[],
  startTime: number,
  endTime: number,
  role: PersonRole = 'sdr',
): Map<string, { display: string; counts: Record<string, number> }> {
  const groups = new Map<string, { display: string; counts: Record<string, number> }>();
  for (const col of columns) {
    const items = itemsByIndicator[col.key] || [];
    for (const item of items) {
      if (!item.date) continue;
      const t = new Date(item.date).getTime();
      if (t < startTime || t > endTime) continue;
      const { display, group } = getPersonName(item, role);
      const existing = groups.get(group);
      if (existing) {
        existing.counts[col.key] = (existing.counts[col.key] || 0) + 1;
      } else {
        groups.set(group, {
          display,
          counts: { [col.key]: 1 },
        });
      }
    }
  }
  return groups;
}

export function SdrBreakdown({ itemsByIndicator, startDate, endDate, indicatorConfigs, role = 'sdr' }: SdrBreakdownProps) {
  const roleLabel = role === 'sdr' ? 'SDR' : 'Closer';
  const startTime = startDate.getTime();
  const endTime = new Date(
    endDate.getFullYear(),
    endDate.getMonth(),
    endDate.getDate(),
    23, 59, 59, 999
  ).getTime();

  // Only include columns whose indicator is present in the active config
  const presentKeys = new Set(indicatorConfigs.map(c => c.key));
  const columns = SDR_INDICATORS.filter(i => presentKeys.has(i.key));
  if (columns.length === 0) return null;

  const groups = aggregateSdrCounts(itemsByIndicator, columns, startTime, endTime, role);

  if (groups.size === 0) {
    return (
      <div className="border rounded-lg p-3">
        <div className="text-sm font-semibold mb-1">Por {roleLabel}</div>
        <div className="text-xs text-muted-foreground">
          Sem dados de {roleLabel} no período selecionado.
        </div>
      </div>
    );
  }

  // Sort: highest RM first; if no RM column, by first column desc
  const sortKey = columns[0].key;
  const rows = Array.from(groups.values()).sort(
    (a, b) => (b.counts[sortKey] || 0) - (a.counts[sortKey] || 0)
  );

  // Totals
  const totals: Record<string, number> = {};
  for (const col of columns) {
    totals[col.key] = rows.reduce((sum, r) => sum + (r.counts[col.key] || 0), 0);
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="px-3 py-2 border-b bg-muted/40">
        <div className="text-sm font-semibold">Por {roleLabel} (período completo)</div>
        <div className="text-xs text-muted-foreground">
          Quantidade de cards por {roleLabel} responsável no intervalo selecionado.
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/20">
              <th className="text-left px-3 py-2 font-medium text-muted-foreground">{roleLabel}</th>
              {columns.map(col => (
                <th
                  key={col.key}
                  className="text-right px-3 py-2 font-medium text-muted-foreground"
                  style={{ color: INDICATOR_COLORS[col.key] }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b last:border-b-0 hover:bg-muted/30">
                <td className="px-3 py-1.5">{row.display}</td>
                {columns.map(col => (
                  <td key={col.key} className="text-right px-3 py-1.5 tabular-nums">
                    {row.counts[col.key] || 0}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="bg-muted/40 font-semibold">
              <td className="px-3 py-1.5">Total</td>
              {columns.map(col => (
                <td key={col.key} className="text-right px-3 py-1.5 tabular-nums">
                  {totals[col.key]}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface SdrBreakdownWeeklyProps {
  weeks: WeekRange[];
  itemsByIndicator: Record<string, DetailItem[]>;
  indicatorConfigs: IndicatorConfig[];
  role?: PersonRole; // default 'sdr'
}

export function SdrBreakdownWeekly({ weeks, itemsByIndicator, indicatorConfigs, role = 'sdr' }: SdrBreakdownWeeklyProps) {
  const presentKeys = new Set(indicatorConfigs.map(c => c.key));
  const columns = SDR_INDICATORS.filter(i => presentKeys.has(i.key));
  const roleLabel = role === 'sdr' ? 'SDR' : 'Closer';

  const [activeIndicator, setActiveIndicator] = useState<IndicatorType | null>(
    columns[0]?.key ?? null
  );

  if (columns.length === 0 || !activeIndicator) return null;

  const weeklyAggregates = weeks.map(week => {
    const startTime = week.start.getTime();
    const endTime = week.end.getTime();
    return aggregateSdrCounts(itemsByIndicator, columns, startTime, endTime, role);
  });

  // sdrGroup -> { display, perWeek: number[] }
  const sdrMap = new Map<string, { display: string; perWeek: number[] }>();
  weeklyAggregates.forEach((groups, wIdx) => {
    groups.forEach((data, key) => {
      let entry = sdrMap.get(key);
      if (!entry) {
        entry = { display: data.display, perWeek: new Array(weeks.length).fill(0) };
        sdrMap.set(key, entry);
      }
      entry.perWeek[wIdx] = data.counts[activeIndicator] || 0;
    });
  });

  const sdrRows = Array.from(sdrMap.values()).sort((a, b) => {
    const sa = a.perWeek.reduce((x, y) => x + y, 0);
    const sb = b.perWeek.reduce((x, y) => x + y, 0);
    return sb - sa;
  });

  const weekTotals = weeks.map((_, i) =>
    sdrRows.reduce((sum, r) => sum + r.perWeek[i], 0)
  );

  const activeColor = INDICATOR_COLORS[activeIndicator] || "#6b7280";
  const activeLabel = columns.find(c => c.key === activeIndicator)?.label || activeIndicator;

  const hasAnyData = sdrRows.length > 0 && weekTotals.some(t => t > 0);

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="px-3 py-2 border-b bg-muted/40 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold">Por {roleLabel} — comparativo semanal</div>
          <div className="text-xs text-muted-foreground">
            {activeLabel} por {roleLabel} em cada semana, com variação vs. semana anterior.
          </div>
        </div>
        <div className="flex items-center gap-1">
          {columns.map(col => {
            const isActive = col.key === activeIndicator;
            return (
              <button
                key={col.key}
                type="button"
                onClick={() => setActiveIndicator(col.key)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                  isActive
                    ? "border-transparent text-white"
                    : "bg-background text-muted-foreground hover:bg-muted border-border"
                }`}
                style={
                  isActive
                    ? { backgroundColor: INDICATOR_COLORS[col.key] }
                    : undefined
                }
              >
                {col.label}
              </button>
            );
          })}
        </div>
      </div>

      {!hasAnyData ? (
        <div className="px-3 py-4 text-xs text-muted-foreground text-center">
          Sem dados de {roleLabel} no período selecionado.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/20">
                <th className="text-left px-3 py-2 font-medium text-muted-foreground sticky left-0 bg-muted/20 z-10 min-w-[140px]">
                  {roleLabel}
                </th>
                {weeks.map(week => (
                  <th
                    key={week.label}
                    className="text-center px-2 py-2 font-medium text-muted-foreground min-w-[90px]"
                  >
                    <div>{week.shortLabel}</div>
                    <div className="text-[10px] font-normal opacity-70">
                      {format(week.start, "dd/MM")}–{format(week.end, "dd/MM")}
                    </div>
                  </th>
                ))}
                <th className="text-center px-3 py-2 font-medium text-muted-foreground min-w-[70px]">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {sdrRows.map((row, idx) => {
                const total = row.perWeek.reduce((a, b) => a + b, 0);
                return (
                  <tr key={idx} className="border-b last:border-b-0 hover:bg-muted/30">
                    <td className="px-3 py-1.5 font-medium sticky left-0 bg-background z-10">
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: activeColor }}
                        />
                        {row.display}
                      </div>
                    </td>
                    {row.perWeek.map((count, wIdx) => {
                      const prev = wIdx > 0 ? row.perWeek[wIdx - 1] : null;
                      const change = prev === null
                        ? { text: "—", color: "text-muted-foreground", trend: "neutral" as const }
                        : formatPctChange(count, prev);
                      return (
                        <td key={wIdx} className="text-center px-2 py-1.5">
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="font-semibold tabular-nums text-sm">{count}</span>
                            <span
                              className={`flex items-center gap-0.5 text-[10px] font-medium ${change.color}`}
                            >
                              {change.trend === "up" && <TrendingUp className="h-2.5 w-2.5" />}
                              {change.trend === "down" && <TrendingDown className="h-2.5 w-2.5" />}
                              {change.trend === "neutral" && <Minus className="h-2.5 w-2.5" />}
                              {change.text}
                            </span>
                          </div>
                        </td>
                      );
                    })}
                    <td className="text-center px-3 py-1.5 font-bold tabular-nums">
                      {total}
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-muted/40 font-semibold border-t-2">
                <td className="px-3 py-1.5 sticky left-0 bg-muted/40 z-10">Total</td>
                {weekTotals.map((total, wIdx) => {
                  const prev = wIdx > 0 ? weekTotals[wIdx - 1] : null;
                  const change = prev === null
                    ? { text: "—", color: "text-muted-foreground", trend: "neutral" as const }
                    : formatPctChange(total, prev);
                  return (
                    <td key={wIdx} className="text-center px-2 py-1.5">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="tabular-nums text-sm">{total}</span>
                        <span
                          className={`flex items-center gap-0.5 text-[10px] font-medium ${change.color}`}
                        >
                          {change.trend === "up" && <TrendingUp className="h-2.5 w-2.5" />}
                          {change.trend === "down" && <TrendingDown className="h-2.5 w-2.5" />}
                          {change.trend === "neutral" && <Minus className="h-2.5 w-2.5" />}
                          {change.text}
                        </span>
                      </div>
                    </td>
                  );
                })}
                <td className="text-center px-3 py-1.5 tabular-nums font-bold">
                  {weekTotals.reduce((a, b) => a + b, 0)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function WeeklyComparison({ startDate, endDate, itemsByIndicator, indicatorConfigs }: WeeklyComparisonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const totalDays = differenceInDays(endDate, startDate) + 1;

  // All hooks must be called before any early return (React Rules of Hooks)
  const weeks = useMemo(() => getWeeksInRange(startDate, endDate), [startDate, endDate]);

  // Use pre-computed items from parent (avoids stale closure issues)
  const allItemsByIndicator = itemsByIndicator;

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

  // Early return AFTER all hooks (React Rules of Hooks)
  if (totalDays > 62) return null;

  const startMonth = format(startDate, "MMMM yyyy", { locale: ptBR });
  const endMonth = format(endDate, "MMMM yyyy", { locale: ptBR });
  const capitalizedMonth = startMonth === endMonth
    ? startMonth.charAt(0).toUpperCase() + startMonth.slice(1)
    : `${startMonth.charAt(0).toUpperCase() + startMonth.slice(1)} — ${endMonth.charAt(0).toUpperCase() + endMonth.slice(1)}`;

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

            {/* Breakdown por SDR (RM, RR, Proposta, Venda) — período completo */}
            <SdrBreakdown
              itemsByIndicator={allItemsByIndicator}
              startDate={startDate}
              endDate={endDate}
              indicatorConfigs={indicatorConfigs}
              role="sdr"
            />

            {/* Breakdown por SDR semana a semana */}
            <SdrBreakdownWeekly
              weeks={weeks}
              itemsByIndicator={allItemsByIndicator}
              indicatorConfigs={indicatorConfigs}
              role="sdr"
            />

            {/* Breakdown por Closer (RM, RR, Proposta, Venda) — período completo */}
            <SdrBreakdown
              itemsByIndicator={allItemsByIndicator}
              startDate={startDate}
              endDate={endDate}
              indicatorConfigs={indicatorConfigs}
              role="closer"
            />

            {/* Breakdown por Closer semana a semana */}
            <SdrBreakdownWeekly
              weeks={weeks}
              itemsByIndicator={allItemsByIndicator}
              indicatorConfigs={indicatorConfigs}
              role="closer"
            />

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
