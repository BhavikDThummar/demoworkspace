/**
 * Hot Reload Manager for file system-based rule loading
 * Provides cross-platform file watching with debouncing and event handling
 */

import * as chokidar from 'chokidar';
import { MinimalGoRulesError, MinimalErrorCode } from '../errors/index.js';
import { 
  CrossPlatformPathUtils, 
  CrossPlatformWatchUtils, 
  CrossPlatformValidationUtils 
} from './cross-platform-utils.js';

/**
 * Hot reload change types
 */
export type HotReloadChangeType = 'added' | 'modified' | 'deleted';

/**
 * Hot reload event callback
 */
export type HotReloadCallback = (ruleId: string, change: HotReloadChangeType) => void;

/**
 * Hot reload manager options
 */
export interface HotReloadOptions {
  /** Debounce delay in milliseconds (default: 300) */
  debounceDelay?: number;
  /** File patterns to ignore */
  ignored?: string | RegExp | (string | RegExp)[];
  /** Whether to watch persistently (default: true) */
  persistent?: boolean;
  /** Whether to ignore initial add events (default: true) */
  ignoreInitial?: boolean;
  /** File extension to watch (default: '.json') */
  fileExtension?: string;
}

/**
 * Debounced event entry
 */
interface DebouncedEvent {
  ruleId: string;
  change: HotReloadChangeType;
  timeout: NodeJS.Timeout;
}

/**
 * Hot Reload Manager interface
 */
export interface IHotReloadManager {
  start(): Promise<void>;
  stop(): Promise<void>;
  onRuleChanged(callback: HotReloadCallback): void;
  removeCallback(callback: HotReloadCallback): void;
  isWatching(): boolean;
}

/**
 * Hot Reload Manager implementation
 * Provides file system watching with cross-platform support and debouncing
 */
export class HotReloadManager implements IHotReloadManager {
  private watcher?: chokidar.FSWatcher;
  private readonly callbacks: Set<HotReloadCallback> = new Set();
  private readonly debouncedEvents: Map<string, DebouncedEvent> = new Map();
  private readonly debounceDelay: number;
  private readonly fileExtension: string;
  private isActive = false;

  constructor(private readonly rulesPath: string, private readonly options: HotReloadOptions = {}) {
    // Validate and normalize rules path using cross-platform utilities
    if (!rulesPath) {
      throw new MinimalGoRulesError(
        MinimalErrorCode.CONFIG_ERROR,
        'Rules path is required for HotReloadManager',
      );
    }
    
    CrossPlatformValidationUtils.validateFilePath(rulesPath);
    
    // Use platform-specific debounce delay if not provided
    this.debounceDelay = options.debounceDelay ?? CrossPlatformWatchUtils.getRecommendedDebounceDelay();
    this.fileExtension = options.fileExtension ?? '.json';
  }

  /**
   * Start file system watching
   */
  async start(): Promise<void> {
    if (this.isActive) {
      console.warn('HotReloadManager is already active');
      return;
    }

    try {
      // Get platform-specific watch options
      const platformWatchOptions = CrossPlatformWatchUtils.getPlatformWatchOptions(this.rulesPath);
      
      // Merge with user-provided options
      const watchOptions = {
        ...platformWatchOptions,
        ignored: this.options.ignored ?? platformWatchOptions.ignored,
        persistent: this.options.persistent ?? platformWatchOptions.persistent,
        ignoreInitial: this.options.ignoreInitial ?? platformWatchOptions.ignoreInitial,
        recursive: true,
        // Only watch JSON files
        glob: `**/*${this.fileExtension}`,
      };
      
      // Create watcher with platform-optimized options
      this.watcher = chokidar.watch(this.rulesPath, watchOptions);

      // Set up event handlers
      this.watcher
        .on('add', (filePath) => this.handleFileEvent(filePath, 'added'))
        .on('change', (filePath) => this.handleFileEvent(filePath, 'modified'))
        .on('unlink', (filePath) => this.handleFileEvent(filePath, 'deleted'))
        .on('error', (error) => this.handleWatcherError(error))
        .on('ready', () => {
          console.log(`Hot reload manager watching: ${this.rulesPath}`);
          this.isActive = true;
        });

      // Wait for watcher to be ready
      await new Promise<void>((resolve, reject) => {
        if (!this.watcher) {
          reject(new Error('Watcher not initialized'));
          return;
        }

        this.watcher.on('ready', resolve);
        this.watcher.on('error', reject);
      });
    } catch (error) {
      this.isActive = false;
      throw new MinimalGoRulesError(
        MinimalErrorCode.CONFIG_ERROR,
        `Failed to start hot reload manager: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        undefined,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Stop file system watching
   */
  async stop(): Promise<void> {
    if (!this.isActive) {
      return;
    }

    try {
      // Clear all debounced events
      for (const event of this.debouncedEvents.values()) {
        clearTimeout(event.timeout);
      }
      this.debouncedEvents.clear();

      // Close watcher
      if (this.watcher) {
        await this.watcher.close();
        this.watcher = undefined;
      }

      this.isActive = false;
      console.log('Hot reload manager stopped');
    } catch (error) {
      throw new MinimalGoRulesError(
        MinimalErrorCode.CONFIG_ERROR,
        `Failed to stop hot reload manager: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        undefined,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Register callback for rule change events
   */
  onRuleChanged(callback: HotReloadCallback): void {
    this.callbacks.add(callback);
  }

  /**
   * Remove callback for rule change events
   */
  removeCallback(callback: HotReloadCallback): void {
    this.callbacks.delete(callback);
  }

  /**
   * Check if watcher is currently active
   */
  isWatching(): boolean {
    return this.isActive;
  }

  /**
   * Handle file system events with debouncing
   */
  private handleFileEvent(filePath: string, change: HotReloadChangeType): void {
    try {
      // Convert file path to rule ID
      const ruleId = this.filePathToRuleId(filePath);

      // Skip if not a rule file
      if (!ruleId) {
        return;
      }

      // Clear existing debounced event for this rule
      const existingEvent = this.debouncedEvents.get(ruleId);
      if (existingEvent) {
        clearTimeout(existingEvent.timeout);
      }

      // Create new debounced event
      const timeout = setTimeout(() => {
        this.debouncedEvents.delete(ruleId);
        this.notifyCallbacks(ruleId, change);
      }, this.debounceDelay);

      this.debouncedEvents.set(ruleId, {
        ruleId,
        change,
        timeout,
      });
    } catch (error) {
      console.error(`Error handling file event for ${filePath}:`, error);
    }
  }

  /**
   * Handle watcher errors
   */
  private handleWatcherError(error: Error): void {
    console.error('File watcher error:', error);

    // Emit error to callbacks if needed
    // For now, just log the error and continue watching
  }

  /**
   * Convert file path to rule ID using cross-platform utilities
   * Returns null if the file is not a rule file
   */
  private filePathToRuleId(filePath: string): string | null {
    try {
      // Ensure file has correct extension
      if (!filePath.endsWith(this.fileExtension)) {
        return null;
      }

      // Skip metadata files
      if (filePath.includes('.meta.json')) {
        return null;
      }

      // Normalize both paths to ensure consistent comparison
      const normalizedRulesPath = CrossPlatformPathUtils.resolvePath('.', this.rulesPath);
      const normalizedFilePath = CrossPlatformPathUtils.resolvePath('.', filePath);

      // Get relative path from rules directory using cross-platform utilities
      const relativePath = CrossPlatformPathUtils.getRelativePath(normalizedRulesPath, normalizedFilePath);

      // Convert to rule ID (remove extension and normalize separators to forward slashes)
      const withoutExtension = relativePath.replace(this.fileExtension, '');
      const ruleId = CrossPlatformPathUtils.toForwardSlashes(withoutExtension);

      return ruleId;
    } catch (error) {
      console.error(`Error converting file path to rule ID: ${filePath}`, error);
      return null;
    }
  }

  /**
   * Notify all registered callbacks
   */
  private notifyCallbacks(ruleId: string, change: HotReloadChangeType): void {
    console.log(`Rule ${change}: ${ruleId}`);

    for (const callback of this.callbacks) {
      try {
        callback(ruleId, change);
      } catch (error) {
        console.error(`Error in hot reload callback for rule ${ruleId}:`, error);
      }
    }
  }

  /**
   * Get current number of registered callbacks (for testing)
   */
  public getCallbackCount(): number {
    return this.callbacks.size;
  }

  /**
   * Get current rules path (for testing)
   */
  public getRulesPath(): string {
    return this.rulesPath;
  }
}
