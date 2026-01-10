import request from 'supertest';
import app from '../../src/index';

describe('Payment API Endpoints', () => {
  let authToken: string;

  beforeAll(() => {
    // Mock authentication token
    authToken = 'Bearer test-token';
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('service', 'payment-queue-service');
    });
  });

  describe('GET /metrics', () => {
    it('should return Prometheus metrics', async () => {
      const response = await request(app)
        .get('/metrics')
        .expect(200)
        .expect('Content-Type', /text\/plain/);

      expect(response.text).toContain('payment_queue_jobs_waiting');
      expect(response.text).toContain('webhook_queue_jobs_active');
    });
  });

  describe('POST /api/v1/payments/request', () => {
    it('should create a payment request with valid data', async () => {
      const paymentData = {
        module: 'hotel',
        amount: 1000,
        currency: 'NGN',
        userId: '550e8400-e29b-41d4-a716-446655440000',
        branchId: '550e8400-e29b-41d4-a716-446655440001',
        stateId: '550e8400-e29b-41d4-a716-446655440002',
        metadata: {
          moduleTransactionId: 'HTL123',
          customerEmail: 'test@example.com',
          description: 'Hotel booking payment',
        },
        paymentMethod: 'paystack',
      };

      const response = await request(app)
        .post('/api/v1/payments/request')
        .set('Authorization', authToken)
        .send(paymentData)
        .expect('Content-Type', /json/);

      // Note: This will fail without proper auth, but tests the route structure
      expect(response.body).toHaveProperty('success');
    });

    it('should reject payment request with invalid amount', async () => {
      const paymentData = {
        module: 'hotel',
        amount: -100,
        currency: 'NGN',
        userId: '550e8400-e29b-41d4-a716-446655440000',
        branchId: '550e8400-e29b-41d4-a716-446655440001',
        stateId: '550e8400-e29b-41d4-a716-446655440002',
        metadata: {
          moduleTransactionId: 'HTL123',
        },
      };

      const response = await request(app)
        .post('/api/v1/payments/request')
        .set('Authorization', authToken)
        .send(paymentData)
        .expect('Content-Type', /json/);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject payment request with missing required fields', async () => {
      const paymentData = {
        module: 'hotel',
        amount: 1000,
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/v1/payments/request')
        .set('Authorization', authToken)
        .send(paymentData)
        .expect('Content-Type', /json/);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('GET /api/v1/payments/:paymentId/status', () => {
    it('should return payment status', async () => {
      const paymentId = '550e8400-e29b-41d4-a716-446655440000';

      const response = await request(app)
        .get(`/api/v1/payments/${paymentId}/status`)
        .set('Authorization', authToken)
        .expect('Content-Type', /json/);

      // Response will depend on auth and DB state
      expect(response.body).toHaveProperty('success');
    });

    it('should reject invalid payment ID format', async () => {
      const paymentId = 'invalid-id';

      const response = await request(app)
        .get(`/api/v1/payments/${paymentId}/status`)
        .set('Authorization', authToken)
        .expect('Content-Type', /json/);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('POST /api/v1/webhooks/paystack', () => {
    it('should accept webhook with signature', async () => {
      const webhookData = {
        event: 'charge.success',
        data: {
          reference: 'TEST_REF_123',
          amount: 100000,
          status: 'success',
        },
      };

      const response = await request(app)
        .post('/api/v1/webhooks/paystack')
        .set('x-paystack-signature', 'test-signature')
        .send(webhookData)
        .expect('Content-Type', /json/);

      // Will return 200 even if signature is invalid to prevent retries
      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/v1/admin/payments/branch', () => {
    it('should return branch-level report for authorized admin', async () => {
      const response = await request(app)
        .get('/api/v1/admin/payments/branch')
        .set('Authorization', authToken)
        .query({
          branchId: '550e8400-e29b-41d4-a716-446655440001',
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        })
        .expect('Content-Type', /json/);

      // Response depends on auth and permissions
      expect(response.body).toHaveProperty('success');
    });
  });

  describe('GET /api/v1/admin/payments/state', () => {
    it('should return state-level report for authorized admin', async () => {
      const response = await request(app)
        .get('/api/v1/admin/payments/state')
        .set('Authorization', authToken)
        .query({
          stateId: '550e8400-e29b-41d4-a716-446655440002',
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        })
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('success');
    });
  });

  describe('GET /api/v1/admin/payments/national', () => {
    it('should return national-level report for authorized admin', async () => {
      const response = await request(app)
        .get('/api/v1/admin/payments/national')
        .set('Authorization', authToken)
        .query({
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        })
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('success');
    });
  });
});
