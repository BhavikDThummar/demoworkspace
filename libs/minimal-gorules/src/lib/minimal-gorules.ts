/**
 * Minimal GoRules Engine
 * A high-performance, low-overhead GoRules engine optimized for speed and efficiency
 */

// Re-export all interfaces and types
export * from './interfaces/index.js';
export * from './errors/index.js';
export * from './cache/index.js';
export * from './loader/index.js';
export * from './tag-manager/index.js';
export * from './execution/index.js';
export * from './version/index.js';
export * from './config/index.js';

// Export batch execution interfaces specifically
export type {
  BatchExecutionOptions,
  BatchExecutionResult,
  BatchInputResult,
} from './execution/interfaces.js';

// Export main engine service
export * from './minimal-gorules-engine.js';

// Export NestJS integration
export * from './nestjs/index.js';

// Performance optimizations removed for minimal implementation

/**
 * Library version and metadata
 */
export const MINIMAL_GORULES_VERSION = '1.0.0';
export const MINIMAL_GORULES_NAME = 'minimal-gorules';
