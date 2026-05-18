import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, GitBranch, Users, Briefcase, TrendingDown, Megaphone,
  Info, ArrowUpRight, ArrowDownRight, AlertTriangle, CheckCircle2, Clock,
  Target, DollarSign, Activity, Filter
} from "lucide-react";

/**
 * MOCK ESTÁTICO — Indicadores Comerciais reorganizado em 6 sub-páginas.
 *
 * Esta página NÃO tem dado real. Todos os números, gráficos e listas
 * são placeholders pra você validar a HIERARQUIA, NAVEGAÇÃO, UX e
 * QUAIS WIDGETS ficam em cada lugar. Nada aqui está conectado ao
 * banco — depois de aprovar o layout, eu pluggo os dados reais
 * widget por widget.
 */

const PLACEHOLDER_NUMBERS = {
  paceVendas: { realizado: 14, meta: 28, pct: 50 },
  paceMrr: { realizado: 187_400, meta: 320_000, pct: 58 },
  pipelineCoverage: 2.4,
  concentracaoTop5: 62,
  alertasCriticos: 3,
};

// ───────────── helpers visuais ─────────────
function MockNumber({ value, delta, meta, label, hint }: { value: string; delta?: string; meta?: string; label: string; hint?: string }) {
  const isPositive = delta?.startsWith('+');
  const isNegative = delta?.startsWith('-');
  return (
    <Card className="relative">
      <CardContent className="pt-4 pb-3 px-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-muted-foreground">{label}</span>
          <Info className="h-3 w-3 ml-auto opacity-50 cursor-help" />
        </div>
        <p className="text-2xl font-bold">{value}</p>
        <div className="flex items-center gap-2 mt-1">
          {delta && (
            <span className={`text-[11px] flex items-center gap-0.5 ${isPositive ? 'text-emerald-600' : isNegative ? 'text-red-600' : 'text-muted-foreground'}`}>
              {isPositive && <ArrowUpRight className="h-3 w-3" />}
              {isNegative && <ArrowDownRight className="h-3 w-3" />}
              {delta} vs sem. ant.
            </span>
          )}
          {meta && <span className="text-[10px] text-muted-foreground">meta: {meta}</span>}
        </div>
        {hint && <p className="text-[10px] text-muted-foreground mt-1">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function Placeholder({ title, height = 200, hint }: { title: string; height?: number; hint?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          <Badge variant="outline" className="text-[10px] font-normal">mock</Badge>
        </div>
        {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      </CardHeader>
      <CardContent>
        <div
          className="rounded-md border border-dashed border-muted-foreground/30 bg-muted/20 flex items-center justify-center text-xs text-muted-foreground"
          style={{ height }}
        >
          📊 {title} — placeholder
        </div>
      </CardContent>
    </Card>
  );
}

function MiniTable({ title, rows, cols, hint }: { title: string; rows: (string|number)[][]; cols: string[]; hint?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          <Badge variant="outline" className="text-[10px]">mock</Badge>
        </div>
        {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      </CardHeader>
      <CardContent>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b">
              {cols.map((c, i) => <th key={i} className={`py-1.5 px-2 text-left font-medium text-muted-foreground ${i > 0 ? 'text-right' : ''}`}>{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b last:border-b-0 hover:bg-muted/30">
                {r.map((cell, j) => <td key={j} className={`py-1.5 px-2 ${j > 0 ? 'text-right tabular-nums' : ''}`}>{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function AlertCard({ tone, title, body }: { tone: 'critico' | 'alto' | 'info'; title: string; body: string }) {
  const colors = {
    critico: 'border-red-500/30 bg-red-500/5 text-red-600',
    alto: 'border-amber-500/30 bg-amber-500/5 text-amber-700',
    info: 'border-blue-500/30 bg-blue-500/5 text-blue-700',
  };
  return (
    <div className={`flex items-start gap-2 p-3 rounded-lg border ${colors[tone]}`}>
      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
      <div className="flex-1 text-xs">
        <div className="font-semibold mb-0.5">{title}</div>
        <div className="opacity-90">{body}</div>
      </div>
      <Button variant="ghost" size="sm" className="h-6 text-[10px]">Ver</Button>
    </div>
  );
}

// ───────────── Sub-páginas ─────────────

function VisaoExecutiva() {
  return (
    <div className="space-y-6">
      {/* Faixa de KPIs hero */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <MockNumber label="Pace Vendas (Maio)" value="14/28" delta="-12%" meta="28" hint="50% do mês, 67% transcorrido" />
        <MockNumber label="Pace MRR (Maio)" value="R$ 187k" delta="+8%" meta="R$ 320k" hint="58% da meta" />
        <MockNumber label="Pipeline coverage" value="2,4x" delta="+0,3" hint="R$ aberto / meta restante" />
        <MockNumber label="Win rate (30d)" value="22%" delta="-3pp" meta="25%" hint="vendas / propostas" />
        <MockNumber label="Concentração top 5" value="62%" delta="+5pp" hint="da meta restante" />
      </div>

      {/* Alertas auto */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Alertas automáticos
              <Badge variant="outline" className="text-[10px]">3</Badge>
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-xs">Configurar regras</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <AlertCard tone="critico" title="Closer Daniel Trindade abaixo de 40% no D+15"
            body="Realizado: 2/8 vendas (25%). Histórico do mês passado: 70%. Diferença: -45pp." />
          <AlertCard tone="alto" title="Pipeline RR caiu 22% WoW"
            body="S1: 11 RRs · S2: 9 RRs · Tendência negativa em Modelo Atual." />
          <AlertCard tone="info" title="3 propostas aguardando há mais de 14 dias"
            body="Casa Viegas (27d), Tech Inova (18d), Construtora Pampa (15d)." />
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Placeholder title="Pace gráfico (Realizado vs Meta acumulada — Maio)" height={240}
          hint="Linha realizado vs linha meta + área de gap" />
        <Placeholder title="Comparativo Semanal compacto (S1 vs S2)" height={240}
          hint="Mini-tabela MQL/RM/RR/Prop/Venda + Δ%" />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <MiniTable
          title="Top 5 oportunidades por valor"
          cols={["Cliente", "MRR", "Dias"]}
          rows={[
            ["Acme Holdings", "R$ 45k", 8],
            ["Construtora XYZ", "R$ 32k", 14],
            ["Tech Inova", "R$ 28k", 18],
            ["Casa Viegas", "R$ 25k", 27],
            ["Pampa Grupo", "R$ 22k", 15],
          ]}
          hint="Negócios abertos com maior MRR — concentração de risco"
        />
        <MiniTable
          title="Ranking SDR (mês)"
          cols={["SDR", "RM", "→Venda"]}
          rows={[
            ["Carlos Ramos", 15, "20%"],
            ["Bruna P. Mota", 9, "33%"],
            ["Erica Rocha", 3, "0%"],
            ["Daniel Trindade", 0, "—"],
          ]}
        />
        <MiniTable
          title="Ranking Closer (mês)"
          cols={["Closer", "Vendas", "Win%"]}
          rows={[
            ["Pedro Albite", 6, "30%"],
            ["Bruna", 4, "27%"],
            ["Daniel Trindade", 2, "12%"],
            ["Thiago", 2, "15%"],
          ]}
        />
      </div>
    </div>
  );
}

function FunilConversao() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <MockNumber label="MQL → RM" value="68%" delta="+4pp" hint="média 90d: 64%" />
        <MockNumber label="RM → RR" value="79%" delta="-2pp" hint="média 90d: 81%" />
        <MockNumber label="RR → Proposta" value="55%" delta="+1pp" hint="média 90d: 54%" />
        <MockNumber label="Proposta → Venda" value="22%" delta="-3pp" hint="média 90d: 25% ⚠️" />
        <MockNumber label="Ciclo médio" value="34d" delta="+2d" hint="Lead → Venda" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Placeholder title="Funil visual — Modelo Atual" height={280} hint="MQL → RM → RR → Prop → Venda com %" />
        <Placeholder title="Funil visual — Expansão/Franquia" height={280} hint="Mesmo formato, side-by-side" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <MiniTable
          title="Velocity — dias médios por fase"
          cols={["Fase", "Dias médios", "Δ vs mês ant."]}
          rows={[
            ["MQL", "2d", "—"],
            ["RM", "7d", "+1d"],
            ["RR", "5d", "—"],
            ["Proposta", "12d", "+3d ⚠️"],
            ["Total Lead→Venda", "34d", "+4d"],
          ]}
          hint="Calculado de Saída - Entrada por fase"
        />
        <Placeholder title="Conversion rate por fase — tendência 12 semanas" height={240}
          hint="Linhas sobrepostas: MQL→RM, RM→RR, etc." />
      </div>

      <Placeholder title="Sankey: para onde vão os cards de cada fase" height={300}
        hint="Visualiza quanto avança vs quanto perde em cada etapa" />
    </div>
  );
}

function Pessoas() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="default" size="sm">SDR</Button>
        <Button variant="ghost" size="sm">Closer</Button>
        <span className="text-xs text-muted-foreground ml-2">filtro: BU, período</span>
      </div>

      <MiniTable
        title="Performance por SDR (Maio)"
        cols={["SDR", "Meta", "Real", "Atinge%", "Win%", "Ciclo méd.", "No-show%"]}
        rows={[
          ["Carlos Ramos", 30, 22, "73%", "20%", "32d", "12%"],
          ["Bruna P. Mota", 25, 18, "72%", "33%", "28d", "8%"],
          ["Erica Rocha", 20, 8, "40%", "0%", "—", "25%"],
          ["Daniel Trindade", 15, 1, "7%", "—", "—", "—"],
        ]}
        hint="Clica no nome para abrir dossier individual"
      />

      <div className="grid md:grid-cols-2 gap-4">
        <Placeholder title="Heatmap: atividade × dia da semana" height={240}
          hint="Quando os SDRs estão agendando RM/RR?" />
        <Placeholder title="Cohort de rampagem — SDR" height={240}
          hint="Curva de atingimento dos últimos 6 SDRs novos (depende de data início)" />
      </div>

      <Placeholder title="Dossier individual (drill-down ao clicar no SDR)" height={180}
        hint="Detalhe por pessoa: histórico mensal, win rate por faixa, motivos de perda, top deals" />
    </div>
  );
}

function PipelineAberto() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" size="sm" className="text-xs">
          <Filter className="h-3 w-3 mr-1" /> Faixa: todas
        </Button>
        <Button variant="outline" size="sm" className="text-xs">Closer: todos</Button>
        <Button variant="outline" size="sm" className="text-xs">Produto: todos</Button>
        <span className="ml-auto text-xs text-muted-foreground">Visões salvas:</span>
        <Badge variant="secondary" className="text-[10px]">Em risco (&gt;SLA)</Badge>
        <Badge variant="secondary" className="text-[10px]">Top 10 por valor</Badge>
        <Badge variant="secondary" className="text-[10px]">Concentração top 5</Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MockNumber label="Pipeline total aberto" value="R$ 768k" hint="42 cards ativos" />
        <MockNumber label="Forecast ponderado" value="R$ 211k" hint="Σ MRR × win% da fase" />
        <MockNumber label="Em risco (aging alto)" value="11 cards" delta="+2" hint=">SLA por fase" />
        <MockNumber label="Próximas 7 dias" value="6 fechamentos" hint="próxima ação prevista" />
      </div>

      <MiniTable
        title="Pipeline aberto — todos os cards"
        cols={["Cliente", "Fase", "Dias na fase", "MRR", "Closer", "Próxima ação"]}
        rows={[
          ["Casa Viegas", "Proposta", "27d ⚠️", "R$ 25k", "Pedro Albite", "Follow-up 18/05"],
          ["Tech Inova", "Proposta", "18d ⚠️", "R$ 28k", "Bruna", "Reunião 20/05"],
          ["Construtora Pampa", "Proposta", "15d", "R$ 22k", "Daniel T.", "Aguardando retorno"],
          ["Acme Holdings", "RR", "8d", "R$ 45k", "Pedro Albite", "Enviar proposta"],
          ["…+38 outros", "—", "—", "—", "—", "—"],
        ]}
        hint="Ordenado por dias na fase desc. Cards >SLA destacados."
      />

      <div className="grid md:grid-cols-2 gap-4">
        <Placeholder title="Distribuição: pipeline por fase" height={220} />
        <Placeholder title="Aging histogram" height={220} hint="Quantos cards em cada faixa de dias" />
      </div>
    </div>
  );
}

function Perdas() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MockNumber label="Cards perdidos (mês)" value="23" delta="+5" />
        <MockNumber label="MRR perdido" value="R$ 142k" delta="+18%" hint="MRR de cards que viraram Loss" />
        <MockNumber label="Top motivo" value="Não viu valor" hint="9/23 = 39%" />
        <MockNumber label="Dias até perda" value="12d médio" hint="cedo = qualificação ruim" />
      </div>

      <Placeholder title="Cross-tab Motivo × Faixa de Faturamento" height={240}
        hint="Heatmap mostrando onde cada motivo mais aparece" />

      <div className="grid md:grid-cols-2 gap-4">
        <MiniTable
          title="Motivos por volume"
          cols={["Motivo", "Cards", "MRR perdido", "Δ MoM"]}
          rows={[
            ["Não viu valor", 9, "R$ 38k", "+3"],
            ["Sem orçamento", 6, "R$ 22k", "+1"],
            ["Concorrência", 4, "R$ 45k ⚠️", "+2"],
            ["Não respondeu", 3, "R$ 18k", "−1"],
            ["Outros", 1, "R$ 19k", "—"],
          ]}
        />
        <MiniTable
          title="Motivos por Closer"
          cols={["Closer", "Motivo principal", "%"]}
          rows={[
            ["Pedro Albite", "Sem orçamento", "40%"],
            ["Bruna", "Não viu valor", "55%"],
            ["Daniel Trindade", "Concorrência", "70% ⚠️"],
            ["Thiago", "Não respondeu", "33%"],
          ]}
          hint="Padrão por closer revela necessidade de treinamento"
        />
      </div>

      <Placeholder title="Tendência: motivos crescendo MoM (radar de alerta)" height={220} />
    </div>
  );
}

function Origem() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MockNumber label="Fonte top (volume)" value="Google Ads" hint="48% dos MQLs" />
        <MockNumber label="Fonte top (conversão)" value="Indicação" hint="MQL→Venda 18%" />
        <MockNumber label="Campanha #1" value="CFO Diagnóstico" hint="22 MQLs · 3 vendas" />
        <MockNumber label="Página #1" value="/cfo" hint="35% dos leads" />
      </div>

      <MiniTable
        title="Funil por fonte"
        cols={["Fonte", "Leads", "MQL", "Venda", "Conv%"]}
        rows={[
          ["Google Ads", 142, 68, 8, "5.6%"],
          ["Meta Ads", 98, 41, 4, "4.1%"],
          ["Indicação", 22, 14, 4, "18.2% 🟢"],
          ["Orgânico", 56, 18, 2, "3.6%"],
          ["Outbound", 31, 9, 2, "6.5%"],
        ]}
        hint="Drill-down por fonte → ver campanhas, palavras-chave, páginas"
      />

      <div className="grid md:grid-cols-2 gap-4">
        <Placeholder title="ROI por canal (com custo de mídia)" height={240}
          hint="🔒 Bloqueado — depende de plugar custo de Meta/Google Ads" />
        <Placeholder title="Atribuição last-touch vs first-touch" height={240}
          hint="fbclid + gclid já existem nos cards" />
      </div>

      <Placeholder title="Tempo lead → primeiro contato (SLA de topo)" height={200}
        hint="Quanto demora pra atender lead novo? Pode revelar gargalo no SDR" />
    </div>
  );
}

// ───────────── Página principal ─────────────

export default function ComercialPreview() {
  const [tab, setTab] = useState("executiva");

  return (
    <div className="min-h-screen bg-background p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Badge variant="secondary">PREVIEW</Badge>
          <span className="text-xs text-muted-foreground">Mock estático — sem dados reais</span>
        </div>
        <h1 className="text-2xl font-bold">Indicadores Comerciais</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Proposta de reorganização da aba atual em 6 sub-páginas focadas em diagnóstico.
          Navegue pelas abas pra ver a hierarquia. Todos os números/gráficos são placeholders.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-3 md:grid-cols-6 w-full mb-4">
          <TabsTrigger value="executiva" className="gap-1.5">
            <LayoutDashboard className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Visão</span> Executiva
          </TabsTrigger>
          <TabsTrigger value="funil" className="gap-1.5">
            <GitBranch className="h-3.5 w-3.5" />
            Funil
          </TabsTrigger>
          <TabsTrigger value="pessoas" className="gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Pessoas
          </TabsTrigger>
          <TabsTrigger value="pipeline" className="gap-1.5">
            <Briefcase className="h-3.5 w-3.5" />
            Pipeline
          </TabsTrigger>
          <TabsTrigger value="perdas" className="gap-1.5">
            <TrendingDown className="h-3.5 w-3.5" />
            Perdas
          </TabsTrigger>
          <TabsTrigger value="origem" className="gap-1.5">
            <Megaphone className="h-3.5 w-3.5" />
            Origem
          </TabsTrigger>
        </TabsList>

        <TabsContent value="executiva"><VisaoExecutiva /></TabsContent>
        <TabsContent value="funil"><FunilConversao /></TabsContent>
        <TabsContent value="pessoas"><Pessoas /></TabsContent>
        <TabsContent value="pipeline"><PipelineAberto /></TabsContent>
        <TabsContent value="perdas"><Perdas /></TabsContent>
        <TabsContent value="origem"><Origem /></TabsContent>
      </Tabs>

      <div className="mt-8 p-4 rounded-lg border border-dashed bg-muted/30">
        <p className="text-xs text-muted-foreground">
          <strong>Como ler este preview:</strong> ✅ widgets com dado disponível hoje · ⚠️ alertas
          visuais de exemplo · 🔒 widgets bloqueados por dado externo (custo de mídia, SLA Pipefy,
          data início SDR). Tudo em "mock" é placeholder — depois de aprovar o layout, eu pluggo
          os dados reais widget por widget.
        </p>
      </div>
    </div>
  );
}
