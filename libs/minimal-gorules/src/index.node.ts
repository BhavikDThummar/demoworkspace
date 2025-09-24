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

// Performance optimizations removed for minimal implementation

// NestJS integration
export * from './lib/nestjs/index';

/**
 * Library version and metadata
 */
export const MINIMAL_GORULES_VERSION = '1.0.0';
export const MINIMAL_GORULES_NAME = 'minimal-gorules';
