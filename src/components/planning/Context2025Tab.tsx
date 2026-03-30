import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Users, DollarSign, Building2, Target, Lightbulb, Trophy } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const revenueData = [
  { month: "Jan", faturamento: 559667 },
  { month: "Fev", faturamento: 631981 },
  { month: "Mar", faturamento: 613523 },
  { month: "Abr", faturamento: 589800 },
  { month: "Mai", faturamento: 667550 },
  { month: "Jun", faturamento: 768814 },
  { month: "Jul", faturamento: 946242 },
  { month: "Ago", faturamento: 921000 },
  { month: "Set", faturamento: 1075807 },
  { month: "Out", faturamento: 1238983 },
  { month: "Nov", faturamento: 965215 },
  { month: "Dez", faturamento: 1021418 },
];

const growthData = revenueData.map((item, index) => {
  if (index === 0) return { ...item, crescimento: 0 };
  const prevValue = revenueData[index - 1].faturamento;
  const growth = ((item.faturamento - prevValue) / prevValue) * 100;
  return { ...item, crescimento: parseFloat(growth.toFixed(1)) };
});

// Calculate average monthly growth (excluding first month which is 0)
const avgMonthlyGrowth = growthData.slice(1).reduce((acc, item) => acc + item.crescimento, 0) / (growthData.length - 1);

// Calculate quarterly averages
const quarterlyAverages = [
  { quarter: "Q1", avg: (revenueData[0].faturamento + revenueData[1].faturamento + revenueData[2].faturamento) / 3 },
  { quarter: "Q2", avg: (revenueData[3].faturamento + revenueData[4].faturamento + revenueData[5].faturamento) / 3 },
  { quarter: "Q3", avg: (revenueData[6].faturamento + revenueData[7].faturamento + revenueData[8].faturamento) / 3 },
  { quarter: "Q4", avg: (revenueData[9].faturamento + revenueData[10].faturamento + revenueData[11].faturamento) / 3 },
];

// Calculate quarterly growth averages (Q1: Feb-Mar, Q2: Apr-Jun, Q3: Jul-Sep, Q4: Oct-Dec)
const quarterlyGrowthAverages = [
  { quarter: "Q1", avg: (growthData[1].crescimento + growthData[2].crescimento) / 2 },
  { quarter: "Q2", avg: (growthData[3].crescimento + growthData[4].crescimento + growthData[5].crescimento) / 3 },
  { quarter: "Q3", avg: (growthData[6].crescimento + growthData[7].crescimento + growthData[8].crescimento) / 3 },
  { quarter: "Q4", avg: (growthData[9].crescimento + growthData[10].crescimento + growthData[11].crescimento) / 3 },
];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Sales Funnel Data
const funnelData = [
  { stage: "Leads", description: "Leads gerados", percent: "42%", label: "Lead → MQL", value: 5619 },
  { stage: "MQL", description: "Marketing Qualified Lead (>200k mês)", percent: "48%", label: "MQL → RM", value: 2303 },
  { stage: "Reunião Marcada", description: "Agendamentos confirmados", percent: "73%", label: "RM → RR", value: 1095 },
  { stage: "Reunião Realizada", description: "Reuniões efetivamente realizadas", percent: "87%", label: "RR → Prop", value: 798 },
  { stage: "Proposta Enviada", description: "Propostas comerciais enviadas", percent: "24%", label: "Prop → Venda", value: 693 },
  { stage: "Venda", description: "Contratos fechados", percent: "-", label: "", value: 164 },
];

const indicators = [
  { name: "CPMQL", value: "R$ 472,72", description: "Custo por MQL - quanto custa gerar um lead qualificado através de marketing", icon: Target },
  { name: "CPRR", value: "R$ 1.347,48", description: "Custo por reunião realizada - investimento para cada reunião agendada pelo SDR", icon: Users },
  { name: "CAC", value: "R$ 9.537,17", description: "Custo de Aquisição de Cliente - soma de tráfego, time comercial e ferramentas dividido por novos clientes", icon: DollarSign },
  { name: "CPV", value: "R$ 6.517,05", description: "Custo por Venda - investimento total para converter uma venda", icon: DollarSign },
  { name: "LT", value: "7 meses", description: "Lifetime - tempo médio que um cliente permanece ativo na base", icon: TrendingUp },
  { name: "Revenue Churn", value: "R$ 418.959", subtitle: "19%", description: "Volume de MRR perdido - receita recorrente que deixamos de receber por cancelamentos", icon: DollarSign, negative: true },
  { name: "Logo Churn", value: "42 clientes", description: "Quantidade de clientes perdidos - número de logos que saíram da base", icon: Users, negative: true },
  { name: "LTV/CAC", value: "3.99x", description: "Relação entre valor do cliente ao longo do tempo e custo para adquiri-lo", icon: Target },
  { name: "ROI", value: "2.31x", description: "Retorno sobre investimento - quanto a empresa ganha para cada real investido", icon: Trophy },
  { name: "Novo MRR", value: "R$ 883.928", description: "Conquista de MRR no ano - nova receita recorrente adicionada", icon: TrendingUp },
  { name: "ARR Potencial", value: formatCurrency((883928 * 12) + (418959 * 12)), description: "Potencial de ARR anual baseado em (Novo MRR × 12) + (Revenue Churn × 12)", icon: DollarSign },
  { name: "TCV", value: "R$ 13.2M", description: "Total Contract Value - valor total dos contratos assinados", icon: Building2 },
];

export function Context2025Tab() {
  const totalRevenue = revenueData.reduce((acc, item) => acc + item.faturamento, 0);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl gradient-primary p-8 text-primary-foreground">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30" />
        <div className="relative z-10">
          <Badge className="mb-4 bg-primary-foreground/20 text-primary-foreground border-0">
            Retrospectiva
          </Badge>
          <h2 className="font-display text-4xl font-bold mb-4">O que foi nosso ano de 2025?</h2>
          <p className="text-xl opacity-90 max-w-3xl leading-relaxed">
            Um ano de <strong>crescimento e superação</strong>. Começamos o ano com meta de faturamento de 
            550k mensais no primeiro trimestre e terminamos o ano faturando mais de <strong>1 milhão por mês</strong>.
          </p>
        </div>
      </div>

      {/* Quarters Timeline */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { quarter: "Q1", title: "Superação", desc: "Manutenção e foco" },
          { quarter: "Q2", title: "Crescimento", desc: "Expansão acelerada" },
          { quarter: "Q3", title: "Crescimento", desc: "Consolidação" },
          { quarter: "Q4", title: "Estabilização", desc: "Olhar pra dentro" },
        ].map((item, index) => (
          <Card key={item.quarter} className="glass-card hover:shadow-lg transition-all duration-300" style={{ animationDelay: `${index * 100}ms` }}>
            <CardContent className="p-6">
              <Badge variant="outline" className="mb-3">{item.quarter}</Badge>
              <h3 className="font-display text-lg font-semibold text-foreground">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* O que aprendemos */}
      <Card className="glass-card border-l-4 border-l-accent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display">
            <Lightbulb className="h-5 w-5 text-accent" />
            O que aprendemos?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px] p-4 rounded-lg bg-accent/10 border border-accent/20">
              <p className="font-semibold text-accent">A cultura vem antes de tudo</p>
            </div>
            <div className="flex-1 min-w-[200px] p-4 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="font-semibold text-destructive">Empresa que não vende, morre</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Crescimento em números */}
      <div>
        <h3 className="font-display text-2xl font-bold mb-6 flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" />
          O quanto crescemos em 2025?
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Clientes", from: "30", to: "130", growth: "+333%", color: "primary" },
            { label: "Faturamento", from: "R$ 5,5M", to: "R$ 10M", growth: "+82%", color: "accent" },
            { label: "Equipe", from: "15", to: "42", growth: "+180%", color: "primary" },
            { label: "Micro Franqueados", from: "0", to: "18", growth: "Novo!", color: "accent" },
          ].map((item, index) => (
            <Card key={item.label} className="glass-card overflow-hidden" style={{ animationDelay: `${index * 100}ms` }}>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground mb-2">{item.label}</p>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-muted-foreground line-through text-lg">{item.from}</span>
                  <span className="text-3xl font-display font-bold text-foreground">{item.to}</span>
                </div>
                <Badge className={item.color === "primary" ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"}>
                  {item.growth}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="font-display">Faturamento Mensal 2025</CardTitle>
            <p className="text-sm text-muted-foreground">Total: {formatCurrency(totalRevenue)}</p>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), "Faturamento"]}
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="faturamento" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: "hsl(var(--primary))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            {/* Quarterly Averages */}
            <div className="grid grid-cols-4 gap-3 mt-6">
              {quarterlyAverages.map((q, index) => (
                <div key={q.quarter} className="text-center p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <p className="text-xs text-muted-foreground mb-1">Média {q.quarter}</p>
                  <p className="font-display font-bold text-sm text-primary">{formatCurrency(q.avg)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-3">
              Crescimento % Mês a Mês
              <Badge className="bg-accent text-accent-foreground">
                Média: {avgMonthlyGrowth.toFixed(1)}% a.m.
              </Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground">Variação percentual mensal</p>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={growthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`${value}%`, "Crescimento"]}
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="crescimento" 
                    stroke="hsl(var(--accent))" 
                    strokeWidth={3}
                    dot={{ fill: "hsl(var(--accent))", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: "hsl(var(--accent))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            {/* Quarterly Growth Averages */}
            <div className="grid grid-cols-4 gap-3 mt-6">
              {quarterlyGrowthAverages.map((q) => (
                <div key={q.quarter} className="text-center p-3 rounded-lg bg-accent/10 border border-accent/20">
                  <p className="text-xs text-muted-foreground mb-1">Média {q.quarter}</p>
                  <p className={`font-display font-bold text-sm ${q.avg >= 0 ? 'text-accent' : 'text-destructive'}`}>
                    {q.avg >= 0 ? '+' : ''}{q.avg.toFixed(1)}%
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Indicadores */}
      <div>
        <h3 className="font-display text-2xl font-bold mb-6 flex items-center gap-2">
          <Target className="h-6 w-6 text-primary" />
          Nossos Indicadores em 2025
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {indicators.map((indicator, index) => (
            <Card key={indicator.name} className={`glass-card hover:shadow-lg transition-all duration-300 group ${indicator.negative ? 'border-destructive/30' : ''}`} style={{ animationDelay: `${index * 50}ms` }}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <indicator.icon className={`h-4 w-4 ${indicator.negative ? 'text-destructive' : 'text-primary'}`} />
                  <span className="font-display font-semibold text-sm">{indicator.name}</span>
                </div>
                <p className={`font-display text-2xl font-bold mb-1 ${indicator.negative ? 'text-destructive' : 'text-foreground'}`}>
                  {indicator.value}
                </p>
                {indicator.subtitle && (
                  <Badge variant={indicator.negative ? "destructive" : "secondary"} className="mb-2">{indicator.subtitle}</Badge>
                )}
                <p className="text-xs text-muted-foreground leading-relaxed">{indicator.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Funil de Vendas */}
      <div>
        <h3 className="font-display text-2xl font-bold mb-6 flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" />
          Funil de Vendas 2025
        </h3>
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex flex-col items-center">
              {funnelData.map((item, index) => {
                const widthPercent = 100 - (index * 12);
                return (
                  <div key={item.stage} className="flex items-center w-full max-w-3xl mb-2">
                    {/* Conversion percentage on the left */}
                    <div className="w-20 text-right pr-4">
                      {index > 0 && funnelData[index - 1].percent !== "-" && (
                        <Badge variant="outline" className="text-xs">
                          {funnelData[index - 1].percent}
                        </Badge>
                      )}
                    </div>
                    
                    {/* Funnel stage */}
                    <div 
                      className="relative py-4 text-center transition-all duration-300 hover:scale-105"
                      style={{ 
                        width: `${widthPercent}%`,
                        background: `linear-gradient(135deg, hsl(var(--primary) / ${1 - index * 0.12}), hsl(var(--accent) / ${1 - index * 0.12}))`,
                        borderRadius: '8px',
                        marginLeft: 'auto',
                        marginRight: 'auto'
                      }}
                    >
                      <p className="font-display font-bold text-primary-foreground text-sm md:text-base">
                        {item.stage}
                      </p>
                      <p className="text-xs text-primary-foreground/80 hidden md:block">
                        {item.description}
                      </p>
                    </div>
                    
                    {/* Absolute value on the right */}
                    <div className="w-24 text-left pl-4">
                      <Badge className="bg-primary/20 text-primary border-primary/30 font-mono">
                        {item.value.toLocaleString('pt-BR')}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-center gap-4 mt-6 flex-wrap">
              <Badge className="bg-primary/20 text-primary border-primary/30">
                Conversão MQL → Venda: 7%
              </Badge>
              <Badge className="bg-primary/20 text-primary border-primary/30">
                Conversão Lead → Venda: 2.9%
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reflexão Churn */}
      <Card className="glass-card border-l-4 border-l-warning overflow-hidden">
        <CardHeader className="bg-warning/5">
          <CardTitle className="font-display text-lg">
            💡 E se fôssemos mais austeros e competentes, qual empresa teríamos?
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground mb-2">Se não tivéssemos perdido clientes:</p>
              <p className="font-display font-bold text-xl text-foreground">Quanto faturaríamos no ano?</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground mb-2">Se tivéssemos churn de 2%:</p>
              <p className="font-display font-bold text-xl text-foreground">Quanto faturaríamos no ano?</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}