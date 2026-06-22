import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(url, key);

    const email = 'paulo.cerqueira@o2inc.com.br';
    const password = crypto.randomUUID().replace(/-/g, '').slice(0, 14);

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: 'Paulo Cerqueira' },
    });
    if (createErr) throw createErr;

    const userId = created.user!.id;

    const { error: permErr } = await admin
      .from('user_tab_permissions')
      .insert([
        { user_id: userId, tab_key: 'indicators' },
        { user_id: userId, tab_key: 'marketing_indicators' },
      ]);
    if (permErr) throw permErr;

    return new Response(JSON.stringify({ ok: true, userId, email, password }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e?.message ?? e) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
