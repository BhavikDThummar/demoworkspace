/**
 * Unit tests for MinimalRuleCacheManager
 */

import { MinimalRuleCacheManager } from './minimal-rule-cache-manager.js';
import { MinimalRuleMetadata } from '../interfaces/index.js';

describe('MinimalRuleCacheManager', () => {
  let cacheManager: MinimalRuleCacheManager;
  
  beforeEach(() => {
    cacheManager = new MinimalRuleCacheManager(3); // Small cache for testing eviction
  });

  describe('Basic Cache Operations', () => {
    it('should store and retrieve rule data', async () => {
      const ruleId = 'test-rule-1';
      const data = Buffer.from('{"rule": "data"}');
      const metadata: MinimalRuleMetadata = {
        id: ruleId,
        version: '1.0.0',
        tags: ['test', 'basic'],
        lastModified: Date.now()
      };

      await cacheManager.set(ruleId, data, metadata);
      
      const retrievedData = await cacheManager.get(ruleId);
      const retrievedMetadata = await cacheManager.getMetadata(ruleId);

      expect(retrievedData).toEqual(data);
      expect(retrievedMetadata).toEqual(metadata);
    });

    it('should return null for non-existent rules', async () => {
      const data = await cacheManager.get('non-existent');
      const metadata = await cacheManager.getMetadata('non-existent');

      expect(data).toBeNull();
      expect(metadata).toBeNull();
    });

    it('should update existing rules', async () => {
      const ruleId = 'test-rule-1';
      const originalData = Buffer.from('{"version": 1}');
      const updatedData = Buffer.from('{"version": 2}');
      
      const originalMetadata: MinimalRuleMetadata = {
        id: ruleId,
        version: '1.0.0',
        tags: ['test'],
        lastModified: Date.now()
      };
      
      const updatedMetadata: MinimalRuleMetadata = {
        id: ruleId,
        version: '2.0.0',
        tags: ['test', 'updated'],
        lastModified: Date.now() + 1000
      };

      await cacheManager.set(ruleId, originalData, originalMetadata);
      await cacheManager.set(ruleId, updatedData, updatedMetadata);

      const retrievedData = await cacheManager.get(ruleId);
      const retrievedMetadata = await cacheManager.getMetadata(ruleId);

      expect(retrievedData).toEqual(updatedData);
      expect(retrievedMetadata).toEqual(updatedMetadata);
    });
  });

  describe('Bulk Operations', () => {
    it('should handle multiple rule operations', async () => {
      const rules = new Map([
        ['rule1', {
          data: Buffer.from('{"rule": 1}'),
          metadata: { id: 'rule1', version: '1.0.0', tags: ['bulk', 'test'], lastModified: Date.now() }
        }],
        ['rule2', {
          data: Buffer.from('{"rule": 2}'),
          metadata: { id: 'rule2', version: '1.0.0', tags: ['bulk'], lastModified: Date.now() }
        }]
      ]);

      await cacheManager.setMultiple(rules);

      const retrievedRules = await cacheManager.getMultiple(['rule1', 'rule2']);
      
      expect(retrievedRules.size).toBe(2);
      expect(retrievedRules.get('rule1')).toEqual(Buffer.from('{"rule": 1}'));
      expect(retrievedRules.get('rule2')).toEqual(Buffer.from('{"rule": 2}'));
    });

    it('should handle partial retrieval for non-existent rules', async () => {
      const ruleId = 'existing-rule';
      const data = Buffer.from('{"exists": true}');
      const metadata: MinimalRuleMetadata = {
        id: ruleId,
        version: '1.0.0',
        tags: ['exists'],
        lastModified: Date.now()
      };

      await cacheManager.set(ruleId, data, metadata);

      const retrievedRules = await cacheManager.getMultiple(['existing-rule', 'non-existent-rule']);
      
      expect(retrievedRules.size).toBe(1);
      expect(retrievedRules.get('existing-rule')).toEqual(data);
      expect(retrievedRules.has('non-existent-rule')).toBe(false);
    });
  });

  describe('Tag Operations', () => {
    beforeEach(async () => {
      // Set up test data with various tags
      const testRules = new Map([
        ['rule1', {
          data: Buffer.from('{"rule": 1}'),
          metadata: { id: 'rule1', version: '1.0.0', tags: ['frontend', 'validation'], lastModified: Date.now() }
        }],
        ['rule2', {
          data: Buffer.from('{"rule": 2}'),
          metadata: { id: 'rule2', version: '1.0.0', tags: ['backend', 'validation'], lastModified: Date.now() }
        }],
        ['rule3', {
          data: Buffer.from('{"rule": 3}'),
          metadata: { id: 'rule3', version: '1.0.0', tags: ['frontend', 'ui'], lastModified: Date.now() }
        }]
      ]);

      await cacheManager.setMultiple(testRules);
    });

    it('should find rules by single tag', async () => {
      const frontendRules = await cacheManager.getRulesByTags(['frontend']);
      const validationRules = await cacheManager.getRulesByTags(['validation']);

      expect(frontendRules.sort()).toEqual(['rule1', 'rule3']);
      expect(validationRules.sort()).toEqual(['rule1', 'rule2']);
    });

    it('should find rules by multiple tags (intersection)', async () => {
      const frontendValidationRules = await cacheManager.getRulesByTags(['frontend', 'validation']);
      
      expect(frontendValidationRules).toEqual(['rule1']);
    });

    it('should return empty array for non-existent tags', async () => {
      const nonExistentRules = await cacheManager.getRulesByTags(['non-existent']);
      
      expect(nonExistentRules).toEqual([]);
    });

    it('should return empty array when no rules match all tags', async () => {
      const noMatchRules = await cacheManager.getRulesByTags(['frontend', 'backend']);
      
      expect(noMatchRules).toEqual([]);
    });

    it('should handle empty tag array', async () => {
      const emptyTagRules = await cacheManager.getRulesByTags([]);
      
      expect(emptyTagRules).toEqual([]);
    });
  });

  describe('LRU Eviction Policy', () => {
    it('should evict least recently used rules when cache is full', async () => {
      // Fill cache to capacity (3 rules)
      await cacheManager.set('rule1', Buffer.from('1'), {
        id: 'rule1', version: '1.0.0', tags: ['test'], lastModified: Date.now()
      });
      await cacheManager.set('rule2', Buffer.from('2'), {
        id: 'rule2', version: '1.0.0', tags: ['test'], lastModified: Date.now()
      });
      await cacheManager.set('rule3', Buffer.from('3'), {
        id: 'rule3', version: '1.0.0', tags: ['test'], lastModified: Date.now()
      });

      expect(cacheManager.size).toBe(3);

      // Access rule1 to make it recently used
      await cacheManager.get('rule1');

      // Add new rule, should evict rule2 (least recently used)
      await cacheManager.set('rule4', Buffer.from('4'), {
        id: 'rule4', version: '1.0.0', tags: ['test'], lastModified: Date.now()
      });

      expect(cacheManager.size).toBe(3);
      expect(await cacheManager.get('rule1')).not.toBeNull(); // Still exists (recently used)
      expect(await cacheManager.get('rule2')).toBeNull(); // Evicted
      expect(await cacheManager.get('rule3')).not.toBeNull(); // Still exists
      expect(await cacheManager.get('rule4')).not.toBeNull(); // Newly added
    });

    it('should update LRU order on access', async () => {
      // Add rules in order
      await cacheManager.set('rule1', Buffer.from('1'), {
        id: 'rule1', version: '1.0.0', tags: ['test'], lastModified: Date.now()
      });
      await cacheManager.set('rule2', Buffer.from('2'), {
        id: 'rule2', version: '1.0.0', tags: ['test'], lastModified: Date.now()
      });
      await cacheManager.set('rule3', Buffer.from('3'), {
        id: 'rule3', version: '1.0.0', tags: ['test'], lastModified: Date.now()
      });

      // Access rule1 to make it most recently used
      await cacheManager.get('rule1');

      // Add new rule, should evict rule2 (now least recently used)
      await cacheManager.set('rule4', Buffer.from('4'), {
        id: 'rule4', version: '1.0.0', tags: ['test'], lastModified: Date.now()
      });

      expect(await cacheManager.get('rule1')).not.toBeNull(); // Recently accessed
      expect(await cacheManager.get('rule2')).toBeNull(); // Evicted
      expect(await cacheManager.get('rule3')).not.toBeNull(); // Still exists
      expect(await cacheManager.get('rule4')).not.toBeNull(); // Newly added
    });

    it('should handle eviction with tag index cleanup', async () => {
      // Fill cache with rules having unique tags
      await cacheManager.set('rule1', Buffer.from('1'), {
        id: 'rule1', version: '1.0.0', tags: ['tag1'], lastModified: Date.now()
      });
      await cacheManager.set('rule2', Buffer.from('2'), {
        id: 'rule2', version: '1.0.0', tags: ['tag2'], lastModified: Date.now()
      });
      await cacheManager.set('rule3', Buffer.from('3'), {
        id: 'rule3', version: '1.0.0', tags: ['tag3'], lastModified: Date.now()
      });

      // Verify tags work before eviction
      expect(await cacheManager.getRulesByTags(['tag2'])).toEqual(['rule2']);

      // Add new rule to trigger eviction of rule1
      await cacheManager.set('rule4', Buffer.from('4'), {
        id: 'rule4', version: '1.0.0', tags: ['tag4'], lastModified: Date.now()
      });

      // Verify tag1 is cleaned up after rule1 eviction
      expect(await cacheManager.getRulesByTags(['tag1'])).toEqual([]);
      expect(await cacheManager.getRulesByTags(['tag2'])).toEqual(['rule2']);
    });
  });

  describe('Version Management', () => {
    it('should check version currency correctly', async () => {
      const ruleId = 'version-test';
      const metadata: MinimalRuleMetadata = {
        id: ruleId,
        version: '1.2.3',
        tags: ['version'],
        lastModified: Date.now()
      };

      await cacheManager.set(ruleId, Buffer.from('test'), metadata);

      expect(await cacheManager.isVersionCurrent(ruleId, '1.2.3')).toBe(true);
      expect(await cacheManager.isVersionCurrent(ruleId, '1.2.4')).toBe(false);
      expect(await cacheManager.isVersionCurrent('non-existent', '1.0.0')).toBe(false);
    });
  });

  describe('Cache Management', () => {
    it('should invalidate specific rules', async () => {
      const ruleId = 'to-invalidate';
      const metadata: MinimalRuleMetadata = {
        id: ruleId,
        version: '1.0.0',
        tags: ['invalidate-test'],
        lastModified: Date.now()
      };

      await cacheManager.set(ruleId, Buffer.from('test'), metadata);
      expect(await cacheManager.get(ruleId)).not.toBeNull();

      await cacheManager.invalidate(ruleId);
      expect(await cacheManager.get(ruleId)).toBeNull();
      expect(await cacheManager.getMetadata(ruleId)).toBeNull();
      expect(await cacheManager.getRulesByTags(['invalidate-test'])).toEqual([]);
    });

    it('should clear all cached rules', async () => {
      // Add multiple rules
      await cacheManager.set('rule1', Buffer.from('1'), {
        id: 'rule1', version: '1.0.0', tags: ['clear-test'], lastModified: Date.now()
      });
      await cacheManager.set('rule2', Buffer.from('2'), {
        id: 'rule2', version: '1.0.0', tags: ['clear-test'], lastModified: Date.now()
      });

      expect(cacheManager.size).toBe(2);

      await cacheManager.clear();

      expect(cacheManager.size).toBe(0);
      expect(await cacheManager.get('rule1')).toBeNull();
      expect(await cacheManager.get('rule2')).toBeNull();
      expect(await cacheManager.getRulesByTags(['clear-test'])).toEqual([]);
    });

    it('should handle invalidation of non-existent rules gracefully', async () => {
      await expect(cacheManager.invalidate('non-existent')).resolves.not.toThrow();
    });
  });

  describe('Concurrency and Performance', () => {
    it('should handle concurrent operations without data corruption', async () => {
      // Use a larger cache for this test to avoid eviction issues
      const largeCacheManager = new MinimalRuleCacheManager(15);
      const promises: Promise<void>[] = [];
      
      // Simulate concurrent writes
      for (let i = 0; i < 10; i++) {
        promises.push(
          largeCacheManager.set(`concurrent-rule-${i}`, Buffer.from(`data-${i}`), {
            id: `concurrent-rule-${i}`,
            version: '1.0.0',
            tags: ['concurrent'],
            lastModified: Date.now()
          })
        );
      }

      await Promise.all(promises);

      // Verify all rules were stored correctly
      const concurrentRules = await largeCacheManager.getRulesByTags(['concurrent']);
      expect(concurrentRules.length).toBe(10); // All rules should exist with larger cache
      
      // Verify data integrity for existing rules
      for (const ruleId of concurrentRules) {
        const data = await largeCacheManager.get(ruleId);
        expect(data).not.toBeNull();
        expect(data!.toString()).toMatch(/^data-\d+$/);
      }
    });

    it('should handle concurrent reads efficiently', async () => {
      // Set up test data
      await cacheManager.set('read-test', Buffer.from('concurrent-read-data'), {
        id: 'read-test',
        version: '1.0.0',
        tags: ['read-test'],
        lastModified: Date.now()
      });

      // Simulate concurrent reads
      const readPromises = Array(20).fill(0).map(() => cacheManager.get('read-test'));
      
      const results = await Promise.all(readPromises);
      
      // All reads should return the same data
      results.forEach(result => {
        expect(result).not.toBeNull();
        expect(result?.toString()).toBe('concurrent-read-data');
      });
    });
  });

  describe('Cache Properties', () => {
    it('should report correct cache size and max size', () => {
      expect(cacheManager.size).toBe(0);
      expect(cacheManager.maxCacheSize).toBe(3);
    });

    it('should update size correctly as rules are added and removed', async () => {
      expect(cacheManager.size).toBe(0);

      await cacheManager.set('rule1', Buffer.from('1'), {
        id: 'rule1', version: '1.0.0', tags: ['test'], lastModified: Date.now()
      });
      expect(cacheManager.size).toBe(1);

      await cacheManager.set('rule2', Buffer.from('2'), {
        id: 'rule2', version: '1.0.0', tags: ['test'], lastModified: Date.now()
      });
      expect(cacheManager.size).toBe(2);

      await cacheManager.invalidate('rule1');
      expect(cacheManager.size).toBe(1);

      await cacheManager.clear();
      expect(cacheManager.size).toBe(0);
    });
  });
});