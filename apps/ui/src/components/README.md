# UI Components for Batch Data Processing

## 🎯 Overview

This directory contains React components that demonstrate the batch data processing functionality. The components showcase how to efficiently process BOM items with database/API integration using only 1 call per batch.

## 📁 Components

### 1. BatchDataDemo.tsx
**Purpose**: Main demo component for batch data processing
**Features**:
- Process sample BOM data with UOM enrichment
- Scalability testing with configurable item counts
- Real-time performance metrics
- Error handling and user feedback

**Key Functionality**:
- Adds `cmHidden.uomId_fromDB` to each BOM item
- Shows efficiency gains (1 DB call vs N DB calls)
- Demonstrates linear scaling with item count

### 2. Navigation.tsx (Updated)
**Purpose**: Navigation component with new batch data demo
**Added**: "Batch Data Processing" option with ⚡ icon

### 3. App.tsx (Updated)
**Purpose**: Main app component with routing
**Added**: Route for `batch-data-demo` component

## 🔧 Hooks

### useBatchDataProcessing.ts
**Purpose**: Custom hook for batch data API calls
**Features**:
- Handles API communication with batch data endpoints
- Error handling and loading states
- Type-safe interfaces for API responses

**Usage**:
```typescript
const { processing, error, processBatchData, clearError } = useBatchDataProcessing();

const result = await processBatchData(bomItems, {
  continueOnError: true,
  includeBatchDataRules: true,
  includeValidationRules: false,
});
```

### useTestDataGenerator.ts
**Purpose**: Generates test BOM data for scalability testing
**Features**:
- Configurable item count
- Realistic test data structure
- Random component types and values

**Usage**:
```typescript
const { generateTestItems } = useTestDataGenerator();
const testItems = generateTestItems(1000); // Generate 1000 test items
```

## 🚀 API Integration

### Endpoints Used
- `POST /api/nestjs-rule-engine/process-with-batch-data`

### Request Format
```json
{
  "inputs": [
    {
      "lineID": 1,
      "custPN": "PART-001",
      "qpa": 1,
      "uomID": "EACH"
    }
  ],
  "options": {
    "continueOnError": true,
    "includeBatchDataRules": true,
    "includeValidationRules": false
  }
}
```

### Response Format
```json
{
  "statusCode": 200,
  "status": "SUCCESS",
  "data": {
    "items": [...], // Enriched BOM items
    "summary": {
      "totalItems": 100,
      "enrichedItems": 100,
      "executionTime": 245,
      "rulesExecuted": 1,
      "enrichmentRate": "100%"
    },
    "performance": {
      "itemsPerSecond": 408,
      "avgTimePerItem": "2.45ms",
      "databaseCallsEstimate": "1 per batch (not per item)"
    }
  }
}
```

## 🎮 How to Use

### 1. Start the UI Application
```bash
npx nx serve ui
```

### 2. Navigate to Batch Data Demo
- Click on "Batch Data Processing" in the navigation
- The component will load with two main options

### 3. Test Sample Data Processing
- Click "Process Sample Data" to test with existing sample BOM data
- View results showing enrichment with `uomId_fromDB` field

### 4. Run Scalability Tests
- Adjust the item count (10 - 10,000 items)
- Click "Run Scalability Test"
- Compare performance metrics

## 📊 Expected Results

### Sample Data Processing
- **Items**: ~13 sample BOM items
- **Execution Time**: ~50-100ms
- **Database Calls**: 1 (not 13)
- **Enrichment Rate**: 100%

### Scalability Test (1000 items)
- **Execution Time**: ~200-500ms
- **Throughput**: 2000+ items/second
- **Database Calls**: 1 (not 1000)
- **Performance Improvement**: 100x+ faster than traditional approach

## 🔍 Key Features Demonstrated

### ✅ **Efficiency**
- 1 database call regardless of batch size
- Linear performance scaling
- Minimal memory usage

### ✅ **User Experience**
- Real-time processing feedback
- Clear performance metrics
- Error handling with user-friendly messages

### ✅ **Flexibility**
- Configurable processing options
- Scalable test data generation
- Reusable hooks for other components

### ✅ **Type Safety**
- Full TypeScript support
- Type-safe API interfaces
- Proper error handling

## 🛠️ Development

### Adding New Features
1. **New Data Sources**: Extend the `useBatchDataProcessing` hook
2. **Additional Metrics**: Update the result display logic
3. **More Test Scenarios**: Add new test data generators

### Customization
- Modify `generateTestItems` for different test scenarios
- Update API endpoints in `useBatchDataProcessing`
- Customize result display in `BatchDataDemo`

The UI components provide a complete demonstration of the batch data processing capabilities with an intuitive interface and comprehensive performance metrics! 🎉