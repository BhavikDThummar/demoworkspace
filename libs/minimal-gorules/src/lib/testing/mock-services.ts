/**
 * Mock services for testing without external dependencies
 * Provides realistic mock implementations for all external services
 */

import {
  IRuleLoaderService,
  MinimalRuleMetadata,
  MinimalGoRulesConfig,
} from '../interfaces/index.js';
import { MinimalGoRulesError } from '../errors/minimal-errors.js';

/**
 * Mock rule data for testing
 */
export interface MockRuleData {
  id: string;
  name: string;
  version: string;
  tags: string[];
  content: Record<string, unknown>;
  lastModified?: Date;
}

/**
 * Mock GoRules Cloud API service
 */
export class MockRuleLoaderService implements IRuleLoaderService {
  private rules = new Map<string, { data: Buffer; metadata: MinimalRuleMetadata }>();
  private networkDelay: number;
  private failureRate: number;
  private shouldFailNext: boolean = false;

  constructor(
    mockRules: MockRuleData[] = [],
    options: {
      networkDelay?: number;
      failureRate?: number;
    } = {},
  ) {
    this.networkDelay = options.networkDelay || 0;
    this.failureRate = options.failureRate || 0;

    // Initialize with mock rules
    for (const mockRule of mockRules) {
      const data = Buffer.from(JSON.stringify(mockRule.content));
      const metadata: MinimalRuleMetadata = {
        id: mockRule.id,
        version: mockRule.version,
        tags: mockRule.tags,
        lastModified: (mockRule.lastModified || new Date()).getTime(),
      };
      this.rules.set(mockRule.id, { data, metadata });
    }
  }

  /**
   * Add a mock rule
   */
  addMockRule(mockRule: MockRuleData): void {
    const data = Buffer.from(JSON.stringify(mockRule.content));
    const metadata: MinimalRuleMetadata = {
      id: mockRule.id,
      version: mockRule.version,
      tags: mockRule.tags,
      lastModified: (mockRule.lastModified || new Date()).getTime(),
    };
    this.rules.set(mockRule.id, { data, metadata });
  }

  /**
   * Remove a mock rule
   */
  removeMockRule(ruleId: string): void {
    this.rules.delete(ruleId);
  }

  /**
   * Update a mock rule version
   */
  updateMockRuleVersion(ruleId: string, newVersion: string): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.metadata.version = newVersion;
      rule.metadata.lastModified = Date.now();
    }
  }

  /**
   * Set next operation to fail
   */
  setNextOperationToFail(): void {
    this.shouldFailNext = true;
  }

  /**
   * Simulate network delay
   */
  private async simulateDelay(): Promise<void> {
    if (this.networkDelay > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.networkDelay));
    }
  }

  /**
   * Simulate random failures
   */
  private checkForFailure(): void {
    if (this.shouldFailNext) {
      this.shouldFailNext = false;
      throw MinimalGoRulesError.networkError('Mock failure triggered');
    }

    if (this.failureRate > 0 && Math.random() < this.failureRate) {
      throw MinimalGoRulesError.networkError('Random mock failure');
    }
  }

  async loadAllRules(
    projectId?: string,
  ): Promise<Map<string, { data: Buffer; metadata: MinimalRuleMetadata }>> {
    await this.simulateDelay();
    this.checkForFailure();

    return new Map(this.rules);
  }

  async loadRule(ruleId: string): Promise<{ data: Buffer; metadata: MinimalRuleMetadata }> {
    await this.simulateDelay();
    this.checkForFailure();

    const rule = this.rules.get(ruleId);
    if (!rule) {
      throw MinimalGoRulesError.networkError(`Mock rule ${ruleId} not found`);
    }

    return rule;
  }

  async checkVersions(rules: Map<string, string>): Promise<Map<string, boolean>> {
    await this.simulateDelay();
    this.checkForFailure();

    const results = new Map<string, boolean>();

    for (const [ruleId, currentVersion] of rules) {
      const rule = this.rules.get(ruleId);
      if (rule) {
        results.set(ruleId, rule.metadata.version !== currentVersion);
      } else {
        results.set(ruleId, true); // Rule not found, needs update
      }
    }

    return results;
  }

  async refreshRule(ruleId: string): Promise<{ data: Buffer; metadata: MinimalRuleMetadata }> {
    return this.loadRule(ruleId);
  }
}

/**
 * Mock ZenEngine for testing rule execution
 */
export class MockZenEngine {
  private rules = new Map<string, Record<string, unknown>>();
  private executionDelay: number;
  private failureRate: number;

  constructor(
    options: {
      executionDelay?: number;
      failureRate?: number;
    } = {},
  ) {
    this.executionDelay = options.executionDelay || 0;
    this.failureRate = options.failureRate || 0;
  }

  /**
   * Set mock rule content
   */
  setMockRule(ruleId: string, ruleContent: Record<string, unknown>): void {
    this.rules.set(ruleId, ruleContent);
  }

  /**
   * Mock evaluate method
   */
  async evaluate(
    ruleId: string,
    input: Record<string, unknown>,
  ): Promise<{
    result: unknown;
    performance: string;
    trace?: Record<string, unknown>;
  }> {
    // Simulate execution delay
    if (this.executionDelay > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.executionDelay));
    }

    // Simulate random failures
    if (this.failureRate > 0 && Math.random() < this.failureRate) {
      throw new Error(`Mock execution failure for rule ${ruleId}`);
    }

    const ruleContent = this.rules.get(ruleId);
    if (!ruleContent) {
      throw new Error(`Mock rule ${ruleId} not found`);
    }

    // Simple mock evaluation logic
    const result = this.mockEvaluateRule(ruleContent, input);

    return {
      result,
      performance: `${this.executionDelay || Math.random() * 10 + 1}ms`,
      trace: { ruleId, input, timestamp: Date.now() },
    };
  }

  /**
   * Simple mock rule evaluation
   */
  private mockEvaluateRule(rule: Record<string, unknown>, input: Record<string, unknown>): unknown {
    const conditions =
      (rule.conditions as Array<{
        field: string;
        operator: string;
        value: unknown;
      }>) || [];

    const actions =
      (rule.actions as Array<{
        type: string;
        field?: string;
        value?: unknown;
      }>) || [];

    // Check conditions
    const conditionsMet = conditions.every((condition) => {
      const inputValue = input[condition.field];

      switch (condition.operator) {
        case 'eq':
          return inputValue === condition.value;
        case 'ne':
          return inputValue !== condition.value;
        case 'gt':
          return Number(inputValue) > Number(condition.value);
        case 'gte':
          return Number(inputValue) >= Number(condition.value);
        case 'lt':
          return Number(inputValue) < Number(condition.value);
        case 'lte':
          return Number(inputValue) <= Number(condition.value);
        case 'in':
          return Array.isArray(condition.value) && condition.value.includes(inputValue);
        case 'contains':
          return String(inputValue).includes(String(condition.value));
        default:
          return false;
      }
    });

    // Execute actions if conditions are met
    if (conditionsMet) {
      const result: Record<string, unknown> = { ...input };

      for (const action of actions) {
        switch (action.type) {
          case 'set':
            if (action.field) {
              result[action.field] = action.value;
            }
            break;
          case 'increment':
            if (action.field) {
              result[action.field] = Number(result[action.field] || 0) + Number(action.value || 1);
            }
            break;
          case 'append':
            if (action.field) {
              const current = result[action.field];
              if (Array.isArray(current)) {
                current.push(action.value);
              } else {
                result[action.field] = [current, action.value].filter((v) => v !== undefined);
              }
            }
            break;
        }
      }

      return result;
    }

    // Return original input if conditions not met
    return input;
  }
}

/**
 * Factory for creating mock test data
 */
export class MockDataFactory {
  /**
   * Create mock rules for testing
   */
  static createMockRules(
    count: number,
    options: {
      tagGroups?: string[];
      versionRange?: [string, string];
      complexityLevel?: 'simple' | 'medium' | 'complex';
    } = {},
  ): MockRuleData[] {
    const {
      tagGroups = ['validation', 'scoring', 'approval'],
      versionRange = ['1.0.0', '2.0.0'],
      complexityLevel = 'medium',
    } = options;

    return Array.from({ length: count }, (_, i) => {
      const ruleId = `mock-rule-${i + 1}`;
      const tags = [tagGroups[i % tagGroups.length], `group-${Math.floor(i / 5)}`, 'test'];

      const version = this.generateVersion(versionRange);
      const content = this.generateRuleContent(ruleId, complexityLevel);

      return {
        id: ruleId,
        name: `Mock Rule ${i + 1}`,
        version,
        tags,
        content,
        lastModified: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date within last 30 days
      };
    });
  }

  /**
   * Generate a version string within range
   */
  private static generateVersion([min, max]: [string, string]): string {
    const minParts = min.split('.').map(Number);
    const maxParts = max.split('.').map(Number);

    const major = minParts[0] + Math.floor(Math.random() * (maxParts[0] - minParts[0] + 1));
    const minor = Math.floor(Math.random() * 10);
    const patch = Math.floor(Math.random() * 10);

    return `${major}.${minor}.${patch}`;
  }

  /**
   * Generate rule content based on complexity level
   */
  private static generateRuleContent(
    ruleId: string,
    complexity: 'simple' | 'medium' | 'complex',
  ): Record<string, unknown> {
    const baseConditions = [
      { field: 'age', operator: 'gte', value: 18 },
      { field: 'income', operator: 'gt', value: 30000 },
    ];

    const baseActions = [
      { type: 'set', field: 'eligible', value: true },
      { type: 'set', field: 'processedBy', value: ruleId },
    ];

    switch (complexity) {
      case 'simple':
        return {
          conditions: baseConditions.slice(0, 1),
          actions: baseActions.slice(0, 1),
        };

      case 'complex':
        return {
          conditions: [
            ...baseConditions,
            { field: 'creditScore', operator: 'gte', value: 650 },
            { field: 'employmentStatus', operator: 'in', value: ['employed', 'self-employed'] },
            { field: 'residenceType', operator: 'ne', value: 'temporary' },
          ],
          actions: [
            ...baseActions,
            { type: 'set', field: 'approvalLevel', value: 'standard' },
            { type: 'set', field: 'interestRate', value: 4.5 },
            { type: 'increment', field: 'processCount', value: 1 },
          ],
        };

      case 'medium':
      default:
        return {
          conditions: [...baseConditions, { field: 'creditScore', operator: 'gte', value: 600 }],
          actions: [...baseActions, { type: 'set', field: 'score', value: 75 }],
        };
    }
  }

  /**
   * Create mock input data for testing
   */
  static createMockInput(
    scenario: 'valid' | 'invalid' | 'edge' | 'random' = 'valid',
  ): Record<string, unknown> {
    switch (scenario) {
      case 'valid':
        return {
          age: 25,
          income: 50000,
          creditScore: 720,
          employmentStatus: 'employed',
          residenceType: 'owned',
        };

      case 'invalid':
        return {
          age: 16,
          income: 15000,
          creditScore: 500,
          employmentStatus: 'unemployed',
          residenceType: 'temporary',
        };

      case 'edge':
        return {
          age: 18,
          income: 30000,
          creditScore: 650,
          employmentStatus: 'self-employed',
          residenceType: 'rented',
        };

      case 'random':
      default:
        return {
          age: Math.floor(Math.random() * 50) + 18,
          income: Math.floor(Math.random() * 100000) + 20000,
          creditScore: Math.floor(Math.random() * 350) + 450,
          employmentStatus: ['employed', 'self-employed', 'unemployed'][
            Math.floor(Math.random() * 3)
          ],
          residenceType: ['owned', 'rented', 'temporary'][Math.floor(Math.random() * 3)],
        };
    }
  }

  /**
   * Create mock configuration for testing
   */
  static createMockConfig(overrides: Partial<MinimalGoRulesConfig> = {}): MinimalGoRulesConfig {
    return {
      apiUrl: 'https://mock-api.gorules.io',
      apiKey: 'mock-api-key-12345',
      projectId: 'mock-project-id',
      cacheMaxSize: 100,
      httpTimeout: 5000,
      batchSize: 10,
      ...overrides,
    };
  }
}

/**
 * Test utilities for common testing scenarios
 */
export class TestUtils {
  /**
   * Wait for a condition to be true with timeout
   */
  static async waitFor(
    condition: () => boolean | Promise<boolean>,
    timeout: number = 5000,
    interval: number = 100,
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    throw new Error(`Condition not met within ${timeout}ms`);
  }

  /**
   * Create a promise that resolves after a delay
   */
  static delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Generate random test data
   */
  static randomString(length: number = 10): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return Array.from({ length }, () =>
      chars.charAt(Math.floor(Math.random() * chars.length)),
    ).join('');
  }

  /**
   * Generate random number within range
   */
  static randomNumber(min: number = 0, max: number = 100): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Create a mock fetch function for HTTP testing
   */
  static createMockFetch(
    responses: Array<{
      url?: string | RegExp;
      method?: string;
      response: {
        ok?: boolean;
        status?: number;
        statusText?: string;
        json?: () => Promise<unknown>;
        text?: () => Promise<string>;
      };
    }>,
  ): any {
    const mockFn = (() => {}) as any;
    mockFn.mockImplementation = (impl: any) => {
      mockFn._implementation = impl;
      return mockFn;
    };
    return mockFn.mockImplementation((url: string, options: RequestInit = {}) => {
      const method = options.method || 'GET';

      for (const mockResponse of responses) {
        const urlMatches =
          !mockResponse.url ||
          (typeof mockResponse.url === 'string'
            ? url.includes(mockResponse.url)
            : mockResponse.url.test(url));
        const methodMatches = !mockResponse.method || mockResponse.method === method;

        if (urlMatches && methodMatches) {
          return Promise.resolve({
            ok: true,
            status: 200,
            statusText: 'OK',
            json: () => Promise.resolve({}),
            text: () => Promise.resolve(''),
            ...mockResponse.response,
          });
        }
      }

      // Default response for unmatched requests
      return Promise.resolve({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve({ error: 'Not Found' }),
        text: () => Promise.resolve('Not Found'),
      });
    });
  }
}
