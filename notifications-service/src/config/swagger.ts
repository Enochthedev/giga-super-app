import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
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
        BearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        SendNotificationRequest: {
          type: 'object',
          required: ['userId', 'type', 'recipient'],
          properties: {
            userId: { type: 'string', format: 'uuid' },
            type: { type: 'string', enum: ['email', 'sms', 'push'] },
            templateId: { type: 'string', format: 'uuid' },
            recipient: { type: 'string' },
            subject: { type: 'string' },
            body: { type: 'string' },
            variables: { type: 'object' },
            scheduledFor: { type: 'string', format: 'date-time' },
            priority: { type: 'integer', minimum: 1, maximum: 5 },
          },
        },
        NotificationResponse: {
          type: 'object',
          properties: {
            notificationId: { type: 'string', format: 'uuid' },
            jobId: { type: 'string' },
            type: { type: 'string' },
            status: { type: 'string', enum: ['queued', 'sent', 'failed'] },
          },
        },
        Template: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            subject: { type: 'string' },
            email_body: { type: 'string' },
            sms_body: { type: 'string' },
            push_body: { type: 'string' },
            variables: { type: 'array', items: { type: 'string' } },
          },
        },
        UserPreferences: {
          type: 'object',
          properties: {
            user_id: { type: 'string', format: 'uuid' },
            email_enabled: { type: 'boolean' },
            sms_enabled: { type: 'boolean' },
            push_enabled: { type: 'boolean' },
            quiet_hours_start: { type: 'string' },
            quiet_hours_end: { type: 'string' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string' },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
  },
  apis: ['./src/routes/*.ts', './src/index.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
