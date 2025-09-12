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
export interface Type<T = {}> {
  new (...args: any[]): T;
}