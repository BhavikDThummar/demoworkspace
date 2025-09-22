/**
 * Unit tests for MinimalRuleLoaderService (backward compatibility)
 */

import { MinimalRuleLoaderService, CloudRuleLoaderService } from './minimal-rule-loader-service.js';
import { MinimalGoRulesConfig } from '../interfaces/index.js';
import { MinimalGoRulesError, MinimalErrorCode } from '../errors/index.js';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('MinimalRuleLoaderService (Backward Compatibility)', () => {
  let service: MinimalRuleLoaderService;
  let config: MinimalGoRulesConfig;

  beforeEach(() => {
    config = {
      apiUrl: 'https://api.gorules.io',
      apiKey: 'test-api-key',
      projectId: 'test-project-id',
      httpTimeout: 5000,
    };

    service = new MinimalRuleLoaderService(config);
    mockFetch.mockClear();
  });

  describe('backward compatibility', () => {
    it('should be an alias for CloudRuleLoaderService', () => {
      expect(MinimalRuleLoaderService).toBe(CloudRuleLoaderService);
    });

    it('should initialize with correct configuration', () => {
      expect(service).toBeInstanceOf(CloudRuleLoaderService);
    });

    it('should handle API URL with trailing slash', () => {
      const configWithSlash = { ...config, apiUrl: 'https://api.gorules.io/' };
      const serviceWithSlash = new MinimalRuleLoaderService(configWithSlash);
      expect(serviceWithSlash).toBeInstanceOf(CloudRuleLoaderService);
    });
  });

  describe('functional compatibility', () => {
    const mockProjectResponse = {
      rules: [
        {
          id: 'rule-1',
          name: 'Test Rule 1',
          version: '1.0.0',
          tags: ['tag1', 'tag2'],
          lastModified: '2023-01-01T00:00:00Z',
          content: Buffer.from('{"test": "rule1"}').toString('base64'),
        },
      ],
    };

    it('should work exactly like CloudRuleLoaderService', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProjectResponse,
      });

      const result = await service.loadAllRules();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.gorules.io/api/v1/projects/test-project-id/rules',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-api-key',
            'Content-Type': 'application/json',
          }),
        }),
      );

      expect(result.size).toBe(1);
      const rule1 = result.get('rule-1');
      expect(rule1).toBeDefined();
      expect(rule1!.metadata.id).toBe('rule-1');
      expect(rule1!.metadata.version).toBe('1.0.0');
      expect(rule1!.data.toString('utf-8')).toBe('{"test": "rule1"}');
    });

    it('should have all required interface methods', () => {
      expect(service).toHaveProperty('loadAllRules');
      expect(service).toHaveProperty('loadRule');
      expect(service).toHaveProperty('checkVersions');
      expect(service).toHaveProperty('refreshRule');

      expect(typeof service.loadAllRules).toBe('function');
      expect(typeof service.loadRule).toBe('function');
      expect(typeof service.checkVersions).toBe('function');
      expect(typeof service.refreshRule).toBe('function');
    });
  });
});
