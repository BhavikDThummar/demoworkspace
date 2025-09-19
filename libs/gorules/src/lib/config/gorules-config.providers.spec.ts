import { writeFile, unlink, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  GoRulesFileConfigProvider,
  GoRulesEnvConfigProvider,
  GoRulesMemoryConfigProvider,
  GoRulesCompositeConfigProvider,
} from './gorules-config.providers.js';
import { GoRulesConfig } from './gorules-config.interface.js';

describe('GoRulesFileConfigProvider', () => {
  let provider: GoRulesFileConfigProvider;
  let tempFilePath: string;
  let tempDir: string;

  const testConfig: GoRulesConfig = {
    apiUrl: 'https://test.gorules.io',
    apiKey: 'test-api-key',
    projectId: 'test-project-id',
    timeout: 5000,
    retryAttempts: 2,
    enableLogging: true,
  };

  beforeEach(async () => {
    tempDir = join(tmpdir(), 'gorules-test-' + Date.now());
    await mkdir(tempDir, { recursive: true });
    tempFilePath = join(tempDir, 'config.json');
    provider = new GoRulesFileConfigProvider(tempFilePath);
  });

  afterEach(async () => {
    try {
      await unlink(tempFilePath);
    } catch {
      // File might not exist
    }
  });

  describe('save and load', () => {
    it('should save and load configuration', async () => {
      await provider.save(testConfig);
      const loadedConfig = await provider.load();

      expect(loadedConfig).toEqual(testConfig);
    });

    it('should throw error when loading non-existent file', async () => {
      await expect(provider.load()).rejects.toThrow('Failed to load configuration');
    });

    it('should throw error when loading invalid JSON', async () => {
      await writeFile(tempFilePath, 'invalid json', 'utf-8');
      await expect(provider.load()).rejects.toThrow('Failed to load configuration');
    });
  });

  describe('exists', () => {
    it('should return false for non-existent file', async () => {
      const exists = await provider.exists();
      expect(exists).toBe(false);
    });

    it('should return true for existing file', async () => {
      await provider.save(testConfig);
      const exists = await provider.exists();
      expect(exists).toBe(true);
    });
  });

  describe('watch', () => {
    it('should create a watcher', () => {
      const watcher = provider.watch();
      expect(watcher).toBeDefined();
      expect(typeof watcher.start).toBe('function');
      expect(typeof watcher.stop).toBe('function');
    });
  });
});

describe('GoRulesEnvConfigProvider', () => {
  let provider: GoRulesEnvConfigProvider;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    provider = new GoRulesEnvConfigProvider();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('load', () => {
    it('should load configuration from environment variables', async () => {
      process.env['GORULES_API_URL'] = 'https://env.gorules.io';
      process.env['GORULES_API_KEY'] = 'env-api-key';
      process.env['GORULES_PROJECT_ID'] = 'env-project-id';
      process.env['GORULES_TIMEOUT'] = '15000';
      process.env['GORULES_RETRY_ATTEMPTS'] = '5';
      process.env['GORULES_ENABLE_LOGGING'] = 'true';

      const config = await provider.load();

      expect(config).toEqual({
        apiUrl: 'https://env.gorules.io',
        apiKey: 'env-api-key',
        projectId: 'env-project-id',
        timeout: 15000,
        retryAttempts: 5,
        enableLogging: true,
      });
    });

    it('should use default values when environment variables are not set', async () => {
      process.env['GORULES_API_KEY'] = 'required-key';
      process.env['GORULES_PROJECT_ID'] = 'required-project';

      const config = await provider.load();

      expect(config.apiUrl).toBe('https://triveni.gorules.io');
      expect(config.timeout).toBeUndefined();
      expect(config.retryAttempts).toBeUndefined();
      expect(config.enableLogging).toBeUndefined();
    });

    it('should throw error for missing required environment variables', async () => {
      delete process.env['GORULES_API_KEY'];
      delete process.env['GORULES_PROJECT_ID'];

      await expect(provider.load()).rejects.toThrow(
        'Environment variable GORULES_API_KEY is required',
      );
    });

    it('should throw error for invalid number values', async () => {
      process.env['GORULES_API_KEY'] = 'test-key';
      process.env['GORULES_PROJECT_ID'] = 'test-project';
      process.env['GORULES_TIMEOUT'] = 'not-a-number';

      await expect(provider.load()).rejects.toThrow('must be a valid number');
    });
  });

  describe('save', () => {
    it('should throw error when trying to save', async () => {
      const config: GoRulesConfig = {
        apiUrl: 'https://test.gorules.io',
        apiKey: 'test-key',
        projectId: 'test-project',
      };

      await expect(provider.save(config)).rejects.toThrow(
        'Saving configuration to environment variables is not supported',
      );
    });
  });

  describe('exists', () => {
    it('should return true when required environment variables exist', async () => {
      process.env['GORULES_API_KEY'] = 'test-key';
      process.env['GORULES_PROJECT_ID'] = 'test-project';

      const exists = await provider.exists();
      expect(exists).toBe(true);
    });

    it('should return false when required environment variables are missing', async () => {
      delete process.env['GORULES_API_KEY'];
      delete process.env['GORULES_PROJECT_ID'];

      const exists = await provider.exists();
      expect(exists).toBe(false);
    });
  });

  describe('custom prefix', () => {
    it('should use custom environment variable prefix', async () => {
      const customProvider = new GoRulesEnvConfigProvider('CUSTOM_');

      process.env['CUSTOM_API_KEY'] = 'custom-key';
      process.env['CUSTOM_PROJECT_ID'] = 'custom-project';

      const config = await customProvider.load();

      expect(config.apiKey).toBe('custom-key');
      expect(config.projectId).toBe('custom-project');
    });
  });
});

describe('GoRulesMemoryConfigProvider', () => {
  let provider: GoRulesMemoryConfigProvider;

  const testConfig: GoRulesConfig = {
    apiUrl: 'https://memory.gorules.io',
    apiKey: 'memory-api-key',
    projectId: 'memory-project-id',
    timeout: 10000,
    retryAttempts: 1,
    enableLogging: false,
  };

  beforeEach(() => {
    provider = new GoRulesMemoryConfigProvider();
  });

  describe('save and load', () => {
    it('should save and load configuration from memory', async () => {
      await provider.save(testConfig);
      const loadedConfig = await provider.load();

      expect(loadedConfig).toEqual(testConfig);
    });

    it('should throw error when loading without saving first', async () => {
      await expect(provider.load()).rejects.toThrow('No configuration stored in memory');
    });

    it('should return a copy of the configuration', async () => {
      await provider.save(testConfig);
      const loadedConfig = await provider.load();

      // Modify the loaded config
      loadedConfig.timeout = 99999;

      // Original should be unchanged
      const loadedAgain = await provider.load();
      expect(loadedAgain.timeout).toBe(testConfig.timeout);
    });
  });

  describe('exists', () => {
    it('should return false when no configuration is stored', async () => {
      const exists = await provider.exists();
      expect(exists).toBe(false);
    });

    it('should return true when configuration is stored', async () => {
      await provider.save(testConfig);
      const exists = await provider.exists();
      expect(exists).toBe(true);
    });
  });

  describe('initial configuration', () => {
    it('should accept initial configuration in constructor', async () => {
      const providerWithInitial = new GoRulesMemoryConfigProvider(testConfig);
      const exists = await providerWithInitial.exists();
      const config = await providerWithInitial.load();

      expect(exists).toBe(true);
      expect(config).toEqual(testConfig);
    });
  });
});

describe('GoRulesCompositeConfigProvider', () => {
  let fileProvider: GoRulesFileConfigProvider;
  let memoryProvider: GoRulesMemoryConfigProvider;
  let envProvider: GoRulesEnvConfigProvider;
  let compositeProvider: GoRulesCompositeConfigProvider;
  let tempFilePath: string;

  const testConfig: GoRulesConfig = {
    apiUrl: 'https://composite.gorules.io',
    apiKey: 'composite-api-key',
    projectId: 'composite-project-id',
    timeout: 20000,
    retryAttempts: 4,
    enableLogging: true,
  };

  beforeEach(async () => {
    tempFilePath = join(tmpdir(), 'composite-config-' + Date.now() + '.json');
    fileProvider = new GoRulesFileConfigProvider(tempFilePath);
    memoryProvider = new GoRulesMemoryConfigProvider();
    envProvider = new GoRulesEnvConfigProvider();

    compositeProvider = new GoRulesCompositeConfigProvider([
      memoryProvider,
      fileProvider,
      envProvider,
    ]);
  });

  afterEach(async () => {
    try {
      await unlink(tempFilePath);
    } catch {
      // File might not exist
    }
  });

  describe('load', () => {
    it('should load from first available provider', async () => {
      await memoryProvider.save(testConfig);

      const config = await compositeProvider.load();
      expect(config).toEqual(testConfig);
    });

    it('should try next provider if first fails', async () => {
      await fileProvider.save(testConfig);

      const config = await compositeProvider.load();
      expect(config).toEqual(testConfig);
    });

    it('should throw error if no provider can load', async () => {
      await expect(compositeProvider.load()).rejects.toThrow(
        'No configuration provider was able to load configuration',
      );
    });
  });

  describe('save', () => {
    it('should save using first available provider', async () => {
      await compositeProvider.save(testConfig);

      // Should have saved to memory provider (first in list)
      const memoryExists = await memoryProvider.exists();
      expect(memoryExists).toBe(true);
    });
  });

  describe('exists', () => {
    it('should return true if any provider has configuration', async () => {
      await fileProvider.save(testConfig);

      const exists = await compositeProvider.exists();
      expect(exists).toBe(true);
    });

    it('should return false if no provider has configuration', async () => {
      const exists = await compositeProvider.exists();
      expect(exists).toBe(false);
    });
  });
});
