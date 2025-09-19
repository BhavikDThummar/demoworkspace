/**
 * Jest test setup file
 * Global test configuration and utilities
 */

// Increase timeout for integration and load tests
(jest as any).setTimeout(30000);

// Mock console methods to reduce noise in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

(beforeAll as any)(() => {
  // Suppress console.error and console.warn in tests unless explicitly needed
  console.error = (jest as any).fn();
  console.warn = (jest as any).fn();
});

(afterAll as any)(() => {
  // Restore original console methods
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithinRange(floor: number, ceiling: number): R;
    }
  }
}

// Custom Jest matchers
(expect as any).extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});

// Mock global fetch if not available
if (!global.fetch) {
  global.fetch = (jest as any).fn();
}

// Mock performance.now if not available
if (!global.performance) {
  global.performance = {
    now: (jest as any).fn(() => Date.now()),
  } as any;
}

// Mock process.memoryUsage for memory tests
if (!process.memoryUsage) {
  process.memoryUsage = (jest as any).fn(() => ({
    rss: 100 * 1024 * 1024,
    heapTotal: 50 * 1024 * 1024,
    heapUsed: 25 * 1024 * 1024,
    external: 5 * 1024 * 1024,
    arrayBuffers: 1 * 1024 * 1024,
  }));
}

// Global test configuration
export const TEST_CONFIG = {
  DEFAULT_TIMEOUT: 5000,
  LONG_TIMEOUT: 30000,
  PERFORMANCE_TIMEOUT: 60000,
  MOCK_API_URL: 'https://mock-api.gorules.io',
  MOCK_PROJECT_ID: 'test-project-123',
  MOCK_API_KEY: 'test-api-key-456',
};

// Test data generators
export const generateMockRule = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  name: `Test Rule ${id}`,
  version: '1.0.0',
  tags: ['test'],
  lastModified: new Date().toISOString(),
  content: Buffer.from(
    JSON.stringify({
      conditions: [{ field: 'test', operator: 'eq', value: true }],
      actions: [{ type: 'set', field: 'result', value: 'approved' }],
      ...overrides,
    }),
  ).toString('base64'),
});

export const generateMockInput = (overrides: Record<string, unknown> = {}) => ({
  test: true,
  value: 100,
  category: 'test',
  ...overrides,
});

// Cleanup utilities
export const cleanupAfterTest = async () => {
  // Clear all timers
  (jest as any).clearAllTimers();

  // Clear all mocks
  (jest as any).clearAllMocks();

  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
};

// Performance test utilities
export const measurePerformance = async <T>(
  operation: () => Promise<T>,
  expectedMaxTime?: number,
): Promise<{ result: T; duration: number }> => {
  const startTime = performance.now();
  const result = await operation();
  const duration = performance.now() - startTime;

  if (expectedMaxTime && duration > expectedMaxTime) {
    throw new Error(`Operation took ${duration}ms, expected < ${expectedMaxTime}ms`);
  }

  return { result, duration };
};

// Memory test utilities
export const measureMemoryUsage = async <T>(
  operation: () => Promise<T>,
): Promise<{ result: T; memoryDelta: number }> => {
  // Force garbage collection before measurement
  if (global.gc) {
    global.gc();
  }

  const initialMemory = process.memoryUsage().heapUsed;
  const result = await operation();

  // Force garbage collection after operation
  if (global.gc) {
    global.gc();
  }

  const finalMemory = process.memoryUsage().heapUsed;
  const memoryDelta = finalMemory - initialMemory;

  return { result, memoryDelta };
};
