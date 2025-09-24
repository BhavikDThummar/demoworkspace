# GoRules Troubleshooting Guide

This guide helps you diagnose and resolve common issues when using the GoRules NestJS integration library.

## Table of Contents

- [Configuration Issues](#configuration-issues)
- [Connection Problems](#connection-problems)
- [Rule Execution Errors](#rule-execution-errors)
- [Performance Issues](#performance-issues)
- [Circuit Breaker Problems](#circuit-breaker-problems)
- [Logging and Monitoring](#logging-and-monitoring)
- [Testing Issues](#testing-issues)
- [Common Error Messages](#common-error-messages)

## Configuration Issues

### Error: "GORULES_API_KEY is required"

**Symptoms:**

- Application fails to start
- Error message about missing API key

**Causes:**

- Environment variable not set
- Incorrect environment file loading
- Configuration service not properly configured

**Solutions:**

1. **Check environment variables:**

   ```bash
   echo $GORULES_API_KEY
   echo $GORULES_PROJECT_ID
   echo $GORULES_API_URL
   ```

2. **Verify .env file:**

   ```env
   GORULES_API_URL=https://triveni.gorules.io
   GORULES_API_KEY=your-actual-api-key
   GORULES_PROJECT_ID=your-project-id
   ```

3. **Check ConfigModule setup:**

   ```typescript
   @Module({
     imports: [
       ConfigModule.forRoot({
         isGlobal: true,
         envFilePath: ['.env.local', '.env'],
       }),
       GoRulesModule.forEnvironment(),
     ],
   })
   export class AppModule {}
   ```

4. **Validate configuration in code:**
   ```typescript
   constructor(private configService: ConfigService) {
     const apiKey = configService.get('GORULES_API_KEY');
     if (!apiKey) {
       throw new Error('GORULES_API_KEY is required');
     }
   }
   ```

### Error: "Invalid configuration"

**Symptoms:**

- Configuration validation fails
- Module initialization errors

**Solutions:**

1. **Use configuration validation:**

   ```typescript
   GoRulesModule.forRootAsync({
     useFactory: (configService: ConfigService) => {
       const config = {
         apiUrl: configService.get('GORULES_API_URL'),
         apiKey: configService.get('GORULES_API_KEY'),
         projectId: configService.get('GORULES_PROJECT_ID'),
       };

       // Validate required fields
       if (!config.apiKey || !config.projectId || !config.apiUrl) {
         throw new Error('Missing required GoRules configuration');
       }

       return config;
     },
     inject: [ConfigService],
   });
   ```

2. **Check configuration format:**
   ```typescript
   // Correct format
   {
     apiUrl: 'https://triveni.gorules.io',  // Must be valid URL
     apiKey: 'your-key',                    // Must be non-empty string
     projectId: 'your-project-id',          // Must be non-empty string
     timeout: 30000,                        // Must be positive number
     retryAttempts: 3,                      // Must be non-negative number
   }
   ```

## Connection Problems

### Error: "Network timeout after 30000ms"

**Symptoms:**

- Rule execution times out
- Network-related error messages
- Slow response times

**Diagnosis:**

```typescript
// Test connectivity
async testConnection() {
  try {
    const result = await this.goRulesService.validateRuleExists('test-rule');
    console.log('Connection successful');
  } catch (error) {
    console.error('Connection failed:', error);
  }
}
```

**Solutions:**

1. **Increase timeout values:**

   ```typescript
   GoRulesModule.forRoot({
     // ... other config
     timeout: 60000, // Increase to 60 seconds
   });

   // Or per-request
   await this.goRulesService.executeRule('my-rule', input, {
     timeout: 45000,
   });
   ```

2. **Check network connectivity:**

   ```bash
   # Test API endpoint
   curl -I https://triveni.gorules.io

   # Check DNS resolution
   nslookup triveni.gorules.io

   # Test with specific timeout
   curl --max-time 30 https://triveni.gorules.io
   ```

3. **Configure proxy if needed:**

   ```typescript
   // If behind corporate proxy
   process.env.HTTP_PROXY = 'http://proxy.company.com:8080';
   process.env.HTTPS_PROXY = 'http://proxy.company.com:8080';
   ```

4. **Check firewall settings:**
   - Ensure outbound HTTPS (port 443) is allowed
   - Whitelist `triveni.gorules.io` domain

### Error: "ENOTFOUND" or "ECONNREFUSED"

**Symptoms:**

- DNS resolution failures
- Connection refused errors

**Solutions:**

1. **Verify API URL:**

   ```typescript
   // Correct URLs
   const validUrls = ['https://triveni.gorules.io', 'https://api.gorules.io'];

   // Check current configuration
   console.log('API URL:', configService.get('GORULES_API_URL'));
   ```

2. **Test DNS resolution:**

   ```bash
   # Test DNS
   dig triveni.gorules.io
   nslookup triveni.gorules.io

   # Try alternative DNS
   nslookup triveni.gorules.io 8.8.8.8
   ```

3. **Check system connectivity:**
   ```bash
   # Test basic connectivity
   ping triveni.gorules.io
   telnet triveni.gorules.io 443
   ```

## Rule Execution Errors

### Error: "Rule 'my-rule' not found"

**Symptoms:**

- Rule execution fails with "not found" error
- GoRulesErrorCode.RULE_NOT_FOUND

**Diagnosis:**

```typescript
// Check if rule exists
const exists = await this.goRulesService.validateRuleExists('my-rule');
console.log('Rule exists:', exists);

// Get rule metadata
try {
  const metadata = await this.goRulesService.getRuleMetadata('my-rule');
  console.log('Rule metadata:', metadata);
} catch (error) {
  console.error('Rule metadata error:', error);
}
```

**Solutions:**

1. **Verify rule ID:**

   - Check spelling and case sensitivity
   - Ensure rule is published in GoRules platform
   - Verify project ID is correct

2. **Check rule status in GoRules platform:**

   - Log into GoRules dashboard
   - Verify rule is published and active
   - Check rule permissions

3. **Test with known rule:**
   ```typescript
   // Test with a rule you know exists
   try {
     const result = await this.goRulesService.executeRule('known-rule', {});
     console.log('Known rule works');
   } catch (error) {
     console.error('Even known rule fails:', error);
   }
   ```

### Error: "Invalid input data"

**Symptoms:**

- GoRulesErrorCode.INVALID_INPUT
- Validation errors

**Solutions:**

1. **Validate input structure:**

   ```typescript
   // Check input matches rule schema
   const input = {
     requiredField: 'value',
     numericField: 123,
     booleanField: true,
   };

   // Log input for debugging
   console.log('Rule input:', JSON.stringify(input, null, 2));
   ```

2. **Use TypeScript interfaces:**

   ```typescript
   interface RuleInput {
     requiredField: string;
     numericField: number;
     booleanField: boolean;
   }

   const input: RuleInput = {
     requiredField: 'value',
     numericField: 123,
     booleanField: true,
   };
   ```

3. **Add input validation:**

   ```typescript
   function validateInput(input: any): boolean {
     if (!input || typeof input !== 'object') return false;
     if (!input.requiredField || typeof input.requiredField !== 'string') return false;
     if (typeof input.numericField !== 'number') return false;
     return true;
   }

   if (!validateInput(input)) {
     throw new Error('Invalid input structure');
   }
   ```

## Performance Issues

### Slow Rule Execution

**Symptoms:**

- High response times
- Timeout errors
- Poor application performance

**Diagnosis:**

```typescript
// Monitor execution times
const startTime = Date.now();
const result = await this.goRulesService.executeRule('my-rule', input);
const executionTime = Date.now() - startTime;
console.log(`Rule executed in ${executionTime}ms`);

// Check statistics
const stats = this.goRulesService.getExecutionStatistics();
console.log('Execution statistics:', stats);
```

**Solutions:**

1. **Use batch processing:**

   ```typescript
   // Instead of multiple individual calls
   const results = await Promise.all([
     this.goRulesService.executeRule('rule1', input1),
     this.goRulesService.executeRule('rule2', input2),
     this.goRulesService.executeRule('rule3', input3),
   ]);

   // Use batch execution
   const batchResults = await this.goRulesService.executeBatch([
     { ruleId: 'rule1', input: input1 },
     { ruleId: 'rule2', input: input2 },
     { ruleId: 'rule3', input: input3 },
   ]);
   ```

2. **Optimize rule complexity:**

   - Review rule logic in GoRules platform
   - Simplify complex decision trees
   - Consider breaking large rules into smaller ones

3. **Implement caching:**

   ```typescript
   private cache = new Map<string, { result: any; timestamp: number }>();
   private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

   async executeWithCache(ruleId: string, input: any) {
     const cacheKey = `${ruleId}-${JSON.stringify(input)}`;
     const cached = this.cache.get(cacheKey);

     if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
       return cached.result;
     }

     const result = await this.goRulesService.executeRule(ruleId, input);
     this.cache.set(cacheKey, { result: result.result, timestamp: Date.now() });

     return result.result;
   }
   ```

4. **Adjust timeout values:**
   ```typescript
   // Increase timeout for complex rules
   await this.goRulesService.executeRule('complex-rule', input, {
     timeout: 60000, // 60 seconds
   });
   ```

### High Memory Usage

**Symptoms:**

- Memory leaks
- Out of memory errors
- Degraded performance over time

**Solutions:**

1. **Monitor memory usage:**

   ```typescript
   // Check memory usage
   const memUsage = process.memoryUsage();
   console.log('Memory usage:', {
     rss: Math.round(memUsage.rss / 1024 / 1024) + ' MB',
     heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB',
     heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
   });
   ```

2. **Clean up old data:**

   ```typescript
   // Regular cleanup
   setInterval(() => {
     this.metricsService.cleanupOldMetrics();
     this.loggerService.clearOldData();
   }, 60 * 60 * 1000); // Every hour
   ```

3. **Limit cache size:**

   ```typescript
   private readonly MAX_CACHE_SIZE = 1000;

   private cleanupCache() {
     if (this.cache.size > this.MAX_CACHE_SIZE) {
       const entries = Array.from(this.cache.entries());
       entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

       // Remove oldest entries
       const toRemove = entries.slice(0, entries.length - this.MAX_CACHE_SIZE);
       toRemove.forEach(([key]) => this.cache.delete(key));
     }
   }
   ```

## Circuit Breaker Problems

### Circuit Breaker Stuck Open

**Symptoms:**

- All requests fail immediately
- "Circuit breaker is OPEN" errors
- No rule execution attempts

**Diagnosis:**

```typescript
// Check circuit breaker status
const cbStats = this.goRulesService.getCircuitBreakerStatistics();
console.log('Circuit breaker stats:', cbStats);

// Check specific rule
const ruleStats = this.goRulesService.getRuleCircuitBreakerStats('my-rule');
console.log('Rule circuit breaker:', ruleStats);
```

**Solutions:**

1. **Manual reset:**

   ```typescript
   // Reset specific rule circuit breaker
   this.goRulesService.resetRuleCircuitBreaker('my-rule');

   // Reset all circuit breakers
   this.goRulesService.resetAllCircuitBreakers();
   ```

2. **Wait for automatic recovery:**

   - Circuit breakers automatically reset after timeout period
   - Default timeout is usually 60 seconds
   - Monitor logs for recovery messages

3. **Investigate root cause:**

   ```typescript
   // Check error patterns
   const stats = this.goRulesService.getExecutionStatistics();
   Object.entries(stats).forEach(([ruleId, stat]) => {
     if (stat.errorRate > 0.5) {
       console.log(`High error rate for ${ruleId}: ${stat.errorRate}`);
     }
   });
   ```

4. **Adjust circuit breaker settings:**
   ```typescript
   // Configure more lenient circuit breaker
   GoRulesModule.forRoot({
     // ... other config
     circuitBreakerOptions: {
       failureThreshold: 10, // Allow more failures
       resetTimeout: 30000, // Shorter reset time
       successThreshold: 2, // Fewer successes needed
     },
   });
   ```

## Logging and Monitoring

### Missing Logs

**Symptoms:**

- No log output
- Missing execution traces
- Debugging difficulties

**Solutions:**

1. **Enable logging:**

   ```typescript
   GoRulesModule.forRoot({
     // ... other config
     enableLogging: true,
     logLevel: 'debug',
   });
   ```

2. **Check log configuration:**

   ```typescript
   // Verify logging is enabled
   const config = this.configService.getConfig();
   console.log('Logging enabled:', config.enableLogging);
   console.log('Log level:', config.logLevel);
   ```

3. **Use structured logging:**

   ```typescript
   // Enable tracing for specific executions
   const result = await this.goRulesService.executeRule('my-rule', input, {
     trace: true,
   });

   console.log('Execution trace:', result.trace);
   ```

4. **Access log entries:**

   ```typescript
   // Get recent logs
   const recentLogs = this.loggerService.getRecentLogEntries(50);
   console.log('Recent logs:', recentLogs);

   // Get logs for specific rule
   const ruleLogs = this.loggerService.getLogEntriesByRule('my-rule');
   console.log('Rule logs:', ruleLogs);
   ```

### Performance Metrics Not Available

**Solutions:**

1. **Enable metrics collection:**

   ```typescript
   GoRulesModule.forRoot({
     // ... other config
     enableMetrics: true,
   });
   ```

2. **Check metrics service:**

   ```typescript
   // Verify metrics are being collected
   const systemMetrics = this.metricsService.getSystemMetrics();
   console.log('System metrics:', systemMetrics);

   const ruleMetrics = this.metricsService.getAllRuleMetrics();
   console.log('Rule metrics:', ruleMetrics);
   ```

## Testing Issues

### Mock Service Not Working

**Symptoms:**

- Tests fail with real API calls
- Mocking not effective
- Test environment issues

**Solutions:**

1. **Use testing module:**

   ```typescript
   import { GoRulesTestingModule } from '@org/gorules';

   const module = await Test.createTestingModule({
     imports: [
       GoRulesTestingModule.forTesting({
         enableLogging: false,
         timeout: 1000,
       }),
     ],
     providers: [YourService],
   }).compile();
   ```

2. **Proper mocking:**

   ```typescript
   const mockGoRulesService = {
     executeRule: jest.fn(),
     executeBatch: jest.fn(),
     validateRuleExists: jest.fn(),
     getRuleMetadata: jest.fn(),
   };

   const module = await Test.createTestingModule({
     providers: [YourService, { provide: GoRulesService, useValue: mockGoRulesService }],
   }).compile();
   ```

3. **Clear mocks between tests:**
   ```typescript
   afterEach(() => {
     jest.clearAllMocks();
     jest.restoreAllMocks();
   });
   ```

## Common Error Messages

### "Cannot resolve dependency"

**Error:**

```
Nest can't resolve dependencies of the GoRulesService (?). Please make sure that the argument dependency at index [0] is available in the current context.
```

**Solution:**

- Ensure GoRulesModule is properly imported
- Check module configuration
- Verify all dependencies are provided

### "Circular dependency detected"

**Solution:**

```typescript
// Use forwardRef to resolve circular dependencies
@Injectable()
export class MyService {
  constructor(
    @Inject(forwardRef(() => GoRulesService))
    private readonly goRulesService: GoRulesService,
  ) {}
}
```

### "Module not found"

**Solution:**

- Check import paths
- Verify library installation: `npm install @org/gorules`
- Ensure proper TypeScript configuration

## Debug Mode

Enable comprehensive debugging:

```typescript
// Environment variables
process.env.DEBUG = 'gorules:*';
process.env.GORULES_ENABLE_LOGGING = 'true';
process.env.GORULES_LOG_LEVEL = 'debug';

// Code configuration
GoRulesModule.forRoot({
  // ... other config
  enableLogging: true,
  logLevel: 'debug',
  performanceThresholds: {
    executionTime: 1000, // Lower threshold for debugging
    errorRate: 0.01,
    memoryUsage: 50,
  },
});
```

## Getting Help

If you're still experiencing issues:

1. **Check the logs:**

   - Enable debug logging
   - Review error messages carefully
   - Look for patterns in failures

2. **Test with minimal configuration:**

   - Start with basic setup
   - Add complexity gradually
   - Isolate the problem

3. **Verify environment:**

   - Check network connectivity
   - Verify API credentials
   - Test with curl or Postman

4. **Create minimal reproduction:**

   - Create simple test case
   - Remove unnecessary complexity
   - Document exact steps to reproduce

5. **Check documentation:**

   - Review API documentation
   - Check example implementations
   - Verify configuration options

6. **Community support:**
   - Search existing issues
   - Create detailed bug report
   - Include relevant logs and configuration
