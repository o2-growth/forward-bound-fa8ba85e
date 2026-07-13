import { useMemo, useState } from "react";
import {
  RefreshCw,
  ExternalLink,
  Search,
  AlertCircle,
  Info,
  Users,
  Hand,
  ClipboardCheck,
  DollarSign,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MetricCard, fmt, fmtInt } from "@/components/planning/ceo/ceoShared";
import {
  useG4RealMetrics,
  type G4RealFunilRow,
  type G4RealLead,
} from "@/hooks/useG4RealMetrics";
import { LiveDetailDialog, type G4Stage } from "./LiveDetailDialog";
import { buildPipefyUrl } from "./pipefy";

const MAIO_LIVE = "Live G4 - 20-21/05/2026";

// ── Canonicalização de rótulos de lives ──────────────────────────────────
// A fonte externa tem variações do mesmo evento (ex.: "Live - G4 - 20-mai"
// vs "Live G4 - 20/05/2026"). Consolidamos aqui no rótulo canônico.
const LIVE_CANONICAL_MAP: Record<string, string> = {
  "Live - G4 - 20-mai": "Live G4 - 20/05/2026",
  "Live - G4 - 21-mai": "Live G4 - 21/05/2026",
};
const canonLive = (s: string): string => LIVE_CANONICAL_MAP[s] ?? s;

// ── Presentes medidos manualmente (contagem no Zoom durante a live) ──────
// A fonte externa não exporta presença; esses números foram contados ao vivo.
const PRESENTES_OVERRIDE: Record<string, number> = {
  "Live G4 - 20/05/2026": 52,
  "Live G4 - 21/05/2026": 48,
  "Live G4 - 17/06/2026": 243,
  "Live G4 - 18/06/2026": 168,
  "Live G4 - 02/07/2026": 165,
};

function pct(num: number, den: number | null): string {
  if (den == null || den <= 0) return "—";
  return `${((num / den) * 100).toFixed(1)}%`;
}

function LiveFunnelCard({
  row,
  diagnosticos,
  presentesManual,
  onOpenStage,
}: {
  row: G4RealFunilRow;
  diagnosticos: number;
  presentesManual: boolean;
  onOpenStage: (live: string, stage: G4Stage) => void;
}) {
  const isMaio = row.live === MAIO_LIVE;
  const steps: { label: string; value: number | null; den: number | null; stage: G4Stage }[] = [
    { label: "Inscritos", value: row.inscritos, den: null, stage: "inscritos" },
    { label: "Presentes", value: row.presentes, den: row.inscritos, stage: "presentes" },
    {
      label: "Levantaram a mão",
      value: row.levantaramMao,
      den: row.presentes ?? row.inscritos,
      stage: "mao",
    },
    { label: "Vendas", value: row.vendas, den: row.levantaramMao, stage: "vendas" },
  ];

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="font-medium text-foreground text-sm">{row.live}</div>
          <div className="flex items-center gap-1">
            {presentesManual && (
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="outline"
                      className="text-[10px] gap-1 border-sky-500/40 text-sky-600 dark:text-sky-400"
                    >
                      <Info className="h-3 w-3" />
                      presença manual
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[260px] text-xs">
                    Não exportado pela fonte — número contado manualmente pela
                    equipe olhando os participantes no Zoom durante a live.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {isMaio && (
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="outline"
                      className="text-[10px] gap-1 border-amber-500/40 text-amber-600 dark:text-amber-400"
                    >
                      <AlertCircle className="h-3 w-3" />
                      sem presença
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    Maio: sem presença/diagnóstico (fonte não capturou)
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {steps.map((s, idx) => {
            const display = s.value == null ? "—" : fmtInt(s.value as number);
            const conv =
              idx === 0
                ? null
                : s.value == null
                ? "—"
                : pct(s.value as number, s.den);
            const isPresentesManual = presentesManual && s.stage === "presentes";
            const btn = (
              <button
                type="button"
                key={s.label}
                onClick={() => onOpenStage(row.live, s.stage)}
                className={`rounded-md border bg-muted/20 p-2 text-center transition-colors hover:bg-muted/50 hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                  isPresentesManual ? "border-sky-500/40" : ""
                }`}
              >
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground inline-flex items-center gap-1">
                  {s.label}
                  {isPresentesManual && <Info className="h-3 w-3 text-sky-500" />}
                </div>
                <div className="text-lg font-semibold tabular-nums text-foreground">
                  {display}
                </div>
                {conv !== null && (
                  <div className="text-[10px] text-muted-foreground tabular-nums">
                    {conv}
                  </div>
                )}
              </button>
            );
            if (!isPresentesManual) return btn;
            return (
              <TooltipProvider key={s.label} delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>{btn}</TooltipTrigger>
                  <TooltipContent className="max-w-[260px] text-xs">
                    Esse número não foi exportado da fonte oficial — ele foi
                    contado manualmente pela equipe vendo os participantes no
                    Zoom durante a live.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => onOpenStage(row.live, "diagnosticos")}
          className="flex w-full items-center justify-between text-xs text-muted-foreground pt-1 border-t hover:text-foreground transition-colors"
        >
          <span>Diagnósticos</span>
          <span className="font-medium text-foreground tabular-nums">
            {isMaio && diagnosticos === 0 ? "—" : fmtInt(diagnosticos)}
          </span>
        </button>
      </CardContent>
    </Card>
  );
}

function BoolBadge({ v, off = "—" }: { v: boolean; off?: string }) {
  return v ? (
    <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/15">
      Sim
    </Badge>
  ) : (
    <span className="text-muted-foreground text-xs">{off}</span>
  );
}

export function G4RealSection() {
  const { data, isLoading, isFetching, error, refetch } = useG4RealMetrics();

  const [search, setSearch] = useState("");
  const [liveFilter, setLiveFilter] = useState<string>("all");
  const [faseFilter, setFaseFilter] = useState<string>("all");
  const [onlyMao, setOnlyMao] = useState(false);
  const [onlyDiag, setOnlyDiag] = useState(false);
  const [onlyPresente, setOnlyPresente] = useState(false);
  const [detail, setDetail] = useState<{ live: string; stage: G4Stage } | null>(null);

  const detailLeads = useMemo<G4RealLead[]>(() => {
    if (!detail || !data) return [];
    const { live, stage } = detail;
    const isTraction = /traction/i.test(live);
    return data.leads.filter((l) => {
      if (!l.lives.includes(live)) return false;
      switch (stage) {
        case "inscritos":
          return !isTraction;
        case "presentes":
          return !isTraction && l.presenteAlgumaLive;
        case "mao":
          return isTraction || (l.levantouMao && (!l.liveDaMao || l.liveDaMao === live));
        case "vendas":
          return l.faseAtual === "Ganho";
        case "diagnosticos":
          return l.fezDiagnostico;
        default:
          return false;
      }
    });
  }, [detail, data]);

  const diagMap = useMemo(() => {
    const m = new Map<string, number>();
    (data?.diagnosticoPorLive ?? []).forEach((d) =>
      m.set(d.live, d.diagnosticos),
    );
    return m;
  }, [data]);

  const livesOptions = useMemo(() => {
    const set = new Set<string>();
    (data?.funil ?? []).forEach((f) => set.add(f.live));
    (data?.leads ?? []).forEach((l) => l.lives.forEach((x) => set.add(x)));
    return Array.from(set).sort();
  }, [data]);

  const fasesOptions = useMemo(() => {
    const set = new Set<string>();
    (data?.leads ?? []).forEach((l) => {
      if (l.faseAtual) set.add(l.faseAtual);
    });
    return Array.from(set).sort();
  }, [data]);

  const filteredLeads: G4RealLead[] = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.leads ?? []).filter((l) => {
      if (liveFilter !== "all" && !l.lives.includes(liveFilter)) return false;
      if (faseFilter !== "all" && (l.faseAtual ?? "") !== faseFilter)
        return false;
      if (onlyMao && !l.levantouMao) return false;
      if (onlyDiag && !l.fezDiagnostico) return false;
      if (onlyPresente && !l.presenteAlgumaLive) return false;
      if (q) {
        const hay = `${l.nome ?? ""} ${l.empresa ?? ""} ${l.email ?? ""}`
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [
    data,
    search,
    liveFilter,
    faseFilter,
    onlyMao,
    onlyDiag,
    onlyPresente,
  ]);

  const generatedLabel = data?.generatedAt
    ? `atualizado ${formatDistanceToNow(new Date(data.generatedAt), {
        addSuffix: true,
        locale: ptBR,
      })}`
    : "—";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Dados reais das lives G4
          </h3>
          <p className="text-xs text-muted-foreground">
            Inscritos, presença, mão levantada e diagnóstico direto da fonte ·{" "}
            {generatedLabel}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw
            className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
          />
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          Erro ao carregar dados reais: {(error as Error).message}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Total Leads"
          value={fmtInt(data?.kpis.totalLeads ?? 0)}
          icon={<Users className="h-4 w-4" />}
        />
        <MetricCard
          label="Levantaram a mão"
          value={fmtInt(data?.kpis.levantaramMao ?? 0)}
          icon={<Hand className="h-4 w-4" />}
        />
        <MetricCard
          label="Diagnósticos"
          value={fmtInt(data?.kpis.diagnosticos ?? 0)}
          icon={<ClipboardCheck className="h-4 w-4" />}
        />
        <MetricCard
          label="Faturamento (Ganho)"
          value={fmt(data?.kpis.faturamento ?? 0)}
          icon={<DollarSign className="h-4 w-4" />}
          tone={(data?.kpis.faturamento ?? 0) > 0 ? "success" : "default"}
        />
      </div>

      {/* Funis por live */}
      <div>
        <h4 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
          Funil por live
        </h4>
        {isLoading ? (
          <div className="h-40 rounded-md border bg-muted/20 animate-pulse" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(data?.funil ?? []).map((row) => (
              <LiveFunnelCard
                key={row.live}
                row={row}
                diagnosticos={diagMap.get(row.live) ?? 0}
                onOpenStage={(live, stage) => setDetail({ live, stage })}
              />
            ))}
          </div>
        )}
      </div>

      {/* Filtros + tabela leads */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs uppercase tracking-wide text-muted-foreground">
            Leads ({fmtInt(filteredLeads.length)}
            {data ? ` de ${fmtInt(data.leads.length)}` : ""})
          </h4>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, empresa ou e-mail"
              className="pl-8 h-9"
            />
          </div>
          <Select value={liveFilter} onValueChange={setLiveFilter}>
            <SelectTrigger className="w-[220px] h-9">
              <SelectValue placeholder="Live" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as lives</SelectItem>
              {livesOptions.map((l) => (
                <SelectItem key={l} value={l}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={faseFilter} onValueChange={setFaseFilter}>
            <SelectTrigger className="w-[200px] h-9">
              <SelectValue placeholder="Fase" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as fases</SelectItem>
              {fasesOptions.map((f) => (
                <SelectItem key={f} value={f}>
                  {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant={onlyMao ? "default" : "outline"}
            onClick={() => setOnlyMao((v) => !v)}
          >
            Levantou a mão
          </Button>
          <Button
            size="sm"
            variant={onlyDiag ? "default" : "outline"}
            onClick={() => setOnlyDiag((v) => !v)}
          >
            Fez diagnóstico
          </Button>
          <Button
            size="sm"
            variant={onlyPresente ? "default" : "outline"}
            onClick={() => setOnlyPresente((v) => !v)}
          >
            Presente
          </Button>
        </div>

        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2 text-left font-semibold">Nome</th>
                  <th className="px-3 py-2 text-left font-semibold">Empresa</th>
                  <th className="px-3 py-2 text-left font-semibold">Live(s)</th>
                  <th className="px-3 py-2 text-center font-semibold">
                    Presente
                  </th>
                  <th className="px-3 py-2 text-center font-semibold">
                    Mão
                  </th>
                  <th className="px-3 py-2 text-center font-semibold">
                    Diag.
                  </th>
                  <th className="px-3 py-2 text-left font-semibold">
                    Fase atual
                  </th>
                  <th className="px-3 py-2 text-left font-semibold">Closer</th>
                  <th className="px-3 py-2 text-right font-semibold">Ação</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-3 py-10 text-center text-muted-foreground"
                    >
                      Carregando…
                    </td>
                  </tr>
                ) : filteredLeads.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-3 py-10 text-center text-muted-foreground"
                    >
                      Nenhum lead encontrado com os filtros atuais.
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((l, i) => (
                    <tr
                      key={`${l.email}-${i}`}
                      className="border-b last:border-b-0 hover:bg-muted/20"
                    >
                      <td className="px-3 py-2 text-foreground">
                        {l.nome || "—"}
                        <div className="text-[11px] text-muted-foreground">
                          {l.email}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-foreground">
                        {l.empresa || "—"}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          {l.lives.length === 0 ? (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          ) : (
                            l.lives.map((liv) => (
                              <Badge
                                key={liv}
                                variant="secondary"
                                className="text-[10px]"
                              >
                                {liv.replace("Live G4 - ", "")}
                              </Badge>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <BoolBadge v={l.presenteAlgumaLive} />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <BoolBadge v={l.levantouMao} />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <BoolBadge v={l.fezDiagnostico} />
                      </td>
                      <td className="px-3 py-2 text-foreground text-xs">
                        {l.faseAtual || "—"}
                      </td>
                      <td className="px-3 py-2 text-foreground text-xs">
                        {l.closer || "—"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {(() => {
                          const url = buildPipefyUrl(l);
                          return url ? (
                            <Button size="sm" variant="default" asChild className="h-7 gap-1.5">
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={l.pipefyUrl ? "Abrir card no Pipefy" : "Buscar por e-mail no Pipefy"}
                              >
                                Pipefy
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground/60">—</span>
                          );
                        })()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      <LiveDetailDialog
        open={detail !== null}
        onOpenChange={(o) => !o && setDetail(null)}
        live={detail?.live ?? ""}
        stage={detail?.stage ?? "inscritos"}
        leads={detailLeads}
      />
    </div>
  );
}
