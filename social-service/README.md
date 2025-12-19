# Giga Social Media Service

Social media service for the Giga platform, handling posts, comments, likes, and
social feed generation. This service is deployed on Railway and connects to the
Supabase PostgreSQL database.

## Features

- **Social Posts**: Create, read, update, and delete social media posts
- **Comments**: Comment on posts with nested reply support
- **Likes**: Like/unlike posts and comments
- **Social Feed**: Personalized feed with trending and recommended posts
- **Content Moderation**: Report inappropriate content
- **Real-time Updates**: Optimized for high-frequency social interactions

## Architecture

- **Platform**: Railway (Docker container)
- **Database**: Supabase PostgreSQL (secure connection pooling)
- **Authentication**: JWT token validation via Supabase Auth
- **Caching**: In-memory caching with NodeCache
- **Logging**: Structured logging with Winston

## API Endpoints

### Health Checks

- `GET /health` - Service health status
- `GET /health/ready` - Readiness check
- `GET /health/live` - Liveness check

### Posts

- `POST /api/v1/posts` - Create a new post
- `GET /api/v1/posts/user/:userId` - Get user's posts
- `GET /api/v1/posts/:postId` - Get post details
- `PUT /api/v1/posts/:postId` - Update a post
- `DELETE /api/v1/posts/:postId` - Delete a post (soft delete)
- `POST /api/v1/posts/:postId/report` - Report a post

### Comments

- `POST /api/v1/comments` - Create a comment
- `GET /api/v1/comments/post/:postId` - Get post comments
- `GET /api/v1/comments/:commentId/replies` - Get comment replies
- `PUT /api/v1/comments/:commentId` - Update a comment
- `DELETE /api/v1/comments/:commentId` - Delete a comment (soft delete)

### Likes

- `POST /api/v1/likes/posts/:postId` - Like/unlike a post
- `POST /api/v1/likes/comments/:commentId` - Like/unlike a comment
- `GET /api/v1/likes/posts/:postId/users` - Get users who liked a post
- `GET /api/v1/likes/comments/:commentId/users` - Get users who liked a comment

### Feed

- `GET /api/v1/feed` - Get personalized social feed
- `GET /api/v1/feed/trending` - Get trending posts
- `GET /api/v1/feed/recommended` - Get recommended posts

## Environment Variables

See `.env.example` for all required environment variables:

- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for database access
- `DB_POOL_SIZE` - Database connection pool size (default: 10)
- `PORT` - Service port (default: 3001)
- `JWT_SECRET` - JWT secret for token validation
- `CACHE_TTL` - Cache time-to-live in seconds (default: 300)
- `RATE_LIMIT_MAX_REQUESTS` - Max requests per window (default: 100)

## Development

### Prerequisites

- Node.js 18+
- Docker (for containerized deployment)
- Access to Supabase database

### Local Setup

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your configuration

# Run in development mode
npm run dev

# Run tests
npm test

# Run with coverage
npm test:coverage
```

### Docker Deployment

```bash
# Build Docker image
npm run docker:build

# Run Docker container
npm run docker:run
```

### Railway Deployment

1. Connect your repository to Railway
2. Set environment variables in Railway dashboard
3. Railway will automatically build and deploy using `railway.json`

## Database Schema

### Tables Used

- `social_posts` - Social media posts
- `post_comments` - Comments on posts
- `post_likes` - Likes on posts
- `comment_likes` - Likes on comments
- `user_profiles` - User information
- `content_reports` - Content moderation reports

### Required Database Functions

The service expects these PostgreSQL functions to exist:

- `increment_comment_replies(comment_id UUID)` - Increment reply count
- `decrement_comment_replies(comment_id UUID)` - Decrement reply count
- `decrement_post_comments(post_id UUID)` - Decrement comment count
- `get_trending_posts(time_threshold TIMESTAMPTZ, page_limit INT, page_offset INT)` -
  Get trending posts
- `count_trending_posts(time_threshold TIMESTAMPTZ)` - Count trending posts

## Security

- **Authentication**: All endpoints (except health checks) require valid JWT
  tokens
- **Authorization**: Role-based access control for admin operations
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Input Validation**: Comprehensive validation using express-validator
- **SQL Injection Prevention**: Parameterized queries via Supabase client
- **CORS**: Configured for API gateway and frontend origins
- **Helmet**: Security headers enabled

## Performance

- **Connection Pooling**: 10 concurrent database connections
- **Caching**: 5-minute TTL for GET requests
- **Compression**: Response compression enabled
- **Pagination**: All list endpoints support pagination (max 100 items)
- **Indexes**: Database indexes on frequently queried columns

## Monitoring

- **Health Checks**: Kubernetes-compatible health endpoints
- **Structured Logging**: JSON logs with request tracing
- **Error Tracking**: Comprehensive error logging with stack traces
- **Performance Metrics**: Response time and database query duration tracking

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

- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are correct
- Check database connection pool size (increase if needed)
- Ensure SSL is enabled for database connections

### Authentication Failures

- Verify JWT tokens are valid and not expired
- Check that user profiles exist and are active
- Ensure RLS policies allow service role access

### Performance Issues

- Increase `DB_POOL_SIZE` for high traffic
- Adjust `CACHE_TTL` for better cache hit rates
- Monitor slow queries and add database indexes

## Contributing

1. Follow the coding standards in `.kiro/steering/`
2. Write tests for new features
3. Update API documentation
4. Ensure all tests pass before submitting PR

## License

MIT
