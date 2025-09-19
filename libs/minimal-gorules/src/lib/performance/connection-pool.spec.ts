/**
 * Unit tests for ConnectionPool
 */

import { ConnectionPool, ConnectionPoolError } from './connection-pool.js';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('ConnectionPool', () => {
  let connectionPool: ConnectionPool;

  beforeEach(() => {
    connectionPool = new ConnectionPool(
      'http://localhost:3000',
      { Authorization: 'Bearer test-token' },
      {
        maxConnections: 3,
        maxRequestsPerConnection: 5,
        connectionTimeout: 1000,
        requestTimeout: 2000,
        keepAliveTimeout: 5000,
        queueTimeout: 1000,
        enableHttp2: false,
        retry: {
          maxRetries: 2,
          retryDelay: 100,
          retryOnTimeout: true,
        },
      },
    );
    mockFetch.mockClear();
  });

  afterEach(async () => {
    await connectionPool.close();
    jest.clearAllTimers();
  });

  describe('constructor', () => {
    it('should initialize with provided configuration', () => {
      const stats = connectionPool.getStats();
      expect(stats.totalConnections).toBe(0);
      expect(stats.activeConnections).toBe(0);
      expect(stats.queuedRequests).toBe(0);
    });

    it('should handle base URL with trailing slash', () => {
      const pool = new ConnectionPool('http://localhost:3000/');
      expect(pool['baseUrl']).toBe('http://localhost:3000');
    });
  });

  describe('request', () => {
    it('should make successful HTTP request', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'application/json']]),
        text: () => Promise.resolve('{"result": "success"}'),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      const response = await connectionPool.request({
        method: 'GET',
        path: '/test',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/test',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        }),
      );

      expect(response.status).toBe(200);
      expect(response.body).toBe('{"result": "success"}');
      expect(response.responseTime).toBeGreaterThan(0);
    });

    it('should handle HTTP errors', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Map(),
        text: () => Promise.resolve('Not Found'),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      await expect(
        connectionPool.request({
          method: 'GET',
          path: '/not-found',
        }),
      ).rejects.toThrow(ConnectionPoolError);
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        connectionPool.request({
          method: 'GET',
          path: '/test',
        }),
      ).rejects.toThrow(ConnectionPoolError);
    });

    it('should handle request timeout', async () => {
      jest.useFakeTimers();

      mockFetch.mockImplementationOnce(() => new Promise((resolve) => setTimeout(resolve, 5000)));

      const requestPromise = connectionPool.request({
        method: 'GET',
        path: '/slow',
      });

      jest.advanceTimersByTime(2000);

      await expect(requestPromise).rejects.toThrow('timeout');

      jest.useRealTimers();
    });

    it('should include request body for POST requests', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map(),
        text: () => Promise.resolve('{"result": "created"}'),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      await connectionPool.request({
        method: 'POST',
        path: '/create',
        body: '{"name": "test"}',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/create',
        expect.objectContaining({
          method: 'POST',
          body: '{"name": "test"}',
        }),
      );
    });

    it('should merge custom headers with default headers', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map(),
        text: () => Promise.resolve('{}'),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      await connectionPool.request({
        method: 'GET',
        path: '/test',
        headers: { 'X-Custom': 'value' },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
            'X-Custom': 'value',
          }),
        }),
      );
    });
  });

  describe('connection management', () => {
    it('should reuse connections for multiple requests', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map(),
        text: () => Promise.resolve('{}'),
      };
      mockFetch.mockResolvedValue(mockResponse);

      // Make multiple requests
      await Promise.all([
        connectionPool.request({ method: 'GET', path: '/test1' }),
        connectionPool.request({ method: 'GET', path: '/test2' }),
        connectionPool.request({ method: 'GET', path: '/test3' }),
      ]);

      const stats = connectionPool.getStats();
      expect(stats.connectionReuses).toBeGreaterThan(0);
    });

    it('should respect maximum connections limit', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map(),
        text: () => Promise.resolve('{}'),
      };

      // Create a slow response to keep connections busy
      mockFetch.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockResponse), 100)),
      );

      // Start more requests than max connections
      const requests = Array.from({ length: 10 }, (_, i) =>
        connectionPool.request({ method: 'GET', path: `/test${i}` }),
      );

      await Promise.all(requests);

      const stats = connectionPool.getStats();
      expect(stats.totalConnections).toBeLessThanOrEqual(3); // maxConnections = 3
    });

    it('should retire connections after max requests', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map(),
        text: () => Promise.resolve('{}'),
      };
      mockFetch.mockResolvedValue(mockResponse);

      // Make more requests than maxRequestsPerConnection (5)
      for (let i = 0; i < 7; i++) {
        await connectionPool.request({ method: 'GET', path: `/test${i}` });
      }

      const stats = connectionPool.getStats();
      expect(stats.completedRequests).toBe(7);
    });
  });

  describe('retry logic', () => {
    it('should retry on connection failures', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Map(),
          text: () => Promise.resolve('{}'),
        });

      const response = await connectionPool.request({
        method: 'GET',
        path: '/test',
      });

      expect(response.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledTimes(3); // Original + 2 retries
    });

    it('should not retry beyond max retries', async () => {
      mockFetch.mockRejectedValue(new Error('Connection failed'));

      await expect(
        connectionPool.request({
          method: 'GET',
          path: '/test',
        }),
      ).rejects.toThrow();

      expect(mockFetch).toHaveBeenCalledTimes(3); // Original + 2 retries (maxRetries = 2)
    });

    it('should retry on timeout when configured', async () => {
      jest.useFakeTimers();

      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return new Promise((resolve) => setTimeout(resolve, 5000)); // Timeout
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Map(),
          text: () => Promise.resolve('{}'),
        });
      });

      const requestPromise = connectionPool.request({
        method: 'GET',
        path: '/test',
      });

      // Advance time to trigger timeouts and retries
      jest.advanceTimersByTime(10000);

      const response = await requestPromise;
      expect(response.status).toBe(200);

      jest.useRealTimers();
    });
  });

  describe('statistics', () => {
    it('should track request statistics', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map(),
        text: () => Promise.resolve('{}'),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await connectionPool.request({ method: 'GET', path: '/test1' });
      await connectionPool.request({ method: 'GET', path: '/test2' });

      const stats = connectionPool.getStats();
      expect(stats.completedRequests).toBe(2);
      expect(stats.failedRequests).toBe(0);
      expect(stats.averageResponseTime).toBeGreaterThan(0);
    });

    it('should track failed requests', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      try {
        await connectionPool.request({ method: 'GET', path: '/test' });
      } catch {
        // Expected to fail
      }

      const stats = connectionPool.getStats();
      expect(stats.failedRequests).toBeGreaterThan(0);
    });
  });

  describe('cleanup', () => {
    it('should cleanup idle connections', async () => {
      jest.useFakeTimers();

      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map(),
        text: () => Promise.resolve('{}'),
      };
      mockFetch.mockResolvedValue(mockResponse);

      // Make a request to create a connection
      await connectionPool.request({ method: 'GET', path: '/test' });

      let initialConnections = connectionPool.getStats().totalConnections;
      expect(initialConnections).toBeGreaterThan(0);

      // Advance time beyond keepAliveTimeout
      jest.advanceTimersByTime(6000); // keepAliveTimeout = 5000

      // Connections should be cleaned up
      const finalConnections = connectionPool.getStats().totalConnections;
      expect(finalConnections).toBeLessThan(initialConnections);

      jest.useRealTimers();
    });

    it('should close all connections and reject queued requests', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map(),
        text: () => Promise.resolve('{}'),
      };
      mockFetch.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockResponse), 1000)),
      );

      // Start some requests
      const request1 = connectionPool.request({ method: 'GET', path: '/test1' });
      const request2 = connectionPool.request({ method: 'GET', path: '/test2' });

      // Close the pool
      await connectionPool.close();

      // Requests should be rejected
      await expect(request1).rejects.toThrow('Connection pool closed');
      await expect(request2).rejects.toThrow('Connection pool closed');

      const stats = connectionPool.getStats();
      expect(stats.totalConnections).toBe(0);
      expect(stats.queuedRequests).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should create appropriate error types', () => {
      const timeoutError = ConnectionPoolError.timeout('test operation');
      expect(timeoutError.code).toBe('TIMEOUT');
      expect(timeoutError.message).toContain('test operation');

      const poolError = ConnectionPoolError.poolExhausted();
      expect(poolError.code).toBe('POOL_EXHAUSTED');

      const connectionError = ConnectionPoolError.connectionFailed(new Error('test'));
      expect(connectionError.code).toBe('CONNECTION_FAILED');
      expect(connectionError.cause).toBeInstanceOf(Error);
    });
  });
});
