# NestJS Rule Engine Architecture

## Component Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         UI Layer                                 │
│  apps/ui/src/components/NestJSRuleEngineDemo.tsx                │
│                                                                   │
│  - Displays validation UI                                        │
│  - Sends BOM data to API                                         │
│  - Shows validation results                                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ HTTP POST
                         │ /api/nestjs-rule-engine/validate
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Controller Layer                            │
│  controllers/bom-validation.controller.ts                        │
│                                                                   │
│  @Post('validate')                                               │
│  validateBom(@Body() items: IBOMItem[])                          │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ calls
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Service Layer                              │
│  services/rule-engine.service.ts                                 │
│                                                                   │
│  BomRuleEngineService                                            │
│  ├── Wraps RuleEngineService from @org/cm-rule-engine/nestjs    │
│  ├── Loads rules from dynamicQpaRefDesRules.ts                   │
│  ├── Compiles function strings with helper injection            │
│  └── Executes validation                                         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ uses
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Rule Engine Core                              │
│  @org/cm-rule-engine/nestjs                                      │
│                                                                   │
│  RuleEngineService<IBOMItem>                                     │
│  ├── process(items: IBOMItem[])                                  │
│  ├── addRule(rule: Rule<IBOMItem>)                               │
│  └── getRules()                                                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ executes
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Rules                                    │
│  rules/dynamicQpaRefDesRules.ts                                  │
│                                                                   │
│  1. transform_parse_and_initialize                               │
│     - Parses refDesig and dnpDesig strings                       │
│     - Stores counts in cmHidden                                  │
│                                                                   │
│  2. validate_qpa_refdes_rules                                    │
│     - Validates QPA vs RefDesig count                            │
│     - Validates DNP Qty vs DNP Designator count                  │
│     - Checks UOM-specific rules                                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ uses
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Helper Functions                            │
│  utils/rule-helpers.ts                                           │
│                                                                   │
│  - parseRefDesig(refDesig: string): string[]                     │
│  - normalizeQPA(qpa: string | number): number                    │
│  - createError(field, message, itemId)                           │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

```
1. UI sends BOM items array
   ↓
2. Controller receives request
   ↓
3. Service processes items through rule engine
   ↓
4. Rules execute in priority order:
   a. Transform rules (parse and prepare data)
   b. Validation rules (check business rules)
   ↓
5. Engine returns:
   - Transformed data
   - Validation errors
   ↓
6. Controller formats response with summary
   ↓
7. UI displays results
```

## Module Registration

```typescript
// apps/bomdemoapiv2/src/app/app.module.ts

@Module({
  imports: [
    // ... other modules
    NestjsRuleEngineModule,  // ← Registered here
  ],
})
export class AppModule {}
```

## Rule Execution Pipeline

```
Input: IBOMItem[]
  ↓
┌─────────────────────────────────────┐
│ Priority 1: Transform Rules         │
│ - Parse refDesig strings            │
│ - Calculate counts                  │
│ - Store in cmHidden                 │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│ Priority 2: Validation Rules        │
│ - Check lineID                      │
│ - Validate RefDesig count           │
│ - Validate DNP count                │
│ - Check UOM-specific rules          │
│ - Collect errors                    │
└─────────────────────────────────────┘
  ↓
Output: {
  data: IBOMItem[],      // Transformed items
  errors: ValidationError[]  // Validation errors
}
```

## Key Design Decisions

1. **Isolated Module**: Completely separate from existing custom-rule-engine
2. **Static Rules**: Rules loaded at service initialization (not dynamic)
3. **Helper Injection**: Helper functions injected into rule context via closure
4. **Type Safety**: Full TypeScript interfaces for all data structures
5. **Minimal Dependencies**: Only depends on cm-rule-engine library
6. **No Side Effects**: Pure validation logic, no logging or monitoring

## Performance Characteristics

- **Rule Compilation**: One-time cost at service initialization
- **Validation**: O(n) where n = number of BOM items
- **Memory**: Minimal - rules compiled once, reused for all requests
- **Concurrency**: Stateless service, handles concurrent requests efficiently
