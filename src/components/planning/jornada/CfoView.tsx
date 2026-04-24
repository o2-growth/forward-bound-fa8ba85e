import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { ArrowUpDown, ExternalLink, Info, ChevronDown, ChevronRight, Users, DollarSign } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import type { JornadaCfo, JornadaCliente } from "./types";

/* ── Squad Data ── */
const CFO_SQUADS: Record<string, {
  nome: string;
  fee: number;
  membros: { nome: string; cargo: string; fee: number }[];
}> = {
  'Oliveira': {
    nome: 'Adivilso Souza de Oliveira Junior',
    fee: 12000,
    membros: [
      { nome: 'Pedro Fuzer Garcia', cargo: 'Analista FP&A', fee: 6000 },
    ],
  },
  'Douglas Schossler': {
    nome: 'Douglas Pinheiro Schossler',
    fee: 17500,
    membros: [
      { nome: 'Tainara Sofia Konzen', cargo: 'Analista FP&A', fee: 7500 },
    ],
  },
  'Eduardo Milani Pedrolo': {
    nome: 'Eduardo Milani Pedrolo',
    fee: 13000,
    membros: [
      { nome: 'Sergio Pereira Piva Junior', cargo: 'Analista FP&A', fee: 7500 },
      { nome: 'Felipe Vargas Brenner', cargo: 'Analista FP&A', fee: 7000 },
      { nome: 'Eric Alves da Silveira', cargo: 'Analista Financeiro', fee: 7000 },
      { nome: 'Pedro Oppermann Michelucci', cargo: 'Estagiário FP&A', fee: 0 },
    ],
  },
  'Everton Bisinella': {
    nome: 'Everton Bisinella',
    fee: 14000,
    membros: [
      { nome: 'Anderson Felizardo Mendes', cargo: 'Analista FP&A', fee: 0 },
      { nome: 'Maria Eduarda Nery Reckziegel', cargo: 'Estagiária FP&A', fee: 0 },
    ],
  },
  'Gustavo Cochlar': {
    nome: 'Gustavo Ferreira Cochlar',
    fee: 22349,
    membros: [
      { nome: 'Humberto de Azevedo Behs', cargo: 'Analista FP&A', fee: 7000 },
    ],
  },
  "Eduardo D'Agostini": {
    nome: 'Luis Eduardo Dagostini',
    fee: 29254,
    membros: [
      { nome: 'Pamela Luiza dos Santos Quadros', cargo: 'Analista FP&A', fee: 7500 },
      { nome: 'Matheus da Silva Besnos', cargo: 'Analista FP&A', fee: 7000 },
    ],
  },
  'Mariana Luz da Silva': {
    nome: 'Mariana Luz da Silva',
    fee: 15000,
    membros: [
      { nome: 'Roberta Costa Curta Lirio', cargo: 'Analista FP&A', fee: 7500 },
      { nome: 'Raissa Bonamigo Daros', cargo: 'Estagiária FP&A', fee: 0 },
    ],
  },
  'Rafael Marchioretto': {
    nome: 'Rafael Marchioretto Bokorni',
    fee: 9000,
    membros: [],
  },
};

/* ── Targets from Structure tab ── */
const TARGETS = {
  clientesPerSquad: 10,
  ticketMedio: 7915,
  margemTarget: 56,
};

/* ── Helpers ── */
const formatCompact = (value: number) => {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(1)}k`;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);
};

const formatBRL = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);

const healthBarColor = (score: number) =>
  score >= 70 ? "bg-green-500" : score >= 40 ? "bg-yellow-500" : "bg-red-500";

const healthDot = (score: number) =>
  score >= 70 ? "bg-green-500" : score >= 40 ? "bg-yellow-500" : "bg-red-500";

/* ── Client status derivation ── */
type ClienteStatus = 'risco' | 'novo' | 'controlado';

function deriveStatus(c: JornadaCliente): ClienteStatus {
  if (c.tratativaAtiva || c.npsClassificacao === 'detrator' || c.healthScore < 40) return 'risco';
  if ((c.lifetimeMonths !== null && c.lifetimeMonths < 3) || c.faseAtual === 'Onboarding') return 'novo';
  return 'controlado';
}

const STATUS_CONFIG: Record<ClienteStatus, { label: string; className: string }> = {
  risco: { label: 'Risco de Churn', className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-300' },
  novo: { label: 'Cliente Novo', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-300' },
  controlado: { label: 'Controlado', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-300' },
};

/* ── Product badge mapping ── */
function produtoBadges(produtos: string[]) {
  return produtos.filter(Boolean).map((p) => {
    const lower = p.toLowerCase();
    if (lower.includes('cfoaas') || lower.includes('enterprise')) {
      return { label: 'Enterprise', className: 'bg-primary text-primary-foreground' };
    }
    if (lower.includes('diagnóstico') || lower.includes('diagnostico')) {
      return { label: 'Diagnóstico', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' };
    }
    if (lower.includes('turnaround')) {
      return { label: 'Turnaround', className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' };
    }
    if (lower.includes('oxy')) {
      return { label: 'OXY', className: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' };
    }
    if (lower.includes('valuation')) {
      return { label: 'Valuation', className: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200' };
    }
    if (lower.includes('educação') || lower.includes('educacao')) {
      return { label: 'Educação', className: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200' };
    }
    return { label: p, className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' };
  });
}

const marginColor = (pct: number) =>
  pct > 50 ? "text-green-600 dark:text-green-400" : pct >= 30 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400";

const marginBgColor = (pct: number) =>
  pct > 50
    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
    : pct >= 30
    ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
    : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";

function getSquad(cfoNome: string) {
  return CFO_SQUADS[cfoNome] ?? null;
}

function getSquadCusto(cfoNome: string): number {
  const sq = getSquad(cfoNome);
  if (!sq) return 0;
  return sq.fee + sq.membros.reduce((s, m) => s + m.fee, 0);
}

function getAnalystCount(cfoNome: string): number {
  const sq = getSquad(cfoNome);
  if (!sq) return 1;
  return 1 + sq.membros.length; // CFO + members
}

/* ── Component ── */
interface CfoViewProps {
  cfos: JornadaCfo[];
  clientes: JornadaCliente[];
}

type SortCol = "nome" | "clientes" | "mrrTotal" | "healthScoreMedio" | "taxaEntrega" | "clientesTratativa" | "mrrEmRisco";

const INACTIVE_PHASES = ['Churn', 'Atividades finalizadas', 'Desistência', 'Arquivado'];

export function CfoView({ cfos, clientes }: CfoViewProps) {
  const [selectedCfo, setSelectedCfo] = useState<string | null>(null);
  const [sortCol, setSortCol] = useState<SortCol>("mrrTotal");
  const [sortAsc, setSortAsc] = useState(false);
  const [expandedSquads, setExpandedSquads] = useState<Set<string>>(new Set());

  const handleSort = (col: SortCol) => {
    if (sortCol === col) setSortAsc(!sortAsc);
    else { setSortCol(col); setSortAsc(col === "nome"); }
  };

  const toggleSquad = (nome: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedSquads(prev => {
      const next = new Set(prev);
      if (next.has(nome)) next.delete(nome); else next.add(nome);
      return next;
    });
  };

  const sortedCfos = useMemo(() => {
    return [...cfos].sort((a, b) => {
      const av = a[sortCol];
      const bv = b[sortCol];
      if (typeof av === "string" && typeof bv === "string") return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortAsc ? ((av as number) ?? 0) - ((bv as number) ?? 0) : ((bv as number) ?? 0) - ((av as number) ?? 0);
    });
  }, [cfos, sortCol, sortAsc]);

  const activeClientes = useMemo(() => {
    return clientes.filter(c => !INACTIVE_PHASES.includes(c.faseAtual));
  }, [clientes]);

  const dialogClientes = useMemo(() => {
    if (!selectedCfo) return [];
    return activeClientes.filter(c => c.cfo === selectedCfo).sort((a, b) => b.mrr - a.mrr);
  }, [activeClientes, selectedCfo]);

  const selectedCfoData = cfos.find(c => c.nome === selectedCfo);

  /* Comparison table data for Feature 4 */
  const comparisonData = useMemo(() => {
    return cfos.map((cfo) => {
      const custoSquad = getSquadCusto(cfo.nome);
      const margem = cfo.mrrTotal > 0 ? ((cfo.mrrTotal - custoSquad) / cfo.mrrTotal) * 100 : 0;
      const ticketMedio = cfo.clientes > 0 ? cfo.mrrTotal / cfo.clientes : 0;
      return { ...cfo, custoSquad, margem, ticketMedio };
    });
  }, [cfos]);

  return (
    <TooltipProvider>
    <div className="space-y-6">
      {/* Feature 4: Comparativo entre CFOs (P&L lado a lado) */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Comparativo P&L por CFO
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help inline ml-1" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs">
              <p>Visao consolidada lado a lado de todos os CFOs: receita, custo, margem, ticket medio e health score. Fonte: Pipefy + Squad data.</p>
            </TooltipContent>
          </Tooltip>
        </h3>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left py-2 px-3 font-semibold sticky left-0 bg-muted/50 z-10 min-w-[100px]">Metrica</th>
                {comparisonData.map((cfo) => (
                  <th key={cfo.nome} className="text-center py-2 px-3 font-semibold min-w-[100px] whitespace-nowrap">
                    {cfo.nome.split(' ')[0]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-1.5 px-3 font-medium sticky left-0 bg-background z-10">Clientes</td>
                {comparisonData.map((cfo) => (
                  <td key={cfo.nome} className="text-center py-1.5 px-3">{cfo.clientes}</td>
                ))}
              </tr>
              <tr className="border-b">
                <td className="py-1.5 px-3 font-medium sticky left-0 bg-background z-10">Receita (MRR)</td>
                {comparisonData.map((cfo) => (
                  <td key={cfo.nome} className="text-center py-1.5 px-3">{formatCompact(cfo.mrrTotal)}</td>
                ))}
              </tr>
              <tr className="border-b">
                <td className="py-1.5 px-3 font-medium sticky left-0 bg-background z-10">Custo Squad</td>
                {comparisonData.map((cfo) => (
                  <td key={cfo.nome} className="text-center py-1.5 px-3">{cfo.custoSquad > 0 ? formatCompact(cfo.custoSquad) : '—'}</td>
                ))}
              </tr>
              <tr className="border-b">
                <td className="py-1.5 px-3 font-medium sticky left-0 bg-background z-10">Margem %</td>
                {comparisonData.map((cfo) => (
                  <td key={cfo.nome} className="text-center py-1.5 px-3">
                    {cfo.custoSquad > 0 ? (
                      <Badge className={`${marginBgColor(cfo.margem)} text-[10px]`}>{cfo.margem.toFixed(0)}%</Badge>
                    ) : '—'}
                  </td>
                ))}
              </tr>
              <tr className="border-b">
                <td className="py-1.5 px-3 font-medium sticky left-0 bg-background z-10">Ticket Medio</td>
                {comparisonData.map((cfo) => (
                  <td key={cfo.nome} className="text-center py-1.5 px-3">{formatCompact(cfo.ticketMedio)}</td>
                ))}
              </tr>
              <tr>
                <td className="py-1.5 px-3 font-medium sticky left-0 bg-background z-10">Health Score</td>
                {comparisonData.map((cfo) => (
                  <td key={cfo.nome} className="text-center py-1.5 px-3">
                    <div className="flex items-center justify-center gap-1">
                      <span className={`inline-block w-2 h-2 rounded-full ${healthDot(cfo.healthScoreMedio)}`} />
                      {cfo.healthScoreMedio}
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* CFO Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cfos.map((cfo) => {
          const squad = getSquad(cfo.nome);
          const custoSquad = getSquadCusto(cfo.nome);
          const margem = cfo.mrrTotal > 0 ? ((cfo.mrrTotal - custoSquad) / cfo.mrrTotal) * 100 : 0;
          const ticketMedio = cfo.clientes > 0 ? cfo.mrrTotal / cfo.clientes : 0;
          const cliPorAnalista = cfo.clientes / getAnalystCount(cfo.nome);
          const isSquadOpen = expandedSquads.has(cfo.nome);

          return (
            <Card
              key={cfo.nome}
              className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
              onClick={() => setSelectedCfo(cfo.nome)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>
                    {cfo.nome}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help inline ml-1" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-xs">
                        <p>Clientes ativos, MRR, health score médio. Fonte: Pipefy</p>
                      </TooltipContent>
                    </Tooltip>
                  </span>
                  <span className="text-xs font-normal text-muted-foreground">
                    Health: {cfo.healthScoreMedio}
                  </span>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {cfo.clientes} clientes | {formatCompact(cfo.mrrTotal)} MRR
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Health bar */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Health Score</span>
                    <span className="font-medium">{cfo.healthScoreMedio}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${healthBarColor(cfo.healthScoreMedio)}`}
                      style={{ width: `${cfo.healthScoreMedio}%` }}
                    />
                  </div>
                </div>

                {/* Badges row */}
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge
                    className={
                      cfo.taxaEntrega >= 80
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : cfo.taxaEntrega >= 50
                        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                        : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                    }
                  >
                    Entrega {cfo.taxaEntrega}%
                  </Badge>

                  <Badge
                    variant={cfo.clientesTratativa > 0 ? "default" : "secondary"}
                    className={cfo.clientesTratativa > 0 ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" : ""}
                  >
                    {cfo.clientesTratativa} em tratativa
                  </Badge>

                  {cfo.mrrEmRisco > 0 && (
                    <Badge variant="destructive">
                      {formatCompact(cfo.mrrEmRisco)} em risco
                    </Badge>
                  )}

                  <Badge variant="outline">
                    NPS {cfo.npsMediaClientes ?? "—"}
                  </Badge>
                </div>

                <Separator />

                {/* Squad section */}
                {squad ? (
                  <div onClick={(e) => e.stopPropagation()}>
                    <Collapsible open={isSquadOpen} onOpenChange={() => {}}>
                      <CollapsibleTrigger asChild>
                        <button
                          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
                          onClick={(e) => toggleSquad(cfo.nome, e)}
                        >
                          {isSquadOpen
                            ? <ChevronDown className="h-3.5 w-3.5" />
                            : <ChevronRight className="h-3.5 w-3.5" />
                          }
                          <Users className="h-3.5 w-3.5" />
                          <span className="font-medium">Squad:</span>
                          <span>CFO + {squad.membros.length} {squad.membros.length === 1 ? 'membro' : 'membros'}</span>
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2 space-y-1 pl-5">
                        <div className="text-xs flex justify-between">
                          <span className="font-medium">{squad.nome.split(' ').slice(0, 2).join(' ')} <span className="text-muted-foreground">(CFO)</span></span>
                          <span className="text-muted-foreground">{formatCompact(squad.fee)}</span>
                        </div>
                        {squad.membros.map((m) => (
                          <div key={m.nome} className="text-xs flex justify-between">
                            <span>
                              {m.nome.split(' ').slice(0, 2).join(' ')}
                              <span className="text-muted-foreground ml-1">({m.cargo})</span>
                            </span>
                            <span className="text-muted-foreground">{m.fee > 0 ? formatCompact(m.fee) : '—'}</span>
                          </div>
                        ))}
                        <Separator className="my-1" />
                        <div className="text-xs flex justify-between font-medium">
                          <span>Total custo squad</span>
                          <span>{formatCompact(custoSquad)}</span>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Squad não mapeado</p>
                )}

                <Separator />

                {/* Financial metrics */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Custo</span>
                    <span className="font-medium">{formatCompact(custoSquad)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Margem</span>
                    <span className={`font-semibold ${marginColor(margem)}`}>{margem.toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ticket</span>
                    <span className="font-medium">{formatCompact(ticketMedio)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cli/analista</span>
                    <span className="font-medium">{cliPorAnalista.toFixed(1)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Comparison Table */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Comparativo CFOs
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help inline ml-1" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs">
              <p>Distribuição de clientes e MRR por CFO. Fonte: Pipefy — Central de Projetos</p>
            </TooltipContent>
          </Tooltip>
        </h3>
        <ScrollArea className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {([
                  ["nome", "CFO"],
                  ["clientes", "Clientes"],
                  ["mrrTotal", "MRR Total"],
                  ["healthScoreMedio", "Health"],
                  ["taxaEntrega", "Entrega %"],
                  ["clientesTratativa", "Tratativas"],
                  ["mrrEmRisco", "MRR Risco"],
                ] as [SortCol, string][]).map(([col, label]) => (
                  <TableHead key={col}>
                    <Button variant="ghost" size="sm" className="gap-1 -ml-3" onClick={() => handleSort(col)}>
                      {label}
                      <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </TableHead>
                ))}
                <TableHead className="text-right">Custo Squad</TableHead>
                <TableHead className="text-right">Margem %</TableHead>
                <TableHead className="text-right">Ticket</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedCfos.map((cfo) => {
                const custoSquad = getSquadCusto(cfo.nome);
                const margem = cfo.mrrTotal > 0 ? ((cfo.mrrTotal - custoSquad) / cfo.mrrTotal) * 100 : 0;
                const ticketMedio = cfo.clientes > 0 ? cfo.mrrTotal / cfo.clientes : 0;

                return (
                  <TableRow
                    key={cfo.nome}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedCfo(cfo.nome)}
                  >
                    <TableCell className="font-medium">{cfo.nome}</TableCell>
                    <TableCell>{cfo.clientes}</TableCell>
                    <TableCell>{formatBRL(cfo.mrrTotal)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={`inline-block w-2 h-2 rounded-full ${healthDot(cfo.healthScoreMedio)}`} />
                        {cfo.healthScoreMedio}
                      </div>
                    </TableCell>
                    <TableCell>{cfo.taxaEntrega}%</TableCell>
                    <TableCell>{cfo.clientesTratativa}</TableCell>
                    <TableCell className={cfo.mrrEmRisco > 0 ? "text-red-600 font-medium" : ""}>
                      {formatBRL(cfo.mrrEmRisco)}
                    </TableCell>
                    <TableCell className="text-right">{custoSquad > 0 ? formatCompact(custoSquad) : '—'}</TableCell>
                    <TableCell className="text-right">
                      {custoSquad > 0 ? (
                        <Badge className={marginBgColor(margem)}>{margem.toFixed(0)}%</Badge>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-right">{formatCompact(ticketMedio)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      {/* CFO Detail Dialog */}
      <Dialog open={!!selectedCfo} onOpenChange={(open) => !open && setSelectedCfo(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{selectedCfo} — {dialogClientes.length} clientes ativos</span>
              {selectedCfoData && (
                <span className="text-sm font-normal text-muted-foreground">
                  MRR: {formatCompact(selectedCfoData.mrrTotal)} | Health: {selectedCfoData.healthScoreMedio}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          {/* P&L mini section */}
          {selectedCfo && (() => {
            const squad = getSquad(selectedCfo);
            const custoSquad = getSquadCusto(selectedCfo);
            const mrrTotal = selectedCfoData?.mrrTotal ?? 0;
            const receitaBruta = mrrTotal;
            const impostos = receitaBruta * 0.18;
            const receitaLiquida = receitaBruta - impostos;
            const margemBruta = receitaLiquida - custoSquad;
            const sgna = receitaBruta * 0.06;
            const resultadoLiquido = margemBruta - sgna;
            const margemPct = receitaBruta > 0 ? (margemBruta / receitaBruta) * 100 : 0;
            const ticketMedio = (selectedCfoData?.clientes ?? 0) > 0 ? mrrTotal / (selectedCfoData?.clientes ?? 1) : 0;
            const cliPorAnalista = (selectedCfoData?.clientes ?? 0) / getAnalystCount(selectedCfo);

            return (
              <div className="space-y-4">
                {/* Squad overview */}
                {squad && (
                  <Card className="border-dashed">
                    <CardContent className="pt-4 pb-3 space-y-2">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <Users className="h-4 w-4" />
                        Composição do Squad
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="flex justify-between border rounded-md px-3 py-2">
                          <div>
                            <p className="font-medium">{squad.nome}</p>
                            <p className="text-muted-foreground">CFO</p>
                          </div>
                          <span className="font-medium self-center">{formatBRL(squad.fee)}</span>
                        </div>
                        {squad.membros.map((m) => (
                          <div key={m.nome} className="flex justify-between border rounded-md px-3 py-2">
                            <div>
                              <p className="font-medium">{m.nome}</p>
                              <p className="text-muted-foreground">{m.cargo}</p>
                            </div>
                            <span className="font-medium self-center">{m.fee > 0 ? formatBRL(m.fee) : '—'}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-end text-sm font-semibold pt-1">
                        Total custo: {formatBRL(custoSquad)}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Mini P&L */}
                <Card className="border-dashed">
                  <CardContent className="pt-4 pb-3 space-y-1">
                    <div className="flex items-center gap-2 text-sm font-semibold mb-2">
                      <DollarSign className="h-4 w-4" />
                      P&L do Squad
                    </div>
                    <div className="text-xs space-y-1">
                      <div className="flex justify-between">
                        <span>Receita Bruta (MRR)</span>
                        <span className="font-medium">{formatBRL(receitaBruta)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span className="pl-3">(-) Impostos (18%)</span>
                        <span>- {formatBRL(impostos)}</span>
                      </div>
                      <div className="flex justify-between font-medium">
                        <span>Receita Líquida</span>
                        <span>{formatBRL(receitaLiquida)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span className="pl-3">(-) COGS (custo squad)</span>
                        <span>- {formatBRL(custoSquad)}</span>
                      </div>
                      <Separator className="my-1" />
                      <div className="flex justify-between font-semibold">
                        <span>Margem Bruta</span>
                        <span className={marginColor(margemPct)}>{formatBRL(margemBruta)} ({margemPct.toFixed(0)}%)</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span className="pl-3">(-) SG&A (6%)</span>
                        <span>- {formatBRL(sgna)}</span>
                      </div>
                      <Separator className="my-1" />
                      <div className="flex justify-between font-bold text-sm">
                        <span>Resultado Líquido</span>
                        <span className={resultadoLiquido >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                          {formatBRL(resultadoLiquido)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* KPI comparison with targets */}
                <div className="grid grid-cols-3 gap-3">
                  <Card className="border-dashed">
                    <CardContent className="pt-3 pb-2 text-center">
                      <p className="text-xs text-muted-foreground">Clientes / Squad</p>
                      <p className={`text-lg font-bold ${(selectedCfoData?.clientes ?? 0) >= TARGETS.clientesPerSquad ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`}>
                        {selectedCfoData?.clientes ?? 0}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Meta: {TARGETS.clientesPerSquad}</p>
                    </CardContent>
                  </Card>
                  <Card className="border-dashed">
                    <CardContent className="pt-3 pb-2 text-center">
                      <p className="text-xs text-muted-foreground">Ticket Médio</p>
                      <p className={`text-lg font-bold ${ticketMedio >= TARGETS.ticketMedio ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`}>
                        {formatCompact(ticketMedio)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Meta: {formatCompact(TARGETS.ticketMedio)}</p>
                    </CardContent>
                  </Card>
                  <Card className="border-dashed">
                    <CardContent className="pt-3 pb-2 text-center">
                      <p className="text-xs text-muted-foreground">Cli / Analista</p>
                      <p className="text-lg font-bold">{cliPorAnalista.toFixed(1)}</p>
                      <p className="text-[10px] text-muted-foreground">Margem: <span className={marginColor(margemPct)}>{margemPct.toFixed(0)}%</span> (meta {TARGETS.margemTarget}%)</p>
                    </CardContent>
                  </Card>
                </div>

                <Separator />
              </div>
            );
          })()}

          {dialogClientes.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">Nenhum cliente ativo para este CFO</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Fase</TableHead>
                  <TableHead className="text-right">Fee Mensal</TableHead>
                  <TableHead className="text-right">Pontual</TableHead>
                  <TableHead className="text-right">Health</TableHead>
                  <TableHead className="text-right">NPS</TableHead>
                  <TableHead>Tratativa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dialogClientes.map((c) => {
                  const status = deriveStatus(c);
                  const statusCfg = STATUS_CONFIG[status];
                  const badges = produtoBadges(c.produtos);

                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">
                        <span className="inline-flex items-center gap-1">
                          {c.titulo}
                          <a href={`https://app.pipefy.com/open-cards/${c.id}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                            <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-primary" />
                          </a>
                        </span>
                      </TableCell>
                      {/* Feature 1: Status badge */}
                      <TableCell>
                        <Badge className={`text-[10px] ${statusCfg.className}`}>{statusCfg.label}</Badge>
                      </TableCell>
                      {/* Feature 2: Produto badges */}
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {badges.length > 0 ? badges.map((b, i) => (
                            <Badge key={i} className={`text-[10px] ${b.className}`}>{b.label}</Badge>
                          )) : <span className="text-xs text-muted-foreground">—</span>}
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{c.faseAtual}</Badge></TableCell>
                      {/* Feature 3: Fee mensal (MRR or pontual-only) */}
                      <TableCell className="text-right">
                        {c.mrr > 0 ? formatBRL(c.mrr) : c.pontual > 0 ? <span className="text-purple-600">{formatBRL(c.pontual)}</span> : "—"}
                      </TableCell>
                      <TableCell className="text-right text-purple-600">
                        {c.mrr > 0 && c.pontual > 0 ? formatBRL(c.pontual) : c.mrr > 0 ? "—" : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <span className={`inline-block w-2 h-2 rounded-full ${healthDot(c.healthScore)}`} />
                          {c.healthScore}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{c.ultimoNps ?? "—"}</TableCell>
                      <TableCell>
                        {c.tratativaAtiva
                          ? <Badge variant="destructive" className="text-[10px]">{c.tratativaMotivo || "Ativa"}</Badge>
                          : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </div>
    </TooltipProvider>
  );
}
