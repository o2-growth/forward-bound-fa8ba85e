// leadSource.ts — Classificador heurístico de origem do lead
//
// Regras em ORDEM de prioridade (primeiro match ganha):
//   1) EVENTO   — tipoOrigem/origemLead contém "evento", "talkshow", "summit", "g4";
//                 campanha contém "EVENTO".
//   2) INDICAÇÃO — tipoOrigem com "indicação"/"cross-sell"/"cliente"/"colaborador";
//                  origemLead com "indicação"/"cross-sell"/"ex cliente"/"lead captado pelo".
//   3) OUTBOUND — tipoOrigem com "prospecção"/"ativa"; OU origemLead = nome de pessoa solta
//                 (heurística: 2+ palavras alfanuméricas SEM keyword de canal).
//   4) INBOUND  — tipoOrigem "site"/"redes sociais"; origemLead com "whatsapp"/"meta ads"/
//                 "instagram"/"site"/"google"/"facebook"; fonte ig/fb/google/instagram/
//                 facebook/an/direct/chatgpt/site_source/o2inc; campanha começa com
//                 "Conversão"/"NX_CONVERSAO" ou contém "inbound".
//   5) SEM_ORIGEM — fallback.
//
// Exemplos rápidos (teste manual):
//   classifyLeadSource({ tipoOrigem: 'Evento', origemLead: 'G4 Summit' })       => 'evento'
//   classifyLeadSource({ tipoOrigem: 'Indicação de cliente' })                  => 'indicacao'
//   classifyLeadSource({ origemLead: 'Pedro Albite' })                          => 'outbound'
//   classifyLeadSource({ origemLead: 'WhatsApp Site', fonte: 'ig' })            => 'inbound'
//   classifyLeadSource({})                                                      => 'sem_origem'

export type LeadSource = 'inbound' | 'outbound' | 'evento' | 'indicacao' | 'sem_origem';

export interface ClassifyInput {
  tipoOrigem?: string | null;
  origemLead?: string | null;
  fonte?: string | null;
  campanha?: string | null;
}

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  inbound: 'Inbound',
  outbound: 'Outbound',
  evento: 'Eventos',
  indicacao: 'Indicação',
  sem_origem: 'Sem origem',
};

const norm = (s?: string | null): string => {
  if (!s) return '';
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
};

const contains = (haystack: string, needle: string): boolean =>
  haystack.length > 0 && haystack.includes(needle);

const containsAny = (haystack: string, needles: string[]): boolean =>
  haystack.length > 0 && needles.some((n) => haystack.includes(n));

// Tokens de canal/mídia que indicam que `origemLead` NÃO é um nome de pessoa solta.
const CHANNEL_TOKENS = [
  'whatsapp', 'wpp', 'meta', 'ads', 'instagram', 'ig', 'site', 'google',
  'facebook', 'fb', 'linkedin', 'evento', 'g4', 'talkshow', 'summit',
  'indicacao', 'cross', 'ex cliente', 'lead captado', 'inbound', 'outbound',
  'campanha', 'organico', 'orgânico',
];

const isLikelyPersonName = (raw: string): boolean => {
  const n = norm(raw);
  if (!n) return false;
  if (containsAny(n, CHANNEL_TOKENS)) return false;
  // 2+ palavras alfanuméricas
  const words = n.split(/\s+/).filter((w) => /^[a-z0-9]+$/i.test(w));
  return words.length >= 2;
};

export function classifyLeadSource(c: ClassifyInput): LeadSource {
  const tipo = norm(c.tipoOrigem);
  const origem = norm(c.origemLead);
  const fonte = norm(c.fonte);
  const campanha = norm(c.campanha);

  const allEmpty = !tipo && !origem && !fonte && !campanha;
  if (allEmpty) return 'sem_origem';

  // 1) EVENTO
  if (
    containsAny(tipo, ['evento']) ||
    containsAny(origem, ['evento', 'talkshow', 'summit', 'g4']) ||
    contains(campanha, 'evento')
  ) {
    return 'evento';
  }

  // 2) INDICAÇÃO
  if (
    containsAny(tipo, ['indicacao', 'cross-sell', 'cross sell', 'cliente', 'colaborador']) ||
    containsAny(origem, ['indicacao', 'cross-sell', 'cross sell', 'ex cliente', 'lead captado pelo'])
  ) {
    return 'indicacao';
  }

  // 3) OUTBOUND
  if (containsAny(tipo, ['prospeccao', 'ativa'])) {
    return 'outbound';
  }
  if (origem && isLikelyPersonName(c.origemLead || '')) {
    return 'outbound';
  }

  // 4) INBOUND
  if (containsAny(tipo, ['site', 'redes sociais'])) {
    return 'inbound';
  }
  if (containsAny(origem, ['whatsapp', 'meta ads', 'instagram', 'site', 'google', 'facebook'])) {
    return 'inbound';
  }
  if (
    fonte === 'ig' || fonte === 'fb' || fonte === 'an' || fonte === 'direct' ||
    containsAny(fonte, ['google', 'googleads', 'instagram', 'facebook', 'chatgpt', 'site_source', 'o2inc'])
  ) {
    return 'inbound';
  }
  if (
    campanha.startsWith('conversao') ||
    campanha.startsWith('nx_conversao') ||
    contains(campanha, 'inbound')
  ) {
    return 'inbound';
  }

  // 5) Fallback
  return 'sem_origem';
}
