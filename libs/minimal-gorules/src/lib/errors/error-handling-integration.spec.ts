/**
 * Integration tests for error handling throughout local rule loading
 */

import { LocalRuleLoaderService } from '../loader/local-rule-loader-service';
import { FileSystemErrorHandler } from './file-system-error-handler';
import { MinimalGoRulesError, MinimalErrorCode } from './minimal-errors';
import { MinimalGoRulesConfig } from '../interfaces/index';

describe('Error Handling Integration', () => {
  describe('LocalRuleLoaderService error handling', () => {
    it('should handle non-existent directory gracefully', async () => {
      const config: MinimalGoRulesConfig = {
        ruleSource: 'local',
        localRulesPath: '/non/existent/path',
        apiUrl: '',
        apiKey: '',
        projectId: '',
      };

      expect(() => new LocalRuleLoaderService(config)).toThrow(MinimalGoRulesError);
    });

    it('should handle invalid rule source configuration', () => {
      const config: MinimalGoRulesConfig = {
        ruleSource: 'cloud' as any,
        localRulesPath: '/some/path',
        apiUrl: '',
        apiKey: '',
        projectId: '',
      };

      expect(() => new LocalRuleLoaderService(config)).toThrow(MinimalGoRulesError);
    });
  });

  describe('FileSystemErrorHandler', () => {
    it('should be defined and have required methods', () => {
      expect(FileSystemErrorHandler).toBeDefined();
      expect(FileSystemErrorHandler.handleFileError).toBeDefined();
      expect(FileSystemErrorHandler.handleDirectoryError).toBeDefined();
      expect(FileSystemErrorHandler.handleJsonParseError).toBeDefined();
      expect(FileSystemErrorHandler.handleFileValidationError).toBeDefined();
      expect(FileSystemErrorHandler.isFileSystemError).toBeDefined();
    });

    it('should handle ENOENT errors correctly', () => {
      const error = new Error('File not found') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      const filePath = '/test/file.json';

      const result = FileSystemErrorHandler.handleFileError(error, filePath);

      expect(result).toBeInstanceOf(MinimalGoRulesError);
      expect(result.code).toBe(MinimalErrorCode.FILE_NOT_FOUND);
      expect(result.message).toContain(filePath);
    });

    it('should handle JSON parse errors correctly', () => {
      const parseError = new SyntaxError('Unexpected token');
      const filePath = '/test/invalid.json';

      const result = FileSystemErrorHandler.handleJsonParseError(parseError, filePath);

      expect(result).toBeInstanceOf(MinimalGoRulesError);
      expect(result.code).toBe(MinimalErrorCode.JSON_PARSE_ERROR);
      expect(result.message).toContain(filePath);
      expect(result.originalError).toBe(parseError);
    });
  });
});