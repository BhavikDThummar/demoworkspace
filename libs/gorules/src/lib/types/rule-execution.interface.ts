/**
 * Options for rule execution
 */
export interface RuleExecutionOptions {
  /** Request timeout in milliseconds */
  timeout?: number;
  
  /** Enable execution tracing for debugging */
  trace?: boolean;
  
  /** Additional context data for rule execution */
  context?: Record<string, any>;
}

/**
 * Input data for rule execution
 */
export interface RuleInput {
  [key: string]: any;
}

/**
 * Batch rule execution request
 */
export interface BatchRuleExecution<T = any> {
  /** Unique identifier for the rule */
  ruleId: string;
  
  /** Input data for the rule */
  input: T;
  
  /** Optional execution ID for tracking */
  executionId?: string;
  
  /** Execution options */
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
  input?: any;
  
  /** Output data from this step */
  output?: any;
}

/**
 * Performance metrics for rule execution
 */
export interface PerformanceMetrics {
  /** Time spent executing the rule logic */
  executionTime: number;
  
  /** Time spent on network communication */
  networkTime: number;
  
  /** Total time from request to response */
  totalTime: number;
}

/**
 * Rule metadata information
 */
export interface RuleMetadata {
  /** Rule identifier */
  id: string;
  
  /** Rule name */
  name: string;
  
  /** Rule version */
  version: string;
  
  /** Rule description */
  description?: string;
  
  /** Rule tags */
  tags?: string[];
  
  /** Last modified timestamp */
  lastModified?: Date;
}