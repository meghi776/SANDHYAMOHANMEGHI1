import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log("Edge Function: get-processing-orders invoked.");

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error("Edge Function: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.");
      return new Response(JSON.stringify({ error: 'Server configuration error: Supabase environment variables are not set.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceRoleKey
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error("Edge Function: Authorization header missing.");
      return new Response(JSON.stringify({ error: 'Authorization header missing.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user: invokerUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !invokerUser) {
      console.error("Edge Function: Unauthorized or user not found.", authError);
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token or user not found.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }
    console.log(`Edge Function: Invoker user ID: ${invokerUser.id}`);

    const { data: invokerProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', invokerUser.id)
      .single();

    if (profileError || invokerProfile?.role !== 'admin') {
      console.error("Edge Function: Forbidden - user is not admin.", profileError);
      return new Response(JSON.stringify({ error: 'Forbidden: Only administrators can view processing orders.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }
    console.log(`Edge Function: User ${invokerUser.id} is an admin.`);

    const { page = 1, itemsPerPage = 10 } = await req.json();
    const offset = (page - 1) * itemsPerPage;
    const limit = itemsPerPage;

    // Fetch total count of processing orders
    const { data: totalCountData, error: countError } = await supabaseAdmin.rpc('count_processing_orders');

    if (countError) {
      console.error("Edge Function: Error fetching total processing orders count:", countError);
      throw new Error(`Failed to fetch total order count: ${countError.message}`);
    }
    const totalOrdersCount = totalCountData;
    console.log(`Edge Function: Total processing orders count: ${totalOrdersCount}`);

    let query = supabaseAdmin
      .from('orders')
      .select(`
        id, display_id, created_at, customer_name, customer_address, customer_phone,
        payment_method, status, total_price, ordered_design_image_url,
        product_id, products (name), profiles (first_name, last_name, phone), user_id, type, comment
      `)
      .eq('status', 'Processing')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1); // Apply pagination

    console.log(`Edge Function: Querying for processing orders (page ${page}, limit ${limit}, offset ${offset})...`);
    const { data: ordersData, error: ordersError } = await query;

    if (ordersError) {
      console.error("Edge Function: Error fetching processing orders from DB:", ordersError);
      throw new Error(`Failed to fetch processing orders: ${ordersError.message}`);
    }
    console.log(`Edge Function: Found ${ordersData.length} processing orders for current page.`);

    const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (usersError) {
      console.error("Edge Function: Error listing users from Auth:", usersError);
      throw new Error(`Failed to fetch auth users: ${usersError.message}`);
    }

    const userEmailMap = new Map(usersData.users.map(user => [user.id, user.email]));
    const ordersWithEmails = ordersData.map(order => ({
      ...order,
      user_email: userEmailMap.get(order.user_id) || null,
    }));

    console.log("Edge Function: Returning processing orders data with total count.");
    return new Response(JSON.stringify({ orders: ordersWithEmails, totalOrdersCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Edge Function: Unexpected top-level error in get-processing-orders:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});