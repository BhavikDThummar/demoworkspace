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
  CACHE_ERROR = 'CACHE_ERROR',
  FILE_SYSTEM_ERROR = 'FILE_SYSTEM_ERROR',
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FILE_ACCESS_DENIED = 'FILE_ACCESS_DENIED',
  JSON_PARSE_ERROR = 'JSON_PARSE_ERROR',
  DIRECTORY_NOT_FOUND = 'DIRECTORY_NOT_FOUND',
  INVALID_FILE_FORMAT = 'INVALID_FILE_FORMAT',
}

/**
 * Base error class for minimal GoRules engine
 */
export class MinimalGoRulesError extends Error {
  constructor(
    public readonly code: MinimalErrorCode,
    message: string,
    public readonly ruleId?: string,
    public readonly originalError?: Error,
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
      ruleId,
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
      originalError,
    );
  }

  /**
   * Create a timeout error
   */
  static timeout(operation: string): MinimalGoRulesError {
    return new MinimalGoRulesError(MinimalErrorCode.TIMEOUT, `Operation timed out: ${operation}`);
  }

  /**
   * Create an invalid input error
   */
  static invalidInput(message: string): MinimalGoRulesError {
    return new MinimalGoRulesError(MinimalErrorCode.INVALID_INPUT, `Invalid input: ${message}`);
  }

  /**
   * Create an execution error
   */
  static executionError(
    ruleId: string,
    message: string,
    originalError?: Error,
  ): MinimalGoRulesError {
    return new MinimalGoRulesError(
      MinimalErrorCode.EXECUTION_ERROR,
      `Execution error for rule ${ruleId}: ${message}`,
      ruleId,
      originalError,
    );
  }

  /**
   * Create a configuration error
   */
  static configError(message: string): MinimalGoRulesError {
    return new MinimalGoRulesError(
      MinimalErrorCode.CONFIG_ERROR,
      `Configuration error: ${message}`,
    );
  }

  /**
   * Create a cache error
   */
  static cacheError(message: string): MinimalGoRulesError {
    return new MinimalGoRulesError(MinimalErrorCode.CACHE_ERROR, `Cache error: ${message}`);
  }

  /**
   * Create a file system error
   */
  static fileSystemError(message: string, originalError?: Error, filePath?: string): MinimalGoRulesError {
    const errorMessage = filePath ? `File system error for ${filePath}: ${message}` : `File system error: ${message}`;
    return new MinimalGoRulesError(
      MinimalErrorCode.FILE_SYSTEM_ERROR,
      errorMessage,
      undefined,
      originalError,
    );
  }

  /**
   * Create a file not found error
   */
  static fileNotFound(filePath: string): MinimalGoRulesError {
    return new MinimalGoRulesError(
      MinimalErrorCode.FILE_NOT_FOUND,
      `File not found: ${filePath}`,
    );
  }

  /**
   * Create a file access denied error
   */
  static fileAccessDenied(filePath: string): MinimalGoRulesError {
    return new MinimalGoRulesError(
      MinimalErrorCode.FILE_ACCESS_DENIED,
      `Access denied: ${filePath}`,
    );
  }

  /**
   * Create a JSON parse error
   */
  static jsonParseError(filePath: string, originalError?: Error): MinimalGoRulesError {
    return new MinimalGoRulesError(
      MinimalErrorCode.JSON_PARSE_ERROR,
      `Invalid JSON in file ${filePath}: ${originalError?.message || 'Parse error'}`,
      undefined,
      originalError,
    );
  }

  /**
   * Create a directory not found error
   */
  static directoryNotFound(directoryPath: string): MinimalGoRulesError {
    return new MinimalGoRulesError(
      MinimalErrorCode.DIRECTORY_NOT_FOUND,
      `Directory not found: ${directoryPath}`,
    );
  }

  /**
   * Create an invalid file format error
   */
  static invalidFileFormat(filePath: string, message: string): MinimalGoRulesError {
    return new MinimalGoRulesError(
      MinimalErrorCode.INVALID_FILE_FORMAT,
      `Invalid file format in ${filePath}: ${message}`,
    );
  }
}
