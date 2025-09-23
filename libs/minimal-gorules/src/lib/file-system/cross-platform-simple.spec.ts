/**
 * Simple cross-platform functionality tests
 */

import { CrossPlatformPathUtils, CrossPlatformValidationUtils } from './cross-platform-utils';

describe('Cross-Platform Simple Tests', () => {
  it('should convert paths correctly', () => {
    const testPath = 'rules\\pricing\\shipping-fees.json';
    const result = CrossPlatformPathUtils.toForwardSlashes(testPath);
    expect(result).toBe('rules/pricing/shipping-fees.json');
  });

  it('should handle relative paths', () => {
    const basePath = '/base/rules';
    const targetPath = '/base/rules/pricing/shipping.json';
    const relativePath = CrossPlatformPathUtils.getRelativePath(basePath, targetPath);
    const result = CrossPlatformPathUtils.toForwardSlashes(relativePath);
    expect(result).toBe('pricing/shipping.json');
  });

  it('should validate Windows paths correctly', () => {
    expect(() =>
      CrossPlatformValidationUtils.validateFilePath('C:\\Users\\test\\file.json'),
    ).not.toThrow();
  });
});
