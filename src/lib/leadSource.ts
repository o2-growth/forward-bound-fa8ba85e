// leadSource.ts — Classificador heurístico de origem do lead (v3)
//
// Regra de ouro: OUTBOUND só com sinal EXPLÍCITO de prospecção ativa em
// `tipoOrigem` (que o hook useOutboundAnalytics já injeta nos cards do pipe
// Outbound). Sem SDR-override — nome de SDR não força outbound.
//
// Ordem de prioridade (primeiro match ganha):
//   1) EVENTO     — tipoOrigem/origemLead contém evento/talkshow/summit/g4/4am
//                   ou campanha contém "evento".
//   2) OUTBOUND   — tipoOrigem contém "prospecção"/"ativa"/"outbound".
//   3) INDICAÇÃO (explícita) — tipo/origem com indicação/cross-sell/ex cliente/
//                   cliente/colaborador; OU origemLead é nome de empresa
//                   (COMPANY_TOKENS); OU origemLead é palavra solta (marca).
//   4) INBOUND    — tipo "site"/"redes sociais"; origemLead com whatsapp/meta
//                   ads/instagram/site/google/facebook; fonte ig*/fb*/google/
//                   instagram/facebook/an/nex/chatgpt/site_source/o2inc/
//                   audience; campanha conversao*/nx_*/inbound/ID numérico
//                   longo (>=8 dígitos = Meta/Google Ads).
//   5) INDICAÇÃO (pessoa) — origemLead é nome de pessoa (2-4 palavras) sem
//                   sinal de canal nem de inbound. Pessoa solta = indicação.
//   6) SEM_ORIGEM — fallback.
//
// Exemplos:
//   classifyLeadSource({ tipoOrigem: 'Evento', origemLead: 'G4 Summit' })       => 'evento'
//   classifyLeadSource({ tipoOrigem: 'Prospecção Ativa' })                      => 'outbound'
//   classifyLeadSource({ tipoOrigem: 'Indicação de cliente' })                  => 'indicacao'
//   classifyLeadSource({ origemLead: 'Pedro Albite' })                          => 'indicacao'
//   classifyLeadSource({ origemLead: 'Galapos' })                               => 'indicacao'
//   classifyLeadSource({ origemLead: 'Silveiro Advogados' })                    => 'indicacao'
//   classifyLeadSource({ sdr: 'Matheus Starnick' })                             => 'sem_origem'
//   classifyLeadSource({ fonte: 'igNex' })                                      => 'inbound'
//   classifyLeadSource({ campanha: '120238490879180418' })                      => 'inbound'
//   classifyLeadSource({})                                                      => 'sem_origem'

export type LeadSource = 'inbound' | 'outbound' | 'evento' | 'indicacao' | 'monetizacao' | 'sem_origem';

export interface ClassifyInput {
  /** ID do card no Pipefy — usado para overrides hardcoded. */
  id?: string | number | null;
  tipoOrigem?: string | null;
  origemLead?: string | null;
  fonte?: string | null;
  campanha?: string | null;
  sdr?: string | null;
  produto?: string | null;
  /** BU label (ex.: 'Monetização'); usado como sinal redundante quando o sentinel se perde no caminho. */
  bu?: string | null;
  /** Tipo de movimentação do pipe Monetização (Upsell / Cross-sell / Troca de produto / Downsell). */
  tipoMovimentacao?: string | null;
}


export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  inbound: 'Inbound',
  outbound: 'Outbound',
  evento: 'Eventos',
  indicacao: 'Indicação',
  monetizacao: 'Monetização',
  sem_origem: 'Sem origem',
};

// Sentinel value used by useMonetizacaoAnalytics to tag cards coming from
// the "Funil de Monetização" pipe so classifyLeadSource maps them to 'monetizacao'.
export const MONETIZACAO_ORIGEM_SENTINEL = '__monetizacao__';


const norm = (s?: string | null): string => {
  if (!s) return '';
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[-_/]+/g, ' ')
    .trim();
};


const contains = (haystack: string, needle: string): boolean =>
  haystack.length > 0 && haystack.includes(needle);

const containsAny = (haystack: string, needles: string[]): boolean =>
  haystack.length > 0 && needles.some((n) => haystack.includes(n));


// Tokens de canal/mídia que indicam que `origemLead` NÃO é um nome de pessoa.
const CHANNEL_TOKENS = [
  'whatsapp', 'wpp', 'meta', 'ads', 'instagram', 'ig', 'site', 'google',
  'facebook', 'fb', 'linkedin', 'evento', 'g4', 'talkshow', 'summit',
  'indicacao', 'cross', 'ex cliente', 'lead captado', 'inbound', 'outbound',
  'campanha', 'organico', 'cliente', '4am',
];

// Sufixos/palavras que delatam que origemLead é nome de EMPRESA.
// Empresa em origemLead, sem outro sinal, é INDICAÇÃO (Q6 do user).
const COMPANY_TOKENS = [
  'ltda', 'eireli', 's/a', ' sa ', 'cia ', ' me ',
  'advogados', 'advocacia', 'consultoria', 'tecnologia', 'engenharia',
  'comercio', 'industria', 'distribuidora', 'supermercados', 'imobiliaria',
  'transportes', 'logistica', 'farmacia', 'clinica', 'medicina',
  'corp', 'group', 'holding', 'studio', 'escola',
];

const looksLikeCompany = (raw: string): boolean => {
  const n = norm(raw);
  return containsAny(n, COMPANY_TOKENS);
};

const isLikelyPersonName = (raw: string): boolean => {
  const n = norm(raw);
  if (!n) return false;
  if (containsAny(n, CHANNEL_TOKENS)) return false;
  if (looksLikeCompany(n)) return false;
  // Conta palavras alfanuméricas
  const words = n.split(/\s+/).filter((w) => /^[a-z0-9]+$/i.test(w));
  // Pessoa = 2-4 palavras. <2 = palavra solta (tratada como indicação).
  // >4 = frase/empresa longa.
  return words.length >= 2 && words.length <= 4;
};

const isSingleWordName = (raw: string): boolean => {
  const n = norm(raw);
  if (!n) return false;
  if (containsAny(n, CHANNEL_TOKENS)) return false;
  if (looksLikeCompany(n)) return false;
  const words = n.split(/\s+/).filter((w) => /^[a-z0-9]+$/i.test(w));
  return words.length === 1;
};

// Campanha pode ser ID numérico do Meta (18 dígitos) ou Google Ads (10+ dígitos).
// Pelo menos 8 dígitos puros = ad campaign → INBOUND.
const isNumericAdCampaignId = (campanha: string): boolean => {
  if (!campanha) return false;
  return /^\d{8,}$/.test(campanha.trim());
};

export function classifyLeadSource(c: ClassifyInput): LeadSource {
  const tipo = norm(c.tipoOrigem);
  const origem = norm(c.origemLead);
  const fonte = norm(c.fonte);
  const campanha = norm(c.campanha);
  const sdr = norm(c.sdr);

  // 0) MONETIZAÇÃO — sentinel injetado por useMonetizacaoAnalytics,
  //    OU bu === 'Monetização' (redundância caso o sentinel se perca),
  //    OU tipoMovimentacao típico do pipe Monetização (Upsell/Cross-sell/Troca/Downsell)
  //    quando nenhum outro campo de origem está preenchido.
  if ((c.tipoOrigem || '').trim() === MONETIZACAO_ORIGEM_SENTINEL) {
    return 'monetizacao';
  }
  if (norm(c.bu) === 'monetizacao') {
    return 'monetizacao';
  }

  // 0.1) FRANQUIA + OXY HACKER — regra de negócio: todo card desses produtos
  // é Inbound, independente de os campos de origem estarem preenchidos no Pipefy.
  const produto = norm(c.produto);
  if (produto.includes('franquia') || produto.includes('oxy hacker')) return 'inbound';

  const allEmpty = !tipo && !origem && !fonte && !campanha && !sdr;

  // 0.2) Heurística Monetização: cards de upsell/cross-sell/troca/downsell que
  // vieram por pipes de BU sem nenhum campo de origem preenchido → Monetização.
  const tipoMov = norm(c.tipoMovimentacao);
  if (allEmpty && tipoMov && /(upsell|cross ?sell|cross|troca de produto|downsell|novo produto)/.test(tipoMov)) {
    return 'monetizacao';
  }

  if (allEmpty) return 'sem_origem';


  // 1) EVENTO — prioridade máxima. Procura tokens de evento em QUALQUER um
  //    dos 4 campos (tipo, origem, fonte, campanha). Hífens já foram
  //    normalizados em espaço pelo `norm`, então "Live-G4-18-junho" casa.
  const eventHaystack = [tipo, origem, fonte, campanha].filter(Boolean).join(' | ');
  const EVENT_TOKENS = [
    'g4', 'summit', 'talkshow', 'talk show', '4am', 'evento',
    'imersao', 'presencial', 'webinar', 'palestra', 'workshop', 'speaker',
    'live g4',
  ];
  if (containsAny(eventHaystack, EVENT_TOKENS)) {
    return 'evento';
  }


  // 2) OUTBOUND — apenas via sinal explícito em tipoOrigem
  //    (useOutboundAnalytics injeta tipoOrigem="Prospecção Ativa" nos cards
  //    do pipe Outbound, então cards desse pipe caem aqui.)
  if (containsAny(tipo, ['prospeccao', 'ativa', 'outbound'])) {
    return 'outbound';
  }

  // 3) INDICAÇÃO — sinais explícitos
  if (
    containsAny(tipo, ['indicacao', 'cross-sell', 'cross sell', 'cliente', 'colaborador']) ||
    containsAny(origem, ['indicacao', 'cross-sell', 'cross sell', 'ex cliente', 'lead captado pelo', 'cliente'])
  ) {
    return 'indicacao';
  }
  // Origem é nome de empresa → indicação
  if (origem && looksLikeCompany(origem)) {
    return 'indicacao';
  }
  // Origem é 1 palavra (marca/empresa solta) → indicação
  if (origem && isSingleWordName(c.origemLead || '')) {
    return 'indicacao';
  }

  // 4) INBOUND
  if (containsAny(tipo, ['site', 'redes sociais'])) {
    return 'inbound';
  }
  if (containsAny(origem, ['whatsapp', 'meta ads', 'instagram', 'site', 'google', 'facebook'])) {
    return 'inbound';
  }
  if (
    fonte === 'ig' || fonte === 'fb' || fonte === 'an' || fonte === 'nex' ||
    fonte.startsWith('ig') ||
    fonte.startsWith('fb') ||
    containsAny(fonte, ['google', 'googleads', 'instagram', 'facebook', 'chatgpt', 'site_source', 'o2inc', 'audience'])
  ) {
    return 'inbound';
  }
  if (
    campanha.startsWith('conversao') ||
    campanha.startsWith('nx_') ||
    contains(campanha, 'inbound') ||
    isNumericAdCampaignId(campanha)
  ) {
    return 'inbound';
  }

  // 5) INDICAÇÃO (fallback) — origemLead é nome de pessoa solta sem sinal de
  //    canal/inbound. Pessoa indicando = indicação, não outbound.
  if (origem && isLikelyPersonName(c.origemLead || '')) {
    return 'indicacao';
  }

  // 6) Fallback
  return 'sem_origem';
}
