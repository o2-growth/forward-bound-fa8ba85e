import { cn } from "@/lib/utils";
import { fmtInt } from "@/components/planning/ceo/ceoShared";

// ── Tipos ──────────────────────────────────────────────────────────────
export interface DeluxeStage {
  key: string;
  label: string;
  value: number;
  /** Descrição secundária opcional abaixo da barra */
  hint?: string;
}

export interface DeluxeChip {
  id: string; // 'all' | slug
  label: string;
}

export interface DeluxeCompareRow {
  id: string;
  label: string;
  inscritos: number;
  entraram: number;
  mao: number;
  venda: number;
}

export interface FunnelDeluxeProps {
  title: string;
  subtitle?: string;
  chips: DeluxeChip[];
  selectedChip: string;
  onChipChange: (id: string) => void;
  /** KPI row do topo — 4 cards */
  kpis: {
    inscritos: number;
    entraram: number;
    mao: number;
    venda: number;
    inscritosSub?: string;
    entraramSub?: string;
    maoSub?: string;
    vendaSub?: string;
  };
  /** Etapas do funil (topo → fundo) */
  stages: DeluxeStage[];
  /** Contexto do funil selecionado */
  contextLabel: string;
  contextSub?: string;
  /** Linhas do comparativo (rodapé) */
  compare?: DeluxeCompareRow[];
  /** Clique numa barra do funil (stage) — passa a key da etapa */
  onStageClick?: (stageKey: string) => void;
}

// ── Estilos por stage_key ─────────────────────────────────────────────
const STAGE_GRADIENT: Record<string, string> = {
  inscritos: "from-emerald-400 via-lime-400 to-emerald-500",
  diagnostico: "from-cyan-400 via-teal-400 to-cyan-500",
  entraram: "from-green-400 via-emerald-400 to-green-500",
  pico: "from-sky-400 via-cyan-400 to-sky-500",
  pitch: "from-yellow-400 via-amber-400 to-yellow-500",
  mao: "from-orange-400 via-amber-500 to-orange-500",
  venda: "from-rose-400 via-red-500 to-rose-500",
};

const STAGE_GLOW: Record<string, string> = {
  inscritos: "shadow-[0_20px_40px_-15px_rgba(74,222,128,0.55)]",
  diagnostico: "shadow-[0_20px_40px_-15px_rgba(34,211,238,0.55)]",
  entraram: "shadow-[0_20px_40px_-15px_rgba(74,222,128,0.55)]",
  pico: "shadow-[0_20px_40px_-15px_rgba(56,189,248,0.55)]",
  pitch: "shadow-[0_20px_40px_-15px_rgba(250,204,21,0.55)]",
  mao: "shadow-[0_20px_40px_-15px_rgba(251,146,60,0.55)]",
  venda: "shadow-[0_20px_40px_-15px_rgba(244,63,94,0.55)]",
};

function pct(n: number): string {
  if (!isFinite(n)) return "0,0%";
  return `${n.toFixed(1).replace(".", ",")}%`;
}

// ── KPI card ──────────────────────────────────────────────────────────
function KpiCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: number;
  sub?: string;
  accent: keyof typeof STAGE_GRADIENT;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border/60 bg-card/60 p-4 backdrop-blur">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-display text-4xl font-bold tabular-nums text-foreground">
        {fmtInt(value)}
      </div>
      {sub && (
        <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
      )}
      <div
        className={cn(
          "pointer-events-none absolute bottom-0 left-0 h-[3px] w-full bg-gradient-to-r opacity-90",
          STAGE_GRADIENT[accent],
        )}
      />
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────
export function FunnelDeluxe({
  title,
  subtitle,
  chips,
  selectedChip,
  onChipChange,
  kpis,
  stages,
  contextLabel,
  contextSub,
  compare,
  onStageClick,
}: FunnelDeluxeProps) {
  const topValue = stages[0]?.value ?? 0;
  const maxValue = Math.max(...stages.map((s) => s.value), 1);
  const convGeral =
    topValue > 0 ? ((kpis.venda / topValue) * 100) : 0;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-background via-background to-muted/30 p-6">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="font-display text-3xl font-bold text-foreground">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>

        {/* Chips de filtro */}
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => {
            const active = chip.id === selectedChip;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => onChipChange(chip.id)}
                className={cn(
                  "rounded-full border px-4 py-1.5 text-xs font-medium transition-all",
                  active
                    ? "border-emerald-400/70 bg-emerald-400/10 text-emerald-300 shadow-[0_0_20px_-4px_rgba(74,222,128,0.6)]"
                    : "border-border/60 bg-card/40 text-muted-foreground hover:border-border hover:text-foreground",
                )}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── KPI Row ────────────────────────────────────────────────── */}
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          label="Total de inscritos"
          value={kpis.inscritos}
          sub={kpis.inscritosSub}
          accent="inscritos"
        />
        <KpiCard
          label="Entraram"
          value={kpis.entraram}
          sub={
            kpis.entraramSub ??
            (kpis.inscritos > 0
              ? `${pct((kpis.entraram / kpis.inscritos) * 100)} dos inscritos`
              : undefined)
          }
          accent="entraram"
        />
        <KpiCard
          label="Levantaram a mão"
          value={kpis.mao}
          sub={
            kpis.maoSub ??
            (kpis.inscritos > 0
              ? `${pct((kpis.mao / kpis.inscritos) * 100)} dos inscritos`
              : undefined)
          }
          accent="mao"
        />
        <KpiCard
          label="Vendas fechadas"
          value={kpis.venda}
          sub={
            kpis.vendaSub ??
            (kpis.inscritos > 0
              ? `${pct(convGeral)} de conversão geral`
              : undefined)
          }
          accent="venda"
        />
      </div>

      {/* ── Funil analytics (linhas de largura constante) ─────────── */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-border/40 bg-card/30">
        <div className="flex flex-col items-start justify-between gap-2 border-b border-border/40 p-6 md:flex-row md:items-end">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Conversão do funil
            </div>
            <div className="mt-1 font-display text-2xl font-bold text-foreground">
              {contextLabel}
            </div>
            {contextSub && (
              <div className="text-xs text-muted-foreground">{contextSub}</div>
            )}
          </div>
          <div className="text-right">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Conv. inscritos → venda
            </div>
            <div className="font-display text-4xl font-bold tabular-nums text-foreground">
              {pct(convGeral).replace("%", "")}
              <span className="ml-1 text-2xl text-muted-foreground">%</span>
            </div>
          </div>
        </div>

        {stages.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Sem etapas configuradas para este item.
          </p>
        ) : (
          <div className="p-6">
            {stages.map((step, idx) => {
              const shareTop =
                topValue > 0 ? (step.value / topValue) * 100 : 0;
              const barPct = Math.max(2, shareTop);
              const prev = idx > 0 ? stages[idx - 1].value : step.value;
              const vsPrev = prev > 0 ? (step.value / prev) * 100 : 0;
              const grad =
                STAGE_GRADIENT[step.key] ?? "from-slate-500 to-slate-600";
              const isLast = idx === stages.length - 1;

              // Cor do texto da ponte conforme saúde da conversão
              const bridgeTone =
                idx === 0
                  ? "text-muted-foreground"
                  : vsPrev >= 40
                    ? "text-muted-foreground"
                    : vsPrev >= 10
                      ? "text-amber-500/90"
                      : "text-rose-400/90";
              const bridgeLabel =
                idx === 0
                  ? null
                  : vsPrev >= 40
                    ? `${pct(vsPrev)} de retenção`
                    : vsPrev >= 10
                      ? `Queda relevante (${pct(vsPrev)})`
                      : `Queda drástica (${pct(vsPrev)})`;

              return (
                <div key={step.key}>
                  <div className="flex items-center gap-4">
                    {/* Rótulo fixo */}
                    <div className="w-32 shrink-0 text-right">
                      <div className="text-[10px] font-bold uppercase tracking-tighter text-muted-foreground">
                        Stage {String(idx + 1).padStart(2, "0")}
                      </div>
                      <div className="text-sm font-semibold text-foreground">
                        {step.label}
                      </div>
                    </div>

                    {/* Trilho */}
                    <div className="relative flex h-14 flex-1 items-center overflow-hidden rounded-lg border border-border/50 bg-muted/40 px-4">
                      <div
                        className={cn(
                          "absolute inset-y-0 left-0 bg-gradient-to-r opacity-80",
                          grad,
                        )}
                        style={{ width: `${barPct}%` }}
                      />
                      <div className="relative flex w-full items-center justify-between">
                        <span className="font-display text-2xl font-bold tabular-nums text-foreground">
                          {fmtInt(step.value)}
                        </span>
                        {idx === 0 ? (
                          <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-400">
                            100% topo
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                            {pct(shareTop)} do topo · {pct(vsPrev)} vs anterior
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {step.hint && (
                    <div className="ml-[144px] mt-1 text-[11px] italic text-muted-foreground">
                      {step.hint}
                    </div>
                  )}

                  {/* Ponte de conversão para próxima etapa */}
                  {!isLast && (
                    <div className="ml-[144px] flex h-6 items-center">
                      <div className="h-full w-0.5 bg-border" />
                      <div className="ml-4 flex items-center gap-2">
                        <div className="h-px w-4 bg-border" />
                        <span className={cn("text-[11px] font-medium", bridgeTone === "text-muted-foreground" ? "text-muted-foreground" : bridgeTone)}>
                          {bridgeLabel}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>


      {/* ── Comparativo ────────────────────────────────────────────── */}
      {compare && compare.length > 0 && (
        <div className="mt-6">
          <div className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Comparativo entre itens
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {compare.map((row) => {
              const conv =
                row.inscritos > 0 ? (row.venda / row.inscritos) * 100 : 0;
              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => onChipChange(row.id)}
                  className={cn(
                    "group flex flex-col gap-2 rounded-xl border border-border/50 bg-card/40 p-3 text-left transition-all hover:border-emerald-400/50 hover:bg-card/70",
                    selectedChip === row.id && "border-emerald-400/70 bg-card/70",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">
                      {row.label}
                    </span>
                    <span className="text-xs font-bold tabular-nums text-emerald-400">
                      {pct(conv)}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {[
                      { v: row.inscritos, l: "Insc." },
                      { v: row.entraram, l: "Entr." },
                      { v: row.mao, l: "Mão" },
                      { v: row.venda, l: "Venda" },
                    ].map((c) => (
                      <div
                        key={c.l}
                        className="rounded-md bg-background/40 px-1.5 py-1 text-center"
                      >
                        <div
                          className={cn(
                            "text-sm font-bold tabular-nums",
                            c.l === "Venda"
                              ? "text-emerald-400"
                              : "text-foreground",
                          )}
                        >
                          {fmtInt(c.v)}
                        </div>
                        <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
                          {c.l}
                        </div>
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
