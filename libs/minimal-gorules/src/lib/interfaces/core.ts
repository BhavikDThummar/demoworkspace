/**
 * Core interfaces for the minimal GoRules engine
 */

/**
 * Minimal rule metadata for efficient caching
 */
export interface MinimalRuleMetadata {
  id: string;
  version: string;
  tags: string[];
  lastModified: number; // timestamp for fast comparison
}

/**
 * Execution mode configuration
 */
export interface ExecutionMode {
  type: 'parallel' | 'sequential' | 'mixed';
  groups?: ExecutionGroup[]; // for mixed mode
}

/**
 * Execution group for mixed mode
 */
export interface ExecutionGroup {
  rules: string[];
  mode: 'parallel' | 'sequential';
}

/**
 * Rule selection criteria
 */
export interface RuleSelector {
  ids?: string[];
  tags?: string[];
  mode: ExecutionMode;
}

/**
 * Minimal execution result
 */
export interface MinimalExecutionResult<T = unknown> {
  results: Map<string, T>; // ruleId -> result
  executionTime: number;
  errors?: Map<string, Error>; // ruleId -> error
}
