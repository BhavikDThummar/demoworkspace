# React Integration Examples

This directory contains example React components and applications demonstrating how to use the Minimal GoRules Engine React integration.

## Examples Included

1. **BasicRuleExecutor** - Simple rule execution with UI feedback
2. **AdvancedRuleExecutor** - Advanced rule execution with multiple modes and error handling
3. **EngineStatusDashboard** - Real-time engine status monitoring
4. **RuleMetadataBrowser** - Browse and search rule metadata
5. **CompleteApp** - Full application example with all features

## Usage

These examples assume you have:

1. A NestJS backend running with the Minimal GoRules Engine
2. The backend API accessible at the configured URL
3. React application set up with the necessary dependencies

## Installation

```bash
npm install @org/minimal-gorules react react-dom
```

## Basic Setup

```tsx
import React from 'react';
import { GoRulesProvider } from '@org/minimal-gorules';

const config = {
  apiBaseUrl: 'http://localhost:3000/api',
  apiKey: 'your-api-key', // optional
  timeout: 10000,
};

function App() {
  return <GoRulesProvider config={config}>{/* Your components here */}</GoRulesProvider>;
}
```

## Running Examples

Each example can be copied into your React application and used directly. Make sure to wrap your app with the `GoRulesProvider` as shown above.
