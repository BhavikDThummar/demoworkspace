/**
 * NestJS integration for cm-rule-engine
 * Provides module, service, and types for NestJS applications
 */

export { RuleEngineModule } from './rule-engine.module';
export { RuleEngineService, RULE_ENGINE_OPTIONS } from './rule-engine.service';
export type {
  RuleEngineModuleOptions,
  RuleEngineModuleOptionsFactory,
  RuleEngineModuleAsyncOptions,
} from './types';

// Re-export core types for convenience
export type {
  Rule,
  RuleContext,
  ValidationError,
  RuleExecutionResult,
  BatchItemResult,
  ExecutionMode,
  RuleSelector,
  BatchOptions,
  RuleEngineErrorCode,
} from '../core/types';
export { RuleEngineError } from '../core/types';
