import { Injectable, Logger } from '@nestjs/common';
import { GoRulesConfigService } from '../config/gorules.config.js';
import {
  GoRulesException,
  GoRulesErrorCode,
} from '../types/index.js';

/**
 * Configuration for retry behavior
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxAttempts: number;
  
  /** Base delay in milliseconds */
  baseDelay: number;
  
  /** Maximum delay in milliseconds */
  maxDelay: number;
  
  /** Exponential backoff multiplier */
  backoffMultiplier: number;
  
  /** Jitter factor (0-1) to add randomness */
  jitterFactor: number;
  
  /** Function to determine if an error should be retried */
  shouldRetry?: (error: unknown, attempt: number) => boolean;
}

/**
 * Configuration for circuit breaker behavior
 */
export interface CircuitBreakerConfig {
  /** Number of failures before opening the circuit */
  failureThreshold: number;
  
  /** Time in milliseconds to wait before attempting to close the circuit */
  resetTimeout: number;
  
  /** Number of successful calls needed to close the circuit */
  successThreshold: number;
  
  /** Timeout for individual requests in milliseconds */
  requestTimeout: number;
}

/**
 * Circuit breaker states
 */
export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

/**
 * Circuit breaker statistics
 */
export interface CircuitBreakerStats {
  state: CircuitBreakerState;
  failureCount: number;
  successCount: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
}

/**
 * Rate limiter configuration
 */
export interface RateLimiterConfig {
  /** Maximum number of requests per window */
  maxRequests: number;
  
  /** Time window in milliseconds */
  windowSize: number;
  
  /** Strategy for handling rate limit exceeded */
  strategy: 'reject' | 'queue' | 'delay';
  
  /** Maximum queue size (for queue strategy) */
  maxQueueSize?: number;
}

/**
 * Comprehensive resilience service for GoRules operations
 */
@Injectable()
export class GoRulesResilienceService {
  private readonly logger = new Logger(GoRulesResilienceService.name);
  
  // Circuit breaker state per operation
  private circuitBreakers = new Map<string, {
    state: CircuitBreakerState;
    failureCount: number;
    successCount: number;
    lastFailureTime?: Date;
    lastSuccessTime?: Date;
    totalRequests: number;
    totalFailures: number;
    totalSuccesses: number;
    config: CircuitBreakerConfig;
  }>();
  
  // Rate limiter state per operation
  private rateLimiters = new Map<string, {
    requests: Array<{ timestamp: number; resolve: () => void; reject: (error: Error) => void }>;
    config: RateLimiterConfig;
  }>();

  constructor(private readonly configService: GoRulesConfigService) {}

  /**
   * Execute a function with retry logic
   */
  async withRetry<T>(
    operation: () => Promise<T>,
    config?: Partial<RetryConfig>,
    operationName = 'unknown'
  ): Promise<T> {
    const retryConfig = this.getRetryConfig(config);
    let lastError: unknown;

    for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
      try {
        if (attempt > 1) {
          const delay = this.calculateDelay(attempt - 1, retryConfig);
          
          this.logger.debug(`Retrying operation '${operationName}' (attempt ${attempt}/${retryConfig.maxAttempts}) after ${delay}ms`, {
            operationName,
            attempt,
            maxAttempts: retryConfig.maxAttempts,
            delay,
          });
          
          await this.sleep(delay);
        }

        const result = await operation();
        
        if (attempt > 1) {
          this.logger.log(`Operation '${operationName}' succeeded on attempt ${attempt}`, {
            operationName,
            attempt,
            totalAttempts: attempt,
          });
        }
        
        return result;
      } catch (error) {
        lastError = error;
        
        // Check if we should retry this error
        if (!this.shouldRetryError(error, attempt, retryConfig)) {
          this.logger.debug(`Not retrying operation '${operationName}' due to non-retryable error`, {
            operationName,
            attempt,
            error: error instanceof Error ? error.message : String(error),
          });
          break;
        }

        if (attempt === retryConfig.maxAttempts) {
          this.logger.error(`Operation '${operationName}' failed after ${retryConfig.maxAttempts} attempts`, {
            operationName,
            totalAttempts: retryConfig.maxAttempts,
            finalError: error instanceof Error ? error.message : String(error),
          });
          break;
        }

        this.logger.warn(`Operation '${operationName}' failed on attempt ${attempt}, will retry`, {
          operationName,
          attempt,
          maxAttempts: retryConfig.maxAttempts,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // All attempts failed
    throw this.wrapRetryError(lastError, retryConfig.maxAttempts, operationName);
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async withCircuitBreaker<T>(
    operation: () => Promise<T>,
    operationName: string,
    config?: Partial<CircuitBreakerConfig>
  ): Promise<T> {
    const circuitConfig = this.getCircuitBreakerConfig(config);
    const breaker = this.getOrCreateCircuitBreaker(operationName, circuitConfig);

    // Check circuit state
    this.updateCircuitBreakerState(breaker);

    if (breaker.state === CircuitBreakerState.OPEN) {
      throw new GoRulesException(
        GoRulesErrorCode.NETWORK_ERROR,
        `Circuit breaker is OPEN for operation '${operationName}'`,
        {
          operationName,
          circuitState: breaker.state,
          failureCount: breaker.failureCount,
          lastFailureTime: breaker.lastFailureTime,
        },
        true
      );
    }

    breaker.totalRequests++;

    try {
      // Execute with timeout
      const result = await this.executeWithTimeout(operation, circuitConfig.requestTimeout);
      
      // Success
      breaker.successCount++;
      breaker.totalSuccesses++;
      breaker.lastSuccessTime = new Date();
      
      // Reset failure count on success
      if (breaker.state === CircuitBreakerState.HALF_OPEN) {
        if (breaker.successCount >= circuitConfig.successThreshold) {
          breaker.state = CircuitBreakerState.CLOSED;
          breaker.failureCount = 0;
          breaker.successCount = 0;
          
          this.logger.log(`Circuit breaker CLOSED for operation '${operationName}'`, {
            operationName,
            successCount: breaker.successCount,
          });
        }
      } else if (breaker.state === CircuitBreakerState.CLOSED) {
        breaker.failureCount = 0; // Reset failure count on success
      }

      return result;
    } catch (error) {
      // Failure
      breaker.failureCount++;
      breaker.totalFailures++;
      breaker.lastFailureTime = new Date();
      
      // Check if we should open the circuit
      if (breaker.state === CircuitBreakerState.CLOSED && 
          breaker.failureCount >= circuitConfig.failureThreshold) {
        breaker.state = CircuitBreakerState.OPEN;
        breaker.successCount = 0;
        
        this.logger.warn(`Circuit breaker OPENED for operation '${operationName}'`, {
          operationName,
          failureCount: breaker.failureCount,
          threshold: circuitConfig.failureThreshold,
        });
      } else if (breaker.state === CircuitBreakerState.HALF_OPEN) {
        breaker.state = CircuitBreakerState.OPEN;
        breaker.successCount = 0;
        
        this.logger.warn(`Circuit breaker returned to OPEN state for operation '${operationName}'`, {
          operationName,
          failureCount: breaker.failureCount,
        });
      }

      throw error;
    }
  }

  /**
   * Execute a function with rate limiting
   */
  async withRateLimit<T>(
    operation: () => Promise<T>,
    operationName: string,
    config?: Partial<RateLimiterConfig>
  ): Promise<T> {
    const rateLimitConfig = this.getRateLimiterConfig(config);
    const limiter = this.getOrCreateRateLimiter(operationName, rateLimitConfig);

    // Clean up old requests
    const now = Date.now();
    limiter.requests = limiter.requests.filter(req => 
      now - req.timestamp < rateLimitConfig.windowSize
    );

    // Check if we're at the limit
    if (limiter.requests.length >= rateLimitConfig.maxRequests) {
      switch (rateLimitConfig.strategy) {
        case 'reject':
          throw new GoRulesException(
            GoRulesErrorCode.RATE_LIMIT_EXCEEDED,
            `Rate limit exceeded for operation '${operationName}'`,
            {
              operationName,
              currentRequests: limiter.requests.length,
              maxRequests: rateLimitConfig.maxRequests,
              windowSize: rateLimitConfig.windowSize,
            },
            true
          );

        case 'queue':
          if (limiter.requests.length >= (rateLimitConfig.maxQueueSize || rateLimitConfig.maxRequests * 2)) {
            throw new GoRulesException(
              GoRulesErrorCode.RATE_LIMIT_EXCEEDED,
              `Rate limit queue full for operation '${operationName}'`,
              {
                operationName,
                queueSize: limiter.requests.length,
                maxQueueSize: rateLimitConfig.maxQueueSize,
              },
              true
            );
          }
          
          // Wait for a slot to become available
          await this.waitForRateLimitSlot(limiter, rateLimitConfig);
          break;

        case 'delay':
          // Calculate delay until next slot is available
          { const oldestRequest = limiter.requests[0];
          const delay = rateLimitConfig.windowSize - (now - oldestRequest.timestamp);
          
          if (delay > 0) {
            this.logger.debug(`Rate limiting: delaying operation '${operationName}' by ${delay}ms`, {
              operationName,
              delay,
            });
            
            await this.sleep(delay);
          }
          break; }
      }
    }

    // Add request to the limiter
    const requestEntry = {
      timestamp: now,
      resolve: () => {},
      reject: () => {},
    };
    limiter.requests.push(requestEntry);

    try {
      return await operation();
    } finally {
      // Remove the request from the limiter
      const index = limiter.requests.indexOf(requestEntry);
      if (index > -1) {
        limiter.requests.splice(index, 1);
      }
    }
  }

  /**
   * Execute a function with comprehensive resilience (retry + circuit breaker + rate limiting)
   */
  async withResilience<T>(
    operation: () => Promise<T>,
    operationName: string,
    options?: {
      retry?: Partial<RetryConfig>;
      circuitBreaker?: Partial<CircuitBreakerConfig>;
      rateLimit?: Partial<RateLimiterConfig>;
    }
  ): Promise<T> {
    // Apply rate limiting first
    if (options?.rateLimit) {
      return this.withRateLimit(
        () => this.withCircuitBreakerAndRetry(operation, operationName, options),
        operationName,
        options.rateLimit
      );
    }

    return this.withCircuitBreakerAndRetry(operation, operationName, options);
  }

  /**
   * Get circuit breaker statistics
   */
  getCircuitBreakerStats(operationName: string): CircuitBreakerStats | null {
    const breaker = this.circuitBreakers.get(operationName);
    if (!breaker) {
      return null;
    }

    return {
      state: breaker.state,
      failureCount: breaker.failureCount,
      successCount: breaker.successCount,
      lastFailureTime: breaker.lastFailureTime,
      lastSuccessTime: breaker.lastSuccessTime,
      totalRequests: breaker.totalRequests,
      totalFailures: breaker.totalFailures,
      totalSuccesses: breaker.totalSuccesses,
    };
  }

  /**
   * Reset circuit breaker for an operation
   */
  resetCircuitBreaker(operationName: string): void {
    const breaker = this.circuitBreakers.get(operationName);
    if (breaker) {
      breaker.state = CircuitBreakerState.CLOSED;
      breaker.failureCount = 0;
      breaker.successCount = 0;
      
      this.logger.log(`Circuit breaker reset for operation '${operationName}'`, {
        operationName,
      });
    }
  }

  /**
   * Get all circuit breaker statistics
   */
  getAllCircuitBreakerStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {};
    
    this.circuitBreakers.forEach((breaker, operationName) => {
      stats[operationName] = {
        state: breaker.state,
        failureCount: breaker.failureCount,
        successCount: breaker.successCount,
        lastFailureTime: breaker.lastFailureTime,
        lastSuccessTime: breaker.lastSuccessTime,
        totalRequests: breaker.totalRequests,
        totalFailures: breaker.totalFailures,
        totalSuccesses: breaker.totalSuccesses,
      };
    });

    return stats;
  }

  /**
   * Execute with circuit breaker and retry
   */
  private async withCircuitBreakerAndRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    options?: {
      retry?: Partial<RetryConfig>;
      circuitBreaker?: Partial<CircuitBreakerConfig>;
    }
  ): Promise<T> {
    if (options?.circuitBreaker) {
      return this.withCircuitBreaker(
        () => this.withRetry(operation, options?.retry, operationName),
        operationName,
        options.circuitBreaker
      );
    }

    if (options?.retry) {
      return this.withRetry(operation, options.retry, operationName);
    }

    return operation();
  }

  /**
   * Get retry configuration with defaults
   */
  private getRetryConfig(config?: Partial<RetryConfig>): RetryConfig {
    const goRulesConfig = this.configService.getConfig();
    
    return {
      maxAttempts: config?.maxAttempts ?? goRulesConfig.retryAttempts ?? 3,
      baseDelay: config?.baseDelay ?? 100,
      maxDelay: config?.maxDelay ?? 30000,
      backoffMultiplier: config?.backoffMultiplier ?? 2,
      jitterFactor: config?.jitterFactor ?? 0.1,
      shouldRetry: config?.shouldRetry,
    };
  }

  /**
   * Get circuit breaker configuration with defaults
   */
  private getCircuitBreakerConfig(config?: Partial<CircuitBreakerConfig>): CircuitBreakerConfig {
    const goRulesConfig = this.configService.getConfig();
    
    return {
      failureThreshold: config?.failureThreshold ?? 5,
      resetTimeout: config?.resetTimeout ?? 60000, // 1 minute
      successThreshold: config?.successThreshold ?? 3,
      requestTimeout: config?.requestTimeout ?? goRulesConfig.timeout ?? 30000,
    };
  }

  /**
   * Get rate limiter configuration with defaults
   */
  private getRateLimiterConfig(config?: Partial<RateLimiterConfig>): RateLimiterConfig {
    return {
      maxRequests: config?.maxRequests ?? 100,
      windowSize: config?.windowSize ?? 60000, // 1 minute
      strategy: config?.strategy ?? 'delay',
      maxQueueSize: config?.maxQueueSize ?? 200,
    };
  }

  /**
   * Calculate delay for exponential backoff with jitter
   */
  private calculateDelay(attempt: number, config: RetryConfig): number {
    const exponentialDelay = Math.min(
      config.baseDelay * Math.pow(config.backoffMultiplier, attempt),
      config.maxDelay
    );

    // Add jitter
    const jitter = exponentialDelay * config.jitterFactor * Math.random();
    
    return Math.floor(exponentialDelay + jitter);
  }

  /**
   * Determine if an error should be retried
   */
  private shouldRetryError(error: unknown, attempt: number, config: RetryConfig): boolean {
    // Use custom retry logic if provided
    if (config.shouldRetry) {
      return config.shouldRetry(error, attempt);
    }

    // Default retry logic
    if (error instanceof GoRulesException) {
      return error.retryable;
    }

    // Check error message for retryable patterns
    const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    
    return (
      errorMessage.includes('timeout') ||
      errorMessage.includes('network') ||
      errorMessage.includes('connection') ||
      errorMessage.includes('temporary') ||
      errorMessage.includes('rate limit') ||
      errorMessage.includes('service unavailable') ||
      errorMessage.includes('bad gateway') ||
      errorMessage.includes('gateway timeout')
    );
  }

  /**
   * Wrap retry error with additional context
   */
  private wrapRetryError(error: unknown, maxAttempts: number, operationName: string): GoRulesException {
    if (error instanceof GoRulesException) {
      return new GoRulesException(
        error.code,
        `${error.message} (after ${maxAttempts} attempts)`,
        {
          ...(error.details || {}),
          operationName,
          maxAttempts,
          originalError: error,
        },
        error.retryable
      );
    }

    return new GoRulesException(
      GoRulesErrorCode.INTERNAL_ERROR,
      `Operation failed after ${maxAttempts} attempts: ${error instanceof Error ? error.message : String(error)}`,
      {
        operationName,
        maxAttempts,
        originalError: error,
      },
      false
    );
  }

  /**
   * Get or create circuit breaker for an operation
   */
  private getOrCreateCircuitBreaker(operationName: string, config: CircuitBreakerConfig) {
    let breaker = this.circuitBreakers.get(operationName);
    
    if (!breaker) {
      breaker = {
        state: CircuitBreakerState.CLOSED,
        failureCount: 0,
        successCount: 0,
        totalRequests: 0,
        totalFailures: 0,
        totalSuccesses: 0,
        config,
      };
      
      this.circuitBreakers.set(operationName, breaker);
    }

    return breaker;
  }

  /**
   * Update circuit breaker state based on time
   */
  private updateCircuitBreakerState(breaker: any): void {
    if (breaker.state === CircuitBreakerState.OPEN && breaker.lastFailureTime) {
      const timeSinceLastFailure = Date.now() - breaker.lastFailureTime.getTime();
      
      if (timeSinceLastFailure >= breaker.config.resetTimeout) {
        breaker.state = CircuitBreakerState.HALF_OPEN;
        breaker.successCount = 0;
        
        this.logger.debug(`Circuit breaker moved to HALF_OPEN state`, {
          timeSinceLastFailure,
          resetTimeout: breaker.config.resetTimeout,
        });
      }
    }
  }

  /**
   * Get or create rate limiter for an operation
   */
  private getOrCreateRateLimiter(operationName: string, config: RateLimiterConfig) {
    let limiter = this.rateLimiters.get(operationName);
    
    if (!limiter) {
      limiter = {
        requests: [],
        config,
      };
      
      this.rateLimiters.set(operationName, limiter);
    }

    return limiter;
  }

  /**
   * Wait for a rate limit slot to become available
   */
  private async waitForRateLimitSlot(limiter: any, config: RateLimiterConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      const checkSlot = () => {
        const now = Date.now();
        limiter.requests = limiter.requests.filter((req: any) => 
          now - req.timestamp < config.windowSize
        );

        if (limiter.requests.length < config.maxRequests) {
          resolve();
        } else {
          // Check again after a short delay
          setTimeout(checkSlot, 100);
        }
      };

      checkSlot();
    });
  }

  /**
   * Execute operation with timeout
   */
  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new GoRulesException(
          GoRulesErrorCode.TIMEOUT,
          `Operation timeout after ${timeoutMs}ms`,
          { timeout: timeoutMs },
          true
        ));
      }, timeoutMs);

      operation()
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}