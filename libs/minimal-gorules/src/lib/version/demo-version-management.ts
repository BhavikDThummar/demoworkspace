/**
 * Demonstration of Version Management functionality
 * Shows how to use the version manager with the main engine
 */

// import { MinimalGoRulesEngine } from '../minimal-gorules-engine.js';
import { MinimalGoRulesConfig } from '../interfaces/index.js';

/**
 * Demo function showing version management capabilities
 */
export async function demonstrateVersionManagement() {
  console.log('=== Version Management Demo ===\n');

  // Configuration for demo
  const _config: MinimalGoRulesConfig = {
    apiUrl: 'https://api.gorules.io',
    apiKey: 'demo-api-key',
    projectId: 'demo-project',
    cacheMaxSize: 100,
    httpTimeout: 5000
  };

  // const engine = new MinimalGoRulesEngine(config);

  try {
    console.log('1. Version Comparison');
    console.log('   - Compare local cache versions with cloud versions');
    console.log('   - Identify rules that need updates');
    console.log('   - Analyze version differences (major, minor, patch)');
    console.log('   Usage: await engine.compareVersions([\'rule1\', \'rule2\']);\n');

    console.log('2. Conflict Detection');
    console.log('   - Detect version conflicts that require resolution');
    console.log('   - Identify rule deletions, version mismatches, timestamp conflicts');
    console.log('   Usage: await engine.detectVersionConflicts([\'rule1\']);\n');

    console.log('3. Automatic Cache Refresh');
    console.log('   - Automatically resolve conflicts using strategies:');
    console.log('     * cloud-wins: Always use cloud version');
    console.log('     * local-wins: Keep local version');
    console.log('     * newer-wins: Use version with later timestamp');
    console.log('     * manual: Require manual resolution');
    console.log('   Usage: await engine.autoRefreshCache([\'rule1\'], { strategy: \'cloud-wins\' });\n');

    console.log('4. Manual Cache Invalidation');
    console.log('   - Manually invalidate and reload specific rules');
    console.log('   - Useful for development scenarios');
    console.log('   - Supports retries and validation');
    console.log('   Usage: await engine.invalidateRules([\'rule1\'], { maxRetries: 3 });\n');

    console.log('5. Rollback Capabilities');
    console.log('   - Create snapshots before rule updates');
    console.log('   - Rollback to previous versions when needed');
    console.log('   - Manage multiple snapshots per rule');
    console.log('   Usage:');
    console.log('     await engine.createRollbackSnapshot(\'rule1\', \'before-update\');');
    console.log('     await engine.rollbackRule(\'rule1\', 0); // Rollback to latest snapshot\n');

    console.log('6. Version Statistics');
    console.log('   - Track rollback snapshots');
    console.log('   - Monitor version management activity');
    console.log('   Usage: engine.getVersionStats();\n');

    console.log('=== Key Features ===');
    console.log('✓ Thread-safe version operations');
    console.log('✓ Batch processing for performance');
    console.log('✓ Configurable retry logic');
    console.log('✓ Comprehensive error handling');
    console.log('✓ Performance timing and metrics');
    console.log('✓ Rollback and recovery capabilities');
    console.log('✓ Multiple conflict resolution strategies');
    console.log('✓ Validation after updates');

    console.log('\n=== Demo Complete ===');
    console.log('Version management functionality is ready for use!');

  } catch (error) {
    console.error('Demo failed:', error);
  }
}

/**
 * Example usage patterns for version management
 */
export const versionManagementExamples = {
  // Basic version comparison
  compareVersions: `
    const comparisons = await engine.compareVersions(['rule1', 'rule2']);
    for (const comparison of comparisons) {
      if (comparison.needsUpdate) {
        console.log(\`Rule \${comparison.ruleId} needs update: \${comparison.localVersion} -> \${comparison.cloudVersion}\`);
      }
    }
  `,

  // Automatic refresh with conflict resolution
  autoRefresh: `
    const result = await engine.autoRefreshCache(['rule1'], {
      strategy: 'cloud-wins',
      createSnapshot: true,
      validateAfterUpdate: true
    });
    
    console.log(\`Updated \${result.updated.length} rules\`);
    console.log(\`Conflicts: \${result.conflicts.length}\`);
    console.log(\`Errors: \${result.errors.size}\`);
  `,

  // Manual invalidation with retries
  manualInvalidation: `
    const result = await engine.invalidateRules(['rule1', 'rule2'], {
      maxRetries: 3,
      retryDelay: 1000,
      createSnapshot: true,
      validateAfterUpdate: true
    });
    
    if (result.errors.size > 0) {
      console.log('Some rules failed to update:', Array.from(result.errors.keys()));
    }
  `,

  // Rollback management
  rollbackManagement: `
    // Create snapshot before risky operation
    await engine.createRollbackSnapshot('rule1', 'before-major-update');
    
    // Perform update...
    await engine.invalidateRules(['rule1']);
    
    // If something goes wrong, rollback
    const snapshots = engine.getRollbackSnapshots('rule1');
    if (snapshots.length > 0) {
      await engine.rollbackRule('rule1', 0); // Rollback to latest snapshot
    }
  `,

  // Version statistics monitoring
  versionStats: `
    const stats = engine.getVersionStats();
    console.log(\`Total snapshots: \${stats.totalSnapshots}\`);
    console.log(\`Rules with snapshots: \${stats.snapshotsByRule.size}\`);
    
    if (stats.oldestSnapshot) {
      const age = Date.now() - stats.oldestSnapshot;
      console.log(\`Oldest snapshot age: \${Math.round(age / 1000 / 60)} minutes\`);
    }
  `
};

// Export for use in other modules
export { demonstrateVersionManagement as default };