import React, { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpDown, Search, ChevronDown, ChevronRight, ExternalLink, Filter, Info } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { PipefyCardLink, PIPEFY_PIPES } from "../nps/PipefyCardLink";
import type { JornadaCliente } from "./types";

const formatBRL = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);

type SortKey = "healthScore" | "mrr" | "titulo";

interface ClientesViewProps {
  clientes: JornadaCliente[];
}

export function ClientesView({ clientes }: ClientesViewProps) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("healthScore");
  const [sortAsc, setSortAsc] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterFase, setFilterFase] = useState<string>("all");
  const [filterPeriod, setFilterPeriod] = useState<string>("all");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(key === "titulo"); }
  };

  // Available phases
  const availableFases = useMemo(() => {
    const fases = new Set<string>();
    for (const c of clientes) if (c.faseAtual) fases.add(c.faseAtual);
    return [...fases].sort();
  }, [clientes]);

  const INACTIVE = ['Churn', 'Atividades finalizadas', 'Desistência', 'Arquivado'];

  const filtered = useMemo(() => {
    let list = clientes.filter(c => !INACTIVE.includes(c.faseAtual));
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c => c.titulo.toLowerCase().includes(q));
    }
    if (filterFase !== 'all') {
      list = list.filter(c => c.faseAtual === filterFase);
    }
    if (filterPeriod !== 'all') {
      const now = new Date();
      list = list.filter(c => {
        const dias = c.diasNaFaseAtual;
        if (filterPeriod === '30d') return dias <= 30;
        if (filterPeriod === '90d') return dias <= 90;
        if (filterPeriod === '90d+') return dias > 90;
        if (filterPeriod === '180d+') return dias > 180;
        return true;
      });
    }
    list = [...list].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "string" && typeof bv === "string") return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return list;
  }, [clientes, search, sortKey, sortAsc, filterFase, filterPeriod]);

  const healthColor = (level: string) =>
    level === "green" ? "bg-green-500" : level === "yellow" ? "bg-yellow-500" : "bg-red-500";

  const setupBadge = (status: JornadaCliente["setupStatus"]) => {
    switch (status) {
      case "concluido": return <Badge className="bg-green-600 hover:bg-green-700 text-white">Concluído</Badge>;
      case "em_andamento": return <Badge className="bg-blue-600 hover:bg-blue-700 text-white">Em andamento</Badge>;
      case "atrasado": return <Badge variant="destructive">Atrasado</Badge>;
      default: return <Badge variant="secondary">Sem setup</Badge>;
    }
  };

  const tratativaBadge = (c: JornadaCliente) => {
    if (c.tratativaAtiva) return <Badge variant="destructive">{c.tratativaMotivo || "Ativa"}</Badge>;
    return <Badge variant="secondary">—</Badge>;
  };

  return (
    <TooltipProvider>
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterFase} onValueChange={setFilterFase}>
          <SelectTrigger className="w-[200px]">
            <Filter className="h-3 w-3 mr-1" />
            <SelectValue placeholder="Fase" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as fases</SelectItem>
            {availableFases.map(f => (
              <SelectItem key={f} value={f}>{f}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterPeriod} onValueChange={setFilterPeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Periodo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Qualquer periodo</SelectItem>
            <SelectItem value="30d">Ate 30 dias na fase</SelectItem>
            <SelectItem value="90d">Ate 90 dias na fase</SelectItem>
            <SelectItem value="90d+">Mais de 90 dias</SelectItem>
            <SelectItem value="180d+">Mais de 180 dias</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          {([["healthScore", "Health"], ["mrr", "MRR"], ["titulo", "Nome"]] as [SortKey, string][]).map(([key, label]) => (
            <Button
              key={key}
              variant={sortKey === key ? "default" : "outline"}
              size="sm"
              onClick={() => handleSort(key)}
              className="gap-1"
            >
              <ArrowUpDown className="h-3 w-3" />
              {label}
            </Button>
          ))}
        </div>
        {(filterFase !== 'all' || filterPeriod !== 'all' || search) && (
          <Button variant="ghost" size="sm" onClick={() => { setFilterFase('all'); setFilterPeriod('all'); setSearch(''); }}>
            Limpar
          </Button>
        )}
        <span className="text-xs text-muted-foreground self-center ml-auto">{filtered.length} clientes</span>
      </div>

      {/* Table */}
      <ScrollArea className="h-[600px] rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>
                Health
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help inline ml-1" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-xs">
                    <p>Pontuação composta: NPS 30pts + Reuniões 30pts + Tratativa 20pts + Setup 20pts</p>
                  </TooltipContent>
                </Tooltip>
              </TableHead>
              <TableHead>
                Cliente
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help inline ml-1" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-xs">
                    <p>Lista de clientes ativos com health score, NPS, setup e tratativa. Fonte: Pipefy — Central de Projetos</p>
                  </TooltipContent>
                </Tooltip>
              </TableHead>
              <TableHead>
                Fase
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help inline ml-1" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-xs">
                    <p>Fase atual do projeto no Pipefy</p>
                  </TooltipContent>
                </Tooltip>
              </TableHead>
              <TableHead>CFO</TableHead>
              <TableHead className="text-right">MRR</TableHead>
              <TableHead className="text-right">NPS</TableHead>
              <TableHead>Produto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((c) => (
              <React.Fragment key={c.id}>
                <TableRow
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                >
                  <TableCell>
                    {expandedId === c.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className={`inline-block w-3 h-3 rounded-full ${healthColor(c.healthLevel)}`} />
                      <span className="text-sm font-medium">{c.healthScore}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium max-w-[200px]">
                    <span className="inline-flex items-center gap-1 truncate" onClick={(e) => e.stopPropagation()}>
                      {c.titulo}
                      <PipefyCardLink pipeId={PIPEFY_PIPES.CENTRAL_PROJETOS} cardId={c.id} variant="icon" />
                    </span>
                  </TableCell>
                  <TableCell><Badge variant="outline">{c.faseAtual}</Badge></TableCell>
                  <TableCell className="text-sm">{c.cfo}</TableCell>
                  <TableCell className="text-right text-sm">{formatBRL(c.mrr)}</TableCell>
                  <TableCell className="text-right text-sm">{c.ultimoNps ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">{c.produto || "—"}</TableCell>
                </TableRow>
                {expandedId === c.id && (
                  <TableRow key={`${c.id}-detail`}>
                    <TableCell colSpan={8} className="bg-muted/30 p-4">
                      <div className="space-y-4">
                        {/* Health Breakdown */}
                        <div>
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Health Score: {c.healthScore}/100</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="rounded-lg border p-2.5 space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">NPS</span>
                                <span className="font-semibold">{c.healthBreakdown.nps}/30</span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-1.5">
                                <div className={`h-full rounded-full ${c.healthBreakdown.nps >= 25 ? 'bg-green-500' : c.healthBreakdown.nps >= 15 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${(c.healthBreakdown.nps / 30) * 100}%` }} />
                              </div>
                              <p className="text-[10px] text-muted-foreground">
                                {c.ultimoNps !== null ? `Nota ${c.ultimoNps} (${c.npsClassificacao})` : 'Sem NPS registrado'}
                              </p>
                            </div>
                            <div className="rounded-lg border p-2.5 space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Reunioes</span>
                                <span className="font-semibold">{c.healthBreakdown.reunioes}/30</span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-1.5">
                                <div className={`h-full rounded-full ${c.healthBreakdown.reunioes >= 22 ? 'bg-green-500' : c.healthBreakdown.reunioes >= 8 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${(c.healthBreakdown.reunioes / 30) * 100}%` }} />
                              </div>
                              <p className="text-[10px] text-muted-foreground">
                                {c.reunioesFeitas}/4 reunioes no mes
                              </p>
                            </div>
                            <div className="rounded-lg border p-2.5 space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Tratativa</span>
                                <span className="font-semibold">{c.healthBreakdown.tratativa}/20</span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-1.5">
                                <div className={`h-full rounded-full ${c.healthBreakdown.tratativa >= 15 ? 'bg-green-500' : c.healthBreakdown.tratativa >= 5 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${(c.healthBreakdown.tratativa / 20) * 100}%` }} />
                              </div>
                              <p className="text-[10px] text-muted-foreground">
                                {c.tratativaAtiva ? `${c.tratativaMotivo} (${c.tratativaDias}d)` : 'Sem tratativa ativa'}
                              </p>
                            </div>
                            <div className="rounded-lg border p-2.5 space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Setup</span>
                                <span className="font-semibold">{c.healthBreakdown.setup}/20</span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-1.5">
                                <div className={`h-full rounded-full ${c.healthBreakdown.setup >= 15 ? 'bg-green-500' : c.healthBreakdown.setup >= 10 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${(c.healthBreakdown.setup / 20) * 100}%` }} />
                              </div>
                              <p className="text-[10px] text-muted-foreground">
                                {c.setupStatus === 'concluido' ? 'Concluido' : c.setupStatus === 'atrasado' ? `Atrasado (${c.setupDias}d)` : c.setupStatus === 'em_andamento' ? `Em andamento (${c.setupDias}d)` : 'Sem setup'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Info */}
                        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                          <span>Produto: <span className="text-foreground">{c.produto || "—"}</span></span>
                          <span>Lifetime: <span className="text-foreground">{c.lifetimeMonths ?? "—"} meses</span></span>
                          <span>Dias na fase: <span className="text-foreground">{c.diasNaFaseAtual}d</span></span>
                          <span>CSAT: <span className="text-foreground">{c.ultimoCsat ?? "—"}</span></span>
                          <a href={`https://app.pipefy.com/open-cards/${c.id}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 text-primary hover:underline font-medium">
                            <ExternalLink className="h-3 w-3" /> Ver no Pipefy
                          </a>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
    </TooltipProvider>
  );
}
