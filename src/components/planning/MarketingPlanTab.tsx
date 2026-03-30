import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, AlertTriangle, XCircle, FileText, Lightbulb, Palette, Layout, Mail, Linkedin, Users, Target } from "lucide-react";

const marketingCalendar = [
  {
    month: "Janeiro",
    happenings: ["Impostos, férias, 13º já pago"],
    challenges: [
      "Caixa no limite",
      "Fatura do cartão estourada",
      "Vendas fracas"
    ],
    commonMistake: "Cortar errado ou empurrar problema para março",
    content: [
      "Por que janeiro quebra empresas que faturam bem",
      "Caixa negativo não aparece na DRE",
      "Sinais de alerta nas primeiras 3 semanas do ano"
    ],
    events: []
  },
  {
    month: "Fevereiro",
    happenings: ["Carnaval"],
    challenges: [
      "Carnaval reduz dias úteis",
      "Vendas ainda instáveis",
      "Decisões adiadas"
    ],
    commonMistake: "Confundir movimento com recuperação",
    content: [
      "Poucos dias úteis e o impacto no financeiro",
      "Como ajustar custos variáveis",
      "Projeção realista para Q1"
    ],
    events: []
  },
  {
    month: "Março",
    happenings: ["08/03 Dia Internacional da Mulher"],
    challenges: [
      "Q1 termina aqui",
      "Pressão por resultado",
      "Contratações apressadas"
    ],
    commonMistake: "Forçar crescimento sem margem",
    content: [
      "Como fechar o Q1 sem maquiar resultados",
      "Indicadores que mentem sobre crescimento",
      "Contratação prematura: o erro mais caro"
    ],
    events: ["South Summit Brazil (25-27/03)"]
  },
  {
    month: "Abril",
    happenings: ["03/04 Sexta Santa", "05/04 Páscoa", "21/04 Tiradentes"],
    challenges: [
      "Feriados afetam produtividade",
      "Começo de planejamento tributário",
      "Fluxo de caixa tenso"
    ],
    commonMistake: "Achar que problema é só tributário quando é má gestão",
    content: [
      "Planejamento tributário começa em abril, não em dezembro",
      "A diferença entre elisão e evasão na prática",
      "Como pagar menos impostos sem risco"
    ],
    events: ["VTEX Day (16-17/04)"]
  },
  {
    month: "Maio",
    happenings: ["01/05 Dia do Trabalho", "10/05 Dia das Mães"],
    challenges: [
      "Sócios sobrecarregados",
      "Falta de delegação",
      "Processos frágeis"
    ],
    commonMistake: "Centralizar tudo e travar crescimento",
    content: [
      "Por que empresários se tornam o gargalo do próprio negócio",
      "Delegação financeira: o que delegar e o que manter",
      "Indicadores que você deveria olhar, mas não olha"
    ],
    events: ["FBV (20-22/05)", "Empreende Brazil (22-23/05)"]
  },
  {
    month: "Junho",
    happenings: ["12/06 Dia dos Namorados", "Festas Juninas", "19/06 Corpus Christi"],
    challenges: [
      "Metade do ano",
      "Hora de revisar plano",
      "Sazonalidade em alguns setores"
    ],
    commonMistake: "Não ajustar a rota com base nos 5 meses anteriores",
    content: [
      "Revisão de meio de ano: o que deveria ter acontecido e não aconteceu",
      "Sazonalidade: vilã ou aliada?",
      "Indicadores do primeiro semestre que pedem ação imediata"
    ],
    events: ["Web Summit Rio (8-11/06)"]
  },
  {
    month: "Julho",
    happenings: ["Copa do Mundo Feminina", "Férias escolares"],
    challenges: [
      "Despesas com férias",
      "Equipe reduzida",
      "Queda de ritmo comercial"
    ],
    commonMistake: "Cortar sem critério ou esperar agosto resolver",
    content: [
      "Como manter o financeiro funcionando com equipe em férias",
      "Cortes inteligentes: o que cortar e o que proteger",
      "Planejamento de férias que não destrói o caixa"
    ],
    events: []
  },
  {
    month: "Agosto",
    happenings: ["09/08 Dia dos Pais", "21/08 Aniversário O2"],
    challenges: [
      "Retomada pós-férias",
      "Pressão de segundo semestre",
      "Metas anuais parecem distantes"
    ],
    commonMistake: "Esperar setembro/outubro para acelerar",
    content: [
      "Segundo semestre começa em agosto, não em setembro",
      "Como recuperar tempo perdido no primeiro semestre",
      "Rotina de revisão de metas que funciona"
    ],
    events: ["Construsul (04-07/08)"]
  },
  {
    month: "Setembro",
    happenings: ["07/09 Independência", "15/09 Dia do Cliente"],
    challenges: [
      "Planejamento do ano seguinte",
      "Fechamento de orçamentos",
      "Decisões estratégicas"
    ],
    commonMistake: "Deixar planejamento para dezembro",
    content: [
      "Planejamento 2027 começa agora (não em janeiro)",
      "Orçamento base zero: por onde começar",
      "Como criar metas que não são ficção"
    ],
    events: []
  },
  {
    month: "Outubro",
    happenings: ["12/10 Dia das Crianças", "12/10 N. Sra. Aparecida", "15/10 Dia dos Professores"],
    challenges: [
      "Foco em fechamento anual",
      "Negociação de contratos futuros",
      "Ajuste de orçamento"
    ],
    commonMistake: "Comprometer caixa futuro para bater meta do ano",
    content: [
      "Como negociar contratos sem destruir margem",
      "Orçamento 2027: o que não pode faltar",
      "Reserva de emergência para empresas: como calcular"
    ],
    events: []
  },
  {
    month: "Novembro",
    happenings: ["02/11 Finados", "15/11 República", "27/11 Black Friday", "30/11 Cyber Monday"],
    challenges: [
      "Black Friday",
      "Tentação de descontos",
      "Fechamento comercial intenso"
    ],
    commonMistake: "Vender muito e lucrar pouco",
    content: [
      "Black Friday: armadilha de margem",
      "Faturamento vs. lucro: a diferença que outubro esconde",
      "Como fechar o ano comercial com inteligência"
    ],
    events: []
  },
  {
    month: "Dezembro",
    happenings: ["25/12 Natal", "31/12 Réveillon"],
    challenges: [
      "13º salário",
      "Férias coletivas",
      "Fluxo de caixa apertado"
    ],
    commonMistake: "Empurrar problemas para janeiro",
    content: [
      "13º e férias: por que você deveria ter provisionado",
      "Erros financeiros de 2026 que você vai repetir em 2027",
      "Checklist de encerramento financeiro do ano"
    ],
    events: []
  }
];

const strategicInitiatives = [
  {
    title: "Rebranding",
    description: "Deixar a marca mais moderna, pensar em um mote diferente.",
    details: '"Pessoas, Finanças, Inteligência." Projeto com duração de 3 meses, reunião com Pedro, time de marketing e especialistas em branding pra bater o público e moldar a comunicação assertiva.',
    duration: "3 meses",
    icon: Palette,
    color: "from-purple-500 to-pink-500"
  },
  {
    title: "Landing Pages",
    description: "Copy e design mais voltado pra conversão, estrutura menos institucional.",
    details: "Redator vai ser bem importante nesse aspecto. Foco em páginas de alta conversão para cada BU.",
    icon: Layout,
    color: "from-blue-500 to-cyan-500"
  },
  {
    title: "Newsletter",
    description: "Estruturar uma newsletter recorrente.",
    details: "Conteúdo de valor para a base de leads, mantendo relacionamento e autoridade.",
    icon: Mail,
    color: "from-green-500 to-emerald-500"
  },
  {
    title: "Materiais Isca (Lead Magnets)",
    description: "Criação de materiais ricos alinhados às dores reais do ICP.",
    details: "E-books, planilhas, checklists e templates focados em geração de leads qualificados.",
    icon: FileText,
    color: "from-orange-500 to-amber-500"
  },
  {
    title: "Founder-Led Growth (LinkedIn)",
    description: "Estratégia estruturada de crescimento no LinkedIn dos sócios.",
    details: "Produção de conteúdo intencional, conectando visão de negócio, experiência prática, aprendizados reais e posicionamento da O2 no mercado.",
    icon: Linkedin,
    color: "from-blue-600 to-blue-400"
  }
];

const MonthCard = ({ data }: { data: typeof marketingCalendar[0] }) => (
  <Card className="h-full border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-sm font-semibold bg-primary/10 text-primary border-primary/30">
          {data.month}
        </Badge>
        {data.events.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            {data.events.length} evento{data.events.length > 1 ? 's' : ''}
          </Badge>
        )}
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      {/* Acontecimentos */}
      <div>
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
          <Calendar className="h-3 w-3" />
          Acontecimentos
        </div>
        <div className="flex flex-wrap gap-1">
          {data.happenings.map((item, i) => (
            <Badge key={i} variant="outline" className="text-xs font-normal">
              {item}
            </Badge>
          ))}
        </div>
      </div>

      {/* Desafios */}
      <div>
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
          <AlertTriangle className="h-3 w-3" />
          O que o empresário enfrenta
        </div>
        <ul className="space-y-1">
          {data.challenges.map((challenge, i) => (
            <li key={i} className="text-xs text-foreground/80 flex items-start gap-2">
              <span className="text-amber-500 mt-0.5">•</span>
              {challenge}
            </li>
          ))}
        </ul>
      </div>

      {/* Erro comum */}
      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-2">
        <div className="flex items-center gap-2 text-xs font-medium text-destructive mb-1">
          <XCircle className="h-3 w-3" />
          Erro comum
        </div>
        <p className="text-xs text-destructive/90">{data.commonMistake}</p>
      </div>

      {/* Conteúdos */}
      <div>
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
          <Lightbulb className="h-3 w-3" />
          Ideias de conteúdo
        </div>
        <ul className="space-y-1">
          {data.content.map((item, i) => (
            <li key={i} className="text-xs text-foreground/70 flex items-start gap-2">
              <span className="text-primary mt-0.5">→</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Eventos */}
      {data.events.length > 0 && (
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
            <Users className="h-3 w-3" />
            Eventos do setor
          </div>
          <div className="flex flex-wrap gap-1">
            {data.events.map((event, i) => (
              <Badge key={i} className="text-xs bg-primary/20 text-primary border-primary/30">
                {event}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </CardContent>
  </Card>
);

const InitiativeCard = ({ initiative }: { initiative: typeof strategicInitiatives[0] }) => {
  const Icon = initiative.icon;
  return (
    <Card className="h-full border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
      <div className={`h-1 bg-gradient-to-r ${initiative.color}`} />
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg bg-gradient-to-br ${initiative.color} text-white`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base">{initiative.title}</CardTitle>
            {initiative.duration && (
              <Badge variant="outline" className="mt-1 text-xs">
                {initiative.duration}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-foreground/80">{initiative.description}</p>
        <p className="text-xs text-muted-foreground">{initiative.details}</p>
      </CardContent>
    </Card>
  );
};

export const MarketingPlanTab = () => {
  const totalEvents = marketingCalendar.reduce((acc, month) => acc + month.events.length, 0);
  const totalContent = marketingCalendar.reduce((acc, month) => acc + month.content.length, 0);

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-background border border-primary/20 p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <Badge className="bg-primary/20 text-primary border-primary/30 text-sm px-3 py-1">
              O2N
            </Badge>
            <Badge variant="outline" className="text-sm">
              2026
            </Badge>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            Plano de Marketing 2026
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Calendário estratégico mês a mês com conteúdos, eventos e iniciativas para posicionar a O2 como referência em gestão financeira.
          </p>
          <div className="flex flex-wrap gap-4 mt-6">
            <div className="flex items-center gap-2 bg-background/50 rounded-lg px-4 py-2 border border-border/50">
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Eventos</p>
                <p className="text-lg font-bold">{totalEvents}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-background/50 rounded-lg px-4 py-2 border border-border/50">
              <Lightbulb className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Ideias de Conteúdo</p>
                <p className="text-lg font-bold">{totalContent}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-background/50 rounded-lg px-4 py-2 border border-border/50">
              <Target className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Iniciativas</p>
                <p className="text-lg font-bold">{strategicInitiatives.length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Iniciativas Estratégicas */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <Target className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Iniciativas Estratégicas</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {strategicInitiatives.map((initiative, index) => (
            <InitiativeCard key={index} initiative={initiative} />
          ))}
        </div>
      </div>

      {/* Calendário Mensal */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <Calendar className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Calendário Mensal de Marketing</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {marketingCalendar.map((month, index) => (
            <MonthCard key={index} data={month} />
          ))}
        </div>
      </div>

      {/* Resumo de Eventos */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Eventos do Setor em 2026
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {marketingCalendar
              .filter(month => month.events.length > 0)
              .map((month, index) => (
                <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border border-border/30">
                  <Badge variant="outline" className="shrink-0">
                    {month.month}
                  </Badge>
                  <div className="space-y-1">
                    {month.events.map((event, i) => (
                      <p key={i} className="text-sm font-medium">{event}</p>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
