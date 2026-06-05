// marketingChannelGroup.ts — Classifica fontes em Online / Offline para a
// visão Conversão Online vs Offline da aba Marketing.
//
// Online  = mídia paga + canais digitais próprios mensuráveis.
// Offline = indicações, prospecção ativa, eventos, base.
//
// Estratégia em 3 camadas:
//   1. Match exato (normalizado) em ONLINE_FONTES / OFFLINE_FONTES — vence.
//   2. Match por substring em ONLINE_TOKENS / OFFLINE_TOKENS — fallback para fontes novas.
//   3. Sem match → 'desconhecido' (aparece no painel "Fontes sem classificação"
//      do dashboard pra reclassificarmos depois).

export type ChannelGroup = 'online' | 'offline' | 'desconhecido';

const normalize = (s?: string | null): string =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

// ============================================================================
// FONTES LITERAIS (match exato após normalização) — taxonomia conhecida do
// Pipefy + planilha Indicadores Growth.
// ============================================================================

const ONLINE_FONTES = new Set([
  // Meta Ads family
  'meta ads', 'meta', 'metaads', 'facebook', 'facebook ads', 'fb', 'fbads',
  'instagram', 'instagram ads', 'ig',
  // Google family
  'google ads', 'google', 'googleads', 'google search', 'google display',
  'youtube', 'youtube ads',
  // Owned digital
  'site', 'site / redes sociais', 'site/redes sociais',
  'redes sociais', 'social', 'organic', 'organico', 'direct', 'direto',
  'blog', 'newsletter', 'email marketing', 'e-mail marketing',
  'email', 'e-mail', 'mail',
  'webinar', 'lead magnet', 'isca digital', 'whatsapp', 'whats',
  'formulario tax', 'formulário tax', 'formulario', 'formulário',
  // Profissional/PR digital
  'linkedin', 'linkedin ads',
  'tiktok', 'spotify', 'podcast',
  // Mídia paga off-platform mensurada
  'globo internacional', 'globo',
  'materia exame', 'matéria exame', 'exame',
  // UTM / tracking residual
  'utm', 'paid', 'cpc',
].map(normalize));

const OFFLINE_FONTES = new Set([
  // Indicações
  'colaborador o2', 'colaborador',
  'ind. parceiro', 'indicacao parceiro', 'indicação parceiro',
  'parceiro', 'partner', 'parceiros',
  'ind. prospect', 'indicacao prospect', 'indicação prospect',
  'ind. cliente', 'indicacao cliente', 'indicação cliente',
  'ind. fornecedor', 'indicacao fornecedor', 'indicação fornecedor',
  'indicacao', 'indicação',
  // Base / Já existe
  'cliente', 'ja era cliente', 'já era cliente', 'base', 'expansao base',
  // Outbound / Prospecção
  'prosp. ativa', 'prospeccao ativa', 'prospecção ativa', 'prospeccao',
  'outbound', 'sdr outbound', 'cold call', 'cold mail',
  // Eventos / Off (G4 = sempre offline)
  'evento', 'eventos', 'feira', 'palestra', 'roadshow',
  'g4', 'g4 educacao', 'g4 educação',
  'midia offline', 'mídia offline',
].map(normalize));

// ============================================================================
// TOKENS (substring) — fallback. Tem que ser específico pra não conflitar.
// ============================================================================

const ONLINE_TOKENS = [
  'meta ads', 'facebook', 'instagram',
  'google ads', 'googleads', 'google search',
  'youtube', 'linkedin', 'tiktok',
  'site/redes sociais', 'redes sociais',
  'globo internacional', 'materia exame',
  'webinar', 'podcast', 'newsletter',
  'email marketing', 'e-mail marketing',
  'formulario', 'formulário',
  'whatsapp', 'utm_',
].map(normalize);

const OFFLINE_TOKENS = [
  'colaborador', 'ind. parceiro', 'indicacao', 'indicação',
  'ind. prospect', 'ind. cliente', 'parceiro',
  'ja era cliente', 'já era cliente', 'cliente',
  'prosp. ativa', 'prospeccao', 'prospecção',
  'outbound', 'cold call', 'cold mail',
  'evento', 'feira', 'palestra', 'roadshow',
  'g4 ', ' g4', '-g4', 'g4-', 'g4 sao paulo', 'g4 são paulo',
].map(normalize);

// ============================================================================
// Heurística por campanha — qualquer valor numérico ou que comece com utm_ /
// adset_ → online. Útil quando Fonte vem vazia mas Campanha veio do Meta/Google.
// ============================================================================

function looksLikeAdCampaign(campanha?: string | null): boolean {
  const c = normalize(campanha);
  if (!c) return false;
  if (/^\d{6,}$/.test(c)) return true; // ID numérico Meta/Google
  if (c.startsWith('utm_')) return true;
  if (c.startsWith('adset_')) return true;
  return false;
}

export function getChannelGroup(
  fonte?: string | null,
  origemLead?: string | null,
  tipoOrigem?: string | null,
  campanha?: string | null,
): ChannelGroup {
  const fields = [fonte, origemLead, tipoOrigem].map(normalize).filter(Boolean);

  // 0. "Sem origem" (todos os 3 campos vazios) → offline por regra de negócio.
  if (fields.length === 0) {
    if (looksLikeAdCampaign(campanha)) return 'online';
    return 'offline';
  }

  // 1. Match exato em qualquer um dos 3 campos
  for (const f of fields) {
    if (ONLINE_FONTES.has(f)) return 'online';
    if (OFFLINE_FONTES.has(f)) return 'offline';
  }

  // 2. Match por substring no haystack combinado
  const haystack = fields.join(' | ');
  if (haystack) {
    // G4 sempre offline — checa antes dos demais tokens
    if (/\bg4\b/.test(haystack)) return 'offline';
    if (ONLINE_TOKENS.some(t => haystack.includes(t))) return 'online';
    if (OFFLINE_TOKENS.some(t => haystack.includes(t))) return 'offline';
  }

  // 3. Heurística por campanha (Meta/Google IDs)
  if (looksLikeAdCampaign(campanha)) return 'online';

  return 'desconhecido';
}

/**
 * Returns a human-friendly label for the channel based on raw fonte/origem.
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
