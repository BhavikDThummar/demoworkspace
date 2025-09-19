# Troubleshooting Guide

Comprehensive troubleshooting guide for common issues and solutions when using the Minimal GoRules Engine.

## Table of Contents

- [Common Issues](#common-issues)
- [Error Codes and Solutions](#error-codes-and-solutions)
- [Configuration Issues](#configuration-issues)
- [Network and API Issues](#network-and-api-issues)
- [Performance Issues](#performance-issues)
- [Memory Issues](#memory-issues)
- [Integration Issues](#integration-issues)
- [Debugging Tools](#debugging-tools)
- [FAQ](#faq)

## Common Issues

### Engine Not Initializing

**Symptoms:**

- `Engine not initialized` error when executing rules
- Initialization hangs or times out
- Rules not loading during startup

**Causes and Solutions:**

1. **Invalid Configuration**

   ```typescript
   // ❌ Incorrect
   const config = {
     apiUrl: 'invalid-url',
     apiKey: '',
     projectId: undefined,
   };

   // ✅ Correct
   const config = {
     apiUrl: 'https://api.gorules.io',
     apiKey: process.env.GORULES_API_KEY!,
     projectId: 'your-project-id',
   };
   ```

2. **Network Connectivity Issues**

   ```typescript
   // Test connectivity
   try {
     const response = await fetch('https://api.gorules.io/health');
     console.log('API accessible:', response.ok);
   } catch (error) {
     console.error('Network issue:', error);
   }
   ```

3. **Missing Initialization Call**

   ```typescript
   // ❌ Incorrect - missing initialization
   const engine = new MinimalGoRulesEngine(config);
   await engine.executeRule('rule-id', input); // Will fail

   // ✅ Correct - initialize first
   const engine = new MinimalGoRulesEngine(config);
   await engine.initialize();
   await engine.executeRule('rule-id', input);
   ```

### Rules Not Found

**Symptoms:**

- `RULE_NOT_FOUND` errors
- Rules exist in GoRules Cloud but not accessible

**Causes and Solutions:**

1. **Rule ID Mismatch**

   ```typescript
   // Check available rules
   const metadata = await engine.getAllRuleMetadata();
   console.log('Available rules:', Array.from(metadata.keys()));

   // Validate rule exists
   const exists = await engine.validateRule('your-rule-id');
   if (!exists) {
     console.error('Rule not found in cache');
   }
   ```

2. **Project ID Mismatch**

   ```typescript
   // Verify project configuration
   const config = engine.getConfig();
   console.log('Current project ID:', config.projectId);

   // Check if rules are loaded for correct project
   const status = await engine.getStatus();
   console.log('Rules loaded:', status.rulesLoaded);
   ```

3. **Cache Issues**

   ```typescript
   // Force refresh cache
   await engine.forceRefreshCache();

   // Or refresh specific rules
   await engine.refreshCache(['rule-id-1', 'rule-id-2']);
   ```

### Execution Timeouts

**Symptoms:**

- `TIMEOUT` errors during rule execution
- Slow response times
- Hanging requests

**Causes and Solutions:**

1. **Insufficient Timeout Configuration**

   ```typescript
   // Increase timeout
   const config = {
     // ... other config
     httpTimeout: 15000, // Increase from default 5000ms
   };
   ```

2. **Network Latency**

   ```typescript
   // Test network latency
   const startTime = Date.now();
   try {
     await engine.executeRule('test-rule', {});
   } catch (error) {
     console.log('Request took:', Date.now() - startTime, 'ms');
   }
   ```

3. **Resource Exhaustion**
   ```typescript
   // Monitor system resources
   const memUsage = process.memoryUsage();
   console.log('Memory usage:', {
     heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
     heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
   });
   ```

## Error Codes and Solutions

### RULE_NOT_FOUND

**Error:** Rule doesn't exist in cache or GoRules Cloud

**Solutions:**

```typescript
// 1. Check if rule exists in GoRules Cloud
const allMetadata = await engine.getAllRuleMetadata();
if (!allMetadata.has('your-rule-id')) {
  console.log('Rule not found in cache, refreshing...');
  await engine.refreshCache();
}

// 2. Validate rule ID spelling
const availableRules = Array.from(allMetadata.keys());
const similarRules = availableRules.filter((id) =>
  id.toLowerCase().includes('your-rule'.toLowerCase()),
);
console.log('Similar rules found:', similarRules);

// 3. Check rule tags if using tag-based execution
const rulesByTag = await engine.getRulesByTags(['your-tag']);
console.log('Rules with tag:', rulesByTag);
```

### NETWORK_ERROR

**Error:** Network connectivity or API issues

**Solutions:**

```typescript
// 1. Implement retry logic
class NetworkErrorHandler {
  async executeWithRetry<T>(
    engine: MinimalGoRulesEngine,
    ruleId: string,
    input: Record<string, unknown>,
    maxRetries: number = 3,
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await engine.executeRule<T>(ruleId, input);
      } catch (error) {
        if (error.code !== 'NETWORK_ERROR' || attempt === maxRetries) {
          throw error;
        }

        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`Retry attempt ${attempt} after ${delay}ms`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
}

// 2. Check network connectivity
async function checkConnectivity() {
  try {
    const response = await fetch('https://api.gorules.io/health', {
      timeout: 5000,
    });
    return response.ok;
  } catch {
    return false;
  }
}

// 3. Configure proxy if needed
const config = {
  // ... other config
  proxy: process.env.HTTP_PROXY,
  httpsProxy: process.env.HTTPS_PROXY,
};
```

### TIMEOUT

**Error:** Request exceeded configured timeout

**Solutions:**

```typescript
// 1. Increase timeout for specific operations
const config = {
  // ... other config
  httpTimeout: 20000, // 20 seconds
};

// 2. Implement timeout handling
async function executeWithCustomTimeout<T>(
  engine: MinimalGoRulesEngine,
  ruleId: string,
  input: Record<string, unknown>,
  timeoutMs: number = 10000,
): Promise<T> {
  return Promise.race([
    engine.executeRule<T>(ruleId, input),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Custom timeout')), timeoutMs),
    ),
  ]);
}

// 3. Monitor execution times
const executionTimes: number[] = [];
const startTime = Date.now();
try {
  await engine.executeRule('rule-id', input);
  executionTimes.push(Date.now() - startTime);

  // Log statistics
  if (executionTimes.length % 100 === 0) {
    const avg = executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length;
    console.log(`Average execution time: ${avg.toFixed(2)}ms`);
  }
} catch (error) {
  console.error('Execution failed after:', Date.now() - startTime, 'ms');
}
```

### INVALID_INPUT

**Error:** Configuration or input validation failed

**Solutions:**

```typescript
// 1. Validate configuration
import { ConfigFactory } from '@your-org/minimal-gorules';

const validation = ConfigFactory.validate(config);
if (!validation.isValid) {
  console.error('Configuration errors:', validation.errors);
  // Fix configuration based on errors
}

// 2. Validate input data
function validateRuleInput(input: Record<string, unknown>): boolean {
  // Check for required fields
  if (!input || typeof input !== 'object') {
    console.error('Input must be an object');
    return false;
  }

  // Check for circular references
  try {
    JSON.stringify(input);
  } catch (error) {
    console.error('Input contains circular references');
    return false;
  }

  return true;
}

// 3. Sanitize input data
function sanitizeInput(input: Record<string, unknown>): Record<string, unknown> {
  const sanitized = { ...input };

  // Remove undefined values
  Object.keys(sanitized).forEach((key) => {
    if (sanitized[key] === undefined) {
      delete sanitized[key];
    }
  });

  return sanitized;
}
```

### EXECUTION_ERROR

**Error:** Rule execution failed

**Solutions:**

```typescript
// 1. Check rule syntax and logic
async function debugRuleExecution(
  engine: MinimalGoRulesEngine,
  ruleId: string,
  input: Record<string, unknown>,
) {
  try {
    // Get rule metadata
    const metadata = await engine.getRuleMetadata(ruleId);
    console.log('Rule metadata:', metadata);

    // Validate rule
    const isValid = await engine.validateRule(ruleId);
    console.log('Rule valid:', isValid);

    // Execute with detailed logging
    console.log('Executing rule with input:', JSON.stringify(input, null, 2));
    const result = await engine.executeRule(ruleId, input);
    console.log('Execution result:', JSON.stringify(result, null, 2));

    return result;
  } catch (error) {
    console.error('Execution debug info:', {
      ruleId,
      input,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

// 2. Test with minimal input
async function testWithMinimalInput(engine: MinimalGoRulesEngine, ruleId: string) {
  const minimalInputs = [{}, { test: true }, { value: 1 }, { text: 'test' }];

  for (const input of minimalInputs) {
    try {
      console.log(`Testing with input:`, input);
      const result = await engine.executeRule(ruleId, input);
      console.log(`Success with input:`, input, 'Result:', result);
      return input; // Return working input
    } catch (error) {
      console.log(`Failed with input:`, input, 'Error:', error.message);
    }
  }

  throw new Error('No working input found');
}
```

## Configuration Issues

### Environment Variables Not Loading

**Problem:** Configuration values are undefined or incorrect

**Solutions:**

```typescript
// 1. Validate environment variables
function validateEnvironment() {
  const required = ['GORULES_API_KEY', 'GORULES_PROJECT_ID'];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }
}

// 2. Use configuration factory with defaults
const config = ConfigFactory.create({
  apiUrl: process.env.GORULES_API_URL || 'https://api.gorules.io',
  apiKey: process.env.GORULES_API_KEY!,
  projectId: process.env.GORULES_PROJECT_ID!,
  cacheMaxSize: parseInt(process.env.GORULES_CACHE_SIZE || '1000'),
  httpTimeout: parseInt(process.env.GORULES_TIMEOUT || '5000'),
});

// 3. Log configuration (without sensitive data)
console.log('GoRules configuration:', {
  apiUrl: config.apiUrl,
  projectId: config.projectId,
  cacheMaxSize: config.cacheMaxSize,
  httpTimeout: config.httpTimeout,
  apiKey: config.apiKey ? '[REDACTED]' : 'NOT SET',
});
```

### Invalid Configuration Values

**Problem:** Configuration validation fails

**Solutions:**

```typescript
// 1. Use configuration builder with validation
class ConfigBuilder {
  private config: Partial<MinimalGoRulesConfig> = {};

  setApiUrl(url: string): this {
    if (!url.startsWith('http')) {
      throw new Error('API URL must start with http or https');
    }
    this.config.apiUrl = url;
    return this;
  }

  setApiKey(key: string): this {
    if (!key || key.length < 10) {
      throw new Error('API key must be at least 10 characters');
    }
    this.config.apiKey = key;
    return this;
  }

  setProjectId(id: string): this {
    if (!id || !/^[a-zA-Z0-9-_]+$/.test(id)) {
      throw new Error(
        'Project ID must contain only alphanumeric characters, hyphens, and underscores',
      );
    }
    this.config.projectId = id;
    return this;
  }

  setCacheSize(size: number): this {
    if (size < 1 || size > 50000) {
      throw new Error('Cache size must be between 1 and 50000');
    }
    this.config.cacheMaxSize = size;
    return this;
  }

  build(): MinimalGoRulesConfig {
    const validation = ConfigFactory.validate(this.config as MinimalGoRulesConfig);
    if (!validation.isValid) {
      throw new Error(`Configuration invalid: ${validation.errors.join(', ')}`);
    }
    return this.config as MinimalGoRulesConfig;
  }
}

// Usage
const config = new ConfigBuilder()
  .setApiUrl('https://api.gorules.io')
  .setApiKey(process.env.GORULES_API_KEY!)
  .setProjectId(process.env.GORULES_PROJECT_ID!)
  .setCacheSize(2000)
  .build();
```

## Network and API Issues

### Connection Refused

**Problem:** Cannot connect to GoRules API

**Solutions:**

```typescript
// 1. Check network connectivity
async function diagnoseNetworkIssue() {
  const tests = [
    { name: 'DNS Resolution', test: () => require('dns').promises.lookup('api.gorules.io') },
    { name: 'HTTP Connectivity', test: () => fetch('https://api.gorules.io/health') },
    { name: 'HTTPS Connectivity', test: () => fetch('https://api.gorules.io/health') },
  ];

  for (const { name, test } of tests) {
    try {
      await test();
      console.log(`✅ ${name}: OK`);
    } catch (error) {
      console.log(`❌ ${name}: ${error.message}`);
    }
  }
}

// 2. Configure proxy settings
const config = {
  // ... other config
  proxy: {
    host: process.env.PROXY_HOST,
    port: parseInt(process.env.PROXY_PORT || '8080'),
    auth: process.env.PROXY_AUTH
      ? {
          username: process.env.PROXY_USERNAME,
          password: process.env.PROXY_PASSWORD,
        }
      : undefined,
  },
};

// 3. Use custom HTTP agent
import { Agent } from 'https';

const httpsAgent = new Agent({
  keepAlive: true,
  timeout: 10000,
  // For self-signed certificates (development only)
  rejectUnauthorized: process.env.NODE_ENV === 'production',
});
```

### API Rate Limiting

**Problem:** Too many requests to GoRules API

**Solutions:**

```typescript
// 1. Implement rate limiting
class RateLimiter {
  private requests: number[] = [];
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = 100, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  async waitForSlot(): Promise<void> {
    const now = Date.now();

    // Remove old requests outside the window
    this.requests = this.requests.filter((time) => now - time < this.windowMs);

    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.windowMs - (now - oldestRequest);

      console.log(`Rate limit reached, waiting ${waitTime}ms`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      return this.waitForSlot();
    }

    this.requests.push(now);
  }
}

// 2. Use request batching
const config = {
  // ... other config
  enableRequestBatching: true,
  batchSize: 50, // Reduce batch size to avoid rate limits
};

// 3. Implement exponential backoff
async function executeWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 5,
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (error.status === 429 && attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 30000);
        console.log(`Rate limited, retrying in ${delay}ms`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}
```

## Performance Issues

### High Memory Usage

**Problem:** Memory usage continuously increasing

**Solutions:**

```typescript
// 1. Monitor memory usage
function monitorMemory() {
  setInterval(() => {
    const usage = process.memoryUsage();
    const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024);

    console.log(`Memory: ${heapUsedMB}MB / ${heapTotalMB}MB`);

    if (heapUsedMB > 500) {
      // Alert if over 500MB
      console.warn('High memory usage detected!');

      // Force garbage collection if available
      if (global.gc) {
        console.log('Forcing garbage collection...');
        global.gc();
      }
    }
  }, 30000);
}

// 2. Reduce cache size
const config = {
  // ... other config
  cacheMaxSize: 1000, // Reduce from higher value
  memoryWarningThreshold: 0.6,
  memoryCriticalThreshold: 0.75,
};

// 3. Clear cache periodically
setInterval(async () => {
  const cacheStats = engine.getCacheStats();
  if (cacheStats.size > cacheStats.maxSize * 0.8) {
    console.log('Cache nearly full, clearing expired entries...');
    // Implement cache cleanup logic
  }
}, 300000); // Every 5 minutes
```

### Slow Rule Execution

**Problem:** Rules taking too long to execute

**Solutions:**

```typescript
// 1. Profile rule execution
async function profileRuleExecution(
  engine: MinimalGoRulesEngine,
  ruleId: string,
  input: Record<string, unknown>,
) {
  const startTime = process.hrtime.bigint();

  try {
    const result = await engine.executeRule(ruleId, input);
    const endTime = process.hrtime.bigint();
    const durationMs = Number(endTime - startTime) / 1_000_000;

    console.log(`Rule ${ruleId} executed in ${durationMs.toFixed(2)}ms`);

    if (durationMs > 100) {
      console.warn(`Slow rule execution detected: ${ruleId}`);
    }

    return result;
  } catch (error) {
    const endTime = process.hrtime.bigint();
    const durationMs = Number(endTime - startTime) / 1_000_000;
    console.error(`Rule ${ruleId} failed after ${durationMs.toFixed(2)}ms:`, error.message);
    throw error;
  }
}

// 2. Use execution caching
const executionCache = new Map<string, { result: any; timestamp: number }>();

async function executeWithCache<T>(
  engine: MinimalGoRulesEngine,
  ruleId: string,
  input: Record<string, unknown>,
  ttlMs: number = 300000,
): Promise<T> {
  const cacheKey = `${ruleId}:${JSON.stringify(input)}`;
  const cached = executionCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < ttlMs) {
    console.log(`Cache hit for ${ruleId}`);
    return cached.result;
  }

  const result = await engine.executeRule<T>(ruleId, input);
  executionCache.set(cacheKey, { result, timestamp: Date.now() });

  return result;
}

// 3. Optimize parallel execution
async function executeRulesOptimized<T>(
  engine: MinimalGoRulesEngine,
  ruleIds: string[],
  input: Record<string, unknown>,
  concurrency: number = 10,
): Promise<Map<string, T>> {
  const results = new Map<string, T>();

  // Process in batches to avoid overwhelming the system
  for (let i = 0; i < ruleIds.length; i += concurrency) {
    const batch = ruleIds.slice(i, i + concurrency);

    const batchPromises = batch.map(async (ruleId) => {
      try {
        const result = await engine.executeRule<T>(ruleId, input);
        results.set(ruleId, result);
      } catch (error) {
        console.error(`Rule ${ruleId} failed:`, error.message);
      }
    });

    await Promise.all(batchPromises);
  }

  return results;
}
```

## Memory Issues

### Memory Leaks

**Problem:** Memory usage grows over time and doesn't decrease

**Solutions:**

```typescript
// 1. Detect memory leaks
class MemoryLeakDetector {
  private measurements: Array<{ timestamp: number; heapUsed: number }> = [];
  private interval: NodeJS.Timeout | null = null;

  start(intervalMs: number = 60000) {
    this.interval = setInterval(() => {
      if (global.gc) global.gc(); // Force GC for accurate measurement

      const heapUsed = process.memoryUsage().heapUsed;
      this.measurements.push({ timestamp: Date.now(), heapUsed });

      // Keep only last 10 measurements
      if (this.measurements.length > 10) {
        this.measurements.shift();
      }

      this.analyzeMemoryTrend();
    }, intervalMs);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  private analyzeMemoryTrend() {
    if (this.measurements.length < 5) return;

    const recent = this.measurements.slice(-5);
    const isIncreasing = recent.every((measurement, index) => {
      if (index === 0) return true;
      return measurement.heapUsed > recent[index - 1].heapUsed;
    });

    if (isIncreasing) {
      const first = recent[0];
      const last = recent[recent.length - 1];
      const increaseMB = (last.heapUsed - first.heapUsed) / 1024 / 1024;

      console.warn(
        `Potential memory leak detected: ${increaseMB.toFixed(2)}MB increase over ${
          recent.length
        } measurements`,
      );
    }
  }
}

// 2. Clean up resources
class ResourceManager {
  private resources: Array<() => void> = [];

  register(cleanup: () => void) {
    this.resources.push(cleanup);
  }

  cleanup() {
    this.resources.forEach((cleanup) => {
      try {
        cleanup();
      } catch (error) {
        console.error('Cleanup error:', error);
      }
    });
    this.resources = [];
  }
}

// Usage
const resourceManager = new ResourceManager();

// Register cleanup for engine
resourceManager.register(async () => {
  await engine.cleanup();
});

// Register cleanup for intervals
const interval = setInterval(() => {}, 1000);
resourceManager.register(() => {
  clearInterval(interval);
});

// Cleanup on process exit
process.on('exit', () => resourceManager.cleanup());
process.on('SIGINT', () => {
  resourceManager.cleanup();
  process.exit(0);
});
```

### Out of Memory Errors

**Problem:** Application crashes with out of memory errors

**Solutions:**

```typescript
// 1. Increase Node.js memory limit
// Start Node.js with: node --max-old-space-size=4096 app.js

// 2. Monitor memory and take action
function setupMemoryMonitoring() {
  setInterval(() => {
    const usage = process.memoryUsage();
    const heapUsedMB = usage.heapUsed / 1024 / 1024;
    const heapTotalMB = usage.heapTotal / 1024 / 1024;
    const usagePercent = (heapUsedMB / heapTotalMB) * 100;

    if (usagePercent > 80) {
      console.warn(`High memory usage: ${usagePercent.toFixed(1)}%`);

      // Take corrective action
      if (global.gc) {
        global.gc();
      }

      // Clear caches
      engine.getCacheStats(); // This might trigger cleanup

      if (usagePercent > 90) {
        console.error('Critical memory usage, consider restarting');
        // Could implement graceful restart here
      }
    }
  }, 10000);
}

// 3. Implement memory-aware cache
class MemoryAwareCache {
  private cache = new Map<string, any>();
  private readonly maxMemoryMB: number;

  constructor(maxMemoryMB: number = 100) {
    this.maxMemoryMB = maxMemoryMB;
  }

  set(key: string, value: any) {
    // Check memory usage before adding
    const currentMemoryMB = process.memoryUsage().heapUsed / 1024 / 1024;

    if (currentMemoryMB > this.maxMemoryMB) {
      console.log('Memory limit reached, clearing cache');
      this.cache.clear();
    }

    this.cache.set(key, value);
  }

  get(key: string) {
    return this.cache.get(key);
  }

  clear() {
    this.cache.clear();
  }
}
```

## Integration Issues

### NestJS Integration Problems

**Problem:** Engine not working properly in NestJS

**Solutions:**

```typescript
// 1. Proper module configuration
@Module({
  providers: [
    {
      provide: 'GORULES_CONFIG',
      useFactory: (configService: ConfigService) => {
        const config = {
          apiUrl: configService.get<string>('GORULES_API_URL'),
          apiKey: configService.get<string>('GORULES_API_KEY'),
          projectId: configService.get<string>('GORULES_PROJECT_ID'),
        };

        // Validate configuration
        if (!config.apiKey) {
          throw new Error('GORULES_API_KEY is required');
        }

        return config;
      },
      inject: [ConfigService],
    },
    {
      provide: MinimalGoRulesEngine,
      useFactory: async (config) => {
        const engine = new MinimalGoRulesEngine(config);

        try {
          await engine.initialize();
          console.log('GoRules engine initialized successfully');
          return engine;
        } catch (error) {
          console.error('Failed to initialize GoRules engine:', error);
          throw error;
        }
      },
      inject: ['GORULES_CONFIG'],
    },
  ],
})
export class GoRulesModule {}

// 2. Health check integration
@Injectable()
export class GoRulesHealthIndicator extends HealthIndicator {
  constructor(private readonly engine: MinimalGoRulesEngine) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const status = await this.engine.getStatus();

      if (!status.initialized) {
        throw new Error('Engine not initialized');
      }

      return this.getStatus(key, true, {
        rulesLoaded: status.rulesLoaded,
        lastUpdate: status.lastUpdate,
      });
    } catch (error) {
      throw new HealthCheckError('GoRules engine unhealthy', {
        [key]: {
          status: 'down',
          error: error.message,
        },
      });
    }
  }
}

// 3. Graceful shutdown
@Injectable()
export class GoRulesService implements OnModuleDestroy {
  constructor(private readonly engine: MinimalGoRulesEngine) {}

  async onModuleDestroy() {
    try {
      await this.engine.cleanup();
      console.log('GoRules engine cleaned up');
    } catch (error) {
      console.error('Error during GoRules cleanup:', error);
    }
  }
}
```

### React Integration Problems

**Problem:** Engine not working properly in React

**Solutions:**

```typescript
// 1. Proper service initialization
// src/services/goRulesService.ts
class GoRulesServiceSingleton {
  private static instance: ReactGoRulesService | null = null;

  static getInstance(): ReactGoRulesService {
    if (!this.instance) {
      this.instance = new ReactGoRulesService({
        baseUrl: process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000',
        timeout: 10000,
      });
    }
    return this.instance;
  }
}

export const goRulesService = GoRulesServiceSingleton.getInstance();

// 2. Error boundary for GoRules components
class GoRulesErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('GoRules component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h3>GoRules Error</h3>
          <p>Something went wrong with the rules engine.</p>
          <details>
            <summary>Error details</summary>
            <pre>{this.state.error?.message}</pre>
          </details>
          <button onClick={() => this.setState({ hasError: false })}>Try Again</button>
        </div>
      );
    }

    return this.props.children;
  }
}

// 3. Context provider with error handling
const GoRulesContext = React.createContext<{
  service: ReactGoRulesService;
  isOnline: boolean;
  lastError: string | null;
} | null>(null);

export const GoRulesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    // Test connectivity on mount
    const testConnectivity = async () => {
      try {
        await goRulesService.getStatus();
        setIsOnline(true);
        setLastError(null);
      } catch (error) {
        setIsOnline(false);
        setLastError(error instanceof Error ? error.message : 'Connection failed');
      }
    };

    testConnectivity();

    // Test connectivity periodically
    const interval = setInterval(testConnectivity, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <GoRulesErrorBoundary>
      <GoRulesContext.Provider value={{ service: goRulesService, isOnline, lastError }}>
        {children}
      </GoRulesContext.Provider>
    </GoRulesErrorBoundary>
  );
};
```

## Debugging Tools

### Debug Mode Configuration

```typescript
// Enable debug mode
const config: MinimalGoRulesConfig = {
  // ... other config
  enablePerformanceMetrics: true,
  // Add debug flag if available
  debug: process.env.NODE_ENV === 'development',
};

// Custom debug logger
class DebugLogger {
  private enabled: boolean;

  constructor(enabled: boolean = false) {
    this.enabled = enabled;
  }

  log(message: string, data?: any) {
    if (this.enabled) {
      console.log(`[GoRules Debug] ${message}`, data || '');
    }
  }

  error(message: string, error?: any) {
    if (this.enabled) {
      console.error(`[GoRules Debug] ${message}`, error || '');
    }
  }

  time(label: string) {
    if (this.enabled) {
      console.time(`[GoRules Debug] ${label}`);
    }
  }

  timeEnd(label: string) {
    if (this.enabled) {
      console.timeEnd(`[GoRules Debug] ${label}`);
    }
  }
}

const debugLogger = new DebugLogger(process.env.NODE_ENV === 'development');
```

### Diagnostic Tools

```typescript
// Comprehensive diagnostic tool
class GoRulesDiagnostics {
  constructor(private engine: MinimalGoRulesEngine) {}

  async runDiagnostics(): Promise<void> {
    console.log('=== GoRules Engine Diagnostics ===\n');

    await this.checkEngineStatus();
    await this.checkConfiguration();
    await this.checkConnectivity();
    await this.checkRuleExecution();
    await this.checkPerformance();
    await this.checkMemoryUsage();
  }

  private async checkEngineStatus() {
    console.log('1. Engine Status:');
    try {
      const status = await this.engine.getStatus();
      console.log(`   ✅ Initialized: ${status.initialized}`);
      console.log(`   ✅ Rules Loaded: ${status.rulesLoaded}`);
      console.log(`   ✅ Project ID: ${status.projectId}`);
      console.log(`   ✅ Last Update: ${new Date(status.lastUpdate).toISOString()}`);
    } catch (error) {
      console.log(`   ❌ Status check failed: ${error.message}`);
    }
    console.log('');
  }

  private async checkConfiguration() {
    console.log('2. Configuration:');
    try {
      const config = this.engine.getConfig();
      console.log(`   ✅ API URL: ${config.apiUrl}`);
      console.log(`   ✅ Project ID: ${config.projectId}`);
      console.log(`   ✅ Cache Size: ${config.cacheMaxSize}`);
      console.log(`   ✅ Timeout: ${config.httpTimeout}ms`);
      console.log(`   ✅ API Key: ${config.apiKey ? '[SET]' : '[NOT SET]'}`);
    } catch (error) {
      console.log(`   ❌ Configuration check failed: ${error.message}`);
    }
    console.log('');
  }

  private async checkConnectivity() {
    console.log('3. Connectivity:');
    try {
      const startTime = Date.now();
      const response = await fetch('https://api.gorules.io/health');
      const latency = Date.now() - startTime;

      console.log(`   ✅ API Reachable: ${response.ok}`);
      console.log(`   ✅ Response Time: ${latency}ms`);
    } catch (error) {
      console.log(`   ❌ Connectivity failed: ${error.message}`);
    }
    console.log('');
  }

  private async checkRuleExecution() {
    console.log('4. Rule Execution:');
    try {
      const metadata = await this.engine.getAllRuleMetadata();
      const ruleIds = Array.from(metadata.keys());

      if (ruleIds.length === 0) {
        console.log('   ⚠️  No rules available for testing');
        return;
      }

      const testRuleId = ruleIds[0];
      const startTime = Date.now();

      await this.engine.executeRule(testRuleId, { test: true });

      const executionTime = Date.now() - startTime;
      console.log(`   ✅ Test execution successful: ${executionTime}ms`);
    } catch (error) {
      console.log(`   ❌ Rule execution failed: ${error.message}`);
    }
    console.log('');
  }

  private async checkPerformance() {
    console.log('5. Performance:');
    try {
      const perfStats = this.engine.getPerformanceStats();
      console.log(`   ✅ Memory Usage: ${perfStats.memoryUsage.toFixed(2)}MB`);

      if (perfStats.averageExecutionTime) {
        console.log(`   ✅ Avg Execution Time: ${perfStats.averageExecutionTime.toFixed(2)}ms`);
      }

      const cacheStats = this.engine.getCacheStats();
      console.log(`   ✅ Cache Usage: ${cacheStats.size}/${cacheStats.maxSize}`);
    } catch (error) {
      console.log(`   ❌ Performance check failed: ${error.message}`);
    }
    console.log('');
  }

  private async checkMemoryUsage() {
    console.log('6. Memory Usage:');
    try {
      const usage = process.memoryUsage();
      console.log(`   ✅ Heap Used: ${(usage.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`   ✅ Heap Total: ${(usage.heapTotal / 1024 / 1024).toFixed(2)}MB`);
      console.log(`   ✅ External: ${(usage.external / 1024 / 1024).toFixed(2)}MB`);
      console.log(`   ✅ RSS: ${(usage.rss / 1024 / 1024).toFixed(2)}MB`);
    } catch (error) {
      console.log(`   ❌ Memory check failed: ${error.message}`);
    }
    console.log('');
  }
}

// Usage
const diagnostics = new GoRulesDiagnostics(engine);
await diagnostics.runDiagnostics();
```

## FAQ

### Q: Why is my engine not initializing?

**A:** Check the following:

1. Verify your API key and project ID are correct
2. Ensure network connectivity to api.gorules.io
3. Check if your firewall allows outbound HTTPS connections
4. Validate your configuration using `ConfigFactory.validate()`

### Q: Why are my rules not found?

**A:** Common causes:

1. Rule ID spelling mismatch
2. Rules not published in GoRules Cloud
3. Wrong project ID in configuration
4. Cache not refreshed after rule updates

### Q: How can I improve performance?

**A:** Try these optimizations:

1. Enable performance optimizations in config
2. Increase cache size for frequently used rules
3. Use parallel execution for independent rules
4. Enable connection pooling and request batching
5. Monitor and optimize memory usage

### Q: How do I handle network errors?

**A:** Implement retry logic:

1. Use exponential backoff for retries
2. Check network connectivity before operations
3. Configure appropriate timeouts
4. Handle rate limiting gracefully

### Q: Why is memory usage high?

**A:** Check these factors:

1. Cache size might be too large
2. Memory leaks in application code
3. Not calling `engine.cleanup()` on shutdown
4. Too many concurrent operations

### Q: How do I debug rule execution issues?

**A:** Use these debugging techniques:

1. Enable debug logging
2. Test with minimal input data
3. Check rule metadata and validation
4. Use the diagnostic tools provided
5. Monitor execution times and errors

This troubleshooting guide should help resolve most common issues with the Minimal GoRules Engine. For additional support, check the logs and use the diagnostic tools provided.
