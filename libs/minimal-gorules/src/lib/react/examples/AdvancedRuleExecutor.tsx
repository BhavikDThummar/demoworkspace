/**
 * Advanced Rule Executor Example
 * 
 * This example demonstrates advanced rule execution features including:
 * - Multiple execution modes (parallel, sequential, mixed)
 * - Rule selection by IDs and tags
 * - Custom loading and error components
 * - Performance monitoring
 */

import React, { useState } from 'react';
import { RuleExecutor, GoRulesProvider, RuleMetadataViewer } from '../index.js';

// Configuration for the GoRules service
const config = {
  apiBaseUrl: 'http://localhost:3000/api',
  timeout: 15000
};

/**
 * Custom loading component with spinner
 */
const CustomLoadingComponent: React.FC = () => (
  <div style={{ 
    display: 'flex', 
    alignItems: 'center', 
    padding: '20px',
    backgroundColor: '#f0f8ff',
    border: '1px solid #007bff',
    borderRadius: '4px'
  }}>
    <div style={{
      width: '20px',
      height: '20px',
      border: '2px solid #007bff',
      borderTop: '2px solid transparent',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
      marginRight: '10px'
    }} />
    <span>Executing rules... Please wait.</span>
    <style>
      {`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}
    </style>
  </div>
);

/**
 * Custom error component with retry option
 */
const CustomErrorComponent: React.FC<{ error: string }> = ({ error }) => (
  <div style={{
    padding: '16px',
    backgroundColor: '#f8d7da',
    border: '1px solid #dc3545',
    borderRadius: '4px',
    color: '#721c24'
  }}>
    <h4 style={{ margin: '0 0 8px 0', color: '#721c24' }}>Execution Failed</h4>
    <p style={{ margin: '0 0 12px 0' }}>{error}</p>
    <div style={{ fontSize: '12px', color: '#856404' }}>
      <strong>Troubleshooting tips:</strong>
      <ul style={{ margin: '4px 0 0 20px' }}>
        <li>Check if the rule ID exists</li>
        <li>Verify your input data format</li>
        <li>Ensure the backend service is running</li>
      </ul>
    </div>
  </div>
);

/**
 * Custom results component with enhanced formatting
 */
const CustomResultsComponent: React.FC<{ results: Record<string, unknown> | unknown }> = ({ results }) => (
  <div style={{
    padding: '16px',
    backgroundColor: '#d4edda',
    border: '1px solid #28a745',
    borderRadius: '4px'
  }}>
    <h4 style={{ margin: '0 0 12px 0', color: '#155724' }}>Execution Results</h4>
    <div style={{
      backgroundColor: 'white',
      padding: '12px',
      borderRadius: '4px',
      border: '1px solid #c3e6cb'
    }}>
      <pre style={{
        margin: 0,
        whiteSpace: 'pre-wrap',
        fontSize: '14px',
        fontFamily: 'Monaco, Consolas, monospace'
      }}>
        {JSON.stringify(results, null, 2)}
      </pre>
    </div>
  </div>
);

/**
 * Advanced example component with multiple execution modes
 */
function AdvancedRuleExecutorExample(): JSX.Element {
  const [executionMode, setExecutionMode] = useState<'single' | 'multiple' | 'tags'>('single');
  const [mode, setMode] = useState<'parallel' | 'sequential' | 'mixed'>('parallel');
  const [ruleId, setRuleId] = useState('example-rule');
  const [ruleIds, setRuleIds] = useState(['rule1', 'rule2', 'rule3']);
  const [tags, setTags] = useState(['validation', 'scoring']);
  const [inputData, setInputData] = useState({
    user: {
      age: 30,
      income: 75000,
      creditScore: 720,
      employment: 'full-time'
    },
    loan: {
      amount: 250000,
      term: 30,
      type: 'mortgage'
    }
  });

  const [executionHistory, setExecutionHistory] = useState<Array<{
    timestamp: number;
    mode: string;
    executionTime: number;
    success: boolean;
    error?: string;
  }>>([]);

  const handleSuccess = (results: Record<string, unknown> | unknown) => {
    console.log('Rule execution successful:', results);
    // Add to history (execution time will be updated by the component)
  };

  const handleError = (error: string) => {
    console.error('Rule execution failed:', error);
    setExecutionHistory(prev => [...prev, {
      timestamp: Date.now(),
      mode: `${executionMode}-${mode}`,
      executionTime: 0,
      success: false,
      error
    }]);
  };

  const renderExecutionConfig = () => {
    switch (executionMode) {
      case 'single':
        return (
          <div>
            <label>
              Rule ID:
              <input
                type="text"
                value={ruleId}
                onChange={(e) => setRuleId(e.target.value)}
                style={{ marginLeft: '10px', padding: '5px', width: '200px' }}
              />
            </label>
          </div>
        );
      
      case 'multiple':
        return (
          <div>
            <label>
              Rule IDs (comma-separated):
              <input
                type="text"
                value={ruleIds.join(', ')}
                onChange={(e) => setRuleIds(e.target.value.split(',').map(id => id.trim()))}
                style={{ marginLeft: '10px', padding: '5px', width: '300px' }}
              />
            </label>
          </div>
        );
      
      case 'tags':
        return (
          <div>
            <label>
              Tags (comma-separated):
              <input
                type="text"
                value={tags.join(', ')}
                onChange={(e) => setTags(e.target.value.split(',').map(tag => tag.trim()))}
                style={{ marginLeft: '10px', padding: '5px', width: '300px' }}
              />
            </label>
          </div>
        );
    }
  };

  const renderRuleExecutor = () => {
    const commonProps = {
      input: inputData,
      mode,
      onSuccess: handleSuccess,
      onError: handleError,
      loadingComponent: CustomLoadingComponent,
      errorComponent: CustomErrorComponent,
      resultsComponent: CustomResultsComponent
    };

    switch (executionMode) {
      case 'single':
        return <RuleExecutor ruleId={ruleId} {...commonProps} />;
      
      case 'multiple':
        return <RuleExecutor ruleIds={ruleIds} {...commonProps} />;
      
      case 'tags':
        return <RuleExecutor tags={tags} {...commonProps} />;
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Advanced Rule Executor Example</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Configuration Panel */}
        <div>
          <h3>Execution Configuration</h3>
          
          <div style={{ marginBottom: '15px' }}>
            <label>
              Execution Type:
              <select
                value={executionMode}
                onChange={(e) => setExecutionMode(e.target.value as any)}
                style={{ marginLeft: '10px', padding: '5px' }}
              >
                <option value="single">Single Rule</option>
                <option value="multiple">Multiple Rules</option>
                <option value="tags">By Tags</option>
              </select>
            </label>
          </div>

          {executionMode !== 'single' && (
            <div style={{ marginBottom: '15px' }}>
              <label>
                Execution Mode:
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as any)}
                  style={{ marginLeft: '10px', padding: '5px' }}
                >
                  <option value="parallel">Parallel</option>
                  <option value="sequential">Sequential</option>
                  <option value="mixed">Mixed</option>
                </select>
              </label>
            </div>
          )}

          <div style={{ marginBottom: '15px' }}>
            {renderExecutionConfig()}
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label>
              Input Data (JSON):
              <textarea
                value={JSON.stringify(inputData, null, 2)}
                onChange={(e) => {
                  try {
                    setInputData(JSON.parse(e.target.value));
                  } catch (err) {
                    // Invalid JSON, ignore
                  }
                }}
                style={{
                  display: 'block',
                  marginTop: '5px',
                  padding: '10px',
                  width: '100%',
                  height: '200px',
                  fontFamily: 'monospace',
                  fontSize: '12px'
                }}
              />
            </label>
          </div>
        </div>

        {/* Rule Metadata Browser */}
        <div>
          <h3>Available Rules</h3>
          <RuleMetadataViewer
            showAll={true}
            onRuleSelect={(ruleId, metadata) => {
              console.log('Selected rule:', ruleId, metadata);
              if (executionMode === 'single') {
                setRuleId(ruleId);
              }
            }}
          />
        </div>
      </div>

      {/* Rule Executor */}
      <div style={{ marginTop: '30px' }}>
        <h3>Rule Execution</h3>
        {renderRuleExecutor()}
      </div>

      {/* Execution History */}
      {executionHistory.length > 0 && (
        <div style={{ marginTop: '30px' }}>
          <h3>Execution History</h3>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {executionHistory.map((entry, index) => (
              <div
                key={index}
                style={{
                  padding: '8px',
                  margin: '4px 0',
                  backgroundColor: entry.success ? '#d4edda' : '#f8d7da',
                  border: `1px solid ${entry.success ? '#28a745' : '#dc3545'}`,
                  borderRadius: '4px',
                  fontSize: '12px'
                }}
              >
                <div>
                  <strong>Time:</strong> {new Date(entry.timestamp).toLocaleTimeString()} |{' '}
                  <strong>Mode:</strong> {entry.mode} |{' '}
                  <strong>Duration:</strong> {entry.executionTime}ms |{' '}
                  <strong>Status:</strong> {entry.success ? 'Success' : 'Failed'}
                </div>
                {entry.error && (
                  <div style={{ color: '#721c24', marginTop: '4px' }}>
                    <strong>Error:</strong> {entry.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Complete example with provider wrapper
 */
export function AdvancedRuleExecutorApp(): JSX.Element {
  return (
    <GoRulesProvider config={config}>
      <AdvancedRuleExecutorExample />
    </GoRulesProvider>
  );
}

export default AdvancedRuleExecutorApp;