import { GoRulesConfigService, createGoRulesConfigFromEnv } from './gorules.config.js';
import { GoRulesConfig } from './gorules-config.interface.js';

describe('GoRulesConfigService', () => {
  const validConfig: GoRulesConfig = {
    apiUrl: 'https://test.gorules.io',
    apiKey: 'test-api-key',
    projectId: 'test-project-id',
  };

  describe('constructor', () => {
    it('should create service with valid configuration', () => {
      const service = new GoRulesConfigService(validConfig);
      expect(service).toBeDefined();
    });

    it('should apply default values', () => {
      const service = new GoRulesConfigService(validConfig);
      const config = service.getConfig();
      
      expect(config.timeout).toBe(30000);
      expect(config.retryAttempts).toBe(3);
      expect(config.enableLogging).toBe(false);
    });

    it('should preserve provided values', () => {
      const customConfig: GoRulesConfig = {
        ...validConfig,
        timeout: 5000,
        retryAttempts: 1,
        enableLogging: true,
      };

      const service = new GoRulesConfigService(customConfig);
      const config = service.getConfig();
      
      expect(config.timeout).toBe(5000);
      expect(config.retryAttempts).toBe(1);
      expect(config.enableLogging).toBe(true);
    });

    it('should throw error for missing apiUrl', () => {
      const invalidConfig = { ...validConfig };
      delete (invalidConfig as any).apiUrl;

      expect(() => new GoRulesConfigService(invalidConfig)).toThrow(
        'GoRules configuration validation failed: apiUrl is required'
      );
    });

    it('should throw error for missing apiKey', () => {
      const invalidConfig = { ...validConfig };
      delete (invalidConfig as any).apiKey;

      expect(() => new GoRulesConfigService(invalidConfig)).toThrow(
        'GoRules configuration validation failed: apiKey is required'
      );
    });

    it('should throw error for missing projectId', () => {
      const invalidConfig = { ...validConfig };
      delete (invalidConfig as any).projectId;

      expect(() => new GoRulesConfigService(invalidConfig)).toThrow(
        'GoRules configuration validation failed: projectId is required'
      );
    });

    it('should throw error for invalid timeout', () => {
      const invalidConfig: GoRulesConfig = {
        ...validConfig,
        timeout: -1,
      };

      expect(() => new GoRulesConfigService(invalidConfig)).toThrow(
        'timeout must be between 1 and 300000 milliseconds'
      );
    });

    it('should throw error for invalid retryAttempts', () => {
      const invalidConfig: GoRulesConfig = {
        ...validConfig,
        retryAttempts: -1,
      };

      expect(() => new GoRulesConfigService(invalidConfig)).toThrow(
        'retryAttempts must be between 0 and 10'
      );
    });
  });

  describe('getConfig', () => {
    it('should return a copy of the configuration', () => {
      const service = new GoRulesConfigService(validConfig);
      const config1 = service.getConfig();
      const config2 = service.getConfig();
      
      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2); // Should be different objects
    });
  });
});

describe('createGoRulesConfigFromEnv', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should create config from environment variables', () => {
    process.env['GORULES_API_URL'] = 'https://env.gorules.io';
    process.env['GORULES_API_KEY'] = 'env-api-key';
    process.env['GORULES_PROJECT_ID'] = 'env-project-id';
    process.env['GORULES_TIMEOUT'] = '5000';
    process.env['GORULES_RETRY_ATTEMPTS'] = '2';
    process.env['GORULES_ENABLE_LOGGING'] = 'true';

    const config = createGoRulesConfigFromEnv();

    expect(config).toEqual({
      apiUrl: 'https://env.gorules.io',
      apiKey: 'env-api-key',
      projectId: 'env-project-id',
      timeout: 5000,
      retryAttempts: 2,
      enableLogging: true,
    });
  });

  it('should use default values when environment variables are not set', () => {
    const config = createGoRulesConfigFromEnv();

    expect(config).toEqual({
      apiUrl: 'https://triveni.gorules.io',
      apiKey: '',
      projectId: '',
      timeout: undefined,
      retryAttempts: undefined,
      enableLogging: false,
    });
  });
});