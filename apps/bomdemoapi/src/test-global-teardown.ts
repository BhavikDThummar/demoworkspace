/**
 * Global teardown for integration tests
 * This file runs once after all tests complete
 */

export default async function globalTeardown() {
  console.log('🧹 Cleaning up after integration tests...');

  // Restore console if it was disabled
  if (global.originalConsole) {
    Object.assign(console, global.originalConsole);
  }

  // Clean up any global test resources
  // (In a real application, you might clean up test databases, etc.)

  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }

  console.log('✅ Global test teardown completed');
}
