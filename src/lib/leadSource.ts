// leadSource.ts — Classificador heurístico de origem do lead (v2)
//
// Regras em ORDEM de prioridade (primeiro match ganha):
//   0) SDR-OVERRIDE — sdr = Matheus Starnick → OUTBOUND
//      (Matheus só faz prospecção ativa; qualquer card dele é outbound,
//      a menos que tenha sinal EXPLÍCITO de Evento — verificado antes.)
//   1) EVENTO    — tipoOrigem/origemLead contém "evento", "talkshow", "summit",
//                  "g4", "4am club"; campanha contém "EVENTO".
//   2) INDICAÇÃO — tipoOrigem com "indicação"/"cross-sell"/"cliente"/"colaborador";
//                  origemLead com "indicação"/"cross-sell"/"ex cliente"/"lead
//                  captado pelo"/"cliente"; OU origemLead é nome de empresa
//                  (contém sufixo tipo "advogados", "supermercados", "ltda" etc.);
//                  OU origemLead é uma palavra só (assume empresa/marca indicada).
//   3) OUTBOUND  — tipoOrigem com "prospecção"/"ativa"; OU origemLead é nome de
//                  pessoa solta (2-4 palavras, sem keyword de canal nem sufixo
//                  de empresa).
//   4) INBOUND   — tipoOrigem "site"/"redes sociais"; origemLead com "whatsapp"/
//                  "meta ads"/"instagram"/"site"/"google"/"facebook"; fonte
//                  ig*/fb*/google/instagram/facebook/an/nex/chatgpt/site_source/
//                  o2inc/audience; campanha começa com "Conversão"/"NX_" ou
//                  contém "inbound" ou é ID numérico longo (>=8 dígitos = Meta/
//                  Google Ads ID).
//   5) SEM_ORIGEM — fallback (inclui fonte "direct,..." sem outro sinal).
//
// Exemplos:
//   classifyLeadSource({ tipoOrigem: 'Evento', origemLead: 'G4 Summit' })       => 'evento'
//   classifyLeadSource({ tipoOrigem: 'Indicação de cliente' })                  => 'indicacao'
//   classifyLeadSource({ origemLead: 'Pedro Albite' })                          => 'outbound'
//   classifyLeadSource({ origemLead: 'Galapos' })                               => 'indicacao'
//   classifyLeadSource({ origemLead: 'Silveiro Advogados' })                    => 'indicacao'
//   classifyLeadSource({ sdr: 'Matheus Starnick' })                             => 'outbound'
//   classifyLeadSource({ fonte: 'igNex' })                                      => 'inbound'
//   classifyLeadSource({ campanha: '120238490879180418' })                      => 'inbound'
//   classifyLeadSource({})                                                      => 'sem_origem'

export type LeadSource = 'inbound' | 'outbound' | 'evento' | 'indicacao' | 'sem_origem';

export interface ClassifyInput {
  tipoOrigem?: string | null;
  origemLead?: string | null;
  fonte?: string | null;
  campanha?: string | null;
  sdr?: string | null;
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

// SDRs que SÓ fazem outbound — qualquer card deles é classificado como
// Outbound, salvo sinal explícito de Evento.
const OUTBOUND_SDRS = ['matheus'];

const isOutboundSdr = (sdr: string): boolean => {
  if (!sdr) return false;
  return OUTBOUND_SDRS.some(name => sdr.includes(name));
};

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

  const allEmpty = !tipo && !origem && !fonte && !campanha && !sdr;
  if (allEmpty) return 'sem_origem';

  // 1) EVENTO — tem prioridade sobre tudo, inclusive SDR override
  if (
    containsAny(tipo, ['evento']) ||
    containsAny(origem, ['evento', 'talkshow', 'summit', 'g4', '4am']) ||
    contains(campanha, 'evento')
  ) {
    return 'evento';
  }

  // 0) SDR-OVERRIDE — Matheus Starnick (e outros sdrs marcados) só fazem outbound
  if (isOutboundSdr(sdr)) {
    return 'outbound';
  }

  // 2) INDICAÇÃO
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
    fonte === 'ig' || fonte === 'fb' || fonte === 'an' || fonte === 'nex' ||
    fonte.startsWith('ig') || // captura igNex
    fonte.startsWith('fb') || // captura fbNex
    containsAny(fonte, ['google', 'googleads', 'instagram', 'facebook', 'chatgpt', 'site_source', 'o2inc', 'audience'])
  ) {
    return 'inbound';
  }
  if (
    campanha.startsWith('conversao') ||
    campanha.startsWith('nx_') ||           // captura NX_SEARCH, NX_CONVERSAO, NX_FORMS etc.
    contains(campanha, 'inbound') ||
    isNumericAdCampaignId(campanha)         // IDs numéricos do Meta/Google → ads inbound
  ) {
    return 'inbound';
  }

  // 5) Fallback (inclui fonte "direct,..." sem outro sinal — Q1 user)
  return 'sem_origem';
}
