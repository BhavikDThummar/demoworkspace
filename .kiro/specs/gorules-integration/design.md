# GoRules Integration Design Document

## Overview

This design outlines the integration of GoRules business rules engine into the existing Nx workspace. The solution creates a reusable Nx library (`@org/gorules`) that provides a clean abstraction layer for GoRules functionality, following NestJS architectural patterns and best practices.

The integration leverages the GoRules Node.js SDK to connect to the GoRules service at `triveni.gorules.io` and execute business rules defined in the project. The library will be designed as a standalone module that can be imported into any NestJS application within the workspace.

## Architecture

### High-Level Architecture

```mermaid
graph TB
    A[NestJS Applications] --> B[@org/gorules Library]
    B --> C[GoRules SDK]
    C --> D[GoRules Service API]

    B --> E[Configuration Module]
    B --> F[Rules Service]
    B --> G[Types & Interfaces]

    E --> H[Environment Variables]
    F --> I[Error Handling]
    F --> J[Logging]
```

### Library Structure

```
libs/gorules/
├── src/
│   ├── lib/
│   │   ├── config/
│   │   │   ├── gorules.config.ts
│   │   │   └── gorules-config.interface.ts
│   │   ├── services/
│   │   │   ├── gorules.service.ts
│   │   │   └── gorules.service.spec.ts
│   │   ├── types/
│   │   │   ├── rule-execution.interface.ts
│   │   │   ├── rule-result.interface.ts
│   │   │   └── index.ts
│   │   ├── gorules.module.ts
│   │   └── index.ts
│   └── index.ts
├── project.json
├── tsconfig.json
├── tsconfig.lib.json
├── jest.config.ts
└── README.md
```

## Components and Interfaces

### 1. Configuration Module

**GoRulesConfig Interface**

```typescript
interface GoRulesConfig {
  apiUrl: string;
  apiKey: string;
  projectId: string;
  timeout?: number;
  retryAttempts?: number;
  enableLogging?: boolean;
}
```

**Configuration Factory**

- Loads configuration from environment variables
- Validates required parameters
- Provides default values for optional settings
- Supports both synchronous and asynchronous configuration loading

### 2. GoRules Service

**Core Service Interface**

```typescript
interface IGoRulesService {
  executeRule<T = any, R = any>(
    ruleId: string,
    input: T,
    options?: RuleExecutionOptions,
  ): Promise<RuleExecutionResult<R>>;

  executeBatch<T = any, R = any>(
    executions: BatchRuleExecution<T>[],
  ): Promise<BatchRuleExecutionResult<R>[]>;

  validateRuleExists(ruleId: string): Promise<boolean>;

  getRuleMetadata(ruleId: string): Promise<RuleMetadata>;
}
```

**Service Implementation Features**

- Dependency injection compatible with NestJS
- Automatic retry logic with exponential backoff
- Comprehensive error handling and logging
- Input validation and sanitization
- Response transformation and type safety
- Connection pooling and request optimization

### 3. Type Definitions

**Rule Execution Types**

```typescript
interface RuleExecutionOptions {
  timeout?: number;
  trace?: boolean;
  context?: Record<string, any>;
}

interface RuleExecutionResult<T = any> {
  result: T;
  trace?: ExecutionTrace;
  performance: PerformanceMetrics;
  metadata: RuleMetadata;
}

interface ExecutionTrace {
  steps: TraceStep[];
  duration: number;
  rulesEvaluated: string[];
}

interface PerformanceMetrics {
  executionTime: number;
  networkTime: number;
  totalTime: number;
}
```

### 4. NestJS Module

**GoRulesModule Configuration**

```typescript
@Module({})
export class GoRulesModule {
  static forRoot(config: GoRulesConfig): DynamicModule;
  static forRootAsync(options: GoRulesAsyncOptions): DynamicModule;
}

interface GoRulesAsyncOptions {
  imports?: any[];
  useFactory?: (...args: any[]) => Promise<GoRulesConfig> | GoRulesConfig;
  inject?: any[];
  useClass?: Type<GoRulesOptionsFactory>;
  useExisting?: Type<GoRulesOptionsFactory>;
}
```

## Data Models

### Input/Output Models

**Rule Input Model**

```typescript
interface RuleInput {
  [key: string]: any;
}

interface BatchRuleExecution<T = any> {
  ruleId: string;
  input: T;
  executionId?: string;
  options?: RuleExecutionOptions;
}
```

**Rule Output Model**

```typescript
interface RuleResult<T = any> {
  decision: T;
  confidence?: number;
  appliedRules: string[];
  warnings?: string[];
}

interface BatchRuleExecutionResult<T = any> {
  executionId: string;
  ruleId: string;
  result: RuleResult<T>;
  error?: RuleExecutionError;
}
```

### Error Models

```typescript
interface RuleExecutionError {
  code: string;
  message: string;
  details?: any;
  retryable: boolean;
}

enum GoRulesErrorCode {
  AUTHENTICATION_FAILED = 'AUTH_FAILED',
  RULE_NOT_FOUND = 'RULE_NOT_FOUND',
  INVALID_INPUT = 'INVALID_INPUT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}
```

## Error Handling

### Error Handling Strategy

1. **Network Errors**: Automatic retry with exponential backoff (max 3 attempts)
2. **Authentication Errors**: Immediate failure with clear error message
3. **Validation Errors**: Input validation before API calls
4. **Timeout Errors**: Configurable timeout with graceful degradation
5. **Rate Limiting**: Respect rate limits with appropriate backoff

### Error Response Format

```typescript
class GoRulesException extends Error {
  constructor(
    public readonly code: GoRulesErrorCode,
    message: string,
    public readonly details?: any,
    public readonly retryable: boolean = false,
  ) {
    super(message);
  }
}
```

### Logging Strategy

- **Debug Level**: Request/response details, execution traces
- **Info Level**: Successful rule executions, performance metrics
- **Warn Level**: Retry attempts, deprecated API usage
- **Error Level**: Failed executions, authentication issues

## Testing Strategy

### Unit Testing

1. **Service Tests**

   - Mock GoRules SDK responses
   - Test error handling scenarios
   - Validate input/output transformations
   - Test retry logic and timeouts

2. **Configuration Tests**

   - Test environment variable loading
   - Validate configuration validation
   - Test default value assignment

3. **Module Tests**
   - Test dependency injection setup
   - Validate module configuration options
   - Test async configuration loading

### Integration Testing

1. **SDK Integration Tests**

   - Test actual API calls to GoRules service
   - Validate authentication flow
   - Test rule execution with real rules

2. **NestJS Integration Tests**
   - Test module loading in NestJS application
   - Validate service injection and usage
   - Test configuration in different environments

### End-to-End Testing

1. **Application Integration**
   - Test library usage in actual NestJS application
   - Validate complete request/response flow
   - Test error scenarios in application context

### Test Configuration

```typescript
// Test configuration for GoRules service
const testConfig: GoRulesConfig = {
  apiUrl: 'https://triveni.gorules.io',
  apiKey: 'test-api-key',
  projectId: '927d9dad-2aa5-46f6-8ad7-b74469f7ec65',
  timeout: 5000,
  retryAttempts: 2,
  enableLogging: false,
};
```

## Implementation Considerations

### Performance Optimizations

1. **Connection Pooling**: Reuse HTTP connections for multiple requests
2. **Request Batching**: Combine multiple rule executions when possible
3. **Caching**: Cache rule metadata and frequently used results
4. **Lazy Loading**: Load GoRules SDK only when needed

### Security Considerations

1. **API Key Management**: Store API keys in environment variables
2. **Input Sanitization**: Validate and sanitize all input data
3. **Error Information**: Avoid exposing sensitive information in error messages
4. **Audit Logging**: Log all rule executions for audit purposes

### Scalability Considerations

1. **Rate Limiting**: Implement client-side rate limiting
2. **Circuit Breaker**: Prevent cascading failures
3. **Monitoring**: Expose metrics for monitoring and alerting
4. **Graceful Degradation**: Handle service unavailability gracefully

### Development Experience

1. **TypeScript Support**: Full type definitions for all APIs
2. **IntelliSense**: Complete IDE support with documentation
3. **Error Messages**: Clear, actionable error messages
4. **Documentation**: Comprehensive API documentation and examples
