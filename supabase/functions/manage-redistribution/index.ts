import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user is admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Admin only' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body = await req.json();
    const { action } = body;

    if (action === 'save_session') {
      const { description, total_before, total_after, changes } = body;

      // Insert session
      const { data: session, error: sessErr } = await supabase
        .from('meta_redistribution_sessions')
        .insert({
          user_id: user.id,
          description,
          total_before,
          total_after,
          changes_count: changes.length,
        })
        .select('id')
        .single();

      if (sessErr) {
        console.error('Session insert error:', sessErr);
        return new Response(JSON.stringify({ error: sessErr.message }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Insert changes
      const changeRows = changes.map((c: any) => ({
        session_id: session.id,
        bu: c.bu,
        month: c.month,
        year: c.year || 2026,
        field: c.field,
        value_before: c.value_before,
        value_after: c.value_after,
        delta: c.delta,
      }));

      const { error: changesErr } = await supabase
        .from('meta_redistribution_changes')
        .insert(changeRows);

      if (changesErr) {
        console.error('Changes insert error:', changesErr);
        return new Response(JSON.stringify({ error: changesErr.message }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Update monetary_metas
      for (const c of changes) {
        const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
        if (c.field === 'faturamento') updateData.faturamento = c.value_after;
        if (c.field === 'pontual') updateData.pontual = c.value_after;

        const { error: updateErr } = await supabase
          .from('monetary_metas')
          .update(updateData)
          .eq('bu', c.bu)
          .eq('month', c.month)
          .eq('year', c.year || 2026);

        if (updateErr) {
          console.error(`Update error for ${c.bu}/${c.month}:`, updateErr);
        }
      }

      return new Response(JSON.stringify({ session_id: session.id }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else if (action === 'list_sessions') {
      const { data, error } = await supabase
        .from('meta_redistribution_sessions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ sessions: data }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else if (action === 'get_session_changes') {
      const { session_id } = body;
      const { data, error } = await supabase
        .from('meta_redistribution_changes')
        .select('*')
        .eq('session_id', session_id)
        .order('created_at', { ascending: true });

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ changes: data }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else if (action === 'rollback_session') {
      const { session_id } = body;

      // Get changes
      const { data: changes, error: fetchErr } = await supabase
        .from('meta_redistribution_changes')
        .select('*')
        .eq('session_id', session_id);

      if (fetchErr || !changes) {
        return new Response(JSON.stringify({ error: fetchErr?.message || 'No changes found' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Restore values
      for (const c of changes) {
        const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
        if (c.field === 'faturamento') updateData.faturamento = c.value_before;
        if (c.field === 'pontual') updateData.pontual = c.value_before;

        await supabase
          .from('monetary_metas')
          .update(updateData)
          .eq('bu', c.bu)
          .eq('month', c.month)
          .eq('year', c.year);
      }

      // Mark session inactive
      await supabase
        .from('meta_redistribution_sessions')
        .update({ is_active: false })
        .eq('id', session_id);

      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else {
      return new Response(JSON.stringify({ error: 'Unknown action' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
