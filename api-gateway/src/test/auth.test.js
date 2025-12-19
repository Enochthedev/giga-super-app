import request from 'supertest';
import app from '../index.js';
import { optionalAuth, requireRole } from '../middleware/auth.js';

// Mock Supabase client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ data: [] })),
        })),
      })),
    })),
  })),
}));

describe('Authentication Middleware', () => {
  describe('Basic Authentication', () => {
    test('should reject requests without Authorization header', async () => {
      const response = await request(app).get('/api/v1/hotels').expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    });

    test('should reject requests with invalid Bearer token format', async () => {
      const response = await request(app)
        .get('/api/v1/hotels')
        .set('Authorization', 'InvalidFormat token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    });

    test('should allow health check endpoints without authentication', async () => {
      const response = await request(app).get('/health').expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should allow public endpoints without authentication', async () => {
      // This would need a public endpoint to be implemented
      const response = await request(app).get('/public/info').expect(404); // 404 because endpoint doesn't exist, but no auth error

      expect(response.body.error.code).toBe('ENDPOINT_NOT_FOUND');
    });
  });

  describe('Rate Limiting', () => {
    test('should track authentication attempts per IP', async () => {
      // Make multiple failed auth attempts
      for (let i = 0; i < 5; i++) {
        await request(app).get('/api/v1/hotels').expect(401);
      }

      // Should still allow more attempts (limit is 10)
      const response = await request(app).get('/api/v1/hotels').expect(401);

      expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    });
  });

  describe('Token Validation', () => {
    test('should handle expired tokens', async () => {
      // This would need a mock expired token
      const expiredToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid';

      const response = await request(app)
        .get('/api/v1/hotels')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });
  });

  describe('User Context', () => {
    test('should add comprehensive user context to request', () => {
      // This would need to mock a successful Supabase auth response
      // and test that req.user contains all expected properties
    });

    test('should forward authentication token to downstream services', () => {
      // Test that req.authToken is set correctly
    });
  });
});

describe('Role-Based Authorization', () => {
  const mockReq = {
    user: {
      id: 'user123',
      role: 'user',
      roles: ['customer'],
    },
  };

  const mockRes = {
    status: jest.fn(() => mockRes),
    json: jest.fn(),
  };

  const mockNext = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should allow access with correct role', () => {
    const middleware = requireRole(['user', 'admin']);

    middleware(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  test('should deny access without required role', () => {
    const middleware = requireRole(['admin']);

    middleware(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'INSUFFICIENT_PERMISSIONS',
        message: 'Access denied. Required roles: admin',
      },
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('should deny access without authentication', () => {
    const middleware = requireRole(['user']);
    const reqWithoutUser = {};

    middleware(reqWithoutUser, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });
});

describe('Optional Authentication', () => {
  test('should continue without user context when no token provided', async () => {
    // This would need an endpoint that uses optionalAuth
    // For now, just test the middleware function directly
    const mockReq = { headers: {} };
    const mockRes = {};
    const mockNext = jest.fn();

    await optionalAuth(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  test('should add user context when valid token provided', async () => {
    // This would need to mock a successful auth flow
  });

  test('should continue without user context when invalid token provided', async () => {
    // This would need to mock a failed auth flow
  });
});
