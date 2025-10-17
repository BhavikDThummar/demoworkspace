/**
 * RuleEngine - Main orchestrator for the rule engine
 * Coordinates rule management and execution
 */

import {
  Rule,
  RuleExecutionResult,
  RuleSelector,
  ExecutionMode,
  BatchOptions,
} from './types';
import { RuleManager } from './rule-manager';
import { ExecutionEngine } from './execution-engine';

export class RuleEngine<T = unknown> {
  private ruleManager: RuleManager<T>;
  private executionEngine: ExecutionEngine<T>;

  constructor() {
    this.ruleManager = new RuleManager<T>();
    this.executionEngine = new ExecutionEngine<T>();
  }

  /**
   * Register a new rule
   */
  addRule(rule: Rule<T>): void {
    this.ruleManager.addRule(rule);
  }

  /**
   * Remove a rule by name
   */
  removeRule(name: string): void {
    this.ruleManager.removeRule(name);
  }

  /**
   * Enable a rule
   */
  enableRule(name: string): void {
    this.ruleManager.setRuleEnabled(name, true);
  }

  /**
   * Disable a rule
   */
  disableRule(name: string): void {
    this.ruleManager.setRuleEnabled(name, false);
  }

  /**
   * Get all registered rules
   */
  getRules(): Rule<T>[] {
    return this.ruleManager.getAllRules();
  }

  /**
   * Get rules by tags
   */
  getRulesByTags(tags: string[]): Rule<T>[] {
    return this.ruleManager.getRulesByTags(tags);
  }

  /**
   * Process data through all enabled rules
   */
  async process(
    data: T[],
    mode: ExecutionMode = 'parallel'
  ): Promise<RuleExecutionResult<T>> {
    const rules = this.ruleManager.getEnabledRules();
    return this.executionEngine.execute(data, rules, mode);
  }

  /**
   * Process data through specific rules
   */
  async processWithRules(
    data: T[],
    selector: RuleSelector
  ): Promise<RuleExecutionResult<T>> {
    const rules = this.ruleManager.resolveSelector(selector);
    const mode = selector.mode || 'parallel';
    return this.executionEngine.execute(data, rules, mode);
  }

  /**
   * Process large batch with controlled concurrency
   */
  async processBatch(
    data: T[],
    selector: RuleSelector,
    options?: BatchOptions
  ): Promise<RuleExecutionResult<T>> {
    const rules = this.ruleManager.resolveSelector(selector);
    return this.executionEngine.executeBatch(data, rules, options);
  }

  /**
   * Process all data items with all rules in parallel - ultra-fast performance mode
   * All combinations of data items and rules are executed concurrently without batching
   */
  async processAllParallel(
    data: T[],
    selector: RuleSelector,
    options?: { continueOnError?: boolean }
  ): Promise<RuleExecutionResult<T>> {
    const rules = this.ruleManager.resolveSelector(selector);
    return this.executionEngine.executeAllParallel(data, rules, options);
  }

  /**
   * Process all data items with all enabled rules in parallel - convenience method
   */
  async processAllParallelWithAllRules(
    data: T[],
    options?: { continueOnError?: boolean }
  ): Promise<RuleExecutionResult<T>> {
    const rules = this.ruleManager.getEnabledRules();
    return this.executionEngine.executeAllParallel(data, rules, options);
  }
}
