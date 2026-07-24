// Canonicalização de rótulos de lives/eventos G4.
// A fonte externa (CRM/planilha) tem variações do mesmo evento, por exemplo:
//   "Live G4 - 02/07/2026", "Live - G4 02/07", "Live - G4"
// Aqui geramos um rótulo canônico único combinando o TIPO do evento
// (Live / Aula Traction / Aula / Evento) com a DATA parseada do nome.

const MONTHS_PT: Record<string, number> = {
  jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5,
  jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11,
};

const normalize = (s: unknown) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

export function parseEventDate(name: string): Date | null {
  const dmy = name.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (dmy) {
    const y = dmy[3].length === 2 ? 2000 + Number(dmy[3]) : Number(dmy[3]);
    return new Date(y, Number(dmy[2]) - 1, Number(dmy[1]));
  }
  const dmyDash = name.match(/(\d{1,2})-(\d{1,2})-(\d{2,4})/);
  if (dmyDash) {
    const y = dmyDash[3].length === 2 ? 2000 + Number(dmyDash[3]) : Number(dmyDash[3]);
    return new Date(y, Number(dmyDash[2]) - 1, Number(dmyDash[1]));
  }
  const dm = name.match(/(\d{1,2})[\/-](\d{1,2})(?!\d)/);
  if (dm) return new Date(2026, Number(dm[2]) - 1, Number(dm[1]));
  const dMon = name.match(/(\d{1,2})[-\s](jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)/i);
  if (dMon) return new Date(2026, MONTHS_PT[dMon[2].toLowerCase()], Number(dMon[1]));
  return null;
}

// Overrides manuais têm prioridade sobre a heurística.
const LIVE_CANONICAL_MAP: Record<string, string> = {
  "Live - G4 - 20-mai": "Live G4 - 20/05/2026",
  "Live - G4 - 21-mai": "Live G4 - 21/05/2026",
};

function detectKind(name: string): "live" | "aula-traction" | "aula" | "evento" {
  const n = normalize(name);
  if (n.includes("live")) return "live";
  if (n.includes("aula") && n.includes("traction")) return "aula-traction";
  if (n.includes("aula")) return "aula";
  return "evento";
}

const KIND_LABEL: Record<ReturnType<typeof detectKind>, string> = {
  "live": "Live G4",
  "aula-traction": "Aula Traction",
  "aula": "Aula G4",
  "evento": "Evento G4",
};

function pad2(n: number) {
  return n.toString().padStart(2, "0");
}

export function canonLive(raw: string): string {
  if (!raw) return raw;
  const override = LIVE_CANONICAL_MAP[raw];
  if (override) return override;
  const date = parseEventDate(raw);
  if (!date) return raw; // sem data legível, mantém o nome cru para não colapsar eventos distintos
  const kind = detectKind(raw);
  const label = KIND_LABEL[kind];
  const dd = pad2(date.getDate());
  const mm = pad2(date.getMonth() + 1);
  const yyyy = date.getFullYear();
  return `${label} - ${dd}/${mm}/${yyyy}`;
}

// ─────────── Taxonomia de exibição (árvore Categoria › Subcategoria › item) ───────────
// Categorias de topo do Dashboard Consolidado G4. A árvore é data-driven: só
// aparecem categorias/subcategorias que tenham eventos. Novos eventos cadastrados
// com "Talk"/"Palestra" no nome caem sozinhos em Palestras › Talks — sem tocar no código.
export type G4Categoria = "Live" | "Palestras" | "Eventos";

export interface G4Classification {
  categoria: G4Categoria;
  subcategoria: string | null;
}

export function classifyG4Event(name: string): G4Classification {
  const n = normalize(name);
  // Traction tem subcategoria própria dentro de Palestras (separado de Talks/Connect).
  if (n.includes("traction")) return { categoria: "Palestras", subcategoria: "Traction" };
  // Connect entra em Palestras › Talks, mesmo que o nome contenha "live"/"aula".
  if (n.includes("connect")) return { categoria: "Palestras", subcategoria: "Talks" };
  if (n.includes("live")) return { categoria: "Live", subcategoria: null };
  if (n.includes("talk")) return { categoria: "Palestras", subcategoria: "Talks" };
  if (n.includes("palestra")) return { categoria: "Palestras", subcategoria: null };
  return { categoria: "Eventos", subcategoria: null };

}
