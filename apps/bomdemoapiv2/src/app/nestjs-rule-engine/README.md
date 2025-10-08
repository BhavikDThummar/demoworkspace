# NestJS Rule Engine Implementation

This module demonstrates the use of the `cm-rule-engine` library with NestJS binding for API-side BOM validation.

## Overview

This implementation uses the `RuleEngineService` from `@org/cm-rule-engine/nestjs` to perform ultra-fast BOM validation entirely on the server side. Rules are loaded from `dynamicQpaRefDesRules.ts` and executed using the rule engine's optimized execution pipeline.

## Architecture

```
nestjs-rule-engine/
├── controllers/
│   └── bom-validation.controller.ts    # API endpoint for validation
├── services/
│   └── rule-engine.service.ts          # Service wrapping RuleEngineService
├── rules/
│   └── dynamicQpaRefDesRules.ts        # Rule definitions (copied from custom-rule-engine)
├── utils/
│   └── rule-helpers.ts                 # Helper functions for rules
├── interfaces/
│   └── bom-types.interface.ts          # TypeScript interfaces
└── nestjs-rule-engine.module.ts        # NestJS module definition
```

## Key Features

- **Ultra-fast performance**: All validation happens on the server with optimized rule execution
- **Type-safe**: Full TypeScript support with proper interfaces
- **Isolated**: Completely separate from existing evaluation logic
- **Simple**: No logging, monitoring, or extra features - just core functionality
- **Reusable**: Uses the same rule definitions as the custom-rule-engine

## API Endpoint

### POST `/api/nestjs-rule-engine/validate`

Validates an array of BOM items against the loaded rules.

**Request Body:**
```json
[
  {
    "lineID": 1,
    "custPN": "PART-001",
    "description": "Sample Part",
    "qpa": 2,
    "uomID": "EACH",
    "refDesig": "R1, R2",
    "dnpDesig": "",
    "dnpQty": 0
  }
]
```

**Response:**
```json
{
  "success": true,
  "data": [...],
  "errors": [
    {
      "field": "qpa",
      "message": "QPA (1) must match RefDesig count (2) when UOM is EACH",
      "itemId": 1
    }
  ],
  "summary": {
    "totalItems": 10,
    "validItems": 8,
    "invalidItems": 2,
    "totalErrors": 2
  }
}
```

## Usage in UI

The `NestJSRuleEngineDemo` component in `apps/ui` demonstrates how to call this API:

```typescript
const response = await fetch('http://localhost:8001/api/nestjs-rule-engine/validate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(bomItems),
});

const result = await response.json();
```

## Rule Loading

Rules are loaded from `dynamicQpaRefDesRules.ts` which contains:

1. **transform_parse_and_initialize**: Parses refDesig strings and prepares data
2. **validate_qpa_refdes_rules**: Validates QPA vs RefDesig relationships

Helper functions (`parseRefDesig`, `normalizeQPA`, `createError`) are injected into the rule execution context.

## Differences from Custom Rule Engine

| Feature | Custom Rule Engine | NestJS Rule Engine |
|---------|-------------------|-------------------|
| Library | Custom implementation | cm-rule-engine with NestJS binding |
| Rule Loading | Dynamic from API | Static from file |
| Execution | Custom logic | RuleEngineService |
| UI Integration | React hook | API calls |

## Performance

This implementation is optimized for speed:
- No logging overhead
- No monitoring
- Direct rule execution
- Minimal abstraction layers
- Efficient rule compilation

## Testing

To test the implementation:

1. Start the API: `npx nx serve bomdemoapiv2`
2. Start the UI: `npx nx serve ui`
3. Navigate to the "NestJS Rule Engine" tab
4. Click "Run API-Side Validation"

## Future Enhancements

Potential improvements (not implemented to keep it simple):
- Rule caching
- Batch processing for large datasets
- Rule versioning
- Dynamic rule reloading
- Performance metrics
