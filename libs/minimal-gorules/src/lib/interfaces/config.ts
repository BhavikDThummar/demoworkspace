/**
 * Configuration interfaces for the minimal GoRules engine
 */

/**
 * Minimal GoRules engine configuration
 */
export interface MinimalGoRulesConfig {
  // Required
  apiUrl: string;
  apiKey: string;
  projectId: string;

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
