/**
 * cm-rule-engine - Browser Entry Point
 * 
 * This entry point includes React integration for browser-based applications.
 */

// Export all core functionality
export * from './lib/core/index';

// React integration for browser applications (namespaced to avoid conflicts)
export * as React from './lib/react/index';

/**
 * Library version and metadata
 */
export const CM_RULE_ENGINE_VERSION = '0.0.1';
export const CM_RULE_ENGINE_NAME = 'cm-rule-engine';
