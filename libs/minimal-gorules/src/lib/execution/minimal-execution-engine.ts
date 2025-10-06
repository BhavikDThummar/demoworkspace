/**
 * Minimal Execution Engine with ZenEngine integration
 * High-performance rule execution with minimal overhead
 */
import { ZenEngine } from '@gorules/zen-engine';
import { IRuleCacheManager } from '../interfaces/services.js';
import { MinimalExecutionResult, RuleSelector, ExecutionGroup } from '../interfaces/core.js';
import { ITagManager } from '../tag-manager/interfaces.js';
import { MinimalGoRulesError, MinimalErrorCode } from '../errors/minimal-errors.js';
import {
  IMinimalExecutionEngine,
  ExecutionEngineConfig,
  ZenEngineLoader,
  BatchExecutionOptions,
  BatchExecutionResult,
  BatchInputResult,
} from './interfaces.js';

/**
 * Ultra-lightweight Execution Engine for maximum performance
 * Stripped of all non-essential features for 100K+ rule validation per second
 */
export class MinimalExecutionEngine implements IMinimalExecutionEngine {
  private zenEngine: ZenEngine;
  private config: ExecutionEngineConfig;

  constructor(
    private cacheManager: IRuleCacheManager,
    private tagManager: ITagManager,
    config: ExecutionEngineConfig = {},
  ) {
    this.config = {
      maxConcurrency: config.maxConcurrency || 100, // Increased to 100 for 70K target
      executionTimeout: config.executionTimeout || 1000, // Reduced timeout for fast validation
    };

    // Create optimized loader function
    const loader: ZenEngineLoader = async (key: string) => {
      const ruleData = await this.cacheManager.get(key);
      if (!ruleData) {
        throw new MinimalGoRulesError(
          MinimalErrorCode.RULE_NOT_FOUND,
          `Rule not found: ${key}`,
          key,
        );
      }
      return ruleData;
    };

    this.zenEngine = new ZenEngine({ loader });
  }

  /**
   * Execute rules based on selector criteria - optimized for speed
   */
  async execute<T>(
    selector: RuleSelector,
    input: Record<string, unknown>,
  ): Promise<MinimalExecutionResult<T>> {
    const startTime = performance.now();

    const availableRules = await this.cacheManager.getAllMetadata();
    const rulePlan = await this.tagManager.resolveRules(selector, availableRules);

    if (rulePlan.ruleIds.length === 0) {
      return {
        results: new Map(),
        executionTime: performance.now() - startTime,
        errors: new Map(),
      };
    }

    let result: MinimalExecutionResult<T>;

    switch (selector.mode.type) {
      case 'parallel':
        result = await this.executeParallel(rulePlan.ruleIds, input);
        break;
      case 'sequential':
        result = await this.executeSequential(rulePlan.ruleIds, input);
        break;
      case 'mixed':
        result = await this.executeMixed(selector.mode.groups!, input);
        break;
      default:
        result = await this.executeParallel(rulePlan.ruleIds, input);
    }

    result.executionTime = performance.now() - startTime;
    return result;
  }

  /**
   * Execute a single rule - fast path
   */
  async executeRule<T>(ruleId: string, input: Record<string, unknown>): Promise<T> {
    const result = await this.zenEngine.evaluate(ruleId, input);
    return result.result;
  }

  /**
   * Fast rule validation - cache lookup only
   */
  async validateRule(ruleId: string): Promise<boolean> {
    return !!(await this.cacheManager.get(ruleId));
  }

  /**
   * Get current configuration
   */
  getConfig(): ExecutionEngineConfig {
    return this.config;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ExecutionEngineConfig>): void {
    Object.assign(this.config, config);
  }

  /**
   * Lightweight batch execution for large datasets
   */
  async executeBatch<T>(
    inputs: Record<string, unknown>[],
    selector: RuleSelector,
    options: BatchExecutionOptions = {},
  ): Promise<BatchExecutionResult<T>> {
    const availableRules = await this.cacheManager.getAllMetadata();
    const rulePlan = await this.tagManager.resolveRules(selector, availableRules);

    if (rulePlan.ruleIds.length === 0) {
      return { results: inputs.map((_, i) => ({ inputIndex: i, results: new Map(), success: true })) };
    }

    return this.executeBatchByRules(inputs, rulePlan.ruleIds, options);
  }

  /**
   * Ultra-fast batch execution with pre-resolved rule IDs
   */
  async executeBatchByRules<T>(
    inputs: Record<string, unknown>[],
    ruleIds: string[],
    options: BatchExecutionOptions = {},
  ): Promise<BatchExecutionResult<T>> {
    const { maxConcurrency = this.config.maxConcurrency || 100, continueOnError = true } = options;

    const results: BatchInputResult<T>[] = new Array(inputs.length);

    // Process all inputs with controlled concurrency
    const batches = this.createBatches(inputs, maxConcurrency);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const startIndex = batchIndex * maxConcurrency;

      const promises = batch.map(async (input, localIndex) => {
        const inputIndex = startIndex + localIndex;
        const inputResults = new Map<string, T>();
        const inputErrors = new Map<string, Error>();

        // Execute all rules in parallel for this input
        const rulePromises = ruleIds.map(async (ruleId) => {
          try {
            const result = await this.zenEngine.evaluate(ruleId, input);
            return { ruleId, result: result.result, error: null };
          } catch (error) {
            return { ruleId, result: null, error: error as Error };
          }
        });

        // Wait for all rules to complete for this input
        const ruleResults = await Promise.all(rulePromises);

        // Process results and errors
        let hasErrors = false;
        for (const { ruleId, result, error } of ruleResults) {
          if (error) {
            inputErrors.set(ruleId, error);
            hasErrors = true;
            if (!continueOnError) {
              break;
            }
          } else {
            inputResults.set(ruleId, result);
          }
        }

        return {
          inputIndex,
          results: inputResults,
          errors: inputErrors.size > 0 ? inputErrors : undefined,
          success: !hasErrors,
        };
      });

      const batchResults = await Promise.all(promises);

      for (let i = 0; i < batchResults.length; i++) {
        results[startIndex + i] = batchResults[i];
      }
    }

    return { results };
  }


  /**
   * Ultra-fast parallel execution - all rules executed concurrently
   */
  private async executeParallel<T>(
    ruleIds: string[],
    input: Record<string, unknown>,
  ): Promise<MinimalExecutionResult<T>> {
    const results = new Map<string, T>();
    const errors = new Map<string, Error>();

    // Execute all rules in parallel without batching for maximum speed
    const promises = ruleIds.map(async (ruleId) => {
      try {
        const result = await this.zenEngine.evaluate(ruleId, input);
        return { ruleId, result: result.result, error: null };
      } catch (error) {
        return { ruleId, result: null, error: error as Error };
      }
    });

    const allResults = await Promise.all(promises);

    for (const { ruleId, result, error } of allResults) {
      if (error) {
        errors.set(ruleId, error);
      } else {
        results.set(ruleId, result);
      }
    }

    return {
      results,
      executionTime: 0,
      errors: errors.size > 0 ? errors : undefined,
    };
  }

  /**
   * Fast sequential execution
   */
  private async executeSequential<T>(
    ruleIds: string[],
    input: Record<string, unknown>,
  ): Promise<MinimalExecutionResult<T>> {
    const results = new Map<string, T>();
    const errors = new Map<string, Error>();
    let currentInput = input;

    for (const ruleId of ruleIds) {
      try {
        const result = await this.zenEngine.evaluate(ruleId, currentInput);
        results.set(ruleId, result.result);

        if (result.result && typeof result.result === 'object') {
          currentInput = { ...currentInput, ...(result.result as Record<string, unknown>) };
        }
      } catch (error) {
        errors.set(ruleId, error as Error);
      }
    }

    return {
      results,
      executionTime: 0,
      errors: errors.size > 0 ? errors : undefined,
    };
  }

  /**
   * Simple mixed execution - fast implementation
   */
  private async executeMixed<T>(
    groups: ExecutionGroup[],
    input: Record<string, unknown>,
  ): Promise<MinimalExecutionResult<T>> {
    const results = new Map<string, T>();
    const errors = new Map<string, Error>();
    let currentInput = input;

    for (const group of groups) {
      let groupResult: MinimalExecutionResult<T>;

      if (group.mode === 'parallel') {
        groupResult = await this.executeParallel(group.rules, currentInput);
      } else {
        groupResult = await this.executeSequential(group.rules, currentInput);
      }

      // Merge results
      for (const [ruleId, result] of groupResult.results) {
        results.set(ruleId, result);
        if (result && typeof result === 'object') {
          currentInput = { ...currentInput, ...(result as Record<string, unknown>) };
        }
      }

      // Merge errors
      if (groupResult.errors) {
        for (const [ruleId, error] of groupResult.errors) {
          errors.set(ruleId, error);
        }
      }
    }

    return {
      results,
      executionTime: 0,
      errors: errors.size > 0 ? errors : undefined,
    };
  }

  /**
   * Create batches for parallel execution - optimized for speed
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }
}
