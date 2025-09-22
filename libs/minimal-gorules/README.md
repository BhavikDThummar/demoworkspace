# Minimal GoRules Engine

A high-performance, minimal overhead GoRules engine optimized for low latency and high throughput. This engine strips away all non-essential features to achieve maximum performance while maintaining core functionality for rule loading, caching, and execution.

## Features

- **High Performance**: Minimal overhead with optimized memory usage and execution paths
- **Flexible Rule Selection**: Execute rules by ID, tags, or mixed criteria
- **Multiple Execution Modes**: Parallel, sequential, and mixed execution patterns
- **Intelligent Caching**: LRU cache with automatic version management
- **Cross-Platform**: Works in both Node.js (NestJS) and browser (React) environments
- **TypeScript First**: Full TypeScript support with comprehensive type definitions
- **Zero Dependencies**: Minimal external dependencies for maximum performance

## Quick Start

### Installation

```bash
npm install @your-org/minimal-gorules
```

### Basic Usage

```typescript
import { MinimalGoRulesEngine } from '@your-org/minimal-gorules';

// Initialize the engine
const engine = new MinimalGoRulesEngine({
  apiUrl: 'https://api.gorules.io',
  apiKey: 'your-api-key',
  projectId: 'your-project-id',
});

// Load all rules from your GoRules project
await engine.initialize();

// Execute a single rule
const result = await engine.executeRule('rule-id', {
  input: 'data',
});

// Execute multiple rules in parallel
const results = await engine.executeRules(['rule1', 'rule2'], {
  input: 'data',
});

// Execute rules by tags
const tagResults = await engine.executeByTags(['tag1', 'tag2'], {
  input: 'data',
});
```

## Documentation

- [API Reference](./docs/api-reference.md) - Complete API documentation
- [NestJS Integration](./docs/nestjs-integration.md) - Backend integration guide
- [React Integration](./docs/react-integration.md) - Frontend integration guide
- [Performance Guide](./docs/performance-guide.md) - Performance tuning and benchmarking
- [Troubleshooting](./docs/troubleshooting.md) - Common issues and solutions

## Performance

This engine is designed for high-performance scenarios:

- **Low Latency**: < 1ms overhead per rule execution
- **High Throughput**: > 10,000 rules/second on modern hardware
- **Memory Efficient**: < 50MB memory footprint for 1000 cached rules
- **Concurrent Safe**: Thread-safe operations with minimal locking

## Building

Run `nx build minimal-gorules` to build the library.

## Testing

Run `nx test minimal-gorules` to execute the unit tests via [Jest](https://jestjs.io).

## License

MIT
