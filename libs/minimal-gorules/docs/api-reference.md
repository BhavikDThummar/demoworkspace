# API Reference

Complete API documentation for the Minimal GoRules Engine.

## Table of Contents

- [MinimalGoRulesEngine](#minimalgorulesengine)
- [Configuration](#configuration)
- [Interfaces](#interfaces)
- [Error Handling](#error-handling)
- [React Integration](#react-integration)

## MinimalGoRulesEngine

The main engine class that orchestrates all components for high-performance rule execution.

### Constructor

```typescript
constructor(config: MinimalGoRulesConfig)
```

Creates a new instance of the Minimal GoRules Engine.

**Parameters:**

- `config: MinimalGoRulesConfig` - Engine configuration object

**Example:**

```typescript
const engine = new MinimalGoRulesEngine({
  apiUrl: 'https://api.gorules.io',
  apiKey: 'your-api-key',
  projectId: 'your-project-id',
  cacheMaxSize: 1000,
  httpTimeout: 5000,
});
```

### Core Methods

#### initialize(projectId?: string): Promise<EngineStatus>

Initialize the engine by loading all project rules at startup.

**Parameters:**

- `projectId?: string` - Optional project ID to override config

**Returns:** `Promise<EngineStatus>` - Engine status after initialization

**Example:**

```typescript
const status = await engine.initialize();
console.log(`Loaded ${status.rulesLoaded} rules`);
```

#### execute<T>(selector: RuleSelector, input: Record<string, unknown>): Promise<MinimalExecutionResult<T>>

Execute rules based on selector criteria with flexible execution modes.

**Parameters:**

- `selector: RuleSelector` - Rule selection and execution configuration
- `input: Record<string, unknown>` - Input data for rule execution

**Returns:** `Promise<MinimalExecutionResult<T>>` - Execution results

**Example:**

```typescript
// Parallel execution by IDs
const result = await engine.execute(
  {
    ids: ['rule1', 'rule2'],
    mode: { type: 'parallel' },
  },
  { userId: 123, amount: 100 },
);

// Sequential execution by tags
const result = await engine.execute(
  {
    tags: ['validation', 'business-logic'],
    mode: { type: 'sequential' },
  },
  { data: 'input' },
);

// Mixed execution mode
const result = await engine.execute(
  {
    ids: ['rule1', 'rule2', 'rule3', 'rule4'],
    mode: {
      type: 'mixed',
      groups: [
        { rules: ['rule1', 'rule2'], mode: 'parallel' },
        { rules: ['rule3', 'rule4'], mode: 'sequential' },
      ],
    },
  },
  { input: 'data' },
);
```

#### executeRule<T>(ruleId: string, input: Record<string, unknown>): Promise<T>

Execute a single rule by ID.

**Parameters:**

- `ruleId: string` - Rule identifier
- `input: Record<string, unknown>` - Input data

**Returns:** `Promise<T>` - Rule execution result

**Example:**

```typescript
const result = await engine.executeRule('user-validation', {
  email: 'user@example.com',
  age: 25,
});
```

#### executeRules<T>(ruleIds: string[], input: Record<string, unknown>): Promise<MinimalExecutionResult<T>>

Execute multiple rules by IDs in parallel.

**Parameters:**

- `ruleIds: string[]` - Array of rule identifiers
- `input: Record<string, unknown>` - Input data

**Returns:** `Promise<MinimalExecutionResult<T>>` - Execution results

**Example:**

```typescript
const results = await engine.executeRules(['rule1', 'rule2', 'rule3'], { userId: 123 });

// Access individual results
const rule1Result = results.results.get('rule1');
const errors = results.errors; // Map of any errors
```

#### executeByTags<T>(tags: string[], input: Record<string, unknown>, mode?: 'parallel' | 'sequential'): Promise<MinimalExecutionResult<T>>

Execute rules by tags with specified execution mode.

**Parameters:**

- `tags: string[]` - Array of tags to match
- `input: Record<string, unknown>` - Input data
- `mode?: 'parallel' | 'sequential'` - Execution mode (default: 'parallel')

**Returns:** `Promise<MinimalExecutionResult<T>>` - Execution results

**Example:**

```typescript
// Execute all rules with 'validation' or 'security' tags in parallel
const results = await engine.executeByTags(
  ['validation', 'security'],
  { userId: 123, action: 'login' },
  'parallel',
);
```

### Version Management

#### checkVersions(): Promise<VersionCheckResult>

Check rule versions against GoRules Cloud and identify outdated rules.

**Returns:** `Promise<VersionCheckResult>` - Version check results

**Example:**

```typescript
const versionCheck = await engine.checkVersions();
console.log(`${versionCheck.outdatedRules.length} rules need updating`);
```

#### refreshCache(ruleIds?: string[]): Promise<CacheRefreshResult>

Refresh cache by reloading outdated rules.

**Parameters:**

- `ruleIds?: string[]` - Optional specific rules to refresh

**Returns:** `Promise<CacheRefreshResult>` - Refresh results

**Example:**

```typescript
// Refresh all outdated rules
const refreshResult = await engine.refreshCache();

// Refresh specific rules
const specificRefresh = await engine.refreshCache(['rule1', 'rule2']);
```

#### forceRefreshCache(): Promise<EngineStatus>

Force refresh entire cache by reloading all rules.

**Returns:** `Promise<EngineStatus>` - Engine status after refresh

**Example:**

```typescript
const status = await engine.forceRefreshCache();
```

### Rule Information

#### validateRule(ruleId: string): Promise<boolean>

Validate that a rule exists and is executable.

**Parameters:**

- `ruleId: string` - Rule identifier

**Returns:** `Promise<boolean>` - True if rule is valid

**Example:**

```typescript
const isValid = await engine.validateRule('my-rule');
if (!isValid) {
  console.log('Rule not found or invalid');
}
```

#### getRuleMetadata(ruleId: string): Promise<MinimalRuleMetadata | null>

Get rule metadata by ID.

**Parameters:**

- `ruleId: string` - Rule identifier

**Returns:** `Promise<MinimalRuleMetadata | null>` - Rule metadata or null

**Example:**

```typescript
const metadata = await engine.getRuleMetadata('my-rule');
if (metadata) {
  console.log(`Rule version: ${metadata.version}`);
  console.log(`Tags: ${metadata.tags.join(', ')}`);
}
```

#### getAllRuleMetadata(): Promise<Map<string, MinimalRuleMetadata>>

Get all available rule metadata.

**Returns:** `Promise<Map<string, MinimalRuleMetadata>>` - All rule metadata

**Example:**

```typescript
const allMetadata = await engine.getAllRuleMetadata();
for (const [ruleId, metadata] of allMetadata) {
  console.log(`${ruleId}: v${metadata.version}`);
}
```

#### getRulesByTags(tags: string[]): Promise<string[]>

Get rule IDs that match the specified tags.

**Parameters:**

- `tags: string[]` - Tags to match

**Returns:** `Promise<string[]>` - Array of matching rule IDs

**Example:**

```typescript
const validationRules = await engine.getRulesByTags(['validation']);
const businessRules = await engine.getRulesByTags(['business', 'logic']);
```

### Status and Configuration

#### getStatus(): Promise<EngineStatus>

Get current engine status.

**Returns:** `Promise<EngineStatus>` - Current engine status

**Example:**

```typescript
const status = await engine.getStatus();
console.log(`Initialized: ${status.initialized}`);
console.log(`Rules loaded: ${status.rulesLoaded}`);
console.log(`Memory usage: ${status.performance?.memoryUsage}MB`);
```

#### getConfig(): MinimalGoRulesConfig

Get current configuration.

**Returns:** `MinimalGoRulesConfig` - Current configuration

**Example:**

```typescript
const config = engine.getConfig();
console.log(`Project ID: ${config.projectId}`);
```

#### updateConfig(newConfig: Partial<MinimalGoRulesConfig>): void

Update configuration (may require reinitialization for some changes).

**Parameters:**

- `newConfig: Partial<MinimalGoRulesConfig>` - Configuration updates

**Example:**

```typescript
engine.updateConfig({
  httpTimeout: 10000,
  cacheMaxSize: 2000,
});

// Reinitialize if project changed
if (newConfig.projectId) {
  await engine.initialize();
}
```

### Utility Methods

#### reset(): Promise<void>

Clear all cached rules and reset engine state.

**Example:**

```typescript
await engine.reset();
await engine.initialize(); // Reinitialize after reset
```

#### getCacheStats(): { size: number; maxSize: number; hitRate?: number }

Get cache statistics for monitoring.

**Returns:** Cache statistics object

**Example:**

```typescript
const stats = engine.getCacheStats();
console.log(`Cache: ${stats.size}/${stats.maxSize} rules`);
```

#### cleanup(): Promise<void>

Cleanup engine resources (call before application shutdown).

**Example:**

```typescript
// In application shutdown handler
await engine.cleanup();
```

## Configuration

### MinimalGoRulesConfig

```typescript
interface MinimalGoRulesConfig {
  // Rule source configuration
  ruleSource?: 'cloud' | 'local'; // Rule loading source (default: 'cloud')

  // Cloud-specific configuration (required when ruleSource === 'cloud')
  apiUrl?: string; // GoRules API URL
  apiKey?: string; // API authentication key
  projectId?: string; // GoRules project identifier

  // Local rule configuration (required when ruleSource === 'local')
  localRulesPath?: string; // Path to local rules directory
  enableHotReload?: boolean; // Enable hot reload for local rules (default: false)
  metadataFilePattern?: string; // Metadata file pattern (default: '*.meta.json')
  fileSystemOptions?: FileSystemOptions; // File system options

  // Optional performance settings
  cacheMaxSize?: number; // Max cached rules (default: 1000)
  httpTimeout?: number; // HTTP timeout in ms (default: 5000)
  batchSize?: number; // Batch size for operations (default: 50)

  // Cross-platform settings
  platform?: 'node' | 'browser'; // Target platform

  // Performance optimizations
  enablePerformanceOptimizations?: boolean; // Enable advanced optimizations
  enablePerformanceMetrics?: boolean; // Enable metrics collection
  memoryWarningThreshold?: number; // Memory warning threshold (0.7)
  memoryCriticalThreshold?: number; // Memory critical threshold (0.85)
  memoryCleanupInterval?: number; // Cleanup interval in ms (30000)
  enableConnectionPooling?: boolean; // Enable HTTP connection pooling
  enableRequestBatching?: boolean; // Enable request batching
  enableCompression?: boolean; // Enable response compression
  compressionAlgorithm?: 'gzip' | 'deflate' | 'none'; // Compression algorithm
}

interface FileSystemOptions {
  recursive?: boolean; // Recursive directory scanning (default: true)
  watchOptions?: FileSystemWatchOptions; // File watching options
}

interface FileSystemWatchOptions {
  ignored?: string | RegExp | (string | RegExp)[]; // Files/patterns to ignore
  persistent?: boolean; // Keep process alive for watching
  ignoreInitial?: boolean; // Ignore initial file scan
}
```

### Configuration Examples

#### Cloud Rule Loading (Default)

```typescript
const config: MinimalGoRulesConfig = {
  ruleSource: 'cloud', // Optional - this is the default
  apiUrl: 'https://api.gorules.io',
  apiKey: process.env.GORULES_API_KEY!,
  projectId: 'my-project-id',
};
```

#### Local Rule Loading

```typescript
const config: MinimalGoRulesConfig = {
  ruleSource: 'local',
  localRulesPath: './rules', // Path to local rules directory
  enableHotReload: true, // Enable hot reload for development
};
```

#### Local Rules with Custom Options

```typescript
const config: MinimalGoRulesConfig = {
  ruleSource: 'local',
  localRulesPath: './business-rules',
  enableHotReload: true,
  metadataFilePattern: '*.metadata.json',
  fileSystemOptions: {
    recursive: true,
    watchOptions: {
      ignored: ['**/node_modules/**', '**/.git/**'],
      persistent: true,
      ignoreInitial: false,
    },
  },
};
```

#### High-Performance Cloud Configuration

```typescript
const config: MinimalGoRulesConfig = {
  ruleSource: 'cloud',
  apiUrl: 'https://api.gorules.io',
  apiKey: process.env.GORULES_API_KEY!,
  projectId: 'my-project-id',
  cacheMaxSize: 5000,
  httpTimeout: 10000,
  batchSize: 100,
  enablePerformanceOptimizations: true,
  enablePerformanceMetrics: true,
  enableConnectionPooling: true,
  enableRequestBatching: true,
  enableCompression: true,
};
```

#### Browser Configuration (Cloud)

```typescript
const config: MinimalGoRulesConfig = {
  ruleSource: 'cloud',
  apiUrl: 'https://api.gorules.io',
  apiKey: process.env.REACT_APP_GORULES_API_KEY!,
  projectId: 'my-project-id',
  platform: 'browser',
  cacheMaxSize: 500, // Smaller cache for browser
  httpTimeout: 8000,
};
```

#### Environment-Specific Configuration

```typescript
// Development - use local rules for fast iteration
const devConfig: MinimalGoRulesConfig = {
  ruleSource: 'local',
  localRulesPath: './dev-rules',
  enableHotReload: true,
  enablePerformanceMetrics: true,
};

// Staging - use cloud rules with performance monitoring
const stagingConfig: MinimalGoRulesConfig = {
  ruleSource: 'cloud',
  apiUrl: 'https://staging-api.gorules.io',
  apiKey: process.env.GORULES_STAGING_API_KEY!,
  projectId: process.env.GORULES_STAGING_PROJECT_ID!,
  enablePerformanceMetrics: true,
};

// Production - use cloud rules with full optimizations
const prodConfig: MinimalGoRulesConfig = {
  ruleSource: 'cloud',
  apiUrl: 'https://api.gorules.io',
  apiKey: process.env.GORULES_API_KEY!,
  projectId: process.env.GORULES_PROJECT_ID!,
  enablePerformanceOptimizations: true,
  enableConnectionPooling: true,
  enableRequestBatching: true,
  enableCompression: true,
  cacheMaxSize: 10000,
};
```

## Interfaces

### Core Interfaces

#### MinimalRuleMetadata

```typescript
interface MinimalRuleMetadata {
  id: string; // Rule identifier
  version: string; // Rule version
  tags: string[]; // Rule tags
  lastModified: number; // Last modified timestamp
}
```

#### RuleSelector

```typescript
interface RuleSelector {
  ids?: string[]; // Specific rule IDs to execute
  tags?: string[]; // Tags to match for rule selection
  mode: ExecutionMode; // Execution mode configuration
}
```

#### ExecutionMode

```typescript
interface ExecutionMode {
  type: 'parallel' | 'sequential' | 'mixed';
  groups?: ExecutionGroup[]; // Required for mixed mode
}

interface ExecutionGroup {
  rules: string[]; // Rule IDs in this group
  mode: 'parallel' | 'sequential'; // Execution mode for this group
}
```

#### MinimalExecutionResult

```typescript
interface MinimalExecutionResult<T = unknown> {
  results: Map<string, T>; // Rule ID -> execution result
  executionTime: number; // Total execution time in ms
  errors?: Map<string, Error>; // Rule ID -> error (if any)
}
```

### Status Interfaces

#### EngineStatus

```typescript
interface EngineStatus {
  initialized: boolean; // Whether engine is initialized
  rulesLoaded: number; // Number of rules loaded
  lastUpdate: number; // Last update timestamp
  projectId: string; // Current project ID
  version: string; // Engine version
  performance?: {
    memoryUsage: number; // Memory usage in MB
    cacheHitRate?: number; // Cache hit rate (0-1)
    averageExecutionTime?: number; // Average execution time in ms
  };
}
```

#### VersionCheckResult

```typescript
interface VersionCheckResult {
  outdatedRules: string[]; // Rules that need updating
  upToDateRules: string[]; // Rules that are current
  totalChecked: number; // Total rules checked
  checkTime: number; // Check duration in ms
}
```

#### CacheRefreshResult

```typescript
interface CacheRefreshResult {
  refreshedRules: string[]; // Successfully refreshed rules
  failedRules: Map<string, Error>; // Failed refreshes with errors
  totalProcessed: number; // Total rules processed
  refreshTime: number; // Refresh duration in ms
}
```

## Error Handling

### MinimalGoRulesError

All engine errors extend `MinimalGoRulesError`:

```typescript
class MinimalGoRulesError extends Error {
  constructor(
    public readonly code: MinimalErrorCode,
    message: string,
    public readonly ruleId?: string,
  );
}
```

### Error Codes

```typescript
enum MinimalErrorCode {
  RULE_NOT_FOUND = 'RULE_NOT_FOUND', // Rule doesn't exist
  NETWORK_ERROR = 'NETWORK_ERROR', // Network/API error
  TIMEOUT = 'TIMEOUT', // Operation timeout
  INVALID_INPUT = 'INVALID_INPUT', // Invalid configuration/input
  EXECUTION_ERROR = 'EXECUTION_ERROR', // Rule execution error
}
```

### Error Handling Examples

```typescript
try {
  const result = await engine.executeRule('my-rule', input);
} catch (error) {
  if (error instanceof MinimalGoRulesError) {
    switch (error.code) {
      case MinimalErrorCode.RULE_NOT_FOUND:
        console.log(`Rule not found: ${error.ruleId}`);
        break;
      case MinimalErrorCode.NETWORK_ERROR:
        console.log('Network error, retrying...');
        break;
      case MinimalErrorCode.TIMEOUT:
        console.log('Request timed out');
        break;
      default:
        console.log(`Engine error: ${error.message}`);
    }
  } else {
    console.log(`Unexpected error: ${error.message}`);
  }
}
```

## React Integration

The engine provides React-specific utilities for frontend integration.

### React Service

```typescript
import { React } from '@your-org/minimal-gorules';

const service = new React.ReactGoRulesService({
  baseUrl: 'http://localhost:3000/api',
  timeout: 5000,
});
```

### React Hooks

#### useRuleExecution

```typescript
const { executeRule, executeRules, executeByTags, loading, error, lastResult } =
  useRuleExecution(service);
```

#### useEngineStatus

```typescript
const { status, loading, error, refresh } = useEngineStatus(service);
```

#### useRuleMetadata

```typescript
const { metadata, loading, error, refresh } = useRuleMetadata(service, ruleId);
```

### React Components

Pre-built components for common use cases:

```typescript
import { React } from '@your-org/minimal-gorules';

// Rule executor component
<React.RuleExecutor
  service={service}
  ruleId="my-rule"
  input={{ userId: 123 }}
  onResult={(result) => console.log(result)}
  onError={(error) => console.error(error)}
/>

// Engine status component
<React.EngineStatus
  service={service}
  refreshInterval={30000}
/>

// Rule metadata viewer
<React.RuleMetadataViewer
  service={service}
  ruleId="my-rule"
/>
```

See [React Integration Guide](./react-integration.md) for detailed examples and patterns.

## Hybrid Rule Loading

The engine supports both cloud-based and local file system rule loading, allowing you to choose the best approach for your deployment scenario.

### Rule Source Configuration

Use the `ruleSource` configuration option to specify where rules should be loaded from:

- `'cloud'` (default): Load rules from GoRules Cloud API
- `'local'`: Load rules from local file system

### Local Rule Directory Structure

When using local rule loading, organize your rules in a directory structure:

```
rules/
├── pricing/
│   ├── shipping-fees.json
│   ├── shipping-fees.meta.json
│   └── discount-rules.json
├── validation/
│   ├── order-validation.json
│   └── customer-validation.json
└── approval/
    └── workflow-rules.json
```

### Rule ID Mapping

Rule IDs are generated from file paths:
- `pricing/shipping-fees.json` → Rule ID: `pricing/shipping-fees`
- `validation/order-validation.json` → Rule ID: `validation/order-validation`
- `approval/workflow-rules.json` → Rule ID: `approval/workflow-rules`

### Metadata Files

Optional metadata files provide additional rule information:

```json
{
  "version": "1.0.0",
  "tags": ["pricing", "shipping"],
  "description": "Shipping fee calculation rules",
  "lastModified": "2024-01-15T10:30:00Z",
  "author": "development-team",
  "environment": "development"
}
```

### Hot Reload

Enable hot reload for local rules during development:

```typescript
const config: MinimalGoRulesConfig = {
  ruleSource: 'local',
  localRulesPath: './rules',
  enableHotReload: true, // Automatically reload changed files
};
```

### Migration Between Sources

#### From Cloud to Local

1. Export rules from your GoRules project
2. Organize them in the local directory structure
3. Update configuration to use `ruleSource: 'local'`
4. Test rule execution to ensure compatibility

#### From Local to Cloud

1. Upload local rules to your GoRules project
2. Update configuration to use `ruleSource: 'cloud'`
3. Verify rule IDs match between local and cloud versions
4. Test rule execution to ensure compatibility

### Best Practices

#### Development Environment
- Use local rules with hot reload enabled
- Organize rules by feature or domain
- Use metadata files for documentation
- Enable performance metrics for optimization

#### Production Environment
- Use cloud rules for centralized management
- Enable performance optimizations
- Use connection pooling and request batching
- Monitor cache hit rates and memory usage

#### Hybrid Deployment
- Use local rules for some services, cloud for others
- Implement fallback strategies for high availability
- Synchronize rules between local and cloud via CI/CD
- Use version control for local rule management
