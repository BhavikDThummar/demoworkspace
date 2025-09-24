/**
 * Tag Manager specific interfaces
 */

import { MinimalRuleMetadata, RuleSelector } from '../interfaces/core.js';

/**
 * Rule dependency information for execution ordering
 */
export interface RuleDependency {
  ruleId: string;
  dependsOn: string[]; // Rule IDs this rule depends on
  dependents: string[]; // Rule IDs that depend on this rule
}

/**
 * Resolved rule execution plan
 */
export interface ResolvedRulePlan {
  ruleIds: string[];
  executionOrder: string[][]; // Array of parallel execution groups in order
  dependencies: Map<string, RuleDependency>;
}

/**
 * Tag manager interface for rule selection and grouping
 */
export interface ITagManager {
  /**
   * Resolve rules based on selector criteria
   */
  resolveRules(
    selector: RuleSelector,
    availableRules: Map<string, MinimalRuleMetadata>,
  ): Promise<ResolvedRulePlan>;

  /**
   * Get rules by specific IDs
   */
  getRulesByIds(
    ruleIds: string[],
    availableRules: Map<string, MinimalRuleMetadata>,
  ): Promise<string[]>;

  /**
   * Get rules by tags with fast lookup
   */
  getRulesByTags(
    tags: string[],
    availableRules: Map<string, MinimalRuleMetadata>,
  ): Promise<string[]>;

  /**
   * Analyze rule dependencies for execution ordering
   */
  analyzeDependencies(
    ruleIds: string[],
    availableRules: Map<string, MinimalRuleMetadata>,
  ): Promise<Map<string, RuleDependency>>;

  /**
   * Create execution order based on dependencies
   */
  createExecutionOrder(
    ruleIds: string[],
    dependencies: Map<string, RuleDependency>,
  ): Promise<string[][]>;

  /**
   * Validate rule selector
   */
  validateSelector(selector: RuleSelector): boolean;
}
