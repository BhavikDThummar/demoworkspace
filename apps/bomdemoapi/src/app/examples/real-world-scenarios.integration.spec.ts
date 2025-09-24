import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { GoRulesModule } from '@org/gorules';
import { BusinessRulesController } from './business-rules.controller';
import { BusinessRulesService } from './business-rules.service';
import { SimpleRulesController } from './simple-rules.controller';
import { SimpleRulesService } from './simple-rules.service';

describe('Real-World Scenarios (Integration)', () => {
  let app: INestApplication;
  let businessRulesService: BusinessRulesService;
  let simpleRulesService: SimpleRulesService;

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
              GORULES_TIMEOUT: '30000',
              GORULES_RETRY_ATTEMPTS: '3',
            }),
          ],
        }),
        GoRulesModule.forRootAsync({
          useFactory: () => ({
            apiUrl: 'https://test.gorules.io',
            apiKey: 'test-api-key',
            projectId: 'test-project-id',
            enableLogging: true,
            timeout: 30000,
            retryAttempts: 3,
          }),
        }),
      ],
      controllers: [BusinessRulesController, SimpleRulesController],
      providers: [BusinessRulesService, SimpleRulesService],
    }).compile();

    app = moduleFixture.createNestApplication();
    businessRulesService = moduleFixture.get<BusinessRulesService>(BusinessRulesService);
    simpleRulesService = moduleFixture.get<SimpleRulesService>(SimpleRulesService);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Procurement Workflow Scenario', () => {
    it('should handle complete procurement approval workflow', async () => {
      // Step 1: Assess supplier risk
      const supplierRiskRequest = {
        supplierId: 'SUP-TECH-001',
        supplierName: 'TechCorp Solutions',
        country: 'United States',
        creditRating: 'A+',
        yearsInBusiness: 12,
        previousOrderCount: 15,
        averageDeliveryTime: 5,
        qualityScore: 94,
        complianceCertifications: ['ISO9001', 'ISO27001', 'SOC2'],
      };

      const mockSupplierRisk = {
        riskLevel: 'low' as const,
        riskScore: 12,
        riskFactors: [],
        recommendations: ['Approved for partnership', 'Consider preferred supplier status'],
        approved: true,
        requiresReview: false,
      };

      jest.spyOn(businessRulesService, 'assessSupplierRisk').mockResolvedValue(mockSupplierRisk);

      const supplierResponse = await request(app.getHttpServer())
        .post('/business-rules/supplier-risk')
        .send(supplierRiskRequest)
        .expect(201);

      expect(supplierResponse.body.data.approved).toBe(true);
      expect(supplierResponse.body.data.riskLevel).toBe('low');

      // Step 2: Calculate pricing for the purchase
      const pricingRequest = {
        basePrice: 1500,
        quantity: 25,
        customerTier: 'gold',
        productCategory: 'software-licenses',
        seasonalFactor: 1.0,
        contractDiscount: 0.08,
      };

      const mockPricing = {
        finalPrice: 32625,
        originalPrice: 37500,
        totalDiscount: 4875,
        appliedDiscounts: [
          { type: 'tier', amount: 1875, percentage: 5, reason: 'Gold tier discount' },
          { type: 'volume', amount: 1500, percentage: 4, reason: 'Volume discount (25+ units)' },
          { type: 'contract', amount: 1500, percentage: 4, reason: 'Contract discount' },
        ],
        priceBreakdown: {
          basePrice: 37500,
          quantityDiscount: 1500,
          tierDiscount: 1875,
          seasonalAdjustment: 0,
          promotionDiscount: 0,
          contractDiscount: 1500,
        },
      };

      jest.spyOn(businessRulesService, 'calculatePricing').mockResolvedValue(mockPricing);

      const pricingResponse = await request(app.getHttpServer())
        .post('/business-rules/pricing')
        .send(pricingRequest)
        .expect(201);

      expect(pricingResponse.body.data.finalPrice).toBe(32625);
      expect(pricingResponse.body.data.appliedDiscounts).toHaveLength(3);

      // Step 3: Request purchase approval
      const purchaseApprovalRequest = {
        amount: 32625, // Use calculated price
        department: 'IT',
        requestedBy: 'sarah.johnson@company.com',
        urgency: 'medium',
        category: 'software-licenses',
        supplier: 'TechCorp Solutions',
        justification: 'Annual software license renewal for development team productivity tools',
      };

      const mockApproval = {
        approved: true,
        approvalLevel: 'manager' as const,
        requiredApprovers: ['it-manager@company.com'],
        conditions: [
          'Budget available in IT department',
          'Supplier risk assessment passed',
          'Pricing within acceptable range',
        ],
        reason: 'Standard approval for established supplier with good pricing',
      };

      jest.spyOn(businessRulesService, 'evaluatePurchaseApproval').mockResolvedValue(mockApproval);

      const approvalResponse = await request(app.getHttpServer())
        .post('/business-rules/purchase-approval')
        .send(purchaseApprovalRequest)
        .expect(201);

      expect(approvalResponse.body.data.approved).toBe(true);
      expect(approvalResponse.body.data.approvalLevel).toBe('manager');

      // Verify the complete workflow
      expect(supplierResponse.body.data.approved).toBe(true);
      expect(pricingResponse.body.data.finalPrice).toBeLessThan(
        pricingResponse.body.data.originalPrice,
      );
      expect(approvalResponse.body.data.approved).toBe(true);
    });

    it('should handle high-risk supplier scenario', async () => {
      // High-risk supplier assessment
      const highRiskSupplierRequest = {
        supplierId: 'SUP-RISK-001',
        supplierName: 'Questionable Components Inc',
        country: 'Unknown',
        creditRating: 'C',
        yearsInBusiness: 2,
        previousOrderCount: 1,
        averageDeliveryTime: 25,
        qualityScore: 45,
        complianceCertifications: [],
      };

      const mockHighRiskAssessment = {
        riskLevel: 'high' as const,
        riskScore: 78,
        riskFactors: [
          'Low credit rating',
          'Limited business history',
          'Poor delivery performance',
          'Low quality score',
          'No compliance certifications',
        ],
        recommendations: [
          'Require additional documentation',
          'Consider alternative suppliers',
          'Implement enhanced monitoring',
          'Require payment terms adjustment',
        ],
        approved: false,
        requiresReview: true,
      };

      jest
        .spyOn(businessRulesService, 'assessSupplierRisk')
        .mockResolvedValue(mockHighRiskAssessment);

      const response = await request(app.getHttpServer())
        .post('/business-rules/supplier-risk')
        .send(highRiskSupplierRequest)
        .expect(201);

      expect(response.body.data.approved).toBe(false);
      expect(response.body.data.riskLevel).toBe('high');
      expect(response.body.data.requiresReview).toBe(true);
      expect(response.body.data.riskFactors.length).toBeGreaterThan(0);
    });
  });

  describe('Batch Processing Scenario', () => {
    it('should handle mixed batch processing efficiently', async () => {
      const batchRequest = {
        requests: [
          {
            type: 'purchase-approval',
            id: 'batch-001',
            data: {
              amount: 5000,
              department: 'Marketing',
              requestedBy: 'marketing.lead@company.com',
              urgency: 'low',
              category: 'advertising',
            },
          },
          {
            type: 'supplier-risk',
            id: 'batch-002',
            data: {
              supplierId: 'SUP-BATCH-001',
              supplierName: 'Batch Test Supplier',
              country: 'Canada',
              creditRating: 'B+',
              yearsInBusiness: 8,
              previousOrderCount: 12,
              averageDeliveryTime: 10,
              qualityScore: 78,
              complianceCertifications: ['ISO9001'],
            },
          },
          {
            type: 'pricing',
            id: 'batch-003',
            data: {
              basePrice: 250,
              quantity: 100,
              customerTier: 'silver',
              productCategory: 'office-supplies',
            },
          },
        ],
      };

      const mockBatchResults = [
        {
          id: 'batch-001',
          type: 'purchase-approval',
          success: true,
          result: { approved: true, approvalLevel: 'auto' },
          executionTime: 150,
        },
        {
          id: 'batch-002',
          type: 'supplier-risk',
          success: true,
          result: { riskLevel: 'medium', approved: true },
          executionTime: 200,
        },
        {
          id: 'batch-003',
          type: 'pricing',
          success: true,
          result: { finalPrice: 22500, totalDiscount: 2500 },
          executionTime: 120,
        },
      ];

      jest.spyOn(businessRulesService, 'executeBatchRules').mockResolvedValue(mockBatchResults);

      const response = await request(app.getHttpServer())
        .post('/business-rules/batch')
        .send(batchRequest)
        .expect(201);

      expect(response.body.data.results).toHaveLength(3);
      expect(response.body.data.summary.successful).toBe(3);
      expect(response.body.data.summary.failed).toBe(0);

      // Verify each result
      const results = response.body.data.results;
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(results[2].success).toBe(true);
    });

    it('should handle partial batch failures gracefully', async () => {
      const batchRequest = {
        requests: [
          {
            type: 'purchase-approval',
            id: 'fail-001',
            data: {
              amount: 1000000, // Very high amount that might fail
              department: 'IT',
              requestedBy: 'test@company.com',
              urgency: 'critical',
              category: 'emergency',
            },
          },
          {
            type: 'pricing',
            id: 'success-001',
            data: {
              basePrice: 100,
              quantity: 5,
              customerTier: 'bronze',
              productCategory: 'basic',
            },
          },
        ],
      };

      const mockBatchResults = [
        {
          id: 'fail-001',
          type: 'purchase-approval',
          success: false,
          error: 'Amount exceeds maximum approval limit',
        },
        {
          id: 'success-001',
          type: 'pricing',
          success: true,
          result: { finalPrice: 475, totalDiscount: 25 },
          executionTime: 90,
        },
      ];

      jest.spyOn(businessRulesService, 'executeBatchRules').mockResolvedValue(mockBatchResults);

      const response = await request(app.getHttpServer())
        .post('/business-rules/batch')
        .send(batchRequest)
        .expect(201);

      expect(response.body.data.summary.successful).toBe(1);
      expect(response.body.data.summary.failed).toBe(1);
      expect(response.body.data.results[0].success).toBe(false);
      expect(response.body.data.results[1].success).toBe(true);
    });
  });

  describe('Performance and Monitoring Scenario', () => {
    it('should provide comprehensive statistics after multiple operations', async () => {
      // Simulate multiple operations
      const operations = [
        () => request(app.getHttpServer()).get('/business-rules/health'),
        () => request(app.getHttpServer()).get('/simple-rules/health'),
        () => request(app.getHttpServer()).get('/business-rules/examples'),
        () => request(app.getHttpServer()).get('/simple-rules/examples'),
      ];

      // Execute operations
      await Promise.all(operations.map((op) => op()));

      // Mock statistics
      const mockStatistics = {
        executionStats: {
          'purchase-approval': { count: 15, averageTime: 180, errorRate: 0.067 },
          'supplier-risk-assessment': { count: 8, averageTime: 220, errorRate: 0.125 },
          'pricing-rules': { count: 22, averageTime: 140, errorRate: 0.045 },
        },
        circuitBreakerStats: {
          'purchase-approval': { state: 'CLOSED', failures: 1 },
          'supplier-risk-assessment': { state: 'CLOSED', failures: 1 },
          'pricing-rules': { state: 'CLOSED', failures: 1 },
        },
        recentExecutions: 45,
      };

      jest.spyOn(businessRulesService, 'getRuleStatistics').mockResolvedValue(mockStatistics);

      const response = await request(app.getHttpServer())
        .get('/business-rules/statistics')
        .expect(200);

      expect(response.body.data.executionStats).toBeDefined();
      expect(response.body.data.circuitBreakerStats).toBeDefined();
      expect(response.body.data.recentExecutions).toBeGreaterThanOrEqual(0);

      // Verify statistics structure
      const stats = response.body.data.executionStats;
      Object.values(stats).forEach((ruleStat: any) => {
        expect(ruleStat).toHaveProperty('count');
        expect(ruleStat).toHaveProperty('averageTime');
        expect(ruleStat).toHaveProperty('errorRate');
      });
    });
  });

  describe('Error Recovery Scenario', () => {
    it('should demonstrate graceful error handling and recovery', async () => {
      // Test error handling with the demo endpoint
      const errorDemoRequest = {
        value: 999,
        category: 'error-simulation',
      };

      const mockErrorResult = {
        success: false,
        error: {
          code: 'TIMEOUT',
          message: 'Rule execution timed out after 5000ms',
          retryable: true,
          details: { timeout: 5000, ruleId: 'error-demo-rule' },
        },
      };

      jest.spyOn(simpleRulesService, 'demonstrateErrorHandling').mockResolvedValue(mockErrorResult);

      const response = await request(app.getHttpServer())
        .post('/simple-rules/demo-error-handling/timeout-rule')
        .send(errorDemoRequest)
        .expect(201);

      expect(response.body.data.success).toBe(false);
      expect(response.body.data.error.retryable).toBe(true);
      expect(response.body.data.error.code).toBe('TIMEOUT');

      // Simulate recovery - retry the same operation
      const mockRecoveryResult = {
        success: true,
        result: { result: 'recovered-successfully', score: 85, recommendations: [] },
      };

      jest
        .spyOn(simpleRulesService, 'demonstrateErrorHandling')
        .mockResolvedValue(mockRecoveryResult);

      const recoveryResponse = await request(app.getHttpServer())
        .post('/simple-rules/demo-error-handling/timeout-rule')
        .send(errorDemoRequest)
        .expect(201);

      expect(recoveryResponse.body.data.success).toBe(true);
      expect(recoveryResponse.body.data.result).toBeDefined();
    });
  });

  describe('Complex Business Logic Scenario', () => {
    it('should handle complex multi-step business decision process', async () => {
      // Scenario: Large enterprise purchase requiring multiple approvals
      const enterprisePurchaseRequest = {
        amount: 250000,
        department: 'Engineering',
        requestedBy: 'cto@company.com',
        urgency: 'high',
        category: 'infrastructure',
        supplier: 'Enterprise Solutions Corp',
        justification:
          'Critical infrastructure upgrade for scalability and performance improvements',
      };

      const mockEnterpriseApproval = {
        approved: false, // Requires higher approval
        approvalLevel: 'executive' as const,
        requiredApprovers: ['cto@company.com', 'cfo@company.com', 'ceo@company.com'],
        conditions: [
          'Board approval required for amounts > $200,000',
          'Detailed ROI analysis required',
          'Alternative vendor evaluation required',
          'Budget impact assessment required',
        ],
        reason: 'Amount exceeds departmental approval limits',
      };

      jest
        .spyOn(businessRulesService, 'evaluatePurchaseApproval')
        .mockResolvedValue(mockEnterpriseApproval);

      const response = await request(app.getHttpServer())
        .post('/business-rules/purchase-approval')
        .send(enterprisePurchaseRequest)
        .expect(201);

      expect(response.body.data.approved).toBe(false);
      expect(response.body.data.approvalLevel).toBe('executive');
      expect(response.body.data.requiredApprovers).toHaveLength(3);
      expect(response.body.data.conditions.length).toBeGreaterThan(0);
    });
  });

  describe('Data Validation and Edge Cases', () => {
    it('should handle edge case values appropriately', async () => {
      // Test with minimum valid values
      const minimalRequest = {
        value: 0.01, // Minimum positive value
        category: 'a', // Minimum length string
      };

      const mockMinimalResult = {
        result: 'minimal-input-processed',
        score: 1,
        recommendations: ['Input at minimum threshold'],
      };

      jest.spyOn(simpleRulesService, 'executeSimpleRule').mockResolvedValue(mockMinimalResult);

      const response = await request(app.getHttpServer())
        .post('/simple-rules/execute')
        .send(minimalRequest)
        .expect(201);

      expect(response.body.data.result).toBe('minimal-input-processed');

      // Test with maximum reasonable values
      const maximalRequest = {
        value: 999999.99,
        category: 'maximum-test-category-with-long-name',
        metadata: {
          largeArray: Array(100).fill('data'),
          complexObject: {
            nested: {
              deeply: {
                value: 'deep-value',
              },
            },
          },
        },
      };

      const mockMaximalResult = {
        result: 'maximal-input-processed',
        score: 100,
        recommendations: ['Input at maximum threshold'],
      };

      jest.spyOn(simpleRulesService, 'executeSimpleRule').mockResolvedValue(mockMaximalResult);

      const maxResponse = await request(app.getHttpServer())
        .post('/simple-rules/execute')
        .send(maximalRequest)
        .expect(201);

      expect(maxResponse.body.data.result).toBe('maximal-input-processed');
    });
  });

  describe('Concurrent Operations Scenario', () => {
    it('should handle high concurrency gracefully', async () => {
      // Simulate high concurrent load
      const concurrentRequests = Array(10)
        .fill(null)
        .map((_, index) => ({
          value: index * 10,
          category: `concurrent-test-${index}`,
        }));

      const mockResult = {
        result: 'concurrent-success',
        score: 80,
        recommendations: [],
      };

      jest.spyOn(simpleRulesService, 'executeSimpleRule').mockResolvedValue(mockResult);

      // Execute all requests concurrently
      const promises = concurrentRequests.map((request) =>
        request(app.getHttpServer()).post('/simple-rules/execute').send(request),
      );

      const responses = await Promise.all(promises);

      // All requests should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });
    });
  });
});
