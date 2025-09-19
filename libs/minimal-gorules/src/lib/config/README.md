# Configuration Module

The configuration module provides comprehensive configuration management for the Minimal GoRules Engine with environment variable support, validation, and factory methods for different deployment scenarios.

## Features

- **Environment Variable Support**: Automatic loading from environment variables
- **Validation**: Comprehensive configuration validation with clear error messages
- **Factory Methods**: Pre-configured setups for development, production, and testing
- **Type Safety**: Full TypeScript support with strict typing
- **Documentation**: Built-in configuration documentation

## Quick Start

### Basic Usage

```typescript
import { ConfigFactory } from '@minimal-gorules/config';

// Load from environment variables
const config = ConfigFactory.fromEnvironment();
const engine = new MinimalGoRulesEngine(config);
```

### Environment Variables

Set these environment variables:

```bash
export GORULES_API_URL="https://api.gorules.io"
export GORULES_API_KEY="your-api-key"
export GORULES_PROJECT_ID="your-project-id"
```

### Development Setup

```typescript
const config = ConfigFactory.forDevelopment({
  apiKey: 'your-dev-api-key',
  projectId: 'your-dev-project-id',
});
```

### Production Setup

```typescript
const config = ConfigFactory.forProduction();
```

### Testing Setup

```typescript
const config = ConfigFactory.forTesting();
```

## Configuration Options

See the main documentation for complete configuration options and examples.

## Validation

```typescript
const validation = ConfigFactory.validate(config);
if (!validation.isValid) {
  console.error('Configuration errors:', validation.errors);
}
```
