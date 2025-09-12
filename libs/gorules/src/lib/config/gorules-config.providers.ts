import { Injectable, Logger } from '@nestjs/common';
import { readFile, writeFile, access } from 'fs/promises';
import { watch, FSWatcher } from 'fs';
import {
  GoRulesConfig,
  GoRulesConfigProvider,
  GoRulesConfigWatcher,
  GoRulesConfigChangeEvent,
} from './gorules-config.interface.js';

/**
 * File-based configuration provider
 */
@Injectable()
export class GoRulesFileConfigProvider implements GoRulesConfigProvider {
  private readonly logger = new Logger(GoRulesFileConfigProvider.name);

  constructor(private readonly filePath: string) {}

  /**
   * Load configuration from file
   */
  async load(): Promise<GoRulesConfig> {
    try {
      this.logger.debug(`Loading configuration from file: ${this.filePath}`);
      const content = await readFile(this.filePath, 'utf-8');
      const config = JSON.parse(content) as GoRulesConfig;
      this.logger.debug('Configuration loaded successfully from file');
      return config;
    } catch (error) {
      this.logger.error(`Failed to load configuration from file: ${this.filePath}`, error);
      throw new Error(`Failed to load configuration: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Save configuration to file
   */
  async save(config: GoRulesConfig): Promise<void> {
    try {
      this.logger.debug(`Saving configuration to file: ${this.filePath}`);
      const content = JSON.stringify(config, null, 2);
      await writeFile(this.filePath, content, 'utf-8');
      this.logger.debug('Configuration saved successfully to file');
    } catch (error) {
      this.logger.error(`Failed to save configuration to file: ${this.filePath}`, error);
      throw new Error(`Failed to save configuration: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Check if configuration file exists
   */
  async exists(): Promise<boolean> {
    try {
      await access(this.filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Watch for configuration file changes
   */
  watch(): GoRulesConfigWatcher {
    return new GoRulesFileConfigWatcher(this.filePath, this);
  }
}

/**
 * Environment variable configuration provider
 */
@Injectable()
export class GoRulesEnvConfigProvider implements GoRulesConfigProvider {
  private readonly logger = new Logger(GoRulesEnvConfigProvider.name);

  constructor(private readonly envPrefix = 'GORULES_') {}

  /**
   * Load configuration from environment variables
   */
  async load(): Promise<GoRulesConfig> {
    this.logger.debug('Loading configuration from environment variables');

    const config: GoRulesConfig = {
      apiUrl: this.getEnvValue('API_URL', 'https://triveni.gorules.io'),
      apiKey: this.getRequiredEnvValue('API_KEY'),
      projectId: this.getRequiredEnvValue('PROJECT_ID'),
      timeout: this.getEnvNumberValue('TIMEOUT'),
      retryAttempts: this.getEnvNumberValue('RETRY_ATTEMPTS'),
      enableLogging: this.getEnvBooleanValue('ENABLE_LOGGING'),
    };

    this.logger.debug('Configuration loaded successfully from environment variables');
    return config;
  }

  /**
   * Save configuration (not supported for environment variables)
   */
  async save(): Promise<void> {
    throw new Error('Saving configuration to environment variables is not supported');
  }

  /**
   * Check if required environment variables exist
   */
  async exists(): Promise<boolean> {
    const requiredVars = ['API_KEY', 'PROJECT_ID'];
    return requiredVars.every(varName => 
      process.env[`${this.envPrefix}${varName}`] !== undefined
    );
  }

  /**
   * Get environment variable value
   */
  private getEnvValue(key: string, defaultValue?: string): string {
    const value = process.env[`${this.envPrefix}${key}`];
    if (value === undefined && defaultValue === undefined) {
      throw new Error(`Environment variable ${this.envPrefix}${key} is required`);
    }
    return value || defaultValue!;
  }

  /**
   * Get required environment variable value
   */
  private getRequiredEnvValue(key: string): string {
    const value = process.env[`${this.envPrefix}${key}`];
    if (!value) {
      throw new Error(`Environment variable ${this.envPrefix}${key} is required`);
    }
    return value;
  }

  /**
   * Get environment variable as number
   */
  private getEnvNumberValue(key: string): number | undefined {
    const value = process.env[`${this.envPrefix}${key}`];
    if (value === undefined) {
      return undefined;
    }
    const numValue = parseInt(value, 10);
    if (isNaN(numValue)) {
      throw new Error(`Environment variable ${this.envPrefix}${key} must be a valid number`);
    }
    return numValue;
  }

  /**
   * Get environment variable as boolean
   */
  private getEnvBooleanValue(key: string): boolean | undefined {
    const value = process.env[`${this.envPrefix}${key}`];
    if (value === undefined) {
      return undefined;
    }
    return value.toLowerCase() === 'true';
  }
}

/**
 * Memory-based configuration provider (useful for testing)
 */
@Injectable()
export class GoRulesMemoryConfigProvider implements GoRulesConfigProvider {
  private readonly logger = new Logger(GoRulesMemoryConfigProvider.name);
  private config?: GoRulesConfig;

  constructor(initialConfig?: GoRulesConfig) {
    this.config = initialConfig;
  }

  /**
   * Load configuration from memory
   */
  async load(): Promise<GoRulesConfig> {
    if (!this.config) {
      throw new Error('No configuration stored in memory');
    }
    this.logger.debug('Configuration loaded from memory');
    return { ...this.config };
  }

  /**
   * Save configuration to memory
   */
  async save(config: GoRulesConfig): Promise<void> {
    this.config = { ...config };
    this.logger.debug('Configuration saved to memory');
  }

  /**
   * Check if configuration exists in memory
   */
  async exists(): Promise<boolean> {
    return this.config !== undefined;
  }
}

/**
 * Composite configuration provider that tries multiple providers in order
 */
@Injectable()
export class GoRulesCompositeConfigProvider implements GoRulesConfigProvider {
  private readonly logger = new Logger(GoRulesCompositeConfigProvider.name);

  constructor(private readonly providers: GoRulesConfigProvider[]) {}

  /**
   * Load configuration from the first available provider
   */
  async load(): Promise<GoRulesConfig> {
    for (const provider of this.providers) {
      try {
        if (await provider.exists()) {
          this.logger.debug(`Loading configuration from provider: ${provider.constructor.name}`);
          return await provider.load();
        }
      } catch (error) {
        this.logger.warn(`Failed to load from provider ${provider.constructor.name}:`, error);
      }
    }
    throw new Error('No configuration provider was able to load configuration');
  }

  /**
   * Save configuration to the first available provider
   */
  async save(config: GoRulesConfig): Promise<void> {
    for (const provider of this.providers) {
      try {
        await provider.save(config);
        this.logger.debug(`Configuration saved using provider: ${provider.constructor.name}`);
        return;
      } catch (error) {
        this.logger.warn(`Failed to save using provider ${provider.constructor.name}:`, error);
      }
    }
    throw new Error('No configuration provider was able to save configuration');
  }

  /**
   * Check if any provider has configuration
   */
  async exists(): Promise<boolean> {
    for (const provider of this.providers) {
      try {
        if (await provider.exists()) {
          return true;
        }
      } catch {
        // Continue to next provider
      }
    }
    return false;
  }
}

/**
 * File configuration watcher
 */
class GoRulesFileConfigWatcher implements GoRulesConfigWatcher {
  private readonly logger = new Logger(GoRulesFileConfigWatcher.name);
  private watcher?: FSWatcher;
  private callbacks: Array<(event: GoRulesConfigChangeEvent) => void> = [];
  private lastConfig?: GoRulesConfig;

  constructor(
    private readonly filePath: string,
    private readonly provider: GoRulesFileConfigProvider
  ) {}

  /**
   * Start watching for file changes
   */
  start(): void {
    if (this.watcher) {
      return;
    }

    this.logger.debug(`Starting file watcher for: ${this.filePath}`);
    
    this.watcher = watch(this.filePath, async (eventType) => {
      if (eventType === 'change') {
        await this.handleFileChange();
      }
    });

    // Load initial configuration
    this.loadInitialConfig();
  }

  /**
   * Stop watching for file changes
   */
  stop(): void {
    if (this.watcher) {
      this.logger.debug(`Stopping file watcher for: ${this.filePath}`);
      this.watcher.close();
      this.watcher = undefined;
    }
  }

  /**
   * Subscribe to configuration changes
   */
  onChange(callback: (event: GoRulesConfigChangeEvent) => void): void {
    this.callbacks.push(callback);
  }

  /**
   * Unsubscribe from configuration changes
   */
  offChange(callback: (event: GoRulesConfigChangeEvent) => void): void {
    const index = this.callbacks.indexOf(callback);
    if (index > -1) {
      this.callbacks.splice(index, 1);
    }
  }

  /**
   * Load initial configuration
   */
  private async loadInitialConfig(): Promise<void> {
    try {
      this.lastConfig = await this.provider.load();
    } catch (error) {
      this.logger.warn('Failed to load initial configuration:', error);
    }
  }

  /**
   * Handle file change event
   */
  private async handleFileChange(): Promise<void> {
    try {
      const newConfig = await this.provider.load();
      
      if (this.lastConfig) {
        const changedKeys = this.getChangedKeys(this.lastConfig, newConfig);
        
        if (changedKeys.length > 0) {
          const event: GoRulesConfigChangeEvent = {
            previous: this.lastConfig,
            current: newConfig,
            changedKeys,
            timestamp: new Date(),
          };

          this.callbacks.forEach(callback => {
            try {
              callback(event);
            } catch (error) {
              this.logger.error('Error in configuration change callback:', error);
            }
          });
        }
      }

      this.lastConfig = newConfig;
    } catch (error) {
      this.logger.error('Failed to handle file change:', error);
    }
  }

  /**
   * Get changed keys between two configurations
   */
  private getChangedKeys(oldConfig: GoRulesConfig, newConfig: GoRulesConfig): string[] {
    const changedKeys: string[] = [];
    const allKeys = new Set([...Object.keys(oldConfig), ...Object.keys(newConfig)]);

    for (const key of allKeys) {
      const oldValue = (oldConfig as unknown as Record<string, unknown>)[key];
      const newValue = (newConfig as unknown as Record<string, unknown>)[key];
      
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changedKeys.push(key);
      }
    }

    return changedKeys;
  }
}