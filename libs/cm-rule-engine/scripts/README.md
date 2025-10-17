# Deployment Scripts

This directory contains scripts for deploying the cm-rule-engine library to different environments.

## deploy-to-react.ps1

PowerShell script for deploying the built library to a React application.

### Prerequisites

1. Build the library first:
   ```bash
   npx nx build cm-rule-engine
   ```

2. Update the configuration paths in the script:
   - `$WorkspaceRoot` - Path to your NX workspace
   - `$DestinationPath` - Path to your React app's packages directory
   - `$ReactAppPath` - Path to your React application root

### Usage

```powershell
# Run from the workspace root
.\libs\cm-rule-engine\scripts\deploy-to-react.ps1
```

### What It Does

1. **Verifies source path** - Checks that the dist folder exists
2. **Verifies build output** - Ensures package.json and required files are present
3. **Prepares destination** - Creates the destination directory if needed
4. **Copies files** - Copies all built files (browser, node, package.json, etc.)
5. **Installs dependencies** - Runs `npm install` in the React application

### Output Structure

After deployment, your React app will have:

```
my-react-app-packages/
└── cm-rule-engine/
    ├── package.json
    ├── browser/          # Browser build (ESM)
    │   └── src/
    │       ├── index.browser.js
    │       ├── index.browser.d.ts
    │       └── lib/
    │           ├── core/
    │           └── react/
    ├── node/             # Node.js build (CommonJS)
    │   └── src/
    │       ├── index.node.js
    │       ├── index.node.d.ts
    │       └── lib/
    │           ├── core/
    │           └── nestjs/
    ├── BUILD.md
    ├── PACKAGE.md
    └── README.md
```

### Using in React

After deployment, import the library in your React components:

```typescript
// Using the React hook
import { useRuleEngine } from '@org/cm-rule-engine/react';

function MyComponent() {
  const { process, addRule, isProcessing } = useRuleEngine({
    initialRules: [/* your rules */]
  });
  
  // Use the hook methods
}
```

```typescript
// Using the core engine directly
import { RuleEngine } from '@org/cm-rule-engine';

const engine = new RuleEngine();
// Use the engine
```

### Troubleshooting

**Error: Source path does not exist**
- Run `npx nx build cm-rule-engine` first

**Error: package.json not found in dist folder**
- The build may have failed. Check build output and try again

**Error: React app directory does not exist**
- Update the `$ReactAppPath` variable in the script to point to your React app

**npm install fails**
- Check that your React app's package.json is valid
- Ensure you have the required peer dependencies installed

### Customization

To customize the deployment:

1. **Change destination structure**: Modify the `Copy-Item` command
2. **Skip npm install**: Comment out Step 5
3. **Add post-deployment steps**: Add commands after the npm install
4. **Deploy to multiple apps**: Duplicate the script with different paths

### Alternative: Manual Deployment

If you prefer manual deployment:

```bash
# 1. Build the library
npx nx build cm-rule-engine

# 2. Copy to your React app
cp -r libs/cm-rule-engine/dist/* path/to/react-app/packages/cm-rule-engine/

# 3. Install dependencies
cd path/to/react-app
npm install
```

## Future Scripts

Additional deployment scripts can be added here for:
- NestJS applications
- npm registry publishing
- CI/CD pipelines
- Docker containers
