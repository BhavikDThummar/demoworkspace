# GoRules API Documentation

This document provides comprehensive API documentation for the GoRules NestJS integration library.

## Table of Contents

- [Core Services](#core-services)
- [Configuration](#configuration)
- [Types and Interfaces](#types-and-interfaces)
- [Error Handling](#error-handling)
- [Monitoring and Logging](#monitoring-and-logging)
- [Testing Utilities](#testing-utilities)

## Core Services

### GoRulesService

The main service for executing business rules.

#### Methods

##### `executeRule<T, R>(ruleId: string, input: T, options?: RuleExecutionOptions): Promise<RuleExecutionResult<R>>`

Executes a single business rule.

**Parameters:**

- `ruleId` (string): The unique identifier of the rule to execute
- `input` (T): The input data for the rule execution
- `options` (RuleExecutionOptions, optional): Execution options

**Returns:** `Promise<RuleExecutionResult<R>>` - The rule execution result

**Example:**

```typescript
const result = await goRulesService.executeRule<CustomerData, ValidationResult>(
  'customer-validation',
  { age: 25, income: 50000 },
  { trace: true, timeout: 10000 },
);

console.log(result.result.isValid); // true/false
console.log(result.performance.executionTime); // execution time in ms
```

##### `executeBatch<T, R>(executions: BatchRuleExecution<T>[]): Promise<BatchRuleExecutionResult<R>[]>`

Executes multiple rules in batch for improved performance.

**Parameters:**

- `executions` (BatchRuleExecution<T>[]): Array of rule executions to perform

**Returns:** `Promise<BatchRuleExecutionResult<R>[]>` - Array of execution results

**Example:**

```typescript
const batchResults = await goRulesService.executeBatch([
  { ruleId: 'validation', input: { age: 25 }, executionId: 'val-1' },
  { ruleId: 'pricing', input: { tier: 'premium' }, executionId: 'price-1' },
]);

batchResults.forEach((result) => {
  if (result.error) {
    console.error(`Rule ${result.ruleId} failed:`, result.error);
  } else {
    console.log(`Rule ${result.ruleId} result:`, result.result);
  }
});
```

##### `validateRuleExists(ruleId: string): Promise<boolean>`

Validates that a rule exists and is accessible.

**Parameters:**

- `ruleId` (string): The rule identifier to validate

**Returns:** `Promise<boolean>` - True if the rule exists, false otherwise

**Example:**

```typescript
const exists = await goRulesService.validateRuleExists('customer-validation');
if (!exists) {
  throw new Error('Rule not found');
}
```

##### `getRuleMetadata(ruleId: string): Promise<RuleMetadata>`

Retrieves metadata information about a rule.

**Parameters:**

- `ruleId` (string): The rule identifier

**Returns:** `Promise<RuleMetadata>` - Rule metadata information

**Example:**

```typescript
const metadata = await goRulesService.getRuleMetadata('customer-validation');
console.log(metadata.name); // Rule display name
console.log(metadata.version); // Rule version
console.log(metadata.description); // Rule description
```

##### `getExecutionStatistics(): Record<string, ExecutionStatistics>`

Gets execution statistics for all rules.

**Returns:** `Record<string, ExecutionStatistics>` - Statistics by rule ID

**Example:**

```typescript
const stats = goRulesService.getExecutionStatistics();
Object.entries(stats).forEach(([ruleId, stat]) => {
  console.log(`${ruleId}: ${stat.count} executions, ${stat.averageTime}ms avg`);
});
```

##### `getCircuitBreakerStatistics(): Record<string, CircuitBreakerStats>`

Gets circuit breaker statistics for all operations.

**Returns:** `Record<string, CircuitBreakerStats>` - Circuit breaker statistics

**Example:**

```typescript
const cbStats = goRulesService.getCircuitBreakerStatistics();
Object.entries(cbStats).forEach(([operation, stats]) => {
  console.log(`${operation}: ${stats.state}, failures: ${stats.failures}`);
});
```

### GoRulesConfigService

Service for managing GoRules configuration.

#### Methods

##### `getConfig(): GoRulesConfig`

Gets the current configuration.

**Returns:** `GoRulesConfig` - Current configuration object

##### `validateConfig(): void`

Validates the current configuration and throws an error if invalid.

**Throws:** `GoRulesException` if configuration is invalid

### GoRulesLoggerService

Service for structured logging of GoRules operations.

#### Methods

##### `logExecutionStart(ruleId: string, executionId: string, input: any): void`

Logs the start of a rule execution.

##### `logExecutionSuccess(executionId: string, output: any, retryCount?: number): void`

Logs successful rule execution completion.

##### `logExecutionError(executionId: string, error: Error, retryCount?: number): void`

Logs failed rule execution.

##### `getRecentLogEntries(count?: number): GoRulesLogEntry[]`

Gets recent log entries.

**Parameters:**

- `count` (number, optional): Number of entries to retrieve (default: 100)

**Returns:** `GoRulesLogEntry[]` - Array of log entries

### GoRulesMetricsService

Service for collecting and managing performance metrics.

#### Methods

##### `recordExecutionTime(ruleId: string, executionTime: number, success: boolean): void`

Records execution time for a rule.

##### `getRuleMetrics(ruleId: string): RuleExecutionMetrics`

Gets metrics for a specific rule.

##### `getAllRuleMetrics(): RuleExecutionMetrics[]`

Gets metrics for all rules.

##### `getSystemMetrics(): SystemMetrics`

Gets system-wide metrics.

### GoRulesMonitoringService

Comprehensive monitoring service that orchestrates logging and metrics.

#### Methods

##### `startExecution(ruleId: string, executionId: string, input: any): void`

Starts monitoring a rule execution.

##### `completeExecution(ruleId: string, executionId: string, output: any, executionTime: number, retryCount?: number): void`

Completes monitoring a successful execution.

##### `failExecution(ruleId: string, executionId: string, error: Error, executionTime: number, retryCount?: number): void`

Completes monitoring a failed execution.

##### `getHealthStatus(): HealthStatus`

Gets comprehensive health status.

**Returns:** `HealthStatus` - Current system health status

## Configuration

### GoRulesConfig Interface

```typescript
interface GoRulesConfig {
  /** GoRules API URL */
  apiUrl: string;

  /** API key for authentication */
  apiKey: string;

  /** Project ID in GoRules */
  projectId: string;

  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;

  /** Number of retry attempts for failed requests (default: 3) */
  retryAttempts?: number;

  /** Enable detailed logging (default: false) */
  enableLogging?: boolean;

  /** Log level for GoRules operations (default: 'info') */
  logLevel?: 'error' | 'warn' | 'info' | 'debug' | 'verbose';

  /** Maximum number of log entries to keep in memory (default: 1000) */
  maxLogEntries?: number;

  /** Log retention period in milliseconds (default: 24 hours) */
  logRetentionMs?: number;

  /** Enable performance monitoring (default: true) */
  enableMetrics?: boolean;

  /** Performance alert thresholds */
  performanceThresholds?: {
    /** Execution time threshold in milliseconds (default: 5000) */
    executionTime?: number;

    /** Error rate threshold (0-1, default: 0.1) */
    errorRate?: number;

    /** Memory usage threshold percentage (default: 80) */
    memoryUsage?: number;
  };
}
```

### Module Configuration Options

#### Static Configuration

```typescript
GoRulesModule.forRoot({
  apiUrl: 'https://triveni.gorules.io',
  apiKey: 'your-api-key',
  projectId: 'your-project-id',
  timeout: 30000,
  retryAttempts: 3,
  enableLogging: true,
  logLevel: 'debug',
  performanceThresholds: {
    executionTime: 5000,
    errorRate: 0.1,
    memoryUsage: 80,
  },
});
```

#### Async Configuration

```typescript
GoRulesModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: async (configService: ConfigService) => ({
    apiUrl: configService.get('GORULES_API_URL'),
    apiKey: configService.get('GORULES_API_KEY'),
    projectId: configService.get('GORULES_PROJECT_ID'),
    enableLogging: configService.get('NODE_ENV') === 'development',
  }),
  inject: [ConfigService],
});
```

#### Environment Configuration

```typescript
GoRulesModule.forEnvironment();
```

Uses these environment variables:

- `GORULES_API_URL`
- `GORULES_API_KEY`
- `GORULES_PROJECT_ID`
- `GORULES_TIMEOUT`
- `GORULES_RETRY_ATTEMPTS`
- `GORULES_ENABLE_LOGGING`
- `GORULES_LOG_LEVEL`
- `GORULES_ENABLE_METRICS`

## Types and Interfaces

### Core Types

#### RuleExecutionOptions

```typescript
interface RuleExecutionOptions {
  /** Enable execution tracing for debugging */
  trace?: boolean;

  /** Execution timeout in milliseconds */
  timeout?: number;

  /** User ID for audit logging */
  userId?: string;

  /** Session ID for request correlation */
  sessionId?: string;

  /** Request ID for tracing */
  requestId?: string;
}
```

#### RuleExecutionResult<T>

```typescript
interface RuleExecutionResult<T> {
  /** The rule execution result */
  result: T;

  /** Performance metrics */
  performance: PerformanceMetrics;

  /** Rule metadata */
  metadata: RuleMetadata;

  /** Execution trace (if tracing enabled) */
  trace?: ExecutionTrace;
}
```

#### BatchRuleExecution<T>

```typescript
interface BatchRuleExecution<T> {
  /** Unique execution identifier */
  executionId?: string;

  /** Rule identifier */
  ruleId: string;

  /** Input data for the rule */
  input: T;

  /** Execution options */
  options?: RuleExecutionOptions;
}
```

#### BatchRuleExecutionResult<T>

```typescript
interface BatchRuleExecutionResult<T> {
  /** Execution identifier */
  executionId: string;

  /** Rule identifier */
  ruleId: string;

  /** Execution result */
  result: {
    decision: T | null;
    appliedRules: string[];
    warnings: string[];
  };

  /** Error information (if execution failed) */
  error?: {
    code: GoRulesErrorCode;
    message: string;
    details?: any;
    retryable: boolean;
  };

  /** Performance metrics */
  performance?: PerformanceMetrics;
}
```

### Monitoring Types

#### HealthStatus

```typescript
interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version?: string;
  checks: {
    database?: boolean;
    externalServices?: boolean;
    memory?: boolean;
    performance?: boolean;
  };
  metrics: SystemMetrics;
  issues?: string[];
}
```

#### SystemMetrics

```typescript
interface SystemMetrics {
  totalRuleExecutions: number;
  activeExecutions: number;
  totalErrors: number;
  averageResponseTime: number;
  requestsPerSecond: number;
  memoryUsage?: {
    used: number;
    total: number;
    percentage: number;
  };
}
```

#### RuleExecutionMetrics

```typescript
interface RuleExecutionMetrics {
  ruleId: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  minExecutionTime: number;
  maxExecutionTime: number;
  totalRetries: number;
  lastExecutionTime?: number;
  errorRate: number;
}
```

## Error Handling

### GoRulesException

The main exception class for GoRules-related errors.

```typescript
class GoRulesException extends Error {
  constructor(
    public readonly code: GoRulesErrorCode,
    message: string,
    public readonly details?: any,
    public readonly retryable: boolean = false,
  );
}
```

### GoRulesErrorCode Enum

```typescript
enum GoRulesErrorCode {
  // Input validation errors
  INVALID_INPUT = 'INVALID_INPUT',
  VALIDATION_ERROR = 'VALIDATION_ERROR',

  // Rule-related errors
  RULE_NOT_FOUND = 'RULE_NOT_FOUND',
  RULE_EXECUTION_ERROR = 'RULE_EXECUTION_ERROR',

  // Authentication and authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',

  // Network and connectivity
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // System errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}
```

### Error Handling Examples

```typescript
import { GoRulesException, GoRulesErrorCode } from '@org/gorules';

try {
  const result = await goRulesService.executeRule('my-rule', input);
  return result;
} catch (error) {
  if (error instanceof GoRulesException) {
    switch (error.code) {
      case GoRulesErrorCode.RULE_NOT_FOUND:
        throw new NotFoundException(`Rule not found: ${error.message}`);

      case GoRulesErrorCode.TIMEOUT:
        if (error.retryable) {
          // Implement retry logic
          return await this.retryExecution(ruleId, input);
        }
        throw new RequestTimeoutException(error.message);

      case GoRulesErrorCode.RATE_LIMIT_EXCEEDED:
        throw new TooManyRequestsException(error.message);

      default:
        throw new InternalServerErrorException(error.message);
    }
  }

  // Handle unexpected errors
  throw new InternalServerErrorException('Unexpected error occurred');
}
```

## Monitoring and Logging

### Structured Logging

The library provides structured logging with detailed metadata:

```typescript
// Log entries include:
interface GoRulesLogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context: string;
  metadata?: Record<string, any>;
  executionId?: string;
  ruleId?: string;
  duration?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}
```

### Performance Monitoring

Monitor rule execution performance:

```typescript
// Get performance statistics
const stats = monitoringService.getExecutionStatistics();
console.log(`Total executions: ${stats.totalExecutions}`);
console.log(`Average time: ${stats.averageExecutionTime}ms`);
console.log(`Error rate: ${((stats.failedExecutions / stats.totalExecutions) * 100).toFixed(2)}%`);

// Get rule-specific metrics
const ruleMetrics = monitoringService.getRuleMetrics('customer-validation');
console.log(`Rule executions: ${ruleMetrics.totalExecutions}`);
console.log(
  `Success rate: ${((ruleMetrics.successfulExecutions / ruleMetrics.totalExecutions) * 100).toFixed(
    2,
  )}%`,
);
```

### Health Checks

Implement health checks for monitoring:

```typescript
@Controller('health')
export class HealthController {
  constructor(private readonly monitoringService: GoRulesMonitoringService) {}

  @Get('gorules')
  async checkGoRulesHealth() {
    const health = this.monitoringService.getHealthStatus();

    if (health.status === 'unhealthy') {
      throw new ServiceUnavailableException('GoRules service is unhealthy');
    }

    return health;
  }
}
```

## Testing Utilities

### Mock Service

For unit testing, use the provided mock service:

```typescript
import { GoRulesTestingModule } from '@org/gorules';

const module = await Test.createTestingModule({
  imports: [
    GoRulesTestingModule.forTesting({
      enableLogging: false,
      timeout: 1000,
    }),
  ],
  providers: [YourService],
}).compile();
```

### Test Helpers

```typescript
import { createMockRuleResult, createMockBatchResult } from '@org/gorules/testing';

// Create mock rule result
const mockResult = createMockRuleResult({
  isValid: true,
  score: 85,
});

// Create mock batch result
const mockBatchResult = createMockBatchResult([
  { ruleId: 'rule1', success: true, result: { approved: true } },
  { ruleId: 'rule2', success: false, error: 'Validation failed' },
]);
```

### Integration Testing

For integration tests, use the real module with test configuration:

```typescript
const module = await Test.createTestingModule({
  imports: [
    GoRulesModule.forRoot({
      apiUrl: 'https://test.gorules.io',
      apiKey: 'test-key',
      projectId: 'test-project',
      enableLogging: false,
      timeout: 5000,
    }),
  ],
  providers: [YourService],
}).compile();
```

## Best Practices

### Performance Optimization

1. **Use Batch Execution**: For multiple rules, use `executeBatch` instead of multiple `executeRule` calls
2. **Configure Timeouts**: Set appropriate timeouts based on rule complexity
3. **Monitor Performance**: Use built-in metrics to identify slow rules
4. **Cache Results**: Consider caching rule results for frequently executed rules with static input

### Error Handling

1. **Handle Specific Errors**: Use the error code to handle different error types appropriately
2. **Implement Retry Logic**: For retryable errors, implement exponential backoff
3. **Log Errors**: Use structured logging for better debugging
4. **Graceful Degradation**: Provide fallback behavior when rules are unavailable

### Monitoring

1. **Health Checks**: Implement health check endpoints for monitoring
2. **Metrics Collection**: Use the built-in metrics for performance monitoring
3. **Alerting**: Set up alerts based on error rates and response times
4. **Log Analysis**: Use structured logs for troubleshooting and analysis

### Security

1. **Secure API Keys**: Store API keys securely using environment variables or secret management
2. **Network Security**: Use HTTPS for all communications
3. **Input Validation**: Validate all input data before sending to rules
4. **Audit Logging**: Enable logging for audit and compliance requirements
