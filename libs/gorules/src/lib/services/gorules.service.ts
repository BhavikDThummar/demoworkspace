import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ZenEngine, ZenEngineOptions, ZenEvaluateOptions } from '@gorules/zen-engine';
import { GoRulesConfigService } from '../config/gorules.config.js';
import { IGoRulesService } from './gorules.service.interface.js';
import { GoRulesResilienceService } from './gorules-resilience.service.js';
import { GoRulesLoggerService } from '../logging/gorules-logger.service.js';
import { GoRulesMetricsService } from '../monitoring/gorules-metrics.service.js';
import { GoRulesMonitoringService } from '../monitoring/gorules-monitoring.service.js';
import {
  RuleExecutionOptions,
  RuleExecutionResult,
  BatchRuleExecution,
  BatchRuleExecutionResult,
  RuleMetadata,
  PerformanceMetrics,
  GoRulesException,
  GoRulesErrorCode,
  RuleInputData,
  RuleValidationResult,
  RuleValidationError,
  ExecutionTrace,
  TraceStep,
} from '../types/index.js';

/**
 * Main GoRules service implementation with comprehensive error handling and validation
 */
@Injectable()
export class GoRulesService implements IGoRulesService, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GoRulesService.name);
  private zenEngine!: ZenEngine;
  private isInitialized = false;
  private ruleCache = new Map<string, { metadata: RuleMetadata; lastAccessed: Date }>();
  private executionStats = new Map<string, { count: number; totalTime: number; errors: number }>();

  constructor(
    private readonly configService: GoRulesConfigService,
    private readonly resilienceService: GoRulesResilienceService,
    private readonly loggerService: GoRulesLoggerService,
    private readonly metricsService: GoRulesMetricsService,
    private readonly monitoringService: GoRulesMonitoringService
  ) {
    // Initialize monitoring with configuration
    this.monitoringService.logConfigurationEvent('service-initialized', {
      enableLogging: this.configService.getConfig().enableLogging,
      timeout: this.configService.getConfig().timeout,
      retryAttempts: this.configService.getConfig().retryAttempts,
    });
  }

  /**
   * Initialize the service when the module starts
   */
  async onModuleInit(): Promise<void> {
    await this.initializeService();
  }

  /**
   * Cleanup resources when the module is destroyed
   */
  onModuleDestroy(): void {
    this.cleanup();
  }

  /**
   * Execute a single rule with comprehensive validation and error handling
   */
  async executeRule<T extends RuleInputData = RuleInputData, R = unknown>(
    ruleId: string,
    input: T,
    options?: RuleExecutionOptions
  ): Promise<RuleExecutionResult<R>> {
    this.ensureInitialized();
    this.validateRuleId(ruleId);
    this.validateInput(input);

    const config = this.configService.getConfig();
    const startTime = Date.now();
    const executionTimeout = options?.timeout || config.timeout || 30000;
    const executionId = `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Start comprehensive monitoring
    this.monitoringService.startExecution(ruleId, executionId, input);
    
    // Start logging execution
    this.loggerService.logExecutionStart(ruleId, executionId, input);

    try {

      // Create execution options with timeout
      const evaluateOptions: ZenEvaluateOptions = {
        trace: options?.trace || false,
        maxDepth: 100,
      };

      // Execute with resilience (retry + circuit breaker + timeout)
      const response = await this.resilienceService.withResilience(
        () => this.zenEngine.evaluate(ruleId, input, evaluateOptions),
        `rule-execution-${ruleId}`,
        {
          retry: {
            maxAttempts: config.retryAttempts || 3,
            baseDelay: 100,
            maxDelay: 5000,
            backoffMultiplier: 2,
            jitterFactor: 0.1,
          },
          circuitBreaker: {
            failureThreshold: 5,
            resetTimeout: 60000,
            successThreshold: 3,
            requestTimeout: executionTimeout,
          },
        }
      );

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Complete monitoring with success
      this.monitoringService.completeExecution(ruleId, executionId, response.result, totalTime);

      // Log execution success
      this.loggerService.logExecutionSuccess(executionId, response.result);

      // Record metrics
      this.metricsService.recordExecutionTime(ruleId, totalTime, true);

      // Update execution statistics
      this.updateExecutionStats(ruleId, totalTime, false);

      // Build performance metrics
      const performance: PerformanceMetrics = {
        executionTime: parseInt(response.performance, 10) || 0,
        networkTime: 0, // Will be calculated when we add HTTP calls
        totalTime,
      };

      // Get or create rule metadata
      const metadata = await this.getOrCreateRuleMetadata(ruleId);

      // Build execution result
      const result: RuleExecutionResult<R> = {
        result: response.result,
        performance,
        metadata,
      };

      // Add trace information if requested
      if (options?.trace && response.trace) {
        result.trace = this.buildExecutionTrace(response.trace, totalTime, [ruleId]);
      }



      return result;
    } catch (error) {
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Complete monitoring with failure
      this.monitoringService.failExecution(ruleId, executionId, error instanceof Error ? error : new Error(String(error)), totalTime);

      // Log execution failure
      this.loggerService.logExecutionError(executionId, error instanceof Error ? error : new Error(String(error)));

      // Record error metrics
      this.metricsService.recordExecutionTime(ruleId, totalTime, false);

      // Update error statistics
      this.updateExecutionStats(ruleId, totalTime, true);

      if (error instanceof GoRulesException) {
        throw error;
      }

      // Determine if error is retryable
      const isRetryable = this.isRetryableError(error);

      throw new GoRulesException(
        this.mapErrorToCode(error),
        `Rule execution failed: ${error instanceof Error ? error.message : String(error)}`,
        { ruleId, originalError: error, inputKeys: Object.keys(input) },
        isRetryable
      );
    }
  }

  /**
   * Execute multiple rules in batch with parallel processing support
   */
  async executeBatch<T extends RuleInputData = RuleInputData, R = unknown>(
    executions: BatchRuleExecution<T>[]
  ): Promise<BatchRuleExecutionResult<R>[]> {
    this.ensureInitialized();
    this.validateBatchExecutions(executions);

    // Log batch execution start
    if (this.configService.getConfig().enableLogging) {
      this.logger.debug(`Executing batch of ${executions.length} rules`);
    }

    const maxConcurrency = 5; // Default concurrency limit
    const results: BatchRuleExecutionResult<R>[] = [];

    // Process executions in chunks to respect concurrency limits
    for (let i = 0; i < executions.length; i += maxConcurrency) {
      const chunk = executions.slice(i, i + maxConcurrency);
      const chunkPromises = chunk.map(execution => this.executeSingleBatchItem<T, R>(execution));
      
      const chunkResults = await Promise.allSettled(chunkPromises);
      
      chunkResults.forEach((result, index) => {
        const execution = chunk[index];
        const executionId = execution.executionId || `batch-${Date.now()}-${i + index}`;

        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          // Handle rejected promise
          results.push({
            executionId,
            ruleId: execution.ruleId,
            result: {
              decision: null as R,
              appliedRules: [],
              warnings: [],
            },
            error: {
              code: GoRulesErrorCode.INTERNAL_ERROR,
              message: result.reason instanceof Error ? result.reason.message : String(result.reason),
              details: { originalError: result.reason },
              retryable: false,
            },
          });
        }
      });
    }

    // Log batch execution completion
    const successCount = results.filter(r => !r.error).length;
    const errorCount = results.length - successCount;
    if (this.configService.getConfig().enableLogging) {
      this.logger.log(`Batch execution completed: ${successCount} success, ${errorCount} errors`);
    }

    return results;
  }

  /**
   * Validate that a rule exists and is accessible
   */
  async validateRuleExists(ruleId: string): Promise<boolean> {
    this.ensureInitialized();
    this.validateRuleId(ruleId);

    try {
      // Try to get the decision to validate it exists with resilience
      await this.resilienceService.withResilience(
        () => this.zenEngine.getDecision(ruleId),
        `rule-validation-${ruleId}`,
        {
          retry: {
            maxAttempts: 2, // Fewer retries for validation
            baseDelay: 50,
            maxDelay: 1000,
          },
          circuitBreaker: {
            failureThreshold: 3,
            resetTimeout: 30000,
            successThreshold: 2,
            requestTimeout: 5000,
          },
        }
      );
      
      // Cache the successful validation
      if (!this.ruleCache.has(ruleId)) {
        const metadata = await this.getOrCreateRuleMetadata(ruleId);
        this.ruleCache.set(ruleId, { metadata, lastAccessed: new Date() });
      }
      
      return true;
    } catch (error) {
      this.logger.debug(`Rule validation failed for ${ruleId}: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Get metadata information for a rule
   */
  async getRuleMetadata(ruleId: string): Promise<RuleMetadata> {
    this.ensureInitialized();
    this.validateRuleId(ruleId);

    try {
      return await this.getOrCreateRuleMetadata(ruleId);
    } catch (error) {
      throw new GoRulesException(
        GoRulesErrorCode.RULE_NOT_FOUND,
        `Failed to get metadata for rule: ${ruleId}`,
        { ruleId, originalError: error },
        false
      );
    }
  }

  /**
   * Validate a rule's structure and configuration
   */
  async validateRule(ruleId: string): Promise<RuleValidationResult> {
    this.ensureInitialized();
    this.validateRuleId(ruleId);

    const errors: RuleValidationError[] = [];
    const warnings: RuleValidationError[] = [];

    try {
      // Check if rule exists
      const exists = await this.validateRuleExists(ruleId);
      if (!exists) {
        errors.push({
          code: 'RULE_NOT_FOUND',
          message: `Rule with ID '${ruleId}' does not exist`,
          path: 'ruleId',
        });
      }

      // Try to get the decision for additional validation
      try {
        const decision = await this.zenEngine.getDecision(ruleId);
        
        // Validate the decision structure (basic validation)
        if (!decision) {
          errors.push({
            code: 'INVALID_DECISION',
            message: 'Rule decision is null or undefined',
            path: 'decision',
          });
        }
      } catch (error) {
        errors.push({
          code: 'DECISION_LOAD_ERROR',
          message: `Failed to load rule decision: ${error instanceof Error ? error.message : String(error)}`,
          path: 'decision',
          details: error,
        });
      }

      // Additional validation checks can be added here
      // For example: schema validation, dependency checks, etc.

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      throw new GoRulesException(
        GoRulesErrorCode.INTERNAL_ERROR,
        `Rule validation failed: ${error instanceof Error ? error.message : String(error)}`,
        { ruleId, originalError: error },
        false
      );
    }
  }

  /**
   * Get execution statistics for monitoring
   */
  getExecutionStatistics(): Record<string, { count: number; averageTime: number; errorRate: number }> {
    const stats: Record<string, { count: number; averageTime: number; errorRate: number }> = {};
    
    this.executionStats.forEach((stat, ruleId) => {
      stats[ruleId] = {
        count: stat.count,
        averageTime: stat.count > 0 ? stat.totalTime / stat.count : 0,
        errorRate: stat.count > 0 ? stat.errors / stat.count : 0,
      };
    });

    return stats;
  }

  /**
   * Clear execution statistics
   */
  clearExecutionStatistics(): void {
    this.executionStats.clear();
    this.logger.debug('Execution statistics cleared');
  }

  /**
   * Get circuit breaker statistics for all operations
   */
  getCircuitBreakerStatistics(): Record<string, any> {
    return this.resilienceService.getAllCircuitBreakerStats();
  }

  /**
   * Get circuit breaker statistics for a specific rule
   */
  getRuleCircuitBreakerStats(ruleId: string): any {
    return this.resilienceService.getCircuitBreakerStats(`rule-execution-${ruleId}`);
  }

  /**
   * Reset circuit breaker for a specific rule
   */
  resetRuleCircuitBreaker(ruleId: string): void {
    this.resilienceService.resetCircuitBreaker(`rule-execution-${ruleId}`);
    this.logger.log(`Circuit breaker reset for rule: ${ruleId}`);
  }

  /**
   * Reset all circuit breakers
   */
  resetAllCircuitBreakers(): void {
    const stats = this.resilienceService.getAllCircuitBreakerStats();
    Object.keys(stats).forEach(operationName => {
      this.resilienceService.resetCircuitBreaker(operationName);
    });
    this.logger.log('All circuit breakers reset');
  }

  /**
   * Initialize the GoRules service
   */
  private async initializeService(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    const config = this.configService.getConfig();
    
    try {
      const engineOptions: ZenEngineOptions = {
        loader: async (key: string) => {
          // This will be implemented to load rules from GoRules API
          // For now, we'll throw an error to indicate it needs implementation
          throw new GoRulesException(
            GoRulesErrorCode.RULE_NOT_FOUND,
            `Rule loader not implemented for key: ${key}`,
            { key },
            false
          );
        },
      };

      this.zenEngine = new ZenEngine(engineOptions);
      this.isInitialized = true;
      
      if (config.enableLogging) {
        this.logger.log('GoRules service initialized successfully');
      }
    } catch (error) {
      this.logger.error('Failed to initialize GoRules service', error);
      throw new GoRulesException(
        GoRulesErrorCode.INTERNAL_ERROR,
        `Service initialization failed: ${error instanceof Error ? error.message : String(error)}`,
        { originalError: error },
        false
      );
    }
  }

  /**
   * Execute a single batch item
   */
  private async executeSingleBatchItem<T extends RuleInputData, R>(
    execution: BatchRuleExecution<T>
  ): Promise<BatchRuleExecutionResult<R>> {
    const executionId = execution.executionId || `batch-${Date.now()}-${Math.random()}`;
    
    try {
      const result = await this.executeRule<T, R>(
        execution.ruleId,
        execution.input,
        execution.options
      );

      return {
        executionId,
        ruleId: execution.ruleId,
        result: {
          decision: result.result,
          appliedRules: [execution.ruleId],
          warnings: [],
        },
      };
    } catch (error) {
      return {
        executionId,
        ruleId: execution.ruleId,
        result: {
          decision: null as R,
          appliedRules: [],
          warnings: [],
        },
        error: {
          code: error instanceof GoRulesException ? error.code : GoRulesErrorCode.INTERNAL_ERROR,
          message: error instanceof Error ? error.message : String(error),
          details: error instanceof GoRulesException ? error.details : undefined,
          retryable: error instanceof GoRulesException ? error.retryable : false,
        },
      };
    }
  }

  /**
   * Get or create rule metadata with caching
   */
  private async getOrCreateRuleMetadata(ruleId: string): Promise<RuleMetadata> {
    // Check cache first
    const cached = this.ruleCache.get(ruleId);
    if (cached) {
      cached.lastAccessed = new Date();
      return cached.metadata;
    }

    // Create basic metadata (will be enhanced when we integrate with GoRules API)
    const metadata: RuleMetadata = {
      id: ruleId,
      name: ruleId,
      version: '1.0.0',
      description: `Rule ${ruleId}`,
      tags: [],
      lastModified: new Date(),
    };

    // Cache the metadata
    this.ruleCache.set(ruleId, { metadata, lastAccessed: new Date() });

    return metadata;
  }

  /**
   * Build execution trace from Zen Engine response
   */
  private buildExecutionTrace(
    zenTrace: Record<string, any>,
    totalDuration: number,
    rulesEvaluated: string[]
  ): ExecutionTrace {
    const steps: TraceStep[] = Object.values(zenTrace).map((trace: any) => ({
      id: trace.id,
      name: trace.name,
      duration: parseInt(trace.performance || '0', 10),
      input: trace.input,
      output: trace.output,
    }));

    return {
      steps,
      duration: totalDuration,
      rulesEvaluated,
    };
  }

  /**
   * Update execution statistics
   */
  private updateExecutionStats(ruleId: string, executionTime: number, isError: boolean): void {
    const current = this.executionStats.get(ruleId) || { count: 0, totalTime: 0, errors: 0 };
    
    current.count++;
    current.totalTime += executionTime;
    if (isError) {
      current.errors++;
    }

    this.executionStats.set(ruleId, current);
  }



  /**
   * Validate rule ID
   */
  private validateRuleId(ruleId: string): void {
    if (!ruleId || typeof ruleId !== 'string' || ruleId.trim().length === 0) {
      throw new GoRulesException(
        GoRulesErrorCode.INVALID_INPUT,
        'Rule ID must be a non-empty string',
        { ruleId },
        false
      );
    }
  }

  /**
   * Validate input data
   */
  private validateInput(input: RuleInputData): void {
    if (!input || typeof input !== 'object') {
      throw new GoRulesException(
        GoRulesErrorCode.INVALID_INPUT,
        'Input must be a valid object',
        { input: typeof input },
        false
      );
    }
  }

  /**
   * Validate batch executions
   */
  private validateBatchExecutions(executions: BatchRuleExecution[]): void {
    if (!Array.isArray(executions) || executions.length === 0) {
      throw new GoRulesException(
        GoRulesErrorCode.INVALID_INPUT,
        'Batch executions must be a non-empty array',
        { executionsType: typeof executions, length: Array.isArray(executions) ? executions.length : 'N/A' },
        false
      );
    }

    executions.forEach((execution, index) => {
      if (!execution.ruleId) {
        throw new GoRulesException(
          GoRulesErrorCode.INVALID_INPUT,
          `Batch execution at index ${index} is missing ruleId`,
          { index, execution },
          false
        );
      }

      if (!execution.input) {
        throw new GoRulesException(
          GoRulesErrorCode.INVALID_INPUT,
          `Batch execution at index ${index} is missing input`,
          { index, execution },
          false
        );
      }
    });
  }

  /**
   * Ensure service is initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new GoRulesException(
        GoRulesErrorCode.INTERNAL_ERROR,
        'GoRules service is not initialized',
        {},
        false
      );
    }
  }

  /**
   * Determine if an error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    if (error instanceof GoRulesException) {
      return error.retryable;
    }

    // Network errors, timeouts, and temporary failures are typically retryable
    const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    
    return (
      errorMessage.includes('timeout') ||
      errorMessage.includes('network') ||
      errorMessage.includes('connection') ||
      errorMessage.includes('temporary') ||
      errorMessage.includes('rate limit')
    );
  }

  /**
   * Map generic errors to GoRules error codes
   */
  private mapErrorToCode(error: unknown): GoRulesErrorCode {
    if (error instanceof GoRulesException) {
      return error.code;
    }

    const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

    if (errorMessage.includes('timeout')) {
      return GoRulesErrorCode.TIMEOUT;
    }
    if (errorMessage.includes('network') || errorMessage.includes('connection')) {
      return GoRulesErrorCode.NETWORK_ERROR;
    }
    if (errorMessage.includes('not found')) {
      return GoRulesErrorCode.RULE_NOT_FOUND;
    }
    if (errorMessage.includes('unauthorized') || errorMessage.includes('authentication')) {
      return GoRulesErrorCode.AUTHENTICATION_FAILED;
    }
    if (errorMessage.includes('rate limit')) {
      return GoRulesErrorCode.RATE_LIMIT_EXCEEDED;
    }
    if (errorMessage.includes('invalid') || errorMessage.includes('validation')) {
      return GoRulesErrorCode.INVALID_INPUT;
    }

    return GoRulesErrorCode.INTERNAL_ERROR;
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    if (this.zenEngine) {
      this.zenEngine.dispose();
      this.logger.log('GoRules Zen Engine disposed');
    }

    this.ruleCache.clear();
    this.executionStats.clear();
    this.isInitialized = false;
  }
}