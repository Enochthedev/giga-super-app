# Enhanced Notifications Service

A production-ready notification service with comprehensive template management,
user preferences, delivery tracking, and analytics.

## 🚀 Features

### Core Functionality

- **Multi-channel notifications**: Email, SMS, and Push notifications
- **Template system**: Create, manage, and use reusable notification templates
- **User preferences**: Respect user notification settings and quiet hours
- **Scheduled notifications**: Send notifications at specific times
- **Bulk operations**: Send notifications to multiple users efficiently
- **Delivery tracking**: Track opens, clicks, and delivery status
- **Analytics**: Comprehensive metrics and reporting
- **Campaign management**: Create and manage notification campaigns

### Advanced Features

- **Quiet hours**: Respect user's quiet hours and timezone preferences
- **Unsubscribe management**: Handle unsubscribe requests with tokens
- **Rate limiting**: Prevent abuse with configurable rate limits
- **Retry logic**: Automatic retry for failed notifications
- **Webhook support**: Integration with external providers (Twilio, SendGrid,
  Firebase)
- **Security**: Comprehensive authentication, authorization, and input
  validation

## 📋 Prerequisites

- Node.js 18+
- Redis (for queue management)
- Supabase project (for database and authentication)
- SMTP server (for email notifications)
- Twilio account (for SMS notifications, optional)
- Firebase project (for push notifications, optional)

## 🛠️ Installation

1. **Install dependencies**:

```bash
npm install
```

2. **Environment setup**:

```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Database setup**: The required database tables are automatically created
   via migrations when the service starts.

4. **Start the service**:

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## 🔧 Configuration

### Environment Variables

```env
# Service Configuration
PORT=3007
NODE_ENV=production

# Database
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Redis (Queue Management)
REDIS_URL=redis://localhost:6379

# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=notifications@yourapp.com

# SMS Configuration (Twilio)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1234567890

# Push Notifications (Firebase)
FIREBASE_PROJECT_ID=your_firebase_project
FIREBASE_PRIVATE_KEY=your_firebase_private_key
FIREBASE_CLIENT_EMAIL=your_firebase_client_email

# Application URLs
BASE_URL=https://yourapp.com
FRONTEND_URL=https://yourapp.com
ALLOWED_ORIGINS=https://yourapp.com,http://localhost:3000
```

## 📚 API Documentation

### Authentication

All API endpoints (except tracking and webhooks) require authentication via JWT
token:

```bash
Authorization: Bearer <your_jwt_token>
```

Admin endpoints require the user to have `role: 'admin'` in their JWT payload.

### Core Endpoints

#### Send Notification

```http
POST /api/v1/notifications/send
Content-Type: application/json
Authorization: Bearer <token>

{
  "userId": "user-uuid",
  "type": "email",
  "templateId": "template-uuid",
  "recipient": "user@example.com",
  "variables": {
    "userName": "John Doe",
    "bookingId": "BK123"
  },
  "scheduledFor": "2024-01-15T10:00:00Z",
  "category": "booking"
}
```

#### Bulk Notifications

```http
POST /api/v1/notifications/bulk
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "templateId": "template-uuid",
  "type": "email",
  "recipients": [
    {
      "userId": "user1-uuid",
      "recipient": "user1@example.com",
      "variables": { "userName": "User 1" }
    },
    {
      "userId": "user2-uuid",
      "recipient": "user2@example.com",
      "variables": { "userName": "User 2" }
    }
  ],
  "globalVariables": {
    "appName": "MyApp"
  }
}
```

### Template Management

#### Create Template

```http
POST /api/v1/templates
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "name": "welcome_email",
  "type": "email",
  "subject": "Welcome to {{appName}}!",
  "body": "<h1>Welcome {{userName}}!</h1><p>Thank you for joining {{appName}}.</p>",
  "is_active": true
}
```

#### List Templates

```http
GET /api/v1/templates?type=email&active=true&page=1&limit=20
Authorization: Bearer <admin_token>
```

#### Preview Template

```http
POST /api/v1/templates/{id}/preview
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "variables": {
    "userName": "John Doe",
    "appName": "MyApp"
  }
}
```

### User Preferences

#### Get Preferences

```http
GET /api/v1/preferences
Authorization: Bearer <token>
```

#### Update Preferences

```http
PUT /api/v1/preferences
Content-Type: application/json
Authorization: Bearer <token>

{
  "email_enabled": true,
  "sms_enabled": false,
  "marketing_emails": false,
  "quiet_hours_start": "22:00",
  "quiet_hours_end": "08:00",
  "timezone": "America/New_York"
}
```

#### Unsubscribe

```http
POST /api/v1/preferences/unsubscribe
Content-Type: application/json
Authorization: Bearer <token>

{
  "type": "email",
  "immediate": true
}
```

### Campaign Management

#### Create Campaign

```http
POST /api/v1/campaigns
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "name": "Welcome Campaign",
  "template_id": "template-uuid",
  "type": "email",
  "target_audience": {
    "user_roles": ["user"],
    "created_after": "2024-01-01T00:00:00Z",
    "active_only": true
  },
  "variables": {
    "appName": "MyApp"
  },
  "scheduled_for": "2024-01-15T10:00:00Z"
}
```

#### Send Campaign

```http
POST /api/v1/campaigns/{id}/send
Authorization: Bearer <admin_token>

{
  "send_immediately": false
}
```

#### Campaign Statistics

```http
GET /api/v1/campaigns/{id}/stats
Authorization: Bearer <admin_token>
```

### Analytics

#### Delivery Rates

```http
GET /api/v1/analytics/delivery-rates?date_from=2024-01-01&date_to=2024-01-31&type=email&group_by=day
Authorization: Bearer <admin_token>
```

#### Engagement Metrics

```http
GET /api/v1/analytics/engagement?date_from=2024-01-01&date_to=2024-01-31&group_by=week
Authorization: Bearer <admin_token>
```

#### Template Performance

```http
GET /api/v1/analytics/templates?date_from=2024-01-01&date_to=2024-01-31&limit=10
Authorization: Bearer <admin_token>
```

### Tracking (Public Endpoints)

#### Email Open Tracking

```http
GET /api/v1/tracking/open/{notificationId}.png
```

#### Email Click Tracking

```http
GET /api/v1/tracking/click/{notificationId}?url=https%3A//example.com
```

#### Webhooks

```http
POST /api/v1/tracking/webhook/twilio
POST /api/v1/tracking/webhook/sendgrid
POST /api/v1/tracking/webhook/firebase
```

## 🎯 Template System

### Template Variables

Templates support variable substitution using `{{variableName}}` syntax:

```html
<h1>Welcome {{userName}}!</h1>
<p>Your booking {{bookingId}} for {{bookingDate}} has been confirmed.</p>
<p>Total amount: {{amount}}</p>
```

### Template Types

- **Email**: Supports `subject` and `body` (HTML)
- **SMS**: Supports `body` (plain text, 160 chars recommended)
- **Push**: Supports `title` and `body`

### Built-in Templates

The service comes with default templates:

- `welcome_email` - User welcome message
- `booking_confirmation_email` - Booking confirmation
- `booking_confirmation_sms` - SMS booking confirmation
- `payment_receipt_email` - Payment receipt
- `password_reset_email` - Password reset

## 👤 User Preferences

### Preference Categories

- **Email notifications**: Enable/disable email notifications
- **SMS notifications**: Enable/disable SMS notifications
- **Push notifications**: Enable/disable push notifications
- **Marketing emails**: Opt-in/out of marketing communications
- **Category preferences**: Booking, payment, delivery, social, security
  notifications
- **Email frequency**: Immediate, daily, weekly, never
- **Quiet hours**: Time range when notifications are delayed
- **Timezone**: User's timezone for quiet hours calculation

### Quiet Hours

When a notification is sent during a user's quiet hours, it's automatically
delayed until the quiet hours end. This respects user preferences while ensuring
important notifications are still delivered.

## 📊 Analytics & Tracking

### Delivery Tracking

- **Sent**: Notification was successfully sent to provider
- **Delivered**: Provider confirmed delivery to recipient
- **Opened**: Email was opened (email only)
- **Clicked**: Link in email was clicked (email only)
- **Failed**: Delivery failed
- **Bounced**: Email bounced

### Analytics Metrics

- **Delivery rates**: Percentage of notifications successfully delivered
- **Open rates**: Percentage of delivered emails that were opened
- **Click rates**: Percentage of opened emails that had links clicked
- **Engagement rates**: Combined open and click metrics
- **Volume statistics**: Notification volume over time
- **Template performance**: Which templates perform best
- **User behavior**: How users engage with notifications

## 🔄 Queue System

The service uses BullMQ with Redis for reliable queue processing:

- **Email queue**: Processes email notifications
- **SMS queue**: Processes SMS notifications
- **Push queue**: Processes push notifications
- **Scheduled queue**: Handles delayed notifications
- **Bulk queue**: Processes bulk notification campaigns
- **Retry queue**: Handles failed notification retries

### Queue Configuration

```javascript
// Queue settings
const queueConfig = {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
};
```

## 🔒 Security

### Authentication & Authorization

- JWT token validation for all protected endpoints
- Role-based access control (admin vs user permissions)
- User context extraction from tokens

### Input Validation

- Comprehensive input validation using express-validator
- SQL injection prevention via parameterized queries
- XSS protection through input sanitization

### Rate Limiting

- 100 requests per 15 minutes per IP address
- Configurable rate limits per endpoint
- Protection against abuse and spam

### Webhook Security

- Signature validation for external webhooks
- HTTPS-only webhook endpoints
- Request logging and monitoring

## 🚀 Deployment

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3007
CMD ["npm", "start"]
```

### Railway Deployment

```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/health"
  }
}
```

### Environment Setup

1. Set all required environment variables
2. Ensure Redis is accessible
3. Configure SMTP/Twilio/Firebase credentials
4. Set up webhook endpoints for delivery tracking
5. Configure CORS for your frontend domains

## 📈 Monitoring

### Health Checks

- `/health` - Basic service health
- `/ready` - Database and Redis connectivity
- `/live` - Liveness probe for Kubernetes

### Logging

Structured JSON logging with Winston:

- Request/response logging
- Error tracking with stack traces
- Performance metrics
- Security events

### Metrics

Monitor these key metrics:

- Queue processing rates
- Notification delivery rates
- Error rates by type
- Response times
- Memory and CPU usage

## 🔧 Troubleshooting

### Common Issues

1. **Notifications not sending**
   - Check Redis connection
   - Verify SMTP/Twilio credentials
   - Check queue worker status

2. **Template rendering errors**
   - Validate template syntax
   - Ensure all required variables are provided
   - Check for unbalanced braces

3. **Delivery tracking not working**
   - Verify webhook endpoints are accessible
   - Check webhook signature validation
   - Ensure tracking pixels are not blocked

4. **High memory usage**
   - Monitor queue sizes
   - Check for memory leaks in workers
   - Adjust queue concurrency settings

### Debug Mode

Enable debug logging:

```env
LOG_LEVEL=debug
```

### Queue Monitoring

Use BullMQ dashboard for queue monitoring:

```bash
npm install -g bull-board
bull-board
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:

- Create an issue in the repository
- Check the troubleshooting section
- Review the API documentation
- Monitor service logs for errors

---

**Enhanced Notifications Service v2.0** - Production-ready notification system
with comprehensive features for modern applications.
