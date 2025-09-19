import { Injectable, Logger } from '@nestjs/common';
import {
  GoRulesService,
  RuleInputData,
  RuleExecutionOptions,
  RuleExecutionResult,
  GoRulesException,
  GoRulesErrorCode,
} from '@org/gorules';

/**
 * Business rules service for BOM Demo API
 */
@Injectable()
export class BomDemoGoRulesService {
  private readonly logger = new Logger(BomDemoGoRulesService.name);

  constructor(private readonly goRulesService: GoRulesService) {}

  /**
   * Validate BOM (Bill of Materials) data
   */
  async validateBom(bomData: {
    items: Array<{
      id: string;
      name: string;
      quantity: number;
      unitPrice: number;
      category: string;
    }>;
    totalValue: number;
    supplier: string;
    requestedBy: string;
  }): Promise<{
    isValid: boolean;
    validationResults: any;
    recommendations?: string[];
    errors?: string[];
  }> {
    try {
      this.logger.log('Validating BOM data', {
        itemCount: bomData.items.length,
        totalValue: bomData.totalValue,
        supplier: bomData.supplier,
      });

      const result = await this.goRulesService.executeRule('bom-validation', bomData, {
        trace: true,
        timeout: 10000,
      });

      return {
        isValid: result.result.isValid || false,
        validationResults: result.result,
        recommendations: result.result.recommendations || [],
        errors: result.result.errors || [],
      };
    } catch (error) {
      this.logger.error('BOM validation failed', error);

      if (error instanceof GoRulesException) {
        throw error;
      }

      throw new GoRulesException(GoRulesErrorCode.INTERNAL_ERROR, 'BOM validation failed', {
        originalError: error,
      });
    }
  }

  /**
   * Calculate pricing for BOM items
   */
  async calculatePricing(pricingData: {
    items: Array<{
      id: string;
      basePrice: number;
      quantity: number;
      category: string;
    }>;
    customerTier: 'standard' | 'premium' | 'enterprise';
    orderVolume: number;
    seasonalFactor?: number;
  }): Promise<{
    totalPrice: number;
    itemPrices: Array<{
      id: string;
      originalPrice: number;
      finalPrice: number;
      discount: number;
      discountReason: string;
    }>;
    appliedDiscounts: string[];
  }> {
    try {
      this.logger.log('Calculating BOM pricing', {
        itemCount: pricingData.items.length,
        customerTier: pricingData.customerTier,
        orderVolume: pricingData.orderVolume,
      });

      const result = await this.goRulesService.executeRule('bom-pricing', pricingData, {
        trace: true,
        timeout: 15000,
      });

      return {
        totalPrice: result.result.totalPrice || 0,
        itemPrices: result.result.itemPrices || [],
        appliedDiscounts: result.result.appliedDiscounts || [],
      };
    } catch (error) {
      this.logger.error('BOM pricing calculation failed', error);

      if (error instanceof GoRulesException) {
        throw error;
      }

      throw new GoRulesException(
        GoRulesErrorCode.INTERNAL_ERROR,
        'BOM pricing calculation failed',
        { originalError: error },
      );
    }
  }

  /**
   * Assess supplier risk
   */
  async assessSupplierRisk(supplierData: {
    supplierId: string;
    name: string;
    location: string;
    creditRating: string;
    deliveryHistory: {
      onTimeDeliveries: number;
      totalDeliveries: number;
      averageDelay: number;
    };
    qualityMetrics: {
      defectRate: number;
      returnRate: number;
      certifications: string[];
    };
    financialMetrics: {
      revenue: number;
      profitMargin: number;
      debtToEquity: number;
    };
  }): Promise<{
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    riskScore: number;
    riskFactors: string[];
    recommendations: string[];
    approvalRequired: boolean;
  }> {
    try {
      this.logger.log('Assessing supplier risk', {
        supplierId: supplierData.supplierId,
        name: supplierData.name,
        location: supplierData.location,
      });

      const result = await this.goRulesService.executeRule(
        'supplier-risk-assessment',
        supplierData,
        {
          trace: true,
          timeout: 12000,
        },
      );

      return {
        riskLevel: result.result.riskLevel || 'medium',
        riskScore: result.result.riskScore || 0,
        riskFactors: result.result.riskFactors || [],
        recommendations: result.result.recommendations || [],
        approvalRequired: result.result.approvalRequired || false,
      };
    } catch (error) {
      this.logger.error('Supplier risk assessment failed', error);

      if (error instanceof GoRulesException) {
        throw error;
      }

      throw new GoRulesException(
        GoRulesErrorCode.INTERNAL_ERROR,
        'Supplier risk assessment failed',
        { originalError: error },
      );
    }
  }

  /**
   * Determine approval workflow
   */
  async determineApprovalWorkflow(approvalData: {
    requestType: 'purchase' | 'supplier_change' | 'budget_increase';
    amount: number;
    requestedBy: string;
    department: string;
    urgency: 'low' | 'medium' | 'high' | 'critical';
    riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  }): Promise<{
    workflowType: string;
    approvers: Array<{
      role: string;
      level: number;
      required: boolean;
    }>;
    estimatedDuration: number;
    autoApprove: boolean;
    conditions: string[];
  }> {
    try {
      this.logger.log('Determining approval workflow', {
        requestType: approvalData.requestType,
        amount: approvalData.amount,
        urgency: approvalData.urgency,
      });

      const result = await this.goRulesService.executeRule('approval-workflow', approvalData, {
        trace: true,
        timeout: 8000,
      });

      return {
        workflowType: result.result.workflowType || 'standard',
        approvers: result.result.approvers || [],
        estimatedDuration: result.result.estimatedDuration || 24,
        autoApprove: result.result.autoApprove || false,
        conditions: result.result.conditions || [],
      };
    } catch (error) {
      this.logger.error('Approval workflow determination failed', error);

      if (error instanceof GoRulesException) {
        throw error;
      }

      throw new GoRulesException(
        GoRulesErrorCode.INTERNAL_ERROR,
        'Approval workflow determination failed',
        { originalError: error },
      );
    }
  }

  /**
   * Get rule execution statistics
   */
  getExecutionStatistics() {
    return this.goRulesService.getExecutionStatistics();
  }

  /**
   * Get circuit breaker statistics
   */
  getCircuitBreakerStatistics() {
    return this.goRulesService.getCircuitBreakerStatistics();
  }

  /**
   * Reset circuit breakers
   */
  resetCircuitBreakers() {
    this.goRulesService.resetAllCircuitBreakers();
  }
}
