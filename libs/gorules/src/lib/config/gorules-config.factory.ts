import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoRulesConfig, GoRulesOptionsFactory } from './gorules-config.interface.js';

/**
 * Factory for creating GoRules configuration from NestJS ConfigService
 */
@Injectable()
export class GoRulesConfigFactory implements GoRulesOptionsFactory {
  private readonly logger = new Logger(GoRulesConfigFactory.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Create GoRules configuration from ConfigService
   */
  createGoRulesOptions(): GoRulesConfig {
    this.logger.debug('Creating GoRules configuration from ConfigService');

    const config: GoRulesConfig = {
      apiUrl: this.configService.get<string>('GORULES_API_URL', 'https://triveni.gorules.io'),
      apiKey: this.configService.get<string>('GORULES_API_KEY', 'development-key'),
      projectId: this.configService.get<string>('GORULES_PROJECT_ID', 'development-project-id'),
      timeout: this.configService.get<number>('GORULES_TIMEOUT', 30000),
      retryAttempts: this.configService.get<number>('GORULES_RETRY_ATTEMPTS', 3),
      enableLogging: this.configService.get<boolean>('GORULES_ENABLE_LOGGING', false),
    };

    this.logger.debug('GoRules configuration created successfully', {
      apiUrl: config.apiUrl,
      projectId: config.projectId,
      timeout: config.timeout,
      retryAttempts: config.retryAttempts,
      enableLogging: config.enableLogging,
    });

    return config;
  }
}

/**
 * Async factory for creating GoRules configuration
 */
@Injectable()
export class GoRulesAsyncConfigFactory implements GoRulesOptionsFactory {
  private readonly logger = new Logger(GoRulesAsyncConfigFactory.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Create GoRules configuration asynchronously
   * This allows for loading configuration from external sources
   */
  async createGoRulesOptions(): Promise<GoRulesConfig> {
    this.logger.debug('Creating GoRules configuration asynchronously');

    // Simulate async configuration loading (e.g., from external service, database, etc.)
    await this.loadExternalConfiguration();

    const config: GoRulesConfig = {
      apiUrl: this.configService.get<string>('GORULES_API_URL', 'https://triveni.gorules.io'),
      apiKey: this.configService.get<string>('GORULES_API_KEY', 'development-key'),
      projectId: this.configService.get<string>('GORULES_PROJECT_ID', 'development-project-id'),
      timeout: this.configService.get<number>('GORULES_TIMEOUT', 30000),
      retryAttempts: this.configService.get<number>('GORULES_RETRY_ATTEMPTS', 3),
      enableLogging: this.configService.get<boolean>('GORULES_ENABLE_LOGGING', false),
    };

    this.logger.log('GoRules async configuration created successfully');
    return config;
  }

  /**
   * Load configuration from external sources
   */
  private async loadExternalConfiguration(): Promise<void> {
    // This could load from:
    // - External configuration service
    // - Database
    // - Remote API
    // - Encrypted configuration files
    // For now, we'll just simulate the async operation
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

/**
 * Environment-specific configuration factory
 */
@Injectable()
export class GoRulesEnvironmentConfigFactory implements GoRulesOptionsFactory {
  private readonly logger = new Logger(GoRulesEnvironmentConfigFactory.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Create environment-specific GoRules configuration
   */
  createGoRulesOptions(): GoRulesConfig {
    const environment = this.configService.get<string>('NODE_ENV', 'development');
    this.logger.debug(`Creating GoRules configuration for environment: ${environment}`);

    const baseConfig = this.getBaseConfiguration();
    const envConfig = this.getEnvironmentSpecificConfiguration(environment);

    const config: GoRulesConfig = {
      ...baseConfig,
      ...envConfig,
    };

    this.logger.debug('Environment-specific GoRules configuration created', {
      environment,
      apiUrl: config.apiUrl,
      timeout: config.timeout,
      enableLogging: config.enableLogging,
    });

    return config;
  }

  /**
   * Get base configuration that applies to all environments
   */
  private getBaseConfiguration(): Pick<GoRulesConfig, 'apiKey' | 'projectId'> {
    return {
      apiKey: this.configService.get<string>('GORULES_API_KEY', 'development-key'),
      projectId: this.configService.get<string>('GORULES_PROJECT_ID', 'development-project-id'),
    };
  }

  /**
   * Get environment-specific configuration overrides
   */
  private getEnvironmentSpecificConfiguration(
    environment: string,
  ): Pick<GoRulesConfig, 'apiUrl' | 'timeout' | 'retryAttempts' | 'enableLogging'> {
    switch (environment) {
      case 'development':
        return {
          apiUrl: this.configService.get<string>('GORULES_API_URL', 'https://triveni.gorules.io'),
          timeout: 60000, // Longer timeout for development
          retryAttempts: 1, // Fewer retries for faster feedback
          enableLogging: true, // Enable logging in development
        };

      case 'test':
        return {
          apiUrl: this.configService.get<string>('GORULES_API_URL', 'https://test.gorules.io'),
          timeout: 10000, // Shorter timeout for tests
          retryAttempts: 0, // No retries in tests
          enableLogging: false, // Disable logging in tests
        };

      case 'staging':
        return {
          apiUrl: this.configService.get<string>('GORULES_API_URL', 'https://staging.gorules.io'),
          timeout: 30000,
          retryAttempts: 2,
          enableLogging: true,
        };

      case 'production':
        return {
          apiUrl: this.configService.get<string>('GORULES_API_URL', 'https://triveni.gorules.io'),
          timeout: 30000,
          retryAttempts: 3,
          enableLogging: false, // Disable verbose logging in production
        };

      default:
        this.logger.warn(`Unknown environment: ${environment}, using development defaults`);
        return this.getEnvironmentSpecificConfiguration('development');
    }
  }
}

/**
 * Utility functions for configuration management
 */
export class GoRulesConfigUtils {
  /**
   * Validate configuration and return detailed validation results
   */
  static validateConfiguration(config: GoRulesConfig): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required field validation
    if (!config.apiUrl) {
      errors.push('apiUrl is required');
    } else if (!this.isValidUrl(config.apiUrl)) {
      errors.push('apiUrl must be a valid URL');
    }

    if (!config.apiKey) {
      errors.push('apiKey is required');
    } else if (config.apiKey.length < 10) {
      warnings.push('apiKey seems too short, ensure it is correct');
    }

    if (!config.projectId) {
      errors.push('projectId is required');
    } else if (!this.isValidUuid(config.projectId)) {
      warnings.push('projectId does not appear to be a valid UUID');
    }

    // Optional field validation
    if (config.timeout !== undefined) {
      if (config.timeout <= 0) {
        errors.push('timeout must be greater than 0');
      } else if (config.timeout > 300000) {
        errors.push('timeout must not exceed 300000 milliseconds (5 minutes)');
      } else if (config.timeout < 1000) {
        warnings.push('timeout is very short, this may cause frequent timeouts');
      }
    }

    if (config.retryAttempts !== undefined) {
      if (config.retryAttempts < 0) {
        errors.push('retryAttempts must be 0 or greater');
      } else if (config.retryAttempts > 10) {
        errors.push('retryAttempts must not exceed 10');
      } else if (config.retryAttempts > 5) {
        warnings.push('high retry attempts may cause long delays on failures');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
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
   * Check if a string is a valid UUID
   */
  private static isValidUuid(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Merge multiple configuration objects with proper precedence
   */
  static mergeConfigurations(...configs: Partial<GoRulesConfig>[]): GoRulesConfig {
    const merged = configs.reduce(
      (acc, config) => ({ ...acc, ...config }),
      {} as Partial<GoRulesConfig>,
    );

    // Ensure required fields are present
    if (!merged.apiUrl || !merged.apiKey || !merged.projectId) {
      throw new Error('Merged configuration is missing required fields');
    }

    return merged as GoRulesConfig;
  }

  /**
   * Create a configuration object with sensitive data masked for logging
   */
  static maskSensitiveData(config: GoRulesConfig): Record<string, unknown> {
    return {
      apiUrl: config.apiUrl,
      apiKey: config.apiKey ? `${config.apiKey.substring(0, 4)}****` : undefined,
      projectId: config.projectId,
      timeout: config.timeout,
      retryAttempts: config.retryAttempts,
      enableLogging: config.enableLogging,
    };
  }
}
