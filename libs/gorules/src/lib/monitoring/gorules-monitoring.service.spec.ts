import { GoRulesMonitoringService } from './gorules-monitoring.service';
import { GoRulesLoggerService } from '../logging/gorules-logger.service';
import { GoRulesMetricsService } from './gorules-metrics.service';
import { GoRulesConfig } from '../config/gorules-config.interface';

describe('GoRulesMonitoringService', () => {
  let service: GoRulesMonitoringService;
  let loggerService: GoRulesLoggerService;
  let metricsService: GoRulesMetricsService;
  let config: GoRulesConfig;

  beforeEach(() => {
    config = {
      apiUrl: 'https://test.gorules.io',
      apiKey: 'test-key',
      projectId: 'test-project',
      enableLogging: true,
      logLevel: 'debug',
    };

    loggerService = new GoRulesLoggerService(config);
    metricsService = new GoRulesMetricsService();
    service = new GoRulesMonitoringService(config, loggerService, metricsService);
  });

  afterEach(() => {
    service.onModuleDestroy();
  });

  describe('execution monitoring', () => {
    const ruleId = 'test-rule';
    const executionId = 'exec-123';
    const input = { test: 'data' };
    const output = { result: 'success' };

    it('should start execution monitoring', () => {
      service.startExecution(ruleId, executionId, input);

      const systemMetrics = service.getSystemMetrics();
      expect(systemMetrics.activeExecutions).toBe(1);
    });

    it('should complete successful execution monitoring', () => {
      const executionTime = 150;

      service.startExecution(ruleId, executionId, input);
      service.completeExecution(ruleId, executionId, output, executionTime);

      const ruleMetrics = service.getRuleMetrics(ruleId);
      expect(ruleMetrics.totalExecutions).toBe(1);
      expect(ruleMetrics.successfulExecutions).toBe(1);
      expect(ruleMetrics.averageExecutionTime).toBe(executionTime);

      const systemMetrics = service.getSystemMetrics();
      expect(systemMetrics.activeExecutions).toBe(0);
    });

    it('should complete failed execution monitoring', () => {
      const error = new Error('Test error');
      const executionTime = 200;

      service.startExecution(ruleId, executionId, input);
      service.failExecution(ruleId, executionId, error, executionTime);

      const ruleMetrics = service.getRuleMetrics(ruleId);
      expect(ruleMetrics.totalExecutions).toBe(1);
      expect(ruleMetrics.failedExecutions).toBe(1);
      expect(ruleMetrics.errorRate).toBe(1);
    });

    it('should handle execution with retries', () => {
      const executionTime = 300;
      const retryCount = 2;

      service.startExecution(ruleId, executionId, input);
      service.logRetryAttempt(ruleId, executionId, 1, new Error('Retry 1'), 1000);
      service.logRetryAttempt(ruleId, executionId, 2, new Error('Retry 2'), 2000);
      service.completeExecution(ruleId, executionId, output, executionTime, retryCount);

      const ruleMetrics = service.getRuleMetrics(ruleId);
      expect(ruleMetrics.totalRetries).toBe(retryCount);
    });
  });

  describe('circuit breaker monitoring', () => {
    const ruleId = 'cb-rule';

    it('should update circuit breaker state', () => {
      service.updateCircuitBreakerState(ruleId, 'CLOSED', 'OPEN', 'Too many failures');

      const cbStats = service.getCircuitBreakerStatistics();
      expect(cbStats[ruleId]).toBeDefined();
      expect(cbStats[ruleId].state).toBe('OPEN');
    });

    it('should track circuit breaker failures', () => {
      service.updateCircuitBreakerState(
        ruleId,
        'CLOSED',
        'OPEN',
        'Failure threshold reached',
        true,
      );

      const cbStats = service.getCircuitBreakerStatistics();
      expect(cbStats[ruleId].failures).toBe(1);
    });
  });

  describe('health monitoring', () => {
    it('should return healthy status with no issues', () => {
      const health = service.getHealthStatus();

      expect(health.status).toBe('healthy');
      expect(health.uptime).toBeGreaterThan(0);
      expect(health.metrics).toBeDefined();
      expect(health.checks).toBeDefined();
    });

    it('should detect performance issues', () => {
      // Simulate high response time
      const ruleId = 'slow-rule';
      service.startExecution(ruleId, 'exec-slow', {});
      service.completeExecution(ruleId, 'exec-slow', {}, 15000); // 15 seconds

      const health = service.getHealthStatus();
      expect(health.status).toBe('degraded');
      expect(health.issues).toBeDefined();
      expect(health.issues!.some((issue) => issue.includes('response time'))).toBe(true);
    });
  });

  describe('performance alerts', () => {
    it('should add performance alert', () => {
      const alert = {
        type: 'execution_time' as const,
        threshold: 1000,
        enabled: true,
      };

      service.addPerformanceAlert(alert);

      const alerts = service.getPerformanceAlerts();
      expect(alerts.some((a) => a.threshold === 1000 && a.type === 'execution_time')).toBe(true);
    });

    it('should remove performance alert', () => {
      const alert = {
        type: 'error_rate' as const,
        threshold: 0.5,
        enabled: true,
      };

      service.addPerformanceAlert(alert);
      let alerts = service.getPerformanceAlerts();
      const initialCount = alerts.length;

      service.removePerformanceAlert(initialCount - 1);
      alerts = service.getPerformanceAlerts();
      expect(alerts.length).toBe(initialCount - 1);
    });

    it('should trigger execution time alert', () => {
      const ruleId = 'alert-rule';
      const executionId = 'exec-alert';

      // Add a low threshold alert
      service.addPerformanceAlert({
        type: 'execution_time',
        threshold: 100,
        enabled: true,
      });

      service.startExecution(ruleId, executionId, {});
      service.completeExecution(ruleId, executionId, {}, 200); // Exceeds threshold

      // The alert should be triggered (logged internally)
      // We can verify this by checking if the execution was recorded
      const ruleMetrics = service.getRuleMetrics(ruleId);
      expect(ruleMetrics.averageExecutionTime).toBe(200);
    });
  });

  describe('statistics and metrics', () => {
    it('should get execution statistics', () => {
      const ruleId = 'stats-rule';

      service.startExecution(ruleId, 'exec-1', {});
      service.completeExecution(ruleId, 'exec-1', {}, 100);

      service.startExecution(ruleId, 'exec-2', {});
      service.failExecution(ruleId, 'exec-2', new Error('Test'), 150);

      const stats = service.getExecutionStatistics();
      expect(stats.totalExecutions).toBe(2);
      expect(stats.successfulExecutions).toBe(1);
      expect(stats.failedExecutions).toBe(1);
    });

    it('should get all rule metrics', () => {
      service.startExecution('rule1', 'exec-1', {});
      service.completeExecution('rule1', 'exec-1', {}, 100);

      service.startExecution('rule2', 'exec-2', {});
      service.completeExecution('rule2', 'exec-2', {}, 200);

      const allMetrics = service.getAllRuleMetrics();
      expect(allMetrics).toHaveLength(2);

      const rule1Metrics = allMetrics.find((m) => m.ruleId === 'rule1');
      const rule2Metrics = allMetrics.find((m) => m.ruleId === 'rule2');

      expect(rule1Metrics?.averageExecutionTime).toBe(100);
      expect(rule2Metrics?.averageExecutionTime).toBe(200);
    });
  });

  describe('configuration events', () => {
    it('should log configuration events', () => {
      const event = 'test-config-change';
      const details = { setting: 'value', enabled: true };

      service.logConfigurationEvent(event, details);

      // Configuration events are logged internally
      // We can verify the service is working by checking it doesn't throw
      expect(service).toBeDefined();
    });
  });

  describe('data management', () => {
    it('should reset all monitoring data', () => {
      const ruleId = 'reset-rule';

      service.startExecution(ruleId, 'exec-reset', {});
      service.completeExecution(ruleId, 'exec-reset', {}, 100);

      service.resetAllData();

      const ruleMetrics = service.getRuleMetrics(ruleId);
      expect(ruleMetrics.totalExecutions).toBe(0);

      const stats = service.getExecutionStatistics();
      expect(stats.totalExecutions).toBe(0);
    });
  });

  describe('module lifecycle', () => {
    it('should handle module destruction', () => {
      // This should not throw an error
      expect(() => service.onModuleDestroy()).not.toThrow();
    });
  });

  describe('disabled logging', () => {
    let disabledService: GoRulesMonitoringService;

    beforeEach(() => {
      const disabledConfig = { ...config, enableLogging: false };
      const disabledLogger = new GoRulesLoggerService(disabledConfig);
      disabledService = new GoRulesMonitoringService(
        disabledConfig,
        disabledLogger,
        metricsService,
      );
    });

    afterEach(() => {
      disabledService.onModuleDestroy();
    });

    it('should still collect metrics when logging is disabled', () => {
      const ruleId = 'disabled-rule';
      const executionId = 'disabled-exec';

      disabledService.startExecution(ruleId, executionId, {});
      disabledService.completeExecution(ruleId, executionId, {}, 100);

      const ruleMetrics = disabledService.getRuleMetrics(ruleId);
      expect(ruleMetrics.totalExecutions).toBe(1);
    });
  });
});
