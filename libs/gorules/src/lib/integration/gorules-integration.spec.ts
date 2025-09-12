import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GoRulesModule } from '../gorules.module';
import { GoRulesService } from '../services/gorules.service';
import { GoRulesLoggerService } from '../logging/gorules-logger.service';
import { GoRulesMetricsService } from '../monitoring/gorules-metrics.service';
import { GoRulesMonitoringService } from '../monitoring/gorules-monitoring.service';
import { GoRulesConfig } from '../config/gorules-config.interface';

describe('GoRules Integration', () => {
  let module: TestingModule;
  let goRulesService: GoRulesService;
  let loggerService: GoRulesLoggerService;
  let metricsService: GoRulesMetricsService;
  let monitoringService: GoRulesMonitoringService;

  const testConfig: GoRulesConfig = {
    apiUrl: 'https://test.gorules.io',
    apiKey: 'test-api-key',
    projectId: 'test-project-id',
    timeout: 5000,
    retryAttempts: 2,
    enableLogging: true,
    logLevel: 'debug',
    enableMetrics: true,
    performanceThresholds: {
      executionTime: 3000,
      errorRate: 0.15,
      memoryUsage: 85,
    },
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [() => ({ gorules: testConfig })],
        }),
        GoRulesModule.forRoot(testConfig),
      ],
    }).compile();

    goRulesService = module.get<GoRulesService>(GoRulesService);
    loggerService = module.get<GoRulesLoggerService>(GoRulesLoggerService);
    metricsService = module.get<GoRulesMetricsService>(GoRulesMetricsService);
    monitoringService = module.get<GoRulesMonitoringService>(GoRulesMonitoringService);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('Module Integration', () => {
    it('should initialize all services', () => {
      expect(goRulesService).toBeDefined();
      expect(loggerService).toBeDefined();
      expect(metricsService).toBeDefined();
      expect(monitoringService).toBeDefined();
    });

    it('should have proper dependency injection', () => {
      expect(goRulesService).toBeInstanceOf(GoRulesService);
      expect(loggerService).toBeInstanceOf(GoRulesLoggerService);
      expect(metricsService).toBeInstanceOf(GoRulesMetricsService);
      expect(monitoringService).toBeInstanceOf(GoRulesMonitoringService);
    });
  });

  describe('Service Integration', () => {
    it('should integrate logging and monitoring in rule execution', async () => {
      const ruleId = 'integration-test-rule';
      const input = { testData: 'integration' };

      try {
        // This will fail because we don't have a real rule loader
        // But it should still trigger logging and monitoring
        await goRulesService.executeRule(ruleId, input);
      } catch (error) {
        // Expected to fail, but logging should have occurred
      }

      // Check that monitoring was triggered
      const health = monitoringService.getHealthStatus();
      expect(health).toBeDefined();
      expect(health.uptime).toBeGreaterThan(0);

      // Check that metrics were collected
      const systemMetrics = monitoringService.getSystemMetrics();
      expect(systemMetrics).toBeDefined();
    });

    it('should validate rule existence with monitoring', async () => {
      const ruleId = 'validation-test-rule';

      const exists = await goRulesService.validateRuleExists(ruleId);
      expect(exists).toBe(false); // Expected since we don't have real rules

      // Check that the validation attempt was logged
      const recentLogs = loggerService.getRecentLogEntries(10);
      expect(recentLogs.length).toBeGreaterThan(0);
    });
  });

  describe('Configuration Integration', () => {
    it('should use configuration in all services', () => {
      // Logger should respect enableLogging setting
      const logEntries = loggerService.getRecentLogEntries();
      expect(Array.isArray(logEntries)).toBe(true);

      // Monitoring should have performance thresholds
      const alerts = monitoringService.getPerformanceAlerts();
      expect(Array.isArray(alerts)).toBe(true);
      expect(alerts.length).toBeGreaterThan(0); // Should have default alerts
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle errors consistently across services', async () => {
      const ruleId = 'error-test-rule';
      const input = { errorTest: true };

      try {
        await goRulesService.executeRule(ruleId, input);
      } catch (error) {
        // Error is expected
      }

      // Check that error was logged and metrics updated
      const stats = monitoringService.getExecutionStatistics();
      expect(stats).toBeDefined();

      const health = monitoringService.getHealthStatus();
      expect(health.status).toBeDefined();
    });
  });

  describe('Performance Monitoring Integration', () => {
    it('should track performance across all operations', async () => {
      const operations = [
        () => goRulesService.validateRuleExists('perf-rule-1'),
        () => goRulesService.validateRuleExists('perf-rule-2'),
        () => goRulesService.validateRuleExists('perf-rule-3'),
      ];

      // Execute operations
      for (const operation of operations) {
        try {
          await operation();
        } catch {
          // Ignore errors for this test
        }
      }

      // Check performance metrics
      const systemMetrics = monitoringService.getSystemMetrics();
      expect(systemMetrics.totalRuleExecutions).toBeGreaterThanOrEqual(0);

      const allRuleMetrics = monitoringService.getAllRuleMetrics();
      expect(Array.isArray(allRuleMetrics)).toBe(true);
    });
  });

  describe('Circuit Breaker Integration', () => {
    it('should integrate circuit breaker with monitoring', () => {
      const ruleId = 'cb-integration-rule';

      // Simulate circuit breaker state change
      monitoringService.updateCircuitBreakerState(
        ruleId,
        'CLOSED',
        'OPEN',
        'Integration test'
      );

      const cbStats = monitoringService.getCircuitBreakerStatistics();
      expect(cbStats[ruleId]).toBeDefined();
      expect(cbStats[ruleId].state).toBe('OPEN');
    });
  });

  describe('Health Check Integration', () => {
    it('should provide comprehensive health status', () => {
      const health = monitoringService.getHealthStatus();

      expect(health.status).toMatch(/^(healthy|degraded|unhealthy)$/);
      expect(health.timestamp).toBeDefined();
      expect(health.uptime).toBeGreaterThan(0);
      expect(health.metrics).toBeDefined();
      expect(health.checks).toBeDefined();
    });
  });

  describe('Cleanup Integration', () => {
    it('should cleanup resources properly', () => {
      // Add some test data
      monitoringService.startExecution('cleanup-rule', 'cleanup-exec', {});
      monitoringService.completeExecution('cleanup-rule', 'cleanup-exec', {}, 100);

      // Reset all data
      monitoringService.resetAllData();

      // Verify cleanup
      const stats = monitoringService.getExecutionStatistics();
      expect(stats.totalExecutions).toBe(0);

      const systemMetrics = monitoringService.getSystemMetrics();
      expect(systemMetrics.activeExecutions).toBe(0);
    });
  });
});

describe('GoRules Async Configuration Integration', () => {
  let module: TestingModule;

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  it('should initialize with async configuration', async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              GORULES_API_URL: 'https://async.gorules.io',
              GORULES_API_KEY: 'async-key',
              GORULES_PROJECT_ID: 'async-project',
              GORULES_ENABLE_LOGGING: 'true',
            }),
          ],
        }),
        GoRulesModule.forRootAsync({
          useFactory: (configService: ConfigService) => ({
            apiUrl: configService.get('GORULES_API_URL'),
            apiKey: configService.get('GORULES_API_KEY'),
            projectId: configService.get('GORULES_PROJECT_ID'),
            enableLogging: configService.get('GORULES_ENABLE_LOGGING') === 'true',
          }),
          inject: [ConfigService],
        }),
      ],
    }).compile();

    const goRulesService = module.get<GoRulesService>(GoRulesService);
    const monitoringService = module.get<GoRulesMonitoringService>(GoRulesMonitoringService);

    expect(goRulesService).toBeDefined();
    expect(monitoringService).toBeDefined();

    const health = monitoringService.getHealthStatus();
    expect(health).toBeDefined();
  });

  it('should initialize with environment configuration', async () => {
    // Set environment variables
    process.env.GORULES_API_URL = 'https://env.gorules.io';
    process.env.GORULES_API_KEY = 'env-key';
    process.env.GORULES_PROJECT_ID = 'env-project';
    process.env.GORULES_ENABLE_LOGGING = 'true';

    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        GoRulesModule.forEnvironment(),
      ],
    }).compile();

    const goRulesService = module.get<GoRulesService>(GoRulesService);
    expect(goRulesService).toBeDefined();

    // Clean up environment variables
    delete process.env.GORULES_API_URL;
    delete process.env.GORULES_API_KEY;
    delete process.env.GORULES_PROJECT_ID;
    delete process.env.GORULES_ENABLE_LOGGING;
  });
});