# Package Configuration

This document explains the package.json configuration for the cm-rule-engine library.

## Package Metadata

```json
{
  "name": "@org/cm-rule-engine",
  "version": "0.0.1",
  "description": "A flexible, type-safe rule engine for data transformation and validation with React and NestJS integrations"
}
```

### Key Features

- **Type-safe**: Full TypeScript support with comprehensive type definitions
- **Framework integrations**: Built-in support for React and NestJS
- **Tree-shakeable**: Optimized for minimal bundle size
- **Platform-aware**: Separate builds for Node.js and browser environments

## Module Resolution

### Main Entry Points

```json
{
  "main": "./dist/node/src/index.node.js",      // CommonJS (Node.js)
  "module": "./dist/browser/src/index.browser.js", // ESM (Browser)
  "browser": "./dist/browser/src/index.browser.js", // Browser-specific
  "types": "./dist/node/src/index.node.d.ts"    // TypeScript definitions
}
```

### Exports Map

The library provides multiple entry points through the `exports` field:

#### 1. Main Export (`.`)

Platform-aware automatic selection:

```typescript
// Automatically uses Node.js or browser version based on environment
import { RuleEngine } from '@org/cm-rule-engine';
```

**Node.js environment:**
- Types: `./node/src/index.node.d.ts`
- Module: `./node/src/index.node.js` (CommonJS)
- Includes: Core + NestJS integration

**Browser environment:**
- Types: `./browser/src/index.browser.d.ts`
- Module: `./browser/src/index.browser.js` (ESM)
- Includes: Core + React integration (namespaced)

#### 2. Framework-Specific Exports

**React Integration (`./react`):**
```typescript
import { useRuleEngine } from '@org/cm-rule-engine/react';
```

- Browser-only (ESM)
- Direct access to React hooks and types
- No need to import from namespaced export

**NestJS Integration (`./nestjs`):**
```typescript
import { RuleEngineModule, RuleEngineService } from '@org/cm-rule-engine/nestjs';
```

- Node.js-only (CommonJS)
- Direct access to NestJS module and service
- Includes dependency injection support

## Dependencies

### Runtime Dependencies

```json
{
  "dependencies": {
    "tslib": "^2.3.0"
  }
}
```

- **tslib**: TypeScript runtime helpers (for compiled output)

### Peer Dependencies

All peer dependencies are **optional**, allowing flexible usage:

```json
{
  "peerDependencies": {
    "@nestjs/common": "^10.0.0 || ^11.0.0",
    "@nestjs/config": "^3.0.0 || ^4.0.0",
    "@nestjs/core": "^10.0.0 || ^11.0.0",
    "reflect-metadata": "^0.1.13 || ^0.2.0",
    "rxjs": "^7.8.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  }
}
```

**For NestJS users:**
- Install: `@nestjs/common`, `@nestjs/core`, `reflect-metadata`, `rxjs`
- Optional: `@nestjs/config` (for async configuration)

**For React users:**
- Install: `react`, `react-dom`

**For core-only users:**
- No additional dependencies required

## Usage Examples

### Core Usage (No Framework)

```typescript
import { RuleEngine, Rule } from '@org/cm-rule-engine';

const engine = new RuleEngine();
const rule: Rule = {
  name: 'validate-age',
  enabled: true,
  validate: (item) => {
    if (item.age < 18) {
      return { field: 'age', message: 'Must be 18 or older' };
    }
  }
};

engine.addRule(rule);
const result = await engine.process([{ age: 16 }]);
```

### React Usage

```typescript
import { useRuleEngine } from '@org/cm-rule-engine/react';

function MyComponent() {
  const { process, addRule, isProcessing, result } = useRuleEngine({
    initialRules: [/* rules */]
  });

  // Use the hook methods
}
```

### NestJS Usage

```typescript
import { Module } from '@nestjs/common';
import { RuleEngineModule } from '@org/cm-rule-engine/nestjs';

@Module({
  imports: [
    RuleEngineModule.forRoot({
      rules: [/* initial rules */]
    })
  ]
})
export class AppModule {}
```

## Module Formats

### CommonJS (Node.js)

- Used for Node.js environments
- Compatible with `require()`
- Includes NestJS integration
- Output: `dist/node/`

### ES Modules (Browser)

- Used for browser environments
- Compatible with `import`
- Includes React integration
- Output: `dist/browser/`
- Tree-shakeable for optimal bundle size

## TypeScript Support

Full TypeScript support with:
- Type definitions (`.d.ts` files)
- Declaration maps (`.d.ts.map` files)
- Source maps (`.js.map` files)

```typescript
// Types are automatically resolved
import type { Rule, RuleExecutionResult } from '@org/cm-rule-engine';
```

## Publishing

### Configuration

```json
{
  "publishConfig": {
    "access": "public"
  }
}
```

### Before Publishing

1. Update version in `package.json`
2. Build the library: `npx nx build cm-rule-engine`
3. Test the build: `npx nx test cm-rule-engine`
4. Verify exports work correctly

### Publishing Command

```bash
cd libs/cm-rule-engine/dist
npm publish
```

## Engine Requirements

```json
{
  "engines": {
    "node": ">=18.0.0"
  }
}
```

The library requires Node.js 18 or higher for:
- Modern JavaScript features (ES2022)
- Native fetch API support
- Performance optimizations

## Side Effects

```json
{
  "sideEffects": false
}
```

The library has no side effects, enabling:
- Better tree-shaking
- Smaller bundle sizes
- Improved build optimization

## Keywords

```json
{
  "keywords": [
    "rule-engine",
    "validation",
    "transformation",
    "react",
    "nestjs",
    "typescript"
  ]
}
```

These keywords help users discover the package on npm.
