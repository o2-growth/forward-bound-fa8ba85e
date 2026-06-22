import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { startOfMonth, endOfMonth } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import type { CampaignData } from "@/components/planning/marketing-indicators/types";
import { useFunnelRealized } from "./useFunnelRealized";
import { useModeloAtualAnalytics } from "./useModeloAtualAnalytics";
import { useO2TaxAnalytics } from "./useO2TaxAnalytics";
import { useExpansaoAnalytics } from "./useExpansaoAnalytics";
import { useMrrBase } from "./useMrrBase";
import { useOxyFinance } from "./useOxyFinance";
import { useHrData } from "./useHrData";
import { useOperationsData } from "./useOperationsData";

export type LiveColKey =
  | "jan" | "fev" | "mar" | "q1"
  | "abr" | "mai" | "jun" | "q2"
  | "jul" | "ago" | "set" | "q3"
  | "out" | "nov" | "dez" | "q4"
  | "total2026";

export interface LiveRow {
  label: string;
  values: Partial<Record<LiveColKey, number | null>>;
}

export interface UseIndicators26LiveResult {
  rows: LiveRow[];
  isLoading: boolean;
  lastUpdate: string;
}

const MONTH_KEYS: LiveColKey[] = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];
const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const sum = (arr: (number | null | undefined)[]): number =>
  arr.reduce<number>((s, v) => s + (typeof v === "number" ? v : 0), 0);

const safeDiv = (a: number, b: number): number | null => (b > 0 ? a / b : null);

/**
 * Hook que monta a "Visão Total — Indicadores 26" com dados ao vivo para 2026.
 * Retorna as colunas mensais Jan–Dez/2026 + agregados trimestrais + TOTAL 2026.
 * NÃO preenche as colunas históricas de 2025 (jul25..q425) — essas continuam vindo da planilha.
 */
export function useIndicators26Live(): UseIndicators26LiveResult {
  const year = 2026;

  // ----- 1. Meta + Google Ads por mês (6 queries paralelas para Jan–Jun) -----
  const monthRanges = useMemo(() => {
    const today = new Date();
    return MONTH_NAMES.map((_, i) => {
      const start = startOfMonth(new Date(year, i, 1));
      const end = endOfMonth(new Date(year, i, 1));
      const inPast = start <= today;
      return { i, start, end, inPast };
    });
  }, []);

  const metaQueries = useQueries({
    queries: monthRanges.map(({ i, start, end, inPast }) => ({
      queryKey: ["live-meta-campaigns", year, i],
      enabled: inPast,
      staleTime: 10 * 60 * 1000,
      retry: 1,
      queryFn: async (): Promise<{ spend: number; leads: number }> => {
        const { data, error } = await supabase.functions.invoke("fetch-meta-campaigns", {
          body: {
            startDate: start.toISOString().split("T")[0],
            endDate: end.toISOString().split("T")[0],
          },
        });
        if (error) throw error;
        const campaigns: any[] = (data?.campaigns || []).map((c: any) => {
          const ins = c.insights || {};
          const spend = parseFloat(ins.spend || "0");
          const actions: any[] = ins.actions || [];
          const leadAction = actions.find((a) =>
            a.action_type === "lead" ||
            a.action_type === "onsite_conversion.lead_grouped" ||
            a.action_type === "offsite_conversion.fb_pixel_lead"
          );
          const leads = leadAction ? parseInt(leadAction.value, 10) || 0 : 0;
          return { investment: spend, leads };
        });
        return {
          spend: campaigns.reduce((s, c) => s + (c.investment || 0), 0),
          leads: campaigns.reduce((s, c) => s + (c.leads || 0), 0),
        };
      },
    })),
  });

  const googleQueries = useQueries({
    queries: monthRanges.map(({ i, start, end, inPast }) => ({
      queryKey: ["live-google-campaigns", year, i],
      enabled: inPast,
      staleTime: 10 * 60 * 1000,
      retry: 1,
      queryFn: async (): Promise<{ spend: number; leads: number }> => {
        const { data, error } = await supabase.functions.invoke("fetch-google-campaigns", {
          body: {
            startDate: start.toISOString().split("T")[0],
            endDate: end.toISOString().split("T")[0],
          },
        });
        if (error) throw error;
        const campaigns = data?.campaigns || [];
        // fetch-google-campaigns retorna `spend` já em BRL e `conversions` (ou `leads`)
        return {
          spend: campaigns.reduce(
            (s: number, c: any) =>
              s + Number(c.spend ?? c.investment ?? (Number(c.cost_micros || 0) / 1_000_000)),
            0
          ),
          leads: campaigns.reduce(
            (s: number, c: any) => s + Number(c.conversions ?? c.leads ?? 0),
            0
          ),
        };
      },
    })),
  });

  // ----- 2. Funil Pipefy (uma query do ano inteiro) -----
  const yearStart = useMemo(() => new Date(year, 0, 1), []);
  const yearEnd = useMemo(() => new Date(year, 11, 31), []);
  const funnel = useFunnelRealized(yearStart, yearEnd);

  // ----- 3. Receita por BU via Analytics hooks (mesma fonte do drill-down comercial) -----
  // Cada hook retorna `cards` filtrados ao período + getCardsForIndicator('venda') deduplicado.
  const modeloA = useModeloAtualAnalytics(yearStart, yearEnd);
  const o2taxA = useO2TaxAnalytics(yearStart, yearEnd);
  const franquiaA = useExpansaoAnalytics(yearStart, yearEnd, "Franquia");
  const oxyHackerA = useExpansaoAnalytics(yearStart, yearEnd, "Oxy Hacker");

  // ----- 4. Outras fontes -----
  const { getMrrBaseForMonth } = useMrrBase();
  const oxy = useOxyFinance(year);
  const hr = useHrData({ startDate: yearStart, endDate: yearEnd });
  const operations = useOperationsData();

  const isLoading =
    metaQueries.some((q) => q.isLoading) ||
    googleQueries.some((q) => q.isLoading) ||
    funnel.isLoading ||
    modeloA.isLoading ||
    o2taxA.isLoading ||
    franquiaA.isLoading ||
    oxyHackerA.isLoading ||
    oxy.isLoading;

  const rows = useMemo<LiveRow[]>(() => {
    // ===== Funnel realized por mês =====
    const funnelByMonth = (indicator: string): number[] => {
      const out = new Array(12).fill(0);
      for (const r of funnel.data || []) {
        if (r.indicator !== indicator) continue;
        if (!r.date) continue;
        const d = new Date(r.date);
        if (d.getFullYear() !== year) continue;
        out[d.getMonth()] += Number(r.value || 0);
      }
      return out;
    };

    const leadsM = funnelByMonth("leads");
    const mqlM = funnelByMonth("mql");
    const rmM = funnelByMonth("rm");
    const rrM = funnelByMonth("rr");
    const propostaM = funnelByMonth("proposta");
    const vendaM = funnelByMonth("venda");

    // ===== Mídia/Leads de API por mês =====
    const metaSpendM = monthRanges.map((_, i) => metaQueries[i]?.data?.spend ?? 0);
    const metaLeadsM = monthRanges.map((_, i) => metaQueries[i]?.data?.leads ?? 0);
    const googleSpendM = monthRanges.map((_, i) => googleQueries[i]?.data?.spend ?? 0);
    const googleLeadsM = monthRanges.map((_, i) => googleQueries[i]?.data?.leads ?? 0);
    const totalSpendM = metaSpendM.map((v, i) => v + googleSpendM[i]);
    const totalLeadsApiM = metaLeadsM.map((v, i) => v + googleLeadsM[i]);

    // ===== Receita por mês via cartões de venda (regra: 'Data de assinatura do contrato') =====
    const mrrM = new Array(12).fill(0);
    const setupM = new Array(12).fill(0);
    const pontualM = new Array(12).fill(0);
    const educacaoM = new Array(12).fill(0);

    // Helper: percorre cards de venda e agrega por mês usando dataAssinatura||dataEntrada.
    // Deduplica por (id + mês) — memória `sales-monthly-card-dedup`.
    const aggregateSales = (vendaCards: any[]) => {
      const seen = new Map<string, true>(); // chave: `${id}-${month}`
      for (const c of vendaCards) {
        const dt: Date = c.dataAssinatura || c.dataEntrada;
        if (!dt) continue;
        if (dt.getFullYear() !== year) continue;
        const m = dt.getMonth();
        const k = `${c.id}-${m}`;
        if (seen.has(k)) continue;
        seen.set(k, true);
        mrrM[m] += Number(c.valorMRR || 0);
        setupM[m] += Number(c.valorSetup || 0);
        pontualM[m] += Number(c.valorPontual || 0);
        educacaoM[m] += Number(c.valorEducacao || 0);
      }
    };

    try { aggregateSales(modeloA.getCardsForIndicator?.("venda") || []); } catch {}
    try { aggregateSales(o2taxA.getCardsForIndicator?.("venda") || []); } catch {}
    try { aggregateSales(franquiaA.getCardsForIndicator?.("venda") || []); } catch {}
    try { aggregateSales(oxyHackerA.getCardsForIndicator?.("venda") || []); } catch {}

    const gmvM = mrrM.map((v, i) => v + setupM[i] + pontualM[i] + educacaoM[i]);

    // ===== MRR Base mensal =====
    const mrrBaseM = MONTH_NAMES.map((m) => getMrrBaseForMonth(m, year));

    // ===== Receita bruta (Oxy Finance cashflow) =====
    const receitaBrutaM = MONTH_NAMES.map((m) => oxy.cashflowByMonth?.[m as any] || 0);

    // ===== Headcount snapshot (sem histórico mensal) =====
    const headcountAtual = hr.headcountTotal || 0;
    const headcountM = MONTH_NAMES.map(() => headcountAtual);

    // ===== Operations snapshots — replicados em todos os meses =====
    const opsKpis = operations.data?.kpis;
    const clientesAtivosSnap = opsKpis?.totalAtivos ?? null;
    const churnAbsSnap = opsKpis?.churn ?? null;
    const churnRateSnap = typeof opsKpis?.churnRate === "number" ? opsKpis.churnRate / 100 : null; // 0..1
    const mrrEmRiscoSnap = opsKpis?.mrrEmRisco ?? null;

    const clientesAtivosM: (number | null)[] = MONTH_NAMES.map(() => clientesAtivosSnap);
    const logoChurnM: (number | null)[] = MONTH_NAMES.map(() => churnAbsSnap);
    const pctLogoChurnM: (number | null)[] = MONTH_NAMES.map(() => churnRateSnap);
    const revenueChurnM: (number | null)[] = MONTH_NAMES.map(() => mrrEmRiscoSnap);
    const pctRevenueChurnM: (number | null)[] = mrrBaseM.map((b) =>
      b && mrrEmRiscoSnap != null ? mrrEmRiscoSnap / b : null
    );

    // ARPU = MRR Base / Clientes Ativos
    const arpuM: (number | null)[] = mrrBaseM.map((b) =>
      b && clientesAtivosSnap && clientesAtivosSnap > 0 ? b / clientesAtivosSnap : null
    );
    // LT (meses) = 1 / churn rate mensal
    const ltM: (number | null)[] = MONTH_NAMES.map(() =>
      churnRateSnap && churnRateSnap > 0 ? 1 / churnRateSnap : null
    );
    // LTV = ARPU * LT
    const ltvM: (number | null)[] = arpuM.map((a, i) =>
      a != null && ltM[i] != null ? a * (ltM[i] as number) : null
    );

    // CAC
    const cacM: (number | null)[] = totalSpendM.map((s, i) => safeDiv(s, vendaM[i]));
    // CAC Payback (MRR) = CAC / ARPU(MRR)
    const cacPaybackMrrM: (number | null)[] = cacM.map((c, i) =>
      c != null && arpuM[i] != null && (arpuM[i] as number) > 0 ? c / (arpuM[i] as number) : null
    );
    // LTV/CAC
    const ltvCacM: (number | null)[] = ltvM.map((l, i) =>
      l != null && cacM[i] != null && (cacM[i] as number) > 0 ? l / (cacM[i] as number) : null
    );
    // ROAS LTV = (LTV * Vendas) / Mídia
    const roasLtvM: (number | null)[] = ltvM.map((l, i) =>
      l != null && totalSpendM[i] > 0 ? (l * vendaM[i]) / totalSpendM[i] : null
    );
    // ROI LTV = ROAS LTV - 1
    const roiLtvM: (number | null)[] = roasLtvM.map((r) => (r == null ? null : r - 1));

    // Derivados de receita
    const arrM = mrrM.map((v) => v * 12);
    const runRateM = arrM;
    const tcvM = mrrM.map((v, i) => v * 12 + setupM[i] + pontualM[i]);

    // ===== Helper para build de linha =====
    const buildRow = (label: string, monthly: (number | null)[], opts?: {
      ratio?: { num: number[]; den: number[] };
      avg?: boolean;
    }): LiveRow => {
      const values: Partial<Record<LiveColKey, number | null>> = {};
      monthly.forEach((v, i) => { values[MONTH_KEYS[i]] = v; });

      const numericQ = (months: number[]) =>
        months.map((i) => monthly[i]).filter((v): v is number => typeof v === "number");
      if (opts?.ratio) {
        const ratioQ = (months: number[]) => {
          const num = sum(months.map((i) => opts.ratio!.num[i]));
          const den = sum(months.map((i) => opts.ratio!.den[i]));
          return safeDiv(num, den);
        };
        values.q1 = ratioQ([0, 1, 2]);
        values.q2 = ratioQ([3, 4, 5]);
        values.q3 = ratioQ([6, 7, 8]);
        values.q4 = ratioQ([9, 10, 11]);
        values.total2026 = safeDiv(sum(opts.ratio.num), sum(opts.ratio.den));
      } else if (opts?.avg) {
        const avgQ = (months: number[]) => {
          const arr = numericQ(months);
          return arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null;
        };
        values.q1 = avgQ([0, 1, 2]);
        values.q2 = avgQ([3, 4, 5]);
        values.q3 = avgQ([6, 7, 8]);
        values.q4 = avgQ([9, 10, 11]);
        const allNum = monthly.filter((v): v is number => typeof v === "number");
        values.total2026 = allNum.length ? allNum.reduce((s, v) => s + v, 0) / allNum.length : null;
      } else {
        const sumQ = (months: number[]) => {
          const arr = numericQ(months);
          return arr.length ? arr.reduce((s, v) => s + v, 0) : null;
        };
        values.q1 = sumQ([0, 1, 2]);
        values.q2 = sumQ([3, 4, 5]);
        values.q3 = sumQ([6, 7, 8]);
        values.q4 = sumQ([9, 10, 11]);
        const all = monthly.filter((v): v is number => typeof v === "number");
        values.total2026 = all.length ? all.reduce((s, v) => s + v, 0) : null;
      }
      return { label, values };
    };

    const NULL_M: (number | null)[] = new Array(12).fill(null);

    const out: LiveRow[] = [
      // === Aquisição / Mídia ===
      buildRow("Mídia Google Ads", googleSpendM),
      buildRow("Leads - Google Ads", googleLeadsM),
      buildRow("CPL - Google Ads",
        googleSpendM.map((s, i) => safeDiv(s, googleLeadsM[i])),
        { ratio: { num: googleSpendM, den: googleLeadsM } }),
      buildRow("Mídia Meta Ads", metaSpendM),
      buildRow("Leads - Meta Ads", metaLeadsM),
      buildRow("CPL - Meta Ads",
        metaSpendM.map((s, i) => safeDiv(s, metaLeadsM[i])),
        { ratio: { num: metaSpendM, den: metaLeadsM } }),
      buildRow("Instagram O2", NULL_M),
      buildRow("Instagram Pedro", NULL_M),
      buildRow("Instagram Total", NULL_M),
      buildRow("Mídia total", totalSpendM),
      buildRow("Leads totais", totalLeadsApiM),
      buildRow("CPL total",
        totalSpendM.map((s, i) => safeDiv(s, totalLeadsApiM[i])),
        { ratio: { num: totalSpendM, den: totalLeadsApiM } }),
      buildRow("Leads no pipe", leadsM),
      buildRow("CPL no pipe",
        totalSpendM.map((s, i) => safeDiv(s, leadsM[i])),
        { ratio: { num: totalSpendM, den: leadsM } }),

      // === Funil MQL → Venda ===
      buildRow("MQL por Faturamento", mqlM),
      buildRow("CPMQL por Faturamento",
        totalSpendM.map((s, i) => safeDiv(s, mqlM[i])),
        { ratio: { num: totalSpendM, den: mqlM } }),
      buildRow("MQL/Leads (por Faturamento)",
        mqlM.map((v, i) => safeDiv(v, leadsM[i])),
        { ratio: { num: mqlM, den: leadsM } }),
      buildRow("SQL", NULL_M),
      buildRow("CPSQL", NULL_M),
      buildRow("SQL/MQL", NULL_M),
      buildRow("SQL/Leads", NULL_M),
      buildRow("Tentativas de chamada", NULL_M),
      buildRow("Chamadas atendidas", NULL_M),
      buildRow("Conversas efetuadas", NULL_M),
      buildRow("Taxa Tentativas/Atendidas", NULL_M),
      buildRow("Taxa MQL/RM (%)",
        rmM.map((v, i) => safeDiv(v, mqlM[i])),
        { ratio: { num: rmM, den: mqlM } }),
      buildRow("Reunião marcada", rmM),
      buildRow("Conversas/marcadas", NULL_M),
      buildRow("CPRM",
        totalSpendM.map((s, i) => safeDiv(s, rmM[i])),
        { ratio: { num: totalSpendM, den: rmM } }),
      buildRow("Taxa RM/RR (%)",
        rrM.map((v, i) => safeDiv(v, rmM[i])),
        { ratio: { num: rrM, den: rmM } }),
      buildRow("No show",
        rmM.map((v, i) => Math.max(v - rrM[i], 0))),
      buildRow("Reunião realizada", rrM),
      buildRow("CPRR",
        totalSpendM.map((s, i) => safeDiv(s, rrM[i])),
        { ratio: { num: totalSpendM, den: rrM } }),
      buildRow("Proposta enviada", propostaM),
      buildRow("Taxa RR/Proposta (%)",
        propostaM.map((v, i) => safeDiv(v, rrM[i])),
        { ratio: { num: propostaM, den: rrM } }),
      buildRow("Vendas/MQL",
        vendaM.map((v, i) => safeDiv(v, mqlM[i])),
        { ratio: { num: vendaM, den: mqlM } }),
      buildRow("Vendas", vendaM),
      buildRow("CPV",
        totalSpendM.map((s, i) => safeDiv(s, vendaM[i])),
        { ratio: { num: totalSpendM, den: vendaM } }),
      buildRow("Taxa Proposta/Venda (%)",
        vendaM.map((v, i) => safeDiv(v, propostaM[i])),
        { ratio: { num: vendaM, den: propostaM } }),
      buildRow("Conversão MQL/Venda (%)",
        vendaM.map((v, i) => safeDiv(v, mqlM[i])),
        { ratio: { num: vendaM, den: mqlM } }),

      // === CAC & Unit Economics ===
      buildRow("CAC", cacM, { ratio: { num: totalSpendM, den: vendaM } }),
      buildRow("MRR", mrrM),
      buildRow("Setup", setupM),
      buildRow("Pontual", pontualM),
      buildRow("Educação", educacaoM),
      buildRow("GMV (Gross Merchandise Value)", gmvM),
      buildRow("Run Rate", runRateM, { avg: true }),
      buildRow("ARR", arrM, { avg: true }),
      buildRow("ARPU", arpuM, { avg: true }),
      buildRow("ARPU (MRR)", arpuM, { avg: true }),
      buildRow("ARPU (Setup)", NULL_M),
      buildRow("LT", ltM, { avg: true }),
      buildRow("LTV", ltvM, { avg: true }),
      buildRow("TCV (Total Contract Value)", tcvM),
      buildRow("LTV/TCV",
        ltvM.map((l, i) => (l != null && tcvM[i] > 0 ? l / tcvM[i] : null)),
        { avg: true }),
      buildRow("Ads/GMV",
        totalSpendM.map((s, i) => safeDiv(s, gmvM[i])),
        { ratio: { num: totalSpendM, den: gmvM } }),
      buildRow("Margem Bruta", NULL_M),
      buildRow("LTV Final", NULL_M),

      // === Base & Retenção ===
      buildRow("Clientes ativos", clientesAtivosM, { avg: true }),
      buildRow("MRR base", mrrBaseM, { avg: true }),
      buildRow("Receita bruta", receitaBrutaM),
      buildRow("Risco de churn", NULL_M),
      buildRow("Pedido de churn", NULL_M),
      buildRow("Logo Churn", logoChurnM, { avg: true }),
      buildRow("% Logo Churn", pctLogoChurnM, { avg: true }),
      buildRow("Revenue Churn", revenueChurnM, { avg: true }),
      buildRow("% Revenue Churn", pctRevenueChurnM, { avg: true }),
      buildRow("Net Customer Growth", NULL_M),
      buildRow("% Net Customer Growth", NULL_M),
      buildRow("Net Revenue Retention", NULL_M),
      buildRow("% Net Revenue Retention", NULL_M),

      // === Eficiência & Retorno ===
      buildRow("Time e ferramentas", NULL_M),
      buildRow("Despesas totais", NULL_M),
      buildRow("Headcount", headcountM, { avg: true }),
      buildRow("Revenue per Employee",
        receitaBrutaM.map((r, i) => safeDiv(r, headcountM[i] || 0)),
        { ratio: { num: receitaBrutaM, den: headcountM } }),
      buildRow("ROAS",
        gmvM.map((g, i) => safeDiv(g, totalSpendM[i])),
        { ratio: { num: gmvM, den: totalSpendM } }),
      buildRow("ROAS LTV", roasLtvM, { avg: true }),
      buildRow("LTV/CAC", ltvCacM, { avg: true }),
      buildRow("CAC Payback", cacPaybackMrrM, { avg: true }),
      buildRow("CAC Payback (MRR)", cacPaybackMrrM, { avg: true }),
      buildRow("ROI",
        gmvM.map((g, i) => {
          const r = safeDiv(g, totalSpendM[i]);
          return r === null ? null : r - 1;
        }),
        { ratio: { num: gmvM.map((g, i) => g - totalSpendM[i]), den: totalSpendM } }),
      buildRow("ROI LTV", roiLtvM, { avg: true }),
      buildRow("ROI LTV Final", NULL_M),
      buildRow("ROI Pedro", NULL_M),
      buildRow("ROI Pedro LTV", NULL_M),
    ];

    return out;
  }, [
    funnel.data,
    metaQueries.map((q) => q.dataUpdatedAt).join(","),
    googleQueries.map((q) => q.dataUpdatedAt).join(","),
    modeloA.isLoading, o2taxA.isLoading, franquiaA.isLoading, oxyHackerA.isLoading,
    getMrrBaseForMonth,
    oxy.cashflowByMonth,
    hr.headcountTotal,
    operations.data,
  ]);

  return {
    rows,
    isLoading,
    lastUpdate: new Date().toISOString().slice(0, 10),
  };
}
