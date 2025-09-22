import { ExecutionTrace, PerformanceMetrics, RuleMetadata } from './rule-execution.interface.js';

/**
 * Result of a rule execution
 */
export interface RuleExecutionResult<T = unknown> {
  /** The decision/result from the rule execution */
  result: T;

  /** Execution trace (if tracing was enabled) */
  trace?: ExecutionTrace;

  /** Performance metrics */
  performance: PerformanceMetrics;

  /** Rule metadata */
  metadata: RuleMetadata;
}

/**
 * Rule decision result
 */
export interface RuleResult<T = unknown> {
  /** The actual decision data */
  decision: T;

  /** Confidence score (0-1) if available */
  confidence?: number;

  /** List of rules that were applied */
  appliedRules: string[];

  /** Any warnings generated during execution */
  warnings?: string[];
}

/**
 * Result of batch rule execution
 */
export interface BatchRuleExecutionResult<T = unknown> {
  /** Execution ID for tracking */
  executionId: string;

  /** Rule ID that was executed */
  ruleId: string;

  /** Rule execution result */
  result: RuleResult<T>;

  /** Error information if execution failed */
  error?: RuleExecutionError;
}

/**
 * Error information for rule execution failures
 */
export interface RuleExecutionError {
  /** Error code */
  code: string;

  /** Human-readable error message */
  message: string;

  /** Additional error details */
  details?: unknown;

  /** Whether this error is retryable */
  retryable: boolean;
}

/**
 * Enumeration of GoRules error codes
 */
export enum GoRulesErrorCode {
  AUTHENTICATION_FAILED = 'AUTH_FAILED',
  RULE_NOT_FOUND = 'RULE_NOT_FOUND',
  INVALID_INPUT = 'INVALID_INPUT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

/**
 * Custom exception class for GoRules errors
 */
export class GoRulesException extends Error {
  constructor(
    public readonly code: GoRulesErrorCode,
    message: string,
    public readonly details?: unknown,
    public readonly retryable = false,
  ) {
    super(message);
    this.name = 'GoRulesException';
  }
}
/**
 * S
afe result wrapper for operations that might fail
 * This matches the SafeResult type from GoRules Zen Engine
 */
export interface SafeResult<T> {
  success: boolean;
  result?: T;
  error?: string;
}
