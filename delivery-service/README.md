# Giga Delivery Service

Production-ready delivery and logistics service for the Giga platform, built with TypeScript following microservices best practices. Handles delivery assignments, package management, courier onboarding, route optimization, real-time tracking, and automated scheduling.

## Features

### Core Functionality

- **Package Management**: Full CRUD operations for delivery packages with tracking and status management
- **Courier Onboarding & Management**: Complete courier lifecycle from onboarding to performance tracking
- **Delivery Assignments**: Intelligent courier matching and assignment with conflict resolution
- **Route Optimization**: Google Maps-powered route optimization with traveling salesman algorithm
- **Real-time Tracking**: GPS-based delivery tracking with WebSocket support for live updates
- **Automated Scheduling**: Background jobs for route optimization, status updates, and analytics
- **Exception Handling**: Comprehensive delivery exception management and resolution
- **Performance Analytics**: Delivery metrics, courier stats, and engagement tracking

### Technical Features

- **Language**: TypeScript (100% type-safe)
- **Runtime**: Node.js 18+
- **Framework**: Express.js with production middleware
- **Database**: Supabase PostgreSQL with RLS policies
- **Authentication**: JWT token validation via Supabase Auth with RBAC
- **External APIs**: Google Maps API for geocoding and route optimization
- **WebSocket**: Socket.io for real-time tracking and notifications
- **Logging**: Structured JSON logging with Winston
- **Validation**: express-validator with custom error handling
- **Rate Limiting**: Tiered rate limiting (general, write, strict)
- **Security**: Helmet, CORS, input sanitization, role-based access
- **Caching**: In-memory caching with NodeCache for performance
- **Scheduling**: Automated background jobs with configurable intervals

## Architecture

### Technology Stack

```
delivery-service/
├── src/
│   ├── config/           # Centralized configuration with validation
│   ├── middleware/       # Auth, rate limiting, validation, error handling
│   ├── services/         # Business logic layer
│   │   ├── package.ts
│   │   ├── courier.ts
│   │   ├── deliveryAssignment.ts
│   │   ├── automaticAssignment.ts
│   │   ├── tracking.ts
│   │   ├── routeOptimization.ts
│   │   ├── googleMaps.ts
│   │   └── websocket.ts
│   ├── routes/           # HTTP route handlers
│   ├── types/            # TypeScript interfaces and types
│   ├── utils/            # Error handling, logging, database utilities
│   └── index.ts          # Application entry point
├── Dockerfile            # Multi-stage Docker build
├── railway.json          # Railway deployment configuration
└── package.json          # Dependencies and scripts
```

### Service Layer Architecture

- **Package Service**: CRUD operations, status updates, cancellation
- **Courier Service**: Onboarding, profile management, availability tracking, verification
- **Delivery Assignment Service**: Intelligent matching, conflict resolution, assignment creation
- **Automatic Assignment Service**: Background courier matching
- **Tracking Service**: GPS tracking, status updates, history
- **Route Optimization Service**: Google Maps integration, TSP solving
- **WebSocket Service**: Real-time updates, connection management
- **Scheduler Service**: Background jobs, automated tasks

## API Endpoints

### Health Checks
- `GET /health` - Service health status
- `GET /health/ready` - Readiness check (includes database connection)

### Package Management
- `POST /api/v1/packages` - Create a new delivery package (auth required)
- `GET /api/v1/packages/:packageId` - Get package details
- `GET /api/v1/packages/sender/:senderId` - Get packages by sender (paginated)
- `GET /api/v1/packages/status/:status` - Get packages by status (paginated)
- `PUT /api/v1/packages/:packageId` - Update package information
- `POST /api/v1/packages/:packageId/cancel` - Cancel a package
- `DELETE /api/v1/packages/:packageId` - Soft delete a package

### Courier Management
- `POST /api/v1/couriers` - Create courier profile / onboarding (auth required)
- `GET /api/v1/couriers/:courierId` - Get courier details
- `GET /api/v1/couriers/user/:userId` - Get courier profile by user ID
- `GET /api/v1/couriers` - List couriers with filtering (verification status, availability, vehicle type)
- `PUT /api/v1/couriers/:courierId` - Update courier profile
- `POST /api/v1/couriers/:courierId/location` - Update courier location
- `POST /api/v1/couriers/:courierId/availability` - Update availability status
- `POST /api/v1/couriers/:courierId/verification` - Update verification status (admin/moderator only)
- `GET /api/v1/couriers/:courierId/stats` - Get courier statistics and performance metrics

### Delivery Assignments
- `POST /api/v1/assignments` - Create new delivery assignment with intelligent courier matching
- `GET /api/v1/assignments/:assignmentId` - Get assignment details with full context
- `GET /api/v1/assignments/courier/:courierId` - Get courier's assignments (paginated)
- `PUT /api/v1/assignments/:assignmentId/status` - Update assignment status with validation
- `POST /api/v1/assignments/:assignmentId/reassign` - Reassign to different courier
- `GET /api/v1/assignments/:assignmentId/history` - Get assignment status history

### Tracking
- `POST /api/v1/track-delivery` - Update delivery location and status with real-time tracking
- `GET /api/v1/tracking/:assignmentId` - Get tracking history for assignment
- `GET /api/v1/tracking/:assignmentId/latest` - Get latest tracking update
- `GET /api/v1/tracking/courier/:courierId` - Get courier's current tracking data

### Route Optimization
- `POST /api/v1/routes/optimize` - Optimize delivery routes for courier
- `GET /api/v1/routes/:courierId` - Get courier's optimized route
- `GET /api/v1/routes/:courierId/current` - Get current route for active deliveries

### WebSocket
- `GET /api/v1/websocket/token` - Get WebSocket authentication token
- **WebSocket Events**:
  - `tracking:update` - Real-time delivery location updates
  - `status:update` - Delivery status change notifications
  - `assignment:new` - New assignment notifications for couriers
  - `route:optimized` - Route optimization completion

### Scheduler
- `POST /api/v1/scheduler/trigger/:jobType` - Manually trigger scheduled job (admin only)
- `GET /api/v1/scheduler/status` - Get scheduler status and job history
- **Automated Jobs**:
  - Route optimization for active couriers
  - Assignment status sync
  - Performance metrics calculation
  - Stale assignment cleanup

## Environment Variables

```bash
# Server Configuration
PORT=3003
NODE_ENV=production
SERVICE_NAME=delivery-service

# Supabase Configuration
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key

# Authentication
JWT_SECRET=your-jwt-secret

# Google Maps API
GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# Caching
CACHE_TTL=300
CACHE_MAX_KEYS=1000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Pagination
PAGINATION_DEFAULT_LIMIT=20
PAGINATION_MAX_LIMIT=100

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Delivery Configuration
DEFAULT_DELIVERY_RADIUS_KM=25
MAX_DELIVERY_RADIUS_KM=50
MIN_COURIER_RATING=2.0
MAX_COURIER_ASSIGNMENTS=5

# Scheduler Configuration
SCHEDULER_ENABLED=true
ROUTE_OPTIMIZATION_INTERVAL=300000
STATUS_SYNC_INTERVAL=60000
METRICS_CALCULATION_INTERVAL=3600000
```

## Development

### Prerequisites
- Node.js 18+
- TypeScript 5.3+
- Docker (for containerized deployment)
- Google Maps API key
- Access to Supabase database

### Local Setup

```bash
# Install dependencies
npm install

# Run in development mode (with hot reload)
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint
npm run lint:fix

# Build for production
npm run build

# Run production build
npm start
```

### Docker Deployment

```bash
# Build Docker image
docker build -t giga-delivery-service .

# Run Docker container
docker run -p 3003:3003 --env-file .env giga-delivery-service
```

### Railway Deployment

This service is configured for Railway deployment with:
- Multi-stage Docker build for optimized image size
- Health check endpoints for container orchestration
- Graceful shutdown handling
- Production-ready logging

## Database Schema

### Main Tables
- `delivery_packages` - Packages with sender/recipient details, weight, dimensions
- `courier_profiles` - Courier information, vehicle details, performance metrics
- `delivery_assignments` - Assignments linking packages to couriers with routing
- `delivery_tracking` - GPS tracking history with timestamps
- `route_optimizations` - Optimized routes with waypoints and sequences

### Database Functions

All database functions are defined in `/supabase/migrations/20260110_delivery_service_schema.sql`:

**Courier Functions:**
- `update_courier_rating(courier_id, new_rating)` - Update courier rating
- `update_courier_stats(courier_id)` - Recalculate courier statistics
- `get_nearby_couriers(lat, lng, radius, limit)` - Find available couriers

**Analytics Functions:**
- Courier performance metrics
- Delivery success rates
- Average delivery times

## Security

### Authentication & Authorization
- JWT token validation on all protected endpoints
- Role-based access control (RBAC) for admin/moderator operations
- Row-Level Security (RLS) policies on all tables
- Courier verification status checks
- User profile validation and activity checking

### Rate Limiting
- **General**: 100 requests/minute
- **Write Operations**: 50 requests/minute
- **Admin Operations**: 20 requests/minute
- IP-based with configurable windows

### Input Validation
- Comprehensive validation using express-validator
- UUID validation for all IDs
- Coordinate validation (-90 to 90 for lat, -180 to 180 for lng)
- Enum validation for types and statuses
- Weight and dimension limits

### Security Headers
- Helmet.js for secure HTTP headers
- CORS with configurable origins
- Request ID tracking for audit trails
- SQL injection prevention via parameterized queries

## Performance

### Optimization Strategies
- Service layer architecture for business logic separation
- Efficient database queries with proper indexing
- Pagination on all list endpoints (configurable limits)
- In-memory caching for frequently accessed data (5-minute TTL)
- Google Maps API call batching and caching
- Intelligent courier matching algorithm with scoring
- Route optimization using traveling salesman algorithm

### Database Optimization
- Proper indexes on frequently queried columns
- Counter columns to avoid COUNT queries
- Soft deletes for data retention
- Connection pooling for high concurrency
- Optimized geospatial queries for courier matching

### Caching Strategy
- 5-minute TTL for frequently accessed data
- Configurable cache size (default: 1000 keys)
- Cache invalidation on updates
- Google Maps responses cached per route

## Monitoring & Observability

### Logging
- Structured JSON logs with Winston
- Request ID tracking across all logs
- Log levels: error, warn, info, debug
- Operational vs system error classification

### Health Checks
- `/health` - Basic health status
- `/health/ready` - Database connection verification
- Docker healthcheck integration

### Error Handling
- Custom error classes with status codes
- Consistent error response format
- Stack traces in development only
- Graceful error recovery

## API Response Format

All endpoints follow a consistent response format:

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "metadata": {
    "timestamp": "2026-01-10T12:00:00.000Z",
    "request_id": "uuid-v4",
    "version": "1.0.0"
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "total_pages": 5,
    "has_previous": false,
    "has_next": true,
    "previous_page": null,
    "next_page": 2
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": { ... }
  },
  "metadata": {
    "timestamp": "2026-01-10T12:00:00.000Z",
    "request_id": "uuid-v4",
    "version": "1.0.0"
  }
}
```

## Integration

### Supabase Integration
- **Database**: Direct connection to Supabase PostgreSQL
- **Authentication**: Supabase Auth for JWT validation
- **RLS Policies**: Row-level security for all tables
- **Real-time**: WebSocket for live tracking updates

### Google Maps Integration
- **Directions API**: Route planning and optimization
- **Geocoding API**: Convert addresses to coordinates
- **Distance Matrix API**: Bulk distance calculations
- **Route Optimization**: Traveling salesman problem solving

### WebSocket Integration
- **Socket.io**: Real-time bidirectional communication
- **Authentication**: JWT-based WebSocket authentication
- **Events**: Tracking updates, status changes, new assignments
- **Rooms**: Courier-specific and assignment-specific rooms

## Courier Matching Algorithm

The intelligent courier matching system scores available couriers based on:

1. **Distance Score** (40%): Proximity to pickup location
2. **Rating Score** (25%): Courier performance rating
3. **Experience Score** (15%): Total completed deliveries
4. **Workload Score** (10%): Current assignment load
5. **Availability Score** (5%): Online status and availability
6. **Priority Bonus** (5%): High-priority delivery bonus

### Matching Process:
1. Find couriers within delivery radius
2. Filter by vehicle capacity and type
3. Check availability and verification status
4. Score each courier using weighted algorithm
5. Return top-scored couriers with reasoning
6. Handle conflicts with reassignment strategies

## Route Optimization

The route optimization service uses Google Maps Directions API with:

- **Traveling Salesman Problem (TSP)** solving for optimal sequence
- **Multi-waypoint routing** for efficient delivery paths
- **Traffic consideration** for accurate ETAs
- **Fuel cost estimation** based on distance
- **Efficiency scoring** for route quality metrics

### Optimization Features:
- Automatic re-optimization when new assignments added
- Consideration of delivery time windows
- Priority-based routing for urgent deliveries
- Real-time traffic data integration

## Troubleshooting

### Database Connection Issues
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- Check network connectivity to Supabase
- Review RLS policies for service role access

### Google Maps API Issues
- Verify `GOOGLE_MAPS_API_KEY` is valid and enabled
- Check API quotas and billing
- Review API restrictions (IP, domain)

### Authentication Failures
- Ensure JWT tokens are valid and not expired
- Verify user profiles exist and `is_active = true`
- Check courier verification status for courier endpoints

### Performance Issues
- Monitor slow query logs
- Increase cache TTL for frequently accessed data
- Review Google Maps API call patterns
- Check database connection pool size

### WebSocket Connection Issues
- Verify WebSocket token is valid
- Check CORS configuration for WebSocket origins
- Review firewall rules for WebSocket protocol

## Contributing

1. Follow TypeScript best practices
2. Maintain 100% type coverage
3. Follow the service layer pattern
4. Write comprehensive tests for new features
5. Update API documentation
6. Ensure all tests pass before submitting PR
7. Follow coding standards in `.kiro/steering/`

## License

MIT

## Support

For issues and questions:
- Check `/health` and `/health/ready` endpoints for service status
- Review structured logs for debugging
- Create GitHub issues for bugs and feature requests
