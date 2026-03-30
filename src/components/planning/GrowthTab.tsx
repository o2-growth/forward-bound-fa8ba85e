import { useState, useMemo } from "react";
import { startOfMonth, endOfMonth } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangePickerGA } from "./DateRangePickerGA";
import { useModeloAtualMetas } from "@/hooks/useModeloAtualMetas";
import { useO2TaxMetas } from "@/hooks/useO2TaxMetas";
import { useExpansaoMetas } from "@/hooks/useExpansaoMetas";
import { useOxyHackerMetas } from "@/hooks/useOxyHackerMetas";
import { useMetaCampaigns } from "@/hooks/useMetaCampaigns";
import { useGoogleCampaigns } from "@/hooks/useGoogleCampaigns";
import { NPS_METRICS } from "./nps/npsData";
import {
  DollarSign,
  TrendingUp,
  Target,
  ShoppingCart,
  Users,
  HeartHandshake,
  Loader2,
} from "lucide-react";

function fmt(value: number | null, prefix = "R$ "): string {
  if (value === null || value === undefined) return "—";
  if (value >= 1_000_000) return `${prefix}${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${prefix}${(value / 1_000).toFixed(1)}k`;
  return `${prefix}${value.toLocaleString("pt-BR")}`;
}

function fmtPct(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return `${value.toFixed(1)}%`;
}

function fmtX(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return `${value.toFixed(2)}x`;
}

interface MetricCardProps {
  label: string;
  value: string;
  sublabel?: string;
  icon?: React.ReactNode;
  placeholder?: boolean;
  large?: boolean;
}

function MetricCard({ label, value, sublabel, icon, placeholder, large }: MetricCardProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-lg border p-4 ${
        large ? "min-h-[120px]" : "min-h-[90px]"
      } ${
        placeholder
          ? "bg-muted/30 border-dashed border-muted-foreground/30"
          : "bg-card border-border"
      }`}
    >
      {icon && <div className="mb-1 text-muted-foreground">{icon}</div>}
      <span
        className={`font-bold text-foreground leading-tight ${
          large ? "text-2xl" : "text-lg"
        }`}
      >
        {value}
      </span>
      <span className="text-xs text-muted-foreground text-center leading-tight mt-0.5">
        {label}
      </span>
      {sublabel && (
        <span className="text-[10px] text-muted-foreground/60 italic mt-0.5">
          {sublabel}
        </span>
      )}
    </div>
  );
}

export function GrowthTab() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const { from: startDate, to: endDate } = dateRange;

  // ─── Data hooks ────────────────────────────────────
  const modeloAtual = useModeloAtualMetas(startDate, endDate);
  const o2tax = useO2TaxMetas(startDate, endDate);
  const expansao = useExpansaoMetas(startDate, endDate);
  const oxyHacker = useOxyHackerMetas(startDate, endDate);

  const metaCampaigns = useMetaCampaigns(startDate, endDate);
  const googleCampaigns = useGoogleCampaigns(startDate, endDate);

  const isLoading =
    modeloAtual.isLoading || o2tax.isLoading || expansao.isLoading || oxyHacker.isLoading;

  // ─── Calculated metrics ────────────────────────────
  const metrics = useMemo(() => {
    // MRR from sales in period (all BUs)
    const mrrModeloAtual = (() => {
      const movements = modeloAtual.movements ?? [];
      const startTime = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime();
      const endTime = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999).getTime();
      const cardMrr = new Map<string, number>();
      for (const m of movements) {
        if (m.fase === "Contrato assinado") {
          const t = m.dataEntrada.getTime();
          if (t >= startTime && t <= endTime && !cardMrr.has(m.id)) {
            cardMrr.set(m.id, m.valorMRR);
          }
        }
      }
      return Array.from(cardMrr.values()).reduce((s, v) => s + v, 0);
    })();

    const mrrO2Tax = o2tax.getMrrForPeriod?.(startDate, endDate) ?? 0;

    const totalMRR = mrrModeloAtual + mrrO2Tax;
    const arr = totalMRR * 12;
    const valuation = arr * 10;

    // Sales qty
    const salesMA = modeloAtual.getQtyForPeriod("venda", startDate, endDate);
    const salesO2 = o2tax.getQtyForPeriod("venda", startDate, endDate);
    const salesExp = expansao.getQtyForPeriod("venda", startDate, endDate);
    const salesOxy = oxyHacker.getQtyForPeriod("venda", startDate, endDate);
    const totalSales = salesMA + salesO2 + salesExp + salesOxy;

    // Revenue (GMV) from sales
    const revMA = modeloAtual.getValueForPeriod("venda", startDate, endDate);
    const revO2 = o2tax.getValueForPeriod("venda", startDate, endDate);
    const revExp = expansao.getValueForPeriod("venda", startDate, endDate);
    const revOxy = oxyHacker.getValueForPeriod("venda", startDate, endDate);
    const totalRevenue = revMA + revO2 + revExp + revOxy;

    // Setup
    const setupMA = (() => {
      const movements = modeloAtual.movements ?? [];
      const startTime = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime();
      const endTime = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999).getTime();
      const cardSetup = new Map<string, number>();
      for (const m of movements) {
        if (m.fase === "Contrato assinado") {
          const t = m.dataEntrada.getTime();
          if (t >= startTime && t <= endTime && !cardSetup.has(m.id)) {
            cardSetup.set(m.id, m.valorSetup);
          }
        }
      }
      return Array.from(cardSetup.values()).reduce((s, v) => s + v, 0);
    })();
    const setupO2 = o2tax.getSetupForPeriod?.(startDate, endDate) ?? 0;
    const totalSetup = setupMA + setupO2;

    // Pontual
    const pontualMA = (() => {
      const movements = modeloAtual.movements ?? [];
      const startTime = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime();
      const endTime = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999).getTime();
      const cardPontual = new Map<string, number>();
      for (const m of movements) {
        if (m.fase === "Contrato assinado") {
          const t = m.dataEntrada.getTime();
          if (t >= startTime && t <= endTime && !cardPontual.has(m.id)) {
            cardPontual.set(m.id, m.valorPontual);
          }
        }
      }
      return Array.from(cardPontual.values()).reduce((s, v) => s + v, 0);
    })();
    const pontualO2 = o2tax.getPontualForPeriod?.(startDate, endDate) ?? 0;
    const totalPontual = pontualMA + pontualO2;

    // Media investment
    const metaSpend = (metaCampaigns.data ?? []).reduce((s, c) => s + c.investment, 0);
    const googleSpend = (googleCampaigns.data ?? []).reduce((s, c) => s + c.investment, 0);
    const mediaInvestment = metaSpend + googleSpend;

    // Placeholder investment components
    const eventInvestment = 0;
    const teamInvestment = 0;
    const toolsInvestment = 0;
    const totalInvestment = mediaInvestment + eventInvestment + teamInvestment + toolsInvestment;

    // ROAS & ROI
    const roasDirect = totalInvestment > 0 ? totalRevenue / totalInvestment : null;
    const ltvEstimate = totalMRR > 0 && totalSales > 0 ? (totalMRR / totalSales) * 12 : null;
    const roasLtv = totalInvestment > 0 && ltvEstimate ? (ltvEstimate * totalSales) / totalInvestment : null;
    const roiDirect = totalInvestment > 0 ? (totalRevenue - totalInvestment) / totalInvestment : null;
    const roiLtv = totalInvestment > 0 && ltvEstimate ? ((ltvEstimate * totalSales) - totalInvestment) / totalInvestment : null;

    // CPV & CAC
    const cpv = totalSales > 0 ? totalInvestment / totalSales : null;
    const cac = cpv; // Same as CPV when only media cost is considered
    const ltv = ltvEstimate;
    const tcv = totalSales > 0 ? totalRevenue / totalSales : null;
    const ltvCacRatio = ltv && cac && cac > 0 ? ltv / cac : null;

    // NPS (hardcoded Q4 2025)
    const nps = NPS_METRICS.nps.score;

    return {
      totalMRR, arr, valuation, nps, ltvCacRatio,
      mediaInvestment, eventInvestment, teamInvestment, toolsInvestment, totalInvestment,
      totalSetup, totalPontual,
      roasDirect, roasLtv, roiDirect, roiLtv,
      cpv, cac, ltv, tcv, totalRevenue, totalSales,
    };
  }, [modeloAtual, o2tax, expansao, oxyHacker, metaCampaigns.data, googleCampaigns.data, startDate, endDate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-foreground">Growth</h2>
        <DateRangePickerGA
          startDate={dateRange.from}
          endDate={dateRange.to}
          onDateChange={(start, end) => setDateRange({ from: start, to: end })}
        />
      </div>

      {/* ── KPIs de destaque ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="ARR"
          value={fmt(metrics.arr)}
          sublabel="MRR × 12"
          icon={<DollarSign className="h-5 w-5" />}
          large
        />
        <MetricCard
          label="Valuation"
          value={fmt(metrics.valuation)}
          sublabel="10 × ARR"
          icon={<TrendingUp className="h-5 w-5" />}
          large
        />
        <MetricCard
          label="LTV / CAC"
          value={metrics.ltvCacRatio ? fmtX(metrics.ltvCacRatio) : "—"}
          sublabel={metrics.ltv && metrics.cac ? `${fmt(metrics.ltv)} / ${fmt(metrics.cac)}` : undefined}
          icon={<Target className="h-5 w-5" />}
          large
        />
        <MetricCard
          label="NPS"
          value={String(metrics.nps)}
          sublabel="Q4 2025"
          icon={<HeartHandshake className="h-5 w-5" />}
          large
        />
      </div>

      {/* ── Seção Investimento ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            Investimento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            <MetricCard label="Mídia" value={fmt(metrics.mediaInvestment)} />
            <MetricCard label="Evento" value={fmt(metrics.eventInvestment)} placeholder sublabel="em breve" />
            <MetricCard label="Time" value={fmt(metrics.teamInvestment)} placeholder sublabel="em breve" />
            <MetricCard label="Tools" value={fmt(metrics.toolsInvestment)} placeholder sublabel="em breve" />
            <MetricCard label="Total" value={fmt(metrics.totalInvestment)} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            <MetricCard label="MRR (vendas)" value={fmt(metrics.totalMRR)} />
            <MetricCard label="Setup" value={fmt(metrics.totalSetup)} />
            <MetricCard label="Pontual" value={fmt(metrics.totalPontual)} />
            <MetricCard label="Educação" value="—" placeholder sublabel="em breve" />
            <MetricCard label="Expansão" value={fmt(metrics.totalRevenue > 0 ? metrics.totalRevenue - metrics.totalMRR - metrics.totalSetup - metrics.totalPontual : 0)} sublabel="Franquia + Oxy" />
          </div>
        </CardContent>
      </Card>

      {/* ── Seção ROAS & ROI ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            ROAS & ROI
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            <MetricCard label="ROAS Direto" value={metrics.roasDirect !== null ? fmtX(metrics.roasDirect) : "—"} sublabel="GMV / Invest." />
            <MetricCard label="ROAS LTV" value={metrics.roasLtv !== null ? fmtX(metrics.roasLtv) : "—"} sublabel="LTV×Vendas / Invest." />
            <MetricCard label="REV / People" value="—" placeholder sublabel="em breve" />
            <MetricCard label="ROI Direto" value={metrics.roiDirect !== null ? fmtPct(metrics.roiDirect * 100) : "—"} sublabel="(GMV − Invest.) / Invest." />
            <MetricCard label="ROI LTV" value={metrics.roiLtv !== null ? fmtPct(metrics.roiLtv * 100) : "—"} sublabel="(LTV×Vendas − Invest.) / Invest." />
          </div>
        </CardContent>
      </Card>

      {/* ── Seção Venda & Resultado ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            Venda & Resultado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            <MetricCard label="CPV" value={metrics.cpv !== null ? fmt(metrics.cpv) : "—"} sublabel="Invest. / Vendas" />
            <MetricCard label="CAC" value={metrics.cac !== null ? fmt(metrics.cac) : "—"} sublabel="Invest. / Vendas" />
            <MetricCard label="LTV" value={metrics.ltv !== null ? fmt(metrics.ltv) : "—"} sublabel="MRR médio × 12" />
            <MetricCard label="TCV" value={metrics.tcv !== null ? fmt(metrics.tcv) : "—"} sublabel="Receita / Vendas" />
            <MetricCard label="Faturamento" value={fmt(metrics.totalRevenue)} sublabel={`${metrics.totalSales} vendas`} />
          </div>
        </CardContent>
      </Card>

      {/* ── Seção CS (Customer Success) ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            CS (Customer Success)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            <MetricCard label="LT(3) Mediana" value="—" placeholder sublabel="em breve" />
            <MetricCard label="Rev Churn" value="—" placeholder sublabel="em breve" />
            <MetricCard label="Logo Churn" value="—" placeholder sublabel="em breve" />
            <MetricCard label="Churn" value="—" placeholder sublabel="em breve" />
            <MetricCard label="NPS" value={String(metrics.nps)} sublabel="Q4 2025" />
            <MetricCard label="MHS" value="—" placeholder sublabel="em breve" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
