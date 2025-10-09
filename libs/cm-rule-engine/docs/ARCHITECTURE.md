# CM Rule Engine - Architecture Overview

## 🏗️ High-Level Architecture

The `cm-rule-engine` is a flexible, type-safe rule engine designed for data transformation and validation with zero dependencies in its core. It follows a modular architecture with clear separation of concerns.

```mermaid
graph TB
    subgraph "Entry Points"
        A[index.ts] --> B[Core Engine]
        A --> C[React Integration]
        A --> D[NestJS Integration]
    end
    
    subgraph "Core Engine"
        B --> E[RuleEngine]
        B --> F[RuleManager]
        B --> G[ExecutionEngine]
        B --> H[Types & Interfaces]
    end
    
    subgraph "React Integration"
        C --> I[useRuleEngine Hook]
        C --> J[React Types]
    end
    
    subgraph "NestJS Integration"
        D --> K[RuleEngineService]
        D --> L[RuleEngineModule]
        D --> M[NestJS Types]
    end
    
    subgraph "Build Targets"
        N[Browser Build] --> C
        N --> B
        O[Node Build] --> D
        O --> B
    end
```

## 🔧 Core Components

### 1. RuleEngine (Main Orchestrator)
**Location**: `src/lib/core/rule-engine.ts`

The main entry point that coordinates rule management and execution.

```typescript
class RuleEngine<T> {
  - ruleManager: RuleManager<T>
  - executionEngine: ExecutionEngine<T>
  
  + addRule(rule: Rule<T>): void
  + removeRule(name: string): void
  + process(data: T[], mode?: ExecutionMode): Promise<RuleExecutionResult<T>>
  + processWithRules(data: T[], selector: RuleSelector): Promise<RuleExecutionResult<T>>
  + processBatch(data: T[], selector: RuleSelector, options?: BatchOptions): Promise<RuleExecutionResult<T>>
}
```

### 2. RuleManager (Rule Registry)
**Location**: `src/lib/core/rule-manager.ts`

Manages rule registration, organization, and retrieval with O(1) tag-based lookups.

```typescript
class RuleManager<T> {
  - rules: Map<string, Rule<T>>
  - tagIndex: Map<string, Set<string>>
  
  + addRule(rule: Rule<T>): void
  + removeRule(name: string): void
  + getEnabledRules(): Rule<T>[]
  + getRulesByTags(tags: string[]): Rule<T>[]
  + resolveSelector(selector: RuleSelector): Rule<T>[]
}
```

### 3. ExecutionEngine (Rule Execution)
**Location**: `src/lib/core/execution-engine.ts`

Handles rule execution with different strategies (parallel/sequential) and batch processing.

```typescript
class ExecutionEngine<T> {
  + execute(data: T[], rules: Rule<T>[], mode: ExecutionMode): Promise<RuleExecutionResult<T>>
  + executeBatch(data: T[], rules: Rule<T>[], options: BatchOptions): Promise<RuleExecutionResult<T>>
  - executeParallel(data: T[], rules: Rule<T>[]): Promise<RuleExecutionResult<T>>
  - executeSequential(data: T[], rules: Rule<T>[]): Promise<RuleExecutionResult<T>>
  - processItem(item: T, index: number, allItems: T[], rules: Rule<T>[], mode: ExecutionMode): Promise<BatchItemResult<T>>
}
```

## 📊 Data Flow Architecture

```mermaid
sequenceDiagram
    participant Client
    participant RuleEngine
    participant RuleManager
    participant ExecutionEngine
    participant Rules
    
    Client->>RuleEngine: process(data, selector?)
    RuleEngine->>RuleManager: resolveSelector(selector)
    RuleManager-->>RuleEngine: Rule<T>[]
    RuleEngine->>ExecutionEngine: execute(data, rules, mode)
    
    loop For each item
        ExecutionEngine->>Rules: transform(context)
        Rules-->>ExecutionEngine: transformedItem
        ExecutionEngine->>Rules: validate(context)
        Rules-->>ExecutionEngine: ValidationError[]
    end
    
    ExecutionEngine-->>RuleEngine: RuleExecutionResult<T>
    RuleEngine-->>Client: RuleExecutionResult<T>
```

## 🎯 Rule Structure

```mermaid
classDiagram
    class Rule {
        +string name
        +string description
        +number priority
        +string[] tags
        +boolean enabled
        +transform?(context: RuleContext) Promise~T~
        +validate?(context: RuleContext) Promise~ValidationError[]~
    }
    
    class RuleContext {
        +T item
        +T[] allItems
        +number index
        +Record~string,any~ metadata?
    }
    
    class ValidationError {
        +string field
        +string message
        +string severity
        +string|number|null itemId?
    }
    
    Rule --> RuleContext : uses
    Rule --> ValidationError : produces
```

## 🔌 Integration Architecture

### React Integration
**Location**: `src/lib/react/`

```mermaid
graph LR
    A[React Component] --> B[useRuleEngine Hook]
    B --> C[RuleEngine Instance]
    B --> D[Processing State]
    B --> E[Results State]
    
    C --> F[Rule Management]
    C --> G[Data Processing]
```

**Key Features**:
- `useRuleEngine<T>()` hook for React components
- State management for processing status and results
- Memoized engine instance for performance
- Callback-based API for rule management

### NestJS Integration
**Location**: `src/lib/nestjs/`

```mermaid
graph LR
    A[NestJS Controller] --> B[RuleEngineService]
    B --> C[RuleEngine Instance]
    D[RuleEngineModule] --> B
    E[Dependency Injection] --> B
    
    C --> F[Rule Processing]
    C --> G[Batch Processing]
```

**Key Features**:
- `RuleEngineService` as injectable service
- `RuleEngineModule` for module configuration
- Support for initial rule registration via DI
- Full async/await support for NestJS patterns

## 🚀 Execution Modes

### Parallel Execution
```mermaid
graph TB
    A[Input Data Array] --> B[Item 1]
    A --> C[Item 2]
    A --> D[Item N]
    
    B --> E[Rules Applied Concurrently]
    C --> F[Rules Applied Concurrently]
    D --> G[Rules Applied Concurrently]
    
    E --> H[Results Aggregated]
    F --> H
    G --> H
```

### Sequential Execution
```mermaid
graph TB
    A[Input Data Array] --> B[Item 1]
    B --> C[Apply All Rules]
    C --> D[Item 2]
    D --> E[Apply All Rules]
    E --> F[Item N]
    F --> G[Apply All Rules]
    G --> H[Final Results]
```

### Batch Processing
```mermaid
graph TB
    A[Large Dataset] --> B[Batch 1<br/>maxConcurrency items]
    A --> C[Batch 2<br/>maxConcurrency items]
    A --> D[Batch N<br/>remaining items]
    
    B --> E[Process Concurrently]
    C --> F[Process Concurrently]
    D --> G[Process Concurrently]
    
    E --> H[Aggregate Results]
    F --> H
    G --> H
```

## 📦 Build Architecture

The library supports multiple build targets:

```mermaid
graph TB
    A[Source Code] --> B[TypeScript Compiler]
    B --> C[Node.js Build]
    B --> D[Browser Build]
    
    C --> E[CommonJS Modules]
    C --> F[Node.js Types]
    
    D --> G[ES Modules]
    D --> H[Browser Types]
    
    subgraph "Package Exports"
        I[Main Entry] --> C
        J[React Entry] --> D
        K[NestJS Entry] --> C
    end
```

## 🎨 Design Patterns Used

1. **Strategy Pattern**: Different execution modes (parallel/sequential)
2. **Observer Pattern**: Rule registration and management
3. **Factory Pattern**: Rule engine creation and configuration
4. **Facade Pattern**: Main RuleEngine class simplifies complex interactions
5. **Dependency Injection**: NestJS integration with IoC container
6. **Hook Pattern**: React integration with custom hooks

## 🔍 Key Features

- **Zero Dependencies**: Core engine has no external dependencies
- **Type Safety**: Full TypeScript support with generics
- **Performance**: O(1) tag-based rule lookup, parallel execution
- **Flexibility**: Support for both transformation and validation rules
- **Integration Ready**: Built-in React and NestJS integrations
- **Batch Processing**: Controlled concurrency for large datasets
- **Error Handling**: Comprehensive error types and graceful failure handling

## 📈 Performance Characteristics

- **Rule Lookup**: O(1) for tag-based selection via hash maps
- **Execution**: Configurable parallel/sequential modes
- **Memory**: Efficient batch processing with controlled concurrency
- **Scalability**: Designed for large datasets with batch processing options

This architecture provides a solid foundation for building complex rule-based systems while maintaining flexibility and performance.