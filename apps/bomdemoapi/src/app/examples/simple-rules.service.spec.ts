import { Test, TestingModule } from '@nestjs/testing';
import { SimpleRulesService } from './simple-rules.service';
import { GoRulesService, GoRulesException, GoRulesErrorCode } from '@org/gorules';

describe('SimpleRulesService', () => {
  let service: SimpleRulesService;
  let goRulesService: jest.Mocked<GoRulesService>;

  beforeEach(async () => {
    const mockGoRulesService = {
      executeRule: jest.fn(),
      validateRuleExists: jest.fn(),
      getRuleMetadata: jest.fn(),
      getExecutionStatistics: jest.fn(),
      getCircuitBreakerStatistics: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SimpleRulesService,
        { provide: GoRulesService, useValue: mockGoRulesService },
      ],
    }).compile();

    service = module.get<SimpleRulesService>(SimpleRulesService);
    goRulesService = module.get(GoRulesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('executeSimpleRule', () => {
    const validInput = {
      value: 42,
      category: 'test',
      metadata: { source: 'unit-test' },
    };

    const mockResult = {
      result: 'success',
      score: 85,
      recommendations: ['Continue with current approach'],
    };

    it('should execute simple rule successfully', async () => {
      goRulesService.executeRule.mockResolvedValue({
        result: mockResult,
        performance: { executionTime: 100, networkTime: 30, totalTime: 130 },
        metadata: { id: 'simple-rule', name: 'Simple Rule', version: '1.0.0' },
      });

      const result = await service.executeSimpleRule(validInput);

      expect(result).toEqual(mockResult);
      expect(goRulesService.executeRule).toHaveBeenCalledWith(
        'simple-rule',
        validInput,
        { timeout: 5000, trace: false }
      );
    });

    it('should handle GoRules exceptions', async () => {
      const goRulesError = new GoRulesException(
        GoRulesErrorCode.TIMEOUT,
        'Rule execution timed out'
      );

      goRulesService.executeRule.mockRejectedValue(goRulesError);

      await expect(service.executeSimpleRule(validInput)).rejects.toThrow(goRulesError);
    });

    it('should wrap generic errors', async () => {
      const genericError = new Error('Network failure');
      goRulesService.executeRule.mockRejectedValue(genericError);

      await expect(service.executeSimpleRule(validInput)).rejects.toThrow(GoRulesException);
    });
  });

  describe('executeRuleWithTracing', () => {
    const validInput = {
      value: 100,
      category: 'trace-test',
    };

    const mockResult = {
      result: 'traced',
      score: 90,
      recommendations: ['Excellent performance'],
    };

    const mockTrace = {
      steps: [
        { id: 'step1', name: 'Input validation', duration: 10 },
        { id: 'step2', name: 'Rule evaluation', duration: 80 },
      ],
      duration: 90,
      rulesEvaluated: ['traced-rule'],
    };

    it('should execute rule with tracing successfully', async () => {
      goRulesService.executeRule.mockResolvedValue({
        result: mockResult,
        performance: { executionTime: 90, networkTime: 20, totalTime: 110 },
        metadata: { id: 'traced-rule', name: 'Traced Rule', version: '1.0.0' },
        trace: mockTrace,
      });

      const result = await service.executeRuleWithTracing(validInput);

      expect(result.result).toEqual(mockResult);
      expect(result.trace).toEqual(mockTrace);
      expect(result.performance).toBeDefined();
      expect(goRulesService.executeRule).toHaveBeenCalledWith(
        'traced-rule',
        validInput,
        { timeout: 10000, trace: true }
      );
    });
  });

  describe('validateAndExecuteRule', () => {
    const ruleId = 'validation-test-rule';
    const validInput = {
      value: 50,
      category: 'validation',
    };

    const mockResult = {
      result: 'validated',
      score: 75,
      recommendations: ['Rule exists and executed'],
    };

    it('should validate and execute rule successfully', async () => {
      goRulesService.validateRuleExists.mockResolvedValue(true);
      goRulesService.executeRule.mockResolvedValue({
        result: mockResult,
        performance: { executionTime: 120, networkTime: 40, totalTime: 160 },
        metadata: { id: ruleId, name: 'Validation Test Rule', version: '1.0.0' },
      });

      const result = await service.validateAndExecuteRule(ruleId, validInput);

      expect(result).toEqual(mockResult);
      expect(goRulesService.validateRuleExists).toHaveBeenCalledWith(ruleId);
      expect(goRulesService.executeRule).toHaveBeenCalledWith(ruleId, validInput);
    });

    it('should throw error if rule does not exist', async () => {
      goRulesService.validateRuleExists.mockResolvedValue(false);

      await expect(service.validateAndExecuteRule(ruleId, validInput)).rejects.toThrow(
        GoRulesException
      );
      expect(goRulesService.executeRule).not.toHaveBeenCalled();
    });
  });

  describe('executeRulesSequentially', () => {
    const rules = [
      { ruleId: 'rule1', input: { value: 10, category: 'seq1' } },
      { ruleId: 'rule2', input: { value: 20, category: 'seq2' } },
      { ruleId: 'rule3', input: { value: 30, category: 'seq3' } },
    ];

    it('should execute all rules successfully', async () => {
      goRulesService.executeRule
        .mockResolvedValueOnce({
          result: { result: 'success1', score: 80, recommendations: [] },
          performance: { executionTime: 100, networkTime: 30, totalTime: 130 },
          metadata: { id: 'rule1', name: 'Rule 1', version: '1.0.0' },
        })
        .mockResolvedValueOnce({
          result: { result: 'success2', score: 85, recommendations: [] },
          performance: { executionTime: 110, networkTime: 35, totalTime: 145 },
          metadata: { id: 'rule2', name: 'Rule 2', version: '1.0.0' },
        })
        .mockResolvedValueOnce({
          result: { result: 'success3', score: 90, recommendations: [] },
          performance: { executionTime: 120, networkTime: 40, totalTime: 160 },
          metadata: { id: 'rule3', name: 'Rule 3', version: '1.0.0' },
        });

      const results = await service.executeRulesSequentially(rules);

      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
      expect(goRulesService.executeRule).toHaveBeenCalledTimes(3);
    });

    it('should handle mixed success and failure', async () => {
      goRulesService.executeRule
        .mockResolvedValueOnce({
          result: { result: 'success1', score: 80, recommendations: [] },
          performance: { executionTime: 100, networkTime: 30, totalTime: 130 },
          metadata: { id: 'rule1', name: 'Rule 1', version: '1.0.0' },
        })
        .mockRejectedValueOnce(new Error('Rule 2 failed'))
        .mockResolvedValueOnce({
          result: { result: 'success3', score: 90, recommendations: [] },
          performance: { executionTime: 120, networkTime: 40, totalTime: 160 },
          metadata: { id: 'rule3', name: 'Rule 3', version: '1.0.0' },
        });

      const results = await service.executeRulesSequentially(rules);

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toBe('Rule 2 failed');
      expect(results[2].success).toBe(true);
    });
  });

  describe('executeRuleWithCustomTimeout', () => {
    const ruleId = 'timeout-test-rule';
    const validInput = { value: 75, category: 'timeout-test' };
    const customTimeout = 15000;

    it('should execute rule with custom timeout successfully', async () => {
      const mockResult = { result: 'timeout-success', score: 95, recommendations: [] };

      goRulesService.executeRule.mockResolvedValue({
        result: mockResult,
        performance: { executionTime: 200, networkTime: 50, totalTime: 250 },
        metadata: { id: ruleId, name: 'Timeout Test Rule', version: '1.0.0' },
      });

      const result = await service.executeRuleWithCustomTimeout(ruleId, validInput, customTimeout);

      expect(result).toEqual(mockResult);
      expect(goRulesService.executeRule).toHaveBeenCalledWith(
        ruleId,
        validInput,
        { timeout: customTimeout, trace: false }
      );
    });
  });

  describe('getRuleInformation', () => {
    const ruleId = 'info-test-rule';

    it('should get rule information successfully', async () => {
      const mockMetadata = {
        id: ruleId,
        name: 'Info Test Rule',
        version: '1.0.0',
        description: 'Test rule for information retrieval',
        tags: ['test', 'info'],
        lastModified: new Date(),
      };

      goRulesService.validateRuleExists.mockResolvedValue(true);
      goRulesService.getRuleMetadata.mockResolvedValue(mockMetadata);

      const result = await service.getRuleInformation(ruleId);

      expect(result.exists).toBe(true);
      expect(result.metadata).toEqual(mockMetadata);
      expect(result.error).toBeUndefined();
    });

    it('should return false for non-existent rule', async () => {
      goRulesService.validateRuleExists.mockResolvedValue(false);

      const result = await service.getRuleInformation(ruleId);

      expect(result.exists).toBe(false);
      expect(result.error).toContain('does not exist');
      expect(goRulesService.getRuleMetadata).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      goRulesService.validateRuleExists.mockRejectedValue(new Error('Validation failed'));

      const result = await service.getRuleInformation(ruleId);

      expect(result.exists).toBe(false);
      expect(result.error).toBe('Validation failed');
    });
  });

  describe('demonstrateErrorHandling', () => {
    const ruleId = 'error-demo-rule';
    const validInput = { value: 60, category: 'error-demo' };

    it('should return success result', async () => {
      const mockResult = { result: 'error-demo-success', score: 88, recommendations: [] };

      goRulesService.executeRule.mockResolvedValue({
        result: mockResult,
        performance: { executionTime: 140, networkTime: 45, totalTime: 185 },
        metadata: { id: ruleId, name: 'Error Demo Rule', version: '1.0.0' },
      });

      const result = await service.demonstrateErrorHandling(ruleId, validInput);

      expect(result.success).toBe(true);
      expect(result.result).toEqual(mockResult);
      expect(result.error).toBeUndefined();
    });

    it('should handle GoRules exceptions gracefully', async () => {
      const goRulesError = new GoRulesException(
        GoRulesErrorCode.RULE_NOT_FOUND,
        'Rule not found',
        { ruleId },
        false
      );

      goRulesService.executeRule.mockRejectedValue(goRulesError);

      const result = await service.demonstrateErrorHandling(ruleId, validInput);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(GoRulesErrorCode.RULE_NOT_FOUND);
      expect(result.error?.message).toBe('Rule not found');
      expect(result.error?.retryable).toBe(false);
      expect(result.error?.details).toEqual({ ruleId });
    });

    it('should handle generic errors gracefully', async () => {
      const genericError = new Error('Generic error');
      goRulesService.executeRule.mockRejectedValue(genericError);

      const result = await service.demonstrateErrorHandling(ruleId, validInput);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('UNKNOWN_ERROR');
      expect(result.error?.message).toBe('Generic error');
      expect(result.error?.retryable).toBe(false);
    });
  });

  describe('getServiceHealth', () => {
    it('should return healthy status', async () => {
      const mockStats = {
        'rule1': { count: 10, averageTime: 150, errorRate: 0.1 },
        'rule2': { count: 5, averageTime: 200, errorRate: 0.0 },
      };

      const mockCircuitBreakers = {
        'rule1': { state: 'CLOSED', failures: 1 },
        'rule2': { state: 'CLOSED', failures: 0 },
      };

      goRulesService.getExecutionStatistics.mockReturnValue(mockStats);
      goRulesService.getCircuitBreakerStatistics.mockReturnValue(mockCircuitBreakers);

      const result = await service.getServiceHealth();

      expect(result.healthy).toBe(true);
      expect(result.statistics).toEqual(mockStats);
      expect(result.circuitBreakers).toEqual(mockCircuitBreakers);
      expect(result.uptime).toBeGreaterThan(0);
    });

    it('should return unhealthy status on error', async () => {
      goRulesService.getExecutionStatistics.mockImplementation(() => {
        throw new Error('Statistics unavailable');
      });

      const result = await service.getServiceHealth();

      expect(result.healthy).toBe(false);
      expect(result.statistics).toBeNull();
      expect(result.circuitBreakers).toBeNull();
      expect(result.uptime).toBeGreaterThan(0);
    });
  });
});