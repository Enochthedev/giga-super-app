console.info('checkout-cart starting');
Deno.serve(async (req)=>{
  const start = Date.now();
  const requestId = crypto.randomUUID();
  const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for') || 'unknown';
  const log = async (obj)=>{
    try {
      const line = JSON.stringify(Object.assign({
        timestamp: new Date().toISOString(),
        request_id: requestId
      }, obj)) + '\n';
      await Deno.writeTextFile('/tmp/checkout_cart_logs.log', line, {
        append: true
      });
    } catch (e) {
      console.error('log write failed', e);
    }
  };
  await log({
    event: 'request_received',
    method: req.method,
    url: req.url,
    client_ip: clientIp
  });
  try {
    if (req.method !== 'POST') {
      await log({
        event: 'method_not_allowed',
        method: req.method
      });
      return new Response(JSON.stringify({
        error: 'Method not allowed'
      }), {
        status: 405,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    const body = await req.json().catch(()=>null);
    await log({
      event: 'parsed_body',
      body: body ? {
        has_body: true,
        keys: Object.keys(body)
      } : {
        has_body: false
      }
    });
    const { cart_id, session_id, shipping_address } = body || {};
    const authHeader = req.headers.get('authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      await log({
        event: 'missing_auth'
      });
      return new Response(JSON.stringify({
        error: 'Missing authorization'
      }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    const userJwt = authHeader.split(' ')[1];
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !anonKey || !serviceKey) {
      await log({
        event: 'missing_env'
      });
      return new Response(JSON.stringify({
        error: 'Missing environment variables'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    // Basic rate limiting (in-memory)
    const RATE_LIMIT = 30; // requests
    const WINDOW_MS = 60 * 1000; // per minute
    try {
      const key = `rate_${clientIp}`;
      const file = '/tmp/checkout_rate.json';
      let map = {};
      try {
        map = JSON.parse(await Deno.readTextFile(file));
      } catch (e) {
        map = {};
      }
      const now = Date.now();
      const entry = map[key] || {
        count: 0,
        start: now
      };
      if (now - entry.start > WINDOW_MS) {
        entry.count = 1;
        entry.start = now;
      } else {
        entry.count += 1;
      }
      map[key] = entry;
      await Deno.writeTextFile(file, JSON.stringify(map));
      await log({
        event: 'rate_limit_check',
        client_ip: clientIp,
        count: entry.count
      });
      if (entry.count > RATE_LIMIT) {
        await log({
          event: 'rate_limited',
          client_ip: clientIp
        });
        return new Response(JSON.stringify({
          error: 'Rate limit exceeded'
        }), {
          status: 429,
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }
    } catch (e) {
      await log({
        event: 'rate_limit_error',
        error: String(e)
      });
    }
    // Validate user token
    const userResp = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey,
        'Authorization': `Bearer ${userJwt}`
      }
    }).catch((e)=>({
        status: 0,
        text: async ()=>String(e)
      }));
    const user = userResp.status === 200 ? await userResp.json().catch(()=>null) : null;
    await log({
      event: 'auth_user_call',
      status: userResp.status,
      user_id: user?.id || null
    });
    if (userResp.status !== 200 || !user?.id) {
      return new Response(JSON.stringify({
        error: 'Invalid or expired token'
      }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    const userId = user.id;
    // Basic shipping address validation
    if (shipping_address) {
      const required = [
        'street',
        'city',
        'country'
      ];
      const missing = required.filter((k)=>!shipping_address[k]);
      if (missing.length) {
        await log({
          event: 'invalid_shipping_address',
          missing
        });
        return new Response(JSON.stringify({
          error: 'Invalid shipping_address',
          missing
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }
    }
    if (!cart_id) {
      await log({
        event: 'no_cart_id_provided'
      });
    // try find by user_id
    }
    // First try: GET cart using user's JWT (respects RLS)
    let cartData = null;
    if (cart_id) {
      const cartResp = await fetch(`${supabaseUrl}/rest/v1/ecommerce_carts?id=eq.${encodeURIComponent(cart_id)}&select=*`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
          'Authorization': `Bearer ${userJwt}`
        }
      }).catch((e)=>({
          status: 0,
          text: async ()=>String(e)
        }));
      const txt = cartResp.status === 200 ? await cartResp.text().catch(()=>'') : await cartResp.text();
      await log({
        event: 'cart_get_user_call',
        status: cartResp.status,
        body_preview: typeof txt === 'string' ? txt.slice(0, 500) : ''
      });
      try {
        cartData = cartResp.status === 200 ? JSON.parse(txt) : null;
      } catch (e) {
        cartData = null;
      }
    }
    // If not found by id, try by user_id using user's JWT
    if (!cartData || Array.isArray(cartData) && cartData.length === 0) {
      const byUserResp = await fetch(`${supabaseUrl}/rest/v1/ecommerce_carts?user_id=eq.${userId}&select=*`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
          'Authorization': `Bearer ${userJwt}`
        }
      }).catch((e)=>({
          status: 0,
          text: async ()=>String(e)
        }));
      const txt2 = byUserResp.status === 200 ? await byUserResp.text().catch(()=>'') : await byUserResp.text();
      await log({
        event: 'cart_get_by_user_call',
        status: byUserResp.status,
        body_preview: typeof txt2 === 'string' ? txt2.slice(0, 500) : ''
      });
      try {
        cartData = byUserResp.status === 200 ? JSON.parse(txt2) : null;
      } catch (e) {
        cartData = null;
      }
    }
    // If still empty, use service role to determine if cart exists (bypass RLS)
    let serviceCart = null;
    if (!cartData || Array.isArray(cartData) && cartData.length === 0) {
      const svcResp = await fetch(`${supabaseUrl}/rest/v1/ecommerce_carts${cart_id ? `?id=eq.${encodeURIComponent(cart_id)}` : `?user_id=eq.${userId}`}&select=*`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`
        }
      }).catch((e)=>({
          status: 0,
          text: async ()=>String(e)
        }));
      const svctxt = svcResp.status === 200 ? await svcResp.text().catch(()=>'') : await svcResp.text();
      await log({
        event: 'cart_get_service_call',
        status: svcResp.status,
        body_preview: typeof svctxt === 'string' ? svctxt.slice(0, 500) : ''
      });
      try {
        serviceCart = svcResp.status === 200 ? JSON.parse(svctxt) : null;
      } catch (e) {
        serviceCart = null;
      }
    }
    // If service role finds a cart but user couldn't see it -> RLS issue (ownership mismatch)
    if (serviceCart && Array.isArray(serviceCart) && serviceCart.length > 0 && (!cartData || Array.isArray(cartData) && cartData.length === 0)) {
      await log({
        event: 'rls_blocking',
        service_found: serviceCart[0]
      });
      return new Response(JSON.stringify({
        error: 'Cart exists but not accessible by user (ownership/RLS mismatch)'
      }), {
        status: 403,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    // If no cart anywhere, create one with service role
    let finalCart = null;
    if ((!serviceCart || Array.isArray(serviceCart) && serviceCart.length === 0) && (!cartData || Array.isArray(cartData) && cartData.length === 0)) {
      const payload = {
        user_id: userId,
        session_id: session_id || null
      };
      const createResp = await fetch(`${supabaseUrl}/rest/v1/ecommerce_carts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(payload)
      }).catch((e)=>({
          status: 0,
          text: async ()=>String(e)
        }));
      const createTxt = createResp.status >= 200 && createResp.status < 300 ? await createResp.text().catch(()=>'') : await createResp.text();
      await log({
        event: 'cart_create_service_call',
        status: createResp.status,
        body_preview: typeof createTxt === 'string' ? createTxt.slice(0, 500) : ''
      });
      try {
        finalCart = createResp.status >= 200 && createResp.status < 300 ? JSON.parse(createTxt)[0] : null;
      } catch (e) {
        finalCart = null;
      }
    } else if (serviceCart && serviceCart.length > 0) {
      finalCart = serviceCart[0];
    } else if (cartData && cartData.length > 0) {
      finalCart = cartData[0];
    }
    const duration = Date.now() - start;
    await log({
      event: 'request_finished',
      duration_ms: duration,
      final_cart_id: finalCart?.id || null
    });
    if (!finalCart) {
      return new Response(JSON.stringify({
        error: 'Unable to locate or create cart'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    return new Response(JSON.stringify({
      ok: true,
      cart: finalCart
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (err) {
    await (async ()=>{
      try {
        const line = JSON.stringify({
          timestamp: new Date().toISOString(),
          event: 'exception',
          request_id: requestId,
          error: String(err)
        }) + '\n';
        await Deno.writeTextFile('/tmp/checkout_cart_logs.log', line, {
          append: true
        });
      } catch (e) {}
    })();
    return new Response(JSON.stringify({
      error: 'Internal error'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
});
