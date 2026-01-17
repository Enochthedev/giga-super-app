/**
 * Notification Service Documentation
 * Covers: Push notifications, SMS, email, and preferences
 */

import type { ServiceDocumentation } from '../types/postman.types.js';

export const notificationService: ServiceDocumentation = {
  name: '11. Notifications',
  description: 'System for managing and sending user notifications',
  baseUrl: '{{base_url}}',
  version: '1.0.0',
  endpoints: [
    {
      name: 'Get Notifications',
      description: "Get user's notification history.",
      method: 'GET',
      path: '/get-notification-history',
      requiresAuth: true,
      queryParams: [
        {
          name: 'page',
          required: false,
          example: '1',
          type: 'number',
          description: 'Pagination page',
        },
      ],
      responses: [
        {
          status: 200,
          description: 'Notifications retrieved',
          body: {
            success: true,
            data: {
              notifications: [
                {
                  id: 'notif-uuid',
                  title: 'Booking Confirmed',
                  body: 'Your hotel booking is confirmed.',
                  read: false,
                  created_at: '2024-01-20T10:00:00Z',
                  data: { type: 'booking', id: 'book-uuid' },
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
      name: 'Update Preferences',
      description: 'Update notification settings (email, push, sms).',
      method: 'POST',
      path: '/update-notification-preferences',
      requiresAuth: true,
      requestBody: {
        description: 'Preferences',
        contentType: 'application/json',
        schema: {
          type: 'object',
          properties: {
            email_marketing: { type: 'boolean' },
            email_transactional: { type: 'boolean' },
            push_marketing: { type: 'boolean' },
            push_transactional: { type: 'boolean' },
            sms_transactional: { type: 'boolean' },
          },
        },
        example: {
          email_marketing: false,
          push_transactional: true,
        },
      },
      responses: [
        {
          status: 200,
          description: 'Preferences updated',
          body: { success: true, data: { updated: true } },
        },
      ],
      examples: [],
      edgeCases: [],
    },
    {
      name: 'Register Device (Push)',
      description:
        'Register a device token for push notifications (internal use mostly, but good to doc).',
      method: 'POST',
      path: '/register-device',
      requiresAuth: true,
      requestBody: {
        description: 'Device token',
        contentType: 'application/json',
        schema: {
          type: 'object',
          required: ['token', 'platform'],
          properties: {
            token: { type: 'string' },
            platform: { type: 'string', enum: ['ios', 'android', 'web'] },
          },
        },
        example: {
          token: 'fcm-token-string...',
          platform: 'android',
        },
      },
      responses: [
        {
          status: 200,
          description: 'Device registered',
          body: { success: true },
        },
      ],
      examples: [],
      edgeCases: [],
    },
  ],
};

export default notificationService;
