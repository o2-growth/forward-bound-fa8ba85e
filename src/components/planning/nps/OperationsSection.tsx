import { useState } from 'react';
import { useOperationsData, CfoDistribution, CfoTaskSummary } from '@/hooks/useOperationsData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, UserCheck, AlertTriangle, UserMinus, DollarSign, ClipboardList, ChevronRight, Settings, Clock, ListChecks, ShieldCheck, TrendingDown, ShieldAlert } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { PipefyCardLink, PIPEFY_PIPES } from './PipefyCardLink';

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(210, 70%, 55%)',
  'hsl(340, 65%, 50%)',
  'hsl(160, 60%, 45%)',
  'hsl(45, 80%, 50%)',
  'hsl(280, 60%, 55%)',
];

const SATISFACTION_COLORS: Record<string, string> = {
  'Muito Satisfeito': 'hsl(142, 71%, 45%)',
  'Satisfeito': 'hsl(142, 50%, 55%)',
  'Neutro': 'hsl(45, 80%, 50%)',
  'Insatisfeito': 'hsl(25, 80%, 50%)',
  'Muito Insatisfeito': 'hsl(0, 72%, 51%)',
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
}

export function OperationsSection() {
  const { data, isLoading, error } = useOperationsData();
  const [selectedCfo, setSelectedCfo] = useState<CfoDistribution | null>(null);
  const [selectedCfoTasks, setSelectedCfoTasks] = useState<CfoTaskSummary | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="p-6 text-center text-destructive">
          Erro ao carregar dados de operação: {error?.message || 'Dados indisponíveis'}
        </CardContent>
      </Card>
    );
  }

  const {
    kpis, cfoDistribution, tratativasAtivas = [], motivoChurnCount = {},
    motivoCount = {}, setupAtivos = [], cfoTaskSummary = [],
    setupByErp = [], satisfacaoDistribution = [],
  } = data;

  const kpiCards = [
    { icon: Users, label: 'Clientes Ativos', value: kpis.totalAtivos, color: 'text-primary' },
    { icon: UserCheck, label: 'Em Operação', value: kpis.emOperacao, color: 'text-green-600 dark:text-green-400' },
    { icon: ClipboardList, label: 'Onboarding', value: kpis.emOnboarding, color: 'text-blue-600 dark:text-blue-400' },
    { icon: Settings, label: 'Em Setup', value: kpis.emSetup, color: 'text-indigo-600 dark:text-indigo-400' },
    { icon: Clock, label: 'Setup >90d', value: kpis.setupAtrasados, color: kpis.setupAtrasados > 0 ? 'text-destructive' : 'text-muted-foreground' },
    { icon: ListChecks, label: 'Tarefas Atrasadas', value: kpis.tarefasAtrasadas, color: kpis.tarefasAtrasadas > 0 ? 'text-destructive' : 'text-muted-foreground' },
    { icon: AlertTriangle, label: 'Em Tratativa', value: kpis.tratativasAtivas, color: 'text-amber-600 dark:text-amber-400' },
    { icon: UserMinus, label: 'Churn', value: kpis.churn, color: 'text-red-600 dark:text-red-400' },
    { icon: DollarSign, label: 'MRR Total', value: formatCurrency(kpis.mrrTotal), color: 'text-emerald-600 dark:text-emerald-400' },
    { icon: ShieldCheck, label: 'Retenção', value: `${(kpis.retencaoRate ?? 0).toFixed(1)}%`, color: 'text-green-600 dark:text-green-400' },
    { icon: TrendingDown, label: 'Tx Churn', value: `${(kpis.churnRate ?? 0).toFixed(1)}%`, color: (kpis.churnRate ?? 0) > 10 ? 'text-destructive' : 'text-amber-600 dark:text-amber-400' },
    { icon: ShieldAlert, label: 'MRR em Risco', value: formatCurrency(kpis.mrrEmRisco), color: kpis.mrrEmRisco > 0 ? 'text-destructive' : 'text-muted-foreground' },
  ];

  const motivoChurnData = Object.entries(motivoChurnCount)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const motivoData = Object.entries(motivoCount)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="flex items-center gap-3 rounded-lg border bg-card p-4 shadow-sm">
              <div className="rounded-full bg-muted p-2.5">
                <Icon className={`h-5 w-5 ${kpi.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <p className="text-xl font-bold text-foreground">{kpi.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CFO Distribution Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Clientes por CFO — clique para ver lista</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[300px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>CFO</TableHead>
                    <TableHead className="text-right">Clientes</TableHead>
                    <TableHead className="text-right">MRR</TableHead>
                    <TableHead className="w-8" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cfoDistribution.map((row) => (
                    <TableRow
                      key={row.cfo}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedCfo(row)}
                    >
                      <TableCell className="font-medium">{row.cfo}</TableCell>
                      <TableCell className="text-right">{row.clientes}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.mrr)}</TableCell>
                      <TableCell>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Tarefas por CFO */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Tarefas por CFO — clique para ver atrasadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[300px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>CFO</TableHead>
                    <TableHead className="text-right">Ativas</TableHead>
                    <TableHead className="text-right">Atrasadas</TableHead>
                    <TableHead className="text-right">Tx Entrega</TableHead>
                    <TableHead className="w-8" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cfoTaskSummary.map((row) => (
                    <TableRow
                      key={row.cfo}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedCfoTasks(row)}
                    >
                      <TableCell className="font-medium">{row.cfo}</TableCell>
                      <TableCell className="text-right">{row.totalAtivas}</TableCell>
                      <TableCell className="text-right">
                        <span className={row.atrasadas > 0 ? 'text-destructive font-bold' : ''}>
                          {row.atrasadas}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant="outline"
                          className={
                            row.taxaEntrega >= 80
                              ? 'border-green-500 text-green-700 dark:text-green-400'
                              : row.taxaEntrega >= 60
                              ? 'border-amber-500 text-amber-700 dark:text-amber-400'
                              : 'border-red-500 text-red-700 dark:text-red-400'
                          }
                        >
                          {row.taxaEntrega}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tempo Médio de Setup por ERP */}
        {setupByErp.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Tempo Médio de Setup por ERP (concluídos)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={Math.max(200, setupByErp.length * 40)}>
                <BarChart data={setupByErp} layout="vertical" margin={{ left: 20, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    type="number"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    label={{ value: 'dias', position: 'insideBottomRight', offset: -5, fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  />
                  <YAxis dataKey="erp" type="category" width={120} tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    formatter={(value: number, _: string, props: { payload: { count: number } }) => [`${value} dias (${props.payload.count} projetos)`, 'Média']}
                  />
                  <Bar dataKey="mediaDias" radius={[0, 4, 4, 0]}>
                    {setupByErp.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Satisfação nas Tratativas */}
        {satisfacaoDistribution.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Satisfação — Tratativas Finalizadas</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={satisfacaoDistribution} margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="nota" tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Bar dataKey="count" name="Respostas" radius={[4, 4, 0, 0]}>
                    {satisfacaoDistribution.map((entry, i) => (
                      <Cell key={i} fill={SATISFACTION_COLORS[entry.nota] || COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Motivos das Tratativas */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Motivos das Tratativas</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={motivoData} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                <YAxis dataKey="name" type="category" width={140} tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {motivoData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Motivos de Churn */}
        {motivoChurnData.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Motivos de Churn (Tratativas Finalizadas)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={motivoChurnData} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" width={160} tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Bar dataKey="value" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Setup Ativo Table */}
      {setupAtivos.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              Setup Ativo ({setupAtivos.length})
              {kpis.setupAtrasados > 0 && (
                <Badge variant="destructive" className="text-[10px]">
                  {kpis.setupAtrasados} com +90 dias
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[400px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Fase</TableHead>
                    <TableHead className="text-right">Dias</TableHead>
                    <TableHead className="w-8" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {setupAtivos.map((s) => (
                    <TableRow key={s.id} className={s.atrasado ? 'bg-destructive/5' : ''}>
                      <TableCell className="font-medium">{s.empresa}</TableCell>
                      <TableCell>{s.responsavel}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{s.faseAtual}</TableCell>
                      <TableCell className="text-right font-mono">
                        <span className={s.atrasado ? 'text-destructive font-bold' : ''}>
                          {s.diasEmSetup}d
                        </span>
                      </TableCell>
                      <TableCell>
                        <PipefyCardLink pipeId={PIPEFY_PIPES.SETUP} cardId={s.id} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tratativas Ativas Table */}
      {tratativasAtivas.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Tratativas Ativas ({tratativasAtivas.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[400px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>CFO</TableHead>
                    <TableHead>Fase</TableHead>
                    <TableHead className="text-right">Dias</TableHead>
                    <TableHead className="w-8" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tratativasAtivas.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.empresa}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{t.motivo}</Badge>
                      </TableCell>
                      <TableCell>{t.cfo}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{t.faseAtual}</TableCell>
                      <TableCell className="text-right font-mono">
                        <span className={t.diasEmTratativa > 30 ? 'text-destructive font-bold' : ''}>
                          {t.diasEmTratativa}d
                        </span>
                      </TableCell>
                      <TableCell>
                        <PipefyCardLink pipeId={PIPEFY_PIPES.TRATATIVAS} cardId={t.id} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* CFO Client Drill-down Sheet */}
      <Sheet open={!!selectedCfo} onOpenChange={() => setSelectedCfo(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {selectedCfo && (
            <>
              <SheetHeader>
                <SheetTitle>Clientes — {selectedCfo.cfo}</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-2">
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="text-center p-2 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Clientes</p>
                    <p className="text-lg font-bold text-foreground">{selectedCfo.clientes}</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">MRR Total</p>
                    <p className="text-lg font-bold text-foreground">{formatCurrency(selectedCfo.mrr)}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {(selectedCfo.clients || []).map((client, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{client.titulo}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatCurrency(client.mrr)}</span>
                          <Badge variant="outline" className="text-[10px]">{client.fase}</Badge>
                        </div>
                      </div>
                      <div className="shrink-0 ml-2">
                        <PipefyCardLink pipeId={PIPEFY_PIPES.CENTRAL_PROJETOS} cardId={client.cardId} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* CFO Tasks Drill-down Sheet */}
      <Sheet open={!!selectedCfoTasks} onOpenChange={() => setSelectedCfoTasks(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {selectedCfoTasks && (
            <>
              <SheetHeader>
                <SheetTitle>Tarefas Atrasadas — {selectedCfoTasks.cfo}</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-2">
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="text-center p-2 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Ativas</p>
                    <p className="text-lg font-bold text-foreground">{selectedCfoTasks.totalAtivas}</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Atrasadas</p>
                    <p className="text-lg font-bold text-destructive">{selectedCfoTasks.atrasadas}</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Tx Entrega</p>
                    <p className={`text-lg font-bold ${selectedCfoTasks.taxaEntrega >= 80 ? 'text-green-600 dark:text-green-400' : selectedCfoTasks.taxaEntrega >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-destructive'}`}>
                      {selectedCfoTasks.taxaEntrega}%
                    </p>
                  </div>
                </div>
                {selectedCfoTasks.tarefas.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhuma tarefa atrasada 🎉</p>
                ) : (
                  <div className="space-y-2">
                    {selectedCfoTasks.tarefas.map((tarefa, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                        <div className="space-y-0.5 min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">{tarefa.empresa}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                            <Badge variant="outline" className="text-[10px]">{tarefa.tipoEntrega}</Badge>
                            <span>Previsto: {tarefa.dataPrevista !== 'N/A' ? new Date(tarefa.dataPrevista).toLocaleDateString('pt-BR') : 'N/A'}</span>
                            <span className="text-destructive font-bold">{tarefa.diasAtraso}d atraso</span>
                          </div>
                        </div>
                        <div className="shrink-0 ml-2">
                          <PipefyCardLink pipeId={PIPEFY_PIPES.ROTINAS} cardId={tarefa.id} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
