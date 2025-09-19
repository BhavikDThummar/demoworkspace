/**
 * React-specific interfaces for Minimal GoRules Engine integration
 */

import { MinimalRuleMetadata } from '../interfaces/core.js';

/**
 * Configuration for React GoRules service
 */
export interface ReactGoRulesConfig {
  /**
   * Base URL for the NestJS backend API
   */
  apiBaseUrl: string;
  
  /**
   * Optional API key for authentication
   */
  apiKey?: string;
  
  /**
   * Request timeout in milliseconds
   */
  timeout?: number;
  
  /**
   * Whether to include credentials in requests
   */
  withCredentials?: boolean;
  
  /**
   * Custom headers to include in all requests
   */
  headers?: Record<string, string>;
}

/**
 * Request payload for rule execution
 */
export interface ExecuteRuleRequest {
  ruleId?: string;
  ruleIds?: string[];
  tags?: string[];
  mode?: 'parallel' | 'sequential' | 'mixed';
  input: Record<string, unknown>;
}

/**
 * Response from rule execution API
 */
export interface ExecuteRuleResponse<T = unknown> {
  success: boolean;
  results?: Record<string, T> | T;
  executionTime?: number;
  errors?: Record<string, string>;
  message?: string;
}

/**
 * Response from status API
 */
export interface StatusResponse {
  engine: {
    status: string;
    initialized: boolean;
    rulesLoaded: number;
  };
  health: {
    status: string;
    uptime: number;
    lastCheck: number;
  };
  cache: {
    size: number;
    maxSize: number;
    hitRate: number;
    memoryUsage: number;
  };
  initialization: {
    status: string;
    startTime: number;
    duration?: number;
    rulesLoaded?: number;
    errors?: string[];
  };
}

/**
 * Response from metadata API
 */
export interface MetadataResponse {
  success: boolean;
  metadata?: Record<string, MinimalRuleMetadata> | MinimalRuleMetadata;
  count?: number;
  message?: string;
}

/**
 * Response from rules by tags API
 */
export interface RulesByTagsResponse {
  success: boolean;
  ruleIds: string[];
  count: number;
  tags: string[];
  message?: string;
}

/**
 * Response from rule validation API
 */
export interface ValidateRuleResponse {
  success: boolean;
  ruleId: string;
  isValid: boolean;
  message?: string;
}

/**
 * Response from version check API
 */
export interface VersionCheckResponse {
  success: boolean;
  versionCheck: {
    outdatedRules: string[];
    upToDateRules: string[];
    totalRules: number;
  };
  message?: string;
}

/**
 * Response from cache refresh API
 */
export interface CacheRefreshResponse {
  success: boolean;
  refreshResult: {
    refreshedRules: string[];
    failedRules: string[];
    totalProcessed: number;
  };
  message?: string;
}

/**
 * Response from force refresh API
 */
export interface ForceRefreshResponse {
  success: boolean;
  status: {
    rulesLoaded: number;
    loadTime: number;
    errors?: string[];
  };
  message?: string;
}

/**
 * Hook state for rule execution
 */
export interface UseRuleExecutionState<T = unknown> {
  /**
   * Whether a request is currently in progress
   */
  loading: boolean;
  
  /**
   * Execution results
   */
  results: Record<string, T> | T | null;
  
  /**
   * Execution time in milliseconds
   */
  executionTime: number | null;
  
  /**
   * Any errors that occurred
   */
  error: string | null;
  
  /**
   * Success status
   */
  success: boolean;
}

/**
 * Hook state for engine status
 */
export interface UseEngineStatusState {
  /**
   * Whether status is being fetched
   */
  loading: boolean;
  
  /**
   * Engine status data
   */
  status: StatusResponse | null;
  
  /**
   * Any errors that occurred
   */
  error: string | null;
  
  /**
   * Last update timestamp
   */
  lastUpdated: number | null;
}

/**
 * Hook state for rule metadata
 */
export interface UseRuleMetadataState {
  /**
   * Whether metadata is being fetched
   */
  loading: boolean;
  
  /**
   * Rule metadata
   */
  metadata: Record<string, MinimalRuleMetadata> | null;
  
  /**
   * Any errors that occurred
   */
  error: string | null;
  
  /**
   * Last update timestamp
   */
  lastUpdated: number | null;
}

/**
 * Props for RuleExecutor component
 */
export interface RuleExecutorProps {
  /**
   * Rule ID to execute (for single rule execution)
   */
  ruleId?: string;
  
  /**
   * Multiple rule IDs to execute
   */
  ruleIds?: string[];
  
  /**
   * Tags to select rules by
   */
  tags?: string[];
  
  /**
   * Execution mode
   */
  mode?: 'parallel' | 'sequential' | 'mixed';
  
  /**
   * Input data for rule execution
   */
  input: Record<string, unknown>;
  
  /**
   * Whether to execute automatically on mount
   */
  autoExecute?: boolean;
  
  /**
   * Callback when execution completes successfully
   */
  onSuccess?: (results: Record<string, unknown> | unknown) => void;
  
  /**
   * Callback when execution fails
   */
  onError?: (error: string) => void;
  
  /**
   * Custom loading component
   */
  loadingComponent?: () => any;
  
  /**
   * Custom error component
   */
  errorComponent?: (props: { error: string }) => any;
  
  /**
   * Custom results component
   */
  resultsComponent?: (props: { results: Record<string, unknown> | unknown }) => unknown;
}

/**
 * Props for EngineStatus component
 */
export interface EngineStatusProps {
  /**
   * Refresh interval in milliseconds (0 to disable auto-refresh)
   */
  refreshInterval?: number;
  
  /**
   * Whether to show detailed information
   */
  detailed?: boolean;
  
  /**
   * Custom styling classes
   */
  className?: string;
  
  /**
   * Callback when status updates
   */
  onStatusUpdate?: (status: StatusResponse) => void;
}

/**
 * Props for RuleMetadataViewer component
 */
export interface RuleMetadataViewerProps {
  /**
   * Specific rule ID to show metadata for (optional)
   */
  ruleId?: string;
  
  /**
   * Whether to show all rules metadata
   */
  showAll?: boolean;
  
  /**
   * Filter rules by tags
   */
  filterTags?: string[];
  
  /**
   * Custom styling classes
   */
  className?: string;
  
  /**
   * Callback when rule is selected
   */
  onRuleSelect?: (ruleId: string, metadata: MinimalRuleMetadata) => void;
}