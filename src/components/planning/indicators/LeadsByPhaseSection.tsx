import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DetailSheet, columnFormatters, type DetailItem } from "./DetailSheet";
import type { AggregateInput, BuLabel } from "./temperaturaAggregator";
import { classifyLeadSource, LEAD_SOURCE_LABELS } from "@/lib/leadSource";

const normalize = (s: unknown): string =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

const LOST_TOKENS = [
  "perdido",
  "perda",
  "lost",
  "descartado",
  "desistencia",
  "desistiu",
  "arquivado",
  "cancelado",
  "desqualificado",
];
const isLostPhase = (fase: unknown): boolean => {
  const n = normalize(fase);
  if (!n) return false;
  if (LOST_TOKENS.some((t) => n.startsWith(t))) return true;
  return false;
};

const WON = new Set(["ganho", "contrato assinado", "concluido"]);
const isWonPhase = (fase: unknown): boolean => WON.has(normalize(fase));
const STANDBY = new Set(["contato futuro"]);
const isStandbyPhase = (fase: unknown): boolean =>
  STANDBY.has(normalize(fase));

// Mapa fase → bucket canônico. Alinhado ao PHASE_FUNNEL_MAP do funil comercial.
type Bucket =
  | "Novos Leads"
  | "MQL / Tentativa"
  | "RM (Agendada)"
  | "RR (Realizada)"
  | "Proposta"
  | "Assinatura"
  | "Outras fases";

const BUCKET_ORDER: Bucket[] = [
  "Novos Leads",
  "MQL / Tentativa",
  "RM (Agendada)",
  "RR (Realizada)",
  "Proposta",
  "Assinatura",
  "Outras fases",
];

const BUCKET_STYLE: Record<Bucket, string> = {
  "Novos Leads": "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100",
  "MQL / Tentativa": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "RM (Agendada)": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  "RR (Realizada)": "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200",
  "Proposta": "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  "Assinatura": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  "Outras fases": "bg-muted text-muted-foreground",
};

function classifyPhase(fase: unknown): Bucket {
  const n = normalize(fase);
  if (!n) return "Outras fases";
  if (n === "novos leads" || n === "start form" || n === "novo lead") return "Novos Leads";
  if (n === "mql" || n === "mqls" || n.includes("tentativa") || n.includes("material isca")) return "MQL / Tentativa";
  if (n.includes("reuniao agendada") || n.includes("reunião agendada") || n.includes("qualificado")) return "RM (Agendada)";
  if (n.includes("reuniao realizada") || n.includes("reunião realizada") || n.includes("apresentacao") || n.includes("apresentação")) return "RR (Realizada)";
  if (n.includes("proposta") || n.includes("follow up") || n.includes("enviar para assinatura")) return "Proposta";
  if (n.includes("contrato em elabora") || n.includes("assinatura")) return "Assinatura";
  return "Outras fases";
}

type Props = AggregateInput;

export function LeadsByPhaseSection(props: Props) {
  const [openBucket, setOpenBucket] = useState<Bucket | null>(null);

  const { buckets, total, activeLabels } = useMemo(() => {
    type Src = {
      buLabel: BuLabel;
      enabled: boolean;
      cards: any[];
      toDetail: (card: any) => DetailItem;
    };
    const includesModelo = props.selectedBUs.includes("modelo_atual");
    const sources: Src[] = [
      {
        buLabel: "Modelo Atual",
        enabled: includesModelo,
        cards: (props.modeloAtualAnalytics as any).allOpenCards ?? props.modeloAtualAnalytics.allCards ?? [],
        toDetail: props.modeloAtualAnalytics.toDetailItem,
      },
      {
        buLabel: "Outbound",
        enabled: includesModelo,
        cards: props.outboundAnalytics.allCards ?? [],
        toDetail: props.outboundAnalytics.toDetailItem,
      },
      {
        buLabel: "Franquia",
        enabled: props.selectedBUs.includes("franquia"),
        cards: (props.franquiaAnalytics as any).allOpenCards ?? props.franquiaAnalytics.cards ?? [],
        toDetail: props.franquiaAnalytics.toDetailItem,
      },
      {
        buLabel: "Oxy Hacker",
        enabled: props.selectedBUs.includes("oxy_hacker"),
        cards: (props.oxyHackerAnalytics as any).allOpenCards ?? props.oxyHackerAnalytics.cards ?? [],
        toDetail: props.oxyHackerAnalytics.toDetailItem,
      },
    ];

    const buckets: Record<Bucket, DetailItem[]> = {
      "Novos Leads": [],
      "MQL / Tentativa": [],
      "RM (Agendada)": [],
      "RR (Realizada)": [],
      "Proposta": [],
      "Assinatura": [],
      "Outras fases": [],
    };
    const active: string[] = [];

    for (const src of sources) {
      if (!src.enabled) continue;
      active.push(src.buLabel);
      const rowsById = new Map<string, any[]>();
      const latestById = new Map<string, any>();
      for (const c of src.cards) {
        if (!c?.dataEntrada) continue;
        if (!rowsById.has(c.id)) rowsById.set(c.id, []);
        rowsById.get(c.id)!.push(c);
        const ex = latestById.get(c.id);
        if (!ex || c.dataEntrada > ex.dataEntrada) latestById.set(c.id, c);
      }
      for (const [id, card] of latestById.entries()) {
        const rows = rowsById.get(id) ?? [card];
        if (isWonPhase((card as any).faseAtual)) continue;
        if (isStandbyPhase((card as any).faseAtual)) continue;
        if (rows.some((r) => isLostPhase(r?.faseAtual) || isLostPhase(r?.fase) || r?.perdido === true || (r?.motivoPerda && String(r.motivoPerda).trim()))) continue;
        if (props.cardFilter && !props.cardFilter(card, src.buLabel)) continue;
        const bucket = classifyPhase((card as any).faseAtual);
        const base = src.toDetail(card);
        const source = classifyLeadSource({
          id: base.id,
          tipoOrigem: base.tipoOrigem,
          origemLead: base.origemLead,
          fonte: base.fonte,
          campanha: base.campanha,
          sdr: base.sdr,
          produto: base.product,
          titulo: base.name,
          empresa: base.company,
          bu: base.bu,
        });
        buckets[bucket].push({ ...base, bu: src.buLabel, canal: LEAD_SOURCE_LABELS[source] });
      }
    }

    const total = Object.values(buckets).reduce((a, b) => a + b.length, 0);
    return { buckets, total, activeLabels: active };
  }, [
    props.modeloAtualAnalytics,
    props.franquiaAnalytics,
    props.oxyHackerAnalytics,
    props.outboundAnalytics,
    props.selectedBUs,
    props.cardFilter,
  ]);

  if (total === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          🧭 Leads por Fase · Pipeline atual
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Foto do pipeline aberto (exclui ganhos, perdidos e standby), respeitando os filtros ativos de BU, Closer, SDR e Origem. Ignora o filtro de data.
          Escopo: <span className="font-medium">{activeLabels.join(" + ")}</span>. Clique num chip para abrir a lista.
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-2">
          {BUCKET_ORDER.map((b) => {
            const items = buckets[b];
            return (
              <button
                key={b}
                type="button"
                disabled={items.length === 0}
                onClick={() => setOpenBucket(b)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 ${BUCKET_STYLE[b]}`}
              >
                <span>{b}</span>
                <Badge variant="secondary" className="ml-1">
                  {items.length}
                </Badge>
              </button>
            );
          })}
          <div className="ml-auto text-xs text-muted-foreground">
            Total pipeline: <span className="font-medium text-foreground">{total}</span>
          </div>
        </div>
      </CardContent>

      <DetailSheet
        open={openBucket !== null}
        onOpenChange={(o) => !o && setOpenBucket(null)}
        title={openBucket ? `Leads em ${openBucket}` : ""}
        description={
          openBucket
            ? `Cards abertos classificados como ${openBucket}. Escopo: ${activeLabels.join(" + ")}.`
            : undefined
        }
        items={openBucket ? buckets[openBucket] : []}
        columns={[
          { key: "name", label: "Empresa" },
          { key: "canal", label: "Canal" },
          { key: "bu", label: "BU" },
          { key: "product", label: "Produto", format: columnFormatters.product },
          { key: "phase", label: "Fase Atual", format: columnFormatters.phase },
          { key: "sdr", label: "SDR" },
          { key: "closer", label: "Closer" },
          { key: "date", label: "Entrada", format: columnFormatters.date },
        ]}
      />
    </Card>
  );
}
