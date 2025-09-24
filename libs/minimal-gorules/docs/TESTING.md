# Testing Guide for Minimal GoRules Engine

This comprehensive guide covers all testing capabilities, commands, and features available in the minimal-gorules library.

## 🚀 Quick Start

### Running Tests

```bash
# Run all tests
nx test @org/minimal-gorules

# Run tests in watch mode (re-runs on file changes)
nx test:watch @org/minimal-gorules

# Run tests with coverage report
nx test @org/minimal-gorules --coverage

# Run specific test file
nx test @org/minimal-gorules --testPathPattern="cache"

# Run tests matching a pattern
nx test @org/minimal-gorules --testNamePattern="should cache rules"
```

## 📁 Test Structure

The library has comprehensive test coverage across all modules:

```
src/
├── lib/
│   ├── cache/
│   │   └── minimal-rule-cache-manager.spec.ts     # Cache functionality tests
│   ├── config/
│   │   └── config-factory.spec.ts                 # Configuration tests
│   ├── execution/
│   │   ├── minimal-execution-engine.spec.ts       # Core execution tests
│   │   └── performance-utils.spec.ts              # Performance utility tests
│   ├── integration/
│   │   ├── engine-integration.spec.ts             # Engine integration tests
│   │   ├── full-system.spec.ts                    # End-to-end system tests
│   │   └── nestjs-integration.spec.ts             # NestJS integration tests
│   ├── load-tests/
│   │   └── concurrent-execution.spec.ts           # Load and stress tests
│   ├── loader/
│   │   └── minimal-rule-loader-service.spec.ts    # Rule loading tests
│   ├── nestjs/
│   │   ├── minimal-gorules.module.spec.ts         # NestJS module tests
│   │   └── minimal-gorules.service.spec.ts        # NestJS service tests
│   ├── performance/
│   │   ├── compression.spec.ts                    # Compression tests
│   │   ├── connection-pool.spec.ts                # Connection pooling tests
│   │   ├── enhanced-loader-service.spec.ts        # Enhanced loader tests
│   │   ├── memory-manager.spec.ts                 # Memory management tests
│   │   └── request-batcher.spec.ts                # Request batching tests
│   ├── react/
│   │   ├── react-gorules-service.spec.ts          # React service tests
│   │   └── hooks/
│   │       ├── use-engine-status.spec.ts          # React hook tests
│   │       ├── use-rule-execution.spec.ts         # Rule execution hook tests
│   │       └── use-rule-metadata.spec.ts          # Metadata hook tests
│   ├── tag-manager/
│   │   └── tag-manager.spec.ts                    # Tag management tests
│   └── version/
│       ├── engine-version-integration.spec.ts     # Version integration tests
│       └── version-manager.spec.ts                # Version management tests
└── test-setup.ts                                  # Global test configuration
```

## 🧪 Test Categories

### 1. Unit Tests

Test individual components in isolation:

```typescript
// Example: Cache Manager Unit Test
describe('MinimalRuleCacheManager', () => {
  it('should cache rules correctly', async () => {
    const cache = new MinimalRuleCacheManager();
    const rule = { id: 'test-rule', content: 'rule-data' };

    await cache.set('test-rule', rule);
    const cached = await cache.get('test-rule');

    expect(cached).toEqual(rule);
  });
});
```

### 2. Integration Tests

Test component interactions:

```typescript
// Example: Engine Integration Test
describe('Engine Integration', () => {
  it('should load and execute rules end-to-end', async () => {
    const engine = new MinimalGoRulesEngine(config);
    await engine.initialize();

    const result = await engine.executeRule('shipping-rule', inputData);

    expect(result.success).toBe(true);
    expect(result.output).toBeDefined();
  });
});
```

### 3. Performance Tests

Test performance characteristics:

```typescript
// Example: Performance Test
describe('Performance Tests', () => {
  it('should execute 1000 rules under 100ms', async () => {
    const { duration } = await measurePerformance(async () => {
      for (let i = 0; i < 1000; i++) {
        await engine.executeRule('fast-rule', testData);
      }
    }, 100); // Expected max time: 100ms

    expect(duration).toBeLessThan(100);
  });
});
```

### 4. Load Tests

Test system under heavy load:

```typescript
// Example: Concurrent Execution Test
describe('Load Tests', () => {
  it('should handle 100 concurrent executions', async () => {
    const promises = Array.from({ length: 100 }, () =>
      engine.executeRule('concurrent-rule', testData),
    );

    const results = await Promise.all(promises);

    expect(results.every((r) => r.success)).toBe(true);
  });
});
```

### 5. Memory Tests

Test memory usage and leaks:

```typescript
// Example: Memory Test
describe('Memory Tests', () => {
  it('should not leak memory during rule execution', async () => {
    const { memoryDelta } = await measureMemoryUsage(async () => {
      for (let i = 0; i < 100; i++) {
        await engine.executeRule('memory-test-rule', testData);
      }
    });

    // Memory delta should be minimal (< 1MB)
    expect(memoryDelta).toBeLessThan(1024 * 1024);
  });
});
```

## 🛠️ Testing Features

### Jest Configuration

The library uses Jest with advanced configuration:

```typescript
// jest.config.ts highlights
{
  testEnvironment: 'node',           // Node.js environment
  coverageThreshold: {               // Coverage requirements
    global: {
      branches: 80,                  // 80% branch coverage
      functions: 85,                 // 85% function coverage
      lines: 90,                     // 90% line coverage
      statements: 90                 // 90% statement coverage
    }
  },
  testTimeout: 30000,               // 30 second timeout
  maxWorkers: '50%',                // Use 50% of CPU cores
  verbose: true                     // Detailed output
}
```

### Custom Test Utilities

#### Performance Testing

```typescript
import { measurePerformance } from '../test-setup';

const { result, duration } = await measurePerformance(
  async () => await heavyOperation(),
  1000, // Expected max time in ms
);
```

#### Memory Testing

```typescript
import { measureMemoryUsage } from '../test-setup';

const { result, memoryDelta } = await measureMemoryUsage(
  async () => await memoryIntensiveOperation(),
);
```

#### Custom Matchers

```typescript
// Custom Jest matcher for ranges
expect(executionTime).toBeWithinRange(50, 150); // 50-150ms
```

#### Mock Data Generators

```typescript
import { generateMockRule, generateMockInput } from '../test-setup';

const mockRule = generateMockRule('test-rule-1', {
  conditions: [{ field: 'amount', operator: 'gt', value: 100 }],
});

const mockInput = generateMockInput({
  amount: 150,
  currency: 'USD',
});
```

### Test Environment Setup

#### Global Mocks

```typescript
// Automatically mocked in test-setup.ts
global.fetch; // HTTP requests
global.performance; // Performance measurements
process.memoryUsage; // Memory usage
```

#### Console Suppression

```typescript
// Console.error and console.warn are suppressed in tests
// Restore them when needed:
console.error = originalConsoleError;
```

#### Cleanup Utilities

```typescript
import { cleanupAfterTest } from '../test-setup';

afterEach(async () => {
  await cleanupAfterTest(); // Clears timers, mocks, and forces GC
});
```

## 📊 Coverage Reports

### Running Coverage

```bash
# Generate coverage report
nx test @org/minimal-gorules --coverage

# Coverage files generated in:
# test-output/jest/coverage/
```

### Coverage Formats

- **Text**: Console output
- **LCOV**: For CI/CD integration
- **HTML**: Interactive browser report
- **JSON**: Programmatic access

### Coverage Thresholds

- **Branches**: 80% minimum
- **Functions**: 85% minimum
- **Lines**: 90% minimum
- **Statements**: 90% minimum

## 🎯 Test Commands Reference

### Basic Commands

```bash
# Run all tests
nx test @org/minimal-gorules

# Watch mode (auto-rerun on changes)
nx test:watch @org/minimal-gorules

# Run with coverage
nx test @org/minimal-gorules --coverage

# Silent mode (minimal output)
nx test @org/minimal-gorules --silent

# Verbose mode (detailed output)
nx test @org/minimal-gorules --verbose
```

### Filtering Tests

```bash
# Run specific test file
nx test @org/minimal-gorules --testPathPattern="cache"

# Run tests matching name pattern
nx test @org/minimal-gorules --testNamePattern="should execute"

# Run tests in specific directory
nx test @org/minimal-gorules --testPathPattern="performance"

# Run only changed tests (with git)
nx test @org/minimal-gorules --onlyChanged
```

### Performance Testing

```bash
# Run load tests specifically
nx test @org/minimal-gorules --testPathPattern="load-tests"

# Run performance tests with longer timeout
nx test @org/minimal-gorules --testTimeout=60000 --testPathPattern="performance"

# Run memory tests with garbage collection
nx test @org/minimal-gorules --expose-gc --testPathPattern="memory"
```

### Debugging Tests

```bash
# Run tests with Node.js inspector
nx test @org/minimal-gorules --inspect-brk

# Run single test file for debugging
nx test @org/minimal-gorules --testPathPattern="engine.spec" --runInBand

# Run with maximum logging
nx test @org/minimal-gorules --verbose --no-coverage
```

## 🔧 Writing Tests

### Test File Structure

```typescript
/**
 * @fileoverview Tests for [Component Name]
 * @module [module-name]
 */

import { [ComponentToTest] } from './[component-file]';
import { generateMockRule, measurePerformance } from '../test-setup';

describe('[ComponentName]', () => {
  let component: ComponentToTest;

  beforeEach(() => {
    component = new ComponentToTest();
  });

  afterEach(async () => {
    await cleanupAfterTest();
  });

  describe('Core Functionality', () => {
    it('should [expected behavior]', async () => {
      // Arrange
      const input = generateMockInput();

      // Act
      const result = await component.process(input);

      // Assert
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should execute within performance limits', async () => {
      const { duration } = await measurePerformance(
        () => component.heavyOperation(),
        100 // max 100ms
      );

      expect(duration).toBeLessThan(100);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid input gracefully', async () => {
      await expect(component.process(null))
        .rejects
        .toThrow('Invalid input');
    });
  });
});
```

### Best Practices

1. **Use descriptive test names**

   ```typescript
   // ✅ Good
   it('should cache rule and return it on subsequent requests');

   // ❌ Bad
   it('should work');
   ```

2. **Follow AAA pattern**

   ```typescript
   it('should calculate shipping fee correctly', () => {
     // Arrange
     const order = { weight: 5, destination: 'US' };

     // Act
     const fee = calculator.calculate(order);

     // Assert
     expect(fee).toBe(15.99);
   });
   ```

3. **Test edge cases**

   ```typescript
   describe('Edge Cases', () => {
     it('should handle empty input');
     it('should handle null values');
     it('should handle extremely large inputs');
     it('should handle concurrent access');
   });
   ```

4. **Use proper cleanup**
   ```typescript
   afterEach(async () => {
     await component.cleanup();
     await cleanupAfterTest();
   });
   ```

## 🚨 Troubleshooting

### Common Issues

#### Tests Timeout

```bash
# Increase timeout for slow tests
nx test @org/minimal-gorules --testTimeout=60000
```

#### Memory Issues

```bash
# Run with garbage collection exposed
nx test @org/minimal-gorules --expose-gc --maxWorkers=1
```

#### Coverage Issues

```bash
# Check what's not covered
nx test @org/minimal-gorules --coverage --coverageReporters=text-summary
```

#### Watch Mode Issues

```bash
# Clear Jest cache
nx test @org/minimal-gorules --clearCache
```

### Debug Mode

```typescript
// Add to test file for debugging
console.log('Debug info:', JSON.stringify(data, null, 2));

// Use Jest's debug mode
fit('debug this test', () => {
  // Only this test will run
});
```

## 📈 CI/CD Integration

### GitHub Actions Example

```yaml
- name: Run Tests
  run: nx test @org/minimal-gorules --coverage --ci

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    file: ./test-output/jest/coverage/lcov.info
```

### Coverage Badges

```markdown
![Coverage](https://img.shields.io/badge/coverage-95%25-brightgreen)
```

This testing framework provides comprehensive coverage for unit tests, integration tests, performance tests, load tests, and memory tests, ensuring the minimal-gorules engine is robust and reliable across all deployment scenarios.
