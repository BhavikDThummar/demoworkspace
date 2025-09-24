import { ConfigModule } from '@nestjs/config';

/**
 * Test setup configuration for integration tests
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.GORULES_API_URL = 'https://test.gorules.io';
process.env.GORULES_API_KEY = 'test-api-key';
process.env.GORULES_PROJECT_ID = 'test-project-id';
process.env.GORULES_ENABLE_LOGGING = 'false'; // Disable logging in tests
process.env.GORULES_TIMEOUT = '5000';
process.env.GORULES_RETRY_ATTEMPTS = '1';

// Global test configuration
export const testConfig = {
  gorules: {
    apiUrl: 'https://test.gorules.io',
    apiKey: 'test-api-key',
    projectId: 'test-project-id',
    enableLogging: false,
    timeout: 5000,
    retryAttempts: 1,
  },
};

// Mock console methods to reduce test noise
const originalConsole = { ...console };

beforeAll(() => {
  // Suppress console output during tests unless explicitly needed
  console.log = jest.fn();
  console.info = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  // Restore console methods
  Object.assign(console, originalConsole);
});

// Global test utilities
export const createTestConfigModule = () => {
  return ConfigModule.forRoot({
    isGlobal: true,
    load: [() => testConfig],
  });
};

// Common test data
export const testData = {
  validPurchaseApproval: {
    amount: 15000,
    department: 'IT',
    requestedBy: 'john.doe@company.com',
    urgency: 'medium' as const,
    category: 'software',
    supplier: 'TechCorp Inc',
    justification: 'New development tools for the team',
  },

  validSupplierRisk: {
    supplierId: 'SUP-001',
    supplierName: 'Reliable Components Ltd',
    country: 'Germany',
    creditRating: 'A',
    yearsInBusiness: 15,
    previousOrderCount: 25,
    averageDeliveryTime: 7,
    qualityScore: 92,
    complianceCertifications: ['ISO9001', 'ISO14001'],
  },

  validPricing: {
    basePrice: 100,
    quantity: 50,
    customerTier: 'gold' as const,
    productCategory: 'electronics',
    seasonalFactor: 1.1,
    promotionCode: 'SUMMER2024',
    contractDiscount: 0.05,
  },

  validSimpleRule: {
    value: 42,
    category: 'test',
    metadata: { source: 'test-suite' },
  },
};

// Mock response data
export const mockResponses = {
  purchaseApproval: {
    approved: true,
    approvalLevel: 'manager' as const,
    requiredApprovers: ['manager@company.com'],
    conditions: ['Budget available'],
    reason: 'Within department budget',
  },

  supplierRisk: {
    riskLevel: 'low' as const,
    riskScore: 15,
    riskFactors: [],
    recommendations: ['Continue partnership'],
    approved: true,
    requiresReview: false,
  },

  pricing: {
    finalPrice: 4275,
    originalPrice: 5000,
    totalDiscount: 725,
    appliedDiscounts: [{ type: 'tier', amount: 250, percentage: 5, reason: 'Gold tier discount' }],
    priceBreakdown: {
      basePrice: 5000,
      quantityDiscount: 200,
      tierDiscount: 250,
      seasonalAdjustment: 0,
      promotionDiscount: 275,
      contractDiscount: 0,
    },
  },

  simpleRule: {
    result: 'success',
    score: 85,
    recommendations: ['Continue with current approach'],
  },
};

// Test utilities
export const testUtils = {
  /**
   * Create a delay for testing async operations
   */
  delay: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),

  /**
   * Generate random test data
   */
  generateRandomId: () => `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,

  /**
   * Create test request with random data
   */
  createTestRequest: (base: any, overrides: any = {}) => ({
    ...base,
    ...overrides,
    id: testUtils.generateRandomId(),
  }),

  /**
   * Validate response structure
   */
  validateResponseStructure: (response: any) => {
    expect(response).toHaveProperty('success');
    expect(response).toHaveProperty('timestamp');

    if (response.success) {
      expect(response).toHaveProperty('data');
    } else {
      expect(response).toHaveProperty('error');
    }
  },

  /**
   * Validate error response structure
   */
  validateErrorResponse: (response: any) => {
    expect(response.success).toBe(false);
    expect(response.error).toBeDefined();
    expect(response.error).toHaveProperty('code');
    expect(response.error).toHaveProperty('message');
    expect(response.timestamp).toBeDefined();
  },
};

// Jest custom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidGoRulesResponse(): R;
      toBeValidErrorResponse(): R;
    }
  }
}

// Add custom Jest matchers
expect.extend({
  toBeValidGoRulesResponse(received) {
    const pass =
      received &&
      typeof received === 'object' &&
      typeof received.success === 'boolean' &&
      typeof received.timestamp === 'string' &&
      (received.success ? received.data !== undefined : received.error !== undefined);

    if (pass) {
      return {
        message: () => `expected ${JSON.stringify(received)} not to be a valid GoRules response`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${JSON.stringify(received)} to be a valid GoRules response`,
        pass: false,
      };
    }
  },

  toBeValidErrorResponse(received) {
    const pass =
      received &&
      typeof received === 'object' &&
      received.success === false &&
      received.error &&
      typeof received.error.code === 'string' &&
      typeof received.error.message === 'string' &&
      typeof received.timestamp === 'string';

    if (pass) {
      return {
        message: () => `expected ${JSON.stringify(received)} not to be a valid error response`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${JSON.stringify(received)} to be a valid error response`,
        pass: false,
      };
    }
  },
});
