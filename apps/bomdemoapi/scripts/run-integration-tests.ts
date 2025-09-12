#!/usr/bin/env ts-node

/**
 * Integration test runner script
 * Provides comprehensive test execution with reporting
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface TestResult {
  success: boolean;
  duration: number;
  coverage?: number;
  errors?: string[];
}

class IntegrationTestRunner {
  private readonly projectRoot: string;
  private readonly testResults: Map<string, TestResult> = new Map();

  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
  }

  /**
   * Run all integration tests
   */
  async runAllTests(): Promise<void> {
    console.log('🚀 Starting comprehensive integration test suite...\n');

    const testSuites = [
      'business-rules-integration',
      'simple-rules-integration',
      'app-integration',
      'real-world-scenarios',
    ];

    let totalPassed = 0;
    let totalFailed = 0;
    const startTime = Date.now();

    for (const suite of testSuites) {
      console.log(`📋 Running ${suite} tests...`);
      
      try {
        const result = await this.runTestSuite(suite);
        this.testResults.set(suite, result);
        
        if (result.success) {
          totalPassed++;
          console.log(`✅ ${suite}: PASSED (${result.duration}ms)\n`);
        } else {
          totalFailed++;
          console.log(`❌ ${suite}: FAILED (${result.duration}ms)`);
          if (result.errors) {
            result.errors.forEach(error => console.log(`   ${error}`));
          }
          console.log('');
        }
      } catch (error) {
        totalFailed++;
        console.log(`💥 ${suite}: ERROR - ${error}\n`);
        this.testResults.set(suite, {
          success: false,
          duration: 0,
          errors: [error instanceof Error ? error.message : String(error)],
        });
      }
    }

    const totalDuration = Date.now() - startTime;
    this.printSummary(totalPassed, totalFailed, totalDuration);
    
    // Generate test report
    await this.generateTestReport();
    
    // Exit with appropriate code
    process.exit(totalFailed > 0 ? 1 : 0);
  }

  /**
   * Run a specific test suite
   */
  private async runTestSuite(suiteName: string): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      // Determine test file pattern based on suite name
      const testPattern = this.getTestPattern(suiteName);
      
      // Run Jest with specific configuration
      const command = [
        'npx jest',
        '--config=jest.integration.config.ts',
        `--testPathPattern="${testPattern}"`,
        '--coverage',
        '--coverageReporters=json-summary',
        '--silent',
        '--runInBand', // Run tests serially for integration tests
      ].join(' ');

      const output = execSync(command, {
        cwd: this.projectRoot,
        encoding: 'utf8',
        stdio: 'pipe',
      });

      const duration = Date.now() - startTime;
      const coverage = this.extractCoverage();

      return {
        success: true,
        duration,
        coverage,
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errors = this.parseJestErrors(error.stdout || error.message);

      return {
        success: false,
        duration,
        errors,
      };
    }
  }

  /**
   * Get test pattern for a specific suite
   */
  private getTestPattern(suiteName: string): string {
    const patterns = {
      'business-rules-integration': 'business-rules.controller.integration.spec.ts',
      'simple-rules-integration': 'simple-rules.controller.integration.spec.ts',
      'app-integration': 'app.integration.spec.ts',
      'real-world-scenarios': 'real-world-scenarios.integration.spec.ts',
    };

    return patterns[suiteName as keyof typeof patterns] || suiteName;
  }

  /**
   * Extract coverage information from Jest output
   */
  private extractCoverage(): number | undefined {
    try {
      const coveragePath = path.join(this.projectRoot, 'coverage', 'coverage-summary.json');
      if (fs.existsSync(coveragePath)) {
        const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
        return coverage.total?.lines?.pct;
      }
    } catch (error) {
      console.warn('Could not extract coverage information');
    }
    return undefined;
  }

  /**
   * Parse Jest error output
   */
  private parseJestErrors(output: string): string[] {
    const errors: string[] = [];
    
    // Extract failed test information
    const failedTestRegex = /FAIL\s+(.+)/g;
    let match;
    while ((match = failedTestRegex.exec(output)) !== null) {
      errors.push(`Failed: ${match[1]}`);
    }

    // Extract error messages
    const errorRegex = /Error:\s+(.+)/g;
    while ((match = errorRegex.exec(output)) !== null) {
      errors.push(`Error: ${match[1]}`);
    }

    return errors.length > 0 ? errors : ['Unknown test failure'];
  }

  /**
   * Print test summary
   */
  private printSummary(passed: number, failed: number, duration: number): void {
    console.log('📊 Integration Test Summary');
    console.log('═'.repeat(50));
    console.log(`Total Suites: ${passed + failed}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Duration: ${duration}ms`);
    console.log(`Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
    
    if (failed === 0) {
      console.log('\n🎉 All integration tests passed!');
    } else {
      console.log(`\n⚠️  ${failed} test suite(s) failed`);
    }
    console.log('═'.repeat(50));
  }

  /**
   * Generate detailed test report
   */
  private async generateTestReport(): Promise<void> {
    const reportPath = path.join(this.projectRoot, 'test-reports', 'integration-test-report.json');
    
    // Ensure reports directory exists
    const reportsDir = path.dirname(reportPath);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const report = {
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        ci: !!process.env.CI,
      },
      summary: {
        totalSuites: this.testResults.size,
        passedSuites: Array.from(this.testResults.values()).filter(r => r.success).length,
        failedSuites: Array.from(this.testResults.values()).filter(r => !r.success).length,
        totalDuration: Array.from(this.testResults.values()).reduce((sum, r) => sum + r.duration, 0),
      },
      results: Object.fromEntries(this.testResults),
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Test report generated: ${reportPath}`);
  }

  /**
   * Run specific test suite by name
   */
  async runSpecificSuite(suiteName: string): Promise<void> {
    console.log(`🎯 Running specific test suite: ${suiteName}\n`);

    const startTime = Date.now();
    const result = await this.runTestSuite(suiteName);
    const duration = Date.now() - startTime;

    if (result.success) {
      console.log(`✅ ${suiteName}: PASSED (${duration}ms)`);
      if (result.coverage) {
        console.log(`📊 Coverage: ${result.coverage.toFixed(1)}%`);
      }
    } else {
      console.log(`❌ ${suiteName}: FAILED (${duration}ms)`);
      if (result.errors) {
        result.errors.forEach(error => console.log(`   ${error}`));
      }
    }

    process.exit(result.success ? 0 : 1);
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const runner = new IntegrationTestRunner();

  if (args.length === 0) {
    // Run all tests
    await runner.runAllTests();
  } else if (args[0] === '--suite' && args[1]) {
    // Run specific suite
    await runner.runSpecificSuite(args[1]);
  } else {
    console.log('Usage:');
    console.log('  npm run test:integration              # Run all integration tests');
    console.log('  npm run test:integration --suite NAME # Run specific test suite');
    console.log('');
    console.log('Available suites:');
    console.log('  - business-rules-integration');
    console.log('  - simple-rules-integration');
    console.log('  - app-integration');
    console.log('  - real-world-scenarios');
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}