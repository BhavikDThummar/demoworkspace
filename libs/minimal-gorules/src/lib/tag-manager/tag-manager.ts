/**
 * Tag Manager for rule selection and grouping
 * Handles rule resolution by IDs, tags, and dependency analysis
 */

import { MinimalRuleMetadata, RuleSelector } from '../interfaces/core.js';
import { ITagManager, RuleDependency, ResolvedRulePlan } from './interfaces.js';

/**
 * High-performance Tag Manager with fast lookup data structures
 * Optimized for rule selection and dependency analysis
 */
export class TagManager implements ITagManager {
  // Fast lookup caches
  private tagToRulesCache = new Map<string, Set<string>>();
  private ruleToTagsCache = new Map<string, Set<string>>();
  private lastCacheUpdate = 0;

  /**
   * Resolve rules based on selector criteria with dependency analysis
   */
  async resolveRules(selector: RuleSelector, availableRules: Map<string, MinimalRuleMetadata>): Promise<ResolvedRulePlan> {
    if (!this.validateSelector(selector)) {
      throw new Error('Invalid rule selector provided');
    }

    // Update caches if needed
    await this.updateCaches(availableRules);

    // Get rule IDs based on selector
    let ruleIds: string[] = [];

    if (selector.ids && selector.ids.length > 0) {
      const idRules = await this.getRulesByIds(selector.ids, availableRules);
      ruleIds = [...ruleIds, ...idRules];
    }

    if (selector.tags && selector.tags.length > 0) {
      const tagRules = await this.getRulesByTags(selector.tags, availableRules);
      ruleIds = [...ruleIds, ...tagRules];
    }

    // Remove duplicates while preserving order
    ruleIds = [...new Set(ruleIds)];

    // Analyze dependencies
    const dependencies = await this.analyzeDependencies(ruleIds, availableRules);

    // Create execution order based on mode
    let executionOrder: string[][];
    
    switch (selector.mode.type) {
      case 'parallel':
        // All rules can execute in parallel (assuming no dependencies)
        executionOrder = ruleIds.length > 0 ? [ruleIds] : [];
        break;
      case 'sequential':
        // All rules execute sequentially
        executionOrder = ruleIds.map(id => [id]);
        break;
      case 'mixed':
        // Create execution order based on groups
        executionOrder = await this.createMixedExecutionOrder(ruleIds, selector.mode.groups || [], dependencies);
        break;
      default:
        throw new Error(`Unsupported execution mode: ${selector.mode.type}`);
    }

    return {
      ruleIds,
      executionOrder,
      dependencies
    };
  }

  /**
   * Get rules by specific IDs with validation
   */
  async getRulesByIds(ruleIds: string[], availableRules: Map<string, MinimalRuleMetadata>): Promise<string[]> {
    const validRules: string[] = [];
    
    for (const ruleId of ruleIds) {
      if (availableRules.has(ruleId)) {
        validRules.push(ruleId);
      }
    }
    
    return validRules;
  }

  /**
   * Get rules by tags with fast lookup using cached indexes
   */
  async getRulesByTags(tags: string[], availableRules: Map<string, MinimalRuleMetadata>): Promise<string[]> {
    if (tags.length === 0) {
      return [];
    }

    // Update caches if needed
    await this.updateCaches(availableRules);

    // Get intersection of all tag sets for AND logic
    let result: Set<string> | null = null;
    
    for (const tag of tags) {
      const ruleIds = this.tagToRulesCache.get(tag);
      if (!ruleIds || ruleIds.size === 0) {
        return []; // If any tag has no rules, intersection is empty
      }
      
      if (result === null) {
        result = new Set(ruleIds);
      } else {
        // Intersection with existing result
        const intersection = new Set<string>();
        for (const ruleId of result) {
          if (ruleIds.has(ruleId)) {
            intersection.add(ruleId);
          }
        }
        result = intersection;
      }
      
      if (result.size === 0) {
        return []; // Early exit if intersection becomes empty
      }
    }

    return result ? Array.from(result) : [];
  }

  /**
   * Analyze rule dependencies for execution ordering
   * Note: For minimal implementation, we assume no complex dependencies
   * This can be extended later with actual dependency analysis
   */
  async analyzeDependencies(ruleIds: string[], availableRules: Map<string, MinimalRuleMetadata>): Promise<Map<string, RuleDependency>> {
    const dependencies = new Map<string, RuleDependency>();
    
    // For now, create simple dependency structure with no dependencies
    // This can be extended later to analyze actual rule content for dependencies
    for (const ruleId of ruleIds) {
      if (availableRules.has(ruleId)) {
        dependencies.set(ruleId, {
          ruleId,
          dependsOn: [],
          dependents: []
        });
      }
    }
    
    return dependencies;
  }

  /**
   * Create execution order based on dependencies using topological sort
   */
  async createExecutionOrder(ruleIds: string[], dependencies: Map<string, RuleDependency>): Promise<string[][]> {
    // Simple topological sort implementation
    const inDegree = new Map<string, number>();
    const adjList = new Map<string, string[]>();
    
    // Initialize
    for (const ruleId of ruleIds) {
      inDegree.set(ruleId, 0);
      adjList.set(ruleId, []);
    }
    
    // Build adjacency list and calculate in-degrees
    for (const [ruleId, dep] of dependencies) {
      if (ruleIds.includes(ruleId)) {
        for (const dependency of dep.dependsOn) {
          if (ruleIds.includes(dependency)) {
            adjList.get(dependency)?.push(ruleId);
            inDegree.set(ruleId, (inDegree.get(ruleId) || 0) + 1);
          }
        }
      }
    }
    
    // Topological sort with level-based grouping
    const result: string[][] = [];
    const queue: string[] = [];
    
    // Find all nodes with no incoming edges
    for (const [ruleId, degree] of inDegree) {
      if (degree === 0) {
        queue.push(ruleId);
      }
    }
    
    while (queue.length > 0) {
      const currentLevel: string[] = [...queue];
      queue.length = 0; // Clear queue
      
      if (currentLevel.length > 0) {
        result.push(currentLevel);
      }
      
      // Process current level
      for (const ruleId of currentLevel) {
        const neighbors = adjList.get(ruleId) || [];
        for (const neighbor of neighbors) {
          const newDegree = (inDegree.get(neighbor) || 0) - 1;
          inDegree.set(neighbor, newDegree);
          if (newDegree === 0) {
            queue.push(neighbor);
          }
        }
      }
    }
    
    // Check for cycles
    const processedCount = result.flat().length;
    if (processedCount !== ruleIds.length) {
      throw new Error('Circular dependency detected in rules');
    }
    
    return result;
  }

  /**
   * Validate rule selector structure
   */
  validateSelector(selector: RuleSelector): boolean {
    if (!selector) {
      return false;
    }

    // Must have either IDs or tags
    if ((!selector.ids || selector.ids.length === 0) && 
        (!selector.tags || selector.tags.length === 0)) {
      return false;
    }

    // Validate execution mode
    if (!selector.mode || !selector.mode.type) {
      return false;
    }

    const validModes = ['parallel', 'sequential', 'mixed'];
    if (!validModes.includes(selector.mode.type)) {
      return false;
    }

    // Validate mixed mode groups
    if (selector.mode.type === 'mixed') {
      if (!selector.mode.groups || selector.mode.groups.length === 0) {
        return false;
      }
      
      for (const group of selector.mode.groups) {
        if (!group.rules || group.rules.length === 0) {
          return false;
        }
        if (!group.mode || !['parallel', 'sequential'].includes(group.mode)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Update internal caches for fast lookups
   */
  private async updateCaches(availableRules: Map<string, MinimalRuleMetadata>): Promise<void> {
    // Simple cache invalidation based on size change
    // In production, this could be more sophisticated
    const currentTime = Date.now();
    const shouldUpdate = this.lastCacheUpdate === 0 || 
                        this.tagToRulesCache.size === 0 ||
                        this.ruleToTagsCache.size !== availableRules.size;
    
    if (!shouldUpdate) {
      return;
    }

    // Clear existing caches
    this.tagToRulesCache.clear();
    this.ruleToTagsCache.clear();

    // Rebuild caches
    for (const [ruleId, metadata] of availableRules) {
      // Update rule to tags cache
      this.ruleToTagsCache.set(ruleId, new Set(metadata.tags));
      
      // Update tag to rules cache
      for (const tag of metadata.tags) {
        let ruleIds = this.tagToRulesCache.get(tag);
        if (!ruleIds) {
          ruleIds = new Set();
          this.tagToRulesCache.set(tag, ruleIds);
        }
        ruleIds.add(ruleId);
      }
    }

    this.lastCacheUpdate = currentTime;
  }

  /**
   * Create mixed execution order based on groups
   */
  private async createMixedExecutionOrder(
    ruleIds: string[], 
    groups: Array<{ rules: string[]; mode: 'parallel' | 'sequential' }>,
    dependencies: Map<string, RuleDependency>
  ): Promise<string[][]> {
    const result: string[][] = [];
    const processedRules = new Set<string>();

    for (const group of groups) {
      // Filter group rules to only include available ones
      const groupRules = group.rules.filter(ruleId => 
        ruleIds.includes(ruleId) && !processedRules.has(ruleId)
      );

      if (groupRules.length === 0) {
        continue;
      }

      if (group.mode === 'parallel') {
        // All rules in group execute in parallel
        result.push(groupRules);
      } else {
        // Sequential execution - each rule in its own group
        for (const ruleId of groupRules) {
          result.push([ruleId]);
        }
      }

      // Mark rules as processed
      groupRules.forEach(ruleId => processedRules.add(ruleId));
    }

    // Add any remaining rules not covered by groups
    const remainingRules = ruleIds.filter(ruleId => !processedRules.has(ruleId));
    if (remainingRules.length > 0) {
      // Default to parallel execution for uncategorized rules
      result.push(remainingRules);
    }

    return result;
  }

  /**
   * Get cache statistics for debugging
   */
  getCacheStats(): { tagCacheSize: number; ruleCacheSize: number; lastUpdate: number } {
    return {
      tagCacheSize: this.tagToRulesCache.size,
      ruleCacheSize: this.ruleToTagsCache.size,
      lastUpdate: this.lastCacheUpdate
    };
  }

  /**
   * Clear internal caches
   */
  clearCaches(): void {
    this.tagToRulesCache.clear();
    this.ruleToTagsCache.clear();
    this.lastCacheUpdate = 0;
  }
}