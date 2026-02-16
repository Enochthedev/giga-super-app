/**
 * @jest-environment node
 */

// Mock dependencies BEFORE importing the module
const mockSupabaseFrom = jest.fn();
const mockCreateAudit = jest.fn().mockResolvedValue(undefined);

jest.mock('../utils/database', () => ({
  supabase: {
    from: mockSupabaseFrom,
  },
  calculatePagination: (page: string, limit: string, total: number) => ({
    page: Number(page),
    limit: Number(limit),
    total,
    pages: Math.ceil(total / Number(limit)),
  }),
  getPaginationRange: (page: string, limit: string) => ({
    from: (Number(page) - 1) * Number(limit),
    to: Number(page) * Number(limit) - 1,
  }),
}));

jest.mock('../middleware/audit', () => ({
  createAudit: mockCreateAudit,
}));

jest.mock('../middleware/auth', () => ({
  authenticate: (req: any, res: any, next: any) => {
    req.user = { id: 'test-user-id', email: 'test@example.com' };
    next();
  },
  requireAdmin: (req: any, res: any, next: any) => next(),
  requireAnyAccess: (req: any, res: any, next: any) => next(),
  AuthRequest: {},
}));

import express from 'express';
import request from 'supertest';
import modulesRoutes from '../routes/modules';

const app = express();
app.use(express.json());
app.use('/api/managers', modulesRoutes);

// Helper to create mock chain
const createMockChain = (data: any, count: number = 1) => {
  const chain: any = {};
  const methods = [
    'select',
    'insert',
    'update',
    'delete',
    'eq',
    'is',
    'or',
    'ilike',
    'gte',
    'lte',
    'range',
    'order',
    'limit',
    'single',
  ];
  methods.forEach(method => {
    chain[method] = jest.fn().mockReturnValue(chain);
  });
  // Final resolution
  chain.single = jest.fn().mockResolvedValue({ data, error: null });
  chain.eq = jest.fn().mockImplementation(() => {
    return { ...chain, then: (resolve: any) => resolve({ data: [data], count, error: null }) };
  });
  return chain;
};

describe('Modules Routes - Basic Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Setup default mock behavior
    mockSupabaseFrom.mockImplementation(() => {
      const chain: any = {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: 'test-id' }, error: null }),
      };
      // Make all methods return the chain for chaining
      Object.keys(chain).forEach(key => {
        if (key !== 'single') {
          chain[key] = jest.fn().mockReturnValue(chain);
        }
      });
      // Override the final call to return data
      chain.order = jest.fn().mockResolvedValue({ data: [], count: 0, error: null });
      return chain;
    });
  });

  describe('E-commerce Module', () => {
    test('GET /api/managers/ecommerce/products returns 200', async () => {
      const response = await request(app)
        .get('/api/managers/ecommerce/products')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success');
    });

    test('GET /api/managers/ecommerce/orders returns 200', async () => {
      const response = await request(app)
        .get('/api/managers/ecommerce/orders')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success');
    });

    test('GET /api/managers/ecommerce/vendors returns 200', async () => {
      const response = await request(app)
        .get('/api/managers/ecommerce/vendors')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success');
    });
  });

  describe('Taxi Module', () => {
    test('GET /api/managers/taxi/drivers returns 200', async () => {
      const response = await request(app)
        .get('/api/managers/taxi/drivers')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success');
    });

    test('GET /api/managers/taxi/rides returns 200', async () => {
      const response = await request(app)
        .get('/api/managers/taxi/rides')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success');
    });
  });

  describe('Hotel Module', () => {
    test('GET /api/managers/hotel/hotels returns 200', async () => {
      const response = await request(app)
        .get('/api/managers/hotel/hotels')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success');
    });

    test('GET /api/managers/hotel/bookings returns 200', async () => {
      const response = await request(app)
        .get('/api/managers/hotel/bookings')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success');
    });
  });

  describe('Media Module', () => {
    test('GET /api/managers/media/files returns 200', async () => {
      const response = await request(app)
        .get('/api/managers/media/files')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success');
    });

    test('GET /api/managers/media/advertisements returns 200', async () => {
      const response = await request(app)
        .get('/api/managers/media/advertisements')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success');
    });
  });
});
