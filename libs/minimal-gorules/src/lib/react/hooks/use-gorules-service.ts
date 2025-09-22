/**
 * Hook for managing ReactGoRulesService instance
 */

import { useMemo } from 'react';
import { ReactGoRulesService } from '../react-gorules-service.js';
import { ReactGoRulesConfig } from '../interfaces.js';

/**
 * Hook to create and manage ReactGoRulesService instance
 */
export function useGoRulesService(config: ReactGoRulesConfig): ReactGoRulesService {
  return useMemo(() => {
    return new ReactGoRulesService(config);
  }, [
    config.apiBaseUrl,
    config.apiKey,
    config.timeout,
    config.withCredentials,
    JSON.stringify(config.headers || {}),
  ]);
}
