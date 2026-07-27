import { Fragment, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, ExternalLink, Users, Target, MessageCircle, Flame, Trophy, DollarSign, Ticket } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useG4RealMetrics, type G4RealLead } from "@/hooks/useG4RealMetrics";
import { fmt, fmtInt } from "@/components/planning/ceo/ceoShared";
import { DetailSheet, columnFormatters, type DetailItem } from "@/components/planning/indicators/DetailSheet";
import { DateRangePickerGA } from "@/components/planning/DateRangePickerGA";
import { cn } from "@/lib/utils";
import { isJunkCard } from "@/hooks/useModeloAtualMetas";


// ─────────── helpers ───────────
import { canonLive, parseEventDate as parseEventDateShared, classifyG4Event, type G4Categoria } from "./canonLive";

const normalize = (s: unknown) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

const isLost = (fase: string | null) => {
  const n = normalize(fase);
  return n.startsWith("perdido") || n.startsWith("perda");
};
const isWon = (fase: string | null) => normalize(fase) === "ganho";

// Whitelist oficial de vendas G4 (relatório Finders Fee — Excel).
// Só e-mails desta lista contam como venda no dashboard G4, mesmo que o card
// esteja "Ganho" no Pipefy e associado a uma live/evento.
const G4_SALES_WHITELIST_EMAILS = new Set<string>([
  "vanderson@martinelli.ind.br",
  "sidney@petromarcomercial.com.br",
  "joaopaulo@jpprojetos.com",
  "fabrizio.mazza@discabos.com.br",
  "tamara@importadorapatagonia.com.br",
  "tchauentrega@gmail.com",
  "yurijosect@gmail.com",
  "administrativo@lotuslogistica.com",
  "adm@lotuslogistica.com",
  "andre.silva@invenzi.com",
]);
// Uma venda é atribuída ao G4 quando:
//  - a base externa já marcou (venda_atribuivel_live = true e is_ganho), OU
//  - o card está "Ganho" e o e-mail está na whitelist Finders Fee (fallback).
const isG4Sale = (l: G4RealLead): boolean => {
  if (l.isGanho && l.vendaAtribuivelLive) return true;
  if (isWon(l.faseAtual) && G4_SALES_WHITELIST_EMAILS.has((l.email ?? "").toLowerCase())) return true;
  return false;
};
const IN_CONTACT_EXACT = new Set([
  "tentativas de contato",
  "reuniao marcada",
  "reunioes marcadas",
  "reuniao realizada",
  "reunioes realizadas",
]);
// Fases terminais: não contam como "em contato" (nem no fallback de ativo)
const TERMINAL_PHASES_TOKENS = ["ganho", "perdido", "perda", "arquivad", "contrato assinado", "onboarding", "em operacao", "operacao recorrente", "cancelad"];
const isTerminal = (fase: string | null) => {
  const n = normalize(fase);
  if (!n) return true;
  return TERMINAL_PHASES_TOKENS.some((t) => n.includes(t));
};
const isInContact = (fase: string | null) => {
  const n = normalize(fase);
  if (!n) return false;
  // Blacklist: leads parados em "G4 Tools" não são atendimento comercial
  if (n.includes("g4 tools") || n.includes("g4tools")) return false;
  if (IN_CONTACT_EXACT.has(n)) return true;
  if (n.includes("tentativa") && n.includes("contato")) return true;
  if (n.includes("contato") && n.includes("g4")) return true;
  if (n.includes("qualifica") && n.includes("g4")) return true;
  if (n.includes("reuniao") && (n.includes("marcada") || n.includes("realizada"))) return true;
  if (!isTerminal(fase)) return true;
  return false;
};

// MQL = faturamento mensal >= R$ 200k, inferido pelo campo `faixa`
const MQL_FAIXAS = new Set([
  "entre r$ 200 mil e r$ 350 mil",
  "entre r$ 350 mil e r$ 500 mil",
  "entre r$ 500 mil e r$ 1 milhao",
  "entre r$ 1 milhao e r$ 5 milhoes",
  "acima de r$ 5 milhoes",
]);
const isMqlByFaturamento = (faixa: string | null) => MQL_FAIXAS.has(normalize(faixa));

// Try to parse a date from the live name for sorting/filtering.
const parseEventDate = parseEventDateShared;

interface LiveGroup {
  live: string;
  date: Date | null;
  kind: "live" | "evento";
  categoria: G4Categoria;
  subcategoria: string | null;
  leads: G4RealLead[];
  inscritos: number;
  mqls: number;
  emContato: number;
  quentes: number;
  fechados: number;
  perdidos: number;
  mrr: number;
  setup: number;
  pontual: number;
  tcv: number;
  ticketMedio: number;
  wonLeads: G4RealLead[];
  lostLeads: G4RealLead[];
}

// Exclusões manuais G4 por card ID do Pipefy (extraído da pipefyUrl).
// Cards aqui NÃO contam no dashboard G4, independentemente de sinais de G4.
const MANUAL_EXCLUDED_G4_CARD_IDS = new Set<string>([
  "1317180165", // Ediouro — não fechou pelas lives/eventos G4
]);

// Overrides manuais de valores G4 quando o card no Pipefy está com valor errado
// (ex.: erro de digitação de escala). Chave = email em lowercase.
// Aplicado antes de agrupar/somar KPIs e antes da tabela/drill-down.
// Os ganhos agora vêm com valores lidos direto da API do Pipefy (g4-metrics),
// somando todos os campos de MRR/Setup/Pontual do card. Não há mais overrides.
const G4_MANUAL_VALUE_OVERRIDES: Record<
  string,
  { mrr?: number; setup?: number; pontual?: number }
> = {};


function applyG4ValueOverride(lead: G4RealLead): G4RealLead {
  const email = (lead.email ?? "").toLowerCase();
  const ov = email ? G4_MANUAL_VALUE_OVERRIDES[email] : undefined;
  if (!ov) return lead;
  const mrr = ov.mrr ?? lead.valorMRR ?? 0;
  const setup = ov.setup ?? lead.valorSetup ?? 0;
  const pontual = ov.pontual ?? lead.valorPontual ?? 0;
  // Recalcula TCV = (MRR * 12) + Setup + Pontual para manter coerência.
  const tcv = mrr * 12 + setup + pontual;
  return { ...lead, valorMRR: mrr, valorSetup: setup, valorPontual: pontual, tcv };
}

function extractPipefyCardId(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/\/(\d{6,})(?:[/?#]|$)/);
  return m ? m[1] : null;
}

// Regra de atribuição G4: exclui leads cuja origem no Pipefy é claramente não-G4
// (Colaborador O2 / Indicação / Outbound / Relacionamento), a menos que haja
// sinal G4 real no próprio lead (levantou mão, presença, diagnóstico, ou
// origem mencionando G4/Live/Aula Traction).
const NON_G4_ORIGIN_TOKENS = [
  "colaborador",
  "indicac",
  "indicaç",
  "outbound",
  "prospec",
  "relacionamento",
  "networking",
];
const TEST_EMAIL_PATTERNS = [
  "teste", "test@", "@test.", "exemplo.com", "@o2inc.com.br",
  "nao_atender", "naoatender", "no-reply", "noreply",
];
const TEST_NAME_PATTERNS = ["teste", "nao atender", "não atender", "teste erp"];
const TEST_EMAIL_EXACT = new Set([
  "dudarovani@gmail.com","jv241004@gmail.com","voce@empresa.com",
  "demo@exemplo.com","teste_nao_atender@gmail.com",
]);
export function isTestG4Lead(l: G4RealLead): boolean {
  const email = (l.email ?? "").toLowerCase();
  const nome = (l.nome ?? "").toLowerCase();
  const empresa = (l.empresa ?? "").toLowerCase();
  if (email) {
    if (TEST_EMAIL_EXACT.has(email)) return true;
    if (TEST_EMAIL_PATTERNS.some((p) => email.includes(p))) return true;
  }
  if (nome && TEST_NAME_PATTERNS.some((p) => nome.includes(p))) return true;
  if (empresa && TEST_NAME_PATTERNS.some((p) => empresa.includes(p))) return true;
  // Delegação para o detector global de junk (cobre "testeg4", "testejv", "testenormal1", etc.)
  if (isJunkCard({ titulo: l.nome, empresa: l.empresa, email: l.email })) return true;
  return false;
}
export function isG4Attributed(l: G4RealLead): boolean {
  // Testes nunca entram
  if (isTestG4Lead(l)) return false;
  // Exclusão manual sempre vence (usa cardId direto do lead se existir)
  const cardId = l.cardId ?? extractPipefyCardId(l.pipefyUrl);
  if (cardId && MANUAL_EXCLUDED_G4_CARD_IDS.has(cardId)) return false;

  // Vendas atribuídas pela base externa sempre entram
  if (l.vendaAtribuivelLive) return true;
  // Whitelist Finders Fee: sempre atribui ao G4
  if (G4_SALES_WHITELIST_EMAILS.has((l.email ?? "").toLowerCase())) return true;

  const origem = normalize(`${l.origemLead ?? ""} ${l.tipoOrigemLead ?? ""}`);
  // Whitelist por sinal G4 forte no próprio lead
  const hasG4Signal =
    l.levantouMao ||
    l.presenteAlgumaLive ||
    l.fezDiagnostico ||
    origem.includes("g4") ||
    origem.includes("live") ||
    origem.includes("aula traction") ||
    origem.includes("traction");
  if (hasG4Signal) return true;
  // Blacklist por origem não-G4
  if (origem && NON_G4_ORIGIN_TOKENS.some((t) => origem.includes(t))) return false;
  // Sem sinal e sem blacklist: mantém (comportamento atual)
  return true;
}

// Rótulos canônicos de buckets especiais.
const FINDERS_FEE_LABEL = "G4 - Finders Fee (fora das lives)";
const TALK_SE_LABEL = "Talk SE - 25/06/2026";

// Atribuição manual de vendas a um evento específico (decisão comercial).
// Sobrescreve TODAS as lives do lead — ele deixa de contar na live original.
const G4_SALE_EVENT_OVERRIDE: { match: (l: G4RealLead) => boolean; group: string }[] = [
  // Lotus, Stillus Home e Tchau Entrega vieram do Talk SE de 25/06.
  {
    group: TALK_SE_LABEL,
    match: (l) => {
      const email = (l.email ?? "").toLowerCase();
      const who = normalize(`${l.empresa ?? ""} ${l.nome ?? ""}`);
      return (
        email.includes("lotuslogistica") ||
        email === "tchauentrega@gmail.com" ||
        who.includes("lotus logistica") ||
        who.includes("stillus") ||
        who.includes("tchau entrega")
      );
    },
  },
  // Petromar não veio de live: é Finders Fee.
  {
    group: FINDERS_FEE_LABEL,
    match: (l) => {
      const email = (l.email ?? "").toLowerCase();
      const who = normalize(`${l.empresa ?? ""} ${l.nome ?? ""}`);
      return email === "sidney@petromarcomercial.com.br" || who.includes("petromar");
    },
  },
];

function overrideSaleGroup(lead: G4RealLead): string | null {
  if (!isG4Sale(lead)) return null;
  for (const rule of G4_SALE_EVENT_OVERRIDE) if (rule.match(lead)) return rule.group;
  return null;
}

// Para vendas com múltiplas lives assistidas, atribui apenas à live mais próxima
// da data de ganho (evita contar a mesma venda em várias lives).
function pickClosestLive(lives: string[], dataGanho?: string | null): string[] {
  if (lives.length <= 1) return lives;
  const ganhoDate = dataGanho ? new Date(dataGanho) : null;
  if (!ganhoDate || isNaN(ganhoDate.getTime())) {
    // Sem data de ganho: usa a última live do array (mais recente registrada).
    return [lives[lives.length - 1]];
  }
  const ganhoMs = ganhoDate.getTime();
  let best = lives[0];
  let bestDiff = Infinity;
  for (const raw of lives) {
    const d = parseEventDateShared(canonLive(raw));
    const diff = d ? Math.abs(d.getTime() - ganhoMs) : Infinity;
    if (diff < bestDiff) {
      bestDiff = diff;
      best = raw;
    }
  }
  return [best];
}


function computeGroup(live: string, list: G4RealLead[]): LiveGroup {
  const seen = new Set<string>();
  const uniq = list.filter((l) => {
    const k = (l.email ?? l.nome ?? "").toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const won = uniq.filter(isG4Sale);
  const lost = uniq.filter((l) => isLost(l.faseAtual));
  let mrr = 0, setup = 0, pontual = 0, tcv = 0;
  for (const w of won) {
    mrr += w.valorMRR ?? 0;
    setup += w.valorSetup ?? 0;
    pontual += w.valorPontual ?? 0;
    tcv += w.tcv ?? 0;
  }
  const ticketSum = won.reduce(
    (a, w) => a + (w.valorSetup ?? 0) + (w.valorMRR ?? 0) + (w.valorPontual ?? 0),
    0,
  );
  const cls = classifyG4Event(live);
  return {
    live,
    date: parseEventDate(live),
    kind: cls.categoria === "Live" ? "live" : "evento",
    categoria: cls.categoria,
    subcategoria: cls.subcategoria,
    leads: uniq,
    inscritos: uniq.length,
    mqls: uniq.filter((l) => isMqlByFaturamento(l.faixa)).length,
    emContato: uniq.filter((l) => isInContact(l.faseAtual)).length,
    quentes: uniq.filter((l) => l.temperatura === "Quente" && !isG4Sale(l) && !isWon(l.faseAtual)).length,
    fechados: won.length,
    perdidos: lost.length,
    mrr, setup, pontual, tcv,
    ticketMedio: won.length ? ticketSum / won.length : 0,
    wonLeads: won,
    lostLeads: lost,
  };
}

function buildGroups(leads: G4RealLead[]): LiveGroup[] {
  const filtered = leads.filter(isG4Attributed);
  const byLive = new Map<string, G4RealLead[]>();
  for (const lead of filtered) {
    // Atribuição manual (Talk SE / Finders Fee) vence qualquer live registrada.
    const forced = overrideSaleGroup(lead);
    // Whitelist de vendas sem live associada cai no bucket "Finders Fee".
    let lives = forced
      ? [forced]
      : lead.lives.length > 0
        ? lead.lives
        : (isG4Sale(lead) ? [FINDERS_FEE_LABEL] : []);
    // Vendas só contam em UMA live (a mais próxima da data de ganho).
    if (!forced && isG4Sale(lead) && lives.length > 1) {
      lives = pickClosestLive(lives, lead.dataGanho);
    }
    for (const rawLive of lives) {
      const live = rawLive === FINDERS_FEE_LABEL ? rawLive : canonLive(rawLive);
      if (!byLive.has(live)) byLive.set(live, []);
      byLive.get(live)!.push(lead);
    }
  }

  const groups: LiveGroup[] = [];
  for (const [live, list] of byLive.entries()) {
    groups.push(computeGroup(live, list));
  }
  return groups.sort((a, b) => {
    if (a.date && b.date) return a.date.getTime() - b.date.getTime();
    return a.live.localeCompare(b.live);
  });
}


// ─────────── Árvore de categorias (Live › Palestras › Eventos) ───────────
interface Agg {
  inscritos: number;
  mqls: number;
  emContato: number;
  quentes: number;
  fechados: number;
  perdidos: number;
  mrr: number;
  setup: number;
  pontual: number;
  tcv: number;
}
const emptyAgg = (): Agg => ({
  inscritos: 0, mqls: 0, emContato: 0, quentes: 0, fechados: 0,
  perdidos: 0, mrr: 0, setup: 0, pontual: 0, tcv: 0,
});
// Agregação de um conjunto de LiveGroups DEDUPLICANDO leads por email/nome
// (um lead que aparece em várias lives conta 1x no total da categoria).
// Vendas G4 já são atribuídas a UMA única live via pickClosestLive, então
// somamos os valores monetários apenas dos leads únicos marcados como ganho.
function aggFromGroups(list: LiveGroup[]): Agg {
  const seen = new Set<string>();
  const uniq: G4RealLead[] = [];
  for (const g of list) {
    for (const l of g.leads) {
      const k = (l.email ?? l.nome ?? "").toLowerCase();
      if (!k || seen.has(k)) continue;
      seen.add(k);
      uniq.push(l);
    }
  }
  const won = uniq.filter(isG4Sale);
  const lost = uniq.filter((l) => isLost(l.faseAtual));
  return {
    inscritos: uniq.length,
    mqls: uniq.filter((l) => isMqlByFaturamento(l.faixa)).length,
    emContato: uniq.filter((l) => isInContact(l.faseAtual)).length,
    quentes: uniq.filter((l) => l.temperatura === "Quente" && !isG4Sale(l) && !isWon(l.faseAtual)).length,
    fechados: won.length,
    perdidos: lost.length,
    mrr: won.reduce((a, w) => a + (w.valorMRR ?? 0), 0),
    setup: won.reduce((a, w) => a + (w.valorSetup ?? 0), 0),
    pontual: won.reduce((a, w) => a + (w.valorPontual ?? 0), 0),
    tcv: won.reduce((a, w) => a + (w.tcv ?? 0), 0),
  };
}
const aggTicket = (a: Agg) => (a.fechados ? (a.mrr + a.setup + a.pontual) / a.fechados : 0);
const aggConv = (a: Agg) => (a.inscritos ? (a.fechados / a.inscritos) * 100 : 0);

// Métricas normalizadas de uma linha da tabela (agregado de categoria/sub ou item folha).
interface RowMetrics {
  inscritos: number;
  mqls: number;
  emContato: number;
  quentes: number;
  fechados: number;
  conv: number;
  perdidos: number;
  mrr: number;
  setup: number;
  pontual: number;
  tcv: number;
  ticketMedio: number;
}
const aggMetrics = (a: Agg): RowMetrics => ({
  inscritos: a.inscritos, mqls: a.mqls, emContato: a.emContato, quentes: a.quentes, fechados: a.fechados,
  conv: aggConv(a), perdidos: a.perdidos, mrr: a.mrr, setup: a.setup, pontual: a.pontual, tcv: a.tcv, ticketMedio: aggTicket(a),
});


interface ItemNode {
  kind: "item";
  key: string;
  label: string;
  groups: LiveGroup[]; // eventos reais que compõem o item (vazio = placeholder do esqueleto)
  agg: Agg;
  match?: (n: string) => boolean; // encaixa eventos futuros neste bucket fixo
}
interface SubNode {
  kind: "sub";
  key: string;
  label: string;
  agg: Agg;
  groups: LiveGroup[];
  items: ItemNode[];
}
interface CatNode {
  key: string;
  label: G4Categoria;
  agg: Agg;
  groups: LiveGroup[];
  subs: SubNode[];
  directItems: ItemNode[]; // itens sem subcategoria (lives/eventos reais)
}

// Esqueleto fixo: estas categorias / subcategorias / itens aparecem SEMPRE,
// mesmo zerados. Eventos reais (inclusive futuros) se encaixam pelos matchers.
interface ScaffoldCat {
  categoria: G4Categoria;
  subs: { label: string; items: { label: string; match: (n: string) => boolean }[] }[];
}
const SCAFFOLD: ScaffoldCat[] = [
  { categoria: "Live", subs: [] },
  {
    categoria: "Palestras",
    subs: [
      {
        label: "Talks",
        items: [
          { label: "Talks SE", match: (n) => /\bse\b/.test(n) },
          { label: "Talks Connect", match: (n) => n.includes("connect") },
          { label: "Talks Traction", match: (n) => n.includes("traction") },
        ],
      },
    ],
  },
  { categoria: "Eventos", subs: [] },
];

// Monta a árvore a partir do esqueleto fixo e encaixa os grupos reais.
// Aggregates são calculados por dedupe de leads (não soma de contadores),
// para que categoria/sub totalize leads únicos (um lead em 2 lives conta 1x).
function buildTree(groups: LiveGroup[]): CatNode[] {
  const cats: CatNode[] = SCAFFOLD.map((sc) => ({
    key: `cat:${sc.categoria}`,
    label: sc.categoria,
    agg: emptyAgg(),
    groups: [],
    subs: sc.subs.map((ss) => ({
      kind: "sub" as const,
      key: `sub:${sc.categoria}:${ss.label}`,
      label: ss.label,
      agg: emptyAgg(),
      groups: [],
      items: ss.items.map((si) => ({
        kind: "item" as const,
        key: `item:${sc.categoria}:${ss.label}:${si.label}`,
        label: si.label,
        groups: [] as LiveGroup[],
        agg: emptyAgg(),
        match: si.match,
      })),
    })),
    directItems: [],
  }));
  const byName = new Map(cats.map((c) => [c.label, c]));

  for (const g of groups) {
    const cat = byName.get(g.categoria);
    if (!cat) continue; // categoria fora do esqueleto (não deve ocorrer)
    cat.groups.push(g);
    if (g.subcategoria) {
      let sub = cat.subs.find((s) => s.label === g.subcategoria);
      if (!sub) {
        sub = { kind: "sub", key: `sub:${g.categoria}:${g.subcategoria}`, label: g.subcategoria, agg: emptyAgg(), groups: [], items: [] };
        cat.subs.push(sub);
      }
      sub.groups.push(g);
      const n = normalize(g.live);
      let item = sub.items.find((it) => it.match && it.match(n));
      if (!item) {
        item = { kind: "item", key: `item:${g.live}`, label: g.live, groups: [], agg: emptyAgg() };
        sub.items.push(item);
      }
      item.groups.push(g);
    } else {
      cat.directItems.push({ kind: "item", key: `item:${g.live}`, label: g.live, groups: [g], agg: emptyAgg() });
    }
  }

  // Calcula aggs após popular groups em cada nó (com dedupe por lead).
  for (const cat of cats) {
    cat.agg = aggFromGroups(cat.groups);
    for (const sub of cat.subs) {
      sub.agg = aggFromGroups(sub.groups);
      for (const item of sub.items) item.agg = aggFromGroups(item.groups);
    }
    for (const item of cat.directItems) item.agg = aggFromGroups(item.groups);
  }
  return cats;
}


// LiveGroup sintético (soma dedup por email) para abrir o drill de um item que agrega vários eventos.
function mergeGroups(list: LiveGroup[], label: string): LiveGroup {
  const seen = new Set<string>();
  const leads: G4RealLead[] = [];
  for (const g of list)
    for (const l of g.leads) {
      const k = (l.email ?? l.nome ?? "").toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      leads.push(l);
    }
  const won = leads.filter(isG4Sale);
  const lost = leads.filter((l) => isLost(l.faseAtual));
  let mrr = 0, setup = 0, pontual = 0, tcv = 0;
  for (const w of won) {
    mrr += w.valorMRR ?? 0;
    setup += w.valorSetup ?? 0;
    pontual += w.valorPontual ?? 0;
    tcv += w.tcv ?? 0;
  }
  const ticketSum = won.reduce((a, w) => a + (w.valorSetup ?? 0) + (w.valorMRR ?? 0) + (w.valorPontual ?? 0), 0);
  return {
    live: label,
    date: null,
    kind: list[0]?.kind ?? "evento",
    categoria: list[0]?.categoria ?? "Palestras",
    subcategoria: list[0]?.subcategoria ?? null,
    leads,
    inscritos: leads.length,
    mqls: leads.filter((l) => isMqlByFaturamento(l.faixa)).length,
    emContato: leads.filter((l) => isInContact(l.faseAtual)).length,
    quentes: leads.filter((l) => l.temperatura === "Quente" && !isG4Sale(l) && !isWon(l.faseAtual)).length,
    fechados: won.length,
    perdidos: lost.length,
    mrr, setup, pontual, tcv,
    ticketMedio: won.length ? ticketSum / won.length : 0,
    wonLeads: won,
    lostLeads: lost,
  };
}

const CAT_BADGE: Record<G4Categoria, string> = {
  Live: "border-primary/40 text-primary",
  Palestras: "border-violet-500/40 text-violet-600 dark:text-violet-400",
  Eventos: "border-orange-500/40 text-orange-600 dark:text-orange-400",
};


// ─────────── UI atoms ───────────
function Kpi({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  onClick,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: typeof Users;
  tone?: "default" | "primary" | "warning" | "success";
  onClick?: () => void;
}) {
  const toneCls =
    tone === "primary"
      ? "text-primary"
      : tone === "warning"
      ? "text-orange-500 dark:text-orange-400"
      : tone === "success"
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-foreground";
  return (
    <Card
      className={cn(
        "border-border/60",
        onClick && "cursor-pointer hover:border-primary/60 hover:shadow-sm transition-all",
      )}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
          <Icon className={cn("h-3.5 w-3.5", toneCls)} />
        </div>
        <div className={cn("mt-1 text-xl font-semibold tabular-nums", toneCls)}>{value}</div>
        {hint && <div className="text-[10px] text-muted-foreground mt-0.5">{hint}</div>}
      </CardContent>
    </Card>
  );
}

function MoneyCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-background p-3 text-center">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold tabular-nums text-foreground">{fmt(value)}</div>
    </div>
  );
}

function ClickCell({
  onClick,
  tone,
  children,
}: {
  onClick: () => void;
  tone?: "warning" | "success" | "destructive";
  children: React.ReactNode;
}) {
  const toneCls =
    tone === "warning"
      ? "text-orange-600 dark:text-orange-400"
      : tone === "success"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "destructive"
      ? "text-destructive"
      : "";
  return (
    <td className="px-2 py-2 text-right tabular-nums">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className={cn(
          "hover:underline decoration-dotted underline-offset-2 hover:text-primary transition-colors",
          toneCls,
        )}
      >
        {children}
      </button>
    </td>
  );
}


function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-2">
      <h5 className="text-xs font-semibold text-foreground">{title}</h5>
      {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

// ─────────── Drill-down ───────────
function ExpandedRow({ group }: { group: LiveGroup }) {
  const phaseCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of group.leads) {
      const key = l.faseAtual ?? "— sem fase —";
      m.set(key, (m.get(key) ?? 0) + 1);
    }
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [group]);

  const tempCounts = useMemo(() => {
    const m = { Quente: 0, Morno: 0, Frio: 0, "Sem tag": 0 } as Record<string, number>;
    for (const l of group.leads) {
      if (l.temperatura === "Quente" && (isG4Sale(l) || isWon(l.faseAtual))) continue;
      if (l.temperatura) m[l.temperatura]++;
      else m["Sem tag"]++;
    }
    return m;
  }, [group]);

  const lostByReason = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of group.lostLeads) {
      const key = l.motivoPerda?.trim() || "— sem motivo —";
      m.set(key, (m.get(key) ?? 0) + 1);
    }
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [group]);

  return (
    <div className="bg-muted/20 border-t p-4">
      <Tabs defaultValue="fases">
        <TabsList>
          <TabsTrigger value="fases">Por fase ({phaseCounts.length})</TabsTrigger>
          <TabsTrigger value="temperatura">Temperatura</TabsTrigger>
          <TabsTrigger value="perdidos">Perdidos ({group.perdidos})</TabsTrigger>
          <TabsTrigger value="vendas">Vendas ({group.fechados})</TabsTrigger>
        </TabsList>

        <TabsContent value="fases" className="mt-3">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {phaseCounts.map(([fase, count]) => (
              <div key={fase} className="flex items-center justify-between rounded-md border bg-background px-3 py-2 text-xs">
                <span className="truncate text-foreground">{fase}</span>
                <span className="font-semibold tabular-nums text-foreground">{count}</span>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="temperatura" className="mt-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {Object.entries(tempCounts).map(([k, v]) => (
              <div key={k} className="rounded-md border bg-background p-3 text-center">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{k}</div>
                <div className="text-xl font-semibold tabular-nums text-foreground">{v}</div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="perdidos" className="mt-3 space-y-3">
          {lostByReason.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum lead perdido.</p>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {lostByReason.map(([motivo, count]) => (
                  <div key={motivo} className="flex items-center justify-between rounded-md border bg-background px-3 py-2 text-xs">
                    <span className="truncate text-foreground">{motivo}</span>
                    <Badge variant="destructive" className="text-[10px]">{count}</Badge>
                  </div>
                ))}
              </div>
              <LeadsTable leads={group.lostLeads} showReason />
            </>
          )}
        </TabsContent>

        <TabsContent value="vendas" className="mt-3">
          {group.wonLeads.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhuma venda fechada.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
                <MoneyCard label="MRR" value={group.mrr} />
                <MoneyCard label="Setup" value={group.setup} />
                <MoneyCard label="Pontual" value={group.pontual} />
                <MoneyCard label="TCV" value={group.tcv} />
                <MoneyCard label="Ticket médio" value={group.ticketMedio} />
              </div>
              <LeadsTable leads={group.wonLeads} showMoney />
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LeadsTable({
  leads,
  showMoney = false,
  showReason = false,
}: {
  leads: G4RealLead[];
  showMoney?: boolean;
  showReason?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-md border bg-background">
      <table className="w-full text-xs">
        <thead className="bg-muted/40 text-muted-foreground">
          <tr>
            <th className="px-2 py-1.5 text-left">Empresa</th>
            <th className="px-2 py-1.5 text-left">Contato</th>
            <th className="px-2 py-1.5 text-left">Closer</th>
            <th className="px-2 py-1.5 text-left">Fase</th>
            {showReason && <th className="px-2 py-1.5 text-left">Motivo</th>}
            {showMoney && (
              <>
                <th className="px-2 py-1.5 text-right">MRR</th>
                <th className="px-2 py-1.5 text-right">Setup</th>
                <th className="px-2 py-1.5 text-right">Pontual</th>
                <th className="px-2 py-1.5 text-right">TCV</th>
              </>
            )}
            <th className="px-2 py-1.5" />
          </tr>
        </thead>
        <tbody>
          {leads.map((l, i) => (
            <tr key={`${l.email ?? l.nome ?? i}-${i}`} className="border-t">
              <td className="px-2 py-1.5 text-foreground">{l.empresa ?? "—"}</td>
              <td className="px-2 py-1.5 text-muted-foreground">{l.nome ?? "—"}</td>
              <td className="px-2 py-1.5 text-muted-foreground">{l.closer ?? "—"}</td>
              <td className="px-2 py-1.5 text-muted-foreground">{l.faseAtual ?? "—"}</td>
              {showReason && (
                <td className="px-2 py-1.5 text-muted-foreground">{l.motivoPerda ?? "—"}</td>
              )}
              {showMoney && (
                <>
                  <td className="px-2 py-1.5 text-right tabular-nums">{l.valorMRR != null ? fmt(l.valorMRR) : "—"}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{l.valorSetup != null ? fmt(l.valorSetup) : "—"}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{l.valorPontual != null ? fmt(l.valorPontual) : "—"}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{l.tcv != null ? fmt(l.tcv) : "—"}</td>
                </>
              )}
              <td className="px-2 py-1.5 text-right">
                {l.pipefyUrl && (
                  <a
                    href={l.pipefyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    Pipefy <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─────────── Main ───────────
type KindFilter = "todos" | "live" | "evento";

export function G4ConsolidatedDashboard() {
  const { data, isLoading } = useG4RealMetrics();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const fresh = await refreshG4Metrics();
      queryClient.setQueryData(["g4-real-metrics"], fresh);
    } catch (e) {
      console.error("Falha ao atualizar dados do G4", e);
    } finally {
      setRefreshing(false);
    }
  };
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const [kind, setKind] = useState<KindFilter>("todos");
  // Filtro de data: null = "Tudo" (default). Quando setado, filtra por g.date.
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | null>(null);
  const [includeUndated, setIncludeUndated] = useState(true);

  // Drill-down state
  const [drillOpen, setDrillOpen] = useState(false);
  const [drillTitle, setDrillTitle] = useState("");
  const [drillDesc, setDrillDesc] = useState("");
  const [drillItems, setDrillItems] = useState<DetailItem[]>([]);
  const [drillMode, setDrillMode] = useState<"basic" | "money" | "lost">("basic");

  // Aplica overrides manuais (Martinelli etc.) uma vez, antes de tudo.
  const overriddenLeads = useMemo(
    () => (data ? data.leads.map(applyG4ValueOverride) : []),
    [data],
  );
  const allGroups = useMemo(() => buildGroups(overriddenLeads), [overriddenLeads]);


  const groups = useMemo(() => {
    const fromT = dateRange ? dateRange.from.getTime() : null;
    const toT = dateRange ? dateRange.to.getTime() : null;
    const inRange = (ms: number) => (fromT === null || toT === null) || (ms >= fromT && ms <= toT);
    const out: LiveGroup[] = [];
    for (const g of allGroups) {
      if (kind !== "todos" && g.kind !== kind) continue;
      if (fromT === null) { out.push(g); continue; }
      if (g.date) {
        if (inRange(g.date.getTime())) out.push(g);
        continue;
      }
      // Grupo sem data de live/evento (ex.: Finders Fee): filtra leads por
      // data de criação do card no Pipefy (fallback).
      const kept: G4RealLead[] = [];
      let hadUndated = false;
      for (const l of g.leads) {
        const created = l.dataEntradaPipe ? new Date(l.dataEntradaPipe).getTime() : NaN;
        if (!Number.isFinite(created)) { hadUndated = true; continue; }
        if (inRange(created)) kept.push(l);
      }
      if (kept.length > 0) out.push(computeGroup(g.live, kept));
      else if (includeUndated && hadUndated) out.push(g);
    }
    return out;
  }, [allGroups, kind, dateRange, includeUndated]);



  const totals = useMemo(() => {
    // Deduplica leads por email/nome ao longo de todos os groups visíveis
    // para que os KPIs batam com os drill-downs (que também deduplicam).
    const seen = new Set<string>();
    const uniq: G4RealLead[] = [];
    for (const g of groups) {
      for (const l of g.leads) {
        const k = (l.email ?? l.nome ?? "").toLowerCase();
        if (!k || seen.has(k)) continue;
        seen.add(k);
        uniq.push(l);
      }
    }
    const won = uniq.filter(isG4Sale);
    const acc = {
      inscritos: uniq.length,
      mqls: uniq.filter((l) => isMqlByFaturamento(l.faixa)).length,
      emContato: uniq.filter((l) => isInContact(l.faseAtual)).length,
      quentes: uniq.filter((l) => l.temperatura === "Quente" && !isG4Sale(l) && !isWon(l.faseAtual)).length,
      fechados: won.length,
      perdidos: uniq.filter((l) => isLost(l.faseAtual)).length,
      mrr: won.reduce((a, w) => a + (w.valorMRR ?? 0), 0),
      setup: won.reduce((a, w) => a + (w.valorSetup ?? 0), 0),
      pontual: won.reduce((a, w) => a + (w.valorPontual ?? 0), 0),
      tcv: won.reduce((a, w) => a + (w.tcv ?? 0), 0),
    };
    return acc;
  }, [groups]);


  // Finders Fee é uma seção à parte: sai da árvore Live/Palestras/Eventos.
  const findersGroup = useMemo(
    () => groups.find((g) => g.live === FINDERS_FEE_LABEL) ?? null,
    [groups],
  );
  const treeGroups = useMemo(
    () => groups.filter((g) => g.live !== FINDERS_FEE_LABEL),
    [groups],
  );

  const tree = useMemo(() => buildTree(treeGroups), [treeGroups]);

  // Chaves de categoria/subcategoria (não inclui itens folha, que abrem o drill).
  const expandableKeys = useMemo(() => {
    const keys: string[] = [];
    for (const cat of tree) {
      keys.push(cat.key);
      for (const sub of cat.subs) keys.push(sub.key);
    }
    return keys;
  }, [tree]);
  const allOpen = expandableKeys.length > 0 && expandableKeys.every((k) => expanded.has(k));

  const ticketMedioGeral =
    totals.fechados > 0 ? (totals.mrr + totals.setup + totals.pontual) / totals.fechados : 0;
  const convMql = totals.inscritos ? Math.round((totals.mqls / totals.inscritos) * 100) : 0;
  const closeRate = totals.inscritos ? ((totals.fechados / totals.inscritos) * 100).toFixed(1) : "0";

  const toggle = (live: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(live) ? next.delete(live) : next.add(live);
      return next;
    });

  // ─── drill-down helpers ───
  const cardIdFromUrl = (url: string | null): string => {
    if (!url) return "";
    const m = url.match(/open-cards\/(\d+)/);
    return m ? m[1] : "";
  };
  const leadsToItems = (leads: G4RealLead[]): DetailItem[] =>
    leads.map((l, i) => ({
      id: cardIdFromUrl(l.pipefyUrl) || `${l.email ?? "no-email"}-${i}`,
      name: l.nome ?? "—",
      company: l.empresa ?? "—",
      phase: l.faseAtual ?? "—",
      closer: l.closer ?? "—",
      sdr: l.sdr ?? "—",
      revenueRange: l.faixa ?? undefined,
      mrr: l.valorMRR ?? undefined,
      setup: l.valorSetup ?? undefined,
      pontual: l.valorPontual ?? undefined,
      total: l.tcv ?? undefined,
      reason: l.motivoPerda ?? undefined,
    }));

  type Mode = "all" | "mql" | "contato" | "quente" | "ganho" | "perdido";
  const filterLeads = (leads: G4RealLead[], mode: Mode): G4RealLead[] => {
    switch (mode) {
      case "mql": return leads.filter((l) => isMqlByFaturamento(l.faixa));
      case "contato": return leads.filter((l) => isInContact(l.faseAtual));
      case "quente": return leads.filter((l) => l.temperatura === "Quente" && !isG4Sale(l) && !isWon(l.faseAtual));
      case "ganho": return leads.filter(isG4Sale);
      case "perdido": return leads.filter((l) => isLost(l.faseAtual));
      default: return leads;
    }
  };

  const openDrill = (title: string, mode: Mode, groupsSubset: LiveGroup[], desc?: string) => {
    // Dedup leads across groups by email
    const seen = new Set<string>();
    const merged: G4RealLead[] = [];
    for (const g of groupsSubset) {
      for (const l of g.leads) {
        const k = (l.email ?? l.nome ?? "").toLowerCase();
        if (seen.has(k)) continue;
        seen.add(k);
        merged.push(l);
      }
    }
    const filtered = filterLeads(merged, mode);
    setDrillTitle(title);
    setDrillDesc(desc ?? `${filtered.length} registro(s) — dados vindos de g4-metrics (leads G4 + Pipefy).`);
    setDrillMode(mode === "ganho" ? "money" : mode === "perdido" ? "lost" : "basic");
    setDrillItems(leadsToItems(filtered));
    setDrillOpen(true);
  };

  const drillColumns = useMemo(() => {
    const base = [
      { key: "company" as const, label: "Empresa" },
      { key: "name" as const, label: "Contato" },
      { key: "phase" as const, label: "Fase Atual", format: columnFormatters.phase },
      { key: "closer" as const, label: "Closer" },
      { key: "revenueRange" as const, label: "Faixa" },
    ];
    if (drillMode === "money") {
      return [
        ...base,
        { key: "mrr" as const, label: "MRR", format: columnFormatters.currency },
        { key: "setup" as const, label: "Setup", format: columnFormatters.currency },
        { key: "pontual" as const, label: "Pontual", format: columnFormatters.currency },
        { key: "total" as const, label: "TCV", format: columnFormatters.currency },
      ];
    }
    if (drillMode === "lost") {
      return [...base, { key: "reason" as const, label: "Motivo", format: columnFormatters.reason }];
    }
    return base;
  }, [drillMode]);

  const FilterPill = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
    <button
      onClick={onClick}
      className={cn(
        "px-2.5 py-1 text-[11px] rounded-md border transition-colors",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background text-muted-foreground border-border hover:text-foreground",
      )}
    >
      {label}
    </button>
  );

  // 12 células de métrica (Leads → Ticket médio), cada número abre o drill filtrado.
  const rowMetricCells = (m: RowMetrics, drillGroups: LiveGroup[], label: string) => (
    <>
      <ClickCell onClick={() => openDrill(`Leads · ${label}`, "all", drillGroups)}>{fmtInt(m.inscritos)}</ClickCell>
      <ClickCell onClick={() => openDrill(`MQLs · ${label}`, "mql", drillGroups)}>{fmtInt(m.mqls)}</ClickCell>
      <ClickCell onClick={() => openDrill(`Em contato · ${label}`, "contato", drillGroups)}>{fmtInt(m.emContato)}</ClickCell>
      <ClickCell onClick={() => openDrill(`Quentes · ${label}`, "quente", drillGroups)} tone="warning">{fmtInt(m.quentes)}</ClickCell>
      <ClickCell onClick={() => openDrill(`Vendas · ${label}`, "ganho", drillGroups)} tone="success">{fmtInt(m.fechados)}</ClickCell>
      <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">{m.conv.toFixed(1)}%</td>
      <ClickCell onClick={() => openDrill(`Perdidos · ${label}`, "perdido", drillGroups)} tone="destructive">{fmtInt(m.perdidos)}</ClickCell>
      <ClickCell onClick={() => openDrill(`Vendas · ${label}`, "ganho", drillGroups)}>{fmt(m.mrr)}</ClickCell>
      <ClickCell onClick={() => openDrill(`Vendas · ${label}`, "ganho", drillGroups)}>{fmt(m.setup)}</ClickCell>
      <ClickCell onClick={() => openDrill(`Vendas · ${label}`, "ganho", drillGroups)}>{fmt(m.pontual)}</ClickCell>
      <ClickCell onClick={() => openDrill(`Vendas · ${label}`, "ganho", drillGroups)}>{fmt(m.tcv)}</ClickCell>
      <ClickCell onClick={() => openDrill(`Vendas · ${label}`, "ganho", drillGroups)}>{fmt(m.ticketMedio)}</ClickCell>
    </>
  );

  // Linha folha: item (live/evento real, agregador de talks, ou placeholder vazio do esqueleto).
  // Com dados → clicar abre o drill de fases/temperatura/perdas/vendas. Vazio → linha zerada, não clicável.
  const renderItemRow = (item: ItemNode, catLabel: G4Categoria, indent: number) => {
    const hasData = item.groups.length > 0;
    const open = expanded.has(item.key);
    const padLeft = indent >= 2 ? "pl-12" : "pl-8";
    const drillGroup =
      item.groups.length === 1 ? item.groups[0] : hasData ? mergeGroups(item.groups, item.label) : null;
    const badgeLabel =
      catLabel === "Live" ? "LIVE" : catLabel === "Palestras" ? "TALK" : "EVENTO";

    return (
      <Fragment key={item.key}>
        <tr
          className={cn(
            "border-t",
            hasData ? "hover:bg-muted/30 cursor-pointer" : "opacity-50",
            item.agg.fechados > 0 && "bg-emerald-500/5",
          )}
          onClick={hasData ? () => toggle(item.key) : undefined}
        >
          <td className="px-2 py-2">
            {hasData ? (open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />) : null}
          </td>
          <td className={cn("px-2 py-2 text-foreground", padLeft)}>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0", CAT_BADGE[catLabel])}>
                {badgeLabel}
              </Badge>
              {item.label}
            </div>
          </td>
          {rowMetricCells(aggMetrics(item.agg), item.groups, item.label)}
        </tr>
        {hasData && open && drillGroup && (
          <tr>
            <td colSpan={14} className="p-0">
              <ExpandedRow group={drillGroup} />
            </td>
          </tr>
        )}
      </Fragment>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-foreground">Dashboard Consolidado G4 · Live + Evento</h4>
            <p className="text-xs text-muted-foreground">
              Indicadores e consolidado por categoria (Live · Palestras · Eventos), com drill-down por fase, temperatura, perdas e vendas.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1">
              <FilterPill label="Todos" active={kind === "todos"} onClick={() => setKind("todos")} />
              <FilterPill label="Lives" active={kind === "live"} onClick={() => setKind("live")} />
              <FilterPill label="Eventos" active={kind === "evento"} onClick={() => setKind("evento")} />
            </div>
            <div className="w-px h-5 bg-border" />
            <FilterPill
              label="Tudo"
              active={dateRange === null}
              onClick={() => setDateRange(null)}
            />
            <DateRangePickerGA
              startDate={dateRange?.from ?? new Date(2026, 0, 1)}
              endDate={dateRange?.to ?? new Date()}
              onDateChange={(from, to) => setDateRange({ from, to })}
            />
            {dateRange !== null && (
              <label
                className="flex items-center gap-1 text-[11px] text-muted-foreground"
                title="Leads em grupos sem data de live (ex.: Finders Fee) são filtrados pela data de criação do card no Pipefy. Marque para incluir também os que não têm nem data de criação."
              >
                <input
                  type="checkbox"
                  checked={includeUndated}
                  onChange={(e) => setIncludeUndated(e.target.checked)}
                  className="h-3 w-3"
                />
                Incluir sem data
              </label>
            )}
            <div className="w-px h-5 bg-border" />
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="text-[11px] px-2 py-1 rounded-md border border-border text-muted-foreground hover:bg-muted disabled:opacity-60"
              title="Recalcula os dados direto do banco G4 e do Pipefy"
            >
              {refreshing ? "Atualizando…" : "Atualizar"}
            </button>
            {data?.generatedAt && (
              <span className="text-[11px] text-muted-foreground">
                dados de {new Date(data.generatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>


        </CardContent>
      </Card>

      {isLoading ? (
        <div className="h-64 rounded-md border bg-muted/20 animate-pulse" />
      ) : groups.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Sem dados para os filtros selecionados.</CardContent></Card>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            <Kpi label="Leads" value={fmtInt(totals.inscritos)} icon={Users}
              onClick={() => openDrill("Leads G4 · Consolidado", "all", groups)} />

            <Kpi label="MQLs ≥ R$ 200k" value={fmtInt(totals.mqls)} hint={`${convMql}% dos leads`} icon={Target} tone="primary"
              onClick={() => openDrill("MQLs · Faturamento ≥ R$ 200k/mês", "mql", groups)} />
            <Kpi label="Em contato" value={fmtInt(totals.emContato)} icon={MessageCircle}
              onClick={() => openDrill("Leads em contato", "contato", groups)} />
            <Kpi label="Quentes" value={fmtInt(totals.quentes)} icon={Flame} tone="warning"
              hint={totals.quentes === 0 ? "Sem tag Quente ativa no Pipefy" : undefined}
              onClick={() => openDrill("Leads Quentes", "quente", groups)} />

            <Kpi label="Fechados" value={fmtInt(totals.fechados)} hint={`${closeRate}% close rate`} icon={Trophy} tone="success"
              onClick={() => openDrill("Vendas fechadas · Consolidado", "ganho", groups)} />
            <Kpi label="TCV" value={fmt(totals.tcv)} icon={DollarSign} tone="success"
              onClick={() => openDrill("TCV · Vendas fechadas", "ganho", groups)} />
            <Kpi label="Ticket médio" value={fmt(ticketMedioGeral)} icon={Ticket}
              onClick={() => openDrill("Ticket médio · Vendas fechadas", "ganho", groups)} />
          </div>

          {/* Tabela consolidada estilo DRE: Categoria › Subcategoria › item */}
          <Card>
            <CardContent className="p-0">
              <div className="flex items-center justify-between p-3 border-b">
                <SectionTitle
                  title="Consolidado por categoria"
                  subtitle="Live · Palestras · Eventos — clique numa categoria para abrir os itens; clique num item para fases, temperatura, perdas e vendas"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setExpanded((prev) => {
                      const next = new Set(prev);
                      if (allOpen) expandableKeys.forEach((k) => next.delete(k));
                      else expandableKeys.forEach((k) => next.add(k));
                      return next;
                    })
                  }
                >
                  {allOpen ? "Recolher todos" : "Expandir todos"}
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 text-muted-foreground sticky top-0">
                    <tr>
                      <th className="px-2 py-2 text-left w-6" />
                      <th className="px-2 py-2 text-left">Categoria / Live / Evento</th>
                      <th className="px-2 py-2 text-right">Leads</th>
                      <th className="px-2 py-2 text-right">MQLs</th>
                      <th className="px-2 py-2 text-right">Em contato</th>
                      <th className="px-2 py-2 text-right">Quentes</th>
                      <th className="px-2 py-2 text-right">Fechados</th>
                      <th className="px-2 py-2 text-right">Conv%</th>
                      <th className="px-2 py-2 text-right">Perdidos</th>
                      <th className="px-2 py-2 text-right">MRR</th>
                      <th className="px-2 py-2 text-right">Setup</th>
                      <th className="px-2 py-2 text-right">Pontual</th>
                      <th className="px-2 py-2 text-right">TCV</th>
                      <th className="px-2 py-2 text-right">Ticket médio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tree.map((cat) => {
                      const catOpen = expanded.has(cat.key);
                      return (
                        <Fragment key={cat.key}>
                          {/* Nível 1 — Categoria (somatório de tudo abaixo) */}
                          <tr
                            className="border-t bg-muted/30 hover:bg-muted/50 cursor-pointer font-semibold"
                            onClick={() => toggle(cat.key)}
                          >
                            <td className="px-2 py-2">
                              {catOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </td>
                            <td className="px-2 py-2 text-foreground">
                              <Badge
                                variant="outline"
                                className={cn("text-[9px] px-1.5 py-0 uppercase tracking-wide", CAT_BADGE[cat.label])}
                              >
                                {cat.label}
                              </Badge>
                            </td>
                            {rowMetricCells(aggMetrics(cat.agg), cat.groups, cat.label)}
                          </tr>

                          {catOpen && (
                            <>
                              {/* Nível 2 (direto) — itens sem subcategoria: lives / eventos reais */}
                              {cat.directItems.map((it) => renderItemRow(it, cat.label, 1))}
                              {/* Nível 2 — Subcategorias fixas (ex.: Talks) */}
                              {cat.subs.map((sub) => {
                                const subOpen = expanded.has(sub.key);
                                return (
                                  <Fragment key={sub.key}>
                                    <tr
                                      className="border-t bg-muted/10 hover:bg-muted/30 cursor-pointer"
                                      onClick={() => toggle(sub.key)}
                                    >
                                      <td className="px-2 py-2 pl-4">
                                        {subOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                      </td>
                                      <td className="px-2 py-2 pl-4 font-medium text-foreground">{sub.label}</td>
                                      {rowMetricCells(aggMetrics(sub.agg), sub.groups, `${cat.label} · ${sub.label}`)}
                                    </tr>
                                    {/* Nível 3 — itens da subcategoria (SE/Connect/Traction, mesmo zerados) */}
                                    {subOpen && sub.items.map((it) => renderItemRow(it, cat.label, 2))}
                                  </Fragment>
                                );
                              })}
                            </>
                          )}
                        </Fragment>
                      );
                    })}
                    <tr className="border-t bg-muted/40 font-semibold">
                      <td />
                      <td className="px-2 py-2 text-foreground">Total</td>
                      <td className="px-2 py-2 text-right tabular-nums">{fmtInt(totals.inscritos)}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{fmtInt(totals.mqls)}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{fmtInt(totals.emContato)}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{fmtInt(totals.quentes)}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{fmtInt(totals.fechados)}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{closeRate}%</td>
                      <td className="px-2 py-2 text-right tabular-nums">{fmtInt(totals.perdidos)}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{fmt(totals.mrr)}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{fmt(totals.setup)}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{fmt(totals.pontual)}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{fmt(totals.tcv)}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{fmt(ticketMedioGeral)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Seção à parte: vendas de Finders Fee (fora de lives/eventos) */}
          {findersGroup && (
            <Card>
              <CardContent className="p-0">
                <div className="p-3 border-b">
                  <SectionTitle
                    title="Finders Fee"
                    subtitle="Vendas indicadas pelo G4 fora de lives/palestras/eventos — clique nos números para ver os registros"
                  />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40 text-muted-foreground">
                      <tr>
                        <th className="px-2 py-2 text-left w-6" />
                        <th className="px-2 py-2 text-left">Origem</th>
                        <th className="px-2 py-2 text-right">Leads</th>
                        <th className="px-2 py-2 text-right">MQLs</th>
                        <th className="px-2 py-2 text-right">Em contato</th>
                        <th className="px-2 py-2 text-right">Quentes</th>
                        <th className="px-2 py-2 text-right">Fechados</th>
                        <th className="px-2 py-2 text-right">Conv%</th>
                        <th className="px-2 py-2 text-right">Perdidos</th>
                        <th className="px-2 py-2 text-right">MRR</th>
                        <th className="px-2 py-2 text-right">Setup</th>
                        <th className="px-2 py-2 text-right">Pontual</th>
                        <th className="px-2 py-2 text-right">TCV</th>
                        <th className="px-2 py-2 text-right">Ticket médio</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t">
                        <td className="px-2 py-2" />
                        <td className="px-2 py-2 text-foreground">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                              FINDERS FEE
                            </Badge>
                            Indicações G4
                          </div>
                        </td>
                        {rowMetricCells(
                          aggMetrics(aggFromGroups([findersGroup])),
                          [findersGroup],
                          "Finders Fee",
                        )}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>

      )}

      <DetailSheet
        open={drillOpen}
        onOpenChange={setDrillOpen}
        title={drillTitle}
        description={drillDesc}
        items={drillItems}
        columns={drillColumns}
      />
    </div>
  );
}
