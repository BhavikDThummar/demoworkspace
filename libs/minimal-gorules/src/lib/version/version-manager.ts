/**
 * Version Manager for advanced version detection and cache invalidation
 * Handles version conflicts, rollback capabilities, and automatic refresh
 */

import { 
  IRuleCacheManager, 
  IRuleLoaderService, 
  MinimalRuleMetadata 
} from '../interfaces/index.js';
import { MinimalGoRulesError, MinimalErrorCode } from '../errors/index.js';

/**
 * Version comparison result
 */
export interface VersionComparisonResult {
  ruleId: string;
  localVersion: string;
  cloudVersion: string;
  needsUpdate: boolean;
  versionDiff: 'major' | 'minor' | 'patch' | 'same' | 'unknown';
  lastModified: {
    local: number;
    cloud: number;
  };
}

/**
 * Version conflict resolution strategy
 */
export type ConflictResolutionStrategy = 
  | 'cloud-wins'      // Always use cloud version
  | 'local-wins'      // Keep local version
  | 'newer-wins'      // Use version with later lastModified timestamp
  | 'manual'          // Require manual resolution
  | 'rollback';       // Rollback to previous version

/**
 * Version conflict information
 */
export interface VersionConflict {
  ruleId: string;
  localVersion: string;
  cloudVersion: string;
  localLastModified: number;
  cloudLastModified: number;
  conflictType: 'version-mismatch' | 'timestamp-conflict' | 'rule-deleted';
}

/**
 * Rollback snapshot for version recovery
 */
export interface RollbackSnapshot {
  timestamp: number;
  ruleId: string;
  version: string;
  data: Buffer;
  metadata: MinimalRuleMetadata;
  reason: string;
}

/**
 * Version management result
 */
export interface VersionManagementResult {
  processed: string[];
  updated: string[];
  conflicts: VersionConflict[];
  errors: Map<string, Error>;
  rollbacks: string[];
  processingTime: number;
}

/**
 * Cache invalidation options
 */
export interface CacheInvalidationOptions {
  strategy: ConflictResolutionStrategy;
  batchSize?: number;
  maxRetries?: number;
  retryDelay?: number;
  createSnapshot?: boolean;
  validateAfterUpdate?: boolean;
}

/**
 * Advanced Version Manager for rule version control and cache invalidation
 */
export class VersionManager {
  private rollbackSnapshots = new Map<string, RollbackSnapshot[]>();
  private readonly maxSnapshotsPerRule = 5;
  private readonly defaultOptions: Required<CacheInvalidationOptions> = {
    strategy: 'cloud-wins',
    batchSize: 10,
    maxRetries: 3,
    retryDelay: 1000,
    createSnapshot: true,
    validateAfterUpdate: true
  };

  constructor(
    private cacheManager: IRuleCacheManager,
    private loaderService: IRuleLoaderService
  ) {}

  /**
   * Compare local cache versions with cloud versions
   * Provides detailed version analysis for each rule
   */
  async compareVersions(ruleIds?: string[]): Promise<VersionComparisonResult[]> {
    
    try {
      // Get rules to check
      const rulesToCheck = ruleIds || Array.from((await this.cacheManager.getAllMetadata()).keys());
      
      if (rulesToCheck.length === 0) {
        return [];
      }

      // Get local metadata
      const localMetadata = new Map<string, MinimalRuleMetadata>();
      for (const ruleId of rulesToCheck) {
        const metadata = await this.cacheManager.getMetadata(ruleId);
        if (metadata) {
          localMetadata.set(ruleId, metadata);
        }
      }

      // Create version map for cloud check
      const versionMap = new Map<string, string>();
      for (const [ruleId, metadata] of localMetadata) {
        versionMap.set(ruleId, metadata.version);
      }

      // Check versions against cloud
      const cloudVersionResults = await this.loaderService.checkVersions(versionMap);
      
      // Load detailed cloud metadata for comparison
      const cloudMetadata = new Map<string, MinimalRuleMetadata>();
      const rulesToLoad = Array.from(cloudVersionResults.entries())
        .filter(([, needsUpdate]) => needsUpdate)
        .map(([ruleId]) => ruleId);

      // Load cloud metadata in batches
      for (let i = 0; i < rulesToLoad.length; i += this.defaultOptions.batchSize) {
        const batch = rulesToLoad.slice(i, i + this.defaultOptions.batchSize);
        const batchPromises = batch.map(async (ruleId) => {
          try {
            const { metadata } = await this.loaderService.loadRule(ruleId);
            return { ruleId, metadata };
          } catch (error) {
            console.warn(`Failed to load cloud metadata for rule ${ruleId}:`, error);
            return null;
          }
        });

        const batchResults = await Promise.allSettled(batchPromises);
        for (const result of batchResults) {
          if (result.status === 'fulfilled' && result.value) {
            cloudMetadata.set(result.value.ruleId, result.value.metadata);
          }
        }
      }

      // Build comparison results
      const results: VersionComparisonResult[] = [];
      
      for (const ruleId of rulesToCheck) {
        const local = localMetadata.get(ruleId);
        const cloud = cloudMetadata.get(ruleId);
        const needsUpdate = cloudVersionResults.get(ruleId) || false;

        if (local) {
          results.push({
            ruleId,
            localVersion: local.version,
            cloudVersion: cloud?.version || 'unknown',
            needsUpdate,
            versionDiff: this.compareVersionStrings(local.version, cloud?.version || local.version),
            lastModified: {
              local: local.lastModified,
              cloud: cloud?.lastModified || local.lastModified
            }
          });
        }
      }

      return results;

    } catch (error) {
      throw new MinimalGoRulesError(
        MinimalErrorCode.NETWORK_ERROR,
        `Version comparison failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Detect version conflicts that require resolution
   */
  async detectVersionConflicts(ruleIds?: string[]): Promise<VersionConflict[]> {
    const comparisons = await this.compareVersions(ruleIds);
    const conflicts: VersionConflict[] = [];

    for (const comparison of comparisons) {
      if (comparison.needsUpdate) {
        const conflictType = this.determineConflictType(comparison);
        
        conflicts.push({
          ruleId: comparison.ruleId,
          localVersion: comparison.localVersion,
          cloudVersion: comparison.cloudVersion,
          localLastModified: comparison.lastModified.local,
          cloudLastModified: comparison.lastModified.cloud,
          conflictType
        });
      }
    }

    return conflicts;
  }

  /**
   * Automatically refresh cache with conflict resolution
   */
  async autoRefreshCache(
    ruleIds?: string[],
    options: Partial<CacheInvalidationOptions> = {}
  ): Promise<VersionManagementResult> {
    const opts = { ...this.defaultOptions, ...options };
    const startTime = performance.now();
    
    const result: VersionManagementResult = {
      processed: [],
      updated: [],
      conflicts: [],
      errors: new Map(),
      rollbacks: [],
      processingTime: 0
    };

    try {
      // Detect conflicts first
      const conflicts = await this.detectVersionConflicts(ruleIds);
      result.conflicts = conflicts;

      if (conflicts.length === 0) {
        result.processingTime = performance.now() - startTime;
        return result;
      }

      // Process conflicts in batches
      const rulesToProcess = conflicts.map(c => c.ruleId);
      
      for (let i = 0; i < rulesToProcess.length; i += opts.batchSize) {
        const batch = rulesToProcess.slice(i, i + opts.batchSize);
        
        for (const ruleId of batch) {
          result.processed.push(ruleId);
          
          try {
            const conflict = conflicts.find(c => c.ruleId === ruleId)!;
            const resolved = await this.resolveVersionConflict(conflict, opts);
            
            if (resolved) {
              result.updated.push(ruleId);
            }
          } catch (error) {
            result.errors.set(ruleId, error as Error);
          }
        }
      }

      result.processingTime = performance.now() - startTime;
      return result;

    } catch (error) {
      throw new MinimalGoRulesError(
        MinimalErrorCode.EXECUTION_ERROR,
        `Auto refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Manual cache invalidation for development scenarios
   */
  async invalidateRules(
    ruleIds: string[],
    options: Partial<CacheInvalidationOptions> = {}
  ): Promise<VersionManagementResult> {
    const opts = { ...this.defaultOptions, ...options };
    const startTime = performance.now();
    
    const result: VersionManagementResult = {
      processed: [],
      updated: [],
      conflicts: [],
      errors: new Map(),
      rollbacks: [],
      processingTime: 0
    };

    try {
      // Create snapshots if requested
      if (opts.createSnapshot) {
        for (const ruleId of ruleIds) {
          try {
            await this.createRollbackSnapshot(ruleId, 'manual-invalidation');
          } catch (error) {
            console.warn(`Failed to create snapshot for rule ${ruleId}:`, error);
          }
        }
      }

      // Process invalidation in batches
      for (let i = 0; i < ruleIds.length; i += opts.batchSize) {
        const batch = ruleIds.slice(i, i + opts.batchSize);
        
        for (const ruleId of batch) {
          result.processed.push(ruleId);
          
          let retries = 0;
          let success = false;
          
          while (retries < opts.maxRetries && !success) {
            try {
              // Invalidate from cache
              await this.cacheManager.invalidate(ruleId);
              
              // Reload from cloud
              const { data, metadata } = await this.loaderService.loadRule(ruleId);
              await this.cacheManager.set(ruleId, data, metadata);
              
              // Validate if requested
              if (opts.validateAfterUpdate) {
                const cachedData = await this.cacheManager.get(ruleId);
                if (!cachedData || !cachedData.equals(data)) {
                  throw new Error('Validation failed after update');
                }
              }
              
              result.updated.push(ruleId);
              success = true;
              
            } catch (error) {
              retries++;
              if (retries >= opts.maxRetries) {
                result.errors.set(ruleId, error as Error);
              } else {
                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, opts.retryDelay));
              }
            }
          }
        }
      }

      result.processingTime = performance.now() - startTime;
      return result;

    } catch (error) {
      throw new MinimalGoRulesError(
        MinimalErrorCode.EXECUTION_ERROR,
        `Manual invalidation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Create rollback snapshot for version recovery
   */
  async createRollbackSnapshot(ruleId: string, reason: string): Promise<void> {
    try {
      const data = await this.cacheManager.get(ruleId);
      const metadata = await this.cacheManager.getMetadata(ruleId);
      
      if (!data || !metadata) {
        return; // Rule not in cache, nothing to snapshot
      }

      const snapshot: RollbackSnapshot = {
        timestamp: Date.now(),
        ruleId,
        version: metadata.version,
        data: Buffer.from(data),
        metadata: { ...metadata },
        reason
      };

      // Get existing snapshots for this rule
      let snapshots = this.rollbackSnapshots.get(ruleId) || [];
      
      // Add new snapshot
      snapshots.unshift(snapshot);
      
      // Keep only the most recent snapshots
      if (snapshots.length > this.maxSnapshotsPerRule) {
        snapshots = snapshots.slice(0, this.maxSnapshotsPerRule);
      }
      
      this.rollbackSnapshots.set(ruleId, snapshots);

    } catch (error) {
      throw new MinimalGoRulesError(
        MinimalErrorCode.EXECUTION_ERROR,
        `Failed to create rollback snapshot for rule ${ruleId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ruleId
      );
    }
  }

  /**
   * Rollback rule to previous version
   */
  async rollbackRule(ruleId: string, snapshotIndex = 0): Promise<boolean> {
    try {
      const snapshots = this.rollbackSnapshots.get(ruleId);
      
      if (!snapshots || snapshots.length <= snapshotIndex) {
        throw new Error(`No rollback snapshot available at index ${snapshotIndex}`);
      }

      const snapshot = snapshots[snapshotIndex];
      
      // Create current snapshot before rollback
      await this.createRollbackSnapshot(ruleId, 'pre-rollback');
      
      // Restore from snapshot
      await this.cacheManager.set(ruleId, snapshot.data, snapshot.metadata);
      
      return true;

    } catch (error) {
      throw new MinimalGoRulesError(
        MinimalErrorCode.EXECUTION_ERROR,
        `Rollback failed for rule ${ruleId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ruleId
      );
    }
  }

  /**
   * Get available rollback snapshots for a rule
   */
  getRollbackSnapshots(ruleId: string): RollbackSnapshot[] {
    return this.rollbackSnapshots.get(ruleId) || [];
  }

  /**
   * Clear rollback snapshots for a rule or all rules
   */
  clearRollbackSnapshots(ruleId?: string): void {
    if (ruleId) {
      this.rollbackSnapshots.delete(ruleId);
    } else {
      this.rollbackSnapshots.clear();
    }
  }

  /**
   * Get version management statistics
   */
  getVersionStats(): {
    totalSnapshots: number;
    snapshotsByRule: Map<string, number>;
    oldestSnapshot: number | null;
    newestSnapshot: number | null;
  } {
    let totalSnapshots = 0;
    let oldestSnapshot: number | null = null;
    let newestSnapshot: number | null = null;
    const snapshotsByRule = new Map<string, number>();

    for (const [ruleId, snapshots] of this.rollbackSnapshots) {
      snapshotsByRule.set(ruleId, snapshots.length);
      totalSnapshots += snapshots.length;

      for (const snapshot of snapshots) {
        if (oldestSnapshot === null || snapshot.timestamp < oldestSnapshot) {
          oldestSnapshot = snapshot.timestamp;
        }
        if (newestSnapshot === null || snapshot.timestamp > newestSnapshot) {
          newestSnapshot = snapshot.timestamp;
        }
      }
    }

    return {
      totalSnapshots,
      snapshotsByRule,
      oldestSnapshot,
      newestSnapshot
    };
  }

  // Private helper methods

  private compareVersionStrings(version1: string, version2: string): 'major' | 'minor' | 'patch' | 'same' | 'unknown' {
    if (version1 === version2) {
      return 'same';
    }

    // Try semantic versioning comparison
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);

    if (v1Parts.length >= 3 && v2Parts.length >= 3 && 
        v1Parts.every(n => !isNaN(n)) && v2Parts.every(n => !isNaN(n))) {
      
      if (v1Parts[0] !== v2Parts[0]) return 'major';
      if (v1Parts[1] !== v2Parts[1]) return 'minor';
      if (v1Parts[2] !== v2Parts[2]) return 'patch';
      return 'same';
    }

    return 'unknown';
  }

  private determineConflictType(comparison: VersionComparisonResult): VersionConflict['conflictType'] {
    if (comparison.cloudVersion === 'unknown') {
      return 'rule-deleted';
    }
    
    if (comparison.versionDiff !== 'same') {
      return 'version-mismatch';
    }
    
    if (comparison.lastModified.local !== comparison.lastModified.cloud) {
      return 'timestamp-conflict';
    }
    
    return 'version-mismatch';
  }

  private async resolveVersionConflict(
    conflict: VersionConflict, 
    options: Required<CacheInvalidationOptions>
  ): Promise<boolean> {
    const { ruleId } = conflict;
    
    try {
      // Create snapshot before resolution if requested
      if (options.createSnapshot) {
        await this.createRollbackSnapshot(ruleId, `conflict-resolution-${options.strategy}`);
      }

      switch (options.strategy) {
        case 'cloud-wins':
          return await this.updateRuleFromCloud(ruleId, options);
          
        case 'local-wins':
          // Keep local version, no action needed
          return false;
          
        case 'newer-wins':
          if (conflict.cloudLastModified > conflict.localLastModified) {
            return await this.updateRuleFromCloud(ruleId, options);
          }
          return false;
          
        case 'rollback':
          return await this.rollbackRule(ruleId);
          
        case 'manual':
          // Manual resolution required, don't auto-resolve
          return false;
          
        default:
          throw new Error(`Unknown conflict resolution strategy: ${options.strategy}`);
      }
    } catch (error) {
      throw new MinimalGoRulesError(
        MinimalErrorCode.EXECUTION_ERROR,
        `Failed to resolve conflict for rule ${ruleId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ruleId
      );
    }
  }

  private async updateRuleFromCloud(
    ruleId: string, 
    options: Required<CacheInvalidationOptions>
  ): Promise<boolean> {
    let retries = 0;
    
    while (retries < options.maxRetries) {
      try {
        const { data, metadata } = await this.loaderService.loadRule(ruleId);
        await this.cacheManager.set(ruleId, data, metadata);
        
        if (options.validateAfterUpdate) {
          const cachedData = await this.cacheManager.get(ruleId);
          if (!cachedData || !cachedData.equals(data)) {
            throw new Error('Validation failed after update');
          }
        }
        
        return true;
      } catch (error) {
        retries++;
        if (retries >= options.maxRetries) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, options.retryDelay));
      }
    }
    
    return false;
  }
}