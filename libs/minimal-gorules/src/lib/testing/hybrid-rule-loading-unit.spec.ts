/**
 * Comprehensive Unit Tests for Hybrid Rule Loading
 * Tests core functionality that might be missing from individual component tests
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { RuleLoaderFactory } from '../loader/rule-loader-factory.js';
import { LocalRuleLoaderService } from '../loader/local-rule-loader-service.js';
import { CloudRuleLoaderService } from '../loader/cloud-rule-loader-service.js';
import { ConfigValidator } from '../validation/config-validator.js';
import { FileSystemErrorHandler } from '../errors/file-system-error-handler.js';
import { MinimalGoRulesConfig } from '../interfaces/config.js';
import { MinimalGoRulesError, MinimalErrorCode } from '../errors/minimal-errors.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Hybrid Rule Loading Core Unit Tests', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'hybrid-unit-test-'));
  });

  afterEach(async () => {
    try {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('RuleLoaderFactory Edge Cases', () => {
    let factory: RuleLoaderFactory;

    beforeEach(() => {
      factory = new RuleLoaderFactory();
    });

    it('should handle mixed configuration with precedence', () => {
      // Configuration with both cloud and local settings
      const mixedConfig: MinimalGoRulesConfig = {
        ruleSource: 'local',
        localRulesPath: tempDir,
        // These should be ignored when ruleSource is 'local'
        apiUrl: 'https://api.gorules.io',
        apiKey: 'test-key',
        projectId: 'test-project',
      };

      const loader = factory.createLoader(mixedConfig);
      expect(loader).toBeInstanceOf(LocalRuleLoaderService);
    });

    it('should validate configuration before creating loader', () => {
      const invalidConfig: MinimalGoRulesConfig = {
        ruleSource: 'local',
        localRulesPath: '', // Invalid empty path
      };

      expect(() => factory.createLoader(invalidConfig)).toThrow(MinimalGoRulesError);
    });

    it('should handle case-sensitive rule source values', () => {
      const config: MinimalGoRulesConfig = {
        ruleSource: 'LOCAL' as any, // Invalid case
        localRulesPath: tempDir,
      };

      expect(() => factory.createLoader(config)).toThrow(MinimalGoRulesError);
    });

    it('should create cloud loader with minimal required config', () => {
      const minimalCloudConfig: MinimalGoRulesConfig = {
        ruleSource: 'cloud',
        apiUrl: 'https://api.gorules.io',
        apiKey: 'test-key',
        projectId: 'test-project',
      };

      const loader = factory.createLoader(minimalCloudConfig);
      expect(loader).toBeInstanceOf(CloudRuleLoaderService);
    });

    it('should create local loader with minimal required config', () => {
      const minimalLocalConfig: MinimalGoRulesConfig = {
        ruleSource: 'local',
        localRulesPath: tempDir,
      };

      const loader = factory.createLoader(minimalLocalConfig);
      expect(loader).toBeInstanceOf(LocalRuleLoaderService);
    });
  });

  describe('ConfigValidator Comprehensive Tests', () => {
    it('should validate all hybrid configuration combinations', () => {
      const testCases = [
        // Valid cloud configurations
        {
          config: {
            ruleSource: 'cloud' as const,
            apiUrl: 'https://api.gorules.io',
            apiKey: 'test-key',
            projectId: 'test-project',
          },
          shouldBeValid: true,
        },
        {
          config: {
            // No ruleSource - should default to cloud
            apiUrl: 'https://api.gorules.io',
            apiKey: 'test-key',
            projectId: 'test-project',
          },
          shouldBeValid: true,
        },
        // Valid local configurations
        {
          config: {
            ruleSource: 'local' as const,
            localRulesPath: tempDir,
          },
          shouldBeValid: true,
        },
        {
          config: {
            ruleSource: 'local' as const,
            localRulesPath: tempDir,
            enableHotReload: true,
            metadataFilePattern: '*.meta.json',
          },
          shouldBeValid: true,
        },
        // Invalid configurations
        {
          config: {
            ruleSource: 'cloud' as const,
            // Missing required cloud fields
          },
          shouldBeValid: false,
        },
        {
          config: {
            ruleSource: 'local' as const,
            // Missing localRulesPath
          },
          shouldBeValid: false,
        },
        {
          config: {
            ruleSource: 'invalid' as any,
          },
          shouldBeValid: false,
        },
      ];

      testCases.forEach((testCase, index) => {
        const result = ConfigValidator.validateHybridConfig(testCase.config);

        if (testCase.shouldBeValid) {
          expect(result.isValid).toBe(true);
          expect(result.errors).toHaveLength(0);
        } else {
          expect(result.isValid).toBe(false);
          expect(result.errors.length).toBeGreaterThan(0);
        }
      });
    });

    it('should validate file system options', () => {
      const configWithFileSystemOptions: MinimalGoRulesConfig = {
        ruleSource: 'local',
        localRulesPath: tempDir,
        fileSystemOptions: {
          recursive: true,
          watchOptions: {
            ignored: ['**/node_modules/**', '**/.git/**'],
            persistent: true,
            ignoreInitial: false,
          },
        },
      };

      const result = ConfigValidator.validateHybridConfig(configWithFileSystemOptions);
      expect(result.isValid).toBe(true);
    });

    it('should validate performance-related configuration', () => {
      const performanceConfig: MinimalGoRulesConfig = {
        ruleSource: 'local',
        localRulesPath: tempDir,
        cacheMaxSize: 1000,
        httpTimeout: 5000,
        memoryWarningThreshold: 0.8,
        memoryCriticalThreshold: 0.9,
        enablePerformanceOptimizations: true,
      };

      const result = ConfigValidator.validateHybridConfig(performanceConfig);
      expect(result.isValid).toBe(true);
    });

    it('should create default configurations correctly', () => {
      const defaultCloudConfig = ConfigValidator.createDefaultCloudConfig(
        'https://api.gorules.io',
        'test-key',
        'test-project',
      );

      expect(defaultCloudConfig.ruleSource).toBe('cloud');
      expect(defaultCloudConfig.apiUrl).toBe('https://api.gorules.io');
      expect(defaultCloudConfig.cacheMaxSize).toBeGreaterThan(0);
      expect(defaultCloudConfig.httpTimeout).toBeGreaterThan(0);

      const defaultLocalConfig = ConfigValidator.createDefaultLocalConfig(tempDir);

      expect(defaultLocalConfig.ruleSource).toBe('local');
      expect(defaultLocalConfig.localRulesPath).toBe(tempDir);
      expect(defaultLocalConfig.enableHotReload).toBe(false);
      expect(defaultLocalConfig.fileSystemOptions?.recursive).toBe(true);
    });
  });

  describe('FileSystemErrorHandler Comprehensive Tests', () => {
    it('should handle all common file system error codes', () => {
      const errorCases = [
        {
          error: Object.assign(new Error('File not found'), { code: 'ENOENT' }),
          expectedErrorCode: MinimalErrorCode.RULE_NOT_FOUND,
        },
        {
          error: Object.assign(new Error('Permission denied'), { code: 'EACCES' }),
          expectedErrorCode: MinimalErrorCode.CONFIGURATION_ERROR,
        },
        {
          error: Object.assign(new Error('Directory not empty'), { code: 'ENOTEMPTY' }),
          expectedErrorCode: MinimalErrorCode.FILE_SYSTEM_ERROR,
        },
        {
          error: Object.assign(new Error('Invalid argument'), { code: 'EINVAL' }),
          expectedErrorCode: MinimalErrorCode.FILE_SYSTEM_ERROR,
        },
        {
          error: new SyntaxError('Unexpected token in JSON'),
          expectedErrorCode: MinimalErrorCode.RULE_VALIDATION_ERROR,
        },
        {
          error: new Error('Generic error'),
          expectedErrorCode: MinimalErrorCode.FILE_SYSTEM_ERROR,
        },
      ];

      errorCases.forEach((errorCase, index) => {
        const result = FileSystemErrorHandler.handleFileError(
          errorCase.error,
          `/test/path/rule-${index}.json`,
        );

        expect(result).toBeInstanceOf(MinimalGoRulesError);
        expect(result.code).toBe(errorCase.expectedErrorCode);
        expect(result.message).toContain(`rule-${index}.json`);
      });
    });

    it('should preserve original error information', () => {
      const originalError = Object.assign(new Error('Original message'), {
        code: 'ENOENT',
        stack: 'Original stack trace',
      });

      const result = FileSystemErrorHandler.handleFileError(originalError, '/test/path');

      expect(result.message).toContain('Original message');
      expect(result.originalError).toBe(originalError);
    });

    it('should handle errors without codes', () => {
      const errorWithoutCode = new Error('Error without code');

      const result = FileSystemErrorHandler.handleFileError(errorWithoutCode, '/test/path');

      expect(result).toBeInstanceOf(MinimalGoRulesError);
      expect(result.code).toBe(MinimalErrorCode.FILE_SYSTEM_ERROR);
    });

    it('should handle null and undefined errors', () => {
      const nullError = null as any;
      const undefinedError = undefined as any;

      expect(() => FileSystemErrorHandler.handleFileError(nullError, '/test/path')).toThrow(
        MinimalGoRulesError,
      );

      expect(() => FileSystemErrorHandler.handleFileError(undefinedError, '/test/path')).toThrow(
        MinimalGoRulesError,
      );
    });
  });

  describe('Cross-Platform Path Handling', () => {
    it('should handle Windows-style paths', () => {
      const windowsPath = 'C:\\Users\\test\\rules\\pricing\\shipping-fees.json';
      const config: MinimalGoRulesConfig = {
        ruleSource: 'local',
        localRulesPath: 'C:\\Users\\test\\rules',
      };

      // Should not throw for Windows paths (even on non-Windows systems)
      expect(() => ConfigValidator.validateHybridConfig(config)).not.toThrow();
    });

    it('should handle Unix-style paths', () => {
      const unixPath = '/home/user/rules/pricing/shipping-fees.json';
      const config: MinimalGoRulesConfig = {
        ruleSource: 'local',
        localRulesPath: '/home/user/rules',
      };

      // Should not throw for Unix paths
      expect(() => ConfigValidator.validateHybridConfig(config)).not.toThrow();
    });

    it('should handle relative paths', () => {
      const config: MinimalGoRulesConfig = {
        ruleSource: 'local',
        localRulesPath: './rules',
      };

      // Should not throw for relative paths
      expect(() => ConfigValidator.validateHybridConfig(config)).not.toThrow();
    });

    it('should handle paths with special characters', () => {
      const specialCharPath = path.join(tempDir, 'rules with spaces & symbols!');

      // Create the directory
      fs.mkdirSync(specialCharPath, { recursive: true });

      const config: MinimalGoRulesConfig = {
        ruleSource: 'local',
        localRulesPath: specialCharPath,
      };

      const result = ConfigValidator.validateHybridConfig(config);
      expect(result.isValid).toBe(true);
    });
  });

  describe('Memory and Performance Edge Cases', () => {
    it('should handle large configuration objects', () => {
      const largeConfig: MinimalGoRulesConfig = {
        ruleSource: 'local',
        localRulesPath: tempDir,
        cacheMaxSize: 10000,
        httpTimeout: 30000,
        batchSize: 100,
        enablePerformanceOptimizations: true,
        enablePerformanceMetrics: true,
        enableConnectionPooling: true,
        enableRequestBatching: true,
        enableCompression: true,
        memoryWarningThreshold: 0.75,
        memoryCriticalThreshold: 0.9,
        fileSystemOptions: {
          recursive: true,
          watchOptions: {
            ignored: [
              '**/node_modules/**',
              '**/.git/**',
              '**/.DS_Store',
              '**/Thumbs.db',
              '**/*.tmp',
              '**/*.temp',
            ],
            persistent: true,
            ignoreInitial: false,
          },
        },
      };

      const result = ConfigValidator.validateHybridConfig(largeConfig);
      expect(result.isValid).toBe(true);

      const factory = new RuleLoaderFactory();
      expect(() => factory.createLoader(largeConfig)).not.toThrow();
    });

    it('should handle configuration with extreme values', () => {
      const extremeConfig: MinimalGoRulesConfig = {
        ruleSource: 'local',
        localRulesPath: tempDir,
        cacheMaxSize: Number.MAX_SAFE_INTEGER,
        httpTimeout: 1, // Minimum timeout
        batchSize: 1, // Minimum batch size
      };

      // Should handle extreme but valid values
      const result = ConfigValidator.validateHybridConfig(extremeConfig);
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid extreme values', () => {
      const invalidExtremeConfig: MinimalGoRulesConfig = {
        ruleSource: 'local',
        localRulesPath: tempDir,
        cacheMaxSize: -1, // Invalid negative value
        httpTimeout: 0, // Invalid zero timeout
        memoryWarningThreshold: 1.5, // Invalid > 1
        memoryCriticalThreshold: -0.1, // Invalid negative
      };

      const result = ConfigValidator.validateHybridConfig(invalidExtremeConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Concurrent Configuration Validation', () => {
    it('should handle concurrent validation calls', async () => {
      const configs = Array.from({ length: 10 }, (_, i) => ({
        ruleSource: 'local' as const,
        localRulesPath: tempDir,
        cacheMaxSize: 100 + i,
      }));

      const validationPromises = configs.map((config) =>
        Promise.resolve(ConfigValidator.validateHybridConfig(config)),
      );

      const results = await Promise.all(validationPromises);

      results.forEach((result) => {
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('should handle concurrent factory creation', async () => {
      const factory = new RuleLoaderFactory();
      const configs = Array.from({ length: 5 }, (_, i) => ({
        ruleSource: 'local' as const,
        localRulesPath: tempDir,
        cacheMaxSize: 100 + i,
      }));

      const creationPromises = configs.map((config) =>
        Promise.resolve(factory.createLoader(config)),
      );

      const loaders = await Promise.all(creationPromises);

      loaders.forEach((loader) => {
        expect(loader).toBeInstanceOf(LocalRuleLoaderService);
      });
    });
  });

  describe('Configuration Serialization and Deserialization', () => {
    it('should handle JSON serialization of configurations', () => {
      const config: MinimalGoRulesConfig = {
        ruleSource: 'local',
        localRulesPath: tempDir,
        enableHotReload: true,
        fileSystemOptions: {
          recursive: true,
          watchOptions: {
            ignored: ['**/test/**'],
            persistent: true,
          },
        },
      };

      // Should be serializable to JSON
      const serialized = JSON.stringify(config);
      expect(serialized).toBeDefined();

      // Should be deserializable from JSON
      const deserialized = JSON.parse(serialized);
      expect(deserialized.ruleSource).toBe('local');
      expect(deserialized.localRulesPath).toBe(tempDir);
      expect(deserialized.enableHotReload).toBe(true);

      // Deserialized config should still be valid
      const result = ConfigValidator.validateHybridConfig(deserialized);
      expect(result.isValid).toBe(true);
    });

    it('should handle configuration with undefined values', () => {
      const configWithUndefined: MinimalGoRulesConfig = {
        ruleSource: 'local',
        localRulesPath: tempDir,
        enableHotReload: undefined,
        metadataFilePattern: undefined,
        fileSystemOptions: undefined,
      };

      const result = ConfigValidator.validateHybridConfig(configWithUndefined);
      expect(result.isValid).toBe(true);
    });
  });

  describe('Error Message Quality', () => {
    it('should provide helpful error messages for common mistakes', () => {
      const commonMistakes = [
        {
          config: { ruleSource: 'local' },
          expectedErrorKeywords: ['localRulesPath', 'required'],
        },
        {
          config: { ruleSource: 'cloud' },
          expectedErrorKeywords: ['apiUrl', 'apiKey', 'projectId', 'required'],
        },
        {
          config: { ruleSource: 'local', localRulesPath: '' },
          expectedErrorKeywords: ['localRulesPath', 'non-empty'],
        },
        {
          config: { ruleSource: 'cloud', apiUrl: 'not-a-url' },
          expectedErrorKeywords: ['apiUrl', 'valid URL'],
        },
      ];

      commonMistakes.forEach((mistake) => {
        const result = ConfigValidator.validateHybridConfig(mistake.config as any);

        expect(result.isValid).toBe(false);

        const allErrors = result.errors.join(' ').toLowerCase();
        mistake.expectedErrorKeywords.forEach((keyword) => {
          expect(allErrors).toContain(keyword.toLowerCase());
        });
      });
    });

    it('should provide context in error messages', () => {
      const config: MinimalGoRulesConfig = {
        ruleSource: 'local',
        localRulesPath: '/non/existent/path',
      };

      const result = ConfigValidator.validateHybridConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.includes('/non/existent/path'))).toBe(true);
    });
  });
});
