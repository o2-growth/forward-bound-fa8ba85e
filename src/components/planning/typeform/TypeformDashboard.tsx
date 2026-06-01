import { useMemo, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { KpiBig } from "./KpiBig";
import { SdrBarChart } from "./SdrBarChart";
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
  useDiagByCaminho,
  useDiagByUf,
  useDiagBySource,
  useDiagLeadsFull,
  type DiagLeadFull,
} from "./useTypeformData";
import {
  buildBreakdown,
  eqNorm,
  inWindow,
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

export function TypeformDashboard() {
  const kpis = useDiagKpis();
  const temporal = useDiagTemporal();
  const sdr = useDiagBySdr();
  const faturamento = useDiagByFaturamento();
  const setor = useDiagBySetor();
  const uf = useDiagByUf();
  const source = useDiagBySource();
  const caminho = useDiagByCaminho();
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
        .slice()
        .sort((a, b) => (b.total ?? 0) - (a.total ?? 0)),
    [faturamento.data]
  );
  const sourceSorted = useMemo(
    () =>
      (source.data ?? [])
        .slice()
        .sort((a, b) => (b.mqls ?? 0) - (a.mqls ?? 0)),
    [source.data]
  );
  const ufSorted = useMemo(
    () => (uf.data ?? []).slice().sort((a, b) => (b.mqls ?? 0) - (a.mqls ?? 0)),
    [uf.data]
  );

  const anyError =
    kpis.error ||
    sdr.error ||
    faturamento.error ||
    setor.error ||
    pipeline.error ||
    velocidade.error ||
    temporal.error ||
    caminho.error ||
    uf.error ||
    source.error ||
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
        buildBreakdown(filtered, "faturamento", "Por faturamento"),
        buildBreakdown(filtered, "setor", "Por setor"),
      ],
    });
  };

  const openSdr = (row: any) => {
    if (!row) return;
    const filtered = allLeads.filter((l) => eqNorm(l.sdr_nome, row.sdr_nome));
    openDrawer({
      title: row.sdr_nome,
      description: "Performance do SDR (MQLs)",
      fields: [
        { label: "MQLs", value: fmtInt(row.mqls) },
        { label: "Completos", value: fmtInt(row.completos) },
        { label: "Agendados", value: fmtInt(row.agendados) },
        { label: "Conversão", value: fmtPct(row.conv_pct) },
      ],
      leads: filtered,
      breakdowns: [
        buildBreakdown(filtered, "faturamento", "Por faturamento"),
        buildBreakdown(filtered, "setor", "Por setor"),
        buildBreakdown(filtered, "caminho", "Por caminho"),
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
        buildBreakdown(filtered, "faturamento", "Por faturamento"),
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
        buildBreakdown(filtered, "faturamento", "Por faturamento"),
        buildBreakdown(filtered, "uf", "Por UF"),
      ],
    });
  };

  const openCaminho = (row: any) => {
    const filtered = allLeads.filter((l) => eqNorm(l.caminho, row.caminho));
    openDrawer({
      title: `Caminho ${row.caminho}`,
      fields: [
        { label: "Total", value: fmtInt(row.total) },
        { label: "MQLs", value: fmtInt(row.mqls) },
        { label: "Completos", value: fmtInt(row.completos) },
        { label: "Agendados", value: fmtInt(row.agendados) },
        { label: "% Agenda", value: fmtPct(row.taxa_agenda_pct) },
      ],
      leads: filtered,
      breakdowns: [
        buildBreakdown(filtered, "sdr_nome", "Por SDR"),
        buildBreakdown(filtered, "faturamento", "Por faturamento"),
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

  const openSource = (row: any) => {
    const filtered = allLeads.filter((l) => eqNorm(l.source, row.source));
    openDrawer({
      title: row.source || "(sem source)",
      fields: [
        { label: "MQLs", value: fmtInt(row.mqls) },
        { label: "Agendados", value: fmtInt(row.agendados) },
        { label: "Conversão", value: fmtPct(row.conv_pct) },
      ],
      leads: filtered,
      breakdowns: [
        buildBreakdown(filtered, "caminho", "Por caminho"),
        buildBreakdown(filtered, "faturamento", "Por faturamento"),
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
        buildBreakdown(filtered, "faturamento", "Por faturamento"),
        buildBreakdown(filtered, "setor", "Por setor"),
      ],
    });
  };


  return (
    <div className="space-y-6">
      {anyError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Falha ao carregar dados do Typeform: {(anyError as Error)?.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Linha 0 — Janela temporal */}
      <TemporalKpisRow data={temporal.data} loading={temporal.isLoading} onSelect={openTemporal} />

      {/* Linha 1 — KPIs principais (clicáveis) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiBig
          label="Leads únicos"
          value={fmtInt(kpi?.total_leads)}
          loading={kpis.isLoading}
          onClick={() => openMainKpi("leads")}
        />
        <KpiBig
          label="MQLs"
          value={fmtInt(kpi?.total_mqls)}
          loading={kpis.isLoading}
          onClick={() => openMainKpi("mqls")}
        />
        <KpiBig
          label="MQLs agendaram"
          value={fmtInt(kpi?.mql_agendados)}
          loading={kpis.isLoading}
          onClick={() => openMainKpi("agendados")}
        />
        <KpiBig
          label="Conv. MQL"
          value={fmtPct(kpi?.mql_taxa_agenda_pct)}
          loading={kpis.isLoading}
          onClick={() => openMainKpi("conv")}
        />
      </div>

      {/* Linha 2 — Reuniões por dia (full width) */}
      <BookingsByDayChart
        data={pipeline.data}
        loading={pipeline.isLoading}
        onBarClick={openDay}
      />

      {/* Linha 3 — SDR + (resumo agendamentos futuros) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SdrBarChart data={sdr.data} loading={sdr.isLoading} onBarClick={openSdr} />
        <FunnelTable
          title="Próximas reuniões (top 12)"
          data={(pipeline.data ?? []).filter((d) => new Date(d.booking_date) >= new Date(new Date().toDateString()))}
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
      </div>

      {/* Linha 4 — Faturamento + Setor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <FunnelTable
          title="Funil por faturamento"
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

      {/* Linha 5 — Caminho + UF */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <FunnelTable
          title="Funil por caminho (A/B/C/D)"
          data={caminho.data}
          loading={caminho.isLoading}
          onRowClick={openCaminho}
          columns={[
            { key: "caminho", label: "Caminho" },
            { key: "total", label: "Total", align: "right", render: (r) => fmtInt(r.total) },
            { key: "mqls", label: "MQLs", align: "right", render: (r) => fmtInt(r.mqls) },
            { key: "agendados", label: "Ag.", align: "right", render: (r) => fmtInt(r.agendados) },
            { key: "taxa_agenda_pct", label: "% Ag.", align: "right", render: (r) => fmtPct(r.taxa_agenda_pct) },
          ]}
        />
        <FunnelTable
          title="Funil por UF"
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
      </div>

      {/* Linha 6 — Source full-width */}
      <FunnelTable
        title="Funil por utm_source (top 15)"
        data={sourceSorted}
        loading={source.isLoading}
        maxRows={15}
        onRowClick={openSource}
        columns={[
          { key: "source", label: "Source" },
          { key: "mqls", label: "MQLs", align: "right", render: (r) => fmtInt(r.mqls) },
          { key: "agendados", label: "Agendados", align: "right", render: (r) => fmtInt(r.agendados) },
          { key: "conv_pct", label: "% Conv", align: "right", render: (r) => fmtPct(r.conv_pct) },
        ]}
      />

      {/* Linha 7 — Velocidade + cobertura */}
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
              ? `${sdrsComMqls} SDRs com MQLs / ${fmtInt(totalMqls)} MQLs`
              : undefined
          }
        />
      </div>

      <TypeformDetailDrawer
        open={drawer.open}
        onOpenChange={(o) => (o ? null : closeDrawer())}
        title={drawer.title}
        description={drawer.description}
        fields={drawer.fields}
      />
    </div>
  );
}
