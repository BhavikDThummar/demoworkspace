/**
 * Unit tests for ConfigValidator
 */

import { ConfigValidator } from './config-validator.js';
import { MinimalGoRulesConfig } from '../interfaces/config.js';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('ConfigValidator', () => {
  let tempDir: string;

  beforeEach(() => {
    // Create a temporary directory for testing
    tempDir = join(tmpdir(), `gorules-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up temporary directory
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('validateHybridConfig', () => {
    describe('cloud configuration', () => {
      it('should validate valid cloud configuration', () => {
        const config: MinimalGoRulesConfig = {
          ruleSource: 'cloud',
          apiUrl: 'https://api.gorules.io',
          apiKey: 'test-api-key',
          projectId: 'test-project-id',
        };

        const result = ConfigValidator.validateHybridConfig(config);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should default to cloud when ruleSource is not specified', () => {
        const config: MinimalGoRulesConfig = {
          apiUrl: 'https://api.gorules.io',
          apiKey: 'test-api-key',
          projectId: 'test-project-id',
        };

        const result = ConfigValidator.validateHybridConfig(config);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should require apiUrl for cloud configuration', () => {
        const config: MinimalGoRulesConfig = {
          ruleSource: 'cloud',
          apiKey: 'test-api-key',
          projectId: 'test-project-id',
        };

        const result = ConfigValidator.validateHybridConfig(config);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('apiUrl is required when ruleSource is "cloud"');
      });

      it('should require valid URL for apiUrl', () => {
        const config: MinimalGoRulesConfig = {
          ruleSource: 'cloud',
          apiUrl: 'invalid-url',
          apiKey: 'test-api-key',
          projectId: 'test-project-id',
        };

        const result = ConfigValidator.validateHybridConfig(config);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('apiUrl must be a valid URL');
      });

      it('should require apiKey for cloud configuration', () => {
        const config: MinimalGoRulesConfig = {
          ruleSource: 'cloud',
          apiUrl: 'https://api.gorules.io',
          projectId: 'test-project-id',
        };

        const result = ConfigValidator.validateHybridConfig(config);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('apiKey is required when ruleSource is "cloud"');
      });

      it('should require non-empty apiKey', () => {
        const config: MinimalGoRulesConfig = {
          ruleSource: 'cloud',
          apiUrl: 'https://api.gorules.io',
          apiKey: '   ',
          projectId: 'test-project-id',
        };

        const result = ConfigValidator.validateHybridConfig(config);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('apiKey must be a non-empty string');
      });

      it('should require projectId for cloud configuration', () => {
        const config: MinimalGoRulesConfig = {
          ruleSource: 'cloud',
          apiUrl: 'https://api.gorules.io',
          apiKey: 'test-api-key',
        };

        const result = ConfigValidator.validateHybridConfig(config);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('projectId is required when ruleSource is "cloud"');
      });
    });

    describe('local configuration', () => {
      it('should validate valid local configuration', () => {
        const config: MinimalGoRulesConfig = {
          ruleSource: 'local',
          localRulesPath: tempDir,
        };

        const result = ConfigValidator.validateHybridConfig(config);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should require localRulesPath for local configuration', () => {
        const config: MinimalGoRulesConfig = {
          ruleSource: 'local',
        };

        const result = ConfigValidator.validateHybridConfig(config);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('localRulesPath is required when ruleSource is "local"');
      });

      it('should require non-empty localRulesPath', () => {
        const config: MinimalGoRulesConfig = {
          ruleSource: 'local',
          localRulesPath: '   ',
        };

        const result = ConfigValidator.validateHybridConfig(config);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('localRulesPath must be a non-empty string');
      });

      it('should validate that localRulesPath exists', () => {
        const config: MinimalGoRulesConfig = {
          ruleSource: 'local',
          localRulesPath: '/non/existent/path',
        };

        const result = ConfigValidator.validateHybridConfig(config);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('localRulesPath does not exist: /non/existent/path');
      });

      it('should validate that localRulesPath is a directory', () => {
        const filePath = join(tempDir, 'test-file.txt');
        writeFileSync(filePath, 'test content');

        const config: MinimalGoRulesConfig = {
          ruleSource: 'local',
          localRulesPath: filePath,
        };

        const result = ConfigValidator.validateHybridConfig(config);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(`localRulesPath must be a directory: ${filePath}`);
      });

      it('should validate enableHotReload is boolean', () => {
        const config: MinimalGoRulesConfig = {
          ruleSource: 'local',
          localRulesPath: tempDir,
          enableHotReload: 'true' as any,
        };

        const result = ConfigValidator.validateHybridConfig(config);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('enableHotReload must be a boolean');
      });

      it('should validate metadataFilePattern is non-empty string', () => {
        const config: MinimalGoRulesConfig = {
          ruleSource: 'local',
          localRulesPath: tempDir,
          metadataFilePattern: '',
        };

        const result = ConfigValidator.validateHybridConfig(config);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('metadataFilePattern cannot be empty');
      });
    });

    describe('invalid rule source', () => {
      it('should reject invalid ruleSource', () => {
        const config: MinimalGoRulesConfig = {
          ruleSource: 'invalid' as any,
        };

        const result = ConfigValidator.validateHybridConfig(config);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain("Invalid ruleSource: invalid. Must be 'cloud' or 'local'");
      });
    });

    describe('common configuration validation', () => {
      it('should validate cacheMaxSize is positive integer', () => {
        const config: MinimalGoRulesConfig = {
          ruleSource: 'local',
          localRulesPath: tempDir,
          cacheMaxSize: -1,
        };

        const result = ConfigValidator.validateHybridConfig(config);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('cacheMaxSize must be a positive integer');
      });

      it('should validate httpTimeout is positive integer', () => {
        const config: MinimalGoRulesConfig = {
          ruleSource: 'local',
          localRulesPath: tempDir,
          httpTimeout: 0,
        };

        const result = ConfigValidator.validateHybridConfig(config);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('httpTimeout must be a positive integer');
      });

      it('should validate platform is valid value', () => {
        const config: MinimalGoRulesConfig = {
          ruleSource: 'local',
          localRulesPath: tempDir,
          platform: 'invalid' as any,
        };

        const result = ConfigValidator.validateHybridConfig(config);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('platform must be "node" or "browser"');
      });

      it('should validate memory thresholds are between 0 and 1', () => {
        const config: MinimalGoRulesConfig = {
          ruleSource: 'local',
          localRulesPath: tempDir,
          memoryWarningThreshold: 1.5,
          memoryCriticalThreshold: -0.1,
        };

        const result = ConfigValidator.validateHybridConfig(config);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('memoryWarningThreshold must be a number between 0 and 1');
        expect(result.errors).toContain('memoryCriticalThreshold must be a number between 0 and 1');
      });

      it('should validate warning threshold is less than critical threshold', () => {
        const config: MinimalGoRulesConfig = {
          ruleSource: 'local',
          localRulesPath: tempDir,
          memoryWarningThreshold: 0.9,
          memoryCriticalThreshold: 0.8,
        };

        const result = ConfigValidator.validateHybridConfig(config);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          'memoryWarningThreshold must be less than memoryCriticalThreshold',
        );
      });
    });
  });

  describe('createDefaultCloudConfig', () => {
    it('should create valid default cloud configuration', () => {
      const config = ConfigValidator.createDefaultCloudConfig(
        'https://api.gorules.io',
        'test-api-key',
        'test-project-id',
      );

      expect(config.ruleSource).toBe('cloud');
      expect(config.apiUrl).toBe('https://api.gorules.io');
      expect(config.apiKey).toBe('test-api-key');
      expect(config.projectId).toBe('test-project-id');
      expect(config.cacheMaxSize).toBe(1000);
      expect(config.httpTimeout).toBe(5000);

      const result = ConfigValidator.validateHybridConfig(config);
      expect(result.isValid).toBe(true);
    });
  });

  describe('createDefaultLocalConfig', () => {
    it('should create valid default local configuration', () => {
      const config = ConfigValidator.createDefaultLocalConfig(tempDir);

      expect(config.ruleSource).toBe('local');
      expect(config.localRulesPath).toBe(tempDir);
      expect(config.enableHotReload).toBe(false);
      expect(config.metadataFilePattern).toBe('.meta.json');
      expect(config.fileSystemOptions?.recursive).toBe(true);

      const result = ConfigValidator.validateHybridConfig(config);
      expect(result.isValid).toBe(true);
    });
  });
});
