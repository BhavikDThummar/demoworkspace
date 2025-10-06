/**
 * Main Minimal GoRules Engine Service
 * Orchestrates all components for high-performance rule execution
 */

import { MinimalRuleCacheManager } from './cache/index';
import { ConfigFactory } from './config/index';
import {
  IRuleCacheManager,
  IRuleLoaderService,
  MinimalExecutionResult,
  MinimalGoRulesConfig,
  MinimalRuleMetadata,
  RuleSelector,
} from './interfaces/index';
import { IRuleLoaderFactory, RuleLoaderFactory } from './loader/index';
// Performance optimizations removed for minimal implementation
import { MinimalErrorCode, MinimalGoRulesError } from './errors/index';
import {
  BatchExecutionOptions,
  BatchExecutionResult,
  IMinimalExecutionEngine,
  MinimalExecutionEngine,
} from './execution/index';
import { TagManager } from './tag-manager/index';
import {
  CacheInvalidationOptions,
  RollbackSnapshot,
  VersionComparisonResult,
  VersionConflict,
  VersionManagementResult,
  VersionManager,
} from './version/index';

/**
 * Engine initialization status
 */
export interface EngineStatus {
  initialized: boolean;
  rulesLoaded: number;
  lastUpdate: number;
  projectId: string;
  version: string;
  ruleSource?: 'cloud' | 'local';
  enableHotReload?: boolean;
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
  private loaderService!: IRuleLoaderService;
  private executionEngine: IMinimalExecutionEngine;
  private tagManager: TagManager;
  private versionManager!: VersionManager;
  private config: MinimalGoRulesConfig;
  private initialized = false;
  private lastInitialization = 0;
  // Removed performance optimization properties for minimal implementation
  private ruleLoaderFactory: IRuleLoaderFactory;

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

    // Initialize cache manager
    this.cacheManager = new MinimalRuleCacheManager(config.cacheMaxSize);
    this.ruleLoaderFactory = new RuleLoaderFactory();

    // Initialize loader service based on configuration
    this.initializeLoaderService();

    // Initialize other components
    this.tagManager = new TagManager();
    this.versionManager = new VersionManager(this.cacheManager, this.loaderService);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const enhancedConfig = config as any;
    this.executionEngine = new MinimalExecutionEngine(this.cacheManager, this.tagManager, {
      maxConcurrency: config.batchSize || 50,
      executionTimeout: config.httpTimeout || 5000,
      includePerformanceMetrics: enhancedConfig.enablePerformanceMetrics || false,
    });
  }

  /**
   * Initialize the appropriate loader service based on configuration
   */
  private initializeLoaderService(): void {
    // Always use factory to create appropriate loader based on ruleSource
    // This handles both local and cloud rules properly
    this.loaderService = this.ruleLoaderFactory.createLoader(this.config);
  }

  /**
   * Initialize engine by loading all project rules at startup
   * This is the primary initialization method that should be called once
   */
  async initialize(projectId?: string): Promise<EngineStatus> {
    const ruleSource = this.config.ruleSource || 'cloud';
    let targetProjectId: string;

    // Determine project ID based on rule source
    if (ruleSource === 'local') {
      // For local rules, project ID is optional and can be used for organization
      targetProjectId = projectId || this.config.projectId || 'local';
    } else {
      // For cloud rules, project ID is required
      const cloudProjectId = projectId || this.config.projectId;
      if (!cloudProjectId) {
        throw new MinimalGoRulesError(
          MinimalErrorCode.INVALID_INPUT,
          'Project ID is required for cloud rule loading. Provide it in config or as parameter.',
        );
      }
      targetProjectId = cloudProjectId;
    }

    try {
      // Clear existing cache
      await this.cacheManager.clear();

      // Load all rules using the appropriate loader
      const allRules = await this.loaderService.loadAllRules(targetProjectId);

      // Validate that we got some rules (unless it's expected to be empty)
      if (allRules.size === 0 && ruleSource === 'cloud') {
        console.warn(
          `No rules loaded for project: ${targetProjectId}. This might be expected for new projects.`,
        );
      }

      // Store all rules in cache
      if (allRules.size > 0) {
        await this.cacheManager.setMultiple(allRules);
      }

      // Mark as initialized
      this.initialized = true;
      this.lastInitialization = Date.now();

      const status: EngineStatus = {
        initialized: true,
        rulesLoaded: allRules.size,
        lastUpdate: this.lastInitialization,
        projectId: targetProjectId,
        version: '1.0.0',
        ruleSource,
        enableHotReload: this.config.enableHotReload,
        performance: this.getPerformanceStats(),
      };

      return status;
    } catch (error) {
      this.initialized = false;

      // Provide more specific error messages based on rule source
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const contextualMessage =
        ruleSource === 'local'
          ? `Failed to initialize engine with local rules from path: ${
              this.config.localRulesPath || 'default path'
            }`
          : `Failed to initialize engine with cloud rules for project: ${targetProjectId}`;

      throw new MinimalGoRulesError(
        MinimalErrorCode.NETWORK_ERROR,
        `${contextualMessage}. Error: ${errorMessage}`,
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
   * Lightweight batch execution for large datasets
   */
  async executeBatch<T = unknown>(
    inputs: Record<string, unknown>[],
    selector: RuleSelector,
    options?: BatchExecutionOptions,
  ): Promise<BatchExecutionResult<T>> {
    this.ensureInitialized();
    return this.executionEngine.executeBatch<T>(inputs, selector, options);
  }

  /**
   * Ultra-fast batch execution with pre-resolved rule IDs
   */
  async executeBatchByRules<T = unknown>(
    inputs: Record<string, unknown>[],
    ruleIds: string[],
    options?: BatchExecutionOptions,
  ): Promise<BatchExecutionResult<T>> {
    this.ensureInitialized();
    return this.executionEngine.executeBatchByRules<T>(inputs, ruleIds, options);
  }

  /**
   * Batch execution by tags - convenience method
   */
  async executeBatchByTags<T = unknown>(
    inputs: Record<string, unknown>[],
    tags: string[],
    options?: BatchExecutionOptions,
  ): Promise<BatchExecutionResult<T>> {
    this.ensureInitialized();

    const selector: RuleSelector = {
      tags,
      mode: { type: 'parallel' },
    };

    return this.executeBatch<T>(inputs, selector, options);
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
      projectId: this.config.projectId || 'local',
      version: '1.0.0',
      ruleSource: this.config.ruleSource || 'cloud',
      enableHotReload: this.config.enableHotReload,
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
    const oldRuleSource = this.config.ruleSource;
    const oldCacheMaxSize = this.config.cacheMaxSize;

    this.config = { ...this.config, ...newConfig };

    // Check if we need to reinitialize due to significant config changes
    const needsReinitialization =
      (newConfig.projectId && newConfig.projectId !== oldProjectId) ||
      (newConfig.ruleSource && newConfig.ruleSource !== oldRuleSource) ||
      (newConfig.cacheMaxSize && newConfig.cacheMaxSize !== oldCacheMaxSize);

    // Update loader service if rule source or loader-related config changed
    if (
      newConfig.ruleSource !== oldRuleSource ||
      newConfig.apiUrl ||
      newConfig.apiKey ||
      newConfig.httpTimeout ||
      newConfig.localRulesPath
    ) {
      // Reinitialize loader service
      this.initializeLoaderService();
      this.versionManager = new VersionManager(this.cacheManager, this.loaderService);

      // Mark for reinitialization if not already marked
      if (!needsReinitialization) {
        this.initialized = false;
      }
    }

    // Update cache manager if cache size changed
    if (newConfig.cacheMaxSize && newConfig.cacheMaxSize !== oldCacheMaxSize) {
      // Note: This would require cache migration in production
      this.cacheManager = new MinimalRuleCacheManager(newConfig.cacheMaxSize);
      this.versionManager = new VersionManager(this.cacheManager, this.loaderService);
    }

    // Mark as uninitialized if significant changes occurred
    if (needsReinitialization) {
      this.initialized = false;
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
    // Simplified performance stats for minimal implementation
    const memoryUsage = process.memoryUsage().heapUsed;
    const averageExecutionTime = undefined; // Not implemented in minimal version

    return {
      memoryUsage,
      averageExecutionTime,
    };
  }

  // Removed performance optimization methods for minimal implementation

  /**
   * Cleanup engine resources
   */
  async cleanup(): Promise<void> {
    try {
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
