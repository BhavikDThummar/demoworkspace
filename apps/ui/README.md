# BOM Rule Engine Demo

A React application demonstrating the cm-rule-engine library with BOM validation rules.

## 🎯 Demo Features

This demo showcases a complete BOM (Bill of Materials) validation system using the cm-rule-engine:

- **Interactive Rule Selection**: Choose which validation rules to apply
- **Real BOM Data**: Sample data with intentional validation errors
- **Comprehensive Validation**: Multiple rule types (transform, validate)
- **Detailed Results**: Error reporting with line-by-line analysis
- **Performance Metrics**: Execution time and rule statistics

## 📁 Structure

```
apps/ui/
├── src/
│   ├── components/
│   │   └── BOMRuleEngineDemo.tsx    # Main demo component
│   ├── data/
│   │   └── sampleBOMData.ts         # Sample BOM data with test cases
│   ├── rules/
│   │   └── bomValidationRules.ts    # BOM validation rule definitions
│   ├── types/
│   │   └── BOMTypes.ts              # BOM data type definitions
│   ├── utils/
│   │   └── BOMUtils.ts              # BOM utility functions
│   ├── app/
│   │   └── App.tsx                  # Main app component
│   └── main.tsx                     # React entry point
├── index.html                       # HTML template
├── vite.config.ts                   # Vite configuration
└── package.json                     # Dependencies
```

## 🚀 Available Commands

```bash
# Start development server
npx nx serve ui

# Build for production
npx nx build ui

# Preview production build
npx nx preview ui
```

## 🔧 BOM Validation Rules

The demo includes 6 comprehensive validation rules:

1. **transform_refdesig_array**: Parses reference designators into arrays
2. **validate_max_refdesig**: Ensures refDesig count doesn't exceed limits
3. **validate_qpa_required**: Validates QPA (Quantity Per Assembly) is provided
4. **validate_each_uom**: Validates EACH UOM requirements
5. **validate_unique_refdesig**: Ensures reference designators are unique
6. **validate_special_characters**: Validates allowed characters in refDesig

## 📊 Sample Data

The demo includes 8 BOM items with intentional validation errors:

- Line 004: QPA = 0 (should fail QPA validation)
- Line 005: Empty RefDesig for EACH UOM (should fail)
- Line 006: Duplicate RefDesig "R1" (should fail uniqueness)
- Line 007: QPA/RefDesig count mismatch (should fail)

## 🎮 How to Use

1. **Start the app**: `npx nx serve ui`
2. **Open browser**: Navigate to http://localhost:4200
3. **Select rules**: Choose which validation rules to apply
4. **Run validation**: Click "Run BOM Validation" button
5. **Review results**: See detailed validation results with errors and warnings

## 🔍 Rule Engine Features Demonstrated

- **Transform Rules**: Data preprocessing and transformation
- **Validation Rules**: Business logic validation with detailed error reporting
- **Rule Tags**: Categorization and filtering system
- **Priority System**: Control execution order of rules
- **Enable/Disable**: Runtime rule control
- **Performance Tracking**: Execution metrics and timing
- **Cross-item Validation**: Rules that validate across multiple BOM items

## 💻 Code Examples

### Using the Rule Engine Directly

```typescript
import { RuleEngine } from '@org/cm-rule-engine';
import { bomValidationRules } from './rules/bomValidationRules';

const engine = new RuleEngine<IBOMItem>();
bomValidationRules.forEach((rule) => engine.addRule(rule));

const result = await engine.process(bomData);
console.log(`Processed ${result.data.length} items with ${result.errors.length} errors`);
```

### Custom Rule Definition

```typescript
const customRule: Rule<IBOMItem> = {
  name: 'custom_validation',
  description: 'Custom BOM validation rule',
  priority: 1,
  enabled: true,
  tags: ['validation', 'custom'],
  validate: (context) => {
    const { item } = context;
    const errors: ValidationError[] = [];

    // Your validation logic here
    if (/* some condition */) {
      errors.push({
        field: 'fieldName',
        message: 'Validation error message',
        severity: 'error',
        itemId: item.lineID
      });
    }

    return errors;
  }
};
```

## 🎯 Integration Ready

The demo shows how to integrate the cm-rule-engine into your own applications:

```typescript
// Direct API
import { RuleEngine } from '@org/cm-rule-engine';

// React Integration
import { useRuleEngine } from '@org/cm-rule-engine/react';

// Types
import type { Rule, RuleExecutionResult, ValidationError } from '@org/cm-rule-engine';
```

Perfect for building validation systems, data processing pipelines, and business rule engines!
