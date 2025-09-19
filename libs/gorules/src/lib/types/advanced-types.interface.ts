import { RuleInputData } from './rule-execution.interface.js';

/**
 * Utility type for extracting rule input type from a rule execution function
 */
export type ExtractRuleInput<T> = T extends (...args: infer P) => unknown ? P[1] : never;

/**
 * Utility type for extracting rule output type from a rule execution function
 */
export type ExtractRuleOutput<T> = T extends (...args: unknown[]) => Promise<infer R> ? R : never;

/**
 * Strongly typed rule execution context
 */
export interface TypedRuleExecutionContext<TInput extends RuleInputData = RuleInputData> {
  /** The input data for the rule */
  input: TInput;

  /** Additional context variables */
  context?: Record<string, unknown>;

  /** Execution metadata */
  metadata?: {
    /** Execution timestamp */
    timestamp: Date;

    /** User or system that initiated the execution */
    initiator?: string;

    /** Request correlation ID */
    correlationId?: string;
  };
}

/**
 * Rule execution status enumeration
 */
export enum RuleExecutionStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

/**
 * Rule execution state for tracking long-running operations
 */
export interface RuleExecutionState<TInput = RuleInputData, TOutput = unknown> {
  /** Unique execution identifier */
  executionId: string;

  /** Rule identifier */
  ruleId: string;

  /** Current execution status */
  status: RuleExecutionStatus;

  /** Input data */
  input: TInput;

  /** Output data (available when status is COMPLETED) */
  output?: TOutput;

  /** Error information (available when status is FAILED) */
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };

  /** Execution timestamps */
  timestamps: {
    /** When the execution was created */
    created: Date;

    /** When the execution started */
    started?: Date;

    /** When the execution completed */
    completed?: Date;
  };

  /** Progress information for long-running rules */
  progress?: {
    /** Current step */
    currentStep: number;

    /** Total steps */
    totalSteps: number;

    /** Progress percentage (0-100) */
    percentage: number;

    /** Current step description */
    description?: string;
  };
}

/**
 * Rule validation result
 */
export interface RuleValidationResult {
  /** Whether the rule is valid */
  isValid: boolean;

  /** Validation errors */
  errors: RuleValidationError[];

  /** Validation warnings */
  warnings: RuleValidationWarning[];

  /** Rule schema information */
  schema?: {
    /** Expected input schema */
    input?: Record<string, unknown>;

    /** Expected output schema */
    output?: Record<string, unknown>;
  };
}

/**
 * Rule validation error
 */
export interface RuleValidationError {
  /** Error code */
  code: string;

  /** Error message */
  message: string;

  /** Path to the problematic field */
  path?: string;

  /** Additional error details */
  details?: unknown;
}

/**
 * Rule validation warning
 */
export interface RuleValidationWarning {
  /** Warning code */
  code: string;

  /** Warning message */
  message: string;

  /** Path to the field that triggered the warning */
  path?: string;

  /** Additional warning details */
  details?: unknown;
}

/**
 * Rule execution statistics
 */
export interface RuleExecutionStatistics {
  /** Rule identifier */
  ruleId: string;

  /** Total number of executions */
  totalExecutions: number;

  /** Number of successful executions */
  successfulExecutions: number;

  /** Number of failed executions */
  failedExecutions: number;

  /** Average execution time in milliseconds */
  averageExecutionTime: number;

  /** Minimum execution time in milliseconds */
  minExecutionTime: number;

  /** Maximum execution time in milliseconds */
  maxExecutionTime: number;

  /** Success rate (0-1) */
  successRate: number;

  /** Statistics time range */
  timeRange: {
    /** Start of the statistics period */
    from: Date;

    /** End of the statistics period */
    to: Date;
  };
}

/**
 * Conditional type for rule input validation
 */
export type ValidateRuleInput<T> = T extends RuleInputData ? T : never;

/**
 * Conditional type for rule output validation
 */
export type ValidateRuleOutput<T> = T extends unknown ? T : never;

/**
 * Helper type for creating strongly typed rule execution functions
 */
export type TypedRuleExecutor<TInput extends RuleInputData, TOutput> = (
  ruleId: string,
  input: ValidateRuleInput<TInput>,
) => Promise<ValidateRuleOutput<TOutput>>;

/**
 * Rule execution options with strong typing
 */
export interface TypedRuleExecutionOptions<TInput extends RuleInputData = RuleInputData> {
  /** Request timeout in milliseconds */
  timeout?: number;

  /** Enable execution tracing for debugging */
  trace?: boolean;

  /** Additional context data for rule execution */
  context?: TypedRuleExecutionContext<TInput>;

  /** Validation options */
  validation?: {
    /** Validate input before execution */
    validateInput?: boolean;

    /** Validate output after execution */
    validateOutput?: boolean;

    /** Strict mode - fail on warnings */
    strict?: boolean;
  };
}
