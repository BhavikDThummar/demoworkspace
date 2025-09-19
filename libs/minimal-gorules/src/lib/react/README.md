# React Integration for Minimal GoRules Engine

This module provides React-specific components, hooks, and services for integrating with the Minimal GoRules Engine via API calls to a NestJS backend.

## Features

- **ReactGoRulesService**: HTTP client for calling NestJS backend endpoints
- **React Hooks**: Custom hooks for rule execution, engine status, and metadata management
- **React Components**: Pre-built components for rule execution and engine monitoring
- **TypeScript Support**: Full TypeScript support with proper type definitions

## Installation

```bash
npm install @org/minimal-gorules react react-dom
```

## Quick Start

### 1. Set up the Provider

```tsx
import React from 'react';
import { GoRulesProvider } from '@org/minimal-gorules/React';

const config = {
  apiBaseUrl: 'http://localhost:3000/api',
  apiKey: 'your-api-key', // optional
  timeout: 10000
};

function App() {
  return (
    <GoRulesProvider config={config}>
      {/* Your components here */}
    </GoRulesProvider>
  );
}
```

### 2. Use Components

```tsx
import { RuleExecutor, EngineStatus } from '@org/minimal-gorules/React';

function MyComponent() {
  return (
    <div>
      <EngineStatus refreshInterval={5000} detailed={true} />
      
      <RuleExecutor
        ruleId="my-rule"
        input={{ age: 25, income: 50000 }}
        onSuccess={(results) => console.log('Success:', results)}
        onError={(error) => console.error('Error:', error)}
      />
    </div>
  );
}
```

### 3. Use Hooks

```tsx
import { useRuleExecution, useEngineStatus } from '@org/minimal-gorules/React';

function MyHookComponent() {
  const service = useGoRulesContext();
  const { loading, results, error, executeRule } = useRuleExecution(service);
  const { status } = useEngineStatus(service, 5000);

  const handleExecute = () => {
    executeRule('my-rule', { age: 25, income: 50000 });
  };

  return (
    <div>
      <button onClick={handleExecute} disabled={loading}>
        Execute Rule
      </button>
      {results && <pre>{JSON.stringify(results, null, 2)}</pre>}
      {error && <div>Error: {error}</div>}
    </div>
  );
}
```

## API Reference

### ReactGoRulesService

HTTP client for interacting with the Minimal GoRules Engine API.

#### Methods

- `executeRule(ruleId, input)` - Execute a single rule
- `executeByIds(ruleIds, input, mode)` - Execute multiple rules by IDs
- `executeByTags(tags, input, mode)` - Execute rules by tags
- `getStatus()` - Get engine status
- `getAllRuleMetadata()` - Get all rule metadata
- `refreshCache()` - Refresh the rule cache

### Hooks

#### useRuleExecution(service)

Hook for managing rule execution state.

Returns:
- `loading` - Whether execution is in progress
- `results` - Execution results
- `error` - Any error that occurred
- `executeRule(ruleId, input)` - Execute a single rule
- `executeByIds(ruleIds, input, mode)` - Execute multiple rules
- `executeByTags(tags, input, mode)` - Execute rules by tags

#### useEngineStatus(service, refreshInterval?)

Hook for monitoring engine status.

Returns:
- `loading` - Whether status is being fetched
- `status` - Engine status data
- `error` - Any error that occurred
- `refresh()` - Manually refresh status

#### useRuleMetadata(service, autoLoad?)

Hook for managing rule metadata.

Returns:
- `loading` - Whether metadata is being fetched
- `metadata` - Rule metadata
- `error` - Any error that occurred
- `loadMetadata()` - Load all metadata
- `filterByTags(tags)` - Filter metadata by tags
- `searchRules(query)` - Search rules by ID or tags

### Components

#### RuleExecutor

Component for executing rules with UI feedback.

Props:
- `ruleId?` - Single rule ID to execute
- `ruleIds?` - Multiple rule IDs to execute
- `tags?` - Tags to select rules by
- `mode?` - Execution mode ('parallel', 'sequential', 'mixed')
- `input` - Input data for rule execution
- `autoExecute?` - Whether to execute automatically on mount
- `onSuccess?` - Callback for successful execution
- `onError?` - Callback for execution errors

#### EngineStatus

Component for displaying engine status and health information.

Props:
- `refreshInterval?` - Auto-refresh interval in milliseconds
- `detailed?` - Whether to show detailed information
- `onStatusUpdate?` - Callback when status updates

#### RuleMetadataViewer

Component for viewing and managing rule metadata.

Props:
- `ruleId?` - Specific rule ID to show metadata for
- `showAll?` - Whether to show all rules metadata
- `filterTags?` - Filter rules by tags
- `onRuleSelect?` - Callback when rule is selected

## Examples

See the `examples/` directory for complete working examples:

- `BasicRuleExecutor.tsx` - Simple rule execution
- `AdvancedRuleExecutor.tsx` - Advanced features with multiple modes
- `EngineStatusDashboard.tsx` - Real-time engine monitoring

## Requirements

- React 18+
- NestJS backend with Minimal GoRules Engine
- TypeScript (recommended)

## Backend Setup

Make sure your NestJS backend is configured with the Minimal GoRules Engine and the appropriate API endpoints are available at `/minimal-gorules/*`.

## Error Handling

The React integration includes comprehensive error handling:

- Network errors are caught and displayed
- API errors are properly formatted
- Loading states are managed automatically
- Timeout handling for long-running requests

## Performance

The React integration is optimized for performance:

- Minimal re-renders with proper memoization
- Efficient state management
- Optional auto-refresh with configurable intervals
- Lazy loading of metadata and status information