/**
 * NestJS integration for cm-rule-engine
 * Provides module, service, and types for NestJS applications
 */

export { RuleEngineModule } from './rule-engine.module';
export { RuleEngineService, RULE_ENGINE_OPTIONS } from './rule-engine.service';
export { BatchDataProvider } from '../core/batch-data-provider';
export { BatchDataRuleFactory } from './batch-data-rule';
export type {
  RuleEngineModuleOptions,
  RuleEngineModuleOptionsFactory,
  RuleEngineModuleAsyncOptions,
} from './types';
export type {
  BatchDataContext,
  DataFetcher,
} from '../core/batch-data-provider';
export type {
  BatchDataRuleConfig,
} from './batch-data-rule';

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
