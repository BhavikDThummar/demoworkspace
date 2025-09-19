/**
 * Minimal error classes for the GoRules engine
 */

/**
 * Error codes for minimal GoRules engine
 */
export enum MinimalErrorCode {
  RULE_NOT_FOUND = 'RULE_NOT_FOUND',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  INVALID_INPUT = 'INVALID_INPUT',
  EXECUTION_ERROR = 'EXECUTION_ERROR',
  CONFIG_ERROR = 'CONFIG_ERROR',
  CACHE_ERROR = 'CACHE_ERROR'
}

/**
 * Base error class for minimal GoRules engine
 */
export class MinimalGoRulesError extends Error {
  constructor(
    public readonly code: MinimalErrorCode,
    message: string,
    public readonly ruleId?: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'MinimalGoRulesError';
    
    // Maintain proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MinimalGoRulesError);
    }
  }

  /**
   * Create a rule not found error
   */
  static ruleNotFound(ruleId: string): MinimalGoRulesError {
    return new MinimalGoRulesError(
      MinimalErrorCode.RULE_NOT_FOUND,
      `Rule not found: ${ruleId}`,
      ruleId
    );
  }

  /**
   * Create a network error
   */
  static networkError(message: string, originalError?: Error): MinimalGoRulesError {
    return new MinimalGoRulesError(
      MinimalErrorCode.NETWORK_ERROR,
      `Network error: ${message}`,
      undefined,
      originalError
    );
  }

  /**
   * Create a timeout error
   */
  static timeout(operation: string): MinimalGoRulesError {
    return new MinimalGoRulesError(
      MinimalErrorCode.TIMEOUT,
      `Operation timed out: ${operation}`
    );
  }

  /**
   * Create an invalid input error
   */
  static invalidInput(message: string): MinimalGoRulesError {
    return new MinimalGoRulesError(
      MinimalErrorCode.INVALID_INPUT,
      `Invalid input: ${message}`
    );
  }

  /**
   * Create an execution error
   */
  static executionError(ruleId: string, message: string, originalError?: Error): MinimalGoRulesError {
    return new MinimalGoRulesError(
      MinimalErrorCode.EXECUTION_ERROR,
      `Execution error for rule ${ruleId}: ${message}`,
      ruleId,
      originalError
    );
  }

  /**
   * Create a configuration error
   */
  static configError(message: string): MinimalGoRulesError {
    return new MinimalGoRulesError(
      MinimalErrorCode.CONFIG_ERROR,
      `Configuration error: ${message}`
    );
  }

  /**
   * Create a cache error
   */
  static cacheError(message: string): MinimalGoRulesError {
    return new MinimalGoRulesError(
      MinimalErrorCode.CACHE_ERROR,
      `Cache error: ${message}`
    );
  }
}