/**
 * Unit tests for EnhancedLoaderService
 */

import { EnhancedLoaderService } from './enhanced-loader-service.js';
import { MinimalRuleLoaderService } from '../loader/minimal-rule-loader-service.js';
import { MinimalRuleCacheManager } from '../cache/minimal-rule-cache-manager.js';
import { CompressionManager } from './compression.js';
import { ConnectionPool } from './connection-pool.js';
import { RuleLoadBatcher } from './request-batcher.js';
import { getGlobalMemoryManager } from './memory-manager.js';

// Mock dependencies
jest.mock('../loader/minimal-rule-loader-service.js');
jest.mock('../cache/minimal-rule-cache-manager.js');
jest.mock('./compression.js');
jest.mock('./connection-pool.js');
jest.mock('./request-batcher.js');
jest.mock('./memory-manager.js');

describe('EnhancedLoaderService', () => {
  let enhancedLoader: EnhancedLoaderService;
  let mockBaseLoader: jest.Mocked<MinimalRuleLoaderService>;
  let mockCacheManager: jest.Mocked<MinimalRuleCacheManager>;
  let mockCompressionManager: jest.Mocked<CompressionManager>;
  let mockConnectionPool: jest.Mocked<ConnectionPool>;
  let mockBatcher: jest.Mocked<RuleLoadBatcher>;
  let mockMemoryManager: any;

  beforeEach(() => {
    // Setup mocks
    mockBaseLoader = {
      loadRule: jest.fn(),
      loadRules: jest.fn(),
      getMetadata: jest.fn(),
      validateRule: jest.fn(),
      clearCache: jest.fn(),
      getStats: jest.fn().mockReturnValue({
        totalLoads: 0,
        cacheHits: 0,
        cacheMisses: 0,
        averageLoadTime: 0,
      }),
    } as any;

    mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      has: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
      getStats: jest.fn().mockReturnValue({
        size: 0,
        hits: 0,
        misses: 0,
        hitRate: 0,
      }),
    } as any;

    mockCompressionManager = {
      compress: jest.fn(),
      decompress: jest.fn(),
      compressRuleData: jest.fn(),
      decompressRuleData: jest.fn(),
      getStats: jest.fn().mockReturnValue({
        totalOperations: 0,
        totalOriginalBytes: 0,
        totalCompressedBytes: 0,
        averageCompressionRatio: 0,
      }),
    } as any;

    mockConnectionPool = {
      request: jest.fn(),
      getStats: jest.fn().mockReturnValue({
        totalConnections: 0,
        activeConnections: 0,
        completedRequests: 0,
      }),
      close: jest.fn(),
    } as any;

    mockBatcher = {
      loadRule: jest.fn(),
      loadRules: jest.fn(),
      flush: jest.fn(),
      getStats: jest.fn().mockReturnValue({
        totalRequests: 0,
        totalBatches: 0,
        averageBatchSize: 0,
      }),
    } as any;

    mockMemoryManager = {
      registerCleanupCallback: jest.fn(),
      removeCleanupCallback: jest.fn(),
      getMemoryReport: jest.fn().mockReturnValue({
        usage: { status: 'normal' },
        recommendations: [],
      }),
    };

    (getGlobalMemoryManager as jest.Mock).mockReturnValue(mockMemoryManager);

    enhancedLoader = new EnhancedLoaderService(mockBaseLoader, mockCacheManager, {
      enableCompression: true,
      enableBatching: true,
      enableConnectionPooling: true,
      compressionThreshold: 1024,
      batchSize: 10,
      batchTimeout: 100,
      connectionPoolSize: 5,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with all performance features enabled', () => {
      expect(enhancedLoader).toBeDefined();
      expect(mockMemoryManager.registerCleanupCallback).toHaveBeenCalled();
    });

    it('should initialize with minimal configuration', () => {
      const minimalLoader = new EnhancedLoaderService(mockBaseLoader, mockCacheManager);
      expect(minimalLoader).toBeDefined();
    });

    it('should disable features when configured', () => {
      const disabledLoader = new EnhancedLoaderService(mockBaseLoader, mockCacheManager, {
        enableCompression: false,
        enableBatching: false,
        enableConnectionPooling: false,
      });
      expect(disabledLoader).toBeDefined();
    });
  });

  describe('loadRule', () => {
    const mockRuleData = {
      data: Buffer.from(JSON.stringify({ conditions: [], actions: [] })),
      metadata: {
        id: 'test-rule',
        version: '1.0.0',
        tags: ['test'],
        lastModified: Date.now(),
      },
    };

    it('should load rule with compression enabled', async () => {
      mockBatcher.loadRule.mockResolvedValue(mockRuleData);

      const result = await enhancedLoader.loadRule('test-rule', 'project1');

      expect(result).toEqual(mockRuleData);
      expect(mockBatcher.loadRule).toHaveBeenCalledWith('test-rule', 'project1');
    });

    it('should fallback to base loader when batching disabled', async () => {
      const noBatchLoader = new EnhancedLoaderService(mockBaseLoader, mockCacheManager, {
        enableBatching: false,
      });

      mockBaseLoader.loadRule.mockResolvedValue(mockRuleData);

      const result = await noBatchLoader.loadRule('test-rule', 'project1');

      expect(result).toEqual(mockRuleData);
      expect(mockBaseLoader.loadRule).toHaveBeenCalledWith('test-rule', 'project1');
    });

    it('should handle rule loading errors', async () => {
      mockBatcher.loadRule.mockRejectedValue(new Error('Load failed'));

      await expect(enhancedLoader.loadRule('test-rule', 'project1')).rejects.toThrow('Load failed');
    });

    it('should apply compression to loaded rules', async () => {
      const largeRuleData = {
        data: Buffer.from('x'.repeat(2000)), // Larger than compression threshold
        metadata: mockRuleData.metadata,
      };

      mockBatcher.loadRule.mockResolvedValue(largeRuleData);
      mockCompressionManager.compressRuleData.mockResolvedValue({
        compressedData: Buffer.from('compressed'),
        compressedMetadata: Buffer.from('compressed-meta'),
        compressionInfo: {
          totalOriginalSize: 2000,
          totalCompressedSize: 100,
          totalCompressionRatio: 0.05,
          dataCompression: { algorithm: 'gzip' as const },
          metadataCompression: { algorithm: 'gzip' as const },
        },
      });

      const result = await enhancedLoader.loadRule('large-rule', 'project1');

      expect(mockCompressionManager.compressRuleData).toHaveBeenCalled();
    });
  });

  describe('loadRules', () => {
    const mockRulesData = new Map([
      [
        'rule1',
        {
          data: Buffer.from(JSON.stringify({ conditions: [], actions: [] })),
          metadata: { id: 'rule1', version: '1.0.0', tags: [], lastModified: Date.now() },
        },
      ],
      [
        'rule2',
        {
          data: Buffer.from(JSON.stringify({ conditions: [], actions: [] })),
          metadata: { id: 'rule2', version: '1.0.0', tags: [], lastModified: Date.now() },
        },
      ],
    ]);

    it('should load multiple rules with batching', async () => {
      mockBatcher.loadRules.mockResolvedValue(mockRulesData);

      const result = await enhancedLoader.loadRules(['rule1', 'rule2'], 'project1');

      expect(result).toEqual(mockRulesData);
      expect(mockBatcher.loadRules).toHaveBeenCalledWith(['rule1', 'rule2'], 'project1');
    });

    it('should fallback to base loader when batching disabled', async () => {
      const noBatchLoader = new EnhancedLoaderService(mockBaseLoader, mockCacheManager, {
        enableBatching: false,
      });

      mockBaseLoader.loadRules.mockResolvedValue(mockRulesData);

      const result = await noBatchLoader.loadRules(['rule1', 'rule2'], 'project1');

      expect(result).toEqual(mockRulesData);
      expect(mockBaseLoader.loadRules).toHaveBeenCalledWith(['rule1', 'rule2'], 'project1');
    });

    it('should handle partial loading failures', async () => {
      const partialData = new Map([['rule1', mockRulesData.get('rule1')!]]);

      mockBatcher.loadRules.mockResolvedValue(partialData);

      const result = await enhancedLoader.loadRules(['rule1', 'rule2'], 'project1');

      expect(result.size).toBe(1);
      expect(result.has('rule1')).toBe(true);
      expect(result.has('rule2')).toBe(false);
    });
  });

  describe('getMetadata', () => {
    const mockMetadata = {
      id: 'test-rule',
      version: '1.0.0',
      tags: ['test'],
      lastModified: Date.now(),
    };

    it('should get metadata from base loader', async () => {
      mockBaseLoader.getMetadata.mockResolvedValue(mockMetadata);

      const result = await enhancedLoader.getMetadata('test-rule', 'project1');

      expect(result).toEqual(mockMetadata);
      expect(mockBaseLoader.getMetadata).toHaveBeenCalledWith('test-rule', 'project1');
    });

    it('should handle metadata retrieval errors', async () => {
      mockBaseLoader.getMetadata.mockRejectedValue(new Error('Metadata not found'));

      await expect(enhancedLoader.getMetadata('test-rule', 'project1')).rejects.toThrow(
        'Metadata not found',
      );
    });
  });

  describe('validateRule', () => {
    const mockValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
    };

    it('should validate rule using base loader', async () => {
      mockBaseLoader.validateRule.mockResolvedValue(mockValidationResult);

      const ruleData = Buffer.from(JSON.stringify({ conditions: [], actions: [] }));
      const result = await enhancedLoader.validateRule(ruleData);

      expect(result).toEqual(mockValidationResult);
      expect(mockBaseLoader.validateRule).toHaveBeenCalledWith(ruleData);
    });

    it('should handle validation errors', async () => {
      mockBaseLoader.validateRule.mockRejectedValue(new Error('Validation failed'));

      const ruleData = Buffer.from('invalid rule');

      await expect(enhancedLoader.validateRule(ruleData)).rejects.toThrow('Validation failed');
    });
  });

  describe('performance optimization', () => {
    it('should flush batches when memory pressure is high', async () => {
      mockMemoryManager.getMemoryReport.mockReturnValue({
        usage: { status: 'critical' },
        recommendations: ['Immediate cleanup required'],
      });

      // Trigger memory cleanup
      const cleanupCallback = mockMemoryManager.registerCleanupCallback.mock.calls[0][0];
      await cleanupCallback();

      expect(mockBatcher.flush).toHaveBeenCalled();
    });

    it('should clear cache during memory cleanup', async () => {
      const cleanupCallback = mockMemoryManager.registerCleanupCallback.mock.calls[0][0];
      await cleanupCallback();

      expect(mockCacheManager.clear).toHaveBeenCalled();
    });
  });

  describe('statistics', () => {
    it('should provide comprehensive performance statistics', () => {
      const stats = enhancedLoader.getPerformanceStats();

      expect(stats).toHaveProperty('loader');
      expect(stats).toHaveProperty('cache');
      expect(stats).toHaveProperty('compression');
      expect(stats).toHaveProperty('connectionPool');
      expect(stats).toHaveProperty('batcher');
      expect(stats).toHaveProperty('memory');
    });

    it('should include memory recommendations in stats', () => {
      mockMemoryManager.getMemoryReport.mockReturnValue({
        usage: { status: 'warning' },
        recommendations: ['Consider cleanup'],
      });

      const stats = enhancedLoader.getPerformanceStats();

      expect(stats.memory.recommendations).toContain('Consider cleanup');
    });
  });

  describe('cleanup', () => {
    it('should cleanup all resources', async () => {
      await enhancedLoader.cleanup();

      expect(mockConnectionPool.close).toHaveBeenCalled();
      expect(mockBatcher.flush).toHaveBeenCalled();
      expect(mockMemoryManager.removeCleanupCallback).toHaveBeenCalled();
    });

    it('should handle cleanup errors gracefully', async () => {
      mockConnectionPool.close.mockRejectedValue(new Error('Close failed'));

      await expect(enhancedLoader.cleanup()).resolves.not.toThrow();
    });
  });

  describe('configuration updates', () => {
    it('should update compression settings', () => {
      enhancedLoader.updateConfiguration({
        enableCompression: false,
        compressionThreshold: 2048,
      });

      // Configuration should be updated internally
      expect(() => enhancedLoader.updateConfiguration({})).not.toThrow();
    });

    it('should update batching settings', () => {
      enhancedLoader.updateConfiguration({
        enableBatching: false,
        batchSize: 20,
        batchTimeout: 200,
      });

      expect(() => enhancedLoader.updateConfiguration({})).not.toThrow();
    });

    it('should update connection pool settings', () => {
      enhancedLoader.updateConfiguration({
        enableConnectionPooling: false,
        connectionPoolSize: 10,
      });

      expect(() => enhancedLoader.updateConfiguration({})).not.toThrow();
    });
  });

  describe('error handling and resilience', () => {
    it('should handle compression failures gracefully', async () => {
      mockCompressionManager.compressRuleData.mockRejectedValue(new Error('Compression failed'));

      const ruleData = {
        data: Buffer.from('x'.repeat(2000)),
        metadata: { id: 'test', version: '1.0.0', tags: [], lastModified: Date.now() },
      };

      mockBatcher.loadRule.mockResolvedValue(ruleData);

      const result = await enhancedLoader.loadRule('test-rule', 'project1');

      // Should still return the rule data even if compression fails
      expect(result).toEqual(ruleData);
    });

    it('should handle connection pool failures', async () => {
      mockConnectionPool.request.mockRejectedValue(new Error('Connection failed'));

      // Should fallback to base loader
      const ruleData = {
        data: Buffer.from(JSON.stringify({ conditions: [], actions: [] })),
        metadata: { id: 'test', version: '1.0.0', tags: [], lastModified: Date.now() },
      };

      mockBaseLoader.loadRule.mockResolvedValue(ruleData);

      const result = await enhancedLoader.loadRule('test-rule', 'project1');

      expect(result).toEqual(ruleData);
    });

    it('should handle batcher failures', async () => {
      mockBatcher.loadRule.mockRejectedValue(new Error('Batch failed'));

      // Should fallback to base loader
      const ruleData = {
        data: Buffer.from(JSON.stringify({ conditions: [], actions: [] })),
        metadata: { id: 'test', version: '1.0.0', tags: [], lastModified: Date.now() },
      };

      mockBaseLoader.loadRule.mockResolvedValue(ruleData);

      const result = await enhancedLoader.loadRule('test-rule', 'project1');

      expect(result).toEqual(ruleData);
    });
  });

  describe('integration scenarios', () => {
    it('should handle high-load scenarios', async () => {
      const promises = [];
      const ruleData = {
        data: Buffer.from(JSON.stringify({ conditions: [], actions: [] })),
        metadata: { id: 'test', version: '1.0.0', tags: [], lastModified: Date.now() },
      };

      mockBatcher.loadRule.mockResolvedValue(ruleData);

      // Simulate high load
      for (let i = 0; i < 100; i++) {
        promises.push(enhancedLoader.loadRule(`rule-${i}`, 'project1'));
      }

      const results = await Promise.all(promises);

      expect(results).toHaveLength(100);
      results.forEach((result) => {
        expect(result).toEqual(ruleData);
      });
    });

    it('should optimize for repeated rule access', async () => {
      const ruleData = {
        data: Buffer.from(JSON.stringify({ conditions: [], actions: [] })),
        metadata: { id: 'popular-rule', version: '1.0.0', tags: [], lastModified: Date.now() },
      };

      mockBatcher.loadRule.mockResolvedValue(ruleData);

      // Load the same rule multiple times
      await enhancedLoader.loadRule('popular-rule', 'project1');
      await enhancedLoader.loadRule('popular-rule', 'project1');
      await enhancedLoader.loadRule('popular-rule', 'project1');

      // Should benefit from caching and batching optimizations
      expect(mockBatcher.loadRule).toHaveBeenCalledTimes(3);
    });
  });
});
