/**
 * Memory Management and Monitoring for Minimal GoRules Engine
 * Provides automatic cleanup, memory monitoring, and optimization
 */

/**
 * Memory usage statistics
 */
export interface MemoryStats {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  arrayBuffers: number;
  timestamp: number;
}

/**
 * Memory threshold configuration
 */
export interface MemoryThresholds {
  /** Warning threshold as percentage of heap limit (0-1) */
  warningThreshold: number;
  /** Critical threshold as percentage of heap limit (0-1) */
  criticalThreshold: number;
  /** Maximum heap size in bytes (0 for auto-detect) */
  maxHeapSize: number;
  /** Cleanup interval in milliseconds */
  cleanupInterval: number;
}

/**
 * Memory cleanup callback function
 */
export type MemoryCleanupCallback = () => Promise<void> | void;

/**
 * Memory event types
 */
export type MemoryEventType = 'warning' | 'critical' | 'cleanup' | 'gc';

/**
 * Memory event listener
 */
export type MemoryEventListener = (event: {
  type: MemoryEventType;
  stats: MemoryStats;
  message: string;
}) => void;

/**
 * Memory Manager for automatic cleanup and monitoring
 */
export class MemoryManager {
  private thresholds: MemoryThresholds;
  private cleanupCallbacks: MemoryCleanupCallback[] = [];
  private eventListeners: MemoryEventListener[] = [];
  private monitoringInterval?: NodeJS.Timeout;
  private cleanupInterval?: NodeJS.Timeout;
  private lastStats?: MemoryStats;
  private isCleanupInProgress = false;

  constructor(thresholds: Partial<MemoryThresholds> = {}) {
    this.thresholds = {
      warningThreshold: 0.7,
      criticalThreshold: 0.85,
      maxHeapSize: 0, // Auto-detect
      cleanupInterval: 30000, // 30 seconds
      ...thresholds
    };

    // Auto-detect max heap size if not provided
    if (this.thresholds.maxHeapSize === 0) {
      this.thresholds.maxHeapSize = this.detectMaxHeapSize();
    }
  }

  /**
   * Start memory monitoring
   */
  startMonitoring(intervalMs: number = 5000): void {
    if (this.monitoringInterval) {
      return; // Already monitoring
    }

    this.monitoringInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, intervalMs);

    // Start cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.performScheduledCleanup();
    }, this.thresholds.cleanupInterval);

    // Initial check
    this.checkMemoryUsage();
  }

  /**
   * Stop memory monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
  }

  /**
   * Register a cleanup callback
   */
  registerCleanupCallback(callback: MemoryCleanupCallback): void {
    this.cleanupCallbacks.push(callback);
  }

  /**
   * Remove a cleanup callback
   */
  removeCleanupCallback(callback: MemoryCleanupCallback): void {
    const index = this.cleanupCallbacks.indexOf(callback);
    if (index > -1) {
      this.cleanupCallbacks.splice(index, 1);
    }
  }

  /**
   * Add event listener
   */
  addEventListener(listener: MemoryEventListener): void {
    this.eventListeners.push(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: MemoryEventListener): void {
    const index = this.eventListeners.indexOf(listener);
    if (index > -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  /**
   * Get current memory statistics
   */
  getCurrentStats(): MemoryStats {
    if (typeof process === 'undefined' || !process.memoryUsage) {
      return {
        heapUsed: 0,
        heapTotal: 0,
        external: 0,
        rss: 0,
        arrayBuffers: 0,
        timestamp: Date.now()
      };
    }

    const memUsage = process.memoryUsage();
    return {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss,
      arrayBuffers: memUsage.arrayBuffers || 0,
      timestamp: Date.now()
    };
  }

  /**
   * Get memory usage percentage
   */
  getMemoryUsagePercentage(): number {
    const stats = this.getCurrentStats();
    return stats.heapUsed / this.thresholds.maxHeapSize;
  }

  /**
   * Force garbage collection if available
   */
  forceGarbageCollection(): boolean {
    if (typeof global !== 'undefined' && global.gc) {
      try {
        global.gc();
        this.emitEvent('gc', this.getCurrentStats(), 'Forced garbage collection');
        return true;
      } catch (error) {
        console.warn('Failed to force garbage collection:', error);
        return false;
      }
    }
    return false;
  }

  /**
   * Perform manual cleanup
   */
  async performCleanup(force: boolean = false): Promise<void> {
    if (this.isCleanupInProgress && !force) {
      return; // Cleanup already in progress
    }

    this.isCleanupInProgress = true;

    try {
      const startStats = this.getCurrentStats();
      
      // Execute all cleanup callbacks
      for (const callback of this.cleanupCallbacks) {
        try {
          await callback();
        } catch (error) {
          console.warn('Cleanup callback failed:', error);
        }
      }

      // Force garbage collection if available
      this.forceGarbageCollection();

      const endStats = this.getCurrentStats();
      const memoryFreed = startStats.heapUsed - endStats.heapUsed;
      
      this.emitEvent('cleanup', endStats, `Cleanup completed. Memory freed: ${this.formatBytes(memoryFreed)}`);
    } finally {
      this.isCleanupInProgress = false;
    }
  }

  /**
   * Get memory usage trend (requires monitoring to be active)
   */
  getMemoryTrend(): 'increasing' | 'decreasing' | 'stable' | 'unknown' {
    if (!this.lastStats) {
      return 'unknown';
    }

    const currentStats = this.getCurrentStats();
    const diff = currentStats.heapUsed - this.lastStats.heapUsed;
    const threshold = this.thresholds.maxHeapSize * 0.01; // 1% threshold

    if (Math.abs(diff) < threshold) {
      return 'stable';
    }

    return diff > 0 ? 'increasing' : 'decreasing';
  }

  /**
   * Get detailed memory report
   */
  getMemoryReport(): {
    current: MemoryStats;
    usage: {
      percentage: number;
      trend: string;
      status: 'normal' | 'warning' | 'critical';
    };
    thresholds: MemoryThresholds;
    recommendations: string[];
  } {
    const current = this.getCurrentStats();
    const percentage = this.getMemoryUsagePercentage();
    const trend = this.getMemoryTrend();
    
    let status: 'normal' | 'warning' | 'critical' = 'normal';
    if (percentage >= this.thresholds.criticalThreshold) {
      status = 'critical';
    } else if (percentage >= this.thresholds.warningThreshold) {
      status = 'warning';
    }

    const recommendations: string[] = [];
    
    if (status === 'critical') {
      recommendations.push('Immediate cleanup required');
      recommendations.push('Consider reducing cache size');
      recommendations.push('Check for memory leaks');
    } else if (status === 'warning') {
      recommendations.push('Monitor memory usage closely');
      recommendations.push('Consider proactive cleanup');
    }

    if (trend === 'increasing') {
      recommendations.push('Memory usage is trending upward');
    }

    if (current.external > current.heapUsed * 0.5) {
      recommendations.push('High external memory usage detected');
    }

    return {
      current,
      usage: {
        percentage,
        trend,
        status
      },
      thresholds: this.thresholds,
      recommendations
    };
  }

  /**
   * Check current memory usage and trigger events
   */
  private checkMemoryUsage(): void {
    const stats = this.getCurrentStats();
    const percentage = stats.heapUsed / this.thresholds.maxHeapSize;

    // Check thresholds
    if (percentage >= this.thresholds.criticalThreshold) {
      this.emitEvent('critical', stats, `Critical memory usage: ${(percentage * 100).toFixed(1)}%`);
      // Trigger immediate cleanup
      this.performCleanup().catch(error => {
        console.error('Emergency cleanup failed:', error);
      });
    } else if (percentage >= this.thresholds.warningThreshold) {
      this.emitEvent('warning', stats, `High memory usage: ${(percentage * 100).toFixed(1)}%`);
    }

    this.lastStats = stats;
  }

  /**
   * Perform scheduled cleanup
   */
  private async performScheduledCleanup(): Promise<void> {
    const percentage = this.getMemoryUsagePercentage();
    
    // Only perform scheduled cleanup if memory usage is above warning threshold
    if (percentage >= this.thresholds.warningThreshold) {
      await this.performCleanup();
    }
  }

  /**
   * Emit memory event to listeners
   */
  private emitEvent(type: MemoryEventType, stats: MemoryStats, message: string): void {
    const event = { type, stats, message };
    
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (error) {
        console.warn('Memory event listener failed:', error);
      }
    }
  }

  /**
   * Detect maximum heap size
   */
  private detectMaxHeapSize(): number {
    // Try to get heap size from V8 flags or use reasonable defaults
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memUsage = process.memoryUsage();
      // Use current heap total as a baseline, with a reasonable maximum
      return Math.max(memUsage.heapTotal * 4, 512 * 1024 * 1024); // At least 512MB
    }
    
    // Default to 1GB if we can't detect
    return 1024 * 1024 * 1024;
  }

  /**
   * Format bytes for human-readable output
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

/**
 * Global memory manager instance
 */
let globalMemoryManager: MemoryManager | null = null;

/**
 * Get or create global memory manager
 */
export function getGlobalMemoryManager(thresholds?: Partial<MemoryThresholds>): MemoryManager {
  if (!globalMemoryManager) {
    globalMemoryManager = new MemoryManager(thresholds);
  }
  return globalMemoryManager;
}

/**
 * Cleanup global memory manager
 */
export function cleanupGlobalMemoryManager(): void {
  if (globalMemoryManager) {
    globalMemoryManager.stopMonitoring();
    globalMemoryManager = null;
  }
}