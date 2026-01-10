/**
 * Search Service API Tests
 */

import request from 'supertest';
import app from '../src/index.js';

describe('Search Service API', () => {
  describe('Health Checks', () => {
    it('should return basic health status', async () => {
      const response = await request(app).get('/api/v1/health').expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          status: 'healthy',
          service: 'search-service',
          version: '1.0.0',
        },
      });
    });

    it('should return detailed health status', async () => {
      const response = await request(app)
        .get('/api/v1/health/detailed')
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('service');
      expect(response.body.data).toHaveProperty('dependencies');
    });
  });

  describe('Universal Search', () => {
    it('should require search query', async () => {
      const response = await request(app).get('/api/v1/search').expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
        },
      });
    });

    it('should perform universal search', async () => {
      const response = await request(app)
        .get('/api/v1/search')
        .query({
          q: 'luxury',
          category: 'all',
          page: 1,
          limit: 20,
        })
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body).toHaveProperty('metadata');
    });

    it('should validate search parameters', async () => {
      const response = await request(app)
        .get('/api/v1/search')
        .query({
          q: '', // Empty query should fail
          page: 0, // Invalid page number
          limit: 200, // Exceeds maximum limit
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Hotel Search', () => {
    it('should search hotels with filters', async () => {
      const response = await request(app)
        .get('/api/v1/search/hotels')
        .query({
          q: 'luxury hotel',
          location: 'Lagos',
          min_price: 100,
          max_price: 500,
          star_rating: 4,
        })
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('success');
      expect(response.body.data).toHaveProperty('category', 'hotels');
    });

    it('should get popular hotels', async () => {
      const response = await request(app)
        .get('/api/v1/search/hotels/popular')
        .query({ limit: 10 })
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('success');
      expect(response.body.data).toHaveProperty('hotels');
    });

    it('should find nearby hotels', async () => {
      const response = await request(app)
        .get('/api/v1/search/hotels/nearby')
        .query({
          latitude: 6.5244,
          longitude: 3.3792,
          radius: 10,
        })
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('success');
      expect(response.body.data).toHaveProperty('search_center');
    });

    it('should require coordinates for nearby search', async () => {
      const response = await request(app).get('/api/v1/search/hotels/nearby').expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Product Search', () => {
    it('should search products with filters', async () => {
      const response = await request(app)
        .get('/api/v1/search/products')
        .query({
          q: 'smartphone',
          category: 'electronics',
          brand: 'Apple',
          condition: 'new',
        })
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('success');
      expect(response.body.data).toHaveProperty('category', 'products');
    });

    it('should get product categories', async () => {
      const response = await request(app).get('/api/v1/search/products/categories').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('categories');
      expect(Array.isArray(response.body.data.categories)).toBe(true);
    });

    it('should get trending products', async () => {
      const response = await request(app)
        .get('/api/v1/search/products/trending')
        .query({ limit: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('products');
    });
  });

  describe('Driver Search', () => {
    it('should find nearby drivers', async () => {
      const response = await request(app)
        .get('/api/v1/search/drivers/nearby')
        .query({
          latitude: 6.5244,
          longitude: 3.3792,
          radius: 5,
          limit: 10,
        })
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('success');
      expect(response.body.data).toHaveProperty('search_center');
    });

    it('should get vehicle types', async () => {
      const response = await request(app).get('/api/v1/search/drivers/vehicle-types').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('vehicle_types');
    });

    it('should estimate fare', async () => {
      const response = await request(app)
        .post('/api/v1/search/drivers/estimate-fare')
        .send({
          pickup_latitude: 6.5244,
          pickup_longitude: 3.3792,
          destination_latitude: 6.4474,
          destination_longitude: 3.3903,
          vehicle_type: 'sedan',
        })
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('success');
      expect(response.body.data).toHaveProperty('fare_estimate');
    });

    it('should require coordinates for fare estimation', async () => {
      const response = await request(app)
        .post('/api/v1/search/drivers/estimate-fare')
        .send({
          vehicle_type: 'sedan',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Search Suggestions', () => {
    it('should get search suggestions', async () => {
      const response = await request(app)
        .get('/api/v1/search/suggestions')
        .query({
          q: 'lux',
          category: 'hotels',
          limit: 10,
        })
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('success');
      expect(response.body.data).toHaveProperty('suggestions');
    });

    it('should require minimum query length', async () => {
      const response = await request(app)
        .get('/api/v1/search/suggestions')
        .query({ q: 'a' }) // Too short
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for unknown endpoints', async () => {
      const response = await request(app).get('/api/v1/unknown-endpoint').expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ENDPOINT_NOT_FOUND');
    });

    it('should include request ID in responses', async () => {
      const response = await request(app).get('/api/v1/health').expect(200);

      expect(response.body.metadata).toHaveProperty('request_id');
      expect(response.headers).toHaveProperty('x-request-id');
    });
  });
});
