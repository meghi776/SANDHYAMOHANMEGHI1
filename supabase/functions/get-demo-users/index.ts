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
      return new Response(JSON.stringify({ error: 'Forbidden: Only administrators can access this data.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    // Call the new RPC function to get demo order counts per user
    const { data: demoOrderCounts, error: rpcError } = await supabaseAdmin
      .rpc('get_demo_order_counts_by_user');

    if (rpcError) {
      console.error("Edge Function: Error calling get_demo_order_counts_by_user RPC:", rpcError);
      throw new Error(`Failed to fetch demo order counts: ${rpcError.message}`);
    }

    const userIdsWithCounts = new Map<string, number>();
    demoOrderCounts.forEach(item => {
      userIdsWithCounts.set(item.user_id, Number(item.demo_order_count)); // Ensure count is a number
    });

    const uniqueUserIds = Array.from(userIdsWithCounts.keys());

    if (uniqueUserIds.length === 0) {
      return new Response(JSON.stringify({ users: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Fetch profiles for these users
    const { data: profilesData, error: profilesFetchError } = await supabaseAdmin
      .from('profiles')
      .select('id, first_name, last_name, role')
      .in('id', uniqueUserIds);

    if (profilesFetchError) {
      console.error("Edge Function: Error fetching profiles for demo users:", profilesFetchError);
      throw new Error(`Failed to fetch user profiles: ${profilesFetchError.message}`);
    }

    // Fetch auth.users data (for email)
    const { data: authUsersData, error: authUsersError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000, // Adjust as needed, or implement pagination if many users
    });

    if (authUsersError) {
      console.error("Edge Function: Error listing users from Auth:", authUsersError);
      throw new Error(`Failed to fetch auth user data: ${authUsersError.message}`);
    }

    const authUserMap = new Map(authUsersData.users.map(user => [user.id, user.email]));

    const usersWithDemoOrders = profilesData.map(profile => ({
      id: profile.id,
      first_name: profile.first_name,
      last_name: profile.last_name,
      role: profile.role,
      email: authUserMap.get(profile.id) || 'N/A',
      demo_order_count: userIdsWithCounts.get(profile.id) || 0, // Add the count here
    }));

    return new Response(JSON.stringify({ users: usersWithDemoOrders }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error("Edge Function: Unexpected top-level error in get-demo-users:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});