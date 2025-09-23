/**
 * Rule Loader Factory for creating appropriate rule loader based on configuration
 */

import { MinimalGoRulesConfig } from '../interfaces/index.js';
import { IRuleLoaderService } from '../interfaces/services.js';
import { MinimalGoRulesError } from '../errors/index.js';
import { CloudRuleLoaderService } from './cloud-rule-loader-service.js';
import { LocalRuleLoaderService } from './local-rule-loader-service.js';

/**
 * Factory interface for creating rule loaders
 */
export interface IRuleLoaderFactory {
  /**
   * Create appropriate rule loader based on configuration
   * @param config - MinimalGoRulesConfig with ruleSource specification
   * @returns IRuleLoaderService implementation
   */
  createLoader(config: MinimalGoRulesConfig): IRuleLoaderService;
}

/**
 * Rule Loader Factory implementation
 * Creates appropriate loader based on ruleSource configuration
 */
export class RuleLoaderFactory implements IRuleLoaderFactory {
  /**
   * Create rule loader based on configuration
   * @param config - Configuration object with ruleSource flag
   * @returns Appropriate rule loader service
   * @throws MinimalGoRulesError if invalid ruleSource or missing required config
   */
  createLoader(config: MinimalGoRulesConfig): IRuleLoaderService {
    // Default to 'cloud' for backward compatibility
    const ruleSource = config.ruleSource || 'cloud';

    switch (ruleSource) {
      case 'cloud':
        this.validateCloudConfig(config);
        return new CloudRuleLoaderService(config);

      case 'local':
        this.validateLocalConfig(config);
        return new LocalRuleLoaderService(config);

      default:
        throw MinimalGoRulesError.configError(
          `Invalid rule source: ${ruleSource}. Must be 'cloud' or 'local'`
        );
    }
  }

  /**
   * Validate cloud configuration requirements
   * @param config - Configuration to validate
   * @throws MinimalGoRulesError if required cloud config is missing
   */
  private validateCloudConfig(config: MinimalGoRulesConfig): void {
    const missingFields: string[] = [];

    if (!config.apiUrl) {
      missingFields.push('apiUrl');
    }
    if (!config.apiKey) {
      missingFields.push('apiKey');
    }
    if (!config.projectId) {
      missingFields.push('projectId');
    }

    if (missingFields.length > 0) {
      throw MinimalGoRulesError.configError(
        `Missing required cloud configuration: ${missingFields.join(', ')}`
      );
    }
  }

  /**
   * Validate local configuration requirements
   * @param config - Configuration to validate
   * @throws MinimalGoRulesError if required local config is missing
   */
  private validateLocalConfig(config: MinimalGoRulesConfig): void {
    if (!config.localRulesPath) {
      throw MinimalGoRulesError.configError(
        'localRulesPath is required when ruleSource is "local"'
      );
    }
  }
}
