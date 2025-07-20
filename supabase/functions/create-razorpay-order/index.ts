import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log(`Edge Function: create-razorpay-order invoked. Method: ${req.method}`);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("Edge Function: Request Headers:");
  for (const [key, value] of req.headers.entries()) {
    console.log(`  ${key}: ${value}`);
  }

  let payload;
  try {
    const bodyText = await req.text();
    console.log("Edge Function: Received raw body text:", bodyText);

    if (!bodyText) {
      console.error("Edge Function: Request body is empty.");
      return new Response(JSON.stringify({ error: 'Request body was empty. Expected JSON payload.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    payload = JSON.parse(bodyText);
    console.log("Edge Function: Parsed payload:", payload);

  } catch (e) {
    if (e instanceof SyntaxError) {
      console.error("Edge Function: JSON parsing error - Invalid or empty request body:", e.message);
      return new Response(JSON.stringify({ error: 'Invalid or malformed JSON body. Please ensure all required fields are sent.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }
    console.error("Edge Function: Unexpected error during request body parsing:", e);
    return new Response(JSON.stringify({ error: `Failed to parse request body: ${e.message}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }

  const { amount, currency, receipt } = payload;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID');
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');

    if (!supabaseUrl || !supabaseServiceRoleKey || !razorpayKeyId || !razorpayKeySecret) {
      console.error("Missing environment variables for Supabase or Razorpay.");
      return new Response(JSON.stringify({ error: 'Server configuration error: Missing environment variables.' }), {
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
      console.error("Authentication error:", authError?.message);
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token or user not found.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    if (typeof amount !== 'number' || amount <= 0 || !currency || typeof currency !== 'string' || !receipt || typeof receipt !== 'string') {
      console.error("Edge Function: Invalid or missing required fields in payload:", { amount, currency, receipt });
      return new Response(JSON.stringify({ error: 'Amount (positive number), currency, and receipt are required.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const orderPayload = {
      amount: amount * 100,
      currency: currency,
      receipt: receipt,
      payment_capture: 1,
    };

    const authString = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);

    const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`,
      },
      body: JSON.stringify(orderPayload),
    });

    if (!razorpayResponse.ok) {
      const errorData = await razorpayResponse.json();
      console.error("Razorpay API error:", errorData);
      return new Response(JSON.stringify({ error: `Failed to create Razorpay order: ${errorData.error?.description || 'Unknown error'}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: razorpayResponse.status,
      });
    }

    const razorpayOrder = await razorpayResponse.json();

    return new Response(JSON.stringify({
      order_id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key_id: razorpayKeyId,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Unexpected error in create-razorpay-order function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});