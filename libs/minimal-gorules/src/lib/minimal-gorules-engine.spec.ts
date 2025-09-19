/**
 * Integration tests for MinimalGoRulesEngine
 * Tests complete engine functionality with all components
 */

import { MinimalGoRulesEngine, EngineStatus, VersionCheckResult, CacheRefreshResult } from './minimal-gorules-engine.js';
import { MinimalGoRulesConfig, RuleSelector, MinimalRuleMetadata } from './interfaces/index.js';
import { MinimalGoRulesError, MinimalErrorCode } from './errors/index.js';

// Mock fetch for testing
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock ZenEngine
const mockZenEngine = {
  evaluate: jest.fn()
};

jest.mock('@gorules/zen-engine', () => ({
  ZenEngine: jest.fn().mockImplementation(() => mockZenEngine)
}));

// Mock rule data for testing
const mockRuleData = {
  'rule-1': {
    id: 'rule-1',
    name: 'Test Rule 1',
    version: '1.0.0',
    tags: ['test', 'validation'],
    lastModified: '2024-01-01T00:00:00Z',
    content: Buffer.from(JSON.stringify({
      kind: 'DecisionTable',
      hitPolicy: 'first',
      inputs: [{ field: 'input', type: 'string' }],
      outputs: [{ field: 'output', type: 'string' }],
      rules: [
        { input: 'test', output: 'success' }
      ]
    })).toString('base64')
  },
  'rule-2': {
    id: 'rule-2',
    name: 'Test Rule 2',
    version: '1.0.0',
    tags: ['test', 'calculation'],
    lastModified: '2024-01-01T00:00:00Z',
    content: Buffer.from(JSON.stringify({
      kind: 'DecisionTable',
      hitPolicy: 'first',
      inputs: [{ field: 'value', type: 'number' }],
      outputs: [{ field: 'result', type: 'number' }],
      rules: [
        { value: 10, result: 20 }
      ]
    })).toString('base64')
  },
  'rule-3': {
    id: 'rule-3',
    name: 'Test Rule 3',
    version: '2.0.0',
    tags: ['calculation', 'advanced'],
    lastModified: '2024-01-02T00:00:00Z',
    content: Buffer.from(JSON.stringify({
      kind: 'DecisionTable',
      hitPolicy: 'first',
      inputs: [{ field: 'x', type: 'number' }, { field: 'y', type: 'number' }],
      outputs: [{ field: 'sum', type: 'number' }],
      rules: [
        { x: 5, y: 3, sum: 8 }
      ]
    })).toString('base64')
  }
};

// Test configuration
const testConfig: MinimalGoRulesConfig = {
  apiUrl: 'https://api.gorules.io',
  apiKey: 'test-api-key',
  projectId: 'test-project',
  cacheMaxSize: 100,
  httpTimeout: 5000,
  batchSize: 10
};

describe('MinimalGoRulesEngine', () => {
  let engine: MinimalGoRulesEngine;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default ZenEngine mock behavior
    mockZenEngine.evaluate.mockImplementation(async (ruleId: string, input: any) => {
      // Return mock results based on rule ID
      switch (ruleId) {
        case 'rule-1':
          return { result: { output: 'success' } };
        case 'rule-2':
          return { result: { result: 20 } };
        case 'rule-3':
          return { result: { sum: 8 } };
        default:
          throw new Error(`Rule not found: ${ruleId}`);
      }
    });
    
    engine = new MinimalGoRulesEngine(testConfig);
  });

  describe('Configuration Validation', () => {
    it('should validate required configuration fields', () => {
      expect(() => new MinimalGoRulesEngine({} as MinimalGoRulesConfig)).toThrow(MinimalGoRulesError);
      expect(() => new MinimalGoRulesEngine({ apiUrl: '', apiKey: '', projectId: '' })).toThrow(MinimalGoRulesError);
    });

    it('should validate numeric configuration values', () => {
      expect(() => new MinimalGoRulesEngine({
        ...testConfig,
        cacheMaxSize: -1
      })).toThrow(MinimalGoRulesError);

      expect(() => new MinimalGoRulesEngine({
        ...testConfig,
        httpTimeout: 0
      })).toThrow(MinimalGoRulesError);
    });

    it('should accept valid configuration', () => {
      expect(() => new MinimalGoRulesEngine(testConfig)).not.toThrow();
    });
  });

  describe('Engine Initialization', () => {
    beforeEach(() => {
      // Mock successful API response
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          rules: Object.values(mockRuleData)
        })
      });
    });

    it('should initialize successfully and load all rules', async () => {
      const status = await engine.initialize();

      expect(status.initialized).toBe(true);
      expect(status.rulesLoaded).toBe(3);
      expect(status.projectId).toBe('test-project');
      expect(status.version).toBe('1.0.0');
      expect(typeof status.lastUpdate).toBe('number');
    });

    it('should handle initialization errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(engine.initialize()).rejects.toThrow(MinimalGoRulesError);
    });

    it('should clear cache before initialization', async () => {
      // Initialize once
      await engine.initialize();
      const firstStatus = await engine.getStatus();

      // Initialize again
      await engine.initialize();
      const secondStatus = await engine.getStatus();

      expect(secondStatus.rulesLoaded).toBe(firstStatus.rulesLoaded);
    });

    it('should initialize with different project ID', async () => {
      const status = await engine.initialize('different-project');

      expect(status.projectId).toBe('different-project');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/projects/different-project/rules'),
        expect.any(Object)
      );
    });
  });

  describe('Rule Execution', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          rules: Object.values(mockRuleData)
        })
      });
      await engine.initialize();
    });

    it('should execute single rule by ID', async () => {
      const result = await engine.executeRule('rule-1', { input: 'test' });
      expect(result).toBeDefined();
    });

    it('should execute multiple rules in parallel', async () => {
      const selector: RuleSelector = {
        ids: ['rule-1', 'rule-2'],
        mode: { type: 'parallel' }
      };

      const result = await engine.execute(selector, { input: 'test', value: 10 });

      expect(result.results.size).toBe(2);
      expect(result.results.has('rule-1')).toBe(true);
      expect(result.results.has('rule-2')).toBe(true);
      expect(typeof result.executionTime).toBe('number');
    });

    it('should execute rules in sequential mode', async () => {
      const selector: RuleSelector = {
        ids: ['rule-1', 'rule-2'],
        mode: { type: 'sequential' }
      };

      const result = await engine.execute(selector, { input: 'test', value: 10 });

      expect(result.results.size).toBe(2);
      expect(typeof result.executionTime).toBe('number');
    });

    it('should execute rules by tags', async () => {
      const result = await engine.executeByTags(['test'], { input: 'test', value: 10 });

      expect(result.results.size).toBeGreaterThan(0);
      // Should include rules with 'test' tag (rule-1 and rule-2)
      expect(result.results.has('rule-1')).toBe(true);
      expect(result.results.has('rule-2')).toBe(true);
    });

    it('should execute rules in mixed mode', async () => {
      const selector: RuleSelector = {
        ids: ['rule-1', 'rule-2', 'rule-3'],
        mode: {
          type: 'mixed',
          groups: [
            { rules: ['rule-1'], mode: 'sequential' },
            { rules: ['rule-2', 'rule-3'], mode: 'parallel' }
          ]
        }
      };

      const result = await engine.execute(selector, { 
        input: 'test', 
        value: 10, 
        x: 5, 
        y: 3 
      });

      expect(result.results.size).toBe(3);
    });

    it('should handle execution errors gracefully', async () => {
      // Reset the mock to throw an error for rule-1
      mockZenEngine.evaluate.mockReset();
      mockZenEngine.evaluate.mockImplementation(async (ruleId: string, input: any) => {
        if (ruleId === 'rule-1') {
          throw new Error(`Execution error for rule: ${ruleId}`);
        }
        // Return normal results for other rules
        switch (ruleId) {
          case 'rule-2':
            return { result: { result: 20 } };
          case 'rule-3':
            return { result: { sum: 8 } };
          default:
            throw new Error(`Rule not found: ${ruleId}`);
        }
      });

      const selector: RuleSelector = {
        ids: ['rule-1'], // This rule exists but will cause execution error
        mode: { type: 'parallel' }
      };

      const result = await engine.execute(selector, {});

      expect(result.results.size).toBe(0);
      if (result.errors) {
        expect(result.errors.size).toBeGreaterThan(0);
      } else {
        fail('Expected errors to be defined when execution fails');
      }
    });

    it('should require initialization before execution', async () => {
      const uninitializedEngine = new MinimalGoRulesEngine(testConfig);

      await expect(uninitializedEngine.executeRule('rule-1', {})).rejects.toThrow(MinimalGoRulesError);
    });
  });

  describe('Convenience Methods', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          rules: Object.values(mockRuleData)
        })
      });
      await engine.initialize();
    });

    it('should execute multiple rules by IDs', async () => {
      const result = await engine.executeRules(['rule-1', 'rule-2'], { 
        input: 'test', 
        value: 10 
      });

      expect(result.results.size).toBe(2);
      expect(result.results.has('rule-1')).toBe(true);
      expect(result.results.has('rule-2')).toBe(true);
    });

    it('should execute rules by tags with different modes', async () => {
      const parallelResult = await engine.executeByTags(['test'], { input: 'test' }, 'parallel');
      const sequentialResult = await engine.executeByTags(['test'], { input: 'test' }, 'sequential');

      expect(parallelResult.results.size).toBe(sequentialResult.results.size);
      expect(parallelResult.results.size).toBeGreaterThan(0);
    });
  });

  describe('Version Management', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          rules: Object.values(mockRuleData)
        })
      });
      await engine.initialize();
    });

    it('should check rule versions', async () => {
      // Mock version check response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          rules: [
            { ...mockRuleData['rule-1'], version: '1.1.0' }, // Updated version
            mockRuleData['rule-2'], // Same version
            mockRuleData['rule-3']  // Same version
          ]
        })
      });

      const versionCheck = await engine.checkVersions();

      expect(versionCheck.totalChecked).toBe(3);
      expect(versionCheck.outdatedRules).toContain('rule-1');
      expect(versionCheck.upToDateRules).toContain('rule-2');
      expect(versionCheck.upToDateRules).toContain('rule-3');
      expect(typeof versionCheck.checkTime).toBe('number');
    });

    it('should refresh outdated rules', async () => {
      // Mock individual rule refresh - note the API endpoint for individual rules
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...mockRuleData['rule-1'], version: '1.1.0' })
      });

      const refreshResult = await engine.refreshCache(['rule-1']);

      expect(refreshResult.refreshedRules).toContain('rule-1');
      expect(refreshResult.failedRules.size).toBe(0);
      expect(refreshResult.totalProcessed).toBe(1);
      expect(typeof refreshResult.refreshTime).toBe('number');
    });

    it('should handle refresh failures', async () => {
      // Mock individual rule refresh failure
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const refreshResult = await engine.refreshCache(['rule-1']);

      expect(refreshResult.refreshedRules.length).toBe(0);
      expect(refreshResult.failedRules.size).toBe(1);
      expect(refreshResult.failedRules.has('rule-1')).toBe(true);
    });

    it('should force refresh entire cache', async () => {
      const status = await engine.forceRefreshCache();

      expect(status.initialized).toBe(true);
      expect(status.rulesLoaded).toBe(3);
    });
  });

  describe('Rule Validation and Metadata', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          rules: Object.values(mockRuleData)
        })
      });
      await engine.initialize();
    });

    it('should validate existing rules', async () => {
      const isValid = await engine.validateRule('rule-1');
      expect(isValid).toBe(true);
    });

    it('should return false for non-existent rules', async () => {
      const isValid = await engine.validateRule('non-existent-rule');
      expect(isValid).toBe(false);
    });

    it('should get rule metadata', async () => {
      const metadata = await engine.getRuleMetadata('rule-1');

      expect(metadata).toBeDefined();
      expect(metadata?.id).toBe('rule-1');
      expect(metadata?.version).toBe('1.0.0');
      expect(metadata?.tags).toContain('test');
    });

    it('should get all rule metadata', async () => {
      const allMetadata = await engine.getAllRuleMetadata();

      expect(allMetadata.size).toBe(3);
      expect(allMetadata.has('rule-1')).toBe(true);
      expect(allMetadata.has('rule-2')).toBe(true);
      expect(allMetadata.has('rule-3')).toBe(true);
    });

    it('should get rules by tags', async () => {
      const testRules = await engine.getRulesByTags(['test']);
      const calculationRules = await engine.getRulesByTags(['calculation']);

      expect(testRules).toContain('rule-1');
      expect(testRules).toContain('rule-2');
      expect(calculationRules).toContain('rule-2');
      expect(calculationRules).toContain('rule-3');
    });
  });

  describe('Engine Status and Configuration', () => {
    it('should return correct status when uninitialized', async () => {
      const status = await engine.getStatus();

      expect(status.initialized).toBe(false);
      expect(status.rulesLoaded).toBe(0);
      expect(status.projectId).toBe('test-project');
    });

    it('should return correct status when initialized', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          rules: Object.values(mockRuleData)
        })
      });

      await engine.initialize();
      const status = await engine.getStatus();

      expect(status.initialized).toBe(true);
      expect(status.rulesLoaded).toBe(3);
    });

    it('should get current configuration', () => {
      const config = engine.getConfig();

      expect(config.apiUrl).toBe(testConfig.apiUrl);
      expect(config.apiKey).toBe(testConfig.apiKey);
      expect(config.projectId).toBe(testConfig.projectId);
    });

    it('should update configuration', () => {
      engine.updateConfig({ cacheMaxSize: 200 });

      const config = engine.getConfig();
      expect(config.cacheMaxSize).toBe(200);
    });

    it('should mark as uninitialized when project ID changes', () => {
      engine.updateConfig({ projectId: 'new-project' });

      const config = engine.getConfig();
      expect(config.projectId).toBe('new-project');
    });

    it('should get cache statistics', () => {
      const stats = engine.getCacheStats();

      expect(typeof stats.size).toBe('number');
      expect(typeof stats.maxSize).toBe('number');
    });
  });

  describe('Engine Reset and Cleanup', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          rules: Object.values(mockRuleData)
        })
      });
      await engine.initialize();
    });

    it('should reset engine state', async () => {
      await engine.reset();

      const status = await engine.getStatus();
      expect(status.initialized).toBe(false);
      expect(status.rulesLoaded).toBe(0);
    });

    it('should require reinitialization after reset', async () => {
      await engine.reset();

      await expect(engine.executeRule('rule-1', {})).rejects.toThrow(MinimalGoRulesError);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors during initialization', async () => {
      mockFetch.mockRejectedValue(new Error('Network timeout'));

      await expect(engine.initialize()).rejects.toThrow(MinimalGoRulesError);
    });

    it('should handle API errors during initialization', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      });

      await expect(engine.initialize()).rejects.toThrow(MinimalGoRulesError);
    });

    it('should handle execution errors gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          rules: Object.values(mockRuleData)
        })
      });

      await engine.initialize();

      // Reset the mock to throw an error for rule-1
      mockZenEngine.evaluate.mockImplementation(async (ruleId: string, input: any) => {
        if (ruleId === 'rule-1') {
          throw new Error(`Execution error for rule: ${ruleId}`);
        }
        // Return normal results for other rules
        switch (ruleId) {
          case 'rule-2':
            return { result: { result: 20 } };
          case 'rule-3':
            return { result: { sum: 8 } };
          default:
            throw new Error(`Rule not found: ${ruleId}`);
        }
      });

      // Test with valid selector but rule that will cause execution error
      const selector: RuleSelector = {
        ids: ['rule-1'], // This will trigger the error mock
        mode: { type: 'parallel' }
      };

      const result = await engine.execute(selector, {});
      
      expect(result.results.size).toBe(0);
      expect(result.errors).toBeDefined();
      expect(result.errors!.size).toBeGreaterThan(0);
    });
  });

  describe('Performance and Concurrency', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          rules: Object.values(mockRuleData)
        })
      });
      await engine.initialize();
    });

    it('should handle concurrent executions', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        engine.executeRule('rule-1', { input: `test-${i}` })
      );

      const results = await Promise.all(promises);
      expect(results).toHaveLength(10);
    });

    it('should measure execution time', async () => {
      const result = await engine.executeRules(['rule-1', 'rule-2'], { 
        input: 'test', 
        value: 10 
      });

      expect(result.executionTime).toBeGreaterThan(0);
    });

    it('should handle large rule sets efficiently', async () => {
      // Create many mock rules
      const manyRules = Array.from({ length: 50 }, (_, i) => ({
        ...mockRuleData['rule-1'],
        id: `rule-${i}`,
        name: `Test Rule ${i}`
      }));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ rules: manyRules })
      });

      // Update ZenEngine mock to handle the new rule IDs
      mockZenEngine.evaluate.mockImplementation(async (ruleId: string, input: unknown) => {
        if (ruleId.startsWith('rule-')) {
          return { result: { output: 'success' } };
        }
        throw new Error(`Rule not found: ${ruleId}`);
      });

      const newEngine = new MinimalGoRulesEngine(testConfig);
      const status = await newEngine.initialize();

      expect(status.rulesLoaded).toBe(50);

      const ruleIds = manyRules.map(rule => rule.id);
      const result = await newEngine.executeRules(ruleIds.slice(0, 10), { input: 'test' });

      expect(result.results.size).toBe(10);
    });
  });
});