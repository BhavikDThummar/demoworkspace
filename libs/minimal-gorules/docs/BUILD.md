# Build Configuration

This document describes the cross-platform build configuration for the minimal-gorules library.

## Build Targets

The library supports multiple build targets for different deployment scenarios:

### Development Builds
- `nx build @org/minimal-gorules` - Builds both Node.js and browser versions
- `nx build-node @org/minimal-gorules` - Node.js only build
- `nx build-browser @org/minimal-gorules` - Browser only build

### Production Builds
- `nx build-prod @org/minimal-gorules` - Optimized production builds for both targets
- `nx build-node-prod @org/minimal-gorules` - Optimized Node.js production build
- `nx build-browser-prod @org/minimal-gorules` - Optimized browser production build

### Bundle Builds (Experimental)
- `nx bundle @org/minimal-gorules` - Webpack bundled builds (Node.js working, browser needs polyfills)
- `nx bundle-node @org/minimal-gorules` - Webpack bundled Node.js build
- `nx bundle-browser @org/minimal-gorules` - Webpack bundled browser build (requires polyfill configuration)

## Output Structure

```
libs/minimal-gorules/dist/
├── node/                    # Node.js build output
│   └── src/
│       ├── index.node.js    # Node.js entry point
│       ├── index.node.d.ts  # TypeScript definitions
│       └── lib/             # Compiled library code
├── browser/                 # Browser build output
│   └── src/
│       ├── index.browser.js # Browser entry point
│       ├── index.browser.d.ts # TypeScript definitions
│       └── lib/             # Compiled library code (React components included)
└── bundle/                  # Webpack bundled outputs (when using bundle targets)
    ├── node/
    └── browser/
```

## Package.json Exports

The library is configured with conditional exports for proper module resolution:

```json
{
  "main": "./dist/node/index.node.js",
  "module": "./dist/browser/index.browser.js",
  "browser": "./dist/browser/index.browser.js",
  "types": "./dist/node/index.node.d.ts",
  "exports": {
    ".": {
      "node": {
        "types": "./dist/node/index.node.d.ts",
        "require": "./dist/node/index.node.js",
        "default": "./dist/node/index.node.js"
      },
      "browser": {
        "types": "./dist/browser/index.browser.d.ts",
        "import": "./dist/browser/index.browser.js",
        "default": "./dist/browser/index.browser.js"
      }
    }
  }
}
```

## TypeScript Configurations

### Node.js Build (tsconfig.lib.json)
- Target: CommonJS modules for Node.js compatibility
- Excludes: React components, browser-specific code
- Includes: NestJS integration, Node.js-specific performance optimizations

### Browser Build (tsconfig.browser.json)
- Target: ES2022 modules for modern browsers
- Includes: React components, JSX support
- Excludes: NestJS integration, Node.js-specific code

## Usage Examples

### Node.js (NestJS)
```typescript
import { MinimalGoRulesEngine, MinimalGoRulesModule } from '@org/minimal-gorules/node';
```

### Browser (React)
```typescript
import { MinimalGoRulesEngine, React } from '@org/minimal-gorules/browser';
```

### Default Import (Node.js)
```typescript
import { MinimalGoRulesEngine } from '@org/minimal-gorules';
```

## Build Features

- **Tree-shaking**: Optimized builds remove unused code
- **Source maps**: Available in development builds
- **Type definitions**: Generated for both Node.js and browser builds
- **Cross-platform**: Separate builds ensure platform-specific optimizations
- **Module resolution**: Proper exports configuration for different environments
