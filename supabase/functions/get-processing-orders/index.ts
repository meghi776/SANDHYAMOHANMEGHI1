import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log("Edge Function: get-processing-orders invoked."); // Added log

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error("Edge Function: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables."); // Added log
      return new Response(JSON.stringify({ error: 'Server configuration error: Supabase environment variables are not set.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // 1. Create Admin Client and Authenticate
    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceRoleKey
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error("Edge Function: Authorization header missing."); // Added log
      return new Response(JSON.stringify({ error: 'Authorization header missing.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user: invokerUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !invokerUser) {
      console.error("Edge Function: Unauthorized or user not found.", authError); // Added log
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token or user not found.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }
    console.log(`Edge Function: Invoker user ID: ${invokerUser.id}`); // Added log

    // 2. Check for Admin Role
    const { data: invokerProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', invokerUser.id)
      .single();

    if (profileError || invokerProfile?.role !== 'admin') {
      console.error("Edge Function: Forbidden - user is not admin.", profileError); // Added log
      return new Response(JSON.stringify({ error: 'Forbidden: Only administrators can view processing orders.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }
    console.log(`Edge Function: User ${invokerUser.id} is an admin.`); // Added log

    // 3. Build Query - Hardcoded for 'Processing' status
    let query = supabaseAdmin
      .from('orders')
      .select(`
        id, display_id, created_at, customer_name, customer_address, customer_phone,
        payment_method, status, total_price, ordered_design_image_url,
        product_id, products (name), profiles (first_name, last_name, phone), user_id, type, comment
      `)
      .eq('status', 'Processing')
      .order('created_at', { ascending: false });

    console.log("Edge Function: Querying for processing orders..."); // Added log
    // 4. Execute Query
    const { data: ordersData, error: ordersError } = await query;

    if (ordersError) {
      console.error("Edge Function: Error fetching processing orders from DB:", ordersError); // Added log
      throw new Error(`Failed to fetch processing orders: ${ordersError.message}`);
    }
    console.log(`Edge Function: Found ${ordersData.length} processing orders.`); // Added log

    // 5. Enrich with User Emails
    const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (usersError) {
      console.error("Edge Function: Error listing users from Auth:", usersError); // Added log
      throw new Error(`Failed to fetch auth users: ${usersError.message}`);
    }

    const userEmailMap = new Map(usersData.users.map(user => [user.id, user.email]));
    const ordersWithEmails = ordersData.map(order => ({
      ...order,
      user_email: userEmailMap.get(order.user_id) || null,
    }));

    console.log("Edge Function: Returning processing orders data."); // Added log
    // 6. Return Response
    return new Response(JSON.stringify({ orders: ordersWithEmails }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Edge Function: Unexpected top-level error in get-processing-orders:", error); // Added log
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});