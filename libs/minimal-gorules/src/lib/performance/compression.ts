/**
 * Compression utilities for rule data storage and transfer
 * Provides efficient compression/decompression for rule data
 */

import { gzip, gunzip, deflate, inflate } from 'zlib';
import { promisify } from 'util';

// Promisify zlib functions
const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);
const deflateAsync = promisify(deflate);
const inflateAsync = promisify(inflate);

/**
 * Compression algorithm types
 */
export type CompressionAlgorithm = 'gzip' | 'deflate' | 'none';

/**
 * Compression options
 */
export interface CompressionOptions {
  algorithm: CompressionAlgorithm;
  level?: number; // 1-9, higher = better compression but slower
  threshold?: number; // Minimum size to compress (bytes)
}

/**
 * Compression result
 */
export interface CompressionResult {
  data: Buffer;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  algorithm: CompressionAlgorithm;
  compressed: boolean;
}

/**
 * Compression statistics
 */
export interface CompressionStats {
  totalOperations: number;
  totalOriginalBytes: number;
  totalCompressedBytes: number;
  averageCompressionRatio: number;
  compressionTime: number;
  decompressionTime: number;
  algorithmsUsed: Map<CompressionAlgorithm, number>;
}

/**
 * Compression utility class
 */
export class CompressionManager {
  private stats: CompressionStats = {
    totalOperations: 0,
    totalOriginalBytes: 0,
    totalCompressedBytes: 0,
    averageCompressionRatio: 0,
    compressionTime: 0,
    decompressionTime: 0,
    algorithmsUsed: new Map()
  };

  private defaultOptions: CompressionOptions = {
    algorithm: 'gzip',
    level: 6,
    threshold: 1024 // Don't compress data smaller than 1KB
  };

  constructor(defaultOptions: Partial<CompressionOptions> = {}) {
    this.defaultOptions = { ...this.defaultOptions, ...defaultOptions };
  }

  /**
   * Compress data using the specified algorithm
   */
  async compress(
    data: Buffer | string,
    options: Partial<CompressionOptions> = {}
  ): Promise<CompressionResult> {
    const opts = { ...this.defaultOptions, ...options };
    const inputBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
    const originalSize = inputBuffer.length;

    const startTime = performance.now();

    try {
      // Check if data is below compression threshold
      if (originalSize < (opts.threshold || 0)) {
        return {
          data: inputBuffer,
          originalSize,
          compressedSize: originalSize,
          compressionRatio: 1.0,
          algorithm: 'none',
          compressed: false
        };
      }

      let compressedData: Buffer;
      let algorithm = opts.algorithm;

      switch (algorithm) {
        case 'gzip':
          compressedData = await gzipAsync(inputBuffer, { level: opts.level });
          break;
        case 'deflate':
          compressedData = await deflateAsync(inputBuffer, { level: opts.level });
          break;
        case 'none':
          compressedData = inputBuffer;
          break;
        default:
          throw new Error(`Unsupported compression algorithm: ${algorithm}`);
      }

      const compressedSize = compressedData.length;
      const compressionRatio = compressedSize / originalSize;

      // If compression didn't help much, return uncompressed
      if (compressionRatio > 0.95 && algorithm !== 'none') {
        algorithm = 'none';
        compressedData = inputBuffer;
      }

      const compressionTime = performance.now() - startTime;

      // Update statistics
      this.updateCompressionStats(originalSize, compressedData.length, compressionTime, algorithm);

      return {
        data: compressedData,
        originalSize,
        compressedSize: compressedData.length,
        compressionRatio: compressedData.length / originalSize,
        algorithm,
        compressed: algorithm !== 'none'
      };

    } catch (error) {
      // Fallback to uncompressed on error
      const compressionTime = performance.now() - startTime;
      this.updateCompressionStats(originalSize, originalSize, compressionTime, 'none');

      return {
        data: inputBuffer,
        originalSize,
        compressedSize: originalSize,
        compressionRatio: 1.0,
        algorithm: 'none',
        compressed: false
      };
    }
  }

  /**
   * Decompress data using the specified algorithm
   */
  async decompress(
    compressedData: Buffer,
    algorithm: CompressionAlgorithm
  ): Promise<Buffer> {
    const startTime = performance.now();

    try {
      let decompressedData: Buffer;

      switch (algorithm) {
        case 'gzip':
          decompressedData = await gunzipAsync(compressedData);
          break;
        case 'deflate':
          decompressedData = await inflateAsync(compressedData);
          break;
        case 'none':
          decompressedData = compressedData;
          break;
        default:
          throw new Error(`Unsupported decompression algorithm: ${algorithm}`);
      }

      const decompressionTime = performance.now() - startTime;
      this.stats.decompressionTime += decompressionTime;

      return decompressedData;

    } catch (error) {
      throw new Error(`Decompression failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Compress rule data with metadata
   */
  async compressRuleData(
    ruleData: Buffer,
    metadata: Record<string, unknown>,
    options: Partial<CompressionOptions> = {}
  ): Promise<{
    compressedData: Buffer;
    compressedMetadata: Buffer;
    compressionInfo: {
      dataCompression: CompressionResult;
      metadataCompression: CompressionResult;
      totalOriginalSize: number;
      totalCompressedSize: number;
      totalCompressionRatio: number;
    };
  }> {
    // Compress rule data
    const dataCompression = await this.compress(ruleData, options);

    // Compress metadata (serialize to JSON first)
    const metadataJson = JSON.stringify(metadata);
    const metadataCompression = await this.compress(metadataJson, {
      ...options,
      threshold: 256 // Lower threshold for metadata
    });

    const totalOriginalSize = dataCompression.originalSize + metadataCompression.originalSize;
    const totalCompressedSize = dataCompression.compressedSize + metadataCompression.compressedSize;

    return {
      compressedData: dataCompression.data,
      compressedMetadata: metadataCompression.data,
      compressionInfo: {
        dataCompression,
        metadataCompression,
        totalOriginalSize,
        totalCompressedSize,
        totalCompressionRatio: totalCompressedSize / totalOriginalSize
      }
    };
  }

  /**
   * Decompress rule data with metadata
   */
  async decompressRuleData(
    compressedData: Buffer,
    compressedMetadata: Buffer,
    dataAlgorithm: CompressionAlgorithm,
    metadataAlgorithm: CompressionAlgorithm
  ): Promise<{
    ruleData: Buffer;
    metadata: Record<string, unknown>;
  }> {
    // Decompress rule data
    const ruleData = await this.decompress(compressedData, dataAlgorithm);

    // Decompress metadata
    const metadataBuffer = await this.decompress(compressedMetadata, metadataAlgorithm);
    const metadata = JSON.parse(metadataBuffer.toString('utf8'));

    return {
      ruleData,
      metadata
    };
  }

  /**
   * Get compression statistics
   */
  getStats(): CompressionStats {
    return { 
      ...this.stats,
      algorithmsUsed: new Map(this.stats.algorithmsUsed)
    };
  }

  /**
   * Reset compression statistics
   */
  resetStats(): void {
    this.stats = {
      totalOperations: 0,
      totalOriginalBytes: 0,
      totalCompressedBytes: 0,
      averageCompressionRatio: 0,
      compressionTime: 0,
      decompressionTime: 0,
      algorithmsUsed: new Map()
    };
  }

  /**
   * Analyze compression effectiveness for different algorithms
   */
  async analyzeCompressionEffectiveness(
    sampleData: Buffer[]
  ): Promise<{
    recommendations: {
      bestAlgorithm: CompressionAlgorithm;
      averageRatio: number;
      averageTime: number;
    };
    results: Map<CompressionAlgorithm, {
      averageRatio: number;
      averageTime: number;
      totalSavings: number;
    }>;
  }> {
    const algorithms: CompressionAlgorithm[] = ['gzip', 'deflate', 'none'];
    const results = new Map<CompressionAlgorithm, {
      averageRatio: number;
      averageTime: number;
      totalSavings: number;
    }>();

    for (const algorithm of algorithms) {
      const ratios: number[] = [];
      const times: number[] = [];
      let totalOriginal = 0;
      let totalCompressed = 0;

      for (const data of sampleData) {
        const startTime = performance.now();
        const result = await this.compress(data, { algorithm, level: 6 });
        const endTime = performance.now();

        ratios.push(result.compressionRatio);
        times.push(endTime - startTime);
        totalOriginal += result.originalSize;
        totalCompressed += result.compressedSize;
      }

      const averageRatio = ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length;
      const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const totalSavings = totalOriginal - totalCompressed;

      results.set(algorithm, {
        averageRatio,
        averageTime,
        totalSavings
      });
    }

    // Find best algorithm (balance between compression ratio and time)
    let bestAlgorithm: CompressionAlgorithm = 'gzip';
    let bestScore = 0;

    for (const [algorithm, stats] of results) {
      // Score = compression savings / time (higher is better)
      const score = algorithm === 'none' ? 0 : (1 - stats.averageRatio) / (stats.averageTime + 1);
      if (score > bestScore) {
        bestScore = score;
        bestAlgorithm = algorithm;
      }
    }

    const bestStats = results.get(bestAlgorithm)!;

    return {
      recommendations: {
        bestAlgorithm,
        averageRatio: bestStats.averageRatio,
        averageTime: bestStats.averageTime
      },
      results
    };
  }

  /**
   * Update compression statistics
   */
  private updateCompressionStats(
    originalSize: number,
    compressedSize: number,
    compressionTime: number,
    algorithm: CompressionAlgorithm
  ): void {
    this.stats.totalOperations++;
    this.stats.totalOriginalBytes += originalSize;
    this.stats.totalCompressedBytes += compressedSize;
    this.stats.compressionTime += compressionTime;

    // Update average compression ratio
    this.stats.averageCompressionRatio = 
      this.stats.totalCompressedBytes / this.stats.totalOriginalBytes;

    // Update algorithm usage
    const currentCount = this.stats.algorithmsUsed.get(algorithm) || 0;
    this.stats.algorithmsUsed.set(algorithm, currentCount + 1);
  }
}

/**
 * Compressed cache entry
 */
export interface CompressedCacheEntry {
  compressedData: Buffer;
  compressionAlgorithm: CompressionAlgorithm;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

/**
 * Compression-aware cache wrapper
 */
export class CompressedCache<T> {
  private cache = new Map<string, CompressedCacheEntry>();
  private compressionManager: CompressionManager;
  private serializer: (value: T) => Buffer;
  private deserializer: (buffer: Buffer) => T;

  constructor(
    serializer: (value: T) => Buffer,
    deserializer: (buffer: Buffer) => T,
    compressionOptions: Partial<CompressionOptions> = {}
  ) {
    this.compressionManager = new CompressionManager(compressionOptions);
    this.serializer = serializer;
    this.deserializer = deserializer;
  }

  /**
   * Set a value in the compressed cache
   */
  async set(key: string, value: T): Promise<void> {
    const serialized = this.serializer(value);
    const compressionResult = await this.compressionManager.compress(serialized);

    const entry: CompressedCacheEntry = {
      compressedData: compressionResult.data,
      compressionAlgorithm: compressionResult.algorithm,
      originalSize: compressionResult.originalSize,
      compressedSize: compressionResult.compressedSize,
      compressionRatio: compressionResult.compressionRatio
    };

    this.cache.set(key, entry);
  }

  /**
   * Get a value from the compressed cache
   */
  async get(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    const decompressed = await this.compressionManager.decompress(
      entry.compressedData,
      entry.compressionAlgorithm
    );

    return this.deserializer(decompressed);
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Delete a key from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size (number of entries)
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Get memory usage statistics
   */
  getMemoryUsage(): {
    totalEntries: number;
    totalOriginalSize: number;
    totalCompressedSize: number;
    totalMemorySaved: number;
    averageCompressionRatio: number;
  } {
    let totalOriginalSize = 0;
    let totalCompressedSize = 0;

    for (const entry of this.cache.values()) {
      totalOriginalSize += entry.originalSize;
      totalCompressedSize += entry.compressedSize;
    }

    return {
      totalEntries: this.cache.size,
      totalOriginalSize,
      totalCompressedSize,
      totalMemorySaved: totalOriginalSize - totalCompressedSize,
      averageCompressionRatio: totalOriginalSize > 0 ? totalCompressedSize / totalOriginalSize : 0
    };
  }

  /**
   * Get compression statistics
   */
  getCompressionStats(): CompressionStats {
    return this.compressionManager.getStats();
  }
}