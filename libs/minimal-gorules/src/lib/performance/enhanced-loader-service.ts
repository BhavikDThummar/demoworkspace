/**
 * Enhanced Rule Loader Service with Performance Optimizations
 * Includes connection pooling, request batching, and compression
 */

import {
  IRuleLoaderService,
  MinimalRuleMetadata,
  MinimalGoRulesConfig,
} from '../interfaces/index.js';
import { MinimalGoRulesError } from '../errors/index.js';
import { ConnectionPool, PooledRequestOptions } from './connection-pool.js';
import {
  RuleLoadBatcher,
  VersionCheckBatcher,
  RuleLoadRequest,
  RuleLoadResponse,
  VersionCheckRequest,
  VersionCheckResponse,
  BatchResult,
} from './request-batcher.js';
import { CompressionManager, CompressionAlgorithm } from './compression.js';
import { MemoryManager, getGlobalMemoryManager } from './memory-manager.js';

/**
 * Enhanced loader configuration
 */
export interface EnhancedLoaderConfig extends MinimalGoRulesConfig {
  /** Enable connection pooling */
  enableConnectionPooling?: boolean;
  /** Enable request batching */
  enableRequestBatching?: boolean;
  /** Enable compression */
  enableCompression?: boolean;
  /** Compression algorithm */
  compressionAlgorithm?: CompressionAlgorithm;
  /** Connection pool configuration */
  connectionPool?: {
    maxConnections?: number;
    maxRequestsPerConnection?: number;
    keepAliveTimeout?: number;
  };
  /** Batch configuration */
  batching?: {
    maxBatchSize?: number;
    maxWaitTime?: number;
    maxConcurrentBatches?: number;
  };
  /** Memory management */
  memoryManagement?: {
    enableMonitoring?: boolean;
    warningThreshold?: number;
    criticalThreshold?: number;
    cleanupInterval?: number;
  };
}

/**
 * GoRules Cloud API response interfaces (enhanced)
 */
interface GoRulesProjectResponse {
  rules: GoRulesRuleResponse[];
  compression?: {
    algorithm: string;
    originalSize: number;
    compressedSize: number;
  };
}

interface GoRulesRuleResponse {
  id: string;
  name: string;
  version: string;
  tags: string[];
  lastModified: string;
  content: string; // Base64 encoded decision JSON
  compression?: {
    algorithm: string;
    originalSize: number;
  };
}

interface GoRulesBatchResponse {
  rules: GoRulesRuleResponse[];
  errors?: Array<{
    ruleId: string;
    error: string;
  }>;
}

/**
 * Enhanced Rule Loader Service with performance optimizations
 */
export class EnhancedRuleLoaderService implements IRuleLoaderService {
  private config: EnhancedLoaderConfig;
  private connectionPool?: ConnectionPool;
  private ruleLoadBatcher?: RuleLoadBatcher;
  private versionCheckBatcher?: VersionCheckBatcher;
  private compressionManager?: CompressionManager;
  private memoryManager?: MemoryManager;
  private projectId: string;

  constructor(config: EnhancedLoaderConfig) {
    this.config = {
      enableConnectionPooling: true,
      enableRequestBatching: true,
      enableCompression: true,
      compressionAlgorithm: 'gzip',
      ...config,
    };

    this.projectId = config.projectId;
    this.initializeOptimizations();
  }

  /**
   * Load all rules from GoRules Cloud project with optimizations
   */
  async loadAllRules(
    projectId?: string,
  ): Promise<Map<string, { data: Buffer; metadata: MinimalRuleMetadata }>> {
    const targetProjectId = projectId || this.projectId;

    try {
      const response = await this.makeRequest<GoRulesProjectResponse>({
        method: 'GET',
        path: `/api/v1/projects/${targetProjectId}/rules`,
        headers: this.getCompressionHeaders(),
      });

      const rules = new Map<string, { data: Buffer; metadata: MinimalRuleMetadata }>();

      // Process rules with potential decompression
      for (const rule of response.rules) {
        const { data, metadata } = await this.parseRuleResponse(rule);
        rules.set(rule.id, { data, metadata });
      }

      // Register memory cleanup callback
      if (this.memoryManager) {
        this.memoryManager.registerCleanupCallback(async () => {
          // Cleanup can be implemented here if needed
          console.log('Memory cleanup triggered for rule loader');
        });
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
   * Load individual rule with batching support
   */
  async loadRule(ruleId: string): Promise<{ data: Buffer; metadata: MinimalRuleMetadata }> {
    if (this.ruleLoadBatcher && this.config.enableRequestBatching) {
      // Use batching for better performance
      const response = await this.ruleLoadBatcher.loadRule(ruleId, this.projectId);
      return {
        data: response.data,
        metadata: response.metadata,
      };
    }

    // Fallback to direct loading
    return this.loadRuleDirect(ruleId);
  }

  /**
   * Check versions with batching support
   */
  async checkVersions(rules: Map<string, string>): Promise<Map<string, boolean>> {
    if (this.versionCheckBatcher && this.config.enableRequestBatching) {
      // Use batching for better performance
      const responses = await this.versionCheckBatcher.checkVersions(rules);
      const results = new Map<string, boolean>();

      for (const [ruleId, response] of responses) {
        results.set(ruleId, response.needsUpdate);
      }

      return results;
    }

    // Fallback to loading all rules and comparing
    return this.checkVersionsDirect(rules);
  }

  /**
   * Refresh individual rule (alias for loadRule)
   */
  async refreshRule(ruleId: string): Promise<{ data: Buffer; metadata: MinimalRuleMetadata }> {
    return this.loadRule(ruleId);
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): {
    connectionPool?: any;
    batching?: {
      ruleLoad?: any;
      versionCheck?: any;
    };
    compression?: any;
    memory?: any;
  } {
    return {
      connectionPool: this.connectionPool?.getStats(),
      batching: {
        ruleLoad: this.ruleLoadBatcher?.getStats(),
        versionCheck: this.versionCheckBatcher?.getStats(),
      },
      compression: this.compressionManager?.getStats(),
      memory: this.memoryManager?.getMemoryReport(),
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.connectionPool) {
      await this.connectionPool.close();
    }

    if (this.ruleLoadBatcher) {
      await this.ruleLoadBatcher.flush();
    }

    if (this.versionCheckBatcher) {
      await this.versionCheckBatcher.flush();
    }

    if (this.memoryManager) {
      this.memoryManager.stopMonitoring();
    }
  }

  /**
   * Initialize performance optimizations
   */
  private initializeOptimizations(): void {
    // Initialize connection pooling
    if (this.config.enableConnectionPooling && this.config.apiUrl) {
      const baseUrl = this.config.apiUrl.endsWith('/')
        ? this.config.apiUrl.slice(0, -1)
        : this.config.apiUrl;
      const defaultHeaders = {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'minimal-gorules-engine/1.0.0',
      };

      this.connectionPool = new ConnectionPool(baseUrl, defaultHeaders, {
        maxConnections: this.config.connectionPool?.maxConnections || 10,
        maxRequestsPerConnection: this.config.connectionPool?.maxRequestsPerConnection || 100,
        connectionTimeout: this.config.httpTimeout || 5000,
        requestTimeout: this.config.httpTimeout || 10000,
        keepAliveTimeout: this.config.connectionPool?.keepAliveTimeout || 30000,
        queueTimeout: 5000,
        enableHttp2: false,
        retry: {
          maxRetries: 3,
          retryDelay: 1000,
          retryOnTimeout: true,
        },
      });
    }

    // Initialize request batching
    if (this.config.enableRequestBatching) {
      // Rule loading batcher
      this.ruleLoadBatcher = new RuleLoadBatcher(
        async (requests) => this.executeBatchRuleLoad(requests),
        {
          maxBatchSize: this.config.batching?.maxBatchSize || 20,
          maxWaitTime: this.config.batching?.maxWaitTime || 50,
          maxConcurrentBatches: this.config.batching?.maxConcurrentBatches || 3,
          enableAutoBatching: true,
        },
      );

      // Version check batcher
      this.versionCheckBatcher = new VersionCheckBatcher(
        async (requests) => this.executeBatchVersionCheck(requests),
        {
          maxBatchSize: this.config.batching?.maxBatchSize || 100,
          maxWaitTime: this.config.batching?.maxWaitTime || 200,
          maxConcurrentBatches: this.config.batching?.maxConcurrentBatches || 2,
          enableAutoBatching: true,
        },
      );
    }

    // Initialize compression
    if (this.config.enableCompression) {
      this.compressionManager = new CompressionManager({
        algorithm: this.config.compressionAlgorithm || 'gzip',
        level: 6,
        threshold: 1024,
      });
    }

    // Initialize memory management
    if (this.config.memoryManagement?.enableMonitoring) {
      this.memoryManager = getGlobalMemoryManager({
        warningThreshold: this.config.memoryManagement.warningThreshold || 0.7,
        criticalThreshold: this.config.memoryManagement.criticalThreshold || 0.85,
        cleanupInterval: this.config.memoryManagement.cleanupInterval || 30000,
      });

      this.memoryManager.startMonitoring(5000);
    }
  }

  /**
   * Make HTTP request using connection pool or fetch
   */
  private async makeRequest<T>(options: PooledRequestOptions): Promise<T> {
    if (this.connectionPool) {
      const response = await this.connectionPool.request(options);

      if (response.status >= 400) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Handle compressed responses
      let responseBody = response.body;
      if (this.compressionManager && response.headers['content-encoding']) {
        const algorithm = this.getCompressionAlgorithmFromHeader(
          response.headers['content-encoding'],
        );
        if (algorithm !== 'none') {
          const decompressed = await this.compressionManager.decompress(
            Buffer.from(responseBody),
            algorithm,
          );
          responseBody = decompressed.toString();
        }
      }

      return JSON.parse(responseBody) as T;
    }

    // Fallback to direct fetch
    return this.makeDirectRequest<T>(options);
  }

  /**
   * Make direct HTTP request without connection pooling
   */
  private async makeDirectRequest<T>(options: PooledRequestOptions): Promise<T> {
    const url = `${this.config.apiUrl}${options.path}`;
    const timeout = options.timeout || this.config.httpTimeout || 10000;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const headers = {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'minimal-gorules-engine/1.0.0',
        ...options.headers,
      };

      const requestOptions: RequestInit = {
        method: options.method,
        headers,
        signal: controller.signal,
      };

      if (options.body) {
        requestOptions.body = options.body as any;
      }

      const response = await fetch(url, requestOptions);
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return (await response.json()) as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw MinimalGoRulesError.timeout(`request to ${options.path}`);
        }
        throw MinimalGoRulesError.networkError(`Failed to fetch ${options.path}`, error);
      }

      throw MinimalGoRulesError.networkError(`Unknown error fetching ${options.path}`);
    }
  }

  /**
   * Load rule directly without batching
   */
  private async loadRuleDirect(
    ruleId: string,
  ): Promise<{ data: Buffer; metadata: MinimalRuleMetadata }> {
    const response = await this.makeRequest<GoRulesRuleResponse>({
      method: 'GET',
      path: `/api/v1/projects/${this.projectId}/rules/${ruleId}`,
      headers: this.getCompressionHeaders(),
    });

    return this.parseRuleResponse(response);
  }

  /**
   * Check versions directly without batching
   */
  private async checkVersionsDirect(rules: Map<string, string>): Promise<Map<string, boolean>> {
    const allRules = await this.loadAllRules();
    const results = new Map<string, boolean>();

    for (const [ruleId, currentVersion] of rules) {
      const ruleData = allRules.get(ruleId);
      if (ruleData) {
        results.set(ruleId, ruleData.metadata.version !== currentVersion);
      } else {
        results.set(ruleId, true); // Rule not found, needs update
      }
    }

    return results;
  }

  /**
   * Execute batch rule loading
   */
  private async executeBatchRuleLoad(
    requests: Map<string, RuleLoadRequest>,
  ): Promise<BatchResult<RuleLoadResponse>> {
    const ruleIds = Array.from(requests.values()).map((req) => req.ruleId);
    const projectId = Array.from(requests.values())[0]?.projectId || this.projectId;

    try {
      const response = await this.makeRequest<GoRulesBatchResponse>({
        method: 'POST',
        path: `/api/v1/projects/${projectId}/rules/batch`,
        headers: this.getCompressionHeaders(),
        body: JSON.stringify({ ruleIds }),
      });

      const results = new Map<string, RuleLoadResponse>();
      const errors = new Map<string, Error>();

      // Process successful rules
      for (const rule of response.rules) {
        try {
          const { data, metadata } = await this.parseRuleResponse(rule);
          results.set(rule.id, { data, metadata });
        } catch (error) {
          errors.set(rule.id, error as Error);
        }
      }

      // Process errors
      if (response.errors) {
        for (const errorInfo of response.errors) {
          errors.set(errorInfo.ruleId, new Error(errorInfo.error));
        }
      }

      return {
        results,
        errors,
        batchSize: ruleIds.length,
        executionTime: 0, // Will be measured by the batcher
      };
    } catch (error) {
      // If batch request fails, return errors for all rules
      const errors = new Map<string, Error>();
      for (const ruleId of ruleIds) {
        errors.set(ruleId, error as Error);
      }

      return {
        results: new Map(),
        errors,
        batchSize: ruleIds.length,
        executionTime: 0,
      };
    }
  }

  /**
   * Execute batch version checking
   */
  private async executeBatchVersionCheck(
    requests: Map<string, VersionCheckRequest>,
  ): Promise<BatchResult<VersionCheckResponse>> {
    const versionMap = new Map<string, string>();
    for (const [, request] of requests) {
      versionMap.set(request.ruleId, request.currentVersion);
    }

    try {
      const response = await this.makeRequest<{
        rules: Array<{
          ruleId: string;
          currentVersion: string;
          latestVersion: string;
          needsUpdate: boolean;
        }>;
      }>({
        method: 'POST',
        path: `/api/v1/projects/${this.projectId}/rules/versions/check`,
        headers: this.getCompressionHeaders(),
        body: JSON.stringify({
          rules: Array.from(versionMap.entries()).map(([ruleId, version]) => ({
            ruleId,
            currentVersion: version,
          })),
        }),
      });

      const results = new Map<string, VersionCheckResponse>();

      for (const rule of response.rules) {
        results.set(rule.ruleId, {
          ruleId: rule.ruleId,
          needsUpdate: rule.needsUpdate,
          latestVersion: rule.latestVersion,
        });
      }

      return {
        results,
        errors: new Map(),
        batchSize: requests.size,
        executionTime: 0,
      };
    } catch (error) {
      // Fallback to individual checks or return errors
      const errors = new Map<string, Error>();
      for (const [id] of requests) {
        errors.set(id, error as Error);
      }

      return {
        results: new Map(),
        errors,
        batchSize: requests.size,
        executionTime: 0,
      };
    }
  }

  /**
   * Parse GoRules API response with compression support
   */
  private async parseRuleResponse(
    rule: GoRulesRuleResponse,
  ): Promise<{ data: Buffer; metadata: MinimalRuleMetadata }> {
    try {
      // Decode Base64 content to Buffer
      let data = Buffer.from(rule.content, 'base64');

      // Decompress if needed
      if (this.compressionManager && rule.compression) {
        const algorithm = this.getCompressionAlgorithmFromString(rule.compression.algorithm);
        if (algorithm !== 'none') {
          const decompressedData = await this.compressionManager.decompress(data as any, algorithm);
          data = decompressedData as any;
        }
      }

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

  /**
   * Get compression headers for requests
   */
  private getCompressionHeaders(): Record<string, string> {
    if (!this.config.enableCompression) {
      return {};
    }

    const headers: Record<string, string> = {};

    // Accept compressed responses
    switch (this.config.compressionAlgorithm) {
      case 'gzip':
        headers['Accept-Encoding'] = 'gzip';
        break;
      case 'deflate':
        headers['Accept-Encoding'] = 'deflate';
        break;
    }

    return headers;
  }

  /**
   * Get compression algorithm from HTTP header
   */
  private getCompressionAlgorithmFromHeader(encoding: string): CompressionAlgorithm {
    switch (encoding.toLowerCase()) {
      case 'gzip':
        return 'gzip';
      case 'deflate':
        return 'deflate';
      default:
        return 'none';
    }
  }

  /**
   * Get compression algorithm from string
   */
  private getCompressionAlgorithmFromString(algorithm: string): CompressionAlgorithm {
    switch (algorithm.toLowerCase()) {
      case 'gzip':
        return 'gzip';
      case 'deflate':
        return 'deflate';
      default:
        return 'none';
    }
  }
}
