/**
 * Advanced Usage Examples for Minimal GoRules Engine
 * 
 * This file demonstrates advanced usage patterns including mixed execution modes,
 * performance optimization, error handling, and monitoring.
 */

import { 
  MinimalGoRulesEngine, 
  MinimalGoRulesConfig, 
  RuleSelector,
  MinimalGoRulesError,
  MinimalErrorCode
} from '../src/index.js';

// High-performance configuration
const advancedConfig: MinimalGoRulesConfig = {
  apiUrl: 'https://api.gorules.io',
  apiKey: process.env.GORULES_API_KEY!,
  projectId: 'your-project-id',
  
  // Performance optimizations
  cacheMaxSize: 5000,
  httpTimeout: 15000,
  batchSize: 100,
  enablePerformanceOptimizations: true,
  enablePerformanceMetrics: true,
  enableConnectionPooling: true,
  enableRequestBatching: true,
  enableCompression: true,
  
  // Memory management
  memoryWarningThreshold: 0.8,
  memoryCriticalThreshold: 0.9,
  memoryCleanupInterval: 30000
};

async function advancedUsageExamples() {
  console.log('=== Advanced Usage Examples ===\n');

  const engine = new MinimalGoRulesEngine(advancedConfig);
  await engine.initialize();

  // 1. Mixed execution mode
  await demonstrateMixedExecution(engine);

  // 2. Advanced error handling
  await demonstrateErrorHandling(engine);

  // 3. Performance monitoring
  await demonstratePerformanceMonitoring(engine);

  // 4. Version management
  await demonstrateVersionManagement(engine);

  // 5. Batch processing
  await demonstrateBatchProcessing(engine);

  // 6. Custom execution patterns
  await demonstrateCustomExecutionPatterns(engine);

  // 7. Memory optimization
  await demonstrateMemoryOptimization(engine);

  await engine.cleanup();
}

async function demonstrateMixedExecution(engine: MinimalGoRulesEngine) {
  console.log('1. Mixed Execution Mode:');
  
  try {
    // Define complex execution pattern
    const selector: RuleSelector = {
      ids: ['validation-1', 'validation-2', 'business-1', 'business-2', 'final-check'],
      mode: {
        type: 'mixed',
        groups: [
          // First group: validation rules in parallel
          {
            rules: ['validation-1', 'validation-2'],
            mode: 'parallel'
          },
          // Second group: business rules in sequence
          {
            rules: ['business-1', 'business-2'],
            mode: 'sequential'
          },
          // Third group: final check
          {
            rules: ['final-check'],
            mode: 'parallel'
          }
        ]
      }
    };

    const input = {
      userId: 12345,
      amount: 5000,
      currency: 'USD',
      country: 'US'
    };

    console.log('   Executing mixed mode with complex workflow...');
    const result = await engine.execute(selector, input);
    
    console.log(`   Completed in ${result.executionTime}ms`);
    console.log(`   Results: ${result.results.size} rules executed`);
    
    if (result.errors && result.errors.size > 0) {
      console.log(`   Errors: ${result.errors.size} rules failed`);
    }
  } catch (error) {
    console.error('   Error:', error.message);
  }
  console.log('');
}

async function demonstrateErrorHandling(engine: MinimalGoRulesEngine) {
  console.log('2. Advanced Error Handling:');

  // Custom error handler
  const handleGoRulesError = (error: unknown, context: string) => {
    if (error instanceof MinimalGoRulesError) {
      switch (error.code) {
        case MinimalErrorCode.RULE_NOT_FOUND:
          console.log(`   [${context}] Rule not found: ${error.ruleId}`);
          break;
        case MinimalErrorCode.NETWORK_ERROR:
          console.log(`   [${context}] Network error - retrying might help`);
          break;
        case MinimalErrorCode.TIMEOUT:
          console.log(`   [${context}] Request timed out - consider increasing timeout`);
          break;
        case MinimalErrorCode.EXECUTION_ERROR:
          console.log(`   [${context}] Rule execution failed: ${error.message}`);
          break;
        default:
          console.log(`   [${context}] Unknown GoRules error: ${error.message}`);
      }
    } else {
      console.log(`   [${context}] Unexpected error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  };

  // Retry mechanism
  const executeWithRetry = async <T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    context: string = 'Operation'
  ): Promise<T | null> => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        console.log(`   [${context}] Attempt ${attempt} failed`);
        handleGoRulesError(error, context);
        
        if (attempt === maxRetries) {
          console.log(`   [${context}] Max retries exceeded`);
          return null;
        }
        
        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`   [${context}] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    return null;
  };

  // Test error handling
  const result = await executeWithRetry(
    () => engine.executeRule('non-existent-rule', { test: true }),
    3,
    'Rule Execution'
  );

  if (result) {
    console.log('   Unexpected success:', result);
  } else {
    console.log('   Error handling completed - operation failed as expected');
  }
  console.log('');
}

async function demonstratePerformanceMonitoring(engine: MinimalGoRulesEngine) {
  console.log('3. Performance Monitoring:');

  // Performance metrics collector
  class PerformanceCollector {
    private metrics: Array<{
      operation: string;
      duration: number;
      timestamp: number;
      success: boolean;
    }> = [];

    async measure<T>(operation: string, fn: () => Promise<T>): Promise<T> {
      const startTime = process.hrtime.bigint();
      const timestamp = Date.now();
      let success = false;
      
      try {
        const result = await fn();
        success = true;
        return result;
      } finally {
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1_000_000; // Convert to ms
        
        this.metrics.push({
          operation,
          duration,
          timestamp,
          success
        });
      }
    }

    getStats() {
      if (this.metrics.length === 0) return null;

      const durations = this.metrics.map(m => m.duration);
      const successCount = this.metrics.filter(m => m.success).length;
      
      return {
        totalOperations: this.metrics.length,
        successRate: successCount / this.metrics.length,
        averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
        minDuration: Math.min(...durations),
        maxDuration: Math.max(...durations),
        p95Duration: durations.sort((a, b) => a - b)[Math.floor(durations.length * 0.95)] || 0
      };
    }
  }

  const collector = new PerformanceCollector();

  // Perform monitored operations
  console.log('   Running performance tests...');
  
  for (let i = 0; i < 10; i++) {
    await collector.measure('single-rule', async () => {
      return await engine.executeRule('test-rule', { iteration: i });
    });
  }

  await collector.measure('multiple-rules', async () => {
    return await engine.executeRules(['rule-1', 'rule-2', 'rule-3'], { test: true });
  });

  await collector.measure('tag-based', async () => {
    return await engine.executeByTags(['performance'], { test: true });
  });

  // Display performance stats
  const stats = collector.getStats();
  if (stats) {
    console.log('   Performance Statistics:');
    console.log(`     Total Operations: ${stats.totalOperations}`);
    console.log(`     Success Rate: ${(stats.successRate * 100).toFixed(1)}%`);
    console.log(`     Average Duration: ${stats.averageDuration.toFixed(2)}ms`);
    console.log(`     Min Duration: ${stats.minDuration.toFixed(2)}ms`);
    console.log(`     Max Duration: ${stats.maxDuration.toFixed(2)}ms`);
    console.log(`     P95 Duration: ${stats.p95Duration.toFixed(2)}ms`);
  }

  // Engine performance stats
  const engineStats = engine.getPerformanceStats();
  console.log('   Engine Performance:');
  console.log(`     Memory Usage: ${engineStats.memoryUsage.toFixed(2)}MB`);
  
  const cacheStats = engine.getCacheStats();
  console.log(`     Cache Usage: ${cacheStats.size}/${cacheStats.maxSize}`);
  
  console.log('');
}

async function demonstrateVersionManagement(engine: MinimalGoRulesEngine) {
  console.log('4. Version Management:');

  try {
    // Check for version updates
    console.log('   Checking for rule version updates...');
    const versionCheck = await engine.checkVersions();
    
    console.log(`   Version Check Results:`);
    console.log(`     Up to date: ${versionCheck.upToDateRules.length} rules`);
    console.log(`     Outdated: ${versionCheck.outdatedRules.length} rules`);
    console.log(`     Check time: ${versionCheck.checkTime.toFixed(2)}ms`);

    if (versionCheck.outdatedRules.length > 0) {
      console.log('   Outdated rules:', versionCheck.outdatedRules);
      
      // Refresh outdated rules
      console.log('   Refreshing outdated rules...');
      const refreshResult = await engine.refreshCache(versionCheck.outdatedRules);
      
      console.log(`   Refresh Results:`);
      console.log(`     Refreshed: ${refreshResult.refreshedRules.length} rules`);
      console.log(`     Failed: ${refreshResult.failedRules.size} rules`);
      console.log(`     Refresh time: ${refreshResult.refreshTime.toFixed(2)}ms`);
    }
  } catch (error) {
    console.error('   Version management error:', error.message);
  }
  console.log('');
}

async function demonstrateBatchProcessing(engine: MinimalGoRulesEngine) {
  console.log('5. Batch Processing:');

  // Batch processor for high-throughput scenarios
  class BatchProcessor {
    private queue: Array<{
      ruleId: string;
      input: Record<string, unknown>;
      resolve: (result: any) => void;
      reject: (error: Error) => void;
    }> = [];
    private processing = false;
    private readonly batchSize: number;
    private readonly batchDelay: number;

    constructor(batchSize: number = 50, batchDelay: number = 100) {
      this.batchSize = batchSize;
      this.batchDelay = batchDelay;
    }

    async executeRule<T>(ruleId: string, input: Record<string, unknown>): Promise<T> {
      return new Promise<T>((resolve, reject) => {
        this.queue.push({ ruleId, input, resolve, reject });
        this.scheduleProcessing();
      });
    }

    private scheduleProcessing() {
      if (this.processing) return;
      
      if (this.queue.length >= this.batchSize) {
        this.processBatch();
      } else {
        setTimeout(() => {
          if (this.queue.length > 0) {
            this.processBatch();
          }
        }, this.batchDelay);
      }
    }

    private async processBatch() {
      if (this.processing || this.queue.length === 0) return;
      
      this.processing = true;
      const batch = this.queue.splice(0, this.batchSize);
      
      try {
        // Group by rule ID for efficiency
        const ruleGroups = new Map<string, typeof batch>();
        for (const item of batch) {
          if (!ruleGroups.has(item.ruleId)) {
            ruleGroups.set(item.ruleId, []);
          }
          ruleGroups.get(item.ruleId)!.push(item);
        }

        // Process each rule group
        for (const [ruleId, items] of ruleGroups) {
          const promises = items.map(async (item) => {
            try {
              const result = await engine.executeRule(item.ruleId, item.input);
              item.resolve(result);
            } catch (error) {
              item.reject(error as Error);
            }
          });

          await Promise.all(promises);
        }
      } finally {
        this.processing = false;
        
        // Schedule next batch if queue has items
        if (this.queue.length > 0) {
          this.scheduleProcessing();
        }
      }
    }
  }

  const batchProcessor = new BatchProcessor(20, 50);

  console.log('   Processing batch requests...');
  const startTime = Date.now();
  
  // Simulate high-throughput scenario
  const promises = [];
  for (let i = 0; i < 100; i++) {
    promises.push(
      batchProcessor.executeRule('batch-test-rule', {
        requestId: i,
        timestamp: Date.now()
      })
    );
  }

  try {
    const results = await Promise.allSettled(promises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    const duration = Date.now() - startTime;

    console.log(`   Batch Processing Results:`);
    console.log(`     Total requests: ${promises.length}`);
    console.log(`     Successful: ${successful}`);
    console.log(`     Failed: ${failed}`);
    console.log(`     Duration: ${duration}ms`);
    console.log(`     Throughput: ${(promises.length / (duration / 1000)).toFixed(0)} requests/sec`);
  } catch (error) {
    console.error('   Batch processing error:', error.message);
  }
  console.log('');
}

async function demonstrateCustomExecutionPatterns(engine: MinimalGoRulesEngine) {
  console.log('6. Custom Execution Patterns:');

  // Pipeline execution pattern
  const executePipeline = async (
    ruleIds: string[],
    initialInput: Record<string, unknown>
  ) => {
    let currentInput = { ...initialInput };
    const results: Array<{ ruleId: string; input: any; output: any }> = [];

    for (const ruleId of ruleIds) {
      try {
        console.log(`   Executing pipeline step: ${ruleId}`);
        const output = await engine.executeRule(ruleId, currentInput);
        
        results.push({ ruleId, input: currentInput, output });
        
        // Use output as input for next rule
        currentInput = { ...currentInput, ...output };
      } catch (error) {
        console.error(`   Pipeline failed at ${ruleId}:`, error.message);
        break;
      }
    }

    return results;
  };

  // Conditional execution pattern
  const executeConditional = async (
    conditionRule: string,
    trueRules: string[],
    falseRules: string[],
    input: Record<string, unknown>
  ) => {
    try {
      console.log(`   Evaluating condition: ${conditionRule}`);
      const condition = await engine.executeRule(conditionRule, input);
      
      const rulesToExecute = condition ? trueRules : falseRules;
      console.log(`   Condition result: ${condition}, executing ${rulesToExecute.length} rules`);
      
      return await engine.executeRules(rulesToExecute, input);
    } catch (error) {
      console.error('   Conditional execution error:', error.message);
      return null;
    }
  };

  // Test pipeline pattern
  console.log('   Testing pipeline execution...');
  const pipelineResults = await executePipeline(
    ['input-validation', 'data-enrichment', 'business-logic'],
    { userId: 12345, action: 'purchase' }
  );
  console.log(`   Pipeline completed with ${pipelineResults.length} steps`);

  // Test conditional pattern
  console.log('   Testing conditional execution...');
  const conditionalResults = await executeConditional(
    'user-type-check',
    ['premium-user-rules'],
    ['standard-user-rules'],
    { userId: 12345 }
  );
  
  if (conditionalResults) {
    console.log(`   Conditional execution completed: ${conditionalResults.results.size} rules`);
  }
  console.log('');
}

async function demonstrateMemoryOptimization(engine: MinimalGoRulesEngine) {
  console.log('7. Memory Optimization:');

  // Memory usage tracker
  const trackMemoryUsage = (label: string) => {
    const usage = process.memoryUsage();
    console.log(`   ${label}:`);
    console.log(`     Heap Used: ${(usage.heapUsed / 1024 / 1024).toFixed(2)}MB`);
    console.log(`     Heap Total: ${(usage.heapTotal / 1024 / 1024).toFixed(2)}MB`);
    console.log(`     External: ${(usage.external / 1024 / 1024).toFixed(2)}MB`);
  };

  trackMemoryUsage('Initial Memory Usage');

  // Simulate memory-intensive operations
  console.log('   Performing memory-intensive operations...');
  const results = [];
  
  for (let i = 0; i < 50; i++) {
    const result = await engine.executeRule('memory-test-rule', {
      iteration: i,
      data: new Array(1000).fill(`data-${i}`)
    });
    results.push(result);
  }

  trackMemoryUsage('After Operations');

  // Force garbage collection if available
  if (global.gc) {
    console.log('   Forcing garbage collection...');
    global.gc();
    trackMemoryUsage('After Garbage Collection');
  }

  // Get engine performance stats
  const perfStats = engine.getPerformanceStats();
  console.log(`   Engine Memory Usage: ${perfStats.memoryUsage.toFixed(2)}MB`);

  const cacheStats = engine.getCacheStats();
  console.log(`   Cache Memory: ${cacheStats.size} rules cached`);
  
  console.log('');
}

// Run examples if this file is executed directly
if (require.main === module) {
  advancedUsageExamples().catch(console.error);
}

export { advancedUsageExamples };