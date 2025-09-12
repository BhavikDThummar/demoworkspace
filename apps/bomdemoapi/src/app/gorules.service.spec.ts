import { Test, TestingModule } from '@nestjs/testing';
import { BomDemoGoRulesService } from './gorules.service';
import { GoRulesService, GoRulesException, GoRulesErrorCode } from '@org/gorules';

describe('BomDemoGoRulesService', () => {
  let service: BomDemoGoRulesService;
  let goRulesService: jest.Mocked<GoRulesService>;

  beforeEach(async () => {
    const mockGoRulesService = {
      executeRule: jest.fn(),
      getExecutionStatistics: jest.fn(),
      getCircuitBreakerStatistics: jest.fn(),
      resetAllCircuitBreakers: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BomDemoGoRulesService,
        { provide: GoRulesService, useValue: mockGoRulesService },
      ],
    }).compile();

    service = module.get<BomDemoGoRulesService>(BomDemoGoRulesService);
    goRulesService = module.get(GoRulesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateBom', () => {
    const mockBomData = {
      items: [
        {
          id: 'item1',
          name: 'Test Item',
          quantity: 10,
          unitPrice: 100,
          category: 'electronics',
        },
      ],
      totalValue: 1000,
      supplier: 'Test Supplier',
      requestedBy: 'test@example.com',
    };

    it('should validate BOM successfully', async () => {
      const mockRuleResult = {
        result: {
          isValid: true,
          recommendations: ['Consider bulk discount'],
          errors: [],
        },
      };

      goRulesService.executeRule.mockResolvedValue(mockRuleResult);

      const result = await service.validateBom(mockBomData);

      expect(result.isValid).toBe(true);
      expect(result.recommendations).toEqual(['Consider bulk discount']);
      expect(result.errors).toEqual([]);
      expect(goRulesService.executeRule).toHaveBeenCalledWith(
        'bom-validation',
        mockBomData,
        { trace: true, timeout: 10000 }
      );
    });

    it('should handle GoRules exceptions', async () => {
      const goRulesError = new GoRulesException(
        GoRulesErrorCode.RULE_NOT_FOUND,
        'Rule not found'
      );

      goRulesService.executeRule.mockRejectedValue(goRulesError);

      await expect(service.validateBom(mockBomData)).rejects.toThrow(GoRulesException);
    });

    it('should wrap generic errors in GoRulesException', async () => {
      const genericError = new Error('Network error');
      goRulesService.executeRule.mockRejectedValue(genericError);

      await expect(service.validateBom(mockBomData)).rejects.toThrow(GoRulesException);
    });
  });

  describe('calculatePricing', () => {
    const mockPricingData = {
      items: [
        {
          id: 'item1',
          basePrice: 100,
          quantity: 10,
          category: 'electronics',
        },
      ],
      customerTier: 'premium' as const,
      orderVolume: 1000,
    };

    it('should calculate pricing successfully', async () => {
      const mockRuleResult = {
        result: {
          totalPrice: 950,
          itemPrices: [
            {
              id: 'item1',
              originalPrice: 1000,
              finalPrice: 950,
              discount: 50,
              discountReason: 'Premium customer discount',
            },
          ],
          appliedDiscounts: ['PREMIUM_5_PERCENT'],
        },
      };

      goRulesService.executeRule.mockResolvedValue(mockRuleResult);

      const result = await service.calculatePricing(mockPricingData);

      expect(result.totalPrice).toBe(950);
      expect(result.itemPrices).toHaveLength(1);
      expect(result.appliedDiscounts).toEqual(['PREMIUM_5_PERCENT']);
      expect(goRulesService.executeRule).toHaveBeenCalledWith(
        'bom-pricing',
        mockPricingData,
        { trace: true, timeout: 15000 }
      );
    });
  });

  describe('assessSupplierRisk', () => {
    const mockSupplierData = {
      supplierId: 'supplier1',
      name: 'Test Supplier',
      location: 'US',
      creditRating: 'A',
      deliveryHistory: {
        onTimeDeliveries: 95,
        totalDeliveries: 100,
        averageDelay: 1.2,
      },
      qualityMetrics: {
        defectRate: 0.01,
        returnRate: 0.005,
        certifications: ['ISO9001', 'ISO14001'],
      },
      financialMetrics: {
        revenue: 10000000,
        profitMargin: 0.15,
        debtToEquity: 0.3,
      },
    };

    it('should assess supplier risk successfully', async () => {
      const mockRuleResult = {
        result: {
          riskLevel: 'low',
          riskScore: 15,
          riskFactors: [],
          recommendations: ['Continue partnership'],
          approvalRequired: false,
        },
      };

      goRulesService.executeRule.mockResolvedValue(mockRuleResult);

      const result = await service.assessSupplierRisk(mockSupplierData);

      expect(result.riskLevel).toBe('low');
      expect(result.riskScore).toBe(15);
      expect(result.approvalRequired).toBe(false);
      expect(goRulesService.executeRule).toHaveBeenCalledWith(
        'supplier-risk-assessment',
        mockSupplierData,
        { trace: true, timeout: 12000 }
      );
    });
  });

  describe('determineApprovalWorkflow', () => {
    const mockApprovalData = {
      requestType: 'purchase' as const,
      amount: 50000,
      requestedBy: 'john.doe@company.com',
      department: 'procurement',
      urgency: 'medium' as const,
      riskLevel: 'low' as const,
    };

    it('should determine approval workflow successfully', async () => {
      const mockRuleResult = {
        result: {
          workflowType: 'standard',
          approvers: [
            { role: 'manager', level: 1, required: true },
            { role: 'director', level: 2, required: true },
          ],
          estimatedDuration: 48,
          autoApprove: false,
          conditions: ['Budget available', 'Supplier approved'],
        },
      };

      goRulesService.executeRule.mockResolvedValue(mockRuleResult);

      const result = await service.determineApprovalWorkflow(mockApprovalData);

      expect(result.workflowType).toBe('standard');
      expect(result.approvers).toHaveLength(2);
      expect(result.autoApprove).toBe(false);
      expect(goRulesService.executeRule).toHaveBeenCalledWith(
        'approval-workflow',
        mockApprovalData,
        { trace: true, timeout: 8000 }
      );
    });
  });

  describe('utility methods', () => {
    it('should get execution statistics', () => {
      const mockStats = {
        totalExecutions: 100,
        successfulExecutions: 95,
        failedExecutions: 5,
        averageExecutionTime: 250,
      };

      goRulesService.getExecutionStatistics.mockReturnValue(mockStats);

      const result = service.getExecutionStatistics();

      expect(result).toEqual(mockStats);
      expect(goRulesService.getExecutionStatistics).toHaveBeenCalled();
    });

    it('should get circuit breaker statistics', () => {
      const mockStats = {
        'bom-validation': { state: 'CLOSED', failures: 0 },
        'bom-pricing': { state: 'CLOSED', failures: 0 },
      };

      goRulesService.getCircuitBreakerStatistics.mockReturnValue(mockStats);

      const result = service.getCircuitBreakerStatistics();

      expect(result).toEqual(mockStats);
      expect(goRulesService.getCircuitBreakerStatistics).toHaveBeenCalled();
    });

    it('should reset circuit breakers', () => {
      goRulesService.resetAllCircuitBreakers.mockReturnValue(undefined);

      service.resetCircuitBreakers();

      expect(goRulesService.resetAllCircuitBreakers).toHaveBeenCalled();
    });
  });
});