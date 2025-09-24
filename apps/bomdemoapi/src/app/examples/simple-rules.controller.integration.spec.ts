import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { GoRulesModule } from '@org/gorules';
import { SimpleRulesController } from './simple-rules.controller';
import { SimpleRulesService } from './simple-rules.service';

describe('SimpleRulesController (Integration)', () => {
  let app: INestApplication;
  let simpleRulesService: SimpleRulesService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              GORULES_API_URL: 'https://test.gorules.io',
              GORULES_API_KEY: 'test-api-key',
              GORULES_PROJECT_ID: 'test-project-id',
              GORULES_ENABLE_LOGGING: 'true',
              GORULES_TIMEOUT: '5000',
              GORULES_RETRY_ATTEMPTS: '1',
            }),
          ],
        }),
        GoRulesModule.forRootAsync({
          useFactory: () => ({
            apiUrl: 'https://test.gorules.io',
            apiKey: 'test-api-key',
            projectId: 'test-project-id',
            enableLogging: true,
            timeout: 5000,
            retryAttempts: 1,
          }),
        }),
      ],
      controllers: [SimpleRulesController],
      providers: [SimpleRulesService],
    }).compile();

    app = moduleFixture.createNestApplication();
    simpleRulesService = moduleFixture.get<SimpleRulesService>(SimpleRulesService);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /simple-rules/execute', () => {
    const validRequest = {
      value: 42,
      category: 'test',
      metadata: { source: 'integration-test' },
    };

    it('should execute simple rule successfully', async () => {
      const mockResult = {
        result: 'success',
        score: 85,
        recommendations: ['Continue with current approach'],
      };

      jest.spyOn(simpleRulesService, 'executeSimpleRule').mockResolvedValue(mockResult);

      const response = await request(app.getHttpServer())
        .post('/simple-rules/execute')
        .send(validRequest)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockResult);
      expect(response.body.timestamp).toBeDefined();
    });

    it('should validate required fields', async () => {
      const invalidRequest = {
        value: 42,
        // category is missing
        metadata: {},
      };

      const response = await request(app.getHttpServer())
        .post('/simple-rules/execute')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.message).toContain('category');
    });

    it('should validate value is non-negative', async () => {
      const invalidRequest = {
        value: -1, // Invalid negative value
        category: 'test',
      };

      const response = await request(app.getHttpServer())
        .post('/simple-rules/execute')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.message).toContain('value');
    });

    it('should handle service errors', async () => {
      jest
        .spyOn(simpleRulesService, 'executeSimpleRule')
        .mockRejectedValue(new Error('Rule execution failed'));

      const response = await request(app.getHttpServer())
        .post('/simple-rules/execute')
        .send(validRequest)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /simple-rules/execute-with-trace', () => {
    const validRequest = {
      value: 100,
      category: 'trace-test',
    };

    it('should execute rule with tracing', async () => {
      const mockResult = {
        result: { result: 'traced', score: 90, recommendations: [] },
        trace: {
          steps: [
            { id: 'step1', name: 'Input validation', duration: 10 },
            { id: 'step2', name: 'Rule evaluation', duration: 80 },
          ],
          duration: 90,
          rulesEvaluated: ['traced-rule'],
        },
        performance: { executionTime: 90, networkTime: 20, totalTime: 110 },
      };

      jest.spyOn(simpleRulesService, 'executeRuleWithTracing').mockResolvedValue(mockResult);

      const response = await request(app.getHttpServer())
        .post('/simple-rules/execute-with-trace')
        .send(validRequest)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.result).toBeDefined();
      expect(response.body.data.trace).toBeDefined();
      expect(response.body.data.performance).toBeDefined();
    });
  });

  describe('POST /simple-rules/validate-and-execute/:ruleId', () => {
    const ruleId = 'test-rule';
    const validRequest = {
      value: 50,
      category: 'validation-test',
    };

    it('should validate and execute rule successfully', async () => {
      const mockResult = {
        result: 'validated-and-executed',
        score: 75,
        recommendations: ['Rule exists and executed'],
      };

      jest.spyOn(simpleRulesService, 'validateAndExecuteRule').mockResolvedValue(mockResult);

      const response = await request(app.getHttpServer())
        .post(`/simple-rules/validate-and-execute/${ruleId}`)
        .send(validRequest)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockResult);
    });

    it('should handle rule not found', async () => {
      jest
        .spyOn(simpleRulesService, 'validateAndExecuteRule')
        .mockRejectedValue(new Error('Rule not found'));

      const response = await request(app.getHttpServer())
        .post(`/simple-rules/validate-and-execute/${ruleId}`)
        .send(validRequest)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Rule not found');
    });
  });

  describe('POST /simple-rules/execute-sequential', () => {
    const validRequest = {
      rules: [
        { ruleId: 'rule1', input: { value: 10, category: 'seq1' } },
        { ruleId: 'rule2', input: { value: 20, category: 'seq2' } },
      ],
    };

    it('should execute rules sequentially', async () => {
      const mockResult = [
        { ruleId: 'rule1', success: true, result: { result: 'success1', score: 80 } },
        { ruleId: 'rule2', success: true, result: { result: 'success2', score: 85 } },
      ];

      jest.spyOn(simpleRulesService, 'executeRulesSequentially').mockResolvedValue(mockResult);

      const response = await request(app.getHttpServer())
        .post('/simple-rules/execute-sequential')
        .send(validRequest)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.results).toEqual(mockResult);
      expect(response.body.data.summary.total).toBe(2);
      expect(response.body.data.summary.successful).toBe(2);
      expect(response.body.data.summary.failed).toBe(0);
    });

    it('should handle mixed success and failure', async () => {
      const mockResult = [
        { ruleId: 'rule1', success: true, result: { result: 'success1' } },
        { ruleId: 'rule2', success: false, error: 'Rule 2 failed' },
      ];

      jest.spyOn(simpleRulesService, 'executeRulesSequentially').mockResolvedValue(mockResult);

      const response = await request(app.getHttpServer())
        .post('/simple-rules/execute-sequential')
        .send(validRequest)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.summary.successful).toBe(1);
      expect(response.body.data.summary.failed).toBe(1);
    });
  });

  describe('POST /simple-rules/execute-with-timeout/:ruleId', () => {
    const ruleId = 'timeout-test-rule';
    const validRequest = {
      value: 75,
      category: 'timeout-test',
      timeoutMs: 15000,
    };

    it('should execute rule with custom timeout', async () => {
      const mockResult = {
        result: 'timeout-success',
        score: 95,
        recommendations: [],
      };

      jest.spyOn(simpleRulesService, 'executeRuleWithCustomTimeout').mockResolvedValue(mockResult);

      const response = await request(app.getHttpServer())
        .post(`/simple-rules/execute-with-timeout/${ruleId}`)
        .send(validRequest)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockResult);
    });

    it('should validate timeout is at least 1000ms', async () => {
      const invalidRequest = {
        ...validRequest,
        timeoutMs: 500, // Too low
      };

      const response = await request(app.getHttpServer())
        .post(`/simple-rules/execute-with-timeout/${ruleId}`)
        .send(invalidRequest)
        .expect(400);

      expect(response.body.message).toContain('timeoutMs');
    });
  });

  describe('GET /simple-rules/info/:ruleId', () => {
    const ruleId = 'info-test-rule';

    it('should return rule information when rule exists', async () => {
      const mockInfo = {
        exists: true,
        metadata: {
          id: ruleId,
          name: 'Info Test Rule',
          version: '1.0.0',
          description: 'Test rule for information retrieval',
        },
      };

      jest.spyOn(simpleRulesService, 'getRuleInformation').mockResolvedValue(mockInfo);

      const response = await request(app.getHttpServer())
        .get(`/simple-rules/info/${ruleId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockInfo);
    });

    it('should return rule not found information', async () => {
      const mockInfo = {
        exists: false,
        error: `Rule '${ruleId}' does not exist`,
      };

      jest.spyOn(simpleRulesService, 'getRuleInformation').mockResolvedValue(mockInfo);

      const response = await request(app.getHttpServer())
        .get(`/simple-rules/info/${ruleId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.exists).toBe(false);
      expect(response.body.data.error).toBeDefined();
    });
  });

  describe('POST /simple-rules/demo-error-handling/:ruleId', () => {
    const ruleId = 'error-demo-rule';
    const validRequest = {
      value: 60,
      category: 'error-demo',
    };

    it('should demonstrate successful execution', async () => {
      const mockResult = {
        success: true,
        result: { result: 'error-demo-success', score: 88, recommendations: [] },
      };

      jest.spyOn(simpleRulesService, 'demonstrateErrorHandling').mockResolvedValue(mockResult);

      const response = await request(app.getHttpServer())
        .post(`/simple-rules/demo-error-handling/${ruleId}`)
        .send(validRequest)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.success).toBe(true);
      expect(response.body.data.result).toBeDefined();
    });

    it('should demonstrate error handling', async () => {
      const mockResult = {
        success: false,
        error: {
          code: 'RULE_NOT_FOUND',
          message: 'Rule not found',
          retryable: false,
        },
      };

      jest.spyOn(simpleRulesService, 'demonstrateErrorHandling').mockResolvedValue(mockResult);

      const response = await request(app.getHttpServer())
        .post(`/simple-rules/demo-error-handling/${ruleId}`)
        .send(validRequest)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.success).toBe(false);
      expect(response.body.data.error).toBeDefined();
    });
  });

  describe('GET /simple-rules/health', () => {
    it('should return healthy status', async () => {
      const mockHealth = {
        healthy: true,
        statistics: { rule1: { count: 5, averageTime: 100, errorRate: 0 } },
        circuitBreakers: { rule1: { state: 'CLOSED', failures: 0 } },
        uptime: 60000,
      };

      jest.spyOn(simpleRulesService, 'getServiceHealth').mockResolvedValue(mockHealth);

      const response = await request(app.getHttpServer()).get('/simple-rules/health').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockHealth);
    });

    it('should return unhealthy status', async () => {
      const mockHealth = {
        healthy: false,
        statistics: null,
        circuitBreakers: null,
        uptime: 60000,
      };

      jest.spyOn(simpleRulesService, 'getServiceHealth').mockResolvedValue(mockHealth);

      const response = await request(app.getHttpServer()).get('/simple-rules/health').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.healthy).toBe(false);
    });
  });

  describe('GET /simple-rules/examples', () => {
    it('should return example requests', async () => {
      const response = await request(app.getHttpServer()).get('/simple-rules/examples').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.simpleRule).toBeDefined();
      expect(response.body.data.ruleWithTimeout).toBeDefined();
      expect(response.body.data.multipleRules).toBeDefined();
    });
  });

  describe('GET /simple-rules/docs', () => {
    it('should return API documentation', async () => {
      const response = await request(app.getHttpServer()).get('/simple-rules/docs').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.endpoints).toBeDefined();
      expect(response.body.data.schemas).toBeDefined();
      expect(Array.isArray(response.body.data.endpoints)).toBe(true);
    });
  });

  describe('Parameter Validation', () => {
    it('should handle invalid rule IDs in path parameters', async () => {
      const invalidRuleId = ''; // Empty rule ID
      const validRequest = { value: 50, category: 'test' };

      // This should result in a 404 since the route won't match
      await request(app.getHttpServer())
        .post(`/simple-rules/validate-and-execute/${invalidRuleId}`)
        .send(validRequest)
        .expect(404);
    });

    it('should handle special characters in rule IDs', async () => {
      const specialRuleId = 'rule-with-special-chars_123';
      const validRequest = { value: 50, category: 'test' };

      jest
        .spyOn(simpleRulesService, 'validateAndExecuteRule')
        .mockResolvedValue({ result: 'success', score: 80, recommendations: [] });

      const response = await request(app.getHttpServer())
        .post(`/simple-rules/validate-and-execute/${specialRuleId}`)
        .send(validRequest)
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Content Type Handling', () => {
    it('should handle requests without explicit content-type', async () => {
      const validRequest = { value: 42, category: 'test' };

      jest
        .spyOn(simpleRulesService, 'executeSimpleRule')
        .mockResolvedValue({ result: 'success', score: 85, recommendations: [] });

      const response = await request(app.getHttpServer())
        .post('/simple-rules/execute')
        .send(validRequest)
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should reject non-JSON content types for POST requests', async () => {
      await request(app.getHttpServer())
        .post('/simple-rules/execute')
        .send('plain text data')
        .set('Content-Type', 'text/plain')
        .expect(400);
    });
  });

  describe('Rate Limiting and Performance', () => {
    it('should handle multiple concurrent requests', async () => {
      const validRequest = { value: 42, category: 'concurrent-test' };

      jest
        .spyOn(simpleRulesService, 'executeSimpleRule')
        .mockResolvedValue({ result: 'success', score: 85, recommendations: [] });

      // Send 5 concurrent requests
      const promises = Array(5)
        .fill(null)
        .map(() => request(app.getHttpServer()).post('/simple-rules/execute').send(validRequest));

      const responses = await Promise.all(promises);

      responses.forEach((response) => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });
    });
  });

  describe('Error Response Format Consistency', () => {
    it('should return consistent error format for validation errors', async () => {
      const response = await request(app.getHttpServer())
        .post('/simple-rules/execute')
        .send({ value: -1, category: 'test' }) // Invalid value
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('statusCode');
    });

    it('should return consistent error format for service errors', async () => {
      jest
        .spyOn(simpleRulesService, 'executeSimpleRule')
        .mockRejectedValue(new Error('Service error'));

      const response = await request(app.getHttpServer())
        .post('/simple-rules/execute')
        .send({ value: 42, category: 'test' })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
    });
  });
});
