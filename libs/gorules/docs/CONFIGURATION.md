# GoRules Configuration Guide

This guide provides comprehensive information about configuring the GoRules NestJS integration library.

## Table of Contents

- [Basic Configuration](#basic-configuration)
- [Environment Variables](#environment-variables)
- [Advanced Configuration](#advanced-configuration)
- [Configuration Validation](#configuration-validation)
- [Environment-Specific Settings](#environment-specific-settings)
- [Performance Tuning](#performance-tuning)
- [Security Configuration](#security-configuration)
- [Monitoring Configuration](#monitoring-configuration)

## Basic Configuration

### Static Configuration

The simplest way to configure GoRules is with static values:

```typescript
import { Module } from '@nestjs/common';
import { GoRulesModule } from '@org/gorules';

@Module({
  imports: [
    GoRulesModule.forRoot({
      apiUrl: 'https://triveni.gorules.io',
      apiKey: 'your-api-key',
      projectId: 'your-project-id',
      timeout: 30000,
      retryAttempts: 3,
      enableLogging: true,
    }),
  ],
})
export class AppModule {}
```

### Environment-Based Configuration

Use environment variables for flexible configuration:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GoRulesModule } from '@org/gorules';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    GoRulesModule.forEnvironment(),
  ],
})
export class AppModule {}
```

### Async Configuration

For complex configuration scenarios:

```typescript
@Module({
  imports: [
    ConfigModule.forRoot(),
    GoRulesModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        // Load configuration from external source
        const externalConfig = await loadExternalConfig();
        
        return {
          apiUrl: configService.get('GORULES_API_URL'),
          apiKey: configService.get('GORULES_API_KEY'),
          projectId: configService.get('GORULES_PROJECT_ID'),
          timeout: externalConfig.timeout || 30000,
          enableLogging: configService.get('NODE_ENV') === 'development',
        };
      },
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

## Environment Variables

### Required Variables

```env
# GoRules API Configuration
GORULES_API_URL=https://triveni.gorules.io
GORULES_API_KEY=your-api-key-here
GORULES_PROJECT_ID=your-project-id
```

### Optional Variables

```env
# Performance Configuration
GORULES_TIMEOUT=30000
GORULES_RETRY_ATTEMPTS=3

# Logging Configuration
GORULES_ENABLE_LOGGING=true
GORULES_LOG_LEVEL=info
GORULES_MAX_LOG_ENTRIES=1000
GORULES_LOG_RETENTION_MS=86400000

# Monitoring Configuration
GORULES_ENABLE_METRICS=true
GORULES_PERFORMANCE_THRESHOLD_EXECUTION_TIME=5000
GORULES_PERFORMANCE_THRESHOLD_ERROR_RATE=0.1
GORULES_PERFORMANCE_THRESHOLD_MEMORY_USAGE=80

# Circuit Breaker Configuration
GORULES_CIRCUIT_BREAKER_FAILURE_THRESHOLD=5
GORULES_CIRCUIT_BREAKER_RESET_TIMEOUT=60000
GORULES_CIRCUIT_BREAKER_SUCCESS_THRESHOLD=3
```

### Environment File Examples

#### Development (.env.development)
```env
GORULES_API_URL=https://dev.gorules.io
GORULES_API_KEY=dev-api-key
GORULES_PROJECT_ID=dev-project-id
GORULES_TIMEOUT=45000
GORULES_RETRY_ATTEMPTS=5
GORULES_ENABLE_LOGGING=true
GORULES_LOG_LEVEL=debug
GORULES_ENABLE_METRICS=true
```

#### Production (.env.production)
```env
GORULES_API_URL=https://triveni.gorules.io
GORULES_API_KEY=${GORULES_PROD_API_KEY}
GORULES_PROJECT_ID=${GORULES_PROD_PROJECT_ID}
GORULES_TIMEOUT=30000
GORULES_RETRY_ATTEMPTS=3
GORULES_ENABLE_LOGGING=false
GORULES_LOG_LEVEL=error
GORULES_ENABLE_METRICS=true
```

#### Testing (.env.test)
```env
GORULES_API_URL=https://test.gorules.io
GORULES_API_KEY=test-api-key
GORULES_PROJECT_ID=test-project-id
GORULES_TIMEOUT=5000
GORULES_RETRY_ATTEMPTS=1
GORULES_ENABLE_LOGGING=false
GORULES_ENABLE_METRICS=false
```

## Advanced Configuration

### Complete Configuration Interface

```typescript
interface GoRulesConfig {
  // Required Configuration
  apiUrl: string;
  apiKey: string;
  projectId: string;
  
  // Performance Configuration
  timeout?: number;                    // Default: 30000ms
  retryAttempts?: number;             // Default: 3
  
  // Logging Configuration
  enableLogging?: boolean;            // Default: false
  logLevel?: 'error' | 'warn' | 'info' | 'debug' | 'verbose'; // Default: 'info'
  maxLogEntries?: number;             // Default: 1000
  logRetentionMs?: number;            // Default: 24 hours
  
  // Monitoring Configuration
  enableMetrics?: boolean;            // Default: true
  performanceThresholds?: {
    executionTime?: number;           // Default: 5000ms
    errorRate?: number;               // Default: 0.1 (10%)
    memoryUsage?: number;             // Default: 80%
  };
  
  // Circuit Breaker Configuration
  circuitBreakerOptions?: {
    failureThreshold?: number;        // Default: 5
    resetTimeout?: number;            // Default: 60000ms
    successThreshold?: number;        // Default: 3
    requestTimeout?: number;          // Default: same as timeout
  };
  
  // HTTP Configuration
  httpOptions?: {
    maxRedirects?: number;            // Default: 5
    keepAlive?: boolean;              // Default: true
    keepAliveMsecs?: number;          // Default: 1000ms
    maxSockets?: number;              // Default: Infinity
    maxFreeSockets?: number;          // Default: 256
  };
  
  // Security Configuration
  security?: {
    validateCertificates?: boolean;   // Default: true
    allowInsecureConnections?: boolean; // Default: false
    customCertificates?: string[];
  };
}
```

### Custom Configuration Factory

```typescript
@Injectable()
export class CustomGoRulesConfigFactory {
  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
    private readonly secretsService: SecretsService
  ) {}

  async createGoRulesConfig(): Promise<GoRulesConfig> {
    // Load base configuration from environment
    const baseConfig = {
      apiUrl: this.configService.get('GORULES_API_URL'),
      projectId: this.configService.get('GORULES_PROJECT_ID'),
    };

    // Load sensitive data from secrets service
    const apiKey = await this.secretsService.getSecret('gorules-api-key');

    // Load dynamic configuration from database
    const dbConfig = await this.databaseService.getGoRulesConfig();

    // Merge configurations with precedence
    return {
      ...baseConfig,
      apiKey,
      timeout: dbConfig.timeout || 30000,
      retryAttempts: dbConfig.retryAttempts || 3,
      enableLogging: this.configService.get('NODE_ENV') !== 'production',
      logLevel: dbConfig.logLevel || 'info',
      performanceThresholds: {
        executionTime: dbConfig.maxExecutionTime || 5000,
        errorRate: dbConfig.maxErrorRate || 0.1,
        memoryUsage: dbConfig.maxMemoryUsage || 80,
      },
      circuitBreakerOptions: {
        failureThreshold: dbConfig.circuitBreakerFailureThreshold || 5,
        resetTimeout: dbConfig.circuitBreakerResetTimeout || 60000,
        successThreshold: dbConfig.circuitBreakerSuccessThreshold || 3,
      },
    };
  }
}

@Module({
  imports: [
    GoRulesModule.forRootAsync({
      imports: [ConfigModule, DatabaseModule, SecretsModule],
      useClass: CustomGoRulesConfigFactory,
    }),
  ],
})
export class AppModule {}
```

## Configuration Validation

### Built-in Validation

The library includes built-in configuration validation:

```typescript
import { GoRulesConfigService } from '@org/gorules';

@Injectable()
export class AppService implements OnModuleInit {
  constructor(private readonly configService: GoRulesConfigService) {}

  onModuleInit() {
    try {
      // Validate configuration on startup
      this.configService.validateConfig();
      console.log('GoRules configuration is valid');
    } catch (error) {
      console.error('GoRules configuration validation failed:', error);
      process.exit(1);
    }
  }
}
```

### Custom Validation

```typescript
function validateGoRulesConfig(config: GoRulesConfig): string[] {
  const errors: string[] = [];

  // Required fields
  if (!config.apiUrl) errors.push('apiUrl is required');
  if (!config.apiKey) errors.push('apiKey is required');
  if (!config.projectId) errors.push('projectId is required');

  // URL validation
  if (config.apiUrl && !isValidUrl(config.apiUrl)) {
    errors.push('apiUrl must be a valid URL');
  }

  // Numeric validations
  if (config.timeout && (config.timeout < 1000 || config.timeout > 300000)) {
    errors.push('timeout must be between 1000 and 300000 milliseconds');
  }

  if (config.retryAttempts && (config.retryAttempts < 0 || config.retryAttempts > 10)) {
    errors.push('retryAttempts must be between 0 and 10');
  }

  // Performance thresholds
  if (config.performanceThresholds?.errorRate) {
    const errorRate = config.performanceThresholds.errorRate;
    if (errorRate < 0 || errorRate > 1) {
      errors.push('errorRate threshold must be between 0 and 1');
    }
  }

  return errors;
}

// Use in configuration factory
GoRulesModule.forRootAsync({
  useFactory: (configService: ConfigService) => {
    const config = {
      apiUrl: configService.get('GORULES_API_URL'),
      apiKey: configService.get('GORULES_API_KEY'),
      projectId: configService.get('GORULES_PROJECT_ID'),
    };

    const errors = validateGoRulesConfig(config);
    if (errors.length > 0) {
      throw new Error(`GoRules configuration errors: ${errors.join(', ')}`);
    }

    return config;
  },
  inject: [ConfigService],
})
```

## Environment-Specific Settings

### Development Environment

```typescript
const developmentConfig: Partial<GoRulesConfig> = {
  timeout: 45000,           // Longer timeout for debugging
  retryAttempts: 5,         // More retries for unstable dev environment
  enableLogging: true,      // Enable detailed logging
  logLevel: 'debug',        // Verbose logging
  enableMetrics: true,      // Enable performance monitoring
  performanceThresholds: {
    executionTime: 10000,   // More lenient thresholds
    errorRate: 0.2,
    memoryUsage: 90,
  },
};
```

### Production Environment

```typescript
const productionConfig: Partial<GoRulesConfig> = {
  timeout: 30000,           // Standard timeout
  retryAttempts: 3,         // Conservative retry count
  enableLogging: false,     // Disable detailed logging for performance
  logLevel: 'error',        // Only log errors
  enableMetrics: true,      // Keep metrics for monitoring
  performanceThresholds: {
    executionTime: 5000,    // Strict performance requirements
    errorRate: 0.05,        // Low error tolerance
    memoryUsage: 80,        // Conservative memory usage
  },
  circuitBreakerOptions: {
    failureThreshold: 3,    // Fail fast in production
    resetTimeout: 30000,    // Quick recovery
  },
};
```

### Testing Environment

```typescript
const testConfig: Partial<GoRulesConfig> = {
  timeout: 5000,            // Fast timeouts for quick tests
  retryAttempts: 1,         // Minimal retries
  enableLogging: false,     // Disable logging for clean test output
  enableMetrics: false,     // Disable metrics for test performance
  circuitBreakerOptions: {
    failureThreshold: 10,   // High threshold to avoid interference
    resetTimeout: 1000,     // Quick reset for tests
  },
};
```

## Performance Tuning

### High-Throughput Configuration

```typescript
const highThroughputConfig: GoRulesConfig = {
  apiUrl: 'https://triveni.gorules.io',
  apiKey: process.env.GORULES_API_KEY!,
  projectId: process.env.GORULES_PROJECT_ID!,
  
  // Optimized for high throughput
  timeout: 15000,           // Shorter timeout
  retryAttempts: 2,         // Fewer retries
  enableLogging: false,     // Disable logging for performance
  enableMetrics: true,      // Keep metrics for monitoring
  
  // HTTP optimizations
  httpOptions: {
    keepAlive: true,
    keepAliveMsecs: 30000,
    maxSockets: 100,        // Increase connection pool
    maxFreeSockets: 50,
  },
  
  // Aggressive circuit breaker
  circuitBreakerOptions: {
    failureThreshold: 3,
    resetTimeout: 15000,
    successThreshold: 2,
  },
};
```

### Low-Latency Configuration

```typescript
const lowLatencyConfig: GoRulesConfig = {
  apiUrl: 'https://triveni.gorules.io',
  apiKey: process.env.GORULES_API_KEY!,
  projectId: process.env.GORULES_PROJECT_ID!,
  
  // Optimized for low latency
  timeout: 5000,            // Very short timeout
  retryAttempts: 1,         // Minimal retries
  enableLogging: false,     // No logging overhead
  enableMetrics: false,     // No metrics overhead
  
  // Performance thresholds
  performanceThresholds: {
    executionTime: 2000,    // Strict latency requirements
    errorRate: 0.01,
    memoryUsage: 70,
  },
  
  // HTTP optimizations
  httpOptions: {
    keepAlive: true,
    keepAliveMsecs: 60000,
    maxSockets: 50,
    maxFreeSockets: 25,
  },
};
```

## Security Configuration

### Secure Production Setup

```typescript
const secureConfig: GoRulesConfig = {
  apiUrl: 'https://triveni.gorules.io',
  apiKey: process.env.GORULES_API_KEY!,
  projectId: process.env.GORULES_PROJECT_ID!,
  
  // Security settings
  security: {
    validateCertificates: true,
    allowInsecureConnections: false,
    customCertificates: [
      // Add custom CA certificates if needed
      process.env.CUSTOM_CA_CERT,
    ].filter(Boolean),
  },
  
  // Secure HTTP options
  httpOptions: {
    maxRedirects: 0,        // Disable redirects for security
    keepAlive: true,
  },
  
  // Conservative timeouts
  timeout: 30000,
  retryAttempts: 3,
  
  // Enable monitoring for security
  enableLogging: true,
  logLevel: 'info',
  enableMetrics: true,
};
```

### Development with Self-Signed Certificates

```typescript
const devWithSelfSignedConfig: GoRulesConfig = {
  apiUrl: 'https://dev.gorules.local',
  apiKey: process.env.GORULES_DEV_API_KEY!,
  projectId: process.env.GORULES_DEV_PROJECT_ID!,
  
  // Allow self-signed certificates in development
  security: {
    validateCertificates: false,
    allowInsecureConnections: true,
  },
  
  enableLogging: true,
  logLevel: 'debug',
};
```

## Monitoring Configuration

### Comprehensive Monitoring Setup

```typescript
const monitoringConfig: GoRulesConfig = {
  apiUrl: 'https://triveni.gorules.io',
  apiKey: process.env.GORULES_API_KEY!,
  projectId: process.env.GORULES_PROJECT_ID!,
  
  // Enable all monitoring features
  enableLogging: true,
  logLevel: 'info',
  maxLogEntries: 5000,
  logRetentionMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  
  enableMetrics: true,
  performanceThresholds: {
    executionTime: 3000,
    errorRate: 0.05,
    memoryUsage: 75,
  },
  
  // Circuit breaker for monitoring
  circuitBreakerOptions: {
    failureThreshold: 5,
    resetTimeout: 60000,
    successThreshold: 3,
  },
};
```

### Minimal Monitoring for Performance

```typescript
const minimalMonitoringConfig: GoRulesConfig = {
  apiUrl: 'https://triveni.gorules.io',
  apiKey: process.env.GORULES_API_KEY!,
  projectId: process.env.GORULES_PROJECT_ID!,
  
  // Minimal monitoring for performance
  enableLogging: false,
  enableMetrics: true,      // Keep basic metrics
  maxLogEntries: 100,       // Minimal log storage
  logRetentionMs: 60 * 60 * 1000, // 1 hour
  
  performanceThresholds: {
    executionTime: 5000,
    errorRate: 0.1,
    memoryUsage: 80,
  },
};
```

## Configuration Best Practices

### 1. Use Environment Variables

```typescript
// Good: Use environment variables
const config = {
  apiKey: process.env.GORULES_API_KEY,
  projectId: process.env.GORULES_PROJECT_ID,
};

// Bad: Hardcode sensitive values
const config = {
  apiKey: 'hardcoded-api-key',
  projectId: 'hardcoded-project-id',
};
```

### 2. Validate Configuration Early

```typescript
@Module({
  imports: [
    GoRulesModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        const config = createGoRulesConfig(configService);
        validateConfiguration(config);
        return config;
      },
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

### 3. Use Different Configs per Environment

```typescript
const configs = {
  development: developmentConfig,
  test: testConfig,
  staging: stagingConfig,
  production: productionConfig,
};

const currentConfig = configs[process.env.NODE_ENV || 'development'];
```

### 4. Document Configuration Options

```typescript
/**
 * GoRules configuration for the application
 * 
 * Environment Variables:
 * - GORULES_API_KEY: API key for GoRules service (required)
 * - GORULES_PROJECT_ID: Project ID in GoRules (required)
 * - GORULES_TIMEOUT: Request timeout in milliseconds (default: 30000)
 */
const config: GoRulesConfig = {
  apiKey: process.env.GORULES_API_KEY!,
  projectId: process.env.GORULES_PROJECT_ID!,
  timeout: parseInt(process.env.GORULES_TIMEOUT || '30000'),
};
```

### 5. Use Configuration Schemas

```typescript
import * as Joi from 'joi';

const configSchema = Joi.object({
  apiUrl: Joi.string().uri().required(),
  apiKey: Joi.string().min(10).required(),
  projectId: Joi.string().min(5).required(),
  timeout: Joi.number().min(1000).max(300000).default(30000),
  retryAttempts: Joi.number().min(0).max(10).default(3),
  enableLogging: Joi.boolean().default(false),
});

const { error, value } = configSchema.validate(rawConfig);
if (error) {
  throw new Error(`Configuration validation failed: ${error.message}`);
}
```

This comprehensive configuration guide should help users properly set up and tune the GoRules library for their specific needs and environments.