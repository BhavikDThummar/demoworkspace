/**
 * Full system integration tests
 * Tests complete end-to-end functionality with all components
 */

import { MinimalGoRulesEngine } from '../minimal-gorules-engine.js';
import { MinimalGoRulesConfig } from '../interfaces/config.js';
import { MockRuleLoaderService, MockDataFactory, TestUtils } from '../testing/mock-services.js';
import { PerformanceBenchmark } from '../performance/performance-tests.js';

describe('Full System Integration Tests', () => {
  let engine: MinimalGoRulesEngine;
  let mockLoader: MockRuleLoaderService;
  let benchmark: PerformanceBenchmark;

  beforeAll(() => {
    benchmark = new PerformanceBenchmark(
      { iterations: 50, warmupIterations: 5, concurrency: 5, timeout: 30000 },
      {
        maxLatency: 100,
        minThroughput: 50,
        maxMemoryPerOperation: 1024 * 1024,
        maxMemoryGrowthRate: 1024,
      },
    );
  });

  beforeEach(async () => {
    // Create mock rules
    const mockRules = MockDataFactory.createMockRules(20, {
      tagGroups: ['validation', 'scoring', 'approval', 'risk'],
      complexityLevel: 'medium',
    });

    mockLoader = new MockRuleLoaderService(mockRules, {
      networkDelay: 10, // 10ms simulated network delay
      failureRate: 0.05, // 5% failure rate
    });

    const config = MockDataFactory.createMockConfig({
      enablePerformanceOptimizations: true,
      enablePerformanceMetrics: true,
    });

    engine = new MinimalGoRulesEngine(config);

    // Replace loader with mock
    (engine as any).loaderService = mockLoader;
  });

  afterEach(async () => {
    await engine.cleanup();
  });

  describe('End-to-End Rule Execution Flow', () => {
    it('should complete full initialization and execution cycle', async () => {
      // Initialize engine
      const initStatus = await engine.initialize();
      expect(initStatus.initialized).toBe(true);
      expect(initStatus.rulesLoaded).toBe(20);

      // Execute single rule
      const singleResult = await engine.executeRule(
        'mock-rule-1',
        MockDataFactory.createMockInput('valid'),
      );
      expect(singleResult).toBeDefined();

      // Execute multiple rules
      const multiResult = await engine.executeRules(
        ['mock-rule-1', 'mock-rule-2', 'mock-rule-3'],
        MockDataFactory.createMockInput('valid'),
      );
      expect(multiResult.results.size).toBe(3);

      // Execute by tags
      const tagResult = await engine.executeByTags(
        ['validation'],
        MockDataFactory.createMockInput('valid'),
      );
      expect(tagResult.results.size).toBeGreaterThan(0);

      // Check cache operations
      const metadata = await engine.getRuleMetadata('mock-rule-1');
      expect(metadata).toBeDefined();

      const allMetadata = await engine.getAllRuleMetadata();
      expect(allMetadata.size).toBe(20);

      // Check version management
      const versionCheck = await engine.checkVersions();
      expect(versionCheck.totalChecked).toBe(20);
    });

    it('should handle complex execution scenarios', async () => {
      await engine.initialize();

      // Complex scenario: mixed execution types with error handling
      const scenarios = [
        () => engine.executeRule('mock-rule-1', MockDataFactory.createMockInput('valid')),
        () =>
          engine.executeRules(
            ['mock-rule-2', 'mock-rule-3'],
            MockDataFactory.createMockInput('edge'),
          ),
        () => engine.executeByTags(['scoring'], MockDataFactory.createMockInput('random')),
        () =>
          engine.executeByTags(
            ['validation', 'approval'],
            MockDataFactory.createMockInput('valid'),
          ),
        () => engine.getRuleMetadata('mock-rule-5'),
        () => engine.validateRule('mock-rule-10'),
      ];

      const results = await Promise.allSettled(scenarios.map((scenario) => scenario()));

      // Most operations should succeed
      const successful = results.filter((r) => r.status === 'fulfilled').length;
      expect(successful).toBeGreaterThan(scenarios.length * 0.8); // At least 80% success
    });

    it('should maintain consistency across concurrent operations', async () => {
      await engine.initialize();

      // Perform many concurrent operations
      const operations = Array.from({ length: 50 }, (_, i) => {
        const operationType = i % 4;

        switch (operationType) {
          case 0:
            return engine.executeRule(
              `mock-rule-${(i % 20) + 1}`,
              MockDataFactory.createMockInput(),
            );
          case 1:
            return engine.executeRules(
              [`mock-rule-${(i % 20) + 1}`, `mock-rule-${((i + 1) % 20) + 1}`],
              MockDataFactory.createMockInput(),
            );
          case 2:
            return engine.executeByTags(['validation'], MockDataFactory.createMockInput());
          case 3:
            return engine.getRuleMetadata(`mock-rule-${(i % 20) + 1}`);
          default:
            return Promise.resolve(null);
        }
      });

      const results = await Promise.allSettled(operations);

      // Check that operations completed successfully
      const successful = results.filter((r) => r.status === 'fulfilled').length;
      expect(successful).toBeGreaterThan(40); // At least 80% success rate

      // Engine should still be in consistent state
      const status = await engine.getStatus();
      expect(status.initialized).toBe(true);
      expect(status.rulesLoaded).toBe(20);
    });
  });

  describe('Performance Under Load', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('should meet performance requirements under concurrent load', async () => {
      const suiteResult = await benchmark.runBenchmarkSuite('Full System Load Test', [
        {
          name: 'Single Rule Execution',
          test: async () => {
            const ruleId = `mock-rule-${TestUtils.randomNumber(1, 20)}`;
            await engine.executeRule(ruleId, MockDataFactory.createMockInput('random'));
          },
          type: 'throughput',
        },
        {
          name: 'Multi Rule Execution',
          test: async () => {
            const ruleIds = Array.from({ length: 3 }, (_, i) => `mock-rule-${i + 1}`);
            await engine.executeRules(ruleIds, MockDataFactory.createMockInput('random'));
          },
          type: 'latency',
        },
        {
          name: 'Tag-based Execution',
          test: async () => {
            const tags = ['validation', 'scoring'];
            await engine.executeByTags(tags, MockDataFactory.createMockInput('random'));
          },
          type: 'latency',
        },
        {
          name: 'Metadata Access',
          test: async () => {
            const ruleId = `mock-rule-${TestUtils.randomNumber(1, 20)}`;
            await engine.getRuleMetadata(ruleId);
          },
          type: 'throughput',
        },
      ]);

      expect(suiteResult.passed).toBe(suiteResult.tests.length);
      expect(suiteResult.overallThroughput).toBeGreaterThan(50);
      expect(suiteResult.memoryEfficiency).toBeGreaterThan(0.5);

      // Validate performance requirements
      const validation = benchmark.validateRequirements(suiteResult.tests);
      expect(validation.passed).toBe(true);
    });

    it('should scale linearly with rule count', async () => {
      const ruleCounts = [1, 5, 10, 20];
      const results = [];

      for (const count of ruleCounts) {
        const ruleIds = Array.from({ length: count }, (_, i) => `mock-rule-${i + 1}`);

        const result = await benchmark.runTest(`scale-test-${count}-rules`, async () => {
          await engine.executeRules(ruleIds, MockDataFactory.createMockInput('random'));
        });

        results.push({ count, ...result });
      }

      // Execution time should scale reasonably with rule count
      for (let i = 1; i < results.length; i++) {
        const prev = results[i - 1];
        const curr = results[i];

        // Time should not increase more than linearly
        const timeRatio = curr.averageTime / prev.averageTime;
        const countRatio = curr.count / prev.count;

        expect(timeRatio).toBeLessThan(countRatio * 1.5); // Allow 50% overhead
      }
    });
  });

  describe('Error Recovery and Resilience', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('should recover from temporary network failures', async () => {
      // Simulate network failures for cache refresh
      mockLoader.setNextOperationToFail();

      // First refresh should fail
      await expect(engine.refreshCache(['mock-rule-1'])).rejects.toThrow();

      // Second refresh should succeed
      const refreshResult = await engine.refreshCache(['mock-rule-1']);
      expect(refreshResult.refreshedRules).toContain('mock-rule-1');
    });

    it('should handle partial rule execution failures gracefully', async () => {
      // Mock some rules to fail during execution
      const originalExecuteRule = engine.executeRule.bind(engine);
      engine.executeRule = jest.fn().mockImplementation(async (ruleId, input) => {
        if (ruleId.includes('5') || ruleId.includes('10')) {
          throw new Error(`Mock failure for ${ruleId}`);
        }
        return originalExecuteRule(ruleId, input);
      });

      // Execute multiple rules, some will fail
      const ruleIds = ['mock-rule-1', 'mock-rule-5', 'mock-rule-2', 'mock-rule-10', 'mock-rule-3'];
      const result = await engine.executeRules(ruleIds, MockDataFactory.createMockInput('valid'));

      // Should have some successful results
      expect(result.results.size).toBeGreaterThan(0);
      expect(result.errors?.size).toBeGreaterThan(0);

      // Successful rules should have valid results
      for (const [ruleId, ruleResult] of result.results) {
        expect(ruleResult).toBeDefined();
        expect(ruleId).not.toContain('5');
        expect(ruleId).not.toContain('10');
      }
    });

    it('should maintain cache consistency during failures', async () => {
      // Get initial cache state
      const initialMetadata = await engine.getAllRuleMetadata();
      const initialSize = initialMetadata.size;

      // Simulate failures during cache operations
      mockLoader.setNextOperationToFail();

      try {
        await engine.refreshCache();
      } catch {
        // Expected to fail
      }

      // Cache should still be consistent
      const finalMetadata = await engine.getAllRuleMetadata();
      expect(finalMetadata.size).toBe(initialSize);

      // Should still be able to execute rules
      const result = await engine.executeRule(
        'mock-rule-1',
        MockDataFactory.createMockInput('valid'),
      );
      expect(result).toBeDefined();
    });
  });

  describe('Memory Management Integration', () => {
    it('should manage memory effectively during long-running operations', async () => {
      await engine.initialize();

      const initialMemory = process.memoryUsage().heapUsed;

      // Perform many operations to test memory management
      for (let batch = 0; batch < 20; batch++) {
        const operations = Array.from({ length: 10 }, () => {
          const ruleId = `mock-rule-${TestUtils.randomNumber(1, 20)}`;
          return engine.executeRule(ruleId, MockDataFactory.createMockInput('random'));
        });

        await Promise.all(operations);

        // Trigger cleanup periodically
        if (batch % 5 === 0) {
          const performanceReport = engine.getPerformanceReport();
          if (performanceReport.memoryUsage) {
            // Memory management is working
            expect(performanceReport.memoryUsage.current).toBeDefined();
          }
        }
      }

      // Final memory check
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = finalMemory - initialMemory;

      // Memory growth should be reasonable for 200 operations
      expect(memoryGrowth).toBeLessThan(20 * 1024 * 1024); // Less than 20MB growth
    });

    it('should handle memory pressure scenarios', async () => {
      await engine.initialize();

      // Create memory pressure
      const largeBuffers: Buffer[] = [];

      try {
        // Allocate large amounts of memory while executing rules
        for (let i = 0; i < 10; i++) {
          largeBuffers.push(Buffer.alloc(5 * 1024 * 1024)); // 5MB each

          // Execute rules under memory pressure
          const result = await engine.executeRule(
            'mock-rule-1',
            MockDataFactory.createMockInput('valid'),
          );
          expect(result).toBeDefined();
        }

        // Should still be able to perform operations
        const status = await engine.getStatus();
        expect(status.initialized).toBe(true);
      } finally {
        // Clean up large buffers
        largeBuffers.length = 0;
        if (global.gc) {
          global.gc();
        }
      }
    });
  });

  describe('Configuration and Environment Tests', () => {
    it('should work with minimal configuration', async () => {
      const minimalConfig = MockDataFactory.createMockConfig();
      const minimalEngine = new MinimalGoRulesEngine(minimalConfig);

      // Replace with mock loader
      (minimalEngine as any).loaderService = new MockRuleLoaderService([
        MockDataFactory.createMockRules(5)[0],
      ]);

      const status = await minimalEngine.initialize();
      expect(status.initialized).toBe(true);
      expect(status.rulesLoaded).toBe(1);

      await minimalEngine.cleanup();
    });

    it('should work with performance optimizations enabled', async () => {
      const optimizedConfig = MockDataFactory.createMockConfig({
        enablePerformanceOptimizations: true,
        enablePerformanceMetrics: true,
        enableConnectionPooling: true,
        enableRequestBatching: true,
        enableCompression: true,
      });

      const optimizedEngine = new MinimalGoRulesEngine(optimizedConfig);

      // Replace with mock loader
      (optimizedEngine as any).loaderService = new MockRuleLoaderService(
        MockDataFactory.createMockRules(10),
      );

      const status = await optimizedEngine.initialize();
      expect(status.initialized).toBe(true);
      expect(status.performance).toBeDefined();

      // Should provide performance metrics
      const performanceReport = optimizedEngine.getPerformanceReport();
      expect(performanceReport).toBeDefined();

      await optimizedEngine.cleanup();
    });

    it('should handle configuration updates', async () => {
      await engine.initialize();

      const originalConfig = engine.getConfig();
      expect(originalConfig.httpTimeout).toBe(5000);

      // Update configuration
      engine.updateConfig({
        httpTimeout: 10000,
        batchSize: 20,
      });

      const updatedConfig = engine.getConfig();
      expect(updatedConfig.httpTimeout).toBe(10000);
      expect(updatedConfig.batchSize).toBe(20);

      // Should still work after configuration update
      const result = await engine.executeRule(
        'mock-rule-1',
        MockDataFactory.createMockInput('valid'),
      );
      expect(result).toBeDefined();
    });
  });

  describe('Cross-Component Integration', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('should integrate cache, loader, and execution components seamlessly', async () => {
      // Test cache operations
      const cacheStats = engine.getCacheStats();
      expect(cacheStats.size).toBe(20);

      // Test rule loading and caching
      const metadata = await engine.getRuleMetadata('mock-rule-1');
      expect(metadata?.id).toBe('mock-rule-1');

      // Test execution with cached rules
      const result = await engine.executeRule(
        'mock-rule-1',
        MockDataFactory.createMockInput('valid'),
      );
      expect(result).toBeDefined();

      // Test tag manager integration
      const rulesByTags = await engine.getRulesByTags(['validation']);
      expect(rulesByTags.length).toBeGreaterThan(0);

      // Test version management
      mockLoader.updateMockRuleVersion('mock-rule-1', '2.0.0');
      const versionCheck = await engine.checkVersions();
      expect(versionCheck.outdatedRules).toContain('mock-rule-1');
    });

    it('should handle component failures gracefully', async () => {
      // Simulate cache failure
      const originalGetMetadata = engine.getRuleMetadata.bind(engine);
      engine.getRuleMetadata = jest.fn().mockRejectedValue(new Error('Cache failure'));

      // Should handle cache failure
      await expect(engine.getRuleMetadata('mock-rule-1')).rejects.toThrow();

      // Restore cache functionality
      engine.getRuleMetadata = originalGetMetadata;

      // Should work normally after restoration
      const metadata = await engine.getRuleMetadata('mock-rule-1');
      expect(metadata).toBeDefined();
    });
  });

  describe('Data Integrity and Consistency', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('should maintain data integrity across operations', async () => {
      // Get initial state
      const initialMetadata = await engine.getAllRuleMetadata();
      const initialRuleIds = Array.from(initialMetadata.keys()).sort();

      // Perform various operations
      await engine.executeRule('mock-rule-1', MockDataFactory.createMockInput('valid'));
      await engine.executeRules(
        ['mock-rule-2', 'mock-rule-3'],
        MockDataFactory.createMockInput('valid'),
      );
      await engine.executeByTags(['validation'], MockDataFactory.createMockInput('valid'));

      // Check that metadata is still consistent
      const finalMetadata = await engine.getAllRuleMetadata();
      const finalRuleIds = Array.from(finalMetadata.keys()).sort();

      expect(finalRuleIds).toEqual(initialRuleIds);

      // Individual metadata should be unchanged
      for (const ruleId of initialRuleIds) {
        const initial = initialMetadata.get(ruleId);
        const final = finalMetadata.get(ruleId);
        expect(final).toEqual(initial);
      }
    });

    it('should handle concurrent cache modifications safely', async () => {
      // Perform concurrent cache operations
      const operations = [
        engine.refreshCache(['mock-rule-1']),
        engine.getRuleMetadata('mock-rule-2'),
        engine.getAllRuleMetadata(),
        engine.getRulesByTags(['validation']),
        engine.validateRule('mock-rule-3'),
      ];

      const results = await Promise.allSettled(operations);

      // All operations should complete (successfully or with expected errors)
      expect(results.length).toBe(5);

      // Cache should still be in consistent state
      const finalMetadata = await engine.getAllRuleMetadata();
      expect(finalMetadata.size).toBeGreaterThan(0);
    });
  });

  describe('Long-Running Stability Tests', () => {
    it('should remain stable during extended operation', async () => {
      await engine.initialize();

      const operationCount = 100;
      const batchSize = 10;
      let successCount = 0;
      let errorCount = 0;

      // Run operations in batches over time
      for (let batch = 0; batch < operationCount / batchSize; batch++) {
        const batchOperations = Array.from({ length: batchSize }, () => {
          const ruleId = `mock-rule-${TestUtils.randomNumber(1, 20)}`;
          return engine
            .executeRule(ruleId, MockDataFactory.createMockInput('random'))
            .then(() => {
              successCount++;
            })
            .catch(() => {
              errorCount++;
            });
        });

        await Promise.all(batchOperations);

        // Small delay between batches
        await TestUtils.delay(10);

        // Check engine health periodically
        if (batch % 3 === 0) {
          const status = await engine.getStatus();
          expect(status.initialized).toBe(true);
        }
      }

      // Should have high success rate
      expect(successCount).toBeGreaterThan(operationCount * 0.9); // 90% success
      expect(errorCount).toBeLessThan(operationCount * 0.1); // 10% errors

      // Engine should still be healthy
      const finalStatus = await engine.getStatus();
      expect(finalStatus.initialized).toBe(true);
      expect(finalStatus.rulesLoaded).toBe(20);
    });

    it('should handle resource cleanup properly', async () => {
      await engine.initialize();

      // Perform operations
      for (let i = 0; i < 50; i++) {
        await engine.executeRule(
          `mock-rule-${(i % 20) + 1}`,
          MockDataFactory.createMockInput('random'),
        );
      }

      // Get performance stats before cleanup
      const beforeCleanup = engine.getPerformanceStats();
      expect(beforeCleanup.memoryUsage).toBeGreaterThan(0);

      // Perform cleanup
      await engine.cleanup();

      // Engine should be properly cleaned up
      const status = await engine.getStatus();
      expect(status.initialized).toBe(false);
      expect(status.rulesLoaded).toBe(0);
    });
  });
});
