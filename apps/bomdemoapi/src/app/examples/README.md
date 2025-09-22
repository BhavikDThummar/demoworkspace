# GoRules Integration Examples

This directory contains comprehensive examples demonstrating how to use the GoRules library in a NestJS application. The examples show different patterns and use cases for integrating business rules into your application.

## Overview

The examples are organized into two main categories:

1. **Business Rules Examples** - Practical, real-world business rule implementations
2. **Simple Rules Examples** - Basic usage patterns and fundamental concepts

## Business Rules Examples

### BusinessRulesService

The `BusinessRulesService` demonstrates practical business rule implementations for common enterprise scenarios:

#### Features:

- **Purchase Approval Rules** - Automated approval workflows based on amount, department, and urgency
- **Supplier Risk Assessment** - Multi-factor risk evaluation for supplier onboarding
- **Dynamic Pricing Rules** - Complex pricing calculations with discounts and adjustments
- **Batch Rule Execution** - Processing multiple rules efficiently
- **Comprehensive Input Validation** - Type-safe input validation with detailed error messages

#### Example Usage:

```typescript
// Purchase Approval
const approvalResult = await businessRulesService.evaluatePurchaseApproval({
  amount: 15000,
  department: 'IT',
  requestedBy: 'john.doe@company.com',
  urgency: 'medium',
  category: 'software',
  supplier: 'TechCorp Inc',
  justification: 'New development tools for the team',
});

// Supplier Risk Assessment
const riskResult = await businessRulesService.assessSupplierRisk({
  supplierId: 'SUP-001',
  supplierName: 'Reliable Components Ltd',
  country: 'Germany',
  creditRating: 'A',
  yearsInBusiness: 15,
  previousOrderCount: 25,
  averageDeliveryTime: 7,
  qualityScore: 92,
  complianceCertifications: ['ISO9001', 'ISO14001'],
});

// Dynamic Pricing
const pricingResult = await businessRulesService.calculatePricing({
  basePrice: 100,
  quantity: 50,
  customerTier: 'gold',
  productCategory: 'electronics',
  seasonalFactor: 1.1,
  promotionCode: 'SUMMER2024',
  contractDiscount: 0.05,
});
```

### BusinessRulesController

The `BusinessRulesController` provides REST API endpoints for the business rules:

#### Endpoints:

- `POST /business-rules/purchase-approval` - Evaluate purchase approval
- `POST /business-rules/supplier-risk` - Assess supplier risk
- `POST /business-rules/pricing` - Calculate dynamic pricing
- `POST /business-rules/batch` - Execute multiple rules in batch
- `GET /business-rules/statistics` - Get rule execution statistics
- `GET /business-rules/examples` - Get example request payloads
- `GET /business-rules/health` - Health check endpoint

#### Example API Calls:

```bash
# Purchase Approval
curl -X POST http://localhost:3000/business-rules/purchase-approval \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 15000,
    "department": "IT",
    "requestedBy": "john.doe@company.com",
    "urgency": "medium",
    "category": "software"
  }'

# Supplier Risk Assessment
curl -X POST http://localhost:3000/business-rules/supplier-risk \
  -H "Content-Type: application/json" \
  -d '{
    "supplierId": "SUP-001",
    "supplierName": "Reliable Components Ltd",
    "country": "Germany",
    "creditRating": "A",
    "yearsInBusiness": 15,
    "previousOrderCount": 25,
    "averageDeliveryTime": 7,
    "qualityScore": 92,
    "complianceCertifications": ["ISO9001", "ISO14001"]
  }'
```

## Simple Rules Examples

### SimpleRulesService

The `SimpleRulesService` demonstrates fundamental GoRules usage patterns:

#### Features:

- **Basic Rule Execution** - Simple rule execution with error handling
- **Rule Execution with Tracing** - Debug rule execution with detailed traces
- **Rule Validation** - Check if rules exist before execution
- **Sequential Rule Execution** - Execute multiple rules in sequence
- **Custom Timeout Configuration** - Configure execution timeouts per rule
- **Rule Metadata Retrieval** - Get information about rules
- **Error Handling Patterns** - Comprehensive error handling examples
- **Service Health Monitoring** - Monitor service health and statistics

#### Example Usage:

```typescript
// Basic Rule Execution
const result = await simpleRulesService.executeSimpleRule({
  value: 42,
  category: 'test',
  metadata: { source: 'api-example' },
});

// Rule Execution with Tracing
const tracedResult = await simpleRulesService.executeRuleWithTracing({
  value: 100,
  category: 'debug-test',
});

// Validate and Execute
const validatedResult = await simpleRulesService.validateAndExecuteRule('my-rule-id', {
  value: 50,
  category: 'validation',
});

// Sequential Execution
const sequentialResults = await simpleRulesService.executeRulesSequentially([
  { ruleId: 'rule1', input: { value: 10, category: 'seq1' } },
  { ruleId: 'rule2', input: { value: 20, category: 'seq2' } },
]);
```

### SimpleRulesController

The `SimpleRulesController` provides REST API endpoints for basic rule operations:

#### Endpoints:

- `POST /simple-rules/execute` - Execute a simple rule
- `POST /simple-rules/execute-with-trace` - Execute with tracing enabled
- `POST /simple-rules/validate-and-execute/:ruleId` - Validate and execute a rule
- `POST /simple-rules/execute-sequential` - Execute multiple rules sequentially
- `POST /simple-rules/execute-with-timeout/:ruleId` - Execute with custom timeout
- `GET /simple-rules/info/:ruleId` - Get rule information
- `POST /simple-rules/demo-error-handling/:ruleId` - Demonstrate error handling
- `GET /simple-rules/health` - Service health check
- `GET /simple-rules/examples` - Get example request payloads
- `GET /simple-rules/docs` - Get API documentation

## Input Validation

Both services use comprehensive input validation with class-validator:

### Validation Features:

- **Type Safety** - TypeScript interfaces ensure compile-time type checking
- **Runtime Validation** - class-validator decorators provide runtime validation
- **Custom Validation Messages** - Clear, actionable error messages
- **Nested Object Validation** - Support for complex nested data structures
- **Optional Field Handling** - Proper handling of optional fields

### Example Validation:

```typescript
export class PurchaseApprovalDto {
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsString()
  @IsNotEmpty()
  department!: string;

  @IsEnum(['low', 'medium', 'high', 'critical'])
  urgency!: 'low' | 'medium' | 'high' | 'critical';

  @IsOptional()
  @IsString()
  supplier?: string;
}
```

## Error Handling

The examples demonstrate comprehensive error handling patterns:

### Error Handling Features:

- **GoRules Exception Handling** - Proper handling of GoRules-specific errors
- **HTTP Status Code Mapping** - Appropriate HTTP status codes for different error types
- **Error Response Formatting** - Consistent error response structure
- **Logging Integration** - Detailed error logging for debugging
- **Retry Logic** - Built-in retry mechanisms for transient failures

### Error Response Format:

```json
{
  "success": false,
  "error": {
    "code": "RULE_NOT_FOUND",
    "message": "Rule 'my-rule' does not exist",
    "details": {
      "ruleId": "my-rule"
    },
    "retryable": false
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Testing

Comprehensive test suites are provided for all services:

### Test Coverage:

- **Unit Tests** - Complete unit test coverage for all service methods
- **Mock Integration** - Proper mocking of GoRules service dependencies
- **Error Scenario Testing** - Tests for all error conditions
- **Input Validation Testing** - Tests for all validation scenarios
- **Edge Case Testing** - Tests for boundary conditions and edge cases

### Running Tests:

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:cov

# Run tests in watch mode
npm run test:watch
```

## Configuration

The examples use the GoRules library configuration:

### Environment Variables:

```env
GORULES_API_URL=https://triveni.gorules.io
GORULES_API_KEY=your-api-key-here
GORULES_PROJECT_ID=927d9dad-2aa5-46f6-8ad7-b74469f7ec65
GORULES_TIMEOUT=30000
GORULES_RETRY_ATTEMPTS=3
GORULES_ENABLE_LOGGING=true
```

### Module Configuration:

```typescript
@Module({
  imports: [
    GoRulesModule.forEnvironment(), // Uses environment variables
    // or
    GoRulesModule.forRoot({
      apiUrl: 'https://triveni.gorules.io',
      apiKey: 'your-api-key',
      projectId: 'your-project-id',
      enableLogging: true,
    }),
  ],
  providers: [BusinessRulesService, SimpleRulesService],
  controllers: [BusinessRulesController, SimpleRulesController],
})
export class AppModule {}
```

## Best Practices

The examples demonstrate several best practices:

### Service Design:

- **Single Responsibility** - Each service has a clear, focused purpose
- **Dependency Injection** - Proper use of NestJS dependency injection
- **Error Boundaries** - Clear error handling boundaries
- **Logging Integration** - Comprehensive logging for monitoring and debugging

### API Design:

- **RESTful Endpoints** - Following REST conventions
- **Consistent Response Format** - Standardized response structure
- **Input Validation** - Comprehensive input validation
- **Documentation** - Self-documenting endpoints with examples

### Testing:

- **Comprehensive Coverage** - High test coverage for all scenarios
- **Mock Isolation** - Proper isolation of units under test
- **Error Testing** - Testing all error conditions
- **Integration Testing** - End-to-end testing of complete flows

## Getting Started

1. **Install Dependencies**:

   ```bash
   npm install
   ```

2. **Configure Environment**:

   ```bash
   cp .env.example .env
   # Edit .env with your GoRules configuration
   ```

3. **Start the Application**:

   ```bash
   npm run start:dev
   ```

4. **Test the Examples**:

   ```bash
   # Get example requests
   curl http://localhost:3000/business-rules/examples
   curl http://localhost:3000/simple-rules/examples

   # Test health endpoints
   curl http://localhost:3000/business-rules/health
   curl http://localhost:3000/simple-rules/health
   ```

## Troubleshooting

### Common Issues:

1. **Rule Not Found Errors**:

   - Verify rule IDs match those in your GoRules project
   - Check that rules are published and accessible

2. **Authentication Errors**:

   - Verify API key is correct and has proper permissions
   - Check that project ID matches your GoRules project

3. **Timeout Errors**:

   - Increase timeout values for complex rules
   - Check network connectivity to GoRules API

4. **Validation Errors**:
   - Review input validation requirements
   - Check that all required fields are provided

### Debug Mode:

Enable debug logging to troubleshoot issues:

```env
GORULES_ENABLE_LOGGING=true
GORULES_LOG_LEVEL=debug
```

## Support

For additional support:

1. Check the main GoRules library documentation
2. Review the test files for usage examples
3. Use the health endpoints to verify service status
4. Enable debug logging for detailed troubleshooting information
