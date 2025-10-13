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
  allItems: any[];

  /** Additional metadata for the batch */
  metadata?: Record<string, any>;
}

/**
 * Data fetcher function signature
 */
export type DataFetcher<T = any> = (context: BatchDataContext) => Promise<T> | T;

/**
 * Cached data entry
 */
interface CachedDataEntry<T = any> {
  data: T;
  timestamp: number;
  batchId: string;
}

/**
 * Batch Data Provider service
 * Manages efficient data fetching with caching per batch execution
 */
@Injectable()
export class BatchDataProvider {
  private cache = new Map<string, CachedDataEntry>();
  private currentBatchId: string | null = null;

  /**
   * Initialize a new batch execution
   * Clears previous batch cache and sets new batch ID
   */
  initializeBatch(batchId: string): void {
    // Clear cache from previous batches
    this.clearCache();
    this.currentBatchId = batchId;
  }

  /**
   * Fetch data with caching per batch
   * Data is fetched only once per batch execution, regardless of how many times this is called
   */
  async fetchData<T>(key: string, fetcher: DataFetcher<T>, context: BatchDataContext): Promise<T> {
    const cacheKey = `${context.batchId}:${key}`;

    // Check if data is already cached for this batch
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      return cached.data as T;
    }

    // Fetch data
    const data = await fetcher(context);

    // Cache the result
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      batchId: context.batchId,
    });

    return data;
  }

  /**
   * Get cached data without fetching
   */
  getCachedData<T>(key: string, batchId?: string): T | null {
    const targetBatchId = batchId || this.currentBatchId;
    if (!targetBatchId) return null;

    const cacheKey = `${targetBatchId}:${key}`;
    const cached = this.cache.get(cacheKey);

    return cached ? (cached.data as T) : null;
  }

  /**
   * Check if data is cached for the current batch
   */
  hasCachedData(key: string, batchId?: string): boolean {
    const targetBatchId = batchId || this.currentBatchId;
    if (!targetBatchId) return false;

    const cacheKey = `${targetBatchId}:${key}`;
    return this.cache.has(cacheKey);
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Clear cache for specific batch
   */
  clearBatchCache(batchId: string): void {
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (entry.batchId === batchId) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.cache.delete(key));
  }

  /**
   * Get current batch ID
   */
  getCurrentBatchId(): string | null {
    return this.currentBatchId;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    totalEntries: number;
    currentBatchEntries: number;
    batchIds: string[];
  } {
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
