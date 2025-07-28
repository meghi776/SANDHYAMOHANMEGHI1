import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log(`Edge Function: place-order-and-decrement-inventory invoked. Method: ${req.method}`);
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
    user_id,
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

    // Always decrement inventory for both 'normal' and 'demo' orders
    console.log(`Edge Function: Decrementing inventory for product_id: ${product_id} (type: ${type})`);
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
      console.warn(`Edge Function: Not enough stock for product_id: ${product_id}. Inventory: ${product.inventory}`);
      return new Response(JSON.stringify({ error: 'Not enough stock available.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 409,
      });
    }

    if (product.sku && product.sku.trim() !== '') {
      console.log(`Edge Function: Product has SKU [${product.sku}]. Using RPC to decrement inventory.`);
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
      console.log(`Edge Function: Inventory decremented successfully for SKU [${product.sku}].`);
    } else {
      console.log(`Edge Function: Product has no SKU. Decrementing inventory for single product.`);
      const newInventory = (product.inventory || 0) - 1;
      const { error: updateError } = await supabaseAdmin
        .from('products')
        .update({ inventory: newInventory })
        .eq('id', product_id);

      if (updateError) {
        console.error("Edge Function: Error updating single product inventory:", updateError);
        throw new Error(`Failed to update inventory for single product: ${updateError.message}`);
      }
      console.log(`Edge Function: Inventory decremented successfully for product_id [${product_id}].`);
    }

    const { data: orderData, error: orderInsertError } = await supabaseAdmin
      .from('orders')
      .insert({
        user_id: user_id,
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
    console.error("Edge Function: Unexpected top-level error in place-order-and-decrement-inventory:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});