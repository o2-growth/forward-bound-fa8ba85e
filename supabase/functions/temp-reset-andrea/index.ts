import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

Deno.serve(async () => {
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data, error } = await sb.auth.admin.updateUserById(
    "b72f477f-0685-4d0b-9947-404bd0d119a5",
    { password: "Alterar@01" }
  );
  return new Response(JSON.stringify({ ok: !error, email: data?.user?.email, error: error?.message }), {
    headers: { "Content-Type": "application/json" },
  });
});
