import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ComposedChart,
  Bar,
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const MONTHS_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"] as const;

const fmtCurrency = (v: number) => {
  if (!v) return "R$ 0";
  if (Math.abs(v) >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return `R$ ${v.toFixed(0)}`;
};
const fmtPct = (n: number) => `${n.toFixed(1)}%`;

interface Props {
  porBu: Array<{ bu: string; categorias: { serie: { period: string; value: number }[] }[] }>;
  corporativo: { categorias: { serie: { period: string; value: number }[] }[] };
  receitaPorMes: Record<string, number>;
  oxyDreByBU: any;
}

export function CustoReceitaCharts({ porBu, corporativo, receitaPorMes, oxyDreByBU }: Props) {
  const data = useMemo(() => {
    // Coleta períodos a partir do custo (yyyy-MM)
    const allPeriods = new Set<string>();
    for (const b of porBu) for (const c of b.categorias) for (const s of c.serie) allPeriods.add(s.period);
    for (const c of corporativo.categorias) for (const s of c.serie) allPeriods.add(s.period);
    const periods = Array.from(allPeriods).sort();

    return periods.map((p) => {
      // folha total do mês
      let folha = 0;
      for (const b of porBu) for (const c of b.categorias) for (const s of c.serie) if (s.period === p) folha += s.value;
      for (const c of corporativo.categorias) for (const s of c.serie) if (s.period === p) folha += s.value;

      const receitaTotal = receitaPorMes[p] || 0;

      // Receita por BU (Oxy DRE usa nome de mês, sem ano)
      const monthIdx = parseInt(p.slice(5, 7), 10) - 1;
      const mLabel = MONTHS_PT[monthIdx];
      const caas = (oxyDreByBU?.caasByMonth?.[mLabel] || 0) as number;
      const saas = (oxyDreByBU?.saasByMonth?.[mLabel] || 0) as number;
      const o2Tax = (oxyDreByBU?.dreByBU?.o2_tax?.[mLabel] || 0) as number;
      const expansao = ((oxyDreByBU?.dreByBU?.oxy_hacker?.[mLabel] || 0) + (oxyDreByBU?.dreByBU?.franquia?.[mLabel] || 0)) as number;

      const pct = receitaTotal > 0 ? (folha / receitaTotal) * 100 : 0;

      return {
        period: p,
        label: `${mLabel}/${p.slice(2, 4)}`,
        Folha: folha,
        Receita: receitaTotal,
        CaaS: caas,
        SaaS: saas,
        "O2 TAX": o2Tax,
        "Expansão": expansao,
        pct,
      };
    });
  }, [porBu, corporativo, receitaPorMes, oxyDreByBU]);

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">Sem dados para o período.</p>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
      {/* Gráfico A — Absoluto: Folha vs Receita */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Folha vs Receita — absoluto</CardTitle>
          <p className="text-xs text-muted-foreground">Custo total de pessoal e receita total mensal</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtCurrency} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }}
                formatter={(v: number, name: string) => [fmtCurrency(v), name]}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="Folha" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Receita" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Gráfico B — Receita por BU (linhas) + % Custo/Receita (barras) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Receita por BU + % Custo de gente</CardTitle>
          <p className="text-xs text-muted-foreground">Linhas = receita por BU · Barras = % folha sobre receita total</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickFormatter={fmtCurrency} />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `${v.toFixed(0)}%`}
              />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }}
                formatter={(v: number, name: string) =>
                  name === "% Custo/Receita" ? [fmtPct(v), name] : [fmtCurrency(v), name]
                }
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="right" dataKey="pct" name="% Custo/Receita" fill="hsl(var(--warning))" opacity={0.4} />
              <Line yAxisId="left" type="monotone" dataKey="Modelo Atual" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} />
              <Line yAxisId="left" type="monotone" dataKey="O2 TAX" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} />
              <Line yAxisId="left" type="monotone" dataKey="Expansão" stroke="hsl(var(--chart-4))" strokeWidth={2} dot={false} />
              <Line yAxisId="left" type="monotone" dataKey="Receita" stroke="hsl(var(--foreground))" strokeDasharray="5 5" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
