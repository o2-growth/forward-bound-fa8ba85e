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

export function normalizeTier(revenueRange?: string): string {
  if (!revenueRange) return 'Não informado';
  const direct = TIER_NORMALIZATION[revenueRange];
  if (direct) return direct;
  const lower = revenueRange.toLowerCase().trim();
  for (const [key, value] of Object.entries(TIER_NORMALIZATION)) {
    if (key.toLowerCase() === lower) return value;
  }
  return 'Não informado';
}
