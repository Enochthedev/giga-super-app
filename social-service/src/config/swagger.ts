import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Giga Social Service API',
      version: '1.0.0',
      description: `
## Social Media Service API

This service handles all social media functionality for the Giga platform including:
- **Posts**: Create, read, update, delete social posts
- **Comments**: Manage comments on posts
- **Likes**: Like/unlike posts and comments
- **Feed**: Personalized and public feed generation
- **Stories**: Ephemeral content (24-hour stories)
- **Connections**: Friend/follower relationships

### Authentication
All endpoints (except public feed) require a valid JWT token in the Authorization header.
The API Gateway forwards user context via headers:
- \`x-user-id\`: Authenticated user's UUID
- \`x-user-email\`: User's email
- \`x-user-role\`: User's role (user, admin, etc.)

### Rate Limiting
- Default: 100 requests per 15 minutes per IP
- Authenticated users: 200 requests per 15 minutes

### Response Format
All responses follow a consistent format:
\`\`\`json
{
  "success": true|false,
  "data": {...} | [...],
  "error": { "code": "ERROR_CODE", "message": "Human readable message" },
  "metadata": { "timestamp": "ISO8601", "service": "social-service" },
  "pagination": { "page": 1, "limit": 20, "total": 100, "hasMore": true }
}
\`\`\`
      `,
      contact: {
        name: 'Giga Platform Team',
        email: 'api@giga.com',
      },
      license: {
        name: 'Proprietary',
      },
    },
    servers: [
      {
        url: '/api/v1',
        description: 'API v1',
      },
    ],
    tags: [
      { name: 'Health', description: 'Service health and readiness checks' },
      { name: 'Posts', description: 'Social post management' },
      { name: 'Comments', description: 'Post comment management' },
      { name: 'Likes', description: 'Like/reaction management' },
      { name: 'Feed', description: 'Feed generation and retrieval' },
      { name: 'Stories', description: 'Ephemeral story content' },
      { name: 'Connections', description: 'User connections and relationships' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token from Supabase Auth',
        },
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key',
          description: 'API key for service-to-service communication',
        },
      },
      schemas: {
        // Common response schemas
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object' },
            metadata: { $ref: '#/components/schemas/ResponseMetadata' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { $ref: '#/components/schemas/ErrorDetail' },
            metadata: { $ref: '#/components/schemas/ResponseMetadata' },
          },
        },
        ErrorDetail: {
          type: 'object',
          properties: {
            code: { type: 'string', example: 'VALIDATION_ERROR' },
            message: { type: 'string', example: 'Invalid input data' },
            details: { type: 'object', nullable: true },
          },
        },
        ResponseMetadata: {
          type: 'object',
          properties: {
            timestamp: { type: 'string', format: 'date-time' },
            service: { type: 'string', example: 'social-service' },
            requestId: { type: 'string', format: 'uuid' },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 20 },
            total: { type: 'integer', example: 100 },
            totalPages: { type: 'integer', example: 5 },
            hasMore: { type: 'boolean', example: true },
          },
        },
        // Domain schemas
        Post: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            content: { type: 'string', maxLength: 5000 },
            media_urls: { type: 'array', items: { type: 'string', format: 'uri' } },
            visibility: { type: 'string', enum: ['public', 'friends', 'private'] },
            like_count: { type: 'integer', default: 0 },
            comment_count: { type: 'integer', default: 0 },
            share_count: { type: 'integer', default: 0 },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
            author: { $ref: '#/components/schemas/UserProfile' },
          },
        },
        CreatePostRequest: {
          type: 'object',
          required: ['content'],
          properties: {
            content: { type: 'string', minLength: 1, maxLength: 5000 },
            media_urls: { type: 'array', items: { type: 'string', format: 'uri' }, maxItems: 10 },
            visibility: {
              type: 'string',
              enum: ['public', 'friends', 'private'],
              default: 'public',
            },
            location: {
              type: 'object',
              properties: {
                latitude: { type: 'number' },
                longitude: { type: 'number' },
                name: { type: 'string' },
              },
            },
          },
        },
        UpdatePostRequest: {
          type: 'object',
          properties: {
            content: { type: 'string', minLength: 1, maxLength: 5000 },
            visibility: { type: 'string', enum: ['public', 'friends', 'private'] },
          },
        },
        Comment: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            post_id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            content: { type: 'string' },
            like_count: { type: 'integer', default: 0 },
            parent_comment_id: { type: 'string', format: 'uuid', nullable: true },
            created_at: { type: 'string', format: 'date-time' },
            author: { $ref: '#/components/schemas/UserProfile' },
          },
        },
        CreateCommentRequest: {
          type: 'object',
          required: ['content'],
          properties: {
            content: { type: 'string', minLength: 1, maxLength: 2000 },
            parent_comment_id: { type: 'string', format: 'uuid', nullable: true },
          },
        },
        UserProfile: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            first_name: { type: 'string' },
            last_name: { type: 'string' },
            avatar_url: { type: 'string', format: 'uri', nullable: true },
          },
        },
        Story: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            media_url: { type: 'string', format: 'uri' },
            media_type: { type: 'string', enum: ['image', 'video'] },
            caption: { type: 'string', nullable: true },
            view_count: { type: 'integer', default: 0 },
            expires_at: { type: 'string', format: 'date-time' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Connection: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            connected_user_id: { type: 'string', format: 'uuid' },
            status: { type: 'string', enum: ['pending', 'accepted', 'blocked', 'declined'] },
            connection_type: {
              type: 'string',
              enum: ['friend', 'follower', 'family', 'colleague'],
            },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
      },
      responses: {
        BadRequest: {
          description: 'Bad Request - Invalid input data',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'Content is required' },
                metadata: { timestamp: '2024-01-15T10:00:00Z', service: 'social-service' },
              },
            },
          },
        },
        Unauthorized: {
          description: 'Unauthorized - Authentication required',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                success: false,
                error: { code: 'AUTHENTICATION_REQUIRED', message: 'Authentication required' },
                metadata: { timestamp: '2024-01-15T10:00:00Z', service: 'social-service' },
              },
            },
          },
        },
        Forbidden: {
          description: 'Forbidden - Insufficient permissions',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                success: false,
                error: {
                  code: 'FORBIDDEN',
                  message: 'You do not have permission to perform this action',
                },
                metadata: { timestamp: '2024-01-15T10:00:00Z', service: 'social-service' },
              },
            },
          },
        },
        NotFound: {
          description: 'Not Found - Resource does not exist',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                success: false,
                error: { code: 'NOT_FOUND', message: 'Resource not found' },
                metadata: { timestamp: '2024-01-15T10:00:00Z', service: 'social-service' },
              },
            },
          },
        },
        TooManyRequests: {
          description: 'Too Many Requests - Rate limit exceeded',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                success: false,
                error: {
                  code: 'RATE_LIMIT_EXCEEDED',
                  message: 'Too many requests, please try again later',
                },
                metadata: { timestamp: '2024-01-15T10:00:00Z', service: 'social-service' },
              },
            },
          },
        },
        InternalError: {
          description: 'Internal Server Error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                success: false,
                error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
                metadata: { timestamp: '2024-01-15T10:00:00Z', service: 'social-service' },
              },
            },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts', './src/index.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
