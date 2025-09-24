/**
 * Unit tests for MinimalExecutionEngine
 */

import { MinimalExecutionEngine } from './minimal-execution-engine.js';
import { IRuleCacheManager } from '../interfaces/services.js';
import { ITagManager, ResolvedRulePlan } from '../tag-manager/interfaces.js';
import { MinimalRuleMetadata, RuleSelector } from '../interfaces/core.js';
import { MinimalGoRulesError } from '../errors/minimal-errors.js';

// Mock ZenEngine
jest.mock('@gorules/zen-engine', () => ({
  ZenEngine: jest.fn().mockImplementation(() => ({
    evaluate: jest.fn(),
  })),
}));

describe('MinimalExecutionEngine', () => {
  let executionEngine: MinimalExecutionEngine;
  let mockCacheManager: jest.Mocked<IRuleCacheManager>;
  let mockTagManager: jest.Mocked<ITagManager>;
  let mockZenEngine: unknown;

  beforeEach(() => {
    // Create mock cache manager
    mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      getMetadata: jest.fn(),
      getMultiple: jest.fn(),
      setMultiple: jest.fn(),
      getRulesByTags: jest.fn(),
      isVersionCurrent: jest.fn(),
      invalidate: jest.fn(),
      clear: jest.fn(),
      getAllMetadata: jest.fn(),
    };

    // Create mock tag manager
    mockTagManager = {
      resolveRules: jest.fn(),
      getRulesByIds: jest.fn(),
      getRulesByTags: jest.fn(),
      analyzeDependencies: jest.fn(),
      createExecutionOrder: jest.fn(),
      validateSelector: jest.fn(),
    };

    // Mock ZenEngine
    const { ZenEngine } = require('@gorules/zen-engine');
    mockZenEngine = {
      evaluate: jest.fn(),
    };
    ZenEngine.mockImplementation(() => mockZenEngine);

    // Create execution engine
    executionEngine = new MinimalExecutionEngine(mockCacheManager, mockTagManager);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      const config = executionEngine.getConfig();
      expect(config.maxConcurrency).toBe(10);
      expect(config.executionTimeout).toBe(5000);
      expect(config.includePerformanceMetrics).toBe(false);
    });

    it('should initialize with custom configuration', () => {
      const customConfig = {
        maxConcurrency: 5,
        executionTimeout: 3000,
        includePerformanceMetrics: true,
      };

      const engine = new MinimalExecutionEngine(mockCacheManager, mockTagManager, customConfig);
      const config = engine.getConfig();

      expect(config.maxConcurrency).toBe(5);
      expect(config.executionTimeout).toBe(3000);
      expect(config.includePerformanceMetrics).toBe(true);
    });

    it('should create ZenEngine with loader function', () => {
      const { ZenEngine } = require('@gorules/zen-engine');
      expect(ZenEngine).toHaveBeenCalledWith({
        loader: expect.any(Function),
      });
    });
  });

  describe('executeRule', () => {
    it('should execute a single rule successfully', async () => {
      const ruleId = 'test-rule';
      const input = { value: 42 };
      const expectedResult = { output: 84 };

      mockCacheManager.get.mockResolvedValue(Buffer.from('{"rule": "data"}'));
      mockZenEngine.evaluate.mockResolvedValue({ result: expectedResult });

      const result = await executionEngine.executeRule(ruleId, input);

      expect(result).toEqual(expectedResult);
      expect(mockCacheManager.get).toHaveBeenCalledWith(ruleId);
      expect(mockZenEngine.evaluate).toHaveBeenCalledWith(ruleId, input);
    });

    it('should throw error when rule not found', async () => {
      const ruleId = 'missing-rule';
      const input = { value: 42 };

      mockCacheManager.get.mockResolvedValue(null);

      await expect(executionEngine.executeRule(ruleId, input)).rejects.toThrow(MinimalGoRulesError);
      await expect(executionEngine.executeRule(ruleId, input)).rejects.toThrow(
        'Rule not found: missing-rule',
      );
    });

    it('should handle ZenEngine execution errors', async () => {
      const ruleId = 'error-rule';
      const input = { value: 42 };

      mockCacheManager.get.mockResolvedValue(Buffer.from('{"rule": "data"}'));
      mockZenEngine.evaluate.mockRejectedValue(new Error('ZenEngine error'));

      await expect(executionEngine.executeRule(ruleId, input)).rejects.toThrow(MinimalGoRulesError);
      await expect(executionEngine.executeRule(ruleId, input)).rejects.toThrow(
        'Rule execution failed: ZenEngine error',
      );
    });

    it('should handle execution timeout', async () => {
      const ruleId = 'slow-rule';
      const input = { value: 42 };

      mockCacheManager.get.mockResolvedValue(Buffer.from('{"rule": "data"}'));

      // Mock a slow execution
      mockZenEngine.evaluate.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ result: {} }), 10000)),
      );

      // Set short timeout
      executionEngine.updateConfig({ executionTimeout: 100 });

      await expect(executionEngine.executeRule(ruleId, input)).rejects.toThrow(
        'Execution timed out after 100ms',
      );
    }, 1000);
  });

  describe('validateRule', () => {
    it('should validate existing rule with valid JSON', async () => {
      const ruleId = 'valid-rule';
      mockCacheManager.get.mockResolvedValue(Buffer.from('{"valid": "json"}'));

      const isValid = await executionEngine.validateRule(ruleId);
      expect(isValid).toBe(true);
    });

    it('should return false for non-existent rule', async () => {
      const ruleId = 'missing-rule';
      mockCacheManager.get.mockResolvedValue(null);

      const isValid = await executionEngine.validateRule(ruleId);
      expect(isValid).toBe(false);
    });

    it('should return false for invalid JSON', async () => {
      const ruleId = 'invalid-rule';
      mockCacheManager.get.mockResolvedValue(Buffer.from('invalid json'));

      const isValid = await executionEngine.validateRule(ruleId);
      expect(isValid).toBe(false);
    });

    it('should handle cache manager errors', async () => {
      const ruleId = 'error-rule';
      mockCacheManager.get.mockRejectedValue(new Error('Cache error'));

      const isValid = await executionEngine.validateRule(ruleId);
      expect(isValid).toBe(false);
    });
  });

  describe('execute', () => {
    const mockMetadata = new Map([
      ['rule1', { id: 'rule1', version: '1.0', tags: ['tag1'], lastModified: Date.now() }],
      ['rule2', { id: 'rule2', version: '1.0', tags: ['tag2'], lastModified: Date.now() }],
    ]);

    beforeEach(() => {
      mockCacheManager.getAllMetadata.mockResolvedValue(mockMetadata);
    });

    describe('parallel execution', () => {
      it('should execute rules in parallel mode', async () => {
        const selector: RuleSelector = {
          ids: ['rule1', 'rule2'],
          mode: { type: 'parallel' },
        };
        const input = { value: 42 };

        const mockRulePlan: ResolvedRulePlan = {
          ruleIds: ['rule1', 'rule2'],
          executionOrder: [['rule1', 'rule2']],
          dependencies: new Map(),
        };

        mockTagManager.resolveRules.mockResolvedValue(mockRulePlan);
        mockZenEngine.evaluate
          .mockResolvedValueOnce({ result: { output1: 'result1' } })
          .mockResolvedValueOnce({ result: { output2: 'result2' } });

        const result = await executionEngine.execute(selector, input);

        expect(result.results.size).toBe(2);
        expect(result.results.get('rule1')).toEqual({ output1: 'result1' });
        expect(result.results.get('rule2')).toEqual({ output2: 'result2' });
        expect(result.executionTime).toBeGreaterThan(0);
        expect(result.errors).toBeUndefined();
      });

      it('should handle errors in parallel execution', async () => {
        const selector: RuleSelector = {
          ids: ['rule1', 'rule2'],
          mode: { type: 'parallel' },
        };
        const input = { value: 42 };

        const mockRulePlan: ResolvedRulePlan = {
          ruleIds: ['rule1', 'rule2'],
          executionOrder: [['rule1', 'rule2']],
          dependencies: new Map(),
        };

        mockTagManager.resolveRules.mockResolvedValue(mockRulePlan);
        mockZenEngine.evaluate
          .mockResolvedValueOnce({ result: { output1: 'result1' } })
          .mockRejectedValueOnce(new Error('Rule2 failed'));

        const result = await executionEngine.execute(selector, input);

        expect(result.results.size).toBe(1);
        expect(result.results.get('rule1')).toEqual({ output1: 'result1' });
        expect(result.errors?.size).toBe(1);
        expect(result.errors?.get('rule2')?.message).toBe('Rule2 failed');
      });

      it('should respect concurrency limits', async () => {
        const selector: RuleSelector = {
          ids: ['rule1', 'rule2', 'rule3', 'rule4'],
          mode: { type: 'parallel' },
        };
        const input = { value: 42 };

        const mockRulePlan: ResolvedRulePlan = {
          ruleIds: ['rule1', 'rule2', 'rule3', 'rule4'],
          executionOrder: [['rule1', 'rule2', 'rule3', 'rule4']],
          dependencies: new Map(),
        };

        // Set low concurrency limit
        executionEngine.updateConfig({ maxConcurrency: 2 });

        mockTagManager.resolveRules.mockResolvedValue(mockRulePlan);

        let concurrentCalls = 0;
        let maxConcurrentCalls = 0;

        mockZenEngine.evaluate.mockImplementation(async () => {
          concurrentCalls++;
          maxConcurrentCalls = Math.max(maxConcurrentCalls, concurrentCalls);

          // Simulate some work
          await new Promise((resolve) => setTimeout(resolve, 10));

          concurrentCalls--;
          return { result: { output: 'result' } };
        });

        await executionEngine.execute(selector, input);

        // Should not exceed concurrency limit
        expect(maxConcurrentCalls).toBeLessThanOrEqual(2);
      });
    });

    describe('sequential execution', () => {
      it('should execute rules in sequential mode', async () => {
        const selector: RuleSelector = {
          ids: ['rule1', 'rule2'],
          mode: { type: 'sequential' },
        };
        const input = { value: 42 };

        const mockRulePlan: ResolvedRulePlan = {
          ruleIds: ['rule1', 'rule2'],
          executionOrder: [['rule1'], ['rule2']],
          dependencies: new Map(),
        };

        mockTagManager.resolveRules.mockResolvedValue(mockRulePlan);

        const executionOrder: string[] = [];
        mockZenEngine.evaluate.mockImplementation(async (ruleId: string, input: unknown) => {
          executionOrder.push(ruleId);
          return { result: { [`output_${ruleId}`]: `result_${ruleId}`, ...input } };
        });

        const result = await executionEngine.execute(selector, input);

        expect(executionOrder).toEqual(['rule1', 'rule2']);
        expect(result.results.size).toBe(2);

        // Check that input was passed through (pipeline mode)
        expect(mockZenEngine.evaluate).toHaveBeenNthCalledWith(1, 'rule1', input);
        expect(mockZenEngine.evaluate).toHaveBeenNthCalledWith(
          2,
          'rule2',
          expect.objectContaining({ value: 42, output_rule1: 'result_rule1' }),
        );
      });

      it('should continue execution after error in sequential mode', async () => {
        const selector: RuleSelector = {
          ids: ['rule1', 'rule2'],
          mode: { type: 'sequential' },
        };
        const input = { value: 42 };

        const mockRulePlan: ResolvedRulePlan = {
          ruleIds: ['rule1', 'rule2'],
          executionOrder: [['rule1'], ['rule2']],
          dependencies: new Map(),
        };

        mockTagManager.resolveRules.mockResolvedValue(mockRulePlan);
        mockZenEngine.evaluate
          .mockRejectedValueOnce(new Error('Rule1 failed'))
          .mockResolvedValueOnce({ result: { output2: 'result2' } });

        const result = await executionEngine.execute(selector, input);

        expect(result.results.size).toBe(1);
        expect(result.results.get('rule2')).toEqual({ output2: 'result2' });
        expect(result.errors?.size).toBe(1);
        expect(result.errors?.get('rule1')?.message).toBe('Rule1 failed');
      });
    });

    describe('mixed execution', () => {
      beforeEach(() => {
        // Ensure cache has the required rules for mixed execution tests
        mockCacheManager.getAllMetadata.mockResolvedValue(
          new Map([
            ['rule1', { id: 'rule1', version: '1.0', tags: ['tag1'], lastModified: Date.now() }],
            ['rule2', { id: 'rule2', version: '1.0', tags: ['tag2'], lastModified: Date.now() }],
            ['rule3', { id: 'rule3', version: '1.0', tags: ['tag3'], lastModified: Date.now() }],
          ]),
        );
      });

      it('should execute rules in mixed mode', async () => {
        const selector: RuleSelector = {
          ids: ['rule1', 'rule2', 'rule3'],
          mode: {
            type: 'mixed',
            groups: [
              { rules: ['rule1'], mode: 'sequential' },
              { rules: ['rule2', 'rule3'], mode: 'parallel' },
            ],
          },
        };
        const input = { value: 42 };

        const mockRulePlan: ResolvedRulePlan = {
          ruleIds: ['rule1', 'rule2', 'rule3'],
          executionOrder: [['rule1'], ['rule2', 'rule3']], // Sequential then parallel
          dependencies: new Map(),
        };

        mockTagManager.resolveRules.mockResolvedValue(mockRulePlan);

        const executionOrder: string[] = [];
        mockZenEngine.evaluate.mockImplementation(async (ruleId: string) => {
          executionOrder.push(ruleId);
          return { result: { [`output_${ruleId}`]: `result_${ruleId}` } };
        });

        const result = await executionEngine.execute(selector, input);

        expect(result.results.size).toBe(3);

        // rule1 should execute first, then rule2 and rule3 in parallel
        expect(executionOrder[0]).toBe('rule1');
        expect(executionOrder.slice(1).sort()).toEqual(['rule2', 'rule3']);
      });
    });

    it('should return empty result for no matching rules', async () => {
      const selector: RuleSelector = {
        ids: ['nonexistent'],
        mode: { type: 'parallel' },
      };
      const input = { value: 42 };

      const mockRulePlan: ResolvedRulePlan = {
        ruleIds: [],
        executionOrder: [],
        dependencies: new Map(),
      };

      mockTagManager.resolveRules.mockResolvedValue(mockRulePlan);

      const result = await executionEngine.execute(selector, input);

      expect(result.results.size).toBe(0);
      expect(result.executionTime).toBeGreaterThan(0);
    });

    it('should throw error for unsupported execution mode', async () => {
      const selector: RuleSelector = {
        ids: ['rule1'],
        mode: { type: 'unsupported' as unknown },
      };
      const input = { value: 42 };

      const mockRulePlan: ResolvedRulePlan = {
        ruleIds: ['rule1'],
        executionOrder: [['rule1']],
        dependencies: new Map(),
      };

      mockTagManager.resolveRules.mockResolvedValue(mockRulePlan);

      await expect(executionEngine.execute(selector, input)).rejects.toThrow(
        'Unsupported execution mode: unsupported',
      );
    });
  });

  describe('configuration management', () => {
    it('should get current configuration', () => {
      const config = executionEngine.getConfig();
      expect(config).toEqual({
        maxConcurrency: 10,
        executionTimeout: 5000,
        includePerformanceMetrics: false,
      });
    });

    it('should update configuration', () => {
      const newConfig = {
        maxConcurrency: 5,
        executionTimeout: 3000,
      };

      executionEngine.updateConfig(newConfig);
      const config = executionEngine.getConfig();

      expect(config.maxConcurrency).toBe(5);
      expect(config.executionTimeout).toBe(3000);
      expect(config.includePerformanceMetrics).toBe(false); // Should keep existing value
    });
  });

  describe('ZenEngine loader integration', () => {
    it('should create loader that reads from cache manager', async () => {
      const { ZenEngine } = require('@gorules/zen-engine');
      const loaderCall = ZenEngine.mock.calls[0][0];
      const loader = loaderCall.loader;

      // Mock cache manager response
      const ruleData = Buffer.from('{"rule": "data"}');
      mockCacheManager.get.mockResolvedValue(ruleData);

      const result = await loader('test-rule');
      expect(result).toBe(ruleData);
      expect(mockCacheManager.get).toHaveBeenCalledWith('test-rule');
    });

    it('should throw error when rule not found in loader', async () => {
      const { ZenEngine } = require('@gorules/zen-engine');
      const loaderCall = ZenEngine.mock.calls[0][0];
      const loader = loaderCall.loader;

      mockCacheManager.get.mockResolvedValue(null);

      await expect(loader('missing-rule')).rejects.toThrow(MinimalGoRulesError);
      await expect(loader('missing-rule')).rejects.toThrow('Rule not found in cache: missing-rule');
    });
  });

  describe('enhanced parallel execution', () => {
    it('should execute rules with performance metrics', async () => {
      const ruleIds = ['rule1', 'rule2', 'rule3'];
      const input = { value: 42 };

      mockZenEngine.evaluate
        .mockResolvedValueOnce({ result: { output1: 'result1' } })
        .mockResolvedValueOnce({ result: { output2: 'result2' } })
        .mockResolvedValueOnce({ result: { output3: 'result3' } });

      const result = await executionEngine.executeParallelWithMetrics(ruleIds, input, {
        includeMetrics: true,
        maxConcurrency: 2,
      });

      expect(result.results.size).toBe(3);
      expect(result.performanceMetrics).toBeDefined();
      expect(result.performanceMetrics!.ruleTimings.size).toBe(3);
      expect(result.performanceMetrics!.concurrencyStats.maxConcurrentRules).toBeLessThanOrEqual(2);
      expect(result.performanceAnalysis).toBeDefined();
    });

    it('should handle fail-fast mode', async () => {
      const ruleIds = ['rule1', 'rule2', 'rule3'];
      const input = { value: 42 };

      mockZenEngine.evaluate
        .mockResolvedValueOnce({ result: { output1: 'result1' } })
        .mockRejectedValueOnce(new Error('Rule2 failed'))
        .mockResolvedValueOnce({ result: { output3: 'result3' } });

      await expect(
        executionEngine.executeParallelWithMetrics(ruleIds, input, {
          failFast: true,
          maxConcurrency: 1, // Sequential to ensure order
        }),
      ).rejects.toThrow('Rule2 failed');
    });

    it('should collect all errors when fail-fast is disabled', async () => {
      const ruleIds = ['rule1', 'rule2', 'rule3'];
      const input = { value: 42 };

      mockZenEngine.evaluate
        .mockResolvedValueOnce({ result: { output1: 'result1' } })
        .mockRejectedValueOnce(new Error('Rule2 failed'))
        .mockRejectedValueOnce(new Error('Rule3 failed'));

      const result = await executionEngine.executeParallelWithMetrics(ruleIds, input, {
        failFast: false,
        includeMetrics: true,
      });

      expect(result.results.size).toBe(1);
      expect(result.errors?.size).toBe(2);
      expect(result.errors?.get('rule2')?.message).toBe('Rule2 failed');
      expect(result.errors?.get('rule3')?.message).toBe('Rule3 failed');
    });

    it('should respect custom timeout', async () => {
      const ruleIds = ['slow-rule'];
      const input = { value: 42 };

      // Mock a slow execution
      mockZenEngine.evaluate.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ result: {} }), 200)),
      );

      const result = await executionEngine.executeParallelWithMetrics(ruleIds, input, {
        ruleTimeout: 50, // Very short timeout
        failFast: false, // Don't fail fast, collect the timeout error
      });

      expect(result.errors?.size).toBe(1);
      expect(result.errors?.get('slow-rule')?.message).toContain('Execution timed out after 50ms');
      expect(result.results.size).toBe(0);
    }, 1000);

    it('should respect concurrency limits', async () => {
      const ruleIds = ['rule1', 'rule2', 'rule3', 'rule4', 'rule5'];
      const input = { value: 42 };

      let concurrentCalls = 0;
      let maxConcurrentCalls = 0;

      mockZenEngine.evaluate.mockImplementation(async () => {
        concurrentCalls++;
        maxConcurrentCalls = Math.max(maxConcurrentCalls, concurrentCalls);

        // Simulate some work
        await new Promise((resolve) => setTimeout(resolve, 10));

        concurrentCalls--;
        return { result: { output: 'result' } };
      });

      await executionEngine.executeParallelWithMetrics(ruleIds, input, {
        maxConcurrency: 2,
        includeMetrics: true,
      });

      expect(maxConcurrentCalls).toBeLessThanOrEqual(2);
    });

    it('should provide performance analysis', async () => {
      const ruleIds = ['fast-rule', 'slow-rule'];
      const input = { value: 42 };

      mockZenEngine.evaluate
        .mockImplementationOnce(async () => {
          await new Promise((resolve) => setTimeout(resolve, 5));
          return { result: { output: 'fast' } };
        })
        .mockImplementationOnce(async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return { result: { output: 'slow' } };
        });

      const result = await executionEngine.executeParallelWithMetrics(ruleIds, input, {
        includeMetrics: true,
      });

      expect(result.performanceAnalysis).toBeDefined();
      expect(result.performanceAnalysis!.efficiency).toBeGreaterThan(0);
      expect(result.performanceAnalysis!.efficiency).toBeLessThanOrEqual(1);
      expect(Array.isArray(result.performanceAnalysis!.bottlenecks)).toBe(true);
      expect(Array.isArray(result.performanceAnalysis!.recommendations)).toBe(true);
    });

    it('should store last execution metrics', async () => {
      const ruleIds = ['rule1'];
      const input = { value: 42 };

      mockZenEngine.evaluate.mockResolvedValue({ result: { output: 'result' } });

      await executionEngine.executeParallelWithMetrics(ruleIds, input, {
        includeMetrics: true,
      });

      const lastMetrics = executionEngine.getLastExecutionMetrics();
      expect(lastMetrics).toBeDefined();
      expect(lastMetrics!.ruleTimings.size).toBe(1);
      expect(lastMetrics!.totalTime).toBeGreaterThan(0);
    });

    it('should handle empty rule list', async () => {
      const result = await executionEngine.executeParallelWithMetrics([], { value: 42 });

      expect(result.results.size).toBe(0);
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
      expect(result.errors).toBeUndefined();
    });

    it('should measure batch timings accurately', async () => {
      const ruleIds = ['rule1', 'rule2', 'rule3', 'rule4'];
      const input = { value: 42 };

      mockZenEngine.evaluate.mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return { result: { output: 'result' } };
      });

      const result = await executionEngine.executeParallelWithMetrics(ruleIds, input, {
        maxConcurrency: 2,
        includeMetrics: true,
      });

      expect(result.performanceMetrics!.batchTimings.length).toBeGreaterThan(0);
      expect(result.performanceMetrics!.concurrencyStats.totalBatches).toBeGreaterThan(0);
      expect(result.performanceMetrics!.concurrencyStats.maxConcurrentRules).toBe(2);
    });
  });

  describe('enhanced sequential execution', () => {
    it('should execute rules with pipeline mode enabled', async () => {
      const ruleIds = ['rule1', 'rule2', 'rule3'];
      const input = { value: 42 };

      const executionOrder: string[] = [];
      const inputHistory: Record<string, unknown>[] = [];

      mockZenEngine.evaluate.mockImplementation(
        async (ruleId: string, input: Record<string, unknown>) => {
          executionOrder.push(ruleId);
          inputHistory.push({ ...input });

          return {
            result: {
              [`output_${ruleId}`]: `result_${ruleId}`,
              [`processed_by_${ruleId}`]: true,
            },
          };
        },
      );

      const result = await executionEngine.executeSequentialWithMetrics(ruleIds, input, {
        pipelineMode: true,
        includeMetrics: true,
      });

      expect(executionOrder).toEqual(['rule1', 'rule2', 'rule3']);
      expect(result.results.size).toBe(3);

      // Verify pipeline mode - each rule gets output from previous rules
      expect(inputHistory[0]).toEqual({ value: 42 });
      expect(inputHistory[1]).toEqual(
        expect.objectContaining({
          value: 42,
          output_rule1: 'result_rule1',
          processed_by_rule1: true,
        }),
      );
      expect(inputHistory[2]).toEqual(
        expect.objectContaining({
          value: 42,
          output_rule1: 'result_rule1',
          processed_by_rule1: true,
          output_rule2: 'result_rule2',
          processed_by_rule2: true,
        }),
      );

      expect(result.finalInput).toEqual(
        expect.objectContaining({
          value: 42,
          output_rule1: 'result_rule1',
          processed_by_rule1: true,
          output_rule2: 'result_rule2',
          processed_by_rule2: true,
          output_rule3: 'result_rule3',
          processed_by_rule3: true,
        }),
      );
    });

    it('should execute rules with pipeline mode disabled', async () => {
      const ruleIds = ['rule1', 'rule2'];
      const input = { value: 42 };

      const inputHistory: Record<string, unknown>[] = [];

      mockZenEngine.evaluate.mockImplementation(
        async (ruleId: string, input: Record<string, unknown>) => {
          inputHistory.push({ ...input });
          return { result: { [`output_${ruleId}`]: `result_${ruleId}` } };
        },
      );

      const result = await executionEngine.executeSequentialWithMetrics(ruleIds, input, {
        pipelineMode: false,
      });

      expect(result.results.size).toBe(2);

      // Verify non-pipeline mode - each rule gets original input
      expect(inputHistory[0]).toEqual({ value: 42 });
      expect(inputHistory[1]).toEqual({ value: 42 });
      expect(result.finalInput).toBeUndefined();
    });

    it('should stop on first error when stopOnError is true', async () => {
      const ruleIds = ['rule1', 'rule2', 'rule3'];
      const input = { value: 42 };

      const executionOrder: string[] = [];

      mockZenEngine.evaluate.mockImplementation(async (ruleId: string) => {
        executionOrder.push(ruleId);
        if (ruleId === 'rule2') {
          throw new Error('Rule2 failed');
        }
        return { result: { [`output_${ruleId}`]: `result_${ruleId}` } };
      });

      const result = await executionEngine.executeSequentialWithMetrics(ruleIds, input, {
        stopOnError: true,
      });

      expect(executionOrder).toEqual(['rule1', 'rule2']); // Should stop after rule2 fails
      expect(result.results.size).toBe(1);
      expect(result.results.get('rule1')).toEqual({ output_rule1: 'result_rule1' });
      expect(result.errors?.size).toBe(1);
      expect(result.errors?.get('rule2')?.message).toBe('Rule2 failed');
    });

    it('should continue execution when stopOnError is false', async () => {
      const ruleIds = ['rule1', 'rule2', 'rule3'];
      const input = { value: 42 };

      const executionOrder: string[] = [];

      mockZenEngine.evaluate.mockImplementation(async (ruleId: string) => {
        executionOrder.push(ruleId);
        if (ruleId === 'rule2') {
          throw new Error('Rule2 failed');
        }
        return { result: { [`output_${ruleId}`]: `result_${ruleId}` } };
      });

      const result = await executionEngine.executeSequentialWithMetrics(ruleIds, input, {
        stopOnError: false,
      });

      expect(executionOrder).toEqual(['rule1', 'rule2', 'rule3']); // Should continue after rule2 fails
      expect(result.results.size).toBe(2);
      expect(result.results.get('rule1')).toEqual({ output_rule1: 'result_rule1' });
      expect(result.results.get('rule3')).toEqual({ output_rule3: 'result_rule3' });
      expect(result.errors?.size).toBe(1);
      expect(result.errors?.get('rule2')?.message).toBe('Rule2 failed');
    });

    it('should provide detailed execution state tracking', async () => {
      const ruleIds = ['rule1', 'rule2'];
      const input = { value: 42 };

      mockZenEngine.evaluate
        .mockImplementationOnce(async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return { result: { output1: 'result1' } };
        })
        .mockImplementationOnce(async () => {
          await new Promise((resolve) => setTimeout(resolve, 5));
          return { result: { output2: 'result2' } };
        });

      const result = await executionEngine.executeSequentialWithMetrics(ruleIds, input, {
        includeStateTracking: true,
        pipelineMode: true,
      });

      expect(result.executionState).toBeDefined();
      expect(result.executionState?.completedRules).toEqual(['rule1', 'rule2']);
      expect(result.executionState?.failedRules).toEqual([]);
      expect(result.executionState?.currentRule).toBeUndefined(); // Should be cleared after completion
      expect(result.executionState?.timeline).toHaveLength(4); // 2 started + 2 completed events

      const timeline = result.executionState?.timeline || [];
      expect(timeline[0]).toEqual(
        expect.objectContaining({
          ruleId: 'rule1',
          event: 'started',
          timestamp: expect.any(Number),
        }),
      );
      expect(timeline[1]).toEqual(
        expect.objectContaining({
          ruleId: 'rule1',
          event: 'completed',
          timestamp: expect.any(Number),
          duration: expect.any(Number),
        }),
      );
      expect(timeline[2]).toEqual(
        expect.objectContaining({
          ruleId: 'rule2',
          event: 'started',
          timestamp: expect.any(Number),
        }),
      );
      expect(timeline[3]).toEqual(
        expect.objectContaining({
          ruleId: 'rule2',
          event: 'completed',
          timestamp: expect.any(Number),
          duration: expect.any(Number),
        }),
      );

      // Verify input state tracking in pipeline mode
      expect(result.executionState?.currentInput).toEqual(
        expect.objectContaining({
          value: 42,
          output1: 'result1',
          output2: 'result2',
        }),
      );
    });

    it('should track failed rules in execution state', async () => {
      const ruleIds = ['rule1', 'rule2', 'rule3'];
      const input = { value: 42 };

      mockZenEngine.evaluate.mockImplementation(async (ruleId: string) => {
        if (ruleId === 'rule2') {
          throw new Error('Rule2 execution failed');
        }
        return { result: { [`output_${ruleId}`]: `result_${ruleId}` } };
      });

      const result = await executionEngine.executeSequentialWithMetrics(ruleIds, input, {
        includeStateTracking: true,
        stopOnError: false,
      });

      expect(result.executionState?.completedRules).toEqual(['rule1', 'rule3']);
      expect(result.executionState?.failedRules).toEqual(['rule2']);

      const timeline = result.executionState?.timeline || [];
      const failedEvent = timeline.find((event) => event.event === 'failed');
      expect(failedEvent).toEqual(
        expect.objectContaining({
          ruleId: 'rule2',
          event: 'failed',
          timestamp: expect.any(Number),
          duration: expect.any(Number),
          error: 'Rule2 execution failed',
        }),
      );
    });

    it('should respect custom timeout for individual rules', async () => {
      const ruleIds = ['fast-rule', 'slow-rule'];
      const input = { value: 42 };

      mockZenEngine.evaluate.mockImplementation(async (ruleId: string) => {
        if (ruleId === 'slow-rule') {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
        return { result: { [`output_${ruleId}`]: `result_${ruleId}` } };
      });

      const result = await executionEngine.executeSequentialWithMetrics(ruleIds, input, {
        ruleTimeout: 50,
        stopOnError: false,
        includeStateTracking: true,
      });

      expect(result.results.size).toBe(1);
      expect(result.results.get('fast-rule')).toEqual({ 'output_fast-rule': 'result_fast-rule' });
      expect(result.errors?.size).toBe(1);
      expect(result.errors?.get('slow-rule')?.message).toContain('Execution timed out after 50ms');

      expect(result.executionState?.completedRules).toEqual(['fast-rule']);
      expect(result.executionState?.failedRules).toEqual(['slow-rule']);
    }, 1000);

    it('should provide performance metrics when enabled', async () => {
      const ruleIds = ['rule1', 'rule2'];
      const input = { value: 42 };

      mockZenEngine.evaluate.mockImplementation(async (ruleId: string) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return { result: { [`output_${ruleId}`]: `result_${ruleId}` } };
      });

      const result = await executionEngine.executeSequentialWithMetrics(ruleIds, input, {
        includeMetrics: true,
      });

      expect(result.performanceMetrics).toBeDefined();
      expect(result.performanceMetrics?.ruleTimings.size).toBe(2);
      expect(result.performanceMetrics?.totalTime).toBeGreaterThan(0);
      expect(result.performanceAnalysis).toBeDefined();
      expect(result.performanceAnalysis?.efficiency).toBeGreaterThan(0);
      expect(Array.isArray(result.performanceAnalysis?.bottlenecks)).toBe(true);
      expect(Array.isArray(result.performanceAnalysis?.recommendations)).toBe(true);
    });

    it('should handle empty rule list gracefully', async () => {
      const result = await executionEngine.executeSequentialWithMetrics([], { value: 42 });

      expect(result.results.size).toBe(0);
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
      expect(result.errors).toBeUndefined();
    });

    it('should handle non-object rule results in pipeline mode', async () => {
      const ruleIds = ['rule1', 'rule2'];
      const input = { value: 42 };

      const inputHistory: Record<string, unknown>[] = [];

      mockZenEngine.evaluate.mockImplementation(
        async (ruleId: string, input: Record<string, unknown>) => {
          inputHistory.push({ ...input });

          if (ruleId === 'rule1') {
            return { result: 'string-result' }; // Non-object result
          }
          return { result: { output2: 'result2' } };
        },
      );

      const result = await executionEngine.executeSequentialWithMetrics(ruleIds, input, {
        pipelineMode: true,
      });

      expect(result.results.size).toBe(2);
      expect(result.results.get('rule1')).toBe('string-result');
      expect(result.results.get('rule2')).toEqual({ output2: 'result2' });

      // Second rule should get original input since first result wasn't an object
      expect(inputHistory[0]).toEqual({ value: 42 });
      expect(inputHistory[1]).toEqual({ value: 42 });
    });

    it('should store last execution metrics', async () => {
      const ruleIds = ['rule1'];
      const input = { value: 42 };

      mockZenEngine.evaluate.mockResolvedValue({ result: { output: 'result' } });

      await executionEngine.executeSequentialWithMetrics(ruleIds, input, {
        includeMetrics: true,
      });

      const lastMetrics = executionEngine.getLastExecutionMetrics();
      expect(lastMetrics).toBeDefined();
      expect(lastMetrics?.ruleTimings.size).toBe(1);
      expect(lastMetrics?.totalTime).toBeGreaterThan(0);
    });

    it('should handle execution errors gracefully', async () => {
      const ruleIds = ['rule1'];
      const input = { value: 42 };

      // Mock cache manager to throw error during rule loading
      mockCacheManager.get.mockRejectedValue(new Error('Cache error'));

      const result = await executionEngine.executeSequentialWithMetrics(ruleIds, input, {
        stopOnError: false,
      });

      // Should handle the cache error as a rule execution error
      expect(result.results.size).toBe(0);
      expect(result.errors?.size).toBe(1);
      expect(result.errors?.get('rule1')).toBeDefined();
    });

    it('should maintain execution order under various conditions', async () => {
      const ruleIds = ['rule1', 'rule2', 'rule3', 'rule4', 'rule5'];
      const input = { value: 42 };

      const executionOrder: string[] = [];
      const executionTimes: Record<string, number> = {};

      mockZenEngine.evaluate.mockImplementation(async (ruleId: string) => {
        const startTime = performance.now();
        executionOrder.push(ruleId);

        // Simulate variable execution times
        const delay = Math.random() * 20;
        await new Promise((resolve) => setTimeout(resolve, delay));

        executionTimes[ruleId] = performance.now() - startTime;

        if (ruleId === 'rule3') {
          throw new Error('Rule3 failed');
        }

        return { result: { [`output_${ruleId}`]: `result_${ruleId}` } };
      });

      const result = await executionEngine.executeSequentialWithMetrics(ruleIds, input, {
        stopOnError: false,
        includeStateTracking: true,
      });

      // Verify strict sequential execution order
      expect(executionOrder).toEqual(['rule1', 'rule2', 'rule3', 'rule4', 'rule5']);

      // Verify results and errors
      expect(result.results.size).toBe(4); // All except rule3
      expect(result.errors?.size).toBe(1);
      expect(result.errors?.get('rule3')?.message).toBe('Rule3 failed');

      // Verify execution state
      expect(result.executionState?.completedRules).toEqual(['rule1', 'rule2', 'rule4', 'rule5']);
      expect(result.executionState?.failedRules).toEqual(['rule3']);
    });
  });

  describe('performance', () => {
    it('should complete execution within reasonable time', async () => {
      const selector: RuleSelector = {
        ids: ['rule1'],
        mode: { type: 'parallel' },
      };
      const input = { value: 42 };

      const mockRulePlan: ResolvedRulePlan = {
        ruleIds: ['rule1'],
        executionOrder: [['rule1']],
        dependencies: new Map(),
      };

      mockTagManager.resolveRules.mockResolvedValue(mockRulePlan);
      mockZenEngine.evaluate.mockResolvedValue({ result: { output: 'result' } });

      const startTime = performance.now();
      const result = await executionEngine.execute(selector, input);
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(100); // Should complete quickly
      expect(result.executionTime).toBeGreaterThan(0);
      expect(result.executionTime).toBeLessThan(duration + 10); // Allow some margin
    });

    it('should handle high-throughput scenarios', async () => {
      const ruleIds = Array.from({ length: 50 }, (_, i) => `rule${i}`);
      const input = { value: 42 };

      mockZenEngine.evaluate.mockImplementation(async () => {
        // Simulate very fast rule execution
        await new Promise((resolve) => setTimeout(resolve, 1));
        return { result: { output: 'result' } };
      });

      const startTime = performance.now();
      const result = await executionEngine.executeParallelWithMetrics(ruleIds, input, {
        maxConcurrency: 10,
        includeMetrics: true,
      });
      const duration = performance.now() - startTime;

      expect(result.results.size).toBe(50);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      expect(result.performanceMetrics!.concurrencyStats.maxConcurrentRules).toBe(10);
    });
  });

  describe('mixed execution mode', () => {
    beforeEach(() => {
      // Mock cache to have rules available
      mockCacheManager.getAllMetadata.mockResolvedValue(
        new Map([
          ['rule1', { id: 'rule1', version: '1.0', tags: ['tag1'], lastModified: Date.now() }],
          ['rule2', { id: 'rule2', version: '1.0', tags: ['tag2'], lastModified: Date.now() }],
          ['rule3', { id: 'rule3', version: '1.0', tags: ['tag3'], lastModified: Date.now() }],
          ['rule4', { id: 'rule4', version: '1.0', tags: ['tag4'], lastModified: Date.now() }],
          ['rule5', { id: 'rule5', version: '1.0', tags: ['tag5'], lastModified: Date.now() }],
        ]),
      );
    });

    describe('validateExecutionGroups', () => {
      it('should validate correct execution groups', async () => {
        const groups = [
          { rules: ['rule1', 'rule2'], mode: 'parallel' as const },
          { rules: ['rule3'], mode: 'sequential' as const },
          { rules: ['rule4', 'rule5'], mode: 'sequential' as const },
        ];

        const plan = await executionEngine.validateExecutionGroups(groups);

        expect(plan.groups).toHaveLength(3);
        expect(plan.totalRules).toBe(5);
        expect(plan.groups[0].ruleIds).toEqual(['rule1', 'rule2']);
        expect(plan.groups[0].mode).toBe('parallel');
        expect(plan.groups[1].ruleIds).toEqual(['rule3']);
        expect(plan.groups[1].mode).toBe('sequential');
        expect(plan.groups[2].ruleIds).toEqual(['rule4', 'rule5']);
        expect(plan.groups[2].mode).toBe('sequential');
      });

      it('should throw error for empty groups array', async () => {
        await expect(executionEngine.validateExecutionGroups([])).rejects.toThrow(
          'Execution groups cannot be empty',
        );
      });

      it('should throw error for group with empty rules', async () => {
        const groups = [{ rules: [], mode: 'parallel' as const }];

        await expect(executionEngine.validateExecutionGroups(groups)).rejects.toThrow(
          'Execution group 0 cannot have empty rules array',
        );
      });

      it('should throw error for invalid execution mode', async () => {
        const groups = [{ rules: ['rule1'], mode: 'invalid' as any }];

        await expect(executionEngine.validateExecutionGroups(groups)).rejects.toThrow(
          "Invalid execution mode 'invalid' in group 0",
        );
      });

      it('should throw error for non-existent rule', async () => {
        const groups = [{ rules: ['nonexistent'], mode: 'parallel' as const }];

        await expect(executionEngine.validateExecutionGroups(groups)).rejects.toThrow(
          "Rule 'nonexistent' in group 0 not found in cache",
        );
      });

      it('should throw error for duplicate rules across groups', async () => {
        const groups = [
          { rules: ['rule1'], mode: 'parallel' as const },
          { rules: ['rule1'], mode: 'sequential' as const },
        ];

        await expect(executionEngine.validateExecutionGroups(groups)).rejects.toThrow(
          "Rule 'rule1' appears in multiple execution groups",
        );
      });

      it('should provide optimization recommendations', async () => {
        const groups = [
          { rules: ['rule1'], mode: 'parallel' as const }, // Single rule in parallel
          {
            rules: ['rule2', 'rule3', 'rule4', 'rule5', 'rule1'].slice(0, 4),
            mode: 'sequential' as const,
          }, // Large sequential group
        ];

        // Add more rules to cache for the large group test
        mockCacheManager.getAllMetadata.mockResolvedValue(
          new Map([
            ['rule1', { id: 'rule1', version: '1.0', tags: ['tag1'], lastModified: Date.now() }],
            ['rule2', { id: 'rule2', version: '1.0', tags: ['tag2'], lastModified: Date.now() }],
            ['rule3', { id: 'rule3', version: '1.0', tags: ['tag3'], lastModified: Date.now() }],
            ['rule4', { id: 'rule4', version: '1.0', tags: ['tag4'], lastModified: Date.now() }],
            ['rule5', { id: 'rule5', version: '1.0', tags: ['tag5'], lastModified: Date.now() }],
            ['rule6', { id: 'rule6', version: '1.0', tags: ['tag6'], lastModified: Date.now() }],
          ]),
        );

        const largeGroups = [
          { rules: ['rule1'], mode: 'parallel' as const },
          { rules: ['rule2', 'rule3', 'rule4', 'rule5', 'rule6'], mode: 'sequential' as const },
        ];

        const plan = await executionEngine.validateExecutionGroups(largeGroups);

        expect(plan.optimizations).toBeDefined();
        expect(
          plan.optimizations!.some((opt) => opt.includes('Single rule in parallel mode')),
        ).toBe(true);
      });

      it('should estimate execution times', async () => {
        const groups = [
          { rules: ['rule1', 'rule2'], mode: 'parallel' as const },
          { rules: ['rule3'], mode: 'sequential' as const },
        ];

        const plan = await executionEngine.validateExecutionGroups(groups);

        expect(plan.estimatedTime).toBeGreaterThan(0);
        expect(plan.groups[0].estimatedTime).toBeGreaterThan(0);
        expect(plan.groups[1].estimatedTime).toBeGreaterThan(0);

        // Parallel should be faster than sequential for same number of rules
        const parallelTime = plan.groups[0].estimatedTime!;
        const sequentialTimeForTwo = 50 * 2; // 2 rules * 50ms each
        expect(parallelTime).toBeLessThan(sequentialTimeForTwo);
      });
    });

    describe('executeMixedWithMetrics', () => {
      it('should execute mixed groups with parallel and sequential modes', async () => {
        const groups = [
          { rules: ['rule1', 'rule2'], mode: 'parallel' as const },
          { rules: ['rule3'], mode: 'sequential' as const },
          { rules: ['rule4', 'rule5'], mode: 'parallel' as const },
        ];
        const input = { value: 42 };

        const executionOrder: string[] = [];
        mockZenEngine.evaluate.mockImplementation(async (ruleId: string) => {
          executionOrder.push(ruleId);
          return { result: { [`output_${ruleId}`]: `result_${ruleId}` } };
        });

        const result = await executionEngine.executeMixedWithMetrics(groups, input, {
          includeMetrics: true,
        });

        expect(result.results.size).toBe(5);
        expect(result.groupResults).toHaveLength(3);

        // Check group results structure
        expect(result.groupResults![0].mode).toBe('parallel');
        expect(result.groupResults![0].ruleIds).toEqual(['rule1', 'rule2']);
        expect(result.groupResults![1].mode).toBe('sequential');
        expect(result.groupResults![1].ruleIds).toEqual(['rule3']);
        expect(result.groupResults![2].mode).toBe('parallel');
        expect(result.groupResults![2].ruleIds).toEqual(['rule4', 'rule5']);

        // Verify execution plan is included
        expect(result.executionPlan).toBeDefined();
        expect(result.executionPlan!.totalRules).toBe(5);
      });

      it('should handle pipeline mode between groups', async () => {
        const groups = [
          { rules: ['rule1'], mode: 'sequential' as const },
          { rules: ['rule2'], mode: 'sequential' as const },
        ];
        const input = { value: 42 };

        const inputHistory: Record<string, unknown>[] = [];
        mockZenEngine.evaluate.mockImplementation(
          async (ruleId: string, input: Record<string, unknown>) => {
            inputHistory.push({ ...input });
            return { result: { [`output_${ruleId}`]: `result_${ruleId}`, processed: true } };
          },
        );

        const result = await executionEngine.executeMixedWithMetrics(groups, input, {
          pipelineMode: true,
        });

        expect(result.results.size).toBe(2);
        expect(result.finalInput).toBeDefined();

        // Verify pipeline mode - second rule should get output from first rule
        expect(inputHistory[0]).toEqual({ value: 42 });
        expect(inputHistory[1]).toEqual(
          expect.objectContaining({
            value: 42,
            output_rule1: 'result_rule1',
            processed: true,
          }),
        );

        expect(result.finalInput).toEqual(
          expect.objectContaining({
            value: 42,
            output_rule1: 'result_rule1',
            output_rule2: 'result_rule2',
            processed: true,
          }),
        );
      });

      it('should handle pipeline mode disabled', async () => {
        const groups = [
          { rules: ['rule1'], mode: 'sequential' as const },
          { rules: ['rule2'], mode: 'sequential' as const },
        ];
        const input = { value: 42 };

        const inputHistory: Record<string, unknown>[] = [];
        mockZenEngine.evaluate.mockImplementation(
          async (ruleId: string, input: Record<string, unknown>) => {
            inputHistory.push({ ...input });
            return { result: { [`output_${ruleId}`]: `result_${ruleId}` } };
          },
        );

        const result = await executionEngine.executeMixedWithMetrics(groups, input, {
          pipelineMode: false,
        });

        expect(result.results.size).toBe(2);
        expect(result.finalInput).toBeUndefined();

        // Both rules should get original input
        expect(inputHistory[0]).toEqual({ value: 42 });
        expect(inputHistory[1]).toEqual({ value: 42 });
      });

      it('should stop on error when stopOnError is true', async () => {
        const groups = [
          { rules: ['rule1'], mode: 'sequential' as const },
          { rules: ['rule2'], mode: 'sequential' as const },
          { rules: ['rule3'], mode: 'sequential' as const },
        ];
        const input = { value: 42 };

        const executionOrder: string[] = [];
        mockZenEngine.evaluate.mockImplementation(async (ruleId: string) => {
          executionOrder.push(ruleId);
          if (ruleId === 'rule2') {
            throw new Error('Rule2 failed');
          }
          return { result: { [`output_${ruleId}`]: `result_${ruleId}` } };
        });

        const result = await executionEngine.executeMixedWithMetrics(groups, input, {
          stopOnError: true,
        });

        expect(executionOrder).toEqual(['rule1', 'rule2']); // Should stop after rule2 fails
        expect(result.results.size).toBe(1);
        expect(result.errors?.size).toBe(1);
        expect(result.groupResults).toHaveLength(2); // Only first two groups executed
      });

      it('should continue execution when stopOnError is false', async () => {
        const groups = [
          { rules: ['rule1'], mode: 'sequential' as const },
          { rules: ['rule2'], mode: 'sequential' as const },
          { rules: ['rule3'], mode: 'sequential' as const },
        ];
        const input = { value: 42 };

        const executionOrder: string[] = [];
        mockZenEngine.evaluate.mockImplementation(async (ruleId: string) => {
          executionOrder.push(ruleId);
          if (ruleId === 'rule2') {
            throw new Error('Rule2 failed');
          }
          return { result: { [`output_${ruleId}`]: `result_${ruleId}` } };
        });

        const result = await executionEngine.executeMixedWithMetrics(groups, input, {
          stopOnError: false,
        });

        expect(executionOrder).toEqual(['rule1', 'rule2', 'rule3']); // Should continue after rule2 fails
        expect(result.results.size).toBe(2);
        expect(result.errors?.size).toBe(1);
        expect(result.groupResults).toHaveLength(3); // All groups executed
      });

      it('should respect custom timeout', async () => {
        // Add slow-rule to the mocked cache
        mockCacheManager.getAllMetadata.mockResolvedValue(
          new Map([
            ['rule1', { id: 'rule1', version: '1.0', tags: ['tag1'], lastModified: Date.now() }],
            ['rule2', { id: 'rule2', version: '1.0', tags: ['tag2'], lastModified: Date.now() }],
            ['rule3', { id: 'rule3', version: '1.0', tags: ['tag3'], lastModified: Date.now() }],
            ['rule4', { id: 'rule4', version: '1.0', tags: ['tag4'], lastModified: Date.now() }],
            ['rule5', { id: 'rule5', version: '1.0', tags: ['tag5'], lastModified: Date.now() }],
            [
              'slow-rule',
              { id: 'slow-rule', version: '1.0', tags: ['slow'], lastModified: Date.now() },
            ],
          ]),
        );

        const groups = [{ rules: ['slow-rule'], mode: 'sequential' as const }];
        const input = { value: 42 };

        // Mock a slow execution
        mockZenEngine.evaluate.mockImplementation(
          () => new Promise((resolve) => setTimeout(() => resolve({ result: {} }), 200)),
        );

        const result = await executionEngine.executeMixedWithMetrics(groups, input, {
          ruleTimeout: 50, // Very short timeout
          stopOnError: false,
        });

        expect(result.errors?.size).toBe(1);
        expect(result.errors?.get('slow-rule')?.message).toContain(
          'Execution timed out after 50ms',
        );
        expect(result.results.size).toBe(0);
      }, 1000);

      it('should provide detailed performance metrics', async () => {
        const groups = [
          { rules: ['rule1', 'rule2'], mode: 'parallel' as const },
          { rules: ['rule3'], mode: 'sequential' as const },
        ];
        const input = { value: 42 };

        mockZenEngine.evaluate.mockImplementation(async (ruleId: string) => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return { result: { [`output_${ruleId}`]: `result_${ruleId}` } };
        });

        const result = await executionEngine.executeMixedWithMetrics(groups, input, {
          includeMetrics: true,
        });

        expect(result.performanceMetrics).toBeDefined();
        expect(result.performanceAnalysis).toBeDefined();
        expect(result.performanceMetrics!.totalTime).toBeGreaterThan(0);
        expect(result.performanceAnalysis!.efficiency).toBeGreaterThan(0);
        expect(result.performanceAnalysis!.efficiency).toBeLessThanOrEqual(1);
      });

      it('should handle empty groups gracefully', async () => {
        await expect(executionEngine.executeMixedWithMetrics([], { value: 42 })).rejects.toThrow(
          'Execution groups cannot be empty',
        );
      });

      it('should handle complex mixed execution patterns', async () => {
        const groups = [
          { rules: ['rule1'], mode: 'sequential' as const }, // Single sequential
          { rules: ['rule2', 'rule3'], mode: 'parallel' as const }, // Parallel pair
          { rules: ['rule4'], mode: 'sequential' as const }, // Single sequential
          { rules: ['rule5'], mode: 'parallel' as const }, // Single parallel (should work like sequential)
        ];
        const input = { value: 42 };

        const executionOrder: string[] = [];
        const groupTimestamps: number[] = [];

        mockZenEngine.evaluate.mockImplementation(async (ruleId: string) => {
          executionOrder.push(ruleId);
          groupTimestamps.push(performance.now());
          await new Promise((resolve) => setTimeout(resolve, 5));
          return { result: { [`output_${ruleId}`]: `result_${ruleId}` } };
        });

        const result = await executionEngine.executeMixedWithMetrics(groups, input, {
          includeMetrics: true,
          pipelineMode: true,
        });

        expect(result.results.size).toBe(5);
        expect(result.groupResults).toHaveLength(4);

        // Verify execution order: rule1 first, then rule2&rule3 in parallel, then rule4, then rule5
        expect(executionOrder[0]).toBe('rule1');
        expect(executionOrder.slice(1, 3).sort()).toEqual(['rule2', 'rule3']);
        expect(executionOrder[3]).toBe('rule4');
        expect(executionOrder[4]).toBe('rule5');

        // Verify group execution modes
        expect(result.groupResults![0].mode).toBe('sequential');
        expect(result.groupResults![1].mode).toBe('parallel');
        expect(result.groupResults![2].mode).toBe('sequential');
        expect(result.groupResults![3].mode).toBe('parallel');
      });

      it('should store last execution metrics', async () => {
        const groups = [{ rules: ['rule1'], mode: 'sequential' as const }];
        const input = { value: 42 };

        mockZenEngine.evaluate.mockResolvedValue({ result: { output: 'result' } });

        await executionEngine.executeMixedWithMetrics(groups, input, {
          includeMetrics: true,
        });

        const lastMetrics = executionEngine.getLastExecutionMetrics();
        expect(lastMetrics).toBeDefined();
        expect(lastMetrics?.totalTime).toBeGreaterThan(0);
      });
    });

    describe('backward compatibility', () => {
      it('should work with basic execute method for mixed mode', async () => {
        const selector: RuleSelector = {
          ids: ['rule1', 'rule2'],
          mode: {
            type: 'mixed',
            groups: [
              { rules: ['rule1'], mode: 'sequential' },
              { rules: ['rule2'], mode: 'parallel' },
            ],
          },
        };
        const input = { value: 42 };

        const mockRulePlan = {
          ruleIds: ['rule1', 'rule2'],
          executionOrder: [['rule1'], ['rule2']],
          dependencies: new Map(),
        };

        mockTagManager.resolveRules.mockResolvedValue(mockRulePlan);
        mockZenEngine.evaluate
          .mockResolvedValueOnce({ result: { output1: 'result1' } })
          .mockResolvedValueOnce({ result: { output2: 'result2' } });

        const result = await executionEngine.execute(selector, input);

        expect(result.results.size).toBe(2);
        expect(result.results.get('rule1')).toEqual({ output1: 'result1' });
        expect(result.results.get('rule2')).toEqual({ output2: 'result2' });
      });

      it('should throw error for mixed mode without groups', async () => {
        const selector: RuleSelector = {
          ids: ['rule1'],
          mode: { type: 'mixed' }, // No groups specified
        };
        const input = { value: 42 };

        const mockRulePlan = {
          ruleIds: ['rule1'],
          executionOrder: [['rule1']],
          dependencies: new Map(),
        };

        mockTagManager.resolveRules.mockResolvedValue(mockRulePlan);

        await expect(executionEngine.execute(selector, input)).rejects.toThrow(
          'Mixed execution mode requires execution groups to be specified',
        );
      });
    });
  });
});
