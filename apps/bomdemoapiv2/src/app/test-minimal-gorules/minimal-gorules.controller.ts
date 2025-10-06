/**
 * Example controller demonstrating Minimal GoRules Engine integration
 */

import { Body, Controller, Get, HttpException, HttpStatus, Param, Post } from '@nestjs/common';
import { BatchExecutionOptions, MinimalGoRulesService, RuleSelector } from '@org/minimal-gorules';

/**
 * DTO for rule execution requests
 */
export interface ExecuteRuleRequest {
  ruleId?: string;
  ruleIds?: string[];
  tags?: string[];
  mode?: 'parallel' | 'sequential' | 'mixed';
  input: Record<string, unknown>;
}

/**
 * DTO for rule execution response
 */
export interface ExecuteRuleResponse<T = unknown> {
  success: boolean;
  results?: Map<string, T> | T;
  executionTime?: number;
  errors?: Map<string, string>;
  message?: string;
}

/**
 * DTO for batch execution request
 */
export interface BatchExecuteRequest {
  inputs: Record<string, unknown>[];
  ruleIds?: string[];
  tags?: string[];
  selector?: RuleSelector;
  options?: BatchExecutionOptions;
  multiplyInputBy?: number;
}

/**
 * DTO for lightweight batch execution response
 */
export interface BatchExecuteResponse<T = unknown> {
  success: boolean;
  results: Array<{
    inputIndex: number;
    results: Record<string, T>;
    errors?: Record<string, string>;
    success: boolean;
  }>;
  message?: string;
}

/**
 * Controller for minimal GoRules engine operations
 */
@Controller('minimal-gorules')
export class MinimalGoRulesController {
  constructor(private readonly minimalGoRulesService: MinimalGoRulesService) {}

  /**
   * Execute a single rule by ID
   */
  @Post('execute-rule')
  async executeRule(@Body() request: ExecuteRuleRequest): Promise<ExecuteRuleResponse> {
    try {
      if (!request.ruleId) {
        throw new HttpException('ruleId is required', HttpStatus.BAD_REQUEST);
      }

      const result = await this.minimalGoRulesService.executeRule(request.ruleId, request.input);

      return {
        success: true,
        results: result,
        message: `Rule ${request.ruleId} executed successfully`,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to execute rule: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Execute multiple rules with selector
   */
  @Post('execute')
  async execute(@Body() request: ExecuteRuleRequest): Promise<ExecuteRuleResponse> {
    try {
      const selector: RuleSelector = {
        ids: request.ruleIds,
        tags: request.tags,
        mode: { type: request.mode || 'parallel' },
      };

      const result = await this.minimalGoRulesService.execute(selector, request.input);

      // Convert Map to object for JSON serialization
      const resultsObj = Object.fromEntries(result.results);
      const errorsObj = result.errors ? Object.fromEntries(result.errors) : undefined;

      return {
        success: true,
        results: resultsObj,
        executionTime: result.executionTime,
        errors: errorsObj,
        message: `Executed ${result.results.size} rules successfully`,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to execute rules: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Execute rules by tags
   */
  @Post('execute-by-tags')
  async executeByTags(@Body() request: ExecuteRuleRequest): Promise<ExecuteRuleResponse> {
    try {
      if (!request.tags || request.tags.length === 0) {
        throw new HttpException('tags array is required', HttpStatus.BAD_REQUEST);
      }

      const result = await this.minimalGoRulesService.executeByTags(
        request.tags,
        request.input,
        request.mode || 'parallel',
      );

      const resultsObj = Object.fromEntries(result.results);
      const errorsObj = result.errors ? Object.fromEntries(result.errors) : undefined;

      return {
        success: true,
        results: resultsObj,
        executionTime: result.executionTime,
        errors: errorsObj,
        message: `Executed rules with tags [${request.tags.join(', ')}] successfully`,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to execute rules by tags: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get engine status and health
   */
  @Get('status')
  async getStatus() {
    try {
      const [engineStatus, healthCheck, cacheStats] = await Promise.all([
        this.minimalGoRulesService.getStatus(),
        this.minimalGoRulesService.healthCheck(),
        Promise.resolve(this.minimalGoRulesService.getCacheStats()),
      ]);

      return {
        engine: engineStatus,
        health: healthCheck,
        cache: cacheStats,
        initialization: this.minimalGoRulesService.getInitializationStatus(),
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get rule metadata by ID
   */
  @Get('rules/:ruleId/metadata')
  async getRuleMetadata(@Param('ruleId') ruleId: string) {
    try {
      const metadata = await this.minimalGoRulesService.getRuleMetadata(ruleId);

      if (!metadata) {
        throw new HttpException(`Rule ${ruleId} not found`, HttpStatus.NOT_FOUND);
      }

      return {
        success: true,
        metadata,
        message: `Metadata for rule ${ruleId} retrieved successfully`,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to get rule metadata: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get all available rules metadata
   */
  @Get('rules/metadata')
  async getAllRuleMetadata() {
    try {
      const allMetadata = await this.minimalGoRulesService.getAllRuleMetadata();

      // Convert Map to object for JSON serialization
      const metadataObj = Object.fromEntries(allMetadata);

      return {
        success: true,
        metadata: metadataObj,
        count: allMetadata.size,
        message: `Retrieved metadata for ${allMetadata.size} rules`,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get all rule metadata: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get rules by tags
   */
  @Post('rules/by-tags')
  async getRulesByTags(@Body() body: { tags: string[] }) {
    try {
      if (!body.tags || body.tags.length === 0) {
        throw new HttpException('tags array is required', HttpStatus.BAD_REQUEST);
      }

      const ruleIds = await this.minimalGoRulesService.getRulesByTags(body.tags);

      return {
        success: true,
        ruleIds,
        count: ruleIds.length,
        tags: body.tags,
        message: `Found ${ruleIds.length} rules with tags [${body.tags.join(', ')}]`,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to get rules by tags: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Validate a rule exists and is executable
   */
  @Get('rules/:ruleId/validate')
  async validateRule(@Param('ruleId') ruleId: string) {
    try {
      const isValid = await this.minimalGoRulesService.validateRule(ruleId);

      return {
        success: true,
        ruleId,
        isValid,
        message: isValid ? `Rule ${ruleId} is valid` : `Rule ${ruleId} is not valid or not found`,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to validate rule: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Check rule versions
   */
  @Post('cache/check-versions')
  async checkVersions() {
    try {
      const versionCheck = await this.minimalGoRulesService.checkVersions();

      return {
        success: true,
        versionCheck,
        message: `Version check completed. ${versionCheck.outdatedRules.length} rules need updates`,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to check versions: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Refresh cache
   */
  @Post('cache/refresh')
  async refreshCache(@Body() body?: { ruleIds?: string[] }) {
    try {
      const refreshResult = await this.minimalGoRulesService.refreshCache(body?.ruleIds);

      return {
        success: true,
        refreshResult,
        message: `Cache refresh completed. ${refreshResult.refreshedRules.length} rules refreshed`,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to refresh cache: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Force refresh entire cache
   */
  @Post('cache/force-refresh')
  async forceRefreshCache() {
    try {
      const status = await this.minimalGoRulesService.forceRefreshCache();

      return {
        success: true,
        status,
        message: `Cache force refresh completed. ${status.rulesLoaded} rules loaded`,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to force refresh cache: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * High-performance batch execution for large datasets
   * Memory-optimized with controlled concurrency
   */
  @Post('batch-execute')
  async batchExecute(@Body() request: BatchExecuteRequest): Promise<BatchExecuteResponse> {
    try {
      if (!request.inputs || request.inputs.length === 0) {
        throw new HttpException(
          'inputs array is required and cannot be empty',
          HttpStatus.BAD_REQUEST,
        );
      }

      let effectiveInputs = request.inputs;
      if (request.multiplyInputBy && request.multiplyInputBy > 1) {
        const multiplier = Math.floor(request.multiplyInputBy);
        const newLength = request.inputs.length * multiplier;
        if (newLength > 100000) {
          throw new HttpException(
            'Maximum 100,000 inputs allowed per batch after multiplication',
            HttpStatus.BAD_REQUEST,
          );
        }
        effectiveInputs = Array.from({ length: multiplier }, () =>
          request.inputs.map((input) => ({ ...input })),
        ).flat();
      }

      if (effectiveInputs.length > 100000) {
        throw new HttpException('Maximum 100,000 inputs allowed per batch', HttpStatus.BAD_REQUEST);
      }
      let result;
      if (request.ruleIds && request.ruleIds.length > 0) {
        // Use rule IDs for optimal performance
        result = await this.minimalGoRulesService.executeBatchByRules(
          effectiveInputs,
          request.ruleIds,
          request.options,
        );
      } else if (request.tags && request.tags.length > 0) {
        // Use tags
        result = await this.minimalGoRulesService.executeBatchByTags(
          effectiveInputs,
          request.tags,
          request.options,
        );
      } else if (request.selector) {
        // Use selector
        result = await this.minimalGoRulesService.executeBatch(
          effectiveInputs,
          request.selector,
          request.options,
        );
      } else {
        throw new HttpException(
          'Either ruleIds, tags, or selector must be provided',
          HttpStatus.BAD_REQUEST,
        );
      }
      // Convert Map objects to plain objects for JSON serialization
      const serializedResults = result.results.map((inputResult) => ({
        inputIndex: inputResult.inputIndex,
        results: Object.fromEntries(inputResult.results),
        errors: inputResult.errors ? Object.fromEntries(inputResult.errors) : undefined,
        success: inputResult.success,
      }));
      const response: BatchExecuteResponse = {
        success: true,
        results: serializedResults,
        message: `Successfully processed ${result.results.length} inputs`,
      };
      return response;
    } catch (error) {
      throw new HttpException(
        `Batch execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Ultra-fast batch execution with pre-resolved rule IDs
   * Optimized for maximum performance with 70K+ BOM line items
   */
  @Post('batch-execute-by-rules')
  async batchExecuteByRules(
    @Body()
    request: {
      inputs: Record<string, unknown>[];
      ruleIds: string[];
      options?: BatchExecutionOptions;
      multiplyInputBy?: number;
    },
  ): Promise<BatchExecuteResponse> {
    try {
      if (!request.inputs || request.inputs.length === 0) {
        throw new HttpException(
          'inputs array is required and cannot be empty',
          HttpStatus.BAD_REQUEST,
        );
      }
      if (!request.ruleIds || request.ruleIds.length === 0) {
        throw new HttpException(
          'ruleIds array is required and cannot be empty',
          HttpStatus.BAD_REQUEST,
        );
      }

      let effectiveInputs = request.inputs;
      if (request.multiplyInputBy && request.multiplyInputBy > 1) {
        const multiplier = Math.floor(request.multiplyInputBy);
        const newLength = request.inputs.length * multiplier;
        if (newLength > 100000) {
          throw new HttpException(
            'Maximum 100,000 inputs allowed per batch after multiplication',
            HttpStatus.BAD_REQUEST,
          );
        }
        effectiveInputs = Array.from({ length: multiplier }, () =>
          request.inputs.map((input) => ({ ...input })),
        ).flat();
      }

      if (effectiveInputs.length > 100000) {
        throw new HttpException('Maximum 100,000 inputs allowed per batch', HttpStatus.BAD_REQUEST);
      }
      const result = await this.minimalGoRulesService.executeBatchByRules(
        effectiveInputs,
        request.ruleIds,
        request.options,
      );
      // Convert Map objects to plain objects for JSON serialization
      const serializedResults = result.results.map((inputResult) => ({
        inputIndex: inputResult.inputIndex,
        results: Object.fromEntries(inputResult.results),
        errors: inputResult.errors ? Object.fromEntries(inputResult.errors) : undefined,
        success: inputResult.success,
      }));
      const response: BatchExecuteResponse = {
        success: true,
        results: serializedResults,
        message: `Successfully processed ${result.results.length} inputs against ${request.ruleIds.length} rules`,
      };
      return response;
    } catch (error) {
      throw new HttpException(
        `Batch execution by rules failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * High-performance batch execution by tags
   * Memory-efficient processing for large datasets
   */
  @Post('batch-execute-by-tags')
  async batchExecuteByTags(
    @Body()
    request: {
      inputs: Record<string, unknown>[];
      tags: string[];
      options?: BatchExecutionOptions;
      multiplyInputBy?: number;
    },
  ): Promise<BatchExecuteResponse> {
    try {
      if (!request.inputs || request.inputs.length === 0) {
        throw new HttpException(
          'inputs array is required and cannot be empty',
          HttpStatus.BAD_REQUEST,
        );
      }
      if (!request.tags || request.tags.length === 0) {
        throw new HttpException(
          'tags array is required and cannot be empty',
          HttpStatus.BAD_REQUEST,
        );
      }

      let effectiveInputs = request.inputs;
      if (request.multiplyInputBy && request.multiplyInputBy > 1) {
        const multiplier = Math.floor(request.multiplyInputBy);
        const newLength = request.inputs.length * multiplier;
        if (newLength > 100000) {
          throw new HttpException(
            'Maximum 100,000 inputs allowed per batch after multiplication',
            HttpStatus.BAD_REQUEST,
          );
        }
        effectiveInputs = Array.from({ length: multiplier }, () =>
          request.inputs.map((input) => ({ ...input })),
        ).flat();
      }

      if (effectiveInputs.length > 100000) {
        throw new HttpException('Maximum 100,000 inputs allowed per batch', HttpStatus.BAD_REQUEST);
      }
      const result = await this.minimalGoRulesService.executeBatchByTags(
        effectiveInputs,
        request.tags,
        request.options,
      );
      // Convert Map objects to plain objects for JSON serialization
      const serializedResults = result.results.map((inputResult) => ({
        inputIndex: inputResult.inputIndex,
        results: Object.fromEntries(inputResult.results),
        errors: inputResult.errors ? Object.fromEntries(inputResult.errors) : undefined,
        success: inputResult.success,
      }));
      const response: BatchExecuteResponse = {
        success: true,
        results: serializedResults,
        message: `Successfully processed ${
          result.results.length
        } inputs with tags [${request.tags.join(', ')}]`,
      };
      return response;
    } catch (error) {
      throw new HttpException(
        `Batch execution by tags failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
