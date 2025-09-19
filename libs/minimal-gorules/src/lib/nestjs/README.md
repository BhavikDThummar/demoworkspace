# NestJS Integration for Minimal GoRules Engine

This module provides seamless integration of the Minimal GoRules Engine with NestJS applications, offering dependency injection, configuration management, and lifecycle hooks.

## Features

- **Dependency Injection**: Full NestJS DI support with proper service providers
- **Configuration Management**: Environment-based and factory-based configuration
- **Lifecycle Management**: Automatic initialization and cleanup
- **Health Checks**: Built-in health check support for monitoring
- **Global Module**: Singleton engine instance across the application
- **Async Initialization**: Non-blocking startup with proper error handling

## Installation

The NestJS integration is included with the minimal-gorules library:

```bash
npm install @org/minimal-gorules
```

## Quick Start

### 1. Basic Setup with Environment Variables

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MinimalGoRulesModule } from '@org/minimal-gorules';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MinimalGoRulesModule.forRootWithConfig({
      autoInitialize: true
    })
  ]
})
export class AppModule {}
```

Set environment variables:
```bash
GORULES_API_URL=https://api.gorules.io
GORULES_API_KEY=your-api-key
GORULES_PROJECT_ID=your-project-id
GORULES_CACHE_MAX_SIZE=1000
GORULES_HTTP_TIMEOUT=5000
GORULES_BATCH_SIZE=50
```

### 2. Using the Service

```typescript
import { Injectable } from '@nestjs/common';
import { MinimalGoRulesService } from '@org/minimal-gorules';

@Injectable()
export class BusinessLogicService {
  constructor(
    private readonly goRulesService: MinimalGoRulesService
  ) {}

  async processOrder(orderData: any) {
    // Execute a single rule
    const result = await this.goRulesService.executeRule(
      'order-validation',
      orderData
    );

    // Execute multiple rules in parallel
    const batchResult = await this.goRulesService.executeRules(
      ['pricing', 'discount', 'tax'],
      orderData
    );

    // Execute rules by tags
    const tagResult = await this.goRulesService.executeByTags(
      ['validation', 'business-rules'],
      orderData,
      'sequential'
    );

    return { result, batchResult, tagResult };
  }
}
```

## Configuration Options

### 1. Direct Configuration

```typescript
MinimalGoRulesModule.forRoot({
  config: {
    apiUrl: 'https://api.gorules.io',
    apiKey: 'your-api-key',
    projectId: 'your-project-id',
    cacheMaxSize: 1000,
    httpTimeout: 5000,
    batchSize: 50,
    platform: 'node'
  },
  autoInitialize: true
})
```

### 2. Factory-based Configuration

```typescript
MinimalGoRulesModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (configService: ConfigService) => ({
    apiUrl: configService.get('GORULES_API_URL'),
    apiKey: configService.get('GORULES_API_KEY'),
    projectId: configService.get('GORULES_PROJECT_ID'),
    cacheMaxSize: configService.get('GORULES_CACHE_MAX_SIZE', 1000),
    httpTimeout: configService.get('GORULES_HTTP_TIMEOUT', 5000),
    batchSize: configService.get('GORULES_BATCH_SIZE', 50),
    platform: 'node'
  }),
  inject: [ConfigService],
  autoInitialize: true
})
```

### 3. Class-based Configuration

```typescript
@Injectable()
export class GoRulesConfigService implements MinimalGoRulesOptionsFactory {
  constructor(private configService: ConfigService) {}

  createMinimalGoRulesOptions(): MinimalGoRulesConfig {
    return {
      apiUrl: this.configService.get('GORULES_API_URL'),
      apiKey: this.configService.get('GORULES_API_KEY'),
      projectId: this.configService.get('GORULES_PROJECT_ID'),
      platform: 'node'
    };
  }
}

MinimalGoRulesModule.forRootAsync({
  useClass: GoRulesConfigService,
  autoInitialize: true
})
```

### 4. Environment-based Configuration (Recommended)

```typescript
MinimalGoRulesModule.forRootWithConfig({
  autoInitialize: true,
  configKey: 'minimalGoRules' // Optional, defaults to 'minimalGoRules'
})
```

This supports both nested configuration objects and flat environment variables:

**Option A: Nested Configuration**
```typescript
// In your config file
export default () => ({
  minimalGoRules: {
    apiUrl: 'https://api.gorules.io',
    apiKey: 'your-api-key',
    projectId: 'your-project-id',
    cacheMaxSize: 1000,
    httpTimeout: 5000,
    batchSize: 50
  }
});
```

**Option B: Environment Variables (Fallback)**
```bash
GORULES_API_URL=https://api.gorules.io
GORULES_API_KEY=your-api-key
GORULES_PROJECT_ID=your-project-id
GORULES_CACHE_MAX_SIZE=1000
GORULES_HTTP_TIMEOUT=5000
GORULES_BATCH_SIZE=50
```

## Service API

### Rule Execution

```typescript
// Single rule execution
const result = await goRulesService.executeRule<OrderResult>(
  'order-processing',
  { orderId: '123', amount: 100 }
);

// Multiple rules in parallel
const results = await goRulesService.executeRules<any>(
  ['rule1', 'rule2', 'rule3'],
  inputData
);

// Rules by tags with execution mode
const results = await goRulesService.executeByTags<any>(
  ['validation', 'pricing'],
  inputData,
  'sequential' // or 'parallel'
);

// Advanced selector-based execution
const results = await goRulesService.execute<any>({
  ids: ['rule1', 'rule2'],
  tags: ['important'],
  mode: { 
    type: 'mixed',
    groups: [
      { rules: ['rule1'], mode: 'sequential' },
      { rules: ['rule2'], mode: 'parallel' }
    ]
  }
}, inputData);
```

### Rule Management

```typescript
// Validate rule exists
const isValid = await goRulesService.validateRule('rule-id');

// Get rule metadata
const metadata = await goRulesService.getRuleMetadata('rule-id');

// Get all rules metadata
const allMetadata = await goRulesService.getAllRuleMetadata();

// Get rules by tags
const ruleIds = await goRulesService.getRulesByTags(['tag1', 'tag2']);
```

### Cache Management

```typescript
// Check for outdated rules
const versionCheck = await goRulesService.checkVersions();

// Refresh specific rules
const refreshResult = await goRulesService.refreshCache(['rule1', 'rule2']);

// Force refresh all rules
const status = await goRulesService.forceRefreshCache();

// Get cache statistics
const stats = goRulesService.getCacheStats();
```

### Status and Health

```typescript
// Get engine status
const status = await goRulesService.getStatus();

// Health check (useful for health check endpoints)
const health = await goRulesService.healthCheck();

// Get initialization status
const initStatus = goRulesService.getInitializationStatus();
```

## REST API Example

Create a controller to expose GoRules functionality via REST API:

```typescript
import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { MinimalGoRulesService } from '@org/minimal-gorules';

@Controller('rules')
export class RulesController {
  constructor(
    private readonly goRulesService: MinimalGoRulesService
  ) {}

  @Post('execute/:ruleId')
  async executeRule(
    @Param('ruleId') ruleId: string,
    @Body() input: Record<string, unknown>
  ) {
    const result = await this.goRulesService.executeRule(ruleId, input);
    return { success: true, result };
  }

  @Post('execute-batch')
  async executeBatch(@Body() request: {
    ruleIds: string[];
    input: Record<string, unknown>;
    mode?: 'parallel' | 'sequential';
  }) {
    const result = await this.goRulesService.executeRules(
      request.ruleIds,
      request.input
    );
    return { 
      success: true, 
      results: Object.fromEntries(result.results),
      executionTime: result.executionTime
    };
  }

  @Get('health')
  async health() {
    return this.goRulesService.healthCheck();
  }

  @Get('status')
  async status() {
    const [engineStatus, cacheStats] = await Promise.all([
      this.goRulesService.getStatus(),
      this.goRulesService.getCacheStats()
    ]);
    return { engine: engineStatus, cache: cacheStats };
  }
}
```

## Error Handling

The service provides comprehensive error handling:

```typescript
try {
  const result = await goRulesService.executeRule('rule-id', input);
} catch (error) {
  if (error.message.includes('not initialized')) {
    // Handle initialization error
    await goRulesService.initialize();
  } else if (error.message.includes('not found')) {
    // Handle rule not found
    console.log('Rule does not exist');
  } else {
    // Handle other errors
    console.error('Execution failed:', error.message);
  }
}
```

## Lifecycle Management

### Manual Initialization

If `autoInitialize` is set to `false`, you can manually control initialization:

```typescript
@Injectable()
export class AppService implements OnApplicationBootstrap {
  constructor(
    private readonly goRulesService: MinimalGoRulesService
  ) {}

  async onApplicationBootstrap() {
    try {
      const status = await this.goRulesService.initialize();
      console.log(`Loaded ${status.rulesLoaded} rules`);
    } catch (error) {
      console.error('Failed to initialize GoRules:', error);
    }
  }
}
```

### Health Checks Integration

```typescript
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private goRulesService: MinimalGoRulesService
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.goRulesService.healthCheck()
    ]);
  }
}
```

## Performance Considerations

- **Initialization**: Rules are loaded once at startup for optimal performance
- **Caching**: Efficient LRU cache with configurable size limits
- **Concurrency**: Thread-safe operations with minimal locking overhead
- **Memory**: Optimized memory usage with automatic cleanup
- **Execution**: Direct ZenEngine integration without middleware layers

## Best Practices

1. **Use Environment Variables**: Keep sensitive configuration in environment variables
2. **Enable Auto-initialization**: Let the module handle startup initialization
3. **Monitor Health**: Implement health checks for production monitoring
4. **Cache Management**: Periodically check for rule updates in production
5. **Error Handling**: Implement proper error handling for rule execution
6. **Logging**: Monitor initialization and execution performance

## Troubleshooting

### Common Issues

1. **Initialization Fails**: Check API credentials and network connectivity
2. **Rules Not Found**: Verify project ID and rule IDs
3. **Performance Issues**: Adjust cache size and batch size settings
4. **Memory Usage**: Monitor cache statistics and implement cleanup

### Debug Mode

Enable debug logging to troubleshoot issues:

```typescript
// The service automatically logs initialization and errors
// Check your NestJS logging configuration
```

For more advanced usage and examples, see the main library documentation.