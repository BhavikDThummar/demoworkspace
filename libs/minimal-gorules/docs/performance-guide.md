# Performance Guide

Comprehensive guide for optimizing the Minimal GoRules Engine for maximum performance, including benchmarking, tuning, and monitoring.

## Table of Contents

- [Performance Overview](#performance-overview)
- [Configuration Optimization](#configuration-optimization)
- [Memory Management](#memory-management)
- [Network Optimization](#network-optimization)
- [Execution Optimization](#execution-optimization)
- [Benchmarking](#benchmarking)
- [Monitoring](#monitoring)
- [Troubleshooting Performance Issues](#troubleshooting-performance-issues)

## Performance Overview

The Minimal GoRules Engine is designed for high-performance scenarios with the following targets:

### Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Rule Execution Latency | < 1ms | Per rule overhead (excluding business logic) |
| Throughput | > 10,000 rules/sec | On modern hardware (8 cores, 16GB RAM) |
| Memory Footprint | < 50MB | For 1000 cached rules |
| Cache Hit Rate | > 95% | In steady-state operation |
| Startup Time | < 2 seconds | Full initialization with 1000 rules |

### Key Performance Features

- **Zero-Copy Operations**: Minimal data copying during rule execution
- **Efficient Caching**: LRU cache with O(1) operations
- **Connection Pooling**: HTTP connection reuse for API calls
- **Request Batching**: Batch multiple operations for efficiency
- **Memory Management**: Automatic cleanup and garbage collection optimization
- **Compression**: Gzip compression for rule data transfer

## Configuration Optimization

### Basic Performance Configuration

```typescript
const config: MinimalGoRulesConfig = {
  apiUrl: 'https://api.gorules.io',
  apiKey: process.env.GORULES_API_KEY!,
  projectId: 'your-project-id',
  
  // Cache optimization
  cacheMaxSize: 5000,              // Increase for more rules
  
  // Network optimization
  httpTimeout: 10000,              // Longer timeout for stability
  batchSize: 100,                  // Larger batches for efficiency
  
  // Platform optimization
  platform: 'node',                // Optimize for Node.js
  
  // Enable performance features
  enablePerformanceOptimizations: true,
  enablePerformanceMetrics: true,
  enableConnectionPooling: true,
  enableRequestBatching: true,
  enableCompression: true,
  compressionAlgorithm: 'gzip'
};
```

### High-Performance Configuration

```typescript
const highPerfConfig: MinimalGoRulesConfig = {
  apiUrl: 'https://api.gorules.io',
  apiKey: process.env.GORULES_API_KEY!,
  projectId: 'your-project-id',
  
  // Aggressive caching
  cacheMaxSize: 10000,             // Large cache for high-throughput
  
  // Network optimization
  httpTimeout: 15000,              // Stable timeout
  batchSize: 200,                  // Large batches
  
  // Performance optimizations
  enablePerformanceOptimizations: true,
  enablePerformanceMetrics: true,
  enableConnectionPooling: true,
  enableRequestBatching: true,
  enableCompression: true,
  compressionAlgorithm: 'gzip',
  
  // Memory management
  memoryWarningThreshold: 0.8,     // Higher threshold for performance
  memoryCriticalThreshold: 0.9,    // Higher critical threshold
  memoryCleanupInterval: 60000     // Less frequent cleanup
};
```

### Environment-Specific Configurations

#### Production Configuration
```typescript
const productionConfig: MinimalGoRulesConfig = {
  // ... base config
  cacheMaxSize: 10000,
  httpTimeout: 15000,
  batchSize: 200,
  enablePerformanceOptimizations: true,
  enablePerformanceMetrics: true,
  memoryWarningThreshold: 0.85,
  memoryCriticalThreshold: 0.95,
  memoryCleanupInterval: 30000
};
```

#### Development Configuration
```typescript
const developmentConfig: MinimalGoRulesConfig = {
  // ... base config
  cacheMaxSize: 1000,
  httpTimeout: 5000,
  batchSize: 50,
  enablePerformanceOptimizations: false,  // Easier debugging
  enablePerformanceMetrics: true,         // Monitor during development
  memoryWarningThreshold: 0.7,
  memoryCriticalThreshold: 0.85
};
```

## Memory Management

### Memory Optimization Strategies

#### 1. Cache Size Tuning

```typescript
// Calculate optimal cache size based on available memory
function calculateOptimalCacheSize(): number {
  const totalMemory = process.memoryUsage().heapTotal;
  const availableMemory = totalMemory * 0.3; // Use 30% for cache
  const avgRuleSize = 50 * 1024; // 50KB per rule (estimate)
  
  return Math.floor(availableMemory / avgRuleSize);
}

const config: MinimalGoRulesConfig = {
  // ... other config
  cacheMaxSize: calculateOptimalCacheSize()
};
```

#### 2. Memory Monitoring

```typescript
// Monitor memory usage and trigger cleanup
class MemoryMonitor {
  private engine: MinimalGoRulesEngine;
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor(engine: MinimalGoRulesEngine) {
    this.engine = engine;
  }

  startMonitoring(intervalMs: number = 30000) {
    this.monitoringInterval = setInterval(() => {
      const memUsage = process.memoryUsage();
      const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
      const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
      const usage = heapUsedMB / heapTotalMB;

      console.log(`Memory usage: ${heapUsedMB.toFixed(2)}MB / ${heapTotalMB.toFixed(2)}MB (${(usage * 100).toFixed(1)}%)`);

      // Trigger cleanup if memory usage is high
      if (usage > 0.8) {
        console.log('High memory usage detected, triggering cleanup...');
        this.triggerCleanup();
      }
    }, intervalMs);
  }

  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  private async triggerCleanup() {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    // Get performance stats to check if cleanup helped
    const stats = this.engine.getPerformanceStats();
    console.log(`Memory after cleanup: ${stats.memoryUsage.toFixed(2)}MB`);
  }
}

// Usage
const memoryMonitor = new MemoryMonitor(engine);
memoryMonitor.startMonitoring(30000); // Monitor every 30 seconds
```

#### 3. Memory Leak Detection

```typescript
// Detect potential memory leaks
class MemoryLeakDetector {
  private baselineMemory: number = 0;
  private measurements: number[] = [];

  startBaseline() {
    // Force GC before baseline
    if (global.gc) global.gc();
    this.baselineMemory = process.memoryUsage().heapUsed;
    console.log(`Memory baseline: ${(this.baselineMemory / 1024 / 1024).toFixed(2)}MB`);
  }

  takeMeasurement(label: string) {
    if (global.gc) global.gc();
    const currentMemory = process.memoryUsage().heapUsed;
    const diff = currentMemory - this.baselineMemory;
    
    this.measurements.push(diff);
    console.log(`${label}: ${(diff / 1024 / 1024).toFixed(2)}MB increase from baseline`);

    // Detect potential leak (memory consistently increasing)
    if (this.measurements.length >= 5) {
      const recent = this.measurements.slice(-5);
      const isIncreasing = recent.every((val, i) => i === 0 || val > recent[i - 1]);
      
      if (isIncreasing) {
        console.warn('Potential memory leak detected - memory consistently increasing');
      }
    }
  }

  reset() {
    this.measurements = [];
    this.startBaseline();
  }
}
```

## Network Optimization

### Connection Pooling

```typescript
// Configure HTTP agents for connection pooling
import { Agent as HttpAgent } from 'http';
import { Agent as HttpsAgent } from 'https';

const httpAgent = new HttpAgent({
  keepAlive: true,
  maxSockets: 100,        // Max concurrent connections
  maxFreeSockets: 10,     // Keep connections alive
  timeout: 60000,         // Socket timeout
  freeSocketTimeout: 30000 // Free socket timeout
});

const httpsAgent = new HttpsAgent({
  keepAlive: true,
  maxSockets: 100,
  maxFreeSockets: 10,
  timeout: 60000,
  freeSocketTimeout: 30000
});

// Use with HTTP client
const config = {
  // ... other config
  httpAgent,
  httpsAgent
};
```

### Request Batching

```typescript
// Batch multiple rule operations
class RequestBatcher {
  private batchQueue: Array<{
    ruleId: string;
    input: Record<string, unknown>;
    resolve: (result: any) => void;
    reject: (error: Error) => void;
  }> = [];
  private batchTimeout: NodeJS.Timeout | null = null;
  private readonly batchSize: number;
  private readonly batchDelayMs: number;

  constructor(
    private engine: MinimalGoRulesEngine,
    batchSize: number = 50,
    batchDelayMs: number = 10
  ) {
    this.batchSize = batchSize;
    this.batchDelayMs = batchDelayMs;
  }

  async executeRule<T>(ruleId: string, input: Record<string, unknown>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.batchQueue.push({ ruleId, input, resolve, reject });

      // Process batch if it's full
      if (this.batchQueue.length >= this.batchSize) {
        this.processBatch();
      } else {
        // Set timeout to process batch
        if (!this.batchTimeout) {
          this.batchTimeout = setTimeout(() => {
            this.processBatch();
          }, this.batchDelayMs);
        }
      }
    });
  }

  private async processBatch() {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    const batch = this.batchQueue.splice(0, this.batchSize);
    if (batch.length === 0) return;

    try {
      // Execute all rules in parallel
      const promises = batch.map(async ({ ruleId, input, resolve, reject }) => {
        try {
          const result = await this.engine.executeRule(ruleId, input);
          resolve(result);
        } catch (error) {
          reject(error as Error);
        }
      });

      await Promise.all(promises);
    } catch (error) {
      // This shouldn't happen since we handle errors individually
      console.error('Batch processing error:', error);
    }
  }
}
```

### Compression Optimization

```typescript
// Configure compression for optimal performance
import { gzip, gunzip } from 'zlib';
import { promisify } from 'util';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

class CompressionOptimizer {
  async compressRuleData(data: Buffer): Promise<Buffer> {
    // Only compress if data is large enough to benefit
    if (data.length < 1024) {
      return data;
    }

    const compressed = await gzipAsync(data, {
      level: 6, // Balance between compression ratio and speed
      windowBits: 15,
      memLevel: 8
    });

    // Only use compressed version if it's significantly smaller
    return compressed.length < data.length * 0.8 ? compressed : data;
  }

  async decompressRuleData(data: Buffer): Promise<Buffer> {
    try {
      return await gunzipAsync(data);
    } catch {
      // Data might not be compressed
      return data;
    }
  }
}
```

## Execution Optimization

### Parallel Execution Tuning

```typescript
// Optimize parallel execution based on system resources
class ExecutionOptimizer {
  private readonly maxConcurrency: number;

  constructor() {
    // Calculate optimal concurrency based on CPU cores
    const cpuCores = require('os').cpus().length;
    this.maxConcurrency = Math.max(cpuCores * 2, 8); // At least 8, up to 2x CPU cores
  }

  async executeRulesOptimized<T>(
    engine: MinimalGoRulesEngine,
    ruleIds: string[],
    input: Record<string, unknown>
  ): Promise<Map<string, T>> {
    const results = new Map<string, T>();
    const errors = new Map<string, Error>();

    // Process rules in batches to avoid overwhelming the system
    for (let i = 0; i < ruleIds.length; i += this.maxConcurrency) {
      const batch = ruleIds.slice(i, i + this.maxConcurrency);
      
      const batchPromises = batch.map(async (ruleId) => {
        try {
          const result = await engine.executeRule<T>(ruleId, input);
          results.set(ruleId, result);
        } catch (error) {
          errors.set(ruleId, error as Error);
        }
      });

      await Promise.all(batchPromises);
    }

    if (errors.size > 0) {
      console.warn(`${errors.size} rules failed execution`);
    }

    return results;
  }
}
```

### Rule Execution Caching

```typescript
// Cache rule execution results for identical inputs
class ExecutionCache {
  private cache = new Map<string, {
    result: any;
    timestamp: number;
    ttl: number;
  }>();

  private createKey(ruleId: string, input: Record<string, unknown>): string {
    // Create deterministic hash of input
    const inputStr = JSON.stringify(input, Object.keys(input).sort());
    return `${ruleId}:${this.hash(inputStr)}`;
  }

  private hash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  async executeWithCache<T>(
    engine: MinimalGoRulesEngine,
    ruleId: string,
    input: Record<string, unknown>,
    ttlMs: number = 300000 // 5 minutes
  ): Promise<T> {
    const key = this.createKey(ruleId, input);
    const cached = this.cache.get(key);

    // Return cached result if valid
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.result;
    }

    // Execute rule and cache result
    const result = await engine.executeRule<T>(ruleId, input);
    
    this.cache.set(key, {
      result,
      timestamp: Date.now(),
      ttl: ttlMs
    });

    return result;
  }

  clearExpired() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp >= entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  getStats() {
    return {
      size: this.cache.size,
      entries: this.cache.size
    };
  }
}
```

## Benchmarking

### Performance Benchmarking Suite

```typescript
// Comprehensive benchmarking suite
class PerformanceBenchmark {
  private engine: MinimalGoRulesEngine;
  private results: Array<{
    test: string;
    duration: number;
    throughput: number;
    memoryUsage: number;
  }> = [];

  constructor(engine: MinimalGoRulesEngine) {
    this.engine = engine;
  }

  async runAllBenchmarks(): Promise<void> {
    console.log('Starting performance benchmarks...\n');

    await this.benchmarkSingleRuleExecution();
    await this.benchmarkParallelExecution();
    await this.benchmarkSequentialExecution();
    await this.benchmarkCachePerformance();
    await this.benchmarkMemoryUsage();

    this.printResults();
  }

  private async benchmarkSingleRuleExecution(): Promise<void> {
    console.log('Benchmarking single rule execution...');
    
    const iterations = 1000;
    const ruleId = 'benchmark-rule';
    const input = { userId: 123, amount: 100 };

    const startTime = process.hrtime.bigint();
    const startMemory = process.memoryUsage().heapUsed;

    for (let i = 0; i < iterations; i++) {
      await this.engine.executeRule(ruleId, input);
    }

    const endTime = process.hrtime.bigint();
    const endMemory = process.memoryUsage().heapUsed;

    const durationMs = Number(endTime - startTime) / 1_000_000;
    const throughput = iterations / (durationMs / 1000);
    const memoryIncrease = (endMemory - startMemory) / 1024 / 1024;

    this.results.push({
      test: 'Single Rule Execution',
      duration: durationMs,
      throughput,
      memoryUsage: memoryIncrease
    });

    console.log(`  Duration: ${durationMs.toFixed(2)}ms`);
    console.log(`  Throughput: ${throughput.toFixed(0)} rules/sec`);
    console.log(`  Memory increase: ${memoryIncrease.toFixed(2)}MB\n`);
  }

  private async benchmarkParallelExecution(): Promise<void> {
    console.log('Benchmarking parallel execution...');
    
    const ruleIds = Array.from({ length: 100 }, (_, i) => `rule-${i}`);
    const input = { userId: 123, amount: 100 };

    const startTime = process.hrtime.bigint();
    const startMemory = process.memoryUsage().heapUsed;

    await this.engine.executeRules(ruleIds, input);

    const endTime = process.hrtime.bigint();
    const endMemory = process.memoryUsage().heapUsed;

    const durationMs = Number(endTime - startTime) / 1_000_000;
    const throughput = ruleIds.length / (durationMs / 1000);
    const memoryIncrease = (endMemory - startMemory) / 1024 / 1024;

    this.results.push({
      test: 'Parallel Execution (100 rules)',
      duration: durationMs,
      throughput,
      memoryUsage: memoryIncrease
    });

    console.log(`  Duration: ${durationMs.toFixed(2)}ms`);
    console.log(`  Throughput: ${throughput.toFixed(0)} rules/sec`);
    console.log(`  Memory increase: ${memoryIncrease.toFixed(2)}MB\n`);
  }

  private async benchmarkSequentialExecution(): Promise<void> {
    console.log('Benchmarking sequential execution...');
    
    const ruleIds = Array.from({ length: 50 }, (_, i) => `rule-${i}`);
    const input = { userId: 123, amount: 100 };

    const startTime = process.hrtime.bigint();
    const startMemory = process.memoryUsage().heapUsed;

    await this.engine.executeByTags(['benchmark'], input, 'sequential');

    const endTime = process.hrtime.bigint();
    const endMemory = process.memoryUsage().heapUsed;

    const durationMs = Number(endTime - startTime) / 1_000_000;
    const throughput = ruleIds.length / (durationMs / 1000);
    const memoryIncrease = (endMemory - startMemory) / 1024 / 1024;

    this.results.push({
      test: 'Sequential Execution (50 rules)',
      duration: durationMs,
      throughput,
      memoryUsage: memoryIncrease
    });

    console.log(`  Duration: ${durationMs.toFixed(2)}ms`);
    console.log(`  Throughput: ${throughput.toFixed(0)} rules/sec`);
    console.log(`  Memory increase: ${memoryIncrease.toFixed(2)}MB\n`);
  }

  private async benchmarkCachePerformance(): Promise<void> {
    console.log('Benchmarking cache performance...');
    
    const ruleId = 'cache-test-rule';
    const input = { userId: 123 };
    const iterations = 10000;

    // Warm up cache
    await this.engine.executeRule(ruleId, input);

    const startTime = process.hrtime.bigint();

    for (let i = 0; i < iterations; i++) {
      await this.engine.executeRule(ruleId, input);
    }

    const endTime = process.hrtime.bigint();
    const durationMs = Number(endTime - startTime) / 1_000_000;
    const throughput = iterations / (durationMs / 1000);

    this.results.push({
      test: 'Cache Performance (10k hits)',
      duration: durationMs,
      throughput,
      memoryUsage: 0
    });

    console.log(`  Duration: ${durationMs.toFixed(2)}ms`);
    console.log(`  Throughput: ${throughput.toFixed(0)} rules/sec\n`);
  }

  private async benchmarkMemoryUsage(): Promise<void> {
    console.log('Benchmarking memory usage...');
    
    const initialMemory = process.memoryUsage().heapUsed;
    
    // Load many rules to test memory usage
    const status = await this.engine.getStatus();
    const finalMemory = process.memoryUsage().heapUsed;
    
    const memoryUsage = (finalMemory - initialMemory) / 1024 / 1024;
    const memoryPerRule = memoryUsage / status.rulesLoaded;

    console.log(`  Total memory usage: ${memoryUsage.toFixed(2)}MB`);
    console.log(`  Memory per rule: ${(memoryPerRule * 1024).toFixed(2)}KB`);
    console.log(`  Rules loaded: ${status.rulesLoaded}\n`);
  }

  private printResults(): void {
    console.log('=== BENCHMARK RESULTS ===\n');
    
    this.results.forEach(result => {
      console.log(`${result.test}:`);
      console.log(`  Duration: ${result.duration.toFixed(2)}ms`);
      console.log(`  Throughput: ${result.throughput.toFixed(0)} rules/sec`);
      if (result.memoryUsage > 0) {
        console.log(`  Memory: ${result.memoryUsage.toFixed(2)}MB`);
      }
      console.log('');
    });

    // Performance targets check
    const singleRuleResult = this.results.find(r => r.test === 'Single Rule Execution');
    if (singleRuleResult) {
      const avgLatency = singleRuleResult.duration / 1000; // Per rule in ms
      console.log(`Average rule latency: ${avgLatency.toFixed(3)}ms`);
      console.log(`Target met (< 1ms): ${avgLatency < 1 ? '✅' : '❌'}`);
      console.log(`Throughput target met (> 10k/sec): ${singleRuleResult.throughput > 10000 ? '✅' : '❌'}`);
    }
  }
}

// Usage
const benchmark = new PerformanceBenchmark(engine);
await benchmark.runAllBenchmarks();
```

### Load Testing

```typescript
// Load testing for concurrent scenarios
class LoadTester {
  private engine: MinimalGoRulesEngine;

  constructor(engine: MinimalGoRulesEngine) {
    this.engine = engine;
  }

  async runLoadTest(
    concurrentUsers: number,
    requestsPerUser: number,
    ruleId: string
  ): Promise<void> {
    console.log(`Starting load test: ${concurrentUsers} users, ${requestsPerUser} requests each`);

    const startTime = Date.now();
    const promises: Promise<void>[] = [];

    for (let user = 0; user < concurrentUsers; user++) {
      promises.push(this.simulateUser(user, requestsPerUser, ruleId));
    }

    await Promise.all(promises);

    const endTime = Date.now();
    const totalRequests = concurrentUsers * requestsPerUser;
    const durationSec = (endTime - startTime) / 1000;
    const throughput = totalRequests / durationSec;

    console.log(`Load test completed:`);
    console.log(`  Total requests: ${totalRequests}`);
    console.log(`  Duration: ${durationSec.toFixed(2)}s`);
    console.log(`  Throughput: ${throughput.toFixed(0)} requests/sec`);
  }

  private async simulateUser(
    userId: number,
    requests: number,
    ruleId: string
  ): Promise<void> {
    for (let i = 0; i < requests; i++) {
      try {
        await this.engine.executeRule(ruleId, {
          userId,
          requestId: i,
          timestamp: Date.now()
        });
      } catch (error) {
        console.error(`User ${userId} request ${i} failed:`, error);
      }
    }
  }
}
```

## Monitoring

### Performance Monitoring

```typescript
// Real-time performance monitoring
class PerformanceMonitor {
  private engine: MinimalGoRulesEngine;
  private metrics: {
    executionTimes: number[];
    errorCount: number;
    totalExecutions: number;
    startTime: number;
  };

  constructor(engine: MinimalGoRulesEngine) {
    this.engine = engine;
    this.metrics = {
      executionTimes: [],
      errorCount: 0,
      totalExecutions: 0,
      startTime: Date.now()
    };
  }

  async executeRuleWithMonitoring<T>(
    ruleId: string,
    input: Record<string, unknown>
  ): Promise<T> {
    const startTime = process.hrtime.bigint();
    
    try {
      const result = await this.engine.executeRule<T>(ruleId, input);
      
      const endTime = process.hrtime.bigint();
      const executionTime = Number(endTime - startTime) / 1_000_000; // Convert to ms
      
      this.recordExecution(executionTime);
      return result;
    } catch (error) {
      this.metrics.errorCount++;
      throw error;
    }
  }

  private recordExecution(executionTime: number): void {
    this.metrics.executionTimes.push(executionTime);
    this.metrics.totalExecutions++;

    // Keep only last 1000 execution times
    if (this.metrics.executionTimes.length > 1000) {
      this.metrics.executionTimes.shift();
    }
  }

  getMetrics() {
    const executionTimes = this.metrics.executionTimes;
    const uptime = Date.now() - this.metrics.startTime;

    if (executionTimes.length === 0) {
      return {
        totalExecutions: this.metrics.totalExecutions,
        errorCount: this.metrics.errorCount,
        errorRate: 0,
        averageExecutionTime: 0,
        p95ExecutionTime: 0,
        p99ExecutionTime: 0,
        throughput: 0,
        uptime
      };
    }

    const sorted = [...executionTimes].sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);
    const p99Index = Math.floor(sorted.length * 0.99);

    return {
      totalExecutions: this.metrics.totalExecutions,
      errorCount: this.metrics.errorCount,
      errorRate: this.metrics.errorCount / this.metrics.totalExecutions,
      averageExecutionTime: executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length,
      p95ExecutionTime: sorted[p95Index] || 0,
      p99ExecutionTime: sorted[p99Index] || 0,
      throughput: this.metrics.totalExecutions / (uptime / 1000),
      uptime
    };
  }

  printMetrics(): void {
    const metrics = this.getMetrics();
    
    console.log('=== PERFORMANCE METRICS ===');
    console.log(`Total Executions: ${metrics.totalExecutions}`);
    console.log(`Error Count: ${metrics.errorCount}`);
    console.log(`Error Rate: ${(metrics.errorRate * 100).toFixed(2)}%`);
    console.log(`Average Execution Time: ${metrics.averageExecutionTime.toFixed(2)}ms`);
    console.log(`P95 Execution Time: ${metrics.p95ExecutionTime.toFixed(2)}ms`);
    console.log(`P99 Execution Time: ${metrics.p99ExecutionTime.toFixed(2)}ms`);
    console.log(`Throughput: ${metrics.throughput.toFixed(0)} requests/sec`);
    console.log(`Uptime: ${(metrics.uptime / 1000).toFixed(0)}s`);
  }
}
```

### Health Monitoring

```typescript
// Health monitoring for production systems
class HealthMonitor {
  private engine: MinimalGoRulesEngine;
  private healthChecks: Map<string, () => Promise<boolean>> = new Map();

  constructor(engine: MinimalGoRulesEngine) {
    this.engine = engine;
    this.setupHealthChecks();
  }

  private setupHealthChecks(): void {
    this.healthChecks.set('engine_initialized', async () => {
      const status = await this.engine.getStatus();
      return status.initialized;
    });

    this.healthChecks.set('rules_loaded', async () => {
      const status = await this.engine.getStatus();
      return status.rulesLoaded > 0;
    });

    this.healthChecks.set('memory_usage', async () => {
      const stats = this.engine.getPerformanceStats();
      return stats.memoryUsage < 500; // Less than 500MB
    });

    this.healthChecks.set('cache_functional', async () => {
      try {
        const cacheStats = this.engine.getCacheStats();
        return cacheStats.size >= 0; // Cache is accessible
      } catch {
        return false;
      }
    });
  }

  async checkHealth(): Promise<{
    healthy: boolean;
    checks: Record<string, boolean>;
    timestamp: number;
  }> {
    const checks: Record<string, boolean> = {};
    let allHealthy = true;

    for (const [name, check] of this.healthChecks) {
      try {
        checks[name] = await check();
        if (!checks[name]) {
          allHealthy = false;
        }
      } catch (error) {
        checks[name] = false;
        allHealthy = false;
        console.error(`Health check ${name} failed:`, error);
      }
    }

    return {
      healthy: allHealthy,
      checks,
      timestamp: Date.now()
    };
  }

  async startHealthMonitoring(intervalMs: number = 30000): Promise<void> {
    setInterval(async () => {
      const health = await this.checkHealth();
      
      if (!health.healthy) {
        console.warn('Health check failed:', health.checks);
      } else {
        console.log('Health check passed');
      }
    }, intervalMs);
  }
}
```

## Troubleshooting Performance Issues

### Common Performance Issues

#### 1. High Memory Usage

**Symptoms:**
- Memory usage continuously increasing
- Out of memory errors
- Slow garbage collection

**Solutions:**
```typescript
// Reduce cache size
const config = {
  // ... other config
  cacheMaxSize: 1000, // Reduce from higher value
  memoryWarningThreshold: 0.7,
  memoryCriticalThreshold: 0.85
};

// Enable more aggressive cleanup
const memoryManager = getGlobalMemoryManager({
  warningThreshold: 0.6,
  criticalThreshold: 0.75,
  cleanupInterval: 15000 // More frequent cleanup
});
```

#### 2. Slow Rule Execution

**Symptoms:**
- High execution latency
- Low throughput
- Timeouts

**Solutions:**
```typescript
// Enable performance optimizations
const config = {
  // ... other config
  enablePerformanceOptimizations: true,
  enableConnectionPooling: true,
  enableRequestBatching: true,
  batchSize: 100, // Increase batch size
  httpTimeout: 15000 // Increase timeout
};

// Use execution caching
const executionCache = new ExecutionCache();
const result = await executionCache.executeWithCache(engine, ruleId, input);
```

#### 3. Network Issues

**Symptoms:**
- Frequent network errors
- High latency to GoRules API
- Connection timeouts

**Solutions:**
```typescript
// Optimize network configuration
const config = {
  // ... other config
  httpTimeout: 20000, // Increase timeout
  enableConnectionPooling: true,
  enableCompression: true
};

// Implement retry logic
class RetryableEngine {
  async executeRuleWithRetry<T>(
    ruleId: string,
    input: Record<string, unknown>,
    maxRetries: number = 3
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.engine.executeRule<T>(ruleId, input);
      } catch (error) {
        if (attempt === maxRetries) throw error;
        
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw new Error('Max retries exceeded');
  }
}
```

#### 4. Cache Inefficiency

**Symptoms:**
- Low cache hit rate
- Frequent rule reloading
- High API usage

**Solutions:**
```typescript
// Optimize cache configuration
const config = {
  // ... other config
  cacheMaxSize: 5000, // Increase cache size
};

// Monitor cache performance
const cacheMonitor = {
  logCacheStats: () => {
    const stats = engine.getCacheStats();
    console.log(`Cache: ${stats.size}/${stats.maxSize} rules`);
    if (stats.hitRate) {
      console.log(`Hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);
    }
  }
};

setInterval(cacheMonitor.logCacheStats, 60000); // Log every minute
```

### Performance Debugging Tools

```typescript
// Performance debugging utility
class PerformanceDebugger {
  private timers: Map<string, bigint> = new Map();

  startTimer(name: string): void {
    this.timers.set(name, process.hrtime.bigint());
  }

  endTimer(name: string): number {
    const startTime = this.timers.get(name);
    if (!startTime) {
      throw new Error(`Timer ${name} not found`);
    }

    const endTime = process.hrtime.bigint();
    const durationMs = Number(endTime - startTime) / 1_000_000;
    
    console.log(`${name}: ${durationMs.toFixed(2)}ms`);
    this.timers.delete(name);
    
    return durationMs;
  }

  async profileFunction<T>(name: string, fn: () => Promise<T>): Promise<T> {
    this.startTimer(name);
    try {
      return await fn();
    } finally {
      this.endTimer(name);
    }
  }

  memorySnapshot(label: string): void {
    const usage = process.memoryUsage();
    console.log(`${label} - Memory usage:`);
    console.log(`  Heap Used: ${(usage.heapUsed / 1024 / 1024).toFixed(2)}MB`);
    console.log(`  Heap Total: ${(usage.heapTotal / 1024 / 1024).toFixed(2)}MB`);
    console.log(`  External: ${(usage.external / 1024 / 1024).toFixed(2)}MB`);
  }
}

// Usage
const debugger = new PerformanceDebugger();

// Profile rule execution
const result = await debugger.profileFunction('rule-execution', async () => {
  return await engine.executeRule('my-rule', input);
});

// Take memory snapshots
debugger.memorySnapshot('Before rule execution');
await engine.executeRule('my-rule', input);
debugger.memorySnapshot('After rule execution');
```

This comprehensive performance guide provides all the tools and techniques needed to optimize the Minimal GoRules Engine for maximum performance in production environments.