# React Hybrid Rule Loading Integration Examples

This document provides complete examples for integrating React applications with the Minimal GoRules Engine using hybrid rule loading (cloud + local rules).

## Table of Contents

- [Complete NestJS Backend Setup](#complete-nestjs-backend-setup)
- [React Frontend Integration](#react-frontend-integration)
- [Environment Configuration](#environment-configuration)
- [Development Workflow](#development-workflow)
- [Production Deployment](#production-deployment)

## Complete NestJS Backend Setup

### 1. Project Structure
```
backend/
├── src/
│   ├── app.module.ts
│   ├── gorules/
│   │   ├── gorules.controller.ts
│   │   ├── gorules.service.ts
│   │   └── dto/
│   │       ├── execute-rule.dto.ts
│   │       ├── execute-rules.dto.ts
│   │       └── execute-by-tags.dto.ts
│   └── main.ts
├── rules/                    # Local rules directory
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
├── .env.development
├── .env.production
└── package.json
```

### 2. App Module Configuration
```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MinimalGoRulesModule } from '@org/minimal-gorules';
import { GoRulesController } from './gorules/gorules.controller';
import { GoRulesService } from './gorules/gorules.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        `.env.${process.env.NODE_ENV || 'development'}`,
        '.env',
      ],
    }),
    // Hybrid rule loading configuration
    MinimalGoRulesModule.forRootWithConfig({
      autoInitialize: true,
    }),
  ],
  controllers: [GoRulesController],
  providers: [GoRulesService],
})
export class AppModule {}
```

### 3. GoRules Controller
```typescript
// src/gorules/gorules.controller.ts
import { Controller, Post, Get, Param, Body, HttpException, HttpStatus } from '@nestjs/common';
import { GoRulesService } from './gorules.service';
import { ExecuteRuleDto, ExecuteRulesDto, ExecuteByTagsDto } from './dto';

@Controller('api/rules')
export class GoRulesController {
  constructor(private readonly goRulesService: GoRulesService) {}

  @Post('execute/:ruleId')
  async executeRule(@Param('ruleId') ruleId: string, @Body() dto: ExecuteRuleDto) {
    try {
      const result = await this.goRulesService.executeRule(ruleId, dto.input);
      return {
        success: true,
        result,
        ruleId,
        executionTime: Date.now(),
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error.message,
          ruleId,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('execute/batch')
  async executeRules(@Body() dto: ExecuteRulesDto) {
    try {
      const result = await this.goRulesService.executeRules(dto.ruleIds, dto.input);
      return {
        success: true,
        result,
        ruleIds: dto.ruleIds,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error.message,
          ruleIds: dto.ruleIds,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('execute/tags')
  async executeByTags(@Body() dto: ExecuteByTagsDto) {
    try {
      const result = await this.goRulesService.executeByTags(
        dto.tags,
        dto.input,
        dto.mode || 'parallel',
      );
      return {
        success: true,
        result,
        tags: dto.tags,
        mode: dto.mode || 'parallel',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error.message,
          tags: dto.tags,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('status')
  async getStatus() {
    try {
      const status = await this.goRulesService.getStatus();
      return {
        success: true,
        status,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('metadata')
  async getAllMetadata() {
    try {
      const metadata = await this.goRulesService.getAllRuleMetadata();
      return {
        success: true,
        metadata: Object.fromEntries(metadata),
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('metadata/:ruleId')
  async getRuleMetadata(@Param('ruleId') ruleId: string) {
    try {
      const metadata = await this.goRulesService.getRuleMetadata(ruleId);
      if (!metadata) {
        throw new HttpException(
          {
            success: false,
            error: `Rule not found: ${ruleId}`,
          },
          HttpStatus.NOT_FOUND,
        );
      }
      return {
        success: true,
        metadata,
        ruleId,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error.message,
          ruleId,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
```

### 4. GoRules Service
```typescript
// src/gorules/gorules.service.ts
import { Injectable } from '@nestjs/common';
import { MinimalGoRulesService } from '@org/minimal-gorules';

@Injectable()
export class GoRulesService {
  constructor(private readonly goRulesEngine: MinimalGoRulesService) {}

  async executeRule<T = unknown>(ruleId: string, input: Record<string, unknown>): Promise<T> {
    return this.goRulesEngine.executeRule<T>(ruleId, input);
  }

  async executeRules<T = unknown>(ruleIds: string[], input: Record<string, unknown>) {
    return this.goRulesEngine.executeRules<T>(ruleIds, input);
  }

  async executeByTags<T = unknown>(
    tags: string[],
    input: Record<string, unknown>,
    mode: 'parallel' | 'sequential' = 'parallel',
  ) {
    return this.goRulesEngine.executeByTags<T>(tags, input, mode);
  }

  async getStatus() {
    return this.goRulesEngine.getStatus();
  }

  async getRuleMetadata(ruleId: string) {
    return this.goRulesEngine.getRuleMetadata(ruleId);
  }

  async getAllRuleMetadata() {
    return this.goRulesEngine.getAllRuleMetadata();
  }

  async refreshCache(ruleIds?: string[]) {
    return this.goRulesEngine.refreshCache(ruleIds);
  }

  getInitializationStatus() {
    return this.goRulesEngine.getInitializationStatus();
  }
}
```

### 5. DTOs
```typescript
// src/gorules/dto/execute-rule.dto.ts
import { IsObject, IsNotEmpty } from 'class-validator';

export class ExecuteRuleDto {
  @IsObject()
  @IsNotEmpty()
  input: Record<string, unknown>;
}

// src/gorules/dto/execute-rules.dto.ts
import { IsArray, IsObject, IsNotEmpty, ArrayNotEmpty } from 'class-validator';

export class ExecuteRulesDto {
  @IsArray()
  @ArrayNotEmpty()
  ruleIds: string[];

  @IsObject()
  @IsNotEmpty()
  input: Record<string, unknown>;
}

// src/gorules/dto/execute-by-tags.dto.ts
import { IsArray, IsObject, IsNotEmpty, ArrayNotEmpty, IsOptional, IsIn } from 'class-validator';

export class ExecuteByTagsDto {
  @IsArray()
  @ArrayNotEmpty()
  tags: string[];

  @IsObject()
  @IsNotEmpty()
  input: Record<string, unknown>;

  @IsOptional()
  @IsIn(['parallel', 'sequential'])
  mode?: 'parallel' | 'sequential';
}

// src/gorules/dto/index.ts
export * from './execute-rule.dto';
export * from './execute-rules.dto';
export * from './execute-by-tags.dto';
```

## React Frontend Integration

### 1. Project Structure
```
frontend/
├── src/
│   ├── components/
│   │   ├── RuleExecutor.tsx
│   │   ├── EngineStatusDashboard.tsx
│   │   └── RuleMetadataViewer.tsx
│   ├── hooks/
│   │   ├── useRuleExecution.ts
│   │   ├── useEngineStatus.ts
│   │   └── useRuleMetadata.ts
│   ├── services/
│   │   └── goRulesApiService.ts
│   ├── types/
│   │   └── gorules.types.ts
│   ├── App.tsx
│   └── index.tsx
├── .env.development
├── .env.production
└── package.json
```

### 2. API Service
```typescript
// src/services/goRulesApiService.ts
import axios, { AxiosInstance, AxiosResponse } from 'axios';

export interface ExecutionResult<T = unknown> {
  success: boolean;
  result?: T;
  error?: string;
  executionTime?: number;
  ruleId?: string;
  ruleIds?: string[];
  tags?: string[];
}

export interface EngineStatus {
  initialized: boolean;
  rulesLoaded: number;
  projectId: string;
  version: string;
  lastUpdate: number;
  ruleSource?: 'cloud' | 'local';
  localRulesPath?: string;
  enableHotReload?: boolean;
}

export interface RuleMetadata {
  id: string;
  version: string;
  tags: string[];
  lastModified: string;
}

export class GoRulesApiService {
  private api: AxiosInstance;

  constructor(baseURL: string = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000') {
    this.api = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for authentication
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Add response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Handle authentication errors
          localStorage.removeItem('authToken');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      },
    );
  }

  async executeRule<T = unknown>(ruleId: string, input: Record<string, unknown>): Promise<T> {
    const response: AxiosResponse<ExecutionResult<T>> = await this.api.post(
      `/api/rules/execute/${ruleId}`,
      { input },
    );

    if (!response.data.success) {
      throw new Error(response.data.error || 'Rule execution failed');
    }

    return response.data.result!;
  }

  async executeRules<T = unknown>(
    ruleIds: string[],
    input: Record<string, unknown>,
  ): Promise<ExecutionResult<T>> {
    const response: AxiosResponse<ExecutionResult<T>> = await this.api.post(
      '/api/rules/execute/batch',
      { ruleIds, input },
    );

    if (!response.data.success) {
      throw new Error(response.data.error || 'Rules execution failed');
    }

    return response.data;
  }

  async executeByTags<T = unknown>(
    tags: string[],
    input: Record<string, unknown>,
    mode: 'parallel' | 'sequential' = 'parallel',
  ): Promise<ExecutionResult<T>> {
    const response: AxiosResponse<ExecutionResult<T>> = await this.api.post(
      '/api/rules/execute/tags',
      { tags, input, mode },
    );

    if (!response.data.success) {
      throw new Error(response.data.error || 'Tag-based execution failed');
    }

    return response.data;
  }

  async getStatus(): Promise<EngineStatus> {
    const response: AxiosResponse<{ success: boolean; status: EngineStatus }> = await this.api.get(
      '/api/rules/status',
    );

    if (!response.data.success) {
      throw new Error('Failed to fetch engine status');
    }

    return response.data.status;
  }

  async getRuleMetadata(ruleId: string): Promise<RuleMetadata> {
    const response: AxiosResponse<{ success: boolean; metadata: RuleMetadata }> =
      await this.api.get(`/api/rules/metadata/${ruleId}`);

    if (!response.data.success) {
      throw new Error(`Failed to fetch metadata for rule: ${ruleId}`);
    }

    return response.data.metadata;
  }

  async getAllRuleMetadata(): Promise<Map<string, RuleMetadata>> {
    const response: AxiosResponse<{ success: boolean; metadata: Record<string, RuleMetadata> }> =
      await this.api.get('/api/rules/metadata');

    if (!response.data.success) {
      throw new Error('Failed to fetch all rule metadata');
    }

    return new Map(Object.entries(response.data.metadata));
  }
}

// Create singleton instance
export const goRulesApiService = new GoRulesApiService();
```

### 3. React Hooks
```typescript
// src/hooks/useRuleExecution.ts
import { useState, useCallback } from 'react';
import { goRulesApiService, ExecutionResult } from '../services/goRulesApiService';

export function useRuleExecution() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<any>(null);

  const executeRule = useCallback(
    async <T = unknown>(ruleId: string, input: Record<string, unknown>): Promise<T | null> => {
      setLoading(true);
      setError(null);

      try {
        const result = await goRulesApiService.executeRule<T>(ruleId, input);
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
    ): Promise<ExecutionResult<T> | null> => {
      setLoading(true);
      setError(null);

      try {
        const result = await goRulesApiService.executeRules<T>(ruleIds, input);
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
    ): Promise<ExecutionResult<T> | null> => {
      setLoading(true);
      setError(null);

      try {
        const result = await goRulesApiService.executeByTags<T>(tags, input, mode);
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

### 4. React Components
```typescript
// src/components/HybridRuleExecutor.tsx
import React, { useState, useEffect } from 'react';
import { useRuleExecution } from '../hooks/useRuleExecution';
import { useEngineStatus } from '../hooks/useEngineStatus';

export const HybridRuleExecutor: React.FC = () => {
  const [ruleId, setRuleId] = useState('');
  const [input, setInput] = useState('{}');
  const [result, setResult] = useState<any>(null);

  const { executeRule, loading, error } = useRuleExecution();
  const { status } = useEngineStatus();

  const handleExecute = async () => {
    try {
      const parsedInput = JSON.parse(input);
      const executionResult = await executeRule(ruleId, parsedInput);
      setResult(executionResult);
    } catch (parseError) {
      console.error('Invalid JSON input:', parseError);
    }
  };

  return (
    <div className="hybrid-rule-executor">
      <div className="header">
        <h2>Hybrid Rule Executor</h2>
        {status && (
          <div className="rule-source-indicator">
            <span className={`source-badge ${status.ruleSource}`}>
              {status.ruleSource === 'local' ? '📁 Local Rules' : '☁️ Cloud Rules'}
            </span>
            {status.ruleSource === 'local' && status.enableHotReload && (
              <span className="hot-reload-badge">🔥 Hot Reload</span>
            )}
          </div>
        )}
      </div>

      <div className="form-section">
        <div className="input-group">
          <label htmlFor="ruleId">Rule ID:</label>
          <input
            id="ruleId"
            type="text"
            value={ruleId}
            onChange={(e) => setRuleId(e.target.value)}
            placeholder="e.g., pricing/shipping-fees"
          />
        </div>

        <div className="input-group">
          <label htmlFor="input">Input Data (JSON):</label>
          <textarea
            id="input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={6}
            placeholder="Enter JSON input data..."
          />
        </div>

        <button onClick={handleExecute} disabled={loading || !ruleId.trim()}>
          {loading ? 'Executing...' : 'Execute Rule'}
        </button>
      </div>

      {error && (
        <div className="error-section">
          <h4>Error:</h4>
          <pre>{error}</pre>
        </div>
      )}

      {result && (
        <div className="result-section">
          <h4>Result:</h4>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}

      <style jsx>{`
        .hybrid-rule-executor {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .rule-source-indicator {
          display: flex;
          gap: 10px;
        }

        .source-badge {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: bold;
        }

        .source-badge.local {
          background-color: #e3f2fd;
          color: #1976d2;
        }

        .source-badge.cloud {
          background-color: #f3e5f5;
          color: #7b1fa2;
        }

        .hot-reload-badge {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: bold;
          background-color: #fff3e0;
          color: #f57c00;
        }

        .form-section {
          margin-bottom: 20px;
        }

        .input-group {
          margin-bottom: 15px;
        }

        .input-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: bold;
        }

        .input-group input,
        .input-group textarea {
          width: 100%;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-family: monospace;
        }

        button {
          background-color: #1976d2;
          color: white;
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        button:disabled {
          background-color: #ccc;
          cursor: not-allowed;
        }

        .error-section,
        .result-section {
          margin-top: 20px;
          padding: 15px;
          border-radius: 4px;
        }

        .error-section {
          background-color: #ffebee;
          border: 1px solid #f44336;
        }

        .result-section {
          background-color: #e8f5e8;
          border: 1px solid #4caf50;
        }

        pre {
          background-color: #f5f5f5;
          padding: 10px;
          border-radius: 4px;
          overflow-x: auto;
          font-size: 12px;
        }
      `}</style>
    </div>
  );
};
```

## Environment Configuration

### Backend Environment Files

```bash
# .env.development
NODE_ENV=development

# Local rule loading configuration
GORULES_RULE_SOURCE=local
GORULES_LOCAL_RULES_PATH=./rules
GORULES_ENABLE_HOT_RELOAD=true
GORULES_METADATA_FILE_PATTERN=*.meta.json

# File system options
GORULES_FS_RECURSIVE=true
GORULES_WATCH_PERSISTENT=false
GORULES_WATCH_IGNORE_INITIAL=true

# Performance settings
GORULES_CACHE_MAX_SIZE=1000
GORULES_TIMEOUT=5000
GORULES_BATCH_SIZE=50
```

```bash
# .env.production
NODE_ENV=production

# Cloud rule loading configuration
GORULES_RULE_SOURCE=cloud
GORULES_API_URL=https://api.gorules.io
GORULES_API_KEY=your-production-api-key
GORULES_PROJECT_ID=your-project-id

# Performance settings
GORULES_CACHE_MAX_SIZE=5000
GORULES_TIMEOUT=10000
GORULES_BATCH_SIZE=100
```

### Frontend Environment Files

```bash
# .env.development
REACT_APP_API_BASE_URL=http://localhost:3000
REACT_APP_ENVIRONMENT=development
```

```bash
# .env.production
REACT_APP_API_BASE_URL=https://your-api-domain.com
REACT_APP_ENVIRONMENT=production
```

## Development Workflow

### 1. Local Development Setup
```bash
# Backend setup
cd backend
npm install
npm run start:dev

# Frontend setup (in another terminal)
cd frontend
npm install
npm start
```

### 2. Rule Development Workflow
1. Create/modify rule files in `backend/rules/`
2. Hot reload automatically updates the engine (if enabled)
3. Test rules using the React frontend
4. Commit rule changes to version control

### 3. Testing Different Rule Sources
```bash
# Test with local rules
cd backend
GORULES_RULE_SOURCE=local npm run start:dev

# Test with cloud rules (requires API credentials)
cd backend
GORULES_RULE_SOURCE=cloud npm run start:dev
```

## Production Deployment

### 1. Backend Deployment
```dockerfile
# Dockerfile for backend
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/
COPY rules/ ./rules/

# Build application
RUN npm run build

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "run", "start:prod"]
```

### 2. Environment-Specific Deployment
```yaml
# docker-compose.yml for production
version: '3.8'
services:
  backend:
    build: .
    environment:
      - NODE_ENV=production
      - GORULES_RULE_SOURCE=cloud
      - GORULES_API_URL=${GORULES_API_URL}
      - GORULES_API_KEY=${GORULES_API_KEY}
      - GORULES_PROJECT_ID=${GORULES_PROJECT_ID}
    ports:
      - "3000:3000"

  frontend:
    build:
      context: ./frontend
      args:
        - REACT_APP_API_BASE_URL=http://backend:3000
    ports:
      - "80:80"
    depends_on:
      - backend
```

### 3. CI/CD Pipeline Example
```yaml
# .github/workflows/deploy.yml
name: Deploy Application

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      # Test with local rules
      - name: Test Backend with Local Rules
        run: |
          cd backend
          npm ci
          GORULES_RULE_SOURCE=local npm test
      
      # Test with cloud rules (if credentials available)
      - name: Test Backend with Cloud Rules
        if: ${{ secrets.GORULES_API_KEY }}
        run: |
          cd backend
          GORULES_RULE_SOURCE=cloud npm test
        env:
          GORULES_API_URL: ${{ secrets.GORULES_API_URL }}
          GORULES_API_KEY: ${{ secrets.GORULES_API_KEY }}
          GORULES_PROJECT_ID: ${{ secrets.GORULES_PROJECT_ID }}

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Production
        run: |
          # Your deployment script here
          echo "Deploying with cloud rules configuration"
```

This comprehensive example demonstrates how to set up a complete React + NestJS application with hybrid rule loading capabilities, supporting both local development with file-based rules and production deployment with cloud-based rules.