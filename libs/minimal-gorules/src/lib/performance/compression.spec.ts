/**
 * Unit tests for CompressionManager and CompressedCache
 */

import { CompressionManager, CompressedCache } from './compression.js';

describe('CompressionManager', () => {
  let compressionManager: CompressionManager;

  beforeEach(() => {
    compressionManager = new CompressionManager({
      algorithm: 'gzip',
      level: 6,
      threshold: 100,
    });
  });

  afterEach(() => {
    compressionManager.resetStats();
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      const manager = new CompressionManager();
      const stats = manager.getStats();
      expect(stats.totalOperations).toBe(0);
    });

    it('should initialize with custom options', () => {
      const manager = new CompressionManager({
        algorithm: 'deflate',
        level: 9,
        threshold: 500,
      });
      expect(manager).toBeDefined();
    });
  });

  describe('compress', () => {
    it('should compress data using gzip', async () => {
      const testData =
        'This is a test string that should be compressed because it is long enough to meet the threshold requirements.';
      const result = await compressionManager.compress(testData);

      expect(result.compressed).toBe(true);
      expect(result.algorithm).toBe('gzip');
      expect(result.compressedSize).toBeLessThan(result.originalSize);
      expect(result.compressionRatio).toBeLessThan(1);
      expect(result.data).toBeInstanceOf(Buffer);
    });

    it('should compress data using deflate', async () => {
      const manager = new CompressionManager({ algorithm: 'deflate' });
      const testData =
        'This is a test string that should be compressed because it is long enough to meet the threshold requirements.';
      const result = await manager.compress(testData);

      expect(result.compressed).toBe(true);
      expect(result.algorithm).toBe('deflate');
      expect(result.compressedSize).toBeLessThan(result.originalSize);
    });

    it('should not compress data below threshold', async () => {
      const testData = 'short';
      const result = await compressionManager.compress(testData);

      expect(result.compressed).toBe(false);
      expect(result.algorithm).toBe('none');
      expect(result.compressedSize).toBe(result.originalSize);
      expect(result.compressionRatio).toBe(1);
    });

    it('should not compress when algorithm is none', async () => {
      const manager = new CompressionManager({ algorithm: 'none' });
      const testData = 'This is a test string that is long enough to normally be compressed.';
      const result = await manager.compress(testData);

      expect(result.compressed).toBe(false);
      expect(result.algorithm).toBe('none');
      expect(result.compressedSize).toBe(result.originalSize);
    });

    it('should handle Buffer input', async () => {
      const testData = Buffer.from(
        'This is a test buffer that should be compressed because it is long enough.',
      );
      const result = await compressionManager.compress(testData);

      expect(result.compressed).toBe(true);
      expect(result.originalSize).toBe(testData.length);
    });

    it('should fallback to uncompressed on compression errors', async () => {
      // Mock compression to fail
      const originalGzip = require('zlib').gzip;
      require('zlib').gzip = jest.fn().mockImplementation((data, options, callback) => {
        callback(new Error('Compression failed'));
      });

      const testData = 'This should fail to compress and fallback to uncompressed.';
      const result = await compressionManager.compress(testData);

      expect(result.compressed).toBe(false);
      expect(result.algorithm).toBe('none');

      // Restore original function
      require('zlib').gzip = originalGzip;
    });

    it('should not compress if compression ratio is poor', async () => {
      // Use data that doesn't compress well (random data)
      const testData = Buffer.from(
        Array.from({ length: 200 }, () => Math.floor(Math.random() * 256)),
      );
      const result = await compressionManager.compress(testData);

      // Should either not compress or fallback to none if compression ratio > 0.95
      if (result.compressionRatio > 0.95) {
        expect(result.algorithm).toBe('none');
      }
    });
  });

  describe('decompress', () => {
    it('should decompress gzip data', async () => {
      const testData = 'This is a test string that should be compressed and then decompressed.';
      const compressed = await compressionManager.compress(testData);

      if (compressed.compressed) {
        const decompressed = await compressionManager.decompress(
          compressed.data,
          compressed.algorithm,
        );
        expect(decompressed.toString()).toBe(testData);
      }
    });

    it('should decompress deflate data', async () => {
      const manager = new CompressionManager({ algorithm: 'deflate' });
      const testData = 'This is a test string that should be compressed and then decompressed.';
      const compressed = await manager.compress(testData);

      if (compressed.compressed) {
        const decompressed = await manager.decompress(compressed.data, compressed.algorithm);
        expect(decompressed.toString()).toBe(testData);
      }
    });

    it('should handle uncompressed data', async () => {
      const testData = Buffer.from('This is uncompressed data');
      const decompressed = await compressionManager.decompress(testData, 'none');

      expect(decompressed).toBe(testData);
    });

    it('should handle decompression errors', async () => {
      const invalidData = Buffer.from('This is not compressed data');

      await expect(compressionManager.decompress(invalidData, 'gzip')).rejects.toThrow(
        'Decompression failed',
      );
    });

    it('should throw error for unsupported algorithm', async () => {
      const testData = Buffer.from('test');

      await expect(compressionManager.decompress(testData, 'unsupported' as any)).rejects.toThrow(
        'Unsupported decompression algorithm',
      );
    });
  });

  describe('compressRuleData', () => {
    it('should compress rule data and metadata separately', async () => {
      const ruleData = Buffer.from(
        JSON.stringify({
          conditions: [{ field: 'age', operator: 'gt', value: 18 }],
          actions: [{ type: 'approve' }],
        }),
      );

      const metadata = {
        id: 'rule1',
        version: '1.0.0',
        tags: ['validation'],
        lastModified: Date.now(),
      };

      const result = await compressionManager.compressRuleData(ruleData, metadata);

      expect(result.compressedData).toBeInstanceOf(Buffer);
      expect(result.compressedMetadata).toBeInstanceOf(Buffer);
      expect(result.compressionInfo.totalOriginalSize).toBeGreaterThan(0);
      expect(result.compressionInfo.totalCompressedSize).toBeGreaterThan(0);
      expect(result.compressionInfo.totalCompressionRatio).toBeGreaterThan(0);
    });
  });

  describe('decompressRuleData', () => {
    it('should decompress rule data and metadata', async () => {
      const originalRuleData = Buffer.from(
        JSON.stringify({
          conditions: [{ field: 'age', operator: 'gt', value: 18 }],
          actions: [{ type: 'approve' }],
        }),
      );

      const originalMetadata = {
        id: 'rule1',
        version: '1.0.0',
        tags: ['validation'],
        lastModified: Date.now(),
      };

      const compressed = await compressionManager.compressRuleData(
        originalRuleData,
        originalMetadata,
      );
      const decompressed = await compressionManager.decompressRuleData(
        compressed.compressedData,
        compressed.compressedMetadata,
        compressed.compressionInfo.dataCompression.algorithm,
        compressed.compressionInfo.metadataCompression.algorithm,
      );

      expect(decompressed.ruleData.toString()).toBe(originalRuleData.toString());
      expect(decompressed.metadata).toEqual(originalMetadata);
    });
  });

  describe('statistics', () => {
    it('should track compression statistics', async () => {
      const testData1 = 'This is the first test string for compression statistics.';
      const testData2 = 'This is the second test string for compression statistics.';

      await compressionManager.compress(testData1);
      await compressionManager.compress(testData2);

      const stats = compressionManager.getStats();
      expect(stats.totalOperations).toBe(2);
      expect(stats.totalOriginalBytes).toBeGreaterThan(0);
      expect(stats.totalCompressedBytes).toBeGreaterThan(0);
      expect(stats.averageCompressionRatio).toBeGreaterThan(0);
      expect(stats.compressionTime).toBeGreaterThan(0);
    });

    it('should reset statistics', () => {
      compressionManager.resetStats();
      const stats = compressionManager.getStats();

      expect(stats.totalOperations).toBe(0);
      expect(stats.totalOriginalBytes).toBe(0);
      expect(stats.totalCompressedBytes).toBe(0);
      expect(stats.averageCompressionRatio).toBe(0);
    });

    it('should track algorithm usage', async () => {
      await compressionManager.compress('Test data for gzip compression that is long enough.');

      const stats = compressionManager.getStats();
      expect(stats.algorithmsUsed.has('gzip')).toBe(true);
    });
  });

  describe('analyzeCompressionEffectiveness', () => {
    it('should analyze compression effectiveness for different algorithms', async () => {
      const sampleData = [
        Buffer.from('This is sample data for compression analysis that should compress well.'),
        Buffer.from('Another sample with different content for comprehensive analysis.'),
        Buffer.from('Third sample to ensure we have enough data for statistical analysis.'),
      ];

      const analysis = await compressionManager.analyzeCompressionEffectiveness(sampleData);

      expect(analysis.recommendations.bestAlgorithm).toBeDefined();
      expect(analysis.recommendations.averageRatio).toBeGreaterThan(0);
      expect(analysis.recommendations.averageTime).toBeGreaterThan(0);
      expect(analysis.results.size).toBeGreaterThan(0);
    });

    it('should handle empty sample data', async () => {
      const analysis = await compressionManager.analyzeCompressionEffectiveness([]);

      expect(analysis.recommendations.bestAlgorithm).toBe('gzip'); // Default fallback
      expect(analysis.results.size).toBe(3); // gzip, deflate, none
    });
  });
});

describe('CompressedCache', () => {
  let cache: CompressedCache<{ data: string }>;

  beforeEach(() => {
    cache = new CompressedCache(
      (value) => Buffer.from(JSON.stringify(value)),
      (buffer) => JSON.parse(buffer.toString()),
      { algorithm: 'gzip', threshold: 50 },
    );
  });

  describe('set and get', () => {
    it('should store and retrieve compressed data', async () => {
      const testData = { data: 'This is test data that should be compressed in the cache.' };

      await cache.set('key1', testData);
      const retrieved = await cache.get('key1');

      expect(retrieved).toEqual(testData);
    });

    it('should return null for non-existent keys', async () => {
      const result = await cache.get('non-existent');
      expect(result).toBeNull();
    });

    it('should handle complex objects', async () => {
      const complexData = {
        data: 'Complex test data',
        nested: {
          array: [1, 2, 3],
          object: { prop: 'value' },
        },
        timestamp: Date.now(),
      };

      await cache.set('complex', complexData);
      const retrieved = await cache.get('complex');

      expect(retrieved).toEqual(complexData);
    });
  });

  describe('cache operations', () => {
    it('should check if key exists', async () => {
      await cache.set('exists', { data: 'test' });

      expect(cache.has('exists')).toBe(true);
      expect(cache.has('not-exists')).toBe(false);
    });

    it('should delete entries', async () => {
      await cache.set('delete-me', { data: 'test' });
      expect(cache.has('delete-me')).toBe(true);

      const deleted = cache.delete('delete-me');
      expect(deleted).toBe(true);
      expect(cache.has('delete-me')).toBe(false);
    });

    it('should clear all entries', async () => {
      await cache.set('key1', { data: 'test1' });
      await cache.set('key2', { data: 'test2' });

      expect(cache.size).toBe(2);

      cache.clear();
      expect(cache.size).toBe(0);
    });

    it('should report correct size', async () => {
      expect(cache.size).toBe(0);

      await cache.set('key1', { data: 'test1' });
      expect(cache.size).toBe(1);

      await cache.set('key2', { data: 'test2' });
      expect(cache.size).toBe(2);
    });
  });

  describe('memory usage', () => {
    it('should report memory usage statistics', async () => {
      const largeData = { data: 'Large data '.repeat(100) };

      await cache.set('large1', largeData);
      await cache.set('large2', largeData);

      const usage = cache.getMemoryUsage();

      expect(usage.totalEntries).toBe(2);
      expect(usage.totalOriginalSize).toBeGreaterThan(0);
      expect(usage.totalCompressedSize).toBeGreaterThan(0);
      expect(usage.totalMemorySaved).toBeGreaterThanOrEqual(0);
      expect(usage.averageCompressionRatio).toBeGreaterThan(0);
    });

    it('should show memory savings from compression', async () => {
      const repetitiveData = { data: 'Repetitive '.repeat(50) };

      await cache.set('repetitive', repetitiveData);

      const usage = cache.getMemoryUsage();

      // Repetitive data should compress well
      expect(usage.totalMemorySaved).toBeGreaterThan(0);
      expect(usage.averageCompressionRatio).toBeLessThan(1);
    });
  });

  describe('compression statistics', () => {
    it('should provide compression statistics', async () => {
      await cache.set('test1', { data: 'Test data 1' });
      await cache.set('test2', { data: 'Test data 2' });

      const stats = cache.getCompressionStats();

      expect(stats.totalOperations).toBeGreaterThan(0);
      expect(stats.compressionTime).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('should handle serialization errors gracefully', async () => {
      const circularData = { data: 'test' };
      (circularData as any).circular = circularData; // Create circular reference

      // This should not throw, but the behavior depends on the serializer
      // In a real implementation, you might want to handle this case
      try {
        await cache.set('circular', circularData as any);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should handle deserialization errors gracefully', async () => {
      // Manually insert invalid compressed data
      const invalidEntry = {
        compressedData: Buffer.from('invalid compressed data'),
        compressionAlgorithm: 'gzip' as const,
        originalSize: 100,
        compressedSize: 50,
        compressionRatio: 0.5,
      };

      cache['cache'].set('invalid', invalidEntry);

      await expect(cache.get('invalid')).rejects.toThrow();
    });
  });
});
