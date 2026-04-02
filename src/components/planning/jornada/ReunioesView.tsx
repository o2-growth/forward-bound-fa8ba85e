import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, CheckCircle2, XCircle, Clock, AlertTriangle, ArrowUpDown, ExternalLink } from "lucide-react";

interface ReuniaoData {
  id: string;
  titulo: string;
  cfo: string;
  faseAtual: string;
  mesReferencia: string;
  selecaoReuniao: string | null;
  clienteParticipou: string | null;
  dataPrevista: Date | null;
  overdue: boolean;
  r1: Date | null;
  r2: Date | null;
  r3: Date | null;
  r4: Date | null; // Data Mensal
  t1: string | null;
  t2: string | null;
  t3: string | null;
  t4: string | null; // Temperatura Mensal
}

interface ReunioesViewProps {
  reunioes: ReuniaoData[];
  allCfos: string[];
}

// Deadlines: R1=7, R2=14, R3=21, R4=28
const DEADLINES = [7, 14, 21, 28];
const REUNION_LABELS = ['R1', 'R2', 'R3', 'R4'];

function getReunionStatus(data: Date | null, deadlineDay: number, now: Date): 'done' | 'late' | 'pending' | 'upcoming' {
  const currentDay = now.getDate();
  if (data) return 'done';
  if (currentDay > deadlineDay) return 'late';
  if (currentDay > deadlineDay - 3) return 'upcoming'; // 3 days before
  return 'pending';
}

function statusIcon(status: 'done' | 'late' | 'pending' | 'upcoming') {
  switch (status) {
    case 'done': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'late': return <XCircle className="h-4 w-4 text-red-500" />;
    case 'upcoming': return <Clock className="h-4 w-4 text-amber-500" />;
    case 'pending': return <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />;
  }
}

function tempEmoji(temp: string | null): string {
  if (!temp) return '—';
  if (temp.includes('🟢')) return '🟢';
  if (temp.includes('🟡')) return '🟡';
  if (temp.includes('🔴')) return '🔴';
  return temp;
}

// Get current month label for default
function getCurrentMonthLabel(): string {
  const now = new Date();
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[now.getMonth()]}/${now.getFullYear()}`;
}

// Normalize month reference to comparable format
function normalizeMonth(mesRef: string): string {
  // Handle formats: "Mar/2026", "Março/2026", "Fev/2026", "Fevereiro/2026", "Janeiro/2026"
  const s = mesRef.trim();
  const monthMap: Record<string, string> = {
    'janeiro': 'Jan', 'fevereiro': 'Fev', 'março': 'Mar', 'abril': 'Abr',
    'maio': 'Mai', 'junho': 'Jun', 'julho': 'Jul', 'agosto': 'Ago',
    'setembro': 'Set', 'outubro': 'Out', 'novembro': 'Nov', 'dezembro': 'Dez',
    'jan': 'Jan', 'fev': 'Fev', 'mar': 'Mar', 'abr': 'Abr',
    'mai': 'Mai', 'jun': 'Jun', 'jul': 'Jul', 'ago': 'Ago',
    'set': 'Set', 'out': 'Out', 'nov': 'Nov', 'dez': 'Dez',
  };
  const match = s.match(/^(\w+)\/?(\d{4})$/);
  if (match) {
    const monthPart = match[1].toLowerCase();
    const year = match[2];
    const normalized = monthMap[monthPart] || match[1].substring(0, 3);
    return `${normalized}/${year}`;
  }
  return s;
}

export function ReunioesView({ reunioes, allCfos }: ReunioesViewProps) {
  const [filterCfo, setFilterCfo] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('');
  const [sortCol, setSortCol] = useState<'titulo' | 'cfo' | 'progress'>('progress');
  const [sortAsc, setSortAsc] = useState(true);

  const now = new Date();

  // Available months from data
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    for (const r of reunioes) {
      if (r.mesReferencia) months.add(normalizeMonth(r.mesReferencia));
    }
    // Sort chronologically
    const monthOrder = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return [...months].sort((a, b) => {
      const [ma, ya] = a.split('/');
      const [mb, yb] = b.split('/');
      if (ya !== yb) return parseInt(ya) - parseInt(yb);
      return monthOrder.indexOf(ma) - monthOrder.indexOf(mb);
    });
  }, [reunioes]);

  // Auto-select last available month when data loads
  useEffect(() => {
    if (filterMonth === '' && availableMonths.length > 0) {
      const currentMonth = getCurrentMonthLabel();
      if (availableMonths.includes(currentMonth)) {
        setFilterMonth(currentMonth);
      } else {
        setFilterMonth(availableMonths[availableMonths.length - 1]);
      }
    }
  }, [availableMonths, filterMonth]);

  // Filter reunioes by selected month
  const monthFiltered = useMemo(() => {
    if (filterMonth === '' || filterMonth === 'all') return reunioes;
    return reunioes.filter(r => normalizeMonth(r.mesReferencia) === filterMonth);
  }, [reunioes, filterMonth]);

  const enriched = useMemo(() => {
    return monthFiltered.map(r => {
      const dates = [r.r1, r.r2, r.r3, r.r4];
      const statuses = dates.map((d, i) => getReunionStatus(d, DEADLINES[i], now));
      const done = statuses.filter(s => s === 'done').length;
      const late = statuses.filter(s => s === 'late').length;
      const progress = done;
      return { ...r, statuses, done, late, progress };
    });
  }, [reunioes, now]);

  const filtered = useMemo(() => {
    let list = enriched;
    if (filterCfo !== 'all') list = list.filter(r => r.cfo === filterCfo);
    if (filterStatus === 'atrasado') list = list.filter(r => r.late > 0);
    if (filterStatus === 'em_dia') list = list.filter(r => r.late === 0 && r.done > 0);
    if (filterStatus === 'sem_reuniao') list = list.filter(r => r.done === 0);

    list = [...list].sort((a, b) => {
      if (sortCol === 'progress') return sortAsc ? a.progress - b.progress : b.progress - a.progress;
      if (sortCol === 'cfo') return sortAsc ? a.cfo.localeCompare(b.cfo) : b.cfo.localeCompare(a.cfo);
      return sortAsc ? a.titulo.localeCompare(b.titulo) : b.titulo.localeCompare(a.titulo);
    });
    return list;
  }, [enriched, filterCfo, filterStatus, sortCol, sortAsc]);

  // KPIs
  const totalClientes = enriched.length;
  const totalDone = enriched.reduce((s, r) => s + r.done, 0);
  const totalExpected = enriched.length * 4;
  const totalLate = enriched.reduce((s, r) => s + r.late, 0);
  const clientesEmDia = enriched.filter(r => r.late === 0 && r.done > 0).length;
  const clientesAtrasados = enriched.filter(r => r.late > 0).length;
  const clientesSemReuniao = enriched.filter(r => r.done === 0).length;
  const taxaRealizacao = totalExpected > 0 ? Math.round((totalDone / totalExpected) * 100) : 0;

  // CFO summary
  const cfoSummary = useMemo(() => {
    const map = new Map<string, { total: number; done: number; late: number; clientes: number }>();
    for (const r of enriched) {
      if (!r.cfo) continue;
      const existing = map.get(r.cfo) || { total: 0, done: 0, late: 0, clientes: 0 };
      existing.total += 4;
      existing.done += r.done;
      existing.late += r.late;
      existing.clientes++;
      map.set(r.cfo, existing);
    }
    return Array.from(map.entries())
      .map(([cfo, data]) => ({ cfo, ...data, taxa: Math.round((data.done / data.total) * 100) }))
      .sort((a, b) => a.taxa - b.taxa);
  }, [enriched]);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="flex flex-col items-center p-3 rounded-lg border bg-muted/50">
          <Calendar className="h-5 w-5 mb-1 text-blue-500" />
          <span className="text-xl font-bold">{totalClientes}</span>
          <span className="text-xs text-muted-foreground">Clientes</span>
        </div>
        <div className="flex flex-col items-center p-3 rounded-lg border bg-muted/50">
          <CheckCircle2 className="h-5 w-5 mb-1 text-green-500" />
          <span className="text-xl font-bold text-green-600">{totalDone}/{totalExpected}</span>
          <span className="text-xs text-muted-foreground">Reuniões Feitas</span>
        </div>
        <div className="flex flex-col items-center p-3 rounded-lg border bg-muted/50">
          <span className="text-xl font-bold text-blue-600">{taxaRealizacao}%</span>
          <span className="text-xs text-muted-foreground">Taxa Realização</span>
        </div>
        <div className="flex flex-col items-center p-3 rounded-lg border bg-muted/50">
          <CheckCircle2 className="h-5 w-5 mb-1 text-green-500" />
          <span className="text-xl font-bold text-green-600">{clientesEmDia}</span>
          <span className="text-xs text-muted-foreground">Em Dia</span>
        </div>
        <div className="flex flex-col items-center p-3 rounded-lg border bg-muted/50">
          <AlertTriangle className="h-5 w-5 mb-1 text-red-500" />
          <span className="text-xl font-bold text-red-600">{clientesAtrasados}</span>
          <span className="text-xs text-muted-foreground">Atrasados</span>
        </div>
        <div className="flex flex-col items-center p-3 rounded-lg border bg-muted/50">
          <XCircle className="h-5 w-5 mb-1 text-muted-foreground" />
          <span className="text-xl font-bold">{clientesSemReuniao}</span>
          <span className="text-xs text-muted-foreground">Sem Reunião</span>
        </div>
      </div>

      {/* CFO Summary */}
      <div className="rounded-lg border p-4">
        <h4 className="text-sm font-semibold text-muted-foreground mb-3">Reuniões por CFO</h4>
        <div className="space-y-2">
          {cfoSummary.map(c => (
            <button
              key={c.cfo}
              onClick={() => setFilterCfo(filterCfo === c.cfo ? 'all' : c.cfo)}
              className={`w-full flex items-center gap-2 px-2 py-1 rounded transition-colors text-left ${filterCfo === c.cfo ? 'bg-primary/10 ring-1 ring-primary' : 'hover:bg-muted/50'}`}
            >
              <span className="text-xs w-40 truncate">{c.cfo}</span>
              <div className="flex-1 h-4 bg-muted/30 rounded overflow-hidden flex">
                <div className="h-full bg-green-500" style={{ width: `${c.taxa}%` }} />
                {c.late > 0 && <div className="h-full bg-red-500" style={{ width: `${Math.round((c.late / c.total) * 100)}%` }} />}
              </div>
              <span className="text-xs font-medium w-16 text-right">{c.done}/{c.total}</span>
              <Badge variant={c.taxa >= 80 ? "default" : c.taxa >= 50 ? "secondary" : "destructive"} className="text-[10px] w-12 justify-center">
                {c.taxa}%
              </Badge>
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center flex-wrap">
        <Select value={filterMonth} onValueChange={setFilterMonth}>
          <SelectTrigger className="w-[160px]">
            <Calendar className="h-3 w-3 mr-1" />
            <SelectValue placeholder="Mês" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os meses</SelectItem>
            {availableMonths.map(m => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="atrasado">Atrasados</SelectItem>
            <SelectItem value="em_dia">Em Dia</SelectItem>
            <SelectItem value="sem_reuniao">Sem Reunião</SelectItem>
          </SelectContent>
        </Select>
        {(filterCfo !== 'all' || filterStatus !== 'all' || filterMonth !== getCurrentMonthLabel()) && (
          <Button variant="ghost" size="sm" onClick={() => { setFilterCfo('all'); setFilterStatus('all'); setFilterMonth(getCurrentMonthLabel()); }}>
            Limpar filtros
          </Button>
        )}
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} clientes</span>
      </div>

      {/* Table */}
      <ScrollArea className="h-[500px] rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button variant="ghost" size="sm" className="gap-1 -ml-3" onClick={() => { setSortCol('titulo'); setSortAsc(!sortAsc); }}>
                  Cliente <ArrowUpDown className="h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" size="sm" className="gap-1 -ml-3" onClick={() => { setSortCol('cfo'); setSortAsc(!sortAsc); }}>
                  CFO <ArrowUpDown className="h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead className="text-center w-16">R1<br/><span className="text-[10px] text-muted-foreground">até dia 7</span></TableHead>
              <TableHead className="text-center w-16">R2<br/><span className="text-[10px] text-muted-foreground">até dia 14</span></TableHead>
              <TableHead className="text-center w-16">R3<br/><span className="text-[10px] text-muted-foreground">até dia 21</span></TableHead>
              <TableHead className="text-center w-16">R4<br/><span className="text-[10px] text-muted-foreground">até dia 28</span></TableHead>
              <TableHead className="text-center">
                <Button variant="ghost" size="sm" className="gap-1" onClick={() => { setSortCol('progress'); setSortAsc(!sortAsc); }}>
                  Progresso <ArrowUpDown className="h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead className="text-center">Participou</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(r => {
              const dates = [r.r1, r.r2, r.r3, r.r4];
              const temps = [r.t1, r.t2, r.t3, r.t4];
              return (
                <TableRow key={r.id} className={r.late > 0 ? 'bg-red-500/5' : ''}>
                  <TableCell className="font-medium max-w-[180px]">
                    <span className="inline-flex items-center gap-1 truncate">
                      {r.titulo}
                      <a href={`https://app.pipefy.com/open-cards/${r.id}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                        <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground hover:text-primary" />
                      </a>
                    </span>
                  </TableCell>
                  <TableCell className="text-sm max-w-[140px] truncate">{r.cfo}</TableCell>
                  {[0, 1, 2, 3].map(i => {
                    const status = r.statuses[i];
                    const temp = temps[i];
                    const date = dates[i];
                    const dateLabel = date ? `${date.getDate()}/${date.getMonth() + 1}` : null;

                    return (
                      <TableCell key={i} className="text-center">
                        {status === 'done' ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <div className={`flex items-center justify-center w-7 h-7 rounded-full ${temp ? '' : 'bg-green-500/20'}`}>
                              {temp ? (
                                <span className="text-base">{tempEmoji(temp)}</span>
                              ) : (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              )}
                            </div>
                            <span className="text-[9px] text-muted-foreground">{dateLabel}</span>
                          </div>
                        ) : status === 'late' ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-red-500/15">
                              <XCircle className="h-4 w-4 text-red-500" />
                            </div>
                            <span className="text-[9px] text-red-400">atraso</span>
                          </div>
                        ) : status === 'upcoming' ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-500/15">
                              <Clock className="h-4 w-4 text-amber-500" />
                            </div>
                            <span className="text-[9px] text-amber-400">breve</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center w-7 h-7">
                            <div className="w-3 h-3 rounded-full border-2 border-muted-foreground/20" />
                          </div>
                        )}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${(r.done / 4) * 100}%` }} />
                      </div>
                      <span className="text-xs font-medium">{r.done}/4</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {r.clienteParticipou === 'Sim' ? <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /> :
                     r.clienteParticipou === 'Não' ? <XCircle className="h-4 w-4 text-red-500 mx-auto" /> :
                     <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}
