/**
 * Taxi & Ride Service Documentation
 * Covers: Ride requests, driver tracking, and ride management
 * note: Moved from supabase-functions.service.ts to its own file for better organization
 */

import type { ServiceDocumentation } from '../types/postman.types.js';

export const taxiService: ServiceDocumentation = {
  name: '05. Taxi & Rides',
  description: 'Ride-hailing service for passengers and drivers',
  baseUrl: '{{base_url}}',
  version: '1.0.0',
  endpoints: [
    {
      name: 'Request Ride',
      description: 'Request a taxi ride from pickup to destination.',
      method: 'POST',
      path: '/request-ride',
      requiresAuth: true,
      requestBody: {
        description: 'Ride request details',
        contentType: 'application/json',
        schema: {
          type: 'object',
          required: ['pickup', 'destination'],
          properties: {
            pickup: {
              type: 'object',
              properties: {
                lat: { type: 'number' },
                lng: { type: 'number' },
                address: { type: 'string' },
              },
            },
            destination: {
              type: 'object',
              properties: {
                lat: { type: 'number' },
                lng: { type: 'number' },
                address: { type: 'string' },
              },
            },
            rideType: { type: 'string', enum: ['economy', 'comfort', 'premium'] },
            paymentMethod: { type: 'string', enum: ['cash', 'wallet', 'card'] },
            scheduledTime: { type: 'string', format: 'date-time' },
          },
        },
        example: {
          pickup: { lat: 6.4541, lng: 3.3947, address: 'Victoria Island, Lagos' },
          destination: { lat: 6.5244, lng: 3.3792, address: 'Ikeja, Lagos' },
          rideType: 'comfort',
          paymentMethod: 'wallet',
        },
      },
      responses: [
        {
          status: 201,
          description: 'Ride requested successfully',
          body: {
            success: true,
            data: {
              ride: {
                id: 'ride-uuid',
                status: 'searching',
                estimated_fare: 2500,
              },
            },
          },
        },
      ],
      examples: [],
      edgeCases: [
        {
          name: 'No Drivers',
          description: 'No drivers available in area',
          scenario: 'Request in remote location',
          expectedBehavior: 'Returns success with searching, eventually timeouts via socket',
        },
      ],
    },
    {
      name: 'Get Ride Estimate',
      description: 'Get fare estimate and ETA for a potential ride without booking.',
      method: 'POST',
      path: '/get-ride-estimate',
      requiresAuth: true,
      requestBody: {
        description: 'Route for estimation',
        contentType: 'application/json',
        schema: {
          type: 'object',
          required: ['pickup', 'destination'],
          properties: {
            pickup: { type: 'object' },
            destination: { type: 'object' },
          },
        },
        example: {
          pickup: { lat: 6.4541, lng: 3.3947 },
          destination: { lat: 6.5244, lng: 3.3792 },
        },
      },
      responses: [
        {
          status: 200,
          description: 'Estimate calculated',
          body: {
            success: true,
            data: {
              estimates: [
                { type: 'economy', fare: { min: 1500, max: 2000 }, eta: '3 mins' },
                { type: 'comfort', fare: { min: 2500, max: 3500 }, eta: '5 mins' },
              ],
            },
          },
        },
      ],
      examples: [],
      edgeCases: [],
    },
    {
      name: 'Cancel Ride',
      description: 'Cancel an active ride request.',
      method: 'POST',
      path: '/cancel-ride',
      requiresAuth: true,
      requestBody: {
        description: 'Cancellation details',
        contentType: 'application/json',
        schema: {
          type: 'object',
          required: ['rideId'],
          properties: {
            rideId: { type: 'string' },
            reason: { type: 'string' },
          },
        },
        example: {
          rideId: 'ride-uuid',
          reason: 'Changed mind',
        },
      },
      responses: [
        {
          status: 200,
          description: 'Ride cancelled',
          body: { success: true, data: { status: 'cancelled' } },
        },
      ],
      examples: [],
      edgeCases: [],
    },
    {
      name: 'Get Active Ride',
      description: 'Get details of the currently active ride for user or driver.',
      method: 'GET',
      path: '/get-active-ride',
      requiresAuth: true,
      responses: [
        {
          status: 200,
          description: 'Active ride found',
          body: {
            success: true,
            data: {
              ride: {
                id: 'ride-uuid',
                status: 'in_progress',
                driver: { name: 'John', car: 'Toyota Camry' },
                pickup: { lat: 6.45, lng: 3.39 },
                destination: { lat: 6.52, lng: 3.37 },
              },
            },
          },
        },
        {
          status: 404,
          description: 'No active ride',
          body: {
            success: false,
            error: { code: 'NO_ACTIVE_RIDE', message: 'User has no active ride' },
          },
        },
      ],
      examples: [],
      edgeCases: [],
    },
    {
      name: 'Get Nearby Drivers',
      description: 'Get locations of nearby available drivers for map display.',
      method: 'POST',
      path: '/get-nearby-drivers',
      requiresAuth: true,
      requestBody: {
        description: 'User location',
        contentType: 'application/json',
        schema: {
          type: 'object',
          required: ['lat', 'lng'],
          properties: {
            lat: { type: 'number' },
            lng: { type: 'number' },
            radius: { type: 'number', description: 'Radius in km' },
            rideType: { type: 'string' },
          },
        },
        example: {
          lat: 6.4541,
          lng: 3.3947,
          radius: 2,
        },
      },
      responses: [
        {
          status: 200,
          description: 'Drivers found',
          body: {
            success: true,
            data: {
              drivers: [
                { id: 'driver-1', lat: 6.455, lng: 3.395, heading: 45, type: 'comfort' },
                { id: 'driver-2', lat: 6.453, lng: 3.393, heading: 180, type: 'economy' },
              ],
            },
          },
        },
      ],
      examples: [],
      edgeCases: [],
    },
    {
      name: 'Accept Ride (Driver)',
      description: 'Driver accepts a ride request.',
      method: 'POST',
      path: '/accept-ride',
      requiresAuth: true,
      requestBody: {
        description: 'Ride to accept',
        contentType: 'application/json',
        schema: {
          type: 'object',
          required: ['rideId'],
          properties: {
            rideId: { type: 'string' },
          },
        },
        example: { rideId: 'ride-uuid' },
      },
      responses: [
        {
          status: 200,
          description: 'Accepted',
          body: { success: true, data: { status: 'accepted' } },
        },
      ],
      examples: [],
      edgeCases: [],
    },
    {
      name: 'Start Ride (Driver)',
      description: 'Driver starts the ride after pickup.',
      method: 'POST',
      path: '/start-ride',
      requiresAuth: true,
      requestBody: {
        description: 'Ride to start',
        contentType: 'application/json',
        schema: {
          type: 'object',
          required: ['rideId'],
          properties: { rideId: { type: 'string' } },
        },
        example: { rideId: 'ride-uuid' },
      },
      responses: [
        {
          status: 200,
          description: 'Started',
          body: { success: true, data: { status: 'in_progress' } },
        },
      ],
      examples: [],
      edgeCases: [],
    },
    {
      name: 'Complete Ride (Driver)',
      description: 'Driver completes the ride at destination.',
      method: 'POST',
      path: '/complete-ride',
      requiresAuth: true,
      requestBody: {
        description: 'Ride to complete',
        contentType: 'application/json',
        schema: {
          type: 'object',
          required: ['rideId'],
          properties: {
            rideId: { type: 'string' },
            finalLocation: { type: 'object' },
          },
        },
        example: {
          rideId: 'ride-uuid',
          finalLocation: { lat: 6.5244, lng: 3.3792 },
        },
      },
      responses: [
        {
          status: 200,
          description: 'Completed',
          body: {
            success: true,
            data: {
              status: 'completed',
              fare: 2500,
            },
          },
        },
      ],
      examples: [],
      edgeCases: [],
    },
    {
      name: 'Rate Driver',
      description: 'Rate driver after ride completion.',
      method: 'POST',
      path: '/rate-driver',
      requiresAuth: true,
      requestBody: {
        description: 'Rating details',
        contentType: 'application/json',
        schema: {
          type: 'object',
          required: ['rideId', 'rating'],
          properties: {
            rideId: { type: 'string' },
            rating: { type: 'number', min: 1, max: 5 },
            comment: { type: 'string' },
            tip: { type: 'number' },
          },
        },
        example: {
          rideId: 'ride-uuid',
          rating: 5,
          comment: 'Great ride',
          tip: 500,
        },
      },
      responses: [
        {
          status: 200,
          description: 'Rated',
          body: { success: true },
        },
      ],
      examples: [],
      edgeCases: [],
    },
  ],
};

export default taxiService;
