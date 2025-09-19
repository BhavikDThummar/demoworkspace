/**
 * Basic Rule Executor Example
 *
 * This example demonstrates simple rule execution with the Minimal GoRules Engine
 * React integration. It shows how to execute a single rule and display results.
 */

import React, { useState } from 'react';
import { RuleExecutor, GoRulesProvider } from '../index.js';

// Configuration for the GoRules service
const config = {
  apiBaseUrl: 'http://localhost:3000/api',
  timeout: 10000,
};

/**
 * Basic example component showing simple rule execution
 */
function BasicRuleExecutorExample(): JSX.Element {
  const [ruleId, setRuleId] = useState('example-rule');
  const [inputData, setInputData] = useState({
    age: 25,
    income: 50000,
    creditScore: 750,
  });

  const handleSuccess = (results: Record<string, unknown> | unknown) => {
    console.log('Rule execution successful:', results);
  };

  const handleError = (error: string) => {
    console.error('Rule execution failed:', error);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Basic Rule Executor Example</h1>

      <div style={{ marginBottom: '20px' }}>
        <h3>Configuration</h3>
        <div style={{ marginBottom: '10px' }}>
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

        <div style={{ marginBottom: '10px' }}>
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
                marginLeft: '10px',
                padding: '10px',
                width: '300px',
                height: '100px',
                fontFamily: 'monospace',
              }}
            />
          </label>
        </div>
      </div>

      <RuleExecutor
        ruleId={ruleId}
        input={inputData}
        onSuccess={handleSuccess}
        onError={handleError}
      />
    </div>
  );
}

/**
 * Complete example with provider wrapper
 */
export function BasicRuleExecutorApp(): JSX.Element {
  return (
    <GoRulesProvider config={config}>
      <BasicRuleExecutorExample />
    </GoRulesProvider>
  );
}

export default BasicRuleExecutorApp;
