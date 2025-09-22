# Testing Quick Reference Card

## 🚀 Most Common Commands

```bash
# Run all tests
nx test @org/minimal-gorules

# Run tests in watch mode (auto-rerun on file changes)
nx test:watch @org/minimal-gorules

# Run with coverage report
nx test @org/minimal-gorules --coverage

# Run specific test file
nx test @org/minimal-gorules --testPathPattern="cache"

# Run tests matching a name pattern
nx test @org/minimal-gorules --testNamePattern="should execute"
```

## 📊 Test Categories Available

| Category | Location | Purpose |
|----------|----------|---------|
| **Unit Tests** | `src/lib/*/**.spec.ts` | Test individual components |
| **Integration Tests** | `src/lib/integration/` | Test component interactions |
| **Performance Tests** | `src/lib/performance/` | Test speed and efficiency |
| **Load Tests** | `src/lib/load-tests/` | Test under heavy load |
| **NestJS Tests** | `src/lib/nestjs/` | Test NestJS integration |
| **React Tests** | `src/lib/react/` | Test React components/hooks |

## 🛠️ Test Utilities Available

```typescript
// Performance testing
import { measurePerformance } from '../test-setup';
const { result, duration } = await measurePerformance(() => operation(), 100);

// Memory testing  
import { measureMemoryUsage } from '../test-setup';
const { result, memoryDelta } = await measureMemoryUsage(() => operation());

// Mock data generation
import { generateMockRule, generateMockInput } from '../test-setup';
const rule = generateMockRule('test-rule');
const input = generateMockInput({ amount: 100 });

// Custom matchers
expect(value).toBeWithinRange(10, 20);

// Cleanup
import { cleanupAfterTest } from '../test-setup';
afterEach(() => cleanupAfterTest());
```

## 🎯 Coverage Thresholds

- **Branches**: 80% minimum
- **Functions**: 85% minimum  
- **Lines**: 90% minimum
- **Statements**: 90% minimum

## 🔍 Debugging Tests

```bash
# Debug specific test
nx test @org/minimal-gorules --testPathPattern="engine.spec" --runInBand

# Run with inspector
nx test @org/minimal-gorules --inspect-brk

# Verbose output
nx test @org/minimal-gorules --verbose --no-coverage
```

## 📁 Key Test Files to Know

- `src/test-setup.ts` - Global test configuration and utilities
- `jest.config.ts` - Jest configuration with coverage thresholds
- `src/lib/integration/full-system.spec.ts` - End-to-end system tests
- `src/lib/load-tests/concurrent-execution.spec.ts` - Load testing
- `src/lib/performance/engine-performance.spec.ts` - Performance benchmarks

## 🚨 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Tests timeout | Add `--testTimeout=60000` |
| Memory issues | Add `--expose-gc --maxWorkers=1` |
| Watch mode broken | Add `--clearCache` |
| Coverage too low | Check `--coverage --coverageReporters=text-summary` |

## 📝 Test Writing Template

```typescript
describe('ComponentName', () => {
  let component: ComponentType;

  beforeEach(() => {
    component = new ComponentType();
  });

  afterEach(async () => {
    await cleanupAfterTest();
  });

  it('should [expected behavior]', async () => {
    // Arrange
    const input = generateMockInput();
    
    // Act
    const result = await component.process(input);
    
    // Assert
    expect(result.success).toBe(true);
  });
});
```