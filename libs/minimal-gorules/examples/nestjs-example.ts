/**
 * NestJS Integration Example
 *
 * Complete example showing how to integrate the Minimal GoRules Engine
 * with a NestJS application including module setup, service implementation,
 * and REST API endpoints.
 */

import {
  Module,
  Injectable,
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpException,
  HttpStatus,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { IsObject, IsArray, IsString, IsOptional } from 'class-validator';

import {
  MinimalGoRulesEngine,
  MinimalGoRulesConfig,
  RuleSelector,
  MinimalGoRulesError,
  MinimalErrorCode,
} from '../src/index.js';

// DTOs for API validation
class ExecuteRuleDto {
  @ApiBody({ description: 'Input data for rule execution' })
  @IsObject()
  input: Record<string, unknown>;
}

class ExecuteRulesDto {
  @ApiBody({ description: 'Array of rule IDs to execute' })
  @IsArray()
  @IsString({ each: true })
  ruleIds: string[];

  @ApiBody({ description: 'Input data for rule execution' })
  @IsObject()
  input: Record<string, unknown>;
}

class ExecuteByTagsDto {
  @ApiBody({ description: 'Array of tags to match' })
  @IsArray()
  @IsString({ each: true })
  tags: string[];

  @ApiBody({ description: 'Input data for rule execution' })
  @IsObject()
  input: Record<string, unknown>;

  @ApiBody({
    description: 'Execution mode',
    enum: ['parallel', 'sequential'],
    default: 'parallel',
  })
  @IsOptional()
  @IsString()
  mode?: 'parallel' | 'sequential' = 'parallel';
}

class ExecuteAdvancedDto {
  @ApiBody({ description: 'Rule selector configuration' })
  @IsObject()
  selector: RuleSelector;

  @ApiBody({ description: 'Input data for rule execution' })
  @IsObject()
  input: Record<string, unknown>;
}

// GoRules Service
@Injectable()
export class GoRulesService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GoRulesService.name);

  constructor(private readonly engine: MinimalGoRulesEngine) {}

  async onModuleInit() {
    try {
      this.logger.log('Initializing GoRules engine...');
      const status = await this.engine.initialize();
      this.logger.log(`GoRules engine initialized successfully with ${status.rulesLoaded} rules`);
    } catch (error) {
      this.logger.error('Failed to initialize GoRules engine', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.engine.cleanup();
      this.logger.log('GoRules engine cleaned up successfully');
    } catch (error) {
      this.logger.warn('Error during GoRules engine cleanup', error);
    }
  }

  // Core execution methods
  async executeRule<T = unknown>(ruleId: string, input: Record<string, unknown>): Promise<T> {
    try {
      this.logger.debug(`Executing rule: ${ruleId}`);
      const startTime = Date.now();

      const result = await this.engine.executeRule<T>(ruleId, input);

      const duration = Date.now() - startTime;
      this.logger.debug(`Rule ${ruleId} executed in ${duration}ms`);

      return result;
    } catch (error) {
      this.handleError(error, ruleId);
      throw error;
    }
  }

  async executeRules<T = unknown>(
    ruleIds: string[],
    input: Record<string, unknown>,
  ): Promise<{
    results: Record<string, T>;
    executionTime: number;
    errors?: Record<string, string>;
  }> {
    try {
      this.logger.debug(`Executing ${ruleIds.length} rules: ${ruleIds.join(', ')}`);

      const result = await this.engine.executeRules<T>(ruleIds, input);

      return {
        results: Object.fromEntries(result.results),
        executionTime: result.executionTime,
        errors: result.errors
          ? Object.fromEntries(Array.from(result.errors.entries()).map(([k, v]) => [k, v.message]))
          : undefined,
      };
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  async executeByTags<T = unknown>(
    tags: string[],
    input: Record<string, unknown>,
    mode: 'parallel' | 'sequential' = 'parallel',
  ): Promise<{
    results: Record<string, T>;
    executionTime: number;
    errors?: Record<string, string>;
  }> {
    try {
      this.logger.debug(`Executing rules by tags [${tags.join(', ')}] in ${mode} mode`);

      const result = await this.engine.executeByTags<T>(tags, input, mode);

      return {
        results: Object.fromEntries(result.results),
        executionTime: result.executionTime,
        errors: result.errors
          ? Object.fromEntries(Array.from(result.errors.entries()).map(([k, v]) => [k, v.message]))
          : undefined,
      };
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  async executeAdvanced<T = unknown>(
    selector: RuleSelector,
    input: Record<string, unknown>,
  ): Promise<{
    results: Record<string, T>;
    executionTime: number;
    errors?: Record<string, string>;
  }> {
    try {
      this.logger.debug(`Executing advanced selector: ${JSON.stringify(selector.mode)}`);

      const result = await this.engine.execute<T>(selector, input);

      return {
        results: Object.fromEntries(result.results),
        executionTime: result.executionTime,
        errors: result.errors
          ? Object.fromEntries(Array.from(result.errors.entries()).map(([k, v]) => [k, v.message]))
          : undefined,
      };
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  // Management methods
  async getStatus() {
    const status = await this.engine.getStatus();
    const cacheStats = this.engine.getCacheStats();
    const perfStats = this.engine.getPerformanceStats();

    return {
      ...status,
      cache: {
        size: cacheStats.size,
        maxSize: cacheStats.maxSize,
        hitRate: cacheStats.hitRate,
      },
      performance: {
        memoryUsage: perfStats.memoryUsage,
        averageExecutionTime: perfStats.averageExecutionTime,
      },
    };
  }

  async getRuleMetadata(ruleId: string) {
    return await this.engine.getRuleMetadata(ruleId);
  }

  async getAllRuleMetadata() {
    const metadata = await this.engine.getAllRuleMetadata();
    return Object.fromEntries(metadata);
  }

  async getRulesByTags(tags: string[]) {
    return await this.engine.getRulesByTags(tags);
  }

  async validateRule(ruleId: string) {
    return await this.engine.validateRule(ruleId);
  }

  async checkVersions() {
    return await this.engine.checkVersions();
  }

  async refreshCache(ruleIds?: string[]) {
    const result = await this.engine.refreshCache(ruleIds);
    return {
      refreshedRules: result.refreshedRules,
      failedRules: result.failedRules
        ? Object.fromEntries(
            Array.from(result.failedRules.entries()).map(([k, v]) => [k, v.message]),
          )
        : {},
      totalProcessed: result.totalProcessed,
      refreshTime: result.refreshTime,
    };
  }

  // Error handling
  private handleError(error: unknown, ruleId?: string) {
    if (error instanceof MinimalGoRulesError) {
      switch (error.code) {
        case MinimalErrorCode.RULE_NOT_FOUND:
          this.logger.warn(`Rule not found: ${ruleId || error.ruleId}`);
          break;
        case MinimalErrorCode.NETWORK_ERROR:
          this.logger.error('GoRules API network error', error);
          break;
        case MinimalErrorCode.TIMEOUT:
          this.logger.warn('GoRules operation timeout', error);
          break;
        case MinimalErrorCode.EXECUTION_ERROR:
          this.logger.error('Rule execution error', error);
          break;
        default:
          this.logger.error('Unknown GoRules error', error);
      }
    } else {
      this.logger.error('Unexpected error in GoRules service', error);
    }
  }
}

// REST Controller
@ApiTags('rules')
@Controller('api/rules')
export class GoRulesController {
  private readonly logger = new Logger(GoRulesController.name);

  constructor(private readonly goRulesService: GoRulesService) {}

  @Post('execute/:ruleId')
  @ApiOperation({ summary: 'Execute a single rule by ID' })
  @ApiResponse({ status: 200, description: 'Rule executed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input or rule not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async executeRule(@Param('ruleId') ruleId: string, @Body() dto: ExecuteRuleDto) {
    try {
      const startTime = Date.now();
      const result = await this.goRulesService.executeRule(ruleId, dto.input);
      const executionTime = Date.now() - startTime;

      return {
        success: true,
        ruleId,
        result,
        executionTime,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to execute rule ${ruleId}`, error);

      if (error instanceof MinimalGoRulesError) {
        const statusCode = this.getHttpStatusFromError(error);
        throw new HttpException(error.message, statusCode);
      }

      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('execute/batch')
  @ApiOperation({ summary: 'Execute multiple rules in parallel' })
  @ApiResponse({ status: 200, description: 'Rules executed successfully' })
  async executeRules(@Body() dto: ExecuteRulesDto) {
    try {
      const result = await this.goRulesService.executeRules(dto.ruleIds, dto.input);

      return {
        success: true,
        ...result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to execute rules batch', error);
      throw new HttpException(`Failed to execute rules: ${error.message}`, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('execute/tags')
  @ApiOperation({ summary: 'Execute rules by tags' })
  @ApiResponse({ status: 200, description: 'Rules executed successfully' })
  async executeByTags(@Body() dto: ExecuteByTagsDto) {
    try {
      const result = await this.goRulesService.executeByTags(dto.tags, dto.input, dto.mode);

      return {
        success: true,
        tags: dto.tags,
        mode: dto.mode,
        ...result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to execute rules by tags', error);
      throw new HttpException(
        `Failed to execute rules by tags: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('execute/advanced')
  @ApiOperation({ summary: 'Execute rules with advanced selector' })
  @ApiResponse({ status: 200, description: 'Rules executed successfully' })
  async executeAdvanced(@Body() dto: ExecuteAdvancedDto) {
    try {
      const result = await this.goRulesService.executeAdvanced(dto.selector, dto.input);

      return {
        success: true,
        selector: dto.selector,
        ...result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to execute advanced rules', error);
      throw new HttpException(
        `Failed to execute advanced rules: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('status')
  @ApiOperation({ summary: 'Get engine status and statistics' })
  @ApiResponse({ status: 200, description: 'Engine status retrieved successfully' })
  async getStatus() {
    try {
      return await this.goRulesService.getStatus();
    } catch (error) {
      this.logger.error('Failed to get engine status', error);
      throw new HttpException('Failed to get engine status', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('metadata')
  @ApiOperation({ summary: 'Get all rule metadata' })
  @ApiResponse({ status: 200, description: 'Rule metadata retrieved successfully' })
  async getAllMetadata() {
    try {
      const metadata = await this.goRulesService.getAllRuleMetadata();
      return {
        rules: metadata,
        totalRules: Object.keys(metadata).length,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to get rule metadata', error);
      throw new HttpException('Failed to get rule metadata', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('metadata/:ruleId')
  @ApiOperation({ summary: 'Get specific rule metadata' })
  @ApiResponse({ status: 200, description: 'Rule metadata retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Rule not found' })
  async getRuleMetadata(@Param('ruleId') ruleId: string) {
    try {
      const metadata = await this.goRulesService.getRuleMetadata(ruleId);

      if (!metadata) {
        throw new HttpException('Rule not found', HttpStatus.NOT_FOUND);
      }

      return metadata;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(`Failed to get metadata for rule ${ruleId}`, error);
      throw new HttpException('Failed to get rule metadata', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('validate/:ruleId')
  @ApiOperation({ summary: 'Validate that a rule exists and is executable' })
  @ApiResponse({ status: 200, description: 'Rule validation result' })
  async validateRule(@Param('ruleId') ruleId: string) {
    try {
      const isValid = await this.goRulesService.validateRule(ruleId);
      return {
        ruleId,
        valid: isValid,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to validate rule ${ruleId}`, error);
      return {
        ruleId,
        valid: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Post('cache/refresh')
  @ApiOperation({ summary: 'Refresh rule cache' })
  @ApiResponse({ status: 200, description: 'Cache refreshed successfully' })
  async refreshCache(@Body() body?: { ruleIds?: string[] }) {
    try {
      const result = await this.goRulesService.refreshCache(body?.ruleIds);
      return {
        success: true,
        ...result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to refresh cache', error);
      throw new HttpException(
        `Failed to refresh cache: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('versions/check')
  @ApiOperation({ summary: 'Check for rule version updates' })
  @ApiResponse({ status: 200, description: 'Version check completed' })
  async checkVersions() {
    try {
      const result = await this.goRulesService.checkVersions();
      return {
        ...result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to check versions', error);
      throw new HttpException(
        `Failed to check versions: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private getHttpStatusFromError(error: MinimalGoRulesError): HttpStatus {
    switch (error.code) {
      case MinimalErrorCode.RULE_NOT_FOUND:
        return HttpStatus.NOT_FOUND;
      case MinimalErrorCode.INVALID_INPUT:
        return HttpStatus.BAD_REQUEST;
      case MinimalErrorCode.TIMEOUT:
        return HttpStatus.REQUEST_TIMEOUT;
      case MinimalErrorCode.NETWORK_ERROR:
      case MinimalErrorCode.EXECUTION_ERROR:
      default:
        return HttpStatus.INTERNAL_SERVER_ERROR;
    }
  }
}

// Main Module
@Module({
  imports: [ConfigModule.forRoot()],
  providers: [
    {
      provide: 'GORULES_CONFIG',
      useFactory: (configService: ConfigService): MinimalGoRulesConfig => {
        const config = {
          apiUrl: configService.get<string>('GORULES_API_URL', 'https://api.gorules.io'),
          apiKey: configService.get<string>('GORULES_API_KEY')!,
          projectId: configService.get<string>('GORULES_PROJECT_ID')!,
          cacheMaxSize: configService.get<number>('GORULES_CACHE_MAX_SIZE', 1000),
          httpTimeout: configService.get<number>('GORULES_TIMEOUT', 5000),
          batchSize: configService.get<number>('GORULES_BATCH_SIZE', 50),
          platform: 'node' as const,

          // Performance optimizations
          enablePerformanceOptimizations: configService.get<boolean>(
            'GORULES_ENABLE_OPTIMIZATIONS',
            false,
          ),
          enablePerformanceMetrics: configService.get<boolean>('GORULES_ENABLE_METRICS', true),
          enableConnectionPooling: configService.get<boolean>('GORULES_ENABLE_POOLING', true),
          enableRequestBatching: configService.get<boolean>('GORULES_ENABLE_BATCHING', true),
          enableCompression: configService.get<boolean>('GORULES_ENABLE_COMPRESSION', true),
        };

        // Validate required configuration
        if (!config.apiKey) {
          throw new Error('GORULES_API_KEY environment variable is required');
        }
        if (!config.projectId) {
          throw new Error('GORULES_PROJECT_ID environment variable is required');
        }

        return config;
      },
      inject: [ConfigService],
    },
    {
      provide: MinimalGoRulesEngine,
      useFactory: (config: MinimalGoRulesConfig) => {
        return new MinimalGoRulesEngine(config);
      },
      inject: ['GORULES_CONFIG'],
    },
    GoRulesService,
  ],
  controllers: [GoRulesController],
  exports: [MinimalGoRulesEngine, GoRulesService],
})
export class GoRulesModule {}

// Example usage in main application module
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    GoRulesModule,
  ],
})
export class AppModule {}

export {
  GoRulesModule,
  GoRulesService,
  GoRulesController,
  ExecuteRuleDto,
  ExecuteRulesDto,
  ExecuteByTagsDto,
  ExecuteAdvancedDto,
};
