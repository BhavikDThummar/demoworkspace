/**
 * React component for viewing rule metadata
 */

import { useState, useMemo } from 'react';
import { RuleMetadataViewerProps } from '../interfaces.js';
import { useGoRulesContext } from './GoRulesProvider.js';
import { useRuleMetadata } from '../hooks/use-rule-metadata.js';
import { MinimalRuleMetadata } from '../../interfaces/core.js';

/**
 * Component for viewing and managing rule metadata
 */
export function RuleMetadataViewer({
  ruleId,
  showAll = true,
  filterTags = [],
  className = '',
  onRuleSelect,
}: RuleMetadataViewerProps) {
  const service = useGoRulesContext();
  const { loading, metadata, error, loadMetadata, filterByTags, searchRules } = useRuleMetadata(
    service,
    showAll,
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>(filterTags);

  // Get filtered metadata based on search and tags
  const filteredMetadata = useMemo(() => {
    if (!metadata) return {};

    let filtered = metadata;

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = searchRules(searchQuery);
    }

    // Apply tag filter
    if (selectedTags.length > 0) {
      const tagFiltered = filterByTags(selectedTags);
      // Intersect with search results
      const intersection: Record<string, MinimalRuleMetadata> = {};
      for (const [id, meta] of Object.entries(filtered)) {
        if (tagFiltered[id]) {
          intersection[id] = meta;
        }
      }
      filtered = intersection;
    }

    // If showing specific rule, filter to just that rule
    if (ruleId && filtered[ruleId]) {
      return { [ruleId]: filtered[ruleId] };
    }

    return filtered;
  }, [metadata, searchQuery, selectedTags, ruleId, searchRules, filterByTags]);

  // Get all available tags
  const allTags = useMemo(() => {
    if (!metadata) return [];

    const tagSet = new Set<string>();
    Object.values(metadata).forEach((meta) => {
      meta.tags.forEach((tag) => tagSet.add(tag));
    });

    return Array.from(tagSet).sort();
  }, [metadata]);

  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleRuleClick = (ruleId: string, metadata: MinimalRuleMetadata) => {
    if (onRuleSelect) {
      onRuleSelect(ruleId, metadata);
    }
  };

  return (
    <div
      className={`rule-metadata-viewer ${className}`}
      style={{ padding: '16px', border: '1px solid #ddd', borderRadius: '4px' }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <h3 style={{ margin: 0 }}>{ruleId ? `Rule: ${ruleId}` : 'Rule Metadata'}</h3>
        <button
          onClick={loadMetadata}
          disabled={loading}
          style={{
            padding: '4px 8px',
            backgroundColor: loading ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '12px',
          }}
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div
          style={{
            color: 'red',
            marginBottom: '16px',
            padding: '8px',
            backgroundColor: '#f8d7da',
            borderRadius: '4px',
          }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}

      {showAll && !ruleId && (
        <div style={{ marginBottom: '16px' }}>
          {/* Search */}
          <div style={{ marginBottom: '12px' }}>
            <input
              type="text"
              placeholder="Search rules by ID or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            />
          </div>

          {/* Tag Filter */}
          {allTags.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>
                Filter by Tags:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => handleTagToggle(tag)}
                    style={{
                      padding: '4px 8px',
                      fontSize: '12px',
                      border: '1px solid #ddd',
                      borderRadius: '12px',
                      backgroundColor: selectedTags.includes(tag) ? '#007bff' : 'white',
                      color: selectedTags.includes(tag) ? 'white' : '#333',
                      cursor: 'pointer',
                    }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
          Loading metadata...
        </div>
      )}

      {!loading && metadata && Object.keys(filteredMetadata).length === 0 && (
        <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
          No rules found matching the current filters.
        </div>
      )}

      {!loading && filteredMetadata && Object.keys(filteredMetadata).length > 0 && (
        <div>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>
            Showing {Object.keys(filteredMetadata).length} rule(s)
          </div>

          <div style={{ display: 'grid', gap: '12px' }}>
            {Object.entries(filteredMetadata).map(([id, meta]) => (
              <div
                key={id}
                style={{
                  border: '1px solid #eee',
                  borderRadius: '4px',
                  padding: '12px',
                  backgroundColor: '#f9f9f9',
                  cursor: onRuleSelect ? 'pointer' : 'default',
                }}
                onClick={() => handleRuleClick(id, meta)}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr',
                    gap: '8px',
                    fontSize: '14px',
                  }}
                >
                  <span style={{ fontWeight: 'bold' }}>ID:</span>
                  <span style={{ fontFamily: 'monospace' }}>{id}</span>

                  <span style={{ fontWeight: 'bold' }}>Version:</span>
                  <span>{meta.version}</span>

                  <span style={{ fontWeight: 'bold' }}>Last Modified:</span>
                  <span>{formatTimestamp(meta.lastModified)}</span>

                  <span style={{ fontWeight: 'bold' }}>Tags:</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {meta.tags.length > 0 ? (
                      meta.tags.map((tag) => (
                        <span
                          key={tag}
                          style={{
                            padding: '2px 6px',
                            fontSize: '11px',
                            backgroundColor: '#007bff',
                            color: 'white',
                            borderRadius: '8px',
                          }}
                        >
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span style={{ color: '#666', fontStyle: 'italic' }}>No tags</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && !metadata && !error && (
        <div style={{ textAlign: 'center', color: '#666' }}>No metadata available</div>
      )}
    </div>
  );
}
