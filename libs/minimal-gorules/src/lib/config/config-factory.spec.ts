/**
 * Unit tests for ConfigFactory
 */

import {
  ConfigFactory,
  ENV_VARS,
  DEFAULT_CONFIG,
  ConfigValidationError,
} from './config-factory.js';
import { MinimalGoRulesConfig } from '../interfaces/config.js';

describe('ConfigFactory', () => {
  // Store original environment variables
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables before each test
    jest.resetModules();
    process.env = { ...originalEnv };

    // Clear all GoRules environment variables
    Object.values(ENV_VARS).forEach((envVar) => {
      delete process.env[envVar];
    });
  });

  afterAll(() => {
    // Restore original environment variables
    process.env = originalEnv;
  });

  describe('fromEnvironment', () => {
    it('should create config from environment variables', () => {
      // Set environment variables
      process.env[ENV_VARS.API_URL] = 'https://api.gorules.io';
      process.env[ENV_VARS.API_KEY] = 'test-api-key';
      process.env[ENV_VARS.PROJECT_ID] = 'test-project-id';
      process.env[ENV_VARS.CACHE_MAX_SIZE] = '2000';
      process.env[ENV_VARS.HTTP_TIMEOUT] = '10000';
      process.env[ENV_VARS.BATCH_SIZE] = '100';
      process.env[ENV_VARS.PLATFORM] = 'browser';
      process.env[ENV_VARS.ENABLE_PERFORMANCE_OPTIMIZATIONS] = 'true';
      process.env[ENV_VARS.ENABLE_PERFORMANCE_METRICS] = 'false';
      process.env[ENV_VARS.MEMORY_WARNING_THRESHOLD] = '0.8';
      process.env[ENV_VARS.MEMORY_CRITICAL_THRESHOLD] = '0.9';
      process.env[ENV_VARS.MEMORY_CLEANUP_INTERVAL] = '60000';
      process.env[ENV_VARS.ENABLE_CONNECTION_POOLING] = 'false';
      process.env[ENV_VARS.ENABLE_REQUEST_BATCHING] = 'false';
      process.env[ENV_VARS.ENABLE_COMPRESSION] = 'false';
      process.env[ENV_VARS.COMPRESSION_ALGORITHM] = 'deflate';

      const config = ConfigFactory.fromEnvironment();

      expect(config.apiUrl).toBe('https://api.gorules.io');
      expect(config.apiKey).toBe('test-api-key');
      expect(config.projectId).toBe('test-project-id');
      expect(config.cacheMaxSize).toBe(2000);
      expect(config.httpTimeout).toBe(10000);
      expect(config.batchSize).toBe(100);
      expect(config.platform).toBe('browser');
      expect(config.enablePerformanceOptimizations).toBe(true);
      expect(config.enablePerformanceMetrics).toBe(false);
      expect(config.memoryWarningThreshold).toBe(0.8);
      expect(config.memoryCriticalThreshold).toBe(0.9);
      expect(config.memoryCleanupInterval).toBe(60000);
      expect(config.enableConnectionPooling).toBe(false);
      expect(config.enableRequestBatching).toBe(false);
      expect(config.enableCompression).toBe(false);
      expect(config.compressionAlgorithm).toBe('deflate');
    });

    it('should use defaults when environment variables are not set', () => {
      process.env[ENV_VARS.API_URL] = 'https://api.gorules.io';
      process.env[ENV_VARS.API_KEY] = 'test-api-key';
      process.env[ENV_VARS.PROJECT_ID] = 'test-project-id';

      const config = ConfigFactory.fromEnvironment();

      expect(config.cacheMaxSize).toBe(DEFAULT_CONFIG.cacheMaxSize);
      expect(config.httpTimeout).toBe(DEFAULT_CONFIG.httpTimeout);
      expect(config.batchSize).toBe(DEFAULT_CONFIG.batchSize);
      expect(config.platform).toBe(DEFAULT_CONFIG.platform);
      expect(config.enablePerformanceOptimizations).toBe(
        DEFAULT_CONFIG.enablePerformanceOptimizations,
      );
      expect(config.enablePerformanceMetrics).toBe(DEFAULT_CONFIG.enablePerformanceMetrics);
    });

    it('should apply overrides over environment variables', () => {
      process.env[ENV_VARS.API_URL] = 'https://api.gorules.io';
      process.env[ENV_VARS.API_KEY] = 'test-api-key';
      process.env[ENV_VARS.PROJECT_ID] = 'test-project-id';
      process.env[ENV_VARS.CACHE_MAX_SIZE] = '1000';

      const config = ConfigFactory.fromEnvironment({
        cacheMaxSize: 5000,
        httpTimeout: 15000,
      });

      expect(config.cacheMaxSize).toBe(5000); // Override value
      expect(config.httpTimeout).toBe(15000); // Override value
    });

    it('should ignore invalid numeric environment variables', () => {
      process.env[ENV_VARS.API_URL] = 'https://api.gorules.io';
      process.env[ENV_VARS.API_KEY] = 'test-api-key';
      process.env[ENV_VARS.PROJECT_ID] = 'test-project-id';
      process.env[ENV_VARS.CACHE_MAX_SIZE] = 'invalid-number';
      process.env[ENV_VARS.HTTP_TIMEOUT] = 'not-a-number';

      const config = ConfigFactory.fromEnvironment();

      expect(config.cacheMaxSize).toBe(DEFAULT_CONFIG.cacheMaxSize);
      expect(config.httpTimeout).toBe(DEFAULT_CONFIG.httpTimeout);
    });

    it('should ignore invalid platform values', () => {
      process.env[ENV_VARS.API_URL] = 'https://api.gorules.io';
      process.env[ENV_VARS.API_KEY] = 'test-api-key';
      process.env[ENV_VARS.PROJECT_ID] = 'test-project-id';
      process.env[ENV_VARS.PLATFORM] = 'invalid-platform';

      const config = ConfigFactory.fromEnvironment();

      expect(config.platform).toBe(DEFAULT_CONFIG.platform);
    });

    it('should ignore invalid memory threshold values', () => {
      process.env[ENV_VARS.API_URL] = 'https://api.gorules.io';
      process.env[ENV_VARS.API_KEY] = 'test-api-key';
      process.env[ENV_VARS.PROJECT_ID] = 'test-project-id';
      process.env[ENV_VARS.MEMORY_WARNING_THRESHOLD] = '1.5'; // Invalid: > 1
      process.env[ENV_VARS.MEMORY_CRITICAL_THRESHOLD] = '-0.1'; // Invalid: < 0

      const config = ConfigFactory.fromEnvironment();

      expect(config.memoryWarningThreshold).toBe(DEFAULT_CONFIG.memoryWarningThreshold);
      expect(config.memoryCriticalThreshold).toBe(DEFAULT_CONFIG.memoryCriticalThreshold);
    });

    it('should throw ConfigValidationError for invalid configuration', () => {
      // Missing required fields
      expect(() => {
        ConfigFactory.fromEnvironment();
      }).toThrow(ConfigValidationError);
    });
  });

  describe('forDevelopment', () => {
    it('should create development configuration', () => {
      process.env[ENV_VARS.API_KEY] = 'dev-api-key';
      process.env[ENV_VARS.PROJECT_ID] = 'dev-project-id';

      const config = ConfigFactory.forDevelopment();

      expect(config.apiUrl).toBe('https://api.gorules.io');
      expect(config.apiKey).toBe('dev-api-key');
      expect(config.projectId).toBe('dev-project-id');
      expect(config.cacheMaxSize).toBe(100);
      expect(config.httpTimeout).toBe(10000);
      expect(config.batchSize).toBe(10);
      expect(config.enablePerformanceOptimizations).toBe(false);
      expect(config.enablePerformanceMetrics).toBe(true);
    });

    it('should apply overrides to development configuration', () => {
      process.env[ENV_VARS.API_KEY] = 'dev-api-key';
      process.env[ENV_VARS.PROJECT_ID] = 'dev-project-id';

      const config = ConfigFactory.forDevelopment({
        cacheMaxSize: 200,
        enablePerformanceOptimizations: true,
      });

      expect(config.cacheMaxSize).toBe(200);
      expect(config.enablePerformanceOptimizations).toBe(true);
    });
  });

  describe('forProduction', () => {
    it('should create production configuration', () => {
      process.env[ENV_VARS.API_URL] = 'https://api.gorules.io';
      process.env[ENV_VARS.API_KEY] = 'prod-api-key';
      process.env[ENV_VARS.PROJECT_ID] = 'prod-project-id';

      const config = ConfigFactory.forProduction();

      expect(config.apiUrl).toBe('https://api.gorules.io');
      expect(config.apiKey).toBe('prod-api-key');
      expect(config.projectId).toBe('prod-project-id');
      expect(config.cacheMaxSize).toBe(5000);
      expect(config.httpTimeout).toBe(5000);
      expect(config.batchSize).toBe(100);
      expect(config.enablePerformanceOptimizations).toBe(true);
      expect(config.enablePerformanceMetrics).toBe(false);
      expect(config.enableConnectionPooling).toBe(true);
      expect(config.enableRequestBatching).toBe(true);
      expect(config.enableCompression).toBe(true);
      expect(config.compressionAlgorithm).toBe('gzip');
    });
  });

  describe('forTesting', () => {
    it('should create testing configuration', () => {
      const config = ConfigFactory.forTesting();

      expect(config.apiUrl).toBe('https://mock-api.gorules.io');
      expect(config.apiKey).toBe('test-api-key');
      expect(config.projectId).toBe('test-project-id');
      expect(config.cacheMaxSize).toBe(50);
      expect(config.httpTimeout).toBe(1000);
      expect(config.batchSize).toBe(5);
      expect(config.enablePerformanceOptimizations).toBe(false);
      expect(config.enablePerformanceMetrics).toBe(false);
    });

    it('should apply overrides to testing configuration', () => {
      const config = ConfigFactory.forTesting({
        cacheMaxSize: 25,
        httpTimeout: 500,
      });

      expect(config.cacheMaxSize).toBe(25);
      expect(config.httpTimeout).toBe(500);
    });
  });

  describe('validate', () => {
    it('should validate a correct configuration', () => {
      const config: MinimalGoRulesConfig = {
        apiUrl: 'https://api.gorules.io',
        apiKey: 'test-api-key',
        projectId: 'test-project-id',
        cacheMaxSize: 1000,
        httpTimeout: 5000,
        batchSize: 50,
      };

      const result = ConfigFactory.validate(config);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for missing required fields', () => {
      const config = {} as MinimalGoRulesConfig;

      const result = ConfigFactory.validate(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('API URL is required');
      expect(result.errors).toContain('API key is required');
      expect(result.errors).toContain('Project ID is required');
    });

    it('should return error for null configuration', () => {
      const result = ConfigFactory.validate(null as any);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Configuration object is required');
    });

    it('should validate URL format', () => {
      const config: MinimalGoRulesConfig = {
        apiUrl: 'invalid-url',
        apiKey: 'test-api-key',
        projectId: 'test-project-id',
      };

      const result = ConfigFactory.validate(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('API URL must be a valid URL');
    });

    it('should validate empty string fields', () => {
      const config: MinimalGoRulesConfig = {
        apiUrl: 'https://api.gorules.io',
        apiKey: '   ',
        projectId: '',
      };

      const result = ConfigFactory.validate(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('API key must be a non-empty string');
      expect(result.errors).toContain('Project ID is required');
    });

    it('should validate numeric fields', () => {
      const config: MinimalGoRulesConfig = {
        apiUrl: 'https://api.gorules.io',
        apiKey: 'test-api-key',
        projectId: 'test-project-id',
        cacheMaxSize: -1,
        httpTimeout: 0,
        batchSize: 1.5,
      };

      const result = ConfigFactory.validate(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Cache max size must be a positive integer');
      expect(result.errors).toContain('HTTP timeout must be a positive integer');
      expect(result.errors).toContain('Batch size must be a positive integer');
    });

    it('should validate platform values', () => {
      const config: MinimalGoRulesConfig = {
        apiUrl: 'https://api.gorules.io',
        apiKey: 'test-api-key',
        projectId: 'test-project-id',
        platform: 'invalid' as any,
      };

      const result = ConfigFactory.validate(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Platform must be either "node" or "browser"');
    });

    it('should validate memory thresholds', () => {
      const config: MinimalGoRulesConfig = {
        apiUrl: 'https://api.gorules.io',
        apiKey: 'test-api-key',
        projectId: 'test-project-id',
        memoryWarningThreshold: 1.5,
        memoryCriticalThreshold: -0.1,
      };

      const result = ConfigFactory.validate(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Memory warning threshold must be a number between 0 and 1');
      expect(result.errors).toContain('Memory critical threshold must be a number between 0 and 1');
    });

    it('should validate memory threshold relationship', () => {
      const config: MinimalGoRulesConfig = {
        apiUrl: 'https://api.gorules.io',
        apiKey: 'test-api-key',
        projectId: 'test-project-id',
        memoryWarningThreshold: 0.9,
        memoryCriticalThreshold: 0.8,
      };

      const result = ConfigFactory.validate(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Memory critical threshold must be higher than warning threshold',
      );
    });

    it('should validate compression algorithm', () => {
      const config: MinimalGoRulesConfig = {
        apiUrl: 'https://api.gorules.io',
        apiKey: 'test-api-key',
        projectId: 'test-project-id',
        compressionAlgorithm: 'invalid' as unknown,
      };

      const result = ConfigFactory.validate(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Compression algorithm must be "gzip", "deflate", or "none"');
    });

    it('should validate memory cleanup interval', () => {
      const config: MinimalGoRulesConfig = {
        apiUrl: 'https://api.gorules.io',
        apiKey: 'test-api-key',
        projectId: 'test-project-id',
        memoryCleanupInterval: -1000,
      };

      const result = ConfigFactory.validate(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Memory cleanup interval must be a positive integer');
    });
  });

  describe('getDocumentation', () => {
    it('should return configuration documentation', () => {
      const docs = ConfigFactory.getDocumentation();

      expect(docs).toContain('Minimal GoRules Engine Configuration');
      expect(docs).toContain('Environment Variables');
      expect(docs).toContain('Usage Examples');
      expect(docs).toContain(ENV_VARS.API_URL);
      expect(docs).toContain(ENV_VARS.API_KEY);
      expect(docs).toContain(ENV_VARS.PROJECT_ID);
    });
  });

  describe('ConfigValidationError', () => {
    it('should create error with validation errors', () => {
      const errors = ['Error 1', 'Error 2'];
      const error = new ConfigValidationError('Test message', errors);

      expect(error.message).toBe('Test message');
      expect(error.validationErrors).toEqual(errors);
      expect(error.name).toBe('ConfigValidationError');
    });
  });

  describe('edge cases', () => {
    it('should handle boolean environment variables with different cases', () => {
      process.env[ENV_VARS.API_URL] = 'https://api.gorules.io';
      process.env[ENV_VARS.API_KEY] = 'test-api-key';
      process.env[ENV_VARS.PROJECT_ID] = 'test-project-id';
      process.env[ENV_VARS.ENABLE_PERFORMANCE_OPTIMIZATIONS] = 'TRUE';
      process.env[ENV_VARS.ENABLE_PERFORMANCE_METRICS] = 'False';
      process.env[ENV_VARS.ENABLE_COMPRESSION] = 'yes'; // Should use default

      const config = ConfigFactory.fromEnvironment();

      expect(config.enablePerformanceOptimizations).toBe(true); // 'TRUE' should be parsed as true (case-insensitive)
      expect(config.enablePerformanceMetrics).toBe(false); // 'False' should be parsed as false
      expect(config.enableCompression).toBe(true); // 'yes' is not 'true', so use default (true)
    });

    it('should handle zero values correctly', () => {
      process.env[ENV_VARS.API_URL] = 'https://api.gorules.io';
      process.env[ENV_VARS.API_KEY] = 'test-api-key';
      process.env[ENV_VARS.PROJECT_ID] = 'test-project-id';
      process.env[ENV_VARS.MEMORY_WARNING_THRESHOLD] = '0';
      process.env[ENV_VARS.MEMORY_CRITICAL_THRESHOLD] = '0';

      const config = ConfigFactory.fromEnvironment();

      // Zero thresholds should be ignored as invalid
      expect(config.memoryWarningThreshold).toBe(DEFAULT_CONFIG.memoryWarningThreshold);
      expect(config.memoryCriticalThreshold).toBe(DEFAULT_CONFIG.memoryCriticalThreshold);
    });

    it('should handle boundary values for memory thresholds', () => {
      process.env[ENV_VARS.API_URL] = 'https://api.gorules.io';
      process.env[ENV_VARS.API_KEY] = 'test-api-key';
      process.env[ENV_VARS.PROJECT_ID] = 'test-project-id';
      process.env[ENV_VARS.MEMORY_WARNING_THRESHOLD] = '0.01';
      process.env[ENV_VARS.MEMORY_CRITICAL_THRESHOLD] = '0.99';

      const config = ConfigFactory.fromEnvironment();

      expect(config.memoryWarningThreshold).toBe(0.01);
      expect(config.memoryCriticalThreshold).toBe(0.99);
    });
  });
});
