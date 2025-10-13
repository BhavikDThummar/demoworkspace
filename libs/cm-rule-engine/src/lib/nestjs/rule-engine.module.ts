import { Module, DynamicModule, Provider } from '@nestjs/common';
import { RuleEngineService, RULE_ENGINE_OPTIONS } from './rule-engine.service';
import { BatchDataProvider } from '../core/batch-data-provider';
import { BatchDataRuleFactory } from './batch-data-rule';
import {
  RuleEngineModuleOptions,
  RuleEngineModuleAsyncOptions,
  RuleEngineModuleOptionsFactory,
} from './types';

/**
 * NestJS module for RuleEngine
 * Provides RuleEngineService with dependency injection support
 */
@Module({})
export class RuleEngineModule {
  /**
   * Configure the module with synchronous options
   * @param options Module configuration options
   * @returns Dynamic module configuration
   */
  static forRoot<T = any>(options?: RuleEngineModuleOptions<T>): DynamicModule {
    return {
      module: RuleEngineModule,
      global: options?.isGlobal ?? false,
      providers: [
        {
          provide: RULE_ENGINE_OPTIONS,
          useValue: {
            rules: options?.rules || [],
          },
        },
        RuleEngineService,
        BatchDataProvider,
        BatchDataRuleFactory,
      ],
      exports: [RuleEngineService, BatchDataProvider, BatchDataRuleFactory],
    };
  }

  /**
   * Configure the module with asynchronous options
   * Useful when rules need to be loaded from configuration service or database
   * @param options Async module configuration options
   * @returns Dynamic module configuration
   */
  static forRootAsync<T = any>(options: RuleEngineModuleAsyncOptions<T>): DynamicModule {
    return {
      module: RuleEngineModule,
      global: options.isGlobal ?? false,
      imports: options.imports || [],
      providers: [
        ...this.createAsyncProviders(options), 
        RuleEngineService,
        BatchDataProvider,
        BatchDataRuleFactory,
      ],
      exports: [RuleEngineService, BatchDataProvider, BatchDataRuleFactory],
    };
  }

  /**
   * Create providers for async configuration
   * @param options Async module configuration options
   * @returns Array of providers
   */
  private static createAsyncProviders<T = any>(
    options: RuleEngineModuleAsyncOptions<T>,
  ): Provider[] {
    if (options.useFactory) {
      return [
        {
          provide: RULE_ENGINE_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
      ];
    }

    if (options.useClass) {
      return [
        {
          provide: RULE_ENGINE_OPTIONS,
          useFactory: async (optionsFactory: RuleEngineModuleOptionsFactory<T>) =>
            optionsFactory.createRuleEngineOptions(),
          inject: [options.useClass],
        },
        {
          provide: options.useClass,
          useClass: options.useClass,
        },
      ];
    }

    if (options.useExisting) {
      return [
        {
          provide: RULE_ENGINE_OPTIONS,
          useFactory: async (optionsFactory: RuleEngineModuleOptionsFactory<T>) =>
            optionsFactory.createRuleEngineOptions(),
          inject: [options.useExisting],
        },
      ];
    }

    return [];
  }
}
