/**
 * Batch Data Provider for efficient data fetching during rule execution
 * Ensures data is fetched only once per batch execution, regardless of batch size
 */

import { Injectable } from '@nestjs/common';

/**
 * Context for batch data fetching operations
 */
export interface BatchDataContext {
  /** Unique identifier for this batch execution */
  batchId: string;

  /** All items in the current batch */
  allItems: unknown[];

  /** Additional metadata for the batch */
  metadata?: Record<string, unknown>;
}

/**
 * Data fetcher function signature
 */
export type DataFetcher<T = unknown> = (context: BatchDataContext) => Promise<T> | T;

/**
 * Cached data entry
 */
interface CachedDataEntry<T = unknown> {
  data: T;
  timestamp: number;
  batchId: string;
}

/**
 * Singleton cache manager for batch data
 */
class BatchCacheManager {
  private static instance: BatchCacheManager;
  private cache = new Map<string, CachedDataEntry>();
  private pendingPromises = new Map<string, Promise<unknown>>();
  private currentBatchId: string | null = null;
  private batchCounter = 0;

  static getInstance(): BatchCacheManager {
    if (!BatchCacheManager.instance) {
      BatchCacheManager.instance = new BatchCacheManager();
    }
    return BatchCacheManager.instance;
  }

  initializeBatch(batchId?: string): string {
    if (!batchId) {
      this.batchCounter++;
      batchId = `batch_${Date.now()}_${this.batchCounter}`;
    }

    // Clear cache and pending promises from previous batches
    this.cache.clear();
    this.pendingPromises.clear();
    this.currentBatchId = batchId;

    console.log(`🔄 [BatchCacheManager] Initialized batch: ${batchId}`);
    return batchId;
  }

  async fetchData<T>(key: string, fetcher: DataFetcher<T>, context: BatchDataContext): Promise<T> {
    const cacheKey = `${context.batchId}:${key}`;

    // Check if data is already cached for this batch
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        console.log(`✅ [BatchCacheManager] Cache HIT for key: ${key}`);
        return cached.data as T;
      }
    }

    // Check if there's already a pending promise for this key
    if (this.pendingPromises.has(cacheKey)) {
      console.log(
        `⏳ [BatchCacheManager] Concurrent request detected - waiting for existing fetch: ${key}`,
      );
      return this.pendingPromises.get(cacheKey) as Promise<T>;
    }

    console.log(`❌ [BatchCacheManager] Cache MISS for key: ${key} - initiating fetch...`);

    // Create and store the promise to prevent concurrent fetches
    const fetchPromise = this.performFetch(key, fetcher, context, cacheKey);
    this.pendingPromises.set(cacheKey, fetchPromise);

    try {
      const result = await fetchPromise;
      return result;
    } finally {
      // Clean up the pending promise
      this.pendingPromises.delete(cacheKey);
    }
  }

  private async performFetch<T>(
    key: string,
    fetcher: DataFetcher<T>,
    context: BatchDataContext,
    cacheKey: string,
  ): Promise<T> {
    // Fetch data
    const data = await fetcher(context);

    // Cache the result
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      batchId: context.batchId,
    });

    console.log(`💾 [BatchCacheManager] Data cached for key: ${key}`);
    return data;
  }

  hasCachedData(key: string, batchId?: string): boolean {
    const targetBatchId = batchId || this.currentBatchId;
    if (!targetBatchId) return false;

    const cacheKey = `${targetBatchId}:${key}`;
    return this.cache.has(cacheKey);
  }

  getCurrentBatchId(): string | null {
    return this.currentBatchId;
  }

  getCacheStats() {
    const batchIds = new Set<string>();
    let currentBatchEntries = 0;

    for (const entry of this.cache.values()) {
      batchIds.add(entry.batchId);
      if (entry.batchId === this.currentBatchId) {
        currentBatchEntries++;
      }
    }

    return {
      totalEntries: this.cache.size,
      currentBatchEntries,
      batchIds: Array.from(batchIds),
    };
  }
}

/**
 * Batch Data Provider service
 * Manages efficient data fetching with caching per batch execution
 */
@Injectable()
export class BatchDataProvider {
  private cacheManager = BatchCacheManager.getInstance();

  /**
   * Initialize a new batch execution
   */
  initializeBatch(batchId?: string): void {
    this.cacheManager.initializeBatch(batchId);
  }

  /**
   * Fetch data with caching per batch
   */
  async fetchData<T>(key: string, fetcher: DataFetcher<T>, context: BatchDataContext): Promise<T> {
    return this.cacheManager.fetchData(key, fetcher, context);
  }

  /**
   * Check if data is cached for the current batch
   */
  hasCachedData(key: string, batchId?: string): boolean {
    return this.cacheManager.hasCachedData(key, batchId);
  }

  /**
   * Get current batch ID
   */
  getCurrentBatchId(): string | null {
    return this.cacheManager.getCurrentBatchId();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cacheManager.getCacheStats();
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    // Delegate to cache manager if needed
  }
}
