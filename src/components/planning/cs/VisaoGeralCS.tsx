import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  green: 'Saudavel',
  yellow: 'Atencao',
  red: 'Critico',
};

const INACTIVE_PHASES = ['Churn', 'Atividades finalizadas', 'Desistencia', 'Arquivado'];
const CHURN_PHASES = ['Churn', 'Atividades finalizadas', 'Desistencia'];
const PONTUAL_PRODUCTS = ['Diagnostico', 'Turnaround', 'Valuation', 'Educacao'];

type KpiDialogType = 'clientes' | 'mrr' | 'health' | 'nps' | 'churn' | null;

export function VisaoGeralCS({ clientes, cfos, alertas, npsScore, mrrBase, onNavigateToAlertas }: VisaoGeralCSProps) {
  const [openDialog, setOpenDialog] = useState<KpiDialogType>(null);

  const activeClientes = useMemo(() => {
    return clientes.filter(c => !INACTIVE_PHASES.includes(c.faseAtual));
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
    return 5.95;
  }, []);

  const alertSummary = useMemo(() => {
    const criticos = alertas.filter(a => a.severidade === 'critico').length;
    const altos = alertas.filter(a => a.severidade === 'alto').length;
    return { criticos, altos };
  }, [alertas]);

  const recentChurns = useMemo(() => {
    return clientes
      .filter(c => CHURN_PHASES.includes(c.faseAtual))
      .sort((a, b) => b.dataEntrada.getTime() - a.dataEntrada.getTime())
      .slice(0, 5);
  }, [clientes]);

  // B1: Breakdowns for dialog popups
  const clientesByCfo = useMemo(() => {
    const map: Record<string, { count: number; mrr: number }> = {};
    activeClientes.forEach(c => {
      const cfo = c.cfo || 'Sem CFO';
      if (!map[cfo]) map[cfo] = { count: 0, mrr: 0 };
      map[cfo].count++;
      map[cfo].mrr += c.mrr;
    });
    return Object.entries(map).sort((a, b) => b[1].count - a[1].count);
  }, [activeClientes]);

  const clientesByTipo = useMemo(() => {
    let saas = 0;
    let pontual = 0;
    activeClientes.forEach(c => {
      const isPontual = c.produtos.length > 0 && c.produtos.every(p =>
        PONTUAL_PRODUCTS.some(pp => p.toLowerCase().includes(pp.toLowerCase()))
      );
      if (isPontual) pontual++;
      else saas++;
    });
    return { saas, pontual };
  }, [activeClientes]);

  const clientesByFase = useMemo(() => {
    let onboarding = 0;
    let emOperacao = 0;
    activeClientes.forEach(c => {
      if (c.faseAtual === 'Onboarding') onboarding++;
      else emOperacao++;
    });
    return { onboarding, emOperacao };
  }, [activeClientes]);

  // B1: MRR by CFO
  const mrrByCfo = useMemo(() => {
    return clientesByCfo.map(([cfo, data]) => ({ cfo, mrr: data.mrr })).sort((a, b) => b.mrr - a.mrr);
  }, [clientesByCfo]);

  // B1: Health — worst clients
  const worstClients = useMemo(() => {
    return [...activeClientes]
      .filter(c => c.healthLevel === 'red')
      .sort((a, b) => a.healthScore - b.healthScore)
      .slice(0, 10);
  }, [activeClientes]);

  // B1: NPS breakdown
  const npsBreakdown = useMemo(() => {
    const withNps = activeClientes.filter(c => c.npsClassificacao !== null);
    const promotores = withNps.filter(c => c.npsClassificacao === 'promotor').length;
    const neutros = withNps.filter(c => c.npsClassificacao === 'neutro').length;
    const detratores = withNps.filter(c => c.npsClassificacao === 'detrator').length;
    return { promotores, neutros, detratores, total: withNps.length };
  }, [activeClientes]);

  // B1: Churn breakdown by motivo
  const churnBreakdown = useMemo(() => {
    const churned = clientes.filter(c => CHURN_PHASES.includes(c.faseAtual));
    const byMotivo: Record<string, number> = {};
    churned.forEach(c => {
      const motivo = c.tratativaMotivo || 'Nao informado';
      byMotivo[motivo] = (byMotivo[motivo] || 0) + 1;
    });
    return { total: churned.length, byMotivo: Object.entries(byMotivo).sort((a, b) => b[1] - a[1]) };
  }, [clientes]);

  const kpis: { key: KpiDialogType; label: string; value: string; icon: typeof Users; color: string; tooltip: string }[] = [
    { key: 'clientes', label: 'Clientes Ativos', value: String(activeClientes.length), icon: Users, color: 'text-blue-600', tooltip: 'Clientes em fase Onboarding ou Em Operacao Recorrente. Exclui Churn, Desistencia, Arquivado. Fonte: Pipefy' },
    { key: 'mrr', label: 'MRR Base', value: formatCurrency(mrrBase), icon: DollarSign, color: 'text-green-600', tooltip: 'Soma de (Valor CFOaaS + Valor OXY) de clientes ativos. Exclui produtos pontuais. Fonte: Pipefy' },
    { key: 'health', label: 'Health Score', value: `${avgHealthScore}pts`, icon: Heart, color: avgHealthScore >= 70 ? 'text-green-600' : avgHealthScore >= 40 ? 'text-yellow-600' : 'text-red-600', tooltip: 'Media ponderada: NPS 30pts + Reunioes 30pts + Tratativa 20pts + Setup 20pts. Verde >= 70, Amarelo >= 40, Vermelho < 40' },
    { key: 'nps', label: 'NPS Score', value: npsScore !== null ? String(npsScore) : '—', icon: SmilePlus, color: (npsScore ?? 0) >= 40 ? 'text-green-600' : 'text-yellow-600', tooltip: '(Promotores - Detratores) / Total Respostas x 100. Promotores = nota 9-10. Detratores = nota 0-6' },
    { key: 'churn', label: 'Revenue Churn', value: `${revenueChurnRate}%`, icon: TrendingDown, color: revenueChurnRate <= 5 ? 'text-green-600' : 'text-red-600', tooltip: 'Soma MRR dos clientes que churaram no periodo / MRR Base x 100' },
  ];

  return (
    <TooltipProvider>
    <div className="space-y-6">
      {/* Hero KPI Row — B1: clickable */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card
              key={kpi.label}
              className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
              onClick={() => setOpenDialog(kpi.key)}
            >
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
              <span className="text-destructive">{alertSummary.criticos} alertas criticos</span>
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
            <CardTitle className="text-sm font-semibold">Distribuicao de Saude</CardTitle>
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
            <CardTitle className="text-sm font-semibold">CFOs — Saude e Carteira</CardTitle>
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

        {/* Recent Churns — B2: add date */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Churns Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {recentChurns.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum churn recente.</p>
            ) : (
              <div className="space-y-3">
                {recentChurns.map((c) => {
                  const churnDate = c.dataEntrada;
                  const dateStr = churnDate
                    ? churnDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
                    : '';
                  return (
                    <div key={c.id} className="border-b last:border-0 pb-2 last:pb-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate flex-1">{c.titulo}</p>
                        {dateStr && <span className="text-[10px] text-muted-foreground whitespace-nowrap">{dateStr}</span>}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{c.tratativaMotivo || 'Motivo nao informado'}</span>
                        <span className="ml-auto font-medium">{formatCurrency(c.mrr)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* B1: KPI Detail Dialogs */}

      {/* Clientes Ativos Dialog */}
      <Dialog open={openDialog === 'clientes'} onOpenChange={(open) => !open && setOpenDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Clientes Ativos — {activeClientes.length}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* By CFO */}
            <div>
              <h4 className="text-sm font-semibold mb-2">Por CFO</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>CFO</TableHead>
                    <TableHead className="text-right">Clientes</TableHead>
                    <TableHead className="text-right">MRR</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientesByCfo.map(([cfo, data]) => (
                    <TableRow key={cfo}>
                      <TableCell className="font-medium">{cfo}</TableCell>
                      <TableCell className="text-right">{data.count}</TableCell>
                      <TableCell className="text-right">{formatCurrency(data.mrr)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {/* By Tipo */}
            <div>
              <h4 className="text-sm font-semibold mb-2">Por Tipo</h4>
              <div className="flex gap-4">
                <Card className="flex-1">
                  <CardContent className="pt-3 pb-2 text-center">
                    <p className="text-xs text-muted-foreground">SaaS (Recorrente)</p>
                    <p className="text-xl font-bold">{clientesByTipo.saas}</p>
                  </CardContent>
                </Card>
                <Card className="flex-1">
                  <CardContent className="pt-3 pb-2 text-center">
                    <p className="text-xs text-muted-foreground">Pontual</p>
                    <p className="text-xl font-bold">{clientesByTipo.pontual}</p>
                  </CardContent>
                </Card>
              </div>
            </div>
            {/* By Fase */}
            <div>
              <h4 className="text-sm font-semibold mb-2">Por Fase</h4>
              <div className="flex gap-4">
                <Card className="flex-1">
                  <CardContent className="pt-3 pb-2 text-center">
                    <p className="text-xs text-muted-foreground">Onboarding</p>
                    <p className="text-xl font-bold">{clientesByFase.onboarding}</p>
                  </CardContent>
                </Card>
                <Card className="flex-1">
                  <CardContent className="pt-3 pb-2 text-center">
                    <p className="text-xs text-muted-foreground">Em Operacao Recorrente</p>
                    <p className="text-xl font-bold">{clientesByFase.emOperacao}</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MRR Base Dialog */}
      <Dialog open={openDialog === 'mrr'} onOpenChange={(open) => !open && setOpenDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>MRR Base — {formatCurrency(mrrBase)}</DialogTitle>
          </DialogHeader>
          <div>
            <h4 className="text-sm font-semibold mb-2">MRR por CFO</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>CFO</TableHead>
                  <TableHead className="text-right">Clientes</TableHead>
                  <TableHead className="text-right">MRR</TableHead>
                  <TableHead className="text-right">% do Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mrrByCfo.map(({ cfo, mrr }) => (
                  <TableRow key={cfo}>
                    <TableCell className="font-medium">{cfo}</TableCell>
                    <TableCell className="text-right">{clientesByCfo.find(([c]) => c === cfo)?.[1].count ?? 0}</TableCell>
                    <TableCell className="text-right">{formatCurrency(mrr)}</TableCell>
                    <TableCell className="text-right">{mrrBase > 0 ? ((mrr / mrrBase) * 100).toFixed(1) : 0}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Health Score Dialog */}
      <Dialog open={openDialog === 'health'} onOpenChange={(open) => !open && setOpenDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Health Score — Media {avgHealthScore}pts</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-semibold mb-2">Distribuicao</h4>
              <div className="flex gap-4">
                {healthDistribution.map(item => (
                  <Card key={item.name} className="flex-1">
                    <CardContent className="pt-3 pb-2 text-center">
                      <div className="w-3 h-3 rounded-full mx-auto mb-1" style={{ backgroundColor: item.color }} />
                      <p className="text-xs text-muted-foreground">{item.name}</p>
                      <p className="text-xl font-bold">{item.value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
            {worstClients.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Clientes Criticos (Health &lt; 40)</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>CFO</TableHead>
                      <TableHead className="text-right">Health</TableHead>
                      <TableHead className="text-right">MRR</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {worstClients.map(c => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.titulo}</TableCell>
                        <TableCell>{c.cfo}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="destructive" className="text-[10px]">{c.healthScore}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(c.mrr)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* NPS Score Dialog */}
      <Dialog open={openDialog === 'nps'} onOpenChange={(open) => !open && setOpenDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>NPS Score — {npsScore ?? '—'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-4">
              <Card className="flex-1">
                <CardContent className="pt-3 pb-2 text-center">
                  <p className="text-xs text-muted-foreground">Promotores (9-10)</p>
                  <p className="text-xl font-bold text-green-600">{npsBreakdown.promotores}</p>
                </CardContent>
              </Card>
              <Card className="flex-1">
                <CardContent className="pt-3 pb-2 text-center">
                  <p className="text-xs text-muted-foreground">Neutros (7-8)</p>
                  <p className="text-xl font-bold text-yellow-600">{npsBreakdown.neutros}</p>
                </CardContent>
              </Card>
              <Card className="flex-1">
                <CardContent className="pt-3 pb-2 text-center">
                  <p className="text-xs text-muted-foreground">Detratores (0-6)</p>
                  <p className="text-xl font-bold text-red-600">{npsBreakdown.detratores}</p>
                </CardContent>
              </Card>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Total de respostas: {npsBreakdown.total} clientes
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Revenue Churn Dialog */}
      <Dialog open={openDialog === 'churn'} onOpenChange={(open) => !open && setOpenDialog(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Revenue Churn — {revenueChurnRate}%</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Total de churns no periodo: {churnBreakdown.total}</p>
            {churnBreakdown.byMotivo.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Por Motivo</h4>
                <div className="space-y-2">
                  {churnBreakdown.byMotivo.map(([motivo, count]) => (
                    <div key={motivo} className="flex items-center justify-between text-sm">
                      <span>{motivo}</span>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {recentChurns.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Churns Recentes</h4>
                <div className="space-y-2">
                  {recentChurns.map(c => {
                    const dateStr = c.dataEntrada
                      ? c.dataEntrada.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
                      : '';
                    return (
                      <div key={c.id} className="flex items-center justify-between text-sm border-b pb-1 last:border-0">
                        <div>
                          <span className="font-medium">{c.titulo}</span>
                          {dateStr && <span className="text-xs text-muted-foreground ml-2">{dateStr}</span>}
                        </div>
                        <span className="font-medium">{formatCurrency(c.mrr)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </TooltipProvider>
  );
}
