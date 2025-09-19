import { Injectable, Logger } from '@nestjs/common';
import { GoRulesService, GoRulesException, GoRulesErrorCode } from '@org/gorules';

/**
 * Simple input/output interfaces for demonstration
 */
export interface SimpleRuleInput {
  value: number;
  category: string;
  metadata?: Record<string, any>;
}

export interface SimpleRuleOutput {
  result: string;
  score: number;
  recommendations: string[];
}

/**
 * Simple rules service demonstrating basic GoRules usage patterns
 */
@Injectable()
export class SimpleRulesService {
  private readonly logger = new Logger(SimpleRulesService.name);

  constructor(private readonly goRulesService: GoRulesService) {}

  /**
   * Execute a simple rule with basic error handling
   */
  async executeSimpleRule(input: SimpleRuleInput): Promise<SimpleRuleOutput> {
    try {
      this.logger.debug('Executing simple rule', { input });

      const result = await this.goRulesService.executeRule<SimpleRuleInput, SimpleRuleOutput>(
        'simple-rule',
        input,
        {
          timeout: 5000,
          trace: false,
        },
      );

      this.logger.debug('Simple rule executed successfully', {
        executionTime: result.performance.executionTime,
        result: result.result,
      });

      return result.result;
    } catch (error) {
      this.logger.error('Simple rule execution failed', error);
      throw this.wrapError(error, 'Failed to execute simple rule');
    }
  }

  /**
   * Execute a simple rule with basic error handling
   */
  async executeShippingFeesRule(input: any): Promise<any> {
    try {
      this.logger.debug('Executing Shipping Fees', { input });

      const result = await this.goRulesService.executeRule<any, any>('shipping-fees', input, {
        timeout: 5000,
        trace: false,
      });

      this.logger.debug('Shipping Fees executed successfully', {
        executionTime: result.performance.executionTime,
        result: result.result,
      });

      return result.result;
    } catch (error) {
      this.logger.error('Shipping Fees execution failed', error);
      throw this.wrapError(error, 'Failed to execute simple rule');
    }
  }

  /**
   * Execute a rule with tracing enabled for debugging
   */
  async executeRuleWithTracing(input: SimpleRuleInput): Promise<{
    result: SimpleRuleOutput;
    trace: any;
    performance: any;
  }> {
    try {
      this.logger.debug('Executing rule with tracing', { input });

      const result = await this.goRulesService.executeRule<SimpleRuleInput, SimpleRuleOutput>(
        'traced-rule',
        input,
        {
          timeout: 10000,
          trace: true, // Enable tracing
        },
      );

      this.logger.debug('Rule with tracing executed successfully', {
        executionTime: result.performance.executionTime,
        traceSteps: result.trace?.steps?.length || 0,
      });

      return {
        result: result.result,
        trace: result.trace,
        performance: result.performance,
      };
    } catch (error) {
      this.logger.error('Rule execution with tracing failed', error);
      throw this.wrapError(error, 'Failed to execute rule with tracing');
    }
  }

  /**
   * Validate if a rule exists before executing
   */
  async validateAndExecuteRule(ruleId: string, input: SimpleRuleInput): Promise<SimpleRuleOutput> {
    try {
      this.logger.debug('Validating and executing rule', { ruleId, input });

      // First, validate that the rule exists
      const exists = await this.goRulesService.validateRuleExists(ruleId);
      if (!exists) {
        throw new GoRulesException(
          GoRulesErrorCode.RULE_NOT_FOUND,
          `Rule '${ruleId}' does not exist`,
          { ruleId },
        );
      }

      // Execute the rule
      const result = await this.goRulesService.executeRule<SimpleRuleInput, SimpleRuleOutput>(
        ruleId,
        input,
      );

      this.logger.debug('Rule validated and executed successfully', {
        ruleId,
        executionTime: result.performance.executionTime,
      });

      return result.result;
    } catch (error) {
      this.logger.error('Rule validation and execution failed', error);
      throw this.wrapError(error, `Failed to validate and execute rule '${ruleId}'`);
    }
  }

  /**
   * Execute multiple rules sequentially
   */
  async executeRulesSequentially(
    rules: Array<{ ruleId: string; input: SimpleRuleInput }>,
  ): Promise<
    Array<{ ruleId: string; success: boolean; result?: SimpleRuleOutput; error?: string }>
  > {
    const results: Array<{
      ruleId: string;
      success: boolean;
      result?: SimpleRuleOutput;
      error?: string;
    }> = [];

    for (const rule of rules) {
      try {
        this.logger.debug('Executing rule sequentially', { ruleId: rule.ruleId });

        const result = await this.goRulesService.executeRule<SimpleRuleInput, SimpleRuleOutput>(
          rule.ruleId,
          rule.input,
          { timeout: 8000 },
        );

        results.push({
          ruleId: rule.ruleId,
          success: true,
          result: result.result,
        });

        this.logger.debug('Sequential rule executed successfully', {
          ruleId: rule.ruleId,
          executionTime: result.performance.executionTime,
        });
      } catch (error) {
        this.logger.error('Sequential rule execution failed', error);

        results.push({
          ruleId: rule.ruleId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    this.logger.log('Sequential rules execution completed', {
      totalRules: rules.length,
      successCount: results.filter((r) => r.success).length,
      errorCount: results.filter((r) => !r.success).length,
    });

    return results;
  }

  /**
   * Execute rules with different timeout configurations
   */
  async executeRuleWithCustomTimeout(
    ruleId: string,
    input: SimpleRuleInput,
    timeoutMs: number,
  ): Promise<SimpleRuleOutput> {
    try {
      this.logger.debug('Executing rule with custom timeout', {
        ruleId,
        timeoutMs,
        input,
      });

      const result = await this.goRulesService.executeRule<SimpleRuleInput, SimpleRuleOutput>(
        ruleId,
        input,
        {
          timeout: timeoutMs,
          trace: false,
        },
      );

      this.logger.debug('Rule with custom timeout executed successfully', {
        ruleId,
        timeoutMs,
        executionTime: result.performance.executionTime,
      });

      return result.result;
    } catch (error) {
      this.logger.error('Rule execution with custom timeout failed', error);
      throw this.wrapError(error, `Failed to execute rule '${ruleId}' with timeout ${timeoutMs}ms`);
    }
  }

  /**
   * Get rule metadata information
   */
  async getRuleInformation(ruleId: string): Promise<{
    exists: boolean;
    metadata?: any;
    error?: string;
  }> {
    try {
      this.logger.debug('Getting rule information', { ruleId });

      const exists = await this.goRulesService.validateRuleExists(ruleId);

      if (!exists) {
        return {
          exists: false,
          error: `Rule '${ruleId}' does not exist`,
        };
      }

      const metadata = await this.goRulesService.getRuleMetadata(ruleId);

      this.logger.debug('Rule information retrieved successfully', {
        ruleId,
        metadata,
      });

      return {
        exists: true,
        metadata,
      };
    } catch (error) {
      this.logger.error('Failed to get rule information', error);

      return {
        exists: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Demonstrate error handling patterns
   */
  async demonstrateErrorHandling(
    ruleId: string,
    input: SimpleRuleInput,
  ): Promise<{
    success: boolean;
    result?: SimpleRuleOutput;
    error?: {
      code: string;
      message: string;
      retryable: boolean;
      details?: any;
    };
  }> {
    try {
      this.logger.debug('Demonstrating error handling', { ruleId, input });

      const result = await this.goRulesService.executeRule<SimpleRuleInput, SimpleRuleOutput>(
        ruleId,
        input,
      );

      return {
        success: true,
        result: result.result,
      };
    } catch (error) {
      this.logger.error('Error handling demonstration caught error', error);

      if (error instanceof GoRulesException) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            retryable: error.retryable,
            details: error.details,
          },
        };
      }

      return {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          retryable: false,
        },
      };
    }
  }

  /**
   * Get service statistics and health information
   */
  async getServiceHealth(): Promise<{
    healthy: boolean;
    statistics: any;
    circuitBreakers: any;
    uptime: number;
  }> {
    try {
      const statistics = this.goRulesService.getExecutionStatistics();
      const circuitBreakers = this.goRulesService.getCircuitBreakerStatistics();

      // Simple health check - service is healthy if we can get statistics
      const healthy = statistics !== null && circuitBreakers !== null;

      return {
        healthy,
        statistics,
        circuitBreakers,
        uptime: process.uptime() * 1000, // Convert to milliseconds
      };
    } catch (error) {
      this.logger.error('Failed to get service health', error);

      return {
        healthy: false,
        statistics: null,
        circuitBreakers: null,
        uptime: process.uptime() * 1000,
      };
    }
  }

  /**
   * Wrap errors in GoRulesException for consistent error handling
   */
  private wrapError(error: unknown, message: string): GoRulesException {
    if (error instanceof GoRulesException) {
      return error;
    }

    return new GoRulesException(GoRulesErrorCode.INTERNAL_ERROR, message, { originalError: error });
  }
}
