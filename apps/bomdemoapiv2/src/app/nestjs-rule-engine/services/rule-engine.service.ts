import { Injectable, Logger } from '@nestjs/common';
import { RuleEngineService as BaseRuleEngineService } from '@org/cm-rule-engine/nestjs';
import { Rule } from '@org/cm-rule-engine/nestjs';
import { IBOMItem } from '../interfaces/bom-types.interface';
// Import the secure TypeScript rules instead of eval-based rules
import { qpaRefDesRules } from '../../custom-rule-engine/rules/qpaRefDesRules.module';
import { BatchDataRulesService } from '../../custom-rule-engine/services/batch-data-rules.service';
import { DataEnrichmentService } from '../../custom-rule-engine/services/data-enrichment.service';

@Injectable()
export class BomRuleEngineService {
  private readonly logger = new Logger(BomRuleEngineService.name);
  private ruleEngine: BaseRuleEngineService<IBOMItem>;
  private batchDataRuleEngine: BaseRuleEngineService<IBOMItem>;

  constructor(
    private readonly batchDataRulesService: BatchDataRulesService,
    private readonly dataEnrichmentService: DataEnrichmentService,
  ) {
    this.ruleEngine = new BaseRuleEngineService<IBOMItem>();
    this.batchDataRuleEngine = new BaseRuleEngineService<IBOMItem>();
    this.loadRules();
    this.loadBatchDataRules();
  }

  /**
   * Load rules from the secure TypeScript module
   * These are the same rules used by the UI
   */
  private loadRules() {
    this.logger.log('Loading QPA RefDes rules from secure TypeScript module...');

    // Load rules from the TypeScript module
    qpaRefDesRules.forEach((rule: Rule<IBOMItem>) => {
      if (rule.enabled) {
        this.ruleEngine.addRule(rule);
        this.logger.debug(`Loaded rule: ${rule.name}`);
      }
    });

    this.logger.log(
      `Successfully loaded ${qpaRefDesRules.length} rules from qpaRefDesRules.module.ts`,
    );
  }

  /**
   * Load batch data rules for efficient database/API operations
   */
  private loadBatchDataRules() {
    this.logger.log('Loading batch data rules for efficient DB/API operations...');

    // Load batch data rules from the service
    const batchRules = this.batchDataRulesService.getAllBatchDataRules();

    batchRules.forEach((rule: Rule<IBOMItem>) => {
      if (rule.enabled) {
        this.batchDataRuleEngine.addRule(rule);
        this.logger.debug(`Loaded batch rule: ${rule.name}`);
      }
    });

    this.logger.log(`Successfully loaded ${batchRules.length} batch data rules`);
  }

  async validateBomItems(items: IBOMItem[]) {
    return this.ruleEngine.process(items);
  }

  /**
   * Validate BOM items using ultra-fast parallel execution
   * All items and all rules are executed concurrently without batching
   */
  async validateBomItemsAllParallel(items: IBOMItem[], options?: { continueOnError?: boolean }) {
    return this.ruleEngine.processAllParallelWithAllRules(items, options);
  }

  /**
   * Validate BOM items using ultra-fast parallel execution with specific tags
   */
  async validateBomItemsAllParallelByTags(
    items: IBOMItem[],
    tags: string[],
    options?: { continueOnError?: boolean },
  ) {
    return this.ruleEngine.processAllParallel(items, { tags }, options);
  }

  /**
   * Process BOM items with batch data enrichment
   * This method adds database/API data to items efficiently (1 call per batch)
   */
  async processBomItemsWithBatchData(
    items: IBOMItem[],
    options?: {
      continueOnError?: boolean;
      includeBatchDataRules?: boolean;
      includeValidationRules?: boolean;
    },
  ) {
    const {
      continueOnError = true,
      includeBatchDataRules = true,
      includeValidationRules = true,
    } = options || {};

    this.logger.log(`Processing ${items.length} BOM items with batch data enrichment`);

    let processedItems = items;
    let allErrors: any[] = [];
    let allWarnings: unknown[] = [];
    let totalExecutionTime = 0;
    let totalRulesExecuted = 0;

    // Step 1: Apply batch data rules (DB/API calls happen only once)
    if (includeBatchDataRules) {
      this.logger.log('Applying batch data rules...');
      const batchResult = await this.batchDataRuleEngine.processAllParallelWithAllRules(
        processedItems,
        { continueOnError },
      );

      processedItems = batchResult.data;
      allErrors = [...allErrors, ...batchResult.errors];
      allWarnings = [...allWarnings, ...batchResult.warnings];
      totalExecutionTime += batchResult.executionTime;
      totalRulesExecuted += batchResult.rulesExecuted;

      this.logger.log(`Batch data enrichment completed in ${batchResult.executionTime}ms`);
    }

    // Step 2: Apply validation rules
    if (includeValidationRules) {
      this.logger.log('Applying validation rules...');
      const validationResult = await this.ruleEngine.processAllParallelWithAllRules(
        processedItems,
        { continueOnError },
      );

      processedItems = validationResult.data;
      allErrors = [...allErrors, ...validationResult.errors];
      allWarnings = [...allWarnings, ...validationResult.warnings];
      totalExecutionTime += validationResult.executionTime;
      totalRulesExecuted += validationResult.rulesExecuted;

      this.logger.log(`Validation completed in ${validationResult.executionTime}ms`);
    }

    return {
      data: processedItems,
      errors: allErrors,
      warnings: allWarnings,
      isValid: allErrors.length === 0,
      executionTime: totalExecutionTime,
      rulesExecuted: totalRulesExecuted,
    };
  }

  /**
   * OPTIMIZED: Pre-enrich data then validate with ultra-fast parallel execution
   * This approach is faster than batch data rules for large datasets
   *
   * Performance characteristics:
   * - Data enrichment: O(unique_keys) database calls + O(n) memory operations
   * - Validation: Ultra-fast parallel execution without batch overhead
   * - Total: Much faster than batch data approach for large datasets
   */
  async validateWithPreEnrichment(
    items: IBOMItem[],
    options?: {
      continueOnError?: boolean;
      includeUomData?: boolean;
      includePartData?: boolean;
      includeSupplierData?: boolean;
    },
  ) {
    const {
      continueOnError = true,
      includeUomData = true,
      includePartData = false,
      includeSupplierData = false,
    } = options || {};

    const totalStartTime = performance.now();

    this.logger.log(
      `🚀 OPTIMIZED: Starting pre-enrichment + ultra-fast validation for ${items.length} items`,
    );

    // Step 1: Pre-enrich all items with necessary data (minimal DB calls)
    this.logger.log('📊 Step 1: Pre-enriching items with data...');
    const enrichmentResult = await this.dataEnrichmentService.enrichBomItems(items, {
      includeUomData,
      includePartData,
      includeSupplierData,
    });

    // Step 2: Ultra-fast parallel validation (no batch overhead)
    this.logger.log('⚡ Step 2: Ultra-fast parallel validation...');
    const validationStartTime = performance.now();

    const validationResult = await this.ruleEngine.processAllParallelWithAllRules(
      enrichmentResult.enrichedItems,
      { continueOnError },
    );

    const validationTime = performance.now() - validationStartTime;
    const totalTime = performance.now() - totalStartTime;

    this.logger.log(`🎯 OPTIMIZED flow completed in ${totalTime.toFixed(2)}ms`);
    this.logger.log(
      `   📊 Enrichment: ${enrichmentResult.enrichmentStats.executionTime.toFixed(2)}ms`,
    );
    this.logger.log(`   ⚡ Validation: ${validationTime.toFixed(2)}ms`);
    this.logger.log(
      `   🚀 Performance: ${Math.round(items.length / (totalTime / 1000))} items/second`,
    );

    return {
      data: validationResult.data,
      errors: validationResult.errors,
      warnings: validationResult.warnings,
      isValid: validationResult.errors.length === 0,
      executionTime: totalTime,
      validationTime,
      rulesExecuted: validationResult.rulesExecuted,
      enrichmentStats: enrichmentResult.enrichmentStats,
    };
  }
}
