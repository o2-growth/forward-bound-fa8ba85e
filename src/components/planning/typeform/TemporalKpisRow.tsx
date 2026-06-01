import { KpiBig } from "./KpiBig";
import type { DiagTemporal } from "./useTypeformData";

const LABELS: Record<string, string> = {
  hoje: "Hoje",
  ultimos_7d: "Últimos 7 dias",
  ultimos_30d: "Últimos 30 dias",
  mais_antigo: "Mais antigo",
};

const ORDER = ["hoje", "ultimos_7d", "ultimos_30d", "mais_antigo"];

interface Props {
  data?: DiagTemporal[];
  loading?: boolean;
  onSelect?: (row: DiagTemporal) => void;
}

const fmtInt = (v: number | undefined | null) =>
  v == null ? "—" : new Intl.NumberFormat("pt-BR").format(v);
const fmtPct = (v: number | undefined | null) =>
  v == null ? "—" : `${Number(v).toFixed(1)}%`;

export function TemporalKpisRow({ data, loading, onSelect }: Props) {
  const byJanela = new Map((data ?? []).map((d) => [d.janela, d]));
  const ordered = ORDER.map((k) => byJanela.get(k)).filter(Boolean) as DiagTemporal[];
  // Fallback: se vier janelas inesperadas, mostra as recebidas
  const rows = ordered.length > 0 ? ordered : data ?? [];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {(loading ? Array.from({ length: 4 }) : rows).map((row: any, i) => {
        const r = row as DiagTemporal | undefined;
        return (
          <KpiBig
            key={r?.janela ?? i}
            size="sm"
            label={r ? LABELS[r.janela] ?? r.janela : "—"}
            value={r ? `${fmtInt(r.mql_agendados)} ag.` : "—"}
            loading={loading}
            hint={
              r
                ? `${fmtInt(r.total)} leads · ${fmtInt(r.mqls)} MQL · ${fmtPct(r.mql_conv_pct)} conv`
                : undefined
            }
            onClick={r && onSelect ? () => onSelect(r) : undefined}
          />
        );
      })}
    </div>
  );
}
