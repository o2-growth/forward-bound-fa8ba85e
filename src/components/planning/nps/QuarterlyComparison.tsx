import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingDown, TrendingUp, Users, DollarSign, Clock, BarChart3 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, ReferenceLine, ComposedChart, Cell, LabelList,
} from 'recharts';

interface QuarterlyComparisonProps {
  visible: boolean;
}

export function QuarterlyComparison({ visible }: QuarterlyComparisonProps) {
  if (!visible) return null;

  const revenueChurnMonthly = [
    { month: 'Jan/26', value: 18737, pct: 2.67 },
    { month: 'Fev/26', value: 35457, pct: 4.39 },
    { month: 'Mar/26', value: 85078, pct: 10.22 },
  ];
  const logoChurnMonthly = [
    { month: 'Jan/26', value: 3, pct: 2.52 },
    { month: 'Fev/26', value: 7, pct: 5.47 },
    { month: 'Mar/26', value: 15, pct: 11.36 },
  ];
  const q4RevenueChurnAvg = 57534; // 172603 / 3
  const q4LogoChurnAvg = 7.3; // 22 / 3

  // Quarter totals for side-by-side comparison
  const revenueQuarterTotals = [
    { quarter: 'Q4/2025', value: 172603, pct: 9.3 },
    { quarter: 'Q1/2026', value: 139273, pct: 5.95 },
  ];
  const logoQuarterTotals = [
    { quarter: 'Q4/2025', value: 22, pct: 19.2 },
    { quarter: 'Q1/2026', value: 25, pct: 19.79 },
  ];
  const quarterColors = ['#94a3b8', '#ef4444']; // gray for Q4, red for Q1
  const logoQuarterColors = ['#94a3b8', '#f97316']; // gray for Q4, orange for Q1

  const formatBRL = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const revenueTooltipFormatter = (value: number) => formatBRL(value);
  const logoTooltipFormatter = (value: number) => `${value} clientes`;

  type MetricRow = { icon: React.ReactNode; label: string; q4: string; q1: string; badge: string; good: boolean };
  const metrics: MetricRow[] = [
    { icon: <DollarSign className="h-4 w-4" />, label: 'MRR Base Médio', q4: 'R$ 616.341', q1: 'R$ 780.582', badge: '+26,6%', good: true },
    { icon: <TrendingDown className="h-4 w-4" />, label: 'Revenue Churn', q4: 'R$ 172.603 (9,3%)', q1: 'R$ 139.273 (5,95%)', badge: '-3,35pp', good: true },
    { icon: <Users className="h-4 w-4" />, label: 'Logo Churn', q4: '22 clientes (19,2%)', q1: '25 clientes (19,79%)', badge: '+0,59pp', good: false },
    { icon: <Clock className="h-4 w-4" />, label: 'LT Médio', q4: '5,76 meses', q1: '5,2 meses', badge: '-0,56m', good: false },
    { icon: <BarChart3 className="h-4 w-4" />, label: 'Clientes Ativos', q4: '114,7', q1: '126,3', badge: '+11,6', good: true },
  ];

  const renderRevenueLabel = (props: { x?: number; y?: number; width?: number; index?: number }) => {
    const { x = 0, y = 0, width = 0, index = 0 } = props;
    const item = revenueQuarterTotals[index];
    if (!item) return null;
    return (
      <text x={x + width / 2} y={y - 8} textAnchor="middle" fontSize={11} fontWeight={600} fill="#64748b">
        {item.pct}%
      </text>
    );
  };

  const renderLogoLabel = (props: { x?: number; y?: number; width?: number; index?: number }) => {
    const { x = 0, y = 0, width = 0, index = 0 } = props;
    const item = logoQuarterTotals[index];
    if (!item) return null;
    return (
      <text x={x + width / 2} y={y - 8} textAnchor="middle" fontSize={11} fontWeight={600} fill="#64748b">
        {item.pct}%
      </text>
    );
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Comparativo Trimestral — Q4/2025 vs Q1/2026</h3>

      {/* Summary cards - compact grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-muted">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Q4/2025</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-2">
            <div className="space-y-2">
              {metrics.map((m, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground shrink-0">{m.icon}</span>
                  <span className="text-muted-foreground min-w-[110px]">{m.label}</span>
                  <span className="font-medium ml-auto text-right">{m.q4}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/30">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-sm font-semibold text-primary uppercase tracking-wide">Q1/2026</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-2">
            <div className="space-y-2">
              {metrics.map((m, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground shrink-0">{m.icon}</span>
                  <span className="text-muted-foreground min-w-[110px]">{m.label}</span>
                  <span className="font-medium ml-auto">{m.q1}</span>
                  <Badge className={`text-[10px] px-1.5 py-0 ${m.good
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}>{m.badge}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 1: Quarter-total comparison charts (Q4 vs Q1 side by side bars) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Revenue Churn — Q4 vs Q1 totals */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Revenue Churn — Q4 vs Q1 (Total)</CardTitle>
            <p className="text-xs text-muted-foreground">Valores consolidados por trimestre</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={revenueQuarterTotals} margin={{ top: 24, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="quarter" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                <YAxis
                  tick={{ fontSize: 11 }}
                  className="fill-muted-foreground"
                  tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                />
                <RechartsTooltip
                  formatter={revenueTooltipFormatter}
                  labelStyle={{ fontWeight: 600 }}
                  contentStyle={{ borderRadius: 8, fontSize: 13 }}
                />
                <Bar dataKey="value" name="Revenue Churn" radius={[4, 4, 0, 0]} maxBarSize={64}>
                  {revenueQuarterTotals.map((_entry, idx) => (
                    <Cell key={idx} fill={quarterColors[idx]} />
                  ))}
                  <LabelList content={renderRevenueLabel} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Logo Churn — Q4 vs Q1 totals */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Logo Churn — Q4 vs Q1 (Total)</CardTitle>
            <p className="text-xs text-muted-foreground">Quantidade de clientes por trimestre</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={logoQuarterTotals} margin={{ top: 24, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="quarter" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <RechartsTooltip
                  formatter={logoTooltipFormatter}
                  labelStyle={{ fontWeight: 600 }}
                  contentStyle={{ borderRadius: 8, fontSize: 13 }}
                />
                <Bar dataKey="value" name="Logo Churn" radius={[4, 4, 0, 0]} maxBarSize={64}>
                  {logoQuarterTotals.map((_entry, idx) => (
                    <Cell key={idx} fill={logoQuarterColors[idx]} />
                  ))}
                  <LabelList content={renderLogoLabel} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Monthly Q1 breakdown charts with Q4 reference lines */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Revenue Churn monthly chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Revenue Churn Mensal (Q1/2026)</CardTitle>
            <p className="text-xs text-muted-foreground">Linha tracejada = média mensal Q4/2025 (R$ 57.534)</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={revenueChurnMonthly} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                <YAxis
                  tick={{ fontSize: 11 }}
                  className="fill-muted-foreground"
                  tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                />
                <RechartsTooltip
                  formatter={revenueTooltipFormatter}
                  labelStyle={{ fontWeight: 600 }}
                  contentStyle={{ borderRadius: 8, fontSize: 13 }}
                />
                <ReferenceLine
                  y={q4RevenueChurnAvg}
                  stroke="#94a3b8"
                  strokeDasharray="6 4"
                  strokeWidth={2}
                  label={{ value: 'Média Q4', position: 'right', fontSize: 11, fill: '#94a3b8' }}
                />
                <Bar dataKey="value" name="Revenue Churn" radius={[4, 4, 0, 0]} maxBarSize={48} fill="#ef4444" />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Logo Churn monthly chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Logo Churn Mensal (Q1/2026)</CardTitle>
            <p className="text-xs text-muted-foreground">Linha tracejada = média mensal Q4/2025 (7,3 clientes)</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={logoChurnMonthly} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <RechartsTooltip
                  formatter={logoTooltipFormatter}
                  labelStyle={{ fontWeight: 600 }}
                  contentStyle={{ borderRadius: 8, fontSize: 13 }}
                />
                <ReferenceLine
                  y={q4LogoChurnAvg}
                  stroke="#94a3b8"
                  strokeDasharray="6 4"
                  strokeWidth={2}
                  label={{ value: 'Média Q4', position: 'right', fontSize: 11, fill: '#94a3b8' }}
                />
                <Bar dataKey="value" name="Logo Churn" radius={[4, 4, 0, 0]} maxBarSize={48} fill="#f97316" />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Churn % trend — gauge-like comparison */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Revenue Churn % — Tendência Trimestral</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-8 py-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Q4/2025</p>
              <p className="text-3xl font-bold text-red-500">9,3%</p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <TrendingDown className="h-6 w-6 text-green-500" />
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-sm font-semibold px-3">
                -3,35pp
              </Badge>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Q1/2026</p>
              <p className="text-3xl font-bold text-amber-500">5,95%</p>
            </div>
          </div>
          {/* Progress-like bar showing improvement */}
          <div className="max-w-md mx-auto mt-2">
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              <span>Meta: 5%</span>
              <span>Q4: 9,3%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-3 relative">
              {/* Q4 marker */}
              <div
                className="absolute top-0 h-3 rounded-full bg-red-400/40"
                style={{ width: '93%' }}
              />
              {/* Q1 current */}
              <div
                className="absolute top-0 h-3 rounded-full bg-amber-500"
                style={{ width: '59.5%' }}
              />
              {/* Meta line */}
              <div
                className="absolute top-0 h-3 border-r-2 border-green-600 border-dashed"
                style={{ left: '50%' }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center mt-1">Falta 0,95pp para atingir a meta de 5%</p>
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Insights — Q4/25 vs Q1/26</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <p><span className="font-semibold">1. Receita perdida caiu, mas qtde de clientes subiu:</span> Q4 perdeu R$172k em 22 clientes; Q1 perdeu R$139k em 25 clientes. Tickets menores no Q1 — sinal de churn pulverizado, mais difícil de prever e prevenir.</p>
          </div>
          <div>
            <p><span className="font-semibold">2. Mudança de motivo dominante:</span> em Q4, &quot;Financeiro&quot; (caixa do cliente) foi o principal motivo (~50%). Em Q1, ele perde força — entram fortes &quot;Atendimento O2&quot;, &quot;Problema na Oxy&quot; e &quot;Comercial&quot;. Esses motivos são <strong>internos</strong> e <strong>acionáveis</strong>.</p>
          </div>
          <div>
            <p><span className="font-semibold">3. Março/26 é o pior mês dos 6:</span> 15 churns e 10,22% de Revenue Churn. Saltou de 7 (Fev) para 15 churns — 114% de aumento. Eduardo Pedrolo concentrou 6 cancelamentos.</p>
          </div>
          <div>
            <p><span className="font-semibold">4. Janeiro/26 foi o melhor mês:</span> apenas 3 churns recorrentes (2,52%) e Revenue Churn de 2,67%. Mostra que a meta é viável quando há controle — o desafio é manter consistência.</p>
          </div>
          <div>
            <p><span className="font-semibold">5. MRR cresceu 26,7% trimestre vs trimestre</span> (R$616k → R$781k médio), mas o Logo Churn % se manteve quase igual (~19%). A operação cresceu sem corrigir a porta dos fundos.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
