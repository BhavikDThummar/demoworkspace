/**
 * Basic Usage Examples for GoRules NestJS Integration
 *
 * This file demonstrates the most common usage patterns for the GoRules library.
 */

import { Injectable, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GoRulesModule, GoRulesService } from '@org/gorules';

// ============================================================================
// 1. BASIC MODULE SETUP
// ============================================================================

/**
 * Simple module configuration with static values
 */
@Module({
  imports: [
    GoRulesModule.forRoot({
      apiUrl: 'https://triveni.gorules.io',
      apiKey: process.env.GORULES_API_KEY!,
      projectId: process.env.GORULES_PROJECT_ID!,
      timeout: 30000,
      retryAttempts: 3,
      enableLogging: true,
    }),
  ],
})
export class BasicAppModule {}

/**
 * Module configuration using environment variables
 */
@Module({
  imports: [ConfigModule.forRoot(), GoRulesModule.forEnvironment()],
})
export class EnvironmentAppModule {}

/**
 * Module configuration using ConfigService
 */
@Module({
  imports: [
    ConfigModule.forRoot(),
    GoRulesModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        apiUrl: configService.get('GORULES_API_URL')!,
        apiKey: configService.get('GORULES_API_KEY')!,
        projectId: configService.get('GORULES_PROJECT_ID')!,
        enableLogging: configService.get('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AsyncAppModule {}

// ============================================================================
// 2. BASIC SERVICE USAGE
// ============================================================================

/**
 * Input interface for customer validation rule
 */
interface CustomerData {
  age: number;
  income: number;
  creditScore: number;
  employmentStatus: 'employed' | 'unemployed' | 'self-employed';
  hasExistingLoans: boolean;
}

/**
 * Output interface for customer validation rule
 */
interface ValidationResult {
  isValid: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  approvedAmount: number;
  reason: string;
  recommendations: string[];
}

@Injectable()
export class CustomerService {
  constructor(private readonly goRulesService: GoRulesService) {}

  /**
   * Basic rule execution example
   */
  async validateCustomer(customerData: CustomerData): Promise<ValidationResult> {
    try {
      const result = await this.goRulesService.executeRule<CustomerData, ValidationResult>(
        'customer-validation',
        customerData,
      );

      return result.result;
    } catch (error) {
      console.error('Customer validation failed:', error);
      throw error;
    }
  }

  /**
   * Rule execution with options
   */
  async validateCustomerWithOptions(customerData: CustomerData): Promise<{
    result: ValidationResult;
    executionTime: number;
    trace?: any;
  }> {
    const result = await this.goRulesService.executeRule<CustomerData, ValidationResult>(
      'customer-validation',
      customerData,
      {
        trace: true,
        timeout: 10000,
        userId: 'user-123',
        sessionId: 'session-456',
      },
    );

    return {
      result: result.result,
      executionTime: result.performance.executionTime,
      trace: result.trace,
    };
  }

  /**
   * Rule validation before execution
   */
  async safeValidateCustomer(customerData: CustomerData): Promise<ValidationResult | null> {
    // Check if rule exists before executing
    const ruleExists = await this.goRulesService.validateRuleExists('customer-validation');

    if (!ruleExists) {
      console.warn('Customer validation rule not found');
      return null;
    }

    const result = await this.goRulesService.executeRule<CustomerData, ValidationResult>(
      'customer-validation',
      customerData,
    );

    return result.result;
  }

  /**
   * Get rule metadata
   */
  async getValidationRuleInfo() {
    try {
      const metadata = await this.goRulesService.getRuleMetadata('customer-validation');

      return {
        name: metadata.name,
        version: metadata.version,
        description: metadata.description,
        lastModified: metadata.lastModified,
      };
    } catch (error) {
      console.error('Failed to get rule metadata:', error);
      return null;
    }
  }
}

// ============================================================================
// 3. BATCH PROCESSING EXAMPLES
// ============================================================================

interface LoanApplication {
  applicationId: string;
  customerData: CustomerData;
  loanAmount: number;
  loanPurpose: string;
}

interface LoanDecision {
  approved: boolean;
  approvedAmount: number;
  interestRate: number;
  terms: string[];
}

@Injectable()
export class LoanProcessingService {
  constructor(private readonly goRulesService: GoRulesService) {}

  /**
   * Process multiple loan applications in batch
   */
  async processLoanApplications(applications: LoanApplication[]): Promise<
    {
      applicationId: string;
      decision: LoanDecision | null;
      error?: string;
    }[]
  > {
    // Prepare batch executions
    const batchExecutions = applications.map((app) => ({
      executionId: `loan-${app.applicationId}`,
      ruleId: 'loan-approval',
      input: {
        customer: app.customerData,
        requestedAmount: app.loanAmount,
        purpose: app.loanPurpose,
      },
    }));

    // Execute batch
    const results = await this.goRulesService.executeBatch(batchExecutions);

    // Process results
    return results.map((result) => ({
      applicationId: result.executionId.replace('loan-', ''),
      decision: result.error ? null : result.result.decision,
      error: result.error?.message,
    }));
  }

  /**
   * Process applications with different rules
   */
  async processMultiStepApplication(application: LoanApplication): Promise<{
    validation: ValidationResult;
    pricing: any;
    approval: LoanDecision;
  }> {
    const batchExecutions = [
      {
        executionId: 'validation',
        ruleId: 'customer-validation',
        input: application.customerData,
      },
      {
        executionId: 'pricing',
        ruleId: 'loan-pricing',
        input: {
          customer: application.customerData,
          amount: application.loanAmount,
        },
      },
      {
        executionId: 'approval',
        ruleId: 'loan-approval',
        input: {
          customer: application.customerData,
          requestedAmount: application.loanAmount,
          purpose: application.loanPurpose,
        },
      },
    ];

    const results = await this.goRulesService.executeBatch(batchExecutions);

    // Extract results by execution ID
    const validationResult = results.find((r) => r.executionId === 'validation');
    const pricingResult = results.find((r) => r.executionId === 'pricing');
    const approvalResult = results.find((r) => r.executionId === 'approval');

    return {
      validation: validationResult?.result.decision || {
        isValid: false,
        reason: 'Validation failed',
      },
      pricing: pricingResult?.result.decision || { rate: 0, terms: [] },
      approval: approvalResult?.result.decision || { approved: false, reason: 'Approval failed' },
    };
  }
}

// ============================================================================
// 4. ERROR HANDLING EXAMPLES
// ============================================================================

import { GoRulesException, GoRulesErrorCode } from '@org/gorules';
import {
  BadRequestException,
  NotFoundException,
  RequestTimeoutException,
  ServiceUnavailableException,
  InternalServerErrorException,
} from '@nestjs/common';

@Injectable()
export class RobustCustomerService {
  constructor(private readonly goRulesService: GoRulesService) {}

  /**
   * Comprehensive error handling example
   */
  async validateCustomerWithErrorHandling(customerData: CustomerData): Promise<ValidationResult> {
    try {
      const result = await this.goRulesService.executeRule<CustomerData, ValidationResult>(
        'customer-validation',
        customerData,
        { timeout: 15000 },
      );

      return result.result;
    } catch (error) {
      if (error instanceof GoRulesException) {
        switch (error.code) {
          case GoRulesErrorCode.INVALID_INPUT:
          case GoRulesErrorCode.VALIDATION_ERROR:
            throw new BadRequestException(`Invalid customer data: ${error.message}`);

          case GoRulesErrorCode.RULE_NOT_FOUND:
            throw new NotFoundException(`Validation rule not found: ${error.message}`);

          case GoRulesErrorCode.TIMEOUT:
            if (error.retryable) {
              // Implement retry with exponential backoff
              return await this.retryValidation(customerData, 3);
            }
            throw new RequestTimeoutException(`Validation timed out: ${error.message}`);

          case GoRulesErrorCode.RATE_LIMIT_EXCEEDED:
            throw new ServiceUnavailableException(`Rate limit exceeded: ${error.message}`);

          case GoRulesErrorCode.NETWORK_ERROR:
          case GoRulesErrorCode.SERVICE_UNAVAILABLE:
            // Implement fallback logic
            return this.fallbackValidation(customerData);

          default:
            throw new InternalServerErrorException(`Validation failed: ${error.message}`);
        }
      }

      // Handle unexpected errors
      console.error('Unexpected validation error:', error);
      throw new InternalServerErrorException('An unexpected error occurred during validation');
    }
  }

  /**
   * Retry logic with exponential backoff
   */
  private async retryValidation(
    customerData: CustomerData,
    maxRetries: number,
    baseDelay: number = 1000,
  ): Promise<ValidationResult> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.goRulesService.executeRule<CustomerData, ValidationResult>(
          'customer-validation',
          customerData,
          { timeout: 10000 },
        );

        return result.result;
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }

        // Exponential backoff
        const delay = baseDelay * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw new InternalServerErrorException('Max retries exceeded');
  }

  /**
   * Fallback validation logic
   */
  private fallbackValidation(customerData: CustomerData): ValidationResult {
    // Implement basic validation logic as fallback
    const isValid =
      customerData.age >= 18 && customerData.income > 0 && customerData.creditScore >= 300;

    return {
      isValid,
      riskLevel:
        customerData.creditScore >= 700
          ? 'low'
          : customerData.creditScore >= 600
          ? 'medium'
          : 'high',
      approvedAmount: isValid ? Math.min(customerData.income * 3, 50000) : 0,
      reason: isValid ? 'Fallback validation passed' : 'Fallback validation failed',
      recommendations: ['Service temporarily unavailable - using fallback validation'],
    };
  }
}

// ============================================================================
// 5. MONITORING AND STATISTICS EXAMPLES
// ============================================================================

import { Controller, Get } from '@nestjs/common';

@Controller('monitoring')
export class MonitoringController {
  constructor(private readonly goRulesService: GoRulesService) {}

  /**
   * Get execution statistics
   */
  @Get('statistics')
  getExecutionStatistics() {
    const stats = this.goRulesService.getExecutionStatistics();

    return Object.entries(stats).map(([ruleId, stat]) => ({
      ruleId,
      totalExecutions: stat.count,
      averageExecutionTime: stat.averageTime,
      errorRate: stat.errorRate,
      successRate: 1 - stat.errorRate,
    }));
  }

  /**
   * Get circuit breaker status
   */
  @Get('circuit-breakers')
  getCircuitBreakerStatus() {
    return this.goRulesService.getCircuitBreakerStatistics();
  }

  /**
   * Health check endpoint
   */
  @Get('health')
  async healthCheck() {
    try {
      // Test rule execution to verify service health
      const testResult = await this.goRulesService.validateRuleExists('health-check');

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        ruleServiceAvailable: testResult,
        statistics: this.goRulesService.getExecutionStatistics(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        ruleServiceAvailable: false,
      };
    }
  }
}

// ============================================================================
// 6. TESTING EXAMPLES
// ============================================================================

import { Test, TestingModule } from '@nestjs/testing';

describe('CustomerService', () => {
  let service: CustomerService;
  let goRulesService: jest.Mocked<GoRulesService>;

  beforeEach(async () => {
    const mockGoRulesService = {
      executeRule: jest.fn(),
      validateRuleExists: jest.fn(),
      getRuleMetadata: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [CustomerService, { provide: GoRulesService, useValue: mockGoRulesService }],
    }).compile();

    service = module.get<CustomerService>(CustomerService);
    goRulesService = module.get(GoRulesService);
  });

  it('should validate customer successfully', async () => {
    const mockCustomerData: CustomerData = {
      age: 30,
      income: 60000,
      creditScore: 750,
      employmentStatus: 'employed',
      hasExistingLoans: false,
    };

    const mockResult: ValidationResult = {
      isValid: true,
      riskLevel: 'low',
      approvedAmount: 50000,
      reason: 'Customer meets all criteria',
      recommendations: ['Consider premium products'],
    };

    goRulesService.executeRule.mockResolvedValue({
      result: mockResult,
      performance: { executionTime: 150, networkTime: 50, totalTime: 200 },
      metadata: { id: 'customer-validation', name: 'Customer Validation', version: '1.0.0' },
    });

    const result = await service.validateCustomer(mockCustomerData);

    expect(result).toEqual(mockResult);
    expect(goRulesService.executeRule).toHaveBeenCalledWith(
      'customer-validation',
      mockCustomerData,
    );
  });

  it('should handle rule not found error', async () => {
    const mockCustomerData: CustomerData = {
      age: 25,
      income: 40000,
      creditScore: 650,
      employmentStatus: 'employed',
      hasExistingLoans: true,
    };

    goRulesService.executeRule.mockRejectedValue(
      new GoRulesException(GoRulesErrorCode.RULE_NOT_FOUND, 'Rule not found'),
    );

    await expect(service.validateCustomer(mockCustomerData)).rejects.toThrow(GoRulesException);
  });
});

// ============================================================================
// 7. USAGE TIPS AND BEST PRACTICES
// ============================================================================

/**
 * Best Practices Service demonstrating optimal usage patterns
 */
@Injectable()
export class BestPracticesService {
  constructor(private readonly goRulesService: GoRulesService) {}

  /**
   * 1. Use appropriate timeouts based on rule complexity
   */
  async executeComplexRule(input: any) {
    return this.goRulesService.executeRule('complex-analysis', input, {
      timeout: 60000, // 60 seconds for complex rules
    });
  }

  /**
   * 2. Use batch processing for multiple rules
   */
  async processMultipleRules(inputs: any[]) {
    const batchExecutions = inputs.map((input, index) => ({
      executionId: `batch-${index}`,
      ruleId: 'processing-rule',
      input,
    }));

    return this.goRulesService.executeBatch(batchExecutions);
  }

  /**
   * 3. Implement caching for frequently used rules with static data
   */
  private cache = new Map<string, { result: any; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  async executeWithCaching(ruleId: string, input: any) {
    const cacheKey = `${ruleId}-${JSON.stringify(input)}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.result;
    }

    const result = await this.goRulesService.executeRule(ruleId, input);

    this.cache.set(cacheKey, {
      result: result.result,
      timestamp: Date.now(),
    });

    return result.result;
  }

  /**
   * 4. Use structured logging for better debugging
   */
  async executeWithLogging(ruleId: string, input: any, userId?: string) {
    const startTime = Date.now();

    try {
      console.log('Rule execution started', {
        ruleId,
        userId,
        inputSize: JSON.stringify(input).length,
        timestamp: new Date().toISOString(),
      });

      const result = await this.goRulesService.executeRule(ruleId, input, {
        trace: true,
        userId,
      });

      console.log('Rule execution completed', {
        ruleId,
        userId,
        executionTime: Date.now() - startTime,
        success: true,
        timestamp: new Date().toISOString(),
      });

      return result.result;
    } catch (error) {
      console.error('Rule execution failed', {
        ruleId,
        userId,
        executionTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });

      throw error;
    }
  }
}
