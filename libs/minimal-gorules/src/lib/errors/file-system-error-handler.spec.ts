/**
 * Unit tests for FileSystemErrorHandler
 */

import { FileSystemErrorHandler } from './file-system-error-handler';
import { MinimalGoRulesError, MinimalErrorCode } from './minimal-errors';

describe('FileSystemErrorHandler', () => {
  describe('handleFileError', () => {
    it('should handle ENOENT error as file not found', () => {
      const error = new Error('File not found') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      const filePath = '/path/to/file.json';

      const result = FileSystemErrorHandler.handleFileError(error, filePath);

      expect(result).toBeInstanceOf(MinimalGoRulesError);
      expect(result.code).toBe(MinimalErrorCode.FILE_NOT_FOUND);
      expect(result.message).toBe(`File not found: ${filePath}`);
    });

    it('should handle EACCES error as access denied', () => {
      const error = new Error('Permission denied') as NodeJS.ErrnoException;
      error.code = 'EACCES';
      const filePath = '/path/to/file.json';

      const result = FileSystemErrorHandler.handleFileError(error, filePath);

      expect(result).toBeInstanceOf(MinimalGoRulesError);
      expect(result.code).toBe(MinimalErrorCode.FILE_ACCESS_DENIED);
      expect(result.message).toBe(`Access denied: ${filePath}`);
    });

    it('should handle EPERM error as access denied', () => {
      const error = new Error('Operation not permitted') as NodeJS.ErrnoException;
      error.code = 'EPERM';
      const filePath = '/path/to/file.json';

      const result = FileSystemErrorHandler.handleFileError(error, filePath);

      expect(result).toBeInstanceOf(MinimalGoRulesError);
      expect(result.code).toBe(MinimalErrorCode.FILE_ACCESS_DENIED);
      expect(result.message).toBe(`Access denied: ${filePath}`);
    });

    it('should handle unknown error codes as generic file system error', () => {
      const error = new Error('Unknown error') as NodeJS.ErrnoException;
      error.code = 'UNKNOWN';
      const filePath = '/path/to/file.json';

      const result = FileSystemErrorHandler.handleFileError(error, filePath);

      expect(result).toBeInstanceOf(MinimalGoRulesError);
      expect(result.code).toBe(MinimalErrorCode.FILE_SYSTEM_ERROR);
      expect(result.message).toBe(`File system error for ${filePath}: Unexpected file system error: Unknown error`);
      expect(result.originalError).toBe(error);
    });
  });

  describe('handleJsonParseError', () => {
    it('should handle JSON parse errors with file context', () => {
      const parseError = new SyntaxError('Unexpected token } in JSON at position 10');
      const filePath = '/path/to/invalid.json';

      const result = FileSystemErrorHandler.handleJsonParseError(parseError, filePath);

      expect(result).toBeInstanceOf(MinimalGoRulesError);
      expect(result.code).toBe(MinimalErrorCode.JSON_PARSE_ERROR);
      expect(result.message).toBe(`Invalid JSON in file ${filePath}: Unexpected token } in JSON at position 10`);
      expect(result.originalError).toBe(parseError);
    });
  });

  describe('isFileSystemError', () => {
    it('should return true for known file system errors', () => {
      const error = new Error('File not found') as NodeJS.ErrnoException;
      error.code = 'ENOENT';

      const result = FileSystemErrorHandler.isFileSystemError(error);

      expect(result).toBe(true);
    });

    it('should return false for unknown error codes', () => {
      const error = new Error('Unknown error') as NodeJS.ErrnoException;
      error.code = 'UNKNOWN';

      const result = FileSystemErrorHandler.isFileSystemError(error);

      expect(result).toBe(false);
    });
  });
});