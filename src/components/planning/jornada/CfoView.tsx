import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowUpDown, ExternalLink, Info, ChevronDown, ChevronRight, Users, DollarSign, Plus, Minus, X, Calculator, Zap, Trash2 } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell, LabelList } from "recharts";
import type { JornadaCfo, JornadaCliente } from "./types";

/* ── Simulator types ── */
interface SimulatedClient {
  id: string;
  nome: string;
  produto: string;
  feeMensal: number;
  feeSetup: number;
  isPontual: boolean;
  action: 'add' | 'remove';
}

const PRODUTO_OPTIONS = [
  { value: 'CFOaaS/Enterprise', label: 'CFOaaS / Enterprise', pontual: false },
  { value: 'Diagnóstico', label: 'Diagnóstico', pontual: true },
  { value: 'Turnaround', label: 'Turnaround', pontual: true },
  { value: 'OXY', label: 'OXY', pontual: false },
  { value: 'Valuation', label: 'Valuation', pontual: true },
  { value: 'Educação', label: 'Educação', pontual: false },
];

let simIdCounter = 0;
const nextSimId = () => `sim-${++simIdCounter}-${Date.now()}`;

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

/* A3: Rank badge helper */
const rankBadge = (rank: number) => {
  const cls = rank === 1 ? 'text-green-700 dark:text-green-400' : rank <= 3 ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground';
  return <sup className={`ml-0.5 text-[9px] font-bold ${cls}`}>#{rank}</sup>;
};

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

/* ── Simulator Sub-Component ── */
interface SimuladorCarteiraProps {
  mrrTotal: number;
  custoSquad: number;
  clientes: JornadaCliente[];
  totalClientes: number;
}

function SimuladorCarteira({ mrrTotal, custoSquad, clientes, totalClientes }: SimuladorCarteiraProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [simulatedClients, setSimulatedClients] = useState<SimulatedClient[]>([]);

  // Form state
  const [formNome, setFormNome] = useState('');
  const [formProduto, setFormProduto] = useState('CFOaaS/Enterprise');
  const [formFeeMensal, setFormFeeMensal] = useState(7000);
  const [formFeeSetup, setFormFeeSetup] = useState(15000);
  const [formIsPontual, setFormIsPontual] = useState(false);
  const [removeClientId, setRemoveClientId] = useState('');

  // Auto-check pontual when selecting certain products
  const handleProdutoChange = useCallback((value: string) => {
    setFormProduto(value);
    const opt = PRODUTO_OPTIONS.find(o => o.value === value);
    if (opt) setFormIsPontual(opt.pontual);
  }, []);

  const handleAddClient = useCallback(() => {
    const newClient: SimulatedClient = {
      id: nextSimId(),
      nome: formNome || `Novo ${formProduto}`,
      produto: formProduto,
      feeMensal: formIsPontual ? 0 : formFeeMensal,
      feeSetup: formFeeSetup,
      isPontual: formIsPontual,
      action: 'add',
    };
    setSimulatedClients(prev => [...prev, newClient]);
    setFormNome('');
  }, [formNome, formProduto, formFeeMensal, formFeeSetup, formIsPontual]);

  const handleRemoveClient = useCallback(() => {
    if (!removeClientId) return;
    const cliente = clientes.find(c => c.id === removeClientId);
    if (!cliente) return;
    // Check not already removed
    if (simulatedClients.some(s => s.action === 'remove' && s.nome === cliente.titulo)) return;
    const removeSim: SimulatedClient = {
      id: nextSimId(),
      nome: cliente.titulo,
      produto: cliente.produtos.join(', '),
      feeMensal: cliente.mrr,
      feeSetup: 0,
      isPontual: cliente.mrr === 0 && cliente.pontual > 0,
      action: 'remove',
    };
    setSimulatedClients(prev => [...prev, removeSim]);
    setRemoveClientId('');
  }, [removeClientId, clientes, simulatedClients]);

  const handleUndo = useCallback((id: string) => {
    setSimulatedClients(prev => prev.filter(s => s.id !== id));
  }, []);

  const handleClear = useCallback(() => {
    setSimulatedClients([]);
  }, []);

  const handleScenarioIdeal = useCallback(() => {
    // Target: 10 clients at R$ 8k ticket
    const targetClientes = 10;
    const targetTicket = 8000;
    const diff = targetClientes - totalClientes;
    const newSims: SimulatedClient[] = [];

    if (diff > 0) {
      for (let i = 0; i < diff; i++) {
        newSims.push({
          id: nextSimId(),
          nome: `Cliente Ideal ${i + 1}`,
          produto: 'CFOaaS/Enterprise',
          feeMensal: targetTicket,
          feeSetup: 15000,
          isPontual: false,
          action: 'add',
        });
      }
    } else if (diff < 0) {
      // Remove the lowest MRR clients to reach target
      const sortedByMrr = [...clientes].sort((a, b) => a.mrr - b.mrr);
      for (let i = 0; i < Math.abs(diff); i++) {
        const c = sortedByMrr[i];
        if (c) {
          newSims.push({
            id: nextSimId(),
            nome: c.titulo,
            produto: c.produtos.join(', '),
            feeMensal: c.mrr,
            feeSetup: 0,
            isPontual: false,
            action: 'remove',
          });
        }
      }
    }
    setSimulatedClients(newSims);
  }, [totalClientes, clientes]);

  const handleScenarioLoseBiggest = useCallback(() => {
    if (clientes.length === 0) return;
    const biggest = clientes.reduce((max, c) => c.mrr > max.mrr ? c : max, clientes[0]);
    setSimulatedClients([{
      id: nextSimId(),
      nome: biggest.titulo,
      produto: biggest.produtos.join(', '),
      feeMensal: biggest.mrr,
      feeSetup: 0,
      isPontual: false,
      action: 'remove',
    }]);
  }, [clientes]);

  // Compute simulation result
  const simResult = useMemo(() => {
    const additions = simulatedClients.filter(s => s.action === 'add');
    const removals = simulatedClients.filter(s => s.action === 'remove');

    const atualClientes = totalClientes;
    const atualMrr = mrrTotal;
    const atualPontual = clientes.reduce((s, c) => s + c.pontual, 0);

    const addedMrr = additions.reduce((s, c) => s + c.feeMensal, 0);
    const removedMrr = removals.reduce((s, c) => s + c.feeMensal, 0);
    const addedPontual = additions.filter(c => c.isPontual).reduce((s, c) => s + c.feeSetup, 0);

    const simClientes = atualClientes + additions.length - removals.length;
    const simMrr = atualMrr + addedMrr - removedMrr;
    const simPontual = atualPontual + addedPontual;

    const atualMargem = atualMrr > 0 ? ((atualMrr - custoSquad) / atualMrr) * 100 : 0;
    const simMargem = simMrr > 0 ? ((simMrr - custoSquad) / simMrr) * 100 : 0;

    const atualTicket = atualClientes > 0 ? atualMrr / atualClientes : 0;
    const simTicket = simClientes > 0 ? simMrr / simClientes : 0;

    const atualMargemBruta = atualMrr - custoSquad;
    const simMargemBruta = simMrr - custoSquad;

    return {
      rows: [
        { metrica: 'Clientes', atual: atualClientes, simulado: simClientes, impacto: simClientes - atualClientes, format: 'int' as const },
        { metrica: 'Receita (MRR)', atual: atualMrr, simulado: simMrr, impacto: simMrr - atualMrr, format: 'brl' as const },
        { metrica: 'Receita (Pontual)', atual: atualPontual, simulado: simPontual, impacto: simPontual - atualPontual, format: 'brl' as const },
        { metrica: 'Custo Squad', atual: custoSquad, simulado: custoSquad, impacto: 0, format: 'brl' as const },
        { metrica: 'Margem Bruta', atual: atualMargemBruta, simulado: simMargemBruta, impacto: simMargemBruta - atualMargemBruta, format: 'brl' as const },
        { metrica: 'Margem %', atual: atualMargem, simulado: simMargem, impacto: simMargem - atualMargem, format: 'pct' as const },
        { metrica: 'Ticket Medio', atual: atualTicket, simulado: simTicket, impacto: simTicket - atualTicket, format: 'brl' as const },
      ],
      chartData: [
        { name: 'Receita', Atual: atualMrr, Simulado: simMrr },
        { name: 'Margem', Atual: atualMargemBruta, Simulado: simMargemBruta },
      ],
    };
  }, [simulatedClients, totalClientes, mrrTotal, custoSquad, clientes]);

  const formatCell = (value: number, format: 'int' | 'brl' | 'pct' | 'dec') => {
    switch (format) {
      case 'int': return value.toString();
      case 'brl': return formatBRL(value);
      case 'pct': return `${value.toFixed(0)}%`;
      case 'dec': return value.toFixed(1);
    }
  };

  const formatImpacto = (value: number, format: 'int' | 'brl' | 'pct' | 'dec') => {
    if (Math.abs(value) < 0.5 && format !== 'dec') return '—';
    if (Math.abs(value) < 0.05 && format === 'dec') return '—';
    const sign = value > 0 ? '+' : '';
    switch (format) {
      case 'int': return `${sign}${value}`;
      case 'brl': return `${sign}${formatBRL(value)}`;
      case 'pct': return `${sign}${value.toFixed(0)}pp`;
      case 'dec': return `${sign}${value.toFixed(1)}`;
    }
  };

  const impactoColor = (value: number, metrica: string) => {
    if (Math.abs(value) < 0.05) return 'text-muted-foreground';
    // For Cli/Analista, higher is not necessarily good
    if (metrica === 'Cli/Analista') return value > 2 ? 'text-red-600 dark:text-red-400' : value > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400';
    return value > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
  };

  const hasChanges = simulatedClients.length > 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-dashed bg-muted/30">
        <CardContent className="pt-4 pb-3 space-y-3">
          <CollapsibleTrigger asChild>
            <button className="flex items-center gap-2 text-sm font-semibold w-full hover:text-primary transition-colors">
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <Calculator className="h-4 w-4 text-primary" />
              Simulador de Carteira
              {hasChanges && (
                <Badge variant="secondary" className="ml-2 text-[10px]">
                  {simulatedClients.length} {simulatedClients.length === 1 ? 'alteracao' : 'alteracoes'}
                </Badge>
              )}
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent className="space-y-4 pt-2">
            {/* Section 1: Adicionar Cliente */}
            <div className="space-y-2 p-3 rounded-md border border-green-500/30 bg-green-500/5">
              <p className="text-xs font-semibold text-green-700 dark:text-green-400 flex items-center gap-1">
                <Plus className="h-3 w-3" /> Adicionar Cliente
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground">Nome (opcional)</label>
                  <Input
                    placeholder="Nome do cliente"
                    value={formNome}
                    onChange={(e) => setFormNome(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">Produto</label>
                  <Select value={formProduto} onValueChange={handleProdutoChange}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRODUTO_OPTIONS.map(o => (
                        <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">Fee Mensal (R$)</label>
                  <Input
                    type="number"
                    value={formFeeMensal}
                    onChange={(e) => setFormFeeMensal(Number(e.target.value))}
                    className="h-8 text-xs"
                    disabled={formIsPontual}
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">Fee Setup (R$)</label>
                  <Input
                    type="number"
                    value={formFeeSetup}
                    onChange={(e) => setFormFeeSetup(Number(e.target.value))}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="isPontual"
                    checked={formIsPontual}
                    onCheckedChange={(checked) => setFormIsPontual(!!checked)}
                  />
                  <label htmlFor="isPontual" className="text-xs text-muted-foreground cursor-pointer">
                    Pontual (sem recorrencia)
                  </label>
                </div>
                <Button size="sm" className="h-7 text-xs gap-1" onClick={handleAddClient}>
                  <Plus className="h-3 w-3" /> Adicionar
                </Button>
              </div>
            </div>

            {/* Section 2: Remover Cliente */}
            {clientes.length > 0 && (
              <div className="space-y-2 p-3 rounded-md border border-red-500/30 bg-red-500/5">
                <p className="text-xs font-semibold text-red-700 dark:text-red-400 flex items-center gap-1">
                  <Minus className="h-3 w-3" /> Remover Cliente
                </p>
                <div className="flex gap-2">
                  <Select value={removeClientId} onValueChange={setRemoveClientId}>
                    <SelectTrigger className="h-8 text-xs flex-1">
                      <SelectValue placeholder="Selecionar cliente..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.map(c => (
                        <SelectItem key={c.id} value={c.id} className="text-xs">
                          {c.titulo} — {formatCompact(c.mrr)} MRR
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="destructive" className="h-8 text-xs gap-1" onClick={handleRemoveClient} disabled={!removeClientId}>
                    <Minus className="h-3 w-3" /> Remover
                  </Button>
                </div>
              </div>
            )}

            {/* Section 3: Clientes simulados (list) */}
            {hasChanges && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground">Alteracoes simuladas</p>
                <div className="space-y-1">
                  {simulatedClients.map(s => (
                    <div
                      key={s.id}
                      className={`flex items-center justify-between text-xs px-2 py-1.5 rounded-md border ${
                        s.action === 'add'
                          ? 'border-green-500/30 bg-green-500/5'
                          : 'border-red-500/30 bg-red-500/5'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Badge
                          className={`text-[10px] ${
                            s.action === 'add'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}
                        >
                          {s.action === 'add' ? '+' : '-'}
                        </Badge>
                        <span className="font-medium">{s.nome}</span>
                        <span className="text-muted-foreground">{s.produto}</span>
                        {s.feeMensal > 0 && <span className="text-muted-foreground">{formatCompact(s.feeMensal)}/mes</span>}
                        {s.isPontual && s.feeSetup > 0 && <span className="text-purple-600">{formatCompact(s.feeSetup)} setup</span>}
                      </div>
                      <button
                        onClick={() => handleUndo(s.id)}
                        className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section 4: Resultado da Simulacao */}
            {hasChanges && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground">Resultado da Simulacao</p>
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left py-1.5 px-2 font-semibold">Metrica</th>
                        <th className="text-right py-1.5 px-2 font-semibold">Atual</th>
                        <th className="text-right py-1.5 px-2 font-semibold">Simulado</th>
                        <th className="text-right py-1.5 px-2 font-semibold">Impacto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {simResult.rows.map(row => (
                        <tr key={row.metrica} className="border-b last:border-0">
                          <td className="py-1.5 px-2 font-medium">{row.metrica}</td>
                          <td className="text-right py-1.5 px-2">{formatCell(row.atual, row.format)}</td>
                          <td className="text-right py-1.5 px-2 font-medium">{formatCell(row.simulado, row.format)}</td>
                          <td className={`text-right py-1.5 px-2 font-semibold ${impactoColor(row.impacto, row.metrica)}`}>
                            {formatImpacto(row.impacto, row.format)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Comparison bar chart */}
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={simResult.chartData} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => formatCompact(v)} width={70} />
                      <Bar dataKey="Atual" radius={[4, 4, 0, 0]} maxBarSize={40}>
                        <LabelList dataKey="Atual" position="top" formatter={(v: number) => formatCompact(v)} className="text-[10px] fill-muted-foreground" />
                        {simResult.chartData.map((_, i) => (
                          <Cell key={`atual-${i}`} className="fill-muted-foreground/40" />
                        ))}
                      </Bar>
                      <Bar dataKey="Simulado" radius={[4, 4, 0, 0]} maxBarSize={40}>
                        <LabelList dataKey="Simulado" position="top" formatter={(v: number) => formatCompact(v)} className="text-[10px] fill-primary" />
                        {simResult.chartData.map((entry, i) => (
                          <Cell key={`sim-${i}`} className={entry.Simulado >= entry.Atual ? 'fill-green-500' : 'fill-red-500'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Section 5: Cenarios pre-definidos */}
            <Separator />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleScenarioIdeal}>
                <Zap className="h-3 w-3" /> Cenario Ideal (10 cli, R$ 8k)
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleScenarioLoseBiggest}>
                <Minus className="h-3 w-3 text-red-500" /> Perder maior cliente
              </Button>
              {hasChanges && (
                <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-muted-foreground" onClick={handleClear}>
                  <Trash2 className="h-3 w-3" /> Limpar simulacao
                </Button>
              )}
            </div>
          </CollapsibleContent>
        </CardContent>
      </Card>
    </Collapsible>
  );
}

/* ── Component ── */
interface CfoViewProps {
  cfos: JornadaCfo[];
  clientes: JornadaCliente[];
}

type SortCol = "nome" | "clientes" | "mrrTotal" | "healthScoreMedio" | "taxaEntrega" | "clientesTratativa" | "mrrEmRisco" | "churns";

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

  const activeClientes = useMemo(() => {
    return clientes.filter(c => !INACTIVE_PHASES.includes(c.faseAtual));
  }, [clientes]);

  // A1: Count churns per CFO
  const CHURN_PHASES_LOCAL = ['Churn', 'Atividades finalizadas', 'Desistência'];
  const churnsPerCfo = useMemo(() => {
    const map: Record<string, number> = {};
    clientes.filter(c => CHURN_PHASES_LOCAL.includes(c.faseAtual)).forEach(c => {
      const cfo = c.cfo || 'Sem CFO';
      map[cfo] = (map[cfo] || 0) + 1;
    });
    return map;
  }, [clientes]);

  const sortedCfos = useMemo(() => {
    return [...cfos].sort((a, b) => {
      if (sortCol === 'churns') {
        const av = churnsPerCfo[a.nome] || 0;
        const bv = churnsPerCfo[b.nome] || 0;
        return sortAsc ? av - bv : bv - av;
      }
      const av = a[sortCol as keyof JornadaCfo];
      const bv = b[sortCol as keyof JornadaCfo];
      if (typeof av === "string" && typeof bv === "string") return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortAsc ? ((av as number) ?? 0) - ((bv as number) ?? 0) : ((bv as number) ?? 0) - ((av as number) ?? 0);
    });
  }, [cfos, sortCol, sortAsc, churnsPerCfo]);

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
      const churns = churnsPerCfo[cfo.nome] || 0;
      return { ...cfo, custoSquad, margem, ticketMedio, churns };
    });
  }, [cfos, churnsPerCfo]);

  /* A3: Compute rankings per metric (higher is better, except churns where lower is better) */
  const rankings = useMemo(() => {
    const metrics = ['clientes', 'mrrTotal', 'healthScoreMedio', 'taxaEntrega', 'margem', 'ticketMedio'] as const;
    const lowerIsBetter = ['churns', 'clientesTratativa', 'mrrEmRisco', 'custoSquad'] as const;
    const result: Record<string, Record<string, number>> = {};

    const rankBy = (key: string, ascending: boolean) => {
      const sorted = [...comparisonData].sort((a, b) => {
        const av = (a as any)[key] ?? 0;
        const bv = (b as any)[key] ?? 0;
        return ascending ? av - bv : bv - av;
      });
      sorted.forEach((cfo, idx) => {
        if (!result[cfo.nome]) result[cfo.nome] = {};
        result[cfo.nome][key] = idx + 1;
      });
    };

    metrics.forEach(m => rankBy(m, false));
    lowerIsBetter.forEach(m => rankBy(m, true));

    return result;
  }, [comparisonData]);

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
              <p>Receita = MRR (CFOaaS + OXY). Custo = Fee CFO + Fee analistas. Margem = (Receita - Custo) / Receita × 100. Ticket = MRR / Clientes. Health Score = média ponderada NPS 30pts + Reuniões 30pts + Tratativa 20pts + Setup 20pts. Fonte: Pipefy + Squad data</p>
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
                    {cfo.nome}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-1.5 px-3 font-medium sticky left-0 bg-background z-10">Clientes</td>
                {comparisonData.map((cfo) => (
                  <td key={cfo.nome} className="text-center py-1.5 px-3">{cfo.clientes}{rankBadge(rankings[cfo.nome]?.clientes ?? 0)}</td>
                ))}
              </tr>
              <tr className="border-b">
                <td className="py-1.5 px-3 font-medium sticky left-0 bg-background z-10">Receita (MRR)</td>
                {comparisonData.map((cfo) => (
                  <td key={cfo.nome} className="text-center py-1.5 px-3">{formatCompact(cfo.mrrTotal)}{rankBadge(rankings[cfo.nome]?.mrrTotal ?? 0)}</td>
                ))}
              </tr>
              <tr className="border-b">
                <td className="py-1.5 px-3 font-medium sticky left-0 bg-background z-10">Custo Squad</td>
                {comparisonData.map((cfo) => (
                  <td key={cfo.nome} className="text-center py-1.5 px-3">{cfo.custoSquad > 0 ? <>{formatCompact(cfo.custoSquad)}{rankBadge(rankings[cfo.nome]?.custoSquad ?? 0)}</> : '—'}</td>
                ))}
              </tr>
              <tr className="border-b">
                <td className="py-1.5 px-3 font-medium sticky left-0 bg-background z-10">Margem %</td>
                {comparisonData.map((cfo) => (
                  <td key={cfo.nome} className="text-center py-1.5 px-3">
                    {cfo.custoSquad > 0 ? (
                      <><Badge className={`${marginBgColor(cfo.margem)} text-[10px]`}>{cfo.margem.toFixed(0)}%</Badge>{rankBadge(rankings[cfo.nome]?.margem ?? 0)}</>
                    ) : '—'}
                  </td>
                ))}
              </tr>
              <tr className="border-b">
                <td className="py-1.5 px-3 font-medium sticky left-0 bg-background z-10">Ticket Medio</td>
                {comparisonData.map((cfo) => (
                  <td key={cfo.nome} className="text-center py-1.5 px-3">{formatCompact(cfo.ticketMedio)}{rankBadge(rankings[cfo.nome]?.ticketMedio ?? 0)}</td>
                ))}
              </tr>
              <tr className="border-b">
                <td className="py-1.5 px-3 font-medium sticky left-0 bg-background z-10">Health Score</td>
                {comparisonData.map((cfo) => (
                  <td key={cfo.nome} className="text-center py-1.5 px-3">
                    <div className="flex items-center justify-center gap-1">
                      <span className={`inline-block w-2 h-2 rounded-full ${healthDot(cfo.healthScoreMedio)}`} />
                      {cfo.healthScoreMedio}{rankBadge(rankings[cfo.nome]?.healthScoreMedio ?? 0)}
                    </div>
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-1.5 px-3 font-medium sticky left-0 bg-background z-10">Churns</td>
                {comparisonData.map((cfo) => (
                  <td key={cfo.nome} className="text-center py-1.5 px-3">
                    {cfo.churns > 0 ? (
                      <><Badge variant="destructive" className="text-[10px]">{cfo.churns}</Badge>{rankBadge(rankings[cfo.nome]?.churns ?? 0)}</>
                    ) : <span className="text-muted-foreground">0{rankBadge(rankings[cfo.nome]?.churns ?? 0)}</span>}
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
          const cfoChurns = churnsPerCfo[cfo.nome] || 0;
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
                        <p>MRR = CFOaaS + OXY. NPS = média dos clientes respondentes. Health = média ponderada (NPS 30 + Reuniões 30 + Tratativa 20 + Setup 20). Fonte: Pipefy — Central de Projetos + NPS</p>
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

                  {cfoChurns > 0 && (
                    <Badge variant="destructive" className="text-[10px]">
                      {cfoChurns} {cfoChurns === 1 ? 'churn' : 'churns'}
                    </Badge>
                  )}
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
              <p>Comparativo completo por CFO: MRR, Health, Taxa Entrega, Tratativas, MRR em Risco, Custo Squad, Margem %, Ticket Médio. Fonte: Pipefy — Central de Projetos + Squad data</p>
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
                  ["churns", "Churns"],
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
                    <TableCell>
                      {(churnsPerCfo[cfo.nome] || 0) > 0 ? (
                        <Badge variant="destructive" className="text-[10px]">{churnsPerCfo[cfo.nome]}</Badge>
                      ) : <span className="text-muted-foreground">0</span>}
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
            const margemPct = receitaBruta > 0 ? (margemBruta / receitaBruta) * 100 : 0;
            const ticketMedio = (selectedCfoData?.clientes ?? 0) > 0 ? mrrTotal / (selectedCfoData?.clientes ?? 1) : 0;

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
                      <div className="flex justify-between font-bold text-sm">
                        <span>Margem Bruta</span>
                        <span className={margemBruta >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                          {formatBRL(margemBruta)} ({margemPct.toFixed(0)}%)
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
                      <p className="text-xs text-muted-foreground">Margem Bruta</p>
                      <p className={`text-lg font-bold ${marginColor(margemPct)}`}>{margemPct.toFixed(0)}%</p>
                      <p className="text-[10px] text-muted-foreground">Meta: {TARGETS.margemTarget}%</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Interactive Client Simulator */}
                <SimuladorCarteira
                  key={selectedCfo}
                  mrrTotal={mrrTotal}
                  custoSquad={custoSquad}
                  clientes={dialogClientes}
                  totalClientes={selectedCfoData?.clientes ?? 0}
                />

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
