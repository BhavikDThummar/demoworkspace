/**
 * Unit tests for RuleLoaderFactory
 */

import { RuleLoaderFactory, IRuleLoaderFactory } from './rule-loader-factory.js';
import { CloudRuleLoaderService } from './cloud-rule-loader-service.js';
import { LocalRuleLoaderService } from './local-rule-loader-service.js';
import { MinimalGoRulesConfig } from '../interfaces/index.js';
import { MinimalGoRulesError } from '../errors/index.js';

describe('RuleLoaderFactory', () => {
  let factory: IRuleLoaderFactory;

  beforeEach(() => {
    factory = new RuleLoaderFactory();
  });

  describe('createLoader', () => {
    describe('cloud rule source', () => {
      it('should create CloudRuleLoaderService when ruleSource is "cloud"', () => {
        const config: MinimalGoRulesConfig = {
          ruleSource: 'cloud',
          apiUrl: 'https://api.gorules.io',
          apiKey: 'test-api-key',
          projectId: 'test-project-id',
        };

        const loader = factory.createLoader(config);

        expect(loader).toBeInstanceOf(CloudRuleLoaderService);
      });

      it('should create CloudRuleLoaderService when ruleSource is not specified (default)', () => {
        const config: MinimalGoRulesConfig = {
          apiUrl: 'https://api.gorules.io',
          apiKey: 'test-api-key',
          projectId: 'test-project-id',
        };

        const loader = factory.createLoader(config);

        expect(loader).toBeInstanceOf(CloudRuleLoaderService);
      });

      it('should throw error when cloud config is missing apiUrl', () => {
        const config: MinimalGoRulesConfig = {
          ruleSource: 'cloud',
          apiKey: 'test-api-key',
          projectId: 'test-project-id',
        };

        expect(() => factory.createLoader(config)).toThrow(MinimalGoRulesError);
        expect(() => factory.createLoader(config)).toThrow('Missing required cloud configuration: apiUrl');
      });

      it('should throw error when cloud config is missing apiKey', () => {
        const config: MinimalGoRulesConfig = {
          ruleSource: 'cloud',
          apiUrl: 'https://api.gorules.io',
          projectId: 'test-project-id',
        };

        expect(() => factory.createLoader(config)).toThrow(MinimalGoRulesError);
        expect(() => factory.createLoader(config)).toThrow('Missing required cloud configuration: apiKey');
      });

      it('should throw error when cloud config is missing projectId', () => {
        const config: MinimalGoRulesConfig = {
          ruleSource: 'cloud',
          apiUrl: 'https://api.gorules.io',
          apiKey: 'test-api-key',
        };

        expect(() => factory.createLoader(config)).toThrow(MinimalGoRulesError);
        expect(() => factory.createLoader(config)).toThrow('Missing required cloud configuration: projectId');
      });

      it('should throw error when cloud config is missing multiple fields', () => {
        const config: MinimalGoRulesConfig = {
          ruleSource: 'cloud',
        };

        expect(() => factory.createLoader(config)).toThrow(MinimalGoRulesError);
        expect(() => factory.createLoader(config)).toThrow('Missing required cloud configuration: apiUrl, apiKey, projectId');
      });
    });

    describe('local rule source', () => {
      it('should create LocalRuleLoaderService when ruleSource is "local"', () => {
        const config: MinimalGoRulesConfig = {
          ruleSource: 'local',
          localRulesPath: 'libs/minimal-gorules/test-rules',
        };

        const loader = factory.createLoader(config);

        expect(loader).toBeInstanceOf(LocalRuleLoaderService);
      });

      it('should throw error when local config is missing localRulesPath', () => {
        const config: MinimalGoRulesConfig = {
          ruleSource: 'local',
        };

        expect(() => factory.createLoader(config)).toThrow(MinimalGoRulesError);
        expect(() => factory.createLoader(config)).toThrow('localRulesPath is required when ruleSource is "local"');
      });

      it('should create LocalRuleLoaderService with optional hot reload enabled', () => {
        const config: MinimalGoRulesConfig = {
          ruleSource: 'local',
          localRulesPath: 'libs/minimal-gorules/test-rules',
          enableHotReload: true,
        };

        const loader = factory.createLoader(config);

        expect(loader).toBeInstanceOf(LocalRuleLoaderService);
      });

      it('should create LocalRuleLoaderService with file system options', () => {
        const config: MinimalGoRulesConfig = {
          ruleSource: 'local',
          localRulesPath: 'libs/minimal-gorules/test-rules',
          fileSystemOptions: {
            recursive: true,
            watchOptions: {
              ignored: '*.tmp',
              persistent: true,
            },
          },
        };

        const loader = factory.createLoader(config);

        expect(loader).toBeInstanceOf(LocalRuleLoaderService);
      });
    });

    describe('invalid rule source', () => {
      it('should throw error for invalid ruleSource', () => {
        const config: MinimalGoRulesConfig = {
          ruleSource: 'invalid' as any,
          localRulesPath: 'libs/minimal-gorules/test-rules',
        };

        expect(() => factory.createLoader(config)).toThrow(MinimalGoRulesError);
        expect(() => factory.createLoader(config)).toThrow('Invalid rule source: invalid. Must be \'cloud\' or \'local\'');
      });
    });

    describe('backward compatibility', () => {
      it('should default to cloud when ruleSource is undefined', () => {
        const config: MinimalGoRulesConfig = {
          apiUrl: 'https://api.gorules.io',
          apiKey: 'test-api-key',
          projectId: 'test-project-id',
        };

        const loader = factory.createLoader(config);

        expect(loader).toBeInstanceOf(CloudRuleLoaderService);
      });

      it('should work with existing cloud configurations', () => {
        const config: MinimalGoRulesConfig = {
          apiUrl: 'https://api.gorules.io',
          apiKey: 'test-api-key',
          projectId: 'test-project-id',
          httpTimeout: 10000,
          cacheMaxSize: 500,
        };

        const loader = factory.createLoader(config);

        expect(loader).toBeInstanceOf(CloudRuleLoaderService);
      });
    });
  });

  describe('configuration validation', () => {
    it('should validate cloud configuration with all required fields', () => {
      const config: MinimalGoRulesConfig = {
        ruleSource: 'cloud',
        apiUrl: 'https://api.gorules.io',
        apiKey: 'test-api-key',
        projectId: 'test-project-id',
      };

      expect(() => factory.createLoader(config)).not.toThrow();
    });

    it('should validate local configuration with all required fields', () => {
      const config: MinimalGoRulesConfig = {
        ruleSource: 'local',
        localRulesPath: 'libs/minimal-gorules/test-rules',
      };

      expect(() => factory.createLoader(config)).not.toThrow();
    });

    it('should handle mixed configuration gracefully', () => {
      // Config with both cloud and local settings - should use ruleSource to determine
      const config: MinimalGoRulesConfig = {
        ruleSource: 'local',
        localRulesPath: 'libs/minimal-gorules/test-rules',
        apiUrl: 'https://api.gorules.io', // This should be ignored for local
        apiKey: 'test-api-key', // This should be ignored for local
        projectId: 'test-project-id', // This should be ignored for local
      };

      const loader = factory.createLoader(config);

      expect(loader).toBeInstanceOf(LocalRuleLoaderService);
    });
  });

  describe('factory interface compliance', () => {
    it('should implement IRuleLoaderFactory interface', () => {
      expect(factory).toHaveProperty('createLoader');
      expect(typeof factory.createLoader).toBe('function');
    });

    it('should return IRuleLoaderService compliant objects', () => {
      const cloudConfig: MinimalGoRulesConfig = {
        ruleSource: 'cloud',
        apiUrl: 'https://api.gorules.io',
        apiKey: 'test-api-key',
        projectId: 'test-project-id',
      };

      const localConfig: MinimalGoRulesConfig = {
        ruleSource: 'local',
        localRulesPath: 'libs/minimal-gorules/test-rules',
      };

      const cloudLoader = factory.createLoader(cloudConfig);
      const localLoader = factory.createLoader(localConfig);

      // Check that both loaders implement the required interface methods
      expect(cloudLoader).toHaveProperty('loadAllRules');
      expect(cloudLoader).toHaveProperty('loadRule');
      expect(cloudLoader).toHaveProperty('checkVersions');
      expect(cloudLoader).toHaveProperty('refreshRule');

      expect(localLoader).toHaveProperty('loadAllRules');
      expect(localLoader).toHaveProperty('loadRule');
      expect(localLoader).toHaveProperty('checkVersions');
      expect(localLoader).toHaveProperty('refreshRule');

      expect(typeof cloudLoader.loadAllRules).toBe('function');
      expect(typeof cloudLoader.loadRule).toBe('function');
      expect(typeof cloudLoader.checkVersions).toBe('function');
      expect(typeof cloudLoader.refreshRule).toBe('function');

      expect(typeof localLoader.loadAllRules).toBe('function');
      expect(typeof localLoader.loadRule).toBe('function');
      expect(typeof localLoader.checkVersions).toBe('function');
      expect(typeof localLoader.refreshRule).toBe('function');
    });
  });
});