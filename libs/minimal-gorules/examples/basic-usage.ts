/**
 * Basic Usage Examples for Minimal GoRules Engine
 *
 * This file demonstrates the most common usage patterns for the engine.
 */

import { MinimalGoRulesEngine, MinimalGoRulesConfig } from '../src/index.js';

// Basic configuration
const config: MinimalGoRulesConfig = {
  apiUrl: 'https://api.gorules.io',
  apiKey: process.env.GORULES_API_KEY!,
  projectId: 'your-project-id',
};

async function basicUsageExamples() {
  console.log('=== Basic Usage Examples ===\n');

  // 1. Initialize the engine
  console.log('1. Initializing engine...');
  const engine = new MinimalGoRulesEngine(config);
  const status = await engine.initialize();
  console.log(`   Engine initialized with ${status.rulesLoaded} rules\n`);

  // 2. Execute a single rule
  console.log('2. Executing single rule...');
  try {
    const result = await engine.executeRule('user-validation', {
      email: 'user@example.com',
      age: 25,
      country: 'US',
    });
    console.log('   Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('   Error:', error.message);
  }
  console.log('');

  // 3. Execute multiple rules in parallel
  console.log('3. Executing multiple rules in parallel...');
  try {
    const results = await engine.executeRules(
      ['user-validation', 'credit-check', 'fraud-detection'],
      {
        userId: 12345,
        amount: 1000,
        email: 'user@example.com',
      },
    );

    console.log(`   Executed ${results.results.size} rules in ${results.executionTime}ms`);
    for (const [ruleId, result] of results.results) {
      console.log(`   ${ruleId}:`, JSON.stringify(result, null, 2));
    }

    if (results.errors && results.errors.size > 0) {
      console.log('   Errors:');
      for (const [ruleId, error] of results.errors) {
        console.log(`   ${ruleId}: ${error.message}`);
      }
    }
  } catch (error) {
    console.error('   Error:', error.message);
  }
  console.log('');

  // 4. Execute rules by tags
  console.log('4. Executing rules by tags...');
  try {
    const results = await engine.executeByTags(
      ['validation', 'security'],
      {
        userId: 12345,
        action: 'login',
        ipAddress: '192.168.1.1',
      },
      'parallel',
    );

    console.log(
      `   Executed ${results.results.size} rules with tags in ${results.executionTime}ms`,
    );
    for (const [ruleId, result] of results.results) {
      console.log(`   ${ruleId}:`, JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.error('   Error:', error.message);
  }
  console.log('');

  // 5. Get rule metadata
  console.log('5. Getting rule metadata...');
  try {
    const metadata = await engine.getRuleMetadata('user-validation');
    if (metadata) {
      console.log('   Rule metadata:', {
        id: metadata.id,
        version: metadata.version,
        tags: metadata.tags,
        lastModified: new Date(metadata.lastModified).toISOString(),
      });
    } else {
      console.log('   Rule not found');
    }
  } catch (error) {
    console.error('   Error:', error.message);
  }
  console.log('');

  // 6. Check engine status
  console.log('6. Checking engine status...');
  try {
    const engineStatus = await engine.getStatus();
    console.log('   Engine status:', {
      initialized: engineStatus.initialized,
      rulesLoaded: engineStatus.rulesLoaded,
      projectId: engineStatus.projectId,
      memoryUsage: engineStatus.performance?.memoryUsage + 'MB',
    });
  } catch (error) {
    console.error('   Error:', error.message);
  }
  console.log('');

  // 7. Validate rule exists
  console.log('7. Validating rule exists...');
  try {
    const isValid = await engine.validateRule('user-validation');
    console.log(`   Rule 'user-validation' is valid: ${isValid}`);
  } catch (error) {
    console.error('   Error:', error.message);
  }
  console.log('');

  // 8. Get rules by tags
  console.log('8. Getting rules by tags...');
  try {
    const ruleIds = await engine.getRulesByTags(['validation']);
    console.log(`   Found ${ruleIds.length} rules with 'validation' tag:`, ruleIds);
  } catch (error) {
    console.error('   Error:', error.message);
  }
  console.log('');

  // 9. Cleanup
  console.log('9. Cleaning up...');
  await engine.cleanup();
  console.log('   Engine cleaned up successfully');
}

// Run examples if this file is executed directly
if (require.main === module) {
  basicUsageExamples().catch(console.error);
}

export { basicUsageExamples };
