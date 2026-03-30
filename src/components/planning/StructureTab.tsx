import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { 
  Users, 
  Wrench, 
  Megaphone, 
  TrendingUp, 
  Building2, 
  UserCheck, 
  UserPlus,
  Target,
  MessageSquare,
  Palette,
  BarChart3,
  Workflow,
  HeartHandshake,
  Pencil,
  DollarSign,
  Calendar,
  Eye,
  EyeOff,
  Crown,
  PieChart,
  Calculator,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  ResponsiveContainer,
  Tooltip,
  Legend,
  Line,
  ComposedChart
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

// ============ TYPES ============

interface TeamMember {
  role: string;
  responsibilities: string[];
  status: "contratado" | "a contratar";
  person?: string;
  name?: string;
  quantity?: number;
  salary: number;
  area: "marketing" | "vendas" | "expansao";
  hiringMonth?: string;
  bu?: "modeloAtual" | "o2Tax" | "oxyHacker" | "franquia";
}

// ============ FUNNEL CALCULATION CONSTANTS ============

const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

// Capacidades de cada cargo
const CLOSER_CAPACITY = 14; // vendas por mês
const SDR_CAPACITY = 80;    // reuniões realizadas (RRs) por mês

// Dados do Modelo Atual (BU principal) - mesmo que no MediaInvestmentTab
const modeloAtualQuarterlyMetas = { Q1: 3750000, Q2: 4950000, Q3: 6400000, Q4: 8000000 };
const modeloAtualTicket = 17000;
const modeloAtualMrrBase = 2700000;
const modeloAtualChurn = 0.06;
const modeloAtualRetencao = 0.25;

// Taxas de conversão do funil (Modelo Atual)
const modeloAtualMetrics = {
  leadToMql: 0.35,
  mqlToRm: 0.60,
  rmToRr: 0.70,
  rrToProp: 0.75,
  propToVenda: 0.60,
};

// Dados das outras BUs
const buConfigs = {
  o2Tax: {
    name: "O2 TAX",
    cpv: 2500,
    ticket: 3500,
    investimentoInicialJan: 10000,
    investimentoMensalBase: 10000,
    crescimentoMensal: 0.15,
    metrics: { leadToMql: 0.35, mqlToRm: 0.60, rmToRr: 0.70, rrToProp: 0.75, propToVenda: 0.55 }
  },
  oxyHacker: {
    name: "Oxy Hacker",
    cpv: 5000,
    ticket: 7000,
    investimentoInicialJan: 15000,
    investimentoMensalBase: 15000,
    crescimentoMensal: 0.10,
    metrics: { leadToMql: 0.30, mqlToRm: 0.55, rmToRr: 0.65, rrToProp: 0.70, propToVenda: 0.50 }
  },
  franquia: {
    name: "Franquia",
    cpv: 12000,
    ticket: 50000,
    investimentoInicialJan: 20000,
    investimentoMensalBase: 20000,
    crescimentoMensal: 0.08,
    metrics: { leadToMql: 0.25, mqlToRm: 0.50, rmToRr: 0.60, rrToProp: 0.65, propToVenda: 0.45 }
  }
};

// Distribui metas trimestrais em mensais
function distributeQuarterlyToMonthly(
  quarterlyData: { Q1: number; Q2: number; Q3: number; Q4: number }
): Record<string, number> {
  const monthlyMetas: Record<string, number> = {};
  const quarterWeights = {
    Q1: { Jan: 0.30, Fev: 0.33, Mar: 0.37 },
    Q2: { Abr: 0.30, Mai: 0.33, Jun: 0.37 },
    Q3: { Jul: 0.30, Ago: 0.33, Set: 0.37 },
    Q4: { Out: 0.33, Nov: 0.37, Dez: 0.30 },
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

// Calcula MRR dinâmico e vendas necessárias
function calculateMrrAndRevenueToSell(
  mrrInicial: number, 
  churnRate: number, 
  retencaoRate: number,
  metasMensais: Record<string, number>,
  ticketMedio: number
): { vendasPorMes: Record<string, number>; revenueToSell: Record<string, number> } {
  const vendasPorMes: Record<string, number> = {};
  const revenueToSell: Record<string, number> = {};
  
  let mrrAtual = mrrInicial;
  let aVenderAnterior = 0;
  
  months.forEach((month, index) => {
    if (index > 0) {
      mrrAtual = mrrAtual * (1 - churnRate);
    }
    const retencaoDoMesAnterior = aVenderAnterior * retencaoRate;
    mrrAtual = mrrAtual + retencaoDoMesAnterior;
    
    const metaDoMes = metasMensais[month];
    const aVender = Math.max(0, metaDoMes - mrrAtual);
    revenueToSell[month] = aVender;
    
    const vendasDoMes = aVender / ticketMedio;
    vendasPorMes[month] = vendasDoMes;
    aVenderAnterior = aVender;
  });
  
  return { vendasPorMes, revenueToSell };
}

// Calcula funil reverso para obter RRs
function calculateReverseFunnel(
  vendasPorMes: Record<string, number>,
  metrics: typeof modeloAtualMetrics
): Record<string, { vendas: number; rrs: number }> {
  const funnelData: Record<string, { vendas: number; rrs: number }> = {};
  
  months.forEach(month => {
    const vendas = Math.ceil(vendasPorMes[month]);
    const propostas = vendas / metrics.propToVenda;
    const rrs = Math.ceil(propostas / metrics.rrToProp);
    
    funnelData[month] = { vendas, rrs };
  });
  
  return funnelData;
}

// Calcula meses de contratação para Closers e SDRs para uma BU específica
function calculateHiringMonthsForBU(
  buName: "modeloAtual" | "o2Tax" | "oxyHacker" | "franquia",
  initialClosers: number = 0,
  initialSDRs: number = 0
): { closerMonths: string[]; sdrMonths: string[] } {
  let vendasPorMes: Record<string, number> = {};
  let rrsPorMes: Record<string, number> = {};
  
  if (buName === "modeloAtual") {
    const metasMensais = distributeQuarterlyToMonthly(modeloAtualQuarterlyMetas);
    const { vendasPorMes: vendas } = calculateMrrAndRevenueToSell(
      modeloAtualMrrBase,
      modeloAtualChurn,
      modeloAtualRetencao,
      metasMensais,
      modeloAtualTicket
    );
    const funnelData = calculateReverseFunnel(vendas, modeloAtualMetrics);
    months.forEach(month => {
      vendasPorMes[month] = funnelData[month].vendas;
      rrsPorMes[month] = funnelData[month].rrs;
    });
  } else {
    const config = buConfigs[buName];
    let investimento = config.investimentoInicialJan;
    
    months.forEach((month, index) => {
      const vendas = Math.ceil(investimento / config.cpv);
      const propostas = vendas / config.metrics.propToVenda;
      const rrs = Math.ceil(propostas / config.metrics.rrToProp);
      
      vendasPorMes[month] = vendas;
      rrsPorMes[month] = rrs;
      
      // Crescimento mensal do investimento
      if (index < months.length - 1) {
        investimento = investimento * (1 + config.crescimentoMensal);
      }
    });
  }
  
  let currentClosers = initialClosers;
  let currentSDRs = initialSDRs;
  
  const closerMonths: string[] = [];
  const sdrMonths: string[] = [];
  
  months.forEach(month => {
    const vendas = vendasPorMes[month];
    const rrs = rrsPorMes[month];
    
    // Quantos Closers são necessários para as vendas do mês
    const closersNeeded = Math.ceil(vendas / CLOSER_CAPACITY);
    // Quantos SDRs são necessários para os RRs do mês
    const sdrsNeeded = Math.ceil(rrs / SDR_CAPACITY);
    
    // Contratar Closers se necessário
    while (currentClosers < closersNeeded) {
      closerMonths.push(month);
      currentClosers++;
    }
    
    // Contratar SDRs se necessário
    while (currentSDRs < sdrsNeeded) {
      sdrMonths.push(month);
      currentSDRs++;
    }
  });
  
  return { closerMonths, sdrMonths };
}

// Calcula contratações para todas as BUs
function calculateAllBUsHiring(): TeamMember[] {
  const allHirings: TeamMember[] = [];
  
  // Modelo Atual - começa com 0 Closers e 2 SDRs
  const modeloAtual = calculateHiringMonthsForBU("modeloAtual", 0, 2);
  modeloAtual.closerMonths.forEach(month => {
    allHirings.push({
      role: "Closer",
      responsibilities: ["Reuniões de venda", "Negociação", "Fechamento", "Onboarding inicial"],
      status: "a contratar",
      quantity: 1,
      salary: 0,
      area: "vendas",
      hiringMonth: month,
      bu: "modeloAtual"
    });
  });
  modeloAtual.sdrMonths.forEach(month => {
    allHirings.push({
      role: "SDR (Sales Development)",
      responsibilities: ["Qualificação de leads", "Agendamento de reuniões", "Follow-up", "CRM"],
      status: "a contratar",
      quantity: 1,
      salary: 0,
      area: "vendas",
      hiringMonth: month,
      bu: "modeloAtual"
    });
  });
  
  // O2 TAX - começa com 0 Closers e 0 SDRs
  const o2Tax = calculateHiringMonthsForBU("o2Tax", 0, 0);
  o2Tax.closerMonths.forEach(month => {
    allHirings.push({
      role: "Closer",
      responsibilities: ["Reuniões de venda", "Negociação", "Fechamento"],
      status: "a contratar",
      quantity: 1,
      salary: 0,
      area: "vendas",
      hiringMonth: month,
      bu: "o2Tax"
    });
  });
  o2Tax.sdrMonths.forEach(month => {
    allHirings.push({
      role: "SDR (Sales Development)",
      responsibilities: ["Qualificação de leads", "Agendamento de reuniões", "Follow-up"],
      status: "a contratar",
      quantity: 1,
      salary: 0,
      area: "vendas",
      hiringMonth: month,
      bu: "o2Tax"
    });
  });
  
  // Oxy Hacker - começa com 0 Closers e 0 SDRs
  const oxyHacker = calculateHiringMonthsForBU("oxyHacker", 0, 0);
  oxyHacker.closerMonths.forEach(month => {
    allHirings.push({
      role: "Closer",
      responsibilities: ["Reuniões de venda", "Negociação", "Fechamento"],
      status: "a contratar",
      quantity: 1,
      salary: 0,
      area: "vendas",
      hiringMonth: month,
      bu: "oxyHacker"
    });
  });
  oxyHacker.sdrMonths.forEach(month => {
    allHirings.push({
      role: "SDR (Sales Development)",
      responsibilities: ["Qualificação de leads", "Agendamento de reuniões", "Follow-up"],
      status: "a contratar",
      quantity: 1,
      salary: 0,
      area: "vendas",
      hiringMonth: month,
      bu: "oxyHacker"
    });
  });
  
  // Franquia - começa com 0 Closers e 0 SDRs
  const franquia = calculateHiringMonthsForBU("franquia", 0, 0);
  franquia.closerMonths.forEach(month => {
    allHirings.push({
      role: "Closer",
      responsibilities: ["Reuniões de venda", "Negociação", "Fechamento"],
      status: "a contratar",
      quantity: 1,
      salary: 0,
      area: "vendas",
      hiringMonth: month,
      bu: "franquia"
    });
  });
  franquia.sdrMonths.forEach(month => {
    allHirings.push({
      role: "SDR (Sales Development)",
      responsibilities: ["Qualificação de leads", "Agendamento de reuniões", "Follow-up"],
      status: "a contratar",
      quantity: 1,
      salary: 0,
      area: "vendas",
      hiringMonth: month,
      bu: "franquia"
    });
  });
  
  return allHirings;
}

// ============ INITIAL DATA ============

// Pré-calcula contratações para todas as BUs
const allBUsHirings = calculateAllBUsHiring();

const initialLeadershipTeam: TeamMember[] = [
  {
    role: "CEO",
    name: "Pedro Albite",
    responsibilities: ["Visão estratégica", "Gestão geral", "Relacionamento com investidores", "Cultura"],
    status: "contratado",
    person: "Contratado",
    salary: 7200,
    area: "vendas"
  },
  {
    role: "CMO",
    name: "Rafael Fleck",
    responsibilities: ["Estratégia de marketing", "Branding", "Growth", "Posicionamento de mercado"],
    status: "contratado",
    person: "Contratado",
    salary: 21000,
    area: "marketing"
  }
];

const initialMarketingTeam: TeamMember[] = [
  {
    role: "Head de Marketing",
    name: "Maria Eduarda",
    responsibilities: ["Estratégia geral", "Gestão do time", "Budget", "Alinhamento com vendas"],
    status: "contratado",
    person: "Contratado",
    salary: 7500,
    area: "marketing"
  },
  {
    role: "Social Media",
    name: "Rafaela Mendes",
    responsibilities: ["Calendário de posts", "Engajamento", "Comunidade", "Tendências"],
    status: "contratado",
    person: "Contratado",
    salary: 4500,
    area: "marketing"
  },
  {
    role: "Designer",
    name: "Daniel Fernandes",
    responsibilities: ["Criativos para ads", "Social media", "Materiais ricos", "Branding"],
    status: "contratado",
    person: "Contratado",
    salary: 5000,
    area: "marketing"
  }
];

const initialSalesTeam: TeamMember[] = [
  {
    role: "Head Comercial",
    name: "Daniel Trindade",
    responsibilities: ["Estratégia de vendas", "Gestão do pipeline", "Metas", "Treinamento"],
    status: "contratado",
    person: "Contratado",
    salary: 7500,
    area: "vendas",
    bu: "modeloAtual"
  },
  {
    role: "SDR (Sales Development)",
    name: "Amanda",
    responsibilities: ["Qualificação de leads", "Agendamento de reuniões", "Follow-up", "CRM"],
    status: "contratado",
    quantity: 1,
    salary: 2500,
    area: "vendas",
    bu: "modeloAtual"
  },
  {
    role: "SDR (Sales Development)",
    name: "Carol",
    responsibilities: ["Qualificação de leads", "Agendamento de reuniões", "Follow-up", "CRM"],
    status: "contratado",
    quantity: 1,
    salary: 2500,
    area: "vendas",
    bu: "modeloAtual"
  },
  // Equipe O2 Tax
  {
    role: "Tax Manager",
    name: "Lucas Ilha",
    responsibilities: ["Gestão de impostos", "Análise tributária", "Consultoria fiscal", "Compliance"],
    status: "contratado",
    person: "Contratado",
    salary: 6000,
    area: "vendas",
    bu: "o2Tax"
  },
  {
    role: "SDR (Sales Development)",
    name: "Carlos",
    responsibilities: ["Qualificação de leads", "Agendamento de reuniões", "Follow-up", "CRM"],
    status: "contratado",
    quantity: 1,
    salary: 2500,
    area: "vendas",
    bu: "o2Tax"
  },
  // Contratações de todas as BUs
  ...allBUsHirings
];

const initialExpansionTeam: TeamMember[] = [
  {
    role: "Gestor de Comunidade",
    responsibilities: ["Engajamento de franqueados", "Relacionamento", "Suporte", "Eventos"],
    status: "a contratar",
    quantity: 1,
    salary: 0,
    area: "expansao",
    bu: "franquia"
  },
  {
    role: "Gestor de Comunidade",
    responsibilities: ["Engajamento da comunidade Oxy Hacker", "Relacionamento", "Suporte", "Eventos"],
    status: "a contratar",
    quantity: 1,
    salary: 0,
    area: "expansao",
    bu: "oxyHacker"
  }
];

// ============ FERRAMENTAS DATA ============

const toolCategories = [
  {
    category: "CRM & Vendas",
    icon: Target,
    color: "from-blue-500 to-cyan-500",
    tools: [
      { name: "Pipedrive", description: "Gestão de pipeline e oportunidades", status: "ativo" },
      { name: "RD Station CRM", description: "Alternativa/integração com marketing", status: "avaliando" },
      { name: "Calendly", description: "Agendamento de reuniões", status: "ativo" }
    ]
  },
  {
    category: "Marketing & Automação",
    icon: Megaphone,
    color: "from-green-500 to-emerald-500",
    tools: [
      { name: "RD Station Marketing", description: "Automação e nutrição de leads", status: "ativo" },
      { name: "Meta Business Suite", description: "Gestão de Meta Ads", status: "ativo" },
      { name: "Google Ads", description: "Campanhas de busca e display", status: "ativo" },
      { name: "mLabs", description: "Agendamento de posts", status: "avaliando" }
    ]
  },
  {
    category: "Design & Conteúdo",
    icon: Palette,
    color: "from-purple-500 to-pink-500",
    tools: [
      { name: "Canva Pro", description: "Criação de artes e materiais", status: "ativo" },
      { name: "Figma", description: "Design de interfaces e protótipos", status: "ativo" },
      { name: "CapCut", description: "Edição de vídeos para social", status: "ativo" }
    ]
  },
  {
    category: "Comunicação",
    icon: MessageSquare,
    color: "from-amber-500 to-orange-500",
    tools: [
      { name: "Slack", description: "Comunicação interna do time", status: "ativo" },
      { name: "Google Meet", description: "Videoconferências", status: "ativo" },
      { name: "WhatsApp Business", description: "Atendimento ao cliente", status: "ativo" }
    ]
  },
  {
    category: "Dados & Analytics",
    icon: BarChart3,
    color: "from-rose-500 to-red-500",
    tools: [
      { name: "Google Analytics 4", description: "Análise de tráfego web", status: "ativo" },
      { name: "Looker Studio", description: "Dashboards e relatórios", status: "ativo" },
      { name: "Hotjar", description: "Mapas de calor e gravações", status: "avaliando" }
    ]
  },
  {
    category: "Operação & Produtividade",
    icon: Workflow,
    color: "from-indigo-500 to-violet-500",
    tools: [
      { name: "Notion", description: "Documentação e gestão de projetos", status: "ativo" },
      { name: "Google Workspace", description: "E-mail, Drive, Docs", status: "ativo" },
      { name: "Asana/Monday", description: "Gestão de tarefas", status: "avaliando" }
    ]
  }
];

// ============ HELPER FUNCTIONS ============

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

const getAreaLabel = (area: string) => {
  switch (area) {
    case "marketing": return "Marketing";
    case "vendas": return "Vendas";
    case "expansao": return "Expansão";
    default: return area;
  }
};

const getAreaColor = (area: string) => {
  switch (area) {
    case "marketing": return "text-green-500";
    case "vendas": return "text-blue-500";
    case "expansao": return "text-purple-500";
    default: return "text-foreground";
  }
};

// ============ INVESTMENT ANALYSIS DATA ============

// Faturamento projetado anual por BU (baseado nos dados de MonthlyRevenueTab)
const faturamentoAnualPorBU = {
  modeloAtual: 23100000,  // Q1: 3.75M + Q2: 4.95M + Q3: 6.4M + Q4: 8M = ~23.1M
  o2Tax: 2800000,         // ~R$ 2.8M anual
  oxyHacker: 5400000,     // ~R$ 5.4M anual
  franquia: 2800000,      // ~R$ 2.8M anual
};

// Investimento em mídia anual por BU (baseado nos dados de MediaInvestmentTab)
const investimentoMidiaAnualPorBU = {
  modeloAtual: 720000,    // ~R$ 60k/mês = R$ 720k/ano
  o2Tax: 180000,          // ~R$ 15k/mês = R$ 180k/ano
  oxyHacker: 300000,      // ~R$ 25k/mês = R$ 300k/ano
  franquia: 240000,       // ~R$ 20k/mês = R$ 240k/ano
};

// Faturamento mensal por BU (distribuído ao longo do ano com crescimento)
const faturamentoMensalPorBU: Record<string, Record<string, number>> = {
  modeloAtual: {
    Jan: 1125000, Fev: 1237500, Mar: 1387500,  // Q1: 3.75M
    Abr: 1485000, Mai: 1633500, Jun: 1831500,  // Q2: 4.95M
    Jul: 1920000, Ago: 2112000, Set: 2368000,  // Q3: 6.4M
    Out: 2640000, Nov: 2960000, Dez: 2400000   // Q4: 8M
  },
  o2Tax: {
    Jan: 100000, Fev: 115000, Mar: 132250,
    Abr: 152088, Mai: 174901, Jun: 201136,
    Jul: 231306, Ago: 266002, Set: 305902,
    Out: 351788, Nov: 404556, Dez: 465239
  },
  oxyHacker: {
    Jan: 250000, Fev: 275000, Mar: 302500,
    Abr: 332750, Mai: 366025, Jun: 402628,
    Jul: 442890, Ago: 487179, Set: 535897,
    Out: 589487, Nov: 648436, Dez: 713279
  },
  franquia: {
    Jan: 100000, Fev: 108000, Mar: 116640,
    Abr: 125971, Mai: 136049, Jun: 146933,
    Jul: 158687, Ago: 171382, Set: 185093,
    Out: 199900, Nov: 215892, Dez: 233164
  }
};

// Calcula faturamento total para rateio proporcional
const faturamentoTotal = Object.values(faturamentoAnualPorBU).reduce((a, b) => a + b, 0);

// Proporção de cada BU no faturamento total
const proporcaoPorBU = {
  modeloAtual: faturamentoAnualPorBU.modeloAtual / faturamentoTotal,
  o2Tax: faturamentoAnualPorBU.o2Tax / faturamentoTotal,
  oxyHacker: faturamentoAnualPorBU.oxyHacker / faturamentoTotal,
  franquia: faturamentoAnualPorBU.franquia / faturamentoTotal,
};

// Componente de análise de investimento
const InvestmentAnalysis = ({ allTeamData }: { allTeamData: TeamMember[] }) => {
  const [viewMode, setViewMode] = useState<"bu" | "time" | "evolucao">("bu");
  
  // Custos de estrutura mensais por área
  const custoMensalMarketing = allTeamData
    .filter(m => m.area === "marketing")
    .reduce((acc, m) => acc + (m.salary * (m.quantity || 1)), 0);
  
  const custoMensalVendas = allTeamData
    .filter(m => m.area === "vendas")
    .reduce((acc, m) => acc + (m.salary * (m.quantity || 1)), 0);
  
  const custoMensalExpansao = allTeamData
    .filter(m => m.area === "expansao")
    .reduce((acc, m) => acc + (m.salary * (m.quantity || 1)), 0);
  
  // Custos compartilhados (Marketing) - anualizados
  const custosCompartilhadosAnuais = custoMensalMarketing * 12;
  
  // Custos de vendas por BU (mensal)
  const custoMensalVendasPorBU = {
    modeloAtual: allTeamData
      .filter(m => m.area === "vendas" && (m.bu === "modeloAtual" || !m.bu))
      .reduce((acc, m) => acc + (m.salary * (m.quantity || 1)), 0),
    o2Tax: allTeamData
      .filter(m => m.area === "vendas" && m.bu === "o2Tax")
      .reduce((acc, m) => acc + (m.salary * (m.quantity || 1)), 0),
    oxyHacker: allTeamData
      .filter(m => m.area === "vendas" && m.bu === "oxyHacker")
      .reduce((acc, m) => acc + (m.salary * (m.quantity || 1)), 0),
    franquia: allTeamData
      .filter(m => m.area === "vendas" && m.bu === "franquia")
      .reduce((acc, m) => acc + (m.salary * (m.quantity || 1)), 0),
  };
  
  // Custos de expansão por BU (mensal)
  const custoMensalExpansaoPorBU = {
    modeloAtual: 0,
    o2Tax: 0,
    oxyHacker: allTeamData
      .filter(m => m.area === "expansao" && m.bu === "oxyHacker")
      .reduce((acc, m) => acc + (m.salary * (m.quantity || 1)), 0),
    franquia: allTeamData
      .filter(m => m.area === "expansao" && m.bu === "franquia")
      .reduce((acc, m) => acc + (m.salary * (m.quantity || 1)), 0),
  };
  
  // Calcula custo de estrutura total por BU (anual) com rateio de custos compartilhados
  const calcularCustoEstruturaPorBU = (bu: keyof typeof proporcaoPorBU) => {
    const custoVendasAnual = custoMensalVendasPorBU[bu] * 12;
    const custoExpansaoAnual = custoMensalExpansaoPorBU[bu] * 12;
    const custosCompartilhadosRateados = custosCompartilhadosAnuais * proporcaoPorBU[bu];
    return custoVendasAnual + custoExpansaoAnual + custosCompartilhadosRateados;
  };
  
  const buData = [
    { 
      key: "modeloAtual" as const, 
      name: "Modelo Atual", 
      color: "bg-primary/10 border-primary/30 text-primary",
      iconColor: "text-primary/50"
    },
    { 
      key: "o2Tax" as const, 
      name: "O2 TAX", 
      color: "bg-blue-500/10 border-blue-500/30 text-blue-500",
      iconColor: "text-blue-500/50"
    },
    { 
      key: "oxyHacker" as const, 
      name: "Oxy Hacker", 
      color: "bg-purple-500/10 border-purple-500/30 text-purple-500",
      iconColor: "text-purple-500/50"
    },
    { 
      key: "franquia" as const, 
      name: "Franquia", 
      color: "bg-amber-500/10 border-amber-500/30 text-amber-500",
      iconColor: "text-amber-500/50"
    },
  ];
  
  const timeData = [
    { 
      key: "marketing" as const, 
      name: "Marketing", 
      color: "bg-green-500/10 border-green-500/30 text-green-500",
      iconColor: "text-green-500/50"
    },
    { 
      key: "vendas" as const, 
      name: "Vendas", 
      color: "bg-blue-500/10 border-blue-500/30 text-blue-500",
      iconColor: "text-blue-500/50"
    },
    { 
      key: "expansao" as const, 
      name: "Expansão", 
      color: "bg-purple-500/10 border-purple-500/30 text-purple-500",
      iconColor: "text-purple-500/50"
    },
  ];
  
  // Custos anuais por time
  const custoPorTime = {
    marketing: custoMensalMarketing * 12,
    vendas: custoMensalVendas * 12,
    expansao: custoMensalExpansao * 12,
  };
  
  const custoTotalTime = Object.values(custoPorTime).reduce((a, b) => a + b, 0);
  const faturamentoTotal = Object.values(faturamentoAnualPorBU).reduce((a, b) => a + b, 0);
  
  // ===== EVOLUÇÃO MENSAL =====
  // Calcula faturamento mensal total (todas as BUs)
  const calcularFaturamentoMensal = () => {
    return months.map((month) => {
      const modeloAtual = faturamentoMensalPorBU.modeloAtual[month];
      const o2Tax = faturamentoMensalPorBU.o2Tax[month];
      const oxyHacker = faturamentoMensalPorBU.oxyHacker[month];
      const franquia = faturamentoMensalPorBU.franquia[month];
      return {
        month,
        modeloAtual,
        o2Tax,
        oxyHacker,
        franquia,
        total: modeloAtual + o2Tax + oxyHacker + franquia
      };
    });
  };
  
  // Calcula custo mensal acumulado por time (considerando contratações)
  const calcularCustoMensalPorTime = () => {
    return months.map((month, monthIndex) => {
      // Filtrar membros contratados ou que serão contratados até este mês
      const membrosAtivos = allTeamData.filter(m => {
        if (m.status === "contratado") return true;
        if (m.hiringMonth) {
          const hiringIndex = months.indexOf(m.hiringMonth);
          return hiringIndex !== -1 && hiringIndex <= monthIndex;
        }
        return false;
      });
      
      const custoMarketing = membrosAtivos
        .filter(m => m.area === "marketing")
        .reduce((acc, m) => acc + (m.salary * (m.quantity || 1)), 0);
      
      const custoVendas = membrosAtivos
        .filter(m => m.area === "vendas")
        .reduce((acc, m) => acc + (m.salary * (m.quantity || 1)), 0);
      
      const custoExpansao = membrosAtivos
        .filter(m => m.area === "expansao")
        .reduce((acc, m) => acc + (m.salary * (m.quantity || 1)), 0);
      
      return {
        month,
        marketing: custoMarketing,
        vendas: custoVendas,
        expansao: custoExpansao,
        total: custoMarketing + custoVendas + custoExpansao
      };
    });
  };
  
  const faturamentoMensal = calcularFaturamentoMensal();
  const custoMensalPorTime = calcularCustoMensalPorTime();
  
  // Dados de evolução para gráfico e tabela
  const evolucaoData = months.map((month, index) => {
    const fat = faturamentoMensal[index].total;
    const custos = custoMensalPorTime[index];
    
    return {
      month,
      faturamento: fat,
      marketing: custos.marketing,
      vendas: custos.vendas,
      expansao: custos.expansao,
      totalTime: custos.total,
      pctMarketing: fat > 0 ? (custos.marketing / fat) * 100 : 0,
      pctVendas: fat > 0 ? (custos.vendas / fat) * 100 : 0,
      pctExpansao: fat > 0 ? (custos.expansao / fat) * 100 : 0,
      pctTotal: fat > 0 ? (custos.total / fat) * 100 : 0,
    };
  });
  
  // Estatísticas de evolução
  const evolucaoStats = useMemo(() => {
    const pctTotais = evolucaoData.map(d => d.pctTotal);
    const minPct = Math.min(...pctTotais);
    const maxPct = Math.max(...pctTotais);
    const avgPct = pctTotais.reduce((a, b) => a + b, 0) / pctTotais.length;
    const tendencia = pctTotais[pctTotais.length - 1] - pctTotais[0];
    
    const minMonth = evolucaoData.find(d => d.pctTotal === minPct)?.month || "";
    const maxMonth = evolucaoData.find(d => d.pctTotal === maxPct)?.month || "";
    
    return { minPct, maxPct, avgPct, tendencia, minMonth, maxMonth };
  }, [evolucaoData]);
  
  const chartConfig = {
    marketing: {
      label: "Marketing",
      color: "hsl(142, 76%, 36%)",
    },
    vendas: {
      label: "Vendas",
      color: "hsl(217, 91%, 60%)",
    },
    expansao: {
      label: "Expansão",
      color: "hsl(270, 60%, 50%)",
    },
    faturamento: {
      label: "Faturamento",
      color: "hsl(45, 93%, 47%)",
    },
  };
  
  // Calcular totais por BU
  const totais = buData.reduce((acc, bu) => {
    const custoEstrutura = calcularCustoEstruturaPorBU(bu.key);
    const custoMidia = investimentoMidiaAnualPorBU[bu.key];
    const faturamento = faturamentoAnualPorBU[bu.key];
    
    return {
      faturamento: acc.faturamento + faturamento,
      estrutura: acc.estrutura + custoEstrutura,
      midia: acc.midia + custoMidia,
    };
  }, { faturamento: 0, estrutura: 0, midia: 0 });
  
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 text-white">
              <PieChart className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Análise de Investimento vs Faturamento</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {viewMode === "bu" 
                  ? "% do investimento (time + mídia) em relação ao faturamento projetado — Custos compartilhados rateados proporcionalmente"
                  : "Custos anuais por área/time em relação ao faturamento total projetado"
                }
              </p>
            </div>
          </div>
          
          <Select value={viewMode} onValueChange={(v) => setViewMode(v as "bu" | "time" | "evolucao")}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Visualizar por..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bu">Por BU</SelectItem>
              <SelectItem value="time">Por Time</SelectItem>
              <SelectItem value="evolucao">Evolução Mensal</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {viewMode === "bu" ? (
          <>
            {/* Cards por BU */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {buData.map(bu => {
                const faturamento = faturamentoAnualPorBU[bu.key];
                const custoEstrutura = calcularCustoEstruturaPorBU(bu.key);
                const custoMidia = investimentoMidiaAnualPorBU[bu.key];
                const custoTotal = custoEstrutura + custoMidia;
                
                const pctEstrutura = (custoEstrutura / faturamento) * 100;
                const pctMidia = (custoMidia / faturamento) * 100;
                const pctTotal = (custoTotal / faturamento) * 100;
                
                return (
                  <Card key={bu.key} className={`${bu.color}`}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold">{bu.name}</h4>
                        <Calculator className={`h-5 w-5 ${bu.iconColor}`} />
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Faturamento Projetado</span>
                          <span className="font-bold font-mono">
                            R$ {(faturamento / 1000000).toFixed(2)}M
                          </span>
                        </div>
                        
                        <Separator className="bg-border/50" />
                        
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Estrutura de Time</span>
                          <span className="font-mono">
                            R$ {(custoEstrutura / 1000).toFixed(0)}k
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">% do Faturamento</span>
                          <Badge variant="outline" className="font-mono bg-background/50">
                            {pctEstrutura.toFixed(1)}%
                          </Badge>
                        </div>
                        
                        <Separator className="bg-border/50" />
                        
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Investimento em Mídia</span>
                          <span className="font-mono">
                            R$ {(custoMidia / 1000).toFixed(0)}k
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">% do Faturamento</span>
                          <Badge variant="outline" className="font-mono bg-background/50">
                            {pctMidia.toFixed(1)}%
                          </Badge>
                        </div>
                        
                        <Separator className="bg-border/50" />
                        
                        <div className="flex justify-between items-center pt-1">
                          <span className="font-semibold">Investimento Total</span>
                          <span className="font-bold font-mono">
                            R$ {(custoTotal / 1000).toFixed(0)}k
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-semibold">% Total do Faturamento</span>
                          <Badge className="font-mono text-base px-3 py-1">
                            {pctTotal.toFixed(1)}%
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            
            {/* Tabela Comparativa por BU */}
            <div className="rounded-lg border border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>BU</TableHead>
                    <TableHead className="text-right">Faturamento</TableHead>
                    <TableHead className="text-right">Time</TableHead>
                    <TableHead className="text-right">% Time</TableHead>
                    <TableHead className="text-right">Mídia</TableHead>
                    <TableHead className="text-right">% Mídia</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">% Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {buData.map(bu => {
                    const faturamento = faturamentoAnualPorBU[bu.key];
                    const custoEstrutura = calcularCustoEstruturaPorBU(bu.key);
                    const custoMidia = investimentoMidiaAnualPorBU[bu.key];
                    const custoTotal = custoEstrutura + custoMidia;
                    
                    const pctEstrutura = (custoEstrutura / faturamento) * 100;
                    const pctMidia = (custoMidia / faturamento) * 100;
                    const pctTotal = (custoTotal / faturamento) * 100;
                    
                    return (
                      <TableRow key={bu.key} className="hover:bg-muted/20">
                        <TableCell className="font-medium">{bu.name}</TableCell>
                        <TableCell className="text-right font-mono">
                          R$ {(faturamento / 1000000).toFixed(2)}M
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          R$ {(custoEstrutura / 1000).toFixed(0)}k
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className="font-mono">
                            {pctEstrutura.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          R$ {(custoMidia / 1000).toFixed(0)}k
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className="font-mono">
                            {pctMidia.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          R$ {(custoTotal / 1000).toFixed(0)}k
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge className="font-mono">
                            {pctTotal.toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                <TableFooter>
                  <TableRow className="bg-primary/5">
                    <TableCell className="font-bold text-primary">TOTAL</TableCell>
                    <TableCell className="text-right font-mono font-bold text-primary">
                      R$ {(totais.faturamento / 1000000).toFixed(2)}M
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-primary">
                      R$ {(totais.estrutura / 1000).toFixed(0)}k
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="font-mono bg-primary/10 text-primary border-primary/30">
                        {((totais.estrutura / totais.faturamento) * 100).toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-primary">
                      R$ {(totais.midia / 1000).toFixed(0)}k
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="font-mono bg-primary/10 text-primary border-primary/30">
                        {((totais.midia / totais.faturamento) * 100).toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-primary">
                      R$ {((totais.estrutura + totais.midia) / 1000).toFixed(0)}k
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge className="font-mono bg-primary text-primary-foreground">
                        {(((totais.estrutura + totais.midia) / totais.faturamento) * 100).toFixed(1)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
            
            {/* Legenda explicativa */}
            <div className="p-4 rounded-lg bg-muted/30 border border-border/30">
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                Metodologia de Rateio
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>Custos Diretos</strong>: Vendas e Expansão são alocados diretamente à BU correspondente</li>
                <li>• <strong>Custos Compartilhados</strong>: Marketing (R$ {formatCurrency(custoMensalMarketing)}/mês) é rateado proporcionalmente ao faturamento de cada BU</li>
                <li>• <strong>Proporções</strong>: Modelo Atual ({(proporcaoPorBU.modeloAtual * 100).toFixed(1)}%), O2 TAX ({(proporcaoPorBU.o2Tax * 100).toFixed(1)}%), Oxy Hacker ({(proporcaoPorBU.oxyHacker * 100).toFixed(1)}%), Franquia ({(proporcaoPorBU.franquia * 100).toFixed(1)}%)</li>
              </ul>
            </div>
          </>
        ) : viewMode === "time" ? (
          <>
            {/* Cards por Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {timeData.map(time => {
                const custoAnual = custoPorTime[time.key];
                const pctDoTotal = custoTotalTime > 0 ? (custoAnual / custoTotalTime) * 100 : 0;
                const pctDoFaturamento = faturamentoTotal > 0 ? (custoAnual / faturamentoTotal) * 100 : 0;
                
                return (
                  <Card key={time.key} className={`${time.color}`}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold">{time.name}</h4>
                        <Users className={`h-5 w-5 ${time.iconColor}`} />
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Custo Anual</span>
                          <span className="font-bold font-mono">
                            R$ {(custoAnual / 1000).toFixed(0)}k
                          </span>
                        </div>
                        
                        <Separator className="bg-border/50" />
                        
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">% do Total de Times</span>
                          <Badge variant="outline" className="font-mono bg-background/50">
                            {pctDoTotal.toFixed(1)}%
                          </Badge>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">% do Faturamento Total</span>
                          <Badge className="font-mono text-base px-3 py-1">
                            {pctDoFaturamento.toFixed(1)}%
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            
            {/* Tabela Comparativa por Time */}
            <div className="rounded-lg border border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Time</TableHead>
                    <TableHead className="text-right">Custo Anual</TableHead>
                    <TableHead className="text-right">% do Total Time</TableHead>
                    <TableHead className="text-right">% do Faturamento Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timeData.map(time => {
                    const custoAnual = custoPorTime[time.key];
                    const pctDoTotal = custoTotalTime > 0 ? (custoAnual / custoTotalTime) * 100 : 0;
                    const pctDoFaturamento = faturamentoTotal > 0 ? (custoAnual / faturamentoTotal) * 100 : 0;
                    
                    return (
                      <TableRow key={time.key} className="hover:bg-muted/20">
                        <TableCell className="font-medium">{time.name}</TableCell>
                        <TableCell className="text-right font-mono">
                          R$ {(custoAnual / 1000).toFixed(0)}k
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className="font-mono">
                            {pctDoTotal.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge className="font-mono">
                            {pctDoFaturamento.toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                <TableFooter>
                  <TableRow className="bg-primary/5">
                    <TableCell className="font-bold text-primary">TOTAL</TableCell>
                    <TableCell className="text-right font-mono font-bold text-primary">
                      R$ {(custoTotalTime / 1000).toFixed(0)}k
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="font-mono bg-primary/10 text-primary border-primary/30">
                        100%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge className="font-mono bg-primary text-primary-foreground">
                        {((custoTotalTime / faturamentoTotal) * 100).toFixed(1)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
            
            {/* Legenda explicativa */}
            <div className="p-4 rounded-lg bg-muted/30 border border-border/30">
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                Visão por Área/Time
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>Marketing</strong>: Time de marketing incluindo CMO (R$ {formatCurrency(custoMensalMarketing)}/mês)</li>
                <li>• <strong>Vendas</strong>: Time comercial incluindo CEO (R$ {formatCurrency(custoMensalVendas)}/mês)</li>
                <li>• <strong>Expansão</strong>: Time de expansão e sucesso do cliente (R$ {formatCurrency(custoMensalExpansao)}/mês)</li>
                <li>• <strong>Faturamento Total</strong>: R$ {(faturamentoTotal / 1000000).toFixed(2)}M (soma de todas as BUs)</li>
              </ul>
            </div>
          </>
        ) : (
          <>
            {/* Cards de destaque */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card className="bg-green-500/10 border-green-500/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowDownRight className="h-4 w-4 text-green-500" />
                    <span className="text-xs text-muted-foreground">Menor %</span>
                  </div>
                  <div className="text-2xl font-bold text-green-500">{evolucaoStats.minPct.toFixed(1)}%</div>
                  <div className="text-xs text-muted-foreground">{evolucaoStats.minMonth}</div>
                </CardContent>
              </Card>
              
              <Card className="bg-red-500/10 border-red-500/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowUpRight className="h-4 w-4 text-red-500" />
                    <span className="text-xs text-muted-foreground">Maior %</span>
                  </div>
                  <div className="text-2xl font-bold text-red-500">{evolucaoStats.maxPct.toFixed(1)}%</div>
                  <div className="text-xs text-muted-foreground">{evolucaoStats.maxMonth}</div>
                </CardContent>
              </Card>
              
              <Card className="bg-blue-500/10 border-blue-500/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="h-4 w-4 text-blue-500" />
                    <span className="text-xs text-muted-foreground">Média Anual</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-500">{evolucaoStats.avgPct.toFixed(1)}%</div>
                  <div className="text-xs text-muted-foreground">do faturamento</div>
                </CardContent>
              </Card>
              
              <Card className={`${evolucaoStats.tendencia <= 0 ? "bg-green-500/10 border-green-500/30" : "bg-amber-500/10 border-amber-500/30"}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    {evolucaoStats.tendencia <= 0 ? (
                      <TrendingDown className="h-4 w-4 text-green-500" />
                    ) : (
                      <TrendingUp className="h-4 w-4 text-amber-500" />
                    )}
                    <span className="text-xs text-muted-foreground">Tendência</span>
                  </div>
                  <div className={`text-2xl font-bold ${evolucaoStats.tendencia <= 0 ? "text-green-500" : "text-amber-500"}`}>
                    {evolucaoStats.tendencia > 0 ? "+" : ""}{evolucaoStats.tendencia.toFixed(1)}pp
                  </div>
                  <div className="text-xs text-muted-foreground">Jan → Dez</div>
                </CardContent>
              </Card>
            </div>
            
            {/* Gráfico 1 - Faturamento */}
            <Card className="p-4 mb-6">
              <h4 className="font-semibold text-sm mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-amber-500" />
                📈 Evolução do Faturamento Mensal
              </h4>
              <ChartContainer config={chartConfig} className="h-[220px] !aspect-auto">
                <AreaChart data={evolucaoData} margin={{ top: 10, right: 30, left: 60, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                  <XAxis 
                    dataKey="month" 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    tickFormatter={(value) => `R$ ${(value / 1000000).toFixed(1)}M`}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    width={70}
                  />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (!active || !payload || !payload[0]) return null;
                      return (
                        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                          <p className="font-semibold mb-1">{label}</p>
                          <div className="flex items-center gap-2 text-sm">
                            <div className="w-3 h-3 rounded-full bg-amber-500" />
                            <span className="text-muted-foreground">Faturamento:</span>
                            <span className="font-mono font-medium">
                              R$ {((payload[0].value as number) / 1000000).toFixed(2)}M
                            </span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="faturamento" 
                    fill="hsl(45, 93%, 47%)" 
                    fillOpacity={0.3}
                    stroke="hsl(45, 93%, 47%)" 
                    strokeWidth={2}
                    name="Faturamento"
                  />
                </AreaChart>
              </ChartContainer>
            </Card>

            {/* Gráfico 2 - Custos por Time com % do faturamento */}
            <Card className="p-4 mb-8">
              <h4 className="font-semibold text-sm mb-4 flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                👥 Evolução dos Custos por Time
              </h4>
              <ChartContainer config={chartConfig} className="h-[280px] !aspect-auto">
                <ComposedChart data={evolucaoData} margin={{ top: 10, right: 70, left: 60, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                  <XAxis 
                    dataKey="month" 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                  />
                  <YAxis 
                    yAxisId="left"
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    width={65}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    tickFormatter={(value) => `${value.toFixed(0)}%`}
                    domain={[0, 10]}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    width={50}
                  />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (!active || !payload) return null;
                      return (
                        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                          <p className="font-semibold mb-2">{label}</p>
                          {payload.map((entry: any, index: number) => (
                            <div key={index} className="flex items-center gap-2 text-sm">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: entry.color }}
                              />
                              <span className="text-muted-foreground">{entry.name}:</span>
                              <span className="font-mono font-medium">
                                {entry.dataKey === 'pctTotal'
                                  ? `${entry.value.toFixed(1)}%`
                                  : `R$ ${(entry.value / 1000).toFixed(0)}k`
                                }
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    }}
                  />
                  <Legend />
                  
                  {/* Áreas empilhadas para custos dos times */}
                  <Area 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="marketing" 
                    stackId="1" 
                    fill="hsl(142, 76%, 36%)" 
                    stroke="hsl(142, 76%, 36%)"
                    name="Marketing"
                  />
                  <Area 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="vendas" 
                    stackId="1" 
                    fill="hsl(217, 91%, 60%)" 
                    stroke="hsl(217, 91%, 60%)"
                    name="Vendas"
                  />
                  <Area 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="expansao" 
                    stackId="1" 
                    fill="hsl(270, 60%, 50%)" 
                    stroke="hsl(270, 60%, 50%)"
                    name="Expansão"
                  />
                  
                  {/* Linha de % do faturamento */}
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="pctTotal" 
                    stroke="hsl(0, 84%, 60%)" 
                    strokeWidth={2}
                    dot={{ fill: "hsl(0, 84%, 60%)", strokeWidth: 2, r: 3 }}
                    name="% do Faturamento"
                  />
                </ComposedChart>
              </ChartContainer>
            </Card>
            
            {/* Tabela de evolução mensal */}
            <Card className="p-4">
              <h4 className="font-semibold text-sm mb-4">Detalhamento Mensal</h4>
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="sticky left-0 bg-muted/30">Mês</TableHead>
                    <TableHead className="text-right">Faturamento</TableHead>
                    <TableHead className="text-right">Marketing</TableHead>
                    <TableHead className="text-right">% Mkt</TableHead>
                    <TableHead className="text-right">Vendas</TableHead>
                    <TableHead className="text-right">% Vendas</TableHead>
                    <TableHead className="text-right">Expansão</TableHead>
                    <TableHead className="text-right">% Exp</TableHead>
                    <TableHead className="text-right">Total Time</TableHead>
                    <TableHead className="text-right">% Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {evolucaoData.map((row, index) => (
                    <TableRow key={row.month} className="hover:bg-muted/20">
                      <TableCell className="font-medium sticky left-0 bg-background">{row.month}</TableCell>
                      <TableCell className="text-right font-mono">
                        R$ {(row.faturamento / 1000000).toFixed(2)}M
                      </TableCell>
                      <TableCell className="text-right font-mono text-green-500">
                        R$ {(row.marketing / 1000).toFixed(0)}k
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="font-mono text-green-500 border-green-500/30">
                          {row.pctMarketing.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-blue-500">
                        R$ {(row.vendas / 1000).toFixed(0)}k
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="font-mono text-blue-500 border-blue-500/30">
                          {row.pctVendas.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-purple-500">
                        R$ {(row.expansao / 1000).toFixed(0)}k
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="font-mono text-purple-500 border-purple-500/30">
                          {row.pctExpansao.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        R$ {(row.totalTime / 1000).toFixed(0)}k
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge className="font-mono">
                          {row.pctTotal.toFixed(1)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow className="bg-primary/5">
                    <TableCell className="font-bold text-primary sticky left-0">TOTAL ANUAL</TableCell>
                    <TableCell className="text-right font-mono font-bold text-primary">
                      R$ {(evolucaoData.reduce((a, b) => a + b.faturamento, 0) / 1000000).toFixed(2)}M
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-green-500">
                      R$ {(evolucaoData.reduce((a, b) => a + b.marketing, 0) / 1000).toFixed(0)}k
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="font-mono bg-green-500/10 text-green-500 border-green-500/30">
                        {evolucaoStats.avgPct > 0 ? (
                          (evolucaoData.reduce((a, b) => a + b.marketing, 0) / evolucaoData.reduce((a, b) => a + b.faturamento, 0) * 100).toFixed(1)
                        ) : "0.0"}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-blue-500">
                      R$ {(evolucaoData.reduce((a, b) => a + b.vendas, 0) / 1000).toFixed(0)}k
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="font-mono bg-blue-500/10 text-blue-500 border-blue-500/30">
                        {evolucaoStats.avgPct > 0 ? (
                          (evolucaoData.reduce((a, b) => a + b.vendas, 0) / evolucaoData.reduce((a, b) => a + b.faturamento, 0) * 100).toFixed(1)
                        ) : "0.0"}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-purple-500">
                      R$ {(evolucaoData.reduce((a, b) => a + b.expansao, 0) / 1000).toFixed(0)}k
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="font-mono bg-purple-500/10 text-purple-500 border-purple-500/30">
                        {evolucaoStats.avgPct > 0 ? (
                          (evolucaoData.reduce((a, b) => a + b.expansao, 0) / evolucaoData.reduce((a, b) => a + b.faturamento, 0) * 100).toFixed(1)
                        ) : "0.0"}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-primary">
                      R$ {(evolucaoData.reduce((a, b) => a + b.totalTime, 0) / 1000).toFixed(0)}k
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge className="font-mono bg-primary text-primary-foreground">
                        {((evolucaoData.reduce((a, b) => a + b.totalTime, 0) / evolucaoData.reduce((a, b) => a + b.faturamento, 0)) * 100).toFixed(1)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
              </div>
            </Card>
            
            {/* Legenda explicativa */}
            <div className="p-4 rounded-lg bg-muted/30 border border-border/30 mt-6">
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                Evolução Mensal: Investimento vs Faturamento
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>Áreas empilhadas</strong>: Mostram a evolução dos custos de cada time ao longo do ano</li>
                <li>• <strong>Linha amarela</strong>: Representa o faturamento projetado mensal (todas as BUs)</li>
                <li>• <strong>Tendência</strong>: {evolucaoStats.tendencia <= 0 
                  ? `Queda de ${Math.abs(evolucaoStats.tendencia).toFixed(1)}pp no % de custos entre Jan e Dez (economia de escala)`
                  : `Aumento de ${evolucaoStats.tendencia.toFixed(1)}pp no % de custos entre Jan e Dez`
                }</li>
                <li>• <strong>Contratações</strong>: Os custos crescem conforme novas contratações são realizadas ao longo do ano</li>
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

// ============ COMPONENTS ============

const TeamMemberCard = ({ member, color }: { member: TeamMember; color: string }) => (
  <div className="flex items-start gap-3 p-4 rounded-lg bg-background/50 border border-border/30 hover:border-border/50 transition-all">
    <div className={`p-2 rounded-lg bg-gradient-to-br ${color} text-white shrink-0`}>
      {member.status === "contratado" ? (
        <UserCheck className="h-4 w-4" />
      ) : (
        <UserPlus className="h-4 w-4" />
      )}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <h4 className="font-semibold text-sm">{member.role}</h4>
        {member.quantity && (
          <Badge variant="outline" className="text-xs">
            x{member.quantity}
          </Badge>
        )}
        <Badge 
          variant={member.status === "contratado" ? "default" : "secondary"}
          className={`text-xs ${member.status === "contratado" ? "bg-green-500/20 text-green-500 border-green-500/30" : "bg-amber-500/20 text-amber-500 border-amber-500/30"}`}
        >
          {member.status === "contratado" ? "Contratado" : "A contratar"}
        </Badge>
      </div>
      <div className="flex flex-wrap gap-1">
        {member.responsibilities.map((resp: string, i: number) => (
          <Badge key={i} variant="outline" className="text-xs font-normal bg-background/80">
            {resp}
          </Badge>
        ))}
      </div>
    </div>
  </div>
);

const EmptyTeamMessage = () => (
  <div className="flex flex-col items-center justify-center p-8 text-center">
    <UserPlus className="h-12 w-12 text-muted-foreground/30 mb-3" />
    <p className="text-muted-foreground text-sm">Nenhum cargo definido ainda</p>
  </div>
);

const TeamSection = ({ 
  title, 
  icon: Icon, 
  team, 
  color,
  bgColor 
}: { 
  title: string; 
  icon: any; 
  team: TeamMember[];
  color: string;
  bgColor: string;
}) => {
  const contratadosList = team.filter(m => m.status === "contratado");
  const aContratarList = team.filter(m => m.status === "a contratar");
  const contratados = contratadosList.reduce((acc, m) => acc + (m.quantity || 1), 0);
  const aContratar = aContratarList.reduce((acc, m) => acc + (m.quantity || 1), 0);
  
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-gradient-to-br ${color} text-white`}>
              <Icon className="h-5 w-5" />
            </div>
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-xs bg-green-500/10 text-green-500 border-green-500/30">
              {contratados} contratados
            </Badge>
            <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-500 border-amber-500/30">
              {aContratar} a contratar
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {team.length === 0 ? (
          <EmptyTeamMessage />
        ) : (
          <>
            {/* Seção: Contratados */}
            {contratadosList.length > 0 && (
              <div className="space-y-3">
                <h5 className="text-sm font-medium text-green-500 flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  Contratados ({contratados})
                </h5>
                {contratadosList.map((member, index) => (
                  <TeamMemberCard key={`contratado-${index}`} member={member} color={color} />
                ))}
              </div>
            )}
            
            {/* Separador */}
            {contratadosList.length > 0 && aContratarList.length > 0 && (
              <Separator className="my-4" />
            )}
            
            {/* Seção: Oportunidades em Aberto */}
            {aContratarList.length > 0 && (
              <div className="space-y-3">
                <h5 className="text-sm font-medium text-amber-500 flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Oportunidades em Aberto ({aContratar})
                </h5>
                {aContratarList.map((member, index) => (
                  <TeamMemberCard key={`acontratar-${index}`} member={member} color={color} />
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

const ToolCard = ({ tool }: { tool: any }) => (
  <div className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/30 hover:border-border/50 transition-all">
    <div>
      <h4 className="font-medium text-sm">{tool.name}</h4>
      <p className="text-xs text-muted-foreground">{tool.description}</p>
    </div>
    <Badge 
      variant="outline"
      className={`text-xs shrink-0 ${
        tool.status === "ativo" 
          ? "bg-green-500/10 text-green-500 border-green-500/30" 
          : "bg-blue-500/10 text-blue-500 border-blue-500/30"
      }`}
    >
      {tool.status === "ativo" ? "Ativo" : "Avaliando"}
    </Badge>
  </div>
);

const ToolCategoryCard = ({ category }: { category: typeof toolCategories[0] }) => {
  const Icon = category.icon;
  const activeCount = category.tools.filter(t => t.status === "ativo").length;
  
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
      <div className={`h-1 bg-gradient-to-r ${category.color}`} />
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-gradient-to-br ${category.color} text-white`}>
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base">{category.category}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {activeCount} de {category.tools.length} ativos
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {category.tools.map((tool, index) => (
          <ToolCard key={index} tool={tool} />
        ))}
      </CardContent>
    </Card>
  );
};

// ============ BU FILTER HELPERS ============

const getBuLabel = (bu?: string) => {
  switch (bu) {
    case "modeloAtual": return "Modelo Atual";
    case "o2Tax": return "O2 TAX";
    case "oxyHacker": return "Oxy Hacker";
    case "franquia": return "Franquia";
    default: return "Geral";
  }
};

const getBuColor = (bu?: string) => {
  switch (bu) {
    case "modeloAtual": return "bg-blue-500/10 text-blue-600 border-blue-500/30";
    case "o2Tax": return "bg-emerald-500/10 text-emerald-600 border-emerald-500/30";
    case "oxyHacker": return "bg-purple-500/10 text-purple-600 border-purple-500/30";
    case "franquia": return "bg-amber-500/10 text-amber-600 border-amber-500/30";
    default: return "bg-muted text-muted-foreground";
  }
};

// ============ HIRING TIMELINE COMPONENT ============

interface HiringTimelineProps {
  allTeamData: TeamMember[];
  selectedBU: string;
}

const HiringTimeline = ({ allTeamData, selectedBU }: HiringTimelineProps) => {

  // Filtra contratações por BU selecionada
  const filteredTeamData = useMemo(() => {
    if (selectedBU === "all") {
      return allTeamData.filter(m => m.status === "a contratar" && m.hiringMonth);
    }
    return allTeamData.filter(m => 
      m.status === "a contratar" && 
      m.hiringMonth && 
      m.bu === selectedBU
    );
  }, [allTeamData, selectedBU]);

  // Agrupa contratações por mês
  const hiringsByMonth = useMemo(() => {
    const grouped: Record<string, TeamMember[]> = {};
    
    filteredTeamData.forEach(member => {
      const month = member.hiringMonth!;
      if (!grouped[month]) grouped[month] = [];
      grouped[month].push(member);
    });
    
    return grouped;
  }, [filteredTeamData]);

  // Conta total de contratações
  const totalHirings = filteredTeamData.reduce((acc, m) => acc + (m.quantity || 1), 0);

  const getMonthColor = (month: string) => {
    const hirings = hiringsByMonth[month];
    if (!hirings || hirings.length === 0) return "bg-muted/30 border-border/30";
    
    const count = hirings.reduce((acc, m) => acc + (m.quantity || 1), 0);
    if (count >= 3) return "bg-red-500/20 border-red-500/50";
    if (count >= 2) return "bg-amber-500/20 border-amber-500/50";
    return "bg-blue-500/20 border-blue-500/50";
  };

  const getMonthTextColor = (month: string) => {
    const hirings = hiringsByMonth[month];
    if (!hirings || hirings.length === 0) return "text-muted-foreground";
    
    const count = hirings.reduce((acc, m) => acc + (m.quantity || 1), 0);
    if (count >= 3) return "text-red-500";
    if (count >= 2) return "text-amber-500";
    return "text-blue-500";
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 text-white">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Timeline de Contratações 2026</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Planejamento de contratações ao longo do ano
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-sm bg-primary/10 text-primary border-primary/30">
            {totalHirings} contratações planejadas
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Timeline visual */}
        <div className="relative">
          {/* Linha conectora */}
          <div className="absolute top-6 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20" />
          
          {/* Meses */}
          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
            {months.map((month) => {
              const hirings = hiringsByMonth[month] || [];
              const hiringCount = hirings.reduce((acc, m) => acc + (m.quantity || 1), 0);
              const hasHiring = hiringCount > 0;
              
              return (
                <div key={month} className="flex flex-col items-center">
                  {/* Indicador do mês */}
                  <div 
                    className={`relative z-10 w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${getMonthColor(month)} ${hasHiring ? 'shadow-lg' : ''}`}
                  >
                    {hasHiring ? (
                      <span className={`font-bold text-sm ${getMonthTextColor(month)}`}>
                        {hiringCount}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                  
                  {/* Nome do mês */}
                  <span className={`mt-2 text-xs font-medium ${hasHiring ? getMonthTextColor(month) : 'text-muted-foreground'}`}>
                    {month}
                  </span>
                  
                  {/* Detalhes das contratações */}
                  {hasHiring && (
                    <div className="mt-2 space-y-1 w-full">
                      {hirings.map((h, i) => (
                        <div 
                          key={`${h.role}-${h.bu}-${i}`}
                          className={`text-xs px-1 py-0.5 rounded text-center truncate ${getBuColor(h.bu)}`}
                          title={`${h.role} - ${getBuLabel(h.bu)}`}
                        >
                          {h.role.includes("SDR") ? "SDR" : h.role.includes("Closer") ? "Closer" : h.role.split(" ")[0]}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Legenda */}
        <div className="flex flex-wrap gap-4 pt-4 border-t border-border/50">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-blue-500/20 border-2 border-blue-500/50" />
            <span className="text-xs text-muted-foreground">1 contratação</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-amber-500/20 border-2 border-amber-500/50" />
            <span className="text-xs text-muted-foreground">2 contratações</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-500/20 border-2 border-red-500/50" />
            <span className="text-xs text-muted-foreground">3+ contratações</span>
          </div>
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <Badge variant="outline" className={`text-xs ${getBuColor("modeloAtual")}`}>Modelo Atual</Badge>
            <Badge variant="outline" className={`text-xs ${getBuColor("o2Tax")}`}>O2 TAX</Badge>
            <Badge variant="outline" className={`text-xs ${getBuColor("oxyHacker")}`}>Oxy Hacker</Badge>
            <Badge variant="outline" className={`text-xs ${getBuColor("franquia")}`}>Franquia</Badge>
          </div>
        </div>

        {/* Resumo por trimestre */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Q1", months: ["Jan", "Fev", "Mar"] },
            { label: "Q2", months: ["Abr", "Mai", "Jun"] },
            { label: "Q3", months: ["Jul", "Ago", "Set"] },
            { label: "Q4", months: ["Out", "Nov", "Dez"] },
          ].map(quarter => {
            const quarterHirings = quarter.months.reduce((acc, month) => {
              const monthHirings = hiringsByMonth[month] || [];
              return acc + monthHirings.reduce((a, m) => a + (m.quantity || 1), 0);
            }, 0);
            
            return (
              <div 
                key={quarter.label}
                className={`p-4 rounded-lg border text-center transition-all ${
                  quarterHirings > 0 
                    ? "bg-primary/5 border-primary/20" 
                    : "bg-muted/30 border-border/30"
                }`}
              >
                <p className="text-sm text-muted-foreground">{quarter.label}</p>
                <p className={`text-2xl font-bold ${quarterHirings > 0 ? "text-primary" : "text-muted-foreground"}`}>
                  {quarterHirings}
                </p>
                <p className="text-xs text-muted-foreground">
                  {quarterHirings === 1 ? "contratação" : "contratações"}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

// ============ SALARY TABLE COMPONENT ============

interface SalaryTableProps {
  allTeamData: TeamMember[];
  onEdit: (member: TeamMember, index: number) => void;
  selectedBU: string;
}

const SalaryTable = ({ allTeamData, onEdit, selectedBU }: SalaryTableProps) => {
  const [visibleSalaries, setVisibleSalaries] = useState<Set<string>>(new Set());

  const toggleSalaryVisibility = (memberId: string) => {
    setVisibleSalaries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(memberId)) {
        newSet.delete(memberId);
      } else {
        newSet.add(memberId);
      }
      return newSet;
    });
  };

  // Filtra dados com base na BU selecionada
  const filteredData = useMemo(() => {
    if (selectedBU === "all") return allTeamData;
    return allTeamData.filter(m => 
      m.bu === selectedBU || 
      !m.bu || // Marketing e Expansão não têm BU
      m.area !== "vendas" // Mantém Marketing e Expansão
    );
  }, [allTeamData, selectedBU]);

  const contratados = filteredData.filter(m => m.status === "contratado");
  const aContratar = filteredData.filter(m => m.status === "a contratar");
  
  const totalContratados = contratados.reduce((acc, m) => acc + (m.salary * (m.quantity || 1)), 0);
  const totalAContratar = aContratar.reduce((acc, m) => acc + (m.salary * (m.quantity || 1)), 0);
  const totalGeral = totalContratados + totalAContratar;

  // Totais por área
  const totalMarketing = allTeamData.filter(m => m.area === "marketing").reduce((acc, m) => acc + (m.salary * (m.quantity || 1)), 0);
  const totalVendas = allTeamData.filter(m => m.area === "vendas").reduce((acc, m) => acc + (m.salary * (m.quantity || 1)), 0);
  const totalExpansao = allTeamData.filter(m => m.area === "expansao").reduce((acc, m) => acc + (m.salary * (m.quantity || 1)), 0);

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>Tabela de Remuneração</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Valores mensais por cargo
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Totais por área */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-green-500/10 border-green-500/30">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Marketing</p>
                <p className="text-xl font-bold text-green-500">
                  {formatCurrency(totalMarketing)}
                </p>
              </div>
              <Megaphone className="h-8 w-8 text-green-500/50" />
            </CardContent>
          </Card>
          <Card className="bg-blue-500/10 border-blue-500/30">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Vendas</p>
                <p className="text-xl font-bold text-blue-500">
                  {formatCurrency(totalVendas)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500/50" />
            </CardContent>
          </Card>
          <Card className="bg-purple-500/10 border-purple-500/30">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Expansão</p>
                <p className="text-xl font-bold text-purple-500">
                  {formatCurrency(totalExpansao)}
                </p>
              </div>
              <Building2 className="h-8 w-8 text-purple-500/50" />
            </CardContent>
          </Card>
        </div>

        <div className="rounded-lg border border-border/50 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-[120px]">Status</TableHead>
                <TableHead className="w-[100px]">Área</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead className="text-right w-[140px]">Remuneração</TableHead>
                <TableHead className="text-right w-[140px]">Total</TableHead>
                <TableHead className="text-center w-[80px]">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((member, index) => {
                const memberId = `${member.area}-${member.role}-${index}`;
                const isVisible = visibleSalaries.has(memberId);
                return (
                  <TableRow key={memberId} className="hover:bg-muted/20">
                    <TableCell>
                      <Badge 
                        variant="outline"
                        className={`text-xs ${
                          member.status === "contratado" 
                            ? "bg-green-500/10 text-green-500 border-green-500/30" 
                            : "bg-amber-500/10 text-amber-500 border-amber-500/30"
                        }`}
                      >
                        {member.status === "contratado" ? "Contratado" : "A contratar"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={`font-medium ${getAreaColor(member.area)}`}>
                        {getAreaLabel(member.area)}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">{member.role}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {member.name || member.person || "—"}
                    </TableCell>
                    <TableCell 
                      className="text-right font-mono cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => toggleSalaryVisibility(memberId)}
                    >
                      {isVisible ? (
                        <span className="flex items-center justify-end gap-1">
                          {formatCurrency(member.salary)}
                          <EyeOff className="h-3 w-3 text-muted-foreground" />
                        </span>
                      ) : (
                        <span className="flex items-center justify-end gap-1 text-muted-foreground">
                          <Eye className="h-4 w-4" /> Clique para ver
                        </span>
                      )}
                    </TableCell>
                    <TableCell 
                      className="text-right font-mono font-medium cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => toggleSalaryVisibility(memberId)}
                    >
                      {isVisible ? formatCurrency(member.salary * (member.quantity || 1)) : "••••••"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(member, index)}
                        className="h-8 w-8 p-0"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow className="bg-green-500/5">
                <TableCell colSpan={5} className="font-semibold text-green-500">
                  Total Contratados
                </TableCell>
                <TableCell className="text-right font-mono font-bold text-green-500">
                  {formatCurrency(totalContratados)}
                </TableCell>
                <TableCell />
              </TableRow>
              <TableRow className="bg-amber-500/5">
                <TableCell colSpan={5} className="font-semibold text-amber-500">
                  Total A Contratar
                </TableCell>
                <TableCell className="text-right font-mono font-bold text-amber-500">
                  {formatCurrency(totalAContratar)}
                </TableCell>
                <TableCell />
              </TableRow>
              <TableRow className="bg-primary/5">
                <TableCell colSpan={5} className="font-bold text-primary">
                  Total Geral (Mensal)
                </TableCell>
                <TableCell className="text-right font-mono font-bold text-primary text-lg">
                  {formatCurrency(totalGeral)}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

// ============ MAIN COMPONENT ============

export const StructureTab = () => {
  const [marketingData, setMarketingData] = useState<TeamMember[]>(initialMarketingTeam);
  const [leadershipData, setLeadershipData] = useState<TeamMember[]>(initialLeadershipTeam);
  const [salesData, setSalesData] = useState<TeamMember[]>(initialSalesTeam);
  const [expansionData, setExpansionData] = useState<TeamMember[]>(initialExpansionTeam);
  
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [editingIndex, setEditingIndex] = useState<number>(-1);
  const [editingSalary, setEditingSalary] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Filtro global por BU
  const [selectedBU, setSelectedBU] = useState<string>("all");

  const allTeamData = [...leadershipData, ...marketingData, ...salesData, ...expansionData];

  // Dados filtrados por BU
  const filteredSalesData = useMemo(() => {
    if (selectedBU === "all") return salesData;
    return salesData.filter(m => m.bu === selectedBU);
  }, [salesData, selectedBU]);

  const filteredAllTeamData = useMemo(() => {
    if (selectedBU === "all") return allTeamData;
    return allTeamData.filter(m => 
      m.bu === selectedBU || 
      !m.bu || // Marketing e Expansão não têm BU
      m.area !== "vendas" // Mantém Marketing e Expansão
    );
  }, [allTeamData, selectedBU]);

  const handleEdit = (member: TeamMember, globalIndex: number) => {
    setEditingMember(member);
    setEditingIndex(globalIndex);
    setEditingSalary(member.salary.toString());
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!editingMember) return;
    
    const newSalary = parseFloat(editingSalary) || 0;
    
    const updateTeam = (team: TeamMember[], setTeam: React.Dispatch<React.SetStateAction<TeamMember[]>>) => {
      const index = team.findIndex(m => 
        m.role === editingMember.role && 
        m.status === editingMember.status && 
        m.area === editingMember.area
      );
      if (index !== -1) {
        const updated = [...team];
        updated[index] = { ...updated[index], salary: newSalary };
        setTeam(updated);
        return true;
      }
      return false;
    };
    
    if (editingMember.area === "marketing") {
      updateTeam(marketingData, setMarketingData);
    } else if (editingMember.area === "vendas") {
      updateTeam(salesData, setSalesData);
    } else if (editingMember.area === "expansao") {
      updateTeam(expansionData, setExpansionData);
    }
    
    setIsDialogOpen(false);
    setEditingMember(null);
    setEditingIndex(-1);
  };

  const totalTools = toolCategories.reduce((acc, cat) => acc + cat.tools.length, 0);
  const activeTools = toolCategories.reduce((acc, cat) => acc + cat.tools.filter(t => t.status === "ativo").length, 0);
  
  // Totais filtrados
  const totalPeople = filteredAllTeamData.reduce((acc, m) => acc + (m.quantity || 1), 0);
  const totalContratados = filteredAllTeamData
    .filter(m => m.status === "contratado")
    .reduce((acc, m) => acc + (m.quantity || 1), 0);
  const totalAContratar = filteredAllTeamData
    .filter(m => m.status === "a contratar")
    .reduce((acc, m) => acc + (m.quantity || 1), 0);

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-background border border-primary/20 p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <Badge className="bg-primary/20 text-primary border-primary/30 text-sm px-3 py-1">
              O2N
            </Badge>
            <Badge variant="outline" className="text-sm">
              Estrutura 2026
            </Badge>
            <Select value={selectedBU} onValueChange={setSelectedBU}>
              <SelectTrigger className="w-[180px] bg-background/50 border-border/50">
                <SelectValue placeholder="Filtrar por BU" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as BUs</SelectItem>
                <SelectItem value="modeloAtual">Modelo Atual</SelectItem>
                <SelectItem value="o2Tax">O2 TAX</SelectItem>
                <SelectItem value="oxyHacker">Oxy Hacker</SelectItem>
                <SelectItem value="franquia">Franquia</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            Estrutura de Time e Ferramentas
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Visão completa do time de Marketing, Vendas e Expansão, além das ferramentas utilizadas para operação.
          </p>
          <div className="flex flex-wrap gap-4 mt-6">
            <div className="flex items-center gap-2 bg-background/50 rounded-lg px-4 py-2 border border-border/50">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Total de Pessoas</p>
                <p className="text-lg font-bold">{totalPeople}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-background/50 rounded-lg px-4 py-2 border border-border/50">
              <UserCheck className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Contratados</p>
                <p className="text-lg font-bold">{totalContratados}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-background/50 rounded-lg px-4 py-2 border border-border/50">
              <UserPlus className="h-5 w-5 text-amber-500" />
              <div>
                <p className="text-xs text-muted-foreground">A Contratar</p>
                <p className="text-lg font-bold">{totalAContratar}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-background/50 rounded-lg px-4 py-2 border border-border/50">
              <Wrench className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Ferramentas</p>
                <p className="text-lg font-bold">{activeTools}/{totalTools}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Time Section */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <Users className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Estrutura do Time</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <TeamSection 
            title="Marketing" 
            icon={Megaphone} 
            team={marketingData}
            color="from-green-500 to-emerald-500"
            bgColor="bg-green-500/10"
          />
          <TeamSection 
            title="Vendas" 
            icon={TrendingUp} 
            team={filteredSalesData}
            color="from-blue-500 to-cyan-500"
            bgColor="bg-blue-500/10"
          />
          <TeamSection 
            title="Expansão" 
            icon={Building2} 
            team={expansionData}
            color="from-purple-500 to-pink-500"
            bgColor="bg-purple-500/10"
          />
        </div>
      </div>

      {/* Hiring Timeline Section */}
      <HiringTimeline allTeamData={allTeamData} selectedBU={selectedBU} />

      {/* Salary Table Section */}
      <SalaryTable allTeamData={allTeamData} onEdit={handleEdit} selectedBU={selectedBU} />

      {/* Investment Analysis Section */}
      <InvestmentAnalysis allTeamData={allTeamData} />

      {/* Ferramentas Section */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <Wrench className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Ferramentas</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {toolCategories.map((category, index) => (
            <ToolCategoryCard key={index} category={category} />
          ))}
        </div>
      </div>

      {/* Summary Card */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HeartHandshake className="h-5 w-5 text-primary" />
            Resumo de Investimento em Estrutura
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Megaphone className="h-4 w-4 text-green-500" />
                <h4 className="font-semibold text-green-500">Marketing</h4>
              </div>
              <p className="text-2xl font-bold">{marketingData.length}</p>
              <p className="text-sm text-muted-foreground">posições no time</p>
            </div>
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                <h4 className="font-semibold text-blue-500">Vendas</h4>
              </div>
              <p className="text-2xl font-bold">{filteredSalesData.reduce((acc, m) => acc + (m.quantity || 1), 0)}</p>
              <p className="text-sm text-muted-foreground">posições no time</p>
            </div>
            <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="h-4 w-4 text-purple-500" />
                <h4 className="font-semibold text-purple-500">Expansão</h4>
              </div>
              <p className="text-2xl font-bold">{expansionData.reduce((acc, m) => acc + (m.quantity || 1), 0)}</p>
              <p className="text-sm text-muted-foreground">posições no time</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Salary Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Remuneração</DialogTitle>
          </DialogHeader>
          {editingMember && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={getAreaColor(editingMember.area)}>
                    {getAreaLabel(editingMember.area)}
                  </Badge>
                  <Badge 
                    variant="outline"
                    className={`text-xs ${
                      editingMember.status === "contratado" 
                        ? "bg-green-500/10 text-green-500 border-green-500/30" 
                        : "bg-amber-500/10 text-amber-500 border-amber-500/30"
                    }`}
                  >
                    {editingMember.status === "contratado" ? "Contratado" : "A contratar"}
                  </Badge>
                </div>
                <p className="font-semibold text-lg">{editingMember.role}</p>
                {editingMember.quantity && editingMember.quantity > 1 && (
                  <p className="text-sm text-muted-foreground">
                    Quantidade: {editingMember.quantity} pessoas
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="salary">Remuneração Mensal (R$)</Label>
                <Input
                  id="salary"
                  type="number"
                  value={editingSalary}
                  onChange={(e) => setEditingSalary(e.target.value)}
                  placeholder="0"
                  className="font-mono"
                />
                {editingMember.quantity && editingMember.quantity > 1 && (
                  <p className="text-sm text-muted-foreground">
                    Total para {editingMember.quantity} pessoas: {formatCurrency((parseFloat(editingSalary) || 0) * editingMember.quantity)}
                  </p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
