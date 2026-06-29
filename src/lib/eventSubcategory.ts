/**
 * Classificação de cards "Evento" em subcategorias G4 / outras.
 *
 * Fonte principal: `origemLead` (campo Pipefy "Origem do lead").
 * Fallbacks: `tipoOrigem` e `campanha`.
 *
 * Mantém uma única regra para que o painel de Eventos no Indicador Comercial
 * e qualquer outro consumidor falem da mesma subcategoria.
 */

export type EventSubcategory =
  | "G4 Summit"
  | "G4 Live"
  | "Evento Presencial"
  | "Speaker / Palestra"
  | "Talkshow"
  | "4AM"
  | "G4 — Outros"
  | "Outros Eventos";

export const EVENT_SUBCATEGORIES: EventSubcategory[] = [
  "G4 Summit",
  "G4 Live",
  "Evento Presencial",
  "Speaker / Palestra",
  "Talkshow",
  "4AM",
  "G4 — Outros",
  "Outros Eventos",
];

const norm = (s?: string | null): string =>
  (s || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const has = (h: string, n: string) => !!h && h.includes(n);

export interface EventClassifyInput {
  origemLead?: string | null;
  tipoOrigem?: string | null;
  campanha?: string | null;
}

export function classifyEventSubcategory(
  c: EventClassifyInput,
): EventSubcategory {
  const haystack = [norm(c.origemLead), norm(c.tipoOrigem), norm(c.campanha)]
    .filter(Boolean)
    .join(" | ");

  const isG4 = has(haystack, "g4");

  if (isG4 && has(haystack, "summit")) return "G4 Summit";
  if (has(haystack, "live g4") || (isG4 && has(haystack, "live")))
    return "G4 Live";
  if (has(haystack, "4am")) return "4AM";
  if (has(haystack, "talkshow") || has(haystack, "talk show"))
    return "Talkshow";
  if (has(haystack, "speaker") || has(haystack, "palestra"))
    return "Speaker / Palestra";
  if (
    has(haystack, "presencial") ||
    has(haystack, "imersao") ||
    has(haystack, "imersão") ||
    has(haystack, "experience") ||
    has(haystack, "experiencia")
  ) {
    return "Evento Presencial";
  }
  if (isG4) return "G4 — Outros";
  return "Outros Eventos";
}
