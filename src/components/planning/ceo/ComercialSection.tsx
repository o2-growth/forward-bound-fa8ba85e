import { useMemo } from "react";
import { startOfMonth, endOfMonth, subMonths, differenceInCalendarDays, getDaysInMonth } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Loader2, Flame, Thermometer, Snowflake, ShoppingCart, Gauge, History, Users } from "lucide-react";
import { useModeloAtualAnalytics } from "@/hooks/useModeloAtualAnalytics";
import { useO2TaxAnalytics } from "@/hooks/useO2TaxAnalytics";
import { useExpansaoAnalytics } from "@/hooks/useExpansaoAnalytics";
import { useOutboundAnalytics } from "@/hooks/useOutboundAnalytics";
import { useMonetizacaoAnalytics } from "@/hooks/useMonetizacaoAnalytics";
import { useFunnelRealized } from "@/hooks/useFunnelRealized";
import { useFunnelMetas } from "@/hooks/useFunnelMetas";
import { useConsolidatedMetas } from "@/hooks/useConsolidatedMetas";
import { useModeloAtualMetas } from "@/hooks/useModeloAtualMetas";
import { useExpansaoMetas } from "@/hooks/useExpansaoMetas";
import { useOxyHackerMetas } from "@/hooks/useOxyHackerMetas";
import { aggregateByTemperatura, type Temperatura } from "@/components/planning/indicators/temperaturaAggregator";
import { computeFaturamentoRealizado, type BuType } from "@/lib/faturamentoAggregator";
import { fmt, fmtFull, fmtPct, fmtInt, MetricCard, AiNote, type MetricSource } from "./ceoShared";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const ALL_BUS = ["modelo_atual", "o2_tax", "oxy_hacker", "franquia"] as const;
const FUNNEL_STAGES: { real: "leads" | "mql" | "rm" | "rr" | "proposta" | "venda"; meta: keyof FunnelMetaRow; label: string }[] = [
  { real: "leads", meta: "leads", label: "Leads" },
  { real: "mql", meta: "mqls", label: "MQLs" },
  { real: "rm", meta: "rms", label: "Reuniões agendadas" },
  { real: "rr", meta: "rrs", label: "Reuniões realizadas" },
  { real: "proposta", meta: "propostas", label: "Propostas" },
  { real: "venda", meta: "vendas", label: "Vendas" },
];
interface FunnelMetaRow { leads: number; mqls: number; rms: number; rrs: number; propostas: number; vendas: number }

interface Props {
  dateRange: { from: Date; to: Date };
}

// Fonte (para o "i") — comum aos cards comerciais
const SRC_PIPE: MetricSource = {
  origem: "Pipefy — deals abertos por BU (Modelo Atual, O2 Tax, Franquia, Oxy Hacker, Outbound)",
  periodo: "Deals em negociação com entrada no período",
  calculo: "Soma do valor dos deals abertos, classificados por temperatura (Quente/Morno/Frio).",
};
const SRC_FUNNEL: MetricSource = {
  origem: "Funil realizado (tabela funnel_realized) vs metas (funnel_metas)",
  periodo: "Filtra pelo período selecionado",
  calculo: "Realizado por etapa ÷ meta por etapa; conversão = etapa ÷ etapa anterior.",
};
const SRC_PACE: MetricSource = {
  origem: "Faturamento realizado (mesma fonte da aba Indicadores Comercial — Oxy Finance para Modelo Atual/Franquia/Oxy Hacker, Pipefy para O2 TAX, + Monetização) vs meta consolidada",
  periodo: "Filtra pelo período selecionado",
  calculo: "Pace = meta × (dias decorridos ÷ dias totais do período).",
};


export function ComercialSection({ dateRange }: Props) {
  const { from: startDate, to: endDate } = dateRange;

  // Analytics do período selecionado
  const modeloAtual = useModeloAtualAnalytics(startDate, endDate);
  const o2tax = useO2TaxAnalytics(startDate, endDate);
  const franquia = useExpansaoAnalytics(startDate, endDate, "Franquia");
  const oxyHacker = useExpansaoAnalytics(startDate, endDate, "Oxy Hacker");
  const outbound = useOutboundAnalytics(startDate, endDate);
  const monetizacao = useMonetizacaoAnalytics(startDate, endDate);

  // Funil realizado + metas + meta de faturamento
  const funnelRealized = useFunnelRealized(startDate, endDate);
  const funnelMetas = useFunnelMetas();
  const consolidated = useConsolidatedMetas();

  // Hooks de faturamento realizado (Oxy Finance) — mesma fonte da aba Indicadores Comercial
  const { getValueForPeriod: getModeloAtualValue } = useModeloAtualMetas(startDate, endDate);
  const { getValueForPeriod: getExpansaoValue } = useExpansaoMetas(startDate, endDate);
  const { getValueForPeriod: getOxyHackerValue } = useOxyHackerMetas(startDate, endDate);

  // Overview histórico — funil realizado em janelas distintas
  const lastMonthStart = startOfMonth(subMonths(new Date(), 1));
  const lastMonthEnd = endOfMonth(subMonths(new Date(), 1));
  const last3Start = startOfMonth(subMonths(new Date(), 3));
  const last3End = endOfMonth(subMonths(new Date(), 1));
  const mtdStart = startOfMonth(new Date());
  const fnLastMonth = useFunnelRealized(lastMonthStart, lastMonthEnd);
  const fnLast3 = useFunnelRealized(last3Start, last3End);
  const fnMtd = useFunnelRealized(mtdStart, new Date());

  // Só o bloco de pipe depende dos analytics pesados; o resto renderiza na hora.
  const pipeLoading = modeloAtual.isLoading || o2tax.isLoading || franquia.isLoading || oxyHacker.isLoading || outbound.isLoading;

  // ─── Pipe em negociação (temperatura) ───
  const pipe = useMemo(() => {
    const agg = aggregateByTemperatura({
      modeloAtualAnalytics: modeloAtual as any,
      franquiaAnalytics: franquia as any,
      oxyHackerAnalytics: oxyHacker as any,
      outboundAnalytics: outbound as any,
      monetizacaoAnalytics: monetizacao as any,
      selectedBUs: [...ALL_BUS] as any,
      startDate,
      endDate,
    });
    const sumBucket = (t: Temperatura) => agg.buckets[t].reduce((s, it) => s + (it.value || 0), 0);
    const all = [...agg.buckets.Quente, ...agg.buckets.Morno, ...agg.buckets.Frio];
    const total = all.reduce((s, it) => s + (it.value || 0), 0);

    const groupSum = (key: (it: any) => string) => {
      const m = new Map<string, { valor: number; count: number }>();
      for (const it of all) {
        const k = key(it) || "—";
        const cur = m.get(k) ?? { valor: 0, count: 0 };
        cur.valor += (it as any).value || 0;
        cur.count += 1;
        m.set(k, cur);
      }
      return Array.from(m.entries()).map(([k, v]) => ({ k, ...v })).sort((a, b) => b.valor - a.valor);
    };

    return {
      total,
      quente: sumBucket("Quente"),
      morno: sumBucket("Morno"),
      frio: sumBucket("Frio"),
      byCloser: groupSum((it) => it.closer),
      byCanal: groupSum((it) => it.fonte || it.tipoOrigem),
      byBu: groupSum((it) => it.bu),
      byProduto: groupSum((it) => it.produto || it.product),
    };
  }, [modeloAtual, franquia, oxyHacker, outbound, monetizacao, startDate, endDate]);

  // ─── Funil: realizado x meta + conversão ───
  const funil = useMemo(() => {
    const realTotals = funnelRealized.getAllTotals("all");
    // soma metas das BUs para os meses do período
    const monthsInPeriod: string[] = [];
    for (let d = startOfMonth(startDate); d <= endDate; d = startOfMonth(subMonths(d, -1))) {
      monthsInPeriod.push(MONTHS[d.getMonth()]);
    }
    const metaTotals: FunnelMetaRow = { leads: 0, mqls: 0, rms: 0, rrs: 0, propostas: 0, vendas: 0 };
    for (const bu of ALL_BUS) {
      const rows = funnelMetas.getFunnelForBU(bu) as unknown as (FunnelMetaRow & { month: string })[];
      for (const r of rows || []) {
        if (!monthsInPeriod.includes(r.month)) continue;
        metaTotals.leads += r.leads || 0;
        metaTotals.mqls += r.mqls || 0;
        metaTotals.rms += r.rms || 0;
        metaTotals.rrs += r.rrs || 0;
        metaTotals.propostas += r.propostas || 0;
        metaTotals.vendas += r.vendas || 0;
      }
    }
    const rows = FUNNEL_STAGES.map((s, i) => {
      const real = realTotals[s.real] || 0;
      const meta = metaTotals[s.meta] || 0;
      const prevReal = i > 0 ? realTotals[FUNNEL_STAGES[i - 1].real] || 0 : null;
      const conv = prevReal && prevReal > 0 ? (real / prevReal) * 100 : null;
      const atingimento = meta > 0 ? (real / meta) * 100 : null;
      return { ...s, real, meta, conv, atingimento };
    });
    return { rows };
  }, [funnelRealized, funnelMetas, startDate, endDate]);

  // ─── Previsto x realizado + pace (faturamento) ───
  // Usa a MESMA fonte da aba Indicadores Comercial (Oxy Finance para Modelo Atual/Franquia/Oxy Hacker, Pipefy para O2 TAX, + Monetização)
  const pace = useMemo(() => {
    const metaFat = consolidated.getMetaForPeriod([...ALL_BUS] as any, startDate, endDate, "faturamento" as any);
    const monetizacaoVendaItems = monetizacao.getDetailItemsForIndicator("venda") as any[];
    const realizadoFat = computeFaturamentoRealizado({
      selectedBUs: [...ALL_BUS] as BuType[],
      startDate,
      endDate,
      modeloAtualAnalytics: modeloAtual as any,
      o2TaxAnalytics: o2tax as any,
      oxyHackerAnalytics: oxyHacker as any,
      franquiaAnalytics: franquia as any,
      getModeloAtualValue: getModeloAtualValue as any,
      getOxyHackerValue: getOxyHackerValue as any,
      getExpansaoValue: getExpansaoValue as any,
      monetizacaoVendaItems,
      includeMonetizacao: true, // Consolidado, sem filtro de origem
    });
    const totalDays = Math.max(differenceInCalendarDays(endDate, startDate) + 1, 1);
    const elapsed = Math.min(Math.max(differenceInCalendarDays(new Date(), startDate) + 1, 0), totalDays);
    const expected = metaFat * (elapsed / totalDays);
    return {
      metaFat,
      realizadoFat,
      expected,
      atingimentoMeta: metaFat > 0 ? (realizadoFat / metaFat) * 100 : null,
      atingimentoPace: expected > 0 ? (realizadoFat / expected) * 100 : null,
    };
  }, [consolidated, modeloAtual, o2tax, franquia, oxyHacker, monetizacao, getModeloAtualValue, getOxyHackerValue, getExpansaoValue, startDate, endDate]);


  // ─── Overview histórico ───
  const overview = useMemo(() => {
    const proj = (() => {
      const totals = fnMtd.getAllTotals("all");
      const dim = getDaysInMonth(new Date());
      const elapsed = new Date().getDate();
      const factor = elapsed > 0 ? dim / elapsed : 1;
      const out: Record<string, number> = {};
      for (const s of FUNNEL_STAGES) out[s.real] = Math.round((totals[s.real] || 0) * factor);
      return out;
    })();
    return {
      cols: [
        { key: "lastMonth", label: "Último mês", totals: fnLastMonth.getAllTotals("all") },
        { key: "last3avg", label: "Média 3 meses", totals: Object.fromEntries(FUNNEL_STAGES.map((s) => [s.real, Math.round((fnLast3.getAllTotals("all")[s.real] || 0) / 3)])) as Record<string, number> },
        { key: "mtd", label: "Mês atual (até hoje)", totals: fnMtd.getAllTotals("all") },
        { key: "proj", label: "Projeção do mês", totals: proj },
      ],
    };
  }, [fnLastMonth, fnLast3, fnMtd]);

  return (
    <div className="space-y-6">
      {/* ── Overview histórico ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><History className="h-4 w-4 text-muted-foreground" />Overview histórico</CardTitle>
          <p className="text-xs text-muted-foreground">Volumes do funil por janela de referência — para comparar o mês corrente com o passado.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Etapa</TableHead>
                  {overview.cols.map((c) => <TableHead key={c.key} className="text-right">{c.label}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {FUNNEL_STAGES.map((s) => (
                  <TableRow key={s.real}>
                    <TableCell className="font-medium">{s.label}</TableCell>
                    {overview.cols.map((c) => <TableCell key={c.key} className="text-right tabular-nums">{fmtInt(c.totals[s.real] || 0)}</TableCell>)}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <AiNote />
        </CardContent>
      </Card>

      {/* ── Pipe de vendas (R$ + temperatura) ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><ShoppingCart className="h-4 w-4 text-muted-foreground" />Pipe de Vendas em negociação</CardTitle>
          <p className="text-xs text-muted-foreground">Volume R$ em negociação, dividido por temperatura e por closer / canal / BU / produto.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {pipeLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> Carregando pipe de vendas…
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <MetricCard label="Pipe total" value={fmt(pipe.total)} icon={<ShoppingCart className="h-5 w-5" />} large source={SRC_PIPE} />
                <MetricCard label="Quente" value={fmt(pipe.quente)} icon={<Flame className="h-5 w-5" />} tone="success" source={SRC_PIPE} />
                <MetricCard label="Morno" value={fmt(pipe.morno)} icon={<Thermometer className="h-5 w-5" />} source={SRC_PIPE} />
                <MetricCard label="Frio" value={fmt(pipe.frio)} icon={<Snowflake className="h-5 w-5" />} tone="danger" source={SRC_PIPE} />
              </div>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <PipeBreakdown title="Por closer" rows={pipe.byCloser} />
                <PipeBreakdown title="Por canal" rows={pipe.byCanal} />
                <PipeBreakdown title="Por BU" rows={pipe.byBu} />
                <PipeBreakdown title="Por produto" rows={pipe.byProduto} />
              </div>
            </>
          )}
          <AiNote />
        </CardContent>
      </Card>

      {/* ── Funil: velocímetros + conversão ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><Gauge className="h-4 w-4 text-muted-foreground" />Funil — realizado x meta e conversão</CardTitle>
          <p className="text-xs text-muted-foreground">Atingimento de cada etapa do funil (realizado ÷ meta) e taxa de conversão entre etapas.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Etapa</TableHead>
                  <TableHead className="text-right">Realizado</TableHead>
                  <TableHead className="text-right">Meta</TableHead>
                  <TableHead className="w-[180px]">Atingimento</TableHead>
                  <TableHead className="text-right">Conversão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {funil.rows.map((r) => (
                  <TableRow key={r.real}>
                    <TableCell className="font-medium">{r.label}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtInt(r.real)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{r.meta > 0 ? fmtInt(r.meta) : "—"}</TableCell>
                    <TableCell>
                      {r.atingimento != null ? (
                        <div className="flex items-center gap-2">
                          <Progress value={Math.min(r.atingimento, 100)} className="h-2" />
                          <span className="w-12 text-right text-xs tabular-nums">{fmtPct(r.atingimento)}</span>
                        </div>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{r.conv != null ? fmtPct(r.conv) : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <AiNote />
        </CardContent>
      </Card>

      {/* ── Previsto x realizado + pace ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><Users className="h-4 w-4 text-muted-foreground" />Previsto x Realizado + Pace</CardTitle>
          <p className="text-xs text-muted-foreground">Faturamento realizado vs meta do período e vs ritmo esperado até hoje (pace).</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <MetricCard label="Realizado" value={fmt(pace.realizadoFat)} large source={SRC_PACE} />
            <MetricCard label="Meta do período" value={fmt(pace.metaFat)} source={SRC_PACE} />
            <MetricCard label="Atingimento da meta" value={fmtPct(pace.atingimentoMeta)} tone={pace.atingimentoMeta != null && pace.atingimentoMeta >= 100 ? "success" : "default"} source={SRC_PACE} />
            <MetricCard label="vs Pace (esperado hoje)" value={fmtPct(pace.atingimentoPace)} sublabel={`esperado ${fmt(pace.expected)}`} tone={pace.atingimentoPace != null && pace.atingimentoPace >= 100 ? "success" : "danger"} source={SRC_PACE} />
          </div>
          <AiNote />
        </CardContent>
      </Card>
    </div>
  );
}

function PipeBreakdown({ title, rows }: { title: string; rows: { k: string; valor: number; count: number }[] }) {
  const top = rows.slice(0, 8);
  return (
    <div className="rounded-lg border border-border/60 p-3">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</div>
      {top.length === 0 ? (
        <p className="py-3 text-center text-xs text-muted-foreground">Sem pipe no período.</p>
      ) : (
        <div className="space-y-1.5">
          {top.map((r) => (
            <div key={r.k} className="flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0 truncate">{r.k}</span>
              <span className="shrink-0 tabular-nums font-medium">{fmt(r.valor)} <span className="text-[10px] text-muted-foreground">({r.count})</span></span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
