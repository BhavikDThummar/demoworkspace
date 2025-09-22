/**
 * Unit tests for Version Manager
 * Tests version detection, conflict resolution, and rollback capabilities
 */

import {
  VersionManager,
  VersionComparisonResult,
  VersionConflict,
  CacheInvalidationOptions,
} from './version-manager.js';
import { IRuleCacheManager, IRuleLoaderService, MinimalRuleMetadata } from '../interfaces/index.js';
import { MinimalGoRulesError } from '../errors/index.js';

// Mock implementations
class MockCacheManager implements IRuleCacheManager {
  private rules = new Map<string, Buffer>();
  private metadata = new Map<string, MinimalRuleMetadata>();

  async get(ruleId: string): Promise<Buffer | null> {
    return this.rules.get(ruleId) || null;
  }

  async set(ruleId: string, data: Buffer, metadata: MinimalRuleMetadata): Promise<void> {
    this.rules.set(ruleId, data);
    this.metadata.set(ruleId, metadata);
  }

  async getMetadata(ruleId: string): Promise<MinimalRuleMetadata | null> {
    return this.metadata.get(ruleId) || null;
  }

  async getMultiple(ruleIds: string[]): Promise<Map<string, Buffer>> {
    const result = new Map<string, Buffer>();
    for (const ruleId of ruleIds) {
      const data = this.rules.get(ruleId);
      if (data) {
        result.set(ruleId, data);
      }
    }
    return result;
  }

  async setMultiple(
    rules: Map<string, { data: Buffer; metadata: MinimalRuleMetadata }>,
  ): Promise<void> {
    for (const [ruleId, { data, metadata }] of rules) {
      await this.set(ruleId, data, metadata);
    }
  }

  async getRulesByTags(tags: string[]): Promise<string[]> {
    const result: string[] = [];
    for (const [ruleId, metadata] of this.metadata) {
      if (tags.some((tag) => metadata.tags.includes(tag))) {
        result.push(ruleId);
      }
    }
    return result;
  }

  async isVersionCurrent(ruleId: string, version: string): Promise<boolean> {
    const metadata = this.metadata.get(ruleId);
    return metadata ? metadata.version === version : false;
  }

  async invalidate(ruleId: string): Promise<void> {
    this.rules.delete(ruleId);
    this.metadata.delete(ruleId);
  }

  async clear(): Promise<void> {
    this.rules.clear();
    this.metadata.clear();
  }

  async getAllMetadata(): Promise<Map<string, MinimalRuleMetadata>> {
    return new Map(this.metadata);
  }

  // Helper methods for testing
  setTestData(ruleId: string, data: Buffer, metadata: MinimalRuleMetadata): void {
    this.rules.set(ruleId, data);
    this.metadata.set(ruleId, metadata);
  }

  hasRule(ruleId: string): boolean {
    return this.rules.has(ruleId);
  }
}

class MockLoaderService implements IRuleLoaderService {
  private cloudRules = new Map<string, { data: Buffer; metadata: MinimalRuleMetadata }>();
  private shouldFailLoad = new Set<string>();

  async loadAllRules(): Promise<Map<string, { data: Buffer; metadata: MinimalRuleMetadata }>> {
    return new Map(this.cloudRules);
  }

  async loadRule(ruleId: string): Promise<{ data: Buffer; metadata: MinimalRuleMetadata }> {
    if (this.shouldFailLoad.has(ruleId)) {
      throw new Error(`Failed to load rule ${ruleId}`);
    }

    const rule = this.cloudRules.get(ruleId);
    if (!rule) {
      throw new Error(`Rule ${ruleId} not found`);
    }
    return rule;
  }

  async checkVersions(rules: Map<string, string>): Promise<Map<string, boolean>> {
    const result = new Map<string, boolean>();
    for (const [ruleId, localVersion] of rules) {
      const cloudRule = this.cloudRules.get(ruleId);
      if (cloudRule) {
        result.set(ruleId, cloudRule.metadata.version !== localVersion);
      } else {
        result.set(ruleId, true); // Rule not found, needs update
      }
    }
    return result;
  }

  async refreshRule(ruleId: string): Promise<{ data: Buffer; metadata: MinimalRuleMetadata }> {
    return this.loadRule(ruleId);
  }

  // Helper methods for testing
  setCloudRule(ruleId: string, data: Buffer, metadata: MinimalRuleMetadata): void {
    this.cloudRules.set(ruleId, { data, metadata });
  }

  setLoadFailure(ruleId: string, shouldFail: boolean): void {
    if (shouldFail) {
      this.shouldFailLoad.add(ruleId);
    } else {
      this.shouldFailLoad.delete(ruleId);
    }
  }

  removeCloudRule(ruleId: string): void {
    this.cloudRules.delete(ruleId);
  }
}

describe('VersionManager', () => {
  let versionManager: VersionManager;
  let mockCache: MockCacheManager;
  let mockLoader: MockLoaderService;

  beforeEach(() => {
    mockCache = new MockCacheManager();
    mockLoader = new MockLoaderService();
    versionManager = new VersionManager(mockCache, mockLoader);
  });

  describe('compareVersions', () => {
    it('should detect version differences correctly', async () => {
      // Setup local cache with v1.0.0
      const localData = Buffer.from('{"local": "data"}');
      const localMetadata: MinimalRuleMetadata = {
        id: 'rule1',
        version: '1.0.0',
        tags: ['test'],
        lastModified: 1000,
      };
      mockCache.setTestData('rule1', localData, localMetadata);

      // Setup cloud with v1.1.0
      const cloudData = Buffer.from('{"cloud": "data"}');
      const cloudMetadata: MinimalRuleMetadata = {
        id: 'rule1',
        version: '1.1.0',
        tags: ['test'],
        lastModified: 2000,
      };
      mockLoader.setCloudRule('rule1', cloudData, cloudMetadata);

      const results = await versionManager.compareVersions(['rule1']);

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        ruleId: 'rule1',
        localVersion: '1.0.0',
        cloudVersion: '1.1.0',
        needsUpdate: true,
        versionDiff: 'minor',
        lastModified: {
          local: 1000,
          cloud: 2000,
        },
      });
    });

    it('should handle rules that are up to date', async () => {
      const data = Buffer.from('{"same": "data"}');
      const metadata: MinimalRuleMetadata = {
        id: 'rule1',
        version: '1.0.0',
        tags: ['test'],
        lastModified: 1000,
      };

      mockCache.setTestData('rule1', data, metadata);
      mockLoader.setCloudRule('rule1', data, metadata);

      const results = await versionManager.compareVersions(['rule1']);

      expect(results).toHaveLength(1);
      expect(results[0].needsUpdate).toBe(false);
      expect(results[0].versionDiff).toBe('same');
    });

    it('should handle missing cloud rules', async () => {
      const localData = Buffer.from('{"local": "data"}');
      const localMetadata: MinimalRuleMetadata = {
        id: 'rule1',
        version: '1.0.0',
        tags: ['test'],
        lastModified: 1000,
      };
      mockCache.setTestData('rule1', localData, localMetadata);
      // No cloud rule set

      const results = await versionManager.compareVersions(['rule1']);

      expect(results).toHaveLength(1);
      expect(results[0].cloudVersion).toBe('unknown');
      expect(results[0].needsUpdate).toBe(true);
    });

    it('should compare all cached rules when no ruleIds provided', async () => {
      // Setup multiple rules
      for (let i = 1; i <= 3; i++) {
        const data = Buffer.from(`{"rule": "${i}"}`);
        const metadata: MinimalRuleMetadata = {
          id: `rule${i}`,
          version: '1.0.0',
          tags: ['test'],
          lastModified: 1000,
        };
        mockCache.setTestData(`rule${i}`, data, metadata);
        mockLoader.setCloudRule(`rule${i}`, data, metadata);
      }

      const results = await versionManager.compareVersions();

      expect(results).toHaveLength(3);
      expect(results.map((r) => r.ruleId).sort()).toEqual(['rule1', 'rule2', 'rule3']);
    });
  });

  describe('detectVersionConflicts', () => {
    it('should detect version mismatch conflicts', async () => {
      const localData = Buffer.from('{"local": "data"}');
      const localMetadata: MinimalRuleMetadata = {
        id: 'rule1',
        version: '1.0.0',
        tags: ['test'],
        lastModified: 1000,
      };
      mockCache.setTestData('rule1', localData, localMetadata);

      const cloudData = Buffer.from('{"cloud": "data"}');
      const cloudMetadata: MinimalRuleMetadata = {
        id: 'rule1',
        version: '2.0.0',
        tags: ['test'],
        lastModified: 2000,
      };
      mockLoader.setCloudRule('rule1', cloudData, cloudMetadata);

      const conflicts = await versionManager.detectVersionConflicts(['rule1']);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0]).toEqual({
        ruleId: 'rule1',
        localVersion: '1.0.0',
        cloudVersion: '2.0.0',
        localLastModified: 1000,
        cloudLastModified: 2000,
        conflictType: 'version-mismatch',
      });
    });

    it('should detect rule deletion conflicts', async () => {
      const localData = Buffer.from('{"local": "data"}');
      const localMetadata: MinimalRuleMetadata = {
        id: 'rule1',
        version: '1.0.0',
        tags: ['test'],
        lastModified: 1000,
      };
      mockCache.setTestData('rule1', localData, localMetadata);
      // No cloud rule (deleted)

      const conflicts = await versionManager.detectVersionConflicts(['rule1']);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].conflictType).toBe('rule-deleted');
    });

    it('should return empty array when no conflicts exist', async () => {
      const data = Buffer.from('{"same": "data"}');
      const metadata: MinimalRuleMetadata = {
        id: 'rule1',
        version: '1.0.0',
        tags: ['test'],
        lastModified: 1000,
      };

      mockCache.setTestData('rule1', data, metadata);
      mockLoader.setCloudRule('rule1', data, metadata);

      const conflicts = await versionManager.detectVersionConflicts(['rule1']);

      expect(conflicts).toHaveLength(0);
    });
  });

  describe('autoRefreshCache', () => {
    it('should resolve conflicts using cloud-wins strategy', async () => {
      const localData = Buffer.from('{"local": "data"}');
      const localMetadata: MinimalRuleMetadata = {
        id: 'rule1',
        version: '1.0.0',
        tags: ['test'],
        lastModified: 1000,
      };
      mockCache.setTestData('rule1', localData, localMetadata);

      const cloudData = Buffer.from('{"cloud": "data"}');
      const cloudMetadata: MinimalRuleMetadata = {
        id: 'rule1',
        version: '1.1.0',
        tags: ['test'],
        lastModified: 2000,
      };
      mockLoader.setCloudRule('rule1', cloudData, cloudMetadata);

      const result = await versionManager.autoRefreshCache(['rule1'], {
        strategy: 'cloud-wins',
        createSnapshot: false,
      });

      expect(result.processed).toEqual(['rule1']);
      expect(result.updated).toEqual(['rule1']);
      expect(result.conflicts).toHaveLength(1);
      expect(result.errors.size).toBe(0);

      // Verify cache was updated
      const updatedData = await mockCache.get('rule1');
      const updatedMetadata = await mockCache.getMetadata('rule1');
      expect(updatedData?.toString()).toBe('{"cloud": "data"}');
      expect(updatedMetadata?.version).toBe('1.1.0');
    });

    it('should use newer-wins strategy correctly', async () => {
      const localData = Buffer.from('{"local": "data"}');
      const localMetadata: MinimalRuleMetadata = {
        id: 'rule1',
        version: '1.0.0',
        tags: ['test'],
        lastModified: 2000, // Local is newer
      };
      mockCache.setTestData('rule1', localData, localMetadata);

      const cloudData = Buffer.from('{"cloud": "data"}');
      const cloudMetadata: MinimalRuleMetadata = {
        id: 'rule1',
        version: '1.1.0',
        tags: ['test'],
        lastModified: 1000, // Cloud is older
      };
      mockLoader.setCloudRule('rule1', cloudData, cloudMetadata);

      const result = await versionManager.autoRefreshCache(['rule1'], {
        strategy: 'newer-wins',
        createSnapshot: false,
      });

      expect(result.processed).toEqual(['rule1']);
      expect(result.updated).toEqual([]); // Should not update because local is newer
      expect(result.conflicts).toHaveLength(1);

      // Verify cache was not updated
      const cachedData = await mockCache.get('rule1');
      expect(cachedData?.toString()).toBe('{"local": "data"}');
    });

    it('should handle load failures gracefully', async () => {
      const localData = Buffer.from('{"local": "data"}');
      const localMetadata: MinimalRuleMetadata = {
        id: 'rule1',
        version: '1.0.0',
        tags: ['test'],
        lastModified: 1000,
      };
      mockCache.setTestData('rule1', localData, localMetadata);

      const cloudData = Buffer.from('{"cloud": "data"}');
      const cloudMetadata: MinimalRuleMetadata = {
        id: 'rule1',
        version: '1.1.0',
        tags: ['test'],
        lastModified: 2000,
      };
      mockLoader.setCloudRule('rule1', cloudData, cloudMetadata);
      mockLoader.setLoadFailure('rule1', true); // Make load fail

      const result = await versionManager.autoRefreshCache(['rule1'], {
        strategy: 'cloud-wins',
        createSnapshot: false,
      });

      expect(result.processed).toEqual(['rule1']);
      expect(result.updated).toEqual([]);
      expect(result.errors.size).toBe(1);
      expect(result.errors.has('rule1')).toBe(true);
    });

    it('should return early when no conflicts exist', async () => {
      const data = Buffer.from('{"same": "data"}');
      const metadata: MinimalRuleMetadata = {
        id: 'rule1',
        version: '1.0.0',
        tags: ['test'],
        lastModified: 1000,
      };

      mockCache.setTestData('rule1', data, metadata);
      mockLoader.setCloudRule('rule1', data, metadata);

      const result = await versionManager.autoRefreshCache(['rule1']);

      expect(result.processed).toEqual([]);
      expect(result.updated).toEqual([]);
      expect(result.conflicts).toHaveLength(0);
      expect(result.processingTime).toBeGreaterThan(0);
    });
  });

  describe('invalidateRules', () => {
    it('should invalidate and reload rules successfully', async () => {
      const oldData = Buffer.from('{"old": "data"}');
      const oldMetadata: MinimalRuleMetadata = {
        id: 'rule1',
        version: '1.0.0',
        tags: ['test'],
        lastModified: 1000,
      };
      mockCache.setTestData('rule1', oldData, oldMetadata);

      const newData = Buffer.from('{"new": "data"}');
      const newMetadata: MinimalRuleMetadata = {
        id: 'rule1',
        version: '1.1.0',
        tags: ['test'],
        lastModified: 2000,
      };
      mockLoader.setCloudRule('rule1', newData, newMetadata);

      const result = await versionManager.invalidateRules(['rule1'], {
        createSnapshot: false,
        validateAfterUpdate: true,
      });

      expect(result.processed).toEqual(['rule1']);
      expect(result.updated).toEqual(['rule1']);
      expect(result.errors.size).toBe(0);

      // Verify cache was updated
      const updatedData = await mockCache.get('rule1');
      const updatedMetadata = await mockCache.getMetadata('rule1');
      expect(updatedData?.toString()).toBe('{"new": "data"}');
      expect(updatedMetadata?.version).toBe('1.1.0');
    });

    it('should retry on failures', async () => {
      const oldData = Buffer.from('{"old": "data"}');
      const oldMetadata: MinimalRuleMetadata = {
        id: 'rule1',
        version: '1.0.0',
        tags: ['test'],
        lastModified: 1000,
      };
      mockCache.setTestData('rule1', oldData, oldMetadata);

      const newData = Buffer.from('{"new": "data"}');
      const newMetadata: MinimalRuleMetadata = {
        id: 'rule1',
        version: '1.1.0',
        tags: ['test'],
        lastModified: 2000,
      };
      mockLoader.setCloudRule('rule1', newData, newMetadata);

      // Make first attempt fail, then succeed
      let loadAttempts = 0;
      const originalLoadRule = mockLoader.loadRule.bind(mockLoader);
      mockLoader.loadRule = async (ruleId: string) => {
        loadAttempts++;
        if (loadAttempts === 1) {
          throw new Error('First attempt fails');
        }
        return originalLoadRule(ruleId);
      };

      const result = await versionManager.invalidateRules(['rule1'], {
        createSnapshot: false,
        maxRetries: 2,
        retryDelay: 10,
      });

      expect(result.processed).toEqual(['rule1']);
      expect(result.updated).toEqual(['rule1']);
      expect(result.errors.size).toBe(0);
      expect(loadAttempts).toBe(2);
    });

    it('should handle validation failures', async () => {
      const oldData = Buffer.from('{"old": "data"}');
      const oldMetadata: MinimalRuleMetadata = {
        id: 'rule1',
        version: '1.0.0',
        tags: ['test'],
        lastModified: 1000,
      };
      mockCache.setTestData('rule1', oldData, oldMetadata);

      const newData = Buffer.from('{"new": "data"}');
      const newMetadata: MinimalRuleMetadata = {
        id: 'rule1',
        version: '1.1.0',
        tags: ['test'],
        lastModified: 2000,
      };
      mockLoader.setCloudRule('rule1', newData, newMetadata);

      // Mock cache.get to return different data (validation failure)
      const originalGet = mockCache.get.bind(mockCache);
      mockCache.get = async (ruleId: string) => {
        const result = await originalGet(ruleId);
        if (result && ruleId === 'rule1') {
          return Buffer.from('{"different": "data"}'); // Different from what was set
        }
        return result;
      };

      const result = await versionManager.invalidateRules(['rule1'], {
        createSnapshot: false,
        validateAfterUpdate: true,
        maxRetries: 1,
      });

      expect(result.processed).toEqual(['rule1']);
      expect(result.updated).toEqual([]);
      expect(result.errors.size).toBe(1);
      expect(result.errors.get('rule1')?.message).toContain('Validation failed');
    });
  });

  describe('rollback functionality', () => {
    it('should create and use rollback snapshots', async () => {
      const originalData = Buffer.from('{"original": "data"}');
      const originalMetadata: MinimalRuleMetadata = {
        id: 'rule1',
        version: '1.0.0',
        tags: ['test'],
        lastModified: 1000,
      };
      mockCache.setTestData('rule1', originalData, originalMetadata);

      // Create snapshot
      await versionManager.createRollbackSnapshot('rule1', 'test-snapshot');

      // Update rule
      const newData = Buffer.from('{"new": "data"}');
      const newMetadata: MinimalRuleMetadata = {
        id: 'rule1',
        version: '1.1.0',
        tags: ['test'],
        lastModified: 2000,
      };
      await mockCache.set('rule1', newData, newMetadata);

      // Verify update
      let currentData = await mockCache.get('rule1');
      expect(currentData?.toString()).toBe('{"new": "data"}');

      // Rollback
      const rollbackSuccess = await versionManager.rollbackRule('rule1');
      expect(rollbackSuccess).toBe(true);

      // Verify rollback
      currentData = await mockCache.get('rule1');
      const currentMetadata = await mockCache.getMetadata('rule1');
      expect(currentData?.toString()).toBe('{"original": "data"}');
      expect(currentMetadata?.version).toBe('1.0.0');
    });

    it('should manage multiple snapshots per rule', async () => {
      const data1 = Buffer.from('{"version": "1"}');
      const metadata1: MinimalRuleMetadata = {
        id: 'rule1',
        version: '1.0.0',
        tags: ['test'],
        lastModified: 1000,
      };
      mockCache.setTestData('rule1', data1, metadata1);

      // Create first snapshot
      await versionManager.createRollbackSnapshot('rule1', 'snapshot-1');

      // Update and create second snapshot
      const data2 = Buffer.from('{"version": "2"}');
      const metadata2: MinimalRuleMetadata = {
        id: 'rule1',
        version: '1.1.0',
        tags: ['test'],
        lastModified: 2000,
      };
      await mockCache.set('rule1', data2, metadata2);
      await versionManager.createRollbackSnapshot('rule1', 'snapshot-2');

      // Update again
      const data3 = Buffer.from('{"version": "3"}');
      const metadata3: MinimalRuleMetadata = {
        id: 'rule1',
        version: '1.2.0',
        tags: ['test'],
        lastModified: 3000,
      };
      await mockCache.set('rule1', data3, metadata3);

      // Get snapshots
      const snapshots = versionManager.getRollbackSnapshots('rule1');
      expect(snapshots).toHaveLength(2);
      expect(snapshots[0].reason).toBe('snapshot-2');
      expect(snapshots[1].reason).toBe('snapshot-1');

      // Rollback to second snapshot (index 1)
      await versionManager.rollbackRule('rule1', 1);

      const currentData = await mockCache.get('rule1');
      const currentMetadata = await mockCache.getMetadata('rule1');
      expect(currentData?.toString()).toBe('{"version": "1"}');
      expect(currentMetadata?.version).toBe('1.0.0');
    });

    it('should handle rollback failures gracefully', async () => {
      // Try to rollback non-existent rule
      await expect(versionManager.rollbackRule('nonexistent')).rejects.toThrow(MinimalGoRulesError);

      // Try to rollback with invalid snapshot index
      const data = Buffer.from('{"test": "data"}');
      const metadata: MinimalRuleMetadata = {
        id: 'rule1',
        version: '1.0.0',
        tags: ['test'],
        lastModified: 1000,
      };
      mockCache.setTestData('rule1', data, metadata);
      await versionManager.createRollbackSnapshot('rule1', 'test');

      await expect(versionManager.rollbackRule('rule1', 5)).rejects.toThrow(MinimalGoRulesError);
    });

    it('should clear snapshots correctly', async () => {
      const data = Buffer.from('{"test": "data"}');
      const metadata: MinimalRuleMetadata = {
        id: 'rule1',
        version: '1.0.0',
        tags: ['test'],
        lastModified: 1000,
      };
      mockCache.setTestData('rule1', data, metadata);
      await versionManager.createRollbackSnapshot('rule1', 'test');

      expect(versionManager.getRollbackSnapshots('rule1')).toHaveLength(1);

      // Clear specific rule snapshots
      versionManager.clearRollbackSnapshots('rule1');
      expect(versionManager.getRollbackSnapshots('rule1')).toHaveLength(0);

      // Create snapshots for multiple rules
      await versionManager.createRollbackSnapshot('rule1', 'test1');
      mockCache.setTestData('rule2', data, { ...metadata, id: 'rule2' });
      await versionManager.createRollbackSnapshot('rule2', 'test2');

      expect(versionManager.getRollbackSnapshots('rule1')).toHaveLength(1);
      expect(versionManager.getRollbackSnapshots('rule2')).toHaveLength(1);

      // Clear all snapshots
      versionManager.clearRollbackSnapshots();
      expect(versionManager.getRollbackSnapshots('rule1')).toHaveLength(0);
      expect(versionManager.getRollbackSnapshots('rule2')).toHaveLength(0);
    });
  });

  describe('getVersionStats', () => {
    it('should return correct statistics', async () => {
      // Create snapshots for multiple rules
      const data = Buffer.from('{"test": "data"}');
      const metadata: MinimalRuleMetadata = {
        id: 'rule1',
        version: '1.0.0',
        tags: ['test'],
        lastModified: 1000,
      };

      mockCache.setTestData('rule1', data, metadata);
      mockCache.setTestData('rule2', data, { ...metadata, id: 'rule2' });

      await versionManager.createRollbackSnapshot('rule1', 'test1');
      await versionManager.createRollbackSnapshot('rule1', 'test2');
      await versionManager.createRollbackSnapshot('rule2', 'test3');

      const stats = versionManager.getVersionStats();

      expect(stats.totalSnapshots).toBe(3);
      expect(stats.snapshotsByRule.get('rule1')).toBe(2);
      expect(stats.snapshotsByRule.get('rule2')).toBe(1);
      expect(stats.oldestSnapshot).toBeGreaterThan(0);
      expect(stats.newestSnapshot).toBeGreaterThan(0);
      expect(stats.newestSnapshot).toBeGreaterThanOrEqual(stats.oldestSnapshot!);
    });

    it('should return empty stats when no snapshots exist', () => {
      const stats = versionManager.getVersionStats();

      expect(stats.totalSnapshots).toBe(0);
      expect(stats.snapshotsByRule.size).toBe(0);
      expect(stats.oldestSnapshot).toBeNull();
      expect(stats.newestSnapshot).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should handle network errors during version comparison', async () => {
      mockCache.setTestData('rule1', Buffer.from('test'), {
        id: 'rule1',
        version: '1.0.0',
        tags: ['test'],
        lastModified: 1000,
      });

      // Mock loader to throw network error
      mockLoader.checkVersions = async () => {
        throw new Error('Network error');
      };

      await expect(versionManager.compareVersions(['rule1'])).rejects.toThrow(MinimalGoRulesError);
    });

    it('should handle cache errors gracefully', async () => {
      // Mock cache to throw error
      mockCache.getMetadata = async () => {
        throw new Error('Cache error');
      };

      await expect(versionManager.compareVersions(['rule1'])).rejects.toThrow(MinimalGoRulesError);
    });
  });
});
