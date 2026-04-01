import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, Legend, Line, BarChart, Bar, Tooltip } from "recharts";
import { Building2, DollarSign, Rocket, Users, TrendingUp, Target, Megaphone, BarChart3, Info, Settings, Filter, Lock, Pencil, ChevronDown, ChevronUp, CheckCircle2, XCircle, AlertCircle, Save, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { SalesFunnelVisual } from "./SalesFunnelVisual";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMediaMetas } from "@/contexts/MediaMetasContext";
import { useMonetaryMetas, BuType, isPontualOnlyBU } from "@/hooks/useMonetaryMetas";
import { useIndicatorsRealized, FunnelRealized } from "@/hooks/useIndicatorsRealized";
import { Progress } from "@/components/ui/progress";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import { useAuth } from "@/hooks/useAuth";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { MetaRedistributionPanel } from "./MetaRedistributionPanel";
import { ArrowRightLeft } from "lucide-react";
import { useBUIndicatorsConfig } from "@/hooks/useBUIndicatorsConfig";

// Indicadores de 2025 (base para projeção)
const indicators2025 = {
  cpmql: 472.72,
  cprr: 1347.48,
  cac: 9537.17,
  cpv: 6517.05,
  lt: 7, // lifetime em meses
  revenueChurn: 418959.46,
  revenueChurnRate: 0.19,
  logoChurn: 42,
  logoChurnRate: 0.37,
  ltvCac: 3.99,
  roi: 2.31,
  novoMrr: 883928.03,
  tcv: 13218976.08,
};

const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

// Calculate smooth monthly distribution
function calculateMonthlyValuesSmooth(
  quarterlyData: { Q1: number; Q2: number; Q3: number; Q4: number },
  initialValue: number
) {
  const monthlyValues: Record<string, number> = {};
  const weights = {
    Jan: 1.00, Fev: 1.02, Mar: 1.08,
    Abr: 1.14, Mai: 1.20, Jun: 1.28,
    Jul: 1.38, Ago: 1.50, Set: 1.65,
    Out: 1.82, Nov: 2.00, Dez: 1.60,
  };
  
  const rawValues: Record<string, number> = {};
  months.forEach(month => {
    rawValues[month] = initialValue * weights[month as keyof typeof weights];
  });
  
  const scaleQuarter = (quarterMonths: string[], quarterTotal: number) => {
    const rawQuarterSum = quarterMonths.reduce((sum, m) => sum + rawValues[m], 0);
    const scale = quarterTotal / rawQuarterSum;
    quarterMonths.forEach(m => {
      monthlyValues[m] = rawValues[m] * scale;
    });
  };
  
  scaleQuarter(["Jan", "Fev", "Mar"], quarterlyData.Q1);
  scaleQuarter(["Abr", "Mai", "Jun"], quarterlyData.Q2);
  scaleQuarter(["Jul", "Ago", "Set"], quarterlyData.Q3);
  scaleQuarter(["Out", "Nov", "Dez"], quarterlyData.Q4);
  
  return monthlyValues;
}

// Unit-based calculation for Oxy Hacker and Franquia
const oxyHackerUnits: Record<string, number> = {
  Jan: 1, Fev: 2, Mar: 2,
  Abr: 5, Mai: 5, Jun: 5,
  Jul: 10, Ago: 10, Set: 10,
  Out: 15, Nov: 18, Dez: 17,
};
const franquiaUnits: Record<string, number> = {
  Jan: 0, Fev: 1, Mar: 1,
  Abr: 1, Mai: 1, Jun: 1,
  Jul: 2, Ago: 2, Set: 2,
  Out: 3, Nov: 3, Dez: 3,
};

function calculateFromUnits(units: Record<string, number>, ticketValue: number): Record<string, number> {
  const result: Record<string, number> = {};
  months.forEach(month => {
    result[month] = units[month] * ticketValue;
  });
  return result;
}

// Distribui metas trimestrais em mensais proporcionalmente
function distributeQuarterlyToMonthly(
  quarterlyData: { Q1: number; Q2: number; Q3: number; Q4: number }
): Record<string, number> {
  const monthlyMetas: Record<string, number> = {};
  
  // Pesos relativos dentro de cada trimestre (crescimento proporcional)
  const quarterWeights = {
    Q1: { Jan: 0.30, Fev: 0.33, Mar: 0.37 }, // Crescimento dentro do Q1
    Q2: { Abr: 0.30, Mai: 0.33, Jun: 0.37 },
    Q3: { Jul: 0.30, Ago: 0.33, Set: 0.37 },
    Q4: { Out: 0.33, Nov: 0.37, Dez: 0.30 }, // Dez um pouco menor por sazonalidade
  };
  
  monthlyMetas["Jan"] = quarterlyData.Q1 * quarterWeights.Q1.Jan;
  monthlyMetas["Fev"] = quarterlyData.Q1 * quarterWeights.Q1.Fev;
  monthlyMetas["Mar"] = quarterlyData.Q1 * quarterWeights.Q1.Mar;
  
  monthlyMetas["Abr"] = quarterlyData.Q2 * quarterWeights.Q2.Abr;
  monthlyMetas["Mai"] = quarterlyData.Q2 * quarterWeights.Q2.Mai;
  monthlyMetas["Jun"] = quarterlyData.Q2 * quarterWeights.Q2.Jun;
  
  monthlyMetas["Jul"] = quarterlyData.Q3 * quarterWeights.Q3.Jul;
  monthlyMetas["Ago"] = quarterlyData.Q3 * quarterWeights.Q3.Ago;
  monthlyMetas["Set"] = quarterlyData.Q3 * quarterWeights.Q3.Set;
  
  monthlyMetas["Out"] = quarterlyData.Q4 * quarterWeights.Q4.Out;
  monthlyMetas["Nov"] = quarterlyData.Q4 * quarterWeights.Q4.Nov;
  monthlyMetas["Dez"] = quarterlyData.Q4 * quarterWeights.Q4.Dez;
  
  return monthlyMetas;
}

// Calcula MRR dinâmico e "A Vender" a partir das METAS FIXAS
// valorVenderInicial: valor fixo para janeiro, o MRR base é calculado para bater
function calculateMrrAndRevenueToSell(
  mrrInicial: number, 
  churnRate: number, 
  retencaoRate: number,
  metasMensais: Record<string, number>,
  ticketMedio: number,
  valorVenderInicial: number = 0 // Se > 0, fixa janeiro neste valor
): { mrrPorMes: Record<string, number>; vendasPorMes: Record<string, number>; revenueToSell: Record<string, number> } {
  const mrrPorMes: Record<string, number> = {};
  const vendasPorMes: Record<string, number> = {};
  const revenueToSell: Record<string, number> = {};
  
  // Se valorVenderInicial > 0, calcular o MRR base de janeiro a partir dele
  let mrrAtual = valorVenderInicial > 0 
    ? metasMensais["Jan"] - valorVenderInicial 
    : mrrInicial;
  
  let aVenderAnterior = 0;
  
  months.forEach((month, index) => {
    if (index > 0) {
      // Aplica churn sobre o MRR base
      mrrAtual = mrrAtual * (1 - churnRate);
    }
    
    // Adiciona retenção baseada no valor financeiro real de A Vender (sem arredondamento)
    const retencaoDoMesAnterior = aVenderAnterior * retencaoRate;
    mrrAtual = mrrAtual + retencaoDoMesAnterior;
    
    mrrPorMes[month] = mrrAtual;
    
    const metaDoMes = metasMensais[month];
    const aVender = Math.max(0, metaDoMes - mrrAtual);
    revenueToSell[month] = aVender;
    
    const vendasDoMes = Math.round(aVender / ticketMedio);
    vendasPorMes[month] = vendasDoMes;
    aVenderAnterior = aVender;
  });
  
  return { mrrPorMes, vendasPorMes, revenueToSell };
}

// Reverse funnel calculation
interface FunnelData {
  month: string;
  faturamentoMeta: number;
  faturamentoVender: number;
  mrrBase: number;
  vendas: number;
  propostas: number;
  rrs: number;
  rms: number;
  mqls: number;
  leads: number;
  investimento: number;
}

interface FunnelMetrics {
  name: string;
  ticketMedio: number;
  leadToMql: number;
  mqlToRm: number;
  rmToRr: number;
  rrToProp: number;
  propToVenda: number;
  cpmql: number;
  cprr: number;
  cac: number;
  cpv?: number;
  color: string;
  icon: React.ReactNode;
}

function calculateReverseFunnel(
  netRevenueToSell: Record<string, number>,
  metrics: FunnelMetrics,
  mrrComChurn: Record<string, number> | null = null,
  useCpv: boolean = false,
  metasMensais: Record<string, number> | null = null,
  cpvValue: number = indicators2025.cpv,
  investimentoInicialJan: number = 0
): FunnelData[] {
  let investimentoAnterior = 0;
  
  // Primeiro, calcula todos os dados originais (incluindo investimentos)
  const dadosOriginais = months.map(month => {
    const faturamentoVender = netRevenueToSell[month];
    const mrrBaseAtual = mrrComChurn ? mrrComChurn[month] : 0;
    const faturamentoMeta = mrrComChurn 
      ? (mrrBaseAtual + faturamentoVender) 
      : (metasMensais ? metasMensais[month] : faturamentoVender);
    
    const vendas = faturamentoVender / metrics.ticketMedio;
    const propostas = vendas / metrics.propToVenda;
    const rrs = propostas / metrics.rrToProp;
    const rms = rrs / metrics.rmToRr;
    const mqls = rms / metrics.mqlToRm;
    const leads = mqls / metrics.leadToMql;
    
    // Calcula investimento baseado na fórmula original
    const investimentoCalculado = useCpv ? vendas * cpvValue : vendas * metrics.cac;
    
    // Garante que o investimento nunca diminua (sempre crescente ou estável)
    const investimento = Math.max(investimentoCalculado, investimentoAnterior);
    investimentoAnterior = investimento;
    
    return {
      month,
      faturamentoMeta,
      faturamentoVender,
      mrrBase: mrrBaseAtual,
      vendas: Math.ceil(vendas),
      propostas: Math.ceil(propostas),
      rrs: Math.ceil(rrs),
      rms: Math.ceil(rms),
      mqls: Math.ceil(mqls),
      leads: Math.ceil(leads),
      investimento: Math.round(investimento),
    };
  });
  
  // Desloca os investimentos em 1 mês:
  // Jan recebe o investimento de Fev, Fev recebe o de Mar, etc.
  // Isso reflete que o investimento de um mês gera resultado no mês seguinte
  return dadosOriginais.map((dados, index) => {
    // Se é janeiro e tem investimento inicial definido, recalcula vendas baseado no investimento e CPV
    if (index === 0 && investimentoInicialJan > 0) {
      const vendasIniciais = Math.ceil(investimentoInicialJan / cpvValue);
      const propostas = Math.ceil(vendasIniciais / metrics.propToVenda);
      const rrs = Math.ceil(propostas / metrics.rrToProp);
      const rms = Math.ceil(rrs / metrics.rmToRr);
      const mqls = Math.ceil(rms / metrics.mqlToRm);
      const leads = Math.ceil(mqls / metrics.leadToMql);
      
      return { 
        ...dados, 
        investimento: investimentoInicialJan,
        vendas: vendasIniciais,
        propostas,
        rrs,
        rms,
        mqls,
        leads,
      };
    }
    
    // Pega o investimento do próximo mês, ou mantém o próprio se for dezembro
    const investimentoDeslocado = index < months.length - 1 
      ? dadosOriginais[index + 1].investimento 
      : dados.investimento;
    
    return {
      ...dados,
      investimento: investimentoDeslocado,
    };
  });
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatCompact = (value: number) => {
  if (value >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(0)}k`;
  }
  return formatCurrency(value);
};

const formatNumber = (value: number) => {
  return new Intl.NumberFormat("pt-BR").format(value);
};

const chartConfig = {
  modeloAtual: { label: "Modelo Atual", color: "hsl(var(--primary))" },
  o2Tax: { label: "O2 TAX", color: "hsl(var(--warning))" },
  oxyHacker: { label: "Oxy Hacker", color: "hsl(var(--accent))" },
  franquia: { label: "Franquia", color: "hsl(var(--secondary))" },
};

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--warning))",
  "hsl(var(--accent))",
  "hsl(var(--secondary))",
];

// Interface para indicadores por BU
interface BUIndicators {
  ticketMedio: number;
  cpmql: number;
  cpv: number;
  mqlToRm: number;
  rmToRr: number;
  rrToProp: number;
  propToVenda: number;
}

// Get current month index (0-based, Feb 2026 = 1)
function getCurrentMonthIndex(): number {
  const now = new Date();
  // If we're in 2026, use actual month (0-indexed)
  if (now.getFullYear() === 2026) {
    return now.getMonth(); // 0 = Jan, 1 = Feb, etc.
  }
  // If before 2026, all months are editable (return -1)
  if (now.getFullYear() < 2026) return -1;
  // If after 2026, all months are locked
  return 12;
}

interface BUInvestmentTableProps {
  title: string;
  icon: React.ReactNode;
  funnelData: FunnelData[];
  color: string;
  metrics: FunnelMetrics;
  showMrrBase?: boolean;
  mrrBase?: number;
  churnMensal?: number;
  retencaoVendas?: number;
  mrrFinal?: number;
  buKey?: string;
  onAVenderChange?: (month: string, newValue: number) => void;
  editable?: boolean;
  realizedByMonth?: Record<string, number>;
  realizedFunnelByMonth?: Record<string, FunnelRealized>;
  dreByMonth?: Record<string, number>;
  isLoadingRealized?: boolean;
  pendingMonths?: Set<string>;
}

function BUInvestmentTable({
  title,
  icon,
  funnelData,
  color,
  metrics,
  showMrrBase = false,
  mrrBase = 0,
  churnMensal = 0.06,
  retencaoVendas = 0.25,
  mrrFinal = 0,
  buKey,
  onAVenderChange,
  editable = false,
  realizedByMonth = {},
  realizedFunnelByMonth = {},
  dreByMonth = {},
  isLoadingRealized = false,
  pendingMonths = new Set()
}: BUInvestmentTableProps) {
  const [editingMonth, setEditingMonth] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const currentMonthIndex = getCurrentMonthIndex();

  const toggleMonth = (month: string) => {
    setExpandedMonths(prev => {
      const next = new Set(prev);
      if (next.has(month)) next.delete(month);
      else next.add(month);
      return next;
    });
  };

  const isMonthEditable = (monthIndex: number) => {
    if (!editable || !onAVenderChange) return false;
    return monthIndex >= currentMonthIndex;
  };

  const handleStartEdit = (month: string, currentValue: number) => {
    setEditingMonth(month);
    setEditValue(String(Math.round(currentValue)));
  };

  const handleConfirmEdit = (month: string) => {
    const newValue = parseFloat(editValue) || 0;
    if (onAVenderChange && newValue >= 0) {
      onAVenderChange(month, newValue);
    }
    setEditingMonth(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, month: string) => {
    if (e.key === 'Enter') {
      handleConfirmEdit(month);
    } else if (e.key === 'Escape') {
      setEditingMonth(null);
    }
  };
  const totalInvestimento = funnelData.reduce((sum, d) => sum + d.investimento, 0);
  const totalFaturamentoMeta = funnelData.reduce((sum, d) => sum + d.faturamentoMeta, 0);
  const totalFaturamentoVender = funnelData.reduce((sum, d) => sum + d.faturamentoVender, 0);
  const roi = totalFaturamentoVender / totalInvestimento;
  const totalLeads = funnelData.reduce((sum, d) => sum + d.leads, 0);
  const totalVendas = funnelData.reduce((sum, d) => sum + d.vendas, 0);
  const totalMqls = funnelData.reduce((sum, d) => sum + d.mqls, 0);

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            {icon}
            <CardTitle className="font-display">{title}</CardTitle>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs">
              Ticket: {formatCurrency(metrics.ticketMedio)}
            </Badge>
            <Badge variant="outline" className="text-xs">
              CPMQL: {formatCurrency(metrics.cpmql)}
            </Badge>
            {showMrrBase ? (
              <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                CPV: {formatCurrency(metrics.cpv || indicators2025.cpv)}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs">
                CAC: {formatCurrency(metrics.cac)}
              </Badge>
            )}
            {showMrrBase && (
              <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/30">
                Churn: {(churnMensal * 100).toFixed(0)}%/mês
              </Badge>
            )}
            {showMrrBase && (
              <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/30">
                Retenção: {(retencaoVendas * 100).toFixed(0)}%
              </Badge>
            )}
          </div>
        </div>
        {showMrrBase && (
          <div className="mt-2 flex flex-col gap-2 text-sm text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              <span>MRR Base Inicial: {formatCurrency(mrrBase)} — Churn {(churnMensal * 100).toFixed(0)}%/mês + Retenção {(retencaoVendas * 100).toFixed(0)}% das vendas</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-destructive">Churn: -{(churnMensal * 100).toFixed(0)}%/mês sobre MRR</span>
              <span>•</span>
              <span className="text-blue-600">Retenção: +{(retencaoVendas * 100).toFixed(0)}% das vendas anteriores</span>
              <span>•</span>
              <span>MRR Final (Dez): {formatCurrency(mrrFinal)}</span>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">Investimento Total</p>
            <p className="text-xl font-display font-bold text-primary">{formatCompact(totalInvestimento)}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">ROI Projetado</p>
            <p className="text-xl font-display font-bold text-emerald-600">{roi.toFixed(1)}x</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">% do A Vender</p>
            <p className="text-xl font-display font-bold text-amber-600">
              {totalFaturamentoVender > 0 ? ((totalInvestimento / totalFaturamentoVender) * 100).toFixed(1) : 0}%
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">% da Meta</p>
            <p className="text-xl font-display font-bold text-blue-600">
              {totalFaturamentoMeta > 0 ? ((totalInvestimento / totalFaturamentoMeta) * 100).toFixed(1) : 0}%
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">CPV</p>
            <p className="text-xl font-display font-bold text-emerald-600">{formatCurrency(metrics.cpv || metrics.cac)}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">Vendas Previstas</p>
            <p className="text-xl font-display font-bold">{formatNumber(totalVendas)}</p>
          </div>
        </div>

        {/* Monthly Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead className="w-14">Mês</TableHead>
                <TableHead className="text-right min-w-[130px]">Meta</TableHead>
                {showMrrBase && <TableHead className="text-right min-w-[130px]">MRR Base</TableHead>}
                {showMrrBase && <TableHead className="text-right min-w-[130px]">A Vender</TableHead>}
                <TableHead className="text-right">Vendas</TableHead>
                <TableHead className="text-right">Propostas</TableHead>
                <TableHead className="text-right">RRs</TableHead>
                <TableHead className="text-right">RMs</TableHead>
                <TableHead className="text-right">MQLs</TableHead>
                <TableHead className="text-right">Leads</TableHead>
                <TableHead className="text-right min-w-[120px]">Investimento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {funnelData.map((data, index) => {
                const isQuarterEnd = [2, 5, 8, 11].includes(index);
                const isExpanded = expandedMonths.has(data.month);
                const realized = realizedByMonth[data.month] || 0;
                const aVender = data.faturamentoVender;
                const pctAtingimento = aVender > 0 ? (realized / aVender) * 100 : 0;
                const gap = aVender - realized;
                const dreTotal = dreByMonth[data.month] || 0;
                const metaTotal = data.faturamentoMeta;
                const pctTotal = metaTotal > 0 ? (dreTotal / metaTotal) * 100 : 0;
                const gapTotal = metaTotal - dreTotal;
                const colCount = 10 + (showMrrBase ? 2 : 0);
                const funnelReal = realizedFunnelByMonth[data.month];
                
                return (
                  <>
                    <TableRow key={data.month} className={`${isQuarterEnd ? "border-b-2 border-border" : ""} ${isExpanded ? "bg-muted/20" : ""} ${pendingMonths.has(data.month) ? "bg-amber-500/5" : ""}`}>
                      <TableCell className="p-1 w-8">
                        <button
                          onClick={() => toggleMonth(data.month)}
                          className="p-1 hover:bg-muted rounded transition-colors"
                          title={isExpanded ? "Ocultar realizado" : "Ver realizado"}
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="w-12 justify-center">{data.month}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {!showMrrBase && editable && isMonthEditable(index) ? (
                          editingMonth === data.month ? (
                            <Input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => handleConfirmEdit(data.month)}
                              onKeyDown={(e) => handleKeyDown(e, data.month)}
                              className="w-32 text-right font-mono h-8 ml-auto"
                              autoFocus
                            />
                          ) : (
                            <button
                              onClick={() => handleStartEdit(data.month, data.faturamentoMeta)}
                              className="inline-flex items-center gap-1 hover:bg-muted/50 rounded px-2 py-1 transition-colors cursor-pointer"
                              title="Clique para editar"
                            >
                              {formatCurrency(data.faturamentoMeta)}
                              <Pencil className="h-3 w-3 opacity-50" />
                            </button>
                          )
                        ) : !showMrrBase && editable && !isMonthEditable(index) ? (
                          <span className="text-muted-foreground/60">
                            <Lock className="h-3 w-3 inline mr-1 opacity-40" />
                            {formatCurrency(data.faturamentoMeta)}
                          </span>
                        ) : (
                          formatCurrency(data.faturamentoMeta)
                        )}
                      </TableCell>
                      {showMrrBase && (
                        <TableCell className="text-right text-muted-foreground">{formatCurrency(data.mrrBase)}</TableCell>
                      )}
                      {showMrrBase && (
                        <TableCell className="text-right">
                          {editable && isMonthEditable(index) ? (
                            editingMonth === data.month ? (
                              <Input
                                type="number"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => handleConfirmEdit(data.month)}
                                onKeyDown={(e) => handleKeyDown(e, data.month)}
                                className="w-32 text-right font-mono h-8 ml-auto"
                                autoFocus
                              />
                            ) : (
                              <button
                                onClick={() => handleStartEdit(data.month, data.faturamentoVender)}
                                className="inline-flex items-center gap-1 text-amber-600 font-medium hover:bg-amber-500/10 rounded px-2 py-1 transition-colors cursor-pointer"
                                title="Clique para editar"
                              >
                                {formatCurrency(data.faturamentoVender)}
                                <Pencil className="h-3 w-3 opacity-50" />
                              </button>
                            )
                          ) : (
                            <span className={`font-medium ${editable && !isMonthEditable(index) ? 'text-muted-foreground/60' : 'text-amber-600'}`}>
                              {editable && !isMonthEditable(index) && <Lock className="h-3 w-3 inline mr-1 opacity-40" />}
                              {formatCurrency(data.faturamentoVender)}
                            </span>
                          )}
                        </TableCell>
                      )}
                      <TableCell className="text-right">{data.vendas}</TableCell>
                      <TableCell className="text-right">{data.propostas}</TableCell>
                      <TableCell className="text-right">{data.rrs}</TableCell>
                      <TableCell className="text-right">{data.rms}</TableCell>
                      <TableCell className="text-right">{data.mqls}</TableCell>
                      <TableCell className="text-right">{formatNumber(data.leads)}</TableCell>
                      <TableCell className="text-right font-semibold text-primary">{formatCurrency(data.investimento)}</TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow key={`${data.month}-realized`} className="bg-muted/30 border-b-0">
                        <TableCell colSpan={colCount} className="py-3 px-6">
                          <div className="space-y-4">
                            {/* Incremento (A Vender) */}
                            <div className="flex items-center gap-6 flex-wrap">
                              <div className="flex items-center gap-2">
                                {pctAtingimento >= 80 ? (
                                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                ) : pctAtingimento >= 50 ? (
                                  <AlertCircle className="h-5 w-5 text-amber-500" />
                                ) : (
                                  <XCircle className="h-5 w-5 text-destructive" />
                                )}
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">A Vender (Meta)</p>
                                <p className="font-semibold">{formatCurrency(aVender)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Realizado</p>
                                <p className="font-semibold text-emerald-600">{formatCurrency(realized)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Atingimento</p>
                                <Badge variant={pctAtingimento >= 80 ? "default" : pctAtingimento >= 50 ? "secondary" : "destructive"} className="text-xs">
                                  {pctAtingimento.toFixed(1)}%
                                </Badge>
                              </div>
                              <div className="flex-1 min-w-[120px] max-w-[200px]">
                                <p className="text-xs text-muted-foreground mb-1">Progresso</p>
                                <Progress value={Math.min(pctAtingimento, 100)} className="h-2" />
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Gap</p>
                                <p className={`font-semibold ${gap > 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                                  {gap > 0 ? `-${formatCurrency(gap)}` : `+${formatCurrency(Math.abs(gap))}`}
                                </p>
                              </div>
                            </div>

                            {/* Faturamento Total (DRE) */}
                            {dreTotal > 0 && (
                              <div className="flex items-center gap-6 flex-wrap border-t border-border/50 pt-3">
                                <div className="flex items-center gap-2">
                                  {pctTotal >= 80 ? (
                                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                  ) : pctTotal >= 50 ? (
                                    <AlertCircle className="h-5 w-5 text-amber-500" />
                                  ) : (
                                    <XCircle className="h-5 w-5 text-destructive" />
                                  )}
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Meta Total (MRR + Incremento)</p>
                                  <p className="font-semibold">{formatCurrency(metaTotal)}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Realizado Total (DRE)</p>
                                  <p className="font-semibold text-blue-600">{formatCurrency(dreTotal)}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Atingimento Total</p>
                                  <Badge variant={pctTotal >= 80 ? "default" : pctTotal >= 50 ? "secondary" : "destructive"} className="text-xs">
                                    {pctTotal.toFixed(1)}%
                                  </Badge>
                                </div>
                                <div className="flex-1 min-w-[120px] max-w-[200px]">
                                  <p className="text-xs text-muted-foreground mb-1">Progresso Total</p>
                                  <Progress value={Math.min(pctTotal, 100)} className="h-2" />
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Gap Total</p>
                                  <p className={`font-semibold ${gapTotal > 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                                    {gapTotal > 0 ? `-${formatCurrency(gapTotal)}` : `+${formatCurrency(Math.abs(gapTotal))}`}
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Funil Realizado */}
                            {funnelReal && (
                              <div className="border-t border-border/50 pt-3">
                                <p className="text-xs font-medium text-muted-foreground mb-2">Funil Realizado</p>
                                <div className="grid grid-cols-6 gap-3">
                                  {([
                                    { label: 'Vendas', metaVal: data.vendas, realVal: funnelReal.vendas },
                                    { label: 'Propostas', metaVal: data.propostas, realVal: funnelReal.propostas },
                                    { label: 'RRs', metaVal: data.rrs, realVal: funnelReal.rrs },
                                    { label: 'RMs', metaVal: data.rms, realVal: funnelReal.rms },
                                    { label: 'MQLs', metaVal: data.mqls, realVal: funnelReal.mqls },
                                    { label: 'Leads', metaVal: data.leads, realVal: funnelReal.leads },
                                  ]).map(({ label, metaVal, realVal }) => {
                                    const pct = metaVal > 0 ? (realVal / metaVal) * 100 : 0;
                                    const colorClass = pct >= 80 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-destructive';
                                    return (
                                      <div key={label} className="text-center bg-background/50 rounded-lg p-2">
                                        <p className="text-xs text-muted-foreground font-medium">{label}</p>
                                        <p className="text-xs text-muted-foreground">Meta: {metaVal}</p>
                                        <p className={`text-sm font-bold ${colorClass}`}>{realVal}</p>
                                        <p className={`text-xs ${colorClass}`}>{pct.toFixed(0)}%</p>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
              <TableRow className="bg-muted/50 font-bold">
                <TableCell></TableCell>
                <TableCell>Total</TableCell>
                <TableCell className="text-right">{formatCurrency(totalFaturamentoMeta)}</TableCell>
                {showMrrBase && <TableCell className="text-right text-muted-foreground">—</TableCell>}
                {showMrrBase && <TableCell className="text-right text-amber-600">{formatCurrency(totalFaturamentoVender)}</TableCell>}
                <TableCell className="text-right">{totalVendas}</TableCell>
                <TableCell className="text-right">{funnelData.reduce((s, d) => s + d.propostas, 0)}</TableCell>
                <TableCell className="text-right">{funnelData.reduce((s, d) => s + d.rrs, 0)}</TableCell>
                <TableCell className="text-right">{funnelData.reduce((s, d) => s + d.rms, 0)}</TableCell>
                <TableCell className="text-right">{totalMqls}</TableCell>
                <TableCell className="text-right">{formatNumber(totalLeads)}</TableCell>
                <TableCell className="text-right text-lg text-primary">{formatCurrency(totalInvestimento)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// Componente para editar indicadores de uma BU
interface BUIndicatorEditorProps {
  indicators: BUIndicators;
  onChange: (indicators: BUIndicators) => void;
  buName: string;
  buIcon: React.ReactNode;
}

function BUIndicatorEditor({ indicators, onChange, buName, buIcon }: BUIndicatorEditorProps) {
  const handleChange = (key: keyof BUIndicators, value: number) => {
    onChange({ ...indicators, [key]: value });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        {buIcon}
        <h4 className="font-semibold text-lg">{buName}</h4>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Valores Monetários */}
        <div className="space-y-4">
          <h5 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Valores</h5>
          
          <div className="space-y-2">
            <Label>Ticket Médio</Label>
            <Input
              type="number"
              value={indicators.ticketMedio}
              onChange={(e) => handleChange('ticketMedio', Number(e.target.value))}
              className="font-mono"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Custo por MQL (CPMQL)</Label>
            <Input
              type="number"
              value={indicators.cpmql}
              onChange={(e) => handleChange('cpmql', Number(e.target.value))}
              className="font-mono"
            />
          </div>
          
          <div className="space-y-2">
            <Label>CPV (Custo por Venda)</Label>
            <Input
              type="number"
              value={indicators.cpv}
              onChange={(e) => handleChange('cpv', Number(e.target.value))}
              className="font-mono"
            />
          </div>
        </div>

        {/* Taxas de Conversão - Parte 1 */}
        <div className="space-y-4">
          <h5 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Conversão (Topo)</h5>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <Label>MQL → RM</Label>
              <span className="font-mono text-primary">{(indicators.mqlToRm * 100).toFixed(0)}%</span>
            </div>
            <Slider
              value={[indicators.mqlToRm * 100]}
              onValueChange={(v) => handleChange('mqlToRm', v[0] / 100)}
              max={100}
              step={1}
              className="w-full"
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <Label>RM → RR</Label>
              <span className="font-mono text-primary">{(indicators.rmToRr * 100).toFixed(0)}%</span>
            </div>
            <Slider
              value={[indicators.rmToRr * 100]}
              onValueChange={(v) => handleChange('rmToRr', v[0] / 100)}
              max={100}
              step={1}
              className="w-full"
            />
          </div>
        </div>

        {/* Taxas de Conversão - Parte 2 */}
        <div className="space-y-4">
          <h5 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Conversão (Fundo)</h5>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <Label>RR → Proposta</Label>
              <span className="font-mono text-primary">{(indicators.rrToProp * 100).toFixed(0)}%</span>
            </div>
            <Slider
              value={[indicators.rrToProp * 100]}
              onValueChange={(v) => handleChange('rrToProp', v[0] / 100)}
              max={100}
              step={1}
              className="w-full"
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <Label>Proposta → Venda</Label>
              <span className="font-mono text-primary">{(indicators.propToVenda * 100).toFixed(0)}%</span>
            </div>
            <Slider
              value={[indicators.propToVenda * 100]}
              onValueChange={(v) => handleChange('propToVenda', v[0] / 100)}
              max={100}
              step={1}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Resumo de conversão */}
      <div className="bg-muted/30 rounded-lg p-3 mt-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Conversão Total (MQL → Venda)</span>
          <span className="font-mono font-bold text-primary">
            {((indicators.mqlToRm * indicators.rmToRr * indicators.rrToProp * indicators.propToVenda) * 100).toFixed(2)}%
          </span>
        </div>
      </div>
    </div>
  );
}

export function MediaInvestmentTab() {
  // Fetch BU indicators config from database
  const { getIndicatorsMap, isLoading: isLoadingConfig, saveIndicators, isSaving } = useBUIndicatorsConfig();

  // Fetch monetary metas from database
  const { metas, isLoading: isLoadingMetas, bulkUpdateMetas, getMeta } = useMonetaryMetas();
  
  // Fetch realized data from indicators
  const { realizedByBU, realizedFunnelByBU, totalRealized, isLoading: isLoadingRealized } = useIndicatorsRealized(2026);

  // Fetch DRE from Oxy Finance (faturamento total por BU por mes)
  const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const { data: dreData } = useQuery({
    queryKey: ['plan-growth-dre', 2026],
    queryFn: async () => {
      const [dreRes, expRes] = await Promise.all([
        supabase.functions.invoke('fetch-oxy-finance', {
          body: { action: 'dre', startDate: '2026-01-01', endDate: '2026-12-31' },
        }),
        supabase.functions.invoke('fetch-oxy-finance', {
          body: { action: 'dre_categories', groupIds: ['e56e4eca-8101-448c-9194-8e0b5b3b9547'], startDate: '2026-01-01', endDate: '2026-12-31' },
        }),
      ]);
      if (dreRes.error) throw dreRes.error;

      const groups = dreRes.data?.groups || [];
      const result: Record<string, Record<string, number>> = {
        modelo_atual: {}, o2_tax: {}, oxy_hacker: {}, franquia: {},
      };

      // CaaS + SaaS = Modelo Atual, Tax = O2 Tax
      const caas = groups.find((g: any) => g.label === 'CaaS');
      const saas = groups.find((g: any) => g.label === 'SaaS');
      const tax = groups.find((g: any) => g.label === 'Tax');

      for (const monthData of (caas?.data || [])) {
        if (monthData.period === 'TOTAL') continue;
        const match = monthData.period.match(/(\d{4})-(\d{2})/);
        if (!match) continue;
        const monthName = MONTH_NAMES[parseInt(match[2]) - 1];
        if (!monthName) continue;
        const saasVal = saas?.data?.find((d: any) => d.period === monthData.period)?.value || 0;
        result.modelo_atual[monthName] = (monthData.value || 0) + saasVal;
      }

      for (const monthData of (tax?.data || [])) {
        if (monthData.period === 'TOTAL') continue;
        const match = monthData.period.match(/(\d{4})-(\d{2})/);
        if (!match) continue;
        const monthName = MONTH_NAMES[parseInt(match[2]) - 1];
        if (monthName) result.o2_tax[monthName] = monthData.value || 0;
      }

      // Expansao detalhado: Oxy Hacker + Franquia
      const categories = expRes.data?.categories || [];
      for (const cat of categories) {
        const label = (cat.label || '').toLowerCase();
        const isOxy = label.includes('oxy') || label.includes('hacker') || label.includes('micro');
        const isFranquia = label.includes('franquia') && !label.includes('master');
        if (!isOxy && !isFranquia) continue;
        const buKey = isOxy ? 'oxy_hacker' : 'franquia';
        for (const [period, value] of Object.entries(cat.data || {})) {
          if (period === 'TOTAL') continue;
          const match = period.match(/(\d{4})-(\d{2})/);
          if (!match) continue;
          const monthName = MONTH_NAMES[parseInt(match[2]) - 1];
          if (monthName) result[buKey][monthName] = (result[buKey][monthName] || 0) + (value as number);
        }
      }

      return result;
    },
    staleTime: 10 * 60 * 1000,
    retry: 2,
  });

  const dreByBU = dreData || { modelo_atual: {}, o2_tax: {}, oxy_hacker: {}, franquia: {} };

  // Auth & admin check for redistribution
  const { user } = useAuth();
  const { isAdmin } = useUserPermissions(user?.id);
  const [redistOpen, setRedistOpen] = useState(false);
  const [consolidadoOpen, setConsolidadoOpen] = useState(true);

  // Helper: Get metas from database for a BU
  const getDbMetasForBU = (bu: BuType): Record<string, number> | null => {
    const buMetas = metas.filter(m => m.bu === bu);
    const hasValues = buMetas.some(m => Number(m.faturamento) > 0 || Number(m.pontual) > 0);
    if (!hasValues) return null;
    
    const result: Record<string, number> = {};
    const isPontualOnly = isPontualOnlyBU(bu);
    buMetas.forEach(m => {
      // For pontual-only BUs, use pontual field; otherwise use faturamento
      result[m.month] = isPontualOnly 
        ? (Number(m.pontual) || 0)
        : (Number(m.faturamento) || 0);
    });
    return result;
  };

  // Estados editáveis - Taxas gerais (Modelo Atual)
  const [mrrInicial, setMrrInicial] = useState(700000);
  const [valorVenderInicial, setValorVenderInicial] = useState(400000);
  const [churnMensal, setChurnMensal] = useState(0.06);
  const [retencaoVendas, setRetencaoVendas] = useState(0.25);
  
  // Estados editáveis - O2 TAX
  const [mrrInicialO2Tax, setMrrInicialO2Tax] = useState(100000);
  const [churnMensalO2Tax, setChurnMensalO2Tax] = useState(0.04);
  const [retencaoVendasO2Tax, setRetencaoVendasO2Tax] = useState(0.30);
  
  // Estados editáveis - Metas trimestrais (fallback when DB is empty)
  const [metasTrimestrais, setMetasTrimestrais] = useState({
    Q1: 3750000,
    Q2: 4500000,
    Q3: 6000000,
    Q4: 8000000,
  });

  // Estados editáveis - Indicadores por BU (separados Oxy Hacker e Franquia)
  const [indicadoresPorBU, setIndicadoresPorBU] = useState<{
    modeloAtual: BUIndicators;
    o2Tax: BUIndicators;
    oxyHacker: BUIndicators;
    franquia: BUIndicators;
  }>({
    modeloAtual: {
      ticketMedio: 17000,
      cpmql: 472.72,
      cpv: 6517.05,
      mqlToRm: 0.49,
      rmToRr: 0.72,
      rrToProp: 0.88,
      propToVenda: 0.24,
    },
    o2Tax: {
      ticketMedio: 15000,
      cpmql: 600,
      cpv: 2500,
      mqlToRm: 0.45,
      rmToRr: 0.65,
      rrToProp: 0.80,
      propToVenda: 0.20,
    },
    oxyHacker: {
      ticketMedio: 54000,
      cpmql: 800,
      cpv: 5000,
      mqlToRm: 0.40,
      rmToRr: 0.60,
      rrToProp: 0.75,
      propToVenda: 0.15,
    },
    franquia: {
      ticketMedio: 140000,
      cpmql: 1200,
      cpv: 12000,
      mqlToRm: 0.35,
      rmToRr: 0.55,
      rrToProp: 0.70,
      propToVenda: 0.12,
    },
  });

  const [configOpen, setConfigOpen] = useState(false);
  const [selectedBUTab, setSelectedBUTab] = useState("modeloAtual");
  const [configLoadedFromDb, setConfigLoadedFromDb] = useState(false);

  // Load indicators from DB when available
  useEffect(() => {
    if (configLoadedFromDb || isLoadingConfig) return;
    const dbMap = getIndicatorsMap();
    if (!dbMap) return;
    
    const buKeyMap: Record<string, 'modeloAtual' | 'o2Tax' | 'oxyHacker' | 'franquia'> = {
      modelo_atual: 'modeloAtual',
      o2_tax: 'o2Tax',
      oxy_hacker: 'oxyHacker',
      franquia: 'franquia',
    };
    
    setIndicadoresPorBU(prev => {
      const next = { ...prev };
      for (const [dbKey, stateKey] of Object.entries(buKeyMap)) {
        if (dbMap[dbKey]) {
          next[stateKey] = dbMap[dbKey];
        }
      }
      return next;
    });
    setConfigLoadedFromDb(true);
  }, [isLoadingConfig, getIndicatorsMap, configLoadedFromDb]);

  // Pending A Vender changes: bu -> month -> newAVenderValue
  const [pendingChanges, setPendingChanges] = useState<Record<string, Record<string, number>>>({});
  // Snapshot of original values when editing starts (bu -> month -> originalAVender)
  const originalValuesRef = useRef<Record<string, Record<string, number>>>({});
  
  const { logAction } = useAuditLogs();

  // Quarterly totals para outras BUs (fallback when DB is empty)
  const quarterlyTotalsOutrasBUs = useMemo(() => ({
    o2Tax: { Q1: 412224, Q2: 587220.48, Q3: 781590.46, Q4: 1040296.90 },
    oxyHacker: { Q1: 5 * 54000, Q2: 15 * 54000, Q3: 30 * 54000, Q4: 50 * 54000 },
    franquia: { Q1: 2 * 140000, Q2: 3 * 140000, Q3: 6 * 140000, Q4: 9 * 140000 },
  }), []);

  // Funnel metrics dinâmicos usando indicadores por BU
  const funnelMetrics = useMemo(() => ({
    modeloAtual: {
      name: "Modelo Atual",
      ticketMedio: indicadoresPorBU.modeloAtual.ticketMedio,
      leadToMql: 0.43, // Fixed for now
      mqlToRm: indicadoresPorBU.modeloAtual.mqlToRm,
      rmToRr: indicadoresPorBU.modeloAtual.rmToRr,
      rrToProp: indicadoresPorBU.modeloAtual.rrToProp,
      propToVenda: indicadoresPorBU.modeloAtual.propToVenda,
      cpmql: indicadoresPorBU.modeloAtual.cpmql,
      cprr: indicators2025.cprr,
      cac: indicators2025.cac,
      cpv: indicadoresPorBU.modeloAtual.cpv,
      color: "hsl(var(--primary))",
      icon: <Building2 className="h-5 w-5 text-primary" />,
    },
    o2Tax: {
      name: "O2 TAX",
      ticketMedio: indicadoresPorBU.o2Tax.ticketMedio,
      cpv: indicadoresPorBU.o2Tax.cpv,
      leadToMql: 0.35,
      mqlToRm: indicadoresPorBU.o2Tax.mqlToRm,
      rmToRr: indicadoresPorBU.o2Tax.rmToRr,
      rrToProp: indicadoresPorBU.o2Tax.rrToProp,
      propToVenda: indicadoresPorBU.o2Tax.propToVenda,
      cpmql: indicadoresPorBU.o2Tax.cpmql,
      cprr: 1800,
      cac: 12000,
      color: "hsl(var(--warning))",
      icon: <DollarSign className="h-5 w-5 text-warning" />,
    },
    oxyHacker: {
      name: "Oxy Hacker",
      ticketMedio: indicadoresPorBU.oxyHacker.ticketMedio,
      cpv: indicadoresPorBU.oxyHacker.cpv,
      leadToMql: 0.25,
      mqlToRm: indicadoresPorBU.oxyHacker.mqlToRm,
      rmToRr: indicadoresPorBU.oxyHacker.rmToRr,
      rrToProp: indicadoresPorBU.oxyHacker.rrToProp,
      propToVenda: indicadoresPorBU.oxyHacker.propToVenda,
      cpmql: indicadoresPorBU.oxyHacker.cpmql,
      cprr: 2500,
      cac: 18000,
      color: "hsl(var(--accent))",
      icon: <Rocket className="h-5 w-5 text-accent-foreground" />,
    },
    franquia: {
      name: "Franquia",
      ticketMedio: indicadoresPorBU.franquia.ticketMedio,
      cpv: indicadoresPorBU.franquia.cpv,
      leadToMql: 0.20,
      mqlToRm: indicadoresPorBU.franquia.mqlToRm,
      rmToRr: indicadoresPorBU.franquia.rmToRr,
      rrToProp: indicadoresPorBU.franquia.rrToProp,
      propToVenda: indicadoresPorBU.franquia.propToVenda,
      cpmql: indicadoresPorBU.franquia.cpmql,
      cprr: 4000,
      cac: 25000,
      color: "hsl(var(--secondary))",
      icon: <Users className="h-5 w-5 text-secondary-foreground" />,
    },
  }), [indicadoresPorBU]);

  // Metas mensais distribuídas - prioritize DB, fallback to quarterly distribution
  const metasMensaisModeloAtual = useMemo(() => {
    const dbMetas = getDbMetasForBU('modelo_atual');
    if (dbMetas && Object.values(dbMetas).some(v => v > 0)) {
      return dbMetas;
    }
    return distributeQuarterlyToMonthly(metasTrimestrais);
  }, [metasTrimestrais, metas]);

  // Calcula MRR dinâmico e "A Vender" a partir das metas fixas
  const mrrDynamic = useMemo(() => 
    calculateMrrAndRevenueToSell(
      mrrInicial, 
      churnMensal, 
      retencaoVendas,
      metasMensaisModeloAtual,
      indicadoresPorBU.modeloAtual.ticketMedio,
      valorVenderInicial
    ),
    [mrrInicial, churnMensal, retencaoVendas, metasMensaisModeloAtual, indicadoresPorBU.modeloAtual.ticketMedio, valorVenderInicial]
  );

  // Receitas outras BUs - prioritize DB, fallback to calculated values
  const o2TaxMonthly = useMemo(() => {
    const dbMetas = getDbMetasForBU('o2_tax');
    if (dbMetas && Object.values(dbMetas).some(v => v > 0)) {
      return dbMetas;
    }
    return calculateMonthlyValuesSmooth(quarterlyTotalsOutrasBUs.o2Tax, 120000);
  }, [quarterlyTotalsOutrasBUs, metas]);
  
  const oxyHackerMonthly = useMemo(() => {
    const dbMetas = getDbMetasForBU('oxy_hacker');
    if (dbMetas && Object.values(dbMetas).some(v => v > 0)) {
      return dbMetas;
    }
    return calculateFromUnits(oxyHackerUnits, 54000);
  }, [metas]);
  
  const franquiaMonthly = useMemo(() => {
    const dbMetas = getDbMetasForBU('franquia');
    if (dbMetas && Object.values(dbMetas).some(v => v > 0)) {
      return dbMetas;
    }
    return calculateFromUnits(franquiaUnits, 140000);
  }, [metas]);

  // Calculate funnel data for each BU
  const modeloAtualFunnel = useMemo(() => 
    calculateReverseFunnel(
      mrrDynamic.revenueToSell, 
      funnelMetrics.modeloAtual, 
      mrrDynamic.mrrPorMes, 
      true, 
      metasMensaisModeloAtual,
      indicadoresPorBU.modeloAtual.cpv
    ),
    [mrrDynamic, funnelMetrics.modeloAtual, metasMensaisModeloAtual, indicadoresPorBU.modeloAtual.cpv]
  );
  
  const o2TaxFunnel = useMemo(() => 
    calculateReverseFunnel(o2TaxMonthly, funnelMetrics.o2Tax, null, true, null, funnelMetrics.o2Tax.cpv, 10000),
    [o2TaxMonthly, funnelMetrics.o2Tax]
  );
  
  const oxyHackerFunnel = useMemo(() => 
    calculateReverseFunnel(oxyHackerMonthly, funnelMetrics.oxyHacker, null, true, null, funnelMetrics.oxyHacker.cpv, 10000),
    [oxyHackerMonthly, funnelMetrics.oxyHacker]
  );
  
  const franquiaFunnel = useMemo(() => 
    calculateReverseFunnel(franquiaMonthly, funnelMetrics.franquia, null, true, null, funnelMetrics.franquia.cpv, 10000),
    [franquiaMonthly, funnelMetrics.franquia]
  );

  // Effective funnel data: merge pendingChanges so edits don't revert visually
  const applyPendingToFunnel = useCallback((
    originalFunnel: FunnelData[],
    buKey: string,
    metrics: FunnelMetrics,
    cpvValue: number,
    mrrComChurn: Record<string, number> | null = null,
  ): FunnelData[] => {
    const buPending = pendingChanges[buKey];
    if (!buPending || Object.keys(buPending).length === 0) return originalFunnel;
    
    return originalFunnel.map(d => {
      const pending = buPending[d.month];
      if (pending === undefined) return d;
      
      const newVender = pending;
      const vendas = newVender / metrics.ticketMedio;
      const propostas = vendas / metrics.propToVenda;
      const rrs = propostas / metrics.rrToProp;
      const rms = rrs / metrics.rmToRr;
      const mqls = rms / metrics.mqlToRm;
      const leads = mqls / metrics.leadToMql;
      const investimento = vendas * cpvValue;
      const faturamentoMeta = mrrComChurn ? (d.mrrBase + newVender) : newVender;
      
      return {
        ...d,
        faturamentoVender: newVender,
        faturamentoMeta,
        vendas: Math.ceil(vendas),
        propostas: Math.ceil(propostas),
        rrs: Math.ceil(rrs),
        rms: Math.ceil(rms),
        mqls: Math.ceil(mqls),
        leads: Math.ceil(leads),
        investimento: Math.round(investimento),
      };
    });
  }, [pendingChanges]);

  const effectiveModeloAtualFunnel = useMemo(() => 
    applyPendingToFunnel(modeloAtualFunnel, 'modelo_atual', funnelMetrics.modeloAtual, indicadoresPorBU.modeloAtual.cpv, mrrDynamic.mrrPorMes),
    [modeloAtualFunnel, applyPendingToFunnel, funnelMetrics.modeloAtual, indicadoresPorBU.modeloAtual.cpv, mrrDynamic.mrrPorMes]
  );

  const effectiveO2TaxFunnel = useMemo(() => 
    applyPendingToFunnel(o2TaxFunnel, 'o2_tax', funnelMetrics.o2Tax, funnelMetrics.o2Tax.cpv || indicadoresPorBU.o2Tax.cpv),
    [o2TaxFunnel, applyPendingToFunnel, funnelMetrics.o2Tax, indicadoresPorBU.o2Tax.cpv]
  );

  const effectiveOxyHackerFunnel = useMemo(() => 
    applyPendingToFunnel(oxyHackerFunnel, 'oxy_hacker', funnelMetrics.oxyHacker, funnelMetrics.oxyHacker.cpv || indicadoresPorBU.oxyHacker.cpv),
    [oxyHackerFunnel, applyPendingToFunnel, funnelMetrics.oxyHacker, indicadoresPorBU.oxyHacker.cpv]
  );

  const effectiveFranquiaFunnel = useMemo(() => 
    applyPendingToFunnel(franquiaFunnel, 'franquia', funnelMetrics.franquia, funnelMetrics.franquia.cpv || indicadoresPorBU.franquia.cpv),
    [franquiaFunnel, applyPendingToFunnel, funnelMetrics.franquia, indicadoresPorBU.franquia.cpv]
  );

  // Consolidated funnel for 2026 visual
  const consolidatedFunnelTotals = useMemo(() => {
    const totalLeads = modeloAtualFunnel.reduce((s, d) => s + d.leads, 0) +
                       o2TaxFunnel.reduce((s, d) => s + d.leads, 0) +
                       oxyHackerFunnel.reduce((s, d) => s + d.leads, 0) +
                       franquiaFunnel.reduce((s, d) => s + d.leads, 0);
    const totalMqls = modeloAtualFunnel.reduce((s, d) => s + d.mqls, 0) +
                      o2TaxFunnel.reduce((s, d) => s + d.mqls, 0) +
                      oxyHackerFunnel.reduce((s, d) => s + d.mqls, 0) +
                      franquiaFunnel.reduce((s, d) => s + d.mqls, 0);
    const totalRms = modeloAtualFunnel.reduce((s, d) => s + d.rms, 0) +
                     o2TaxFunnel.reduce((s, d) => s + d.rms, 0) +
                     oxyHackerFunnel.reduce((s, d) => s + d.rms, 0) +
                     franquiaFunnel.reduce((s, d) => s + d.rms, 0);
    const totalRrs = modeloAtualFunnel.reduce((s, d) => s + d.rrs, 0) +
                     o2TaxFunnel.reduce((s, d) => s + d.rrs, 0) +
                     oxyHackerFunnel.reduce((s, d) => s + d.rrs, 0) +
                     franquiaFunnel.reduce((s, d) => s + d.rrs, 0);
    const totalPropostas = modeloAtualFunnel.reduce((s, d) => s + d.propostas, 0) +
                           o2TaxFunnel.reduce((s, d) => s + d.propostas, 0) +
                           oxyHackerFunnel.reduce((s, d) => s + d.propostas, 0) +
                           franquiaFunnel.reduce((s, d) => s + d.propostas, 0);
    const totalVendas = modeloAtualFunnel.reduce((s, d) => s + d.vendas, 0) +
                        o2TaxFunnel.reduce((s, d) => s + d.vendas, 0) +
                        oxyHackerFunnel.reduce((s, d) => s + d.vendas, 0) +
                        franquiaFunnel.reduce((s, d) => s + d.vendas, 0);

    // Calculate conversion rates from totals
    const leadToMql = totalLeads > 0 ? totalMqls / totalLeads : 0;
    const mqlToRm = totalMqls > 0 ? totalRms / totalMqls : 0;
    const rmToRr = totalRms > 0 ? totalRrs / totalRms : 0;
    const rrToProp = totalRrs > 0 ? totalPropostas / totalRrs : 0;
    const propToVenda = totalPropostas > 0 ? totalVendas / totalPropostas : 0;

    return {
      leads: totalLeads,
      mqls: totalMqls,
      rms: totalRms,
      rrs: totalRrs,
      propostas: totalPropostas,
      vendas: totalVendas,
      leadToMql,
      mqlToRm,
      rmToRr,
      rrToProp,
      propToVenda,
    };
  }, [modeloAtualFunnel, o2TaxFunnel, oxyHackerFunnel, franquiaFunnel]);

  // Build funnel stages for each BU
  const buildFunnelStages = (funnelData: FunnelData[], metrics: FunnelMetrics) => {
    const totalLeads = funnelData.reduce((s, d) => s + d.leads, 0);
    const totalMqls = funnelData.reduce((s, d) => s + d.mqls, 0);
    const totalRms = funnelData.reduce((s, d) => s + d.rms, 0);
    const totalRrs = funnelData.reduce((s, d) => s + d.rrs, 0);
    const totalPropostas = funnelData.reduce((s, d) => s + d.propostas, 0);
    const totalVendas = funnelData.reduce((s, d) => s + d.vendas, 0);

    return [
      { stage: "Leads", value: totalLeads, percent: "-" },
      { stage: "MQL", value: totalMqls, percent: `${(metrics.leadToMql * 100).toFixed(0)}%` },
      { stage: "RM", value: totalRms, percent: `${(metrics.mqlToRm * 100).toFixed(0)}%` },
      { stage: "RR", value: totalRrs, percent: `${(metrics.rmToRr * 100).toFixed(0)}%` },
      { stage: "Proposta", value: totalPropostas, percent: `${(metrics.rrToProp * 100).toFixed(0)}%` },
      { stage: "Venda", value: totalVendas, percent: `${(metrics.propToVenda * 100).toFixed(0)}%` },
    ];
  };

  // Calculate totals
  const totalInvestimento = 
    modeloAtualFunnel.reduce((s, d) => s + d.investimento, 0) +
    o2TaxFunnel.reduce((s, d) => s + d.investimento, 0) +
    oxyHackerFunnel.reduce((s, d) => s + d.investimento, 0) +
    franquiaFunnel.reduce((s, d) => s + d.investimento, 0);

  const totalFaturamento = 
    modeloAtualFunnel.reduce((s, d) => s + d.faturamentoMeta, 0) +
    o2TaxFunnel.reduce((s, d) => s + d.faturamentoMeta, 0) +
    oxyHackerFunnel.reduce((s, d) => s + d.faturamentoMeta, 0) +
    franquiaFunnel.reduce((s, d) => s + d.faturamentoMeta, 0);

  const totalAVender = 
    modeloAtualFunnel.reduce((s, d) => s + d.faturamentoVender, 0) +
    o2TaxFunnel.reduce((s, d) => s + d.faturamentoVender, 0) +
    oxyHackerFunnel.reduce((s, d) => s + d.faturamentoVender, 0) +
    franquiaFunnel.reduce((s, d) => s + d.faturamentoVender, 0);

  const metaAnualTotal = metasTrimestrais.Q1 + metasTrimestrais.Q2 + metasTrimestrais.Q3 + metasTrimestrais.Q4;

  const overallROI = totalFaturamento / totalInvestimento;

  // Publish metas to context for SalesGoalsTab consumption
  const { setMetasPorBU, setFunnelData } = useMediaMetas();
  
  useEffect(() => {
    setMetasPorBU({
      modelo_atual: Object.fromEntries(
        modeloAtualFunnel.map(d => [d.month, d.faturamentoMeta])
      ),
      o2_tax: Object.fromEntries(
        o2TaxFunnel.map(d => [d.month, d.faturamentoMeta])
      ),
      oxy_hacker: Object.fromEntries(
        oxyHackerFunnel.map(d => [d.month, d.faturamentoMeta])
      ),
      franquia: Object.fromEntries(
        franquiaFunnel.map(d => [d.month, d.faturamentoMeta])
      ),
    });
    
    // Publish full funnel data for IndicatorsTab consumption
    setFunnelData({
      modeloAtual: modeloAtualFunnel.map(d => ({
        month: d.month,
        leads: Math.round(d.leads),
        mqls: Math.round(d.mqls),
        rms: Math.round(d.rms),
        rrs: Math.round(d.rrs),
        propostas: Math.round(d.propostas),
        vendas: Math.round(d.vendas),
        investimento: Math.round(d.investimento),
      })),
      o2Tax: o2TaxFunnel.map(d => ({
        month: d.month,
        leads: Math.round(d.leads),
        mqls: Math.round(d.mqls),
        rms: Math.round(d.rms),
        rrs: Math.round(d.rrs),
        propostas: Math.round(d.propostas),
        vendas: Math.round(d.vendas),
        investimento: Math.round(d.investimento),
      })),
      oxyHacker: oxyHackerFunnel.map(d => ({
        month: d.month,
        leads: Math.round(d.leads),
        mqls: Math.round(d.mqls),
        rms: Math.round(d.rms),
        rrs: Math.round(d.rrs),
        propostas: Math.round(d.propostas),
        vendas: Math.round(d.vendas),
        investimento: Math.round(d.investimento),
      })),
      franquia: franquiaFunnel.map(d => ({
        month: d.month,
        leads: Math.round(d.leads),
        mqls: Math.round(d.mqls),
        rms: Math.round(d.rms),
        rrs: Math.round(d.rrs),
        propostas: Math.round(d.propostas),
        vendas: Math.round(d.vendas),
        investimento: Math.round(d.investimento),
      })),
    });
  }, [modeloAtualFunnel, o2TaxFunnel, oxyHackerFunnel, franquiaFunnel, setMetasPorBU, setFunnelData]);

  // Chart data for stacked area
  const investmentChartData = months.map((month, index) => ({
    month,
    modeloAtual: modeloAtualFunnel[index].investimento,
    o2Tax: o2TaxFunnel[index].investimento,
    oxyHacker: oxyHackerFunnel[index].investimento,
    franquia: franquiaFunnel[index].investimento,
    total: modeloAtualFunnel[index].investimento + o2TaxFunnel[index].investimento + 
           oxyHackerFunnel[index].investimento + franquiaFunnel[index].investimento,
  }));

  // Pie chart data
  const pieData = [
    { name: "Modelo Atual", value: modeloAtualFunnel.reduce((s, d) => s + d.investimento, 0) },
    { name: "O2 TAX", value: o2TaxFunnel.reduce((s, d) => s + d.investimento, 0) },
    { name: "Oxy Hacker", value: oxyHackerFunnel.reduce((s, d) => s + d.investimento, 0) },
    { name: "Franquia", value: franquiaFunnel.reduce((s, d) => s + d.investimento, 0) },
  ];

  // Custom label for pie chart
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 1.4;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="hsl(var(--foreground))" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {name} ({(percent * 100).toFixed(1)}%)
      </text>
    );
  };

  const handleMetaChange = (quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4', value: string) => {
    const numValue = parseFloat(value.replace(/\D/g, '')) || 0;
    setMetasTrimestrais(prev => ({ ...prev, [quarter]: numValue }));
  };

  const handleBUIndicatorChange = (bu: 'modeloAtual' | 'o2Tax' | 'oxyHacker' | 'franquia', indicators: BUIndicators) => {
    setIndicadoresPorBU(prev => ({ ...prev, [bu]: indicators }));
  };

  // Handler for A Vender changes - stores locally instead of saving to DB
  const handleAVenderChange = useCallback((buKey: string, month: string, newAVender: number) => {
    // Capture original value on first edit for this BU/month
    if (!originalValuesRef.current[buKey]?.[month]) {
      // Get original A Vender from current funnel data
      const monthIndex = months.indexOf(month);
      let originalAVender = 0;
      if (buKey === 'modelo_atual') originalAVender = modeloAtualFunnel[monthIndex]?.faturamentoVender || 0;
      else if (buKey === 'o2_tax') originalAVender = o2TaxFunnel[monthIndex]?.faturamentoVender || 0;
      else if (buKey === 'oxy_hacker') originalAVender = oxyHackerFunnel[monthIndex]?.faturamentoVender || 0;
      else if (buKey === 'franquia') originalAVender = franquiaFunnel[monthIndex]?.faturamentoVender || 0;
      
      // Check if there's no pending change yet for this BU
      if (!originalValuesRef.current[buKey]) originalValuesRef.current[buKey] = {};
      originalValuesRef.current[buKey][month] = originalAVender;
    }
    
    setPendingChanges(prev => ({
      ...prev,
      [buKey]: {
        ...(prev[buKey] || {}),
        [month]: newAVender,
      },
    }));
  }, [modeloAtualFunnel, o2TaxFunnel, oxyHackerFunnel, franquiaFunnel]);

  // Calculate validation status per BU
  const pendingValidation = useMemo(() => {
    const result: Record<string, { originalTotal: number; newTotal: number; diff: number; changeCount: number }> = {};
    
    for (const [bu, monthChanges] of Object.entries(pendingChanges)) {
      if (Object.keys(monthChanges).length === 0) continue;
      
      let originalTotal = 0;
      let newTotal = 0;
      let changeCount = 0;
      
      for (const [month, newValue] of Object.entries(monthChanges)) {
        const origValue = originalValuesRef.current[bu]?.[month] || 0;
        // Only count if actually changed
        if (Math.round(origValue) !== Math.round(newValue)) {
          originalTotal += origValue;
          newTotal += newValue;
          changeCount++;
        }
      }
      
      if (changeCount > 0) {
        const diff = newTotal - originalTotal;
        result[bu] = { originalTotal, newTotal, diff, changeCount };
      }
    }
    
    return result;
  }, [pendingChanges, indicadoresPorBU]);

  const hasPendingChanges = Object.keys(pendingValidation).length > 0;
  const totalChangeCount = Object.values(pendingValidation).reduce((s, v) => s + v.changeCount, 0);
  const isAllBalanced = Object.values(pendingValidation).every(v => Math.abs(v.diff) < 100); // tolerance of R$100

  // Batch save all pending changes
  const handleSaveAll = useCallback(async () => {
    if (!isAllBalanced) {
      toast.error('O total de A Vender não está balanceado. Redistribua o valor entre os meses.');
      return;
    }
    
    try {
      const updates: any[] = [];
      
      for (const [bu, monthChanges] of Object.entries(pendingChanges)) {
        for (const [month, newAVender] of Object.entries(monthChanges)) {
          const origValue = originalValuesRef.current[bu]?.[month] || 0;
          if (Math.round(origValue) === Math.round(newAVender)) continue; // skip unchanged
          
          const buMeta = metas.find(m => m.bu === bu && m.month === month);
          const isPontualOnly = isPontualOnlyBU(bu as BuType);
          const buKeyForIndicators = bu === 'oxy_hacker' ? 'oxyHacker' : bu === 'o2_tax' ? 'o2Tax' : bu === 'franquia' ? 'franquia' : 'modeloAtual';
          
          if (isPontualOnly) {
            updates.push({
              bu, month, year: 2026,
              faturamento: newAVender, pontual: newAVender,
              mrr: 0, setup: 0,
              vendas: buMeta ? buMeta.vendas : Math.round(newAVender / indicadoresPorBU[buKeyForIndicators as keyof typeof indicadoresPorBU].ticketMedio),
              ticket_medio: buMeta ? buMeta.ticket_medio : indicadoresPorBU[buKeyForIndicators as keyof typeof indicadoresPorBU].ticketMedio,
            });
          } else {
            let mrrBaseDoMes = 0;
            const monthIndex = months.indexOf(month);
            if (bu === 'modelo_atual') mrrBaseDoMes = modeloAtualFunnel[monthIndex]?.mrrBase || 0;
            
            const newFaturamento = mrrBaseDoMes + newAVender;
            const ticketMedio = buMeta ? buMeta.ticket_medio : indicadoresPorBU[buKeyForIndicators as keyof typeof indicadoresPorBU].ticketMedio;
            const vendas = Math.round(newFaturamento / ticketMedio);
            
            updates.push({
              bu, month, year: 2026,
              faturamento: newFaturamento,
              mrr: Math.round(newFaturamento * 0.25),
              setup: Math.round(newFaturamento * 0.60),
              pontual: Math.round(newFaturamento * 0.15),
              vendas, ticket_medio: ticketMedio,
            });
          }
          
          // Log the change
          const buLabel = bu === 'modelo_atual' ? 'Modelo Atual' : bu === 'o2_tax' ? 'O2 TAX' : bu === 'oxy_hacker' ? 'Oxy Hacker' : 'Franquia';
          await logAction('monetary_meta', `Plan Growth - ${buLabel} ${month}: A Vender de ${formatCurrency(origValue)} para ${formatCurrency(newAVender)}`, {
            bu, month, old_value: origValue, new_value: newAVender, source: 'plan_growth',
          });
        }
      }
      
      if (updates.length > 0) {
        await bulkUpdateMetas.mutateAsync(updates);
        toast.success(`${updates.length} meta${updates.length > 1 ? 's' : ''} atualizada${updates.length > 1 ? 's' : ''} com sucesso`);
      }
      
      // Clear pending
      setPendingChanges({});
      originalValuesRef.current = {};
    } catch (error) {
      console.error('Error saving changes:', error);
      toast.error('Erro ao salvar alterações');
    }
  }, [pendingChanges, isAllBalanced, metas, bulkUpdateMetas, indicadoresPorBU, modeloAtualFunnel, logAction]);

  const handleDiscardAll = useCallback(() => {
    setPendingChanges({});
    originalValuesRef.current = {};
    toast.info('Alterações descartadas');
  }, []);

  // Get pending months for a BU (for visual indicators)
  const getPendingMonths = (bu: string): Set<string> => {
    const changes = pendingChanges[bu];
    if (!changes) return new Set();
    const result = new Set<string>();
    for (const [month, newValue] of Object.entries(changes)) {
      const origValue = originalValuesRef.current[bu]?.[month] || 0;
      if (Math.round(origValue) !== Math.round(newValue)) result.add(month);
    }
    return result;
  };

  return (
    <>
    <div className={`space-y-10 animate-fade-in ${hasPendingChanges ? 'pb-24' : ''}`}>

      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl gradient-primary p-8 text-primary-foreground">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30" />
        <div className="relative z-10">
          <Badge className="mb-4 bg-primary-foreground/20 text-primary-foreground border-0">
            <Megaphone className="h-3 w-3 mr-1" />
            Investimento em Mídia 2026
          </Badge>
          <h2 className="font-display text-4xl font-bold mb-4">Planejamento de Mídia</h2>
          <p className="text-primary-foreground/80 max-w-2xl">
            Cálculo de investimento baseado em funil reverso. <strong>MRR Inicial: {formatCurrency(mrrInicial)}</strong> — investimento apenas para vender a diferença da meta mensal.
          </p>
          <div className="flex flex-wrap gap-4 mt-6">
            <Badge variant="secondary" className="text-lg px-4 py-2 bg-primary-foreground/20 text-primary-foreground border-0">
              Meta Anual: {formatCurrency(totalFaturamento)}
            </Badge>
            <Badge variant="secondary" className="text-lg px-4 py-2 bg-primary-foreground/20 text-primary-foreground border-0">
              Investimento Total: {formatCurrency(totalInvestimento)}
            </Badge>
            <Badge variant="secondary" className="text-lg px-4 py-2 bg-primary-foreground/20 text-primary-foreground border-0">
              ROI Médio: {overallROI.toFixed(1)}x
            </Badge>
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRedistOpen(true)}
                className="text-sm px-4 py-2 bg-white/20 text-white border-white/30 hover:bg-white/30 font-medium"
              >
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Redistribuir Metas
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Configurações Editáveis */}
      <Collapsible open={configOpen} onOpenChange={setConfigOpen}>
        <Card className="glass-card border-primary/30">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="font-display flex items-center gap-2">
                  <Settings className="h-5 w-5 text-primary" />
                  Configurações do Modelo (Clique para {configOpen ? 'ocultar' : 'editar'})
                </CardTitle>
                <Button variant="outline" size="sm">
                  {configOpen ? 'Ocultar' : 'Editar'}
                </Button>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-6">
              {/* Metas Trimestrais */}
              <div>
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Metas Trimestrais Modelo Atual (Total: {formatCurrency(metaAnualTotal)})
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {(['Q1', 'Q2', 'Q3', 'Q4'] as const).map((quarter) => (
                    <div key={quarter} className="space-y-2">
                      <Label htmlFor={quarter}>{quarter}</Label>
                      <Input
                        id={quarter}
                        type="text"
                        value={formatCurrency(metasTrimestrais[quarter]).replace('R$', '').trim()}
                        onChange={(e) => handleMetaChange(quarter, e.target.value)}
                        className="text-right font-mono"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Parâmetros Base do Modelo Atual */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold">Parâmetros MRR (Modelo Atual)</h4>
                  
                  <div className="space-y-2">
                    <Label>MRR Inicial</Label>
                    <Input
                      type="number"
                      value={mrrInicial}
                      onChange={(e) => setMrrInicial(Number(e.target.value))}
                      className="font-mono"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Valor A Vender Inicial (Jan)</Label>
                    <Input
                      type="number"
                      value={valorVenderInicial}
                      onChange={(e) => setValorVenderInicial(Number(e.target.value))}
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      MRR Base Jan calculado: {formatCurrency(metasMensaisModeloAtual["Jan"] - valorVenderInicial)}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold">Taxas de Retenção (Modelo Atual)</h4>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Churn Mensal</Label>
                      <span className="text-sm font-mono text-primary">{(churnMensal * 100).toFixed(1)}%</span>
                    </div>
                    <Slider
                      value={[churnMensal * 100]}
                      onValueChange={(v) => setChurnMensal(v[0] / 100)}
                      max={20}
                      step={0.5}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Retenção de Vendas</Label>
                      <span className="text-sm font-mono text-primary">{(retencaoVendas * 100).toFixed(0)}%</span>
                    </div>
                    <Slider
                      value={[retencaoVendas * 100]}
                      onValueChange={(v) => setRetencaoVendas(v[0] / 100)}
                      max={50}
                      step={1}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Parâmetros O2 TAX */}
              <div className="border-t pt-6">
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-warning" />
                  Configurações O2 TAX
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label>MRR Inicial O2 TAX</Label>
                    <Input
                      type="number"
                      value={mrrInicialO2Tax}
                      onChange={(e) => setMrrInicialO2Tax(Number(e.target.value))}
                      className="font-mono"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Churn Mensal</Label>
                      <span className="text-sm font-mono text-warning">{(churnMensalO2Tax * 100).toFixed(1)}%</span>
                    </div>
                    <Slider
                      value={[churnMensalO2Tax * 100]}
                      onValueChange={(v) => setChurnMensalO2Tax(v[0] / 100)}
                      max={20}
                      step={0.5}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Retenção de Vendas</Label>
                      <span className="text-sm font-mono text-warning">{(retencaoVendasO2Tax * 100).toFixed(0)}%</span>
                    </div>
                    <Slider
                      value={[retencaoVendasO2Tax * 100]}
                      onValueChange={(v) => setRetencaoVendasO2Tax(v[0] / 100)}
                      max={50}
                      step={1}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Indicadores por BU - Tabs */}
              <div className="border-t pt-6">
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Indicadores por BU (Ticket, CPMQL, CPV, Taxas de Conversão)
                </h4>
                
                <Tabs value={selectedBUTab} onValueChange={setSelectedBUTab}>
                  <TabsList className="grid w-full grid-cols-4 mb-6">
                    <TabsTrigger value="modeloAtual" className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      <span className="hidden sm:inline">Modelo Atual</span>
                    </TabsTrigger>
                    <TabsTrigger value="o2Tax" className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      <span className="hidden sm:inline">O2 Tax</span>
                    </TabsTrigger>
                    <TabsTrigger value="oxyHacker" className="flex items-center gap-2">
                      <Rocket className="h-4 w-4" />
                      <span className="hidden sm:inline">Oxy Hacker</span>
                    </TabsTrigger>
                    <TabsTrigger value="franquia" className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span className="hidden sm:inline">Franquias</span>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="modeloAtual">
                    <BUIndicatorEditor
                      indicators={indicadoresPorBU.modeloAtual}
                      onChange={(ind) => handleBUIndicatorChange('modeloAtual', ind)}
                      buName="Modelo Atual"
                      buIcon={<Building2 className="h-5 w-5 text-primary" />}
                    />
                  </TabsContent>

                  <TabsContent value="o2Tax">
                    <BUIndicatorEditor
                      indicators={indicadoresPorBU.o2Tax}
                      onChange={(ind) => handleBUIndicatorChange('o2Tax', ind)}
                      buName="O2 Tax"
                      buIcon={<DollarSign className="h-5 w-5 text-warning" />}
                    />
                  </TabsContent>

                  <TabsContent value="oxyHacker">
                    <BUIndicatorEditor
                      indicators={indicadoresPorBU.oxyHacker}
                      onChange={(ind) => handleBUIndicatorChange('oxyHacker', ind)}
                      buName="Oxy Hacker"
                      buIcon={<Rocket className="h-5 w-5 text-accent-foreground" />}
                    />
                  </TabsContent>

                  <TabsContent value="franquia">
                    <BUIndicatorEditor
                      indicators={indicadoresPorBU.franquia}
                      onChange={(ind) => handleBUIndicatorChange('franquia', ind)}
                      buName="Franquias"
                      buIcon={<Users className="h-5 w-5 text-secondary-foreground" />}
                    />
                  </TabsContent>
                </Tabs>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Indicadores 2025 - Referência */}
      <Card className="glass-card border-amber-500/30 bg-amber-500/5">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Info className="h-5 w-5 text-amber-500" />
            Indicadores de Referência 2025 (Modelo Atual)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="text-center p-3 bg-background/50 rounded-lg">
              <p className="text-xs text-muted-foreground">CPMQL</p>
              <p className="text-lg font-bold">{formatCurrency(indicators2025.cpmql)}</p>
            </div>
            <div className="text-center p-3 bg-background/50 rounded-lg">
              <p className="text-xs text-muted-foreground">CPRR</p>
              <p className="text-lg font-bold">{formatCurrency(indicators2025.cprr)}</p>
            </div>
            <div className="text-center p-3 bg-background/50 rounded-lg">
              <p className="text-xs text-muted-foreground">CAC</p>
              <p className="text-lg font-bold">{formatCurrency(indicators2025.cac)}</p>
            </div>
            <div className="text-center p-3 bg-background/50 rounded-lg">
              <p className="text-xs text-muted-foreground">CPV</p>
              <p className="text-lg font-bold">{formatCurrency(indicators2025.cpv)}</p>
            </div>
            <div className="text-center p-3 bg-background/50 rounded-lg">
              <p className="text-xs text-muted-foreground">LT (meses)</p>
              <p className="text-lg font-bold">{indicators2025.lt}</p>
            </div>
            <div className="text-center p-3 bg-background/50 rounded-lg">
              <p className="text-xs text-muted-foreground">LTV/CAC</p>
              <p className="text-lg font-bold">{indicators2025.ltvCac.toFixed(2)}</p>
            </div>
            <div className="text-center p-3 bg-background/50 rounded-lg">
              <p className="text-xs text-muted-foreground">ROI</p>
              <p className="text-lg font-bold">{indicators2025.roi.toFixed(2)}</p>
            </div>
            <div className="text-center p-3 bg-background/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Revenue Churn</p>
              <p className="text-lg font-bold text-destructive">{(indicators2025.revenueChurnRate * 100).toFixed(0)}%</p>
            </div>
            <div className="text-center p-3 bg-background/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Logo Churn</p>
              <p className="text-lg font-bold text-destructive">{(indicators2025.logoChurnRate * 100).toFixed(0)}%</p>
            </div>
            <div className="text-center p-3 bg-background/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Novo MRR 2025</p>
              <p className="text-lg font-bold text-emerald-600">{formatCurrency(indicators2025.novoMrr)}</p>
            </div>
            <div className="text-center p-3 bg-background/50 rounded-lg">
              <p className="text-xs text-muted-foreground">TCV 2025</p>
              <p className="text-lg font-bold">{formatCompact(indicators2025.tcv)}</p>
            </div>
            <div className="text-center p-3 bg-background/50 rounded-lg">
              <p className="text-xs text-muted-foreground">MRR Inicial 2026</p>
              <p className="text-lg font-bold text-primary">{formatCurrency(mrrInicial)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Consolidated View */}
      <div>
        <h3 className="font-display text-2xl font-bold mb-6 flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" />
          Visão Consolidada
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Investment Distribution Pie */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="font-display">Distribuição de Investimento por BU</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                      label={renderCustomizedLabel}
                      labelLine={false}
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index]} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Stacked Area Chart */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="font-display">Investimento Mensal por BU</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={investmentChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorModeloAtual" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="colorO2Tax" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--warning))" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="hsl(var(--warning))" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="colorOxyHacker" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="colorFranquia" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--secondary))" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="hsl(var(--secondary))" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis 
                      tickFormatter={(value) => formatCompact(value)} 
                      className="text-xs" 
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      width={80}
                    />
                    <ChartTooltip 
                      content={
                        <ChartTooltipContent 
                          formatter={(value, name) => {
                            const formatted = formatCurrency(Number(value));
                            return name === "total" ? <strong>{formatted}</strong> : formatted;
                          }} 
                        />
                      } 
                    />
                    <Legend />
                    <Area type="monotone" dataKey="modeloAtual" stackId="1" stroke="hsl(var(--primary))" fill="url(#colorModeloAtual)" name="Modelo Atual" />
                    <Area type="monotone" dataKey="o2Tax" stackId="1" stroke="hsl(var(--warning))" fill="url(#colorO2Tax)" name="O2 TAX" />
                    <Area type="monotone" dataKey="oxyHacker" stackId="1" stroke="hsl(var(--accent))" fill="url(#colorOxyHacker)" name="Oxy Hacker" />
                    <Area type="monotone" dataKey="franquia" stackId="1" stroke="hsl(var(--secondary))" fill="url(#colorFranquia)" name="Franquia" />
                    <Line type="monotone" dataKey="total" stroke="hsl(var(--foreground))" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Total" />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* Investment vs Return Chart with Temporal Shift */}
        <Card className="glass-card mb-8">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Investimento vs Retorno (Deslocamento Temporal)
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              O investimento de cada mês gera retorno no mês seguinte. Ex: Investimento de Jan gera vendas em Fev.
            </p>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart 
                  data={months.map((month, index) => {
                    const investimento = modeloAtualFunnel[index]?.investimento || 0;
                    // Retorno é o faturamento a vender do mês seguinte (que foi gerado pelo investimento deste mês)
                    const retornoMesSeguinte = index < months.length - 1 
                      ? modeloAtualFunnel[index + 1]?.faturamentoVender || 0
                      : modeloAtualFunnel[index]?.faturamentoVender || 0;
                    const roi = investimento > 0 ? retornoMesSeguinte / investimento : 0;
                    
                    return {
                      month,
                      investimento,
                      retorno: retornoMesSeguinte,
                      roi: roi.toFixed(2),
                    };
                  })} 
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorInvestimento" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="colorRetorno" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis 
                    tickFormatter={(value) => formatCompact(value)} 
                    className="text-xs" 
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    width={80}
                  />
                  <ChartTooltip 
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                          <p className="font-semibold mb-2">{label}</p>
                          <p className="text-sm text-destructive">
                            Investimento: {formatCurrency(payload[0]?.value as number)}
                          </p>
                          <p className="text-sm text-emerald-600">
                            Retorno (mês seguinte): {formatCurrency(payload[1]?.value as number)}
                          </p>
                          <p className="text-sm text-primary font-semibold mt-1">
                            ROI: {payload[0]?.payload?.roi}x
                          </p>
                        </div>
                      );
                    }} 
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="investimento" 
                    stroke="hsl(var(--destructive))" 
                    fill="url(#colorInvestimento)" 
                    name="Investimento (este mês)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="retorno" 
                    stroke="hsl(var(--success))" 
                    fill="url(#colorRetorno)" 
                    name="Retorno (mês seguinte)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
            
            {/* ROI Summary */}
            <div className="mt-4 grid grid-cols-3 md:grid-cols-6 gap-2">
              {months.slice(0, 6).map((month, index) => {
                const investimento = modeloAtualFunnel[index]?.investimento || 0;
                const retorno = index < months.length - 1 
                  ? modeloAtualFunnel[index + 1]?.faturamentoVender || 0
                  : modeloAtualFunnel[index]?.faturamentoVender || 0;
                const roi = investimento > 0 ? retorno / investimento : 0;
                
                return (
                  <div key={month} className="text-center p-2 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground">{month}</p>
                    <p className="text-sm font-bold text-primary">{roi.toFixed(1)}x</p>
                  </div>
                );
              })}
            </div>
            <div className="mt-2 grid grid-cols-3 md:grid-cols-6 gap-2">
              {months.slice(6).map((month, index) => {
                const realIndex = index + 6;
                const investimento = modeloAtualFunnel[realIndex]?.investimento || 0;
                const retorno = realIndex < months.length - 1 
                  ? modeloAtualFunnel[realIndex + 1]?.faturamentoVender || 0
                  : modeloAtualFunnel[realIndex]?.faturamentoVender || 0;
                const roi = investimento > 0 ? retorno / investimento : 0;
                
                return (
                  <div key={month} className="text-center p-2 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground">{month}</p>
                    <p className="text-sm font-bold text-primary">{roi.toFixed(1)}x</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Funnel Metrics Comparison */}
      <div>
        <h3 className="font-display text-2xl font-bold mb-6 flex items-center gap-2">
          <Target className="h-6 w-6 text-primary" />
          Métricas do Funil por BU
        </h3>

        <Card className="glass-card mb-8">
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>BU</TableHead>
                    <TableHead className="text-center">Ticket Médio</TableHead>
                    <TableHead className="text-center">Investimento</TableHead>
                    <TableHead className="text-center">% A Vender</TableHead>
                    <TableHead className="text-center">% Meta</TableHead>
                    <TableHead className="text-center">CPV</TableHead>
                    <TableHead className="text-center">Lead→MQL</TableHead>
                    <TableHead className="text-center">MQL→RM</TableHead>
                    <TableHead className="text-center">RM→RR</TableHead>
                    <TableHead className="text-center">RR→Prop</TableHead>
                    <TableHead className="text-center">Prop→Venda</TableHead>
                    <TableHead className="text-center">MQL→Venda</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(funnelMetrics).map(([key, metrics]) => {
                    const mqlToVenda = metrics.mqlToRm * metrics.rmToRr * metrics.rrToProp * metrics.propToVenda;
                    // Get funnel data for this BU to calculate percentages
                    const buFunnelData = key === 'modeloAtual' ? modeloAtualFunnel :
                                        key === 'o2Tax' ? o2TaxFunnel :
                                        key === 'oxyHacker' ? oxyHackerFunnel :
                                        franquiaFunnel;
                    const totalInv = buFunnelData.reduce((sum, d) => sum + d.investimento, 0);
                    const totalAVender = buFunnelData.reduce((sum, d) => sum + d.faturamentoVender, 0);
                    const totalMeta = buFunnelData.reduce((sum, d) => sum + d.faturamentoMeta, 0);
                    const pctAVender = totalAVender > 0 ? (totalInv / totalAVender) * 100 : 0;
                    const pctMeta = totalMeta > 0 ? (totalInv / totalMeta) * 100 : 0;
                    
                    return (
                      <TableRow key={key}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {metrics.icon}
                            {metrics.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{formatCurrency(metrics.ticketMedio)}</TableCell>
                        <TableCell className="text-center font-semibold text-primary">{formatCompact(totalInv)}</TableCell>
                        <TableCell className="text-center font-semibold text-amber-600">{pctAVender.toFixed(1)}%</TableCell>
                        <TableCell className="text-center font-semibold text-blue-600">{pctMeta.toFixed(1)}%</TableCell>
                        <TableCell className="text-center">{formatCurrency(metrics.cpv || metrics.cac)}</TableCell>
                        <TableCell className="text-center">{(metrics.leadToMql * 100).toFixed(0)}%</TableCell>
                        <TableCell className="text-center">{(metrics.mqlToRm * 100).toFixed(0)}%</TableCell>
                        <TableCell className="text-center">{(metrics.rmToRr * 100).toFixed(0)}%</TableCell>
                        <TableCell className="text-center">{(metrics.rrToProp * 100).toFixed(0)}%</TableCell>
                        <TableCell className="text-center">{(metrics.propToVenda * 100).toFixed(0)}%</TableCell>
                        <TableCell className="text-center font-semibold text-primary">{(mqlToVenda * 100).toFixed(1)}%</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Funil de Vendas Projetado 2026 */}
      <div>
        <h3 className="font-display text-2xl font-bold mb-6 flex items-center gap-2">
          <Filter className="h-6 w-6 text-primary" />
          Funil de Vendas Projetado 2026
        </h3>

        {/* Consolidated Funnel */}
        <div className="mb-8">
          <SalesFunnelVisual
            title="Consolidado 2026"
            icon={<Target className="h-5 w-5 text-primary" />}
            stages={[
              { stage: "Leads", value: consolidatedFunnelTotals.leads, percent: "-" },
              { stage: "MQL", value: consolidatedFunnelTotals.mqls, percent: `${(consolidatedFunnelTotals.leadToMql * 100).toFixed(0)}%` },
              { stage: "RM", value: consolidatedFunnelTotals.rms, percent: `${(consolidatedFunnelTotals.mqlToRm * 100).toFixed(0)}%` },
              { stage: "RR", value: consolidatedFunnelTotals.rrs, percent: `${(consolidatedFunnelTotals.rmToRr * 100).toFixed(0)}%` },
              { stage: "Proposta", value: consolidatedFunnelTotals.propostas, percent: `${(consolidatedFunnelTotals.rrToProp * 100).toFixed(0)}%` },
              { stage: "Venda", value: consolidatedFunnelTotals.vendas, percent: `${(consolidatedFunnelTotals.propToVenda * 100).toFixed(0)}%` },
            ]}
            mqlToVenda={consolidatedFunnelTotals.mqlToRm * consolidatedFunnelTotals.rmToRr * consolidatedFunnelTotals.rrToProp * consolidatedFunnelTotals.propToVenda}
            leadToVenda={consolidatedFunnelTotals.leadToMql * consolidatedFunnelTotals.mqlToRm * consolidatedFunnelTotals.rmToRr * consolidatedFunnelTotals.rrToProp * consolidatedFunnelTotals.propToVenda}
            color="hsl(var(--primary))"
          />
        </div>

        {/* BU Funnels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SalesFunnelVisual
            title="Modelo Atual"
            icon={<Building2 className="h-5 w-5 text-primary" />}
            stages={buildFunnelStages(modeloAtualFunnel, funnelMetrics.modeloAtual)}
            mqlToVenda={funnelMetrics.modeloAtual.mqlToRm * funnelMetrics.modeloAtual.rmToRr * funnelMetrics.modeloAtual.rrToProp * funnelMetrics.modeloAtual.propToVenda}
            leadToVenda={funnelMetrics.modeloAtual.leadToMql * funnelMetrics.modeloAtual.mqlToRm * funnelMetrics.modeloAtual.rmToRr * funnelMetrics.modeloAtual.rrToProp * funnelMetrics.modeloAtual.propToVenda}
            color="hsl(var(--primary))"
          />
          <SalesFunnelVisual
            title="O2 TAX"
            icon={<DollarSign className="h-5 w-5 text-warning" />}
            stages={buildFunnelStages(o2TaxFunnel, funnelMetrics.o2Tax)}
            mqlToVenda={funnelMetrics.o2Tax.mqlToRm * funnelMetrics.o2Tax.rmToRr * funnelMetrics.o2Tax.rrToProp * funnelMetrics.o2Tax.propToVenda}
            leadToVenda={funnelMetrics.o2Tax.leadToMql * funnelMetrics.o2Tax.mqlToRm * funnelMetrics.o2Tax.rmToRr * funnelMetrics.o2Tax.rrToProp * funnelMetrics.o2Tax.propToVenda}
            color="hsl(var(--warning))"
          />
          <SalesFunnelVisual
            title="Oxy Hacker"
            icon={<Rocket className="h-5 w-5 text-accent-foreground" />}
            stages={buildFunnelStages(oxyHackerFunnel, funnelMetrics.oxyHacker)}
            mqlToVenda={funnelMetrics.oxyHacker.mqlToRm * funnelMetrics.oxyHacker.rmToRr * funnelMetrics.oxyHacker.rrToProp * funnelMetrics.oxyHacker.propToVenda}
            leadToVenda={funnelMetrics.oxyHacker.leadToMql * funnelMetrics.oxyHacker.mqlToRm * funnelMetrics.oxyHacker.rmToRr * funnelMetrics.oxyHacker.rrToProp * funnelMetrics.oxyHacker.propToVenda}
            color="hsl(var(--accent))"
          />
          <SalesFunnelVisual
            title="Franquia"
            icon={<Users className="h-5 w-5 text-secondary-foreground" />}
            stages={buildFunnelStages(franquiaFunnel, funnelMetrics.franquia)}
            mqlToVenda={funnelMetrics.franquia.mqlToRm * funnelMetrics.franquia.rmToRr * funnelMetrics.franquia.rrToProp * funnelMetrics.franquia.propToVenda}
            leadToVenda={funnelMetrics.franquia.leadToMql * funnelMetrics.franquia.mqlToRm * funnelMetrics.franquia.rmToRr * funnelMetrics.franquia.rrToProp * funnelMetrics.franquia.propToVenda}
            color="hsl(var(--secondary))"
          />
        </div>
      </div>

      {/* KPI Resumo Realizado */}
      <Card className="glass-card border-emerald-500/30">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Meta Anual</p>
              <p className="text-2xl font-display font-bold">{formatCompact(totalFaturamento)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">A Vender Total</p>
              <p className="text-2xl font-display font-bold text-amber-600">{formatCompact(totalAVender)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Total Realizado</p>
              <p className="text-2xl font-display font-bold text-emerald-600">{formatCompact(totalRealized)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Atingimento vs A Vender</p>
              <p className="text-2xl font-display font-bold text-primary">
                {totalAVender > 0 ? ((totalRealized / totalAVender) * 100).toFixed(1) : 0}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Gap</p>
              <p className={`text-2xl font-display font-bold ${totalAVender - totalRealized > 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                {formatCompact(Math.abs(totalAVender - totalRealized))}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <Progress value={totalAVender > 0 ? Math.min((totalRealized / totalAVender) * 100, 100) : 0} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Consolidado Anual */}
      <Collapsible defaultOpen open={consolidadoOpen} onOpenChange={setConsolidadoOpen}>
        <CollapsibleTrigger className="w-full">
          <h3 className="font-display text-2xl font-bold mb-4 flex items-center gap-2 cursor-pointer hover:text-primary transition-colors">
            <BarChart3 className="h-6 w-6 text-primary" />
            Consolidado Anual
            {consolidadoOpen ? <ChevronUp className="h-5 w-5 ml-auto" /> : <ChevronDown className="h-5 w-5 ml-auto" />}
          </h3>
        </CollapsibleTrigger>
        <CollapsibleContent>
              <div className="space-y-6">
                <Card className="glass-card">
                  <CardContent className="pt-6 overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs font-bold">Mês</TableHead>
                          <TableHead className="text-xs text-right">Modelo Atual</TableHead>
                          <TableHead className="text-xs text-right">O2 TAX</TableHead>
                          <TableHead className="text-xs text-right">Oxy Hacker</TableHead>
                          <TableHead className="text-xs text-right">Franquia</TableHead>
                          <TableHead className="text-xs text-right font-bold">Meta Total</TableHead>
                          <TableHead className="text-xs text-right font-bold">DRE Total</TableHead>
                          <TableHead className="text-xs text-right font-bold">Ating. %</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(() => {
                          let sumMA = 0, sumO2 = 0, sumOH = 0, sumFR = 0, sumMeta = 0, sumDre = 0;
                          const rows = months.map((m) => {
                            const maMonth = effectiveModeloAtualFunnel.find((d: FunnelData) => d.month === m);
                            const o2Month = effectiveO2TaxFunnel.find((d: FunnelData) => d.month === m);
                            const ohMonth = effectiveOxyHackerFunnel.find((d: FunnelData) => d.month === m);
                            const frMonth = effectiveFranquiaFunnel.find((d: FunnelData) => d.month === m);
                            const ma = maMonth?.faturamentoMeta || 0;
                            const o2 = o2Month?.faturamentoMeta || 0;
                            const oh = ohMonth?.faturamentoMeta || 0;
                            const fr = frMonth?.faturamentoMeta || 0;
                            const metaTotal = ma + o2 + oh + fr;
                            const dreTotal = (dreByBU.modelo_atual?.[m] || 0) + (dreByBU.o2_tax?.[m] || 0) +
                              (dreByBU.oxy_hacker?.[m] || 0) + (dreByBU.franquia?.[m] || 0);
                            const ating = metaTotal > 0 ? (dreTotal / metaTotal) * 100 : 0;
                            sumMA += ma; sumO2 += o2; sumOH += oh; sumFR += fr;
                            sumMeta += metaTotal; sumDre += dreTotal;
                            return (
                              <TableRow key={m}>
                                <TableCell className="text-xs font-medium">{m}</TableCell>
                                <TableCell className="text-xs text-right font-mono">{formatCompact(ma)}</TableCell>
                                <TableCell className="text-xs text-right font-mono">{formatCompact(o2)}</TableCell>
                                <TableCell className="text-xs text-right font-mono">{formatCompact(oh)}</TableCell>
                                <TableCell className="text-xs text-right font-mono">{formatCompact(fr)}</TableCell>
                                <TableCell className="text-xs text-right font-mono font-bold">{formatCompact(metaTotal)}</TableCell>
                                <TableCell className="text-xs text-right font-mono font-bold">{formatCompact(dreTotal)}</TableCell>
                                <TableCell className={`text-xs text-right font-mono font-bold ${ating >= 100 ? 'text-emerald-600' : ating > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                                  {dreTotal > 0 ? `${ating.toFixed(1)}%` : '-'}
                                </TableCell>
                              </TableRow>
                            );
                          });
                          const totalAting = sumMeta > 0 ? (sumDre / sumMeta) * 100 : 0;
                          return (
                            <>
                              {rows}
                              <TableRow className="border-t-2 font-bold bg-muted/30">
                                <TableCell className="text-xs font-bold">Total</TableCell>
                                <TableCell className="text-xs text-right font-mono">{formatCompact(sumMA)}</TableCell>
                                <TableCell className="text-xs text-right font-mono">{formatCompact(sumO2)}</TableCell>
                                <TableCell className="text-xs text-right font-mono">{formatCompact(sumOH)}</TableCell>
                                <TableCell className="text-xs text-right font-mono">{formatCompact(sumFR)}</TableCell>
                                <TableCell className="text-xs text-right font-mono">{formatCompact(sumMeta)}</TableCell>
                                <TableCell className="text-xs text-right font-mono">{formatCompact(sumDre)}</TableCell>
                                <TableCell className={`text-xs text-right font-mono ${totalAting >= 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                  {sumDre > 0 ? `${totalAting.toFixed(1)}%` : '-'}
                                </TableCell>
                              </TableRow>
                            </>
                          );
                        })()}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="text-base">Meta vs DRE por Mês (Empilhado por BU)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[350px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={months.map((m) => {
                            const maMonth = effectiveModeloAtualFunnel.find((d: FunnelData) => d.month === m);
                            const o2Month = effectiveO2TaxFunnel.find((d: FunnelData) => d.month === m);
                            const ohMonth = effectiveOxyHackerFunnel.find((d: FunnelData) => d.month === m);
                            const frMonth = effectiveFranquiaFunnel.find((d: FunnelData) => d.month === m);
                            return {
                              month: m,
                              metaMA: maMonth?.faturamentoMeta || 0,
                              metaO2: o2Month?.faturamentoMeta || 0,
                              metaOH: ohMonth?.faturamentoMeta || 0,
                              metaFR: frMonth?.faturamentoMeta || 0,
                              dreTotal: (dreByBU.modelo_atual?.[m] || 0) + (dreByBU.o2_tax?.[m] || 0) +
                                (dreByBU.oxy_hacker?.[m] || 0) + (dreByBU.franquia?.[m] || 0),
                            };
                          })}
                          margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                          <YAxis tickFormatter={(v: number) => formatCompact(v)} tick={{ fontSize: 10 }} />
                          <Tooltip
                            formatter={(value: number, name: string) => {
                              const labels: Record<string, string> = {
                                metaMA: 'Meta Modelo Atual',
                                metaO2: 'Meta O2 TAX',
                                metaOH: 'Meta Oxy Hacker',
                                metaFR: 'Meta Franquia',
                                dreTotal: 'DRE Total',
                              };
                              return [formatCompact(value), labels[name] || name];
                            }}
                          />
                          <Legend
                            formatter={(value: string) => {
                              const labels: Record<string, string> = {
                                metaMA: 'Modelo Atual',
                                metaO2: 'O2 TAX',
                                metaOH: 'Oxy Hacker',
                                metaFR: 'Franquia',
                                dreTotal: 'DRE Total',
                              };
                              return labels[value] || value;
                            }}
                          />
                          <Bar dataKey="metaMA" stackId="meta" fill="hsl(var(--primary))" radius={[0, 0, 0, 0]} />
                          <Bar dataKey="metaO2" stackId="meta" fill="hsl(var(--warning))" radius={[0, 0, 0, 0]} />
                          <Bar dataKey="metaOH" stackId="meta" fill="hsl(var(--accent))" radius={[0, 0, 0, 0]} />
                          <Bar dataKey="metaFR" stackId="meta" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="dreTotal" fill="#10b981" radius={[4, 4, 0, 0]} opacity={0.7} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
        </CollapsibleContent>
      </Collapsible>

      {/* BU Detail Tables */}
      <div>
        <h3 className="font-display text-2xl font-bold mb-6 flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          Detalhamento por BU
        </h3>

        <div className="space-y-8">
          <BUInvestmentTable
            title="Modelo Atual"
            icon={funnelMetrics.modeloAtual.icon}
            funnelData={effectiveModeloAtualFunnel}
            color={funnelMetrics.modeloAtual.color}
            metrics={funnelMetrics.modeloAtual}
            showMrrBase={true}
            mrrBase={mrrInicial}
            churnMensal={churnMensal}
            retencaoVendas={retencaoVendas}
            mrrFinal={mrrDynamic.mrrPorMes["Dez"]}
            buKey="modelo_atual"
            editable={true}
            onAVenderChange={(month, value) => handleAVenderChange('modelo_atual', month, value)}
            realizedByMonth={realizedByBU.modelo_atual || {}}
            realizedFunnelByMonth={realizedFunnelByBU.modelo_atual || {}}
            dreByMonth={dreByBU.modelo_atual || {}}
            isLoadingRealized={isLoadingRealized}
            pendingMonths={getPendingMonths('modelo_atual')}
          />

          <BUInvestmentTable
            title="O2 TAX"
            icon={funnelMetrics.o2Tax.icon}
            funnelData={effectiveO2TaxFunnel}
            color={funnelMetrics.o2Tax.color}
            metrics={funnelMetrics.o2Tax}
            buKey="o2_tax"
            editable={true}
            onAVenderChange={(month, value) => handleAVenderChange('o2_tax', month, value)}
            realizedByMonth={realizedByBU.o2_tax || {}}
            realizedFunnelByMonth={realizedFunnelByBU.o2_tax || {}}
            dreByMonth={dreByBU.o2_tax || {}}
            isLoadingRealized={isLoadingRealized}
            pendingMonths={getPendingMonths('o2_tax')}
          />

          <BUInvestmentTable
            title="Oxy Hacker"
            icon={funnelMetrics.oxyHacker.icon}
            funnelData={effectiveOxyHackerFunnel}
            color={funnelMetrics.oxyHacker.color}
            metrics={funnelMetrics.oxyHacker}
            buKey="oxy_hacker"
            editable={true}
            onAVenderChange={(month, value) => handleAVenderChange('oxy_hacker', month, value)}
            realizedByMonth={realizedByBU.oxy_hacker || {}}
            realizedFunnelByMonth={realizedFunnelByBU.oxy_hacker || {}}
            dreByMonth={dreByBU.oxy_hacker || {}}
            isLoadingRealized={isLoadingRealized}
            pendingMonths={getPendingMonths('oxy_hacker')}
          />

          <BUInvestmentTable
            title="Franquia"
            icon={funnelMetrics.franquia.icon}
            funnelData={effectiveFranquiaFunnel}
            color={funnelMetrics.franquia.color}
            metrics={funnelMetrics.franquia}
            buKey="franquia"
            editable={true}
            onAVenderChange={(month, value) => handleAVenderChange('franquia', month, value)}
            realizedByMonth={realizedByBU.franquia || {}}
            realizedFunnelByMonth={realizedFunnelByBU.franquia || {}}
            dreByMonth={dreByBU.franquia || {}}
            isLoadingRealized={isLoadingRealized}
            pendingMonths={getPendingMonths('franquia')}
          />
        </div>
      </div>
    </div>
    {hasPendingChanges && (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-4xl w-[calc(100%-2rem)] bg-background/95 backdrop-blur border border-border rounded-xl p-4 shadow-2xl">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            {isAllBalanced ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
            ) : (
              <Info className="h-5 w-5 text-blue-500 shrink-0" />
            )}
            <span className="font-semibold text-sm">{totalChangeCount} alteraç{totalChangeCount > 1 ? 'ões' : 'ão'}</span>
            {Object.entries(pendingValidation).map(([bu, val]) => {
              const buLabel = bu === 'modelo_atual' ? 'Modelo Atual' : bu === 'o2_tax' ? 'O2 TAX' : bu === 'oxy_hacker' ? 'Oxy Hacker' : 'Franquia';
              const balanced = Math.abs(val.diff) < 100;
              return (
                <Badge key={bu} variant={balanced ? "default" : "destructive"} className="text-xs">
                  {buLabel}: {balanced ? (
                    <><CheckCircle2 className="h-3 w-3 ml-1 mr-1" /> Balanceado</>
                  ) : (
                    <>{val.diff > 0 ? '+' : ''}{formatCurrency(val.diff)}</>
                  )}
                </Badge>
              );
            })}
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={handleDiscardAll}>
              <Undo2 className="h-4 w-4 mr-1" />
              Descartar
            </Button>
            <Button 
              size="sm" 
              onClick={handleSaveAll} 
              className={isAllBalanced ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
              title={!isAllBalanced ? 'Equilibre o A Vender para poder salvar' : 'Salvar todas as alterações'}
            >
              <Save className="h-4 w-4 mr-1" />
              Salvar Todas
            </Button>
          </div>
        </div>
      </div>
    )}
    {isAdmin && (
      <MetaRedistributionPanel
        open={redistOpen}
        onOpenChange={setRedistOpen}
        dreByBU={dreByBU}
        isAdmin={isAdmin}
        year={2026}
      />
    )}
    </>
  );
}
