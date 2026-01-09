# Delivery Service

A comprehensive delivery and logistics service for the Giga platform, built with
TypeScript, Node.js, and Express. This service handles delivery assignments,
route optimization, courier management, and real-time tracking.

## Features

### Core Functionality

- **Delivery Assignment Management**: Create, track, and manage delivery
  assignments
- **Route Optimization**: Intelligent route planning using Google Maps API
- **Real-time Tracking**: GPS-based delivery tracking with status updates
- **Courier Management**: Integration with courier profiles and availability
- **Exception Handling**: Comprehensive delivery exception management
- **Performance Analytics**: Delivery metrics and performance tracking

### Technical Features

- **TypeScript**: Full type safety and modern JavaScript features
- **Express.js**: Fast and minimal web framework
- **Supabase Integration**: Secure database connection with connection pooling
- **Google Maps API**: Route optimization and geocoding services
- **Caching**: In-memory caching with NodeCache for performance
- **Rate Limiting**: Configurable rate limiting for API protection
- **Authentication**: JWT-based authentication with role-based access
- **Validation**: Comprehensive input validation with express-validator
- **Error Handling**: Structured error handling with detailed logging
- **Health Checks**: Kubernetes-compatible health and readiness endpoints
- **Monitoring**: Prometheus-compatible metrics endpoint

## Architecture

### Service Structure

```
delivery-service/
├── src/
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Utility functions (database, logger, cache)
│   ├── services/        # External service integrations (Google Maps)
│   ├── middleware/      # Express middleware (auth, validation, rate limiting)
│   ├── routes/          # API route handlers
│   └── index.ts         # Application entry point
├── Dockerfile           # Multi-stage Docker build
├── railway.json         # Railway deployment configuration
└── package.json         # Dependencies and scripts
```

### Database Integration

- **Primary Database**: Supabase PostgreSQL
- **Connection**: Secure connection with service role authentication
- **Tables**: Integrates with courier_profiles, delivery_assignments,
  delivery_routes, delivery_tracking
- **Transactions**: ACID-compliant operations with proper error handling

### External Services

- **Google Maps API**: Route optimization, geocoding, distance calculations
- **Supabase Auth**: JWT token validation and user management
- **Notification Service**: Integration for delivery status notifications
  (planned)

## API Endpoints

### Health Endpoints

- `GET /health` - Basic health check
- `GET /ready` - Readiness check with dependency validation
- `GET /live` - Liveness check for Kubernetes
- `GET /status` - Detailed service status (authenticated)
- `GET /metrics` - Prometheus-compatible metrics

### Delivery Endpoints (Planned)

- `POST /api/v1/deliveries/assign` - Create new delivery assignment
- `GET /api/v1/deliveries/:id` - Get delivery details
- `PUT /api/v1/deliveries/:id/status` - Update delivery status
- `POST /api/v1/deliveries/:id/track` - Add tracking update
- `GET /api/v1/deliveries/:id/tracking` - Get tracking history

### Route Optimization Endpoints (Planned)

- `POST /api/v1/routes/optimize` - Optimize delivery routes
- `GET /api/v1/routes/:courierId` - Get courier's optimized route
- `POST /api/v1/routes/calculate` - Calculate route between addresses

### Courier Integration Endpoints (Planned)

- `GET /api/v1/couriers/nearby` - Find nearby available couriers
- `PUT /api/v1/couriers/:id/availability` - Update courier availability
- `GET /api/v1/couriers/:id/assignments` - Get courier's assignments

## Configuration

### Environment Variables

```bash
# Server Configuration
NODE_ENV=development
PORT=3003
SERVICE_NAME=delivery-service

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key

# Database Configuration
DB_POOL_SIZE=10
DB_CONNECTION_TIMEOUT=30000
DB_IDLE_TIMEOUT=600000

# JWT Configuration
JWT_SECRET=your-jwt-secret-key

# Google Maps API
GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# Cache Configuration
CACHE_TTL=300
CACHE_MAX_KEYS=1000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Delivery Configuration
DEFAULT_DELIVERY_RADIUS_KM=50
MAX_DELIVERY_RADIUS_KM=200
DELIVERY_FEE_PER_KM=50
MIN_DELIVERY_FEE=200
MAX_DELIVERY_FEE=2000
```

## Development

### Prerequisites

- Node.js 18+
- npm or yarn
- Docker (for containerized development)
- Google Maps API key
- Supabase project with service role key

### Local Development

1. **Clone and install dependencies**:

```bash
cd delivery-service
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

4. **Run tests**:

```bash
npm test
```

5. **Type checking**:

```bash
npm run type-check
```

### Docker Development

1. **Build Docker image**:

```bash
docker build -t delivery-service .
```

2. **Run container**:

```bash
docker run -p 3003:3003 --env-file .env delivery-service
```

## Deployment

### Railway Deployment

1. **Configure Railway project**:

```bash
railway login
railway init
```

2. **Set environment variables**:

```bash
railway variables set SUPABASE_URL=your-url
railway variables set SUPABASE_SERVICE_ROLE_KEY=your-key
railway variables set GOOGLE_MAPS_API_KEY=your-key
```

3. **Deploy**:

```bash
railway up
```

### Docker Deployment

The service includes a multi-stage Dockerfile optimized for production:

- **Builder stage**: Installs dependencies and builds TypeScript
- **Production stage**: Minimal Alpine Linux image with only runtime
  dependencies
- **Security**: Runs as non-root user with proper signal handling
- **Health checks**: Built-in health check for container orchestration

## Monitoring and Observability

### Logging

- **Structured logging**: JSON format with request tracing
- **Log levels**: Configurable log levels (debug, info, warn, error)
- **Request correlation**: Unique request IDs for tracing
- **Audit logging**: Security events and sensitive operations

### Metrics

- **Prometheus metrics**: Available at `/metrics` endpoint
- **Performance metrics**: Response times, error rates, throughput
- **Business metrics**: Delivery success rates, courier utilization
- **System metrics**: Memory usage, CPU usage, cache hit rates

### Health Checks

- **Liveness**: Basic service availability
- **Readiness**: Dependency health (database, external APIs)
- **Startup**: Graceful startup with dependency validation

## Security

### Authentication & Authorization

- **JWT Authentication**: Supabase-based token validation
- **Role-based Access**: Different permissions for users, couriers, admins
- **Courier Verification**: Additional verification for courier-specific
  endpoints

### API Security

- **Rate Limiting**: Configurable rate limits per user/IP
- **Input Validation**: Comprehensive validation with sanitization
- **CORS**: Configurable cross-origin resource sharing
- **Security Headers**: Helmet.js security headers
- **Request Timeouts**: Prevent resource exhaustion

### Data Security

- **Connection Security**: SSL/TLS for all external connections
- **Sensitive Data**: Proper handling of location and personal data
- **Audit Logging**: All operations logged for compliance

## Performance

### Optimization Features

- **Connection Pooling**: Efficient database connection management
- **Caching**: In-memory caching for frequently accessed data
- **Compression**: Response compression for bandwidth optimization
- **Route Optimization**: Efficient algorithms for delivery route planning

### Performance Targets

- **Response Time**: <200ms for 95th percentile
- **Throughput**: 1000+ requests per second
- **Availability**: 99.9% uptime
- **Cache Hit Rate**: >80% for frequently accessed data

## Integration

### Supabase Integration

- **Database**: Direct connection to Supabase PostgreSQL
- **Authentication**: Supabase Auth for user management
- **Real-time**: Supabase Realtime for live updates (planned)
- **Storage**: Supabase Storage for delivery photos (planned)

### Google Maps Integration

- **Route Calculation**: Directions API for route planning
- **Geocoding**: Convert addresses to coordinates
- **Distance Matrix**: Bulk distance calculations
- **Route Optimization**: Traveling salesman problem solving

### API Gateway Integration

- **Service Discovery**: Register with API Gateway
- **Load Balancing**: Distribute requests across instances
- **Circuit Breaker**: Fault tolerance patterns
- **Request Routing**: Route delivery requests to service

## Contributing

### Development Guidelines

- **TypeScript**: Use strict TypeScript with proper typing
- **Testing**: Write tests for all business logic
- **Documentation**: Document all public APIs and complex logic
- **Code Style**: Follow ESLint and Prettier configurations

### Code Quality

- **Linting**: ESLint with TypeScript rules
- **Formatting**: Prettier for consistent code formatting
- **Type Checking**: Strict TypeScript compilation
- **Testing**: Jest with comprehensive test coverage

## License

MIT License - see LICENSE file for details.

## Support

For support and questions:

- **Documentation**: Check this README and inline code documentation
- **Issues**: Create GitHub issues for bugs and feature requests
- **Monitoring**: Check service health at `/health` and `/status` endpoints
