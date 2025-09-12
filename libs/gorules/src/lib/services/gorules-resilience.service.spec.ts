import { Test, TestingModule } from '@nestjs/testing';
import { GoRulesResilienceService, CircuitBreakerState } from './gorules-resilience.service.js';
import { GoRulesConfigService } from '../config/gorules.config.js';
import { GoRulesException, GoRulesErrorCode, GoRulesConfig } from '../types/index.js';

describe('GoRulesResilienceService', () => {
  let service: GoRulesResilienceService;
  let configService: jest.Mocked<GoRulesConfigService>;

  const mockConfig: GoRulesConfig = {
    apiUrl: 'https://test.gorules.io',
    apiKey: 'test-api-key',
    projectId: 'test-project-id',
    timeout: 30000,
    retryAttempts: 3,
    enableLogging: false,
  };

  beforeEach(async () => {
    const mockConfigService = {
      getConfig: jest.fn().mockReturnValue(mockConfig),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoRulesResilienceService,
        { provide: GoRulesConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<GoRulesResilienceService>(GoRulesResilienceService);
    configService = module.get(GoRulesConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await service.withRetry(operation, undefined, 'test-operation');

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('network timeout'))
        .mockRejectedValueOnce(new Error('connection failed'))
        .mockResolvedValueOnce('success');

      const result = await service.withRetry(
        operation,
        { maxAttempts: 3, baseDelay: 10 },
        'test-operation'
      );

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-retryable errors', async () => {
      const nonRetryableError = new GoRulesException(
        GoRulesErrorCode.INVALID_INPUT,
        'Invalid input',
        {},
        false
      );
      const operation = jest.fn().mockRejectedValue(nonRetryableError);

      await expect(service.withRetry(operation, undefined, 'test-operation'))
        .rejects.toThrow('Invalid input');

      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should fail after max attempts', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('persistent error'));

      await expect(service.withRetry(
        operation,
        { maxAttempts: 2, baseDelay: 10 },
        'test-operation'
      )).rejects.toThrow('Operation failed after 2 attempts');

      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should use custom shouldRetry function', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('custom error'));
      const shouldRetry = jest.fn().mockReturnValue(false);

      await expect(service.withRetry(
        operation,
        { maxAttempts: 3, shouldRetry },
        'test-operation'
      )).rejects.toThrow('custom error');

      expect(operation).toHaveBeenCalledTimes(1);
      expect(shouldRetry).toHaveBeenCalledWith(expect.any(Error), 1);
    });

    it('should calculate exponential backoff with jitter', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('error 1'))
        .mockRejectedValueOnce(new Error('error 2'))
        .mockResolvedValueOnce('success');

      const startTime = Date.now();
      
      const result = await service.withRetry(
        operation,
        { 
          maxAttempts: 3, 
          baseDelay: 100, 
          backoffMultiplier: 2, 
          jitterFactor: 0.1 
        },
        'test-operation'
      );

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      expect(result).toBe('success');
      expect(totalTime).toBeGreaterThan(200); // At least base delays
      expect(operation).toHaveBeenCalledTimes(3);
    });
  });

  describe('withCircuitBreaker', () => {
    it('should execute successfully when circuit is closed', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await service.withCircuitBreaker(
        operation,
        'test-operation',
        { failureThreshold: 3, requestTimeout: 1000 }
      );

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should open circuit after failure threshold', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('service error'));
      const config = { failureThreshold: 2, requestTimeout: 1000 };

      // First failure
      await expect(service.withCircuitBreaker(operation, 'test-operation', config))
        .rejects.toThrow('service error');

      // Second failure - should open circuit
      await expect(service.withCircuitBreaker(operation, 'test-operation', config))
        .rejects.toThrow('service error');

      // Third attempt - circuit should be open
      await expect(service.withCircuitBreaker(operation, 'test-operation', config))
        .rejects.toThrow('Circuit breaker is OPEN');

      expect(operation).toHaveBeenCalledTimes(2);

      const stats = service.getCircuitBreakerStats('test-operation');
      expect(stats?.state).toBe(CircuitBreakerState.OPEN);
      expect(stats?.failureCount).toBe(2);
    });

    it('should transition to half-open after reset timeout', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('service error'));
      const config = { 
        failureThreshold: 1, 
        resetTimeout: 100, 
        requestTimeout: 1000 
      };

      // Trigger circuit open
      await expect(service.withCircuitBreaker(operation, 'test-operation', config))
        .rejects.toThrow('service error');

      // Verify circuit is open
      await expect(service.withCircuitBreaker(operation, 'test-operation', config))
        .rejects.toThrow('Circuit breaker is OPEN');

      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should now be in half-open state and allow one request
      operation.mockResolvedValueOnce('success');
      
      const result = await service.withCircuitBreaker(operation, 'test-operation', config);
      expect(result).toBe('success');

      const stats = service.getCircuitBreakerStats('test-operation');
      expect(stats?.state).toBe(CircuitBreakerState.CLOSED);
    });

    it('should handle timeout errors', async () => {
      const operation = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('too slow'), 2000))
      );

      await expect(service.withCircuitBreaker(
        operation,
        'test-operation',
        { failureThreshold: 1, requestTimeout: 100 }
      )).rejects.toThrow('Operation timeout after 100ms');
    });

    it('should reset circuit breaker manually', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('service error'));
      const config = { failureThreshold: 1, requestTimeout: 1000 };

      // Open the circuit
      await expect(service.withCircuitBreaker(operation, 'test-operation', config))
        .rejects.toThrow('service error');

      // Verify circuit is open
      let stats = service.getCircuitBreakerStats('test-operation');
      expect(stats?.state).toBe(CircuitBreakerState.OPEN);

      // Reset manually
      service.resetCircuitBreaker('test-operation');

      // Verify circuit is closed
      stats = service.getCircuitBreakerStats('test-operation');
      expect(stats?.state).toBe(CircuitBreakerState.CLOSED);
    });
  });

  describe('withRateLimit', () => {
    it('should allow requests within limit', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const promises = Array.from({ length: 3 }, () =>
        service.withRateLimit(
          operation,
          'test-operation',
          { maxRequests: 5, windowSize: 1000, strategy: 'reject' }
        )
      );

      const results = await Promise.all(promises);
      
      expect(results).toEqual(['success', 'success', 'success']);
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should reject requests when limit exceeded with reject strategy', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const config = { maxRequests: 2, windowSize: 1000, strategy: 'reject' as const };

      // First two requests should succeed
      await service.withRateLimit(operation, 'test-operation', config);
      await service.withRateLimit(operation, 'test-operation', config);

      // Third request should be rejected
      await expect(service.withRateLimit(operation, 'test-operation', config))
        .rejects.toThrow('Rate limit exceeded');

      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should delay requests when limit exceeded with delay strategy', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const config = { maxRequests: 1, windowSize: 200, strategy: 'delay' as const };

      const startTime = Date.now();

      // First request should succeed immediately
      await service.withRateLimit(operation, 'test-operation', config);

      // Second request should be delayed
      await service.withRateLimit(operation, 'test-operation', config);

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeGreaterThan(150); // Should have been delayed
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });

  describe('withResilience', () => {
    it('should combine retry, circuit breaker, and rate limiting', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('temporary error'))
        .mockResolvedValueOnce('success');

      const result = await service.withResilience(
        operation,
        'test-operation',
        {
          retry: { maxAttempts: 2, baseDelay: 10 },
          circuitBreaker: { failureThreshold: 5, requestTimeout: 1000 },
          rateLimit: { maxRequests: 10, windowSize: 1000, strategy: 'reject' },
        }
      );

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should work without rate limiting', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await service.withResilience(
        operation,
        'test-operation',
        {
          retry: { maxAttempts: 1 },
          circuitBreaker: { failureThreshold: 5, requestTimeout: 1000 },
        }
      );

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });
  });

  describe('statistics and monitoring', () => {
    it('should track circuit breaker statistics', async () => {
      const operation = jest.fn()
        .mockResolvedValueOnce('success')
        .mockRejectedValueOnce(new Error('error'))
        .mockResolvedValueOnce('success');

      await service.withCircuitBreaker(operation, 'test-op', { failureThreshold: 5 });
      
      try {
        await service.withCircuitBreaker(operation, 'test-op', { failureThreshold: 5 });
      } catch {
        // Expected error
      }
      
      await service.withCircuitBreaker(operation, 'test-op', { failureThreshold: 5 });

      const stats = service.getCircuitBreakerStats('test-op');
      
      expect(stats).toEqual({
        state: CircuitBreakerState.CLOSED,
        failureCount: 0, // Reset on success
        successCount: 0,
        lastFailureTime: expect.any(Date),
        lastSuccessTime: expect.any(Date),
        totalRequests: 3,
        totalFailures: 1,
        totalSuccesses: 2,
      });
    });

    it('should return all circuit breaker statistics', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      await service.withCircuitBreaker(operation, 'op1', { failureThreshold: 5 });
      await service.withCircuitBreaker(operation, 'op2', { failureThreshold: 5 });

      const allStats = service.getAllCircuitBreakerStats();
      
      expect(Object.keys(allStats)).toContain('op1');
      expect(Object.keys(allStats)).toContain('op2');
      expect(allStats['op1'].totalRequests).toBe(1);
      expect(allStats['op2'].totalRequests).toBe(1);
    });

    it('should return null for non-existent circuit breaker', () => {
      const stats = service.getCircuitBreakerStats('non-existent');
      expect(stats).toBeNull();
    });
  });
});