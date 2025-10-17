/**
 * Batch Data Rules Service - API-side implementation
 * Handles actual database/API calls and creates rules with real data fetching
 */

import { Injectable, Inject } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { UomEntity } from '@org/entities';
import { TENANT_ENTITY_MANAGER } from '@org/database';
import { BatchDataRuleFactory, Rule, RuleContext } from '@org/cm-rule-engine/nestjs';
import { IBOMItem } from '../interfaces/bom-types.interface';

/**
 * Service for creating API-side batch data rules with real data fetching
 */
@Injectable()
export class BatchDataRulesService {
  constructor(
    private readonly batchDataRuleFactory: BatchDataRuleFactory,
    @Inject(TENANT_ENTITY_MANAGER)
    private readonly em: EntityManager,
  ) {}

  /**
   * Create UOM enrichment rule with database integration
   * This rule fetches UOM data once per batch and enriches all items
   */
  createUomEnrichmentRule(): Rule<IBOMItem> {
    return this.batchDataRuleFactory.createDatabaseRule<IBOMItem, UomEntity>({
      name: 'uom_enrichment_api',
      description: 'Fetch UOM data from database and enrich BOM items (API version)',
      priority: 1,
      tags: ['batch-data', 'uom', 'database', 'api'],
      entityManager: this.em,
      cacheKey: 'uom-data-id-minus-one',

      // Database query - executes only once per batch
      query: async (em: EntityManager) => {
        console.log('🔍 [API] Fetching UOM data from database (executed once per batch)');
        const uomRecord = await em.findOne(UomEntity, { id: -1 });
        return uomRecord ? [uomRecord] : [];
      },

      // Enrich each item - executes for every item but uses cached data
      enrichItem: async (
        item: IBOMItem,
        uomEntities: UomEntity[],
        context: RuleContext<IBOMItem>,
      ) => {
        // Initialize cmHidden if it doesn't exist
        if (!item.cmHidden) {
          item.cmHidden = {};
        }

        // Add uomName_FromDB field
        if (uomEntities.length > 0) {
          const uomEntity = uomEntities[0];
          item.cmHidden.uomName_FromDB = uomEntity.unitName || 'unknown';

          // Log only for first few items to avoid spam
          if (context.index < 3) {
            console.log(
              `✅ [API] Item ${context.index + 1}: Added uomName_FromDB = "${
                item.cmHidden.uomName_FromDB
              }"`,
            );
          }
        } else {
          item.cmHidden.uomName_FromDB = 'not-found';

          if (context.index < 3) {
            console.log(
              `❌ [API] Item ${context.index + 1}: UOM not found, set uomName_FromDB = "not-found"`,
            );
          }
        }

        return item;
      },
    });
  }

  /**
   * Get all API-side batch data rules
   */
  getAllBatchDataRules(): Rule<IBOMItem>[] {
    return [this.createUomEnrichmentRule()];
  }
}
