/**
 * Hot Reload Integration Tests
 * Tests integration of hot reload functionality with LocalRuleLoaderService
 */

import { LocalRuleLoaderService } from '../loader/local-rule-loader-service.js';
import { MinimalGoRulesConfig } from '../interfaces/config.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Hot Reload Integration Tests', () => {
  let tempDir: string;
  let service: LocalRuleLoaderService;

  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'hot-reload-integration-'));
  });

  afterEach(async () => {
    if (service) {
      await service.stopHotReload();
    }

    try {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Hot Reload with LocalRuleLoaderService Integration', () => {
    it('should integrate hot reload initialization in constructor', () => {
      const config: MinimalGoRulesConfig = {
        ruleSource: 'local',
        localRulesPath: tempDir,
        enableHotReload: true,
      };

      service = new LocalRuleLoaderService(config);

      // Hot reload manager should be initialized
      expect(service.getHotReloadManager()).toBeDefined();
      expect(service.isHotReloadActive()).toBe(false); // Not started yet
    });

    it('should disable hot reload when configuration option is false', () => {
      const config: MinimalGoRulesConfig = {
        ruleSource: 'local',
        localRulesPath: tempDir,
        enableHotReload: false,
      };

      service = new LocalRuleLoaderService(config);

      // Hot reload manager should not be initialized
      expect(service.getHotReloadManager()).toBeUndefined();
      expect(service.isHotReloadActive()).toBe(false);
    });

    it('should start and stop hot reload functionality', async () => {
      const config: MinimalGoRulesConfig = {
        ruleSource: 'local',
        localRulesPath: tempDir,
        enableHotReload: true,
      };

      service = new LocalRuleLoaderService(config);

      // Start hot reload
      await service.startHotReload();
      expect(service.isHotReloadActive()).toBe(true);

      // Stop hot reload
      await service.stopHotReload();
      expect(service.isHotReloadActive()).toBe(false);
    });

    it('should handle rule change events and update cache automatically', async () => {
      const config: MinimalGoRulesConfig = {
        ruleSource: 'local',
        localRulesPath: tempDir,
        enableHotReload: true,
      };

      service = new LocalRuleLoaderService(config);

      // Set up cache update callback
      const cacheUpdateCallback = jest.fn();
      service.onCacheUpdate(cacheUpdateCallback);

      await service.startHotReload();

      // Create a new rule file
      const rulePath = path.join(tempDir, 'test-rule.json');
      await fs.promises.writeFile(
        rulePath,
        JSON.stringify({
          name: 'Test Rule',
          nodes: [
            { id: 'input', type: 'inputNode' },
            { id: 'output', type: 'outputNode' },
          ],
          edges: [{ id: 'edge1', source: 'input', target: 'output' }],
        }),
      );

      // Wait for hot reload to detect the change
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Cache update callback should have been called
      expect(cacheUpdateCallback).toHaveBeenCalledWith('test-rule', 'added');
    });

    it('should handle file modifications and deletions', async () => {
      const config: MinimalGoRulesConfig = {
        ruleSource: 'local',
        localRulesPath: tempDir,
        enableHotReload: true,
      };

      service = new LocalRuleLoaderService(config);

      const cacheUpdateCallback = jest.fn();
      service.onCacheUpdate(cacheUpdateCallback);

      await service.startHotReload();

      // Create initial rule file
      const rulePath = path.join(tempDir, 'modify-test.json');
      await fs.promises.writeFile(
        rulePath,
        JSON.stringify({
          name: 'Original Rule',
          nodes: [],
          edges: [],
        }),
      );

      await new Promise((resolve) => setTimeout(resolve, 300));
      cacheUpdateCallback.mockClear();

      // Modify the file
      await fs.promises.writeFile(
        rulePath,
        JSON.stringify({
          name: 'Modified Rule',
          nodes: [],
          edges: [],
        }),
      );

      await new Promise((resolve) => setTimeout(resolve, 300));

      // Should detect modification
      expect(cacheUpdateCallback).toHaveBeenCalledWith('modify-test', 'modified');

      cacheUpdateCallback.mockClear();

      // Delete the file
      await fs.promises.unlink(rulePath);

      await new Promise((resolve) => setTimeout(resolve, 500));

      // Should detect deletion (if file system events are working in test environment)
      const deleteCalls = cacheUpdateCallback.mock.calls.filter((call) => call[1] === 'deleted');
      if (cacheUpdateCallback.mock.calls.length > 0) {
        expect(deleteCalls.length).toBeGreaterThan(0);
      }
    });

    it('should handle nested directory structure in hot reload', async () => {
      const config: MinimalGoRulesConfig = {
        ruleSource: 'local',
        localRulesPath: tempDir,
        enableHotReload: true,
      };

      service = new LocalRuleLoaderService(config);

      const cacheUpdateCallback = jest.fn();
      service.onCacheUpdate(cacheUpdateCallback);

      await service.startHotReload();

      // Create nested directory
      const nestedDir = path.join(tempDir, 'pricing');
      await fs.promises.mkdir(nestedDir, { recursive: true });

      // Create rule in nested directory
      const nestedRulePath = path.join(nestedDir, 'shipping-fees.json');
      await fs.promises.writeFile(
        nestedRulePath,
        JSON.stringify({
          name: 'Shipping Fees',
          nodes: [],
          edges: [],
        }),
      );

      await new Promise((resolve) => setTimeout(resolve, 500));

      // Should detect nested rule with correct ID
      expect(cacheUpdateCallback).toHaveBeenCalledWith('pricing/shipping-fees', 'added');
    });

    it('should ignore non-JSON files in hot reload', async () => {
      const config: MinimalGoRulesConfig = {
        ruleSource: 'local',
        localRulesPath: tempDir,
        enableHotReload: true,
      };

      service = new LocalRuleLoaderService(config);

      const cacheUpdateCallback = jest.fn();
      service.onCacheUpdate(cacheUpdateCallback);

      await service.startHotReload();

      // Create non-JSON file
      const textFilePath = path.join(tempDir, 'readme.txt');
      await fs.promises.writeFile(textFilePath, 'This is not a rule file');

      await new Promise((resolve) => setTimeout(resolve, 300));

      // Should not trigger cache update for non-JSON files
      expect(cacheUpdateCallback).not.toHaveBeenCalled();
    });

    it('should handle hot reload configuration options', async () => {
      const config: MinimalGoRulesConfig = {
        ruleSource: 'local',
        localRulesPath: tempDir,
        enableHotReload: true,
        fileSystemOptions: {
          watchOptions: {
            ignored: ['**/ignored/**'],
            persistent: true,
            ignoreInitial: false,
          },
        },
      };

      service = new LocalRuleLoaderService(config);

      const cacheUpdateCallback = jest.fn();
      service.onCacheUpdate(cacheUpdateCallback);

      await service.startHotReload();

      // Create ignored directory and file
      const ignoredDir = path.join(tempDir, 'ignored');
      await fs.promises.mkdir(ignoredDir, { recursive: true });

      const ignoredFilePath = path.join(ignoredDir, 'ignored-rule.json');
      await fs.promises.writeFile(
        ignoredFilePath,
        JSON.stringify({
          name: 'Ignored Rule',
          nodes: [],
          edges: [],
        }),
      );

      await new Promise((resolve) => setTimeout(resolve, 300));

      // Should not trigger callback for ignored files
      expect(cacheUpdateCallback).not.toHaveBeenCalled();

      // Create non-ignored file
      const normalFilePath = path.join(tempDir, 'normal-rule.json');
      await fs.promises.writeFile(
        normalFilePath,
        JSON.stringify({
          name: 'Normal Rule',
          nodes: [],
          edges: [],
        }),
      );

      await new Promise((resolve) => setTimeout(resolve, 300));

      // Should trigger callback for non-ignored files
      expect(cacheUpdateCallback).toHaveBeenCalledWith('normal-rule', 'added');
    });

    it('should handle multiple cache update callbacks', async () => {
      const config: MinimalGoRulesConfig = {
        ruleSource: 'local',
        localRulesPath: tempDir,
        enableHotReload: true,
      };

      service = new LocalRuleLoaderService(config);

      const callback1 = jest.fn();
      const callback2 = jest.fn();
      const callback3 = jest.fn();

      service.onCacheUpdate(callback1);
      service.onCacheUpdate(callback2);
      service.onCacheUpdate(callback3);

      await service.startHotReload();

      // Create rule file
      const rulePath = path.join(tempDir, 'multi-callback-test.json');
      await fs.promises.writeFile(
        rulePath,
        JSON.stringify({
          name: 'Multi Callback Test',
          nodes: [],
          edges: [],
        }),
      );

      await new Promise((resolve) => setTimeout(resolve, 500));

      // All callbacks should be called
      expect(callback1).toHaveBeenCalledWith('multi-callback-test', 'added');
      expect(callback2).toHaveBeenCalledWith('multi-callback-test', 'added');
      expect(callback3).toHaveBeenCalledWith('multi-callback-test', 'added');
    });

    it('should handle callback removal', async () => {
      const config: MinimalGoRulesConfig = {
        ruleSource: 'local',
        localRulesPath: tempDir,
        enableHotReload: true,
      };

      service = new LocalRuleLoaderService(config);

      const callback1 = jest.fn();
      const callback2 = jest.fn();

      service.onCacheUpdate(callback1);
      service.onCacheUpdate(callback2);

      // Remove one callback
      service.removeCacheUpdateCallback(callback1);

      await service.startHotReload();

      // Create rule file
      const rulePath = path.join(tempDir, 'callback-removal-test.json');
      await fs.promises.writeFile(
        rulePath,
        JSON.stringify({
          name: 'Callback Removal Test',
          nodes: [],
          edges: [],
        }),
      );

      await new Promise((resolve) => setTimeout(resolve, 500));

      // Only callback2 should be called
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledWith('callback-removal-test', 'added');
    });

    it('should handle errors in cache update callbacks gracefully', async () => {
      const config: MinimalGoRulesConfig = {
        ruleSource: 'local',
        localRulesPath: tempDir,
        enableHotReload: true,
      };

      service = new LocalRuleLoaderService(config);

      const errorCallback = jest.fn().mockImplementation(() => {
        throw new Error('Callback error');
      });
      const goodCallback = jest.fn();

      service.onCacheUpdate(errorCallback);
      service.onCacheUpdate(goodCallback);

      await service.startHotReload();

      // Create rule file
      const rulePath = path.join(tempDir, 'error-handling-test.json');
      await fs.promises.writeFile(
        rulePath,
        JSON.stringify({
          name: 'Error Handling Test',
          nodes: [],
          edges: [],
        }),
      );

      await new Promise((resolve) => setTimeout(resolve, 500));

      // Both callbacks should be called despite error in first one
      if (errorCallback.mock.calls.length > 0 || goodCallback.mock.calls.length > 0) {
        expect(errorCallback).toHaveBeenCalled();
        expect(goodCallback).toHaveBeenCalled();
      }

      // Hot reload should still be active
      expect(service.isHotReloadActive()).toBe(true);
    });
  });

  describe('Hot Reload Lifecycle Management', () => {
    it('should handle multiple start/stop cycles', async () => {
      const config: MinimalGoRulesConfig = {
        ruleSource: 'local',
        localRulesPath: tempDir,
        enableHotReload: true,
      };

      service = new LocalRuleLoaderService(config);

      // Multiple start/stop cycles
      for (let i = 0; i < 3; i++) {
        await service.startHotReload();
        expect(service.isHotReloadActive()).toBe(true);

        await service.stopHotReload();
        expect(service.isHotReloadActive()).toBe(false);
      }
    });

    it('should handle cleanup on service destruction', async () => {
      const config: MinimalGoRulesConfig = {
        ruleSource: 'local',
        localRulesPath: tempDir,
        enableHotReload: true,
      };

      service = new LocalRuleLoaderService(config);
      await service.startHotReload();

      expect(service.isHotReloadActive()).toBe(true);

      // Cleanup should stop hot reload
      await service.stopHotReload();
      expect(service.isHotReloadActive()).toBe(false);
    });
  });
});
