import { useState, lazy, Suspense, type ComponentType } from "react";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DateRangePickerGA } from "./DateRangePickerGA";
import {
  MetricCard,
  fmt,
  fmtInt,
} from "@/components/planning/ceo/ceoShared";
import {
  RefreshCw,
  Info,
  Loader2,
  Trophy,
  TrendingUp,
  DollarSign,
  Users,
} from "lucide-react";
import { useG4Analytics } from "@/hooks/useG4Analytics";
import { G4_PERIOD_START } from "@/lib/g4Events";
import type { LivesSectionProps } from "./g4/LivesSection";
import type { EventosSectionProps } from "./g4/EventosSection";
import type { SellerSectionProps } from "./g4/SellerSection";
import { G4RealSection } from "./g4/G4RealSection";

// ── Lazy-load das sections (carregam só quando a sub-tab abre) ───────────
const LivesSection   = lazy(() => import("./g4/LivesSection").then((m) => ({ default: m.LivesSection   as unknown as ComponentType<LivesSectionProps>   })));
const EventosSection = lazy(() => import("./g4/EventosSection").then((m) => ({ default: m.EventosSection as unknown as ComponentType<EventosSectionProps> })));
const SellerSection  = lazy(() => import("./g4/SellerSection").then((m) => ({ default: m.SellerSection  as unknown as ComponentType<SellerSectionProps>  })));

// ── Fallback de loading ─────────────────────────────────────────────────
function SectionFallback() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

// ── Skeleton dos KPI cards (estado de loading) ──────────────────────────
function KpiSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="min-h-[90px] animate-pulse rounded-lg border bg-muted/30"
        />
      ))}
    </div>
  );
}

// ── Overview comparativo (sub-tab "Overview") ───────────────────────────
function OverviewComparativo({
  lives,
  eventos,
  seller,
}: {
  lives:   { totalLeads: number; totalPipe: number; totalFaturado: number };
  eventos: { totalLeads: number; totalPipe: number; totalFaturado: number };
  seller:  { totalLeads: number; totalPipe: number; totalFaturado: number };
}) {
  const rows = [
    { label: "Lives",     ...lives   },
    { label: "Eventos",   ...eventos },
    { label: "G4 Seller", ...seller  },
  ];

  return (
    <Card>
      <CardContent className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-4 py-3 text-left font-semibold text-foreground">Frente</th>
              <th className="px-4 py-3 text-right font-semibold text-foreground">Leads</th>
              <th className="px-4 py-3 text-right font-semibold text-foreground">Pipe Aberto</th>
              <th className="px-4 py-3 text-right font-semibold text-foreground">Faturamento</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={row.label}
                className={idx < rows.length - 1 ? "border-b" : ""}
              >
                <td className="px-4 py-3 font-medium text-foreground">{row.label}</td>
                <td className="px-4 py-3 text-right tabular-nums text-foreground">
                  {fmtInt(row.totalLeads)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-foreground">
                  {fmt(row.totalPipe)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-foreground">
                  {fmt(row.totalFaturado)}
                </td>
              </tr>
            ))}
            {/* Linha total */}
            <tr className="border-t bg-muted/20 font-semibold">
              <td className="px-4 py-3 text-foreground">Total G4</td>
              <td className="px-4 py-3 text-right tabular-nums text-foreground">
                {fmtInt(rows.reduce((s, r) => s + r.totalLeads, 0))}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-foreground">
                {fmt(rows.reduce((s, r) => s + r.totalPipe, 0))}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                {fmt(rows.reduce((s, r) => s + r.totalFaturado, 0))}
              </td>
            </tr>
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

// ── Componente principal ────────────────────────────────────────────────
export function G4Tab() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: G4_PERIOD_START,
    to: new Date(),
  });

  const periodLabel = `${format(dateRange.from, "dd/MM/yyyy")} – ${format(dateRange.to, "dd/MM/yyyy")}`;

  const { analytics, refetch } = useG4Analytics(dateRange);
  const { loading, error, totalLeads, totalPipe, totalFaturado, lives, eventos, seller, unclassifiedCount } = analytics;

  // Métricas derivadas para o overview comparativo
  const livesOverview   = { totalLeads: lives.cards.length,   totalPipe: lives.pipe.aberto,   totalFaturado: lives.dre.receitaBruta   };
  const eventosOverview = { totalLeads: eventos.cards.length, totalPipe: eventos.pipe.aberto, totalFaturado: eventos.dre.receitaBruta };
  const sellerOverview  = { totalLeads: seller.cards.length,  totalPipe: seller.pipe.aberto,  totalFaturado: seller.dre.receitaBruta  };

  const totalLucro =
    lives.dre.lucroLiquido + eventos.dre.lucroLiquido + seller.dre.lucroLiquido;

  return (
    <div className="space-y-6">
      {/* ── HEADER ──────────────────────────────────────────────────── */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            <h2 className="font-display text-xl font-semibold text-foreground">
              Dashboard G4
            </h2>
            <Badge variant="secondary" className="text-xs">
              Parceria G4 Educação
            </Badge>
            {unclassifiedCount > 0 && (
              <Badge variant="outline" className="text-xs">
                {unclassifiedCount} leads G4 sem frente
              </Badge>
            )}
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Leads, funil e retorno financeiro por frente · {periodLabel}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refetch}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <DateRangePickerGA
            startDate={dateRange.from}
            endDate={dateRange.to}
            onDateChange={(start, end) => setDateRange({ from: start, to: end })}
          />
        </div>
      </div>

      {/* ── NOTA EXPLICATIVA ────────────────────────────────────────── */}
      <div className="flex items-start gap-2 rounded-md border border-dashed border-amber-400/50 bg-amber-50/40 dark:bg-amber-900/10 p-3 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
        <span>
          Classificação usa <strong>origemLead / campanha / tipoOrigem / fonte / paginaOrigem</strong>.
          Prioridade: <strong>Seller</strong> {'>'} <strong>Lives</strong> {'>'} <strong>Eventos</strong>.
          Live também é reconhecida quando o card entra dentro da janela de captura
          de alguma live cadastrada. Cards com sinal G4 mas sem frente aparecem em{" "}
          <code>/debug/g4-lives-check</code>. Custos de Eventos ainda zerados (fase 1).
        </span>
      </div>

      {/* ── ERRO ────────────────────────────────────────────────────── */}
      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          Erro ao carregar dados G4: {error.message}
        </div>
      )}

      {/* ── 3 KPIs AGREGADOS ────────────────────────────────────────── */}
      {loading ? (
        <KpiSkeleton />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <MetricCard
            label="Total Leads G4"
            value={fmtInt(totalLeads)}
            sublabel={`Lives ${lives.cards.length} · Eventos ${eventos.cards.length} · Seller ${seller.cards.length}`}
            icon={<Users className="h-4 w-4" />}
          />
          <MetricCard
            label="Pipe Ativo (R$)"
            value={fmt(totalPipe)}
            sublabel={`Vendido ${fmt(lives.pipe.ganho + eventos.pipe.ganho + seller.pipe.ganho)}`}
            icon={<TrendingUp className="h-4 w-4" />}
            tone={totalPipe > 0 ? "success" : "default"}
            source={{
              origem: "Pipefy — cards ativos (não-ganhos, não-perdidos)",
              periodo: periodLabel,
              calculo: "Soma do valor em aberto de todas as frentes G4",
            }}
          />
          <MetricCard
            label="Faturamento Total (R$)"
            value={fmt(totalFaturado)}
            sublabel={`Lucro líquido ${fmt(totalLucro)}`}
            icon={<DollarSign className="h-4 w-4" />}
            tone={totalLucro > 0 ? "success" : totalLucro < 0 ? "danger" : "default"}
            source={{
              origem: "Pipefy — cards ganhos (fase Venda)",
              periodo: periodLabel,
              calculo: "Receita bruta das 3 frentes — imposto 15% — comissão G4 15% — custos operacionais",
            }}
          />
        </div>
      )}

      {/* ── SUB-TABS ────────────────────────────────────────────────── */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="reais">Reais</TabsTrigger>
          <TabsTrigger value="lives">Lives</TabsTrigger>
          <TabsTrigger value="eventos">Eventos</TabsTrigger>
          <TabsTrigger value="seller">G4 Seller</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="mt-6">
          {loading ? (
            <SectionFallback />
          ) : (
            <OverviewComparativo
              lives={livesOverview}
              eventos={eventosOverview}
              seller={sellerOverview}
            />
          )}
        </TabsContent>

        {/* Lives */}
        <TabsContent value="lives" className="mt-6">
          <Suspense fallback={<SectionFallback />}>
            <LivesSection
              leads={lives.cards.length}
              pipe={lives.pipe.aberto}
              faturamento={lives.dre.receitaBruta}
              leadTimeMedio={lives.leadTimeMediaDias}
              dre={lives.dre}
              custosDetalhe={lives.custosDetalhe}
              livesRows={lives.livesRows}
              cards={lives.cards}
            />
          </Suspense>
        </TabsContent>

        {/* Eventos */}
        <TabsContent value="eventos" className="mt-6">
          <Suspense fallback={<SectionFallback />}>
            <EventosSection
              leads={eventos.cards.length}
              pipe={eventos.pipe.aberto}
              faturamento={eventos.dre.receitaBruta}
              leadTimeMedio={eventos.leadTimeMediaDias}
              dre={eventos.dre}
              custosDetalhe={eventos.custosDetalhe}
              eventosRows={eventos.eventosRows}
              cards={eventos.cards}
            />
          </Suspense>
        </TabsContent>

        {/* G4 Seller */}
        <TabsContent value="seller" className="mt-6">
          <Suspense fallback={<SectionFallback />}>
            <SellerSection
              leads={seller.cards.length}
              pipe={seller.pipe.aberto}
              faturamento={seller.dre.receitaBruta}
              leadTimeMedio={seller.leadTimeMediaDias}
              dre={seller.dre}
              cards={seller.cards}
            />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
