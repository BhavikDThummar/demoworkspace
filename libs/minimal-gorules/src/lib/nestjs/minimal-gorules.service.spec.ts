/**
 * Unit tests for MinimalGoRulesService
 */

import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { MinimalGoRulesService } from './minimal-gorules.service.js';
import { MinimalGoRulesEngine, EngineStatus } from '../minimal-gorules-engine.js';
import { RuleSelector, MinimalExecutionResult } from '../interfaces/index.js';

describe('MinimalGoRulesService', () => {
  let service: MinimalGoRulesService;
  let mockEngine: jest.Mocked<MinimalGoRulesEngine>;

  const mockEngineStatus: EngineStatus = {
    initialized: true,
    rulesLoaded: 10,
    lastUpdate: Date.now(),
    projectId: 'test-project',
    version: '1.0.0'
  };

  const mockExecutionResult: MinimalExecutionResult = {
    results: new Map([['rule1', { result: 'test' }]]),
    executionTime: 50,
    errors: new Map()
  };

  beforeEach(async () => {
    // Create mock engine
    mockEngine = {
      initialize: jest.fn(),
      execute: jest.fn(),
      executeRule: jest.fn(),
      executeRules: jest.fn(),
      executeByTags: jest.fn(),
      validateRule: jest.fn(),
      getRuleMetadata: jest.fn(),
      getAllRuleMetadata: jest.fn(),
      getRulesByTags: jest.fn(),
      checkVersions: jest.fn(),
      refreshCache: jest.fn(),
      forceRefreshCache: jest.fn(),
      getStatus: jest.fn(),
      getCacheStats: jest.fn(),
      reset: jest.fn(),
      getConfig: jest.fn(),
      updateConfig: jest.fn()
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: MinimalGoRulesService,
          useFactory: () => new MinimalGoRulesService(mockEngine, false) // Disable auto-init
        }
      ]
    }).compile();

    service = module.get<MinimalGoRulesService>(MinimalGoRulesService);

    // Mock logger to avoid console output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be created', () => {
      expect(service).toBeDefined();
    });

    it('should have correct initial status', () => {
      const status = service.getInitializationStatus();
      expect(status.initialized).toBe(false);
    });

    it('should initialize manually when called', async () => {
      mockEngine.initialize.mockResolvedValue(mockEngineStatus);

      const result = await service.initialize();

      expect(mockEngine.initialize).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(mockEngineStatus);
      
      const status = service.getInitializationStatus();
      expect(status.initialized).toBe(true);
      expect(status.rulesLoaded).toBe(10);
    });

    it('should handle initialization errors', async () => {
      const error = new Error('Initialization failed');
      mockEngine.initialize.mockRejectedValue(error);

      await expect(service.initialize()).rejects.toThrow('Initialization failed');
      
      const status = service.getInitializationStatus();
      expect(status.initialized).toBe(false);
      expect(status.error).toBe('Initialization failed');
    });

    it('should initialize with project ID', async () => {
      mockEngine.initialize.mockResolvedValue(mockEngineStatus);

      await service.initialize('custom-project');

      expect(mockEngine.initialize).toHaveBeenCalledWith('custom-project');
    });
  });

  describe('lifecycle hooks', () => {
    it('should not auto-initialize when autoInitialize is false', async () => {
      await service.onModuleInit();

      expect(mockEngine.initialize).not.toHaveBeenCalled();
    });

    it('should auto-initialize when autoInitialize is true', async () => {
      const autoInitService = new MinimalGoRulesService(mockEngine, true);
      mockEngine.initialize.mockResolvedValue(mockEngineStatus);

      await autoInitService.onModuleInit();

      expect(mockEngine.initialize).toHaveBeenCalled();
    });

    it('should handle auto-initialization errors gracefully', async () => {
      const autoInitService = new MinimalGoRulesService(mockEngine, true);
      mockEngine.initialize.mockRejectedValue(new Error('Init failed'));

      // Should not throw
      await expect(autoInitService.onModuleInit()).resolves.toBeUndefined();

      const status = autoInitService.getInitializationStatus();
      expect(status.initialized).toBe(false);
      expect(status.error).toBe('Init failed');
    });

    it('should cleanup on module destroy', async () => {
      mockEngine.reset.mockResolvedValue();

      await service.onModuleDestroy();

      expect(mockEngine.reset).toHaveBeenCalled();
    });

    it('should handle cleanup errors', async () => {
      mockEngine.reset.mockRejectedValue(new Error('Cleanup failed'));

      // Should not throw
      await expect(service.onModuleDestroy()).resolves.toBeUndefined();
    });
  });

  describe('rule execution', () => {
    beforeEach(async () => {
      // Initialize service for execution tests
      mockEngine.initialize.mockResolvedValue(mockEngineStatus);
      await service.initialize();
    });

    it('should execute rules with selector', async () => {
      const selector: RuleSelector = { ids: ['rule1'], mode: { type: 'parallel' } };
      const input = { test: 'data' };
      
      mockEngine.execute.mockResolvedValue(mockExecutionResult);

      const result = await service.execute(selector, input);

      expect(mockEngine.execute).toHaveBeenCalledWith(selector, input);
      expect(result).toEqual(mockExecutionResult);
    });

    it('should execute single rule', async () => {
      const ruleId = 'rule1';
      const input = { test: 'data' };
      const expectedResult = { result: 'test' };
      
      mockEngine.executeRule.mockResolvedValue(expectedResult);

      const result = await service.executeRule(ruleId, input);

      expect(mockEngine.executeRule).toHaveBeenCalledWith(ruleId, input);
      expect(result).toEqual(expectedResult);
    });

    it('should execute multiple rules', async () => {
      const ruleIds = ['rule1', 'rule2'];
      const input = { test: 'data' };
      
      mockEngine.executeRules.mockResolvedValue(mockExecutionResult);

      const result = await service.executeRules(ruleIds, input);

      expect(mockEngine.executeRules).toHaveBeenCalledWith(ruleIds, input);
      expect(result).toEqual(mockExecutionResult);
    });

    it('should execute rules by tags', async () => {
      const tags = ['tag1', 'tag2'];
      const input = { test: 'data' };
      
      mockEngine.executeByTags.mockResolvedValue(mockExecutionResult);

      const result = await service.executeByTags(tags, input, 'sequential');

      expect(mockEngine.executeByTags).toHaveBeenCalledWith(tags, input, 'sequential');
      expect(result).toEqual(mockExecutionResult);
    });

    it('should throw error when not initialized', async () => {
      const uninitializedService = new MinimalGoRulesService(mockEngine, false);
      const selector: RuleSelector = { ids: ['rule1'], mode: { type: 'parallel' } };

      await expect(uninitializedService.execute(selector, {}))
        .rejects.toThrow('Engine not initialized');
    });
  });

  describe('rule management', () => {
    beforeEach(async () => {
      mockEngine.initialize.mockResolvedValue(mockEngineStatus);
      await service.initialize();
    });

    it('should validate rule', async () => {
      mockEngine.validateRule.mockResolvedValue(true);

      const result = await service.validateRule('rule1');

      expect(mockEngine.validateRule).toHaveBeenCalledWith('rule1');
      expect(result).toBe(true);
    });

    it('should get rule metadata', async () => {
      const metadata = { id: 'rule1', version: '1.0', tags: ['test'], lastModified: Date.now() };
      mockEngine.getRuleMetadata.mockResolvedValue(metadata);

      const result = await service.getRuleMetadata('rule1');

      expect(mockEngine.getRuleMetadata).toHaveBeenCalledWith('rule1');
      expect(result).toEqual(metadata);
    });

    it('should get all rule metadata', async () => {
      const allMetadata = new Map([['rule1', { id: 'rule1', version: '1.0', tags: ['test'], lastModified: Date.now() }]]);
      mockEngine.getAllRuleMetadata.mockResolvedValue(allMetadata);

      const result = await service.getAllRuleMetadata();

      expect(mockEngine.getAllRuleMetadata).toHaveBeenCalled();
      expect(result).toEqual(allMetadata);
    });

    it('should get rules by tags', async () => {
      const ruleIds = ['rule1', 'rule2'];
      mockEngine.getRulesByTags.mockResolvedValue(ruleIds);

      const result = await service.getRulesByTags(['tag1']);

      expect(mockEngine.getRulesByTags).toHaveBeenCalledWith(['tag1']);
      expect(result).toEqual(ruleIds);
    });
  });

  describe('cache management', () => {
    beforeEach(async () => {
      mockEngine.initialize.mockResolvedValue(mockEngineStatus);
      await service.initialize();
    });

    it('should check versions', async () => {
      const versionResult = { outdatedRules: ['rule1'], upToDateRules: ['rule2'], totalChecked: 2, checkTime: 100 };
      mockEngine.checkVersions.mockResolvedValue(versionResult);

      const result = await service.checkVersions();

      expect(mockEngine.checkVersions).toHaveBeenCalled();
      expect(result).toEqual(versionResult);
    });

    it('should refresh cache', async () => {
      const refreshResult = { refreshedRules: ['rule1'], failedRules: new Map(), totalProcessed: 1, refreshTime: 50 };
      mockEngine.refreshCache.mockResolvedValue(refreshResult);

      const result = await service.refreshCache(['rule1']);

      expect(mockEngine.refreshCache).toHaveBeenCalledWith(['rule1']);
      expect(result).toEqual(refreshResult);
    });

    it('should force refresh cache', async () => {
      mockEngine.forceRefreshCache.mockResolvedValue(mockEngineStatus);

      const result = await service.forceRefreshCache();

      expect(mockEngine.forceRefreshCache).toHaveBeenCalled();
      expect(result).toEqual(mockEngineStatus);
      
      const status = service.getInitializationStatus();
      expect(status.rulesLoaded).toBe(10);
    });

    it('should get cache stats', () => {
      const stats = { size: 5, maxSize: 100 };
      mockEngine.getCacheStats.mockReturnValue(stats);

      const result = service.getCacheStats();

      expect(mockEngine.getCacheStats).toHaveBeenCalled();
      expect(result).toEqual(stats);
    });
  });

  describe('status and health', () => {
    it('should get status', async () => {
      mockEngine.getStatus.mockResolvedValue(mockEngineStatus);

      const result = await service.getStatus();

      expect(mockEngine.getStatus).toHaveBeenCalled();
      expect(result).toEqual(mockEngineStatus);
    });

    it('should perform health check when initialized', async () => {
      mockEngine.initialize.mockResolvedValue(mockEngineStatus);
      await service.initialize();
      
      mockEngine.getStatus.mockResolvedValue(mockEngineStatus);

      const result = await service.healthCheck();

      expect(result.status).toBe('ok');
      expect(result.initialized).toBe(true);
      expect(result.rulesLoaded).toBe(10);
    });

    it('should perform health check when not initialized', async () => {
      const result = await service.healthCheck();

      expect(result.status).toBe('error');
      expect(result.initialized).toBe(false);
    });

    it('should handle health check errors', async () => {
      mockEngine.initialize.mockResolvedValue(mockEngineStatus);
      await service.initialize();
      
      mockEngine.getStatus.mockRejectedValue(new Error('Status error'));

      const result = await service.healthCheck();

      expect(result.status).toBe('error');
      expect(result.error).toBe('Status error');
    });
  });

  describe('reset and cleanup', () => {
    it('should reset engine', async () => {
      mockEngine.initialize.mockResolvedValue(mockEngineStatus);
      await service.initialize();
      
      mockEngine.reset.mockResolvedValue();

      await service.reset();

      expect(mockEngine.reset).toHaveBeenCalled();
      
      const status = service.getInitializationStatus();
      expect(status.initialized).toBe(false);
    });

    it('should get underlying engine', () => {
      const engine = service.getEngine();
      expect(engine).toBe(mockEngine);
    });
  });
});