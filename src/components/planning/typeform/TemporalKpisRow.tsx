import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";
import type { DiagTemporal } from "./useTypeformData";

const LABELS: Record<string, string> = {
  hoje: "Hoje",
  ultimos_7d: "7 dias",
  ultimos_30d: "30 dias",
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
  const rows = ordered.length > 0 ? ordered : data ?? [];

  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-3 mb-2 px-1">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
            Janela temporal
          </span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {(loading ? Array.from({ length: 4 }) : rows).map((row: any, i) => {
            const r = row as DiagTemporal | undefined;
            const clickable = !!(r && onSelect);
            return (
              <button
                key={r?.janela ?? i}
                type="button"
                disabled={!clickable}
                onClick={clickable ? () => onSelect!(r!) : undefined}
                className={cn(
                  "group flex flex-col items-start gap-1.5 rounded-md border border-border/60 bg-muted/20 px-3 py-2.5 text-left transition-all",
                  clickable &&
                    "hover:bg-muted/40 hover:border-primary/50 hover:shadow-sm cursor-pointer",
                  !clickable && "opacity-80"
                )}
              >
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {r ? LABELS[r.janela] ?? r.janela : "—"}
                </span>
                {loading ? (
                  <Skeleton className="h-6 w-20" />
                ) : (
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-bold tabular-nums text-foreground">
                      {r ? fmtInt(r.mql_agendados) : "—"}
                    </span>
                    <span className="text-[11px] text-muted-foreground">ag.</span>
                  </div>
                )}
                {r && !loading && (
                  <span className="text-[11px] text-muted-foreground/80 tabular-nums">
                    {fmtInt(r.total)} leads · {fmtPct(r.mql_conv_pct)} conv
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
