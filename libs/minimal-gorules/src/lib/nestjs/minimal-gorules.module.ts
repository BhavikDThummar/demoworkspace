/**
 * NestJS Module for Minimal GoRules Engine
 * Provides dependency injection and configuration for NestJS applications
 */

import { Module, DynamicModule, Provider, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MinimalGoRulesEngine } from '../minimal-gorules-engine.js';
import { MinimalGoRulesConfig } from '../interfaces/config.js';
import {
  MINIMAL_GORULES_CONFIG_TOKEN,
  MINIMAL_GORULES_ENGINE_TOKEN,
  MinimalGoRulesModuleOptions,
  MinimalGoRulesModuleAsyncOptions,
  MinimalGoRulesOptionsFactory,
} from './interfaces.js';
import { MinimalGoRulesService } from './minimal-gorules.service.js';

/**
 * Global NestJS module for Minimal GoRules Engine
 * Provides singleton instance of the engine across the application
 */
@Global()
@Module({})
export class MinimalGoRulesModule {
  /**
   * Register module synchronously with direct configuration
   */
  static forRoot(options: MinimalGoRulesModuleOptions): DynamicModule {
    const configProvider: Provider = {
      provide: MINIMAL_GORULES_CONFIG_TOKEN,
      useValue: options.config,
    };

    const engineProvider: Provider = {
      provide: MINIMAL_GORULES_ENGINE_TOKEN,
      useFactory: (config: MinimalGoRulesConfig) => {
        return new MinimalGoRulesEngine(config);
      },
      inject: [MINIMAL_GORULES_CONFIG_TOKEN],
    };

    const serviceProvider: Provider = {
      provide: MinimalGoRulesService,
      useFactory: (engine: MinimalGoRulesEngine) => {
        return new MinimalGoRulesService(engine, options.autoInitialize !== false);
      },
      inject: [MINIMAL_GORULES_ENGINE_TOKEN],
    };

    return {
      module: MinimalGoRulesModule,
      providers: [configProvider, engineProvider, serviceProvider],
      exports: [MinimalGoRulesService, MINIMAL_GORULES_ENGINE_TOKEN, MINIMAL_GORULES_CONFIG_TOKEN],
    };
  }

  /**
   * Register module asynchronously with factory or existing provider
   */
  static forRootAsync(options: MinimalGoRulesModuleAsyncOptions): DynamicModule {
    const providers: Provider[] = [];
    // Create config provider based on options
    if (options.useFactory) {
      providers.push({
        provide: MINIMAL_GORULES_CONFIG_TOKEN,
        useFactory: options.useFactory,
        inject: options.inject || [],
      });
    } else if (options.useClass) {
      providers.push({
        provide: MINIMAL_GORULES_CONFIG_TOKEN,
        useFactory: async (optionsFactory: MinimalGoRulesOptionsFactory) => {
          return optionsFactory.createMinimalGoRulesOptions();
        },
        inject: [options.useClass],
      });
      providers.push({
        provide: options.useClass,
        useClass: options.useClass,
      });
    } else if (options.useExisting) {
      providers.push({
        provide: MINIMAL_GORULES_CONFIG_TOKEN,
        useFactory: async (optionsFactory: MinimalGoRulesOptionsFactory) => {
          return optionsFactory.createMinimalGoRulesOptions();
        },
        inject: [options.useExisting],
      });
    }

    // Create engine provider
    const engineProvider: Provider = {
      provide: MINIMAL_GORULES_ENGINE_TOKEN,
      useFactory: (config: MinimalGoRulesConfig) => {
        return new MinimalGoRulesEngine(config);
      },
      inject: [MINIMAL_GORULES_CONFIG_TOKEN],
    };

    // Create service provider
    const serviceProvider: Provider = {
      provide: MinimalGoRulesService,
      useFactory: (engine: MinimalGoRulesEngine) => {
        return new MinimalGoRulesService(engine, options.autoInitialize !== false);
      },
      inject: [MINIMAL_GORULES_ENGINE_TOKEN],
    };

    providers.push(engineProvider, serviceProvider);

    return {
      module: MinimalGoRulesModule,
      imports: options.imports || [],
      providers,
      exports: [MinimalGoRulesService, MINIMAL_GORULES_ENGINE_TOKEN, MINIMAL_GORULES_CONFIG_TOKEN],
    };
  }

  /**
   * Register module with environment-based configuration using ConfigService
   */
  static forRootWithConfig(options?: {
    autoInitialize?: boolean;
    configKey?: string;
  }): DynamicModule {
    const configKey = options?.configKey || 'minimalGoRules';

    return this.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService): MinimalGoRulesConfig => {
        const config = configService.get(configKey);

        // Support both nested config object and flat environment variables
        // If nested config doesn't exist, try to build from environment variables
        const apiUrl = config?.apiUrl || configService.get('GORULES_API_URL');
        const apiKey = config?.apiKey || configService.get('GORULES_API_KEY');
        const projectId = config?.projectId || configService.get('GORULES_PROJECT_ID');

        if (!apiUrl || !apiKey || !projectId) {
          throw new Error(
            `Missing required configuration. Either provide a '${configKey}' config object or set environment variables: ` +
              'GORULES_API_URL, GORULES_API_KEY, GORULES_PROJECT_ID',
          );
        }

        return {
          apiUrl,
          apiKey,
          projectId,
          cacheMaxSize: config?.cacheMaxSize || +configService.get('GORULES_CACHE_MAX_SIZE', 1000),
          httpTimeout: config?.httpTimeout || +configService.get('GORULES_TIMEOUT', 5000),
          batchSize: config?.batchSize || +configService.get('GORULES_BATCH_SIZE', 50),
          platform: 'node',
        };
      },
      inject: [ConfigService],
      autoInitialize: options?.autoInitialize,
    });
  }
}
