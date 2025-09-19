/**
 * React component for rule execution with UI
 */

import React, { useEffect } from 'react';
import { RuleExecutorProps } from '../interfaces.js';
import { useGoRulesContext } from './GoRulesProvider.js';
import { useRuleExecution } from '../hooks/use-rule-execution.js';

/**
 * Default loading component
 */
const DefaultLoadingComponent: React.FC = () => (
  <div style={{ padding: '16px', textAlign: 'center' }}>
    <div>Executing rules...</div>
  </div>
);

/**
 * Default error component
 */
const DefaultErrorComponent: React.FC<{ error: string }> = ({ error }: { error: string }) => (
  <div style={{ padding: '16px', color: 'red', border: '1px solid red', borderRadius: '4px' }}>
    <strong>Error:</strong> {error}
  </div>
);

/**
 * Default results component
 */
const DefaultResultsComponent: React.FC<{ results: Record<string, unknown> | unknown }> = ({ results }: { results: Record<string, unknown> | unknown }) => (
  <div style={{ padding: '16px', border: '1px solid green', borderRadius: '4px' }}>
    <strong>Results:</strong>
    <pre style={{ marginTop: '8px', whiteSpace: 'pre-wrap' }}>
      {JSON.stringify(results, null, 2)}
    </pre>
  </div>
);

/**
 * Component for executing rules with UI feedback
 */
export function RuleExecutor({
  ruleId,
  ruleIds,
  tags,
  mode = 'parallel',
  input,
  autoExecute = false,
  onSuccess,
  onError,
  loadingComponent: LoadingComponent = DefaultLoadingComponent as any,
  errorComponent: ErrorComponent = DefaultErrorComponent,
  resultsComponent: ResultsComponent = DefaultResultsComponent
}: RuleExecutorProps) {
  const service = useGoRulesContext();
  const {
    loading,
    results,
    executionTime,
    error,
    success,
    executeRule,
    executeByIds,
    executeByTags,
    execute,
    reset
  } = useRuleExecution(service);

  // Auto-execute on mount if enabled
  useEffect(() => {
    if (autoExecute) {
      handleExecute();
    }
  }, [autoExecute]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle success/error callbacks
  useEffect(() => {
    if (success && results && onSuccess) {
      onSuccess(results);
    }
  }, [success, results, onSuccess]);

  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  const handleExecute = async () => {
    reset();
    
    try {
      if (ruleId) {
        await executeRule(ruleId, input);
      } else if (ruleIds && ruleIds.length > 0) {
        await executeByIds(ruleIds, input, mode);
      } else if (tags && tags.length > 0) {
        await executeByTags(tags, input, mode);
      } else {
        // Generic execute with all parameters
        await execute({
          ruleId,
          ruleIds,
          tags,
          mode,
          input
        });
      }
    } catch (err) {
      // Error is already handled by the hook
      console.error('Rule execution failed:', err);
    }
  };

  return (
    <div style={{ margin: '16px 0' }}>
      {/* Execution Controls */}
      <div style={{ marginBottom: '16px' }}>
        <button
          onClick={handleExecute}
          disabled={loading}
          style={{
            padding: '8px 16px',
            backgroundColor: loading ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Executing...' : 'Execute Rules'}
        </button>
        
        {(results || error) && (
          <button
            onClick={reset}
            style={{
              marginLeft: '8px',
              padding: '8px 16px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Reset
          </button>
        )}
      </div>

      {/* Execution Info */}
      <div style={{ marginBottom: '16px', fontSize: '14px', color: '#666' }}>
        <div><strong>Mode:</strong> {mode}</div>
        {ruleId && <div><strong>Rule ID:</strong> {ruleId}</div>}
        {ruleIds && ruleIds.length > 0 && (
          <div><strong>Rule IDs:</strong> {ruleIds.join(', ')}</div>
        )}
        {tags && tags.length > 0 && (
          <div><strong>Tags:</strong> {tags.join(', ')}</div>
        )}
        {executionTime !== null && (
          <div><strong>Execution Time:</strong> {executionTime}ms</div>
        )}
      </div>

      {loading && LoadingComponent()}
      {error && ErrorComponent({ error })}
      {success && results && ResultsComponent({ results })}
    </div>
  );
}