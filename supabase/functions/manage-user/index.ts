import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Valid tab keys for permissions
const VALID_TAB_KEYS = ['context', 'goals', 'monthly', 'sales', 'media', 'marketing', 'structure', 'indicators'] as const;

// Input validation schemas
const createUserSchema = z.object({
  action: z.literal('create'),
  email: z.string().email().max(255),
  password: z.string().min(6).max(100),
  fullName: z.string().max(100).optional(),
  permissions: z.array(z.enum(VALID_TAB_KEYS)).optional(),
});

const updateUserSchema = z.object({
  action: z.literal('update'),
  userId: z.string().uuid(),
  email: z.string().email().max(255).optional(),
  fullName: z.string().max(100).optional(),
});

const deleteUserSchema = z.object({
  action: z.literal('delete'),
  userId: z.string().uuid(),
});

const requestSchema = z.discriminatedUnion('action', [
  createUserSchema,
  updateUserSchema,
  deleteUserSchema,
]);

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a client with the user's token to verify they are an admin
    const supabaseUser = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the current user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      console.error('Error getting user:', userError);
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Request from user:', user.id);

    // Create admin client for privileged operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Check if the requesting user is an admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (roleError || !roleData) {
      console.error('User is not an admin:', roleError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse and validate request body
    let validatedData;
    try {
      const body = await req.json();
      validatedData = requestSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Validation error:', error.errors);
        return new Response(
          JSON.stringify({ error: 'Invalid input', details: error.errors.map(e => e.message) }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw error;
    }

    console.log('Action:', validatedData.action);

    // Handle different actions
    switch (validatedData.action) {
      case 'create': {
        const { email, password, fullName, permissions } = validatedData;

        // Create the user
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: fullName || '' },
        });

        if (createError) {
          console.error('Error creating user:', createError);
          return new Response(
            JSON.stringify({ error: createError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('User created successfully:', newUser.user.id);

        // Add initial permissions if provided
        if (permissions && permissions.length > 0) {
          const permissionsToInsert = permissions.map((tab) => ({
            user_id: newUser.user.id,
            tab_key: tab,
          }));

          const { error: permError } = await supabaseAdmin
            .from('user_tab_permissions')
            .insert(permissionsToInsert);

          if (permError) {
            console.error('Error adding permissions:', permError);
          }
        }

        return new Response(
          JSON.stringify({ success: true, user: { id: newUser.user.id, email: newUser.user.email } }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update': {
        const { userId, email, fullName } = validatedData;

        // Update auth user if email is provided
        if (email) {
          const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            { email }
          );

          if (authUpdateError) {
            console.error('Error updating auth user:', authUpdateError);
            return new Response(
              JSON.stringify({ error: authUpdateError.message }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }

        // Update profile
        const updateData: Record<string, string> = {};
        if (email) updateData.email = email;
        if (fullName !== undefined) updateData.full_name = fullName;

        if (Object.keys(updateData).length > 0) {
          const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update(updateData)
            .eq('id', userId);

          if (profileError) {
            console.error('Error updating profile:', profileError);
            return new Response(
              JSON.stringify({ error: profileError.message }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }

        console.log('User updated successfully:', userId);

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete': {
        const { userId } = validatedData;

        // Prevent admin from deleting themselves
        if (userId === user.id) {
          return new Response(
            JSON.stringify({ error: 'Cannot delete your own account' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Delete user from auth (this will cascade to profiles, roles, permissions due to FK constraints)
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (deleteError) {
          console.error('Error deleting user:', deleteError);
          return new Response(
            JSON.stringify({ error: deleteError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('User deleted successfully:', userId);

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
