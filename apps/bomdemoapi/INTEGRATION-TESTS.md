# Integration Tests Documentation

This document provides comprehensive information about the integration tests for the BOM Demo API application with GoRules integration.

## Overview

The integration tests validate the complete functionality of the GoRules integration within the NestJS application, including:

- End-to-end API request/response flows
- Real-world business scenarios
- Error handling and recovery
- Performance under load
- Data validation and edge cases
- Cross-controller integration

## Test Structure

### Test Files

1. **`business-rules.controller.integration.spec.ts`**

   - Tests for business rules API endpoints
   - Purchase approval, supplier risk, and pricing workflows
   - Batch processing functionality
   - Statistics and monitoring endpoints

2. **`simple-rules.controller.integration.spec.ts`**

   - Tests for basic rule execution patterns
   - Rule validation and metadata retrieval
   - Sequential rule execution
   - Error handling demonstrations

3. **`app.integration.spec.ts`**

   - Application-wide integration tests
   - Health checks across all controllers
   - Cross-controller functionality
   - Performance and concurrency testing

4. **`real-world-scenarios.integration.spec.ts`**
   - Complex business workflow simulations
   - Multi-step procurement processes
   - High-concurrency scenarios
   - Error recovery patterns

### Test Configuration

- **`jest.integration.config.ts`** - Jest configuration for integration tests
- **`test-setup.ts`** - Global test setup and utilities
- **`test-global-setup.ts`** - Global setup before all tests
- **`test-global-teardown.ts`** - Global cleanup after all tests

## Running Integration Tests

### Prerequisites

1. **Node.js 18+** installed
2. **Dependencies installed**: `npm install`
3. **Environment configured**: Copy `.env.example` to `.env` and configure

### Basic Test Execution

```bash
# Run all integration tests
npm run test:integration

# Run specific test suite
npm run test:integration -- --testPathPattern="business-rules"

# Run with coverage
npm run test:integration -- --coverage

# Run in watch mode
npm run test:integration -- --watch

# Run with verbose output
npm run test:integration -- --verbose
```

### Advanced Test Execution

```bash
# Run specific test file
npx jest apps/bomdemoapi/src/app/examples/business-rules.controller.integration.spec.ts

# Run tests matching a pattern
npx jest --testNamePattern="purchase approval"

# Run tests with debugging
npx jest --runInBand --detectOpenHandles

# Generate detailed coverage report
npx jest --coverage --coverageReporters=html
```

### Custom Test Runner

Use the custom test runner for comprehensive reporting:

```bash
# Run all test suites with detailed reporting
npx ts-node apps/bomdemoapi/scripts/run-integration-tests.ts

# Run specific test suite
npx ts-node apps/bomdemoapi/scripts/run-integration-tests.ts --suite business-rules-integration
```

## Test Scenarios

### 1. Business Rules Integration

#### Purchase Approval Workflow

- **Valid Requests**: Standard approval scenarios
- **High-Value Requests**: Executive approval requirements
- **Validation Errors**: Missing fields, invalid values
- **Service Errors**: GoRules service unavailability

#### Supplier Risk Assessment

- **Low-Risk Suppliers**: Established, certified suppliers
- **High-Risk Suppliers**: New or problematic suppliers
- **Edge Cases**: Minimal data, extreme values
- **Validation**: Credit ratings, certifications, metrics

#### Dynamic Pricing

- **Tier-Based Pricing**: Bronze, Silver, Gold, Platinum tiers
- **Volume Discounts**: Quantity-based pricing adjustments
- **Seasonal Factors**: Time-based pricing modifications
- **Promotion Codes**: Discount code applications

#### Batch Processing

- **Mixed Requests**: Multiple rule types in single batch
- **Partial Failures**: Some rules succeed, others fail
- **Large Batches**: Performance with many concurrent rules
- **Error Handling**: Graceful degradation on failures

### 2. Simple Rules Integration

#### Basic Rule Execution

- **Standard Execution**: Simple input/output scenarios
- **Tracing Enabled**: Debug information collection
- **Custom Timeouts**: Performance optimization
- **Rule Validation**: Existence checks before execution

#### Sequential Processing

- **Multiple Rules**: Ordered execution of rule chains
- **Mixed Results**: Success and failure combinations
- **Performance**: Timing and resource usage
- **Error Isolation**: Failure containment

#### Error Handling

- **GoRules Exceptions**: Proper error code mapping
- **Network Failures**: Timeout and retry scenarios
- **Invalid Input**: Validation error responses
- **Service Degradation**: Graceful failure modes

### 3. Real-World Scenarios

#### Complete Procurement Workflow

1. **Supplier Assessment** → Risk evaluation
2. **Pricing Calculation** → Dynamic pricing with discounts
3. **Purchase Approval** → Multi-level approval workflow
4. **Monitoring** → Statistics and performance tracking

#### High-Concurrency Testing

- **Concurrent Requests**: Multiple simultaneous API calls
- **Load Testing**: Performance under stress
- **Resource Management**: Memory and connection handling
- **Graceful Degradation**: Behavior under load

#### Error Recovery

- **Transient Failures**: Retry mechanisms
- **Circuit Breakers**: Failure isolation
- **Fallback Strategies**: Alternative processing paths
- **Monitoring Integration**: Error tracking and alerting

## Test Data and Mocking

### Mock Strategy

The integration tests use a comprehensive mocking strategy:

1. **Service Layer Mocking**: Mock GoRules service responses
2. **Consistent Test Data**: Predefined test scenarios
3. **Error Simulation**: Controlled failure conditions
4. **Performance Simulation**: Timing and latency control

### Test Data Sets

#### Valid Test Data

```typescript
const validPurchaseApproval = {
  amount: 15000,
  department: 'IT',
  requestedBy: 'john.doe@company.com',
  urgency: 'medium',
  category: 'software',
  supplier: 'TechCorp Inc',
  justification: 'New development tools for the team',
};

const validSupplierRisk = {
  supplierId: 'SUP-001',
  supplierName: 'Reliable Components Ltd',
  country: 'Germany',
  creditRating: 'A',
  yearsInBusiness: 15,
  previousOrderCount: 25,
  averageDeliveryTime: 7,
  qualityScore: 92,
  complianceCertifications: ['ISO9001', 'ISO14001'],
};
```

#### Error Test Cases

- **Validation Errors**: Invalid field values
- **Business Logic Errors**: Rule-specific failures
- **System Errors**: Network and service failures
- **Edge Cases**: Boundary value testing

## Assertions and Validation

### Response Structure Validation

```typescript
// Standard success response
expect(response.body).toMatchObject({
  success: true,
  data: expect.any(Object),
  timestamp: expect.any(String),
});

// Standard error response
expect(response.body).toMatchObject({
  success: false,
  error: {
    code: expect.any(String),
    message: expect.any(String),
  },
  timestamp: expect.any(String),
});
```

### Business Logic Validation

```typescript
// Purchase approval validation
expect(response.body.data).toMatchObject({
  approved: expect.any(Boolean),
  approvalLevel: expect.stringMatching(/^(auto|manager|director|executive)$/),
  requiredApprovers: expect.any(Array),
  conditions: expect.any(Array),
  reason: expect.any(String),
});

// Pricing calculation validation
expect(response.body.data).toMatchObject({
  finalPrice: expect.any(Number),
  originalPrice: expect.any(Number),
  totalDiscount: expect.any(Number),
  appliedDiscounts: expect.any(Array),
  priceBreakdown: expect.any(Object),
});
```

## Performance Testing

### Load Testing Scenarios

1. **Concurrent Requests**: 10-50 simultaneous requests
2. **Sequential Processing**: Rapid successive requests
3. **Large Payloads**: Complex data structures
4. **Batch Operations**: Multiple rules per request

### Performance Metrics

- **Response Time**: API endpoint response times
- **Throughput**: Requests per second capacity
- **Resource Usage**: Memory and CPU utilization
- **Error Rates**: Failure percentages under load

### Performance Assertions

```typescript
// Response time validation
const startTime = Date.now();
const response = await request(app.getHttpServer())
  .post('/business-rules/purchase-approval')
  .send(validRequest);
const responseTime = Date.now() - startTime;

expect(responseTime).toBeLessThan(5000); // 5 second timeout
expect(response.status).toBe(201);
```

## Error Handling Testing

### Error Categories

1. **Validation Errors** (400): Invalid input data
2. **Authentication Errors** (401): Invalid API keys
3. **Not Found Errors** (404): Non-existent rules
4. **Timeout Errors** (408): Request timeouts
5. **Rate Limit Errors** (429): Too many requests
6. **Server Errors** (500): Internal failures
7. **Service Unavailable** (503): GoRules service down

### Error Response Testing

```typescript
// Test validation error handling
const invalidRequest = { amount: -1000 }; // Invalid amount

const response = await request(app.getHttpServer())
  .post('/business-rules/purchase-approval')
  .send(invalidRequest)
  .expect(400);

expect(response.body.success).toBe(false);
expect(response.body.error.code).toBe('VALIDATION_ERROR');
expect(response.body.error.message).toContain('amount');
```

## Continuous Integration

### CI/CD Integration

```yaml
# Example GitHub Actions workflow
- name: Run Integration Tests
  run: |
    npm run test:integration
    npm run test:integration -- --coverage
  env:
    GORULES_API_URL: ${{ secrets.GORULES_TEST_URL }}
    GORULES_API_KEY: ${{ secrets.GORULES_TEST_KEY }}
    GORULES_PROJECT_ID: ${{ secrets.GORULES_TEST_PROJECT }}
```

### Test Reports

- **Coverage Reports**: HTML and LCOV formats
- **Test Results**: JUnit XML for CI integration
- **Performance Reports**: Response time metrics
- **Error Analysis**: Failure categorization

## Troubleshooting

### Common Issues

#### 1. Test Timeouts

```bash
# Increase timeout for slow tests
npx jest --testTimeout=30000
```

#### 2. Port Conflicts

```bash
# Use different port for testing
export PORT=3001
npm run test:integration
```

#### 3. Memory Issues

```bash
# Run tests with more memory
node --max-old-space-size=4096 node_modules/.bin/jest
```

#### 4. Mock Issues

```typescript
// Clear mocks between tests
afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});
```

### Debug Mode

```bash
# Run with debug output
DEBUG=* npm run test:integration

# Run specific test with debugging
npx jest --runInBand --detectOpenHandles --forceExit business-rules.controller.integration.spec.ts
```

### Environment Issues

```bash
# Verify environment variables
echo $GORULES_API_URL
echo $GORULES_API_KEY
echo $GORULES_PROJECT_ID

# Check test configuration
cat apps/bomdemoapi/.env
```

## Best Practices

### Test Organization

1. **Group Related Tests**: Use `describe` blocks effectively
2. **Clear Test Names**: Descriptive test descriptions
3. **Setup and Teardown**: Proper resource management
4. **Mock Management**: Consistent mocking strategies

### Performance Optimization

1. **Parallel Execution**: Use `--runInBand` sparingly
2. **Mock External Services**: Avoid real API calls
3. **Resource Cleanup**: Prevent memory leaks
4. **Selective Testing**: Run only necessary tests

### Maintenance

1. **Regular Updates**: Keep test data current
2. **Mock Validation**: Ensure mocks match real behavior
3. **Coverage Monitoring**: Maintain high test coverage
4. **Documentation**: Keep test documentation updated

## Contributing

### Adding New Tests

1. **Follow Naming Convention**: `*.integration.spec.ts`
2. **Use Test Utilities**: Leverage existing test helpers
3. **Mock Consistently**: Follow established patterns
4. **Document Scenarios**: Explain complex test cases

### Test Review Checklist

- [ ] Tests cover happy path scenarios
- [ ] Error cases are tested
- [ ] Edge cases are considered
- [ ] Performance implications assessed
- [ ] Mocks are realistic
- [ ] Documentation is updated

## Support

For issues with integration tests:

1. **Check Test Logs**: Review detailed error messages
2. **Verify Environment**: Ensure proper configuration
3. **Run Individual Tests**: Isolate failing tests
4. **Check Dependencies**: Verify all packages installed
5. **Review Documentation**: Consult this guide and code comments
