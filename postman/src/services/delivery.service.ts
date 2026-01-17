/**
 * Delivery & Courier Service Documentation
 * Covers: Courier management, order assignment, and delivery tracking
 */

import type { ServiceDocumentation } from '../types/postman.types.js';

export const deliveryService: ServiceDocumentation = {
  name: '06. Delivery & Logistics',
  description: 'Endpoints for couriers to manage deliveries and earnings',
  baseUrl: '{{base_url}}',
  version: '1.0.0',
  endpoints: [
    {
      name: 'Onboard Courier',
      description: 'Register and submit documents for a new courier account.',
      method: 'POST',
      path: '/onboard-courier',
      requiresAuth: true,
      requestBody: {
        description: 'Courier details',
        contentType: 'application/json',
        schema: {
          type: 'object',
          required: ['vehicleType', 'licenseNumber'],
          properties: {
            vehicleType: { type: 'string', enum: ['bike', 'car', 'van', 'truck'] },
            licenseNumber: { type: 'string' },
            documents: { type: 'object' },
            operatingCity: { type: 'string' },
          },
        },
        example: {
          vehicleType: 'bike',
          licenseNumber: 'LIC-12345678',
          operatingCity: 'Lagos',
          documents: {
            licenseParams: 'url-to-doc',
          },
        },
      },
      responses: [
        {
          status: 201,
          description: 'Application submitted',
          body: {
            success: true,
            data: {
              status: 'pending_approval',
              courier_id: 'courier-uuid',
            },
          },
        },
      ],
      examples: [],
      edgeCases: [],
    },
    {
      name: 'Update Availability',
      description: 'Toggle courier online/offline status and location.',
      method: 'POST',
      path: '/update-courier-availability',
      requiresAuth: true,
      requestBody: {
        description: 'Status update',
        contentType: 'application/json',
        schema: {
          type: 'object',
          required: ['isOnline'],
          properties: {
            isOnline: { type: 'boolean' },
            location: {
              type: 'object',
              properties: {
                lat: { type: 'number' },
                lng: { type: 'number' },
              },
            },
          },
        },
        example: {
          isOnline: true,
          location: { lat: 6.45, lng: 3.39 },
        },
      },
      responses: [
        {
          status: 200,
          description: 'Status updated',
          body: {
            success: true,
            data: { is_online: true },
          },
        },
      ],
      examples: [],
      edgeCases: [],
    },
    {
      name: 'Get Assignments',
      description: 'Get list of assigned delivery orders (active and pending).',
      method: 'GET',
      path: '/get-courier-assignments',
      requiresAuth: true,
      responses: [
        {
          status: 200,
          description: 'Assignments retrieved',
          body: {
            success: true,
            data: {
              assignments: [
                {
                  id: 'delivery-uuid',
                  order_id: 'order-123',
                  pickup_address: '123 Restaurant St',
                  delivery_address: '456 Customer Ave',
                  status: 'assigned',
                  payment_method: 'prepaid',
                  earnings: 500,
                },
              ],
            },
          },
        },
      ],
      examples: [],
      edgeCases: [],
    },
    {
      name: 'Update Delivery Status',
      description: 'Update the status of a specific delivery (picked up, delivered).',
      method: 'POST',
      path: '/update-booking-status',
      requiresAuth: true,
      requestBody: {
        description: 'Status update',
        contentType: 'application/json',
        schema: {
          type: 'object',
          required: ['bookingId', 'status'],
          properties: {
            bookingId: { type: 'string' },
            status: { type: 'string', enum: ['picked_up', 'in_transit', 'delivered', 'failed'] },
            proofOfDelivery: { type: 'string', description: 'URL of image' },
          },
        },
        example: {
          bookingId: 'booking-uuid',
          status: 'delivered',
          proofOfDelivery: 'https://storage.co/proof.jpg',
        },
      },
      responses: [
        {
          status: 200,
          description: 'Status updated',
          body: {
            success: true,
            data: { status: 'delivered' },
          },
        },
      ],
      examples: [],
      edgeCases: [],
    },
    {
      name: 'Calculate Earnings',
      description: 'Get earnings breakdown for a specific period.',
      method: 'GET',
      path: '/calculate-courier-earnings',
      requiresAuth: true,
      queryParams: [
        {
          name: 'period',
          description: 'weekly/monthly',
          required: false,
          example: 'weekly',
          type: 'string',
        },
      ],
      responses: [
        {
          status: 200,
          description: 'Earnings retrieved',
          body: {
            success: true,
            data: {
              total_earnings: 25000,
              completed_deliveries: 45,
              net_earnings: 22500,
              currency: 'NGN',
              period: 'weekly',
            },
          },
        },
      ],
      examples: [],
      edgeCases: [],
    },
    {
      name: 'Track Performance',
      description: 'Get courier performance metrics (rating, completion rate).',
      method: 'GET',
      path: '/track-courier-performance',
      requiresAuth: true,
      responses: [
        {
          status: 200,
          description: 'Metrics retrieved',
          body: {
            success: true,
            data: {
              rating: 4.8,
              completion_rate: 98,
              on_time_rate: 95,
              total_trips: 150,
            },
          },
        },
      ],
      examples: [],
      edgeCases: [],
    },
  ],
};

export default deliveryService;
