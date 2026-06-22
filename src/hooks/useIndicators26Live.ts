import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { startOfMonth, endOfMonth } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import type { CampaignData } from "@/components/planning/marketing-indicators/types";
import { useFunnelRealized } from "./useFunnelRealized";
import { useModeloAtualMetas } from "./useModeloAtualMetas";
import { useO2TaxMetas } from "./useO2TaxMetas";
import { useExpansaoMetas } from "./useExpansaoMetas";
import { useOxyHackerMetas } from "./useOxyHackerMetas";
import { useMrrBase } from "./useMrrBase";
import { useOxyFinance } from "./useOxyFinance";
import { useHrData } from "./useHrData";

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
  // Future months retornariam zero — não vale a pena disparar 12 calls. Mantemos 6 Jan–Jun
  // e replicamos zero para Jul–Dez (esses meses ainda não rodaram).
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
        const campaigns: CampaignData[] = (data?.campaigns || []).map((c: any) => {
          const ins = c.insights || {};
          const spend = parseFloat(ins.spend || "0");
          const actions: any[] = ins.actions || [];
          const leadAction = actions.find((a) =>
            a.action_type === "lead" ||
            a.action_type === "onsite_conversion.lead_grouped" ||
            a.action_type === "offsite_conversion.fb_pixel_lead"
          );
          const leads = leadAction ? parseInt(leadAction.value, 10) || 0 : 0;
          return { investment: spend, leads } as any;
        });
        return {
          spend: campaigns.reduce((s, c: any) => s + (c.investment || 0), 0),
          leads: campaigns.reduce((s, c: any) => s + (c.leads || 0), 0),
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
        return {
          spend: campaigns.reduce((s: number, c: any) => s + (Number(c.cost_micros || 0) / 1_000_000 || c.investment || 0), 0),
          leads: campaigns.reduce((s: number, c: any) => s + (Number(c.conversions || c.leads || 0)), 0),
        };
      },
    })),
  });

  // ----- 2. Funil Pipefy (uma query do ano inteiro) -----
  const yearStart = useMemo(() => new Date(year, 0, 1), []);
  const yearEnd = useMemo(() => new Date(year, 11, 31), []);
  const funnel = useFunnelRealized(yearStart, yearEnd);

  // ----- 3. Receita por BU (4 hooks, range anual) -----
  const modelo = useModeloAtualMetas(yearStart, yearEnd);
  const o2tax = useO2TaxMetas(yearStart, yearEnd);
  const franquia = useExpansaoMetas(yearStart, yearEnd);
  const oxyHacker = useOxyHackerMetas(yearStart, yearEnd);

  // ----- 4. Outras fontes -----
  const { getMrrBaseForMonth } = useMrrBase();
  const oxy = useOxyFinance(year);
  const hr = useHrData({ startDate: yearStart, endDate: yearEnd });

  const isLoading =
    metaQueries.some((q) => q.isLoading) ||
    googleQueries.some((q) => q.isLoading) ||
    funnel.isLoading ||
    modelo.isLoading ||
    o2tax.isLoading ||
    oxy.isLoading;

  const rows = useMemo<LiveRow[]>(() => {
    // Per-month aggregates from funnel_realized
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

    // Mídia/Leads por mês
    const metaSpendM = monthRanges.map((_, i) => metaQueries[i]?.data?.spend ?? 0);
    const metaLeadsM = monthRanges.map((_, i) => metaQueries[i]?.data?.leads ?? 0);
    const googleSpendM = monthRanges.map((_, i) => googleQueries[i]?.data?.spend ?? 0);
    const googleLeadsM = monthRanges.map((_, i) => googleQueries[i]?.data?.leads ?? 0);
    const totalSpendM = metaSpendM.map((v, i) => v + googleSpendM[i]);
    const totalLeadsApiM = metaLeadsM.map((v, i) => v + googleLeadsM[i]);

    // Receita por mês (4 BUs)
    const mrrM: number[] = [];
    const setupM: number[] = [];
    const pontualM: number[] = [];
    const educacaoM: number[] = [];

    for (let i = 0; i < 12; i++) {
      const start = startOfMonth(new Date(year, i, 1));
      const end = endOfMonth(new Date(year, i, 1));
      let mrr = 0, setup = 0, pontual = 0, educacao = 0;
      mrr += modelo.getMrrForPeriod(start, end);
      setup += modelo.getSetupForPeriod(start, end);
      pontual += modelo.getPontualForPeriod(start, end);
      educacao += modelo.getEducacaoForPeriod(start, end);
      mrr += o2tax.getMrrForPeriod(start, end);
      setup += o2tax.getSetupForPeriod(start, end);
      pontual += o2tax.getPontualForPeriod(start, end);
      pontual += franquia.getValueForPeriod("venda", start, end);
      pontual += oxyHacker.getValueForPeriod("venda", start, end);
      mrrM.push(mrr);
      setupM.push(setup);
      pontualM.push(pontual);
      educacaoM.push(educacao);
    }

    const gmvM = mrrM.map((v, i) => v + setupM[i] + pontualM[i] + educacaoM[i]);

    // MRR Base mensal
    const mrrBaseM = MONTH_NAMES.map((m) => getMrrBaseForMonth(m, year));

    // Receita bruta (Oxy Finance cashflow)
    const receitaBrutaM = MONTH_NAMES.map((m) => oxy.cashflowByMonth?.[m as any] || 0);

    // Headcount (snapshot atual — não temos histórico mensal de headcount)
    const headcountAtual = hr.headcountTotal || 0;
    const headcountM = MONTH_NAMES.map(() => headcountAtual);

    // Derivados
    const arrM = mrrM.map((v) => v * 12);
    const runRateM = arrM;
    const tcvM = mrrM.map((v, i) => v * 12 + setupM[i] + pontualM[i]);

    // Helper para build de linha mensal com agregados trimestrais e total
    const buildRow = (label: string, monthly: (number | null)[], opts?: {
      ratio?: { num: number[]; den: number[] };
      avg?: boolean;
    }): LiveRow => {
      const values: Partial<Record<LiveColKey, number | null>> = {};
      monthly.forEach((v, i) => { values[MONTH_KEYS[i]] = v; });

      // Quarters
      const numericQ = (months: number[]) => months.map((i) => monthly[i]).filter((v): v is number => typeof v === "number");
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

    const rows: LiveRow[] = [
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
      buildRow("CAC",
        totalSpendM.map((s, i) => safeDiv(s, vendaM[i])),
        { ratio: { num: totalSpendM, den: vendaM } }),
      buildRow("MRR", mrrM),
      buildRow("Setup", setupM),
      buildRow("Pontual", pontualM),
      buildRow("Educação", educacaoM),
      buildRow("GMV (Gross Merchandise Value)", gmvM),
      buildRow("Run Rate", runRateM, { avg: true }),
      buildRow("ARR", arrM, { avg: true }),
      buildRow("ARPU", NULL_M),
      buildRow("ARPU (MRR)", NULL_M),
      buildRow("ARPU (Setup)", NULL_M),
      buildRow("LT", NULL_M),
      buildRow("LTV", NULL_M),
      buildRow("TCV (Total Contract Value)", tcvM),
      buildRow("LTV/TCV", NULL_M),
      buildRow("Ads/GMV",
        totalSpendM.map((s, i) => safeDiv(s, gmvM[i])),
        { ratio: { num: totalSpendM, den: gmvM } }),
      buildRow("Margem Bruta", NULL_M),
      buildRow("LTV Final", NULL_M),

      // === Base & Retenção ===
      buildRow("Clientes ativos", NULL_M),
      buildRow("MRR base", mrrBaseM, { avg: true }),
      buildRow("Receita bruta", receitaBrutaM),
      buildRow("Risco de churn", NULL_M),
      buildRow("Pedido de churn", NULL_M),
      buildRow("Logo Churn", NULL_M),
      buildRow("% Logo Churn", NULL_M),
      buildRow("Revenue Churn", NULL_M),
      buildRow("% Revenue Churn", NULL_M),
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
      buildRow("ROAS LTV", NULL_M),
      buildRow("LTV/CAC", NULL_M),
      buildRow("CAC Payback", NULL_M),
      buildRow("CAC Payback (MRR)", NULL_M),
      buildRow("ROI",
        gmvM.map((g, i) => {
          const r = safeDiv(g, totalSpendM[i]);
          return r === null ? null : r - 1;
        }),
        { ratio: { num: gmvM.map((g, i) => g - totalSpendM[i]), den: totalSpendM } }),
      buildRow("ROI LTV", NULL_M),
      buildRow("ROI LTV Final", NULL_M),
      buildRow("ROI Pedro", NULL_M),
      buildRow("ROI Pedro LTV", NULL_M),
    ];

    return rows;
  }, [
    funnel.data,
    metaQueries.map((q) => q.dataUpdatedAt).join(","),
    googleQueries.map((q) => q.dataUpdatedAt).join(","),
    modelo.isLoading, o2tax.isLoading, franquia.isLoading, oxyHacker.isLoading,
    getMrrBaseForMonth,
    oxy.cashflowByMonth,
    hr.headcountTotal,
  ]);

  return {
    rows,
    isLoading,
    lastUpdate: new Date().toISOString().slice(0, 10),
  };
}
