import { Controller, Post, Body } from '@nestjs/common';
import { BomRuleEngineService } from '../services/rule-engine.service';
import { IBOMItem } from '../interfaces/bom-types.interface';

interface ValidateBomRequest {
  inputs: IBOMItem[];
  multiplyInputBy?: number;
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
  async validateBomAllParallel(@Body() request: ValidateBomRequest & { continueOnError?: boolean }) {
    let effectiveInputs = request.inputs;

    // Multiply BOM items if requested
    if (request.multiplyInputBy && request.multiplyInputBy > 1) {
      const multiplier = Math.floor(request.multiplyInputBy);
      effectiveInputs = Array.from({ length: multiplier }, () =>
        request.inputs.map((input) => ({ ...input })),
      ).flat();
    }

    // Validate using ultra-fast parallel execution
    const result = await this.bomRuleEngineService.validateBomItemsAllParallel(
      effectiveInputs,
      { continueOnError: request.continueOnError ?? true }
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
          ? `Ultra-fast parallel validation completed with ${result.errors.length} error(s) in ${result.executionTime.toFixed(2)}ms`
          : `Ultra-fast parallel validation completed successfully in ${result.executionTime.toFixed(2)}ms`,
    };
  }

  /**
   * Validate BOM items using ultra-fast parallel execution with specific tags
   */
  @Post('validate-all-parallel-by-tags')
  async validateBomAllParallelByTags(
    @Body() request: ValidateBomRequest & { tags: string[]; continueOnError?: boolean }
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
      { continueOnError: request.continueOnError ?? true }
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
          ? `Ultra-fast parallel validation by tags [${request.tags.join(', ')}] completed with ${result.errors.length} error(s) in ${result.executionTime.toFixed(2)}ms`
          : `Ultra-fast parallel validation by tags [${request.tags.join(', ')}] completed successfully in ${result.executionTime.toFixed(2)}ms`,
    };
  }
}
