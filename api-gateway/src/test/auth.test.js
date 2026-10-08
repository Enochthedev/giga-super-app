import jwt from 'jsonwebtoken';
import request from 'supertest';

import app from '../index.js';
import { authMiddleware, optionalAuth, requireRole } from '../middleware/auth.js';

// Supabase mock: getUser resolves known test tokens to users, anything else is
// rejected like GoTrue does. user_profiles lookups report 'deleted-user' as deleted.
jest.mock('@supabase/supabase-js', () => {
  const users = {
    'valid.test.token': { id: 'user123', email: 'user@test.dev', app_metadata: {} },
    'deleted.user.token': { id: 'deleted-user', email: 'gone@test.dev', app_metadata: {} },
  };
  return {
    createClient: jest.fn(() => ({
      auth: {
        getUser: jest.fn(async token => {
          const user = users[token] ?? (token.split('.').length === 3 && !token.endsWith('.invalid')
            ? { id: 'jwt-user', email: 'jwt@test.dev', app_metadata: {} }
            : null);
          return user
            ? { data: { user }, error: null }
            : { data: { user: null }, error: { message: 'invalid JWT' } };
        }),
      },
      from: jest.fn(() => {
        const q = { id: null };
        q.select = () => q;
        q.eq = (col, val) => {
          if (col === 'id') q.id = val;
          return q;
        };
        q.maybeSingle = async () => ({
          data:
            q.id === 'deleted-user' ? { is_active: false, deleted_at: '2026-09-01T00:00:00Z' } : null,
          error: null,
        });
        return q;
      }),
    })),
  };
});

const runAuth = async (token, path = '/api/v1/hotels') => {
  const req = { path, headers: { authorization: `Bearer ${token}` }, id: 'test-req' };
  const res = { status: jest.fn(() => res), json: jest.fn() };
  const next = jest.fn();
  await authMiddleware(req, res, next);
  return { req, res, next };
};

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
      // /public/* skips auth; nothing is mounted there, so it falls through to
      // routing (404) rather than failing authentication (401).
      const response = await request(app).get('/public/info').expect(404);

      expect(response.body.error.code).toBe('SERVICE_NOT_FOUND');
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

  describe('Account deactivation', () => {
    test('rejects tokens belonging to a deleted account', async () => {
      const { res, next } = await runAuth('deleted.user.token');

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json.mock.calls[0][0].error.code).toBe('ACCOUNT_DEACTIVATED');
      expect(next).not.toHaveBeenCalled();
    });

    test('lets active accounts through', async () => {
      const { req, next } = await runAuth('valid.test.token');

      expect(next).toHaveBeenCalled();
      expect(req.user.id).toBe('user123');
    });
  });

  describe('Role claims', () => {
    test('ignores roles in user_metadata (user-writable)', async () => {
      const token = jwt.sign(
        { sub: 'jwt-user', user_metadata: { role: 'ADMIN', roles: ['ADMIN'] }, app_metadata: {} },
        'test-secret'
      );
      const { req, next } = await runAuth(token);

      expect(next).toHaveBeenCalled();
      expect(req.user.role).toBe('user');
      expect(req.user.roles).toEqual([]);
    });

    test('takes roles from app_metadata', async () => {
      const token = jwt.sign(
        { sub: 'jwt-user', app_metadata: { role: 'ADMIN', roles: ['ADMIN'] } },
        'test-secret'
      );
      const { req } = await runAuth(token);

      expect(req.user.role).toBe('ADMIN');
      expect(req.user.roles).toEqual(['ADMIN']);
    });

    test('does not share cached identity between different tokens', async () => {
      const admin = jwt.sign({ sub: 'a', app_metadata: { role: 'ADMIN' } }, 'test-secret');
      const plain = jwt.sign({ sub: 'b', app_metadata: {} }, 'test-secret');

      await runAuth(admin);
      const { req } = await runAuth(plain);

      // Both tokens share the same JWT header prefix; the old cache key collided.
      expect(req.user.role).toBe('user');
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
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Access denied. Required roles: admin',
        },
      })
    );
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
