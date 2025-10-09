import { useState } from 'react';
import { sampleBOMData } from '../data/sampleBOMData';

interface BOMItem {
  lineID: number;
  custPN: string;
  description: string;
  [key: string]: unknown;
}

interface ApiResponse {
  statusCode: number;
  status: string;
  data: {
    items: BOMItem[];
    errors: Array<{ field: string; message: string; itemId: number }>;
    summary: {
      totalItems: number;
      validItems: number;
      invalidItems: number;
      totalErrors: number;
    };
  };
  message: string | null;
}

export function NestJSRuleEngineDemo() {
  const [result, setResult] = useState<string>('');
  const [processing, setProcessing] = useState(false);

  const runValidation = async () => {
    setProcessing(true);
    try {
      const response = await fetch('https://localhost:8001/api/nestjs-rule-engine/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sampleBOMData),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const apiResponse: ApiResponse = await response.json();
      console.log('API Response:', apiResponse);

      const { data: validationData, message } = apiResponse;

      let resultText = `
🚀 NestJS Rule Engine Validation Results

📊 API Response:
- Status: ${apiResponse.status}
- Status Code: ${apiResponse.statusCode}
- Message: ${message || 'N/A'}

📊 Summary:
- Total BOM items: ${validationData.summary.totalItems}
- Valid items: ${validationData.summary.validItems}
- Invalid items: ${validationData.summary.invalidItems}
- Total errors: ${validationData.summary.totalErrors}

`;

      if (validationData.errors.length > 0) {
        resultText += `\n❌ Validation Errors:\n`;
        validationData.errors.forEach((error, index) => {
          resultText += `${index + 1}. Line ${error.itemId} - ${error.field}: ${error.message}\n`;
        });
      }

      const validItems = validationData.items.filter(
        (item) => !validationData.errors.some((e) => e.itemId === item.lineID)
      );

      if (validItems.length > 0) {
        resultText += `\n✅ Valid Items:\n`;
        validItems.forEach((item, index) => {
          resultText += `${index + 1}. Line ${item.lineID}: ${item.custPN} - ${item.description}\n`;
        });
      }

      setResult(resultText);
    } catch (error) {
      setResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h2>🚀 NestJS Rule Engine - API-Side Validation</h2>
          <p>
            This demo uses the cm-rule-engine library with NestJS binding to validate BOM data
            entirely on the API side.
          </p>
        </div>

        <div className="form-group">
          <button
            onClick={runValidation}
            disabled={processing}
            className={`btn ${processing ? '' : 'btn-primary'}`}
          >
            {processing ? (
              <>
                <span className="spinner" style={{ width: '16px', height: '16px' }}></span>
                Processing...
              </>
            ) : (
              <>🔍 Run API-Side Validation</>
            )}
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
          <li>Uses the cm-rule-engine library with NestJS binding</li>
          <li>All validation happens on the API side using RuleEngineService</li>
          <li>Rules are loaded from secure TypeScript module on the server</li>
          <li>Ultra-fast performance with no client-side processing</li>
          <li>API endpoint: <code>POST /api/nestjs-rule-engine/validate</code></li>
        </ul>
      </div>
    </div>
  );
}
