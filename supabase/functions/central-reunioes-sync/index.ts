// Central de Reuniões — sincronização do estado compartilhado (equivalente ao antigo api/data.js,
// que usava `pg` direto contra o Postgres da Vercel). Aqui usamos @supabase/supabase-js contra a
// tabela public.central_reunioes_app_state, protegida por RLS (authenticated read/write) e, no
// caso de `replace: true`, um client admin (service_role) para permitir a restauração completa.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const APP_STATE_ID = 'central';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// deno-lint-ignore no-explicit-any
type Meeting = Record<string, any>;

// Chave de conteúdo p/ dedup: empresa+contato+data+hora normalizados.
function contentKey(m: Meeting): string {
  const empresa = String(m.empresa ?? '').trim().toLowerCase();
  const contato = String(m.contato ?? '').trim().toLowerCase();
  const data = m.data ?? '';
  const hora = m.hora ?? '';
  return `${empresa}|${contato}|${data}|${hora}`;
}

function dedupeByContent(list: Meeting[]): Meeting[] {
  const groups = new Map<string, Meeting>();
  for (const m of list) {
    if (!m || !m.id) continue;
    const key = contentKey(m);
    const cur = groups.get(key);
    if (!cur) {
      groups.set(key, m);
      continue;
    }
    const a = Number(m._m) || 0;
    const b = Number(cur._m) || 0;
    // Vence maior _m; empate resolvido por id menor (determinístico, espelha o comportamento original).
    if (a > b || (a === b && String(m.id) < String(cur.id))) {
      groups.set(key, m);
    }
  }
  return Array.from(groups.values());
}

// União por id: vence quem tem _m mais novo. Tombstones (deleted:true) propagam normalmente
// porque também carregam _m — nunca "ressuscitamos" um registro com _m mais antigo.
function mergeById(existing: Meeting[], incoming: Meeting[]): Meeting[] {
  const byId = new Map<string, Meeting>();
  for (const m of existing) {
    if (m && m.id) byId.set(String(m.id), m);
  }
  for (const m of incoming) {
    if (!m || !m.id) continue;
    const key = String(m.id);
    const cur = byId.get(key);
    if (!cur || (Number(m._m) || 0) >= (Number(cur._m) || 0)) {
      byId.set(key, m);
    }
  }
  return Array.from(byId.values());
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Authorization header required' }, 401);
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
      return json({ error: 'Invalid token' }, 401);
    }

    // Client admin (service_role) — necessário p/ bypass de RLS em `replace` e leitura consistente.
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    if (req.method === 'GET') {
      const { data: row, error } = await supabaseAdmin
        .from('central_reunioes_app_state')
        .select('data, rev')
        .eq('id', APP_STATE_ID)
        .maybeSingle();

      if (error) throw error;

      return json({
        ok: true,
        data: row ? { meetings: row.data ?? [], rev: Number(row.rev) } : null,
      });
    }

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      const incoming: Meeting[] = Array.isArray(body?.meetings) ? body.meetings : [];
      const replace = !!body?.replace; // só restauração administrativa substitui tudo
      const rev = Number(body?.rev) || Date.now();

      let finalArr: Meeting[] = incoming;

      if (!replace) {
        // MESCLA SEGURA: união por id, vence quem tem _m mais novo. NUNCA apaga reunião de outro aparelho.
        const { data: row, error: readErr } = await supabaseAdmin
          .from('central_reunioes_app_state')
          .select('data')
          .eq('id', APP_STATE_ID)
          .maybeSingle();
        if (readErr) throw readErr;

        const existing: Meeting[] = Array.isArray(row?.data) ? row.data : [];
        finalArr = mergeById(existing, incoming);
      }

      // DEDUP por conteúdo (empresa+contato+data+hora): colapsa cópias com ids diferentes da MESMA reunião.
      finalArr = dedupeByContent(finalArr);

      const { error: upsertErr } = await supabaseAdmin
        .from('central_reunioes_app_state')
        .upsert(
          {
            id: APP_STATE_ID,
            data: finalArr,
            rev,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' },
        );
      if (upsertErr) throw upsertErr;

      return json({ ok: true, rev, count: finalArr.length });
    }

    return json({ error: 'Method not allowed' }, 405);
  } catch (e) {
    console.error('Error in central-reunioes-sync:', e);
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
