/**
 * React-specific types for the cm-rule-engine
 */

import { Rule, RuleExecutionResult, RuleSelector } from '../core/types';
import { RuleEngine } from '../core/rule-engine';

/**
 * Return type for the useRuleEngine hook
 */
export interface UseRuleEngineReturn<T = unknown> {
  /** The rule engine instance */
  engine: RuleEngine<T>;

  /** Whether the engine is currently processing */
  processing: boolean;

  /** The result of the last execution */
  result: RuleExecutionResult<T> | null;

  /** Process data through rules */
  process: (
    data: T[],
    selector?: RuleSelector
  ) => Promise<RuleExecutionResult<T>>;

  /** Add a new rule */
  addRule: (rule: Rule<T>) => void;

  /** Remove a rule by name */
  removeRule: (name: string) => void;

  /** Enable or disable a rule */
  toggleRule: (name: string, enabled: boolean) => void;

  /** Get all registered rules */
  getRules: () => Rule<T>[];

  /** Get rules by tags */
  getRulesByTags: (tags: string[]) => Rule<T>[];
}
