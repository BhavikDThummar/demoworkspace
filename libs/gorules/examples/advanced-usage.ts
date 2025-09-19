/**
 * Advanced Usage Examples for GoRules NestJS Integration
 *
 * This file demonstrates advanced patterns and complex scenarios for the GoRules library.
 */

import { Injectable, Module, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule, Cron, CronExpression } from '@nestjs/schedule';
import {
  GoRulesModule,
  GoRulesService,
  GoRulesMonitoringService,
  GoRulesLoggerService,
  GoRulesMetricsService,
  GoRulesException,
  GoRulesErrorCode,
} from '@org/gorules';

// ============================================================================
// 1. ADVANCED MODULE CONFIGURATION
// ============================================================================

/**
 * Custom configuration factory with database integration
 */
@Injectable()
export class GoRulesConfigFactory {
  constructor(private readonly configService: ConfigService) {}

  async createGoRulesConfig() {
    // Load configuration from database or external service
    const dbConfig = await this.loadConfigFromDatabase();

    return {
      apiUrl: this.configService.get('GORULES_API_URL') || dbConfig.apiUrl,
      apiKey: this.configService.get('GORULES_API_KEY') || dbConfig.apiKey,
      projectId: this.configService.get('GORULES_PROJECT_ID') || dbConfig.projectId,
      timeout: dbConfig.timeout || 30000,
      retryAttempts: dbConfig.retryAttempts || 3,
      enableLogging: this.configService.get('NODE_ENV') !== 'production',
      logLevel: dbConfig.logLevel || 'info',
      performanceThresholds: {
        executionTime: dbConfig.maxExecutionTime || 5000,
        errorRate: dbConfig.maxErrorRate || 0.1,
        memoryUsage: dbConfig.maxMemoryUsage || 80,
      },
    };
  }

  private async loadConfigFromDatabase() {
    // Simulate database call
    return {
      apiUrl: 'https://triveni.gorules.io',
      apiKey: 'db-stored-key',
      projectId: 'db-stored-project',
      timeout: 25000,
      retryAttempts: 2,
      logLevel: 'debug' as const,
      maxExecutionTime: 4000,
      maxErrorRate: 0.05,
      maxMemoryUsage: 75,
    };
  }
}

/**
 * Advanced module with custom configuration and monitoring
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    GoRulesModule.forRootAsync({
      imports: [ConfigModule],
      useClass: GoRulesConfigFactory,
    }),
  ],
  providers: [GoRulesConfigFactory],
})
export class AdvancedAppModule {}

// ============================================================================
// 2. COMPLEX BUSINESS LOGIC WITH RULE CHAINING
// ============================================================================

interface CreditApplicationData {
  applicant: {
    personalInfo: {
      age: number;
      income: number;
      employmentStatus: string;
      yearsEmployed: number;
    };
    creditHistory: {
      score: number;
      previousLoans: number;
      defaultHistory: boolean;
      bankruptcyHistory: boolean;
    };
    assets: {
      realEstate: number;
      vehicles: number;
      investments: number;
      savings: number;
    };
  };
  application: {
    requestedAmount: number;
    purpose: string;
    term: number;
    collateral?: string;
  };
}

interface CreditDecision {
  approved: boolean;
  approvedAmount: number;
  interestRate: number;
  terms: string[];
  conditions: string[];
  riskAssessment: {
    level: 'low' | 'medium' | 'high' | 'critical';
    score: number;
    factors: string[];
  };
  pricing: {
    baseRate: number;
    riskPremium: number;
    finalRate: number;
    fees: { name: string; amount: number }[];
  };
}

@Injectable()
export class AdvancedCreditService implements OnModuleInit, OnModuleDestroy {
  private performanceMonitor?: NodeJS.Timeout;
  private readonly ruleChain = [
    'identity-verification',
    'income-verification',
    'credit-score-analysis',
    'risk-assessment',
    'pricing-calculation',
    'final-approval',
  ];

  constructor(
    private readonly goRulesService: GoRulesService,
    private readonly monitoringService: GoRulesMonitoringService,
    private readonly loggerService: GoRulesLoggerService,
  ) {}

  onModuleInit() {
    // Start performance monitoring
    this.startPerformanceMonitoring();
  }

  onModuleDestroy() {
    if (this.performanceMonitor) {
      clearInterval(this.performanceMonitor);
    }
  }

  /**
   * Process credit application through rule chain
   */
  async processCreditApplication(
    applicationData: CreditApplicationData,
    options: {
      skipSteps?: string[];
      fastTrack?: boolean;
      userId?: string;
      sessionId?: string;
    } = {},
  ): Promise<CreditDecision> {
    const executionId = `credit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    try {
      this.loggerService.logExecutionStart('credit-processing', executionId, {
        applicantId: applicationData.applicant.personalInfo,
        requestedAmount: applicationData.application.requestedAmount,
        fastTrack: options.fastTrack,
      });

      // Step 1: Parallel validation rules
      const validationResults = await this.executeValidationRules(
        applicationData,
        executionId,
        options,
      );

      // Step 2: Risk assessment based on validation results
      const riskAssessment = await this.executeRiskAssessment(
        applicationData,
        validationResults,
        executionId,
        options,
      );

      // Step 3: Pricing calculation
      const pricing = await this.executePricingRules(
        applicationData,
        riskAssessment,
        executionId,
        options,
      );

      // Step 4: Final approval decision
      const finalDecision = await this.executeFinalApproval(
        applicationData,
        validationResults,
        riskAssessment,
        pricing,
        executionId,
        options,
      );

      const executionTime = Date.now() - startTime;

      this.loggerService.logExecutionSuccess(executionId, finalDecision);
      this.monitoringService.completeExecution(
        'credit-processing',
        executionId,
        finalDecision,
        executionTime,
      );

      return finalDecision;
    } catch (error) {
      const executionTime = Date.now() - startTime;

      this.loggerService.logExecutionError(
        executionId,
        error instanceof Error ? error : new Error(String(error)),
      );

      this.monitoringService.failExecution(
        'credit-processing',
        executionId,
        error instanceof Error ? error : new Error(String(error)),
        executionTime,
      );

      throw error;
    }
  }

  /**
   * Execute validation rules in parallel
   */
  private async executeValidationRules(
    applicationData: CreditApplicationData,
    executionId: string,
    options: any,
  ) {
    const validationRules = [
      {
        executionId: `${executionId}-identity`,
        ruleId: 'identity-verification',
        input: applicationData.applicant.personalInfo,
      },
      {
        executionId: `${executionId}-income`,
        ruleId: 'income-verification',
        input: {
          income: applicationData.applicant.personalInfo.income,
          employment: applicationData.applicant.personalInfo.employmentStatus,
          yearsEmployed: applicationData.applicant.personalInfo.yearsEmployed,
        },
      },
      {
        executionId: `${executionId}-credit`,
        ruleId: 'credit-score-analysis',
        input: applicationData.applicant.creditHistory,
      },
    ];

    // Filter out skipped steps
    const filteredRules = validationRules.filter(
      (rule) => !options.skipSteps?.includes(rule.ruleId),
    );

    const results = await this.goRulesService.executeBatch(filteredRules);

    // Process results and handle failures
    const validationResults = {
      identity: this.extractResult(results, `${executionId}-identity`),
      income: this.extractResult(results, `${executionId}-income`),
      credit: this.extractResult(results, `${executionId}-credit`),
    };

    // Check for critical failures
    if (!validationResults.identity?.verified) {
      throw new GoRulesException(
        GoRulesErrorCode.VALIDATION_ERROR,
        'Identity verification failed',
        { executionId, step: 'identity-verification' },
      );
    }

    return validationResults;
  }

  /**
   * Execute risk assessment with conditional logic
   */
  private async executeRiskAssessment(
    applicationData: CreditApplicationData,
    validationResults: any,
    executionId: string,
    options: any,
  ) {
    const riskInput = {
      personalInfo: applicationData.applicant.personalInfo,
      creditHistory: applicationData.applicant.creditHistory,
      assets: applicationData.applicant.assets,
      validationResults,
      requestedAmount: applicationData.application.requestedAmount,
    };

    // Use different risk models based on application characteristics
    let riskRuleId = 'standard-risk-assessment';

    if (applicationData.application.requestedAmount > 100000) {
      riskRuleId = 'high-value-risk-assessment';
    } else if (applicationData.applicant.creditHistory.score < 600) {
      riskRuleId = 'subprime-risk-assessment';
    } else if (options.fastTrack) {
      riskRuleId = 'fast-track-risk-assessment';
    }

    const result = await this.goRulesService.executeRule(riskRuleId, riskInput, {
      trace: true,
      timeout: 15000,
      userId: options.userId,
      sessionId: options.sessionId,
    });

    return result.result;
  }

  /**
   * Execute pricing rules with dynamic rate calculation
   */
  private async executePricingRules(
    applicationData: CreditApplicationData,
    riskAssessment: any,
    executionId: string,
    options: any,
  ) {
    const pricingInput = {
      baseAmount: applicationData.application.requestedAmount,
      term: applicationData.application.term,
      riskLevel: riskAssessment.level,
      riskScore: riskAssessment.score,
      creditScore: applicationData.applicant.creditHistory.score,
      collateral: applicationData.application.collateral,
      customerTier: this.determineCustomerTier(applicationData),
    };

    // Use batch execution for different pricing components
    const pricingRules = [
      {
        executionId: `${executionId}-base-rate`,
        ruleId: 'base-rate-calculation',
        input: pricingInput,
      },
      {
        executionId: `${executionId}-risk-premium`,
        ruleId: 'risk-premium-calculation',
        input: pricingInput,
      },
      {
        executionId: `${executionId}-fees`,
        ruleId: 'fee-calculation',
        input: pricingInput,
      },
    ];

    const results = await this.goRulesService.executeBatch(pricingRules);

    return {
      baseRate: this.extractResult(results, `${executionId}-base-rate`)?.rate || 0,
      riskPremium: this.extractResult(results, `${executionId}-risk-premium`)?.premium || 0,
      fees: this.extractResult(results, `${executionId}-fees`)?.fees || [],
      finalRate: this.calculateFinalRate(results),
    };
  }

  /**
   * Execute final approval with business logic
   */
  private async executeFinalApproval(
    applicationData: CreditApplicationData,
    validationResults: any,
    riskAssessment: any,
    pricing: any,
    executionId: string,
    options: any,
  ): Promise<CreditDecision> {
    const approvalInput = {
      application: applicationData.application,
      validation: validationResults,
      risk: riskAssessment,
      pricing,
      businessRules: {
        maxLoanToIncome: 5,
        minCreditScore: 550,
        maxRiskLevel: 'high',
      },
    };

    const result = await this.goRulesService.executeRule('final-approval-decision', approvalInput, {
      trace: true,
      timeout: 10000,
      userId: options.userId,
      sessionId: options.sessionId,
    });

    // Construct comprehensive decision
    return {
      approved: result.result.approved,
      approvedAmount: result.result.approvedAmount,
      interestRate: pricing.finalRate,
      terms: result.result.terms || [],
      conditions: result.result.conditions || [],
      riskAssessment: {
        level: riskAssessment.level,
        score: riskAssessment.score,
        factors: riskAssessment.factors || [],
      },
      pricing: {
        baseRate: pricing.baseRate,
        riskPremium: pricing.riskPremium,
        finalRate: pricing.finalRate,
        fees: pricing.fees,
      },
    };
  }

  /**
   * Helper methods
   */
  private extractResult(results: any[], executionId: string) {
    const result = results.find((r) => r.executionId === executionId);
    return result?.error ? null : result?.result?.decision;
  }

  private determineCustomerTier(applicationData: CreditApplicationData): string {
    const income = applicationData.applicant.personalInfo.income;
    const creditScore = applicationData.applicant.creditHistory.score;
    const assets = Object.values(applicationData.applicant.assets).reduce(
      (sum, val) => sum + val,
      0,
    );

    if (income > 100000 && creditScore > 750 && assets > 50000) return 'platinum';
    if (income > 75000 && creditScore > 700 && assets > 25000) return 'gold';
    if (income > 50000 && creditScore > 650) return 'silver';
    return 'bronze';
  }

  private calculateFinalRate(pricingResults: any[]): number {
    const baseRate = this.extractResult(pricingResults, 'base-rate')?.rate || 0;
    const riskPremium = this.extractResult(pricingResults, 'risk-premium')?.premium || 0;
    return baseRate + riskPremium;
  }

  /**
   * Performance monitoring
   */
  private startPerformanceMonitoring() {
    this.performanceMonitor = setInterval(() => {
      const stats = this.goRulesService.getExecutionStatistics();
      const cbStats = this.goRulesService.getCircuitBreakerStatistics();

      // Log performance metrics
      Object.entries(stats).forEach(([ruleId, stat]) => {
        if (stat.errorRate > 0.1) {
          // 10% error rate threshold
          console.warn(
            `High error rate detected for rule ${ruleId}: ${(stat.errorRate * 100).toFixed(2)}%`,
          );
        }

        if (stat.averageTime > 5000) {
          // 5 second threshold
          console.warn(`Slow execution detected for rule ${ruleId}: ${stat.averageTime}ms average`);
        }
      });

      // Check circuit breaker states
      Object.entries(cbStats).forEach(([operation, stats]) => {
        if (stats.state === 'OPEN') {
          console.error(`Circuit breaker OPEN for operation: ${operation}`);
        }
      });
    }, 60000); // Check every minute
  }
}

// ============================================================================
// 3. ADVANCED ERROR HANDLING AND RECOVERY
// ============================================================================

@Injectable()
export class ResilientRuleService {
  private readonly maxRetries = 3;
  private readonly baseDelay = 1000;
  private readonly maxDelay = 10000;

  constructor(
    private readonly goRulesService: GoRulesService,
    private readonly monitoringService: GoRulesMonitoringService,
  ) {}

  /**
   * Execute rule with advanced retry logic and circuit breaker
   */
  async executeWithResilience<T, R>(
    ruleId: string,
    input: T,
    options: {
      maxRetries?: number;
      retryCondition?: (error: any) => boolean;
      fallbackResult?: R;
      circuitBreakerKey?: string;
    } = {},
  ): Promise<R> {
    const maxRetries = options.maxRetries || this.maxRetries;
    const circuitBreakerKey = options.circuitBreakerKey || `rule-${ruleId}`;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.goRulesService.executeRule<T, R>(ruleId, input, {
          timeout: this.calculateTimeout(attempt),
        });

        // Reset circuit breaker on success
        this.monitoringService.updateCircuitBreakerState(
          circuitBreakerKey,
          'CLOSED',
          'CLOSED',
          'Successful execution',
        );

        return result.result;
      } catch (error) {
        const isLastAttempt = attempt === maxRetries;
        const shouldRetry = options.retryCondition
          ? options.retryCondition(error)
          : this.isRetryableError(error);

        // Update circuit breaker
        this.monitoringService.updateCircuitBreakerState(
          circuitBreakerKey,
          'CLOSED',
          attempt >= 3 ? 'OPEN' : 'CLOSED',
          `Attempt ${attempt} failed`,
          true,
        );

        if (isLastAttempt || !shouldRetry) {
          // Return fallback result if available
          if (options.fallbackResult !== undefined) {
            console.warn(`Using fallback result for rule ${ruleId} after ${attempt} attempts`);
            return options.fallbackResult;
          }
          throw error;
        }

        // Calculate delay with exponential backoff and jitter
        const delay = Math.min(
          this.baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000,
          this.maxDelay,
        );

        console.warn(`Rule ${ruleId} attempt ${attempt} failed, retrying in ${delay}ms`, {
          error: error instanceof Error ? error.message : String(error),
        });

        await this.delay(delay);
      }
    }

    throw new Error(`Max retries exceeded for rule ${ruleId}`);
  }

  /**
   * Execute multiple rules with partial failure tolerance
   */
  async executeWithPartialFailureTolerance<T, R>(
    executions: Array<{
      ruleId: string;
      input: T;
      required?: boolean;
      fallback?: R;
    }>,
  ): Promise<
    Array<{
      ruleId: string;
      success: boolean;
      result?: R;
      error?: string;
      usedFallback?: boolean;
    }>
  > {
    const batchExecutions = executions.map((exec, index) => ({
      executionId: `partial-${index}`,
      ruleId: exec.ruleId,
      input: exec.input,
    }));

    const results = await this.goRulesService.executeBatch(batchExecutions);

    return results.map((result, index) => {
      const execution = executions[index];

      if (result.error) {
        // Handle failure
        if (execution.required) {
          return {
            ruleId: execution.ruleId,
            success: false,
            error: result.error.message,
          };
        } else if (execution.fallback !== undefined) {
          return {
            ruleId: execution.ruleId,
            success: true,
            result: execution.fallback,
            usedFallback: true,
          };
        } else {
          return {
            ruleId: execution.ruleId,
            success: false,
            error: result.error.message,
          };
        }
      }

      return {
        ruleId: execution.ruleId,
        success: true,
        result: result.result.decision,
      };
    });
  }

  private isRetryableError(error: any): boolean {
    if (error instanceof GoRulesException) {
      return (
        error.retryable ||
        [
          GoRulesErrorCode.TIMEOUT,
          GoRulesErrorCode.NETWORK_ERROR,
          GoRulesErrorCode.RATE_LIMIT_EXCEEDED,
          GoRulesErrorCode.SERVICE_UNAVAILABLE,
        ].includes(error.code)
      );
    }
    return false;
  }

  private calculateTimeout(attempt: number): number {
    return Math.min(5000 * attempt, 30000); // Increase timeout with attempts
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================================================
// 4. ADVANCED MONITORING AND ALERTING
// ============================================================================

@Injectable()
export class AdvancedMonitoringService {
  private readonly alertThresholds = {
    errorRate: 0.1, // 10%
    averageResponseTime: 5000, // 5 seconds
    circuitBreakerFailures: 5,
  };

  constructor(
    private readonly goRulesService: GoRulesService,
    private readonly monitoringService: GoRulesMonitoringService,
    private readonly metricsService: GoRulesMetricsService,
  ) {}

  /**
   * Comprehensive health check with detailed diagnostics
   */
  async performHealthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Record<string, boolean>;
    metrics: any;
    alerts: string[];
    recommendations: string[];
  }> {
    const alerts: string[] = [];
    const recommendations: string[] = [];
    const checks: Record<string, boolean> = {};

    // Check rule service connectivity
    try {
      await this.goRulesService.validateRuleExists('health-check');
      checks.ruleServiceConnectivity = true;
    } catch (error) {
      checks.ruleServiceConnectivity = false;
      alerts.push('Rule service connectivity failed');
      recommendations.push('Check network connectivity and API credentials');
    }

    // Check execution statistics
    const stats = this.goRulesService.getExecutionStatistics();
    const highErrorRateRules = Object.entries(stats).filter(
      ([_, stat]) => stat.errorRate > this.alertThresholds.errorRate,
    );

    if (highErrorRateRules.length > 0) {
      checks.errorRates = false;
      alerts.push(
        `High error rates detected for rules: ${highErrorRateRules.map(([id]) => id).join(', ')}`,
      );
      recommendations.push('Review rule configurations and input data validation');
    } else {
      checks.errorRates = true;
    }

    // Check response times
    const slowRules = Object.entries(stats).filter(
      ([_, stat]) => stat.averageTime > this.alertThresholds.averageResponseTime,
    );

    if (slowRules.length > 0) {
      checks.responseTimes = false;
      alerts.push(
        `Slow response times detected for rules: ${slowRules.map(([id]) => id).join(', ')}`,
      );
      recommendations.push('Consider optimizing rule logic or increasing timeout values');
    } else {
      checks.responseTimes = true;
    }

    // Check circuit breakers
    const cbStats = this.goRulesService.getCircuitBreakerStatistics();
    const openCircuitBreakers = Object.entries(cbStats).filter(
      ([_, stats]) => stats.state === 'OPEN',
    );

    if (openCircuitBreakers.length > 0) {
      checks.circuitBreakers = false;
      alerts.push(`Open circuit breakers: ${openCircuitBreakers.map(([id]) => id).join(', ')}`);
      recommendations.push('Wait for automatic recovery or investigate underlying issues');
    } else {
      checks.circuitBreakers = true;
    }

    // Determine overall status
    const failedChecks = Object.values(checks).filter((check) => !check).length;
    let status: 'healthy' | 'degraded' | 'unhealthy';

    if (failedChecks === 0) {
      status = 'healthy';
    } else if (failedChecks <= 2) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return {
      status,
      checks,
      metrics: {
        executionStats: stats,
        circuitBreakerStats: cbStats,
        systemMetrics: this.metricsService.getSystemMetrics(),
      },
      alerts,
      recommendations,
    };
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport(): {
    summary: any;
    rulePerformance: any[];
    trends: any;
    recommendations: string[];
  } {
    const stats = this.goRulesService.getExecutionStatistics();
    const systemMetrics = this.metricsService.getSystemMetrics();
    const allRuleMetrics = this.metricsService.getAllRuleMetrics();

    // Calculate summary metrics
    const totalExecutions = Object.values(stats).reduce((sum, stat) => sum + stat.count, 0);
    const totalErrors = Object.values(stats).reduce(
      (sum, stat) => sum + stat.count * stat.errorRate,
      0,
    );
    const overallErrorRate = totalExecutions > 0 ? totalErrors / totalExecutions : 0;
    const averageResponseTime =
      Object.values(stats).reduce((sum, stat) => sum + stat.averageTime, 0) /
      Object.keys(stats).length;

    // Identify performance issues
    const recommendations: string[] = [];

    if (overallErrorRate > 0.05) {
      recommendations.push('Overall error rate is high - review input validation and rule logic');
    }

    if (averageResponseTime > 3000) {
      recommendations.push('Average response time is high - consider rule optimization');
    }

    // Find top performing and problematic rules
    const rulePerformance = allRuleMetrics
      .map((metric) => ({
        ruleId: metric.ruleId,
        executions: metric.totalExecutions,
        successRate:
          metric.totalExecutions > 0 ? metric.successfulExecutions / metric.totalExecutions : 0,
        averageTime: metric.averageExecutionTime,
        errorRate: metric.errorRate,
        performance: this.calculatePerformanceScore(metric),
      }))
      .sort((a, b) => b.performance - a.performance);

    return {
      summary: {
        totalExecutions,
        overallErrorRate,
        averageResponseTime,
        activeRules: Object.keys(stats).length,
        systemHealth: systemMetrics,
      },
      rulePerformance,
      trends: this.calculateTrends(allRuleMetrics),
      recommendations,
    };
  }

  private calculatePerformanceScore(metric: any): number {
    const successWeight = 0.4;
    const speedWeight = 0.3;
    const reliabilityWeight = 0.3;

    const successScore =
      metric.totalExecutions > 0 ? metric.successfulExecutions / metric.totalExecutions : 0;
    const speedScore = Math.max(0, 1 - metric.averageExecutionTime / 10000); // Normalize to 10 seconds
    const reliabilityScore = 1 - metric.errorRate;

    return (
      successScore * successWeight + speedScore * speedWeight + reliabilityScore * reliabilityWeight
    );
  }

  private calculateTrends(metrics: any[]): any {
    // This would typically analyze historical data
    // For now, return basic trend indicators
    return {
      executionTrend: 'stable',
      errorTrend: 'improving',
      performanceTrend: 'stable',
    };
  }

  /**
   * Scheduled performance monitoring
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async monitorPerformance() {
    const health = await this.performHealthCheck();

    if (health.status === 'unhealthy') {
      console.error('GoRules service is unhealthy', {
        alerts: health.alerts,
        recommendations: health.recommendations,
      });

      // Here you would typically send alerts to monitoring systems
      // await this.sendAlert('GoRules service unhealthy', health);
    } else if (health.status === 'degraded') {
      console.warn('GoRules service is degraded', {
        alerts: health.alerts,
      });
    }
  }

  /**
   * Scheduled cleanup of old metrics
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupOldMetrics() {
    this.metricsService.cleanupOldMetrics();
    console.log('Old metrics cleaned up');
  }
}
