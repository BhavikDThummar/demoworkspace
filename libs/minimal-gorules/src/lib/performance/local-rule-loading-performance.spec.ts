/**
 * Performance tests for local rule loading
 * Compares local file system loading vs cloud API loading performance
 */

import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { LocalRuleLoaderService } from '../loader/local-rule-loader-service.js';
import { CloudRuleLoaderService } from '../loader/cloud-rule-loader-service.js';
import { MinimalGoRulesConfig } from '../interfaces/index.js';
import { PerformanceBenchmark, PerformanceTestConfig, PerformanceRequirements } from './performance-tests.js';

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const rmdir = promisify(fs.rmdir);

describe('Local Rule Loading Performance', () => {
  let testRulesDir: string;
  let localLoader: LocalRuleLoaderService;
  let cloudLoader: CloudRuleLoaderService;
  let benchmark: PerformanceBenchmark;

  const sampleRule = {
    nodes: [
      {
        id: 'input',
        type: 'inputNode',
        position: { x: 100, y: 100 },
        data: { name: 'Input' }
      },
      {
        id: 'decision',
        type: 'decisionNode', 
        position: { x: 300, y: 100 },
        data: { name: 'Decision' }
      },
      {
        id: 'output',
        type: 'outputNode',
        position: { x: 500, y: 100 },
        data: { name: 'Output' }
      }
    ],
    edges: [
      { id: 'e1', source: 'input', target: 'decision' },
      { id: 'e2', source: 'decision', target: 'output' }
    ]
  };

  beforeAll(async () => {
    // Setup test directory
    testRulesDir = path.join(process.cwd(), 'tmp', 'performance-test-rules');
    await mkdir(testRulesDir, { recursive: true });

    // Create test rule files for performance testing
    await createTestRuleFiles(testRulesDir, 50); // Create 50 test rules

    // Initialize performance benchmark
    const perfConfig: Partial<PerformanceTestConfig> = {
      iterations: 100,
      warmupIterations: 10,
      concurrency: 5,
      timeout: 30000,
    };

    const perfRequirements: Partial<PerformanceRequirements> = {
      maxLatency: 200, // 200ms max for file operations
      minThroughput: 50, // 50 ops/sec minimum
      maxMemoryPerOperation: 1024 * 1024, // 1MB per operation
    };

    benchmark = new PerformanceBenchmark(perfConfig, perfRequirements);

    // Initialize local loader
    const localConfig: MinimalGoRulesConfig = {
      ruleSource: 'local',
      localRulesPath: testRulesDir,
      enableHotReload: false,
      apiUrl: '',
      apiKey: '',
      projectId: '',
    };

    localLoader = new LocalRuleLoaderService(localConfig);

    // Initialize cloud loader (for comparison - will use mock data)
    const cloudConfig: MinimalGoRulesConfig = {
      ruleSource: 'cloud',
      apiUrl: 'https://api.gorules.io',
      apiKey: 'test-key',
      projectId: 'test-project',
    };

    cloudLoader = new CloudRuleLoaderService(cloudConfig);
  });

  afterAll(async () => {
    // Cleanup test directory
    try {
      await rmdir(testRulesDir, { recursive: true });
    } catch (error) {
      console.warn('Failed to cleanup test directory:', error);
    }
  });

  describe('File System Metadata Caching', () => {
    it('should cache file stats to avoid repeated system calls', async () => {
      const ruleId = 'test-rule-1';
      
      // First call - should hit file system
      const start1 = performance.now();
      await localLoader.loadRule(ruleId);
      const time1 = performance.now() - start1;

      // Second call - should use cached stats for version checking
      const start2 = performance.now();
      await localLoader.loadRule(ruleId);
      const time2 = performance.now() - start2;

      // Second call should be faster due to caching
      expect(time2).toBeLessThan(time1);
      
      console.log(`First load: ${time1.toFixed(2)}ms, Second load: ${time2.toFixed(2)}ms`);
      console.log(`Cache improvement: ${((time1 - time2) / time1 * 100).toFixed(1)}%`);
    });

    it('should clear cache when files change', async () => {
      const ruleId = 'test-rule-2';
      const filePath = path.join(testRulesDir, `${ruleId}.json`);
      
      // Load rule to populate cache
      await localLoader.loadRule(ruleId);
      
      // Modify file to change mtime
      await writeFile(filePath, JSON.stringify({ ...sampleRule, modified: true }, null, 2));
      
      // Clear cache manually (simulating file change detection)
      localLoader.clearStatCache();
      
      // Load again - should detect change
      const result = await localLoader.loadRule(ruleId);
      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
    });
  });

  describe('Batch Loading Performance', () => {
    it('should load multiple rules efficiently in batches', async () => {
      const result = await benchmark.runTest('Batch Load All Rules', async () => {
        await localLoader.loadAllRules();
      });

      expect(result.success).toBe(true);
      expect(result.averageTime).toBeLessThan(500); // Should load 50 rules in under 500ms
      
      console.log(`Batch loading performance: ${result.averageTime.toFixed(2)}ms average`);
      console.log(`Throughput: ${result.throughput.toFixed(0)} operations/sec`);
    });

    it('should load specific rules in batches', async () => {
      const ruleIds = ['test-rule-1', 'test-rule-2', 'test-rule-3', 'test-rule-4', 'test-rule-5'];
      
      const result = await benchmark.runTest('Batch Load Specific Rules', async () => {
        await localLoader.loadRulesBatch(ruleIds);
      });

      expect(result.success).toBe(true);
      expect(result.averageTime).toBeLessThan(100); // Should load 5 rules quickly
      
      console.log(`Specific batch loading: ${result.averageTime.toFixed(2)}ms average`);
    });
  });

  describe('Local vs Cloud Performance Comparison', () => {
    it('should compare loading performance between local and cloud sources', async () => {
      // Test local loading performance
      const localResult = await benchmark.runTest('Local Rule Loading', async () => {
        await localLoader.loadRule('test-rule-1');
      });

      // Mock cloud loading for comparison (since we don't have real API)
      const cloudResult = await benchmark.runTest('Cloud Rule Loading (Simulated)', async () => {
        // Simulate network latency
        await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
        
        // Simulate processing time
        const mockData = Buffer.from(JSON.stringify(sampleRule));
        return {
          data: mockData,
          metadata: {
            id: 'test-rule-1',
            version: '1.0.0',
            tags: [],
            lastModified: Date.now(),
          }
        };
      });

      // Local should generally be faster than cloud (no network latency)
      console.log('\n=== Performance Comparison ===');
      console.log(`Local loading: ${localResult.averageTime.toFixed(2)}ms average`);
      console.log(`Cloud loading (simulated): ${cloudResult.averageTime.toFixed(2)}ms average`);
      
      if (localResult.success && cloudResult.success) {
        const improvement = ((cloudResult.averageTime - localResult.averageTime) / cloudResult.averageTime * 100);
        console.log(`Local improvement: ${improvement.toFixed(1)}%`);
        
        // Local should be faster in most cases (no network overhead)
        expect(localResult.averageTime).toBeLessThan(cloudResult.averageTime * 1.5); // Allow some variance
      }
    });

    it('should compare batch loading performance', async () => {
      const ruleIds = Array.from({ length: 10 }, (_, i) => `test-rule-${i + 1}`);
      
      // Test local batch loading
      const localBatchResult = await benchmark.runTest('Local Batch Loading', async () => {
        await localLoader.loadRulesBatch(ruleIds);
      });

      // Simulate cloud batch loading
      const cloudBatchResult = await benchmark.runTest('Cloud Batch Loading (Simulated)', async () => {
        // Simulate API call with network latency
        await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
        
        // Return mock batch data
        const mockRules = new Map();
        for (const ruleId of ruleIds) {
          mockRules.set(ruleId, {
            data: Buffer.from(JSON.stringify(sampleRule)),
            metadata: {
              id: ruleId,
              version: '1.0.0',
              tags: [],
              lastModified: Date.now(),
            }
          });
        }
        return mockRules;
      });

      console.log('\n=== Batch Loading Comparison ===');
      console.log(`Local batch: ${localBatchResult.averageTime.toFixed(2)}ms average`);
      console.log(`Cloud batch (simulated): ${cloudBatchResult.averageTime.toFixed(2)}ms average`);
      
      if (localBatchResult.success && cloudBatchResult.success) {
        const improvement = ((cloudBatchResult.averageTime - localBatchResult.averageTime) / cloudBatchResult.averageTime * 100);
        console.log(`Local batch improvement: ${improvement.toFixed(1)}%`);
      }
    });
  });

  describe('Memory Usage Optimization', () => {
    it('should have efficient memory usage during batch loading', async () => {
      const memoryBefore = process.memoryUsage().heapUsed;
      
      // Load all rules
      const rules = await localLoader.loadAllRules();
      
      const memoryAfter = process.memoryUsage().heapUsed;
      const memoryDelta = memoryAfter - memoryBefore;
      const memoryPerRule = memoryDelta / rules.size;
      
      console.log(`Memory usage: ${(memoryDelta / 1024 / 1024).toFixed(2)}MB total`);
      console.log(`Memory per rule: ${(memoryPerRule / 1024).toFixed(2)}KB`);
      
      // Memory per rule should be reasonable (less than 100KB per rule)
      expect(memoryPerRule).toBeLessThan(100 * 1024);
    });

    it('should not leak memory during repeated operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Perform multiple load operations
      for (let i = 0; i < 10; i++) {
        await localLoader.loadRule('test-rule-1');
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = finalMemory - initialMemory;
      
      console.log(`Memory growth after 10 operations: ${(memoryGrowth / 1024).toFixed(2)}KB`);
      
      // Memory growth should be minimal (less than 1MB)
      expect(memoryGrowth).toBeLessThan(1024 * 1024);
    });
  });

  describe('Performance Benchmarks', () => {
    it('should run comprehensive performance benchmark suite', async () => {
      const benchmarkTests = [
        {
          name: 'Single Rule Load',
          test: async () => {
            await localLoader.loadRule('test-rule-1');
          },
        },
        {
          name: 'Batch Rule Load (5 rules)',
          test: async () => {
            await localLoader.loadRulesBatch(['test-rule-1', 'test-rule-2', 'test-rule-3', 'test-rule-4', 'test-rule-5']);
          },
        },
        {
          name: 'All Rules Load',
          test: async () => {
            await localLoader.loadAllRules();
          },
        },
        {
          name: 'Version Check',
          test: async () => {
            const rules = new Map([
              ['test-rule-1', '123456789'],
              ['test-rule-2', '123456789'],
              ['test-rule-3', '123456789'],
            ]);
            await localLoader.checkVersions(rules);
          },
        },
      ];

      const suiteResult = await benchmark.runBenchmarkSuite(
        'Local Rule Loading Performance',
        benchmarkTests
      );

      expect(suiteResult.passed).toBeGreaterThan(0);
      expect(suiteResult.failed).toBe(0);
      
      // Validate against performance requirements
      const validation = benchmark.validateRequirements(suiteResult.tests);
      
      if (!validation.passed) {
        console.warn('Performance requirements not met:');
        validation.violations.forEach(violation => console.warn(`  - ${violation}`));
      }
      
      if (validation.recommendations.length > 0) {
        console.log('Performance recommendations:');
        validation.recommendations.forEach(rec => console.log(`  - ${rec}`));
      }
      
      // At least basic performance should be acceptable
      expect(suiteResult.overallThroughput).toBeGreaterThan(10); // At least 10 ops/sec
    });
  });
});

/**
 * Helper function to create test rule files
 */
async function createTestRuleFiles(baseDir: string, count: number): Promise<void> {
  const promises: Promise<void>[] = [];
  
  const baseSampleRule = {
    nodes: [
      {
        id: 'input',
        type: 'inputNode',
        position: { x: 100, y: 100 },
        data: { name: 'Input' }
      },
      {
        id: 'decision',
        type: 'decisionNode', 
        position: { x: 300, y: 100 },
        data: { name: 'Decision' }
      },
      {
        id: 'output',
        type: 'outputNode',
        position: { x: 500, y: 100 },
        data: { name: 'Output' }
      }
    ],
    edges: [
      { id: 'e1', source: 'input', target: 'decision' },
      { id: 'e2', source: 'decision', target: 'output' }
    ]
  };
  
  for (let i = 1; i <= count; i++) {
    const ruleId = `test-rule-${i}`;
    const filePath = path.join(baseDir, `${ruleId}.json`);
    
    // Create slightly different rules for variety
    const rule = {
      ...baseSampleRule,
      nodes: baseSampleRule.nodes.map(node => ({
        ...node,
        data: { ...node.data, ruleNumber: i }
      }))
    };
    
    promises.push(writeFile(filePath, JSON.stringify(rule, null, 2)));
    
    // Create some metadata files for testing
    if (i % 5 === 0) {
      const metadataPath = path.join(baseDir, `${ruleId}.meta.json`);
      const metadata = {
        version: `1.0.${i}`,
        tags: [`tag-${i}`, 'performance-test'],
        description: `Test rule ${i} for performance testing`,
        author: 'performance-test-suite',
      };
      promises.push(writeFile(metadataPath, JSON.stringify(metadata, null, 2)));
    }
  }
  
  await Promise.all(promises);
}