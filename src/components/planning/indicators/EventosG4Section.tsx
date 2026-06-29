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
import { DetailSheet, columnFormatters, type DetailItem } from "./DetailSheet";
import { classifyLeadSource } from "@/lib/leadSource";
import {
  classifyEventSubcategory,
  EVENT_SUBCATEGORIES,
  type EventSubcategory,
} from "@/lib/eventSubcategory";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(v || 0);

const formatPct = (v: number) =>
  isFinite(v) && !isNaN(v) ? `${(v * 100).toFixed(1)}%` : "-";

type FunnelStage = "leads" | "mql" | "rm" | "rr" | "proposta" | "venda";
const FUNNEL_ORDER: FunnelStage[] = [
  "leads",
  "mql",
  "rm",
  "rr",
  "proposta",
  "venda",
];

const PHASE_FUNNEL_MAP: Record<string, FunnelStage> = {
  // Leads
  "Novos Leads": "leads",
  "Start form": "leads",
  // MQL
  MQLs: "mql",
  MQL: "mql",
  "Tentativas de contato": "mql",
  "Material ISCA": "mql",
  // RM
  "Reunião agendada / Qualificado": "rm",
  // RR
  "Reunião Realizada": "rr",
  "1° Reunião Realizada - Apresentação": "rr",
  "1° Reunião Realizada": "rr",
  // Proposta
  "Proposta enviada / Follow Up": "proposta",
  "Enviar para assinatura": "proposta",
  // Venda
  "Contrato assinado": "venda",
  Ganho: "venda",
};

function cumulativeStages(phase: string): FunnelStage[] {
  const s = PHASE_FUNNEL_MAP[phase] ?? "leads";
  return FUNNEL_ORDER.slice(0, FUNNEL_ORDER.indexOf(s) + 1);
}

interface AnyCard {
  id: string;
  titulo?: string;
  empresa?: string;
  fase: string;
  faseAtual?: string;
  dataEntrada: Date;
  dataAssinatura?: Date | null;
  valorMRR?: number;
  valorSetup?: number;
  valorPontual?: number;
  origemLead?: string;
  tipoOrigem?: string;
  fonte?: string;
  campanha?: string;
  closer?: string | null;
  sdr?: string | null;
  responsavel?: string | null;
  bu?: string;
}

interface CardWithBU extends AnyCard {
  bu: string;
}

interface Props {
  modeloAtualCards: AnyCard[];
  o2TaxCards: AnyCard[];
  franquiaCards: AnyCard[];
  oxyHackerCards: AnyCard[];
  outboundCards?: AnyCard[];
}

interface SubcategoryRow {
  subcategory: EventSubcategory;
  leads: number;
  mql: number;
  rm: number;
  rr: number;
  proposta: number;
  venda: number;
  mrr: number;
  setup: number;
  pontual: number;
  tcv: number;
  cards: CardWithBU[];
}

export function EventosG4Section({
  modeloAtualCards,
  o2TaxCards,
  franquiaCards,
  oxyHackerCards,
  outboundCards = [],
}: Props) {
  const [drill, setDrill] = useState<EventSubcategory | "ALL" | null>(null);

  // 1) Combina todas as BUs com tag de origem
  const allCards = useMemo<CardWithBU[]>(() => {
    const tag = (arr: AnyCard[], bu: string) =>
      (arr || []).map((c) => ({ ...c, bu }));
    return [
      ...tag(modeloAtualCards, "Modelo Atual"),
      ...tag(o2TaxCards, "O2 TAX"),
      ...tag(franquiaCards, "Franquia"),
      ...tag(oxyHackerCards, "Oxy Hacker"),
      ...tag(outboundCards, "Outbound"),
    ];
  }, [
    modeloAtualCards,
    o2TaxCards,
    franquiaCards,
    oxyHackerCards,
    outboundCards,
  ]);

  // 2) Mantém só Eventos
  const eventCards = useMemo<CardWithBU[]>(() => {
    return allCards.filter(
      (c) =>
        classifyLeadSource({
          tipoOrigem: c.tipoOrigem,
          origemLead: c.origemLead,
          fonte: c.fonte,
          campanha: c.campanha,
          sdr: (c as any).responsavel || c.sdr,
        }) === "evento",
    );
  }, [allCards]);

  // 3) Agrupa por subcategoria + computa funil
  const { rows, totals } = useMemo(() => {
    const byCat = new Map<EventSubcategory, CardWithBU[]>();
    for (const c of eventCards) {
      const sub = classifyEventSubcategory({
        origemLead: c.origemLead,
        tipoOrigem: c.tipoOrigem,
        campanha: c.campanha,
      });
      if (!byCat.has(sub)) byCat.set(sub, []);
      byCat.get(sub)!.push(c);
    }

    const buildRow = (
      sub: EventSubcategory,
      cards: CardWithBU[],
    ): SubcategoryRow => {
      const stageSets: Record<FunnelStage, Set<string>> = {
        leads: new Set(),
        mql: new Set(),
        rm: new Set(),
        rr: new Set(),
        proposta: new Set(),
        venda: new Set(),
      };
      let mrr = 0,
        setup = 0,
        pontual = 0;
      const vendaSeen = new Set<string>();
      for (const c of cards) {
        for (const s of cumulativeStages(c.fase)) stageSets[s].add(c.id);
        if (PHASE_FUNNEL_MAP[c.fase] === "venda" && !vendaSeen.has(c.id)) {
          vendaSeen.add(c.id);
          mrr += c.valorMRR || 0;
          setup += c.valorSetup || 0;
          pontual += c.valorPontual || 0;
        }
      }
      const tcv = mrr * 12 + setup + pontual;
      return {
        subcategory: sub,
        leads: stageSets.leads.size,
        mql: stageSets.mql.size,
        rm: stageSets.rm.size,
        rr: stageSets.rr.size,
        proposta: stageSets.proposta.size,
        venda: stageSets.venda.size,
        mrr,
        setup,
        pontual,
        tcv,
        cards,
      };
    };

    const orderedRows: SubcategoryRow[] = EVENT_SUBCATEGORIES.filter((s) =>
      byCat.has(s),
    ).map((s) => buildRow(s, byCat.get(s)!));

    // Totais agregados (não soma vendas duplicadas entre subcategorias — cada
    // card só cai em uma subcategoria por construção).
    const totals = buildRow("Outros Eventos", eventCards);

    return { rows: orderedRows, totals };
  }, [eventCards]);

  // 4) Drill-down items
  const drillCards = useMemo<CardWithBU[]>(() => {
    if (!drill) return [];
    if (drill === "ALL") return eventCards;
    return rows.find((r) => r.subcategory === drill)?.cards ?? [];
  }, [drill, eventCards, rows]);

  const drillItems = useMemo<DetailItem[]>(() => {
    return drillCards.map((c) => {
      const sub = classifyEventSubcategory({
        origemLead: c.origemLead,
        tipoOrigem: c.tipoOrigem,
        campanha: c.campanha,
      });
      const mrr = c.valorMRR || 0;
      const setup = c.valorSetup || 0;
      const pontual = c.valorPontual || 0;
      return {
        id: c.id,
        name: c.titulo || c.empresa || "Sem título",
        company: c.empresa,
        phase: c.faseAtual || c.fase,
        date: c.dataEntrada ? c.dataEntrada.toISOString() : undefined,
        mrr,
        setup,
        pontual,
        total: mrr + setup + pontual,
        responsible: (c as any).responsavel || c.closer || c.sdr || undefined,
        closer: c.closer || undefined,
        sdr: c.sdr || undefined,
        bu: c.bu,
        origemLead: c.origemLead,
        tipoOrigem: c.tipoOrigem,
        product: sub, // reaproveita formatter de badge
      };
    });
  }, [drillCards]);

  const drillTitle = useMemo(() => {
    if (!drill) return "";
    if (drill === "ALL") return "🎤 Eventos · G4 — Todos os cards";
    return `🎤 Eventos · G4 — ${drill}`;
  }, [drill]);

  if (eventCards.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            🎤 Eventos · G4 — Subcategorias
            <SubcategoryInfoTip />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground italic">
            Nenhum card de evento (G4 / talkshow / 4AM / presencial / speaker)
            no período selecionado.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          🎤 Eventos · G4 — Subcategorias
          <SubcategoryInfoTip />
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Cards classificados como Evento (campo "Origem do lead") quebrados
          por subcategoria. Respeita o período da aba; combina todas as BUs
          (Modelo Atual, O2 TAX, Franquia, Oxy Hacker, Outbound).
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* KPIs totais */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-2">
          <KpiBox
            label="Leads"
            value={String(totals.leads)}
            onClick={() => setDrill("ALL")}
          />
          <KpiBox label="MQL" value={String(totals.mql)} />
          <KpiBox label="RM" value={String(totals.rm)} />
          <KpiBox label="RR" value={String(totals.rr)} />
          <KpiBox label="Proposta" value={String(totals.proposta)} />
          <KpiBox label="Venda" value={String(totals.venda)} />
          <KpiBox
            label="Receita (MRR+Setup+Pontual)"
            value={formatCurrency(totals.mrr + totals.setup + totals.pontual)}
          />
        </div>

        {/* Tabela por subcategoria */}
        <div className="rounded-md border overflow-auto max-h-[520px]">
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10 bg-background border-b">
              <tr className="text-left">
                <th className="px-3 py-2 font-semibold">Subcategoria</th>
                <th className="px-2 py-2 text-right font-semibold">Leads</th>
                <th className="px-2 py-2 text-right font-semibold">MQL</th>
                <th className="px-2 py-2 text-right font-semibold">RM</th>
                <th className="px-2 py-2 text-right font-semibold">RR</th>
                <th className="px-2 py-2 text-right font-semibold">Prop.</th>
                <th className="px-2 py-2 text-right font-semibold">Venda</th>
                <th className="px-2 py-2 text-right font-semibold">MRR</th>
                <th className="px-2 py-2 text-right font-semibold">Setup</th>
                <th className="px-2 py-2 text-right font-semibold">Pontual</th>
                <th className="px-2 py-2 text-right font-semibold">TCV</th>
                <th className="px-2 py-2 text-right font-semibold">Lead→MQL</th>
                <th className="px-2 py-2 text-right font-semibold">MQL→RR</th>
                <th className="px-2 py-2 text-right font-semibold">RR→Venda</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.subcategory}
                  onClick={() => setDrill(r.subcategory)}
                  className="border-b last:border-0 cursor-pointer hover:bg-muted/50"
                >
                  <td className="px-3 py-2 font-medium">
                    <Badge variant="outline" className="font-normal">
                      {r.subcategory}
                    </Badge>
                  </td>
                  <td className="px-2 py-2 text-right">{r.leads}</td>
                  <td className="px-2 py-2 text-right">{r.mql}</td>
                  <td className="px-2 py-2 text-right">{r.rm}</td>
                  <td className="px-2 py-2 text-right">{r.rr}</td>
                  <td className="px-2 py-2 text-right">{r.proposta}</td>
                  <td className="px-2 py-2 text-right font-semibold">
                    {r.venda}
                  </td>
                  <td className="px-2 py-2 text-right">
                    {formatCurrency(r.mrr)}
                  </td>
                  <td className="px-2 py-2 text-right">
                    {formatCurrency(r.setup)}
                  </td>
                  <td className="px-2 py-2 text-right">
                    {formatCurrency(r.pontual)}
                  </td>
                  <td className="px-2 py-2 text-right font-semibold">
                    {formatCurrency(r.tcv)}
                  </td>
                  <td className="px-2 py-2 text-right text-muted-foreground">
                    {formatPct(r.leads > 0 ? r.mql / r.leads : NaN)}
                  </td>
                  <td className="px-2 py-2 text-right text-muted-foreground">
                    {formatPct(r.mql > 0 ? r.rr / r.mql : NaN)}
                  </td>
                  <td className="px-2 py-2 text-right text-muted-foreground">
                    {formatPct(r.rr > 0 ? r.venda / r.rr : NaN)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-[11px] text-muted-foreground">
          Funil cumulativo: um card em fase avançada conta também nas etapas
          anteriores. Clique em qualquer linha (ou no card "Leads" acima) para
          ver os cards detalhados.
        </p>
      </CardContent>

      <DetailSheet
        open={drill !== null}
        onOpenChange={(o) => !o && setDrill(null)}
        title={drillTitle}
        items={drillItems}
        columns={[
          { key: "name", label: "Empresa" },
          {
            key: "product",
            label: "Subcategoria",
            format: columnFormatters.product,
          },
          { key: "bu", label: "BU" },
          { key: "phase", label: "Fase Atual", format: columnFormatters.phase },
          { key: "responsible", label: "Responsável" },
          { key: "mrr", label: "MRR", format: columnFormatters.currency },
          { key: "setup", label: "Setup", format: columnFormatters.currency },
          {
            key: "pontual",
            label: "Pontual",
            format: columnFormatters.currency,
          },
          {
            key: "total",
            label: "Total",
            format: columnFormatters.currency,
          },
          { key: "date", label: "Entrada", format: columnFormatters.date },
        ]}
      />
    </Card>
  );
}

function SubcategoryInfoTip() {
  return (
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
          <p className="font-semibold mb-1">Como detectamos a subcategoria</p>
          <p>
            Usamos <span className="font-mono">Origem do lead</span> do Pipefy
            (com fallback para <span className="font-mono">Tipo de origem</span>{" "}
            e <span className="font-mono">Campanha</span>) e procuramos os
            tokens: <strong>g4 summit</strong>, <strong>g4 live</strong>,{" "}
            <strong>4am</strong>, <strong>talkshow</strong>,{" "}
            <strong>speaker / palestra</strong>,{" "}
            <strong>presencial / imersão</strong>. G4 sem qualificador → "G4 —
            Outros"; outros eventos sem G4 → "Outros Eventos".
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface KpiBoxProps {
  label: string;
  value: string;
  onClick?: () => void;
}
function KpiBox({ label, value, onClick }: KpiBoxProps) {
  const clickable = !!onClick;
  return (
    <button
      type="button"
      onClick={clickable ? onClick : undefined}
      disabled={!clickable}
      className={`rounded-lg border p-3 text-left transition-colors ${
        clickable ? "hover:border-primary cursor-pointer" : "cursor-default"
      }`}
    >
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="text-lg font-bold mt-1">{value}</div>
    </button>
  );
}
