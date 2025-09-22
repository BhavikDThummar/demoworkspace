/**
 * Essential Core Tests for Hybrid Rule Loading
 * Focused tests for the most critical functionality
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { RuleLoaderFactory } from '../loader/rule-loader-factory.js';
import { LocalRuleLoaderService } from '../loader/local-rule-loader-service.js';
import { CloudRuleLoaderService } from '../loader/cloud-rule-loader-service.js';
import { MinimalGoRulesConfig } from '../interfaces/index.js';
import { MinimalGoRulesError } from '../errors/index.js';

describe('Essential Core Tests', () => {
  describe('RuleLoaderFactory Core Functionality', () => {
    let factory: RuleLoaderFactory;

    beforeEach(() => {
      factory = new RuleLoaderFactory();
    });

    it('should create CloudRuleLoaderService for cloud configuration', () => {
      const config: MinimalGoRulesConfig = {
        ruleSource: 'cloud',
        apiUrl: 'https://api.gorules.io',
        apiKey: 'test-key',
        projectId: 'test-project'
      };

      const loader = factory.createLoader(config);
      expect(loader).toBeInstanceOf(CloudRuleLoaderService);
    });

    it('should default to cloud when ruleSource is not specified', () => {
      const config: MinimalGoRulesConfig = {
        apiUrl: 'https://api.gorules.io',
        apiKey: 'test-key',
        projectId: 'test-project'
      };

      const loader = factory.createLoader(config);
      expect(loader).toBeInstanceOf(CloudRuleLoaderService);
    });

    it('should throw error for invalid ruleSource', () => {
      const config: MinimalGoRulesConfig = {
        ruleSource: 'invalid' as any,
        apiUrl: 'https://api.gorules.io'
      };

      expect(() => factory.createLoader(config)).toThrow(MinimalGoRulesError);
    });
  });

  describe('Configuration Validation Core', () => {
    it('should validate required fields for cloud configuration', () => {
      const invalidConfigs = [
        { ruleSource: 'cloud' }, // missing apiUrl
        { ruleSource: 'cloud', apiUrl: 'https://api.gorules.io' }, // missing apiKey
        { ruleSource: 'cloud', apiUrl: 'https://api.gorules.io', apiKey: 'key' }, // missing projectId
      ];

      invalidConfigs.forEach(config => {
        expect(() => new RuleLoaderFactory().createLoader(config as MinimalGoRulesConfig))
          .toThrow(MinimalGoRulesError);
      });
    });

    it('should accept valid cloud configurations', () => {
      const validCloudConfig: MinimalGoRulesConfig = {
        ruleSource: 'cloud',
        apiUrl: 'https://api.gorules.io',
        apiKey: 'test-key',
        projectId: 'test-project'
      };

      expect(() => new RuleLoaderFactory().createLoader(validCloudConfig)).not.toThrow();
    });
  });

  describe('Error Handling Core', () => {
    it('should create appropriate error types', () => {
      const fileNotFoundError = MinimalGoRulesError.fileNotFound('/test/path');
      expect(fileNotFoundError).toBeInstanceOf(MinimalGoRulesError);
      expect(fileNotFoundError.code).toBe('FILE_NOT_FOUND');
      expect(fileNotFoundError.message).toContain('/test/path');
    });

    it('should preserve error context', () => {
      const originalError = new Error('Original message');
      const wrappedError = MinimalGoRulesError.fileSystemError('File operation failed', originalError);
      
      expect(wrappedError.originalError).toBe(originalError);
      expect(wrappedError.message).toContain('File operation failed');
    });
  });
});