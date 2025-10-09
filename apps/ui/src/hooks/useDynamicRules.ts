import { useState, useEffect, useCallback } from 'react';
import { Rule, RuleContext } from '@org/cm-rule-engine';
import { IBOMItem } from '../types/BOMTypes';
import { DynamicRuleDefinition, convertToRules, evaluateFunction } from '../services/dynamicRuleLoader';

const API_BASE_URL = 'https://localhost:8001/api';

export interface UseDynamicRulesResult {
  rules: Rule<IBOMItem>[];
  loading: boolean;
  error: string | null;
  loadRules: () => Promise<void>;
  refreshRules: () => Promise<void>;
  testRule: (functionCode: string, testData: IBOMItem[]) => { success: boolean; error?: string; results?: unknown[] };
}

export function useDynamicRules(): UseDynamicRulesResult {
  const [rules, setRules] = useState<Rule<IBOMItem>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRules = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/custom-rules/qpa-refdes/dynamic-rules`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data?.data?.success) {
        throw new Error(data.error || 'Failed to load dynamic rules');
      }

      const loadedRules = convertToRules(data?.data?.rules as DynamicRuleDefinition[]);
      setRules(loadedRules);
      
      console.log(`Loaded ${loadedRules.length} dynamic rules from API`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Failed to load dynamic rules:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshRules = useCallback(async () => {
    await loadRules();
  }, [loadRules]);

  const testRule = useCallback((functionCode: string, testData: IBOMItem[]) => {
    try {
      const testFn = evaluateFunction<(context: RuleContext<IBOMItem>) => unknown>(
        functionCode,
        'test-function'
      );

      if (!testFn) {
        return { success: false, error: 'Failed to evaluate function' };
      }

      const results = testData.map((item, index) => {
        try {
          return testFn({
            item,
            allItems: testData,
            index,
            metadata: {},
          });
        } catch (error) {
          return { error: error instanceof Error ? error.message : 'Unknown error' };
        }
      });

      return { success: true, results };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }, []);

  // Auto-load rules on mount
  useEffect(() => {
    loadRules();
  }, [loadRules]);

  return {
    rules,
    loading,
    error,
    loadRules,
    refreshRules,
    testRule,
  };
}