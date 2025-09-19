import {
  Controller,
  Post,
  Get,
  Body,
  HttpException,
  HttpStatus,
  Logger,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import {
  IsNumber,
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  Min,
  Max,
  IsNotEmpty,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BusinessRulesService } from './business-rules.service';
import { GoRulesException, GoRulesErrorCode } from '@org/gorules';

/**
 * DTO for purchase approval request
 */
export class PurchaseApprovalDto {
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsString()
  @IsNotEmpty()
  department!: string;

  @IsString()
  @IsNotEmpty()
  requestedBy!: string;

  @IsEnum(['low', 'medium', 'high', 'critical'])
  urgency!: 'low' | 'medium' | 'high' | 'critical';

  @IsString()
  @IsNotEmpty()
  category!: string;

  @IsOptional()
  @IsString()
  supplier?: string;

  @IsOptional()
  @IsString()
  justification?: string;
}

/**
 * DTO for supplier risk assessment request
 */
export class SupplierRiskDto {
  @IsString()
  @IsNotEmpty()
  supplierId!: string;

  @IsString()
  @IsNotEmpty()
  supplierName!: string;

  @IsString()
  @IsNotEmpty()
  country!: string;

  @IsString()
  @IsNotEmpty()
  creditRating!: string;

  @IsNumber()
  @Min(0)
  yearsInBusiness!: number;

  @IsNumber()
  @Min(0)
  previousOrderCount!: number;

  @IsNumber()
  @Min(0)
  averageDeliveryTime!: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  qualityScore!: number;

  @IsArray()
  @IsString({ each: true })
  complianceCertifications!: string[];
}

/**
 * DTO for pricing rules request
 */
export class PricingRulesDto {
  @IsNumber()
  @Min(0.01)
  basePrice!: number;

  @IsNumber()
  @Min(1)
  quantity!: number;

  @IsEnum(['bronze', 'silver', 'gold', 'platinum'])
  customerTier!: 'bronze' | 'silver' | 'gold' | 'platinum';

  @IsString()
  @IsNotEmpty()
  productCategory!: string;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(3.0)
  seasonalFactor?: number;

  @IsOptional()
  @IsString()
  promotionCode?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  contractDiscount?: number;
}

/**
 * DTO for batch rule execution request
 */
export class BatchRuleRequestDto {
  @IsEnum(['purchase-approval', 'supplier-risk', 'pricing'])
  type!: 'purchase-approval' | 'supplier-risk' | 'pricing';

  @IsOptional()
  @IsString()
  id?: string;

  // Note: In a real application, you might want to use a union type or discriminated union
  // For simplicity, we'll accept any object here and validate it in the service
  data!: any;
}

export class BatchRulesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchRuleRequestDto)
  requests!: BatchRuleRequestDto[];
}

/**
 * Controller demonstrating practical GoRules usage for business rules
 */
@Controller('business-rules')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class BusinessRulesController {
  private readonly logger = new Logger(BusinessRulesController.name);

  constructor(private readonly businessRulesService: BusinessRulesService) {}

  /**
   * Evaluate purchase approval using business rules
   */
  @Post('purchase-approval')
  async evaluatePurchaseApproval(@Body() dto: PurchaseApprovalDto) {
    try {
      this.logger.log('Purchase approval request received', {
        amount: dto.amount,
        department: dto.department,
        urgency: dto.urgency,
      });

      const result = await this.businessRulesService.evaluatePurchaseApproval(dto);

      this.logger.log('Purchase approval evaluation completed', {
        approved: result.approved,
        approvalLevel: result.approvalLevel,
      });

      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return this.handleError(error, 'Purchase approval evaluation failed');
    }
  }

  /**
   * Assess supplier risk using business rules
   */
  @Post('supplier-risk')
  async assessSupplierRisk(@Body() dto: SupplierRiskDto) {
    try {
      this.logger.log('Supplier risk assessment request received', {
        supplierId: dto.supplierId,
        supplierName: dto.supplierName,
        country: dto.country,
      });

      const result = await this.businessRulesService.assessSupplierRisk(dto);

      this.logger.log('Supplier risk assessment completed', {
        riskLevel: result.riskLevel,
        riskScore: result.riskScore,
        approved: result.approved,
      });

      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return this.handleError(error, 'Supplier risk assessment failed');
    }
  }

  /**
   * Calculate pricing using business rules
   */
  @Post('pricing')
  async calculatePricing(@Body() dto: PricingRulesDto) {
    try {
      this.logger.log('Pricing calculation request received', {
        basePrice: dto.basePrice,
        quantity: dto.quantity,
        customerTier: dto.customerTier,
        productCategory: dto.productCategory,
      });

      const result = await this.businessRulesService.calculatePricing(dto);

      this.logger.log('Pricing calculation completed', {
        finalPrice: result.finalPrice,
        totalDiscount: result.totalDiscount,
        discountCount: result.appliedDiscounts.length,
      });

      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return this.handleError(error, 'Pricing calculation failed');
    }
  }

  /**
   * Execute multiple business rules in batch
   */
  @Post('batch')
  async executeBatchRules(@Body() dto: BatchRulesDto) {
    try {
      this.logger.log('Batch rules execution request received', {
        requestCount: dto.requests.length,
        types: dto.requests.map((r) => r.type),
      });

      const results = await this.businessRulesService.executeBatchRules(dto.requests);

      const successCount = results.filter((r) => r.success).length;
      const errorCount = results.length - successCount;

      this.logger.log('Batch rules execution completed', {
        totalRequests: results.length,
        successCount,
        errorCount,
      });

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
      return this.handleError(error, 'Batch rules execution failed');
    }
  }

  /**
   * Get rule execution statistics
   */
  @Get('statistics')
  async getRuleStatistics() {
    try {
      this.logger.log('Rule statistics request received');

      const statistics = await this.businessRulesService.getRuleStatistics();

      return {
        success: true,
        data: statistics,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return this.handleError(error, 'Failed to retrieve rule statistics');
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
        purchaseApproval: {
          amount: 15000,
          department: 'IT',
          requestedBy: 'john.doe@company.com',
          urgency: 'medium',
          category: 'software',
          supplier: 'TechCorp Inc',
          justification: 'New development tools for the team',
        },
        supplierRisk: {
          supplierId: 'SUP-001',
          supplierName: 'Reliable Components Ltd',
          country: 'Germany',
          creditRating: 'A',
          yearsInBusiness: 15,
          previousOrderCount: 25,
          averageDeliveryTime: 7,
          qualityScore: 92,
          complianceCertifications: ['ISO9001', 'ISO14001', 'OHSAS18001'],
        },
        pricing: {
          basePrice: 100,
          quantity: 50,
          customerTier: 'gold',
          productCategory: 'electronics',
          seasonalFactor: 1.1,
          promotionCode: 'SUMMER2024',
          contractDiscount: 0.05,
        },
        batch: {
          requests: [
            {
              type: 'purchase-approval',
              id: 'req-001',
              data: {
                amount: 5000,
                department: 'Marketing',
                requestedBy: 'jane.smith@company.com',
                urgency: 'low',
                category: 'advertising',
              },
            },
            {
              type: 'pricing',
              id: 'req-002',
              data: {
                basePrice: 200,
                quantity: 10,
                customerTier: 'silver',
                productCategory: 'office-supplies',
              },
            },
          ],
        },
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Health check endpoint for business rules
   */
  @Get('health')
  async getHealth() {
    try {
      // Perform a simple rule validation to check if the service is working
      const statistics = await this.businessRulesService.getRuleStatistics();

      return {
        success: true,
        status: 'healthy',
        service: 'Business Rules',
        data: {
          recentExecutions: statistics.recentExecutions,
          availableRules: ['purchase-approval', 'supplier-risk-assessment', 'pricing-rules'],
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Health check failed', error);

      return {
        success: false,
        status: 'unhealthy',
        service: 'Business Rules',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
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
