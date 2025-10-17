# NestJS Integration Guide

This guide shows how to use `cm-rule-engine` in NestJS applications using the module and service pattern.

## Installation

```bash
npm install @org/cm-rule-engine
```

## Basic Setup

### 1. Import the Module

Import `RuleEngineModule` in your application module:

```typescript
import { Module } from '@nestjs/common';
import { RuleEngineModule } from '@org/cm-rule-engine/nestjs';

@Module({
  imports: [
    RuleEngineModule.forRoot([
      // Optional: Register initial rules here
    ]),
  ],
})
export class AppModule {}
```

### 2. Inject the Service

Inject `RuleEngineService` into your services or controllers:

```typescript
import { Injectable } from '@nestjs/common';
import { RuleEngineService } from '@org/cm-rule-engine/nestjs';

@Injectable()
export class BomService {
  constructor(
    private readonly ruleEngine: RuleEngineService<BomItem>
  ) {}
  
  async validateBom(items: BomItem[]) {
    return this.ruleEngine.process(items, 'parallel');
  }
}
```

## Complete Example

### Define Your Data Type

```typescript
// bom-item.interface.ts
export interface BomItem {
  id: string;
  name: string;
  quantity: number;
  refdes?: string;
  qpa?: number;
}
```

### Create a Service with Rules

```typescript
// bom-validation.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { RuleEngineService, Rule } from '@org/cm-rule-engine/nestjs';
import { BomItem } from './bom-item.interface';

@Injectable()
export class BomValidationService implements OnModuleInit {
  constructor(
    private readonly ruleEngine: RuleEngineService<BomItem>
  ) {}
  
  onModuleInit() {
    // Register rules when module initializes
    this.registerRules();
  }
  
  private registerRules() {
    // Required field validation
    this.ruleEngine.addRule({
      name: 'validate-required-fields',
      description: 'Ensure required fields are present',
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
        
        if (!context.item.quantity || context.item.quantity <= 0) {
          errors.push({
            field: 'quantity',
            message: 'Quantity must be greater than 0',
            severity: 'error',
            itemId: context.item.id
          });
        }
        
        return errors;
      }
    });
    
    // QPA validation
    this.ruleEngine.addRule({
      name: 'validate-qpa',
      description: 'Validate QPA field',
      priority: 2,
      enabled: true,
      tags: ['validation', 'qpa'],
      validate: (context) => {
        const errors = [];
        
        if (context.item.qpa !== undefined && context.item.qpa < 0) {
          errors.push({
            field: 'qpa',
            message: 'QPA cannot be negative',
            severity: 'error',
            itemId: context.item.id
          });
        }
        
        return errors;
      }
    });
    
    // Refdes validation
    this.ruleEngine.addRule({
      name: 'validate-refdes',
      description: 'Validate reference designator format',
      priority: 3,
      enabled: true,
      tags: ['validation', 'refdes'],
      validate: (context) => {
        const errors = [];
        
        if (context.item.refdes) {
          const refdesPattern = /^[A-Z]+\d+$/;
          if (!refdesPattern.test(context.item.refdes)) {
            errors.push({
              field: 'refdes',
              message: 'Invalid refdes format (expected: R1, C2, etc.)',
              severity: 'warning',
              itemId: context.item.id
            });
          }
        }
        
        return errors;
      }
    });
  }
  
  async validateAll(items: BomItem[]) {
    return this.ruleEngine.process(items, 'parallel');
  }
  
  async validateRequired(items: BomItem[]) {
    return this.ruleEngine.processWithRules(items, {
      tags: ['required'],
      mode: 'parallel'
    });
  }
  
  async validateQpa(items: BomItem[]) {
    return this.ruleEngine.processWithRules(items, {
      tags: ['qpa'],
      mode: 'parallel'
    });
  }
  
  async processBatch(items: BomItem[]) {
    return this.ruleEngine.processBatch(items, {
      tags: ['validation'],
      mode: 'parallel'
    }, {
      maxConcurrency: 1000,
      continueOnError: true
    });
  }
}
```

### Use in Controller

```typescript
// bom.controller.ts
import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { BomValidationService } from './bom-validation.service';
import { BomItem } from './bom-item.interface';

@Controller('bom')
export class BomController {
  constructor(
    private readonly bomValidationService: BomValidationService
  ) {}
  
  @Post('validate')
  async validateBom(@Body() items: BomItem[]) {
    const result = await this.bomValidationService.validateAll(items);
    
    if (!result.isValid) {
      throw new HttpException({
        message: 'Validation failed',
        errors: result.errors,
        warnings: result.warnings
      }, HttpStatus.BAD_REQUEST);
    }
    
    return {
      message: 'Validation successful',
      executionTime: result.executionTime,
      rulesExecuted: result.rulesExecuted
    };
  }
  
  @Post('validate/required')
  async validateRequired(@Body() items: BomItem[]) {
    const result = await this.bomValidationService.validateRequired(items);
    
    return {
      isValid: result.isValid,
      errors: result.errors,
      warnings: result.warnings,
      executionTime: result.executionTime
    };
  }
  
  @Post('validate/batch')
  async validateBatch(@Body() items: BomItem[]) {
    const result = await this.bomValidationService.processBatch(items);
    
    return {
      isValid: result.isValid,
      totalErrors: result.errors.length,
      totalWarnings: result.warnings.length,
      executionTime: result.executionTime,
      itemsProcessed: items.length
    };
  }
}
```

### Register in Module

```typescript
// bom.module.ts
import { Module } from '@nestjs/common';
import { BomController } from './bom.controller';
import { BomValidationService } from './bom-validation.service';

@Module({
  controllers: [BomController],
  providers: [BomValidationService],
  exports: [BomValidationService],
})
export class BomModule {}
```

## Service API

### RuleEngineService<T>

The service provides the following methods:

#### Rule Management

- **addRule(rule: Rule<T>)**: Register a new rule
- **removeRule(name: string)**: Remove a rule by name
- **enableRule(name: string)**: Enable a disabled rule
- **disableRule(name: string)**: Disable a rule without removing it
- **getRules()**: Get all registered rules
- **getRulesByTags(tags: string[])**: Get rules matching specific tags

#### Processing Methods

- **process(data: T[], mode?: ExecutionMode)**: Process data through all enabled rules
  - Returns: `Promise<RuleExecutionResult<T>>`
  
- **processWithRules(data: T[], selector: RuleSelector)**: Process data through specific rules
  - Returns: `Promise<RuleExecutionResult<T>>`
  
- **processBatch(data: T[], selector: RuleSelector, options?: BatchOptions)**: Process large batches with controlled concurrency
  - Returns: `Promise<RuleExecutionResult<T>>`

## Advanced Examples

### Transformation Pipeline

```typescript
@Injectable()
export class BomTransformationService implements OnModuleInit {
  constructor(
    private readonly ruleEngine: RuleEngineService<BomItem>
  ) {}
  
  onModuleInit() {
    // Transformation rules
    this.ruleEngine.addRule({
      name: 'normalize-name',
      description: 'Normalize item names',
      priority: 1,
      enabled: true,
      tags: ['transformation', 'normalize'],
      transform: (context) => {
        return {
          ...context.item,
          name: context.item.name.trim().toUpperCase()
        };
      }
    });
    
    this.ruleEngine.addRule({
      name: 'calculate-total',
      description: 'Calculate total quantity',
      priority: 2,
      enabled: true,
      tags: ['transformation', 'calculate'],
      transform: (context) => {
        const qpa = context.item.qpa || 1;
        return {
          ...context.item,
          totalQuantity: context.item.quantity * qpa
        };
      }
    });
  }
  
  async transformAndValidate(items: BomItem[]) {
    // First transform
    const transformResult = await this.ruleEngine.processWithRules(items, {
      tags: ['transformation'],
      mode: 'sequential' // Sequential for dependent transformations
    });
    
    // Then validate transformed data
    const validationResult = await this.ruleEngine.processWithRules(
      transformResult.data,
      {
        tags: ['validation'],
        mode: 'parallel'
      }
    );
    
    return validationResult;
  }
}
```

### Cross-Item Validation

```typescript
@Injectable()
export class BomDuplicateCheckService implements OnModuleInit {
  constructor(
    private readonly ruleEngine: RuleEngineService<BomItem>
  ) {}
  
  onModuleInit() {
    this.ruleEngine.addRule({
      name: 'check-duplicate-names',
      description: 'Check for duplicate item names',
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
            message: `Duplicate name found: ${context.item.name} (${duplicates.length} duplicates)`,
            severity: 'warning',
            itemId: context.item.id
          });
        }
        
        return errors;
      }
    });
  }
}
```

### Dynamic Rule Configuration

```typescript
@Injectable()
export class ConfigurableValidationService {
  constructor(
    private readonly ruleEngine: RuleEngineService<BomItem>
  ) {}
  
  enableStrictMode() {
    // Enable all validation rules
    const rules = this.ruleEngine.getRules();
    rules.forEach(rule => {
      if (rule.tags?.includes('validation')) {
        this.ruleEngine.enableRule(rule.name);
      }
    });
  }
  
  enableLenientMode() {
    // Disable warning-level validations
    const rules = this.ruleEngine.getRules();
    rules.forEach(rule => {
      if (rule.tags?.includes('warning')) {
        this.ruleEngine.disableRule(rule.name);
      }
    });
  }
  
  async validateWithMode(items: BomItem[], strict: boolean) {
    if (strict) {
      this.enableStrictMode();
    } else {
      this.enableLenientMode();
    }
    
    return this.ruleEngine.process(items, 'parallel');
  }
}
```

### Batch Processing for Large Datasets

```typescript
@Injectable()
export class LargeBomProcessingService {
  constructor(
    private readonly ruleEngine: RuleEngineService<BomItem>
  ) {}
  
  async processLargeBom(items: BomItem[]) {
    // Process 10,000+ items efficiently
    const result = await this.ruleEngine.processBatch(items, {
      tags: ['validation'],
      mode: 'parallel'
    }, {
      maxConcurrency: 1000,      // Process 1000 items concurrently
      ruleExecutionMode: 'parallel', // Execute rules in parallel per item
      continueOnError: true       // Don't stop on first error
    });
    
    return {
      totalItems: items.length,
      validItems: items.length - result.errors.length,
      invalidItems: result.errors.length,
      executionTime: result.executionTime,
      throughput: Math.round(items.length / (result.executionTime / 1000))
    };
  }
}
```

## Module Configuration

### Global Module

Make the module global to avoid importing in every module:

```typescript
@Module({
  imports: [
    RuleEngineModule.forRoot([/* initial rules */]),
  ],
})
export class AppModule {}
```

The service will be available in all modules without re-importing.

### Module with Initial Rules

Register rules at module initialization:

```typescript
import { Rule } from '@org/cm-rule-engine/nestjs';

const initialRules: Rule<BomItem>[] = [
  {
    name: 'basic-validation',
    description: 'Basic field validation',
    priority: 1,
    enabled: true,
    tags: ['validation'],
    validate: (context) => {
      // validation logic
      return [];
    }
  }
];

@Module({
  imports: [
    RuleEngineModule.forRoot(initialRules),
  ],
})
export class AppModule {}
```

## Best Practices

### 1. Register Rules in OnModuleInit

Use the `OnModuleInit` lifecycle hook to register rules:

```typescript
@Injectable()
export class MyService implements OnModuleInit {
  constructor(private ruleEngine: RuleEngineService<MyType>) {}
  
  onModuleInit() {
    this.registerRules();
  }
  
  private registerRules() {
    // Register rules here
  }
}
```

### 2. Use Tags for Organization

Organize rules with meaningful tags:

```typescript
this.ruleEngine.addRule({
  name: 'my-rule',
  tags: ['validation', 'critical', 'bom'],
  // ...
});
```

### 3. Handle Errors Gracefully

Always check validation results:

```typescript
const result = await this.ruleEngine.process(items);

if (!result.isValid) {
  throw new HttpException({
    message: 'Validation failed',
    errors: result.errors
  }, HttpStatus.BAD_REQUEST);
}
```

### 4. Use Batch Processing for Large Datasets

For 1000+ items, use batch processing:

```typescript
const result = await this.ruleEngine.processBatch(items, {
  tags: ['validation']
}, {
  maxConcurrency: 1000
});
```

### 5. Separate Concerns

Create separate services for different rule categories:

```typescript
// bom-validation.service.ts - validation rules
// bom-transformation.service.ts - transformation rules
// bom-business-rules.service.ts - business logic rules
```

## Performance Optimization

### 1. Choose Execution Mode Wisely

```typescript
// Independent validations - use parallel (faster)
await this.ruleEngine.process(items, 'parallel');

// Dependent transformations - use sequential
await this.ruleEngine.process(items, 'sequential');
```

### 2. Use Selective Execution

Execute only needed rules:

```typescript
// Only run critical validations
await this.ruleEngine.processWithRules(items, {
  tags: ['critical'],
  mode: 'parallel'
});
```

### 3. Batch Large Datasets

```typescript
// For 10,000+ items
await this.ruleEngine.processBatch(items, {
  tags: ['validation']
}, {
  maxConcurrency: 1000
});
```

### 4. Disable Unused Rules

Instead of removing, disable rules you don't need:

```typescript
this.ruleEngine.disableRule('optional-validation');
```

## Testing

### Unit Testing Services

```typescript
import { Test } from '@nestjs/testing';
import { RuleEngineModule, RuleEngineService } from '@org/cm-rule-engine/nestjs';
import { BomValidationService } from './bom-validation.service';

describe('BomValidationService', () => {
  let service: BomValidationService;
  let ruleEngine: RuleEngineService;
  
  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [RuleEngineModule.forRoot()],
      providers: [BomValidationService],
    }).compile();
    
    service = module.get<BomValidationService>(BomValidationService);
    ruleEngine = module.get<RuleEngineService>(RuleEngineService);
  });
  
  it('should validate required fields', async () => {
    const items = [
      { id: '1', name: '', quantity: 1 }
    ];
    
    const result = await service.validateRequired(items);
    
    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].field).toBe('name');
  });
});
```

## TypeScript Support

The service is fully typed. Provide your data type as a generic:

```typescript
@Injectable()
export class MyService {
  constructor(
    private readonly ruleEngine: RuleEngineService<MyDataType>
  ) {}
}
```

## Troubleshooting

### Service not injecting

- Ensure `RuleEngineModule` is imported in your module
- Check that the module is marked as global or imported where needed

### Rules not executing

- Verify rules are enabled: `rule.enabled = true`
- Check tags match when using selective execution
- Ensure rules have either `transform` or `validate` functions

### Performance issues

- Use parallel mode for independent rules
- Use batch processing for large datasets (1000+ items)
- Profile execution time using `result.executionTime`

### Memory issues with large datasets

- Use batch processing with controlled concurrency
- Process data in chunks if needed
- Monitor `maxConcurrency` setting
