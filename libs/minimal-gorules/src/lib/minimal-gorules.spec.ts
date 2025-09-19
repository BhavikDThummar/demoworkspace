import {
  MINIMAL_GORULES_VERSION,
  MINIMAL_GORULES_NAME,
  MinimalErrorCode,
  MinimalGoRulesError,
} from './minimal-gorules.js';

describe('minimal-gorules', () => {
  it('should export version and name constants', () => {
    expect(MINIMAL_GORULES_VERSION).toBe('1.0.0');
    expect(MINIMAL_GORULES_NAME).toBe('minimal-gorules');
  });

  it('should export error codes', () => {
    expect(MinimalErrorCode.RULE_NOT_FOUND).toBe('RULE_NOT_FOUND');
    expect(MinimalErrorCode.NETWORK_ERROR).toBe('NETWORK_ERROR');
    expect(MinimalErrorCode.TIMEOUT).toBe('TIMEOUT');
  });

  it('should create proper error instances', () => {
    const error = MinimalGoRulesError.ruleNotFound('test-rule');
    expect(error).toBeInstanceOf(MinimalGoRulesError);
    expect(error.code).toBe(MinimalErrorCode.RULE_NOT_FOUND);
    expect(error.ruleId).toBe('test-rule');
    expect(error.message).toContain('test-rule');
  });
});
