/**
 * Classifica o campo "Produtos" do Pipefy (vindo de pipefy_db_clientes) em
 * UMA categoria única para exibição nos indicadores comerciais.
 *
 * Ordem de resolução do produto de um card (ver useModeloAtualAnalytics):
 *   1. row["Produtos"] em pipefy_moviment_cfos (campo do próprio card)
 *   2. fallback: lookup em pipefy_db_clientes por Título / Empresa / Razão Social
 *   3. fallback: inferência pelos campos Valor_* preenchidos no card
 *      (ver inferProductFromValues abaixo)
 *   4. se nada bater → "A definir" (= Pipefy literalmente sem produto)
 *
 * IMPORTANTE: o campo textual "Produtos" em pipefy_moviment_cfos está ~100%
 * vazio em todas as fases. A partir de Proposta enviada, porém, o time
 * preenche Valor MRR / Valor Setup / Valor OXY etc., permitindo inferir
 * a categoria sem inventar dados.
 *
 * Regras (decisão do usuário em 06/06/2026):
 * - Setup + CFOaaS  → CaaS (Setup combinado é entrada para o recorrente)
 * - Setup sozinho   → Setup (projeto one-shot)
 * - Sem match no DB → CaaS (fallback)
 */

export type ProductCategory =
  | 'CaaS'
  | 'OXY'
  | 'Assessoria Financeira'
  | 'Captação de Recursos'
  | 'BPO'
  | 'Coordenador Financeiro'
  | 'Diagnóstico Estratégico'
  | 'Setup'
  | 'Turnaround'
  | 'Valuation'
  | 'Educação'
  | 'A definir';

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  'CaaS',
  'OXY',
  'Assessoria Financeira',
  'Captação de Recursos',
  'BPO',
  'Coordenador Financeiro',
  'Diagnóstico Estratégico',
  'Setup',
  'Turnaround',
  'Valuation',
  'Educação',
  'A definir',
];

function norm(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Classifica UM único token de produto (já sem separador) em categoria.
 */
function classifyToken(tok: string): ProductCategory {
  const n = norm(tok);
  if (!n) return 'A definir';
  // Ordem importa: CFOaaS/CaaS antes de "Setup" para capturar "CaaS + Setup"
  if (n.includes('cfoaas') || n.includes('caas')) return 'CaaS';
  if (n.includes('coordenador')) return 'Coordenador Financeiro';
  if (n.includes('captacao')) return 'Captação de Recursos';
  if (n.includes('assessoria') && n.includes('financeira')) return 'Assessoria Financeira';
  if (n.includes('bpo')) return 'BPO';
  if (n.includes('oxy') || n.includes('genio') || n.includes('saas')) return 'OXY';
  if (n.includes('diagnostico')) return 'Diagnóstico Estratégico';
  if (n.includes('turnaround')) return 'Turnaround';
  if (n.includes('valuation')) return 'Valuation';
  if (n.includes('educacao')) return 'Educação';
  if (n.includes('setup')) return 'Setup';
  return 'A definir';
}

/**
 * Extrai tokens crus do campo "Produtos". Suporta 3 formatos:
 *  - Array JSON: `["A", "B"]`  (formato atual em pipefy_moviment_cfos)
 *  - CSV/separadores: `A, B + C / D`
 *  - String simples: `A`
 */
function extractTokens(produtosRaw: string): string[] {
  const s = produtosRaw.trim();
  if (!s) return [];
  // Tenta JSON.parse quando parece array
  if (s.startsWith('[') && s.endsWith(']')) {
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) {
        return parsed.map((x) => String(x).trim()).filter(Boolean);
      }
    } catch {
      // cai no fallback
    }
  }
  // Fallback: remove colchetes/aspas remanescentes e divide por separadores
  return s
    .replace(/[\[\]"]/g, '')
    .split(/[,+/;&]|\s+e\s+/i)
    .map((t) => t.trim())
    .filter(Boolean);
}

/**
 * Divide a string crua de "Produtos" em uma lista de categorias únicas
 * (ordem preservada, sem duplicatas). Suporta formato JSON array do Pipefy.
 */
export function classifyProdutoList(produtosRaw: string | null | undefined): ProductCategory[] {
  if (!produtosRaw) return [];
  const tokens = extractTokens(String(produtosRaw));
  const out: ProductCategory[] = [];
  for (const tok of tokens) {
    const cat = classifyToken(tok);
    if (cat === 'A definir') continue;
    if (!out.includes(cat)) out.push(cat);
  }
  return out;
}

/**
 * Devolve a categoria PRIMÁRIA (primeira encontrada) do campo "Produtos".
 * Retorna 'A definir' quando nada bate.
 */
export function classifyProduto(produtosRaw: string | null | undefined): ProductCategory {
  const list = classifyProdutoList(produtosRaw);
  return list[0] ?? 'A definir';
}

/** Normaliza chave (título / empresa / razão social) para lookup */
export function normalizeClientKey(s: string | null | undefined): string {
  if (!s) return '';
  return norm(String(s));
}

/**
 * Inferência de produto a partir dos campos numéricos Valor_* do card,
 * usada quando o campo textual "Produtos" não foi preenchido no Pipefy.
 * Retorna null se nenhum campo monetário relevante estiver preenchido —
 * nesse caso o consumidor deve manter "A definir".
 *
 * Ordem (primeiro match vence):
 *   OXY → Turnaround → Valuation → Diagnóstico → Educação →
 *   CaaS (MRR>0 ou CFOaaS>0) → Setup (Setup>0 sozinho) → null.
 */
export interface ProductValueFields {
  valorMRR?: number;
  valorSetup?: number;
  valorCFOaaS?: number;
  valorOXY?: number;
  valorTurnaround?: number;
  valorValuation?: number;
  valorDiagnostico?: number;
  valorEducacao?: number;
}

export function inferProductFromValues(v: ProductValueFields): ProductCategory | null {
  const pos = (n: number | undefined) => typeof n === 'number' && n > 0;

  if (pos(v.valorOXY)) return 'OXY';
  if (pos(v.valorTurnaround)) return 'Turnaround';
  if (pos(v.valorValuation)) return 'Valuation';
  if (pos(v.valorDiagnostico)) return 'Diagnóstico Estratégico';
  if (pos(v.valorEducacao)) return 'Educação';
  if (pos(v.valorMRR) || pos(v.valorCFOaaS)) return 'CaaS';
  if (pos(v.valorSetup)) return 'Setup';

  return null;
}
