import { Test, TestingModule } from '@nestjs/testing';
import { GoRulesController } from './gorules.controller';
import { BomDemoGoRulesService } from './gorules.service';
import { GoRulesException, GoRulesErrorCode } from '@org/gorules';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('GoRulesController', () => {
  let controller: GoRulesController;
  let service: jest.Mocked<BomDemoGoRulesService>;

  beforeEach(async () => {
    const mockService = {
      validateBom: jest.fn(),
      calculatePricing: jest.fn(),
      assessSupplierRisk: jest.fn(),
      determineApprovalWorkflow: jest.fn(),
      getExecutionStatistics: jest.fn(),
      getCircuitBreakerStatistics: jest.fn(),
      resetCircuitBreakers: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GoRulesController],
      providers: [{ provide: BomDemoGoRulesService, useValue: mockService }],
    }).compile();

    controller = module.get<GoRulesController>(GoRulesController);
    service = module.get(BomDemoGoRulesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
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
      const mockResult = {
        isValid: true,
        validationResults: { status: 'approved' },
        recommendations: ['Consider bulk discount'],
        errors: [],
      };

      service.validateBom.mockResolvedValue(mockResult);

      const result = await controller.validateBom(mockBomData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResult);
      expect(service.validateBom).toHaveBeenCalledWith(mockBomData);
    });

    it('should handle GoRules exceptions', async () => {
      const goRulesError = new GoRulesException(
        GoRulesErrorCode.VALIDATION_ERROR,
        'Invalid BOM data',
        { field: 'totalValue' },
      );

      service.validateBom.mockRejectedValue(goRulesError);

      await expect(controller.validateBom(mockBomData)).rejects.toThrow(HttpException);
    });

    it('should handle generic errors', async () => {
      const genericError = new Error('Unexpected error');
      service.validateBom.mockRejectedValue(genericError);

      await expect(controller.validateBom(mockBomData)).rejects.toThrow(HttpException);
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
      const mockResult = {
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
      };

      service.calculatePricing.mockResolvedValue(mockResult);

      const result = await controller.calculatePricing(mockPricingData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResult);
      expect(service.calculatePricing).toHaveBeenCalledWith(mockPricingData);
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
      const mockResult = {
        riskLevel: 'low' as const,
        riskScore: 15,
        riskFactors: [],
        recommendations: ['Continue partnership'],
        approvalRequired: false,
      };

      service.assessSupplierRisk.mockResolvedValue(mockResult);

      const result = await controller.assessSupplierRisk(mockSupplierData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResult);
      expect(service.assessSupplierRisk).toHaveBeenCalledWith(mockSupplierData);
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
      const mockResult = {
        workflowType: 'standard',
        approvers: [
          { role: 'manager', level: 1, required: true },
          { role: 'director', level: 2, required: true },
        ],
        estimatedDuration: 48,
        autoApprove: false,
        conditions: ['Budget available', 'Supplier approved'],
      };

      service.determineApprovalWorkflow.mockResolvedValue(mockResult);

      const result = await controller.determineApprovalWorkflow(mockApprovalData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResult);
      expect(service.determineApprovalWorkflow).toHaveBeenCalledWith(mockApprovalData);
    });
  });

  describe('getStatistics', () => {
    it('should return statistics successfully', async () => {
      const mockExecutionStats = {
        totalExecutions: 100,
        successfulExecutions: 95,
        failedExecutions: 5,
        averageExecutionTime: 250,
      };

      const mockCircuitBreakerStats = {
        'bom-validation': { state: 'CLOSED', failures: 0 },
        'bom-pricing': { state: 'CLOSED', failures: 0 },
      };

      service.getExecutionStatistics.mockReturnValue(mockExecutionStats);
      service.getCircuitBreakerStatistics.mockReturnValue(mockCircuitBreakerStats);

      const result = await controller.getStatistics();

      expect(result.success).toBe(true);
      expect(result.data.execution).toEqual(mockExecutionStats);
      expect(result.data.circuitBreakers).toEqual(mockCircuitBreakerStats);
    });
  });

  describe('resetCircuitBreakers', () => {
    it('should reset circuit breakers successfully', async () => {
      service.resetCircuitBreakers.mockReturnValue(undefined);

      const result = await controller.resetCircuitBreakers();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Circuit breakers reset successfully');
      expect(service.resetCircuitBreakers).toHaveBeenCalled();
    });
  });

  describe('getHealth', () => {
    it('should return health status', async () => {
      const result = await controller.getHealth();

      expect(result.success).toBe(true);
      expect(result.status).toBe('healthy');
      expect(result.service).toBe('GoRules Integration');
    });
  });
});
