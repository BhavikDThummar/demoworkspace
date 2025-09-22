---
inclusion: always
---

# NX Workspace Configuration

This is an NX workspace. Always use NX commands for testing, building, and running tasks.

## Key Commands

### Testing
- **Run all tests for a project**: `npx nx test <project-name>`
- **Run specific test file**: `npx nx test <project-name> --testPathPattern=<test-file-name>`
- **Run tests with specific pattern**: `npx nx test <project-name> --testNamePattern="<test-pattern>"`
- **Run tests in watch mode**: `npx nx test <project-name> --watch`

### Building
- **Build a project**: `npx nx build <project-name>`
- **Build all projects**: `npx nx run-many --target=build --all`

### Linting
- **Lint a project**: `npx nx lint <project-name>`

## Project Structure
- This workspace contains multiple libraries and applications
- Main library being worked on: `minimal-gorules`
- Use `npx nx graph` to see project dependencies

## Important Notes
- **Never use `npm test` directly** - always use `npx nx test <project-name>`
- **Never use `npm run` for NX tasks** - use `npx nx <command> <project-name>`
- The workspace uses Jest for testing (not Vitest)
- Tests should use Jest syntax and mocking patterns

## Current Projects
- `@org/minimal-gorules` - Main GoRules engine library
- Tests are located in `libs/minimal-gorules/src/lib/`

## Example Commands for Current Work
```bash
# Run all tests for minimal-gorules
npx nx test minimal-gorules

# Run specific test file
npx nx test minimal-gorules --testPathPattern=local-rule-loader-service.spec.ts

# Run tests with specific name pattern
npx nx test minimal-gorules --testNamePattern="constructor"

# Build the minimal-gorules library
npx nx build minimal-gorules
```