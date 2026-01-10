# Giga Social Media Service

Production-ready social media service for the Giga platform, built with TypeScript and following microservices best practices. Handles posts, comments, likes, stories, social feeds, user connections, and content moderation.

## Features

- **Social Posts**: Create, read, update, and delete posts with media support, visibility controls, and tagging
- **Comments**: Nested comment system with unlimited reply depth
- **Reactions**: Multi-reaction system (like, love, haha, wow, sad, angry)
- **Stories**: 24-hour expiring content with view tracking
- **Shares**: Repost, quote, and direct send functionality
- **Social Feed**: Personalized, trending, recommended, and explore feeds
- **Connections**: Follow/unfollow system with follower/following management
- **Blocking**: User blocking and privacy controls
- **Content Moderation**: Report system for inappropriate content
- **Real-time Analytics**: Engagement metrics and trending algorithms

## Architecture

### Technology Stack
- **Language**: TypeScript (100% type-safe)
- **Runtime**: Node.js 18+
- **Framework**: Express.js with production middleware
- **Database**: Supabase PostgreSQL with RLS policies
- **Authentication**: JWT token validation via Supabase Auth
- **Logging**: Structured JSON logging with Winston
- **Validation**: express-validator with custom error handling
- **Rate Limiting**: Tiered rate limiting (general, write, strict)
- **Security**: Helmet, CORS, input sanitization

### Service Layer Architecture
```
src/
├── config/           # Centralized configuration with validation
├── middleware/       # Auth, rate limiting, validation, error handling
├── services/         # Business logic layer
│   ├── postService.ts
│   ├── commentService.ts
│   ├── likeService.ts
│   ├── feedService.ts
│   ├── storyService.ts
│   ├── shareService.ts
│   ├── connectionService.ts
│   └── reportService.ts
├── routes/           # HTTP route handlers
├── types/            # TypeScript interfaces and types
├── utils/            # Error handling, logging, database utilities
└── app.ts            # Application entry point
```

## API Endpoints

### Health Checks
- `GET /health` - Service health status
- `GET /health/ready` - Readiness check (includes database connection)

### Posts
- `POST /api/v1/posts` - Create a new post (auth required)
- `GET /api/v1/posts/:postId` - Get post details with user info
- `GET /api/v1/posts/user/:userId` - Get user's posts (paginated)
- `PUT /api/v1/posts/:postId` - Update a post (owner only)
- `DELETE /api/v1/posts/:postId` - Soft delete a post (owner only)

### Comments
- `POST /api/v1/comments` - Create a comment (auth required)
- `GET /api/v1/comments/post/:postId` - Get post comments (paginated)
- `GET /api/v1/comments/:commentId/replies` - Get comment replies (paginated)
- `PUT /api/v1/comments/:commentId` - Update a comment (owner only)
- `DELETE /api/v1/comments/:commentId` - Delete a comment (owner only)

### Likes & Reactions
- `POST /api/v1/likes/posts/:postId` - Toggle like/reaction on a post
- `POST /api/v1/likes/comments/:commentId` - Toggle like/reaction on a comment
- `GET /api/v1/likes/posts/:postId/users` - Get users who liked a post
- `GET /api/v1/likes/posts/:postId/breakdown` - Get reaction breakdown

### Feed
- `GET /api/v1/feed` - Personalized feed (auth required, filter: all/friends/following)
- `GET /api/v1/feed/trending` - Trending posts (optional auth, timeframe: 24h/7d/30d)
- `GET /api/v1/feed/recommended` - Recommended posts (auth required)
- `GET /api/v1/feed/explore` - Explore feed (popular public posts)

### Stories
- `POST /api/v1/stories` - Create a story (auth required)
- `GET /api/v1/stories` - Get network stories (auth required)
- `GET /api/v1/stories/my` - Get own stories (auth required)
- `GET /api/v1/stories/:storyId` - Get specific story
- `POST /api/v1/stories/:storyId/view` - Record story view
- `GET /api/v1/stories/:storyId/viewers` - Get story viewers (owner only)
- `DELETE /api/v1/stories/:storyId` - Delete story (owner only)

### Shares
- `POST /api/v1/shares` - Share a post (types: repost, quote, send)
- `GET /api/v1/shares/post/:postId` - Get users who shared a post

### Connections
- `POST /api/v1/connections/follow` - Follow a user
- `DELETE /api/v1/connections/unfollow/:userId` - Unfollow a user
- `GET /api/v1/connections/followers/:userId` - Get user's followers
- `GET /api/v1/connections/following/:userId` - Get users being followed
- `GET /api/v1/connections/is-following/:userId` - Check if following
- `POST /api/v1/connections/block` - Block a user
- `DELETE /api/v1/connections/unblock/:userId` - Unblock a user
- `GET /api/v1/connections/blocked` - Get blocked users
- `GET /api/v1/connections/is-blocked/:userId` - Check if blocked

### Reports
- `POST /api/v1/reports` - Report content (auth required)
- `GET /api/v1/reports` - Get reports (moderator/admin only)
- `PUT /api/v1/reports/:reportId/status` - Update report status (moderator/admin only)

## Environment Variables

```bash
# Server Configuration
PORT=3001
NODE_ENV=production

# Supabase Configuration
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key

# Authentication
JWT_SECRET=your-jwt-secret

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

# Social Features
MAX_MEDIA_UPLOADS=10
MAX_CONTENT_LENGTH=5000
MAX_COMMENT_LENGTH=2000
STORY_EXPIRATION_HOURS=24
TRENDING_TIMEFRAME_HOURS=24
```

## Development

### Prerequisites
- Node.js 18+
- TypeScript 5.3+
- Docker (for containerized deployment)
- Access to Supabase database

### Local Setup

```bash
# Install dependencies
npm install

# Run database migrations
npm run migrate

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
docker build -t giga-social-service .

# Run Docker container
docker run -p 3001:3001 --env-file .env giga-social-service

# Or use npm scripts
npm run docker:build
npm run docker:run
```

### Railway Deployment

This service is configured for Railway deployment with:
- Multi-stage Docker build for optimized image size
- Health check endpoints for container orchestration
- Graceful shutdown handling
- Production-ready logging

## Database Schema

### Main Tables
- `social_posts` - Posts with visibility controls, media, tagging
- `post_comments` - Nested comments with reply tracking
- `post_likes` - Post reactions (6 types)
- `comment_likes` - Comment reactions
- `stories` - 24-hour expiring content
- `story_views` - Story view tracking
- `post_shares` - Share tracking
- `user_connections` - Follow/friend relationships
- `blocked_users` - User blocking
- `content_reports` - Content moderation

### Database Functions

All database functions are defined in `/supabase/migrations/20260110_social_service_functions.sql`:

**Counter Functions:**
- `increment_post_likes/comments/shares/views`
- `decrement_post_likes/comments/shares`
- `increment_comment_likes/replies`
- `decrement_comment_likes/replies`
- `increment_story_views`

**Analytics Functions:**
- `get_trending_posts(time_threshold, page_offset, page_limit)` - Weighted trending algorithm
- `count_trending_posts(time_threshold)` - Count trending posts
- `get_user_social_stats(user_id)` - User engagement metrics
- `calculate_post_engagement_rate(post_id)` - Engagement percentage

**Cleanup Functions:**
- `cleanup_expired_stories()` - Remove expired stories
- `archive_old_posts(days_threshold)` - Archive inactive posts

## Security

### Authentication & Authorization
- JWT token validation on all protected endpoints
- Role-based access control (RBAC) for admin/moderator operations
- Row-Level Security (RLS) policies on all tables
- User profile validation and activity checking

### Rate Limiting
- **General**: 100 requests/minute
- **Write Operations**: 50 requests/minute
- **Reports**: 10 requests/15 minutes
- IP-based with configurable windows

### Input Validation
- Comprehensive validation using express-validator
- Content length limits (posts: 5000, comments: 2000)
- Media upload limits (10 files max)
- UUID validation for all IDs
- Enum validation for types and statuses

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
- View count increments are non-blocking
- Trending algorithm uses weighted engagement scores

### Caching Strategy
- 5-minute TTL for frequently accessed data
- Configurable cache size (default: 1000 keys)
- Cache invalidation on updates

### Database Optimization
- Proper indexes on frequently queried columns
- Counter columns for likes/comments/shares (avoid COUNT queries)
- Soft deletes for data retention
- Connection pooling for high concurrency

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
    "version": "v1"
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "total_pages": 5,
    "has_more": true
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
    "version": "v1"
  }
}
```

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Troubleshooting

### Database Connection Issues
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- Check network connectivity to Supabase
- Review RLS policies for service role access

### Authentication Failures
- Ensure JWT tokens are valid and not expired
- Verify user profiles exist and `is_active = true`
- Check that `deleted_at IS NULL`

### Performance Issues
- Monitor slow query logs
- Increase cache TTL for frequently accessed data
- Review trending algorithm performance
- Check database connection pool size

### Rate Limiting
- Adjust `RATE_LIMIT_MAX_REQUESTS` for your traffic
- Use different rate limiters for different endpoint types
- Monitor rate limit metrics in logs

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
