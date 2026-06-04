// marketingChannelGroup.ts — Classifica fontes em Online / Offline para a
// visão Conversão Online vs Offline da aba Marketing.
//
// Online  = canais de mídia paga + canais digitais próprios mensuráveis.
// Offline = indicações, prospecção ativa, eventos sem custo direto medido.

export type ChannelGroup = 'online' | 'offline' | 'desconhecido';

const ONLINE_TOKENS = [
  'meta ads', 'meta', 'facebook',
  'instagram',
  'google ads', 'google', 'googleads',
  'site', 'redes sociais', 'site/redes sociais',
  'globo internacional',
  'linkedin',
  'materia exame', 'matéria exame',
];

const OFFLINE_TOKENS = [
  'colaborador o2', 'colaborador',
  'ind. parceiro', 'indicacao parceiro', 'indicação parceiro', 'parceiro',
  'ind. prospect', 'indicacao prospect', 'indicação prospect',
  'cliente', 'ja era cliente', 'já era cliente',
  'prosp. ativa', 'prospeccao ativa', 'prospecção ativa', 'outbound',
];

const normalize = (s?: string | null): string =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

export function getChannelGroup(
  fonte?: string | null,
  origemLead?: string | null,
  tipoOrigem?: string | null,
): ChannelGroup {
  const haystack = [fonte, origemLead, tipoOrigem]
    .map(normalize)
    .filter(Boolean)
    .join(' | ');

  if (!haystack) return 'desconhecido';

  if (ONLINE_TOKENS.some(t => haystack.includes(t))) return 'online';
  if (OFFLINE_TOKENS.some(t => haystack.includes(t))) return 'offline';
  return 'desconhecido';
}

/**
 * Returns a human-friendly label for the channel based on raw fonte/origem.
 * Used to group/sort the detail table in OnlineOfflineSection.
 */
export function getChannelLabel(
  fonte?: string | null,
  origemLead?: string | null,
  tipoOrigem?: string | null,
): string {
  const raw = (fonte || origemLead || tipoOrigem || '').trim();
  if (!raw) return 'Sem origem';
  return raw;
}
