/**
 * Hybrid Rule Loading Integration Tests
 * Tests end-to-end functionality of hybrid rule loading (cloud vs local)
 */

import { MinimalGoRulesEngine } from '../minimal-gorules-engine.js';
import { MinimalGoRulesConfig } from '../interfaces/config.js';
import { MinimalGoRulesError } from '../errors/minimal-errors.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock fetch for cloud tests
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('Hybrid Rule Loading Integration Tests', () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create temporary directory for local rule tests
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'hybrid-rule-test-'));
    mockFetch.mockClear();
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to clean up temp directory:', error);
    }
  });

  describe('Local Rule Loading Integration', () => {
    let engine: MinimalGoRulesEngine;

    afterEach(async () => {
      if (engine) {
        await engine.cleanup();
      }
    });

    it('should initialize engine with local rule source', async () => {
      // Create test rule files
      await createTestRuleFiles(tempDir);

      const config: MinimalGoRulesConfig = {
        ruleSource: 'local',
        localRulesPath: tempDir,
        cacheMaxSize: 100,
      };

      engine = new MinimalGoRulesEngine(config);
      const status = await engine.initialize();

      expect(status.initialized).toBe(true);
      expect(status.rulesLoaded).toBe(3); // pricing/shipping-fees, validation/order-validation, approval/workflow-rules
      expect(status.ruleSource).toBe('local');
    });

    it('should execute rules loaded from local files', async () => {
      // Create test rule files
      await createTestRuleFiles(tempDir);

      const config: MinimalGoRulesConfig = {
        ruleSource: 'local',
        localRulesPath: tempDir,
      };

      engine = new MinimalGoRulesEngine(config);
      await engine.initialize();

      // Mock ZenEngine evaluation
      const mockZenEngine = {
        evaluate: jest.fn().mockResolvedValue({
          result: { approved: true, score: 85 },
          performance: '5ms',
        }),
      };
      (engine as any).executionEngine.zenEngine = mockZenEngine;

      const result = await engine.executeRule('pricing/shipping-fees', {
        weight: 2.5,
        distance: 100,
      });

      expect(result).toEqual({ approved: true, score: 85 });
      expect(mockZenEngine.evaluate).toHaveBeenCalledWith('pricing/shipping-fees', {
        weight: 2.5,
        distance: 100,
      });
    });

    it('should handle rule metadata from local files', async () => {
      // Create test rule files with metadata
      await createTestRuleFiles(tempDir);

      const config: MinimalGoRulesConfig = {
        ruleSource: 'local',
        localRulesPath: tempDir,
      };

      engine = new MinimalGoRulesEngine(config);
      await engine.initialize();

      const metadata = await engine.getRuleMetadata('pricing/shipping-fees');

      expect(metadata).toBeDefined();
      expect(metadata?.id).toBe('pricing/shipping-fees');
      expect(metadata?.name).toBe('Shipping Fee Calculation');
      expect(metadata?.tags).toContain('pricing');
      expect(metadata?.tags).toContain('shipping');
      expect(metadata?.version).toBeDefined();
      expect(metadata?.lastModified).toBeGreaterThan(0);
    });

    it('should execute rules by tags from local files', async () => {
      // Create test rule files
      await createTestRuleFiles(tempDir);

      const config: MinimalGoRulesConfig = {
        ruleSource: 'local',
        localRulesPath: tempDir,
      };

      engine = new MinimalGoRulesEngine(config);
      await engine.initialize();

      // Mock ZenEngine evaluation
      const mockZenEngine = {
        evaluate: jest.fn().mockResolvedValue({
          result: { valid: true },
          performance: '3ms',
        }),
      };
      (engine as any).executionEngine.zenEngine = mockZenEngine;

      const result = await engine.executeByTags(['validation'], {
        orderAmount: 100,
        customerAge: 25,
      });

      expect(result.results.size).toBe(1);
      expect(result.results.has('validation/order-validation')).toBe(true);
      expect(result.results.get('validation/order-validation')).toEqual({ valid: true });
    });

    it('should handle version checking with local files', async () => {
      // Create test rule files
      await createTestRuleFiles(tempDir);

      const config: MinimalGoRulesConfig = {
        ruleSource: 'local',
        localRulesPath: tempDir,
      };

      engine = new MinimalGoRulesEngine(config);
      await engine.initialize();

      const versionCheck = await engine.checkVersions();

      expect(versionCheck.totalChecked).toBe(3);
      expect(versionCheck.outdatedRules).toHaveLength(0); // All rules are current
    });

    it('should handle hot reload when enabled', async () => {
      // Create test rule files
      await createTestRuleFiles(tempDir);

      const config: MinimalGoRulesConfig = {
        ruleSource: 'local',
        localRulesPath: tempDir,
        enableHotReload: true,
      };

      engine = new MinimalGoRulesEngine(config);
      await engine.initialize();

      // Add a new rule file
      const newRulePath = path.join(tempDir, 'new-rule.json');
      await fs.promises.writeFile(
        newRulePath,
        JSON.stringify({
          name: 'New Rule',
          nodes: [
            { id: 'input', type: 'inputNode' },
            { id: 'output', type: 'outputNode' },
          ],
          edges: [{ id: 'edge1', source: 'input', target: 'output' }],
        }),
      );

      // Wait for hot reload to detect the change
      await new Promise((resolve) => setTimeout(resolve, 500));

      // The new rule should be available
      const metadata = await engine.getRuleMetadata('new-rule');
      expect(metadata?.id).toBe('new-rule');
    });
  });

  describe('Cloud Rule Loading Integration', () => {
    let engine: MinimalGoRulesEngine;

    afterEach(async () => {
      if (engine) {
        await engine.cleanup();
      }
    });

    it('should initialize engine with cloud rule source', async () => {
      // Mock successful cloud API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            rules: [
              {
                id: 'cloud-rule-1',
                name: 'Cloud Rule 1',
                version: '1.0.0',
                tags: ['cloud', 'test'],
                lastModified: new Date().toISOString(),
                content: Buffer.from(
                  JSON.stringify({
                    nodes: [{ id: 'input', type: 'inputNode' }],
                    edges: [],
                  }),
                ).toString('base64'),
              },
            ],
          }),
      });

      const config: MinimalGoRulesConfig = {
        ruleSource: 'cloud',
        apiUrl: 'https://api.gorules.io',
        apiKey: 'test-api-key',
        projectId: 'test-project',
      };

      engine = new MinimalGoRulesEngine(config);
      const status = await engine.initialize();

      expect(status.initialized).toBe(true);
      expect(status.rulesLoaded).toBe(1);
      expect(status.ruleSource).toBe('cloud');
    });

    it('should fallback to cloud when ruleSource is not specified', async () => {
      // Mock successful cloud API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ rules: [] }),
      });

      const config: MinimalGoRulesConfig = {
        // No ruleSource specified - should default to cloud
        apiUrl: 'https://api.gorules.io',
        apiKey: 'test-api-key',
        projectId: 'test-project',
      };

      engine = new MinimalGoRulesEngine(config);
      const status = await engine.initialize();

      expect(status.initialized).toBe(true);
      expect(status.ruleSource).toBe('cloud');
    });
  });

  describe('Configuration Validation Integration', () => {
    it('should reject invalid local configuration', async () => {
      const config: MinimalGoRulesConfig = {
        ruleSource: 'local',
        // Missing localRulesPath
      };

      expect(() => new MinimalGoRulesEngine(config)).toThrow(MinimalGoRulesError);
    });

    it('should reject invalid cloud configuration', async () => {
      const config: MinimalGoRulesConfig = {
        ruleSource: 'cloud',
        // Missing required cloud properties
      };

      expect(() => new MinimalGoRulesEngine(config)).toThrow(MinimalGoRulesError);
    });

    it('should reject non-existent local rules path', async () => {
      const config: MinimalGoRulesConfig = {
        ruleSource: 'local',
        localRulesPath: '/non/existent/path',
      };

      expect(() => new MinimalGoRulesEngine(config)).toThrow(MinimalGoRulesError);
    });
  });

  describe('Backward Compatibility', () => {
    let engine: MinimalGoRulesEngine;

    afterEach(async () => {
      if (engine) {
        await engine.cleanup();
      }
    });

    it('should work with existing cloud-only configurations', async () => {
      // Mock successful cloud API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ rules: [] }),
      });

      // Legacy configuration without ruleSource
      const legacyConfig: MinimalGoRulesConfig = {
        apiUrl: 'https://api.gorules.io',
        apiKey: 'test-api-key',
        projectId: 'test-project',
        cacheMaxSize: 500,
        httpTimeout: 10000,
      };

      engine = new MinimalGoRulesEngine(legacyConfig);
      const status = await engine.initialize();

      expect(status.initialized).toBe(true);
      expect(status.ruleSource).toBe('cloud');
    });

    it('should maintain same API interface for both rule sources', async () => {
      // Test local configuration
      await createTestRuleFiles(tempDir);

      const localConfig: MinimalGoRulesConfig = {
        ruleSource: 'local',
        localRulesPath: tempDir,
      };

      const localEngine = new MinimalGoRulesEngine(localConfig);
      await localEngine.initialize();

      // Test that all expected methods exist and work
      expect(typeof localEngine.executeRule).toBe('function');
      expect(typeof localEngine.executeRules).toBe('function');
      expect(typeof localEngine.executeByTags).toBe('function');
      expect(typeof localEngine.getRuleMetadata).toBe('function');
      expect(typeof localEngine.getAllRuleMetadata).toBe('function');
      expect(typeof localEngine.getRulesByTags).toBe('function');
      expect(typeof localEngine.checkVersions).toBe('function');
      expect(typeof localEngine.refreshCache).toBe('function');
      expect(typeof localEngine.getStatus).toBe('function');
      expect(typeof localEngine.getCacheStats).toBe('function');

      await localEngine.cleanup();
    });
  });

  describe('Error Handling Integration', () => {
    let engine: MinimalGoRulesEngine;

    afterEach(async () => {
      if (engine) {
        await engine.cleanup();
      }
    });

    it('should handle invalid JSON files gracefully', async () => {
      // Create directory with invalid JSON file
      const invalidJsonPath = path.join(tempDir, 'invalid-rule.json');
      await fs.promises.writeFile(invalidJsonPath, '{ invalid json content');

      const config: MinimalGoRulesConfig = {
        ruleSource: 'local',
        localRulesPath: tempDir,
      };

      engine = new MinimalGoRulesEngine(config);

      // Should handle invalid JSON gracefully during initialization
      await expect(engine.initialize()).rejects.toThrow(MinimalGoRulesError);
    });

    it('should handle missing rule files gracefully', async () => {
      // Create valid rule files
      await createTestRuleFiles(tempDir);

      const config: MinimalGoRulesConfig = {
        ruleSource: 'local',
        localRulesPath: tempDir,
      };

      engine = new MinimalGoRulesEngine(config);
      await engine.initialize();

      // Try to execute non-existent rule
      await expect(engine.executeRule('non-existent-rule', {})).rejects.toThrow(
        MinimalGoRulesError,
      );
    });

    it('should handle file system permission errors', async () => {
      // Create a directory that we can't read (simulate permission error)
      const restrictedDir = path.join(tempDir, 'restricted');
      await fs.promises.mkdir(restrictedDir);

      const config: MinimalGoRulesConfig = {
        ruleSource: 'local',
        localRulesPath: restrictedDir,
      };

      engine = new MinimalGoRulesEngine(config);

      // Should handle permission errors gracefully
      const status = await engine.initialize();
      expect(status.initialized).toBe(true);
      expect(status.rulesLoaded).toBe(0); // No rules loaded due to empty directory
    });
  });

  describe('Performance Integration', () => {
    let engine: MinimalGoRulesEngine;

    afterEach(async () => {
      if (engine) {
        await engine.cleanup();
      }
    });

    it('should load local rules efficiently', async () => {
      // Create multiple rule files
      await createMultipleTestRules(tempDir, 10);

      const config: MinimalGoRulesConfig = {
        ruleSource: 'local',
        localRulesPath: tempDir,
        enablePerformanceOptimizations: true,
      };

      engine = new MinimalGoRulesEngine(config);

      const startTime = Date.now();
      const status = await engine.initialize();
      const endTime = Date.now();

      expect(status.initialized).toBe(true);
      expect(status.rulesLoaded).toBe(10);

      // Should load rules reasonably quickly (less than 1 second for 10 rules)
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('should cache file stats for performance', async () => {
      // Create test rule files
      await createTestRuleFiles(tempDir);

      const config: MinimalGoRulesConfig = {
        ruleSource: 'local',
        localRulesPath: tempDir,
      };

      engine = new MinimalGoRulesEngine(config);
      await engine.initialize();

      // Multiple version checks should use cached stats
      const startTime = Date.now();
      await engine.checkVersions();
      await engine.checkVersions();
      await engine.checkVersions();
      const endTime = Date.now();

      // Should be fast due to caching
      expect(endTime - startTime).toBeLessThan(100);
    });
  });
});

/**
 * Helper function to create test rule files
 */
async function createTestRuleFiles(baseDir: string): Promise<void> {
  // Create directory structure
  const pricingDir = path.join(baseDir, 'pricing');
  const validationDir = path.join(baseDir, 'validation');
  const approvalDir = path.join(baseDir, 'approval');

  await fs.promises.mkdir(pricingDir, { recursive: true });
  await fs.promises.mkdir(validationDir, { recursive: true });
  await fs.promises.mkdir(approvalDir, { recursive: true });

  // Create rule files
  await fs.promises.writeFile(
    path.join(pricingDir, 'shipping-fees.json'),
    JSON.stringify({
      name: 'Shipping Fee Calculation',
      nodes: [
        { id: 'input', type: 'inputNode' },
        { id: 'calculation', type: 'decisionNode' },
        { id: 'output', type: 'outputNode' },
      ],
      edges: [
        { id: 'edge1', source: 'input', target: 'calculation' },
        { id: 'edge2', source: 'calculation', target: 'output' },
      ],
    }),
  );

  await fs.promises.writeFile(
    path.join(validationDir, 'order-validation.json'),
    JSON.stringify({
      name: 'Order Validation',
      nodes: [
        { id: 'input', type: 'inputNode' },
        { id: 'validation', type: 'decisionNode' },
        { id: 'output', type: 'outputNode' },
      ],
      edges: [
        { id: 'edge1', source: 'input', target: 'validation' },
        { id: 'edge2', source: 'validation', target: 'output' },
      ],
    }),
  );

  await fs.promises.writeFile(
    path.join(approvalDir, 'workflow-rules.json'),
    JSON.stringify({
      name: 'Workflow Rules',
      nodes: [
        { id: 'input', type: 'inputNode' },
        { id: 'workflow', type: 'decisionNode' },
        { id: 'output', type: 'outputNode' },
      ],
      edges: [
        { id: 'edge1', source: 'input', target: 'workflow' },
        { id: 'edge2', source: 'workflow', target: 'output' },
      ],
    }),
  );

  // Create metadata files
  await fs.promises.writeFile(
    path.join(pricingDir, 'shipping-fees.meta.json'),
    JSON.stringify({
      version: '1.0.0',
      tags: ['pricing', 'shipping'],
      description: 'Calculates shipping fees based on weight and distance',
      author: 'test-team',
    }),
  );

  await fs.promises.writeFile(
    path.join(validationDir, 'order-validation.meta.json'),
    JSON.stringify({
      version: '1.1.0',
      tags: ['validation', 'orders'],
      description: 'Validates order data and business rules',
      author: 'validation-team',
    }),
  );

  await fs.promises.writeFile(
    path.join(approvalDir, 'workflow-rules.meta.json'),
    JSON.stringify({
      version: '2.0.0',
      tags: ['approval', 'workflow'],
      description: 'Manages approval workflow logic',
      author: 'workflow-team',
    }),
  );
}

/**
 * Helper function to create multiple test rules for performance testing
 */
async function createMultipleTestRules(baseDir: string, count: number): Promise<void> {
  for (let i = 1; i <= count; i++) {
    const ruleContent = {
      name: `Test Rule ${i}`,
      nodes: [
        { id: 'input', type: 'inputNode' },
        { id: `decision${i}`, type: 'decisionNode' },
        { id: 'output', type: 'outputNode' },
      ],
      edges: [
        { id: 'edge1', source: 'input', target: `decision${i}` },
        { id: 'edge2', source: `decision${i}`, target: 'output' },
      ],
    };

    await fs.promises.writeFile(
      path.join(baseDir, `test-rule-${i}.json`),
      JSON.stringify(ruleContent),
    );

    // Create metadata for some rules
    if (i % 3 === 0) {
      const metadataContent = {
        version: `1.${i}.0`,
        tags: ['test', `group${i % 3}`],
        description: `Test rule number ${i}`,
        author: 'test-suite',
      };

      await fs.promises.writeFile(
        path.join(baseDir, `test-rule-${i}.meta.json`),
        JSON.stringify(metadataContent),
      );
    }
  }
}
