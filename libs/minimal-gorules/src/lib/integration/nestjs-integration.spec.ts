/**
 * Integration tests for NestJS module
 * Tests complete NestJS integration with dependency injection
 */

import { Test, TestingModule } from '@nestjs/testing';
import { MinimalGoRulesModule } from '../nestjs/minimal-gorules.module.js';
import { MinimalGoRulesService } from '../nestjs/minimal-gorules.service.js';
import { MinimalGoRulesConfig } from '../interfaces/config.js';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('NestJS Integration Tests', () => {
  let module: TestingModule;
  let service: MinimalGoRulesService;

  const testConfig: MinimalGoRulesConfig = {
    apiUrl: 'https://api.gorules.io',
    apiKey: 'test-api-key',
    projectId: 'test-project',
    cacheMaxSize: 50,
    httpTimeout: 5000,
  };

  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('Synchronous Module Registration', () => {
    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [
          MinimalGoRulesModule.forRoot({
            config: testConfig,
            autoInitialize: false, // Don't auto-initialize for testing
          }),
        ],
      }).compile();

      service = module.get<MinimalGoRulesService>(MinimalGoRulesService);
    });

    it('should create module and service', () => {
      expect(module).toBeDefined();
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(MinimalGoRulesService);
    });

    it('should inject configuration correctly', () => {
      const config = service.getConfig();
      expect(config.apiUrl).toBe(testConfig.apiUrl);
      expect(config.projectId).toBe(testConfig.projectId);
    });

    it('should provide engine functionality through service', async () => {
      // Mock successful initialization
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            rules: [
              {
                id: 'test-rule',
                name: 'Test Rule',
                version: '1.0.0',
                tags: ['test'],
                lastModified: new Date().toISOString(),
                content: Buffer.from(
                  JSON.stringify({
                    conditions: [{ field: 'test', operator: 'eq', value: true }],
                    actions: [{ type: 'approve' }],
                  }),
                ).toString('base64'),
              },
            ],
          }),
      });

      const status = await service.initialize();
      expect(status.initialized).toBe(true);
      expect(status.rulesLoaded).toBe(1);
    });

    it('should handle service methods', async () => {
      // Initialize first
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ rules: [] }),
      });

      await service.initialize();

      // Test various service methods
      const status = await service.getStatus();
      expect(status.initialized).toBe(true);

      const healthCheck = await service.healthCheck();
      expect(healthCheck.status).toBe('healthy');

      const cacheStats = service.getCacheStats();
      expect(cacheStats).toBeDefined();
    });
  });

  describe('Asynchronous Module Registration with Factory', () => {
    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [
          MinimalGoRulesModule.forRootAsync({
            useFactory: () => ({
              apiUrl: 'https://api.gorules.io',
              apiKey: 'factory-api-key',
              projectId: 'factory-project',
              cacheMaxSize: 100,
            }),
            autoInitialize: false,
          }),
        ],
      }).compile();

      service = module.get<MinimalGoRulesService>(MinimalGoRulesService);
    });

    it('should create module with factory configuration', () => {
      expect(service).toBeDefined();

      const config = service.getConfig();
      expect(config.apiKey).toBe('factory-api-key');
      expect(config.projectId).toBe('factory-project');
      expect(config.cacheMaxSize).toBe(100);
    });

    it('should work with async factory', async () => {
      // Mock initialization
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ rules: [] }),
      });

      const status = await service.initialize();
      expect(status.initialized).toBe(true);
    });
  });

  describe('Asynchronous Module Registration with Class', () => {
    class ConfigService {
      createMinimalGoRulesOptions(): MinimalGoRulesConfig {
        return {
          apiUrl: 'https://api.gorules.io',
          apiKey: 'class-api-key',
          projectId: 'class-project',
          cacheMaxSize: 75,
        };
      }
    }

    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [
          MinimalGoRulesModule.forRootAsync({
            useClass: ConfigService,
            autoInitialize: false,
          }),
        ],
      }).compile();

      service = module.get<MinimalGoRulesService>(MinimalGoRulesService);
    });

    it('should create module with class configuration', () => {
      expect(service).toBeDefined();

      const config = service.getConfig();
      expect(config.apiKey).toBe('class-api-key');
      expect(config.projectId).toBe('class-project');
      expect(config.cacheMaxSize).toBe(75);
    });
  });

  describe('Service Lifecycle', () => {
    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [
          MinimalGoRulesModule.forRoot({
            config: testConfig,
            autoInitialize: false,
          }),
        ],
      }).compile();

      service = module.get<MinimalGoRulesService>(MinimalGoRulesService);
    });

    it('should handle module initialization', async () => {
      // Mock successful initialization
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ rules: [] }),
      });

      await module.init();

      // Service should be ready
      expect(service).toBeDefined();
    });

    it('should handle module destruction', async () => {
      // Initialize first
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ rules: [] }),
      });

      await service.initialize();

      // Close module
      await module.close();

      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('Auto-initialization', () => {
    it('should auto-initialize when enabled', async () => {
      // Mock successful initialization
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            rules: [
              {
                id: 'auto-rule',
                name: 'Auto Rule',
                version: '1.0.0',
                tags: ['auto'],
                lastModified: new Date().toISOString(),
                content: Buffer.from(JSON.stringify({ test: 'auto' })).toString('base64'),
              },
            ],
          }),
      });

      module = await Test.createTestingModule({
        imports: [
          MinimalGoRulesModule.forRoot({
            config: testConfig,
            autoInitialize: true,
          }),
        ],
      }).compile();

      await module.init();

      service = module.get<MinimalGoRulesService>(MinimalGoRulesService);

      // Should be initialized automatically
      const status = await service.getStatus();
      expect(status.initialized).toBe(true);
      expect(status.rulesLoaded).toBe(1);
    });

    it('should handle auto-initialization errors gracefully', async () => {
      // Mock initialization failure
      mockFetch.mockRejectedValueOnce(new Error('Initialization failed'));

      module = await Test.createTestingModule({
        imports: [
          MinimalGoRulesModule.forRoot({
            config: testConfig,
            autoInitialize: true,
          }),
        ],
      }).compile();

      // Should not throw during module creation
      await expect(module.init()).resolves.not.toThrow();

      service = module.get<MinimalGoRulesService>(MinimalGoRulesService);

      // Service should exist but not be initialized
      const status = await service.getStatus();
      expect(status.initialized).toBe(false);
    });
  });

  describe('Dependency Injection', () => {
    it('should inject service into other providers', async () => {
      class TestService {
        constructor(private readonly goRulesService: MinimalGoRulesService) {}

        getGoRulesService() {
          return this.goRulesService;
        }
      }

      module = await Test.createTestingModule({
        imports: [
          MinimalGoRulesModule.forRoot({
            config: testConfig,
            autoInitialize: false,
          }),
        ],
        providers: [TestService],
      }).compile();

      const testService = module.get<TestService>(TestService);
      const injectedService = testService.getGoRulesService();

      expect(injectedService).toBeDefined();
      expect(injectedService).toBeInstanceOf(MinimalGoRulesService);
    });

    it('should be singleton across the application', async () => {
      class Service1 {
        constructor(public readonly goRules: MinimalGoRulesService) {}
      }

      class Service2 {
        constructor(public readonly goRules: MinimalGoRulesService) {}
      }

      module = await Test.createTestingModule({
        imports: [
          MinimalGoRulesModule.forRoot({
            config: testConfig,
            autoInitialize: false,
          }),
        ],
        providers: [Service1, Service2],
      }).compile();

      const service1 = module.get<Service1>(Service1);
      const service2 = module.get<Service2>(Service2);

      // Should be the same instance
      expect(service1.goRules).toBe(service2.goRules);
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [
          MinimalGoRulesModule.forRoot({
            config: testConfig,
            autoInitialize: false,
          }),
        ],
      }).compile();

      service = module.get<MinimalGoRulesService>(MinimalGoRulesService);
    });

    it('should handle network errors during initialization', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(service.initialize()).rejects.toThrow();
    });

    it('should handle invalid API responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(service.initialize()).rejects.toThrow();
    });

    it('should handle malformed rule data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            rules: [
              {
                id: 'malformed-rule',
                name: 'Malformed Rule',
                version: '1.0.0',
                tags: ['test'],
                lastModified: new Date().toISOString(),
                content: 'invalid-base64-content',
              },
            ],
          }),
      });

      await expect(service.initialize()).rejects.toThrow();
    });
  });

  describe('Performance and Monitoring', () => {
    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [
          MinimalGoRulesModule.forRoot({
            config: {
              ...testConfig,
              enablePerformanceOptimizations: true,
              enablePerformanceMetrics: true,
            },
            autoInitialize: false,
          }),
        ],
      }).compile();

      service = module.get<MinimalGoRulesService>(MinimalGoRulesService);
    });

    it('should provide performance metrics', async () => {
      // Mock initialization
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ rules: [] }),
      });

      await service.initialize();

      const performanceReport = service.getPerformanceReport();
      expect(performanceReport).toBeDefined();
    });

    it('should handle health checks', async () => {
      const healthCheck = await service.healthCheck();

      expect(healthCheck.status).toBeDefined();
      expect(healthCheck.uptime).toBeGreaterThanOrEqual(0);
      expect(healthCheck.lastCheck).toBeGreaterThan(0);
    });

    it('should provide initialization status', () => {
      const initStatus = service.getInitializationStatus();

      expect(initStatus.status).toBeDefined();
      expect(initStatus.startTime).toBeGreaterThan(0);
    });
  });

  describe('Configuration Validation', () => {
    it('should reject invalid configuration', async () => {
      await expect(
        Test.createTestingModule({
          imports: [
            MinimalGoRulesModule.forRoot({
              config: {} as any, // Invalid config
              autoInitialize: false,
            }),
          ],
        }).compile(),
      ).rejects.toThrow();
    });

    it('should reject missing required fields', async () => {
      await expect(
        Test.createTestingModule({
          imports: [
            MinimalGoRulesModule.forRoot({
              config: {
                apiUrl: 'https://api.gorules.io',
                // Missing apiKey and projectId
              } as any,
              autoInitialize: false,
            }),
          ],
        }).compile(),
      ).rejects.toThrow();
    });
  });
});
