import { Clock, TrendingUp, DollarSign, Users } from "lucide-react";
import { MetricCard, fmt, fmtInt } from "@/components/planning/ceo/ceoShared";

// ── Tipos ──────────────────────────────────────────────────────────────
export interface FrenteMetricsRowProps {
  leads: number;
  pipe: number;
  faturamento: number;
  leadTimeMedio?: number; // dias
}

// ── Componente ─────────────────────────────────────────────────────────
export function FrenteMetricsRow({
  leads,
  pipe,
  faturamento,
  leadTimeMedio,
}: FrenteMetricsRowProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {/* Total Leads */}
      <MetricCard
        label="Leads Captados"
        value={fmtInt(leads)}
        icon={<Users className="h-4 w-4" />}
        tone="default"
      />

      {/* Pipe Ativo */}
      <MetricCard
        label="Pipe Ativo"
        value={fmt(pipe)}
        icon={<TrendingUp className="h-4 w-4" />}
        tone={pipe > 0 ? "success" : "default"}
      />

      {/* Faturamento */}
      <MetricCard
        label="Faturamento"
        value={fmt(faturamento)}
        icon={<DollarSign className="h-4 w-4" />}
        tone={faturamento > 0 ? "success" : "default"}
      />

      {/* Lead Time */}
      <MetricCard
        label="Lead Time Médio"
        value={leadTimeMedio !== undefined ? `${leadTimeMedio}d` : "—"}
        sublabel="dias no pipeline"
        icon={<Clock className="h-4 w-4" />}
        tone="default"
      />
    </div>
  );
}
