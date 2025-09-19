/**
 * Configuration usage examples
 */

import { ConfigFactory } from './config-factory.js';
import { MinimalGoRulesEngine } from '../minimal-gorules-engine.js';

/**
 * Example: Basic configuration from environment variables
 */
export function basicEnvironmentExample() {
  // Set environment variables first:
  // export GORULES_API_URL="https://api.gorules.io"
  // export GORULES_API_KEY="your-api-key"
  // export GORULES_PROJECT_ID="your-project-id"
  
  try {
    const config = ConfigFactory.fromEnvironment();
    const engine = new MinimalGoRulesEngine(config);
    console.log('Engine created successfully with environment configuration');
    return engine;
  } catch (error) {
    console.error('Configuration error:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

/**
 * Example: Development configuration with overrides
 */
export function developmentExample() {
  const config = ConfigFactory.forDevelopment({
    apiKey: 'dev-api-key-123',
    projectId: 'dev-project-456',
    cacheMaxSize: 200,
    enablePerformanceMetrics: true
  });
  
  const engine = new MinimalGoRulesEngine(config);
  console.log('Development engine created with custom settings');
  return engine;
}

/**
 * Example: Production configuration
 */
export function productionExample() {
  // Environment variables should be set in production:
  // GORULES_API_KEY and GORULES_PROJECT_ID are required
  
  const config = ConfigFactory.forProduction({
    cacheMaxSize: 10000, // Large cache for production
    enablePerformanceOptimizations: true,
    enableCompression: true
  });
  
  const engine = new MinimalGoRulesEngine(config);
  console.log('Production engine created with optimizations enabled');
  return engine;
}

/**
 * Example: Testing configuration
 */
export function testingExample() {
  const config = ConfigFactory.forTesting({
    cacheMaxSize: 10, // Small cache for tests
    httpTimeout: 500  // Fast timeout for tests
  });
  
  const engine = new MinimalGoRulesEngine(config);
  console.log('Test engine created with minimal settings');
  return engine;
}

/**
 * Example: Manual configuration with validation
 */
export function manualConfigurationExample() {
  const config = {
    apiUrl: 'https://api.gorules.io',
    apiKey: 'manual-api-key',
    projectId: 'manual-project-id',
    cacheMaxSize: 1500,
    httpTimeout: 8000,
    batchSize: 75,
    enablePerformanceOptimizations: true,
    enablePerformanceMetrics: false,
    memoryWarningThreshold: 0.75,
    memoryCriticalThreshold: 0.9
  };

  // Validate before using
  const validation = ConfigFactory.validate(config);
  if (!validation.isValid) {
    console.error('Configuration validation failed:');
    validation.errors.forEach(error => console.error(`  - ${error}`));
    throw new Error('Invalid configuration');
  }

  const engine = new MinimalGoRulesEngine(config);
  console.log('Engine created with manually validated configuration');
  return engine;
}

/**
 * Example: Environment-specific configuration with fallbacks
 */
export function environmentSpecificExample() {
  const environment = process.env.NODE_ENV || 'development';
  
  let config;
  switch (environment) {
    case 'production':
      config = ConfigFactory.forProduction();
      break;
    case 'test':
      config = ConfigFactory.forTesting();
      break;
    default:
      config = ConfigFactory.forDevelopment();
  }
  
  const engine = new MinimalGoRulesEngine(config);
  console.log(`Engine created for ${environment} environment`);
  return engine;
}

/**
 * Example: Configuration with error handling
 */
export function configurationWithErrorHandling() {
  try {
    // Try to load from environment first
    const config = ConfigFactory.fromEnvironment();
    const engine = new MinimalGoRulesEngine(config);
    console.log('Successfully loaded configuration from environment');
    return engine;
  } catch (error) {
    console.warn('Failed to load from environment, falling back to development config');
    
    // Fallback to development configuration
    const config = ConfigFactory.forDevelopment({
      apiKey: 'fallback-api-key',
      projectId: 'fallback-project-id'
    });
    
    const engine = new MinimalGoRulesEngine(config);
    console.log('Using fallback development configuration');
    return engine;
  }
}

/**
 * Example: Getting configuration documentation
 */
export function showConfigurationDocumentation() {
  const docs = ConfigFactory.getDocumentation();
  console.log(docs);
  return docs;
}