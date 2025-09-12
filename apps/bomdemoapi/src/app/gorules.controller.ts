import {
  Controller,
  Post,
  Get,
  Body,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { BomDemoGoRulesService } from './gorules.service';
import { GoRulesException, GoRulesErrorCode } from '@org/gorules';

/**
 * DTO for BOM validation
 */
export class ValidateBomDto {
  items!: Array<{
    id: string;
    name: string;
    quantity: number;
    unitPrice: number;
    category: string;
  }>;
  totalValue!: number;
  supplier!: string;
  requestedBy!: string;
}

/**
 * DTO for pricing calculation
 */
export class CalculatePricingDto {
  items!: Array<{
    id: string;
    basePrice: number;
    quantity: number;
    category: string;
  }>;
  customerTier!: 'standard' | 'premium' | 'enterprise';
  orderVolume!: number;
  seasonalFactor?: number;
}

/**
 * DTO for supplier risk assessment
 */
export class AssessSupplierRiskDto {
  supplierId!: string;
  name!: string;
  location!: string;
  creditRating!: string;
  deliveryHistory!: {
    onTimeDeliveries: number;
    totalDeliveries: number;
    averageDelay: number;
  };
  qualityMetrics!: {
    defectRate: number;
    returnRate: number;
    certifications: string[];
  };
  financialMetrics!: {
    revenue: number;
    profitMargin: number;
    debtToEquity: number;
  };
}

/**
 * DTO for approval workflow determination
 */
export class DetermineApprovalWorkflowDto {
  requestType!: 'purchase' | 'supplier_change' | 'budget_increase';
  amount!: number;
  requestedBy!: string;
  department!: string;
  urgency!: 'low' | 'medium' | 'high' | 'critical';
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Controller for GoRules business logic in BOM Demo API
 */
@Controller('gorules')
export class GoRulesController {
  private readonly logger = new Logger(GoRulesController.name);

  constructor(private readonly goRulesService: BomDemoGoRulesService) {}

  /**
   * Validate BOM data using business rules
   */
  @Post('validate-bom')
  async validateBom(@Body() dto: ValidateBomDto) {
    try {
      this.logger.log('BOM validation request received', {
        itemCount: dto.items.length,
        supplier: dto.supplier,
      });

      const result = await this.goRulesService.validateBom(dto);
      
      this.logger.log('BOM validation completed', {
        isValid: result.isValid,
        errorCount: result.errors?.length || 0,
      });

      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('BOM validation failed', error);
      
      if (error instanceof GoRulesException) {
        throw new HttpException(
          {
            success: false,
            error: {
              code: error.code,
              message: error.message,
              details: error.details,
            },
            timestamp: new Date().toISOString(),
          },
          this.mapGoRulesErrorToHttpStatus(error.code)
        );
      }

      throw new HttpException(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred',
          },
          timestamp: new Date().toISOString(),
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Calculate pricing using business rules
   */
  @Post('calculate-pricing')
  async calculatePricing(@Body() dto: CalculatePricingDto) {
    try {
      this.logger.log('Pricing calculation request received', {
        itemCount: dto.items.length,
        customerTier: dto.customerTier,
        orderVolume: dto.orderVolume,
      });

      const result = await this.goRulesService.calculatePricing(dto);
      
      this.logger.log('Pricing calculation completed', {
        totalPrice: result.totalPrice,
        discountCount: result.appliedDiscounts.length,
      });

      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Pricing calculation failed', error);
      
      if (error instanceof GoRulesException) {
        throw new HttpException(
          {
            success: false,
            error: {
              code: error.code,
              message: error.message,
              details: error.details,
            },
            timestamp: new Date().toISOString(),
          },
          this.mapGoRulesErrorToHttpStatus(error.code)
        );
      }

      throw new HttpException(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred',
          },
          timestamp: new Date().toISOString(),
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Assess supplier risk using business rules
   */
  @Post('assess-supplier-risk')
  async assessSupplierRisk(@Body() dto: AssessSupplierRiskDto) {
    try {
      this.logger.log('Supplier risk assessment request received', {
        supplierId: dto.supplierId,
        name: dto.name,
      });

      const result = await this.goRulesService.assessSupplierRisk(dto);
      
      this.logger.log('Supplier risk assessment completed', {
        riskLevel: result.riskLevel,
        riskScore: result.riskScore,
        approvalRequired: result.approvalRequired,
      });

      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Supplier risk assessment failed', error);
      
      if (error instanceof GoRulesException) {
        throw new HttpException(
          {
            success: false,
            error: {
              code: error.code,
              message: error.message,
              details: error.details,
            },
            timestamp: new Date().toISOString(),
          },
          this.mapGoRulesErrorToHttpStatus(error.code)
        );
      }

      throw new HttpException(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred',
          },
          timestamp: new Date().toISOString(),
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Determine approval workflow using business rules
   */
  @Post('determine-approval-workflow')
  async determineApprovalWorkflow(@Body() dto: DetermineApprovalWorkflowDto) {
    try {
      this.logger.log('Approval workflow determination request received', {
        requestType: dto.requestType,
        amount: dto.amount,
        urgency: dto.urgency,
      });

      const result = await this.goRulesService.determineApprovalWorkflow(dto);
      
      this.logger.log('Approval workflow determination completed', {
        workflowType: result.workflowType,
        approverCount: result.approvers.length,
        autoApprove: result.autoApprove,
      });

      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Approval workflow determination failed', error);
      
      if (error instanceof GoRulesException) {
        throw new HttpException(
          {
            success: false,
            error: {
              code: error.code,
              message: error.message,
              details: error.details,
            },
            timestamp: new Date().toISOString(),
          },
          this.mapGoRulesErrorToHttpStatus(error.code)
        );
      }

      throw new HttpException(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred',
          },
          timestamp: new Date().toISOString(),
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get GoRules execution statistics
   */
  @Get('statistics')
  getStatistics() {
    try {
      const executionStats = this.goRulesService.getExecutionStatistics();
      const circuitBreakerStats = this.goRulesService.getCircuitBreakerStatistics();

      return {
        success: true,
        data: {
          execution: executionStats,
          circuitBreakers: circuitBreakerStats,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to get statistics', error);
      
      throw new HttpException(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to retrieve statistics',
          },
          timestamp: new Date().toISOString(),
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Reset circuit breakers
   */
  @Post('reset-circuit-breakers')
  resetCircuitBreakers() {
    try {
      this.goRulesService.resetCircuitBreakers();
      
      this.logger.log('Circuit breakers reset successfully');
      
      return {
        success: true,
        message: 'Circuit breakers reset successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to reset circuit breakers', error);
      
      throw new HttpException(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to reset circuit breakers',
          },
          timestamp: new Date().toISOString(),
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Health check endpoint
   */
  @Get('health')
  getHealth() {
    return {
      success: true,
      status: 'healthy',
      service: 'GoRules Integration',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Map GoRules error codes to HTTP status codes
   */
  private mapGoRulesErrorToHttpStatus(errorCode: GoRulesErrorCode): HttpStatus {
    switch (errorCode) {
      case GoRulesErrorCode.INVALID_INPUT:
      case GoRulesErrorCode.VALIDATION_ERROR:
        return HttpStatus.BAD_REQUEST;
      case GoRulesErrorCode.RULE_NOT_FOUND:
        return HttpStatus.NOT_FOUND;
      case GoRulesErrorCode.UNAUTHORIZED:
        return HttpStatus.UNAUTHORIZED;
      case GoRulesErrorCode.RATE_LIMIT_EXCEEDED:
        return HttpStatus.TOO_MANY_REQUESTS;
      case GoRulesErrorCode.TIMEOUT:
        return HttpStatus.REQUEST_TIMEOUT;
      case GoRulesErrorCode.NETWORK_ERROR:
        return HttpStatus.SERVICE_UNAVAILABLE;
      case GoRulesErrorCode.INTERNAL_ERROR:
      default:
        return HttpStatus.INTERNAL_SERVER_ERROR;
    }
  }
}