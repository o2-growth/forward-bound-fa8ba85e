import { useState, useMemo } from "react";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DateRangePickerGA } from "./DateRangePickerGA";
import { useModeloAtualMetas } from "@/hooks/useModeloAtualMetas";
import { useO2TaxMetas } from "@/hooks/useO2TaxMetas";
import { useExpansaoMetas } from "@/hooks/useExpansaoMetas";
import { useOxyHackerMetas } from "@/hooks/useOxyHackerMetas";
import { useOutboundAnalytics } from "@/hooks/useOutboundAnalytics";
import { useMonetizacaoAnalytics } from "@/hooks/useMonetizacaoAnalytics";
import { useMetaCampaigns } from "@/hooks/useMetaCampaigns";
import { useGoogleCampaigns } from "@/hooks/useGoogleCampaigns";
import { useMarketingSheetData } from "@/hooks/useMarketingSheetData";
import { useOperationsData } from "@/hooks/useOperationsData";
import { useHrData } from "@/hooks/useHrData";
import { useNpsData } from "@/hooks/useNpsData";
import { NPS_METRICS, NPS_DISTRIBUTION } from "./nps/npsData";
import { openCeoReport, type ReportSection } from "./ceo/ceoReport";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";
import {
  DollarSign,
  TrendingUp,
  Target,
  ShoppingCart,
  Users,
  HeartHandshake,
  Megaphone,
  AlertTriangle,
  FileDown,
  Loader2,
} from "lucide-react";

// ─── Formatadores ──────────────────────────────────────
function fmt(value: number | null | undefined, prefix = "R$ "): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  if (Math.abs(value) >= 1_000_000) return `${prefix}${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${prefix}${(value / 1_000).toFixed(1)}k`;
  return `${prefix}${value.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
}
function fmtFull(value: number | null | undefined, prefix = "R$ "): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${prefix}${value.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
}
function fmtPct(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${value.toFixed(1)}%`;
}
function fmtX(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${value.toFixed(2)}x`;
}
function fmtInt(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toLocaleString("pt-BR");
}

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

// ─── Card de métrica ───────────────────────────────────
interface MetricCardProps {
  label: string;
  value: string;
  sublabel?: string;
  icon?: React.ReactNode;
  placeholder?: boolean;
  large?: boolean;
  tone?: "default" | "danger" | "success";
}
function MetricCard({ label, value, sublabel, icon, placeholder, large, tone = "default" }: MetricCardProps) {
  const toneCls =
    tone === "danger"
      ? "border-destructive/40"
      : tone === "success"
        ? "border-green-500/40"
        : "border-border";
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-lg border p-4 ${
        large ? "min-h-[120px]" : "min-h-[90px]"
      } ${placeholder ? "bg-muted/30 border-dashed border-muted-foreground/30" : `bg-card ${toneCls}`}`}
    >
      {icon && <div className="mb-1 text-muted-foreground">{icon}</div>}
      <span className={`font-bold leading-tight text-foreground ${large ? "text-2xl" : "text-lg"}`}>{value}</span>
      <span className="mt-0.5 text-center text-xs leading-tight text-muted-foreground">{label}</span>
      {sublabel && <span className="mt-0.5 text-[10px] italic text-muted-foreground/60">{sublabel}</span>}
    </div>
  );
}

// ─── Cabeçalho de seção com botão de relatório ─────────
function SectionHeader({
  icon,
  title,
  description,
  onReport,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  onReport?: () => void;
}) {
  return (
    <CardHeader className="pb-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            {icon}
            {title}
          </CardTitle>
          {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
        </div>
        {onReport && (
          <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={onReport}>
            <FileDown className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Relatório</span>
          </Button>
        )}
      </div>
    </CardHeader>
  );
}

// Tooltip recharts com estilo do tema
interface ChartTooltipProps {
  active?: boolean;
  payload?: { name?: string; value?: number }[];
  label?: string | number;
  formatter?: (value: number) => string;
}
function ChartTooltip({ active, payload, label, formatter }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="mb-1 font-medium text-foreground">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="text-muted-foreground">
          {p.name}: <span className="font-semibold text-foreground">{formatter ? formatter(p.value ?? 0) : p.value}</span>
        </div>
      ))}
    </div>
  );
}

export function CeoViewTab() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const { from: startDate, to: endDate } = dateRange;
  const periodLabel = `${format(startDate, "dd/MM/yyyy")} – ${format(endDate, "dd/MM/yyyy")}`;

  // ─── Hooks de dados (mesmas fontes das abas do dash) ──
  const modeloAtual = useModeloAtualMetas(startDate, endDate);
  const o2tax = useO2TaxMetas(startDate, endDate);
  const expansao = useExpansaoMetas(startDate, endDate);
  const oxyHacker = useOxyHackerMetas(startDate, endDate);
  const outbound = useOutboundAnalytics(startDate, endDate);
  const monetizacao = useMonetizacaoAnalytics(startDate, endDate);
  const metaCampaigns = useMetaCampaigns(startDate, endDate);
  const googleCampaigns = useGoogleCampaigns(startDate, endDate);
  const marketingSheet = useMarketingSheetData({ startDate, endDate });
  const npsQuery = useNpsData();
  const ops = useOperationsData();
  const hr = useHrData({ startDate, endDate });

  const isLoading =
    modeloAtual.isLoading || o2tax.isLoading || expansao.isLoading || oxyHacker.isLoading || hr.isLoading;

  // ─── Comercial / Receita ──────────────────────────────
  // Mesma base do acelerômetro Comercial: 4 BUs + Outbound + Funil Monetização (apenas "Concluído").
  const comercial = useMemo(() => {
    const outboundVendaCards = outbound.getCardsForIndicator("venda");
    const outboundValor = outboundVendaCards.reduce((s, c) => s + (c.valor || 0), 0);

    const monetVendaItems = monetizacao.getDetailItemsForIndicator("venda");
    const monetValor = monetVendaItems.reduce((s, i) => s + (i.value || 0), 0);

    const buSales = [
      { key: "Modelo Atual", qty: modeloAtual.getQtyForPeriod("venda", startDate, endDate), value: modeloAtual.getValueForPeriod("venda", startDate, endDate) },
      { key: "O2 Tax", qty: o2tax.getQtyForPeriod("venda", startDate, endDate), value: o2tax.getValueForPeriod("venda", startDate, endDate) },
      { key: "Franquia", qty: expansao.getQtyForPeriod("venda", startDate, endDate), value: expansao.getValueForPeriod("venda", startDate, endDate) },
      { key: "Oxy Hacker", qty: oxyHacker.getQtyForPeriod("venda", startDate, endDate), value: oxyHacker.getValueForPeriod("venda", startDate, endDate) },
      { key: "Outbound", qty: outboundVendaCards.length, value: outboundValor },
      { key: "Monetização", qty: monetVendaItems.length, value: monetValor },
    ];
    const totalSales = buSales.reduce((s, b) => s + b.qty, 0);
    const totalRevenue = buSales.reduce((s, b) => s + b.value, 0);

    // MRR novo: regra do projeto — apenas Modelo Atual + O2 TAX entram no MRR recorrente novo.
    const mrrNovo = (modeloAtual.getMrrForPeriod?.(startDate, endDate) ?? 0) + (o2tax.getMrrForPeriod?.(startDate, endDate) ?? 0);
    const arr = mrrNovo * 12;
    const ticketMedio = totalSales > 0 ? totalRevenue / totalSales : null;

    const bestBu = [...buSales].sort((a, b) => b.value - a.value)[0];

    return { buSales, totalSales, totalRevenue, mrrNovo, arr, ticketMedio, bestBu };
  }, [modeloAtual, o2tax, expansao, oxyHacker, outbound, monetizacao, startDate, endDate]);

  // ─── Aquisição / Marketing ────────────────────────────
  const aquisicao = useMemo(() => {
    const metaSpend = (metaCampaigns.data ?? []).reduce((s, c) => s + (c.investment || 0), 0);
    const googleSpend = (googleCampaigns.data ?? []).reduce((s, c) => s + (c.investment || 0), 0);
    const metaLeads = (metaCampaigns.data ?? []).reduce((s, c) => s + (c.leads || 0), 0);
    const googleLeads = (googleCampaigns.data ?? []).reduce((s, c) => s + (c.leads || 0), 0);

    // Mesma fonte da aba Marketing: prioriza planilha consolidada (`midiaTotal`),
    // com fallback para soma direta de Meta + Google via API.
    const sheetTotal = marketingSheet.data?.midiaTotal ?? 0;
    const mediaInvestment = sheetTotal > 0 ? sheetTotal : metaSpend + googleSpend;
    const totalLeads = metaLeads + googleLeads;

    // MQLs reais por BU + Outbound (alinhado ao acelerômetro Comercial e à aba Marketing).
    const totalMqls =
      modeloAtual.getQtyForPeriod("mql", startDate, endDate) +
      o2tax.getQtyForPeriod("mql", startDate, endDate) +
      expansao.getQtyForPeriod("mql", startDate, endDate) +
      oxyHacker.getQtyForPeriod("mql", startDate, endDate) +
      outbound.getCardsForIndicator("mql").length;

    const custoMql = totalMqls > 0 ? mediaInvestment / totalMqls : null;
    const cpl = totalLeads > 0 ? mediaInvestment / totalLeads : null;

    const channels = [
      { name: "Meta Ads", investment: metaSpend, leads: metaLeads, cpl: metaLeads > 0 ? metaSpend / metaLeads : null },
      { name: "Google Ads", investment: googleSpend, leads: googleLeads, cpl: googleLeads > 0 ? googleSpend / googleLeads : null },
    ];
    // Melhor canal: maior volume de leads (desempate por menor CPL)
    const ranked = [...channels].filter((c) => c.leads > 0).sort((a, b) => b.leads - a.leads || (a.cpl ?? Infinity) - (b.cpl ?? Infinity));
    const bestChannel = ranked[0] ?? null;

    return { metaSpend, googleSpend, mediaInvestment, metaLeads, googleLeads, totalLeads, totalMqls, custoMql, cpl, channels, bestChannel };
  }, [metaCampaigns.data, googleCampaigns.data, marketingSheet.data, modeloAtual, o2tax, expansao, oxyHacker, outbound, startDate, endDate]);

  // ─── Operação / Churn ─────────────────────────────────
  const operacao = useMemo(() => {
    const data = ops.data;
    const kpis = data?.kpis;
    const dossier = data?.churnDossier ?? [];

    // Churn agrupado por CFO (squad responsável)
    const bySquadMap = new Map<string, { count: number; mrr: number }>();
    for (const c of dossier) {
      const squad = c.cfo?.trim() || "Sem responsável";
      const cur = bySquadMap.get(squad) ?? { count: 0, mrr: 0 };
      cur.count += 1;
      cur.mrr += c.mrr || 0;
      bySquadMap.set(squad, cur);
    }
    const churnBySquad = Array.from(bySquadMap.entries())
      .map(([squad, v]) => ({ squad, ...v }))
      .sort((a, b) => b.count - a.count);
    const churnMrrTotal = churnBySquad.reduce((s, c) => s + c.mrr, 0);

    return {
      clientesAtivos: kpis?.totalAtivos ?? null,
      mrrBase: kpis?.mrrTotal ?? null,
      tratativas: kpis?.tratativasAtivas ?? null,
      churnQtd: kpis?.churn ?? dossier.length,
      churnRate: kpis?.churnRate ?? null,
      retencaoRate: kpis?.retencaoRate ?? null,
      mrrEmRisco: kpis?.mrrEmRisco ?? null,
      churnBySquad,
      churnMrrTotal,
    };
  }, [ops.data]);

  // ─── Pessoas ──────────────────────────────────────────
  const pessoas = useMemo(() => {
    const topTimes = [...(hr.headcountByTime ?? [])].slice(0, 6);
    const turnoverTimes = [...(hr.turnoverByTime ?? [])]
      .filter((t) => t.headcount > 0)
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 6);
    return {
      headcount: hr.headcountTotal ?? null,
      turnover: hr.turnoverGeral ?? null,
      tempoCasa: hr.tempoMedioDeCasaDias ?? null,
      admissoes: hr.admissoesNoPeriodo ?? null,
      desligados: hr.desligadosNoPeriodo ?? null,
      topTimes,
      turnoverTimes,
    };
  }, [hr.headcountByTime, hr.turnoverByTime, hr.headcountTotal, hr.turnoverGeral, hr.tempoMedioDeCasaDias, hr.admissoesNoPeriodo, hr.desligadosNoPeriodo]);

  // ─── NPS — prioriza dados ao vivo (mesma fonte da aba NPS); fallback no snapshot Q4/2025 ──
  const nps = useMemo(() => {
    const live = npsQuery.data;
    const liveScore = live?.metrics?.nps?.score;
    const hasLive = typeof liveScore === "number" && (live?.kpis?.respostas ?? 0) > 0;
    if (hasLive && live) {
      return {
        score: live.metrics.nps.score,
        meta: live.metrics.nps.meta,
        csat: live.metrics.csat.score,
        promotores: live.npsDistribution.promotores,
        detratores: live.npsDistribution.detratores,
        neutros: live.npsDistribution.neutros,
        source: "live" as const,
      };
    }
    return {
      score: NPS_METRICS.nps.score,
      meta: NPS_METRICS.nps.meta,
      csat: NPS_METRICS.csat.score,
      promotores: NPS_DISTRIBUTION.promotores,
      detratores: NPS_DISTRIBUTION.detratores,
      neutros: NPS_DISTRIBUTION.neutros,
      source: "snapshot" as const,
    };
  }, [npsQuery.data]);

  // ─── Relatórios por área ──────────────────────────────
  const generatedAt = format(new Date(), "dd/MM/yyyy HH:mm");

  const sectionAquisicao = (): ReportSection => ({
    area: "Aquisição & Marketing",
    owner: "Time de Marketing / Growth",
    kpis: [
      { label: "Investimento em mídia", value: fmtFull(aquisicao.mediaInvestment) },
      { label: "Leads", value: fmtInt(aquisicao.totalLeads) },
      { label: "MQLs", value: fmtInt(aquisicao.totalMqls) },
      { label: "Custo por MQL", value: fmtFull(aquisicao.custoMql) },
      { label: "Melhor canal", value: aquisicao.bestChannel?.name ?? "—", sub: aquisicao.bestChannel ? `${fmtInt(aquisicao.bestChannel.leads)} leads` : undefined },
    ],
    breakdown: {
      title: "Investimento e leads por canal",
      rows: aquisicao.channels.map((c) => ({ label: c.name, value: fmtFull(c.investment), extra: `${fmtInt(c.leads)} leads · CPL ${fmtFull(c.cpl)}` })),
    },
  });

  const sectionComercial = (): ReportSection => ({
    area: "Comercial",
    owner: "Time Comercial",
    kpis: [
      { label: "Total de vendas", value: fmtInt(comercial.totalSales) },
      { label: "Faturamento", value: fmtFull(comercial.totalRevenue) },
      { label: "MRR novo", value: fmtFull(comercial.mrrNovo) },
      { label: "Ticket médio", value: fmtFull(comercial.ticketMedio) },
      { label: "ARR (novo)", value: fmtFull(comercial.arr) },
    ],
    breakdown: {
      title: "Vendas por BU",
      rows: comercial.buSales.map((b) => ({ label: b.key, value: fmtFull(b.value), extra: `${fmtInt(b.qty)} vendas` })),
    },
  });

  const sectionOperacao = (): ReportSection => ({
    area: "Operação & Churn",
    owner: "Time de CS / CFOs",
    kpis: [
      { label: "Clientes ativos", value: fmtInt(operacao.clientesAtivos) },
      { label: "MRR base", value: fmtFull(operacao.mrrBase) },
      { label: "Tratativas ativas", value: fmtInt(operacao.tratativas) },
      { label: "Churn (logos)", value: fmtInt(operacao.churnQtd) },
      { label: "Retenção", value: fmtPct(operacao.retencaoRate) },
    ],
    breakdown: {
      title: "Churn por squad (CFO responsável)",
      rows: operacao.churnBySquad.map((c) => ({ label: c.squad, value: `${fmtInt(c.count)} churns`, extra: `${fmtFull(c.mrr)} MRR` })),
    },
  });

  const sectionPessoas = (): ReportSection => ({
    area: "Pessoas",
    owner: "Time de Gente & Gestão",
    kpis: [
      { label: "Headcount", value: fmtInt(pessoas.headcount) },
      { label: "Turnover", value: fmtPct(pessoas.turnover) },
      { label: "Tempo médio de casa", value: pessoas.tempoCasa != null ? `${Math.round(pessoas.tempoCasa / 30)} meses` : "—" },
      { label: "Admissões", value: fmtInt(pessoas.admissoes) },
      { label: "Desligamentos", value: fmtInt(pessoas.desligados) },
    ],
    breakdown: {
      title: "Turnover por time",
      rows: pessoas.turnoverTimes.map((t) => ({ label: t.group, value: fmtPct(t.pct), extra: `${fmtInt(t.desligados)} de ${fmtInt(t.headcount)}` })),
    },
  });

  const sectionNps = (): ReportSection => ({
    area: "Experiência do Cliente (NPS)",
    owner: "Time de CS",
    kpis: [
      { label: "NPS", value: String(nps.score), sub: `meta ${nps.meta}` },
      { label: "CSAT", value: `${nps.csat}%` },
      { label: "Promotores", value: `${nps.promotores.pct}%`, sub: `${nps.promotores.count} clientes` },
      { label: "Detratores", value: `${nps.detratores.pct}%`, sub: `${nps.detratores.count} clientes` },
      { label: "Neutros", value: `${nps.neutros.pct}%`, sub: `${nps.neutros.count} clientes` },
    ],
  });

  const reportSectionBuilders: Record<string, () => ReportSection> = {
    aquisicao: sectionAquisicao,
    comercial: sectionComercial,
    operacao: sectionOperacao,
    pessoas: sectionPessoas,
    nps: sectionNps,
  };

  const handleAreaReport = (key: keyof typeof reportSectionBuilders, title: string) => {
    openCeoReport({
      title: `Relatório · ${title}`,
      periodLabel,
      generatedAt,
      sections: [reportSectionBuilders[key]()],
    });
  };

  const handleFullReport = () => {
    openCeoReport({
      title: "Visão do CEO — Relatório Consolidado",
      periodLabel,
      generatedAt,
      sections: [sectionAquisicao(), sectionComercial(), sectionOperacao(), sectionPessoas(), sectionNps()],
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ─── Dados para gráficos ──────────────────────────────
  const vendasPorBuData = comercial.buSales.map((b) => ({ name: b.key, Faturamento: b.value, Vendas: b.qty }));
  const investimentoCanalData = aquisicao.channels.map((c) => ({ name: c.name, value: c.investment }));
  const churnSquadData = operacao.churnBySquad.slice(0, 8).map((c) => ({ name: c.squad.split(" ")[0], Churns: c.count, MRR: c.mrr }));
  const turnoverTimeData = pessoas.turnoverTimes.map((t) => ({ name: t.group, Turnover: Number(t.pct.toFixed(1)) }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-display text-xl font-semibold text-foreground">Visão do CEO</h2>
          <p className="text-sm text-muted-foreground">Da entrada (marketing) à ponta (operação, churn e NPS)</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="default" size="sm" className="gap-1.5" onClick={handleFullReport}>
            <FileDown className="h-4 w-4" />
            Relatório completo
          </Button>
          <DateRangePickerGA
            startDate={dateRange.from}
            endDate={dateRange.to}
            onDateChange={(start, end) => setDateRange({ from: start, to: end })}
          />
        </div>
      </div>

      {/* ── KPIs de destaque ── */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <MetricCard label="Faturamento" value={fmt(comercial.totalRevenue)} sublabel={`${comercial.totalSales} vendas`} icon={<DollarSign className="h-5 w-5" />} large />
        <MetricCard label="ARR (novo MRR)" value={fmt(comercial.arr)} sublabel="MRR novo × 12" icon={<TrendingUp className="h-5 w-5" />} large />
        <MetricCard label="Churn (logos)" value={fmtInt(operacao.churnQtd)} sublabel={operacao.retencaoRate != null ? `Retenção ${fmtPct(operacao.retencaoRate)}` : "base atual"} icon={<AlertTriangle className="h-5 w-5" />} large tone="danger" />
        <MetricCard label="NPS" value={String(nps.score)} sublabel={nps.source === "live" ? "dados ao vivo" : "Q4 2025"} icon={<HeartHandshake className="h-5 w-5" />} large tone={nps.score >= nps.meta ? "success" : "default"} />
      </div>

      {/* ── 1. Aquisição & Marketing ── */}
      <Card>
        <SectionHeader
          icon={<Megaphone className="h-4 w-4 text-muted-foreground" />}
          title="Aquisição & Marketing"
          description="Entrada do funil — investimento, leads e eficiência de canal"
          onReport={() => handleAreaReport("aquisicao", "Aquisição & Marketing")}
        />
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            <MetricCard label="Investimento mídia" value={fmt(aquisicao.mediaInvestment)} sublabel="Meta + Google" />
            <MetricCard label="Leads" value={fmtInt(aquisicao.totalLeads)} />
            <MetricCard label="MQLs" value={fmtInt(aquisicao.totalMqls)} />
            <MetricCard label="Custo por MQL" value={fmt(aquisicao.custoMql)} sublabel="invest. / MQLs" />
            <MetricCard label="Melhor canal" value={aquisicao.bestChannel?.name ?? "—"} sublabel={aquisicao.bestChannel ? `${fmtInt(aquisicao.bestChannel.leads)} leads · CPL ${fmt(aquisicao.bestChannel.cpl)}` : undefined} />
          </div>
          {aquisicao.mediaInvestment > 0 && (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={investimentoCanalData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(e: { name?: string }) => e.name ?? ""}>
                    {investimentoCanalData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip formatter={(v: number) => fmtFull(v)} />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── 2. Comercial ── */}
      <Card>
        <SectionHeader
          icon={<ShoppingCart className="h-4 w-4 text-muted-foreground" />}
          title="Comercial"
          description="Vendas, faturamento e novo MRR no período — por BU"
          onReport={() => handleAreaReport("comercial", "Comercial")}
        />
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            <MetricCard label="Total de vendas" value={fmtInt(comercial.totalSales)} />
            <MetricCard label="Faturamento" value={fmt(comercial.totalRevenue)} />
            <MetricCard label="MRR novo" value={fmt(comercial.mrrNovo)} />
            <MetricCard label="Ticket médio" value={fmt(comercial.ticketMedio)} sublabel="receita / vendas" />
            <MetricCard label="Melhor BU" value={comercial.bestBu?.key ?? "—"} sublabel={comercial.bestBu ? fmt(comercial.bestBu.value) : undefined} tone="success" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={vendasPorBuData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => fmt(v, "")} />
                <Tooltip content={<ChartTooltip formatter={(v: number) => fmtFull(v)} />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} />
                <Bar dataKey="Faturamento" radius={[4, 4, 0, 0]}>
                  {vendasPorBuData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* ── 3. Operação & Churn ── */}
      <Card>
        <SectionHeader
          icon={<HeartHandshake className="h-4 w-4 text-muted-foreground" />}
          title="Operação & Churn"
          description="Base de clientes, tratativas e churn por squad (base atual, não filtrado por período)"
          onReport={() => handleAreaReport("operacao", "Operação & Churn")}
        />
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
            <MetricCard label="Clientes ativos" value={fmtInt(operacao.clientesAtivos)} />
            <MetricCard label="MRR base" value={fmt(operacao.mrrBase)} />
            <MetricCard label="Tratativas ativas" value={fmtInt(operacao.tratativas)} />
            <MetricCard label="Churn (logos)" value={fmtInt(operacao.churnQtd)} tone="danger" />
            <MetricCard label="Retenção" value={fmtPct(operacao.retencaoRate)} />
            <MetricCard label="MRR em risco" value={fmt(operacao.mrrEmRisco)} tone="danger" />
          </div>
          {churnSquadData.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Churn por squad (CFO responsável)</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={churnSquadData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip content={<ChartTooltip formatter={(v: number) => fmtInt(v)} />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} />
                    <Bar dataKey="Churns" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── 4. Pessoas ── */}
      <Card>
        <SectionHeader
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          title="Pessoas"
          description="Headcount, turnover e performance por time"
          onReport={() => handleAreaReport("pessoas", "Pessoas")}
        />
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            <MetricCard label="Headcount" value={fmtInt(pessoas.headcount)} />
            <MetricCard label="Turnover" value={fmtPct(pessoas.turnover)} tone={pessoas.turnover != null && pessoas.turnover > 10 ? "danger" : "default"} />
            <MetricCard label="Tempo médio de casa" value={pessoas.tempoCasa != null ? `${Math.round(pessoas.tempoCasa / 30)} m` : "—"} sublabel="meses" />
            <MetricCard label="Admissões" value={fmtInt(pessoas.admissoes)} />
            <MetricCard label="Desligamentos" value={fmtInt(pessoas.desligados)} />
          </div>
          {turnoverTimeData.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Turnover por time (%)</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={turnoverTimeData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${v}%`} />
                    <Tooltip content={<ChartTooltip formatter={(v: number) => `${v}%`} />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} />
                    <Bar dataKey="Turnover" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── 5. Experiência do Cliente (NPS) ── */}
      <Card>
        <SectionHeader
          icon={<Target className="h-4 w-4 text-muted-foreground" />}
          title="Experiência do Cliente (NPS)"
          description={nps.source === "live" ? "Satisfação e lealdade da base (dados ao vivo)" : "Satisfação e lealdade da base (snapshot Q4 2025)"}
          onReport={() => handleAreaReport("nps", "Experiência do Cliente (NPS)")}
        />
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            <MetricCard label="NPS" value={String(nps.score)} sublabel={`meta ${nps.meta}`} tone={nps.score >= nps.meta ? "success" : "default"} />
            <MetricCard label="CSAT" value={`${nps.csat}%`} />
            <MetricCard label="Promotores" value={`${nps.promotores.pct}%`} sublabel={`${nps.promotores.count} clientes`} tone="success" />
            <MetricCard label="Neutros" value={`${nps.neutros.pct}%`} sublabel={`${nps.neutros.count} clientes`} />
            <MetricCard label="Detratores" value={`${nps.detratores.pct}%`} sublabel={`${nps.detratores.count} clientes`} tone="danger" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
