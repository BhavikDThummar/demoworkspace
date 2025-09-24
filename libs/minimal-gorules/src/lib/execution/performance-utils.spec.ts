/**
 * Unit tests for Performance Utils
 */

import {
  PerformanceTimer,
  MemoryTracker,
  ExecutionMetricsCollector,
  PerformanceAnalyzer,
  ExecutionMetrics,
} from './performance-utils.js';

describe('PerformanceTimer', () => {
  let timer: PerformanceTimer;

  beforeEach(() => {
    timer = new PerformanceTimer();
  });

  it('should measure elapsed time', async () => {
    await new Promise((resolve) => setTimeout(resolve, 10));
    const elapsed = timer.elapsed();
    expect(elapsed).toBeGreaterThan(5);
    expect(elapsed).toBeLessThan(50);
  });

  it('should create and retrieve marks', () => {
    timer.mark('test-mark');
    const marks = timer.getAllMarks();
    expect(marks.has('test-mark')).toBe(true);
    expect(marks.get('test-mark')).toBeGreaterThan(0);
  });

  it('should calculate duration between marks', async () => {
    timer.mark('start');
    await new Promise((resolve) => setTimeout(resolve, 10));
    timer.mark('end');

    const duration = timer.duration('start', 'end');
    expect(duration).toBeGreaterThan(5);
    expect(duration).toBeLessThan(50);
  });

  it('should throw error for non-existent marks', () => {
    timer.mark('start');
    expect(() => timer.duration('start', 'nonexistent')).toThrow('Mark not found: nonexistent');
  });

  it('should stop and return total time', async () => {
    await new Promise((resolve) => setTimeout(resolve, 10));
    const totalTime = timer.stop();
    expect(totalTime).toBeGreaterThan(5);
    expect(totalTime).toBeLessThan(50);
  });

  it('should reset timer', async () => {
    timer.mark('test');
    await new Promise((resolve) => setTimeout(resolve, 10));

    timer.reset();
    const elapsed = timer.elapsed();
    expect(elapsed).toBeLessThan(5);
    expect(timer.getAllMarks().size).toBe(0);
  });
});

describe('MemoryTracker', () => {
  let tracker: MemoryTracker;

  beforeEach(() => {
    tracker = new MemoryTracker();
  });

  it('should track memory usage in Node.js environment', () => {
    // Mock process.memoryUsage for testing
    const originalMemoryUsage = process.memoryUsage;
    const mockMemoryUsage = jest
      .fn()
      .mockReturnValueOnce({
        heapUsed: 1000000,
        heapTotal: 2000000,
        external: 0,
        arrayBuffers: 0,
        rss: 0,
      })
      .mockReturnValueOnce({
        heapUsed: 1500000,
        heapTotal: 2000000,
        external: 0,
        arrayBuffers: 0,
        rss: 0,
      });

    process.memoryUsage = mockMemoryUsage;

    tracker.start();
    const delta = tracker.getDelta();

    expect(delta).toEqual({
      heapUsedBefore: 1000000,
      heapUsedAfter: 1500000,
      heapDelta: 500000,
    });

    process.memoryUsage = originalMemoryUsage;
  });

  it('should return undefined in browser environment', () => {
    // Mock browser environment
    const originalProcess = global.process;
    delete (global as any).process;

    tracker.start();
    const delta = tracker.getDelta();

    expect(delta).toBeUndefined();

    global.process = originalProcess;
  });
});

describe('ExecutionMetricsCollector', () => {
  let collector: ExecutionMetricsCollector;

  beforeEach(() => {
    collector = new ExecutionMetricsCollector();
  });

  it('should collect rule timing metrics', async () => {
    collector.start();

    collector.startRule('rule1');
    await new Promise((resolve) => setTimeout(resolve, 10));
    collector.endRule('rule1');

    collector.startRule('rule2');
    await new Promise((resolve) => setTimeout(resolve, 5));
    collector.endRule('rule2');

    const metrics = collector.getMetrics();

    expect(metrics.ruleTimings.size).toBe(2);
    expect(metrics.ruleTimings.get('rule1')).toBeGreaterThan(5);
    expect(metrics.ruleTimings.get('rule2')).toBeGreaterThan(0);
    expect(metrics.totalTime).toBeGreaterThan(10);
  });

  it('should record batch metrics', () => {
    collector.start();

    collector.recordBatch(3, 100);
    collector.recordBatch(2, 50);

    const metrics = collector.getMetrics();

    expect(metrics.batchTimings).toEqual([100, 50]);
    expect(metrics.concurrencyStats.maxConcurrentRules).toBe(3);
    expect(metrics.concurrencyStats.totalBatches).toBe(2);
  });

  it('should handle missing rule marks gracefully', () => {
    collector.start();

    // End rule without starting it
    collector.endRule('nonexistent');

    const metrics = collector.getMetrics();
    expect(metrics.ruleTimings.size).toBe(0);
  });

  it('should calculate average batch size correctly', () => {
    collector.start();

    // Simulate rules and batches
    collector.startRule('rule1');
    collector.endRule('rule1');
    collector.startRule('rule2');
    collector.endRule('rule2');
    collector.startRule('rule3');
    collector.endRule('rule3');

    collector.recordBatch(2, 100);
    collector.recordBatch(1, 50);

    const metrics = collector.getMetrics();

    // 3 rules / 2 batches = 1.5 average batch size
    expect(metrics.concurrencyStats.averageBatchSize).toBe(1.5);
  });
});

describe('PerformanceAnalyzer', () => {
  describe('calculatePercentiles', () => {
    it('should calculate percentiles correctly', () => {
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const percentiles = PerformanceAnalyzer.calculatePercentiles(values, [50, 90, 95]);

      expect(percentiles.get(50)).toBe(5);
      expect(percentiles.get(90)).toBe(9);
      expect(percentiles.get(95)).toBe(10);
    });

    it('should handle empty array', () => {
      const percentiles = PerformanceAnalyzer.calculatePercentiles([]);
      expect(percentiles.size).toBe(0);
    });

    it('should handle single value', () => {
      const percentiles = PerformanceAnalyzer.calculatePercentiles([42]);
      expect(percentiles.get(50)).toBe(42);
      expect(percentiles.get(90)).toBe(42);
    });
  });

  describe('calculateStats', () => {
    it('should calculate basic statistics', () => {
      const values = [1, 2, 3, 4, 5];
      const stats = PerformanceAnalyzer.calculateStats(values);

      expect(stats.min).toBe(1);
      expect(stats.max).toBe(5);
      expect(stats.mean).toBe(3);
      expect(stats.median).toBe(3);
      expect(stats.stdDev).toBeCloseTo(1.41, 1);
    });

    it('should handle empty array', () => {
      const stats = PerformanceAnalyzer.calculateStats([]);
      expect(stats).toEqual({ min: 0, max: 0, mean: 0, median: 0, stdDev: 0 });
    });

    it('should handle single value', () => {
      const stats = PerformanceAnalyzer.calculateStats([42]);
      expect(stats).toEqual({ min: 42, max: 42, mean: 42, median: 42, stdDev: 0 });
    });
  });

  describe('analyzeMetrics', () => {
    it('should identify slow rules', () => {
      const metrics: ExecutionMetrics = {
        totalTime: 1000,
        ruleTimings: new Map([
          ['fast-rule', 10],
          ['normal-rule', 20],
          ['slow-rule', 500], // Should now be detected with 1.5 std dev threshold
        ]),
        batchTimings: [100, 200],
        concurrencyStats: {
          maxConcurrentRules: 2,
          averageBatchSize: 1.5,
          totalBatches: 2,
        },
      };

      const analysis = PerformanceAnalyzer.analyzeMetrics(metrics);

      expect(analysis.bottlenecks.some((b) => b.includes('slow-rule'))).toBe(true);
      expect(analysis.recommendations.some((r) => r.includes('optimizing slow rules'))).toBe(true);
    });

    it('should detect low batch utilization', () => {
      const metrics: ExecutionMetrics = {
        totalTime: 1000,
        ruleTimings: new Map([['rule1', 100]]),
        batchTimings: [100],
        concurrencyStats: {
          maxConcurrentRules: 10,
          averageBatchSize: 1, // Very low utilization
          totalBatches: 1,
        },
      };

      const analysis = PerformanceAnalyzer.analyzeMetrics(metrics);

      expect(analysis.bottlenecks.some((b) => b.includes('Low batch utilization'))).toBe(true);
      expect(analysis.recommendations.some((r) => r.includes('concurrency limits'))).toBe(true);
    });

    it('should detect high memory usage', () => {
      const metrics: ExecutionMetrics = {
        totalTime: 1000,
        ruleTimings: new Map([['rule1', 100]]),
        batchTimings: [100],
        concurrencyStats: {
          maxConcurrentRules: 1,
          averageBatchSize: 1,
          totalBatches: 1,
        },
        memoryStats: {
          heapUsedBefore: 10000000,
          heapUsedAfter: 70000000, // 60MB increase
          heapDelta: 60000000,
        },
      };

      const analysis = PerformanceAnalyzer.analyzeMetrics(metrics);

      expect(analysis.bottlenecks.some((b) => b.includes('High memory usage'))).toBe(true);
      expect(analysis.recommendations.some((r) => r.includes('memory optimization'))).toBe(true);
    });

    it('should calculate efficiency score', () => {
      const metrics: ExecutionMetrics = {
        totalTime: 1000,
        ruleTimings: new Map([
          ['rule1', 100],
          ['rule2', 100],
        ]),
        batchTimings: [200],
        concurrencyStats: {
          maxConcurrentRules: 2,
          averageBatchSize: 2, // Perfect utilization
          totalBatches: 1,
        },
      };

      const analysis = PerformanceAnalyzer.analyzeMetrics(metrics);

      expect(analysis.efficiency).toBe(1); // Perfect efficiency
    });
  });
});
