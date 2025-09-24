/**
 * File System Rule Scanner for local rule loading
 * Cross-platform directory scanning and rule ID generation
 */

import * as fs from 'fs';
import { promisify } from 'util';
import { MinimalRuleMetadata } from '../interfaces/index.js';
import { MinimalGoRulesError, MinimalErrorCode } from '../errors/index.js';
import { FileSystemErrorHandler } from '../errors/file-system-error-handler.js';
import {
  CrossPlatformPathUtils,
  CrossPlatformPermissionUtils,
  CrossPlatformValidationUtils,
} from './cross-platform-utils.js';

// Promisify fs methods for async/await usage
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);
const access = promisify(fs.access);

/**
 * File system rule representation
 */
export interface FileSystemRule {
  id: string;
  filePath: string;
  data: Buffer;
  metadata: MinimalRuleMetadata;
}

/**
 * File system scan options
 */
export interface FileSystemScanOptions {
  recursive?: boolean; // default: true
  fileExtension?: string; // default: '.json'
  metadataPattern?: string; // default: '.meta.json'
}

/**
 * Rule metadata from .meta.json file
 */
interface RuleMetadataFile {
  version?: string;
  tags?: string[];
  description?: string;
  lastModified?: string;
  author?: string;
  environment?: string;
}

/**
 * File System Rule Scanner
 * Handles cross-platform directory scanning and rule loading
 */
export class FileSystemRuleScanner {
  private readonly basePath: string;
  private readonly options: Required<FileSystemScanOptions>;

  constructor(basePath: string, options: FileSystemScanOptions = {}) {
    // Validate and normalize the base path using cross-platform utilities
    CrossPlatformValidationUtils.validateFilePath(basePath);
    this.basePath = CrossPlatformPathUtils.resolvePath('.', basePath);

    this.options = {
      recursive: options.recursive ?? true,
      fileExtension: options.fileExtension ?? '.json',
      metadataPattern: options.metadataPattern ?? '.meta.json',
    };
  }

  /**
   * Scan directory for rule files and return all rules
   */
  async scanDirectory(): Promise<FileSystemRule[]> {
    try {
      // Check if base path exists and is accessible
      await this.validateBasePath();

      // Scan for all JSON files
      const ruleFiles = await this.findRuleFiles(this.basePath);

      // Load each rule file
      const rules: FileSystemRule[] = [];
      const errors: Error[] = [];

      for (const filePath of ruleFiles) {
        try {
          const rule = await this.loadRuleFile(filePath);
          rules.push(rule);
        } catch (error) {
          // Collect errors but continue loading other rules
          errors.push(error instanceof Error ? error : new Error(String(error)));
        }
      }

      // If we have errors but also some successful rules, log errors but continue
      if (errors.length > 0) {
        console.warn(
          `Failed to load ${errors.length} rule files:`,
          errors.map((e) => e.message),
        );
      }

      // If no rules were loaded and we had errors, throw
      if (rules.length === 0 && errors.length > 0) {
        throw new MinimalGoRulesError(
          MinimalErrorCode.CONFIG_ERROR,
          `Failed to load any rules from ${this.basePath}. Errors: ${errors
            .map((e) => e.message)
            .join(', ')}`,
        );
      }

      return rules;
    } catch (error) {
      if (error instanceof MinimalGoRulesError) {
        throw error;
      }

      // Use FileSystemErrorHandler for consistent error handling
      if (FileSystemErrorHandler.isFileSystemError(error as Error)) {
        throw FileSystemErrorHandler.handleDirectoryError(error as Error, this.basePath);
      }

      throw this.handleFileSystemError(error, this.basePath);
    }
  }

  /**
   * Load a single rule file by file path
   */
  async loadRuleFile(filePath: string): Promise<FileSystemRule> {
    try {
      // Generate rule ID from file path
      const ruleId = this.generateRuleId(filePath);

      // Read rule file content
      const data = await readFile(filePath);

      // Validate JSON format
      let parsedContent: unknown;
      try {
        parsedContent = JSON.parse(data.toString('utf-8'));
      } catch (jsonError) {
        throw FileSystemErrorHandler.handleJsonParseError(jsonError as Error, filePath);
      }

      // Basic GoRules format validation
      this.validateGoRulesFormat(parsedContent, ruleId, filePath);

      // Load metadata
      const metadata = await this.loadRuleMetadata(filePath, ruleId);

      return {
        id: ruleId,
        filePath,
        data,
        metadata,
      };
    } catch (error) {
      if (error instanceof MinimalGoRulesError) {
        throw error;
      }

      // Use FileSystemErrorHandler for consistent error handling
      if (FileSystemErrorHandler.isFileSystemError(error as Error)) {
        throw FileSystemErrorHandler.handleFileError(error as Error, filePath);
      }

      throw this.handleFileSystemError(error, filePath);
    }
  }

  /**
   * Generate rule ID from file path
   * Converts file path relative to base path into rule ID
   * Example: pricing/shipping-fees.json -> pricing/shipping-fees
   */
  private generateRuleId(filePath: string): string {
    // Get relative path from base path using cross-platform utilities
    const relativePath = CrossPlatformPathUtils.getRelativePath(this.basePath, filePath);

    // Remove file extension
    const withoutExtension = relativePath.replace(
      CrossPlatformPathUtils.getExtension(relativePath),
      '',
    );

    // Convert path separators to forward slashes for consistent rule IDs across platforms
    const ruleId = CrossPlatformPathUtils.toForwardSlashes(withoutExtension);

    return ruleId;
  }

  /**
   * Find all rule files in directory (recursive if enabled)
   */
  private async findRuleFiles(dirPath: string): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = CrossPlatformPathUtils.joinPath(dirPath, entry.name);

        if (entry.isDirectory() && this.options.recursive) {
          // Check if subdirectory is accessible before recursing
          const isAccessible = await CrossPlatformPermissionUtils.isDirectoryAccessible(fullPath);
          if (isAccessible) {
            const subFiles = await this.findRuleFiles(fullPath);
            files.push(...subFiles);
          } else {
            console.warn(`Skipping inaccessible directory: ${fullPath}`);
          }
        } else if (entry.isFile() && this.isRuleFile(entry.name)) {
          // Validate file path before adding
          try {
            CrossPlatformValidationUtils.validateFilePath(fullPath);
            files.push(fullPath);
          } catch (error) {
            console.warn(
              `Skipping invalid file path: ${fullPath} - ${
                error instanceof Error ? error.message : 'Unknown error'
              }`,
            );
          }
        }
      }
    } catch (error) {
      // Use FileSystemErrorHandler for consistent error handling
      if (FileSystemErrorHandler.isFileSystemError(error as Error)) {
        throw FileSystemErrorHandler.handleDirectoryError(error as Error, dirPath);
      }
      throw this.handleFileSystemError(error, dirPath);
    }

    return files;
  }

  /**
   * Check if file is a rule file (has correct extension and is not a metadata file)
   */
  private isRuleFile(fileName: string): boolean {
    return (
      fileName.endsWith(this.options.fileExtension) &&
      !fileName.endsWith(this.options.metadataPattern)
    );
  }

  /**
   * Load rule metadata from .meta.json file or generate default metadata
   */
  private async loadRuleMetadata(
    ruleFilePath: string,
    ruleId: string,
  ): Promise<MinimalRuleMetadata> {
    const metadataPath = this.getMetadataPath(ruleFilePath);

    // First, try to extract name from the rule file itself
    let ruleName: string | undefined;
    try {
      const ruleContent = await readFile(ruleFilePath, 'utf-8');
      const ruleData = JSON.parse(ruleContent);
      ruleName = ruleData.name;
    } catch (error) {
      // Ignore errors when extracting name from rule file
    }

    try {
      // Try to load metadata file
      await access(metadataPath, fs.constants.F_OK);
      const metadataContent = await readFile(metadataPath, 'utf-8');
      const metadataFile: RuleMetadataFile = JSON.parse(metadataContent);

      // Get file stats for lastModified fallback
      const stats = await stat(ruleFilePath);

      return {
        id: ruleId,
        name: ruleName, // Include name from rule file
        version: metadataFile.version || stats.mtime.getTime().toString(),
        tags: metadataFile.tags || [],
        lastModified: metadataFile.lastModified
          ? new Date(metadataFile.lastModified).getTime()
          : stats.mtime.getTime(),
      };
    } catch (error) {
      // If metadata file doesn't exist or is invalid, generate default metadata
      return this.generateDefaultMetadata(ruleFilePath, ruleId, ruleName);
    }
  }

  /**
   * Generate default metadata from file stats
   */
  private async generateDefaultMetadata(
    ruleFilePath: string,
    ruleId: string,
    name?: string,
  ): Promise<MinimalRuleMetadata> {
    try {
      const stats = await stat(ruleFilePath);

      return {
        id: ruleId,
        name,
        version: stats.mtime.getTime().toString(),
        tags: [],
        lastModified: stats.mtime.getTime(),
      };
    } catch (error) {
      // Use FileSystemErrorHandler for consistent error handling
      if (FileSystemErrorHandler.isFileSystemError(error as Error)) {
        throw FileSystemErrorHandler.handleFileError(error as Error, ruleFilePath);
      }
      throw this.handleFileSystemError(error, ruleFilePath);
    }
  }

  /**
   * Get metadata file path for a rule file using cross-platform utilities
   */
  private getMetadataPath(ruleFilePath: string): string {
    const dir = CrossPlatformPathUtils.getDirName(ruleFilePath);
    const baseName = CrossPlatformPathUtils.getBaseName(ruleFilePath);
    return CrossPlatformPathUtils.joinPath(dir, `${baseName}${this.options.metadataPattern}`);
  }

  /**
   * Validate base path exists and is accessible using cross-platform utilities
   */
  private async validateBasePath(): Promise<void> {
    try {
      // Use cross-platform permission validation
      await CrossPlatformPermissionUtils.validateRuleDirectory(this.basePath);
    } catch (error) {
      if (error instanceof MinimalGoRulesError) {
        throw error;
      }

      // Use FileSystemErrorHandler for consistent error handling
      if (FileSystemErrorHandler.isFileSystemError(error as Error)) {
        throw FileSystemErrorHandler.handleDirectoryError(error as Error, this.basePath);
      }

      throw this.handleFileSystemError(error, this.basePath);
    }
  }

  /**
   * Basic validation that the loaded content follows GoRules format
   */
  private validateGoRulesFormat(content: unknown, ruleId: string, filePath: string): void {
    if (!content || typeof content !== 'object') {
      throw FileSystemErrorHandler.handleFileValidationError(
        filePath,
        `Rule ${ruleId} must be a valid JSON object`,
      );
    }

    const rule = content as Record<string, unknown>;

    // Check for required GoRules properties
    if (!rule.nodes || !Array.isArray(rule.nodes)) {
      throw FileSystemErrorHandler.handleFileValidationError(
        filePath,
        `Rule ${ruleId} missing required 'nodes' array`,
      );
    }

    if (!rule.edges || !Array.isArray(rule.edges)) {
      throw FileSystemErrorHandler.handleFileValidationError(
        filePath,
        `Rule ${ruleId} missing required 'edges' array`,
      );
    }
  }

  /**
   * Handle file system errors and convert to appropriate MinimalGoRulesError
   */
  private handleFileSystemError(error: unknown, filePath: string): MinimalGoRulesError {
    if (error instanceof MinimalGoRulesError) {
      return error;
    }

    const err = error as NodeJS.ErrnoException;

    switch (err.code) {
      case 'ENOENT':
        return new MinimalGoRulesError(
          MinimalErrorCode.RULE_NOT_FOUND,
          `File or directory not found: ${filePath}`,
        );
      case 'EACCES':
        return new MinimalGoRulesError(
          MinimalErrorCode.CONFIG_ERROR,
          `Permission denied accessing: ${filePath}`,
        );
      case 'EISDIR':
        return new MinimalGoRulesError(
          MinimalErrorCode.CONFIG_ERROR,
          `Expected file but found directory: ${filePath}`,
        );
      case 'ENOTDIR':
        return new MinimalGoRulesError(
          MinimalErrorCode.CONFIG_ERROR,
          `Expected directory but found file: ${filePath}`,
        );
      default:
        return new MinimalGoRulesError(
          MinimalErrorCode.CONFIG_ERROR,
          `File system error for ${filePath}: ${err.message || 'Unknown error'}`,
          undefined,
          err,
        );
    }
  }
}
