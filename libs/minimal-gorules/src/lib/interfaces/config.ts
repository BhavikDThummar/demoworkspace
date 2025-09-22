/**
 * Configuration interfaces for the minimal GoRules engine
 */

/**
 * File system watch options for hot reload functionality
 */
export interface FileSystemWatchOptions {
  ignored?: string | RegExp | (string | RegExp)[];
  persistent?: boolean;
  ignoreInitial?: boolean;
}

/**
 * File system options for local rule loading
 */
export interface FileSystemOptions {
  recursive?: boolean; // default: true
  watchOptions?: FileSystemWatchOptions;
}

/**
 * Minimal GoRules engine configuration
 */
export interface MinimalGoRulesConfig {
  // Rule source configuration
  ruleSource?: 'cloud' | 'local'; // default: 'cloud'

  // Cloud-specific configuration (required when ruleSource === 'cloud')
  apiUrl?: string;
  apiKey?: string;
  projectId?: string;

  // Local rule configuration (required when ruleSource === 'local')
  localRulesPath?: string;
  enableHotReload?: boolean; // default: false, only for local rules
  metadataFilePattern?: string; // default: '*.meta.json'
  fileSystemOptions?: FileSystemOptions;

  // Optional performance settings
  cacheMaxSize?: number; // default: 1000
  httpTimeout?: number; // default: 5000ms
  batchSize?: number; // default: 50

  // Cross-platform settings
  platform?: 'node' | 'browser';

  // Performance optimization settings
  enablePerformanceOptimizations?: boolean; // default: false
  enablePerformanceMetrics?: boolean; // default: false
  memoryWarningThreshold?: number; // default: 0.7 (70%)
  memoryCriticalThreshold?: number; // default: 0.85 (85%)
  memoryCleanupInterval?: number; // default: 30000ms
  enableConnectionPooling?: boolean; // default: true when optimizations enabled
  enableRequestBatching?: boolean; // default: true when optimizations enabled
  enableCompression?: boolean; // default: true when optimizations enabled
  compressionAlgorithm?: 'gzip' | 'deflate' | 'none'; // default: 'gzip'
}

/**
 * Configuration validation result
 */
export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
}
