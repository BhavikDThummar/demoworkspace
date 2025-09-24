import { Injectable, Logger } from '@nestjs/common';
import {
  ZenEngine,
  ZenEngineOptions,
  ZenEvaluateOptions,
  ZenEngineResponse,
} from '@gorules/zen-engine';
import { GoRulesConfigService } from '../config/gorules.config.js';
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
} from '../types/index.js';

/**
 * Service for executing GoRules using the Zen Engine
 */
@Injectable()
export class GoRulesZenService {
  private readonly logger = new Logger(GoRulesZenService.name);
  private zenEngine!: ZenEngine;
  private isInitialized = false;

  constructor(private readonly configService: GoRulesConfigService) {
    // Don't initialize in constructor - do it lazily
  }

  /**
   * Initialize the Zen Engine with configuration
   */
  private initializeZenEngine(): void {
    if (this.isInitialized) {
      return;
    }

    const config = this.configService.getConfig();

    const engineOptions: ZenEngineOptions = {
      loader: async (key: string) => {
        // This will be implemented to load rules from GoRules API
        // For now, we'll throw an error to indicate it needs implementation
        throw new GoRulesException(
          GoRulesErrorCode.RULE_NOT_FOUND,
          `Rule loader not implemented for key: ${key}`,
          { key },
          false,
        );
      },
    };

    this.zenEngine = new ZenEngine(engineOptions);
    this.isInitialized = true;

    if (config.enableLogging) {
      this.logger.log('GoRules Zen Engine initialized successfully');
    }
  }

  /**
   * Execute a single rule with the provided input
   */
  async executeRule<T = any, R = any>(
    ruleId: string,
    input: T,
    options?: RuleExecutionOptions,
  ): Promise<RuleExecutionResult<R>> {
    this.initializeZenEngine();
    const config = this.configService.getConfig();
    const startTime = Date.now();

    try {
      if (config.enableLogging) {
        this.logger.debug(`Executing rule: ${ruleId}`, { ruleId, input });
      }

      const evaluateOptions: ZenEvaluateOptions = {
        trace: options?.trace || false,
        maxDepth: 100, // Default max depth
      };

      const response: ZenEngineResponse = await this.zenEngine.evaluate(
        ruleId,
        input,
        evaluateOptions,
      );

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      const performance: PerformanceMetrics = {
        executionTime: parseInt(response.performance, 10) || 0,
        networkTime: 0, // Will be calculated when we add HTTP calls
        totalTime,
      };

      const metadata: RuleMetadata = {
        id: ruleId,
        name: ruleId, // Will be enhanced when we have rule metadata
        version: '1.0.0',
        description: `Rule execution for ${ruleId}`,
        tags: [],
        lastModified: new Date(),
      };

      const result: RuleExecutionResult<R> = {
        result: response.result,
        performance,
        metadata,
      };

      if (options?.trace && response.trace) {
        result.trace = {
          steps: Object.values(response.trace).map((trace) => ({
            id: trace.id,
            name: trace.name,
            duration: parseInt(trace.performance || '0', 10),
            input: trace.input,
            output: trace.output,
          })),
          duration: performance.totalTime,
          rulesEvaluated: [ruleId],
        };
      }

      if (config.enableLogging) {
        this.logger.log(`Rule executed successfully: ${ruleId}`, {
          ruleId,
          executionTime: performance.executionTime,
          totalTime: performance.totalTime,
        });
      }

      return result;
    } catch (error) {
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      this.logger.error(`Rule execution failed: ${ruleId}`, {
        ruleId,
        error: error instanceof Error ? error.message : String(error),
        totalTime,
      });

      if (error instanceof GoRulesException) {
        throw error;
      }

      throw new GoRulesException(
        GoRulesErrorCode.INTERNAL_ERROR,
        `Rule execution failed: ${error instanceof Error ? error.message : String(error)}`,
        { ruleId, originalError: error },
        false,
      );
    }
  }

  /**
   * Execute multiple rules in batch
   */
  async executeBatch<T extends RuleInputData = RuleInputData, R = unknown>(
    executions: BatchRuleExecution<T>[],
  ): Promise<BatchRuleExecutionResult<R>[]> {
    const config = this.configService.getConfig();

    if (config.enableLogging) {
      this.logger.debug(`Executing batch of ${executions.length} rules`);
    }

    const results: BatchRuleExecutionResult<R>[] = [];

    // Execute rules sequentially for now
    // In the future, this could be optimized for parallel execution
    for (const execution of executions) {
      const executionId = execution.executionId || `batch-${Date.now()}-${Math.random()}`;

      try {
        const result = await this.executeRule<T, R>(
          execution.ruleId,
          execution.input,
          execution.options,
        );

        results.push({
          executionId,
          ruleId: execution.ruleId,
          result: {
            decision: result.result,
            appliedRules: [execution.ruleId],
            warnings: [],
          },
        });
      } catch (error) {
        results.push({
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
        });
      }
    }

    if (config.enableLogging) {
      const successCount = results.filter((r) => !r.error).length;
      const errorCount = results.length - successCount;
      this.logger.log(`Batch execution completed: ${successCount} success, ${errorCount} errors`);
    }

    return results;
  }

  /**
   * Validate that a rule exists and is accessible
   */
  async validateRuleExists(ruleId: string): Promise<boolean> {
    try {
      this.initializeZenEngine();
      // Try to get the decision to validate it exists
      await this.zenEngine.getDecision(ruleId);
      return true;
    } catch (error) {
      this.logger.debug(
        `Rule validation failed for ${ruleId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return false;
    }
  }

  /**
   * Get metadata information for a rule
   */
  async getRuleMetadata(ruleId: string): Promise<RuleMetadata> {
    try {
      // For now, return basic metadata
      // This will be enhanced when we integrate with GoRules API
      return {
        id: ruleId,
        name: ruleId,
        version: '1.0.0',
        description: `Metadata for rule ${ruleId}`,
        tags: [],
        lastModified: new Date(),
      };
    } catch (error) {
      throw new GoRulesException(
        GoRulesErrorCode.RULE_NOT_FOUND,
        `Failed to get metadata for rule: ${ruleId}`,
        { ruleId, originalError: error },
        false,
      );
    }
  }

  /**
   * Cleanup resources when the service is destroyed
   */
  onModuleDestroy(): void {
    if (this.zenEngine) {
      this.zenEngine.dispose();
      this.logger.log('GoRules Zen Engine disposed');
    }
  }
}
