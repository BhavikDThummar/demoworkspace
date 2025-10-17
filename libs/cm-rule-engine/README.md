# cm-rule-engine

An ultra-lightweight, high-performance rule engine library for React and NestJS applications. Designed for massive parallel batch execution (10k+ records) with minimal footprint and maximum runtime performance.

## Features

- **Ultra-Lightweight**: Zero external dependencies for core functionality
- **High Performance**: Optimized for processing 10,000+ records in parallel
- **Flexible Execution**: Support for both parallel and sequential execution modes
- **Platform Agnostic**: Clean separation between core engine and platform bindings
- **Type Safe**: Full TypeScript support with comprehensive type definitions
- **Tag-Based Organization**: Organize and execute rules by tags for flexible workflows

## Architecture

The library is organized into three main layers:

### Core Engine (Platform Agnostic)

The core engine provides the fundamental rule processing capabilities:

- **RuleEngine**: Main orchestrator that coordinates rule management and execution
- **RuleManager**: Manages rule registration, organization, and retrieval with tag indexing
- **ExecutionEngine**: Handles rule execution with different strategies (parallel/sequential)

### Platform Bindings

- **React**: `useRuleEngine` hook for seamless React integration
- **NestJS**: Module and service for dependency injection and NestJS patterns

### Component Relationships

```
Application Layer (React/NestJS)
         ↓
Platform Bindings (Hooks/Services)
         ↓
Core Engine (RuleEngine)
    ↓         ↓
RuleManager  ExecutionEngine
```

## Core Concepts

### Rules

Rules are the building blocks of the engine. Each rule can have:

- **Transformation logic**: Modify data as it flows through the pipeline
- **Validation logic**: Check data integrity and return errors/warnings
- **Priority**: Control execution order (lower number = higher priority)
- **Tags**: Organize rules for selective execution
- **Enabled state**: Dynamically enable/disable rules

### Execution Modes

- **Parallel**: Process all items concurrently for maximum performance
- **Sequential**: Process items one by one when order matters

### Rule Selectors

Execute specific subsets of rules using:

- **By name**: Execute specific rules by their unique names
- **By tags**: Execute all rules matching one or more tags

## Installation

```bash
npm install @org/cm-rule-engine
```

## Quick Start

```typescript
import { RuleEngine, Rule } from '@org/cm-rule-engine';

// Define a rule
const validateNameRule: Rule<MyDataType> = {
  name: 'validate-name',
  description: 'Ensure name field is present',
  priority: 1,
  enabled: true,
  tags: ['validation'],
  validate: (context) => {
    const errors = [];
    if (!context.item.name) {
      errors.push({
        field: 'name',
        message: 'Name is required',
        severity: 'error'
      });
    }
    return errors;
  }
};

// Create engine and add rules
const engine = new RuleEngine<MyDataType>();
engine.addRule(validateNameRule);

// Process data
const result = await engine.process(data, 'parallel');
console.log(`Valid: ${result.isValid}`);
console.log(`Errors: ${result.errors.length}`);
```

## Platform Integration

- **React**: See [REACT.md](./REACT.md) for React integration guide
- **NestJS**: See [NESTJS.md](./NESTJS.md) for NestJS integration guide

## API Reference

### RuleEngine

Main engine class for rule processing.

**Methods:**

- `addRule(rule: Rule<T>)`: Register a new rule
- `removeRule(name: string)`: Remove a rule by name
- `enableRule(name: string)`: Enable a rule
- `disableRule(name: string)`: Disable a rule
- `getRules()`: Get all registered rules
- `getRulesByTags(tags: string[])`: Get rules matching tags
- `process(data: T[], mode?: ExecutionMode)`: Process data through all enabled rules
- `processWithRules(data: T[], selector: RuleSelector)`: Process data through specific rules
- `processBatch(data: T[], selector: RuleSelector, options?: BatchOptions)`: Process large batches with controlled concurrency

### Rule Interface

```typescript
interface Rule<TInput = any, TOutput = any> {
  name: string;
  description: string;
  priority: number;
  tags?: string[];
  enabled: boolean;
  transform?: (context: RuleContext<TInput>) => TInput | Promise<TInput>;
  validate?: (context: RuleContext<TInput>) => ValidationError[] | Promise<ValidationError[]>;
}
```

### RuleContext

Context provided to rule functions:

```typescript
interface RuleContext<T = any> {
  item: T;           // Current item being processed
  allItems: T[];     // All items in the dataset
  index: number;     // Current item index
  metadata?: Record<string, any>;
}
```

### RuleExecutionResult

Result returned from processing:

```typescript
interface RuleExecutionResult<T = any> {
  data: T[];              // Transformed data
  errors: ValidationError[];
  warnings: ValidationError[];
  isValid: boolean;       // No errors present
  executionTime: number;  // Milliseconds
  rulesExecuted: number;
}
```

## Performance

The engine is optimized for high-performance batch processing:

- **Parallel execution**: Process multiple items concurrently
- **Efficient indexing**: O(1) tag-to-rule lookup
- **Minimal memory**: No caching, streaming-style processing
- **Zero dependencies**: Smaller bundle size

Typical performance for 10,000 records with 5 validation rules: ~200-500ms (parallel mode).

## Building

Run `npx nx build cm-rule-engine` to build the library.

## Running unit tests

Run `npx nx test cm-rule-engine` to execute the unit tests via [Jest](https://jestjs.io).

## License

MIT
