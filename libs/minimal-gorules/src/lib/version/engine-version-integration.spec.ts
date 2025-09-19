/**
 * Integration tests for Version Management with MinimalGoRulesEngine
 * Tests the complete version management workflow through the main engine
 */

import { MinimalGoRulesEngine } from '../minimal-gorules-engine.js';
import { MinimalGoRulesConfig } from '../interfaces/index.js';
import { MinimalGoRulesError } from '../errors/index.js';

// Mock fetch for HTTP requests
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('Engine Version Management Integration', () => {
  let engine: MinimalGoRulesEngine;
  let config: MinimalGoRulesConfig;

  beforeEach(() => {
    config = {
      apiUrl: 'https://api.gorules.io',
      apiKey: 'test-api-key',
      projectId: 'test-project',
      cacheMaxSize: 100,
      httpTimeout: 5000
    };

    engine = new MinimalGoRulesEngine(config);
    jest.clearAllMocks();
  });

  describe('version comparison integration', () => {
    it('should compare versions through engine interface', async () => {
      // Mock initial load
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          rules: [
            {
              id: 'rule1',
              name: 'Test Rule 1',
              version: '1.0.0',
              tags: ['test'],
              lastModified: '2024-01-01T00:00:00Z',
              content: Buffer.from('{"test": "rule1"}').toString('base64')
            },
            {
              id: 'rule2',
              name: 'Test Rule 2',
              version: '1.0.0',
              tags: ['test'],
              lastModified: '2024-01-01T00:00:00Z',
              content: Buffer.from('{"test": "rule2"}').toString('base64')
            }
          ]
        })
      });

      // Initialize engine
      await engine.initialize();

      // Mock version check - rule1 has newer version, rule2 is up to date
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            rules: [
              {
                id: 'rule1',
                name: 'Test Rule 1',
                version: '1.1.0', // Newer version
                tags: ['test'],
                lastModified: '2024-01-02T00:00:00Z',
                content: Buffer.from('{"test": "rule1-updated"}').toString('base64')
              },
              {
                id: 'rule2',
                name: 'Test Rule 2',
                version: '1.0.0', // Same version
                tags: ['test'],
                lastModified: '2024-01-01T00:00:00Z',
                content: Buffer.from('{"test": "rule2"}').toString('base64')
              }
            ]
          })
        })
        // Mock individual rule loads for detailed comparison
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'rule1',
            name: 'Test Rule 1',
            version: '1.1.0',
            tags: ['test'],
            lastModified: '2024-01-02T00:00:00Z',
            content: Buffer.from('{"test": "rule1-updated"}').toString('base64')
          })
        });

      const comparisons = await engine.compareVersions(['rule1', 'rule2']);

      expect(comparisons).toHaveLength(2);
      
      const rule1Comparison = comparisons.find(c => c.ruleId === 'rule1');
      const rule2Comparison = comparisons.find(c => c.ruleId === 'rule2');

      expect(rule1Comparison).toBeDefined();
      expect(rule1Comparison!.needsUpdate).toBe(true);
      expect(rule1Comparison!.localVersion).toBe('1.0.0');
      expect(rule1Comparison!.cloudVersion).toBe('1.1.0');
      expect(rule1Comparison!.versionDiff).toBe('minor');

      expect(rule2Comparison).toBeDefined();
      expect(rule2Comparison!.needsUpdate).toBe(false);
      expect(rule2Comparison!.versionDiff).toBe('same');
    });

    it('should detect conflicts through engine interface', async () => {
      // Mock initial load
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          rules: [
            {
              id: 'rule1',
              name: 'Test Rule 1',
              version: '1.0.0',
              tags: ['test'],
              lastModified: '2024-01-01T00:00:00Z',
              content: Buffer.from('{"test": "rule1"}').toString('base64')
            }
          ]
        })
      });

      await engine.initialize();

      // Mock version check showing conflict
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            rules: [
              {
                id: 'rule1',
                name: 'Test Rule 1',
                version: '2.0.0', // Major version change
                tags: ['test'],
                lastModified: '2024-01-02T00:00:00Z',
                content: Buffer.from('{"test": "rule1-major-update"}').toString('base64')
              }
            ]
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'rule1',
            name: 'Test Rule 1',
            version: '2.0.0',
            tags: ['test'],
            lastModified: '2024-01-02T00:00:00Z',
            content: Buffer.from('{"test": "rule1-major-update"}').toString('base64')
          })
        });

      const conflicts = await engine.detectVersionConflicts(['rule1']);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0]).toEqual({
        ruleId: 'rule1',
        localVersion: '1.0.0',
        cloudVersion: '2.0.0',
        localLastModified: new Date('2024-01-01T00:00:00Z').getTime(),
        cloudLastModified: new Date('2024-01-02T00:00:00Z').getTime(),
        conflictType: 'version-mismatch'
      });
    });
  });

  describe('automatic cache refresh integration', () => {
    it('should auto-refresh cache with cloud-wins strategy', async () => {
      // Mock initial load
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          rules: [
            {
              id: 'rule1',
              name: 'Test Rule 1',
              version: '1.0.0',
              tags: ['test'],
              lastModified: '2024-01-01T00:00:00Z',
              content: Buffer.from('{"test": "rule1-old"}').toString('base64')
            }
          ]
        })
      });

      await engine.initialize();

      // Verify initial state
      let metadata = await engine.getRuleMetadata('rule1');
      expect(metadata?.version).toBe('1.0.0');

      // Mock auto-refresh calls
      mockFetch
        // Version check
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            rules: [
              {
                id: 'rule1',
                name: 'Test Rule 1',
                version: '1.1.0',
                tags: ['test'],
                lastModified: '2024-01-02T00:00:00Z',
                content: Buffer.from('{"test": "rule1-new"}').toString('base64')
              }
            ]
          })
        })
        // Individual rule load for comparison
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'rule1',
            name: 'Test Rule 1',
            version: '1.1.0',
            tags: ['test'],
            lastModified: '2024-01-02T00:00:00Z',
            content: Buffer.from('{"test": "rule1-new"}').toString('base64')
          })
        })
        // Rule refresh
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'rule1',
            name: 'Test Rule 1',
            version: '1.1.0',
            tags: ['test'],
            lastModified: '2024-01-02T00:00:00Z',
            content: Buffer.from('{"test": "rule1-new"}').toString('base64')
          })
        });

      const result = await engine.autoRefreshCache(['rule1'], {
        strategy: 'cloud-wins',
        createSnapshot: false
      });

      expect(result.processed).toEqual(['rule1']);
      expect(result.updated).toEqual(['rule1']);
      expect(result.conflicts).toHaveLength(1);
      expect(result.errors.size).toBe(0);

      // Verify cache was updated
      metadata = await engine.getRuleMetadata('rule1');
      expect(metadata?.version).toBe('1.1.0');
    });

    it('should handle newer-wins strategy correctly', async () => {
      // Mock initial load with newer local timestamp
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          rules: [
            {
              id: 'rule1',
              name: 'Test Rule 1',
              version: '1.0.0',
              tags: ['test'],
              lastModified: '2024-01-02T00:00:00Z', // Local is newer
              content: Buffer.from('{"test": "rule1-local"}').toString('base64')
            }
          ]
        })
      });

      await engine.initialize();

      // Mock auto-refresh calls with older cloud version
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            rules: [
              {
                id: 'rule1',
                name: 'Test Rule 1',
                version: '1.1.0', // Different version
                tags: ['test'],
                lastModified: '2024-01-01T00:00:00Z', // But older timestamp
                content: Buffer.from('{"test": "rule1-cloud"}').toString('base64')
              }
            ]
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'rule1',
            name: 'Test Rule 1',
            version: '1.1.0',
            tags: ['test'],
            lastModified: '2024-01-01T00:00:00Z',
            content: Buffer.from('{"test": "rule1-cloud"}').toString('base64')
          })
        });

      const result = await engine.autoRefreshCache(['rule1'], {
        strategy: 'newer-wins',
        createSnapshot: false
      });

      expect(result.processed).toEqual(['rule1']);
      expect(result.updated).toEqual([]); // Should not update because local is newer
      expect(result.conflicts).toHaveLength(1);

      // Verify cache was not updated
      const metadata = await engine.getRuleMetadata('rule1');
      expect(metadata?.version).toBe('1.0.0'); // Still local version
    });
  });

  describe('manual cache invalidation integration', () => {
    it('should invalidate and reload rules manually', async () => {
      // Mock initial load
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          rules: [
            {
              id: 'rule1',
              name: 'Test Rule 1',
              version: '1.0.0',
              tags: ['test'],
              lastModified: '2024-01-01T00:00:00Z',
              content: Buffer.from('{"test": "rule1-old"}').toString('base64')
            }
          ]
        })
      });

      await engine.initialize();

      // Mock manual invalidation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'rule1',
          name: 'Test Rule 1',
          version: '1.2.0',
          tags: ['test'],
          lastModified: '2024-01-03T00:00:00Z',
          content: Buffer.from('{"test": "rule1-manual-update"}').toString('base64')
        })
      });

      const result = await engine.invalidateRules(['rule1'], {
        createSnapshot: false,
        validateAfterUpdate: true
      });

      expect(result.processed).toEqual(['rule1']);
      expect(result.updated).toEqual(['rule1']);
      expect(result.errors.size).toBe(0);

      // Verify cache was updated
      const metadata = await engine.getRuleMetadata('rule1');
      expect(metadata?.version).toBe('1.2.0');
    });

    it('should handle invalidation failures with retries', async () => {
      // Mock initial load
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          rules: [
            {
              id: 'rule1',
              name: 'Test Rule 1',
              version: '1.0.0',
              tags: ['test'],
              lastModified: '2024-01-01T00:00:00Z',
              content: Buffer.from('{"test": "rule1"}').toString('base64')
            }
          ]
        })
      });

      await engine.initialize();

      // Mock failures then success
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'rule1',
            name: 'Test Rule 1',
            version: '1.1.0',
            tags: ['test'],
            lastModified: '2024-01-02T00:00:00Z',
            content: Buffer.from('{"test": "rule1-retry-success"}').toString('base64')
          })
        });

      const result = await engine.invalidateRules(['rule1'], {
        createSnapshot: false,
        maxRetries: 3,
        retryDelay: 10
      });

      expect(result.processed).toEqual(['rule1']);
      expect(result.updated).toEqual(['rule1']);
      expect(result.errors.size).toBe(0);

      // Verify cache was updated after retries
      const metadata = await engine.getRuleMetadata('rule1');
      expect(metadata?.version).toBe('1.1.0');
    });
  });

  describe('rollback functionality integration', () => {
    it('should create snapshots and rollback through engine', async () => {
      // Mock initial load
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          rules: [
            {
              id: 'rule1',
              name: 'Test Rule 1',
              version: '1.0.0',
              tags: ['test'],
              lastModified: '2024-01-01T00:00:00Z',
              content: Buffer.from('{"test": "rule1-original"}').toString('base64')
            }
          ]
        })
      });

      await engine.initialize();

      // Create snapshot
      await engine.createRollbackSnapshot('rule1', 'before-update');

      // Verify snapshot was created
      const snapshots = engine.getRollbackSnapshots('rule1');
      expect(snapshots).toHaveLength(1);
      expect(snapshots[0].reason).toBe('before-update');
      expect(snapshots[0].version).toBe('1.0.0');

      // Mock update
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'rule1',
          name: 'Test Rule 1',
          version: '1.1.0',
          tags: ['test'],
          lastModified: '2024-01-02T00:00:00Z',
          content: Buffer.from('{"test": "rule1-updated"}').toString('base64')
        })
      });

      // Update rule
      await engine.invalidateRules(['rule1'], { createSnapshot: false });

      // Verify update
      let metadata = await engine.getRuleMetadata('rule1');
      expect(metadata?.version).toBe('1.1.0');

      // Rollback
      const rollbackSuccess = await engine.rollbackRule('rule1');
      expect(rollbackSuccess).toBe(true);

      // Verify rollback
      metadata = await engine.getRuleMetadata('rule1');
      expect(metadata?.version).toBe('1.0.0');
    });

    it('should manage rollback snapshots correctly', async () => {
      // Mock initial load
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          rules: [
            {
              id: 'rule1',
              name: 'Test Rule 1',
              version: '1.0.0',
              tags: ['test'],
              lastModified: '2024-01-01T00:00:00Z',
              content: Buffer.from('{"test": "rule1"}').toString('base64')
            },
            {
              id: 'rule2',
              name: 'Test Rule 2',
              version: '1.0.0',
              tags: ['test'],
              lastModified: '2024-01-01T00:00:00Z',
              content: Buffer.from('{"test": "rule2"}').toString('base64')
            }
          ]
        })
      });

      await engine.initialize();

      // Create snapshots for multiple rules
      await engine.createRollbackSnapshot('rule1', 'snapshot-1');
      await engine.createRollbackSnapshot('rule2', 'snapshot-2');

      // Verify snapshots
      expect(engine.getRollbackSnapshots('rule1')).toHaveLength(1);
      expect(engine.getRollbackSnapshots('rule2')).toHaveLength(1);

      // Get version stats
      const stats = engine.getVersionStats();
      expect(stats.totalSnapshots).toBe(2);
      expect(stats.snapshotsByRule.get('rule1')).toBe(1);
      expect(stats.snapshotsByRule.get('rule2')).toBe(1);

      // Clear specific rule snapshots
      engine.clearRollbackSnapshots('rule1');
      expect(engine.getRollbackSnapshots('rule1')).toHaveLength(0);
      expect(engine.getRollbackSnapshots('rule2')).toHaveLength(1);

      // Clear all snapshots
      engine.clearRollbackSnapshots();
      expect(engine.getRollbackSnapshots('rule2')).toHaveLength(0);
    });
  });

  describe('error handling integration', () => {
    it('should handle network errors during version operations', async () => {
      // Mock initial load
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          rules: [
            {
              id: 'rule1',
              name: 'Test Rule 1',
              version: '1.0.0',
              tags: ['test'],
              lastModified: '2024-01-01T00:00:00Z',
              content: Buffer.from('{"test": "rule1"}').toString('base64')
            }
          ]
        })
      });

      await engine.initialize();

      // Mock network error
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(engine.compareVersions(['rule1'])).rejects.toThrow(
        MinimalGoRulesError
      );
    });

    it('should handle API errors gracefully', async () => {
      // Mock initial load
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          rules: [
            {
              id: 'rule1',
              name: 'Test Rule 1',
              version: '1.0.0',
              tags: ['test'],
              lastModified: '2024-01-01T00:00:00Z',
              content: Buffer.from('{"test": "rule1"}').toString('base64')
            }
          ]
        })
      });

      await engine.initialize();

      // Mock API error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      await expect(engine.detectVersionConflicts(['rule1'])).rejects.toThrow(
        MinimalGoRulesError
      );
    });

    it('should require initialization before version operations', async () => {
      // Don't initialize engine

      await expect(engine.compareVersions(['rule1'])).rejects.toThrow(
        'Engine not initialized'
      );

      await expect(engine.detectVersionConflicts(['rule1'])).rejects.toThrow(
        'Engine not initialized'
      );

      await expect(engine.autoRefreshCache(['rule1'])).rejects.toThrow(
        'Engine not initialized'
      );

      await expect(engine.invalidateRules(['rule1'])).rejects.toThrow(
        'Engine not initialized'
      );
    });
  });

  describe('performance and timing', () => {
    it('should track processing times for version operations', async () => {
      // Mock initial load
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          rules: [
            {
              id: 'rule1',
              name: 'Test Rule 1',
              version: '1.0.0',
              tags: ['test'],
              lastModified: '2024-01-01T00:00:00Z',
              content: Buffer.from('{"test": "rule1"}').toString('base64')
            }
          ]
        })
      });

      await engine.initialize();

      // Mock version operations with delays
      mockFetch
        .mockImplementationOnce(() => 
          new Promise(resolve => 
            setTimeout(() => resolve({
              ok: true,
              json: async () => ({
                rules: [
                  {
                    id: 'rule1',
                    name: 'Test Rule 1',
                    version: '1.1.0',
                    tags: ['test'],
                    lastModified: '2024-01-02T00:00:00Z',
                    content: Buffer.from('{"test": "rule1-updated"}').toString('base64')
                  }
                ]
              })
            }), 50)
          )
        )
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'rule1',
            name: 'Test Rule 1',
            version: '1.1.0',
            tags: ['test'],
            lastModified: '2024-01-02T00:00:00Z',
            content: Buffer.from('{"test": "rule1-updated"}').toString('base64')
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'rule1',
            name: 'Test Rule 1',
            version: '1.1.0',
            tags: ['test'],
            lastModified: '2024-01-02T00:00:00Z',
            content: Buffer.from('{"test": "rule1-updated"}').toString('base64')
          })
        });

      const result = await engine.autoRefreshCache(['rule1'], {
        strategy: 'cloud-wins',
        createSnapshot: false
      });

      expect(result.processingTime).toBeGreaterThan(0);
      expect(result.processingTime).toBeGreaterThan(50); // Should include the delay
    });
  });
});