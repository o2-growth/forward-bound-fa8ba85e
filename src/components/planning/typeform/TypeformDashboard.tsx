import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { KpiBig } from "./KpiBig";
import { SdrBarChart } from "./SdrBarChart";
import { PipelineTimeline } from "./PipelineTimeline";
import { FunnelTable } from "./FunnelTable";
import {
  useDiagKpis,
  useDiagBySdr,
  useDiagByFaturamento,
  useDiagBySetor,
  useDiagPipeline,
  useDiagVelocidade,
} from "./useTypeformData";

const fmtInt = (v: number | undefined | null) =>
  v == null ? "—" : new Intl.NumberFormat("pt-BR").format(v);
const fmtPct = (v: number | undefined | null) =>
  v == null ? "—" : `${Number(v).toFixed(1)}%`;

export function TypeformDashboard() {
  const kpis = useDiagKpis();
  const sdr = useDiagBySdr();
  const faturamento = useDiagByFaturamento();
  const setor = useDiagBySetor();
  const pipeline = useDiagPipeline();
  const velocidade = useDiagVelocidade();

  const kpi = kpis.data?.[0];
  const vel = velocidade.data?.[0];

  const sdrsComMqls = (sdr.data ?? []).filter((s) => (s.mqls ?? 0) > 0).length;
  const totalMqls = kpi?.total_mqls ?? 0;
  const cobertura =
    totalMqls > 0 ? ((sdrsComMqls / totalMqls) * 100).toFixed(1) + "%" : "—";

  const anyError =
    kpis.error || sdr.error || faturamento.error || setor.error || pipeline.error || velocidade.error;

  const faturamentoSorted = (faturamento.data ?? [])
    .slice()
    .sort((a, b) => (b.total ?? 0) - (a.total ?? 0));

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

      {/* Linha 1 — KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiBig label="Leads únicos" value={fmtInt(kpi?.total_leads)} loading={kpis.isLoading} />
        <KpiBig label="MQLs" value={fmtInt(kpi?.total_mqls)} loading={kpis.isLoading} />
        <KpiBig label="MQLs agendaram" value={fmtInt(kpi?.mql_agendados)} loading={kpis.isLoading} />
        <KpiBig
          label="Conv. MQL"
          value={fmtPct(kpi?.mql_taxa_agenda_pct)}
          loading={kpis.isLoading}
        />
      </div>

      {/* Linha 2 — Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SdrBarChart data={sdr.data} loading={sdr.isLoading} />
        <PipelineTimeline data={pipeline.data} loading={pipeline.isLoading} />
      </div>

      {/* Linha 3 — Tabelas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <FunnelTable
          title="Funil por faturamento"
          data={faturamentoSorted}
          loading={faturamento.isLoading}
          columns={[
            { key: "faturamento", label: "Faixa" },
            { key: "total", label: "Total", align: "right", render: (r) => fmtInt(r.total) },
            { key: "completos", label: "Completos", align: "right", render: (r) => fmtInt(r.completos) },
            { key: "agendados", label: "Agendados", align: "right", render: (r) => fmtInt(r.agendados) },
            { key: "taxa_completo_pct", label: "% Compl.", align: "right", render: (r) => fmtPct(r.taxa_completo_pct) },
            { key: "taxa_agenda_pct", label: "% Agenda", align: "right", render: (r) => fmtPct(r.taxa_agenda_pct) },
          ]}
        />
        <FunnelTable
          title="Funil por setor"
          data={setor.data}
          loading={setor.isLoading}
          columns={[
            { key: "setor", label: "Setor" },
            { key: "mqls", label: "MQLs", align: "right", render: (r) => fmtInt(r.mqls) },
            { key: "agendados", label: "Agendados", align: "right", render: (r) => fmtInt(r.agendados) },
            { key: "conv_pct", label: "% Conv", align: "right", render: (r) => fmtPct(r.conv_pct) },
          ]}
        />
      </div>

      {/* Linha 4 — Cards finais */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <KpiBig
          label="Velocidade mediana"
          value={vel?.mediana_min != null ? `${vel.mediana_min} min` : "—"}
          loading={velocidade.isLoading}
          hint={
            vel
              ? `${fmtInt(vel.sub_10min)} sub-10min · ${fmtInt(vel.sub_1h)} sub-1h · ${fmtInt(vel.total_bookings)} bookings`
              : undefined
          }
        />
        <KpiBig
          label="Cobertura SDR"
          value={cobertura}
          loading={kpis.isLoading || sdr.isLoading}
          hint={
            sdrsComMqls > 0 ? `${sdrsComMqls} SDRs com MQLs / ${fmtInt(totalMqls)} MQLs` : undefined
          }
        />
      </div>
    </div>
  );
}
