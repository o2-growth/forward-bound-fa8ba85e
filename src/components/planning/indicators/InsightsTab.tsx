import { useMemo } from "react";
import { AlertTriangle, AlertCircle, CheckCircle2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useModeloAtualAnalytics } from "@/hooks/useModeloAtualAnalytics";
import { useO2TaxAnalytics } from "@/hooks/useO2TaxAnalytics";
import { useExpansaoAnalytics } from "@/hooks/useExpansaoAnalytics";
import { useOutboundAnalytics } from "@/hooks/useOutboundAnalytics";
import { useConsolidatedMetas } from "@/hooks/useConsolidatedMetas";
import { runInsights, type BuInsightInput, type Insight, type InsightSeverity } from "@/lib/insightsEngine";
import type { DetailItem } from "./DetailSheet";

interface InsightsTabProps {
  buKey: string; // unused for now: this tab is cross-BU
  startDate: Date;
  endDate: Date;
}

interface AnalyticsLike {
  getDetailItemsForIndicator: (indicator: any) => DetailItem[];
  getLostDeals?: { cards: any[] };
  getAverageSlaMinutes?: number;
  isLoading: boolean;
}

function buildInput(bu: string, a: AnalyticsLike, faturamentoMeta: number, faturamentoRealizado: number): BuInsightInput {
  const vendas = a.getDetailItemsForIndicator("vendas") || [];
  return {
    bu,
    vendas,
    propostas: a.getDetailItemsForIndicator("propostas") || [],
    rrs: a.getDetailItemsForIndicator("rrs") || [],
    rms: a.getDetailItemsForIndicator("rms") || [],
    mqls: a.getDetailItemsForIndicator("mqls") || [],
    perdas: (a.getLostDeals?.cards || []).map((c: any) => ({
      id: c.id,
      name: c.name || "—",
      reason: c.motivoPerda || "Não informado",
      value: c.valor || 0,
      closer: c.closer,
      responsible: c.responsible,
    })) as DetailItem[],
    faturamentoRealizado,
    faturamentoMeta,
    slaMedioMin: a.getAverageSlaMinutes,
    slaMetaMin: 30,
  };
}

const SEV_STYLES: Record<InsightSeverity, { icon: any; bg: string; border: string; text: string; badge: string }> = {
  critical: {
    icon: AlertCircle,
    bg: "bg-destructive/5",
    border: "border-destructive/40",
    text: "text-destructive",
    badge: "bg-destructive text-destructive-foreground",
  },
  warning: {
    icon: AlertTriangle,
    bg: "bg-yellow-500/5",
    border: "border-yellow-500/40",
    text: "text-yellow-600 dark:text-yellow-500",
    badge: "bg-yellow-500 text-white",
  },
  ok: {
    icon: CheckCircle2,
    bg: "bg-green-500/5",
    border: "border-green-500/40",
    text: "text-green-600 dark:text-green-500",
    badge: "bg-green-500 text-white",
  },
};

function InsightCard({ insight }: { insight: Insight }) {
  const s = SEV_STYLES[insight.severity];
  const Icon = s.icon;
  return (
    <div className={`rounded-lg border ${s.border} ${s.bg} p-4 flex gap-3`}>
      <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${s.text}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="font-semibold text-foreground text-sm">{insight.title}</h4>
          <Badge variant="outline" className="text-[10px]">{insight.category}</Badge>
          {insight.bu && <Badge variant="secondary" className="text-[10px]">{insight.bu}</Badge>}
        </div>
        <p className="text-sm text-muted-foreground mt-1">{insight.description}</p>
        {insight.metric && (
          <div className="mt-2 flex items-center gap-3 text-xs">
            <span className="text-muted-foreground">{insight.metric.label}:</span>
            <span className={`font-semibold ${s.text}`}>{insight.metric.value}</span>
            {insight.metric.target != null && (
              <span className="text-muted-foreground">Meta: {insight.metric.target}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function InsightsTab({ startDate, endDate }: InsightsTabProps) {
  const modelo = useModeloAtualAnalytics(startDate, endDate);
  const o2 = useO2TaxAnalytics(startDate, endDate);
  const expansao = useExpansaoAnalytics(startDate, endDate);
  const outbound = useOutboundAnalytics(startDate, endDate);
  const metas = useConsolidatedMetas();

  const insights = useMemo<Insight[]>(() => {
    if (modelo.isLoading || o2.isLoading || expansao.isLoading) return [];

    const monthKey = startDate.toLocaleString("pt-BR", { month: "short" }).replace(".", "");

    const sumRealizado = (items: DetailItem[]) =>
      items.reduce((acc, it) => acc + ((it.mrr || 0) + (it.setup || 0) + (it.pontual || 0) || (it.value || 0)), 0);

    const buildMeta = (bu: any) => {
      try {
        return metas.getMetaForBu?.(bu, "faturamento", monthKey)?.value || 0;
      } catch {
        return 0;
      }
    };

    const inputs: BuInsightInput[] = [
      buildInput(
        "Modelo Atual",
        modelo as AnalyticsLike,
        buildMeta("Modelo Atual"),
        sumRealizado(modelo.getDetailItemsForIndicator("vendas") || []),
      ),
      buildInput(
        "O2 TAX",
        o2 as AnalyticsLike,
        buildMeta("O2 TAX"),
        sumRealizado(o2.getDetailItemsForIndicator("vendas") || []),
      ),
      buildInput(
        "Expansão",
        expansao as AnalyticsLike,
        buildMeta("Expansão"),
        sumRealizado(expansao.getDetailItemsForIndicator("vendas") || []),
      ),
      buildInput(
        "Outbound",
        outbound as AnalyticsLike,
        0,
        sumRealizado(outbound.getDetailItemsForIndicator("vendas") || []),
      ),
    ];

    return runInsights(inputs);
  }, [modelo, o2, expansao, outbound, metas, startDate]);

  const isLoading = modelo.isLoading || o2.isLoading || expansao.isLoading;

  const grouped = useMemo(() => {
    return {
      critical: insights.filter((i) => i.severity === "critical"),
      warning: insights.filter((i) => i.severity === "warning"),
      ok: insights.filter((i) => i.severity === "ok"),
    };
  }, [insights]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Sparkles className="h-5 w-5 mr-2 animate-pulse" />
        Analisando dados comerciais…
      </div>
    );
  }

  if (insights.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-green-500" />
        <p className="font-medium text-foreground">Nenhum insight crítico no período</p>
        <p className="text-sm mt-1">Tudo dentro do esperado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Insights Comerciais</h3>
        </div>
        <Badge className="bg-destructive text-destructive-foreground">{grouped.critical.length} críticos</Badge>
        <Badge className="bg-yellow-500 text-white">{grouped.warning.length} atenção</Badge>
        <Badge className="bg-green-500 text-white">{grouped.ok.length} ok</Badge>
      </div>

      {grouped.critical.length > 0 && (
        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-destructive uppercase tracking-wide">Críticos</h4>
          {grouped.critical.map((i) => <InsightCard key={i.id} insight={i} />)}
        </section>
      )}

      {grouped.warning.length > 0 && (
        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-yellow-600 dark:text-yellow-500 uppercase tracking-wide">Atenção</h4>
          {grouped.warning.map((i) => <InsightCard key={i.id} insight={i} />)}
        </section>
      )}

      {grouped.ok.length > 0 && (
        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-green-600 dark:text-green-500 uppercase tracking-wide">No verde</h4>
          {grouped.ok.map((i) => <InsightCard key={i.id} insight={i} />)}
        </section>
      )}
    </div>
  );
}
