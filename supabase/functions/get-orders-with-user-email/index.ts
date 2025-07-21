import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      orderType = 'all',
      userId: userIdFilter = null,
      startDate = null,
      endDate = null,
      status: statusFilter = null,
      searchQuery = null,
    } = body;

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

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
      return new Response(JSON.stringify({ error: 'Forbidden: Only administrators can view all orders.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    let query = supabaseAdmin
      .from('orders')
      .select(`
        id, display_id, created_at, customer_name, customer_address, customer_phone,
        payment_method, status, total_price, ordered_design_image_url,
        product_id, products (name, printing_width_mm, printing_height_mm), profiles (first_name, last_name), user_id, type, comment
      `);

    if (orderType && orderType !== 'all') {
      query = query.eq('type', orderType);
    }

    if (orderType === 'demo') {
      query = query.neq('status', 'Shipped')
                   .neq('status', 'Processing')
                   .neq('status', 'Delivered')
                   .neq('status', 'Cancelled');
    } else {
      if (statusFilter && statusFilter !== 'all') {
        if (statusFilter === 'non-processing') {
          query = query.neq('status', 'Processing').neq('status', 'Shipped').neq('status', 'Delivered');
        } else {
          query = query.eq('status', statusFilter);
        }
      } else if (statusFilter === 'all') {
        query = query.neq('status', 'Processing').neq('status', 'Shipped').neq('status', 'Delivered');
      }
    }

    if (userIdFilter) {
      query = query.eq('user_id', userIdFilter);
    }
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setUTCHours(23, 59, 59, 999);
      query = query.lte('created_at', endOfDay.toISOString());
    }
    
    if (searchQuery) {
      const searchPattern = `%${searchQuery}%`;
      query = query.or(
        `customer_name.ilike.${searchPattern},` +
        `customer_address.ilike.${searchPattern},` +
        `customer_phone.ilike.${searchPattern},` +
        `display_id.ilike.${searchPattern}`
      );
    }
    
    query = query.order('created_at', { ascending: false });

    const { data: ordersData, error: ordersError } = await query;

    if (ordersError) {
      throw new Error(`Failed to fetch orders: ${ordersError.message}`);
    }

    const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (usersError) {
      throw new Error(`Failed to fetch auth users: ${usersError.message}`);
    }

    const userEmailMap = new Map(usersData.users.map(user => [user.id, user.email]));
    const ordersWithEmails = ordersData.map(order => ({
      ...order,
      user_email: userEmailMap.get(order.user_id) || null,
    }));

    const userListForFrontend = usersData.users.map(user => ({
      id: user.id,
      email: user.email,
      first_name: user.user_metadata?.first_name || null,
      last_name: user.user_metadata?.last_name || null,
    }));

    return new Response(JSON.stringify({ orders: ordersWithEmails, users: userListForFrontend }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    if (error instanceof SyntaxError) {
      return new Response(JSON.stringify({ error: 'Invalid or empty request body.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }
    console.error("Edge Function Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});