import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { DetailSheet, columnFormatters } from "./DetailSheet";
import {
  useMonetizacaoAnalytics,
  MONETIZACAO_FASES_ORDER,
  type MonetizacaoCard,
} from "@/hooks/useMonetizacaoAnalytics";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(v || 0);

const TIPO_COLOR: Record<string, string> = {
  Upsell:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  "Cross-sell":
    "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "Troca de produto":
    "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  Downsell:
    "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

interface Props {
  startDate: Date;
  endDate: Date;
}

type DrillKind =
  | { kind: "fase"; value: string }
  | { kind: "tipo"; value: string }
  | { kind: "all" };

export function MonetizacaoSection({ startDate, endDate }: Props) {
  const {
    cards,
    byFase,
    byTipo,
    totals,
    toDetailItem,
    isLoading,
  } = useMonetizacaoAnalytics(startDate, endDate);

  const [drill, setDrill] = useState<DrillKind | null>(null);

  const drillCards = useMemo((): MonetizacaoCard[] => {
    if (!drill) return [];
    if (drill.kind === "all") return cards;
    if (drill.kind === "fase")
      return cards.filter((c) => (c.faseAtual || "—") === drill.value);
    return cards.filter((c) => c.tipo === drill.value);
  }, [drill, cards]);

  const drillTitle = useMemo(() => {
    if (!drill) return "";
    if (drill.kind === "all") return "💎 Monetização — Todos os cards";
    if (drill.kind === "fase") return `💎 Monetização — Fase: ${drill.value}`;
    return `💎 Monetização — Tipo: ${drill.value}`;
  }, [drill]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          💎 Funil de Monetização
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Info className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs">
                <p className="font-semibold mb-1">Origem dos dados</p>
                <p>
                  Pipe <span className="font-mono">Monetização</span> (tabela{" "}
                  <span className="font-mono">pipefy_moviment_contrato</span>),
                  considerando o movimento mais recente de cada card no período.
                </p>
                <p className="mt-2">
                  Tipos: Upsell, Cross-sell (Novo produto), Troca de produto,
                  Downsell.
                </p>
                <p className="mt-1 opacity-70">
                  Valor total = soma de todos os campos <span className="font-mono">valor_*</span>{" "}
                  (MRR considerado como valor mensal 1×).
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Pipe transversal — não filtrado por BU. Período aplicado à data de
          entrada do card no funil.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* KPIs topo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiBox
            label="Total de cards"
            value={totals.count.toString()}
            onClick={() => setDrill({ kind: "all" })}
            disabled={totals.count === 0}
            loading={isLoading}
          />
          <KpiBox
            label="Valor em pipeline"
            value={formatCurrency(totals.valorPipeline)}
            loading={isLoading}
          />
          <KpiBox
            label="Valor concluído"
            value={formatCurrency(totals.valorGanho)}
            loading={isLoading}
          />
          <KpiBox
            label="Ticket médio"
            value={formatCurrency(totals.ticketMedio)}
            loading={isLoading}
          />
        </div>

        {/* Quebra por tipo */}
        <div>
          <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">
            Por tipo de movimentação
          </div>
          <div className="flex flex-wrap gap-2">
            {byTipo.length === 0 && (
              <p className="text-xs text-muted-foreground italic">
                Sem cards no período.
              </p>
            )}
            {byTipo.map((t) => (
              <button
                key={t.tipo}
                onClick={() => setDrill({ kind: "tipo", value: t.tipo })}
                className="group rounded-lg border px-3 py-2 text-left hover:border-primary transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Badge
                    className={`font-normal ${
                      TIPO_COLOR[t.tipo] || "bg-slate-100 text-slate-800"
                    }`}
                  >
                    {t.tipo}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {t.count} {t.count === 1 ? "card" : "cards"}
                  </span>
                </div>
                <div className="text-sm font-semibold">
                  {formatCurrency(t.valor)}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Funil por fase — visual afunilado (barras horizontais), estilo do dashzão */}
        <div>
          <div className="text-xs font-semibold uppercase text-muted-foreground mb-3">
            Funil por fase
          </div>
          <div className="flex flex-col gap-1">
            {(() => {
              // Ordena as fases na ordem canônica do funil e filtra as vazias.
              const ordered = [...byFase]
                .filter((f) =>
                  (MONETIZACAO_FASES_ORDER as readonly string[]).includes(f.fase),
                )
                .sort(
                  (a, b) =>
                    (MONETIZACAO_FASES_ORDER as readonly string[]).indexOf(a.fase) -
                    (MONETIZACAO_FASES_ORDER as readonly string[]).indexOf(b.fase),
                );
              const maxCount = Math.max(1, ...ordered.map((f) => f.count));
              const funnelColors = [
                "from-orange-400 to-orange-500",
                "from-emerald-400 to-cyan-500",
                "from-cyan-500 to-blue-500",
                "from-blue-500 to-blue-600",
                "from-blue-600 to-indigo-500",
                "from-indigo-500 to-violet-500",
                "from-violet-500 to-slate-500",
                "from-slate-500 to-slate-600",
              ];
              return ordered.map((f, index) => {
                // Largura proporcional ao volume (mín. 32% pra legibilidade).
                const widthPercent = Math.max(
                  32,
                  Math.round((f.count / maxCount) * 100),
                );
                const color = funnelColors[index] || funnelColors[funnelColors.length - 1];
                const isLast = index === ordered.length - 1;
                return (
                  <div key={f.fase} className="relative flex items-center justify-center">
                    <button
                      onClick={() =>
                        f.count > 0 && setDrill({ kind: "fase", value: f.fase })
                      }
                      disabled={f.count === 0}
                      style={{ width: `${widthPercent}%` }}
                      className={`relative h-12 min-w-[200px] rounded-sm bg-gradient-to-r ${color}
                        flex items-center justify-between gap-2 px-4 text-white transition-all duration-300
                        hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed
                        ${isLast ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="bg-white/20 rounded-full w-6 h-6 flex-shrink-0 flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </span>
                        <span className="text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                          {f.fase}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2 flex-shrink-0">
                        <span className="text-base font-bold">{f.count}</span>
                        <span className="text-[11px] font-medium text-white/80 hidden sm:inline">
                          {formatCurrency(f.valor)}
                        </span>
                      </div>
                    </button>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </CardContent>

      <DetailSheet
        open={drill !== null}
        onOpenChange={(o) => !o && setDrill(null)}
        title={drillTitle}
        items={drillCards.map(toDetailItem)}
        columns={[
          { key: "name", label: "Empresa" },
          { key: "product", label: "Tipo", format: columnFormatters.product },
          { key: "phase", label: "Fase Atual", format: columnFormatters.phase },
          { key: "responsible", label: "Responsável" },
          { key: "total", label: "Valor total", format: columnFormatters.currency },
          { key: "reason", label: "Motivo perda", format: columnFormatters.reason },
          { key: "date", label: "Entrada", format: columnFormatters.date },
        ]}
      />
    </Card>
  );
}

interface KpiBoxProps {
  label: string;
  value: string;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
}
function KpiBox({ label, value, onClick, disabled, loading }: KpiBoxProps) {
  const clickable = !!onClick && !disabled;
  return (
    <button
      type="button"
      onClick={clickable ? onClick : undefined}
      disabled={!clickable}
      className={`rounded-lg border p-3 text-left transition-colors ${
        clickable ? "hover:border-primary cursor-pointer" : "cursor-default"
      } disabled:opacity-100`}
    >
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="text-xl font-bold mt-1">
        {loading ? <span className="opacity-50">…</span> : value}
      </div>
    </button>
  );
}
