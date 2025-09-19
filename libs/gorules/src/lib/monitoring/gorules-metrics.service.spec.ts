import { GoRulesMetricsService } from './gorules-metrics.service';

describe('GoRulesMetricsService', () => {
  let service: GoRulesMetricsService;

  beforeEach(() => {
    service = new GoRulesMetricsService();
  });

  afterEach(() => {
    service.resetAllMetrics();
  });

  describe('execution time recording', () => {
    it('should record successful execution time', () => {
      const ruleId = 'test-rule';
      const executionTime = 150;

      service.recordExecutionTime(ruleId, executionTime, true);

      const metrics = service.getRuleMetrics(ruleId);
      expect(metrics.totalExecutions).toBe(1);
      expect(metrics.successfulExecutions).toBe(1);
      expect(metrics.failedExecutions).toBe(0);
      expect(metrics.averageExecutionTime).toBe(executionTime);
    });

    it('should record failed execution time', () => {
      const ruleId = 'test-rule';
      const executionTime = 200;

      service.recordExecutionTime(ruleId, executionTime, false);

      const metrics = service.getRuleMetrics(ruleId);
      expect(metrics.totalExecutions).toBe(1);
      expect(metrics.successfulExecutions).toBe(0);
      expect(metrics.failedExecutions).toBe(1);
      expect(metrics.errorRate).toBe(1);
    });

    it('should calculate average execution time correctly', () => {
      const ruleId = 'avg-test-rule';
      const times = [100, 200, 300];

      times.forEach((time) => {
        service.recordExecutionTime(ruleId, time, true);
      });

      const metrics = service.getRuleMetrics(ruleId);
      expect(metrics.averageExecutionTime).toBe(200);
      expect(metrics.minExecutionTime).toBe(100);
      expect(metrics.maxExecutionTime).toBe(300);
    });
  });

  describe('retry tracking', () => {
    it('should record retry attempts', () => {
      const ruleId = 'retry-rule';

      service.recordRetryAttempt(ruleId);
      service.recordRetryAttempt(ruleId);
      service.recordRetryAttempt(ruleId);

      const metrics = service.getRuleMetrics(ruleId);
      expect(metrics.totalRetries).toBe(3);
    });
  });

  describe('active execution tracking', () => {
    it('should track active executions', () => {
      const executionId1 = 'exec-1';
      const executionId2 = 'exec-2';

      service.markExecutionStart(executionId1);
      service.markExecutionStart(executionId2);

      const systemMetrics = service.getSystemMetrics();
      expect(systemMetrics.activeExecutions).toBe(2);

      service.markExecutionComplete(executionId1);

      const updatedMetrics = service.getSystemMetrics();
      expect(updatedMetrics.activeExecutions).toBe(1);
    });
  });

  describe('circuit breaker metrics', () => {
    it('should update circuit breaker state', () => {
      const ruleId = 'cb-rule';

      service.updateCircuitBreakerState(ruleId, 'CLOSED');

      const cbMetrics = service.getCircuitBreakerMetrics();
      expect(cbMetrics[ruleId]).toBeDefined();
      expect(cbMetrics[ruleId].state).toBe('CLOSED');
    });

    it('should track circuit breaker failures and successes', () => {
      const ruleId = 'cb-track-rule';

      service.updateCircuitBreakerState(ruleId, 'CLOSED', true); // failure
      service.updateCircuitBreakerState(ruleId, 'CLOSED', true); // failure
      service.updateCircuitBreakerState(ruleId, 'CLOSED', false); // success

      const cbMetrics = service.getCircuitBreakerMetrics();
      expect(cbMetrics[ruleId].failures).toBe(2);
      expect(cbMetrics[ruleId].successes).toBe(1);
    });

    it('should set next attempt time for OPEN state', () => {
      const ruleId = 'cb-open-rule';
      const nextAttemptTime = Date.now() + 60000;

      service.updateCircuitBreakerState(ruleId, 'OPEN', undefined, nextAttemptTime);

      const cbMetrics = service.getCircuitBreakerMetrics();
      expect(cbMetrics[ruleId].nextAttemptTime).toBe(nextAttemptTime);
    });
  });

  describe('execution time statistics', () => {
    it('should calculate percentiles correctly', () => {
      const ruleId = 'percentile-rule';
      const times = Array.from({ length: 100 }, (_, i) => i + 1); // 1 to 100

      times.forEach((time) => {
        service.recordExecutionTime(ruleId, time, true);
      });

      const stats = service.getExecutionTimeStatistics(ruleId);
      expect(stats).toBeDefined();
      expect(stats!.count).toBe(100);
      expect(stats!.min).toBe(1);
      expect(stats!.max).toBe(100);
      expect(stats!.average).toBe(50.5);
      expect(stats!.percentile95).toBeGreaterThan(90);
      expect(stats!.percentile99).toBeGreaterThan(95);
    });

    it('should return null for non-existent rule', () => {
      const stats = service.getExecutionTimeStatistics('non-existent-rule');
      expect(stats).toBeNull();
    });
  });

  describe('system metrics', () => {
    it('should calculate system-wide metrics', () => {
      // Add some test data
      service.recordExecutionTime('rule1', 100, true);
      service.recordExecutionTime('rule1', 200, false);
      service.recordExecutionTime('rule2', 150, true);

      const systemMetrics = service.getSystemMetrics();
      expect(systemMetrics.totalRuleExecutions).toBe(3);
      expect(systemMetrics.totalErrors).toBe(1);
      expect(systemMetrics.averageResponseTime).toBeGreaterThan(0);
    });

    it('should calculate requests per second', () => {
      const ruleId = 'rps-rule';

      // Record some recent executions
      service.recordExecutionTime(ruleId, 100, true);
      service.recordExecutionTime(ruleId, 100, true);

      const systemMetrics = service.getSystemMetrics();
      expect(systemMetrics.requestsPerSecond).toBeGreaterThanOrEqual(0);
    });
  });

  describe('metrics management', () => {
    it('should get all rule metrics', () => {
      service.recordExecutionTime('rule1', 100, true);
      service.recordExecutionTime('rule2', 200, false);

      const allMetrics = service.getAllRuleMetrics();
      expect(allMetrics).toHaveLength(2);

      const rule1Metrics = allMetrics.find((m) => m.ruleId === 'rule1');
      const rule2Metrics = allMetrics.find((m) => m.ruleId === 'rule2');

      expect(rule1Metrics?.successfulExecutions).toBe(1);
      expect(rule2Metrics?.failedExecutions).toBe(1);
    });

    it('should reset rule metrics', () => {
      const ruleId = 'reset-rule';

      service.recordExecutionTime(ruleId, 100, true);
      service.recordRetryAttempt(ruleId);

      let metrics = service.getRuleMetrics(ruleId);
      expect(metrics.totalExecutions).toBe(1);
      expect(metrics.totalRetries).toBe(1);

      service.resetRuleMetrics(ruleId);

      metrics = service.getRuleMetrics(ruleId);
      expect(metrics.totalExecutions).toBe(0);
      expect(metrics.totalRetries).toBe(0);
    });

    it('should reset all metrics', () => {
      service.recordExecutionTime('rule1', 100, true);
      service.recordExecutionTime('rule2', 200, false);
      service.markExecutionStart('exec-1');

      service.resetAllMetrics();

      const allMetrics = service.getAllRuleMetrics();
      expect(allMetrics).toHaveLength(0);

      const systemMetrics = service.getSystemMetrics();
      expect(systemMetrics.activeExecutions).toBe(0);
    });

    it('should cleanup old metrics', () => {
      const ruleId = 'cleanup-rule';

      // Record some metrics
      service.recordExecutionTime(ruleId, 100, true);

      // Cleanup should remove old data
      service.cleanupOldMetrics();

      // Since we just recorded the data, it should still be there
      const metrics = service.getRuleMetrics(ruleId);
      expect(metrics.totalExecutions).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('should handle empty metrics gracefully', () => {
      const metrics = service.getRuleMetrics('non-existent-rule');
      expect(metrics.totalExecutions).toBe(0);
      expect(metrics.averageExecutionTime).toBe(0);
      expect(metrics.errorRate).toBe(0);
    });

    it('should handle system metrics with no data', () => {
      const systemMetrics = service.getSystemMetrics();
      expect(systemMetrics.totalRuleExecutions).toBe(0);
      expect(systemMetrics.averageResponseTime).toBe(0);
    });
  });
});
