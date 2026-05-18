import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, GitBranch, Users, Briefcase, TrendingDown,
  Info, ArrowUpRight, ArrowDownRight, AlertTriangle, Flame, Thermometer, Snowflake,
  Filter
} from "lucide-react";

/**
 * MOCK ESTÁTICO v2 — Indicadores Comerciais com 5 sub-páginas 100% comercial.
 *
 * Mudanças em relação ao v1 (baseado no feedback):
 * - Removida sub-aba "Origem & Canais" (era marketing-flavored). Virou
 *   widget DENTRO da sub-aba Funil
 * - Sub-aba Pipeline reorganizada por TEMPERATURA: 🔥 Quente / 🟡 Morno
 *   / 🔵 Frio. Quente = Proposta Enviada. Lead pronto pra fechar
 * - Perdas reforça que é "venda perdida" (motivo da perda do card),
 *   NÃO churn de cliente. Conceitos separados
 * - Visão Executiva enxugada — só pace + alertas comerciais + top deals
 *
 * Sem dado real. Tudo placeholder. Depois de aprovar, pluggo widget
 * por widget com hooks existentes (useModeloAtualAnalytics,
 * useExpansaoAnalytics, useFunnelMetas, etc.)
 */

// ───────────── helpers visuais ─────────────
function MockNumber({ value, delta, meta, label, hint, accent }: { value: string; delta?: string; meta?: string; label: string; hint?: string; accent?: string }) {
  const isPositive = delta?.startsWith('+');
  const isNegative = delta?.startsWith('-');
  return (
    <Card className={accent}>
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

function MiniTable({ title, rows, cols, hint, accent }: { title: string; rows: (string|number)[][]; cols: string[]; hint?: string; accent?: string }) {
  return (
    <Card className={accent}>
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
        <MockNumber label="Win rate (30d)" value="22%" delta="-3pp" meta="25%" hint="vendas / propostas enviadas" />
        <MockNumber label="Concentração top 5" value="62%" delta="+5pp" hint="da meta restante em 5 deals" />
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
          <AlertCard tone="alto" title="Propostas quentes esfriando: 3 cards com >14d em Proposta Enviada"
            body="Casa Viegas (27d), Tech Inova (18d), Construtora Pampa (15d). Risco de virar Loss." />
          <AlertCard tone="info" title="Pipeline RR caiu 22% WoW"
            body="S1: 11 RRs · S2: 9 RRs. Pode reduzir Proposta nas próximas 2 semanas." />
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Placeholder title="Pace gráfico — Vendas realizadas vs meta (acumulado Maio)" height={240}
          hint="Linha realizado vs linha meta + área de gap" />
        <Placeholder title="Comparativo Semanal compacto (S1 vs S2)" height={240}
          hint="MQL/RM/RR/Prop/Venda + Δ% por etapa" />
      </div>

      {/* Top 5 oportunidades — destaque de gestão */}
      <MiniTable
        title="🎯 Top 5 oportunidades por valor (próximas a fechar)"
        cols={["Cliente", "Fase", "MRR", "Dias na fase", "Closer", "Temperatura"]}
        rows={[
          ["Acme Holdings", "Proposta Enviada", "R$ 45k", "8d", "Pedro Albite", "🔥 Quente"],
          ["Construtora Pampa", "Proposta Enviada", "R$ 32k", "15d", "Daniel T.", "🔥→🟡 Esfriando"],
          ["Tech Inova", "Proposta Enviada", "R$ 28k", "18d", "Bruna", "🔥→🟡 Esfriando"],
          ["Casa Viegas", "Proposta Enviada", "R$ 25k", "27d", "Pedro Albite", "🟡 Morno"],
          ["Grupo XYZ", "Reunião Realizada", "R$ 22k", "5d", "Thiago", "🟡 Morno"],
        ]}
        hint="5 deals que sustentam a meta — clicar abre detalhe e histórico"
      />

      <div className="grid md:grid-cols-2 gap-4">
        <MiniTable
          title="Ranking SDR (período)"
          cols={["SDR", "RM", "→Venda"]}
          rows={[
            ["Carlos Ramos", 15, "20%"],
            ["Bruna P. Mota", 9, "33%"],
            ["Erica Rocha", 3, "0%"],
            ["Daniel Trindade", 0, "—"],
          ]}
        />
        <MiniTable
          title="Ranking Closer (período)"
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
        <MockNumber label="Proposta → Venda" value="22%" delta="-3pp" hint="média 90d: 25% ⚠️ gargalo" />
        <MockNumber label="Ciclo médio Lead→Venda" value="34d" delta="+2d" hint="ideal: <30d" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Placeholder title="Funil visual — Modelo Atual" height={280} hint="MQL → RM → RR → Prop → Venda com volumes e %" />
        <Placeholder title="Funil visual — Expansão / Franquia" height={280} hint="Mesmo formato, side-by-side" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <MiniTable
          title="Velocity — dias médios por fase"
          cols={["Fase", "Dias médios", "Δ vs mês ant."]}
          rows={[
            ["MQL → RM", "2d", "—"],
            ["RM → RR", "7d", "+1d"],
            ["RR → Proposta", "5d", "—"],
            ["Proposta → Venda", "12d", "+3d ⚠️"],
            ["Total Lead → Venda", "34d", "+4d"],
          ]}
          hint="Calculado de Saída - Entrada por fase. Gargalo: Proposta crescendo."
        />
        <Placeholder title="Conversion rate por fase — tendência 12 semanas" height={240}
          hint="Linhas sobrepostas: MQL→RM, RM→RR, etc." />
      </div>

      <Placeholder title="Sankey: para onde vão os cards de cada fase" height={300}
        hint="Visualiza quanto avança vs quanto vai pra Loss em cada etapa" />

      {/* Sub-seção: Origem do lead (era sub-aba — agora widget aqui dentro) */}
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          Origem do lead (como entra no funil)
          <Badge variant="outline" className="text-[10px] font-normal">filtro auxiliar</Badge>
        </h3>
        <MiniTable
          title="Conversão por fonte"
          cols={["Fonte", "Leads", "MQL", "Venda", "Conv% lead→venda"]}
          rows={[
            ["Google Ads", 142, 68, 8, "5.6%"],
            ["Indicação", 22, 14, 4, "18.2% 🟢"],
            ["Meta Ads", 98, 41, 4, "4.1%"],
            ["Orgânico", 56, 18, 2, "3.6%"],
            ["Outbound", 31, 9, 2, "6.5%"],
          ]}
          hint="Clica na fonte pra ver campanhas, palavras-chave e páginas de origem"
        />
      </div>
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
      </div>

      {/* KPIs por temperatura */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <Flame className="h-5 w-5 text-red-600" />
              <span className="text-sm font-bold text-red-700">🔥 QUENTES</span>
              <Badge variant="outline" className="ml-auto text-[10px] border-red-500/40">Proposta Enviada</Badge>
            </div>
            <p className="text-3xl font-bold">12 cards</p>
            <p className="text-xs text-muted-foreground mt-1">R$ 268k em MRR · forecast ponderado R$ 67k (25% win)</p>
            <p className="text-[11px] text-red-700 mt-2">⚠️ 3 esfriando (&gt;14d sem fechar)</p>
          </CardContent>
        </Card>
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <Thermometer className="h-5 w-5 text-amber-600" />
              <span className="text-sm font-bold text-amber-700">🟡 MORNOS</span>
              <Badge variant="outline" className="ml-auto text-[10px] border-amber-500/40">RR realizada</Badge>
            </div>
            <p className="text-3xl font-bold">18 cards</p>
            <p className="text-xs text-muted-foreground mt-1">R$ 312k em MRR · forecast ponderado R$ 47k (15% win)</p>
            <p className="text-[11px] text-amber-700 mt-2">Próximo passo: enviar proposta</p>
          </CardContent>
        </Card>
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <Snowflake className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-bold text-blue-700">🔵 FRIOS</span>
              <Badge variant="outline" className="ml-auto text-[10px] border-blue-500/40">MQL + RM</Badge>
            </div>
            <p className="text-3xl font-bold">42 cards</p>
            <p className="text-xs text-muted-foreground mt-1">R$ 188k em MRR · forecast ponderado R$ 12k (6% win)</p>
            <p className="text-[11px] text-blue-700 mt-2">Próximo passo: qualificar e agendar RM/RR</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MockNumber label="Pipeline total aberto" value="R$ 768k" hint="72 cards ativos" />
        <MockNumber label="Forecast ponderado" value="R$ 126k" hint="Σ MRR × win% da fase" />
        <MockNumber label="Em risco (aging alto)" value="11 cards" delta="+2" hint=">14d sem mover" />
        <MockNumber label="Próximas 7 dias" value="6 fechamentos" hint="próxima ação prevista" />
      </div>

      {/* Tabela de quentes (destaque máximo) */}
      <MiniTable
        title="🔥 Quentes — Propostas Enviadas (ação prioritária)"
        cols={["Cliente", "Dias parado", "MRR", "Closer", "Próxima ação"]}
        rows={[
          ["Acme Holdings", "8d", "R$ 45k", "Pedro Albite", "Reunião decisora 18/05"],
          ["Casa Viegas", "27d ⚠️", "R$ 25k", "Pedro Albite", "Follow-up — atrasou"],
          ["Tech Inova", "18d ⚠️", "R$ 28k", "Bruna", "Aguardando contraproposta"],
          ["Construtora Pampa", "15d", "R$ 32k", "Daniel T.", "Renegociar valor"],
          ["+ 8 outros quentes…", "—", "—", "—", "—"],
        ]}
        accent="border-red-500/20"
        hint="Ordenado por valor. Cards >14d destacados — risco de virar Loss"
      />

      <MiniTable
        title="🟡 Mornos — RR realizada, em negociação"
        cols={["Cliente", "Dias parado", "MRR", "Closer", "Próxima ação"]}
        rows={[
          ["Grupo XYZ", "5d", "R$ 22k", "Thiago", "Enviar proposta"],
          ["Distribuidora ABC", "12d", "R$ 18k", "Bruna", "Reunião técnica"],
          ["+ 16 outros mornos…", "—", "—", "—", "—"],
        ]}
        accent="border-amber-500/20"
      />

      <MiniTable
        title="🔵 Frios — em qualificação (MQL + RM)"
        cols={["Cliente", "Dias parado", "MRR estimado", "SDR", "Status"]}
        rows={[
          ["Lead 142", "1d", "R$ 12k", "Carlos Ramos", "RM agendada"],
          ["Lead 138", "3d", "R$ 8k", "Bruna P.M.", "Em qualificação"],
          ["+ 40 outros frios…", "—", "—", "—", "—"],
        ]}
        accent="border-blue-500/20"
      />
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
        title="Performance por SDR (período)"
        cols={["SDR", "Meta", "Real", "Atinge%", "RM→RR%", "Ciclo méd."]}
        rows={[
          ["Carlos Ramos", 30, 22, "73%", "82%", "32d"],
          ["Bruna P. Mota", 25, 18, "72%", "88%", "28d"],
          ["Erica Rocha", 20, 8, "40%", "65%", "—"],
          ["Daniel Trindade", 15, 1, "7%", "—", "—"],
        ]}
        hint="Clica no nome para abrir dossier individual"
      />

      <MiniTable
        title="Performance por Closer (período)"
        cols={["Closer", "Meta Venda", "Real", "Win%", "Ticket méd.", "Ciclo Prop→Venda"]}
        rows={[
          ["Pedro Albite", 8, 6, "30%", "R$ 28k", "10d"],
          ["Bruna", 6, 4, "27%", "R$ 22k", "9d"],
          ["Daniel Trindade", 6, 2, "12%", "R$ 18k", "18d ⚠️"],
          ["Thiago", 5, 2, "15%", "R$ 15k", "14d"],
        ]}
      />

      <div className="grid md:grid-cols-2 gap-4">
        <Placeholder title="Heatmap: atividade × dia da semana" height={240}
          hint="Quando os SDRs estão agendando RM/RR? (revela produtividade)" />
        <Placeholder title="Win rate por closer × faixa de faturamento" height={240}
          hint="Quem ganha mais em ticket alto vs ticket baixo" />
      </div>

      <Placeholder title="Dossier individual (drill-down ao clicar no nome)" height={180}
        hint="Histórico mensal, deals fechados/perdidos, motivos de perda, top clientes" />
    </div>
  );
}

function Perdas() {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 text-xs text-blue-800 dark:text-blue-300">
        💡 <strong>Importante:</strong> Esta aba mostra <strong>venda perdida no funil</strong>
        — cards que entraram em fase de Loss antes do fechamento. NÃO confundir com churn
        (cliente que cancelou depois de virar cliente) — isso está em Operação → Churn.
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MockNumber label="Cards perdidos no período" value="23" delta="+5" />
        <MockNumber label="MRR potencial perdido" value="R$ 142k" delta="+18%" hint="MRR dos cards Loss" />
        <MockNumber label="Top motivo" value="Não viu valor" hint="9/23 = 39%" />
        <MockNumber label="Dias até perda" value="12d médio" hint="cedo = qualificação ruim" />
      </div>

      <Placeholder title="Cross-tab Motivo da Perda × Faixa de Faturamento" height={260}
        hint="Heatmap: onde cada motivo aparece mais? (revela padrão de objeção por porte)" />

      <div className="grid md:grid-cols-2 gap-4">
        <MiniTable
          title="Motivos da perda — por volume"
          cols={["Motivo", "Cards", "MRR perdido", "Δ MoM"]}
          rows={[
            ["Não viu valor", 9, "R$ 38k", "+3"],
            ["Sem orçamento", 6, "R$ 22k", "+1"],
            ["Concorrência", 4, "R$ 45k ⚠️", "+2"],
            ["Não respondeu", 3, "R$ 18k", "−1"],
            ["Outros", 1, "R$ 19k", "—"],
          ]}
          hint="Concorrência sumiu? Verificar com closers em reunião"
        />
        <MiniTable
          title="Motivos por Closer (padrão revela treinamento)"
          cols={["Closer", "Motivo principal", "%"]}
          rows={[
            ["Pedro Albite", "Sem orçamento", "40%"],
            ["Bruna", "Não viu valor", "55%"],
            ["Daniel Trindade", "Concorrência", "70% ⚠️"],
            ["Thiago", "Não respondeu", "33%"],
          ]}
          hint="Closer perde sempre pelo mesmo motivo → coaching específico"
        />
      </div>

      <Placeholder title="Em qual fase as perdas estão acontecendo?" height={220}
        hint="Distribuição: perdemos em MQL, RM, RR ou Proposta? Cada fase pede ação diferente" />

      <Placeholder title="Tendência: motivos crescendo MoM (radar de alerta)" height={220} />
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
          <Badge variant="secondary">PREVIEW v2</Badge>
          <span className="text-xs text-muted-foreground">Mock estático — sem dados reais · 100% comercial (sem churn / sem marketing puro)</span>
        </div>
        <h1 className="text-2xl font-bold">Indicadores Comerciais</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Reorganização em 5 sub-páginas focadas em diagnóstico de vendas.
          Pipeline organizado por <strong>temperatura</strong> (🔥 Quente / 🟡 Morno / 🔵 Frio).
          Tudo aqui são placeholders pra validar a hierarquia.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full mb-4">
          <TabsTrigger value="executiva" className="gap-1.5">
            <LayoutDashboard className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Visão</span> Executiva
          </TabsTrigger>
          <TabsTrigger value="funil" className="gap-1.5">
            <GitBranch className="h-3.5 w-3.5" />
            Funil & Conversão
          </TabsTrigger>
          <TabsTrigger value="pipeline" className="gap-1.5">
            <Flame className="h-3.5 w-3.5 text-red-500" />
            Pipeline 🔥🟡🔵
          </TabsTrigger>
          <TabsTrigger value="pessoas" className="gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Pessoas
          </TabsTrigger>
          <TabsTrigger value="perdas" className="gap-1.5">
            <TrendingDown className="h-3.5 w-3.5" />
            Perdas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="executiva"><VisaoExecutiva /></TabsContent>
        <TabsContent value="funil"><FunilConversao /></TabsContent>
        <TabsContent value="pipeline"><PipelineAberto /></TabsContent>
        <TabsContent value="pessoas"><Pessoas /></TabsContent>
        <TabsContent value="perdas"><Perdas /></TabsContent>
      </Tabs>

      <div className="mt-8 p-4 rounded-lg border border-dashed bg-muted/30">
        <p className="text-xs text-muted-foreground">
          <strong>Mudanças nesta v2 vs v1:</strong> ❌ Removida sub-aba "Origem & Canais"
          (virou widget dentro de Funil) · 🔥 Pipeline agora organizado por temperatura
          (Quente=Proposta Enviada / Morno=RR / Frio=MQL+RM) · 🚧 Perdas reforçada como
          "venda perdida no funil" (NÃO churn) · 📊 Top 5 oportunidades passou pra
          Visão Executiva com coluna de temperatura.
        </p>
      </div>
    </div>
  );
}
