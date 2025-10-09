/**
 * Dynamic Rule Module Loader
 * Securely loads compiled JavaScript modules from the API at runtime
 * 
 * This approach is more secure than eval() because:
 * 1. Uses native ES module loading
 * 2. Proper scope isolation
 * 3. CSP compatible
 * 4. Can verify module integrity
 */

import { Rule } from '@org/cm-rule-engine';
import { IBOMItem } from '../types/BOMTypes';

const API_BASE_URL = 'https://localhost:8001/api';

interface ModuleLoadResult {
  success: boolean;
  rules?: Rule<IBOMItem>[];
  error?: string;
  moduleUrl?: string;
  timestamp?: string;
}

/**
 * Dynamically load a rule module from the API
 * Uses dynamic import with blob URL for security
 */
export async function loadRuleModule(moduleName = 'qpa-refdes'): Promise<ModuleLoadResult> {
  try {
    const moduleUrl = `${API_BASE_URL}/custom-rules/modules/${moduleName}.js`;
    console.log(`Loading rule module from: ${moduleUrl}`);

    // Fetch the module code
    const response = await fetch(moduleUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/javascript',
      },
      cache: 'no-cache', // Always get fresh rules
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch module: ${response.status} ${response.statusText}`);
    }

    const moduleCode = await response.text();

    // Verify it's valid JavaScript (basic check)
    if (!moduleCode || moduleCode.trim().length === 0) {
      throw new Error('Received empty module code');
    }

    // Create a blob URL for the module
    const blob = new Blob([moduleCode], { type: 'application/javascript' });
    const blobUrl = URL.createObjectURL(blob);

    try {
      // Dynamically import the module
      // This is safer than eval() as it uses the browser's native module system
      const module = await import(/* @vite-ignore */ blobUrl);

      // Extract rules from the module
      const rules: Rule<IBOMItem>[] = module.qpaRefDesRules || module.default || [];

      if (!Array.isArray(rules) || rules.length === 0) {
        throw new Error('Module did not export valid rules array');
      }

      console.log(`Successfully loaded ${rules.length} rules from module`);

      return {
        success: true,
        rules,
        moduleUrl,
        timestamp: new Date().toISOString(),
      };
    } finally {
      // Clean up the blob URL
      URL.revokeObjectURL(blobUrl);
    }
  } catch (error) {
    console.error('Failed to load rule module:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Get module information without loading it
 */
export async function getModuleInfo(moduleName = 'qpa-refdes'): Promise<{
  success: boolean;
  data?: unknown;
  error?: string;
}> {
  try {
    const infoUrl = `${API_BASE_URL}/custom-rules/modules/${moduleName}/info`;
    const response = await fetch(infoUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch module info: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Trigger module refresh on the API side
 */
export async function refreshModule(moduleName = 'qpa-refdes'): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const refreshUrl = `${API_BASE_URL}/custom-rules/modules/${moduleName}/refresh`;
    const response = await fetch(refreshUrl);

    if (!response.ok) {
      throw new Error(`Failed to refresh module: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Preload module for faster subsequent loads
 */
export async function preloadModule(moduleName = 'qpa-refdes'): Promise<void> {
  const moduleUrl = `${API_BASE_URL}/custom-rules/modules/${moduleName}.js`;
  
  // Use link preload hint
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'script';
  link.href = moduleUrl;
  document.head.appendChild(link);
}
