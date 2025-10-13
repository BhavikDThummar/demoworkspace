import { Controller, Post, Body } from '@nestjs/common';
import { BomRuleEngineService } from '../services/rule-engine.service';
import { IBOMItem } from '../interfaces/bom-types.interface';

interface ValidateBomRequest {
  inputs: IBOMItem[];
  multiplyInputBy?: number;
}

interface BatchDataProcessRequest {
  inputs: IBOMItem[];
  multiplyInputBy?: number;
  options?: {
    continueOnError?: boolean;
    includeBatchDataRules?: boolean;
    includeValidationRules?: boolean;
  };
}

@Controller('nestjs-rule-engine')
export class BomValidationController {
  constructor(private readonly bomRuleEngineService: BomRuleEngineService) {}

  @Post('validate')
  async validateBom(@Body() items: IBOMItem[]) {
    const result = await this.bomRuleEngineService.validateBomItems(items);

    // Return data with message - will be wrapped by ResponseInterceptor
    return {
      data: {
        items: result.data,
        errors: result.errors,
        summary: {
          totalItems: items.length,
          validItems: items.length - result.errors.length,
          invalidItems: result.errors.length,
          totalErrors: result.errors.length,
        },
        rulesSource: 'qpaRefDesRules.module.ts (Secure TypeScript Module)',
      },
      message:
        result.errors.length > 0
          ? `Validation completed with ${result.errors.length} error(s) using secure TypeScript rules`
          : 'Validation completed successfully using secure TypeScript rules',
    };
  }

  @Post('validate-multiply')
  async validateAndMultiplyBom(@Body() request: ValidateBomRequest) {
    let effectiveInputs = request.inputs;

    // Multiply BOM items if requested
    if (request.multiplyInputBy && request.multiplyInputBy > 1) {
      const multiplier = Math.floor(request.multiplyInputBy);

      effectiveInputs = Array.from({ length: multiplier }, () =>
        request.inputs.map((input) => ({ ...input })),
      ).flat();
    }

    // Validate the (possibly multiplied) BOM items
    const result = await this.bomRuleEngineService.validateBomItems(effectiveInputs);

    // Return data with summary
    return {
      data: {
        items: result.data,
        errors: result.errors,
        summary: {
          totalItems: effectiveInputs.length,
          validItems: effectiveInputs.length - result.errors.length,
          invalidItems: result.errors.length,
          totalErrors: result.errors.length,
        },
      },
      message:
        result.errors.length > 0
          ? `Validation completed with ${result.errors.length} error(s)`
          : 'Validation completed successfully',
    };
  }

  /**
   * Validate BOM items using ultra-fast parallel execution
   * All items and all rules are executed concurrently without batching
   */
  @Post('validate-all-parallel')
  async validateBomAllParallel(
    @Body() request: ValidateBomRequest & { continueOnError?: boolean },
  ) {
    let effectiveInputs = request.inputs;

    // Multiply BOM items if requested
    if (request.multiplyInputBy && request.multiplyInputBy > 1) {
      const multiplier = Math.floor(request.multiplyInputBy);
      effectiveInputs = Array.from({ length: multiplier }, () =>
        request.inputs.map((input) => ({ ...input })),
      ).flat();
    }

    // Validate using ultra-fast parallel execution
    const result = await this.bomRuleEngineService.validateBomItemsAllParallel(effectiveInputs, {
      continueOnError: request.continueOnError ?? true,
    });

    return {
      data: {
        items: result.data,
        errors: result.errors,
        warnings: result.warnings,
        summary: {
          totalItems: effectiveInputs.length,
          validItems: result.data.length - result.errors.length,
          invalidItems: result.errors.length,
          totalErrors: result.errors.length,
          totalWarnings: result.warnings.length,
          executionTime: result.executionTime,
          rulesExecuted: result.rulesExecuted,
        },
      },
      message:
        result.errors.length > 0
          ? `Ultra-fast parallel validation completed with ${
              result.errors.length
            } error(s) in ${result.executionTime.toFixed(2)}ms`
          : `Ultra-fast parallel validation completed successfully in ${result.executionTime.toFixed(
              2,
            )}ms`,
    };
  }

  /**
   * Validate BOM items using ultra-fast parallel execution with specific tags
   */
  @Post('validate-all-parallel-by-tags')
  async validateBomAllParallelByTags(
    @Body() request: ValidateBomRequest & { tags: string[]; continueOnError?: boolean },
  ) {
    let effectiveInputs = request.inputs;

    // Multiply BOM items if requested
    if (request.multiplyInputBy && request.multiplyInputBy > 1) {
      const multiplier = Math.floor(request.multiplyInputBy);
      effectiveInputs = Array.from({ length: multiplier }, () =>
        request.inputs.map((input) => ({ ...input })),
      ).flat();
    }

    // Validate using ultra-fast parallel execution with tags
    const result = await this.bomRuleEngineService.validateBomItemsAllParallelByTags(
      effectiveInputs,
      request.tags,
      { continueOnError: request.continueOnError ?? true },
    );

    return {
      data: {
        items: result.data,
        errors: result.errors,
        warnings: result.warnings,
        summary: {
          totalItems: effectiveInputs.length,
          validItems: result.data.length - result.errors.length,
          invalidItems: result.errors.length,
          totalErrors: result.errors.length,
          totalWarnings: result.warnings.length,
          executionTime: result.executionTime,
          rulesExecuted: result.rulesExecuted,
        },
      },
      message:
        result.errors.length > 0
          ? `Ultra-fast parallel validation by tags [${request.tags.join(', ')}] completed with ${
              result.errors.length
            } error(s) in ${result.executionTime.toFixed(2)}ms`
          : `Ultra-fast parallel validation by tags [${request.tags.join(
              ', ',
            )}] completed successfully in ${result.executionTime.toFixed(2)}ms`,
    };
  }

  /**
   * OPTIMIZED: Pre-enrich data then validate with ultra-fast parallel execution
   * This approach combines the best of both worlds:
   * 1. Efficient data fetching (minimal DB calls)
   * 2. Ultra-fast parallel validation (no batch overhead)
   */
  @Post('validate-with-pre-enrichment')
  async validateWithPreEnrichment(@Body() request: BatchDataProcessRequest) {
    let effectiveInputs = request.inputs;

    // Multiply BOM items if requested
    if (request.multiplyInputBy && request.multiplyInputBy > 1) {
      const multiplier = Math.floor(request.multiplyInputBy);
      effectiveInputs = Array.from({ length: multiplier }, () =>
        request.inputs.map((input) => ({ ...input })),
      ).flat();
    }

    // Use the new optimized flow
    const result = await this.bomRuleEngineService.validateWithPreEnrichment(
      effectiveInputs,
      request.options,
    );

    return {
      data: {
        items: result.data,
        errors: result.errors,
        warnings: result.warnings,
        summary: {
          totalItems: effectiveInputs.length,
          validItems: result.data.length - result.errors.length,
          invalidItems: result.errors.length,
          totalErrors: result.errors.length,
          totalWarnings: result.warnings.length,
          executionTime: result.executionTime,
          rulesExecuted: result.rulesExecuted,
          enrichedItems: result.enrichmentStats.enrichedItems,
          enrichmentRate: `${Math.round((result.enrichmentStats.enrichedItems / result.enrichmentStats.totalItems) * 100)}%`,
        },
        performance: {
          itemsPerSecond: Math.round(effectiveInputs.length / (result.executionTime / 1000)),
          avgTimePerItem: `${(result.executionTime / effectiveInputs.length).toFixed(2)}ms`,
          enrichmentTime: `${result.enrichmentStats.executionTime.toFixed(2)}ms`,
          validationTime: `${result.validationTime.toFixed(2)}ms`,
          dataFetches: result.enrichmentStats.dataFetches,
        },
      },
      message:
        result.errors.length > 0
          ? `OPTIMIZED: Pre-enrichment + ultra-fast validation completed with ${
              result.errors.length
            } error(s) in ${result.executionTime.toFixed(2)}ms. ${
              result.enrichmentStats.enrichedItems
            } items enriched.`
          : `OPTIMIZED: Pre-enrichment + ultra-fast validation completed successfully in ${result.executionTime.toFixed(
              2,
            )}ms. ${result.enrichmentStats.enrichedItems} items enriched.`,
    };
  }

  /**
   * Process BOM items with batch data enrichment
   * This endpoint demonstrates the main requirement: efficient DB/API calls
   */
  @Post('process-with-batch-data')
  async processBomWithBatchData(@Body() request: BatchDataProcessRequest) {
    let effectiveInputs = request.inputs;

    // Multiply BOM items if requested
    if (request.multiplyInputBy && request.multiplyInputBy > 1) {
      const multiplier = Math.floor(request.multiplyInputBy);
      effectiveInputs = Array.from({ length: multiplier }, () =>
        request.inputs.map((input) => ({ ...input })),
      ).flat();
    }

    // Process with batch data enrichment
    const result = await this.bomRuleEngineService.processBomItemsWithBatchData(
      effectiveInputs,
      request.options,
    );

    // Count enriched items
    const enrichedItems = result.data.filter((item) => item.cmHidden?.uomName_FromDB !== undefined);

    return {
      data: {
        items: result.data,
        errors: result.errors,
        warnings: result.warnings,
        summary: {
          totalItems: effectiveInputs.length,
          validItems: result.data.length - result.errors.length,
          invalidItems: result.errors.length,
          totalErrors: result.errors.length,
          totalWarnings: result.warnings.length,
          executionTime: result.executionTime,
          rulesExecuted: result.rulesExecuted,
          enrichedItems: enrichedItems.length,
          enrichmentRate: `${Math.round((enrichedItems.length / result.data.length) * 100)}%`,
        },
        performance: {
          itemsPerSecond: Math.round(effectiveInputs.length / (result.executionTime / 1000)),
          avgTimePerItem: `${(result.executionTime / effectiveInputs.length).toFixed(2)}ms`,
          databaseCallsEstimate: '1 per batch (not per item)',
        },
      },
      message:
        result.errors.length > 0
          ? `Batch data processing completed with ${
              result.errors.length
            } error(s) in ${result.executionTime.toFixed(2)}ms. ${
              enrichedItems.length
            } items enriched with database data.`
          : `Batch data processing completed successfully in ${result.executionTime.toFixed(
              2,
            )}ms. ${enrichedItems.length} items enriched with database data.`,
    };
  }
}
