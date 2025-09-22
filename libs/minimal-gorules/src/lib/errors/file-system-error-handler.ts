import { MinimalGoRulesError } from './minimal-errors';

/**
 * Utility class for handling file system errors and mapping them to appropriate MinimalGoRulesError instances
 */
export class FileSystemErrorHandler {
  /**
   * Maps common file system errors to appropriate MinimalGoRulesError instances
   * @param error - The original error from file system operations
   * @param filePath - The file path where the error occurred
   * @returns A MinimalGoRulesError with appropriate error code and message
   */
  static handleFileError(error: Error, filePath: string): MinimalGoRulesError {
    const nodeError = error as NodeJS.ErrnoException;

    switch (nodeError.code) {
      case 'ENOENT':
        return MinimalGoRulesError.fileNotFound(filePath);
      
      case 'EACCES':
      case 'EPERM':
        return MinimalGoRulesError.fileAccessDenied(filePath);
      
      case 'EISDIR':
        return MinimalGoRulesError.fileSystemError(
          `Expected file but found directory: ${filePath}`,
          error,
          filePath
        );
      
      case 'ENOTDIR':
        return MinimalGoRulesError.fileSystemError(
          `Expected directory but found file: ${filePath}`,
          error,
          filePath
        );
      
      case 'EMFILE':
      case 'ENFILE':
        return MinimalGoRulesError.fileSystemError(
          `Too many open files: ${filePath}`,
          error,
          filePath
        );
      
      case 'ENOSPC':
        return MinimalGoRulesError.fileSystemError(
          `No space left on device: ${filePath}`,
          error,
          filePath
        );
      
      case 'EROFS':
        return MinimalGoRulesError.fileSystemError(
          `Read-only file system: ${filePath}`,
          error,
          filePath
        );
      
      default:
        return MinimalGoRulesError.fileSystemError(
          `Unexpected file system error: ${error.message}`,
          error,
          filePath
        );
    }
  }

  /**
   * Handles directory-specific errors
   * @param error - The original error from directory operations
   * @param directoryPath - The directory path where the error occurred
   * @returns A MinimalGoRulesError with appropriate error code and message
   */
  static handleDirectoryError(error: Error, directoryPath: string): MinimalGoRulesError {
    const nodeError = error as NodeJS.ErrnoException;

    switch (nodeError.code) {
      case 'ENOENT':
        return MinimalGoRulesError.directoryNotFound(directoryPath);
      
      case 'EACCES':
      case 'EPERM':
        return MinimalGoRulesError.fileAccessDenied(directoryPath);
      
      case 'ENOTDIR':
        return MinimalGoRulesError.fileSystemError(
          `Expected directory but found file: ${directoryPath}`,
          error,
          directoryPath
        );
      
      default:
        return MinimalGoRulesError.fileSystemError(
          `Directory operation failed: ${error.message}`,
          error,
          directoryPath
        );
    }
  }

  /**
   * Handles JSON parsing errors with file context
   * @param error - The JSON parsing error
   * @param filePath - The file path where the JSON parsing failed
   * @returns A MinimalGoRulesError with JSON parse error details
   */
  static handleJsonParseError(error: Error, filePath: string): MinimalGoRulesError {
    return MinimalGoRulesError.jsonParseError(filePath, error);
  }

  /**
   * Handles file validation errors (e.g., missing required fields in GoRules format)
   * @param filePath - The file path where validation failed
   * @param validationMessage - The specific validation error message
   * @returns A MinimalGoRulesError with validation details
   */
  static handleFileValidationError(filePath: string, validationMessage: string): MinimalGoRulesError {
    return MinimalGoRulesError.invalidFileFormat(filePath, validationMessage);
  }

  /**
   * Wraps file system operations with error handling
   * @param operation - The file system operation to execute
   * @param filePath - The file path for error context
   * @returns Promise that resolves with the operation result or rejects with MinimalGoRulesError
   */
  static async wrapFileOperation<T>(
    operation: () => Promise<T>,
    filePath: string
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      throw this.handleFileError(error as Error, filePath);
    }
  }

  /**
   * Wraps directory operations with error handling
   * @param operation - The directory operation to execute
   * @param directoryPath - The directory path for error context
   * @returns Promise that resolves with the operation result or rejects with MinimalGoRulesError
   */
  static async wrapDirectoryOperation<T>(
    operation: () => Promise<T>,
    directoryPath: string
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      throw this.handleDirectoryError(error as Error, directoryPath);
    }
  }

  /**
   * Checks if an error is a file system related error
   * @param error - The error to check
   * @returns True if the error is file system related
   */
  static isFileSystemError(error: Error): boolean {
    const nodeError = error as NodeJS.ErrnoException;
    return !!(nodeError.code && this.getFileSystemErrorCodes().includes(nodeError.code));
  }

  /**
   * Gets a list of known file system error codes
   * @returns Array of file system error codes
   */
  private static getFileSystemErrorCodes(): string[] {
    return [
      'ENOENT',   // No such file or directory
      'EACCES',   // Permission denied
      'EPERM',    // Operation not permitted
      'EISDIR',   // Is a directory
      'ENOTDIR',  // Not a directory
      'EMFILE',   // Too many open files
      'ENFILE',   // File table overflow
      'ENOSPC',   // No space left on device
      'EROFS',    // Read-only file system
      'EEXIST',   // File exists
      'EBUSY',    // Device or resource busy
      'EINVAL',   // Invalid argument
      'EIO',      // I/O error
    ];
  }
}