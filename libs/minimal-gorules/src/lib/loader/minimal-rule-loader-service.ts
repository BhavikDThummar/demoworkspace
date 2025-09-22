/**
 * Backward compatibility export for MinimalRuleLoaderService
 * @deprecated Use CloudRuleLoaderService directly
 */

import { CloudRuleLoaderService } from './cloud-rule-loader-service.js';

/**
 * @deprecated Use CloudRuleLoaderService instead
 * Maintained for backward compatibility
 */
export const MinimalRuleLoaderService = CloudRuleLoaderService;

// Re-export for convenience
export { CloudRuleLoaderService };
