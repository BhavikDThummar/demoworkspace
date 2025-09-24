import { Injectable, Logger } from '@nestjs/common';
import { GoRulesService, GoRulesException, GoRulesErrorCode } from '@org/gorules';

/**
 * Input interface for purchase approval rules
 */
export interface PurchaseApprovalInput {
  amount: number;
  department: string;
  requestedBy: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  supplier?: string;
  justification?: string;
}

/**
 * Output interface for purchase approval rules
 */
export interface PurchaseApprovalOutput {
  approved: boolean;
  approvalLevel: 'auto' | 'manager' | 'director' | 'executive';
  requiredApprovers: string[];
  conditions: string[];
  maxAmount?: number;
  reason: string;
}

/**
 * Input interface for supplier risk assessment
 */
export interface SupplierRiskInput {
  supplierId: string;
  supplierName: string;
  country: string;
  creditRating: string;
  yearsInBusiness: number;
  previousOrderCount: number;
  averageDeliveryTime: number;
  qualityScore: number;
  complianceCertifications: string[];
}

/**
 * Output interface for supplier risk assessment
 */
export interface SupplierRiskOutput {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  riskFactors: string[];
  recommendations: string[];
  approved: boolean;
  requiresReview: boolean;
}

/**
 * Input interface for pricing rules
 */
export interface PricingRulesInput {
  basePrice: number;
  quantity: number;
  customerTier: 'bronze' | 'silver' | 'gold' | 'platinum';
  productCategory: string;
  seasonalFactor?: number;
  promotionCode?: string;
  contractDiscount?: number;
}

/**
 * Output interface for pricing rules
 */
export interface PricingRulesOutput {
  finalPrice: number;
  originalPrice: number;
  totalDiscount: number;
  appliedDiscounts: Array<{
    type: string;
    amount: number;
    percentage: number;
    reason: string;
  }>;
  priceBreakdown: {
    basePrice: number;
    quantityDiscount: number;
    tierDiscount: number;
    seasonalAdjustment: number;
    promotionDiscount: number;
    contractDiscount: number;
  };
}

/**
 * Business rules service demonstrating practical GoRules usage
 */
@Injectable()
export class BusinessRulesService {
  private readonly logger = new Logger(BusinessRulesService.name);

  constructor(private readonly goRulesService: GoRulesService) {}

  /**
   * Evaluate purchase approval using business rules
   */
  async evaluatePurchaseApproval(input: PurchaseApprovalInput): Promise<PurchaseApprovalOutput> {
    try {
      this.logger.log('Evaluating purchase approval', {
        amount: input.amount,
        department: input.department,
        urgency: input.urgency,
      });

      // Validate input
      this.validatePurchaseApprovalInput(input);

      // Execute the purchase approval rule
      const result = await this.goRulesService.executeRule<
        PurchaseApprovalInput,
        PurchaseApprovalOutput
      >('purchase-approval', input, {
        timeout: 10000,
        trace: true,
      });

      this.logger.log('Purchase approval evaluation completed', {
        approved: result.result.approved,
        approvalLevel: result.result.approvalLevel,
        executionTime: result.performance.executionTime,
      });

      return result.result;
    } catch (error) {
      this.logger.error('Purchase approval evaluation failed', error);

      if (error instanceof GoRulesException) {
        throw error;
      }

      throw new GoRulesException(
        GoRulesErrorCode.INTERNAL_ERROR,
        'Failed to evaluate purchase approval',
        { input, originalError: error },
      );
    }
  }

  /**
   * Assess supplier risk using business rules
   */
  async assessSupplierRisk(input: SupplierRiskInput): Promise<SupplierRiskOutput> {
    try {
      this.logger.log('Assessing supplier risk', {
        supplierId: input.supplierId,
        supplierName: input.supplierName,
        country: input.country,
      });

      // Validate input
      this.validateSupplierRiskInput(input);

      // Execute the supplier risk assessment rule
      const result = await this.goRulesService.executeRule<SupplierRiskInput, SupplierRiskOutput>(
        'supplier-risk-assessment',
        input,
        {
          timeout: 15000,
          trace: true,
        },
      );

      this.logger.log('Supplier risk assessment completed', {
        riskLevel: result.result.riskLevel,
        riskScore: result.result.riskScore,
        approved: result.result.approved,
        executionTime: result.performance.executionTime,
      });

      return result.result;
    } catch (error) {
      this.logger.error('Supplier risk assessment failed', error);

      if (error instanceof GoRulesException) {
        throw error;
      }

      throw new GoRulesException(
        GoRulesErrorCode.INTERNAL_ERROR,
        'Failed to assess supplier risk',
        { input, originalError: error },
      );
    }
  }

  /**
   * Calculate pricing using business rules
   */
  async calculatePricing(input: PricingRulesInput): Promise<PricingRulesOutput> {
    try {
      this.logger.log('Calculating pricing', {
        basePrice: input.basePrice,
        quantity: input.quantity,
        customerTier: input.customerTier,
        productCategory: input.productCategory,
      });

      // Validate input
      this.validatePricingRulesInput(input);

      // Execute the pricing rules
      const result = await this.goRulesService.executeRule<PricingRulesInput, PricingRulesOutput>(
        'pricing-rules',
        input,
        {
          timeout: 8000,
          trace: true,
        },
      );

      this.logger.log('Pricing calculation completed', {
        finalPrice: result.result.finalPrice,
        totalDiscount: result.result.totalDiscount,
        discountCount: result.result.appliedDiscounts.length,
        executionTime: result.performance.executionTime,
      });

      return result.result;
    } catch (error) {
      this.logger.error('Pricing calculation failed', error);

      if (error instanceof GoRulesException) {
        throw error;
      }

      throw new GoRulesException(GoRulesErrorCode.INTERNAL_ERROR, 'Failed to calculate pricing', {
        input,
        originalError: error,
      });
    }
  }

  /**
   * Execute multiple business rules in batch
   */
  async executeBatchRules(
    requests: Array<{
      type: 'purchase-approval' | 'supplier-risk' | 'pricing';
      data: PurchaseApprovalInput | SupplierRiskInput | PricingRulesInput;
      id?: string;
    }>,
  ): Promise<
    Array<{
      id: string;
      type: string;
      success: boolean;
      result?: any;
      error?: string;
      executionTime?: number;
    }>
  > {
    try {
      this.logger.log('Executing batch business rules', {
        requestCount: requests.length,
        types: requests.map((r) => r.type),
      });

      // Prepare batch executions
      const batchExecutions = requests.map((request, index) => ({
        executionId: request.id || `batch-${Date.now()}-${index}`,
        ruleId: this.getRuleIdForType(request.type),
        input: request.data,
        options: {
          timeout: 10000,
          trace: false, // Disable tracing for batch operations
        },
      }));

      // Execute batch
      const results = await this.goRulesService.executeBatch(batchExecutions);

      // Format results
      const formattedResults = results.map((result, index) => ({
        id: result.executionId,
        type: requests[index].type,
        success: !result.error,
        result: result.error ? undefined : result.result.decision,
        error: result.error?.message,
        executionTime: result.performance?.executionTime,
      }));

      this.logger.log('Batch business rules execution completed', {
        totalRequests: requests.length,
        successCount: formattedResults.filter((r) => r.success).length,
        errorCount: formattedResults.filter((r) => !r.success).length,
      });

      return formattedResults;
    } catch (error) {
      this.logger.error('Batch business rules execution failed', error);
      throw new GoRulesException(
        GoRulesErrorCode.INTERNAL_ERROR,
        'Failed to execute batch business rules',
        { requestCount: requests.length, originalError: error },
      );
    }
  }

  /**
   * Get rule execution statistics
   */
  async getRuleStatistics(): Promise<{
    executionStats: Record<string, any>;
    circuitBreakerStats: Record<string, any>;
    recentExecutions: number;
  }> {
    try {
      const executionStats = this.goRulesService.getExecutionStatistics();
      const circuitBreakerStats = this.goRulesService.getCircuitBreakerStatistics();

      // Calculate recent executions (last hour)
      const recentExecutions = Object.values(executionStats).reduce(
        (total: number, stats: any) => total + (stats.count || 0),
        0,
      );

      return {
        executionStats,
        circuitBreakerStats,
        recentExecutions,
      };
    } catch (error) {
      this.logger.error('Failed to get rule statistics', error);
      throw new GoRulesException(
        GoRulesErrorCode.INTERNAL_ERROR,
        'Failed to retrieve rule statistics',
        { originalError: error },
      );
    }
  }

  /**
   * Validate purchase approval input
   */
  private validatePurchaseApprovalInput(input: PurchaseApprovalInput): void {
    if (!input.amount || input.amount <= 0) {
      throw new GoRulesException(
        GoRulesErrorCode.INVALID_INPUT,
        'Purchase amount must be greater than 0',
        { amount: input.amount },
      );
    }

    if (!input.department || input.department.trim().length === 0) {
      throw new GoRulesException(GoRulesErrorCode.INVALID_INPUT, 'Department is required', {
        department: input.department,
      });
    }

    if (!input.requestedBy || input.requestedBy.trim().length === 0) {
      throw new GoRulesException(GoRulesErrorCode.INVALID_INPUT, 'Requested by is required', {
        requestedBy: input.requestedBy,
      });
    }

    if (!['low', 'medium', 'high', 'critical'].includes(input.urgency)) {
      throw new GoRulesException(GoRulesErrorCode.INVALID_INPUT, 'Invalid urgency level', {
        urgency: input.urgency,
      });
    }
  }

  /**
   * Validate supplier risk input
   */
  private validateSupplierRiskInput(input: SupplierRiskInput): void {
    if (!input.supplierId || input.supplierId.trim().length === 0) {
      throw new GoRulesException(GoRulesErrorCode.INVALID_INPUT, 'Supplier ID is required', {
        supplierId: input.supplierId,
      });
    }

    if (!input.supplierName || input.supplierName.trim().length === 0) {
      throw new GoRulesException(GoRulesErrorCode.INVALID_INPUT, 'Supplier name is required', {
        supplierName: input.supplierName,
      });
    }

    if (input.yearsInBusiness < 0) {
      throw new GoRulesException(
        GoRulesErrorCode.INVALID_INPUT,
        'Years in business cannot be negative',
        { yearsInBusiness: input.yearsInBusiness },
      );
    }

    if (input.qualityScore < 0 || input.qualityScore > 100) {
      throw new GoRulesException(
        GoRulesErrorCode.INVALID_INPUT,
        'Quality score must be between 0 and 100',
        { qualityScore: input.qualityScore },
      );
    }
  }

  /**
   * Validate pricing rules input
   */
  private validatePricingRulesInput(input: PricingRulesInput): void {
    if (!input.basePrice || input.basePrice <= 0) {
      throw new GoRulesException(
        GoRulesErrorCode.INVALID_INPUT,
        'Base price must be greater than 0',
        { basePrice: input.basePrice },
      );
    }

    if (!input.quantity || input.quantity <= 0) {
      throw new GoRulesException(
        GoRulesErrorCode.INVALID_INPUT,
        'Quantity must be greater than 0',
        { quantity: input.quantity },
      );
    }

    if (!['bronze', 'silver', 'gold', 'platinum'].includes(input.customerTier)) {
      throw new GoRulesException(GoRulesErrorCode.INVALID_INPUT, 'Invalid customer tier', {
        customerTier: input.customerTier,
      });
    }

    if (input.seasonalFactor && (input.seasonalFactor < 0.1 || input.seasonalFactor > 3.0)) {
      throw new GoRulesException(
        GoRulesErrorCode.INVALID_INPUT,
        'Seasonal factor must be between 0.1 and 3.0',
        { seasonalFactor: input.seasonalFactor },
      );
    }
  }

  /**
   * Get rule ID for business rule type
   */
  private getRuleIdForType(type: string): string {
    const ruleMap = {
      'purchase-approval': 'purchase-approval',
      'supplier-risk': 'supplier-risk-assessment',
      pricing: 'pricing-rules',
    };

    return ruleMap[type as keyof typeof ruleMap] || type;
  }
}
