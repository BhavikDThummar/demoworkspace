import * as gorulesLib from './gorules.js';

describe('gorules library', () => {
  it('should export types and interfaces', () => {
    // Test that the library exports are available
    expect(typeof gorulesLib).toBe('object');
    expect(gorulesLib).toBeDefined();
  });
});
