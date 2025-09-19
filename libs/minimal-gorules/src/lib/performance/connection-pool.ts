/**
 * HTTP Connection Pool for GoRules Cloud API
 * Provides connection reuse, request queuing, and performance optimization
 */

/**
 * Connection pool configuration
 */
export interface ConnectionPoolConfig {
  /** Maximum number of concurrent connections */
  maxConnections: number;
  /** Maximum number of requests per connection */
  maxRequestsPerConnection: number;
  /** Connection timeout in milliseconds */
  connectionTimeout: number;
  /** Request timeout in milliseconds */
  requestTimeout: number;
  /** Keep-alive timeout in milliseconds */
  keepAliveTimeout: number;
  /** Maximum time to wait for an available connection */
  queueTimeout: number;
  /** Enable HTTP/2 if available */
  enableHttp2: boolean;
  /** Retry configuration */
  retry: {
    maxRetries: number;
    retryDelay: number;
    retryOnTimeout: boolean;
  };
}

/**
 * Connection statistics
 */
export interface ConnectionStats {
  totalConnections: number;
  activeConnections: number;
  queuedRequests: number;
  completedRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  connectionReuses: number;
}

/**
 * HTTP request options
 */
export interface PooledRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  headers?: Record<string, string>;
  body?: string | Buffer;
  timeout?: number;
  retries?: number;
}

/**
 * HTTP response
 */
export interface PooledResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  responseTime: number;
}

/**
 * Connection pool error
 */
export class ConnectionPoolError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public override readonly cause?: Error
  ) {
    super(message);
    this.name = 'ConnectionPoolError';
  }

  static timeout(operation: string): ConnectionPoolError {
    return new ConnectionPoolError(`Operation timed out: ${operation}`, 'TIMEOUT');
  }

  static poolExhausted(): ConnectionPoolError {
    return new ConnectionPoolError('Connection pool exhausted', 'POOL_EXHAUSTED');
  }

  static connectionFailed(cause: Error): ConnectionPoolError {
    return new ConnectionPoolError('Connection failed', 'CONNECTION_FAILED', cause);
  }
}

/**
 * Queued request
 */
interface QueuedRequest {
  options: PooledRequestOptions;
  resolve: (response: PooledResponse) => void;
  reject: (error: Error) => void;
  timestamp: number;
  retryCount: number;
}

/**
 * Connection wrapper
 */
interface PooledConnection {
  id: string;
  requestCount: number;
  lastUsed: number;
  inUse: boolean;
  controller?: AbortController;
}

/**
 * HTTP Connection Pool implementation
 */
export class ConnectionPool {
  private config: ConnectionPoolConfig;
  private connections: Map<string, PooledConnection> = new Map();
  private requestQueue: QueuedRequest[] = [];
  private stats: ConnectionStats = {
    totalConnections: 0,
    activeConnections: 0,
    queuedRequests: 0,
    completedRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    connectionReuses: 0
  };
  private responseTimeSum = 0;
  private cleanupInterval?: NodeJS.Timeout;
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  constructor(
    baseUrl: string,
    defaultHeaders: Record<string, string> = {},
    config: Partial<ConnectionPoolConfig> = {}
  ) {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    this.defaultHeaders = defaultHeaders;
    
    this.config = {
      maxConnections: 10,
      maxRequestsPerConnection: 100,
      connectionTimeout: 5000,
      requestTimeout: 10000,
      keepAliveTimeout: 30000,
      queueTimeout: 5000,
      enableHttp2: false,
      retry: {
        maxRetries: 3,
        retryDelay: 1000,
        retryOnTimeout: true
      },
      ...config
    };

    // Start cleanup interval
    this.startCleanup();
  }

  /**
   * Make an HTTP request using the connection pool
   */
  async request(options: PooledRequestOptions): Promise<PooledResponse> {
    return new Promise((resolve, reject) => {
      const queuedRequest: QueuedRequest = {
        options,
        resolve,
        reject,
        timestamp: Date.now(),
        retryCount: 0
      };

      this.enqueueRequest(queuedRequest);
      this.processQueue();
    });
  }

  /**
   * Get connection pool statistics
   */
  getStats(): ConnectionStats {
    return { ...this.stats };
  }

  /**
   * Close all connections and cleanup
   */
  async close(): Promise<void> {
    // Stop cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }

    // Abort all active connections
    for (const connection of this.connections.values()) {
      if (connection.controller) {
        connection.controller.abort();
      }
    }

    // Reject all queued requests
    for (const queuedRequest of this.requestQueue) {
      queuedRequest.reject(new ConnectionPoolError('Connection pool closed', 'POOL_CLOSED'));
    }

    this.connections.clear();
    this.requestQueue = [];
    this.resetStats();
  }

  /**
   * Enqueue a request
   */
  private enqueueRequest(request: QueuedRequest): void {
    // Check queue timeout
    const queueTime = Date.now() - request.timestamp;
    if (queueTime > this.config.queueTimeout) {
      request.reject(ConnectionPoolError.timeout('queue wait'));
      return;
    }

    this.requestQueue.push(request);
    this.stats.queuedRequests = this.requestQueue.length;
  }

  /**
   * Process the request queue
   */
  private async processQueue(): Promise<void> {
    while (this.requestQueue.length > 0 && this.canCreateConnection()) {
      const request = this.requestQueue.shift()!;
      this.stats.queuedRequests = this.requestQueue.length;

      try {
        await this.executeRequest(request);
      } catch (error) {
        // Error handling is done in executeRequest
      }
    }
  }

  /**
   * Execute a single request
   */
  private async executeRequest(request: QueuedRequest): Promise<void> {
    const startTime = performance.now();
    let connection: PooledConnection | null = null;

    try {
      // Get or create connection
      connection = this.getAvailableConnection();
      if (!connection) {
        connection = await this.createConnection();
      }

      // Mark connection as in use
      connection.inUse = true;
      connection.lastUsed = Date.now();
      this.stats.activeConnections++;

      // Execute the request
      const response = await this.performRequest(connection, request.options);
      
      // Update connection stats
      connection.requestCount++;
      connection.inUse = false;
      this.stats.activeConnections--;

      // Check if connection should be retired
      if (connection.requestCount >= this.config.maxRequestsPerConnection) {
        this.retireConnection(connection.id);
      }

      // Update statistics
      const responseTime = performance.now() - startTime;
      this.updateStats(responseTime, true);

      // Resolve the request
      request.resolve(response);

      // Process next request in queue
      this.processQueue();

    } catch (error) {
      // Release connection
      if (connection) {
        connection.inUse = false;
        this.stats.activeConnections--;
      }

      // Update statistics
      const responseTime = performance.now() - startTime;
      this.updateStats(responseTime, false);

      // Handle retry logic
      if (this.shouldRetry(request, error as Error)) {
        request.retryCount++;
        
        // Add delay before retry
        setTimeout(() => {
          this.enqueueRequest(request);
          this.processQueue();
        }, this.config.retry.retryDelay * request.retryCount);
      } else {
        request.reject(error as Error);
      }
    }
  }

  /**
   * Perform the actual HTTP request
   */
  private async performRequest(
    connection: PooledConnection,
    options: PooledRequestOptions
  ): Promise<PooledResponse> {
    const url = `${this.baseUrl}${options.path}`;
    const timeout = options.timeout || this.config.requestTimeout;
    
    // Create abort controller for this request
    const controller = new AbortController();
    connection.controller = controller;
    
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeout);

    try {
      const headers = {
        ...this.defaultHeaders,
        ...options.headers
      };

      const requestOptions: RequestInit = {
        method: options.method,
        headers,
        signal: controller.signal
      };

      if (options.body) {
        requestOptions.body = options.body as BodyInit;
      }

      const startTime = performance.now();
      const response = await fetch(url, requestOptions);
      const responseTime = performance.now() - startTime;

      clearTimeout(timeoutId);

      // Read response body
      const body = await response.text();

      // Convert headers to object
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      return {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        body,
        responseTime
      };

    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw ConnectionPoolError.timeout(`request to ${options.path}`);
        }
        throw ConnectionPoolError.connectionFailed(error);
      }
      
      throw new ConnectionPoolError('Unknown request error', 'UNKNOWN_ERROR');
    } finally {
      connection.controller = undefined;
    }
  }

  /**
   * Get an available connection
   */
  private getAvailableConnection(): PooledConnection | null {
    for (const connection of this.connections.values()) {
      if (!connection.inUse && 
          connection.requestCount < this.config.maxRequestsPerConnection) {
        this.stats.connectionReuses++;
        return connection;
      }
    }
    return null;
  }

  /**
   * Create a new connection
   */
  private async createConnection(): Promise<PooledConnection> {
    if (this.connections.size >= this.config.maxConnections) {
      throw ConnectionPoolError.poolExhausted();
    }

    const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const connection: PooledConnection = {
      id: connectionId,
      requestCount: 0,
      lastUsed: Date.now(),
      inUse: false
    };

    this.connections.set(connectionId, connection);
    this.stats.totalConnections++;

    return connection;
  }

  /**
   * Retire a connection
   */
  private retireConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      if (connection.controller) {
        connection.controller.abort();
      }
      this.connections.delete(connectionId);
    }
  }

  /**
   * Check if we can create a new connection
   */
  private canCreateConnection(): boolean {
    return this.connections.size < this.config.maxConnections;
  }

  /**
   * Check if a request should be retried
   */
  private shouldRetry(request: QueuedRequest, error: Error): boolean {
    if (request.retryCount >= this.config.retry.maxRetries) {
      return false;
    }

    // Retry on timeout if configured
    if (error instanceof ConnectionPoolError && 
        error.code === 'TIMEOUT' && 
        this.config.retry.retryOnTimeout) {
      return true;
    }

    // Retry on connection failures
    if (error instanceof ConnectionPoolError && 
        error.code === 'CONNECTION_FAILED') {
      return true;
    }

    return false;
  }

  /**
   * Update statistics
   */
  private updateStats(responseTime: number, success: boolean): void {
    if (success) {
      this.stats.completedRequests++;
    } else {
      this.stats.failedRequests++;
    }

    this.responseTimeSum += responseTime;
    const totalRequests = this.stats.completedRequests + this.stats.failedRequests;
    this.stats.averageResponseTime = this.responseTimeSum / totalRequests;
  }

  /**
   * Reset statistics
   */
  private resetStats(): void {
    this.stats = {
      totalConnections: 0,
      activeConnections: 0,
      queuedRequests: 0,
      completedRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      connectionReuses: 0
    };
    this.responseTimeSum = 0;
  }

  /**
   * Start cleanup interval
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupIdleConnections();
    }, this.config.keepAliveTimeout / 2);
  }

  /**
   * Cleanup idle connections
   */
  private cleanupIdleConnections(): void {
    const now = Date.now();
    const connectionsToRemove: string[] = [];

    for (const [id, connection] of this.connections) {
      if (!connection.inUse && 
          (now - connection.lastUsed) > this.config.keepAliveTimeout) {
        connectionsToRemove.push(id);
      }
    }

    for (const id of connectionsToRemove) {
      this.retireConnection(id);
    }
  }
}