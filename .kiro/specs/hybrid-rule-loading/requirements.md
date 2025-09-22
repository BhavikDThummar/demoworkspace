# Requirements Document

## Introduction

This feature enhances the existing Minimal GoRules Engine architecture to support dual rule loading mechanisms: GoRules Cloud API and local static folder loading. The system will use a configuration flag to determine the rule source, enabling offline development, faster testing, and deployment flexibility while maintaining the same high-performance execution characteristics. This hybrid approach allows teams to work with local rule files during development and seamlessly switch to cloud-based rules for production environments.

## Requirements

### Requirement 1

**User Story:** As a developer, I want to configure the rule loading source via a flag, so that I can choose between GoRules Cloud API and local folder loading based on my deployment needs.

#### Acceptance Criteria

1. WHEN the configuration includes a `ruleSource` flag set to 'cloud' THEN the system SHALL load rules from GoRules Cloud API using existing mechanisms
2. WHEN the configuration includes a `ruleSource` flag set to 'local' THEN the system SHALL load rules from a specified local directory path
3. WHEN no `ruleSource` flag is provided THEN the system SHALL default to 'cloud' for backward compatibility
4. WHEN an invalid `ruleSource` value is provided THEN the system SHALL throw a clear configuration error during initialization

### Requirement 2

**User Story:** As a developer, I want a standardized local rule directory structure, so that I can organize and maintain rule files consistently across environments.

#### Acceptance Criteria

1. WHEN local rule loading is enabled THEN the system SHALL expect rule files in JSON format with `.json` extension
2. WHEN scanning the local directory THEN the system SHALL use the filename (without extension) as the rule ID
3. WHEN rule files are stored locally THEN they SHALL follow the GoRules decision JSON format for consistency
4. WHEN subdirectories exist in the rule directory THEN the system SHALL recursively scan and use relative path as rule namespace (e.g., `pricing/shipping-fees.json` becomes rule ID `pricing/shipping-fees`)

### Requirement 3

**User Story:** As a developer, I want local rule metadata management, so that I can maintain version information and rule properties for local files.

#### Acceptance Criteria

1. WHEN a local rule file is loaded THEN the system SHALL generate metadata including file modification time as version
2. WHEN rule metadata is needed THEN the system SHALL extract rule name from filename and support optional metadata files
3. WHEN a `.meta.json` file exists alongside a rule file THEN the system SHALL load additional metadata (tags, description, version)
4. WHEN no metadata file exists THEN the system SHALL create default metadata with filename as name and empty tags array

### Requirement 4

**User Story:** As a developer, I want cross-platform file system support, so that the local rule loading works consistently on Windows, macOS, and Linux.

#### Acceptance Criteria

1. WHEN file paths are processed THEN the system SHALL use platform-agnostic path handling
2. WHEN directory scanning occurs THEN the system SHALL handle different file system permissions gracefully
3. WHEN file watching is implemented THEN it SHALL work across different operating systems
4. WHEN relative paths are used THEN they SHALL resolve correctly from the application root

### Requirement 5

**User Story:** As a developer, I want the same API interface regardless of rule source, so that I can switch between cloud and local loading without changing my application code.

#### Acceptance Criteria

1. WHEN rules are loaded from local files THEN the MinimalGoRulesEngine API SHALL remain unchanged
2. WHEN rule execution occurs THEN the performance characteristics SHALL be similar between cloud and local sources
3. WHEN rule metadata is accessed THEN the same interface SHALL work for both cloud and local rules
4. WHEN version checking is performed THEN local rules SHALL use file modification time for version comparison

### Requirement 6

**User Story:** As a developer, I want comprehensive documentation for local rule management, so that I can understand how to organize, version, and maintain local rule files.

#### Acceptance Criteria

1. WHEN documentation is provided THEN it SHALL include directory structure examples and naming conventions
2. WHEN versioning guidance is given THEN it SHALL explain how file modification times are used for version management
3. WHEN environment-specific setup is documented THEN it SHALL show examples for development, staging, and production configurations
4. WHEN migration guidance is provided THEN it SHALL explain how to convert between cloud and local rule storage

### Requirement 7

**User Story:** As a developer, I want local rule validation and error handling, so that I can identify and fix issues with local rule files during development.

#### Acceptance Criteria

1. WHEN a local rule file has invalid JSON THEN the system SHALL provide clear error messages with file path and line number
2. WHEN a rule file is missing required GoRules format properties THEN the system SHALL validate and report specific missing fields
3. WHEN file system errors occur THEN the system SHALL handle permissions, missing directories, and access issues gracefully
4. WHEN rule loading fails THEN the system SHALL continue loading other valid rules and report all errors collectively

### Requirement 8

**User Story:** As a developer, I want hot-reloading support for local rules during development, so that I can see rule changes without restarting my application.

#### Acceptance Criteria

1. WHEN local rule files are modified THEN the system SHALL detect changes and reload affected rules automatically
2. WHEN file watching is enabled THEN it SHALL monitor the rule directory for file additions, modifications, and deletions
3. WHEN rules are hot-reloaded THEN the cache SHALL be updated atomically without affecting ongoing rule executions
4. WHEN hot-reloading is disabled via configuration THEN the system SHALL load rules once at startup only

### Requirement 9

**User Story:** As a developer, I want React and NestJS compatibility for local rule loading, so that I can use the same local rule approach in both frontend and backend environments.

#### Acceptance Criteria

1. WHEN used in NestJS THEN local rule loading SHALL work with the existing module configuration system
2. WHEN used in React THEN local rules SHALL be bundled appropriately or loaded via API endpoints from NestJS backend
3. WHEN API-based approach is used THEN the NestJS backend SHALL serve local rules through the same API interface as cloud rules
4. WHEN direct client-side loading is needed THEN the system SHALL provide guidance on bundling local rules for browser environments

### Requirement 10

**User Story:** As a developer, I want performance optimization for local rule loading, so that local file access doesn't become a bottleneck compared to cloud caching.

#### Acceptance Criteria

1. WHEN local rules are loaded THEN the system SHALL cache them in memory with the same LRU strategy as cloud rules
2. WHEN file system access occurs THEN it SHALL be optimized to minimize I/O operations during rule execution
3. WHEN multiple rules are loaded THEN the system SHALL batch file operations where possible
4. WHEN performance is measured THEN local rule loading SHALL demonstrate comparable or better latency than cloud API calls
