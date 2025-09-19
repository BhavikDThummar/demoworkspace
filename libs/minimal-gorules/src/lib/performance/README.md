# Performance Optimizations and Memory Management

This module provides comprehensive performance optimizations and memory management features for the Minimal GoRules Engine.

## Features

### 1. Memory Management (`memory-manager.ts`)

Automatic memory monitoring and cleanup with configurable thresholds.

```typescript
import { MemoryManager, getGlobalMemoryManager } from '@org/minimal-gorules';

// Get global memory manager
const memoryManager = getGlobalMemoryManager({
  warningThreshold: 0.7,    // 70% of heap limit
  criticalThreshold: 0.85,  // 85% of heap limit
  cleanupInterval: 30000    // 30 seconds
});

// Start monitoring
memoryManager.startMonitoring(5000); // Check every 5 seconds

// Register cleanup callback
memoryManager.registerCleanupCallback(async () => {
  // Your cleanup logic here
  console.log('Performing cleanup...');
});

// Get memory report
const report = memoryManager.getMemoryReport();
console.log('Memory usage:', report.usage.percentage);
```

### 2. Connection Pooling (`connection-pool.ts`)

HTTP connection pooling for efficient API requests to GoRules Cloud.

```typescript
import { ConnectionPool } from '@org/minimal-gorules';

const pool = new ConnectionPool(
  'https://api.gorules.io',
  { 'Authorization': 'Bearer your-token' },
  {
    maxConnections: 10,
    maxRequestsPerConnection: 100,
    connectionTimeout: 5000,
    keepAliveTimeout: 30000
  }
);

// Make requests
const response = await pool.request({
  method: 'GET',
  path: '/api/v1/projects/123/rules'
});

// Get statistics
const stats = pool.getStats();
console.log('Connection reuses:', stats.connectionReuses);
```

### 3. Request Batching (`request-batcher.ts`)

Batch multiple API requests for better performance.

```typescript
import { RequestBatcher } from '@org/minimal-gorules';

const batcher = new RequestBatcher(
  async (requests) => {
    // Batch executor - process multiple requests at once
    const results = new Map();
    for (const [id, request] of requests) {
      results.set(id, await processRequest(request));
    }
    return { results, errors: new Map(), batchSize: requests.size, executionTime: 0 };
  },
  {
    maxBatchSize: 50,
    maxWaitTime: 100,
    maxConcurrentBatches: 5
  }
);

// Add requests (they will be automatically batched)
const result1 = await batcher.addRequest('req1', { data: 'test1' });
const result2 = await batcher.addRequest('req2', { data: 'test2' });
```

### 4. Compression (`compression.ts`)

Data compression for rule storage and transfer.

```typescript
import { CompressionManager } from '@org/minimal-gorules';

const compression = new CompressionManager({
  algorithm: 'gzip',
  level: 6,
  threshold: 1024 // Don't compress data smaller than 1KB
});

// Compress data
const result = await compression.compress(ruleData);
console.log('Compression ratio:', result.compressionRatio);

// Decompress data
const decompressed = await compression.decompress(result.data, result.algorithm);
```

### 5. Performance Testing (`performance-tests.ts`)

Comprehensive performance testing and benchmarking.

```typescript
import { PerformanceBenchmark } from '@org/minimal-gorules';

const benchmark = new PerformanceBenchmark(
  {
    iterations: 1000,
    warmupIterations: 100,
    concurrency: 10,
    timeout: 30000
  },
  {
    maxLatency: 50,        // 50ms max
    minThroughput: 1000,   // 1000 ops/sec min
    maxMemoryPerOperation: 1024 * 1024 // 1MB max
  }
);

// Run performance test
const result = await benchmark.runTest('my-test', async () => {
  // Your test code here
  await someOperation();
});

// Run benchmark suite
const suiteResult = await benchmark.runBenchmarkSuite('My Suite', [
  { name: 'Test 1', test: async () => { /* test code */ } },
  { name: 'Test 2', test: async () => { /* test code */ }, type: 'throughput' }
]);
```

## Engine Integration

Enable performance optimizations in your engine configuration:

```typescript
import { MinimalGoRulesEngine } from '@org/minimal-gorules';

const engine = new MinimalGoRulesEngine({
  apiUrl: 'https://api.gorules.io',
  apiKey: 'your-api-key',
  projectId: 'your-project-id',
  
  // Enable performance optimizations
  enablePerformanceOptimizations: true,
  enablePerformanceMetrics: true,
  
  // Memory management
  memoryWarningThreshold: 0.7,
  memoryCriticalThreshold: 0.85,
  memoryCleanupInterval: 30000,
  
  // Connection pooling
  enableConnectionPooling: true,
  
  // Request batching
  enableRequestBatching: true,
  
  // Compression
  enableCompression: true,
  compressionAlgorithm: 'gzip'
});

// Initialize with optimizations
await engine.initialize();

// Get performance report
const report = engine.getPerformanceReport();
console.log('Performance stats:', report);
```

## Performance Monitoring

Monitor engine performance in real-time:

```typescript
// Get current status with performance metrics
const status = await engine.getStatus();
console.log('Memory usage:', status.performance?.memoryUsage);
console.log('Average execution time:', status.performance?.averageExecutionTime);

// Get detailed performance report
const report = engine.getPerformanceReport();
console.log('Connection pool stats:', report.connectionPool);
console.log('Batching efficiency:', report.batching?.ruleLoad?.batchEfficiency);
console.log('Compression stats:', report.compression);
```

## Best Practices

### Memory Management

1. **Enable monitoring**: Always enable memory monitoring in production
2. **Set appropriate thresholds**: Configure warning and critical thresholds based on your environment
3. **Register cleanup callbacks**: Implement custom cleanup logic for your application
4. **Monitor trends**: Watch for increasing memory usage patterns

### Connection Pooling

1. **Tune pool size**: Adjust `maxConnections` based on your API rate limits
2. **Monitor reuse**: High connection reuse indicates good performance
3. **Handle timeouts**: Configure appropriate timeouts for your network conditions
4. **Use keep-alive**: Enable keep-alive for better connection reuse

### Request Batching

1. **Optimize batch size**: Balance between latency and throughput
2. **Monitor efficiency**: Aim for high batch efficiency (>70%)
3. **Handle errors**: Implement proper error handling for batch failures
4. **Use priorities**: Prioritize critical requests in batches

### Compression

1. **Choose algorithm**: gzip for better compression, deflate for speed
2. **Set thresholds**: Don't compress small data (< 1KB)
3. **Monitor ratios**: Good compression should achieve 20-50% reduction
4. **Consider CPU**: Balance compression benefits vs CPU usage

## Performance Requirements

The engine is designed to meet these performance requirements:

- **Latency**: < 50ms average rule execution time
- **Throughput**: > 1000 operations per second
- **Memory**: < 1MB memory per operation
- **Memory Growth**: < 1KB growth per operation
- **Compression**: > 20% size reduction for rule data
- **Connection Reuse**: > 80% connection reuse rate

## Troubleshooting

### High Memory Usage

1. Check memory monitoring logs
2. Verify cleanup callbacks are working
3. Look for memory leaks in custom code
4. Consider reducing cache size

### Poor Performance

1. Enable performance metrics
2. Check connection pool statistics
3. Monitor batch efficiency
4. Verify compression is working

### Connection Issues

1. Check connection pool configuration
2. Monitor timeout settings
3. Verify API rate limits
4. Check network connectivity

## Testing

Run performance tests to validate your configuration:

```bash
# Run performance tests
npm test -- --testNamePattern="Performance"

# Run with memory profiling
node --expose-gc --max-old-space-size=4096 npm test
```

The performance tests validate:
- Memory management efficiency
- Connection pool performance
- Request batching effectiveness
- Compression ratios and speed
- Overall system throughput and latency