/**
 * Batch Data Rule - A specialized rule type for efficient data fetching
 * Executes only once per batch to fetch data and enriches all items
 */

import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { Rule, RuleContext } from '../core/types';
import { BatchDataProvider, BatchDataContext, DataFetcher } from '../core/batch-data-provider';

/**
 * Configuration for batch data rule
 */
export interface BatchDataRuleConfig<TInput = any, TFetchedData = any> {
  /** Unique rule name */
  name: string;
  
  /** Rule description */
  description: string;
  
  /** Rule priority */
  priority: number;
  
  /** Rule tags */
  tags?: string[];
  
  /** Data fetcher function */
  dataFetcher: DataFetcher<TFetchedData>;
  
  /** Function to enrich each item with fetched data */
  enrichItem: (item: TInput, fetchedData: TFetchedData, context: RuleContext<TInput>) => TInput | Promise<TInput>;
  
  /** Cache key for the fetched data */
  cacheKey: string;
}

/**
 * Factory for creating batch data rules
 */
@Injectable()
export class BatchDataRuleFactory {
  constructor(
    private readonly batchDataProvider: BatchDataProvider
  ) {}

  /**
   * Create a batch data rule
   */
  createRule<TInput = any, TFetchedData = any>(
    config: BatchDataRuleConfig<TInput, TFetchedData>
  ): Rule<TInput> {
    return {
      name: config.name,
      description: config.description,
      priority: config.priority,
      tags: config.tags || ['batch-data'],
      enabled: true,
      transform: async (context: RuleContext<TInput>) => {
        // Initialize batch on first item
        if (context.index === 0) {
          this.batchDataProvider.initializeBatch();
          console.log(`🔄 [BatchDataRule] Processing ${context.allItems.length} items`);
        }

        // Create batch context - use the current batch ID from provider
        const currentBatchId = this.batchDataProvider.getCurrentBatchId();
        const batchContext: BatchDataContext = {
          batchId: currentBatchId || 'default-batch',
          allItems: context.allItems,
          metadata: context.metadata,
        };

        // Fetch data (cache manager handles caching and logging)
        // Only log for first few items to avoid spam
        const fetchedData = await this.batchDataProvider.fetchData(
          config.cacheKey,
          config.dataFetcher,
          batchContext
        );

        // Enrich the current item
        return await config.enrichItem(context.item, fetchedData, context);
      },
    };
  }

  /**
   * Create a database-based batch data rule
   * Note: EntityManager should be injected in the application layer
   */
  createDatabaseRule<TInput = any, TEntity = any>(config: {
    name: string;
    description: string;
    priority: number;
    tags?: string[];
    entityManager: EntityManager;
    query: (em: EntityManager) => Promise<TEntity[]> | TEntity[];
    enrichItem: (item: TInput, entities: TEntity[], context: RuleContext<TInput>) => TInput | Promise<TInput>;
    cacheKey?: string;
  }): Rule<TInput> {
    return this.createRule({
      name: config.name,
      description: config.description,
      priority: config.priority,
      tags: config.tags,
      cacheKey: config.cacheKey || `db:${config.name}`,
      dataFetcher: async () => {
        return await config.query(config.entityManager);
      },
      enrichItem: config.enrichItem,
    });
  }

  /**
   * Create an API-based batch data rule
   */
  createApiRule<TInput = any, TApiResponse = any>(config: {
    name: string;
    description: string;
    priority: number;
    tags?: string[];
    apiCall: (context: BatchDataContext) => Promise<TApiResponse>;
    enrichItem: (item: TInput, apiResponse: TApiResponse, context: RuleContext<TInput>) => TInput | Promise<TInput>;
    cacheKey?: string;
  }): Rule<TInput> {
    return this.createRule({
      name: config.name,
      description: config.description,
      priority: config.priority,
      tags: config.tags,
      cacheKey: config.cacheKey || `api:${config.name}`,
      dataFetcher: config.apiCall,
      enrichItem: config.enrichItem,
    });
  }

  /**
   * Create a NestJS service-based batch data rule
   */
  createServiceRule<TInput = any, TServiceResponse = unknown>(config: {
    name: string;
    description: string;
    priority: number;
    tags?: string[];
    service: Record<string, (...args: unknown[]) => Promise<TServiceResponse>>;
    serviceMethod: string;
    serviceArgs?: (context: BatchDataContext) => unknown[];
    enrichItem: (item: TInput, serviceResponse: TServiceResponse, context: RuleContext<TInput>) => TInput | Promise<TInput>;
    cacheKey?: string;
  }): Rule<TInput> {
    return this.createRule({
      name: config.name,
      description: config.description,
      priority: config.priority,
      tags: config.tags,
      cacheKey: config.cacheKey || `service:${config.name}`,
      dataFetcher: async (context: BatchDataContext) => {
        const args = config.serviceArgs ? config.serviceArgs(context) : [];
        return await config.service[config.serviceMethod](...args);
      },
      enrichItem: config.enrichItem,
    });
  }




}