/**
 * Configuration interface for GoRules integration
 */
export interface GoRulesConfig {
  /** GoRules API URL */
  apiUrl: string;

  /** API key for authentication */
  apiKey: string;

  /** Project ID in GoRules */
  projectId: string;

  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;

  /** Number of retry attempts for failed requests (default: 3) */
  retryAttempts?: number;

  /** Enable detailed logging (default: false) */
  enableLogging?: boolean;

  /** Log level for GoRules operations (default: 'info') */
  logLevel?: 'error' | 'warn' | 'info' | 'debug' | 'verbose';

  /** Maximum number of log entries to keep in memory (default: 1000) */
  maxLogEntries?: number;

  /** Log retention period in milliseconds (default: 24 hours) */
  logRetentionMs?: number;

  /** Enable performance monitoring (default: true) */
  enableMetrics?: boolean;

  /** Performance alert thresholds */
  performanceThresholds?: {
    /** Execution time threshold in milliseconds (default: 5000) */
    executionTime?: number;

    /** Error rate threshold (0-1, default: 0.1) */
    errorRate?: number;

    /** Memory usage threshold percentage (default: 80) */
    memoryUsage?: number;
  };
}

/**
 * Options for asynchronous GoRules module configuration
 */
export interface GoRulesAsyncOptions {
  imports?: any[];
  useFactory?: (...args: any[]) => Promise<GoRulesConfig> | GoRulesConfig;
  inject?: any[];
  useClass?: Type<GoRulesOptionsFactory>;
  useExisting?: Type<GoRulesOptionsFactory>;
}

/**
 * Factory interface for creating GoRules configuration
 */
export interface GoRulesOptionsFactory {
  createGoRulesOptions(): Promise<GoRulesConfig> | GoRulesConfig;
}

/**
 * Type helper for class constructors
 */
export interface Type<T = object> {
  new (...args: unknown[]): T;
}

/**
 * Extended configuration interface with additional options
 */
export interface GoRulesExtendedConfig extends GoRulesConfig {
  /** Custom headers to include in API requests */
  customHeaders?: Record<string, string>;

  /** Base path for API endpoints (default: '/api/v1') */
  basePath?: string;

  /** Enable request/response caching */
  enableCaching?: boolean;

  /** Cache TTL in milliseconds (default: 300000 - 5 minutes) */
  cacheTtl?: number;

  /** Maximum number of concurrent requests */
  maxConcurrentRequests?: number;

  /** Enable request compression */
  enableCompression?: boolean;

  /** User agent string for API requests */
  userAgent?: string;

  /** Proxy configuration */
  proxy?: {
    host: string;
    port: number;
    auth?: {
      username: string;
      password: string;
    };
  };

  /** SSL/TLS configuration */
  ssl?: {
    /** Reject unauthorized certificates */
    rejectUnauthorized?: boolean;

    /** Custom CA certificates */
    ca?: string[];

    /** Client certificate */
    cert?: string;

    /** Client private key */
    key?: string;
  };
}

/**
 * Configuration for different environments
 */
export interface GoRulesEnvironmentConfig {
  /** Development environment configuration */
  development?: Partial<GoRulesExtendedConfig>;

  /** Test environment configuration */
  test?: Partial<GoRulesExtendedConfig>;

  /** Staging environment configuration */
  staging?: Partial<GoRulesExtendedConfig>;

  /** Production environment configuration */
  production?: Partial<GoRulesExtendedConfig>;
}

/**
 * Configuration validation options
 */
export interface GoRulesConfigValidationOptions {
  /** Strict validation mode */
  strict?: boolean;

  /** Allow unknown properties */
  allowUnknown?: boolean;

  /** Custom validation rules */
  customValidators?: Array<(config: GoRulesConfig) => string[]>;
}

/**
 * Configuration loading options
 */
export interface GoRulesConfigLoadOptions {
  /** Configuration file path */
  configFile?: string;

  /** Environment variable prefix */
  envPrefix?: string;

  /** Enable hot reloading */
  hotReload?: boolean;

  /** Validation options */
  validation?: GoRulesConfigValidationOptions;
}

/**
 * Configuration change event
 */
export interface GoRulesConfigChangeEvent {
  /** Previous configuration */
  previous: GoRulesConfig;

  /** New configuration */
  current: GoRulesConfig;

  /** Changed keys */
  changedKeys: string[];

  /** Timestamp of the change */
  timestamp: Date;
}

/**
 * Configuration watcher interface
 */
export interface GoRulesConfigWatcher {
  /** Start watching for configuration changes */
  start(): void;

  /** Stop watching for configuration changes */
  stop(): void;

  /** Subscribe to configuration changes */
  onChange(callback: (event: GoRulesConfigChangeEvent) => void): void;

  /** Unsubscribe from configuration changes */
  offChange(callback: (event: GoRulesConfigChangeEvent) => void): void;
}

/**
 * Configuration provider interface
 */
export interface GoRulesConfigProvider {
  /** Load configuration */
  load(): Promise<GoRulesConfig>;

  /** Save configuration */
  save(config: GoRulesConfig): Promise<void>;

  /** Check if configuration exists */
  exists(): Promise<boolean>;

  /** Watch for configuration changes */
  watch?(): GoRulesConfigWatcher;
}
