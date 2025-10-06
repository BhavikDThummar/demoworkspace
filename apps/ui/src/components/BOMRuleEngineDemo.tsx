import React, { useState } from 'react';
import { RuleEngine } from '@org/cm-rule-engine';
import { IBOMItem } from '../types/BOMTypes';
import { bomValidationRules } from '../rules/bomValidationRules';
import { sampleBOMData } from '../data/sampleBOMData';

export function BOMRuleEngineDemo() {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [selectedRules, setSelectedRules] = useState<string[]>(
    bomValidationRules.filter(rule => rule.enabled).map(rule => rule.name)
  );

  const runBOMValidation = async () => {
    setLoading(true);
    try {
      // Create rule engine instance
      const engine = new RuleEngine<IBOMItem>();
      
      // Add selected rules to the engine
      bomValidationRules.forEach(rule => {
        if (selectedRules.includes(rule.name)) {
          engine.addRule(rule);
        }
      });

      // Process the BOM data
      const executionResult = await engine.process(sampleBOMData);

      // Format results
      const validItems = executionResult.data.filter((_, index) => executionResult.errors.filter(e => e.itemId === sampleBOMData[index].lineID).length === 0);
      const invalidItems = executionResult.data.filter((_, index) => executionResult.errors.filter(e => e.itemId === sampleBOMData[index].lineID).length > 0);

      let resultText = `
🔧 BOM Validation Results

📊 Summary:
- Total BOM items: ${sampleBOMData.length}
- Valid items: ${validItems.length}
- Invalid items: ${invalidItems.length}
- Total errors: ${executionResult.errors.length}
- Total warnings: ${executionResult.warnings.length}
- Execution time: ${executionResult.executionTime}ms
- Rules executed: ${executionResult.rulesExecuted}

📋 Active Rules (${selectedRules.length}):
${bomValidationRules
  .filter(rule => selectedRules.includes(rule.name))
  .map(rule => `- ${rule.name}: ${rule.description}`)
  .join('\n')}

`;

      if (executionResult.errors.length > 0) {
        resultText += `
❌ Validation Errors:
${executionResult.errors.map((error, index) => {
  const item = sampleBOMData.find(item => item.lineID === error.itemId);
  return `${index + 1}. Line ${error.itemId} (${item?.description || 'Unknown'}):
   Field: ${error.field}
   Error: ${error.message}`;
}).join('\n')}

`;
      }

      if (executionResult.warnings.length > 0) {
        resultText += `
⚠️ Validation Warnings:
${executionResult.warnings.map((warning, index) => {
  const item = sampleBOMData.find(item => item.lineID === warning.itemId);
  return `${index + 1}. Line ${warning.itemId} (${item?.description || 'Unknown'}):
   Field: ${warning.field}
   Warning: ${warning.message}`;
}).join('\n')}

`;
      }

      if (validItems.length > 0) {
        resultText += `
✅ Valid Items:
${validItems.map((item, index) => {
  const originalItem = sampleBOMData.find(orig => orig.lineID === item.lineID);
  return `${index + 1}. Line ${item.lineID} (${originalItem?.description}) - All rules passed`;
}).join('\n')}
`;
      }

      setResult(resultText);
    } catch (error) {
      setResult(`❌ Error running BOM validation: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleRule = (ruleName: string) => {
    setSelectedRules(prev => 
      prev.includes(ruleName) 
        ? prev.filter(name => name !== ruleName)
        : [...prev, ruleName]
    );
  };

  const toggleAllRules = () => {
    if (selectedRules.length === bomValidationRules.length) {
      setSelectedRules([]);
    } else {
      setSelectedRules(bomValidationRules.map(rule => rule.name));
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '1200px' }}>
      <h1>🔧 BOM Rule Engine Demo</h1>
      <p>This demo shows the cm-rule-engine library in action with BOM validation rules.</p>

      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3>Available Rules ({bomValidationRules.length})</h3>
          <button 
            onClick={toggleAllRules}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {selectedRules.length === bomValidationRules.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '10px' }}>
          {bomValidationRules.map(rule => (
            <label key={rule.name} style={{ 
              display: 'flex', 
              alignItems: 'flex-start', 
              gap: '8px', 
              padding: '12px', 
              border: '1px solid #ddd', 
              borderRadius: '4px',
              backgroundColor: selectedRules.includes(rule.name) ? '#e7f3ff' : '#f8f9fa'
            }}>
              <input
                type="checkbox"
                checked={selectedRules.includes(rule.name)}
                onChange={() => toggleRule(rule.name)}
                style={{ marginTop: '2px' }}
              />
              <div>
                <strong style={{ color: rule.enabled ? '#28a745' : '#6c757d' }}>
                  {rule.name} {!rule.enabled && '(Disabled by default)'}
                </strong>
                <br />
                <small style={{ color: '#666' }}>{rule.description}</small>
                <br />
                <small style={{ color: '#888' }}>
                  Priority: {rule.priority} | Tags: {rule.tags?.join(', ')}
                </small>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Sample BOM Data ({sampleBOMData.length} items)</h3>
        <div style={{ maxHeight: '300px', overflow: 'auto', border: '1px solid #ddd', borderRadius: '4px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead style={{ backgroundColor: '#f5f5f5', position: 'sticky', top: 0 }}>
              <tr>
                <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Line ID</th>
                <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Description</th>
                <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>QPA</th>
                <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>RefDesig</th>
                <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>UOM</th>
                <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Mfg PN</th>
              </tr>
            </thead>
            <tbody>
              {sampleBOMData.map(item => (
                <tr key={item.lineID}>
                  <td style={{ padding: '4px', border: '1px solid #ddd' }}>{item.lineID}</td>
                  <td style={{ padding: '4px', border: '1px solid #ddd' }}>{item.description}</td>
                  <td style={{ padding: '4px', border: '1px solid #ddd' }}>{item.qpa}</td>
                  <td style={{ padding: '4px', border: '1px solid #ddd' }}>{item.refDesig || '(empty)'}</td>
                  <td style={{ padding: '4px', border: '1px solid #ddd' }}>{item.uomID}</td>
                  <td style={{ padding: '4px', border: '1px solid #ddd' }}>{item.mfgPN}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <button 
        onClick={runBOMValidation}
        disabled={loading || selectedRules.length === 0}
        style={{
          padding: '12px 24px',
          backgroundColor: selectedRules.length === 0 ? '#ccc' : '#28a745',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading || selectedRules.length === 0 ? 'not-allowed' : 'pointer',
          fontSize: '16px',
          fontWeight: 'bold'
        }}
      >
        {loading ? 'Running Validation...' : `Run BOM Validation (${selectedRules.length} rules)`}
      </button>

      {result && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '4px',
          fontFamily: 'monospace',
          whiteSpace: 'pre-wrap',
          fontSize: '14px',
          lineHeight: '1.4',
          maxHeight: '500px',
          overflow: 'auto'
        }}>
          {result}
        </div>
      )}

      <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#e7f3ff', borderRadius: '4px' }}>
        <h3>🎯 Demo Features</h3>
        <ul>
          <li>✅ Real BOM validation rules implementation</li>
          <li>✅ Interactive rule selection</li>
          <li>✅ Sample data with intentional validation errors</li>
          <li>✅ Detailed validation results with error reporting</li>
          <li>✅ Performance metrics (execution time, rules executed)</li>
          <li>✅ Transform and validate rule types</li>
        </ul>
        
        <h4>Rule Engine Features Demonstrated:</h4>
        <ul>
          <li>🔄 <strong>Transform Rules:</strong> Data transformation (refDesig parsing)</li>
          <li>✅ <strong>Validation Rules:</strong> Business logic validation</li>
          <li>🏷️ <strong>Rule Tags:</strong> Categorization and filtering</li>
          <li>📊 <strong>Priority System:</strong> Execution order control</li>
          <li>🎛️ <strong>Enable/Disable:</strong> Runtime rule control</li>
          <li>📈 <strong>Performance Tracking:</strong> Execution metrics</li>
        </ul>
      </div>
    </div>
  );
}

export default BOMRuleEngineDemo;