import { Injectable, Logger, LogLevel } from '@nestjs/common';
import { GoRulesConfig } from '../config/gorules-config.interface.js';

/**
 * Log entry interface for structured logging
 */
export interface GoRulesLogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context: string;
  metadata?: Record<string, any>;
  executionId?: string;
  ruleId?: string;
  duration?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

/**
 * Performance metrics for rule execution
 */
export interface ExecutionMetrics {
  ruleId: string;
  executionId: string;
  startTime: number;
  endTime: number;
  duration: number;
  success: boolean;
  inputSize?: number;
  outputSize?: number;
  retryCount?: number;
  error?: string;
}

/**
 * Enhanced logging service for GoRules operations
 * Provides structured logging, performance metrics, and execution tracing
 */
@Injectable()
export class GoRulesLoggerService {
  private readonly logger = new Logger(GoRulesLoggerService.name);
  private readonly config: GoRulesConfig;
  private readonly executionMetrics: Map<string, ExecutionMetrics> = new Map();
  private readonly logEntries: GoRulesLogEntry[] = [];
  private readonly maxLogEntries = 1000; // Keep last 1000 log entries in memory

  constructor(config: GoRulesConfig) {
    this.config = config;
    this.logger.log('GoRules Logger Service initialized', {
      enableLogging: config.enableLogging,
      logLevel: config.logLevel || 'info',
    });
  }

  /**
   * Log rule execution start
   */
  logExecutionStart(ruleId: string, executionId: string, input: any): void {
    if (!this.config.enableLogging) return;

    const startTime = Date.now();
    const metrics: ExecutionMetrics = {
      ruleId,
      executionId,
      startTime,
      endTime: 0,
      duration: 0,
      success: false,
      inputSize: this.calculateObjectSize(input),
    };

    this.executionMetrics.set(executionId, metrics);

    const logEntry: GoRulesLogEntry = {
      timestamp: new Date().toISOString(),
      level: 'log',
      message: `Rule execution started`,
      context: 'GoRulesExecution',
      metadata: {
        ruleId,
        executionId,
        inputSize: metrics.inputSize,
      },
      executionId,
      ruleId,
    };

    this.addLogEntry(logEntry);
    this.logger.log(logEntry.message, logEntry.metadata);
  }

  /**
   * Log rule execution success
   */
  logExecutionSuccess(executionId: string, output: any, retryCount?: number): void {
    if (!this.config.enableLogging) return;

    const metrics = this.executionMetrics.get(executionId);
    if (!metrics) return;

    const endTime = Date.now();
    const duration = endTime - metrics.startTime;

    metrics.endTime = endTime;
    metrics.duration = duration;
    metrics.success = true;
    metrics.outputSize = this.calculateObjectSize(output);
    metrics.retryCount = retryCount;

    const logEntry: GoRulesLogEntry = {
      timestamp: new Date().toISOString(),
      level: 'log',
      message: `Rule execution completed successfully`,
      context: 'GoRulesExecution',
      metadata: {
        ruleId: metrics.ruleId,
        executionId,
        duration,
        outputSize: metrics.outputSize,
        retryCount,
      },
      executionId,
      ruleId: metrics.ruleId,
      duration,
    };

    this.addLogEntry(logEntry);
    this.logger.log(logEntry.message, logEntry.metadata);
  }

  /**
   * Log rule execution error
   */
  logExecutionError(executionId: string, error: Error, retryCount?: number): void {
    if (!this.config.enableLogging) return;

    const metrics = this.executionMetrics.get(executionId);
    if (!metrics) return;

    const endTime = Date.now();
    const duration = endTime - metrics.startTime;

    metrics.endTime = endTime;
    metrics.duration = duration;
    metrics.success = false;
    metrics.retryCount = retryCount;
    metrics.error = error.message;

    const logEntry: GoRulesLogEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message: `Rule execution failed`,
      context: 'GoRulesExecution',
      metadata: {
        ruleId: metrics.ruleId,
        executionId,
        duration,
        retryCount,
      },
      executionId,
      ruleId: metrics.ruleId,
      duration,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    };

    this.addLogEntry(logEntry);
    this.logger.error(logEntry.message, error.stack, logEntry.metadata);
  }

  /**
   * Log retry attempt
   */
  logRetryAttempt(
    executionId: string,
    attemptNumber: number,
    error: Error,
    nextRetryDelay?: number,
  ): void {
    if (!this.config.enableLogging) return;

    const metrics = this.executionMetrics.get(executionId);
    if (!metrics) return;

    const logEntry: GoRulesLogEntry = {
      timestamp: new Date().toISOString(),
      level: 'warn',
      message: `Rule execution retry attempt`,
      context: 'GoRulesRetry',
      metadata: {
        ruleId: metrics.ruleId,
        executionId,
        attemptNumber,
        error: error.message,
        nextRetryDelay,
      },
      executionId,
      ruleId: metrics.ruleId,
    };

    this.addLogEntry(logEntry);
    this.logger.warn(logEntry.message, logEntry.metadata);
  }

  /**
   * Log circuit breaker state change
   */
  logCircuitBreakerStateChange(
    ruleId: string,
    oldState: string,
    newState: string,
    reason?: string,
  ): void {
    if (!this.config.enableLogging) return;

    const logEntry: GoRulesLogEntry = {
      timestamp: new Date().toISOString(),
      level: 'warn',
      message: `Circuit breaker state changed`,
      context: 'GoRulesCircuitBreaker',
      metadata: {
        ruleId,
        oldState,
        newState,
        reason,
      },
      ruleId,
    };

    this.addLogEntry(logEntry);
    this.logger.warn(logEntry.message, logEntry.metadata);
  }

  /**
   * Log configuration events
   */
  logConfigurationEvent(event: string, details: Record<string, any>): void {
    if (!this.config.enableLogging) return;

    const logEntry: GoRulesLogEntry = {
      timestamp: new Date().toISOString(),
      level: 'log',
      message: `Configuration event: ${event}`,
      context: 'GoRulesConfiguration',
      metadata: details,
    };

    this.addLogEntry(logEntry);
    this.logger.log(logEntry.message, logEntry.metadata);
  }

  /**
   * Log performance warning
   */
  logPerformanceWarning(
    ruleId: string,
    executionId: string,
    duration: number,
    threshold: number,
  ): void {
    if (!this.config.enableLogging) return;

    const logEntry: GoRulesLogEntry = {
      timestamp: new Date().toISOString(),
      level: 'warn',
      message: `Rule execution exceeded performance threshold`,
      context: 'GoRulesPerformance',
      metadata: {
        ruleId,
        executionId,
        duration,
        threshold,
        exceedBy: duration - threshold,
      },
      executionId,
      ruleId,
      duration,
    };

    this.addLogEntry(logEntry);
    this.logger.warn(logEntry.message, logEntry.metadata);
  }

  /**
   * Get execution metrics for a specific execution
   */
  getExecutionMetrics(executionId: string): ExecutionMetrics | undefined {
    return this.executionMetrics.get(executionId);
  }

  /**
   * Get all execution metrics
   */
  getAllExecutionMetrics(): ExecutionMetrics[] {
    return Array.from(this.executionMetrics.values());
  }

  /**
   * Get recent log entries
   */
  getRecentLogEntries(count: number = 100): GoRulesLogEntry[] {
    return this.logEntries.slice(-count);
  }

  /**
   * Get log entries by rule ID
   */
  getLogEntriesByRule(ruleId: string): GoRulesLogEntry[] {
    return this.logEntries.filter((entry) => entry.ruleId === ruleId);
  }

  /**
   * Get log entries by execution ID
   */
  getLogEntriesByExecution(executionId: string): GoRulesLogEntry[] {
    return this.logEntries.filter((entry) => entry.executionId === executionId);
  }

  /**
   * Clear old metrics and log entries
   */
  clearOldData(olderThanMs: number = 24 * 60 * 60 * 1000): void {
    const cutoffTime = Date.now() - olderThanMs;

    // Clear old metrics
    for (const [executionId, metrics] of this.executionMetrics.entries()) {
      if (metrics.startTime < cutoffTime) {
        this.executionMetrics.delete(executionId);
      }
    }

    // Clear old log entries
    const cutoffDate = new Date(cutoffTime).toISOString();
    const recentEntries = this.logEntries.filter((entry) => entry.timestamp > cutoffDate);

    this.logEntries.length = 0;
    this.logEntries.push(...recentEntries);

    if (this.config.enableLogging) {
      this.logger.log('Cleared old metrics and log entries', {
        cutoffTime: new Date(cutoffTime).toISOString(),
        remainingMetrics: this.executionMetrics.size,
        remainingLogEntries: this.logEntries.length,
      });
    }
  }

  /**
   * Get performance statistics
   */
  getPerformanceStatistics(): {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageExecutionTime: number;
    slowestExecution: number;
    fastestExecution: number;
    totalRetries: number;
  } {
    const metrics = Array.from(this.executionMetrics.values());

    if (metrics.length === 0) {
      return {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        averageExecutionTime: 0,
        slowestExecution: 0,
        fastestExecution: 0,
        totalRetries: 0,
      };
    }

    const successful = metrics.filter((m) => m.success);
    const failed = metrics.filter((m) => !m.success);
    const durations = metrics.map((m) => m.duration);
    const totalRetries = metrics.reduce((sum, m) => sum + (m.retryCount || 0), 0);

    return {
      totalExecutions: metrics.length,
      successfulExecutions: successful.length,
      failedExecutions: failed.length,
      averageExecutionTime: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      slowestExecution: Math.max(...durations),
      fastestExecution: Math.min(...durations),
      totalRetries,
    };
  }

  /**
   * Add log entry to in-memory storage
   */
  private addLogEntry(entry: GoRulesLogEntry): void {
    this.logEntries.push(entry);

    // Keep only the most recent entries
    if (this.logEntries.length > this.maxLogEntries) {
      this.logEntries.splice(0, this.logEntries.length - this.maxLogEntries);
    }
  }

  /**
   * Calculate approximate object size in bytes
   */
  private calculateObjectSize(obj: any): number {
    try {
      return JSON.stringify(obj).length;
    } catch {
      return 0;
    }
  }
}
