import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

import { createBooking } from './actions/create-booking.ts';
import { initializePayment } from './actions/initialize-payment.ts';

serve(async req => {
  const url = new URL(req.url);
  // Extract the path after /functions/v1/api/
  // Example: https://project.supabase.co/functions/v1/api/create-booking -> create-booking
  // Logic: split by 'api/' and take the last part
  const pathParts = url.pathname.split('api/');
  const route = pathParts.length > 1 ? pathParts[1] : '';

  console.log(`🚀 API Router processing: ${route}`);

  switch (route) {
    case 'create-booking':
    case 'Create-booking': // Handle legacy naming if needed
      return await createBooking(req);

    case 'initialize-payment':
    case 'Initialize-payment':
      return await initializePayment(req);

    default:
      return new Response(JSON.stringify({ error: `Route not found: ${route}` }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
  }
});
