/**
 * cm-rule-engine - Node.js Entry Point
 * 
 * This entry point includes NestJS integration for server-side applications.
 */

// Export all core functionality
export * from './lib/core/index';

// NestJS integration for server-side applications
export * from './lib/nestjs/index';

/**
 * Library version and metadata
 */
export const CM_RULE_ENGINE_VERSION = '0.0.1';
export const CM_RULE_ENGINE_NAME = 'cm-rule-engine';
