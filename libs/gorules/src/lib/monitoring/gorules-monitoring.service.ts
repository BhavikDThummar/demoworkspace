import { Injectable, Logger } from '@nestjs/common';
import { GoRulesLoggerService } from '../logging/gorules-logger.service.js';
import {
  GoRulesMetricsService,
  SystemMetrics,
  RuleExecutionMetrics,
} from './gorules-metrics.service.js';
import { GoRulesConfig } from '../config/gorules-config.interface.js';

/**
 * Health check status
 */
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version?: string;
  checks: {
    database?: boolean;
    externalServices?: boolean;
    memory?: boolean;
    performance?: boolean;
  };
  metrics: SystemMetrics;
  issues?: string[];
}

/**
 * Performance alert configuration
 */
export interface PerformanceAlert {
  ruleId?: string;
  type: 'execution_time' | 'error_rate' | 'memory_usage' | 'circuit_breaker';
  threshold: number;
  enabled: boolean;
}

/**
 * Comprehensive monitoring service that orchestrates logging and metrics
 */
@Injectable()
export class GoRulesMonitoringService {
  private readonly logger = new Logger(GoRulesMonitoringService.name);
  private readonly startTime = Date.now();
  private readonly performanceAlerts: PerformanceAlert[] = [];
  private cleanupInterval?: NodeJS.Timeout;

  constructor(
    private readonly config: GoRulesConfig,
    private readonly loggerService: GoRulesLoggerService,
    private readonly metricsService: GoRulesMetricsService,
  ) {
    this.initializeDefaultAlerts();
    this.startCleanupScheduler();

    if (this.config.enableLogging) {
      this.logger.log('GoRules Monitoring Service initialized');
    }
  }

  /**
   * Start monitoring a rule execution
   */
  startExecution(ruleId: string, executionId: string, input: any): void {
    this.loggerService.logExecutionStart(ruleId, executionId, input);
    this.metricsService.markExecutionStart(executionId);
  }

  /**
   * Complete monitoring a successful rule execution
   */
  completeExecution(
    ruleId: string,
    executionId: string,
    output: any,
    executionTime: number,
    retryCount?: number,
  ): void {
    this.loggerService.logExecutionSuccess(executionId, output, retryCount);
    this.metricsService.markExecutionComplete(executionId);
    this.metricsService.recordExecutionTime(ruleId, executionTime, true);

    if (retryCount && retryCount > 0) {
      for (let i = 0; i < retryCount; i++) {
        this.metricsService.recordRetryAttempt(ruleId);
      }
    }

    // Check for performance alerts
    this.checkPerformanceAlerts(ruleId, executionTime);
  }

  /**
   * Complete monitoring a failed rule execution
   */
  failExecution(
    ruleId: string,
    executionId: string,
    error: Error,
    executionTime: number,
    retryCount?: number,
  ): void {
    this.loggerService.logExecutionError(executionId, error, retryCount);
    this.metricsService.markExecutionComplete(executionId);
    this.metricsService.recordExecutionTime(ruleId, executionTime, false);

    if (retryCount && retryCount > 0) {
      for (let i = 0; i < retryCount; i++) {
        this.metricsService.recordRetryAttempt(ruleId);
      }
    }
  }

  /**
   * Log a retry attempt
   */
  logRetryAttempt(
    ruleId: string,
    executionId: string,
    attemptNumber: number,
    error: Error,
    nextRetryDelay?: number,
  ): void {
    this.loggerService.logRetryAttempt(executionId, attemptNumber, error, nextRetryDelay);
    this.metricsService.recordRetryAttempt(ruleId);
  }

  /**
   * Update circuit breaker state
   */
  updateCircuitBreakerState(
    ruleId: string,
    oldState: string,
    newState: 'CLOSED' | 'OPEN' | 'HALF_OPEN',
    reason?: string,
    isFailure?: boolean,
    nextAttemptTime?: number,
  ): void {
    this.loggerService.logCircuitBreakerStateChange(ruleId, oldState, newState, reason);
    this.metricsService.updateCircuitBreakerState(ruleId, newState, isFailure, nextAttemptTime);

    // Check for circuit breaker alerts
    if (newState === 'OPEN') {
      this.checkCircuitBreakerAlerts(ruleId);
    }
  }

  /**
   * Log configuration events
   */
  logConfigurationEvent(event: string, details: Record<string, any>): void {
    this.loggerService.logConfigurationEvent(event, details);
  }

  /**
   * Get comprehensive health status
   */
  getHealthStatus(): HealthStatus {
    const systemMetrics = this.metricsService.getSystemMetrics();
    const uptime = Date.now() - this.startTime;
    const issues: string[] = [];

    // Check various health indicators
    const checks = {
      memory: this.checkMemoryHealth(systemMetrics, issues),
      performance: this.checkPerformanceHealth(systemMetrics, issues),
    };

    // Determine overall status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (issues.length > 0) {
      status = issues.some((issue) => issue.includes('critical')) ? 'unhealthy' : 'degraded';
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime,
      checks,
      metrics: systemMetrics,
      issues: issues.length > 0 ? issues : undefined,
    };
  }

  /**
   * Get execution statistics
   */
  getExecutionStatistics(): {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageExecutionTime: number;
  } {
    return this.loggerService.getPerformanceStatistics();
  }

  /**
   * Get circuit breaker statistics
   */
  getCircuitBreakerStatistics(): Record<string, any> {
    return this.metricsService.getCircuitBreakerMetrics();
  }

  /**
   * Get rule-specific metrics
   */
  getRuleMetrics(ruleId: string): RuleExecutionMetrics {
    return this.metricsService.getRuleMetrics(ruleId);
  }

  /**
   * Get all rule metrics
   */
  getAllRuleMetrics(): RuleExecutionMetrics[] {
    return this.metricsService.getAllRuleMetrics();
  }

  /**
   * Add performance alert
   */
  addPerformanceAlert(alert: PerformanceAlert): void {
    this.performanceAlerts.push(alert);

    if (this.config.enableLogging) {
      this.logger.log('Performance alert added', alert);
    }
  }

  /**
   * Remove performance alert
   */
  removePerformanceAlert(index: number): void {
    if (index >= 0 && index < this.performanceAlerts.length) {
      const removed = this.performanceAlerts.splice(index, 1)[0];

      if (this.config.enableLogging) {
        this.logger.log('Performance alert removed', removed);
      }
    }
  }

  /**
   * Get performance alerts
   */
  getPerformanceAlerts(): PerformanceAlert[] {
    return [...this.performanceAlerts];
  }

  /**
   * Reset all metrics and logs
   */
  resetAllData(): void {
    this.metricsService.resetAllMetrics();
    this.loggerService.clearOldData(0); // Clear all data

    if (this.config.enableLogging) {
      this.logger.log('All monitoring data reset');
    }
  }

  /**
   * Cleanup resources
   */
  onModuleDestroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  /**
   * Initialize default performance alerts
   */
  private initializeDefaultAlerts(): void {
    // Default execution time alert (5 seconds)
    this.performanceAlerts.push({
      type: 'execution_time',
      threshold: 5000,
      enabled: true,
    });

    // Default error rate alert (10%)
    this.performanceAlerts.push({
      type: 'error_rate',
      threshold: 0.1,
      enabled: true,
    });

    // Default memory usage alert (80%)
    this.performanceAlerts.push({
      type: 'memory_usage',
      threshold: 80,
      enabled: true,
    });
  }

  /**
   * Check performance alerts
   */
  private checkPerformanceAlerts(ruleId: string, executionTime: number): void {
    for (const alert of this.performanceAlerts) {
      if (!alert.enabled) continue;

      if (
        alert.type === 'execution_time' &&
        (!alert.ruleId || alert.ruleId === ruleId) &&
        executionTime > alert.threshold
      ) {
        this.loggerService.logPerformanceWarning(
          ruleId,
          `perf-${Date.now()}`,
          executionTime,
          alert.threshold,
        );
      }
    }
  }

  /**
   * Check circuit breaker alerts
   */
  private checkCircuitBreakerAlerts(ruleId: string): void {
    const circuitBreakerAlerts = this.performanceAlerts.filter(
      (alert) => alert.type === 'circuit_breaker' && alert.enabled,
    );

    for (const alert of circuitBreakerAlerts) {
      if (!alert.ruleId || alert.ruleId === ruleId) {
        if (this.config.enableLogging) {
          this.logger.warn('Circuit breaker alert triggered', {
            ruleId,
            alert,
          });
        }
      }
    }
  }

  /**
   * Check memory health
   */
  private checkMemoryHealth(metrics: SystemMetrics, issues: string[]): boolean {
    if (metrics.memoryUsage && metrics.memoryUsage.percentage > 90) {
      issues.push('Critical memory usage detected');
      return false;
    }

    if (metrics.memoryUsage && metrics.memoryUsage.percentage > 80) {
      issues.push('High memory usage detected');
      return false;
    }

    return true;
  }

  /**
   * Check performance health
   */
  private checkPerformanceHealth(metrics: SystemMetrics, issues: string[]): boolean {
    if (metrics.averageResponseTime > 10000) {
      issues.push('Critical response time detected');
      return false;
    }

    if (metrics.averageResponseTime > 5000) {
      issues.push('High response time detected');
      return false;
    }

    return true;
  }

  /**
   * Start cleanup scheduler
   */
  private startCleanupScheduler(): void {
    // Run cleanup every hour
    this.cleanupInterval = setInterval(() => {
      this.metricsService.cleanupOldMetrics();
      this.loggerService.clearOldData();

      if (this.config.enableLogging) {
        this.logger.log('Periodic cleanup completed');
      }
    }, 60 * 60 * 1000);
  }
}
