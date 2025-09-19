/**
 * Execution Engine specific interfaces
 */

import { MinimalExecutionResult, RuleSelector, ExecutionGroup } from '../interfaces/core.js';
import { ZenDecisionContent } from '@gorules/zen-engine';
import { ExecutionMetrics } from './performance-utils.js';

/**
 * ZenEngine loader function type (matches actual ZenEngine interface)
 */
export type ZenEngineLoader = (key: string) => Promise<Buffer | ZenDecisionContent>;

/**
 * ZenEngine evaluation result (matches actual ZenEngine response)
 */
export interface ZenEngineResult<T = unknown> {
  result: T;
  performance: string;
  trace?: Record<string, unknown>;
}

/**
 * Execution engine configuration
 */
export interface ExecutionEngineConfig {
  /**
   * Maximum number of concurrent rule executions in parallel mode
   */
  maxConcurrency?: number;
  
  /**
   * Timeout for individual rule execution (in milliseconds)
   */
  executionTimeout?: number;
  
  /**
   * Whether to include performance metrics in results
   */
  includePerformanceMetrics?: boolean;
}

/**
 * Enhanced execution result with performance metrics
 */
export interface EnhancedExecutionResult<T = unknown> extends MinimalExecutionResult<T> {
  /**
   * Detailed performance metrics (only included if enabled in config)
   */
  performanceMetrics?: ExecutionMetrics;
  
  /**
   * Performance analysis and recommendations
   */
  performanceAnalysis?: {
    efficiency: number;
    bottlenecks: string[];
    recommendations: string[];
  };
}

/**
 * Sequential execution result with state tracking
 */
export interface SequentialExecutionResult<T = unknown> extends EnhancedExecutionResult<T> {
  /**
   * Execution state tracking (only included if enabled)
   */
  executionState?: SequentialExecutionState;
  
  /**
   * Final input state after all rules (for pipeline mode)
   */
  finalInput?: Record<string, unknown>;
}

/**
 * Parallel execution options
 */
export interface ParallelExecutionOptions {
  /**
   * Maximum number of concurrent rule executions
   */
  maxConcurrency?: number;
  
  /**
   * Whether to fail fast on first error or collect all errors
   */
  failFast?: boolean;
  
  /**
   * Whether to include detailed performance metrics
   */
  includeMetrics?: boolean;
  
  /**
   * Custom timeout for individual rules (overrides engine config)
   */
  ruleTimeout?: number;
}

/**
 * Sequential execution options
 */
export interface SequentialExecutionOptions {
  /**
   * Whether to stop execution on first error or continue with remaining rules
   */
  stopOnError?: boolean;
  
  /**
   * Whether to include detailed execution state tracking
   */
  includeStateTracking?: boolean;
  
  /**
   * Whether to enable pipeline mode (each rule's output becomes next rule's input)
   */
  pipelineMode?: boolean;
  
  /**
   * Custom timeout for individual rules (overrides engine config)
   */
  ruleTimeout?: number;
  
  /**
   * Whether to include detailed performance metrics
   */
  includeMetrics?: boolean;
}

/**
 * Sequential execution state for debugging
 */
export interface SequentialExecutionState {
  /**
   * Current rule being executed
   */
  currentRule?: string;
  
  /**
   * Rules completed successfully
   */
  completedRules: string[];
  
  /**
   * Rules that failed
   */
  failedRules: string[];
  
  /**
   * Current input state (for pipeline mode)
   */
  currentInput: Record<string, unknown>;
  
  /**
   * Execution timeline with timestamps
   */
  timeline: Array<{
    ruleId: string;
    event: 'started' | 'completed' | 'failed';
    timestamp: number;
    duration?: number;
    error?: string;
  }>;
}

/**
 * Mixed execution options
 */
export interface MixedExecutionOptions {
  /**
   * Whether to stop execution on first error or continue with remaining groups
   */
  stopOnError?: boolean;
  
  /**
   * Whether to include detailed execution state tracking
   */
  includeStateTracking?: boolean;
  
  /**
   * Whether to enable pipeline mode between groups (each group's output becomes next group's input)
   */
  pipelineMode?: boolean;
  
  /**
   * Custom timeout for individual rules (overrides engine config)
   */
  ruleTimeout?: number;
  
  /**
   * Whether to include detailed performance metrics
   */
  includeMetrics?: boolean;
  
  /**
   * Maximum concurrency for parallel groups
   */
  maxConcurrency?: number;
}

/**
 * Mixed execution result with enhanced tracking
 */
export interface MixedExecutionResult<T = unknown> extends EnhancedExecutionResult<T> {
  /**
   * Execution plan used for mixed mode
   */
  executionPlan?: ExecutionPlan;
  
  /**
   * Group-level execution results
   */
  groupResults?: Array<{
    groupIndex: number;
    mode: 'parallel' | 'sequential';
    ruleIds: string[];
    results: Map<string, T>;
    errors?: Map<string, Error>;
    executionTime: number;
  }>;
  
  /**
   * Final input state after all groups (for pipeline mode)
   */
  finalInput?: Record<string, unknown>;
}

/**
 * Execution plan for mixed mode
 */
export interface ExecutionPlan {
  /**
   * Validated execution groups
   */
  groups: ValidatedExecutionGroup[];
  
  /**
   * Total number of rules to execute
   */
  totalRules: number;
  
  /**
   * Estimated execution time based on group modes
   */
  estimatedTime?: number;
  
  /**
   * Optimization recommendations
   */
  optimizations?: string[];
}

/**
 * Validated execution group with resolved rule IDs
 */
export interface ValidatedExecutionGroup {
  /**
   * Resolved rule IDs (validated to exist in cache)
   */
  ruleIds: string[];
  
  /**
   * Execution mode for this group
   */
  mode: 'parallel' | 'sequential';
  
  /**
   * Group index in execution order
   */
  index: number;
  
  /**
   * Estimated execution time for this group
   */
  estimatedTime?: number;
}

/**
 * Extended execution engine interface with additional methods
 */
export interface IMinimalExecutionEngine {
  /**
   * Core execution with rule selector
   */
  execute<T>(selector: RuleSelector, input: Record<string, unknown>): Promise<MinimalExecutionResult<T>>;
  
  /**
   * Enhanced parallel execution with detailed metrics and options
   */
  executeParallelWithMetrics<T>(
    ruleIds: string[], 
    input: Record<string, unknown>, 
    options?: ParallelExecutionOptions
  ): Promise<EnhancedExecutionResult<T>>;
  
  /**
   * Enhanced sequential execution with state tracking and pipeline mode
   */
  executeSequentialWithMetrics<T>(
    ruleIds: string[], 
    input: Record<string, unknown>, 
    options?: SequentialExecutionOptions
  ): Promise<SequentialExecutionResult<T>>;
  
  /**
   * Enhanced mixed execution with complex rule orchestration
   */
  executeMixedWithMetrics<T>(
    groups: ExecutionGroup[], 
    input: Record<string, unknown>, 
    options?: MixedExecutionOptions
  ): Promise<MixedExecutionResult<T>>;
  
  /**
   * Single rule execution
   */
  executeRule<T>(ruleId: string, input: Record<string, unknown>): Promise<T>;
  
  /**
   * Validate rule existence and structure
   */
  validateRule(ruleId: string): Promise<boolean>;
  
  /**
   * Validate and optimize execution groups for mixed mode
   */
  validateExecutionGroups(groups: ExecutionGroup[]): Promise<ExecutionPlan>;
  
  /**
   * Get execution engine configuration
   */
  getConfig(): ExecutionEngineConfig;
  
  /**
   * Update execution engine configuration
   */
  updateConfig(config: Partial<ExecutionEngineConfig>): void;
  
  /**
   * Get performance metrics for the last execution (if enabled)
   */
  getLastExecutionMetrics(): ExecutionMetrics | undefined;
}