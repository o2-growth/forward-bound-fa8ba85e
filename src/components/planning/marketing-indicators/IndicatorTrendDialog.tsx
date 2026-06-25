import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export type IndicatorFmt = "brl" | "int" | "pct" | "x" | "mes";

interface SeriesPoint {
  key: string;
  label: string;
  value: number | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  label: string;
  fmt: IndicatorFmt;
  bench?: number;
  series: SeriesPoint[];
}

function fmtValue(v: number | null | undefined, fmt: IndicatorFmt): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  switch (fmt) {
    case "brl":
      return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
    case "int":
      return v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
    case "pct":
      return `${(v * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
    case "x":
      return `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}x`;
    case "mes":
      return `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} m`;
  }
}

function fmtAxis(v: number, fmt: IndicatorFmt): string {
  if (fmt === "brl") {
    if (Math.abs(v) >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
    if (Math.abs(v) >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
    return `R$ ${v.toFixed(0)}`;
  }
  if (fmt === "pct") return `${(v * 100).toFixed(0)}%`;
  if (fmt === "x") return `${v.toFixed(1)}x`;
  if (fmt === "mes") return `${v.toFixed(0)}m`;
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

export function IndicatorTrendDialog({ open, onOpenChange, label, fmt, bench, series }: Props) {
  const valid = useMemo(() => series.filter((p) => p.value !== null && !Number.isNaN(p.value as number)), [series]);

  const stats = useMemo(() => {
    if (valid.length === 0) return null;
    const values = valid.map((p) => p.value as number);
    const last = valid[valid.length - 1];
    const prev = valid.length > 1 ? valid[valid.length - 2] : null;
    const mom = prev && (prev.value as number) !== 0
      ? ((last.value as number) - (prev.value as number)) / Math.abs(prev.value as number)
      : null;
    let best = valid[0];
    let worst = valid[0];
    for (const p of valid) {
      if ((p.value as number) > (best.value as number)) best = p;
      if ((p.value as number) < (worst.value as number)) worst = p;
    }
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    return { last, prev, mom, best, worst, avg };
  }, [valid]);

  const chartData = series.map((p) => ({ label: p.label, value: p.value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription>
            Evolução mês a mês — 2025 (planilha) + 2026 (ao vivo). Trimestres e totais ficam fora do gráfico.
          </DialogDescription>
        </DialogHeader>

        {valid.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Sem dados para este indicador.</div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <StatCard title="Último" value={fmtValue(stats!.last.value, fmt)} hint={stats!.last.label} />
              <StatCard title="Anterior" value={fmtValue(stats!.prev?.value ?? null, fmt)} hint={stats!.prev?.label ?? "—"} />
              <MomCard mom={stats!.mom} />
              <StatCard title="Melhor" value={fmtValue(stats!.best.value, fmt)} hint={stats!.best.label} tone="positive" />
              <StatCard title="Pior" value={fmtValue(stats!.worst.value, fmt)} hint={stats!.worst.label} tone="negative" />
            </div>

            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => fmtAxis(v, fmt)} tick={{ fontSize: 11 }} width={70} />
                  <Tooltip
                    formatter={(v: number) => [fmtValue(v, fmt), label]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                    }}
                  />
                  {bench !== undefined && (
                    <ReferenceLine
                      y={bench}
                      stroke="hsl(var(--muted-foreground))"
                      strokeDasharray="4 4"
                      label={{ value: `Bench ${fmtValue(bench, fmt)}`, position: "right", fontSize: 11 }}
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StatCard({ title, value, hint, tone }: { title: string; value: string; hint?: string; tone?: "positive" | "negative" }) {
  return (
    <div className="rounded-md border bg-card p-3">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{title}</p>
      <p className={cn("text-lg font-semibold tabular-nums", tone === "positive" && "text-emerald-600", tone === "negative" && "text-destructive")}>
        {value}
      </p>
      {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  );
}

function MomCard({ mom }: { mom: number | null }) {
  const up = mom !== null && mom > 0;
  const down = mom !== null && mom < 0;
  const Icon = up ? ArrowUp : down ? ArrowDown : Minus;
  return (
    <div className="rounded-md border bg-card p-3">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Variação MoM</p>
      <p className={cn("text-lg font-semibold tabular-nums flex items-center gap-1", up && "text-emerald-600", down && "text-destructive")}>
        <Icon className="h-4 w-4" />
        {mom === null ? "—" : `${(mom * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`}
      </p>
      <p className="text-[10px] text-muted-foreground mt-0.5">vs mês anterior</p>
    </div>
  );
}
