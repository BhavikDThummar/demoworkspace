/**
 * React service wrapper for API-based rule execution
 * 
 * This service provides HTTP client functionality for calling NestJS backend endpoints
 * that host the Minimal GoRules Engine.
 */

import {
  ReactGoRulesConfig,
  ExecuteRuleRequest,
  ExecuteRuleResponse,
  StatusResponse,
  MetadataResponse,
  RulesByTagsResponse,
  ValidateRuleResponse,
  VersionCheckResponse,
  CacheRefreshResponse,
  ForceRefreshResponse
} from './interfaces.js';

/**
 * HTTP client error for API requests
 */
export class ReactGoRulesError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly response?: unknown
  ) {
    super(message);
    this.name = 'ReactGoRulesError';
  }
}

/**
 * React service for interacting with Minimal GoRules Engine API
 */
export class ReactGoRulesService {
  private readonly config: Required<ReactGoRulesConfig>;

  constructor(config: ReactGoRulesConfig) {
    this.config = {
      timeout: 10000,
      withCredentials: false,
      headers: {},
      ...config,
      apiKey: config.apiKey || undefined
    } as Required<ReactGoRulesConfig>;
  }

  /**
   * Make HTTP request with error handling
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.config.apiBaseUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.config.headers
    };
    
    if (options.headers) {
      Object.assign(headers, options.headers);
    }

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: this.config.withCredentials ? 'include' : 'same-origin',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new ReactGoRulesError(
          `HTTP ${response.status}: ${errorText}`,
          response.status,
          errorText
        );
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof ReactGoRulesError) {
        throw error;
      }
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new ReactGoRulesError(`Request timeout after ${this.config.timeout}ms`);
        }
        throw new ReactGoRulesError(`Network error: ${error.message}`);
      }
      
      throw new ReactGoRulesError('Unknown error occurred');
    }
  }

  /**
   * Execute a single rule by ID
   */
  async executeRule<T = unknown>(
    ruleId: string,
    input: Record<string, unknown>
  ): Promise<ExecuteRuleResponse<T>> {
    const request: ExecuteRuleRequest = {
      ruleId,
      input
    };

    return this.makeRequest<ExecuteRuleResponse<T>>('/minimal-gorules/execute-rule', {
      method: 'POST',
      body: JSON.stringify(request)
    });
  }

  /**
   * Execute multiple rules with selector
   */
  async execute<T = unknown>(
    request: ExecuteRuleRequest
  ): Promise<ExecuteRuleResponse<T>> {
    return this.makeRequest<ExecuteRuleResponse<T>>('/minimal-gorules/execute', {
      method: 'POST',
      body: JSON.stringify(request)
    });
  }

  /**
   * Execute rules by tags
   */
  async executeByTags<T = unknown>(
    tags: string[],
    input: Record<string, unknown>,
    mode: 'parallel' | 'sequential' | 'mixed' = 'parallel'
  ): Promise<ExecuteRuleResponse<T>> {
    const request: ExecuteRuleRequest = {
      tags,
      input,
      mode
    };

    return this.makeRequest<ExecuteRuleResponse<T>>('/minimal-gorules/execute-by-tags', {
      method: 'POST',
      body: JSON.stringify(request)
    });
  }

  /**
   * Execute multiple rules by IDs
   */
  async executeByIds<T = unknown>(
    ruleIds: string[],
    input: Record<string, unknown>,
    mode: 'parallel' | 'sequential' | 'mixed' = 'parallel'
  ): Promise<ExecuteRuleResponse<T>> {
    const request: ExecuteRuleRequest = {
      ruleIds,
      input,
      mode
    };

    return this.makeRequest<ExecuteRuleResponse<T>>('/minimal-gorules/execute', {
      method: 'POST',
      body: JSON.stringify(request)
    });
  }

  /**
   * Get engine status and health
   */
  async getStatus(): Promise<StatusResponse> {
    return this.makeRequest<StatusResponse>('/minimal-gorules/status');
  }

  /**
   * Get rule metadata by ID
   */
  async getRuleMetadata(ruleId: string): Promise<MetadataResponse> {
    return this.makeRequest<MetadataResponse>(`/minimal-gorules/rules/${ruleId}/metadata`);
  }

  /**
   * Get all available rules metadata
   */
  async getAllRuleMetadata(): Promise<MetadataResponse> {
    return this.makeRequest<MetadataResponse>('/minimal-gorules/rules/metadata');
  }

  /**
   * Get rules by tags
   */
  async getRulesByTags(tags: string[]): Promise<RulesByTagsResponse> {
    return this.makeRequest<RulesByTagsResponse>('/minimal-gorules/rules/by-tags', {
      method: 'POST',
      body: JSON.stringify({ tags })
    });
  }

  /**
   * Validate a rule exists and is executable
   */
  async validateRule(ruleId: string): Promise<ValidateRuleResponse> {
    return this.makeRequest<ValidateRuleResponse>(`/minimal-gorules/rules/${ruleId}/validate`);
  }

  /**
   * Check rule versions
   */
  async checkVersions(): Promise<VersionCheckResponse> {
    return this.makeRequest<VersionCheckResponse>('/minimal-gorules/cache/check-versions', {
      method: 'POST'
    });
  }

  /**
   * Refresh cache for specific rules or all rules
   */
  async refreshCache(ruleIds?: string[]): Promise<CacheRefreshResponse> {
    const body = ruleIds ? { ruleIds } : {};
    
    return this.makeRequest<CacheRefreshResponse>('/minimal-gorules/cache/refresh', {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  /**
   * Force refresh entire cache
   */
  async forceRefreshCache(): Promise<ForceRefreshResponse> {
    return this.makeRequest<ForceRefreshResponse>('/minimal-gorules/cache/force-refresh', {
      method: 'POST'
    });
  }

  /**
   * Update service configuration
   */
  updateConfig(newConfig: Partial<ReactGoRulesConfig>): void {
    Object.assign(this.config, newConfig);
  }

  /**
   * Get current configuration
   */
  getConfig(): ReactGoRulesConfig {
    return { ...this.config };
  }
}