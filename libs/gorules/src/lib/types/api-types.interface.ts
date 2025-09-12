/**
 * HTTP method types for GoRules API calls
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

/**
 * HTTP status codes relevant to GoRules API
 */
export enum HttpStatusCode {
  OK = 200,
  CREATED = 201,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_SERVER_ERROR = 500,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503,
  GATEWAY_TIMEOUT = 504
}

/**
 * API request configuration
 */
export interface ApiRequestConfig {
  /** HTTP method */
  method: HttpMethod;
  
  /** Request URL */
  url: string;
  
  /** Request headers */
  headers?: Record<string, string>;
  
  /** Request body */
  body?: unknown;
  
  /** Request timeout in milliseconds */
  timeout?: number;
  
  /** Number of retry attempts */
  retries?: number;
}

/**
 * API response structure
 */
export interface ApiResponse<T = unknown> {
  /** Response status code */
  status: number;
  
  /** Response status text */
  statusText: string;
  
  /** Response headers */
  headers: Record<string, string>;
  
  /** Response data */
  data: T;
  
  /** Response metadata */
  metadata?: {
    /** Request duration in milliseconds */
    duration: number;
    
    /** Request timestamp */
    timestamp: Date;
    
    /** Request ID for tracing */
    requestId?: string;
  };
}

/**
 * API error response structure
 */
export interface ApiErrorResponse {
  /** Error code */
  code: string;
  
  /** Error message */
  message: string;
  
  /** Detailed error information */
  details?: {
    /** Field-specific errors */
    fields?: Record<string, string[]>;
    
    /** Additional error context */
    context?: Record<string, unknown>;
    
    /** Error trace ID */
    traceId?: string;
  };
  
  /** HTTP status code */
  status: number;
  
  /** Timestamp when the error occurred */
  timestamp: Date;
}

/**
 * Paginated API response
 */
export interface PaginatedResponse<T> {
  /** Array of items */
  items: T[];
  
  /** Pagination metadata */
  pagination: {
    /** Current page number (1-based) */
    page: number;
    
    /** Number of items per page */
    pageSize: number;
    
    /** Total number of items */
    totalItems: number;
    
    /** Total number of pages */
    totalPages: number;
    
    /** Whether there is a next page */
    hasNext: boolean;
    
    /** Whether there is a previous page */
    hasPrevious: boolean;
  };
}

/**
 * API request options for pagination
 */
export interface PaginationOptions {
  /** Page number (1-based) */
  page?: number;
  
  /** Number of items per page */
  pageSize?: number;
  
  /** Sort field */
  sortBy?: string;
  
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
  
  /** Filter criteria */
  filters?: Record<string, unknown>;
}

/**
 * GoRules API endpoints
 */
export interface GoRulesApiEndpoints {
  /** Base API URL */
  baseUrl: string;
  
  /** Rules endpoint */
  rules: string;
  
  /** Rule execution endpoint */
  execute: string;
  
  /** Rule validation endpoint */
  validate: string;
  
  /** Rule metadata endpoint */
  metadata: string;
  
  /** Health check endpoint */
  health: string;
}

/**
 * API client configuration
 */
export interface ApiClientConfig {
  /** Base URL for the API */
  baseUrl: string;
  
  /** API key for authentication */
  apiKey: string;
  
  /** Default request timeout in milliseconds */
  timeout: number;
  
  /** Default number of retry attempts */
  retries: number;
  
  /** Request interceptors */
  interceptors?: {
    /** Request interceptor */
    request?: (config: ApiRequestConfig) => ApiRequestConfig | Promise<ApiRequestConfig>;
    
    /** Response interceptor */
    response?: <T>(response: ApiResponse<T>) => ApiResponse<T> | Promise<ApiResponse<T>>;
    
    /** Error interceptor */
    error?: (error: ApiErrorResponse) => ApiErrorResponse | Promise<ApiErrorResponse>;
  };
}

/**
 * Rate limiting information
 */
export interface RateLimitInfo {
  /** Maximum number of requests allowed */
  limit: number;
  
  /** Number of requests remaining */
  remaining: number;
  
  /** Time when the rate limit resets (Unix timestamp) */
  resetTime: number;
  
  /** Time window for the rate limit in seconds */
  windowSize: number;
}

/**
 * API health check response
 */
export interface HealthCheckResponse {
  /** Service status */
  status: 'healthy' | 'degraded' | 'unhealthy';
  
  /** Service version */
  version: string;
  
  /** Timestamp of the health check */
  timestamp: Date;
  
  /** Detailed health information */
  details?: {
    /** Database connectivity */
    database?: 'connected' | 'disconnected';
    
    /** External service dependencies */
    dependencies?: Record<string, 'available' | 'unavailable'>;
    
    /** System metrics */
    metrics?: {
      /** CPU usage percentage */
      cpu?: number;
      
      /** Memory usage percentage */
      memory?: number;
      
      /** Disk usage percentage */
      disk?: number;
    };
  };
}