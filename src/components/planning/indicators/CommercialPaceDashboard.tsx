import { useMemo, useState } from "react";
import { format, eachDayOfInterval, differenceInCalendarDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, Flag } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { DetailItem } from "./DetailSheet";
import { firstNameKey, useCloserAbsoluteMetas } from "@/hooks/useCloserAbsoluteMetas";
import { BU_CLOSERS, BuType } from "@/hooks/useCloserMetas";
import { getMonthFactors, prorateMonthlyMeta } from "@/lib/businessDayProrate";
import { DateRangePickerGA } from "@/components/planning/DateRangePickerGA";
import { MultiSelect, MultiSelectOption } from "@/components/ui/multi-select";
import { useBUIndicatorsConfig } from "@/hooks/useBUIndicatorsConfig";

const MONTH_LABELS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'] as const;
const ALL_BUS = ['modelo_atual','o2_tax','oxy_hacker','franquia'] as const;

const BU_OPTIONS: MultiSelectOption[] = [
  { value: 'modelo_atual', label: 'Modelo Atual' },
  { value: 'o2_tax', label: 'O2 TAX' },
  { value: 'oxy_hacker', label: 'Oxy Hacker' },
  { value: 'franquia', label: 'Franquia' },
];

type MetricKey = "mql" | "rm" | "rr" | "prop" | "venda";
type ChartKey = MetricKey | "fat";

interface CommercialPaceDashboardProps {
  startDate: Date;
  endDate: Date;
  selectedBUs: string[];
  selectedClosers: string[];
  selectedSDRs: string[];
  selectedOrigens: string[];
  itemsByIndicator: Record<string, DetailItem[]>;
  hotOpportunityItems: DetailItem[];
  revenueMeta: number;
  funnelMetas: { mql: number; rm: number; rr: number; proposta: number; venda: number };
  isLoading: boolean;
  onBack: () => void;
  onDateChange?: (start: Date, end: Date) => void;
  onBUsChange?: (bus: string[]) => void;
}

const METRIC_DEFS: { key: MetricKey; label: string; varName: string; indicator: string }[] = [
  { key: "mql", label: "MQL", varName: "--m-mql", indicator: "mql" },
  { key: "rm", label: "RM", varName: "--m-rm", indicator: "rm" },
  { key: "rr", label: "RR", varName: "--m-rr", indicator: "rr" },
  { key: "prop", label: "Prop", varName: "--m-prop", indicator: "proposta" },
  { key: "venda", label: "Venda", varName: "--m-venda", indicator: "venda" },
];

const brl = (v: number) => "R$ " + Math.round(v).toLocaleString("pt-BR");
const pct = (v: number, d = 1) =>
  (v * 100).toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d }) + "%";
const initials = (n: string) =>
  n.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const cum = (a: number[]) => a.reduce<number[]>((acc, v, i) => (acc.push((acc[i - 1] || 0) + v), acc), []);

const EXCLUDED_CLOSERS = new Set(["matheus staruck dos reis"]);
function personName(item: DetailItem): string {
  const name = ((item.closer || "") as string).trim();
  if (!name) return "";
  if (EXCLUDED_CLOSERS.has(name.toLowerCase())) return "";
  return name;
}
function itemRevenue(item: DetailItem) {
  const s = (item.mrr || 0) + (item.setup || 0) + (item.pontual || 0);
  return s > 0 ? s : item.value || 0;
}

export function CommercialPaceDashboard({
  startDate,
  endDate,
  selectedBUs,
  selectedClosers,
  selectedSDRs,
  selectedOrigens,
  itemsByIndicator,
  hotOpportunityItems,
  revenueMeta,
  funnelMetas,
  isLoading,
  onBack,
  onDateChange,
  onBUsChange,
}: CommercialPaceDashboardProps) {
  const [mode, setMode] = useState<"cum" | "daily">("cum");
  const [paceOn, setPaceOn] = useState(true);
  const [metricOn, setMetricOn] = useState<Record<ChartKey, boolean>>({
    mql: true, rm: true, rr: true, prop: true, venda: true, fat: true,
  });
  const [selectedCloserLocal, setSelectedCloserLocal] = useState<string>("all");
  const { getMonthlyMap } = useCloserAbsoluteMetas(startDate.getFullYear());

  // Period helpers
  const totalDays = Math.max(1, differenceInCalendarDays(endDate, startDate) + 1);
  const today = new Date();
  const elapsed = today < startDate ? 0 : today > endDate ? totalDays : differenceInCalendarDays(today, startDate) + 1;
  const monthPct = totalDays > 0 ? elapsed / totalDays : 0;
  const days = useMemo(() => eachDayOfInterval({ start: startDate, end: endDate }), [startDate, endDate]);

  // Aggregate per closer
  type CloserAgg = {
    id: string; name: string; mql: number[]; rm: number[]; rr: number[]; prop: number[]; venda: number[];
    propPipe: number; propHot: number; hotCount: number; meta: number;
  };
  const closers = useMemo<CloserAgg[]>(() => {
    const map = new Map<string, CloserAgg>();
    const ensure = (name: string) => {
      const key = firstNameKey(name) || name.toLowerCase();
      let agg = map.get(key);
      if (!agg) {
        agg = {
          id: key, name,
          mql: Array(days.length).fill(0),
          rm: Array(days.length).fill(0),
          rr: Array(days.length).fill(0),
          prop: Array(days.length).fill(0),
          venda: Array(days.length).fill(0),
          propPipe: 0, propHot: 0, hotCount: 0, meta: 0,
        };
        map.set(key, agg);
      } else if (name.length > agg.name.length) {
        agg.name = name;
      }
      return agg;
    };
    const indexOfDay = (iso?: string) => {
      if (!iso) return -1;
      const d = iso.slice(0, 10);
      return days.findIndex(day => format(day, "yyyy-MM-dd") === d);
    };
    // Bucket sintético para itens sem closer (ou closer excluído) — garante que
    // os totais do funil/curva batam com os acelerômetros, que não filtram por dono.
    const ensureNone = () => {
      let agg = map.get("__none__");
      if (!agg) {
        agg = {
          id: "__none__", name: "Sem responsável",
          mql: Array(days.length).fill(0),
          rm: Array(days.length).fill(0),
          rr: Array(days.length).fill(0),
          prop: Array(days.length).fill(0),
          venda: Array(days.length).fill(0),
          propPipe: 0, propHot: 0, hotCount: 0, meta: 0,
        };
        map.set("__none__", agg);
      }
      return agg;
    };
    // Seed: garante que todos os closers atribuídos às BUs selecionadas
    // apareçam como chip mesmo sem itens no período.
    for (const bu of selectedBUs) {
      for (const closer of (BU_CLOSERS[bu as BuType] || [])) {
        ensure(closer);
      }
    }
    for (const def of METRIC_DEFS) {
      for (const item of itemsByIndicator[def.indicator] || []) {
        const name = personName(item);
        const agg = name ? ensure(name) : ensureNone();
        // MQL é qualificado pela data de criação (alinha com o acelerômetro),
        // não pela data de entrada na fase MQL.
        const effectiveDate = def.key === "mql"
          ? ((item as any).dataCriacao || item.date)
          : item.date;
        let idx = indexOfDay(effectiveDate);
        // Fallback: se a data cair fora do intervalo (timezone/edge),
        // atribui ao primeiro dia do período para não sumir do total.
        if (idx < 0) idx = 0;
        (agg as any)[def.key][idx] += 1;
      }
    }
    for (const item of hotOpportunityItems) {
      const name = personName(item);
      if (!name) continue;
      const agg = ensure(name);
      agg.propHot += itemRevenue(item);
      agg.propPipe += itemRevenue(item);
      agg.hotCount += 1;
    }
    // Metas via closer_absolute_metas (faturamento prorrateado)
    const factors = getMonthFactors(startDate, endDate);
    for (const agg of map.values()) {
      const monthly = getMonthlyMap(agg.name);
      agg.meta = prorateMonthlyMeta(monthly.faturamento, factors);
    }
    return Array.from(map.values());
  }, [days, itemsByIndicator, hotOpportunityItems, startDate, endDate, getMonthlyMap, selectedBUs]);

  const seriesFor = (closerId: string, metric: MetricKey): number[] => {
    if (closerId === "all") {
      return days.map((_, i) => sum(closers.map(c => c[metric][i])));
    }
    const c = closers.find(x => x.id === closerId);
    return c ? c[metric].slice() : days.map(() => 0);
  };
  const totalsFor = (closerId: string) => {
    const t: Record<MetricKey, number> = { mql: 0, rm: 0, rr: 0, prop: 0, venda: 0 };
    METRIC_DEFS.forEach(m => (t[m.key] = sum(seriesFor(closerId, m.key))));
    return t;
  };

  // Goals: prefer % from bu_indicators_config (Admin → Indicadores por BU) for the period's month.
  // Fallback: derive from absolute funnel metas.
  const { getIndicators } = useBUIndicatorsConfig();
  const funnelMetaConv = useMemo(() => {
    const mesRef = MONTH_LABELS[startDate.getMonth()];
    const busToUse = (selectedBUs.length > 0 ? selectedBUs : ALL_BUS) as readonly string[];
    const accum = { mqlrm: 0, rmrr: 0, rrprop: 0, propvenda: 0 };
    let n = 0;
    for (const bu of busToUse) {
      const cfg = getIndicators(bu, mesRef);
      if (!cfg) continue;
      const toFrac = (v: number) => (v > 1 ? v / 100 : v);
      accum.mqlrm += toFrac(cfg.mqlToRm);
      accum.rmrr += toFrac(cfg.rmToRr);
      accum.rrprop += toFrac(cfg.rrToProp);
      accum.propvenda += toFrac(cfg.propToVenda);
      n++;
    }
    if (n > 0) {
      return {
        mqlrm: accum.mqlrm / n,
        rmrr: accum.rmrr / n,
        rrprop: accum.rrprop / n,
        propvenda: accum.propvenda / n,
      };
    }
    return {
      mqlrm: funnelMetas.mql > 0 ? funnelMetas.rm / funnelMetas.mql : 0,
      rmrr: funnelMetas.rm > 0 ? funnelMetas.rr / funnelMetas.rm : 0,
      rrprop: funnelMetas.rr > 0 ? funnelMetas.proposta / funnelMetas.rr : 0,
      propvenda: funnelMetas.proposta > 0 ? funnelMetas.venda / funnelMetas.proposta : 0,
    };
  }, [getIndicators, startDate, selectedBUs, funnelMetas]);

  const countGoalsFor = (closerId: string): Record<MetricKey, number> | null => {
    if (closerId === "all") {
      return { mql: funnelMetas.mql, rm: funnelMetas.rm, rr: funnelMetas.rr, prop: funnelMetas.proposta, venda: funnelMetas.venda };
    }
    const c = closers.find(x => x.id === closerId);
    if (!c || !c.meta) return null;
    const share = revenueMeta > 0 ? c.meta / revenueMeta : 0;
    return {
      mql: funnelMetas.mql * share,
      rm: funnelMetas.rm * share,
      rr: funnelMetas.rr * share,
      prop: funnelMetas.proposta * share,
      venda: funnelMetas.venda * share,
    };
  };

  // Team totals
  const teamRevenue = sum((itemsByIndicator.venda || []).map(itemRevenue));
  const totals = totalsFor(selectedCloserLocal);

  // Revenue card data
  const selected = selectedCloserLocal === "all" ? null : closers.find(c => c.id === selectedCloserLocal);
  const rev = selected
    ? sum((itemsByIndicator.venda || []).filter(i => firstNameKey(personName(i)) === selected.id).map(itemRevenue))
    : teamRevenue;
  const metaRef = selected ? selected.meta : revenueMeta;
  const expected = metaRef * monthPct;
  const projection = elapsed > 0 ? (rev / elapsed) * totalDays : 0;
  const delta = expected > 0 ? (rev - expected) / expected : 0;

  // Hot card
  const hotActive = selected
    ? hotOpportunityItems.filter(i => firstNameKey(personName(i)) === selected.id)
    : hotOpportunityItems;
  const hotTotal = sum(hotActive.map(itemRevenue));
  const pipeTotal = hotTotal; // sem dado adicional além de hotOpportunityItems
  const hotPctVal = pipeTotal ? hotTotal / pipeTotal : 0;

  // Funnel
  const maxStage = Math.max(totals.mql, totals.rm, totals.rr, totals.prop, totals.venda, 1);
  const widths: Record<MetricKey, number> = {
    mql: Math.min(Math.max(totals.mql / maxStage * 100, 16), 100),
    rm: Math.min(Math.max(totals.rm / maxStage * 100, 16), 100),
    rr: Math.min(Math.max(totals.rr / maxStage * 100, 16), 100),
    prop: Math.min(Math.max(totals.prop / maxStage * 100, 16), 100),
    venda: Math.min(Math.max(totals.venda / maxStage * 100, 16), 100),
  };
  const steps = [
    { from: "mql" as MetricKey, to: "rm" as MetricKey, meta: funnelMetaConv.mqlrm },
    { from: "rm" as MetricKey, to: "rr" as MetricKey, meta: funnelMetaConv.rmrr },
    { from: "rr" as MetricKey, to: "prop" as MetricKey, meta: funnelMetaConv.rrprop },
    { from: "prop" as MetricKey, to: "venda" as MetricKey, meta: funnelMetaConv.propvenda },
  ];

  // Ranking
  const ranking = closers
    .filter(c => c.id !== "__none__")
    .map(c => {
      const closerRev = sum((itemsByIndicator.venda || [])
        .filter(i => firstNameKey(personName(i)) === c.id)
        .map(itemRevenue));
      const vendas = sum(c.venda);
      const rm = sum(c.rm);
      const expectedRow = c.meta * monthPct;
      const paceDelta = expectedRow > 0 ? (closerRev - expectedRow) / expectedRow : null;
      return { ...c, rev: closerRev, vendas, conv: rm ? vendas / rm : 0, paceDelta };
    })
    .sort((a, b) => b.rev - a.rev || b.vendas - a.vendas);
  const maxRev = Math.max(...ranking.map(r => r.rev), 1);

  // Chart data
  const goals = countGoalsFor(selectedCloserLocal);

  // Daily faturamento series (from venda items, by signature date) for the active selection
  const fatSeries = useMemo(() => {
    const arr = Array(days.length).fill(0) as number[];
    const indexOfDay = (iso?: string) => {
      if (!iso) return -1;
      const d = iso.slice(0, 10);
      return days.findIndex(day => format(day, "yyyy-MM-dd") === d);
    };
    const vendas = (itemsByIndicator.venda || []).filter(i => {
      if (selectedCloserLocal === "all") return true;
      return firstNameKey(personName(i)) === selectedCloserLocal;
    });
    for (const it of vendas) {
      const idx = indexOfDay(it.date);
      if (idx >= 0) arr[idx] += itemRevenue(it);
    }
    return arr;
  }, [days, itemsByIndicator, selectedCloserLocal]);

  const fatMetaRef = selectedCloserLocal === "all"
    ? revenueMeta
    : (closers.find(c => c.id === selectedCloserLocal)?.meta || 0);

  const chartData = days.map((d, i) => {
    const row: any = { label: format(d, "dd/MM") };
    for (const m of METRIC_DEFS) {
      const raw = seriesFor(selectedCloserLocal, m.key);
      row[m.key] = mode === "cum" ? cum(raw)[i] : raw[i];
      if (paceOn && goals) {
        const daily = goals[m.key] / totalDays;
        row[m.key + "_meta"] = mode === "cum" ? Math.round(daily * (i + 1) * 10) / 10 : Math.round(daily * 10) / 10;
      }
    }
    // Faturamento (R$) — eixo Y secundário
    row.fat = mode === "cum" ? cum(fatSeries)[i] : fatSeries[i];
    if (paceOn && fatMetaRef > 0) {
      const dailyFat = fatMetaRef / totalDays;
      row.fat_meta = mode === "cum" ? dailyFat * (i + 1) : dailyFat;
    }
    return row;
  });

  const filterItems = [
    { id: "all", name: "Todos os closers" },
    ...closers.filter(c => c.id !== "__none__" && c.id !== "sem closer" && c.name.toLowerCase() !== "sem closer"),
  ];

  const overallConv = totals.rm ? totals.venda / totals.rm : 0;
  const overallMeta = funnelMetaConv.rmrr * funnelMetaConv.rrprop * funnelMetaConv.propvenda;

  const attColor = (att: number) =>
    att >= 1 ? "var(--cp-ok)" : att >= 0.7 ? "var(--cp-warn)" : "var(--cp-behind)";

  return (
    <div className="cp-root" aria-busy={isLoading}>
      <style>{`
        .cp-root {
          --cp-bg: hsl(var(--background));
          --cp-card: hsl(var(--card));
          --cp-lane-2: hsl(var(--muted));
          --cp-lane-3: hsl(var(--muted) / 0.65);
          --cp-line: hsl(var(--border));
          --cp-line-soft: hsl(var(--border) / 0.5);
          --cp-line-strong: hsl(var(--border));
          --cp-chalk-1: hsl(var(--foreground));
          --cp-chalk-2: hsl(var(--foreground) / 0.85);
          --cp-chalk-3: hsl(var(--muted-foreground));
          --cp-chalk-4: hsl(var(--muted-foreground) / 0.7);
          --cp-pace: hsl(var(--primary));
          --cp-ok: hsl(var(--success));
          --cp-behind: hsl(var(--destructive));
          --cp-warn: hsl(var(--warning));
          --cp-hot: hsl(var(--warning));
          --m-mql: hsl(var(--chart-2));
          --m-rm: hsl(var(--chart-1));
          --m-rr: hsl(var(--warning));
          --m-prop: hsl(var(--primary));
          --m-venda: hsl(var(--destructive));
          --m-fat: hsl(var(--chart-3));
          color: var(--cp-chalk-1);
          font-family: 'Inter', system-ui, sans-serif;
        }
        .cp-root .num { font-family: 'Space Grotesk', 'Inter', sans-serif; font-variant-numeric: tabular-nums; }
        .cp-head {
          display:flex; align-items:flex-end; justify-content:space-between;
          margin-bottom:24px; gap:24px; flex-wrap:wrap;
        }
        .cp-title h1 { font-family:'Space Grotesk',sans-serif; font-size:22px; font-weight:700; letter-spacing:-0.02em; }
        .cp-title .sub { color:var(--cp-chalk-3); font-size:13px; margin-top:2px; }
        .cp-month {
          display:flex; align-items:center; gap:14px;
          background:var(--cp-card); border:1px solid var(--cp-line);
          border-radius:10px; padding:10px 16px;
        }
        .cp-month .day { font-family:'Space Grotesk',sans-serif; font-size:20px; font-weight:600; }
        .cp-month .day small { color:var(--cp-chalk-3); font-size:12px; font-weight:400; }
        .cp-month-bar { width:140px; height:5px; background:var(--cp-lane-3); border-radius:99px; overflow:hidden; }
        .cp-month-bar i { display:block; height:100%; background:var(--cp-pace); border-radius:99px; }
        .cp-month .pct { color:var(--cp-chalk-2); font-size:12px; }

        .cp-filter { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:20px; }
        .cp-chip {
          display:flex; align-items:center; gap:8px;
          background:var(--cp-card); border:1px solid var(--cp-line);
          color:var(--cp-chalk-2); border-radius:99px; padding:7px 14px;
          font-size:13px; font-weight:500; cursor:pointer; transition:all .15s;
        }
        .cp-chip:hover { background:var(--cp-lane-2); color:var(--cp-chalk-1); }
        .cp-chip.active { background:var(--cp-lane-3); color:var(--cp-chalk-1); border-color:var(--cp-line-strong); }
        .cp-chip .avatar {
          width:20px; height:20px; border-radius:50%;
          display:flex; align-items:center; justify-content:center;
          font-size:9px; font-weight:600; color:hsl(var(--background));
          background:var(--cp-pace);
        }

        .cp-grid { display:grid; grid-template-columns:repeat(12,1fr); gap:16px; }
        .cp-card { background:var(--cp-card); border:1px solid var(--cp-line); border-radius:10px; padding:22px; }
        .cp-card-label { font-size:11px; font-weight:600; letter-spacing:0.08em; text-transform:uppercase; color:var(--cp-chalk-3); margin-bottom:4px; }
        .cp-card-sub { font-size:12px; color:var(--cp-chalk-3); }
        .span-7 { grid-column:span 7; }
        .span-5 { grid-column:span 5; }
        .span-12 { grid-column:span 12; }
        @media (max-width:1100px) { .span-7,.span-5 { grid-column:span 12; } }

        .rev-head { display:flex; justify-content:space-between; align-items:flex-start; }
        .rev-value { font-family:'Space Grotesk',sans-serif; font-size:40px; font-weight:700; letter-spacing:-0.02em; margin:6px 0 2px; }
        .rev-meta { color:var(--cp-chalk-3); font-size:13px; }
        .rev-meta b { color:var(--cp-chalk-2); font-weight:600; }
        .pace-badge { display:inline-flex; align-items:center; gap:6px; border-radius:99px; padding:5px 12px; font-size:12px; font-weight:600; }
        .pace-badge.ahead { background:hsl(var(--success) / 0.12); color:var(--cp-ok); }
        .pace-badge.behind { background:hsl(var(--destructive) / 0.12); color:var(--cp-behind); }
        .goal-flag { display:inline-flex; align-items:center; gap:6px; border-radius:99px; padding:4px 10px; font-size:11px; font-weight:600; margin-bottom:6px; letter-spacing:.02em; }
        .goal-flag .dot { width:8px; height:8px; border-radius:99px; display:inline-block; }
        .goal-flag.flag-ok { background:hsl(var(--success) / 0.12); color:var(--cp-ok); }
        .goal-flag.flag-ok .dot { background:var(--cp-ok); }
        .goal-flag.flag-warn { background:hsl(var(--warning) / 0.14); color:var(--cp-warn); }
        .goal-flag.flag-warn .dot { background:var(--cp-warn); }
        .goal-flag.flag-bad { background:hsl(var(--destructive) / 0.12); color:var(--cp-behind); }
        .goal-flag.flag-bad .dot { background:var(--cp-behind); }
        .rev-track { position:relative; margin:26px 0 8px; }
        .rev-bar { height:10px; background:var(--cp-lane-3); border-radius:99px; position:relative; }
        .rev-fill { height:100%; border-radius:99px; background:linear-gradient(90deg, hsl(var(--primary) / 0.55), var(--cp-pace)); transition:width .5s ease-out; }
        .pace-marker { position:absolute; top:-7px; bottom:-7px; width:2px; background:var(--cp-chalk-2); }
        .pace-marker::after { content:'pace hoje'; position:absolute; top:-20px; left:50%; transform:translateX(-50%); font-size:10px; color:var(--cp-chalk-3); white-space:nowrap; letter-spacing:.04em; }
        .rev-scale { display:flex; justify-content:space-between; font-size:11px; color:var(--cp-chalk-4); margin-top:10px; }
        .rev-foot { display:flex; gap:28px; flex-wrap:wrap; margin-top:20px; padding-top:18px; border-top:1px solid var(--cp-line-soft); }
        .rev-foot .item .k { font-size:11px; color:var(--cp-chalk-3); margin-bottom:2px; }
        .rev-foot .item .v { font-family:'Space Grotesk',sans-serif; font-size:17px; font-weight:600; }

        .hot-head { display:flex; justify-content:space-between; align-items:flex-start; }
        .hot-value { font-family:'Space Grotesk',sans-serif; font-size:32px; font-weight:700; letter-spacing:-0.02em; margin:6px 0 2px; }
        .hot-badge { display:inline-flex; align-items:center; gap:6px; background:hsl(var(--warning) / 0.12); color:var(--cp-hot); border-radius:99px; padding:5px 12px; font-size:12px; font-weight:600; }
        .hot-bar { height:8px; background:var(--cp-lane-3); border-radius:99px; overflow:hidden; margin:18px 0 8px; }
        .hot-bar i { display:block; height:100%; border-radius:99px; background:linear-gradient(90deg, var(--cp-warn), var(--cp-hot)); transition:width .5s ease-out; }
        .hot-scale { font-size:11px; color:var(--cp-chalk-4); }
        .hot-rows { margin-top:16px; padding-top:6px; border-top:1px solid var(--cp-line-soft); }
        .hot-row { display:flex; align-items:center; gap:10px; padding:9px 0; border-bottom:1px solid var(--cp-line-soft); }
        .hot-row:last-child { border-bottom:none; }
        .hot-row .h-name { flex:1; font-size:12px; color:var(--cp-chalk-2); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .hot-row .h-bar { width:70px; height:4px; background:var(--cp-lane-3); border-radius:99px; overflow:hidden; flex-shrink:0; }
        .hot-row .h-bar i { display:block; height:100%; background:linear-gradient(90deg, var(--cp-warn), var(--cp-hot)); border-radius:99px; }
        .hot-row .h-val { font-family:'Space Grotesk',sans-serif; font-size:12px; font-weight:600; width:78px; text-align:right; }
        .hot-row .h-pct { font-family:'Space Grotesk',sans-serif; font-size:11px; color:var(--cp-chalk-3); width:38px; text-align:right; }
        .hot-foot { margin-top:14px; padding-top:14px; border-top:1px solid var(--cp-line-soft); font-size:12px; color:var(--cp-chalk-3); }
        .hot-foot b { color:var(--cp-chalk-1); font-family:'Space Grotesk',sans-serif; font-weight:600; }

        .funnel-v { margin-top:18px; }
        .f-stage { position:relative; margin:0 auto; height:40px; border-radius:7px; display:flex; align-items:center; justify-content:center; gap:10px; color:hsl(var(--background)); min-width:16%; transition:width .5s ease-out; }
        .f-stage .count { font-family:'Space Grotesk',sans-serif; font-size:17px; font-weight:700; }
        .f-stage .name { font-size:10px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; opacity:.75; }
        .f-conn { position:relative; height:58px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; }
        .f-shape { position:absolute; inset:0; background:hsl(var(--foreground) / 0.05); transition:clip-path .5s ease-out; }
        .f-conn .rate { font-family:'Space Grotesk',sans-serif; font-size:13px; font-weight:600; z-index:1; }
        .f-conn .rate small { color:var(--cp-chalk-3); font-weight:400; font-size:10px; font-family:'Inter',sans-serif; }
        .f-conn .att-bar { width:90px; height:4px; background:var(--cp-lane-3); border-radius:99px; overflow:hidden; z-index:1; }
        .f-conn .att-bar i { display:block; height:100%; border-radius:99px; transition:width .5s ease-out; }
        .f-conn .att-label { font-size:10px; color:var(--cp-chalk-4); z-index:1; }
        .funnel-overall { margin-top:20px; padding-top:16px; border-top:1px solid var(--cp-line-soft); display:flex; justify-content:space-between; align-items:center; }
        .funnel-overall .k { font-size:12px; color:var(--cp-chalk-3); }
        .funnel-overall .v { font-family:'Space Grotesk',sans-serif; font-size:16px; font-weight:600; }

        .rank-list { margin-top:16px; display:flex; flex-direction:column; }
        .rank-row { display:flex; align-items:center; gap:12px; padding:13px 10px; border-radius:8px; border-bottom:1px solid var(--cp-line-soft); transition:background .15s; }
        .rank-row:last-child { border-bottom:none; }
        .rank-row.highlight { background:var(--cp-lane-2); }
        .rank-pos { font-family:'Space Grotesk',sans-serif; font-size:13px; font-weight:600; color:var(--cp-chalk-4); width:18px; text-align:center; flex-shrink:0; }
        .rank-row:nth-child(1) .rank-pos { color:var(--cp-warn); }
        .rank-avatar { width:30px; height:30px; border-radius:50%; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:600; color:hsl(var(--background)); background:var(--cp-pace); }
        .rank-info { flex:1; min-width:0; }
        .rank-name { font-size:13px; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .rank-bar { height:4px; background:var(--cp-lane-3); border-radius:99px; margin-top:6px; overflow:hidden; }
        .rank-bar i { display:block; height:100%; border-radius:99px; background:var(--cp-pace); transition:width .5s ease-out; }
        .rank-nums { text-align:right; flex-shrink:0; }
        .rank-rev { font-family:'Space Grotesk',sans-serif; font-size:14px; font-weight:600; }
        .rank-detail { font-size:11px; color:var(--cp-chalk-3); margin-top:1px; }
        .rank-pace { font-family:'Space Grotesk',sans-serif; font-size:11px; font-weight:600; border-radius:99px; padding:3px 9px; flex-shrink:0; margin-left:4px; }
        .rank-pace.ahead { background:hsl(var(--success) / 0.12); color:var(--cp-ok); }
        .rank-pace.behind { background:hsl(var(--destructive) / 0.12); color:var(--cp-behind); }

        .chart-head { display:flex; justify-content:space-between; align-items:flex-start; gap:16px; flex-wrap:wrap; margin-bottom:14px; }
        .metric-toggles { display:flex; gap:6px; flex-wrap:wrap; }
        .metric-chip { display:flex; align-items:center; gap:6px; background:transparent; border:1px solid var(--cp-line); color:var(--cp-chalk-2); border-radius:99px; padding:5px 12px; font-size:12px; font-weight:500; cursor:pointer; transition:all .15s; }
        .metric-chip .swatch { width:8px; height:8px; border-radius:50%; }
        .metric-chip.off { opacity:0.4; }
        .metric-chip:hover { border-color:var(--cp-line-strong); }
        .pace-toggle { display:flex; align-items:center; gap:6px; background:hsl(var(--primary) / 0.1); border:1px solid hsl(var(--primary) / 0.3); color:var(--cp-pace); border-radius:99px; padding:5px 12px; font-size:12px; font-weight:600; cursor:pointer; transition:all .15s; }
        .pace-toggle.off { background:transparent; border-color:var(--cp-line); color:var(--cp-chalk-3); }
        .pace-toggle .dash { width:14px; height:0; border-top:2px dashed currentColor; display:inline-block; }
        .mode-toggle { display:flex; background:var(--cp-lane-2); border:1px solid var(--cp-line); border-radius:99px; padding:2px; }
        .mode-toggle button { background:transparent; border:none; color:var(--cp-chalk-3); font-size:12px; font-weight:500; padding:4px 12px; border-radius:99px; cursor:pointer; transition:all .15s; }
        .mode-toggle button.active { background:var(--cp-lane-3); color:var(--cp-chalk-1); }
        .chart-wrap { position:relative; height:320px; }

        .footnote { margin-top:20px; font-size:11px; color:var(--cp-chalk-4); }
      `}</style>

      <div className="mb-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="-ml-3 gap-2">
          <ArrowLeft className="h-4 w-4" /> Voltar aos indicadores
        </Button>
      </div>

      <header className="cp-head">
        <div className="cp-title">
          <h1>Pace Comercial</h1>
          <div className="sub">
            Funil por closer · {format(startDate, "dd 'de' MMM", { locale: ptBR })} — {format(endDate, "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          {onBUsChange && (
            <div style={{ minWidth: 200 }}>
              <MultiSelect
                options={BU_OPTIONS}
                selected={selectedBUs}
                onSelectionChange={onBUsChange}
                placeholder="Selecionar BUs"
                allLabel="Consolidado"
              />
            </div>
          )}
          {onDateChange && (
            <DateRangePickerGA startDate={startDate} endDate={endDate} onDateChange={onDateChange} />
          )}
          <div className="cp-month">
            <div className="day num">Dia {elapsed} <small>/ {totalDays}</small></div>
            <div className="cp-month-bar"><i style={{ width: `${monthPct * 100}%` }} /></div>
            <div className="pct num">{Math.round(monthPct * 100)}% do período</div>
          </div>
        </div>
      </header>

      <div className="cp-filter">
        {filterItems.map(c => (
          <button
            key={c.id}
            className={"cp-chip" + (selectedCloserLocal === c.id ? " active" : "")}
            onClick={() => setSelectedCloserLocal(c.id)}
          >
            {c.id !== "all" && <span className="avatar">{initials(c.name)}</span>}
            {c.name}
          </button>
        ))}
      </div>

      <div className="cp-grid">
        {/* FATURAMENTO */}
        <section className="cp-card span-7">
          <div className="rev-head">
            <div>
              <div className="cp-card-label">Faturamento — período</div>
              {(() => {
                // Fallback: se closer não tem meta individual, usa rateio igualitário da meta do time
                const activeClosers = closers.filter(c => c.id !== "__none__" && (c.name || "").toLowerCase() !== "sem closer");
                const fallbackMeta = selected && activeClosers.length > 0 ? revenueMeta / activeClosers.length : revenueMeta;
                const flagMeta = metaRef > 0 ? metaRef : fallbackMeta;
                if (flagMeta <= 0) return null;
                const ratio = rev / flagMeta;
                let cls = "flag-bad";
                let label = "Sem vendas no período";
                if (rev >= flagMeta) { cls = "flag-ok"; label = "Meta batida"; }
                else if (rev > 0) { cls = "flag-warn"; label = "Parcial"; }
                const metaLabel = metaRef > 0 ? "" : " (rateio)";
                const title = `Realizado ${brl(rev)} de ${brl(flagMeta)}${metaLabel} (${pct(ratio)}) no período selecionado`;
                return (
                  <div className={`goal-flag ${cls}`} title={title}>
                    <span className="dot" />
                    {label} · {pct(ratio, 0)}
                  </div>
                );
              })()}

              <div className="rev-value num">{brl(rev)}</div>
              <div className="rev-meta">
                {selected
                  ? selected.meta
                    ? <>meta individual <b>{brl(selected.meta)}</b> · {pct(metaRef ? rev / metaRef : 0)} atingido</>
                    : <><b>{pct(teamRevenue ? rev / teamRevenue : 0, 0)}</b> do faturamento do time · sem meta individual</>
                  : <>meta <b>{brl(revenueMeta)}</b> · {pct(metaRef ? rev / metaRef : 0)} atingido</>}
              </div>
            </div>
            {metaRef > 0 && (
              <div className={"pace-badge num " + (delta >= 0 ? "ahead" : "behind")}>
                {delta >= 0 ? "+" : ""}{pct(delta)} vs pace
              </div>
            )}
          </div>
          {metaRef > 0 && (
            <div className="rev-track">
              <div className="rev-bar">
                <div className="rev-fill" style={{ width: `${Math.min(rev / metaRef * 100, 100)}%` }} />
                <div className="pace-marker" style={{ left: `${monthPct * 100}%` }} />
              </div>
              <div className="rev-scale num"><span>R$ 0</span><span>{brl(metaRef)}</span></div>
            </div>
          )}
          <div className="rev-foot">
            {metaRef > 0 ? (
              <>
                <div className="item"><div className="k">Pace esperado hoje</div><div className="v num">{brl(expected)}</div></div>
                <div className="item"><div className="k">Projeção fim do período</div><div className="v num">{brl(projection)} <small style={{ color: "var(--cp-chalk-3)", fontSize: 12 }}>({pct(metaRef ? projection / metaRef : 0, 0)} da meta)</small></div></div>
                <div className="item"><div className="k">Falta para a meta</div><div className="v num">{brl(Math.max(metaRef - rev, 0))}</div></div>
              </>
            ) : (
              <>
                <div className="item"><div className="k">Vendas fechadas</div><div className="v num">{totals.venda}</div></div>
                <div className="item"><div className="k">Ticket médio</div><div className="v num">{totals.venda ? brl(rev / totals.venda) : "—"}</div></div>
                <div className="item"><div className="k">Time no período</div><div className="v num">{brl(teamRevenue)}</div></div>
              </>
            )}
          </div>
        </section>

        {/* OPORTUNIDADES QUENTES */}
        <section className="cp-card span-5">
          <div className="hot-head">
            <div>
              <div className="cp-card-label">Oportunidades quentes</div>
              <div className="hot-value num">{brl(hotTotal)}</div>
              <div className="cp-card-sub">
                {hotActive.length} proposta{hotActive.length === 1 ? "" : "s"} quente{hotActive.length === 1 ? "" : "s"} · {selectedCloserLocal === "all" ? "todos os closers" : selected?.name}
              </div>
            </div>
            <div className="hot-badge num">{pct(hotPctVal, 0)} do pipeline</div>
          </div>
          <div className="hot-bar"><i style={{ width: `${hotPctVal * 100}%` }} /></div>
          <div className="hot-scale">{brl(hotTotal)} quentes em propostas abertas</div>
          {selectedCloserLocal === "all" && (
            <div className="hot-rows">
              {closers
                .filter(c => c.propHot > 0)
                .sort((a, b) => b.propHot - a.propHot)
                .map(c => (
                  <div className="hot-row" key={c.id}>
                    <span className="h-name">{c.name}</span>
                    <span className="h-bar"><i style={{ width: `${c.propPipe ? c.propHot / c.propPipe * 100 : 0}%` }} /></span>
                    <span className="h-val num">{brl(c.propHot)}</span>
                    <span className="h-pct num">{pct(c.propPipe ? c.propHot / c.propPipe : 0, 0)}</span>
                  </div>
                ))}
              {!closers.some(c => c.propHot > 0) && (
                <div style={{ padding: "12px 0", fontSize: 12, color: "var(--cp-chalk-4)" }}>Sem oportunidades quentes no período.</div>
              )}
            </div>
          )}
          <div className="hot-foot">
            {metaRef > 0
              ? <>Realizado + quentes: <b>{brl(rev + hotTotal)}</b> — {pct(metaRef ? (rev + hotTotal) / metaRef : 0, 0)} da meta{selectedCloserLocal === "all" ? "" : " individual"}</>
              : <>Realizado + quentes: <b>{brl(rev + hotTotal)}</b></>}
          </div>
        </section>

        {/* FUNIL */}
        <section className="cp-card span-5">
          <div className="cp-card-label">Conversão do funil</div>
          <div className="cp-card-sub">Taxa real vs meta · {selectedCloserLocal === "all" ? "todos os closers" : selected?.name}</div>
          <div className="funnel-v">
            {METRIC_DEFS.map((m, i) => (
              <div key={m.key}>
                <div
                  className="f-stage"
                  style={{ width: `${widths[m.key]}%`, background: `var(${m.varName})` }}
                >
                  <span className="count num">{totals[m.key]}</span>
                  <span className="name">{m.label}</span>
                </div>
                {i < METRIC_DEFS.length - 1 && (() => {
                  const s = steps[i];
                  const rate = totals[s.from] ? totals[s.to] / totals[s.from] : 0;
                  const att = s.meta > 0 ? rate / s.meta : 0;
                  const w1 = widths[s.from], w2 = widths[s.to];
                  const x1 = (100 - w1) / 2, x2 = (100 + w1) / 2, x3 = (100 + w2) / 2, x4 = (100 - w2) / 2;
                  return (
                    <div className="f-conn">
                      <div className="f-shape" style={{ clipPath: `polygon(${x1}% 0, ${x2}% 0, ${x3}% 100%, ${x4}% 100%)` }} />
                      <div className="rate num">{pct(rate)} {s.meta > 0 && <small>/ meta {pct(s.meta, 0)}</small>}</div>
                      <div className="att-bar"><i style={{ width: `${Math.min(att * 100, 100)}%`, background: attColor(att) }} /></div>
                      <div className="att-label num">{s.meta > 0 ? `${pct(att, 0)} da meta` : "sem meta"}</div>
                    </div>
                  );
                })()}
              </div>
            ))}
          </div>
          <div className="funnel-overall">
            <span className="k">Conversão geral RM → Venda</span>
            <span className="v num">
              {pct(overallConv)} {overallMeta > 0 && <small style={{ color: "var(--cp-chalk-3)", fontSize: 11, fontFamily: "Inter" }}>/ meta {pct(overallMeta)}</small>}
            </span>
          </div>
        </section>

        {/* RANKING */}
        <section className="cp-card span-7">
          <div className="cp-card-label">Ranking de closers</div>
          <div className="cp-card-sub">Por faturamento no período · pace individual vs meta</div>
          <div className="rank-list">
            {ranking.length === 0 && <div style={{ padding: "16px 0", fontSize: 12, color: "var(--cp-chalk-4)" }}>Sem vendas no período.</div>}
            {ranking.map((r, i) => (
              <div key={r.id} className={"rank-row" + (r.id === selectedCloserLocal ? " highlight" : "")}>
                <div className="rank-pos num">{i + 1}</div>
                <div className="rank-avatar">{initials(r.name)}</div>
                <div className="rank-info">
                  <div className="rank-name">{r.name}</div>
                  <div className="rank-bar"><i style={{ width: `${r.rev / maxRev * 100}%` }} /></div>
                </div>
                <div className="rank-nums">
                  <div className="rank-rev num">{brl(r.rev)}</div>
                  <div className="rank-detail num">{r.vendas} venda{r.vendas === 1 ? "" : "s"} · {pct(r.conv, 0)} RM→V</div>
                </div>
                {r.paceDelta !== null && (
                  <div className={"rank-pace " + (r.paceDelta >= 0 ? "ahead" : "behind")}>
                    {r.paceDelta >= 0 ? "+" : ""}{pct(r.paceDelta, 0)} pace
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* CHART */}
        <section className="cp-card span-12">
          <div className="chart-head">
            <div>
              <div className="cp-card-label">Evolução diária do funil — meta × realizado</div>
              <div className="cp-card-sub">
                {selectedCloserLocal === "all" ? "Todos os closers" : selected?.name}
                {mode === "cum" ? " · acumulado no período" : " · volume por dia"}
                {paceOn && goals ? " · linhas tracejadas = pace esperado da meta" : ""}
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <div className="metric-toggles">
                {METRIC_DEFS.map(m => (
                  <button
                    key={m.key}
                    className={"metric-chip" + (metricOn[m.key] ? "" : " off")}
                    onClick={() => setMetricOn(s => ({ ...s, [m.key]: !s[m.key] }))}
                  >
                    <span className="swatch" style={{ background: `var(${m.varName})` }} />
                    {m.label}
                  </button>
                ))}
                <button
                  key="fat"
                  className={"metric-chip" + (metricOn.fat ? "" : " off")}
                  onClick={() => setMetricOn(s => ({ ...s, fat: !s.fat }))}
                >
                  <span className="swatch" style={{ background: `var(--m-fat)` }} />
                  Faturamento
                </button>
              </div>
              <button className={"pace-toggle" + (paceOn ? "" : " off")} onClick={() => setPaceOn(p => !p)}>
                <span className="dash" /> Pace esperado
              </button>
              <div className="mode-toggle">
                <button className={mode === "cum" ? "active" : ""} onClick={() => setMode("cum")}>Acumulado</button>
                <button className={mode === "daily" ? "active" : ""} onClick={() => setMode("daily")}>Diário</button>
              </div>
            </div>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.4)" />
                <XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <YAxis yAxisId="left" allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  tickFormatter={(v: number) => v >= 1000 ? `R$ ${Math.round(v / 1000)}k` : `R$ ${Math.round(v)}`}
                  width={70}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    color: "hsl(var(--popover-foreground))",
                    fontSize: 12,
                  }}
                  formatter={(value: any, name: any) => {
                    const isFat = typeof name === "string" && (name === "Faturamento" || name === "Meta Faturamento");
                    if (isFat && typeof value === "number") return [brl(value), name];
                    return [value, name];
                  }}
                />
                {METRIC_DEFS.filter(m => metricOn[m.key]).flatMap(m => {
                  const lines = [
                    <Line
                      key={m.key}
                      yAxisId="left"
                      type="monotone"
                      dataKey={m.key}
                      name={m.label}
                      stroke={`var(${m.varName})`}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />,
                  ];
                  if (paceOn && goals) {
                    lines.push(
                      <Line
                        key={m.key + "_meta"}
                        yAxisId="left"
                        type="monotone"
                        dataKey={m.key + "_meta"}
                        name={`Meta ${m.label}`}
                        stroke={`var(${m.varName})`}
                        strokeWidth={1.5}
                        strokeDasharray="6 6"
                        strokeOpacity={0.5}
                        dot={false}
                      />
                    );
                  }
                  return lines;
                })}
                {metricOn.fat && (
                  <Line
                    key="fat"
                    yAxisId="right"
                    type="monotone"
                    dataKey="fat"
                    name="Faturamento"
                    stroke={`var(--m-fat)`}
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                )}
                {metricOn.fat && paceOn && fatMetaRef > 0 && (
                  <Line
                    key="fat_meta"
                    yAxisId="right"
                    type="monotone"
                    dataKey="fat_meta"
                    name="Meta Faturamento"
                    stroke={`var(--m-fat)`}
                    strokeWidth={1.5}
                    strokeDasharray="6 6"
                    strokeOpacity={0.5}
                    dot={false}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <p className="footnote">
        * MQL, RM, RR e Propostas vêm do CRM. Vendas e faturamento usam a data de assinatura do contrato. Metas do funil vêm do Plan Growth (<code>funnel_metas</code>), rateadas pelo período filtrado.
      </p>
    </div>
  );
}
