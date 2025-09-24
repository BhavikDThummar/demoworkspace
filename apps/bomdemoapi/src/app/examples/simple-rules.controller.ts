import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpException,
  HttpStatus,
  Logger,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { IsNumber, IsString, IsOptional, IsObject, Min, IsNotEmpty } from 'class-validator';
import { SimpleRulesService } from './simple-rules.service';
import { GoRulesException } from '@org/gorules';

/**
 * DTO for simple rule input
 */
export class SimpleRuleInputDto {
  @IsNumber()
  @Min(0)
  value!: number;

  @IsString()
  @IsNotEmpty()
  category!: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * DTO for rule execution with custom timeout
 */
export class RuleWithTimeoutDto extends SimpleRuleInputDto {
  @IsNumber()
  @Min(1000)
  timeoutMs!: number;
}

/**
 * DTO for multiple rule execution
 */
export class MultipleRulesDto {
  @IsString()
  @IsNotEmpty()
  ruleId!: string;

  @IsObject()
  input!: SimpleRuleInputDto;
}

/**
 * Simple controller demonstrating basic GoRules usage patterns
 */
@Controller('simple-rules')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class SimpleRulesController {
  private readonly logger = new Logger(SimpleRulesController.name);

  constructor(private readonly simpleRulesService: SimpleRulesService) {}

  /**
   * Execute a simple rule
   */
  @Post('execute')
  async executeSimpleRule(@Body() dto: SimpleRuleInputDto) {
    try {
      this.logger.log('Simple rule execution request', {
        value: dto.value,
        category: dto.category,
      });

      const result = await this.simpleRulesService.executeSimpleRule(dto);

      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return this.handleError(error, 'Simple rule execution failed');
    }
  }

  /**
   * Execute a test Shiping fees
   */
  @Post('execute-shipping-fees')
  async executeShippingFeesRule(@Body() dto: any) {
    try {
      this.logger.log('Shipping Fees execution request', {
        value: dto.value,
        category: dto.category,
      });

      const result = await this.simpleRulesService.executeSimpleRule(dto);

      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return this.handleError(error, 'Shipping Fees execution failed');
    }
  }

  /**
   * Execute a rule with tracing enabled
   */
  @Post('execute-with-trace')
  async executeRuleWithTracing(@Body() dto: SimpleRuleInputDto) {
    try {
      this.logger.log('Rule execution with tracing request', {
        value: dto.value,
        category: dto.category,
      });

      const result = await this.simpleRulesService.executeRuleWithTracing(dto);

      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return this.handleError(error, 'Rule execution with tracing failed');
    }
  }

  /**
   * Validate and execute a specific rule
   */
  @Post('validate-and-execute/:ruleId')
  async validateAndExecuteRule(@Param('ruleId') ruleId: string, @Body() dto: SimpleRuleInputDto) {
    try {
      this.logger.log('Validate and execute rule request', {
        ruleId,
        value: dto.value,
        category: dto.category,
      });

      const result = await this.simpleRulesService.validateAndExecuteRule(ruleId, dto);

      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return this.handleError(error, `Validate and execute rule '${ruleId}' failed`);
    }
  }

  /**
   * Execute multiple rules sequentially
   */
  @Post('execute-sequential')
  async executeRulesSequentially(@Body() dto: { rules: MultipleRulesDto[] }) {
    try {
      this.logger.log('Sequential rules execution request', {
        ruleCount: dto.rules.length,
        ruleIds: dto.rules.map((r) => r.ruleId),
      });

      const results = await this.simpleRulesService.executeRulesSequentially(dto.rules);

      const successCount = results.filter((r) => r.success).length;
      const errorCount = results.length - successCount;

      return {
        success: true,
        data: {
          results,
          summary: {
            total: results.length,
            successful: successCount,
            failed: errorCount,
          },
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return this.handleError(error, 'Sequential rules execution failed');
    }
  }

  /**
   * Execute a rule with custom timeout
   */
  @Post('execute-with-timeout/:ruleId')
  async executeRuleWithCustomTimeout(
    @Param('ruleId') ruleId: string,
    @Body() dto: RuleWithTimeoutDto,
  ) {
    try {
      this.logger.log('Rule execution with custom timeout request', {
        ruleId,
        timeoutMs: dto.timeoutMs,
        value: dto.value,
        category: dto.category,
      });

      const result = await this.simpleRulesService.executeRuleWithCustomTimeout(
        ruleId,
        dto,
        dto.timeoutMs,
      );

      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return this.handleError(error, `Rule execution with custom timeout failed for '${ruleId}'`);
    }
  }

  /**
   * Get information about a specific rule
   */
  @Get('info/:ruleId')
  async getRuleInformation(@Param('ruleId') ruleId: string) {
    try {
      this.logger.log('Rule information request', { ruleId });

      const info = await this.simpleRulesService.getRuleInformation(ruleId);

      return {
        success: true,
        data: info,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return this.handleError(error, `Failed to get information for rule '${ruleId}'`);
    }
  }

  /**
   * Demonstrate error handling patterns
   */
  @Post('demo-error-handling/:ruleId')
  async demonstrateErrorHandling(@Param('ruleId') ruleId: string, @Body() dto: SimpleRuleInputDto) {
    try {
      this.logger.log('Error handling demonstration request', {
        ruleId,
        value: dto.value,
        category: dto.category,
      });

      const result = await this.simpleRulesService.demonstrateErrorHandling(ruleId, dto);

      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      // This endpoint should not throw errors, but handle them gracefully
      this.logger.error('Unexpected error in error handling demonstration', error);

      return {
        success: false,
        error: {
          code: 'UNEXPECTED_ERROR',
          message: 'An unexpected error occurred during error handling demonstration',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get service health and statistics
   */
  @Get('health')
  async getServiceHealth() {
    try {
      this.logger.log('Service health request');

      const health = await this.simpleRulesService.getServiceHealth();

      return {
        success: true,
        data: health,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return this.handleError(error, 'Failed to get service health');
    }
  }

  /**
   * Get example requests for testing
   */
  @Get('examples')
  getExampleRequests() {
    return {
      success: true,
      data: {
        simpleRule: {
          value: 42,
          category: 'test',
          metadata: {
            source: 'api-example',
            timestamp: new Date().toISOString(),
          },
        },
        ruleWithTimeout: {
          value: 100,
          category: 'performance-test',
          timeoutMs: 5000,
          metadata: {
            testType: 'timeout',
          },
        },
        multipleRules: {
          rules: [
            {
              ruleId: 'rule-1',
              input: {
                value: 10,
                category: 'batch-test-1',
              },
            },
            {
              ruleId: 'rule-2',
              input: {
                value: 20,
                category: 'batch-test-2',
              },
            },
          ],
        },
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get available endpoints documentation
   */
  @Get('docs')
  getDocumentation() {
    return {
      success: true,
      data: {
        endpoints: [
          {
            method: 'POST',
            path: '/simple-rules/execute',
            description: 'Execute a simple rule with basic input',
            body: 'SimpleRuleInputDto',
          },
          {
            method: 'POST',
            path: '/simple-rules/execute-with-trace',
            description: 'Execute a rule with tracing enabled for debugging',
            body: 'SimpleRuleInputDto',
          },
          {
            method: 'POST',
            path: '/simple-rules/validate-and-execute/:ruleId',
            description: 'Validate rule exists before executing',
            parameters: ['ruleId'],
            body: 'SimpleRuleInputDto',
          },
          {
            method: 'POST',
            path: '/simple-rules/execute-sequential',
            description: 'Execute multiple rules sequentially',
            body: '{ rules: MultipleRulesDto[] }',
          },
          {
            method: 'POST',
            path: '/simple-rules/execute-with-timeout/:ruleId',
            description: 'Execute a rule with custom timeout',
            parameters: ['ruleId'],
            body: 'RuleWithTimeoutDto',
          },
          {
            method: 'GET',
            path: '/simple-rules/info/:ruleId',
            description: 'Get information about a specific rule',
            parameters: ['ruleId'],
          },
          {
            method: 'POST',
            path: '/simple-rules/demo-error-handling/:ruleId',
            description: 'Demonstrate error handling patterns',
            parameters: ['ruleId'],
            body: 'SimpleRuleInputDto',
          },
          {
            method: 'GET',
            path: '/simple-rules/health',
            description: 'Get service health and statistics',
          },
          {
            method: 'GET',
            path: '/simple-rules/examples',
            description: 'Get example requests for testing',
          },
        ],
        schemas: {
          SimpleRuleInputDto: {
            value: 'number (min: 0)',
            category: 'string (required)',
            metadata: 'object (optional)',
          },
          RuleWithTimeoutDto: {
            extends: 'SimpleRuleInputDto',
            timeoutMs: 'number (min: 1000)',
          },
          MultipleRulesDto: {
            ruleId: 'string (required)',
            input: 'SimpleRuleInputDto',
          },
        },
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Handle errors consistently
   */
  private handleError(error: unknown, message: string) {
    this.logger.error(message, error);

    if (error instanceof GoRulesException) {
      const statusCode = this.mapGoRulesErrorToHttpStatus(error.code);

      throw new HttpException(
        {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            details: error.details,
            retryable: error.retryable,
          },
          timestamp: new Date().toISOString(),
        },
        statusCode,
      );
    }

    throw new HttpException(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: message,
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  /**
   * Map GoRules error codes to HTTP status codes
   */
  private mapGoRulesErrorToHttpStatus(errorCode: string): HttpStatus {
    switch (errorCode) {
      case 'INVALID_INPUT':
      case 'VALIDATION_ERROR':
        return HttpStatus.BAD_REQUEST;
      case 'RULE_NOT_FOUND':
        return HttpStatus.NOT_FOUND;
      case 'UNAUTHORIZED':
        return HttpStatus.UNAUTHORIZED;
      case 'RATE_LIMIT_EXCEEDED':
        return HttpStatus.TOO_MANY_REQUESTS;
      case 'TIMEOUT':
        return HttpStatus.REQUEST_TIMEOUT;
      case 'NETWORK_ERROR':
        return HttpStatus.SERVICE_UNAVAILABLE;
      case 'INTERNAL_ERROR':
      default:
        return HttpStatus.INTERNAL_SERVER_ERROR;
    }
  }
}
