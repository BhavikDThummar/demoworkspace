import { Injectable, Inject, Optional } from '@nestjs/common';
import { RuleEngine } from '../core/rule-engine';
import {
  Rule,
  RuleExecutionResult,
  ExecutionMode,
  RuleSelector,
  BatchOptions,
} from '../core/types';

/**
 * Token for injecting initial rules
 */
export const RULE_ENGINE_OPTIONS = 'RULE_ENGINE_OPTIONS';

/**
 * NestJS service wrapper for RuleEngine
 * Provides dependency injection and lifecycle management
 */
@Injectable()
export class RuleEngineService<T = unknown> {
  private engine: RuleEngine<T>;

  constructor(
    @Optional()
    @Inject(RULE_ENGINE_OPTIONS)
    options?: { rules?: Rule<T>[] }
  ) {
    this.engine = new RuleEngine<T>();

    // Register initial rules if provided
    if (options?.rules) {
      options.rules.forEach((rule) => this.engine.addRule(rule));
    }
  }

  /**
   * Process data through all enabled rules
   * @param data Array of items to process
   * @param mode Execution mode (parallel or sequential)
   * @returns Rule execution result with transformed data and validation errors
   */
  async process(
    data: T[],
    mode?: ExecutionMode
  ): Promise<RuleExecutionResult<T>> {
    return this.engine.process(data, mode);
  }

  /**
   * Process data through specific rules selected by name or tag
   * @param data Array of items to process
   * @param selector Rule selector (names, tags, mode)
   * @returns Rule execution result with transformed data and validation errors
   */
  async processWithRules(
    data: T[],
    selector: RuleSelector
  ): Promise<RuleExecutionResult<T>> {
    return this.engine.processWithRules(data, selector);
  }

  /**
   * Process large batch with controlled concurrency
   * @param data Array of items to process
   * @param selector Rule selector (names, tags, mode)
   * @param options Batch processing options (maxConcurrency, etc.)
   * @returns Rule execution result with transformed data and validation errors
   */
  async processBatch(
    data: T[],
    selector: RuleSelector,
    options?: BatchOptions
  ): Promise<RuleExecutionResult<T>> {
    return this.engine.processBatch(data, selector, options);
  }

  /**
   * Register a new rule with the engine
   * @param rule Rule to register
   */
  addRule(rule: Rule<T>): void {
    this.engine.addRule(rule);
  }

  /**
   * Remove a rule from the engine
   * @param name Name of the rule to remove
   */
  removeRule(name: string): void {
    this.engine.removeRule(name);
  }

  /**
   * Enable a rule
   * @param name Name of the rule to enable
   */
  enableRule(name: string): void {
    this.engine.enableRule(name);
  }

  /**
   * Disable a rule
   * @param name Name of the rule to disable
   */
  disableRule(name: string): void {
    this.engine.disableRule(name);
  }

  /**
   * Get all registered rules
   * @returns Array of all rules
   */
  getRules(): Rule<T>[] {
    return this.engine.getRules();
  }

  /**
   * Get rules by tags
   * @param tags Array of tags to filter by
   * @returns Array of rules matching any of the provided tags
   */
  getRulesByTags(tags: string[]): Rule<T>[] {
    return this.engine.getRulesByTags(tags);
  }

  /**
   * Process all data items with all rules in parallel - ultra-fast performance mode
   * All combinations of data items and rules are executed concurrently without batching
   * @param data Array of items to process
   * @param selector Rule selector (names, tags, mode)
   * @param options Options for parallel execution
   * @returns Rule execution result with transformed data and validation errors
   */
  async processAllParallel(
    data: T[],
    selector: RuleSelector,
    options?: { continueOnError?: boolean }
  ): Promise<RuleExecutionResult<T>> {
    return this.engine.processAllParallel(data, selector, options);
  }

  /**
   * Process all data items with all enabled rules in parallel - convenience method
   * @param data Array of items to process
   * @param options Options for parallel execution
   * @returns Rule execution result with transformed data and validation errors
   */
  async processAllParallelWithAllRules(
    data: T[],
    options?: { continueOnError?: boolean }
  ): Promise<RuleExecutionResult<T>> {
    return this.engine.processAllParallelWithAllRules(data, options);
  }

  /**
   * Get the underlying RuleEngine instance
   * @returns RuleEngine instance
   */
  getEngine(): RuleEngine<T> {
    return this.engine;
  }
}
