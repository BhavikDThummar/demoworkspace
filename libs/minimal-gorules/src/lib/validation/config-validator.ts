/**
 * Configuration validator for hybrid rule loading
 */

import { MinimalGoRulesConfig, ConfigValidationResult } from '../interfaces/config.js';
import { existsSync, statSync } from 'fs';
import { resolve } from 'path';

/**
 * Validates MinimalGoRulesConfig for hybrid rule loading
 */
export class ConfigValidator {
  /**
   * Validates hybrid configuration with comprehensive error checking
   */
  static validateHybridConfig(config: MinimalGoRulesConfig): ConfigValidationResult {
    const errors: string[] = [];

    // Validate rule source
    const ruleSource = config.ruleSource || 'cloud';
    if (!['cloud', 'local'].includes(ruleSource)) {
      errors.push(`Invalid ruleSource: ${ruleSource}. Must be 'cloud' or 'local'`);
      return { isValid: false, errors };
    }

    // Validate cloud-specific configuration
    if (ruleSource === 'cloud') {
      this.validateCloudConfig(config, errors);
    }

    // Validate local-specific configuration
    if (ruleSource === 'local') {
      this.validateLocalConfig(config, errors);
    }

    // Validate common configuration
    this.validateCommonConfig(config, errors);

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates cloud-specific configuration
   */
  private static validateCloudConfig(config: MinimalGoRulesConfig, errors: string[]): void {
    if (!config.apiUrl) {
      errors.push('apiUrl is required when ruleSource is "cloud"');
    } else if (!this.isValidUrl(config.apiUrl)) {
      errors.push('apiUrl must be a valid URL');
    }

    if (!config.apiKey) {
      errors.push('apiKey is required when ruleSource is "cloud"');
    } else if (typeof config.apiKey !== 'string' || config.apiKey.trim().length === 0) {
      errors.push('apiKey must be a non-empty string');
    }

    if (!config.projectId) {
      errors.push('projectId is required when ruleSource is "cloud"');
    } else if (typeof config.projectId !== 'string' || config.projectId.trim().length === 0) {
      errors.push('projectId must be a non-empty string');
    }
  }

  /**
   * Validates local-specific configuration
   */
  private static validateLocalConfig(config: MinimalGoRulesConfig, errors: string[]): void {
    if (!config.localRulesPath) {
      errors.push('localRulesPath is required when ruleSource is "local"');
      return;
    }

    if (typeof config.localRulesPath !== 'string' || config.localRulesPath.trim().length === 0) {
      errors.push('localRulesPath must be a non-empty string');
      return;
    }

    // Validate path exists and is accessible
    try {
      const resolvedPath = resolve(config.localRulesPath);
      if (!existsSync(resolvedPath)) {
        errors.push(`localRulesPath does not exist: ${config.localRulesPath}`);
      } else {
        const stats = statSync(resolvedPath);
        if (!stats.isDirectory()) {
          errors.push(`localRulesPath must be a directory: ${config.localRulesPath}`);
        }
      }
    } catch (error) {
      errors.push(
        `Cannot access localRulesPath: ${config.localRulesPath}. ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }

    // Validate metadata file pattern
    if (config.metadataFilePattern !== undefined) {
      if (typeof config.metadataFilePattern !== 'string') {
        errors.push('metadataFilePattern must be a string');
      } else if (config.metadataFilePattern.trim().length === 0) {
        errors.push('metadataFilePattern cannot be empty');
      }
    }

    // Validate hot reload setting
    if (config.enableHotReload !== undefined && typeof config.enableHotReload !== 'boolean') {
      errors.push('enableHotReload must be a boolean');
    }

    // Validate file system options
    if (config.fileSystemOptions) {
      this.validateFileSystemOptions(config.fileSystemOptions, errors);
    }
  }

  /**
   * Validates common configuration options
   */
  private static validateCommonConfig(config: MinimalGoRulesConfig, errors: string[]): void {
    // Validate cache size
    if (config.cacheMaxSize !== undefined) {
      if (!Number.isInteger(config.cacheMaxSize) || config.cacheMaxSize <= 0) {
        errors.push('cacheMaxSize must be a positive integer');
      }
    }

    // Validate HTTP timeout
    if (config.httpTimeout !== undefined) {
      if (!Number.isInteger(config.httpTimeout) || config.httpTimeout <= 0) {
        errors.push('httpTimeout must be a positive integer');
      }
    }

    // Validate batch size
    if (config.batchSize !== undefined) {
      if (!Number.isInteger(config.batchSize) || config.batchSize <= 0) {
        errors.push('batchSize must be a positive integer');
      }
    }

    // Validate platform
    if (config.platform !== undefined && !['node', 'browser'].includes(config.platform)) {
      errors.push('platform must be "node" or "browser"');
    }

    // Validate performance thresholds
    if (config.memoryWarningThreshold !== undefined) {
      if (
        typeof config.memoryWarningThreshold !== 'number' ||
        config.memoryWarningThreshold <= 0 ||
        config.memoryWarningThreshold >= 1
      ) {
        errors.push('memoryWarningThreshold must be a number between 0 and 1');
      }
    }

    if (config.memoryCriticalThreshold !== undefined) {
      if (
        typeof config.memoryCriticalThreshold !== 'number' ||
        config.memoryCriticalThreshold <= 0 ||
        config.memoryCriticalThreshold >= 1
      ) {
        errors.push('memoryCriticalThreshold must be a number between 0 and 1');
      }
    }

    // Validate memory thresholds relationship
    if (
      config.memoryWarningThreshold !== undefined &&
      config.memoryCriticalThreshold !== undefined &&
      config.memoryWarningThreshold >= config.memoryCriticalThreshold
    ) {
      errors.push('memoryWarningThreshold must be less than memoryCriticalThreshold');
    }
  }

  /**
   * Validates file system options
   */
  private static validateFileSystemOptions(options: any, errors: string[]): void {
    if (typeof options !== 'object' || options === null) {
      errors.push('fileSystemOptions must be an object');
      return;
    }

    if (options.recursive !== undefined && typeof options.recursive !== 'boolean') {
      errors.push('fileSystemOptions.recursive must be a boolean');
    }

    if (options.watchOptions !== undefined) {
      if (typeof options.watchOptions !== 'object' || options.watchOptions === null) {
        errors.push('fileSystemOptions.watchOptions must be an object');
      } else {
        const watchOptions = options.watchOptions;

        if (watchOptions.persistent !== undefined && typeof watchOptions.persistent !== 'boolean') {
          errors.push('fileSystemOptions.watchOptions.persistent must be a boolean');
        }

        if (
          watchOptions.ignoreInitial !== undefined &&
          typeof watchOptions.ignoreInitial !== 'boolean'
        ) {
          errors.push('fileSystemOptions.watchOptions.ignoreInitial must be a boolean');
        }
      }
    }
  }

  /**
   * Validates if a string is a valid URL
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
   * Creates a default configuration for cloud rule loading
   */
  static createDefaultCloudConfig(
    apiUrl: string,
    apiKey: string,
    projectId: string,
  ): MinimalGoRulesConfig {
    return {
      ruleSource: 'cloud',
      apiUrl,
      apiKey,
      projectId,
      cacheMaxSize: 1000,
      httpTimeout: 5000,
      batchSize: 50,
      platform: 'node',
      enablePerformanceOptimizations: false,
      enablePerformanceMetrics: false,
      memoryWarningThreshold: 0.7,
      memoryCriticalThreshold: 0.85,
      memoryCleanupInterval: 30000,
      enableConnectionPooling: false,
      enableRequestBatching: false,
      enableCompression: false,
      compressionAlgorithm: 'gzip',
    };
  }

  /**
   * Creates a default configuration for local rule loading
   */
  static createDefaultLocalConfig(localRulesPath: string): MinimalGoRulesConfig {
    return {
      ruleSource: 'local',
      localRulesPath,
      enableHotReload: false,
      metadataFilePattern: '.meta.json',
      fileSystemOptions: {
        recursive: true,
        watchOptions: {
          persistent: true,
          ignoreInitial: true,
        },
      },
      cacheMaxSize: 1000,
      batchSize: 50,
      platform: 'node',
      enablePerformanceOptimizations: false,
      enablePerformanceMetrics: false,
      memoryWarningThreshold: 0.7,
      memoryCriticalThreshold: 0.85,
      memoryCleanupInterval: 30000,
    };
  }
}
