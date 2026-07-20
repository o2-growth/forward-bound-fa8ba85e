// Central de Reuniões — leitura (pull) dos cards do Pipefy (pipe "Modelo Atual CFO Vendas 2")
// no formato consumido pela Central de Reuniões (mesmo shape de `central_reunioes_app_state.data`).
//
// Fonte: tabela `pipefy_moviment_cfos` (ver recon em docs internos). Fases relevantes são
// mapeadas para status da Central (agendada / realizada / noshow). Cards de teste ("teste",
// "123", "abc" etc no título/empresa/contato, ou IDs de teste conhecidos) são filtrados via
// `isJunkCard`, replicando a lógica já usada nos hooks de analytics do frontend
// (src/hooks/useModeloAtualMetas.ts).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ID numérico da pipe "Modelo Atual CFO Vendas 2" no Pipefy — usado para montar a URL do card.
// (mesma constante usada em pipefy-verify-modelo-atual e sync-pipefy-funnel)
const PIPE_ID = '304018800';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ---------------------------------------------------------------------------
// Fases do Pipefy → status da Central (ver recon: `SELECT DISTINCT "Fase"`)
// ---------------------------------------------------------------------------
const AGENDADA_PHASES = [
  'Reunião agendada / Qualificado',
  'Reunião 2 agendada',
  'Reunião 3 agendada',
];
const REALIZADA_PHASES = [
  'Reunião Realizada',
  '1° Reunião Realizada - Apresentação', // não observada nesta tabela, mantida por robustez
];
const NOSHOW_PHASES = [
  'Remarcar reunião / No show',
  'Remarcar reunião 2/3 / No show',
];

const RELEVANT_PHASES = [...AGENDADA_PHASES, ...REALIZADA_PHASES, ...NOSHOW_PHASES];

function mapPhaseToStatus(fase: string | null | undefined): string {
  if (!fase) return 'aguardando';
  if (AGENDADA_PHASES.includes(fase)) return 'agendada';
  if (REALIZADA_PHASES.includes(fase)) return 'realizada';
  if (NOSHOW_PHASES.includes(fase)) return 'noshow';
  return 'aguardando';
}

// ---------------------------------------------------------------------------
// isJunkCard — equivalente ao filtro de src/hooks/useModeloAtualMetas.ts.
// Mantido inline (Deno edge functions não importam código do repo Vite/React).
// ---------------------------------------------------------------------------
const TEST_CARD_IDS = new Set([
  '1320546949', // TESTE
  '1320177174', // 123
  '1308003007', // Empresa Teste
  '1320175421', // teste duda
  '1342531906', // G4 (card de teste)
]);

const TEST_TITLE_PATTERNS: RegExp[] = [
  /\bteste?s?\b/i,
  /\btesting\b/i,
  /\basdf?\b/i,
  /\bqwerty\b/i,
  /\babc\b/i,
  /\bxxx+\b/i,
  /^[\s\d]{1,4}$/,
  /^\W*$/,
  /nao[_\s-]?atender/i,
  /no[_\s-]?reply/i,
  /[_.-]teste?s?[_.-]/i,
  /teste?_?track/i,
];

function normalizeStr(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function isTestByTitle(...candidates: (string | undefined | null)[]): boolean {
  for (const cand of candidates) {
    if (!cand) continue;
    const raw = String(cand).trim();
    if (!raw) continue;
    const norm = normalizeStr(raw);
    for (const pat of TEST_TITLE_PATTERNS) {
      if (pat.test(norm)) return true;
    }
  }
  return false;
}

function isJunkCard(card: {
  id?: string | number;
  titulo?: string;
  empresa?: string;
  nome?: string;
  contato?: string;
}): boolean {
  const id = card.id != null ? String(card.id) : undefined;
  if (id && TEST_CARD_IDS.has(id)) return true;
  return isTestByTitle(card.titulo, card.empresa, card.nome, card.contato);
}

// ---------------------------------------------------------------------------
// Linha crua da query -> Meeting no formato da Central
// ---------------------------------------------------------------------------
// deno-lint-ignore no-explicit-any
type Row = Record<string, any>;
// deno-lint-ignore no-explicit-any
type Meeting = Record<string, any>;

const SP_TZ = 'America/Sao_Paulo';

function splitDateHora(entrada: string | null): { data: string | null; hora: string | null } {
  if (!entrada) return { data: null, hora: null };
  const d = new Date(entrada);
  if (isNaN(d.getTime())) return { data: null, hora: null };
  const dateFmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: SP_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const timeFmt = new Intl.DateTimeFormat('pt-BR', {
    timeZone: SP_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return { data: dateFmt.format(d), hora: timeFmt.format(d) };
}

function mapRowToMeeting(row: Row): Meeting {
  const empresa = row['Empresa'] || row['Título'] || row['Nome Empresa'] || null;
  const contatoRaw: string | null = row['Nome - Interlocução O2'] || null;
  // Contato pode vir como "Nome | Cargo" — mantemos só o nome na frente.
  const contato = contatoRaw ? contatoRaw.split('|')[0].trim() : null;
  const email = row['E-mail'] || row['2 E-mail - Interlocução O2'] || null;
  const fone = row['Telefone - Interlocução O2'] || row['Telefone - Interlocução'] || null;
  const sdr = row['SDR responsável'] || null;
  const closer = row['Closer responsável'] || row['Qual closer irá participar?'] || null;
  const entrada: string | null = row['Entrada'] || null;
  const { data, hora } = splitDateHora(entrada);
  const status = mapPhaseToStatus(row['Fase']);
  const obs = row['Observações da reunião'] || row['Observações'] || null;
  const updatedAt: string | null = row['updated_at'] || entrada;
  const _m = updatedAt ? new Date(updatedAt).getTime() : Date.now();

  return {
    id: String(row['ID']),
    empresa,
    contato,
    email,
    fone,
    sdr,
    closer,
    data,
    hora,
    status,
    linkcall: null, // não existe campo dedicado de link de call no Pipefy (ver recon)
    pipefy: `https://app.pipefy.com/pipes/${PIPE_ID}/cards/${row['ID']}`,
    obs,
    _m,
    motivoPerda: row['Motivo da perda'] || null,
    faseAtual: row['Fase Atual'] || null,
    source: 'pipefy',
  };
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return json({ ok: false, error: 'Method not allowed' }, 405);
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ ok: false, error: 'Authorization header required' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Valida o JWT do usuário.
    const supabaseUser = createClient(supabaseUrl, serviceKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userErr,
    } = await supabaseUser.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userErr || !user) {
      return json({ ok: false, error: 'Invalid token' }, 401);
    }

    // Client admin (service_role) para a consulta.
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const url = new URL(req.url);
    const fromParam = url.searchParams.get('from');
    const toParam = url.searchParams.get('to');

    let fromDate: string;
    let toDate: string;
    if (fromParam && toParam) {
      fromDate = fromParam;
      toDate = toParam;
    } else {
      const now = new Date();
      const from = new Date(now);
      from.setDate(from.getDate() - 30);
      const to = new Date(now);
      to.setDate(to.getDate() + 30);
      fromDate = isoDate(from);
      toDate = isoDate(to);
    }

    // Range de datas é inclusivo no "to" (até o final do dia).
    const fromTs = `${fromDate}T00:00:00Z`;
    const toTs = `${toDate}T23:59:59.999Z`;

    const { data: rows, error } = await supabaseAdmin
      .from('pipefy_moviment_cfos')
      .select(
        [
          '"ID"',
          '"Fase"',
          '"Fase Atual"',
          '"Título"',
          '"Empresa"',
          '"Nome Empresa"',
          '"Entrada"',
          '"Nome - Interlocução O2"',
          '"E-mail"',
          '"2 E-mail - Interlocução O2"',
          '"Telefone - Interlocução O2"',
          '"Telefone - Interlocução"',
          '"SDR responsável"',
          '"Closer responsável"',
          '"Qual closer irá participar?"',
          '"Motivo da perda"',
          '"Observações da reunião"',
          '"Observações"',
          'updated_at',
        ].join(','),
      )
      .in('Fase', RELEVANT_PHASES)
      .gte('Entrada', fromTs)
      .lte('Entrada', toTs)
      .order('Entrada', { ascending: false });

    if (error) throw error;

    const meetings = (rows ?? [])
      .filter((row: Row) => {
        return !isJunkCard({
          id: row['ID'],
          titulo: row['Título'],
          empresa: row['Empresa'] || row['Nome Empresa'],
          contato: row['Nome - Interlocução O2'],
        });
      })
      .map(mapRowToMeeting);

    return json({
      ok: true,
      data: { meetings, rev: Date.now() },
    });
  } catch (e) {
    console.error('Error in central-reunioes-pull:', e);
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
