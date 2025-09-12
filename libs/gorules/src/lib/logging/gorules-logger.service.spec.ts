import { GoRulesLoggerService } from './gorules-logger.service';
import { GoRulesConfig } from '../config/gorules-config.interface';

describe('GoRulesLoggerService', () => {
  let service: GoRulesLoggerService;
  let config: GoRulesConfig;

  beforeEach(() => {
    config = {
      apiUrl: 'https://test.gorules.io',
      apiKey: 'test-key',
      projectId: 'test-project',
      enableLogging: true,
      logLevel: 'debug',
    };
    service = new GoRulesLoggerService(config);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with logging enabled', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with logging disabled', () => {
      const disabledConfig = { ...config, enableLogging: false };
      const disabledService = new GoRulesLoggerService(disabledConfig);
      expect(disabledService).toBeDefined();
    });
  });

  describe('execution logging', () => {
    const ruleId = 'test-rule';
    const executionId = 'exec-123';
    const input = { test: 'data' };
    const output = { result: 'success' };

    it('should log execution start', () => {
      service.logExecutionStart(ruleId, executionId, input);
      
      const metrics = service.getExecutionMetrics(executionId);
      expect(metrics).toBeDefined();
      expect(metrics?.ruleId).toBe(ruleId);
      expect(metrics?.executionId).toBe(executionId);
    });

    it('should log execution success', () => {
      service.logExecutionStart(ruleId, executionId, input);
      service.logExecutionSuccess(executionId, output);
      
      const metrics = service.getExecutionMetrics(executionId);
      expect(metrics?.success).toBe(true);
      expect(metrics?.endTime).toBeGreaterThan(0);
      expect(metrics?.duration).toBeGreaterThan(0);
    });

    it('should log execution error', () => {
      const error = new Error('Test error');
      service.logExecutionStart(ruleId, executionId, input);
      service.logExecutionError(executionId, error);
      
      const metrics = service.getExecutionMetrics(executionId);
      expect(metrics?.success).toBe(false);
      expect(metrics?.error).toBe(error.message);
    });

    it('should log retry attempts', () => {
      const error = new Error('Retry error');
      service.logExecutionStart(ruleId, executionId, input);
      service.logRetryAttempt(executionId, 1, error, 1000);
      
      const logEntries = service.getLogEntriesByExecution(executionId);
      const retryEntry = logEntries.find(entry => entry.message.includes('retry'));
      expect(retryEntry).toBeDefined();
      expect(retryEntry?.metadata?.attemptNumber).toBe(1);
    });
  });

  describe('circuit breaker logging', () => {
    it('should log circuit breaker state changes', () => {
      const ruleId = 'test-rule';
      service.logCircuitBreakerStateChange(ruleId, 'CLOSED', 'OPEN', 'Too many failures');
      
      const logEntries = service.getLogEntriesByRule(ruleId);
      const cbEntry = logEntries.find(entry => entry.message.includes('Circuit breaker'));
      expect(cbEntry).toBeDefined();
      expect(cbEntry?.metadata?.newState).toBe('OPEN');
    });
  });

  describe('performance monitoring', () => {
    it('should log performance warnings', () => {
      const ruleId = 'slow-rule';
      const executionId = 'exec-slow';
      service.logPerformanceWarning(ruleId, executionId, 6000, 5000);
      
      const logEntries = service.getLogEntriesByRule(ruleId);
      const perfEntry = logEntries.find(entry => entry.message.includes('performance threshold'));
      expect(perfEntry).toBeDefined();
      expect(perfEntry?.duration).toBe(6000);
    });

    it('should calculate performance statistics', () => {
      // Create some test executions
      const executions = [
        { ruleId: 'rule1', executionId: 'exec1', duration: 100 },
        { ruleId: 'rule1', executionId: 'exec2', duration: 200 },
        { ruleId: 'rule2', executionId: 'exec3', duration: 150 },
      ];

      executions.forEach(exec => {
        service.logExecutionStart(exec.ruleId, exec.executionId, {});
        // Simulate execution time
        setTimeout(() => {
          service.logExecutionSuccess(exec.executionId, {});
        }, exec.duration);
      });

      // Wait for executions to complete
      setTimeout(() => {
        const stats = service.getPerformanceStatistics();
        expect(stats.totalExecutions).toBe(3);
        expect(stats.successfulExecutions).toBe(3);
        expect(stats.failedExecutions).toBe(0);
      }, 500);
    });
  });

  describe('log management', () => {
    it('should retrieve recent log entries', () => {
      service.logConfigurationEvent('test-event', { key: 'value' });
      
      const recentLogs = service.getRecentLogEntries(10);
      expect(recentLogs.length).toBeGreaterThan(0);
      
      const configEvent = recentLogs.find(entry => entry.message.includes('test-event'));
      expect(configEvent).toBeDefined();
    });

    it('should filter log entries by rule', () => {
      const ruleId = 'filter-test-rule';
      const executionId = 'exec-filter';
      
      service.logExecutionStart(ruleId, executionId, {});
      service.logExecutionSuccess(executionId, {});
      
      const ruleLogs = service.getLogEntriesByRule(ruleId);
      expect(ruleLogs.length).toBeGreaterThan(0);
      expect(ruleLogs.every(entry => entry.ruleId === ruleId)).toBe(true);
    });

    it('should clear old data', () => {
      const ruleId = 'old-rule';
      const executionId = 'old-exec';
      
      service.logExecutionStart(ruleId, executionId, {});
      service.logExecutionSuccess(executionId, {});
      
      // Clear data older than 0ms (everything)
      service.clearOldData(0);
      
      const metrics = service.getExecutionMetrics(executionId);
      expect(metrics).toBeUndefined();
      
      const recentLogs = service.getRecentLogEntries();
      expect(recentLogs.length).toBe(0);
    });
  });

  describe('disabled logging', () => {
    let disabledService: GoRulesLoggerService;

    beforeEach(() => {
      const disabledConfig = { ...config, enableLogging: false };
      disabledService = new GoRulesLoggerService(disabledConfig);
    });

    it('should not log when disabled', () => {
      const ruleId = 'disabled-rule';
      const executionId = 'disabled-exec';
      
      disabledService.logExecutionStart(ruleId, executionId, {});
      disabledService.logExecutionSuccess(executionId, {});
      
      const recentLogs = disabledService.getRecentLogEntries();
      expect(recentLogs.length).toBe(0);
    });
  });
});