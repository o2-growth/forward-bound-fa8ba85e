import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Target, 
  Users, 
  Heart, 
  DollarSign, 
  Megaphone, 
  ShoppingCart, 
  Cpu, 
  Settings,
  TrendingUp,
  Building2,
  Rocket,
  Shield
} from "lucide-react";
import { totalRevenue2026 } from "./MonthlyRevenueTab";

const pillars = [
  {
    number: 1,
    title: "COMPREENDER O CLIENTE, OXIGENAR O NEGÓCIO",
    subtitle: "CLIENTE",
    color: "primary",
    points: [
      "O sucesso do cliente é o sucesso de nossa empresa",
      "LT de 7 é medíocre. Precisamos aumentar o nosso LT",
      "Precisamos segurar Churn",
      "Serviço é serviço e Produto é produto. BIG4 e TECHcompanies",
      "Escada de valor: Conversão → Retenção → Monetização",
    ],
  },
  {
    number: 2,
    title: "NA EMPRESA EXISTEM DUAS ÁREAS",
    subtitle: "VENDA",
    color: "accent",
    points: [
      "Áreas de venda e quem ajuda venda",
      "Empresa que não vende morre",
      "Todos setores precisam estar preocupados em vender",
      "Ou é venda direta ou é indireta",
      "Você representa a marca o tempo todo",
    ],
  },
  {
    number: 3,
    title: "OWNERSHIP OU VOCÊ ESTÁ FORA DO NOSSO JOGO",
    subtitle: "RESPONSABILIDADE",
    color: "destructive",
    points: [
      "Skin in the game",
      "Cada um é dono do seu resultado",
      "Comunique-se e busque a sua jornada",
      "Você precisa se esforçar",
      "O que precisamos é esforço com resultado real",
    ],
  },
];

const quarterlyGoals = [
  { quarter: "Q1", value: 3750000, average: 1250000 },
  { quarter: "Q2", value: 4500000, average: 1500000 },
  { quarter: "Q3", value: 6000000, average: 2000000 },
  { quarter: "Q4", value: 8000000, average: 2666666 },
];

const oxyHackerGoals = [
  { quarter: "Q1", units: 5 },
  { quarter: "Q2", units: 15 },
  { quarter: "Q3", units: 30 },
  { quarter: "Q4", units: 50 },
];

const franchiseGoals = [
  { quarter: "Q1", units: 2 },
  { quarter: "Q2", units: 3 },
  { quarter: "Q3", units: 6 },
  { quarter: "Q4", units: 9 },
];

const o2TaxGoals = [
  { quarter: "Q1", value: 412224, average: 137408 },
  { quarter: "Q2", value: 587220.48, average: 195740.16 },
  { quarter: "Q3", value: 781590.46, average: 260530.15 },
  { quarter: "Q4", value: 1040296.90, average: 346765.63 },
];

const departmentGoals = [
  {
    name: "COMERCIAL",
    icon: ShoppingCart,
    color: "primary",
    goals: [
      "Entregar os indicadores base (OKRs padrão)",
      "Automatizar treinamento time comercial e role play",
      "Automatizar qualificação e marcação de reunião SDR",
      "Automatizar follow up",
      "Conversão mínima 30% proposta/venda",
    ],
  },
  {
    name: "PRODUTO",
    icon: Cpu,
    color: "accent",
    goals: [
      "Escada de valor",
      "Produto de entrada: Lovables (tech vai fazer)",
      "Serviço customizado",
      "Educação: playbooks automatizados",
    ],
  },
  {
    name: "OPERAÇÃO",
    icon: Settings,
    color: "warning",
    goals: [
      "Entregar os indicadores base (OKRs padrão)",
      "Atendimento na veia com foco no sucesso do cliente",
      "Penalização e cobrança RÍGIDA e austera com CFOs que não performam carteira",
      "Reconhecimento dos que performam",
      "Setup precisa executar o combinado no modelo MIRO: incluindo IA para análise do plano de contas",
    ],
  },
  {
    name: "TECNOLOGIA",
    icon: Cpu,
    color: "primary",
    goals: [
      "Entregar todas as features, OKRs e demandas que ficaram pra trás",
      "Responsabilização sobre churn de SAAS quando não rodar integração",
      "Tela flexível para ajuste de relatórios com os dados existentes",
      "Meta base para toda a empresa",
    ],
  },
  {
    name: "MARKETING",
    icon: Megaphone,
    color: "accent",
    goals: [
      "Entregar os indicadores base (OKRs padrão)",
      "Social media in loco",
      "Lançamento Podcast LUXA TALKS",
      "Evento presencial com os Oxy Hackers",
      "Funis automatizados performando O2 TAX, EXPANSÃO e CAAS/SAAS",
    ],
  },
  {
    name: "CX - CUSTOMER EXPERIENCE",
    icon: Heart,
    color: "primary",
    goals: [
      "Antecipar insatisfações",
      "Garantir entrega do playbook",
      "Organizar database CNPJ",
      "Organizar database sócios e quem são (conhecer de verdade o cliente)",
    ],
  },
];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export function Goals2026Tab() {
  return (
    <div className="space-y-10 animate-fade-in">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl gradient-accent p-8 text-accent-foreground">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30" />
        <div className="relative z-10">
          <Badge className="mb-4 bg-accent-foreground/20 text-accent-foreground border-0">
            Planejamento 2026
          </Badge>
          <h2 className="font-display text-4xl font-bold mb-4">O que precisamos aprender para 2026?</h2>
          <div className="flex flex-wrap gap-4 mt-6">
            <Badge variant="secondary" className="text-lg px-4 py-2 bg-accent-foreground/20 text-accent-foreground border-0">
              <Heart className="h-4 w-4 mr-2" /> CLIENTE
            </Badge>
            <Badge variant="secondary" className="text-lg px-4 py-2 bg-accent-foreground/20 text-accent-foreground border-0">
              <DollarSign className="h-4 w-4 mr-2" /> VENDA
            </Badge>
            <Badge variant="secondary" className="text-lg px-4 py-2 bg-accent-foreground/20 text-accent-foreground border-0">
              <Shield className="h-4 w-4 mr-2" /> RESPONSABILIDADE
            </Badge>
          </div>
        </div>
      </div>

      {/* 3 Pillars */}
      <div>
        <h3 className="font-display text-2xl font-bold mb-6 flex items-center gap-2">
          <Target className="h-6 w-6 text-primary" />
          Os 3 Pilares de 2026
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {pillars.map((pillar, index) => (
            <Card 
              key={pillar.number} 
              className={`glass-card overflow-hidden border-t-4 ${
                pillar.color === "primary" ? "border-t-primary" : 
                pillar.color === "accent" ? "border-t-accent" : "border-t-destructive"
              }`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`w-10 h-10 rounded-full flex items-center justify-center font-display font-bold text-lg ${
                    pillar.color === "primary" ? "bg-primary text-primary-foreground" : 
                    pillar.color === "accent" ? "bg-accent text-accent-foreground" : "bg-destructive text-destructive-foreground"
                  }`}>
                    {pillar.number}
                  </span>
                  <Badge variant="outline">{pillar.subtitle}</Badge>
                </div>
                <CardTitle className="font-display text-lg leading-tight">{pillar.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {pillar.points.map((point, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        pillar.color === "primary" ? "bg-primary" : 
                        pillar.color === "accent" ? "bg-accent" : "bg-destructive"
                      }`} />
                      <span className="text-muted-foreground">{point}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Meta Principal */}
      <Card className="glass-card overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10">
          <div className="flex items-center gap-4">
            <Rocket className="h-8 w-8 text-primary" />
            <div>
              <CardTitle className="font-display text-2xl">Meta 2026</CardTitle>
              <p className="text-muted-foreground">Objetivo principal do ano</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <p className="text-5xl font-display font-bold text-gradient mb-2">{formatCurrency(Math.round(totalRevenue2026))}</p>
            <p className="text-muted-foreground">Faturamento total projetado para 2026</p>
          </div>
        </CardContent>
      </Card>

      {/* Business Units */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Modelo Atual */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <CardTitle className="font-display">Modelo Atual</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">CAAS, SAAS, Serviços Especializados</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {quarterlyGoals.map((goal, index) => (
                <div key={goal.quarter} className="flex items-center justify-between p-3 rounded-lg bg-muted/50" style={{ animationDelay: `${index * 50}ms` }}>
                  <div>
                    <Badge variant="outline" className="mb-1">{goal.quarter}</Badge>
                    <p className="font-display font-bold text-lg">{formatCurrency(goal.value)}</p>
                    <p className="text-xs text-muted-foreground">média {formatCurrency(goal.average)}/mês</p>
                  </div>
                </div>
              ))}
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 mt-4">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="font-display font-bold text-2xl text-primary">{formatCurrency(22250000)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* O2 TAX */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-warning" />
              <CardTitle className="font-display">O2 TAX</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">Recuperação tributária</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {o2TaxGoals.map((goal, index) => (
                <div key={goal.quarter} className="flex items-center justify-between p-3 rounded-lg bg-muted/50" style={{ animationDelay: `${index * 50}ms` }}>
                  <div>
                    <Badge variant="outline" className="mb-1">{goal.quarter}</Badge>
                    <p className="font-display font-bold text-lg">{formatCurrency(goal.value)}</p>
                    <p className="text-xs text-muted-foreground">média {formatCurrency(goal.average)}/mês</p>
                  </div>
                </div>
              ))}
              <div className="p-4 rounded-lg bg-warning/10 border border-warning/20 mt-4">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="font-display font-bold text-2xl text-warning">{formatCurrency(2821331.84)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Oxy Hacker */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Rocket className="h-5 w-5 text-accent" />
              <CardTitle className="font-display">Oxy Hacker</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">100 unidades × R$ 54.000</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {oxyHackerGoals.map((goal, index) => (
                <div key={goal.quarter} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <Badge variant="outline">{goal.quarter}</Badge>
                  <p className="font-display font-bold">{goal.units} unidades</p>
                </div>
              ))}
              <div className="p-4 rounded-lg bg-accent/10 border border-accent/20 mt-4">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="font-display font-bold text-2xl text-accent">{formatCurrency(5400000)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Franquia */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle className="font-display">Franquia</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">20 unidades × R$ 140.000</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {franchiseGoals.map((goal, index) => (
                <div key={goal.quarter} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <Badge variant="outline">{goal.quarter}</Badge>
                  <p className="font-display font-bold">{goal.units} unidades</p>
                </div>
              ))}
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 mt-4">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="font-display font-bold text-2xl text-primary">{formatCurrency(2800000)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Q1 Goals by Department */}
      <div>
        <h3 className="font-display text-2xl font-bold mb-2 flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" />
          O que precisamos fazer no Q1 para garantir o ano?
        </h3>
        <p className="text-muted-foreground mb-6">Metas e ações por departamento para o primeiro trimestre</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {departmentGoals.map((dept, index) => (
            <Card 
              key={dept.name} 
              className="glass-card hover:shadow-lg transition-all duration-300"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    dept.color === "primary" ? "bg-primary/10" : 
                    dept.color === "accent" ? "bg-accent/10" : "bg-warning/10"
                  }`}>
                    <dept.icon className={`h-5 w-5 ${
                      dept.color === "primary" ? "text-primary" : 
                      dept.color === "accent" ? "text-accent" : "text-warning"
                    }`} />
                  </div>
                  <CardTitle className="font-display text-lg">{dept.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {dept.goals.map((goal, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        dept.color === "primary" ? "bg-primary" : 
                        dept.color === "accent" ? "bg-accent" : "bg-warning"
                      }`} />
                      <span className="text-muted-foreground">{goal}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}