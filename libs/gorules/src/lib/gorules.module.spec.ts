import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GoRulesModule, GoRulesFeatureModule, GoRulesTestingModule } from './gorules.module.js';
import { GoRulesConfigService } from './config/gorules.config.js';
import { GoRulesService } from './services/gorules.service.js';
import { GoRulesZenService } from './services/gorules-zen.service.js';
import { GoRulesHttpService } from './services/gorules-http.service.js';
import { GoRulesResilienceService } from './services/gorules-resilience.service.js';
import { 
  GoRulesConfigFactory, 
  GoRulesAsyncConfigFactory, 
  GoRulesEnvironmentConfigFactory 
} from './config/gorules-config.factory.js';
import { GoRulesConfig, GoRulesOptionsFactory } from './config/gorules-config.interface.js';

// Mock the ZenEngine to avoid initialization issues in tests
jest.mock('@gorules/zen-engine', () => ({
  ZenEngine: jest.fn().mockImplementation(() => ({
    evaluate: jest.fn(),
    getDecision: jest.fn(),
    dispose: jest.fn(),
  })),
}));

describe('GoRulesModule', () => {
  const testConfig: GoRulesConfig = {
    apiUrl: 'https://test.gorules.io',
    apiKey: 'test-api-key',
    projectId: 'test-project-id',
    timeout: 30000,
    retryAttempts: 3,
    enableLogging: false,
  };

  describe('forRoot', () => {
    let module: TestingModule;

    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [GoRulesModule.forRoot(testConfig)],
      }).compile();
    });

    afterEach(async () => {
      await module.close();
    });

    it('should provide GoRulesConfigService', () => {
      const configService = module.get<GoRulesConfigService>(GoRulesConfigService);
      expect(configService).toBeDefined();
      expect(configService.getConfig()).toEqual(expect.objectContaining(testConfig));
    });

    it('should provide GoRulesService', () => {
      const service = module.get<GoRulesService>(GoRulesService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(GoRulesService);
    });

    it('should provide GoRulesZenService', () => {
      const service = module.get<GoRulesZenService>(GoRulesZenService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(GoRulesZenService);
    });

    it('should provide GoRulesHttpService', () => {
      const service = module.get<GoRulesHttpService>(GoRulesHttpService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(GoRulesHttpService);
    });

    it('should provide GoRulesResilienceService', () => {
      const service = module.get<GoRulesResilienceService>(GoRulesResilienceService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(GoRulesResilienceService);
    });

    it('should provide configuration factories', () => {
      const configFactory = module.get<GoRulesConfigFactory>(GoRulesConfigFactory);
      const asyncConfigFactory = module.get<GoRulesAsyncConfigFactory>(GoRulesAsyncConfigFactory);
      const envConfigFactory = module.get<GoRulesEnvironmentConfigFactory>(GoRulesEnvironmentConfigFactory);

      expect(configFactory).toBeDefined();
      expect(asyncConfigFactory).toBeDefined();
      expect(envConfigFactory).toBeDefined();
    });
  });

  describe('forRootAsync', () => {
    describe('with useFactory', () => {
      let module: TestingModule;

      beforeEach(async () => {
        module = await Test.createTestingModule({
          imports: [
            ConfigModule.forRoot(),
            GoRulesModule.forRootAsync({
              useFactory: (configService: ConfigService) => ({
                apiUrl: configService.get('GORULES_API_URL', 'https://async.gorules.io'),
                apiKey: configService.get('GORULES_API_KEY', 'async-api-key'),
                projectId: configService.get('GORULES_PROJECT_ID', 'async-project-id'),
                timeout: 15000,
                retryAttempts: 2,
                enableLogging: true,
              }),
              inject: [ConfigService],
            }),
          ],
        }).compile();
      });

      afterEach(async () => {
        await module.close();
      });

      it('should provide services with async configuration', () => {
        const configService = module.get<GoRulesConfigService>(GoRulesConfigService);
        const config = configService.getConfig();

        expect(config.apiUrl).toBe('https://async.gorules.io');
        expect(config.apiKey).toBe('async-api-key');
        expect(config.projectId).toBe('async-project-id');
        expect(config.timeout).toBe(15000);
        expect(config.retryAttempts).toBe(2);
        expect(config.enableLogging).toBe(true);
      });

      it('should provide all services', () => {
        const goRulesService = module.get<GoRulesService>(GoRulesService);
        const zenService = module.get<GoRulesZenService>(GoRulesZenService);
        const httpService = module.get<GoRulesHttpService>(GoRulesHttpService);
        const resilienceService = module.get<GoRulesResilienceService>(GoRulesResilienceService);

        expect(goRulesService).toBeDefined();
        expect(zenService).toBeDefined();
        expect(httpService).toBeDefined();
        expect(resilienceService).toBeDefined();
      });
    });

    describe('with useClass', () => {
      class TestOptionsFactory implements GoRulesOptionsFactory {
        createGoRulesOptions(): GoRulesConfig {
          return {
            apiUrl: 'https://class.gorules.io',
            apiKey: 'class-api-key',
            projectId: 'class-project-id',
            timeout: 20000,
            retryAttempts: 4,
            enableLogging: false,
          };
        }
      }

      let module: TestingModule;

      beforeEach(async () => {
        module = await Test.createTestingModule({
          imports: [
            GoRulesModule.forRootAsync({
              useClass: TestOptionsFactory,
            }),
          ],
        }).compile();
      });

      afterEach(async () => {
        await module.close();
      });

      it('should use class-based configuration', () => {
        const configService = module.get<GoRulesConfigService>(GoRulesConfigService);
        const config = configService.getConfig();

        expect(config.apiUrl).toBe('https://class.gorules.io');
        expect(config.apiKey).toBe('class-api-key');
        expect(config.projectId).toBe('class-project-id');
        expect(config.timeout).toBe(20000);
        expect(config.retryAttempts).toBe(4);
      });
    });

    // Note: useExisting tests are complex due to NestJS dependency injection
    // and are covered in integration tests instead

    it('should throw error for invalid async options', () => {
      expect(() => {
        GoRulesModule.forRootAsync({
          // No useFactory, useClass, or useExisting provided
        } as unknown);
      }).toThrow('Invalid GoRules async configuration options');
    });
  });

  describe('convenience methods', () => {
    describe('forEnvironment', () => {
      let module: TestingModule;

      beforeEach(async () => {
        // Set environment variables for testing
        process.env['GORULES_API_URL'] = 'https://env.gorules.io';
        process.env['GORULES_API_KEY'] = 'env-api-key';
        process.env['GORULES_PROJECT_ID'] = 'env-project-id';
        process.env['NODE_ENV'] = 'test';

        module = await Test.createTestingModule({
          imports: [
            ConfigModule.forRoot(),
            GoRulesModule.forEnvironment(),
          ],
        }).compile();
      });

      afterEach(async () => {
        await module.close();
        // Clean up environment variables
        delete process.env['GORULES_API_URL'];
        delete process.env['GORULES_API_KEY'];
        delete process.env['GORULES_PROJECT_ID'];
        delete process.env['NODE_ENV'];
      });

      it('should configure from environment variables', () => {
        const configService = module.get<GoRulesConfigService>(GoRulesConfigService);
        const config = configService.getConfig();

        expect(config.apiUrl).toBe('https://env.gorules.io');
        expect(config.apiKey).toBe('env-api-key');
        expect(config.projectId).toBe('env-project-id');
        expect(config.timeout).toBe(10000); // Test environment timeout
        expect(config.retryAttempts).toBe(0); // Test environment retry attempts
        expect(config.enableLogging).toBe(false); // Test environment logging setting
      });
    });

    describe('forConfigService', () => {
      let module: TestingModule;

      beforeEach(async () => {
        module = await Test.createTestingModule({
          imports: [
            ConfigModule.forRoot({
              load: [
                () => ({
                  GORULES_API_URL: 'https://config.gorules.io',
                  GORULES_API_KEY: 'config-api-key',
                  GORULES_PROJECT_ID: 'config-project-id',
                  GORULES_TIMEOUT: 35000,
                  GORULES_RETRY_ATTEMPTS: 6,
                  GORULES_ENABLE_LOGGING: true,
                }),
              ],
            }),
            GoRulesModule.forConfigService(),
          ],
        }).compile();
      });

      afterEach(async () => {
        await module.close();
      });

      it('should configure from ConfigService', () => {
        const configService = module.get<GoRulesConfigService>(GoRulesConfigService);
        const config = configService.getConfig();

        expect(config.apiUrl).toBe('https://config.gorules.io');
        expect(config.apiKey).toBe('config-api-key');
        expect(config.projectId).toBe('config-project-id');
        expect(config.timeout).toBe(35000);
        expect(config.retryAttempts).toBe(6);
        expect(config.enableLogging).toBe(true);
      });
    });

    describe('forAsyncConfigService', () => {
      let module: TestingModule;

      beforeEach(async () => {
        module = await Test.createTestingModule({
          imports: [
            ConfigModule.forRoot({
              load: [
                () => ({
                  GORULES_API_URL: 'https://async-config.gorules.io',
                  GORULES_API_KEY: 'async-config-api-key',
                  GORULES_PROJECT_ID: 'async-config-project-id',
                }),
              ],
            }),
            GoRulesModule.forAsyncConfigService(),
          ],
        }).compile();
      });

      afterEach(async () => {
        await module.close();
      });

      it('should configure asynchronously from ConfigService', () => {
        const configService = module.get<GoRulesConfigService>(GoRulesConfigService);
        const config = configService.getConfig();

        expect(config.apiUrl).toBe('https://async-config.gorules.io');
        expect(config.apiKey).toBe('async-config-api-key');
        expect(config.projectId).toBe('async-config-project-id');
      });
    });
  });
});

describe('GoRulesFeatureModule', () => {
  const testConfig: GoRulesConfig = {
    apiUrl: 'https://feature.gorules.io',
    apiKey: 'feature-api-key',
    projectId: 'feature-project-id',
    timeout: 10000,
    retryAttempts: 1,
    enableLogging: true,
  };

  describe('forFeature', () => {
    let module: TestingModule;

    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [GoRulesFeatureModule.forFeature(testConfig)],
      }).compile();
    });

    afterEach(async () => {
      await module.close();
    });

    it('should provide all services like the main module', () => {
      const configService = module.get<GoRulesConfigService>(GoRulesConfigService);
      const goRulesService = module.get<GoRulesService>(GoRulesService);
      const zenService = module.get<GoRulesZenService>(GoRulesZenService);
      const httpService = module.get<GoRulesHttpService>(GoRulesHttpService);
      const resilienceService = module.get<GoRulesResilienceService>(GoRulesResilienceService);

      expect(configService).toBeDefined();
      expect(goRulesService).toBeDefined();
      expect(zenService).toBeDefined();
      expect(httpService).toBeDefined();
      expect(resilienceService).toBeDefined();

      const config = configService.getConfig();
      expect(config).toEqual(expect.objectContaining(testConfig));
    });
  });

  describe('forFeatureAsync', () => {
    let module: TestingModule;

    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot(),
          GoRulesFeatureModule.forFeatureAsync({
            useFactory: () => testConfig,
          }),
        ],
      }).compile();
    });

    afterEach(async () => {
      await module.close();
    });

    it('should provide services with async configuration', () => {
      const configService = module.get<GoRulesConfigService>(GoRulesConfigService);
      const config = configService.getConfig();

      expect(config).toEqual(expect.objectContaining(testConfig));
    });
  });
});

describe('GoRulesTestingModule', () => {
  describe('forTesting', () => {
    let module: TestingModule;

    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [
          GoRulesTestingModule.forTesting({
            apiKey: 'custom-test-key',
            timeout: 2000,
          }),
        ],
      }).compile();
    });

    afterEach(async () => {
      await module.close();
    });

    it('should provide testing configuration with overrides', () => {
      const configService = module.get<GoRulesConfigService>(GoRulesConfigService);
      const config = configService.getConfig();

      expect(config.apiUrl).toBe('https://test.gorules.io');
      expect(config.apiKey).toBe('custom-test-key'); // Override
      expect(config.projectId).toBe('test-project-id');
      expect(config.timeout).toBe(2000); // Override
      expect(config.retryAttempts).toBe(1);
      expect(config.enableLogging).toBe(false);
    });

    it('should provide all services for testing', () => {
      const goRulesService = module.get<GoRulesService>(GoRulesService);
      const zenService = module.get<GoRulesZenService>(GoRulesZenService);
      const httpService = module.get<GoRulesHttpService>(GoRulesHttpService);
      const resilienceService = module.get<GoRulesResilienceService>(GoRulesResilienceService);

      expect(goRulesService).toBeDefined();
      expect(zenService).toBeDefined();
      expect(httpService).toBeDefined();
      expect(resilienceService).toBeDefined();
    });
  });

  describe('forMinimalTesting', () => {
    let module: TestingModule;

    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [GoRulesTestingModule.forMinimalTesting()],
      }).compile();
    });

    afterEach(async () => {
      await module.close();
    });

    it('should provide minimal testing configuration', () => {
      const configService = module.get<GoRulesConfigService>(GoRulesConfigService);
      const config = configService.getConfig();

      expect(config.timeout).toBe(1000);
      expect(config.retryAttempts).toBe(0);
      expect(config.enableLogging).toBe(false);
    });
  });
});