/**
 * Service Documentation Index
 * Exports all service documentation modules
 */

import { adminService } from './admin.service.js';
import { advertisingService } from './advertising.service.js';
import { bookingService } from './booking.service.js';
import { chatService } from './chat.service.js';
import { deliveryService } from './delivery.service.js';
import { hotelService } from './hotel.service.js';
import { notificationService } from './notification.service.js';
import { paymentService } from './payment.service.js';
import { socialService } from './social.service.js';
import { coreService } from './supabase-functions.service.js';
import { taxiService } from './taxi.service.js';
import { userProfileService } from './user-profile.service.js';

export const allServices = [
  adminService,
  userProfileService,
  hotelService,
  bookingService,
  taxiService,
  deliveryService,
  socialService,
  chatService,
  advertisingService,
  paymentService,
  notificationService,
  coreService,
];

// Export individual services for testing if needed
export {
  adminService,
  advertisingService,
  bookingService,
  chatService,
  coreService,
  deliveryService,
  hotelService,
  notificationService,
  paymentService,
  socialService,
  taxiService,
  userProfileService,
};
