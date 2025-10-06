/**
 * Core type definitions for the cm-rule-engine
 * Ultra-lightweight, high-performance rule engine with zero dependencies
 */

/**
 * Rule execution context provided to transformation and validation functions
 */
export interface RuleContext<T = any> {
  /** Current item being processed */
  item: T;

  /** All items in the dataset (for cross-item validation) */
  allItems: T[];

  /** Current item index */
  index: number;

  /** Additional metadata (optional) */
  metadata?: Record<string, any>;
}

/**
 * Validation error returned by validation rules
 */
export interface ValidationError {
  /** Field that failed validation */
  field: string;

  /** Error message */
  message: string;

  /** Error severity */
  severity: 'error' | 'warning';

  /** Optional item identifier */
  itemId?: string;
}

/**
 * Core rule definition
 */
export interface Rule<TInput = any, TOutput = any> {
  /** Unique rule identifier */
  name: string;

  /** Human-readable description */
  description: string;

  /** Execution priority (lower = higher priority) */
  priority: number;

  /** Tags for rule organization and selection */
  tags?: string[];

  /** Whether the rule is enabled */
  enabled: boolean;

  /** Transformation function (optional) */
  transform?: (context: RuleContext<TInput>) => TInput | Promise<TInput>;

  /** Validation function (optional) */
  validate?: (context: RuleContext<TInput>) => ValidationError[] | Promise<ValidationError[]>;
}

/**
 * Batch execution result for individual items
 */
export interface BatchItemResult<T = any> {
  /** Item index in original array */
  index: number;

  /** Transformed item */
  data: T;

  /** Errors for this item */
  errors: ValidationError[];

  /** Warnings for this item */
  warnings: ValidationError[];

  /** Whether this item is valid */
  isValid: boolean;
}

/**
 * Rule execution result
 */
export interface RuleExecutionResult<T = any> {
  /** Transformed data */
  data: T[];

  /** Validation errors */
  errors: ValidationError[];

  /** Validation warnings */
  warnings: ValidationError[];

  /** Whether validation passed (no errors) */
  isValid: boolean;

  /** Execution time in milliseconds */
  executionTime: number;

  /** Number of rules executed */
  rulesExecuted: number;
}

/**
 * Execution mode for rules
 */
export type ExecutionMode = 'parallel' | 'sequential';

/**
 * Rule selector for execution
 */
export interface RuleSelector {
  /** Specific rule names to execute */
  names?: string[];

  /** Tags to match (executes all rules with any of these tags) */
  tags?: string[];

  /** Execution mode */
  mode?: ExecutionMode;
}

/**
 * Batch processing options
 */
export interface BatchOptions {
  /** Maximum concurrent items to process */
  maxConcurrency?: number;

  /** Execution mode for rules within each item */
  ruleExecutionMode?: ExecutionMode;

  /** Continue processing on error */
  continueOnError?: boolean;
}

/**
 * Rule engine error codes
 */
export enum RuleEngineErrorCode {
  RULE_NOT_FOUND = 'RULE_NOT_FOUND',
  INVALID_RULE = 'INVALID_RULE',
  EXECUTION_ERROR = 'EXECUTION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
}

/**
 * Rule engine error class
 */
export class RuleEngineError extends Error {
  constructor(
    message: string,
    public code: RuleEngineErrorCode,
    public context?: any
  ) {
    super(message);
    this.name = 'RuleEngineError';
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RuleEngineError);
    }
  }
}
