---
inclusion: always
---

# NX Workspace Configuration

This is an NX workspace. Always use NX commands for testing, building, and running tasks.

## Key Commands

### Building

- **Build a project**: `npx nx build <project-name>`
- **Build all projects**: `npx nx run-many --target=build --all`

### Linting

- **Lint a project**: `npx nx lint <project-name>`

## Project Structure

- This workspace contains multiple libraries and applications
- Main library being worked on: `cm-rule-engine`
- Use `npx nx graph` to see project dependencies

## Important Notes

- **Never use `npm test` directly** - always use `npx nx test <project-name>`
- **Never use `npm run` for NX tasks** - use `npx nx <command> <project-name>`
- The workspace will uses Jest for testing (not Vitest)

## Current Projects

- `@org/cm-rule-engine` - Main GoRules engine library

## Example Commands for Current Work

```bash
# Build the cm-rule-engine library
npx nx build cm-rule-engine
```

# Notes:

- Do not create a summary document for each task unless explicitly requested.