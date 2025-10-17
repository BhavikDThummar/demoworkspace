# Build Configuration

This document describes the build configuration for the cm-rule-engine library.

## Overview

The library supports two build targets:
- **Node.js**: CommonJS with NestJS integration
- **Browser**: ESM with React integration

## Build Commands

```bash
# Build both Node.js and browser versions
npx nx build cm-rule-engine

# Build only Node.js version
npx nx build-node cm-rule-engine

# Build only browser version
npx nx build-browser cm-rule-engine
```

## TypeScript Configuration

### Node.js Build (`tsconfig.lib.json`)

- **Output**: `dist/node/`
- **Module**: CommonJS
- **Target**: ES2022
- **Entry Point**: `src/index.node.ts`
- **Includes**: Core + NestJS integration
- **Excludes**: React files, browser entry point

Key features:
- Experimental decorators enabled for NestJS
- Decorator metadata emission for dependency injection
- Node.js type definitions

### Browser Build (`tsconfig.browser.json`)

- **Output**: `dist/browser/`
- **Module**: ES2022 (ESM)
- **Target**: ES2022
- **Entry Point**: `src/index.browser.ts`
- **Includes**: Core + React integration
- **Excludes**: NestJS files, node entry point

Key features:
- DOM and WebWorker APIs available
- JSX support with React 18+ automatic runtime
- Browser-optimized output

## TypeScript Compilation

The library uses pure TypeScript compilation (no webpack bundling) for optimal tree-shaking and compatibility:

### Compilation Features
- Separate Node.js (CommonJS) and browser (ESM) builds
- Full type definitions with declaration maps
- Source maps for debugging
- Optimized for modern JavaScript (ES2022)

## Output Structure

```
dist/
├── node/                    # Node.js build
│   └── src/
│       ├── index.node.js    # Main entry point
│       ├── index.node.d.ts  # Type definitions
│       └── lib/
│           ├── core/        # Core engine
│           └── nestjs/      # NestJS integration
├── browser/                 # Browser build
│   └── src/
│       ├── index.browser.js # Main entry point
│       ├── index.browser.d.ts
│       └── lib/
│           ├── core/        # Core engine
│           └── react/       # React integration
└── package.json             # Fixed paths for distribution
```

## Package Exports

The library provides multiple entry points:

```json
{
  ".": "Main entry (platform-aware)",
  "./node": "Node.js specific",
  "./browser": "Browser specific",
  "./react": "React integration only",
  "./nestjs": "NestJS integration only"
}
```

## Development

### Testing

```bash
# Run tests
npx nx test cm-rule-engine

# Watch mode
npx nx test:watch cm-rule-engine
```

### Linting

```bash
npx nx lint cm-rule-engine
```

## Build Process

1. **TypeScript Compilation**
   - Node.js build compiles with CommonJS modules
   - Browser build compiles with ESM modules
   - Both generate type definitions and source maps

2. **Asset Copying**
   - README.md and package.json copied to dist folders

3. **Package.json Fixing**
   - Script adjusts paths for distribution
   - Updates React and NestJS export paths

4. **Output**
   - Separate Node.js and browser builds
   - Type definitions for TypeScript consumers
   - Source maps for debugging

## Performance Considerations

- **Tree-shaking**: Enabled for minimal bundle size
- **Side effects**: Marked as false for better optimization
- **Module concatenation**: Reduces bundle size
- **Externals**: Framework dependencies not bundled
- **Target ES2022**: Modern JavaScript for better performance
