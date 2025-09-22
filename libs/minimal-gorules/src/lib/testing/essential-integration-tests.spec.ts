/**
 * Essential Integration Tests for Hybrid Rule Loading
 * Basic end-to-end tests for critical functionality
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { RuleLoaderFactory } from '../loader/rule-loader-factory.js';
import { CloudRuleLoaderService } from '../loader/cloud-rule-loader-service.js';
import { MinimalGoRulesConfig } from '../interfaces/index.js';
import { MinimalGoRulesError } from '../errors/index.js';

// Mock fetch for cloud tests
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('Essential Integration Tests', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('Factory Integration', () => {
    it('should create appropriate loaders based on configuration', () => {
      const factory = new RuleLoaderFactory();

      const cloudConfig: MinimalGoRulesConfig = {
        ruleSource: 'cloud',
        apiUrl: 'https://api.gorules.io',
        apiKey: 'test-key',
        projectId: 'test-project'
      };

      const cloudLoader = factory.createLoader(cloudConfig);
      expect(cloudLoader).toBeInstanceOf(CloudRuleLoaderService);
    });

    it('should handle configuration validation errors', () => {
      const factory = new RuleLoaderFactory();

      const invalidConfig: MinimalGoRulesConfig = {
        ruleSource: 'cloud'
        // missing required fields
      };

      expect(() => factory.createLoader(invalidConfig)).toThrow(MinimalGoRulesError);
    });
  });

  describe('Backward Compatibility Integration', () => {
    it('should default to cloud loader when ruleSource is not specified', () => {
      const factory = new RuleLoaderFactory();

      const legacyConfig: MinimalGoRulesConfig = {
        apiUrl: 'https://api.gorules.io',
        apiKey: 'test-key',
        projectId: 'test-project'
        // no ruleSource specified
      };

      const loader = factory.createLoader(legacyConfig);
      expect(loader).toBeInstanceOf(CloudRuleLoaderService);
    });
  });

  describe('Error Handling Integration', () => {
    it('should propagate configuration errors appropriately', () => {
      const factory = new RuleLoaderFactory();

      const configs = [
        { ruleSource: 'cloud' }, // missing apiUrl
        { ruleSource: 'cloud', apiUrl: 'invalid-url' }, // missing apiKey
        { ruleSource: 'invalid' as any }, // invalid ruleSource
      ];

      configs.forEach(config => {
        expect(() => factory.createLoader(config as MinimalGoRulesConfig))
          .toThrow(MinimalGoRulesError);
      });
    });
  });
});