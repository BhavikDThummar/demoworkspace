/**
 * React component for displaying engine status
 */

import { useEffect } from 'react';
import { EngineStatusProps } from '../interfaces.js';
import { useGoRulesContext } from './GoRulesProvider.js';
import { useEngineStatus } from '../hooks/use-engine-status.js';

/**
 * Component for displaying engine status and health information
 */
export function EngineStatus({
  refreshInterval = 0,
  detailed = false,
  className = '',
  onStatusUpdate
}: EngineStatusProps) {
  const service = useGoRulesContext();
  const { loading, status, error, lastUpdated, refresh } = useEngineStatus(service, refreshInterval);

  // Notify parent of status updates
  useEffect(() => {
    if (status && onStatusUpdate) {
      onStatusUpdate(status);
    }
  }, [status, onStatusUpdate]);

  const formatUptime = (uptime: number): string => {
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'healthy':
      case 'ready':
      case 'initialized':
        return '#28a745';
      case 'initializing':
      case 'loading':
        return '#ffc107';
      case 'error':
      case 'failed':
        return '#dc3545';
      default:
        return '#6c757d';
    }
  };

  return (
    <div className={`engine-status ${className}`} style={{ padding: '16px', border: '1px solid #ddd', borderRadius: '4px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0 }}>Engine Status</h3>
        <button
          onClick={refresh}
          disabled={loading}
          style={{
            padding: '4px 8px',
            backgroundColor: loading ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '12px'
          }}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div style={{ color: 'red', marginBottom: '16px', padding: '8px', backgroundColor: '#f8d7da', borderRadius: '4px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {status && (
        <div>
          {/* Engine Status */}
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ margin: '0 0 8px 0' }}>Engine</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px', fontSize: '14px' }}>
              <span><strong>Status:</strong></span>
              <span style={{ color: getStatusColor(status.engine.status) }}>
                {status.engine.status}
              </span>
              
              <span><strong>Initialized:</strong></span>
              <span>{status.engine.initialized ? 'Yes' : 'No'}</span>
              
              <span><strong>Rules Loaded:</strong></span>
              <span>{status.engine.rulesLoaded}</span>
            </div>
          </div>

          {/* Health Status */}
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ margin: '0 0 8px 0' }}>Health</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px', fontSize: '14px' }}>
              <span><strong>Status:</strong></span>
              <span style={{ color: getStatusColor(status.health.status) }}>
                {status.health.status}
              </span>
              
              <span><strong>Uptime:</strong></span>
              <span>{formatUptime(status.health.uptime)}</span>
              
              <span><strong>Last Check:</strong></span>
              <span>{formatTimestamp(status.health.lastCheck)}</span>
            </div>
          </div>

          {/* Cache Status */}
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ margin: '0 0 8px 0' }}>Cache</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px', fontSize: '14px' }}>
              <span><strong>Size:</strong></span>
              <span>{status.cache.size} / {status.cache.maxSize}</span>
              
              <span><strong>Hit Rate:</strong></span>
              <span>{(status.cache.hitRate * 100).toFixed(1)}%</span>
              
              <span><strong>Memory Usage:</strong></span>
              <span>{(status.cache.memoryUsage / 1024 / 1024).toFixed(2)} MB</span>
            </div>
          </div>

          {/* Detailed Information */}
          {detailed && (
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ margin: '0 0 8px 0' }}>Initialization</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px', fontSize: '14px' }}>
                <span><strong>Status:</strong></span>
                <span style={{ color: getStatusColor(status.initialization.status) }}>
                  {status.initialization.status}
                </span>
                
                <span><strong>Start Time:</strong></span>
                <span>{formatTimestamp(status.initialization.startTime)}</span>
                
                {status.initialization.duration && (
                  <>
                    <span><strong>Duration:</strong></span>
                    <span>{status.initialization.duration}ms</span>
                  </>
                )}
                
                {status.initialization.rulesLoaded && (
                  <>
                    <span><strong>Rules Loaded:</strong></span>
                    <span>{status.initialization.rulesLoaded}</span>
                  </>
                )}
                
                {status.initialization.errors && status.initialization.errors.length > 0 && (
                  <>
                    <span><strong>Errors:</strong></span>
                    <div>
                      {status.initialization.errors.map((error, index) => (
                        <div key={index} style={{ color: 'red', fontSize: '12px' }}>
                          {error}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Last Updated */}
          {lastUpdated && (
            <div style={{ fontSize: '12px', color: '#666', textAlign: 'right' }}>
              Last updated: {formatTimestamp(lastUpdated)}
            </div>
          )}
        </div>
      )}

      {!loading && !status && !error && (
        <div style={{ textAlign: 'center', color: '#666' }}>
          No status data available
        </div>
      )}
    </div>
  );
}