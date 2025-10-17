/**
 * React integration entry point
 * Exports React hook and types for the cm-rule-engine
 */

// Export the main React hook
export { useRuleEngine } from './use-rule-engine';

// Export React-specific types
export type { UseRuleEngineReturn } from './types';

// Re-export core types that React users will need
export type {
  Rule,
  RuleContext,
  ValidationError,
  RuleExecutionResult,
  BatchItemResult,
  ExecutionMode,
  RuleSelector,
  BatchOptions,
} from '../core/types';

// Re-export error types
export { RuleEngineError, RuleEngineErrorCode } from '../core/types';
