import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log(`Edge Function: guest-register-and-order invoked. Method: ${req.method}`);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let payload;
  try {
    const bodyText = await req.text();
    if (!bodyText) {
      throw new Error("Request body is empty.");
    }
    payload = JSON.parse(bodyText);
  } catch (e) {
    console.error("Edge Function: Error parsing JSON body:", e);
    return new Response(JSON.stringify({ error: `Invalid request body: ${e.message}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }

  const {
    product_id,
    customer_name,
    customer_address,
    customer_phone,
    alternative_phone,
    payment_method,
    status,
    total_price,
    ordered_design_image_url,
    ordered_design_data,
    type,
    payment_id,
  } = payload;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error("Edge Function: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.");
      return new Response(JSON.stringify({ error: 'Server configuration error: Missing environment variables.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    if (!product_id || !customer_name || !customer_address || !customer_phone || !payment_method || !status || typeof total_price !== 'number' || total_price <= 0 || !ordered_design_image_url || !type) {
      return new Response(JSON.stringify({ error: 'Missing or invalid required order fields.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // --- Guest User Registration/Lookup Logic ---
    const guestPhone = `+91${customer_phone}`;
    const guestEmail = `guest_${customer_phone}@meghi.com`; // Fallback email
    let userId: string | null = null;

    // We cannot directly query for a user by phone number via the admin API.
    // The strategy is to attempt creation. If it fails due to the phone number
    // already existing, we inform the client that they need to log in.
    // This prevents creating duplicate accounts or overwriting existing ones.

    const password = customer_phone; // Password is the phone number

    const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      phone: guestPhone,
      password: password, // Use the phone number as the password
      email: guestEmail, // Provide a unique email to avoid conflicts if phone is not unique across users
      phone_confirm: true,
      email_confirm: true, // Auto-confirm email as it's a dummy one
      user_metadata: {
        first_name: customer_name.split(' ')[0] || 'Guest',
        last_name: customer_name.split(' ').slice(1).join(' ') || '',
        phone: customer_phone,
      },
    });

    if (createUserError) {
      // Check for the specific error message for duplicate phone number
      if (createUserError.message.includes('phone number already exists') || createUserError.message.includes('duplicate key value violates unique constraint "users_phone_key"')) {
        // Since we cannot get the user ID securely, we must ask the user to log in.
        return new Response(JSON.stringify({ error: 'A user with this phone number already exists. Please log in to place your order.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 409, // Conflict
        });
      }
      // For other errors, re-throw to be caught by the generic error handler
      console.error("Edge Function: Error creating guest user:", createUserError);
      throw new Error(`Failed to create guest account: ${createUserError.message}`);
    }
    
    userId = newUser.user.id;
    console.log(`Edge Function: Created new guest user with phone number: ${userId}`);
    // --- End Guest User Registration/Lookup Logic ---

    // Only decrement inventory for 'normal' orders
    if (type === 'normal') {
      const { data: product, error: fetchProductError } = await supabaseAdmin
        .from('products')
        .select('sku, inventory')
        .eq('id', product_id)
        .single();

      if (fetchProductError || !product) {
        console.error("Edge Function: Error fetching product for inventory decrement:", fetchProductError);
        return new Response(JSON.stringify({ error: 'Product not found or error fetching details.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        });
      }

      if ((product.inventory || 0) < 1) {
        return new Response(JSON.stringify({ error: 'Not enough stock available.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 409,
        });
      }

      if (product.sku) {
        const { error: rpcError } = await supabaseAdmin
          .rpc('decrement_inventory_by_sku', {
            p_sku: product.sku,
            p_quantity: 1
          });

        if (rpcError) {
          console.error("Edge Function: RPC Error during inventory decrement:", rpcError);
          if (rpcError.message.includes('Not enough stock')) {
            return new Response(JSON.stringify({ error: 'Not enough stock available for this SKU.' }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 409,
            });
          }
          throw new Error(`Failed to update inventory via RPC: ${rpcError.message}`);
        }
      } else {
        const newInventory = (product.inventory || 0) - 1;
        const { error: updateError } = await supabaseAdmin
          .from('products')
          .update({ inventory: newInventory })
          .eq('id', product_id);

        if (updateError) {
          throw new Error(`Failed to update inventory for single product: ${updateError.message}`);
        }
      }
    }

    // Insert order into the database, using the obtained userId
    const { data: orderData, error: orderInsertError } = await supabaseAdmin
      .from('orders')
      .insert({
        user_id: userId,
        product_id: product_id,
        customer_name: customer_name,
        customer_address: customer_address,
        customer_phone: customer_phone,
        alternative_phone: alternative_phone || null,
        payment_method: payment_method,
        status: status,
        total_price: total_price,
        ordered_design_image_url: ordered_design_image_url,
        ordered_design_data: ordered_design_data,
        type: type,
        payment_id: payment_id || null,
      })
      .select()
      .single();

    if (orderInsertError) {
      console.error("Edge Function: Error inserting order:", orderInsertError);
      return new Response(JSON.stringify({ error: `Failed to place order: ${orderInsertError.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    return new Response(JSON.stringify({ message: 'Order placed successfully!', order: orderData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Edge Function: Unexpected top-level error in guest-register-and-order:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});