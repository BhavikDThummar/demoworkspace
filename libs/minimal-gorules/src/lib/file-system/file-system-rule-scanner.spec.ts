/**
 * Unit tests for FileSystemRuleScanner
 */

import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { FileSystemRuleScanner, FileSystemRule } from './file-system-rule-scanner.js';
import { MinimalGoRulesError, MinimalErrorCode } from '../errors/index.js';

// Promisify fs methods for test setup
const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const rmdir = promisify(fs.rmdir);
const unlink = promisify(fs.unlink);
const access = promisify(fs.access);

describe('FileSystemRuleScanner', () => {
  const testDir = path.join(__dirname, 'test-rules');
  let scanner: FileSystemRuleScanner;

  // Sample valid GoRules content
  const validRuleContent = {
    nodes: [
      {
        id: 'input',
        type: 'inputNode',
        position: { x: 0, y: 0 },
      },
      {
        id: 'output',
        type: 'outputNode',
        position: { x: 200, y: 0 },
      },
    ],
    edges: [
      {
        id: 'edge1',
        source: 'input',
        target: 'output',
      },
    ],
  };

  beforeEach(async () => {
    // Clean up test directory if it exists
    await cleanupTestDir();
    
    // Create test directory
    await mkdir(testDir, { recursive: true });
    
    scanner = new FileSystemRuleScanner(testDir);
  });

  afterEach(async () => {
    await cleanupTestDir();
  });

  async function cleanupTestDir(): Promise<void> {
    try {
      await access(testDir);
      // Directory exists, remove it recursively
      await removeDirectory(testDir);
    } catch {
      // Directory doesn't exist, nothing to clean up
    }
  }

  async function removeDirectory(dirPath: string): Promise<void> {
    try {
      const entries = await promisify(fs.readdir)(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          await removeDirectory(fullPath);
        } else {
          await unlink(fullPath);
        }
      }
      
      await rmdir(dirPath);
    } catch (error) {
      // Ignore errors during cleanup
    }
  }

  describe('constructor', () => {
    it('should create scanner with default options', () => {
      const scanner = new FileSystemRuleScanner('/test/path');
      expect(scanner).toBeInstanceOf(FileSystemRuleScanner);
    });

    it('should create scanner with custom options', () => {
      const options = {
        recursive: false,
        fileExtension: '.rule',
        metadataPattern: '.info.json',
      };
      const scanner = new FileSystemRuleScanner('/test/path', options);
      expect(scanner).toBeInstanceOf(FileSystemRuleScanner);
    });
  });

  describe('scanDirectory', () => {
    it('should scan empty directory', async () => {
      const rules = await scanner.scanDirectory();
      expect(rules).toEqual([]);
    });

    it('should throw error for non-existent directory', async () => {
      const nonExistentScanner = new FileSystemRuleScanner('/non/existent/path');
      
      await expect(nonExistentScanner.scanDirectory()).rejects.toThrow(MinimalGoRulesError);
      await expect(nonExistentScanner.scanDirectory()).rejects.toThrow('not found');
    });

    it('should scan directory with single rule file', async () => {
      // Create a rule file
      const ruleFile = path.join(testDir, 'test-rule.json');
      await writeFile(ruleFile, JSON.stringify(validRuleContent, null, 2));

      const rules = await scanner.scanDirectory();
      
      expect(rules).toHaveLength(1);
      expect(rules[0].id).toBe('test-rule');
      expect(rules[0].filePath).toBe(ruleFile);
      expect(rules[0].metadata.id).toBe('test-rule');
      expect(rules[0].metadata.tags).toEqual([]);
      expect(typeof rules[0].metadata.version).toBe('string');
      expect(typeof rules[0].metadata.lastModified).toBe('number');
    });

    it('should scan directory with multiple rule files', async () => {
      // Create multiple rule files
      const rule1File = path.join(testDir, 'rule1.json');
      const rule2File = path.join(testDir, 'rule2.json');
      
      await writeFile(rule1File, JSON.stringify(validRuleContent, null, 2));
      await writeFile(rule2File, JSON.stringify(validRuleContent, null, 2));

      const rules = await scanner.scanDirectory();
      
      expect(rules).toHaveLength(2);
      
      const ruleIds = rules.map(r => r.id).sort();
      expect(ruleIds).toEqual(['rule1', 'rule2']);
    });

    it('should handle nested directories recursively', async () => {
      // Create nested directory structure
      const subDir = path.join(testDir, 'pricing');
      await mkdir(subDir, { recursive: true });
      
      const rule1File = path.join(testDir, 'main-rule.json');
      const rule2File = path.join(subDir, 'shipping-fees.json');
      
      await writeFile(rule1File, JSON.stringify(validRuleContent, null, 2));
      await writeFile(rule2File, JSON.stringify(validRuleContent, null, 2));

      const rules = await scanner.scanDirectory();
      
      expect(rules).toHaveLength(2);
      
      const ruleMap = new Map(rules.map(r => [r.id, r]));
      expect(ruleMap.has('main-rule')).toBe(true);
      expect(ruleMap.has('pricing/shipping-fees')).toBe(true);
    });

    it('should handle deeply nested directories', async () => {
      // Create deeply nested structure
      const deepDir = path.join(testDir, 'level1', 'level2', 'level3');
      await mkdir(deepDir, { recursive: true });
      
      const ruleFile = path.join(deepDir, 'deep-rule.json');
      await writeFile(ruleFile, JSON.stringify(validRuleContent, null, 2));

      const rules = await scanner.scanDirectory();
      
      expect(rules).toHaveLength(1);
      expect(rules[0].id).toBe('level1/level2/level3/deep-rule');
    });

    it('should ignore non-JSON files', async () => {
      // Create various file types
      await writeFile(path.join(testDir, 'rule.json'), JSON.stringify(validRuleContent, null, 2));
      await writeFile(path.join(testDir, 'readme.txt'), 'This is a readme');
      await writeFile(path.join(testDir, 'config.yaml'), 'key: value');
      await writeFile(path.join(testDir, 'script.js'), 'console.log("hello");');

      const rules = await scanner.scanDirectory();
      
      expect(rules).toHaveLength(1);
      expect(rules[0].id).toBe('rule');
    });

    it('should ignore metadata files', async () => {
      // Create rule and metadata files
      await writeFile(path.join(testDir, 'rule.json'), JSON.stringify(validRuleContent, null, 2));
      await writeFile(path.join(testDir, 'rule.meta.json'), JSON.stringify({ version: '1.0.0' }));

      const rules = await scanner.scanDirectory();
      
      expect(rules).toHaveLength(1);
      expect(rules[0].id).toBe('rule');
    });

    it('should handle invalid JSON files gracefully', async () => {
      // Create valid and invalid files
      await writeFile(path.join(testDir, 'valid.json'), JSON.stringify(validRuleContent, null, 2));
      await writeFile(path.join(testDir, 'invalid.json'), '{ invalid json }');

      const rules = await scanner.scanDirectory();
      
      // Should load the valid rule and skip the invalid one
      expect(rules).toHaveLength(1);
      expect(rules[0].id).toBe('valid');
    });

    it('should handle files missing required GoRules properties', async () => {
      // Create valid and invalid GoRules files
      await writeFile(path.join(testDir, 'valid.json'), JSON.stringify(validRuleContent, null, 2));
      await writeFile(path.join(testDir, 'missing-nodes.json'), JSON.stringify({ edges: [] }, null, 2));
      await writeFile(path.join(testDir, 'missing-edges.json'), JSON.stringify({ nodes: [] }, null, 2));

      const rules = await scanner.scanDirectory();
      
      // Should only load the valid rule
      expect(rules).toHaveLength(1);
      expect(rules[0].id).toBe('valid');
    });

    it('should throw error when no valid rules found and errors occurred', async () => {
      // Create only invalid files
      await writeFile(path.join(testDir, 'invalid.json'), '{ invalid json }');

      await expect(scanner.scanDirectory()).rejects.toThrow(MinimalGoRulesError);
      await expect(scanner.scanDirectory()).rejects.toThrow('Failed to load any rules');
    });
  });

  describe('loadRuleFile', () => {
    it('should load valid rule file', async () => {
      const ruleFile = path.join(testDir, 'test-rule.json');
      await writeFile(ruleFile, JSON.stringify(validRuleContent, null, 2));

      const rule = await scanner.loadRuleFile(ruleFile);
      
      expect(rule.id).toBe('test-rule');
      expect(rule.filePath).toBe(ruleFile);
      expect(rule.data).toBeInstanceOf(Buffer);
      expect(rule.metadata.id).toBe('test-rule');
      expect(rule.metadata.tags).toEqual([]);
    });

    it('should load rule with metadata file', async () => {
      const ruleFile = path.join(testDir, 'test-rule.json');
      const metadataFile = path.join(testDir, 'test-rule.meta.json');
      
      const metadata = {
        version: '2.1.0',
        tags: ['pricing', 'shipping'],
        description: 'Test rule with metadata',
        author: 'test-author',
      };
      
      await writeFile(ruleFile, JSON.stringify(validRuleContent, null, 2));
      await writeFile(metadataFile, JSON.stringify(metadata, null, 2));

      const rule = await scanner.loadRuleFile(ruleFile);
      
      expect(rule.metadata.version).toBe('2.1.0');
      expect(rule.metadata.tags).toEqual(['pricing', 'shipping']);
    });

    it('should generate default metadata when no metadata file exists', async () => {
      const ruleFile = path.join(testDir, 'test-rule.json');
      await writeFile(ruleFile, JSON.stringify(validRuleContent, null, 2));

      const rule = await scanner.loadRuleFile(ruleFile);
      
      expect(typeof rule.metadata.version).toBe('string');
      expect(rule.metadata.tags).toEqual([]);
      expect(typeof rule.metadata.lastModified).toBe('number');
      expect(rule.metadata.lastModified).toBeGreaterThan(0);
    });

    it('should throw error for non-existent file', async () => {
      const nonExistentFile = path.join(testDir, 'non-existent.json');

      await expect(scanner.loadRuleFile(nonExistentFile)).rejects.toThrow(MinimalGoRulesError);
      await expect(scanner.loadRuleFile(nonExistentFile)).rejects.toThrow('not found');
    });

    it('should throw error for invalid JSON', async () => {
      const ruleFile = path.join(testDir, 'invalid.json');
      await writeFile(ruleFile, '{ invalid json }');

      await expect(scanner.loadRuleFile(ruleFile)).rejects.toThrow(MinimalGoRulesError);
      await expect(scanner.loadRuleFile(ruleFile)).rejects.toThrow('Invalid JSON');
    });

    it('should throw error for invalid GoRules format', async () => {
      const ruleFile = path.join(testDir, 'invalid-format.json');
      await writeFile(ruleFile, JSON.stringify({ invalid: 'format' }, null, 2));

      await expect(scanner.loadRuleFile(ruleFile)).rejects.toThrow(MinimalGoRulesError);
      await expect(scanner.loadRuleFile(ruleFile)).rejects.toThrow('missing required');
    });
  });

  describe('rule ID generation', () => {
    it('should generate correct rule ID for root level file', async () => {
      const ruleFile = path.join(testDir, 'simple-rule.json');
      await writeFile(ruleFile, JSON.stringify(validRuleContent, null, 2));

      const rule = await scanner.loadRuleFile(ruleFile);
      expect(rule.id).toBe('simple-rule');
    });

    it('should generate correct rule ID for nested file', async () => {
      const subDir = path.join(testDir, 'pricing', 'shipping');
      await mkdir(subDir, { recursive: true });
      
      const ruleFile = path.join(subDir, 'fees.json');
      await writeFile(ruleFile, JSON.stringify(validRuleContent, null, 2));

      const rule = await scanner.loadRuleFile(ruleFile);
      expect(rule.id).toBe('pricing/shipping/fees');
    });

    it('should handle Windows path separators correctly', async () => {
      // This test ensures cross-platform compatibility
      const subDir = path.join(testDir, 'windows', 'path');
      await mkdir(subDir, { recursive: true });
      
      const ruleFile = path.join(subDir, 'test.json');
      await writeFile(ruleFile, JSON.stringify(validRuleContent, null, 2));

      const rule = await scanner.loadRuleFile(ruleFile);
      // Rule ID should always use forward slashes regardless of platform
      expect(rule.id).toBe('windows/path/test');
      expect(rule.id).not.toContain('\\');
    });
  });

  describe('metadata handling', () => {
    it('should handle metadata file with all properties', async () => {
      const ruleFile = path.join(testDir, 'full-metadata.json');
      const metadataFile = path.join(testDir, 'full-metadata.meta.json');
      
      const metadata = {
        version: '3.2.1',
        tags: ['validation', 'business-rules', 'critical'],
        description: 'Comprehensive validation rule',
        lastModified: '2024-01-15T10:30:00Z',
        author: 'development-team',
        environment: 'production',
      };
      
      await writeFile(ruleFile, JSON.stringify(validRuleContent, null, 2));
      await writeFile(metadataFile, JSON.stringify(metadata, null, 2));

      const rule = await scanner.loadRuleFile(ruleFile);
      
      expect(rule.metadata.version).toBe('3.2.1');
      expect(rule.metadata.tags).toEqual(['validation', 'business-rules', 'critical']);
      expect(rule.metadata.lastModified).toBe(new Date('2024-01-15T10:30:00Z').getTime());
    });

    it('should handle metadata file with partial properties', async () => {
      const ruleFile = path.join(testDir, 'partial-metadata.json');
      const metadataFile = path.join(testDir, 'partial-metadata.meta.json');
      
      const metadata = {
        tags: ['partial'],
      };
      
      await writeFile(ruleFile, JSON.stringify(validRuleContent, null, 2));
      await writeFile(metadataFile, JSON.stringify(metadata, null, 2));

      const rule = await scanner.loadRuleFile(ruleFile);
      
      expect(rule.metadata.tags).toEqual(['partial']);
      expect(typeof rule.metadata.version).toBe('string'); // Should fallback to file mtime
      expect(typeof rule.metadata.lastModified).toBe('number');
    });

    it('should handle invalid metadata file gracefully', async () => {
      const ruleFile = path.join(testDir, 'invalid-metadata.json');
      const metadataFile = path.join(testDir, 'invalid-metadata.meta.json');
      
      await writeFile(ruleFile, JSON.stringify(validRuleContent, null, 2));
      await writeFile(metadataFile, '{ invalid json }');

      const rule = await scanner.loadRuleFile(ruleFile);
      
      // Should fallback to default metadata
      expect(rule.metadata.tags).toEqual([]);
      expect(typeof rule.metadata.version).toBe('string');
    });
  });

  describe('error handling', () => {
    it('should handle permission denied errors', async () => {
      // This test might not work on all systems, but we can test the error handling logic
      const scanner = new FileSystemRuleScanner('/root/restricted');
      
      await expect(scanner.scanDirectory()).rejects.toThrow(MinimalGoRulesError);
    });

    it('should handle file vs directory confusion', async () => {
      // Create a file where we expect a directory
      const filePath = path.join(testDir, 'not-a-directory');
      await writeFile(filePath, 'content');
      
      const scanner = new FileSystemRuleScanner(filePath);
      
      await expect(scanner.scanDirectory()).rejects.toThrow(MinimalGoRulesError);
      await expect(scanner.scanDirectory()).rejects.toThrow('not a directory');
    });
  });

  describe('custom options', () => {
    it('should respect custom file extension', async () => {
      const scanner = new FileSystemRuleScanner(testDir, { fileExtension: '.rule' });
      
      // Create files with different extensions
      await writeFile(path.join(testDir, 'test.json'), JSON.stringify(validRuleContent, null, 2));
      await writeFile(path.join(testDir, 'test.rule'), JSON.stringify(validRuleContent, null, 2));

      const rules = await scanner.scanDirectory();
      
      expect(rules).toHaveLength(1);
      expect(rules[0].id).toBe('test');
    });

    it('should respect custom metadata pattern', async () => {
      const scanner = new FileSystemRuleScanner(testDir, { metadataPattern: '.info.json' });
      
      const ruleFile = path.join(testDir, 'test.json');
      const metadataFile = path.join(testDir, 'test.info.json');
      
      const metadata = { version: '1.0.0', tags: ['custom'] };
      
      await writeFile(ruleFile, JSON.stringify(validRuleContent, null, 2));
      await writeFile(metadataFile, JSON.stringify(metadata, null, 2));

      const rule = await scanner.loadRuleFile(ruleFile);
      
      expect(rule.metadata.version).toBe('1.0.0');
      expect(rule.metadata.tags).toEqual(['custom']);
    });

    it('should respect recursive option', async () => {
      const scanner = new FileSystemRuleScanner(testDir, { recursive: false });
      
      // Create nested structure
      const subDir = path.join(testDir, 'subdir');
      await mkdir(subDir);
      
      await writeFile(path.join(testDir, 'root.json'), JSON.stringify(validRuleContent, null, 2));
      await writeFile(path.join(subDir, 'nested.json'), JSON.stringify(validRuleContent, null, 2));

      const rules = await scanner.scanDirectory();
      
      // Should only find the root level file
      expect(rules).toHaveLength(1);
      expect(rules[0].id).toBe('root');
    });
  });
});