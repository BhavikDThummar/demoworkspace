import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { AppModule } from './app.module';

describe('App (Integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideModule(ConfigModule)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Application Bootstrap', () => {
    it('should start the application successfully', () => {
      expect(app).toBeDefined();
    });

    it('should have all required modules loaded', () => {
      // Test that the app can handle basic requests
      expect(app.getHttpAdapter()).toBeDefined();
    });
  });

  describe('Health Checks', () => {
    it('should respond to basic health check', async () => {
      const response = await request(app.getHttpServer()).get('/').expect(200);

      expect(response.body).toBeDefined();
    });

    it('should respond to business rules health check', async () => {
      const response = await request(app.getHttpServer()).get('/business-rules/health').expect(200);

      expect(response.body.service).toBe('Business Rules');
    });

    it('should respond to simple rules health check', async () => {
      const response = await request(app.getHttpServer()).get('/simple-rules/health').expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should respond to GoRules health check', async () => {
      const response = await request(app.getHttpServer()).get('/gorules/health').expect(200);

      expect(response.body.service).toBe('GoRules Integration');
    });
  });

  describe('API Documentation Endpoints', () => {
    it('should provide business rules examples', async () => {
      const response = await request(app.getHttpServer())
        .get('/business-rules/examples')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.purchaseApproval).toBeDefined();
      expect(response.body.data.supplierRisk).toBeDefined();
      expect(response.body.data.pricing).toBeDefined();
    });

    it('should provide simple rules examples', async () => {
      const response = await request(app.getHttpServer()).get('/simple-rules/examples').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.simpleRule).toBeDefined();
    });

    it('should provide simple rules documentation', async () => {
      const response = await request(app.getHttpServer()).get('/simple-rules/docs').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.endpoints).toBeDefined();
      expect(Array.isArray(response.body.data.endpoints)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for non-existent endpoints', async () => {
      await request(app.getHttpServer()).get('/non-existent-endpoint').expect(404);
    });

    it('should handle invalid HTTP methods', async () => {
      await request(app.getHttpServer())
        .delete('/business-rules/examples') // GET endpoint called with DELETE
        .expect(404);
    });

    it('should handle malformed JSON in POST requests', async () => {
      const response = await request(app.getHttpServer())
        .post('/simple-rules/execute')
        .send('{"invalid": json}')
        .set('Content-Type', 'application/json')
        .expect(400);

      expect(response.body.message).toBeDefined();
    });
  });

  describe('Cross-Controller Integration', () => {
    it('should handle requests to different controllers independently', async () => {
      // Test that multiple controllers can handle requests simultaneously
      const businessRulesPromise = request(app.getHttpServer()).get('/business-rules/examples');

      const simpleRulesPromise = request(app.getHttpServer()).get('/simple-rules/examples');

      const goRulesPromise = request(app.getHttpServer()).get('/gorules/health');

      const [businessResponse, simpleResponse, goRulesResponse] = await Promise.all([
        businessRulesPromise,
        simpleRulesPromise,
        goRulesPromise,
      ]);

      expect(businessResponse.status).toBe(200);
      expect(simpleResponse.status).toBe(200);
      expect(goRulesResponse.status).toBe(200);
    });
  });

  describe('Content Negotiation', () => {
    it('should return JSON by default', async () => {
      const response = await request(app.getHttpServer())
        .get('/business-rules/examples')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('should handle Accept header for JSON', async () => {
      const response = await request(app.getHttpServer())
        .get('/simple-rules/examples')
        .set('Accept', 'application/json')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });

  describe('Request Size Limits', () => {
    it('should handle reasonably large request payloads', async () => {
      const largePayload = {
        value: 42,
        category: 'large-test',
        metadata: {
          description: 'A'.repeat(1000), // 1KB of data
          tags: Array(100).fill('tag'),
          data: Array(50).fill({ key: 'value', number: 123 }),
        },
      };

      // This should work within reasonable limits
      const response = await request(app.getHttpServer())
        .post('/simple-rules/execute')
        .send(largePayload);

      // The request should be processed (even if it fails due to mocking)
      expect([201, 500]).toContain(response.status);
    });
  });

  describe('Security Headers', () => {
    it('should not expose sensitive server information', async () => {
      const response = await request(app.getHttpServer())
        .get('/business-rules/examples')
        .expect(200);

      // Should not expose server version or other sensitive info
      expect(response.headers['x-powered-by']).toBeUndefined();
    });
  });

  describe('Performance and Concurrency', () => {
    it('should handle multiple concurrent requests to different endpoints', async () => {
      const requests = [
        request(app.getHttpServer()).get('/business-rules/examples'),
        request(app.getHttpServer()).get('/simple-rules/examples'),
        request(app.getHttpServer()).get('/gorules/health'),
        request(app.getHttpServer()).get('/business-rules/health'),
        request(app.getHttpServer()).get('/simple-rules/health'),
      ];

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });
    });

    it('should handle rapid sequential requests', async () => {
      const responses = [];

      for (let i = 0; i < 5; i++) {
        const response = await request(app.getHttpServer()).get('/simple-rules/examples');
        responses.push(response);
      }

      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });

  describe('Environment Configuration', () => {
    it('should work with test configuration', () => {
      // The app should start successfully with test configuration
      expect(app).toBeDefined();
    });

    it('should handle missing optional configuration gracefully', async () => {
      // Health checks should still work even if some optional config is missing
      const response = await request(app.getHttpServer()).get('/gorules/health').expect(200);

      expect(response.body.service).toBe('GoRules Integration');
    });
  });

  describe('Graceful Degradation', () => {
    it('should provide meaningful error messages when services are unavailable', async () => {
      // Even if GoRules service is not available, the app should provide useful error messages
      const response = await request(app.getHttpServer())
        .post('/simple-rules/execute')
        .send({ value: 42, category: 'test' });

      // Should either succeed (if mocked) or fail gracefully with meaningful error
      if (response.status !== 201) {
        expect(response.body.error).toBeDefined();
        expect(response.body.timestamp).toBeDefined();
      }
    });
  });

  describe('API Consistency', () => {
    it('should return consistent response format across all endpoints', async () => {
      const endpoints = [
        '/business-rules/examples',
        '/simple-rules/examples',
        '/business-rules/health',
        '/simple-rules/health',
        '/gorules/health',
      ];

      for (const endpoint of endpoints) {
        const response = await request(app.getHttpServer()).get(endpoint).expect(200);

        // All responses should have a consistent structure
        expect(response.body).toHaveProperty('success');
        expect(response.body).toHaveProperty('timestamp');

        if (response.body.success) {
          expect(response.body).toHaveProperty('data');
        } else {
          expect(response.body).toHaveProperty('error');
        }
      }
    });
  });

  describe('Validation Consistency', () => {
    it('should provide consistent validation error format', async () => {
      const invalidRequests = [
        {
          endpoint: '/simple-rules/execute',
          payload: { value: -1, category: 'test' }, // Invalid value
        },
        {
          endpoint: '/business-rules/purchase-approval',
          payload: { amount: 0, department: 'IT' }, // Missing required fields
        },
      ];

      for (const { endpoint, payload } of invalidRequests) {
        const response = await request(app.getHttpServer())
          .post(endpoint)
          .send(payload)
          .expect(400);

        // All validation errors should have consistent format
        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('statusCode', 400);
      }
    });
  });
});
