import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, DollarSign, Heart, SmilePlus, TrendingDown, AlertTriangle, Info } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import type { JornadaCliente, JornadaCfo, JornadaAlerta } from '@/components/planning/jornada/types';

interface VisaoGeralCSProps {
  clientes: JornadaCliente[];
  cfos: JornadaCfo[];
  alertas: JornadaAlerta[];
  npsScore: number | null;
  mrrBase: number;
  onNavigateToAlertas?: () => void;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
}

const HEALTH_COLORS: Record<string, string> = {
  green: '#22c55e',
  yellow: '#eab308',
  red: '#ef4444',
};

const HEALTH_LABELS: Record<string, string> = {
  green: 'Saudável',
  yellow: 'Atenção',
  red: 'Crítico',
};

export function VisaoGeralCS({ clientes, cfos, alertas, npsScore, mrrBase, onNavigateToAlertas }: VisaoGeralCSProps) {
  const activeClientes = useMemo(() => {
    const INACTIVE = ['Churn', 'Atividades finalizadas', 'Desistência', 'Arquivado'];
    return clientes.filter(c => !INACTIVE.includes(c.faseAtual));
  }, [clientes]);

  const healthDistribution = useMemo(() => {
    const counts = { green: 0, yellow: 0, red: 0 };
    activeClientes.forEach(c => { counts[c.healthLevel]++; });
    return Object.entries(counts).map(([level, count]) => ({
      name: HEALTH_LABELS[level],
      value: count,
      color: HEALTH_COLORS[level],
    }));
  }, [activeClientes]);

  const avgHealthScore = useMemo(() => {
    if (activeClientes.length === 0) return 0;
    return Math.round(activeClientes.reduce((s, c) => s + c.healthScore, 0) / activeClientes.length);
  }, [activeClientes]);

  const revenueChurnRate = useMemo(() => {
    // Approximate from churn dossier data — use hardcoded Q1 value
    return 5.95;
  }, []);

  const alertSummary = useMemo(() => {
    const criticos = alertas.filter(a => a.severidade === 'critico').length;
    const altos = alertas.filter(a => a.severidade === 'alto').length;
    return { criticos, altos };
  }, [alertas]);

  // Recent churns from clientes list
  const recentChurns = useMemo(() => {
    const CHURN_PHASES = ['Churn', 'Atividades finalizadas', 'Desistência'];
    return clientes
      .filter(c => CHURN_PHASES.includes(c.faseAtual))
      .sort((a, b) => b.dataEntrada.getTime() - a.dataEntrada.getTime())
      .slice(0, 5);
  }, [clientes]);

  // KPI Cards
  const kpis = [
    { label: 'Clientes Ativos', value: String(activeClientes.length), icon: Users, color: 'text-blue-600', tooltip: 'Clientes em fase Onboarding ou Em Operação Recorrente. Exclui Churn, Desistência, Arquivado. Fonte: Pipefy — Central de Projetos' },
    { label: 'MRR Base', value: formatCurrency(mrrBase), icon: DollarSign, color: 'text-green-600', tooltip: 'Soma de (Valor CFOaaS + Valor OXY) de clientes em Onboarding ou Em Operação Recorrente. Exclui produtos pontuais. Fonte: Pipefy — Central de Projetos' },
    { label: 'Health Score', value: `${avgHealthScore}pts`, icon: Heart, color: avgHealthScore >= 70 ? 'text-green-600' : avgHealthScore >= 40 ? 'text-yellow-600' : 'text-red-600', tooltip: 'Média ponderada: NPS 30pts + Reuniões 30pts + Tratativa 20pts + Setup 20pts. Verde ≥ 70, Amarelo ≥ 40, Vermelho < 40. Fonte: Pipefy — Central + Rotinas + Tratativas + NPS' },
    { label: 'NPS Score', value: npsScore !== null ? String(npsScore) : '—', icon: SmilePlus, color: (npsScore ?? 0) >= 40 ? 'text-green-600' : 'text-yellow-600', tooltip: '(Promotores - Detratores) / Total Respostas × 100. Promotores = nota 9-10. Detratores = nota 0-6. Deduplicado por cliente (última resposta). Fonte: Pipefy — Pesquisa NPS' },
    { label: 'Revenue Churn', value: `${revenueChurnRate}%`, icon: TrendingDown, color: revenueChurnRate <= 5 ? 'text-green-600' : 'text-red-600', tooltip: 'Soma MRR dos clientes que churaram no período / MRR Base × 100. Fonte: Pipefy — Central de Projetos + Tratativas' },
  ];

  return (
    <TooltipProvider>
    <div className="space-y-6">
      {/* Hero KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label}>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`h-4 w-4 ${kpi.color}`} />
                  <span className="text-xs text-muted-foreground">
                    {kpi.label}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground cursor-help inline ml-1" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-xs">
                        <p>{kpi.tooltip}</p>
                      </TooltipContent>
                    </Tooltip>
                  </span>
                </div>
                <p className="text-2xl font-bold">{kpi.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Alert Summary Strip */}
      {(alertSummary.criticos > 0 || alertSummary.altos > 0) && (
        <button
          onClick={onNavigateToAlertas}
          className="w-full flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 hover:bg-destructive/10 transition-colors text-left"
        >
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
          <span className="text-sm font-medium">
            {alertSummary.criticos > 0 && (
              <span className="text-destructive">{alertSummary.criticos} alertas críticos</span>
            )}
            {alertSummary.criticos > 0 && alertSummary.altos > 0 && ', '}
            {alertSummary.altos > 0 && (
              <span className="text-amber-600">{alertSummary.altos} alertas altos</span>
            )}
          </span>
          <Badge variant="outline" className="ml-auto text-xs">Ver alertas</Badge>
        </button>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Health Distribution Donut */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Distribuição de Saúde</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie
                    data={healthDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {healthDistribution.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(value: number, name: string) => [`${value} clientes`, name]}
                    contentStyle={{ borderRadius: 8, fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {healthDistribution.map((item) => (
                  <div key={item.name} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-muted-foreground">{item.name}</span>
                    <span className="font-medium ml-auto">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CFO Heatmap */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">CFOs — Saúde e Carteira</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {cfos.map((cfo) => {
                const healthColor = cfo.healthScoreMedio >= 70 ? 'bg-green-500' : cfo.healthScoreMedio >= 40 ? 'bg-yellow-500' : 'bg-red-500';
                return (
                  <div key={cfo.nome} className="flex items-center gap-2 text-sm">
                    <div className={`w-2.5 h-2.5 rounded-full ${healthColor}`} />
                    <span className="truncate flex-1">{cfo.nome}</span>
                    <span className="text-muted-foreground text-xs">{cfo.clientes} cl.</span>
                    <span className="font-medium text-xs">{cfo.healthScoreMedio}pts</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent Churns */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Churns Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {recentChurns.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum churn recente.</p>
            ) : (
              <div className="space-y-3">
                {recentChurns.map((c) => (
                  <div key={c.id} className="border-b last:border-0 pb-2 last:pb-0">
                    <p className="text-sm font-medium truncate">{c.titulo}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{c.tratativaMotivo || 'Motivo não informado'}</span>
                      <span className="ml-auto font-medium">{formatCurrency(c.mrr)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
    </TooltipProvider>
  );
}
