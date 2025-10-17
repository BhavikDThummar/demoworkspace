# React Integration Guide

This guide shows how to use `cm-rule-engine` in React applications using the `useRuleEngine` hook.

## Installation

```bash
npm install @org/cm-rule-engine
```

## Basic Usage

### Import the Hook

```typescript
import { useRuleEngine, Rule } from '@org/cm-rule-engine/react';
```

### Define Rules

```typescript
interface BomItem {
  id: string;
  name: string;
  quantity: number;
  refdes?: string;
}

const validationRules: Rule<BomItem>[] = [
  {
    name: 'validate-name',
    description: 'Ensure name is present',
    priority: 1,
    enabled: true,
    tags: ['validation', 'required'],
    validate: (context) => {
      const errors = [];
      if (!context.item.name || context.item.name.trim() === '') {
        errors.push({
          field: 'name',
          message: 'Name is required',
          severity: 'error',
          itemId: context.item.id
        });
      }
      return errors;
    }
  },
  {
    name: 'validate-quantity',
    description: 'Ensure quantity is positive',
    priority: 2,
    enabled: true,
    tags: ['validation', 'quantity'],
    validate: (context) => {
      const errors = [];
      if (context.item.quantity <= 0) {
        errors.push({
          field: 'quantity',
          message: 'Quantity must be greater than 0',
          severity: 'error',
          itemId: context.item.id
        });
      }
      return errors;
    }
  }
];
```

### Use in Component

```typescript
function BomValidator() {
  const { process, processing, result, addRule, removeRule } = 
    useRuleEngine<BomItem>(validationRules);
  
  const [bomData, setBomData] = useState<BomItem[]>([]);
  
  const handleValidate = async () => {
    // Process all data with all enabled rules
    await process(bomData);
  };
  
  const handleValidateRequired = async () => {
    // Process only with rules tagged 'required'
    await process(bomData, { tags: ['required'], mode: 'parallel' });
  };
  
  return (
    <div>
      <button onClick={handleValidate} disabled={processing}>
        Validate All
      </button>
      
      <button onClick={handleValidateRequired} disabled={processing}>
        Validate Required Only
      </button>
      
      {processing && <p>Processing...</p>}
      
      {result && (
        <div>
          <h3>Results</h3>
          <p>Valid: {result.isValid ? 'Yes' : 'No'}</p>
          <p>Errors: {result.errors.length}</p>
          <p>Warnings: {result.warnings.length}</p>
          <p>Execution Time: {result.executionTime}ms</p>
          
          {result.errors.length > 0 && (
            <div>
              <h4>Errors</h4>
              <ul>
                {result.errors.map((error, idx) => (
                  <li key={idx}>
                    {error.itemId}: {error.field} - {error.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

## Hook API

### useRuleEngine<T>(initialRules?: Rule<T>[])

Returns an object with the following properties and methods:

#### Properties

- **engine**: `RuleEngine<T>` - Direct access to the engine instance
- **processing**: `boolean` - Whether processing is currently in progress
- **result**: `RuleExecutionResult<T> | null` - Latest processing result

#### Methods

- **process(data: T[], selector?: RuleSelector)**: Process data through rules
  - Returns: `Promise<RuleExecutionResult<T>>`
  - Updates `processing` and `result` state automatically

- **addRule(rule: Rule<T>)**: Add a new rule to the engine
  
- **removeRule(name: string)**: Remove a rule by name

- **toggleRule(name: string, enabled: boolean)**: Enable or disable a rule

- **getRules()**: Get all registered rules
  - Returns: `Rule<T>[]`

- **getRulesByTags(tags: string[])**: Get rules matching specific tags
  - Returns: `Rule<T>[]`

## Advanced Examples

### Dynamic Rule Management

```typescript
function DynamicRuleManager() {
  const { addRule, removeRule, toggleRule, getRules } = 
    useRuleEngine<BomItem>();
  
  const [rules, setRules] = useState<Rule<BomItem>[]>([]);
  
  useEffect(() => {
    setRules(getRules());
  }, [getRules]);
  
  const handleAddRule = () => {
    const newRule: Rule<BomItem> = {
      name: `rule-${Date.now()}`,
      description: 'Dynamic rule',
      priority: 10,
      enabled: true,
      tags: ['dynamic'],
      validate: (context) => {
        // Custom validation logic
        return [];
      }
    };
    addRule(newRule);
    setRules(getRules());
  };
  
  const handleToggleRule = (ruleName: string, enabled: boolean) => {
    toggleRule(ruleName, enabled);
    setRules(getRules());
  };
  
  return (
    <div>
      <button onClick={handleAddRule}>Add Rule</button>
      
      <h3>Active Rules</h3>
      <ul>
        {rules.map(rule => (
          <li key={rule.name}>
            <label>
              <input
                type="checkbox"
                checked={rule.enabled}
                onChange={(e) => handleToggleRule(rule.name, e.target.checked)}
              />
              {rule.name} - {rule.description}
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Transformation Rules

```typescript
const transformationRules: Rule<BomItem>[] = [
  {
    name: 'normalize-name',
    description: 'Trim and uppercase names',
    priority: 1,
    enabled: true,
    tags: ['transformation'],
    transform: (context) => {
      return {
        ...context.item,
        name: context.item.name.trim().toUpperCase()
      };
    }
  },
  {
    name: 'calculate-total',
    description: 'Add calculated fields',
    priority: 2,
    enabled: true,
    tags: ['transformation'],
    transform: (context) => {
      return {
        ...context.item,
        total: context.item.quantity * 1.0 // Example calculation
      };
    }
  }
];

function DataTransformer() {
  const { process, result } = useRuleEngine<BomItem>(transformationRules);
  const [data, setData] = useState<BomItem[]>([]);
  
  const handleTransform = async () => {
    const transformResult = await process(data, {
      tags: ['transformation'],
      mode: 'sequential' // Sequential for dependent transformations
    });
    
    // Use transformed data
    setData(transformResult.data);
  };
  
  return (
    <div>
      <button onClick={handleTransform}>Transform Data</button>
      {/* Display transformed data */}
    </div>
  );
}
```

### Selective Execution by Tags

```typescript
function SelectiveValidator() {
  const { process, processing, result } = useRuleEngine<BomItem>([
    // Rules with different tags
    { name: 'r1', priority: 1, enabled: true, tags: ['critical'], validate: /*...*/ },
    { name: 'r2', priority: 2, enabled: true, tags: ['warning'], validate: /*...*/ },
    { name: 'r3', priority: 3, enabled: true, tags: ['critical', 'refdes'], validate: /*...*/ },
  ]);
  
  const [data, setData] = useState<BomItem[]>([]);
  
  const validateCritical = () => {
    process(data, { tags: ['critical'], mode: 'parallel' });
  };
  
  const validateWarnings = () => {
    process(data, { tags: ['warning'], mode: 'parallel' });
  };
  
  const validateRefdes = () => {
    process(data, { tags: ['refdes'], mode: 'parallel' });
  };
  
  return (
    <div>
      <button onClick={validateCritical}>Validate Critical</button>
      <button onClick={validateWarnings}>Validate Warnings</button>
      <button onClick={validateRefdes}>Validate Refdes</button>
      {/* Display results */}
    </div>
  );
}
```

### Cross-Item Validation

```typescript
const crossItemRule: Rule<BomItem> = {
  name: 'check-duplicates',
  description: 'Check for duplicate names',
  priority: 1,
  enabled: true,
  tags: ['validation', 'duplicates'],
  validate: (context) => {
    const errors = [];
    const duplicates = context.allItems.filter(
      item => item.name === context.item.name && item.id !== context.item.id
    );
    
    if (duplicates.length > 0) {
      errors.push({
        field: 'name',
        message: `Duplicate name found: ${context.item.name}`,
        severity: 'warning',
        itemId: context.item.id
      });
    }
    
    return errors;
  }
};
```

## Best Practices

### 1. Initialize Rules Outside Component

Define rules outside your component to avoid recreation on every render:

```typescript
// Good
const rules = [/* ... */];

function MyComponent() {
  const { process } = useRuleEngine(rules);
  // ...
}

// Avoid
function MyComponent() {
  const { process } = useRuleEngine([/* ... */]); // Recreated every render
  // ...
}
```

### 2. Use Tags for Organization

Organize rules with meaningful tags:

```typescript
const rules = [
  { name: 'r1', tags: ['validation', 'critical'], /* ... */ },
  { name: 'r2', tags: ['validation', 'warning'], /* ... */ },
  { name: 'r3', tags: ['transformation'], /* ... */ },
];
```

### 3. Handle Async Operations

The hook automatically manages loading state:

```typescript
const { process, processing, result } = useRuleEngine(rules);

// processing is true during execution
// result is updated when complete
```

### 4. Choose Execution Mode Wisely

- Use **parallel** for independent validations (faster)
- Use **sequential** when rules depend on each other

```typescript
// Independent validations - use parallel
await process(data, { mode: 'parallel' });

// Dependent transformations - use sequential
await process(data, { mode: 'sequential' });
```

## Performance Tips

1. **Use parallel mode** for large datasets when rules are independent
2. **Tag rules appropriately** to execute only what's needed
3. **Disable unused rules** instead of removing them
4. **Batch large datasets** using the engine's batch processing capabilities

## Deployment

For deploying to React applications, use the provided PowerShell script:

```powershell
.\libs\cm-rule-engine\scripts\deploy-to-react.ps1
```

This script builds the library and copies it to your React application's vendor directory.

## TypeScript Support

The hook is fully typed. Provide your data type as a generic:

```typescript
interface MyData {
  id: string;
  value: number;
}

const { process } = useRuleEngine<MyData>(rules);
// process is typed as (data: MyData[], ...) => Promise<RuleExecutionResult<MyData>>
```

## Troubleshooting

### Rules not executing

- Check that rules are enabled: `rule.enabled = true`
- Verify tags match when using selective execution
- Ensure rules have either `transform` or `validate` functions

### Performance issues

- Use parallel mode for independent rules
- Consider batch processing for very large datasets
- Profile execution time using `result.executionTime`

### State not updating

- Ensure you're using the returned `result` from the hook
- Check that `processing` state is being respected in UI
