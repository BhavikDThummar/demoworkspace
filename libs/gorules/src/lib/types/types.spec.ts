import {
  RuleExecutionOptions,
  RuleInput,
  BatchRuleExecution,
  ExecutionTrace,
  TraceStep,
  PerformanceMetrics,
  RuleMetadata,
  RuleExecutionResult,
  RuleResult,
  BatchRuleExecutionResult,
  RuleExecutionError,
  GoRulesErrorCode,
  GoRulesException,
  SafeResult,
  RuleInputData,
  TypedRuleExecutionContext,
  RuleExecutionStatus,
  RuleExecutionState,
  RuleValidationResult,
  RuleValidationError,
  RuleValidationWarning,
  RuleExecutionStatistics,
  TypedRuleExecutionOptions,
  HttpMethod,
  HttpStatusCode,
  ApiRequestConfig,
  ApiResponse,
  ApiErrorResponse,
  PaginatedResponse,
  PaginationOptions,
  GoRulesApiEndpoints,
  ApiClientConfig,
  RateLimitInfo,
  HealthCheckResponse
} from './index.js';

describe('Type Definitions', () => {
  describe('Basic Rule Types', () => {
    it('should create valid RuleExecutionOptions', () => {
      const options: RuleExecutionOptions = {
        timeout: 5000,
        trace: true,
        context: { userId: '123', sessionId: 'abc' }
      };

      expect(options.timeout).toBe(5000);
      expect(options.trace).toBe(true);
      expect(options.context).toEqual({ userId: '123', sessionId: 'abc' });
    });

    it('should create valid RuleInput', () => {
      const input: RuleInput = {
        amount: 1000,
        currency: 'USD',
        customer: {
          id: '123',
          tier: 'premium'
        }
      };

      expect(input.amount).toBe(1000);
      expect(input.currency).toBe('USD');
      expect(input.customer).toEqual({ id: '123', tier: 'premium' });
    });

    it('should create valid BatchRuleExecution', () => {
      const batchExecution: BatchRuleExecution = {
        ruleId: 'pricing-rule',
        input: { amount: 100 },
        executionId: 'exec-123',
        options: { timeout: 3000 }
      };

      expect(batchExecution.ruleId).toBe('pricing-rule');
      expect(batchExecution.input).toEqual({ amount: 100 });
      expect(batchExecution.executionId).toBe('exec-123');
    });
  });

  describe('Execution Results', () => {
    it('should create valid RuleExecutionResult', () => {
      const result: RuleExecutionResult<{ approved: boolean }> = {
        result: { approved: true },
        performance: {
          executionTime: 150,
          networkTime: 50,
          totalTime: 200
        },
        metadata: {
          id: 'rule-123',
          name: 'Approval Rule',
          version: '1.0.0',
          lastModified: new Date()
        }
      };

      expect(result.result.approved).toBe(true);
      expect(result.performance.totalTime).toBe(200);
      expect(result.metadata.name).toBe('Approval Rule');
    });

    it('should create valid BatchRuleExecutionResult', () => {
      const batchResult: BatchRuleExecutionResult<{ score: number }> = {
        executionId: 'batch-123',
        ruleId: 'scoring-rule',
        result: {
          decision: { score: 85 },
          appliedRules: ['scoring-rule'],
          warnings: []
        }
      };

      expect(batchResult.executionId).toBe('batch-123');
      expect(batchResult.result.decision.score).toBe(85);
    });
  });

  describe('Error Handling', () => {
    it('should create valid GoRulesException', () => {
      const exception = new GoRulesException(
        GoRulesErrorCode.RULE_NOT_FOUND,
        'Rule not found',
        { ruleId: 'missing-rule' },
        false
      );

      expect(exception.code).toBe(GoRulesErrorCode.RULE_NOT_FOUND);
      expect(exception.message).toBe('Rule not found');
      expect(exception.details).toEqual({ ruleId: 'missing-rule' });
      expect(exception.retryable).toBe(false);
      expect(exception.name).toBe('GoRulesException');
    });

    it('should create valid RuleExecutionError', () => {
      const error: RuleExecutionError = {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input data',
        details: { field: 'amount', value: -100 },
        retryable: false
      };

      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.message).toBe('Invalid input data');
      expect(error.retryable).toBe(false);
    });
  });

  describe('Advanced Types', () => {
    it('should create valid TypedRuleExecutionContext', () => {
      const context: TypedRuleExecutionContext<{ amount: number }> = {
        input: { amount: 1000 },
        context: { userId: '123' },
        metadata: {
          timestamp: new Date(),
          initiator: 'user-service',
          correlationId: 'corr-123'
        }
      };

      expect(context.input.amount).toBe(1000);
      expect(context.metadata?.initiator).toBe('user-service');
    });

    it('should create valid RuleExecutionState', () => {
      const state: RuleExecutionState = {
        executionId: 'exec-123',
        ruleId: 'complex-rule',
        status: RuleExecutionStatus.RUNNING,
        input: { data: 'test' },
        timestamps: {
          created: new Date(),
          started: new Date()
        },
        progress: {
          currentStep: 2,
          totalSteps: 5,
          percentage: 40,
          description: 'Processing data validation'
        }
      };

      expect(state.status).toBe(RuleExecutionStatus.RUNNING);
      expect(state.progress?.percentage).toBe(40);
    });

    it('should create valid RuleValidationResult', () => {
      const validation: RuleValidationResult = {
        isValid: false,
        errors: [{
          code: 'MISSING_FIELD',
          message: 'Required field is missing',
          path: 'input.amount'
        }],
        warnings: [{
          code: 'DEPRECATED_FIELD',
          message: 'Field is deprecated',
          path: 'input.oldField'
        }],
        schema: {
          input: { amount: 'number', currency: 'string' }
        }
      };

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toHaveLength(1);
      expect(validation.warnings).toHaveLength(1);
    });

    it('should create valid RuleExecutionStatistics', () => {
      const stats: RuleExecutionStatistics = {
        ruleId: 'popular-rule',
        totalExecutions: 1000,
        successfulExecutions: 950,
        failedExecutions: 50,
        averageExecutionTime: 125.5,
        minExecutionTime: 50,
        maxExecutionTime: 500,
        successRate: 0.95,
        timeRange: {
          from: new Date('2024-01-01'),
          to: new Date('2024-01-31')
        }
      };

      expect(stats.successRate).toBe(0.95);
      expect(stats.totalExecutions).toBe(1000);
    });
  });

  describe('API Types', () => {
    it('should create valid ApiRequestConfig', () => {
      const config: ApiRequestConfig = {
        method: 'POST',
        url: '/api/rules/execute',
        headers: { 'Content-Type': 'application/json' },
        body: { ruleId: 'test-rule', input: {} },
        timeout: 5000,
        retries: 3
      };

      expect(config.method).toBe('POST');
      expect(config.timeout).toBe(5000);
    });

    it('should create valid ApiResponse', () => {
      const response: ApiResponse<{ result: boolean }> = {
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        data: { result: true },
        metadata: {
          duration: 150,
          timestamp: new Date(),
          requestId: 'req-123'
        }
      };

      expect(response.status).toBe(200);
      expect(response.data.result).toBe(true);
    });

    it('should create valid PaginatedResponse', () => {
      const paginated: PaginatedResponse<{ id: string; name: string }> = {
        items: [
          { id: '1', name: 'Rule 1' },
          { id: '2', name: 'Rule 2' }
        ],
        pagination: {
          page: 1,
          pageSize: 10,
          totalItems: 25,
          totalPages: 3,
          hasNext: true,
          hasPrevious: false
        }
      };

      expect(paginated.items).toHaveLength(2);
      expect(paginated.pagination.hasNext).toBe(true);
    });

    it('should create valid HealthCheckResponse', () => {
      const health: HealthCheckResponse = {
        status: 'healthy',
        version: '1.2.3',
        timestamp: new Date(),
        details: {
          database: 'connected',
          dependencies: {
            'auth-service': 'available',
            'cache-service': 'available'
          },
          metrics: {
            cpu: 45.2,
            memory: 67.8,
            disk: 23.1
          }
        }
      };

      expect(health.status).toBe('healthy');
      expect(health.details?.metrics?.cpu).toBe(45.2);
    });
  });

  describe('Utility Types', () => {
    it('should create valid SafeResult', () => {
      const successResult: SafeResult<string> = {
        success: true,
        result: 'Operation completed'
      };

      const errorResult: SafeResult<string> = {
        success: false,
        error: 'Operation failed'
      };

      expect(successResult.success).toBe(true);
      expect(successResult.result).toBe('Operation completed');
      expect(errorResult.success).toBe(false);
      expect(errorResult.error).toBe('Operation failed');
    });

    it('should work with RuleInputData type', () => {
      const inputData: RuleInputData = {
        stringField: 'test',
        numberField: 42,
        booleanField: true,
        objectField: { nested: 'value' },
        arrayField: [1, 2, 3]
      };

      expect(typeof inputData.stringField).toBe('string');
      expect(typeof inputData.numberField).toBe('number');
      expect(typeof inputData.booleanField).toBe('boolean');
    });
  });

  describe('Enums', () => {
    it('should have correct GoRulesErrorCode values', () => {
      expect(GoRulesErrorCode.AUTHENTICATION_FAILED).toBe('AUTH_FAILED');
      expect(GoRulesErrorCode.RULE_NOT_FOUND).toBe('RULE_NOT_FOUND');
      expect(GoRulesErrorCode.INVALID_INPUT).toBe('INVALID_INPUT');
      expect(GoRulesErrorCode.NETWORK_ERROR).toBe('NETWORK_ERROR');
      expect(GoRulesErrorCode.TIMEOUT).toBe('TIMEOUT');
      expect(GoRulesErrorCode.RATE_LIMIT_EXCEEDED).toBe('RATE_LIMIT');
      expect(GoRulesErrorCode.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
    });

    it('should have correct RuleExecutionStatus values', () => {
      expect(RuleExecutionStatus.PENDING).toBe('PENDING');
      expect(RuleExecutionStatus.RUNNING).toBe('RUNNING');
      expect(RuleExecutionStatus.COMPLETED).toBe('COMPLETED');
      expect(RuleExecutionStatus.FAILED).toBe('FAILED');
      expect(RuleExecutionStatus.CANCELLED).toBe('CANCELLED');
    });

    it('should have correct HttpStatusCode values', () => {
      expect(HttpStatusCode.OK).toBe(200);
      expect(HttpStatusCode.BAD_REQUEST).toBe(400);
      expect(HttpStatusCode.UNAUTHORIZED).toBe(401);
      expect(HttpStatusCode.NOT_FOUND).toBe(404);
      expect(HttpStatusCode.INTERNAL_SERVER_ERROR).toBe(500);
    });
  });
});