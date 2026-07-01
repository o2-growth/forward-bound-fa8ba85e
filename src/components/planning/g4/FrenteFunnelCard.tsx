import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { fmtInt, fmtPct } from "@/components/planning/ceo/ceoShared";

// ── Tipos ──────────────────────────────────────────────────────────────
export interface FunnelStep {
  phase: "leads" | "mql" | "rm" | "rr" | "proposta" | "venda";
  label: string;
  count: number;
  convRate: number; // % vs etapa anterior (0–100)
}

export interface FrenteFunnelCardProps {
  title?: string;
  funnel: FunnelStep[];
  leadTimeMedioDias?: number;
}

// ── Cores por fase ─────────────────────────────────────────────────────
const PHASE_COLORS: Record<string, string> = {
  leads:   "bg-slate-400",
  mql:     "bg-blue-400",
  rm:      "bg-indigo-400",
  rr:      "bg-violet-400",
  proposta:"bg-amber-400",
  venda:   "bg-emerald-500",
};

const PHASE_BG: Record<string, string> = {
  leads:   "bg-slate-50  dark:bg-slate-900/40",
  mql:     "bg-blue-50   dark:bg-blue-900/30",
  rm:      "bg-indigo-50 dark:bg-indigo-900/30",
  rr:      "bg-violet-50 dark:bg-violet-900/30",
  proposta:"bg-amber-50  dark:bg-amber-900/30",
  venda:   "bg-emerald-50 dark:bg-emerald-900/30",
};

// ── Componente ─────────────────────────────────────────────────────────
export function FrenteFunnelCard({
  title = "Funil Comercial",
  funnel,
  leadTimeMedioDias,
}: FrenteFunnelCardProps) {
  const maxCount = Math.max(...funnel.map((s) => s.count), 1);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base">{title}</CardTitle>
          {leadTimeMedioDias !== undefined && (
            <Badge variant="secondary" className="text-xs font-normal">
              Tempo médio: {leadTimeMedioDias}d
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        {funnel.map((step, idx) => {
          const barPct = maxCount > 0 ? (step.count / maxCount) * 100 : 0;
          const isFirst = idx === 0;

          return (
            <div key={step.phase} className={cn("rounded-md p-2.5", PHASE_BG[step.phase] ?? "bg-muted/40")}>
              {/* Row topo: label + count */}
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-medium text-foreground">{step.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold tabular-nums text-foreground">{fmtInt(step.count)}</span>
                  {!isFirst && (
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] font-normal px-1.5 py-0",
                        step.convRate >= 30
                          ? "border-emerald-300 text-emerald-700 dark:text-emerald-400"
                          : step.convRate >= 10
                          ? "border-amber-300 text-amber-700 dark:text-amber-400"
                          : "border-destructive/40 text-destructive"
                      )}
                    >
                      {fmtPct(step.convRate)}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Barra proporcional */}
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
                <div
                  className={cn("h-full rounded-full transition-all", PHASE_COLORS[step.phase] ?? "bg-primary")}
                  style={{ width: `${barPct}%` }}
                />
              </div>
            </div>
          );
        })}

        {funnel.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Sem dados de funil para o período selecionado.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
