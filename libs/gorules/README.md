# GoRules NestJS Integration Library

A comprehensive NestJS library for integrating with the GoRules business rules engine, providing type-safe rule execution, comprehensive error handling, monitoring, and resilience features.

[![npm version](https://badge.fury.io/js/%40org%2Fgorules.svg)](https://badge.fury.io/js/%40org%2Fgorules)
[![Build Status](https://github.com/org/gorules/workflows/CI/badge.svg)](https://github.com/org/gorules/actions)
[![Coverage Status](https://coveralls.io/repos/github/org/gorules/badge.svg?branch=main)](https://coveralls.io/github/org/gorules?branch=main)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🚀 **Easy Integration**: Simple NestJS module configuration with multiple setup options
- 🔧 **Type Safety**: Full TypeScript support with comprehensive type definitions and IntelliSense
- 🛡️ **Resilience**: Built-in retry logic, circuit breakers, and timeout handling
- 📊 **Monitoring**: Health checks, execution statistics, performance metrics, and structured logging
- ⚙️ **Flexible Configuration**: Environment variables, ConfigService, or custom factory support
- 🧪 **Testing**: Comprehensive test suite with 90%+ code coverage and testing utilities
- 🔄 **Batch Processing**: Execute multiple rules efficiently with parallel processing
- 🎯 **Error Handling**: Detailed error types with proper HTTP status code mapping
- 📈 **Performance**: Optimized for high-throughput scenarios with connection pooling
- 🔍 **Debugging**: Built-in tracing and detailed execution logs for troubleshooting

## Installation

```bash
npm install @org/gorules
```

## Quick Start

### 1. Basic Configuration

```typescript
import { Module } from '@nestjs/common';
import { GoRulesModule } from '@org/gorules';

@Module({
  imports: [
    GoRulesModule.forRoot({
      apiUrl: 'https://triveni.gorules.io',
      apiKey: process.env.GORULES_API_KEY,
      projectId: process.env.GORULES_PROJECT_ID,
      timeout: 30000,
      retryAttempts: 3,
      enableLogging: true,
    }),
  ],
})
export class AppModule {}
```

### 2. Using ConfigService

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GoRulesModule } from '@org/gorules';

@Module({
  imports: [
    ConfigModule.forRoot(),
    GoRulesModule.forRootWithConfigService(),
  ],
})
export class AppModule {}
```

### 3. Environment-based Configuration

```typescript
import { Module } from '@nestjs/common';
import { GoRulesModule } from '@org/gorules';

@Module({
  imports: [
    GoRulesModule.forRootWithEnvironmentConfig(),
  ],
})
export class AppModule {}
```

## Environment Variables

Create a `.env` file with the following variables:

```env
GORULES_API_URL=https://triveni.gorules.io
GORULES_API_KEY=your-api-key-here
GORULES_PROJECT_ID=your-project-id
GORULES_TIMEOUT=30000
GORULES_RETRY_ATTEMPTS=3
GORULES_ENABLE_LOGGING=true
```

## Usage

### Basic Rule Execution

```typescript
import { Injectable } from '@nestjs/common';
import { GoRulesService } from '@org/gorules';

@Injectable()
export class BusinessService {
  constructor(private readonly goRulesService: GoRulesService) {}

  async validateCustomer(customerData: any) {
    const result = await this.goRulesService.executeRule(
      'customer-validation',
      customerData,
      { trace: true }
    );

    return {
      isValid: result.result.isValid,
      reason: result.result.reason,
      executionTime: result.performance.totalTime,
    };
  }
}
```

### Using Dependency Injection Decorators

```typescript
import { Injectable } from '@nestjs/common';
import { InjectGoRulesService, GoRulesService } from '@org/gorules';

@Injectable()
export class BusinessService {
  constructor(
    @InjectGoRulesService()
    private readonly goRulesService: GoRulesService
  ) {}

  async processOrder(orderData: any) {
    return this.goRulesService.executeRule('order-processing', orderData);
  }
}
```

### Batch Rule Execution

```typescript
async executeBatchRules() {
  const rules = [
    { ruleId: 'validation', input: { age: 25 } },
    { ruleId: 'pricing', input: { tier: 'premium' } },
    { ruleId: 'eligibility', input: { score: 750 } },
  ];

  const results = await this.goRulesService.executeBatch(rules);
  return results;
}
```

## Advanced Configuration

### Async Configuration with Custom Factory

```typescript
@Module({
  imports: [
    GoRulesModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const config = await loadConfigFromDatabase();
        return {
          apiUrl: config.apiUrl,
          apiKey: configService.getOrThrow('GORULES_API_KEY'),
          projectId: configService.getOrThrow('GORULES_PROJECT_ID'),
          timeout: config.timeout || 30000,
          retryAttempts: 3,
          enableLogging: process.env.NODE_ENV === 'development',
        };
      },
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

### Global Module Configuration

```typescript
@Module({
  imports: [
    GoRulesGlobalModule.forRoot({
      apiUrl: 'https://triveni.gorules.io',
      apiKey: process.env.GORULES_API_KEY,
      projectId: process.env.GORULES_PROJECT_ID,
    }),
  ],
})
export class AppModule {}
```

## Health Monitoring

### Health Check Integration

```typescript
import { Controller, Get } from '@nestjs/common';
import { GoRulesHealthService } from '@org/gorules';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: GoRulesHealthService) {}

  @Get('gorules')
  async checkGoRulesHealth() {
    return this.healthService.checkHealth();
  }

  @Get('gorules/info')
  async getSystemInfo() {
    return this.healthService.getSystemInfo();
  }
}
```

### Execution Statistics

```typescript
@Get('statistics')
async getStatistics() {
  return {
    execution: this.goRulesService.getExecutionStatistics(),
    circuitBreakers: this.goRulesService.getCircuitBreakerStatistics(),
  };
}
```

## Error Handling

The library provides comprehensive error handling with specific error types:

```typescript
import { GoRulesError, GoRulesErrorCode } from '@org/gorules';

try {
  const result = await this.goRulesService.executeRule('my-rule', input);
} catch (error) {
  if (error instanceof GoRulesError) {
    switch (error.code) {
      case GoRulesErrorCode.RULE_NOT_FOUND:
        // Handle rule not found
        break;
      case GoRulesErrorCode.NETWORK_ERROR:
        // Handle network issues
        break;
      case GoRulesErrorCode.TIMEOUT:
        // Handle timeout
        break;
      default:
        // Handle other errors
    }
  }
}
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiUrl` | string | Required | GoRules API endpoint URL |
| `apiKey` | string | Required | API authentication key |
| `projectId` | string | Required | GoRules project identifier |
| `timeout` | number | 30000 | Request timeout in milliseconds |
| `retryAttempts` | number | 3 | Number of retry attempts for failed requests |
| `enableLogging` | boolean | false | Enable detailed logging |

## Circuit Breaker Configuration

The library includes built-in circuit breaker functionality:

- **Failure Threshold**: 5 consecutive failures
- **Recovery Timeout**: 60 seconds
- **Half-Open Max Calls**: 3 test calls
- **Automatic Reset**: Circuit breakers reset automatically after successful calls

## Testing

### Unit Testing with Mocks

```typescript
import { Test } from '@nestjs/testing';
import { GoRulesService } from '@org/gorules';

describe('BusinessService', () => {
  let service: BusinessService;
  let goRulesService: jest.Mocked<GoRulesService>;

  beforeEach(async () => {
    const mockGoRulesService = {
      executeRule: jest.fn(),
      executeBatch: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        BusinessService,
        { provide: GoRulesService, useValue: mockGoRulesService },
      ],
    }).compile();

    service = module.get<BusinessService>(BusinessService);
    goRulesService = module.get(GoRulesService);
  });

  it('should execute rule successfully', async () => {
    goRulesService.executeRule.mockResolvedValue({
      result: { isValid: true },
      performance: { totalTime: 100 },
    });

    const result = await service.validateCustomer({ age: 25 });
    expect(result.isValid).toBe(true);
  });
});
```

## Performance Considerations

- **Connection Pooling**: The library reuses HTTP connections for better performance
- **Request Batching**: Use `executeBatch` for multiple rules to reduce network overhead
- **Caching**: Consider implementing rule result caching for frequently executed rules
- **Monitoring**: Use the built-in statistics to monitor performance and identify bottlenecks

## Troubleshooting

### Common Issues

1. **Configuration Errors**
   ```
   Error: GORULES_API_KEY is required
   ```
   Ensure all required environment variables are set.

2. **Network Connectivity**
   ```
   Error: Network timeout after 30000ms
   ```
   Check network connectivity and consider increasing timeout values.

3. **Circuit Breaker Open**
   ```
   Error: Circuit breaker is OPEN for rule execution
   ```
   Wait for automatic recovery or manually reset circuit breakers.

### Debug Mode

Enable debug logging for troubleshooting:

```typescript
GoRulesModule.forRoot({
  // ... other config
  enableLogging: true,
})
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

This library is licensed under the MIT License.

## Support

For issues and questions:
- Create an issue in the repository
- Check the troubleshooting guide
- Review the example implementations in `/examples`