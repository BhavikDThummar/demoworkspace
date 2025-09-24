# Implementation Plan

- [x] 1. Create minimal GoRules engine project structure and core interfaces

  - Generate new Nx library using `nx generate @nx/js:library minimal-gorules`
  - Define core TypeScript interfaces for minimal engine components
  - Create configuration interface with essential settings only
  - Write basic error classes with minimal overhead
  - Configure Nx library project.json with proper build targets
  - _Requirements: 5.1, 5.2_

- [x] 2. Implement minimal rule cache manager with LRU eviction

  - Create `MinimalRuleCacheManager` class with Map-based storage
  - Implement LRU eviction policy with O(1) operations using doubly-linked list
  - Add thread-safe operations using read-write locks
  - Implement tag indexing for fast rule lookup by tags
  - Write unit tests for cache operations and eviction scenarios
  - _Requirements: 1.1, 1.2, 6.1, 6.2_

- [x] 3. Create GoRules Cloud API client for project-wide rule loading

  - Implement `MinimalRuleLoaderService` with direct HTTP client
  - Add method to load all rules from GoRules Cloud project at startup
  - Implement individual rule loading for updates and version checking
  - Create rule metadata parsing and Buffer conversion utilities
  - Write unit tests with mocked HTTP responses
  - _Requirements: 1.1, 1.3, 7.1_

- [x] 4. Implement tag manager for rule selection and grouping

  - Create `TagManager` class for managing rule tags and selection
  - Add methods to resolve rules by IDs, tags, or mixed criteria
  - Implement rule dependency analysis for execution ordering
  - Create fast lookup data structures for tag-based queries
  - Write unit tests for rule selection and grouping logic
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 5. Build minimal execution engine with ZenEngine integration

  - Create `MinimalExecutionEngine` class with direct ZenEngine wrapper
  - Implement loader function that reads from cache manager
  - Add single rule execution method using `ZenEngine.evaluate`
  - Create rule validation method to check rule existence in cache
  - Write unit tests for ZenEngine integration and rule execution
  - _Requirements: 1.1, 3.1, 4.1_

- [x] 6. Implement parallel execution mode for independent rules

  - Add parallel execution method using `Promise.allSettled`
  - Implement result aggregation and error handling for parallel execution
  - Create performance timing and measurement utilities
  - Add concurrency control to prevent resource exhaustion
  - Write unit tests for parallel execution scenarios with timing assertions
  - _Requirements: 3.1, 4.1, 4.2_

- [x] 7. Implement sequential execution mode for ordered rule pipelines

  - Add sequential execution method with input chaining between rules
  - Implement pipeline mode where each rule's output becomes next rule's input
  - Create error handling that allows continuation or stops on first error
  - Add execution state tracking for debugging sequential flows
  - Write unit tests for sequential execution and pipeline scenarios
  - _Requirements: 3.2, 4.1, 4.2_

- [x] 8. Implement mixed execution mode for complex rule orchestration

  - Add mixed execution method supporting parallel groups with sequential internal execution
  - Implement execution group configuration and validation
  - Create execution plan optimization for mixed mode scenarios
  - Add result merging logic for complex execution patterns
  - Write unit tests for mixed execution scenarios with various group configurations
  - _Requirements: 3.3, 4.1, 4.2_

- [x] 9. Create main minimal GoRules engine service

  - Implement `MinimalGoRulesEngine` class that orchestrates all components
  - Add initialization method that loads all project rules at startup
  - Implement rule execution methods with selector-based rule resolution
  - Create version checking and cache refresh functionality
  - Write integration tests for complete engine functionality
  - _Requirements: 1.1, 1.2, 1.3, 5.1_

- [x] 10. Add NestJS module integration for backend deployment

  - Create `MinimalGoRulesModule` for NestJS dependency injection following Nx library patterns
  - Implement configuration factory for environment-based setup
  - Add service providers and exports for NestJS applications
  - Create module initialization with async rule loading
  - Update Nx workspace to properly import the new library in existing NestJS apps
  - Write integration tests for NestJS module functionality
  - _Requirements: 7.1, 7.2_

- [x] 11. Implement React integration options for frontend deployment

  - Create React service wrapper for API-based rule execution
  - Implement HTTP client for calling NestJS backend endpoints
  - Add TypeScript interfaces for React-specific usage patterns
  - Create example React components demonstrating rule execution
  - Write unit tests for React integration scenarios
  - _Requirements: 7.2, 7.3_

- [x] 12. Add performance optimizations and memory management

  - Implement memory usage monitoring and automatic cleanup
  - Add connection pooling for HTTP requests to GoRules Cloud API
  - Create request batching for multiple rule operations
  - Implement compression for rule data storage and transfer
  - Write performance tests to validate latency and throughput requirements
  - _Requirements: 4.1, 4.2, 4.3, 6.3_

- [x] 13. Create comprehensive unit and integration tests

  - Configure Jest testing in Nx project.json with proper test targets
  - Write unit tests for all core components with 90%+ coverage
  - Create integration tests with real GoRules Cloud API endpoints
  - Implement performance benchmarks for latency and memory usage using Jest
  - Add load tests for concurrent rule execution scenarios
  - Create mock services for testing without external dependencies
  - _Requirements: 5.1, 5.2, 8.1, 8.2_

- [x] 14. Implement version management and cache invalidation

  - Add version detection logic to compare local cache with cloud versions
  - Implement automatic cache refresh when rule versions change
  - Create manual cache invalidation methods for development scenarios
  - Add version conflict resolution and rollback capabilities

  - Write unit tests for version management and cache invalidation scenarios
  - _Requirements: 1.3, 1.4_

- [x] 15. Add minimal configuration and environment support

  - Create configuration validation with clear error messages
  - Implement environment variable support for all configuration options
  - Add configuration factory methods for different deployment scenarios
  - Create configuration documentation with examples
  - Write unit tests for configuration loading and validation
  - _Requirements: 5.1, 7.1, 8.1_

- [x] 16. Create documentation and usage examples

  - Write comprehensive API documentation with TypeScript signatures
  - Create usage examples for NestJS backend integration
  - Add React frontend integration examples and patterns
  - Document performance tuning recommendations and benchmarking guide
  - Create troubleshooting guide for common issues and solutions
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 17. Configure Nx build and packaging for cross-platform deployment

  - Configure Nx build targets in project.json for both Node.js and browser outputs
  - Set up TypeScript compilation with appropriate tsconfig files for different targets
  - Configure Nx library exports in package.json for proper module resolution
  - Add Nx build executors for optimized production builds with tree-shaking
  - Update workspace tsconfig.base.json to include the new library paths
  - _Requirements: 7.1, 7.2, 7.4_
