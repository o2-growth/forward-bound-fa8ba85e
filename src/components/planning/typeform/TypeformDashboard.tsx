import { useMemo, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Activity, CalendarClock, Gauge } from "lucide-react";
import { KpiBig } from "./KpiBig";
import { BookingsByDayChart } from "./BookingsByDayChart";
import { FunnelTable } from "./FunnelTable";
import { TemporalKpisRow } from "./TemporalKpisRow";
import { TypeformDetailDrawer, type DetailField } from "./TypeformDetailDrawer";
import {
  useDiagKpis,
  useDiagBySdr,
  useDiagByFaturamento,
  useDiagBySetor,
  useDiagPipeline,
  useDiagVelocidade,
  useDiagTemporal,
  useDiagByUf,
  useDiagLeadsFull,
  type DiagLeadFull,
} from "./useTypeformData";
import {
  buildBreakdown,
  eqNorm,
  inWindow,
  isExcludedFaturamento,
  type BreakdownBlock,
  type TemporalWindow,
} from "./leadsFilters";

const fmtInt = (v: number | undefined | null) =>
  v == null ? "—" : new Intl.NumberFormat("pt-BR").format(v);
const fmtPct = (v: number | undefined | null) =>
  v == null ? "—" : `${Number(v).toFixed(1)}%`;

interface DrawerState {
  open: boolean;
  title: string;
  description?: string;
  fields: DetailField[];
  breakdowns?: BreakdownBlock[];
  leads?: DiagLeadFull[];
}

// Predicate reused on every "Por faturamento" breakdown so excluded faixas
// (Ainda não fatura, < 100k, 100-200k, sem dado) never appear in the drawers either.
const keepFaturamento = (raw: any) => !isExcludedFaturamento(raw);

export function TypeformDashboard() {
  const kpis = useDiagKpis();
  const temporal = useDiagTemporal();
  const sdr = useDiagBySdr();
  const faturamento = useDiagByFaturamento();
  const setor = useDiagBySetor();
  const uf = useDiagByUf();
  const pipeline = useDiagPipeline();
  const velocidade = useDiagVelocidade();
  const leadsFull = useDiagLeadsFull();

  const [drawer, setDrawer] = useState<DrawerState>({ open: false, title: "", fields: [] });
  const openDrawer = (s: Omit<DrawerState, "open">) => setDrawer({ open: true, ...s });
  const closeDrawer = () => setDrawer((d) => ({ ...d, open: false }));

  const allLeads = leadsFull.data ?? [];
  const leadsLoading = leadsFull.isLoading;

  const kpi = kpis.data?.[0];
  const vel = velocidade.data?.[0];

  const sdrsComMqls = (sdr.data ?? []).filter((s) => (s.mqls ?? 0) > 0).length;
  const totalMqls = kpi?.total_mqls ?? 0;
  const cobertura =
    totalMqls > 0 ? ((sdrsComMqls / totalMqls) * 100).toFixed(1) + "%" : "—";

  const pctSub10 =
    vel && vel.total_bookings > 0 ? (vel.sub_10min / vel.total_bookings) * 100 : null;
  const pctSub1h =
    vel && vel.total_bookings > 0 ? (vel.sub_1h / vel.total_bookings) * 100 : null;

  const faturamentoSorted = useMemo(
    () =>
      (faturamento.data ?? [])
        .filter((r) => !isExcludedFaturamento(r.faturamento))
        .slice()
        .sort((a, b) => (b.total ?? 0) - (a.total ?? 0)),
    [faturamento.data]
  );

  const ufSorted = useMemo(
    () => (uf.data ?? []).slice().sort((a, b) => (b.mqls ?? 0) - (a.mqls ?? 0)),
    [uf.data]
  );

  // Reuniões geradas pelo Typeform por dia (created_at) — últimos 15 dias
  const generatedByDay = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days: { booking_date: string; reunioes: number }[] = [];
    const counts = new Map<string, number>();
    for (const l of allLeads) {
      if (!l.agendado || !l.created_at) continue;
      const key = l.created_at.slice(0, 10);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    for (let i = 14; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({ booking_date: key, reunioes: counts.get(key) ?? 0 });
    }
    return days;
  }, [allLeads]);

  const openGeneratedDay = (row: any) => {
    if (!row) return;
    const dayKey = row.booking_date?.slice(0, 10);
    const dt = new Date(row.booking_date);
    const filtered = allLeads.filter(
      (l) => l.agendado && (l.created_at ?? "").slice(0, 10) === dayKey
    );
    openDrawer({
      title: dt.toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      }),
      description: "Reuniões geradas pelo Typeform neste dia",
      fields: [{ label: "Reuniões geradas", value: fmtInt(row.reunioes) }],
      leads: filtered,
      breakdowns: [
        buildBreakdown(filtered, "sdr_nome", "Por SDR"),
        buildBreakdown(filtered, "faturamento", "Por faturamento", 5, keepFaturamento),
      ],
    });
  };

  const anyError =
    kpis.error ||
    sdr.error ||
    faturamento.error ||
    setor.error ||
    pipeline.error ||
    velocidade.error ||
    temporal.error ||
    uf.error ||
    leadsFull.error;

  // ---- Click handlers ----
  const openMainKpi = (which: "leads" | "mqls" | "agendados" | "conv") => {
    if (!kpi) return;
    const titleMap = {
      leads: "Leads únicos",
      mqls: "MQLs",
      agendados: "MQLs agendados",
      conv: "Conversão MQL",
    };
    const filtered =
      which === "leads"
        ? allLeads
        : which === "mqls"
        ? allLeads.filter((l) => l.is_mql)
        : which === "agendados"
        ? allLeads.filter((l) => l.is_mql && l.agendado)
        : allLeads.filter((l) => l.is_mql);
    const fields: DetailField[] = [
      { label: "Total leads", value: fmtInt(kpi.total_leads) },
      { label: "Total MQLs", value: fmtInt(kpi.total_mqls) },
      { label: "Completos", value: fmtInt(kpi.completos) },
      { label: "Agendados", value: fmtInt(kpi.agendados) },
      { label: "MQL completos", value: fmtInt(kpi.mql_completos) },
      { label: "MQL agendados", value: fmtInt(kpi.mql_agendados) },
      { label: "% Completo", value: fmtPct(kpi.taxa_completo_pct) },
      { label: "% Agenda", value: fmtPct(kpi.taxa_agenda_pct) },
      { label: "% MQL Compl.", value: fmtPct(kpi.mql_taxa_completo_pct) },
      { label: "% MQL Ag.", value: fmtPct(kpi.mql_taxa_agenda_pct) },
      { label: "Compl. → Ag.", value: fmtPct(kpi.mql_completo_to_agenda_pct) },
    ];
    openDrawer({
      title: titleMap[which],
      description: "KPIs gerais do diagnóstico",
      fields,
      leads: filtered,
      breakdowns: [
        buildBreakdown(filtered, "sdr_nome", "Por SDR"),
        buildBreakdown(filtered, "faturamento", "Por faturamento", 5, keepFaturamento),
        buildBreakdown(filtered, "setor", "Por setor"),
      ],
    });
  };

  const openDay = (row: any) => {
    if (!row) return;
    const dt = new Date(row.booking_date);
    const dayKey = row.booking_date?.slice(0, 10);
    const filtered = allLeads.filter((l) => (l.booking_date ?? "").slice(0, 10) === dayKey);
    openDrawer({
      title: dt.toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      }),
      description: "Reuniões agendadas neste dia",
      fields: [{ label: "Reuniões", value: fmtInt(row.reunioes) }],
      leads: filtered,
      breakdowns: [
        buildBreakdown(filtered, "sdr_nome", "Por SDR"),
        buildBreakdown(filtered, "faturamento", "Por faturamento", 5, keepFaturamento),
      ],
    });
  };

  const openFaturamento = (row: any) => {
    const filtered = allLeads.filter((l) => eqNorm(l.faturamento, row.faturamento));
    openDrawer({
      title: row.faturamento,
      description: row.is_mql ? "Faixa MQL" : "Faixa não-MQL",
      fields: [
        { label: "Total", value: fmtInt(row.total) },
        { label: "Completos", value: fmtInt(row.completos) },
        { label: "Agendados", value: fmtInt(row.agendados) },
        { label: "% Completo", value: fmtPct(row.taxa_completo_pct) },
        { label: "% Agenda", value: fmtPct(row.taxa_agenda_pct) },
      ],
      leads: filtered,
      breakdowns: [
        buildBreakdown(filtered, "sdr_nome", "Por SDR"),
        buildBreakdown(filtered, "setor", "Por setor"),
        buildBreakdown(filtered, "uf", "Por UF"),
      ],
    });
  };

  const openSetor = (row: any) => {
    const filtered = allLeads.filter((l) => eqNorm(l.setor, row.setor));
    openDrawer({
      title: row.setor,
      fields: [
        { label: "MQLs", value: fmtInt(row.mqls) },
        { label: "Agendados", value: fmtInt(row.agendados) },
        { label: "Conversão", value: fmtPct(row.conv_pct) },
      ],
      leads: filtered,
      breakdowns: [
        buildBreakdown(filtered, "sdr_nome", "Por SDR"),
        buildBreakdown(filtered, "faturamento", "Por faturamento", 5, keepFaturamento),
        buildBreakdown(filtered, "uf", "Por UF"),
      ],
    });
  };

  const openUf = (row: any) => {
    const filtered = allLeads.filter((l) => eqNorm(l.uf, row.uf));
    openDrawer({
      title: row.uf,
      fields: [
        { label: "MQLs", value: fmtInt(row.mqls) },
        { label: "Agendados", value: fmtInt(row.agendados) },
        { label: "Conversão", value: fmtPct(row.conv_pct) },
      ],
      leads: filtered,
      breakdowns: [
        buildBreakdown(filtered, "sdr_nome", "Por SDR"),
        buildBreakdown(filtered, "setor", "Por setor"),
      ],
    });
  };

  const openTemporal = (row: any) => {
    const win = row.janela as TemporalWindow;
    const filtered = allLeads.filter((l) => inWindow(l.created_at, win));
    openDrawer({
      title: `Janela: ${row.janela}`,
      fields: [
        { label: "Total", value: fmtInt(row.total) },
        { label: "MQLs", value: fmtInt(row.mqls) },
        { label: "Completos", value: fmtInt(row.completos) },
        { label: "Agendados", value: fmtInt(row.agendados) },
        { label: "MQL agendados", value: fmtInt(row.mql_agendados) },
        { label: "% Conv MQL", value: fmtPct(row.mql_conv_pct) },
      ],
      leads: filtered,
      breakdowns: [
        buildBreakdown(filtered, "sdr_nome", "Por SDR"),
        buildBreakdown(filtered, "faturamento", "Por faturamento", 5, keepFaturamento),
        buildBreakdown(filtered, "setor", "Por setor"),
      ],
    });
  };

  const totalLeads = kpi?.total_leads ?? 0;

  return (
    <div className="space-y-6">
      {/* Header da aba */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Diagnóstico O2 TAX · Typeform
          </h2>
          <p className="text-sm text-muted-foreground">
            Funil de leads do formulário público — clique em qualquer card ou linha para abrir o detalhamento.
          </p>
        </div>
        {!kpis.isLoading && kpi && (
          <div className="text-xs text-muted-foreground bg-muted/40 border border-border/60 rounded-md px-3 py-2 tabular-nums">
            <span className="font-semibold text-foreground">{fmtInt(totalLeads)}</span> leads ·{" "}
            <span className="font-semibold text-foreground">{fmtInt(kpi.total_mqls)}</span> MQLs ·{" "}
            <span className="font-semibold text-foreground">{fmtInt(kpi.mql_agendados)}</span> agendados
          </div>
        )}
      </div>

      {anyError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Falha ao carregar dados do Typeform: {(anyError as Error)?.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Janela temporal — segmented control */}
      <TemporalKpisRow data={temporal.data} loading={temporal.isLoading} onSelect={openTemporal} />

      {/* KPIs principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiBig
          label="Leads únicos"
          value={fmtInt(kpi?.total_leads)}
          loading={kpis.isLoading}
          onClick={() => openMainKpi("leads")}
          hint={kpi ? `${fmtPct(kpi.taxa_completo_pct)} completos` : undefined}
        />
        <KpiBig
          label="MQLs"
          value={fmtInt(kpi?.total_mqls)}
          loading={kpis.isLoading}
          onClick={() => openMainKpi("mqls")}
          hint={kpi && totalLeads > 0 ? `${fmtPct((kpi.total_mqls / totalLeads) * 100)} dos leads` : undefined}
        />
        <KpiBig
          label="MQLs agendaram"
          value={fmtInt(kpi?.mql_agendados)}
          loading={kpis.isLoading}
          onClick={() => openMainKpi("agendados")}
          hint={kpi ? `${fmtInt(kpi.agendados)} agendamentos totais` : undefined}
        />
        <KpiBig
          label="Conv. MQL"
          value={fmtPct(kpi?.mql_taxa_agenda_pct)}
          loading={kpis.isLoading}
          onClick={() => openMainKpi("conv")}
          hint={kpi ? `${fmtPct(kpi.mql_completo_to_agenda_pct)} compl → ag.` : undefined}
        />
      </div>

      {/* Reuniões por dia (full width) */}
      <BookingsByDayChart
        data={pipeline.data}
        loading={pipeline.isLoading}
        onBarClick={openDay}
      />

      {/* Próximas reuniões */}
      <FunnelTable
        title="Próximas reuniões"
        description="Top 12 próximos dias com agendamentos confirmados"
        data={(pipeline.data ?? []).filter(
          (d) => new Date(d.booking_date) >= new Date(new Date().toDateString())
        )}
        loading={pipeline.isLoading}
        maxRows={12}
        onRowClick={openDay}
        columns={[
          {
            key: "booking_date",
            label: "Data",
            render: (r) =>
              new Date(r.booking_date).toLocaleDateString("pt-BR", {
                weekday: "short",
                day: "2-digit",
                month: "2-digit",
              }),
          },
          { key: "reunioes", label: "Reuniões", align: "right", render: (r) => fmtInt(r.reunioes) },
        ]}
      />

      {/* Faturamento + Setor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <FunnelTable
          title="Funil por faturamento"
          description="Faixas qualificadas (≥ R$ 200 mil)"
          data={faturamentoSorted}
          loading={faturamento.isLoading}
          onRowClick={openFaturamento}
          columns={[
            { key: "faturamento", label: "Faixa" },
            { key: "total", label: "Total", align: "right", render: (r) => fmtInt(r.total) },
            { key: "completos", label: "Compl.", align: "right", render: (r) => fmtInt(r.completos) },
            { key: "agendados", label: "Ag.", align: "right", render: (r) => fmtInt(r.agendados) },
            { key: "taxa_agenda_pct", label: "% Ag.", align: "right", render: (r) => fmtPct(r.taxa_agenda_pct) },
          ]}
        />
        <FunnelTable
          title="Funil por setor"
          description="Conversão MQL → agendamento por segmento"
          data={setor.data}
          loading={setor.isLoading}
          onRowClick={openSetor}
          columns={[
            { key: "setor", label: "Setor" },
            { key: "mqls", label: "MQLs", align: "right", render: (r) => fmtInt(r.mqls) },
            { key: "agendados", label: "Ag.", align: "right", render: (r) => fmtInt(r.agendados) },
            { key: "conv_pct", label: "% Conv", align: "right", render: (r) => fmtPct(r.conv_pct) },
          ]}
        />
      </div>

      {/* UF (full width) */}
      <FunnelTable
        title="Funil por UF"
        description="Top 15 estados com mais MQLs"
        data={ufSorted}
        loading={uf.isLoading}
        maxRows={15}
        onRowClick={openUf}
        columns={[
          { key: "uf", label: "UF" },
          { key: "mqls", label: "MQLs", align: "right", render: (r) => fmtInt(r.mqls) },
          { key: "agendados", label: "Ag.", align: "right", render: (r) => fmtInt(r.agendados) },
          { key: "conv_pct", label: "% Conv", align: "right", render: (r) => fmtPct(r.conv_pct) },
        ]}
      />

      {/* Velocidade + cobertura — bloco final dentro de Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Gauge className="h-4 w-4 text-primary" />
            Velocidade & cobertura
          </CardTitle>
          <CardDescription>
            Tempo de resposta dos SDRs (do formulário ao booking) e cobertura de MQLs por SDR.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiBig
              size="sm"
              label="Velocidade mediana"
              value={vel?.mediana_min != null ? `${vel.mediana_min} min` : "—"}
              loading={velocidade.isLoading}
              hint={vel ? `${fmtInt(vel.total_bookings)} bookings` : undefined}
            />
            <KpiBig
              size="sm"
              label="% sub-10 min"
              value={fmtPct(pctSub10)}
              loading={velocidade.isLoading}
              hint={vel ? `${fmtInt(vel.sub_10min)} bookings` : undefined}
            />
            <KpiBig
              size="sm"
              label="% sub-1h"
              value={fmtPct(pctSub1h)}
              loading={velocidade.isLoading}
              hint={vel ? `${fmtInt(vel.sub_1h)} bookings` : undefined}
            />
            <KpiBig
              size="sm"
              label="Cobertura SDR"
              value={cobertura}
              loading={kpis.isLoading || sdr.isLoading}
              hint={
                sdrsComMqls > 0
                  ? `${sdrsComMqls} SDRs ativos / ${fmtInt(totalMqls)} MQLs`
                  : undefined
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Rodapé compacto com timestamp */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-2">
        <CalendarClock className="h-3 w-3" />
        Atualizado em {new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
      </div>

      <TypeformDetailDrawer
        open={drawer.open}
        onOpenChange={(o) => (o ? null : closeDrawer())}
        title={drawer.title}
        description={drawer.description}
        fields={drawer.fields}
        breakdowns={drawer.breakdowns}
        leads={drawer.leads}
        leadsLoading={leadsLoading}
      />
    </div>
  );
}
