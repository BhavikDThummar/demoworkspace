# BOM Demo API with GoRules Integration

This application demonstrates the integration of GoRules business rules engine with a NestJS API for Bill of Materials (BOM) processing.

## Features

- **BOM Validation**: Validate bill of materials data using business rules
- **Pricing Calculation**: Calculate dynamic pricing based on customer tier, volume, and other factors
- **Supplier Risk Assessment**: Assess supplier risk using multiple criteria
- **Approval Workflow**: Determine appropriate approval workflows based on request type and amount
- **Statistics and Monitoring**: Track rule execution statistics and circuit breaker status

## Setup

### Prerequisites

- Node.js 18+ 
- npm or yarn
- GoRules account and API key

### Environment Configuration

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Update the environment variables in `.env`:
   ```env
   GORULES_API_URL=https://triveni.gorules.io
   GORULES_API_KEY=your-actual-api-key
   GORULES_PROJECT_ID=927d9dad-2aa5-46f6-8ad7-b74469f7ec65
   GORULES_TIMEOUT=30000
   GORULES_RETRY_ATTEMPTS=3
   GORULES_ENABLE_LOGGING=true
   ```

### Installation

```bash
# Install dependencies
npm install

# Run the application
npm run start

# Run in development mode
npm run start:dev

# Run tests
npm run test
```

## API Endpoints

### BOM Validation

**POST** `/gorules/validate-bom`

Validates BOM data using business rules.

```json
{
  "items": [
    {
      "id": "item1",
      "name": "Electronic Component",
      "quantity": 100,
      "unitPrice": 25.50,
      "category": "electronics"
    }
  ],
  "totalValue": 2550,
  "supplier": "TechSupplier Inc",
  "requestedBy": "procurement@company.com"
}
```

### Pricing Calculation

**POST** `/gorules/calculate-pricing`

Calculates dynamic pricing based on business rules.

```json
{
  "items": [
    {
      "id": "item1",
      "basePrice": 100,
      "quantity": 50,
      "category": "electronics"
    }
  ],
  "customerTier": "premium",
  "orderVolume": 5000,
  "seasonalFactor": 1.1
}
```

### Supplier Risk Assessment

**POST** `/gorules/assess-supplier-risk`

Assesses supplier risk using multiple criteria.

```json
{
  "supplierId": "SUP001",
  "name": "Reliable Supplier Co",
  "location": "US",
  "creditRating": "A",
  "deliveryHistory": {
    "onTimeDeliveries": 95,
    "totalDeliveries": 100,
    "averageDelay": 1.2
  },
  "qualityMetrics": {
    "defectRate": 0.01,
    "returnRate": 0.005,
    "certifications": ["ISO9001", "ISO14001"]
  },
  "financialMetrics": {
    "revenue": 10000000,
    "profitMargin": 0.15,
    "debtToEquity": 0.3
  }
}
```

### Approval Workflow

**POST** `/gorules/determine-approval-workflow`

Determines the appropriate approval workflow.

```json
{
  "requestType": "purchase",
  "amount": 75000,
  "requestedBy": "john.doe@company.com",
  "department": "procurement",
  "urgency": "high",
  "riskLevel": "medium"
}
```

### Statistics and Monitoring

**GET** `/gorules/statistics`

Returns execution statistics and circuit breaker status.

**POST** `/gorules/reset-circuit-breakers`

Resets all circuit breakers.

**GET** `/gorules/health`

Health check endpoint.

## Business Rules

The application uses the following GoRules decision tables:

- `bom-validation`: Validates BOM data integrity and business constraints
- `bom-pricing`: Calculates dynamic pricing with discounts and adjustments
- `supplier-risk-assessment`: Evaluates supplier risk across multiple dimensions
- `approval-workflow`: Determines approval requirements based on request characteristics

## Error Handling

The application includes comprehensive error handling:

- **GoRules Exceptions**: Properly mapped to HTTP status codes
- **Circuit Breakers**: Prevent cascading failures
- **Retry Logic**: Automatic retry for transient failures
- **Logging**: Detailed logging for debugging and monitoring

## Testing

```bash
# Run unit tests
npm run test

# Run tests with coverage
npm run test:cov

# Run e2e tests
npm run test:e2e
```

## Architecture

The integration follows NestJS best practices:

- **Modular Design**: GoRules functionality is encapsulated in dedicated modules
- **Dependency Injection**: Proper DI for testability and maintainability
- **Configuration Management**: Environment-based configuration
- **Error Handling**: Centralized error handling with proper HTTP status mapping
- **Logging**: Structured logging for monitoring and debugging

## Monitoring

The application provides several monitoring endpoints:

- Execution statistics (success/failure rates, timing)
- Circuit breaker status
- Health checks
- Performance metrics

## Development

### Adding New Rules

1. Create the rule in GoRules platform
2. Add a new method to `BomDemoGoRulesService`
3. Add corresponding endpoint to `GoRulesController`
4. Add tests for the new functionality

### Configuration

All GoRules configuration is managed through environment variables and the `@org/gorules` library configuration system.

## Support

For issues related to:
- GoRules platform: Contact GoRules support
- Application code: Create an issue in the project repository