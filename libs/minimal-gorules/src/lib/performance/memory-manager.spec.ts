/**
 * Unit tests for MemoryManager
 */

import { MemoryManager, getGlobalMemoryManager, cleanupGlobalMemoryManager } from './memory-manager.js';

// Mock process.memoryUsage for testing
const mockMemoryUsage = jest.fn();
const originalProcess = global.process;

beforeAll(() => {
  (global as any).process = {
    ...originalProcess,
    memoryUsage: mockMemoryUsage
  };
});

afterAll(() => {
  global.process = originalProcess;
});

describe('MemoryManager', () => {
  let memoryManager: MemoryManager;

  beforeEach(() => {
    mockMemoryUsage.mockReturnValue({
      heapUsed: 50 * 1024 * 1024, // 50MB
      heapTotal: 100 * 1024 * 1024, // 100MB
      external: 10 * 1024 * 1024, // 10MB
      rss: 200 * 1024 * 1024, // 200MB
      arrayBuffers: 5 * 1024 * 1024 // 5MB
    });

    memoryManager = new MemoryManager({
      warningThreshold: 0.7,
      criticalThreshold: 0.85,
      maxHeapSize: 1024 * 1024 * 1024, // 1GB
      cleanupInterval: 1000
    });
  });

  afterEach(() => {
    memoryManager.stopMonitoring();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default thresholds', () => {
      const manager = new MemoryManager();
      const report = manager.getMemoryReport();
      
      expect(report.thresholds.warningThreshold).toBe(0.7);
      expect(report.thresholds.criticalThreshold).toBe(0.85);
      expect(report.thresholds.cleanupInterval).toBe(30000);
    });

    it('should initialize with custom thresholds', () => {
      const manager = new MemoryManager({
        warningThreshold: 0.6,
        criticalThreshold: 0.8,
        cleanupInterval: 5000
      });
      
      const report = manager.getMemoryReport();
      expect(report.thresholds.warningThreshold).toBe(0.6);
      expect(report.thresholds.criticalThreshold).toBe(0.8);
      expect(report.thresholds.cleanupInterval).toBe(5000);
    });
  });

  describe('getCurrentStats', () => {
    it('should return current memory statistics', () => {
      const stats = memoryManager.getCurrentStats();
      
      expect(stats.heapUsed).toBe(50 * 1024 * 1024);
      expect(stats.heapTotal).toBe(100 * 1024 * 1024);
      expect(stats.external).toBe(10 * 1024 * 1024);
      expect(stats.rss).toBe(200 * 1024 * 1024);
      expect(stats.arrayBuffers).toBe(5 * 1024 * 1024);
      expect(stats.timestamp).toBeGreaterThan(0);
    });

    it('should return zero stats when process.memoryUsage is not available', () => {
      (global as any).process = undefined;
      
      const stats = memoryManager.getCurrentStats();
      
      expect(stats.heapUsed).toBe(0);
      expect(stats.heapTotal).toBe(0);
      expect(stats.external).toBe(0);
      expect(stats.rss).toBe(0);
      expect(stats.arrayBuffers).toBe(0);
    });
  });

  describe('getMemoryUsagePercentage', () => {
    it('should calculate memory usage percentage correctly', () => {
      const percentage = memoryManager.getMemoryUsagePercentage();
      
      // 50MB / 1GB = 0.048828125
      expect(percentage).toBeCloseTo(0.048828125, 6);
    });
  });

  describe('monitoring', () => {
    it('should start and stop monitoring', () => {
      const eventListener = jest.fn();
      memoryManager.addEventListener(eventListener);
      
      memoryManager.startMonitoring(100);
      expect(memoryManager['monitoringInterval']).toBeDefined();
      
      memoryManager.stopMonitoring();
      expect(memoryManager['monitoringInterval']).toBeUndefined();
    });

    it('should emit warning event when memory usage exceeds warning threshold', (done) => {
      // Set high memory usage (800MB out of 1GB = 80% > 70% warning threshold)
      mockMemoryUsage.mockReturnValue({
        heapUsed: 800 * 1024 * 1024,
        heapTotal: 100 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        rss: 200 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024
      });

      memoryManager.addEventListener((event) => {
        if (event.type === 'warning') {
          expect(event.message).toContain('High memory usage');
          done();
        }
      });

      memoryManager.startMonitoring(50);
    });

    it('should emit critical event and trigger cleanup when memory usage exceeds critical threshold', (done) => {
      // Set critical memory usage (900MB out of 1GB = 90% > 85% critical threshold)
      mockMemoryUsage.mockReturnValue({
        heapUsed: 900 * 1024 * 1024,
        heapTotal: 100 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        rss: 200 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024
      });

      let criticalEventReceived = false;
      let cleanupEventReceived = false;

      memoryManager.addEventListener((event) => {
        if (event.type === 'critical') {
          criticalEventReceived = true;
          expect(event.message).toContain('Critical memory usage');
        }
        if (event.type === 'cleanup') {
          cleanupEventReceived = true;
          if (criticalEventReceived && cleanupEventReceived) {
            done();
          }
        }
      });

      memoryManager.startMonitoring(50);
    });
  });

  describe('cleanup callbacks', () => {
    it('should register and execute cleanup callbacks', async () => {
      const callback1 = jest.fn().mockResolvedValue(undefined);
      const callback2 = jest.fn().mockResolvedValue(undefined);
      
      memoryManager.registerCleanupCallback(callback1);
      memoryManager.registerCleanupCallback(callback2);
      
      await memoryManager.performCleanup();
      
      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it('should remove cleanup callbacks', async () => {
      const callback = jest.fn().mockResolvedValue(undefined);
      
      memoryManager.registerCleanupCallback(callback);
      memoryManager.removeCleanupCallback(callback);
      
      await memoryManager.performCleanup();
      
      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle failing cleanup callbacks gracefully', async () => {
      const failingCallback = jest.fn().mockRejectedValue(new Error('Cleanup failed'));
      const successCallback = jest.fn().mockResolvedValue(undefined);
      
      memoryManager.registerCleanupCallback(failingCallback);
      memoryManager.registerCleanupCallback(successCallback);
      
      // Should not throw
      await expect(memoryManager.performCleanup()).resolves.toBeUndefined();
      
      expect(failingCallback).toHaveBeenCalled();
      expect(successCallback).toHaveBeenCalled();
    });
  });

  describe('forceGarbageCollection', () => {
    it('should force garbage collection when available', () => {
      const mockGc = jest.fn();
      (global as any).gc = mockGc;
      
      const result = memoryManager.forceGarbageCollection();
      
      expect(result).toBe(true);
      expect(mockGc).toHaveBeenCalled();
    });

    it('should return false when garbage collection is not available', () => {
      (global as any).gc = undefined;
      
      const result = memoryManager.forceGarbageCollection();
      
      expect(result).toBe(false);
    });

    it('should handle garbage collection errors gracefully', () => {
      const mockGc = jest.fn().mockImplementation(() => {
        throw new Error('GC failed');
      });
      (global as any).gc = mockGc;
      
      const result = memoryManager.forceGarbageCollection();
      
      expect(result).toBe(false);
      expect(mockGc).toHaveBeenCalled();
    });
  });

  describe('getMemoryTrend', () => {
    it('should return unknown when no previous stats', () => {
      const trend = memoryManager.getMemoryTrend();
      expect(trend).toBe('unknown');
    });

    it('should detect increasing memory trend', () => {
      // First measurement
      memoryManager['checkMemoryUsage']();
      
      // Increase memory usage
      mockMemoryUsage.mockReturnValue({
        heapUsed: 100 * 1024 * 1024, // Increased from 50MB to 100MB
        heapTotal: 100 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        rss: 200 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024
      });
      
      const trend = memoryManager.getMemoryTrend();
      expect(trend).toBe('increasing');
    });

    it('should detect decreasing memory trend', () => {
      // First measurement with high memory
      mockMemoryUsage.mockReturnValue({
        heapUsed: 100 * 1024 * 1024,
        heapTotal: 100 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        rss: 200 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024
      });
      memoryManager['checkMemoryUsage']();
      
      // Decrease memory usage
      mockMemoryUsage.mockReturnValue({
        heapUsed: 30 * 1024 * 1024, // Decreased from 100MB to 30MB
        heapTotal: 100 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        rss: 200 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024
      });
      
      const trend = memoryManager.getMemoryTrend();
      expect(trend).toBe('decreasing');
    });

    it('should detect stable memory trend', () => {
      // First measurement
      memoryManager['checkMemoryUsage']();
      
      // Small change in memory usage (within 1% threshold)
      mockMemoryUsage.mockReturnValue({
        heapUsed: 51 * 1024 * 1024, // Small increase from 50MB to 51MB
        heapTotal: 100 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        rss: 200 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024
      });
      
      const trend = memoryManager.getMemoryTrend();
      expect(trend).toBe('stable');
    });
  });

  describe('getMemoryReport', () => {
    it('should generate comprehensive memory report', () => {
      const report = memoryManager.getMemoryReport();
      
      expect(report.current).toBeDefined();
      expect(report.usage.percentage).toBeCloseTo(0.048828125, 6);
      expect(report.usage.trend).toBe('unknown');
      expect(report.usage.status).toBe('normal');
      expect(report.thresholds).toBeDefined();
      expect(report.recommendations).toBeInstanceOf(Array);
    });

    it('should provide recommendations for high memory usage', () => {
      // Set high memory usage
      mockMemoryUsage.mockReturnValue({
        heapUsed: 800 * 1024 * 1024, // 80% usage
        heapTotal: 100 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        rss: 200 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024
      });
      
      const report = memoryManager.getMemoryReport();
      
      expect(report.usage.status).toBe('warning');
      expect(report.recommendations).toContain('Monitor memory usage closely');
    });

    it('should provide critical recommendations for very high memory usage', () => {
      // Set critical memory usage
      mockMemoryUsage.mockReturnValue({
        heapUsed: 900 * 1024 * 1024, // 90% usage
        heapTotal: 100 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        rss: 200 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024
      });
      
      const report = memoryManager.getMemoryReport();
      
      expect(report.usage.status).toBe('critical');
      expect(report.recommendations).toContain('Immediate cleanup required');
    });
  });
});

describe('Global Memory Manager', () => {
  afterEach(() => {
    cleanupGlobalMemoryManager();
  });

  it('should create and return global memory manager', () => {
    const manager1 = getGlobalMemoryManager();
    const manager2 = getGlobalMemoryManager();
    
    expect(manager1).toBe(manager2); // Should be the same instance
  });

  it('should create global memory manager with custom thresholds', () => {
    const manager = getGlobalMemoryManager({
      warningThreshold: 0.6,
      criticalThreshold: 0.8
    });
    
    const report = manager.getMemoryReport();
    expect(report.thresholds.warningThreshold).toBe(0.6);
    expect(report.thresholds.criticalThreshold).toBe(0.8);
  });

  it('should cleanup global memory manager', () => {
    const manager = getGlobalMemoryManager();
    manager.startMonitoring();
    
    cleanupGlobalMemoryManager();
    
    // Should create a new instance after cleanup
    const newManager = getGlobalMemoryManager();
    expect(newManager).not.toBe(manager);
  });
});