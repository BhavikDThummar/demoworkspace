/**
 * Cloud Rule Loader Service for GoRules Cloud API integration
 * High-performance HTTP client for project-wide rule loading
 */

import {
  IRuleLoaderService,
  MinimalRuleMetadata,
  MinimalGoRulesConfig,
} from '../interfaces/index.js';
import { MinimalGoRulesError } from '../errors/index.js';

/**
 * GoRules Cloud API response interfaces
 */
interface GoRulesProjectResponse {
  rules: GoRulesRuleResponse[];
}

interface GoRulesRuleResponse {
  id: string;
  name: string;
  version: string;
  tags: string[];
  lastModified: string; // ISO date string
  content: string; // Base64 encoded decision JSON
}

interface GoRulesRuleDetailResponse {
  id: string;
  name: string;
  version: string;
  tags: string[];
  lastModified: string;
  content: string;
}

/**
 * HTTP client configuration
 */
interface HttpClientConfig {
  timeout: number;
  baseUrl: string;
  headers: Record<string, string>;
}

/**
 * Minimal HTTP client for GoRules Cloud API
 * Direct implementation without heavy abstractions
 */
class MinimalHttpClient {
  private readonly config: HttpClientConfig;

  constructor(config: HttpClientConfig) {
    this.config = config;
  }

  async get<T>(path: string): Promise<T> {
    const url = `${this.config.baseUrl}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.config.headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return (await response.json()) as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw MinimalGoRulesError.timeout(`GET ${path}`);
        }
        if (error instanceof MinimalGoRulesError) {
          throw error;
        }
        throw MinimalGoRulesError.networkError(`Failed to fetch ${path}`, error);
      }

      throw MinimalGoRulesError.networkError(`Unknown error fetching ${path}`);
    }
  }
}

/**
 * Cloud Rule Loader Service implementation
 * Optimized for project-wide rule loading with minimal overhead from GoRules Cloud API
 */
export class CloudRuleLoaderService implements IRuleLoaderService {
  private readonly httpClient: MinimalHttpClient;
  private readonly projectId: string;

  constructor(config: MinimalGoRulesConfig) {
    this.projectId = config.projectId!;

    // Initialize HTTP client with minimal configuration
    this.httpClient = new MinimalHttpClient({
      timeout: config.httpTimeout || 5000,
      baseUrl: config.apiUrl!.endsWith('/') ? config.apiUrl!.slice(0, -1) : config.apiUrl!,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'minimal-gorules-engine/1.0.0',
      },
    });
  }

  /**
   * Load all rules from GoRules Cloud project at startup
   * Primary method for initial rule loading
   */
  async loadAllRules(
    projectId?: string,
  ): Promise<Map<string, { data: Buffer; metadata: MinimalRuleMetadata }>> {
    const targetProjectId = projectId || this.projectId;

    try {
      const response = await this.httpClient.get<GoRulesProjectResponse>(
        `/api/v1/projects/${targetProjectId}/rules`,
      );

      const rules = new Map<string, { data: Buffer; metadata: MinimalRuleMetadata }>();

      for (const rule of response.rules) {
        const { data, metadata } = this.parseRuleResponse(rule);
        rules.set(rule.id, { data, metadata });
      }

      return rules;
    } catch (error) {
      if (error instanceof MinimalGoRulesError) {
        throw error;
      }
      throw MinimalGoRulesError.networkError(
        `Failed to load all rules for project ${targetProjectId}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Load individual rule for updates and version checking
   */
  async loadRule(ruleId: string): Promise<{ data: Buffer; metadata: MinimalRuleMetadata }> {
    try {
      const response = await this.httpClient.get<GoRulesRuleDetailResponse>(
        `/api/v1/projects/${this.projectId}/rules/${ruleId}`,
      );

      return this.parseRuleResponse(response);
    } catch (error) {
      if (error instanceof MinimalGoRulesError) {
        throw error;
      }
      throw MinimalGoRulesError.networkError(
        `Failed to load rule ${ruleId}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Check versions of multiple rules for cache invalidation
   */
  async checkVersions(rules: Map<string, string>): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    // For efficiency, we'll batch check by loading all rules and comparing versions
    // This is more efficient than individual API calls for each rule
    try {
      const allRules = await this.loadAllRules();

      for (const [ruleId, currentVersion] of rules) {
        const ruleData = allRules.get(ruleId);
        if (ruleData) {
          // Rule needs update if versions don't match
          results.set(ruleId, ruleData.metadata.version !== currentVersion);
        } else {
          // Rule not found, mark as needing update (will be removed from cache)
          results.set(ruleId, true);
        }
      }

      return results;
    } catch (error) {
      if (error instanceof MinimalGoRulesError) {
        throw error;
      }
      throw MinimalGoRulesError.networkError(
        'Failed to check rule versions',
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Refresh individual rule (alias for loadRule for consistency)
   */
  async refreshRule(ruleId: string): Promise<{ data: Buffer; metadata: MinimalRuleMetadata }> {
    return this.loadRule(ruleId);
  }

  /**
   * Parse GoRules API response into internal format
   * Converts Base64 content to Buffer and creates metadata
   */
  private parseRuleResponse(rule: GoRulesRuleResponse | GoRulesRuleDetailResponse): {
    data: Buffer;
    metadata: MinimalRuleMetadata;
  } {
    try {
      // Decode Base64 content to Buffer
      const data = Buffer.from(rule.content, 'base64');

      // Validate that the content is valid JSON
      try {
        JSON.parse(data.toString('utf-8'));
      } catch {
        throw new Error(`Invalid JSON content for rule ${rule.id}`);
      }

      // Create metadata
      const metadata: MinimalRuleMetadata = {
        id: rule.id,
        version: rule.version,
        tags: rule.tags || [],
        lastModified: new Date(rule.lastModified).getTime(),
      };

      return { data, metadata };
    } catch (error) {
      throw MinimalGoRulesError.networkError(
        `Failed to parse rule response for ${rule.id}`,
        error instanceof Error ? error : undefined,
      );
    }
  }
}