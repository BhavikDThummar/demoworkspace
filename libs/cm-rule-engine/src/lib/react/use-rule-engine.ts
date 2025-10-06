/**
 * React hook for the cm-rule-engine
 * Provides a React-friendly interface to the rule engine
 */

import { useState, useCallback, useMemo } from 'react';
import { Rule, RuleExecutionResult, RuleSelector } from '../core/types';
import { RuleEngine } from '../core/rule-engine';
import { UseRuleEngineReturn } from './types';

/**
 * React hook for using the rule engine
 * @param initialRules - Optional array of rules to initialize the engine with
 * @returns Hook return object with engine instance, state, and methods
 */
export function useRuleEngine<T = unknown>(
  initialRules?: Rule<T>[]
): UseRuleEngineReturn<T> {
  // Create engine instance once and memoize it
  const engine = useMemo(() => {
    const eng = new RuleEngine<T>();
    initialRules?.forEach((rule) => eng.addRule(rule));
    return eng;
  }, []); // Empty deps - engine is created once

  // State for processing status and results
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<RuleExecutionResult<T> | null>(null);

  // Process data through rules
  const process = useCallback(
    async (data: T[], selector?: RuleSelector) => {
      setProcessing(true);
      try {
        const res = selector
          ? await engine.processWithRules(data, selector)
          : await engine.process(data);
        setResult(res);
        return res;
      } finally {
        setProcessing(false);
      }
    },
    [engine]
  );

  // Add a rule
  const addRule = useCallback(
    (rule: Rule<T>) => {
      engine.addRule(rule);
    },
    [engine]
  );

  // Remove a rule
  const removeRule = useCallback(
    (name: string) => {
      engine.removeRule(name);
    },
    [engine]
  );

  // Toggle rule enabled state
  const toggleRule = useCallback(
    (name: string, enabled: boolean) => {
      if (enabled) {
        engine.enableRule(name);
      } else {
        engine.disableRule(name);
      }
    },
    [engine]
  );

  // Get all rules
  const getRules = useCallback(() => {
    return engine.getRules();
  }, [engine]);

  // Get rules by tags
  const getRulesByTags = useCallback(
    (tags: string[]) => {
      return engine.getRulesByTags(tags);
    },
    [engine]
  );

  return {
    engine,
    processing,
    result,
    process,
    addRule,
    removeRule,
    toggleRule,
    getRules,
    getRulesByTags,
  };
}
