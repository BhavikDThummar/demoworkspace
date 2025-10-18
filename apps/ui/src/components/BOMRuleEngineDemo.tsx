import { useState } from 'react';
import { useRuleEngine } from '@org/cm-rule-engine/react';
import { IBOMItem } from '../types/BOMTypes';
import { bomValidationRules } from '../rules/bomValidationRules';
import { sampleBOMData } from '../data/sampleBOMData';

export function BOMRuleEngineDemo() {
  const [result, setResult] = useState<string>('');
  const [selectedRules, setSelectedRules] = useState<string[]>(
    bomValidationRules.filter((rule) => rule.enabled).map((rule) => rule.name),
  );

  // Initialize the rule engine with React hook
  const { processing, process, addRule, removeRule, getRules } = useRuleEngine<IBOMItem>();

  const runBOMValidation = async () => {
    try {
      // Clear existing rules and add selected ones
      const currentRules = getRules();
      currentRules.forEach((rule) => removeRule(rule.name));

      // Add selected rules to the engine
      bomValidationRules.forEach((rule) => {
        if (selectedRules.includes(rule.name)) {
          addRule(rule);
        }
      });

      // Process the BOM data using the hook
      const executionResult = await process(sampleBOMData);
      console.log('executionResult:', executionResult);

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
🔧 BOM Validation Results

📊 Summary:
- Total BOM items: ${sampleBOMData.length}
- Valid items: ${validItems.length}
- Invalid items: ${invalidItems.length}
- Total errors: ${executionResult.errors.length}
- Total warnings: ${executionResult.warnings.length}
- Rules executed: ${selectedRules.length}
- Execution time: ${executionResult.executionTime?.toFixed(2)}ms

`;

      if (executionResult.errors.length > 0) {
        resultText += `
❌ Validation Errors:
${executionResult.errors
  .map((error, index) => {
    const item = sampleBOMData.find((item) => item.lineID === error.itemId);
    return `${index + 1}. Line ${error.itemId} (${item?.description || 'Unknown'}):
   Field: ${error.field}
   Error: ${error.message}`;
  })
  .join('\n')}

`;
      }

      if (executionResult.warnings.length > 0) {
        resultText += `
⚠️ Validation Warnings:
${executionResult.warnings
  .map((warning, index) => {
    const item = sampleBOMData.find((item) => item.lineID === warning.itemId);
    return `${index + 1}. Line ${warning.itemId} (${item?.description || 'Unknown'}):
   Field: ${warning.field}
   Warning: ${warning.message}`;
  })
  .join('\n')}

`;
      }

      if (validItems.length > 0) {
        resultText += `
✅ Valid Items:
${validItems
  .map((item, index) => {
    const originalItem = sampleBOMData.find((orig) => orig.lineID === item.lineID);
    return `${index + 1}. Line ${item.lineID} (${originalItem?.description}) - All rules passed`;
  })
  .join('\n')}
`;
      }

      setResult(resultText);
    } catch (error) {
      setResult(`❌ Error running BOM validation: ${error}`);
    }
  };

  const toggleRule = (ruleName: string) => {
    setSelectedRules((prev) =>
      prev.includes(ruleName) ? prev.filter((name) => name !== ruleName) : [...prev, ruleName],
    );
  };

  const toggleAllRules = () => {
    if (selectedRules.length === bomValidationRules.length) {
      setSelectedRules([]);
    } else {
      setSelectedRules(bomValidationRules.map((rule) => rule.name));
    }
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h2>🔧 BOM Rule Engine Demo</h2>
          <p>This demo shows the cm-rule-engine library in action with BOM validation rules.</p>
        </div>

        <div className="form-group">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
            }}
          >
            <h3>Available Rules ({bomValidationRules.length})</h3>
            <button
              onClick={toggleAllRules}
              className="btn"
              style={{ backgroundColor: '#6c757d', color: 'white' }}
            >
              {selectedRules.length === bomValidationRules.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
              gap: '10px',
            }}
          >
            {bomValidationRules.map((rule) => (
              <div
                key={rule.name}
                className="form-check"
                style={{
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  backgroundColor: selectedRules.includes(rule.name) ? '#e7f3ff' : '#f8f9fa',
                  alignItems: 'flex-start',
                }}
              >
                <input
                  type="checkbox"
                  id={rule.name}
                  checked={selectedRules.includes(rule.name)}
                  onChange={() => toggleRule(rule.name)}
                />
                <label htmlFor={rule.name} style={{ cursor: 'pointer', flex: 1 }}>
                  <strong style={{ color: rule.enabled ? '#28a745' : '#6c757d' }}>
                    {rule.name} {!rule.enabled && '(Disabled by default)'}
                  </strong>
                  <br />
                  <small style={{ color: '#666' }}>{rule.description}</small>
                  <br />
                  <small style={{ color: '#888' }}>
                    Priority: {rule.priority} | Tags: {rule.tags?.join(', ')}
                  </small>
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Sample BOM Data ({sampleBOMData.length} items)</h3>
        <div
          style={{
            maxHeight: '300px',
            overflow: 'auto',
            border: '1px solid #ddd',
            borderRadius: '6px',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead style={{ backgroundColor: '#f5f5f5', position: 'sticky', top: 0 }}>
              <tr>
                <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>
                  Line ID
                </th>
                <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>
                  Description
                </th>
                <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>QPA</th>
                <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>
                  RefDesig
                </th>
                <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>UOM</th>
                <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>
                  Mfg PN
                </th>
              </tr>
            </thead>
            <tbody>
              {sampleBOMData.map((item, index) => (
                <tr key={`${item.lineID}-${index}`}>
                  <td style={{ padding: '4px', border: '1px solid #ddd' }}>{item.lineID}</td>
                  <td style={{ padding: '4px', border: '1px solid #ddd' }}>{item.description}</td>
                  <td style={{ padding: '4px', border: '1px solid #ddd' }}>{item.qpa}</td>
                  <td style={{ padding: '4px', border: '1px solid #ddd' }}>
                    {item.refDesig || '(empty)'}
                  </td>
                  <td style={{ padding: '4px', border: '1px solid #ddd' }}>{item.uomID}</td>
                  <td style={{ padding: '4px', border: '1px solid #ddd' }}>{item.mfgPN}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          onClick={runBOMValidation}
          disabled={processing || selectedRules.length === 0}
          className={`btn ${selectedRules.length === 0 ? '' : 'btn-success'}`}
          style={{ fontSize: '16px', fontWeight: 'bold' }}
        >
          {processing ? (
            <>
              <span className="spinner" style={{ width: '16px', height: '16px' }}></span>
              Running Validation...
            </>
          ) : (
            `Run BOM Validation (${selectedRules.length} rules)`
          )}
        </button>
      </div>

      {result && (
        <div className="card">
          <h3>📊 Validation Results:</h3>
          <pre className="code-block" style={{ maxHeight: '500px' }}>
            {result}
          </pre>
        </div>
      )}

      <div className="alert alert-info">
        <h4 style={{ margin: '0 0 0.5rem 0' }}>🎯 Demo Features</h4>
        <ul style={{ margin: '0 0 1rem 0', paddingLeft: '1.5rem' }}>
          <li>✅ Real BOM validation rules implementation</li>
          <li>✅ Interactive rule selection</li>
          <li>✅ Sample data with intentional validation errors</li>
          <li>✅ Detailed validation results with error reporting</li>
          <li>✅ Performance metrics (execution time, rules executed)</li>
          <li>✅ Transform and validate rule types</li>
        </ul>

        <h4 style={{ margin: '0 0 0.5rem 0' }}>Rule Engine Features Demonstrated:</h4>
        <ul style={{ margin: '0', paddingLeft: '1.5rem' }}>
          <li>
            🔄 <strong>Rule Chaining:</strong> Transform rules prepare data for validation rules
          </li>
          <li>
            🎯 <strong>Priority-based Execution:</strong> Rules run in priority order
          </li>
          <li>
            🏷️ <strong>Tag-based Organization:</strong> Rules are categorized with tags
          </li>
          <li>
            ⚡ <strong>Conditional Logic:</strong> Rules can have complex validation logic
          </li>
          <li>
            📊 <strong>Error Aggregation:</strong> Multiple validation errors per item
          </li>
          <li>
            📈 <strong>Performance Tracking:</strong> Execution metrics
          </li>
        </ul>
      </div>
    </div>
  );
}

export default BOMRuleEngineDemo;
