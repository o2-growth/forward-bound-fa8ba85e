import React, { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, CheckCircle2, XCircle, Circle, AlertTriangle, ArrowUpDown, ExternalLink, ChevronDown, ChevronRight, Info } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { PipefyCardLink, PIPEFY_PIPES } from "../nps/PipefyCardLink";
import type { JornadaCliente } from "./types";

const MONTH_ABBR = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

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
  clientes?: JornadaCliente[];
}

// Deadlines: R1=7, R2=14, R3=21, R4=28
const DEADLINES = [7, 14, 21, 28];
const REUNION_LABELS = ['R1', 'R2', 'R3', 'R4'];

function getReunionStatus(data: Date | null, deadlineDay: number, now: Date): 'done' | 'late' | 'pending' | 'overdue' {
  if (!data) {
    // Não preencheu: verificar se já passou do prazo
    return now.getDate() > deadlineDay ? 'overdue' : 'pending';
  }
  // Preencheu: verificar se foi dentro do prazo
  return data.getDate() <= deadlineDay ? 'done' : 'late';
}

function statusIcon(status: 'done' | 'late' | 'pending' | 'overdue') {
  switch (status) {
    case 'done': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'late': return <XCircle className="h-4 w-4 text-red-500" />;
    case 'overdue': return <XCircle className="h-4 w-4 text-orange-500" />;
    case 'pending': return <Circle className="h-4 w-4 text-gray-400" />;
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

function buildClientSummary(cliente: JornadaCliente): string[] {
  const lines: string[] = [];

  // Lifetime
  if (cliente.lifetimeMonths) {
    lines.push(`Cliente há ${cliente.lifetimeMonths} meses`);
  }

  // Setup
  if (cliente.setupStatus === 'concluido') {
    lines.push('Setup concluído');
  } else if (cliente.setupStatus === 'em_andamento') {
    lines.push(`Setup em andamento${cliente.setupFase ? ` (${cliente.setupFase})` : ''}${cliente.setupDias ? `, ${cliente.setupDias}d` : ''}`);
  } else if (cliente.setupStatus === 'atrasado') {
    lines.push(`⚠️ Setup atrasado${cliente.setupDias ? ` (${cliente.setupDias}d)` : ''}`);
  }

  // NPS
  if (cliente.ultimoNps !== null && cliente.ultimoNps !== undefined) {
    const cat = cliente.npsClassificacao === 'promotor' ? '🟢 Promotor' : cliente.npsClassificacao === 'detrator' ? '🔴 Detrator' : '🟡 Neutro';
    lines.push(`NPS: ${cliente.ultimoNps} (${cat})`);
  } else {
    lines.push('Sem pesquisa NPS');
  }

  // CSAT
  if (cliente.ultimoCsat !== null && cliente.ultimoCsat !== undefined) {
    lines.push(`CSAT: ${cliente.ultimoCsat}/5`);
  }

  // Tratativa
  if (cliente.tratativaAtiva) {
    lines.push(`🔴 Tratativa ativa: ${cliente.tratativaMotivo || 'sem motivo'}${cliente.tratativaDias ? `, ${cliente.tratativaDias}d` : ''}`);
  }

  // Reuniões
  lines.push(`Reuniões: ${cliente.reunioesFeitas}/4 realizadas`);

  // Tarefas
  if (cliente.tarefasAtrasadas > 0) {
    lines.push(`⚠️ ${cliente.tarefasAtrasadas} tarefas atrasadas de ${cliente.tarefasAtivas}`);
  } else if (cliente.tarefasAtivas > 0) {
    lines.push(`${cliente.tarefasAtivas} tarefas ativas, nenhuma atrasada`);
  }

  return lines;
}

function buildClientAlerts(cliente: JornadaCliente): string[] {
  const alerts: string[] = [];
  if (cliente.setupStatus === 'atrasado') {
    alerts.push(`Setup atrasado${cliente.setupDias ? ` (${cliente.setupDias} dias)` : ''}`);
  }
  if (cliente.npsClassificacao === 'detrator') {
    alerts.push(`NPS Detrator (${cliente.ultimoNps})`);
  }
  if (cliente.tratativaAtiva) {
    alerts.push(`Tratativa ativa: ${cliente.tratativaMotivo || 'sem motivo'}`);
  }
  if (cliente.tarefasAtrasadas > 0) {
    alerts.push(`${cliente.tarefasAtrasadas} tarefas atrasadas`);
  }
  if (cliente.ultimoNps === null) {
    alerts.push('Sem pesquisa NPS');
  }
  return alerts;
}

export function ReunioesView({ reunioes, allCfos, clientes }: ReunioesViewProps) {
  const [filterCfo, setFilterCfo] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('');
  const [sortCol, setSortCol] = useState<'titulo' | 'cfo' | 'progress'>('progress');
  const [sortAsc, setSortAsc] = useState(true);
  const [expandedClient, setExpandedClient] = useState<string | null>(null);

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
      const done = statuses.filter(s => s === 'done' || s === 'late').length;
      const late = statuses.filter(s => s === 'late').length;
      const progress = done;
      return { ...r, statuses, done, late, progress };
    });
  }, [monthFiltered, now]);

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

  // Build a lookup map for clientes by lowercase trimmed titulo
  const clienteMap = useMemo(() => {
    if (!clientes) return new Map<string, JornadaCliente>();
    const map = new Map<string, JornadaCliente>();
    for (const c of clientes) {
      map.set(c.titulo.toLowerCase().trim(), c);
    }
    return map;
  }, [clientes]);

  function findMatchedCliente(titulo: string): JornadaCliente | undefined {
    return clienteMap.get(titulo.toLowerCase().trim());
  }

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
    <TooltipProvider>
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
        <h4 className="text-sm font-semibold text-muted-foreground mb-3">
          Reuniões por CFO
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help inline ml-1" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs">
              <p>R1-R4 = reuniões semanais com deadlines nos dias 7, 14, 21 e 28. Taxa = reuniões feitas / 4 × 100. Reunião no prazo = preenchida antes do deadline. Atrasada = preenchida após. Fonte: Pipefy — Rotinas (pipe 306755752)</p>
            </TooltipContent>
          </Tooltip>
        </h4>
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
        {(filterCfo !== 'all' || filterStatus !== 'all' || filterMonth === 'all') && (
          <Button variant="ghost" size="sm" onClick={() => { setFilterCfo('all'); setFilterStatus('all'); setFilterMonth(availableMonths.includes(getCurrentMonthLabel()) ? getCurrentMonthLabel() : availableMonths[availableMonths.length - 1] || ''); }}>
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
              <TableHead className="w-8"></TableHead>
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
              <TableHead className="text-center w-16">
                R1<br/><span className="text-[10px] text-muted-foreground">até dia 7</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground cursor-help inline ml-0.5" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-xs">
                    <p>R1 (dia 7), R2 (dia 14), R3 (dia 21), R4 (dia 28). Verde = no prazo. Vermelho = preenchido após prazo. Laranja = prazo expirado sem preenchimento. Cinza = prazo futuro. Fonte: Pipefy — Rotinas</p>
                  </TooltipContent>
                </Tooltip>
              </TableHead>
              <TableHead className="text-center w-16">R2<br/><span className="text-[10px] text-muted-foreground">até dia 14</span></TableHead>
              <TableHead className="text-center w-16">R3<br/><span className="text-[10px] text-muted-foreground">até dia 21</span></TableHead>
              <TableHead className="text-center w-16">R4<br/><span className="text-[10px] text-muted-foreground">até dia 28</span></TableHead>
              <TableHead className="text-center">
                <Button variant="ghost" size="sm" className="gap-1" onClick={() => { setSortCol('progress'); setSortAsc(!sortAsc); }}>
                  Progresso <ArrowUpDown className="h-3 w-3" />
                </Button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground cursor-help inline ml-0.5" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-xs">
                    <p>Reuniões feitas / 4 (incluindo atrasadas)</p>
                  </TooltipContent>
                </Tooltip>
              </TableHead>
              <TableHead className="text-center">Participou</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(r => {
              const dates = [r.r1, r.r2, r.r3, r.r4];
              const temps = [r.t1, r.t2, r.t3, r.t4];
              const isExpanded = expandedClient === r.id;
              const matchedCliente = clientes ? findMatchedCliente(r.titulo) : undefined;
              const hasClienteData = !!matchedCliente;
              return (
                <React.Fragment key={r.id}>
                  <TableRow
                    className={`${r.late > 0 ? 'bg-red-500/5' : ''} ${hasClienteData ? 'cursor-pointer hover:bg-muted/50' : ''}`}
                    onClick={() => {
                      if (hasClienteData) {
                        setExpandedClient(isExpanded ? null : r.id);
                      }
                    }}
                  >
                    <TableCell className="w-8 px-2">
                      {hasClienteData && (
                        isExpanded
                          ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium max-w-[180px]">
                      <span className="inline-flex items-center gap-1 truncate" onClick={(e) => e.stopPropagation()}>
                        {r.titulo}
                        <PipefyCardLink pipeId={PIPEFY_PIPES.ROTINAS} cardId={r.id} variant="icon" />
                      </span>
                    </TableCell>
                    <TableCell className="text-sm max-w-[140px] truncate">{r.cfo}</TableCell>
                    {[0, 1, 2, 3].map(i => {
                      const status = r.statuses[i];
                      const temp = temps[i];
                      const date = dates[i];
                      const dateLabel = date ? `${String(date.getDate()).padStart(2, '0')}/${MONTH_ABBR[date.getMonth()]}` : null;

                      return (
                        <TableCell key={i} className="text-center">
                          {status === 'done' ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-green-500/20">
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              </div>
                              <span className="text-[9px] text-muted-foreground">{dateLabel}</span>
                            </div>
                          ) : status === 'late' ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-red-500/15">
                                <XCircle className="h-4 w-4 text-red-500" />
                              </div>
                              <span className="text-[9px] text-red-400">{dateLabel || 'atraso'}</span>
                            </div>
                          ) : status === 'overdue' ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-orange-500/15">
                                <XCircle className="h-4 w-4 text-orange-500" />
                              </div>
                              <span className="text-[9px] text-orange-400">sem preench.</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-0.5">
                              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-400/15">
                                <Circle className="h-4 w-4 text-gray-400" />
                              </div>
                              <span className="text-[9px] text-gray-400">pendente</span>
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
                  {isExpanded && matchedCliente && (
                    <TableRow key={`${r.id}-expanded`}>
                      <TableCell colSpan={10} className="bg-muted/30 p-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Situação do Cliente */}
                          <div>
                            <h4 className="text-sm font-semibold mb-2">Situação do Cliente</h4>
                            <ul className="space-y-1">
                              {buildClientSummary(matchedCliente).map((line, i) => (
                                <li key={i} className="text-xs text-muted-foreground">{line}</li>
                              ))}
                            </ul>
                          </div>

                          {/* Health Score Breakdown */}
                          <div>
                            <h4 className="text-sm font-semibold mb-2">
                              Health Score:{' '}
                              <span className={
                                matchedCliente.healthLevel === 'green' ? 'text-green-600' :
                                matchedCliente.healthLevel === 'yellow' ? 'text-yellow-600' :
                                'text-red-600'
                              }>
                                {matchedCliente.healthScore}/100
                              </span>
                            </h4>
                            <div className="space-y-1.5 text-xs">
                              <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">NPS</span>
                                <span className="font-medium">{matchedCliente.healthBreakdown.nps}/30</span>
                              </div>
                              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(matchedCliente.healthBreakdown.nps / 30) * 100}%` }} />
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Reuniões</span>
                                <span className="font-medium">{matchedCliente.healthBreakdown.reunioes}/30</span>
                              </div>
                              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(matchedCliente.healthBreakdown.reunioes / 30) * 100}%` }} />
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Tratativa</span>
                                <span className="font-medium">{matchedCliente.healthBreakdown.tratativa}/20</span>
                              </div>
                              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(matchedCliente.healthBreakdown.tratativa / 20) * 100}%` }} />
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Setup</span>
                                <span className="font-medium">{matchedCliente.healthBreakdown.setup}/20</span>
                              </div>
                              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(matchedCliente.healthBreakdown.setup / 20) * 100}%` }} />
                              </div>
                            </div>
                          </div>

                          {/* Alertas */}
                          <div>
                            <h4 className="text-sm font-semibold mb-2">Alertas</h4>
                            {(() => {
                              const alerts = buildClientAlerts(matchedCliente);
                              if (alerts.length === 0) {
                                return <p className="text-xs text-muted-foreground">Nenhum alerta ativo</p>;
                              }
                              return (
                                <ul className="space-y-1">
                                  {alerts.map((alert, i) => (
                                    <li key={i} className="text-xs text-red-500 flex items-start gap-1">
                                      <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                                      {alert}
                                    </li>
                                  ))}
                                </ul>
                              );
                            })()}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
    </TooltipProvider>
  );
}
