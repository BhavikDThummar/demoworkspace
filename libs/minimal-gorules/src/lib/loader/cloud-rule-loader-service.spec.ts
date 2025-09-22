/**
 * Unit tests for CloudRuleLoaderService
 */

import { CloudRuleLoaderService } from './cloud-rule-loader-service.js';
import { MinimalGoRulesConfig } from '../interfaces/index.js';
import { MinimalGoRulesError, MinimalErrorCode } from '../errors/index.js';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('CloudRuleLoaderService', () => {
  let service: CloudRuleLoaderService;
  let config: MinimalGoRulesConfig;

  beforeEach(() => {
    config = {
      apiUrl: 'https://api.gorules.io',
      apiKey: 'test-api-key',
      projectId: 'test-project-id',
      httpTimeout: 5000,
    };

    service = new CloudRuleLoaderService(config);
    mockFetch.mockClear();
  });

  describe('constructor', () => {
    it('should initialize with correct configuration', () => {
      expect(service).toBeInstanceOf(CloudRuleLoaderService);
    });

    it('should handle API URL with trailing slash', () => {
      const configWithSlash = { ...config, apiUrl: 'https://api.gorules.io/' };
      const serviceWithSlash = new CloudRuleLoaderService(configWithSlash);
      expect(serviceWithSlash).toBeInstanceOf(CloudRuleLoaderService);
    });
  });

  describe('loadAllRules', () => {
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
        {
          id: 'rule-2',
          name: 'Test Rule 2',
          version: '2.0.0',
          tags: ['tag2', 'tag3'],
          lastModified: '2023-01-02T00:00:00Z',
          content: Buffer.from('{"test": "rule2"}').toString('base64'),
        },
      ],
    };

    it('should load all rules successfully', async () => {
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

      expect(result.size).toBe(2);

      const rule1 = result.get('rule-1');
      expect(rule1).toBeDefined();
      expect(rule1!.metadata.id).toBe('rule-1');
      expect(rule1!.metadata.version).toBe('1.0.0');
      expect(rule1!.metadata.tags).toEqual(['tag1', 'tag2']);
      expect(rule1!.data.toString('utf-8')).toBe('{"test": "rule1"}');

      const rule2 = result.get('rule-2');
      expect(rule2).toBeDefined();
      expect(rule2!.metadata.id).toBe('rule-2');
      expect(rule2!.metadata.version).toBe('2.0.0');
      expect(rule2!.metadata.tags).toEqual(['tag2', 'tag3']);
    });

    it('should load rules for specific project ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProjectResponse,
      });

      await service.loadAllRules('custom-project-id');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.gorules.io/api/v1/projects/custom-project-id/rules',
        expect.any(Object),
      );
    });

    it('should handle HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(service.loadAllRules()).rejects.toThrow(MinimalGoRulesError);
      await expect(service.loadAllRules()).rejects.toThrow('Network error');
    });

    it('should handle network timeouts', async () => {
      // Mock fetch to simulate timeout by rejecting with AbortError
      mockFetch.mockImplementationOnce(() => {
        const error = new Error('The operation was aborted');
        error.name = 'AbortError';
        return Promise.reject(error);
      });

      await expect(service.loadAllRules()).rejects.toThrow(MinimalGoRulesError);

      // Reset mock for second call
      mockFetch.mockImplementationOnce(() => {
        const error = new Error('The operation was aborted');
        error.name = 'AbortError';
        return Promise.reject(error);
      });

      await expect(service.loadAllRules()).rejects.toThrow('timed out');
    });

    it('should handle invalid JSON content', async () => {
      const invalidResponse = {
        rules: [
          {
            id: 'invalid-rule',
            name: 'Invalid Rule',
            version: '1.0.0',
            tags: [],
            lastModified: '2023-01-01T00:00:00Z',
            content: Buffer.from('invalid json').toString('base64'),
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => invalidResponse,
      });

      await expect(service.loadAllRules()).rejects.toThrow(MinimalGoRulesError);

      // Reset mock for second call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => invalidResponse,
      });

      await expect(service.loadAllRules()).rejects.toThrow('Failed to parse rule response');
    });

    it('should handle empty rules array', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ rules: [] }),
      });

      const result = await service.loadAllRules();
      expect(result.size).toBe(0);
    });
  });

  describe('loadRule', () => {
    const mockRuleResponse = {
      id: 'rule-1',
      name: 'Test Rule 1',
      version: '1.0.0',
      tags: ['tag1', 'tag2'],
      lastModified: '2023-01-01T00:00:00Z',
      content: Buffer.from('{"test": "rule1"}').toString('base64'),
    };

    it('should load individual rule successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRuleResponse,
      });

      const result = await service.loadRule('rule-1');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.gorules.io/api/v1/projects/test-project-id/rules/rule-1',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-api-key',
          }),
        }),
      );

      expect(result.metadata.id).toBe('rule-1');
      expect(result.metadata.version).toBe('1.0.0');
      expect(result.data.toString('utf-8')).toBe('{"test": "rule1"}');
    });

    it('should handle rule not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(service.loadRule('nonexistent-rule')).rejects.toThrow(MinimalGoRulesError);
    });
  });

  describe('checkVersions', () => {
    const mockProjectResponse = {
      rules: [
        {
          id: 'rule-1',
          name: 'Test Rule 1',
          version: '1.1.0', // Updated version
          tags: ['tag1'],
          lastModified: '2023-01-01T00:00:00Z',
          content: Buffer.from('{"test": "rule1"}').toString('base64'),
        },
        {
          id: 'rule-2',
          name: 'Test Rule 2',
          version: '2.0.0', // Same version
          tags: ['tag2'],
          lastModified: '2023-01-02T00:00:00Z',
          content: Buffer.from('{"test": "rule2"}').toString('base64'),
        },
      ],
    };

    it('should check versions correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProjectResponse,
      });

      const rulesToCheck = new Map([
        ['rule-1', '1.0.0'], // Outdated version
        ['rule-2', '2.0.0'], // Current version
        ['rule-3', '1.0.0'], // Non-existent rule
      ]);

      const result = await service.checkVersions(rulesToCheck);

      expect(result.get('rule-1')).toBe(true); // Needs update
      expect(result.get('rule-2')).toBe(false); // Up to date
      expect(result.get('rule-3')).toBe(true); // Not found, needs update
    });

    it('should handle empty rules map', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ rules: [] }),
      });

      const result = await service.checkVersions(new Map());
      expect(result.size).toBe(0);
    });
  });

  describe('refreshRule', () => {
    it('should refresh rule (alias for loadRule)', async () => {
      const mockRuleResponse = {
        id: 'rule-1',
        name: 'Test Rule 1',
        version: '1.0.0',
        tags: ['tag1'],
        lastModified: '2023-01-01T00:00:00Z',
        content: Buffer.from('{"test": "rule1"}').toString('base64'),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRuleResponse,
      });

      const result = await service.refreshRule('rule-1');
      expect(result.metadata.id).toBe('rule-1');
    });
  });

  describe('error handling', () => {
    it('should handle fetch rejection', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failure'));

      await expect(service.loadAllRules()).rejects.toThrow(MinimalGoRulesError);
      await expect(service.loadAllRules()).rejects.toThrow('Network error');
    });

    it('should handle non-Error rejections', async () => {
      mockFetch.mockRejectedValueOnce('String error');

      await expect(service.loadAllRules()).rejects.toThrow(MinimalGoRulesError);

      // Reset mock for second call
      mockFetch.mockRejectedValueOnce('String error');

      await expect(service.loadAllRules()).rejects.toThrow('Unknown error');
    });

    it('should preserve MinimalGoRulesError instances', async () => {
      const originalError = MinimalGoRulesError.timeout('test operation');
      mockFetch.mockRejectedValueOnce(originalError);

      await expect(service.loadAllRules()).rejects.toThrow(originalError);
    });
  });

  describe('metadata parsing', () => {
    it('should parse lastModified timestamp correctly', async () => {
      const mockResponse = {
        rules: [
          {
            id: 'rule-1',
            name: 'Test Rule',
            version: '1.0.0',
            tags: ['tag1'],
            lastModified: '2023-06-15T14:30:00.000Z',
            content: Buffer.from('{"test": "rule"}').toString('base64'),
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await service.loadAllRules();
      const rule = result.get('rule-1');

      expect(rule!.metadata.lastModified).toBe(new Date('2023-06-15T14:30:00.000Z').getTime());
    });

    it('should handle missing tags', async () => {
      const mockResponse = {
        rules: [
          {
            id: 'rule-1',
            name: 'Test Rule',
            version: '1.0.0',
            // tags field missing
            lastModified: '2023-01-01T00:00:00Z',
            content: Buffer.from('{"test": "rule"}').toString('base64'),
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await service.loadAllRules();
      const rule = result.get('rule-1');

      expect(rule?.metadata.tags).toEqual([]);
    });
  });
});