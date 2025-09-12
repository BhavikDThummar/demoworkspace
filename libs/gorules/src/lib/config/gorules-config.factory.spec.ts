import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import {
  GoRulesConfigFactory,
  GoRulesAsyncConfigFactory,
  GoRulesEnvironmentConfigFactory,
  GoRulesConfigUtils,
} from './gorules-config.factory.js';
import { GoRulesConfig } from './gorules-config.interface.js';

describe('GoRulesConfigFactory', () => {
  let factory: GoRulesConfigFactory;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn(),
      getOrThrow: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoRulesConfigFactory,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    factory = module.get<GoRulesConfigFactory>(GoRulesConfigFactory);
    configService = module.get(ConfigService);
  });

  describe('createGoRulesOptions', () => {
    it('should create configuration with required values', () => {
      configService.get.mockImplementation((key: string, defaultValue?: unknown) => {
        const values: Record<string, unknown> = {
          GORULES_API_URL: 'https://test.gorules.io',
          GORULES_TIMEOUT: 5000,
          GORULES_RETRY_ATTEMPTS: 2,
          GORULES_ENABLE_LOGGING: true,
        };
        return values[key] ?? defaultValue;
      });

      configService.getOrThrow.mockImplementation((key: string) => {
        const values: Record<string, string> = {
          GORULES_API_KEY: 'test-api-key',
          GORULES_PROJECT_ID: 'test-project-id',
        };
        return values[key];
      });

      const config = factory.createGoRulesOptions();

      expect(config).toEqual({
        apiUrl: 'https://test.gorules.io',
        apiKey: 'test-api-key',
        projectId: 'test-project-id',
        timeout: 5000,
        retryAttempts: 2,
        enableLogging: true,
      });
    });

    it('should use default values when not provided', () => {
      configService.get.mockImplementation((key: string, defaultValue?: unknown) => defaultValue);
      configService.getOrThrow.mockImplementation((key: string) => {
        const values: Record<string, string> = {
          GORULES_API_KEY: 'test-api-key',
          GORULES_PROJECT_ID: 'test-project-id',
        };
        return values[key];
      });

      const config = factory.createGoRulesOptions();

      expect(config.apiUrl).toBe('https://triveni.gorules.io');
      expect(config.timeout).toBe(30000);
      expect(config.retryAttempts).toBe(3);
      expect(config.enableLogging).toBe(false);
    });
  });
});

describe('GoRulesAsyncConfigFactory', () => {
  let factory: GoRulesAsyncConfigFactory;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn(),
      getOrThrow: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoRulesAsyncConfigFactory,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    factory = module.get<GoRulesAsyncConfigFactory>(GoRulesAsyncConfigFactory);
    configService = module.get(ConfigService);
  });

  describe('createGoRulesOptions', () => {
    it('should create configuration asynchronously', async () => {
      configService.get.mockImplementation((key: string, defaultValue?: unknown) => defaultValue);
      configService.getOrThrow.mockImplementation((key: string) => {
        const values: Record<string, string> = {
          GORULES_API_KEY: 'async-api-key',
          GORULES_PROJECT_ID: 'async-project-id',
        };
        return values[key];
      });

      const config = await factory.createGoRulesOptions();

      expect(config).toEqual({
        apiUrl: 'https://triveni.gorules.io',
        apiKey: 'async-api-key',
        projectId: 'async-project-id',
        timeout: 30000,
        retryAttempts: 3,
        enableLogging: false,
      });
    });
  });
});

describe('GoRulesEnvironmentConfigFactory', () => {
  let factory: GoRulesEnvironmentConfigFactory;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn(),
      getOrThrow: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoRulesEnvironmentConfigFactory,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    factory = module.get<GoRulesEnvironmentConfigFactory>(GoRulesEnvironmentConfigFactory);
    configService = module.get(ConfigService);
  });

  describe('createGoRulesOptions', () => {
    beforeEach(() => {
      configService.getOrThrow.mockImplementation((key: string) => {
        const values: Record<string, string> = {
          GORULES_API_KEY: 'env-api-key',
          GORULES_PROJECT_ID: 'env-project-id',
        };
        return values[key];
      });
    });

    it('should create development configuration', () => {
      configService.get.mockImplementation((key: string, defaultValue?: unknown) => {
        if (key === 'NODE_ENV') return 'development';
        return defaultValue;
      });

      const config = factory.createGoRulesOptions();

      expect(config.timeout).toBe(60000);
      expect(config.retryAttempts).toBe(1);
      expect(config.enableLogging).toBe(true);
    });

    it('should create test configuration', () => {
      configService.get.mockImplementation((key: string, defaultValue?: unknown) => {
        if (key === 'NODE_ENV') return 'test';
        if (key === 'GORULES_API_URL') return 'https://test.gorules.io';
        return defaultValue;
      });

      const config = factory.createGoRulesOptions();

      expect(config.apiUrl).toBe('https://test.gorules.io');
      expect(config.timeout).toBe(10000);
      expect(config.retryAttempts).toBe(0);
      expect(config.enableLogging).toBe(false);
    });

    it('should create production configuration', () => {
      configService.get.mockImplementation((key: string, defaultValue?: unknown) => {
        if (key === 'NODE_ENV') return 'production';
        return defaultValue;
      });

      const config = factory.createGoRulesOptions();

      expect(config.timeout).toBe(30000);
      expect(config.retryAttempts).toBe(3);
      expect(config.enableLogging).toBe(false);
    });

    it('should handle unknown environment', () => {
      configService.get.mockImplementation((key: string, defaultValue?: unknown) => {
        if (key === 'NODE_ENV') return 'unknown';
        return defaultValue;
      });

      const config = factory.createGoRulesOptions();

      // Should fall back to development defaults
      expect(config.timeout).toBe(60000);
      expect(config.retryAttempts).toBe(1);
      expect(config.enableLogging).toBe(true);
    });
  });
});

describe('GoRulesConfigUtils', () => {
  describe('validateConfiguration', () => {
    const validConfig: GoRulesConfig = {
      apiUrl: 'https://test.gorules.io',
      apiKey: 'valid-api-key-123',
      projectId: '123e4567-e89b-12d3-a456-426614174000',
      timeout: 30000,
      retryAttempts: 3,
      enableLogging: false,
    };

    it('should validate a correct configuration', () => {
      const result = GoRulesConfigUtils.validateConfiguration(validConfig);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const invalidConfig = { ...validConfig };
      delete (invalidConfig as Partial<GoRulesConfig>).apiUrl;
      delete (invalidConfig as Partial<GoRulesConfig>).apiKey;

      const result = GoRulesConfigUtils.validateConfiguration(invalidConfig as GoRulesConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('apiUrl is required');
      expect(result.errors).toContain('apiKey is required');
    });

    it('should detect invalid URL', () => {
      const invalidConfig = { ...validConfig, apiUrl: 'not-a-url' };

      const result = GoRulesConfigUtils.validateConfiguration(invalidConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('apiUrl must be a valid URL');
    });

    it('should detect invalid timeout values', () => {
      const invalidConfig = { ...validConfig, timeout: -1 };

      const result = GoRulesConfigUtils.validateConfiguration(invalidConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('timeout must be greater than 0');
    });

    it('should detect invalid retry attempts', () => {
      const invalidConfig = { ...validConfig, retryAttempts: -1 };

      const result = GoRulesConfigUtils.validateConfiguration(invalidConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('retryAttempts must be 0 or greater');
    });

    it('should generate warnings for suspicious values', () => {
      const suspiciousConfig = {
        ...validConfig,
        apiKey: 'short',
        timeout: 100,
        retryAttempts: 8,
      };

      const result = GoRulesConfigUtils.validateConfiguration(suspiciousConfig);

      expect(result.warnings).toContain('apiKey seems too short, ensure it is correct');
      expect(result.warnings).toContain('timeout is very short, this may cause frequent timeouts');
      expect(result.warnings).toContain('high retry attempts may cause long delays on failures');
    });
  });

  describe('mergeConfigurations', () => {
    it('should merge multiple configurations', () => {
      const config1: Partial<GoRulesConfig> = {
        apiUrl: 'https://test1.gorules.io',
        timeout: 5000,
      };

      const config2: Partial<GoRulesConfig> = {
        apiKey: 'test-key',
        retryAttempts: 2,
      };

      const config3: Partial<GoRulesConfig> = {
        projectId: 'test-project',
        enableLogging: true,
      };

      const merged = GoRulesConfigUtils.mergeConfigurations(config1, config2, config3);

      expect(merged).toEqual({
        apiUrl: 'https://test1.gorules.io',
        apiKey: 'test-key',
        projectId: 'test-project',
        timeout: 5000,
        retryAttempts: 2,
        enableLogging: true,
      });
    });

    it('should throw error for missing required fields', () => {
      const config1: Partial<GoRulesConfig> = { timeout: 5000 };
      const config2: Partial<GoRulesConfig> = { retryAttempts: 2 };

      expect(() => GoRulesConfigUtils.mergeConfigurations(config1, config2))
        .toThrow('Merged configuration is missing required fields');
    });
  });

  describe('maskSensitiveData', () => {
    it('should mask sensitive configuration data', () => {
      const config: GoRulesConfig = {
        apiUrl: 'https://test.gorules.io',
        apiKey: 'secret-api-key-12345',
        projectId: 'test-project-id',
        timeout: 30000,
        retryAttempts: 3,
        enableLogging: false,
      };

      const masked = GoRulesConfigUtils.maskSensitiveData(config);

      expect(masked.apiKey).toBe('secr****');
      expect(masked.apiUrl).toBe('https://test.gorules.io');
      expect(masked.projectId).toBe('test-project-id');
    });

    it('should handle undefined apiKey', () => {
      const config = {
        apiUrl: 'https://test.gorules.io',
        apiKey: '',
        projectId: 'test-project-id',
      } as GoRulesConfig;

      const masked = GoRulesConfigUtils.maskSensitiveData(config);

      expect(masked.apiKey).toBeUndefined();
    });
  });
});