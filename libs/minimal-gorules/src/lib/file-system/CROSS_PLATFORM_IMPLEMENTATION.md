# Cross-Platform File System Support Implementation

## Overview

This document describes the cross-platform file system support implementation for the Minimal GoRules Engine's hybrid rule loading feature. The implementation ensures consistent behavior across Windows, macOS, and Linux platforms.

## Components Implemented

### 1. CrossPlatformPathUtils

**Location**: `libs/minimal-gorules/src/lib/file-system/cross-platform-utils.ts`

**Purpose**: Provides platform-agnostic path manipulation utilities.

**Key Features**:

- Platform detection (Windows, macOS, Linux)
- Path normalization and conversion
- Forward slash conversion for rule IDs
- Relative path calculation
- Security checks for path traversal attacks
- Case-sensitive/insensitive path handling

**Methods**:

- `getPlatformInfo()`: Returns current platform information
- `normalizePath()`: Normalizes path separators
- `toForwardSlashes()`: Converts to forward slashes for rule IDs
- `fromForwardSlashes()`: Converts from forward slashes to platform separators
- `resolvePath()`: Resolves absolute paths
- `getRelativePath()`: Gets relative paths between directories
- `isPathWithinBase()`: Security check for path traversal
- `getExtension()`, `getBaseName()`, `getDirName()`, `joinPath()`: Path utilities

### 2. CrossPlatformPermissionUtils

**Purpose**: Handles file and directory permission checking across platforms.

**Key Features**:

- Comprehensive permission checking (read, write, execute)
- Platform-specific executable detection
- Directory accessibility validation
- Graceful error handling for permission issues

**Methods**:

- `checkPermissions()`: Comprehensive permission check
- `isReadable()`, `isWritable()`: Quick permission checks
- `isDirectoryAccessible()`: Directory-specific validation
- `validateRuleDirectory()`: Rule directory validation with detailed errors

### 3. CrossPlatformWatchUtils

**Purpose**: Provides platform-optimized file watching configuration.

**Key Features**:

- Platform-specific watch options
- Optimized polling vs native watching
- Platform-specific ignore patterns
- Recommended debounce delays

**Methods**:

- `getPlatformWatchOptions()`: Platform-optimized chokidar options
- `getRecommendedDebounceDelay()`: Platform-specific debounce timing

### 4. CrossPlatformValidationUtils

**Purpose**: Validates file paths for cross-platform compatibility.

**Key Features**:

- Platform-specific invalid character detection
- Windows reserved name validation
- Path length limit checking
- Drive letter validation for Windows

**Methods**:

- `validateFilePath()`: Comprehensive path validation

## Integration Points

### 1. FileSystemRuleScanner

**Enhanced with**:

- Cross-platform path handling in rule ID generation
- Permission checking before directory access
- Path validation for security

**Key Changes**:

- Uses `CrossPlatformPathUtils` for all path operations
- Validates directories with `CrossPlatformPermissionUtils`
- Generates consistent rule IDs across platforms

### 2. HotReloadManager

**Enhanced with**:

- Platform-optimized file watching
- Cross-platform path-to-rule-ID conversion
- Platform-specific debounce delays

**Key Changes**:

- Uses platform-specific chokidar options
- Normalizes paths before rule ID conversion
- Handles platform differences in file watching

### 3. LocalRuleLoaderService

**Enhanced with**:

- Cross-platform path resolution
- Security validation for rule file paths

**Key Changes**:

- Uses cross-platform utilities for path resolution
- Validates paths to prevent directory traversal

## Platform-Specific Handling

### Windows

- **Path Separators**: Handles both `\` and `/`
- **Drive Letters**: Validates `C:`, `D:`, etc.
- **Reserved Names**: Blocks `CON`, `PRN`, `AUX`, `NUL`, `COM1-9`, `LPT1-9`
- **Invalid Characters**: `<`, `>`, `"`, `|`, `?`, `*`
- **Case Sensitivity**: Case-insensitive path comparisons
- **File Watching**: Uses native Windows file watching
- **Executable Detection**: Based on file extensions (`.exe`, `.bat`, `.cmd`)

### macOS

- **Path Separators**: Unix-style `/`
- **Case Sensitivity**: Case-insensitive by default (HFS+/APFS)
- **File Watching**: Uses FSEvents for efficient watching
- **Ignore Patterns**: `.DS_Store`, `.AppleDouble`, `.Spotlight-V100`, etc.

### Linux

- **Path Separators**: Unix-style `/`
- **Case Sensitivity**: Case-sensitive
- **File Watching**: Uses inotify for efficient watching
- **Ignore Patterns**: `.directory`, `lost+found`, etc.

## Security Features

### Path Traversal Prevention

- Validates all paths are within the designated rules directory
- Handles both relative and absolute path attacks
- Works across different path separator styles

### Permission Validation

- Checks directory accessibility before scanning
- Graceful handling of permission denied errors
- Detailed error messages for troubleshooting

## Testing

### Test Files

- `cross-platform-utils.spec.ts`: Comprehensive unit tests
- `cross-platform-integration.spec.ts`: Integration tests
- `cross-platform-simple.spec.ts`: Basic functionality tests

### Test Coverage

- Platform detection and path manipulation
- Permission checking with mocked file system
- Path validation for all platforms
- Security validation for path traversal
- Integration with file system components

### Platform Simulation

- Uses `os.platform()` mocking to test different platforms
- Validates behavior differences between platforms
- Tests case sensitivity handling

## Performance Considerations

### File Watching Optimization

- **Windows**: Native watching with 500ms debounce
- **macOS**: FSEvents with 200ms debounce (fastest)
- **Linux**: inotify with 300ms debounce
- **Unknown Platforms**: Polling fallback with 400ms debounce

### Path Operations

- Caches platform information to avoid repeated `os.platform()` calls
- Uses efficient path manipulation without excessive string operations
- Minimizes file system stat calls through caching

## Error Handling

### Graceful Degradation

- Continues operation when some files are inaccessible
- Provides detailed error messages for troubleshooting
- Handles platform-specific error codes appropriately

### Error Types

- Configuration errors for invalid paths
- Permission errors with specific guidance
- File system errors with context
- Validation errors with detailed explanations

## Usage Examples

### Basic Path Operations

```typescript
import { CrossPlatformPathUtils } from './cross-platform-utils';

// Convert rule ID to platform path
const rulePath = CrossPlatformPathUtils.fromForwardSlashes('pricing/shipping-fees');
const fullPath = CrossPlatformPathUtils.joinPath(rulesDir, rulePath + '.json');

// Convert file path to rule ID
const relativePath = CrossPlatformPathUtils.getRelativePath(rulesDir, filePath);
const ruleId = CrossPlatformPathUtils.toForwardSlashes(relativePath.replace('.json', ''));
```

### Permission Checking

```typescript
import { CrossPlatformPermissionUtils } from './cross-platform-utils';

// Validate directory
await CrossPlatformPermissionUtils.validateRuleDirectory('/path/to/rules');

// Check file permissions
const permissions = await CrossPlatformPermissionUtils.checkPermissions('/path/to/file.json');
if (permissions.readable) {
  // File is readable
}
```

### File Watching

```typescript
import { CrossPlatformWatchUtils } from './cross-platform-utils';

// Get platform-optimized options
const watchOptions = CrossPlatformWatchUtils.getPlatformWatchOptions('/path/to/rules');
const debounceDelay = CrossPlatformWatchUtils.getRecommendedDebounceDelay();
```

## Future Enhancements

### Potential Improvements

1. **Extended Platform Support**: Add support for additional platforms (FreeBSD, etc.)
2. **Advanced Permission Handling**: More granular permission checking
3. **Performance Monitoring**: Add metrics for cross-platform operations
4. **Configuration Options**: Allow customization of platform-specific behavior

### Compatibility

- Node.js 14+ (uses modern fs.promises API)
- All major platforms (Windows 10+, macOS 10.14+, Linux with kernel 2.6+)
- Compatible with both CommonJS and ES modules

## Conclusion

The cross-platform file system support provides a robust foundation for the hybrid rule loading feature, ensuring consistent behavior across all supported platforms while optimizing for platform-specific capabilities and handling edge cases gracefully.
