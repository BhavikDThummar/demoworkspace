# Requirements Document

## Introduction

This document outlines the requirements for building a custom, ultra-lightweight, high-performance rule engine library (`cm-rule-engine`) that supports bindings with both React and NestJS applications. The engine is designed to handle massive parallel batch execution (10k+ records) while maintaining minimal footprint and maximum runtime performance. The library will be deployed to React applications via a PowerShell script and integrated into NestJS applications through a wrapper module.

## Requirements

### Requirement 1: Core Engine Architecture

**User Story:** As a developer, I want a lightweight rule engine with minimal dependencies, so that I can achieve maximum runtime performance without unnecessary overhead.

#### Acceptance Criteria

1. WHEN the engine is built THEN it SHALL NOT include any logging, monitoring, or resilience helper code
2. WHEN the engine is packaged THEN it SHALL have a minimal footprint with zero external dependencies for core functionality
3. WHEN the engine executes rules THEN it SHALL prioritize raw runtime performance over developer convenience features
4. IF the engine is imported THEN it SHALL expose a clean, simple API surface
5. WHEN the library is structured THEN it SHALL separate core engine logic from platform-specific bindings (React/NestJS)

### Requirement 2: Rule Definition and Management

**User Story:** As a developer, I want to define custom rules with transformation and validation logic, so that I can process and validate data according to business requirements.

#### Acceptance Criteria

1. WHEN defining a rule THEN the system SHALL support both transformation functions and validation functions
2. WHEN a rule is created THEN it SHALL include name, description, priority, enabled status, and optional tags array
3. WHEN rules are executed THEN they SHALL be processed in priority order (lower number = higher priority)
4. WHEN managing rules THEN the system SHALL support adding, removing, enabling, and disabling rules dynamically
5. WHEN a rule executes THEN it SHALL receive context including the current item, all items, and the current index
6. WHEN validation rules execute THEN they SHALL return an array of validation errors with field, message, severity, and optional lineID

### Requirement 3: Massive Parallel Batch Execution

**User Story:** As a developer, I want to execute rules against 10,000+ records in parallel, so that I can process large datasets efficiently.

#### Acceptance Criteria

1. WHEN processing large datasets (10k+ records) THEN the engine SHALL support parallel batch execution
2. WHEN executing batch operations THEN the system SHALL efficiently utilize available system resources
3. WHEN parallel execution is requested THEN the engine SHALL process multiple records concurrently
4. WHEN batch execution completes THEN the system SHALL return transformed data and aggregated validation results
5. IF memory constraints exist THEN the engine SHALL handle large datasets without excessive memory allocation

### Requirement 4: Flexible Execution Modes

**User Story:** As a developer, I want to choose between parallel and sequential execution for rules on a per-record basis, so that I can optimize performance based on rule dependencies.

#### Acceptance Criteria

1. WHEN executing rules for a single record THEN the system SHALL support a parameter to select parallel or sequential execution
2. WHEN parallel mode is selected THEN independent rules SHALL execute concurrently for each record
3. WHEN sequential mode is selected THEN rules SHALL execute in priority order one after another
4. WHEN execution mode is specified THEN it SHALL be configurable at call time, not at engine initialization
5. WHEN rules have dependencies THEN sequential mode SHALL ensure proper execution order

### Requirement 5: React Integration

**User Story:** As a React developer, I want to use the rule engine in my React application with a clean wrapper, so that I can validate and transform data in my UI components.

#### Acceptance Criteria

1. WHEN integrating with React THEN the system SHALL provide a React hook wrapper (e.g., `useRuleEngine`)
2. WHEN the library is deployed to React THEN it SHALL use the PowerShell script at `libs/cm-rule-engine/scripts/deploy-to-react.ps1`
3. WHEN using the React hook THEN it SHALL expose methods for processing data, executing specific rules, and managing rule state
4. WHEN React components use the engine THEN they SHALL NOT call rule execution directly but through the wrapper
5. WHEN the engine is used in React THEN it SHALL maintain React best practices (memoization, callback stability)

### Requirement 6: NestJS Integration

**User Story:** As a NestJS developer, I want to use the rule engine as a service in my NestJS application, so that I can validate and transform data in my backend APIs.

#### Acceptance Criteria

1. WHEN integrating with NestJS THEN the system SHALL provide a NestJS module and service wrapper
2. WHEN the NestJS module is imported THEN it SHALL be configurable via module options
3. WHEN the service is injected THEN it SHALL provide methods for processing data and managing rules
4. WHEN used in NestJS THEN the engine SHALL support dependency injection patterns
5. WHEN the service executes THEN it SHALL be compatible with NestJS lifecycle hooks and async operations

### Requirement 7: Data Transformation Pipeline

**User Story:** As a developer, I want to transform data through a series of rules, so that I can prepare data for validation or further processing.

#### Acceptance Criteria

1. WHEN transformation rules are defined THEN they SHALL modify and return the transformed item
2. WHEN multiple transformation rules exist THEN they SHALL execute in priority order
3. WHEN a transformation rule executes THEN it SHALL receive the item transformed by previous rules
4. WHEN transformation completes THEN the system SHALL return the fully transformed dataset
5. WHEN transformations are applied THEN the original data SHALL remain unchanged (immutable operations)

### Requirement 8: Selective Rule Execution

**User Story:** As a developer, I want to execute only specific rules by name or tag, so that I can optimize performance for targeted validation scenarios.

#### Acceptance Criteria

1. WHEN executing specific rules THEN the system SHALL accept an array of rule names
2. WHEN rule names are provided THEN only those rules SHALL execute
3. WHEN executing rules by tag THEN the system SHALL accept a tag parameter (e.g., "qpa-refdes")
4. WHEN a tag is provided THEN all rules with that tag SHALL execute
5. WHEN selective execution is requested THEN rules SHALL still execute in priority order
6. WHEN specific rules execute THEN both transformation and validation rules SHALL be supported
7. WHEN rule names or tags are invalid THEN the system SHALL gracefully skip non-existent rules
8. WHEN rules are defined THEN they SHALL support an optional tags array property

### Requirement 9: Rule Introspection

**User Story:** As a developer, I want to query information about available rules, so that I can understand what rules are configured and their current state.

#### Acceptance Criteria

1. WHEN requesting rule information THEN the system SHALL return an array of rule metadata
2. WHEN rule metadata is returned THEN it SHALL include name, description, and enabled status
3. WHEN querying rules THEN the system SHALL return all registered rules regardless of enabled state
4. WHEN rule information is accessed THEN it SHALL not trigger rule execution
5. WHEN rules are modified THEN subsequent queries SHALL reflect the updated state

### Requirement 10: Library Structure and Organization

**User Story:** As a developer, I want a well-organized library structure, so that I can easily navigate and maintain the codebase.

#### Acceptance Criteria

1. WHEN the library is structured THEN it SHALL have a clear separation between core engine, React bindings, and NestJS bindings
2. WHEN the library is organized THEN it SHALL place core engine code in `libs/cm-rule-engine/src/lib/engine/`
3. WHEN React bindings are created THEN they SHALL be in `libs/cm-rule-engine/src/lib/react/`
4. WHEN NestJS bindings are created THEN they SHALL be in `libs/cm-rule-engine/src/lib/nestjs/`
5. WHEN the library exports modules THEN it SHALL provide separate entry points for core, React, and NestJS usage

### Requirement 11: TypeScript Support

**User Story:** As a TypeScript developer, I want full type safety and IntelliSense support, so that I can catch errors at compile time and improve developer experience.

#### Acceptance Criteria

1. WHEN the library is written THEN it SHALL be implemented in TypeScript
2. WHEN types are defined THEN they SHALL be exported for consumer usage
3. WHEN the library is built THEN it SHALL generate type declaration files (.d.ts)
4. WHEN developers use the library THEN they SHALL receive full IntelliSense support
5. WHEN generic types are needed THEN the engine SHALL support generic data types for flexibility
