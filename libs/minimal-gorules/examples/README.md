# Usage Examples

This directory contains comprehensive examples demonstrating how to use the Minimal GoRules Engine in various scenarios.

## Examples Overview

### [Basic Usage](./basic-usage.ts)
Demonstrates fundamental operations:
- Engine initialization
- Single rule execution
- Multiple rule execution (parallel)
- Rule execution by tags
- Rule metadata retrieval
- Engine status monitoring
- Rule validation

**Run the example:**
```bash
npx ts-node examples/basic-usage.ts
```

### [Advanced Usage](./advanced-usage.ts)
Shows advanced patterns and optimizations:
- Mixed execution modes (parallel + sequential)
- Advanced error handling with retry logic
- Performance monitoring and metrics collection
- Version management and cache refresh
- Batch processing for high throughput
- Custom execution patterns (pipeline, conditional)
- Memory optimization techniques

**Run the example:**
```bash
npx ts-node examples/advanced-usage.ts
```

### [NestJS Integration](./nestjs-example.ts)
Complete NestJS integration example:
- Module configuration with dependency injection
- Service implementation with lifecycle management
- REST API endpoints for all engine operations
- Error handling and HTTP status mapping
- Configuration validation
- Health checks integration
- Performance monitoring

**Key features:**
- Environment-based configuration
- Graceful startup and shutdown
- Comprehensive API endpoints
- Production-ready error handling

### [React Integration](./react-example.tsx)
Full React application example:
- Context provider for global state
- Custom hooks for rule execution
- Caching mechanisms for performance
- Real-time status monitoring
- Interactive components for rule testing
- Metadata exploration interface
- Error boundaries and loading states

**Key components:**
- `GoRulesProvider` - Context provider
- `UserValidator` - User validation component
- `BusinessRulesDashboard` - Multi-rule execution
- `EngineStatusMonitor` - Real-time monitoring
- `RuleMetadataExplorer` - Rule discovery interface

## Quick Start

### 1. Environment Setup

Create a `.env` file with your GoRules configuration:

```bash
# Required
GORULES_API_KEY=your-api-key-here
GORULES_PROJECT_ID=your-project-id

# Optional
GORULES_API_URL=https://api.gorules.io
GORULES_CACHE_SIZE=1000
GORULES_TIMEOUT=5000
GORULES_BATCH_SIZE=50

# Performance optimizations
GORULES_ENABLE_OPTIMIZATIONS=true
GORULES_ENABLE_METRICS=true
GORULES_ENABLE_POOLING=true
GORULES_ENABLE_BATCHING=true
GORULES_ENABLE_COMPRESSION=true
```

### 2. Basic Example

```typescript
import { MinimalGoRulesEngine } from '@your-org/minimal-gorules';

const engine = new MinimalGoRulesEngine({
  apiUrl: 'https://api.gorules.io',
  apiKey: process.env.GORULES_API_KEY!,
  projectId: 'your-project-id'
});

// Initialize and execute
await engine.initialize();
const result = await engine.executeRule('my-rule', { 
  userId: 123, 
  amount: 100 
});

console.log('Result:', result);
```

### 3. NestJS Example

```typescript
import { Module } from '@nestjs/common';
import { GoRulesModule } from './examples/nestjs-example';

@Module({
  imports: [GoRulesModule]
})
export class AppModule {}
```

### 4. React Example

```tsx
import React from 'react';
import { GoRulesApp } from './examples/react-example';

function App() {
  return <GoRulesApp />;
}
```

## Common Patterns

### Error Handling

```typescript
import { MinimalGoRulesError, MinimalErrorCode } from '@your-org/minimal-gorules';

try {
  const result = await engine.executeRule('my-rule', input);
} catch (error) {
  if (error instanceof MinimalGoRulesError) {
    switch (error.code) {
      case MinimalErrorCode.RULE_NOT_FOUND:
        console.log('Rule not found:', error.ruleId);
        break;
      case MinimalErrorCode.NETWORK_ERROR:
        console.log('Network error - retrying...');
        break;
      // Handle other error types
    }
  }
}
```

### Performance Monitoring

```typescript
// Monitor execution performance
const startTime = Date.now();
const result = await engine.executeRule('my-rule', input);
const executionTime = Date.now() - startTime;

console.log(`Rule executed in ${executionTime}ms`);

// Get engine performance stats
const perfStats = engine.getPerformanceStats();
console.log('Memory usage:', perfStats.memoryUsage, 'MB');
```

### Batch Processing

```typescript
// Execute multiple rules efficiently
const results = await engine.executeRules(
  ['rule1', 'rule2', 'rule3'],
  { userId: 123, context: 'batch' }
);

console.log(`Executed ${results.results.size} rules in ${results.executionTime}ms`);
```

### Mixed Execution Modes

```typescript
// Complex execution pattern
const selector = {
  ids: ['validation-1', 'validation-2', 'business-1', 'business-2'],
  mode: {
    type: 'mixed',
    groups: [
      { rules: ['validation-1', 'validation-2'], mode: 'parallel' },
      { rules: ['business-1', 'business-2'], mode: 'sequential' }
    ]
  }
};

const result = await engine.execute(selector, input);
```

## Testing Examples

Each example includes testing patterns:

### Unit Testing

```typescript
import { MinimalGoRulesEngine } from '@your-org/minimal-gorules';

describe('GoRules Integration', () => {
  let engine: MinimalGoRulesEngine;

  beforeEach(async () => {
    engine = new MinimalGoRulesEngine(testConfig);
    await engine.initialize();
  });

  afterEach(async () => {
    await engine.cleanup();
  });

  it('should execute rule successfully', async () => {
    const result = await engine.executeRule('test-rule', { test: true });
    expect(result).toBeDefined();
  });
});
```

### Integration Testing

```typescript
// Test with real GoRules API
describe('GoRules API Integration', () => {
  it('should load rules from cloud', async () => {
    const engine = new MinimalGoRulesEngine(realConfig);
    const status = await engine.initialize();
    
    expect(status.initialized).toBe(true);
    expect(status.rulesLoaded).toBeGreaterThan(0);
  });
});
```

## Performance Benchmarks

Run performance benchmarks:

```bash
# Basic performance test
npx ts-node examples/advanced-usage.ts

# Load testing
npx ts-node -e "
import { advancedUsageExamples } from './examples/advanced-usage';
advancedUsageExamples();
"
```

Expected performance targets:
- Single rule execution: < 1ms overhead
- Throughput: > 10,000 rules/second
- Memory usage: < 50MB for 1000 cached rules
- Cache hit rate: > 95% in steady state

## Troubleshooting

### Common Issues

1. **Engine not initializing**
   - Check API key and project ID
   - Verify network connectivity
   - Review configuration validation errors

2. **Rules not found**
   - Verify rule IDs match exactly
   - Check if rules are published in GoRules Cloud
   - Refresh cache if rules were recently updated

3. **Performance issues**
   - Enable performance optimizations
   - Increase cache size for frequently used rules
   - Monitor memory usage and cleanup

4. **Network errors**
   - Implement retry logic with exponential backoff
   - Check firewall and proxy settings
   - Verify API endpoint accessibility

### Debug Mode

Enable debug logging:

```typescript
const config = {
  // ... other config
  enablePerformanceMetrics: true,
  // Add debug flag if available in your environment
  debug: process.env.NODE_ENV === 'development'
};
```

### Health Checks

Monitor engine health:

```typescript
// Check engine status
const status = await engine.getStatus();
console.log('Engine healthy:', status.initialized && status.rulesLoaded > 0);

// Check rule versions
const versionCheck = await engine.checkVersions();
console.log('Outdated rules:', versionCheck.outdatedRules.length);
```

## Additional Resources

- [API Reference](../docs/api-reference.md) - Complete API documentation
- [Performance Guide](../docs/performance-guide.md) - Performance optimization
- [Troubleshooting](../docs/troubleshooting.md) - Common issues and solutions
- [NestJS Integration Guide](../docs/nestjs-integration.md) - Backend integration
- [React Integration Guide](../docs/react-integration.md) - Frontend integration

## Contributing

To add new examples:

1. Create a new file in the `examples/` directory
2. Follow the existing naming convention
3. Include comprehensive comments and error handling
4. Add the example to this README
5. Test the example thoroughly

## Support

For questions or issues with these examples:

1. Check the [Troubleshooting Guide](../docs/troubleshooting.md)
2. Review the [API Reference](../docs/api-reference.md)
3. Open an issue in the repository