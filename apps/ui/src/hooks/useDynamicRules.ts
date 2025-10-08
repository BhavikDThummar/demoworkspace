/**
 * Dynamic Rules Hook - Manages loading and caching of dynamic rules
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Rule } from '@org/cm-rule-engine';
import { IBOMItem } from '../types/BOMTypes';
import { DynamicRuleLoader } from '../services/dynamicRuleLoader';

export interface UseDynamicRulesResult {
  rules: Rule<IBOMItem>[];
  loading: boolean;
  error: string | null;
  loadRules: () => Promise<void>;
  refreshRules: () => Promise<void>;
  testRule: (functionCode: string, testData: IBOMItem[]) => Promise<{ success: boolean; error?: string; results?: unknown[] }>;
  clearCache: () => void;
}

export function useDynamicRules(): UseDynamicRulesResult {
  const [rules, setRules] = useState<Rule<IBOMItem>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Cache to avoid reloading rules unnecessarily
  const cacheRef = useRef<{
    rules: Rule<IBOMItem>[];
    timestamp: number;
    ttl: number; // Time to live in milliseconds
  }>({
    rules: [],
    timestamp: 0,
    ttl: 5 * 60 * 1000, // 5 minutes
  });

  const loadRules = useCallback(async (forceRefresh = false) => {
    const now = Date.now();
    const cache = cacheRef.current;
    
    // Use cached rules if they're still valid and not forcing refresh
    if (!forceRefresh && cache.rules.length > 0 && (now - cache.timestamp) < cache.ttl) {
      setRules(cache.rules);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const loadedRules = await DynamicRuleLoader.loadDynamicRules();
      
      // Update cache
      cache.rules = loadedRules;
      cache.timestamp = now;
      
      setRules(loadedRules);
      
      console.log(`Loaded ${loadedRules.length} dynamic rules from API`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Failed to load dynamic rules:', err);
      
      // Fall back to cached rules if available
      if (cache.rules.length > 0) {
        setRules(cache.rules);
        console.warn('Using cached rules due to load failure');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshRules = useCallback(async () => {
    await loadRules(true);
  }, [loadRules]);

  const testRule = useCallback(async (functionCode: string, testData: IBOMItem[]) => {
    try {
      const result = DynamicRuleLoader.testRuleFunction(functionCode, testData);
      return result;
    } catch (error) {
      console.error('Failed to test rule:', error);
      throw error;
    }
  }, []);

  const clearCache = useCallback(() => {
    cacheRef.current = {
      rules: [],
      timestamp: 0,
      ttl: 5 * 60 * 1000,
    };
    setRules([]);
  }, []);

  // Auto-load rules on mount
  useEffect(() => {
    loadRules();
  }, [loadRules]);

  // Set up periodic refresh (optional)
  useEffect(() => {
    const interval = setInterval(() => {
      // Only refresh if we have rules and they're getting stale
      const cache = cacheRef.current;
      const now = Date.now();
      
      if (cache.rules.length > 0 && (now - cache.timestamp) > cache.ttl * 0.8) {
        console.log('Auto-refreshing rules...');
        loadRules(true);
      }
    }, 60 * 1000); // Check every minute

    return () => clearInterval(interval);
  }, [loadRules]);

  return {
    rules,
    loading,
    error,
    loadRules: () => loadRules(false),
    refreshRules,
    testRule,
    clearCache,
  };
}