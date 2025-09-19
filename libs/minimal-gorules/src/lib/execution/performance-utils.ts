/**
 * Performance measurement utilities for rule execution
 * High-precision timing and metrics collection
 */

/**
 * Performance metrics for rule execution
 */
export interface ExecutionMetrics {
  /** Total execution time in milliseconds */
  totalTime: number;
  /** Individual rule execution times */
  ruleTimings: Map<string, number>;
  /** Batch execution times for parallel processing */
  batchTimings: number[];
  /** Concurrency statistics */
  concurrencyStats: {
    maxConcurrentRules: number;
    averageBatchSize: number;
    totalBatches: number;
  };
  /** Memory usage statistics (if available) */
  memoryStats?: {
    heapUsedBefore: number;
    heapUsedAfter: number;
    heapDelta: number;
  };
}

/**
 * High-precision timer for performance measurement
 */
export class PerformanceTimer {
  private startTime: number;
  private endTime?: number;
  private marks: Map<string, number> = new Map();

  constructor() {
    this.startTime = performance.now();
  }

  /**
   * Mark a specific point in time with a label
   */
  mark(label: string): void {
    this.marks.set(label, performance.now());
  }

  /**
   * Get elapsed time since start or since a specific mark
   */
  elapsed(fromMark?: string): number {
    const now = performance.now();
    const startPoint = fromMark ? this.marks.get(fromMark) || this.startTime : this.startTime;
    return now - startPoint;
  }

  /**
   * Get time between two marks
   */
  duration(startMark: string, endMark: string): number {
    const start = this.marks.get(startMark);
    const end = this.marks.get(endMark);
    
    if (!start || !end) {
      throw new Error(`Mark not found: ${!start ? startMark : endMark}`);
    }
    
    return end - start;
  }

  /**
   * Stop the timer and return total elapsed time
   */
  stop(): number {
    this.endTime = performance.now();
    return this.endTime - this.startTime;
  }

  /**
   * Get all marks with their timestamps
   */
  getAllMarks(): Map<string, number> {
    return new Map(this.marks);
  }

  /**
   * Reset the timer
   */
  reset(): void {
    this.startTime = performance.now();
    this.endTime = undefined;
    this.marks.clear();
  }
}

/**
 * Memory usage tracker
 */
export class MemoryTracker {
  private initialMemory?: NodeJS.MemoryUsage;

  /**
   * Start tracking memory usage
   */
  start(): void {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      this.initialMemory = process.memoryUsage();
    }
  }

  /**
   * Get current memory delta since start
   */
  getDelta(): { heapUsedBefore: number; heapUsedAfter: number; heapDelta: number } | undefined {
    if (!this.initialMemory || typeof process === 'undefined' || !process.memoryUsage) {
      return undefined;
    }

    const currentMemory = process.memoryUsage();
    return {
      heapUsedBefore: this.initialMemory.heapUsed,
      heapUsedAfter: currentMemory.heapUsed,
      heapDelta: currentMemory.heapUsed - this.initialMemory.heapUsed
    };
  }
}

/**
 * Execution metrics collector for parallel rule execution
 */
export class ExecutionMetricsCollector {
  private timer: PerformanceTimer;
  private memoryTracker: MemoryTracker;
  private ruleTimings = new Map<string, number>();
  private batchTimings: number[] = [];
  private maxConcurrentRules = 0;
  private totalBatches = 0;

  constructor() {
    this.timer = new PerformanceTimer();
    this.memoryTracker = new MemoryTracker();
  }

  /**
   * Start collecting metrics
   */
  start(): void {
    this.timer.reset();
    this.memoryTracker.start();
    this.ruleTimings.clear();
    this.batchTimings = [];
    this.maxConcurrentRules = 0;
    this.totalBatches = 0;
  }

  /**
   * Record the start of a rule execution
   */
  startRule(ruleId: string): void {
    this.timer.mark(`rule_${ruleId}_start`);
  }

  /**
   * Record the end of a rule execution
   */
  endRule(ruleId: string): void {
    this.timer.mark(`rule_${ruleId}_end`);
    try {
      const duration = this.timer.duration(`rule_${ruleId}_start`, `rule_${ruleId}_end`);
      this.ruleTimings.set(ruleId, duration);
    } catch {
      // Mark not found, ignore
    }
  }

  /**
   * Record batch execution metrics
   */
  recordBatch(batchSize: number, batchDuration: number): void {
    this.batchTimings.push(batchDuration);
    this.maxConcurrentRules = Math.max(this.maxConcurrentRules, batchSize);
    this.totalBatches++;
  }

  /**
   * Record a successful rule execution
   */
  recordRuleSuccess(ruleId: string, duration: number): void {
    this.ruleTimings.set(ruleId, duration);
  }

  /**
   * Record a failed rule execution
   */
  recordRuleError(ruleId: string, error: Error): void {
    // For now, just record that the rule was attempted
    // Could be extended to track error types and frequencies
    this.ruleTimings.set(ruleId, 0);
  }

  /**
   * Get collected metrics
   */
  getMetrics(): ExecutionMetrics {
    const totalTime = this.timer.elapsed();
    const memoryStats = this.memoryTracker.getDelta();
    
    // Calculate average batch size based on total rules and batches

    return {
      totalTime,
      ruleTimings: new Map(this.ruleTimings),
      batchTimings: [...this.batchTimings],
      concurrencyStats: {
        maxConcurrentRules: this.maxConcurrentRules,
        averageBatchSize: this.ruleTimings.size / Math.max(this.totalBatches, 1),
        totalBatches: this.totalBatches
      },
      memoryStats
    };
  }
}

/**
 * Utility functions for performance analysis
 */
export class PerformanceAnalyzer {
  /**
   * Calculate percentiles for a set of timing values
   */
  static calculatePercentiles(values: number[], percentiles: number[] = [50, 90, 95, 99]): Map<number, number> {
    if (values.length === 0) {
      return new Map();
    }

    const sorted = [...values].sort((a, b) => a - b);
    const result = new Map<number, number>();

    for (const percentile of percentiles) {
      const index = Math.ceil((percentile / 100) * sorted.length) - 1;
      result.set(percentile, sorted[Math.max(0, index)]);
    }

    return result;
  }

  /**
   * Calculate basic statistics for timing values
   */
  static calculateStats(values: number[]): {
    min: number;
    max: number;
    mean: number;
    median: number;
    stdDev: number;
  } {
    if (values.length === 0) {
      return { min: 0, max: 0, mean: 0, median: 0, stdDev: 0 };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return { min, max, mean, median, stdDev };
  }

  /**
   * Analyze execution metrics and provide insights
   */
  static analyzeMetrics(metrics: ExecutionMetrics): {
    efficiency: number; // 0-1 score
    bottlenecks: string[];
    recommendations: string[];
  } {
    const ruleTimings = Array.from(metrics.ruleTimings.values());
    const stats = this.calculateStats(ruleTimings);
    
    const efficiency = metrics.concurrencyStats.maxConcurrentRules > 1 
      ? Math.min(1, metrics.concurrencyStats.averageBatchSize / metrics.concurrencyStats.maxConcurrentRules)
      : 1;

    const bottlenecks: string[] = [];
    const recommendations: string[] = [];

    // Identify slow rules (> 3x the median or > mean + 1 std dev, whichever is lower)
    const slowThreshold = Math.min(
      stats.median * 3,
      stats.mean + stats.stdDev
    );
    const slowRules = Array.from(metrics.ruleTimings.entries())
      .filter(([_, time]) => time > slowThreshold)
      .map(([ruleId]) => ruleId);

    if (slowRules.length > 0) {
      bottlenecks.push(`Slow rules detected: ${slowRules.join(', ')}`);
      recommendations.push('Consider optimizing slow rules or increasing timeout limits');
    }

    // Check batch efficiency
    if (metrics.concurrencyStats.averageBatchSize < metrics.concurrencyStats.maxConcurrentRules * 0.7) {
      bottlenecks.push('Low batch utilization');
      recommendations.push('Consider adjusting concurrency limits or rule grouping');
    }

    // Memory usage analysis
    if (metrics.memoryStats && metrics.memoryStats.heapDelta > 50 * 1024 * 1024) { // 50MB
      bottlenecks.push('High memory usage detected');
      recommendations.push('Consider implementing memory optimization or garbage collection tuning');
    }

    return { efficiency, bottlenecks, recommendations };
  }
}