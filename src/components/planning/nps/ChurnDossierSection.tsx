import { useState, useMemo } from 'react';
import { ChurnDossierCard } from '@/hooks/useOperationsData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PipefyCardLink, PIPEFY_PIPES } from './PipefyCardLink';
import { ExternalLink, ChevronDown, ChevronRight, TrendingDown, DollarSign, Clock, AlertTriangle, Filter } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

/* ─── helpers ─── */
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatCurrency(value: number) {
  if (!value) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
}

const FASE_COLORS: Record<string, string> = {
  'Churn': 'bg-destructive/15 text-destructive border-destructive/30',
  'Desistência': 'bg-warning/15 text-warning-foreground border-warning/30',
  'Atividades finalizadas': 'bg-muted text-muted-foreground border-border',
};

const MOTIVO_COLORS: Record<string, string> = {
  'Financeiro': 'border-warning text-warning-foreground bg-warning/10',
  'Atendimento': 'border-primary text-primary bg-primary/10',
  'Problema na Oxy': 'border-destructive text-destructive bg-destructive/10',
  'Mudança de gestão': 'border-[hsl(var(--franquia))] text-[hsl(var(--franquia))] bg-[hsl(var(--franquia))]/10',
  'Não viu valor': 'border-accent text-accent-foreground bg-accent/10',
};

const CHART_COLORS = [
  'hsl(var(--destructive))',
  'hsl(var(--warning))',
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(var(--chart-5))',
  'hsl(var(--franquia))',
];

interface Props {
  data: ChurnDossierCard[];
}

export function ChurnDossierSection({ data }: Props) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [filterMotivo, setFilterMotivo] = useState<string>('all');
  const [filterCfo, setFilterCfo] = useState<string>('all');
  const [filterMes, setFilterMes] = useState<string>('all');

  /* ─── derived data ─── */
  const motivos = useMemo(() => [...new Set(data.map(d => d.motivoPrincipal).filter(Boolean))], [data]);
  const cfos = useMemo(() => [...new Set(data.map(d => d.cfo).filter(Boolean))].sort(), [data]);
  const meses = useMemo(() => [...new Set(data.map(d => d.mesChurn).filter(Boolean))].sort(), [data]);

  const filtered = useMemo(() => {
    return data.filter(d => {
      if (filterMotivo !== 'all' && d.motivoPrincipal !== filterMotivo) return false;
      if (filterCfo !== 'all' && d.cfo !== filterCfo) return false;
      if (filterMes !== 'all' && d.mesChurn !== filterMes) return false;
      return true;
    });
  }, [data, filterMotivo, filterCfo, filterMes]);

  const totalMrrPerdido = useMemo(() => filtered.reduce((s, d) => s + (d.mrr || 0), 0), [filtered]);
  
  const avgLt = useMemo(() => {
    const lts = filtered.map(d => parseFloat(d.ltMeses)).filter(n => !isNaN(n) && n > 0);
    return lts.length ? (lts.reduce((a, b) => a + b, 0) / lts.length).toFixed(1) : '—';
  }, [filtered]);
  const topMotivo = useMemo(() => {
    const counts: Record<string, number> = {};
    filtered.forEach(d => { if (d.motivoPrincipal) counts[d.motivoPrincipal] = (counts[d.motivoPrincipal] || 0) + 1; });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || '—';
  }, [filtered]);

  /* chart data */
  const motivoChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    filtered.forEach(d => { if (d.motivoPrincipal) counts[d.motivoPrincipal] = (counts[d.motivoPrincipal] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filtered]);

  const cfoChartData = useMemo(() => {
    const map: Record<string, { churns: number; mrr: number }> = {};
    filtered.forEach(d => {
      if (!d.cfo) return;
      if (!map[d.cfo]) map[d.cfo] = { churns: 0, mrr: 0 };
      map[d.cfo].churns++;
      map[d.cfo].mrr += d.mrr || 0;
    });
    return Object.entries(map).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.mrr - a.mrr).slice(0, 8);
  }, [filtered]);

  const timelineData = useMemo(() => {
    const map: Record<string, { count: number; mrr: number }> = {};
    filtered.forEach(d => {
      const m = d.mesChurn || 'Sem data';
      if (!map[m]) map[m] = { count: 0, mrr: 0 };
      map[m].count++;
      map[m].mrr += d.mrr || 0;
    });
    return Object.entries(map).map(([mes, v]) => ({ mes, ...v })).sort((a, b) => a.mes.localeCompare(b.mes));
  }, [filtered]);

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Nenhum registro de churn encontrado.
        </CardContent>
      </Card>
    );
  }

  const hasFilters = filterMotivo !== 'all' || filterCfo !== 'all' || filterMes !== 'all';

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-destructive mb-1">
              <TrendingDown className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Total Churns</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{filtered.length}</p>
            {hasFilters && <p className="text-xs text-muted-foreground">de {data.length} total</p>}
          </CardContent>
        </Card>
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-destructive mb-1">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">MRR Perdido</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(totalMrrPerdido)}</p>
          </CardContent>
        </Card>
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-primary mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">LT Médio</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{avgLt} <span className="text-sm font-normal text-muted-foreground">meses</span></p>
          </CardContent>
        </Card>
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-[hsl(var(--warning))]  mb-1">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Top Motivo</span>
            </div>
            <p className="text-lg font-bold text-foreground truncate" title={topMotivo}>{topMotivo}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Motivos Pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Distribuição por Motivo</CardTitle>
          </CardHeader>
          <CardContent className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={motivoChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={35} paddingAngle={2}>
                  {motivoChartData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val: number) => [val, 'Churns']} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 mt-1 justify-center">
              {motivoChartData.map((d, i) => (
                <span key={d.name} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                  {d.name} ({d.value})
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* CFO Bar */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">MRR Perdido por CFO</CardTitle>
          </CardHeader>
          <CardContent className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cfoChartData} layout="vertical" margin={{ left: 60, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} fontSize={10} />
                <YAxis type="category" dataKey="name" fontSize={10} width={55} />
                <Tooltip formatter={(val: number) => [formatCurrency(val), 'MRR Perdido']} />
                <Bar dataKey="mrr" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Timeline de Churn</CardTitle>
          </CardHeader>
          <CardContent className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timelineData} margin={{ left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" fontSize={10} />
                <YAxis fontSize={10} />
                <Tooltip formatter={(val: number, name: string) => [name === 'count' ? val : formatCurrency(val as number), name === 'count' ? 'Churns' : 'MRR']} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4 text-primary" />
              Dossiê de Churn
              <Badge variant="secondary" className="text-xs">{filtered.length} registros</Badge>
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={filterMes} onValueChange={setFilterMes}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue placeholder="Mês" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os meses</SelectItem>
                  {meses.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterMotivo} onValueChange={setFilterMotivo}>
                <SelectTrigger className="w-[150px] h-8 text-xs">
                  <SelectValue placeholder="Motivo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos motivos</SelectItem>
                  {motivos.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterCfo} onValueChange={setFilterCfo}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue placeholder="CFO" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos CFOs</SelectItem>
                  {cfos.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              {hasFilters && (
                <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setFilterMotivo('all'); setFilterCfo('all'); setFilterMes('all'); }}>
                  Limpar filtros
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto max-h-[600px]">
            <Table>
              <TableHeader>
                <TableRow className="bg-primary/5">
                  <TableHead className="whitespace-nowrap w-8" />
                  <TableHead className="whitespace-nowrap">Mês do Churn</TableHead>
                  <TableHead className="whitespace-nowrap">Cliente</TableHead>
                  <TableHead className="whitespace-nowrap text-right">Setup (R$)</TableHead>
                  <TableHead className="whitespace-nowrap text-right">Diagnóstico (R$)</TableHead>
                  <TableHead className="whitespace-nowrap text-right">MRR (R$)</TableHead>
                  <TableHead className="whitespace-nowrap">Motivo Principal</TableHead>
                  <TableHead className="whitespace-nowrap">CFO</TableHead>
                  <TableHead className="whitespace-nowrap">Produto</TableHead>
                  <TableHead className="whitespace-nowrap">Fase</TableHead>
                  <TableHead className="whitespace-nowrap">Assinatura</TableHead>
                  <TableHead className="whitespace-nowrap">Encerramento</TableHead>
                  <TableHead className="whitespace-nowrap text-right">LT</TableHead>
                  <TableHead className="whitespace-nowrap w-20">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => {
                  const isExpanded = expandedRow === row.id;
                  const highMrr = row.mrr >= 5000;
                  return (
                    <>
                      <TableRow
                        key={row.id}
                        className={`cursor-pointer transition-colors ${highMrr ? 'bg-destructive/5 hover:bg-destructive/10' : 'hover:bg-muted/50'}`}
                        onClick={() => setExpandedRow(isExpanded ? null : row.id)}
                      >
                        <TableCell className="px-2">
                          {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs">{formatDate(row.mesChurn) !== '—' ? row.mesChurn : '—'}</TableCell>
                        <TableCell className="font-medium whitespace-nowrap">
                          <a
                            href={`https://app.pipefy.com/pipes/${PIPEFY_PIPES.CENTRAL_PROJETOS}#cards/${row.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {row.cliente}
                            <ExternalLink className="h-3 w-3 opacity-50" />
                          </a>
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap font-mono text-xs">{formatCurrency(row.setup)}</TableCell>
                        <TableCell className="text-right whitespace-nowrap font-mono text-xs">{formatCurrency(row.diagnostico)}</TableCell>
                        <TableCell className={`text-right whitespace-nowrap font-mono text-xs ${highMrr ? 'font-bold text-destructive' : ''}`}>
                          {formatCurrency(row.mrr)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {row.motivoPrincipal ? (
                            <Badge variant="outline" className={`text-[10px] ${MOTIVO_COLORS[row.motivoPrincipal] || 'border-border'}`}>
                              {row.motivoPrincipal}
                            </Badge>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs">{row.cfo || '—'}</TableCell>
                        <TableCell className="whitespace-nowrap text-xs">{row.produto || '—'}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge variant="outline" className={`text-[10px] ${FASE_COLORS[row.faseAtual] || 'border-border'}`}>
                            {row.faseAtual || '—'}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs">{formatDate(row.dataAssinatura)}</TableCell>
                        <TableCell className="whitespace-nowrap text-xs">{formatDate(row.dataEncerramento)}</TableCell>
                        <TableCell className="text-right whitespace-nowrap text-xs">
                          {row.ltMeses ? (
                            <div className="flex items-center gap-1.5 justify-end">
                              <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-primary"
                                  style={{ width: `${Math.min(100, (parseFloat(row.ltMeses) / 36) * 100)}%` }}
                                />
                              </div>
                              <span className="font-mono">{row.ltMeses}m</span>
                            </div>
                          ) : '—'}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <PipefyCardLink pipeId={PIPEFY_PIPES.CENTRAL_PROJETOS} cardId={row.id} label="Ver card" variant="button" />
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow key={`${row.id}-details`} className="bg-muted/30">
                          <TableCell colSpan={14} className="p-4">
                            <div className="grid md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Motivos de Cancelamento</p>
                                <p className="text-foreground">{row.motivosCancelamento || 'Não informado'}</p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Problemas com a Oxy</p>
                                <p className="text-foreground">{row.problemasOxy || 'Não informado'}</p>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
