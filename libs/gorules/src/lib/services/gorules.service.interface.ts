import {
  RuleExecutionOptions,
  RuleExecutionResult,
  BatchRuleExecution,
  BatchRuleExecutionResult,
  RuleMetadata
} from '../types/index.js';

/**
 * Interface for GoRules service operations
 */
export interface IGoRulesService {
  /**
   * Execute a single rule with the provided input
   * @param ruleId - The ID of the rule to execute
   * @param input - Input data for the rule
   * @param options - Optional execution options
   * @returns Promise resolving to the rule execution result
   */
  executeRule<T = any, R = any>(
    ruleId: string,
    input: T,
    options?: RuleExecutionOptions
  ): Promise<RuleExecutionResult<R>>;

  /**
   * Execute multiple rules in batch
   * @param executions - Array of rule executions to perform
   * @returns Promise resolving to array of batch execution results
   */
  executeBatch<T = any, R = unknown>(
    executions: BatchRuleExecution<T>[]
  ): Promise<BatchRuleExecutionResult<R>[]>;

  /**
   * Validate that a rule exists and is accessible
   * @param ruleId - The ID of the rule to validate
   * @returns Promise resolving to true if rule exists
   */
  validateRuleExists(ruleId: string): Promise<boolean>;

  /**
   * Get metadata information for a rule
   * @param ruleId - The ID of the rule
   * @returns Promise resolving to rule metadata
   */
  getRuleMetadata(ruleId: string): Promise<RuleMetadata>;
}