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
    const requestBody = await req.json();
    const { orders: ordersToUpsert } = requestBody;

    if (!Array.isArray(ordersToUpsert) || ordersToUpsert.length === 0) {
      return new Response(JSON.stringify({ error: 'Orders array is required and cannot be empty.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

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
      return new Response(JSON.stringify({ error: 'Forbidden: Only administrators can perform bulk order upserts.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    let successfulUpserts = 0;
    let failedUpserts = 0;
    const errors: string[] = [];

    for (const order of ordersToUpsert) {
      try {
        const orderPayload: any = {
          id: order.id || undefined,
          user_id: order.user_id,
          product_id: order.product_id || null,
          mockup_id: order.mockup_id || null,
          customer_name: order.customer_name,
          customer_address: order.customer_address,
          customer_phone: order.customer_phone,
          payment_method: order.payment_method,
          status: order.status,
          total_price: parseFloat(order.total_price),
          ordered_design_image_url: order.ordered_design_image_url || null,
          ordered_design_data: order.ordered_design_data ? JSON.parse(order.ordered_design_data) : null,
          type: order.type,
          display_id: order.display_id || null,
          comment: order.comment || null,
        };

        if (!orderPayload.user_id || !orderPayload.customer_name || !orderPayload.customer_address || !orderPayload.customer_phone || !orderPayload.payment_method || !orderPayload.status || isNaN(orderPayload.total_price) || !orderPayload.type) {
          throw new Error(`Missing required fields for order: ${JSON.stringify(order)}`);
        }

        const { error: upsertError } = await supabaseAdmin
          .from('orders')
          .upsert(orderPayload, { onConflict: 'id' });

        if (upsertError) {
          errors.push(`Order ${order.id || order.customer_name} failed: ${upsertError.message}`);
          failedUpserts++;
        } else {
          successfulUpserts++;
        }
      } catch (e: any) {
        errors.push(`Order processing failed: ${e.message}`);
        failedUpserts++;
      }
    }

    return new Response(JSON.stringify({
      message: 'Orders upsert process completed.',
      successfulUpserts,
      failedUpserts,
      errors,
    }), {
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
    console.error("Unexpected error in bulk-upsert-orders function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});