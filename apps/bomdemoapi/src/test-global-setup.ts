/**
 * Global setup for integration tests
 * This file runs once before all tests start
 */

export default async function globalSetup() {
  console.log('🚀 Starting integration test suite...');
  
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.GORULES_API_URL = 'https://test.gorules.io';
  process.env.GORULES_API_KEY = 'test-api-key';
  process.env.GORULES_PROJECT_ID = 'test-project-id';
  process.env.GORULES_ENABLE_LOGGING = 'false';
  process.env.GORULES_TIMEOUT = '5000';
  process.env.GORULES_RETRY_ATTEMPTS = '1';
  
  // Disable console output during tests
  if (!process.env.VERBOSE_TESTS) {
    const originalConsole = console;
    global.originalConsole = originalConsole;
    
    console.log = () => {};
    console.info = () => {};
    console.warn = () => {};
    console.debug = () => {};
    // Keep console.error for important error messages
  }
  
  // Set up any global test resources
  console.log('✅ Global test setup completed');
}