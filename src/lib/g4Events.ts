/**
 * g4Events.ts — Configuração estática da parceria G4 Educação.
 *
 * Contém:
 *  - Tipos (G4Frente, G4LiveConfig, G4EventoConfig)
 *  - Constantes financeiras
 *  - Arrays de configuração (G4_LIVES, G4_EVENTOS)
 *  - Funções puras de classificação de cards
 *
 * NOTA: não importa nada do banco nem de outros hooks —
 *       só usa tipos que vêm do chamador.
 */
// ── Tipos de frente ──────────────────────────────────────────────────────
export type G4Frente = "lives" | "eventos" | "seller";

export interface G4LiveConfig {
  date: string; // "YYYY-MM-DD"
  label: string; // "Live 20/05"
  saveCost: number; // custo Save Studios (R$)
  pedroCost: number; // honorários Pedro = PEDRO_HORA × horas (R$)
  captureWindowDays: number; // janela (dias após a data da live) para associar leads
}

export interface G4EventoConfig {
  date: string; // "YYYY-MM-DD"
  label: string; // "G4 TOOLS CONNECT 06/05"
  slug: string; // ID único (para desambiguação entre eventos com mesmo nome)
  cost: number; // custo do evento (0 = TODO — preencher via planilha)
  originTokens: string[]; // tokens para match no haystack normalizado
}

// ── Constantes financeiras ────────────────────────────────────────────────
export const PEDRO_HORA = 500; // R$ por hora de Pedro
export const IMPOSTO_PCT = 0.15; // 15% imposto sobre receita bruta
export const COMISSAO_G4_PCT = 0.15; // 15% comissão G4 sobre receita bruta

// ── Configuração das Lives ────────────────────────────────────────────────
export const G4_LIVES: G4LiveConfig[] = [
  {
    date: "2026-05-20",
    label: "Live 20/05",
    saveCost: 1750,
    pedroCost: PEDRO_HORA * 3,
    captureWindowDays: 3,
  },
  {
    date: "2026-05-21",
    label: "Live 21/05",
    saveCost: 1750,
    pedroCost: PEDRO_HORA * 3,
    captureWindowDays: 3,
  },
  {
    date: "2026-06-17",
    label: "Live 17/06",
    saveCost: 1500,
    pedroCost: PEDRO_HORA * 3,
    captureWindowDays: 3,
  },
  {
    date: "2026-06-18",
    label: "Live 18/06",
    saveCost: 1500,
    pedroCost: PEDRO_HORA * 3,
    captureWindowDays: 3,
  },
  {
    date: "2026-07-02",
    label: "Live 02/07",
    saveCost: 1500,
    pedroCost: PEDRO_HORA * 3,
    captureWindowDays: 3,
  },
];

// ── Configuração dos Eventos ──────────────────────────────────────────────
export const G4_EVENTOS: G4EventoConfig[] = [
  {
    date: "2026-05-06",
    label: "G4 TOOLS CONNECT 06/05",
    slug: "connect-06-05",
    cost: 0, // TODO: preencher via planilha de custos G4
    originTokens: ["g4 tools connect", "tools connect"],
  },
  {
    date: "2026-06-25",
    label: "G4 TALKS SE 25/06",
    slug: "talks-se-25-06",
    cost: 0, // TODO: preencher via planilha de custos G4
    originTokens: ["g4 talks se", "g4 talks"],
  },
  {
    date: "2026-06-30",
    label: "G4 TOOLS CONNECT 30/06",
    slug: "connect-30-06",
    cost: 0, // TODO: preencher via planilha de custos G4
    originTokens: ["g4 tools connect", "tools connect"],
  },
];

// Período global da parceria G4 (início da primeira live até hoje — dinâmico)
export const G4_PERIOD_START = new Date("2026-05-01");
export const G4_PERIOD_END = new Date();

// ── Normalização interna ──────────────────────────────────────────────────
// (mesma lógica de eventSubcategory.ts — mantida local para não criar acoplamento)
const norm = (s?: string | null): string =>
  (s || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[-_/]+/g, " ")
    .trim();

// ── Tipo mínimo de card para classificação ────────────────────────────────
// Compatível com ModeloAtualCard (subconjunto de campos de atribuição)
type CardAttrs = {
  origemLead?: string | null;
  campanha?: string | null;
  tipoOrigem?: string | null;
  fonte?: string | null;
  paginaOrigem?: string | null;
  dataEntrada?: Date | null;
};

function buildHaystack(card: CardAttrs): string {
  return [
    norm(card.origemLead),
    norm(card.campanha),
    norm(card.tipoOrigem),
    norm(card.fonte),
    norm(card.paginaOrigem),
  ].join(" | ");
}

/**
 * Sinal genérico G4: menção a "g4" no haystack ou URL em domínio G4 conhecido.
 */
export function hasG4Signal(card: CardAttrs): boolean {
  if (buildHaystack(card).includes("g4")) return true;
  const pagina = (card.paginaOrigem || "").toLowerCase();
  return /g4(educacao|business)\.|g4\.com/.test(pagina);
}

// ── Predicados de frente ──────────────────────────────────────────────────

/**
 * Verifica se o card pertence à frente G4 Seller.
 *
 * Sinais aceitos:
 *  - origemLead normalizado === "g4 seller"
 *  - paginaOrigem em qualquer *.g4business.com
 *  - hasG4Signal(card) && haystack contém "seller"
 */
export function isCardSeller(card: CardAttrs): boolean {
  if (norm(card.origemLead) === "g4 seller") return true;
  const pagina = (card.paginaOrigem || "").toLowerCase();
  if (/g4business\./.test(pagina)) return true;
  return hasG4Signal(card) && buildHaystack(card).includes("seller");
}

/**
 * Verifica se o card pertence à frente G4 Lives.
 *
 * Critério: card tem sinal G4 E (haystack contém "live" OU dataEntrada cai
 * na janela de captura de alguma live cadastrada).
 */
export function isCardLive(
  card: CardAttrs,
  lives: G4LiveConfig[] = G4_LIVES
): boolean {
  if (!hasG4Signal(card)) return false;
  if (buildHaystack(card).includes("live")) return true;
  const t = card.dataEntrada ? new Date(card.dataEntrada).getTime() : null;
  if (t === null) return false;
  return lives.some((live) => {
    const t0 = new Date(live.date).getTime();
    const t1 = t0 + live.captureWindowDays * 86_400_000;
    return t >= t0 && t <= t1;
  });
}

/**
 * Associa um card a uma live específica.
 *
 * Prioridade:
 *  1. Texto — haystack contém a data da live em múltiplos formatos
 *     (ex: "20/05", "20-05", "2026-05-20") ou o label ("live 20/05").
 *  2. Janela de captura — data de entrada dentro de [live.date, +captureWindowDays].
 *     Se mais de uma live casar, prefere a mais próxima anterior à entrada.
 */
export function matchLiveFromCard(
  card: CardAttrs,
  lives: G4LiveConfig[] = G4_LIVES,
): G4LiveConfig | null {
  if (!hasG4Signal(card)) return null;
  const haystack = buildHaystack(card);

  // 1) Match textual
  const textMatches = lives.filter((live) => {
    const d = new Date(live.date);
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const tokens = [
      `${dd}/${mm}`,
      `${dd}-${mm}`,
      `${dd} ${mm}`,
      live.date, // "YYYY-MM-DD"
      norm(live.label),
    ];
    return tokens.some((t) => haystack.includes(t));
  });
  if (textMatches.length === 1) return textMatches[0];
  if (textMatches.length > 1) {
    // Desempata pelo mais próximo à data de entrada (ou primeiro)
    const t = card.dataEntrada ? new Date(card.dataEntrada).getTime() : null;
    if (t === null) return textMatches[0];
    return [...textMatches].sort(
      (a, b) =>
        Math.abs(t - new Date(a.date).getTime()) -
        Math.abs(t - new Date(b.date).getTime()),
    )[0];
  }

  // 2) Janela de captura
  const t = card.dataEntrada ? new Date(card.dataEntrada).getTime() : null;
  if (t === null) return null;
  const windowMatches = lives.filter((live) => {
    const t0 = new Date(live.date).getTime();
    const t1 = t0 + live.captureWindowDays * 86_400_000;
    return t >= t0 && t <= t1;
  });
  if (windowMatches.length === 0) return null;
  // Prefere a mais próxima anterior
  return [...windowMatches].sort(
    (a, b) =>
      t - new Date(b.date).getTime() - (t - new Date(a.date).getTime()),
  )[0];
}

/**
 * Associa um card ao evento G4 específico mais provável.
 *
 * Prioridade:
 *  1. Match por token → desempata pelo evento mais próximo ANTERIOR à dataEntrada
 *  2. Fallback: evento dentro de ±7 dias da dataEntrada
 *
 * O desempate por data é necessário porque "G4 TOOLS CONNECT" aparece em dois
 * eventos distintos (06/05 e 30/06) com os mesmos originTokens.
 */
export function matchEventoFromCard(
  card: CardAttrs,
  eventos: G4EventoConfig[] = G4_EVENTOS
): G4EventoConfig | null {
  const haystack = buildHaystack(card);

  // Guard: só considera "evento G4" se houver sinal G4 (incl. paginaOrigem).
  if (!hasG4Signal(card)) return null;

  const entradaMs = card.dataEntrada
    ? new Date(card.dataEntrada).getTime()
    : null;

  // Candidatos por token
  const tokenMatches = eventos.filter((e) =>
    e.originTokens.some((t) => haystack.includes(norm(t)))
  );

  if (tokenMatches.length === 0) return null;

  // Um único candidato → retorna direto
  if (entradaMs === null || tokenMatches.length === 1) return tokenMatches[0];

  // Desempata: prefere o evento que ocorreu ANTES da entrada, o mais próximo
  const sorted = [...tokenMatches].sort((a, b) => {
    const diffA = entradaMs - new Date(a.date).getTime();
    const diffB = entradaMs - new Date(b.date).getTime();
    if (diffA >= 0 && diffB < 0) return -1;
    if (diffA < 0 && diffB >= 0) return 1;
    return Math.abs(diffA) - Math.abs(diffB);
  });
  return sorted[0];
}

const EVENT_TOKENS = [
  "evento",
  "summit",
  "talkshow",
  "talk show",
  "imersao",
  "presencial",
  "webinar",
  "palestra",
  "workshop",
  "speaker",
  "4am",
];

/**
 * Verifica se o card pertence à frente G4 Eventos.
 * Exige sinal G4 E (token de evento OU matchEventoFromCard positivo).
 */
export function isCardEvento(
  card: CardAttrs,
  eventos: G4EventoConfig[] = G4_EVENTOS
): boolean {
  if (!hasG4Signal(card)) return false;
  const haystack = buildHaystack(card);
  if (EVENT_TOKENS.some((t) => haystack.includes(t))) return true;
  return matchEventoFromCard(card, eventos) !== null;
}

/**
 * Classifica um card em uma frente G4 com prioridade rígida:
 *   seller > lives > eventos > null
 *
 * Prioridade rígida evita dupla contagem: cada card pertence a exatamente
 * uma frente ou a nenhuma (null = não é card G4).
 */
export function classifyG4Card(
  card: CardAttrs,
  lives: G4LiveConfig[] = G4_LIVES,
  eventos: G4EventoConfig[] = G4_EVENTOS
): G4Frente | null {
  if (isCardSeller(card)) return "seller";
  if (isCardLive(card, lives)) return "lives";
  if (isCardEvento(card, eventos)) return "eventos";
  return null;
}
