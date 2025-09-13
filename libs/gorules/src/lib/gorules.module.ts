import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { 
  GoRulesConfig, 
  GoRulesAsyncOptions, 
  GoRulesOptionsFactory
} from './config/gorules-config.interface.js';
import { GoRulesConfigService } from './config/gorules.config.js';
import { 
  GoRulesConfigFactory, 
  GoRulesAsyncConfigFactory, 
  GoRulesEnvironmentConfigFactory 
} from './config/gorules-config.factory.js';
import { GoRulesService } from './services/gorules.service.js';
import { GoRulesZenService } from './services/gorules-zen.service.js';
import { GoRulesHttpService } from './services/gorules-http.service.js';
import { GoRulesResilienceService } from './services/gorules-resilience.service.js';
import { GoRulesLoggerService } from './logging/gorules-logger.service.js';
import { GoRulesMetricsService } from './monitoring/gorules-metrics.service.js';
import { GoRulesMonitoringService } from './monitoring/gorules-monitoring.service.js';

/**
 * Token for GoRules configuration
 */
export const GORULES_CONFIG_TOKEN = 'GORULES_CONFIG';

/**
 * Token for GoRules options
 */
export const GORULES_OPTIONS_TOKEN = 'GORULES_OPTIONS';

/**
 * Core GoRules module providing all services and configuration
 */
@Global()
@Module({})
export class GoRulesModule {
  /**
   * Configure GoRules module with synchronous configuration
   * @param config - GoRules configuration object
   * @returns Dynamic module with all providers configured
   */
  static forRoot(config: GoRulesConfig): DynamicModule {
    const configProvider: Provider = {
      provide: GORULES_CONFIG_TOKEN,
      useValue: config,
    };

    const configServiceProvider: Provider = {
      provide: GoRulesConfigService,
      useFactory: (goRulesConfig: GoRulesConfig) => {
        return new GoRulesConfigService(goRulesConfig);
      },
      inject: [GORULES_CONFIG_TOKEN],
    };

    const loggerServiceProvider: Provider = {
      provide: GoRulesLoggerService,
      useFactory: (goRulesConfig: GoRulesConfig) => {
        return new GoRulesLoggerService(goRulesConfig);
      },
      inject: [GORULES_CONFIG_TOKEN],
    };

    const monitoringServiceProvider: Provider = {
      provide: GoRulesMonitoringService,
      useFactory: (
        goRulesConfig: GoRulesConfig,
        loggerService: GoRulesLoggerService,
        metricsService: GoRulesMetricsService
      ) => {
        return new GoRulesMonitoringService(goRulesConfig, loggerService, metricsService);
      },
      inject: [GORULES_CONFIG_TOKEN, GoRulesLoggerService, GoRulesMetricsService],
    };

    const goRulesServiceProvider: Provider = {
      provide: GoRulesService,
      useFactory: (
        configService: GoRulesConfigService,
        resilienceService: GoRulesResilienceService,
        loggerService: GoRulesLoggerService,
        metricsService: GoRulesMetricsService,
        monitoringService: GoRulesMonitoringService
      ) => {
        return new GoRulesService(
          configService,
          resilienceService,
          loggerService,
          metricsService,
          monitoringService
        );
      },
      inject: [
        GoRulesConfigService,
        GoRulesResilienceService,
        GoRulesLoggerService,
        GoRulesMetricsService,
        GoRulesMonitoringService,
      ],
    };

    const goRulesZenServiceProvider: Provider = {
      provide: GoRulesZenService,
      useFactory: (configService: GoRulesConfigService) => {
        return new GoRulesZenService(configService);
      },
      inject: [GoRulesConfigService],
    };

    return {
      module: GoRulesModule,
      imports: [ConfigModule],
      providers: [
        configProvider,
        configServiceProvider,
        loggerServiceProvider,
        GoRulesMetricsService,
        monitoringServiceProvider,
        GoRulesResilienceService,
        GoRulesHttpService,
        goRulesZenServiceProvider,
        goRulesServiceProvider,
        // Configuration factories (available for injection if needed)
        GoRulesConfigFactory,
        GoRulesAsyncConfigFactory,
        GoRulesEnvironmentConfigFactory,
      ],
      exports: [
        GoRulesConfigService,
        GoRulesService,
        GoRulesZenService,
        GoRulesHttpService,
        GoRulesResilienceService,
        GoRulesLoggerService,
        GoRulesMetricsService,
        GoRulesMonitoringService,
        // Export factories for advanced use cases
        GoRulesConfigFactory,
        GoRulesAsyncConfigFactory,
        GoRulesEnvironmentConfigFactory,
      ],
    };
  }

  /**
   * Configure GoRules module with asynchronous configuration
   * @param options - Async configuration options
   * @returns Dynamic module with all providers configured
   */
  static forRootAsync(options: GoRulesAsyncOptions): DynamicModule {
    const asyncProviders = this.createAsyncProviders(options);

    const configServiceProvider: Provider = {
      provide: GoRulesConfigService,
      useFactory: (goRulesConfig: GoRulesConfig) => {
        return new GoRulesConfigService(goRulesConfig);
      },
      inject: [GORULES_CONFIG_TOKEN],
    };

    const loggerServiceProvider: Provider = {
      provide: GoRulesLoggerService,
      useFactory: (goRulesConfig: GoRulesConfig) => {
        return new GoRulesLoggerService(goRulesConfig);
      },
      inject: [GORULES_CONFIG_TOKEN],
    };

    const monitoringServiceProvider: Provider = {
      provide: GoRulesMonitoringService,
      useFactory: (
        goRulesConfig: GoRulesConfig,
        loggerService: GoRulesLoggerService,
        metricsService: GoRulesMetricsService
      ) => {
        return new GoRulesMonitoringService(goRulesConfig, loggerService, metricsService);
      },
      inject: [GORULES_CONFIG_TOKEN, GoRulesLoggerService, GoRulesMetricsService],
    };

    const goRulesServiceProvider: Provider = {
      provide: GoRulesService,
      useFactory: (
        configService: GoRulesConfigService,
        resilienceService: GoRulesResilienceService,
        loggerService: GoRulesLoggerService,
        metricsService: GoRulesMetricsService,
        monitoringService: GoRulesMonitoringService
      ) => {
        return new GoRulesService(
          configService,
          resilienceService,
          loggerService,
          metricsService,
          monitoringService
        );
      },
      inject: [
        GoRulesConfigService,
        GoRulesResilienceService,
        GoRulesLoggerService,
        GoRulesMetricsService,
        GoRulesMonitoringService,
      ],
    };

    const goRulesZenServiceProvider: Provider = {
      provide: GoRulesZenService,
      useFactory: (configService: GoRulesConfigService) => {
        return new GoRulesZenService(configService);
      },
      inject: [GoRulesConfigService],
    };

    return {
      module: GoRulesModule,
      imports: [ConfigModule, ...(options.imports || [])],
      providers: [
        ...asyncProviders,
        configServiceProvider,
        loggerServiceProvider,
        GoRulesMetricsService,
        monitoringServiceProvider,
        GoRulesResilienceService,
        GoRulesHttpService,
        goRulesZenServiceProvider,
        goRulesServiceProvider,
        // Configuration factories
        GoRulesConfigFactory,
        GoRulesAsyncConfigFactory,
        GoRulesEnvironmentConfigFactory,
      ],
      exports: [
        GoRulesConfigService,
        GoRulesService,
        GoRulesZenService,
        GoRulesHttpService,
        GoRulesResilienceService,
        GoRulesLoggerService,
        GoRulesMetricsService,
        GoRulesMonitoringService,
        // Export factories for advanced use cases
        GoRulesConfigFactory,
        GoRulesAsyncConfigFactory,
        GoRulesEnvironmentConfigFactory,
      ],
    };
  }

  /**
   * Configure GoRules module using environment variables
   * @returns Dynamic module configured from environment
   */
  static forEnvironment(): DynamicModule {
    return this.forRootAsync({
      useFactory: (configService: ConfigService) => {
        const factory = new GoRulesEnvironmentConfigFactory(configService);
        return factory.createGoRulesOptions();
      },
      inject: [ConfigService],
    });
  }

  /**
   * Configure GoRules module using ConfigService
   * @returns Dynamic module configured from ConfigService
   */
  static forConfigService(): DynamicModule {
    return this.forRootAsync({
      useFactory: (configService: ConfigService) => {
        const factory = new GoRulesConfigFactory(configService);
        return factory.createGoRulesOptions();
      },
      inject: [ConfigService],
    });
  }

  /**
   * Configure GoRules module with async factory using ConfigService
   * @returns Dynamic module with async configuration
   */
  static forAsyncConfigService(): DynamicModule {
    return this.forRootAsync({
      useFactory: async (configService: ConfigService) => {
        const factory = new GoRulesAsyncConfigFactory(configService);
        return await factory.createGoRulesOptions();
      },
      inject: [ConfigService],
    });
  }

  /**
   * Create providers for async configuration
   */
  private static createAsyncProviders(options: GoRulesAsyncOptions): Provider[] {
    if (options.useFactory) {
      return [
        {
          provide: GORULES_CONFIG_TOKEN,
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
      ];
    }

    if (options.useClass) {
      return [
        {
          provide: GORULES_OPTIONS_TOKEN,
          useClass: options.useClass,
        },
        {
          provide: GORULES_CONFIG_TOKEN,
          useFactory: async (optionsFactory: GoRulesOptionsFactory) => {
            return await optionsFactory.createGoRulesOptions();
          },
          inject: [GORULES_OPTIONS_TOKEN],
        },
      ];
    }

    if (options.useExisting) {
      return [
        {
          provide: GORULES_CONFIG_TOKEN,
          useFactory: async (optionsFactory: GoRulesOptionsFactory) => {
            return await optionsFactory.createGoRulesOptions();
          },
          inject: [options.useExisting],
        },
      ];
    }

    throw new Error('Invalid GoRules async configuration options');
  }
}

/**
 * Feature module for GoRules (non-global version)
 * Use this when you want to import GoRules in specific modules only
 */
@Module({})
export class GoRulesFeatureModule {
  /**
   * Configure GoRules feature module with synchronous configuration
   */
  static forFeature(config: GoRulesConfig): DynamicModule {
    const module = GoRulesModule.forRoot(config);
    
    // Remove @Global decorator behavior by creating a new module
    return {
      module: GoRulesFeatureModule,
      imports: module.imports,
      providers: module.providers,
      exports: module.exports,
    };
  }

  /**
   * Configure GoRules feature module with asynchronous configuration
   */
  static forFeatureAsync(options: GoRulesAsyncOptions): DynamicModule {
    const module = GoRulesModule.forRootAsync(options);
    
    // Remove @Global decorator behavior by creating a new module
    return {
      module: GoRulesFeatureModule,
      imports: module.imports,
      providers: module.providers,
      exports: module.exports,
    };
  }
}

/**
 * Utility module for testing GoRules functionality
 * Provides mock implementations for testing
 */
@Module({})
export class GoRulesTestingModule {
  /**
   * Create a testing module with mock implementations
   */
  static forTesting(config?: Partial<GoRulesConfig>): DynamicModule {
    const testConfig: GoRulesConfig = {
      apiUrl: 'https://test.gorules.io',
      apiKey: 'test-api-key',
      projectId: 'test-project-id',
      timeout: 5000,
      retryAttempts: 1,
      enableLogging: false,
      ...config,
    };

    return GoRulesModule.forRoot(testConfig);
  }

  /**
   * Create a testing module with minimal configuration
   */
  static forMinimalTesting(): DynamicModule {
    return this.forTesting({
      timeout: 1000,
      retryAttempts: 0,
      enableLogging: false,
    });
  }
}