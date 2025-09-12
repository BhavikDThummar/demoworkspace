import { Test, TestingModule } from '@nestjs/testing';
import { BusinessRulesService } from './business-rules.service';
import { GoRulesService, GoRulesException, GoRulesErrorCode } from '@org/gorules';

describe('BusinessRulesService', () => {
  let service: BusinessRulesService;
  let goRulesService: jest.Mocked<GoRulesService>;

  beforeEach(async () => {
    const mockGoRulesService = {
      executeRule: jest.fn(),
      executeBatch: jest.fn(),
      getExecutionStatistics: jest.fn(),
      getCircuitBreakerStatistics: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BusinessRulesService,
        { provide: GoRulesService, useValue: mockGoRulesService },
      ],
    }).compile();

    service = module.get<BusinessRulesService>(BusinessRulesService);
    goRulesService = module.get(GoRulesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('evaluatePurchaseApproval', () => {
    const validInput = {
      amount: 15000,
      department: 'IT',
      requestedBy: 'john.doe@company.com',
      urgency: 'medium' as const,
      category: 'software',
      supplier: 'TechCorp Inc',
      justification: 'New development tools',
    };

    const mockResult = {
      approved: true,
      approvalLevel: 'manager' as const,
      requiredApprovers: ['manager@company.com'],
      conditions: ['Budget available'],
      reason: 'Within department budget',
    };

    it('should evaluate purchase approval successfully', async () => {
      goRulesService.executeRule.mockResolvedValue({
        result: mockResult,
        performance: { executionTime: 150, networkTime: 50, totalTime: 200 },
        metadata: { id: 'purchase-approval', name: 'Purchase Approval', version: '1.0.0' },
      });

      const result = await service.evaluatePurchaseApproval(validInput);

      expect(result).toEqual(mockResult);
      expect(goRulesService.executeRule).toHaveBeenCalledWith(
        'purchase-approval',
        validInput,
        { timeout: 10000, trace: true }
      );
    });

    it('should validate input and throw error for invalid amount', async () => {
      const invalidInput = { ...validInput, amount: 0 };

      await expect(service.evaluatePurchaseApproval(invalidInput)).rejects.toThrow(
        GoRulesException
      );
    });

    it('should validate input and throw error for empty department', async () => {
      const invalidInput = { ...validInput, department: '' };

      await expect(service.evaluatePurchaseApproval(invalidInput)).rejects.toThrow(
        GoRulesException
      );
    });

    it('should validate input and throw error for invalid urgency', async () => {
      const invalidInput = { ...validInput, urgency: 'invalid' as any };

      await expect(service.evaluatePurchaseApproval(invalidInput)).rejects.toThrow(
        GoRulesException
      );
    });

    it('should handle GoRules exceptions', async () => {
      const goRulesError = new GoRulesException(
        GoRulesErrorCode.RULE_NOT_FOUND,
        'Rule not found'
      );

      goRulesService.executeRule.mockRejectedValue(goRulesError);

      await expect(service.evaluatePurchaseApproval(validInput)).rejects.toThrow(
        goRulesError
      );
    });

    it('should wrap generic errors in GoRulesException', async () => {
      const genericError = new Error('Network error');
      goRulesService.executeRule.mockRejectedValue(genericError);

      await expect(service.evaluatePurchaseApproval(validInput)).rejects.toThrow(
        GoRulesException
      );
    });
  });

  describe('assessSupplierRisk', () => {
    const validInput = {
      supplierId: 'SUP-001',
      supplierName: 'Reliable Components Ltd',
      country: 'Germany',
      creditRating: 'A',
      yearsInBusiness: 15,
      previousOrderCount: 25,
      averageDeliveryTime: 7,
      qualityScore: 92,
      complianceCertifications: ['ISO9001', 'ISO14001'],
    };

    const mockResult = {
      riskLevel: 'low' as const,
      riskScore: 15,
      riskFactors: [],
      recommendations: ['Continue partnership'],
      approved: true,
      requiresReview: false,
    };

    it('should assess supplier risk successfully', async () => {
      goRulesService.executeRule.mockResolvedValue({
        result: mockResult,
        performance: { executionTime: 200, networkTime: 75, totalTime: 275 },
        metadata: { id: 'supplier-risk-assessment', name: 'Supplier Risk', version: '1.0.0' },
      });

      const result = await service.assessSupplierRisk(validInput);

      expect(result).toEqual(mockResult);
      expect(goRulesService.executeRule).toHaveBeenCalledWith(
        'supplier-risk-assessment',
        validInput,
        { timeout: 15000, trace: true }
      );
    });

    it('should validate input and throw error for empty supplier ID', async () => {
      const invalidInput = { ...validInput, supplierId: '' };

      await expect(service.assessSupplierRisk(invalidInput)).rejects.toThrow(
        GoRulesException
      );
    });

    it('should validate input and throw error for negative years in business', async () => {
      const invalidInput = { ...validInput, yearsInBusiness: -1 };

      await expect(service.assessSupplierRisk(invalidInput)).rejects.toThrow(
        GoRulesException
      );
    });

    it('should validate input and throw error for invalid quality score', async () => {
      const invalidInput = { ...validInput, qualityScore: 150 };

      await expect(service.assessSupplierRisk(invalidInput)).rejects.toThrow(
        GoRulesException
      );
    });
  });

  describe('calculatePricing', () => {
    const validInput = {
      basePrice: 100,
      quantity: 50,
      customerTier: 'gold' as const,
      productCategory: 'electronics',
      seasonalFactor: 1.1,
      promotionCode: 'SUMMER2024',
      contractDiscount: 0.05,
    };

    const mockResult = {
      finalPrice: 4275,
      originalPrice: 5000,
      totalDiscount: 725,
      appliedDiscounts: [
        { type: 'tier', amount: 250, percentage: 5, reason: 'Gold tier discount' },
        { type: 'volume', amount: 200, percentage: 4, reason: 'Volume discount' },
        { type: 'promotion', amount: 275, percentage: 5.5, reason: 'Summer promotion' },
      ],
      priceBreakdown: {
        basePrice: 5000,
        quantityDiscount: 200,
        tierDiscount: 250,
        seasonalAdjustment: 0,
        promotionDiscount: 275,
        contractDiscount: 0,
      },
    };

    it('should calculate pricing successfully', async () => {
      goRulesService.executeRule.mockResolvedValue({
        result: mockResult,
        performance: { executionTime: 120, networkTime: 40, totalTime: 160 },
        metadata: { id: 'pricing-rules', name: 'Pricing Rules', version: '1.0.0' },
      });

      const result = await service.calculatePricing(validInput);

      expect(result).toEqual(mockResult);
      expect(goRulesService.executeRule).toHaveBeenCalledWith(
        'pricing-rules',
        validInput,
        { timeout: 8000, trace: true }
      );
    });

    it('should validate input and throw error for invalid base price', async () => {
      const invalidInput = { ...validInput, basePrice: 0 };

      await expect(service.calculatePricing(invalidInput)).rejects.toThrow(
        GoRulesException
      );
    });

    it('should validate input and throw error for invalid customer tier', async () => {
      const invalidInput = { ...validInput, customerTier: 'invalid' as any };

      await expect(service.calculatePricing(invalidInput)).rejects.toThrow(
        GoRulesException
      );
    });

    it('should validate input and throw error for invalid seasonal factor', async () => {
      const invalidInput = { ...validInput, seasonalFactor: 5.0 };

      await expect(service.calculatePricing(invalidInput)).rejects.toThrow(
        GoRulesException
      );
    });
  });

  describe('executeBatchRules', () => {
    const batchRequests = [
      {
        type: 'purchase-approval' as const,
        data: {
          amount: 5000,
          department: 'Marketing',
          requestedBy: 'jane.smith@company.com',
          urgency: 'low' as const,
          category: 'advertising',
        },
        id: 'req-001',
      },
      {
        type: 'pricing' as const,
        data: {
          basePrice: 200,
          quantity: 10,
          customerTier: 'silver' as const,
          productCategory: 'office-supplies',
        },
        id: 'req-002',
      },
    ];

    it('should execute batch rules successfully', async () => {
      const mockBatchResults = [
        {
          executionId: 'req-001',
          ruleId: 'purchase-approval',
          result: { decision: { approved: true }, appliedRules: ['purchase-approval'], warnings: [] },
        },
        {
          executionId: 'req-002',
          ruleId: 'pricing-rules',
          result: { decision: { finalPrice: 1800 }, appliedRules: ['pricing-rules'], warnings: [] },
        },
      ];

      goRulesService.executeBatch.mockResolvedValue(mockBatchResults);

      const results = await service.executeBatchRules(batchRequests);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(goRulesService.executeBatch).toHaveBeenCalled();
    });

    it('should handle batch execution with some failures', async () => {
      const mockBatchResults = [
        {
          executionId: 'req-001',
          ruleId: 'purchase-approval',
          result: { decision: { approved: true }, appliedRules: ['purchase-approval'], warnings: [] },
        },
        {
          executionId: 'req-002',
          ruleId: 'pricing-rules',
          result: { decision: null, appliedRules: [], warnings: [] },
          error: { code: 'RULE_NOT_FOUND', message: 'Rule not found' },
        },
      ];

      goRulesService.executeBatch.mockResolvedValue(mockBatchResults);

      const results = await service.executeBatchRules(batchRequests);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toBe('Rule not found');
    });
  });

  describe('getRuleStatistics', () => {
    it('should get rule statistics successfully', async () => {
      const mockExecutionStats = {
        'purchase-approval': { count: 10, averageTime: 150, errorRate: 0.1 },
        'pricing-rules': { count: 25, averageTime: 120, errorRate: 0.04 },
      };

      const mockCircuitBreakerStats = {
        'purchase-approval': { state: 'CLOSED', failures: 0 },
        'pricing-rules': { state: 'CLOSED', failures: 1 },
      };

      goRulesService.getExecutionStatistics.mockReturnValue(mockExecutionStats);
      goRulesService.getCircuitBreakerStatistics.mockReturnValue(mockCircuitBreakerStats);

      const result = await service.getRuleStatistics();

      expect(result.executionStats).toEqual(mockExecutionStats);
      expect(result.circuitBreakerStats).toEqual(mockCircuitBreakerStats);
      expect(result.recentExecutions).toBe(35); // 10 + 25
    });

    it('should handle errors when getting statistics', async () => {
      goRulesService.getExecutionStatistics.mockImplementation(() => {
        throw new Error('Statistics not available');
      });

      await expect(service.getRuleStatistics()).rejects.toThrow(GoRulesException);
    });
  });
});