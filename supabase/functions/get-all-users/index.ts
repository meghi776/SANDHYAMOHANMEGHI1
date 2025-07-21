import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(JSON.stringify({ error: 'Server configuration error: Supabase environment variables are not set.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Authenticate the invoker and check for admin role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header missing.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user: invokerUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !invokerUser) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token or user not found.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const { data: invokerProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', invokerUser.id)
      .single();

    if (profileError || invokerProfile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden: Only administrators can access user list.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    // Fetch profiles from public.profiles, including phone
    const { data: profilesData, error: fetchProfilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, first_name, last_name, role, phone'); // Added 'phone'

    if (fetchProfilesError) {
      console.error("Edge Function: Error fetching profiles:", fetchProfilesError);
      throw new Error(`Failed to fetch profiles: ${fetchProfilesError.message}`);
    }

    // Fetch user emails and phones from auth.users (admin API)
    const { data: authUsersData, error: authUsersError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000, // Adjust as needed, or implement pagination if many users
    });

    if (authUsersError) {
      console.error("Edge Function: Error listing users from Auth:", authUsersError);
      throw new Error(`Failed to fetch auth user data: ${authUsersError.message}`);
    }

    const authUserMap = new Map(authUsersData.users.map(user => [user.id, { email: user.email, phone: user.phone }]));

    // Combine profiles with emails and phones
    const combinedProfiles = (profilesData || []).map(profile => ({
      ...profile,
      email: authUserMap.get(profile.id)?.email || null,
      phone: profile.phone || authUserMap.get(profile.id)?.phone?.replace('+91', '') || null, // Prioritize profile.phone, then auth.phone (stripped +91)
    }));

    return new Response(JSON.stringify({ profiles: combinedProfiles }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error("Edge Function: Unexpected top-level error in get-all-users:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});