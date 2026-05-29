import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CFOS = [
  { email: 'douglas.schossler@o2inc.com.br', name: 'Douglas Pinheiro Schossler' },
  { email: 'rafael.marchioretto@o2inc.com.br', name: 'Rafael Marchioretto Bokorni' },
  { email: 'oliveira@o2inc.com.br', name: 'Adivilso Souza de Oliveira Junior' },
  { email: 'everton.bisinella@o2inc.com.br', name: 'Everton Bisinella' },
  { email: 'gustavo.cochlar@o2inc.com.br', name: 'Gustavo Ferreira Cochlar' },
  { email: 'mariana.luz@o2inc.com.br', name: 'Mariana Luz da Silva' },
  { email: 'joseane.sartori@o2inc.com.br', name: 'Joseane Sartori' },
];

function genPassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const special = '@#$%&!';
  const all = upper + lower + digits + special;
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
  let pwd = pick(upper) + pick(lower) + pick(digits) + pick(special);
  for (let i = 0; i < 10; i++) pwd += pick(all);
  return pwd.split('').sort(() => Math.random() - 0.5).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const results: any[] = [];

  // list once
  const { data: listed } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const byEmail = new Map(listed.users.map((u: any) => [u.email?.toLowerCase(), u]));

  for (const cfo of CFOS) {
    const password = genPassword();
    try {
      let userId: string;
      const existing = byEmail.get(cfo.email.toLowerCase());

      if (existing) {
        userId = existing.id;
        const { error: updErr } = await admin.auth.admin.updateUserById(userId, { password });
        if (updErr) throw new Error(`update password: ${updErr.message}`);
      } else {
        const { data: created, error: cErr } = await admin.auth.admin.createUser({
          email: cfo.email,
          password,
          email_confirm: true,
          user_metadata: { full_name: cfo.name },
        });
        if (cErr || !created.user) throw new Error(`create: ${cErr?.message}`);
        userId = created.user.id;
      }

      // ensure role = cfo only
      await admin.from('user_roles').delete().eq('user_id', userId).in('role', ['user', 'admin']);
      const { error: roleErr } = await admin
        .from('user_roles')
        .upsert({ user_id: userId, role: 'cfo' }, { onConflict: 'user_id,role' });
      if (roleErr) throw new Error(`role: ${roleErr.message}`);

      // mapping
      const { error: mapErr } = await admin
        .from('cfo_user_mapping')
        .upsert({ user_id: userId, cfo_name: cfo.name }, { onConflict: 'user_id' });
      if (mapErr) throw new Error(`mapping: ${mapErr.message}`);

      results.push({ email: cfo.email, cfo_name: cfo.name, password, status: 'ok' });
    } catch (e: any) {
      results.push({ email: cfo.email, cfo_name: cfo.name, status: 'error', error: e.message });
    }
  }

  return new Response(JSON.stringify({ results }, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
