import { ModuleMetadata, Type } from '@nestjs/common';
import { Rule } from '../core/types';

/**
 * Options for configuring the RuleEngineModule
 */
export interface RuleEngineModuleOptions<T = any> {
  /**
   * Initial rules to register with the engine
   */
  rules?: Rule<T>[];

  /**
   * Whether the module should be global
   * @default false
   */
  isGlobal?: boolean;
}

/**
 * Factory for creating RuleEngineModuleOptions
 */
export interface RuleEngineModuleOptionsFactory<T = any> {
  createRuleEngineOptions():
    | Promise<RuleEngineModuleOptions<T>>
    | RuleEngineModuleOptions<T>;
}

/**
 * Async options for configuring the RuleEngineModule
 */
export interface RuleEngineModuleAsyncOptions<T = any>
  extends Pick<ModuleMetadata, 'imports'> {
  /**
   * Whether the module should be global
   * @default false
   */
  isGlobal?: boolean;

  /**
   * Factory function to create options
   */
  useFactory?: (
    ...args: any[]
  ) => Promise<RuleEngineModuleOptions<T>> | RuleEngineModuleOptions<T>;

  /**
   * Dependencies to inject into the factory function
   */
  inject?: any[];

  /**
   * Class to use as options factory
   */
  useClass?: Type<RuleEngineModuleOptionsFactory<T>>;

  /**
   * Existing instance to use as options factory
   */
  useExisting?: Type<RuleEngineModuleOptionsFactory<T>>;
}
