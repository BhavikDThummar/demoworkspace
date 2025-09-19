import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ZenEngine, ZenEngineResponse } from '@gorules/zen-engine';
import { GoRulesService } from './gorules.service.js';
import { GoRulesConfigService } from '../config/gorules.config.js';
import { GoRulesResilienceService } from './gorules-resilience.service.js';
import { GoRulesLoggerService } from '../logging/gorules-logger.service.js';
import { GoRulesMetricsService } from '../monitoring/gorules-metrics.service.js';
import { GoRulesMonitoringService } from '../monitoring/gorules-monitoring.service.js';
import {
  GoRulesConfig,
  RuleExecutionOptions,
  BatchRuleExecution,
  GoRulesException,
  GoRulesErrorCode,
  RuleInputData,
} from '../types/index.js';

// Mock the ZenEngine
jest.mock('@gorules/zen-engine');

describe('GoRulesService', () => {
  let service: GoRulesService;
  let configService: jest.Mocked<GoRulesConfigService>;
  let mockZenEngine: jest.Mocked<ZenEngine>;

  const mockConfig: GoRulesConfig = {
    apiUrl: 'https://test.gorules.io',
    apiKey: 'test-api-key',
    projectId: 'test-project-id',
    timeout: 30000,
    retryAttempts: 3,
    enableLogging: false,
  };

  const mockZenResponse: ZenEngineResponse = {
    result: { approved: true, score: 85 },
    performance: '150',
    trace: {
      step1: {
        id: 'step1',
        name: 'Input Validation',
        input: { amount: 1000 },
        output: { valid: true },
        performance: '50',
        traceData: {},
        order: 1,
      },
    },
  };

  beforeEach(async () => {
    const mockConfigService = {
      getConfig: jest.fn().mockReturnValue(mockConfig),
      get: jest.fn(),
    };

    const mockResilienceService = {
      withResilience: jest.fn().mockImplementation((operation) => operation()),
      getAllCircuitBreakerStats: jest.fn().mockReturnValue({}),
      getCircuitBreakerStats: jest.fn().mockReturnValue(null),
      resetCircuitBreaker: jest.fn(),
    };

    mockZenEngine = {
      evaluate: jest.fn(),
      getDecision: jest.fn(),
      dispose: jest.fn(),
    } as any;

    (ZenEngine as jest.MockedClass<typeof ZenEngine>).mockImplementation(() => mockZenEngine);

    const mockLoggerService = {
      logRuleExecutionStart: jest.fn(),
      logRuleExecutionSuccess: jest.fn(),
      logRuleExecutionError: jest.fn(),
    };

    const mockMetricsService = {
      startTimer: jest.fn().mockReturnValue('timer-id'),
      stopTimer: jest.fn().mockReturnValue(100),
      recordRuleExecution: jest.fn(),
    };

    const mockMonitoringService = {
      startTrace: jest.fn().mockReturnValue('trace-id'),
      addTraceStep: jest.fn(),
      completeTrace: jest.fn(),
      recordRuleExecution: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoRulesService,
        { provide: GoRulesConfigService, useValue: mockConfigService },
        { provide: GoRulesResilienceService, useValue: mockResilienceService },
        { provide: GoRulesLoggerService, useValue: mockLoggerService },
        { provide: GoRulesMetricsService, useValue: mockMetricsService },
        { provide: GoRulesMonitoringService, useValue: mockMonitoringService },
      ],
    }).compile();

    service = module.get<GoRulesService>(GoRulesService);
    configService = module.get(GoRulesConfigService);

    // Initialize the service
    await service.onModuleInit();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      expect(service).toBeDefined();
      expect(ZenEngine).toHaveBeenCalledWith({
        loader: expect.any(Function),
      });
    });

    it('should dispose resources on module destroy', () => {
      service.onModuleDestroy();
      expect(mockZenEngine.dispose).toHaveBeenCalled();
    });
  });

  describe('executeRule', () => {
    const testInput: RuleInputData = { amount: 1000, currency: 'USD' };
    const testRuleId = 'test-rule';

    beforeEach(() => {
      mockZenEngine.evaluate.mockResolvedValue(mockZenResponse);
    });

    it('should execute rule successfully', async () => {
      const result = await service.executeRule(testRuleId, testInput);

      expect(result).toEqual({
        result: { approved: true, score: 85 },
        performance: {
          executionTime: 150,
          networkTime: 0,
          totalTime: expect.any(Number),
        },
        metadata: {
          id: testRuleId,
          name: testRuleId,
          version: '1.0.0',
          description: `Rule ${testRuleId}`,
          tags: [],
          lastModified: expect.any(Date),
        },
      });

      expect(mockZenEngine.evaluate).toHaveBeenCalledWith(testRuleId, testInput, {
        trace: false,
        maxDepth: 100,
      });
    });

    it('should execute rule with trace enabled', async () => {
      const options: RuleExecutionOptions = { trace: true };

      const result = await service.executeRule(testRuleId, testInput, options);

      expect(result.trace).toEqual({
        steps: [
          {
            id: 'step1',
            name: 'Input Validation',
            duration: 50,
            input: { amount: 1000 },
            output: { valid: true },
          },
        ],
        duration: expect.any(Number),
        rulesEvaluated: [testRuleId],
      });

      expect(mockZenEngine.evaluate).toHaveBeenCalledWith(testRuleId, testInput, {
        trace: true,
        maxDepth: 100,
      });
    });

    it('should execute rule with custom timeout', async () => {
      const options: RuleExecutionOptions = { timeout: 5000 };

      await service.executeRule(testRuleId, testInput, options);

      expect(mockZenEngine.evaluate).toHaveBeenCalled();
    });

    it('should throw error for invalid rule ID', async () => {
      await expect(service.executeRule('', testInput)).rejects.toThrow(
        new GoRulesException(
          GoRulesErrorCode.INVALID_INPUT,
          'Rule ID must be a non-empty string',
          { ruleId: '' },
          false,
        ),
      );
    });

    it('should throw error for invalid input', async () => {
      await expect(service.executeRule(testRuleId, null as any)).rejects.toThrow(
        new GoRulesException(
          GoRulesErrorCode.INVALID_INPUT,
          'Input must be a valid object',
          { input: 'object' },
          false,
        ),
      );
    });

    it('should handle zen engine errors', async () => {
      const zenError = new Error('Zen engine error');
      mockZenEngine.evaluate.mockRejectedValue(zenError);

      await expect(service.executeRule(testRuleId, testInput)).rejects.toThrow(
        new GoRulesException(
          GoRulesErrorCode.INTERNAL_ERROR,
          'Rule execution failed: Zen engine error',
          expect.objectContaining({ ruleId: testRuleId }),
          false,
        ),
      );
    });

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('timeout');
      mockZenEngine.evaluate.mockRejectedValue(timeoutError);

      await expect(service.executeRule(testRuleId, testInput)).rejects.toThrow(
        new GoRulesException(
          GoRulesErrorCode.TIMEOUT,
          'Rule execution failed: timeout',
          expect.objectContaining({ ruleId: testRuleId }),
          true,
        ),
      );
    });

    it('should update execution statistics', async () => {
      await service.executeRule(testRuleId, testInput);
      await service.executeRule(testRuleId, testInput);

      const stats = service.getExecutionStatistics();
      expect(stats[testRuleId]).toEqual({
        count: 2,
        averageTime: expect.any(Number),
        errorRate: 0,
      });
    });
  });

  describe('executeBatch', () => {
    const testExecutions: BatchRuleExecution[] = [
      {
        ruleId: 'rule1',
        input: { amount: 1000 },
        executionId: 'exec1',
      },
      {
        ruleId: 'rule2',
        input: { amount: 2000 },
        executionId: 'exec2',
      },
    ];

    beforeEach(() => {
      mockZenEngine.evaluate.mockResolvedValue(mockZenResponse);
    });

    it('should execute batch successfully', async () => {
      const results = await service.executeBatch(testExecutions);

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        executionId: 'exec1',
        ruleId: 'rule1',
        result: {
          decision: { approved: true, score: 85 },
          appliedRules: ['rule1'],
          warnings: [],
        },
      });
      expect(results[1]).toEqual({
        executionId: 'exec2',
        ruleId: 'rule2',
        result: {
          decision: { approved: true, score: 85 },
          appliedRules: ['rule2'],
          warnings: [],
        },
      });
    });

    it('should handle partial failures in batch', async () => {
      mockZenEngine.evaluate
        .mockResolvedValueOnce(mockZenResponse)
        .mockRejectedValueOnce(new Error('Rule 2 failed'));

      const results = await service.executeBatch(testExecutions);

      expect(results).toHaveLength(2);
      expect(results[0].error).toBeUndefined();
      expect(results[1].error).toEqual({
        code: GoRulesErrorCode.INTERNAL_ERROR,
        message: 'Rule execution failed: Rule 2 failed',
        details: expect.any(Object),
        retryable: false,
      });
    });

    it('should throw error for empty batch', async () => {
      await expect(service.executeBatch([])).rejects.toThrow(
        new GoRulesException(
          GoRulesErrorCode.INVALID_INPUT,
          'Batch executions must be a non-empty array',
          expect.any(Object),
          false,
        ),
      );
    });

    it('should throw error for invalid batch execution', async () => {
      const invalidExecutions = [{ ruleId: '', input: { amount: 1000 } }] as BatchRuleExecution[];

      await expect(service.executeBatch(invalidExecutions)).rejects.toThrow(
        new GoRulesException(
          GoRulesErrorCode.INVALID_INPUT,
          'Batch execution at index 0 is missing ruleId',
          expect.any(Object),
          false,
        ),
      );
    });
  });

  describe('validateRuleExists', () => {
    it('should return true for existing rule', async () => {
      mockZenEngine.getDecision.mockResolvedValue({} as any);

      const result = await service.validateRuleExists('existing-rule');

      expect(result).toBe(true);
      expect(mockZenEngine.getDecision).toHaveBeenCalledWith('existing-rule');
    });

    it('should return false for non-existing rule', async () => {
      mockZenEngine.getDecision.mockRejectedValue(new Error('Rule not found'));

      const result = await service.validateRuleExists('non-existing-rule');

      expect(result).toBe(false);
    });

    it('should throw error for invalid rule ID', async () => {
      await expect(service.validateRuleExists('')).rejects.toThrow(
        new GoRulesException(
          GoRulesErrorCode.INVALID_INPUT,
          'Rule ID must be a non-empty string',
          { ruleId: '' },
          false,
        ),
      );
    });
  });

  describe('getRuleMetadata', () => {
    it('should return rule metadata', async () => {
      const result = await service.getRuleMetadata('test-rule');

      expect(result).toEqual({
        id: 'test-rule',
        name: 'test-rule',
        version: '1.0.0',
        description: 'Rule test-rule',
        tags: [],
        lastModified: expect.any(Date),
      });
    });

    it('should cache metadata', async () => {
      await service.getRuleMetadata('test-rule');
      const result2 = await service.getRuleMetadata('test-rule');

      expect(result2.id).toBe('test-rule');
    });

    it('should throw error for invalid rule ID', async () => {
      await expect(service.getRuleMetadata('')).rejects.toThrow(
        new GoRulesException(
          GoRulesErrorCode.INVALID_INPUT,
          'Rule ID must be a non-empty string',
          { ruleId: '' },
          false,
        ),
      );
    });
  });

  describe('validateRule', () => {
    it('should validate existing rule successfully', async () => {
      mockZenEngine.getDecision.mockResolvedValue({} as unknown);

      const result = await service.validateRule('test-rule');

      expect(result).toEqual({
        isValid: true,
        errors: [],
        warnings: [],
      });
    });

    it('should return validation errors for non-existing rule', async () => {
      mockZenEngine.getDecision.mockRejectedValue(new Error('Rule not found'));

      const result = await service.validateRule('non-existing-rule');

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((error) => error.code === 'RULE_NOT_FOUND')).toBe(true);
    });

    it('should handle decision load errors', async () => {
      mockZenEngine.getDecision
        .mockResolvedValueOnce({} as unknown) // For validateRuleExists
        .mockRejectedValueOnce(new Error('Decision load failed')); // For validation

      const result = await service.validateRule('test-rule');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        code: 'DECISION_LOAD_ERROR',
        message: 'Failed to load rule decision: Decision load failed',
        path: 'decision',
        details: expect.any(Error),
      });
    });
  });

  describe('execution statistics', () => {
    beforeEach(() => {
      mockZenEngine.evaluate.mockResolvedValue(mockZenResponse);
    });

    it('should track execution statistics', async () => {
      await service.executeRule('rule1', { amount: 1000 });
      await service.executeRule('rule1', { amount: 2000 });
      await service.executeRule('rule2', { amount: 3000 });

      const stats = service.getExecutionStatistics();

      expect(stats['rule1']).toEqual({
        count: 2,
        averageTime: expect.any(Number),
        errorRate: 0,
      });
      expect(stats['rule2']).toEqual({
        count: 1,
        averageTime: expect.any(Number),
        errorRate: 0,
      });
    });

    it('should track error statistics', async () => {
      mockZenEngine.evaluate
        .mockResolvedValueOnce(mockZenResponse)
        .mockRejectedValueOnce(new Error('Execution failed'));

      await service.executeRule('rule1', { amount: 1000 });

      try {
        await service.executeRule('rule1', { amount: 2000 });
      } catch {
        // Expected error
      }

      const stats = service.getExecutionStatistics();

      expect(stats['rule1']).toEqual({
        count: 2,
        averageTime: expect.any(Number),
        errorRate: 0.5,
      });
    });

    it('should clear execution statistics', async () => {
      await service.executeRule('rule1', { amount: 1000 });

      service.clearExecutionStatistics();

      const stats = service.getExecutionStatistics();
      expect(Object.keys(stats)).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    it('should map different error types correctly', async () => {
      const testCases = [
        { error: new Error('timeout occurred'), expectedCode: GoRulesErrorCode.TIMEOUT },
        {
          error: new Error('network connection failed'),
          expectedCode: GoRulesErrorCode.NETWORK_ERROR,
        },
        { error: new Error('rule not found'), expectedCode: GoRulesErrorCode.RULE_NOT_FOUND },
        {
          error: new Error('unauthorized access'),
          expectedCode: GoRulesErrorCode.AUTHENTICATION_FAILED,
        },
        {
          error: new Error('rate limit exceeded'),
          expectedCode: GoRulesErrorCode.RATE_LIMIT_EXCEEDED,
        },
        { error: new Error('invalid input data'), expectedCode: GoRulesErrorCode.INVALID_INPUT },
        { error: new Error('unknown error'), expectedCode: GoRulesErrorCode.INTERNAL_ERROR },
      ];

      for (const testCase of testCases) {
        mockZenEngine.evaluate.mockRejectedValueOnce(testCase.error);

        try {
          await service.executeRule('test-rule', { amount: 1000 });
          fail('Expected error to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(GoRulesException);
          expect((error as GoRulesException).code).toBe(testCase.expectedCode);
        }
      }
    });

    it('should preserve GoRulesException errors', async () => {
      const originalError = new GoRulesException(
        GoRulesErrorCode.RULE_NOT_FOUND,
        'Custom error',
        { custom: 'data' },
        true,
      );

      mockZenEngine.evaluate.mockRejectedValue(originalError);

      try {
        await service.executeRule('test-rule', { amount: 1000 });
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBe(originalError);
      }
    });
  });

  describe('service state management', () => {
    it('should throw error when not initialized', async () => {
      const uninitializedService = new GoRulesService(configService);

      await expect(uninitializedService.executeRule('test-rule', { amount: 1000 })).rejects.toThrow(
        new GoRulesException(
          GoRulesErrorCode.INTERNAL_ERROR,
          'GoRules service is not initialized',
          {},
          false,
        ),
      );
    });
  });
});
