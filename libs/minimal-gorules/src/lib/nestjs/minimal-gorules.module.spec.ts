/**
 * Integration tests for MinimalGoRulesModule
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MinimalGoRulesModule } from './minimal-gorules.module.js';
import { MinimalGoRulesService } from './minimal-gorules.service.js';
import { MinimalGoRulesEngine } from '../minimal-gorules-engine.js';
import { MinimalGoRulesConfig } from '../interfaces/config.js';
import {
  MINIMAL_GORULES_CONFIG_TOKEN,
  MINIMAL_GORULES_ENGINE_TOKEN,
  MinimalGoRulesOptionsFactory,
} from './interfaces.js';

describe('MinimalGoRulesModule', () => {
  const mockConfig: MinimalGoRulesConfig = {
    apiUrl: 'https://api.gorules.io',
    apiKey: 'test-api-key',
    projectId: 'test-project-id',
    cacheMaxSize: 100,
    httpTimeout: 3000,
    batchSize: 25,
    platform: 'node',
  };

  describe('forRoot', () => {
    let module: TestingModule;
    let service: MinimalGoRulesService;
    let engine: MinimalGoRulesEngine;
    let config: MinimalGoRulesConfig;

    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [
          MinimalGoRulesModule.forRoot({
            config: mockConfig,
            autoInitialize: false, // Disable auto-init for testing
          }),
        ],
      }).compile();

      service = module.get<MinimalGoRulesService>(MinimalGoRulesService);
      engine = module.get<MinimalGoRulesEngine>(MINIMAL_GORULES_ENGINE_TOKEN);
      config = module.get<MinimalGoRulesConfig>(MINIMAL_GORULES_CONFIG_TOKEN);
    });

    afterEach(async () => {
      await module.close();
    });

    it('should create module with service', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(MinimalGoRulesService);
    });

    it('should provide engine instance', () => {
      expect(engine).toBeDefined();
      expect(engine).toBeInstanceOf(MinimalGoRulesEngine);
    });

    it('should provide configuration', () => {
      expect(config).toBeDefined();
      expect(config).toEqual(mockConfig);
    });

    it('should have service with correct engine instance', () => {
      const serviceEngine = service.getEngine();
      expect(serviceEngine).toBe(engine);
    });

    it('should have correct initialization status', () => {
      const status = service.getInitializationStatus();
      expect(status.initialized).toBe(false); // Auto-init disabled
    });
  });

  describe('forRootAsync with useFactory', () => {
    let module: TestingModule;
    let service: MinimalGoRulesService;

    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [
          MinimalGoRulesModule.forRootAsync({
            useFactory: (): MinimalGoRulesConfig => mockConfig,
            autoInitialize: false,
          }),
        ],
      }).compile();

      service = module.get<MinimalGoRulesService>(MinimalGoRulesService);
    });

    afterEach(async () => {
      await module.close();
    });

    it('should create module with factory configuration', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(MinimalGoRulesService);
    });

    it('should have correct configuration from factory', () => {
      const config = module.get<MinimalGoRulesConfig>(MINIMAL_GORULES_CONFIG_TOKEN);
      expect(config).toEqual(mockConfig);
    });
  });

  describe('forRootAsync with useClass', () => {
    class TestConfigFactory implements MinimalGoRulesOptionsFactory {
      createMinimalGoRulesOptions(): MinimalGoRulesConfig {
        return mockConfig;
      }
    }

    let module: TestingModule;
    let service: MinimalGoRulesService;

    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [
          MinimalGoRulesModule.forRootAsync({
            useClass: TestConfigFactory,
            autoInitialize: false,
          }),
        ],
      }).compile();

      service = module.get<MinimalGoRulesService>(MinimalGoRulesService);
    });

    afterEach(async () => {
      await module.close();
    });

    it('should create module with class-based configuration', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(MinimalGoRulesService);
    });

    it('should have correct configuration from class factory', () => {
      const config = module.get<MinimalGoRulesConfig>(MINIMAL_GORULES_CONFIG_TOKEN);
      expect(config).toEqual(mockConfig);
    });
  });

  describe('forRootWithConfig', () => {
    let module: TestingModule;
    let service: MinimalGoRulesService;

    beforeEach(async () => {
      // Set up environment variables for testing
      process.env.GORULES_API_URL = mockConfig.apiUrl;
      process.env.GORULES_API_KEY = mockConfig.apiKey;
      process.env.GORULES_PROJECT_ID = mockConfig.projectId;
      process.env.GORULES_CACHE_MAX_SIZE = mockConfig.cacheMaxSize?.toString();
      process.env.GORULES_TIMEOUT = mockConfig.httpTimeout?.toString();
      process.env.GORULES_BATCH_SIZE = mockConfig.batchSize?.toString();

      try {
        module = await Test.createTestingModule({
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: [],
            }),
            MinimalGoRulesModule.forRootWithConfig({
              autoInitialize: false,
            }),
          ],
        }).compile();

        service = module.get<MinimalGoRulesService>(MinimalGoRulesService);
      } catch (error) {
        // If module creation fails, set module to undefined to handle in afterEach
        module = undefined as any;
        throw error;
      }
    });

    afterEach(async () => {
      // Clean up environment variables
      delete process.env.GORULES_API_URL;
      delete process.env.GORULES_API_KEY;
      delete process.env.GORULES_PROJECT_ID;
      delete process.env.GORULES_CACHE_MAX_SIZE;
      delete process.env.GORULES_TIMEOUT;
      delete process.env.GORULES_BATCH_SIZE;

      if (module) {
        await module.close();
      }
    });

    it('should create module with environment-based configuration', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(MinimalGoRulesService);
    });

    it('should load configuration from environment variables', () => {
      const config = module.get<MinimalGoRulesConfig>(MINIMAL_GORULES_CONFIG_TOKEN);
      expect(config.apiUrl).toBe(mockConfig.apiUrl);
      expect(config.apiKey).toBe(mockConfig.apiKey);
      expect(config.projectId).toBe(mockConfig.projectId);
      expect(config.platform).toBe('node');
    });
  });

  describe('forRootWithConfig with nested config', () => {
    let module: TestingModule;
    let service: MinimalGoRulesService;

    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
            load: [
              () => ({
                minimalGoRules: mockConfig,
              }),
            ],
          }),
          MinimalGoRulesModule.forRootWithConfig({
            autoInitialize: false,
          }),
        ],
      }).compile();

      service = module.get<MinimalGoRulesService>(MinimalGoRulesService);
    });

    afterEach(async () => {
      await module.close();
    });

    it('should create module with nested configuration', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(MinimalGoRulesService);
    });

    it('should load configuration from nested config object', () => {
      const config = module.get<MinimalGoRulesConfig>(MINIMAL_GORULES_CONFIG_TOKEN);
      expect(config).toEqual({
        ...mockConfig,
        ruleSource: 'cloud', // Default value added by forRootWithConfig
        platform: 'node',
      });
    });
  });

  describe('module exports', () => {
    let module: TestingModule;

    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [
          MinimalGoRulesModule.forRoot({
            config: mockConfig,
            autoInitialize: false,
          }),
        ],
      }).compile();
    });

    afterEach(async () => {
      await module.close();
    });

    it('should export MinimalGoRulesService', () => {
      const service = module.get<MinimalGoRulesService>(MinimalGoRulesService);
      expect(service).toBeDefined();
    });

    it('should export engine token', () => {
      const engine = module.get<MinimalGoRulesEngine>(MINIMAL_GORULES_ENGINE_TOKEN);
      expect(engine).toBeDefined();
    });

    it('should export config token', () => {
      const config = module.get<MinimalGoRulesConfig>(MINIMAL_GORULES_CONFIG_TOKEN);
      expect(config).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should throw error when configuration is missing for forRootWithConfig', async () => {
      await expect(
        Test.createTestingModule({
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: [],
            }),
            MinimalGoRulesModule.forRootWithConfig({
              configKey: 'nonExistentKey',
            }),
          ],
        }).compile(),
      ).rejects.toThrow('Missing required configuration');
    });
  });

  describe('local rule loading integration', () => {
    const mockLocalConfig: MinimalGoRulesConfig = {
      ruleSource: 'local',
      localRulesPath: './test-rules',
      enableHotReload: false,
      metadataFilePattern: '*.meta.json',
      fileSystemOptions: {
        recursive: true,
        watchOptions: {
          persistent: false,
          ignoreInitial: true,
        },
      },
      cacheMaxSize: 100,
      platform: 'node',
    };

    // Mock the file system to avoid actual directory checks during testing
    beforeAll(() => {
      // Mock fs.existsSync to return true for test directories
      const fs = require('fs');
      const originalExistsSync = fs.existsSync;
      jest.spyOn(fs, 'existsSync').mockImplementation((path: string) => {
        if (typeof path === 'string' && path.includes('test-rules')) {
          return true;
        }
        return originalExistsSync(path);
      });

      // Mock fs.statSync to return directory stats for test directories
      const originalStatSync = fs.statSync;
      jest.spyOn(fs, 'statSync').mockImplementation((path: string) => {
        if (typeof path === 'string' && path.includes('test-rules')) {
          return { isDirectory: () => true };
        }
        return originalStatSync(path);
      });
    });

    afterAll(() => {
      jest.restoreAllMocks();
    });

    describe('forRoot with local configuration', () => {
      let module: TestingModule;
      let service: MinimalGoRulesService;
      let engine: MinimalGoRulesEngine;
      let config: MinimalGoRulesConfig;

      beforeEach(async () => {
        try {
          module = await Test.createTestingModule({
            imports: [
              MinimalGoRulesModule.forRoot({
                config: mockLocalConfig,
                autoInitialize: false, // Disable auto-init for testing
              }),
            ],
          }).compile();

          service = module.get<MinimalGoRulesService>(MinimalGoRulesService);
          engine = module.get<MinimalGoRulesEngine>(MINIMAL_GORULES_ENGINE_TOKEN);
          config = module.get<MinimalGoRulesConfig>(MINIMAL_GORULES_CONFIG_TOKEN);
        } catch (error) {
          module = undefined as any;
          throw error;
        }
      });

      afterEach(async () => {
        if (module) {
          await module.close();
        }
      });

      it('should create module with local rule configuration', () => {
        expect(service).toBeDefined();
        expect(service).toBeInstanceOf(MinimalGoRulesService);
      });

      it('should provide local rule configuration', () => {
        expect(config).toBeDefined();
        expect(config.ruleSource).toBe('local');
        expect(config.localRulesPath).toBe('./test-rules');
        expect(config.enableHotReload).toBe(false);
      });

      it('should have engine configured for local rules', () => {
        expect(engine).toBeDefined();
        expect(engine).toBeInstanceOf(MinimalGoRulesEngine);
      });
    });

    describe('forRootWithConfig with local environment variables', () => {
      let module: TestingModule;
      let service: MinimalGoRulesService;

      beforeEach(async () => {
        // Set up environment variables for local rule loading
        process.env.GORULES_RULE_SOURCE = 'local';
        process.env.GORULES_LOCAL_RULES_PATH = './test-rules';
        process.env.GORULES_ENABLE_HOT_RELOAD = 'true';
        process.env.GORULES_METADATA_FILE_PATTERN = '*.meta.json';
        process.env.GORULES_FS_RECURSIVE = 'true';
        process.env.GORULES_WATCH_PERSISTENT = 'false';
        process.env.GORULES_WATCH_IGNORE_INITIAL = 'true';

        try {
          module = await Test.createTestingModule({
            imports: [
              ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: [],
              }),
              MinimalGoRulesModule.forRootWithConfig({
                autoInitialize: false,
              }),
            ],
          }).compile();

          service = module.get<MinimalGoRulesService>(MinimalGoRulesService);
        } catch (error) {
          module = undefined as any;
          throw error;
        }
      });

      afterEach(async () => {
        // Clean up environment variables
        delete process.env.GORULES_RULE_SOURCE;
        delete process.env.GORULES_LOCAL_RULES_PATH;
        delete process.env.GORULES_ENABLE_HOT_RELOAD;
        delete process.env.GORULES_METADATA_FILE_PATTERN;
        delete process.env.GORULES_FS_RECURSIVE;
        delete process.env.GORULES_WATCH_PERSISTENT;
        delete process.env.GORULES_WATCH_IGNORE_INITIAL;

        if (module) {
          await module.close();
        }
      });

      it('should create module with local rule environment configuration', () => {
        expect(service).toBeDefined();
        expect(service).toBeInstanceOf(MinimalGoRulesService);
      });

      it('should load local rule configuration from environment variables', () => {
        const config = module.get<MinimalGoRulesConfig>(MINIMAL_GORULES_CONFIG_TOKEN);
        expect(config.ruleSource).toBe('local');
        expect(config.localRulesPath).toBe('./test-rules');
        expect(config.enableHotReload).toBe(true);
        expect(config.metadataFilePattern).toBe('*.meta.json');
        expect(config.fileSystemOptions?.recursive).toBe(true);
        expect(config.fileSystemOptions?.watchOptions?.persistent).toBe(false);
        expect(config.fileSystemOptions?.watchOptions?.ignoreInitial).toBe(true);
      });
    });

    describe('forRootWithConfig with nested local config', () => {
      let module: TestingModule;
      let service: MinimalGoRulesService;

      beforeEach(async () => {
        try {
          module = await Test.createTestingModule({
            imports: [
              ConfigModule.forRoot({
                isGlobal: true,
                load: [
                  () => ({
                    minimalGoRules: mockLocalConfig,
                  }),
                ],
              }),
              MinimalGoRulesModule.forRootWithConfig({
                autoInitialize: false,
              }),
            ],
          }).compile();

          service = module.get<MinimalGoRulesService>(MinimalGoRulesService);
        } catch (error) {
          module = undefined as unknown;
          throw error;
        }
      });

      afterEach(async () => {
        if (module) {
          await module.close();
        }
      });

      it('should create module with nested local configuration', () => {
        expect(service).toBeDefined();
        expect(service).toBeInstanceOf(MinimalGoRulesService);
      });

      it('should load local configuration from nested config object', () => {
        const config = module.get<MinimalGoRulesConfig>(MINIMAL_GORULES_CONFIG_TOKEN);
        expect(config.ruleSource).toBe('local');
        expect(config.localRulesPath).toBe('./test-rules');
        expect(config.enableHotReload).toBe(false);
        expect(config.platform).toBe('node');
      });
    });

    describe('error handling for local rules', () => {
      it('should throw error when localRulesPath is missing for local rule source', async () => {
        process.env.GORULES_RULE_SOURCE = 'local';
        // Don't set GORULES_LOCAL_RULES_PATH

        await expect(
          Test.createTestingModule({
            imports: [
              ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: [],
              }),
              MinimalGoRulesModule.forRootWithConfig({
                autoInitialize: false,
              }),
            ],
          }).compile(),
        ).rejects.toThrow('Missing required configuration for local rule loading');

        delete process.env.GORULES_RULE_SOURCE;
      });
    });
  });
});
