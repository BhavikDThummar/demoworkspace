/**
 * Load tests for concurrent rule execution scenarios
 * Tests engine performance under high load conditions
 */

import { MinimalGoRulesEngine } from '../minimal-gorules-engine.js';
import { MinimalGoRulesConfig } from '../interfaces/config.js';
import { PerformanceBenchmark } from '../performance/performance-tests.js';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('Concurrent Execution Load Tests', () => {
  let engine: MinimalGoRulesEngine;
  let benchmark: PerformanceBenchmark;

  const config: MinimalGoRulesConfig = {
    apiUrl: 'https://api.gorules.io',
    apiKey: 'test-api-key',
    projectId: 'load-test-project',
    cacheMaxSize: 1000,
    httpTimeout: 10000,
    batchSize: 50,
    enablePerformanceOptimizations: true,
    enablePerformanceMetrics: true,
  };

  beforeAll(() => {
    benchmark = new PerformanceBenchmark(
      {
        iterations: 100,
        warmupIterations: 10,
        concurrency: 20,
        timeout: 60000,
        sampleDataSize: 1024,
      },
      {
        maxLatency: 100, // 100ms
        minThroughput: 500, // 500 ops/sec
        maxMemoryPerOperation: 2 * 1024 * 1024, // 2MB
        maxMemoryGrowthRate: 1024, // 1KB per operation
      },
    );
  });

  beforeEach(async () => {
    engine = new MinimalGoRulesEngine(config);
    mockFetch.mockClear();

    // Mock initialization with multiple test rules
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          rules: Array.from({ length: 50 }, (_, i) => ({
            id: `load-rule-${i + 1}`,
            name: `Load Test Rule ${i + 1}`,
            version: '1.0.0',
            tags: [`group-${i % 5}`, 'load-test'],
            lastModified: new Date().toISOString(),
            content: Buffer.from(
              JSON.stringify({
                conditions: [
                  { field: 'value', operator: 'gte', value: i },
                  { field: 'category', operator: 'eq', value: `cat-${i % 3}` },
                ],
                actions: [
                  { type: 'set', field: 'result', value: i * 10 },
                  { type: 'set', field: 'processed', value: true },
                ],
              }),
            ).toString('base64'),
          })),
        }),
    });

    await engine.initialize();

    // Mock ZenEngine for consistent test results
    const mockZenEngine = {
      evaluate: jest.fn().mockImplementation((ruleId, input) => {
        const ruleIndex = parseInt(ruleId.split('-')[2]) - 1;
        return Promise.resolve({
          result: {
            result: ruleIndex * 10,
            processed: true,
            ruleId,
          },
          performance: `${Math.random() * 10 + 5}ms`,
        });
      }),
    };

    (engine as any).executionEngine.zenEngine = mockZenEngine;
  });

  afterEach(async () => {
    await engine.cleanup();
  });

  describe('High Concurrency Single Rule Execution', () => {
    it('should handle 100 concurrent single rule executions', async () => {
      const result = await benchmark.runThroughputTest('concurrent-single-rules', async () => {
        const ruleId = `load-rule-${Math.floor(Math.random() * 50) + 1}`;
        const input = {
          value: Math.floor(Math.random() * 100),
          category: `cat-${Math.floor(Math.random() * 3)}`,
        };

        await engine.executeRule(ruleId, input);
      });

      expect(result.success).toBe(true);
      expect(result.throughput).toBeGreaterThan(100); // At least 100 ops/sec
      expect(result.averageTime).toBeLessThan(50); // Less than 50ms average
    });

    it('should maintain performance under sustained load', async () => {
      const results = [];

      // Run multiple benchmark cycles
      for (let cycle = 0; cycle < 3; cycle++) {
        const result = await benchmark.runTest(`sustained-load-cycle-${cycle}`, async () => {
          const promises = Array.from({ length: 10 }, () => {
            const ruleId = `load-rule-${Math.floor(Math.random() * 50) + 1}`;
            const input = { value: Math.random() * 100 };
            return engine.executeRule(ruleId, input);
          });

          await Promise.all(promises);
        });

        results.push(result);
      }

      // Performance should not degrade significantly across cycles
      const throughputs = results.map((r) => r.throughput);
      const avgThroughput = throughputs.reduce((sum, t) => sum + t, 0) / throughputs.length;

      expect(avgThroughput).toBeGreaterThan(50);

      // Variance should be reasonable (within 50% of average)
      throughputs.forEach((throughput) => {
        expect(throughput).toBeGreaterThan(avgThroughput * 0.5);
        expect(throughput).toBeLessThan(avgThroughput * 1.5);
      });
    });
  });

  describe('Parallel Rule Execution Load', () => {
    it('should handle concurrent parallel rule executions', async () => {
      const result = await benchmark.runThroughputTest('concurrent-parallel-rules', async () => {
        const ruleIds = Array.from({ length: 5 }, (_, i) => `load-rule-${i + 1}`);
        const input = {
          value: Math.floor(Math.random() * 100),
          category: `cat-${Math.floor(Math.random() * 3)}`,
        };

        await engine.executeRules(ruleIds, input);
      });

      expect(result.success).toBe(true);
      expect(result.throughput).toBeGreaterThan(20); // At least 20 batch ops/sec
      expect(result.averageTime).toBeLessThan(200); // Less than 200ms for 5 rules
    });

    it('should scale with different batch sizes', async () => {
      const batchSizes = [1, 5, 10, 20];
      const results = [];

      for (const batchSize of batchSizes) {
        const result = await benchmark.runTest(`batch-size-${batchSize}`, async () => {
          const ruleIds = Array.from({ length: batchSize }, (_, i) => `load-rule-${(i % 50) + 1}`);
          const input = { value: Math.random() * 100 };

          await engine.executeRules(ruleIds, input);
        });

        results.push({ batchSize, ...result });
      }

      // Larger batches should have higher total throughput but higher latency
      for (let i = 1; i < results.length; i++) {
        const prev = results[i - 1];
        const curr = results[i];

        // Total rule throughput should increase
        const prevRuleThroughput = prev.throughput * prev.batchSize;
        const currRuleThroughput = curr.throughput * curr.batchSize;
        expect(currRuleThroughput).toBeGreaterThan(prevRuleThroughput * 0.8);
      }
    });
  });

  describe('Tag-based Execution Load', () => {
    it('should handle concurrent tag-based executions', async () => {
      const result = await benchmark.runThroughputTest('concurrent-tag-execution', async () => {
        const tag = `group-${Math.floor(Math.random() * 5)}`;
        const input = {
          value: Math.floor(Math.random() * 100),
          category: `cat-${Math.floor(Math.random() * 3)}`,
        };

        await engine.executeByTags([tag], input);
      });

      expect(result.success).toBe(true);
      expect(result.throughput).toBeGreaterThan(10); // At least 10 tag-based ops/sec
    });

    it('should handle mixed tag and ID executions', async () => {
      const result = await benchmark.runThroughputTest('mixed-execution-types', async () => {
        const executionType = Math.random();

        if (executionType < 0.33) {
          // Single rule execution
          const ruleId = `load-rule-${Math.floor(Math.random() * 50) + 1}`;
          await engine.executeRule(ruleId, { value: Math.random() * 100 });
        } else if (executionType < 0.66) {
          // Multiple rules execution
          const ruleIds = Array.from({ length: 3 }, (_, i) => `load-rule-${i + 1}`);
          await engine.executeRules(ruleIds, { value: Math.random() * 100 });
        } else {
          // Tag-based execution
          const tag = `group-${Math.floor(Math.random() * 5)}`;
          await engine.executeByTags([tag], { value: Math.random() * 100 });
        }
      });

      expect(result.success).toBe(true);
      expect(result.throughput).toBeGreaterThan(30); // Mixed operations
    });
  });

  describe('Memory Usage Under Load', () => {
    it('should not leak memory during sustained execution', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Perform many operations
      for (let batch = 0; batch < 10; batch++) {
        const promises = Array.from({ length: 20 }, () => {
          const ruleId = `load-rule-${Math.floor(Math.random() * 50) + 1}`;
          return engine.executeRule(ruleId, { value: Math.random() * 100 });
        });

        await Promise.all(promises);

        // Force garbage collection periodically
        if (global.gc && batch % 3 === 0) {
          global.gc();
        }
      }

      // Final garbage collection
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = finalMemory - initialMemory;

      // Memory growth should be reasonable (less than 10MB for 200 operations)
      expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024);
    });

    it('should handle memory pressure gracefully', async () => {
      // Create memory pressure by allocating large objects
      const largeObjects: Buffer[] = [];

      try {
        // Allocate memory while executing rules
        for (let i = 0; i < 5; i++) {
          largeObjects.push(Buffer.alloc(10 * 1024 * 1024)); // 10MB each

          // Execute some rules under memory pressure
          const promises = Array.from({ length: 5 }, () => {
            const ruleId = `load-rule-${Math.floor(Math.random() * 50) + 1}`;
            return engine.executeRule(ruleId, { value: Math.random() * 100 });
          });

          await Promise.all(promises);
        }

        // Should still be able to execute rules
        const result = await engine.executeRule('load-rule-1', { value: 50 });
        expect(result).toBeDefined();
      } finally {
        // Clean up large objects
        largeObjects.length = 0;
        if (global.gc) {
          global.gc();
        }
      }
    });
  });

  describe('Cache Performance Under Load', () => {
    it('should maintain cache hit rates under concurrent access', async () => {
      // Warm up cache
      for (let i = 1; i <= 10; i++) {
        await engine.executeRule(`load-rule-${i}`, { value: i });
      }

      const result = await benchmark.runThroughputTest('cache-hit-performance', async () => {
        // Execute rules that should be in cache
        const ruleId = `load-rule-${Math.floor(Math.random() * 10) + 1}`;
        await engine.executeRule(ruleId, { value: Math.random() * 100 });
      });

      expect(result.success).toBe(true);
      expect(result.throughput).toBeGreaterThan(200); // Should be fast with cache hits
      expect(result.averageTime).toBeLessThan(20); // Very fast with cache
    });

    it('should handle cache misses efficiently', async () => {
      const result = await benchmark.runThroughputTest('cache-miss-performance', async () => {
        // Execute rules that may not be in cache
        const ruleId = `load-rule-${Math.floor(Math.random() * 50) + 1}`;
        await engine.executeRule(ruleId, { value: Math.random() * 100 });
      });

      expect(result.success).toBe(true);
      expect(result.throughput).toBeGreaterThan(50); // Should handle cache misses
    });
  });

  describe('Error Handling Under Load', () => {
    it('should handle partial failures in concurrent executions', async () => {
      // Mock some rules to fail
      const originalEvaluate = (engine as any).executionEngine.zenEngine.evaluate;
      (engine as any).executionEngine.zenEngine.evaluate = jest
        .fn()
        .mockImplementation((ruleId, input) => {
          // Make every 5th rule fail
          const ruleIndex = parseInt(ruleId.split('-')[2]);
          if (ruleIndex % 5 === 0) {
            return Promise.reject(new Error(`Rule ${ruleId} failed`));
          }
          return originalEvaluate(ruleId, input);
        });

      const result = await benchmark.runTest('partial-failure-handling', async () => {
        const promises = Array.from({ length: 10 }, (_, i) => {
          const ruleId = `load-rule-${i + 1}`;
          return engine.executeRule(ruleId, { value: i }).catch(() => null);
        });

        await Promise.all(promises);
      });

      expect(result.success).toBe(true);
      // Should still maintain reasonable performance despite failures
      expect(result.averageTime).toBeLessThan(100);
    });

    it('should recover from temporary failures', async () => {
      let failureCount = 0;
      const maxFailures = 10;

      // Mock temporary failures
      const originalEvaluate = (engine as any).executionEngine.zenEngine.evaluate;
      (engine as any).executionEngine.zenEngine.evaluate = jest
        .fn()
        .mockImplementation((ruleId, input) => {
          if (failureCount < maxFailures) {
            failureCount++;
            return Promise.reject(new Error('Temporary failure'));
          }
          return originalEvaluate(ruleId, input);
        });

      const results = [];

      // Execute rules, some will fail initially
      for (let i = 0; i < 20; i++) {
        try {
          const result = await engine.executeRule('load-rule-1', { value: i });
          results.push(result);
        } catch {
          // Expected failures
        }
      }

      // Should have some successful executions after failures stop
      expect(results.length).toBeGreaterThan(5);
    });
  });

  describe('Performance Benchmarks', () => {
    it('should meet performance requirements under load', async () => {
      const suiteResult = await benchmark.runBenchmarkSuite('Load Test Suite', [
        {
          name: 'Single Rule Execution',
          test: async () => {
            await engine.executeRule('load-rule-1', { value: Math.random() * 100 });
          },
          type: 'throughput',
        },
        {
          name: 'Parallel Rule Execution',
          test: async () => {
            await engine.executeRules(['load-rule-1', 'load-rule-2', 'load-rule-3'], {
              value: Math.random() * 100,
            });
          },
          type: 'latency',
        },
        {
          name: 'Tag-based Execution',
          test: async () => {
            await engine.executeByTags(['group-0'], { value: Math.random() * 100 });
          },
          type: 'latency',
        },
        {
          name: 'Cache Access',
          test: async () => {
            await engine.getRuleMetadata('load-rule-1');
          },
          type: 'throughput',
        },
      ]);

      expect(suiteResult.passed).toBe(suiteResult.tests.length);
      expect(suiteResult.failed).toBe(0);
      expect(suiteResult.overallThroughput).toBeGreaterThan(100);

      // Validate against performance requirements
      const validation = benchmark.validateRequirements(suiteResult.tests);
      expect(validation.passed).toBe(true);
      expect(validation.violations).toHaveLength(0);
    });

    it('should provide performance recommendations', async () => {
      const testResults = [
        await benchmark.runTest('baseline-performance', async () => {
          await engine.executeRule('load-rule-1', { value: 50 });
        }),
      ];

      const validation = benchmark.validateRequirements(testResults);

      // Should provide recommendations if performance is suboptimal
      expect(validation.recommendations).toBeDefined();
      expect(Array.isArray(validation.recommendations)).toBe(true);
    });
  });
});
