import { useState, useMemo, useCallback, useEffect } from "react";
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
import { ArrowUpDown, ExternalLink, Info, ChevronDown, ChevronRight, ChevronUp, Users, DollarSign, Plus, Minus, X, Calculator, Zap, Trash2 } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell, LabelList } from "recharts";
import type { JornadaCfo, JornadaCliente } from "./types";
import { ChurnKpiDrawer, type KpiDrawerData } from "@/components/planning/cs/ChurnKpiDrawer";
import { useSquadCostFromDre } from "@/hooks/useSquadCostFromDre";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";

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
  beneficios: number;
  membros: { nome: string; cargo: string; fee: number; beneficios: number }[];
}> = {
  // Salários e benefícios atualizados (Deslocamento + Alimentação + R$ 300 raio)
  'Oliveira': {
    nome: 'Adivilso Souza de Oliveira Junior',
    fee: 12000,
    beneficios: 1375,
    membros: [
      { nome: 'Pedro Fuzer Garcia', cargo: 'Analista FP&A', fee: 6000, beneficios: 1045.89 },
    ],
  },
  'Douglas Schossler': {
    nome: 'Douglas Pinheiro Schossler',
    fee: 25164.02,
    beneficios: 1076.80,
    membros: [
      { nome: 'Tainara Sofia Konzen', cargo: 'Analista FP&A', fee: 7500, beneficios: 993.60 },
    ],
  },
  'Eduardo Milani Pedrolo': {
    nome: 'Eduardo Milani Pedrolo',
    fee: 13000,
    beneficios: 930,
    membros: [
      { nome: 'Sergio Pereira Piva Junior', cargo: 'Analista FP&A', fee: 7500, beneficios: 951.40 },
      { nome: 'Felipe Vargas Brenner', cargo: 'Analista FP&A', fee: 7000, beneficios: 1215 },
      { nome: 'Eric Alves da Silveira', cargo: 'Analista Financeiro', fee: 7000, beneficios: 920 },
      { nome: 'Pedro Oppermann Michelucci', cargo: 'Estagiário FP&A', fee: 1500, beneficios: 889 },
    ],
  },
  'Everton Bisinella': {
    nome: 'Everton Bisinella',
    fee: 14000,
    beneficios: 1006.80,
    membros: [
      { nome: 'Anderson Felizardo Mendes', cargo: 'Analista FP&A', fee: 8000, beneficios: 300 },
      { nome: 'Maria Eduarda Nery Reckziegel', cargo: 'Estagiária FP&A', fee: 500, beneficios: 1003.60 },
    ],
  },
  'Gustavo Cochlar': {
    nome: 'Gustavo Ferreira Cochlar',
    fee: 20000,
    beneficios: 740,
    membros: [
      { nome: 'Humberto de Azevedo Behs', cargo: 'Analista FP&A', fee: 7000, beneficios: 987.60 },
    ],
  },
  "Eduardo D'Agostini": {
    nome: 'Luis Eduardo Dagostini',
    fee: 29063.45,
    beneficios: 1151.08,
    membros: [
      { nome: 'Pamela Luiza dos Santos Quadros', cargo: 'Analista FP&A', fee: 7500, beneficios: 1074.90 },
      { nome: 'Matheus da Silva Besnos', cargo: 'Analista FP&A', fee: 7000, beneficios: 1417.96 },
    ],
  },
  'Mariana Luz da Silva': {
    nome: 'Mariana Luz da Silva',
    fee: 15000,
    beneficios: 1231.40,
    membros: [
      { nome: 'Raissa Bonamigo Daros', cargo: 'Estagiária FP&A', fee: 1500, beneficios: 747 },
    ],
  },
  'Rafael Marchioretto': {
    nome: 'Rafael Marchioretto Bokorni',
    fee: 14000,
    beneficios: 1321.61,
    membros: [
      { nome: 'Roberta Costa Curta Lirio', cargo: 'Analista FP&A', fee: 7500, beneficios: 1084.85 },
    ],
  },

};

/* ── Targets from Structure tab ── */
const TARGETS = {
  clientesPerSquad: 15,
  ticketMedio: 7915,
  margemTarget: 54,
};

/* ── Tax rate used in P&L (alíquota de impostos sobre receita) ── */
const IMPOSTOS_RATE = 0.18;

/**
 * Margem operacional do squad — única fórmula usada em toda a tela.
 * Considera receita líquida (após 18% de impostos) menos custo do squad,
 * dividido pela receita bruta. Mesma fórmula do P&L do dialog.
 */
const computeMargem = (mrr: number, custoSquad: number): number => {
  if (mrr <= 0) return 0;
  const receitaLiquida = mrr * (1 - IMPOSTOS_RATE);
  return ((receitaLiquida - custoSquad) / mrr) * 100;
};

/* ── Helpers ── */
const formatCompact = (value: number) => {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(2)}M`;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
};

const formatBRL = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

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

/**
 * Cache em nível de módulo populado pelo hook `useSquadCostFromDre` dentro do
 * componente `CfoView`. Mescla por pessoa: quem foi reconhecido pelo DRE Oxy
 * (via CPF/CNPJ/alias) usa o valor real; quem ainda não foi mapeado mantém o
 * valor hardcoded de `CFO_SQUADS` abaixo.
 */
type SquadCostEntry = { fee: number; benef: number; total: number };
let SQUAD_REAL_BY_PERSON: Record<string, SquadCostEntry> = {};

function normalizePersonKey(s: string | null | undefined): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getSquad(cfoNome: string) {
  return CFO_SQUADS[cfoNome] ?? null;
}

/** Resolve fee+benef de uma pessoa: real do DRE se mapeada, senão hardcoded. */
function resolvePerson(nome: string, hardcodedFee: number, hardcodedBenef: number): SquadCostEntry {
  const real = SQUAD_REAL_BY_PERSON[normalizePersonKey(nome)];
  if (real) return real;
  return { fee: hardcodedFee, benef: hardcodedBenef, total: hardcodedFee + hardcodedBenef };
}

function getSquadParts(cfoNome: string): { fee: number; benef: number; total: number } {
  const sq = getSquad(cfoNome);
  if (!sq) return { fee: 0, benef: 0, total: 0 };
  let fee = 0;
  let benef = 0;
  const cfoP = resolvePerson(sq.nome, sq.fee, sq.beneficios);
  fee += cfoP.fee;
  benef += cfoP.benef;
  for (const m of sq.membros) {
    const mp = resolvePerson(m.nome, m.fee, m.beneficios);
    fee += mp.fee;
    benef += mp.benef;
  }
  return { fee, benef, total: fee + benef };
}

function getSquadCusto(cfoNome: string): number {
  return getSquadParts(cfoNome).total;
}

function getSquadBeneficios(cfoNome: string): number {
  return getSquadParts(cfoNome).benef;
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

    const atualImpostos = atualMrr * IMPOSTOS_RATE;
    const simImpostos = simMrr * IMPOSTOS_RATE;
    const atualReceitaLiquida = atualMrr - atualImpostos;
    const simReceitaLiquida = simMrr - simImpostos;

    const atualMargemBruta = atualReceitaLiquida - custoSquad;
    const simMargemBruta = simReceitaLiquida - custoSquad;

    const atualMargem = computeMargem(atualMrr, custoSquad);
    const simMargem = computeMargem(simMrr, custoSquad);

    const atualTicket = atualClientes > 0 ? atualMrr / atualClientes : 0;
    const simTicket = simClientes > 0 ? simMrr / simClientes : 0;

    return {
      rows: [
        { metrica: 'Clientes', atual: atualClientes, simulado: simClientes, impacto: simClientes - atualClientes, format: 'int' as const },
        { metrica: 'Receita (MRR)', atual: atualMrr, simulado: simMrr, impacto: simMrr - atualMrr, format: 'brl' as const },
        { metrica: 'Impostos (18%)', atual: -atualImpostos, simulado: -simImpostos, impacto: -(simImpostos - atualImpostos), format: 'brl' as const },
        { metrica: 'Receita Líquida', atual: atualReceitaLiquida, simulado: simReceitaLiquida, impacto: simReceitaLiquida - atualReceitaLiquida, format: 'brl' as const },
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
  /** Range de período (Q1-Q4 ou custom). Quando informado, métricas são
   *  recalculadas pra o snapshot de fim de período + eventos no range. */
  dateRange?: { from: Date; to: Date };
  /** Dossiê oficial de churn (mesma fonte da aba Churn). Quando informado,
   *  a contagem de Churns por CFO usa essa lista (com overrides oficiais)
   *  filtrada por dataEncerramento dentro do dateRange. */
  churnDossier?: Array<{
    id?: string;
    cliente: string;
    cfo: string;
    dataEncerramento: string;
    mrr?: number;
    setup?: number;
    ltMeses?: string | number;
    motivoPrincipal?: string;
    faseAtual?: string;
  }>;
}

type SortCol = "nome" | "clientes" | "mrrTotal" | "healthScoreMedio" | "taxaEntrega" | "clientesTratativa" | "mrrEmRisco" | "churns" | "custoSquad" | "margem" | "ticketMedio";

const INACTIVE_PHASES = ['Churn', 'Atividades finalizadas', 'Desistência', 'Arquivado'];
const CHURN_PHASES = ['Churn', 'Atividades finalizadas', 'Desistência'];

export function CfoView({ cfos: propCfos, clientes, dateRange, churnDossier }: CfoViewProps) {
  // ── Custo real por squad via DRE Oxy (CNPJ matching) ──
  // Usa o range do dashboard quando informado; senão último mês fechado.
  const squadCostRange = useMemo(() => {
    if (dateRange) return dateRange;
    const ref = subMonths(new Date(), 1);
    return { from: startOfMonth(ref), to: endOfMonth(ref) };
  }, [dateRange]);
  const squadCost = useSquadCostFromDre({ startDate: squadCostRange.from, endDate: squadCostRange.to });
  // Atualiza o cache de módulo para que os helpers `getSquadCusto/...` retornem
  // valores reais em todos os memos/sub-componentes deste arquivo. Usamos
  // useEffect (não useMemo) pra garantir a ordem correta, e bump de versão
  // pra forçar memos dependentes a recalcular quando os dados reais chegarem.
  const [squadRealVersion, setSquadRealVersion] = useState(0);
  useEffect(() => {
    SQUAD_REAL_BY_PERSON = { ...(squadCost.matchedByPessoaNome || {}) };
    setSquadRealVersion(v => v + 1);
  }, [squadCost.matchedByPessoaNome]);
  const matchedCount = Object.keys(squadCost.matchedByPessoaNome || {}).length;

  // Snapshot dos clientes considerando o período selecionado:
  // - Ativos no fim do período: dataAssinatura <= dateRange.to AND (não está em churn OU entrou no churn depois de dateRange.to)
  // - Churns ocorridos NO período: faseAtual em CHURN_PHASES AND dataEntrada (entrada na fase de churn) dentro do range
  // Quando dateRange não é informado, retorna tudo como hoje (compatibilidade).
  const clientesPeriodo = useMemo(() => {
    if (!dateRange) return clientes;
    const fromTs = dateRange.from.getTime();
    const toTs = dateRange.to.getTime();
    return clientes.filter(c => {
      if (CHURN_PHASES.includes(c.faseAtual)) {
        // Churn no período — usa a data oficial (Data encerramento / Data do churn).
        // Sem data oficial, o cliente é excluído (mesma regra do dossiê).
        if (!c.dataChurnOficial) return false;
        const t = c.dataChurnOficial.getTime();
        return t >= fromTs && t <= toTs;
      }
      // Cliente ainda ativo (não-churn): precisa ter assinado até o fim do período
      if (!c.dataAssinatura) return false;
      return c.dataAssinatura.getTime() <= toTs;
    });
  }, [clientes, dateRange]);

  // Re-aggregate métricas por CFO quando há filtro de período (caso contrário, usa as do prop)
  const cfos = useMemo<JornadaCfo[]>(() => {
    if (!dateRange) return propCfos;
    const groups = new Map<string, JornadaCliente[]>();
    for (const c of clientesPeriodo) {
      if (!c.cfo) continue;
      if (!groups.has(c.cfo)) groups.set(c.cfo, []);
      groups.get(c.cfo)!.push(c);
    }
    return Array.from(groups.entries()).map(([nome, lista]) => {
      const ativos = lista.filter(c => !INACTIVE_PHASES.includes(c.faseAtual));
      const mrrTotal = ativos.reduce((s, c) => s + c.mrr, 0);
      const emRisco = ativos.filter(c => c.tratativaAtiva);
      const mrrEmRisco = emRisco.reduce((s, c) => s + c.mrr, 0);
      const clientesChurn = lista.filter(c => CHURN_PHASES.includes(c.faseAtual)).length;
      const tarefasAtrasadas = ativos.reduce((s, c) => s + c.tarefasAtrasadas, 0);
      const totalTarefas = ativos.reduce((s, c) => s + c.tarefasAtivas, 0);
      const taxaEntrega = totalTarefas > 0 ? Math.round(((totalTarefas - tarefasAtrasadas) / totalTarefas) * 100) : 100;
      const npsScores = ativos.filter(c => c.ultimoNps !== null).map(c => c.ultimoNps as number);
      const npsMediaClientes = npsScores.length > 0 ? Math.round(npsScores.reduce((a, b) => a + b, 0) / npsScores.length) : null;
      const healthScoreMedio = ativos.length > 0 ? Math.round(ativos.reduce((s, c) => s + c.healthScore, 0) / ativos.length) : 0;
      return {
        nome,
        clientes: ativos.length,
        mrrTotal,
        mrrEmRisco,
        clientesAtivos: ativos.length,
        clientesSetup: ativos.filter(c => c.setupStatus === 'em_andamento' || c.setupStatus === 'atrasado').length,
        clientesTratativa: emRisco.length,
        clientesChurn,
        tarefasAtrasadas,
        taxaEntrega,
        npsMediaClientes,
        healthScoreMedio,
      } as JornadaCfo;
    });
  }, [propCfos, clientesPeriodo, dateRange]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  void squadRealVersion;
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

  // Carteira do CFO = todos os clientes ainda ativos (não-terminais).
  // Inclui clientes em tratativa (Triagem, Em Tratativa com CS, Plano de Ação, etc.),
  // pois o CFO continua atendendo esses clientes. Exclui apenas Churn / Arquivado / Desistência.
  //
  // Regra Mariana e Pedrolo: carteira filtrada por assinatura no MÊS PASSADO
  // (mês calendário anterior ao atual). Cliente "expira" da carteira virando o mês.
  const activeClientes = useMemo(() => {
    const now = new Date();
    const mesAnteriorStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const mesAnteriorEnd = new Date(now.getFullYear(), now.getMonth(), 1);
    const isMari = (cfo: string) => cfo.includes('Mariana');
    const isPedrolo = (cfo: string) => cfo.includes('Pedrolo');
    const inMesPassado = (dt: Date | null | undefined) =>
      !!dt && dt >= mesAnteriorStart && dt < mesAnteriorEnd;
    // Quando há dateRange ativo, usar clientesPeriodo (snapshot do fim do período);
    // caso contrário, lista crua de clientes (compatibilidade com comportamento anterior).
    const source = dateRange ? clientesPeriodo : clientes;
    return source.filter(c => {
      if (INACTIVE_PHASES.includes(c.faseAtual)) return false;
      if (isPedrolo(c.cfo)) return inMesPassado(c.dataAssinatura);
      if (isMari(c.cfo)) {
        // Assessoria Financeira: recorrente → fica na carteira todo mês
        if (c.temAssessoriaFinanceira) return true;
        // Diagnóstico / Turnaround / Valuation: só no mês da assinatura
        return inMesPassado(c.dataAssinatura);
      }
      return true;
    });
  }, [clientes, clientesPeriodo, dateRange]);


  // A1: Count churns per CFO
  // Fonte preferida: dossiê oficial (mesmos overrides da aba Churn), filtrado pelo dateRange.
  // Fallback: clientes + dataChurnOficial (comportamento anterior).
  const CHURN_PHASES_LOCAL = ['Churn', 'Atividades finalizadas', 'Desistência'];
  // Mapa de normalização de CFO (dossiê traz nomes "raw" do Pipefy).
  const CFO_NAME_NORMALIZE: Record<string, string> = {
    'Douglas Pinheiro Schossler': 'Douglas Schossler',
    'Gustavo Ferreira Cochlar': 'Gustavo Cochlar',
    'Luis Eduardo Dagostini': "Eduardo D'Agostini",
    'Rafael Marchioretto Bokorni': 'Rafael Marchioretto',
    'Adivilso Souza de Oliveira Junior': 'Oliveira',
  };
  const normalizeCfo = (raw: string) => {
    const t = (raw || '').trim();
    return CFO_NAME_NORMALIZE[t] || t;
  };
  const churnsPerCfo = useMemo(() => {
    const map: Record<string, number> = {};
    if (churnDossier && churnDossier.length > 0) {
      const fromTs = dateRange?.from.getTime();
      const toTs = dateRange?.to.getTime();
      for (const d of churnDossier) {
        if (fromTs !== undefined && toTs !== undefined) {
          const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d.dataEncerramento || '');
          if (!ymd) continue;
          const dt = new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3])).getTime();
          if (dt < fromTs || dt > toTs) continue;
        }
        const cfo = normalizeCfo(d.cfo) || 'Sem CFO';
        map[cfo] = (map[cfo] || 0) + 1;
      }
      return map;
    }
    // Fallback: lógica antiga baseada em clientes
    const source = dateRange ? clientesPeriodo : clientes;
    source
      .filter(c => CHURN_PHASES_LOCAL.includes(c.faseAtual) && !!c.dataChurnOficial)
      .forEach(c => {
        const cfo = c.cfo || 'Sem CFO';
        map[cfo] = (map[cfo] || 0) + 1;
      });
    return map;
  }, [churnDossier, clientes, clientesPeriodo, dateRange]);

  // Drawer de detalhe dos churns por CFO (lista de clientes do período)
  const [churnDrawerCfo, setChurnDrawerCfo] = useState<string | null>(null);

  const churnDrawerData = useMemo<KpiDrawerData | null>(() => {
    if (!churnDrawerCfo) return null;
    const fromTs = dateRange?.from.getTime();
    const toTs = dateRange?.to.getTime();
    const periodoLabel = dateRange
      ? `${dateRange.from.toLocaleDateString('pt-BR')} → ${dateRange.to.toLocaleDateString('pt-BR')}`
      : 'Todo o período';

    const rows = (churnDossier || [])
      .filter(d => {
        if (normalizeCfo(d.cfo) !== churnDrawerCfo) return false;
        if (fromTs === undefined || toTs === undefined) return true;
        const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d.dataEncerramento || '');
        if (!ymd) return false;
        const dt = new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3])).getTime();
        return dt >= fromTs && dt <= toTs;
      })
      .map(d => ({
        id: d.id,
        cliente: d.cliente,
        mrr: d.mrr,
        setup: d.setup,
        ltMeses: d.ltMeses,
        motivo: d.motivoPrincipal,
        dataEncerramento: d.dataEncerramento,
        faseAtual: d.faseAtual,
      }))
      .sort((a, b) => (b.dataEncerramento || '').localeCompare(a.dataEncerramento || ''));

    return {
      title: `Churns — ${churnDrawerCfo}`,
      subtitle: periodoLabel,
      formula: 'Mesma fonte da aba Churn (dossiê oficial com overrides). Filtrado por Data de encerramento dentro do período selecionado.',
      columns: ['cliente', 'data', 'mrr', 'setup', 'lt', 'motivo'],
      groups: [{
        title: `${rows.length} ${rows.length === 1 ? 'churn' : 'churns'} no período`,
        rows,
        emptyHint: 'Nenhum churn registrado neste CFO para o período.',
      }],
    };
  }, [churnDrawerCfo, churnDossier, dateRange]);

  const sortedCfos = useMemo(() => {
    return [...cfos].sort((a, b) => {
      // Colunas calculadas (não existem diretamente no JornadaCfo)
      if (sortCol === 'churns') {
        const av = churnsPerCfo[a.nome] || 0;
        const bv = churnsPerCfo[b.nome] || 0;
        return sortAsc ? av - bv : bv - av;
      }
      if (sortCol === 'custoSquad') {
        const av = getSquadCusto(a.nome);
        const bv = getSquadCusto(b.nome);
        return sortAsc ? av - bv : bv - av;
      }
      if (sortCol === 'margem') {
        const ca = getSquadCusto(a.nome);
        const cb = getSquadCusto(b.nome);
        const av = a.mrrTotal > 0 ? ((a.mrrTotal - ca) / a.mrrTotal) * 100 : 0;
        const bv = b.mrrTotal > 0 ? ((b.mrrTotal - cb) / b.mrrTotal) * 100 : 0;
        return sortAsc ? av - bv : bv - av;
      }
      if (sortCol === 'ticketMedio') {
        const av = a.clientes > 0 ? a.mrrTotal / a.clientes : 0;
        const bv = b.clientes > 0 ? b.mrrTotal / b.clientes : 0;
        return sortAsc ? av - bv : bv - av;
      }
      // Colunas diretas do JornadaCfo
      const av = a[sortCol as keyof JornadaCfo];
      const bv = b[sortCol as keyof JornadaCfo];
      if (typeof av === "string" && typeof bv === "string") return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortAsc ? ((av as number) ?? 0) - ((bv as number) ?? 0) : ((bv as number) ?? 0) - ((av as number) ?? 0);
    });
  }, [cfos, sortCol, sortAsc, churnsPerCfo]);

  // Sort state for dialog client table
  type ClientSortCol = 'cliente' | 'status' | 'produto' | 'fase' | 'feeMensal' | 'pontual' | 'health' | 'nps' | 'tratativa';
  const [clientSortCol, setClientSortCol] = useState<ClientSortCol>('feeMensal');
  const [clientSortAsc, setClientSortAsc] = useState(false);
  const STRING_COLS: ClientSortCol[] = ['cliente', 'produto', 'fase'];

  const toggleClientSort = (col: ClientSortCol) => {
    if (clientSortCol === col) setClientSortAsc(prev => !prev);
    else { setClientSortCol(col); setClientSortAsc(STRING_COLS.includes(col)); }
  };

  const dialogClientes = useMemo(() => {
    if (!selectedCfo) return [];
    const base = activeClientes.filter(c => c.cfo === selectedCfo);
    const statusOrder: Record<ClienteStatus, number> = { risco: 0, novo: 1, controlado: 2 };
    const dir = clientSortAsc ? 1 : -1;
    const cmpStr = (a: string, b: string) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' });
    return [...base].sort((a, b) => {
      switch (clientSortCol) {
        case 'cliente': return cmpStr(a.titulo || '', b.titulo || '') * dir;
        case 'status': return (statusOrder[deriveStatus(a)] - statusOrder[deriveStatus(b)]) * dir;
        case 'produto': return cmpStr(a.produtos[0] || '', b.produtos[0] || '') * dir;
        case 'fase': return cmpStr(a.faseAtual || '', b.faseAtual || '') * dir;
        case 'feeMensal': return (a.mrr - b.mrr) * dir;
        case 'pontual': return (a.pontual - b.pontual) * dir;
        case 'health': return (a.healthScore - b.healthScore) * dir;
        case 'nps': {
          // null sempre no fim
          const av = a.ultimoNps;
          const bv = b.ultimoNps;
          if (av === null && bv === null) return 0;
          if (av === null) return 1;
          if (bv === null) return -1;
          return (av - bv) * dir;
        }
        case 'tratativa': return ((a.tratativaAtiva ? 1 : 0) - (b.tratativaAtiva ? 1 : 0)) * dir;
        default: return 0;
      }
    });
  }, [activeClientes, selectedCfo, clientSortCol, clientSortAsc]);

  const selectedCfoData = cfos.find(c => c.nome === selectedCfo);

  /* Comparison table data for Feature 4 */
  const comparisonData = useMemo(() => {
    return cfos.map((cfo) => {
      const custoSquad = getSquadCusto(cfo.nome);
      const margem = computeMargem(cfo.mrrTotal, custoSquad);
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
      {/* Banner: origem do custo do squad */}
      <div className={`rounded border p-3 text-xs flex items-start gap-2 ${
        squadCost.totalUnmatched > 0
          ? "border-red-500/40 bg-red-500/5 text-red-700 dark:text-red-400"
          : "border-blue-500/40 bg-blue-500/5 text-blue-700 dark:text-blue-400"
      }`}>
        <Info className="h-4 w-4 mt-0.5 shrink-0" />
        <div className="flex-1">
          <strong>Custo do squad:</strong> vindo do DRE Oxy via CNPJ da Pessoas DB. Total CaaS no período: {formatBRL(squadCost.totalCaasDre)}.
          {squadCost.totalUnmatched > 0 && (
            <> Atenção: {formatBRL(squadCost.totalUnmatched)} em lançamentos sem vínculo — resolva em Admin → Squads CFOaaS.</>
          )}
          {squadCost.isLoading && <> (carregando...)</>}
        </div>
      </div>

      {/* Feature 4: Comparativo entre CFOs (P&L lado a lado) */}
      <div className="space-y-3">

        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Comparativo P&L por CFO
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help inline ml-1" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs">
              <p>Receita = MRR (CFOaaS + OXY). Squad Pedrolo = Setup + Oxy por cliente (mês passado) + produtos OXY/Gênio/Especialista do DRE. Custo = Fee CFO + Fee analistas. Margem = (Receita - Custo) / Receita × 100. Ticket = MRR / Clientes. Health Score = média ponderada NPS 30pts + Reuniões 30pts + Tratativa 20pts + Setup 20pts. Fonte: Pipefy + Squad data + Oxy Finance</p>
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
                      <button
                        type="button"
                        onClick={() => setChurnDrawerCfo(cfo.nome)}
                        className="inline-flex items-center gap-1 rounded hover:ring-2 hover:ring-destructive/40 focus:outline-none focus:ring-2 focus:ring-destructive/60 transition-shadow cursor-pointer"
                        title="Ver clientes que entraram em churn no período"
                      >
                        <Badge variant="destructive" className="text-[10px]">{cfo.churns}</Badge>
                        {rankBadge(rankings[cfo.nome]?.churns ?? 0)}
                      </button>
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
          const margem = computeMargem(cfo.mrrTotal, custoSquad);
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
                  <span>{cfo.nome}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    Health: {cfo.healthScoreMedio}
                  </span>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {cfo.clientes} clientes | {formatCompact(cfo.mrrTotal)} MRR
                </p>
                {(cfo.nome.includes('Pedrolo') || cfo.nome.includes('Mariana')) && (
                  <div className="mt-2 flex gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs">
                    <Info className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-semibold text-amber-900 dark:text-amber-200">Como ler este squad</p>
                      {cfo.nome.includes('Pedrolo') ? (
                        <p className="text-amber-900/90 dark:text-amber-100/90">
                          Squad <strong>OXY</strong> (Setup + SaaS) — receita <strong>pontual</strong>, não recorrente.
                          O valor fechado no <strong>mês anterior</strong> aparece como receita do <strong>mês atual</strong>.
                          Cliente fica na carteira apenas no mês seguinte à assinatura.
                        </p>
                      ) : (
                        <p className="text-amber-900/90 dark:text-amber-100/90">
                          Squad atende <strong>pontuais</strong> (Diagnóstico, Turnaround, Valuation) e <strong>Assessoria Financeira</strong> (recorrente).
                          Para os pontuais, o valor do <strong>mês anterior</strong> entra como receita do <strong>mês atual</strong>.
                          A Assessoria Financeira permanece na carteira todo mês.
                        </p>
                      )}
                    </div>
                  </div>
                )}
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
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setChurnDrawerCfo(cfo.nome); }}
                      className="rounded hover:ring-2 hover:ring-destructive/40 focus:outline-none focus:ring-2 focus:ring-destructive/60 transition-shadow cursor-pointer"
                      title="Ver clientes que entraram em churn no período"
                    >
                      <Badge variant="destructive" className="text-[10px]">
                        {cfoChurns} {cfoChurns === 1 ? 'churn' : 'churns'}
                      </Badge>
                    </button>
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
                  ["custoSquad", "Custo Squad"],
                  ["margem", "Margem %"],
                  ["ticketMedio", "Ticket"],
                ] as [SortCol, string][]).map(([col, label]) => (
                  <TableHead key={col}>
                    <Button variant="ghost" size="sm" className="gap-1 -ml-3" onClick={() => handleSort(col)}>
                      {label}
                      <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedCfos.map((cfo) => {
                const custoSquad = getSquadCusto(cfo.nome);
                const margem = computeMargem(cfo.mrrTotal, custoSquad);
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
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setChurnDrawerCfo(cfo.nome); }}
                          className="rounded hover:ring-2 hover:ring-destructive/40 focus:outline-none focus:ring-2 focus:ring-destructive/60 transition-shadow cursor-pointer"
                          title="Ver clientes que entraram em churn no período"
                        >
                          <Badge variant="destructive" className="text-[10px]">{churnsPerCfo[cfo.nome]}</Badge>
                        </button>
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
                {squad && (() => {
                  const totalFees = squad.fee + squad.membros.reduce((s, m) => s + (m.fee || 0), 0);
                  const totalBeneficios = squad.beneficios + squad.membros.reduce((s, m) => s + (m.beneficios || 0), 0);
                  return (
                    <Card className="border-dashed">
                      <CardContent className="pt-4 pb-3 space-y-2">
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <Users className="h-4 w-4" />
                          Composição do Squad
                          <span className="text-xs font-normal text-muted-foreground ml-auto">Fees + Benefícios (deslocamento + alimentação + Raiô)</span>
                        </div>
                        <div className="space-y-1.5 text-xs">
                          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center border rounded-md px-3 py-2">
                            <div>
                              <p className="font-medium">{squad.nome}</p>
                              <p className="text-muted-foreground">CFO</p>
                            </div>
                            <span className="text-right tabular-nums">Fee: <span className="font-medium">{formatBRL(squad.fee)}</span></span>
                            <span className="text-right tabular-nums text-muted-foreground">Benef.: <span className="font-medium">{squad.beneficios > 0 ? formatBRL(squad.beneficios) : '—'}</span></span>
                            <span className="text-right tabular-nums font-semibold w-24">{formatBRL(squad.fee + squad.beneficios)}</span>
                          </div>
                          {squad.membros.map((m) => (
                            <div key={m.nome} className="grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center border rounded-md px-3 py-2">
                              <div>
                                <p className="font-medium">{m.nome}</p>
                                <p className="text-muted-foreground">{m.cargo}</p>
                              </div>
                              <span className="text-right tabular-nums">Fee: <span className="font-medium">{m.fee > 0 ? formatBRL(m.fee) : '—'}</span></span>
                              <span className="text-right tabular-nums text-muted-foreground">Benef.: <span className="font-medium">{m.beneficios > 0 ? formatBRL(m.beneficios) : '—'}</span></span>
                              <span className="text-right tabular-nums font-semibold w-24">{formatBRL((m.fee || 0) + (m.beneficios || 0))}</span>
                            </div>
                          ))}
                        </div>
                        <Separator className="my-1" />
                        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center text-sm font-semibold pt-1">
                          <span>Totais</span>
                          <span className="text-right tabular-nums">{formatBRL(totalFees)}</span>
                          <span className="text-right tabular-nums">{formatBRL(totalBeneficios)}</span>
                          <span className="text-right tabular-nums w-24">{formatBRL(custoSquad)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })()}

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
                        <span className="pl-3">(-) Fees (remuneração)</span>
                        <span>- {formatBRL(custoSquad - getSquadBeneficios(selectedCfo))}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span className="pl-3">(-) Benefícios (desloc. + alim. + Raiô)</span>
                        <span>- {formatBRL(getSquadBeneficios(selectedCfo))}</span>
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
                  {([
                    ['cliente', 'Cliente', 'left'],
                    ['status', 'Status', 'left'],
                    ['produto', 'Produto', 'left'],
                    ['fase', 'Fase', 'left'],
                    ['feeMensal', 'Fee Mensal', 'right'],
                    ['pontual', 'Pontual', 'right'],
                    ['health', 'Health', 'right'],
                    ['nps', 'NPS', 'right'],
                    ['tratativa', 'Tratativa', 'left'],
                  ] as [ClientSortCol, string, 'left' | 'right'][]).map(([col, label, align]) => {
                    const active = clientSortCol === col;
                    const Icon = active ? (clientSortAsc ? ChevronUp : ChevronDown) : ArrowUpDown;
                    return (
                      <TableHead key={col} className={align === 'right' ? 'text-right' : ''}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`gap-1 h-7 px-2 ${align === 'right' ? '-mr-2' : '-ml-2'} ${active ? 'text-primary font-semibold' : ''}`}
                          onClick={() => toggleClientSort(col)}
                        >
                          {align === 'right' && <Icon className="h-3 w-3" />}
                          {label}
                          {align === 'left' && <Icon className="h-3 w-3" />}
                        </Button>
                      </TableHead>
                    );
                  })}
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
                      {/* Fee Mensal: apenas MRR recorrente */}
                      <TableCell className="text-right">
                        {c.mrr > 0 ? formatBRL(c.mrr) : "—"}
                      </TableCell>
                      {/* Pontual: apenas valores pontuais */}
                      <TableCell className="text-right text-purple-600">
                        {c.pontual > 0 ? formatBRL(c.pontual) : "—"}
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

      {/* Drawer de detalhe dos Churns por CFO */}
      <ChurnKpiDrawer data={churnDrawerData} onClose={() => setChurnDrawerCfo(null)} />
    </div>
    </TooltipProvider>
  );
}
