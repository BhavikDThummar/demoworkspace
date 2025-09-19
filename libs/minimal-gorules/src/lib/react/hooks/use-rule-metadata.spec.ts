/**
 * Unit tests for useRuleMetadata hook
 */

import { renderHook, act } from '@testing-library/react';
import { useRuleMetadata } from './use-rule-metadata.js';
import { ReactGoRulesService } from '../react-gorules-service.js';

// Mock ReactGoRulesService
const mockService = {
  getAllRuleMetadata: jest.fn(),
  getRuleMetadata: jest.fn(),
} as unknown as ReactGoRulesService;

describe('useRuleMetadata', () => {
  const mockMetadata = {
    rule1: {
      id: 'rule1',
      version: '1.0.0',
      tags: ['tag1', 'tag2'],
      lastModified: Date.now(),
    },
    rule2: {
      id: 'rule2',
      version: '1.0.1',
      tags: ['tag2', 'tag3'],
      lastModified: Date.now(),
    },
    rule3: {
      id: 'rule3',
      version: '1.0.2',
      tags: ['tag1'],
      lastModified: Date.now(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useRuleMetadata(mockService, false));

    expect(result.current.loading).toBe(false);
    expect(result.current.metadata).toBe(null);
    expect(result.current.error).toBe(null);
    expect(result.current.lastUpdated).toBe(null);
  });

  it('should auto-load metadata on mount when enabled', async () => {
    const mockResponse = {
      success: true,
      metadata: mockMetadata,
      count: 3,
    };

    (mockService.getAllRuleMetadata as jest.Mock).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useRuleMetadata(mockService, true));

    // Wait for auto-load
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mockService.getAllRuleMetadata).toHaveBeenCalledTimes(1);
    expect(result.current.loading).toBe(false);
    expect(result.current.metadata).toEqual(mockMetadata);
    expect(result.current.error).toBe(null);
    expect(result.current.lastUpdated).toBeGreaterThan(0);
  });

  it('should not auto-load metadata when disabled', async () => {
    const { result } = renderHook(() => useRuleMetadata(mockService, false));

    // Wait a bit to ensure no auto-load
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    expect(mockService.getAllRuleMetadata).not.toHaveBeenCalled();
    expect(result.current.metadata).toBe(null);
  });

  it('should load metadata manually', async () => {
    const mockResponse = {
      success: true,
      metadata: mockMetadata,
      count: 3,
    };

    (mockService.getAllRuleMetadata as jest.Mock).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useRuleMetadata(mockService, false));

    await act(async () => {
      await result.current.loadMetadata();
    });

    expect(mockService.getAllRuleMetadata).toHaveBeenCalledTimes(1);
    expect(result.current.loading).toBe(false);
    expect(result.current.metadata).toEqual(mockMetadata);
    expect(result.current.error).toBe(null);
  });

  it('should handle metadata loading error', async () => {
    const error = new Error('Failed to load metadata');
    (mockService.getAllRuleMetadata as jest.Mock).mockRejectedValueOnce(error);

    const { result } = renderHook(() => useRuleMetadata(mockService, false));

    await act(async () => {
      await result.current.loadMetadata();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.metadata).toBe(null);
    expect(result.current.error).toBe('Failed to load metadata');
    expect(result.current.lastUpdated).toBe(null);
  });

  it('should handle unsuccessful API response', async () => {
    const mockResponse = {
      success: false,
      message: 'API error',
    };

    (mockService.getAllRuleMetadata as jest.Mock).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useRuleMetadata(mockService, false));

    await act(async () => {
      await result.current.loadMetadata();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.metadata).toBe(null);
    expect(result.current.error).toBe('API error');
  });

  it('should load single rule metadata', async () => {
    const singleRuleMetadata = mockMetadata['rule1'];
    const mockResponse = {
      success: true,
      metadata: singleRuleMetadata,
    };

    (mockService.getRuleMetadata as jest.Mock).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useRuleMetadata(mockService, false));

    let loadedMetadata: any;
    await act(async () => {
      loadedMetadata = await result.current.loadRuleMetadata('rule1');
    });

    expect(mockService.getRuleMetadata).toHaveBeenCalledWith('rule1');
    expect(loadedMetadata).toEqual(singleRuleMetadata);
  });

  it('should handle single rule metadata loading error', async () => {
    const error = new Error('Rule not found');
    (mockService.getRuleMetadata as jest.Mock).mockRejectedValueOnce(error);

    const { result } = renderHook(() => useRuleMetadata(mockService, false));

    let loadedMetadata: any;
    await act(async () => {
      loadedMetadata = await result.current.loadRuleMetadata('nonexistent-rule');
    });

    expect(loadedMetadata).toBe(null);
  });

  it('should filter metadata by tags', async () => {
    // First load metadata
    const mockResponse = {
      success: true,
      metadata: mockMetadata,
      count: 3,
    };

    (mockService.getAllRuleMetadata as jest.Mock).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useRuleMetadata(mockService, false));

    await act(async () => {
      await result.current.loadMetadata();
    });

    // Filter by tag1
    const filteredByTag1 = result.current.filterByTags(['tag1']);
    expect(Object.keys(filteredByTag1)).toEqual(['rule1', 'rule3']);

    // Filter by tag2
    const filteredByTag2 = result.current.filterByTags(['tag2']);
    expect(Object.keys(filteredByTag2)).toEqual(['rule1', 'rule2']);

    // Filter by multiple tags (OR logic)
    const filteredByMultipleTags = result.current.filterByTags(['tag1', 'tag3']);
    expect(Object.keys(filteredByMultipleTags)).toEqual(['rule1', 'rule2', 'rule3']);
  });

  it('should return empty object when filtering with no metadata', () => {
    const { result } = renderHook(() => useRuleMetadata(mockService, false));

    const filtered = result.current.filterByTags(['tag1']);
    expect(filtered).toEqual({});
  });

  it('should return empty object when filtering with empty tags', async () => {
    // First load metadata
    const mockResponse = {
      success: true,
      metadata: mockMetadata,
      count: 3,
    };

    (mockService.getAllRuleMetadata as jest.Mock).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useRuleMetadata(mockService, false));

    await act(async () => {
      await result.current.loadMetadata();
    });

    const filtered = result.current.filterByTags([]);
    expect(filtered).toEqual({});
  });

  it('should search rules by ID and tags', async () => {
    // First load metadata
    const mockResponse = {
      success: true,
      metadata: mockMetadata,
      count: 3,
    };

    (mockService.getAllRuleMetadata as jest.Mock).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useRuleMetadata(mockService, false));

    await act(async () => {
      await result.current.loadMetadata();
    });

    // Search by rule ID
    const searchById = result.current.searchRules('rule1');
    expect(Object.keys(searchById)).toEqual(['rule1']);

    // Search by tag
    const searchByTag = result.current.searchRules('tag2');
    expect(Object.keys(searchByTag)).toEqual(['rule1', 'rule2']);

    // Search with partial match
    const searchPartial = result.current.searchRules('rule');
    expect(Object.keys(searchPartial)).toEqual(['rule1', 'rule2', 'rule3']);

    // Search case insensitive
    const searchCaseInsensitive = result.current.searchRules('RULE1');
    expect(Object.keys(searchCaseInsensitive)).toEqual(['rule1']);
  });

  it('should return all metadata when searching with empty query', async () => {
    // First load metadata
    const mockResponse = {
      success: true,
      metadata: mockMetadata,
      count: 3,
    };

    (mockService.getAllRuleMetadata as jest.Mock).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useRuleMetadata(mockService, false));

    await act(async () => {
      await result.current.loadMetadata();
    });

    const searchEmpty = result.current.searchRules('');
    expect(searchEmpty).toEqual(mockMetadata);

    const searchWhitespace = result.current.searchRules('   ');
    expect(searchWhitespace).toEqual(mockMetadata);
  });

  it('should return empty object when searching with no metadata', () => {
    const { result } = renderHook(() => useRuleMetadata(mockService, false));

    const searched = result.current.searchRules('rule1');
    expect(searched).toEqual({});
  });

  it('should refresh metadata', async () => {
    const mockResponse = {
      success: true,
      metadata: mockMetadata,
      count: 3,
    };

    (mockService.getAllRuleMetadata as jest.Mock).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useRuleMetadata(mockService, false));

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockService.getAllRuleMetadata).toHaveBeenCalledTimes(1);
    expect(result.current.metadata).toEqual(mockMetadata);
  });
});
