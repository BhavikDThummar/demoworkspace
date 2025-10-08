/**
 * Rule Management Demo - Shows how to manage dynamic rules
 * This component demonstrates rule testing, editing, and deployment
 */

import { useState, useEffect } from 'react';
import { DynamicRuleLoader } from '../services/dynamicRuleLoader';
import { sampleBOMData } from '../data/sampleBOMData';

interface RuleTestResult {
  success: boolean;
  error?: string;
  results?: any[];
}

export function RuleManagementDemo() {
  const [rules, setRules] = useState<any[]>([]);
  const [selectedRule, setSelectedRule] = useState<any>(null);
  const [functionCode, setFunctionCode] = useState('');
  const [testResult, setTestResult] = useState<RuleTestResult | null>(null);
  const [loading, setLoading] = useState(false);

  // Load existing rules
  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      setLoading(true);
      const dynamicRules = await DynamicRuleLoader.loadDynamicRules();
      setRules(dynamicRules);
    } catch (error) {
      console.error('Failed to load rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectRule = (rule: any) => {
    setSelectedRule(rule);
    // Extract function code for editing
    if (rule.validateCode) {
      setFunctionCode(rule.validateCode);
    } else if (rule.transformCode) {
      setFunctionCode(rule.transformCode);
    } else {
      setFunctionCode('');
    }
    setTestResult(null);
  };

  const testFunction = async () => {
    if (!functionCode.trim()) {
      setTestResult({ success: false, error: 'No function code to test' });
      return;
    }

    try {
      setLoading(true);
      const result = DynamicRuleLoader.testRuleFunction(functionCode, sampleBOMData.slice(0, 3));
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  const createNewRule = () => {
    const newRule = {
      name: 'new_rule',
      description: 'New validation rule',
      priority: 10,
      enabled: true,
      tags: ['validation'],
      validateCode: `(context) => {
  const { item } = context;
  const errors = [];
  
  // Add your validation logic here
  if (!item.lineID) {
    errors.push(createError('lineID', 'Line ID is required', item.lineID || 0));
  }
  
  return errors;
}`,
    };
    
    setSelectedRule(newRule);
    setFunctionCode(newRule.validateCode);
    setTestResult(null);
  };

  // Example rule templates
  const ruleTemplates = {
    validation: `(context) => {
  const { item } = context;
  const errors = [];
  
  // Example validation
  if (!item.lineID || item.lineID <= 0) {
    errors.push(createError('lineID', 'Line ID is required and must be greater than 0', item.lineID || 0));
  }
  
  return errors;
}`,
    
    transformation: `(context) => {
  const { item } = context;
  
  // Example transformation
  if (item.refDesig) {
    const refDesigArray = parseRefDesig(item.refDesig);
    item.cmHidden = {
      ...(item.cmHidden || {}),
      refDesigParsed: refDesigArray,
      refDesigCount: refDesigArray.length,
    };
  }
  
  return item;
}`,

    qpaValidation: `(context) => {
  const { item } = context;
  const errors = [];
  
  if (item.uomID === 'EACH') {
    const qpaValue = normalizeQPA(item.qpa);
    const refDesigCount = item.cmHidden?.refDesigCount || 0;
    
    if (qpaValue !== refDesigCount && qpaValue > 0) {
      errors.push(createError(
        'qpa', 
        \`QPA (\${qpaValue}) must match RefDesig count (\${refDesigCount}) when UOM is EACH\`,
        item.lineID
      ));
    }
  }
  
  return errors;
}`,
  };

  return (
    <div className="rule-management-demo">
      <div className="card">
        <div className="card-header">
          <h2>🛠️ Rule Management Demo</h2>
          <p>Test and manage dynamic validation rules</p>
        </div>

        <div style={{ display: 'flex', gap: '2rem' }}>
          {/* Rules List */}
          <div style={{ flex: '1', minWidth: '300px' }}>
            <h3>📋 Available Rules</h3>
            <div className="form-group">
              <button onClick={createNewRule} className="btn btn-primary mb-2">
                ➕ Create New Rule
              </button>
              <button onClick={loadRules} className="btn btn-secondary mb-2" disabled={loading}>
                🔄 Refresh Rules
              </button>
            </div>

            {loading && <div className="spinner">Loading...</div>}
            
            <div className="rules-list" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {rules.map((rule, index) => (
                <div
                  key={rule.name || index}
                  className={`rule-item ${selectedRule?.name === rule.name ? 'selected' : ''}`}
                  style={{
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    marginBottom: '0.5rem',
                    cursor: 'pointer',
                    backgroundColor: selectedRule?.name === rule.name ? '#e3f2fd' : 'white',
                  }}
                  onClick={() => selectRule(rule)}
                >
                  <div style={{ fontWeight: 'bold' }}>{rule.name}</div>
                  <div style={{ fontSize: '0.85rem', color: '#666' }}>{rule.description}</div>
                  <div style={{ fontSize: '0.75rem', color: rule.enabled ? '#28a745' : '#dc3545' }}>
                    {rule.enabled ? '✅ Enabled' : '❌ Disabled'} | Priority: {rule.priority}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rule Editor */}
          <div style={{ flex: '2' }}>
            <h3>✏️ Rule Editor</h3>
            
            {selectedRule && (
              <div className="form-group">
                <label>Rule Name:</label>
                <input
                  type="text"
                  value={selectedRule.name}
                  onChange={(e) => setSelectedRule({ ...selectedRule, name: e.target.value })}
                  className="form-control"
                />
                
                <label>Description:</label>
                <input
                  type="text"
                  value={selectedRule.description}
                  onChange={(e) => setSelectedRule({ ...selectedRule, description: e.target.value })}
                  className="form-control"
                />
              </div>
            )}

            <div className="form-group">
              <label>Function Code:</label>
              <div style={{ marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', color: '#666' }}>
                  Available utilities: parseRefDesig, normalizeQPA, createError, Math, String, Number
                </span>
              </div>
              <textarea
                value={functionCode}
                onChange={(e) => setFunctionCode(e.target.value)}
                className="form-control"
                rows={15}
                style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
                placeholder="Enter your function code here..."
              />
            </div>

            <div className="form-group">
              <h4>📝 Rule Templates</h4>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {Object.entries(ruleTemplates).map(([name, code]) => (
                  <button
                    key={name}
                    onClick={() => setFunctionCode(code)}
                    className="btn btn-outline-secondary btn-sm"
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <button
                onClick={testFunction}
                disabled={loading || !functionCode.trim()}
                className="btn btn-primary"
              >
                {loading ? '🔄 Testing...' : '🧪 Test Function'}
              </button>
            </div>

            {/* Test Results */}
            {testResult && (
              <div className="card mt-3">
                <h4>🧪 Test Results</h4>
                {testResult.success ? (
                  <div>
                    <div style={{ color: '#28a745', marginBottom: '1rem' }}>
                      ✅ Function executed successfully!
                    </div>
                    <pre className="code-block" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                      {JSON.stringify(testResult.results, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <div style={{ color: '#dc3545' }}>
                    ❌ Error: {testResult.error}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="alert alert-info mt-3">
        <h4>💡 Rule Development Tips</h4>
        <ul>
          <li><strong>Validation Functions:</strong> Should return an array of ValidationError objects</li>
          <li><strong>Transform Functions:</strong> Should return the modified item object</li>
          <li><strong>Available Utilities:</strong> parseRefDesig(), normalizeQPA(), createError()</li>
          <li><strong>Context Object:</strong> Contains item, allItems, index, and metadata</li>
          <li><strong>Error Format:</strong> createError(field, message, itemId, severity?)</li>
          <li><strong>Testing:</strong> Always test your functions before deploying</li>
        </ul>
      </div>
    </div>
  );
}