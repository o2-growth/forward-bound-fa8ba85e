// Shared revenue tier normalization used across funnel/proposta widgets.

export const TIER_NORMALIZATION: Record<string, string> = {
  'Ainda não faturamos': 'Ainda não fatura',
  'Menos de R$ 100 mil': '< R$ 100k',
  'Entre R$ 100 mil e R$ 200 mil': 'R$ 100k - 200k',
  'Entre R$ 200 mil e R$ 350 mil': 'R$ 200k - 350k',
  'Entre R$ 350 mil e R$ 500 mil': 'R$ 350k - 500k',
  'Entre R$ 500 mil e R$ 1 milhão': 'R$ 500k - 1M',
  'Entre R$ 1 milhão e R$ 5 milhões': 'R$ 1M - 5M',
  'Acima de R$ 5 milhões': '> R$ 5M',
};

export const TIER_ORDER = [
  'Ainda não fatura',
  '< R$ 100k',
  'R$ 100k - 200k',
  'R$ 200k - 350k',
  'R$ 350k - 500k',
  'R$ 500k - 1M',
  'R$ 1M - 5M',
  '> R$ 5M',
];

export const TIER_COLORS: Record<string, string> = {
  'Ainda não fatura': 'hsl(var(--chart-5))',
  '< R$ 100k': 'hsl(var(--chart-4))',
  'R$ 100k - 200k': 'hsl(30, 70%, 50%)',
  'R$ 200k - 350k': 'hsl(var(--chart-3))',
  'R$ 350k - 500k': 'hsl(210, 70%, 50%)',
  'R$ 500k - 1M': 'hsl(var(--chart-2))',
  'R$ 1M - 5M': 'hsl(270, 70%, 50%)',
  '> R$ 5M': 'hsl(var(--chart-1))',
};

// ============================================================
// Expansão (Franquia / Oxy Hacker) usa a coluna "Investimento
// disponível" do Pipefy, com taxonomia própria. Adicionamos aqui
// para o normalizeTier reconhecer esses valores em vez de colapsar
// tudo em "Não informado" no drill-down dos acelerômetros.
// ============================================================
export const INVESTMENT_TIER_NORMALIZATION: Record<string, string> = {
  'Menos de 5 mil reais': '< R$ 5k',
  'Menos de R$ 5 mil': '< R$ 5k',
  'Entre 5 e 15 mil reais': 'R$ 5k - 15k',
  'Entre R$ 5 mil e R$ 15 mil': 'R$ 5k - 15k',
  'Entre 15 e 30 mil reais': 'R$ 15k - 30k',
  'Entre R$ 15 mil e R$ 30 mil': 'R$ 15k - 30k',
  'Entre 30 e 50 mil reais': 'R$ 30k - 50k',
  'Entre R$ 30 mil e R$ 50 mil': 'R$ 30k - 50k',
  'Entre 50 e 100 mil reais': 'R$ 50k - 100k',
  'Entre R$ 50 mil e R$ 100 mil': 'R$ 50k - 100k',
  'Mais de 100 mil reais': '> R$ 100k',
  'Acima de R$ 100 mil': '> R$ 100k',
  'Mais de 50 mil reais': '> R$ 50k',
};

export const INVESTMENT_TIER_ORDER = [
  '< R$ 5k',
  'R$ 5k - 15k',
  'R$ 15k - 30k',
  'R$ 30k - 50k',
  'R$ 50k - 100k',
  '> R$ 50k',
  '> R$ 100k',
];

export const INVESTMENT_TIER_COLORS: Record<string, string> = {
  '< R$ 5k': 'hsl(var(--chart-5))',
  'R$ 5k - 15k': 'hsl(var(--chart-4))',
  'R$ 15k - 30k': 'hsl(30, 70%, 50%)',
  'R$ 30k - 50k': 'hsl(var(--chart-3))',
  'R$ 50k - 100k': 'hsl(var(--chart-2))',
  '> R$ 50k': 'hsl(210, 70%, 50%)',
  '> R$ 100k': 'hsl(var(--chart-1))',
};

export function normalizeTier(revenueRange?: string): string {
  if (!revenueRange) return 'Não informado';

  // 1) Faturamento (Modelo Atual / O2 TAX)
  const direct = TIER_NORMALIZATION[revenueRange];
  if (direct) return direct;

  const lower = revenueRange.toLowerCase().trim();
  for (const [key, value] of Object.entries(TIER_NORMALIZATION)) {
    if (key.toLowerCase() === lower) return value;
  }

  // 2) Investimento disponível (Expansão: Franquia / Oxy Hacker)
  const invDirect = INVESTMENT_TIER_NORMALIZATION[revenueRange];
  if (invDirect) return invDirect;
  for (const [key, value] of Object.entries(INVESTMENT_TIER_NORMALIZATION)) {
    if (key.toLowerCase() === lower) return value;
  }

  return 'Não informado';
}
