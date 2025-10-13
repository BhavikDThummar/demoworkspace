/**
 * Core library entry point
 * Exports all core types and classes for the cm-rule-engine
 */

// Export main RuleEngine class
export { RuleEngine } from './rule-engine';

// Export core types and interfaces
export type {
  Rule,
  RuleContext,
  ValidationError,
  RuleExecutionResult,
  BatchItemResult,
  ExecutionMode,
  RuleSelector,
  BatchOptions,
} from './types';

// Export error types
export { RuleEngineError, RuleEngineErrorCode } from './types';

// Export RuleManager for advanced use cases
export { RuleManager } from './rule-manager';

// Export ExecutionEngine for advanced use cases
export { ExecutionEngine } from './execution-engine';

// Export BatchDataProvider for batch data management
export { BatchDataProvider } from './batch-data-provider';
export type { BatchDataContext, DataFetcher } from './batch-data-provider';
