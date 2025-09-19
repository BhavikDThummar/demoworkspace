/**
 * Unit tests for useRuleExecution hook
 */

import { renderHook, act } from '@testing-library/react';
import { useRuleExecution } from './use-rule-execution.js';
import { ReactGoRulesService } from '../react-gorules-service.js';

// Mock ReactGoRulesService
const mockService = {
  executeRule: jest.fn(),
  executeByIds: jest.fn(),
  executeByTags: jest.fn(),
  execute: jest.fn(),
} as unknown as ReactGoRulesService;

describe('useRuleExecution', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useRuleExecution(mockService));

    expect(result.current.loading).toBe(false);
    expect(result.current.results).toBe(null);
    expect(result.current.executionTime).toBe(null);
    expect(result.current.error).toBe(null);
    expect(result.current.success).toBe(false);
  });

  it('should execute single rule successfully', async () => {
    const mockResponse = {
      success: true,
      results: { result: 'test-result' },
      executionTime: 100,
    };

    (mockService.executeRule as jest.Mock).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useRuleExecution(mockService));

    await act(async () => {
      await result.current.executeRule('test-rule', { input: 'test' });
    });

    expect(mockService.executeRule).toHaveBeenCalledWith('test-rule', { input: 'test' });
    expect(result.current.loading).toBe(false);
    expect(result.current.success).toBe(true);
    expect(result.current.results).toEqual({ result: 'test-result' });
    expect(result.current.executionTime).toBe(100);
    expect(result.current.error).toBe(null);
  });

  it('should handle single rule execution failure', async () => {
    const mockResponse = {
      success: false,
      message: 'Rule execution failed',
    };

    (mockService.executeRule as jest.Mock).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useRuleExecution(mockService));

    await act(async () => {
      await result.current.executeRule('test-rule', { input: 'test' });
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.success).toBe(false);
    expect(result.current.results).toBe(null);
    expect(result.current.error).toBe('Rule execution failed');
  });

  it('should handle single rule execution error', async () => {
    const error = new Error('Network error');
    (mockService.executeRule as jest.Mock).mockRejectedValueOnce(error);

    const { result } = renderHook(() => useRuleExecution(mockService));

    await act(async () => {
      await result.current.executeRule('test-rule', { input: 'test' });
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.success).toBe(false);
    expect(result.current.results).toBe(null);
    expect(result.current.error).toBe('Network error');
  });

  it('should execute rules by IDs successfully', async () => {
    const mockResponse = {
      success: true,
      results: { rule1: 'result1', rule2: 'result2' },
      executionTime: 150,
    };

    (mockService.executeByIds as jest.Mock).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useRuleExecution(mockService));

    await act(async () => {
      await result.current.executeByIds(['rule1', 'rule2'], { input: 'test' }, 'parallel');
    });

    expect(mockService.executeByIds).toHaveBeenCalledWith(
      ['rule1', 'rule2'],
      { input: 'test' },
      'parallel',
    );
    expect(result.current.loading).toBe(false);
    expect(result.current.success).toBe(true);
    expect(result.current.results).toEqual({ rule1: 'result1', rule2: 'result2' });
    expect(result.current.executionTime).toBe(150);
  });

  it('should execute rules by tags successfully', async () => {
    const mockResponse = {
      success: true,
      results: { rule1: 'result1' },
      executionTime: 120,
    };

    (mockService.executeByTags as jest.Mock).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useRuleExecution(mockService));

    await act(async () => {
      await result.current.executeByTags(['tag1', 'tag2'], { input: 'test' }, 'sequential');
    });

    expect(mockService.executeByTags).toHaveBeenCalledWith(
      ['tag1', 'tag2'],
      { input: 'test' },
      'sequential',
    );
    expect(result.current.loading).toBe(false);
    expect(result.current.success).toBe(true);
    expect(result.current.results).toEqual({ rule1: 'result1' });
    expect(result.current.executionTime).toBe(120);
  });

  it('should execute with generic request successfully', async () => {
    const mockResponse = {
      success: true,
      results: { rule1: 'result1' },
      executionTime: 180,
    };

    (mockService.execute as jest.Mock).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useRuleExecution(mockService));

    const request = {
      ruleIds: ['rule1'],
      input: { input: 'test' },
      mode: 'mixed' as const,
    };

    await act(async () => {
      await result.current.execute(request);
    });

    expect(mockService.execute).toHaveBeenCalledWith(request);
    expect(result.current.loading).toBe(false);
    expect(result.current.success).toBe(true);
    expect(result.current.results).toEqual({ rule1: 'result1' });
    expect(result.current.executionTime).toBe(180);
  });

  it('should reset state correctly', () => {
    const { result } = renderHook(() => useRuleExecution(mockService));

    // Set some state first
    act(() => {
      (result.current as any).setState({
        loading: false,
        results: { test: 'result' },
        executionTime: 100,
        error: 'some error',
        success: true,
      });
    });

    // Reset
    act(() => {
      result.current.reset();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.results).toBe(null);
    expect(result.current.executionTime).toBe(null);
    expect(result.current.error).toBe(null);
    expect(result.current.success).toBe(false);
  });

  it('should set loading state during execution', async () => {
    let resolvePromise: (value: any) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    (mockService.executeRule as jest.Mock).mockReturnValueOnce(promise);

    const { result } = renderHook(() => useRuleExecution(mockService));

    // Start execution
    act(() => {
      result.current.executeRule('test-rule', { input: 'test' });
    });

    // Should be loading
    expect(result.current.loading).toBe(true);

    // Resolve the promise
    await act(async () => {
      resolvePromise!({
        success: true,
        results: { result: 'test' },
        executionTime: 100,
      });
      await promise;
    });

    // Should no longer be loading
    expect(result.current.loading).toBe(false);
  });

  it('should use default mode for executeByIds', async () => {
    const mockResponse = {
      success: true,
      results: { rule1: 'result1' },
      executionTime: 100,
    };

    (mockService.executeByIds as jest.Mock).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useRuleExecution(mockService));

    await act(async () => {
      await result.current.executeByIds(['rule1'], { input: 'test' });
    });

    expect(mockService.executeByIds).toHaveBeenCalledWith(['rule1'], { input: 'test' }, 'parallel');
  });

  it('should use default mode for executeByTags', async () => {
    const mockResponse = {
      success: true,
      results: { rule1: 'result1' },
      executionTime: 100,
    };

    (mockService.executeByTags as jest.Mock).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useRuleExecution(mockService));

    await act(async () => {
      await result.current.executeByTags(['tag1'], { input: 'test' });
    });

    expect(mockService.executeByTags).toHaveBeenCalledWith(['tag1'], { input: 'test' }, 'parallel');
  });
});
