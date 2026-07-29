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
 * Recebe a string crua de "Produtos" (ex.: "Setup, CFOaaS", "OXY + Gênio",
 * "Assessoria Financeira", ou undefined/vazio) e devolve a categoria única.
 */
export function classifyProduto(produtosRaw: string | null | undefined): ProductCategory {
  if (!produtosRaw || !produtosRaw.trim()) return 'A definir'; // produto ainda não escolhido

  const n = norm(produtosRaw);

  // Ordem importa: CFOaaS captura "Setup, CFOaaS" antes de cair em Setup
  if (n.includes('cfoaas')) return 'CaaS';
  if (n.includes('oxy')) return 'OXY';
  if (n.includes('captacao')) return 'Captação de Recursos';
  if (n.includes('assessoria') && n.includes('financeira')) return 'Assessoria Financeira';
  if (n.includes('bpo')) return 'BPO';
  if (n.includes('diagnostico')) return 'Diagnóstico Estratégico';
  if (n.includes('turnaround')) return 'Turnaround';
  if (n.includes('valuation')) return 'Valuation';
  if (n.includes('educacao')) return 'Educação';
  if (n.includes('setup')) return 'Setup';

  return 'A definir';
}

/**
 * Divide a string crua de "Produtos" (ex.: "Setup, CFOaaS + OXY / BPO") em
 * uma lista de categorias únicas (ordem preservada, sem duplicatas).
 * Usada para exibir dropdown "Produtos" quando cliente contratou mais de um.
 */
export function classifyProdutoList(produtosRaw: string | null | undefined): ProductCategory[] {
  if (!produtosRaw || !produtosRaw.trim()) return [];
  // Separadores comuns no campo Pipefy: vírgula, +, /, ;, & e " e "
  const tokens = produtosRaw
    .split(/[,+/;&]|\s+e\s+/i)
    .map((t) => t.trim())
    .filter(Boolean);
  const out: ProductCategory[] = [];
  for (const tok of tokens) {
    const cat = classifyProduto(tok);
    if (cat === 'A definir') continue;
    if (!out.includes(cat)) out.push(cat);
  }
  return out;
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
