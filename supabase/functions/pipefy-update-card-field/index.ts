import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { cardId, fieldId, value } = await req.json();
    if (!cardId || !fieldId || value === undefined) {
      return new Response(JSON.stringify({ error: 'cardId, fieldId, value required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = Deno.env.get('PIPEFY_API_KEY');
    if (!token) throw new Error('PIPEFY_API_KEY missing');

    // 1) Inspect card if fieldId === '__inspect__'
    if (fieldId === '__inspect__') {
      const q = `{ card(id: ${cardId}) { id title pipe { id name } fields { name value field { id internal_id type } } } }`;
      const r = await fetch('https://api.pipefy.com/graphql', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });
      const j = await r.json();
      return new Response(JSON.stringify(j), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 2) Update field
    const mutation = `mutation { updateCardField(input: { card_id: ${cardId}, field_id: "${fieldId}", new_value: ${JSON.stringify(String(value))} }) { card { id } success } }`;
    const r = await fetch('https://api.pipefy.com/graphql', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: mutation }),
    });
    const j = await r.json();
    return new Response(JSON.stringify(j), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
