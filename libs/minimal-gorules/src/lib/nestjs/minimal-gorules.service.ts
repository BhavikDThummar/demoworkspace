/**
 * NestJS Service wrapper for Minimal GoRules Engine
 * Provides NestJS-compatible service interface with lifecycle management
 */

import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { MinimalGoRulesEngine, EngineStatus } from '../minimal-gorules-engine.js';
import { RuleSelector, MinimalExecutionResult, MinimalRuleMetadata } from '../interfaces/index.js';
import { ServiceInitializationStatus } from './interfaces.js';

/**
 * NestJS service that wraps the Minimal GoRules Engine
 * Handles initialization, lifecycle management, and provides injectable service
 */
@Injectable()
export class MinimalGoRulesService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MinimalGoRulesService.name);
  private initializationStatus: ServiceInitializationStatus = {
    initialized: false,
  };

  constructor(
    private readonly engine: MinimalGoRulesEngine,
    private readonly autoInitialize = true,
  ) {}

  /**
   * NestJS lifecycle hook - initialize engine when module starts
   */
  async onModuleInit(): Promise<void> {
    if (this.autoInitialize) {
      this.logger.log('Auto-initializing Minimal GoRules Engine...');
      try {
        const startTime = performance.now();
        const status = await this.engine.initialize();
        const initTime = performance.now() - startTime;

        this.initializationStatus = {
          initialized: true,
          initializationTime: initTime,
          rulesLoaded: status.rulesLoaded,
        };

        this.logger.log(
          `Engine initialized successfully in ${initTime.toFixed(2)}ms. ` +
            `Loaded ${status.rulesLoaded} rules from ${status.ruleSource} (project: ${status.projectId})`,
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.initializationStatus = {
          initialized: false,
          error: errorMessage,
        };

        this.logger.error(
          `Failed to initialize engine: ${errorMessage}`,
          error instanceof Error ? error.stack : undefined,
        );

        // Don't throw here to allow the application to start
        // Users can check initialization status and handle accordingly
      }
    } else {
      this.logger.log('Auto-initialization disabled. Call initialize() manually when ready.');
    }
  }

  /**
   * NestJS lifecycle hook - cleanup when module is destroyed
   */
  async onModuleDestroy(): Promise<void> {
    try {
      await this.engine.reset();
      this.logger.log('Engine cleanup completed');
    } catch (error) {
      this.logger.error('Error during engine cleanup:', error);
    }
  }

  /**
   * Get service initialization status
   */
  getInitializationStatus(): ServiceInitializationStatus {
    return { ...this.initializationStatus };
  }

  /**
   * Manually initialize the engine (useful when autoInitialize is false)
   */
  async initialize(projectId?: string): Promise<EngineStatus> {
    this.logger.log(
      `Manually initializing engine${projectId ? ` for project: ${projectId}` : ''}...`,
    );
    try {
      const startTime = performance.now();
      const status = await this.engine.initialize(projectId);
      const initTime = performance.now() - startTime;

      this.initializationStatus = {
        initialized: true,
        initializationTime: initTime,
        rulesLoaded: status.rulesLoaded,
      };

      this.logger.log(
        `Engine initialized manually in ${initTime.toFixed(2)}ms. ` +
          `Loaded ${status.rulesLoaded} rules from ${status.ruleSource} (project: ${status.projectId})`,
      );

      return status;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.initializationStatus = {
        initialized: false,
        error: errorMessage,
      };

      this.logger.error(`Manual initialization failed: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Execute rules based on selector criteria
   */
  async execute<T = unknown>(
    selector: RuleSelector,
    input: Record<string, unknown>,
  ): Promise<MinimalExecutionResult<T>> {
    this.ensureInitialized();
    return this.engine.execute<T>(selector, input);
  }

  /**
   * Execute a single rule by ID
   */
  async executeRule<T = unknown>(ruleId: string, input: Record<string, unknown>): Promise<T> {
    this.ensureInitialized();
    return this.engine.executeRule<T>(ruleId, input);
  }

  /**
   * Execute multiple rules by IDs in parallel
   */
  async executeRules<T = unknown>(
    ruleIds: string[],
    input: Record<string, unknown>,
  ): Promise<MinimalExecutionResult<T>> {
    this.ensureInitialized();
    return this.engine.executeRules<T>(ruleIds, input);
  }

  /**
   * Execute rules by tags
   */
  async executeByTags<T = unknown>(
    tags: string[],
    input: Record<string, unknown>,
    mode: 'parallel' | 'sequential' = 'parallel',
  ): Promise<MinimalExecutionResult<T>> {
    this.ensureInitialized();
    return this.engine.executeByTags<T>(tags, input, mode);
  }

  /**
   * Validate that a rule exists and is executable
   */
  async validateRule(ruleId: string): Promise<boolean> {
    this.ensureInitialized();
    return this.engine.validateRule(ruleId);
  }

  /**
   * Get rule metadata by ID
   */
  async getRuleMetadata(ruleId: string): Promise<MinimalRuleMetadata | null> {
    this.ensureInitialized();
    return this.engine.getRuleMetadata(ruleId);
  }

  /**
   * Get all available rule metadata
   */
  async getAllRuleMetadata(): Promise<Map<string, MinimalRuleMetadata>> {
    this.ensureInitialized();
    return this.engine.getAllRuleMetadata();
  }

  /**
   * Get rules by tags
   */
  async getRulesByTags(tags: string[]): Promise<string[]> {
    this.ensureInitialized();
    return this.engine.getRulesByTags(tags);
  }

  /**
   * Check rule versions and identify outdated rules
   */
  async checkVersions() {
    this.ensureInitialized();
    return this.engine.checkVersions();
  }

  /**
   * Refresh cache by reloading outdated rules
   */
  async refreshCache(ruleIds?: string[]) {
    this.ensureInitialized();
    return this.engine.refreshCache(ruleIds);
  }

  /**
   * Force refresh entire cache
   */
  async forceRefreshCache(): Promise<EngineStatus> {
    const status = await this.engine.forceRefreshCache();

    // Update initialization status
    this.initializationStatus = {
      initialized: true,
      rulesLoaded: status.rulesLoaded,
    };

    this.logger.log(`Cache force refreshed. Loaded ${status.rulesLoaded} rules`);
    return status;
  }

  /**
   * Get current engine status
   */
  async getStatus(): Promise<EngineStatus> {
    return this.engine.getStatus();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.engine.getCacheStats();
  }

  /**
   * Reset engine state
   */
  async reset(): Promise<void> {
    await this.engine.reset();
    this.initializationStatus = {
      initialized: false,
    };
    this.logger.log('Engine reset completed');
  }

  /**
   * Get the underlying engine instance (for advanced usage)
   */
  getEngine(): MinimalGoRulesEngine {
    return this.engine;
  }

  /**
   * Health check method for NestJS health checks
   */
  async healthCheck(): Promise<{
    status: 'ok' | 'error';
    initialized: boolean;
    rulesLoaded?: number;
    lastUpdate?: number;
    error?: string;
  }> {
    try {
      const engineStatus = await this.getStatus();
      const initStatus = this.getInitializationStatus();

      return {
        status: initStatus.initialized ? 'ok' : 'error',
        initialized: initStatus.initialized,
        rulesLoaded: engineStatus.rulesLoaded,
        lastUpdate: engineStatus.lastUpdate,
        error: initStatus.error,
      };
    } catch (error) {
      return {
        status: 'error',
        initialized: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Ensure engine is initialized before operations
   */
  private ensureInitialized(): void {
    if (!this.initializationStatus.initialized) {
      const errorMsg = this.initializationStatus.error
        ? `Engine initialization failed: ${this.initializationStatus.error}`
        : 'Engine not initialized. Call initialize() first or enable autoInitialize.';

      throw new Error(errorMsg);
    }
  }
}
