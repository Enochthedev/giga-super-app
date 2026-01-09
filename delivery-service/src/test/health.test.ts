import request from 'supertest';
import app from '../index';

describe('Health Check Endpoints', () => {
  describe('GET /health', () => {
    it('should return 200 and health status', async () => {
      const response = await request(app).get('/health').expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          status: 'healthy',
          service: 'delivery-service',
          version: '1.0.0',
          environment: 'test',
        },
        metadata: {
          version: '1.0.0',
        },
      });

      expect(response.body.data.timestamp).toBeDefined();
      expect(response.body.data.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('GET /live', () => {
    it('should return 200 and liveness status', async () => {
      const response = await request(app).get('/live').expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          status: 'alive',
          service: 'delivery-service',
          version: '1.0.0',
        },
        metadata: {
          version: '1.0.0',
        },
      });

      expect(response.body.data.memory).toBeDefined();
      expect(response.body.data.cpu).toBeDefined();
      expect(response.body.data.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('GET /metrics', () => {
    it('should return 200 and system metrics', async () => {
      const response = await request(app).get('/metrics').expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          service: 'delivery-service',
          version: '1.0.0',
          environment: 'test',
        },
        metadata: {
          version: '1.0.0',
        },
      });

      expect(response.body.data.memory).toBeDefined();
      expect(response.body.data.cpu).toBeDefined();
      expect(response.body.data.cache).toBeDefined();
      expect(response.body.data.node).toBeDefined();
    });
  });

  describe('GET /', () => {
    it('should return 200 and service information', async () => {
      const response = await request(app).get('/').expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          service: 'delivery-service',
          version: '1.0.0',
          description: 'Delivery and logistics service for Giga platform',
          environment: 'test',
        },
        metadata: {
          version: '1.0.0',
        },
      });
    });
  });

  describe('GET /nonexistent', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app).get('/nonexistent').expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'ENDPOINT_NOT_FOUND',
          message: 'Route GET /nonexistent not found',
        },
        metadata: {
          version: '1.0.0',
        },
      });
    });
  });
});
