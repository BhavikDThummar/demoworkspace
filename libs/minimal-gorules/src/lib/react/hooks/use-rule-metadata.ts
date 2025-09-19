/**
 * React hook for rule metadata management
 */

import { useState, useEffect, useCallback } from 'react';
import { ReactGoRulesService } from '../react-gorules-service.js';
import { UseRuleMetadataState } from '../interfaces.js';
import { MinimalRuleMetadata } from '../../interfaces/core.js';

/**
 * Hook for managing rule metadata with filtering capabilities
 */
export function useRuleMetadata(
  service: ReactGoRulesService,
  autoLoad = true
): UseRuleMetadataState & {
  loadMetadata: () => Promise<void>;
  loadRuleMetadata: (ruleId: string) => Promise<MinimalRuleMetadata | null>;
  filterByTags: (tags: string[]) => Record<string, MinimalRuleMetadata>;
  searchRules: (query: string) => Record<string, MinimalRuleMetadata>;
  refresh: () => Promise<void>;
} {
  const [state, setState] = useState<UseRuleMetadataState>({
    loading: false,
    metadata: null,
    error: null,
    lastUpdated: null
  });

  const loadMetadata = useCallback(async () => {
    setState((prev: UseRuleMetadataState) => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await service.getAllRuleMetadata();
      
      if (response.success && response.metadata) {
        setState({
          loading: false,
          metadata: response.metadata as Record<string, MinimalRuleMetadata>,
          error: null,
          lastUpdated: Date.now()
        });
      } else {
        setState({
          loading: false,
          metadata: null,
          error: response.message || 'Failed to load metadata',
          lastUpdated: null
        });
      }
    } catch (error) {
      setState({
        loading: false,
        metadata: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        lastUpdated: null
      });
    }
  }, [service]);

  const loadRuleMetadata = useCallback(async (ruleId: string): Promise<MinimalRuleMetadata | null> => {
    try {
      const response = await service.getRuleMetadata(ruleId);
      
      if (response.success && response.metadata) {
        return response.metadata as MinimalRuleMetadata;
      }
      return null;
    } catch (error) {
      console.error(`Failed to load metadata for rule ${ruleId}:`, error);
      return null;
    }
  }, [service]);

  const filterByTags = useCallback((tags: string[]): Record<string, MinimalRuleMetadata> => {
    if (!state.metadata || tags.length === 0) {
      return {};
    }

    const filtered: Record<string, MinimalRuleMetadata> = {};
    
    for (const [ruleId, metadata] of Object.entries(state.metadata)) {
      const hasMatchingTag = tags.some(tag => (metadata as MinimalRuleMetadata).tags.includes(tag));
      if (hasMatchingTag) {
        filtered[ruleId] = metadata as MinimalRuleMetadata;
      }
    }

    return filtered;
  }, [state.metadata]);

  const searchRules = useCallback((query: string): Record<string, MinimalRuleMetadata> => {
    if (!state.metadata || !query.trim()) {
      return state.metadata || {};
    }

    const searchTerm = query.toLowerCase().trim();
    const filtered: Record<string, MinimalRuleMetadata> = {};
    
    for (const [ruleId, metadata] of Object.entries(state.metadata)) {
      const matchesId = ruleId.toLowerCase().includes(searchTerm);
      const matchesTags = (metadata as MinimalRuleMetadata).tags.some((tag: string) => tag.toLowerCase().includes(searchTerm));
      
      if (matchesId || matchesTags) {
        filtered[ruleId] = metadata as MinimalRuleMetadata;
      }
    }

    return filtered;
  }, [state.metadata]);

  const refresh = useCallback(async () => {
    await loadMetadata();
  }, [loadMetadata]);

  // Auto-load on mount if enabled
  useEffect(() => {
    if (autoLoad) {
      loadMetadata();
    }
  }, [autoLoad, loadMetadata]);

  return {
    ...state,
    loadMetadata,
    loadRuleMetadata,
    filterByTags,
    searchRules,
    refresh
  };
}