/**
 * Configuration factory for the minimal GoRules engine
 * Provides environment variable support and validation
 */

import { MinimalGoRulesConfig, ConfigValidationResult } from '../interfaces/config';
import { MinimalGoRulesError, MinimalErrorCode } from '../errors/minimal-errors';

/**
 * Environment variable names for configuration
 */
export const ENV_VARS = {
  API_URL: 'GORULES_API_URL',
  API_KEY: 'GORULES_API_KEY',
  PROJECT_ID: 'GORULES_PROJECT_ID',
  CACHE_MAX_SIZE: 'GORULES_CACHE_MAX_SIZE',
  HTTP_TIMEOUT: 'GORULES_HTTP_TIMEOUT',
  BATCH_SIZE: 'GORULES_BATCH_SIZE',
  PLATFORM: 'GORULES_PLATFORM',
  ENABLE_PERFORMANCE_OPTIMIZATIONS: 'GORULES_ENABLE_PERFORMANCE_OPTIMIZATIONS',
  ENABLE_PERFORMANCE_METRICS: 'GORULES_ENABLE_PERFORMANCE_METRICS',
  MEMORY_WARNING_THRESHOLD: 'GORULES_MEMORY_WARNING_THRESHOLD',
  MEMORY_CRITICAL_THRESHOLD: 'GORULES_MEMORY_CRITICAL_THRESHOLD',
  MEMORY_CLEANUP_INTERVAL: 'GORULES_MEMORY_CLEANUP_INTERVAL',
  ENABLE_CONNECTION_POOLING: 'GORULES_ENABLE_CONNECTION_POOLING',
  ENABLE_REQUEST_BATCHING: 'GORULES_ENABLE_REQUEST_BATCHING',
  ENABLE_COMPRESSION: 'GORULES_ENABLE_COMPRESSION',
  COMPRESSION_ALGORITHM: 'GORULES_COMPRESSION_ALGORITHM'
} as const;

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: Partial<MinimalGoRulesConfig> = {
  cacheMaxSize: 1000,
  httpTimeout: 5000,
  batchSize: 50,
  platform: 'node',
  enablePerformanceOptimizations: false,
  enablePerformanceMetrics: false,
  memoryWarningThreshold: 0.7,
  memoryCriticalThreshold: 0.85,
  memoryCleanupInterval: 30000,
  enableConnectionPooling: true,
  enableRequestBatching: true,
  enableCompression: true,
  compressionAlgorithm: 'gzip'
} as const;

/**
 * Configuration validation errors
 */
export class ConfigValidationError extends MinimalGoRulesError {
  constructor(message: string, public readonly validationErrors: string[]) {
    super(MinimalErrorCode.INVALID_INPUT, message);
    this.name = 'ConfigValidationError';
  }
}

/**
 * Configuration factory class
 */
export class ConfigFactory {
  /**
   * Create configuration from environment variables
   */
  static fromEnvironment(overrides: Partial<MinimalGoRulesConfig> = {}): MinimalGoRulesConfig {
    const envConfig: Partial<MinimalGoRulesConfig> = {};

    // Required string values
    if (process.env[ENV_VARS.API_URL]) {
      envConfig.apiUrl = process.env[ENV_VARS.API_URL];
    }
    if (process.env[ENV_VARS.API_KEY]) {
      envConfig.apiKey = process.env[ENV_VARS.API_KEY];
    }
    if (process.env[ENV_VARS.PROJECT_ID]) {
      envConfig.projectId = process.env[ENV_VARS.PROJECT_ID];
    }

    // Optional numeric values
    if (process.env[ENV_VARS.CACHE_MAX_SIZE]) {
      const value = parseInt(process.env[ENV_VARS.CACHE_MAX_SIZE]!, 10);
      if (!isNaN(value)) {
        envConfig.cacheMaxSize = value;
      }
    }
    if (process.env[ENV_VARS.HTTP_TIMEOUT]) {
      const value = parseInt(process.env[ENV_VARS.HTTP_TIMEOUT]!, 10);
      if (!isNaN(value)) {
        envConfig.httpTimeout = value;
      }
    }
    if (process.env[ENV_VARS.BATCH_SIZE]) {
      const value = parseInt(process.env[ENV_VARS.BATCH_SIZE]!, 10);
      if (!isNaN(value)) {
        envConfig.batchSize = value;
      }
    }

    // Platform setting
    if (process.env[ENV_VARS.PLATFORM]) {
      const platform = process.env[ENV_VARS.PLATFORM];
      if (platform === 'node' || platform === 'browser') {
        envConfig.platform = platform;
      }
    }

    // Boolean performance settings
    if (process.env[ENV_VARS.ENABLE_PERFORMANCE_OPTIMIZATIONS]) {
      const value = process.env[ENV_VARS.ENABLE_PERFORMANCE_OPTIMIZATIONS]!.toLowerCase();
      if (value === 'true' || value === 'false') {
        envConfig.enablePerformanceOptimizations = value === 'true';
      }
    }
    if (process.env[ENV_VARS.ENABLE_PERFORMANCE_METRICS]) {
      const value = process.env[ENV_VARS.ENABLE_PERFORMANCE_METRICS]!.toLowerCase();
      if (value === 'true' || value === 'false') {
        envConfig.enablePerformanceMetrics = value === 'true';
      }
    }
    if (process.env[ENV_VARS.ENABLE_CONNECTION_POOLING]) {
      const value = process.env[ENV_VARS.ENABLE_CONNECTION_POOLING]!.toLowerCase();
      if (value === 'true' || value === 'false') {
        envConfig.enableConnectionPooling = value === 'true';
      }
    }
    if (process.env[ENV_VARS.ENABLE_REQUEST_BATCHING]) {
      const value = process.env[ENV_VARS.ENABLE_REQUEST_BATCHING]!.toLowerCase();
      if (value === 'true' || value === 'false') {
        envConfig.enableRequestBatching = value === 'true';
      }
    }
    if (process.env[ENV_VARS.ENABLE_COMPRESSION]) {
      const value = process.env[ENV_VARS.ENABLE_COMPRESSION]!.toLowerCase();
      if (value === 'true' || value === 'false') {
        envConfig.enableCompression = value === 'true';
      }
    }

    // Float memory thresholds
    if (process.env[ENV_VARS.MEMORY_WARNING_THRESHOLD]) {
      const value = parseFloat(process.env[ENV_VARS.MEMORY_WARNING_THRESHOLD]!);
      if (!isNaN(value) && value > 0 && value < 1) {
        envConfig.memoryWarningThreshold = value;
      }
    }
    if (process.env[ENV_VARS.MEMORY_CRITICAL_THRESHOLD]) {
      const value = parseFloat(process.env[ENV_VARS.MEMORY_CRITICAL_THRESHOLD]!);
      if (!isNaN(value) && value > 0 && value < 1) {
        envConfig.memoryCriticalThreshold = value;
      }
    }

    // Memory cleanup interval
    if (process.env[ENV_VARS.MEMORY_CLEANUP_INTERVAL]) {
      const value = parseInt(process.env[ENV_VARS.MEMORY_CLEANUP_INTERVAL]!, 10);
      if (!isNaN(value) && value > 0) {
        envConfig.memoryCleanupInterval = value;
      }
    }

    // Compression algorithm
    if (process.env[ENV_VARS.COMPRESSION_ALGORITHM]) {
      const algorithm = process.env[ENV_VARS.COMPRESSION_ALGORITHM];
      if (algorithm === 'gzip' || algorithm === 'deflate' || algorithm === 'none') {
        envConfig.compressionAlgorithm = algorithm;
      }
    }

    // Merge with defaults, environment config, and overrides
    const config = {
      ...DEFAULT_CONFIG,
      ...envConfig,
      ...overrides
    } as MinimalGoRulesConfig;

    // Validate the final configuration
    const validation = this.validate(config);
    if (!validation.isValid) {
      throw new ConfigValidationError(
        'Configuration validation failed',
        validation.errors
      );
    }

    return config;
  }

  /**
   * Create configuration for development environment
   */
  static forDevelopment(overrides: Partial<MinimalGoRulesConfig> = {}): MinimalGoRulesConfig {
    const devConfig: Partial<MinimalGoRulesConfig> = {
      apiUrl: 'https://api.gorules.io',
      cacheMaxSize: 100,
      httpTimeout: 10000,
      batchSize: 10,
      enablePerformanceOptimizations: false,
      enablePerformanceMetrics: true,
      ...overrides
    };

    return this.fromEnvironment(devConfig);
  }

  /**
   * Create configuration for production environment
   */
  static forProduction(overrides: Partial<MinimalGoRulesConfig> = {}): MinimalGoRulesConfig {
    const prodConfig: Partial<MinimalGoRulesConfig> = {
      cacheMaxSize: 5000,
      httpTimeout: 5000,
      batchSize: 100,
      enablePerformanceOptimizations: true,
      enablePerformanceMetrics: false,
      enableConnectionPooling: true,
      enableRequestBatching: true,
      enableCompression: true,
      compressionAlgorithm: 'gzip',
      ...overrides
    };

    return this.fromEnvironment(prodConfig);
  }

  /**
   * Create configuration for testing environment
   */
  static forTesting(overrides: Partial<MinimalGoRulesConfig> = {}): MinimalGoRulesConfig {
    const testConfig: Partial<MinimalGoRulesConfig> = {
      apiUrl: 'https://mock-api.gorules.io',
      apiKey: 'test-api-key',
      projectId: 'test-project-id',
      cacheMaxSize: 50,
      httpTimeout: 1000,
      batchSize: 5,
      enablePerformanceOptimizations: false,
      enablePerformanceMetrics: false,
      ...overrides
    };

    const config = {
      ...DEFAULT_CONFIG,
      ...testConfig
    } as MinimalGoRulesConfig;

    // Skip environment loading for testing
    const validation = this.validate(config);
    if (!validation.isValid) {
      throw new ConfigValidationError(
        'Test configuration validation failed',
        validation.errors
      );
    }

    return config;
  }

  /**
   * Validate configuration object
   */
  static validate(config: MinimalGoRulesConfig): ConfigValidationResult {
    const errors: string[] = [];

    // Required fields
    if (!config) {
      errors.push('Configuration object is required');
      return { isValid: false, errors };
    }

    if (!config.apiUrl) {
      errors.push('API URL is required');
    } else if (!this.isValidUrl(config.apiUrl)) {
      errors.push('API URL must be a valid URL');
    }

    if (!config.apiKey) {
      errors.push('API key is required');
    } else if (typeof config.apiKey !== 'string' || config.apiKey.trim().length === 0) {
      errors.push('API key must be a non-empty string');
    }

    if (!config.projectId || (typeof config.projectId === 'string' && config.projectId.trim().length === 0)) {
      errors.push('Project ID is required');
    } else if (typeof config.projectId !== 'string') {
      errors.push('Project ID must be a non-empty string');
    }

    // Optional numeric validations
    if (config.cacheMaxSize !== undefined) {
      if (!Number.isInteger(config.cacheMaxSize) || config.cacheMaxSize <= 0) {
        errors.push('Cache max size must be a positive integer');
      }
    }

    if (config.httpTimeout !== undefined) {
      if (!Number.isInteger(config.httpTimeout) || config.httpTimeout <= 0) {
        errors.push('HTTP timeout must be a positive integer');
      }
    }

    if (config.batchSize !== undefined) {
      if (!Number.isInteger(config.batchSize) || config.batchSize <= 0) {
        errors.push('Batch size must be a positive integer');
      }
    }

    // Platform validation
    if (config.platform !== undefined) {
      if (config.platform !== 'node' && config.platform !== 'browser') {
        errors.push('Platform must be either "node" or "browser"');
      }
    }

    // Memory threshold validations
    if (config.memoryWarningThreshold !== undefined) {
      if (typeof config.memoryWarningThreshold !== 'number' || 
          config.memoryWarningThreshold <= 0 || 
          config.memoryWarningThreshold >= 1) {
        errors.push('Memory warning threshold must be a number between 0 and 1');
      }
    }

    if (config.memoryCriticalThreshold !== undefined) {
      if (typeof config.memoryCriticalThreshold !== 'number' || 
          config.memoryCriticalThreshold <= 0 || 
          config.memoryCriticalThreshold >= 1) {
        errors.push('Memory critical threshold must be a number between 0 and 1');
      }
    }

    // Ensure critical threshold is higher than warning threshold
    if (config.memoryWarningThreshold !== undefined && 
        config.memoryCriticalThreshold !== undefined) {
      if (config.memoryCriticalThreshold <= config.memoryWarningThreshold) {
        errors.push('Memory critical threshold must be higher than warning threshold');
      }
    }

    if (config.memoryCleanupInterval !== undefined) {
      if (!Number.isInteger(config.memoryCleanupInterval) || config.memoryCleanupInterval <= 0) {
        errors.push('Memory cleanup interval must be a positive integer');
      }
    }

    // Compression algorithm validation
    if (config.compressionAlgorithm !== undefined) {
      if (!['gzip', 'deflate', 'none'].includes(config.compressionAlgorithm)) {
        errors.push('Compression algorithm must be "gzip", "deflate", or "none"');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if a string is a valid URL
   */
  private static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get configuration documentation
   */
  static getDocumentation(): string {
    return `
# Minimal GoRules Engine Configuration

## Environment Variables

### Required
- ${ENV_VARS.API_URL}: GoRules Cloud API URL (e.g., https://api.gorules.io)
- ${ENV_VARS.API_KEY}: Your GoRules Cloud API key
- ${ENV_VARS.PROJECT_ID}: Your GoRules Cloud project ID

### Optional Performance Settings
- ${ENV_VARS.CACHE_MAX_SIZE}: Maximum number of rules to cache (default: ${DEFAULT_CONFIG.cacheMaxSize})
- ${ENV_VARS.HTTP_TIMEOUT}: HTTP request timeout in milliseconds (default: ${DEFAULT_CONFIG.httpTimeout})
- ${ENV_VARS.BATCH_SIZE}: Batch size for parallel operations (default: ${DEFAULT_CONFIG.batchSize})

### Platform Settings
- ${ENV_VARS.PLATFORM}: Target platform - "node" or "browser" (default: ${DEFAULT_CONFIG.platform})

### Performance Optimization Settings
- ${ENV_VARS.ENABLE_PERFORMANCE_OPTIMIZATIONS}: Enable performance optimizations (default: ${DEFAULT_CONFIG.enablePerformanceOptimizations})
- ${ENV_VARS.ENABLE_PERFORMANCE_METRICS}: Enable performance metrics collection (default: ${DEFAULT_CONFIG.enablePerformanceMetrics})
- ${ENV_VARS.ENABLE_CONNECTION_POOLING}: Enable HTTP connection pooling (default: ${DEFAULT_CONFIG.enableConnectionPooling})
- ${ENV_VARS.ENABLE_REQUEST_BATCHING}: Enable request batching (default: ${DEFAULT_CONFIG.enableRequestBatching})
- ${ENV_VARS.ENABLE_COMPRESSION}: Enable data compression (default: ${DEFAULT_CONFIG.enableCompression})
- ${ENV_VARS.COMPRESSION_ALGORITHM}: Compression algorithm - "gzip", "deflate", or "none" (default: ${DEFAULT_CONFIG.compressionAlgorithm})

### Memory Management Settings
- ${ENV_VARS.MEMORY_WARNING_THRESHOLD}: Memory usage warning threshold (0-1, default: ${DEFAULT_CONFIG.memoryWarningThreshold})
- ${ENV_VARS.MEMORY_CRITICAL_THRESHOLD}: Memory usage critical threshold (0-1, default: ${DEFAULT_CONFIG.memoryCriticalThreshold})
- ${ENV_VARS.MEMORY_CLEANUP_INTERVAL}: Memory cleanup interval in milliseconds (default: ${DEFAULT_CONFIG.memoryCleanupInterval})

## Usage Examples

### From Environment Variables
\`\`\`typescript
import { ConfigFactory } from '@minimal-gorules/config';

const config = ConfigFactory.fromEnvironment();
const engine = new MinimalGoRulesEngine(config);
\`\`\`

### Development Configuration
\`\`\`typescript
const config = ConfigFactory.forDevelopment({
  apiKey: 'your-dev-api-key',
  projectId: 'your-dev-project-id'
});
\`\`\`

### Production Configuration
\`\`\`typescript
const config = ConfigFactory.forProduction();
\`\`\`

### Testing Configuration
\`\`\`typescript
const config = ConfigFactory.forTesting();
\`\`\`

### Manual Configuration with Validation
\`\`\`typescript
const config = {
  apiUrl: 'https://api.gorules.io',
  apiKey: 'your-api-key',
  projectId: 'your-project-id',
  cacheMaxSize: 2000,
  enablePerformanceOptimizations: true
};

const validation = ConfigFactory.validate(config);
if (!validation.isValid) {
  console.error('Configuration errors:', validation.errors);
}
\`\`\`
    `.trim();
  }
}