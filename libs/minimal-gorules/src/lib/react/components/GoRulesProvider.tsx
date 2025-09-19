/**
 * React context provider for GoRules service
 */

import { createContext, useContext, ReactNode } from 'react';
import { ReactGoRulesService } from '../react-gorules-service.js';
import { ReactGoRulesConfig } from '../interfaces.js';
import { useGoRulesService } from '../hooks/use-gorules-service.js';

/**
 * Context for GoRules service
 */
const GoRulesContext = createContext<ReactGoRulesService | null>(null);

/**
 * Props for GoRulesProvider
 */
export interface GoRulesProviderProps {
  config: ReactGoRulesConfig;
  children: ReactNode;
}

/**
 * Provider component for GoRules service
 */
export function GoRulesProvider({ config, children }: GoRulesProviderProps) {
  const service = useGoRulesService(config);

  return <GoRulesContext.Provider value={service}>{children}</GoRulesContext.Provider>;
}

/**
 * Hook to use GoRules service from context
 */
export function useGoRulesContext(): ReactGoRulesService {
  const service = useContext(GoRulesContext);

  if (!service) {
    throw new Error('useGoRulesContext must be used within a GoRulesProvider');
  }

  return service;
}
