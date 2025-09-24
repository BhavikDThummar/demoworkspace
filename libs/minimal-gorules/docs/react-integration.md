# React Integration Guide

Complete guide for integrating the Minimal GoRules Engine with React applications.

## Table of Contents

- [Installation](#installation)
- [Integration Approaches](#integration-approaches)
- [API-Based Integration](#api-based-integration)
- [React Service](#react-service)
- [React Hooks](#react-hooks)
- [React Components](#react-components)
- [Advanced Patterns](#advanced-patterns)
- [Performance Optimization](#performance-optimization)
- [Testing](#testing)

## Installation

```bash
npm install @your-org/minimal-gorules
```

## Integration Approaches

The Minimal GoRules Engine supports two integration approaches for React applications:

### 1. API-Based Integration (Recommended)

- React app calls NestJS backend endpoints
- Backend runs the GoRules engine
- Better security (API keys not exposed)
- Better performance (server-side caching)
- Easier deployment and updates

### 2. Direct Client-Side Integration (Future)

- React app runs GoRules engine directly in browser
- Requires WebAssembly compilation
- Good for offline scenarios
- Currently not implemented

This guide focuses on the **API-based integration** approach.

## API-Based Integration

### Backend Setup

First, set up your NestJS backend with GoRules endpoints (see [NestJS Integration Guide](./nestjs-integration.md)):

```typescript
// Backend: src/gorules/gorules.controller.ts
@Controller('api/rules')
export class GoRulesController {
  @Post('execute/:ruleId')
  async executeRule(@Param('ruleId') ruleId: string, @Body() dto: ExecuteRuleDto) {
    // Implementation from NestJS guide
  }

  @Post('execute/batch')
  async executeRules(@Body() dto: ExecuteRulesDto) {
    // Implementation from NestJS guide
  }

  @Post('execute/tags')
  async executeByTags(@Body() dto: ExecuteByTagsDto) {
    // Implementation from NestJS guide
  }

  @Get('status')
  async getStatus() {
    // Implementation from NestJS guide
  }
}
```

### Hybrid Rule Loading for React Applications

The Minimal GoRules Engine supports hybrid rule loading, allowing your NestJS backend to load rules from either GoRules Cloud API or local file system. This provides flexibility for different deployment scenarios:

#### Cloud Rules (Production)

```typescript
// Backend: app.module.ts - Production configuration
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.production'],
    }),
    MinimalGoRulesModule.forRootWithConfig({
      autoInitialize: true,
    }),
  ],
})
export class AppModule {}
```

```bash
# .env.production
GORULES_RULE_SOURCE=cloud
GORULES_API_URL=https://api.gorules.io
GORULES_API_KEY=your-production-api-key
GORULES_PROJECT_ID=your-project-id
```

#### Local Rules (Development/Testing)

```typescript
// Backend: app.module.ts - Development configuration
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.development'],
    }),
    MinimalGoRulesModule.forRootWithConfig({
      autoInitialize: true,
    }),
  ],
})
export class AppModule {}
```

```bash
# .env.development
GORULES_RULE_SOURCE=local
GORULES_LOCAL_RULES_PATH=./rules
GORULES_ENABLE_HOT_RELOAD=true
GORULES_METADATA_FILE_PATTERN=*.meta.json
```

#### Local Rule Directory Structure

```
backend/
├── rules/
│   ├── pricing/
│   │   ├── shipping-fees.json
│   │   ├── shipping-fees.meta.json
│   │   ├── discount-rules.json
│   │   └── discount-rules.meta.json
│   ├── validation/
│   │   ├── order-validation.json
│   │   └── customer-validation.json
│   └── approval/
│       ├── workflow-rules.json
│       └── workflow-rules.meta.json
├── src/
└── package.json
```

#### Environment-Specific Configuration

```typescript
// Backend: src/config/gorules.config.ts
export const getGoRulesConfig = () => {
  const environment = process.env.NODE_ENV || 'development';

  if (environment === 'production') {
    return {
      ruleSource: 'cloud' as const,
      apiUrl: process.env.GORULES_API_URL,
      apiKey: process.env.GORULES_API_KEY,
      projectId: process.env.GORULES_PROJECT_ID,
    };
  }

  return {
    ruleSource: 'local' as const,
    localRulesPath: process.env.GORULES_LOCAL_RULES_PATH || './rules',
    enableHotReload: process.env.GORULES_ENABLE_HOT_RELOAD === 'true',
    metadataFilePattern: process.env.GORULES_METADATA_FILE_PATTERN || '*.meta.json',
  };
};

// Usage in module
@Module({
  imports: [
    MinimalGoRulesModule.forRoot({
      config: getGoRulesConfig(),
      autoInitialize: true,
    }),
  ],
})
export class AppModule {}
```

### Frontend Setup

Install the React integration:

```bash
npm install @your-org/minimal-gorules
```

### Alternative: Bundling Local Rules in React (Advanced)

For scenarios where you need to bundle rules directly in your React application (e.g., offline-first applications), you can include rule files in your build process:

#### Webpack Configuration

```javascript
// webpack.config.js or craco.config.js
const path = require('path');

module.exports = {
  // ... other config
  resolve: {
    alias: {
      '@rules': path.resolve(__dirname, 'src/rules'),
    },
  },
  module: {
    rules: [
      {
        test: /\.rule\.json$/,
        type: 'json',
      },
    ],
  },
};
```

#### Rule Files in React Project

```
src/
├── rules/
│   ├── pricing/
│   │   ├── shipping-fees.rule.json
│   │   └── discount-rules.rule.json
│   ├── validation/
│   │   └── order-validation.rule.json
│   └── index.ts
├── services/
│   └── localRulesService.ts
└── components/
```

#### Local Rules Service for React

```typescript
// src/services/localRulesService.ts
import shippingFeesRule from '@rules/pricing/shipping-fees.rule.json';
import discountRulesRule from '@rules/pricing/discount-rules.rule.json';
import orderValidationRule from '@rules/validation/order-validation.rule.json';

interface LocalRule {
  id: string;
  data: any;
  metadata: {
    version: string;
    tags: string[];
    lastModified: string;
  };
}

class LocalRulesService {
  private rules: Map<string, LocalRule> = new Map();

  constructor() {
    this.loadRules();
  }

  private loadRules() {
    // Load bundled rules
    this.rules.set('pricing/shipping-fees', {
      id: 'pricing/shipping-fees',
      data: shippingFeesRule,
      metadata: {
        version: '1.0.0',
        tags: ['pricing', 'shipping'],
        lastModified: new Date().toISOString(),
      },
    });

    this.rules.set('pricing/discount-rules', {
      id: 'pricing/discount-rules',
      data: discountRulesRule,
      metadata: {
        version: '1.0.0',
        tags: ['pricing', 'discount'],
        lastModified: new Date().toISOString(),
      },
    });

    this.rules.set('validation/order-validation', {
      id: 'validation/order-validation',
      data: orderValidationRule,
      metadata: {
        version: '1.0.0',
        tags: ['validation', 'order'],
        lastModified: new Date().toISOString(),
      },
    });
  }

  async executeRule<T = unknown>(ruleId: string, input: Record<string, unknown>): Promise<T> {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      throw new Error(`Rule not found: ${ruleId}`);
    }

    // Execute rule using a lightweight rule engine
    // This is a simplified example - you'd need a proper rule execution engine
    return this.executeRuleData(rule.data, input) as T;
  }

  private executeRuleData(ruleData: any, input: Record<string, unknown>): any {
    // Simplified rule execution logic
    // In a real implementation, you'd use a proper rule engine
    console.log('Executing rule with input:', input);
    return { result: 'executed', input, rule: ruleData };
  }

  getRuleMetadata(ruleId: string) {
    const rule = this.rules.get(ruleId);
    return rule ? rule.metadata : null;
  }

  getAllRuleMetadata() {
    const metadata = new Map();
    this.rules.forEach((rule, id) => {
      metadata.set(id, rule.metadata);
    });
    return metadata;
  }
}

export const localRulesService = new LocalRulesService();
```

#### React Hook for Local Rules

```typescript
// src/hooks/useLocalRules.ts
import { useState, useCallback } from 'react';
import { localRulesService } from '../services/localRulesService';

export function useLocalRules() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeRule = useCallback(
    async <T = unknown>(ruleId: string, input: Record<string, unknown>): Promise<T | null> => {
      setLoading(true);
      setError(null);

      try {
        const result = await localRulesService.executeRule<T>(ruleId, input);
        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const getRuleMetadata = useCallback((ruleId: string) => {
    return localRulesService.getRuleMetadata(ruleId);
  }, []);

  const getAllRuleMetadata = useCallback(() => {
    return localRulesService.getAllRuleMetadata();
  }, []);

  return {
    executeRule,
    getRuleMetadata,
    getAllRuleMetadata,
    loading,
    error,
  };
}
```

**Note:** This approach requires implementing a client-side rule execution engine, which is complex. The API-based approach with hybrid backend loading is recommended for most use cases.

## React Service

### Basic React Service

```typescript
// src/services/goRulesService.ts
import { React } from '@your-org/minimal-gorules';

export class GoRulesApiService extends React.ReactGoRulesService {
  constructor() {
    super({
      baseUrl: process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        // Add authentication headers if needed
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });
  }

  // Override for custom error handling
  protected handleError(error: any): never {
    if (error.response?.status === 401) {
      // Handle authentication errors
      window.location.href = '/login';
    }

    console.error('GoRules API Error:', error);
    throw new Error(error.response?.data?.message || error.message || 'Unknown API error');
  }
}

// Create singleton instance
export const goRulesService = new GoRulesApiService();
```

### Service with Retry Logic

```typescript
// src/services/goRulesServiceWithRetry.ts
import { React } from '@your-org/minimal-gorules';

export class GoRulesServiceWithRetry extends React.ReactGoRulesService {
  private maxRetries = 3;
  private retryDelay = 1000;

  async executeRule<T = unknown>(ruleId: string, input: Record<string, unknown>): Promise<T> {
    return this.withRetry(() => super.executeRule<T>(ruleId, input));
  }

  async executeRules<T = unknown>(
    ruleIds: string[],
    input: Record<string, unknown>,
  ): Promise<React.MinimalExecutionResult<T>> {
    return this.withRetry(() => super.executeRules<T>(ruleIds, input));
  }

  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt === this.maxRetries) {
          break;
        }

        // Only retry on network errors, not business logic errors
        if (this.shouldRetry(error)) {
          await this.delay(this.retryDelay * attempt);
          continue;
        }

        throw error;
      }
    }

    throw lastError!;
  }

  private shouldRetry(error: any): boolean {
    // Retry on network errors, timeouts, and 5xx server errors
    return (
      !error.response ||
      error.code === 'NETWORK_ERROR' ||
      error.code === 'TIMEOUT' ||
      (error.response.status >= 500 && error.response.status < 600)
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
```

## React Hooks

### useRuleExecution Hook

```typescript
// src/hooks/useRuleExecution.ts
import { useState, useCallback } from 'react';
import { React } from '@your-org/minimal-gorules';
import { goRulesService } from '../services/goRulesService';

export function useRuleExecution() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<any>(null);

  const executeRule = useCallback(
    async <T = unknown>(ruleId: string, input: Record<string, unknown>): Promise<T | null> => {
      setLoading(true);
      setError(null);

      try {
        const result = await goRulesService.executeRule<T>(ruleId, input);
        setLastResult(result);
        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const executeRules = useCallback(
    async <T = unknown>(
      ruleIds: string[],
      input: Record<string, unknown>,
    ): Promise<React.MinimalExecutionResult<T> | null> => {
      setLoading(true);
      setError(null);

      try {
        const result = await goRulesService.executeRules<T>(ruleIds, input);
        setLastResult(result);
        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const executeByTags = useCallback(
    async <T = unknown>(
      tags: string[],
      input: Record<string, unknown>,
      mode: 'parallel' | 'sequential' = 'parallel',
    ): Promise<React.MinimalExecutionResult<T> | null> => {
      setLoading(true);
      setError(null);

      try {
        const result = await goRulesService.executeByTags<T>(tags, input, mode);
        setLastResult(result);
        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    executeRule,
    executeRules,
    executeByTags,
    loading,
    error,
    lastResult,
    clearError,
  };
}
```

### useEngineStatus Hook

```typescript
// src/hooks/useEngineStatus.ts
import { useState, useEffect, useCallback } from 'react';
import { React } from '@your-org/minimal-gorules';
import { goRulesService } from '../services/goRulesService';

export function useEngineStatus(refreshInterval?: number) {
  const [status, setStatus] = useState<React.EngineStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      setError(null);
      const engineStatus = await goRulesService.getStatus();
      setStatus(engineStatus);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch status';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(() => {
    setLoading(true);
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (refreshInterval && refreshInterval > 0) {
      const interval = setInterval(fetchStatus, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, fetchStatus]);

  return {
    status,
    loading,
    error,
    refresh,
  };
}
```

### useRuleMetadata Hook

```typescript
// src/hooks/useRuleMetadata.ts
import { useState, useEffect, useCallback } from 'react';
import { React } from '@your-org/minimal-gorules';
import { goRulesService } from '../services/goRulesService';

export function useRuleMetadata(ruleId?: string) {
  const [metadata, setMetadata] = useState<React.MinimalRuleMetadata | null>(null);
  const [allMetadata, setAllMetadata] = useState<Map<string, React.MinimalRuleMetadata> | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMetadata = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const meta = await goRulesService.getRuleMetadata(id);
      setMetadata(meta);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch metadata';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAllMetadata = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const allMeta = await goRulesService.getAllRuleMetadata();
      setAllMetadata(allMeta);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch all metadata';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(() => {
    if (ruleId) {
      fetchMetadata(ruleId);
    } else {
      fetchAllMetadata();
    }
  }, [ruleId, fetchMetadata, fetchAllMetadata]);

  useEffect(() => {
    if (ruleId) {
      fetchMetadata(ruleId);
    }
  }, [ruleId, fetchMetadata]);

  return {
    metadata,
    allMetadata,
    loading,
    error,
    refresh,
    fetchMetadata,
    fetchAllMetadata,
  };
}
```

## React Components

### Basic Rule Executor Component

```typescript
// src/components/RuleExecutor.tsx
import React, { useState } from 'react';
import { useRuleExecution } from '../hooks/useRuleExecution';

interface RuleExecutorProps {
  ruleId: string;
  initialInput?: Record<string, unknown>;
  onResult?: (result: any) => void;
  onError?: (error: string) => void;
}

export const RuleExecutor: React.FC<RuleExecutorProps> = ({
  ruleId,
  initialInput = {},
  onResult,
  onError,
}) => {
  const [input, setInput] = useState(JSON.stringify(initialInput, null, 2));
  const [result, setResult] = useState<any>(null);
  const { executeRule, loading, error } = useRuleExecution();

  const handleExecute = async () => {
    try {
      const parsedInput = JSON.parse(input);
      const executionResult = await executeRule(ruleId, parsedInput);

      if (executionResult) {
        setResult(executionResult);
        onResult?.(executionResult);
      }
    } catch (parseError) {
      const errorMsg = 'Invalid JSON input';
      onError?.(errorMsg);
    }
  };

  React.useEffect(() => {
    if (error) {
      onError?.(error);
    }
  }, [error, onError]);

  return (
    <div className="rule-executor">
      <h3>Execute Rule: {ruleId}</h3>

      <div className="input-section">
        <label htmlFor="input">Input Data (JSON):</label>
        <textarea
          id="input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={6}
          cols={50}
          placeholder="Enter JSON input data..."
        />
      </div>

      <button onClick={handleExecute} disabled={loading} className="execute-button">
        {loading ? 'Executing...' : 'Execute Rule'}
      </button>

      {error && (
        <div className="error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && (
        <div className="result">
          <h4>Result:</h4>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};
```

### Advanced Rule Executor with Multiple Modes

```typescript
// src/components/AdvancedRuleExecutor.tsx
import React, { useState } from 'react';
import { useRuleExecution } from '../hooks/useRuleExecution';
import { React as GoRulesReact } from '@your-org/minimal-gorules';

interface AdvancedRuleExecutorProps {
  onResult?: (result: any) => void;
  onError?: (error: string) => void;
}

type ExecutionMode = 'single' | 'multiple' | 'tags';

export const AdvancedRuleExecutor: React.FC<AdvancedRuleExecutorProps> = ({
  onResult,
  onError,
}) => {
  const [mode, setMode] = useState<ExecutionMode>('single');
  const [ruleId, setRuleId] = useState('');
  const [ruleIds, setRuleIds] = useState('');
  const [tags, setTags] = useState('');
  const [input, setInput] = useState('{}');
  const [executionMode, setExecutionMode] = useState<'parallel' | 'sequential'>('parallel');
  const [result, setResult] = useState<any>(null);

  const { executeRule, executeRules, executeByTags, loading, error } = useRuleExecution();

  const handleExecute = async () => {
    try {
      const parsedInput = JSON.parse(input);
      let executionResult: any = null;

      switch (mode) {
        case 'single':
          if (!ruleId.trim()) {
            onError?.('Rule ID is required');
            return;
          }
          executionResult = await executeRule(ruleId.trim(), parsedInput);
          break;

        case 'multiple':
          const ruleIdArray = ruleIds
            .split(',')
            .map((id) => id.trim())
            .filter(Boolean);
          if (ruleIdArray.length === 0) {
            onError?.('At least one rule ID is required');
            return;
          }
          executionResult = await executeRules(ruleIdArray, parsedInput);
          break;

        case 'tags':
          const tagArray = tags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean);
          if (tagArray.length === 0) {
            onError?.('At least one tag is required');
            return;
          }
          executionResult = await executeByTags(tagArray, parsedInput, executionMode);
          break;
      }

      if (executionResult) {
        setResult(executionResult);
        onResult?.(executionResult);
      }
    } catch (parseError) {
      onError?.('Invalid JSON input');
    }
  };

  React.useEffect(() => {
    if (error) {
      onError?.(error);
    }
  }, [error, onError]);

  return (
    <div className="advanced-rule-executor">
      <h3>Advanced Rule Executor</h3>

      {/* Execution Mode Selection */}
      <div className="mode-selection">
        <label>Execution Mode:</label>
        <select value={mode} onChange={(e) => setMode(e.target.value as ExecutionMode)}>
          <option value="single">Single Rule</option>
          <option value="multiple">Multiple Rules</option>
          <option value="tags">Rules by Tags</option>
        </select>
      </div>

      {/* Rule Configuration */}
      <div className="rule-config">
        {mode === 'single' && (
          <div>
            <label htmlFor="ruleId">Rule ID:</label>
            <input
              id="ruleId"
              type="text"
              value={ruleId}
              onChange={(e) => setRuleId(e.target.value)}
              placeholder="Enter rule ID..."
            />
          </div>
        )}

        {mode === 'multiple' && (
          <div>
            <label htmlFor="ruleIds">Rule IDs (comma-separated):</label>
            <input
              id="ruleIds"
              type="text"
              value={ruleIds}
              onChange={(e) => setRuleIds(e.target.value)}
              placeholder="rule1, rule2, rule3..."
            />
          </div>
        )}

        {mode === 'tags' && (
          <>
            <div>
              <label htmlFor="tags">Tags (comma-separated):</label>
              <input
                id="tags"
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="tag1, tag2, tag3..."
              />
            </div>
            <div>
              <label>Tag Execution Mode:</label>
              <select
                value={executionMode}
                onChange={(e) => setExecutionMode(e.target.value as 'parallel' | 'sequential')}
              >
                <option value="parallel">Parallel</option>
                <option value="sequential">Sequential</option>
              </select>
            </div>
          </>
        )}
      </div>

      {/* Input Data */}
      <div className="input-section">
        <label htmlFor="input">Input Data (JSON):</label>
        <textarea
          id="input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={6}
          cols={50}
          placeholder="Enter JSON input data..."
        />
      </div>

      {/* Execute Button */}
      <button onClick={handleExecute} disabled={loading} className="execute-button">
        {loading ? 'Executing...' : 'Execute'}
      </button>

      {/* Error Display */}
      {error && (
        <div className="error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Result Display */}
      {result && (
        <div className="result">
          <h4>Result:</h4>
          {mode === 'single' ? (
            <pre>{JSON.stringify(result, null, 2)}</pre>
          ) : (
            <div>
              <p>
                <strong>Execution Time:</strong> {result.executionTime}ms
              </p>
              <h5>Results:</h5>
              <pre>{JSON.stringify(Object.fromEntries(result.results), null, 2)}</pre>
              {result.errors && result.errors.size > 0 && (
                <>
                  <h5>Errors:</h5>
                  <pre>{JSON.stringify(Object.fromEntries(result.errors), null, 2)}</pre>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
```

### Engine Status Dashboard

```typescript
// src/components/EngineStatusDashboard.tsx
import React from 'react';
import { useEngineStatus } from '../hooks/useEngineStatus';

interface EngineStatusDashboardProps {
  refreshInterval?: number;
}

export const EngineStatusDashboard: React.FC<EngineStatusDashboardProps> = ({
  refreshInterval = 30000, // 30 seconds
}) => {
  const { status, loading, error, refresh } = useEngineStatus(refreshInterval);

  if (loading && !status) {
    return <div className="loading">Loading engine status...</div>;
  }

  if (error) {
    return (
      <div className="error">
        <p>Failed to load engine status: {error}</p>
        <button onClick={refresh}>Retry</button>
      </div>
    );
  }

  if (!status) {
    return <div>No status available</div>;
  }

  return (
    <div className="engine-status-dashboard">
      <div className="header">
        <h3>GoRules Engine Status</h3>
        <button onClick={refresh} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="status-grid">
        <div className="status-item">
          <label>Status:</label>
          <span className={`status ${status.initialized ? 'online' : 'offline'}`}>
            {status.initialized ? 'Online' : 'Offline'}
          </span>
        </div>

        <div className="status-item">
          <label>Rules Loaded:</label>
          <span>{status.rulesLoaded}</span>
        </div>

        <div className="status-item">
          <label>Project ID:</label>
          <span>{status.projectId}</span>
        </div>

        <div className="status-item">
          <label>Version:</label>
          <span>{status.version}</span>
        </div>

        <div className="status-item">
          <label>Last Update:</label>
          <span>{new Date(status.lastUpdate).toLocaleString()}</span>
        </div>

        {status.performance && (
          <>
            <div className="status-item">
              <label>Memory Usage:</label>
              <span>{status.performance.memoryUsage.toFixed(2)} MB</span>
            </div>

            {status.performance.cacheHitRate !== undefined && (
              <div className="status-item">
                <label>Cache Hit Rate:</label>
                <span>{(status.performance.cacheHitRate * 100).toFixed(1)}%</span>
              </div>
            )}

            {status.performance.averageExecutionTime !== undefined && (
              <div className="status-item">
                <label>Avg Execution Time:</label>
                <span>{status.performance.averageExecutionTime.toFixed(2)} ms</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
```

### Rule Metadata Viewer

```typescript
// src/components/RuleMetadataViewer.tsx
import React, { useState } from 'react';
import { useRuleMetadata } from '../hooks/useRuleMetadata';

interface RuleMetadataViewerProps {
  initialRuleId?: string;
}

export const RuleMetadataViewer: React.FC<RuleMetadataViewerProps> = ({ initialRuleId = '' }) => {
  const [ruleId, setRuleId] = useState(initialRuleId);
  const [viewMode, setViewMode] = useState<'single' | 'all'>('single');

  const { metadata, allMetadata, loading, error, fetchMetadata, fetchAllMetadata } =
    useRuleMetadata(viewMode === 'single' ? ruleId : undefined);

  const handleFetchSingle = () => {
    if (ruleId.trim()) {
      fetchMetadata(ruleId.trim());
    }
  };

  const handleFetchAll = () => {
    fetchAllMetadata();
  };

  React.useEffect(() => {
    if (viewMode === 'all') {
      fetchAllMetadata();
    }
  }, [viewMode, fetchAllMetadata]);

  return (
    <div className="rule-metadata-viewer">
      <h3>Rule Metadata Viewer</h3>

      {/* View Mode Selection */}
      <div className="view-mode">
        <label>View Mode:</label>
        <select value={viewMode} onChange={(e) => setViewMode(e.target.value as 'single' | 'all')}>
          <option value="single">Single Rule</option>
          <option value="all">All Rules</option>
        </select>
      </div>

      {/* Single Rule Mode */}
      {viewMode === 'single' && (
        <div className="single-rule-section">
          <div className="input-group">
            <input
              type="text"
              value={ruleId}
              onChange={(e) => setRuleId(e.target.value)}
              placeholder="Enter rule ID..."
            />
            <button onClick={handleFetchSingle} disabled={loading || !ruleId.trim()}>
              {loading ? 'Loading...' : 'Fetch Metadata'}
            </button>
          </div>

          {error && <div className="error">Error: {error}</div>}

          {metadata && (
            <div className="metadata-display">
              <h4>Rule: {metadata.id}</h4>
              <div className="metadata-item">
                <strong>Version:</strong> {metadata.version}
              </div>
              <div className="metadata-item">
                <strong>Tags:</strong> {metadata.tags.join(', ') || 'None'}
              </div>
              <div className="metadata-item">
                <strong>Last Modified:</strong> {new Date(metadata.lastModified).toLocaleString()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* All Rules Mode */}
      {viewMode === 'all' && (
        <div className="all-rules-section">
          <button onClick={handleFetchAll} disabled={loading}>
            {loading ? 'Loading...' : 'Fetch All Metadata'}
          </button>

          {error && <div className="error">Error: {error}</div>}

          {allMetadata && (
            <div className="all-metadata-display">
              <h4>All Rules ({allMetadata.size} total)</h4>
              <div className="metadata-table">
                <table>
                  <thead>
                    <tr>
                      <th>Rule ID</th>
                      <th>Version</th>
                      <th>Tags</th>
                      <th>Last Modified</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(allMetadata.entries()).map(([id, meta]) => (
                      <tr key={id}>
                        <td>{id}</td>
                        <td>{meta.version}</td>
                        <td>{meta.tags.join(', ') || 'None'}</td>
                        <td>{new Date(meta.lastModified).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
```

## Advanced Patterns

### Context Provider for Global State

```typescript
// src/contexts/GoRulesContext.tsx
import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { React as GoRulesReact } from '@your-org/minimal-gorules';

interface GoRulesState {
  status: GoRulesReact.EngineStatus | null;
  lastExecutionResult: any;
  executionHistory: Array<{
    id: string;
    ruleId: string;
    input: Record<string, unknown>;
    result: any;
    timestamp: number;
    executionTime?: number;
  }>;
  error: string | null;
}

type GoRulesAction =
  | { type: 'SET_STATUS'; payload: GoRulesReact.EngineStatus }
  | { type: 'SET_EXECUTION_RESULT'; payload: any }
  | { type: 'ADD_EXECUTION_HISTORY'; payload: any }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_HISTORY' };

const initialState: GoRulesState = {
  status: null,
  lastExecutionResult: null,
  executionHistory: [],
  error: null,
};

function goRulesReducer(state: GoRulesState, action: GoRulesAction): GoRulesState {
  switch (action.type) {
    case 'SET_STATUS':
      return { ...state, status: action.payload };
    case 'SET_EXECUTION_RESULT':
      return { ...state, lastExecutionResult: action.payload };
    case 'ADD_EXECUTION_HISTORY':
      return {
        ...state,
        executionHistory: [action.payload, ...state.executionHistory.slice(0, 49)], // Keep last 50
      };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'CLEAR_HISTORY':
      return { ...state, executionHistory: [] };
    default:
      return state;
  }
}

const GoRulesContext = createContext<{
  state: GoRulesState;
  dispatch: React.Dispatch<GoRulesAction>;
} | null>(null);

export const GoRulesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(goRulesReducer, initialState);

  return <GoRulesContext.Provider value={{ state, dispatch }}>{children}</GoRulesContext.Provider>;
};

export const useGoRulesContext = () => {
  const context = useContext(GoRulesContext);
  if (!context) {
    throw new Error('useGoRulesContext must be used within a GoRulesProvider');
  }
  return context;
};
```

### Custom Hook with Context Integration

```typescript
// src/hooks/useGoRulesWithContext.ts
import { useCallback } from 'react';
import { useGoRulesContext } from '../contexts/GoRulesContext';
import { useRuleExecution } from './useRuleExecution';
import { goRulesService } from '../services/goRulesService';

export function useGoRulesWithContext() {
  const { state, dispatch } = useGoRulesContext();
  const { executeRule: baseExecuteRule, loading, error } = useRuleExecution();

  const executeRule = useCallback(
    async <T = unknown>(ruleId: string, input: Record<string, unknown>): Promise<T | null> => {
      const startTime = Date.now();
      const result = await baseExecuteRule<T>(ruleId, input);

      if (result) {
        dispatch({ type: 'SET_EXECUTION_RESULT', payload: result });
        dispatch({
          type: 'ADD_EXECUTION_HISTORY',
          payload: {
            id: `${ruleId}-${startTime}`,
            ruleId,
            input,
            result,
            timestamp: startTime,
            executionTime: Date.now() - startTime,
          },
        });
      }

      return result;
    },
    [baseExecuteRule, dispatch],
  );

  const refreshStatus = useCallback(async () => {
    try {
      const status = await goRulesService.getStatus();
      dispatch({ type: 'SET_STATUS', payload: status });
    } catch (err) {
      dispatch({
        type: 'SET_ERROR',
        payload: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }, [dispatch]);

  const clearHistory = useCallback(() => {
    dispatch({ type: 'CLEAR_HISTORY' });
  }, [dispatch]);

  return {
    ...state,
    executeRule,
    refreshStatus,
    clearHistory,
    loading,
    error,
  };
}
```

### Form Integration with Validation

```typescript
// src/components/RuleBasedForm.tsx
import React, { useState, useEffect } from 'react';
import { useRuleExecution } from '../hooks/useRuleExecution';

interface FormData {
  [key: string]: any;
}

interface ValidationRule {
  ruleId: string;
  field: string;
  errorMessage?: string;
}

interface RuleBasedFormProps {
  validationRules: ValidationRule[];
  onSubmit: (data: FormData) => void;
  children: React.ReactNode;
}

export const RuleBasedForm: React.FC<RuleBasedFormProps> = ({
  validationRules,
  onSubmit,
  children,
}) => {
  const [formData, setFormData] = useState<FormData>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isValidating, setIsValidating] = useState(false);
  const { executeRule } = useRuleExecution();

  const validateField = async (field: string, value: any) => {
    const rule = validationRules.find((r) => r.field === field);
    if (!rule) return;

    setIsValidating(true);
    try {
      const result = await executeRule(rule.ruleId, { [field]: value, ...formData });

      if (result && !result.valid) {
        setValidationErrors((prev) => ({
          ...prev,
          [field]: rule.errorMessage || result.message || 'Validation failed',
        }));
      } else {
        setValidationErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    } catch (error) {
      setValidationErrors((prev) => ({
        ...prev,
        [field]: 'Validation error occurred',
      }));
    } finally {
      setIsValidating(false);
    }
  };

  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Debounced validation
    const timeoutId = setTimeout(() => {
      validateField(field, value);
    }, 500);

    return () => clearTimeout(timeoutId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields before submit
    setIsValidating(true);
    const validationPromises = validationRules.map((rule) =>
      validateField(rule.field, formData[rule.field]),
    );

    await Promise.all(validationPromises);
    setIsValidating(false);

    if (Object.keys(validationErrors).length === 0) {
      onSubmit(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rule-based-form">
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child) && child.props.name) {
          const fieldName = child.props.name;
          return React.cloneElement(child, {
            value: formData[fieldName] || '',
            onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
              handleFieldChange(fieldName, e.target.value);
            },
            error: validationErrors[fieldName],
            ...child.props,
          });
        }
        return child;
      })}

      <button type="submit" disabled={isValidating || Object.keys(validationErrors).length > 0}>
        {isValidating ? 'Validating...' : 'Submit'}
      </button>
    </form>
  );
};
```

## Performance Optimization

### Memoization and Caching

```typescript
// src/hooks/useRuleExecutionWithCache.ts
import { useState, useCallback, useMemo } from 'react';
import { useRuleExecution } from './useRuleExecution';

interface CacheEntry<T> {
  result: T;
  timestamp: number;
  ttl: number;
}

export function useRuleExecutionWithCache(defaultTtl: number = 300000) {
  // 5 minutes
  const [cache, setCache] = useState<Map<string, CacheEntry<any>>>(new Map());
  const { executeRule: baseExecuteRule, loading, error } = useRuleExecution();

  const createCacheKey = useCallback((ruleId: string, input: Record<string, unknown>): string => {
    return `${ruleId}:${JSON.stringify(input)}`;
  }, []);

  const isExpired = useCallback((entry: CacheEntry<any>): boolean => {
    return Date.now() - entry.timestamp > entry.ttl;
  }, []);

  const executeRule = useCallback(
    async <T = unknown>(
      ruleId: string,
      input: Record<string, unknown>,
      ttl: number = defaultTtl,
    ): Promise<T | null> => {
      const cacheKey = createCacheKey(ruleId, input);
      const cachedEntry = cache.get(cacheKey);

      // Return cached result if valid
      if (cachedEntry && !isExpired(cachedEntry)) {
        return cachedEntry.result;
      }

      // Execute rule and cache result
      const result = await baseExecuteRule<T>(ruleId, input);

      if (result !== null) {
        setCache((prev) =>
          new Map(prev).set(cacheKey, {
            result,
            timestamp: Date.now(),
            ttl,
          }),
        );
      }

      return result;
    },
    [baseExecuteRule, cache, createCacheKey, isExpired, defaultTtl],
  );

  const clearCache = useCallback(() => {
    setCache(new Map());
  }, []);

  const clearExpiredCache = useCallback(() => {
    setCache((prev) => {
      const newCache = new Map();
      for (const [key, entry] of prev) {
        if (!isExpired(entry)) {
          newCache.set(key, entry);
        }
      }
      return newCache;
    });
  }, [isExpired]);

  const cacheStats = useMemo(
    () => ({
      size: cache.size,
      entries: Array.from(cache.entries()).map(([key, entry]) => ({
        key,
        timestamp: entry.timestamp,
        expired: isExpired(entry),
      })),
    }),
    [cache, isExpired],
  );

  return {
    executeRule,
    loading,
    error,
    clearCache,
    clearExpiredCache,
    cacheStats,
  };
}
```

### Batch Execution Hook

```typescript
// src/hooks/useBatchRuleExecution.ts
import { useState, useCallback } from 'react';
import { useRuleExecution } from './useRuleExecution';

interface BatchRequest {
  id: string;
  ruleId: string;
  input: Record<string, unknown>;
}

interface BatchResult<T> {
  id: string;
  result?: T;
  error?: string;
}

export function useBatchRuleExecution() {
  const [batchLoading, setBatchLoading] = useState(false);
  const { executeRule } = useRuleExecution();

  const executeBatch = useCallback(
    async <T = unknown>(requests: BatchRequest[]): Promise<BatchResult<T>[]> => {
      setBatchLoading(true);

      try {
        const promises = requests.map(async (request): Promise<BatchResult<T>> => {
          try {
            const result = await executeRule<T>(request.ruleId, request.input);
            return {
              id: request.id,
              result: result || undefined,
            };
          } catch (error) {
            return {
              id: request.id,
              error: error instanceof Error ? error.message : 'Unknown error',
            };
          }
        });

        return await Promise.all(promises);
      } finally {
        setBatchLoading(false);
      }
    },
    [executeRule],
  );

  return {
    executeBatch,
    batchLoading,
  };
}
```

## Testing

### Component Testing with React Testing Library

```typescript
// src/components/__tests__/RuleExecutor.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RuleExecutor } from '../RuleExecutor';
import { useRuleExecution } from '../../hooks/useRuleExecution';

// Mock the hook
jest.mock('../../hooks/useRuleExecution');

const mockUseRuleExecution = useRuleExecution as jest.MockedFunction<typeof useRuleExecution>;

describe('RuleExecutor', () => {
  const mockExecuteRule = jest.fn();

  beforeEach(() => {
    mockUseRuleExecution.mockReturnValue({
      executeRule: mockExecuteRule,
      executeRules: jest.fn(),
      executeByTags: jest.fn(),
      loading: false,
      error: null,
      lastResult: null,
      clearError: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders rule executor with rule ID', () => {
    render(<RuleExecutor ruleId="test-rule" />);

    expect(screen.getByText('Execute Rule: test-rule')).toBeInTheDocument();
    expect(screen.getByLabelText('Input Data (JSON):')).toBeInTheDocument();
    expect(screen.getByText('Execute Rule')).toBeInTheDocument();
  });

  it('executes rule with valid input', async () => {
    const mockResult = { approved: true, score: 85 };
    mockExecuteRule.mockResolvedValue(mockResult);

    render(<RuleExecutor ruleId="test-rule" />);

    const input = screen.getByLabelText('Input Data (JSON):');
    const executeButton = screen.getByText('Execute Rule');

    fireEvent.change(input, { target: { value: '{"userId": 123}' } });
    fireEvent.click(executeButton);

    await waitFor(() => {
      expect(mockExecuteRule).toHaveBeenCalledWith('test-rule', { userId: 123 });
    });

    expect(screen.getByText('Result:')).toBeInTheDocument();
    expect(screen.getByText(JSON.stringify(mockResult, null, 2))).toBeInTheDocument();
  });

  it('shows error for invalid JSON input', async () => {
    const onError = jest.fn();
    render(<RuleExecutor ruleId="test-rule" onError={onError} />);

    const input = screen.getByLabelText('Input Data (JSON):');
    const executeButton = screen.getByText('Execute Rule');

    fireEvent.change(input, { target: { value: 'invalid json' } });
    fireEvent.click(executeButton);

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith('Invalid JSON input');
    });
  });

  it('shows loading state during execution', () => {
    mockUseRuleExecution.mockReturnValue({
      executeRule: mockExecuteRule,
      executeRules: jest.fn(),
      executeByTags: jest.fn(),
      loading: true,
      error: null,
      lastResult: null,
      clearError: jest.fn(),
    });

    render(<RuleExecutor ruleId="test-rule" />);

    expect(screen.getByText('Executing...')).toBeInTheDocument();
    expect(screen.getByText('Executing...')).toBeDisabled();
  });
});
```

### Hook Testing

```typescript
// src/hooks/__tests__/useRuleExecution.test.ts
import { renderHook, act } from '@testing-library/react';
import { useRuleExecution } from '../useRuleExecution';
import { goRulesService } from '../../services/goRulesService';

// Mock the service
jest.mock('../../services/goRulesService');

const mockGoRulesService = goRulesService as jest.Mocked<typeof goRulesService>;

describe('useRuleExecution', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('executes rule successfully', async () => {
    const mockResult = { approved: true };
    mockGoRulesService.executeRule.mockResolvedValue(mockResult);

    const { result } = renderHook(() => useRuleExecution());

    let executionResult: any;
    await act(async () => {
      executionResult = await result.current.executeRule('test-rule', { userId: 123 });
    });

    expect(executionResult).toEqual(mockResult);
    expect(result.current.lastResult).toEqual(mockResult);
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('handles execution errors', async () => {
    const mockError = new Error('Rule execution failed');
    mockGoRulesService.executeRule.mockRejectedValue(mockError);

    const { result } = renderHook(() => useRuleExecution());

    let executionResult: any;
    await act(async () => {
      executionResult = await result.current.executeRule('test-rule', { userId: 123 });
    });

    expect(executionResult).toBeNull();
    expect(result.current.error).toBe('Rule execution failed');
    expect(result.current.loading).toBe(false);
  });

  it('sets loading state during execution', async () => {
    let resolvePromise: (value: any) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockGoRulesService.executeRule.mockReturnValue(promise);

    const { result } = renderHook(() => useRuleExecution());

    act(() => {
      result.current.executeRule('test-rule', { userId: 123 });
    });

    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolvePromise({ approved: true });
      await promise;
    });

    expect(result.current.loading).toBe(false);
  });
});
```

This comprehensive React integration guide provides everything needed to successfully integrate the Minimal GoRules Engine into React applications, from basic setup to advanced patterns and testing strategies.
