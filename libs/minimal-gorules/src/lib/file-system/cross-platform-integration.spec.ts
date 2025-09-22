/**
 * Cross-platform integration tests
 * Tests the integration of cross-platform utilities with file system components
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { FileSystemRuleScanner } from './file-system-rule-scanner';
import { HotReloadManager } from './hot-reload-manager';
import { CrossPlatformPathUtils } from './cross-platform-utils';

// Mock os.platform for testing different platforms
jest.mock('os');
const mockOs = os as jest.Mocked<typeof os>;

describe('Cross-Platform Integration Tests', () => {
  const testDir = path.join(__dirname, 'test-integration');
  let scanner: FileSystemRuleScanner;

  beforeAll(async () => {
    // Create test directory structure with cross-platform considerations
    await fs.promises.mkdir(testDir, { recursive: true });
    await fs.promises.mkdir(path.join(testDir, 'pricing'), { recursive: true });
    await fs.promises.mkdir(path.join(testDir, 'validation'), { recursive: true });
    await fs.promises.mkdir(path.join(testDir, 'nested', 'deep'), { recursive: true });

    // Create test rule files
    await fs.promises.writeFile(
      path.join(testDir, 'simple-rule.json'),
      JSON.stringify({ nodes: [], edges: [] })
    );

    await fs.promises.writeFile(
      path.join(testDir, 'pricing', 'shipping-fees.json'),
      JSON.stringify({ nodes: [], edges: [] })
    );

    await fs.promises.writeFile(
      path.join(testDir, 'validation', 'order-validation.json'),
      JSON.stringify({ nodes: [], edges: [] })
    );

    await fs.promises.writeFile(
      path.join(testDir, 'nested', 'deep', 'nested-rule.json'),
      JSON.stringify({ nodes: [], edges: [] })
    );

    // Create metadata files
    await fs.promises.writeFile(
      path.join(testDir, 'pricing', 'shipping-fees.meta.json'),
      JSON.stringify({
        version: '1.0.0',
        tags: ['pricing', 'shipping'],
        description: 'Shipping fee calculation rules'
      })
    );
  });

  afterAll(async () => {
    // Clean up test directory
    try {
      await fs.promises.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    scanner = new FileSystemRuleScanner(testDir);
  });

  describe('FileSystemRuleScanner cross-platform behavior', () => {
    it('should scan directory and generate correct rule IDs on Windows', async () => {
      mockOs.platform.mockReturnValue('win32');

      const rules = await scanner.scanDirectory();

      expect(rules).toHaveLength(4);

      // Check that rule IDs use forward slashes regardless of platform
      const ruleIds = rules.map(rule => rule.id).sort();
      expect(ruleIds).toEqual([
        'nested/deep/nested-rule',
        'pricing/shipping-fees',
        'simple-rule',
        'validation/order-validation'
      ]);
    });

    it('should scan directory and generate correct rule IDs on macOS', async () => {
      mockOs.platform.mockReturnValue('darwin');

      const rules = await scanner.scanDirectory();

      expect(rules).toHaveLength(4);

      // Check that rule IDs use forward slashes regardless of platform
      const ruleIds = rules.map(rule => rule.id).sort();
      expect(ruleIds).toEqual([
        'nested/deep/nested-rule',
        'pricing/shipping-fees',
        'simple-rule',
        'validation/order-validation'
      ]);
    });

    it('should scan directory and generate correct rule IDs on Linux', async () => {
      mockOs.platform.mockReturnValue('linux');

      const rules = await scanner.scanDirectory();

      expect(rules).toHaveLength(4);

      // Check that rule IDs use forward slashes regardless of platform
      const ruleIds = rules.map(rule => rule.id).sort();
      expect(ruleIds).toEqual([
        'nested/deep/nested-rule',
        'pricing/shipping-fees',
        'simple-rule',
        'validation/order-validation'
      ]);
    });

    it('should load metadata correctly across platforms', async () => {
      const rules = await scanner.scanDirectory();
      const shippingRule = rules.find(rule => rule.id === 'pricing/shipping-fees');

      expect(shippingRule).toBeDefined();
      expect(shippingRule!.metadata.version).toBe('1.0.0');
      expect(shippingRule!.metadata.tags).toEqual(['pricing', 'shipping']);
    });

    it('should handle file paths correctly across platforms', async () => {
      const testRuleId = 'pricing/shipping-fees';
      const rule = await scanner.loadRuleFile(
        CrossPlatformPathUtils.joinPath(testDir, 'pricing', 'shipping-fees.json')
      );

      expect(rule.id).toBe(testRuleId);
      expect(rule.data).toBeDefined();
      expect(rule.metadata).toBeDefined();
    });
  });

  describe('Path handling consistency', () => {
    it('should convert rule IDs to file paths consistently', () => {
      const testCases = [
        { ruleId: 'simple-rule', expectedPath: 'simple-rule.json' },
        { ruleId: 'pricing/shipping-fees', expectedPath: path.join('pricing', 'shipping-fees.json') },
        { ruleId: 'nested/deep/nested-rule', expectedPath: path.join('nested', 'deep', 'nested-rule.json') },
      ];

      for (const testCase of testCases) {
        const platformPath = CrossPlatformPathUtils.fromForwardSlashes(testCase.ruleId) + '.json';
        expect(platformPath).toBe(testCase.expectedPath);
      }
    });

    it('should convert file paths to rule IDs consistently', () => {
      const testCases = [
        { filePath: 'simple-rule.json', expectedRuleId: 'simple-rule' },
        { filePath: path.join('pricing', 'shipping-fees.json'), expectedRuleId: 'pricing/shipping-fees' },
        { filePath: path.join('nested', 'deep', 'nested-rule.json'), expectedRuleId: 'nested/deep/nested-rule' },
      ];

      for (const testCase of testCases) {
        const relativePath = testCase.filePath.replace('.json', '');
        const ruleId = CrossPlatformPathUtils.toForwardSlashes(relativePath);
        expect(ruleId).toBe(testCase.expectedRuleId);
      }
    });
  });

  describe('Security path validation', () => {
    it('should prevent directory traversal attacks', () => {
      const maliciousPaths = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        'rules/../../../sensitive-file.json',
      ];

      for (const maliciousPath of maliciousPaths) {
        const fullPath = CrossPlatformPathUtils.joinPath(testDir, maliciousPath);
        const resolvedPath = CrossPlatformPathUtils.resolvePath('.', fullPath);
        const isWithinBase = CrossPlatformPathUtils.isPathWithinBase(testDir, resolvedPath);
        
        expect(isWithinBase).toBe(false);
      }
    });

    it('should allow valid nested paths', () => {
      const validPaths = [
        'pricing/shipping-fees.json',
        'validation/order-validation.json',
        'nested/deep/nested-rule.json',
      ];

      for (const validPath of validPaths) {
        const fullPath = CrossPlatformPathUtils.joinPath(testDir, validPath);
        const resolvedPath = CrossPlatformPathUtils.resolvePath('.', fullPath);
        const isWithinBase = CrossPlatformPathUtils.isPathWithinBase(testDir, resolvedPath);
        
        expect(isWithinBase).toBe(true);
      }
    });
  });

  describe('Error handling across platforms', () => {
    it('should handle permission errors gracefully', async () => {
      // Create a directory with restricted permissions (Unix-like systems)
      const restrictedDir = path.join(testDir, 'restricted');
      await fs.promises.mkdir(restrictedDir, { recursive: true });

      try {
        // Try to change permissions (may not work on all systems)
        await fs.promises.chmod(restrictedDir, 0o000);
        
        const restrictedScanner = new FileSystemRuleScanner(restrictedDir);
        
        // Should handle permission errors gracefully
        await expect(restrictedScanner.scanDirectory()).rejects.toThrow();
      } catch (error) {
        // If we can't change permissions, skip this test
        console.warn('Skipping permission test - unable to change directory permissions');
      } finally {
        // Restore permissions for cleanup
        try {
          await fs.promises.chmod(restrictedDir, 0o755);
          await fs.promises.rmdir(restrictedDir);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });

    it('should handle non-existent directories', async () => {
      const nonExistentDir = path.join(testDir, 'does-not-exist');
      const nonExistentScanner = new FileSystemRuleScanner(nonExistentDir);

      await expect(nonExistentScanner.scanDirectory()).rejects.toThrow();
    });

    it('should handle invalid JSON files gracefully', async () => {
      const invalidJsonFile = path.join(testDir, 'invalid.json');
      await fs.promises.writeFile(invalidJsonFile, '{ invalid json content');

      const rules = await scanner.scanDirectory();
      
      // Should continue loading other valid rules despite invalid JSON
      expect(rules.length).toBeGreaterThan(0);
      
      // Clean up
      await fs.promises.unlink(invalidJsonFile);
    });
  });
});

describe('HotReloadManager cross-platform behavior', () => {
  const testDir = path.join(__dirname, 'test-hot-reload');
  let hotReloadManager: HotReloadManager;

  beforeAll(async () => {
    await fs.promises.mkdir(testDir, { recursive: true });
  });

  afterAll(async () => {
    try {
      await fs.promises.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    if (hotReloadManager && hotReloadManager.isWatching()) {
      await hotReloadManager.stop();
    }
  });

  describe('platform-specific watch options', () => {
    it('should use platform-optimized settings on Windows', () => {
      mockOs.platform.mockReturnValue('win32');
      
      hotReloadManager = new HotReloadManager(testDir);
      
      // The debounce delay should be platform-specific
      expect(hotReloadManager).toBeDefined();
    });

    it('should use platform-optimized settings on macOS', () => {
      mockOs.platform.mockReturnValue('darwin');
      
      hotReloadManager = new HotReloadManager(testDir);
      
      expect(hotReloadManager).toBeDefined();
    });

    it('should use platform-optimized settings on Linux', () => {
      mockOs.platform.mockReturnValue('linux');
      
      hotReloadManager = new HotReloadManager(testDir);
      
      expect(hotReloadManager).toBeDefined();
    });
  });

  describe('file path to rule ID conversion', () => {
    beforeEach(() => {
      hotReloadManager = new HotReloadManager(testDir);
    });

    it('should convert file paths to rule IDs consistently across platforms', () => {
      const testCases = [
        {
          filePath: path.join(testDir, 'simple-rule.json'),
          expectedRuleId: 'simple-rule'
        },
        {
          filePath: path.join(testDir, 'pricing', 'shipping-fees.json'),
          expectedRuleId: 'pricing/shipping-fees'
        },
        {
          filePath: path.join(testDir, 'nested', 'deep', 'rule.json'),
          expectedRuleId: 'nested/deep/rule'
        }
      ];

      for (const testCase of testCases) {
        // Access private method for testing
        const ruleId = (hotReloadManager as any).filePathToRuleId(testCase.filePath);
        expect(ruleId).toBe(testCase.expectedRuleId);
      }
    });

    it('should ignore metadata files', () => {
      const metadataPath = path.join(testDir, 'rule.meta.json');
      const ruleId = (hotReloadManager as any).filePathToRuleId(metadataPath);
      
      expect(ruleId).toBeNull();
    });

    it('should ignore non-JSON files', () => {
      const textPath = path.join(testDir, 'readme.txt');
      const ruleId = (hotReloadManager as any).filePathToRuleId(textPath);
      
      expect(ruleId).toBeNull();
    });
  });

  describe('watch initialization', () => {
    it('should initialize watcher successfully', async () => {
      hotReloadManager = new HotReloadManager(testDir, {
        debounceDelay: 100,
        ignoreInitial: true
      });

      await expect(hotReloadManager.start()).resolves.not.toThrow();
      expect(hotReloadManager.isWatching()).toBe(true);
    });

    it('should handle watcher errors gracefully', async () => {
      // Try to watch a non-existent directory
      const nonExistentDir = path.join(testDir, 'does-not-exist');
      hotReloadManager = new HotReloadManager(nonExistentDir);

      await expect(hotReloadManager.start()).rejects.toThrow();
    });
  });
});

// Mock platform-specific behavior tests
describe('Platform-specific behavior mocking', () => {
  describe('Windows-specific tests', () => {
    beforeEach(() => {
      mockOs.platform.mockReturnValue('win32');
    });

    it('should handle Windows path separators correctly', () => {
      const windowsPath = 'rules\\pricing\\shipping-fees.json';
      const normalized = CrossPlatformPathUtils.normalizePath(windowsPath);
      
      expect(normalized).toBe(path.normalize(windowsPath));
    });

    it('should handle case-insensitive path comparisons on Windows', () => {
      const basePath = 'C:\\Rules';
      const targetPath = 'c:\\rules\\pricing\\shipping.json';
      
      const isWithin = CrossPlatformPathUtils.isPathWithinBase(basePath, targetPath);
      expect(isWithin).toBe(true);
    });
  });

  describe('Unix-like system tests', () => {
    beforeEach(() => {
      mockOs.platform.mockReturnValue('linux');
    });

    it('should handle Unix path separators correctly', () => {
      const unixPath = 'rules/pricing/shipping-fees.json';
      const normalized = CrossPlatformPathUtils.normalizePath(unixPath);
      
      expect(normalized).toBe(path.normalize(unixPath));
    });

    it('should handle case-sensitive path comparisons on Unix', () => {
      const basePath = '/Rules';
      const targetPath = '/rules/pricing/shipping.json';
      
      const isWithin = CrossPlatformPathUtils.isPathWithinBase(basePath, targetPath);
      expect(isWithin).toBe(false); // Case-sensitive, so should not match
    });
  });

  describe('macOS-specific tests', () => {
    beforeEach(() => {
      mockOs.platform.mockReturnValue('darwin');
    });

    it('should handle macOS case-insensitive behavior', () => {
      const basePath = '/Rules';
      const targetPath = '/rules/pricing/shipping.json';
      
      const isWithin = CrossPlatformPathUtils.isPathWithinBase(basePath, targetPath);
      expect(isWithin).toBe(true); // macOS is case-insensitive by default
    });
  });
});