import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { GoRulesConfig } from './gorules-config.interface.js';
import { GoRulesConfigUtils } from './gorules-config.factory.js';

/**
 * Configuration service for GoRules integration
 */
@Injectable()
export class GoRulesConfigService implements OnModuleInit {
  private readonly logger = new Logger(GoRulesConfigService.name);
  private config!: GoRulesConfig;
  private configCache: Map<string, unknown> = new Map();

  constructor(config: GoRulesConfig) {
    this.validateAndSetConfig(config);
  }

  /**
   * Initialize the configuration service
   */
  onModuleInit(): void {
    this.logger.log('GoRules configuration service initialized', {
      config: GoRulesConfigUtils.maskSensitiveData(this.config),
    });
  }

  /**
   * Get the current configuration
   */
  getConfig(): GoRulesConfig {
    return { ...this.config };
  }

  /**
   * Get a specific configuration value with caching
   */
  get<T = unknown>(key: keyof GoRulesConfig): T | undefined {
    const cacheKey = `config_${key}`;

    if (this.configCache.has(cacheKey)) {
      return this.configCache.get(cacheKey) as T;
    }

    const value = this.config[key] as T;
    this.configCache.set(cacheKey, value);
    return value;
  }

  /**
   * Get a configuration value or throw if not found
   */
  getOrThrow<T = unknown>(key: keyof GoRulesConfig): T {
    const value = this.get<T>(key);
    if (value === undefined || value === null) {
      throw new Error(`Configuration value for '${String(key)}' is required but not found`);
    }
    return value;
  }

  /**
   * Update configuration at runtime (useful for testing or dynamic configuration)
   */
  updateConfig(updates: Partial<GoRulesConfig>): void {
    this.logger.debug('Updating GoRules configuration', { updates });

    const newConfig = { ...this.config, ...updates };
    this.validateAndSetConfig(newConfig);
    this.clearCache();

    this.logger.log('GoRules configuration updated successfully');
  }

  /**
   * Get configuration with environment variable overrides
   */
  getConfigWithEnvOverrides(): GoRulesConfig {
    const envOverrides: Partial<GoRulesConfig> = {};

    // Check for environment variable overrides
    if (process.env['GORULES_API_URL']) {
      envOverrides.apiUrl = process.env['GORULES_API_URL'];
    }
    if (process.env['GORULES_API_KEY']) {
      envOverrides.apiKey = process.env['GORULES_API_KEY'];
    }
    if (process.env['GORULES_PROJECT_ID']) {
      envOverrides.projectId = process.env['GORULES_PROJECT_ID'];
    }
    if (process.env['GORULES_TIMEOUT']) {
      envOverrides.timeout = parseInt(process.env['GORULES_TIMEOUT'], 10);
    }
    if (process.env['GORULES_RETRY_ATTEMPTS']) {
      envOverrides.retryAttempts = parseInt(process.env['GORULES_RETRY_ATTEMPTS'], 10);
    }
    if (process.env['GORULES_ENABLE_LOGGING']) {
      envOverrides.enableLogging = process.env['GORULES_ENABLE_LOGGING'] === 'true';
    }

    return { ...this.config, ...envOverrides };
  }

  /**
   * Validate configuration and get detailed results
   */
  validateConfiguration(): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    return GoRulesConfigUtils.validateConfiguration(this.config);
  }

  /**
   * Check if the configuration is valid
   */
  isValid(): boolean {
    return this.validateConfiguration().isValid;
  }

  /**
   * Get default configuration values
   */
  private getDefaultConfig(): Partial<GoRulesConfig> {
    return {
      timeout: 30000, // 30 seconds
      retryAttempts: 3,
      enableLogging: false,
    };
  }

  /**
   * Validate and set configuration
   */
  private validateAndSetConfig(config: GoRulesConfig): void {
    const validation = GoRulesConfigUtils.validateConfiguration(config);

    if (!validation.isValid) {
      const errorMessage = `GoRules configuration validation failed: ${validation.errors.join(
        ', ',
      )}`;
      this.logger.error(errorMessage, { errors: validation.errors });
      throw new Error(errorMessage);
    }

    if (validation.warnings.length > 0) {
      this.logger.warn('GoRules configuration warnings', { warnings: validation.warnings });
    }

    this.config = {
      ...this.getDefaultConfig(),
      ...config,
    };
  }

  /**
   * Clear the configuration cache
   */
  private clearCache(): void {
    this.configCache.clear();
  }
}

/**
 * Factory function to create GoRules configuration from environment variables
 */
export function createGoRulesConfigFromEnv(): GoRulesConfig {
  const config: GoRulesConfig = {
    apiUrl: process.env['GORULES_API_URL'] || 'https://triveni.gorules.io',
    apiKey: process.env['GORULES_API_KEY'] || '',
    projectId: process.env['GORULES_PROJECT_ID'] || '',
    timeout: process.env['GORULES_TIMEOUT']
      ? parseInt(process.env['GORULES_TIMEOUT'], 10)
      : undefined,
    retryAttempts: process.env['GORULES_RETRY_ATTEMPTS']
      ? parseInt(process.env['GORULES_RETRY_ATTEMPTS'], 10)
      : undefined,
    enableLogging: process.env['GORULES_ENABLE_LOGGING'] === 'true',
  };

  return config;
}
