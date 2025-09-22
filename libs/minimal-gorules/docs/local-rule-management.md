# Local Rule Management Guide

This guide covers best practices for organizing, versioning, and maintaining local rule files in the Minimal GoRules Engine.

## Table of Contents

- [Directory Structure](#directory-structure)
- [Naming Conventions](#naming-conventions)
- [Rule File Format](#rule-file-format)
- [Metadata Files](#metadata-files)
- [Environment-Specific Organization](#environment-specific-organization)
- [Version Management](#version-management)
- [Hot Reload](#hot-reload)
- [Troubleshooting](#troubleshooting)

## Directory Structure

### Basic Structure

Organize your rules in a logical directory hierarchy that reflects your business domains:

```
rules/
├── pricing/
│   ├── shipping-fees.json
│   ├── shipping-fees.meta.json
│   ├── discount-rules.json
│   └── tax-calculation.json
├── validation/
│   ├── order-validation.json
│   ├── customer-validation.json
│   └── payment-validation.json
├── approval/
│   ├── workflow-rules.json
│   └── escalation-rules.json
└── business-logic/
    ├── loyalty-program.json
    └── promotional-rules.json
```

### Advanced Structure

For larger projects, consider organizing by feature or service:

```
rules/
├── order-service/
│   ├── validation/
│   │   ├── order-validation.json
│   │   └── inventory-check.json
│   ├── pricing/
│   │   ├── base-pricing.json
│   │   └── discount-calculation.json
│   └── fulfillment/
│       ├── shipping-rules.json
│       └── delivery-options.json
├── customer-service/
│   ├── loyalty/
│   │   ├── tier-calculation.json
│   │   └── rewards-rules.json
│   └── support/
│       ├── escalation-rules.json
│       └── priority-rules.json
└── shared/
    ├── common-validations.json
    └── utility-functions.json
```

### Guidelines

1. **Keep directories shallow**: Avoid deeply nested structures (max 3-4 levels)
2. **Group by domain**: Organize rules by business domain or service boundary
3. **Use consistent naming**: Follow the same naming pattern across all directories
4. **Separate concerns**: Keep validation, calculation, and workflow rules in separate directories
5. **Share common rules**: Use a `shared/` or `common/` directory for reusable rules

## Naming Conventions

### File Names

- Use **kebab-case** for file names: `shipping-fee-calculation.json`
- Be descriptive but concise: `order-validation.json` not `validate-order-data.json`
- Avoid abbreviations unless they're widely understood: `tax-calc.json` → `tax-calculation.json`
- Use consistent suffixes for similar rule types:
  - Validation rules: `*-validation.json`
  - Calculation rules: `*-calculation.json`
  - Workflow rules: `*-workflow.json`
  - Business rules: `*-rules.json`

### Rule IDs

Rule IDs are automatically generated from file paths:

- `pricing/shipping-fees.json` → Rule ID: `pricing/shipping-fees`
- `validation/order-validation.json` → Rule ID: `validation/order-validation`
- `order-service/pricing/base-pricing.json` → Rule ID: `order-service/pricing/base-pricing`

### Best Practices

- **Use meaningful names**: Rule IDs should be self-documenting
- **Avoid special characters**: Stick to letters, numbers, hyphens, and forward slashes
- **Be consistent**: Use the same naming pattern across your entire rule set
- **Consider namespacing**: Use directory structure to create logical namespaces

## Rule File Format

### Basic Rule Structure

All rule files must follow the GoRules decision JSON format:

```json
{
  "contentType": "application/vnd.gorules.decision",
  "nodes": [
    {
      "id": "input",
      "name": "Request",
      "type": "inputNode",
      "position": { "x": 100, "y": 100 },
      "content": {
        "fields": [
          {
            "field": "amount",
            "name": "Amount",
            "id": "amount",
            "description": "Order amount",
            "dataType": "number-input"
          }
        ]
      }
    },
    {
      "id": "decision",
      "name": "Shipping Fee Decision",
      "type": "decisionTableNode",
      "position": { "x": 300, "y": 100 },
      "content": {
        "hitPolicy": "first",
        "inputs": [
          {
            "id": "amount",
            "name": "Amount",
            "type": "expression",
            "field": "amount"
          }
        ],
        "outputs": [
          {
            "id": "fee",
            "name": "Shipping Fee",
            "type": "expression",
            "field": "shippingFee"
          }
        ],
        "rules": [
          {
            "id": "rule1",
            "inputs": { "amount": ">= 100" },
            "outputs": { "fee": "0" }
          },
          {
            "id": "rule2",
            "inputs": { "amount": "< 100" },
            "outputs": { "fee": "9.99" }
          }
        ]
      }
    },
    {
      "id": "output",
      "name": "Response",
      "type": "outputNode",
      "position": { "x": 500, "y": 100 },
      "content": {
        "fields": [
          {
            "field": "shippingFee",
            "name": "Shipping Fee",
            "id": "shippingFee",
            "description": "Calculated shipping fee",
            "dataType": "number-input"
          }
        ]
      }
    }
  ],
  "edges": [
    {
      "id": "edge1",
      "sourceId": "input",
      "targetId": "decision"
    },
    {
      "id": "edge2",
      "sourceId": "decision",
      "targetId": "output"
    }
  ]
}
```

### Validation Requirements

- **Valid JSON**: Files must be valid JSON format
- **Required fields**: Must include `contentType`, `nodes`, and `edges`
- **Content type**: Must be `"application/vnd.gorules.decision"`
- **Node structure**: Each node must have `id`, `name`, `type`, and `position`
- **Edge connections**: Edges must reference valid node IDs

## Metadata Files

### Purpose

Metadata files provide additional information about rules that isn't part of the decision logic:

- Version information
- Tags for categorization
- Descriptions and documentation
- Author information
- Environment-specific settings

### Format

Create a `.meta.json` file alongside each rule file:

```json
{
  "version": "1.2.0",
  "tags": ["pricing", "shipping", "e-commerce"],
  "description": "Calculates shipping fees based on order amount and customer tier",
  "author": "pricing-team",
  "lastModified": "2024-01-15T10:30:00Z",
  "environment": "production",
  "dependencies": ["customer-tier-rules"],
  "testCases": [
    {
      "name": "Free shipping for orders over $100",
      "input": { "amount": 150 },
      "expectedOutput": { "shippingFee": 0 }
    },
    {
      "name": "Standard shipping for small orders",
      "input": { "amount": 50 },
      "expectedOutput": { "shippingFee": 9.99 }
    }
  ]
}
```

### Optional Fields

- `version`: Semantic version string
- `tags`: Array of strings for categorization
- `description`: Human-readable description
- `author`: Rule author or team
- `lastModified`: ISO 8601 timestamp
- `environment`: Target environment (development, staging, production)
- `dependencies`: Array of rule IDs this rule depends on
- `testCases`: Array of test case objects
- `changelog`: Array of change entries

### Default Metadata

If no `.meta.json` file exists, the system generates default metadata:

```json
{
  "version": "1.0.0",
  "tags": [],
  "description": "Auto-generated from filename",
  "author": "unknown",
  "lastModified": "2024-01-15T10:30:00Z"
}
```

## Environment-Specific Organization

### Strategy 1: Separate Directories

Organize rules by environment in separate directories:

```
rules/
├── development/
│   ├── pricing/
│   │   └── shipping-fees.json
│   └── validation/
│       └── order-validation.json
├── staging/
│   ├── pricing/
│   │   └── shipping-fees.json
│   └── validation/
│       └── order-validation.json
└── production/
    ├── pricing/
    │   └── shipping-fees.json
    └── validation/
        └── order-validation.json
```

**Configuration:**
```typescript
const config: MinimalGoRulesConfig = {
  ruleSource: 'local',
  localRulesPath: `./rules/${process.env.NODE_ENV || 'development'}`,
  enableHotReload: process.env.NODE_ENV === 'development'
};
```

### Strategy 2: Environment-Specific Metadata

Use single rule files with environment-specific metadata:

```
rules/
├── pricing/
│   ├── shipping-fees.json
│   ├── shipping-fees.dev.meta.json
│   ├── shipping-fees.staging.meta.json
│   └── shipping-fees.prod.meta.json
└── validation/
    ├── order-validation.json
    ├── order-validation.dev.meta.json
    └── order-validation.prod.meta.json
```

### Strategy 3: Configuration-Based Selection

Use configuration to filter rules by environment tags:

```typescript
const config: MinimalGoRulesConfig = {
  ruleSource: 'local',
  localRulesPath: './rules',
  environmentFilter: process.env.NODE_ENV || 'development'
};
```

Rules tagged with matching environment will be loaded:

```json
{
  "version": "1.0.0",
  "tags": ["pricing", "development", "staging"],
  "description": "Development and staging shipping rules"
}
```

### Recommendations

- **Development**: Use Strategy 1 with hot reload enabled
- **Staging**: Use Strategy 2 for easy comparison between environments
- **Production**: Use Strategy 3 with strict environment filtering
- **CI/CD**: Use environment variables to switch between strategies

## Version Management

### File-Based Versioning

The system uses file modification time as the default version:

```typescript
// Automatic version detection
const stats = await fs.stat(ruleFilePath);
const version = stats.mtime.toISOString();
```

### Explicit Versioning

Use metadata files for explicit version control:

```json
{
  "version": "2.1.0",
  "changelog": [
    {
      "version": "2.1.0",
      "date": "2024-01-15",
      "changes": ["Added support for premium customer discounts"]
    },
    {
      "version": "2.0.0",
      "date": "2024-01-10",
      "changes": ["Breaking: Changed output field from 'fee' to 'shippingFee'"]
    }
  ]
}
```

### Git Integration

Use Git for comprehensive version management:

```bash
# Track rule changes
git add rules/
git commit -m "feat: update shipping fee calculation for premium customers"

# Tag releases
git tag -a v1.2.0 -m "Release version 1.2.0"

# View rule history
git log --oneline -- rules/pricing/shipping-fees.json
```

### Best Practices

1. **Semantic versioning**: Use MAJOR.MINOR.PATCH format
2. **Changelog maintenance**: Document all changes in metadata
3. **Atomic commits**: Commit related rule changes together
4. **Tag releases**: Use Git tags for production releases
5. **Backup strategy**: Regular backups of rule directories

## Hot Reload

### Configuration

Enable hot reload for development environments:

```typescript
const config: MinimalGoRulesConfig = {
  ruleSource: 'local',
  localRulesPath: './rules',
  enableHotReload: true,
  fileSystemOptions: {
    watchOptions: {
      ignored: ['**/*.meta.json', '**/.*'],
      persistent: true,
      ignoreInitial: true
    }
  }
};
```

### Behavior

Hot reload monitors file system changes and automatically:

1. **Detects changes**: Watches for file additions, modifications, and deletions
2. **Debounces updates**: Prevents excessive reloads during rapid changes
3. **Updates cache**: Refreshes the rule cache with new content
4. **Maintains state**: Preserves ongoing rule executions

### File Operations

The system responds to these file operations:

- **File created**: Loads new rule into cache
- **File modified**: Reloads rule content and updates cache
- **File deleted**: Removes rule from cache
- **File renamed**: Treats as delete + create operation

### Development Workflow

1. **Start application** with hot reload enabled
2. **Edit rule files** in your preferred editor
3. **Save changes** - rules are automatically reloaded
4. **Test immediately** - no application restart required
5. **Monitor logs** for reload confirmations and errors

### Performance Considerations

- **Debouncing**: 500ms delay prevents excessive reloads
- **Selective updates**: Only changed files are reloaded
- **Background processing**: File watching doesn't block rule execution
- **Memory management**: Old rule versions are garbage collected

## Troubleshooting

### Common Issues

#### 1. Rules Not Loading

**Symptoms:**
- Rules not found errors
- Empty rule cache
- Application starts but rules don't execute

**Causes & Solutions:**

```bash
# Check file permissions
ls -la rules/
# Fix: chmod 644 rules/**/*.json

# Verify file format
cat rules/pricing/shipping-fees.json | jq .
# Fix: Validate and fix JSON syntax

# Check directory path
echo $PWD/rules
# Fix: Update localRulesPath in configuration
```

#### 2. Invalid JSON Format

**Symptoms:**
- JSON parsing errors
- Rule validation failures
- Startup crashes

**Solutions:**

```bash
# Validate JSON syntax
find rules/ -name "*.json" -exec jq . {} \;

# Check for common issues
grep -r "," rules/ | grep "}$"  # Trailing commas
grep -r '"' rules/ | grep "'"   # Mixed quotes
```

**Prevention:**
- Use JSON linting in your editor
- Set up pre-commit hooks for JSON validation
- Use schema validation tools

#### 3. Hot Reload Not Working

**Symptoms:**
- File changes not detected
- Cache not updating
- Manual restart required

**Debugging:**

```typescript
// Enable debug logging
const config: MinimalGoRulesConfig = {
  ruleSource: 'local',
  localRulesPath: './rules',
  enableHotReload: true,
  debugMode: true  // Enable detailed logging
};
```

**Common fixes:**
- Check file system permissions
- Verify `enableHotReload: true` in configuration
- Restart application if file watcher crashes
- Check for antivirus software blocking file access

#### 4. Rule ID Conflicts

**Symptoms:**
- Rules overwriting each other
- Unexpected rule execution results
- Cache inconsistencies

**Solutions:**

```bash
# Find duplicate rule IDs
find rules/ -name "*.json" | sed 's|rules/||; s|\.json$||' | sort | uniq -d

# Rename conflicting files
mv rules/pricing/fees.json rules/pricing/shipping-fees.json
mv rules/validation/fees.json rules/validation/processing-fees.json
```

#### 5. Performance Issues

**Symptoms:**
- Slow rule loading
- High memory usage
- File system errors

**Optimization:**

```typescript
// Optimize file system options
const config: MinimalGoRulesConfig = {
  ruleSource: 'local',
  localRulesPath: './rules',
  fileSystemOptions: {
    recursive: true,
    watchOptions: {
      ignored: ['**/node_modules/**', '**/.git/**'],
      persistent: false  // Reduce memory usage
    }
  }
};
```

### Diagnostic Commands

#### Check Rule Loading

```bash
# List all rule files
find rules/ -name "*.json" -type f

# Count rules by directory
find rules/ -name "*.json" | cut -d'/' -f2 | sort | uniq -c

# Check file sizes
find rules/ -name "*.json" -exec ls -lh {} \; | sort -k5 -hr
```

#### Validate Rule Format

```bash
# Validate all JSON files
find rules/ -name "*.json" -exec echo "Checking {}" \; -exec jq empty {} \;

# Check for required fields
find rules/ -name "*.json" -exec jq -r 'if .contentType then "✓" else "✗ Missing contentType" end' {} \;
```

#### Monitor File Changes

```bash
# Watch file system events (Linux/macOS)
inotifywait -m -r rules/ -e create,modify,delete

# Monitor file access (macOS)
fs_usage -w -f filesys | grep rules/
```

### Error Messages Reference

| Error | Cause | Solution |
|-------|-------|----------|
| `ENOENT: no such file or directory` | File path incorrect | Check `localRulesPath` configuration |
| `EACCES: permission denied` | Insufficient permissions | Run `chmod 644 rules/**/*.json` |
| `SyntaxError: Unexpected token` | Invalid JSON | Validate JSON syntax with `jq` |
| `Rule validation failed` | Missing required fields | Check GoRules format requirements |
| `File watcher error` | File system limitations | Reduce watched files or restart application |

### Getting Help

1. **Enable debug logging** to get detailed error information
2. **Check file permissions** and directory structure
3. **Validate JSON format** using online tools or `jq`
4. **Review configuration** against examples in this guide
5. **Test with minimal rule set** to isolate issues
6. **Check system resources** (disk space, memory, file handles)

For additional support, include the following information:
- Operating system and version
- Node.js version
- Rule directory structure (`tree rules/` or `find rules/`)
- Configuration object (with sensitive data removed)
- Complete error messages and stack traces