/**
 * Request Batching for Multiple Rule Operations
 * Optimizes API calls by batching multiple requests together
 */

/**
 * Batch configuration
 */
export interface BatchConfig {
  /** Maximum number of requests per batch */
  maxBatchSize: number;
  /** Maximum time to wait before sending a batch (ms) */
  maxWaitTime: number;
  /** Maximum number of concurrent batches */
  maxConcurrentBatches: number;
  /** Enable automatic batching */
  enableAutoBatching: boolean;
}

/**
 * Batchable request
 */
export interface BatchableRequest<TRequest, TResponse> {
  id: string;
  request: TRequest;
  resolve: (response: TResponse) => void;
  reject: (error: Error) => void;
  timestamp: number;
  priority: number;
}

/**
 * Batch execution result
 */
export interface BatchResult<TResponse> {
  results: Map<string, TResponse>;
  errors: Map<string, Error>;
  batchSize: number;
  executionTime: number;
}

/**
 * Batch executor function
 */
export type BatchExecutor<TRequest, TResponse> = (
  requests: Map<string, TRequest>
) => Promise<BatchResult<TResponse>>;

/**
 * Batch statistics
 */
export interface BatchStats {
  totalRequests: number;
  totalBatches: number;
  averageBatchSize: number;
  averageWaitTime: number;
  averageExecutionTime: number;
  batchEfficiency: number; // 0-1 score
}

/**
 * Request Batcher for optimizing multiple API calls
 */
export class RequestBatcher<TRequest, TResponse> {
  private config: BatchConfig;
  private pendingRequests: Map<string, BatchableRequest<TRequest, TResponse>> = new Map();
  private activeBatches = 0;
  private batchTimer?: NodeJS.Timeout;
  private stats: BatchStats = {
    totalRequests: 0,
    totalBatches: 0,
    averageBatchSize: 0,
    averageWaitTime: 0,
    averageExecutionTime: 0,
    batchEfficiency: 0
  };
  private waitTimeSum = 0;
  private executionTimeSum = 0;
  private batchSizeSum = 0;

  constructor(
    private executor: BatchExecutor<TRequest, TResponse>,
    config: Partial<BatchConfig> = {}
  ) {
    this.config = {
      maxBatchSize: 50,
      maxWaitTime: 100, // 100ms
      maxConcurrentBatches: 5,
      enableAutoBatching: true,
      ...config
    };
  }

  /**
   * Add a request to the batch queue
   */
  async addRequest(
    id: string,
    request: TRequest,
    priority: number = 0
  ): Promise<TResponse> {
    return new Promise((resolve, reject) => {
      const batchableRequest: BatchableRequest<TRequest, TResponse> = {
        id,
        request,
        resolve,
        reject,
        timestamp: Date.now(),
        priority
      };

      this.pendingRequests.set(id, batchableRequest);
      this.stats.totalRequests++;

      if (this.config.enableAutoBatching) {
        this.scheduleExecution();
      }
    });
  }

  /**
   * Execute all pending requests immediately
   */
  async flush(): Promise<void> {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = undefined;
    }

    await this.executePendingBatches();
  }

  /**
   * Get current batch statistics
   */
  getStats(): BatchStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      totalBatches: 0,
      averageBatchSize: 0,
      averageWaitTime: 0,
      averageExecutionTime: 0,
      batchEfficiency: 0
    };
    this.waitTimeSum = 0;
    this.executionTimeSum = 0;
    this.batchSizeSum = 0;
  }

  /**
   * Get current queue size
   */
  getQueueSize(): number {
    return this.pendingRequests.size;
  }

  /**
   * Get number of active batches
   */
  getActiveBatches(): number {
    return this.activeBatches;
  }

  /**
   * Schedule batch execution
   */
  private scheduleExecution(): void {
    // Execute immediately if batch is full or we're at max concurrent batches
    if (this.pendingRequests.size >= this.config.maxBatchSize ||
        this.activeBatches >= this.config.maxConcurrentBatches) {
      this.executePendingBatches();
      return;
    }

    // Schedule execution if not already scheduled
    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.batchTimer = undefined;
        this.executePendingBatches();
      }, this.config.maxWaitTime);
    }
  }

  /**
   * Execute pending batches
   */
  private async executePendingBatches(): Promise<void> {
    while (this.pendingRequests.size > 0 && 
           this.activeBatches < this.config.maxConcurrentBatches) {
      
      const batch = this.createBatch();
      if (batch.size === 0) {
        break;
      }

      // Execute batch without waiting
      this.executeBatch(batch).catch(error => {
        console.error('Batch execution failed:', error);
      });
    }
  }

  /**
   * Create a batch from pending requests
   */
  private createBatch(): Map<string, BatchableRequest<TRequest, TResponse>> {
    const batch = new Map<string, BatchableRequest<TRequest, TResponse>>();
    const batchSize = Math.min(this.config.maxBatchSize, this.pendingRequests.size);

    // Sort requests by priority (higher priority first) and timestamp
    const sortedRequests = Array.from(this.pendingRequests.values())
      .sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority; // Higher priority first
        }
        return a.timestamp - b.timestamp; // Older requests first
      });

    // Take the top requests for this batch
    for (let i = 0; i < batchSize; i++) {
      const request = sortedRequests[i];
      batch.set(request.id, request);
      this.pendingRequests.delete(request.id);
    }

    return batch;
  }

  /**
   * Execute a single batch
   */
  private async executeBatch(
    batch: Map<string, BatchableRequest<TRequest, TResponse>>
  ): Promise<void> {
    if (batch.size === 0) {
      return;
    }

    this.activeBatches++;
    const startTime = performance.now();
    const batchStartTime = Date.now();

    try {
      // Calculate wait times for statistics
      const waitTimes = Array.from(batch.values()).map(req => 
        batchStartTime - req.timestamp
      );
      const avgWaitTime = waitTimes.reduce((sum, time) => sum + time, 0) / waitTimes.length;

      // Prepare requests for execution
      const requests = new Map<string, TRequest>();
      for (const [id, batchableRequest] of batch) {
        requests.set(id, batchableRequest.request);
      }

      // Execute the batch
      const result = await this.executor(requests);
      const executionTime = performance.now() - startTime;

      // Update statistics
      this.updateStats(batch.size, avgWaitTime, executionTime);

      // Resolve successful requests
      for (const [id, response] of result.results) {
        const request = batch.get(id);
        if (request) {
          request.resolve(response);
        }
      }

      // Reject failed requests
      for (const [id, error] of result.errors) {
        const request = batch.get(id);
        if (request) {
          request.reject(error);
        }
      }

      // Handle requests that weren't in results or errors (shouldn't happen)
      for (const [id, request] of batch) {
        if (!result.results.has(id) && !result.errors.has(id)) {
          request.reject(new Error(`Request ${id} not found in batch result`));
        }
      }

    } catch (error) {
      // Reject all requests in the batch
      for (const [, request] of batch) {
        request.reject(error as Error);
      }

      // Still update statistics for failed batch
      const executionTime = performance.now() - startTime;
      const avgWaitTime = Array.from(batch.values())
        .reduce((sum, req) => sum + (batchStartTime - req.timestamp), 0) / batch.size;
      
      this.updateStats(batch.size, avgWaitTime, executionTime);
    } finally {
      this.activeBatches--;
      
      // Schedule next batch if there are pending requests
      if (this.pendingRequests.size > 0 && this.config.enableAutoBatching) {
        this.scheduleExecution();
      }
    }
  }

  /**
   * Update batch statistics
   */
  private updateStats(batchSize: number, waitTime: number, executionTime: number): void {
    this.stats.totalBatches++;
    this.batchSizeSum += batchSize;
    this.waitTimeSum += waitTime;
    this.executionTimeSum += executionTime;

    this.stats.averageBatchSize = this.batchSizeSum / this.stats.totalBatches;
    this.stats.averageWaitTime = this.waitTimeSum / this.stats.totalBatches;
    this.stats.averageExecutionTime = this.executionTimeSum / this.stats.totalBatches;

    // Calculate batch efficiency (how full batches are on average)
    this.stats.batchEfficiency = this.stats.averageBatchSize / this.config.maxBatchSize;
  }
}

/**
 * Rule loading request batcher
 */
export interface RuleLoadRequest {
  ruleId: string;
  projectId?: string;
}

/**
 * Rule loading response
 */
export interface RuleLoadResponse {
  data: Buffer;
  metadata: {
    id: string;
    version: string;
    tags: string[];
    lastModified: number;
  };
}

/**
 * Version check request
 */
export interface VersionCheckRequest {
  ruleId: string;
  currentVersion: string;
}

/**
 * Version check response
 */
export interface VersionCheckResponse {
  ruleId: string;
  needsUpdate: boolean;
  latestVersion?: string;
}

/**
 * Specialized batcher for rule loading operations
 */
export class RuleLoadBatcher extends RequestBatcher<RuleLoadRequest, RuleLoadResponse> {
  constructor(
    executor: BatchExecutor<RuleLoadRequest, RuleLoadResponse>,
    config: Partial<BatchConfig> = {}
  ) {
    super(executor, {
      maxBatchSize: 20, // Smaller batches for rule loading
      maxWaitTime: 50,  // Faster batching for rule loading
      maxConcurrentBatches: 3,
      enableAutoBatching: true,
      ...config
    });
  }

  /**
   * Load a single rule with batching
   */
  async loadRule(ruleId: string, projectId?: string): Promise<RuleLoadResponse> {
    return this.addRequest(ruleId, { ruleId, projectId });
  }

  /**
   * Load multiple rules with batching
   */
  async loadRules(ruleIds: string[], projectId?: string): Promise<Map<string, RuleLoadResponse>> {
    const promises = ruleIds.map(ruleId => 
      this.loadRule(ruleId, projectId).then(response => [ruleId, response] as const)
    );

    const results = await Promise.allSettled(promises);
    const successfulResults = new Map<string, RuleLoadResponse>();

    for (const result of results) {
      if (result.status === 'fulfilled') {
        const [ruleId, response] = result.value;
        successfulResults.set(ruleId, response);
      }
    }

    return successfulResults;
  }
}

/**
 * Specialized batcher for version checking operations
 */
export class VersionCheckBatcher extends RequestBatcher<VersionCheckRequest, VersionCheckResponse> {
  constructor(
    executor: BatchExecutor<VersionCheckRequest, VersionCheckResponse>,
    config: Partial<BatchConfig> = {}
  ) {
    super(executor, {
      maxBatchSize: 100, // Larger batches for version checking
      maxWaitTime: 200,  // Longer wait for better batching
      maxConcurrentBatches: 2,
      enableAutoBatching: true,
      ...config
    });
  }

  /**
   * Check version for a single rule with batching
   */
  async checkVersion(ruleId: string, currentVersion: string): Promise<VersionCheckResponse> {
    return this.addRequest(ruleId, { ruleId, currentVersion });
  }

  /**
   * Check versions for multiple rules with batching
   */
  async checkVersions(
    rules: Map<string, string>
  ): Promise<Map<string, VersionCheckResponse>> {
    const promises = Array.from(rules.entries()).map(([ruleId, version]) => 
      this.checkVersion(ruleId, version).then(response => [ruleId, response] as const)
    );

    const results = await Promise.allSettled(promises);
    const successfulResults = new Map<string, VersionCheckResponse>();

    for (const result of results) {
      if (result.status === 'fulfilled') {
        const [ruleId, response] = result.value;
        successfulResults.set(ruleId, response);
      }
    }

    return successfulResults;
  }
}