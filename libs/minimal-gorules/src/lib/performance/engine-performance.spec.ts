/**
 * Performance tests for Minimal GoRules Engine
 * Validates latency and throughput requirements
 */

import { PerformanceBenchmark, PerformanceRequirements } from './performance-tests.js';
import { MemoryManager } from './memory-manager.js';
import { ConnectionPool } from './connection-pool.js';
import { RequestBatcher } from './request-batcher.js';
import { CompressionManager } from './compression.js';

describe('Minimal GoRules Engine Performance Tests', () => {
  let benchmark: PerformanceBenchmark;
  let memoryManager: MemoryManager;
  let compressionManager: CompressionManager;

  beforeAll(() => {
    // Define performance requirements
    const requirements: PerformanceRequirements = {
      maxLatency: 50, // 50ms max latency
      minThroughput: 1000, // 1000 ops/sec minimum
      maxMemoryPerOperation: 1024 * 1024, // 1MB per operation
      maxMemoryGrowthRate: 1024 // 1KB growth per operation
    };

    benchmark = new PerformanceBenchmark(
      {
        iterations: 1000,
        warmupIterations: 100,
        concurrency: 10,
        timeout: 30000,
        sampleDataSize: 1024
      },
      requirements
    );

    memoryManager = new MemoryManager();
    compressionManager = new CompressionManager();
  });

  afterAll(() => {
    memoryManager.stopMonitoring();
  });

  describe('Memory Management Performance', () => {
    it('should monitor memory usage efficiently', async () => {
      const result = await benchmark.runTest('memory-monitoring', async () => {
        const stats = memoryManager.getCurrentStats();
        const percentage = memoryManager.getMemoryUsagePercentage();
        const trend = memoryManager.getMemoryTrend();
        
        // Simulate some memory operations
        const data = Buffer.alloc(1024);
        data.fill(0);
      });

      expect(result.success).toBe(true);
      expect(result.averageTime).toBeLessThan(1); // Should be very fast
    });

    it('should perform cleanup efficiently', async () => {
      const result = await benchmark.runTest('memory-cleanup', async () => {
        await memoryManager.performCleanup();
      });

      expect(result.success).toBe(true);
      expect(result.averageTime).toBeLessThan(10); // Cleanup should be fast
    });

    it('should handle memory pressure gracefully', async () => {
      const result = await benchmark.runThroughputTest('memory-pressure', async () => {
        // Simulate memory pressure
        const largeBuffer = Buffer.alloc(10 * 1024); // 10KB
        largeBuffer.fill(Math.random() * 255);
        
        // Check memory stats
        const stats = memoryManager.getCurrentStats();
        expect(stats.heapUsed).toBeGreaterThan(0);
      });

      expect(result.success).toBe(true);
      expect(result.throughput).toBeGreaterThan(500); // Should handle at least 500 ops/sec
    });
  });

  describe('Connection Pool Performance', () => {
    let connectionPool: ConnectionPool;

    beforeEach(() => {
      connectionPool = new ConnectionPool(
        'http://localhost:3000',
        { 'User-Agent': 'test' },
        {
          maxConnections: 5,
          maxRequestsPerConnection: 10,
          connectionTimeout: 1000,
          requestTimeout: 2000
        }
      );
    });

    afterEach(async () => {
      await connectionPool.close();
    });

    it('should handle concurrent requests efficiently', async () => {
      // Mock fetch for testing
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map(),
        text: () => Promise.resolve('{"result": "success"}')
      } as any);

      const result = await benchmark.runThroughputTest('connection-pool-concurrent', async () => {
        await connectionPool.request({
          method: 'GET',
          path: '/test'
        });
      });

      global.fetch = originalFetch;

      expect(result.success).toBe(true);
      expect(result.throughput).toBeGreaterThan(100); // Should handle concurrent requests
    });

    it('should reuse connections effectively', async () => {
      // Mock fetch for testing
      const originalFetch = global.fetch;
      let callCount = 0;
      global.fetch = jest.fn().mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Map(),
          text: () => Promise.resolve('{"result": "success"}')
        });
      });

      const result = await benchmark.runTest('connection-reuse', async () => {
        await connectionPool.request({
          method: 'GET',
          path: '/test'
        });
      });

      global.fetch = originalFetch;

      expect(result.success).toBe(true);
      
      const stats = connectionPool.getStats();
      expect(stats.connectionReuses).toBeGreaterThan(0);
    });
  });

  describe('Request Batching Performance', () => {
    let batcher: RequestBatcher<string, string>;

    beforeEach(() => {
      batcher = new RequestBatcher<string, string>(
        async (requests) => {
          // Mock batch executor
          const results = new Map<string, string>();
          for (const [id, request] of requests) {
            results.set(id, `processed-${request}`);
          }
          return {
            results,
            errors: new Map(),
            batchSize: requests.size,
            executionTime: 10
          };
        },
        {
          maxBatchSize: 10,
          maxWaitTime: 50,
          maxConcurrentBatches: 2
        }
      );
    });

    it('should batch requests efficiently', async () => {
      const result = await benchmark.runThroughputTest('request-batching', async () => {
        const requestId = `req-${Math.random()}`;
        await batcher.addRequest(requestId, `data-${requestId}`);
      });

      expect(result.success).toBe(true);
      expect(result.throughput).toBeGreaterThan(500); // Should handle batching efficiently
      
      const stats = batcher.getStats();
      expect(stats.batchEfficiency).toBeGreaterThan(0.5); // At least 50% batch efficiency
    });

    it('should handle high concurrency batching', async () => {
      const result = await benchmark.runTest('batch-concurrency', async () => {
        const promises = [];
        for (let i = 0; i < 5; i++) {
          const requestId = `concurrent-${i}-${Math.random()}`;
          promises.push(batcher.addRequest(requestId, `data-${requestId}`));
        }
        await Promise.all(promises);
      });

      expect(result.success).toBe(true);
      expect(result.averageTime).toBeLessThan(100); // Should handle concurrency well
    });
  });

  describe('Compression Performance', () => {
    const testData = Buffer.from(JSON.stringify({
      rules: Array.from({ length: 100 }, (_, i) => ({
        id: `rule-${i}`,
        name: `Test Rule ${i}`,
        content: `{"conditions": [{"field": "age", "operator": "gt", "value": ${i}}], "actions": [{"type": "set", "field": "result", "value": "approved"}]}`
      }))
    }));

    it('should compress data efficiently', async () => {
      const result = await benchmark.runTest('compression', async () => {
        await compressionManager.compress(testData);
      });

      expect(result.success).toBe(true);
      expect(result.averageTime).toBeLessThan(10); // Compression should be fast
    });

    it('should decompress data efficiently', async () => {
      const compressed = await compressionManager.compress(testData);
      
      const result = await benchmark.runTest('decompression', async () => {
        await compressionManager.decompress(compressed.data, compressed.algorithm);
      });

      expect(result.success).toBe(true);
      expect(result.averageTime).toBeLessThan(5); // Decompression should be faster
    });

    it('should achieve good compression ratios', async () => {
      const result = await benchmark.runTest('compression-ratio', async () => {
        const compressed = await compressionManager.compress(testData);
        expect(compressed.compressionRatio).toBeLessThan(0.8); // At least 20% compression
      });

      expect(result.success).toBe(true);
    });

    it('should handle compression throughput', async () => {
      const result = await benchmark.runThroughputTest('compression-throughput', async () => {
        const smallData = Buffer.from('{"test": "data"}');
        await compressionManager.compress(smallData);
      });

      expect(result.success).toBe(true);
      expect(result.throughput).toBeGreaterThan(1000); // Should handle high throughput
    });
  });

  describe('Integrated Performance Tests', () => {
    it('should run complete benchmark suite', async () => {
      const suiteResult = await benchmark.runBenchmarkSuite('Minimal GoRules Engine', [
        {
          name: 'Memory Monitoring',
          test: async () => {
            memoryManager.getCurrentStats();
            memoryManager.getMemoryUsagePercentage();
          }
        },
        {
          name: 'Data Compression',
          test: async () => {
            const data = Buffer.from('{"test": "data"}');
            await compressionManager.compress(data);
          }
        },
        {
          name: 'Memory Cleanup',
          test: async () => {
            await memoryManager.performCleanup();
          },
          type: 'latency'
        },
        {
          name: 'Compression Throughput',
          test: async () => {
            const data = Buffer.from('{"test": "data"}');
            await compressionManager.compress(data);
          },
          type: 'throughput'
        }
      ]);

      expect(suiteResult.passed).toBeGreaterThan(0);
      expect(suiteResult.failed).toBe(0);
      expect(suiteResult.overallThroughput).toBeGreaterThan(100);
      expect(suiteResult.memoryEfficiency).toBeGreaterThan(0.5);
    });

    it('should validate performance requirements', async () => {
      const testResults = [
        await benchmark.runTest('fast-operation', async () => {
          // Simulate a fast operation
          const data = Buffer.from('test');
          data.toString();
        }),
        await benchmark.runThroughputTest('high-throughput', async () => {
          // Simulate high throughput operation
          Math.random();
        })
      ];

      const validation = benchmark.validateRequirements(testResults);
      
      expect(validation.passed).toBe(true);
      expect(validation.violations).toHaveLength(0);
    });
  });

  describe('Memory Leak Detection', () => {
    it('should not leak memory during repeated operations', async () => {
      const initialMemory = memoryManager.getCurrentStats().heapUsed;
      
      // Perform many operations
      for (let i = 0; i < 100; i++) {
        const data = Buffer.alloc(1024);
        await compressionManager.compress(data);
        
        // Force garbage collection periodically
        if (i % 10 === 0 && global.gc) {
          global.gc();
        }
      }

      // Force final garbage collection
      if (global.gc) {
        global.gc();
      }

      const finalMemory = memoryManager.getCurrentStats().heapUsed;
      const memoryGrowth = finalMemory - initialMemory;
      
      // Memory growth should be minimal (less than 1MB)
      expect(memoryGrowth).toBeLessThan(1024 * 1024);
    });
  });
});

// Helper function to create mock rule data
function createMockRuleData(size: number): Buffer {
  const rule = {
    id: `rule-${Math.random()}`,
    name: 'Test Rule',
    conditions: Array.from({ length: size / 100 }, (_, i) => ({
      field: `field${i}`,
      operator: 'eq',
      value: `value${i}`
    })),
    actions: [
      { type: 'set', field: 'result', value: 'approved' }
    ]
  };
  
  return Buffer.from(JSON.stringify(rule));
}

// Helper function to simulate network delay
function simulateNetworkDelay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}