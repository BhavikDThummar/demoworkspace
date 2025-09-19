/**
 * Unit tests for ReactGoRulesService
 */

import { ReactGoRulesService, ReactGoRulesError } from './react-gorules-service.js';
import { ReactGoRulesConfig } from './interfaces.js';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('ReactGoRulesService', () => {
  let service: ReactGoRulesService;
  let config: ReactGoRulesConfig;

  beforeEach(() => {
    config = {
      apiBaseUrl: 'http://localhost:3000/api',
      apiKey: 'test-api-key',
      timeout: 5000
    };
    service = new ReactGoRulesService(config);
    mockFetch.mockClear();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('constructor', () => {
    it('should initialize with provided config', () => {
      const serviceConfig = service.getConfig();
      expect(serviceConfig.apiBaseUrl).toBe(config.apiBaseUrl);
      expect(serviceConfig.apiKey).toBe(config.apiKey);
      expect(serviceConfig.timeout).toBe(config.timeout);
    });

    it('should use default values for optional config', () => {
      const minimalConfig: ReactGoRulesConfig = {
        apiBaseUrl: 'http://localhost:3000/api'
      };
      const minimalService = new ReactGoRulesService(minimalConfig);
      const serviceConfig = minimalService.getConfig();
      
      expect(serviceConfig.timeout).toBe(10000);
      expect(serviceConfig.withCredentials).toBe(false);
      expect(serviceConfig.headers).toEqual({});
    });
  });

  describe('makeRequest', () => {
    it('should make successful HTTP request', async () => {
      const mockResponse = { success: true, data: 'test' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponse)
      });

      const result = await (service as any).makeRequest('/test');
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-api-key'
          })
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: jest.fn().mockResolvedValueOnce('Not Found')
      });

      await expect((service as any).makeRequest('/test')).rejects.toThrow(ReactGoRulesError);
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect((service as any).makeRequest('/test')).rejects.toThrow(ReactGoRulesError);
    });

    it('should handle timeout', async () => {
      jest.useFakeTimers();
      
      mockFetch.mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(resolve, 10000))
      );

      const requestPromise = (service as unknown).makeRequest('/test');
      
      // Fast-forward time to trigger timeout
      jest.advanceTimersByTime(5000);
      
      await expect(requestPromise).rejects.toThrow(ReactGoRulesError);
      
      jest.useRealTimers();
    }, 10000);
  });

  describe('executeRule', () => {
    it('should execute single rule successfully', async () => {
      const mockResponse = {
        success: true,
        results: { result: 'test-result' },
        executionTime: 100
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponse)
      });

      const result = await service.executeRule('test-rule', { input: 'test' });
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/minimal-gorules/execute-rule',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            ruleId: 'test-rule',
            input: { input: 'test' }
          })
        })
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('execute', () => {
    it('should execute multiple rules successfully', async () => {
      const mockResponse = {
        success: true,
        results: { 'rule1': 'result1', 'rule2': 'result2' },
        executionTime: 150
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponse)
      });

      const request = {
        ruleIds: ['rule1', 'rule2'],
        input: { input: 'test' },
        mode: 'parallel' as const
      };

      const result = await service.execute(request);
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/minimal-gorules/execute',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(request)
        })
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('executeByTags', () => {
    it('should execute rules by tags successfully', async () => {
      const mockResponse = {
        success: true,
        results: { 'rule1': 'result1' },
        executionTime: 120
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponse)
      });

      const result = await service.executeByTags(['tag1', 'tag2'], { input: 'test' }, 'sequential');
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/minimal-gorules/execute-by-tags',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            tags: ['tag1', 'tag2'],
            input: { input: 'test' },
            mode: 'sequential'
          })
        })
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('executeByIds', () => {
    it('should execute rules by IDs successfully', async () => {
      const mockResponse = {
        success: true,
        results: { 'rule1': 'result1', 'rule2': 'result2' },
        executionTime: 180
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponse)
      });

      const result = await service.executeByIds(['rule1', 'rule2'], { input: 'test' }, 'mixed');
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/minimal-gorules/execute',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            ruleIds: ['rule1', 'rule2'],
            input: { input: 'test' },
            mode: 'mixed'
          })
        })
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getStatus', () => {
    it('should get engine status successfully', async () => {
      const mockResponse = {
        engine: { status: 'ready', initialized: true, rulesLoaded: 10 },
        health: { status: 'healthy', uptime: 3600, lastCheck: Date.now() },
        cache: { size: 10, maxSize: 100, hitRate: 0.95, memoryUsage: 1024 }
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponse)
      });

      const result = await service.getStatus();
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/minimal-gorules/status',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getRuleMetadata', () => {
    it('should get rule metadata successfully', async () => {
      const mockResponse = {
        success: true,
        metadata: {
          id: 'test-rule',
          version: '1.0.0',
          tags: ['tag1'],
          lastModified: Date.now()
        }
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponse)
      });

      const result = await service.getRuleMetadata('test-rule');
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/minimal-gorules/rules/test-rule/metadata',
        expect.any(Object)
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getAllRuleMetadata', () => {
    it('should get all rule metadata successfully', async () => {
      const mockResponse = {
        success: true,
        metadata: {
          'rule1': { id: 'rule1', version: '1.0.0', tags: ['tag1'], lastModified: Date.now() },
          'rule2': { id: 'rule2', version: '1.0.1', tags: ['tag2'], lastModified: Date.now() }
        },
        count: 2
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponse)
      });

      const result = await service.getAllRuleMetadata();
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/minimal-gorules/rules/metadata',
        expect.any(Object)
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getRulesByTags', () => {
    it('should get rules by tags successfully', async () => {
      const mockResponse = {
        success: true,
        ruleIds: ['rule1', 'rule2'],
        count: 2,
        tags: ['tag1', 'tag2']
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponse)
      });

      const result = await service.getRulesByTags(['tag1', 'tag2']);
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/minimal-gorules/rules/by-tags',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ tags: ['tag1', 'tag2'] })
        })
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('validateRule', () => {
    it('should validate rule successfully', async () => {
      const mockResponse = {
        success: true,
        ruleId: 'test-rule',
        isValid: true
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponse)
      });

      const result = await service.validateRule('test-rule');
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/minimal-gorules/rules/test-rule/validate',
        expect.any(Object)
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('checkVersions', () => {
    it('should check versions successfully', async () => {
      const mockResponse = {
        success: true,
        versionCheck: {
          outdatedRules: ['rule1'],
          upToDateRules: ['rule2'],
          totalRules: 2
        }
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponse)
      });

      const result = await service.checkVersions();
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/minimal-gorules/cache/check-versions',
        expect.objectContaining({
          method: 'POST'
        })
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('refreshCache', () => {
    it('should refresh cache successfully', async () => {
      const mockResponse = {
        success: true,
        refreshResult: {
          refreshedRules: ['rule1', 'rule2'],
          failedRules: [],
          totalProcessed: 2
        }
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponse)
      });

      const result = await service.refreshCache(['rule1', 'rule2']);
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/minimal-gorules/cache/refresh',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ ruleIds: ['rule1', 'rule2'] })
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should refresh all cache when no ruleIds provided', async () => {
      const mockResponse = {
        success: true,
        refreshResult: {
          refreshedRules: ['rule1', 'rule2'],
          failedRules: [],
          totalProcessed: 2
        }
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponse)
      });

      const result = await service.refreshCache();
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/minimal-gorules/cache/refresh',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({})
        })
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('forceRefreshCache', () => {
    it('should force refresh cache successfully', async () => {
      const mockResponse = {
        success: true,
        status: {
          rulesLoaded: 10,
          loadTime: 500
        }
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponse)
      });

      const result = await service.forceRefreshCache();
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/minimal-gorules/cache/force-refresh',
        expect.objectContaining({
          method: 'POST'
        })
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', () => {
      const newConfig = {
        timeout: 15000,
        apiKey: 'new-api-key'
      };

      service.updateConfig(newConfig);
      const updatedConfig = service.getConfig();

      expect(updatedConfig.timeout).toBe(15000);
      expect(updatedConfig.apiKey).toBe('new-api-key');
      expect(updatedConfig.apiBaseUrl).toBe(config.apiBaseUrl); // Should remain unchanged
    });
  });
});