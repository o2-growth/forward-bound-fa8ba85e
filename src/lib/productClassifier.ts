/**
 * Classifica o campo "Produtos" do Pipefy (vindo de pipefy_db_clientes) em
 * UMA categoria única para exibição nos indicadores comerciais.
 *
 * Regras (decisão do usuário em 06/06/2026):
 * - Setup + CFOaaS  → CaaS (Setup combinado é entrada para o recorrente)
 * - Setup sozinho   → Setup (projeto one-shot)
 * - Sem match no DB → CaaS (fallback)
 *
 * Cada card recebe UMA categoria primária — sem rateio — para preservar
 * os valores monetários totais (MRR/Setup/Pontual) sem dupla contagem.
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
  if (!produtosRaw || !produtosRaw.trim()) return 'CaaS'; // fallback

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

  return 'CaaS'; // fallback final
}

/** Normaliza chave (título / empresa / razão social) para lookup */
export function normalizeClientKey(s: string | null | undefined): string {
  if (!s) return '';
  return norm(String(s));
}
