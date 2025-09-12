/**
 * Generic type for rule input data
 * 
 * @description Base type for all rule input data. Ensures type safety while allowing flexibility.
 * @example
 * ```typescript
 * interface CustomerData extends RuleInputData {
 *   age: number;
 *   income: number;
 *   creditScore: number;
 * }
 * ```
 */
export type RuleInputData = Record<string, unknown>;

/**
 * Options for configuring rule execution behavior
 * 
 * @description Provides fine-grained control over how rules are executed, including
 * timeout settings, tracing, and correlation IDs for monitoring and debugging.
 * 
 * @example
 * ```typescript
 * const options: RuleExecutionOptions = {
 *   timeout: 10000,
 *   trace: true,
 *   userId: 'user-123',
 *   sessionId: 'session-456'
 * };
 * 
 * const result = await goRulesService.executeRule('my-rule', input, options);
 * ```
 */
export interface RuleExecutionOptions {
  /** 
   * Request timeout in milliseconds
   * @default 30000
   * @minimum 1000
   * @maximum 300000
   */
  timeout?: number;
  
  /** 
   * Enable execution tracing for debugging
   * @description When enabled, provides detailed execution trace information
   * including step-by-step execution details and timing information
   * @default false
   */
  trace?: boolean;
  
  /** 
   * Additional context data for rule execution
   * @description Extra data that can be used by rules but is not part of the main input
   */
  context?: RuleInputData;
  
  /** 
   * User ID for tracing and audit purposes
   * @description Used for correlating rule executions with specific users
   * @example "user-12345"
   */
  userId?: string;
  
  /** 
   * Session ID for tracing and correlation
   * @description Used for correlating rule executions within a user session
   * @example "session-abcdef"
   */
  sessionId?: string;
  
  /** 
   * Request ID for distributed tracing
   * @description Unique identifier for correlating requests across services
   * @example "req-uuid-12345"
   */
  requestId?: string;
}

/**
 * Input data for rule execution
 */
export interface RuleInput extends RuleInputData {
  [key: string]: unknown;
}

/**
 * Batch rule execution request with strong typing
 * 
 * @template T - The type of input data for the rule
 * @description Represents a single rule execution within a batch operation.
 * Provides type safety for input data and execution tracking.
 * 
 * @example
 * ```typescript
 * interface CustomerInput {
 *   age: number;
 *   income: number;
 * }
 * 
 * const batchExecution: BatchRuleExecution<CustomerInput> = {
 *   ruleId: 'customer-validation',
 *   input: { age: 30, income: 50000 },
 *   executionId: 'batch-001',
 *   options: { timeout: 10000 }
 * };
 * ```
 */
export interface BatchRuleExecution<T extends RuleInputData = RuleInputData> {
  /** 
   * Unique identifier for the rule to execute
   * @description Must match a rule ID that exists in your GoRules project
   * @example "customer-validation"
   */
  ruleId: string;
  
  /** 
   * Input data for the rule execution
   * @description Strongly typed input data that will be passed to the rule
   */
  input: T;
  
  /** 
   * Optional execution ID for tracking and correlation
   * @description If not provided, a unique ID will be generated automatically
   * @example "batch-execution-001"
   */
  executionId?: string;
  
  /** 
   * Execution options for this specific rule
   * @description Options that override global batch execution settings
   */
  options?: RuleExecutionOptions;
}

/**
 * Execution trace information
 */
export interface ExecutionTrace {
  /** Individual execution steps */
  steps: TraceStep[];
  
  /** Total execution duration in milliseconds */
  duration: number;
  
  /** List of rules that were evaluated */
  rulesEvaluated: string[];
}

/**
 * Individual trace step
 */
export interface TraceStep {
  /** Step identifier */
  id: string;
  
  /** Step name or description */
  name: string;
  
  /** Step execution time in milliseconds */
  duration: number;
  
  /** Input data for this step */
  input?: unknown;
  
  /** Output data from this step */
  output?: unknown;
}

/**
 * Performance metrics for rule execution
 * 
 * @description Provides detailed timing information for rule execution,
 * useful for performance monitoring and optimization.
 * 
 * @example
 * ```typescript
 * const result = await goRulesService.executeRule('my-rule', input);
 * console.log(`Rule executed in ${result.performance.executionTime}ms`);
 * console.log(`Network overhead: ${result.performance.networkTime}ms`);
 * console.log(`Total time: ${result.performance.totalTime}ms`);
 * ```
 */
export interface PerformanceMetrics {
  /** 
   * Time spent executing the rule logic in milliseconds
   * @description Pure rule execution time, excluding network overhead
   * @minimum 0
   */
  executionTime: number;
  
  /** 
   * Time spent on network communication in milliseconds
   * @description Includes request/response time to GoRules service
   * @minimum 0
   */
  networkTime: number;
  
  /** 
   * Total time from request to response in milliseconds
   * @description Sum of execution time, network time, and any processing overhead
   * @minimum 0
   */
  totalTime: number;
}

/**
 * Rule metadata information
 * 
 * @description Contains comprehensive information about a rule including
 * its identity, versioning, and descriptive metadata.
 * 
 * @example
 * ```typescript
 * const metadata = await goRulesService.getRuleMetadata('customer-validation');
 * console.log(`Rule: ${metadata.name} v${metadata.version}`);
 * console.log(`Description: ${metadata.description}`);
 * console.log(`Tags: ${metadata.tags?.join(', ')}`);
 * ```
 */
export interface RuleMetadata {
  /** 
   * Unique rule identifier
   * @description The unique ID used to reference this rule in API calls
   * @example "customer-validation"
   */
  id: string;
  
  /** 
   * Human-readable rule name
   * @description Display name for the rule, used in UI and reports
   * @example "Customer Validation Rule"
   */
  name: string;
  
  /** 
   * Rule version string
   * @description Semantic version of the rule for change tracking
   * @example "1.2.3"
   */
  version: string;
  
  /** 
   * Optional rule description
   * @description Detailed description of what the rule does and its purpose
   * @example "Validates customer eligibility based on age, income, and credit score"
   */
  description?: string;
  
  /** 
   * Optional array of tags for categorization
   * @description Tags used for organizing and filtering rules
   * @example ["validation", "customer", "eligibility"]
   */
  tags?: string[];
  
  /** 
   * Timestamp when the rule was last modified
   * @description Used for cache invalidation and change tracking
   */
  lastModified?: Date;
}