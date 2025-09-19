/**
 * Engine Status Dashboard Example
 * 
 * This example demonstrates real-time monitoring of the Minimal GoRules Engine
 * status, including health checks, cache statistics, and performance metrics.
 */

import React, { useState } from 'react';
import { EngineStatus, GoRulesProvider } from '../index.js';
import { useGoRulesContext } from '../components/GoRulesProvider.js';
import { useEngineStatus } from '../hooks/use-engine-status.js';

// Configuration for the GoRules service
const config = {
  apiBaseUrl: 'http://localhost:3000/api',
  timeout: 10000
};

/**
 * Cache management component
 */
function CacheManagement(): JSX.Element {
  const service = useGoRulesContext();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleRefreshCache = async () => {
    setLoading(true);
    setMessage(null);
    
    try {
      const result = await service.refreshCache();
      setMessage(`Cache refreshed: ${result.refreshResult.refreshedRules.length} rules updated`);
    } catch (error) {
      setMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleForceRefresh = async () => {
    setLoading(true);
    setMessage(null);
    
    try {
      const result = await service.forceRefreshCache();
      setMessage(`Force refresh completed: ${result.status.rulesLoaded} rules loaded in ${result.status.loadTime}ms`);
    } catch (error) {
      setMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckVersions = async () => {
    setLoading(true);
    setMessage(null);
    
    try {
      const result = await service.checkVersions();
      const { outdatedRules, upToDateRules, totalRules } = result.versionCheck;
      setMessage(`Version check: ${outdatedRules.length} outdated, ${upToDateRules.length} up-to-date (${totalRules} total)`);
    } catch (error) {
      setMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      padding: '16px', 
      border: '1px solid #ddd', 
      borderRadius: '4px',
      backgroundColor: '#f9f9f9'
    }}>
      <h4 style={{ margin: '0 0 16px 0' }}>Cache Management</h4>
      
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button
          onClick={handleRefreshCache}
          disabled={loading}
          style={{
            padding: '8px 12px',
            backgroundColor: loading ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          Refresh Cache
        </button>
        
        <button
          onClick={handleForceRefresh}
          disabled={loading}
          style={{
            padding: '8px 12px',
            backgroundColor: loading ? '#ccc' : '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          Force Refresh
        </button>
        
        <button
          onClick={handleCheckVersions}
          disabled={loading}
          style={{
            padding: '8px 12px',
            backgroundColor: loading ? '#ccc' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          Check Versions
        </button>
      </div>

      {message && (
        <div style={{
          padding: '8px',
          backgroundColor: message.startsWith('Error') ? '#f8d7da' : '#d4edda',
          border: `1px solid ${message.startsWith('Error') ? '#dc3545' : '#28a745'}`,
          borderRadius: '4px',
          fontSize: '14px'
        }}>
          {message}
        </div>
      )}
    </div>
  );
}

/**
 * Performance metrics component
 */
function PerformanceMetrics(): JSX.Element {
  const service = useGoRulesContext();
  const { status } = useEngineStatus(service, 5000); // Refresh every 5 seconds

  if (!status) {
    return <div>Loading performance metrics...</div>;
  }

  const calculateCacheEfficiency = () => {
    const { size, maxSize, hitRate } = status.cache;
    const utilization = (size / maxSize) * 100;
    const efficiency = hitRate * 100;
    
    return {
      utilization: utilization.toFixed(1),
      efficiency: efficiency.toFixed(1),
      status: efficiency > 90 ? 'excellent' : efficiency > 70 ? 'good' : 'needs-improvement'
    };
  };

  const cacheMetrics = calculateCacheEfficiency();

  return (
    <div style={{ 
      padding: '16px', 
      border: '1px solid #ddd', 
      borderRadius: '4px',
      backgroundColor: '#f9f9f9'
    }}>
      <h4 style={{ margin: '0 0 16px 0' }}>Performance Metrics</h4>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        {/* Cache Utilization */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#007bff' }}>
            {cacheMetrics.utilization}%
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>Cache Utilization</div>
          <div style={{ fontSize: '10px', color: '#999' }}>
            {status.cache.size} / {status.cache.maxSize} rules
          </div>
        </div>

        {/* Cache Hit Rate */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            fontSize: '24px', 
            fontWeight: 'bold', 
            color: cacheMetrics.status === 'excellent' ? '#28a745' : 
                   cacheMetrics.status === 'good' ? '#ffc107' : '#dc3545'
          }}>
            {cacheMetrics.efficiency}%
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>Hit Rate</div>
          <div style={{ fontSize: '10px', color: '#999', textTransform: 'capitalize' }}>
            {cacheMetrics.status.replace('-', ' ')}
          </div>
        </div>

        {/* Memory Usage */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#6f42c1' }}>
            {(status.cache.memoryUsage / 1024 / 1024).toFixed(1)}MB
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>Memory Usage</div>
          <div style={{ fontSize: '10px', color: '#999' }}>Cache Memory</div>
        </div>

        {/* Uptime */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#17a2b8' }}>
            {Math.floor(status.health.uptime / 3600)}h
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>Uptime</div>
          <div style={{ fontSize: '10px', color: '#999' }}>
            {Math.floor((status.health.uptime % 3600) / 60)}m {status.health.uptime % 60}s
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * System alerts component
 */
function SystemAlerts(): JSX.Element {
  const service = useGoRulesContext();
  const { status, error } = useEngineStatus(service, 10000); // Check every 10 seconds

  const getAlerts = () => {
    const alerts: Array<{ type: 'warning' | 'error' | 'info'; message: string }> = [];

    if (error) {
      alerts.push({ type: 'error', message: `Connection error: ${error}` });
    }

    if (status) {
      // Check engine status
      if (!status.engine.initialized) {
        alerts.push({ type: 'error', message: 'Engine is not initialized' });
      }

      // Check health status
      if (status.health.status !== 'healthy') {
        alerts.push({ type: 'warning', message: `Health status: ${status.health.status}` });
      }

      // Check cache utilization
      const utilization = (status.cache.size / status.cache.maxSize) * 100;
      if (utilization > 90) {
        alerts.push({ type: 'warning', message: 'Cache utilization is high (>90%)' });
      }

      // Check hit rate
      if (status.cache.hitRate < 0.7) {
        alerts.push({ type: 'warning', message: 'Cache hit rate is low (<70%)' });
      }

      // Check for initialization errors
      if (status.initialization.errors && status.initialization.errors.length > 0) {
        alerts.push({ 
          type: 'error', 
          message: `Initialization errors: ${status.initialization.errors.join(', ')}` 
        });
      }
    }

    return alerts;
  };

  const alerts = getAlerts();

  if (alerts.length === 0) {
    return (
      <div style={{ 
        padding: '16px', 
        border: '1px solid #28a745', 
        borderRadius: '4px',
        backgroundColor: '#d4edda',
        color: '#155724'
      }}>
        <h4 style={{ margin: '0 0 8px 0' }}>System Status</h4>
        <div>✅ All systems operational</div>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '16px', 
      border: '1px solid #ddd', 
      borderRadius: '4px',
      backgroundColor: '#f9f9f9'
    }}>
      <h4 style={{ margin: '0 0 16px 0' }}>System Alerts</h4>
      
      {alerts.map((alert, index) => (
        <div
          key={index}
          style={{
            padding: '8px 12px',
            margin: '4px 0',
            backgroundColor: 
              alert.type === 'error' ? '#f8d7da' :
              alert.type === 'warning' ? '#fff3cd' : '#d1ecf1',
            border: `1px solid ${
              alert.type === 'error' ? '#dc3545' :
              alert.type === 'warning' ? '#ffc107' : '#17a2b8'
            }`,
            borderRadius: '4px',
            color: 
              alert.type === 'error' ? '#721c24' :
              alert.type === 'warning' ? '#856404' : '#0c5460'
          }}
        >
          <span style={{ marginRight: '8px' }}>
            {alert.type === 'error' ? '❌' : alert.type === 'warning' ? '⚠️' : 'ℹ️'}
          </span>
          {alert.message}
        </div>
      ))}
    </div>
  );
}

/**
 * Main dashboard component
 */
function EngineStatusDashboardExample(): JSX.Element {
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const [detailedView, setDetailedView] = useState(true);

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Engine Status Dashboard</h1>
        
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <label>
            Refresh Interval:
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              style={{ marginLeft: '8px', padding: '4px' }}
            >
              <option value={0}>Manual</option>
              <option value={1000}>1 second</option>
              <option value={5000}>5 seconds</option>
              <option value={10000}>10 seconds</option>
              <option value={30000}>30 seconds</option>
            </select>
          </label>
          
          <label>
            <input
              type="checkbox"
              checked={detailedView}
              onChange={(e) => setDetailedView(e.target.checked)}
              style={{ marginRight: '8px' }}
            />
            Detailed View
          </label>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '20px' }}>
        {/* Main Status */}
        <EngineStatus
          refreshInterval={refreshInterval}
          detailed={detailedView}
          onStatusUpdate={(status) => {
            console.log('Status updated:', status);
          }}
        />

        {/* System Alerts */}
        <SystemAlerts />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Performance Metrics */}
        <PerformanceMetrics />

        {/* Cache Management */}
        <CacheManagement />
      </div>
    </div>
  );
}

/**
 * Complete example with provider wrapper
 */
export function EngineStatusDashboardApp(): JSX.Element {
  return (
    <GoRulesProvider config={config}>
      <EngineStatusDashboardExample />
    </GoRulesProvider>
  );
}

export default EngineStatusDashboardApp;