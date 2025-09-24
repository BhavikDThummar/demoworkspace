/**
 * Local Rule Loader Service for file system-based rule loading
 * High-performance local file system integration for project-wide rule loading
 */

import * as fs from 'fs';
import { promisify } from 'util';
import {
  IRuleLoaderService,
  MinimalRuleMetadata,
  MinimalGoRulesConfig,
} from '../interfaces/index.js';
import { MinimalGoRulesError, MinimalErrorCode } from '../errors/index.js';
import { FileSystemErrorHandler } from '../errors/file-system-error-handler.js';
import {
  FileSystemRuleScanner,
  HotReloadManager,
  IHotReloadManager,
  HotReloadChangeType,
  CrossPlatformPathUtils,
} from '../file-system/index.js';
import { ConfigValidator } from '../validation/index.js';

// Promisify fs methods for async/await usage
const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);

/**
 * File system stat cache entry
 */
interface StatCacheEntry {
  mtime: number;
  size: number;
  timestamp: number;
}

/**
 * Hot reload callback for cache updates
 */
export type CacheUpdateCallback = (ruleId: string, change: HotReloadChangeType) => void;

/**
 * Local Rule Loader Service implementation
 * Optimized for local file system rule loading with caching and error handling
 */
export class LocalRuleLoaderService implements IRuleLoaderService {
  private readonly rulesPath: string;
  private readonly scanner: FileSystemRuleScanner;
  private readonly statCache: Map<string, StatCacheEntry> = new Map();
  private readonly statCacheTimeout: number = 5000; // 5 seconds cache timeout
  private readonly hotReloadManager?: IHotReloadManager;
  private readonly enableHotReload: boolean;
  private readonly cacheUpdateCallbacks: Set<CacheUpdateCallback> = new Set();

  constructor(config: MinimalGoRulesConfig) {
    // Validate configuration
    const validation = ConfigValidator.validateHybridConfig(config);
    if (!validation.isValid) {
      throw new MinimalGoRulesError(
        MinimalErrorCode.CONFIG_ERROR,
        `Invalid local rule loader configuration: ${validation.errors.join(', ')}`,
      );
    }

    if (config.ruleSource !== 'local') {
      throw new MinimalGoRulesError(
        MinimalErrorCode.CONFIG_ERROR,
        `LocalRuleLoaderService requires ruleSource to be 'local', got '${config.ruleSource}'`,
      );
    }

    if (!config.localRulesPath) {
      throw new MinimalGoRulesError(
        MinimalErrorCode.CONFIG_ERROR,
        'localRulesPath is required for LocalRuleLoaderService',
      );
    }

    this.rulesPath = CrossPlatformPathUtils.resolvePath('.', config.localRulesPath);
    this.enableHotReload = config.enableHotReload ?? false;

    // Initialize file system scanner
    this.scanner = new FileSystemRuleScanner(this.rulesPath, {
      recursive: config.fileSystemOptions?.recursive ?? true,
      fileExtension: '.json',
      metadataPattern: config.metadataFilePattern ?? '.meta.json',
    });

    // Initialize hot reload manager if enabled
    if (this.enableHotReload) {
      try {
        this.hotReloadManager = new HotReloadManager(this.rulesPath, {
          debounceDelay: 300,
          ignored: config.fileSystemOptions?.watchOptions?.ignored ?? [
            '**/node_modules/**',
            '**/.git/**',
            '**/.DS_Store',
            '**/Thumbs.db',
          ],
          persistent: config.fileSystemOptions?.watchOptions?.persistent ?? true,
          ignoreInitial: config.fileSystemOptions?.watchOptions?.ignoreInitial ?? true,
          fileExtension: '.json',
        });

        // Register for rule change events
        this.hotReloadManager.onRuleChanged((ruleId, change) => {
          this.handleRuleChange(ruleId, change);
        });

        console.log(`Hot reload enabled for local rules at: ${this.rulesPath}`);
      } catch (error) {
        console.warn(
          `Failed to initialize hot reload: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        );
        // Continue without hot reload if initialization fails
      }
    }
  }

  /**
   * Load all rules from local file system at startup
   * Primary method for initial rule loading with batch optimization
   */
  async loadAllRules(
    projectId?: string, // Ignored for local loading, kept for interface compatibility
  ): Promise<Map<string, { data: Buffer; metadata: MinimalRuleMetadata }>> {
    try {
      console.log(`Loading all rules from local path: ${this.rulesPath}`);

      // Use batch loading for improved performance
      return await this.loadRulesBatch();
    } catch (error) {
      if (error instanceof MinimalGoRulesError) {
        throw error;
      }

      // Handle file system errors specifically
      if (FileSystemErrorHandler.isFileSystemError(error as Error)) {
        throw FileSystemErrorHandler.handleDirectoryError(error as Error, this.rulesPath);
      }

      throw new MinimalGoRulesError(
        MinimalErrorCode.CONFIG_ERROR,
        `Failed to load all rules from ${this.rulesPath}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        undefined,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Batch load multiple rules for improved I/O performance
   * Loads files in parallel with controlled concurrency
   */
  async loadRulesBatch(
    ruleIds?: string[],
  ): Promise<Map<string, { data: Buffer; metadata: MinimalRuleMetadata }>> {
    const startTime = performance.now();

    try {
      let filePaths: string[];

      if (ruleIds) {
        // Load specific rules by ID
        filePaths = ruleIds.map((id) => this.resolveRuleFilePath(id));
      } else {
        // Scan directory for all rule files
        const fileSystemRules = await FileSystemErrorHandler.wrapDirectoryOperation(
          () => this.scanner.scanDirectory(),
          this.rulesPath,
        );

        if (fileSystemRules.length === 0) {
          console.warn(`No rule files found in ${this.rulesPath}`);
          return new Map();
        }

        console.log(`Found ${fileSystemRules.length} rule files`);

        // Extract file paths for batch loading
        filePaths = fileSystemRules.map((rule) => rule.filePath);
      }

      // Batch load files with controlled concurrency (max 10 concurrent operations)
      const batchSize = 10;
      const rules = new Map<string, { data: Buffer; metadata: MinimalRuleMetadata }>();
      const errors: string[] = [];

      for (let i = 0; i < filePaths.length; i += batchSize) {
        const batch = filePaths.slice(i, i + batchSize);

        // Load batch in parallel
        const batchPromises = batch.map(async (filePath) => {
          try {
            const ruleId = this.generateRuleIdFromPath(filePath);

            // Load file content and metadata in parallel
            const [data, metadata] = await Promise.all([
              this.loadFileContent(filePath),
              this.loadFileMetadata(filePath, ruleId),
            ]);

            return { ruleId, data, metadata };
          } catch (error) {
            const errorMessage = `Failed to load rule from ${filePath}: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`;
            errors.push(errorMessage);
            return null;
          }
        });

        const batchResults = await Promise.all(batchPromises);

        // Add successful results to the map
        for (const result of batchResults) {
          if (result) {
            rules.set(result.ruleId, {
              data: result.data,
              metadata: result.metadata,
            });
          }
        }
      }

      const loadTime = performance.now() - startTime;
      console.log(`Batch loaded ${rules.size} rules in ${loadTime.toFixed(2)}ms`);

      // Report errors but don't fail if we have some valid rules
      if (errors.length > 0) {
        console.warn(`Encountered ${errors.length} errors while batch loading rules:`, errors);

        // If all rules failed to load, throw an error
        if (rules.size === 0 && filePaths.length > 0) {
          throw new MinimalGoRulesError(
            MinimalErrorCode.FILE_SYSTEM_ERROR,
            `Failed to load any rules from ${this.rulesPath}. Errors: ${errors.join('; ')}`,
          );
        }
      }

      return rules;
    } catch (error) {
      if (error instanceof MinimalGoRulesError) {
        throw error;
      }

      throw new MinimalGoRulesError(
        MinimalErrorCode.CONFIG_ERROR,
        `Failed to batch load rules: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Load individual rule for updates and version checking
   */
  async loadRule(ruleId: string): Promise<{ data: Buffer; metadata: MinimalRuleMetadata }> {
    try {
      // Convert rule ID back to file path
      const filePath = this.resolveRuleFilePath(ruleId);

      // Load the specific rule file with error handling
      const rule = await FileSystemErrorHandler.wrapFileOperation(
        () => this.scanner.loadRuleFile(filePath),
        filePath,
      );

      return {
        data: rule.data,
        metadata: rule.metadata,
      };
    } catch (error) {
      if (error instanceof MinimalGoRulesError) {
        throw error;
      }

      // Handle file system errors specifically
      if (FileSystemErrorHandler.isFileSystemError(error as Error)) {
        const filePath = this.resolveRuleFilePath(ruleId);
        throw FileSystemErrorHandler.handleFileError(error as Error, filePath);
      }

      throw new MinimalGoRulesError(
        MinimalErrorCode.RULE_NOT_FOUND,
        `Failed to load rule ${ruleId}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        ruleId,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Check versions of multiple rules for cache invalidation
   * Compares file modification times with cached versions
   */
  async checkVersions(rules: Map<string, string>): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    const errors: string[] = [];

    for (const [ruleId, currentVersion] of rules) {
      try {
        const filePath = this.resolveRuleFilePath(ruleId);

        // Get file stats with error handling
        const fileStats = await FileSystemErrorHandler.wrapFileOperation(
          () => this.getFileStats(filePath),
          filePath,
        );

        // Use file modification time as version
        const fileVersion = fileStats.mtime.getTime().toString();

        // Rule needs update if versions don't match
        results.set(ruleId, fileVersion !== currentVersion);
      } catch (error) {
        // If file doesn't exist or can't be accessed, mark as needing update (will be removed from cache)
        results.set(ruleId, true);

        // Provide more specific error messages based on error type
        let errorMessage: string;
        if (error instanceof MinimalGoRulesError) {
          errorMessage = `Failed to check version for rule ${ruleId}: ${error.message}`;
        } else if (FileSystemErrorHandler.isFileSystemError(error as Error)) {
          const filePath = this.resolveRuleFilePath(ruleId);
          const fsError = FileSystemErrorHandler.handleFileError(error as Error, filePath);
          errorMessage = `Failed to check version for rule ${ruleId}: ${fsError.message}`;
        } else {
          errorMessage = `Failed to check version for rule ${ruleId}: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`;
        }

        errors.push(errorMessage);
      }
    }

    // Log errors but don't throw - allow partial success
    if (errors.length > 0) {
      console.warn('Version check errors:', errors);
    }

    return results;
  }

  /**
   * Refresh individual rule (alias for loadRule for API consistency)
   */
  async refreshRule(ruleId: string): Promise<{ data: Buffer; metadata: MinimalRuleMetadata }> {
    return this.loadRule(ruleId);
  }

  /**
   * Resolve rule ID to file path using cross-platform utilities
   * Converts rule ID back to file system path
   * Example: pricing/shipping-fees -> {rulesPath}/pricing/shipping-fees.json
   */
  private resolveRuleFilePath(ruleId: string): string {
    // Convert forward slashes to platform-specific path separators
    const relativePath = CrossPlatformPathUtils.fromForwardSlashes(ruleId);

    // Add .json extension
    const fileName = `${relativePath}.json`;

    // Resolve full path using cross-platform utilities
    const fullPath = CrossPlatformPathUtils.joinPath(this.rulesPath, fileName);
    const resolvedPath = CrossPlatformPathUtils.resolvePath('.', fullPath);
    const resolvedRulesPath = CrossPlatformPathUtils.resolvePath('.', this.rulesPath);

    // Ensure the resolved path is within the rules directory (security check)
    if (!CrossPlatformPathUtils.isPathWithinBase(resolvedRulesPath, resolvedPath)) {
      throw new MinimalGoRulesError(
        MinimalErrorCode.CONFIG_ERROR,
        `Rule ID ${ruleId} resolves to path outside rules directory: ${resolvedPath}`,
      );
    }

    return resolvedPath;
  }

  /**
   * Get file stats with caching to optimize repeated version checks
   */
  private async getFileStats(filePath: string): Promise<fs.Stats> {
    const now = Date.now();
    const cached = this.statCache.get(filePath);

    // Return cached stats if still valid
    if (cached && now - cached.timestamp < this.statCacheTimeout) {
      // Create a minimal stats-like object with the cached data
      return {
        mtime: new Date(cached.mtime),
        size: cached.size,
      } as fs.Stats;
    }

    try {
      const stats = await stat(filePath);

      // Cache the stats
      this.statCache.set(filePath, {
        mtime: stats.mtime.getTime(),
        size: stats.size,
        timestamp: now,
      });

      return stats;
    } catch (error) {
      // Remove invalid cache entry
      this.statCache.delete(filePath);

      // Let the error bubble up to be handled by FileSystemErrorHandler
      throw error;
    }
  }

  /**
   * Clear stat cache (useful for testing or when files are known to have changed)
   */
  public clearStatCache(): void {
    this.statCache.clear();
  }

  /**
   * Get current rules path (useful for debugging)
   */
  public getRulesPath(): string {
    return this.rulesPath;
  }

  /**
   * Start hot reload watching (if enabled)
   */
  public async startHotReload(): Promise<void> {
    if (this.hotReloadManager && !this.hotReloadManager.isWatching()) {
      await this.hotReloadManager.start();
    }
  }

  /**
   * Stop hot reload watching (if enabled)
   */
  public async stopHotReload(): Promise<void> {
    if (this.hotReloadManager && this.hotReloadManager.isWatching()) {
      await this.hotReloadManager.stop();
    }
  }

  /**
   * Check if hot reload is enabled and active
   */
  public isHotReloadActive(): boolean {
    return this.enableHotReload && (this.hotReloadManager?.isWatching() ?? false);
  }

  /**
   * Register callback for cache update events
   * This allows the cache manager to be notified of rule changes
   */
  public onCacheUpdate(callback: CacheUpdateCallback): void {
    this.cacheUpdateCallbacks.add(callback);
  }

  /**
   * Remove cache update callback
   */
  public removeCacheUpdateCallback(callback: CacheUpdateCallback): void {
    this.cacheUpdateCallbacks.delete(callback);
  }

  /**
   * Handle rule change events from hot reload manager
   */
  private handleRuleChange(ruleId: string, change: HotReloadChangeType): void {
    try {
      // Clear stat cache for the changed rule
      const filePath = this.resolveRuleFilePath(ruleId);
      this.statCache.delete(filePath);

      // Notify cache update callbacks with error handling
      for (const callback of this.cacheUpdateCallbacks) {
        try {
          callback(ruleId, change);
        } catch (error) {
          // Log callback errors but don't let them stop other callbacks
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(
            `Error in cache update callback for rule ${ruleId}: ${errorMessage}`,
            error,
          );
        }
      }

      console.log(`Rule ${change}: ${ruleId} - cache invalidated`);
    } catch (error) {
      // Handle errors in rule change processing
      let errorMessage: string;
      if (error instanceof MinimalGoRulesError) {
        errorMessage = error.message;
      } else if (FileSystemErrorHandler.isFileSystemError(error as Error)) {
        const fsError = FileSystemErrorHandler.handleFileError(error as Error, ruleId);
        errorMessage = fsError.message;
      } else {
        errorMessage = error instanceof Error ? error.message : 'Unknown error';
      }

      console.error(`Error handling rule change for ${ruleId}: ${errorMessage}`, error);
    }
  }

  /**
   * Get hot reload manager (for testing)
   */
  public getHotReloadManager(): IHotReloadManager | undefined {
    return this.hotReloadManager;
  }

  /**
   * Load file content with error handling
   */
  private async loadFileContent(filePath: string): Promise<Buffer> {
    try {
      const data = await readFile(filePath);

      // Validate JSON format
      try {
        JSON.parse(data.toString('utf-8'));
      } catch (jsonError) {
        throw FileSystemErrorHandler.handleJsonParseError(jsonError as Error, filePath);
      }

      return data;
    } catch (error) {
      if (error instanceof MinimalGoRulesError) {
        throw error;
      }

      if (FileSystemErrorHandler.isFileSystemError(error as Error)) {
        throw FileSystemErrorHandler.handleFileError(error as Error, filePath);
      }

      throw new MinimalGoRulesError(
        MinimalErrorCode.FILE_SYSTEM_ERROR,
        `Failed to load file content: ${filePath}`,
        undefined,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Load file metadata with caching
   */
  private async loadFileMetadata(filePath: string, ruleId: string): Promise<MinimalRuleMetadata> {
    try {
      // First, try to extract name from the rule file itself
      let ruleName: string | undefined;
      try {
        const ruleContent = await readFile(filePath, 'utf-8');
        const ruleData = JSON.parse(ruleContent);
        ruleName = ruleData.name;
      } catch (error) {
        // Ignore errors when extracting name from rule file
      }

      // Check for metadata file first
      const metadataPath = this.getMetadataPath(filePath);

      try {
        const metadataContent = await readFile(metadataPath, 'utf-8');
        const metadataFile = JSON.parse(metadataContent);

        // Get file stats for lastModified fallback
        const stats = await this.getFileStats(filePath);

        return {
          id: ruleId,
          name: ruleName, // Include name from rule file
          version: metadataFile.version || stats.mtime.getTime().toString(),
          tags: metadataFile.tags || [],
          lastModified: metadataFile.lastModified
            ? new Date(metadataFile.lastModified).getTime()
            : stats.mtime.getTime(),
        };
      } catch {
        // If metadata file doesn't exist or is invalid, generate default metadata
        return this.generateDefaultMetadata(filePath, ruleId, ruleName);
      }
    } catch (error) {
      // Fallback to default metadata on any error
      return this.generateDefaultMetadata(filePath, ruleId);
    }
  }

  /**
   * Generate default metadata from file stats with caching
   */
  private async generateDefaultMetadata(
    filePath: string,
    ruleId: string,
    name?: string,
  ): Promise<MinimalRuleMetadata> {
    try {
      const stats = await this.getFileStats(filePath);

      return {
        id: ruleId,
        name,
        version: stats.mtime.getTime().toString(),
        tags: [],
        lastModified: stats.mtime.getTime(),
      };
    } catch (error) {
      // Return minimal metadata if file stats fail
      return {
        id: ruleId,
        version: Date.now().toString(),
        tags: [],
        lastModified: Date.now(),
      };
    }
  }

  /**
   * Generate rule ID from file path
   */
  private generateRuleIdFromPath(filePath: string): string {
    // Get relative path from base path using cross-platform utilities
    const relativePath = CrossPlatformPathUtils.getRelativePath(this.rulesPath, filePath);

    // Remove file extension
    const withoutExtension = relativePath.replace(
      CrossPlatformPathUtils.getExtension(relativePath),
      '',
    );

    // Convert path separators to forward slashes for consistent rule IDs across platforms
    const ruleId = CrossPlatformPathUtils.toForwardSlashes(withoutExtension);

    return ruleId;
  }

  /**
   * Get metadata file path for a rule file using cross-platform utilities
   */
  private getMetadataPath(ruleFilePath: string): string {
    const dir = CrossPlatformPathUtils.getDirName(ruleFilePath);
    const baseName = CrossPlatformPathUtils.getBaseName(ruleFilePath);
    return CrossPlatformPathUtils.joinPath(dir, `${baseName}.meta.json`);
  }
}
