/**
 * React Integration Example
 *
 * Complete example showing how to integrate the Minimal GoRules Engine
 * with React applications including hooks, components, and context providers.
 */

import React, {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
  ReactNode,
} from 'react';

// Import the React integration from the library
import { React as GoRulesReact } from '../src/index.js';

// Types for our examples
interface User {
  id: number;
  email: string;
  age: number;
  country: string;
  membershipType: 'basic' | 'premium' | 'enterprise';
}

interface ValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
  score?: number;
}

interface BusinessRuleResult {
  approved: boolean;
  reason: string;
  conditions: Record<string, boolean>;
  recommendations?: string[];
}

// Service Configuration
const goRulesService = new GoRulesReact.ReactGoRulesService({
  baseUrl: process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    // Add authentication if needed
    Authorization: localStorage.getItem('token')
      ? `Bearer ${localStorage.getItem('token')}`
      : undefined,
  },
});

// Context for global state management
interface GoRulesContextType {
  service: GoRulesReact.ReactGoRulesService;
  engineStatus: GoRulesReact.EngineStatus | null;
  isOnline: boolean;
  lastError: string | null;
  refreshStatus: () => Promise<void>;
}

const GoRulesContext = createContext<GoRulesContextType | null>(null);

// Context Provider Component
export const GoRulesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [engineStatus, setEngineStatus] = useState<GoRulesReact.EngineStatus | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [lastError, setLastError] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    try {
      const status = await goRulesService.getStatus();
      setEngineStatus(status);
      setIsOnline(true);
      setLastError(null);
    } catch (error) {
      setIsOnline(false);
      setLastError(error instanceof Error ? error.message : 'Connection failed');
      console.error('Failed to refresh GoRules status:', error);
    }
  }, []);

  useEffect(() => {
    refreshStatus();

    // Refresh status every 30 seconds
    const interval = setInterval(refreshStatus, 30000);
    return () => clearInterval(interval);
  }, [refreshStatus]);

  const contextValue: GoRulesContextType = {
    service: goRulesService,
    engineStatus,
    isOnline,
    lastError,
    refreshStatus,
  };

  return <GoRulesContext.Provider value={contextValue}>{children}</GoRulesContext.Provider>;
};

// Custom hook to use GoRules context
export const useGoRules = () => {
  const context = useContext(GoRulesContext);
  if (!context) {
    throw new Error('useGoRules must be used within a GoRulesProvider');
  }
  return context;
};

// Enhanced Rule Execution Hook with Caching
export const useRuleExecutionWithCache = (cacheTtl: number = 300000) => {
  const { service } = useGoRules();
  const [cache, setCache] = useState<
    Map<
      string,
      {
        result: any;
        timestamp: number;
      }
    >
  >(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createCacheKey = useCallback((ruleId: string, input: Record<string, unknown>) => {
    return `${ruleId}:${JSON.stringify(input, Object.keys(input).sort())}`;
  }, []);

  const executeRule = useCallback(
    async <T = unknown,>(ruleId: string, input: Record<string, unknown>): Promise<T | null> => {
      const cacheKey = createCacheKey(ruleId, input);
      const cached = cache.get(cacheKey);

      // Return cached result if valid
      if (cached && Date.now() - cached.timestamp < cacheTtl) {
        return cached.result;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await service.executeRule<T>(ruleId, input);

        // Cache the result
        setCache((prev) =>
          new Map(prev).set(cacheKey, {
            result,
            timestamp: Date.now(),
          }),
        );

        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [service, cache, cacheTtl, createCacheKey],
  );

  const clearCache = useCallback(() => {
    setCache(new Map());
  }, []);

  const getCacheStats = useCallback(
    () => ({
      size: cache.size,
      entries: Array.from(cache.keys()),
    }),
    [cache],
  );

  return {
    executeRule,
    loading,
    error,
    clearCache,
    getCacheStats,
  };
};

// User Validation Component
export const UserValidator: React.FC<{
  user: User;
  onValidationComplete?: (result: ValidationResult) => void;
}> = ({ user, onValidationComplete }) => {
  const { executeRule, loading, error } = useRuleExecutionWithCache();
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  const validateUser = useCallback(async () => {
    const result = await executeRule<ValidationResult>('user-validation', {
      email: user.email,
      age: user.age,
      country: user.country,
      membershipType: user.membershipType,
    });

    if (result) {
      setValidationResult(result);
      onValidationComplete?.(result);
    }
  }, [executeRule, user, onValidationComplete]);

  useEffect(() => {
    validateUser();
  }, [validateUser]);

  if (loading) {
    return (
      <div className="user-validator loading">
        <div className="spinner" />
        <span>Validating user...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="user-validator error">
        <h4>Validation Error</h4>
        <p>{error}</p>
        <button onClick={validateUser}>Retry</button>
      </div>
    );
  }

  if (!validationResult) {
    return (
      <div className="user-validator">
        <button onClick={validateUser}>Validate User</button>
      </div>
    );
  }

  return (
    <div className={`user-validator ${validationResult.valid ? 'valid' : 'invalid'}`}>
      <h4>User Validation Result</h4>
      <div className="validation-status">
        <span className={`status ${validationResult.valid ? 'valid' : 'invalid'}`}>
          {validationResult.valid ? '✅ Valid' : '❌ Invalid'}
        </span>
        {validationResult.score && (
          <span className="score">Score: {validationResult.score}/100</span>
        )}
      </div>

      {validationResult.errors && validationResult.errors.length > 0 && (
        <div className="errors">
          <h5>Errors:</h5>
          <ul>
            {validationResult.errors.map((error, index) => (
              <li key={index} className="error">
                {error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {validationResult.warnings && validationResult.warnings.length > 0 && (
        <div className="warnings">
          <h5>Warnings:</h5>
          <ul>
            {validationResult.warnings.map((warning, index) => (
              <li key={index} className="warning">
                {warning}
              </li>
            ))}
          </ul>
        </div>
      )}

      <button onClick={validateUser} className="refresh-btn">
        Refresh Validation
      </button>
    </div>
  );
};

// Business Rules Dashboard
export const BusinessRulesDashboard: React.FC<{
  userId: number;
  context: Record<string, unknown>;
}> = ({ userId, context }) => {
  const { service } = useGoRules();
  const [results, setResults] = useState<Map<string, BusinessRuleResult>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>(['business', 'approval']);
  const [executionMode, setExecutionMode] = useState<'parallel' | 'sequential'>('parallel');

  const executeBusinessRules = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const input = { userId, ...context };
      const result = await service.executeByTags<BusinessRuleResult>(
        selectedTags,
        input,
        executionMode,
      );

      setResults(result.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [service, userId, context, selectedTags, executionMode]);

  const availableTags = [
    'business',
    'approval',
    'risk',
    'compliance',
    'fraud',
    'credit',
    'validation',
    'security',
  ];

  return (
    <div className="business-rules-dashboard">
      <h3>Business Rules Dashboard</h3>

      <div className="controls">
        <div className="tag-selection">
          <h4>Select Rule Tags:</h4>
          <div className="tag-checkboxes">
            {availableTags.map((tag) => (
              <label key={tag} className="tag-checkbox">
                <input
                  type="checkbox"
                  checked={selectedTags.includes(tag)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedTags((prev) => [...prev, tag]);
                    } else {
                      setSelectedTags((prev) => prev.filter((t) => t !== tag));
                    }
                  }}
                />
                {tag}
              </label>
            ))}
          </div>
        </div>

        <div className="execution-mode">
          <h4>Execution Mode:</h4>
          <select
            value={executionMode}
            onChange={(e) => setExecutionMode(e.target.value as 'parallel' | 'sequential')}
          >
            <option value="parallel">Parallel</option>
            <option value="sequential">Sequential</option>
          </select>
        </div>

        <button
          onClick={executeBusinessRules}
          disabled={loading || selectedTags.length === 0}
          className="execute-btn"
        >
          {loading ? 'Executing...' : 'Execute Rules'}
        </button>
      </div>

      {error && (
        <div className="error-message">
          <h4>Error</h4>
          <p>{error}</p>
        </div>
      )}

      {results.size > 0 && (
        <div className="results">
          <h4>Rule Results ({results.size} rules executed)</h4>
          <div className="results-grid">
            {Array.from(results.entries()).map(([ruleId, result]) => (
              <div
                key={ruleId}
                className={`rule-result ${result.approved ? 'approved' : 'rejected'}`}
              >
                <h5>{ruleId}</h5>
                <div className="approval-status">
                  <span className={`status ${result.approved ? 'approved' : 'rejected'}`}>
                    {result.approved ? '✅ Approved' : '❌ Rejected'}
                  </span>
                </div>
                <p className="reason">{result.reason}</p>

                {Object.keys(result.conditions).length > 0 && (
                  <div className="conditions">
                    <h6>Conditions:</h6>
                    <ul>
                      {Object.entries(result.conditions).map(([condition, met]) => (
                        <li key={condition} className={met ? 'met' : 'not-met'}>
                          {condition}: {met ? '✅' : '❌'}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.recommendations && result.recommendations.length > 0 && (
                  <div className="recommendations">
                    <h6>Recommendations:</h6>
                    <ul>
                      {result.recommendations.map((rec, index) => (
                        <li key={index}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Engine Status Monitor
export const EngineStatusMonitor: React.FC = () => {
  const { engineStatus, isOnline, lastError, refreshStatus } = useGoRules();
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(refreshStatus, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshStatus]);

  if (!engineStatus) {
    return (
      <div className="engine-status loading">
        <div className="spinner" />
        <span>Loading engine status...</span>
      </div>
    );
  }

  return (
    <div className={`engine-status ${isOnline ? 'online' : 'offline'}`}>
      <div className="status-header">
        <h3>GoRules Engine Status</h3>
        <div className="controls">
          <label className="auto-refresh">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh
          </label>
          <button onClick={refreshStatus} className="refresh-btn">
            Refresh
          </button>
        </div>
      </div>

      <div className="status-grid">
        <div className="status-item">
          <label>Status:</label>
          <span className={`value ${isOnline ? 'online' : 'offline'}`}>
            {isOnline ? '🟢 Online' : '🔴 Offline'}
          </span>
        </div>

        <div className="status-item">
          <label>Initialized:</label>
          <span className={`value ${engineStatus.initialized ? 'yes' : 'no'}`}>
            {engineStatus.initialized ? '✅ Yes' : '❌ No'}
          </span>
        </div>

        <div className="status-item">
          <label>Rules Loaded:</label>
          <span className="value">{engineStatus.rulesLoaded}</span>
        </div>

        <div className="status-item">
          <label>Project ID:</label>
          <span className="value">{engineStatus.projectId}</span>
        </div>

        <div className="status-item">
          <label>Version:</label>
          <span className="value">{engineStatus.version}</span>
        </div>

        <div className="status-item">
          <label>Last Update:</label>
          <span className="value">{new Date(engineStatus.lastUpdate).toLocaleString()}</span>
        </div>

        {engineStatus.performance && (
          <>
            <div className="status-item">
              <label>Memory Usage:</label>
              <span className="value">{engineStatus.performance.memoryUsage.toFixed(2)} MB</span>
            </div>

            {engineStatus.performance.cacheHitRate !== undefined && (
              <div className="status-item">
                <label>Cache Hit Rate:</label>
                <span className="value">
                  {(engineStatus.performance.cacheHitRate * 100).toFixed(1)}%
                </span>
              </div>
            )}

            {engineStatus.performance.averageExecutionTime !== undefined && (
              <div className="status-item">
                <label>Avg Execution Time:</label>
                <span className="value">
                  {engineStatus.performance.averageExecutionTime.toFixed(2)} ms
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {lastError && (
        <div className="error-message">
          <h4>Connection Error</h4>
          <p>{lastError}</p>
        </div>
      )}
    </div>
  );
};

// Rule Metadata Explorer
export const RuleMetadataExplorer: React.FC = () => {
  const { service } = useGoRules();
  const [metadata, setMetadata] = useState<Map<string, GoRulesReact.MinimalRuleMetadata>>(
    new Map(),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('');

  const loadMetadata = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const allMetadata = await service.getAllRuleMetadata();
      setMetadata(allMetadata);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load metadata');
    } finally {
      setLoading(false);
    }
  }, [service]);

  useEffect(() => {
    loadMetadata();
  }, [loadMetadata]);

  // Get all unique tags
  const allTags = Array.from(
    new Set(Array.from(metadata.values()).flatMap((rule) => rule.tags)),
  ).sort();

  // Filter rules based on search and tag
  const filteredRules = Array.from(metadata.entries()).filter(([ruleId, rule]) => {
    const matchesSearch =
      !searchTerm ||
      ruleId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesTag = !selectedTag || rule.tags.includes(selectedTag);

    return matchesSearch && matchesTag;
  });

  if (loading) {
    return (
      <div className="metadata-explorer loading">
        <div className="spinner" />
        <span>Loading rule metadata...</span>
      </div>
    );
  }

  return (
    <div className="metadata-explorer">
      <div className="explorer-header">
        <h3>Rule Metadata Explorer</h3>
        <button onClick={loadMetadata} className="refresh-btn">
          Refresh
        </button>
      </div>

      <div className="filters">
        <div className="search-filter">
          <input
            type="text"
            placeholder="Search rules..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="tag-filter">
          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            className="tag-select"
          >
            <option value="">All Tags</option>
            {allTags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <h4>Error</h4>
          <p>{error}</p>
        </div>
      )}

      <div className="metadata-stats">
        <span>
          Showing {filteredRules.length} of {metadata.size} rules
        </span>
      </div>

      <div className="rules-table">
        <table>
          <thead>
            <tr>
              <th>Rule ID</th>
              <th>Version</th>
              <th>Tags</th>
              <th>Last Modified</th>
            </tr>
          </thead>
          <tbody>
            {filteredRules.map(([ruleId, rule]) => (
              <tr key={ruleId}>
                <td className="rule-id">{ruleId}</td>
                <td className="version">{rule.version}</td>
                <td className="tags">
                  {rule.tags.map((tag) => (
                    <span key={tag} className="tag">
                      {tag}
                    </span>
                  ))}
                </td>
                <td className="last-modified">{new Date(rule.lastModified).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Main Application Example
export const GoRulesApp: React.FC = () => {
  const [currentUser] = useState<User>({
    id: 12345,
    email: 'user@example.com',
    age: 28,
    country: 'US',
    membershipType: 'premium',
  });

  const [businessContext] = useState({
    transactionAmount: 5000,
    currency: 'USD',
    merchantCategory: 'electronics',
    riskScore: 0.3,
  });

  return (
    <GoRulesProvider>
      <div className="gorules-app">
        <header className="app-header">
          <h1>GoRules Integration Demo</h1>
          <EngineStatusMonitor />
        </header>

        <main className="app-main">
          <section className="user-section">
            <h2>User Validation</h2>
            <UserValidator
              user={currentUser}
              onValidationComplete={(result) => {
                console.log('Validation completed:', result);
              }}
            />
          </section>

          <section className="business-rules-section">
            <h2>Business Rules</h2>
            <BusinessRulesDashboard userId={currentUser.id} context={businessContext} />
          </section>

          <section className="metadata-section">
            <h2>Rule Metadata</h2>
            <RuleMetadataExplorer />
          </section>
        </main>
      </div>
    </GoRulesProvider>
  );
};

export default GoRulesApp;
