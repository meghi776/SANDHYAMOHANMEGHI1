import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log(`Edge Function: create-razorpay-order invoked. Method: ${req.method}`); // Added log
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let payload;
  try {
    // Clone the request to inspect body without consuming it for req.json()
    const clonedReq = req.clone();
    let rawBodyText = '';
    try {
      rawBodyText = await clonedReq.text();
      console.log("Edge Function: Raw request body received:", rawBodyText);
    } catch (e) {
      console.error("Edge Function: Error reading raw request body text:", e);
    }

    payload = await req.json();
    // Add a check here: if payload is empty object or null after parsing
    if (!payload || Object.keys(payload).length === 0) {
      console.error("Edge Function: Received empty or null JSON payload.");
      return new Response(JSON.stringify({ error: 'Empty or invalid JSON payload received.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }
  } catch (e) {
    // Catch JSON parsing errors specifically
    if (e instanceof SyntaxError) {
      console.error("Edge Function: JSON parsing error - Invalid or empty request body:", e);
      return new Response(JSON.stringify({ error: 'Invalid or empty request body. Please ensure all required fields are sent.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400, // Bad Request
      });
    }
    console.error("Edge Function: Unexpected error during request body parsing:", e);
    return new Response(JSON.stringify({ error: `Failed to parse request body: ${e.message}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }

  const { amount, currency, receipt } = payload; // Use payload here

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

    // Authenticate the invoker (ensure they are logged in)
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

    // Validate payload fields more strictly
    if (typeof amount !== 'number' || amount <= 0 || !currency || typeof currency !== 'string' || !receipt || typeof receipt !== 'string') {
      console.error("Edge Function: Invalid or missing required fields in payload:", { amount, currency, receipt });
      return new Response(JSON.stringify({ error: 'Amount (positive number), currency, and receipt are required.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Create Razorpay order
    const orderPayload = {
      amount: amount * 100, // Razorpay expects amount in smallest currency unit (paise)
      currency: currency,
      receipt: receipt,
      payment_capture: 1, // Auto capture payment
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
      key_id: razorpayKeyId, // Send key_id back to client for checkout
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