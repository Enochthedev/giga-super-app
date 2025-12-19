# Giga API Gateway

Unified API Gateway for the Giga Platform that routes requests between Supabase
and Railway services.

## Overview

The API Gateway serves as the single entry point for all client requests,
providing:

- **Unified Routing**: Routes requests to appropriate backend services (Supabase
  or Railway)
- **Authentication**: Validates JWT tokens and forwards user context
- **Rate Limiting**: Protects services from abuse
- **Response Standardization**: Ensures consistent API responses
- **Health Monitoring**: Monitors service health and availability
- **Caching**: Improves performance with intelligent caching

## Architecture

```
Mobile/Web Clients
        ↓
   API Gateway (Railway)
        ↓
   ┌─────────────────┐
   ↓                 ↓
Supabase Services   Railway Services
- Authentication    - Social Media
- Payment Core      - Ads Service
- Hotel Core        - Admin Service
- Ecommerce Core    - Media Processing
- Taxi Core         - Communication
- Wallet Ops        - Extended Services
```

## Service Distribution

### Supabase Services (56 functions)

- Database-intensive operations (avg 7.8/10 DB intensity)
- Core business logic with ACID requirements
- Real-time subscriptions and auth integration

### Railway Services (38+ functions)

- Compute-intensive operations (avg 5.7/10 compute intensity)
- External API integrations
- Media processing and analytics

## Quick Start

### Local Development

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Configure environment**:

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

### Docker Deployment

1. **Build image**:

   ```bash
   docker build -t giga-api-gateway .
   ```

2. **Run container**:
   ```bash
   docker run -p 3000:3000 --env-file .env giga-api-gateway
   ```

### Railway Deployment

1. **Connect Railway CLI**:

   ```bash
   railway login
   railway link
   ```

2. **Set environment variables**:

   ```bash
   railway variables set SUPABASE_URL=your-url
   railway variables set SUPABASE_ANON_KEY=your-key
   # Set other required variables
   ```

3. **Deploy**:
   ```bash
   railway up
   ```

## Configuration

### Environment Variables

| Variable                    | Description                  | Required           |
| --------------------------- | ---------------------------- | ------------------ |
| `SUPABASE_URL`              | Supabase project URL         | Yes                |
| `SUPABASE_ANON_KEY`         | Supabase anonymous key       | Yes                |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key    | Yes                |
| `JWT_SECRET`                | JWT signing secret           | Yes                |
| `SOCIAL_SERVICE_URL`        | Social media service URL     | Yes                |
| `ADMIN_SERVICE_URL`         | Admin service URL            | Yes                |
| `MEDIA_SERVICE_URL`         | Media processing service URL | Yes                |
| `ADS_SERVICE_URL`           | Ads service URL              | Yes                |
| `PORT`                      | Server port                  | No (default: 3000) |
| `LOG_LEVEL`                 | Logging level                | No (default: info) |

### Service Registry

The gateway automatically discovers and routes to services based on URL
patterns:

- `/api/v1/auth/*` → Supabase Auth
- `/api/v1/hotels/*` → Supabase Hotel Core
- `/api/v1/payments/*` → Supabase Payment Core
- `/api/v1/social/*` → Railway Social Service
- `/api/v1/admin/*` → Railway Admin Service
- `/api/v1/media/*` → Railway Media Service
- `/api/v1/ads/*` → Railway Ads Service

## API Documentation

### Health Endpoints

- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed health with service status
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe

### Authentication

All API requests (except health checks) require authentication:

```bash
curl -H "Authorization: Bearer <jwt-token>" \
     https://api-gateway.railway.app/api/v1/hotels
```

### Response Format

All responses follow a standardized format:

```json
{
  "success": true,
  "data": { ... },
  "metadata": {
    "timestamp": "2023-12-18T10:00:00Z",
    "request_id": "req_123",
    "version": "1.0.0"
  }
}
```

Error responses:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  },
  "metadata": {
    "timestamp": "2023-12-18T10:00:00Z",
    "request_id": "req_123",
    "version": "1.0.0"
  }
}
```

## Development

### Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with hot reload
- `npm test` - Run test suite
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues

### Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test -- --testPathPattern=routing

# Run tests with coverage
npm test -- --coverage
```

### Monitoring

The gateway provides comprehensive monitoring:

- **Request Logging**: All requests logged with timing and status
- **Error Tracking**: Detailed error logging with stack traces
- **Service Health**: Continuous health monitoring of downstream services
- **Performance Metrics**: Response times and throughput tracking

## Security

- **JWT Validation**: All requests validated against Supabase auth
- **Rate Limiting**: Configurable rate limits per client
- **CORS Protection**: Configurable CORS policies
- **Helmet Security**: Security headers and CSP policies
- **Input Validation**: Request validation and sanitization

## Troubleshooting

### Common Issues

1. **Service Unavailable (503)**
   - Check service URLs in environment variables
   - Verify downstream services are running
   - Check network connectivity

2. **Authentication Failed (401)**
   - Verify JWT token is valid
   - Check Supabase configuration
   - Ensure token hasn't expired

3. **Rate Limited (429)**
   - Reduce request frequency
   - Check rate limit configuration
   - Consider implementing client-side retry logic

### Logs

Check application logs for detailed error information:

```bash
# Railway logs
railway logs

# Docker logs
docker logs <container-id>

# Local development
npm run dev
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## License

MIT License - see LICENSE file for details.
