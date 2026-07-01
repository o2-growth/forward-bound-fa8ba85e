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
  ].join(" | ");
}

// ── Predicados de frente ──────────────────────────────────────────────────

/**
 * Verifica se o card pertence à frente G4 Seller.
 *
 * Sinal primário:  origemLead normalizado === "g4 seller"
 * Sinal secundário: paginaOrigem contém "tools.g4business.com"
 *
 * Nota: campo origemLead = "G4 SELLER" ainda precisa ser configurado
 * no Pipefy pelo Cunha — o fallback via paginaOrigem está ativo enquanto isso.
 */
export function isCardSeller(
  card: Pick<CardAttrs, "origemLead" | "paginaOrigem">
): boolean {
  return (
    norm(card.origemLead) === "g4 seller" ||
    norm(card.paginaOrigem).includes("tools.g4business.com")
  );
}

/**
 * Verifica se o card pertence à frente G4 Lives.
 *
 * Critério: origemLead/campanha/tipoOrigem/fonte contém sinal de live G4.
 * Cards com sinal de live são sempre classificados como "lives",
 * independentemente de baterem a janela de uma live específica.
 * A janela de captura é usada apenas para contar leads por live
 * (no buildLivesRows do hook).
 */
export function isCardLive(
  card: CardAttrs,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _lives: G4LiveConfig[] = G4_LIVES
): boolean {
  const haystack = buildHaystack(card);
  return (
    haystack.includes("live g4") ||
    (haystack.includes("g4") && haystack.includes("live"))
  );
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

  // Guard: só considera "evento G4" se houver sinal explícito de G4
  // em algum campo de atribuição (origem/campanha/tipoOrigem/fonte).
  if (!haystack.includes("g4")) return null;

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

/**
 * Verifica se o card pertence à frente G4 Eventos.
 * Espelha o filtro "Eventos" do Indicador Comercial: usa classifyLeadSource
 * — qualquer card com "g4" (ou tokens de evento) em tipo/origem/fonte/campanha.
 */
export function isCardEvento(
  card: CardAttrs,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _eventos: G4EventoConfig[] = G4_EVENTOS
): boolean {
  return (
    classifyLeadSource({
      tipoOrigem: card.tipoOrigem,
      origemLead: card.origemLead,
      fonte: card.fonte,
      campanha: card.campanha,
    }) === "evento"
  );
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
