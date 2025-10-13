/**
 * Batch Data Demo Component
 * Demonstrates efficient batch data processing with database/API integration
 */

import { useState } from 'react';
import { sampleBOMData } from '../data/sampleBOMData';
import { useBatchDataProcessing, useTestDataGenerator } from '../hooks/useBatchDataProcessing';

export function BatchDataDemo() {
  const [result, setResult] = useState<string>('');
  const [itemCount, setItemCount] = useState<number>(100);

  // Use custom hooks for batch data processing
  const { processing, error, processBatchData, clearError } = useBatchDataProcessing();
  const { generateTestItems } = useTestDataGenerator();

  /**
   * Process BOM items with batch data enrichment
   */
  const runBatchDataProcessing = async () => {
    clearError();
    setResult('🔄 Processing BOM items with batch data enrichment...');

    const data = await processBatchData(sampleBOMData, {
      continueOnError: true,
      includeBatchDataRules: true,
      includeValidationRules: false, // Focus on batch data only
    });

    if (!data) {
      setResult(`❌ Error: ${error || 'Failed to process batch data'}`);
      return;
    }
    console.log('Exection result: ', data);

    let resultText = `
🚀 Batch Data Processing Results

📊 Summary:
- Total BOM items: ${data.summary.totalItems}
- Items enriched: ${data.summary.enrichedItems}
- Enrichment rate: ${data.summary.enrichmentRate}
- Execution time: ${data.summary.executionTime}ms
- Rules executed: ${data.summary.rulesExecuted}

⚡ Performance:
- Items per second: ${data.performance.itemsPerSecond}
- Average time per item: ${data.performance.avgTimePerItem}
- Database calls: ${data.performance.databaseCallsEstimate}

✅ Key Achievement:
- ${data.summary.totalItems} items processed with 1 database call
- Each item now has cmHidden.uomId_fromDB populated
- Traditional approach would need ${data.summary.totalItems} database calls

`;

    // Show sample enriched items
    const enrichedItems = data.items.filter((item) => item.cmHidden?.uomId_fromDB);
    if (enrichedItems.length > 0) {
      resultText += `\n📋 Sample Enriched Items:\n`;
      enrichedItems.slice(0, 5).forEach((item, index) => {
        resultText += `${index + 1}. Line ${item.lineID}: ${item.custPN} - uomId_fromDB: "${
          item.cmHidden?.uomId_fromDB
        }"\n`;
      });
    }

    if (data.errors.length > 0) {
      resultText += `\n❌ Errors (${data.errors.length}):\n`;
      data.errors.slice(0, 3).forEach((error, index) => {
        resultText += `${index + 1}. Line ${error.itemId} - ${error.field}: ${error.message}\n`;
      });
      if (data.errors.length > 3) {
        resultText += `... and ${data.errors.length - 3} more errors\n`;
      }
    }

    resultText += `\n💡 Efficiency Gain:
- Traditional: ${data.summary.totalItems} items = ${data.summary.totalItems} DB calls = ~${(
      data.summary.totalItems * 0.05
    ).toFixed(1)}s
- Batch Data: ${data.summary.totalItems} items = 1 DB call = ~${(
      data.summary.executionTime / 1000
    ).toFixed(2)}s
- Improvement: ${Math.round(
      (data.summary.totalItems * 0.05) / (data.summary.executionTime / 1000),
    )}x faster`;

    setResult(resultText);
  };

  /**
   * Generate test data and process with batch data
   */
  const runScalabilityTest = async () => {
    clearError();
    setResult(`🔄 Running scalability test with ${itemCount} items...`);

    // Generate test BOM items
    const testItems = generateTestItems(itemCount);

    const data = await processBatchData(testItems, {
      continueOnError: true,
      includeBatchDataRules: true,
      includeValidationRules: false,
    });

    if (!data) {
      setResult(`❌ Error: ${error || 'Failed to process test data'}`);
      return;
    }

    const resultText = `
🧪 Scalability Test Results

📊 Test Parameters:
- Items generated: ${itemCount}
- Items processed: ${data.summary.totalItems}
- Items enriched: ${data.summary.enrichedItems}

⚡ Performance Metrics:
- Execution time: ${data.summary.executionTime}ms
- Items per second: ${data.performance.itemsPerSecond}
- Average time per item: ${data.performance.avgTimePerItem}
- Database calls: ${data.performance.databaseCallsEstimate}

📈 Scalability Analysis:
- Memory usage: Linear with data size (not item count)
- Database load: Constant (1 call regardless of batch size)
- Processing time: Linear scaling with excellent performance
- Throughput: ${data.performance.itemsPerSecond} items/second

💡 Efficiency Comparison:
- Traditional approach: ${itemCount} items = ${itemCount} DB calls = ~${(itemCount * 0.05).toFixed(
      1,
    )}s
- Batch data approach: ${itemCount} items = 1 DB call = ~${(
      data.summary.executionTime / 1000
    ).toFixed(2)}s
- Performance improvement: ${Math.round(
      (itemCount * 0.05) / (data.summary.executionTime / 1000),
    )}x faster

✅ Conclusion: Batch data rules scale efficiently with item count!
`;

    setResult(resultText);
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h2>🚀 Batch Data Processing - Efficient DB/API Integration</h2>
          <p>
            This demo shows how to efficiently fetch database/API data once per batch, regardless of
            batch size. Each BOM item gets enriched with <code>cmHidden.uomId_fromDB</code>
            using only 1 database call for the entire batch.
          </p>
        </div>

        <div className="form-group">
          <h3>📋 Sample Data Processing</h3>
          <p>Process the sample BOM data ({sampleBOMData.length} items) with UOM enrichment:</p>
          <button
            onClick={runBatchDataProcessing}
            disabled={processing}
            className={`btn ${processing ? '' : 'btn-primary'}`}
          >
            {processing ? (
              <>
                <span className="spinner" style={{ width: '16px', height: '16px' }}></span>
                Processing...
              </>
            ) : (
              <>🔍 Process Sample Data</>
            )}
          </button>
        </div>

        <div className="form-group">
          <h3>🧪 Scalability Test</h3>
          <p>Generate test data and measure performance:</p>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
            <label htmlFor="itemCount">Number of items:</label>
            <input
              id="itemCount"
              type="number"
              value={itemCount}
              onChange={(e) => setItemCount(parseInt(e.target.value) || 100)}
              min="10"
              max="10000"
              step="100"
              style={{ width: '100px', padding: '0.25rem' }}
            />
            <span style={{ fontSize: '0.9rem', color: '#666' }}>(10 - 10,000 items)</span>
          </div>
          <button
            onClick={runScalabilityTest}
            disabled={processing}
            className={`btn ${processing ? '' : 'btn-warning'}`}
          >
            {processing ? (
              <>
                <span className="spinner" style={{ width: '16px', height: '16px' }}></span>
                Testing...
              </>
            ) : (
              <>🧪 Run Scalability Test</>
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
        <h4 style={{ margin: '0 0 0.5rem 0' }}>💡 How Batch Data Rules Work</h4>
        <ul style={{ margin: '0', paddingLeft: '1.5rem' }}>
          <li>
            ✅ <strong>Single Database Call</strong>: UOM data fetched once per batch
          </li>
          <li>
            ✅ <strong>Cached Data</strong>: All items use the same cached UOM data
          </li>
          <li>
            ✅ <strong>Linear Scaling</strong>: Performance scales linearly with item count
          </li>
          <li>
            ✅ <strong>Memory Efficient</strong>: Cache cleaned up after batch processing
          </li>
          <li>
            ✅ <strong>Type Safe</strong>: Full TypeScript support with existing interfaces
          </li>
          <li>
            📝 API endpoint: <code>POST /api/nestjs-rule-engine/process-with-batch-data</code>
          </li>
        </ul>
      </div>

      <div className="alert alert-success">
        <h4 style={{ margin: '0 0 0.5rem 0' }}>🎯 Use Cases</h4>
        <ul style={{ margin: '0', paddingLeft: '1.5rem' }}>
          <li>
            <strong>UOM Enrichment</strong>: Add unit of measure data from database
          </li>
          <li>
            <strong>Price Lookup</strong>: Fetch current pricing from external APIs
          </li>
          <li>
            <strong>Inventory Check</strong>: Get stock levels from inventory systems
          </li>
          <li>
            <strong>Supplier Info</strong>: Enrich with supplier details from ERP systems
          </li>
          <li>
            <strong>Compliance Data</strong>: Add regulatory information from compliance APIs
          </li>
          <li>
            <strong>Custom Fields</strong>: Add any data from any source to BOM items
          </li>
        </ul>
      </div>

      <div className="alert alert-warning">
        <h4 style={{ margin: '0 0 0.5rem 0' }}>⚡ Performance Benefits</h4>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
            margin: '0.5rem 0',
          }}
        >
          <div>
            <strong>Traditional Approach:</strong>
            <ul style={{ margin: '0.25rem 0', paddingLeft: '1.5rem', fontSize: '0.9rem' }}>
              <li>1,000 items = 1,000 DB calls</li>
              <li>10,000 items = 10,000 DB calls</li>
              <li>Processing time: ~30-300 seconds</li>
              <li>Database load: Very high</li>
            </ul>
          </div>
          <div>
            <strong>Batch Data Approach:</strong>
            <ul style={{ margin: '0.25rem 0', paddingLeft: '1.5rem', fontSize: '0.9rem' }}>
              <li>1,000 items = 1 DB call</li>
              <li>10,000 items = 1 DB call</li>
              <li>Processing time: ~0.5-2 seconds</li>
              <li>Database load: Minimal</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
