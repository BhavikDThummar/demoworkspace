/**
 * Unit tests for LocalRuleLoaderService
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { LocalRuleLoaderService } from './local-rule-loader-service.js';
import { MinimalGoRulesConfig } from '../interfaces/index.js';
import { MinimalGoRulesError, MinimalErrorCode } from '../errors/index.js';

// Mock fs module
const mockFs = {
  promises: {
    readdir: jest.fn(),
    stat: jest.fn(),
    readFile: jest.fn(),
    access: jest.fn(),
  },
  constants: {
    F_OK: 0,
    R_OK: 4,
  },
  existsSync: jest.fn(),
  statSync: jest.fn(),
};

jest.mock('fs', () => mockFs);

// Mock path module for cross-platform testing
const mockPath = {
  resolve: jest.fn(),
  join: jest.fn(),
  dirname: jest.fn(),
  basename: jest.fn(),
  extname: jest.fn(),
  sep: '/',
};

jest.mock('path', () => mockPath);

// Mock ConfigValidator
const mockValidateHybridConfig = jest.fn();
jest.mock('../validation/config-validator.js', () => ({
  ConfigValidator: {
    validateHybridConfig: mockValidateHybridConfig,
  },
}));

describe('LocalRuleLoaderService', () => {
  let service: LocalRuleLoaderService;
  let mockConfig: MinimalGoRulesConfig;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup default mock config
    mockConfig = {
      ruleSource: 'local',
      localRulesPath: '/test/rules',
      enableHotReload: false,
      metadataFilePattern: '.meta.json',
      fileSystemOptions: {
        recursive: true,
      },
    };

    // Setup default path mocks
    mockPath.resolve.mockImplementation((p: string) => p);
    mockPath.join.mockImplementation((...paths: string[]) => paths.join('/'));

    // Setup default fs mocks for config validation
    mockFs.existsSync.mockReturnValue(true);
    mockFs.statSync.mockReturnValue({ isDirectory: () => true });

    // Setup default ConfigValidator mock
    mockValidateHybridConfig.mockReturnValue({
      isValid: true,
      errors: [],
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create service with valid local configuration', () => {
      expect(() => new LocalRuleLoaderService(mockConfig)).not.toThrow();
    });

    it('should throw error for invalid rule source', () => {
      const invalidConfig = { ...mockConfig, ruleSource: 'cloud' as const };

      expect(() => new LocalRuleLoaderService(invalidConfig)).toThrow(MinimalGoRulesError);
    });

    it('should throw error when localRulesPath is missing', () => {
      const invalidConfig = { ...mockConfig };
      delete invalidConfig.localRulesPath;

      expect(() => new LocalRuleLoaderService(invalidConfig)).toThrow(MinimalGoRulesError);
    });

    it('should resolve rules path correctly', () => {
      mockPath.resolve.mockReturnValue('/resolved/test/rules');

      const service = new LocalRuleLoaderService(mockConfig);

      expect(mockPath.resolve).toHaveBeenCalledWith('/test/rules');
      expect(service.getRulesPath()).toBe('/resolved/test/rules');
    });
  });

  describe('loadAllRules', () => {
    beforeEach(() => {
      service = new LocalRuleLoaderService(mockConfig);
    });

    it('should load all rules from file system', async () => {
      // Mock FileSystemRuleScanner.scanDirectory
      const mockRules = [
        {
          id: 'pricing/shipping-fees',
          filePath: '/test/rules/pricing/shipping-fees.json',
          data: Buffer.from('{"nodes": [], "edges": []}'),
          metadata: {
            id: 'pricing/shipping-fees',
            version: '1.0.0',
            tags: ['pricing'],
            lastModified: 1640995200000,
          },
        },
        {
          id: 'validation/order-validation',
          filePath: '/test/rules/validation/order-validation.json',
          data: Buffer.from('{"nodes": [], "edges": []}'),
          metadata: {
            id: 'validation/order-validation',
            version: '1.1.0',
            tags: ['validation'],
            lastModified: 1640995300000,
          },
        },
      ];

      // Mock the scanner's scanDirectory method
      jest.spyOn(service['scanner'], 'scanDirectory').mockResolvedValue(mockRules);

      const result = await service.loadAllRules();

      expect(result.size).toBe(2);
      expect(result.has('pricing/shipping-fees')).toBe(true);
      expect(result.has('validation/order-validation')).toBe(true);

      const pricingRule = result.get('pricing/shipping-fees')!;
      expect(pricingRule.data).toEqual(Buffer.from('{"nodes": [], "edges": []}'));
      expect(pricingRule.metadata.version).toBe('1.0.0');
      expect(pricingRule.metadata.tags).toEqual(['pricing']);
    });

    it('should handle empty rules directory', async () => {
      jest.spyOn(service['scanner'], 'scanDirectory').mockResolvedValue([]);

      const result = await service.loadAllRules();

      expect(result.size).toBe(0);
    });

    it('should handle scanner errors', async () => {
      const scanError = new Error('Directory not accessible');
      jest.spyOn(service['scanner'], 'scanDirectory').mockRejectedValue(scanError);

      await expect(service.loadAllRules()).rejects.toThrow(MinimalGoRulesError);
    });

    it('should ignore projectId parameter for local loading', async () => {
      jest.spyOn(service['scanner'], 'scanDirectory').mockResolvedValue([]);

      const result = await service.loadAllRules('ignored-project-id');

      expect(result.size).toBe(0);
      expect(service['scanner'].scanDirectory).toHaveBeenCalledWith();
    });
  });

  describe('loadRule', () => {
    beforeEach(() => {
      service = new LocalRuleLoaderService(mockConfig);
    });

    it('should load individual rule by ID', async () => {
      const mockRule = {
        id: 'pricing/shipping-fees',
        filePath: '/test/rules/pricing/shipping-fees.json',
        data: Buffer.from('{"nodes": [], "edges": []}'),
        metadata: {
          id: 'pricing/shipping-fees',
          version: '1.0.0',
          tags: ['pricing'],
          lastModified: 1640995200000,
        },
      };

      // Mock path resolution
      mockPath.join.mockReturnValue('/test/rules/pricing/shipping-fees.json');
      mockPath.resolve.mockImplementation((p: string) => p);

      // Mock the scanner's loadRuleFile method
      jest.spyOn(service['scanner'], 'loadRuleFile').mockResolvedValue(mockRule);

      const result = await service.loadRule('pricing/shipping-fees');

      expect(result.data).toEqual(Buffer.from('{"nodes": [], "edges": []}'));
      expect(result.metadata.version).toBe('1.0.0');
      expect(result.metadata.tags).toEqual(['pricing']);
    });

    it('should handle rule not found', async () => {
      const loadError = new MinimalGoRulesError(
        MinimalErrorCode.RULE_NOT_FOUND,
        'Rule file not found',
      );

      mockPath.join.mockReturnValue('/test/rules/nonexistent.json');
      mockPath.resolve.mockImplementation((p: string) => p);
      jest.spyOn(service['scanner'], 'loadRuleFile').mockRejectedValue(loadError);

      await expect(service.loadRule('nonexistent')).rejects.toThrow(MinimalGoRulesError);
    });

    it('should prevent path traversal attacks', async () => {
      mockPath.join.mockReturnValue('/test/rules/../../../etc/passwd');
      mockPath.resolve.mockImplementation((p: string) => {
        if (p.includes('etc/passwd')) return '/etc/passwd';
        return p;
      });

      await expect(service.loadRule('../../../etc/passwd')).rejects.toThrow(MinimalGoRulesError);
    });

    it('should handle nested rule IDs correctly', async () => {
      const mockRule = {
        id: 'pricing/complex/shipping-fees',
        filePath: '/test/rules/pricing/complex/shipping-fees.json',
        data: Buffer.from('{"nodes": [], "edges": []}'),
        metadata: {
          id: 'pricing/complex/shipping-fees',
          version: '1.0.0',
          tags: ['pricing', 'complex'],
          lastModified: 1640995200000,
        },
      };

      mockPath.join.mockReturnValue('/test/rules/pricing/complex/shipping-fees.json');
      mockPath.resolve.mockImplementation((p: string) => p);
      jest.spyOn(service['scanner'], 'loadRuleFile').mockResolvedValue(mockRule);

      const result = await service.loadRule('pricing/complex/shipping-fees');

      expect(result.metadata.id).toBe('pricing/complex/shipping-fees');
      expect(service['scanner'].loadRuleFile).toHaveBeenCalledWith(
        '/test/rules/pricing/complex/shipping-fees.json',
      );
    });
  });

  describe('checkVersions', () => {
    beforeEach(() => {
      service = new LocalRuleLoaderService(mockConfig);
    });

    it('should check versions using file modification times', async () => {
      const rules = new Map([
        ['pricing/shipping-fees', '1640995200000'], // Current version
        ['validation/order-validation', '1640995100000'], // Older version
      ]);

      // Mock file stats
      const mockStats1 = { mtime: new Date(1640995200000), size: 1024 } as fs.Stats;
      const mockStats2 = { mtime: new Date(1640995300000), size: 2048 } as fs.Stats;

      mockPath.join
        .mockReturnValueOnce('/test/rules/pricing/shipping-fees.json')
        .mockReturnValueOnce('/test/rules/validation/order-validation.json');
      mockPath.resolve.mockImplementation((p: string) => p);

      // Mock getFileStats method
      jest
        .spyOn(service as any, 'getFileStats')
        .mockResolvedValueOnce(mockStats1)
        .mockResolvedValueOnce(mockStats2);

      const result = await service.checkVersions(rules);

      expect(result.size).toBe(2);
      expect(result.get('pricing/shipping-fees')).toBe(false); // Same version, no update needed
      expect(result.get('validation/order-validation')).toBe(true); // Different version, update needed
    });

    it('should handle missing files gracefully', async () => {
      const rules = new Map([['nonexistent/rule', '1640995200000']]);

      mockPath.join.mockReturnValue('/test/rules/nonexistent/rule.json');
      mockPath.resolve.mockImplementation((p: string) => p);

      // Mock getFileStats to throw error
      jest.spyOn(service as unknown, 'getFileStats').mockRejectedValue(new Error('File not found'));

      const result = await service.checkVersions(rules);

      expect(result.size).toBe(1);
      expect(result.get('nonexistent/rule')).toBe(true); // Mark as needing update
    });

    it('should use stat cache for performance', async () => {
      const rules = new Map([['pricing/shipping-fees', '1640995200000']]);

      const mockStats = { mtime: new Date(1640995200000), size: 1024 } as fs.Stats;

      mockPath.join.mockReturnValue('/test/rules/pricing/shipping-fees.json');
      mockPath.resolve.mockImplementation((p: string) => p);

      // Mock fs.stat to be called only once due to caching
      const statSpy = jest.spyOn(fs.promises, 'stat').mockResolvedValue(mockStats);

      // Call checkVersions twice
      await service.checkVersions(rules);
      await service.checkVersions(rules);

      // fs.stat should only be called once due to caching
      expect(statSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('refreshRule', () => {
    beforeEach(() => {
      service = new LocalRuleLoaderService(mockConfig);
    });

    it('should be an alias for loadRule', async () => {
      const mockRule = {
        id: 'test-rule',
        filePath: '/test/rules/test-rule.json',
        data: Buffer.from('{"nodes": [], "edges": []}'),
        metadata: {
          id: 'test-rule',
          version: '1.0.0',
          tags: [],
          lastModified: 1640995200000,
        },
      };

      mockPath.join.mockReturnValue('/test/rules/test-rule.json');
      mockPath.resolve.mockImplementation((p: string) => p);
      jest.spyOn(service['scanner'], 'loadRuleFile').mockResolvedValue(mockRule);

      const result = await service.refreshRule('test-rule');

      expect(result.data).toEqual(Buffer.from('{"nodes": [], "edges": []}'));
      expect(result.metadata.version).toBe('1.0.0');
    });
  });

  describe('utility methods', () => {
    beforeEach(() => {
      service = new LocalRuleLoaderService(mockConfig);
    });

    it('should clear stat cache', () => {
      // Add something to cache first
      service['statCache'].set('/test/path', {
        mtime: 1640995200000,
        size: 1024,
        timestamp: Date.now(),
      });

      expect(service['statCache'].size).toBe(1);

      service.clearStatCache();

      expect(service['statCache'].size).toBe(0);
    });

    it('should return rules path', () => {
      mockPath.resolve.mockReturnValue('/resolved/test/rules');
      const service = new LocalRuleLoaderService(mockConfig);

      expect(service.getRulesPath()).toBe('/resolved/test/rules');
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      service = new LocalRuleLoaderService(mockConfig);
    });

    it('should wrap non-MinimalGoRulesError in loadAllRules', async () => {
      const genericError = new Error('Generic file system error');
      jest.spyOn(service['scanner'], 'scanDirectory').mockRejectedValue(genericError);

      await expect(service.loadAllRules()).rejects.toThrow(MinimalGoRulesError);
    });

    it('should preserve MinimalGoRulesError in loadRule', async () => {
      const minimalError = new MinimalGoRulesError(
        MinimalErrorCode.RULE_NOT_FOUND,
        'Rule not found',
      );

      mockPath.join.mockReturnValue('/test/rules/missing.json');
      mockPath.resolve.mockImplementation((p: string) => p);
      jest.spyOn(service['scanner'], 'loadRuleFile').mockRejectedValue(minimalError);

      await expect(service.loadRule('missing')).rejects.toThrow(minimalError);
    });

    it('should handle configuration validation errors', () => {
      const invalidConfig = {
        ruleSource: 'local' as const,
        localRulesPath: '', // Invalid empty path
      };

      // Mock validation to return errors
      mockValidateHybridConfig.mockReturnValueOnce({
        isValid: false,
        errors: ['localRulesPath must be a non-empty string'],
      });

      expect(() => new LocalRuleLoaderService(invalidConfig)).toThrow(MinimalGoRulesError);
    });
  });
});
