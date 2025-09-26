# QPA vs RefDes Rule Integration

This document describes the complete setup for the QPA vs RefDes rule integration in the bomdemoapiv2 application.

## Overview

The QPA vs RefDes rule validates BOM (Bill of Materials) items by comparing the Quantity Per Assembly (QPA) with Reference Designator counts. This implementation uses the Minimal GoRules Engine with local rule loading.

## Project Structure

```
apps/bomdemoapiv2/
├── src/app/
│   ├── bom-rules/                          # BOM Rules Module
│   │   ├── controllers/
│   │   │   └── qpa-refdes-rule.controller.ts
│   │   ├── services/
│   │   │   └── qpa-refdes-rule.service.ts
│   │   ├── interfaces/
│   │   │   └── bom-item.interface.ts
│   │   ├── bom-rules.module.ts
│   │   └── index.ts
│   └── app.module.ts                       # Updated to include BOM Rules Module
├── .env                                    # Local rules configuration
├── .env.development                        # Development environment
├── .env.production                         # Production environment
└── README-QPA-REFDES.md                   # This file

libs/minimal-gorules/src/lib/jdm-directory/
└── QPA vs RefDes.json                      # The actual rule file
```

## Configuration

### Environment Variables

The application is configured to use local rule loading with the following environment variables:

```bash
# Rule Source Configuration
GORULES_RULE_SOURCE=local
GORULES_LOCAL_RULES_PATH=libs/minimal-gorules/src/lib/jdm-directory
GORULES_ENABLE_HOT_RELOAD=true
GORULES_PROJECT_ID=bomdemoapiv2

# Performance Settings
GORULES_CACHE_MAX_SIZE=1000
GORULES_TIMEOUT=5000
GORULES_BATCH_SIZE=50

# Cloud Rules Configuration (fallback)
GORULES_API_URL=https://triveni.gorules.io
GORULES_API_KEY=your-api-key
```

### Rule File Location

The QPA vs RefDes rule is located at:

```
libs/minimal-gorules/src/lib/jdm-directory/QPA vs RefDes.json
```

## API Endpoints

### 1. Validate BOM Item

**POST** `/api/bom-rules/qpa-refdes/validate`

Validates a BOM item using the QPA vs RefDes rule.

**Request Body:**

```json
{
  "bomItem": {
    "lineID": 1,
    "custPN": "CPN-1001",
    "qpa": 4,
    "refDesig": "R1, R2, R3, R4",
    "refDesigCount": 4,
    "dnpQty": "0",
    "dnpDesig": "",
    "dnpDesigCount": 0,
    "uomID": "EACH",
    "mfgPNDescription": "Resistor 10k Ohm",
    "mfgCode": "MFR-A",
    "mfgPN": "MPN-1001",
    "description": "Check resistor tolerance",
    "mountingtypes": "SMD",
    "functionaltypes": "Resistor",
    "field1": "data1-1",
    "field2": "data1-2",
    "field3": "data1-3",
    "field4": "data1-4",
    "field5": "data1-5",
    "field6": "data1-6",
    "field7": "data1-7"
  },
  "configData": {
    "_OddelyRefDesList": ["p?", "P*"],
    "maxREFDESAllow": 50,
    "_UOM": {
      "EACH": "EACH"
    }
  },
  "validationFlags": {},
  "otherValidation": {}
}
```

**Response:**

```json
{
  "success": true,
  "validationFlags": {
    "qpaDesignatorStep": "Verifyed",
    "dnpQPARefDesStep": "Verifyed"
  },
  "otherValidation": {},
  "executionTime": 15.23,
  "message": "QPA vs RefDes validation completed successfully"
}
```

### 2. Test with Sample Data

**POST** `/api/bom-rules/qpa-refdes/test`

Tests the rule with predefined sample data.

**Response:**

```json
{
  "success": true,
  "validationFlags": {
    "qpaDesignatorStep": "Verifyed",
    "dnpQPARefDesStep": "Verifyed"
  },
  "otherValidation": {},
  "executionTime": 12.45,
  "message": "QPA vs RefDes validation completed successfully"
}
```

### 3. Health Check

**GET** `/api/bom-rules/qpa-refdes/health`

Checks the health status of the QPA vs RefDes rule service.

**Response:**

```json
{
  "service": "QPA vs RefDes Rule Service",
  "status": "ok",
  "ruleAvailable": true,
  "message": "QPA vs RefDes rule is available (version: 1.0.0)",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 4. Rule Metadata

**GET** `/api/bom-rules/qpa-refdes/metadata`

Gets metadata information about the QPA vs RefDes rule.

**Response:**

```json
{
  "success": true,
  "ruleId": "QPA vs RefDes",
  "metadata": {
    "id": "QPA vs RefDes",
    "version": "1.0.0",
    "tags": [],
    "lastModified": 1705312200000
  },
  "message": "Rule metadata retrieved successfully"
}
```

### 5. Validate Rule Availability

**GET** `/api/bom-rules/qpa-refdes/validate-rule`

Validates that the QPA vs RefDes rule is available and executable.

**Response:**

```json
{
  "success": true,
  "ruleId": "QPA vs RefDes",
  "isValid": true,
  "message": "QPA vs RefDes rule is valid and available"
}
```

## Data Types

### IBOMItem Interface

```typescript
interface IBOMItem {
  lineID: number;
  custPN: string;
  qpa: number;
  refDesig: string;
  refDesigCount: number;
  dnpQty: string | number;
  dnpDesig: string;
  dnpDesigCount: number;
  uomID: string;
  mfgPNDescription: string;
  mfgCode: string;
  mfgPN: string;
  description: string;
  mountingtypes: string;
  functionaltypes: string;
  field1: string;
  field2: string;
  field3: string;
  field4: string;
  field5: string;
  field6: string;
  field7: string;
}
```

### IBOMConfigData Interface

```typescript
interface IBOMConfigData {
  _OddelyRefDesList: string[];
  maxREFDESAllow: number;
  _UOM: {
    EACH: string;
  };
}
```

### IBOMValidationRequest Interface

```typescript
interface IBOMValidationRequest {
  bomItem: IBOMItem;
  configData: IBOMConfigData;
  validationFlags: IBOMValidationFlags;
  otherValidation: IBOMOtherValidation;
}
```

### IBOMValidationResponse Interface

```typescript
interface IBOMValidationResponse {
  success: boolean;
  validationFlags: IBOMValidationFlags;
  otherValidation: IBOMOtherValidation;
  executionTime?: number;
  message?: string;
  error?: string;
}
```

## Rule Logic

The QPA vs RefDes rule implements the following validation logic:

1. **Required Fields Check**: Validates that essential BOM item fields are present
2. **Ref Desig Count Validation**: Checks if reference designator count exceeds maximum allowed
3. **DNP Desig Count Validation**: Validates DNP (Do Not Populate) designator count
4. **UOM Validation**: Ensures Unit of Measure is correctly set
5. **QPA vs Ref Desig Matching**: Compares QPA with reference designator count
6. **DNP QPA Matching**: Validates DNP quantity against DNP designator count

### Validation Results

The rule returns validation flags with the following possible values:

- `"Verifyed"`: Validation passed successfully
- `"Require"`: Required fields are missing
- `"MisMatch"`: QPA and reference designator counts don't match
- `"qpa"`: Specific QPA-related validation issue

## Development

### Building the Application

```bash
# Build the minimal-gorules library
npx nx build minimal-gorules

# Build the bomdemoapiv2 application
npx nx build bomdemoapiv2
```

### Running Tests

```bash
# Run all tests
npx nx test bomdemoapiv2

# Run specific test file
npx nx test bomdemoapiv2 --testPathPatterns="app.controller.spec.ts"
```

### Starting the Application

```bash
# Start in development mode
npx nx serve bomdemoapiv2

# The application will be available at:
# HTTP: http://localhost:8001
# HTTPS: https://localhost:8001 (if ENABLE_HTTPS=true)
```

### Testing the Endpoints

You can test the endpoints using curl, Postman, or any HTTP client:

```bash
# Test with sample data
curl -X POST http://localhost:8001/api/bom-rules/qpa-refdes/test

# Health check
curl -X GET http://localhost:8001/api/bom-rules/qpa-refdes/health

# Get rule metadata
curl -X GET http://localhost:8001/api/bom-rules/qpa-refdes/metadata

# Validate rule availability
curl -X GET http://localhost:8001/api/bom-rules/qpa-refdes/validate-rule
```

## Architecture

### Service Layer

- **QpaRefDesRuleService**: Handles rule execution and provides business logic
- **MinimalGoRulesService**: Core engine service for rule loading and execution

### Controller Layer

- **QpaRefDesRuleController**: REST API endpoints for BOM validation

### Module Structure

- **BomRulesModule**: Encapsulates all BOM-related functionality
- **MinimalGoRulesModule**: Provides the rule engine with local configuration

### Configuration

The application uses environment-based configuration with the following hierarchy:

1. Environment variables (highest priority)
2. Configuration files (.env, .env.development, .env.production)
3. Default values (lowest priority)

## Troubleshooting

### Common Issues

1. **Rule Not Found**: Ensure the rule file exists at the correct path
2. **Initialization Failed**: Check environment variables and rule file permissions
3. **Validation Errors**: Verify the input data structure matches the expected interfaces

### Debug Mode

Enable debug logging by setting:

```bash
LOG_LEVEL=debug
```

### Hot Reload

When `GORULES_ENABLE_HOT_RELOAD=true`, the engine will automatically reload rules when files change. This is useful for development but should be disabled in production.

## Production Deployment

For production deployment:

1. Set `GORULES_ENABLE_HOT_RELOAD=false`
2. Increase cache size: `GORULES_CACHE_MAX_SIZE=5000`
3. Adjust timeouts: `GORULES_TIMEOUT=10000`
4. Consider using cloud rules for better scalability

## Support

For issues or questions related to the QPA vs RefDes rule integration, please refer to:

- Application logs for runtime errors
- Rule execution results for validation issues
- Health check endpoints for service status
- Metadata endpoints for rule information
