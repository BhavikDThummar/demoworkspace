/**
 * Performance Tests and Benchmarks for Minimal GoRules Engine
 * Validates latency and throughput requirements
 */

/**
 * Performance test configuration
 */
export interface PerformanceTestConfig {
  /** Number of iterations for each test */
  iterations: number;
  /** Warmup iterations before measurement */
  warmupIterations: number;
  /** Concurrent operations for throughput tests */
  concurrency: number;
  /** Test timeout in milliseconds */
  timeout: number;
  /** Sample data size for tests */
  sampleDataSize: number;
}

/**
 * Performance test result
 */
export interface PerformanceTestResult {
  testName: string;
  iterations: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  medianTime: number;
  p95Time: number;
  p99Time: number;
  throughput: number; // operations per second
  memoryUsage: {
    before: number;
    after: number;
    peak: number;
    delta: number;
  };
  success: boolean;
  error?: string;
}

/**
 * Benchmark suite result
 */
export interface BenchmarkSuiteResult {
  suiteName: string;
  config: PerformanceTestConfig;
  tests: PerformanceTestResult[];
  totalTime: number;
  overallThroughput: number;
  memoryEfficiency: number;
  passed: number;
  failed: number;
  summary: {
    fastestTest: string;
    slowestTest: string;
    mostMemoryEfficient: string;
    leastMemoryEfficient: string;
    recommendations: string[];
  };
}

/**
 * Performance requirements
 */
export interface PerformanceRequirements {
  /** Maximum acceptable latency in milliseconds */
  maxLatency: number;
  /** Minimum required throughput (operations per second) */
  minThroughput: number;
  /** Maximum memory usage per operation in bytes */
  maxMemoryPerOperation: number;
  /** Maximum memory growth rate (bytes per operation) */
  maxMemoryGrowthRate: number;
}

/**
 * Performance test function type
 */
export type PerformanceTestFunction = () => Promise<void> | void;

/**
 * Performance benchmark runner
 */
export class PerformanceBenchmark {
  private config: PerformanceTestConfig;
  private requirements: PerformanceRequirements;

  constructor(
    config: Partial<PerformanceTestConfig> = {},
    requirements: Partial<PerformanceRequirements> = {}
  ) {
    this.config = {
      iterations: 1000,
      warmupIterations: 100,
      concurrency: 10,
      timeout: 30000,
      sampleDataSize: 1024,
      ...config
    };

    this.requirements = {
      maxLatency: 100, // 100ms
      minThroughput: 100, // 100 ops/sec
      maxMemoryPerOperation: 1024 * 1024, // 1MB
      maxMemoryGrowthRate: 1024, // 1KB per operation
      ...requirements
    };
  }

  /**
   * Run a single performance test
   */
  async runTest(
    testName: string,
    testFunction: PerformanceTestFunction
  ): Promise<PerformanceTestResult> {
    console.log(`Running performance test: ${testName}`);

    try {
      // Warmup
      console.log(`  Warming up (${this.config.warmupIterations} iterations)...`);
      for (let i = 0; i < this.config.warmupIterations; i++) {
        await testFunction();
      }

      // Force garbage collection if available
      if (typeof global !== 'undefined' && global.gc) {
        global.gc();
      }

      // Measure memory before test
      const memoryBefore = this.getMemoryUsage();
      let memoryPeak = memoryBefore;

      // Run actual test
      console.log(`  Running test (${this.config.iterations} iterations)...`);
      const times: number[] = [];
      const startTime = performance.now();

      for (let i = 0; i < this.config.iterations; i++) {
        const iterationStart = performance.now();
        await testFunction();
        const iterationEnd = performance.now();
        
        times.push(iterationEnd - iterationStart);

        // Track peak memory usage
        const currentMemory = this.getMemoryUsage();
        if (currentMemory > memoryPeak) {
          memoryPeak = currentMemory;
        }

        // Check for timeout
        if (performance.now() - startTime > this.config.timeout) {
          throw new Error(`Test timed out after ${this.config.timeout}ms`);
        }
      }

      const totalTime = performance.now() - startTime;
      const memoryAfter = this.getMemoryUsage();

      // Calculate statistics
      const sortedTimes = times.sort((a, b) => a - b);
      const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const minTime = sortedTimes[0];
      const maxTime = sortedTimes[sortedTimes.length - 1];
      const medianTime = sortedTimes[Math.floor(sortedTimes.length / 2)];
      const p95Time = sortedTimes[Math.floor(sortedTimes.length * 0.95)];
      const p99Time = sortedTimes[Math.floor(sortedTimes.length * 0.99)];
      const throughput = (this.config.iterations / totalTime) * 1000; // ops/sec

      const result: PerformanceTestResult = {
        testName,
        iterations: this.config.iterations,
        totalTime,
        averageTime,
        minTime,
        maxTime,
        medianTime,
        p95Time,
        p99Time,
        throughput,
        memoryUsage: {
          before: memoryBefore,
          after: memoryAfter,
          peak: memoryPeak,
          delta: memoryAfter - memoryBefore
        },
        success: true
      };

      console.log(`  ✓ ${testName} completed`);
      console.log(`    Average: ${averageTime.toFixed(2)}ms, Throughput: ${throughput.toFixed(0)} ops/sec`);

      return result;

    } catch (error) {
      console.log(`  ✗ ${testName} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return {
        testName,
        iterations: 0,
        totalTime: 0,
        averageTime: 0,
        minTime: 0,
        maxTime: 0,
        medianTime: 0,
        p95Time: 0,
        p99Time: 0,
        throughput: 0,
        memoryUsage: {
          before: 0,
          after: 0,
          peak: 0,
          delta: 0
        },
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Run a throughput test with concurrent operations
   */
  async runThroughputTest(
    testName: string,
    testFunction: PerformanceTestFunction
  ): Promise<PerformanceTestResult> {
    console.log(`Running throughput test: ${testName} (concurrency: ${this.config.concurrency})`);

    try {
      // Warmup
      for (let i = 0; i < this.config.warmupIterations; i++) {
        await testFunction();
      }

      // Force garbage collection if available
      if (typeof global !== 'undefined' && global.gc) {
        global.gc();
      }

      const memoryBefore = this.getMemoryUsage();
      let memoryPeak = memoryBefore;

      const startTime = performance.now();
      const promises: Promise<number>[] = [];

      // Create concurrent operations
      for (let i = 0; i < this.config.iterations; i++) {
        const promise = (async () => {
          const operationStart = performance.now();
          await testFunction();
          const operationEnd = performance.now();
          
          // Track peak memory usage
          const currentMemory = this.getMemoryUsage();
          if (currentMemory > memoryPeak) {
            memoryPeak = currentMemory;
          }
          
          return operationEnd - operationStart;
        })();

        promises.push(promise);

        // Limit concurrency
        if (promises.length >= this.config.concurrency) {
          await Promise.race(promises);
          // Remove completed promises
          for (let j = promises.length - 1; j >= 0; j--) {
            const promise = promises[j];
            if (await Promise.race([promise, Promise.resolve('pending')]) !== 'pending') {
              promises.splice(j, 1);
            }
          }
        }
      }

      // Wait for all remaining operations
      const times = await Promise.all(promises);
      const totalTime = performance.now() - startTime;
      const memoryAfter = this.getMemoryUsage();

      // Calculate statistics
      const sortedTimes = times.sort((a, b) => a - b);
      const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const throughput = (this.config.iterations / totalTime) * 1000; // ops/sec

      const result: PerformanceTestResult = {
        testName,
        iterations: this.config.iterations,
        totalTime,
        averageTime,
        minTime: sortedTimes[0],
        maxTime: sortedTimes[sortedTimes.length - 1],
        medianTime: sortedTimes[Math.floor(sortedTimes.length / 2)],
        p95Time: sortedTimes[Math.floor(sortedTimes.length * 0.95)],
        p99Time: sortedTimes[Math.floor(sortedTimes.length * 0.99)],
        throughput,
        memoryUsage: {
          before: memoryBefore,
          after: memoryAfter,
          peak: memoryPeak,
          delta: memoryAfter - memoryBefore
        },
        success: true
      };

      console.log(`  ✓ ${testName} completed`);
      console.log(`    Throughput: ${throughput.toFixed(0)} ops/sec, Average latency: ${averageTime.toFixed(2)}ms`);

      return result;

    } catch (error) {
      console.log(`  ✗ ${testName} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return {
        testName,
        iterations: 0,
        totalTime: 0,
        averageTime: 0,
        minTime: 0,
        maxTime: 0,
        medianTime: 0,
        p95Time: 0,
        p99Time: 0,
        throughput: 0,
        memoryUsage: {
          before: 0,
          after: 0,
          peak: 0,
          delta: 0
        },
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Run a complete benchmark suite
   */
  async runBenchmarkSuite(
    suiteName: string,
    tests: Array<{
      name: string;
      test: PerformanceTestFunction;
      type?: 'latency' | 'throughput';
    }>
  ): Promise<BenchmarkSuiteResult> {
    console.log(`\n=== Running Benchmark Suite: ${suiteName} ===`);
    
    const suiteStartTime = performance.now();
    const results: PerformanceTestResult[] = [];

    for (const { name, test, type = 'latency' } of tests) {
      const result = type === 'throughput' 
        ? await this.runThroughputTest(name, test)
        : await this.runTest(name, test);
      
      results.push(result);
    }

    const totalTime = performance.now() - suiteStartTime;
    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    // Calculate overall metrics
    const successfulResults = results.filter(r => r.success);
    const overallThroughput = successfulResults.length > 0
      ? successfulResults.reduce((sum, r) => sum + r.throughput, 0) / successfulResults.length
      : 0;

    const memoryEfficiency = successfulResults.length > 0
      ? 1 - (successfulResults.reduce((sum, r) => sum + r.memoryUsage.delta, 0) / 
             (successfulResults.length * this.requirements.maxMemoryPerOperation))
      : 0;

    // Generate summary
    const summary = this.generateSummary(results);

    const suiteResult: BenchmarkSuiteResult = {
      suiteName,
      config: this.config,
      tests: results,
      totalTime,
      overallThroughput,
      memoryEfficiency,
      passed,
      failed,
      summary
    };

    this.printSummary(suiteResult);
    return suiteResult;
  }

  /**
   * Validate results against performance requirements
   */
  validateRequirements(results: PerformanceTestResult[]): {
    passed: boolean;
    violations: string[];
    recommendations: string[];
  } {
    const violations: string[] = [];
    const recommendations: string[] = [];

    for (const result of results) {
      if (!result.success) {
        violations.push(`${result.testName}: Test failed - ${result.error}`);
        continue;
      }

      // Check latency requirements
      if (result.averageTime > this.requirements.maxLatency) {
        violations.push(
          `${result.testName}: Average latency ${result.averageTime.toFixed(2)}ms exceeds limit ${this.requirements.maxLatency}ms`
        );
      }

      if (result.p95Time > this.requirements.maxLatency * 2) {
        violations.push(
          `${result.testName}: P95 latency ${result.p95Time.toFixed(2)}ms exceeds limit ${this.requirements.maxLatency * 2}ms`
        );
      }

      // Check throughput requirements
      if (result.throughput < this.requirements.minThroughput) {
        violations.push(
          `${result.testName}: Throughput ${result.throughput.toFixed(0)} ops/sec below minimum ${this.requirements.minThroughput} ops/sec`
        );
      }

      // Check memory requirements
      const memoryPerOp = result.memoryUsage.delta / result.iterations;
      if (memoryPerOp > this.requirements.maxMemoryPerOperation) {
        violations.push(
          `${result.testName}: Memory per operation ${this.formatBytes(memoryPerOp)} exceeds limit ${this.formatBytes(this.requirements.maxMemoryPerOperation)}`
        );
      }

      // Generate recommendations
      if (result.averageTime > this.requirements.maxLatency * 0.8) {
        recommendations.push(`${result.testName}: Consider optimizing for better latency`);
      }

      if (result.throughput < this.requirements.minThroughput * 1.2) {
        recommendations.push(`${result.testName}: Consider optimizing for better throughput`);
      }

      if (result.memoryUsage.delta > 0) {
        recommendations.push(`${result.testName}: Memory usage increased, check for leaks`);
      }
    }

    return {
      passed: violations.length === 0,
      violations,
      recommendations
    };
  }

  /**
   * Generate benchmark summary
   */
  private generateSummary(results: PerformanceTestResult[]): BenchmarkSuiteResult['summary'] {
    const successfulResults = results.filter(r => r.success);
    
    if (successfulResults.length === 0) {
      return {
        fastestTest: 'N/A',
        slowestTest: 'N/A',
        mostMemoryEfficient: 'N/A',
        leastMemoryEfficient: 'N/A',
        recommendations: ['All tests failed - check implementation']
      };
    }

    // Find fastest and slowest tests
    const fastestTest = successfulResults.reduce((fastest, current) => 
      current.averageTime < fastest.averageTime ? current : fastest
    );
    
    const slowestTest = successfulResults.reduce((slowest, current) => 
      current.averageTime > slowest.averageTime ? current : slowest
    );

    // Find most and least memory efficient tests
    const mostMemoryEfficient = successfulResults.reduce((efficient, current) => 
      current.memoryUsage.delta < efficient.memoryUsage.delta ? current : efficient
    );
    
    const leastMemoryEfficient = successfulResults.reduce((inefficient, current) => 
      current.memoryUsage.delta > inefficient.memoryUsage.delta ? current : inefficient
    );

    // Generate recommendations
    const recommendations: string[] = [];
    
    if (slowestTest.averageTime > this.requirements.maxLatency) {
      recommendations.push(`Optimize ${slowestTest.testName} for better performance`);
    }
    
    if (leastMemoryEfficient.memoryUsage.delta > this.requirements.maxMemoryPerOperation) {
      recommendations.push(`Reduce memory usage in ${leastMemoryEfficient.testName}`);
    }

    const avgThroughput = successfulResults.reduce((sum, r) => sum + r.throughput, 0) / successfulResults.length;
    if (avgThroughput < this.requirements.minThroughput) {
      recommendations.push('Overall throughput is below requirements - consider parallel processing');
    }

    return {
      fastestTest: fastestTest.testName,
      slowestTest: slowestTest.testName,
      mostMemoryEfficient: mostMemoryEfficient.testName,
      leastMemoryEfficient: leastMemoryEfficient.testName,
      recommendations
    };
  }

  /**
   * Print benchmark summary
   */
  private printSummary(result: BenchmarkSuiteResult): void {
    console.log(`\n=== Benchmark Summary: ${result.suiteName} ===`);
    console.log(`Total time: ${result.totalTime.toFixed(0)}ms`);
    console.log(`Tests passed: ${result.passed}/${result.tests.length}`);
    console.log(`Overall throughput: ${result.overallThroughput.toFixed(0)} ops/sec`);
    console.log(`Memory efficiency: ${(result.memoryEfficiency * 100).toFixed(1)}%`);
    
    console.log('\nTest Results:');
    for (const test of result.tests) {
      const status = test.success ? '✓' : '✗';
      const latency = test.success ? `${test.averageTime.toFixed(2)}ms` : 'FAILED';
      const throughput = test.success ? `${test.throughput.toFixed(0)} ops/sec` : 'N/A';
      console.log(`  ${status} ${test.testName}: ${latency}, ${throughput}`);
    }

    if (result.summary.recommendations.length > 0) {
      console.log('\nRecommendations:');
      for (const recommendation of result.summary.recommendations) {
        console.log(`  • ${recommendation}`);
      }
    }

    console.log('');
  }

  /**
   * Get current memory usage
   */
  private getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed;
    }
    return 0;
  }

  /**
   * Format bytes for human-readable output
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}