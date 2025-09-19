/**
 * React hook for engine status monitoring
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { ReactGoRulesService } from '../react-gorules-service.js';
import { UseEngineStatusState } from '../interfaces.js';

/**
 * Hook for monitoring engine status with optional auto-refresh
 */
export function useEngineStatus(
  service: ReactGoRulesService,
  refreshInterval = 0,
): UseEngineStatusState & {
  refresh: () => Promise<void>;
  startAutoRefresh: (interval: number) => void;
  stopAutoRefresh: () => void;
} {
  const [state, setState] = useState<UseEngineStatusState>({
    loading: false,
    status: null,
    error: null,
    lastUpdated: null,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const refresh = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const status = await service.getStatus();
      setState({
        loading: false,
        status,
        error: null,
        lastUpdated: Date.now(),
      });
    } catch (error) {
      setState({
        loading: false,
        status: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        lastUpdated: null,
      });
    }
  }, [service]);

  const startAutoRefresh = useCallback(
    (interval: number) => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      if (interval > 0) {
        intervalRef.current = setInterval(refresh, interval);
      }
    },
    [refresh],
  );

  const stopAutoRefresh = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Initial load and auto-refresh setup
  useEffect(() => {
    refresh();

    if (refreshInterval > 0) {
      startAutoRefresh(refreshInterval);
    }

    return () => {
      stopAutoRefresh();
    };
  }, [refresh, refreshInterval, startAutoRefresh, stopAutoRefresh]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAutoRefresh();
    };
  }, [stopAutoRefresh]);

  return {
    ...state,
    refresh,
    startAutoRefresh,
    stopAutoRefresh,
  };
}
