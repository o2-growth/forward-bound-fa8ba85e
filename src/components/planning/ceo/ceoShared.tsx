// Fundação compartilhada dos blocos da Visão do CEO.
// Formatadores, card de métrica com "i" de fonte, slot de nota de IA e
// placeholder "aguardando fonte de dados".
import { ReactNode, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Info, Sparkles, DatabaseZap, Loader2 } from "lucide-react";

// ─── Formatadores ──────────────────────────────────────
export function fmt(value: number | null | undefined, prefix = "R$ "): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  if (Math.abs(value) >= 1_000_000) return `${prefix}${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${prefix}${(value / 1_000).toFixed(1)}k`;
  return `${prefix}${value.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
}
export function fmtFull(value: number | null | undefined, prefix = "R$ "): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${prefix}${value.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
}
export function fmtPct(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${value.toFixed(1)}%`;
}
export function fmtX(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${value.toFixed(2)}x`;
}
export function fmtInt(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toLocaleString("pt-BR");
}

export const MONTHS_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

// Soma os valores de um Record<mês, número> (ano corrente) dentro do período.
// Itera mês a mês para suportar períodos cross-year (ex: Nov→Jan) que quebravam
// o loop anterior (from.getMonth() > to.getMonth() → loop nunca executava → retornava 0).
// NOTE: rec é indexado apenas por nome do mês (sem ano). Períodos cross-year somam
// os meses do período mas usam os mesmos nomes de mês para anos distintos — limitação
// aceitável enquanto os dados forem de um único ano fiscal.
// TODO: mudar rec para Record<year, Record<month, number>> para suporte multi-year real.
export function sumMonths(rec: Record<string, number> | undefined | null, from: Date, to: Date): number {
  if (!rec) return 0;
  let t = 0;
  const d = new Date(from.getFullYear(), from.getMonth(), 1);
  const end = new Date(to.getFullYear(), to.getMonth(), 1);
  let iterations = 0;
  while (d <= end && iterations < 13) {
    t += rec[MONTHS_PT[d.getMonth()]] || 0;
    d.setMonth(d.getMonth() + 1);
    iterations++;
  }
  return t;
}

export const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

// ─── Fonte de uma métrica (para o "i" de conferência) ──
export interface MetricSource {
  origem: string;
  periodo: string;
  calculo?: string;
}

export function MetricInfo({ label, source }: { label: string; source: MetricSource }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <span
          role="button"
          tabIndex={0}
          aria-label={`Fonte do dado: ${label}`}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") e.stopPropagation(); }}
          className="absolute left-2 top-2 inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground/40 transition hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Info className="h-3.5 w-3.5" />
        </span>
      </PopoverTrigger>
      <PopoverContent align="start" onClick={(e) => e.stopPropagation()} className="w-72 space-y-2 text-xs">
        <div className="font-semibold text-foreground">{label}</div>
        <div className="space-y-1.5">
          <div><span className="font-medium text-muted-foreground">Fonte: </span><span className="text-foreground">{source.origem}</span></div>
          <div><span className="font-medium text-muted-foreground">Período: </span><span className="text-foreground">{source.periodo}</span></div>
          {source.calculo && <div><span className="font-medium text-muted-foreground">Cálculo: </span><span className="text-foreground">{source.calculo}</span></div>}
        </div>
        <p className="border-t border-border pt-1.5 text-[10px] italic text-muted-foreground/70">
          Dado puxado direto da fonte — atualiza ao recarregar / mudar o período.
        </p>
      </PopoverContent>
    </Popover>
  );
}

// ─── Card de métrica ───────────────────────────────────
export interface MetricCardProps {
  label: string;
  value: string;
  sublabel?: string;
  icon?: ReactNode;
  placeholder?: boolean;
  large?: boolean;
  tone?: "default" | "danger" | "success";
  onClick?: () => void;
  source?: MetricSource;
}
export function MetricCard({ label, value, sublabel, icon, placeholder, large, tone = "default", onClick, source }: MetricCardProps) {
  const toneCls = tone === "danger" ? "border-destructive/40" : tone === "success" ? "border-green-500/40" : "border-border";
  const interactive = !!onClick && !placeholder;
  const Comp: any = interactive ? "button" : "div";
  return (
    <Comp
      type={interactive ? "button" : undefined}
      onClick={onClick}
      className={`group relative flex w-full flex-col items-center justify-center rounded-lg border p-4 text-left ${
        large ? "min-h-[120px]" : "min-h-[90px]"
      } ${placeholder ? "bg-muted/30 border-dashed border-muted-foreground/30" : `bg-card ${toneCls}`} ${
        interactive ? "cursor-pointer transition hover:border-primary/50 hover:bg-accent/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" : ""
      }`}
    >
      {source && <MetricInfo label={label} source={source} />}
      {icon && <div className="mb-1 text-muted-foreground">{icon}</div>}
      <span className={`font-bold leading-tight text-foreground ${large ? "text-2xl" : "text-lg"}`}>{value}</span>
      <span className="mt-0.5 text-center text-xs leading-tight text-muted-foreground">{label}</span>
      {sublabel && <span className="mt-0.5 text-[10px] italic text-muted-foreground/60">{sublabel}</span>}
      {interactive && (
        <span className="absolute right-2 top-2 text-[10px] text-muted-foreground/40 opacity-0 transition group-hover:opacity-100">ver detalhes →</span>
      )}
    </Comp>
  );
}

// ─── Slot da nota explicativa / análise comportamental (IA) ──
// Por enquanto sem IA ligada: deixa o espaço pronto + botão "Gerar análise".
// Quando a edge function analyze-metrics existir, basta plugar onGenerate.
export function AiNote({ title = "Análise (IA)", text, onGenerate, loading }: {
  title?: string;
  text?: string | null;
  onGenerate?: () => void;
  loading?: boolean;
}) {
  return (
    <div className="rounded-md border border-dashed border-primary/30 bg-primary/[0.03] p-3">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          {title}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 gap-1 text-[11px]"
          onClick={onGenerate}
          disabled={!onGenerate || loading}
          title={onGenerate ? "Gerar análise comportamental do número" : "Disponível quando a IA for conectada"}
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          {onGenerate ? "Gerar análise" : "Em breve"}
        </Button>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {text ?? "Nota explicativa / análise comportamental do número aparecerá aqui — será gerada por IA com o mindset de gestão de negócios."}
      </p>
    </div>
  );
}

// ─── Placeholder "aguardando fonte de dados" ───────────
// Para blocos que o CEO pediu mas que ainda não têm fonte no app.
export function AguardandoFonte({ titulo, descricao, itens }: {
  titulo: string;
  descricao: string;
  itens?: string[];
}) {
  return (
    <Card className="border-dashed border-muted-foreground/30 bg-muted/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-muted-foreground">
          <DatabaseZap className="h-4 w-4" />
          {titulo}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground">{descricao}</p>
        {itens && itens.length > 0 && (
          <ul className="list-inside list-disc space-y-0.5 text-xs text-muted-foreground/80">
            {itens.map((i, idx) => <li key={idx}>{i}</li>)}
          </ul>
        )}
        <p className="pt-1 text-[11px] italic text-muted-foreground/60">
          Estrutura pronta — conecte a fonte de dados para preencher automaticamente.
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Cabeçalho de bloco com botão de relatório ─────────
export function BlockHeader({ icon, title, description, onReport }: {
  icon: ReactNode;
  title: string;
  description?: string;
  onReport?: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-foreground">
          {icon}
          {title}
        </h3>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
    </div>
  );
}
