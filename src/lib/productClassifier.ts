/**
 * Classifica o campo "Produtos" do Pipefy (vindo de pipefy_db_clientes) em
 * UMA categoria única para exibição nos indicadores comerciais.
 *
 * Ordem de resolução do produto de um card (ver useModeloAtualAnalytics):
 *   1. row["Produtos"] em pipefy_moviment_cfos (campo do próprio card)
 *   2. fallback: lookup em pipefy_db_clientes por Título / Empresa / Razão Social
 *   3. se ambos vazios → "A definir" (= Pipefy literalmente sem produto)
 *
 * IMPORTANTE: hoje o campo "Produtos" em pipefy_moviment_cfos está ~100%
 * vazio em fases pré-proposta (Reunião agendada, RR, Tentativas, RR2).
 * Cards nessas fases caem em "A definir" porque o time ainda não preencheu
 * o campo no Pipefy — não é bug de leitura. Para categorizar, preencha
 * "Produtos" no card do Pipefy.
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
  if (n.includes('assessoria')) return 'Assessoria Financeira';
  if (n.includes('bpo')) return 'BPO';
  if (n.includes('diagnostico')) return 'Diagnóstico Estratégico';
  if (n.includes('turnaround')) return 'Turnaround';
  if (n.includes('valuation')) return 'Valuation';
  if (n.includes('educacao')) return 'Educação';
  if (n.includes('setup')) return 'Setup';

  return 'A definir';
}

/** Normaliza chave (título / empresa / razão social) para lookup */
export function normalizeClientKey(s: string | null | undefined): string {
  if (!s) return '';
  return norm(String(s));
}
