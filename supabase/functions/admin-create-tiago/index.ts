import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: 'tiago.pisone@o2inc.com.br',
    password: 'Alterar@01',
    email_confirm: true,
    user_metadata: { full_name: 'Tiago Pisone' },
  });

  if (createError) {
    return new Response(JSON.stringify({ error: createError.message }), { status: 400 });
  }

  const userId = created.user!.id;

  await supabase.from('user_roles').delete().eq('user_id', userId);
  const { error: roleError } = await supabase
    .from('user_roles')
    .insert({ user_id: userId, role: 'admin' });

  if (roleError) {
    return new Response(JSON.stringify({ error: roleError.message, userId }), { status: 400 });
  }

  return new Response(JSON.stringify({ success: true, userId }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
