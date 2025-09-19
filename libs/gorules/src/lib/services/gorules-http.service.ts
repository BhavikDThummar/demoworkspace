import { Injectable, Logger } from '@nestjs/common';
import { GoRulesConfigService } from '../config/gorules.config.js';
import { GoRulesResilienceService } from './gorules-resilience.service.js';
import {
  ApiRequestConfig,
  ApiResponse,
  HttpStatusCode,
  GoRulesException,
  GoRulesErrorCode,
  RuleMetadata,
  RuleInputData,
} from '../types/index.js';

/**
 * HTTP client service for GoRules API communication
 */
@Injectable()
export class GoRulesHttpService {
  private readonly logger = new Logger(GoRulesHttpService.name);

  constructor(
    private readonly configService: GoRulesConfigService,
    private readonly resilienceService: GoRulesResilienceService,
  ) {}

  /**
   * Load a rule from the GoRules API
   */
  async loadRule(ruleId: string): Promise<Buffer> {
    const config = this.configService.getConfig();

    const requestConfig: ApiRequestConfig = {
      method: 'GET',
      url: `${config.apiUrl}/api/v1/rules/${ruleId}`,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'GoRules-NestJS-Client/1.0.0',
      },
      timeout: config.timeout,
      retries: config.retryAttempts,
    };

    try {
      const response = await this.resilienceService.withResilience(
        () => this.makeRequest<ArrayBuffer>(requestConfig),
        `load-rule-${ruleId}`,
        {
          retry: {
            maxAttempts: config.retryAttempts || 3,
            baseDelay: 200,
            maxDelay: 10000,
          },
          circuitBreaker: {
            failureThreshold: 5,
            resetTimeout: 60000,
            successThreshold: 3,
            requestTimeout: config.timeout || 30000,
          },
          rateLimit: {
            maxRequests: 50,
            windowSize: 60000,
            strategy: 'delay',
          },
        },
      );
      return Buffer.from(response.data);
    } catch (error) {
      this.logger.error(`Failed to load rule ${ruleId}`, error);
      throw this.mapHttpErrorToGoRulesException(error, `Failed to load rule: ${ruleId}`);
    }
  }

  /**
   * Get rule metadata from the GoRules API
   */
  async getRuleMetadata(ruleId: string): Promise<RuleMetadata> {
    const config = this.configService.getConfig();

    const requestConfig: ApiRequestConfig = {
      method: 'GET',
      url: `${config.apiUrl}/api/v1/rules/${ruleId}/metadata`,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: config.timeout,
      retries: config.retryAttempts,
    };

    try {
      const response = await this.makeRequest<{
        id: string;
        name: string;
        version: string;
        description?: string;
        tags?: string[];
        lastModified: string;
      }>(requestConfig);

      return {
        id: response.data.id,
        name: response.data.name,
        version: response.data.version,
        description: response.data.description,
        tags: response.data.tags || [],
        lastModified: new Date(response.data.lastModified),
      };
    } catch (error) {
      this.logger.error(`Failed to get metadata for rule ${ruleId}`, error);
      throw this.mapHttpErrorToGoRulesException(error, `Failed to get rule metadata: ${ruleId}`);
    }
  }

  /**
   * Execute a rule via HTTP API (alternative to Zen Engine)
   */
  async executeRuleViaApi<T extends RuleInputData, R = unknown>(
    ruleId: string,
    input: T,
    options?: { trace?: boolean; timeout?: number },
  ): Promise<{ result: R; trace?: any; performance: string }> {
    const config = this.configService.getConfig();

    const requestConfig: ApiRequestConfig = {
      method: 'POST',
      url: `${config.apiUrl}/api/v1/rules/${ruleId}/execute`,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: {
        input,
        options: {
          trace: options?.trace || false,
        },
      },
      timeout: options?.timeout || config.timeout,
      retries: config.retryAttempts,
    };

    try {
      const response = await this.makeRequest<{
        result: R;
        trace?: any;
        performance: string;
      }>(requestConfig);

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to execute rule ${ruleId} via API`, error);
      throw this.mapHttpErrorToGoRulesException(error, `Failed to execute rule via API: ${ruleId}`);
    }
  }

  /**
   * Validate a rule exists via HTTP API
   */
  async validateRuleExists(ruleId: string): Promise<boolean> {
    const config = this.configService.getConfig();

    const requestConfig: ApiRequestConfig = {
      method: 'HEAD',
      url: `${config.apiUrl}/api/v1/rules/${ruleId}`,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
      },
      timeout: config.timeout,
      retries: 1, // Fewer retries for validation
    };

    try {
      const response = await this.makeRequest(requestConfig);
      return response.status === HttpStatusCode.OK;
    } catch (error) {
      // If it's a 404, the rule doesn't exist
      if (this.isHttpError(error) && error.status === HttpStatusCode.NOT_FOUND) {
        return false;
      }

      // For other errors, we can't determine existence
      this.logger.warn(`Failed to validate rule existence for ${ruleId}`, error);
      return false;
    }
  }

  /**
   * Get health status of the GoRules API
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    version?: string;
    timestamp: Date;
  }> {
    const config = this.configService.getConfig();

    const requestConfig: ApiRequestConfig = {
      method: 'GET',
      url: `${config.apiUrl}/health`,
      timeout: 5000, // Short timeout for health checks
      retries: 0, // No retries for health checks
    };

    try {
      const response = await this.makeRequest<{
        status: string;
        version?: string;
        timestamp: string;
      }>(requestConfig);

      return {
        status: response.data.status as 'healthy' | 'degraded' | 'unhealthy',
        version: response.data.version,
        timestamp: new Date(response.data.timestamp),
      };
    } catch (error) {
      this.logger.warn('Health check failed', error);
      return {
        status: 'unhealthy',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Make an HTTP request with retry logic
   */
  private async makeRequest<T = unknown>(config: ApiRequestConfig): Promise<ApiResponse<T>> {
    const startTime = Date.now();
    let lastError: unknown;

    const maxRetries = config.retries || 0;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          // Exponential backoff: wait 2^attempt * 100ms
          const delay = Math.pow(2, attempt - 1) * 100;
          await this.sleep(delay);

          this.logger.debug(`Retrying request (attempt ${attempt}/${maxRetries})`, {
            url: config.url,
            method: config.method,
            delay,
          });
        }

        const response = await this.executeHttpRequest<T>(config);

        const duration = Date.now() - startTime;

        if (this.configService.get('enableLogging')) {
          this.logger.debug('HTTP request completed', {
            url: config.url,
            method: config.method,
            status: response.status,
            duration,
            attempt: attempt + 1,
          });
        }

        return response;
      } catch (error) {
        lastError = error;

        // Don't retry on certain errors
        if (this.isHttpError(error)) {
          if (
            error.status === HttpStatusCode.UNAUTHORIZED ||
            error.status === HttpStatusCode.FORBIDDEN ||
            error.status === HttpStatusCode.NOT_FOUND ||
            error.status === HttpStatusCode.BAD_REQUEST
          ) {
            break; // Don't retry client errors
          }
        }

        if (attempt === maxRetries) {
          break; // Last attempt failed
        }
      }
    }

    // All attempts failed
    const duration = Date.now() - startTime;

    this.logger.error('HTTP request failed after all retries', {
      url: config.url,
      method: config.method,
      attempts: maxRetries + 1,
      duration,
      error: lastError,
    });

    throw lastError;
  }

  /**
   * Execute the actual HTTP request (to be implemented with actual HTTP client)
   */
  private async executeHttpRequest<T>(config: ApiRequestConfig): Promise<ApiResponse<T>> {
    // This is a placeholder implementation
    // In a real implementation, you would use a library like axios, node-fetch, or the built-in fetch

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout || 30000);

    try {
      // Using fetch API (available in Node.js 18+)
      const response = await fetch(config.url, {
        method: config.method,
        headers: config.headers,
        body: config.body ? JSON.stringify(config.body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let data: T;
      const contentType = response.headers.get('content-type');

      if (contentType?.includes('application/json')) {
        data = (await response.json()) as T;
      } else if (config.url.includes('/rules/') && !config.url.includes('/metadata')) {
        // For rule loading, expect binary data
        const arrayBuffer = await response.arrayBuffer();
        data = arrayBuffer as T;
      } else {
        data = (await response.text()) as T;
      }

      if (!response.ok) {
        throw {
          status: response.status,
          statusText: response.statusText,
          data,
        };
      }

      return {
        status: response.status,
        statusText: response.statusText,
        headers: this.headersToObject(response.headers),
        data,
        metadata: {
          duration: Date.now() - Date.now(), // This would be calculated properly
          timestamp: new Date(),
          requestId: response.headers.get('x-request-id') || undefined,
        },
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new GoRulesException(
          GoRulesErrorCode.TIMEOUT,
          `Request timeout after ${config.timeout}ms`,
          { url: config.url, timeout: config.timeout },
          true,
        );
      }

      throw error;
    }
  }

  /**
   * Convert Headers object to plain object
   */
  private headersToObject(headers: Headers): Record<string, string> {
    const obj: Record<string, string> = {};
    headers.forEach((value, key) => {
      obj[key] = value;
    });
    return obj;
  }

  /**
   * Check if error is an HTTP error
   */
  private isHttpError(
    error: unknown,
  ): error is { status: number; statusText: string; data: unknown } {
    return (
      typeof error === 'object' &&
      error !== null &&
      'status' in error &&
      typeof (error as any).status === 'number'
    );
  }

  /**
   * Map HTTP errors to GoRules exceptions
   */
  private mapHttpErrorToGoRulesException(error: unknown, message: string): GoRulesException {
    if (error instanceof GoRulesException) {
      return error;
    }

    if (this.isHttpError(error)) {
      switch (error.status) {
        case HttpStatusCode.UNAUTHORIZED:
        case HttpStatusCode.FORBIDDEN:
          return new GoRulesException(
            GoRulesErrorCode.AUTHENTICATION_FAILED,
            `Authentication failed: ${message}`,
            { httpStatus: error.status, httpData: error.data },
            false,
          );

        case HttpStatusCode.NOT_FOUND:
          return new GoRulesException(
            GoRulesErrorCode.RULE_NOT_FOUND,
            `Resource not found: ${message}`,
            { httpStatus: error.status, httpData: error.data },
            false,
          );

        case HttpStatusCode.BAD_REQUEST:
        case HttpStatusCode.UNPROCESSABLE_ENTITY:
          return new GoRulesException(
            GoRulesErrorCode.INVALID_INPUT,
            `Invalid request: ${message}`,
            { httpStatus: error.status, httpData: error.data },
            false,
          );

        case HttpStatusCode.TOO_MANY_REQUESTS:
          return new GoRulesException(
            GoRulesErrorCode.RATE_LIMIT_EXCEEDED,
            `Rate limit exceeded: ${message}`,
            { httpStatus: error.status, httpData: error.data },
            true,
          );

        case HttpStatusCode.INTERNAL_SERVER_ERROR:
        case HttpStatusCode.BAD_GATEWAY:
        case HttpStatusCode.SERVICE_UNAVAILABLE:
        case HttpStatusCode.GATEWAY_TIMEOUT:
          return new GoRulesException(
            GoRulesErrorCode.NETWORK_ERROR,
            `Server error: ${message}`,
            { httpStatus: error.status, httpData: error.data },
            true,
          );

        default:
          return new GoRulesException(
            GoRulesErrorCode.INTERNAL_ERROR,
            `HTTP error: ${message}`,
            { httpStatus: error.status, httpData: error.data },
            error.status >= 500,
          );
      }
    }

    return new GoRulesException(
      GoRulesErrorCode.INTERNAL_ERROR,
      message,
      { originalError: error },
      false,
    );
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
