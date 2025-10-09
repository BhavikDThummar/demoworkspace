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
import { moduleSignatureVerifier, SignedModule, PublicKeyInfo } from './moduleSignatureVerifier';

const API_BASE_URL = 'https://localhost:8001/api';

interface ModuleLoadResult {
  success: boolean;
  rules?: Rule<IBOMItem>[];
  error?: string;
  moduleUrl?: string;
  timestamp?: string;
  signatureVerified?: boolean;
  keyId?: string;
}

/**
 * Dynamically load a rule module from the API with signature verification
 * Uses dynamic import with blob URL and cryptographic verification
 */
export async function loadRuleModule(moduleName = 'qpa-refdes'): Promise<ModuleLoadResult> {
  try {
    console.log(`Loading signed rule module: ${moduleName}`);

    // Step 1: Get public key information
    const keyInfo = await getPublicKeyInfo(moduleName);
    if (!keyInfo.success || !keyInfo.data) {
      throw new Error('Failed to get public key information');
    }

    // Step 2: Import public key for verification
    await moduleSignatureVerifier.importPublicKey(keyInfo.data);

    // Step 3: Get signed module
    const signedModuleResponse = await getSignedModule(moduleName);
    if (!signedModuleResponse.success || !signedModuleResponse.data) {
      throw new Error('Failed to get signed module');
    }

    const signedModule: SignedModule = signedModuleResponse.data;

    // Step 4: Verify signature
    const isSignatureValid = await moduleSignatureVerifier.verifyModule(signedModule);
    if (!isSignatureValid) {
      throw new Error('Module signature verification failed - module may be tampered with');
    }

    console.log(`Module signature verified successfully with key: ${signedModule.signature.keyId}`);

    // Step 5: Check signature age
    if (!moduleSignatureVerifier.isSignatureRecent(signedModule.signature, 60)) {
      console.warn('Module signature is older than 60 minutes');
    }

    // Step 6: Load the verified module
    const moduleCode = signedModule.content;

    // Verify it's valid JavaScript (basic check)
    if (!moduleCode || moduleCode.trim().length === 0) {
      throw new Error('Received empty module code');
    }

    // Create a blob URL for the module
    const blob = new Blob([moduleCode], { type: 'application/javascript' });
    const blobUrl = URL.createObjectURL(blob);

    try {
      // Dynamically import the module
      const module = await import(/* @vite-ignore */ blobUrl);

      // Extract rules from the module
      const rules: Rule<IBOMItem>[] = module.qpaRefDesRules || module.default || [];

      if (!Array.isArray(rules) || rules.length === 0) {
        throw new Error('Module did not export valid rules array');
      }

      console.log(`Successfully loaded ${rules.length} verified rules from signed module`);

      return {
        success: true,
        rules,
        moduleUrl: `${API_BASE_URL}/custom-rules/modules/${moduleName}/signed`,
        timestamp: new Date().toISOString(),
        signatureVerified: true,
        keyId: signedModule.signature.keyId,
      };
    } finally {
      // Clean up the blob URL
      URL.revokeObjectURL(blobUrl);
    }
  } catch (error) {
    console.error('Failed to load signed rule module:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      signatureVerified: false,
    };
  }
}

/**
 * Get public key information for module verification
 */
async function getPublicKeyInfo(moduleName: string): Promise<{
  success: boolean;
  data?: PublicKeyInfo;
  error?: string;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/custom-rules/modules/${moduleName}/public-key`);

    if (!response.ok) {
      throw new Error(`Failed to get public key: ${response.status}`);
    }

    const apiResponse = await response.json();

    // Handle the wrapped API response format
    if (apiResponse.statusCode === 200 && apiResponse.status === 'SUCCESS' && apiResponse.data) {
      return {
        success: true,
        data: apiResponse.data as PublicKeyInfo,
      };
    } else {
      throw new Error(apiResponse.message || 'Failed to get public key from API');
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get signed module from API
 */
async function getSignedModule(moduleName: string): Promise<{
  success: boolean;
  data?: SignedModule;
  error?: string;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/custom-rules/modules/${moduleName}/signed`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-cache',
    });

    if (!response.ok) {
      throw new Error(`Failed to get signed module: ${response.status}`);
    }

    const apiResponse = await response.json();

    // Handle the wrapped API response format
    if (apiResponse.statusCode === 200 && apiResponse.status === 'SUCCESS' && apiResponse.data) {
      return {
        success: true,
        data: apiResponse.data as SignedModule,
      };
    } else {
      throw new Error(apiResponse.message || 'Failed to get signed module from API');
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
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

    const apiResponse = await response.json();

    // Handle the wrapped API response format
    if (apiResponse.statusCode === 200 && apiResponse.status === 'SUCCESS' && apiResponse.data) {
      return {
        success: true,
        data: apiResponse.data,
      };
    } else {
      throw new Error(apiResponse.message || 'Failed to get module info from API');
    }
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

    const apiResponse = await response.json();

    // Handle the wrapped API response format
    if (apiResponse.statusCode === 200 && apiResponse.status === 'SUCCESS') {
      return {
        success: true,
        message: apiResponse.message || 'Module refreshed successfully',
      };
    } else {
      throw new Error(apiResponse.message || 'Failed to refresh module');
    }
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
