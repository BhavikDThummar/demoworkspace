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
      process.env.GORULES_HTTP_TIMEOUT = mockConfig.httpTimeout?.toString();
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
      delete process.env.GORULES_HTTP_TIMEOUT;
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
});
