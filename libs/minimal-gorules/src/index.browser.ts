// Re-export all interfaces and types
export * from './lib/interfaces/index';
export * from './lib/errors/index';
export * from './lib/cache/index';
export * from './lib/loader/index';
export * from './lib/tag-manager/index';
export * from './lib/execution/index';
export * from './lib/version/index';
export * from './lib/config/index';

// Export main engine service
export * from './lib/minimal-gorules-engine';

// Export performance optimizations
export * from './lib/performance/index';

// React integration (namespaced to avoid conflicts)
export * as React from './lib/react/index';

/**
 * Library version and metadata
 */
export const MINIMAL_GORULES_VERSION = '1.0.0';
export const MINIMAL_GORULES_NAME = 'minimal-gorules';