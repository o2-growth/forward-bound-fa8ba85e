import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cake, Users } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import type { PessoaRow } from "@/hooks/useHrData";
import { ageStats, ageByBu, AGE_BUCKET_ORDER, type AgeBucket } from "./helpers";

interface Props {
  rows: PessoaRow[];
  timeToBu: (t: string) => string;
  onDrill?: (bucket: AgeBucket) => void;
}

const BUCKET_COLOR: Record<AgeBucket, string> = {
  "<25": "hsl(var(--chart-1))",
  "25–30": "hsl(var(--chart-2))",
  "30–35": "hsl(var(--chart-3))",
  "35–40": "hsl(var(--chart-4))",
  "40–50": "hsl(var(--chart-5))",
  ">50": "hsl(var(--primary))",
  "N/I": "hsl(var(--muted-foreground))",
};

export function AgeDistribution({ rows, timeToBu }: Props) {
  const stats = useMemo(() => ageStats(rows), [rows]);
  const byBu = useMemo(() => ageByBu(rows, timeToBu), [rows, timeToBu]);

  if (stats.total === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Cake className="h-4 w-4 text-muted-foreground" />
            Distribuição etária
          </CardTitle>
          <div className="text-xs text-muted-foreground">
            {stats.comDado}/{stats.total} com data de nascimento
            {stats.semDado > 0 && <span className="ml-1 text-amber-500">· {stats.semDado} sem dado</span>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* KPIs idade */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi label="Idade média" value={stats.media ? `${stats.media.toFixed(1)} anos` : "—"} />
          <Kpi label="Mediana" value={stats.mediana ? `${stats.mediana.toFixed(0)} anos` : "—"} />
          <Kpi label="Mais novo" value={stats.min ? `${stats.min}` : "—"} />
          <Kpi label="Mais velho" value={stats.max ? `${stats.max}` : "—"} />
        </div>

        {/* Histograma por faixa */}
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.distribuicao} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
              <XAxis dataKey="bucket" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 12 }}
                formatter={(v: any, _n, p: any) => [`${v} pessoa(s) (${p.payload.pct.toFixed(1)}%)`, "Headcount"]}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {stats.distribuicao.map((d) => (
                  <Cell key={d.bucket} fill={BUCKET_COLOR[d.bucket]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Quebra por BU */}
        {byBu.length > 0 && (
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <Users className="h-3 w-3" /> Por BU
            </div>
            <div className="space-y-1.5">
              {byBu.map((row) => (
                <div key={row.bu} className="flex items-center gap-2">
                  <div className="w-24 text-xs text-foreground truncate">{row.bu}</div>
                  <div className="flex-1 h-5 rounded overflow-hidden flex bg-muted/40">
                    {AGE_BUCKET_ORDER.filter((b) => row.buckets[b] > 0).map((b) => {
                      const pct = (row.buckets[b] / row.total) * 100;
                      return (
                        <div
                          key={b}
                          style={{ width: `${pct}%`, background: BUCKET_COLOR[b] }}
                          title={`${b}: ${row.buckets[b]} (${pct.toFixed(0)}%)`}
                        />
                      );
                    })}
                  </div>
                  <div className="w-12 text-right text-xs text-muted-foreground tabular-nums">{row.total}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
              {AGE_BUCKET_ORDER.filter((b) => stats.distribuicao.some((d) => d.bucket === b)).map((b) => (
                <div key={b} className="flex items-center gap-1 text-muted-foreground">
                  <span className="inline-block h-2 w-2 rounded-sm" style={{ background: BUCKET_COLOR[b] }} />
                  {b}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border bg-card/40 p-2.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold text-foreground tabular-nums mt-0.5">{value}</div>
    </div>
  );
}
