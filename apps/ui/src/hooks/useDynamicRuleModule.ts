/**
 * Hook for loading dynamic rule modules
 * Uses secure ES module loading instead of eval()
 */

import { useState, useEffect, useCallback } from 'react';
import { Rule } from '@org/cm-rule-engine';
import { IBOMItem } from '../types/BOMTypes';
import { loadRuleModule, getModuleInfo, refreshModule } from '../services/dynamicRuleModuleLoader';

export interface UseDynamicRuleModuleResult {
  rules: Rule<IBOMItem>[];
  loading: boolean;
  error: string | null;
  loadRules: () => Promise<void>;
  refreshRules: () => Promise<void>;
  moduleInfo: {
    loaded: boolean;
    timestamp?: string;
    moduleUrl?: string;
  };
}

export function useDynamicRuleModule(moduleName = 'qpa-refdes'): UseDynamicRuleModuleResult {
  const [rules, setRules] = useState<Rule<IBOMItem>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [moduleInfo, setModuleInfo] = useState<{
    loaded: boolean;
    timestamp?: string;
    moduleUrl?: string;
  }>({ loaded: false });

  const loadRules = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      debugger;
      console.log(`Loading rule module: ${moduleName}`);
      const result = await loadRuleModule(moduleName);

      if (!result.success || !result.rules) {
        throw new Error(result.error || 'Failed to load rules');
      }

      setRules(result.rules);
      setModuleInfo({
        loaded: true,
        timestamp: result.timestamp,
        moduleUrl: result.moduleUrl,
      });
      
      console.log(`Successfully loaded ${result.rules.length} rules from module`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Failed to load rule module:', err);
      setModuleInfo({ loaded: false });
    } finally {
      setLoading(false);
    }
  }, [moduleName]);

  const refreshRules = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // First, trigger refresh on the API side
      console.log('Refreshing module on API side...');
      const refreshResult = await refreshModule(moduleName);
      
      if (!refreshResult.success) {
        throw new Error(refreshResult.error || 'Failed to refresh module on API');
      }

      // Then reload the module
      await loadRules();
      
      console.log('Module refreshed successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Failed to refresh rules:', err);
    } finally {
      setLoading(false);
    }
  }, [moduleName, loadRules]);

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
    moduleInfo,
  };
}

/**
 * Hook for getting module information without loading it
 */
export function useModuleInfo(moduleName = 'qpa-refdes') {
  const [info, setInfo] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInfo = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getModuleInfo(moduleName);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to get module info');
      }

      setInfo(result.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [moduleName]);

  useEffect(() => {
    fetchInfo();
  }, [fetchInfo]);

  return { info, loading, error, refresh: fetchInfo };
}
