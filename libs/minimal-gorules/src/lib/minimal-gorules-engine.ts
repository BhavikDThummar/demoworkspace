/**
 * Main Minimal GoRules Engine Service
 * Orchestrates all components for high-performance rule execution
 */

import {
  MinimalGoRulesConfig,
  RuleSelector,
  MinimalExecutionResult,
  MinimalRuleMetadata,
  IRuleCacheManager,
  IRuleLoaderService,
  IExecutionEngine,
} from './interfaces/index';
import { ConfigFactory } from './config/index';
import { MinimalRuleCacheManager } from './cache/index';
import { MinimalRuleLoaderService } from './loader/index';
import {
  EnhancedRuleLoaderService,
  MemoryManager,
  getGlobalMemoryManager,
} from './performance/index';
import { MinimalExecutionEngine } from './execution/index';
import { TagManager } from './tag-manager/index';
import {
  VersionManager,
  VersionComparisonResult,
  VersionConflict,
  VersionManagementResult,
  CacheInvalidationOptions,
  RollbackSnapshot,
} from './version/index';
import { MinimalGoRulesError, MinimalErrorCode } from './errors/index';

/**
 * Engine initialization status
 */
export interface EngineStatus {
  initialized: boolean;
  rulesLoaded: number;
  lastUpdate: number;
  projectId: string;
  version: string;
  performance?: {
    memoryUsage: number;
    cacheHitRate?: number;
    averageExecutionTime?: number;
  };
}

/**
 * Version check result
 */
export interface VersionCheckResult {
  outdatedRules: string[];
  upToDateRules: string[];
  totalChecked: number;
  checkTime: number;
}

/**
 * Cache refresh result
 */
export interface CacheRefreshResult {
  refreshedRules: string[];
  failedRules: Map<string, Error>;
  totalProcessed: number;
  refreshTime: number;
}

/**
 * Main Minimal GoRules Engine that orchestrates all components
 * Provides high-level interface for rule loading, caching, and execution
 */
export class MinimalGoRulesEngine {
  private cacheManager: IRuleCacheManager;
  private loaderService: IRuleLoaderService;
  private executionEngine: IExecutionEngine;
  private tagManager: TagManager;
  private versionManager: VersionManager;
  private config: MinimalGoRulesConfig;
  private initialized = false;
  private lastInitialization = 0;
  private memoryManager?: MemoryManager;
  private useEnhancedLoader = false;

  constructor(config: MinimalGoRulesConfig) {
    // Use ConfigFactory for validation
    const validation = ConfigFactory.validate(config);
    if (!validation.isValid) {
      throw new MinimalGoRulesError(
        MinimalErrorCode.INVALID_INPUT,
        `Configuration validation failed: ${validation.errors.join(', ')}`,
      );
    }
    this.config = { ...config };

    // Initialize all components
    this.cacheManager = new MinimalRuleCacheManager(config.cacheMaxSize);

    // Use enhanced loader if performance optimizations are enabled
    const enhancedConfig = config as any;
    if (enhancedConfig.enablePerformanceOptimizations) {
      this.useEnhancedLoader = true;
      this.loaderService = new EnhancedRuleLoaderService(enhancedConfig);

      // Initialize memory management
      this.memoryManager = getGlobalMemoryManager({
        warningThreshold: enhancedConfig.memoryWarningThreshold || 0.7,
        criticalThreshold: enhancedConfig.memoryCriticalThreshold || 0.85,
        cleanupInterval: enhancedConfig.memoryCleanupInterval || 30000,
      });

      // Register cache cleanup callback
      this.memoryManager.registerCleanupCallback(async () => {
        await this.performMemoryCleanup();
      });

      // Start memory monitoring
      this.memoryManager.startMonitoring(5000);
    } else {
      this.loaderService = new MinimalRuleLoaderService(config);
    }

    this.tagManager = new TagManager();
    this.versionManager = new VersionManager(this.cacheManager, this.loaderService);
    this.executionEngine = new MinimalExecutionEngine(this.cacheManager, this.tagManager, {
      maxConcurrency: config.batchSize || 50,
      executionTimeout: config.httpTimeout || 5000,
      includePerformanceMetrics: enhancedConfig.enablePerformanceMetrics || false,
    });
  }

  /**
   * Initialize engine by loading all project rules at startup
   * This is the primary initialization method that should be called once
   */
  async initialize(projectId?: string): Promise<EngineStatus> {
    const targetProjectId = projectId || this.config.projectId;

    try {
      // Clear existing cache
      await this.cacheManager.clear();

      // Load all rules from GoRules Cloud
      const allRules = await this.loaderService.loadAllRules(targetProjectId);

      // Store all rules in cache
      await this.cacheManager.setMultiple(allRules);

      // Mark as initialized
      this.initialized = true;
      this.lastInitialization = Date.now();

      const status: EngineStatus = {
        initialized: true,
        rulesLoaded: allRules.size,
        lastUpdate: this.lastInitialization,
        projectId: targetProjectId,
        version: '1.0.0',
        performance: this.getPerformanceStats(),
      };

      return status;
    } catch (error) {
      this.initialized = false;
      throw new MinimalGoRulesError(
        MinimalErrorCode.NETWORK_ERROR,
        `Failed to initialize engine: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Execute rules based on selector criteria
   * Main execution method with selector-based rule resolution
   */
  async execute<T = unknown>(
    selector: RuleSelector,
    input: Record<string, unknown>,
  ): Promise<MinimalExecutionResult<T>> {
    this.ensureInitialized();

    try {
      return await this.executionEngine.execute<T>(selector, input);
    } catch (error) {
      if (error instanceof MinimalGoRulesError) {
        throw error;
      }
      throw new MinimalGoRulesError(
        MinimalErrorCode.EXECUTION_ERROR,
        `Rule execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Execute a single rule by ID
   * Convenience method for single rule execution
   */
  async executeRule<T = unknown>(ruleId: string, input: Record<string, unknown>): Promise<T> {
    this.ensureInitialized();

    try {
      return await this.executionEngine.executeRule<T>(ruleId, input);
    } catch (error) {
      if (error instanceof MinimalGoRulesError) {
        throw error;
      }
      throw new MinimalGoRulesError(
        MinimalErrorCode.EXECUTION_ERROR,
        `Single rule execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ruleId,
      );
    }
  }

  /**
   * Execute multiple rules by IDs in parallel
   * Convenience method for parallel execution of specific rules
   */
  async executeRules<T = unknown>(
    ruleIds: string[],
    input: Record<string, unknown>,
  ): Promise<MinimalExecutionResult<T>> {
    this.ensureInitialized();

    const selector: RuleSelector = {
      ids: ruleIds,
      mode: { type: 'parallel' },
    };

    return this.execute<T>(selector, input);
  }

  /**
   * Execute rules by tags in parallel
   * Convenience method for tag-based rule execution
   */
  async executeByTags<T = unknown>(
    tags: string[],
    input: Record<string, unknown>,
    mode: 'parallel' | 'sequential' = 'parallel',
  ): Promise<MinimalExecutionResult<T>> {
    this.ensureInitialized();

    const selector: RuleSelector = {
      tags,
      mode: { type: mode },
    };

    return this.execute<T>(selector, input);
  }

  /**
   * Check rule versions against GoRules Cloud and identify outdated rules
   */
  async checkVersions(): Promise<VersionCheckResult> {
    this.ensureInitialized();
    const startTime = performance.now();

    try {
      // Get all cached rule metadata
      const cachedRules = await this.cacheManager.getAllMetadata();

      // Create version map for checking
      const versionMap = new Map<string, string>();
      for (const [ruleId, metadata] of cachedRules) {
        versionMap.set(ruleId, metadata.version);
      }

      // Check versions against cloud
      const versionResults = await this.loaderService.checkVersions(versionMap);

      const outdatedRules: string[] = [];
      const upToDateRules: string[] = [];

      for (const [ruleId, needsUpdate] of versionResults) {
        if (needsUpdate) {
          outdatedRules.push(ruleId);
        } else {
          upToDateRules.push(ruleId);
        }
      }

      return {
        outdatedRules,
        upToDateRules,
        totalChecked: versionResults.size,
        checkTime: performance.now() - startTime,
      };
    } catch (error) {
      throw new MinimalGoRulesError(
        MinimalErrorCode.NETWORK_ERROR,
        `Version check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Refresh cache by reloading outdated rules
   * Updates only rules that have newer versions available
   */
  async refreshCache(ruleIds?: string[]): Promise<CacheRefreshResult> {
    this.ensureInitialized();
    const startTime = performance.now();

    try {
      let rulesToRefresh: string[];

      if (ruleIds) {
        // Refresh specific rules
        rulesToRefresh = ruleIds;
      } else {
        // Check versions and refresh outdated rules
        const versionCheck = await this.checkVersions();
        rulesToRefresh = versionCheck.outdatedRules;
      }

      const refreshedRules: string[] = [];
      const failedRules = new Map<string, Error>();

      // Refresh each rule individually
      for (const ruleId of rulesToRefresh) {
        try {
          const { data, metadata } = await this.loaderService.refreshRule(ruleId);
          await this.cacheManager.set(ruleId, data, metadata);
          refreshedRules.push(ruleId);
        } catch (error) {
          failedRules.set(ruleId, error as Error);
        }
      }

      return {
        refreshedRules,
        failedRules,
        totalProcessed: rulesToRefresh.length,
        refreshTime: performance.now() - startTime,
      };
    } catch (error) {
      throw new MinimalGoRulesError(
        MinimalErrorCode.NETWORK_ERROR,
        `Cache refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Force refresh entire cache by reloading all rules
   * Use sparingly as this reloads all rules from GoRules Cloud
   */
  async forceRefreshCache(): Promise<EngineStatus> {
    try {
      return await this.initialize();
    } catch (error) {
      throw new MinimalGoRulesError(
        MinimalErrorCode.NETWORK_ERROR,
        `Force cache refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Compare local cache versions with cloud versions
   * Provides detailed version analysis for each rule
   */
  async compareVersions(ruleIds?: string[]): Promise<VersionComparisonResult[]> {
    this.ensureInitialized();

    try {
      return await this.versionManager.compareVersions(ruleIds);
    } catch (error) {
      throw new MinimalGoRulesError(
        MinimalErrorCode.NETWORK_ERROR,
        `Version comparison failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Detect version conflicts that require resolution
   */
  async detectVersionConflicts(ruleIds?: string[]): Promise<VersionConflict[]> {
    this.ensureInitialized();

    try {
      return await this.versionManager.detectVersionConflicts(ruleIds);
    } catch (error) {
      throw new MinimalGoRulesError(
        MinimalErrorCode.NETWORK_ERROR,
        `Version conflict detection failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  /**
   * Automatically refresh cache with advanced conflict resolution
   */
  async autoRefreshCache(
    ruleIds?: string[],
    options?: Partial<CacheInvalidationOptions>,
  ): Promise<VersionManagementResult> {
    this.ensureInitialized();

    try {
      return await this.versionManager.autoRefreshCache(ruleIds, options);
    } catch (error) {
      throw new MinimalGoRulesError(
        MinimalErrorCode.EXECUTION_ERROR,
        `Auto refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Manual cache invalidation for development scenarios
   */
  async invalidateRules(
    ruleIds: string[],
    options?: Partial<CacheInvalidationOptions>,
  ): Promise<VersionManagementResult> {
    this.ensureInitialized();

    try {
      return await this.versionManager.invalidateRules(ruleIds, options);
    } catch (error) {
      throw new MinimalGoRulesError(
        MinimalErrorCode.EXECUTION_ERROR,
        `Manual invalidation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Create rollback snapshot for version recovery
   */
  async createRollbackSnapshot(ruleId: string, reason: string): Promise<void> {
    this.ensureInitialized();

    try {
      await this.versionManager.createRollbackSnapshot(ruleId, reason);
    } catch (error) {
      throw new MinimalGoRulesError(
        MinimalErrorCode.EXECUTION_ERROR,
        `Snapshot creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ruleId,
      );
    }
  }

  /**
   * Rollback rule to previous version
   */
  async rollbackRule(ruleId: string, snapshotIndex = 0): Promise<boolean> {
    this.ensureInitialized();

    try {
      return await this.versionManager.rollbackRule(ruleId, snapshotIndex);
    } catch (error) {
      throw new MinimalGoRulesError(
        MinimalErrorCode.EXECUTION_ERROR,
        `Rollback failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ruleId,
      );
    }
  }

  /**
   * Get available rollback snapshots for a rule
   */
  getRollbackSnapshots(ruleId: string): RollbackSnapshot[] {
    return this.versionManager.getRollbackSnapshots(ruleId);
  }

  /**
   * Clear rollback snapshots for a rule or all rules
   */
  clearRollbackSnapshots(ruleId?: string): void {
    this.versionManager.clearRollbackSnapshots(ruleId);
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
    return this.versionManager.getVersionStats();
  }

  /**
   * Validate that a rule exists and is executable
   */
  async validateRule(ruleId: string): Promise<boolean> {
    this.ensureInitialized();

    try {
      return await this.executionEngine.validateRule(ruleId);
    } catch {
      return false;
    }
  }

  /**
   * Get rule metadata by ID
   */
  async getRuleMetadata(ruleId: string): Promise<MinimalRuleMetadata | null> {
    this.ensureInitialized();

    try {
      return await this.cacheManager.getMetadata(ruleId);
    } catch {
      return null;
    }
  }

  /**
   * Get all available rule metadata
   */
  async getAllRuleMetadata(): Promise<Map<string, MinimalRuleMetadata>> {
    this.ensureInitialized();

    try {
      return await this.cacheManager.getAllMetadata();
    } catch (error) {
      throw new MinimalGoRulesError(
        MinimalErrorCode.EXECUTION_ERROR,
        `Failed to get rule metadata: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get rules by tags
   */
  async getRulesByTags(tags: string[]): Promise<string[]> {
    this.ensureInitialized();

    try {
      return await this.cacheManager.getRulesByTags(tags);
    } catch (error) {
      throw new MinimalGoRulesError(
        MinimalErrorCode.EXECUTION_ERROR,
        `Failed to get rules by tags: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get current engine status
   */
  async getStatus(): Promise<EngineStatus> {
    const metadata = this.initialized ? await this.cacheManager.getAllMetadata() : new Map();

    return {
      initialized: this.initialized,
      rulesLoaded: metadata.size,
      lastUpdate: this.lastInitialization,
      projectId: this.config.projectId,
      version: '1.0.0',
      performance: this.getPerformanceStats(),
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): MinimalGoRulesConfig {
    return { ...this.config };
  }

  /**
   * Update configuration (requires reinitialization for some changes)
   */
  updateConfig(newConfig: Partial<MinimalGoRulesConfig>): void {
    const oldProjectId = this.config.projectId;
    this.config = { ...this.config, ...newConfig };

    // If project ID changed, mark as uninitialized
    if (newConfig.projectId && newConfig.projectId !== oldProjectId) {
      this.initialized = false;
    }

    // Update loader service if API-related config changed
    if (newConfig.apiUrl || newConfig.apiKey || newConfig.httpTimeout) {
      this.loaderService = new MinimalRuleLoaderService(this.config);
    }

    // Update cache manager if cache size changed
    if (newConfig.cacheMaxSize) {
      // Note: This would require cache migration in production
      this.cacheManager = new MinimalRuleCacheManager(newConfig.cacheMaxSize);
      this.initialized = false; // Force reinitialization
    }
  }

  /**
   * Clear all cached rules and reset engine state
   */
  async reset(): Promise<void> {
    try {
      await this.cacheManager.clear();
      this.initialized = false;
      this.lastInitialization = 0;
    } catch (error) {
      throw new MinimalGoRulesError(
        MinimalErrorCode.EXECUTION_ERROR,
        `Failed to reset engine: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats(): { size: number; maxSize: number; hitRate?: number } {
    if (this.cacheManager instanceof MinimalRuleCacheManager) {
      return {
        size: this.cacheManager.size,
        maxSize: this.cacheManager.maxCacheSize,
      };
    }
    return { size: 0, maxSize: 0 };
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): {
    memoryUsage: number;
    cacheHitRate?: number;
    averageExecutionTime?: number;
  } {
    const memoryUsage = this.memoryManager ? this.memoryManager.getCurrentStats().heapUsed : 0;

    // Get execution metrics if available
    const averageExecutionTime = undefined; // TODO: Implement execution metrics interface

    return {
      memoryUsage,
      averageExecutionTime,
    };
  }

  /**
   * Get detailed performance report
   */
  getPerformanceReport(): unknown {
    if (this.useEnhancedLoader && this.loaderService instanceof EnhancedRuleLoaderService) {
      return this.loaderService.getPerformanceStats();
    }

    return {
      memoryUsage: this.memoryManager?.getMemoryReport(),
      cacheStats: this.getCacheStats(),
      executionMetrics: undefined, // TODO: Implement execution metrics interface
    };
  }

  /**
   * Perform memory cleanup
   */
  private async performMemoryCleanup(): Promise<void> {
    try {
      // Force garbage collection if available
      if (typeof global !== 'undefined' && global.gc) {
        global.gc();
      }

      // Could implement cache trimming here if needed
      console.log('Memory cleanup performed for GoRules engine');
    } catch (error) {
      console.warn('Memory cleanup failed:', error);
    }
  }

  /**
   * Cleanup engine resources
   */
  async cleanup(): Promise<void> {
    try {
      // Stop memory monitoring
      if (this.memoryManager) {
        this.memoryManager.stopMonitoring();
      }

      // Cleanup enhanced loader if used
      if (this.useEnhancedLoader && this.loaderService instanceof EnhancedRuleLoaderService) {
        await this.loaderService.cleanup();
      }

      // Clear cache
      await this.cacheManager.clear();

      this.initialized = false;
    } catch (error) {
      console.warn('Engine cleanup failed:', error);
    }
  }

  /**
   * Ensure engine is initialized before operations
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new MinimalGoRulesError(
        MinimalErrorCode.EXECUTION_ERROR,
        'Engine not initialized. Call initialize() first.',
      );
    }
  }
}
