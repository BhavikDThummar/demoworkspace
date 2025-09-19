/**
 * Integration tests for MinimalGoRulesEngine
 * Tests complete engine functionality with mocked external dependencies
 */

import { MinimalGoRulesEngine } from '../minimal-gorules-engine.js';
import { MinimalGoRulesConfig } from '../interfaces/config.js';
import { MinimalGoRulesError } from '../errors/minimal-errors.js';

// Mock fetch globally for HTTP requests
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('MinimalGoRulesEngine Integration Tests', () => {
  let engine: MinimalGoRulesEngine;
  let config: MinimalGoRulesConfig;

  beforeEach(() => {
    config = {
      apiUrl: 'https://api.gorules.io',
      apiKey: 'test-api-key',
      projectId: 'test-project',
      cacheMaxSize: 100,
      httpTimeout: 5000,
      batchSize: 10
    };

    engine = new MinimalGoRulesEngine(config);
    mockFetch.mockClear();
  });

  afterEach(async () => {
    await engine.cleanup();
  });

  describe('Engine Initialization', () => {
    it('should initialize engine with mock rules', async () => {
      // Mock successful API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          rules: [
            {
              id: 'rule1',
              name: 'Test Rule 1',
              version: '1.0.0',
              tags: ['test', 'validation'],
              lastModified: new Date().toISOString(),
              content: Buffer.from(JSON.stringify({
                conditions: [{ field: 'age', operator: 'gte', value: 18 }],
                actions: [{ type: 'approve' }]
              })).toString('base64')
            },
            {
              id: 'rule2',
              name: 'Test Rule 2',
              version: '1.0.1',
              tags: ['test', 'scoring'],
              lastModified: new Date().toISOString(),
              content: Buffer.from(JSON.stringify({
                conditions: [{ field: 'income', operator: 'gt', value: 50000 }],
                actions: [{ type: 'set', field: 'score', value: 100 }]
              })).toString('base64')
            }
          ]
        })
      });

      const status = await engine.initialize();

      expect(status.initialized).toBe(true);
      expect(status.rulesLoaded).toBe(2);
      expect(status.projectId).toBe('test-project');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.gorules.io/api/v1/projects/test-project/rules',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key'
          })
        })
      );
    });

    it('should handle initialization errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(engine.initialize()).rejects.toThrow(MinimalGoRulesError);
    });

    it('should handle invalid API responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      await expect(engine.initialize()).rejects.toThrow(MinimalGoRulesError);
    });
  });

  describe('Rule Execution', () => {
    beforeEach(async () => {
      // Initialize engine with test rules
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          rules: [
            {
              id: 'age-validation',
              name: 'Age Validation Rule',
              version: '1.0.0',
              tags: ['validation'],
              lastModified: new Date().toISOString(),
              content: Buffer.from(JSON.stringify({
                conditions: [{ field: 'age', operator: 'gte', value: 18 }],
                actions: [{ type: 'set', field: 'eligible', value: true }]
              })).toString('base64')
            },
            {
              id: 'income-scoring',
              name: 'Income Scoring Rule',
              version: '1.0.0',
              tags: ['scoring'],
              lastModified: new Date().toISOString(),
              content: Buffer.from(JSON.stringify({
                conditions: [{ field: 'income', operator: 'gt', value: 50000 }],
                actions: [{ type: 'set', field: 'score', value: 100 }]
              })).toString('base64')
            }
          ]
        })
      });

      await engine.initialize();
    });

    it('should execute single rule successfully', async () => {
      // Mock ZenEngine evaluation (this would normally be handled by the actual ZenEngine)
      const mockZenEngine = {
        evaluate: jest.fn().mockResolvedValue({
          result: { eligible: true },
          performance: '5ms'
        })
      };

      // Replace the engine's ZenEngine instance (this is a simplified mock)
      (engine as any).executionEngine.zenEngine = mockZenEngine;

      const result = await engine.executeRule('age-validation', { age: 25 });

      expect(result).toEqual({ eligible: true });
      expect(mockZenEngine.evaluate).toHaveBeenCalledWith('age-validation', { age: 25 });
    });

    it('should execute multiple rules in parallel', async () => {
      const mockZenEngine = {
        evaluate: jest.fn()
          .mockResolvedValueOnce({ result: { eligible: true }, performance: '5ms' })
          .mockResolvedValueOnce({ result: { score: 100 }, performance: '3ms' })
      };

      (engine as any).executionEngine.zenEngine = mockZenEngine;

      const result = await engine.executeRules(['age-validation', 'income-scoring'], {
        age: 25,
        income: 60000
      });

      expect(result.results.size).toBe(2);
      expect(result.results.get('age-validation')).toEqual({ eligible: true });
      expect(result.results.get('income-scoring')).toEqual({ score: 100 });
      expect(result.executionTime).toBeGreaterThan(0);
    });

    it('should execute rules by tags', async () => {
      const mockZenEngine = {
        evaluate: jest.fn().mockResolvedValue({
          result: { eligible: true },
          performance: '5ms'
        })
      };

      (engine as any).executionEngine.zenEngine = mockZenEngine;

      const result = await engine.executeByTags(['validation'], { age: 25 });

      expect(result.results.size).toBe(1);
      expect(result.results.has('age-validation')).toBe(true);
    });

    it('should handle rule execution errors', async () => {
      const mockZenEngine = {
        evaluate: jest.fn().mockRejectedValue(new Error('Rule execution failed'))
      };

      (engine as any).executionEngine.zenEngine = mockZenEngine;

      await expect(engine.executeRule('age-validation', { age: 25 }))
        .rejects.toThrow(MinimalGoRulesError);
    });

    it('should validate rule existence', async () => {
      const isValid = await engine.validateRule('age-validation');
      expect(isValid).toBe(true);

      const isInvalid = await engine.validateRule('non-existent-rule');
      expect(isInvalid).toBe(false);
    });
  });

  describe('Cache Management', () => {
    beforeEach(async () => {
      // Initialize with test rules
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          rules: [
            {
              id: 'rule1',
              name: 'Test Rule 1',
              version: '1.0.0',
              tags: ['test'],
              lastModified: new Date().toISOString(),
              content: Buffer.from(JSON.stringify({ test: 'rule' })).toString('base64')
            }
          ]
        })
      });

      await engine.initialize();
    });

    it('should get rule metadata', async () => {
      const metadata = await engine.getRuleMetadata('rule1');

      expect(metadata).toBeDefined();
      expect(metadata?.id).toBe('rule1');
      expect(metadata?.version).toBe('1.0.0');
      expect(metadata?.tags).toContain('test');
    });

    it('should get all rule metadata', async () => {
      const allMetadata = await engine.getAllRuleMetadata();

      expect(allMetadata.size).toBe(1);
      expect(allMetadata.has('rule1')).toBe(true);
    });

    it('should get rules by tags', async () => {
      const ruleIds = await engine.getRulesByTags(['test']);

      expect(ruleIds).toContain('rule1');
    });

    it('should get cache statistics', () => {
      const stats = engine.getCacheStats();

      expect(stats.size).toBe(1);
      expect(stats.maxSize).toBe(100);
    });
  });

  describe('Version Management', () => {
    beforeEach(async () => {
      // Initialize with test rules
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          rules: [
            {
              id: 'rule1',
              name: 'Test Rule 1',
              version: '1.0.0',
              tags: ['test'],
              lastModified: new Date().toISOString(),
              content: Buffer.from(JSON.stringify({ test: 'rule' })).toString('base64')
            }
          ]
        })
      });

      await engine.initialize();
    });

    it('should check rule versions', async () => {
      // Mock version check response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          rules: [
            {
              id: 'rule1',
              name: 'Test Rule 1',
              version: '2.0.0', // Updated version
              tags: ['test'],
              lastModified: new Date().toISOString(),
              content: Buffer.from(JSON.stringify({ test: 'updated-rule' })).toString('base64')
            }
          ]
        })
      });

      const versionCheck = await engine.checkVersions();

      expect(versionCheck.outdatedRules).toContain('rule1');
      expect(versionCheck.totalChecked).toBe(1);
    });

    it('should refresh cache for outdated rules', async () => {
      // Mock refresh response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 'rule1',
          name: 'Test Rule 1',
          version: '2.0.0',
          tags: ['test'],
          lastModified: new Date().toISOString(),
          content: Buffer.from(JSON.stringify({ test: 'updated-rule' })).toString('base64')
        })
      });

      const refreshResult = await engine.refreshCache(['rule1']);

      expect(refreshResult.refreshedRules).toContain('rule1');
      expect(refreshResult.totalProcessed).toBe(1);
    });

    it('should force refresh entire cache', async () => {
      // Mock force refresh response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          rules: [
            {
              id: 'rule1',
              name: 'Test Rule 1',
              version: '2.0.0',
              tags: ['test'],
              lastModified: new Date().toISOString(),
              content: Buffer.from(JSON.stringify({ test: 'updated-rule' })).toString('base64')
            }
          ]
        })
      });

      const status = await engine.forceRefreshCache();

      expect(status.initialized).toBe(true);
      expect(status.rulesLoaded).toBe(1);
    });
  });

  describe('Engine Status and Configuration', () => {
    it('should get engine status', async () => {
      const status = await engine.getStatus();

      expect(status.initialized).toBe(false); // Not initialized yet
      expect(status.rulesLoaded).toBe(0);
      expect(status.projectId).toBe('test-project');
      expect(status.version).toBe('1.0.0');
    });

    it('should get engine configuration', () => {
      const engineConfig = engine.getConfig();

      expect(engineConfig.apiUrl).toBe('https://api.gorules.io');
      expect(engineConfig.projectId).toBe('test-project');
      expect(engineConfig.cacheMaxSize).toBe(100);
    });

    it('should update engine configuration', () => {
      engine.updateConfig({
        httpTimeout: 10000,
        batchSize: 20
      });

      const updatedConfig = engine.getConfig();
      expect(updatedConfig.httpTimeout).toBe(10000);
      expect(updatedConfig.batchSize).toBe(20);
    });

    it('should reset engine state', async () => {
      // Initialize first
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ rules: [] })
      });

      await engine.initialize();
      expect((await engine.getStatus()).initialized).toBe(true);

      // Reset
      await engine.reset();
      expect((await engine.getStatus()).initialized).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle uninitialized engine operations', async () => {
      await expect(engine.executeRule('rule1', {}))
        .rejects.toThrow('Engine not initialized');

      await expect(engine.executeRules(['rule1'], {}))
        .rejects.toThrow('Engine not initialized');

      await expect(engine.executeByTags(['tag1'], {}))
        .rejects.toThrow('Engine not initialized');
    });

    it('should handle invalid configuration', () => {
      expect(() => new MinimalGoRulesEngine({} as any))
        .toThrow('Configuration is required');

      expect(() => new MinimalGoRulesEngine({
        apiUrl: '',
        apiKey: 'key',
        projectId: 'project'
      })).toThrow('API URL is required');

      expect(() => new MinimalGoRulesEngine({
        apiUrl: 'url',
        apiKey: '',
        projectId: 'project'
      })).toThrow('API key is required');

      expect(() => new MinimalGoRulesEngine({
        apiUrl: 'url',
        apiKey: 'key',
        projectId: ''
      })).toThrow('Project ID is required');
    });

    it('should handle invalid numeric configuration values', () => {
      expect(() => new MinimalGoRulesEngine({
        apiUrl: 'url',
        apiKey: 'key',
        projectId: 'project',
        cacheMaxSize: 0
      })).toThrow('Cache max size must be greater than 0');

      expect(() => new MinimalGoRulesEngine({
        apiUrl: 'url',
        apiKey: 'key',
        projectId: 'project',
        httpTimeout: -1
      })).toThrow('HTTP timeout must be greater than 0');
    });
  });

  describe('Performance Optimizations', () => {
    it('should initialize with performance optimizations enabled', async () => {
      const optimizedConfig = {
        ...config,
        enablePerformanceOptimizations: true,
        enablePerformanceMetrics: true,
        enableConnectionPooling: true,
        enableRequestBatching: true,
        enableCompression: true
      };

      const optimizedEngine = new MinimalGoRulesEngine(optimizedConfig);

      // Mock successful initialization
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ rules: [] })
      });

      const status = await optimizedEngine.initialize();
      expect(status.initialized).toBe(true);

      // Should have performance stats
      const performanceReport = optimizedEngine.getPerformanceReport();
      expect(performanceReport).toBeDefined();

      await optimizedEngine.cleanup();
    });

    it('should collect performance metrics when enabled', async () => {
      const optimizedEngine = new MinimalGoRulesEngine({
        ...config,
        enablePerformanceOptimizations: true,
        enablePerformanceMetrics: true
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          rules: [
            {
              id: 'perf-rule',
              name: 'Performance Test Rule',
              version: '1.0.0',
              tags: ['performance'],
              lastModified: new Date().toISOString(),
              content: Buffer.from(JSON.stringify({ test: 'rule' })).toString('base64')
            }
          ]
        })
      });

      await optimizedEngine.initialize();

      const performanceStats = optimizedEngine.getPerformanceStats();
      expect(performanceStats.memoryUsage).toBeGreaterThanOrEqual(0);

      await optimizedEngine.cleanup();
    });
  });

  describe('Concurrent Operations', () => {
    beforeEach(async () => {
      // Initialize with test rules
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          rules: Array.from({ length: 10 }, (_, i) => ({
            id: `rule${i + 1}`,
            name: `Test Rule ${i + 1}`,
            version: '1.0.0',
            tags: ['test', `group${i % 3}`],
            lastModified: new Date().toISOString(),
            content: Buffer.from(JSON.stringify({
              conditions: [{ field: 'value', operator: 'gt', value: i }],
              actions: [{ type: 'set', field: 'result', value: i * 10 }]
            })).toString('base64')
          }))
        })
      });

      await engine.initialize();
    });

    it('should handle concurrent rule executions', async () => {
      const mockZenEngine = {
        evaluate: jest.fn().mockImplementation((ruleId, input) => 
          Promise.resolve({
            result: { processed: true, ruleId },
            performance: '5ms'
          })
        )
      };

      (engine as any).executionEngine.zenEngine = mockZenEngine;

      // Execute multiple rules concurrently
      const promises = Array.from({ length: 5 }, (_, i) =>
        engine.executeRule(`rule${i + 1}`, { value: i * 2 })
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach((result, i) => {
        expect(result.processed).toBe(true);
        expect(result.ruleId).toBe(`rule${i + 1}`);
      });
    });

    it('should handle concurrent cache operations', async () => {
      // Perform multiple cache operations concurrently
      const promises = [
        engine.getRuleMetadata('rule1'),
        engine.getRuleMetadata('rule2'),
        engine.getRulesByTags(['test']),
        engine.getAllRuleMetadata()
      ];

      const results = await Promise.all(promises);

      expect(results[0]?.id).toBe('rule1');
      expect(results[1]?.id).toBe('rule2');
      expect(results[2]).toContain('rule1');
      expect(results[3].size).toBe(10);
    });
  });
});