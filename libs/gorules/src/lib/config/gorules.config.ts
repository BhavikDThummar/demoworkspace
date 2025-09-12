import { Injectable } from '@nestjs/common';
import { GoRulesConfig } from './gorules-config.interface.js';

/**
 * Configuration service for GoRules integration
 */
@Injectable()
export class GoRulesConfigService {
  private config: GoRulesConfig;

  constructor(config: GoRulesConfig) {
    this.validateConfig(config);
    this.config = {
      ...this.getDefaultConfig(),
      ...config,
    };
  }

  /**
   * Get the current configuration
   */
  getConfig(): GoRulesConfig {
    return { ...this.config };
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
   * Validate the provided configuration
   */
  private validateConfig(config: GoRulesConfig): void {
    const errors: string[] = [];

    if (!config.apiUrl) {
      errors.push('apiUrl is required');
    }

    if (!config.apiKey) {
      errors.push('apiKey is required');
    }

    if (!config.projectId) {
      errors.push('projectId is required');
    }

    if (config.timeout && (config.timeout <= 0 || config.timeout > 300000)) {
      errors.push('timeout must be between 1 and 300000 milliseconds');
    }

    if (config.retryAttempts && (config.retryAttempts < 0 || config.retryAttempts > 10)) {
      errors.push('retryAttempts must be between 0 and 10');
    }

    if (errors.length > 0) {
      throw new Error(`GoRules configuration validation failed: ${errors.join(', ')}`);
    }
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
    timeout: process.env['GORULES_TIMEOUT'] ? parseInt(process.env['GORULES_TIMEOUT'], 10) : undefined,
    retryAttempts: process.env['GORULES_RETRY_ATTEMPTS'] ? parseInt(process.env['GORULES_RETRY_ATTEMPTS'], 10) : undefined,
    enableLogging: process.env['GORULES_ENABLE_LOGGING'] === 'true',
  };

  return config;
}