/**
 * NestJS module interfaces and types
 */

import { ModuleMetadata, Type } from '@nestjs/common';
import { MinimalGoRulesConfig } from '../interfaces/config.js';

/**
 * Dependency injection tokens
 */
export const MINIMAL_GORULES_CONFIG_TOKEN = 'MINIMAL_GORULES_CONFIG';
export const MINIMAL_GORULES_ENGINE_TOKEN = 'MINIMAL_GORULES_ENGINE';

/**
 * Options for synchronous module registration
 */
export interface MinimalGoRulesModuleOptions {
  config: MinimalGoRulesConfig;
  autoInitialize?: boolean; // default: true
}

/**
 * Factory interface for creating configuration
 */
export interface MinimalGoRulesOptionsFactory {
  createMinimalGoRulesOptions(): Promise<MinimalGoRulesConfig> | MinimalGoRulesConfig;
}

/**
 * Options for asynchronous module registration
 */
export interface MinimalGoRulesModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  /**
   * Factory function to create configuration
   */
  useFactory?: (...args: any[]) => Promise<MinimalGoRulesConfig> | MinimalGoRulesConfig;

  /**
   * Dependencies to inject into the factory function
   */
  inject?: any[];

  /**
   * Class that implements MinimalGoRulesOptionsFactory
   */
  useClass?: Type<MinimalGoRulesOptionsFactory>;

  /**
   * Existing provider that implements MinimalGoRulesOptionsFactory
   */
  useExisting?: Type<MinimalGoRulesOptionsFactory>;

  /**
   * Whether to automatically initialize the engine on module init
   */
  autoInitialize?: boolean; // default: true
}

/**
 * Service initialization status
 */
export interface ServiceInitializationStatus {
  initialized: boolean;
  initializationTime?: number;
  error?: string;
  rulesLoaded?: number;
}
