# NestJS Integration Guide

Complete guide for integrating the Minimal GoRules Engine with NestJS applications.

## Table of Contents

- [Installation](#installation)
- [Module Setup](#module-setup)
- [Configuration](#configuration)
- [Service Integration](#service-integration)
- [Controller Examples](#controller-examples)
- [Advanced Patterns](#advanced-patterns)
- [Testing](#testing)
- [Performance Optimization](#performance-optimization)

## Installation

```bash
npm install @your-org/minimal-gorules
```

## Module Setup

### Basic Module Configuration

Create a GoRules module for your NestJS application:

```typescript
// src/gorules/gorules.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MinimalGoRulesEngine } from '@your-org/minimal-gorules';
import { GoRulesService } from './gorules.service';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'GORULES_CONFIG',
      useFactory: (configService: ConfigService) => ({
        apiUrl: configService.get<string>('GORULES_API_URL'),
        apiKey: configService.get<string>('GORULES_API_KEY'),
        projectId: configService.get<string>('GORULES_PROJECT_ID'),
        cacheMaxSize: configService.get<number>('GORULES_CACHE_SIZE', 1000),
        httpTimeout: configService.get<number>('GORULES_TIMEOUT', 5000),
        platform: 'node' as const,
      }),
      inject: [ConfigService],
    },
    {
      provide: MinimalGoRulesEngine,
      useFactory: (config) => new MinimalGoRulesEngine(config),
      inject: ['GORULES_CONFIG'],
    },
    GoRulesService,
  ],
  exports: [MinimalGoRulesEngine, GoRulesService],
})
export class GoRulesModule {}
```

### High-Performance Module Configuration

For high-performance scenarios with advanced optimizations:

```typescript
// src/gorules/gorules-performance.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MinimalGoRulesEngine } from '@your-org/minimal-gorules';
import { GoRulesService } from './gorules.service';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'GORULES_CONFIG',
      useFactory: (configService: ConfigService) => ({
        apiUrl: configService.get<string>('GORULES_API_URL'),
        apiKey: configService.get<string>('GORULES_API_KEY'),
        projectId: configService.get<string>('GORULES_PROJECT_ID'),
        cacheMaxSize: configService.get<number>('GORULES_CACHE_SIZE', 5000),
        httpTimeout: configService.get<number>('GORULES_TIMEOUT', 10000),
        batchSize: configService.get<number>('GORULES_BATCH_SIZE', 100),
        platform: 'node' as const,

        // Performance optimizations
        enablePerformanceOptimizations: true,
        enablePerformanceMetrics: true,
        enableConnectionPooling: true,
        enableRequestBatching: true,
        enableCompression: true,
        compressionAlgorithm: 'gzip' as const,

        // Memory management
        memoryWarningThreshold: 0.7,
        memoryCriticalThreshold: 0.85,
        memoryCleanupInterval: 30000,
      }),
      inject: [ConfigService],
    },
    {
      provide: MinimalGoRulesEngine,
      useFactory: async (config) => {
        const engine = new MinimalGoRulesEngine(config);
        await engine.initialize(); // Initialize on startup
        return engine;
      },
      inject: ['GORULES_CONFIG'],
    },
    GoRulesService,
  ],
  exports: [MinimalGoRulesEngine, GoRulesService],
})
export class GoRulesPerformanceModule {}
```

## Configuration

### Environment Variables

Set up your environment variables:

```bash
# .env
GORULES_API_URL=https://api.gorules.io
GORULES_API_KEY=your-api-key-here
GORULES_PROJECT_ID=your-project-id
GORULES_CACHE_SIZE=1000
GORULES_TIMEOUT=5000
GORULES_BATCH_SIZE=50
```

### Configuration Validation

Create a configuration schema for validation:

```typescript
// src/config/gorules.config.ts
import { IsString, IsNumber, IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class GoRulesConfig {
  @IsString()
  GORULES_API_URL: string;

  @IsString()
  GORULES_API_KEY: string;

  @IsString()
  GORULES_PROJECT_ID: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  GORULES_CACHE_SIZE?: number = 1000;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  GORULES_TIMEOUT?: number = 5000;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  GORULES_BATCH_SIZE?: number = 50;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  GORULES_ENABLE_PERFORMANCE_OPTIMIZATIONS?: boolean = false;
}
```

## Service Integration

### Basic Service Implementation

```typescript
// src/gorules/gorules.service.ts
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import {
  MinimalGoRulesEngine,
  RuleSelector,
  MinimalExecutionResult,
  MinimalGoRulesError,
  MinimalErrorCode,
} from '@your-org/minimal-gorules';

@Injectable()
export class GoRulesService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GoRulesService.name);

  constructor(private readonly engine: MinimalGoRulesEngine) {}

  async onModuleInit() {
    try {
      const status = await this.engine.initialize();
      this.logger.log(`GoRules engine initialized with ${status.rulesLoaded} rules`);
    } catch (error) {
      this.logger.error('Failed to initialize GoRules engine', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.engine.cleanup();
      this.logger.log('GoRules engine cleaned up');
    } catch (error) {
      this.logger.warn('Error during GoRules engine cleanup', error);
    }
  }

  /**
   * Execute a single rule
   */
  async executeRule<T = unknown>(ruleId: string, input: Record<string, unknown>): Promise<T> {
    try {
      return await this.engine.executeRule<T>(ruleId, input);
    } catch (error) {
      this.handleError(error, ruleId);
      throw error;
    }
  }

  /**
   * Execute multiple rules in parallel
   */
  async executeRules<T = unknown>(
    ruleIds: string[],
    input: Record<string, unknown>,
  ): Promise<MinimalExecutionResult<T>> {
    try {
      return await this.engine.executeRules<T>(ruleIds, input);
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Execute rules by tags
   */
  async executeByTags<T = unknown>(
    tags: string[],
    input: Record<string, unknown>,
    mode: 'parallel' | 'sequential' = 'parallel',
  ): Promise<MinimalExecutionResult<T>> {
    try {
      return await this.engine.executeByTags<T>(tags, input, mode);
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Execute rules with custom selector
   */
  async execute<T = unknown>(
    selector: RuleSelector,
    input: Record<string, unknown>,
  ): Promise<MinimalExecutionResult<T>> {
    try {
      return await this.engine.execute<T>(selector, input);
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Get engine status
   */
  async getStatus() {
    return await this.engine.getStatus();
  }

  /**
   * Get rule metadata
   */
  async getRuleMetadata(ruleId: string) {
    return await this.engine.getRuleMetadata(ruleId);
  }

  /**
   * Get all rule metadata
   */
  async getAllRuleMetadata() {
    return await this.engine.getAllRuleMetadata();
  }

  /**
   * Get rules by tags
   */
  async getRulesByTags(tags: string[]) {
    return await this.engine.getRulesByTags(tags);
  }

  /**
   * Check for rule version updates
   */
  async checkVersions() {
    return await this.engine.checkVersions();
  }

  /**
   * Refresh outdated rules
   */
  async refreshCache(ruleIds?: string[]) {
    return await this.engine.refreshCache(ruleIds);
  }

  /**
   * Validate rule exists
   */
  async validateRule(ruleId: string) {
    return await this.engine.validateRule(ruleId);
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.engine.getCacheStats();
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats() {
    return this.engine.getPerformanceStats();
  }

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
```

## Controller Examples

### Basic REST Controller

```typescript
// src/gorules/gorules.controller.ts
import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  HttpException,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GoRulesService } from './gorules.service';
import { ExecuteRuleDto, ExecuteRulesDto, ExecuteByTagsDto, RuleSelectorDto } from './dto';

@ApiTags('rules')
@Controller('rules')
export class GoRulesController {
  constructor(private readonly goRulesService: GoRulesService) {}

  @Post('execute/:ruleId')
  @ApiOperation({ summary: 'Execute a single rule' })
  @ApiResponse({ status: 200, description: 'Rule executed successfully' })
  async executeRule(@Param('ruleId') ruleId: string, @Body() dto: ExecuteRuleDto) {
    try {
      const result = await this.goRulesService.executeRule(ruleId, dto.input);
      return {
        success: true,
        ruleId,
        result,
        executedAt: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(`Failed to execute rule: ${error.message}`, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('execute/batch')
  @ApiOperation({ summary: 'Execute multiple rules' })
  async executeRules(@Body() dto: ExecuteRulesDto) {
    try {
      const result = await this.goRulesService.executeRules(dto.ruleIds, dto.input);

      return {
        success: true,
        executionTime: result.executionTime,
        results: Object.fromEntries(result.results),
        errors: result.errors ? Object.fromEntries(result.errors) : undefined,
        executedAt: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(`Failed to execute rules: ${error.message}`, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('execute/tags')
  @ApiOperation({ summary: 'Execute rules by tags' })
  async executeByTags(@Body() dto: ExecuteByTagsDto) {
    try {
      const result = await this.goRulesService.executeByTags(dto.tags, dto.input, dto.mode);

      return {
        success: true,
        executionTime: result.executionTime,
        results: Object.fromEntries(result.results),
        errors: result.errors ? Object.fromEntries(result.errors) : undefined,
        executedAt: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        `Failed to execute rules by tags: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('execute/advanced')
  @ApiOperation({ summary: 'Execute rules with custom selector' })
  async execute(@Body() dto: RuleSelectorDto) {
    try {
      const result = await this.goRulesService.execute(dto.selector, dto.input);

      return {
        success: true,
        executionTime: result.executionTime,
        results: Object.fromEntries(result.results),
        errors: result.errors ? Object.fromEntries(result.errors) : undefined,
        executedAt: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(`Failed to execute rules: ${error.message}`, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('status')
  @ApiOperation({ summary: 'Get engine status' })
  async getStatus() {
    const status = await this.goRulesService.getStatus();
    return {
      ...status,
      cacheStats: this.goRulesService.getCacheStats(),
      performanceStats: this.goRulesService.getPerformanceStats(),
    };
  }

  @Get('metadata')
  @ApiOperation({ summary: 'Get all rule metadata' })
  async getAllMetadata() {
    const metadata = await this.goRulesService.getAllRuleMetadata();
    return {
      rules: Object.fromEntries(metadata),
      totalRules: metadata.size,
    };
  }

  @Get('metadata/:ruleId')
  @ApiOperation({ summary: 'Get rule metadata' })
  async getRuleMetadata(@Param('ruleId') ruleId: string) {
    const metadata = await this.goRulesService.getRuleMetadata(ruleId);
    if (!metadata) {
      throw new HttpException('Rule not found', HttpStatus.NOT_FOUND);
    }
    return metadata;
  }

  @Get('tags/:tag')
  @ApiOperation({ summary: 'Get rules by tag' })
  async getRulesByTag(@Param('tag') tag: string) {
    const ruleIds = await this.goRulesService.getRulesByTags([tag]);
    return {
      tag,
      ruleIds,
      count: ruleIds.length,
    };
  }

  @Post('cache/refresh')
  @ApiOperation({ summary: 'Refresh rule cache' })
  async refreshCache(@Body() dto?: { ruleIds?: string[] }) {
    const result = await this.goRulesService.refreshCache(dto?.ruleIds);
    return {
      success: true,
      refreshedRules: result.refreshedRules,
      failedRules: result.failedRules ? Object.fromEntries(result.failedRules) : {},
      totalProcessed: result.totalProcessed,
      refreshTime: result.refreshTime,
    };
  }

  @Get('versions/check')
  @ApiOperation({ summary: 'Check rule versions' })
  async checkVersions() {
    return await this.goRulesService.checkVersions();
  }
}
```

### DTOs for Request Validation

```typescript
// src/gorules/dto/index.ts
import { IsObject, IsArray, IsString, IsOptional, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RuleSelector } from '@your-org/minimal-gorules';

export class ExecuteRuleDto {
  @ApiProperty({ description: 'Input data for rule execution' })
  @IsObject()
  input: Record<string, unknown>;
}

export class ExecuteRulesDto {
  @ApiProperty({ description: 'Array of rule IDs to execute' })
  @IsArray()
  @IsString({ each: true })
  ruleIds: string[];

  @ApiProperty({ description: 'Input data for rule execution' })
  @IsObject()
  input: Record<string, unknown>;
}

export class ExecuteByTagsDto {
  @ApiProperty({ description: 'Array of tags to match' })
  @IsArray()
  @IsString({ each: true })
  tags: string[];

  @ApiProperty({ description: 'Input data for rule execution' })
  @IsObject()
  input: Record<string, unknown>;

  @ApiProperty({
    description: 'Execution mode',
    enum: ['parallel', 'sequential'],
    default: 'parallel',
  })
  @IsOptional()
  @IsIn(['parallel', 'sequential'])
  mode?: 'parallel' | 'sequential' = 'parallel';
}

export class RuleSelectorDto {
  @ApiProperty({ description: 'Rule selector configuration' })
  @IsObject()
  selector: RuleSelector;

  @ApiProperty({ description: 'Input data for rule execution' })
  @IsObject()
  input: Record<string, unknown>;
}
```

## Advanced Patterns

### Health Check Integration

```typescript
// src/health/gorules.health.ts
import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { GoRulesService } from '../gorules/gorules.service';

@Injectable()
export class GoRulesHealthIndicator extends HealthIndicator {
  constructor(private readonly goRulesService: GoRulesService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const status = await this.goRulesService.getStatus();
      const cacheStats = this.goRulesService.getCacheStats();

      const isHealthy = status.initialized && status.rulesLoaded > 0;

      const result = this.getStatus(key, isHealthy, {
        initialized: status.initialized,
        rulesLoaded: status.rulesLoaded,
        cacheSize: cacheStats.size,
        lastUpdate: new Date(status.lastUpdate).toISOString(),
      });

      if (isHealthy) {
        return result;
      }

      throw new HealthCheckError('GoRules engine is not healthy', result);
    } catch (error) {
      throw new HealthCheckError('GoRules health check failed', {
        [key]: {
          status: 'down',
          error: error.message,
        },
      });
    }
  }
}
```

### Caching with Redis

```typescript
// src/gorules/gorules-cache.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { GoRulesService } from './gorules.service';

@Injectable()
export class GoRulesCacheService {
  constructor(
    private readonly goRulesService: GoRulesService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async executeRuleWithCache<T = unknown>(
    ruleId: string,
    input: Record<string, unknown>,
    ttl: number = 300, // 5 minutes
  ): Promise<T> {
    // Create cache key from rule ID and input hash
    const inputHash = this.hashInput(input);
    const cacheKey = `rule:${ruleId}:${inputHash}`;

    // Try to get from cache first
    const cached = await this.cacheManager.get<T>(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    // Execute rule and cache result
    const result = await this.goRulesService.executeRule<T>(ruleId, input);
    await this.cacheManager.set(cacheKey, result, ttl);

    return result;
  }

  private hashInput(input: Record<string, unknown>): string {
    // Simple hash function - use crypto.createHash for production
    return Buffer.from(JSON.stringify(input)).toString('base64');
  }
}
```

### Background Rule Updates

```typescript
// src/gorules/gorules-scheduler.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { GoRulesService } from './gorules.service';

@Injectable()
export class GoRulesSchedulerService {
  private readonly logger = new Logger(GoRulesSchedulerService.name);

  constructor(private readonly goRulesService: GoRulesService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkForUpdates() {
    try {
      this.logger.log('Checking for rule updates...');

      const versionCheck = await this.goRulesService.checkVersions();

      if (versionCheck.outdatedRules.length > 0) {
        this.logger.log(`Found ${versionCheck.outdatedRules.length} outdated rules`);

        const refreshResult = await this.goRulesService.refreshCache(versionCheck.outdatedRules);

        this.logger.log(
          `Refreshed ${refreshResult.refreshedRules.length} rules, ` +
            `${refreshResult.failedRules.size} failed`,
        );
      } else {
        this.logger.log('All rules are up to date');
      }
    } catch (error) {
      this.logger.error('Failed to check for rule updates', error);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async logPerformanceStats() {
    try {
      const status = await this.goRulesService.getStatus();
      const cacheStats = this.goRulesService.getCacheStats();
      const perfStats = this.goRulesService.getPerformanceStats();

      this.logger.log('Performance Stats:', {
        rulesLoaded: status.rulesLoaded,
        cacheSize: cacheStats.size,
        memoryUsage: perfStats.memoryUsage,
        averageExecutionTime: perfStats.averageExecutionTime,
      });
    } catch (error) {
      this.logger.warn('Failed to log performance stats', error);
    }
  }
}
```

## Testing

### Unit Testing

```typescript
// src/gorules/gorules.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { MinimalGoRulesEngine } from '@your-org/minimal-gorules';
import { GoRulesService } from './gorules.service';

describe('GoRulesService', () => {
  let service: GoRulesService;
  let engine: jest.Mocked<MinimalGoRulesEngine>;

  beforeEach(async () => {
    const mockEngine = {
      initialize: jest.fn(),
      executeRule: jest.fn(),
      executeRules: jest.fn(),
      executeByTags: jest.fn(),
      getStatus: jest.fn(),
      cleanup: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoRulesService,
        {
          provide: MinimalGoRulesEngine,
          useValue: mockEngine,
        },
      ],
    }).compile();

    service = module.get<GoRulesService>(GoRulesService);
    engine = module.get(MinimalGoRulesEngine);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should initialize engine on module init', async () => {
    const mockStatus = {
      initialized: true,
      rulesLoaded: 10,
      lastUpdate: Date.now(),
      projectId: 'test-project',
      version: '1.0.0',
    };

    engine.initialize.mockResolvedValue(mockStatus);

    await service.onModuleInit();

    expect(engine.initialize).toHaveBeenCalled();
  });

  it('should execute rule successfully', async () => {
    const mockResult = { approved: true, score: 85 };
    engine.executeRule.mockResolvedValue(mockResult);

    const result = await service.executeRule('test-rule', { userId: 123 });

    expect(result).toEqual(mockResult);
    expect(engine.executeRule).toHaveBeenCalledWith('test-rule', { userId: 123 });
  });

  it('should handle rule execution errors', async () => {
    const error = new Error('Rule execution failed');
    engine.executeRule.mockRejectedValue(error);

    await expect(service.executeRule('test-rule', { userId: 123 })).rejects.toThrow(
      'Rule execution failed',
    );
  });
});
```

### Integration Testing

```typescript
// src/gorules/gorules.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { GoRulesController } from './gorules.controller';
import { GoRulesService } from './gorules.service';

describe('GoRulesController', () => {
  let controller: GoRulesController;
  let service: jest.Mocked<GoRulesService>;

  beforeEach(async () => {
    const mockService = {
      executeRule: jest.fn(),
      executeRules: jest.fn(),
      executeByTags: jest.fn(),
      getStatus: jest.fn(),
      getCacheStats: jest.fn(),
      getPerformanceStats: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GoRulesController],
      providers: [
        {
          provide: GoRulesService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<GoRulesController>(GoRulesController);
    service = module.get(GoRulesService);
  });

  it('should execute rule via REST endpoint', async () => {
    const mockResult = { approved: true };
    service.executeRule.mockResolvedValue(mockResult);

    const result = await controller.executeRule('test-rule', {
      input: { userId: 123 },
    });

    expect(result.success).toBe(true);
    expect(result.result).toEqual(mockResult);
    expect(service.executeRule).toHaveBeenCalledWith('test-rule', { userId: 123 });
  });
});
```

### E2E Testing

```typescript
// test/gorules.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('GoRules (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/rules/execute/:ruleId (POST)', () => {
    return request(app.getHttpServer())
      .post('/rules/execute/test-rule')
      .send({ input: { userId: 123, amount: 100 } })
      .expect(200)
      .expect((res) => {
        expect(res.body.success).toBe(true);
        expect(res.body.ruleId).toBe('test-rule');
        expect(res.body.result).toBeDefined();
      });
  });

  it('/rules/status (GET)', () => {
    return request(app.getHttpServer())
      .get('/rules/status')
      .expect(200)
      .expect((res) => {
        expect(res.body.initialized).toBe(true);
        expect(res.body.rulesLoaded).toBeGreaterThan(0);
      });
  });
});
```

## Performance Optimization

### Connection Pooling

```typescript
// src/gorules/gorules-optimized.module.ts
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MinimalGoRulesEngine } from '@your-org/minimal-gorules';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 3,
      // Connection pooling
      httpAgent: new (require('http').Agent)({
        keepAlive: true,
        maxSockets: 100,
        maxFreeSockets: 10,
        timeout: 60000,
        freeSocketTimeout: 30000,
      }),
      httpsAgent: new (require('https').Agent)({
        keepAlive: true,
        maxSockets: 100,
        maxFreeSockets: 10,
        timeout: 60000,
        freeSocketTimeout: 30000,
      }),
    }),
  ],
  providers: [
    {
      provide: MinimalGoRulesEngine,
      useFactory: () =>
        new MinimalGoRulesEngine({
          // ... config with performance optimizations
          enablePerformanceOptimizations: true,
          enableConnectionPooling: true,
          enableRequestBatching: true,
          enableCompression: true,
        }),
    },
  ],
})
export class GoRulesOptimizedModule {}
```

### Monitoring and Metrics

```typescript
// src/gorules/gorules-metrics.service.ts
import { Injectable } from '@nestjs/common';
import { MetricsService } from '@nestjs/metrics';
import { GoRulesService } from './gorules.service';

@Injectable()
export class GoRulesMetricsService {
  constructor(
    private readonly goRulesService: GoRulesService,
    private readonly metricsService: MetricsService,
  ) {}

  async recordExecutionMetrics(ruleId: string, executionTime: number, success: boolean) {
    // Record execution time histogram
    this.metricsService.histogram('gorules_execution_duration_ms', executionTime, {
      rule_id: ruleId,
      success: success.toString(),
    });

    // Increment execution counter
    this.metricsService.counter('gorules_executions_total', 1, {
      rule_id: ruleId,
      success: success.toString(),
    });

    // Record cache stats
    const cacheStats = this.goRulesService.getCacheStats();
    this.metricsService.gauge('gorules_cache_size', cacheStats.size);
    this.metricsService.gauge('gorules_cache_max_size', cacheStats.maxSize);

    // Record performance stats
    const perfStats = this.goRulesService.getPerformanceStats();
    this.metricsService.gauge('gorules_memory_usage_mb', perfStats.memoryUsage);
  }
}
```

This comprehensive NestJS integration guide provides everything needed to successfully integrate the Minimal GoRules Engine into your NestJS applications, from basic setup to advanced performance optimization patterns.
