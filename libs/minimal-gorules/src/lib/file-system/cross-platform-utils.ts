/**
 * Cross-platform file system utilities
 * Provides platform-agnostic file system operations and path handling
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { promisify } from 'util';
import { MinimalGoRulesError, MinimalErrorCode } from '../errors/index.js';

// Promisify fs methods for async/await usage
const access = promisify(fs.access);
const stat = promisify(fs.stat);

/**
 * Platform information
 */
export interface PlatformInfo {
  platform: NodeJS.Platform;
  isWindows: boolean;
  isMacOS: boolean;
  isLinux: boolean;
  pathSeparator: string;
  caseSensitive: boolean;
}

/**
 * File permission check result
 */
export interface FilePermissionResult {
  exists: boolean;
  readable: boolean;
  writable: boolean;
  executable: boolean;
  isDirectory: boolean;
  isFile: boolean;
}

/**
 * Cross-platform path utilities
 */
export class CrossPlatformPathUtils {
  /**
   * Get current platform information
   */
  static getPlatformInfo(): PlatformInfo {
    const platform = os.platform();
    return {
      platform,
      isWindows: platform === 'win32',
      isMacOS: platform === 'darwin',
      isLinux: platform === 'linux',
      pathSeparator: path.sep,
      caseSensitive: platform !== 'win32' && platform !== 'darwin',
    };
  }

  /**
   * Normalize path separators for the current platform
   * @param filePath - The path to normalize
   * @returns Normalized path with platform-specific separators
   */
  static normalizePath(filePath: string): string {
    return path.normalize(filePath);
  }

  /**
   * Convert path separators to forward slashes (for rule IDs)
   * @param filePath - The path to convert
   * @returns Path with forward slashes
   */
  static toForwardSlashes(filePath: string): string {
    return filePath.split(path.sep).join('/');
  }

  /**
   * Convert forward slashes to platform-specific separators
   * @param rulePath - The rule path with forward slashes
   * @returns Path with platform-specific separators
   */
  static fromForwardSlashes(rulePath: string): string {
    return rulePath.split('/').join(path.sep);
  }

  /**
   * Resolve path relative to a base directory
   * @param basePath - The base directory
   * @param relativePath - The relative path
   * @returns Resolved absolute path
   */
  static resolvePath(basePath: string, relativePath: string): string {
    return path.resolve(basePath, relativePath);
  }

  /**
   * Get relative path from base to target
   * @param basePath - The base directory
   * @param targetPath - The target path
   * @returns Relative path from base to target
   */
  static getRelativePath(basePath: string, targetPath: string): string {
    return path.relative(basePath, targetPath);
  }

  /**
   * Check if a path is within a base directory (security check)
   * @param basePath - The base directory
   * @param targetPath - The path to check
   * @returns True if target is within base directory
   */
  static isPathWithinBase(basePath: string, targetPath: string): boolean {
    const resolvedBase = path.resolve(basePath);
    const resolvedTarget = path.resolve(targetPath);
    
    // On case-insensitive systems, normalize case for comparison
    const platformInfo = this.getPlatformInfo();
    if (!platformInfo.caseSensitive) {
      return resolvedTarget.toLowerCase().startsWith(resolvedBase.toLowerCase());
    }
    
    return resolvedTarget.startsWith(resolvedBase);
  }

  /**
   * Get file extension from path
   * @param filePath - The file path
   * @returns File extension (including the dot)
   */
  static getExtension(filePath: string): string {
    return path.extname(filePath);
  }

  /**
   * Get filename without extension
   * @param filePath - The file path
   * @returns Filename without extension
   */
  static getBaseName(filePath: string): string {
    return path.basename(filePath, path.extname(filePath));
  }

  /**
   * Get directory name from path
   * @param filePath - The file path
   * @returns Directory name
   */
  static getDirName(filePath: string): string {
    return path.dirname(filePath);
  }

  /**
   * Join path segments using platform-specific separators
   * @param segments - Path segments to join
   * @returns Joined path
   */
  static joinPath(...segments: string[]): string {
    return path.join(...segments);
  }
}

/**
 * Cross-platform file permission utilities
 */
export class CrossPlatformPermissionUtils {
  /**
   * Check comprehensive file permissions
   * @param filePath - The file path to check
   * @returns Promise resolving to permission check result
   */
  static async checkPermissions(filePath: string): Promise<FilePermissionResult> {
    const result: FilePermissionResult = {
      exists: false,
      readable: false,
      writable: false,
      executable: false,
      isDirectory: false,
      isFile: false,
    };

    try {
      // Check if file exists
      await access(filePath, fs.constants.F_OK);
      result.exists = true;

      // Get file stats
      const stats = await stat(filePath);
      result.isDirectory = stats.isDirectory();
      result.isFile = stats.isFile();

      // Check read permission
      try {
        await access(filePath, fs.constants.R_OK);
        result.readable = true;
      } catch {
        result.readable = false;
      }

      // Check write permission
      try {
        await access(filePath, fs.constants.W_OK);
        result.writable = true;
      } catch {
        result.writable = false;
      }

      // Check execute permission (not applicable on Windows for files)
      const platformInfo = CrossPlatformPathUtils.getPlatformInfo();
      if (!platformInfo.isWindows || result.isDirectory) {
        try {
          await access(filePath, fs.constants.X_OK);
          result.executable = true;
        } catch {
          result.executable = false;
        }
      } else {
        // On Windows, files don't have execute permission in the same way
        result.executable = result.isFile && (
          filePath.endsWith('.exe') || 
          filePath.endsWith('.bat') || 
          filePath.endsWith('.cmd')
        );
      }

    } catch (error) {
      // File doesn't exist or other error
      result.exists = false;
    }

    return result;
  }

  /**
   * Check if file/directory is readable
   * @param filePath - The file path to check
   * @returns Promise resolving to true if readable
   */
  static async isReadable(filePath: string): Promise<boolean> {
    try {
      await access(filePath, fs.constants.F_OK | fs.constants.R_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if file/directory is writable
   * @param filePath - The file path to check
   * @returns Promise resolving to true if writable
   */
  static async isWritable(filePath: string): Promise<boolean> {
    try {
      await access(filePath, fs.constants.F_OK | fs.constants.W_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if directory is accessible for rule loading
   * @param directoryPath - The directory path to check
   * @returns Promise resolving to true if directory is accessible
   */
  static async isDirectoryAccessible(directoryPath: string): Promise<boolean> {
    try {
      const permissions = await this.checkPermissions(directoryPath);
      return permissions.exists && permissions.isDirectory && permissions.readable;
    } catch {
      return false;
    }
  }

  /**
   * Validate directory for rule loading with detailed error messages
   * @param directoryPath - The directory path to validate
   * @throws MinimalGoRulesError with specific permission issue
   */
  static async validateRuleDirectory(directoryPath: string): Promise<void> {
    const permissions = await this.checkPermissions(directoryPath);

    if (!permissions.exists) {
      throw new MinimalGoRulesError(
        MinimalErrorCode.CONFIG_ERROR,
        `Rule directory does not exist: ${directoryPath}`
      );
    }

    if (!permissions.isDirectory) {
      throw new MinimalGoRulesError(
        MinimalErrorCode.CONFIG_ERROR,
        `Rule path is not a directory: ${directoryPath}`
      );
    }

    if (!permissions.readable) {
      throw new MinimalGoRulesError(
        MinimalErrorCode.CONFIG_ERROR,
        `Rule directory is not readable: ${directoryPath}. Check file permissions.`
      );
    }
  }
}

/**
 * Cross-platform file watching utilities
 */
export class CrossPlatformWatchUtils {
  /**
   * Get platform-specific file watching options
   * @param basePath - The base path to watch
   * @returns Platform-optimized watching options
   */
  static getPlatformWatchOptions(basePath: string): {
    usePolling?: boolean;
    interval?: number;
    binaryInterval?: number;
    ignored?: (string | RegExp)[];
    persistent?: boolean;
    ignoreInitial?: boolean;
    followSymlinks?: boolean;
    cwd?: string;
    disableGlobbing?: boolean;
  } {
    const platformInfo = CrossPlatformPathUtils.getPlatformInfo();
    
    const baseOptions = {
      persistent: true,
      ignoreInitial: true,
      followSymlinks: false,
      cwd: basePath,
      disableGlobbing: false,
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/.DS_Store',
        '**/Thumbs.db',
        '**/*.tmp',
        '**/*.temp',
        '**/.#*', // Emacs temp files
        '**/~*',  // Vim temp files
      ],
    };

    if (platformInfo.isWindows) {
      return {
        ...baseOptions,
        // Windows-specific optimizations
        usePolling: false, // Native watching is usually better on Windows
        interval: 1000,
        binaryInterval: 3000,
        ignored: [
          ...baseOptions.ignored,
          '**/desktop.ini',
          '**/$RECYCLE.BIN/**',
          '**/System Volume Information/**',
        ],
      };
    }

    if (platformInfo.isMacOS) {
      return {
        ...baseOptions,
        // macOS-specific optimizations
        usePolling: false, // FSEvents is very efficient
        interval: 1000,
        binaryInterval: 3000,
        ignored: [
          ...baseOptions.ignored,
          '**/.DS_Store',
          '**/.AppleDouble/**',
          '**/.LSOverride',
          '**/.Spotlight-V100/**',
          '**/.Trashes/**',
        ],
      };
    }

    if (platformInfo.isLinux) {
      return {
        ...baseOptions,
        // Linux-specific optimizations
        usePolling: false, // inotify is efficient
        interval: 1000,
        binaryInterval: 3000,
        ignored: [
          ...baseOptions.ignored,
          '**/.directory',
          '**/lost+found/**',
        ],
      };
    }

    // Default for other platforms
    return {
      ...baseOptions,
      usePolling: true, // Fallback to polling for unknown platforms
      interval: 2000,
      binaryInterval: 5000,
    };
  }

  /**
   * Get recommended debounce delay for the current platform
   * @returns Debounce delay in milliseconds
   */
  static getRecommendedDebounceDelay(): number {
    const platformInfo = CrossPlatformPathUtils.getPlatformInfo();
    
    if (platformInfo.isWindows) {
      return 500; // Windows file operations can be slower
    }
    
    if (platformInfo.isMacOS) {
      return 200; // macOS FSEvents are very fast
    }
    
    if (platformInfo.isLinux) {
      return 300; // Linux inotify is fast but can have bursts
    }
    
    return 400; // Conservative default for other platforms
  }
}

/**
 * Cross-platform file system validation utilities
 */
export class CrossPlatformValidationUtils {
  /**
   * Validate file path for cross-platform compatibility
   * @param filePath - The file path to validate
   * @throws MinimalGoRulesError if path is invalid
   */
  static validateFilePath(filePath: string): void {
    if (!filePath || filePath.trim().length === 0) {
      throw new MinimalGoRulesError(
        MinimalErrorCode.CONFIG_ERROR,
        'File path cannot be empty'
      );
    }

    const platformInfo = CrossPlatformPathUtils.getPlatformInfo();

    // Check for invalid characters
    const invalidChars = this.getInvalidPathCharacters();
    for (const char of invalidChars) {
      if (filePath.includes(char)) {
        throw new MinimalGoRulesError(
          MinimalErrorCode.CONFIG_ERROR,
          `File path contains invalid character '${char}': ${filePath}`
        );
      }
    }

    // Special handling for Windows colon character (only invalid if not part of drive letter)
    if (platformInfo.isWindows && filePath.includes(':')) {
      // Allow colon only as part of drive letter (e.g., C:, D:)
      const driveLetterPattern = /^[A-Za-z]:[\\/]/;
      const hasValidDriveLetter = driveLetterPattern.test(filePath);
      
      // Count colons in the path
      const colonCount = (filePath.match(/:/g) || []).length;
      
      // If there's more than one colon, or one colon that's not a drive letter, it's invalid
      if (colonCount > 1 || (colonCount === 1 && !hasValidDriveLetter)) {
        throw new MinimalGoRulesError(
          MinimalErrorCode.CONFIG_ERROR,
          `File path contains invalid colon usage: ${filePath}`
        );
      }
    }

    // Check path length limits
    const maxLength = platformInfo.isWindows ? 260 : 4096;
    
    if (filePath.length > maxLength) {
      throw new MinimalGoRulesError(
        MinimalErrorCode.CONFIG_ERROR,
        `File path exceeds maximum length (${maxLength}): ${filePath}`
      );
    }

    // Check for reserved names on Windows
    if (platformInfo.isWindows) {
      this.validateWindowsPath(filePath);
    }
  }

  /**
   * Get invalid path characters for the current platform
   * @returns Array of invalid characters
   */
  private static getInvalidPathCharacters(): string[] {
    const platformInfo = CrossPlatformPathUtils.getPlatformInfo();
    
    if (platformInfo.isWindows) {
      // On Windows, colon is only invalid if not part of drive letter (C:)
      return ['<', '>', '"', '|', '?', '*'];
    }
    
    // Unix-like systems (Linux, macOS)
    return ['\0']; // Only null character is universally invalid
  }

  /**
   * Validate Windows-specific path restrictions
   * @param filePath - The file path to validate
   */
  private static validateWindowsPath(filePath: string): void {
    const reservedNames = [
      'CON', 'PRN', 'AUX', 'NUL',
      'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
      'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
    ];

    const pathParts = filePath.split(path.sep);
    for (const part of pathParts) {
      const baseName = CrossPlatformPathUtils.getBaseName(part).toUpperCase();
      if (reservedNames.includes(baseName)) {
        throw new MinimalGoRulesError(
          MinimalErrorCode.CONFIG_ERROR,
          `File path contains Windows reserved name '${part}': ${filePath}`
        );
      }

      // Check for trailing spaces or dots (not allowed on Windows)
      // Skip empty parts and drive letters
      if (part && !part.match(/^[A-Za-z]:$/) && (part !== part.trim() || part.endsWith('.'))) {
        throw new MinimalGoRulesError(
          MinimalErrorCode.CONFIG_ERROR,
          `File path contains invalid Windows filename '${part}': ${filePath}`
        );
      }
    }
  }
}