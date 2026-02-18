// eslint-disable-next-line @typescript-eslint/no-var-requires
const swaggerJsdoc = require('swagger-jsdoc');

const options: Record<string, unknown> = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Giga Notifications Service API',
      version: '2.0.0',
      description: `
## Notifications Service API

Multi-channel notification service supporting Email, SMS, and Push notifications.

### Features
- **Templates**: Reusable notification templates with variable substitution
- **Preferences**: User notification preferences and quiet hours
- **Scheduling**: Schedule notifications for future delivery
- **Bulk Sending**: Campaign-based bulk notifications
- **Analytics**: Delivery tracking and engagement metrics

### Channels
- **Email**: Via SMTP/SendGrid
- **SMS**: Via Twilio
- **Push**: Via Firebase Cloud Messaging

### Queue Architecture (BullMQ)
- Email Queue: Email delivery
- SMS Queue: SMS delivery
- Push Queue: Push notifications
- Scheduled Queue: Delayed notifications
- Bulk Queue: Campaign processing
      `,
      contact: { name: 'Giga Platform Team', email: 'api@giga.com' },
    },
    servers: [{ url: '/api/v1', description: 'API v1' }],
    tags: [
      { name: 'Health', description: 'Service health checks' },
      { name: 'Notifications', description: 'Send notifications' },
      { name: 'Templates', description: 'Notification templates' },
      { name: 'Preferences', description: 'User preferences' },
      { name: 'Campaigns', description: 'Bulk campaigns' },
      { name: 'Analytics', description: 'Delivery analytics' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token from Supabase Auth',
        },
      },
      schemas: {
        // Request schemas
        SendNotificationRequest: {
          type: 'object',
          required: ['userId', 'type', 'recipient'],
          properties: {
            userId: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            type: { type: 'string', enum: ['email', 'sms', 'push'], example: 'email' },
            templateId: {
              type: 'string',
              format: 'uuid',
              description: 'Use template instead of body',
            },
            recipient: { type: 'string', example: 'user@example.com' },
            subject: { type: 'string', example: 'Your order has been confirmed' },
            body: {
              type: 'string',
              example: 'Hello {{name}}, your order #{{orderId}} is confirmed.',
            },
            variables: {
              type: 'object',
              additionalProperties: { type: 'string' },
              example: { name: 'John', orderId: 'ORD-12345' },
            },
            scheduledFor: {
              type: 'string',
              format: 'date-time',
              description: 'Schedule for future delivery',
            },
            priority: { type: 'integer', minimum: 1, maximum: 5, default: 3, example: 3 },
            campaignId: { type: 'string', format: 'uuid', description: 'Associate with campaign' },
          },
        },
        BulkSendRequest: {
          type: 'object',
          required: ['templateId', 'recipients'],
          properties: {
            templateId: { type: 'string', format: 'uuid' },
            campaignName: { type: 'string', example: 'January Newsletter' },
            recipients: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  userId: { type: 'string', format: 'uuid' },
                  email: { type: 'string', format: 'email' },
                  phone: { type: 'string' },
                  variables: { type: 'object' },
                },
              },
              minItems: 1,
              maxItems: 10000,
            },
            scheduledFor: { type: 'string', format: 'date-time' },
            type: { type: 'string', enum: ['email', 'sms', 'push'], default: 'email' },
          },
        },
        CreateTemplateRequest: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', example: 'order_confirmation' },
            description: { type: 'string', example: 'Sent when an order is placed' },
            subject: { type: 'string', example: 'Order Confirmed - {{orderId}}' },
            email_body: {
              type: 'string',
              example: '<h1>Thanks {{name}}</h1><p>Your order is confirmed.</p>',
            },
            sms_body: {
              type: 'string',
              example: 'Order {{orderId}} confirmed. Track at {{trackingUrl}}',
            },
            push_body: { type: 'string', example: 'Your order is on the way!' },
            push_title: { type: 'string', example: 'Order Update' },
          },
        },
        // Response schemas
        NotificationResponse: {
          type: 'object',
          properties: {
            notificationId: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            jobId: { type: 'string', example: 'email-1234567890' },
            type: { type: 'string', enum: ['email', 'sms', 'push'], example: 'email' },
            status: {
              type: 'string',
              enum: ['queued', 'processing', 'sent', 'delivered', 'failed'],
              example: 'queued',
            },
            scheduledFor: { type: 'string', format: 'date-time' },
          },
        },
        BulkSendResponse: {
          type: 'object',
          properties: {
            campaignId: { type: 'string', format: 'uuid' },
            campaignName: { type: 'string' },
            totalRecipients: { type: 'integer', example: 1500 },
            queued: { type: 'integer', example: 1450 },
            skipped: { type: 'integer', description: 'Skipped due to preferences', example: 50 },
            scheduledFor: { type: 'string', format: 'date-time' },
          },
        },
        // Entity schemas
        Template: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'order_confirmation' },
            description: { type: 'string' },
            subject: { type: 'string' },
            email_body: { type: 'string' },
            sms_body: { type: 'string' },
            push_body: { type: 'string' },
            push_title: { type: 'string' },
            variables: {
              type: 'array',
              items: { type: 'string' },
              example: ['name', 'orderId', 'trackingUrl'],
            },
            is_active: { type: 'boolean', default: true },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        UserPreferences: {
          type: 'object',
          properties: {
            user_id: { type: 'string', format: 'uuid' },
            email_enabled: { type: 'boolean', default: true, example: true },
            sms_enabled: { type: 'boolean', default: true, example: true },
            push_enabled: { type: 'boolean', default: true, example: true },
            marketing_emails: { type: 'boolean', default: true },
            booking_notifications: { type: 'boolean', default: true },
            payment_notifications: { type: 'boolean', default: true },
            delivery_notifications: { type: 'boolean', default: true },
            social_notifications: { type: 'boolean', default: true },
            security_notifications: { type: 'boolean', default: true },
            email_frequency: {
              type: 'string',
              enum: ['realtime', 'daily', 'weekly'],
              default: 'realtime',
            },
            quiet_hours_start: { type: 'string', example: '22:00' },
            quiet_hours_end: { type: 'string', example: '07:00' },
            timezone: { type: 'string', example: 'Africa/Lagos' },
          },
        },
        NotificationHistory: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            type: { type: 'string', enum: ['email', 'sms', 'push'] },
            recipient: { type: 'string' },
            subject: { type: 'string' },
            status: {
              type: 'string',
              enum: ['queued', 'processing', 'sent', 'delivered', 'failed', 'bounced'],
            },
            sent_at: { type: 'string', format: 'date-time' },
            delivered_at: { type: 'string', format: 'date-time' },
            opened_at: { type: 'string', format: 'date-time' },
            clicked_at: { type: 'string', format: 'date-time' },
            error_message: { type: 'string' },
            campaign_id: { type: 'string', format: 'uuid' },
          },
        },
        Campaign: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'January Newsletter' },
            template_id: { type: 'string', format: 'uuid' },
            type: { type: 'string', enum: ['email', 'sms', 'push'] },
            status: {
              type: 'string',
              enum: ['draft', 'scheduled', 'sending', 'completed', 'cancelled'],
            },
            total_recipients: { type: 'integer', example: 5000 },
            sent_count: { type: 'integer', example: 4800 },
            delivered_count: { type: 'integer', example: 4500 },
            opened_count: { type: 'integer', example: 1200 },
            clicked_count: { type: 'integer', example: 300 },
            failed_count: { type: 'integer', example: 200 },
            scheduled_for: { type: 'string', format: 'date-time' },
            started_at: { type: 'string', format: 'date-time' },
            completed_at: { type: 'string', format: 'date-time' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        DeliveryAnalytics: {
          type: 'object',
          properties: {
            period: { type: 'string', enum: ['day', 'week', 'month'] },
            total_sent: { type: 'integer', example: 15000 },
            total_delivered: { type: 'integer', example: 14500 },
            total_opened: { type: 'integer', example: 8000 },
            total_clicked: { type: 'integer', example: 2500 },
            total_failed: { type: 'integer', example: 500 },
            delivery_rate: { type: 'number', example: 96.67 },
            open_rate: { type: 'number', example: 55.17 },
            click_rate: { type: 'number', example: 17.24 },
            by_channel: {
              type: 'object',
              properties: {
                email: {
                  type: 'object',
                  properties: { sent: { type: 'integer' }, delivered: { type: 'integer' } },
                },
                sms: {
                  type: 'object',
                  properties: { sent: { type: 'integer' }, delivered: { type: 'integer' } },
                },
                push: {
                  type: 'object',
                  properties: { sent: { type: 'integer' }, delivered: { type: 'integer' } },
                },
              },
            },
          },
        },
        // Standard responses
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object' },
            metadata: {
              type: 'object',
              properties: {
                timestamp: { type: 'string', format: 'date-time' },
                service: { type: 'string', example: 'notifications-service' },
              },
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'VALIDATION_ERROR' },
                message: { type: 'string', example: 'Invalid request data' },
              },
            },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 20 },
            total: { type: 'integer', example: 150 },
            pages: { type: 'integer', example: 8 },
          },
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'Unauthorized - Authentication required',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                success: false,
                error: { code: 'AUTHENTICATION_REQUIRED', message: 'Valid JWT token required' },
              },
            },
          },
        },
        ForbiddenError: {
          description: 'Forbidden - Insufficient permissions',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                success: false,
                error: {
                  code: 'FORBIDDEN',
                  message: 'Insufficient permissions to perform this action',
                },
              },
            },
          },
        },
        NotFoundError: {
          description: 'Not Found - Resource does not exist',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                success: false,
                error: { code: 'NOT_FOUND', message: 'Template not found' },
              },
            },
          },
        },
        BadRequestError: {
          description: 'Bad Request - Invalid input',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'Invalid email address' },
              },
            },
          },
        },
        InternalServerError: {
          description: 'Internal Server Error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                success: false,
                error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
              },
            },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
  },
  // Support both development (src/*.ts) and production (dist/*.js)
  apis: ['./src/routes/*.ts', './src/index.ts', './dist/routes/*.js', './dist/index.js'],
};

export const swaggerSpec = swaggerJsdoc(options);
