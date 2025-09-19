/**
 * React hook for rule execution with state management
 */

import { useState, useCallback } from 'react';
import { ReactGoRulesService } from '../react-gorules-service.js';
import { UseRuleExecutionState, ExecuteRuleRequest } from '../interfaces.js';

/**
 * Hook for managing rule execution state and operations
 */
export function useRuleExecution<T = unknown>(
  service: ReactGoRulesService
): UseRuleExecutionState<T> & {
  executeRule: (ruleId: string, input: Record<string, unknown>) => Promise<void>;
  executeByIds: (ruleIds: string[], input: Record<string, unknown>, mode?: 'parallel' | 'sequential' | 'mixed') => Promise<void>;
  executeByTags: (tags: string[], input: Record<string, unknown>, mode?: 'parallel' | 'sequential' | 'mixed') => Promise<void>;
  execute: (request: ExecuteRuleRequest) => Promise<void>;
  reset: () => void;
} {
  const [state, setState] = useState<UseRuleExecutionState<T>>({
    loading: false,
    results: null,
    executionTime: null,
    error: null,
    success: false
  });

  const reset = useCallback(() => {
    setState({
      loading: false,
      results: null,
      executionTime: null,
      error: null,
      success: false
    });
  }, []);

  const executeRule = useCallback(async (
    ruleId: string,
    input: Record<string, unknown>
  ) => {
    setState((prev: UseRuleExecutionState<T>) => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await service.executeRule<T>(ruleId, input);
      
      if (response.success) {
        setState({
          loading: false,
          results: response.results || null,
          executionTime: response.executionTime || null,
          error: null,
          success: true
        });
      } else {
        setState({
          loading: false,
          results: null,
          executionTime: null,
          error: response.message || 'Execution failed',
          success: false
        });
      }
    } catch (error) {
      setState({
        loading: false,
        results: null,
        executionTime: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      });
    }
  }, [service]);

  const executeByIds = useCallback(async (
    ruleIds: string[],
    input: Record<string, unknown>,
    mode: 'parallel' | 'sequential' | 'mixed' = 'parallel'
  ) => {
    setState((prev: UseRuleExecutionState<T>) => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await service.executeByIds<T>(ruleIds, input, mode);
      
      if (response.success) {
        setState({
          loading: false,
          results: response.results || null,
          executionTime: response.executionTime || null,
          error: null,
          success: true
        });
      } else {
        setState({
          loading: false,
          results: null,
          executionTime: null,
          error: response.message || 'Execution failed',
          success: false
        });
      }
    } catch (error) {
      setState({
        loading: false,
        results: null,
        executionTime: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      });
    }
  }, [service]);

  const executeByTags = useCallback(async (
    tags: string[],
    input: Record<string, unknown>,
    mode: 'parallel' | 'sequential' | 'mixed' = 'parallel'
  ) => {
    setState((prev: UseRuleExecutionState<T>) => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await service.executeByTags<T>(tags, input, mode);
      
      if (response.success) {
        setState({
          loading: false,
          results: response.results || null,
          executionTime: response.executionTime || null,
          error: null,
          success: true
        });
      } else {
        setState({
          loading: false,
          results: null,
          executionTime: null,
          error: response.message || 'Execution failed',
          success: false
        });
      }
    } catch (error) {
      setState({
        loading: false,
        results: null,
        executionTime: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      });
    }
  }, [service]);

  const execute = useCallback(async (request: ExecuteRuleRequest) => {
    setState((prev: UseRuleExecutionState<T>) => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await service.execute<T>(request);
      
      if (response.success) {
        setState({
          loading: false,
          results: response.results || null,
          executionTime: response.executionTime || null,
          error: null,
          success: true
        });
      } else {
        setState({
          loading: false,
          results: null,
          executionTime: null,
          error: response.message || 'Execution failed',
          success: false
        });
      }
    } catch (error) {
      setState({
        loading: false,
        results: null,
        executionTime: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      });
    }
  }, [service]);

  return {
    ...state,
    executeRule,
    executeByIds,
    executeByTags,
    execute,
    reset
  };
}