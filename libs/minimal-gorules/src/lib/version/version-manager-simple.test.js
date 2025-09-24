/**
 * Simple JavaScript test for Version Manager to verify basic functionality
 */

const { VersionManager } = require('./version-manager.js');

// Simple mock implementations
class MockCacheManager {
  constructor() {
    this.rules = new Map();
    this.metadata = new Map();
  }

  async get(ruleId) {
    return this.rules.get(ruleId) || null;
  }

  async set(ruleId, data, metadata) {
    this.rules.set(ruleId, data);
    this.metadata.set(ruleId, metadata);
  }

  async getMetadata(ruleId) {
    return this.metadata.get(ruleId) || null;
  }

  async getAllMetadata() {
    return new Map(this.metadata);
  }

  async invalidate(ruleId) {
    this.rules.delete(ruleId);
    this.metadata.delete(ruleId);
  }

  // Test helper
  setTestData(ruleId, data, metadata) {
    this.rules.set(ruleId, data);
    this.metadata.set(ruleId, metadata);
  }
}

class MockLoaderService {
  constructor() {
    this.cloudRules = new Map();
  }

  async checkVersions(rules) {
    const result = new Map();
    for (const [ruleId, localVersion] of rules) {
      const cloudRule = this.cloudRules.get(ruleId);
      if (cloudRule) {
        result.set(ruleId, cloudRule.metadata.version !== localVersion);
      } else {
        result.set(ruleId, true);
      }
    }
    return result;
  }

  async loadRule(ruleId) {
    const rule = this.cloudRules.get(ruleId);
    if (!rule) {
      throw new Error(`Rule ${ruleId} not found`);
    }
    return rule;
  }

  // Test helper
  setCloudRule(ruleId, data, metadata) {
    this.cloudRules.set(ruleId, { data, metadata });
  }
}

// Simple test function
async function testVersionManager() {
  console.log('Testing Version Manager...');

  const mockCache = new MockCacheManager();
  const mockLoader = new MockLoaderService();
  const versionManager = new VersionManager(mockCache, mockLoader);

  try {
    // Test 1: Version comparison
    console.log('Test 1: Version comparison');

    // Setup local cache with v1.0.0
    const localData = Buffer.from('{"local": "data"}');
    const localMetadata = {
      id: 'rule1',
      version: '1.0.0',
      tags: ['test'],
      lastModified: 1000,
    };
    mockCache.setTestData('rule1', localData, localMetadata);

    // Setup cloud with v1.1.0
    const cloudData = Buffer.from('{"cloud": "data"}');
    const cloudMetadata = {
      id: 'rule1',
      version: '1.1.0',
      tags: ['test'],
      lastModified: 2000,
    };
    mockLoader.setCloudRule('rule1', cloudData, cloudMetadata);

    const comparisons = await versionManager.compareVersions(['rule1']);

    if (comparisons.length === 1 && comparisons[0].needsUpdate === true) {
      console.log('✓ Version comparison works correctly');
    } else {
      console.log('✗ Version comparison failed');
      return false;
    }

    // Test 2: Rollback snapshots
    console.log('Test 2: Rollback snapshots');

    await versionManager.createRollbackSnapshot('rule1', 'test-snapshot');
    const snapshots = versionManager.getRollbackSnapshots('rule1');

    if (snapshots.length === 1 && snapshots[0].reason === 'test-snapshot') {
      console.log('✓ Rollback snapshots work correctly');
    } else {
      console.log('✗ Rollback snapshots failed');
      return false;
    }

    // Test 3: Version stats
    console.log('Test 3: Version stats');

    const stats = versionManager.getVersionStats();

    if (stats.totalSnapshots === 1 && stats.snapshotsByRule.get('rule1') === 1) {
      console.log('✓ Version stats work correctly');
    } else {
      console.log('✗ Version stats failed');
      return false;
    }

    console.log('All tests passed! ✓');
    return true;
  } catch (error) {
    console.error('Test failed with error:', error);
    return false;
  }
}

// Jest test
describe('Version Manager Simple Test', () => {
  it('should pass basic functionality test', async () => {
    const result = await testVersionManager();
    expect(result).toBe(true);
  });
});

// Run the test if this file is executed directly
if (require.main === module) {
  testVersionManager().then((success) => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { testVersionManager };
