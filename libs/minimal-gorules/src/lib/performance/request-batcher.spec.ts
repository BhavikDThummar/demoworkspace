/**
 * Unit tests for RequestBatcher
 */

import { RequestBatcher, RuleLoadBatcher, VersionCheckBatcher } from './request-batcher.js';

describe('RequestBatcher', () => {
  let batcher: RequestBatcher<string, string>;
  let mockExecutor: jest.Mock;

  beforeEach(() => {
    mockExecutor = jest.fn();
    batcher = new RequestBatcher(mockExecutor, {
      maxBatchSize: 3,
      maxWaitTime: 100,
      maxConcurrentBatches: 2,
      enableAutoBatching: true
    });
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('constructor', () => {
    it('should initialize with provided configuration', () => {
      const stats = batcher.getStats();
      expect(stats.totalRequests).toBe(0);
      expect(stats.totalBatches).toBe(0);
      expect(stats.averageBatchSize).toBe(0);
    });

    it('should use default configuration when not provided', () => {
      const defaultBatcher = new RequestBatcher(mockExecutor);
      expect(defaultBatcher.getQueueSize()).toBe(0);
    });
  });

  describe('addRequest', () => {
    it('should add request and return result', async () => {
      mockExecutor.mockResolvedValueOnce({
        results: new Map([['req1', 'result1']]),
        errors: new Map(),
        batchSize: 1,
        executionTime: 10
      });

      const result = await batcher.addRequest('req1', 'data1');
      
      expect(result).toBe('result1');
      expect(mockExecutor).toHaveBeenCalledWith(
        new Map([['req1', 'data1']])
      );
    });

    it('should batch multiple requests together', async () => {
      mockExecutor.mockResolvedValueOnce({
        results: new Map([
          ['req1', 'result1'],
          ['req2', 'result2']
        ]),
        errors: new Map(),
        batchSize: 2,
        executionTime: 15
      });

      const promise1 = batcher.addRequest('req1', 'data1');
      const promise2 = batcher.addRequest('req2', 'data2');

      const [result1, result2] = await Promise.all([promise1, promise2]);
      
      expect(result1).toBe('result1');
      expect(result2).toBe('result2');
      expect(mockExecutor).toHaveBeenCalledWith(
        new Map([
          ['req1', 'data1'],
          ['req2', 'data2']
        ])
      );
    });

    it('should execute immediately when batch is full', async () => {
      mockExecutor.mockResolvedValue({
        results: new Map([
          ['req1', 'result1'],
          ['req2', 'result2'],
          ['req3', 'result3']
        ]),
        errors: new Map(),
        batchSize: 3,
        executionTime: 20
      });

      // Add 3 requests (maxBatchSize = 3)
      const promises = [
        batcher.addRequest('req1', 'data1'),
        batcher.addRequest('req2', 'data2'),
        batcher.addRequest('req3', 'data3')
      ];

      await Promise.all(promises);
      
      expect(mockExecutor).toHaveBeenCalledTimes(1);
    });

    it('should handle request priorities', async () => {
      mockExecutor.mockResolvedValue({
        results: new Map([
          ['high', 'high-result'],
          ['low', 'low-result']
        ]),
        errors: new Map(),
        batchSize: 2,
        executionTime: 10
      });

      // Add requests with different priorities
      const lowPriorityPromise = batcher.addRequest('low', 'low-data', 1);
      const highPriorityPromise = batcher.addRequest('high', 'high-data', 10);

      await Promise.all([lowPriorityPromise, highPriorityPromise]);
      
      // Verify executor was called (priority ordering is internal)
      expect(mockExecutor).toHaveBeenCalled();
    });

    it('should handle executor errors', async () => {
      mockExecutor.mockRejectedValueOnce(new Error('Batch execution failed'));

      await expect(batcher.addRequest('req1', 'data1')).rejects.toThrow('Batch execution failed');
    });

    it('should handle partial batch failures', async () => {
      mockExecutor.mockResolvedValueOnce({
        results: new Map([['req1', 'result1']]),
        errors: new Map([['req2', new Error('Request failed')]]),
        batchSize: 2,
        executionTime: 10
      });

      const promise1 = batcher.addRequest('req1', 'data1');
      const promise2 = batcher.addRequest('req2', 'data2');

      const result1 = await promise1;
      expect(result1).toBe('result1');

      await expect(promise2).rejects.toThrow('Request failed');
    });
  });

  describe('flush', () => {
    it('should execute all pending requests immediately', async () => {
      mockExecutor.mockResolvedValueOnce({
        results: new Map([['req1', 'result1']]),
        errors: new Map(),
        batchSize: 1,
        executionTime: 5
      });

      const promise = batcher.addRequest('req1', 'data1');
      await batcher.flush();
      
      const result = await promise;
      expect(result).toBe('result1');
      expect(mockExecutor).toHaveBeenCalled();
    });

    it('should handle empty queue', async () => {
      await expect(batcher.flush()).resolves.toBeUndefined();
      expect(mockExecutor).not.toHaveBeenCalled();
    });
  });

  describe('statistics', () => {
    it('should track batch statistics', async () => {
      mockExecutor.mockResolvedValue({
        results: new Map([
          ['req1', 'result1'],
          ['req2', 'result2']
        ]),
        errors: new Map(),
        batchSize: 2,
        executionTime: 15
      });

      await Promise.all([
        batcher.addRequest('req1', 'data1'),
        batcher.addRequest('req2', 'data2')
      ]);

      const stats = batcher.getStats();
      expect(stats.totalRequests).toBe(2);
      expect(stats.totalBatches).toBe(1);
      expect(stats.averageBatchSize).toBe(2);
      expect(stats.batchEfficiency).toBeCloseTo(2/3, 2); // 2 requests / 3 maxBatchSize
    });

    it('should reset statistics', () => {
      batcher.resetStats();
      
      const stats = batcher.getStats();
      expect(stats.totalRequests).toBe(0);
      expect(stats.totalBatches).toBe(0);
      expect(stats.averageBatchSize).toBe(0);
    });
  });

  describe('queue management', () => {
    it('should report current queue size', async () => {
      expect(batcher.getQueueSize()).toBe(0);
      
      // Add request but don't wait for it
      batcher.addRequest('req1', 'data1');
      expect(batcher.getQueueSize()).toBeGreaterThan(0);
    });

    it('should report active batches', () => {
      expect(batcher.getActiveBatches()).toBe(0);
    });
  });

  describe('auto-batching disabled', () => {
    it('should not auto-execute when disabled', async () => {
      const manualBatcher = new RequestBatcher(mockExecutor, {
        enableAutoBatching: false
      });

      manualBatcher.addRequest('req1', 'data1');
      
      // Wait a bit to ensure no auto-execution
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(mockExecutor).not.toHaveBeenCalled();
      expect(manualBatcher.getQueueSize()).toBe(1);
    });
  });
});

describe('RuleLoadBatcher', () => {
  let batcher: RuleLoadBatcher;
  let mockExecutor: jest.Mock;

  beforeEach(() => {
    mockExecutor = jest.fn();
    batcher = new RuleLoadBatcher(mockExecutor);
  });

  describe('loadRule', () => {
    it('should load a single rule', async () => {
      const mockResponse = {
        data: Buffer.from('rule-data'),
        metadata: {
          id: 'rule1',
          version: '1.0.0',
          tags: ['test'],
          lastModified: Date.now()
        }
      };

      mockExecutor.mockResolvedValueOnce({
        results: new Map([['rule1', mockResponse]]),
        errors: new Map(),
        batchSize: 1,
        executionTime: 10
      });

      const result = await batcher.loadRule('rule1', 'project1');
      
      expect(result).toEqual(mockResponse);
      expect(mockExecutor).toHaveBeenCalledWith(
        new Map([['rule1', { ruleId: 'rule1', projectId: 'project1' }]])
      );
    });
  });

  describe('loadRules', () => {
    it('should load multiple rules', async () => {
      const mockResponses = new Map([
        ['rule1', {
          data: Buffer.from('rule1-data'),
          metadata: { id: 'rule1', version: '1.0.0', tags: [], lastModified: Date.now() }
        }],
        ['rule2', {
          data: Buffer.from('rule2-data'),
          metadata: { id: 'rule2', version: '1.0.1', tags: [], lastModified: Date.now() }
        }]
      ]);

      mockExecutor.mockResolvedValueOnce({
        results: mockResponses,
        errors: new Map(),
        batchSize: 2,
        executionTime: 15
      });

      const results = await batcher.loadRules(['rule1', 'rule2'], 'project1');
      
      expect(results.size).toBe(2);
      expect(results.get('rule1')).toEqual(mockResponses.get('rule1'));
      expect(results.get('rule2')).toEqual(mockResponses.get('rule2'));
    });

    it('should handle partial failures when loading multiple rules', async () => {
      mockExecutor.mockResolvedValueOnce({
        results: new Map([
          ['rule1', {
            data: Buffer.from('rule1-data'),
            metadata: { id: 'rule1', version: '1.0.0', tags: [], lastModified: Date.now() }
          }]
        ]),
        errors: new Map([['rule2', new Error('Rule not found')]]),
        batchSize: 2,
        executionTime: 10
      });

      const results = await batcher.loadRules(['rule1', 'rule2'], 'project1');
      
      expect(results.size).toBe(1);
      expect(results.has('rule1')).toBe(true);
      expect(results.has('rule2')).toBe(false);
    });
  });
});

describe('VersionCheckBatcher', () => {
  let batcher: VersionCheckBatcher;
  let mockExecutor: jest.Mock;

  beforeEach(() => {
    mockExecutor = jest.fn();
    batcher = new VersionCheckBatcher(mockExecutor);
  });

  describe('checkVersion', () => {
    it('should check version for a single rule', async () => {
      const mockResponse = {
        ruleId: 'rule1',
        needsUpdate: true,
        latestVersion: '2.0.0'
      };

      mockExecutor.mockResolvedValueOnce({
        results: new Map([['rule1', mockResponse]]),
        errors: new Map(),
        batchSize: 1,
        executionTime: 5
      });

      const result = await batcher.checkVersion('rule1', '1.0.0');
      
      expect(result).toEqual(mockResponse);
      expect(mockExecutor).toHaveBeenCalledWith(
        new Map([['rule1', { ruleId: 'rule1', currentVersion: '1.0.0' }]])
      );
    });
  });

  describe('checkVersions', () => {
    it('should check versions for multiple rules', async () => {
      const mockResponses = new Map([
        ['rule1', { ruleId: 'rule1', needsUpdate: false, latestVersion: '1.0.0' }],
        ['rule2', { ruleId: 'rule2', needsUpdate: true, latestVersion: '2.0.0' }]
      ]);

      mockExecutor.mockResolvedValueOnce({
        results: mockResponses,
        errors: new Map(),
        batchSize: 2,
        executionTime: 8
      });

      const rules = new Map([
        ['rule1', '1.0.0'],
        ['rule2', '1.5.0']
      ]);

      const results = await batcher.checkVersions(rules);
      
      expect(results.size).toBe(2);
      expect(results.get('rule1')).toEqual(mockResponses.get('rule1'));
      expect(results.get('rule2')).toEqual(mockResponses.get('rule2'));
    });

    it('should handle version check failures', async () => {
      mockExecutor.mockResolvedValueOnce({
        results: new Map([
          ['rule1', { ruleId: 'rule1', needsUpdate: false, latestVersion: '1.0.0' }]
        ]),
        errors: new Map([['rule2', new Error('Version check failed')]]),
        batchSize: 2,
        executionTime: 5
      });

      const rules = new Map([
        ['rule1', '1.0.0'],
        ['rule2', '1.0.0']
      ]);

      const results = await batcher.checkVersions(rules);
      
      expect(results.size).toBe(1);
      expect(results.has('rule1')).toBe(true);
      expect(results.has('rule2')).toBe(false);
    });
  });
});