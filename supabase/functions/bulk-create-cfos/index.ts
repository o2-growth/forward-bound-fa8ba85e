import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// One-shot script to create CFO accounts. Idempotent: skips emails that already exist.
const CFOS: { email: string; full_name: string; cfo_name: string }[] = [
  { email: 'douglas.schossler@o2inc.com.br', full_name: 'Douglas Pinheiro Schossler', cfo_name: 'Douglas Pinheiro Schossler' },
  { email: 'rafael.marchioretto@o2inc.com.br', full_name: 'Rafael Marchioretto Bokorni', cfo_name: 'Rafael Marchioretto Bokorni' },
  { email: 'oliveira@o2inc.com.br', full_name: 'Adivilso Souza de Oliveira Junior', cfo_name: 'Adivilso Souza de Oliveira Junior' },
  { email: 'everton.bisinella@o2inc.com.br', full_name: 'Everton Bisinella', cfo_name: 'Everton Bisinella' },
  { email: 'gustavo.cochlar@o2inc.com.br', full_name: 'Gustavo Ferreira Cochlar', cfo_name: 'Gustavo Ferreira Cochlar' },
  { email: 'mariana.luz@o2inc.com.br', full_name: 'Mariana Luz da Silva', cfo_name: 'Mariana Luz da Silva' },
  { email: 'joseane.sartori@o2inc.com.br', full_name: 'Joseane Sartori', cfo_name: 'Joseane Sartori' },
];

const PASSWORD = 'Alterar@01';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(url, serviceKey);

    const results: any[] = [];

    for (const c of CFOS) {
      const row: any = { email: c.email, cfo_name: c.cfo_name };
      try {
        // 1) Create user (skip if exists)
        let userId: string | null = null;
        const { data: created, error: createErr } = await admin.auth.admin.createUser({
          email: c.email,
          password: PASSWORD,
          email_confirm: true,
          user_metadata: { full_name: c.full_name },
        });

        if (createErr) {
          if (/already|exists|registered/i.test(createErr.message)) {
            // Find existing user
            const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
            const found = list?.users?.find((u: any) => u.email?.toLowerCase() === c.email.toLowerCase());
            if (found) { userId = found.id; row.created = false; }
            else throw createErr;
          } else throw createErr;
        } else {
          userId = created.user!.id;
          row.created = true;
        }
        row.user_id = userId;

        // 2) Set role = 'cfo' (remove user/admin)
        await admin.from('user_roles').delete().eq('user_id', userId!).in('role', ['user', 'admin']);
        // Insert cfo role only if missing
        const { data: existingRole } = await admin.from('user_roles').select('id').eq('user_id', userId!).eq('role', 'cfo').maybeSingle();
        if (!existingRole) {
          const { error: roleErr } = await admin.from('user_roles').insert({ user_id: userId!, role: 'cfo' as any });
          if (roleErr) throw new Error(`role insert: ${roleErr.message}`);
        }

        // 3) Upsert cfo_user_mapping
        const { data: existingMap } = await admin.from('cfo_user_mapping').select('id').eq('user_id', userId!).maybeSingle();
        if (existingMap) {
          await admin.from('cfo_user_mapping').update({ cfo_name: c.cfo_name, updated_at: new Date().toISOString() }).eq('user_id', userId!);
        } else {
          const { error: mapErr } = await admin.from('cfo_user_mapping').insert({ user_id: userId!, cfo_name: c.cfo_name });
          if (mapErr) throw new Error(`mapping insert: ${mapErr.message}`);
        }

        row.status = 'ok';
      } catch (e: any) {
        row.status = 'error';
        row.error = e?.message || String(e);
      }
      results.push(row);
    }

    return new Response(JSON.stringify({ results }, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
