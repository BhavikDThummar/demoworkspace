import { Injectable } from '@nestjs/common';

/**
 * Metric data point interface
 */
export interface MetricDataPoint {
  timestamp: number;
  value: number;
  labels?: Record<string, string>;
}

/**
 * Aggregated metric statistics
 */
export interface MetricStatistics {
  count: number;
  sum: number;
  min: number;
  max: number;
  average: number;
  percentile95: number;
  percentile99: number;
}

/**
 * Rule execution metrics
 */
export interface RuleExecutionMetrics {
  ruleId: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  minExecutionTime: number;
  maxExecutionTime: number;
  totalRetries: number;
  lastExecutionTime?: number;
  errorRate: number;
}

/**
 * Circuit breaker metrics
 */
export interface CircuitBreakerMetrics {
  ruleId: string;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failures: number;
  successes: number;
  lastFailureTime?: number;
  lastSuccessTime?: number;
  nextAttemptTime?: number;
}

/**
 * System-wide metrics
 */
export interface SystemMetrics {
  totalRuleExecutions: number;
  activeExecutions: number;
  totalErrors: number;
  averageResponseTime: number;
  requestsPerSecond: number;
  memoryUsage?: {
    used: number;
    total: number;
    percentage: number;
  };
}

/**
 * Metrics collection and aggregation service for GoRules
 */
@Injectable()
export class GoRulesMetricsService {
  private readonly executionTimes: Map<string, MetricDataPoint[]> = new Map();
  private readonly executionCounts: Map<string, number> = new Map();
  private readonly errorCounts: Map<string, number> = new Map();
  private readonly retryTotals: Map<string, number> = new Map();
  private readonly circuitBreakerStates: Map<string, CircuitBreakerMetrics> = new Map();
  private readonly activeExecutions: Set<string> = new Set();

  private readonly maxDataPoints = 1000; // Keep last 1000 data points per metric
  private readonly metricsRetentionMs = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Record rule execution time
   */
  recordExecutionTime(ruleId: string, executionTime: number, success: boolean): void {
    const timestamp = Date.now();

    // Record execution time
    if (!this.executionTimes.has(ruleId)) {
      this.executionTimes.set(ruleId, []);
    }

    const dataPoints = this.executionTimes.get(ruleId)!;
    dataPoints.push({
      timestamp,
      value: executionTime,
      labels: { success: success.toString() },
    });

    // Keep only recent data points
    this.trimDataPoints(dataPoints);

    // Update execution counts
    const currentCount = this.executionCounts.get(ruleId) || 0;
    this.executionCounts.set(ruleId, currentCount + 1);

    // Update error counts
    if (!success) {
      const currentErrors = this.errorCounts.get(ruleId) || 0;
      this.errorCounts.set(ruleId, currentErrors + 1);
    }
  }

  /**
   * Record retry attempt
   */
  recordRetryAttempt(ruleId: string): void {
    const currentRetries = this.retryTotals.get(ruleId) || 0;
    this.retryTotals.set(ruleId, currentRetries + 1);
  }

  /**
   * Mark execution as started
   */
  markExecutionStart(executionId: string): void {
    this.activeExecutions.add(executionId);
  }

  /**
   * Mark execution as completed
   */
  markExecutionComplete(executionId: string): void {
    this.activeExecutions.delete(executionId);
  }

  /**
   * Update circuit breaker state
   */
  updateCircuitBreakerState(
    ruleId: string,
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN',
    isFailure?: boolean,
    nextAttemptTime?: number,
  ): void {
    let metrics = this.circuitBreakerStates.get(ruleId);

    if (!metrics) {
      metrics = {
        ruleId,
        state,
        failures: 0,
        successes: 0,
      };
      this.circuitBreakerStates.set(ruleId, metrics);
    }

    metrics.state = state;

    if (isFailure !== undefined) {
      const timestamp = Date.now();

      if (isFailure) {
        metrics.failures++;
        metrics.lastFailureTime = timestamp;
      } else {
        metrics.successes++;
        metrics.lastSuccessTime = timestamp;
      }
    }

    if (nextAttemptTime !== undefined) {
      metrics.nextAttemptTime = nextAttemptTime;
    }
  }

  /**
   * Get metrics for a specific rule
   */
  getRuleMetrics(ruleId: string): RuleExecutionMetrics {
    const executionTimes = this.executionTimes.get(ruleId) || [];
    const totalExecutions = this.executionCounts.get(ruleId) || 0;
    const totalErrors = this.errorCounts.get(ruleId) || 0;
    const totalRetries = this.retryTotals.get(ruleId) || 0;

    const successfulExecutions = totalExecutions - totalErrors;
    const errorRate = totalExecutions > 0 ? totalErrors / totalExecutions : 0;

    let averageExecutionTime = 0;
    let minExecutionTime = 0;
    let maxExecutionTime = 0;
    let lastExecutionTime: number | undefined;

    if (executionTimes.length > 0) {
      const times = executionTimes.map((dp) => dp.value);
      averageExecutionTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      minExecutionTime = Math.min(...times);
      maxExecutionTime = Math.max(...times);
      lastExecutionTime = executionTimes[executionTimes.length - 1].timestamp;
    }

    return {
      ruleId,
      totalExecutions,
      successfulExecutions,
      failedExecutions: totalErrors,
      averageExecutionTime,
      minExecutionTime,
      maxExecutionTime,
      totalRetries,
      lastExecutionTime,
      errorRate,
    };
  }

  /**
   * Get metrics for all rules
   */
  getAllRuleMetrics(): RuleExecutionMetrics[] {
    const allRuleIds = new Set([
      ...this.executionCounts.keys(),
      ...this.errorCounts.keys(),
      ...this.executionTimes.keys(),
    ]);

    return Array.from(allRuleIds).map((ruleId) => this.getRuleMetrics(ruleId));
  }

  /**
   * Get circuit breaker metrics
   */
  getCircuitBreakerMetrics(): Record<string, CircuitBreakerMetrics> {
    const result: Record<string, CircuitBreakerMetrics> = {};

    for (const [ruleId, metrics] of this.circuitBreakerStates.entries()) {
      result[ruleId] = { ...metrics };
    }

    return result;
  }

  /**
   * Get system-wide metrics
   */
  getSystemMetrics(): SystemMetrics {
    const allMetrics = this.getAllRuleMetrics();

    const totalRuleExecutions = allMetrics.reduce(
      (sum, metrics) => sum + metrics.totalExecutions,
      0,
    );

    const totalErrors = allMetrics.reduce((sum, metrics) => sum + metrics.failedExecutions, 0);

    const averageResponseTime =
      allMetrics.length > 0
        ? allMetrics.reduce((sum, metrics) => sum + metrics.averageExecutionTime, 0) /
          allMetrics.length
        : 0;

    // Calculate requests per second based on recent activity
    const now = Date.now();
    const oneSecondAgo = now - 1000;

    let recentRequests = 0;
    for (const dataPoints of this.executionTimes.values()) {
      recentRequests += dataPoints.filter((dp) => dp.timestamp > oneSecondAgo).length;
    }

    return {
      totalRuleExecutions,
      activeExecutions: this.activeExecutions.size,
      totalErrors,
      averageResponseTime,
      requestsPerSecond: recentRequests,
      memoryUsage: this.getMemoryUsage(),
    };
  }

  /**
   * Get execution time statistics for a rule
   */
  getExecutionTimeStatistics(ruleId: string): MetricStatistics | null {
    const dataPoints = this.executionTimes.get(ruleId);

    if (!dataPoints || dataPoints.length === 0) {
      return null;
    }

    const values = dataPoints.map((dp) => dp.value).sort((a, b) => a - b);
    const count = values.length;
    const sum = values.reduce((total, value) => total + value, 0);
    const min = values[0];
    const max = values[count - 1];
    const average = sum / count;

    // Calculate percentiles
    const p95Index = Math.floor(count * 0.95);
    const p99Index = Math.floor(count * 0.99);
    const percentile95 = values[p95Index] || max;
    const percentile99 = values[p99Index] || max;

    return {
      count,
      sum,
      min,
      max,
      average,
      percentile95,
      percentile99,
    };
  }

  /**
   * Reset metrics for a specific rule
   */
  resetRuleMetrics(ruleId: string): void {
    this.executionTimes.delete(ruleId);
    this.executionCounts.delete(ruleId);
    this.errorCounts.delete(ruleId);
    this.retryTotals.delete(ruleId);
    this.circuitBreakerStates.delete(ruleId);
  }

  /**
   * Reset all metrics
   */
  resetAllMetrics(): void {
    this.executionTimes.clear();
    this.executionCounts.clear();
    this.errorCounts.clear();
    this.retryTotals.clear();
    this.circuitBreakerStates.clear();
    this.activeExecutions.clear();
  }

  /**
   * Clean up old metrics data
   */
  cleanupOldMetrics(): void {
    const cutoffTime = Date.now() - this.metricsRetentionMs;

    for (const [ruleId, dataPoints] of this.executionTimes.entries()) {
      const recentDataPoints = dataPoints.filter((dp) => dp.timestamp > cutoffTime);

      if (recentDataPoints.length === 0) {
        this.executionTimes.delete(ruleId);
      } else {
        this.executionTimes.set(ruleId, recentDataPoints);
      }
    }
  }

  /**
   * Get memory usage information
   */
  private getMemoryUsage(): { used: number; total: number; percentage: number } | undefined {
    try {
      if (typeof process !== 'undefined' && process.memoryUsage) {
        const usage = process.memoryUsage();
        const used = usage.heapUsed;
        const total = usage.heapTotal;
        const percentage = (used / total) * 100;

        return { used, total, percentage };
      }
    } catch {
      // Memory usage not available
    }

    return undefined;
  }

  /**
   * Trim data points to keep within limits
   */
  private trimDataPoints(dataPoints: MetricDataPoint[]): void {
    if (dataPoints.length > this.maxDataPoints) {
      dataPoints.splice(0, dataPoints.length - this.maxDataPoints);
    }
  }
}
