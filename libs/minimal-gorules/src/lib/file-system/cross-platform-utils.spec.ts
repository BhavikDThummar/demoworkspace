/**
 * Cross-platform utilities tests
 * Tests for platform-agnostic file system operations and path handling
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  CrossPlatformPathUtils,
  CrossPlatformPermissionUtils,
  CrossPlatformWatchUtils,
  CrossPlatformValidationUtils,
  PlatformInfo,
} from './cross-platform-utils';
import { MinimalGoRulesError } from '../errors/index';

// Mock os.platform for testing different platforms
jest.mock('os');
const mockOs = os as jest.Mocked<typeof os>;

// Mock fs for permission testing (only for specific tests)
const mockFs = {
  access: jest.fn(),
  stat: jest.fn(),
};

describe('CrossPlatformPathUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPlatformInfo', () => {
    it('should correctly identify Windows platform', () => {
      mockOs.platform.mockReturnValue('win32');

      const info = CrossPlatformPathUtils.getPlatformInfo();

      expect(info.platform).toBe('win32');
      expect(info.isWindows).toBe(true);
      expect(info.isMacOS).toBe(false);
      expect(info.isLinux).toBe(false);
      expect(info.caseSensitive).toBe(false);
    });

    it('should correctly identify macOS platform', () => {
      mockOs.platform.mockReturnValue('darwin');

      const info = CrossPlatformPathUtils.getPlatformInfo();

      expect(info.platform).toBe('darwin');
      expect(info.isWindows).toBe(false);
      expect(info.isMacOS).toBe(true);
      expect(info.isLinux).toBe(false);
      expect(info.caseSensitive).toBe(false);
    });

    it('should correctly identify Linux platform', () => {
      mockOs.platform.mockReturnValue('linux');

      const info = CrossPlatformPathUtils.getPlatformInfo();

      expect(info.platform).toBe('linux');
      expect(info.isWindows).toBe(false);
      expect(info.isMacOS).toBe(false);
      expect(info.isLinux).toBe(true);
      expect(info.caseSensitive).toBe(true);
    });
  });

  describe('path manipulation', () => {
    it('should normalize paths correctly', () => {
      const testPath = 'rules//pricing\\shipping-fees.json';
      const normalized = CrossPlatformPathUtils.normalizePath(testPath);

      expect(normalized).toBe(path.normalize(testPath));
    });

    it('should convert to forward slashes', () => {
      const windowsPath = 'rules\\pricing\\shipping-fees';
      const result = CrossPlatformPathUtils.toForwardSlashes(windowsPath);

      expect(result).toBe('rules/pricing/shipping-fees');
    });

    it('should convert from forward slashes', () => {
      const rulePath = 'rules/pricing/shipping-fees';
      const result = CrossPlatformPathUtils.fromForwardSlashes(rulePath);

      expect(result).toBe(rulePath.split('/').join(path.sep));
    });

    it('should resolve paths correctly', () => {
      const basePath = '/base/path';
      const relativePath = 'relative/file.json';
      const result = CrossPlatformPathUtils.resolvePath(basePath, relativePath);

      expect(result).toBe(path.resolve(basePath, relativePath));
    });

    it('should get relative paths correctly', () => {
      const basePath = '/base/path';
      const targetPath = '/base/path/relative/file.json';
      const result = CrossPlatformPathUtils.getRelativePath(basePath, targetPath);

      expect(result).toBe(path.relative(basePath, targetPath));
    });
  });

  describe('path security checks', () => {
    it('should detect paths within base directory', () => {
      const basePath = '/base/rules';
      const targetPath = '/base/rules/pricing/shipping.json';

      const result = CrossPlatformPathUtils.isPathWithinBase(basePath, targetPath);

      expect(result).toBe(true);
    });

    it('should detect paths outside base directory', () => {
      const basePath = '/base/rules';
      const targetPath = '/other/path/file.json';

      const result = CrossPlatformPathUtils.isPathWithinBase(basePath, targetPath);

      expect(result).toBe(false);
    });

    it('should handle case-insensitive file systems', () => {
      mockOs.platform.mockReturnValue('win32');

      const basePath = '/Base/Rules';
      const targetPath = '/base/rules/file.json';

      const result = CrossPlatformPathUtils.isPathWithinBase(basePath, targetPath);

      expect(result).toBe(true);
    });

    it('should handle case-sensitive file systems', () => {
      mockOs.platform.mockReturnValue('linux');

      const basePath = '/Base/Rules';
      const targetPath = '/base/rules/file.json';

      const result = CrossPlatformPathUtils.isPathWithinBase(basePath, targetPath);

      expect(result).toBe(false);
    });
  });

  describe('path utilities', () => {
    it('should get file extension', () => {
      const filePath = 'rules/pricing/shipping.json';
      const result = CrossPlatformPathUtils.getExtension(filePath);

      expect(result).toBe('.json');
    });

    it('should get base name without extension', () => {
      const filePath = 'rules/pricing/shipping.json';
      const result = CrossPlatformPathUtils.getBaseName(filePath);

      expect(result).toBe('shipping');
    });

    it('should get directory name', () => {
      const filePath = 'rules/pricing/shipping.json';
      const result = CrossPlatformPathUtils.getDirName(filePath);

      expect(result).toBe(path.dirname(filePath));
    });

    it('should join path segments', () => {
      const segments = ['rules', 'pricing', 'shipping.json'];
      const result = CrossPlatformPathUtils.joinPath(...segments);

      expect(result).toBe(path.join(...segments));
    });
  });
});

describe('CrossPlatformPermissionUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkPermissions', () => {
    beforeEach(() => {
      // Mock fs methods for permission tests
      jest.spyOn(fs, 'access').mockImplementation(mockFs.access as any);
      jest.spyOn(fs, 'stat').mockImplementation(mockFs.stat as any);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should return correct permissions for existing readable file', async () => {
      const filePath = '/test/file.json';

      // Mock fs.access to succeed for all checks
      mockFs.access.mockImplementation((path, mode, callback) => {
        callback(null);
      });

      // Mock fs.stat to return file stats
      mockFs.stat.mockImplementation((path, callback) => {
        callback(null, {
          isDirectory: () => false,
          isFile: () => true,
        });
      });

      const result = await CrossPlatformPermissionUtils.checkPermissions(filePath);

      expect(result.exists).toBe(true);
      expect(result.readable).toBe(true);
      expect(result.writable).toBe(true);
      expect(result.isFile).toBe(true);
      expect(result.isDirectory).toBe(false);
    });

    it('should return correct permissions for non-existent file', async () => {
      const filePath = '/test/nonexistent.json';

      // Mock fs.access to fail for existence check
      mockFs.access.mockImplementation((path, mode, callback) => {
        callback(new Error('ENOENT'));
      });

      const result = await CrossPlatformPermissionUtils.checkPermissions(filePath);

      expect(result.exists).toBe(false);
      expect(result.readable).toBe(false);
      expect(result.writable).toBe(false);
      expect(result.isFile).toBe(false);
      expect(result.isDirectory).toBe(false);
    });

    it('should handle Windows executable detection', async () => {
      mockOs.platform.mockReturnValue('win32');
      const filePath = '/test/program.exe';

      // Mock fs.access to succeed for existence
      mockFs.access.mockImplementation((path, mode, callback) => {
        if (mode === fs.constants.F_OK) {
          callback(null);
        } else {
          callback(new Error('Access denied'));
        }
      });

      // Mock fs.stat to return file stats
      mockFs.stat.mockImplementation((path, callback) => {
        callback(null, {
          isDirectory: () => false,
          isFile: () => true,
        });
      });

      const result = await CrossPlatformPermissionUtils.checkPermissions(filePath);

      expect(result.exists).toBe(true);
      expect(result.isFile).toBe(true);
      expect(result.executable).toBe(true); // .exe files are executable on Windows
    });
  });

  describe('directory validation', () => {
    beforeEach(() => {
      // Mock fs methods for directory validation tests
      jest.spyOn(fs, 'access').mockImplementation(mockFs.access as any);
      jest.spyOn(fs, 'stat').mockImplementation(mockFs.stat as unknown);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should validate accessible directory', async () => {
      const dirPath = '/test/rules';

      // Mock fs.access to succeed
      mockFs.access.mockImplementation((path, mode, callback) => {
        callback(null);
      });

      // Mock fs.stat to return directory stats
      mockFs.stat.mockImplementation((path, callback) => {
        callback(null, {
          isDirectory: () => true,
          isFile: () => false,
        });
      });

      await expect(
        CrossPlatformPermissionUtils.validateRuleDirectory(dirPath),
      ).resolves.not.toThrow();
    });

    it('should throw error for non-existent directory', async () => {
      const dirPath = '/test/nonexistent';

      // Mock fs.access to fail
      mockFs.access.mockImplementation((path, mode, callback) => {
        callback(new Error('ENOENT'));
      });

      await expect(CrossPlatformPermissionUtils.validateRuleDirectory(dirPath)).rejects.toThrow(
        MinimalGoRulesError,
      );
    });

    it('should throw error for file instead of directory', async () => {
      const dirPath = '/test/file.json';

      // Mock fs.access to succeed
      mockFs.access.mockImplementation((path, mode, callback) => {
        callback(null);
      });

      // Mock fs.stat to return file stats
      mockFs.stat.mockImplementation((path, callback) => {
        callback(null, {
          isDirectory: () => false,
          isFile: () => true,
        });
      });

      await expect(CrossPlatformPermissionUtils.validateRuleDirectory(dirPath)).rejects.toThrow(
        MinimalGoRulesError,
      );
    });
  });
});

describe('CrossPlatformWatchUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPlatformWatchOptions', () => {
    it('should return Windows-specific options', () => {
      mockOs.platform.mockReturnValue('win32');

      const options = CrossPlatformWatchUtils.getPlatformWatchOptions('/test/rules');

      expect(options.usePolling).toBe(false);
      expect(options.ignored).toContain('**/desktop.ini');
      expect(options.ignored).toContain('**/$RECYCLE.BIN/**');
    });

    it('should return macOS-specific options', () => {
      mockOs.platform.mockReturnValue('darwin');

      const options = CrossPlatformWatchUtils.getPlatformWatchOptions('/test/rules');

      expect(options.usePolling).toBe(false);
      expect(options.ignored).toContain('**/.DS_Store');
      expect(options.ignored).toContain('**/.AppleDouble/**');
    });

    it('should return Linux-specific options', () => {
      mockOs.platform.mockReturnValue('linux');

      const options = CrossPlatformWatchUtils.getPlatformWatchOptions('/test/rules');

      expect(options.usePolling).toBe(false);
      expect(options.ignored).toContain('**/.directory');
      expect(options.ignored).toContain('**/lost+found/**');
    });

    it('should return polling options for unknown platforms', () => {
      mockOs.platform.mockReturnValue('freebsd' as NodeJS.Platform);

      const options = CrossPlatformWatchUtils.getPlatformWatchOptions('/test/rules');

      expect(options.usePolling).toBe(true);
      expect(options.interval).toBe(2000);
    });
  });

  describe('getRecommendedDebounceDelay', () => {
    it('should return Windows-specific delay', () => {
      mockOs.platform.mockReturnValue('win32');

      const delay = CrossPlatformWatchUtils.getRecommendedDebounceDelay();

      expect(delay).toBe(500);
    });

    it('should return macOS-specific delay', () => {
      mockOs.platform.mockReturnValue('darwin');

      const delay = CrossPlatformWatchUtils.getRecommendedDebounceDelay();

      expect(delay).toBe(200);
    });

    it('should return Linux-specific delay', () => {
      mockOs.platform.mockReturnValue('linux');

      const delay = CrossPlatformWatchUtils.getRecommendedDebounceDelay();

      expect(delay).toBe(300);
    });

    it('should return default delay for unknown platforms', () => {
      mockOs.platform.mockReturnValue('freebsd' as NodeJS.Platform);

      const delay = CrossPlatformWatchUtils.getRecommendedDebounceDelay();

      expect(delay).toBe(400);
    });
  });
});

describe('CrossPlatformValidationUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateFilePath', () => {
    it('should accept valid file paths', () => {
      const validPaths = ['/valid/path/file.json', 'relative/path/file.json', 'simple-file.json'];

      for (const path of validPaths) {
        expect(() => CrossPlatformValidationUtils.validateFilePath(path)).not.toThrow();
      }
    });

    it('should reject empty paths', () => {
      expect(() => CrossPlatformValidationUtils.validateFilePath('')).toThrow(MinimalGoRulesError);

      expect(() => CrossPlatformValidationUtils.validateFilePath('   ')).toThrow(
        MinimalGoRulesError,
      );
    });

    it('should reject paths with invalid characters on Windows', () => {
      mockOs.platform.mockReturnValue('win32');

      const invalidPaths = [
        'file<name.json',
        'file>name.json',
        'file"name.json',
        'file|name.json',
        'file?name.json',
        'file*name.json',
        'file:invalid:colon.json', // Multiple colons
        'invalid:colon.json', // Colon not as drive letter
      ];

      for (const path of invalidPaths) {
        expect(() => CrossPlatformValidationUtils.validateFilePath(path)).toThrow(
          MinimalGoRulesError,
        );
      }
    });

    it('should reject Windows reserved names', () => {
      mockOs.platform.mockReturnValue('win32');

      const reservedNames = [
        'CON.json',
        'PRN.json',
        'AUX.json',
        'NUL.json',
        'COM1.json',
        'LPT1.json',
      ];

      for (const name of reservedNames) {
        expect(() => CrossPlatformValidationUtils.validateFilePath(name)).toThrow(
          MinimalGoRulesError,
        );
      }
    });

    it('should reject paths that are too long', () => {
      mockOs.platform.mockReturnValue('win32');

      const longPath = 'a'.repeat(300) + '.json';

      expect(() => CrossPlatformValidationUtils.validateFilePath(longPath)).toThrow(
        MinimalGoRulesError,
      );
    });

    it('should reject Windows paths with trailing spaces or dots', () => {
      mockOs.platform.mockReturnValue('win32');

      const invalidPaths = ['filename .json', 'filename..json', 'path/filename .json'];

      for (const path of invalidPaths) {
        expect(() => CrossPlatformValidationUtils.validateFilePath(path)).toThrow(
          MinimalGoRulesError,
        );
      }
    });

    it('should be more permissive on Unix-like systems', () => {
      mockOs.platform.mockReturnValue('linux');

      const unixValidPaths = [
        'file:name.json', // Colon is valid on Unix
        'file<name.json', // Angle brackets are valid on Unix
        'file name.json', // Spaces are valid on Unix
      ];

      for (const path of unixValidPaths) {
        expect(() => CrossPlatformValidationUtils.validateFilePath(path)).not.toThrow();
      }
    });

    it('should accept valid Windows drive paths', () => {
      mockOs.platform.mockReturnValue('win32');

      const validWindowsPaths = [
        'C:\\Users\\test\\file.json',
        'D:/Development/project/file.json',
        'E:\\temp\\rules\\pricing.json',
      ];

      for (const path of validWindowsPaths) {
        expect(() => CrossPlatformValidationUtils.validateFilePath(path)).not.toThrow();
      }
    });

    it('should reject null character on all platforms', () => {
      const platforms: NodeJS.Platform[] = ['win32', 'darwin', 'linux'];

      for (const platform of platforms) {
        mockOs.platform.mockReturnValue(platform);

        expect(() => CrossPlatformValidationUtils.validateFilePath('file\0name.json')).toThrow(
          MinimalGoRulesError,
        );
      }
    });
  });
});

// Integration tests that test cross-platform behavior with real file system operations
describe('CrossPlatform Integration Tests', () => {
  const testDir = path.join(__dirname, 'test-cross-platform');

  beforeAll(async () => {
    // Restore real fs for integration tests
    jest.restoreAllMocks();

    // Create test directory structure
    const realFs = jest.requireActual('fs');
    await realFs.promises.mkdir(testDir, { recursive: true });
    await realFs.promises.mkdir(path.join(testDir, 'subdir'), { recursive: true });
    await realFs.promises.writeFile(path.join(testDir, 'test.json'), '{"test": true}');
    await realFs.promises.writeFile(
      path.join(testDir, 'subdir', 'nested.json'),
      '{"nested": true}',
    );
  });

  afterAll(async () => {
    // Clean up test directory
    try {
      const realFs = jest.requireActual('fs');
      await realFs.promises.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  it('should handle real file system operations correctly', async () => {
    const permissions = await CrossPlatformPermissionUtils.checkPermissions(testDir);

    expect(permissions.exists).toBe(true);
    expect(permissions.isDirectory).toBe(true);
    expect(permissions.readable).toBe(true);
  });

  it('should validate real directory correctly', async () => {
    await expect(
      CrossPlatformPermissionUtils.validateRuleDirectory(testDir),
    ).resolves.not.toThrow();
  });

  it('should handle path operations with real paths', () => {
    const testFile = path.join(testDir, 'test.json');
    const relativePath = CrossPlatformPathUtils.getRelativePath(testDir, testFile);

    expect(relativePath).toBe('test.json');

    const ruleId = CrossPlatformPathUtils.toForwardSlashes(relativePath.replace('.json', ''));
    expect(ruleId).toBe('test');
  });

  it('should handle nested directory paths correctly', () => {
    const nestedFile = path.join(testDir, 'subdir', 'nested.json');
    const relativePath = CrossPlatformPathUtils.getRelativePath(testDir, nestedFile);

    const ruleId = CrossPlatformPathUtils.toForwardSlashes(relativePath.replace('.json', ''));
    expect(ruleId).toBe('subdir/nested');

    // Convert back to platform path
    const backToPath = CrossPlatformPathUtils.fromForwardSlashes(ruleId) + '.json';
    const fullPath = CrossPlatformPathUtils.joinPath(testDir, backToPath);

    expect(CrossPlatformPathUtils.isPathWithinBase(testDir, fullPath)).toBe(true);
  });
});
