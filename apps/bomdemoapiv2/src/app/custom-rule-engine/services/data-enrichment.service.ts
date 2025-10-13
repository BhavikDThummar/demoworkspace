/**
 * Data Enrichment Service - High-performance data pre-loading
 * Pre-enriches all BOM items with necessary data before rule validation
 * This approach is faster than batch data rules for large datasets
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { UomEntity } from '@org/entities';
import { TENANT_ENTITY_MANAGER } from '@org/database';
import { IBOMItem } from '../interfaces/bom-types.interface';

/**
 * Configuration for data enrichment
 */
export interface DataEnrichmentOptions {
  /** Include UOM data enrichment */
  includeUomData?: boolean;

  /** Include other data types as needed */
  includePartData?: boolean;
  includeSupplierData?: boolean;

  /** Custom data fetchers */
  customEnrichments?: Array<{
    name: string;
    fetcher: (items: IBOMItem[]) => Promise<Record<string, unknown>>;
    enricher: (item: IBOMItem, data: Record<string, unknown>) => void;
  }>;
}

/**
 * Service for high-performance data enrichment
 * Fetches all necessary data upfront, then enriches items in memory
 */
@Injectable()
export class DataEnrichmentService {
  private readonly logger = new Logger(DataEnrichmentService.name);

  constructor(
    @Inject(TENANT_ENTITY_MANAGER)
    private readonly em: EntityManager,
  ) {}

  /**
   * Pre-enrich all BOM items with necessary data
   * This method fetches all required data upfront and enriches items in memory
   */
  async enrichBomItems(
    items: IBOMItem[],
    options: DataEnrichmentOptions = {},
  ): Promise<{
    enrichedItems: IBOMItem[];
    enrichmentStats: {
      totalItems: number;
      enrichedItems: number;
      executionTime: number;
      dataFetches: Array<{ type: string; count: number; time: number }>;
    };
  }> {
    const startTime = performance.now();
    const dataFetches: Array<{ type: string; count: number; time: number }> = [];

    this.logger.log(`🚀 Starting high-performance data enrichment for ${items.length} items`);

    // Clone items to avoid mutation
    const enrichedItems = items.map((item) => ({ ...item }));
    let enrichedCount = 0;

    // Default options
    const {
      includeUomData = true,
      includePartData = false,
      includeSupplierData = false,
      customEnrichments = [],
    } = options;

    // 1. UOM Data Enrichment
    if (includeUomData) {
      const uomStats = await this.enrichWithUomData(enrichedItems);
      dataFetches.push(uomStats);
      enrichedCount += uomStats.count;
    }

    // 2. Part Data Enrichment (placeholder for future)
    if (includePartData) {
      // TODO: Implement part data enrichment
      this.logger.debug('Part data enrichment not yet implemented');
    }

    // 3. Supplier Data Enrichment (placeholder for future)
    if (includeSupplierData) {
      // TODO: Implement supplier data enrichment
      this.logger.debug('Supplier data enrichment not yet implemented');
    }

    // 4. Custom Enrichments
    for (const customEnrichment of customEnrichments) {
      const customStart = performance.now();
      try {
        const customData = await customEnrichment.fetcher(enrichedItems);

        for (const item of enrichedItems) {
          customEnrichment.enricher(item, customData);
        }

        const customTime = performance.now() - customStart;
        dataFetches.push({
          type: `custom:${customEnrichment.name}`,
          count: enrichedItems.length,
          time: customTime,
        });

        this.logger.debug(
          `✅ Custom enrichment '${customEnrichment.name}' completed in ${customTime.toFixed(2)}ms`,
        );
      } catch (error) {
        this.logger.error(`❌ Custom enrichment '${customEnrichment.name}' failed:`, error);
      }
    }

    const totalTime = performance.now() - startTime;

    this.logger.log(`🎯 Data enrichment completed in ${totalTime.toFixed(2)}ms`);
    this.logger.log(`📊 Enriched ${enrichedCount} data points across ${items.length} items`);

    return {
      enrichedItems,
      enrichmentStats: {
        totalItems: items.length,
        enrichedItems: enrichedCount,
        executionTime: totalTime,
        dataFetches,
      },
    };
  }

  /**
   * Enrich items with UOM data
   * Fetches all unique UOM IDs in one query, then enriches items in memory
   */
  private async enrichWithUomData(
    items: IBOMItem[],
  ): Promise<{ type: string; count: number; time: number }> {
    const startTime = performance.now();

    // For demo purposes, we'll use the same UOM ID (-1) as in the batch data example
    // In a real scenario, you'd extract unique UOM IDs from the items
    const uniqueUomIds = [...new Set(items.map((item) => item.dbUomId).filter(Boolean))]; // This would be: [...new Set(items.map(item => item.uomId).filter(Boolean))]

    this.logger.debug(`🔍 Fetching UOM data for ${uniqueUomIds.length} unique UOM IDs`);

    // Single database query for all UOM data
    const uomEntities = await this.em.find(UomEntity, { id: { $in: uniqueUomIds } });

    // Create lookup map for O(1) access
    const uomLookup = new Map<number, UomEntity>();
    uomEntities.forEach((uom) => uomLookup.set(uom.id, uom));

    this.logger.debug(`📦 Loaded ${uomEntities.length} UOM records from database`);

    // Enrich items in memory
    let enrichedCount = 0;
    for (const item of items) {
      // Initialize cmHidden if it doesn't exist
      if (!item.cmHidden) {
        item.cmHidden = {};
      }

      // For demo, we'll use UOM ID -1 for all items
      // In real scenario: const uomId = item.uomId || -1;
      const uomId = item.dbUomId || -1;
      const uomEntity = uomLookup.get(uomId);

      if (uomEntity) {
        item.cmHidden.uomId_fromDB = uomEntity.unitName || 'unknown';
        item.cmHidden.uomId_enriched = true;
        enrichedCount++;
      } else {
        item.cmHidden.uomId_fromDB = 'not-found';
        item.cmHidden.uomId_enriched = false;
      }
    }

    const executionTime = performance.now() - startTime;

    this.logger.debug(
      `✅ UOM enrichment completed: ${enrichedCount}/${
        items.length
      } items enriched in ${executionTime.toFixed(2)}ms`,
    );

    return {
      type: 'uom-data',
      count: enrichedCount,
      time: executionTime,
    };
  }

  /**
   * Get enrichment statistics for a set of items
   */
  getEnrichmentStats(items: IBOMItem[]): {
    totalItems: number;
    uomEnrichedItems: number;
    enrichmentRate: string;
  } {
    const uomEnrichedItems = items.filter(
      (item) => item.cmHidden?.uomId_fromDB !== undefined && item.cmHidden?.uomId_enriched === true,
    ).length;

    return {
      totalItems: items.length,
      uomEnrichedItems,
      enrichmentRate: `${Math.round((uomEnrichedItems / items.length) * 100)}%`,
    };
  }
}
