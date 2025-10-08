import { useState } from 'react';
import { useRuleEngine } from '@org/cm-rule-engine/react';
import { IBOMItem } from '../types/BOMTypes';
import { useDynamicRules } from '../hooks/useDynamicRules';
import { sampleBOMData } from '../data/sampleBOMData';

export function QpaRefDesApiDemo() {
  const [result, setResult] = useState<string>('');
  const [selectedRules, setSelectedRules] = useState<string[]>([]);

  // Load dynamic rules from API
  const {
    rules: dynamicRules,
    loading: rulesLoading,
    error: rulesError,
    refreshRules,
  } = useDynamicRules();

  // Initialize the rule engine with React hook
  const { processing, process, addRule, removeRule, getRules } = useRuleEngine<IBOMItem>();

  // Update selected rules when dynamic rules are loaded
  useState(() => {
    if (dynamicRules.length > 0) {
      setSelectedRules(dynamicRules.filter((rule) => rule.enabled).map((rule) => rule.name));
    }
  });

  const runQpaRefDesValidation = async () => {
    try {
      // Clear existing rules and add selected ones
      const currentRules = getRules();
      currentRules.forEach((rule) => removeRule(rule.name));

      // Add selected dynamic rules to the engine
      dynamicRules.forEach((rule) => {
        if (selectedRules.includes(rule.name)) {
          addRule(rule);
        }
      });

      // Process the BOM data using the hook
      const executionResult = await process(sampleBOMData);
      console.log('executionResult', executionResult);

      // Format results
      const validItems = executionResult.data.filter(
        (_, index) =>
          executionResult.errors.filter((e) => e.itemId === sampleBOMData[index].lineID).length ===
          0,
      );
      const invalidItems = executionResult.data.filter(
        (_, index) =>
          executionResult.errors.filter((e) => e.itemId === sampleBOMData[index].lineID).length > 0,
      );

      let resultText = `
🔧 QPA RefDes API Validation Results

📊 Summary:
- Total BOM items: ${sampleBOMData.length}
- Valid items: ${validItems.length}
- Invalid items: ${invalidItems.length}
- Total errors: ${executionResult.errors.length}
- Dynamic rules loaded: ${dynamicRules.length}
- Selected rules: ${selectedRules.length}

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
          resultText += `${index + 1}. Line ${item.lineID}: ${item.custPN} - ${item.description}\n`;
        });
      }

      resultText += `\n📈 Dynamic Rules Info:
- Total rules available: ${dynamicRules.length}
- Enabled rules: ${dynamicRules.filter((r) => r.enabled).length}
- Rules with transform: ${dynamicRules.filter((r) => r.transform).length}
- Rules with validate: ${dynamicRules.filter((r) => r.validate).length}
`;

      setResult(resultText);
    } catch (error) {
      setResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleRuleToggle = (ruleName: string) => {
    setSelectedRules((prev) =>
      prev.includes(ruleName) ? prev.filter((name) => name !== ruleName) : [...prev, ruleName],
    );
  };

  const handleHealthCheck = async () => {
    try {
      const healthInfo = {
        totalRules: dynamicRules.length,
        enabledRules: dynamicRules.filter((r) => r.enabled).length,
        rulesWithFunctions: dynamicRules.filter((r) => r.transform || r.validate).length,
        lastLoaded: new Date().toISOString(),
        status: 'healthy',
      };
      setResult(`🏥 Dynamic Rules Health Check:\n${JSON.stringify(healthInfo, null, 2)}`);
    } catch (error) {
      setResult(
        `❌ Health Check Failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  };

  const handleRefreshRules = async () => {
    try {
      await refreshRules();
      setResult('✅ Dynamic rules refreshed successfully from API');
    } catch (error) {
      setResult(
        `❌ Failed to refresh rules: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  };

  if (rulesLoading) {
    return (
      <div className="card">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div className="spinner" style={{ marginBottom: '1rem' }}></div>
          <h2>🔄 Loading QPA RefDes Rules from API...</h2>
          <p>Please wait while we fetch the latest validation rules.</p>
        </div>
      </div>
    );
  }

  if (rulesError) {
    return (
      <div className="card">
        <div className="alert alert-error">
          <h2>❌ Error Loading Rules</h2>
          <p>{rulesError}</p>
          <button onClick={handleRefreshRules} className="btn btn-primary mt-2">
            🔄 Retry Loading Rules
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h2>🚀 QPA RefDes Validation - Dynamic Rules Demo</h2>
          <p>
            This demo loads validation rules with executable functions dynamically from the API
            server.
          </p>
        </div>

        <div className="form-group">
          <h3>📋 Available Dynamic Rules ({dynamicRules.length})</h3>
          {dynamicRules.map((rule) => (
            <div key={rule.name} className="form-check">
              <input
                type="checkbox"
                id={rule.name}
                checked={selectedRules.includes(rule.name)}
                onChange={() => handleRuleToggle(rule.name)}
              />
              <label htmlFor={rule.name} style={{ cursor: 'pointer', flex: 1 }}>
                <strong>{rule.name}</strong> - {rule.description}
                <span
                  style={{
                    color: rule.enabled ? '#28a745' : '#dc3545',
                    marginLeft: '10px',
                    fontSize: '0.85rem',
                    fontWeight: 'bold',
                  }}
                >
                  ({rule.enabled ? 'Enabled' : 'Disabled'})
                </span>
              </label>
            </div>
          ))}
        </div>

        <div className="form-group" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            onClick={runQpaRefDesValidation}
            disabled={processing || selectedRules.length === 0}
            className={`btn ${processing ? '' : 'btn-primary'}`}
          >
            {processing ? (
              <>
                <span className="spinner" style={{ width: '16px', height: '16px' }}></span>
                Processing...
              </>
            ) : (
              <>🔍 Run QPA RefDes Validation</>
            )}
          </button>

          <button onClick={handleHealthCheck} className="btn btn-success">
            🏥 Health Check
          </button>

          <button onClick={handleRefreshRules} className="btn btn-warning">
            🔄 Refresh Rules
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
          <li>
            This demo loads QPA RefDes validation rules with executable functions from the API
          </li>
          <li>Rules can be updated on the server without redeploying the UI application</li>
          <li>Functions are safely evaluated in a restricted context for security</li>
          <li>
            Select rules above and click "Run QPA RefDes Validation" to test with sample BOM data
          </li>
          <li>
            The API endpoint:{' '}
            <code>https://localhost:8001/api/custom-rules/qpa-refdes/dynamic-rules</code>
          </li>
        </ul>
      </div>
    </div>
  );
}
