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
  ZenEngineResult,
  EnhancedExecutionResult,
  ParallelExecutionOptions,
  SequentialExecutionOptions,
  SequentialExecutionResult,
  SequentialExecutionState,
  MixedExecutionOptions,
  MixedExecutionResult,
  ExecutionPlan,
  ValidatedExecutionGroup,
} from './interfaces.js';
import {
  ExecutionMetricsCollector,
  ExecutionMetrics,
  PerformanceAnalyzer,
} from './performance-utils.js';

/**
 * Minimal Execution Engine with direct ZenEngine wrapper
 * Optimized for low latency and high throughput scenarios
 */
export class MinimalExecutionEngine implements IMinimalExecutionEngine {
  private zenEngine: ZenEngine;
  private config: ExecutionEngineConfig;
  private lastExecutionMetrics?: ExecutionMetrics;

  constructor(
    private cacheManager: IRuleCacheManager,
    private tagManager: ITagManager,
    config: ExecutionEngineConfig = {},
  ) {
    this.config = {
      maxConcurrency: 10,
      executionTimeout: 5000,
      includePerformanceMetrics: false,
      ...config,
    };

    // Create loader function that reads from cache manager
    const loader: ZenEngineLoader = async (key: string) => {
      const ruleData = await this.cacheManager.get(key);
      if (!ruleData) {
        throw new MinimalGoRulesError(
          MinimalErrorCode.RULE_NOT_FOUND,
          `Rule not found in cache: ${key}`,
          key,
        );
      }
      return ruleData;
    };

    // Initialize ZenEngine with our loader
    this.zenEngine = new ZenEngine({ loader });
  }

  /**
   * Execute rules based on selector criteria
   */
  async execute<T>(
    selector: RuleSelector,
    input: Record<string, unknown>,
  ): Promise<MinimalExecutionResult<T>> {
    const startTime = performance.now();

    try {
      // Get available rules from cache
      const availableRules = await this.getAvailableRules();

      // Resolve rules using tag manager
      const rulePlan = await this.tagManager.resolveRules(selector, availableRules);

      if (rulePlan.ruleIds.length === 0) {
        return {
          results: new Map(),
          executionTime: performance.now() - startTime,
          errors: new Map(),
        };
      }

      // Execute based on mode
      let result: MinimalExecutionResult<T>;

      switch (selector.mode.type) {
        case 'parallel':
          result = await this.executeParallel(rulePlan.ruleIds, input);
          break;
        case 'sequential':
          result = await this.executeSequential(rulePlan.ruleIds, input);
          break;
        case 'mixed':
          if (!selector.mode.groups || selector.mode.groups.length === 0) {
            throw new MinimalGoRulesError(
              MinimalErrorCode.INVALID_INPUT,
              'Mixed execution mode requires execution groups to be specified',
            );
          }
          result = await this.executeMixed(selector.mode.groups, input);
          break;
        default:
          throw new MinimalGoRulesError(
            MinimalErrorCode.INVALID_INPUT,
            `Unsupported execution mode: ${selector.mode.type}`,
          );
      }

      // Add total execution time
      result.executionTime = performance.now() - startTime;
      return result;
    } catch (error) {
      throw new MinimalGoRulesError(
        MinimalErrorCode.EXECUTION_ERROR,
        `Execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Execute a single rule
   */
  async executeRule<T>(ruleId: string, input: Record<string, unknown>): Promise<T> {
    try {
      // Validate rule exists in cache
      if (!(await this.validateRule(ruleId))) {
        throw new MinimalGoRulesError(
          MinimalErrorCode.RULE_NOT_FOUND,
          `Rule not found: ${ruleId}`,
          ruleId,
        );
      }

      // Execute with timeout
      const result = await this.executeWithTimeout(
        () => this.zenEngine.evaluate(ruleId, input),
        this.config.executionTimeout ?? 5000,
      );

      return result.result;
    } catch (error) {
      if (error instanceof MinimalGoRulesError) {
        throw error;
      }
      throw new MinimalGoRulesError(
        MinimalErrorCode.EXECUTION_ERROR,
        `Rule execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ruleId,
      );
    }
  }

  /**
   * Validate rule existence and structure
   */
  async validateRule(ruleId: string): Promise<boolean> {
    try {
      const ruleData = await this.cacheManager.get(ruleId);
      if (!ruleData) {
        return false;
      }

      // Basic validation - check if it's valid JSON
      try {
        JSON.parse(ruleData.toString());
        return true;
      } catch {
        return false;
      }
    } catch {
      return false;
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): ExecutionEngineConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ExecutionEngineConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get performance metrics for the last execution
   */
  getLastExecutionMetrics(): ExecutionMetrics | undefined {
    return this.lastExecutionMetrics;
  }

  /**
   * Enhanced sequential execution with state tracking and pipeline mode
   */
  async executeSequentialWithMetrics<T>(
    ruleIds: string[],
    input: Record<string, unknown>,
    options: SequentialExecutionOptions = {},
  ): Promise<SequentialExecutionResult<T>> {
    const {
      stopOnError = false,
      includeStateTracking = false,
      pipelineMode = true,
      ruleTimeout = this.config.executionTimeout ?? 5000,
      includeMetrics = this.config.includePerformanceMetrics ?? false,
    } = options;

    const metricsCollector = new ExecutionMetricsCollector();
    metricsCollector.start();

    const results = new Map<string, T>();
    const errors = new Map<string, Error>();
    let currentInput = { ...input };

    // Initialize execution state tracking
    const executionState: SequentialExecutionState = {
      completedRules: [],
      failedRules: [],
      currentInput: { ...input },
      timeline: [],
    };

    try {
      for (const ruleId of ruleIds) {
        // Update execution state
        if (includeStateTracking) {
          executionState.currentRule = ruleId;
          executionState.timeline.push({
            ruleId,
            event: 'started',
            timestamp: performance.now(),
          });
        }

        metricsCollector.startRule(ruleId);
        const ruleStartTime = performance.now();

        try {
          const result = await this.executeWithTimeout(
            () => this.zenEngine.evaluate(ruleId, currentInput),
            ruleTimeout,
          );

          const ruleDuration = performance.now() - ruleStartTime;
          metricsCollector.endRule(ruleId);

          results.set(ruleId, result.result);

          // Update execution state
          if (includeStateTracking) {
            executionState.completedRules.push(ruleId);
            executionState.timeline.push({
              ruleId,
              event: 'completed',
              timestamp: performance.now(),
              duration: ruleDuration,
            });
          }

          // Update input for next rule (pipeline mode)
          if (pipelineMode && result.result && typeof result.result === 'object') {
            currentInput = { ...currentInput, ...(result.result as Record<string, unknown>) };

            if (includeStateTracking) {
              executionState.currentInput = { ...currentInput };
            }
          }
        } catch (error) {
          const ruleDuration = performance.now() - ruleStartTime;
          metricsCollector.endRule(ruleId);

          const execError = error as Error;
          errors.set(ruleId, execError);

          // Update execution state
          if (includeStateTracking) {
            executionState.failedRules.push(ruleId);
            executionState.timeline.push({
              ruleId,
              event: 'failed',
              timestamp: performance.now(),
              duration: ruleDuration,
              error: execError.message,
            });
          }

          // Stop on error if configured
          if (stopOnError) {
            break;
          }
        }
      }

      // Clear current rule from state
      if (includeStateTracking) {
        executionState.currentRule = undefined;
      }

      // Collect final metrics
      const metrics = metricsCollector.getMetrics();
      this.lastExecutionMetrics = metrics;

      const result: SequentialExecutionResult<T> = {
        results,
        executionTime: metrics.totalTime,
        errors: errors.size > 0 ? errors : undefined,
      };

      // Add execution state if requested
      if (includeStateTracking) {
        result.executionState = executionState;
      }

      // Add final input state if pipeline mode
      if (pipelineMode) {
        result.finalInput = currentInput;
      }

      // Add performance metrics if requested
      if (includeMetrics) {
        result.performanceMetrics = metrics;
        result.performanceAnalysis = PerformanceAnalyzer.analyzeMetrics(metrics);
      }

      return result;
    } catch (error) {
      const metrics = metricsCollector.getMetrics();
      this.lastExecutionMetrics = metrics;

      throw new MinimalGoRulesError(
        MinimalErrorCode.EXECUTION_ERROR,
        `Sequential execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Enhanced parallel execution with detailed metrics and options
   */
  async executeParallelWithMetrics<T>(
    ruleIds: string[],
    input: Record<string, unknown>,
    options: ParallelExecutionOptions = {},
  ): Promise<EnhancedExecutionResult<T>> {
    const {
      maxConcurrency = this.config.maxConcurrency ?? 10,
      failFast = false,
      includeMetrics = this.config.includePerformanceMetrics ?? false,
      ruleTimeout = this.config.executionTimeout ?? 5000,
    } = options;

    const metricsCollector = new ExecutionMetricsCollector();
    metricsCollector.start();

    const results = new Map<string, T>();
    const errors = new Map<string, Error>();

    try {
      // Create batches to respect concurrency limits
      const batches = this.createBatches(ruleIds, maxConcurrency);

      for (const batch of batches) {
        const batchStartTime = performance.now();

        const promises = batch.map(async (ruleId) => {
          metricsCollector.startRule(ruleId);

          try {
            const result = await this.executeWithTimeout(
              () => this.zenEngine.evaluate(ruleId, input),
              ruleTimeout,
            );

            metricsCollector.endRule(ruleId);
            return { ruleId, result: result.result, error: null };
          } catch (error) {
            metricsCollector.endRule(ruleId);
            const execError = error as Error;

            if (failFast) {
              throw execError;
            }

            return { ruleId, result: null, error: execError };
          }
        });

        const batchResults = await Promise.allSettled(promises);
        const batchDuration = performance.now() - batchStartTime;
        metricsCollector.recordBatch(batch.length, batchDuration);

        for (const promiseResult of batchResults) {
          if (promiseResult.status === 'fulfilled') {
            const { ruleId, result, error } = promiseResult.value;
            if (error) {
              errors.set(ruleId, error);
            } else {
              results.set(ruleId, result);
            }
          } else {
            // This can happen if failFast is true and an error was thrown
            if (failFast) {
              throw promiseResult.reason;
            }
          }
        }

        // If failFast is enabled and we have errors, stop processing
        if (failFast && errors.size > 0) {
          break;
        }
      }

      // Collect final metrics
      const metrics = metricsCollector.getMetrics();
      this.lastExecutionMetrics = metrics;

      const result: EnhancedExecutionResult<T> = {
        results,
        executionTime: metrics.totalTime,
        errors: errors.size > 0 ? errors : undefined,
      };

      // Add performance metrics if requested
      if (includeMetrics) {
        result.performanceMetrics = metrics;
        result.performanceAnalysis = PerformanceAnalyzer.analyzeMetrics(metrics);
      }

      return result;
    } catch (error) {
      const metrics = metricsCollector.getMetrics();
      this.lastExecutionMetrics = metrics;

      throw new MinimalGoRulesError(
        MinimalErrorCode.EXECUTION_ERROR,
        `Parallel execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Execute rules in parallel mode
   */
  private async executeParallel<T>(
    ruleIds: string[],
    input: Record<string, unknown>,
  ): Promise<MinimalExecutionResult<T>> {
    const results = new Map<string, T>();
    const errors = new Map<string, Error>();

    // Create batches to respect concurrency limits
    const batches = this.createBatches(ruleIds, this.config.maxConcurrency ?? 10);

    for (const batch of batches) {
      const promises = batch.map(async (ruleId) => {
        try {
          const result = await this.executeWithTimeout(
            () => this.zenEngine.evaluate(ruleId, input),
            this.config.executionTimeout ?? 5000,
          );
          return { ruleId, result: result.result, error: null };
        } catch (error) {
          return { ruleId, result: null, error: error as Error };
        }
      });

      const batchResults = await Promise.allSettled(promises);

      for (const promiseResult of batchResults) {
        if (promiseResult.status === 'fulfilled') {
          const { ruleId, result, error } = promiseResult.value;
          if (error) {
            errors.set(ruleId, error);
          } else {
            results.set(ruleId, result);
          }
        } else {
          // This shouldn't happen since we catch errors in the promise
          console.warn('Unexpected promise rejection in parallel execution');
        }
      }
    }

    return {
      results,
      executionTime: 0, // Will be set by caller
      errors: errors.size > 0 ? errors : undefined,
    };
  }

  /**
   * Execute rules in sequential mode (pipeline)
   */
  private async executeSequential<T>(
    ruleIds: string[],
    input: Record<string, unknown>,
  ): Promise<MinimalExecutionResult<T>> {
    // Use enhanced sequential execution with default options
    const result = await this.executeSequentialWithMetrics<T>(ruleIds, input, {
      stopOnError: false,
      pipelineMode: true,
      includeStateTracking: false,
      includeMetrics: false,
    });

    return {
      results: result.results,
      executionTime: result.executionTime,
      errors: result.errors,
    };
  }

  /**
   * Enhanced mixed execution with complex rule orchestration
   */
  async executeMixedWithMetrics<T>(
    groups: ExecutionGroup[],
    input: Record<string, unknown>,
    options: MixedExecutionOptions = {},
  ): Promise<MixedExecutionResult<T>> {
    const {
      stopOnError = false,
      pipelineMode = true,
      ruleTimeout = this.config.executionTimeout ?? 5000,
      includeMetrics = this.config.includePerformanceMetrics ?? false,
      maxConcurrency = this.config.maxConcurrency ?? 10,
    } = options;

    const metricsCollector = new ExecutionMetricsCollector();
    metricsCollector.start();

    try {
      // Validate and optimize execution groups
      const executionPlan = await this.validateExecutionGroups(groups);

      const results = new Map<string, T>();
      const errors = new Map<string, Error>();
      const groupResults: MixedExecutionResult<T>['groupResults'] = [];
      let currentInput = { ...input };

      // Execute each group in sequence
      for (let groupIndex = 0; groupIndex < executionPlan.groups.length; groupIndex++) {
        const group = executionPlan.groups[groupIndex];
        const groupStartTime = performance.now();

        try {
          let groupResult: {
            results: Map<string, T>;
            errors?: Map<string, Error>;
            executionTime: number;
          };

          if (group.mode === 'parallel') {
            // Execute group in parallel
            groupResult = await this.executeParallelWithMetrics(group.ruleIds, currentInput, {
              maxConcurrency,
              ruleTimeout,
              includeMetrics: false, // We'll collect metrics at the mixed level
              failFast: stopOnError,
            });
          } else {
            // Execute group sequentially
            groupResult = await this.executeSequentialWithMetrics(group.ruleIds, currentInput, {
              stopOnError,
              pipelineMode: true, // Always use pipeline within sequential groups
              ruleTimeout,
              includeMetrics: false, // We'll collect metrics at the mixed level
              includeStateTracking: false,
            });
          }

          const groupExecutionTime = performance.now() - groupStartTime;

          // Record group results
          groupResults.push({
            groupIndex,
            mode: group.mode,
            ruleIds: group.ruleIds,
            results: groupResult.results,
            errors: groupResult.errors,
            executionTime: groupExecutionTime,
          });

          // Merge results from this group
          for (const [ruleId, result] of groupResult.results) {
            results.set(ruleId, result);
            metricsCollector.recordRuleSuccess(ruleId, 0); // Time will be calculated from group time
          }

          // Merge errors from this group
          if (groupResult.errors) {
            for (const [ruleId, error] of groupResult.errors) {
              errors.set(ruleId, error);
              metricsCollector.recordRuleError(ruleId, error);
            }
          }

          // Update input for next group (pipeline mode between groups)
          if (pipelineMode) {
            for (const [, result] of groupResult.results) {
              if (result && typeof result === 'object') {
                currentInput = { ...currentInput, ...(result as Record<string, unknown>) };
              }
            }
          }

          // Stop on error if configured and we have errors
          if (stopOnError && groupResult.errors && groupResult.errors.size > 0) {
            break;
          }
        } catch (error) {
          const groupExecutionTime = performance.now() - groupStartTime;

          // Record group failure
          groupResults.push({
            groupIndex,
            mode: group.mode,
            ruleIds: group.ruleIds,
            results: new Map(),
            errors: new Map([['group_error', error as Error]]),
            executionTime: groupExecutionTime,
          });

          if (stopOnError) {
            throw error;
          }
        }
      }

      // Collect final metrics
      const metrics = metricsCollector.getMetrics();
      this.lastExecutionMetrics = metrics;

      const result: MixedExecutionResult<T> = {
        results,
        executionTime: metrics.totalTime,
        errors: errors.size > 0 ? errors : undefined,
        executionPlan,
        groupResults,
      };

      // Add final input state if pipeline mode
      if (pipelineMode) {
        result.finalInput = currentInput;
      }

      // Add performance metrics if requested
      if (includeMetrics) {
        result.performanceMetrics = metrics;
        result.performanceAnalysis = PerformanceAnalyzer.analyzeMetrics(metrics);
      }

      return result;
    } catch (error) {
      const metrics = metricsCollector.getMetrics();
      this.lastExecutionMetrics = metrics;

      throw new MinimalGoRulesError(
        MinimalErrorCode.EXECUTION_ERROR,
        `Mixed execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Validate and optimize execution groups for mixed mode
   */
  async validateExecutionGroups(groups: ExecutionGroup[]): Promise<ExecutionPlan> {
    if (!groups || groups.length === 0) {
      throw new MinimalGoRulesError(
        MinimalErrorCode.INVALID_INPUT,
        'Execution groups cannot be empty',
      );
    }

    const validatedGroups: ValidatedExecutionGroup[] = [];
    const allRuleIds = new Set<string>();
    const optimizations: string[] = [];
    let totalRules = 0;

    // Get available rules from cache
    const availableRules = await this.getAvailableRules();
    const availableRuleIds = new Set(availableRules.keys());

    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];

      // Validate group structure
      if (!group.rules || group.rules.length === 0) {
        throw new MinimalGoRulesError(
          MinimalErrorCode.INVALID_INPUT,
          `Execution group ${i} cannot have empty rules array`,
        );
      }

      if (!['parallel', 'sequential'].includes(group.mode)) {
        throw new MinimalGoRulesError(
          MinimalErrorCode.INVALID_INPUT,
          `Invalid execution mode '${group.mode}' in group ${i}. Must be 'parallel' or 'sequential'`,
        );
      }

      // Validate rule existence
      const validRuleIds: string[] = [];
      for (const ruleId of group.rules) {
        if (!availableRuleIds.has(ruleId)) {
          throw new MinimalGoRulesError(
            MinimalErrorCode.RULE_NOT_FOUND,
            `Rule '${ruleId}' in group ${i} not found in cache`,
            ruleId,
          );
        }

        if (allRuleIds.has(ruleId)) {
          throw new MinimalGoRulesError(
            MinimalErrorCode.INVALID_INPUT,
            `Rule '${ruleId}' appears in multiple execution groups. Each rule can only appear once.`,
            ruleId,
          );
        }

        validRuleIds.push(ruleId);
        allRuleIds.add(ruleId);
      }

      // Generate optimizations
      if (group.mode === 'parallel' && group.rules.length === 1) {
        optimizations.push(
          `Group ${i}: Single rule in parallel mode could be optimized to sequential`,
        );
      }

      if (group.mode === 'sequential' && group.rules.length > 5) {
        optimizations.push(
          `Group ${i}: Large sequential group (${group.rules.length} rules) might benefit from parallel sub-groups`,
        );
      }

      validatedGroups.push({
        ruleIds: validRuleIds,
        mode: group.mode,
        index: i,
        estimatedTime: this.estimateGroupExecutionTime(group.mode, validRuleIds.length),
      });

      totalRules += validRuleIds.length;
    }

    // Generate execution plan optimizations
    if (validatedGroups.length > 10) {
      optimizations.push('Large number of execution groups might benefit from consolidation');
    }

    const estimatedTotalTime = validatedGroups.reduce(
      (sum, group) => sum + (group.estimatedTime || 0),
      0,
    );

    return {
      groups: validatedGroups,
      totalRules,
      estimatedTime: estimatedTotalTime,
      optimizations: optimizations.length > 0 ? optimizations : undefined,
    };
  }

  /**
   * Execute rules in mixed mode (simplified version for backward compatibility)
   */
  private async executeMixed<T>(
    groups: ExecutionGroup[],
    input: Record<string, unknown>,
  ): Promise<MinimalExecutionResult<T>> {
    // Use enhanced mixed execution with default options
    const result = await this.executeMixedWithMetrics<T>(groups, input, {
      stopOnError: false,
      pipelineMode: true,
      includeStateTracking: false,
      includeMetrics: false,
    });

    return {
      results: result.results,
      executionTime: result.executionTime,
      errors: result.errors,
    };
  }

  /**
   * Estimate execution time for a group based on mode and rule count
   */
  private estimateGroupExecutionTime(mode: 'parallel' | 'sequential', ruleCount: number): number {
    const avgRuleTime = 50; // Average rule execution time in ms

    if (mode === 'parallel') {
      // Parallel execution time is roughly the time of the slowest rule plus overhead
      return avgRuleTime + ruleCount * 5; // 5ms overhead per rule
    } else {
      // Sequential execution time is sum of all rule times
      return avgRuleTime * ruleCount;
    }
  }

  /**
   * Execute a function with timeout
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<ZenEngineResult<T>>,
    timeoutMs: number,
  ): Promise<ZenEngineResult<T>> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(
          new MinimalGoRulesError(
            MinimalErrorCode.TIMEOUT,
            `Execution timed out after ${timeoutMs}ms`,
          ),
        );
      }, timeoutMs);

      fn()
        .then((result) => {
          clearTimeout(timeout);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  /**
   * Create batches for parallel execution with concurrency control
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Get available rules from cache manager
   */
  private async getAvailableRules() {
    return await this.cacheManager.getAllMetadata();
  }
}
