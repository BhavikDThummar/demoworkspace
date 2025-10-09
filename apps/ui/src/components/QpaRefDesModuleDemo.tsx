/**
 * QPA RefDes Module Demo
 * Demonstrates secure dynamic rule loading using ES modules
 */

import { useState } from 'react';
import { useRuleEngine } from '@org/cm-rule-engine/react';
import { IBOMItem } from '../types/BOMTypes';
import { useDynamicRuleModule } from '../hooks/useDynamicRuleModule';
import { sampleBOMData } from '../data/sampleBOMData';

export function QpaRefDesModuleDemo() {
  const [result, setResult] = useState<string>('');

  // Load dynamic rules from compiled module
  const {
    rules: dynamicRules,
    loading: rulesLoading,
    error: rulesError,
    refreshRules,
    moduleInfo,
  } = useDynamicRuleModule('qpa-refdes');

  // Initialize the rule engine with React hook
  const { processing, process, addRule, removeRule, getRules } = useRuleEngine<IBOMItem>();

  const runValidation = async () => {
    try {
      // Clear existing rules and add dynamic rules
      const currentRules = getRules();
      currentRules.forEach((rule) => removeRule(rule.name));

      // Add all dynamic rules to the engine
      dynamicRules.forEach((rule) => {
        if (rule.enabled) {
          addRule(rule);
        }
      });

      // Process the BOM data
      const executionResult = await process(sampleBOMData);
      console.log('Execution result:', executionResult);

      // Format results
      const validItems = executionResult.data.filter(
        (_, index) =>
          executionResult.errors.filter((e) => e.itemId === sampleBOMData[index].lineID).length === 0
      );

      let resultText = `
🚀 QPA RefDes Module Validation Results

📊 Summary:
- Total BOM items: ${sampleBOMData.length}
- Valid items: ${validItems.length}
- Invalid items: ${sampleBOMData.length - validItems.length}
- Total errors: ${executionResult.errors.length}
- Rules loaded: ${dynamicRules.length}
- Enabled rules: ${dynamicRules.filter(r => r.enabled).length}

📦 Module Info:
- Module loaded: ${moduleInfo.loaded ? '✅ Yes' : '❌ No'}
- Module URL: ${moduleInfo.moduleUrl || 'N/A'}
- Loaded at: ${moduleInfo.timestamp || 'N/A'}

`;

      if (executionResult.errors.length > 0) {
        resultText += `\n❌ Validation Errors:\n`;
        executionResult.errors.forEach((error, index) => {
          resultText += `${index + 1}. Line ${error.itemId} - ${error.field}: ${error.message}\n`;
        });
      }

      if (validItems.length > 0) {
        resultText += `\n✅ Valid Items:\n`;
        validItems.forEach((item, index) => {
          resultText += `${index + 1}. Line ${item.lineID}: ${item.mfgPN || item.custPN} - ${item.description}\n`;
        });
      }

      setResult(resultText);
    } catch (error) {
      setResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleRefreshModule = async () => {
    try {
      setResult('🔄 Refreshing module from API...');
      await refreshRules();
      setResult('✅ Module refreshed successfully! Click "Run Validation" to test with new rules.');
    } catch (error) {
      setResult(`❌ Failed to refresh: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (rulesLoading) {
    return (
      <div className="card">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div className="spinner" style={{ marginBottom: '1rem' }}></div>
          <h2>🔄 Loading Rule Module...</h2>
          <p>Dynamically importing compiled JavaScript module from API</p>
        </div>
      </div>
    );
  }

  if (rulesError) {
    return (
      <div className="card">
        <div className="alert alert-error">
          <h2>❌ Error Loading Module</h2>
          <p>{rulesError}</p>
          <button onClick={handleRefreshModule} className="btn btn-primary mt-2">
            🔄 Retry Loading Module
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h2>🚀 QPA RefDes Validation - Dynamic Module Loading</h2>
          <p>
            This demo securely loads validation rules from a compiled JavaScript module served by the API.
          </p>
        </div>

        <div className="form-group">
          <h3>📋 Loaded Rules ({dynamicRules.length})</h3>
          {dynamicRules.map((rule) => (
            <div key={rule.name} style={{ padding: '0.5rem 0', borderBottom: '1px solid #eee' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ 
                  color: rule.enabled ? '#28a745' : '#dc3545',
                  fontWeight: 'bold',
                  fontSize: '1.2rem'
                }}>
                  {rule.enabled ? '✓' : '✗'}
                </span>
                <div>
                  <strong>{rule.name}</strong>
                  <div style={{ fontSize: '0.85rem', color: '#666' }}>
                    {rule.description}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#999' }}>
                    Priority: {rule.priority} | Tags: {rule.tags?.join(', ') || 'none'}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="form-group" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            onClick={runValidation}
            disabled={processing || dynamicRules.length === 0}
            className={`btn ${processing ? '' : 'btn-primary'}`}
          >
            {processing ? (
              <>
                <span className="spinner" style={{ width: '16px', height: '16px' }}></span>
                Processing...
              </>
            ) : (
              <>🔍 Run Validation</>
            )}
          </button>

          <button onClick={handleRefreshModule} className="btn btn-warning">
            🔄 Refresh Module
          </button>
        </div>
      </div>

      {result && (
        <div className="card">
          <h3>📊 Results:</h3>
          <pre className="code-block">{result}</pre>
        </div>
      )}

      <div className="alert alert-info">
        <h4 style={{ margin: '0 0 0.5rem 0' }}>💡 About This Demo</h4>
        <ul style={{ margin: '0', paddingLeft: '1.5rem' }}>
          <li>✅ <strong>Secure</strong>: Uses native ES module loading instead of eval()</li>
          <li>✅ <strong>Dynamic</strong>: Rules can be updated on the API without UI redeployment</li>
          <li>✅ <strong>Type-Safe</strong>: Rules are written in TypeScript and compiled</li>
          <li>✅ <strong>Fresh</strong>: Always loads the latest version (no-cache)</li>
          <li>✅ <strong>CSP Compatible</strong>: Works with Content Security Policy</li>
          <li>📝 Module endpoint: <code>/api/custom-rules/modules/qpa-refdes.js</code></li>
          <li>🔄 To update rules: Edit the .ts file on API side and click "Refresh Module"</li>
        </ul>
      </div>

      <div className="alert alert-success">
        <h4 style={{ margin: '0 0 0.5rem 0' }}>🔒 Security Improvements</h4>
        <ul style={{ margin: '0', paddingLeft: '1.5rem' }}>
          <li>No <code>eval()</code> or <code>Function()</code> constructor</li>
          <li>Uses browser's native module system with proper scope isolation</li>
          <li>Module served with proper MIME type and security headers</li>
          <li>Can add integrity checks (SRI) for additional security</li>
          <li>Compatible with strict Content Security Policy</li>
        </ul>
      </div>
    </div>
  );
}
