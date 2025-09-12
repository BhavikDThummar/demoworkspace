import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { GoRulesModule } from '@org/gorules';
import { BusinessRulesController } from './business-rules.controller';
import { BusinessRulesService } from './business-rules.service';

describe('BusinessRulesController (Integration)', () => {
  let app: INestApplication;
  let businessRulesService: BusinessRulesService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              GORULES_API_URL: 'https://test.gorules.io',
              GORULES_API_KEY: 'test-api-key',
              GORULES_PROJECT_ID: 'test-project-id',
              GORULES_ENABLE_LOGGING: 'true',
              GORULES_TIMEOUT: '10000',
              GORULES_RETRY_ATTEMPTS: '2',
            }),
          ],
        }),
        GoRulesModule.forRootAsync({
          useFactory: () => ({
            apiUrl: 'https://test.gorules.io',
            apiKey: 'test-api-key',
            projectId: 'test-project-id',
            enableLogging: true,
            timeout: 10000,
            retryAttempts: 2,
          }),
        }),
      ],
      controllers: [BusinessRulesController],
      providers: [BusinessRulesService],
    }).compile();

    app = moduleFixture.createNestApplication();
    businessRulesService = moduleFixture.get<BusinessRulesService>(BusinessRulesService);
    
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /business-rules/purchase-approval', () => {
    const validPurchaseRequest = {
      amount: 15000,
      department: 'IT',
      requestedBy: 'john.doe@company.com',
      urgency: 'medium',
      category: 'software',
      supplier: 'TechCorp Inc',
      justification: 'New development tools for the team',
    };

    it('should handle valid purchase approval request', async () => {
      // Mock the service method to avoid actual API calls
      const mockResult = {
        approved: true,
        approvalLevel: 'manager' as const,
        requiredApprovers: ['manager@company.com'],
        conditions: ['Budget available'],
        reason: 'Within department budget',
      };

      jest.spyOn(businessRulesService, 'evaluatePurchaseApproval')
        .mockResolvedValue(mockResult);

      const response = await request(app.getHttpServer())
        .post('/business-rules/purchase-approval')
        .send(validPurchaseRequest)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockResult);
      expect(response.body.timestamp).toBeDefined();
    });

    it('should validate required fields', async () => {
      const invalidRequest = {
        // Missing required fields
        amount: 15000,
        department: 'IT',
        // requestedBy is missing
        urgency: 'medium',
        category: 'software',
      };

      const response = await request(app.getHttpServer())
        .post('/business-rules/purchase-approval')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.message).toContain('requestedBy');
    });

    it('should validate amount is positive', async () => {
      const invalidRequest = {
        ...validPurchaseRequest,
        amount: 0, // Invalid amount
      };

      const response = await request(app.getHttpServer())
        .post('/business-rules/purchase-approval')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.message).toContain('amount');
    });

    it('should validate urgency enum', async () => {
      const invalidRequest = {
        ...validPurchaseRequest,
        urgency: 'invalid-urgency', // Invalid enum value
      };

      const response = await request(app.getHttpServer())
        .post('/business-rules/purchase-approval')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.message).toContain('urgency');
    });

    it('should handle service errors gracefully', async () => {
      jest.spyOn(businessRulesService, 'evaluatePurchaseApproval')
        .mockRejectedValue(new Error('Service unavailable'));

      const response = await request(app.getHttpServer())
        .post('/business-rules/purchase-approval')
        .send(validPurchaseRequest)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('POST /business-rules/supplier-risk', () => {
    const validSupplierRequest = {
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

    it('should handle valid supplier risk assessment request', async () => {
      const mockResult = {
        riskLevel: 'low' as const,
        riskScore: 15,
        riskFactors: [],
        recommendations: ['Continue partnership'],
        approved: true,
        requiresReview: false,
      };

      jest.spyOn(businessRulesService, 'assessSupplierRisk')
        .mockResolvedValue(mockResult);

      const response = await request(app.getHttpServer())
        .post('/business-rules/supplier-risk')
        .send(validSupplierRequest)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockResult);
    });

    it('should validate quality score range', async () => {
      const invalidRequest = {
        ...validSupplierRequest,
        qualityScore: 150, // Invalid score > 100
      };

      const response = await request(app.getHttpServer())
        .post('/business-rules/supplier-risk')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.message).toContain('qualityScore');
    });

    it('should validate years in business is non-negative', async () => {
      const invalidRequest = {
        ...validSupplierRequest,
        yearsInBusiness: -1, // Invalid negative value
      };

      const response = await request(app.getHttpServer())
        .post('/business-rules/supplier-risk')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.message).toContain('yearsInBusiness');
    });
  });

  describe('POST /business-rules/pricing', () => {
    const validPricingRequest = {
      basePrice: 100,
      quantity: 50,
      customerTier: 'gold',
      productCategory: 'electronics',
      seasonalFactor: 1.1,
      promotionCode: 'SUMMER2024',
      contractDiscount: 0.05,
    };

    it('should handle valid pricing calculation request', async () => {
      const mockResult = {
        finalPrice: 4275,
        originalPrice: 5000,
        totalDiscount: 725,
        appliedDiscounts: [
          { type: 'tier', amount: 250, percentage: 5, reason: 'Gold tier discount' },
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

      jest.spyOn(businessRulesService, 'calculatePricing')
        .mockResolvedValue(mockResult);

      const response = await request(app.getHttpServer())
        .post('/business-rules/pricing')
        .send(validPricingRequest)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockResult);
    });

    it('should validate customer tier enum', async () => {
      const invalidRequest = {
        ...validPricingRequest,
        customerTier: 'invalid-tier',
      };

      const response = await request(app.getHttpServer())
        .post('/business-rules/pricing')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.message).toContain('customerTier');
    });

    it('should validate seasonal factor range', async () => {
      const invalidRequest = {
        ...validPricingRequest,
        seasonalFactor: 5.0, // Invalid factor > 3.0
      };

      const response = await request(app.getHttpServer())
        .post('/business-rules/pricing')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.message).toContain('seasonalFactor');
    });
  });

  describe('POST /business-rules/batch', () => {
    const validBatchRequest = {
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
    };

    it('should handle valid batch request', async () => {
      const mockResult = [
        { id: 'req-001', type: 'purchase-approval', success: true, result: { approved: true } },
        { id: 'req-002', type: 'pricing', success: true, result: { finalPrice: 1800 } },
      ];

      jest.spyOn(businessRulesService, 'executeBatchRules')
        .mockResolvedValue(mockResult);

      const response = await request(app.getHttpServer())
        .post('/business-rules/batch')
        .send(validBatchRequest)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.results).toEqual(mockResult);
      expect(response.body.data.summary.total).toBe(2);
      expect(response.body.data.summary.successful).toBe(2);
      expect(response.body.data.summary.failed).toBe(0);
    });

    it('should validate batch request structure', async () => {
      const invalidRequest = {
        requests: [
          {
            type: 'invalid-type', // Invalid type
            data: {},
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/business-rules/batch')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.message).toContain('type');
    });
  });

  describe('GET /business-rules/statistics', () => {
    it('should return rule statistics', async () => {
      const mockStatistics = {
        executionStats: {
          'purchase-approval': { count: 10, averageTime: 150, errorRate: 0.1 },
        },
        circuitBreakerStats: {
          'purchase-approval': { state: 'CLOSED', failures: 0 },
        },
        recentExecutions: 10,
      };

      jest.spyOn(businessRulesService, 'getRuleStatistics')
        .mockResolvedValue(mockStatistics);

      const response = await request(app.getHttpServer())
        .get('/business-rules/statistics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockStatistics);
    });
  });

  describe('GET /business-rules/examples', () => {
    it('should return example requests', async () => {
      const response = await request(app.getHttpServer())
        .get('/business-rules/examples')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.purchaseApproval).toBeDefined();
      expect(response.body.data.supplierRisk).toBeDefined();
      expect(response.body.data.pricing).toBeDefined();
      expect(response.body.data.batch).toBeDefined();
    });
  });

  describe('GET /business-rules/health', () => {
    it('should return healthy status', async () => {
      const mockStatistics = {
        executionStats: {},
        circuitBreakerStats: {},
        recentExecutions: 0,
      };

      jest.spyOn(businessRulesService, 'getRuleStatistics')
        .mockResolvedValue(mockStatistics);

      const response = await request(app.getHttpServer())
        .get('/business-rules/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.status).toBe('healthy');
      expect(response.body.service).toBe('Business Rules');
    });

    it('should return unhealthy status on service error', async () => {
      jest.spyOn(businessRulesService, 'getRuleStatistics')
        .mockRejectedValue(new Error('Service unavailable'));

      const response = await request(app.getHttpServer())
        .get('/business-rules/health')
        .expect(200);

      expect(response.body.success).toBe(false);
      expect(response.body.status).toBe('unhealthy');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON', async () => {
      const response = await request(app.getHttpServer())
        .post('/business-rules/purchase-approval')
        .send('invalid-json')
        .set('Content-Type', 'application/json')
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('should handle missing Content-Type header', async () => {
      const response = await request(app.getHttpServer())
        .post('/business-rules/purchase-approval')
        .send({ amount: 1000 })
        .expect(201); // Should still work with default content type handling

      // The request should be processed (mocked service will handle it)
    });

    it('should handle large request payloads', async () => {
      const largeRequest = {
        amount: 15000,
        department: 'IT',
        requestedBy: 'john.doe@company.com',
        urgency: 'medium',
        category: 'software',
        justification: 'A'.repeat(10000), // Large justification
      };

      jest.spyOn(businessRulesService, 'evaluatePurchaseApproval')
        .mockResolvedValue({
          approved: true,
          approvalLevel: 'manager',
          requiredApprovers: [],
          conditions: [],
          reason: 'Approved',
        });

      const response = await request(app.getHttpServer())
        .post('/business-rules/purchase-approval')
        .send(largeRequest)
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });

  describe('CORS and Headers', () => {
    it('should handle CORS preflight requests', async () => {
      const response = await request(app.getHttpServer())
        .options('/business-rules/purchase-approval')
        .expect(200);

      // CORS headers should be present (if configured)
    });

    it('should return proper content-type headers', async () => {
      const response = await request(app.getHttpServer())
        .get('/business-rules/examples')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });
});