/**
 * Unit tests for useEngineStatus hook
 */

import { renderHook, act } from '@testing-library/react';
import { useEngineStatus } from './use-engine-status.js';
import { ReactGoRulesService } from '../react-gorules-service.js';

// Mock ReactGoRulesService
const mockService = {
  getStatus: jest.fn()
} as unknown as ReactGoRulesService;

// Mock timers
jest.useFakeTimers();

describe('useEngineStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.useFakeTimers();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useEngineStatus(mockService, 0));

    expect(result.current.loading).toBe(false);
    expect(result.current.status).toBe(null);
    expect(result.current.error).toBe(null);
    expect(result.current.lastUpdated).toBe(null);
  });

  it('should load status on mount', async () => {
    const mockStatus = {
      engine: { status: 'ready', initialized: true, rulesLoaded: 10 },
      health: { status: 'healthy', uptime: 3600, lastCheck: Date.now() },
      cache: { size: 10, maxSize: 100, hitRate: 0.95, memoryUsage: 1024 },
      initialization: { status: 'complete', startTime: Date.now() }
    };

    (mockService.getStatus as jest.Mock).mockResolvedValueOnce(mockStatus);

    const { result } = renderHook(() => useEngineStatus(mockService, 0));

    // Wait for initial load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(mockService.getStatus).toHaveBeenCalledTimes(1);
    expect(result.current.loading).toBe(false);
    expect(result.current.status).toEqual(mockStatus);
    expect(result.current.error).toBe(null);
    expect(result.current.lastUpdated).toBeGreaterThan(0);
  });

  it('should handle status loading error', async () => {
    const error = new Error('Failed to load status');
    (mockService.getStatus as jest.Mock).mockRejectedValueOnce(error);

    const { result } = renderHook(() => useEngineStatus(mockService, 0));

    // Wait for initial load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.status).toBe(null);
    expect(result.current.error).toBe('Failed to load status');
    expect(result.current.lastUpdated).toBe(null);
  });

  it('should refresh status manually', async () => {
    const mockStatus = {
      engine: { status: 'ready', initialized: true, rulesLoaded: 10 },
      health: { status: 'healthy', uptime: 3600, lastCheck: Date.now() },
      cache: { size: 10, maxSize: 100, hitRate: 0.95, memoryUsage: 1024 },
      initialization: { status: 'complete', startTime: Date.now() }
    };

    (mockService.getStatus as jest.Mock).mockResolvedValue(mockStatus);

    const { result } = renderHook(() => useEngineStatus(mockService, 0));

    // Wait for initial load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Clear mock calls from initial load
    (mockService.getStatus as jest.Mock).mockClear();

    // Manual refresh
    await act(async () => {
      await result.current.refresh();
    });

    expect(mockService.getStatus).toHaveBeenCalledTimes(1);
    expect(result.current.status).toEqual(mockStatus);
  });

  it('should auto-refresh with interval', async () => {
    const mockStatus = {
      engine: { status: 'ready', initialized: true, rulesLoaded: 10 },
      health: { status: 'healthy', uptime: 3600, lastCheck: Date.now() },
      cache: { size: 10, maxSize: 100, hitRate: 0.95, memoryUsage: 1024 },
      initialization: { status: 'complete', startTime: Date.now() }
    };

    (mockService.getStatus as jest.Mock).mockResolvedValue(mockStatus);

    const { result } = renderHook(() => useEngineStatus(mockService, 5000));

    // Wait for initial load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(mockService.getStatus).toHaveBeenCalledTimes(1);

    // Fast-forward time to trigger auto-refresh
    await act(async () => {
      jest.advanceTimersByTime(5000);
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(mockService.getStatus).toHaveBeenCalledTimes(2);
  });

  it('should start auto-refresh manually', async () => {
    const mockStatus = {
      engine: { status: 'ready', initialized: true, rulesLoaded: 10 },
      health: { status: 'healthy', uptime: 3600, lastCheck: Date.now() },
      cache: { size: 10, maxSize: 100, hitRate: 0.95, memoryUsage: 1024 },
      initialization: { status: 'complete', startTime: Date.now() }
    };

    (mockService.getStatus as jest.Mock).mockResolvedValue(mockStatus);

    const { result } = renderHook(() => useEngineStatus(mockService, 0));

    // Wait for initial load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(mockService.getStatus).toHaveBeenCalledTimes(1);

    // Start auto-refresh manually
    act(() => {
      result.current.startAutoRefresh(3000);
    });

    // Fast-forward time to trigger auto-refresh
    await act(async () => {
      jest.advanceTimersByTime(3000);
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(mockService.getStatus).toHaveBeenCalledTimes(2);
  });

  it('should stop auto-refresh', async () => {
    const mockStatus = {
      engine: { status: 'ready', initialized: true, rulesLoaded: 10 },
      health: { status: 'healthy', uptime: 3600, lastCheck: Date.now() },
      cache: { size: 10, maxSize: 100, hitRate: 0.95, memoryUsage: 1024 },
      initialization: { status: 'complete', startTime: Date.now() }
    };

    (mockService.getStatus as jest.Mock).mockResolvedValue(mockStatus);

    const { result } = renderHook(() => useEngineStatus(mockService, 2000));

    // Wait for initial load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(mockService.getStatus).toHaveBeenCalledTimes(1);

    // Stop auto-refresh
    act(() => {
      result.current.stopAutoRefresh();
    });

    // Fast-forward time - should not trigger refresh
    await act(async () => {
      jest.advanceTimersByTime(2000);
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(mockService.getStatus).toHaveBeenCalledTimes(1); // Still only initial call
  });

  it('should clear interval on unmount', async () => {
    const mockStatus = {
      engine: { status: 'ready', initialized: true, rulesLoaded: 10 },
      health: { status: 'healthy', uptime: 3600, lastCheck: Date.now() },
      cache: { size: 10, maxSize: 100, hitRate: 0.95, memoryUsage: 1024 },
      initialization: { status: 'complete', startTime: Date.now() }
    };

    (mockService.getStatus as jest.Mock).mockResolvedValue(mockStatus);

    const { result, unmount } = renderHook(() => useEngineStatus(mockService, 1000));

    // Wait for initial load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(mockService.getStatus).toHaveBeenCalledTimes(1);

    // Unmount component
    unmount();

    // Fast-forward time - should not trigger refresh after unmount
    await act(async () => {
      jest.advanceTimersByTime(1000);
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(mockService.getStatus).toHaveBeenCalledTimes(1); // Still only initial call
  });

  it('should replace existing interval when starting new auto-refresh', async () => {
    const mockStatus = {
      engine: { status: 'ready', initialized: true, rulesLoaded: 10 },
      health: { status: 'healthy', uptime: 3600, lastCheck: Date.now() },
      cache: { size: 10, maxSize: 100, hitRate: 0.95, memoryUsage: 1024 },
      initialization: { status: 'complete', startTime: Date.now() }
    };

    (mockService.getStatus as jest.Mock).mockResolvedValue(mockStatus);

    const { result } = renderHook(() => useEngineStatus(mockService, 5000));

    // Wait for initial load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Start new auto-refresh with different interval
    act(() => {
      result.current.startAutoRefresh(2000);
    });

    // Fast-forward by old interval - should not trigger
    await act(async () => {
      jest.advanceTimersByTime(5000);
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(mockService.getStatus).toHaveBeenCalledTimes(3); // Initial + 2 calls from new interval

    // Fast-forward by new interval
    await act(async () => {
      jest.advanceTimersByTime(2000);
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(mockService.getStatus).toHaveBeenCalledTimes(4);
  });

  it('should not start auto-refresh with zero interval', async () => {
    const mockStatus = {
      engine: { status: 'ready', initialized: true, rulesLoaded: 10 },
      health: { status: 'healthy', uptime: 3600, lastCheck: Date.now() },
      cache: { size: 10, maxSize: 100, hitRate: 0.95, memoryUsage: 1024 },
      initialization: { status: 'complete', startTime: Date.now() }
    };

    (mockService.getStatus as jest.Mock).mockResolvedValue(mockStatus);

    const { result } = renderHook(() => useEngineStatus(mockService, 0));

    // Wait for initial load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(mockService.getStatus).toHaveBeenCalledTimes(1);

    // Start auto-refresh with zero interval
    act(() => {
      result.current.startAutoRefresh(0);
    });

    // Fast-forward time - should not trigger refresh
    await act(async () => {
      jest.advanceTimersByTime(5000);
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(mockService.getStatus).toHaveBeenCalledTimes(1); // Still only initial call
  });
});