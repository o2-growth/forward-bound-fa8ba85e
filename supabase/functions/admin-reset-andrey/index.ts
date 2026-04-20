import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (listErr) {
    return new Response(JSON.stringify({ error: listErr.message }), { status: 500 });
  }
  const target = list.users.find((u) => u.email === 'andreylopes.ia@gmail.com');
  if (!target) {
    return new Response(JSON.stringify({ error: 'user not found' }), { status: 404 });
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(target.id, {
    password: 'Alterar@01',
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }

  return new Response(JSON.stringify({ success: true, userId: target.id, email: target.email }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
