# Migration Guide: Cloud to Local Rule Loading

This guide helps you migrate between cloud-based and local file system rule loading in the Minimal GoRules Engine.

## Overview

The hybrid rule loading feature allows you to switch between:
- **Cloud Loading**: Rules loaded from GoRules Cloud API
- **Local Loading**: Rules loaded from local file system

## Migration Scenarios

### 1. Cloud to Local Migration

#### When to Use Local Rules
- **Development**: Faster iteration without API calls
- **Offline Development**: Work without internet connectivity
- **Testing**: Consistent test environments with version-controlled rules
- **Edge Deployments**: Reduce latency and external dependencies

#### Step-by-Step Migration

##### Step 1: Export Cloud Rules
```bash
# Use GoRules CLI or API to export your rules
# This step depends on your GoRules setup
```

##### Step 2: Create Local Directory Structure
```
project-root/
└── rules/
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

##### Step 3: Update Configuration
```typescript
// Before (Cloud)
const config: MinimalGoRulesConfig = {
  ruleSource: 'cloud',
  apiUrl: 'https://api.gorules.io',
  apiKey: process.env.GORULES_API_KEY!,
  projectId: 'my-project-id',
};

// After (Local)
const config: MinimalGoRulesConfig = {
  ruleSource: 'local',
  localRulesPath: './rules',
  enableHotReload: true, // For development
};
```

##### Step 4: Verify Rule IDs
Ensure rule IDs match between cloud and local versions:
```typescript
// Test rule loading
const engine = new MinimalGoRulesEngine(config);
await engine.initialize();

// Verify all expected rules are loaded
const metadata = await engine.getAllRuleMetadata();
console.log('Loaded rules:', Array.from(metadata.keys()));
```

##### Step 5: Test Rule Execution
```typescript
// Test critical rules
const result = await engine.executeRule('pricing/shipping-fees', {
  weight: 2.5,
  destination: 'US',
});

console.log('Rule execution result:', result);
```

### 2. Local to Cloud Migration

#### When to Use Cloud Rules
- **Production**: Centralized rule management
- **Multi-Environment**: Consistent rules across deployments
- **Team Collaboration**: Shared rule repository
- **Scalability**: Leverage GoRules infrastructure

#### Step-by-Step Migration

##### Step 1: Upload Local Rules
```bash
# Use GoRules CLI or web interface to upload rules
# Maintain rule ID consistency
```

##### Step 2: Update Configuration
```typescript
// Before (Local)
const config: MinimalGoRulesConfig = {
  ruleSource: 'local',
  localRulesPath: './rules',
  enableHotReload: true,
};

// After (Cloud)
const config: MinimalGoRulesConfig = {
  ruleSource: 'cloud',
  apiUrl: 'https://api.gorules.io',
  apiKey: process.env.GORULES_API_KEY!,
  projectId: 'my-project-id',
};
```

##### Step 3: Verify Cloud Rules
```typescript
const engine = new MinimalGoRulesEngine(config);
await engine.initialize();

// Check rule versions
const versionCheck = await engine.checkVersions();
console.log('Version check:', versionCheck);
```

##### Step 4: Performance Optimization
```typescript
// Enable optimizations for cloud usage
const config: MinimalGoRulesConfig = {
  ruleSource: 'cloud',
  apiUrl: 'https://api.gorules.io',
  apiKey: process.env.GORULES_API_KEY!,
  projectId: 'my-project-id',
  enablePerformanceOptimizations: true,
  enableConnectionPooling: true,
  enableRequestBatching: true,
  cacheMaxSize: 5000,
};
```

## Environment-Specific Configurations

### Development Environment
```typescript
const devConfig: MinimalGoRulesConfig = {
  ruleSource: 'local',
  localRulesPath: './dev-rules',
  enableHotReload: true,
  enablePerformanceMetrics: true,
};
```

### Staging Environment
```typescript
const stagingConfig: MinimalGoRulesConfig = {
  ruleSource: 'cloud',
  apiUrl: 'https://staging-api.gorules.io',
  apiKey: process.env.GORULES_STAGING_API_KEY!,
  projectId: process.env.GORULES_STAGING_PROJECT_ID!,
  enablePerformanceMetrics: true,
};
```

### Production Environment
```typescript
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

## Configuration Management

### Environment Variables
```bash
# .env.development
GORULES_RULE_SOURCE=local
GORULES_LOCAL_RULES_PATH=./dev-rules
GORULES_ENABLE_HOT_RELOAD=true

# .env.staging
GORULES_RULE_SOURCE=cloud
GORULES_API_URL=https://staging-api.gorules.io
GORULES_API_KEY=staging-key
GORULES_PROJECT_ID=staging-project

# .env.production
GORULES_RULE_SOURCE=cloud
GORULES_API_URL=https://api.gorules.io
GORULES_API_KEY=prod-key
GORULES_PROJECT_ID=prod-project
```

### Configuration Factory
```typescript
export function createConfig(): MinimalGoRulesConfig {
  const ruleSource = process.env.GORULES_RULE_SOURCE as 'cloud' | 'local' || 'cloud';
  
  const baseConfig = {
    ruleSource,
    enablePerformanceMetrics: process.env.NODE_ENV !== 'production',
  };

  if (ruleSource === 'local') {
    return {
      ...baseConfig,
      localRulesPath: process.env.GORULES_LOCAL_RULES_PATH || './rules',
      enableHotReload: process.env.GORULES_ENABLE_HOT_RELOAD === 'true',
    };
  }

  return {
    ...baseConfig,
    apiUrl: process.env.GORULES_API_URL!,
    apiKey: process.env.GORULES_API_KEY!,
    projectId: process.env.GORULES_PROJECT_ID!,
    enablePerformanceOptimizations: process.env.NODE_ENV === 'production',
  };
}
```

## Validation and Testing

### Configuration Validation
```typescript
import { ConfigValidator } from '@your-org/minimal-gorules';

const config = createConfig();
const validation = ConfigValidator.validateHybridConfig(config);

if (!validation.isValid) {
  console.error('Configuration errors:', validation.errors);
  process.exit(1);
}
```

### Rule Compatibility Testing
```typescript
describe('Rule Migration', () => {
  it('should execute same rules with same results', async () => {
    const cloudConfig = { ruleSource: 'cloud', /* ... */ };
    const localConfig = { ruleSource: 'local', /* ... */ };
    
    const cloudEngine = new MinimalGoRulesEngine(cloudConfig);
    const localEngine = new MinimalGoRulesEngine(localConfig);
    
    await cloudEngine.initialize();
    await localEngine.initialize();
    
    const testInput = { userId: 123, amount: 100 };
    
    const cloudResult = await cloudEngine.executeRule('test-rule', testInput);
    const localResult = await localEngine.executeRule('test-rule', testInput);
    
    expect(localResult).toEqual(cloudResult);
  });
});
```

## Troubleshooting

### Common Issues

#### Rule ID Mismatches
**Problem**: Rule IDs don't match between cloud and local
**Solution**: Ensure file paths match expected rule IDs

```typescript
// Cloud rule ID: "pricing-shipping-fees"
// Local file should be: pricing-shipping-fees.json
// Or: pricing/shipping-fees.json (becomes "pricing/shipping-fees")
```

#### Missing Dependencies
**Problem**: Local rules reference cloud-only features
**Solution**: Ensure rule format compatibility

#### Performance Differences
**Problem**: Local loading slower than expected
**Solution**: Enable performance optimizations

```typescript
const config: MinimalGoRulesConfig = {
  ruleSource: 'local',
  localRulesPath: './rules',
  enablePerformanceOptimizations: true,
  cacheMaxSize: 5000,
};
```

#### Hot Reload Not Working
**Problem**: File changes not detected
**Solution**: Check file system permissions and watch options

```typescript
const config: MinimalGoRulesConfig = {
  ruleSource: 'local',
  localRulesPath: './rules',
  enableHotReload: true,
  fileSystemOptions: {
    watchOptions: {
      ignored: ['**/node_modules/**'],
      persistent: true,
    },
  },
};
```

## Best Practices

### 1. Gradual Migration
- Start with development environment
- Test thoroughly before production migration
- Keep both configurations available during transition

### 2. Version Control
- Store local rules in version control
- Use semantic versioning for rule changes
- Tag releases for rollback capability

### 3. CI/CD Integration
```yaml
# .github/workflows/rules-sync.yml
name: Sync Rules
on:
  push:
    paths: ['rules/**']
jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Upload to GoRules Cloud
        run: |
          # Upload changed rules to cloud
          gorules upload --project ${{ secrets.GORULES_PROJECT_ID }}
```

### 4. Monitoring
- Monitor rule execution performance
- Track cache hit rates
- Alert on rule loading failures

### 5. Backup Strategy
- Backup cloud rules regularly
- Keep local rule snapshots
- Document rule dependencies

## Support

For additional help with migration:
- Check the [Troubleshooting Guide](./troubleshooting.md)
- Review [Performance Guide](./performance-guide.md)
- See [API Reference](./api-reference.md) for detailed configuration options