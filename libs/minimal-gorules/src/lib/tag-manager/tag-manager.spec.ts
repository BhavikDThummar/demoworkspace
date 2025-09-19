/**
 * Unit tests for TagManager
 */

import { TagManager } from './tag-manager.js';
import { MinimalRuleMetadata, RuleSelector } from '../interfaces/core.js';

describe('TagManager', () => {
  let tagManager: TagManager;
  let mockRules: Map<string, MinimalRuleMetadata>;

  beforeEach(() => {
    tagManager = new TagManager();
    
    // Create mock rules with various tags
    mockRules = new Map([
      ['rule1', {
        id: 'rule1',
        version: '1.0.0',
        tags: ['auth', 'validation'],
        lastModified: Date.now()
      }],
      ['rule2', {
        id: 'rule2',
        version: '1.0.0',
        tags: ['auth', 'security'],
        lastModified: Date.now()
      }],
      ['rule3', {
        id: 'rule3',
        version: '1.0.0',
        tags: ['validation', 'input'],
        lastModified: Date.now()
      }],
      ['rule4', {
        id: 'rule4',
        version: '1.0.0',
        tags: ['output', 'formatting'],
        lastModified: Date.now()
      }],
      ['rule5', {
        id: 'rule5',
        version: '1.0.0',
        tags: ['auth'],
        lastModified: Date.now()
      }]
    ]);
  });

  describe('validateSelector', () => {
    it('should validate correct selector with IDs', () => {
      const selector: RuleSelector = {
        ids: ['rule1', 'rule2'],
        mode: { type: 'parallel' }
      };
      
      expect(tagManager.validateSelector(selector)).toBe(true);
    });

    it('should validate correct selector with tags', () => {
      const selector: RuleSelector = {
        tags: ['auth', 'validation'],
        mode: { type: 'sequential' }
      };
      
      expect(tagManager.validateSelector(selector)).toBe(true);
    });

    it('should validate correct mixed mode selector', () => {
      const selector: RuleSelector = {
        ids: ['rule1'],
        mode: {
          type: 'mixed',
          groups: [
            { rules: ['rule1'], mode: 'parallel' },
            { rules: ['rule2'], mode: 'sequential' }
          ]
        }
      };
      
      expect(tagManager.validateSelector(selector)).toBe(true);
    });

    it('should reject selector without IDs or tags', () => {
      const selector: RuleSelector = {
        mode: { type: 'parallel' }
      };
      
      expect(tagManager.validateSelector(selector)).toBe(false);
    });

    it('should reject selector with empty IDs and tags', () => {
      const selector: RuleSelector = {
        ids: [],
        tags: [],
        mode: { type: 'parallel' }
      };
      
      expect(tagManager.validateSelector(selector)).toBe(false);
    });

    it('should reject selector with invalid mode', () => {
      const selector: RuleSelector = {
        ids: ['rule1'],
        mode: { type: 'invalid' as any }
      };
      
      expect(tagManager.validateSelector(selector)).toBe(false);
    });

    it('should reject mixed mode without groups', () => {
      const selector: RuleSelector = {
        ids: ['rule1'],
        mode: { type: 'mixed' }
      };
      
      expect(tagManager.validateSelector(selector)).toBe(false);
    });

    it('should reject mixed mode with empty groups', () => {
      const selector: RuleSelector = {
        ids: ['rule1'],
        mode: { type: 'mixed', groups: [] }
      };
      
      expect(tagManager.validateSelector(selector)).toBe(false);
    });
  });

  describe('getRulesByIds', () => {
    it('should return valid rule IDs', async () => {
      const result = await tagManager.getRulesByIds(['rule1', 'rule2'], mockRules);
      expect(result).toEqual(['rule1', 'rule2']);
    });

    it('should filter out invalid rule IDs', async () => {
      const result = await tagManager.getRulesByIds(['rule1', 'invalid', 'rule2'], mockRules);
      expect(result).toEqual(['rule1', 'rule2']);
    });

    it('should return empty array for all invalid IDs', async () => {
      const result = await tagManager.getRulesByIds(['invalid1', 'invalid2'], mockRules);
      expect(result).toEqual([]);
    });

    it('should handle empty input array', async () => {
      const result = await tagManager.getRulesByIds([], mockRules);
      expect(result).toEqual([]);
    });
  });

  describe('getRulesByTags', () => {
    it('should return rules matching single tag', async () => {
      const result = await tagManager.getRulesByTags(['auth'], mockRules);
      expect(result.sort()).toEqual(['rule1', 'rule2', 'rule5']);
    });

    it('should return rules matching multiple tags (intersection)', async () => {
      const result = await tagManager.getRulesByTags(['auth', 'validation'], mockRules);
      expect(result).toEqual(['rule1']); // Only rule1 has both tags
    });

    it('should return empty array for non-existent tag', async () => {
      const result = await tagManager.getRulesByTags(['nonexistent'], mockRules);
      expect(result).toEqual([]);
    });

    it('should return empty array when no rules match all tags', async () => {
      const result = await tagManager.getRulesByTags(['auth', 'output'], mockRules);
      expect(result).toEqual([]); // No rule has both auth and output tags
    });

    it('should handle empty tags array', async () => {
      const result = await tagManager.getRulesByTags([], mockRules);
      expect(result).toEqual([]);
    });

    it('should use cached indexes for performance', async () => {
      // First call to build cache
      await tagManager.getRulesByTags(['auth'], mockRules);
      
      // Second call should use cache
      const result = await tagManager.getRulesByTags(['validation'], mockRules);
      expect(result.sort()).toEqual(['rule1', 'rule3']);
      
      // Verify cache stats
      const stats = tagManager.getCacheStats();
      expect(stats.tagCacheSize).toBeGreaterThan(0);
      expect(stats.ruleCacheSize).toBeGreaterThan(0);
    });
  });

  describe('analyzeDependencies', () => {
    it('should create dependency map for valid rules', async () => {
      const ruleIds = ['rule1', 'rule2'];
      const result = await tagManager.analyzeDependencies(ruleIds, mockRules);
      
      expect(result.size).toBe(2);
      expect(result.get('rule1')).toEqual({
        ruleId: 'rule1',
        dependsOn: [],
        dependents: []
      });
      expect(result.get('rule2')).toEqual({
        ruleId: 'rule2',
        dependsOn: [],
        dependents: []
      });
    });

    it('should filter out invalid rule IDs', async () => {
      const ruleIds = ['rule1', 'invalid', 'rule2'];
      const result = await tagManager.analyzeDependencies(ruleIds, mockRules);
      
      expect(result.size).toBe(2);
      expect(result.has('rule1')).toBe(true);
      expect(result.has('rule2')).toBe(true);
      expect(result.has('invalid')).toBe(false);
    });

    it('should handle empty rule IDs array', async () => {
      const result = await tagManager.analyzeDependencies([], mockRules);
      expect(result.size).toBe(0);
    });
  });

  describe('createExecutionOrder', () => {
    it('should create execution order for rules without dependencies', async () => {
      const ruleIds = ['rule1', 'rule2', 'rule3'];
      const dependencies = new Map([
        ['rule1', { ruleId: 'rule1', dependsOn: [], dependents: [] }],
        ['rule2', { ruleId: 'rule2', dependsOn: [], dependents: [] }],
        ['rule3', { ruleId: 'rule3', dependsOn: [], dependents: [] }]
      ]);
      
      const result = await tagManager.createExecutionOrder(ruleIds, dependencies);
      
      expect(result).toHaveLength(1);
      expect(result[0].sort()).toEqual(['rule1', 'rule2', 'rule3']);
    });

    it('should create execution order with dependencies', async () => {
      const ruleIds = ['rule1', 'rule2', 'rule3'];
      const dependencies = new Map([
        ['rule1', { ruleId: 'rule1', dependsOn: [], dependents: ['rule2'] }],
        ['rule2', { ruleId: 'rule2', dependsOn: ['rule1'], dependents: ['rule3'] }],
        ['rule3', { ruleId: 'rule3', dependsOn: ['rule2'], dependents: [] }]
      ]);
      
      const result = await tagManager.createExecutionOrder(ruleIds, dependencies);
      
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual(['rule1']);
      expect(result[1]).toEqual(['rule2']);
      expect(result[2]).toEqual(['rule3']);
    });

    it('should detect circular dependencies', async () => {
      const ruleIds = ['rule1', 'rule2'];
      const dependencies = new Map([
        ['rule1', { ruleId: 'rule1', dependsOn: ['rule2'], dependents: ['rule2'] }],
        ['rule2', { ruleId: 'rule2', dependsOn: ['rule1'], dependents: ['rule1'] }]
      ]);
      
      await expect(tagManager.createExecutionOrder(ruleIds, dependencies))
        .rejects.toThrow('Circular dependency detected in rules');
    });

    it('should handle empty rule IDs array', async () => {
      const result = await tagManager.createExecutionOrder([], new Map());
      expect(result).toEqual([]);
    });
  });

  describe('resolveRules', () => {
    it('should resolve rules by IDs with parallel mode', async () => {
      const selector: RuleSelector = {
        ids: ['rule1', 'rule2'],
        mode: { type: 'parallel' }
      };
      
      const result = await tagManager.resolveRules(selector, mockRules);
      
      expect(result.ruleIds).toEqual(['rule1', 'rule2']);
      expect(result.executionOrder).toEqual([['rule1', 'rule2']]);
      expect(result.dependencies.size).toBe(2);
    });

    it('should resolve rules by tags with sequential mode', async () => {
      const selector: RuleSelector = {
        tags: ['auth'],
        mode: { type: 'sequential' }
      };
      
      const result = await tagManager.resolveRules(selector, mockRules);
      
      expect(result.ruleIds.sort()).toEqual(['rule1', 'rule2', 'rule5']);
      expect(result.executionOrder).toHaveLength(3);
      expect(result.executionOrder[0]).toHaveLength(1);
      expect(result.executionOrder[1]).toHaveLength(1);
      expect(result.executionOrder[2]).toHaveLength(1);
    });

    it('should resolve rules with mixed IDs and tags', async () => {
      const selector: RuleSelector = {
        ids: ['rule4'],
        tags: ['auth'],
        mode: { type: 'parallel' }
      };
      
      const result = await tagManager.resolveRules(selector, mockRules);
      
      // Should include rule4 + auth rules (rule1, rule2, rule5)
      expect(result.ruleIds.sort()).toEqual(['rule1', 'rule2', 'rule4', 'rule5']);
      expect(result.executionOrder).toHaveLength(1);
      expect(result.executionOrder[0].sort()).toEqual(['rule1', 'rule2', 'rule4', 'rule5']);
    });

    it('should handle mixed mode with groups', async () => {
      const selector: RuleSelector = {
        ids: ['rule1', 'rule2', 'rule3'],
        mode: {
          type: 'mixed',
          groups: [
            { rules: ['rule1', 'rule2'], mode: 'parallel' },
            { rules: ['rule3'], mode: 'sequential' }
          ]
        }
      };
      
      const result = await tagManager.resolveRules(selector, mockRules);
      
      expect(result.ruleIds).toEqual(['rule1', 'rule2', 'rule3']);
      expect(result.executionOrder).toEqual([
        ['rule1', 'rule2'], // Parallel group
        ['rule3']           // Sequential group
      ]);
    });

    it('should remove duplicate rules from IDs and tags', async () => {
      const selector: RuleSelector = {
        ids: ['rule1', 'rule2'],
        tags: ['auth'], // This will also include rule1 and rule2
        mode: { type: 'parallel' }
      };
      
      const result = await tagManager.resolveRules(selector, mockRules);
      
      // Should not have duplicates
      const uniqueRules = [...new Set(result.ruleIds)];
      expect(result.ruleIds).toEqual(uniqueRules);
      expect(result.ruleIds.sort()).toEqual(['rule1', 'rule2', 'rule5']);
    });

    it('should throw error for invalid selector', async () => {
      const selector: RuleSelector = {
        mode: { type: 'parallel' }
      };
      
      await expect(tagManager.resolveRules(selector, mockRules))
        .rejects.toThrow('Invalid rule selector provided');
    });

    it('should throw error for invalid selector', async () => {
      const selector: RuleSelector = {
        ids: ['rule1'],
        mode: { type: 'unsupported' as unknown }
      };
      
      await expect(tagManager.resolveRules(selector, mockRules))
        .rejects.toThrow('Invalid rule selector provided');
    });
  });

  describe('cache management', () => {
    it('should update caches when rules change', async () => {
      // Initial call to build cache
      await tagManager.getRulesByTags(['auth'], mockRules);
      const initialStats = tagManager.getCacheStats();
      
      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Add new rule
      const newRules = new Map(mockRules);
      newRules.set('rule6', {
        id: 'rule6',
        version: '1.0.0',
        tags: ['auth', 'new'],
        lastModified: Date.now()
      });
      
      // Call with updated rules should rebuild cache
      await tagManager.getRulesByTags(['auth'], newRules);
      const updatedStats = tagManager.getCacheStats();
      
      expect(updatedStats.lastUpdate).toBeGreaterThanOrEqual(initialStats.lastUpdate);
      expect(updatedStats.tagCacheSize).toBeGreaterThan(initialStats.tagCacheSize);
    });

    it('should clear caches when requested', () => {
      tagManager.clearCaches();
      const stats = tagManager.getCacheStats();
      
      expect(stats.tagCacheSize).toBe(0);
      expect(stats.ruleCacheSize).toBe(0);
      expect(stats.lastUpdate).toBe(0);
    });
  });

  describe('performance', () => {
    it('should handle large number of rules efficiently', async () => {
      // Create large rule set
      const largeRuleSet = new Map<string, MinimalRuleMetadata>();
      for (let i = 0; i < 1000; i++) {
        largeRuleSet.set(`rule${i}`, {
          id: `rule${i}`,
          version: '1.0.0',
          tags: [`tag${i % 10}`, `category${i % 5}`],
          lastModified: Date.now()
        });
      }
      
      const startTime = performance.now();
      
      const selector: RuleSelector = {
        tags: ['tag1', 'category1'],
        mode: { type: 'parallel' }
      };
      
      const result = await tagManager.resolveRules(selector, largeRuleSet);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(100); // 100ms threshold
      expect(result.ruleIds.length).toBeGreaterThan(0);
    });

    it('should cache lookups for repeated queries', async () => {
      const selector: RuleSelector = {
        tags: ['auth'],
        mode: { type: 'parallel' }
      };
      
      // First call - builds cache
      const start1 = performance.now();
      await tagManager.resolveRules(selector, mockRules);
      const duration1 = performance.now() - start1;
      
      // Second call - uses cache
      const start2 = performance.now();
      await tagManager.resolveRules(selector, mockRules);
      const duration2 = performance.now() - start2;
      
      // Second call should be faster (cached)
      expect(duration2).toBeLessThanOrEqual(duration1);
    });
  });
});