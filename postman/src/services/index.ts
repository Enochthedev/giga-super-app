/**
 * Service Documentation Index
 * Exports all service documentation modules
 */

export { bookingService } from './booking.service.js';
export { hotelService } from './hotel.service.js';
export { paymentService } from './payment.service.js';
export { supabaseFunctionsService } from './supabase-functions.service.js';
export { userProfileService } from './user-profile.service.js';

// Re-export all services as an array for easy iteration
import { bookingService } from './booking.service.js';
import { hotelService } from './hotel.service.js';
import { paymentService } from './payment.service.js';
import { supabaseFunctionsService } from './supabase-functions.service.js';
import { userProfileService } from './user-profile.service.js';

export const allServices = [
  userProfileService,
  hotelService,
  bookingService,
  paymentService,
  supabaseFunctionsService,
];
